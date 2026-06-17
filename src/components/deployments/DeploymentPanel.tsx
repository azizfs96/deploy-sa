"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, GitBranch, Clock } from "lucide-react";
import { Deployment } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "./StatusBadge";
import { LogStream } from "./LogStream";
import { useT } from "@/lib/store";
import { formatDuration, timeAgo } from "@/lib/utils";

/** Slide-in side panel showing streaming build logs for a deployment. */
export function DeploymentPanel({
  deployment,
  onClose,
}: {
  deployment: Deployment | null;
  onClose: () => void;
}) {
  const { t, locale, dir } = useT();
  const offscreen = dir === "rtl" ? "-100%" : "100%";

  return (
    <AnimatePresence>
      {deployment && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: offscreen }}
            animate={{ x: 0 }}
            exit={{ x: offscreen }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed inset-y-0 end-0 z-50 flex w-full max-w-lg flex-col border-s border-border bg-card shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-border p-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                    {deployment.commitHash.slice(0, 7)}
                  </code>
                  <StatusBadge status={deployment.status} />
                </div>
                <h3 className="mt-2 truncate text-sm font-semibold">
                  {deployment.commitMessage}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-subtle hover:bg-muted hover:text-fg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border px-5 py-3 text-xs text-subtle">
              <span className="flex items-center gap-1.5">
                <Avatar src={deployment.author.avatar} alt={deployment.author.name} size={20} />
                {deployment.author.username}
              </span>
              <span className="flex items-center gap-1.5">
                <GitBranch className="h-3.5 w-3.5" />
                {deployment.branch}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {formatDuration(deployment.durationSec)} · {timeAgo(deployment.createdAt, locale)}
              </span>
            </div>

            <div className="flex min-h-0 flex-1 flex-col p-5">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-subtle">
                {t("logs.title")}
                {deployment.status === "building" && (
                  <span className="flex items-center gap-1 text-building">
                    <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-building" />
                    {t("logs.live")}
                  </span>
                )}
              </div>
              <LogStream
                key={deployment.id}
                lines={deployment.logs}
                live={deployment.status === "building"}
                className="min-h-0 flex-1"
              />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
