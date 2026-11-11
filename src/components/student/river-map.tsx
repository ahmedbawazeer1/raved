"use client";

import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { safeId } from "@shared/art/paint";
import { riverMarkup, worldFor, type NodeState } from "@shared/art/river";
import type { RafedStage } from "@shared/art/rafed";
import { Rafed } from "@/components/art/rafed";
import { calmMotion, prefsStore } from "@/lib/fx";
import type { UnitView } from "@/lib/student/progress";

const SEEN_KEY = "raved:river-seen";
function readSeen(): Record<string, number> {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "{}");
    return v && typeof v === "object" ? (v as Record<string, number>) : {};
  } catch {
    return {};
  }
}

/**
 * «اليوم»'s map: the level's world, a river with one lily pad per unit (done = flower, now = ripples,
 * locked = stone), the student's avatar on a golden leaf boat, and Rafed on the bank. When a new unit
 * opens since the last visit, the boat sails to it.
 */
export function RiverMap({
  units,
  pathSlug,
  levelCode,
  stage = 3,
  variant = "card",
}: {
  units: UnitView[];
  pathSlug: string;
  levelCode: string;
  stage?: RafedStage;
  /** "card": a titled section (the learn page). "stage": fills its parent and scrolls to today's unit («اليوم»). */
  variant?: "card" | "stage";
}) {
  const prefs = useSyncExternalStore(prefsStore.subscribe, prefsStore.getSnapshot, prefsStore.getServerSnapshot);
  const world = worldFor(levelCode);
  const id = "m" + safeId(useId());
  const key = units.map((u) => `${u.position}:${u.state}`).join();
  // Stage: the screen's height in map units, so a short river stretches to fill it.
  const [minH, setMinH] = useState(0);
  const { markup, layout } = useMemo(
    () =>
      riverMarkup({
        world,
        id,
        avatar: prefs.avatar,
        minHeight: minH,
        nodes: key.split(",").map((k) => ({ state: k.split(":")[1] as NodeState, label: `الوحدة ${k.split(":")[0]}` })),
      }),
    [world, key, prefs.avatar, id, minH],
  );
  const svg = useRef<SVGSVGElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const nowIndex = units.findIndex((u) => u.state === "now");

  useEffect(() => {
    const el = svg.current;
    if (!el || calmMotion()) return;
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
    ];
    // Sail to a newly opened unit (once per device).
    const key = `${pathSlug}:${levelCode}`;
    const seen = readSeen();
    const boat = el.querySelector(".boat");
    const prev = seen[key];
    if (boat && nowIndex > 0 && prev !== undefined && prev < nowIndex) {
      const path = el.querySelector(".flow") as SVGPathElement;
      const total = path.getTotalLength();
      const at = (y: number) => {
        let lo = 0,
          hi = total;
        for (let i = 0; i < 24; i++) {
          const mid = (lo + hi) / 2;
          if (path.getPointAtLength(mid).y < y) lo = mid;
          else hi = mid;
        }
        return lo;
      };
      const from = at(layout.points[prev].y),
        to = at(layout.points[nowIndex].y),
        o = { l: from };
      tls.push(
        gsap.to(o, {
          l: to,
          duration: 1.6,
          delay: 0.5,
          ease: "power1.inOut",
          onUpdate: () => {
            const p = path.getPointAtLength(o.l);
            boat.setAttribute("transform", `translate(${(p.x + 40).toFixed(1)} ${(p.y + 2).toFixed(1)})`);
          },
          onComplete: () => {
            const n = el.querySelector(`.node[data-i="${nowIndex}"]`);
            if (n) gsap.fromTo(n, { scale: 0.5, transformOrigin: "50% 50%" }, { scale: 1, duration: 0.7, ease: "elastic.out(1,.4)" });
          },
        }),
      );
    }
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify({ ...seen, [key]: Math.max(nowIndex, 0) }));
    } catch {
      // storage unavailable: no sailing next time
    }
    const io = new IntersectionObserver(([e]) => tls.forEach((t) => (e.isIntersecting ? t.play() : t.pause())));
    io.observe(el);
    return () => {
      io.disconnect();
      tls.forEach((t) => t.kill());
    };
  }, [markup, layout, nowIndex, pathSlug, levelCode]);

  useEffect(() => {
    const sc = scroller.current;
    if (variant !== "stage" || !sc) return;
    const measure = () => setMinH(Math.round((sc.clientHeight / Math.min(sc.clientWidth, 520)) * 360));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(sc);
    return () => ro.disconnect();
  }, [variant]);

  // Stage: open on today's unit, a little below the middle of the screen (the cards float on top).
  useEffect(() => {
    const sc = scroller.current;
    const el = svg.current;
    if (variant !== "stage" || !sc || !el) return;
    const k = el.clientWidth / layout.width;
    const y = (layout.points[Math.max(0, nowIndex)]?.y ?? 0) * k;
    sc.scrollTop = Math.max(0, y - sc.clientHeight * 0.58);
  }, [variant, layout, nowIndex]);

  const links = units.map((u, i) => {
    const { x, y } = layout.points[i];
    const label = `الوحدة ${u.position}: ${u.title}${u.state === "done" ? " · مكتملة" : u.state === "now" ? " · دورك الآن" : u.state === "locked" ? " · مقفلة" : ""}`;
    const style = { left: `${(x / layout.width) * 100}%`, top: `${(y / layout.height) * 100}%` };
    const cls = "absolute size-[20%] -translate-x-1/2 -translate-y-1/2 rounded-full";
    return u.state === "locked" ? (
      <span key={u.id} role="img" aria-label={label} className={cls} style={style} />
    ) : (
      <Link key={u.id} href={`/student/${pathSlug}/unit/${u.id}`} aria-label={label} className={`${cls} focus-visible:outline-accent`} style={style} />
    );
  });

  if (variant === "stage")
    return (
      <div
        ref={scroller}
        role="region"
        aria-label={`خريطة ${world.name}`}
        className="absolute inset-0 overflow-y-auto overscroll-contain"
        style={{ background: world.sky }}
      >
        <div className="relative mx-auto max-w-[520px]">
          <svg
            ref={svg}
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            className="block h-auto w-full"
            aria-hidden="true"
            // Fixed internal markup (validated avatar config, no free text).
            dangerouslySetInnerHTML={{ __html: markup }}
          />
          {links}
        </div>
      </div>
    );

  return (
    <section aria-label={`خريطة ${world.name}`} className="flex flex-col gap-2">
      <div className="flex items-center justify-between rounded-2xl rounded-es-md px-4 py-2 text-white shadow-sm" style={{ background: world.band }}>
        <span className="flex flex-col">
          <span className="text-xs opacity-85">العالم</span>
          <b>
            {world.name} · <span className="font-en">{levelCode}</span>
          </b>
        </span>
        <span className="text-xs opacity-85">
          {units.filter((u) => u.state === "done").length} من {units.length} وحدات
        </span>
      </div>
      <div className="relative overflow-hidden rounded-3xl">
        <svg
          ref={svg}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="block h-auto w-full"
          aria-hidden="true"
          // Fixed internal markup (validated avatar config, no free text).
          dangerouslySetInnerHTML={{ __html: markup }}
        />
        {links}
        <div className="pointer-events-none absolute bottom-3 start-2">
          <Rafed stage={stage} size={70} />
        </div>
      </div>
    </section>
  );
}
