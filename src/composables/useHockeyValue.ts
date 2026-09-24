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
 * HOW REMAINING GAMES ARE ESTIMATED, AND WHY IT IS AN ESTIMATE. The season's elapsed fraction
 * is taken from the calendar and applied to every player equally. That is wrong for anybody
 * who has missed time — a player back from six weeks out has more left than this says — and it
 * is stated here rather than hidden, because the alternative on offer was being wrong about
 * the whole sport.
 *
 * WHERE THE NUMBERS COME FROM. The same merged source every other hockey surface reads: our
 * measured NHL rates over ESPN's expected games-played, with ESPN's market and injury data
 * riding along. This composable used to fetch ESPN's projection directly, which made My Team
 * and Today disagree with the rankings page about the same players.
 */

/** NHL regular season: early October to mid April, about twenty-six weeks. */
export const NHL_SEASON_WEEKS = 26

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

  /**
   * Games already gone, estimated from the calendar and applied to everyone alike.
   *
   * See the header: this is the honest weak point. A player who missed a month has more left
   * than this credits him with, and there is no games-played in the feed to know it.
   */
  const gamesPlayed = computed<Record<string, number>>(() => {
    const left = Math.max(0, Math.min(NHL_SEASON_WEEKS, inputs.weeksLeft.value))
    const elapsed = 1 - left / NHL_SEASON_WEEKS
    if (elapsed <= 0) return {}          // preseason: the full projection is what remains
    const out: Record<string, number> = {}
    for (const [key, p] of Object.entries(merged.value.projections)) {
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
