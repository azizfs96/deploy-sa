"use client";

import { useMemo, useState } from "react";
import { useT } from "@/lib/store";
import { cn } from "@/lib/utils";

interface SiteSeries {
  name: string;
  slug: string;
  series: number[];
  series30: number[];
}

/**
 * Hand-rolled SVG time-series chart. Range toggle: last 30 minutes (per-minute)
 * or last 24 hours (per-hour). Buckets are elapsed-time based, so the newest
 * point is always at the right edge ("now").
 */
export function AttackChart({
  series,
  series30,
  sites,
}: {
  series: number[];
  series30: number[];
  sites: SiteSeries[];
}) {
  const { locale } = useT();
  const [domain, setDomain] = useState("");
  const [range, setRange] = useState<"30m" | "24h">("30m");
  const [show, setShow] = useState({ allowed: true, blocked: true, notfound: true });

  const active = useMemo(() => {
    const site = domain ? sites.find((s) => s.slug === domain) : null;
    if (range === "30m") return site?.series30 ?? series30;
    return site?.series ?? series;
  }, [domain, range, series, series30, sites]);

  const n = active.length;
  const W = 960;
  const H = 320;
  const padL = 36;
  const padB = 26;
  const padT = 12;
  const plotW = W - padL - 10;
  const plotH = H - padB - padT;

  const max = Math.max(5, Math.ceil(Math.max(...active) / 5) * 5);
  const x = (i: number) => padL + (i / (n - 1)) * plotW;
  const y = (v: number) => padT + plotH - (v / max) * plotH;

  // now-relative clock labels
  const now = Date.now();
  const fmt = (ms: number) => {
    const d = new Date(ms);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  const label = (i: number) =>
    range === "30m"
      ? fmt(now - (n - 1 - i) * 60_000)
      : fmt(now - (n - 1 - i) * 3_600_000);
  const labelEvery = range === "30m" ? 5 : 3;

  const linePath = (vals: number[]) =>
    vals.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const areaPath = (vals: number[]) => `${linePath(vals)} L ${x(n - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`;
  const zero = new Array(n).fill(0);
  const yTicks = [0, max * 0.25, max * 0.5, max * 0.75, max];

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { k: "allowed", label: locale === "ar" ? "مسموح (200)" : "Allowed (200)", color: "#22c55e" },
            { k: "blocked", label: locale === "ar" ? "محظور" : "Blocked", color: "#ef4444" },
            { k: "notfound", label: locale === "ar" ? "غير موجود (404)" : "Not Found (404)", color: "#f59e0b" },
          ].map((s) => (
            <button
              key={s.k}
              onClick={() => setShow((v) => ({ ...v, [s.k]: !v[s.k as keyof typeof v] }))}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors",
                show[s.k as keyof typeof show] ? "border-border bg-muted text-fg" : "border-border text-subtle opacity-50"
              )}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {/* range toggle */}
          <div className="flex rounded-lg border border-border p-0.5">
            {(["30m", "24h"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  range === r ? "bg-primary text-primary-fg" : "text-subtle hover:text-fg"
                )}
              >
                {r === "30m" ? (locale === "ar" ? "٣٠ دقيقة" : "30 min") : (locale === "ar" ? "٢٤ ساعة" : "24h")}
              </button>
            ))}
          </div>
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="h-8 rounded-lg border border-border bg-muted px-3 text-xs text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <option value="">{locale === "ar" ? "كل النطاقات" : "All Domains"}</option>
            {sites.map((s) => (
              <option key={s.slug} value={s.slug}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div dir="ltr" className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-[320px] w-full min-w-[640px]">
          {yTicks.map((t, i) => (
            <g key={i}>
              <line x1={padL} x2={W - 10} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth="1" />
              <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize="10" fill="var(--subtle)">{Math.round(t)}</text>
            </g>
          ))}
          {Array.from({ length: n }).map((_, i) =>
            i % labelEvery === 0 || i === n - 1 ? (
              <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="9" fill="var(--subtle)">{label(i)}</text>
            ) : null
          )}

          {show.allowed && <path d={linePath(zero)} fill="none" stroke="#22c55e" strokeWidth="2" />}
          {show.notfound && <path d={linePath(zero)} fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 3" />}
          {show.blocked && (
            <>
              <path d={areaPath(active)} fill="url(#blockedGrad)" opacity="0.25" />
              <path d={linePath(active)} fill="none" stroke="#ef4444" strokeWidth="2.5" />
              {active.map((v, i) => (v > 0 ? <circle key={i} cx={x(i)} cy={y(v)} r="3" fill="#ef4444" /> : null))}
            </>
          )}
          <defs>
            <linearGradient id="blockedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}
