import { computed, ref, type ComputedRef } from 'vue'
import {
  fetchSkaterSummary, fetchSkaterIce, fetchSkaterRealtime, fetchGoalieSummary, type GoalieRow,
} from '@/services/nhlStats'
import { rateSkaters, type SkaterRate } from '@/hockey/nhlRates'
import { ratesToProjection } from '@/hockey/ratesToProjection'
import {
  buildHockeyCategoryValue, categoriesFromScoringItems, type HockeyCategory,
} from '@/hockey/hockeyCategoryValue'
import { buildHockeyValue } from '@/hockey/hockeyValue'
import { isCategoryLeague, weightsFromScoringItems } from '@/hockey/hockeyLeague'
import { useLeagueStore } from '@/stores/league'
import { useAuthStore } from '@/stores/auth'
import { usePlatformsStore } from '@/stores/platforms'

/**
 * The rest-of-season hockey board, in the currency a category league actually settles in.
 *
 * NOT points. A category league has no exchange rate between a shot and a penalty minute — you
 * win a column by having more of it than the man opposite, so the unit is standard deviations
 * and `buildHockeyCategoryValue` already computes exactly that, two-pass against a startable
 * pool with goalies kept out of the skater distribution. This composable is the wiring, not a
 * second opinion.
 *
 * WHY THERE IS A PRIOR AT ALL. Without last season the board opens the year with every forward
 * tied at 0.505 points a game — measured, not hypothetical — which puts Sean Kuraly above
 * Connor McDavid on the one night of the season when the most people are looking. A prior about
 * the player beats a mean about the population, and the league publishes it.
 */

/**
 * The columns a player actually wins, best first.
 *
 * The number that ranks a category board is a SUM, and a sum hides the thing the reader needs:
 * two players at 5.0 are not the same player if one got there on goals and the other on
 * penalty minutes. In football equal points really does mean interchangeable, because there is
 * one currency. Here it does not, and a board that implied otherwise would be lying in the
 * most expensive way — to somebody deciding which of two players fixes their team.
 */
function topCategories(perCat: Record<string, number> | undefined, n = 3): string[] {
  if (!perCat) return []
  return Object.entries(perCat)
    .filter(([, z]) => z > 0.5)          // a column he is actually good at, not merely present in
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k)
}

/** A season id the NHL understands: 2026 -> '20262027'. */
function seasonId(startYear: number): string {
  return `${startYear}${startYear + 1}`
}

/**
 * Standard category scoring, for a reader with no league connected.
 *
 * The real default: goals, assists, plus-minus, penalty minutes, power-play points and shots.
 * That is what Yahoo and ESPN ship, and it is six columns rather than the seven an earlier
 * version had.
 *
 * POINTS IS NOT AMONG THEM, and leaving it out is the correction that matters. PTS is G + A by
 * definition, so a set containing all three counts every goal twice and every assist twice —
 * which quietly triples the weight of scoring against the columns that are supposed to balance
 * it, and turns a category board back into a points board wearing z-scores. The chips on the
 * rows are what exposed it: nearly every player was winning PTS, because nearly every player
 * who wins G or A wins it by construction.
 *
 * Hits and blocks stay out because the feed cannot fill them — a column that always reads zero
 * ranks every player as equally bad at it rather than as unmeasured.
 */
export const DEFAULT_CATEGORIES: HockeyCategory[] = [
  { key: 'G', statId: 13, reverse: false },
  { key: 'A', statId: 14, reverse: false },
  { key: 'PLUSMINUS', statId: 15, reverse: false },
  { key: 'PIM', statId: 17, reverse: false },
  { key: 'PPP', statId: 38, reverse: false },
  { key: 'SOG', statId: 29, reverse: false },
]

/**
 * Goalie categories, which are a different game from a skater's.
 *
 * A goalie has no shots on goal and a skater has no saves, so the two are standardised over
 * separate pools and ranked as separate lists. Combining them would produce a z-total across
 * categories nobody can hold in one hand — and the model already refuses to, which is why this
 * exists rather than being bolted onto the skater set.
 *
 * GAA reverses: a lower goals-against average wins the column.
 */
/** Columns that belong to goalies, so the skater pass can exclude them. */
const GOALIE_KEYS = new Set(['W', 'L', 'SV', 'SHO', 'GA', 'GAA', 'SVPCT', 'SA', 'OTL', 'DEC'])

