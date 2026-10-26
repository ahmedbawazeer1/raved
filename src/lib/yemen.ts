/** Yemen-specific helpers (phone numbers, school grades and streams). */

/**
 * Normalises a Yemeni mobile number to +9677XXXXXXXX.
 * Accepts spaces/dashes, an optional +967 / 00967 / 967 prefix, or a leading 0.
 * Returns null when the number is not a valid Yemeni mobile (9 digits starting with 7).
 */
export function normalizeYemeniMobile(input: string): string | null {
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  let digits = input
    .trim()
    .replace(/[٠-٩]/g, (d) => String(arabicDigits.indexOf(d)))
    .replace(/[\s\-().]/g, "");

  if (digits.startsWith("+967")) digits = digits.slice(4);
  else if (digits.startsWith("00967")) digits = digits.slice(5);
  else if (digits.startsWith("967") && digits.length === 12) digits = digits.slice(3);
  else if (digits.startsWith("0") && digits.length === 10) digits = digits.slice(1);

  return /^7\d{8}$/.test(digits) ? `+967${digits}` : null;
}

/** "+967771234567" → "77 123 4567" (local display, without the country code). */
export function formatYemeniMobileLocal(phone: string): string {
  const local = phone.replace(/^\+967/, "");
  return `${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`;
}

/** Masks all but the last 3 digits, e.g. for admin lists. */
export function maskPhone(phone: string): string {
  const local = phone.replace(/^\+967/, "");
  return `+967 ${"•".repeat(Math.max(local.length - 3, 0))}${local.slice(-3)}`;
}

export const GRADES = [
  { value: 1, label: "الأول الثانوي" },
  { value: 2, label: "الثاني الثانوي" },
  { value: 3, label: "الثالث الثانوي" },
] as const;

export const STREAMS = [
  { value: "science", label: "علمي" },
  { value: "literary", label: "أدبي" },
  { value: "undecided", label: "لم أختر بعد" },
] as const;

export type Stream = (typeof STREAMS)[number]["value"];

export function gradeLabel(grade: number | null | undefined): string {
  return GRADES.find((g) => g.value === grade)?.label ?? "—";
}

export function streamLabel(stream: string | null | undefined): string {
  return STREAMS.find((s) => s.value === stream)?.label ?? "—";
}

/** Whole years between a YYYY-MM-DD birth date and `now`. */
export function ageFrom(birthDate: string, now: Date = new Date()): number {
  const [y, m, d] = birthDate.split("-").map(Number);
  let age = now.getFullYear() - y;
  const beforeBirthday = now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d);
  if (beforeBirthday) age -= 1;
  return age;
}
