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

/**
 * The season as a single comparable number, whatever platform stored it.
 *
 * Comparing the raw field across platforms is wrong for exactly the reason this file exists:
 * ESPN stores a split season by the year it ENDS and Yahoo by the year it begins, so an ESPN
 * 2027 hockey league and a Yahoo 2026 one are the SAME season. Anything ranking seasons has to
 * normalise first or it will call a live league stale.
 */
function startYear(
  sport: string | null | undefined,
  platform: string | null | undefined,
  season: string | number | null | undefined,
): number | null {
  const raw = String(season ?? '').trim()
  if (!/^\d{4}$/.test(raw)) return null
  if (!SPLIT_SEASON.has(String(sport ?? ''))) return Number(raw)
  return platform === 'espn' ? Number(raw) - 1 : Number(raw)
}

/** The newest season present for each sport, across the leagues a user actually holds. */
export function newestSeasonBySport(
  leagues: Array<{ sport?: string | null; platform?: string | null; season?: string | number | null }>,
): Map<string, number> {
  const out = new Map<string, number>()
  for (const l of leagues) {
    const sport = String(l.sport ?? '')
    const year = startYear(l.sport, l.platform, l.season)
    if (!sport || year === null) continue
    const cur = out.get(sport)
    if (cur === undefined || year > cur) out.set(sport, year)
  }
  return out
}

/**
 * The season to print beside a league, or null to print nothing.
 *
 * EVERY league carried its year, so a switcher of current leagues read "2026 · 2026 · 2026" —
 * a fact repeated on every row that distinguishes none of them — while the one row that
 * mattered, a dormant league nobody meant to keep, was styled identically to the rest. A year
 * only carries information when it is not the season everything else is in.
 *
 * Measured against what the user actually holds rather than a calendar, because the current
 * season is a different year in every sport and this list spans all of them.
 */
export function staleSeasonLabel(
  league: { sport?: string | null; platform?: string | null; season?: string | number | null },
  newest: Map<string, number>,
): string | null {
  const year = startYear(league.sport, league.platform, league.season)
  if (year === null) return null
  const top = newest.get(String(league.sport ?? ''))
  /* Nothing to compare against — the only league in its sport — so say nothing rather than
     imply a staleness we cannot establish. */
  if (top === undefined || year >= top) return null
  return seasonLabel(league.sport, league.platform, league.season)
}
