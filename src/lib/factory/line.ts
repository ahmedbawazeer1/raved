/** The production line («خط الإنتاج»): where each unit stands. Pure, unit-tested. */

export type StationKey = "planned" | "video" | "write" | "qa" | "teacher" | "admin" | "published" | "failed";
export type Owner = "factory" | "teacher" | "admin" | "students";

export const STATIONS: { key: Exclude<StationKey, "failed">; title: string; owner: Owner; hint: string }[] = [
  { key: "planned", title: "مخططة", owner: "factory", hint: "تنتظر دورها بالترتيب" },
  { key: "video", title: "اختيار الفيديو", owner: "factory", hint: "من المصادر الموثوقة أولاً" },
  { key: "write", title: "كتابة الدروس", owner: "factory", hint: "درساً درساً حسب القالب، والتمارين في الكود" },
  { key: "qa", title: "الفحص والناقد", owner: "factory", hint: "فحص آلي ثم مراجع آلي" },
  { key: "teacher", title: "مراجعة المعلم", owner: "teacher", hint: "يعدّل ويضغط «راجعتها»" },
  { key: "admin", title: "مراجعتك والنشر", owner: "admin", hint: "تنشرها للطلاب أو ترجعها" },
  { key: "published", title: "منشورة", owner: "students", hint: "يدرسها الطلاب" },
];

/** The agent job's step while a unit is being built → the station it is at. */
const STEP_STATION: Record<string, StationKey> = {
  start: "video",
  context: "video",
  videos: "video",
  lessons: "write",
  critic: "qa",
  rewrite: "qa",
  review: "qa",
};

export function stationOf(u: { build_status: string; teacher_ok_at: string | null }, jobStep?: string | null): StationKey {
  switch (u.build_status) {
    case "approved":
      return "published";
    case "review":
      return u.teacher_ok_at ? "admin" : "teacher";
    case "failed":
      return "failed";
    case "building":
      return (jobStep && STEP_STATION[jobStep]) || "video";
    default:
      return "planned";
  }
}
