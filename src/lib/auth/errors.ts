/** Arabic messages for Supabase Auth and database function errors. */
const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: "البريد أو كلمة المرور غير صحيحة.",
  email_not_confirmed: "أكّد بريدك أولاً: افتح الرسالة التي أرسلناها لك واضغط الرابط.",
  user_already_exists: "يوجد حساب بهذا البريد. سجّل الدخول، أو استعد كلمة المرور.",
  email_exists: "يوجد حساب بهذا البريد. سجّل الدخول، أو استعد كلمة المرور.",
  weak_password: "كلمة المرور ضعيفة. استخدم 8 أحرف على الأقل، وفيها أرقام وحروف.",
  over_email_send_rate_limit: "أرسلنا رسائل كثيرة لهذا البريد. انتظر قليلاً ثم حاول مرة أخرى.",
  over_request_rate_limit: "محاولات كثيرة. انتظر دقيقة ثم حاول مرة أخرى.",
  email_address_invalid: "البريد الإلكتروني غير صحيح.",
  signup_disabled: "التسجيل مغلق مؤقتاً.",
  same_password: "اختر كلمة مرور مختلفة عن القديمة.",
  otp_expired: "انتهت صلاحية الرابط. اطلب رابطاً جديداً.",
  flow_state_expired: "انتهت صلاحية الرابط. اطلب رابطاً جديداً.",
  provider_disabled: "الدخول بحساب Google غير مفعّل بعد.",
};

export function authErrorMessage(error: { code?: string; message?: string; status?: number } | null | undefined): string {
  if (!error) return "حدث خطأ غير متوقع. حاول مرة أخرى.";
  if (error.code && AUTH_MESSAGES[error.code]) return AUTH_MESSAGES[error.code];
  if (error.status === 429) return AUTH_MESSAGES.over_request_rate_limit;
  if (error.message?.toLowerCase().includes("fetch")) return "تعذر الاتصال. تحقق من الإنترنت وحاول مرة أخرى.";
  return "حدث خطأ غير متوقع. حاول مرة أخرى.";
}

const DB_MESSAGES: Record<string, string> = {
  not_authenticated: "انتهت جلستك. سجّل الدخول مرة أخرى.",
  application_not_found: "لم نجد طلبك. ابدأ من الخطوة الأولى.",
  application_not_editable: "طلبك أُرسل ولا يمكن تعديله الآن.",
  profile_incomplete: "أكمل بياناتك في الخطوة الأولى أولاً.",
  path_required: "اختر المسار الذي تبدأ به.",
  goal_incomplete: "أكمل الامتحان والموعد والدقائق اليومية.",
  recommendation_required: "ارفع توصية المعلم قبل الإرسال.",
  consent_required: "يلزم موافقة ولي الأمر والموافقة على سياسة الخصوصية.",
  forbidden: "ليست لديك صلاحية لهذا الإجراء.",
  note_required: "اكتب ملاحظة للطالب توضح السبب.",
  application_not_reviewable: "هذا الطلب لا يحتاج قراراً الآن.",
  path_not_published: "انشر المسار أولاً ثم أرسل الإشعار.",
  invalid_recommendation_path: "ملف التوصية غير صالح. ارفعه مرة أخرى.",
  forbidden_application_change: "لا يمكن تعديل هذا الطلب الآن.",
};

/** Maps an error raised by our SQL functions (`raise exception 'code'`) to Arabic. */
export function dbErrorMessage(error: { message?: string } | null | undefined): string {
  const code = error?.message?.trim();
  return (code && DB_MESSAGES[code]) || "حدث خطأ غير متوقع. حاول مرة أخرى.";
}
