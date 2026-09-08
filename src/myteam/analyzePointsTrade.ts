import { buildPointsTeam, type PointsPoolPlayer, type PointsTeamModel } from '@/myteam/pointsTeam'
import type { ValueByKey } from '@/myteam/playerValue'

/**
 * Judge a trade somebody actually offered you.
 *
 * WHAT WAS MISSING. The points side only ever evaluated deals it had generated itself, so it
 * could tell you what to propose and had nothing to say about what landed in your inbox — the
 * more common case by far. A category analyzer exists (trades/analyzeTrade) and cannot be
 * ported: it is category-native to the bone, taking a TradeEngine and reporting `helps` and
 * `costs` as category names. Its SHAPE is worth keeping though, particularly that it judges
 * bad deals — overpay, selling low, shipping a need — which a generator never has to.
 *
 * WHY POINT DELTAS ARE THE WRONG HEADLINE. "+6.1 a week" is what every trade calculator prints
 * and it is the least decision-relevant number available: it does not say whether you win more
 * games, whether you passed anybody, or what you gave up structurally. This re-runs the same
 * machinery the League board uses on the POST-TRADE rosters and diffs it, so the headline is
 * where you finish and what your lineup looks like afterwards.
 *
 * The positional diff is the part no value chart can do. Turning your best back from the
 * fifth-best RB1 in the league into the first is the trade actually working; doing it while
 * your RB2 falls from second-best to ninth is the trade quietly not working, and a single
 * value number hides both.
 *
 * PICKS ARE NOT PRICED. Draft picks can be listed so the deal reads correctly, but nothing
 * here values them — there is no rookie ADP in the feed to anchor them to. A deal containing
 * one is reported as unpriced rather than scored around, the same rule the dynasty trade
 * scorer already follows.
 */

export type TradeClass = 'winWin' | 'leverage' | 'fleece' | 'badForYou'
export type AcceptOdds = 'likely' | 'maybe' | 'unlikely'

export interface RankMove {
  teamKey: string
  teamName: string
  before: number
  after: number
}

export interface SlotMove {
  slot: string
  /** Who starts there afterwards. */
  starterName: string
  /** League rank of your starter at this opening, 1 = best in the league. */
  before: number
  after: number
}

export interface PointsTradeAnalysis {
  myGain: number
  theirGain: number
  /** Where you and they finish in the power order, before and after. */
  myMove: RankMove
  theirMove: RankMove
  /**
   * Everyone ELSE whose position shifts as a consequence. A trade that lifts you two places
   * while lifting the team you are chasing three is a different decision, and no other tool
   * shows it.
   */
  bystanders: RankMove[]
  /** Per-slot league rank, before and after — only the openings that actually moved. */
  slotMoves: SlotMove[]
  klass: TradeClass
  accept: AcceptOdds
  /** Named upgrades and named costs, in roster terms rather than points. */
  helps: string[]
  costs: string[]
  /** The case against, which a generator never has to make. */
  warnings: string[]
  /** True when the deal includes something we cannot value, so nothing above is complete. */
  hasUnpricedAssets: boolean
}

/** A player moving, or a pick we can name but not price. */
export interface TradeAsset {
  playerKey: string
  /** Set for anything that is not a rostered player — a draft pick, most often. */
  unpriced?: boolean
  label?: string
}

const rankOf = (m: PointsTeamModel, teamKey: string): number =>
  m.standings.find((s) => s.teamKey === teamKey)?.rank ?? 0

const pointsOf = (m: PointsTeamModel, teamKey: string): number =>
  m.standings.find((s) => s.teamKey === teamKey)?.startingPoints ?? 0

/**
 * Swap the named players between two rosters and hand back a new pool.
 *
 * A copy, never a mutation: the caller's pool drives every other panel on the page, and an
 * analyzer that quietly re-homed a player would rewrite the board behind it.
 */
export function applyTrade(
  pool: PointsPoolPlayer[],
  myTeamKey: string,
  partnerKey: string,
  giveKeys: string[],
  getKeys: string[],
): PointsPoolPlayer[] {
  const give = new Set(giveKeys)
  const get = new Set(getKeys)
  return pool.map((p) =>
    give.has(p.playerKey) ? { ...p, teamKey: partnerKey }
      : get.has(p.playerKey) ? { ...p, teamKey: myTeamKey }
        : p,
  )
}

