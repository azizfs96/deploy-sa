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

    // If this site has WAF enabled, restart its WAF container so it picks up
    // the (possibly new) app container IP.
    await restartWafIfPresent(slug);

    emit(job, `✓ Live at https://${host}`);
    finish(job, "ready", `https://${host}`);
  } catch (err) {
    emit(job, `Build failed: ${err.message}`);
    finish(job, "failed", null);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/* ----------------------------- Databases ------------------------------- */

function randId(n = 6) {
  return crypto.randomBytes(n).toString("hex");
}
function randPass(n = 16) {
  return crypto.randomBytes(n).toString("base64url").slice(0, n);
}
function sh(cmd, args) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args);
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("close", (code) => resolve({ code: code ?? 0, out: out.trim(), err: err.trim() }));
    child.on("error", (e) => resolve({ code: 1, out: "", err: e.message }));
  });
}

/**
 * Provision a database container (postgres|mysql) on the internal `web`
 * network with a persistent volume. Not exposed to the internet (no published
 * ports / no Traefik labels) — only reachable by app containers by hostname.
 */
async function createDatabase({ engine, name }) {
  const id = randId();
  const container = `deploysa-db-${id}`;
  const volume = `deploysa-dbvol-${id}`;
  const username = "app";
  const password = randPass();
  const dbName = (name || "appdb").toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 32) || "appdb";

  let args;
  let port;
  if (engine === "mysql") {
    port = 3306;
    args = [
      "run", "-d", "--name", container, "--restart", "unless-stopped",
      "--network", NETWORK, "-v", `${volume}:/var/lib/mysql`,
      "-e", `MYSQL_ROOT_PASSWORD=${randPass()}`,
      "-e", `MYSQL_DATABASE=${dbName}`,
      "-e", `MYSQL_USER=${username}`,
      "-e", `MYSQL_PASSWORD=${password}`,
      "mysql:8",
    ];
  } else {
    // default: postgres
    port = 5432;
    args = [
      "run", "-d", "--name", container, "--restart", "unless-stopped",
      "--network", NETWORK, "-v", `${volume}:/var/lib/postgresql/data`,
      "-e", `POSTGRES_USER=${username}`,
      "-e", `POSTGRES_PASSWORD=${password}`,
      "-e", `POSTGRES_DB=${dbName}`,
      "postgres:16",
    ];
  }

  const r = await sh("docker", args);
  if (r.code !== 0) throw new Error(r.err || "docker run failed");

  const scheme = engine === "mysql" ? "mysql" : "postgresql";
  return {
    id,
    container,
    engine: engine === "mysql" ? "mysql" : "postgres",
    host: container, // reachable by app containers on the `web` network
    port,
    username,
    password,
    dbName,
    url: `${scheme}://${username}:${password}@${container}:${port}/${dbName}`,
  };
}

async function deleteDatabase(id) {
  await sh("docker", ["rm", "-f", `deploysa-db-${id}`]);
  await sh("docker", ["volume", "rm", `deploysa-dbvol-${id}`]);
}

/* ------------------------------- WAF ----------------------------------- */

const WAF_SITES_DIR = process.env.WAF_SITES_DIR ?? "/etc/modsec-sites";
const MODSEC_CONTAINER = process.env.MODSEC_CONTAINER ?? "modsec";

// Stable per-site rule id base (ModSecurity ids must be globally unique).
function ruleBase(slug) {
  let h = 0;
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return 100000 + (h % 800000);
}

// Strict validators — we ONLY ever emit safe, parameterized SecRules.
const isIp = (v) => /^[0-9a-fA-F:.]{3,45}$/.test(v);
const isPath = (v) => /^\/[A-Za-z0-9_\-./]{0,200}$/.test(v);
const isCountry = (v) => /^[A-Z]{2}$/.test(v);

/**
 * Generate a per-site SecLang rules file from STRUCTURED rules only.
 * No user-provided raw directives are ever written — eliminating injection
 * and dangerous actions (exec, etc.).
 */
function generateWafConfig(slug, enabled, rules) {
  if (!enabled) return `# WAF disabled for ${slug}\nSecRuleEngine Off\n`;
  const base = ruleBase(slug);
  const lines = [`# Managed WAF rules for ${slug}`, "SecRuleEngine On"];
  let i = 0;
  for (const r of rules ?? []) {
    const id = base + i++;
    if (r.type === "block_ip" && isIp(r.value)) {
      lines.push(`SecRule REMOTE_ADDR "@ipMatch ${r.value}" "id:${id},phase:1,deny,status:403,log,msg:'Blocked IP'"`);
    } else if (r.type === "block_path" && isPath(r.value)) {
      lines.push(`SecRule REQUEST_URI "@beginsWith ${r.value}" "id:${id},phase:1,deny,status:403,log,msg:'Blocked path'"`);
    } else if (r.type === "block_country" && isCountry(r.value)) {
      lines.push(`SecRule GEO:COUNTRY_CODE "@streq ${r.value}" "id:${id},phase:1,deny,status:403,log,msg:'Blocked country'"`);
    }
    // invalid rules are silently skipped (never emitted)
  }
  return lines.join("\n") + "\n";
}

