import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { mapProject } from "@/lib/mappers";

/** GET /api/projects/:slug — single project for the current user. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { slug } = await params;
  const project = await prisma.project.findFirst({
    where: { slug, userId: session.user.id },
    include: { envVars: true, deployments: true },
  });
  if (!project) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ project: mapProject(project) });
}

/** PATCH /api/projects/:slug — update build settings / auto-deploy. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { slug } = await params;
  const project = await prisma.project.findFirst({
    where: { slug, userId: session.user.id },
    select: { id: true },
  });
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = (await req.json()) as {
    installCommand?: string;
    buildCommand?: string;
    outputDir?: string;
    autoDeploy?: boolean;
  };
  const data: Record<string, unknown> = {};
  if (typeof body.installCommand === "string") data.installCommand = body.installCommand;
  if (typeof body.buildCommand === "string") data.buildCommand = body.buildCommand;
  if (typeof body.outputDir === "string") data.outputDir = body.outputDir;
  if (typeof body.autoDeploy === "boolean") data.autoDeploy = body.autoDeploy;

  await prisma.project.update({ where: { id: project.id }, data });
  return NextResponse.json({ ok: true });
}

/** DELETE /api/projects/:slug */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { slug } = await params;
  await prisma.project.deleteMany({
    where: { slug, userId: session.user.id },
  });
  return NextResponse.json({ ok: true });
}
