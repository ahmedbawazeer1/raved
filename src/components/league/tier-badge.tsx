import { useId } from "react";
import { mix, safeId } from "@shared/art/paint";
import { tierOf } from "@shared/gamification/league";

/** A tier's badge: a glossy water shape that grows from spring to ocean (2.5D, light from the top-left). */
export function TierBadge({ tier, size = 56, locked = false }: { tier: number; size?: number; locked?: boolean }) {
  const id = "tb" + safeId(useId());
  const t = tierOf(tier);
  const deep = locked ? "#B4C3BE" : t.deep,
    light = locked ? "#E2E8E6" : t.light;
  // More waves the higher the tier.
  const waves = Array.from({ length: Math.min(3, t.id) }, (_, i) => 40 + i * 7);
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" className="flex-none">
      <defs>
        <radialGradient id={id} cx="0.32" cy="0.28" r="0.85">
          <stop offset="0" stopColor={mix(light, 0.4)} />
          <stop offset="0.55" stopColor={mix(deep, 0.15)} />
          <stop offset="1" stopColor={mix(deep, -0.25)} />
        </radialGradient>
      </defs>
      <path d="M32 6C32 6 12 28 12 40a20 20 0 0 0 40 0C52 28 32 6 32 6Z" fill={mix(deep, -0.35)} transform="translate(0 2)" />
      <path d="M32 6C32 6 12 28 12 40a20 20 0 0 0 40 0C52 28 32 6 32 6Z" fill={`url(#${id})`} />
      {waves.map((y) => (
        <path key={y} d={`M17 ${y} q5 -4 10 0 t10 0 t10 0`} stroke="#fff" strokeWidth="2.4" fill="none" opacity=".55" strokeLinecap="round" />
      ))}
      <ellipse cx="24" cy="30" rx="4" ry="7" fill="#fff" opacity=".45" transform="rotate(20 24 30)" />
      {locked && <path d="M27 40v-4a5 5 0 0 1 10 0v4M25 40h14v9H25z" stroke="#fff" strokeWidth="2.5" fill="#fff" fillOpacity=".3" />}
    </svg>
  );
}
