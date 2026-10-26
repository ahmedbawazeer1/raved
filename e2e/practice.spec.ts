import { expect, test } from "@playwright/test";
import { login } from "./fixtures";

// CI runs the app with RAVED_AI_FAKE=1: deterministic AI answers, no provider calls.
test("writing: draft survives a reload, then it is corrected with numbered errors", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "ابدأ جلسة اليوم" }).click();
  await page.getByRole("link", { name: "اكتب واحصل على تصحيح" }).click();
  await expect(page).toHaveURL(/\/student\/practice\/writing\//);

  const text = "my name is Sara. I am sixteen years old. My father is a teacher and my mother is a doctor. We are from Aden and we are happy.";
  await page.getByLabel("كتابتك بالإنجليزية").fill(text);
  await page.reload();
  await expect(page.getByLabel("كتابتك بالإنجليزية")).toHaveValue(text);

  await page.getByRole("button", { name: "أرسل للتصحيح" }).click();
  await expect(page).toHaveURL(/\/student\/practice\/writing\/result\//);
  await expect(page.getByText("تقديري").first()).toBeVisible();
  await expect(page.getByText("التصحيح", { exact: true })).toBeVisible();
  await expect(page.locator("mark")).toHaveCount(1);
  await expect(page.getByRole("link", { name: "أعد الكتابة بالتصحيحات" })).toBeVisible();
});

test("the lesson assistant answers about the lesson and counts the daily limit", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "ابدأ جلسة اليوم" }).click();
  await page.getByRole("link", { name: /اسأل المساعد/ }).click();
  await expect(page.getByText("15 سؤالاً متبقياً اليوم", { exact: false })).toBeVisible();
  await page.getByLabel("سؤالك").fill("متى أستخدم am؟");
  await page.getByRole("button", { name: "إرسال" }).click();
  await expect(page.getByText("مثال على إجابة المساعد")).toBeVisible();
  await expect(page.getByText("14 سؤالاً متبقياً اليوم", { exact: false })).toBeVisible();
});
