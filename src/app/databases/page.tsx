"use client";

import { Database } from "lucide-react";
import { ComingSoon } from "@/components/layout/ComingSoon";
import { useT } from "@/lib/store";

export default function Page() {
  const { t, locale } = useT();
  return (
    <ComingSoon
      icon={Database}
      title={t("nav.databases")}
      subtitle={locale === "ar" ? "قواعد بيانات PostgreSQL و Redis مُدارة — قريباً." : "Managed PostgreSQL & Redis — coming soon."}
    />
  );
}
