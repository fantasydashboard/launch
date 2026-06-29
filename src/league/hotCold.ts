import type { WeekOutcomes } from './powerTrajectory'

export interface HotColdTeam {
  teamKey: string
  teamName: string
  isMe: boolean
  wins: number
  losses: number
  ties: number
}

export interface HotCold {
  hottest: HotColdTeam | null
  coldest: HotColdTeam | null
  weeks: number
}

/** Hottest / coldest team over the last `lastN` decided weeks (from weekly W/L outcomes). */
export function buildHotCold(
  outcomes: WeekOutcomes[],
  meta: { teamKey: string; teamName: string; isMe: boolean }[],
  lastN = 3,
): HotCold {
  const recent = [...outcomes].sort((a, b) => a.week - b.week).slice(-lastN)
  if (!recent.length) return { hottest: null, coldest: null, weeks: 0 }

  const tally = new Map<string, { w: number; l: number; t: number }>()
  for (const m of meta) tally.set(m.teamKey, { w: 0, l: 0, t: 0 })

  for (const wk of recent) {
    for (const [k, res] of Object.entries(wk.results)) {
      const t = tally.get(k)
      if (!t) continue
      if (res === 'W') t.w++
      else if (res === 'L') t.l++
      else t.t++
    }
  }

  const rows = meta
    .map((m) => {
      const t = tally.get(m.teamKey)!
      const g = t.w + t.l + t.t
      return {
        ...m,
        wins: t.w,
        losses: t.l,
        ties: t.t,
        pct: g > 0 ? (t.w + 0.5 * t.t) / g : 0,
        g,
      }
    })
    .filter((r) => r.g > 0)

  if (!rows.length) return { hottest: null, coldest: null, weeks: recent.length }

  // Sort: best pct first, tiebreak on wins, then teamKey lexically (stable + deterministic).
  const byBest = [...rows].sort(
    (a, b) => b.pct - a.pct || b.wins - a.wins || (a.teamKey < b.teamKey ? -1 : 1),
  )

  const toTeam = (r: (typeof rows)[number]): HotColdTeam => ({
    teamKey: r.teamKey,
    teamName: r.teamName,
    isMe: r.isMe,
    wins: r.wins,
    losses: r.losses,
    ties: r.ties,
  })

  return {
    hottest: toTeam(byBest[0]),
    coldest: toTeam(byBest[byBest.length - 1]),
    weeks: recent.length,
  }
}
