"use client";

import { useState } from "react";
import { Github, GitBranch, CheckCircle2, Webhook, Loader2, Check } from "lucide-react";
import { Project } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { EnvVarsEditor } from "./EnvVarsEditor";
import { useT } from "@/lib/store";

export function SettingsTab({ project }: { project: Project }) {
  const { t, locale } = useT();
  const [autoDeploy, setAutoDeploy] = useState(project.autoDeploy);
  const [installCommand, setInstall] = useState(project.installCommand);
  const [buildCommand, setBuild] = useState(project.buildCommand);
  const [outputDir, setOutput] = useState(project.outputDir);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const patch = async (data: Record<string, unknown>) => {
    await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  };

  const toggleAuto = (v: boolean) => {
    setAutoDeploy(v);
    patch({ autoDeploy: v });
  };

  const saveBuild = async () => {
    setSaving(true);
    try {
      await patch({ installCommand, buildCommand, outputDir });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Repo connection */}
      <Card className="p-5">
        <h3 className="font-semibold">{t("set.repo")}</h3>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-muted p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#161616] text-white">
              <Github className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-medium">{project.repo.fullName}</p>
              <p className="flex items-center gap-2 text-xs text-subtle">
                <span className="inline-flex items-center gap-1">
                  <GitBranch className="h-3 w-3" /> {project.branch}
                </span>
                <span>·</span>
                <span>{project.repo.language}</span>
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs text-ready">
            <CheckCircle2 className="h-4 w-4" /> {t("set.active")}
          </span>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <span className="flex items-center gap-2 text-sm">
              <Webhook className="h-4 w-4 text-subtle" /> {t("set.webhook")}
            </span>
            <span className={project.webhookActive ? "text-xs text-ready" : "text-xs text-subtle"}>
              {project.webhookActive ? t("set.active") : t("set.inactive")}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <span className="text-sm">
              {t("set.autoDeploy")} <code className="text-xs text-subtle">({project.branch})</code>
            </span>
            <Toggle checked={autoDeploy} onChange={toggleAuto} />
          </div>
        </div>
      </Card>

      {/* Env vars */}
      <EnvVarsEditor slug={project.id} initial={project.envVars} />

      {/* Build settings */}
      <Card className="p-5">
        <h3 className="font-semibold">{t("set.build")}</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-subtle">{t("set.installCmd")}</span>
            <Input value={installCommand} onChange={(e) => setInstall(e.target.value)} className="font-mono" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-subtle">{t("set.buildCmd")}</span>
            <Input value={buildCommand} onChange={(e) => setBuild(e.target.value)} className="font-mono" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-subtle">{t("set.outputDir")}</span>
            <Input value={outputDir} onChange={(e) => setOutput(e.target.value)} className="font-mono" />
          </label>
        </div>
        <div className="mt-4 flex items-center justify-end gap-3">
          {saved && (
            <span className="inline-flex items-center gap-1 text-xs text-ready">
              <Check className="h-3.5 w-3.5" />
              {locale === "ar" ? "تم الحفظ" : "Saved"}
            </span>
          )}
          <Button onClick={saveBuild} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("set.save")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
