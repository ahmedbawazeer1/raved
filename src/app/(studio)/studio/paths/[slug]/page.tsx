import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AddSourceForm, LevelProfileForm, VideoRulesForm } from "@/components/studio/forms";
import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { FRAMEWORK_LABELS, LANGUAGE_LABELS, parseProfile } from "@/lib/factory/profile";
import { moveVideoSource, removeVideoSource } from "../../actions";

export const metadata: Metadata = { title: "ملف المسار" };

export default async function PathProfilePage({ params }: PageProps<"/studio/paths/[slug]">) {
  const { slug } = await params;
  const { isAdmin } = await requireStaff();
  const supabase = await createClient();
  const { data: path } = await supabase.from("paths").select("id, title, levels(id, code, title, position)").eq("slug", slug).maybeSingle();
  if (!path) notFound();
  const [{ data: prof }, { data: sources }, { data: unitTemplates }] = await Promise.all([
    supabase.from("path_profiles").select("profile, updated_at").eq("path_id", path.id).maybeSingle(),
    supabase.from("video_sources").select("*").eq("path_id", path.id).order("position").order("created_at"),
    supabase.from("content_templates").select("key, title_ar").eq("kind", "unit").eq("active", true).order("key"),
  ]);
  const profile = parseProfile(prof?.profile);
  const levels = [...(path.levels ?? [])].sort((a, b) => a.position - b.position);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">
          <Link href="/studio">المسارات والمناهج</Link> ← {path.title}
        </p>
        <h1 className="text-2xl font-bold">ملف المسار: {path.title}</h1>
        <p className="max-w-3xl text-muted-foreground">
          كل ما يميز هذا المسار إعدادات هنا: المستويات ولغة فيديوهاتها، القنوات الموثوقة، شروط الفيديو ومعايير الجودة. المصنع يقرأها في كل وحدة يبنيها.
        </p>
      </header>

      <Card className="flex flex-col gap-4 p-5">
        <h2 className="text-lg font-semibold">المستويات</h2>
        {isAdmin ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {levels.map((l) => (
              <LevelProfileForm
                key={l.id}
                pathId={path.id}
                code={l.code}
                title={l.title}
                level={profile.levels.find((x) => x.code === l.code)}
                unitTemplates={unitTemplates ?? []}
              />
            ))}
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {levels.map((l) => {
              const lp = profile.levels.find((x) => x.code === l.code);
              return (
                <li key={l.id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="font-semibold">
                    <span dir="ltr">{l.code}</span> · {l.title}
                  </span>
                  {lp && <Badge tone="primary">{LANGUAGE_LABELS[lp.video_language]}</Badge>}
                  {lp && <Badge tone="muted">{FRAMEWORK_LABELS[lp.framework]}</Badge>}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="flex flex-col gap-4 p-5">
        <div>
          <h2 className="text-lg font-semibold">مصادر الفيديو الموثوقة</h2>
          <p className="text-sm text-muted-foreground">يبحث المصنع فيها بهذا الترتيب لكل درس، ولا يلجأ للبحث العام إلا إذا لم يجد فيها فيديو مناسباً.</p>
        </div>
        {!sources?.length ? (
          <p className="text-muted-foreground">لا توجد مصادر بعد.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {sources.map((s, i) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary-tint text-sm font-bold text-primary">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{s.title}</p>
                  <p className="truncate text-xs text-muted-foreground" dir="ltr">
                    {s.kind === "playlist" ? `playlist ${s.ref}` : s.ref}
                  </p>
                  {s.notes && <p className="text-xs text-muted-foreground">{s.notes}</p>}
                </div>
                <Badge tone={s.language === "ar" ? "primary" : "muted"}>{LANGUAGE_LABELS[s.language as "ar" | "en"] ?? s.language}</Badge>
                <span className="text-xs text-muted-foreground" dir="ltr">
                  {s.levels.join(", ") || "كل المستويات"}
                </span>
                <div className="flex gap-1">
                  {(["up", "down"] as const).map((dir) => (
                    <form key={dir} action={moveVideoSource}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="dir" value={dir} />
                      <button
                        type="submit"
                        aria-label={dir === "up" ? "انقل للأعلى" : "انقل للأسفل"}
                        className="flex size-11 items-center justify-center rounded-lg hover:bg-muted"
                      >
                        {dir === "up" ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />}
                      </button>
                    </form>
                  ))}
                  <form action={removeVideoSource}>
                    <input type="hidden" name="id" value={s.id} />
                    <button
                      type="submit"
                      aria-label="احذف المصدر"
                      className="flex size-11 items-center justify-center rounded-lg text-destructive hover:bg-destructive-tint"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ol>
        )}
        <AddSourceForm pathId={path.id} levels={levels.map((l) => l.code)} />
      </Card>

      <Card className="flex flex-col gap-4 p-5">
        <h2 className="text-lg font-semibold">شروط الفيديو ومعايير الجودة</h2>
        {isAdmin ? (
          <VideoRulesForm pathId={path.id} profile={profile} />
        ) : (
          <div className="flex flex-col gap-2 text-sm">
            <p>
              طول المقطع: {profile.video.min_sec / 60}–{profile.video.max_sec / 60} دقائق ·{" "}
              {profile.video.captions_required ? "ترجمة نصية مطلوبة" : "الترجمة النصية غير مطلوبة"} · يقيّم الوكيل {profile.video.candidates} فيديوهات لكل درس
            </p>
            <p>معايير الجودة (أقل درجة {profile.quality.min_score} من 5):</p>
            <ul className="list-inside list-disc text-muted-foreground">
              {profile.quality.criteria.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
}
