/**
 * The points-league Wire brain: who to ADD and who to STREAM. In points the add
 * question is simpler than categories (no holes to fill) — it's "who projects for
 * the most points," plus the timely streaming edge native apps skip: a free-agent
 * two-start pitcher this week, or a bat on a full slate to plug an open day.
 */
import { projectPlayerPoints, type PointsSide } from '@/myteam/pointsValue'
import { lookupStarts, type WeekSchedule } from '@/services/mlbSchedule'
import type { FGProjection } from '@/services/projectionService'
import type { AvailablePlayer } from '@/players/types'

export interface WireAdd {
  player: AvailablePlayer
  side: PointsSide
  points: number // projected rest-of-season fantasy points
  perGame: number
  gamesThisWeek: number // hitter games this week (from the MLB schedule)
  startsThisWeek: number // probable starts this week
  chips: string[] // specialist edges (SB/SV/HLD/QS) where this FA stands out
}

export interface PointsWire {
  topHitters: WireAdd[] // best available bats, by projected points
  topPitchers: WireAdd[] // best available arms, by projected points
  twoStart: WireAdd[] // available pitchers going twice this week
  hotBats: WireAdd[] // available bats with the fullest slate this week
}

const SPECIALIST_STATS = ['SB', 'SV', 'HLD', 'QS']
const isPitcherPos = (pos: string) =>
  String(pos || '').split(/[,/|]/).some((t) => ['SP', 'RP', 'P'].includes(t.trim().toUpperCase()))

// IL / NA / suspended → not addable for production; DTD still plays.
function isOut(status?: string): boolean {
  const u = (status || '').toUpperCase()
  return /IL|NA|SUSP|OUT|^DL/.test(u)
}

function pctileNonzero(vals: number[], p: number): number {
  const pos = vals.filter((v) => v > 0).sort((a, b) => a - b)
  if (!pos.length) return Infinity
  return pos[Math.floor((pos.length - 1) * p)]
}

export function buildPointsWire(
  freeAgents: AvailablePlayer[],
  matchFG: (player: { full_name?: string; mlb_team?: string }) => FGProjection | null,
  weights: Record<string, number>,
  schedule: WeekSchedule,
): PointsWire {
  interface Row extends WireAdd {
    perStat: Record<string, number>
  }
  const rows: Row[] = []
  for (const fa of freeAgents) {
    if (isOut(fa.status)) continue
    const fg = matchFG({ full_name: fa.name, mlb_team: fa.team })
    const pp = projectPlayerPoints(fg, weights)
    const side: PointsSide = fg ? (fg.player_type === 'pitcher' ? 'pit' : 'hit') : isPitcherPos(fa.position) ? 'pit' : 'hit'
    rows.push({
      player: fa,
      side,
      points: pp.total,
      perGame: pp.games > 0 ? pp.total / pp.games : 0,
      gamesThisWeek: schedule.gamesByTeam[fa.team] ?? 0,
      startsThisWeek: lookupStarts(schedule, fa.name).length,
      chips: [],
      perStat: pp.perStat,
    })
  }

  // Specialist chips: a standout among the FA pool (same idea as the roster).
  const thresh: Record<PointsSide, Record<string, number>> = { hit: {}, pit: {} }
  for (const side of ['hit', 'pit'] as PointsSide[]) {
    for (const st of SPECIALIST_STATS) {
      thresh[side][st] = pctileNonzero(rows.filter((r) => r.side === side).map((r) => r.perStat[st] ?? 0), 0.7)
    }
  }
  for (const r of rows) {
    r.chips = SPECIALIST_STATS.filter((st) => (r.perStat[st] ?? 0) > 0 && r.perStat[st] >= thresh[r.side][st])
  }

  const strip = ({ perStat, ...rest }: Row): WireAdd => rest
  const byPoints = (a: WireAdd, b: WireAdd) => b.points - a.points
  const hit = rows.filter((r) => r.side === 'hit')
  const pit = rows.filter((r) => r.side === 'pit')
  return {
    topHitters: [...hit].sort(byPoints).slice(0, 8).map(strip),
    topPitchers: [...pit].sort(byPoints).slice(0, 8).map(strip),
    twoStart: pit.filter((r) => r.startsThisWeek >= 2).sort(byPoints).slice(0, 8).map(strip),
    hotBats: [...hit]
      .filter((r) => r.gamesThisWeek > 0)
      .sort((a, b) => b.gamesThisWeek - a.gamesThisWeek || b.points - a.points)
      .slice(0, 8)
      .map(strip),
  }
}
