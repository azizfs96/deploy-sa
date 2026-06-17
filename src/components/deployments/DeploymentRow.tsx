"use client";

import { GitBranch } from "lucide-react";
import { Deployment } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "./StatusBadge";
import { useT } from "@/lib/store";
import { cn, formatDuration, timeAgo } from "@/lib/utils";

export function DeploymentRow({
  deployment,
  active,
  onClick,
}: {
  deployment: Deployment;
  active?: boolean;
  onClick?: () => void;
}) {
  const { locale } = useT();
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-start transition-colors last:border-b-0 hover:bg-muted",
        active && "bg-muted"
      )}
    >
      <StatusBadge status={deployment.status} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">
            {deployment.commitMessage}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-subtle">
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-fg">
            {deployment.commitHash.slice(0, 7)}
          </code>
          <span className="inline-flex items-center gap-1">
            <GitBranch className="h-3 w-3" />
            {deployment.branch}
          </span>
        </div>
      </div>

      <div className="hidden items-center gap-2 text-xs text-subtle sm:flex">
        <Avatar src={deployment.author.avatar} alt={deployment.author.name} size={22} />
        <span className="hidden md:inline">{deployment.author.username}</span>
      </div>

      <div className="w-14 shrink-0 text-end text-xs tabular-nums text-subtle">
        {formatDuration(deployment.durationSec)}
      </div>
      <div className="hidden w-24 shrink-0 text-end text-xs text-subtle lg:block">
        {timeAgo(deployment.createdAt, locale)}
      </div>
    </button>
  );
}
