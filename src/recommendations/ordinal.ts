export function ordinal(n: number): string {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}

/**
 * Tie-aware rank label. `rankInCategory` averages the positions a tie spans (4th &
 * 5th -> 4.5), so a fractional rank means "tied". Rendering that average as an
 * ordinal produces a nonsensical "4.5th"; show the tie as "T-4th" (the top of the
 * tied band) instead. Integer ranks pass straight through to `ordinal`.
 */
export function rankLabel(n: number): string {
  if (Number.isInteger(n)) return ordinal(n)
  return `T-${ordinal(Math.floor(n))}`
}