const WAF_NGINX_DIR = path.join(WAF_SITES_DIR, "nginx");

// Per-site nginx server block: CRS is global in the image; we add the site's
// rules file and proxy to the app container. ($host etc. survive envsubst.)
function siteNginxTemplate(slug) {
  return `server {
    listen 8080;
    server_name _;

    modsecurity on;
    modsecurity_rules_file /etc/modsec-sites/${slug}.conf;

    location / {
        proxy_pass http://deploysa-${slug}:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
`;
}

/** Restart a site's WAF container (if it exists) — used after app redeploys. */
async function restartWafIfPresent(slug) {
  await sh("docker", ["restart", `deploysa-waf-${slug}`]);
}

/**
 * Per-site opt-in WAF. When enabled, a dedicated ModSecurity container
 * (CRS + the site's rules) is placed in front of the app via a higher-priority
 * Traefik router. When disabled, it's removed and traffic falls back to the
 * app's direct router. Fully isolated per tenant.
 */
async function syncWaf({ slug, enabled, rules }) {
  await mkdir(WAF_NGINX_DIR, { recursive: true });
  await writeFile(path.join(WAF_SITES_DIR, `${slug}.conf`), generateWafConfig(slug, enabled, rules));

  const wafName = `deploysa-waf-${slug}`;

  if (!enabled) {
    await sh("docker", ["rm", "-f", wafName]);
    return { ok: true, enabled: false };
  }

  // If already running, just reload to pick up changed rules (no downtime).
  const running = await sh("docker", ["ps", "-q", "-f", `name=^${wafName}$`]);
  if (running.out) {
    await sh("docker", ["exec", wafName, "nginx", "-s", "reload"]);
    return { ok: true, enabled: true, reloaded: true };
  }

  // First enable: write the template and start the container.
  const tpl = path.join(WAF_NGINX_DIR, `${slug}.conf.template`);
  await writeFile(tpl, siteNginxTemplate(slug));
  const host = `${slug}.${APPS_DOMAIN}`;
  const r = await sh("docker", [
    "run", "-d", "--name", wafName, "--restart", "unless-stopped", "--network", NETWORK,
    // The image's healthcheck targets a path our custom config doesn't serve;
    // disable it so Traefik (which skips unhealthy containers) routes to us.
    "--no-healthcheck",
    "-v", `${tpl}:/etc/nginx/templates/conf.d/default.conf.template:ro`,
    "-v", `${WAF_SITES_DIR}:/etc/modsec-sites:ro`,
    "--label", "traefik.enable=true",
    "--label", `traefik.http.routers.waf-${slug}.rule=Host(\`${host}\`)`,
    "--label", `traefik.http.routers.waf-${slug}.entrypoints=websecure`,
    "--label", `traefik.http.routers.waf-${slug}.tls.certresolver=${CERT_RESOLVER}`,
    "--label", `traefik.http.routers.waf-${slug}.priority=1000`,
    "--label", `traefik.http.services.waf-${slug}.loadbalancer.server.port=8080`,
    "owasp/modsecurity-crs:nginx-alpine",
  ]);
  if (r.code !== 0) throw new Error(r.err || "waf container failed to start");
  return { ok: true, enabled: true, started: true };
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

  // POST /databases  { engine, name }
  if (req.method === "POST" && url.pathname === "/databases") {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return json(res, 400, { error: "invalid json" });
    }
    try {
      const db = await createDatabase({
        engine: body.engine === "mysql" ? "mysql" : "postgres",
        name: body.name,
      });
      return json(res, 201, db);
    } catch (e) {
      return json(res, 502, { error: e.message });
    }
  }

  // DELETE /databases/:id
  const dm = url.pathname.match(/^\/databases\/([a-f0-9]+)$/);
  if (req.method === "DELETE" && dm) {
    await deleteDatabase(dm[1]);
    return json(res, 200, { ok: true });
  }

  // POST /waf  { slug, enabled, rules:[{type,value}] }
  if (req.method === "POST" && url.pathname === "/waf") {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return json(res, 400, { error: "invalid json" });
    }
    if (!body.slug) return json(res, 400, { error: "missing slug" });
    try {
      const r = await syncWaf({
        slug: body.slug,
        enabled: Boolean(body.enabled),
        rules: Array.isArray(body.rules) ? body.rules : [],
      });
      return json(res, 200, r);
    } catch (e) {
      return json(res, 502, { error: e.message });
    }
  }

  json(res, 404, { error: "not found" });
});

server.listen(PORT, () => {
  console.log(`Deploy.sa build agent listening on :${PORT} (apps domain: ${APPS_DOMAIN})`);
});
