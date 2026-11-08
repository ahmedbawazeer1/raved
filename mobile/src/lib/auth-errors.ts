/** Supabase auth errors in simple Arabic (same wording as the web app). */
export function authErrorAr(message: string | undefined): string {
  const m = (message ?? "").toLowerCase();
  if (m.includes("invalid login")) return "البريد أو كلمة المرور غير صحيحة.";
  if (m.includes("email not confirmed")) return "أكّد بريدك أولاً من الرسالة التي وصلتك، ثم سجّل الدخول.";
  if (m.includes("network") || m.includes("fetch")) return "تعذر الاتصال. تأكد من الإنترنت وحاول مرة أخرى.";
  if (m.includes("rate")) return "محاولات كثيرة. انتظر قليلاً ثم حاول مرة أخرى.";
  return "حدث خطأ. حاول مرة أخرى.";
}
