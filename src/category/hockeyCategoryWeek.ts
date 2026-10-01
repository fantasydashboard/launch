import { buildCategoryWeek, type CategoryWeek, type WeekCat } from './categoryWeek'
import { rosterExpectation } from './rosterExpectation'
import type { CategoryFormat } from './categoryLeverage'

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
 * The hockey columns that are ratios, and the volume each is measured over.
 *
 * Save percentage is saves over shots faced; goals-against average is goals per sixty minutes,
 * for which appearances are the honest exposure we actually project. Everything else in hockey
 * is a count.
 */
export const HOCKEY_RATIOS: Record<string, { kind: 'proportion' | 'rate'; volumeKey: string }> = {
  SVPCT: { kind: 'proportion', volumeKey: 'SA' },
  GAA: { kind: 'rate', volumeKey: 'GP' },
}

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
