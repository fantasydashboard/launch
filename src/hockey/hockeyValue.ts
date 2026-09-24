import type { PlayerValue, ValueByKey } from '@/myteam/playerValue'
import {
  HOCKEY_STAT_BY_ID, HOCKEY_STAT_UNVERIFIED, hockeyPosition, FORWARD_POSITIONS,
} from './hockeyPositions'

/**
 * What a hockey player is worth, from raw projected stats and the league's own scoring.
 *
 * WHY NOT ESPN'S OWN NUMBER. Every projected row carries an `appliedTotal`, and it is
 * unusable twice over. Every goalie's is ZERO — ESPN does not score them in the game-level
 * feed at all — and a skater's reflects ESPN's default weights rather than the league's, so
 * a league paying 4 points a goal and -2 a goal against would be ranked on somebody else's
 * rules. The same reasoning the football engine already follows: raw stats times the
 * league's weights, never a pre-scored total.
 *
 * WHAT MAKES HOCKEY DIFFERENT FROM FOOTBALL. Two things, and both are about volume rather
 * than talent.
 *
 * A skater plays three or four times a week and a football player once, so a week's return
 * is a rate multiplied by a schedule, and the schedule moves. A goalie is more extreme
 * still: he is worth what he STARTS, not what he is capable of, and two starts against three
 * beats a better goalie every time. `weeklyCap` already exists for exactly this — baseball
 * uses it to stop a two-start pitcher week reading as a permanent ability — and hockey needs
 * it for the same reason at both positions.
 */

/** ESPN stat id -> unified key, applied to one projection's `stats` blob. */
export function statsFromEspn(stats: Record<string, number> | null | undefined): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [id, v] of Object.entries(stats ?? {})) {
    const key = HOCKEY_STAT_BY_ID[Number(id)]
    if (!key || !Number.isFinite(v)) continue
    out[key] = Number(v)
  }
  return out
}

/**
 * Games per week a position can actually deliver, for weeklyRate's ceiling.
 *
 * An NHL team plays 82 games across about 25 weeks, so a skater averages a shade over three.
 * A goalie in a timeshare starts around half his team's games; a genuine starter closer to
 * three quarters, which is what the upper bound protects.
 */
export const SKATER_WEEKLY_CAP = 3.4
export const GOALIE_WEEKLY_CAP = 2.5

/** Regular season length, for turning a season projection into a per-game rate. */
export const NHL_SEASON_GAMES = 82

export interface HockeyProjection {
  playerKey: string
  position: string
  /** Unified stat key -> projected season total. */
  stats: Record<string, number>
  /**
   * ESPN's average draft position — what the ROOM thinks, as opposed to what we think.
   *
   * Null when ESPN published none. Never defaulted to a number: an absent price is not a
   * late one, and filling it in would make an unknown player look like a known bad one.
   */
  adp?: number | null
  auctionValue?: number | null
  percentOwned?: number | null
  /**
   * OUT, DAY_TO_DAY, INJURY_RESERVE, SUSPENSION — never ACTIVE, which says nothing.
   *
   * FLAGGED, NOT DISCOUNTED. ESPN's projection already accounts for expected missed games:
   * Makar is projected 78 of 82, Bedard 64, Merzlikins 39. A discount here would charge the
   * same injury twice. The drafter is told; the number is left alone.
   */
  injuryStatus?: string | null
}

/*
 * AN ADP IS ONLY A PRICE IF THE ROOM ACTUALLY DRAFTS HIM.
 *
 * ESPN gives EVERY projected player an averageDraftPosition, and 218 of 456 of them sit in a
 * tight band at 227-232 — which is one past the end of a standard ten-team, twenty-three-round
 * draft. That is a placeholder for "undrafted", not a price. Every one of those players is
 * owned in under 10% of leagues.
 *
 * Read as real, the placeholder manufactured enormous fake disagreements: the board reported
 * Anthony Stolarz as thirty-two rounds of value because we ranked him 40th and "the market"
 * ranked him 230th, when the market had simply never priced him. A signal that fires hardest
 * on the players nobody wants is worse than no signal.
 *
 * Ownership is the gate rather than the band, because it is a statement about the world
 * instead of an artefact detector: below 10% he goes undrafted in nine leagues out of ten, so
 * an average taken over the few where he went is not a price. Players owned 50%+ span ADP 1.8
 * to 218.5 — real, and untouched.
 */
