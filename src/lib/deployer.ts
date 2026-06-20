// Control-plane → build-agent client.
// Triggers a real Docker build on the ECS host and returns the agent job id.

const AGENT_URL = process.env.AGENT_URL; // e.g. http://<ecs-ip>:9000
const AGENT_TOKEN = process.env.AGENT_TOKEN;
export const APPS_DOMAIN = process.env.APPS_DOMAIN ?? "apps.deploy.wafgate.com";

/** Whether the real deployment pipeline is configured. */
export function pipelineEnabled() {
  return Boolean(AGENT_URL && AGENT_TOKEN);
}

export function liveUrlFor(slug: string) {
  return `https://${slug}.${APPS_DOMAIN}`;
}

interface TriggerArgs {
  slug: string;
  repoFullName: string;
  token: string;
  branch: string;
  envVars: { key: string; value: string }[];
}

/** Ask the agent to build+run the project. Returns the agent job id, or null. */
export async function triggerDeploy(args: TriggerArgs): Promise<string | null> {
  if (!pipelineEnabled()) return null;
  const res = await fetch(`${AGENT_URL}/deploy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AGENT_TOKEN}`,
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    throw new Error(`agent /deploy failed: ${res.status}`);
  }
  const { id } = (await res.json()) as { id: string };
  return id;
}

/** Open the agent's SSE log stream for a job (server-side proxy use). */
export async function openAgentLogStream(agentId: string): Promise<Response> {
  return fetch(`${AGENT_URL}/logs/${agentId}`, {
    headers: { Authorization: `Bearer ${AGENT_TOKEN}` },
  });
}

export interface ProvisionedDb {
  id: string;
  container: string;
  engine: "postgres" | "mysql";
  host: string;
  port: number;
  username: string;
  password: string;
  dbName: string;
  url: string;
}

/** Provision a managed database container on the agent host. */
export async function provisionDatabase(
  engine: "postgres" | "mysql",
  name: string
): Promise<ProvisionedDb> {
  if (!pipelineEnabled()) throw new Error("pipeline not configured");
  const res = await fetch(`${AGENT_URL}/databases`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AGENT_TOKEN}`,
    },
    body: JSON.stringify({ engine, name }),
  });
  if (!res.ok) throw new Error(`agent /databases failed: ${res.status}`);
  return (await res.json()) as ProvisionedDb;
}

/** Tear down a managed database container + volume on the agent host. */
export async function destroyDatabase(agentId: string): Promise<void> {
  if (!pipelineEnabled()) return;
  await fetch(`${AGENT_URL}/databases/${agentId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${AGENT_TOKEN}` },
  }).catch(() => {});
}

export const ADMINER_URL = `https://adminer.${APPS_DOMAIN}`;

export interface WafStats {
  totalBlocked: number;
  topIps: { key: string; count: number }[];
  topRules: { key: string; count: number }[];
  recent: { time: string; ip: string; uri: string; rule: string; ruleId: string }[];
  series?: number[]; // 24 hourly blocked counts (elapsed)
  series30?: number[]; // 30 per-minute blocked counts (last 30 min)
}

/** Fetch a site's WAF attack analytics from the agent. */
export async function fetchWafStats(slug: string): Promise<WafStats> {
  const empty: WafStats = { totalBlocked: 0, topIps: [], topRules: [], recent: [] };
  if (!pipelineEnabled()) return empty;
  try {
    const res = await fetch(`${AGENT_URL}/waf/stats?slug=${encodeURIComponent(slug)}`, {
      headers: { Authorization: `Bearer ${AGENT_TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) return empty;
    return (await res.json()) as WafStats;
  } catch {
    return empty;
  }
}

export interface WafRuleInput {
  type: "block_ip" | "block_path" | "block_country";
  value: string;
}

/** Push a project's WAF state (enabled + structured rules) to the agent. */
export async function syncWaf(
  slug: string,
  enabled: boolean,
  rules: WafRuleInput[]
): Promise<void> {
  if (!pipelineEnabled()) return;
  await fetch(`${AGENT_URL}/waf`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AGENT_TOKEN}`,
    },
    body: JSON.stringify({ slug, enabled, rules }),
  }).catch(() => {});
}
