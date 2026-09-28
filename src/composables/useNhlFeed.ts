import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import {
  fetchSkaterSummary, fetchSkaterIce, fetchSkaterRealtime, fetchGoalieSummary, fetchSkaterBios,
  type GoalieRow,
} from '@/services/nhlStats'
import { rateSkaters, type SkaterRate } from '@/hockey/nhlRates'
import { blendSeasons, PRIOR_WEIGHTS } from '@/hockey/blendSeasons'
import { ageFactor, ageAtSeason } from '@/hockey/agingCurve'
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
  /** playerId -> his own weighted games per season, for the availability blend. */
  historyGames?: Map<number, number>
  /**
   * How many players the aging curve could actually be applied to.
   *
   * Reported rather than assumed because the birth-date read degrades softly like everything
   * else here: a relay that does not serve `skater/bios` returns nothing, the ages map is
   * empty, and the board is silently built with NO aging at all. That produced a confident
   * wrong answer three separate times — a sweep that showed "no effect at any setting", and a
   * social card whose numbers quietly reverted. Anything that cares can now check.
   */
  agesKnown?: number
}

const EMPTY: NhlFeed = { rates: [], goalies: [], espn: [], season: '', started: false, historyGames: new Map(), agesKnown: 0 }

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
  const url = `${PROJECTIONS_URL}?season=${season}`
  try {
    const res = await fetch(url)
    if (!res.ok) {
      console.warn(`[useNhlFeed] ${url} -> ${res.status}`)
      return []
    }
    /*
     * A 200 that is not JSON is a DIFFERENT failure from an upstream with nothing to say, and
     * it has to be named. The dev server used to answer this path with the handler's own
     * source — 200, text/javascript — so `res.ok` passed, `res.json()` threw on the leading
     * comment, and an empty list came back looking exactly like a quiet ESPN. The board then
     * reported "could not load projections" about an endpoint that was perfectly healthy in
     * production, and nothing on screen or in the console pointed at the server.
     */
    const type = res.headers.get('content-type') ?? ''
    if (!/json/i.test(type)) {
      console.error(`[useNhlFeed] ${url} answered 200 with '${type}', not JSON — is the API running?`)
      return []
    }
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
  const [current, currentIce, prior, priorIce, curG, priorG, curRt, priorRt, espn,
         prior2, prior2Rt, prior3, prior3Rt, bios] =
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
      /*
       * Two more seasons, for the prior only.
       *
       * Before a puck is dropped a player's rate IS his prior, and one season of it made a
       * down year his new true talent — Matthews rated 0.88 P/GP off an injured 60-game
       * season against the 1.03 his last two say, and ranked 123rd where consensus had 17th.
       * Measured over the DailyFaceoff top 250, every multi-year weighting beat one year on
       * every metric; see src/hockey/blendSeasons.ts for the sweep.
       *
       * Failure here is soft by construction: these come back [] on error and blendSeasons
       * simply weights the seasons it was given, so a bad read costs accuracy, never a board.
       */
      fetchSkaterSummary(seasonId(year - 2)),
      fetchSkaterRealtime(seasonId(year - 2)),
      fetchSkaterSummary(seasonId(year - 3)),
      fetchSkaterRealtime(seasonId(year - 3)),
      /* Birth dates. One read — they do not change between seasons. */
      fetchSkaterBios(seasonId(year - 1)),
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
  const prior2Full = mergeRt(prior2, prior2Rt)
  const prior3Full = mergeRt(prior3, prior3Rt)

  /*
   * AGE EACH SEASON FORWARD TO THE ONE BEING PROJECTED.
   *
   * Without this the prior asserts that a 22-year-old and a 35-year-old are both exactly what
   * they were, and the error runs opposite ways at the two ends — which is why it survived so
   * long, since it cancels in any aggregate mixing them. Measured over 986 player-pairs; see
   * src/hockey/agingCurve.ts.
   *
   * Applied to the counting stats and NOT to games played: the curve measures scoring RATE,
   * and scaling games here would silently turn it into an availability model as well.
   */
  const bornById = new Map<number, string>()
  for (const b of bios) if (b.birthDate) bornById.set(b.playerId, b.birthDate)
  const targetYear = year

  const agedForSeason = (rows: typeof priorFull, seasonStartYear: number) => rows.map((p) => {
    const was = ageAtSeason(bornById.get(p.playerId), seasonStartYear)
    if (was == null) return p
    const f = ageFactor(was, was + (targetYear - seasonStartYear))
    if (f === 1) return p
    const out: any = { ...p }
    for (const k of ['goals', 'assists', 'points', 'plusMinus', 'penaltyMinutes', 'ppPoints',
                     'shots', 'hits', 'blockedShots', 'ppGoals', 'shGoals', 'shPoints']) {
      if (typeof out[k] === 'number') out[k] = out[k] * f
    }
    return out
  })

  /*
   * The prior the rate model regresses toward: the last three seasons, most recent heaviest.
   *
   * Weighted totals over weighted games, so a 20-game season cannot count the same as an
   * 82-game one. A player missing from a season contributes to neither side, which is what
   * keeps a rookie rated on the season he actually played instead of diluted toward zero.
   */
  const blended = blendSeasons(
    [agedForSeason(priorFull, year - 1),
     agedForSeason(prior2Full, year - 2),
     agedForSeason(prior3Full, year - 3)] as any,
    PRIOR_WEIGHTS,
  ) as unknown as typeof priorFull

  /*
   * ...FOR THE PLAYERS WHO ARE STILL HERE. Older seasons contain hundreds of men who have
   * since retired or gone back to the minors, and letting them into the pool is not a small
   * cosmetic problem: it grew the rated roster from ~940 to 1,196, which moves every
   * positional replacement level and re-prices the entire board against players nobody can
   * draft. Connor Bedard fell 121 places on that alone.
   *
   * So the extra seasons inform the RATE of a current player and never add a player. The
   * roster is the most recent season's; anyone absent from it is not in this league any more.
   */
  const activeIds = new Set(priorFull.map((p) => p.playerId))
  const blendedPrior = blended.filter((p) => activeIds.has(p.playerId))

  /* Each player's own games per season, for the availability blend in the projection source.
     ESPN answers "if healthy"; this is what he has actually managed. */
  const historyGames = new Map<number, number>(
    blendedPrior.map((p) => [p.playerId, Number((p as any).typicalGames) || 0]),
  )

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
  const roster = started ? currentFull : blendedPrior.map((p) => ({
    ...p, gamesPlayed: 0, goals: 0, assists: 0, points: 0,
    plusMinus: 0, penaltyMinutes: 0, ppPoints: 0, shots: 0,
    hits: 0, blockedShots: 0, ppGoals: 0, shGoals: 0, shPoints: 0,
  }))

  return {
    historyGames,
    agesKnown: bornById.size,
    rates: rateSkaters(roster, started ? currentIce : priorIce, blendedPrior),
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
