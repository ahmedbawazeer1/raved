import { expect, test } from "@playwright/test";
import { login } from "./fixtures";

test("a student changes the daily goal and opens progress and certificates", async ({ page }) => {
  await login(page);
  await page.goto("/student/settings");
  await page.getByLabel("دقائق الدراسة اليومية").selectOption("45");
  await page.getByRole("button", { name: "حفظ", exact: true }).click();
  await expect(page.getByText("حُفظ.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("دقائق الدراسة اليومية")).toHaveValue("45");

  await page.getByRole("link", { name: "التقدم والامتحان" }).click();
  await expect(page.getByRole("heading", { name: "التقدم والامتحان" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "خريطة الطريق" })).toBeVisible();

  await page.goto("/student/certificates");
  await expect(page.getByRole("heading", { name: "شهاداتي" })).toBeVisible();
});

test("the public certificate check rejects an unknown code", async ({ page }) => {
  await page.goto("/verify/NOPE000000");
  await expect(page.getByRole("heading", { name: "التحقق من شهادة" })).toBeVisible();
  await expect(page.getByText("لم نجد شهادة بهذا الرمز")).toBeVisible();
});
