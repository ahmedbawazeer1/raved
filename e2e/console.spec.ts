import { expect, test } from "@playwright/test";
import { ADMIN, login, TEACHER } from "./fixtures";

// The admin dashboard frame: «اليوم» with the first-day checklist, grouped navigation, search and the bell.
test.describe("on a computer", () => {
  test.use({ viewport: { width: 1366, height: 900 }, isMobile: false, hasTouch: false });

  test("the admin starts the day in the console", async ({ page }) => {
    await login(page, ADMIN, /\/admin$/);
    await expect(page.getByRole("heading", { name: "اليوم", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "مطلوب منك" })).toBeVisible();

    await page.getByRole("link", { name: "البلاغات والتقارير" }).first().click();
    await expect(page.getByRole("heading", { name: "البلاغات والتقارير", level: 1 })).toBeVisible();
    await page.getByRole("link", { name: /أُغلقت/ }).click();
    await expect(page).toHaveURL(/show=closed/);

    await page.getByRole("button", { name: /الإشعارات/ }).click();
    await expect(page.getByRole("dialog", { name: "الإشعارات" })).toBeVisible();
    await page.keyboard.press("Escape");

    await page.keyboard.press("Control+k");
    const search = page.getByRole("dialog", { name: "البحث" });
    await search.getByLabel("بحث").fill("المراجعة");
    await search.getByRole("button", { name: "المراجعة" }).click();
    await expect(page).toHaveURL(/\/studio\/review$/);
    await expect(page.getByRole("heading", { name: "المراجعة", level: 1 })).toBeVisible();
  });
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the teacher uses the bottom tabs", async ({ page }) => {
    await login(page, TEACHER, /\/studio$/);
    const tabs = page.getByRole("navigation", { name: "التنقل السريع" });
    await tabs.getByRole("link", { name: "المراجعة" }).click();
    await expect(page.getByRole("heading", { name: "المراجعة", level: 1 })).toBeVisible();
    await expect(page.getByText("لا شيء ينتظر مراجعتك")).toBeVisible();
    await tabs.getByRole("button", { name: "المزيد" }).click();
    await expect(page.getByRole("dialog", { name: "المزيد" })).toBeVisible();
    await expect(page.getByRole("link", { name: "الطلاب" })).toHaveCount(0);
  });
});
