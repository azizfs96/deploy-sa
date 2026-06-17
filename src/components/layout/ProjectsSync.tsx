"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useApp } from "@/lib/store";

/**
 * Hydrates the Zustand app store from the backend on mount:
 *  - current session user → store.user
 *  - GET /api/projects     → store.projects
 * Mounted once inside the dashboard shell.
 */
export function ProjectsSync() {
  const { data: session } = useSession();
  const setProjects = useApp((s) => s.setProjects);
  const setUser = useApp((s) => s.setUser);

  useEffect(() => {
    if (session?.user) {
      setUser({
        name: session.user.name ?? "user",
        username: session.user.login ?? "user",
        avatar: session.user.image ?? "",
        email: session.user.email ?? "",
      });
    }
  }, [session, setUser]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/projects")
      .then((r) => (r.ok ? r.json() : { projects: [] }))
      .then((d) => {
        if (!cancelled) setProjects(d.projects ?? []);
      })
      .catch(() => {
        if (!cancelled) setProjects([]);
      });
    return () => {
      cancelled = true;
    };
  }, [setProjects]);

  return null;
}
