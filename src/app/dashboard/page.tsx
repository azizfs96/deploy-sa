"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { NewProjectHero } from "@/components/dashboard/NewProjectHero";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { useApp, useT } from "@/lib/store";

export default function DashboardPage() {
  const projects = useApp((s) => s.projects);
  const projectsLoaded = useApp((s) => s.projectsLoaded);
  const { t, locale } = useT();

  return (
    <DashboardShell>
      <div className="space-y-8">
        <NewProjectHero />

        <section>
          <h2 className="mb-4 text-lg font-semibold">{t("dash.recent")}</h2>
          {!projectsLoaded ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-40 animate-pulse rounded-xl border border-border bg-card"
                />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-subtle">
              {locale === "ar"
                ? "لا توجد مشاريع بعد — ابدأ باستيراد مستودع من GitHub."
                : "No projects yet — import a GitHub repo to get started."}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p, i) => (
                <ProjectCard key={p.id} project={p} index={i} />
              ))}
            </div>
          )}
        </section>

        <section>
          <ActivityFeed />
        </section>
      </div>
    </DashboardShell>
  );
}
