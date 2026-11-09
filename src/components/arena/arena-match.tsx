"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Bot, Globe, Swords } from "lucide-react";
import { parseAvatar, type AvatarConfig } from "@shared/art/avatar";
import { GAME_INFO, opponentAt, type ArenaFinish, type ArenaGame, type ArenaMode, type ArenaRun } from "@shared/arena/games";
import { answerArena, finishArena, startArena } from "@/app/(student)/student/arena/actions";
import { Avatar } from "@/components/art/avatar";
import { Rafed } from "@/components/art/rafed";
import { Celebrate } from "@/components/art/celebrate";
import { GameIcon } from "@/components/arena/game-icon";
import { GAMES, type Feedback } from "@/components/arena/arena-games";
import { Button } from "@/components/ui/button";
import { fx, prefsStore } from "@/lib/fx";
import { cn } from "@/lib/utils";

type Phase = "mode" | "search" | "vs" | "count" | "play" | "done";

/** A fighter's portrait: the student's avatar, a recorded student's avatar, or Rafed for the bot. */
function Fighter({ avatar, name, side, mood }: { avatar: AvatarConfig | null; name: string; side: "me" | "op"; mood?: "win" | "lose" }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1",
        side === "me" ? "motion-safe:animate-[vs-in-start_.5s_ease-out]" : "motion-safe:animate-[vs-in-end_.5s_ease-out]",
      )}
    >
      {avatar ? (
        <Avatar config={avatar} size={96} mouth={mood === "lose" ? "sad" : "smile"} move={mood === "win" ? "cheer" : undefined} moveKey={mood} />
      ) : (
        <Rafed size={96} stage={3} mood={mood === "lose" ? "sad" : mood === "win" ? "happy" : "idle"} />
      )}
      <b className="text-sm">{name}</b>
    </div>
  );
}

/** A bottle that fills with right answers (2.5D glass, water from the bottom). */
function Bottle({ value, total, colour, label }: { value: number; total: number; colour: string; label: string }) {
  const p = total ? value / total : 0;
  return (
    <div className="flex flex-col items-center gap-1" aria-label={`${label}: ${value} من ${total}`} role="img">
      <div className="relative h-24 w-12 overflow-hidden rounded-[14px_14px_18px_18px] border-[3px] border-white/90 bg-white/40 shadow-[inset_0_0_0_2px_rgba(0,0,0,.06)]">
        <div className="absolute inset-x-0 bottom-0 transition-[height] duration-500 ease-out" style={{ height: `${p * 100}%`, background: colour }}>
          <div className="absolute inset-x-0 top-0 h-1.5 bg-white/40" />
        </div>
        <div className="absolute inset-y-2 start-1.5 w-1.5 rounded-full bg-white/50" />
      </div>
      <b className="font-en text-sm" dir="ltr">
        {value}/{total}
      </b>
    </div>
  );
}

