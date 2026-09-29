import { computed, ref, watch, type Ref } from 'vue'
import type { ValueByKey, PlayerValue } from '@/myteam/playerValue'
import { buildHockeyValue } from '@/hockey/hockeyValue'
import { weightsFromScoringItems } from '@/hockey/hockeyLeague'
import { useNhlFeed } from '@/composables/useNhlFeed'
import { mergeHockeyProjections, normalizeName } from '@/hockey/hockeyProjectionSource'
import { categoriesFromScoringItems, type HockeyCategory } from '@/hockey/hockeyCategoryValue'
import { hockeyDailyCategoryValue } from '@/today/hockeyDailyCategory'
import { yahooHockeyWeights } from '@/hockey/yahooHockeyWeights'

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
  /** ESPN league id, or the full Yahoo league key — see `platform`. */
  leagueId: Ref<string>
  /**
   * Which platform's settings to read the scoring from.
   *
   * It used to be ESPN unconditionally, and usePointsValue handed this whatever league was
   * active — so a Yahoo league key went to ESPN's settings endpoint, resolved to nothing, and
   * the league was priced with an empty weight map. buildHockeyValue prices nothing without
   * weights, which is why a Yahoo hockey points league showed no number beside any player.
   *
   * Defaults to espn so existing callers are unchanged.
   */
  platform?: Ref<string>
  season: Ref<number>
  enabled: Ref<boolean>
  /** Weeks left in the season, from the shared trajectory. */
  weeksLeft: Ref<number>
}

/**
 * The pool the daily category pass standardises against.
 *
 * The same figure the rankings board uses, deliberately: a player's value on the Today page and
 * his value on /hockeyrankings have to be the same number, and the standardising pool is half of
 * what decides it. Two pages that disagree about who is good is worse than one that says nothing.
 */
const DRAFTABLE = 168

export function useHockeyValue(inputs: HockeyValueInputs) {
  const loading = ref(false)
  const problem = ref('')
  const weights = ref<Record<string, number>>({})
  /* The league's own columns, for a category league. Read from the same settings payload the
     weights come from — it was already being fetched and only half of it was being used. */
  const categories = ref<HockeyCategory[]>([])

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
      if ((inputs.platform?.value ?? 'espn') === 'yahoo') {
        /* Yahoo publishes its scoring as stat_categories + stat_modifiers, in its own column
           names. See src/hockey/yahooHockeyWeights.ts. Categories stay empty: a Yahoo category
           league still cannot be priced, and inventing columns would be worse than saying so. */
        const { yahooService } = await import('@/services/yahoo')
        const settings = await yahooService.getLeagueSettings(inputs.leagueId.value).catch(() => null)
        /* The same shape useLeagueScoring already consumes for baseball and football: the
           categories array and the modifier map straight off settings, not nested under .stats. */
        const { weights: w, unmatched } = yahooHockeyWeights(
          settings?.stat_categories, settings?.stat_modifiers,
        )
        weights.value = w
        categories.value = []
        if (unmatched.length) {
          /* Named rather than swallowed: a column we cannot price ranks the board on rules
             nobody plays by, and looks exactly like a board that is right. */
          console.warn('[useHockeyValue] Yahoo columns this league scores and we cannot name:', unmatched)
        }
        if (!Object.keys(weights.value).length) {
          problem.value = 'This league published no scoring weights, so nothing can be priced.'
          /*
           * SAY WHERE IT BROKE, not just that it did. An empty weight map has several causes —
           * the settings call failed, the response has different field names, the modifiers
           * arrived in a shape we do not read — and they are indistinguishable from the page,
           * which shows the same "no projection for tonight" for all of them. Printing the
           * shape we actually received is what turns a silent dead end into a five-second
           * diagnosis.
           */
          console.warn('[useHockeyValue] Yahoo scoring produced no weights.', {
            leagueKey: inputs.leagueId.value,
            gotSettings: !!settings,
            settingsKeys: settings ? Object.keys(settings) : null,
            statCategories: Array.isArray(settings?.stat_categories)
              ? `array(${settings.stat_categories.length})`
              : typeof settings?.stat_categories,
            statModifiers: Array.isArray(settings?.stat_modifiers)
              ? `array(${settings.stat_modifiers.length})`
              : typeof settings?.stat_modifiers,
            modifierSample: JSON.stringify(settings?.stat_modifiers)?.slice(0, 300),
            categorySample: JSON.stringify(settings?.stat_categories)?.slice(0, 300),
          })
        }
        return
      }

      const { espnService } = await import('@/services/espn')
      const settings = await espnService
        .getRawLeagueViews('hockey', inputs.leagueId.value, inputs.season.value, ['mSettings'])
        .catch(() => null)

      /* The league's OWN weights, read with the hockey stat map. normalizeEspnWeights in
         myteam/pointsScoring is baseball-and-football shaped and would name none of these. */
      const items = settings?.settings?.scoringSettings?.scoringItems
      weights.value = items ? weightsFromScoringItems(items).weights : {}
      categories.value = items ? categoriesFromScoringItems(items).categories : []
      if (!Object.keys(weights.value).length) {
        problem.value = 'This league published no scoring weights, so nothing can be priced.'
      }
    } catch (e: any) {
      problem.value = `Could not load hockey values: ${e?.message ?? e}`
    } finally {
      loading.value = false
    }
  }

  watch([inputs.enabled, inputs.leagueId, inputs.season,
         computed(() => inputs.platform?.value ?? 'espn')], load, { immediate: true })

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
   * The same projections priced as a CATEGORY league prices them, per night.
   *
   * The daily page had no hockey category path at all: it went through the baseball engine,
   * which divides a season value by a FanGraphs projection's games, and hockey has no FanGraphs
   * row — so every player divided by zero and the board read 0.0 for everyone while claiming to
   * still be loading. See src/today/hockeyDailyCategory.ts.
   */
  const categoryValueByKey = computed<ValueByKey>(() =>
    hockeyDailyCategoryValue({
      projections: merged.value.projections,
      categories: categories.value,
      draftablePlayers: DRAFTABLE,
    }),
  )

  /* False is a real answer here, not a spinner: a league whose columns we cannot read has no
     category value, and saying so beats printing 0.0 beside every name. */
  const categoryReady = computed(() =>
    categories.value.length > 0 && Object.keys(merged.value.projections).length > 0,
  )

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
    categoryValueByKey,
    categoryReady,
    categories,
    valueOf,
    loading: computed(() => loading.value || feedLoading.value),
    problem,
    load,
    weights,
    projections: computed(() => merged.value.projections),
  }
}
