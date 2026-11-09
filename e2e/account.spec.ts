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

test("the water league, arena, circle and friend duels open", async ({ page }) => {
  await login(page);
  await page
    .getByRole("link", { name: /الدوري/ })
    .first()
    .click();
  await expect(page.getByText(/دوري «/).first()).toBeVisible();
  // Everyone is in by default: leave, then come back.
  await page.getByRole("button", { name: "اخرج من الدوري" }).click();
  await expect(page.getByText("أنت خارج الدوري")).toBeVisible();
  await page.getByRole("button", { name: "ارجع إلى الدوري" }).click();
  await expect(page.getByRole("button", { name: "اخرج من الدوري" })).toBeVisible();

  // The arena: a round against the bot (or a clear message if the student has no words yet).
  await page.goto("/student/arena");
  await page.getByRole("link", { name: /سباق القطرات/ }).click();
  await page.getByRole("button", { name: /ضد الروبوت/ }).click();
  await expect(page.getByText("ضد!").or(page.getByRole("alert"))).toBeVisible({ timeout: 15_000 });

  // A friend circle: create, see the code, leave.
  await page.goto("/student/circle");
  if (await page.getByRole("button", { name: "اخرج من الحلقة" }).isVisible()) await page.getByRole("button", { name: "اخرج من الحلقة" }).click();
  await page.getByText("جدول المجتهدين").click();
  await page.getByRole("button", { name: "أنشئ الحلقة" }).click();
  await expect(page.getByText("هدف الأسبوع: نملأ البحيرة")).toBeVisible();
  await page.getByRole("button", { name: "اخرج من الحلقة" }).click();
  await expect(page.getByRole("button", { name: "أنشئ الحلقة" })).toBeVisible();

  await page.goto("/student/practice/games");
  await expect(page.getByText("ألعاب التدريب").first()).toBeVisible();

  await page.goto("/student/duel");
  await expect(page.getByRole("button", { name: /أنشئ تحدياً جديداً/ })).toBeVisible();
});
