"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Terminal-style log stream. Two modes:
 *  - `streamUrl`: connects to a real SSE endpoint (build agent logs).
 *  - otherwise: renders `lines`, optionally simulated one-by-one (80ms).
 */
export function LogStream({
  lines = [],
  streamUrl,
  className,
  live = true,
  onDone,
  onComplete,
}: {
  lines?: string[];
  streamUrl?: string;
  className?: string;
  live?: boolean;
  onDone?: () => void;
  onComplete?: (status: string, url: string | null) => void;
}) {
  const [shown, setShown] = useState<string[]>(streamUrl ? [] : live ? [] : lines);
  const [streaming, setStreaming] = useState<boolean>(Boolean(streamUrl) || (live && !streamUrl));
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- Real SSE mode ---
  useEffect(() => {
    if (!streamUrl) return;
    setShown([]);
    setStreaming(true);
    const es = new EventSource(streamUrl, { withCredentials: true });
    es.addEventListener("line", (e) => {
      const { line } = JSON.parse((e as MessageEvent).data);
      setShown((prev) => [...prev, line]);
    });
    es.addEventListener("done", (e) => {
      const { status, url } = JSON.parse((e as MessageEvent).data);
      setStreaming(false);
      es.close();
      onComplete?.(status, url);
    });
    es.onerror = () => {
      setStreaming(false);
      es.close();
    };
    return () => es.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamUrl]);

  // --- Simulated mode ---
  useEffect(() => {
    if (streamUrl) return;
    if (!live) {
      setShown(lines);
      return;
    }
    setShown([]);
    setStreaming(true);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(lines.slice(0, i));
      if (i >= lines.length) {
        clearInterval(id);
        setStreaming(false);
        onDone?.();
      }
    }, 80);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, live, streamUrl]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [shown]);

  return (
    <div
      dir="ltr"
      ref={scrollRef}
      className={cn(
        "terminal-scroll overflow-y-auto rounded-lg border border-border bg-[#070707] p-4 font-mono text-[12.5px] leading-relaxed text-[#c8c8c8]",
        className
      )}
    >
      {shown.map((line, i) => {
        const isError =
          line.toLowerCase().includes("error") || line.toLowerCase().includes("failed");
        const isOk =
          line.startsWith("✓") || line.includes("completed") || line.includes("successfully") || line.includes("Live at");
        return (
          <div key={i} className="flex gap-3 animate-fade-up">
            <span className="select-none text-[#3a3a3a]">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className={cn(isError && "text-failed", isOk && "text-ready")}>
              {line}
            </span>
          </div>
        );
      })}
      {streaming && (
        <div className="flex gap-3">
          <span className="select-none text-[#3a3a3a]">
            {String(shown.length + 1).padStart(2, "0")}
          </span>
          <span className="inline-block h-4 w-2 animate-pulse-soft bg-[#c8c8c8]" />
        </div>
      )}
    </div>
  );
}
