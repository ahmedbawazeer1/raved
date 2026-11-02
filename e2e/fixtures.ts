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

/** In a lesson: presses «التالي» until the step called `title` is open. */
export async function openLessonStep(page: Page, title: string) {
  for (let i = 0; i < 10; i++) {
    const next = page.getByRole("button", { name: /^التالي: / });
    const label = (await next.textContent())?.trim() ?? "";
    await next.click();
    if (label.includes(title)) return;
  }
  throw new Error(`lesson step not found: ${title}`);
}
