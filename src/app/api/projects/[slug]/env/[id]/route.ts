import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** DELETE /api/projects/:slug/env/:id — remove an env var. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { slug, id } = await params;

  const project = await prisma.project.findFirst({
    where: { slug, userId: session.user.id },
  });
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.envVar.deleteMany({ where: { id, projectId: project.id } });

  const envVars = await prisma.envVar.findMany({
    where: { projectId: project.id },
    select: { id: true, key: true, value: true },
    orderBy: { key: "asc" },
  });
  return NextResponse.json({ envVars });
}
