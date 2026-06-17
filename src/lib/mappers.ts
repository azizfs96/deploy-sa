import type {
  Project as DbProject,
  EnvVar as DbEnvVar,
  Deployment as DbDeployment,
} from "@prisma/client";
import { Deployment, Project } from "./types";

type DbProjectFull = DbProject & {
  envVars: DbEnvVar[];
  deployments: DbDeployment[];
};

export function mapDeployment(d: DbDeployment): Deployment {
  return {
    id: d.id,
    commitHash: d.commitHash,
    commitMessage: d.commitMessage,
    branch: d.branch,
    status: d.status,
    durationSec: d.durationSec,
    createdAt: d.createdAt.toISOString(),
    logs: d.logs,
    agentId: d.agentId,
    liveUrl: d.liveUrl,
    author: {
      name: d.authorName,
      username: d.authorUsername,
      avatar: d.authorAvatar,
      email: "",
    },
  };
}

/** Convert a DB project (with relations) to the shape the UI components expect. */
export function mapProject(p: DbProjectFull): Project {
  return {
    id: p.slug,
    name: p.name,
    framework: p.framework,
    status: p.status,
    domain: p.domain,
    branch: p.branch,
    autoDeploy: p.autoDeploy,
    webhookActive: p.webhookActive,
    installCommand: p.installCommand,
    buildCommand: p.buildCommand,
    outputDir: p.outputDir,
    repo: {
      id: p.id,
      name: p.repoFullName.split("/")[1] ?? p.repoFullName,
      fullName: p.repoFullName,
      visibility: (p.repoVisibility as "public" | "private") ?? "private",
      language: p.repoLanguage ?? "—",
      updatedAt: p.updatedAt.toISOString(),
      framework: p.framework,
    },
    envVars: p.envVars.map((e) => ({ id: e.id, key: e.key, value: e.value })),
    deployments: p.deployments
      .sort((a, b) => +b.createdAt - +a.createdAt)
      .map(mapDeployment),
  };
}
