"use client";

import { useActionState, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Alert, Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import type { AdminFormState } from "@/app/(admin)/admin/actions";
import { saveTemplate } from "@/app/(studio)/studio/actions";
import {
  EXERCISE_KINDS,
  GAMES,
  LESSON_SKILLS,
  PHASE_LABELS,
  PHASES,
  SECTION_BLOCKS,
  SECTION_SOURCES,
  SOURCE_LABELS,
  type LessonTemplateSpec,
  type TemplateSection,
  type UnitTemplateSpec,
} from "@/lib/factory/templates";

const BLOCK_LABELS: Record<(typeof SECTION_BLOCKS)[number], string> = {
  text: "شرح بالعربية",
  video: "فيديو",
  reading: "نص للقراءة",
  audio: "جمل تُقرأ بالصوت",
  table: "جدول",
  exercise: "تمارين",
  game: "لعبة",
  story: "حوار أو قصة",
  speaking_task: "مهمة تحدث",
  writing_task: "مهمة كتابة",
};
const SKILL_LABELS: Record<(typeof LESSON_SKILLS)[number], string> = {
  vocab: "مفردات",
  grammar: "قواعد",
  listening: "استماع",
  reading: "قراءة",
  speaking: "تحدث",
  writing: "كتابة",
  review: "مراجعة",
};

function move<T>(list: T[], i: number, d: number): T[] {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

function Header({ title, description, readOnly }: { title: string; description: string; readOnly: boolean }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field id="title_ar" label="اسم القالب">
        <Input id="title_ar" name="title_ar" defaultValue={title} readOnly={readOnly} />
      </Field>
      <Field id="description_ar" label="وصف قصير">
        <Input id="description_ar" name="description_ar" defaultValue={description} readOnly={readOnly} />
      </Field>
    </div>
  );
}

export function LessonTemplateEditor({
  templateKey,
  title,
  description,
  spec,
  readOnly,
}: {
  templateKey: string;
  title: string;
  description: string;
  spec: LessonTemplateSpec;
  readOnly: boolean;
}) {
  const [state, action] = useActionState<AdminFormState, FormData>(saveTemplate, {});
  const [skill, setSkill] = useState(spec.skill);
  const [minutes, setMinutes] = useState(spec.est_minutes);
  const [sections, setSections] = useState<TemplateSection[]>(spec.sections);
  const set = (i: number, patch: Partial<TemplateSection>) => setSections((s) => s.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const value: LessonTemplateSpec = { skill, est_minutes: minutes, sections };

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="kind" value="lesson" />
      <input type="hidden" name="key" value={templateKey} />
      <input type="hidden" name="spec" value={JSON.stringify(value)} />
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.message && <Alert tone="success">{state.message}</Alert>}
      <Header title={title} description={description} readOnly={readOnly} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="skill" label="مهارة الدرس">
          <Select id="skill" value={skill} disabled={readOnly} onChange={(e) => setSkill(e.target.value as typeof skill)}>
            {LESSON_SKILLS.map((s) => (
              <option key={s} value={s}>
                {SKILL_LABELS[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="minutes" label="المدة التقريبية (دقائق)">
          <Input id="minutes" type="number" min={3} max={60} value={minutes} readOnly={readOnly} onChange={(e) => setMinutes(Number(e.target.value))} />
        </Field>
      </div>

      <ol className="flex flex-col gap-3">
        {sections.map((s, i) => (
          <li key={i} className="flex flex-col gap-3 rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary-tint text-sm font-bold text-primary">{i + 1}</span>
              <b>{s.title_ar}</b>
              <span className="text-sm text-muted-foreground">
                {PHASE_LABELS[s.phase]} · {BLOCK_LABELS[s.block]} · {SOURCE_LABELS[s.source]}
              </span>
              {!readOnly && (
                <span className="ms-auto flex gap-1">
                  <Button type="button" variant="secondary" size="sm" aria-label="للأعلى" onClick={() => setSections((x) => move(x, i, -1))}>
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button type="button" variant="secondary" size="sm" aria-label="للأسفل" onClick={() => setSections((x) => move(x, i, 1))}>
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button type="button" variant="destructive" size="sm" aria-label="احذف القسم" onClick={() => setSections((x) => x.filter((_, k) => k !== i))}>
                    <Trash2 className="size-4" />
                  </Button>
                </span>
              )}
            </div>
            {!readOnly && (
              <div className="grid gap-3 sm:grid-cols-4">
                <Field id={`t${i}`} label="العنوان">
                  <Input id={`t${i}`} value={s.title_ar} onChange={(e) => set(i, { title_ar: e.target.value })} />
                </Field>
                <Field id={`p${i}`} label="المرحلة">
                  <Select id={`p${i}`} value={s.phase} onChange={(e) => set(i, { phase: e.target.value as TemplateSection["phase"] })}>
                    {PHASES.map((p) => (
                      <option key={p} value={p}>
                        {PHASE_LABELS[p]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field id={`b${i}`} label="النوع">
                  <Select id={`b${i}`} value={s.block} onChange={(e) => set(i, { block: e.target.value as TemplateSection["block"] })}>
                    {SECTION_BLOCKS.map((b) => (
                      <option key={b} value={b}>
                        {BLOCK_LABELS[b]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field id={`s${i}`} label="من يملؤه">
                  <Select id={`s${i}`} value={s.source} onChange={(e) => set(i, { source: e.target.value as TemplateSection["source"] })}>
                    {SECTION_SOURCES.map((src) => (
                      <option key={src} value={src}>
                        {SOURCE_LABELS[src]}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            )}
            {!readOnly && (s.block === "exercise" || s.block === "game") && (
              <div className="grid gap-3 sm:grid-cols-3">
                <Field
                  id={`k${i}`}
                  label={s.block === "game" ? "الألعاب المسموحة" : "أنواع التمارين"}
                  hint={(s.block === "game" ? GAMES : EXERCISE_KINDS).join(", ")}
                >
                  <Input
                    id={`k${i}`}
                    dir="ltr"
                    value={(s.kinds ?? []).join(", ")}
                    onChange={(e) =>
                      set(i, {
                        kinds: e.target.value
                          .split(/[,\s]+/)
                          .map((k) => k.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </Field>
                {s.block === "exercise" && (
                  <>
                    <Field id={`cmin${i}`} label="أقل عدد">
                      <Input
                        id={`cmin${i}`}
                        type="number"
                        min={0}
                        max={30}
                        value={s.count?.[0] ?? 3}
                        onChange={(e) => set(i, { count: [Number(e.target.value), s.count?.[1] ?? 5] })}
                      />
                    </Field>
                    <Field id={`cmax${i}`} label="أكثر عدد">
                      <Input
                        id={`cmax${i}`}
                        type="number"
                        min={0}
                        max={30}
                        value={s.count?.[1] ?? 5}
                        onChange={(e) => set(i, { count: [s.count?.[0] ?? 3, Number(e.target.value)] })}
                      />
                    </Field>
                  </>
                )}
              </div>
            )}
            <Field id={`g${i}`} label="ماذا يحتوي القسم (تعليمات للوكيل والمعلم، بالإنجليزية)">
              <Textarea id={`g${i}`} dir="ltr" rows={2} value={s.guide_en} readOnly={readOnly} onChange={(e) => set(i, { guide_en: e.target.value })} />
            </Field>
            {!readOnly && (
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <Checkbox checked={s.optional ?? false} onChange={(e) => set(i, { optional: e.target.checked || undefined })} />
                قسم اختياري للطالب
              </label>
            )}
          </li>
        ))}
      </ol>

      {!readOnly && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setSections((x) => [
                ...x,
                {
                  key: `section_${x.length + 1}`,
                  title_ar: "قسم جديد",
                  block: "text",
                  source: "model",
                  phase: "apply",
                  guide_en: "Describe what this section contains.",
                },
              ])
            }
          >
            <Plus className="size-4" aria-hidden="true" /> أضف قسماً
          </Button>
          <SubmitButton pendingLabel="جارٍ الحفظ…">احفظ القالب</SubmitButton>
        </div>
      )}
    </form>
  );
}

export function UnitTemplateEditor({
  templateKey,
  title,
  description,
  spec,
  lessonTemplates,
  readOnly,
}: {
  templateKey: string;
  title: string;
  description: string;
  spec: UnitTemplateSpec;
  lessonTemplates: { key: string; title_ar: string }[];
  readOnly: boolean;
}) {
  const [state, action] = useActionState<AdminFormState, FormData>(saveTemplate, {});
  const [value, setValue] = useState<UnitTemplateSpec>(spec);
  const num = (path: (v: UnitTemplateSpec, n: number) => UnitTemplateSpec) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValue((v) => path(v, Number(e.target.value)));
  const titleOf = (key: string) => lessonTemplates.find((l) => l.key === key)?.title_ar ?? key;

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="kind" value="unit" />
      <input type="hidden" name="key" value={templateKey} />
      <input type="hidden" name="spec" value={JSON.stringify(value)} />
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.message && <Alert tone="success">{state.message}</Alert>}
      <Header title={title} description={description} readOnly={readOnly} />

      <div className="flex flex-col gap-2">
        <h3 className="font-semibold">الدروس بالترتيب</h3>
        <ol className="flex flex-col gap-2">
          {value.lessons.map((l, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-3">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary-tint text-sm font-bold text-primary">{i + 1}</span>
              {readOnly ? (
                <b>{titleOf(l.template)}</b>
              ) : (
                <>
                  <Select
                    aria-label={`قالب الدرس ${i + 1}`}
                    value={l.template}
                    className="max-w-56"
                    onChange={(e) => setValue((v) => ({ ...v, lessons: v.lessons.map((x, k) => (k === i ? { template: e.target.value } : x)) }))}
                  >
                    {lessonTemplates.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.title_ar}
                      </option>
                    ))}
                  </Select>
                  <span className="ms-auto flex gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      aria-label="للأعلى"
                      onClick={() => setValue((v) => ({ ...v, lessons: move(v.lessons, i, -1) }))}
                    >
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      aria-label="للأسفل"
                      onClick={() => setValue((v) => ({ ...v, lessons: move(v.lessons, i, 1) }))}
                    >
                      <ArrowDown className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      aria-label="احذف الدرس"
                      onClick={() => setValue((v) => ({ ...v, lessons: v.lessons.filter((_, k) => k !== i) }))}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </span>
                </>
              )}
            </li>
          ))}
        </ol>
        {!readOnly && (
          <Button
            type="button"
            variant="secondary"
            className="self-start"
            onClick={() => setValue((v) => ({ ...v, lessons: [...v.lessons, { template: lessonTemplates[0]?.key ?? "vocab" }] }))}
          >
            <Plus className="size-4" aria-hidden="true" /> أضف درساً
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {(
          [
            ["objectives", "الأهداف في الوحدة"],
            ["new_words", "الكلمات الجديدة"],
            ["review_words", "كلمات المراجعة"],
          ] as const
        ).map(([k, label]) => (
          <fieldset key={k} className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-semibold">{label}</legend>
            <div className="flex items-center gap-2">
              <Input
                aria-label={`${label}: الأقل`}
                type="number"
                min={0}
                max={30}
                value={value[k][0]}
                readOnly={readOnly}
                onChange={num((v, n) => ({ ...v, [k]: [n, v[k][1]] }))}
              />
              <span>–</span>
              <Input
                aria-label={`${label}: الأكثر`}
                type="number"
                min={0}
                max={30}
                value={value[k][1]}
                readOnly={readOnly}
                onChange={num((v, n) => ({ ...v, [k]: [v[k][0], n] }))}
              />
            </div>
          </fieldset>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field id="qmin" label="أسئلة الاختبار: الأقل">
          <Input
            id="qmin"
            type="number"
            min={5}
            max={20}
            value={value.quiz.min}
            readOnly={readOnly}
            onChange={num((v, n) => ({ ...v, quiz: { ...v.quiz, min: n } }))}
          />
        </Field>
        <Field id="qmax" label="أسئلة الاختبار: الأكثر">
          <Input
            id="qmax"
            type="number"
            min={5}
            max={20}
            value={value.quiz.max}
            readOnly={readOnly}
            onChange={num((v, n) => ({ ...v, quiz: { ...v.quiz, max: n } }))}
          />
        </Field>
        <Field id="qpass" label="نسبة النجاح %">
          <Input
            id="qpass"
            type="number"
            min={50}
            max={100}
            value={value.quiz.pass_percent}
            readOnly={readOnly}
            onChange={num((v, n) => ({ ...v, quiz: { ...v.quiz, pass_percent: n } }))}
          />
        </Field>
      </div>
      {!readOnly && (
        <SubmitButton className="self-start" pendingLabel="جارٍ الحفظ…">
          احفظ القالب
        </SubmitButton>
      )}
    </form>
  );
}
