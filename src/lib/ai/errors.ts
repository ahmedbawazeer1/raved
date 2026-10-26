/** Every AI failure the student can see, in Arabic. A failed call never uses up the daily limit. */
export type AiErrorKind = "not_configured" | "paused" | "limit" | "rate_limited" | "invalid" | "unavailable";

export const AI_ERROR_AR: Record<AiErrorKind, string> = {
  not_configured: "التقييم الآلي غير مفعّل بعد. سيُفعَّل قريباً.",
  paused: "التقييم متوقف مؤقتاً، جرّب لاحقاً.",
  limit: "وصلت إلى حدك اليومي. تستطيع المحاولة غداً.",
  rate_limited: "التقييم متوقف مؤقتاً، جرّب لاحقاً.",
  invalid: "لم نتمكن من قراءة التقييم. حاول مرة أخرى.",
  unavailable: "تعذر الاتصال بخدمة التقييم. تحقق من الاتصال وحاول مرة أخرى.",
};

export class AiError extends Error {
  constructor(
    readonly kind: AiErrorKind,
    message?: string,
  ) {
    super(message ?? kind);
    this.name = "AiError";
  }
}

/** Failures worth keeping the student's work queued for a later evaluation. */
export function isTemporary(kind: AiErrorKind): boolean {
  return kind === "rate_limited" || kind === "paused" || kind === "unavailable" || kind === "not_configured";
}
