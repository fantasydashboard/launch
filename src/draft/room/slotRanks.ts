/**
 * Where your starter at each slot stands in the room.
 *
 * "RB1: Saquon Barkley" tells you what you have. "RB1: Saquon Barkley, best in
 * the league" tells you whether it's any good — and mid-draft that is the actual
 * question, because a roster is only ever strong or weak relative to the nine
 * teams you play. A third RB who would be the league's best FLEX is worth more
 * than a receiver who would be your league's eighth-best WR2, and nothing on the
 * board says so.
 *
 * Ranks are computed slot by slot: your RB2 against every other team's RB2, not
 * against every back drafted. That is how the lineups actually meet on Sunday.
 */

import { buildLineup } from './lineup'

export interface SlotRankPlayer {
  playerKey: string
  name: string
  position: string
  points: number
}

export interface SlotRankTeam {
  teamKey: string
  players: SlotRankPlayer[]
}

export interface SlotRank {
  /** `RB1`, `FLEX2`, matching the roster view. */
  label: string
  slot: string
  /** My player in that slot, when I have one. */
  playerKey: string | null
  /** 1 = the best in the room at this slot. Null when I have nobody there. */
  rank: number | null
  /** How many teams have somebody in that slot — the denominator you'd quote. */
  of: number
  /** Points of the best player any team has in this slot. */
  bestPoints: number
}

const byPointsDesc = (a: SlotRankPlayer, b: SlotRankPlayer) => b.points - a.points

/** One team's lineup, filled by quality rather than by draft order. */
function lineupOf(slots: Record<string, number>, players: SlotRankPlayer[]) {
  const ordered = [...players].sort(byPointsDesc)
  return buildLineup({
    slots,
    players: ordered.map((p, i) => ({
      playerKey: p.playerKey, name: p.name, position: p.position, overallPick: i,
    })),
  }).rows
}

export function buildSlotRanks(input: {
  slots: Record<string, number>
  teams: SlotRankTeam[]
  myTeamKey: string | null
}): SlotRank[] {
  const slots = input?.slots ?? {}
  const teams = input?.teams ?? []
  if (!teams.length) return []

  const pointsByKey = new Map<string, number>()
  for (const t of teams) for (const p of t.players) pointsByKey.set(p.playerKey, p.points)

  const lineups = teams.map((t) => ({ teamKey: t.teamKey, rows: lineupOf(slots, t.players) }))
  const mine = lineups.find((l) => l.teamKey === input.myTeamKey)
  const template = mine?.rows ?? lineups[0].rows

  return template.map((row, i) => {
    // Every team's occupant of THIS slot, best first. Empty slots simply don't
    // compete — a team that hasn't drafted a tight end yet isn't ranked last at
    // tight end, it's absent, and counting it would flatter everyone above it.
    const occupants = lineups
      .map((l) => {
        const key = l.rows[i]?.player?.playerKey
        return key ? { teamKey: l.teamKey, points: pointsByKey.get(key) ?? 0 } : null
      })
      .filter((x): x is { teamKey: string; points: number } => x !== null)
      .sort((a, b) => b.points - a.points)

    const myKey = row.player?.playerKey ?? null
    const myIndex = myKey
      ? occupants.findIndex((o) => o.teamKey === input.myTeamKey)
      : -1

    return {
      label: row.label,
      slot: row.slot,
      playerKey: myKey,
      rank: myIndex >= 0 ? myIndex + 1 : null,
      of: occupants.length,
      bestPoints: occupants[0]?.points ?? 0,
    }
  })
}

/**
 * Where a player you're considering would slot you in. Answers "if I took him,
 * would he be my league's best FLEX or its ninth?" — which is the comparison the
 * board never makes.
 */
export function rankIfAdded(
  ranks: SlotRank[],
  label: string,
  candidatePoints: number,
  teams: SlotRankTeam[],
  slots: Record<string, number>,
  myTeamKey: string | null,
): { rank: number; of: number } | null {
  const target = ranks.find((r) => r.label === label)
  if (!target) return null

  const index = ranks.indexOf(target)
  const pointsByKey = new Map<string, number>()
  for (const t of teams) for (const p of t.players) pointsByKey.set(p.playerKey, p.points)

  const others = teams
    .filter((t) => t.teamKey !== myTeamKey)
    .map((t) => lineupOf(slots, t.players)[index]?.player?.playerKey)
    .map((k) => (k ? pointsByKey.get(k) ?? 0 : null))
    .filter((n): n is number => n !== null)

  const better = others.filter((p) => p > candidatePoints).length
  return { rank: better + 1, of: others.length + 1 }
}

/**
 * How a slot standing should read: strong, weak, or not worth colouring.
 *
 * Colour only once enough of the league has somebody in that slot. Early on the
 * denominators are tiny — "2nd of 2" at pick 3.09 is an elite receiver against
 * the one other team that has drafted a WR2 yet, and painting him red would be a
 * confident statement built on a sample of two. Below the gate the rank is not
 * dimmed, it is hidden: a number nobody should act on is worse than no number.
 *
 * The middle third stays uncoloured on purpose. A traffic light where every row
 * is lit says the same thing as one where none are — colour earns its attention
 * by being rare.
 */
export type RankTone = 'hidden' | 'good' | 'neutral' | 'bad'

/** At least this many teams, and at least half the league, must be comparable. */
const MIN_COMPARABLE = 3

export function rankTone(rank: number | null, of: number, teams: number): RankTone {
  if (!rank || of < Math.max(MIN_COMPARABLE, Math.ceil(teams / 2))) return 'hidden'
  if (of === 1) return 'hidden'
  // Symmetric by construction: the same count at each end, whatever `of` is.
  // Dividing by three and rounding independently quietly made "bad" one wider.
  const edge = Math.max(1, Math.floor(of / 3))
  if (rank <= edge) return 'good'
  if (rank > of - edge) return 'bad'
  return 'neutral'
}
