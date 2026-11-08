import { expect, test } from "@playwright/test";
import { login, TEACHER } from "./fixtures";

// The content studio: a teacher lands there, reads the templates and the English path profile,
// and cannot reach the admin area.
test("a teacher works in the content studio", async ({ page }) => {
  await login(page, TEACHER, /\/studio$/);
  await expect(page.getByRole("heading", { name: "المسارات والمناهج" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "الإنجليزية" })).toBeVisible();

  await page.getByRole("link", { name: "القوالب" }).first().click();
  await expect(page.getByRole("heading", { name: "درس مفردات" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "الوحدة القياسية" })).toBeVisible();

  await page.goto("/studio/paths/english");
  await expect(page.getByText("ZAmericanEnglish — المستوى الأول")).toBeVisible();

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/studio$/);
});
