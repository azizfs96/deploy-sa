"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Terminal-style log stream. Lines appear one-by-one with an 80ms delay
 * via setInterval to simulate a live build stream.
 */
export function LogStream({
  lines,
  className,
  live = true,
  onDone,
}: {
  lines: string[];
  className?: string;
  live?: boolean;
  onDone?: () => void;
}) {
  const [shown, setShown] = useState(live ? 0 : lines.length);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!live) {
      setShown(lines.length);
      return;
    }
    setShown(0);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(i);
      if (i >= lines.length) {
        clearInterval(id);
        onDone?.();
      }
    }, 80);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, live]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [shown]);

  const visible = lines.slice(0, shown);
  const streaming = live && shown < lines.length;

  return (
    <div
      dir="ltr"
      ref={scrollRef}
      className={cn(
        "terminal-scroll overflow-y-auto rounded-lg border border-border bg-[#070707] p-4 font-mono text-[12.5px] leading-relaxed text-[#c8c8c8]",
        className
      )}
    >
      {visible.map((line, i) => {
        const isError =
          line.toLowerCase().includes("error") || line.includes("failed");
        const isOk = line.startsWith("✓") || line.includes("completed") || line.includes("successfully");
        return (
          <div key={i} className="flex gap-3 animate-fade-up">
            <span className="select-none text-[#3a3a3a]">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span
              className={cn(
                isError && "text-failed",
                isOk && "text-ready"
              )}
            >
              {line}
            </span>
          </div>
        );
      })}
      {streaming && (
        <div className="flex gap-3">
          <span className="select-none text-[#3a3a3a]">
            {String(shown + 1).padStart(2, "0")}
          </span>
          <span className="inline-block h-4 w-2 animate-pulse-soft bg-[#c8c8c8]" />
        </div>
      )}
    </div>
  );
}