export const GOALIE_CATEGORIES: HockeyCategory[] = [
  { key: 'W', statId: 1, reverse: false },
  { key: 'SV', statId: 6, reverse: false },
  { key: 'SHO', statId: 7, reverse: false },
  { key: 'GA', statId: 4, reverse: true },
]

/** A 12-team league rostering ~14 skaters apiece. The pool the z-scores are measured over. */
const DRAFTABLE = 168
/** Two goalies a team, so the pool that matters is far smaller than the skater one. */
const DRAFTABLE_G = 24

/**
 * The league's own mugshot for a player.
 *
 * `teamAbbrevs` carries every team a player appeared for — "COL,CAR" after a trade — and the
 * image lives under the one he is with now, which is the last of them.
 */
function headshot(playerId: number, teamAbbrevs: string, season: string): string {
  const team = String(teamAbbrevs || '').split(',').pop()?.trim() || ''
  return `https://assets.nhle.com/mugs/nhl/${season}/${team}/${playerId}.png`
}

export interface HockeyRankRow {
  playerKey: string
  name: string
  position: string
  team: string
  headshot: string
  /** The columns this player actually wins, best first — what a category board is FOR. */
  wins: string[]
  /** Total z across the league's columns — what the board ranks on. */
  value: number
  /** Per-game points, for a reader who wants a number they recognise. */
  pointsPerGame: number
  /** Power-play seconds per game. Minutes are the opportunity signal. */
  ppSecondsPerGame: number
  /** 0..1 — how much of this is the player rather than a prior. */
  confidence: number
  rank: number
}

