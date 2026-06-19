import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fetchWafStats } from "@/lib/deployer";

export const dynamic = "force-dynamic";

/** GET /api/projects/:slug/waf/stats — WAF attack analytics for the site. */
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
    select: { id: true },
  });
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });

  const stats = await fetchWafStats(slug);
  return NextResponse.json(stats);
}
