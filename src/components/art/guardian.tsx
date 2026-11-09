import { GUARDIAN_RATIO, GUARDIAN_VIEWBOX, guardianMarkup, type GuardianId } from "@/lib/art/guardians";
import { cn } from "@/lib/utils";

/** A dam guardian (decorative). */
export function GuardianArt({ id, ko = false, size = 140, className }: { id: GuardianId; ko?: boolean; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={Math.round(size / GUARDIAN_RATIO)}
      viewBox={GUARDIAN_VIEWBOX}
      aria-hidden="true"
      className={cn("flex-none overflow-visible", className)}
      // Fixed internal markup (no user input).
      dangerouslySetInnerHTML={{ __html: guardianMarkup(id, ko) }}
    />
  );
}
