"use client";

import { useState } from "react";
import Link from "next/link";
import { Rafed } from "@/components/art/rafed";
import { WordBank } from "@/components/lesson/question-input";
import { Button } from "@/components/ui/button";
import { fx } from "@/lib/fx";
import { cn } from "@/lib/utils";

const ROUNDS = [
  { ar: "أنا طالب.", words: ["student.", "I", "a", "am"], answer: "I am a student." },
  { ar: "ما اسمك؟", words: ["name?", "your", "What's"], answer: "What's your name?" },
];

/** A real exercise on the home page: order the words, check, and Rafed reacts. No account needed. */
export function TryIt() {
  const [round, setRound] = useState(0);
  const [chosen, setChosen] = useState<string[]>([]);
  const [state, setState] = useState<"idle" | "right" | "wrong">("idle");
  const r = ROUNDS[round];
  const done = round === ROUNDS.length - 1 && state === "right";

  const check = () => {
    const ok = chosen.join(" ") === r.answer;
    setState(ok ? "right" : "wrong");
    fx(ok ? "ok" : "bad");
  };
  const next = () => {
    setRound((n) => n + 1);
    setChosen([]);
    setState("idle");
  };

  return (
    <div className="grid items-center gap-6 rounded-[32px] border-2 border-border bg-card p-5 shadow-[0_8px_0_var(--color-border)] md:grid-cols-[1fr_auto] md:p-8">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
          <span className="rounded-full bg-primary-tint px-3 py-1 text-primary-hover">
            تمرين <span className="font-en">{round + 1}</span> من <span className="font-en">{ROUNDS.length}</span>
          </span>
          رتّب الكلمات لتكوّن الجملة
        </div>
        <p className="text-2xl font-bold">{r.ar}</p>
        <div dir="ltr">
          <WordBank
            key={round}
            words={r.words}
            value={chosen}
            onChange={(v) => (setChosen(Array.isArray(v) ? v : []), setState("idle"))}
            disabled={state === "right"}
          />
        </div>
        <div
          role="status"
          className={cn(
            "min-h-12 rounded-2xl px-4 py-3 text-sm font-bold",
            state === "right" && "bg-[#E3F7EC] text-success",
            state === "wrong" && "bg-[#FDECEA] text-error",
            state === "idle" && "text-muted-foreground",
          )}
        >
          {state === "right" ? "أحسنت · هكذا تماماً!" : state === "wrong" ? "ليست الإجابة الصحيحة. جرّب ترتيباً آخر." : ""}
        </div>
        {done ? (
          <Button asChild variant="accent" size="lg" className="shadow-[0_5px_0_#C98210] active:translate-y-[5px] active:shadow-none">
            <Link href="/signup">أعجبتني · أنشئ حسابي مجاناً</Link>
          </Button>
        ) : state === "right" ? (
          <Button size="lg" onClick={next} className="shadow-[0_5px_0_#0A5446] active:translate-y-[5px] active:shadow-none">
            التمرين التالي
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={check}
            disabled={chosen.length < r.words.length}
            className="shadow-[0_5px_0_#0A5446] active:translate-y-[5px] active:shadow-none"
          >
            تحقّق
          </Button>
        )}
      </div>
      <div className="hidden justify-center md:flex">
        <Rafed
          size={170}
          stage={2}
          mood={state === "right" ? "happy" : state === "wrong" ? "think" : "idle"}
          move={state === "right" ? "cheer" : state === "wrong" ? "oops" : undefined}
          moveKey={`${round}-${state}`}
        />
      </div>
    </div>
  );
}
