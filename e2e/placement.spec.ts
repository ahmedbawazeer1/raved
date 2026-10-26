import { expect, test } from "@playwright/test";
import { login } from "./fixtures";

test("a beginner takes the placement test and starts at A1, unit 1", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "ابدأ", exact: true }).click();
  await expect(page).toHaveURL(/\/placement$/);
  await page.getByRole("button", { name: "ابدأ الاختبار" }).click();

  // Starts at A2; a beginner answers «لا أعرف» and the test steps down to A1, then ends.
  await expect(page.getByText(/ · السؤال 1$/)).toBeVisible();
  // Resume after leaving: the same question comes back.
  const firstPrompt = await page.getByRole("heading", { level: 2 }).textContent();
  await page.reload();
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(firstPrompt!);

  const label = page.getByText(/ · السؤال \d+$/);
  for (let i = 0; i < 40 && !page.url().includes("/placement/result"); i++) {
    const before = await label.textContent({ timeout: 5000 }).catch(() => null);
    if (before === null) break; // moving to the result page
    await page.getByRole("button", { name: "لا أعرف" }).click();
    await expect
      .poll(async () => page.url().includes("/placement/result") || (await label.textContent({ timeout: 1000 }).catch(() => null)) !== before)
      .toBe(true);
  }

  await expect(page).toHaveURL(/\/placement\/result$/);
  await expect(page.getByText("مستواك التقديري الآن")).toBeVisible();
  await expect(page.locator("p", { hasText: /^A1$/ })).toBeVisible();
  await expect(page.getByText(/تبدأ من الوحدة 1/)).toBeVisible();

  // Done: the Today page no longer asks for the test.
  await page.getByRole("link", { name: "ابدأ التعلّم" }).click();
  await expect(page.getByText("حدّد مستواك أولاً")).toHaveCount(0);
});
