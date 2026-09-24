import { computed, ref, watch, type Ref } from 'vue'
import type { ValueByKey, PlayerValue } from '@/myteam/playerValue'
import { buildHockeyValue } from '@/hockey/hockeyValue'
import { weightsFromScoringItems } from '@/hockey/hockeyLeague'
import { useNhlFeed } from '@/composables/useNhlFeed'
import { mergeHockeyProjections, normalizeName } from '@/hockey/hockeyProjectionSource'

/**
 * Rest-of-season hockey value, for every surface that is not the draft board.
 *
 * WHY THIS IS NEEDED AT ALL. `usePointsValue` was a binary — football or baseball — and a
 * hockey league fell through to the baseball branch, where it was matched against FanGraphs
 * projections and found nothing. So The Wire, Trades and My Team were not merely missing for
 * hockey; they were quietly running the wrong sport's engine and returning an empty board.
 * The draft board worked because it never went through here.
 *
 * REST OF SEASON, NOT SEASON. The projection endpoint publishes a full-season line, and in
 * October that is the right number. In February it is not — most of it has already been
 * scored and belongs to whoever held the player then. The value is scaled to the games that
 * REMAIN, which is the same correction the football engine needed.
 *
 * HOW REMAINING GAMES ARE COUNTED. Per player, from what he has actually played — not from
 * the calendar spread evenly over everybody, which is what this used to do and which was
 * wrong for exactly the players a manager is deciding about. A winger back from six weeks out
 * has absorbed his absence already; charging him a share of it again, every week, for the rest
 * of the season, priced him as permanently injured. The NHL feed publishes his games played,
 * so the estimate was never needed.
 *
 * The season's own remaining nights stay as a CEILING, because the correction has an obvious
 * failure mode without one: a player projected 64 games who has played 5 would otherwise be
 * credited with 59 more on a slate with 22 left, which would rank the most-injured players on
 * the wire highest.
 *
 * WHERE THE NUMBERS COME FROM. The same merged source every other hockey surface reads: our
 * measured NHL rates over ESPN's expected games-played, with ESPN's market and injury data
 * riding along. This composable used to fetch ESPN's projection directly, which made My Team
 * and Today disagree with the rankings page about the same players.
 */

/** NHL regular season: early October to mid April, about twenty-six weeks. */
export const NHL_SEASON_WEEKS = 26
/** And eighty-two games inside them. */
export const NHL_SEASON_GAMES = 82

export interface HockeyValueInputs {
  /** ESPN league key or id, for reading the league's own scoring. */
  leagueId: Ref<string>
  season: Ref<number>
  enabled: Ref<boolean>
  /** Weeks left in the season, from the shared trajectory. */
  weeksLeft: Ref<number>
}

export function useHockeyValue(inputs: HockeyValueInputs) {
  const loading = ref(false)
  const problem = ref('')
  const weights = ref<Record<string, number>>({})

  const { feed, loading: feedLoading } = useNhlFeed(inputs.season)

  const merged = computed(() => mergeHockeyProjections({
    espn: feed.value.espn,
    rates: feed.value.rates,
  }))

  async function load() {
    if (!inputs.enabled.value || !inputs.leagueId.value) return
    loading.value = true
    problem.value = ''
    try {
      const { espnService } = await import('@/services/espn')
      const settings = await espnService
        .getRawLeagueViews('hockey', inputs.leagueId.value, inputs.season.value, ['mSettings'])
        .catch(() => null)

      /* The league's OWN weights, read with the hockey stat map. normalizeEspnWeights in
         myteam/pointsScoring is baseball-and-football shaped and would name none of these. */
      const items = settings?.settings?.scoringSettings?.scoringItems
      weights.value = items ? weightsFromScoringItems(items).weights : {}
      if (!Object.keys(weights.value).length) {
        problem.value = 'This league published no scoring weights, so nothing can be priced.'
      }
    } catch (e: any) {
      problem.value = `Could not load hockey values: ${e?.message ?? e}`
    } finally {
      loading.value = false
    }
  }

  watch([inputs.enabled, inputs.leagueId, inputs.season], load, { immediate: true })

  /** Nights the season has left, from the calendar — a ceiling, not a per-player estimate. */
  const gamesLeft = computed(() => {
    const weeks = Math.max(0, Math.min(NHL_SEASON_WEEKS, inputs.weeksLeft.value))
    return Math.round(NHL_SEASON_GAMES * (weeks / NHL_SEASON_WEEKS))
  })

  /**
   * Games already gone, PER PLAYER, measured rather than estimated.
   *
   * Skaters come from the rate model, which carries each man's real games played. Goalies
   * have no rate row — there is no goalie rate model — so they keep the calendar share, and
   * that fallback is named here rather than left to look like a measurement.
   */
  const gamesPlayed = computed<Record<string, number>>(() => {
    const elapsed = 1 - gamesLeft.value / NHL_SEASON_GAMES
    if (elapsed <= 0) return {}          // preseason: the full projection is what remains
    const out: Record<string, number> = {}
    for (const [key, p] of Object.entries(merged.value.projections)) {
      const rate = merged.value.rateByKey[key]
      if (rate) { out[key] = rate.gamesPlayed; continue }
      const total = p.position === 'G' ? (p.stats.DEC || p.stats.GP || 0) : (p.stats.GP || 0)
      out[key] = total * elapsed
    }
    return out
  })

  const valueByKey = computed<ValueByKey>(() => {
    if (!Object.keys(weights.value).length) return {}
    return buildHockeyValue({
      projections: merged.value.projections,
      weights: weights.value,
      gamesPlayed: gamesPlayed.value,
      gamesLeft: gamesLeft.value,
    }).valueByKey
  })

  /**
   * By name, for a free agent the roster pool has no key for.
   *
   * Normalised rather than merely lower-cased, so "T.J. Oshie" and "TJ Oshie" resolve to the
   * same man. The name map itself is built position-aware upstream: there are two Elias
   * Petterssons, a 51-point centre and a 10-point defenceman, and a plain lower-cased map
   * handed out whichever one it happened to keep.
   */
  const valueOf = computed(() => (p: { name?: string }): PlayerValue | null => {
    const key = merged.value.keyByName[normalizeName(String(p?.name ?? ''))]
    return key ? valueByKey.value[key] ?? null : null
  })

  return {
    valueByKey,
    valueOf,
    loading: computed(() => loading.value || feedLoading.value),
    problem,
    load,
    weights,
    projections: computed(() => merged.value.projections),
  }
}
