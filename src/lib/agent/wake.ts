/**
 * Starts the agent's GitHub Actions run right now instead of waiting for the schedule (GitHub delays
 * scheduled runs on free accounts by hours). Needs AGENT_WAKE_TOKEN: a fine-grained GitHub token
 * with "Actions: read and write" on this repository only. Without it nothing happens and the
 * schedule still picks the job up. Never throws: queuing a job must not fail because of this.
 */
export async function wakeAgent(): Promise<boolean> {
  const token = process.env.AGENT_WAKE_TOKEN;
  if (!token) return false;
  const repo = process.env.AGENT_WAKE_REPO || "ahmedbawazeer1/raved";
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/agent.yml/dispatches`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
      body: JSON.stringify({ ref: "main" }),
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    });
    return res.status === 204;
  } catch {
    return false;
  }
}
