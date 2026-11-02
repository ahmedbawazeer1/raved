import { expect, type Page } from "@playwright/test";

export const STUDENT = {
  email: "e2e-student@example.com",
  password: "e2e-Password-123",
  name: "طالب الاختبار",
};

/** A new account that has not applied yet (reset before every run). */
export const APPLICANT = {
  email: "e2e-applicant@example.com",
  password: "e2e-Password-456",
  name: "متقدم الاختبار",
};

export async function login(page: Page, account: { email: string; password: string } = STUDENT, home: RegExp = /\/student$/) {
  await page.goto("/login");
  await page.getByLabel("البريد الإلكتروني").fill(account.email);
  await page.getByLabel("كلمة المرور").fill(account.password);
  await page.getByRole("button", { name: "تسجيل الدخول" }).click();
  await expect(page).toHaveURL(home);
}
