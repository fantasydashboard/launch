/**
 * What you ended up with.
 *
 * A draft that just stops is a draft you can't learn from. This scores every
 * roster the same way — best legal starting lineup by projected points — and
 * ranks yours among them, so the grade is a statement about this room rather
 * than a number pulled out of the air.
 *
 * Deliberately NOT graded against ADP. "You beat the market" measures how far
 * you drifted from consensus, not whether the team is good, and a board built
 * partly from ADP would be marking its own homework. Value and reach still get
 * listed, because those are facts about individual picks worth seeing — they
 * just don't move the grade.
 */

import { buildLineup, type LineupPlayer, type LineupRow } from './lineup'

export interface RecapPick {
  playerKey: string
  name: string
  position: string
  overallPick: number
  teamKey: string
  /** Our projected points for the rest of the season. */
  projected: number
  /** Where the market had him, when the market had an opinion. */
  adp: number | null
}

export interface TeamRecap {
  teamKey: string
  teamName: string
  rows: LineupRow[]
  bench: LineupPlayer[]
  /** Projected points of the best legal starting lineup. */
  startingPoints: number
  /** Empty starting slots — an incomplete lineup is scored as it stands. */
  holes: number
  rank: number
  isMine: boolean
}

export interface PickNote {
  pick: RecapPick
  /** Picks of daylight between his ADP and where he actually went. */
  delta: number
}

export interface Recap {
  teams: TeamRecap[]
  me: TeamRecap | null
  /** Letter grade from where your lineup ranks, nothing else. */
  grade: string
  /** Points between you and the best lineup in the room. */
  behindLeader: number
  /** Your best-value picks — taken later than the market had them. */
  values: PickNote[]
  /** Where you reached furthest ahead of the market. */
  reaches: PickNote[]
  /** Your projected starting points at each position, minus the room's average. */
  positionEdge: Record<string, number>
}

/** How many value/reach notes are worth reading. */
const NOTES = 3
/** A pick has to beat the market by this much to be worth mentioning. */
const NOTABLE_PICKS = 6

/**
 * Grade from rank alone. Stated plainly so it can be argued with: the top of the
 * room gets an A, the bottom gets a D, and everything between is spread evenly.
 */
export function gradeForRank(rank: number, of: number): string {
  if (of <= 1) return 'A'
  const pct = (rank - 1) / (of - 1) // 0 = best lineup in the room
  if (pct <= 0.1) return 'A+'
  if (pct <= 0.25) return 'A'
  if (pct <= 0.4) return 'B+'
  if (pct <= 0.6) return 'B'
  if (pct <= 0.75) return 'C+'
  if (pct <= 0.9) return 'C'
  return 'D'
}

function lineupFor(slots: Record<string, number>, picks: RecapPick[]) {
  // buildLineup fills by position and draft order; ordering the pool by points
  // first makes it fill by quality instead, which is what a manager would set.
  const byPoints = [...picks].sort((a, b) => b.projected - a.projected)
  return buildLineup({
    slots,
    players: byPoints.map((p, i) => ({
      playerKey: p.playerKey,
      name: p.name,
      position: p.position,
      overallPick: i, // rank within this roster, so the best man takes slot 1
      headshot: null,
    })),
  })
}

export function buildRecap(input: {
  picks: RecapPick[]
  slots: Record<string, number>
  myTeamKey: string | null
  teamNames?: Record<string, string>
}): Recap {
  const picks = input?.picks ?? []
  const slots = input?.slots ?? {}
  const pointsByKey = new Map(picks.map((p) => [p.playerKey, p.projected]))

  const byTeam = new Map<string, RecapPick[]>()
  for (const p of picks) {
    const arr = byTeam.get(p.teamKey) ?? []
    arr.push(p)
    byTeam.set(p.teamKey, arr)
  }

  const teams: TeamRecap[] = [...byTeam.entries()].map(([teamKey, roster]) => {
    const { rows, bench } = lineupFor(slots, roster)
    const startingPoints = rows.reduce(
      (n, r) => n + (r.player ? pointsByKey.get(r.player.playerKey) ?? 0 : 0),
      0,
    )
    return {
      teamKey,
      teamName: input.teamNames?.[teamKey] ?? `Team ${teamKey}`,
      rows,
      bench,
      startingPoints,
      holes: rows.filter((r) => !r.player).length,
      rank: 0,
      isMine: !!input.myTeamKey && teamKey === input.myTeamKey,
    }
  })

  teams.sort((a, b) => b.startingPoints - a.startingPoints)
  teams.forEach((t, i) => { t.rank = i + 1 })

  const me = teams.find((t) => t.isMine) ?? null
  const myPicks = me ? byTeam.get(me.teamKey) ?? [] : []

  const notes: PickNote[] = myPicks
    .filter((p) => typeof p.adp === 'number')
    // Positive means he fell to you: taken LATER than the market had him.
    .map((p) => ({ pick: p, delta: p.overallPick - (p.adp as number) }))

  const values = notes
    .filter((n) => n.delta >= NOTABLE_PICKS)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, NOTES)
  const reaches = notes
    .filter((n) => n.delta <= -NOTABLE_PICKS)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, NOTES)

  // Starting points by position, against what the average team in this room got
  // from the same position — the shape of the roster, not just its size.
  const positionEdge: Record<string, number> = {}
  if (me && teams.length) {
    const startingByPosition = (t: TeamRecap): Record<string, number> => {
      const out: Record<string, number> = {}
      for (const r of t.rows) {
        if (!r.player) continue
        const pos = r.player.position.toUpperCase()
        out[pos] = (out[pos] ?? 0) + (pointsByKey.get(r.player.playerKey) ?? 0)
      }
      return out
    }
    const mine = startingByPosition(me)
    const all = teams.map(startingByPosition)
    for (const pos of new Set(all.flatMap((m) => Object.keys(m)))) {
      const avg = all.reduce((n, m) => n + (m[pos] ?? 0), 0) / all.length
      positionEdge[pos] = Math.round(((mine[pos] ?? 0) - avg) * 10) / 10
    }
  }

  return {
    teams,
    me,
    grade: me ? gradeForRank(me.rank, teams.length) : '—',
    behindLeader: me && teams.length ? Math.round(teams[0].startingPoints - me.startingPoints) : 0,
    values,
    reaches,
    positionEdge,
  }
}
