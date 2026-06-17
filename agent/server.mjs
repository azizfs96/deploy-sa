// Deploy.sa Build Agent
// Runs on the Alibaba ECS host (with Docker + Traefik). Receives deploy
// requests from the control plane, builds a Docker image from a GitHub repo,
// runs it as a container wired into Traefik, and streams real build logs.
//
// No external dependencies — Node 20 stdlib only.
//
//   POST /deploy   { slug, repoFullName, token, branch, envVars }  -> { id }
//   GET  /logs/:id (SSE)   streams { line } events, then { done } event
//   GET  /health
//
// All requests must carry  Authorization: Bearer $AGENT_TOKEN

import http from "node:http";
import { spawn } from "node:child_process";
import { mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const PORT = Number(process.env.AGENT_PORT ?? 9000);
const TOKEN = process.env.AGENT_TOKEN ?? "";
const APPS_DOMAIN = process.env.APPS_DOMAIN ?? "apps.deploy.wafgate.com";
const NETWORK = process.env.DOCKER_NETWORK ?? "web";
const CERT_RESOLVER = process.env.TRAEFIK_CERT_RESOLVER ?? "le";
const BUILD_ROOT = process.env.BUILD_ROOT ?? "/var/deploysa/builds";
const APP_PORT = 3000; // port the app listens on inside the container

/** In-memory job registry: id -> { lines, status, url, listeners:Set<res> } */
const jobs = new Map();

function newJob() {
  const id = crypto.randomBytes(6).toString("hex");
  const job = { id, lines: [], status: "building", url: null, listeners: new Set(), done: false };
  jobs.set(id, job);
  return job;
}

function emit(job, line) {
  job.lines.push(line);
  for (const res of job.listeners) {
    res.write(`event: line\ndata: ${JSON.stringify({ line })}\n\n`);
  }
}

function finish(job, status, url) {
  job.status = status;
  job.url = url ?? null;
  job.done = true;
  for (const res of job.listeners) {
    res.write(`event: done\ndata: ${JSON.stringify({ status, url: job.url })}\n\n`);
    res.end();
  }
  job.listeners.clear();
}

/** Run a command, streaming stdout+stderr into the job log. Resolves exit code. */
function run(job, cmd, args, opts = {}) {
  return new Promise((resolve) => {
    emit(job, `$ ${cmd} ${args.join(" ")}`.replace(/x-access-token:[^@]+@/, "x-access-token:***@"));
    const child = spawn(cmd, args, { ...opts });
    const onData = (buf) => {
      for (const line of buf.toString().split("\n")) {
        if (line.trim()) emit(job, line.trimEnd());
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("close", (code) => resolve(code ?? 0));
    child.on("error", (err) => {
      emit(job, `error: ${err.message}`);
      resolve(1);
    });
  });
}

// Default Node.js / Next.js builder.
//  - copies the whole source BEFORE install so postinstall hooks
//    (e.g. `prisma generate`) find their files.
//  - bakes env vars BEFORE the build so Next.js `NEXT_PUBLIC_*` and other
//    build-time variables are available to `next build`.
function nodeDockerfile(envVars = []) {
  const envLines = envVars
    .map((e) => `ENV ${e.key}=${JSON.stringify(String(e.value))}`)
    .join("\n");
  return `FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install --no-audit --no-fund
${envLines}
RUN npm run build --if-present
ENV PORT=${APP_PORT}
ENV HOST=0.0.0.0
EXPOSE ${APP_PORT}
CMD ["npm", "start"]
`;
}

async function buildAndRun(job, { slug, repoFullName, token, branch, envVars }) {
  const dir = path.join(BUILD_ROOT, `${slug}-${job.id}`);
  const image = `deploysa/${slug}:${job.id}`;
  const container = `deploysa-${slug}`;
  const host = `${slug}.${APPS_DOMAIN}`;

  try {
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });

    // 1) Clone (token embedded for private repos)
    const cloneUrl = `https://x-access-token:${token}@github.com/${repoFullName}.git`;
    if ((await run(job, "git", ["clone", "--depth", "1", "-b", branch, cloneUrl, "."], { cwd: dir })) !== 0) {
      throw new Error("clone failed");
    }

    // 2) Ensure a Dockerfile (MVP: Node.js default if missing)
    if (!existsSync(path.join(dir, "Dockerfile"))) {
      emit(job, "No Dockerfile found — using default Node.js/Next.js builder.");
      await writeFile(path.join(dir, "Dockerfile"), nodeDockerfile(envVars));
    }

    // 3) Build image
    emit(job, `Building image ${image}...`);
    if ((await run(job, "docker", ["build", "-t", image, "."], { cwd: dir })) !== 0) {
      throw new Error("docker build failed");
    }

    // 4) Replace any previous container
    await run(job, "docker", ["rm", "-f", container]);

    // 5) Run with Traefik labels
    const labels = [
      "traefik.enable=true",
      `traefik.http.routers.${slug}.rule=Host(\`${host}\`)`,
      `traefik.http.routers.${slug}.entrypoints=websecure`,
      `traefik.http.routers.${slug}.tls.certresolver=${CERT_RESOLVER}`,
      `traefik.http.services.${slug}.loadbalancer.server.port=${APP_PORT}`,
    ];
    const args = ["run", "-d", "--name", container, "--restart", "unless-stopped", "--network", NETWORK];
    for (const l of labels) args.push("--label", l);
    for (const e of envVars ?? []) args.push("-e", `${e.key}=${e.value}`);
    args.push("-e", `PORT=${APP_PORT}`, image);

    if ((await run(job, "docker", args)) !== 0) {
      throw new Error("docker run failed");
    }

    emit(job, `✓ Live at https://${host}`);
    finish(job, "ready", `https://${host}`);
  } catch (err) {
    emit(job, `Build failed: ${err.message}`);
    finish(job, "failed", null);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

function authed(req) {
  return TOKEN && req.headers.authorization === `Bearer ${TOKEN}`;
}

function json(res, code, body) {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost`);

  if (url.pathname === "/health") return json(res, 200, { ok: true });

  if (!authed(req)) return json(res, 401, { error: "unauthorized" });

  // POST /deploy
  if (req.method === "POST" && url.pathname === "/deploy") {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return json(res, 400, { error: "invalid json" });
    }
    if (!body.slug || !body.repoFullName || !body.token) {
      return json(res, 400, { error: "missing fields" });
    }
    const job = newJob();
    buildAndRun(job, { branch: "main", envVars: [], ...body }); // fire-and-forget
    return json(res, 201, { id: job.id });
  }

  // GET /logs/:id  (SSE)
  const m = url.pathname.match(/^\/logs\/([a-f0-9]+)$/);
  if (req.method === "GET" && m) {
    const job = jobs.get(m[1]);
    if (!job) return json(res, 404, { error: "not found" });
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    // Replay existing lines.
    for (const line of job.lines) {
      res.write(`event: line\ndata: ${JSON.stringify({ line })}\n\n`);
    }
    if (job.done) {
      res.write(`event: done\ndata: ${JSON.stringify({ status: job.status, url: job.url })}\n\n`);
      return res.end();
    }
    job.listeners.add(res);
    req.on("close", () => job.listeners.delete(res));
    return;
  }

  json(res, 404, { error: "not found" });
});

server.listen(PORT, () => {
  console.log(`Deploy.sa build agent listening on :${PORT} (apps domain: ${APPS_DOMAIN})`);
});
