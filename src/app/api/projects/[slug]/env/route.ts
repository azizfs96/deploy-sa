import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function owned(slug: string, userId: string) {
  return prisma.project.findFirst({ where: { slug, userId } });
}

/** GET /api/projects/:slug/env — list env vars. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { slug } = await params;
  const project = await owned(slug, session.user.id);
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });
  const envVars = await prisma.envVar.findMany({
    where: { projectId: project.id },
    select: { id: true, key: true, value: true },
    orderBy: { key: "asc" },
  });
  return NextResponse.json({ envVars });
}

/** POST /api/projects/:slug/env { key, value } — add or update a var. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { slug } = await params;
  const project = await owned(slug, session.user.id);
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = (await req.json()) as { key?: string; value?: string };
  const key = (body.key ?? "").trim();
  if (!key) return NextResponse.json({ error: "missing key" }, { status: 400 });

  // Upsert by (projectId, key): update if exists, else create.
  const existing = await prisma.envVar.findFirst({
    where: { projectId: project.id, key },
  });
  if (existing) {
    await prisma.envVar.update({ where: { id: existing.id }, data: { value: body.value ?? "" } });
  } else {
    await prisma.envVar.create({ data: { projectId: project.id, key, value: body.value ?? "" } });
  }

  const envVars = await prisma.envVar.findMany({
    where: { projectId: project.id },
    select: { id: true, key: true, value: true },
    orderBy: { key: "asc" },
  });
  return NextResponse.json({ envVars }, { status: 201 });
}
