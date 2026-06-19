import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fetchWafStats } from "@/lib/deployer";

export const dynamic = "force-dynamic";

/**
 * GET /api/firewall — aggregated WAF analytics across all of the user's
 * WAF-enabled projects (for the global Firewall dashboard).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    select: { slug: true, name: true, wafEnabled: true, domain: true },
    orderBy: { createdAt: "desc" },
  });

  const enabled = projects.filter((p) => p.wafEnabled);
  const perSite = await Promise.all(
    enabled.map(async (p) => ({ p, stats: await fetchWafStats(p.slug) }))
  );

  const ipMap: Record<string, number> = {};
  const ruleMap: Record<string, number> = {};
  let totalBlocked = 0;
  const recent: {
    time: string;
    ip: string;
    uri: string;
    rule: string;
    ruleId: string;
    site: string;
  }[] = [];

  const sites = projects.map((p) => {
    const found = perSite.find((x) => x.p.slug === p.slug);
    const blocked = found?.stats.totalBlocked ?? 0;
    return {
      slug: p.slug,
      name: p.name,
      domain: p.domain,
      enabled: p.wafEnabled,
      blocked,
    };
  });

  for (const { p, stats } of perSite) {
    totalBlocked += stats.totalBlocked;
    for (const x of stats.topIps) ipMap[x.key] = (ipMap[x.key] ?? 0) + x.count;
    for (const x of stats.topRules) ruleMap[x.key] = (ruleMap[x.key] ?? 0) + x.count;
    for (const r of stats.recent) recent.push({ ...r, site: p.name });
  }

  const top = (m: Record<string, number>) =>
    Object.entries(m)
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

  recent.sort((a, b) => (a.time < b.time ? 1 : -1));

  return NextResponse.json({
    totalBlocked,
    protectedSites: enabled.length,
    totalSites: projects.length,
    topIps: top(ipMap),
    topRules: top(ruleMap),
    recent: recent.slice(0, 30),
    sites,
  });
}
