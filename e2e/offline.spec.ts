import { expect, test } from "@playwright/test";

test("airplane mode shows the offline page instead of a browser error", async ({ page, context }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  // The offline page must be precached before the network goes away.
  await expect
    .poll(() =>
      page.evaluate(async () => {
        for (const name of await caches.keys()) {
          const cache = await caches.open(name);
          if ((await cache.keys()).some((r) => new URL(r.url).pathname === "/~offline")) return true;
        }
        return false;
      }),
    )
    .toBe(true);

  // Simulate airplane mode: every network request fails (including the service worker's own fetches).
  // context.setOffline() made Chromium hang on teardown in CI.
  await context.route("**/*", (route) => route.abort("internetdisconnected"));
  await page.goto("/paths").catch(() => undefined);
  await expect(page.getByRole("heading", { name: "لا يوجد اتصال بالإنترنت" })).toBeVisible();

  // Pages already visited still open from the cache.
  await page.goto("/").catch(() => undefined);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("مسارات تعليمية");
  await context.unrouteAll({ behavior: "ignoreErrors" });
});
