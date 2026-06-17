"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  Github,
  Lock,
  Globe,
  Check,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  GitBranch,
  Rocket,
  ExternalLink,
  PartyPopper,
  Loader2,
} from "lucide-react";
import { EnvVar, Framework, Project, Repo } from "@/lib/types";
import { useApp, useT } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FrameworkIcon, frameworkLabel } from "@/components/deployments/FrameworkIcon";
import { LogStream } from "@/components/deployments/LogStream";
import { timeAgo, cn } from "@/lib/utils";

const stepKeys = ["wizard.step1", "wizard.step2", "wizard.step3"] as const;

/** Repo shape returned by /api/github/repos (frontend Repo + defaultBranch). */
type WizardRepo = Repo & { defaultBranch?: string };

function defaultsFor(f: Framework) {
  if (f === "python")
    return { install: "pip install -r requirements.txt", build: "python build.py", out: "dist" };
  if (f === "static")
    return { install: "npm install", build: "npm run build", out: "out" };
  return { install: "npm install", build: "npm run build", out: ".next" };
}

export function NewProjectWizard() {
  const router = useRouter();
  const { t, locale, dir } = useT();
  const addProject = useApp((s) => s.addProject);

  const [step, setStep] = useState(0);
  const [query, setQuery] = useState("");
  const [repo, setRepo] = useState<WizardRepo | null>(null);
  const [branch, setBranch] = useState("main");
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [k, setK] = useState("");
  const [v, setV] = useState("");
  const [deployed, setDeployed] = useState(false);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [created, setCreated] = useState<{ slug: string; deploymentId: string | null } | null>(null);
  const [liveUrl, setLiveUrl] = useState<string | null>(null);

  const [repos, setRepos] = useState<WizardRepo[]>([]);
  const [reposLoading, setReposLoading] = useState(true);
  const [reposError, setReposError] = useState<string | null>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);

  // Fetch the authenticated user's real GitHub repositories.
  useEffect(() => {
    let cancelled = false;
    setReposLoading(true);
    fetch("/api/github/repos")
      .then(async (r) => {
        if (!r.ok) throw new Error(`(${r.status})`);
        return r.json();
      })
      .then((d) => {
        if (!cancelled) setRepos(d.repos ?? []);
      })
      .catch((e) => {
        if (!cancelled) setReposError(String(e.message ?? e));
      })
      .finally(() => {
        if (!cancelled) setReposLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch branches when a repo is selected and we move to configure.
  useEffect(() => {
    if (step !== 1 || !repo) return;
    let cancelled = false;
    setBranchesLoading(true);
    setBranch(repo.defaultBranch ?? "main");
    fetch(`/api/github/branches?repo=${encodeURIComponent(repo.fullName)}`)
      .then((r) => (r.ok ? r.json() : { branches: [] }))
      .then((d) => {
        if (!cancelled) setBranches(d.branches ?? []);
      })
      .catch(() => {
        if (!cancelled) setBranches([repo.defaultBranch ?? "main"]);
      })
      .finally(() => {
        if (!cancelled) setBranchesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [step, repo]);

  const filtered = useMemo(
    () =>
      repos.filter((r) => r.name.toLowerCase().includes(query.toLowerCase())),
    [query, repos]
  );

  const detected = repo?.framework;
  const cfg = detected ? defaultsFor(detected) : null;

  const Forward = dir === "rtl" ? ArrowLeft : ArrowRight;
  const Backward = dir === "rtl" ? ArrowRight : ArrowLeft;

  // Create the project (this kicks off the real Docker build on the agent),
  // then step 3 streams the agent's live logs over SSE.
  const startDeploy = async () => {
    if (!repo || !cfg) return;
    setStep(2);
    setDeployError(null);
    setCreated(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoFullName: repo.fullName,
          repoLanguage: repo.language,
          repoVisibility: repo.visibility,
          framework: repo.framework,
          branch,
          installCommand: cfg.install,
          buildCommand: cfg.build,
          outputDir: cfg.out,
          envVars: envVars.map(({ key, value }) => ({ key, value })),
        }),
      });
      if (!res.ok) throw new Error(`Deploy failed (${res.status})`);
      const { project } = (await res.json()) as { project: Project };
      addProject(project);
      setCreatedSlug(project.id);
      const dep = project.deployments[0];
      setCreated({ slug: project.id, deploymentId: dep?.id ?? null });
    } catch (e) {
      setDeployError((e as Error).message);
    }
  };

  // Fired when the agent's build stream ends.
  const onBuildComplete = (status: string, url: string | null) => {
    if (url) setLiveUrl(url);
    if (status === "ready") setDeployed(true);
    else setDeployError("Build failed — check the logs above.");
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Stepper */}
      <div className="mb-8 flex items-center">
        {stepKeys.map((key, i) => (
          <div key={key} className="flex flex-1 items-center last:flex-none">
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-full border text-sm font-semibold transition-colors",
                  i < step
                    ? "border-primary bg-primary text-primary-fg"
                    : i === step
                    ? "border-primary text-primary"
                    : "border-border text-subtle"
                )}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span
                className={cn(
                  "hidden text-sm font-medium sm:block",
                  i <= step ? "text-fg" : "text-subtle"
                )}
              >
                {t(key)}
              </span>
            </div>
            {i < stepKeys.length - 1 && (
              <div
                className={cn(
                  "mx-3 h-px flex-1 transition-colors",
                  i < step ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* STEP 1 — Connect GitHub */}
        {step === 0 && (
          <motion.div
            key="s1"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
          >
            <div className="relative mb-4">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
              <Input
                placeholder={t("wizard.searchRepos")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="ps-9"
              />
            </div>

            {reposLoading && (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-subtle">
                <Loader2 className="h-4 w-4 animate-spin" />
                {locale === "ar" ? "جلب مستودعاتك من GitHub..." : "Loading your GitHub repositories..."}
              </div>
            )}

            {reposError && !reposLoading && (
              <div className="rounded-lg border border-failed/30 bg-failed/10 p-4 text-sm text-failed">
                {locale === "ar"
                  ? "تعذّر جلب المستودعات. تأكّد من تسجيل الدخول عبر GitHub."
                  : "Couldn't load repositories. Make sure you're signed in with GitHub."}{" "}
                <span dir="ltr" className="font-mono text-xs opacity-70">{reposError}</span>
              </div>
            )}

            {!reposLoading && !reposError && filtered.length === 0 && (
              <div className="py-12 text-center text-sm text-subtle">
                {locale === "ar" ? "لا توجد مستودعات مطابقة." : "No matching repositories."}
              </div>
            )}

            <div className="space-y-2">
              {filtered.map((r) => {
                const selected = repo?.id === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setRepo(r)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-lg border p-3.5 text-start transition-colors",
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40 hover:bg-muted"
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Github className="h-5 w-5 shrink-0 text-subtle" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium" dir="ltr">{r.name}</span>
                          <span className="inline-flex items-center gap-1 rounded-full border border-border px-1.5 py-0.5 text-[10px] text-subtle">
                            {r.visibility === "private" ? (
                              <Lock className="h-2.5 w-2.5" />
                            ) : (
                              <Globe className="h-2.5 w-2.5" />
                            )}
                            {r.visibility === "private" ? t("common.private") : t("common.public")}
                          </span>
                        </div>
                        <p className="text-xs text-subtle">
                          {r.language} · {timeAgo(r.updatedAt, locale)}
                        </p>
                      </div>
                    </div>
                    {selected ? (
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-fg">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    ) : (
                      <span className="text-xs text-primary">{t("wizard.import")}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex justify-end">
              <Button disabled={!repo} onClick={() => setStep(1)} className="gap-2">
                {t("wizard.continue")}
                <Forward className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* STEP 2 — Configure */}
        {step === 1 && repo && cfg && (
          <motion.div
            key="s2"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            className="space-y-5"
          >
            <Card className="flex items-center gap-3 p-4">
              <FrameworkIcon framework={repo.framework} />
              <div>
                <p className="text-xs text-subtle">{t("wizard.detected")}</p>
                <p className="font-semibold">{frameworkLabel(repo.framework)}</p>
              </div>
              <span className="ms-auto inline-flex items-center gap-1.5 text-xs text-ready">
                <Check className="h-4 w-4" /> auto
              </span>
            </Card>

            {/* Branch selector */}
            <div>
              <span className="mb-1.5 block text-xs font-medium text-subtle">
                {t("common.branch")}
              </span>
              {branchesLoading ? (
                <span className="inline-flex items-center gap-2 text-sm text-subtle">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {locale === "ar" ? "جلب الفروع..." : "Loading branches..."}
                </span>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(branches.length ? branches : [branch]).map((b) => (
                    <button
                      key={b}
                      onClick={() => setBranch(b)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors",
                        branch === b
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-subtle hover:bg-muted"
                      )}
                    >
                      <GitBranch className="h-3.5 w-3.5" /> {b}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Build config preview */}
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                [t("set.installCmd"), cfg.install],
                [t("set.buildCmd"), cfg.build],
                [t("set.outputDir"), cfg.out],
              ].map(([label, val]) => (
                <div key={label}>
                  <span className="mb-1.5 block text-xs font-medium text-subtle">{label}</span>
                  <Input defaultValue={val} className="font-mono text-xs" dir="ltr" />
                </div>
              ))}
            </div>

            {/* Env vars */}
            <div>
              <span className="mb-1.5 block text-xs font-medium text-subtle">{t("set.env")}</span>
              {envVars.length > 0 && (
                <div className="mb-2 space-y-2">
                  {envVars.map((e) => (
                    <div key={e.id} className="flex items-center gap-2">
                      <Input value={e.key} readOnly className="font-mono sm:max-w-[40%]" />
                      <Input value={e.value} readOnly className="font-mono" />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEnvVars((x) => x.filter((y) => y.id !== e.id))}
                        className="shrink-0 text-subtle hover:text-failed"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  placeholder="KEY"
                  value={k}
                  onChange={(e) => setK(e.target.value)}
                  className="font-mono sm:max-w-[40%]"
                />
                <Input
                  placeholder="value"
                  value={v}
                  onChange={(e) => setV(e.target.value)}
                  className="font-mono"
                />
                <Button
                  variant="secondary"
                  className="shrink-0 gap-1.5"
                  onClick={() => {
                    if (!k.trim()) return;
                    setEnvVars((x) => [
                      ...x,
                      { id: `e_${Date.now()}`, key: k.toUpperCase(), value: v },
                    ]);
                    setK("");
                    setV("");
                  }}
                >
                  <Plus className="h-4 w-4" /> {t("set.addVar")}
                </Button>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(0)} className="gap-2">
                <Backward className="h-4 w-4" /> {t("wizard.back")}
              </Button>
              <Button onClick={startDeploy} className="gap-2">
                <Rocket className="h-4 w-4" /> {t("wizard.deployBtn")}
              </Button>
            </div>
          </motion.div>
        )}

        {/* STEP 3 — Deploy */}
        {step === 2 && repo && (
          <motion.div
            key="s3"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
          >
            {!deployed ? (
              <Card className="p-6">
                <div className="mb-4 flex items-center gap-2 text-sm font-medium">
                  <span className="h-2 w-2 animate-pulse-soft rounded-full bg-building" />
                  {t("wizard.deploying")}
                </div>
                {created?.deploymentId ? (
                  <LogStream
                    streamUrl={`/api/projects/${created.slug}/deployments/${created.deploymentId}/logs`}
                    onComplete={onBuildComplete}
                    className="h-80"
                  />
                ) : (
                  <div className="flex h-80 items-center justify-center rounded-lg border border-border bg-[#070707] font-mono text-sm text-subtle">
                    {locale === "ar" ? "جاري بدء البناء..." : "Starting build..."}
                  </div>
                )}
                {deployError && (
                  <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-failed/30 bg-failed/10 p-3 text-sm text-failed">
                    <span>
                      {locale === "ar" ? "فشل النشر: " : "Deploy failed: "}
                      <span dir="ltr" className="font-mono text-xs">{deployError}</span>
                    </span>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => router.push(`/projects/${createdSlug ?? repo.name}`)}
                    >
                      {locale === "ar" ? "فتح المشروع" : "Open project"}
                    </Button>
                  </div>
                )}
              </Card>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Card className="glow relative overflow-hidden p-8 text-center">
                  <div className="grid-bg pointer-events-none absolute inset-0 opacity-30" />
                  <div className="relative">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 260, damping: 18 }}
                      className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-ready/15 text-ready"
                    >
                      <PartyPopper className="h-8 w-8" />
                    </motion.div>
                    <h2 className="mt-5 text-xl font-bold">{t("wizard.success")}</h2>
                    <p className="mt-1.5 text-sm text-subtle">{t("wizard.successDesc")}</p>

                    {(() => {
                      const url = liveUrl ?? `https://${createdSlug ?? repo.name}.deploy.sa`;
                      const label = url.replace(/^https?:\/\//, "");
                      return (
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-5 inline-flex items-center gap-2 rounded-lg border border-border bg-muted px-4 py-2.5 font-mono text-sm transition-colors hover:border-primary/40"
                          dir="ltr"
                        >
                          <ExternalLink className="h-4 w-4 text-primary" />
                          {label}
                        </a>
                      );
                    })()}

                    <div className="mt-6 flex justify-center gap-2">
                      <Button onClick={() => router.push(`/projects/${createdSlug ?? repo.name}`)}>
                        {t("wizard.continue")}
                      </Button>
                      <Button variant="outline" onClick={() => router.push("/dashboard")}>
                        {t("wizard.goDash")}
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
