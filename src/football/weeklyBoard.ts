import { assignSlots, type DepthPlayer } from '@/trades/positionalLandscape'
import { parseEligible, type PointsPoolPlayer } from '@/myteam/pointsTeam'
import type { PlayerVor } from './footballVor'
import type { OpportunityTag } from './footballOpportunity'
import type { AvailablePlayer } from '@/players/types'

export interface WeeklyStarter {
  slot: string
  playerKey: string
  name: string
  position: string
  team?: string
  headshot?: string
  weekPoints: number
  opponent: string // '' if bye/unknown
  home: boolean
  bye: boolean
  opportunity: OpportunityTag
  inCurrent: boolean // manager already has him starting
}

export interface WeeklyBenchRow {
  playerKey: string
  name: string
  position: string
  team?: string
  headshot?: string
  weekPoints: number
  bye: boolean
  opportunity: OpportunityTag
}

export interface WeeklyMove {
  kind: 'swap' | 'bye'
  slot: string
  startKey: string
  startName: string
  sitKey: string
  sitName: string
  gain: number // weekly points gained by making the swap
}

export interface WeeklyStreamer {
  player: AvailablePlayer
  weekPoints: number
  vorWeek: number
  streamWeeks: number
  streamOf: number
  opportunity: OpportunityTag
}

export interface WeeklyBoard {
  starters: WeeklyStarter[]
  bench: WeeklyBenchRow[]
  moves: WeeklyMove[]
  streamers: WeeklyStreamer[]
}

const SLOT_ORDER = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'SUPER_FLEX', 'K', 'DEF']
const slotIdx = (s: string) => { const i = SLOT_ORDER.indexOf(s.toUpperCase()); return i < 0 ? SLOT_ORDER.length : i }
const faKey = (fa: { playerKey?: string; name: string }): string => fa.playerKey ?? `fa:${fa.name}`

/**
 * The weekly start/sit board: the optimal lineup for THIS week (assignSlots over
 * this-week points, byes zeroed), the start/sit + bye moves vs the manager's set
 * lineup, the bench, and this week's streamers. Pure.
 */
export function buildWeeklyBoard(input: {
  pool: PointsPoolPlayer[]
  vorByKey: Record<string, PlayerVor>
  slots: Record<string, number>
  myTeamKey: string
  currentStarters: string[]
  freeAgents: AvailablePlayer[]
  opponentByTeam: Record<string, { opp: string; home: boolean }>
}): WeeklyBoard {
  const { pool, vorByKey, slots, myTeamKey, currentStarters, freeAgents, opponentByTeam } = input
  const week = (key: string): number => vorByKey[key]?.pointsNextWeek ?? 0
  const meta = new Map(pool.map((p) => [p.playerKey, p]))
  const teamOf = (key: string) => (meta.get(key)?.proTeam ?? '').toUpperCase()
  // An empty map means the schedule is unknown (fetch failed / unsupported week),
  // NOT that all 32 teams are on bye — never fabricate byes from missing data.
  const scheduleKnown = Object.keys(opponentByTeam).length > 0
  const byeOf = (key: string) => scheduleKnown && !opponentByTeam[teamOf(key)]
  const oppOf = (key: string) => opponentByTeam[teamOf(key)]?.opp ?? ''
  const homeOf = (key: string) => opponentByTeam[teamOf(key)]?.home ?? false
  const oppTag = (key: string): OpportunityTag => vorByKey[key]?.opportunity ?? ''

  // Optimal weekly lineup for my roster (value = this-week points; IL excluded).
  const myPlayers = pool.filter((p) => p.teamKey === myTeamKey)
  const myDepth: DepthPlayer[] = myPlayers.map((p) => ({
    playerKey: p.playerKey,
    teamKey: p.teamKey,
    eligiblePositions: parseEligible(p),
    value: week(p.playerKey),
    status: p.onIL ? 'IL' : '',
  }))
  const assigned = assignSlots(myDepth, slots, 0).assignedByPos
  const currentSet = new Set(currentStarters)

  const starters: WeeklyStarter[] = []
  const startedSet = new Set<string>()
  for (const [slot, keys] of Object.entries(assigned)) {
    for (const key of keys) {
      startedSet.add(key)
      const p = meta.get(key)
      starters.push({
        slot,
        playerKey: key,
        name: p?.name ?? '—',
        position: p?.position ?? '',
        team: p?.proTeam,
        headshot: p?.headshot,
        weekPoints: week(key),
        opponent: oppOf(key),
        home: homeOf(key),
        bye: byeOf(key),
        opportunity: oppTag(key),
        inCurrent: currentSet.has(key),
      })
    }
  }
  starters.sort((a, b) => slotIdx(a.slot) - slotIdx(b.slot) || b.weekPoints - a.weekPoints)

  const bench: WeeklyBenchRow[] = myPlayers
    .filter((p) => !startedSet.has(p.playerKey))
    .map((p) => ({
      playerKey: p.playerKey,
      name: p.name,
      position: p.position,
      team: p.proTeam,
      headshot: p.headshot,
      weekPoints: week(p.playerKey),
      bye: byeOf(p.playerKey),
      opportunity: oppTag(p.playerKey),
    }))
    .sort((a, b) => b.weekPoints - a.weekPoints)

  // Moves = the delta between the manager's set lineup and the optimal one.
  // Start these (optimal, currently benched) vs sit these (current, not optimal),
  // paired best-start ↔ worst-sit so each move's gain is concrete.
  const startThese = starters.filter((s) => !s.inCurrent).sort((a, b) => b.weekPoints - a.weekPoints)
  const sitThese = currentStarters
    .filter((k) => !startedSet.has(k))
    .map((k) => ({ key: k, name: meta.get(k)?.name ?? '—', pts: week(k), bye: byeOf(k) }))
    .sort((a, b) => a.pts - b.pts)
  const moves: WeeklyMove[] = []
  const n = Math.min(startThese.length, sitThese.length)
  for (let i = 0; i < n; i++) {
    const s = startThese[i]
    const d = sitThese[i]
    moves.push({
      kind: d.bye ? 'bye' : 'swap',
      slot: s.slot,
      startKey: s.playerKey,
      startName: s.name,
      sitKey: d.key,
      sitName: d.name,
      gain: Math.round(s.weekPoints - d.pts),
    })
  }

  const streamers: WeeklyStreamer[] = freeAgents
    .map((fa) => ({ fa, v: vorByKey[faKey(fa)] }))
    .filter((x) => x.v && x.v.vorWeek > 0)
    .sort((a, b) => b.v!.vorWeek - a.v!.vorWeek)
    .slice(0, 8)
    .map(({ fa, v }) => ({
      player: fa,
      weekPoints: v!.pointsNextWeek,
      vorWeek: v!.vorWeek,
      streamWeeks: v!.streamWeeks,
      streamOf: v!.streamOf,
      opportunity: v!.opportunity,
    }))

  return { starters, bench, moves, streamers }
}
