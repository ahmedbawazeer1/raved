"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { Lock } from "lucide-react";
import { AVATAR_ITEMS, FACES, HAIR_COLORS, HAIR_STYLES, SKINS, TOPS, type AvatarConfig, type AvatarProgress } from "@shared/art/avatar";
import { Avatar } from "@/components/art/avatar";
import { Card } from "@/components/ui/card";
import { fx, prefsStore, setPrefs } from "@/lib/fx";
import { cn } from "@/lib/utils";
import { saveAvatar } from "@/app/(student)/student/settings/actions";

const chip = (on: boolean) =>
  cn(
    "min-h-11 rounded-2xl rounded-es-md border-2 bg-card px-3 text-sm font-bold transition-transform active:translate-y-0.5",
    on ? "border-primary bg-primary-tint" : "border-border",
  );

/** The avatar builder and sounds/vibration, saved on this device. Items unlock only with real progress. */
export function ExperienceForm({ progress, savedAvatar }: { progress: AvatarProgress; savedAvatar?: boolean }) {
  const prefs = useSyncExternalStore(prefsStore.subscribe, prefsStore.getSnapshot, prefsStore.getServerSnapshot);
  const cfg = prefs.avatar;
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Others see the avatar (league, arena, circles): save it on the account a moment after a change.
  const push = (next: AvatarConfig) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void saveAvatar(next), 700);
  };
  useEffect(() => {
    if (!savedAvatar) void saveAvatar(prefsStore.getSnapshot().avatar);
  }, [savedAvatar]);
  const set = (patch: Partial<AvatarConfig>) => {
    const next = { ...cfg, ...patch };
    setPrefs({ avatar: next });
    push(next);
    fx("pop");
  };
  const swatches = (list: string[], key: "skin" | "hairColor" | "top", label: string) => (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {list.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={c}
            aria-pressed={cfg[key] === c}
            onClick={() => set({ [key]: c })}
            className={cn(
              "size-11 rounded-xl border-[3px] border-card shadow-[0_0_0_2px_var(--color-border)]",
              cfg[key] === c && "shadow-[0_0_0_3px_var(--color-primary)]",
            )}
            style={{ background: c }}
          />
        ))}
      </div>
    </fieldset>
  );
  return (
    <Card className="flex flex-col gap-5 p-5">
      <h2 className="text-lg font-bold">شخصيتك والمؤثرات</h2>
      <div className="flex justify-center rounded-3xl bg-primary-tint py-4">
        <Avatar config={cfg} size={110} label="شخصيتك" />
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold">الوجه</legend>
        <div className="flex flex-wrap gap-2">
          {FACES.map((f) => (
            <button key={f.key} type="button" aria-pressed={cfg.face === f.key} onClick={() => set({ face: f.key })} className={chip(cfg.face === f.key)}>
              {f.label}
            </button>
          ))}
        </div>
      </fieldset>
      {swatches(SKINS, "skin", "البشرة")}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold">الشعر أو الحجاب</legend>
        <div className="flex flex-wrap gap-2">
          {HAIR_STYLES.map((h) => (
            <button key={h.key} type="button" aria-pressed={cfg.hair === h.key} onClick={() => set({ hair: h.key })} className={chip(cfg.hair === h.key)}>
              {h.label}
            </button>
          ))}
        </div>
      </fieldset>
      {swatches(HAIR_COLORS, "hairColor", "لون الشعر أو الحجاب")}
      {swatches(TOPS, "top", "الملابس")}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold">الإضافات · تُفتح بالتقدّم الحقيقي فقط</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {AVATAR_ITEMS.map((item) => {
            const open = item.unlocked(progress);
            const on = cfg.items.includes(item.key);
            return (
              <button
                key={item.key}
                type="button"
                aria-pressed={on}
                disabled={!open}
                onClick={() => {
                  set({ items: on ? cfg.items.filter((k) => k !== item.key) : [...cfg.items, item.key] });
                  if (!on) fx("open");
                }}
                className={cn(chip(on), "flex flex-col items-start py-2 text-start disabled:opacity-55")}
              >
                <span className="flex items-center gap-1">
                  {!open && <Lock className="size-3.5" aria-hidden="true" />}
                  {item.label}
                </span>
                <span className="text-[11px] font-semibold text-muted-foreground">{item.rule}</span>
              </button>
            );
          })}
        </div>
      </fieldset>
      <label className="flex min-h-11 items-center justify-between gap-3">
        <span>
          <span className="block font-semibold">الأصوات والحركة والاهتزاز</span>
          <span className="block text-[13px] text-muted-foreground">أطفئها إذا كنت تدرس في الفصل أو المسجد، أو إذا أزعجتك الحركة.</span>
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
