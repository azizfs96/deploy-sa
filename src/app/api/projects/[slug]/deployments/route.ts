import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { latestCommit } from "@/lib/github";
import { buildDeployLogs } from "@/lib/build-config";
import { mapDeployment } from "@/lib/mappers";
import { pipelineEnabled, triggerDeploy, liveUrlFor } from "@/lib/deployer";

/** POST /api/projects/:slug/deployments — trigger a (real) redeploy. */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !session.accessToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { slug } = await params;
  const project = await prisma.project.findFirst({
    where: { slug, userId: session.user.id },
    include: { envVars: true },
  });
  if (!project) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const commit = await latestCommit(
    session.accessToken,
    project.repoFullName,
    project.branch
  );

  const usePipeline = pipelineEnabled();
  let agentId: string | null = null;
  let logs: string[] = [];
  let status: "building" | "ready" = "building";

  if (usePipeline) {
    // Real build on the ECS host; logs stream live via the agent.
    agentId = await triggerDeploy({
      slug: project.slug,
      repoFullName: project.repoFullName,
      token: session.accessToken,
      branch: project.branch,
      envVars: project.envVars.map((e) => ({ key: e.key, value: e.value })),
    });
    logs = ["Queued build on agent..."];
  } else {
    // Fallback: simulated deploy (pipeline not configured).
    logs = buildDeployLogs(project.repoFullName, project.branch, project.framework, project);
    status = "ready";
  }

  const deployment = await prisma.deployment.create({
    data: {
      projectId: project.id,
      commitHash: commit?.sha ?? Math.random().toString(16).slice(2, 14),
      commitMessage: commit?.message ?? "Redeploy",
      branch: project.branch,
      authorName: commit?.authorName ?? session.user.name ?? "you",
      authorUsername: commit?.authorLogin ?? session.user.login ?? "you",
      authorAvatar: commit?.authorAvatar ?? session.user.image ?? "",
      status,
      durationSec: 0,
      logs,
      agentId,
      liveUrl: usePipeline ? liveUrlFor(project.slug) : null,
    },
  });

  return NextResponse.json(
    { deployment: mapDeployment(deployment) },
    { status: 201 }
  );
}
