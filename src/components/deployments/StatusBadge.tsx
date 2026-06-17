"use client";

import { DeployStatus } from "@/lib/types";
import { useT } from "@/lib/store";
import { cn } from "@/lib/utils";

const styles: Record<DeployStatus, string> = {
  ready: "bg-ready/10 text-ready border-ready/30",
  building: "bg-building/10 text-building border-building/30",
  failed: "bg-failed/10 text-failed border-failed/30",
};

const dot: Record<DeployStatus, string> = {
  ready: "bg-ready",
  building: "bg-building animate-pulse-soft",
  failed: "bg-failed",
};

export function StatusBadge({ status }: { status: DeployStatus }) {
  const { t } = useT();
  const label =
    status === "ready"
      ? t("status.ready")
      : status === "building"
      ? t("status.building")
      : t("status.failed");

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        styles[status]
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dot[status])} />
      {label}
    </span>
  );
}
