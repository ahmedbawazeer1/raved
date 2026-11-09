"use client";

import { useEffect, useId, useImperativeHandle, useMemo, useRef, type Ref } from "react";
import { gsap } from "gsap";
import { AVATAR_HEAD_VIEWBOX, AVATAR_VIEWBOX, avatarMarkup, type AvatarConfig, type AvatarMouth } from "@shared/art/avatar";
import { safeId } from "@shared/art/paint";
import { AVATAR_MOVES, avatarParts, avatarReset, type AvatarMove, type AvatarParts } from "@/lib/art/avatar-moves";
import { calmMotion } from "@/lib/fx";
import { cn } from "@/lib/utils";

export interface AvatarHandle {
  play(move: AvatarMove): Promise<void>;
}

/** The student's full-body avatar. Breathes while on screen; plays `move` when `moveKey` changes. */
export function Avatar({
  config,
  size = 90,
  mouth = "smile",
  wave = false,
  move,
  moveKey,
  idle = true,
  label,
  className,
  ref,
}: {
  config: AvatarConfig;
  size?: number;
  mouth?: AvatarMouth;
  wave?: boolean;
  move?: AvatarMove;
  moveKey?: string | number;
  idle?: boolean;
  label?: string;
  className?: string;
  ref?: Ref<AvatarHandle>;
}) {
  const id = "a" + safeId(useId());
  const svgRef = useRef<SVGSVGElement>(null);
  const parts = useRef<AvatarParts | null>(null);
  const loop = useRef<gsap.core.Timeline | null>(null);
  const markup = useMemo(() => avatarMarkup(config, { id, mouth, wave }), [config, id, mouth, wave]);

  const rest = () => {
    const p = parts.current;
    if (!p) return;
    avatarReset(p);
    loop.current?.kill();
    loop.current = idle && !calmMotion() ? AVATAR_MOVES.idle(p) : null;
  };
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    if (wave || calmMotion()) return; // keep the still (waving) pose
    const p = avatarParts(svg);
    parts.current = p;
    rest();
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? loop.current?.play() : loop.current?.pause()));
    io.observe(svg);
    return () => {
      io.disconnect();
      loop.current?.kill();
      p.stop();
      gsap.killTweensOf(svg.querySelectorAll("*"));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markup]);

  const play = (m: AvatarMove) =>
    new Promise<void>((resolve) => {
      const p = parts.current;
      if (!p || calmMotion()) return resolve();
      loop.current?.kill();
      avatarReset(p);
      AVATAR_MOVES[m](p).eventCallback("onComplete", () => {
        rest();
        resolve();
      });
    });
  useImperativeHandle(ref, () => ({ play }));
  useEffect(() => {
    if (move && moveKey !== undefined) void play(move);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [move, moveKey]);

  return (
    <svg
      ref={svgRef}
      width={size}
      height={Math.round((size * 300) / 180)}
      viewBox={AVATAR_VIEWBOX}
      overflow="visible"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("flex-none", className)}
      // Fixed internal markup from avatarMarkup (validated config, no free text).
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}

/** Just the avatar's head (league rows, the boat on the map). Static. */
export function AvatarHead({ config, size = 32, className }: { config: AvatarConfig; size?: number; className?: string }) {
  const id = "h" + safeId(useId());
  const markup = useMemo(() => avatarMarkup(config, { id, filters: false }), [config, id]);
  return (
    <svg
      width={size}
      height={size}
      viewBox={AVATAR_HEAD_VIEWBOX}
      aria-hidden="true"
      className={cn("flex-none", className)}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
