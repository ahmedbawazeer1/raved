import { ART_DEFS } from "@/lib/art/defs";

/** Gradients, filters and illustrated icons used by the map and the companions. Render once per page. */
export function ArtDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute" }}>
      {/* Fixed internal markup (no user input). */}
      <defs dangerouslySetInnerHTML={{ __html: ART_DEFS }} />
    </svg>
  );
}
