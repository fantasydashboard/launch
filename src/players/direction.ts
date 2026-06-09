/** Canonical category ids (matching Slice 1 CategoryDef ids) where a LOWER value is better. */
export const LOWER_IS_BETTER = new Set(['ERA', 'WHIP', 'L', 'BB', 'CS'])

export function isLowerBetter(canonicalId: string): boolean {
  return LOWER_IS_BETTER.has(canonicalId.toUpperCase())
}
