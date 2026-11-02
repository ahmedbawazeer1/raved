"use client";

import { useSyncExternalStore } from "react";
import { Companion } from "@/components/art/companion";
import { Card } from "@/components/ui/card";
import { COMPANIONS } from "@/lib/art/companion";
import { fx, prefsStore, setPrefs } from "@/lib/fx";
import { cn } from "@/lib/utils";

/** Companion choice and sounds/vibration, saved on this device. */
export function ExperienceForm() {
  const prefs = useSyncExternalStore(prefsStore.subscribe, prefsStore.getSnapshot, prefsStore.getServerSnapshot);
  return (
    <Card className="flex flex-col gap-4 p-5">
      <h2 className="text-lg font-bold">رفيق الرحلة والمؤثرات</h2>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">من يرافقك في الرحلة؟</legend>
        <div className="grid grid-cols-2 gap-3">
          {COMPANIONS.map((c) => {
            const on = prefs.companion === c.id;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setPrefs({ companion: c.id });
                  fx("pop");
                }}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-2xl border-2 bg-card pt-2 pb-2.5 font-bold shadow-[0_4px_0_var(--color-border)] transition-transform active:translate-y-1 active:shadow-none",
                  on ? "border-primary bg-primary-tint shadow-[0_4px_0_var(--color-primary)]" : "border-border",
                )}
              >
                <Companion who={c.id} mood={on ? "happy" : "idle"} wave={on} size={64} />
                {c.name}
              </button>
            );
          })}
        </div>
      </fieldset>
      <label className="flex min-h-11 items-center justify-between gap-3">
        <span>
          <span className="block font-semibold">الأصوات والاهتزاز</span>
          <span className="block text-[13px] text-muted-foreground">أطفئها إذا كنت تدرس في الفصل أو المسجد.</span>
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={prefs.effects}
          onChange={(e) => {
            setPrefs({ effects: e.target.checked });
            if (e.target.checked) fx("ok");
          }}
          className="size-6 flex-none accent-primary"
        />
      </label>
      <p className="text-xs text-muted-foreground">تُحفظ هذه الاختيارات على هذا الجهاز.</p>
    </Card>
  );
}
