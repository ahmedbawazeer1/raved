"use client";

import { useEffect, useId, useImperativeHandle, useMemo, useRef, type Ref } from "react";
import { gsap } from "gsap";
import { RAFED_RATIO, RAFED_VIEWBOX, rafedMarkup, type RafedMood, type RafedStage } from "@shared/art/rafed";
import { safeId } from "@shared/art/paint";
import { RAFED_MOVES, rafedParts, rafedPose, rafedReset, rafedSetStage, type RafedMove, type RafedParts } from "@/lib/art/rafed-moves";
import { calmMotion } from "@/lib/fx";
import { cn } from "@/lib/utils";

export interface RafedHandle {
  /** Play a move; resolves when it ends (immediately in calm mode). */
  play(move: RafedMove): Promise<void>;
  /** Grow or shrink to another stage. */
  stage(s: RafedStage): void;
}

/**
 * Rafed, the student's companion. Renders a still pose on the server, then (unless the student asked
 * for calm motion) breathes and blinks while on screen, and plays `move` whenever `moveKey` changes.
 */
export function Rafed({
  size = 96,
  stage = 3,
  mood = "idle",
  wave = false,
  move,
  moveKey,
  idle = true,
  label,
  className,
  ref,
}: {
  size?: number;
  stage?: RafedStage;
  mood?: RafedMood;
  wave?: boolean;
  move?: RafedMove;
  /** Change it to replay `move`. */
  moveKey?: string | number;
  idle?: boolean;
  /** Accessible name; decorative when omitted. */
  label?: string;
  className?: string;
  ref?: Ref<RafedHandle>;
}) {
  const id = "r" + safeId(useId());
  const svgRef = useRef<SVGSVGElement>(null);
  const parts = useRef<RafedParts | null>(null);
  const loop = useRef<gsap.core.Timeline | null>(null);
  const markup = useMemo(() => rafedMarkup({ stage, mood, wave, id }), [stage, mood, wave, id]);

  const rest = () => {
    const p = parts.current;
    if (!p) return;
    rafedReset(p);
    rafedPose(p, mood, wave);
    loop.current?.kill();
    loop.current = idle && mood !== "sleep" && mood !== "wilt" && !calmMotion() ? RAFED_MOVES.idle(p) : null;
  };

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    parts.current = rafedParts(svg, stage, id + "d");
    rest();
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? loop.current?.play() : loop.current?.pause()));
    io.observe(svg);
    return () => {
      io.disconnect();
      loop.current?.kill();
      gsap.killTweensOf(svg.querySelectorAll("*"));
    };
    // markup changes rebuild the parts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markup]);

  const mounted = useRef(false);
  const play = (m: RafedMove, quiet = false) =>
    new Promise<void>((resolve) => {
      const p = parts.current;
      if (!p || calmMotion()) return resolve();
      loop.current?.kill();
      rafedReset(p);
      p.quiet = quiet;
      RAFED_MOVES[m](p).eventCallback("onComplete", () => {
        p.quiet = false;
        rest();
        resolve();
      });
    });

  useImperativeHandle(ref, () => ({ play: (m) => play(m), stage: (s) => parts.current && rafedSetStage(parts.current, s) }));

  useEffect(() => {
    // The first move plays with the page: silent (sounds need the student's tap first).
    if (move && moveKey !== undefined) void play(move, !mounted.current);
    mounted.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [move, moveKey]);

  return (
    <svg
      ref={svgRef}
      width={size}
      height={Math.round(size / RAFED_RATIO)}
      viewBox={RAFED_VIEWBOX}
      overflow="visible"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("flex-none", className)}
      // Fixed internal markup from rafedMarkup (no user input).
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
