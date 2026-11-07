import { expect, test, type Page } from "@playwright/test";
import { login } from "./fixtures";

/** CLAUDE.md: initial JS < 200KB gzipped on student pages. Measured on a fresh load (no cache, no service worker). */
const BUDGET_KB = 200;

async function initialJsKb(page: Page): Promise<number> {
  await page.waitForLoadState("networkidle");
  const bytes = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .filter((e) => (e as PerformanceResourceTiming).initiatorType === "script" || e.name.endsWith(".js"))
      .reduce((n, e) => n + ((e as PerformanceResourceTiming).encodedBodySize || 0), 0),
  );
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
