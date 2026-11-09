"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { gsap } from "gsap";
import { AVATAR_ITEMS, type AvatarItem } from "@shared/art/avatar";
import { saveAvatar } from "@/app/(student)/student/settings/actions";
import { Avatar } from "@/components/art/avatar";
import { Button } from "@/components/ui/button";
import { calmMotion, fx, prefsStore, setPrefs } from "@/lib/fx";

const SEEN = "raved:items-seen";

function readSeen(): AvatarItem[] | null {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(SEEN) ?? "null");
    return Array.isArray(v) ? (v as AvatarItem[]) : null;
  } catch {
    return null;
  }
}
function writeSeen(items: AvatarItem[]) {
  try {
    localStorage.setItem(SEEN, JSON.stringify([...new Set(items)]));
  } catch {
    // storage unavailable
  }
}

/**
 * A new avatar item was unlocked by real progress: a shell opens, then the avatar wears it.
 * The first visit only records what is already unlocked (no gift storm for old students).
 */
export function AvatarGift({ unlocked }: { unlocked: AvatarItem[] }) {
  const prefs = useSyncExternalStore(prefsStore.subscribe, prefsStore.getSnapshot, prefsStore.getServerSnapshot);
  const [item, setItem] = useState<AvatarItem | null>(null);
  const [worn, setWorn] = useState(false);
  const shell = useRef<SVGSVGElement>(null);
  const key = unlocked.join();

  useEffect(() => {
    const now = key ? (key.split(",") as AvatarItem[]) : [];
    const seen = readSeen();
    if (!seen) {
      writeSeen(now);
      return;
    }
    const fresh = now.find((k) => !seen.includes(k));
    if (!fresh) return;
    const t = setTimeout(() => setItem(fresh), 600);
    return () => clearTimeout(t);
  }, [key]);

  useEffect(() => {
    const el = shell.current;
    if (!item || !el) return;
    fx("open");
    if (calmMotion()) {
      gsap.set(el.querySelector(".lid"), { rotation: -70, transformOrigin: "20% 100%" });
      return;
    }
    const tl = gsap
      .timeline()
      .fromTo(el, { scale: 0.4, y: 40 }, { scale: 1, y: 0, duration: 0.5, ease: "back.out(1.6)" })
      .to(el, { rotation: 4, yoyo: true, repeat: 3, duration: 0.08 })
      .to(el.querySelector(".lid"), { rotation: -70, transformOrigin: "20% 100%", duration: 0.5, ease: "back.out(2)" })
      .fromTo(el.querySelector(".glow"), { scale: 0, transformOrigin: "50% 50%" }, { scale: 1, duration: 0.4 }, "<0.1")
      .add(() => fx("level"));
    return () => {
      tl.kill();
    };
  }, [item]);

  if (!item) return null;
  const info = AVATAR_ITEMS.find((i) => i.key === item)!;
  const close = (wear: boolean) => {
    if (wear) {
      const next = { ...prefs.avatar, items: [...new Set([...prefs.avatar.items, item])] };
      setPrefs({ avatar: next });
      void saveAvatar(next);
      setWorn(true);
      fx("pop");
    }
    writeSeen([...(readSeen() ?? []), item]);
    if (!wear) setItem(null);
    else setTimeout(() => setItem(null), 1400);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gift-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center"
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-3xl bg-card p-6 text-center shadow-xl motion-safe:animate-[sheet-up_.35s_ease-out]">
        <small className="font-semibold text-muted-foreground">إضافة جديدة للأفتار</small>
        {worn ? (
          <Avatar config={{ ...prefs.avatar }} size={130} move="cheer" moveKey={item} />
        ) : (
          <svg ref={shell} viewBox="0 0 160 130" className="w-44" aria-hidden="true">
            <defs>
              <radialGradient id="shell-g" cx="0.3" cy="0.25" r="0.9">
                <stop offset="0" stopColor="#FFE3D6" />
                <stop offset="0.6" stopColor="#F7A98F" />
                <stop offset="1" stopColor="#D9735A" />
              </radialGradient>
            </defs>
            <ellipse cx="80" cy="118" rx="56" ry="7" fill="#000" opacity=".1" />
            <path d="M24 92 Q80 128 136 92 L130 84 Q80 106 30 84Z" fill="url(#shell-g)" />
            <circle className="glow" cx="80" cy="82" r="16" fill="#FFF6D6" stroke="#F5A524" strokeWidth="3" />
            <g className="lid">
              <path d="M28 86 Q30 30 80 26 Q130 30 132 86 Q80 100 28 86Z" fill="url(#shell-g)" />
              {[-36, -18, 0, 18, 36].map((dx) => (
                <path key={dx} d={`M80 30 Q${80 + dx * 1.1} 60 ${80 + dx * 1.4} 90`} stroke="#D9735A" strokeWidth="2.5" fill="none" opacity=".55" />
              ))}
              <ellipse cx="58" cy="46" rx="10" ry="5" fill="#fff" opacity=".45" transform="rotate(-25 58 46)" />
            </g>
          </svg>
        )}
        <h2 id="gift-title" className="text-2xl font-bold">
          {worn ? "تبدو رائعاً!" : `فتحت «${info.label}»!`}
        </h2>
        <p className="text-sm text-muted-foreground">{info.rule}</p>
        {!worn && (
          <div className="flex w-full flex-col gap-2">
            <Button size="lg" onClick={() => close(true)}>
              البسها
            </Button>
            <Button size="lg" variant="secondary" onClick={() => close(false)}>
              لاحقاً
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
