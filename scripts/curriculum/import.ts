/**
 * npm run curriculum:import — sends every content/english/units/*.json to the database as a unit in
 * "review" (never published: the owner approves lesson by lesson at /admin/content). A unit whose
 * package did not change since its last import is skipped. Needs NEXT_PUBLIC_SUPABASE_URL and
 * SUPABASE_SECRET_KEY (run by .github/workflows/curriculum.yml).
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { validateUnitPackage } from "../../src/lib/content/validate";

const strip = (p: Record<string, unknown>) => JSON.stringify({ ...p, version: 0 });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase secrets are not set");
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const dir = path.join(__dirname, "..", "..", "content", "english", "units");
  let failed = 0;
  // Only units that have a hand-written source (scripts/curriculum/a1/NN.ts) are imported.
  const authored = new Set(readdirSync(path.join(__dirname, "a1")).filter((x) => /^\d\d\.ts$/.test(x)).map((x) => `A1-${x.slice(0, 2)}.json`));
  for (const f of readdirSync(dir).filter((x) => authored.has(x)).sort()) {
    const pkg = JSON.parse(readFileSync(path.join(dir, f), "utf8")) as Record<string, unknown> & { code: string };
    const r = validateUnitPackage(pkg, { fileName: f });
    if (!r.ok) {
      console.log(`✗ ${pkg.code}: invalid package`, r.errors);
      failed++;
      continue;
    }
    const { data: unit } = await db.from("units").select("id, version, status").eq("code", pkg.code).maybeSingle();
    if (unit) {
      const { data: last } = await db.from("unit_packages").select("package").eq("unit_id", unit.id).order("version", { ascending: false }).limit(1).maybeSingle();
      if (last && strip(last.package as Record<string, unknown>) === strip(pkg)) {
        console.log(`= ${pkg.code}: unchanged`);
        continue;
      }
    }
    const next = { ...pkg, version: (unit?.version ?? 0) + 1 };
    const { data: id, error } = await db.rpc("import_unit_package", { p_package: next as never });
    if (error || !id) {
      console.log(`✗ ${pkg.code}: ${error?.message ?? "no id"}`);
      failed++;
      continue;
    }
    await db.from("curriculum_units").update({ unit_id: id, build_status: "review" }).eq("code", pkg.code);
    console.log(`✓ ${pkg.code}: imported for review (v${next.version})`);
  }
  if (failed) process.exit(1);
}
void main();
