import type { AvailablePlayerRow } from '@/draft/room/board'
import { buildHockeyValue, type HockeyProjection } from './hockeyValue'
import { buildHockeyVor } from './hockeyVor'
import { buildHockeyCategoryValue } from './hockeyCategoryValue'
import { isCategoryLeague, type HockeyLeagueRules } from './hockeyLeague'
import { marketDisagreement } from '@/draft/room/marketDisagreement'

/**
 * A draft board for a hockey league: projections in, ranked rows out.
 *
 * This is the join between the three hockey modules and the sport-agnostic draft board. The
 * board itself needed no changes — `buildBoard` has never known what sport it is looking at,
 * and it still does not.
 *
 * ORDERED BY VALUE OVER REPLACEMENT, NOT BY POINTS. The difference decides drafts. In the
 * test league defence replacement is 139.9 where forward replacement is 149.3, so an elite
 * defenceman outranks forwards who outscore him — the seat he is competing for is cheaper to
 * fill badly. A board sorted by points would quietly tell you to take the forward.
 *
 * AND THE LEVELS RESPOND. `drafted` reaches the replacement calculation, so seats are spent
 * as they are taken. This file was a preseason ranking with rows hidden for a while — taking
 * sixty players moved every level by exactly zero — so it is worth naming.
 *
 * With the caveat recorded on HockeyVorInput.drafted: a draft that follows this board exactly
 * moves nothing, by arithmetic. It is departures from our ordering that re-price the pool.
 */

export interface HockeyBoardInput {
  projections: Record<string, HockeyProjection>
  rules: HockeyLeagueRules
  /** playerKey -> display name, from the projection feed. */
  namesByKey: Record<string, string>
  /** playerKey -> pro team abbreviation, when known. */
  teamsByKey?: Record<string, string>
  /** Already drafted, by key. Excluded from the board. */
  drafted?: Set<string>
  /** Games each player has already played, for an in-season board. */
  gamesPlayed?: Record<string, number>
  /**
   * Categories this manager is NOT contesting. Category leagues only.
   *
   * PUNTING IS THE ONE STRATEGY A CATEGORY BOARD CANNOT IGNORE. You win a week by taking
   * more columns than your opponent, not by being good at all of them, so conceding two on
   * purpose to dominate the rest is a coherent plan rather than a concession — and it changes
   * what every player is worth to YOU. A goalie is a first-round pick or an afterthought
   * depending on whether you are contesting wins.
   *
   * Punted columns are dropped before anything is standardised, not scored and then ignored.
   * That matters: it also moves the mean and spread of every remaining column, because the
   * draftable pool those are measured over is itself chosen on contested value.
   */
  punted?: Set<string>
}

/** A board row, plus the two things hockey adds: the market's price and an injury flag. */
export interface HockeyBoardRow extends AvailablePlayerRow {
  adp?: number | null
  /** Rounds of disagreement with ADP. Positive means we rank him higher than the room. */
  marketRounds?: number
  marketFlag?: 'value' | 'fade' | ''
}

export interface HockeyBoardResult {
  rows: HockeyBoardRow[]
  /** Replacement level per pool, so a surface can explain WHY a player ranks where he does. */
  replacement: Record<string, number>
  /** Scored stat ids we could not name — every total is short by whatever they were worth. */
  unnamedScoredStatIds: number[]
  /** How the board was priced, because the two are read differently. */
  mode: 'points' | 'categories'
  /** Every column the league is decided in. Empty for a points board. */
  categoryKeys: string[]
  /** The columns actually priced — the league's, less anything punted. */
  contestedKeys: string[]
  /** playerKey -> category key -> z-score. Empty for a points board. */
  perCategoryByKey: Record<string, Record<string, number>>
}

/**
 * The columns actually being contested.
 *
 * A punt of EVERYTHING is refused — it would price the whole league at nothing and produce a
 * board in arbitrary order, which looks like a board. Punting every column is not a strategy,
 * it is an empty filter, so the league's own categories stand.
 */
export function contestedCategories(
  rules: HockeyLeagueRules,
  punted: Set<string> | undefined,
): HockeyLeagueRules['categories'] {
  if (!punted?.size) return rules.categories
  const kept = rules.categories.filter((c) => !punted.has(c.key))
  return kept.length ? kept : rules.categories
}

/**
 * The quantity each player is ranked on, before replacement level is subtracted.
 *
 * TWO CURRENCIES, ONE PIPELINE. A points league produces projected points; a category league
 * produces summed z-scores. Both are "more is better, and the gaps mean something", which is
 * everything the replacement engine downstream requires — so the split ends here and nothing
 * below this function knows which kind of league it is looking at.
 */
