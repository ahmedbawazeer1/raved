import { expect, test } from "@playwright/test";

test("airplane mode shows the offline page instead of a browser error", async ({ page, context }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

  await context.setOffline(true);
  await page.goto("/paths").catch(() => undefined);
  await expect(page.getByRole("heading", { name: "لا يوجد اتصال بالإنترنت" })).toBeVisible();

  // Pages already visited still open from the cache.
  await page.goto("/").catch(() => undefined);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("مسارات تعليمية");
  await context.setOffline(false);
});
