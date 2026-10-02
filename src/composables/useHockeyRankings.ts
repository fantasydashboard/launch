import { computed, ref, type ComputedRef } from 'vue'
import { useNhlFeed } from '@/composables/useNhlFeed'
import { mergeFeed } from '@/hockey/mergeFeed'
import { goalieRankInput } from '@/hockey/goalieRankInput'
import { seasonHorizon } from '@/hockey/seasonHorizon'
import { usePowerTrajectory } from '@/composables/usePowerTrajectory'
import {
  buildHockeyCategoryValue, categoriesFromScoringItems, type HockeyCategory,
} from '@/hockey/hockeyCategoryValue'
import { buildHockeyValue } from '@/hockey/hockeyValue'
import { isCategoryLeague, weightsFromScoringItems } from '@/hockey/hockeyLeague'
import { useLeagueStore } from '@/stores/league'
import { useAuthStore } from '@/stores/auth'
import { usePlatformsStore } from '@/stores/platforms'
import { yahooHockeyWeights, yahooHockeyCategories } from '@/hockey/yahooHockeyWeights'

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
 *
 * THE STANDARD SET, AND RATES WHERE THE STANDARD HAS RATES. This used to score saves and total
 * goals against. Total goals against punishes playing: a goalie with sixty starts concedes more
 * than one with forty at the same quality, so Hellebuyck sat 17th and Shesterkin 14th behind
 * tandem goalies. ESPN's default goalie columns are W, GAA, SV% and SO (src/hockey/manualRules.ts
 * already says so), and the category engine already prices a rate as impact — distance from the
 * pool average times the volume behind it — so a backup's twenty good starts count for twenty
 * starts, not sixty. See RATE_VOLUME in src/hockey/hockeyCategoryValue.ts.
 */
/** Columns that belong to goalies, so the skater pass can exclude them. */
const GOALIE_KEYS = new Set(['W', 'L', 'SV', 'SHO', 'GA', 'GAA', 'SVPCT', 'SA', 'OTL', 'DEC'])

export const GOALIE_CATEGORIES: HockeyCategory[] = [
  { key: 'W', statId: 1, reverse: false },
  { key: 'GAA', statId: 10, reverse: true },
  { key: 'SVPCT', statId: 11, reverse: false },
  { key: 'SHO', statId: 7, reverse: false },
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
  /** Games he has actually played. The row's other numbers are a projection; this is not. */
  gamesPlayed: number
  /** ESPN's designation — OUT, DAY_TO_DAY, INJURY_RESERVE. Null when he is fine. */
  injuryStatus: string | null
  rank: number
}

export interface HockeyRankingsOptions {
  /**
   * The public board: default scoring, nobody's league.
   *
   * /hockeyrankings is the FREE board — the one every card and tier post links to — and a free
   * board has to be the same board for everyone who opens it. Left to itself this composable
   * reads the reader's connected league and re-scores against ITS categories, and flips between
   * points and category mode on its say-so. A signed-in manager would then land on a page that
   * silently disagrees with the card that sent him there, and neither of them would be wrong.
   *
   * The league-scoped board is not being withheld as a paid feature; it is on the pages that
   * are about his league. This one is about the sport.
   */
  publicBoard?: boolean
}

