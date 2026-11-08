/** The first-day checklist on «اليوم»: shown until the first factory unit is published. Pure, unit-tested. */

export type SetupState = {
  paths: number;
  agentPaused: boolean;
  /** Level maps the agent was asked to draw (any status but draft). */
  mapsStarted: number;
  mapsApproved: number;
  /** A map waiting for approval, to link straight to it. */
  mapInReview: string | null;
  teachers: number;
  unitsPublished: number;
};

export type SetupStep = { key: string; title: string; hint: string; href: string; done: boolean; now: boolean; anytime?: boolean };

export function setupSteps(s: SetupState): SetupStep[] {
  const steps: Omit<SetupStep, "now">[] = [
    { key: "admin", title: "أنشئ حساب المدير", hint: "", href: "/admin", done: true },
    { key: "path", title: "أضف مسار الإنجليزية", hint: "من الاستوديو ← «مسار جديد».", href: "/studio/paths/new", done: s.paths > 0 },
    { key: "agent", title: "شغّل «عقل رفد»", hint: "هو الذي يرسم الخرائط ويبني الوحدات.", href: "/admin/agent", done: !s.agentPaused },
    { key: "map", title: "اطلب خريطة المستوى الأول", hint: "يرسمها «عقل رفد» في دقائق، ويصلك إشعار.", href: "/studio", done: s.mapsStarted > 0 },
    {
      key: "approve",
      title: "راجع الخريطة واعتمدها",
      hint: "بعد الاعتماد يبدأ المصنع ببناء أول وحدة.",
      href: s.mapInReview ? `/studio/levels/${s.mapInReview}` : "/studio",
      done: s.mapsApproved > 0,
    },
    { key: "teacher", title: "أضف معلماً متطوعاً", hint: "يمكنك فعلها الآن.", href: "/admin/teachers", done: s.teachers > 0, anytime: true },
    { key: "publish", title: "راجع أول وحدة وانشرها", hint: "تظهر في «المراجعة» عندما يبنيها المصنع.", href: "/studio/review", done: s.unitsPublished > 0 },
  ];
  const current = steps.find((x) => !x.done && !x.anytime)?.key;
  return steps.map((x) => ({ ...x, now: x.key === current }));
}

export const setupDone = (steps: SetupStep[]) => steps.filter((s) => s.done).length;
