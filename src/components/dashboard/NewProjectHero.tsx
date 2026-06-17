"use client";

import Link from "next/link";
import { Github, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/store";

export function NewProjectHero() {
  const { t, dir } = useT();
  return (
    <Card className="glow relative overflow-hidden p-6 md:p-8">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative flex flex-col items-start justify-between gap-5 md:flex-row md:items-center">
        <div className="max-w-xl">
          <h2 className="text-xl font-bold md:text-2xl">{t("dash.newProject")}</h2>
          <p className="mt-2 text-sm text-subtle">{t("dash.newProjectDesc")}</p>
        </div>
        <Link href="/new">
          <Button size="lg" className="gap-2">
            <Github className="h-5 w-5" />
            {t("dash.connectRepo")}
            <ArrowRight className={dir === "rtl" ? "h-4 w-4 rotate-180" : "h-4 w-4"} />
          </Button>
        </Link>
      </div>
    </Card>
  );
}
