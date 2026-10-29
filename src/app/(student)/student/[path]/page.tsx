import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { En } from "@/components/en";
import { JourneyMap } from "@/components/student/journey-map";
import { ProgressBar } from "@/components/student/progress-bar";
import { requireActiveStudent } from "@/lib/auth/session";
import { getCurriculum, getPrimaryPath } from "@/lib/student/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "التعلّم" };

export default async function CurriculumPage({ params, searchParams }: PageProps<"/student/[path]">) {
  const [{ path: slug }, sp] = await Promise.all([params, searchParams]);
  const { userId } = await requireActiveStudent();
  const path = await getPrimaryPath(userId);
  if (!path || path.slug !== slug) notFound();

  const curriculum = await getCurriculum(userId, path.id);
  const now = curriculum.units.find((u) => u.state === "now");
  const levelCode = typeof sp.level === "string" ? sp.level : (now?.levelCode ?? curriculum.levels[0]?.code);
  const level = curriculum.levels.find((l) => l.code === levelCode) ?? curriculum.levels[0];
  const units = curriculum.units.filter((u) => u.levelCode === level?.code);
  const doneInLevel = units.filter((u) => u.state === "done").length;

  return (
    <main className="mx-auto flex w-full max-w-[640px] flex-col gap-4 px-4 py-5">
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold">{path.title.split(":")[0]}</h1>
        <nav aria-label="المستويات" className="flex flex-wrap gap-2">
          {curriculum.levels.map((l) => {
            const levelUnits = curriculum.units.filter((u) => u.levelCode === l.code);
            const complete = levelUnits.length > 0 && levelUnits.every((u) => u.state === "done");
            return (
              <Link
                key={l.id}
                href={`/student/${path.slug}?level=${l.code}`}
                aria-current={l.code === level?.code ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-10 items-center rounded-full px-4 font-en text-sm font-semibold no-underline",
                  l.code === level?.code
                    ? "bg-primary text-white hover:text-white"
                    : complete
                      ? "bg-success-tint text-success"
                      : "bg-muted text-subtle",
                )}
              >
                {l.code}
                {complete && " ✓"}
              </Link>
            );
          })}
        </nav>
      </header>

      {level && (
        <Card className="flex flex-col gap-2 p-4">
          <div className="flex justify-between text-sm">
            <span>
              تقدمك في <En>{level.code}</En> · {level.title}
            </span>
            <span className="text-muted-foreground">
              {doneInLevel} من {units.length} وحدة
            </span>
          </div>
          <ProgressBar value={doneInLevel} max={units.length} label={`تقدمك في ${level.code}`} />
        </Card>
      )}

      {units.length === 0 ? (
        <Card className="p-4 text-sm text-muted-foreground">وحدات هذا المستوى قيد الإعداد.</Card>
      ) : (
        <JourneyMap units={units} pathSlug={path.slug} />
      )}
    </main>
  );
}
