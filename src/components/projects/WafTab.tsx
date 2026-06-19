"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Plus, Trash2, Loader2, Ban, Activity, RefreshCw, Globe } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { useT } from "@/lib/store";
import { cn } from "@/lib/utils";

type RuleType = "block_ip" | "block_path" | "block_country";
interface Rule {
  id: string;
  type: RuleType;
  value: string;
}

export function WafTab({ slug }: { slug: string }) {
  const { locale } = useT();
  const [enabled, setEnabled] = useState(false);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<RuleType>("block_ip");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  interface Stats {
    totalBlocked: number;
    topIps: { key: string; count: number }[];
    topRules: { key: string; count: number }[];
    recent: { time: string; ip: string; uri: string; rule: string; ruleId: string }[];
  }
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const loadStats = () => {
    setStatsLoading(true);
    fetch(`/api/projects/${slug}/waf/stats`)
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false));
  };

  const load = () => {
    fetch(`/api/projects/${slug}/waf`)
      .then((r) => r.json())
      .then((d) => {
        setEnabled(Boolean(d.enabled));
        setRules(d.rules ?? []);
        if (d.enabled) loadStats();
      })
      .finally(() => setLoading(false));
  };
  useEffect(load, [slug]);

  const toggle = async (v: boolean) => {
    setEnabled(v);
    await fetch(`/api/projects/${slug}/waf`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: v }),
    });
  };

  const addRule = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${slug}/waf/rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, value: value.trim() }),
      });
      if (!res.ok) throw new Error(locale === "ar" ? "قيمة غير صالحة" : "Invalid value");
      const d = await res.json();
      setRules(d.rules);
      setValue("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const removeRule = async (id: string) => {
    const res = await fetch(`/api/projects/${slug}/waf/rules/${id}`, { method: "DELETE" });
    const d = await res.json();
    setRules(d.rules ?? []);
  };

  const labels: Record<RuleType, { ar: string; en: string; ph: string }> = {
    block_ip: { ar: "حظر IP", en: "Block IP", ph: "203.0.113.5" },
    block_path: { ar: "حظر مسار", en: "Block path", ph: "/admin" },
    block_country: { ar: "حظر دولة", en: "Block country", ph: "RU" },
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-subtle">
        <Loader2 className="h-4 w-4 animate-spin" />
        {locale === "ar" ? "جاري التحميل..." : "Loading..."}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Status */}
      <Card className="flex items-center justify-between p-5">
        <div className="flex items-center gap-3">
          <span className={cn("grid h-10 w-10 place-items-center rounded-lg", enabled ? "bg-ready/15 text-ready" : "bg-muted text-subtle")}>
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold">
              {locale === "ar" ? "جدار الحماية (WAF)" : "Web Application Firewall"}
            </p>
            <p className="text-xs text-subtle">
              {locale === "ar"
                ? "حماية OWASP CRS ضد SQLi و XSS وغيرها — مع قواعدك الخاصة."
                : "OWASP CRS protection (SQLi, XSS…) plus your own rules."}
            </p>
          </div>
        </div>
        <Toggle checked={enabled} onChange={toggle} />
      </Card>

      {/* Core protection note */}
      <Card className="flex items-start gap-3 p-4 text-sm text-subtle">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span>
          {locale === "ar"
            ? "الحماية الأساسية (OWASP Core Rule Set) مُفعّلة ومُدارة من المنصّة. أنت تتحكّم في القواعد الإضافية لموقعك فقط."
            : "Core protection (OWASP CRS) is managed by the platform. You control only the additional rules for your site."}
        </span>
      </Card>

      {/* Add rule */}
      <Card className="p-5">
        <h3 className="mb-4 font-semibold">
          {locale === "ar" ? "قواعد الحظر الخاصة بموقعك" : "Your site's block rules"}
        </h3>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as RuleType)}
            className="h-10 rounded-lg border border-border bg-muted px-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:w-44"
          >
            {(Object.keys(labels) as RuleType[]).map((k) => (
              <option key={k} value={k}>{locale === "ar" ? labels[k].ar : labels[k].en}</option>
            ))}
          </select>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addRule()}
            placeholder={labels[type].ph}
            className="font-mono"
            dir="ltr"
          />
          <Button onClick={addRule} disabled={busy || !value.trim() || !enabled} className="shrink-0 gap-1.5">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {locale === "ar" ? "إضافة" : "Add"}
          </Button>
        </div>
        {!enabled && (
          <p className="mt-2 text-xs text-building">
            {locale === "ar" ? "فعّل WAF أولاً لتطبيق القواعد." : "Enable WAF first to apply rules."}
          </p>
        )}
        {error && <p className="mt-2 text-sm text-failed">{error}</p>}

        <div className="mt-4 divide-y divide-border">
          {rules.length === 0 ? (
            <p className="py-6 text-center text-sm text-subtle">
              {locale === "ar" ? "لا توجد قواعد بعد." : "No rules yet."}
            </p>
          ) : (
            rules.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Ban className="h-4 w-4 text-failed" />
                  <span className="text-sm">{locale === "ar" ? labels[r.type].ar : labels[r.type].en}</span>
                  <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs" dir="ltr">{r.value}</code>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeRule(r.id)} className="text-subtle hover:text-failed">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Attack analytics */}
      {enabled && (
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-semibold">
              <Activity className="h-4 w-4 text-primary" />
              {locale === "ar" ? "تحليلات الهجمات" : "Attack analytics"}
            </h3>
            <button
              onClick={loadStats}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-subtle transition-colors hover:bg-muted hover:text-fg"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", statsLoading && "animate-spin")} />
              {locale === "ar" ? "تحديث" : "Refresh"}
            </button>
          </div>

          {!stats || stats.totalBlocked === 0 ? (
            <p className="py-8 text-center text-sm text-subtle">
              {locale === "ar"
                ? "لا توجد طلبات محظورة بعد. 🎉"
                : "No blocked requests yet. 🎉"}
            </p>
          ) : (
            <div className="space-y-5">
              {/* total */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-muted p-4">
                  <p className="text-xs text-subtle">
                    {locale === "ar" ? "إجمالي الطلبات المحظورة" : "Total blocked"}
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-failed">
                    {stats.totalBlocked}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted p-4">
                  <p className="text-xs text-subtle">
                    {locale === "ar" ? "عناوين مهاجِمة فريدة" : "Unique attacker IPs"}
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">{stats.topIps.length}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted p-4">
                  <p className="text-xs text-subtle">
                    {locale === "ar" ? "قواعد مُفعّلة" : "Rules triggered"}
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">{stats.topRules.length}</p>
                </div>
              </div>

              {/* Top attacker IPs — WAF_GATE style */}
              <div className="overflow-hidden rounded-xl border border-border">
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
                  {stats.topIps.map((x) => {
                    const maxCnt = Math.max(...stats.topIps.map((i) => i.count), 1);
                    const share = Math.max(4, Math.round((x.count / maxCnt) * 100));
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
                  })}
                </div>
              </div>

              {/* Top rules */}
              <div className="overflow-hidden rounded-xl border border-border">
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
                  {stats.topRules.map((x) => (
                    <div key={x.key} className="flex items-center justify-between gap-2 px-5 py-2.5 text-sm">
                      <span className="truncate" title={x.key}>{x.key}</span>
                      <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary tabular-nums">
                        {x.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* recent blocked */}
              <div>
                <p className="mb-2 text-xs font-medium text-subtle">
                  {locale === "ar" ? "آخر الطلبات المحظورة" : "Recent blocked requests"}
                </p>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-start text-xs">
                    <thead className="bg-muted text-subtle">
                      <tr>
                        <th className="px-3 py-2 text-start font-medium">{locale === "ar" ? "الوقت" : "Time"}</th>
                        <th className="px-3 py-2 text-start font-medium">IP</th>
                        <th className="px-3 py-2 text-start font-medium">{locale === "ar" ? "المسار" : "Path"}</th>
                        <th className="px-3 py-2 text-start font-medium">{locale === "ar" ? "القاعدة" : "Rule"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {stats.recent.map((r, i) => (
                        <tr key={i} className="hover:bg-muted/50">
                          <td className="whitespace-nowrap px-3 py-2 text-subtle" dir="ltr">{r.time?.slice(0, 24)}</td>
                          <td className="px-3 py-2 font-mono" dir="ltr">{r.ip}</td>
                          <td className="max-w-[200px] truncate px-3 py-2 font-mono" dir="ltr" title={r.uri}>{r.uri}</td>
                          <td className="max-w-[240px] truncate px-3 py-2" title={r.rule}>{r.rule || r.ruleId}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
