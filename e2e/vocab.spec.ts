import { expect, test } from "@playwright/test";
import { login } from "./fixtures";

// Runs after student-unit.spec.ts (files run in name order), so the unit's lessons are complete.
test("vocabulary review works offline and syncs when the connection returns", async ({ page, context }) => {
  await login(page);
  await page.goto("/student/vocab");
  await expect(page.getByText("1 من 8")).toBeVisible();

  // Online: first word.
  await page.getByRole("button", { name: "اقلب البطاقة" }).click();
  await page.getByRole("button", { name: "أعرفها" }).click();
  await expect(page.getByText("2 من 8")).toBeVisible();

  // Airplane mode: the answer is kept on the device.
  await context.route("**/*", (route) => route.abort("internetdisconnected"));
  await page.getByRole("button", { name: "اقلب البطاقة" }).click();
  await page.getByRole("button", { name: "صعبة" }).click();
  await expect(page.getByText("1 بانتظار الإرسال")).toBeVisible();

  // Back online: the queue is sent.
  await context.unrouteAll({ behavior: "ignoreErrors" });
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(page.getByText("تعمل بلا إنترنت")).toBeVisible();

  // Both reviews reached the server: those two words are no longer due.
  await page.reload();
  await expect(page.getByText("1 من 6")).toBeVisible();
});
