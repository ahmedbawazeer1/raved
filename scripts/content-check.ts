/**
 * npm run content:check — validates every content/<path>/units/*.json (and the example)
 * and every content/<path>/placement.json.
 * Exits with code 1 when any package has errors. Messages are in Arabic.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { validateUnitPackage } from "../src/lib/content/validate";
import { bankProblems, placementBankSchema } from "../src/lib/placement/bank";

const root = path.join(__dirname, "..", "content");
const files: string[] = [path.join(root, "examples", "A1-01.json")];
for (const dir of readdirSync(root)) {
  const units = path.join(root, dir, "units");
  if (dir === "examples" || dir === "schema") continue;
  try {
    if (!statSync(units).isDirectory()) continue;
  } catch {
    continue;
  }
  for (const f of readdirSync(units)) if (f.endsWith(".json")) files.push(path.join(units, f));
}

let failed = 0;
for (const file of files) {
  const rel = path.relative(path.join(root, ".."), file);
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    console.log(`✗ ${rel}\n   خطأ: ملف JSON غير صالح (${(e as Error).message})`);
    failed++;
    continue;
  }
  const r = validateUnitPackage(data, { fileName: path.basename(file) });
  const size = `${(r.sizeBytes / 1024).toFixed(0)}KB`;
  console.log(`${r.ok ? "✓" : "✗"} ${rel} (${size})`);
  for (const e of r.errors) console.log(`   خطأ [${e.path}]: ${e.message}`);
  for (const w of r.warnings) console.log(`   تنبيه [${w.path}]: ${w.message}`);
  if (!r.ok) failed++;
}
// Placement banks
for (const dir of readdirSync(root)) {
  const file = path.join(root, dir, "placement.json");
  let raw: string;
  try {
    raw = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  const rel = path.relative(path.join(root, ".."), file);
  const parsed = placementBankSchema.safeParse(JSON.parse(raw));
  const problems = parsed.success
    ? bankProblems(parsed.data)
    : parsed.error.issues.map((i) => `[${i.path.join(".")}]: ${i.message}`);
  console.log(`${problems.length ? "✗" : "✓"} ${rel}`);
  for (const p of problems) console.log(`   خطأ ${p}`);
  if (problems.length) failed++;
}

console.log(`\n${files.length} حزمة، ${failed} فيها أخطاء.`);
process.exit(failed > 0 ? 1 : 0);
