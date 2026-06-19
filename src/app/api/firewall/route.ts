import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fetchWafStats } from "@/lib/deployer";
import { geoEnrich } from "@/lib/geo";

export const dynamic = "force-dynamic";

/**
 * GET /api/firewall — aggregated WAF analytics across all of the user's
 * WAF-enabled projects, with GeoIP-enriched IPs, hourly time-series and
 * map origins for the global Firewall dashboard.
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
  const series = new Array(24).fill(0);
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
    return {
      slug: p.slug,
      name: p.name,
      domain: p.domain,
      enabled: p.wafEnabled,
      blocked: found?.stats.totalBlocked ?? 0,
      series: found?.stats.series ?? new Array(24).fill(0),
    };
  });

  for (const { p, stats } of perSite) {
    totalBlocked += stats.totalBlocked;
    for (const x of stats.topIps) ipMap[x.key] = (ipMap[x.key] ?? 0) + x.count;
    for (const x of stats.topRules) ruleMap[x.key] = (ruleMap[x.key] ?? 0) + x.count;
    for (const r of stats.recent) recent.push({ ...r, site: p.name });
    (stats.series ?? []).forEach((v, i) => (series[i] += v));
  }

  const top = (m: Record<string, number>) =>
    Object.entries(m)
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

  recent.sort((a, b) => (a.time < b.time ? 1 : -1));

  const topIps = await geoEnrich(top(ipMap));
  const mapOrigins = topIps
    .filter((x) => typeof x.lat === "number" && typeof x.lon === "number")
    .map((x) => ({ lat: x.lat!, lon: x.lon!, count: x.count, cc: x.cc, country: x.country }));

  return NextResponse.json({
    totalBlocked,
    protectedSites: enabled.length,
    totalSites: projects.length,
    topIps,
    topRules: top(ruleMap),
    recent: recent.slice(0, 30),
    sites,
    series,
    mapOrigins,
  });
}
