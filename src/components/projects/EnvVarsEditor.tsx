"use client";

import { useState } from "react";
import { Eye, EyeOff, Trash2, Plus } from "lucide-react";
import { EnvVar } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/store";

export function EnvVarsEditor({ initial }: { initial: EnvVar[] }) {
  const { t } = useT();
  const [vars, setVars] = useState<EnvVar[]>(initial);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [draftKey, setDraftKey] = useState("");
  const [draftVal, setDraftVal] = useState("");

  const add = () => {
    if (!draftKey.trim()) return;
    setVars((v) => [
      ...v,
      { id: `e_${Date.now()}`, key: draftKey.trim().toUpperCase(), value: draftVal },
    ]);
    setDraftKey("");
    setDraftVal("");
  };

  const remove = (id: string) => setVars((v) => v.filter((x) => x.id !== id));
  const toggle = (id: string) => setRevealed((r) => ({ ...r, [id]: !r[id] }));

  return (
    <Card className="p-5">
      <h3 className="font-semibold">{t("set.env")}</h3>
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
        <Button onClick={add} variant="secondary" className="shrink-0 gap-1.5">
          <Plus className="h-4 w-4" />
          {t("set.addVar")}
        </Button>
      </div>
    </Card>
  );
}
