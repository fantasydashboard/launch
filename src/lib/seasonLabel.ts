/**
 * What to call the season, for a sport whose season is not a year.
 *
 * THE BUG. Three hockey leagues, one date, two different answers in the same chip: the Yahoo
 * leagues read "Week 1 · 2026" and the ESPN one read "Week 1 · 2027". Neither is wrong on its
 * own terms — Yahoo stores the NHL season by the year it starts, ESPN by the year it ends —
 * but a user who is in both sees the product disagreeing with itself about what year it is.
 *
 * Hockey and basketball straddle the New Year, so neither single number is the honest label.
 * "2026-27" names the thing both platforms are pointing at, and lets the two leagues agree.
 * Football and baseball are contained in one calendar year, so they keep the bare year.
 */
const SPLIT_SEASON = new Set(['hockey', 'basketball'])

export function seasonLabel(
  sport: string | null | undefined,
  platform: string | null | undefined,
  season: string | number | null | undefined,
): string {
  const raw = String(season ?? '').trim()
  if (!/^\d{4}$/.test(raw)) return raw
  if (!SPLIT_SEASON.has(String(sport ?? ''))) return raw
  /* ESPN's season id for a split season is the year it ENDS, so 2027 is the 2026-27 season.
     Yahoo and Sleeper store the year it begins. Normalise both to the starting year. */
  const start = platform === 'espn' ? Number(raw) - 1 : Number(raw)
  return `${start}-${String(start + 1).slice(2)}`
}
