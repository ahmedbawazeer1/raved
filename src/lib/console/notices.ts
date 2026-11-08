/** What waits for a decision: pure helpers shared by the server summary and the client bell (unit-tested). */

export type AgentState =
  | { kind: "paused" }
  | { kind: "idle" }
  | { kind: "running"; label: string; step: string | null; progress: number }
  | { kind: "failed"; label: string; error: string | null; at: string };

export type ConsoleNotice = { id: string; tone: "gold" | "red" | "blue" | "ai"; icon: NoticeIcon; title: string; detail: string; href: string };
export type NoticeIcon = "review" | "map" | "inbox" | "flag" | "bug" | "video" | "bot";

export type ConsoleSummary = {
  isAdmin: boolean;
  pendingApplications: number;
  openReports: number;
  openErrors: number;
  brokenVideos: number;
  /** Units the factory built that wait for a review (teacher first, then the admin). */
  unitsForTeacher: { id: string; code: string; title: string }[];
  unitsForAdmin: { id: string; code: string; title: string; teacherOk: boolean }[];
  mapsInReview: { levelId: string; code: string; teacherOk: boolean }[];
  agent: AgentState;
  notices: ConsoleNotice[];
};

/** Pure: the bell's items, most urgent first. */
export function noticesFor(s: Omit<ConsoleSummary, "notices">): ConsoleNotice[] {
  const out: ConsoleNotice[] = [];
  if (s.isAdmin) {
    for (const u of s.unitsForAdmin.filter((x) => x.teacherOk))
      out.push({
        id: `u${u.id}`,
        tone: "gold",
        icon: "review",
        title: `${u.code} جاهزة للنشر`,
        detail: "راجعها المعلم · تنتظر نشرك",
        href: `/studio/units/${u.id}`,
      });
    for (const m of s.mapsInReview)
      out.push({
        id: `m${m.levelId}`,
        tone: "gold",
        icon: "map",
        title: `خريطة ${m.code} تنتظر اعتمادك`,
        detail: m.teacherOk ? "راجعها المعلم" : "لم يراجعها معلم بعد",
        href: `/studio/levels/${m.levelId}`,
      });
  } else {
    for (const u of s.unitsForTeacher)
      out.push({ id: `u${u.id}`, tone: "gold", icon: "review", title: `${u.code} جاهزة لمراجعتك`, detail: u.title, href: `/studio/units/${u.id}` });
    for (const m of s.mapsInReview.filter((x) => !x.teacherOk))
      out.push({
        id: `m${m.levelId}`,
        tone: "gold",
        icon: "map",
        title: `خريطة ${m.code} جاهزة لمراجعتك`,
        detail: "راجعها ثم اضغط «راجعتها»",
        href: `/studio/levels/${m.levelId}`,
      });
  }
  if (s.agent.kind === "failed")
    out.push({ id: "agent", tone: "red", icon: "bot", title: "توقف «عقل رفد»", detail: s.agent.label, href: s.isAdmin ? "/admin/agent" : "/studio" });
  if (s.isAdmin) {
    if (s.pendingApplications)
      out.push({ id: "apps", tone: "blue", icon: "inbox", title: `${s.pendingApplications} طلبات التحاق`, detail: "تنتظر قرارك", href: "/admin/applications" });
    if (s.openReports)
      out.push({ id: "reports", tone: "red", icon: "flag", title: `${s.openReports} بلاغات من الطلاب`, detail: "مفتوحة", href: "/admin/reports" });
    if (s.brokenVideos)
      out.push({
        id: "videos",
        tone: "red",
        icon: "video",
        title: `${s.brokenVideos} فيديو معطّل`,
        detail: "اكتُشف في الفحص الأسبوعي",
        href: "/admin/reports#videos",
      });
    if (s.openErrors)
      out.push({ id: "errors", tone: "red", icon: "bug", title: `${s.openErrors} أخطاء في المنصة`, detail: "ظهرت للطلاب", href: "/admin/reports#errors" });
  }
  return out;
}

/** How many items wait for this person (the «المراجعة» badge). */
export function reviewCount(s: ConsoleSummary): number {
  return s.isAdmin
    ? s.unitsForAdmin.filter((u) => u.teacherOk).length + s.mapsInReview.length
    : s.unitsForTeacher.length + s.mapsInReview.filter((m) => !m.teacherOk).length;
}

/** The agent job's step code → what it is doing, in Arabic. */
export const STEP_AR: Record<string, string> = {
  start: "يبدأ",
  context: "يقرأ الخريطة وملاحظاتك",
  videos: "يختار الفيديو ويقسّمه على الدروس",
  lessons: "يكتب نصوص الدروس",
  critic: "المراجع الآلي يقيّم الدروس",
  rewrite: "يعيد كتابة درس بملاحظات المراجع",
  playlist: "يقرأ قائمة فيديوهات المستوى",
  frame: "يصمّم الأهداف وتسلسل القواعد",
  units: "يخطط الوحدات",
  outline: "يصمّم المستويات",
  waiting: "ينتظر دوره",
};
