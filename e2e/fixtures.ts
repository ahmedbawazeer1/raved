import { expect, type Page } from "@playwright/test";

export const STUDENT = {
  email: "e2e-student@example.com",
  password: "e2e-Password-123",
  name: "طالب الاختبار",
};

export async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("البريد الإلكتروني").fill(STUDENT.email);
  await page.getByLabel("كلمة المرور").fill(STUDENT.password);
  await page.getByRole("button", { name: "تسجيل الدخول" }).click();
  await expect(page).toHaveURL(/\/student$/);
}
