/**
 * Two rosters side by side, position by position, in rest-of-season value.
 *
 * The Trade Landscape grid says WHO is strong where across the whole league — an aggregate.
 * It cannot tell you what to actually offer, because it never shows a player. This is the
 * detail view underneath it: pick the manager you want to deal with and see both rosters in
 * one order, so the surplus you are trading from and the hole you are trading into are
 * literally adjacent rows.
 *
 * Pure, and deliberately opinion-free: it ranks and pairs, it does not propose deals. The
 * deal engine (pointsTrades) stays the only thing allowed to claim a swap helps you.
 */
import { coversSlot, positionRowsFor } from '@/trades/positionalLandscape'
import { lineupEligFor } from '@/trades/lineupEligibility'
import { startablePositions } from '@/trades/rosterSlots'
import type { PointsPoolPlayer } from '@/myteam/pointsTeam'
import type { FGProjection } from '@/services/projectionService'
import type { ValueByKey } from '@/myteam/playerValue'

export interface CompareBody {
  playerKey: string
  name: string
  position: string
  proTeam?: string
  headshot?: string
  value: number // rest-of-season currency (VOR for football, projected points otherwise)
  /** Would start for that roster right now — depth beyond this is trade fodder. */
  starter: boolean
  /**
   * Rank at this position among every ROSTERED player in the league, and rank overall on the
   * same population. Not NFL-wide: the only players a trade can move are the ones somebody in
   * your league already owns, so "RB4" here means fourth-best back available to negotiate for.
   */
  posRank: number
  overallRank: number
}

export interface ComparePosition {
  position: string
  mine: CompareBody[]
  theirs: CompareBody[]
  /** Sum of the bodies each side actually starts there. */
  myStarterValue: number
  theirStarterValue: number
  /**
   * Which way this position leans, and by how much. Positive = you are deeper. Reported
   * rather than interpreted: "they have more" is a fact, "so trade for one" is a judgement
   * that depends on what it costs.
   */
  edge: number
}

export interface RosterCompare {
  positions: ComparePosition[]
  /** Positions where they are deeper than you — where you would be buying. */
  youBuy: string[]
  /** Positions where you are deeper — what you would be selling from. */
  youSell: string[]
}

export function buildRosterCompare(input: {
  pool: PointsPoolPlayer[]
  valueByKey: ValueByKey
  fgByKey: Record<string, FGProjection | null>
  myTeamKey: string
  theirTeamKey: string
  slots: Record<string, number>
  sport?: string
  vorByKey?: Record<string, { vorRos: number }>
}): RosterCompare | null {
  const { pool, valueByKey, fgByKey, myTeamKey, theirTeamKey, slots, sport = 'baseball', vorByKey } = input
  if (!myTeamKey || !theirTeamKey || !pool.length) return null

  // Football speaks in VOR (replacement-relative, negatives meaningful); baseball in raw
  // projected points. Same choice the landscape and the wire make, so the numbers on this
  // screen match the numbers on those.
  const useVor = !!vorByKey
  const valueOf = (key: string): number =>
    useVor ? (vorByKey![key]?.vorRos ?? 0) : (valueByKey[key]?.total ?? 0)

  /* One ranking pass over the whole league pool, so both columns are measured against the
     same population — a player's rank must not depend on which roster he happens to sit on. */
  const overallRank = new Map(
    [...pool]
      .sort((a, b) => valueOf(b.playerKey) - valueOf(a.playerKey))
      .map((p, i) => [p.playerKey, i + 1] as const),
  )

  const startable = startablePositions(slots)
  const positions = positionRowsFor(sport).filter((p) => startable.has(p) || !useVor)

  const coversPos = (p: PointsPoolPlayer, pos: string) => coversSlot(lineupEligFor(p, fgByKey), pos)

  const bodiesFor = (
    teamKey: string,
    pos: string,
    posRank: Map<string, number>,
  ): CompareBody[] =>
    pool
      .filter((p) => p.teamKey === teamKey && coversPos(p, pos))
      .map((p) => ({
        playerKey: p.playerKey,
        name: p.name,
        position: p.position,
        proTeam: p.proTeam,
        headshot: p.headshot,
        value: valueOf(p.playerKey),
        starter: false,
        posRank: posRank.get(p.playerKey) ?? 0,
        overallRank: overallRank.get(p.playerKey) ?? 0,
      }))
      .sort((a, b) => b.value - a.value)

  const out: ComparePosition[] = []
  for (const position of positions) {
    // Positional rank is computed over everyone eligible there, league-wide — the same list
    // both columns are drawn from, so the two sides are directly comparable.
    const posRank = new Map(
      pool
        .filter((p) => coversPos(p, position))
        .sort((a, b) => valueOf(b.playerKey) - valueOf(a.playerKey))
        .map((p, i) => [p.playerKey, i + 1] as const),
    )
    const mine = bodiesFor(myTeamKey, position, posRank)
    const theirs = bodiesFor(theirTeamKey, position, posRank)
    if (!mine.length && !theirs.length) continue

    /* How many bodies "count" here is how many the league starts at the position. Judging a
       position on its single best body is what let one elite back read as a surplus while the
       roster behind him was thin — the same mistake the landscape used to make. */
    const depth = Math.max(1, Math.floor(Number(slots[position] ?? 1)) || 1)
    for (const list of [mine, theirs]) list.forEach((b, i) => (b.starter = i < depth))

    const myStarterValue = mine.slice(0, depth).reduce((s, b) => s + b.value, 0)
    const theirStarterValue = theirs.slice(0, depth).reduce((s, b) => s + b.value, 0)
    out.push({
      position,
      mine,
      theirs,
      myStarterValue,
      theirStarterValue,
      edge: myStarterValue - theirStarterValue,
    })
  }

  // Only call a position lopsided when the gap is worth a conversation. A one-point edge is
  // noise, and flagging it would make every position look like a trade opportunity.
  const MEANINGFUL = 10
  return {
    positions: out,
    youBuy: out.filter((p) => p.edge <= -MEANINGFUL).map((p) => p.position),
    youSell: out.filter((p) => p.edge >= MEANINGFUL).map((p) => p.position),
  }
}
