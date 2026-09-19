import { computed, ref, watch, type Ref } from 'vue'
import type { ValueByKey, PlayerValue } from '@/myteam/playerValue'
import { buildHockeyValue, type HockeyProjection } from '@/hockey/hockeyValue'
import { weightsFromScoringItems } from '@/hockey/hockeyLeague'

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
 * HOW REMAINING GAMES ARE ESTIMATED, AND WHY IT IS AN ESTIMATE. ESPN's projection feed is
 * preseason and carries no games-played. Rather than pretend otherwise, the season's elapsed
 * fraction is taken from the calendar and applied to every player equally. That is wrong for
 * anybody who has missed time — a player back from six weeks out has more left than this
 * says — and it is stated here rather than hidden, because the alternative on offer was
 * being wrong about the whole sport.
 */

/** NHL regular season: early October to mid April, about twenty-six weeks. */
export const NHL_SEASON_WEEKS = 26

const PROJECTIONS_URL = '/api/hockey-projections'

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
  const projections = ref<Record<string, HockeyProjection>>({})
  const weights = ref<Record<string, number>>({})
  /** Lower-cased name -> playerKey, so a free agent with no key still resolves. */
  const keyByName = ref<Record<string, string>>({})

  async function load() {
    if (!inputs.enabled.value || !inputs.leagueId.value) return
    loading.value = true
    problem.value = ''
    try {
      const { espnService } = await import('@/services/espn')
      const [projRes, settings] = await Promise.all([
        fetch(`${PROJECTIONS_URL}?season=${inputs.season.value}`),
        espnService
          .getRawLeagueViews('hockey', inputs.leagueId.value, inputs.season.value, ['mSettings'])
          .catch(() => null),
      ])

      if (projRes.ok) {
        const payload = await projRes.json()
        const parsed: Record<string, HockeyProjection> = {}
        const names: Record<string, string> = {}
        for (const p of payload?.players ?? []) {
          parsed[p.playerKey] = {
            playerKey: p.playerKey, position: p.position, stats: p.stats ?? {},
            adp: p.adp ?? null, injuryStatus: p.injuryStatus ?? null,
          }
          if (p.name) names[String(p.name).toLowerCase()] = p.playerKey
        }
        projections.value = parsed
        keyByName.value = names
      } else {
        problem.value = `Could not load projections (${projRes.status}).`
      }

      /* The league's OWN weights, read with the hockey stat map. normalizeEspnWeights in
         myteam/pointsScoring is baseball-and-football shaped and would name none of these. */
      const items = settings?.settings?.scoringSettings?.scoringItems
      weights.value = items ? weightsFromScoringItems(items).weights : {}
      if (!Object.keys(weights.value).length) {
        problem.value = problem.value
          || 'This league published no scoring weights, so nothing can be priced.'
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
    for (const [key, p] of Object.entries(projections.value)) {
      const total = p.position === 'G' ? (p.stats.DEC || p.stats.GP || 0) : (p.stats.GP || 0)
      out[key] = total * elapsed
    }
    return out
  })

  const valueByKey = computed<ValueByKey>(() => {
    if (!Object.keys(weights.value).length) return {}
    return buildHockeyValue({
      projections: projections.value,
      weights: weights.value,
      gamesPlayed: gamesPlayed.value,
    }).valueByKey
  })

  /** By name, for a free agent the roster pool has no key for. */
  const valueOf = computed(() => (p: { name?: string }): PlayerValue | null => {
    const key = keyByName.value[String(p?.name ?? '').toLowerCase()]
    return key ? valueByKey.value[key] ?? null : null
  })

  return { valueByKey, valueOf, loading, problem, load, weights, projections }
}