export function ArenaMatch({ game }: { game: ArenaGame }) {
  const prefs = useSyncExternalStore(prefsStore.subscribe, prefsStore.getSnapshot, prefsStore.getServerSnapshot);
  const [phase, setPhase] = useState<Phase>("mode");
  const [mode, setMode] = useState<ArenaMode>("online");
  const [run, setRun] = useState<ArenaRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(3);
  const [index, setIndex] = useState(0);
  const [right, setRight] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [opp, setOpp] = useState({ answered: 0, right: 0 });
  const [result, setResult] = useState<ArenaFinish | null>(null);
  const [cheer, setCheer] = useState<string | null>(null);
  const started = useRef(0);
  const busy = useRef(false);
  const info = GAME_INFO[game];

  const begin = async (m: ArenaMode) => {
    setMode(m);
    setError(null);
    setPhase("search");
    fx("whoosh");
    const [res] = await Promise.all([startArena(game, m), new Promise((r) => setTimeout(r, 1400))]);
    if (!res.run) {
      setError(res.error ?? "تعذّر بدء اللعبة.");
      setPhase("mode");
      return;
    }
    setRun(res.run);
    setIndex(0);
    setRight(0);
    setFeedback(null);
    setOpp({ answered: 0, right: 0 });
    setResult(null);
    setCount(3);
    setPhase("vs");
    fx("slam");
  };

  // VS → 3, 2, 1 → play.
  useEffect(() => {
    if (phase === "vs") {
      const t = setTimeout(() => setPhase("count"), 1300);
      return () => clearTimeout(t);
    }
    if (phase !== "count") return;
    fx("tick");
    let n = 3;
    const t = setInterval(() => {
      n -= 1;
      if (n === 0) {
        clearInterval(t);
        started.current = performance.now();
        setPhase("play");
        fx("open");
      } else {
        setCount(n);
        fx("tick");
      }
    }, 650);
    return () => clearInterval(t);
  }, [phase]);

  // The opponent's bottle fills along their recorded timeline.
  useEffect(() => {
    if (phase !== "play" || !run) return;
    const t = setInterval(() => setOpp(opponentAt(run.opponent, performance.now() - started.current)), 250);
    return () => clearInterval(t);
  }, [phase, run]);

  const finish = useCallback(async (r: ArenaRun) => {
    const res = await finishArena(r.id);
    setOpp({ answered: r.opponent.timeline?.length ?? 0, right: r.opponent.score });
    setResult(res);
    setPhase("done");
    fx(res?.won ? "level" : "pour");
  }, []);

  const onAnswer = useCallback(
    async (answer: string) => {
      if (!run || busy.current) return;
      busy.current = true;
      const res = await answerArena(run.id, index, answer);
      const ok = Boolean(res?.ok);
      setFeedback({ ok, answer: res?.answer ?? null, given: answer });
      if (ok) setRight((n) => n + 1);
      fx(ok ? "drop" : "bad");
      const last = index + 1 >= run.total;
      setTimeout(
        () => {
          busy.current = false;
          setFeedback(null);
          if (last) void finish(run);
          else setIndex((i) => i + 1);
        },
        ok ? 650 : 1500,
      );
    },
    [run, index, finish],
  );

  const opAvatar = run?.opponent.kind === "ghost" && run.opponent.avatar ? parseAvatar(run.opponent.avatar) : null;
  const Game = GAMES[game];

  if (phase === "mode")
    return (
      <div className="flex flex-col gap-4">
        <section className="flex items-center gap-3 rounded-3xl bg-card p-4 shadow-sm">
          <GameIcon game={game} size={64} />
          <div>
            <h1 className="text-xl font-bold">{info.name}</h1>
            <p className="text-sm text-muted-foreground">{info.howTo}</p>
          </div>
        </section>
        {error && (
          <p role="alert" className="rounded-2xl bg-warning-tint p-3 text-sm text-warning">
            {error}
          </p>
        )}
        <h2 className="font-bold">اختر الطريقة</h2>
        {[
          { m: "online" as const, icon: Globe, title: "أونلاين", sub: "خصم حقيقي من مستواك (جولة مسجّلة)" },
          { m: "bot" as const, icon: Bot, title: "ضد الروبوت", sub: "خصم آلي بمستواك" },
        ].map(({ m, icon: Icon, title, sub }) => (
          <button
            key={m}
            type="button"
            onClick={() => void begin(m)}
            className="flex min-h-16 items-center gap-3 rounded-2xl rounded-es-md border-2 border-border bg-card p-3 text-start shadow-[0_4px_0_var(--color-border)] hover:border-primary active:translate-y-1 active:shadow-none"
          >
            <Icon className="size-7 text-primary" aria-hidden="true" />
            <span className="flex flex-col">
              <b>{title}</b>
              <span className="text-xs text-muted-foreground">{sub}</span>
            </span>
          </button>
        ))}
        <Link
          href="/student/duel"
          className="flex min-h-16 items-center gap-3 rounded-2xl rounded-es-md border-2 border-border bg-card p-3 text-foreground no-underline shadow-[0_4px_0_var(--color-border)] hover:border-primary hover:text-foreground"
        >
          <Swords className="size-7 text-primary" aria-hidden="true" />
          <span className="flex flex-col">
            <b>مع صديق</b>
            <span className="text-xs text-muted-foreground">برمز التحدي</span>
          </span>
        </Link>
      </div>
    );

  if (phase === "search")
    return (
      <div className="flex flex-col items-center gap-6 py-10" aria-live="polite">
        <div className="relative flex size-48 items-center justify-center">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="absolute inset-0 rounded-full border-4 border-[#2E9BD6] motion-safe:animate-[search-ring_1.8s_ease-out_infinite]"
              style={{ animationDelay: `${i * 0.6}s` }}
            />
          ))}
          <Avatar config={prefs.avatar} size={90} />
        </div>
        <b className="text-lg">{mode === "online" ? "نبحث عن خصم…" : "نجهّز الروبوت…"}</b>
        <span className="text-sm text-muted-foreground">من مستواك</span>
      </div>
    );

  if (!run) return null;

  if (phase === "vs" || phase === "count")
    return (
      <div className="flex flex-col items-center gap-6 py-8" aria-live="polite">
        <div className="flex w-full items-center justify-around">
          <Fighter avatar={prefs.avatar} name="أنت" side="me" />
          <b className="text-4xl text-accent motion-safe:animate-[pop-in_.4s]">ضد!</b>
          <Fighter avatar={opAvatar} name={run.opponent.name} side="op" />
        </div>
        {run.opponent.fallback && <p className="text-center text-xs text-muted-foreground">لم نجد أحداً الآن، فستلعب ضد الروبوت.</p>}
        {phase === "count" && (
          <b key={count} className="font-en text-7xl text-primary motion-safe:animate-[pop-in_.4s]">
            {count}
          </b>
        )}
      </div>
    );

  if (phase === "play") {
    const q = run.questions[index];
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-end justify-between rounded-3xl bg-[linear-gradient(180deg,#DDF6EC,#C9F1FF)] px-5 py-3">
          <Bottle value={right} total={run.total} colour="linear-gradient(180deg,#5CC8F0,#1C6FA3)" label="أنت" />
          <div className="flex flex-col items-center pb-6 text-sm">
            <b>{info.name}</b>
            <span className="font-en text-muted-foreground" dir="ltr">
              {index + 1} / {run.total}
            </span>
          </div>
          <Bottle value={opp.right} total={run.total} colour="linear-gradient(180deg,#FFD27A,#C77F06)" label={run.opponent.name} />
        </div>
        <div key={index} className="motion-safe:animate-[rise-in_.3s_ease-out]">
          <Game q={q} onAnswer={onAnswer} feedback={feedback} right={right} total={run.total} />
        </div>
      </div>
    );
  }

  // done
  const won = Boolean(result?.won);
  const close = result ? Math.abs(result.score - result.opponent_score) <= 1 : false;
  return (
    <div className="relative flex flex-col items-center gap-4 py-4 text-center">
      {won && <Celebrate id="arena" />}
      <div className="flex w-full items-center justify-around">
        <Fighter avatar={prefs.avatar} name="أنت" side="me" mood={won ? "win" : "lose"} />
        <Fighter avatar={opAvatar} name={run.opponent.name} side="op" mood={won ? "lose" : "win"} />
      </div>
      <h1 className="text-3xl font-bold">{won ? "فزت!" : close ? "خسارة قريبة!" : "المرة القادمة لك!"}</h1>
      {result ? (
        <div className="grid w-full grid-cols-3 gap-2">
          <div className="rounded-2xl bg-card p-3">
            <small className="text-muted-foreground">نتيجتك</small>
            <b className="block font-en text-2xl">{result.score}</b>
          </div>
          <div className="rounded-2xl bg-card p-3">
            <small className="text-muted-foreground">الخصم</small>
            <b className="block font-en text-2xl">{result.opponent_score}</b>
          </div>
          <div className="rounded-2xl bg-primary-tint p-3">
            <small className="text-primary-hover">قطرات</small>
            <b className="block font-en text-2xl text-primary">+{result.drops}</b>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">تعذّر حفظ النتيجة. تحقّق من الاتصال.</p>
      )}
      {result && result.drops === 0 && result.score * 2 < result.total && (
        <p className="text-sm text-muted-foreground">أجب عن نصف الأسئلة صحيحاً لتأخذ قطرات اللعبة.</p>
      )}
      <div className="flex gap-2" aria-label="ردود سريعة">
        {["👏 تصفيق", "🌟 أحسنت", "💪 قوة"].map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => {
              setCheer(r);
              fx("pop");
            }}
            className={cn(
              "min-h-11 rounded-full border-2 border-border bg-card px-3 text-sm",
              cheer === r && "border-primary motion-safe:animate-[pop-in_.3s]",
            )}
          >
            {r}
          </button>
        ))}
      </div>
      <small className="text-muted-foreground">ردود جاهزة فقط · لا رسائل</small>
      <div className="flex w-full flex-col gap-2">
        <Button size="lg" onClick={() => void begin(mode)}>
          {won ? "العب مرة أخرى" : "حاول مرة أخرى"}
        </Button>
        <Button asChild size="lg" variant="secondary">
          <Link href="/student/arena">الساحة</Link>
        </Button>
      </div>
    </div>
  );
}
