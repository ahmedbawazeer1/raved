import { companionMarkup, type CompanionOptions } from "@/lib/art/companion";
import { cn } from "@/lib/utils";

/** A companion character (decorative). `size` is the width in px; the height follows (3:4). */
export function Companion({
  size = 64,
  className,
  talking = false,
  ...options
}: CompanionOptions & {
  size?: number;
  className?: string;
  talking?: boolean;
}) {
  return (
    <svg
      width={size}
      height={(size * 4) / 3}
      viewBox="0 0 120 160"
      aria-hidden="true"
      className={cn("flex-none", talking && "art-talking", className)}
      // Fixed internal markup from companionMarkup (no user input).
      dangerouslySetInnerHTML={{ __html: companionMarkup(options) }}
    />
  );
}
