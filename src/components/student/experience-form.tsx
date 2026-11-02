"use client";

import { useSyncExternalStore } from "react";
import { Companion } from "@/components/art/companion";
import { Card } from "@/components/ui/card";
import { COMPANIONS } from "@/lib/art/companion";
import { HEADWEAR_ITEMS, HIJAB_ITEMS, isUnlocked, wearable } from "@/lib/art/wardrobe";
import { fx, prefsStore, setPrefs } from "@/lib/fx";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";

/** Companion choice and sounds/vibration, saved on this device. */
export function ExperienceForm({ stamps }: { stamps: number }) {
  const prefs = useSyncExternalStore(prefsStore.subscribe, prefsStore.getSnapshot, prefsStore.getServerSnapshot);
  const reem = prefs.companion === "reem";
  const items = reem ? HIJAB_ITEMS : HEADWEAR_ITEMS;
  const current = wearable(items, reem ? prefs.hijab : prefs.headwear, stamps);
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
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">
          خزانة {reem ? "ريم" : "حمزة"} · تُفتح بالطوابع (عندك {stamps})
        </legend>
        <div className="grid grid-cols-4 gap-2">
          {items.map((item) => {
            const open = isUnlocked(item, stamps);
            const on = current === item.key;
            return (
              <button
                key={item.key}
                type="button"
                aria-pressed={on}
                disabled={!open}
                onClick={() => {
                  setPrefs(reem ? { hijab: item.key } : { headwear: item.key as "kufi" | "emama" | "none" });
                  fx("pop");
                }}
                className={cn(
                  "flex min-h-11 flex-col items-center gap-0.5 rounded-2xl border-2 bg-card px-1 pt-1 pb-1.5 text-[11px] font-bold disabled:opacity-55",
                  on ? "border-primary bg-primary-tint" : "border-border",
                )}
              >
                <Companion
                  who={reem ? "reem" : "hamza"}
                  headwear={reem ? "kufi" : (item.key as "kufi" | "emama" | "none")}
                  hijab={reem ? item.key : "plum"}
                  size={40}
                  className={open ? undefined : "grayscale"}
                />
                {item.label}
                {!open && (
                  <span className="flex items-center gap-0.5 text-[10px] font-semibold text-muted-foreground">
                    <Lock className="size-3" aria-hidden="true" />
                    {item.stamps} طوابع
                  </span>
                )}
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
