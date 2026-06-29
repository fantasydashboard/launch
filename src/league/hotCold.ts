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
  catWins: number // categories won over the window (category leagues)
  catLosses: number
  catTies: number
}

export type HotColdBasis = 'record' | 'points' | 'cats'

export interface HotCold {
  hottest: HotColdTeam | null
  coldest: HotColdTeam | null
  weeks: number
  basis: HotColdBasis
}

/**
 * Hottest / coldest team over the last `lastN` decided weeks.
 * `'record'` ranks by recent win%; `'points'` by points scored (points leagues);
 * `'cats'` by net categories won (category leagues) — each is that format's truest
 * "who's hot" signal. Both richer bases fall back to record if their data is absent.
 */
export function buildHotCold(
  outcomes: WeekOutcomes[],
  meta: { teamKey: string; teamName: string; isMe: boolean; teamLogo?: string }[],
  lastN = 3,
  basis: HotColdBasis = 'record',
): HotCold {
  const recent = [...outcomes].sort((a, b) => a.week - b.week).slice(-lastN)
  if (!recent.length) return { hottest: null, coldest: null, weeks: 0, basis }

  const tally = new Map<string, { w: number; l: number; t: number; pts: number; cw: number; cl: number; ct: number }>()
  for (const m of meta) tally.set(m.teamKey, { w: 0, l: 0, t: 0, pts: 0, cw: 0, cl: 0, ct: 0 })

  let anyPoints = false
  let anyCats = false
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
    if (wk.catWins) {
      for (const [k, cw] of Object.entries(wk.catWins)) {
        const t = tally.get(k)
        if (!t) continue
        t.cw += cw
        t.cl += wk.catLosses?.[k] ?? 0
        t.ct += wk.catTies?.[k] ?? 0
        if (cw) anyCats = true
      }
    }
  }

  // Each richer basis is only honored when its data actually arrived.
  const useBasis: HotColdBasis =
    basis === 'points' && anyPoints ? 'points' : basis === 'cats' && anyCats ? 'cats' : 'record'

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
        catWins: t.cw,
        catLosses: t.cl,
        catTies: t.ct,
        catNet: t.cw - t.cl,
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
      : useBasis === 'cats'
        ? b.catNet - a.catNet || b.catWins - a.catWins || (a.teamKey < b.teamKey ? -1 : 1)
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
    catWins: r.catWins,
    catLosses: r.catLosses,
    catTies: r.catTies,
  })

  return {
    hottest: toTeam(byBest[0]),
    coldest: toTeam(byBest[byBest.length - 1]),
    weeks: recent.length,
    basis: useBasis,
  }
}