export function useHockeyRankings(): {
  rows: ComputedRef<HockeyRankRow[]>
  goalies: ComputedRef<HockeyRankRow[]>
  /** The columns actually being scored, and whether they came from the league or a default. */
  categories: ComputedRef<HockeyCategory[]>
  fromLeague: ComputedRef<boolean>
  /** 'points' or 'categories' — the league's own shape, which decides what the numbers mean. */
  mode: ComputedRef<'points' | 'categories'>
  loading: ComputedRef<boolean>
  ready: ComputedRef<boolean>
  /** Categories the feed cannot fill for this league. Named, never silently dropped. */
  missing: ComputedRef<string[]>
} {
  const leagueCats = ref<HockeyCategory[] | null>(null)
  const leagueWeights = ref<Record<string, number> | null>(null)
  /* 'categories' | 'points' — and it is the LEAGUE that says which, never the shape of the
     settings blob. */
  const mode = ref<'categories' | 'points'>('categories')

  /*
   * The LEAGUE's columns, not a house set.
   *
   * A category board is only about your league if it counts your league's categories. One that
   * scores hits and blocks and gets ranked on goals and shots is answering a question nobody
   * asked — and the earlier version shipped a hardcoded six, which is right for a reader with
   * no league connected and wrong for everybody else.
   *
   * `categoriesFromScoringItems` takes direction from ESPN's own `isReverseItem` rather than
   * guessing, which matters because several hockey columns genuinely go both ways: penalty
   * minutes are won by having more in most leagues and fewer in some.
   */
  async function loadLeagueCategories() {
    const leagueStore = useLeagueStore()
    if (leagueStore.activeSport !== 'hockey') return
    const key = String(leagueStore.activeLeagueId ?? '')
    const parts = key.split('_')          // espn_{sport}_{leagueId}_{season}
    if (parts[0] !== 'espn' || parts.length < 4) return
    try {
      const authStore = useAuthStore()
      const platformsStore = usePlatformsStore()
      const { espnService } = await import('@/services/espn')
      if (authStore.user?.id) await espnService.initialize(authStore.user.id)
      const creds = platformsStore.getEspnCredentials()
      if (creds) espnService.setCredentials(creds.espn_s2, creds.swid)
      const scoring: any = await espnService.getScoringSettings(
        parts[1] as any, parts[2], parseInt(parts[3], 10))
      /*
       * POINTS OR CATEGORIES, and the league's own scoringType is the only thing that can say.
       *
       * hockeyLeague.ts warns about exactly this: "A points league lists every stat it could
       * score and zeroes most, so reading this for one would report twenty-one categories it
       * does not have." That is what shipped — a ten-team H2H_POINTS league was z-scored
       * across fourteen imaginary columns, which is not a different presentation of the same
       * answer, it is a different question. The draft board has always branched here; the
       * rankings page did not.
       */
      const scoringType = String(scoring?.scoringType ?? '')
      if (isCategoryLeague(scoringType)) {
        mode.value = 'categories'
        const { categories } = categoriesFromScoringItems(scoring?.scoringItems)
        if (categories.length >= 3) leagueCats.value = categories
      } else {
        mode.value = 'points'
        const { weights } = weightsFromScoringItems(scoring?.scoringItems)
        if (weights && Object.keys(weights).length) leagueWeights.value = weights
      }
    } catch (e) {
      /* Defaults stand, and `fromLeague` says so. A board quietly scored on the wrong columns
         is worse than one that admits it is showing the standard set. */
      console.warn('[useHockeyRankings] league categories unavailable', e)
    }
  }

  const rates = ref<SkaterRate[]>([])
  const goalieRows = ref<GoalieRow[]>([])
  const seasonRef = ref('')
  const loadingRef = ref(true)

  async function load() {
    loadingRef.value = true
    try {
      const year = new Date().getFullYear()
      /*
       * Last season is fetched alongside this one, not instead of it. Early in a season the
       * prior is doing nearly all the work and by March it is doing almost none — the
       * shrinkage handles that transition on its own, so there is no date logic here deciding
       * when to "switch over". A rule like that is the kind that is wrong for a week every
       * year and nobody notices.
       */
      const [current, currentIce, prior, priorIce, curG, priorG, curRt, priorRt] = await Promise.all([
        fetchSkaterSummary(seasonId(year)),
        fetchSkaterIce(seasonId(year)),
        fetchSkaterSummary(seasonId(year - 1)),
        fetchSkaterIce(seasonId(year - 1)),
        fetchGoalieSummary(seasonId(year)),
        fetchGoalieSummary(seasonId(year - 1)),
        fetchSkaterRealtime(seasonId(year)),
        fetchSkaterRealtime(seasonId(year - 1)),
      ])

      /*
       * Before a puck is dropped the current season returns NOTHING — not thin data, an empty
       * list — and rateSkaters has no roster to rate, so the board renders its "feed is not
       * answering" state on a feed that is answering perfectly.
       *
       * The roster for opening night is last season's, with every counting stat zeroed. That
       * is not a fallback so much as the truth: nobody has played, so every player's record
       * this year IS zero games, and the prior is what the whole rate model exists to lean on
       * until that changes. Ice time comes from last season for the same reason — power-play
       * minutes are the most stable thing about a player across a summer, and an opening-night
       * board with no PP signal would throw away its best column.
       */
      /* Hits and blocks arrive on their own report, so they are merged onto the rows before
         rating — the rate model shrinks them exactly like goals, which is the point. */
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

      const started = currentFull.length > 0
      const roster = started ? currentFull : priorFull.map((p) => ({
        ...p, gamesPlayed: 0, goals: 0, assists: 0, points: 0,
        plusMinus: 0, penaltyMinutes: 0, ppPoints: 0, shots: 0,
        hits: 0, blockedShots: 0, ppGoals: 0, shGoals: 0, shPoints: 0,
      }))
      rates.value = rateSkaters(roster, started ? currentIce : priorIce, priorFull)
      /* Goalies take last season wholesale before the season starts, for the same reason the
         skaters do — and unlike skaters they are not rate-shrunk here, because a goalie's
         fantasy value is dominated by how often he STARTS, which is a fact about his coach
         rather than a rate that needs regressing. */
      goalieRows.value = curG.length ? curG : priorG
      seasonRef.value = started ? seasonId(year) : seasonId(year - 1)
    } catch (e) {
      console.error('[useHockeyRankings] load failed', e)
      rates.value = []
    } finally {
      loadingRef.value = false
    }
  }
  void load()
  void loadLeagueCategories()

  const activeCats = computed<HockeyCategory[]>(() => leagueCats.value ?? DEFAULT_CATEGORIES)

  const built = computed(() => {
    if (!rates.value.length) return { rows: [] as HockeyRankRow[], missing: [] as string[] }
    /* Games left is a scalar here: this is a season-long board, and a per-player remaining
       count would need a schedule read that changes nobody's ORDER, only the size of every
       number by the same factor. */
    /* Goalie columns are filtered out of the skater pass: a skater standardised on wins and
       saves would read as catastrophically bad at both, which is not a fact about him. */
    const skaterCats = activeCats.value.filter((c) => !GOALIE_KEYS.has(c.key))
    const { projections, missing } = ratesToProjection(rates.value, 82,
      skaterCats.map((c) => c.key))
    /*
     * A points league is ranked on POINTS, which is what it pays. Standard deviations answer
     * "how far clear of the field is he in each column", and a league with an exchange rate
     * has already told us how to trade those columns against each other — so imposing z-scores
     * on top would be overruling the league with a statistic it does not use.
     */
    let totalByKey: Record<string, number>
    let perCategoryByKey: Record<string, Record<string, number>>
    if (mode.value === 'points' && leagueWeights.value) {
      const { valueByKey } = buildHockeyValue({ projections, weights: leagueWeights.value })
      totalByKey = {}
      for (const [k, v] of Object.entries(valueByKey)) totalByKey[k] = (v as any).total ?? 0
      /* No per-category chips in a points league: the columns are not columns, they are terms
         in one sum, and "he wins shots" says nothing when shots are simply worth 0.1 each. */
      perCategoryByKey = {}
    } else {
      const built = buildHockeyCategoryValue({
        projections,
        categories: skaterCats,
        draftablePlayers: DRAFTABLE,
      })
      totalByKey = built.totalByKey
      perCategoryByKey = built.perCategoryByKey
    }

    const byId = new Map(rates.value.map((r) => [String(r.playerId), r]))
    const rows = Object.entries(totalByKey)
      .map(([key, value]) => {
        const r = byId.get(key)
        return {
          playerKey: key,
          name: r?.name ?? key,
          position: r?.position ?? '',
          team: r?.team ?? '',
          headshot: r ? headshot(r.playerId, r.team, seasonRef.value) : '',
          wins: topCategories(perCategoryByKey[key]),
          value,
          pointsPerGame: r?.perGame.points ?? 0,
          ppSecondsPerGame: r?.ppSecondsPerGame ?? 0,
          confidence: r?.confidence ?? 0,
          rank: 0,
        }
      })
      .sort((a, b) => b.value - a.value)
    rows.forEach((r, i) => { r.rank = i + 1 })
    return { rows, missing }
  })

  const builtGoalies = computed<HockeyRankRow[]>(() => {
    const rows = goalieRows.value
    if (!rows.length) return []
    const projections: Record<string, any> = {}
    for (const g of rows) {
      projections[String(g.playerId)] = {
        playerKey: String(g.playerId),
        position: 'G',
        stats: { W: g.wins, SV: g.saves, SHO: g.shutouts, GA: g.goalsAgainst, GP: g.gamesStarted },
      }
    }
    const { totalByKey, perCategoryByKey } = buildHockeyCategoryValue({
      projections, categories: GOALIE_CATEGORIES, draftablePlayers: DRAFTABLE_G,
    })
    const byId = new Map(rows.map((g) => [String(g.playerId), g]))
    const out = Object.entries(totalByKey).map(([key, value]) => {
      const g = byId.get(key)
      return {
        playerKey: key,
        name: g?.goalieFullName ?? key,
        position: 'G',
        team: String(g?.teamAbbrevs ?? '').split(',').pop()?.trim() ?? '',
        headshot: g ? headshot(g.playerId, g.teamAbbrevs, seasonRef.value) : '',
        wins: topCategories(perCategoryByKey[key]),
        value,
        /* Starts, not points. A goalie with eight starts in nine team games is a different
           asset from a fifty-fifty tandem no matter how the rate stats compare. */
        pointsPerGame: g?.gamesStarted ?? 0,
        ppSecondsPerGame: 0,
        confidence: g && g.gamesStarted > 0 ? 1 : 0,
        rank: 0,
      }
    }).sort((a, b) => b.value - a.value)
    out.forEach((r, i) => { r.rank = i + 1 })
    return out
  })

  return {
    rows: computed(() => built.value.rows),
    goalies: builtGoalies,
    categories: activeCats,
    fromLeague: computed(() => leagueCats.value !== null || leagueWeights.value !== null),
    mode: computed(() => mode.value),
    loading: computed(() => loadingRef.value),
    ready: computed(() => built.value.rows.length > 0),
    missing: computed(() => built.value.missing),
  }
}
