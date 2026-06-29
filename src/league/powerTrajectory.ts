/**
 * Power Rankings trajectory: two layers over the season's weeks.
 *
 *  - STANDINGS race (solid): each team's RECORD rank at the end of every completed
 *    week, reconstructed from weekly matchup results. Fully populated today.
 *  - TALENT race (accruing): each team's POWER (roster-strength) rank, captured as a
 *    weekly snapshot. It can't be rebuilt retroactively — rosters and projections
 *    change — so it fills in week by week going forward.
 *
 * The gap between a team's two lines IS the luck story the board describes: a record
 * line sitting below its talent line is an unlucky team the standings haven't caught.
 *
 * Pure + deterministic (no clock, no storage) so it stays testable and cacheable.
 */
export type Outcome = 'W' | 'L' | 'T'

export interface WeekOutcomes {
  week: number
  results: Record<string, Outcome> // teamKey → that week's result (only decided games)
  points?: Record<string, number> // teamKey → that week's points scored (points leagues)
}

export interface TalentSnapshot {
  week: number
  ranks: Record<string, number> // teamKey → power rank (1 = strongest roster)
}

export interface TeamMeta {
  teamKey: string
  teamName: string
  isMe: boolean
  teamLogo?: string
}

export interface RankPoint {
  week: number
  rank: number
}

export interface TeamTrajectory {
  teamKey: string
  teamName: string
  isMe: boolean
  teamLogo?: string
  standings: RankPoint[] // record rank per completed week
  talent: RankPoint[] // power rank per snapshot week (may be empty/sparse)
}

export interface Trajectory {
  weeks: number[] // every week that has a standings point, ascending
  teams: TeamTrajectory[] // in the caller's order (typically current power rank)
  hasTalentHistory: boolean // ≥2 talent snapshots → the dashed line is drawable
}

/** Rank a tally map (1 = best) by win%, breaking ties on wins then teamKey. */
function rankTeams(tally: Map<string, { w: number; l: number; t: number }>, keys: string[]): Map<string, number> {
  const pct = (k: string) => {
    const r = tally.get(k)!
    const g = r.w + r.l + r.t
    return g > 0 ? (r.w + 0.5 * r.t) / g : 0
  }
  const sorted = [...keys].sort((a, b) => {
    const d = pct(b) - pct(a)
    if (d) return d
    const wd = (tally.get(b)!.w) - (tally.get(a)!.w)
    if (wd) return wd
    return a < b ? -1 : 1 // stable, deterministic
  })
  const out = new Map<string, number>()
  sorted.forEach((k, i) => out.set(k, i + 1))
  return out
}

export function buildTrajectory(
  outcomes: WeekOutcomes[],
  talentSnaps: TalentSnapshot[],
  meta: TeamMeta[],
): Trajectory {
  const keys = meta.map((m) => m.teamKey)
  const keySet = new Set(keys)

  // Standings race: walk weeks in order, accumulate records, rank after each.
  const tally = new Map<string, { w: number; l: number; t: number }>()
  for (const k of keys) tally.set(k, { w: 0, l: 0, t: 0 })

  const standingsByTeam = new Map<string, RankPoint[]>()
  for (const k of keys) standingsByTeam.set(k, [])
  const weeks: number[] = []

  const ordered = [...outcomes].sort((a, b) => a.week - b.week)
  for (const wk of ordered) {
    const decided = Object.entries(wk.results).filter(([k]) => keySet.has(k))
    if (!decided.length) continue // in-progress / empty week — no standings point
    for (const [k, res] of decided) {
      const r = tally.get(k)!
      if (res === 'W') r.w++
      else if (res === 'L') r.l++
      else r.t++
    }
    const ranks = rankTeams(tally, keys)
    for (const k of keys) standingsByTeam.get(k)!.push({ week: wk.week, rank: ranks.get(k)! })
    weeks.push(wk.week)
  }

  // Talent race: one point per snapshot week the team appears in.
  const talentByTeam = new Map<string, RankPoint[]>()
  for (const k of keys) talentByTeam.set(k, [])
  const snaps = [...talentSnaps].sort((a, b) => a.week - b.week)
  for (const snap of snaps) {
    for (const k of keys) {
      const rank = snap.ranks[k]
      if (rank != null) talentByTeam.get(k)!.push({ week: snap.week, rank })
    }
  }
  const hasTalentHistory = snaps.length >= 2

  const teams: TeamTrajectory[] = meta.map((m) => ({
    teamKey: m.teamKey,
    teamName: m.teamName,
    isMe: m.isMe,
    teamLogo: m.teamLogo,
    standings: standingsByTeam.get(m.teamKey)!,
    talent: talentByTeam.get(m.teamKey)!,
  }))

  return { weeks, teams, hasTalentHistory }
}
