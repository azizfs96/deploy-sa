"use client";

import { useMemo, useRef, useState } from "react";
import { useT } from "@/lib/store";
import { cn } from "@/lib/utils";

type Range = "1h" | "24h" | "7d";

interface SiteSeries {
  name: string;
  slug: string;
  series: number[];
  series1h: number[];
  series7d: number[];
}

/**
 * Monotone cubic (Fritsch-Carlson) smoothing — like Catmull-Rom but WITHOUT
 * overshoot, so the curve never dips below 0 (or above the peak) between points.
 */
function smoothPath(pts: { x: number; y: number }[]) {
  const N = pts.length;
  if (N < 2) return "";
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < N - 1; i++) {
    const h = xs[i + 1] - xs[i] || 1;
    dx.push(h);
    slope.push((ys[i + 1] - ys[i]) / h);
  }
  const m = new Array(N).fill(0);
  m[0] = slope[0];
  m[N - 1] = slope[N - 2];
  for (let i = 1; i < N - 1; i++) {
    m[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  }
  for (let i = 0; i < N - 1; i++) {
    if (slope[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
    } else {
      const a = m[i] / slope[i];
      const b = m[i + 1] / slope[i];
      const hyp = Math.hypot(a, b);
      if (hyp > 3) {
        const t = 3 / hyp;
        m[i] = t * a * slope[i];
        m[i + 1] = t * b * slope[i];
      }
    }
  }
  let d = `M ${xs[0].toFixed(1)} ${ys[0].toFixed(1)}`;
  for (let i = 0; i < N - 1; i++) {
    const c1x = xs[i] + dx[i] / 3;
    const c1y = ys[i] + (m[i] * dx[i]) / 3;
    const c2x = xs[i + 1] - dx[i] / 3;
    const c2y = ys[i + 1] - (m[i + 1] * dx[i]) / 3;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${xs[i + 1].toFixed(1)} ${ys[i + 1].toFixed(1)}`;
  }
  return d;
}

export function AttackChart({
  series,
  series1h,
  series7d,
  sites,
}: {
  series: number[];
  series1h: number[];
  series7d: number[];
  sites: SiteSeries[];
}) {
  const { locale } = useT();
  const [domain, setDomain] = useState("");
  const [range, setRange] = useState<Range>("24h");
  const [show, setShow] = useState({ allowed: true, blocked: true, notfound: true });
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const active = useMemo(() => {
    const site = domain ? sites.find((s) => s.slug === domain) : null;
    if (range === "1h") return site?.series1h ?? series1h;
    if (range === "7d") return site?.series7d ?? series7d;
    return site?.series ?? series;
  }, [domain, range, series, series1h, series7d, sites]);

  const n = active.length;
  const W = 960;
  const H = 320;
  const padL = 38;
  const padB = 28;
  const padT = 14;
  const plotW = W - padL - 14;
  const plotH = H - padB - padT;

  const peak = Math.max(...active, 0);
  const total = active.reduce((a, b) => a + b, 0);
  const max = Math.max(5, Math.ceil(peak / 5) * 5);
  const x = (i: number) => padL + (i / (n - 1)) * plotW;
  const y = (v: number) => padT + plotH - (v / max) * plotH;
  const pts = active.map((v, i) => ({ x: x(i), y: y(v) }));

  const now = Date.now();
  const hhmm = (ms: number) => {
    const d = new Date(ms);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  const dayLabel = (ms: number) => {
    const days = locale === "ar"
      ? ["أحد", "إثن", "ثلا", "أرب", "خمي", "جمع", "سبت"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[new Date(ms).getDay()];
  };
  const label = (i: number) => {
    if (range === "1h") return hhmm(now - (n - 1 - i) * 60_000);
    if (range === "7d") return dayLabel(now - (n - 1 - i) * 86_400_000);
    return hhmm(now - (n - 1 - i) * 3_600_000);
  };
  const labelEvery = range === "1h" ? 10 : range === "7d" ? 1 : 3;

  const linePath = smoothPath(pts);
  const areaPath = `${linePath} L ${x(n - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`;
  const yTicks = [0, max * 0.25, max * 0.5, max * 0.75, max];

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - padL) / plotW) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  const ranges: { k: Range; label: string }[] = [
    { k: "1h", label: locale === "ar" ? "آخر ساعة" : "Last hour" },
    { k: "24h", label: locale === "ar" ? "اليوم" : "Last day" },
    { k: "7d", label: locale === "ar" ? "٧ أيام" : "7 days" },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      {/* header */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">
            {locale === "ar" ? "نشاط الهجمات" : "Attack Activity"}
          </p>
          <div className="mt-1 flex items-baseline gap-3 text-xs text-subtle">
            <span>
              {locale === "ar" ? "الإجمالي" : "Total"}{" "}
              <span className="font-semibold text-failed">{total}</span>
            </span>
            <span>
              {locale === "ar" ? "الذروة" : "Peak"}{" "}
              <span className="font-semibold text-fg">{peak}</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border p-0.5">
            {ranges.map((r) => (
              <button
                key={r.k}
                onClick={() => setRange(r.k)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  range === r.k ? "bg-primary text-primary-fg shadow" : "text-subtle hover:text-fg"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="h-9 rounded-lg border border-border bg-muted px-3 text-xs text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <option value="">{locale === "ar" ? "كل النطاقات" : "All Domains"}</option>
            {sites.map((s) => (
              <option key={s.slug} value={s.slug}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* status legend */}
      <div className="mb-3 flex flex-wrap gap-2">
        {[
          { k: "allowed", label: locale === "ar" ? "مسموح (200)" : "Allowed (200)", color: "#22c55e" },
          { k: "blocked", label: locale === "ar" ? "محظور" : "Blocked", color: "#ef4444" },
          { k: "notfound", label: locale === "ar" ? "غير موجود (404)" : "Not Found (404)", color: "#f59e0b" },
        ].map((s) => (
          <button
            key={s.k}
            onClick={() => setShow((v) => ({ ...v, [s.k]: !v[s.k as keyof typeof v] }))}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-all",
              show[s.k as keyof typeof show]
                ? "border-border bg-muted text-fg"
                : "border-border text-subtle opacity-40"
            )}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            {s.label}
          </button>
        ))}
      </div>

      <div dir="ltr" className="w-full overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="h-[300px] w-full min-w-[640px] cursor-crosshair"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="blockedArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="blockedStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
            <filter id="lineGlow" x="-20%" y="-50%" width="140%" height="200%">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* grid + y labels */}
          {yTicks.map((t, i) => (
            <g key={i}>
              <line
                x1={padL}
                x2={W - 14}
                y1={y(t)}
                y2={y(t)}
                stroke="var(--border)"
                strokeWidth="1"
                strokeDasharray="2 4"
              />
              <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize="10" fill="var(--subtle)">
                {Math.round(t)}
              </text>
            </g>
          ))}
          {/* x labels */}
          {Array.from({ length: n }).map((_, i) =>
            i % labelEvery === 0 || i === n - 1 ? (
              <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="9" fill="var(--subtle)">
                {label(i)}
              </text>
            ) : null
          )}

          {/* allowed / not-found baselines */}
          {show.allowed && (
            <line x1={x(0)} x2={x(n - 1)} y1={y(0)} y2={y(0)} stroke="#22c55e" strokeWidth="2" opacity="0.7" />
          )}
          {show.notfound && (
            <line x1={x(0)} x2={x(n - 1)} y1={y(0)} y2={y(0)} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.5" />
          )}

          {/* blocked area + line */}
          {show.blocked && (
            <>
              <path key={`a-${range}-${domain}`} className="chart-area" d={areaPath} fill="url(#blockedArea)" />
              <path
                key={`l-${range}-${domain}`}
                className="chart-line"
                pathLength={1}
                d={linePath}
                fill="none"
                stroke="url(#blockedStroke)"
                strokeWidth="2.5"
                strokeLinecap="round"
                filter="url(#lineGlow)"
              />
              {/* now marker (last point) */}
              {peak > 0 && (
                <circle cx={x(n - 1)} cy={y(active[n - 1])} r="4" fill="#ef4444">
                  <animate attributeName="r" values="4;7;4" dur="1.6s" repeatCount="indefinite" />
                </circle>
              )}
            </>
          )}

          {/* hover crosshair + tooltip */}
          {hover !== null && show.blocked && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + plotH} stroke="var(--subtle)" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
              <circle cx={x(hover)} cy={y(active[hover])} r="5" fill="#ef4444" stroke="var(--card)" strokeWidth="2" />
              {(() => {
                const tw = 92;
                const tx = Math.min(Math.max(x(hover) - tw / 2, padL), W - 14 - tw);
                const ty = Math.max(y(active[hover]) - 50, padT);
                return (
                  <g transform={`translate(${tx}, ${ty})`}>
                    <rect width={tw} height="38" rx="8" fill="var(--surface)" stroke="var(--border)" />
                    <text x="10" y="16" fontSize="11" fontWeight="700" fill="var(--fg)">
                      {active[hover]} {locale === "ar" ? "محظور" : "blocked"}
                    </text>
                    <text x="10" y="30" fontSize="10" fill="var(--subtle)">
                      {label(hover)}
                    </text>
                  </g>
                );
              })()}
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
