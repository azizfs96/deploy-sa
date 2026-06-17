import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { latestCommit } from "@/lib/github";
import { buildDeployLogs } from "@/lib/build-config";

/** POST /api/projects/:slug/deployments — trigger a redeploy. */
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
  });
  if (!project) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const commit = await latestCommit(
    session.accessToken,
    project.repoFullName,
    project.branch
  );
  const logs = buildDeployLogs(
    project.repoFullName,
    project.branch,
    project.framework,
    project
  );

  const deployment = await prisma.deployment.create({
    data: {
      projectId: project.id,
      commitHash: commit?.sha ?? Math.random().toString(16).slice(2, 14),
      commitMessage: commit?.message ?? "Redeploy",
      branch: project.branch,
      authorName: commit?.authorName ?? session.user.name ?? "you",
      authorUsername: commit?.authorLogin ?? session.user.login ?? "you",
      authorAvatar: commit?.authorAvatar ?? session.user.image ?? "",
      status: "ready",
      durationSec: 44,
      logs,
    },
  });

  return NextResponse.json({ deploymentId: deployment.id }, { status: 201 });
}
