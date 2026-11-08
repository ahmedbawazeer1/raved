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
import { playlistVideos, resolveChannel, searchYouTube } from "../../src/lib/agent/youtube";
import { levelProfile, parseProfile } from "../../src/lib/factory/profile";
import { DEFAULT_TEMPLATES, lessonTemplateSpec, unitTemplateSpec, type LessonTemplateSpec } from "../../src/lib/factory/templates";
import { mapToRows, rowsToMap } from "../../src/lib/factory/rows";
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

  // A job put back in the queue (quota, busy) waits for the next run instead of being retried at once.
  const handled: string[] = [];
  const store: AgentStore = {
    async nextQueued() {
      let query = db.from("agent_jobs").select("id, kind, path_id, input, log").eq("status", "queued");
      if (handled.length) query = query.not("id", "in", `(${handled.join(",")})`);
      const { data, error } = await query.order("created_at").limit(1).maybeSingle();
      if (error) throw error;
      return (data as AgentJob | null) ?? null;
    },
    async update(id, patch) {
      const { error } = await db.from("agent_jobs").update(patch).eq("id", id);
      if (error) throw error;
    },
    async pathContext(pathId) {
      const { data: path, error } = await db
        .from("paths")
        .select("title, description, features, levels(code, title, kind, position)")
        .eq("id", pathId)
        .single();
      if (error) throw error;
      const features = Object.entries((path.features ?? {}) as Record<string, unknown>)
        .filter(([, on]) => on === true)
        .map(([k]) => k);
      const levels = [...(path.levels ?? [])].sort((a, b) => a.position - b.position).map((l) => ({ code: l.code, title: l.title, kind: l.kind }));
      return { title: path.title, description: path.description, levels, features };
    },
    async unitPackage(unitId) {
      const { data } = await db
        .from("unit_packages")
        .select("package, version")
        .eq("unit_id", unitId)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data ? { package: data.package as Record<string, unknown>, version: data.version } : null;
    },
    async paused() {
      const { data } = await db.from("settings").select("value").eq("key", "agent_paused").maybeSingle();
      return data?.value === true;
    },
    async trace(row) {
      await db.from("agent_traces").insert(row);
    },
    async levelContext(levelId) {
      const { data: level, error } = await db
        .from("levels")
        .select("id, code, title, description, kind, planned_units, position, path_id, paths(title)")
        .eq("id", levelId)
        .single();
      if (error) throw error;
      const [{ data: prof }, { data: earlier }] = await Promise.all([
        db.from("path_profiles").select("profile").eq("path_id", level.path_id).maybeSingle(),
        db.from("levels").select("id, code, position").eq("path_id", level.path_id).lt("position", level.position).order("position"),
      ]);
      const profile = levelProfile(parseProfile(prof?.profile), level.code) ?? null;
      const key = profile?.unit_template ?? "standard";
      const { data: tpl } = await db.from("content_templates").select("spec").eq("kind", "unit").eq("key", key).maybeSingle();
      const parsed = unitTemplateSpec.safeParse(tpl?.spec);
      const unitTemplate = parsed.success ? parsed.data : unitTemplateSpec.parse(DEFAULT_TEMPLATES.find((t) => t.key === "standard")!.spec);
      const earlierIds = (earlier ?? []).map((l) => l.id);
      const [{ data: words }, { data: units }] = earlierIds.length
        ? await Promise.all([
            db.from("curriculum_items").select("text_en").eq("kind", "word").in("level_id", earlierIds),
            db.from("curriculum_units").select("level_id, title_en, position").in("level_id", earlierIds).order("position"),
          ])
        : [{ data: [] }, { data: [] }];
      const earlierLevels = (earlier ?? []).map(
        (l) =>
          `${l.code}: ${
            (units ?? [])
              .filter((u) => u.level_id === l.id)
              .map((u) => u.title_en)
              .join(", ") || "—"
          }`,
      );
      const pathTitle = (level.paths as unknown as { title: string } | null)?.title ?? "";
      return {
        pathTitle,
        level: {
          id: level.id,
          code: level.code,
          title: level.title,
          description: level.description,
          kind: level.kind,
          planned_units: level.planned_units ?? 0,
        },
        profile,
        unitTemplate,
        earlierWords: (words ?? []).map((w) => w.text_en),
        earlierLevels,
      };
    },
    async saveLevelMap(levelId, map, issues, jobId) {
      const { items, units } = mapToRows(map);
      for (const table of ["curriculum_items", "curriculum_units"] as const) {
        const { error } = await db.from(table).delete().eq("level_id", levelId);
        if (error) throw error;
      }
      const { error: e1 } = await db.from("curriculum_items").insert(items.map((i) => ({ ...i, level_id: levelId, detail: i.detail as never })));
      if (e1) throw e1;
      const { error: e2 } = await db.from("curriculum_units").insert(units.map((u) => ({ ...u, level_id: levelId, source_video: u.source_video as never })));
      if (e2) throw e2;
      const { error: e3 } = await db.from("curriculum_levels").upsert({
        level_id: levelId,
        status: "review",
        summary_ar: map.summary_ar,
        issues: issues as never,
        job_id: jobId,
        teacher_ok_by: null,
        teacher_ok_at: null,
      });
      if (e3) throw e3;
    },
    async unitContext(curriculumUnitId) {
      const { data: row, error } = await db.from("curriculum_units").select("*").eq("id", curriculumUnitId).single();
      if (error) throw error;
      const { data: level } = await db.from("levels").select("id, code, position, path_id, paths(slug, title)").eq("id", row.level_id).single();
      if (!level) throw new Error("level not found");
      const path = level.paths as unknown as { slug: string; title: string };
      const [{ data: items }, { data: units }, { data: prof }, { data: earlier }, { data: templates }, { data: sources }] = await Promise.all([
        db.from("curriculum_items").select("kind, code, text_en, text_ar, detail, unit_code, position").eq("level_id", row.level_id),
        db.from("curriculum_units").select("code, position").eq("level_id", row.level_id),
        db.from("path_profiles").select("profile").eq("path_id", level.path_id).maybeSingle(),
        db.from("levels").select("id").eq("path_id", level.path_id).lt("position", level.position),
        db.from("content_templates").select("kind, key, title_ar, spec").eq("active", true),
        db.from("video_sources").select("kind, ref, title, language, levels").eq("path_id", level.path_id).eq("active", true).order("position"),
      ]);
      const profile = parseProfile(prof?.profile);
      const lp = levelProfile(profile, level.code) ?? null;
      const unitTpl = (templates ?? []).find((t) => t.kind === "unit" && t.key === (lp?.unit_template ?? "standard"));
      const unitTemplate = unitTemplateSpec.safeParse(unitTpl?.spec).success
        ? unitTemplateSpec.parse(unitTpl!.spec)
        : unitTemplateSpec.parse(DEFAULT_TEMPLATES.find((t) => t.key === "standard")!.spec);
      const lessonTemplates: Record<string, { title_ar: string; spec: LessonTemplateSpec }> = {};
      for (const t of templates ?? []) {
        const r = lessonTemplateSpec.safeParse(t.spec);
        if (t.kind === "lesson" && r.success) lessonTemplates[t.key] = { title_ar: t.title_ar, spec: r.data };
      }
      const map = rowsToMap(level.code, "", items ?? [], [row]);
      const unit = map.units[0];
      const words = (items ?? []).filter((i) => i.kind === "word");
      const before = new Set((units ?? []).filter((u) => u.position <= row.position).map((u) => u.code));
      const earlierIds = (earlier ?? []).map((l) => l.id);
      const { data: earlierWords } = earlierIds.length
        ? await db.from("curriculum_items").select("text_en, text_ar, detail").eq("kind", "word").in("level_id", earlierIds)
        : { data: [] as { text_en: string; text_ar: string; detail: unknown }[] };
      const pool = [...words, ...(earlierWords ?? [])];
      const review = row.review_words.flatMap((w: string) => {
        const found = pool.find((p) => p.text_en.toLowerCase() === w.toLowerCase());
        const d = (found?.detail ?? {}) as { pos?: string; example_en?: string };
        return found
          ? [{ word: found.text_en, pos: (d.pos ?? "other") as never, meaning_ar: found.text_ar, example_en: d.example_en ?? "", review: true }]
          : [];
      });
      return {
        pathSlug: path.slug,
        pathTitle: path.title,
        level: { id: level.id, code: level.code },
        unitRowId: row.id,
        unit,
        objectives: (items ?? []).filter((i) => i.kind === "objective" && row.objectives.includes(i.code)).map((i) => i.text_ar),
        grammar: (items ?? [])
          .filter((i) => i.kind === "grammar" && row.grammar.includes(i.code))
          .map((g) => ({ text_en: g.text_en, text_ar: g.text_ar, example_en: String((g.detail as { example_en?: string })?.example_en ?? "") })),
        review,
        known: [...words.filter((w) => w.unit_code && before.has(w.unit_code)).map((w) => w.text_en), ...(earlierWords ?? []).map((w) => w.text_en)],
        profile,
        levelProfile: lp,
        unitTemplate,
        lessonTemplates,
        sources: (sources ?? [])
          .filter((s) => !s.levels.length || s.levels.includes(level.code))
          .map((s) => ({ kind: s.kind as "playlist" | "channel", ref: s.ref, title: s.title, language: s.language as "ar" | "en" })),
      };
    },
    async jobOutput(jobId) {
      const { data } = await db.from("agent_jobs").select("output").eq("id", jobId).maybeSingle();
      return data?.output ?? null;
    },
    async setBuildStatus(curriculumUnitId, status, jobId) {
      const { error } = await db.from("curriculum_units").update({ build_status: status, build_job_id: jobId }).eq("id", curriculumUnitId);
      if (error) throw error;
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
    search: (q, opts) => {
      if (!process.env.YOUTUBE_API_KEY) throw new Error("مفتاح YouTube غير مضاف بعد (YOUTUBE_API_KEY).");
      return searchYouTube(q, opts);
    },
    resolveChannel: (ref) => resolveChannel(ref),
    playlist: (id) => playlistVideos(id),
    validate: (pkg) => {
      const r = validateUnitPackage(pkg);
      return { ok: r.ok, errors: r.errors.map((e) => ({ path: e.path, message: e.message })) };
    },
    schema: readFileSync(path.join(root, "content", "schema", "unit.schema.json"), "utf8"),
    example: readFileSync(path.join(root, "content", "examples", "A1-01.json"), "utf8"),
  };

  if (await store.paused?.()) {
    console.log("Agent runner: paused by the owner (/admin/agent).");
    return;
  }
  for (let i = 0; i < MAX_JOBS; i++) {
    const id = await runNextJob(store, (req) => callGemini(req), tools);
    if (!id) break;
    handled.push(id);
    console.log(`Agent runner: handled job ${id}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
