"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Plus, Trash2, Loader2, Ban } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { useT } from "@/lib/store";
import { cn } from "@/lib/utils";

type RuleType = "block_ip" | "block_path" | "block_country";
interface Rule {
  id: string;
  type: RuleType;
  value: string;
}

export function WafTab({ slug }: { slug: string }) {
  const { locale } = useT();
  const [enabled, setEnabled] = useState(false);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<RuleType>("block_ip");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    fetch(`/api/projects/${slug}/waf`)
      .then((r) => r.json())
      .then((d) => {
        setEnabled(Boolean(d.enabled));
        setRules(d.rules ?? []);
      })
      .finally(() => setLoading(false));
  };
  useEffect(load, [slug]);

  const toggle = async (v: boolean) => {
    setEnabled(v);
    await fetch(`/api/projects/${slug}/waf`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: v }),
    });
  };

  const addRule = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${slug}/waf/rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, value: value.trim() }),
      });
      if (!res.ok) throw new Error(locale === "ar" ? "قيمة غير صالحة" : "Invalid value");
      const d = await res.json();
      setRules(d.rules);
      setValue("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const removeRule = async (id: string) => {
    const res = await fetch(`/api/projects/${slug}/waf/rules/${id}`, { method: "DELETE" });
    const d = await res.json();
    setRules(d.rules ?? []);
  };

  const labels: Record<RuleType, { ar: string; en: string; ph: string }> = {
    block_ip: { ar: "حظر IP", en: "Block IP", ph: "203.0.113.5" },
    block_path: { ar: "حظر مسار", en: "Block path", ph: "/admin" },
    block_country: { ar: "حظر دولة", en: "Block country", ph: "RU" },
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-subtle">
        <Loader2 className="h-4 w-4 animate-spin" />
        {locale === "ar" ? "جاري التحميل..." : "Loading..."}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Status */}
      <Card className="flex items-center justify-between p-5">
        <div className="flex items-center gap-3">
          <span className={cn("grid h-10 w-10 place-items-center rounded-lg", enabled ? "bg-ready/15 text-ready" : "bg-muted text-subtle")}>
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold">
              {locale === "ar" ? "جدار الحماية (WAF)" : "Web Application Firewall"}
            </p>
            <p className="text-xs text-subtle">
              {locale === "ar"
                ? "حماية OWASP CRS ضد SQLi و XSS وغيرها — مع قواعدك الخاصة."
                : "OWASP CRS protection (SQLi, XSS…) plus your own rules."}
            </p>
          </div>
        </div>
        <Toggle checked={enabled} onChange={toggle} />
      </Card>

      {/* Core protection note */}
      <Card className="flex items-start gap-3 p-4 text-sm text-subtle">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span>
          {locale === "ar"
            ? "الحماية الأساسية (OWASP Core Rule Set) مُفعّلة ومُدارة من المنصّة. أنت تتحكّم في القواعد الإضافية لموقعك فقط."
            : "Core protection (OWASP CRS) is managed by the platform. You control only the additional rules for your site."}
        </span>
      </Card>

      {/* Add rule */}
      <Card className="p-5">
        <h3 className="mb-4 font-semibold">
          {locale === "ar" ? "قواعد الحظر الخاصة بموقعك" : "Your site's block rules"}
        </h3>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as RuleType)}
            className="h-10 rounded-lg border border-border bg-muted px-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:w-44"
          >
            {(Object.keys(labels) as RuleType[]).map((k) => (
              <option key={k} value={k}>{locale === "ar" ? labels[k].ar : labels[k].en}</option>
            ))}
          </select>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addRule()}
            placeholder={labels[type].ph}
            className="font-mono"
            dir="ltr"
          />
          <Button onClick={addRule} disabled={busy || !value.trim() || !enabled} className="shrink-0 gap-1.5">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {locale === "ar" ? "إضافة" : "Add"}
          </Button>
        </div>
        {!enabled && (
          <p className="mt-2 text-xs text-building">
            {locale === "ar" ? "فعّل WAF أولاً لتطبيق القواعد." : "Enable WAF first to apply rules."}
          </p>
        )}
        {error && <p className="mt-2 text-sm text-failed">{error}</p>}

        <div className="mt-4 divide-y divide-border">
          {rules.length === 0 ? (
            <p className="py-6 text-center text-sm text-subtle">
              {locale === "ar" ? "لا توجد قواعد بعد." : "No rules yet."}
            </p>
          ) : (
            rules.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Ban className="h-4 w-4 text-failed" />
                  <span className="text-sm">{locale === "ar" ? labels[r.type].ar : labels[r.type].en}</span>
                  <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs" dir="ltr">{r.value}</code>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeRule(r.id)} className="text-subtle hover:text-failed">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
