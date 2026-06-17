"use client";

import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import { Github, Sun, Moon, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/Logo";
import { usePrefs, useT } from "@/lib/store";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  );
}

export default function LoginPage() {
  const { t, dir } = useT();
  const theme = usePrefs((s) => s.theme);
  const toggleTheme = usePrefs((s) => s.toggleTheme);
  const toggleLocale = usePrefs((s) => s.toggleLocale);
  const locale = usePrefs((s) => s.locale);

  const enter = () => signIn("github", { callbackUrl: "/dashboard" });

  return (
    <div className="grid-bg relative flex min-h-screen flex-col bg-surface">
      <div className="glow pointer-events-none absolute inset-x-0 top-0 h-80" />

      <header className="relative flex items-center justify-between px-6 py-5">
        <Logo />
        <div className="flex items-center gap-1">
          <button
            onClick={toggleLocale}
            className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm text-subtle hover:bg-muted hover:text-fg"
          >
            <Languages className="h-[18px] w-[18px]" />
            {locale === "ar" ? "EN" : "ع"}
          </button>
          <button
            onClick={toggleTheme}
            className="grid h-9 w-9 place-items-center rounded-lg text-subtle hover:bg-muted hover:text-fg"
          >
            {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </button>
        </div>
      </header>

      <main className="relative flex flex-1 items-center justify-center px-4 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          <div className="mb-8 text-center">
            <h1 className="text-balance text-3xl font-bold leading-tight md:text-4xl">
              {t("login.headline")}
            </h1>
            <p className="mx-auto mt-3 max-w-xs text-pretty text-sm text-subtle">
              {t("login.sub")}
            </p>
          </div>

          <div className="space-y-3 rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <Button onClick={enter} size="lg" className="w-full">
              <Github className="h-5 w-5" />
              {t("login.github")}
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="w-full"
              disabled
              title={locale === "ar" ? "قريباً" : "Coming soon"}
            >
              <GoogleIcon />
              {t("login.google")}
            </Button>
            <p className="pt-2 text-center text-xs text-subtle" dir={dir}>
              {t("login.terms")}
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
