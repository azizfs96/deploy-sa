"use client";

import { useEffect, useState } from "react";
import {
  Database as DbIcon,
  Plus,
  Eye,
  EyeOff,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useApp, useT } from "@/lib/store";
import { cn } from "@/lib/utils";

interface Db {
  id: string;
  name: string;
  engine: "postgres" | "mysql";
  host: string;
  port: number;
  username: string;
  password: string;
  dbName: string;
  url: string;
  status: string;
  project?: { slug: string; name: string } | null;
}

function CopyField({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  const [revealed, setRevealed] = useState(!secret);
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <div>
      <span className="mb-1 block text-[11px] font-medium text-subtle">{label}</span>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-md border border-border bg-muted px-2 py-1.5 font-mono text-xs" dir="ltr">
          {revealed ? value : "•".repeat(Math.min(value.length, 24))}
        </code>
        {secret && (
          <button onClick={() => setRevealed((v) => !v)} className="text-subtle hover:text-fg">
            {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
        <button onClick={copy} className="text-subtle hover:text-fg">
          {copied ? <Check className="h-4 w-4 text-ready" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export default function DatabasesPage() {
  const { t, locale } = useT();
  const projects = useApp((s) => s.projects);
  const [databases, setDatabases] = useState<Db[]>([]);
  const [adminerUrl, setAdminerUrl] = useState<string>("");
  const [pipelineOn, setPipelineOn] = useState(true);
  const [loading, setLoading] = useState(true);

  const [engine, setEngine] = useState<"postgres" | "mysql">("postgres");
  const [name, setName] = useState("");
  const [projectSlug, setProjectSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    fetch("/api/databases")
      .then((r) => r.json())
      .then((d) => {
        setDatabases(d.databases ?? []);
        setAdminerUrl(d.adminerUrl ?? "");
        setPipelineOn(d.pipelineEnabled ?? false);
      })
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const create = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/databases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ engine, name: name || "appdb", projectSlug: projectSlug || undefined }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `Failed (${res.status})`);
      }
      setName("");
      setProjectSlug("");
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm(locale === "ar" ? "حذف قاعدة البيانات وكل بياناتها نهائياً؟" : "Delete this database and all its data?")) return;
    await fetch(`/api/databases/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t("nav.databases")}</h1>
        <p className="mt-1 text-sm text-subtle">
          {locale === "ar"
            ? "قواعد بيانات مُدارة على بنيتك التحتية — تُحقن في مشروعك تلقائياً."
            : "Managed databases on your own infrastructure — auto-injected into your project."}
        </p>
      </div>

      {!pipelineOn && (
        <Card className="mb-6 border-building/30 bg-building/10 p-4 text-sm text-building">
          {locale === "ar"
            ? "خط النشر غير مُهيّأ (AGENT_URL). قواعد البيانات المُدارة تتطلّب الـ build agent."
            : "Deployment pipeline not configured (AGENT_URL). Managed databases require the build agent."}
        </Card>
      )}

      {/* Create */}
      <Card className="mb-6 p-5">
        <h2 className="mb-4 font-semibold">
          {locale === "ar" ? "إنشاء قاعدة بيانات" : "Create a database"}
        </h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <span className="mb-1.5 block text-xs font-medium text-subtle">
              {locale === "ar" ? "المحرّك" : "Engine"}
            </span>
            <div className="flex gap-2">
              {(["postgres", "mysql"] as const).map((e) => (
                <button
                  key={e}
                  onClick={() => setEngine(e)}
                  className={cn(
                    "flex-1 rounded-lg border px-3 py-2 text-sm transition-colors",
                    engine === e ? "border-primary bg-primary/10 text-primary" : "border-border text-subtle hover:bg-muted"
                  )}
                >
                  {e === "postgres" ? "PostgreSQL" : "MySQL"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="mb-1.5 block text-xs font-medium text-subtle">
              {locale === "ar" ? "الاسم" : "Name"}
            </span>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="appdb" className="font-mono" dir="ltr" />
          </div>
          <div>
            <span className="mb-1.5 block text-xs font-medium text-subtle">
              {locale === "ar" ? "اربط بمشروع (اختياري)" : "Link to project (optional)"}
            </span>
            <select
              value={projectSlug}
              onChange={(e) => setProjectSlug(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-muted px-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <option value="">—</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button onClick={create} disabled={creating || !pipelineOn} className="w-full gap-1.5">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {locale === "ar" ? "إنشاء" : "Create"}
            </Button>
          </div>
        </div>
        {projectSlug && (
          <p className="mt-2 text-xs text-subtle">
            {locale === "ar"
              ? "سيُحقن DATABASE_URL تلقائياً في هذا المشروع (يسري عند النشر التالي)."
              : "DATABASE_URL will be auto-injected into this project (applies on next deploy)."}
          </p>
        )}
        {error && <p className="mt-2 text-sm text-failed" dir="ltr">{error}</p>}
      </Card>

      {/* List */}
      {loading ? (
        <div className="flex items-center gap-2 py-12 text-sm text-subtle">
          <Loader2 className="h-4 w-4 animate-spin" />
          {locale === "ar" ? "جاري التحميل..." : "Loading..."}
        </div>
      ) : databases.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-subtle">
          {locale === "ar" ? "لا توجد قواعد بيانات بعد." : "No databases yet."}
        </div>
      ) : (
        <div className="space-y-4">
          {databases.map((db) => (
            <Card key={db.id} className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={cn("grid h-9 w-9 place-items-center rounded-md text-white", db.engine === "mysql" ? "bg-[#00758F]" : "bg-[#336791]")}>
                    <DbIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold">{db.name}</p>
                    <p className="text-xs text-subtle">
                      {db.engine === "mysql" ? "MySQL 8" : "PostgreSQL 16"}
                      {db.project && <> · <span className="text-primary">{db.project.name}</span></>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {adminerUrl && (
                    <a href={adminerUrl} target="_blank" rel="noreferrer">
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <ExternalLink className="h-3.5 w-3.5" />
                        {locale === "ar" ? "إدارة" : "Manage"}
                      </Button>
                    </a>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => remove(db.id)} className="text-subtle hover:text-failed">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <CopyField label={locale === "ar" ? "المضيف (Host)" : "Host"} value={db.host} />
                <CopyField label="Port" value={String(db.port)} />
                <CopyField label={locale === "ar" ? "المستخدم" : "Username"} value={db.username} />
                <CopyField label={locale === "ar" ? "كلمة المرور" : "Password"} value={db.password} secret />
                <CopyField label={locale === "ar" ? "اسم القاعدة" : "Database"} value={db.dbName} />
                <CopyField label="Connection URL" value={db.url} secret />
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
