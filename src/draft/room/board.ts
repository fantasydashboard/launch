/**
 * The ranked board.
 *
 * Ranks by VONA — value over the best player still expected at that position at
 * your NEXT pick — rather than raw value, because that is the decision you are
 * actually making. A back who is barely better than the one you could get a round
 * later is not worth this pick, however good his projection looks.
 *
 * A pick is worth the LARGER of two things, never a blend of them: what he adds
 * to your starting lineup today, and what he is worth sitting on your bench.
 *
 * That used to be a blend that swung fully to bench value the moment your ninth
 * starter was in, on the assumption that "marginal starter value has collapsed to
 * roughly zero for everyone" by then. Measured against a completed draft, the
 * assumption is false and expensive: through eight rounds the engine matched the
 * manager on seven of eight picks, then lost 211 points across the last six by
 * taking backups while a 191-point receiver who would have upgraded a weak WR2
 * sat there. Marginal value is computed per player now, so the collapse can be
 * observed rather than assumed — and for the players who matter it has not
 * happened.
 */

import { marketDisagreement } from './marketDisagreement'

export interface AvailablePlayerRow {
  playerKey: string
  name: string
  position: string
  proTeam?: string
  headshot?: string
  value: number
  /**
   * Our own projected points, before any ranking list re-seated `value`. Shown to
   * the user so the points column stays meaningful when they switch lists — the
   * remapped `value` is an ordering device, not a projection of this player.
   */
  projected?: number
  /** Optional depth-chart/injury signal from the VOR engine. */
  opportunity?: string
  /** Sleeper's own word: Questionable, Doubtful, Out, IR, Sus. */
  injuryStatus?: string | null
}

export interface BoardInput {
  available: AvailablePlayerRow[]
  /**
   * Multiplier per position for whether another player there could still start.
   * Absent means no discount — the board behaves exactly as before.
   */
  needFactor?: Record<string, number>
  /**
   * Points each candidate would add to your CURRENT starting lineup. Absent, the
   * board falls back to the blunt need factor and behaves as it did before.
   */
  marginalByKey?: Record<string, number>
  /**
   * Points of the player this candidate would actually be replacing. For anyone
   * headed to a flex slot that is the best flex-eligible player left, not the
   * best at his own position — a tight end in a FLEX competes with every
   * receiver and back, and his position's scarcity says nothing about it.
   */
  replacementPointsByKey?: Record<string, number>
  /** Which of those candidates land in a flex, so the reason can say so. */
  viaFlexByKey?: Record<string, boolean>
  survival: Record<string, number>
  expectedBestAtPosition: Record<string, number>
  /**
   * The same expectation in projected points. Ranking runs on `value`, but any
   * number shown to the user with "pts" beside it has to be checkable against the
   * points column — and once a ranking list re-seats `value`, those two scales
   * are different. Absent, the points figure falls back to the value figure.
   */
  expectedBestProjectedAtPosition?: Record<string, number>
  adpByKey: Record<string, number>
  currentOverallPick: number
  filledStarterSlots: number
  totalStarterSlots: number
  /**
   * League size, which is what a "round" of rank disagreement means. Absent, the
   * market read is suppressed rather than measured against a nonsense threshold.
   */
  teams?: number
  /**
   * Where WE rank each priced player, for the market comparison only — a
   * replacement-adjusted order, supplied by the caller.
   *
   * ADP is a draft ORDERING: it already prices positional scarcity. Ranking our
   * side on raw points and differencing the two therefore measures a positional
   * artifact, not disagreement about a player. Measured on a live feed with the
   * internal raw-points ranking, 280 of 386 priced players were badged and the
   * split was FADE 66 RB / 40 WR / 29 TE / 2 QB against VALUE 38 QB / 22 TE /
   * 14 K / 10 DEF / 2 RB — the badge was reporting position, not opinion.
   *
   * Must be ranked over the SAME population as `adpByKey` restricted to this
   * board's players, or the two ranks being differenced mean different things.
   * Absent, the internal raw-value ranking below is used unchanged, so callers
   * that do not supply it behave exactly as they did.
   */
  marketRankByKey?: Record<string, number>
}

