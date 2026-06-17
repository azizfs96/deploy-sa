"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { useT } from "@/lib/store";

const bars = [42, 58, 35, 70, 64, 90, 76, 52, 88, 61, 95, 73, 80, 67];
const stats = [
  { labelAr: "الزيارات", labelEn: "Requests", value: "128.4K", delta: "+12%" },
  { labelAr: "نطاق التراسل", labelEn: "Bandwidth", value: "42.1 GB", delta: "+4%" },
  { labelAr: "زمن الاستجابة", labelEn: "Avg. Latency", value: "38 ms", delta: "-9%" },
  { labelAr: "نسبة النجاح", labelEn: "Success rate", value: "99.98%", delta: "+0.1%" },
];

export function AnalyticsTab() {
  const { locale } = useT();
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.labelEn} className="p-4">
            <p className="text-xs text-subtle">{locale === "ar" ? s.labelAr : s.labelEn}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{s.value}</p>
            <p className="mt-1 text-xs text-ready">{s.delta}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <p className="mb-4 text-sm font-semibold text-subtle">
          {locale === "ar" ? "الطلبات خلال 14 يوماً" : "Requests · last 14 days"}
        </p>
        <div dir="ltr" className="flex h-48 items-end gap-2">
          {bars.map((h, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${h}%` }}
              transition={{ delay: i * 0.04, type: "spring", stiffness: 200, damping: 22 }}
              className="flex-1 rounded-t bg-gradient-to-t from-primary/30 to-primary"
            />
          ))}
        </div>
      </Card>
    </div>
  );
}
