// Matches canonical category labels/names AND Yahoo MLB numeric stat_ids for ratio categories; may need expansion for other sports.
export const LOWER_IS_BETTER = new Set(['ERA', 'WHIP', 'L', 'CS', '26', '27'])

export function isLowerBetter(canonicalId: string): boolean {
  return LOWER_IS_BETTER.has(canonicalId.toUpperCase())
}
