"use client";

import { useT } from "@/lib/store";
import { flagEmoji } from "@/lib/flag";

interface Origin {
  lat: number;
  lon: number;
  count: number;
  cc: string;
  country: string;
}

/**
 * "Live Attack Origins" threat map. Equirectangular projection over a stylized
 * dark world grid, with glowing pulsing markers at attack origins.
 */
export function WorldThreatMap({ origins }: { origins: Origin[] }) {
  const { locale } = useT();
  const max = Math.max(...origins.map((o) => o.count), 1);

  const project = (lat: number, lon: number) => ({
    left: `${((lon + 180) / 360) * 100}%`,
    top: `${((90 - lat) / 180) * 100}%`,
  });

  return (
    <div className="relative h-full min-h-[200px] overflow-hidden rounded-xl border border-border bg-[#0b1020]">
      {/* Live badge */}
      <span className="absolute end-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/15 px-2.5 py-1 text-[11px] font-medium text-primary">
        <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-primary" />
        Live
      </span>

      {/* lat/long grid */}
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(99,102,241,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.5) 1px, transparent 1px)",
          backgroundSize: "8.33% 16.66%",
        }}
      />
      {/* equator + meridian */}
      <div className="absolute inset-x-0 top-1/2 h-px bg-primary/20" />
      <div className="absolute inset-y-0 left-1/2 w-px bg-primary/20" />

      {/* origin markers */}
      {origins.map((o, i) => {
        const pos = project(o.lat, o.lon);
        const size = 8 + Math.round((o.count / max) * 14);
        return (
          <div
            key={i}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={pos}
            title={`${o.country}: ${o.count}`}
          >
            <span
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-failed/40"
              style={{ width: size, height: size }}
            />
            <span className="relative block h-2.5 w-2.5 rounded-full bg-failed shadow-[0_0_12px_3px_rgba(239,68,68,0.7)]" />
          </div>
        );
      })}

      {/* legend */}
      {origins.length > 0 && (
        <div className="absolute bottom-2 start-2 z-20 flex max-w-[80%] flex-wrap gap-1.5">
          {origins.slice(0, 4).map((o, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/40 px-2 py-0.5 text-[10px] text-white/80 backdrop-blur"
            >
              <span>{flagEmoji(o.cc)}</span>
              {o.country || "Unknown"} · {o.count}
            </span>
          ))}
        </div>
      )}

      {origins.length === 0 && (
        <div className="absolute inset-0 grid place-items-center text-xs text-white/40">
          {locale === "ar" ? "لا هجمات بعد" : "No attacks yet"}
        </div>
      )}
    </div>
  );
}
