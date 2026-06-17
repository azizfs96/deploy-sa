import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { latestCommit } from "@/lib/github";
import { buildDeployLogs, defaultBuildConfig } from "@/lib/build-config";
import { mapProject } from "@/lib/mappers";
import { Framework } from "@/lib/types";
import { pipelineEnabled, triggerDeploy, liveUrlFor } from "@/lib/deployer";

/** GET /api/projects — list the current user's projects. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    include: { envVars: true, deployments: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ projects: projects.map(mapProject) });
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || `app-${Date.now().toString(36)}`;
}

interface CreateBody {
  repoFullName: string;
  repoLanguage?: string;
  repoVisibility?: string;
  framework: Framework;
  branch: string;
  installCommand?: string;
  buildCommand?: string;
  outputDir?: string;
  envVars?: { key: string; value: string }[];
}

/** POST /api/projects — import a GitHub repo and create the first deployment. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session.accessToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as CreateBody;
  if (!body.repoFullName || !body.framework || !body.branch) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const repoName = body.repoFullName.split("/")[1] ?? body.repoFullName;
  let slug = slugify(repoName);
  // Ensure slug uniqueness.
  if (await prisma.project.findUnique({ where: { slug } })) {
    slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  }

  const cfg = defaultBuildConfig(body.framework);
  const install = body.installCommand ?? cfg.installCommand;
  const build = body.buildCommand ?? cfg.buildCommand;
  const output = body.outputDir ?? cfg.outputDir;

  // Seed the first deployment from the latest real commit on the branch.
  const commit = await latestCommit(
    session.accessToken,
    body.repoFullName,
    body.branch
  );

  // Real pipeline: kick off a Docker build on the agent; otherwise simulate.
  const usePipeline = pipelineEnabled();
  let agentId: string | null = null;
  let logs: string[];
  let projectStatus: "building" | "ready";

  if (usePipeline) {
    agentId = await triggerDeploy({
      slug,
      repoFullName: body.repoFullName,
      token: session.accessToken,
      branch: body.branch,
      envVars: body.envVars ?? [],
    });
    logs = ["Queued build on agent..."];
    projectStatus = "building";
  } else {
    logs = buildDeployLogs(body.repoFullName, body.branch, body.framework, {
      installCommand: install,
      buildCommand: build,
    });
    projectStatus = "ready";
  }

  const project = await prisma.project.create({
    data: {
      name: repoName,
      slug,
      framework: body.framework,
      status: projectStatus,
      domain: `${slug}.deploy.sa`,
      repoFullName: body.repoFullName,
      repoLanguage: body.repoLanguage,
      repoVisibility: body.repoVisibility ?? "private",
      branch: body.branch,
      installCommand: install,
      buildCommand: build,
      outputDir: output,
      userId: session.user.id,
      envVars: {
        create: (body.envVars ?? []).map((e) => ({
          key: e.key,
          value: e.value,
        })),
      },
      deployments: {
        create: {
          commitHash: commit?.sha ?? Math.random().toString(16).slice(2, 14),
          commitMessage: commit?.message ?? "Initial deployment",
          branch: body.branch,
          authorName: commit?.authorName ?? session.user.name ?? "you",
          authorUsername:
            commit?.authorLogin ?? session.user.login ?? "you",
          authorAvatar:
            commit?.authorAvatar ?? session.user.image ?? "",
          status: usePipeline ? "building" : "ready",
          durationSec: usePipeline ? 0 : 42,
          logs,
          agentId,
          liveUrl: usePipeline ? liveUrlFor(slug) : null,
        },
      },
    },
    include: { envVars: true, deployments: true },
  });

  return NextResponse.json({ project: mapProject(project) }, { status: 201 });
}
