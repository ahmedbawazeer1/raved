/**
 * «عقل رفد» background runner (GitHub Actions: .github/workflows/agent.yml).
 * Runs queued agent jobs with the service role, at most a few per run.
 * Needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY and GEMINI_API_KEY (repository secrets).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { callGemini } from "../../src/lib/agent/gemini";
import { runNextJob, type AgentJob, type AgentStore, type UnitTools } from "../../src/lib/agent/runner";
import { searchYouTube } from "../../src/lib/agent/youtube";
import { validateUnitPackage } from "../../src/lib/content/validate";

const MAX_JOBS = 3;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log("Agent runner: Supabase secrets are not set, nothing to do.");
    return;
  }
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const store: AgentStore = {
    async nextQueued() {
      const { data, error } = await db
        .from("agent_jobs")
        .select("id, kind, path_id, input, log")
        .eq("status", "queued")
        .order("created_at")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as AgentJob | null) ?? null;
    },
    async update(id, patch) {
      const { error } = await db.from("agent_jobs").update(patch).eq("id", id);
      if (error) throw error;
    },
    async pathContext(pathId) {
      const { data: path, error } = await db.from("paths").select("title, description, features, levels(code, title, kind, position)").eq("id", pathId).single();
      if (error) throw error;
      const features = Object.entries((path.features ?? {}) as Record<string, unknown>)
        .filter(([, on]) => on === true)
        .map(([k]) => k);
      const levels = [...(path.levels ?? [])].sort((a, b) => a.position - b.position).map((l) => ({ code: l.code, title: l.title, kind: l.kind }));
      return { title: path.title, description: path.description, levels, features };
    },
    async memory(pathId) {
      const { data } = await db
        .from("agent_memory")
        .select("text")
        .eq("active", true)
        .or(`path_id.eq.${pathId},path_id.is.null`)
        .order("created_at", { ascending: false })
        .limit(40);
      return (data ?? []).map((m) => m.text);
    },
  };

  const root = path.join(__dirname, "..", "..");
  const tools: UnitTools = {
    search: (q) => {
      if (!process.env.YOUTUBE_API_KEY) throw new Error("مفتاح YouTube غير مضاف بعد (YOUTUBE_API_KEY).");
      return searchYouTube(q);
    },
    validate: (pkg) => {
      const r = validateUnitPackage(pkg);
      return { ok: r.ok, errors: r.errors.map((e) => ({ path: e.path, message: e.message })) };
    },
    schema: readFileSync(path.join(root, "content", "schema", "unit.schema.json"), "utf8"),
    example: readFileSync(path.join(root, "content", "examples", "A1-01.json"), "utf8"),
  };

  for (let i = 0; i < MAX_JOBS; i++) {
    const id = await runNextJob(store, (req) => callGemini(req), tools);
    if (!id) break;
    console.log(`Agent runner: handled job ${id}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
