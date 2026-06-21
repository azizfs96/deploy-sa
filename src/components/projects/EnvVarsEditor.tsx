"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Trash2, Plus, Loader2, Check } from "lucide-react";
import { EnvVar } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/store";

export function EnvVarsEditor({ slug, initial }: { slug: string; initial: EnvVar[] }) {
  const { t, locale } = useT();
  const [vars, setVars] = useState<EnvVar[]>(initial);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [draftKey, setDraftKey] = useState("");
  const [draftVal, setDraftVal] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load the authoritative list from the server on mount.
  useEffect(() => {
    fetch(`/api/projects/${slug}/env`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setVars(d.envVars))
      .catch(() => {});
  }, [slug]);

  const flashSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const add = async () => {
    if (!draftKey.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${slug}/env`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: draftKey.trim().toUpperCase(), value: draftVal }),
      });
      if (res.ok) {
        const d = await res.json();
        setVars(d.envVars);
        setDraftKey("");
        setDraftVal("");
        flashSaved();
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/projects/${slug}/env/${id}`, { method: "DELETE" });
    if (res.ok) {
      const d = await res.json();
      setVars(d.envVars);
    }
  };

  const toggle = (id: string) => setRevealed((r) => ({ ...r, [id]: !r[id] }));

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{t("set.env")}</h3>
        {saved && (
          <span className="inline-flex items-center gap-1 text-xs text-ready">
            <Check className="h-3.5 w-3.5" />
            {locale === "ar" ? "تم الحفظ" : "Saved"}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-subtle">{t("set.envDesc")}</p>

      <div className="mt-4 space-y-2">
        {vars.map((v) => (
          <div key={v.id} className="flex items-center gap-2">
            <Input value={v.key} readOnly className="font-mono sm:max-w-[40%]" />
            <div className="relative flex-1">
              <Input
                value={revealed[v.id] ? v.value : "•".repeat(Math.min(v.value.length, 24))}
                readOnly
                className="pe-10 font-mono"
              />
              <button
                onClick={() => toggle(v.id)}
                className="absolute end-2 top-1/2 -translate-y-1/2 text-subtle hover:text-fg"
              >
                {revealed[v.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => remove(v.id)}
              className="shrink-0 text-subtle hover:text-failed"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {vars.length === 0 && (
          <p className="py-2 text-center text-xs text-subtle">
            {locale === "ar" ? "لا متغيّرات بعد." : "No variables yet."}
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row">
        <Input
          placeholder="KEY"
          value={draftKey}
          onChange={(e) => setDraftKey(e.target.value)}
          className="font-mono sm:max-w-[40%]"
        />
        <Input
          placeholder="value"
          value={draftVal}
          onChange={(e) => setDraftVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          className="font-mono"
        />
        <Button onClick={add} disabled={busy} variant="secondary" className="shrink-0 gap-1.5">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {t("set.addVar")}
        </Button>
      </div>

      <p className="mt-3 text-xs text-subtle">
        {locale === "ar"
          ? "تُطبَّق المتغيّرات عند إعادة النشر التالية."
          : "Variables apply on the next redeploy."}
      </p>
    </Card>
  );
}
