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
