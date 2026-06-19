import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { syncWaf, WafRuleInput } from "@/lib/deployer";

/** DELETE /api/projects/:slug/waf/rules/:ruleId */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; ruleId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { slug, ruleId } = await params;

  const project = await prisma.project.findFirst({
    where: { slug, userId: session.user.id },
  });
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.wafRule.deleteMany({ where: { id: ruleId, projectId: project.id } });

  const rules = await prisma.wafRule.findMany({ where: { projectId: project.id } });
  await syncWaf(
    slug,
    project.wafEnabled,
    rules.map((r) => ({ type: r.type, value: r.value })) as WafRuleInput[]
  );
  return NextResponse.json({ rules });
}
