import { expect, test } from "@playwright/test";
import { APPLICANT, login } from "./fixtures";

test("a new account applies step by step, without a teacher recommendation", async ({ page }) => {
  await login(page, APPLICANT, /\/apply$/);

  // Step 1: name and birth date. Leaving a field empty keeps the student on the step.
  await expect(page.getByRole("heading", { name: "عرّفنا بنفسك" })).toBeVisible();
  await expect(page.getByText("الخطوة 1 من 8")).toBeVisible();
  await page.getByLabel("تاريخ الميلاد").fill("");
  await page.getByRole("button", { name: "التالي" }).click();
  await expect(page.getByText("أكمل الخانات قبل المتابعة.")).toBeVisible();
  await page.getByLabel("تاريخ الميلاد").fill("2009-05-01");
  await page.getByRole("button", { name: "التالي" }).click();

  // Step 2: where.
  await expect(page.getByRole("heading", { name: "من أين أنت؟" })).toBeVisible();
  await page.getByLabel("المحافظة").selectOption("hadramawt");
  await page.getByLabel("المدينة أو المديرية").fill("المكلا");
  await page.getByRole("button", { name: "التالي" }).click();

  // Step 3: school.
  await page.getByLabel("اسم المدرسة").fill("ثانوية المكلا");
  await page.getByText("الثاني الثانوي", { exact: true }).click();
  await page.getByText("علمي", { exact: true }).click();
  await page.getByRole("button", { name: "التالي" }).click();

  // Step 4: phone (checked before moving on).
  await page.getByRole("textbox", { name: "رقم هاتفك" }).fill("12345");
  await page.getByRole("button", { name: "التالي: هدفك" }).click();
  await expect(page).toHaveURL(/\/apply$/);
  await page.getByRole("textbox", { name: "رقم هاتفك" }).fill("77 123 4567");
  await page.getByRole("button", { name: "التالي: هدفك" }).click();

  // Steps 5–8: goal.
  await expect(page).toHaveURL(/\/apply\/goal$/);
  await expect(page.getByText("الخطوة 5 من 8")).toBeVisible();
  await page.locator("label").filter({ has: page.getByRole("radio") }).first().click();
  await page.getByRole("button", { name: "التالي" }).click();
  await page.getByText("IELTS", { exact: true }).click();
  await page.getByRole("button", { name: "التالي" }).click();
  await page.getByLabel("متى تحتاج الشهادة تقريباً؟").selectOption("grad_summer");
  await page.getByText("25", { exact: true }).click();
  await page.getByRole("button", { name: "التالي" }).click();
  await expect(page.getByText("توصية")).toHaveCount(0);
  await page.getByLabel("ولي أمري يعلم بتسجيلي ويوافق عليه").check();
  await page.getByLabel(/قرأت/).check();
  await page.getByRole("button", { name: /إرسال الطلب/ }).click();

  await expect(page).toHaveURL(/\/(apply\/status|student|placement)/);
});
