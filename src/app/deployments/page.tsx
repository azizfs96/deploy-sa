"use client";

import { Rocket } from "lucide-react";
import { ComingSoon } from "@/components/layout/ComingSoon";
import { useT } from "@/lib/store";

export default function Page() {
  const { t, locale } = useT();
  return (
    <ComingSoon
      icon={Rocket}
      title={t("nav.deployments")}
      subtitle={locale === "ar" ? "سجلّ النشر الموحّد لجميع المشاريع — قريباً." : "Unified deployment history across projects — coming soon."}
    />
  );
}
