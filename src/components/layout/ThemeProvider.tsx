"use client";

import { useEffect } from "react";
import { usePrefs } from "@/lib/store";

/**
 * Applies persisted theme + locale to <html> on the client.
 * Keeps `class` (dark/light), `lang`, and `dir` in sync with the store.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = usePrefs((s) => s.theme);
  const locale = usePrefs((s) => s.locale);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("light", theme === "light");
    root.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  return <>{children}</>;
}
