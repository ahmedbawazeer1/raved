"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { calmMotion, fx } from "@/lib/fx";

const SEEN = "raved:splash";
const OPENED = "raved:opened";

/**
 * Opening the app: a drop falls on the water, ripples spread and the logo appears (longer the very
 * first time). Once per browser session; never blocks taps (pointer-events: none).
 */
export function Splash() {
  const [gone, setGone] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let seen = false,
      first = false;
    try {
      seen = Boolean(sessionStorage.getItem(SEEN));
      sessionStorage.setItem(SEEN, "1");
      first = !localStorage.getItem(OPENED);
      localStorage.setItem(OPENED, "1");
    } catch {
      seen = true;
    }
    if (seen || el.style.display === "none" || calmMotion()) {
      const t = setTimeout(() => setGone(true), 0);
      return () => clearTimeout(t);
    }
    const q = (s: string) => el.querySelectorAll(s);
    const tl = gsap.timeline({ onComplete: () => setGone(true) });
    tl.fromTo(q(".sp-drop"), { y: -260, scaleY: 1.25 }, { y: 0, scaleY: 1, duration: first ? 0.6 : 0.4, ease: "power2.in" })
      .add(() => fx("drop"))
      .to(q(".sp-drop"), { scale: 0, opacity: 0, duration: 0.15 })
      .fromTo(q(".sp-ring"), { scale: 0.2, opacity: 0.9 }, { scale: 2.4, opacity: 0, duration: 0.9, stagger: 0.18, ease: "power1.out" }, "<")
      .fromTo(q(".sp-logo"), { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 }, "<0.15")
      .to({}, { duration: first ? 0.7 : 0.25 })
      .to(el, { opacity: 0, duration: 0.35 });
    return () => {
      tl.kill();
    };
  }, []);

  if (gone) return null;
  return (
    <>
      <div
        ref={ref}
        suppressHydrationWarning
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6 bg-[linear-gradient(180deg,#E3F2EE,#C9F1FF)]"
      >
        <div className="relative flex size-40 items-center justify-center">
          {[0, 1, 2].map((i) => (
            <span key={i} className="sp-ring absolute inset-6 rounded-[50%] border-4 border-[#2E9BD6] opacity-0" />
          ))}
          <svg viewBox="0 0 40 52" className="sp-drop relative w-10">
            <path d="M20 2C20 2 4 22 4 32a16 16 0 0 0 32 0C36 22 20 2 20 2Z" fill="#2E9BD6" />
            <ellipse cx="13" cy="30" rx="3" ry="6" fill="#fff" opacity=".5" />
          </svg>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- a static SVG logo */}
        <img src="/brand/raved-logo-green.svg" alt="" className="sp-logo h-14 w-auto opacity-0" />
      </div>
      {/* Seen in this session: hide before the first paint. */}
      <script
        dangerouslySetInnerHTML={{
          __html: "try{if(sessionStorage.getItem('raved:splash'))document.currentScript.previousElementSibling.style.display='none'}catch(e){}",
        }}
      />
    </>
  );
}
