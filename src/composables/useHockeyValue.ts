import { computed, ref, watch, type Ref } from 'vue'
import type { ValueByKey, PlayerValue } from '@/myteam/playerValue'
import { buildHockeyValue } from '@/hockey/hockeyValue'
import { weightsFromScoringItems } from '@/hockey/hockeyLeague'
import { useNhlFeed } from '@/composables/useNhlFeed'
import { normalizeName } from '@/hockey/hockeyProjectionSource'
import { categoriesFromScoringItems, type HockeyCategory } from '@/hockey/hockeyCategoryValue'
import { hockeyDailyCategoryValue } from '@/today/hockeyDailyCategory'
import { mergeFeed } from '@/hockey/mergeFeed'
import { getLeagueType } from '@/config/sports'
import { yahooHockeyWeights, yahooHockeyCategories } from '@/hockey/yahooHockeyWeights'

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
   * REQUIRED, NOT DEFAULTED, and that is the point. It was optional-defaulting-to-espn "so
   * existing callers are unchanged", and one of those unchanged callers — useToday — was
   * already passing a raw Yahoo league key, so it kept the exact bug this field was added to
   * fix for another two weeks. A default that silently makes a wrong call is worse than a
   * compiler error at three call sites.
   */
  platform: Ref<string>
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

  /* The WHOLE feed. This used to pass espn and rates only, so the Today page projected games
     from the pool's centre instead of each player's record, and never saw the goalie model at
     all — it priced goalies off ESPN's raw numbers while the rankings board used ours. */
  const merged = computed(() => mergeFeed(feed.value))

  async function load() {
    if (!inputs.enabled.value || !inputs.leagueId.value) return
    loading.value = true
    problem.value = ''
    try {
      if (inputs.platform.value === 'yahoo') {
        /* Yahoo publishes its scoring as stat_categories + stat_modifiers, in its own column
           names. See src/hockey/yahooHockeyWeights.ts. */
        const { yahooService } = await import('@/services/yahoo')
        const settings = await yahooService.getLeagueSettings(inputs.leagueId.value).catch(() => null)
        /* The same shape useLeagueScoring already consumes for baseball and football: the
           categories array and the modifier map straight off settings, not nested under .stats. */
        const { weights: w, unmatched } = yahooHockeyWeights(
          settings?.stat_categories, settings?.stat_modifiers,
        )
        weights.value = w
        /*
         * THE COLUMNS WERE IN THE PAYLOAD ALL ALONG.
         *
         * This line used to be `categories.value = []`, with a comment saying a Yahoo category
         * league could not be priced and that inventing columns would be worse than saying so.
         * The second half of that was right and the first half was never true: a category
         * league publishes its columns in the same stat_categories array a points league does,
         * and only the modifiers are missing. We were fetching them and throwing them away.
         */
        const cats = yahooHockeyCategories(settings?.stat_categories)
        categories.value = cats.categories
        if (cats.unmatched.length) {
          console.warn(
            '[useHockeyValue] Yahoo category columns we cannot name:', cats.unmatched,
          )
        }
        if (unmatched.length) {
          /* Named rather than swallowed: a column we cannot price ranks the board on rules
             nobody plays by, and looks exactly like a board that is right. */
          console.warn('[useHockeyValue] Yahoo columns this league scores and we cannot name:', unmatched)
        }
        /*
         * WHAT COUNTS AS MISSING DEPENDS ON HOW THE LEAGUE SCORES.
         *
         * A points league is unpriceable without weights. A category league has no modifiers
         * at all and is unpriceable without COLUMNS — so the old unconditional weights check
         * reported "this league published no scoring weights" to every Yahoo category league,
         * which was a true sentence about a thing that did not matter and hid the fact that
         * its columns had been read and discarded. The scoring type is in the same payload.
         */
        const wantsPoints = getLeagueType(settings?.scoring_type) === 'points'
        const missing = wantsPoints
          ? !Object.keys(weights.value).length
          : !categories.value.length
        if (missing) {
          problem.value = wantsPoints
            ? 'This league published no scoring weights, so nothing can be priced.'
            : 'This league published no scoring categories, so nothing can be priced.'
          /*
           * SAY WHERE IT BROKE, not just that it did. An empty weight map has several causes —
           * the settings call failed, the response has different field names, the modifiers
           * arrived in a shape we do not read — and they are indistinguishable from the page,
           * which shows the same "no projection for tonight" for all of them. Printing the
           * shape we actually received is what turns a silent dead end into a five-second
           * diagnosis.
           */
          console.warn('[useHockeyValue] Yahoo scoring produced nothing usable.', {
            leagueKey: inputs.leagueId.value,
            scoringType: settings?.scoring_type,
            wantsPoints,
            categoriesRead: categories.value.length,
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

  watch([inputs.enabled, inputs.leagueId, inputs.season, inputs.platform], load, { immediate: true })

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
    const built = buildHockeyValue({
      projections: merged.value.projections,
      weights: weights.value,
      gamesPlayed: gamesPlayed.value,
      gamesLeft: gamesLeft.value,
    })
    auditValues(built.valueByKey)
    return built.valueByKey
  })

  /**
   * `?valueaudit=1` — what each stat contributed, for the men the board ranks highest.
   *
   * WHY IT IS WORTH A FEW LINES. A points board is a weight map applied to a projection, and
   * when a number comes out absurd — a shutdown defenceman at fifty-six a night against an
   * elite one at three point seven — the projection and the arithmetic can both be checked
   * from outside, and the WEIGHTS cannot. They are read from the league's own settings through
   * a stat-id map this codebase has carried as unverified since it was written.
   *
   * buildHockeyValue already keeps `perStat`, the points each stat contributed, and threw it
   * away at the door. Printing it beside the weights turns "that number is wrong" into "that
   * number is wrong BECAUSE blocked shots are being paid twenty-three points each", which is
   * the difference between a report and a diagnosis.
   *
   * Behind a query parameter and off by default: this is a tool for whoever is holding the
   * bug, not a thing every reader's console should carry.
   */
  function auditValues(byKey: ValueByKey) {
    if (typeof window === 'undefined') return
    /*
     * A QUERY PARAMETER IS NOT A RELIABLE SWITCH HERE. The router rewrites the URL on boot —
     * /today?valueaudit=1 comes back as /today before this ever runs — so the parameter was
     * eaten every time and the audit never fired once. That is also why `?fgaudit` on My Team
     * has to be opened in a fresh tab to work. A stored flag survives the rewrite, survives a
     * reload, and can be set from the console on a page that is already open:
     *
     *     localStorage.setItem('ufd_valueaudit', '1')
     */
    let on = false
    try {
      on = new URLSearchParams(window.location.search).has('valueaudit')
        || localStorage.getItem('ufd_valueaudit') === '1'
    } catch { /* private mode: the parameter alone still works */ }
    if (!on) return
    const rows = Object.entries(byKey)
      .map(([key, v]) => ({ key, name: merged.value.namesByKey[key] ?? key, v }))
      .filter((r) => r.v.games > 0)
      .sort((a, b) => b.v.total / b.v.games - a.v.total / a.v.games)
      .slice(0, 8)
    /* Stashed as well as logged. A console is a poor place to read a table from — it is
       capped, it is shared with every other logger on the page, and this app writes thousands
       of lines parsing ESPN players. The object is the same data, addressable. */
    const stash: any = { weights: { ...weights.value }, players: [] }
    ;(window as any).__ufdValueAudit = stash
    console.warn('[valueaudit] weights this league published:', weights.value)
    for (const r of rows) {
      const proj = merged.value.projections[r.key]
      const perStat = (r.v as any).perStat ?? {}
      const worst = Object.entries(perStat)
        .sort((a: any, b: any) => Math.abs(b[1]) - Math.abs(a[1]))
        .slice(0, 5)
        .map(([k, pts]: any) => `${k} ${Number(pts).toFixed(0)} (${Number(proj?.stats?.[k] ?? 0).toFixed(1)} x ${weights.value[k] ?? '?'})`)
      stash.players.push({
        name: r.name, perGame: r.v.total / r.v.games, games: r.v.games,
        projGP: Number(proj?.stats?.GP ?? 0), perStat: { ...perStat },
      })
      console.warn(
        `[valueaudit] ${r.name}  perGame=${(r.v.total / r.v.games).toFixed(1)}  ` +
        `projGP=${Number(proj?.stats?.GP ?? 0).toFixed(1)}  games=${r.v.games.toFixed(1)}  ` +
        `|  ${worst.join('  ')}`,
      )
    }
  }

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

  /**
   * The same lookup for CATEGORY value, and on Yahoo it is the only one that ever hits.
   *
   * These projections are keyed by ESPN player id (or `nhl:<id>` for a man ESPN does not
   * carry). A Yahoo roster player arrives with a Yahoo player key, so the direct lookup misses
   * for every single one of them — the name map is not a fallback there, it is the whole
   * bridge. Without this a Yahoo hockey category league would read the columns correctly and
   * still show nothing beside any player.
   */
  const categoryValueOf = computed(() => (p: { name?: string }): PlayerValue | null => {
    const key = merged.value.keyByName[normalizeName(String(p?.name ?? ''))]
    return key ? categoryValueByKey.value[key] ?? null : null
  })

  return {
    valueByKey,
    categoryValueByKey,
    categoryValueOf,
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
