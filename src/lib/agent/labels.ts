/** Arabic labels for the agent's jobs in the admin panel. */
export const JOB_KIND_AR: Record<string, string> = {
  plan_path: "تصميم المسار",
  build_unit: "بناء وحدة",
  improve_unit: "تحسين وحدة",
  plan_level: "تخطيط خريطة مستوى",
  factory_unit: "المصنع: بناء وحدة",
  factory_lesson: "المصنع: إعادة درس",
};

export const JOB_STATUS_AR: Record<string, { label: string; tone: "muted" | "warning" | "success" | "destructive" | "primary" }> = {
  queued: { label: "في الانتظار", tone: "muted" },
  running: { label: "يعمل الآن", tone: "warning" },
  needs_review: { label: "بانتظار مراجعتك", tone: "primary" },
  approved: { label: "معتمد", tone: "success" },
  rejected: { label: "مرفوض", tone: "destructive" },
  failed: { label: "توقف", tone: "destructive" },
};
