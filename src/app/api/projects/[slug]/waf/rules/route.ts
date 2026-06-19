import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { syncWaf, WafRuleInput } from "@/lib/deployer";
import { WafRuleType } from "@prisma/client";

const validators: Record<string, (v: string) => boolean> = {
  block_ip: (v) => /^[0-9a-fA-F:.]{3,45}$/.test(v),
  block_path: (v) => /^\/[A-Za-z0-9_\-./]{0,200}$/.test(v),
  block_country: (v) => /^[A-Z]{2}$/.test(v),
};

/** POST /api/projects/:slug/waf/rules — add a structured rule. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { slug } = await params;

  const project = await prisma.project.findFirst({
    where: { slug, userId: session.user.id },
    include: { wafRules: true },
  });
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { type, value } = (await req.json()) as { type: string; value: string };
  const v = (value ?? "").trim();
  if (!validators[type] || !validators[type](v)) {
    return NextResponse.json({ error: "invalid rule" }, { status: 400 });
  }

  await prisma.wafRule.create({
    data: { projectId: project.id, type: type as WafRuleType, value: v },
  });

  const rules = await prisma.wafRule.findMany({ where: { projectId: project.id } });
  await syncWaf(
    slug,
    project.wafEnabled,
    rules.map((r) => ({ type: r.type, value: r.value })) as WafRuleInput[]
  );
  return NextResponse.json({ rules }, { status: 201 });
}
