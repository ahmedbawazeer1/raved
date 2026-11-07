import { expect, test, type Page } from "@playwright/test";
import { login } from "./fixtures";

/** CLAUDE.md: initial JS < 200KB gzipped on student pages. Measured on a fresh load (no cache, no service worker). */
const BUDGET_KB = 200;

/**
 * Gzipped size of the scripts the page itself loaded (not link prefetches of other pages), computed in the
 * browser with CompressionStream so the result does not depend on the test server's compression.
 */
async function initialJsKb(page: Page): Promise<number> {
  await page.waitForLoadState("networkidle");
  const bytes = await page.evaluate(async () => {
    const urls = performance
      .getEntriesByType("resource")
      .filter((e) => (e as PerformanceResourceTiming).initiatorType === "script")
      .map((e) => e.name);
    let total = 0;
    for (const url of [...new Set(urls)]) {
      const body = await (await fetch(url)).blob();
      const gz = await new Response(body.stream().pipeThrough(new CompressionStream("gzip"))).blob();
      total += gz.size;
    }
    return total;
  });
  return Math.round(bytes / 1024);
}

test("student pages stay within the JavaScript budget", async ({ page, context }) => {
  await login(page);
  const results: Record<string, number> = {};
  const pages = ["/student", "/student/english", "/student/vocab", "/student/practice", "/student/settings"];
  for (const path of pages) {
    const fresh = await context.newPage();
    await fresh.route("**/serwist/sw.js", (r) => r.abort());
    await fresh.goto(path);
    results[path] = await initialJsKb(fresh);
    await fresh.close();
  }
  // The first lesson of today's session.
  await page.goto("/student");
  const start = page.getByRole("link", { name: "ابدأ جلسة اليوم" });
  const lessonHref = (await start.count()) ? await start.first().getAttribute("href") : null;
  if (lessonHref) {
    const fresh = await context.newPage();
    await fresh.route("**/serwist/sw.js", (r) => r.abort());
    await fresh.goto(lessonHref);
    results["/student/learn/:id"] = await initialJsKb(fresh);
    await fresh.close();
  }
  console.log(`PERF initial JS (KB, compressed): ${JSON.stringify(results)}`);
  for (const [path, kb] of Object.entries(results)) expect(kb, `${path} loads ${kb}KB of JS`).toBeLessThan(BUDGET_KB);
});
