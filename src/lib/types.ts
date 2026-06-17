export type Framework = "node" | "python" | "static";
export type DeployStatus = "ready" | "building" | "failed";
export type RepoVisibility = "public" | "private";

export interface User {
  name: string;
  username: string;
  avatar: string;
  email: string;
}

export interface Deployment {
  id: string;
  commitHash: string; // full hash, display first 7
  commitMessage: string;
  branch: string;
  author: User;
  status: DeployStatus;
  durationSec: number;
  createdAt: string; // ISO
  logs: string[];
}

export interface EnvVar {
  id: string;
  key: string;
  value: string;
}

export interface Repo {
  id: string;
  name: string;
  fullName: string;
  visibility: RepoVisibility;
  language: string;
  updatedAt: string;
  framework: Framework;
}

export interface Project {
  id: string;
  name: string;
  framework: Framework;
  status: DeployStatus;
  domain: string;
  repo: Repo;
  branch: string;
  autoDeploy: boolean;
  webhookActive: boolean;
  installCommand: string;
  buildCommand: string;
  outputDir: string;
  envVars: EnvVar[];
  deployments: Deployment[];
}
