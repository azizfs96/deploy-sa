"use client";

import { Globe } from "lucide-react";
import { ComingSoon } from "@/components/layout/ComingSoon";
import { useT } from "@/lib/store";

export default function Page() {
  const { t, locale } = useT();
  return (
    <ComingSoon
      icon={Globe}
      title={t("nav.domains")}
      subtitle={locale === "ar" ? "إدارة النطاقات وشهادات SSL — قريباً." : "Domain & SSL management — coming soon."}
    />
  );
}