export const ADP_MIN_OWNERSHIP = 10

/** Read ESPN's projection rows into the shape this engine consumes. */
export function projectionsFromEspn(rows: unknown[]): Record<string, HockeyProjection> {
  const out: Record<string, HockeyProjection> = {}
  for (const raw of rows ?? []) {
    const r = raw as Record<string, any>
    const p = (r.player ?? r) as Record<string, any>
    const key = String(p.id ?? '').trim()
    if (!key) continue
    const position = hockeyPosition(p.defaultPositionId)
    if (!position) continue          // unknown position: absent, never defaulted
    /* The FULL-SEASON PROJECTED split, and nothing else. sourceId 1 is projected and 0 is
       actual; splitTypeId 0 is the season. Taking any other split would mix what a player
       has done with what he is expected to do. */
    const split = (p.stats ?? []).find(
      (s: any) => s?.statSourceId === 1 && s?.statSplitTypeId === 0,
    )
    if (!split) continue
    const own = (p.ownership ?? {}) as Record<string, any>
    out[key] = {
      playerKey: key, position, stats: statsFromEspn(split.stats),
      adp: Number.isFinite(own.averageDraftPosition)
        && Number(own.percentOwned) >= ADP_MIN_OWNERSHIP
        ? Number(own.averageDraftPosition) : null,
      auctionValue: Number.isFinite(own.auctionValueAverage) ? Number(own.auctionValueAverage) : null,
      percentOwned: Number.isFinite(own.percentOwned) ? Number(own.percentOwned) : null,
      injuryStatus: p.injuryStatus && p.injuryStatus !== 'ACTIVE' ? String(p.injuryStatus) : null,
    }
  }
  return out
}

export interface HockeyValueInput {
  projections: Record<string, HockeyProjection>
  /** Unified stat key -> points per unit, from the league's own settings. */
  weights: Record<string, number>
  /** Games each player has already played, when known. Absent means none. */
  gamesPlayed?: Record<string, number>
  /**
   * Games the SEASON has left, as a ceiling on any one player's remainder.
   *
   * Subtracting what a player has played from what he was projected is right only while the
   * projection's own absence is still ahead of him. A skater projected 64 games who has
   * played 5 of his team's 60 has 59 left by that subtraction, and 22 nights left in reality.
   * Without this cap the board ranks the most-injured players on the wire highest, which is
   * exactly backwards. Omitted means no ceiling, which is correct before puck drop.
   */
  gamesLeft?: number
  /**
   * The league's scoringItems, when the caller has them.
   *
   * Only used to report the gap: a league that pays for a stat we cannot name leaves every
   * total short by whatever it was worth. Optional, because a caller scoring a known set has
   * no gap to report.
   */
  scoringItems?: { statId?: number; points?: number }[]
}

export interface HockeyValueResult {
  valueByKey: ValueByKey
  /**
   * Stats the league SCORES that we could not identify, so nothing is credited for them.
   *
   * This is the honest surface for the gap in hockeyPositions: fifteen ESPN stat ids carry
   * projections we cannot name. If a league pays for one, every player's total is short by
   * whatever it was worth, and silently. A caller can show this; it must not be swallowed.
   */
  unscoredStatIds: number[]
}

/**
 * Which ids the league scores that we have no name for.
 *
 * Takes ESPN's scoringItems so the check runs against what the league ACTUALLY pays for
 * rather than against every id in existence — a league that leaves hits at zero has no gap
 * even though we cannot name the stat.
 */
