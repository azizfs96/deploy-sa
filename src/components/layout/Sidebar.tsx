"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutGrid,
  Rocket,
  Database,
  Globe,
  Settings,
  ShieldCheck,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { usePrefs, useT } from "@/lib/store";
import { TKey } from "@/lib/i18n";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

const items: { href: string; icon: typeof LayoutGrid; key: TKey }[] = [
  { href: "/dashboard", icon: LayoutGrid, key: "nav.projects" },
  { href: "/firewall", icon: ShieldCheck, key: "nav.firewall" },
  { href: "/deployments", icon: Rocket, key: "nav.deployments" },
  { href: "/databases", icon: Database, key: "nav.databases" },
  { href: "/domains", icon: Globe, key: "nav.domains" },
  { href: "/settings", icon: Settings, key: "nav.settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { t, dir } = useT();
  const collapsed = usePrefs((s) => s.sidebarCollapsed);
  const toggle = usePrefs((s) => s.toggleSidebar);
  const Chevron = dir === "rtl" ? ChevronsRight : ChevronsLeft;

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}
      className="sticky top-0 hidden h-screen shrink-0 flex-col border-e border-border bg-card md:flex"
    >
      <div className="flex h-16 items-center px-4">
        <Logo collapsed={collapsed} />
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {items.map(({ href, icon: Icon, key }) => {
          const active =
            pathname === href ||
            (href === "/dashboard" && pathname.startsWith("/projects"));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-subtle hover:bg-muted hover:text-fg"
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span>{t(key)}</span>}
              {active && (
                <span className="absolute inset-y-1.5 start-0 w-0.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={toggle}
        className="m-3 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-subtle transition-colors hover:bg-muted hover:text-fg"
      >
        <Chevron className="h-[18px] w-[18px] shrink-0" />
        {!collapsed && <span>{dir === "rtl" ? "طيّ" : "Collapse"}</span>}
      </button>
    </motion.aside>
  );
}
