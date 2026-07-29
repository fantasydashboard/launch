/**
 * The points-league Wire brain: who to ADD and who to STREAM. In points the add
 * question is simpler than categories (no holes to fill) — it's "who projects for
 * the most points," plus the timely streaming edge native apps skip: a free-agent
 * two-start pitcher this week, or a bat on a full slate to plug an open day.
 */
import { type PointsSide } from '@/myteam/pointsValue'
import { lookupStarts, type WeekSchedule } from '@/services/mlbSchedule'
import type { PlayerValue } from '@/myteam/playerValue'
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

export interface RosterBody {
  name: string
  position: string
  points: number
  perGame?: number // optional — callers that don't need the football per-week display can omit it
  side: PointsSide
  onIL?: boolean // an IL body frees only an IL slot, so it can't be the drop for an active add
}

export interface Swap {
  add: WireAdd
  dropName: string
  dropPos: string
  dropPoints: number
  dropPerGame: number
  upgrade: number // add.points − drop.points (rest-of-season)
}

export interface PointsWire {
  swaps: Swap[] // concrete add→drop upgrades, by points gained (the headline move)
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
  valueOf: (fa: { name?: string; position?: string; team?: string }) => PlayerValue | null,
  schedule: WeekSchedule,
  myRoster: RosterBody[] = [],
): PointsWire {
  interface Row extends WireAdd {
    perStat: Record<string, number>
  }
  const rows: Row[] = []
  for (const fa of freeAgents) {
    if (isOut(fa.status)) continue
    // valueOf owns the FanGraphs match + no-team guard (a bare 'FA' team collides a
    // same-named prospect onto a star's projection, so it resolves to null there).
    const v = valueOf({ name: fa.name, position: fa.position, team: fa.team })
    const side: PointsSide = v?.side ?? (isPitcherPos(fa.position) ? 'pit' : 'hit')
    rows.push({
      player: fa,
      side,
      points: v?.total ?? 0,
      perGame: v && v.games > 0 ? v.total / v.games : 0,
      gamesThisWeek: schedule.gamesByTeam[fa.team] ?? 0,
      startsThisWeek: lookupStarts(schedule, fa.name).length,
      chips: [],
      perStat: v?.perStat ?? {},
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
  // Only show players we can actually project. An unmatched FA (no FanGraphs row)
  // scores 0 — a wall of obscure 0-point names buries the real adds, so drop them.
  const projectable = rows.filter((r) => r.points > 0)
  const hit = projectable.filter((r) => r.side === 'hit')
  const pit = projectable.filter((r) => r.side === 'pit')
  const topHitters = [...hit].sort(byPoints).slice(0, 8).map(strip)
  const topPitchers = [...pit].sort(byPoints).slice(0, 8).map(strip)

  // Concrete add→drop swaps: pair each top add with your weakest droppable body on
  // the same side and keep the positive upgrades. Side-matched (a bat replaces a
  // bat) — full positional fit is a later refinement.
  const weakest = (side: PointsSide): RosterBody | null => {
    // Only a HEALTHY body can be the drop — cutting an IL player frees an IL slot,
    // not the active spot you need for the add.
    const bodies = myRoster.filter((b) => b.side === side && !b.onIL)
    return bodies.length ? bodies.reduce((m, b) => (b.points < m.points ? b : m)) : null
  }
  const wHit = weakest('hit')
  const wPit = weakest('pit')
  const swaps: Swap[] = [...topHitters, ...topPitchers]
    .map((add): Swap | null => {
      const drop = add.side === 'hit' ? wHit : wPit
      if (!drop) return null
      const upgrade = add.points - drop.points
      return upgrade > 0
        ? { add, dropName: drop.name, dropPos: drop.position, dropPoints: drop.points, dropPerGame: drop.perGame ?? 0, upgrade }
        : null
    })
    .filter((s): s is Swap => s !== null)
    .sort((a, b) => b.upgrade - a.upgrade)
    .slice(0, 4)

  return {
    swaps,
    topHitters,
    topPitchers,
    twoStart: pit.filter((r) => r.startsThisWeek >= 2).sort(byPoints).slice(0, 8).map(strip),
    hotBats: [...hit]
      .filter((r) => r.gamesThisWeek > 0)
      .sort((a, b) => b.gamesThisWeek - a.gamesThisWeek || b.points - a.points)
      .slice(0, 8)
      .map(strip),
  }
}