export function analyzePointsTrade(input: {
  pool: PointsPoolPlayer[]
  valueByKey: ValueByKey
  slots: Record<string, number>
  teamNames: Record<string, string>
  myTeamKey: string
  partnerKey: string
  gives: TradeAsset[]
  gets: TradeAsset[]
  vorByKey?: Record<string, { vorRos: number }>
}): PointsTradeAnalysis | null {
  const { pool, valueByKey, slots, teamNames, myTeamKey, partnerKey, gives, gets, vorByKey } = input
  if (!myTeamKey || !partnerKey || (!gives.length && !gets.length)) return null

  const priced = (a: TradeAsset[]) => a.filter((x) => !x.unpriced).map((x) => x.playerKey)
  const hasUnpricedAssets = [...gives, ...gets].some((a) => a.unpriced)

  const opts = { vorByKey }
  const before = buildPointsTeam(pool, valueByKey, myTeamKey, slots, opts)
  const after = buildPointsTeam(
    applyTrade(pool, myTeamKey, partnerKey, priced(gives), priced(gets)),
    valueByKey, myTeamKey, slots, opts,
  )

  const myGain = pointsOf(after, myTeamKey) - pointsOf(before, myTeamKey)
  const theirGain = pointsOf(after, partnerKey) - pointsOf(before, partnerKey)

  const move = (teamKey: string): RankMove => ({
    teamKey,
    teamName: teamNames[teamKey] ?? 'Team',
    before: rankOf(before, teamKey),
    after: rankOf(after, teamKey),
  })

  /* Everyone else's rank can shift without their roster changing — two teams swapping places
     above you pushes you down a seat. Reported because "this helps the team you are chasing
     more than it helps you" is a real reason to decline. */
  const bystanders = before.standings
    .map((s) => move(s.teamKey))
    .filter((m) => m.teamKey !== myTeamKey && m.teamKey !== partnerKey && m.before !== m.after)

  const beforeSlots = new Map(before.slotRanks.map((s, i) => [`${s.slot}#${i}`, s]))
  const slotMoves: SlotMove[] = []
  after.slotRanks.forEach((s, i) => {
    const b = beforeSlots.get(`${s.slot}#${i}`)
    if (b && b.rank !== s.rank) {
      slotMoves.push({ slot: s.slot, starterName: s.starterName, before: b.rank, after: s.rank })
    }
  })

  /* Roster terms, not points. "Your RB1 goes from 5th-best to 1st-best" is the sentence a
     manager can act on; "+6.1" is the one every calculator already prints. */
  const helps = slotMoves.filter((m) => m.after < m.before)
    .map((m) => `${m.slot}: ${m.starterName} — ${ord(m.before)}-best to ${ord(m.after)}-best in the league`)
  const costs = slotMoves.filter((m) => m.after > m.before)
    .map((m) => `${m.slot}: ${m.starterName} — ${ord(m.before)}-best down to ${ord(m.after)}-best`)

  const warnings: string[] = []
  if (hasUnpricedAssets) {
    warnings.push('Includes a pick, which nothing here can value — treat every number as covering the players only.')
  }
  if (myGain <= 0) warnings.push('Your starting lineup does not improve.')
  if (gives.length > gets.length) {
    warnings.push(`You send ${gives.length} and get ${gets.length} back — the roster spots you free still have to be filled, and byes get harder.`)
  }
  const myMove = move(myTeamKey)
  const theirMove = move(partnerKey)
  if (myMove.after > myMove.before) warnings.push(`You drop from ${ord(myMove.before)} to ${ord(myMove.after)} in the power order.`)
  const chaser = bystanders.find((b) => b.after < b.before && b.after <= myMove.after)
  if (chaser) warnings.push(`${chaser.teamName} moves up to ${ord(chaser.after)} as a side effect, past or level with you.`)
  if (theirGain > myGain * 1.5 && myGain > 0) warnings.push('They gain noticeably more than you do.')

  /*
   * Whether THEY accept is about their side alone, not about mine.
   *
   * The first version scaled their loss against my gain, which inverted whenever a deal was
   * bad for me: sending my starter for their bench body costs them nothing, so they take it
   * happily, and the tolerance test read `0 > -(negative) * 0.5` and called it unlikely. A
   * deal that is free for them is one they say yes to regardless of how badly I did.
   */
  const FREE = 0.01
  const accept: AcceptOdds =
    theirGain > FREE ? 'likely'
      : theirGain >= -FREE ? 'maybe'
        : myGain > 0 && -theirGain <= myGain * 0.5 ? 'maybe'
          : 'unlikely'

  const klass: TradeClass =
    myGain <= 0 ? 'badForYou'
      : theirGain > FREE ? 'winWin'
        : -theirGain <= myGain * 0.5 ? 'leverage'
          : 'fleece'

  return {
    myGain, theirGain, myMove, theirMove, bystanders, slotMoves,
    klass, accept, helps, costs, warnings, hasUnpricedAssets,
  }
}

function ord(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