export function unidentifiedScoredStats(
  scoringItems: { statId?: number; points?: number }[] | undefined,
): number[] {
  const out: number[] = []
  for (const it of scoringItems ?? []) {
    const id = Number(it?.statId)
    const pts = Number(it?.points)
    if (!Number.isFinite(id) || !pts) continue      // zero-weight stats cost nothing
    if (HOCKEY_STAT_BY_ID[id]) continue             // known
    if (HOCKEY_STAT_UNVERIFIED.has(id)) out.push(id)
    else out.push(id)                               // unseen entirely — same consequence
  }
  return [...new Set(out)].sort((a, b) => a - b)
}

/**
 * Score every projection with the league's weights.
 *
 * Remaining value, not season value: a projection covering 82 games is scaled to the games
 * that are left, the same correction the football rest-of-season engine needed. A caller
 * that passes no gamesPlayed gets the full season, which is right before puck drop.
 */
export function buildHockeyValue(input: HockeyValueInput): HockeyValueResult {
  const { projections, weights, gamesPlayed = {}, gamesLeft, scoringItems } = input
  const valueByKey: ValueByKey = {}

  for (const [key, proj] of Object.entries(projections)) {
    const perStat: Record<string, number> = {}
    let seasonTotal = 0
    for (const [stat, amount] of Object.entries(proj.stats)) {
      const w = weights[stat]
      if (!w || !Number.isFinite(amount)) continue
      const points = amount * w
      perStat[stat] = points
      seasonTotal += points
    }

    /*
     * Games the projection covers.
     *
     * This used to read a stat called GS and fall back to GP, on the belief that id 34 was
     * games started — a goalie is worth what he starts, not what he appears in, so starts
     * were the better measure. Id 34 is not starts: it equals games played for all 398
     * skaters, and is zero for fifteen goalies who are projected 37 to 52 appearances. Read
     * as starts it would have called three starting goalies unstartable.
     *
     * DEC — wins plus losses plus overtime losses, an identity that holds for 57 of 58
     * goalies — is the verified stand-in, and it is what a goalie actually accrues counting
     * stats in. It falls back to appearances where ESPN did not project a record.
     */
    const isGoalie = proj.position === 'G'
    const projectedGames = isGoalie
      ? (proj.stats.DEC || proj.stats.GP || 0)
      : (proj.stats.GP || 0)

    const played = Math.max(0, gamesPlayed[key] ?? 0)
    const ceiling = Number.isFinite(gamesLeft) ? Math.max(0, gamesLeft as number) : Infinity
    const remaining = Math.min(
      ceiling,
      Math.max(0, (projectedGames || NHL_SEASON_GAMES) - played),
    )
    const perGame = projectedGames > 0 ? seasonTotal / projectedGames : 0

    valueByKey[key] = {
      total: perGame * remaining,
      games: remaining,
      perStat,
      /* `side` stays undefined. It exists to tell a baseball hitter from a pitcher, and
         overloading it with a hockey meaning would make every consumer that branches on it
         wrong. Hockey consumers branch on position, which is on the row already. */
      weeklyCap: isGoalie ? GOALIE_WEEKLY_CAP : SKATER_WEEKLY_CAP,
    } satisfies PlayerValue
  }

  /* Reported, not swallowed. Returning an empty list unconditionally would be a field that
     claims to surface the gap and never does — worse than not having it. */
  return { valueByKey, unscoredStatIds: unidentifiedScoredStats(scoringItems) }
}

/** Forwards, defencemen and goalies, for a board that groups by role rather than by slot. */
export function roleOf(position: string): 'F' | 'D' | 'G' | '' {
  if (FORWARD_POSITIONS.has(position)) return 'F'
  if (position === 'D') return 'D'
  if (position === 'G') return 'G'
  return ''
}
