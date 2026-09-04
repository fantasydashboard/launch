// services/betting/odds.ts
//
// Odds format conversions. Small, boring, and load-bearing: every EV number in
// the product is a few arithmetic steps away from these four functions, so they
// are kept separate and tested directly rather than inlined where they are used.

/** American odds to decimal. -110 becomes 1.9091, +150 becomes 2.5. */
export function americanToDecimal(american: number): number {
  if (american === 0 || !Number.isFinite(american)) return NaN
  return american > 0 ? american / 100 + 1 : 100 / Math.abs(american) + 1
}

/** Decimal odds to American, rounded to the nearest whole number as books quote. */
export function decimalToAmerican(decimal: number): number {
  if (!Number.isFinite(decimal) || decimal <= 1) return NaN
  return decimal >= 2
    ? Math.round((decimal - 1) * 100)
    : -Math.round(100 / (decimal - 1))
}

/**
 * Implied probability straight off the price, margin included. This is NOT the
 * market's real estimate — a full two-way market of these sums to more than 1,
 * and the excess is the book's cut. Devig before using it as a probability.
 */
export function impliedProbability(american: number): number {
  const d = americanToDecimal(american)
  return Number.isFinite(d) ? 1 / d : NaN
}

export function probabilityToDecimal(p: number): number {
  if (!(p > 0) || p >= 1) return NaN
  return 1 / p
}

/** Fair probability back to an American price. 0.5 becomes +100. */
export function probabilityToAmerican(p: number): number {
  if (!(p > 0) || p >= 1) return NaN
  return p >= 0.5
    ? -Math.round((100 * p) / (1 - p))
    : Math.round((100 * (1 - p)) / p)
}

/** Sum of raw implied probabilities. Above 1 by the size of the book's margin. */
export function overround(americans: number[]): number {
  return americans.reduce((sum, a) => sum + impliedProbability(a), 0) - 1
}

/**
 * Hold: the share of total handle the book keeps if action is balanced.
 * Distinct from overround and always smaller. A -110/-110 market has a 4.76%
 * overround and a 4.55% hold, and quoting the wrong one overstates the book's
 * take on every screen it appears.
 */
export function holdPercentage(americans: number[]): number {
  const total = americans.reduce((sum, a) => sum + impliedProbability(a), 0)
  return total > 0 ? 1 - 1 / total : NaN
}

/** Format an American number the way a book displays it, with the leading plus. */
export function formatAmerican(american: number): string {
  if (!Number.isFinite(american)) return '—'
  return american > 0 ? `+${Math.round(american)}` : `${Math.round(american)}`
}
