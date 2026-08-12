/**
 * What a player is actually worth to YOUR lineup.
 *
 * VONA asks "how much better is he than the next man at his position?" — a
 * question about the pool, not about you. It never asks who he would displace on
 * your own roster, so a tight end can look like a bargain while your flex slots
 * are already full of backs who outscore him. Measured against a completed draft,
 * following that advice cost 157 points: a roster 248 points above the room at
 * running back and 228 below it at receiver.
 *
 * The missing number is simple to state. Add him to the roster, set the best
 * legal lineup, and see how many points the lineup gained. A player who cannot
 * crack your starting eleven gains you nothing today, however good he is — and
 * the board should say so while there are still starters to find.
 */

import { buildLineup, FLEX_ELIGIBILITY, type LineupPlayer } from './lineup'

export interface MarginalPlayer extends LineupPlayer {
  points: number
}

/** Points of the best legal starting lineup these players can field. */
export function lineupPoints(
  slots: Record<string, number>,
  players: MarginalPlayer[],
): number {
  const pointsByKey = new Map(players.map((p) => [p.playerKey, p.points]))
  // Sorted by points so buildLineup fills by quality: its slot order follows
  // `overallPick`, which we repurpose here as "rank within this roster".
  const ordered = [...players].sort((a, b) => b.points - a.points)
  const { rows } = buildLineup({
    slots,
    players: ordered.map((p, i) => ({ ...p, overallPick: i })),
  })
  return rows.reduce(
    (n, r) => n + (r.player ? pointsByKey.get(r.player.playerKey) ?? 0 : 0),
    0,
  )
}

/**
 * How many points each candidate would add to your starting lineup right now.
 *
 * Zero is a real and common answer: it means every slot he could fill is already
 * held by somebody better. It is not the same as "worthless" — it is "worth
 * nothing to your Sunday lineup today", which is exactly the distinction the
 * board was missing.
 */
export function marginalValueByKey(input: {
  slots: Record<string, number>
  roster: MarginalPlayer[]
  candidates: MarginalPlayer[]
}): Record<string, number> {
  const slots = input?.slots ?? {}
  const roster = input?.roster ?? []
  const base = lineupPoints(slots, roster)

  const out: Record<string, number> = {}
  for (const c of input?.candidates ?? []) {
    out[c.playerKey] = Math.max(0, lineupPoints(slots, [...roster, c]) - base)
  }
  return out
}

export interface MarginalDetail {
  /** Points he would add to the starting lineup. */
  points: number
  /** The slot he would occupy, e.g. `RB2` or `FLEX1`. Null if he cannot start. */
  slot: string | null
  /** True when that slot is a flex — where his position's scarcity is irrelevant. */
  viaFlex: boolean
}

/**
 * Which slot each candidate would fill, and what that is worth.
 *
 * The slot matters as much as the number. A tight end going into your TE slot is
 * competing with other tight ends, and their scarcity is the whole argument for
 * taking him early. The same tight end going into a FLEX is competing with every
 * receiver and back on the board, where that argument means nothing — and
 * measuring him against "the next-best TE" recommends a 225-point player over a
 * 252-point one.
 */
export function marginalDetailByKey(input: {
  slots: Record<string, number>
  roster: MarginalPlayer[]
  candidates: MarginalPlayer[]
}): Record<string, MarginalDetail> {
  const slots = input?.slots ?? {}
  const roster = input?.roster ?? []
  const base = lineupPoints(slots, roster)

  const out: Record<string, MarginalDetail> = {}
  for (const c of input?.candidates ?? []) {
    const withHim = [...roster, c]
    const ordered = [...withHim].sort((a, b) => b.points - a.points)
    const { rows } = buildLineup({
      slots,
      players: ordered.map((p, i) => ({ ...p, overallPick: i })),
    })
    const mine = rows.find((r) => r.player?.playerKey === c.playerKey) ?? null
    const pointsByKey = new Map(withHim.map((p) => [p.playerKey, p.points]))
    const total = rows.reduce(
      (n, r) => n + (r.player ? pointsByKey.get(r.player.playerKey) ?? 0 : 0),
      0,
    )
    out[c.playerKey] = {
      points: Math.max(0, total - base),
      slot: mine?.label ?? null,
      viaFlex: mine ? Boolean(FLEX_ELIGIBILITY[mine.slot.toUpperCase()]) : false,
    }
  }
  return out
}
