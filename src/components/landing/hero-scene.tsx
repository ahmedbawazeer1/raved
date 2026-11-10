"use client";

import { useEffect, useMemo, useRef } from "react";
import { gsap } from "gsap";
import { DEFAULT_AVATAR } from "@shared/art/avatar";
import { riverMarkup, WORLDS } from "@shared/art/river";
import { Rafed } from "@/components/art/rafed";

/**
 * The hero's picture: the product itself. A phone showing the river map (flowing water, the boat
 * bobbing, ripples on today's unit), Rafed waving beside it and drops floating up.
 */
export function HeroScene() {
  const box = useRef<HTMLDivElement>(null);
  const { markup, layout } = useMemo(
    () =>
      riverMarkup({
        world: WORLDS.spring,
        id: "hero",
        avatar: { ...DEFAULT_AVATAR, hair: "hijab", hairColor: "#7A52D6", top: "#F5A524", skin: "#E9BC96" },
        nodes: [
          { state: "done", label: "الوحدة 1" },
          { state: "done", label: "الوحدة 2" },
          { state: "now", label: "الوحدة 3" },
          { state: "locked", label: "الوحدة 4" },
        ],
      }),
    [],
  );

  useEffect(() => {
    const el = box.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const q = (s: string) => el.querySelectorAll(s);
    const tls = [
      gsap.to(q(".flow"), { attr: { "stroke-dashoffset": -88 }, duration: 2.2, ease: "none", repeat: -1 }),
      gsap.to(q(".boatB"), { y: -3, rotation: 2, duration: 1.1, ease: "sine.inOut", yoyo: true, repeat: -1 }),
      gsap.fromTo(
        q(".rip"),
        { scale: 1, opacity: 0.9, transformOrigin: "50% 50%" },
        { scale: 1.8, opacity: 0, duration: 1.6, stagger: 0.8, repeat: -1, ease: "power1.out" },
      ),
      gsap.to(q(".tree .tg"), { rotation: 4, transformOrigin: "50% 100%", duration: 1.8, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: 0.2 }),
      gsap.fromTo(q(".h-phone"), { y: 30, opacity: 0, rotation: -8 }, { y: 0, opacity: 1, rotation: -4, duration: 0.8, ease: "back.out(1.4)" }),
      gsap.to(q(".h-phone"), { y: -8, duration: 2.6, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 0.8 }),
      gsap.fromTo(q(".h-chip"), { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, stagger: 0.18, delay: 0.6, ease: "back.out(2)" }),
      gsap.to(q(".h-chip"), { y: -6, duration: 2, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: 0.4, delay: 1.4 }),
      gsap.fromTo(q(".h-drop"), { y: 0, opacity: 0 }, { y: -90, opacity: 0.9, duration: 3, stagger: 0.7, repeat: -1, ease: "sine.out" }),
    ];
    return () => tls.forEach((t) => t.kill());
  }, [markup]);

  return (
    <div ref={box} className="relative mx-auto h-[400px] w-full max-w-[440px] md:h-[520px]" aria-hidden="true">
      {/* soft water disc behind */}
      <div className="absolute inset-x-6 top-8 bottom-4 rounded-[50%] bg-[radial-gradient(circle_at_35%_30%,#C9F1FF,#8EDDF5_60%,#6CCBF2)] opacity-70 blur-[2px]" />
      {[12, 30, 72, 88].map((x, i) => (
        <svg key={x} viewBox="0 0 20 26" className="h-drop absolute bottom-10 w-4 opacity-0" style={{ insetInlineStart: `${x}%`, bottom: `${10 + i * 6}%` }}>
          <path d="M10 1C10 1 2 11 2 16a8 8 0 0 0 16 0C18 11 10 1 10 1Z" fill="#2E9BD6" />
          <ellipse cx="7" cy="15" rx="1.6" ry="3" fill="#fff" opacity=".6" />
        </svg>
      ))}

      {/* the phone */}
      <div className="h-phone absolute start-1/2 top-2 w-[220px] -translate-x-1/2 -rotate-4 rounded-[36px] border-[6px] border-[#12201D] bg-[#12201D] shadow-[0_30px_60px_-20px_rgba(14,110,92,.55)] md:w-[260px] rtl:translate-x-1/2">
        <div className="overflow-hidden rounded-[28px] bg-white">
          <div className="flex items-center justify-between px-3 py-2 text-[11px] font-bold text-white" style={{ background: WORLDS.spring.band }}>
            <span>النبع · A1</span>
            <span className="flex items-center gap-2">
              <span>💧 120</span>
              <span>🌱 7</span>
            </span>
          </div>
          <svg viewBox={`0 60 ${layout.width} ${layout.height - 150}`} className="block w-full" dangerouslySetInnerHTML={{ __html: markup }} />
        </div>
      </div>

      {/* floating chips: what the student earns */}
      <div className="h-chip absolute start-0 top-[18%] rounded-2xl rounded-es-md bg-white px-3 py-2 text-sm font-bold shadow-lg md:start-[-4%]">
        💧 <span className="font-en">+15</span> قطرة
      </div>
      <div className="h-chip absolute end-0 top-[40%] rounded-2xl rounded-ee-md bg-[#FFF4D6] px-3 py-2 text-sm font-bold text-[#8A5A00] shadow-lg md:end-[-4%]">
        🏆 صعدت إلى «جدول»
      </div>
      <div className="h-chip absolute start-[2%] bottom-[16%] rounded-2xl rounded-es-md bg-[#E3F7EC] px-3 py-2 text-sm font-bold text-success shadow-lg">
        ✓ أحسنت!
      </div>

      {/* Rafed on the bank */}
      <div className="absolute end-0 bottom-0 md:end-2">
        <Rafed size={150} stage={3} mood="happy" wave move="wave" moveKey={1} />
      </div>
    </div>
  );
}