export interface BoardRow {
  playerKey: string
  name: string
  position: string
  proTeam?: string
  headshot?: string
  value: number
  /** Our projected points, independent of whichever list is ranking. */
  projected: number
  /** 1 while this position can still start for you, lower once it cannot. */
  needFactor: number
  vona: number
  /** VONA in projected points — the version fit to print. */
  vonaPoints: number
  /** Points he would add to your starting lineup today. */
  marginal: number
  /** True when the slot he would fill is a flex rather than his own position. */
  viaFlex: boolean
  /** What the board actually ranks on during the starter rounds. */
  usable: number
  upside: number
  score: number
  survival: number
  tier: number
  overallTier: number
  /** He slid past his ADP to the pick you are on. Only meaningful mid-draft. */
  flag: 'fell' | ''
  /** We and the market disagree by at least a round. A standing property. */
  marketFlag: 'value' | 'fade' | ''
  /** Rounds of that disagreement. Positive: we rank him higher than the market. */
  disagreementRounds: number
  injuryStatus: string | null
  adp: number | null
}

/** How far past ADP a player must still be available to count as a value. */
const VALUE_PICKS = 12
/** Bonus (in points) for a healthy backup behind an injured starter. */
const OPPORTUNITY_UPSIDE = 8
/**
 * Ceiling on the upside term, in points. Market-vs-projection disagreement can
 * run to hundreds of points on a player one side barely rates; uncapped, a single
 * wild disagreement outweighs every real edge on the board.
 */
const MAX_UPSIDE = 40
/**
 * What a player who cannot crack your lineup still keeps. He is depth, injury
 * insurance and a trade piece; he is not a starter, and the gap between those
 * two things is most of what this board exists to express.
 */
const BENCH_FLOOR = 0.35
/** Ceiling on tiers per group — beyond this, "tier" stops meaning anything. */
const MAX_TIERS = 8
/** Roughly how many players belong in a tier. Drives how many tiers we cut. */
const TARGET_TIER_SIZE = 5

const normPos = (p: string) => (p || '').toUpperCase().split(/[,/|]/)[0].trim()

/**
 * Tiers = the biggest cliffs, not "every gap above a threshold".
 *
 * A threshold-based rule fragments badly on a deep position: with two hundred
 * receivers the median gap is near zero, so nearly every gap clears the bar and
 * you get "WR tier 57", which tells the user nothing. Instead, decide how many
 * tiers a group should have and cut at exactly the largest gaps — which is what
 * a person means by a tier: the drop-offs everyone can see.
 *
 * Deterministic, needs no tuning constant, and cannot fragment.
 */
function assignTiers(rows: { playerKey: string; value: number }[]): Record<string, number> {
  const out: Record<string, number> = {}
  if (!rows.length) return out
  const sorted = [...rows].sort((a, b) => b.value - a.value)
  if (sorted.length === 1) {
    out[sorted[0].playerKey] = 1
    return out
  }

  // Always allow at least one cut: a three-man group with an obvious cliff still
  // has two tiers, even though it is smaller than one nominal tier.
  const cuts = Math.min(
    MAX_TIERS - 1,
    Math.max(1, Math.ceil(sorted.length / TARGET_TIER_SIZE) - 1),
  )

  // Gap i sits between sorted[i] and sorted[i+1].
  const gaps = sorted.slice(0, -1).map((p, i) => ({ i, gap: p.value - sorted[i + 1].value }))
  const boundaries = new Set(
    gaps
      .filter((g) => g.gap > 0)
      .sort((a, b) => b.gap - a.gap)
      .slice(0, cuts)
      .map((g) => g.i),
  )

  let tier = 1
  for (let i = 0; i < sorted.length; i++) {
    out[sorted[i].playerKey] = tier
    if (boundaries.has(i)) tier++
  }
  return out
}

