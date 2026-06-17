"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { NewProjectWizard } from "@/components/projects/NewProjectWizard";
import { useT } from "@/lib/store";

export default function NewProjectPage() {
  const { t } = useT();
  return (
    <DashboardShell>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{t("wizard.title")}</h1>
        <p className="mt-1 text-sm text-subtle">{t("dash.newProjectDesc")}</p>
      </div>
      <NewProjectWizard />
    </DashboardShell>
  );
}
