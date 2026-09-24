import { computed, ref, type ComputedRef } from 'vue'
import { fetchSkaterSummary, fetchSkaterIce, fetchGoalieSummary, type GoalieRow } from '@/services/nhlStats'
import { rateSkaters, type SkaterRate } from '@/hockey/nhlRates'
import { ratesToProjection } from '@/hockey/ratesToProjection'
import { buildHockeyCategoryValue, type HockeyCategory } from '@/hockey/hockeyCategoryValue'

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
 * Deliberately the common set rather than a maximal one: goals, assists, points, plus-minus,
 * penalty minutes and shots are scored by nearly every league, and every one of them is
 * supplied by the NHL feed. Hits and blocks are NOT here because the feed cannot fill them —
 * putting a column on the board that always reads zero would rank every player as equally bad
 * at it, which is worse than leaving it out and saying so.
 */
export const DEFAULT_CATEGORIES: HockeyCategory[] = [
  { key: 'G', statId: 13, reverse: false },
  { key: 'A', statId: 14, reverse: false },
  { key: 'PTS', statId: 16, reverse: false },
  { key: 'PLUSMINUS', statId: 15, reverse: false },
  { key: 'PIM', statId: 17, reverse: false },
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
  loading: ComputedRef<boolean>
  ready: ComputedRef<boolean>
  /** Categories the feed cannot fill for this league. Named, never silently dropped. */
  missing: ComputedRef<string[]>
} {
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
      const [current, currentIce, prior, priorIce, curG, priorG] = await Promise.all([
        fetchSkaterSummary(seasonId(year)),
        fetchSkaterIce(seasonId(year)),
        fetchSkaterSummary(seasonId(year - 1)),
        fetchSkaterIce(seasonId(year - 1)),
        fetchGoalieSummary(seasonId(year)),
        fetchGoalieSummary(seasonId(year - 1)),
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
      const started = current.length > 0
      const roster = started ? current : prior.map((p) => ({
        ...p, gamesPlayed: 0, goals: 0, assists: 0, points: 0,
        plusMinus: 0, penaltyMinutes: 0, ppPoints: 0, shots: 0,
      }))
      rates.value = rateSkaters(roster, started ? currentIce : priorIce, prior)
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

  const built = computed(() => {
    if (!rates.value.length) return { rows: [] as HockeyRankRow[], missing: [] as string[] }
    /* Games left is a scalar here: this is a season-long board, and a per-player remaining
       count would need a schedule read that changes nobody's ORDER, only the size of every
       number by the same factor. */
    const { projections, missing } = ratesToProjection(rates.value, 82,
      DEFAULT_CATEGORIES.map((c) => c.key))
    const { totalByKey, perCategoryByKey } = buildHockeyCategoryValue({
      projections,
      categories: DEFAULT_CATEGORIES,
      draftablePlayers: DRAFTABLE,
    })
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
    loading: computed(() => loadingRef.value),
    ready: computed(() => built.value.rows.length > 0),
    missing: computed(() => built.value.missing),
  }
}
