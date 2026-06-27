/**
 * Projection-driven power rankings: rank teams by ROSTER STRENGTH (true talent),
 * not record, then read the gap between strength and standings as LUCK. A strong
 * roster with a bad record is an unlucky sleeper (buy-low / they'll climb); a weak
 * roster with a good record is a lucky pretender (sell-high, due to regress).
 *
 * Scoring-agnostic: the caller supplies each team's `strength` (projected points
 * for points leagues, aggregate category value for category leagues) and record.
 */
export interface PowerTeamInput {
  teamKey: string
  teamName: string
  teamLogo?: string
  strength: number // roster strength, higher = better (caller's scoring dialect)
  wins: number
  losses: number
  ties?: number
  pointsFor?: number // optional record tiebreaker / display
}

export type Tier = 'Contender' | 'Bubble' | 'Rebuilder'
export type LuckStatus = 'pretender' | 'sleeper' | 'legit'

export interface PowerRow {
  teamKey: string
  teamName: string
  teamLogo?: string
  strength: number
  strengthRank: number // 1 = strongest roster
  recordRank: number // 1 = best record
  wins: number
  losses: number
  ties: number
  winPct: number
  luckDelta: number // strengthRank − recordRank (positive = record beats talent = lucky)
  luck: LuckStatus
  tier: Tier
  blurb: string
}

export interface PowerRankings {
  rows: PowerRow[] // ranked by roster strength
  pretenders: PowerRow[] // lucky — sell-high marks
  sleepers: PowerRow[] // unlucky — buy-low targets
}

const ord = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

/** Dense rank a list (1 = best) by a descending key; ties share the better rank. */
function rankBy<T>(items: T[], key: (t: T) => number): Map<T, number> {
  const sorted = [...items].sort((a, b) => key(b) - key(a))
  const out = new Map<T, number>()
  let rank = 0
  let prev = Infinity
  sorted.forEach((it, i) => {
    const k = key(it)
    if (k < prev) { rank = i + 1; prev = k }
    out.set(it, rank)
  })
  return out
}

export function buildPowerRankings(teams: PowerTeamInput[]): PowerRankings {
  const n = teams.length
  if (!n) return { rows: [], pretenders: [], sleepers: [] }

  const winPct = (t: PowerTeamInput) => {
    const g = t.wins + t.losses + (t.ties ?? 0)
    return g > 0 ? (t.wins + 0.5 * (t.ties ?? 0)) / g : 0
  }
  const strengthRank = rankBy(teams, (t) => t.strength)
  // Record rank: win% first, then points-for as the tiebreaker.
  const recordRank = rankBy(teams, (t) => winPct(t) * 1000 + (t.pointsFor ?? 0) / 1e6)

  const tol = Math.max(2, Math.round(n / 5)) // how many spots of gap counts as luck
  const third = Math.max(1, Math.round(n / 3))

  const rows: PowerRow[] = teams.map((t) => {
    const sr = strengthRank.get(t)!
    const rr = recordRank.get(t)!
    const luckDelta = sr - rr // + = record better than talent (lucky)
    const luck: LuckStatus = luckDelta >= tol ? 'pretender' : luckDelta <= -tol ? 'sleeper' : 'legit'
    const tier: Tier = sr <= third ? 'Contender' : sr >= n - third + 1 ? 'Rebuilder' : 'Bubble'

    let blurb: string
    if (luck === 'pretender') {
      blurb = `${ord(rr)} by record but ${ord(sr)} by talent — riding luck. Sell high before it regresses.`
    } else if (luck === 'sleeper') {
      blurb = `${ord(rr)} by record but only ${ord(sr)} by talent on paper — better than the standings say. Buy low; they'll climb.`
    } else if (tier === 'Contender') {
      blurb = `Genuinely the class of the league — ${ord(sr)} in talent, and the record backs it.`
    } else if (tier === 'Rebuilder') {
      blurb = `Thin roster (${ord(sr)} in talent), and the standings agree. Playing for next year.`
    } else {
      blurb = `Right about where they should be — ${ord(sr)} in talent, ${ord(rr)} in the standings.`
    }

    return {
      teamKey: t.teamKey,
      teamName: t.teamName,
      teamLogo: t.teamLogo,
      strength: t.strength,
      strengthRank: sr,
      recordRank: rr,
      wins: t.wins,
      losses: t.losses,
      ties: t.ties ?? 0,
      winPct: winPct(t),
      luckDelta,
      luck,
      tier,
      blurb,
    }
  })

  rows.sort((a, b) => a.strengthRank - b.strengthRank || b.winPct - a.winPct)
  return {
    rows,
    pretenders: rows.filter((r) => r.luck === 'pretender').sort((a, b) => b.luckDelta - a.luckDelta),
    sleepers: rows.filter((r) => r.luck === 'sleeper').sort((a, b) => a.luckDelta - b.luckDelta),
  }
}
