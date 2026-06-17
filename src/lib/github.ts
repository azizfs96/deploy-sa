import { Framework, RepoVisibility } from "./types";

const GH = "https://api.github.com";

export interface GitHubRepo {
  id: string;
  name: string;
  fullName: string;
  visibility: RepoVisibility;
  language: string;
  updatedAt: string;
  framework: Framework;
  defaultBranch: string;
}

/** Best-effort framework detection from the repo's primary language. */
export function detectFramework(language: string | null): Framework {
  const l = (language ?? "").toLowerCase();
  if (["python", "jupyter notebook"].includes(l)) return "python";
  if (["html", "css", "astro", "mdx", "scss"].includes(l)) return "static";
  // JS/TS and everything else default to a Node runtime.
  return "node";
}

function headers(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

interface RawRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  language: string | null;
  updated_at: string;
  default_branch: string;
  fork: boolean;
}

/** List the authenticated user's repositories (most recently pushed first). */
export async function listRepos(token: string): Promise<GitHubRepo[]> {
  const res = await fetch(
    `${GH}/user/repos?per_page=100&sort=pushed&affiliation=owner,collaborator`,
    { headers: headers(token), cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error(`GitHub repos request failed: ${res.status}`);
  }
  const raw = (await res.json()) as RawRepo[];
  return raw.map((r) => ({
    id: String(r.id),
    name: r.name,
    fullName: r.full_name,
    visibility: r.private ? "private" : ("public" as RepoVisibility),
    language: r.language ?? "—",
    updatedAt: r.updated_at,
    framework: detectFramework(r.language),
    defaultBranch: r.default_branch,
  }));
}

interface RawBranch {
  name: string;
}

/** List branch names for a given `owner/repo`. */
export async function listBranches(
  token: string,
  fullName: string
): Promise<string[]> {
  const res = await fetch(`${GH}/repos/${fullName}/branches?per_page=100`, {
    headers: headers(token),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`GitHub branches request failed: ${res.status}`);
  const raw = (await res.json()) as RawBranch[];
  return raw.map((b) => b.name);
}

interface RawCommit {
  sha: string;
  commit: { message: string; author: { name: string; date: string } };
  author: { login: string; avatar_url: string } | null;
}

/** Latest commit on a branch — used to seed the first deployment. */
export async function latestCommit(
  token: string,
  fullName: string,
  branch: string
): Promise<{
  sha: string;
  message: string;
  authorName: string;
  authorLogin: string;
  authorAvatar: string;
} | null> {
  const res = await fetch(
    `${GH}/repos/${fullName}/commits/${encodeURIComponent(branch)}`,
    { headers: headers(token), cache: "no-store" }
  );
  if (!res.ok) return null;
  const c = (await res.json()) as RawCommit;
  return {
    sha: c.sha,
    message: c.commit.message.split("\n")[0],
    authorName: c.commit.author.name,
    authorLogin: c.author?.login ?? c.commit.author.name,
    authorAvatar:
      c.author?.avatar_url ?? "https://avatars.githubusercontent.com/u/0",
  };
}
