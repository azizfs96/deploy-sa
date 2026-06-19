import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { syncWaf, WafRuleInput } from "@/lib/deployer";

async function ownedProject(slug: string, userId: string) {
  return prisma.project.findFirst({
    where: { slug, userId },
    include: { wafRules: true },
  });
}

/** GET /api/projects/:slug/waf — WAF state + rules. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { slug } = await params;
  const project = await ownedProject(slug, session.user.id);
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ enabled: project.wafEnabled, rules: project.wafRules });
}

/** PUT /api/projects/:slug/waf — toggle WAF on/off. */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { slug } = await params;
  const project = await ownedProject(slug, session.user.id);
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { enabled } = (await req.json()) as { enabled: boolean };
  await prisma.project.update({ where: { id: project.id }, data: { wafEnabled: enabled } });

  await syncWaf(
    slug,
    enabled,
    project.wafRules.map((r) => ({ type: r.type, value: r.value })) as WafRuleInput[]
  );
  return NextResponse.json({ ok: true, enabled });
}
