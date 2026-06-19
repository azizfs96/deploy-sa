"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  Globe,
  Ban,
  RefreshCw,
  Activity,
  Server,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/card";
import { useT } from "@/lib/store";
import { cn } from "@/lib/utils";

interface KV {
  key: string;
  count: number;
}
interface Site {
  slug: string;
  name: string;
  domain: string;
  enabled: boolean;
  blocked: number;
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
  topIps: KV[];
  topRules: KV[];
  recent: Recent[];
  sites: Site[];
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

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden p-5">
          <div className="absolute end-4 top-4 text-failed/20">
            <Ban className="h-10 w-10" />
          </div>
          <p className="text-xs text-subtle">
            {locale === "ar" ? "الطلبات المحظورة" : "Blocked Requests"}
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-failed">
            {(data?.totalBlocked ?? 0).toLocaleString()}
          </p>
          <span className="mt-2 inline-block rounded-full bg-failed/10 px-2 py-0.5 text-xs text-failed">
            {locale === "ar" ? "كل المشاريع" : "all projects"}
          </span>
        </Card>

        <Card className="relative overflow-hidden p-5">
          <div className="absolute end-4 top-4 text-primary/20">
            <ShieldCheck className="h-10 w-10" />
          </div>
          <p className="text-xs text-subtle">
            {locale === "ar" ? "مواقع محميّة" : "Protected Sites"}
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums">
            {data?.protectedSites ?? 0}
            <span className="text-lg text-subtle"> / {data?.totalSites ?? 0}</span>
          </p>
          <span className="mt-2 inline-block rounded-full bg-ready/10 px-2 py-0.5 text-xs text-ready">
            WAF {locale === "ar" ? "مُفعّل" : "active"}
          </span>
        </Card>

        <Card className="relative overflow-hidden p-5 sm:col-span-2">
          <div className="absolute end-4 top-4 text-building/20">
            <ShieldAlert className="h-10 w-10" />
          </div>
          <p className="text-xs text-subtle">
            {locale === "ar" ? "أبرز مصدر هجوم" : "Top Attack Source"}
          </p>
          <p className="mt-1 font-mono text-2xl font-bold" dir="ltr">
            {topIp?.key ?? (locale === "ar" ? "لا يوجد" : "None")}
          </p>
          <span className="mt-2 inline-block rounded-full bg-building/10 px-2 py-0.5 text-xs text-building">
            {topIp?.count ?? 0} {locale === "ar" ? "محاولة" : "attempts"}
          </span>
        </Card>
      </div>

      {loading && !data ? (
        <div className="mt-6 flex items-center gap-2 py-12 text-sm text-subtle">
          <RefreshCw className="h-4 w-4 animate-spin" />
          {locale === "ar" ? "جاري التحميل..." : "Loading..."}
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {/* Top attacker IPs — WAF_GATE design */}
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border px-5 py-3.5">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <Globe className="h-4 w-4 text-failed" />
                {locale === "ar" ? "أهم المهاجمين (IP)" : "Top IP Addresses"}
              </p>
              <p className="mt-0.5 text-xs text-subtle">
                {locale === "ar"
                  ? "أكثر المصادر نشاطاً حسب عدد المحاولات"
                  : "Most active sources by number of attempts"}
              </p>
            </div>
            <div className="flex flex-col">
              {!data?.topIps.length ? (
                <p className="px-5 py-10 text-center text-sm text-subtle">
                  {locale === "ar" ? "لا توجد بيانات بعد." : "No data yet."}
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
                          <span className="truncate font-mono text-[13px] font-semibold" dir="ltr">
                            {x.key}
                          </span>
                          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-subtle">
                            <span>🌐</span>
                            {locale === "ar" ? "غير معروف" : "Unknown"}
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <span
                            className="block h-full rounded-full bg-gradient-to-r from-failed/60 to-failed"
                            style={{ width: `${share}%` }}
                          />
                        </div>
                      </div>
                      <div className="shrink-0 text-end" style={{ minWidth: 56 }}>
                        <div className="text-sm font-bold leading-tight tabular-nums">
                          {x.count.toLocaleString()}
                        </div>
                        <div className="mt-0.5 text-[11px] text-subtle">
                          {locale === "ar" ? "محاولة" : "attempts"}
                        </div>
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

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Top rules */}
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="border-b border-border px-5 py-3.5">
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  {locale === "ar" ? "أهم القواعد المُفعّلة" : "Most Triggered Rules"}
                </p>
                <p className="mt-0.5 text-xs text-subtle">
                  {locale === "ar" ? "أكثر أنواع الهجمات شيوعاً" : "Most common attack types"}
                </p>
              </div>
              <div className="divide-y divide-border">
                {!data?.topRules.length ? (
                  <p className="px-5 py-10 text-center text-sm text-subtle">
                    {locale === "ar" ? "لا توجد بيانات بعد." : "No data yet."}
                  </p>
                ) : (
                  data.topRules.map((x) => (
                    <div key={x.key} className="flex items-center justify-between gap-2 px-5 py-2.5 text-sm">
                      <span className="truncate" title={x.key}>{x.key}</span>
                      <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary tabular-nums">
                        {x.count}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Protected sites */}
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="border-b border-border px-5 py-3.5">
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  <Server className="h-4 w-4 text-primary" />
                  {locale === "ar" ? "المواقع والحماية" : "Sites & protection"}
                </p>
                <p className="mt-0.5 text-xs text-subtle">
                  {locale === "ar" ? "حالة WAF لكل مشروع" : "WAF status per project"}
                </p>
              </div>
              <div className="divide-y divide-border">
                {data?.sites.map((s) => (
                  <Link
                    key={s.slug}
                    href={`/projects/${s.slug}`}
                    className="flex items-center justify-between px-5 py-2.5 text-sm transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{s.name}</p>
                      <p className="truncate text-xs text-subtle" dir="ltr">{s.domain}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {s.blocked > 0 && (
                        <span className="rounded-full bg-failed/10 px-2 py-0.5 text-xs text-failed">
                          {s.blocked} {locale === "ar" ? "محظور" : "blocked"}
                        </span>
                      )}
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs",
                          s.enabled ? "bg-ready/10 text-ready" : "bg-muted text-subtle"
                        )}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full", s.enabled ? "bg-ready" : "bg-subtle")} />
                        {s.enabled ? (locale === "ar" ? "مُفعّل" : "On") : (locale === "ar" ? "متوقّف" : "Off")}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Recent blocked events */}
          <div className="overflow-hidden rounded-xl border border-border bg-card">
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
                    <th className="px-4 py-2.5 text-start font-medium">{locale === "ar" ? "القاعدة" : "Rule"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {!data?.recent.length ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-subtle">
                        {locale === "ar" ? "لا أحداث محظورة بعد. 🎉" : "No blocked events yet. 🎉"}
                      </td>
                    </tr>
                  ) : (
                    data.recent.map((r, i) => (
                      <tr key={i} className="hover:bg-muted/40">
                        <td className="whitespace-nowrap px-4 py-2.5 text-subtle" dir="ltr">{r.time?.slice(0, 24)}</td>
                        <td className="px-4 py-2.5">{r.site}</td>
                        <td className="px-4 py-2.5 font-mono" dir="ltr">{r.ip}</td>
                        <td className="max-w-[180px] truncate px-4 py-2.5 font-mono" dir="ltr" title={r.uri}>{r.uri}</td>
                        <td className="max-w-[240px] truncate px-4 py-2.5" title={r.rule}>{r.rule || r.ruleId}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
