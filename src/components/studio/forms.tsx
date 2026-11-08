"use client";

import { useActionState } from "react";
import { Alert, Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import type { AdminFormState } from "@/app/(admin)/admin/actions";
import { addLevel, addVideoSource, approveMap, createPath, planLevelMap, saveLevelProfile, saveMapUnit, saveVideoRules } from "@/app/(studio)/studio/actions";
import { FRAMEWORK_LABELS, LANGUAGE_LABELS, type LevelProfile, type PathProfile } from "@/lib/factory/profile";

function Status({ state }: { state: AdminFormState }) {
  if (state.error) return <Alert tone="error">{state.error}</Alert>;
  if (state.message) return <Alert tone="success">{state.message}</Alert>;
  return null;
}

/** One level's row in the path profile (admin). */
export function LevelProfileForm({
  pathId,
  code,
  title,
  level,
  unitTemplates,
}: {
  pathId: string;
  code: string;
  title: string;
  level?: LevelProfile;
  unitTemplates: { key: string; title_ar: string }[];
}) {
  const [state, action] = useActionState<AdminFormState, FormData>(saveLevelProfile, {});
  const id = (n: string) => `${code}-${n}`;
  return (
    <form action={action} className="flex flex-col gap-3 rounded-xl border border-border p-4">
      <input type="hidden" name="path_id" value={pathId} />
      <input type="hidden" name="code" value={code} />
      <p className="font-semibold">
        <span dir="ltr">{code}</span> · {title}
      </p>
      <Status state={state} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field id={id("framework")} label="إطار المستوى">
          <Select id={id("framework")} name="framework" defaultValue={level?.framework ?? "cefr"}>
            {Object.entries(FRAMEWORK_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
        <Field id={id("lang")} label="لغة الفيديو والشرح">
          <Select id={id("lang")} name="video_language" defaultValue={level?.video_language ?? "ar"}>
            {Object.entries(LANGUAGE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
        <Field id={id("tpl")} label="قالب الوحدة">
          <Select id={id("tpl")} name="unit_template" defaultValue={level?.unit_template ?? "standard"}>
            {unitTemplates.map((t) => (
              <option key={t.key} value={t.key}>
                {t.title_ar}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field id={id("pl")} label="قائمة تشغيل ترتّب المستوى (وحدة لكل فيديو)" optional>
        <Input
          id={id("pl")}
          name="source_playlist"
          dir="ltr"
          defaultValue={level?.source_playlist ?? ""}
          placeholder="https://www.youtube.com/playlist?list=…"
        />
      </Field>
      <Field id={id("notes")} label="ملاحظات للوكيل عن هذا المستوى" optional>
        <Textarea id={id("notes")} name="notes_ar" rows={2} maxLength={600} defaultValue={level?.notes_ar ?? ""} />
      </Field>
      <SubmitButton size="sm" className="self-start" pendingLabel="جارٍ الحفظ…">
        احفظ {code}
      </SubmitButton>
    </form>
  );
}

/** Video rules and quality criteria of a path (admin). */
export function VideoRulesForm({ pathId, profile }: { pathId: string; profile: PathProfile }) {
  const [state, action] = useActionState<AdminFormState, FormData>(saveVideoRules, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="path_id" value={pathId} />
      <Status state={state} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field id="min_min" label="أقصر مقطع (دقائق)">
          <Input id="min_min" name="min_min" type="number" min={0.5} step={0.5} defaultValue={profile.video.min_sec / 60} />
        </Field>
        <Field id="max_min" label="أطول مقطع (دقائق)">
          <Input id="max_min" name="max_min" type="number" min={1} step={0.5} defaultValue={profile.video.max_sec / 60} />
        </Field>
        <Field id="candidates" label="عدد الفيديوهات التي يقيّمها الوكيل">
          <Input id="candidates" name="candidates" type="number" min={1} max={5} defaultValue={profile.video.candidates} />
        </Field>
      </div>
      <label className="flex min-h-11 items-center gap-2">
        <Checkbox name="captions_required" defaultChecked={profile.video.captions_required} />
        الفيديو يجب أن تكون له ترجمة نصية (ليقرأه الوكيل)
      </label>
      <Field id="criteria" label="معايير الجودة (معيار في كل سطر)">
        <Textarea id="criteria" name="criteria" rows={6} defaultValue={profile.quality.criteria.join("\n")} />
      </Field>
      <Field id="min_score" label="أقل درجة مقبولة من 5">
        <Input id="min_score" name="min_score" type="number" min={1} max={5} defaultValue={profile.quality.min_score} />
      </Field>
      <SubmitButton size="sm" className="self-start" pendingLabel="جارٍ الحفظ…">
        احفظ الشروط والمعايير
      </SubmitButton>
    </form>
  );
}

/** Adds a trusted channel or playlist (teachers and admin). */
export function AddSourceForm({ pathId, levels }: { pathId: string; levels: string[] }) {
  const [state, action] = useActionState<AdminFormState, FormData>(addVideoSource, {});
  return (
    <form action={action} className="flex flex-col gap-3 rounded-xl bg-background p-4">
      <input type="hidden" name="path_id" value={pathId} />
      <Status state={state} />
      <Field id="src-link" label="رابط القناة أو قائمة التشغيل">
        <Input id="src-link" name="link" dir="ltr" required placeholder="https://www.youtube.com/@channel" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="src-title" label="اسم القناة">
          <Input id="src-title" name="title" required maxLength={120} />
        </Field>
        <Field id="src-lang" label="لغة الشرح">
          <Select id="src-lang" name="language" defaultValue="ar">
            <option value="ar">عربي</option>
            <option value="en">إنجليزي</option>
          </Select>
        </Field>
      </div>
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm font-semibold">المستويات التي تناسبها</legend>
        <div className="flex flex-wrap gap-x-4">
          {levels.map((l) => (
            <label key={l} className="flex min-h-11 items-center gap-2" dir="ltr">
              <Checkbox name="levels" value={l} />
              {l}
            </label>
          ))}
        </div>
      </fieldset>
      <Field id="src-notes" label="ملاحظة" optional>
        <Input id="src-notes" name="notes" maxLength={300} />
      </Field>
      <SubmitButton size="sm" className="self-start" pendingLabel="جارٍ الإضافة…">
        أضف المصدر
      </SubmitButton>
    </form>
  );
}

/** Asks the agent to (re)plan a level map (admin). */
export function PlanLevelForm({ levelId, again }: { levelId: string; again: boolean }) {
  const [state, action] = useActionState<AdminFormState, FormData>(planLevelMap, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="level_id" value={levelId} />
      <Status state={state} />
      {again && (
        <Field id="feedback" label="ماذا يغيّر الوكيل في الخريطة الجديدة؟" hint="ملاحظتك تُحفظ قاعدة دائمة للوكيل في هذا المسار.">
          <Textarea id="feedback" name="feedback" rows={3} required minLength={5} maxLength={1000} />
        </Field>
      )}
      <SubmitButton className="self-start" variant={again ? "secondary" : "primary"} pendingLabel="جارٍ الإرسال…">
        {again ? "أعد تخطيط المستوى بهذه الملاحظة" : "اطلب من «عقل رفد» تخطيط هذا المستوى"}
      </SubmitButton>
    </form>
  );
}

/** The owner's approval of a level map. */
export function ApproveMapForm({ levelId, disabled }: { levelId: string; disabled: boolean }) {
  const [state, action] = useActionState<AdminFormState, FormData>(approveMap, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="level_id" value={levelId} />
      <Status state={state} />
      <SubmitButton className="self-start" disabled={disabled} pendingLabel="جارٍ الاعتماد…">
        اعتمد الخريطة
      </SubmitButton>
    </form>
  );
}

export interface EditableUnit {
  id: string;
  code: string;
  title_en: string;
  title_ar: string;
  stop_ar: string;
  situation_ar: string;
  task_ar: string;
  objectives: string[];
  grammar: string[];
  review_words: string[];
  words: { word: string; meaning_ar: string; example_en: string; pos: string }[];
}

/** Edits one unit of a draft map (teacher or admin). */
export function MapUnitForm({ unit, locked }: { unit: EditableUnit; locked: boolean }) {
  const [state, action] = useActionState<AdminFormState, FormData>(saveMapUnit, {});
  const id = (n: string) => `${unit.code}-${n}`;
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={unit.id} />
      <Status state={state} />
      <fieldset disabled={locked} className="flex flex-col gap-3 disabled:opacity-70">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id={id("ten")} label="العنوان بالإنجليزية">
            <Input id={id("ten")} name="title_en" dir="ltr" defaultValue={unit.title_en} />
          </Field>
          <Field id={id("tar")} label="العنوان بالعربية">
            <Input id={id("tar")} name="title_ar" defaultValue={unit.title_ar} />
          </Field>
        </div>
        <Field id={id("stop")} label="المحطة في رحلة حضرموت">
          <Input id={id("stop")} name="stop_ar" defaultValue={unit.stop_ar} />
        </Field>
        <Field id={id("sit")} label="الموقف">
          <Textarea id={id("sit")} name="situation_ar" rows={2} defaultValue={unit.situation_ar} />
        </Field>
        <Field id={id("task")} label="المهمة الحقيقية في نهاية الوحدة">
          <Textarea id={id("task")} name="task_ar" rows={2} defaultValue={unit.task_ar} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id={id("obj")} label="رموز الأهداف" hint="مثل: O01, O02">
            <Input id={id("obj")} name="objectives" dir="ltr" defaultValue={unit.objectives.join(", ")} />
          </Field>
          <Field id={id("gr")} label="رمز القاعدة" hint="مثل: G01">
            <Input id={id("gr")} name="grammar" dir="ltr" defaultValue={unit.grammar.join(", ")} />
          </Field>
        </div>
        <Field id={id("words")} label="الكلمات الجديدة" hint="كلمة في كل سطر: word | المعنى | example sentence | noun/verb/adjective…">
          <Textarea
            id={id("words")}
            name="words"
            rows={Math.max(6, unit.words.length + 1)}
            dir="ltr"
            className="font-mono text-sm"
            defaultValue={unit.words.map((w) => `${w.word} | ${w.meaning_ar} | ${w.example_en} | ${w.pos}`).join("\n")}
          />
        </Field>
        <Field id={id("rev")} label="كلمات المراجعة من وحدات سابقة" hint="تفصل بينها فاصلة">
          <Input id={id("rev")} name="review" dir="ltr" defaultValue={unit.review_words.join(", ")} />
        </Field>
        {!locked && (
          <SubmitButton size="sm" className="self-start" pendingLabel="جارٍ الحفظ…">
            احفظ وأعد الفحص
          </SubmitButton>
        )}
      </fieldset>
    </form>
  );
}

/** A new path (admin): name, link and icon; levels come next. */
export function CreatePathForm() {
  const [state, action] = useActionState<AdminFormState, FormData>(createPath, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <Status state={state} />
      <Field id="path-title" label="اسم المسار" hint="كما يراه الطالب، مثل: تطوير الويب من الصفر">
        <Input id="path-title" name="title" required maxLength={120} />
      </Field>
      <Field id="path-slug" label="رابط المسار (بالإنجليزية)" hint="حروف صغيرة وأرقام وشرطة، مثل web-dev. يظهر في رابط الصفحة.">
        <Input id="path-slug" name="slug" required dir="ltr" placeholder="web-dev" />
      </Field>
      <Field id="path-summary" label="وصف قصير" optional>
        <Input id="path-summary" name="summary" maxLength={300} />
      </Field>
      <Field id="path-icon" label="الأيقونة">
        <Select id="path-icon" name="icon" defaultValue="book">
          <option value="book">كتاب (لغات)</option>
          <option value="code">برمجة</option>
          <option value="database">بيانات</option>
          <option value="pen">تصميم</option>
        </Select>
      </Field>
      <SubmitButton className="self-start" pendingLabel="جارٍ الإنشاء…">
        أنشئ المسار
      </SubmitButton>
    </form>
  );
}

/** Adds a level to a path by hand (admin), with its factory settings. */
export function AddLevelForm({ pathId, unitTemplates, nextCode }: { pathId: string; unitTemplates: { key: string; title_ar: string }[]; nextCode: string }) {
  const [state, action] = useActionState<AdminFormState, FormData>(addLevel, {});
  return (
    <form action={action} className="flex flex-col gap-3 rounded-xl bg-background p-4">
      <input type="hidden" name="path_id" value={pathId} />
      <Status state={state} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field id="lvl-code" label="رمز المستوى" hint="مثل A1 أو L1">
          <Input id="lvl-code" name="code" required dir="ltr" defaultValue={nextCode} maxLength={10} />
        </Field>
        <Field id="lvl-title" label="اسم المستوى" className="sm:col-span-2">
          <Input id="lvl-title" name="title" required maxLength={80} placeholder="الأساسيات" />
        </Field>
      </div>
      <Field id="lvl-desc" label="ماذا يستطيع الطالب في نهايته" optional>
        <Textarea id="lvl-desc" name="description" rows={2} maxLength={400} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-4">
        <Field id="lvl-units" label="عدد الوحدات">
          <Input id="lvl-units" name="planned_units" type="number" min={3} max={60} defaultValue={12} />
        </Field>
        <Field id="lvl-fw" label="الإطار">
          <Select id="lvl-fw" name="framework" defaultValue="custom">
            {Object.entries(FRAMEWORK_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="lvl-lang" label="لغة الفيديو">
          <Select id="lvl-lang" name="video_language" defaultValue="ar">
            {Object.entries(LANGUAGE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="lvl-tpl" label="قالب الوحدة">
          <Select id="lvl-tpl" name="unit_template" defaultValue="standard">
            {unitTemplates.map((t) => (
              <option key={t.key} value={t.key}>
                {t.title_ar}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field id="lvl-kind" label="نوع المستوى">
        <Select id="lvl-kind" name="kind" defaultValue="general">
          <option value="general">عام</option>
          <option value="exam">استعداد لاختبار</option>
        </Select>
      </Field>
      <Field id="lvl-pl" label="قائمة تشغيل يوتيوب ترتّب المستوى (وحدة لكل فيديو)" optional>
        <Input id="lvl-pl" name="source_playlist" dir="ltr" placeholder="https://www.youtube.com/playlist?list=…" />
      </Field>
      <SubmitButton size="sm" className="self-start" pendingLabel="جارٍ الإضافة…">
        أضف المستوى
      </SubmitButton>
    </form>
  );
}
