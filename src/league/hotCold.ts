import type { WeekOutcomes } from './powerTrajectory'

export interface HotColdTeam {
  teamKey: string
  teamName: string
  teamLogo?: string
  isMe: boolean
  wins: number
  losses: number
  ties: number
  points: number // total scored over the window (points leagues)
}

export interface HotCold {
  hottest: HotColdTeam | null
  coldest: HotColdTeam | null
  weeks: number
  basis: 'record' | 'points'
}

/**
 * Hottest / coldest team over the last `lastN` decided weeks.
 * `basis: 'record'` ranks by recent win%; `'points'` ranks by points scored — the
 * truer "who's hot" signal in a points league. Falls back to record if the weekly
 * outcomes carry no points data.
 */
export function buildHotCold(
  outcomes: WeekOutcomes[],
  meta: { teamKey: string; teamName: string; isMe: boolean; teamLogo?: string }[],
  lastN = 3,
  basis: 'record' | 'points' = 'record',
): HotCold {
  const recent = [...outcomes].sort((a, b) => a.week - b.week).slice(-lastN)
  if (!recent.length) return { hottest: null, coldest: null, weeks: 0, basis }

  const tally = new Map<string, { w: number; l: number; t: number; pts: number }>()
  for (const m of meta) tally.set(m.teamKey, { w: 0, l: 0, t: 0, pts: 0 })

  let anyPoints = false
  for (const wk of recent) {
    for (const [k, res] of Object.entries(wk.results)) {
      const t = tally.get(k)
      if (!t) continue
      if (res === 'W') t.w++
      else if (res === 'L') t.l++
      else t.t++
    }
    if (wk.points) {
      for (const [k, pts] of Object.entries(wk.points)) {
        const t = tally.get(k)
        if (!t) continue
        t.pts += pts
        if (pts) anyPoints = true
      }
    }
  }

  // Points basis is only honored when we actually have scoring data.
  const useBasis: 'record' | 'points' = basis === 'points' && anyPoints ? 'points' : 'record'

  const rows = meta
    .map((m) => {
      const t = tally.get(m.teamKey)!
      const g = t.w + t.l + t.t
      return {
        ...m,
        wins: t.w,
        losses: t.l,
        ties: t.t,
        points: t.pts,
        pct: g > 0 ? (t.w + 0.5 * t.t) / g : 0,
        g,
      }
    })
    .filter((r) => r.g > 0)

  if (!rows.length) return { hottest: null, coldest: null, weeks: recent.length, basis: useBasis }

  // Sort best-first; tiebreaks keep it stable + deterministic.
  const byBest = [...rows].sort((a, b) =>
    useBasis === 'points'
      ? b.points - a.points || b.pct - a.pct || (a.teamKey < b.teamKey ? -1 : 1)
      : b.pct - a.pct || b.wins - a.wins || (a.teamKey < b.teamKey ? -1 : 1),
  )

  const toTeam = (r: (typeof rows)[number]): HotColdTeam => ({
    teamKey: r.teamKey,
    teamName: r.teamName,
    teamLogo: r.teamLogo,
    isMe: r.isMe,
    wins: r.wins,
    losses: r.losses,
    ties: r.ties,
    points: r.points,
  })

  return {
    hottest: toTeam(byBest[0]),
    coldest: toTeam(byBest[byBest.length - 1]),
    weeks: recent.length,
    basis: useBasis,
  }
}
