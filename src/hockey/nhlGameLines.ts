import { normalizeProTeam } from '@/services/proTeam'
import { nhlAbbrVariants } from '@/services/nhlSchedule'

/**
 * Tonight's NHL totals and favourites, from ESPN's public scoreboard.
 *
 * WHY THIS IS NOT src/services/gameLines.ts POINTED AT A NEW URL. That file reads the same
 * scoreboard for the NFL, and its own header explains why it prefers ESPN to the odds feed we
 * pay for: those tables are admin-only by RLS and run on a monthly credit budget, so a normal
 * reader's browser cannot see them, while ESPN publishes the same two numbers with no key and
 * no quota. All of that holds for hockey. What does NOT hold is the arithmetic.
 *
 * THREE DIFFERENCES, EACH OF WHICH WOULD HAVE FAILED QUIETLY.
 *
 *   `details`  For the NFL it is the spread — "CIN -3.5". For the NHL it is the MONEYLINE —
 *              "PHI -142". parseSpread reads that as a spread of 142, and a 6.5-goal game
 *              splits into 74.25 against −67.75. Plausible code, absurd number, no error.
 *
 *   `spread`   The puck line. It is ±1.5 in essentially every game regardless of how
 *              mismatched the teams are, so splitting a total by it hands every favourite the
 *              same 4.0/2.5 and says nothing about this game. Football's spread is continuous
 *              and carries the mismatch; hockey's does not.
 *
 *   favourite  The NFL path recovers it by regex from `details`. The NHL payload states it
 *              outright on `homeTeamOdds.favorite`, which is both cheaper and not a guess.
 *
 * So the total comes across unchanged and the SPLIT is derived from the moneyline, which is
 * where a hockey mismatch actually lives.
 */

export interface NhlGameLine {
  /** Both clubs, already normalised to the abbreviations our rosters use. */
  home: string
  away: string
  /** The over/under on total goals. */
  total: number
  /** Which side is favoured, or null for a pick-em. */
  favourite: 'home' | 'away' | null
  /** No-vig win probability for the favourite, 0.5..1. Null when the moneyline is unreadable. */
  favouriteWinPct: number | null
}

/** American odds to an implied probability, vig included. -142 -> 0.587, +120 -> 0.455. */
export function americanToProbability(odds: number): number | null {
  if (!Number.isFinite(odds) || odds === 0) return null
  return odds < 0 ? -odds / (-odds + 100) : 100 / (odds + 100)
}

/**
 * The favourite's true win probability, with the book's margin removed.
 *
 * Both sides of a two-way market price above 100% — that overround is the book's take. Left in,
 * every favourite looks stronger than the market actually thinks, and the error grows with the
 * juice. Dividing by the pair's sum is the standard removal and it is exact for a two-way book.
 */
export function noVigFavouritePct(homeOdds: number, awayOdds: number): number | null {
  const h = americanToProbability(homeOdds)
  const a = americanToProbability(awayOdds)
  if (h == null || a == null) return null
  const sum = h + a
  if (!(sum > 0)) return null
  return Math.max(h / sum, a / sum)
}

const num = (v: unknown): number => Number(String(v ?? '').replace(/[^\d+\-.]/g, ''))

/** Every game on one ESPN NHL scoreboard payload that carries a readable total. */
export function linesFromScoreboard(payload: any): NhlGameLine[] {
  const out: NhlGameLine[] = []
  for (const event of payload?.events ?? []) {
    const comp = event?.competitions?.[0]
    const odds = comp?.odds?.[0]
    const total = Number(odds?.overUnder)
    if (!comp || !Number.isFinite(total) || total <= 0) continue

    const sides: Record<string, string> = {}
    for (const c of comp.competitors ?? []) {
      const abbr = normalizeProTeam(c?.team?.abbreviation)
      if (abbr && c?.homeAway) sides[c.homeAway] = abbr
    }
    if (!sides.home || !sides.away) continue

    /* Stated by the payload rather than parsed out of a display string. */
    const favourite = odds?.homeTeamOdds?.favorite ? 'home'
      : odds?.awayTeamOdds?.favorite ? 'away'
        : null

    const favouriteWinPct = noVigFavouritePct(
      num(odds?.moneyline?.home?.close?.odds ?? odds?.homeTeamOdds?.moneyLine),
      num(odds?.moneyline?.away?.close?.odds ?? odds?.awayTeamOdds?.moneyLine),
    )

    out.push({ home: sides.home, away: sides.away, total, favourite, favouriteWinPct })
  }
  return out
}

/**
 * Team -> the goals this game expects of him, keyed under every spelling our rosters use.
 *
 * THE SPLIT IS NOT FITTED AND THE SPLIT IS NOT APPLIED. Football earned its adjustment: it
 * swept the exponent against an analyst's own weekly quarterback order and watched correlation
 * rise from 0.80 to a peak of 0.90, then fall away on both sides. There is no hockey equivalent
 * to fit against — we have never collected a night of NHL lines — so anything here that turns a
 * probability into goals would be a number I chose rather than one I measured, and this
 * codebase has rejected four of those already this week on evidence.
 *
 * What is returned is therefore the honest half: the GAME's own environment, total / 2, which
 * says a 6.5-goal night is a better place to be than a 5.5-goal one and claims nothing about
 * which of the two clubs gets the extra. The favourite and its win probability ride along
 * unused, so that when there is a season of lines to fit against, the fitting has its inputs.
 */
export function environmentByTeam(lines: NhlGameLine[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const line of lines) {
    const each = line.total / 2
    for (const team of [line.home, line.away]) {
      /* Both spellings, for the same reason the schedule keys both: ESPN's rosters shorten five
         clubs and a roster abbreviation must always find its game. */
      for (const variant of nhlAbbrVariants(team)) out[variant] = each
    }
  }
  return out
}
