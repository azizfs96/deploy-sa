"use client";

import { Globe, CheckCircle2, Plus } from "lucide-react";
import { Project } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/store";

export function DomainsTab({ project }: { project: Project }) {
  const { locale } = useT();
  const domains = [
    { name: project.domain, primary: true },
    { name: `www.${project.name.replace(/[^a-z0-9-]/gi, "")}.sa`, primary: false },
  ];
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder={locale === "ar" ? "example.sa" : "example.sa"}
            className="font-mono"
            dir="ltr"
          />
          <Button className="shrink-0 gap-1.5">
            <Plus className="h-4 w-4" />
            {locale === "ar" ? "إضافة نطاق" : "Add Domain"}
          </Button>
        </div>
      </Card>

      <Card className="divide-y divide-border">
        {domains.map((d) => (
          <div key={d.name} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-subtle" />
              <div>
                <p dir="ltr" className="text-start font-mono text-sm">{d.name}</p>
                {d.primary && (
                  <span className="text-xs text-primary">
                    {locale === "ar" ? "النطاق الأساسي" : "Primary"}
                  </span>
                )}
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs text-ready">
              <CheckCircle2 className="h-4 w-4" />
              {locale === "ar" ? "مُفعّل" : "Valid"}
            </span>
          </div>
        ))}
      </Card>
    </div>
  );
}
