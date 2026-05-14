/** Stage color palette — same defaults the backend seeder uses, plus a few
 *  extras for variety when a tenant adds many custom stages. The order here
 *  is the suggestion order: `pickFreshStageColor` walks it from the top and
 *  returns the first unused entry. */
export const STAGE_COLOR_PALETTE = [
  "#6B7280", // gray (Substrate preparation)
  "#92400E", // brown (Substrate filler)
  "#B45309", // amber-dark (LW filler)
  "#D97706", // amber (Finishing filler)
  "#F59E0B", // orange (High build primer)
  "#EAB308", // yellow (Undercoat primer)
  "#3B82F6", // blue (Showcoat)
  "#1E40AF", // navy (Topcoat)
  "#A855F7", // purple (Topcoat — metallic)
  "#10B981", // emerald
  "#EF4444", // red
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#84CC16", // lime
  "#F97316", // orange-bright
] as const;

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

/** Strict hex check (`#RRGGBB`, no shortform). Matches the backend regex. */
export function isValidStageColor(value: string | null | undefined): value is string {
  return typeof value === "string" && HEX_RE.test(value);
}

/** Normalize a hex color to lowercase so a Set comparison is consistent
 *  regardless of how the input was cased. */
export function normalizeStageColor(value: string | null | undefined): string | null {
  if (!isValidStageColor(value)) return null;
  return value.toLowerCase();
}

/** Pick the first palette color not in `usedColors`. Comparison ignores
 *  case. Falls back to the first palette entry if everything is taken —
 *  better to surface a duplicate-warning to the user than to invent random
 *  hex codes. */
export function pickFreshStageColor(
  usedColors: ReadonlyArray<string | null | undefined>
): string {
  const used = new Set(
    usedColors
      .map(normalizeStageColor)
      .filter((c): c is string => c !== null)
  );
  for (const c of STAGE_COLOR_PALETTE) {
    if (!used.has(c.toLowerCase())) return c;
  }
  return STAGE_COLOR_PALETTE[0];
}
