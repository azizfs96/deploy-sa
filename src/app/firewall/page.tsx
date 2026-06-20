"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Globe,
  RefreshCw,
  Activity,
  Server,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/card";
import { WorldThreatMap } from "@/components/firewall/WorldThreatMap";
import { AttackChart } from "@/components/firewall/AttackChart";
import { flagEmoji } from "@/lib/flag";
import { useT } from "@/lib/store";
import { cn } from "@/lib/utils";

interface IpKV {
  key: string;
  count: number;
  cc?: string;
  country?: string;
  lat?: number;
  lon?: number;
}
interface Site {
  slug: string;
  name: string;
  domain: string;
  enabled: boolean;
  blocked: number;
  series: number[];
  series30: number[];
}
interface Recent {
  time: string;
  ip: string;
  uri: string;
  rule: string;
  ruleId: string;
  site: string;
}
interface FwData {
  totalBlocked: number;
  protectedSites: number;
  totalSites: number;
  topIps: IpKV[];
  topRules: { key: string; count: number }[];
  recent: Recent[];
  sites: Site[];
  series: number[];
  series30: number[];
  mapOrigins: { lat: number; lon: number; count: number; cc: string; country: string }[];
}

export default function FirewallPage() {
  const { t, locale } = useT();
  const [data, setData] = useState<FwData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch("/api/firewall")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const topIp = data?.topIps[0];
  const maxIp = Math.max(...(data?.topIps.map((i) => i.count) ?? [1]), 1);

  return (
    <DashboardShell>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <ShieldCheck className="h-6 w-6 text-primary" />
            {t("nav.firewall")} <span className="text-subtle">/ WAF</span>
          </h1>
          <p className="mt-1 text-sm text-subtle">
            {locale === "ar"
              ? "نظرة موحّدة على الحماية والهجمات عبر كل مشاريعك."
              : "Unified view of protection and attacks across all your projects."}
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-subtle transition-colors hover:bg-muted hover:text-fg"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          {locale === "ar" ? "تحديث" : "Refresh"}
        </button>
      </div>

      {/* Stats grid: threat map + blocked + top source */}
      <div className="grid gap-4 lg:grid-cols-3">
        <WorldThreatMap origins={data?.mapOrigins ?? []} />

        <Card className="p-5">
          <div className="text-xs font-medium uppercase tracking-wide text-subtle">
            {locale === "ar" ? "الطلبات المحظورة" : "Blocked Requests"}
          </div>
          <div className="mt-2 text-4xl font-bold tabular-nums text-fg">
            {(data?.totalBlocked ?? 0).toLocaleString()}
          </div>
          <span className="mt-2 inline-block rounded-md bg-failed/10 px-2 py-0.5 text-xs font-medium text-failed">
            100% {locale === "ar" ? "من الإجمالي" : "of total"}
          </span>
          <p className="mt-4 text-xs leading-relaxed text-subtle">
            {locale === "ar"
              ? "عدد الطلبات التي حُجبت بنجاح قبل وصولها للتطبيق، مثل حقن SQL وXSS وCSRF."
              : "Requests blocked before reaching the application — SQL Injection, XSS, CSRF and more."}
          </p>
        </Card>

        <Card className="p-5">
          <div className="text-xs font-medium uppercase tracking-wide text-subtle">
            {locale === "ar" ? "أبرز مصدر هجوم" : "Top Attack Source"}
          </div>
          <div className="mt-2 flex items-center gap-2 font-mono text-2xl font-bold" dir="ltr">
            {topIp ? (
              <>
                <span>{flagEmoji(topIp.cc)}</span>
                {topIp.key}
              </>
            ) : (
              locale === "ar" ? "لا يوجد" : "None"
            )}
          </div>
          <span className="mt-2 inline-block rounded-md bg-building/10 px-2 py-0.5 text-xs font-medium text-building">
            {topIp?.count ?? 0} {locale === "ar" ? "محاولة" : "attempts"}
          </span>
          <p className="mt-4 text-xs leading-relaxed text-subtle">
            {locale === "ar"
              ? "العنوان صاحب أعلى عدد من المحاولات المشبوهة والهجمات المحتملة."
              : "IP address with the highest number of suspicious access attempts today."}
          </p>
        </Card>
      </div>

      {/* Chart */}
      <div className="mt-4">
        <AttackChart
          series={data?.series ?? new Array(24).fill(0)}
          series30={data?.series30 ?? new Array(30).fill(0)}
          sites={data?.sites ?? []}
        />
      </div>

      {/* Top IPs + Top Rules */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Top IPs */}
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <div>
              <p className="text-sm font-semibold">
                {locale === "ar" ? "أهم المهاجمين (IP)" : "Top IP Addresses"}
              </p>
              <p className="mt-0.5 text-xs text-subtle">
                {locale === "ar" ? "أكثر المصادر نشاطاً حسب عدد المحاولات" : "Most active sources by number of attempts"}
              </p>
            </div>
          </div>
          <div className="flex flex-col">
            {!data?.topIps.length ? (
              <p className="px-5 py-10 text-center text-sm text-subtle">
                {locale === "ar" ? "لا توجد بيانات بعد." : "No data available at this time"}
              </p>
            ) : (
              data.topIps.map((x) => {
                const share = Math.max(4, Math.round((x.count / maxIp) * 100));
                return (
                  <div
                    key={x.key}
                    className="flex items-center gap-4 border-b border-border px-5 py-3 transition-colors last:border-b-0 hover:bg-muted/40"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-mono text-[13px] font-semibold" dir="ltr">{x.key}</span>
                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-subtle">
                          <span>{flagEmoji(x.cc)}</span>
                          {x.country || (locale === "ar" ? "غير معروف" : "Unknown")}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <span className="block h-full rounded-full bg-gradient-to-r from-failed/60 to-failed" style={{ width: `${share}%` }} />
                      </div>
                    </div>
                    <div className="shrink-0 text-end" style={{ minWidth: 56 }}>
                      <div className="text-sm font-bold leading-tight tabular-nums">{x.count.toLocaleString()}</div>
                      <div className="mt-0.5 text-[11px] text-subtle">{locale === "ar" ? "محاولة" : "attempts"}</div>
                    </div>
                    <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-failed/30 bg-failed/10 px-2.5 py-1 text-[11px] font-semibold text-failed sm:inline-flex">
                      <span className="h-1.5 w-1.5 rounded-full bg-failed shadow-[0_0_0_3px_rgba(239,68,68,0.18)]" />
                      {locale === "ar" ? "نشاط مرتفع" : "High Activity"}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Top Rules */}
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-3.5">
            <p className="text-sm font-semibold">
              {locale === "ar" ? "أهم القواعد المُفعّلة" : "Most Triggered Rules"}
            </p>
            <p className="mt-0.5 text-xs text-subtle">
              {locale === "ar" ? "أكثر أنواع الهجمات شيوعاً" : "Most common attack types"}
            </p>
          </div>
          <table className="w-full text-start text-sm">
            <thead className="text-xs uppercase tracking-wide text-subtle">
              <tr>
                <th className="px-5 py-2.5 text-start font-medium">{locale === "ar" ? "رقم القاعدة" : "Rule ID"}</th>
                <th className="px-5 py-2.5 text-end font-medium">{locale === "ar" ? "العدد" : "Count"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!data?.topRules.length ? (
                <tr><td colSpan={2} className="px-5 py-10 text-center text-subtle">{locale === "ar" ? "لا توجد بيانات." : "No data."}</td></tr>
              ) : (
                data.topRules.map((x) => (
                  <tr key={x.key} className="hover:bg-muted/40">
                    <td className="px-5 py-3">
                      <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-1 font-mono text-xs text-primary" title={x.key}>
                        {x.key}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-end font-semibold tabular-nums">{x.count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="border-t border-border px-5 py-2.5 text-xs text-subtle">
            {locale === "ar" ? "عرض أكثر القواعد تفعيلاً خلال آخر 24 ساعة" : "Displaying most triggered rules in the last 24 hours"}
          </div>
        </div>
      </div>

      {/* Recent events + sites */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="overflow-hidden rounded-xl border border-border bg-card lg:col-span-2">
          <div className="border-b border-border px-5 py-3.5">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Activity className="h-4 w-4 text-primary" />
              {locale === "ar" ? "آخر الأحداث المحظورة" : "Recent Blocked Events"}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-muted text-subtle">
                <tr>
                  <th className="px-4 py-2.5 text-start font-medium">{locale === "ar" ? "الوقت" : "Time"}</th>
                  <th className="px-4 py-2.5 text-start font-medium">{locale === "ar" ? "المشروع" : "Project"}</th>
                  <th className="px-4 py-2.5 text-start font-medium">IP</th>
                  <th className="px-4 py-2.5 text-start font-medium">{locale === "ar" ? "المسار" : "Path"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {!data?.recent.length ? (
                  <tr><td colSpan={4} className="px-4 py-10 text-center text-subtle">{locale === "ar" ? "لا أحداث بعد. 🎉" : "No blocked events yet. 🎉"}</td></tr>
                ) : (
                  data.recent.map((r, i) => (
                    <tr key={i} className="hover:bg-muted/40">
                      <td className="whitespace-nowrap px-4 py-2.5 text-subtle" dir="ltr">{r.time?.slice(0, 24)}</td>
                      <td className="px-4 py-2.5">{r.site}</td>
                      <td className="px-4 py-2.5 font-mono" dir="ltr">{r.ip}</td>
                      <td className="max-w-[160px] truncate px-4 py-2.5 font-mono" dir="ltr" title={r.uri}>{r.uri}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-3.5">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Server className="h-4 w-4 text-primary" />
              {locale === "ar" ? "المواقع والحماية" : "Sites & protection"}
            </p>
          </div>
          <div className="divide-y divide-border">
            {data?.sites.map((s) => (
              <Link key={s.slug} href={`/projects/${s.slug}`} className="flex items-center justify-between px-5 py-2.5 text-sm transition-colors hover:bg-muted/40">
                <div className="min-w-0">
                  <p className="truncate font-medium">{s.name}</p>
                  <p className="truncate text-xs text-subtle" dir="ltr">{s.domain}</p>
                </div>
                <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs", s.enabled ? "bg-ready/10 text-ready" : "bg-muted text-subtle")}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", s.enabled ? "bg-ready" : "bg-subtle")} />
                  {s.enabled ? (locale === "ar" ? "مُفعّل" : "On") : (locale === "ar" ? "متوقّف" : "Off")}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 py-4 text-xs text-subtle">
        <Globe className="h-3.5 w-3.5" />
        {locale === "ar"
          ? "بيانات الدولة عبر GeoIP. تُحدّث عند الطلب."
          : "Country data via GeoIP, refreshed on demand."}
      </div>
    </DashboardShell>
  );
}
