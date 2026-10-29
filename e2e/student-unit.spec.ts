import { expect, test } from "@playwright/test";
import { login } from "./fixtures";

test("a student completes today's lessons and passes the unit quiz", async ({ page }) => {
  await login(page);

  // The journey map: the first stop is open, the quiz waits for the lessons.
  await page.goto("/student/english");
  await expect(page.getByRole("heading", { name: "رحلتك" })).toBeVisible();
  await page.getByRole("link", { name: /الوحدة 1/ }).first().click();
  await expect(page.getByText("بعد إكمال الدروس")).toBeVisible();
  await page.goto("/student");

  // Today's session → first lesson (grammar).
  await page.getByRole("link", { name: "ابدأ جلسة اليوم" }).click();
  await expect(page).toHaveURL(/\/student\/learn\//);
  await expect(page.getByText("am / is / are").first()).toBeVisible();

  // The in-lesson exercise is checked on the device.
  await page.getByRole("radio", { name: "are" }).click();
  await page.getByRole("button", { name: "تحقق من الإجابة" }).click();
  await expect(page.getByText("إجابة صحيحة")).toBeVisible();

  await page.getByRole("button", { name: /أكملت الدرس · التالي/ }).click();
  await expect(page.getByText("عرّف نفسك").first()).toBeVisible();
  await page.getByRole("button", { name: /إلى الاختبار/ }).click();

  // Unit quiz: answers are graded on the server after submitting.
  await expect(page.getByText("السؤال 1 من 5")).toBeVisible();
  await page.getByRole("radio", { name: "am" }).click();
  await page.getByRole("button", { name: "التالي" }).click();
  await page.getByRole("radio", { name: "is" }).click();
  await page.getByRole("button", { name: "التالي" }).click();
  await page.getByRole("radio", { name: "Nice to meet you" }).click();
  await page.getByRole("button", { name: "التالي" }).click();
  await page.getByLabel("إجابتك").fill("are");
  await page.getByRole("button", { name: "التالي" }).click();
  for (const word of ["what's", "your", "name"]) {
    await page.getByRole("button", { name: word, exact: true }).click();
  }
  await page.getByRole("button", { name: "سلّم الاختبار" }).click();

  await expect(page).toHaveURL(/\/result\?attempt=/);
  await expect(page.getByText("5/5")).toBeVisible();
  await expect(page.getByText("نجحت")).toBeVisible();
});
