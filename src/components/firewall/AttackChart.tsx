"use client";

import { useMemo, useState } from "react";
import { useT } from "@/lib/store";
import { cn } from "@/lib/utils";

interface SiteSeries {
  name: string;
  slug: string;
  series: number[];
}

/**
 * Hand-rolled SVG time-series chart (no chart lib) matching the reference WAF
 * dashboard: 24 hourly points, Blocked (red) line + Allowed/Not-Found toggles,
 * and a domain selector.
 */
export function AttackChart({
  series,
  sites,
}: {
  series: number[];
  sites: SiteSeries[];
}) {
  const { locale } = useT();
  const [domain, setDomain] = useState("");
  const [show, setShow] = useState({ allowed: true, blocked: true, notfound: true });

  const active = useMemo(() => {
    if (!domain) return series;
    return sites.find((s) => s.slug === domain)?.series ?? series;
  }, [domain, series, sites]);

  const W = 960;
  const H = 320;
  const padL = 36;
  const padB = 26;
  const padT = 12;
  const plotW = W - padL - 10;
  const plotH = H - padB - padT;

  const max = Math.max(5, Math.ceil(Math.max(...active) / 5) * 5);
  const n = 24;
  const x = (i: number) => padL + (i / (n - 1)) * plotW;
  const y = (v: number) => padT + plotH - (v / max) * plotH;

  // labels: last 24 hours ending at current hour
  const nowH = new Date().getHours();
  const hourLabel = (i: number) => `${String((nowH + 1 + i) % 24).padStart(2, "0")}:00`;

  const linePath = (vals: number[]) =>
    vals.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const areaPath = (vals: number[]) =>
    `${linePath(vals)} L ${x(n - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`;

  const zero = new Array(24).fill(0);
  const yTicks = [0, max * 0.25, max * 0.5, max * 0.75, max];

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {/* controls */}
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
                show[s.k as keyof typeof show]
                  ? "border-border bg-muted text-fg"
                  : "border-border text-subtle opacity-50"
              )}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.label}
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

      <div dir="ltr" className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-[320px] w-full min-w-[640px]">
          {/* grid + y labels */}
          {yTicks.map((t, i) => (
            <g key={i}>
              <line x1={padL} x2={W - 10} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth="1" />
              <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize="10" fill="var(--subtle)">
                {Math.round(t)}
              </text>
            </g>
          ))}
          {/* x labels (every 1h) */}
          {Array.from({ length: n }).map((_, i) => (
            <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="9" fill="var(--subtle)">
              {hourLabel(i)}
            </text>
          ))}

          {/* allowed (flat baseline – access logs not yet wired) */}
          {show.allowed && (
            <path d={linePath(zero)} fill="none" stroke="#22c55e" strokeWidth="2" />
          )}
          {/* not found */}
          {show.notfound && (
            <path d={linePath(zero)} fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 3" />
          )}
          {/* blocked */}
          {show.blocked && (
            <>
              <path d={areaPath(active)} fill="url(#blockedGrad)" opacity="0.25" />
              <path d={linePath(active)} fill="none" stroke="#ef4444" strokeWidth="2.5" />
              {active.map((v, i) =>
                v > 0 ? <circle key={i} cx={x(i)} cy={y(v)} r="3" fill="#ef4444" /> : null
              )}
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
