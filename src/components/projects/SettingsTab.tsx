"use client";

import { useState } from "react";
import { Github, GitBranch, CheckCircle2, Webhook } from "lucide-react";
import { Project } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { EnvVarsEditor } from "./EnvVarsEditor";
import { useT } from "@/lib/store";

function Field({ label, value }: { label: string; value: string }) {
  const [v, setV] = useState(value);
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-subtle">{label}</span>
      <Input value={v} onChange={(e) => setV(e.target.value)} className="font-mono" />
    </label>
  );
}

export function SettingsTab({ project }: { project: Project }) {
  const { t } = useT();
  const [autoDeploy, setAutoDeploy] = useState(project.autoDeploy);

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
            <Toggle checked={autoDeploy} onChange={setAutoDeploy} />
          </div>
        </div>
      </Card>

      {/* Env vars */}
      <EnvVarsEditor slug={project.id} initial={project.envVars} />

      {/* Build settings */}
      <Card className="p-5">
        <h3 className="font-semibold">{t("set.build")}</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label={t("set.installCmd")} value={project.installCommand} />
          <Field label={t("set.buildCmd")} value={project.buildCommand} />
          <Field label={t("set.outputDir")} value={project.outputDir} />
        </div>
        <div className="mt-4 flex justify-end">
          <Button>{t("set.save")}</Button>
        </div>
      </Card>
    </div>
  );
}