export function useHockeyRankings(options: HockeyRankingsOptions = {}): {
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

    /*
     * YAHOO PUBLISHES ITS SCORING TOO, and this function only ever asked ESPN.
     *
     * The early return below was `parts[0] !== 'espn'`, so every Yahoo hockey league fell
     * straight past it with `mode` still at its default. A Yahoo POINTS league therefore got
     * the standard six-category board — standard deviations, under a line admitting "we could
     * not read your league's own columns" — while the same league's Trades page priced it in
     * points perfectly well. Two pages, one league, two different questions answered.
     *
     * This is the same gap yahooHockeyWeights.ts was written to close for useHockeyValue; that
     * fix reached the value engine and never reached this board. The helpers already exist and
     * are tested, so this is wiring, not a new model.
     */
    if (parts[0] === 'yahoo' || key.includes('.l.')) {
      try {
        const { yahooService } = await import('@/services/yahoo')
        const settings = await yahooService.getLeagueSettings(key).catch(() => null)
        const { weights } = yahooHockeyWeights(settings?.stat_categories, settings?.stat_modifiers)
        if (weights && Object.keys(weights).length) {
          /* Modifiers present means the league pays per stat: a points league. */
          mode.value = 'points'
          leagueWeights.value = weights
          return
        }
        const cats = yahooHockeyCategories(settings?.stat_categories)
        if (cats.categories.length >= 3) {
          mode.value = 'categories'
          leagueCats.value = cats.categories
        }
      } catch (e) {
        console.warn('[useHockeyRankings] Yahoo league scoring unavailable', e)
      }
      return
    }

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

  /*
   * ONE FEED, shared with the draft board and the value engine behind Today and My Team.
   *
   * This composable used to fetch and rate the NHL's skaters itself, which made the rankings
   * page the only surface running the rate model — the draft board and My Team ran ESPN's
   * projection instead. Two sources for one sport is a product that contradicts itself, and a
   * manager checking both pages had no way to tell which to believe.
   */
  const espnSeason = computed(() => {
    /* An NHL season is named for the year it ENDS, and the changeover is the summer. */
    const now = new Date()
    return now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear()
  })
  const { feed, loading: loadingRef } = useNhlFeed(espnSeason)

  /* The public board never asks whose league it is. See HockeyRankingsOptions.publicBoard. */
  if (!options.publicBoard) void loadLeagueCategories()

  /*
   * HOW MUCH SEASON IS LEFT, which this board never asked.
   *
   * It built values with no horizon at all — a FULL-SEASON total under a heading that reads
   * "REST OF SEASON". In preseason those coincide and nothing looks wrong. In January they do
   * not: a player forty games into his year reads at his whole season here and at his
   * remaining games on Trades, and the same league's two pages disagree about what he is
   * worth.
   *
   * Applied only once the horizon is KNOWN. weeksLeft starts at 0 meaning "unknown", and a
   * zero horizon would price every player at nothing — so an unknown one keeps the old
   * full-season behaviour rather than briefly emptying the board. The public board has no
   * league to ask and stays on the full season, which is the honest reading of a board that
   * belongs to nobody.
   */
  const trajectory = usePowerTrajectory()
  if (!options.publicBoard) void trajectory.load?.()
  const weeksLeft = computed(() => (options.publicBoard ? 0 : (trajectory.weeksLeft?.value ?? 0)))

  const activeCats = computed<HockeyCategory[]>(() => leagueCats.value ?? DEFAULT_CATEGORIES)

  const built = computed(() => {
    if (!feed.value.rates.length) return { rows: [] as HockeyRankRow[], missing: [] as string[] }
    /* Goalie columns are filtered out of the skater pass: a skater standardised on wins and
       saves would read as catastrophically bad at both, which is not a fact about him. */
    const skaterCats = activeCats.value.filter((c) => !GOALIE_KEYS.has(c.key))
    /* Our rates over ESPN's expected games. Eighty-two for everybody says every player will be
       healthy all year, which is false about a predictable fraction of them and most false
       about exactly the players a manager is deciding between. */
    const merged = mergeFeed(feed.value, skaterCats.map((c) => c.key))
    const { missing, rateByKey } = merged
    /* Goalies are ranked in their own list below, so they are kept out of the skater pool
       here — the merge carries them through for the surfaces that do want them. */
    const projections = Object.fromEntries(
      Object.entries(merged.projections).filter(([k]) => rateByKey[k]),
    )
    /*
     * A points league is ranked on POINTS, which is what it pays. Standard deviations answer
     * "how far clear of the field is he in each column", and a league with an exchange rate
     * has already told us how to trade those columns against each other — so imposing z-scores
     * on top would be overruling the league with a statistic it does not use.
     */
    let totalByKey: Record<string, number>
    let perCategoryByKey: Record<string, Record<string, number>>
    if (mode.value === 'points' && leagueWeights.value) {
      const horizon = weeksLeft.value > 0
        ? seasonHorizon({ weeksLeft: weeksLeft.value, projections, rateByKey })
        : null
      const { valueByKey } = buildHockeyValue({
        projections,
        weights: leagueWeights.value,
        ...(horizon ? { gamesPlayed: horizon.gamesPlayed, gamesLeft: horizon.gamesLeft } : {}),
      })
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

    const rows = Object.entries(totalByKey)
      .map(([key, value]) => {
        const r = rateByKey[key]
        return {
          playerKey: key,
          name: r?.name ?? key,
          position: r?.position ?? '',
          team: r?.team ?? '',
          headshot: r ? headshot(r.playerId, r.team, feed.value.season) : '',
          /* OUT, DAY_TO_DAY, INJURY_RESERVE — from ESPN, because a measured rate cannot know
             it. A board that ranked Cale Makar twelfth while he was listed OUT was answering
             a question about talent when the reader was asking one about this week. */
          injuryStatus: merged.projections[key]?.injuryStatus ?? null,
          wins: topCategories(perCategoryByKey[key]),
          value,
          pointsPerGame: r?.perGame.points ?? 0,
          ppSecondsPerGame: r?.ppSecondsPerGame ?? 0,
          confidence: r?.confidence ?? 0,
          gamesPlayed: r?.gamesPlayed ?? 0,
          rank: 0,
        }
      })
      .sort((a, b) => b.value - a.value)
    rows.forEach((r, i) => { r.rank = i + 1 })
    return { rows, missing }
  })

  const builtGoalies = computed<HockeyRankRow[]>(() => {
    /* The projection, not this season's box score. See src/hockey/goalieRankInput.ts. */
    const rows = goalieRankInput(feed.value.goalieProjections, feed.value.goalies)
    if (!rows.length) return []
    const projections: Record<string, any> = {}
    for (const g of rows) {
      projections[String(g.playerId)] = { playerKey: String(g.playerId), position: 'G', stats: g.stats }
    }
    const { totalByKey, perCategoryByKey } = buildHockeyCategoryValue({
      projections, categories: GOALIE_CATEGORIES, draftablePlayers: DRAFTABLE_G,
    })
    const byId = new Map(rows.map((g) => [String(g.playerId), g]))
    const out = Object.entries(totalByKey).map(([key, value]) => {
      const g = byId.get(key)
      return {
        playerKey: key,
        name: g?.name ?? key,
        position: 'G',
        team: g?.team ?? '',
        headshot: g ? headshot(g.playerId, g.team, feed.value.season) : '',
        wins: topCategories(perCategoryByKey[key]),
        value,
        injuryStatus: null,
        /* Starts, not points. A goalie with sixty starts is a different asset from a
           fifty-fifty tandem no matter how the rate stats compare. */
        pointsPerGame: g?.starts ?? 0,
        ppSecondsPerGame: 0,
        confidence: g && g.starts > 0 ? 1 : 0,
        /* Not "rated off N games": a projection is built on seasons, and the thin-sample chip
           would read "rated off only 1 game" for a starter one game into October. */
        gamesPlayed: 0,
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
