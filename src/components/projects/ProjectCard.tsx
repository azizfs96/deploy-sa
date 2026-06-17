"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ExternalLink, GitBranch } from "lucide-react";
import { Project } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/deployments/StatusBadge";
import { FrameworkIcon } from "@/components/deployments/FrameworkIcon";
import { useT } from "@/lib/store";
import { timeAgo } from "@/lib/utils";

export function ProjectCard({ project, index = 0 }: { project: Project; index?: number }) {
  const { t, locale } = useT();
  const last = project.deployments[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Link href={`/projects/${project.id}`}>
        <Card className="group h-full p-5 transition-colors hover:border-primary/40">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <FrameworkIcon framework={project.framework} />
              <div>
                <h3 className="font-semibold leading-tight">{project.name}</h3>
                <span className="text-xs text-subtle">{project.repo.fullName}</span>
              </div>
            </div>
            <StatusBadge status={project.status} />
          </div>

          {/* Not an <a> — this card is already wrapped in a Link. Open in a new
              tab via onClick to avoid nesting anchors (invalid HTML). */}
          <span
            role="link"
            tabIndex={0}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.open(`https://${project.domain}`, "_blank", "noreferrer");
            }}
            className="mt-4 inline-flex cursor-pointer items-center gap-1.5 text-sm text-subtle transition-colors hover:text-primary"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {project.domain}
          </span>

          <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-subtle">
            <span className="inline-flex items-center gap-1">
              <GitBranch className="h-3.5 w-3.5" />
              {project.branch}
            </span>
            <span>
              {t("dash.lastDeploy")} ·{" "}
              {last ? timeAgo(last.createdAt, locale) : "—"}
            </span>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}
