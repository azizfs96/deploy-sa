"use client";

import { Settings } from "lucide-react";
import { ComingSoon } from "@/components/layout/ComingSoon";
import { useT } from "@/lib/store";

export default function Page() {
  const { t, locale } = useT();
  return (
    <ComingSoon
      icon={Settings}
      title={t("nav.settings")}
      subtitle={locale === "ar" ? "إعدادات الحساب والفريق والفوترة — قريباً." : "Account, team & billing settings — coming soon."}
    />
  );
}
