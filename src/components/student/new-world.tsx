"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { RAFED_STAGES, type RafedStage } from "@shared/art/rafed";
import { worldFor } from "@shared/art/river";
import { Rafed, type RafedHandle } from "@/components/art/rafed";
import { Button } from "@/components/ui/button";
import { calmMotion, fx } from "@/lib/fx";

/**
 * A level is complete: the ring fills with water, the river flows into the next world's colours,
 * and Rafed grows a stage. Shown once per level on this device.
 */
export function NewWorld({ fromLevel, toLevel, stage }: { fromLevel: string; toLevel: string | null; stage: RafedStage }) {
  const key = `raved:world-seen:${fromLevel}`;
  const [open, setOpen] = useState(true);
  const box = useRef<HTMLDivElement>(null);
  const rafed = useRef<RafedHandle>(null);
  const from = worldFor(fromLevel),
    to = toLevel ? worldFor(toLevel) : null;
  const prevStage = Math.max(1, stage - 1) as RafedStage;
  const [shown, setShown] = useState<RafedStage>(prevStage);

  useEffect(() => {
    try {
      if (localStorage.getItem(key)) {
        // Already celebrated on this device.
        const t = setTimeout(() => setOpen(false), 0);
        return () => clearTimeout(t);
      }
    } catch {
      // storage unavailable: show it
    }
    const el = box.current;
    if (!el) return;
    fx("level");
    if (calmMotion()) {
      const t = setTimeout(() => setShown(stage), 0);
      return () => clearTimeout(t);
    }
    const tl = gsap.timeline();
    tl.fromTo(el.querySelector(".ring-fill"), { attr: { "stroke-dashoffset": 302 } }, { attr: { "stroke-dashoffset": 0 }, duration: 1.1, ease: "power2.inOut" })
      .fromTo(el.querySelector(".flow"), { scaleX: 0, transformOrigin: "100% 50%" }, { scaleX: 1, duration: 1, ease: "power1.inOut" }, "+=0.1")
      .add(() => {
        fx("pour");
        setShown(stage);
        void rafed.current?.play("grow");
      })
      .fromTo(el.querySelectorAll(".reveal"), { y: 14, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.15, duration: 0.4 }, "+=0.3");
    return () => {
      tl.kill();
    };
  }, [key, stage]);

  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="new-world" className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
      <div ref={box} className="relative flex w-full max-w-sm flex-col items-center gap-3 overflow-hidden rounded-3xl bg-card p-6 text-center shadow-xl">
        <div className="relative h-28 w-full overflow-hidden rounded-2xl" style={{ background: from.sky }} aria-hidden="true">
          <div
            className="flow absolute inset-0"
            style={{ background: `linear-gradient(270deg, ${from.water} 0%, ${(to ?? from).water} 55%, ${(to ?? from).sky} 100%)` }}
          />
          <svg viewBox="0 0 120 120" className="absolute start-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rtl:translate-x-1/2">
            <circle cx="60" cy="60" r="48" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="10" />
            <circle
              className="ring-fill"
              cx="60"
              cy="60"
              r="48"
              fill="none"
              stroke={(to ?? from).band}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray="302"
              strokeDashoffset="0"
              transform="rotate(-90 60 60)"
            />
            <text x="60" y="68" textAnchor="middle" fontSize="24" fontWeight="800" fill="#fff" fontFamily="Inter, sans-serif">
              {fromLevel}
            </text>
          </svg>
        </div>
        <h2 id="new-world" className="text-2xl font-bold">
          اكتمل المستوى!
        </h2>
        <p className="reveal text-muted-foreground">
          {to ? (
            <>
              النهر يتدفق إلى عالم «<b style={{ color: to.band }}>{to.name}</b>» <span className="font-en">({toLevel})</span>
            </>
          ) : (
            "أنهيت كل مستويات المسار المنشورة. مستويات جديدة في الطريق."
          )}
        </p>
        <Rafed ref={rafed} size={110} stage={shown} mood="happy" />
        <p className="reveal font-bold text-primary">رافد صار «{RAFED_STAGES[shown - 1].name}»</p>
        <Button
          size="lg"
          className="reveal w-full"
          onClick={() => {
            setOpen(false);
            try {
              localStorage.setItem(key, "1");
            } catch {
              // storage unavailable
            }
          }}
        >
          رائع
        </Button>
      </div>
    </div>
  );
}
