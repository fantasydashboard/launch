import { buildCategoryWeek, type CategoryWeek, type WeekCat } from './categoryWeek'
import { rosterExpectation } from './rosterExpectation'
import type { CategoryFormat } from './categoryLeverage'
import { RATE_VOLUME } from '@/hockey/hockeyCategoryValue'

/**
 * A hockey category week, assembled from the two id spaces it lives across.
 *
 * THE JOIN IS THE WHOLE JOB. The live scoreboard arrives keyed by the PLATFORM's stat ids —
 * Yahoo's 26, ESPN's 34 — and the projections are keyed by our own category names. Getting that
 * join wrong is the most common fault in this codebase and it fails as silence: every column
 * reads level, every win chance reads fifty, and nothing on screen says why. HockeyCategory
 * carries both halves, which is why the bridge belongs here and not in a view.
 */

/**
 * The volume we can actually PROJECT a rate over, where it differs from the platform's own.
 *
 * GAA is goals per sixty minutes, so its natural denominator is time on ice — but our hockey
 * projections carry appearances, not minutes, and a denominator of zero makes the spread
 * meaningless. Appearances are the honest exposure we have. Only columns that need the
 * substitution appear here; everything else takes RATE_VOLUME's own answer.
 */
const PROJECTED_VOLUME: Record<string, string> = {
  GAA: 'GP',
}

/**
 * The hockey columns that are ratios, and the volume each is measured over.
 *
 * DERIVED FROM RATE_VOLUME, NOT RESTATED. This was a second hand-written list naming only
 * SVPCT and GAA, while the hockey value module had known about TOIG and WINPCT all along —
 * so an ESPN league with time-on-ice as a column had its per-game minutes SUMMED across the
 * roster and scored by addition, and the board reported 1156.7 against 1156 at a tidy 51%.
 * Two lists for one fact is how that happens; there is now one list and this reads it.
 *
 * A proportion is bounded in [0,1] and a rate is not, which is the only distinction
 * ratioSigma needs — and the platforms spell every proportion with a PCT suffix.
 */
export const HOCKEY_RATIOS: Record<string, { kind: 'proportion' | 'rate'; volumeKey: string }> =
  Object.fromEntries(Object.entries(RATE_VOLUME).map(([key, volume]) => [
    key,
    {
      kind: key.toUpperCase().endsWith('PCT') ? 'proportion' as const : 'rate' as const,
      volumeKey: PROJECTED_VOLUME[key] ?? volume,
    },
  ]))

export interface HockeyWeekInput {
  /** The league's columns, carrying both our key and the platform's stat id. */
  categories: Array<{ key: string; statId: number; reverse: boolean }>
  /** Live totals, keyed by platform stat id. */
  myStats: Record<string, number>
  oppStats: Record<string, number>
  /** Every rostered player in the league, so both sides can be totalled. */
  pool: Array<{ playerKey: string; name: string; teamKey: string; proTeam?: string }>
  /** His raw projected line, by name — the bridge across the two key spaces. */
  projectionFor: (p: { name?: string }) => { stats: Record<string, number> } | null
  myTeamKey: string
  oppTeamKey: string
  /** Games each club has left in the matchup window. */
  gamesByTeam: Record<string, number>
  days: number
  format: CategoryFormat
}

export function hockeyCategoryWeek(input: HockeyWeekInput): CategoryWeek {
  const {
    categories, myStats, oppStats, pool, projectionFor,
    myTeamKey, oppTeamKey, gamesByTeam, days, format,
  } = input

  /* Resolve the pool once, by name, into the projection key space. */
  const projByPoolKey: Record<string, { stats: Record<string, number> } | undefined> = {}
  for (const p of pool) {
    const proj = projectionFor(p)
    if (proj) projByPoolKey[p.playerKey] = proj
  }

  const catKeys = categories.map((c) => c.key)
  /* Ratio columns need their volume totalled too, or the spread has no denominator. */
  const volumeKeys = categories
    .map((c) => HOCKEY_RATIOS[c.key.toUpperCase()]?.volumeKey)
    .filter((k): k is string => !!k)
  const wanted = [...new Set([...catKeys, ...volumeKeys])]

  const sideFor = (teamKey: string) => rosterExpectation({
    players: pool.filter((p) => p.teamKey === teamKey).map((p) => ({ key: p.playerKey, proTeam: p.proTeam })),
    projections: projByPoolKey,
    gamesByTeam,
    categories: wanted,
  })

  const mine = sideFor(myTeamKey)
  const theirs = sideFor(oppTeamKey)

  /* The scoreboard, moved out of the platform's key space and into ours. */
  const myByKey: Record<string, number> = {}
  const oppByKey: Record<string, number> = {}
  for (const c of categories) {
    const id = String(c.statId)
    myByKey[c.key] = Number(myStats[id]) || 0
    oppByKey[c.key] = Number(oppStats[id]) || 0
  }
  /* A ratio's locked volume comes from our own projection of what has been played, because the
     platforms publish the ratio without the denominator underneath it. */
  for (const k of volumeKeys) {
    if (myByKey[k] === undefined) myByKey[k] = 0
    if (oppByKey[k] === undefined) oppByKey[k] = 0
  }

  const cats: WeekCat[] = categories.map((c) => {
    const ratio = HOCKEY_RATIOS[c.key.toUpperCase()]
    return {
      key: c.key,
      label: c.key,
      lowerIsBetter: !!c.reverse,
      isRatio: !!ratio,
      ratioKind: ratio?.kind,
      volumeKey: ratio?.volumeKey,
    }
  })

  return buildCategoryWeek({
    cats,
    myStats: myByKey,
    oppStats: oppByKey,
    myRemaining: mine.remaining,
    oppRemaining: theirs.remaining,
    days,
    format,
    bodies: mine.bodies,
  })
}