function rankingQuantity(
  input: HockeyBoardInput,
): { points: Record<string, number>; perCategoryByKey: Record<string, Record<string, number>> } {
  const { projections, rules, gamesPlayed, punted } = input

  if (isCategoryLeague(rules.scoringType) && rules.categories.length) {
    const cat = buildHockeyCategoryValue({
      projections,
      categories: contestedCategories(rules, punted),
      draftablePlayers: rules.teams * rules.rosterSize || undefined,
    })
    /*
     * NO ZERO FLOOR HERE, unlike the points branch below.
     *
     * A z-score is negative for every below-average player, and that is close to half the
     * league — dropping them would empty the board by the middle rounds. The points branch
     * filters on `> 0` because there a zero means "we scored him and got nothing", which is
     * the signature of a player with no projection. A category board detects that case
     * differently: a player with no stats contributes to no column and is simply absent from
     * the totals, so the filter is unnecessary as well as wrong.
     */
    return { points: cat.totalByKey, perCategoryByKey: cat.perCategoryByKey }
  }

  const { valueByKey } = buildHockeyValue({
    projections,
    weights: rules.weights,
    gamesPlayed,
    scoringItems: undefined,     // the gap is already carried on the rules
  })

  const points: Record<string, number> = {}
  for (const [key, v] of Object.entries(valueByKey)) {
    /*
     * No projection is no opinion.
     *
     * A player scoring zero reaches the board and then floats upward on any term that
     * rewards uncertainty — the football board had exactly this bug, where players nobody
     * had a number for became recommendations. Drop them instead.
     */
    if (!(v.total > 0)) continue
    points[key] = v.total
  }
  return { points, perCategoryByKey: {} }
}

export function buildHockeyBoard(input: HockeyBoardInput): HockeyBoardResult {
  const { projections, rules, namesByKey, teamsByKey = {}, drafted } = input

  const { points, perCategoryByKey } = rankingQuantity(input)

  const positionByKey: Record<string, string> = {}
  for (const key of Object.keys(points)) {
    positionByKey[key] = projections[key]?.position ?? ''
  }

  const vor = buildHockeyVor({
    points,
    positionByKey,
    slots: rules.slots,
    teams: rules.teams,
    /* Handed down so scarcity moves with the draft. Without it the board was a preseason
       ranking with rows hidden: taking sixty players moved every replacement level by
       exactly zero. */
    drafted,
  })

  const replacement: Record<string, number> = {}
  for (const r of Object.values(vor)) {
    if (replacement[r.pool] === undefined) replacement[r.pool] = r.points - r.vor
  }

  const rows: HockeyBoardRow[] = []
  for (const r of Object.values(vor)) {
    rows.push({
      playerKey: r.playerKey,
      name: namesByKey[r.playerKey] ?? r.playerKey,
      position: r.position,
      proTeam: teamsByKey[r.playerKey],
      /* `value` is the ordering quantity and `projected` is the player's own points, which is
         the same split the football board uses — so a points column stays meaningful when a
         custom ranking list re-seats the order. */
      value: r.vor,
      projected: r.points,
      adp: projections[r.playerKey]?.adp ?? null,
      /* Flagged, never discounted: the projection already accounts for missed games. */
      injuryStatus: projections[r.playerKey]?.injuryStatus ?? null,
    })
  }
  rows.sort((a, b) => b.value - a.value)

  /*
   * WHERE WE AND THE ROOM DISAGREE.
   *
   * Measured in ROUNDS, which is the unit a drafter already thinks in and scales itself to
   * league size without a tuning constant. A badge on every row carries as much information
   * as a badge on none, so the threshold is a full round and most players get nothing.
   *
   * Our rank is by VOR and ESPN's is by ADP, so this is the board arguing with the market
   * about the same player rather than two different lists side by side. Reusing the football
   * room's module verbatim — it never knew what sport it was looking at.
   */
  const adpOrder = [...rows]
    .filter((r) => typeof r.adp === 'number')
    .sort((a, b) => (a.adp as number) - (b.adp as number))
  const adpRankByKey = new Map(adpOrder.map((r, i) => [r.playerKey, i + 1]))
  rows.forEach((r, i) => {
    const read = marketDisagreement({
      projRank: i + 1,
      adpRank: adpRankByKey.get(r.playerKey),
      teams: rules.teams,
    })
    r.marketRounds = read.rounds
    r.marketFlag = read.flag
  })

  const categoryMode = isCategoryLeague(rules.scoringType) && rules.categories.length > 0
  return {
    rows,
    replacement,
    unnamedScoredStatIds: rules.unnamedScoredStatIds,
    mode: categoryMode ? 'categories' : 'points',
    categoryKeys: categoryMode ? rules.categories.map((c) => c.key) : [],
    contestedKeys: categoryMode ? contestedCategories(rules, input.punted).map((c) => c.key) : [],
    perCategoryByKey,
  }
}
