"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Volume2, X } from "lucide-react";
import { En } from "@/components/en";
import { companionMarkup } from "@/lib/art/companion";
import { journeyLayout, landmarks, roadPath, sceneryMarkup, stopIcon, type Landmark } from "@/lib/art/journey";
import { fx, prefsStore } from "@/lib/fx";
import type { UnitView } from "@/lib/student/progress";
import { speak } from "@/lib/tts";

const FOUND_KEY = "raved:map-words";
const foundListeners = new Set<() => void>();
let foundMemory = "[]";
function parseFound(raw: string): string[] {
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
const foundStore = {
  subscribe(l: () => void) {
    foundListeners.add(l);
    return () => foundListeners.delete(l);
  },
  get(): string {
    try {
      return localStorage.getItem(FOUND_KEY) ?? "[]";
    } catch {
      return foundMemory;
    }
  },
  add(key: string) {
    const list = new Set(parseFound(foundStore.get()));
    list.add(key);
    foundMemory = JSON.stringify([...list]);
    try {
      localStorage.setItem(FOUND_KEY, foundMemory);
    } catch {
      // storage unavailable: kept for this visit
    }
    foundListeners.forEach((f) => f());
  },
};

const FACE: Record<UnitView["state"], string> = {
  done: "url(#art-done)",
  now: "url(#art-now)",
  open: "url(#art-open)",
  locked: "url(#art-lock)",
};
const BASE: Record<UnitView["state"], string> = {
  done: "#07473B",
  now: "#B26B00",
  open: "#8FB8AE",
  locked: "#868E96",
};

function StopNode({ unit, index, x, y }: { unit: UnitView; index: number; x: number; y: number }) {
  const name = unit.stop ?? `الوحدة ${unit.position}`;
  const locked = unit.state === "locked";
  const progress = unit.lessons.length ? unit.lessonsDone / (unit.lessons.length + 1) : 0;
  const labelWidth = Math.max(72, name.length * 7.5 + 26);
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cy="22" rx="38" ry="11" fill="#000" opacity=".22" />
      {unit.state === "now" && (
        <>
          <circle r="40" fill="#F5A524" className="art-pulse" />
          <circle r="41" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="5" />
          <circle
            r="41"
            fill="none"
            stroke="#fff"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${Math.max(4, progress * 257.6)} 257.6`}
            transform="rotate(-90)"
          />
        </>
      )}
      <g className="art-press">
        <circle cy="7" r="33" fill={BASE[unit.state]} />
        <circle r="33" fill={FACE[unit.state]} />
        <circle r="27" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="2" />
        <path d="M-20 -18 Q-6 -30 12 -26" stroke="rgba(255,255,255,.6)" strokeWidth="4" fill="none" strokeLinecap="round" />
        <use href={`#${stopIcon(unit.stop, index)}`} x="-20" y="-20" width="40" height="40" filter={locked ? "url(#art-gray)" : undefined} />
      </g>
      {unit.state === "done" && (
        <g transform="translate(25 -24)">
          <circle r="11" fill="#12B886" stroke="#fff" strokeWidth="3" />
          <path d="M-5 0 l3.2 3.8 l6.3 -7" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        </g>
      )}
      {locked && (
        <g transform="translate(22 -22)">
          <circle r="12" fill="#fff" />
          <use href="#art-i-lock" x="-10" y="-10" width="20" height="20" />
        </g>
      )}
      <g transform="translate(0 50)">
        <rect x={-labelWidth / 2} y="-12" width={labelWidth} height="24" rx="12" fill={locked ? "rgba(255,255,255,.75)" : "#fff"} filter="url(#art-shadow)" />
        <text y="5" textAnchor="middle" fontSize="12.5" fontWeight="700" fill="#12201D">
          {name}
        </text>
      </g>
      {unit.state === "now" && (
        <g className="art-bob">
          <g transform="translate(0 -70)">
            <rect x="-30" y="-15" width="60" height="28" rx="10" fill="#fff" filter="url(#art-shadow)" />
            <path d="M-6 13 l6 8 l6 -8Z" fill="#fff" />
            <text y="5" textAnchor="middle" fontSize="14" fontWeight="800" fill="#8A5A00">
              {unit.lessonsDone ? "تابع" : "ابدأ"}
            </text>
          </g>
        </g>
      )}
    </g>
  );
}

/**
 * «رحلة حضرموت»: an illustrated map from the coast (first unit) up to Wadi Hadramout. Each unit is a
 * stop; finished stops get a check, the current one glows with the companion beside it, and the
 * locked ones wait under the fog. Landmarks teach a word when tapped.
 */
export function JourneyMap({ units, pathSlug }: { units: UnitView[]; pathSlug: string }) {
  const prefs = useSyncExternalStore(prefsStore.subscribe, prefsStore.getSnapshot, prefsStore.getServerSnapshot);
  const foundRaw = useSyncExternalStore(foundStore.subscribe, foundStore.get, () => "[]");
  const found = useMemo(() => new Set(parseFound(foundRaw)), [foundRaw]);
  const layout = useMemo(() => journeyLayout(units.length), [units.length]);
  const scenery = useMemo(() => sceneryMarkup(layout), [layout]);
  const marks = useMemo(() => landmarks(layout), [layout]);
  const [word, setWord] = useState<Landmark | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const stamps = units.filter((u) => u.state === "done").length;
  const title = units.some((u) => u.stop) ? "رحلة حضرموت" : "رحلتك";
  const nowIndex = units.findIndex((u) => u.state === "now");
  const focus = nowIndex >= 0 ? nowIndex : Math.max(0, stamps - 1);
  const firstLocked = units.findIndex((u) => u.state === "locked");
  const fogY = firstLocked < 0 ? 0 : layout.stops[firstLocked].y + 70;
  const reached = nowIndex >= 0 ? nowIndex : units.length - 1;

  // Start the map at the student's current stop.
  useEffect(() => {
    const box = scroller.current;
    const svg = svgRef.current;
    if (!box || !svg) return;
    const scale = svg.clientWidth / 390;
    box.scrollTop = layout.stops[focus].y * scale - box.clientHeight * 0.55;
  }, [focus, layout]);

  const discover = (m: Landmark) => {
    setWord(m);
    try {
      speak(m.en);
    } catch {
      // no speech on this device
    }
    if (!found.has(m.key)) {
      foundStore.add(m.key);
      fx("coin");
    } else fx("pop");
  };

  const companion = units[focus] && units[focus].state !== "locked" ? layout.stops[focus] : null;

  return (
    <section aria-labelledby="journey-title" className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 id="journey-title" className="text-lg font-bold">
          {title}
        </h2>
        <span className="flex gap-1.5 text-xs font-semibold">
          <span className="rounded-full bg-warning-tint px-2.5 py-1 text-warning">
            {stamps} {stamps === 1 ? "ختم" : "أختام"} من {units.length}
          </span>
          <span className="rounded-full bg-primary-tint px-2.5 py-1 text-primary-hover">
            كلمات الخريطة {found.size}/{marks.length}
          </span>
        </span>
      </div>
      <div className="relative">
        <div
          ref={scroller}
          className="h-[min(68dvh,620px)] overflow-y-auto overscroll-contain rounded-3xl border border-border bg-[#EBD9AF] shadow-[inset_0_0_0_1px_rgba(0,0,0,.03)] [scrollbar-width:none]"
        >
          <div className="relative">
            <svg ref={svgRef} viewBox={`0 0 390 ${layout.height}`} className="block h-auto w-full font-sans select-none" role="group" aria-label={title}>
              <g dangerouslySetInnerHTML={{ __html: scenery }} />
              {marks.map((m) => (
                <g
                  key={m.key}
                  transform={`translate(${m.x} ${m.y})`}
                  role="button"
                  tabIndex={0}
                  aria-label={`اكتشف كلمة: ${m.ar}`}
                  className="cursor-pointer outline-none [&:focus-visible>circle:first-child]:stroke-accent [&:focus-visible>circle:first-child]:[stroke-width:3]"
                  onClick={() => discover(m)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      discover(m);
                    }
                  }}
                >
                  <circle r={m.r} fill="transparent" />
                  <g dangerouslySetInnerHTML={{ __html: m.markup }} />
                  {!found.has(m.key) && <circle cx={m.r * 0.55} cy={-m.r * 0.55} r="7" fill="#FFD43B" stroke="#fff" strokeWidth="2" className="art-ping" />}
                </g>
              ))}
              <path d={roadPath(layout.stops)} stroke="#D4B07C" strokeWidth="22" fill="none" strokeLinecap="round" />
              <path d={roadPath(layout.stops)} stroke="#FFF7E3" strokeWidth="15" fill="none" strokeLinecap="round" />
              <path d={roadPath(layout.stops, reached)} stroke="#12B886" strokeWidth="5" fill="none" strokeLinecap="round" strokeDasharray="1 11" />
              {fogY > 0 && (
                <g pointerEvents="none">
                  <rect width="390" height={fogY} fill="url(#art-fog)" />
                  {[
                    [70, fogY - 80],
                    [300, fogY - 170],
                    [130, fogY - 300],
                    [280, fogY - 420],
                  ]
                    .filter(([, y]) => y > 40)
                    .map(([x, y], i) => (
                      <g key={i} transform={`translate(${x} ${y})`}>
                        <g className="art-drift" style={{ animationDelay: `${-i * 3}s` }}>
                          <ellipse rx="44" ry="15" fill="#fff" opacity=".85" />
                          <ellipse cx="22" cy="-9" rx="24" ry="14" fill="#fff" opacity=".85" />
                          <ellipse cx="-20" cy="-6" rx="18" ry="11" fill="#fff" opacity=".85" />
                        </g>
                      </g>
                    ))}
                </g>
              )}
              {units.map((u, i) => (
                <StopNode key={u.id} unit={u} index={i} x={layout.stops[i].x} y={layout.stops[i].y} />
              ))}
              {companion && (
                <g transform={`translate(${companion.x + (companion.x > 195 ? -100 : 46)} ${companion.y - 58})`} pointerEvents="none">
                  <g className="art-bob" style={{ animationDelay: "-.8s" }}>
                    <svg
                      width="54"
                      height="72"
                      viewBox="0 0 120 160"
                      dangerouslySetInnerHTML={{
                        __html: companionMarkup({
                          who: prefs.companion,
                          mood: "happy",
                          wave: true,
                        }),
                      }}
                    />
                  </g>
                </g>
              )}
            </svg>
            {units.map((u, i) => {
              const { x, y } = layout.stops[i];
              const label = `الوحدة ${u.position}: ${u.stop ?? u.title}${u.state === "done" ? " · مكتملة" : u.state === "now" ? " · محطتك الآن" : u.state === "locked" ? " · مقفلة" : ""}`;
              const style = {
                left: `${(x / 390) * 100}%`,
                top: `${(y / layout.height) * 100}%`,
              };
              const cls = "absolute size-[19%] -translate-x-1/2 -translate-y-1/2 rounded-full";
              return u.state === "locked" ? (
                <span key={u.id} role="img" aria-label={label} className={cls} style={style} />
              ) : (
                <Link
                  key={u.id}
                  href={`/student/${pathSlug}/unit/${u.id}`}
                  aria-label={label}
                  className={`${cls} focus-visible:outline-accent active:scale-95`}
                  style={style}
                />
              );
            })}
          </div>
        </div>
        {word && (
          <div
            role="status"
            className="absolute inset-x-2 bottom-2 flex items-center gap-2.5 rounded-2xl border border-border bg-card/95 p-2.5 shadow-lg backdrop-blur"
          >
            <button
              type="button"
              aria-label="استمع للكلمة"
              onClick={() => speak(word.en)}
              className="flex size-11 flex-none items-center justify-center rounded-xl bg-primary-tint text-primary"
            >
              <Volume2 className="size-5" aria-hidden="true" />
            </button>
            <div className="min-w-0 flex-1 text-[13px] leading-snug text-muted-foreground">
              <p>
                <En className="text-lg font-bold text-foreground">{word.en}</En> <span className="font-bold text-primary">{word.ar}</span>
              </p>
              <p>{word.fact}</p>
            </div>
            <button
              type="button"
              aria-label="إغلاق"
              onClick={() => setWord(null)}
              className="flex size-11 flex-none items-center justify-center text-muted-foreground"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
