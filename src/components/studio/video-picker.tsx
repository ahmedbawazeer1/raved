"use client";

import { useActionState, useState } from "react";
import { Check, ExternalLink, Play } from "lucide-react";
import { Alert, Field, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import type { AdminFormState } from "@/app/(admin)/admin/actions";
import { rebuildLesson } from "@/app/(studio)/studio/units/actions";
import { cn } from "@/lib/utils";

export type Candidate = { youtube_id: string; title: string; channel: string; current?: boolean; detail?: string };

/** Pick another video for one lesson: the agent's alternatives as cards, or a pasted YouTube link. The lesson is then rebuilt around it. */
export function VideoPicker({ unitId, lessonKey, candidates }: { unitId: string; lessonKey: string; candidates: Candidate[] }) {
  const [state, action] = useActionState<AdminFormState, FormData>(rebuildLesson, {});
  const [chosen, setChosen] = useState<string>("");
  const [preview, setPreview] = useState<string | null>(null);
  const [link, setLink] = useState("");
  const video = chosen || link;

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="unit_id" value={unitId} />
      <input type="hidden" name="lesson_key" value={lessonKey} />
      <input type="hidden" name="video" value={video} />
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.message && <Alert tone="success">{state.message}</Alert>}

      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {candidates.map((c) => {
          const sel = c.current ? !video : chosen === c.youtube_id;
          return (
            <li
              key={c.youtube_id}
              className={cn(
                "flex flex-col overflow-hidden rounded-[18px] border bg-card",
                sel ? "border-primary shadow-[0_0_0_3px_var(--color-primary-tint)]" : "border-border",
              )}
            >
              {preview === c.youtube_id ? (
                <iframe
                  className="aspect-video w-full"
                  src={`https://www.youtube-nocookie.com/embed/${c.youtube_id}?autoplay=1&rel=0`}
                  title={c.title || c.youtube_id}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setPreview(c.youtube_id)}
                  className="relative block aspect-video w-full bg-foreground"
                  aria-label={`شغّل معاينة ${c.title || c.youtube_id}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- YouTube thumbnail */}
                  <img src={`https://i.ytimg.com/vi/${c.youtube_id}/mqdefault.jpg`} alt="" className="size-full object-cover" loading="lazy" />
                  <span className="absolute inset-0 m-auto flex size-12 items-center justify-center rounded-full bg-black/55 text-white">
                    <Play className="size-6" aria-hidden="true" />
                  </span>
                  {c.current && <span className="absolute top-2 start-2 rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-white">الحالي</span>}
                </button>
              )}
              <div className="flex flex-1 flex-col gap-2 p-4">
                <b dir="ltr" className="text-start font-en text-sm">
                  {c.title || c.youtube_id}
                </b>
                <span className="text-[13px] text-muted-foreground">{[c.channel, c.detail].filter(Boolean).join(" · ") || "بديل وجده الوكيل"}</span>
                <div className="mt-auto flex gap-2 pt-1">
                  <a
                    href={`https://www.youtube.com/watch?v=${c.youtube_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-11 items-center gap-1.5 rounded-xl border border-input px-3 text-sm font-semibold text-foreground no-underline"
                  >
                    <ExternalLink className="size-4" aria-hidden="true" /> يوتيوب
                  </a>
                  {c.current ? (
                    <span className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-success-tint text-sm font-semibold text-success">
                      <Check className="size-4" aria-hidden="true" /> المختار الآن
                    </span>
                  ) : (
                    <button
                      type="button"
                      aria-pressed={chosen === c.youtube_id}
                      onClick={() => {
                        setChosen(chosen === c.youtube_id ? "" : c.youtube_id);
                        setLink("");
                      }}
                      className={cn(
                        "flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold",
                        chosen === c.youtube_id ? "bg-primary text-white" : "border border-primary text-primary",
                      )}
                    >
                      <Check className="size-4" aria-hidden="true" /> {chosen === c.youtube_id ? "اخترته" : "اختر هذا"}
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <section className="flex flex-col gap-3 rounded-[18px] border border-border bg-card p-4">
        <Field id="video-link" label="أو الصق رابط فيديو من يوتيوب" optional>
          <Input
            id="video-link"
            dir="ltr"
            value={link}
            onChange={(e) => {
              setLink(e.target.value);
              setChosen("");
            }}
            placeholder="https://www.youtube.com/watch?v=…"
          />
        </Field>
        <Field id="video-note" label="ملاحظة للوكيل" hint="مثلاً: ابدأ من الدقيقة ٢، أو الفيديو بالإنجليزية صعب. تُحفظ قاعدة دائمة." optional>
          <Textarea id="video-note" name="note" rows={2} maxLength={1000} />
        </Field>
        <p className="text-sm text-muted-foreground">
          يشاهد الوكيل الفيديو المختار، ويحدد الجزء المناسب، ويعيد كتابة هذا الدرس حوله فقط. يعود للمراجعة خلال ساعة تقريباً.
        </p>
        <SubmitButton className="self-start" disabled={!video} pendingLabel="جارٍ الإرسال…">
          أعد بناء الدرس بهذا الفيديو
        </SubmitButton>
      </section>
    </form>
  );
}
