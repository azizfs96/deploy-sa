"use client";

import { Bell, Search, Sun, Moon, Languages, Plus, LogOut } from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePrefs, useApp, useT } from "@/lib/store";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const { t } = useT();
  const user = useApp((s) => s.user);
  const theme = usePrefs((s) => s.theme);
  const toggleTheme = usePrefs((s) => s.toggleTheme);
  const toggleLocale = usePrefs((s) => s.toggleLocale);
  const locale = usePrefs((s) => s.locale);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-surface/80 px-4 backdrop-blur-md md:px-6">
      <div className="relative hidden max-w-md flex-1 sm:block">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
        <input
          placeholder={t("nav.search")}
          className="h-9 w-full rounded-lg border border-border bg-muted ps-9 pe-3 text-sm text-fg placeholder:text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        />
      </div>

      <div className="flex flex-1 items-center justify-end gap-1.5">
        <Link href="/new" className="me-1">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t("dash.newProject")}</span>
          </Button>
        </Link>

        <button
          onClick={toggleLocale}
          title="AR / EN"
          className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm text-subtle transition-colors hover:bg-muted hover:text-fg"
        >
          <Languages className="h-[18px] w-[18px]" />
          <span className="font-medium">{locale === "ar" ? "EN" : "ع"}</span>
        </button>

        <button
          onClick={toggleTheme}
          title="Theme"
          className="grid h-9 w-9 place-items-center rounded-lg text-subtle transition-colors hover:bg-muted hover:text-fg"
        >
          {theme === "dark" ? (
            <Sun className="h-[18px] w-[18px]" />
          ) : (
            <Moon className="h-[18px] w-[18px]" />
          )}
        </button>

        <button className="relative grid h-9 w-9 place-items-center rounded-lg text-subtle transition-colors hover:bg-muted hover:text-fg">
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute end-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-surface" />
        </button>

        <div className="group relative ms-1">
          <button className="block rounded-full transition-transform hover:scale-105">
            <Avatar src={user.avatar} alt={user.name} size={32} />
          </button>
          <div className="invisible absolute end-0 top-full z-40 mt-2 w-48 origin-top rounded-lg border border-border bg-card p-1 opacity-0 shadow-xl transition-all group-hover:visible group-hover:opacity-100">
            <div className="border-b border-border px-3 py-2">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-subtle" dir="ltr">@{user.username}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-subtle transition-colors hover:bg-muted hover:text-failed"
            >
              <LogOut className="h-4 w-4" />
              {t("nav.logout")}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
