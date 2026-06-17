"use client";

import { LucideIcon } from "lucide-react";
import { DashboardShell } from "./DashboardShell";

export function ComingSoon({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}) {
  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>
      <div className="grid place-items-center rounded-xl border border-dashed border-border py-24 text-center">
        <Icon className="mb-4 h-10 w-10 text-subtle" />
        <p className="text-subtle">{subtitle}</p>
      </div>
    </DashboardShell>
  );
}
