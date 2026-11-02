import { guardianMarkup, type Guardian } from "@/lib/art/guardians";
import { cn } from "@/lib/utils";

/** A stop guardian (decorative). */
export function GuardianArt({ id, ko = false, size = 140, className }: { id: Guardian["id"]; ko?: boolean; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={(size * 170) / 160}
      viewBox="0 -8 160 178"
      aria-hidden="true"
      className={cn("flex-none overflow-visible", className)}
      // Fixed internal markup (no user input).
      dangerouslySetInnerHTML={{ __html: guardianMarkup(id, ko) }}
    />
  );
}
