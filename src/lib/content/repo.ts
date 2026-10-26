import "server-only";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(process.cwd(), "content");

/** Unit packages committed to the repository (content/<path>/units/*.json). */
export async function listRepoUnitFiles(): Promise<string[]> {
  const out: string[] = [];
  let dirs: string[] = [];
  try {
    dirs = await readdir(ROOT);
  } catch {
    return out;
  }
  for (const dir of dirs) {
    if (dir === "schema" || dir === "examples") continue;
    try {
      for (const f of await readdir(path.join(ROOT, dir, "units"))) {
        if (f.endsWith(".json")) out.push(`${dir}/units/${f}`);
      }
    } catch {
      // not a path folder
    }
  }
  out.push("examples/A1-01.json");
  return out.sort();
}

export async function readRepoUnitFile(relative: string): Promise<string | null> {
  const files = await listRepoUnitFiles();
  if (!files.includes(relative)) return null; // only known files, no path traversal
  return readFile(path.join(ROOT, relative), "utf8");
}
