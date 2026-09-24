import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import {
  fetchSkaterSummary, fetchSkaterIce, fetchSkaterRealtime, fetchGoalieSummary, type GoalieRow,
} from '@/services/nhlStats'
import { rateSkaters, type SkaterRate } from '@/hockey/nhlRates'
import type { EspnHockeyPlayer } from '@/hockey/hockeyProjectionSource'

/**
 * The hockey feed, fetched once and shared by every surface that needs it.
 *
 * WHY IT IS SHARED. Three composables wanted hockey projections — Rankings, the Draft Board,
 * and the value engine behind Today and My Team — and each fetched its own. That was eight
 * paged NHL requests plus a 34MB-reduced ESPN read, repeated per surface, and worse than the
 * cost: they were free to drift, and they did. One loader is what makes "one projection" true
 * rather than aspirational.
 *
 * WHY THE CACHE IS A PROMISE AND NOT A RESULT. Two composables mounting in the same tick would
 * both see an empty cache and both start a load. Caching the in-flight promise means the second
 * one waits on the first, which is the difference between one request and two.
 */

export interface NhlFeed {
  /** Every skater, rated. */
  rates: SkaterRate[]
  /** Goalies, raw — there is no goalie rate model. */
  goalies: GoalieRow[]
  /** ESPN's rows: the market, the injuries, and the expected games-played. */
  espn: EspnHockeyPlayer[]
  /** The NHL season the rates describe, for headshot URLs. */
  season: string
  /** Whether the current season has any games in it yet. */
  started: boolean
}

const EMPTY: NhlFeed = { rates: [], goalies: [], espn: [], season: '', started: false }

/** A season id the NHL understands: 2026 -> '20262027'. */
export function seasonId(startYear: number): string {
  return `${startYear}${startYear + 1}`
}

const PROJECTIONS_URL = '/api/hockey-projections'

const cache = new Map<number, Promise<NhlFeed>>()

/** For tests, and for a caller that genuinely wants a fresh read. */
export function clearNhlFeedCache(): void {
  cache.clear()
}

async function fetchEspn(season: number): Promise<EspnHockeyPlayer[]> {
  try {
    const res = await fetch(`${PROJECTIONS_URL}?season=${season}`)
    if (!res.ok) return []
    const payload = await res.json()
    return (payload?.players ?? []) as EspnHockeyPlayer[]
  } catch (e) {
    /* Soft, because ESPN supplies metadata and a horizon, not the numbers. Losing it costs the
       board its ADP column and its injury flags; losing the NHL feed costs it everything. */
    console.warn('[useNhlFeed] ESPN metadata unavailable', e)
    return []
  }
}

async function loadFeed(espnSeason: number): Promise<NhlFeed> {
  const year = new Date().getFullYear()
  /*
   * Last season is fetched alongside this one, not instead of it. Early in a season the prior
   * is doing nearly all the work and by March almost none — the shrinkage handles that
   * transition itself, so there is no date logic here deciding when to "switch over". A rule
   * like that is wrong for a week every year and nobody notices.
   */
  const [current, currentIce, prior, priorIce, curG, priorG, curRt, priorRt, espn] =
    await Promise.all([
      fetchSkaterSummary(seasonId(year)),
      fetchSkaterIce(seasonId(year)),
      fetchSkaterSummary(seasonId(year - 1)),
      fetchSkaterIce(seasonId(year - 1)),
      fetchGoalieSummary(seasonId(year)),
      fetchGoalieSummary(seasonId(year - 1)),
      fetchSkaterRealtime(seasonId(year)),
      fetchSkaterRealtime(seasonId(year - 1)),
      fetchEspn(espnSeason),
    ])

  /* Hits and blocks arrive on their own report, merged on before rating so the rate model
     shrinks them exactly like goals. */
  const mergeRt = (rows: typeof current, rt: typeof curRt) => {
    const by = new Map(rt.map((r) => [r.playerId, r]))
    return rows.map((r) => ({
      ...r,
      hits: by.get(r.playerId)?.hits ?? 0,
      blockedShots: by.get(r.playerId)?.blockedShots ?? 0,
    }))
  }
  const currentFull = mergeRt(current, curRt)
  const priorFull = mergeRt(prior, priorRt)

  /*
   * Before a puck is dropped the current season returns NOTHING — not thin data, an empty list
   * — and there is no roster to rate, so a board renders its "feed is not answering" state on
   * a feed that is answering perfectly.
   *
   * The roster for opening night is last season's with every counting stat zeroed. That is not
   * a fallback so much as the truth: nobody has played, so every player's record this year IS
   * zero games, and the prior is what the rate model exists to lean on until that changes. Ice
   * time comes from last season for the same reason — power-play minutes are the most stable
   * thing about a player across a summer, and an opening-night board with no PP signal would
   * throw away its best column.
   */
  const started = currentFull.length > 0
  const roster = started ? currentFull : priorFull.map((p) => ({
    ...p, gamesPlayed: 0, goals: 0, assists: 0, points: 0,
    plusMinus: 0, penaltyMinutes: 0, ppPoints: 0, shots: 0,
    hits: 0, blockedShots: 0, ppGoals: 0, shGoals: 0, shPoints: 0,
  }))

  return {
    rates: rateSkaters(roster, started ? currentIce : priorIce, priorFull),
    goalies: curG.length ? curG : priorG,
    espn,
    season: started ? seasonId(year) : seasonId(year - 1),
    started,
  }
}

/** The shared loader. Every caller for a given season waits on the same request. */
export function loadNhlFeed(espnSeason: number): Promise<NhlFeed> {
  const hit = cache.get(espnSeason)
  if (hit) return hit
  const p = loadFeed(espnSeason).catch((e) => {
    /* A failed load must not poison the cache, or the page never recovers without a reload. */
    cache.delete(espnSeason)
    console.error('[useNhlFeed] load failed', e)
    return EMPTY
  })
  cache.set(espnSeason, p)
  return p
}

export function useNhlFeed(espnSeason: Ref<number>): {
  feed: ComputedRef<NhlFeed>
  loading: ComputedRef<boolean>
} {
  const state = ref<NhlFeed>(EMPTY)
  const loadingRef = ref(true)

  watch(espnSeason, async (season) => {
    loadingRef.value = true
    /* The season can change under us; only the latest answer may write. */
    const want = season
    const f = await loadNhlFeed(season)
    if (want === espnSeason.value) {
      state.value = f
      loadingRef.value = false
    }
  }, { immediate: true })

  return { feed: computed(() => state.value), loading: computed(() => loadingRef.value) }
}
