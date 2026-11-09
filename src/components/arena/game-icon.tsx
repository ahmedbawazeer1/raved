import { useId } from "react";
import { GAME_INFO, type ArenaGame } from "@shared/arena/games";
import { mix, safeId } from "@shared/art/paint";

/** 2.5D tile for each arena game: glossy fill in the game's colour, light from the top-left. */
export function GameIcon({ game, size = 56 }: { game: ArenaGame; size?: number }) {
  const id = "gi" + safeId(useId());
  const c = GAME_INFO[game].colour;
  const glyph: Record<ArenaGame, React.ReactNode> = {
    drops: (
      <>
        <path d="M32 12C32 12 18 28 18 37a14 14 0 0 0 28 0C46 28 32 12 32 12Z" fill="#fff" />
        <ellipse cx="26" cy="34" rx="3" ry="5" fill={c} opacity=".35" />
      </>
    ),
    bridge: (
      <>
        <path d="M10 40 Q32 18 54 40" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" />
        {[16, 24, 32, 40, 48].map((x) => (
          <rect key={x} x={x - 2.5} y={x === 32 ? 28 : x === 24 || x === 40 ? 31 : 36} width="5" height="12" rx="1.5" fill="#fff" opacity=".9" />
        ))}
        <path d="M8 46h48" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      </>
    ),
    net: (
      <>
        <circle cx="32" cy="32" r="17" fill="none" stroke="#fff" strokeWidth="4" />
        <path d="M17 26h30M15 34h34M19 42h26M26 16v32M38 16v32" stroke="#fff" strokeWidth="2.2" opacity=".85" />
        <path d="M44 44l9 9" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      </>
    ),
    errors: (
      <>
        <circle cx="28" cy="28" r="13" fill="none" stroke="#fff" strokeWidth="5" />
        <path d="M37 37l12 12" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
        <path d="M23 23l10 10M33 23l-10 10" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
      </>
    ),
    echo: (
      <>
        <path d="M6 50 L22 22 L34 42 L42 30 L58 50Z" fill="#fff" />
        <path d="M22 22l-4 7h8z" fill={c} opacity=".3" />
        <path d="M44 14a8 8 0 0 1 0 12M48 10a14 14 0 0 1 0 20" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" className="flex-none">
      <defs>
        <radialGradient id={id} cx="0.3" cy="0.25" r="0.9">
          <stop offset="0" stopColor={mix(c, 0.35)} />
          <stop offset="0.6" stopColor={c} />
          <stop offset="1" stopColor={mix(c, -0.3)} />
        </radialGradient>
      </defs>
      <rect x="2" y="5" width="60" height="57" rx="18" fill={mix(c, -0.35)} />
      <rect x="2" y="2" width="60" height="56" rx="18" fill={`url(#${id})`} />
      <path d="M12 10 C22 6 40 6 50 9" stroke="#fff" strokeWidth="3" fill="none" opacity=".35" strokeLinecap="round" />
      {glyph[game]}
    </svg>
  );
}