export function buildBoard(input: BoardInput): BoardRow[] {
  const {
    available,
    survival,
    expectedBestAtPosition,
    adpByKey,
    currentOverallPick,
    filledStarterSlots,
    totalStarterSlots,
    needFactor,
    expectedBestProjectedAtPosition,
    marginalByKey,
    replacementPointsByKey,
    viaFlexByKey,
    teams,
    marketRankByKey,
  } = input

  const players = (available ?? []).map((p) => ({ ...p, position: normPos(p.position) }))
  if (!players.length) return []

  // Upside proxy, DENOMINATED IN POINTS.
  //
  // We have no variance from the projection feed, but we have two independent
  // opinions. If the market drafts a player like the 20th-best available while we
  // project him 60th, the market is implicitly valuing him at what our 20th-best
  // is worth — so the disagreement, in points, is value(20th) − value(him).
  //
  // An earlier version used the raw rank difference, which was a units bug: VONA
  // is points (tens) and rank deltas are positions (hundreds), so blending them
  // let upside swamp VONA completely and floated zero-projection players to the
  // top of the board. This is market DISAGREEMENT, not modeled variance.
  const byValueDesc = [...players].sort((a, b) => b.value - a.value)
  const projRank = new Map(byValueDesc.map((p, i) => [p.playerKey, i + 1]))
  const valueAtRank = (rank: number): number => {
    const i = Math.max(0, Math.min(byValueDesc.length - 1, rank - 1))
    return byValueDesc[i]?.value ?? 0
  }
  const withAdp = players
    .filter((p) => typeof adpByKey?.[p.playerKey] === 'number')
    .sort((a, b) => adpByKey[a.playerKey] - adpByKey[b.playerKey])
  const adpRank = new Map(withAdp.map((p, i) => [p.playerKey, i + 1]))

  // The market comparison needs a projection rank drawn from the SAME
  // population as adpRank — only players the market has actually priced.
  // `projRank` above ranks across every available player, which is right for
  // the upside term but wrong here: Sleeper omits ADP for most of the player
  // pool, so every unpriced player sitting above someone in `projRank` inflates
  // his rank without ever touching his (unaffected) `adpRank`. A player at
  // pr:200/ar:150 in a big enough pool would read as -4+ rounds and pick up a
  // FADE badge he never earned — pure population-size bookkeeping, not a real
  // market opinion. Re-ranking over `withAdp` compares like with like.
  //
  // Population is only half of it. The ORDER matters too, and ordering by raw
  // `value` is the second half of the same bug: ADP already prices positional
  // scarcity, so differencing it against a raw-points order badges every
  // quarterback VALUE and every back FADE. Callers who can compute a
  // replacement-adjusted order pass it in as `marketRankByKey`; the raw-value
  // fallback below is kept only so callers that supply nothing are unaffected.
  const marketProjRank = marketRankByKey
    ? new Map<string, number>(Object.entries(marketRankByKey))
    : new Map<string, number>(
        [...withAdp].sort((a, b) => b.value - a.value).map((p, i) => [p.playerKey, i + 1]),
      )

  // Tiers within position, plus an overall tier across the whole board — the
  // board can be read either way, and "tier 2 overall" is a different and useful
  // statement from "tier 2 among running backs".
  const tierByKey: Record<string, number> = {}
  const positions = new Set(players.map((p) => p.position))
  for (const pos of positions) {
    Object.assign(tierByKey, assignTiers(players.filter((p) => p.position === pos)))
  }
  const overallTierByKey = assignTiers(players)

  // "Points now, upside late" has to mean LATE. Weighting upside in proportion to
  // slots filled put it at ~55% by round 6, which is squarely still starter
  // territory — and it produced boards where a 170-point player outranked a
  // 206-point one because the market liked him more. Upside now stays at zero
  // until the starting lineup is nearly complete, then takes over for bench picks,
  // which is the round range it was always meant for.
  const remaining = Math.max(0, totalStarterSlots - filledStarterSlots)
  const w = totalStarterSlots > 0 ? Math.min(1, Math.max(0, 1 - remaining)) : 0

  const rows: BoardRow[] = players.map((p) => {
    const adp = typeof adpByKey?.[p.playerKey] === 'number' ? adpByKey[p.playerKey] : null
    const vona = p.value - (expectedBestAtPosition?.[p.position] ?? 0)
    const projected = p.projected ?? p.value
    // Measured against whoever he would actually displace. Falling back to his
    // own position is right only when that is the slot he would fill.
    const replacement =
      replacementPointsByKey?.[p.playerKey] ??
      (expectedBestProjectedAtPosition && p.position in expectedBestProjectedAtPosition
        ? expectedBestProjectedAtPosition[p.position]
        : undefined)
    const vonaPoints = replacement === undefined ? vona : projected - replacement

    const pr = projRank.get(p.playerKey)
    const ar = adpRank.get(p.playerKey)
    // Points the market implies he's worth beyond our projection. Only counted
    // when the market is HIGHER on him than we are; the reverse is just us
    // agreeing he's worse, which VONA already captures.
    // A zero projection is missing data, not a considered opinion of worthlessness.
    // Without this guard the market's enthusiasm for an unprojected player reads as
    // an enormous disagreement and floats him to the top of the board.
    const hasProjection = p.value > 0
    let upside =
      hasProjection && pr !== undefined && ar !== undefined && ar < pr
        ? valueAtRank(ar) - p.value
        : 0
    if (p.opportunity === 'backup-elevated') upside += OPPORTUNITY_UPSIDE
    upside = Math.min(upside, MAX_UPSIDE)

    const need = needFactor?.[p.position] ?? 1

    /**
     * Value capped by what your lineup can actually use.
     *
     * VONA is a claim about the pool; `marginal` is a claim about you. A player
     * is worth the smaller of the two: an elite tight end behind a full flex has
     * a big VONA and adds nothing on Sunday, and ranking him on VONA is what
     * built a roster 248 points long at running back and 228 short at receiver.
     *
     * The floor keeps him from vanishing — a blocked starter is still depth,
     * insurance and trade value, which is what BENCH_FACTOR always meant.
     */
    const marginal = marginalByKey?.[p.playerKey]
    /**
     * Both terms in PROJECTED POINTS.
     *
     * `vona` is denominated in whatever scale the active ranking list re-seated
     * `value` into; `marginal` is real points off the lineup. Taking the minimum
     * of the two was comparing currencies — and it showed: a card could
     * recommend a player at +12.9 while listing two alternates at +25 and +23
     * beneath him, because the order came from one scale and the numbers from
     * the other.
     *
     * The cost of fixing it honestly: the analyst list no longer moves this
     * recommendation. It still orders the Board, which is the cheat sheet, and
     * still draws the tiers. The Pick tab is our answer, in our units, and every
     * number on it can be checked against the points column.
     */
    const contribution =
      marginal === undefined ? vonaPoints * need : Math.min(vonaPoints, marginal)

    let flag: BoardRow['flag'] = ''
    if (adp !== null && currentOverallPick > adp + VALUE_PICKS) flag = 'fell'

    // `ar` is the same ADP rank the upside term already computed above, reused
    // as-is. The projection rank cannot be reused the same way: `pr` ranks the
    // whole pool by raw value, but the market has only priced `withAdp` and it
    // prices positional scarcity while raw points do not. `marketProjRank` is
    // the caller's replacement-adjusted order over exactly that population, so
    // the two ranks being differenced mean the same thing (see where it's built).
    const mpr = marketProjRank.get(p.playerKey)
    const market = marketDisagreement({ projRank: mpr, adpRank: ar, teams: teams ?? 0 })

    return {
      playerKey: p.playerKey,
      name: p.name,
      position: p.position,
      proTeam: p.proTeam,
      headshot: p.headshot,
      value: p.value,
      projected,
      vona,
      vonaPoints,
      marginal: marginal ?? vona,
      viaFlex: viaFlexByKey?.[p.playerKey] ?? false,
      upside,
      needFactor: need,
      // A player you cannot start is worth what a bench player is worth, however
      // well he compares to the next man at his position.
      // The larger of what he adds to your lineup and what he is worth on your
      // bench — never a blend, because they are answers to different questions.
      //
      // Without lineup information there is no way to tell an upgrade from a
      // backup, so that caller keeps the old blend rather than silently getting
      // a different model.
      score:
        marginal === undefined
          ? (1 - w) * vona * need + w * upside * need
          : Math.max(contribution, w * Math.max(BENCH_FLOOR * vonaPoints, upside * need)),
      usable: contribution,
      survival: survival?.[p.playerKey] ?? 1,
      tier: tierByKey[p.playerKey] ?? 1,
      overallTier: overallTierByKey[p.playerKey] ?? 1,
      flag,
      marketFlag: market.flag,
      disagreementRounds: market.rounds,
      injuryStatus: p.injuryStatus ?? null,
      adp,
    }
  })

  return rows.sort((a, b) => b.score - a.score || b.value - a.value)
}
