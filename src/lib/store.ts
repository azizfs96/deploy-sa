"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Locale, dict, TKey } from "./i18n";
import { currentUser } from "./mock-data";
import { Project, User } from "./types";

type Theme = "dark" | "light";

interface PrefState {
  locale: Locale;
  theme: Theme;
  sidebarCollapsed: boolean;
  setLocale: (l: Locale) => void;
  toggleLocale: () => void;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
}

/** Persisted UI preferences (locale + theme + sidebar). */
export const usePrefs = create<PrefState>()(
  persist(
    (set, get) => ({
      locale: "ar",
      theme: "dark",
      sidebarCollapsed: false,
      setLocale: (locale) => set({ locale }),
      toggleLocale: () => set({ locale: get().locale === "ar" ? "en" : "ar" }),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === "dark" ? "light" : "dark" }),
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
    }),
    { name: "deploy-sa-prefs" }
  )
);

/** Convenience translation hook bound to current locale. */
export function useT() {
  const locale = usePrefs((s) => s.locale);
  const t = (key: TKey) => dict[locale][key] ?? key;
  return { t, locale, dir: (locale === "ar" ? "rtl" : "ltr") as "rtl" | "ltr" };
}

interface AppState {
  user: User;
  projects: Project[];
  projectsLoaded: boolean;
  activeDeploymentId: string | null;
  setUser: (u: User) => void;
  setProjects: (p: Project[]) => void;
  setActiveDeployment: (id: string | null) => void;
  addProject: (p: Project) => void;
}

/** Non-persisted app/domain state. Projects are hydrated from the API. */
export const useApp = create<AppState>((set) => ({
  user: currentUser,
  projects: [],
  projectsLoaded: false,
  activeDeploymentId: null,
  setUser: (user) => set({ user }),
  setProjects: (projects) => set({ projects, projectsLoaded: true }),
  setActiveDeployment: (id) => set({ activeDeploymentId: id }),
  addProject: (p) => set((s) => ({ projects: [p, ...s.projects] })),
}));
