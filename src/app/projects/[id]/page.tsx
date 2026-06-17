"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ExternalLink, RotateCw } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FrameworkIcon } from "@/components/deployments/FrameworkIcon";
import { StatusBadge } from "@/components/deployments/StatusBadge";
import { DeploymentRow } from "@/components/deployments/DeploymentRow";
import { DeploymentPanel } from "@/components/deployments/DeploymentPanel";
import { LogStream } from "@/components/deployments/LogStream";
import { SettingsTab } from "@/components/projects/SettingsTab";
import { AnalyticsTab } from "@/components/projects/AnalyticsTab";
import { DomainsTab } from "@/components/projects/DomainsTab";
import { useApp, useT } from "@/lib/store";
import { TKey } from "@/lib/i18n";
import { Deployment } from "@/lib/types";
import { cn } from "@/lib/utils";

const tabs: { id: string; key: TKey }[] = [
  { id: "deployments", key: "tab.deployments" },
  { id: "settings", key: "tab.settings" },
  { id: "logs", key: "tab.logs" },
  { id: "analytics", key: "tab.analytics" },
  { id: "domains", key: "tab.domains" },
];

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const { t, dir, locale } = useT();
  const project = useApp((s) => s.projects.find((p) => p.id === id));
  const projectsLoaded = useApp((s) => s.projectsLoaded);
  const [tab, setTab] = useState("deployments");
  const [open, setOpen] = useState<Deployment | null>(null);
  const [redeploying, setRedeploying] = useState(false);

  const latest = useMemo(() => project?.deployments[0], [project]);

  // Projects hydrate asynchronously inside DashboardShell, so show a loader
  // until the store has loaded before deciding the project is missing.
  if (!project) {
    return (
      <DashboardShell>
        {projectsLoaded ? (
          <div className="py-24 text-center text-subtle">
            {locale === "ar" ? "المشروع غير موجود." : "Project not found."}
          </div>
        ) : (
          <div className="py-24 text-center text-subtle">
            {locale === "ar" ? "جاري التحميل..." : "Loading..."}
          </div>
        )}
      </DashboardShell>
    );
  }

  const redeploy = async () => {
    setRedeploying(true);
    // Optimistically open a streaming "building" panel.
    setOpen({ ...project.deployments[0], status: "building", id: "redeploy_tmp" });
    try {
      await fetch(`/api/projects/${project.id}/deployments`, { method: "POST" });
    } finally {
      setTimeout(() => setRedeploying(false), 2000);
    }
  };

  return (
    <DashboardShell>
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <FrameworkIcon framework={project.framework} />
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold">{project.name}</h1>
              <StatusBadge status={project.status} />
            </div>
            <p className="text-xs text-subtle">{project.repo.fullName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href={`https://${project.domain}`} target="_blank" rel="noreferrer">
            <Button variant="outline" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              {t("proj.visit")}
            </Button>
          </a>
          <Button onClick={redeploy} disabled={redeploying} className="gap-2">
            <RotateCw className={cn("h-4 w-4", redeploying && "animate-spin")} />
            {t("proj.redeploy")}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="relative mt-4 flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={cn(
              "relative whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors",
              tab === tb.id ? "text-fg" : "text-subtle hover:text-fg"
            )}
          >
            {t(tb.key)}
            {tab === tb.id && (
              <motion.span
                layoutId="tab-underline"
                className="absolute inset-x-0 -bottom-px h-0.5 bg-primary"
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="py-6">
        {tab === "deployments" && (
          <Card className="overflow-hidden">
            {project.deployments.map((d) => (
              <DeploymentRow
                key={d.id}
                deployment={d}
                active={open?.id === d.id}
                onClick={() => setOpen(d)}
              />
            ))}
          </Card>
        )}

        {tab === "settings" && <SettingsTab project={project} />}

        {tab === "logs" && latest && (
          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-subtle">
              {t("logs.title")} · <code className="font-mono text-xs">{latest.commitHash.slice(0, 7)}</code>
            </div>
            <LogStream lines={latest.logs} live={false} className="h-[60vh]" />
          </Card>
        )}

        {tab === "analytics" && <AnalyticsTab />}
        {tab === "domains" && <DomainsTab project={project} />}
      </div>

      <DeploymentPanel deployment={open} onClose={() => setOpen(null)} />
      <span className="sr-only">{dir}</span>
    </DashboardShell>
  );
}
