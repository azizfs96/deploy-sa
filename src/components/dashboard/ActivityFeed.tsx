"use client";

import Link from "next/link";
import { GitCommit } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/deployments/StatusBadge";
import { useApp, useT } from "@/lib/store";
import { timeAgo } from "@/lib/utils";

export function ActivityFeed() {
  const { t, locale } = useT();
  const projects = useApp((s) => s.projects);

  // Latest 5 deployments across all of the user's projects.
  const items = projects
    .flatMap((p) => p.deployments.map((d) => ({ ...d, project: p })))
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 5);

  if (items.length === 0) return null;

  return (
    <Card className="p-5">
      <h2 className="mb-4 text-sm font-semibold text-subtle">{t("dash.activity")}</h2>
      <ul className="space-y-1">
        {items.map((d) => (
          <li key={d.id}>
            <Link
              href={`/projects/${d.project.id}`}
              className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted"
            >
              <Avatar src={d.author.avatar} alt={d.author.name} size={28} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{d.commitMessage}</p>
                <p className="flex items-center gap-2 text-xs text-subtle">
                  <span className="font-mono text-primary">{d.project.name}</span>
                  <span className="inline-flex items-center gap-1">
                    <GitCommit className="h-3 w-3" />
                    {d.branch}
                  </span>
                  <span>· {timeAgo(d.createdAt, locale)}</span>
                </p>
              </div>
              <StatusBadge status={d.status} />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
