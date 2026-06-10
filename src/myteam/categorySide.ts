// Pitching category display names (uppercased). Anything not here is treated as hitting.
const PITCHING_NAMES = new Set([
  'W', 'L', 'SV', 'HLD', 'HD', 'SVHD', 'SVH', 'SV+HLD', 'BS',
  'ERA', 'WHIP', 'IP', 'GS', 'QS', 'K/9', 'BB/9', 'K/BB', 'FIP', 'OBA',
  'BF', 'TBF', 'ER', 'HRA', 'GP',
  'INNINGS PITCHED', 'SAVES', 'HOLDS', 'WINS', 'QUALITY STARTS',
  'OPPONENT BATTING AVG', 'OPPONENT BATTING AVERAGE',
])
// Ratio / rate categories (uppercased) on either side.
const RATIO_NAMES = new Set([
  'ERA', 'WHIP', 'K/9', 'BB/9', 'K/BB', 'FIP', 'OBA', 'OPPONENT BATTING AVG', 'OPPONENT BATTING AVERAGE',
  'AVG', 'BA', 'OBP', 'SLG', 'OPS', 'ISO', 'BABIP', 'FPCT', 'WOBA',
])

/** Classify a scoring category by display name into hitting/pitching and ratio/counting. */
export function classifyCategory(displayName: string, _lowerIsBetter: boolean): { side: 'hit' | 'pit'; isRatio: boolean } {
  const key = (displayName || '').toUpperCase().trim()
  const side: 'hit' | 'pit' = PITCHING_NAMES.has(key) ? 'pit' : 'hit'
  const isRatio = RATIO_NAMES.has(key)
  return { side, isRatio }
}
