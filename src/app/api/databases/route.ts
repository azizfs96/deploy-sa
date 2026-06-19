import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { provisionDatabase, pipelineEnabled, ADMINER_URL } from "@/lib/deployer";

/** GET /api/databases — list the current user's managed databases. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const databases = await prisma.database.findMany({
    where: { userId: session.user.id },
    include: { project: { select: { slug: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    databases,
    adminerUrl: ADMINER_URL,
    pipelineEnabled: pipelineEnabled(),
  });
}

interface CreateBody {
  engine: "postgres" | "mysql";
  name: string;
  projectSlug?: string; // optional: link + inject DATABASE_URL
}

/** POST /api/databases — provision a managed database (optionally linked). */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!pipelineEnabled()) {
    return NextResponse.json(
      { error: "deployment pipeline not configured" },
      { status: 503 }
    );
  }

  const body = (await req.json()) as CreateBody;
  const engine = body.engine === "mysql" ? "mysql" : "postgres";

  // Optional project link (must belong to the user).
  let project = null;
  if (body.projectSlug) {
    project = await prisma.project.findFirst({
      where: { slug: body.projectSlug, userId: session.user.id },
    });
    if (!project) {
      return NextResponse.json({ error: "project not found" }, { status: 404 });
    }
  }

  let provisioned;
  try {
    provisioned = await provisionDatabase(engine, body.name || "appdb");
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }

  const database = await prisma.database.create({
    data: {
      name: body.name || provisioned.dbName,
      engine,
      agentId: provisioned.id,
      host: provisioned.host,
      port: provisioned.port,
      username: provisioned.username,
      password: provisioned.password,
      dbName: provisioned.dbName,
      url: provisioned.url,
      userId: session.user.id,
      projectId: project?.id,
    },
  });

  // If linked to a project, inject DATABASE_URL (used on next deploy).
  if (project) {
    const existing = await prisma.envVar.findFirst({
      where: { projectId: project.id, key: "DATABASE_URL" },
    });
    if (existing) {
      await prisma.envVar.update({
        where: { id: existing.id },
        data: { value: provisioned.url },
      });
    } else {
      await prisma.envVar.create({
        data: { projectId: project.id, key: "DATABASE_URL", value: provisioned.url },
      });
    }
  }

  return NextResponse.json({ database }, { status: 201 });
}
