/**
 * The football Wire view-model. Assembles the add/stream board from precomputed
 * VOR: best-available (ROS VOR), upgrades (flex-aware lineup-marginal + the real
 * drop), this-week (weekly VOR + streamability), and a full per-position board.
 */
import type { AvailablePlayer } from '@/players/types'
import { parseEligible, type PointsPoolPlayer } from '@/myteam/pointsTeam'
import type { DepthPlayer } from '@/trades/positionalLandscape'
import { lineupMarginal } from './lineupMarginal'
import type { PlayerVor } from './footballVor'

/** A free agent joined to its VOR row (the Wire's currency). */
export interface WireVorRow {
  player: AvailablePlayer
  vorRos: number
  pointsRos: number
  vorWeek: number
  streamWeeks: number
  streamOf: number
  confidence: 'high' | 'low'
  opportunity: import('./footballOpportunity').OpportunityTag // depth-chart/injury signal
}

export interface FootballSwap {
  add: WireVorRow
  dropName: string
  dropKey: string
  marginal: number // optimal-lineup point gain
}

export interface BoardRow {
  playerKey: string
  name: string
  position: string
  team?: string // NFL team abbr, for the logo
  headshot?: string
  vorRos: number
  owned: boolean
  unprojected?: boolean // a rostered player with no projection match (VOR is a placeholder 0)
}

export interface FootballWire {
  bestAvailable: WireVorRow[]
  upgrades: FootballSwap[]
  thisWeek: WireVorRow[]
  board: Record<string, BoardRow[]> // position → rostered + FA, VOR-ranked
}

const BOARD_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']
const normPos = (pos: string): string => (pos || '').toUpperCase().split(/[,/|]/)[0].trim()
const faKey = (fa: { playerKey?: string; name: string }): string => fa.playerKey ?? `fa:${fa.name}`

export function buildFootballWire(input: {
  freeAgents: AvailablePlayer[]
  vorByKey: Record<string, PlayerVor>
  pool: PointsPoolPlayer[]
  slots: Record<string, number>
  myTeamKey: string
}): FootballWire {
  const { freeAgents, vorByKey, pool, slots, myTeamKey } = input

  // Join each FA to its VOR row; only keep projectable (has a VOR entry).
  const rows: WireVorRow[] = []
  for (const fa of freeAgents) {
    const v = vorByKey[faKey(fa)]
    if (!v) continue
    rows.push({
      player: fa,
      vorRos: v.vorRos,
      pointsRos: v.pointsRos,
      vorWeek: v.vorWeek,
      streamWeeks: v.streamWeeks,
      streamOf: v.streamOf,
      confidence: v.confidence,
      opportunity: v.opportunity,
    })
  }

  const bestAvailable = [...rows].sort((a, b) => b.vorRos - a.vorRos).slice(0, 40)
  const thisWeek = [...rows]
    .filter((r) => r.streamOf > 0)
    .sort((a, b) => b.vorWeek - a.vorWeek)
    .slice(0, 12)

  // Upgrades: my optimal lineup (bar 0) with each top FA candidate added.
  const nameOf = new Map(pool.map((p) => [p.playerKey, p.name]))
  const myPlayers: DepthPlayer[] = pool
    .filter((p) => p.teamKey === myTeamKey)
    .map((p) => ({
      playerKey: p.playerKey,
      teamKey: p.teamKey,
      eligiblePositions: parseEligible(p),
      // lineup math uses raw points, not VOR. An unmatched rostered player (no
      // projection) intentionally reads as 0 — bench fodder — consistent with the
      // value engine's ZERO_VALUE convention.
      value: vorByKey[p.playerKey]?.pointsRos ?? 0,
      status: p.onIL ? 'IL' : '',
    }))
  const upgrades: FootballSwap[] = []
  for (const add of bestAvailable.slice(0, 15)) {
    const candidate: DepthPlayer = {
      playerKey: faKey(add.player),
      teamKey: myTeamKey,
      eligiblePositions: add.player.eligiblePositions?.length
        ? add.player.eligiblePositions
        : String(add.player.position || '').split(/[,/|]/).map((s) => s.trim().toUpperCase()).filter(Boolean),
      value: add.pointsRos,
    }
    const m = lineupMarginal(myPlayers, candidate, slots)
    if (m.marginal > 0 && m.dropKey) {
      upgrades.push({ add, dropName: nameOf.get(m.dropKey) ?? '—', dropKey: m.dropKey, marginal: m.marginal })
    }
  }
  upgrades.sort((a, b) => b.marginal - a.marginal)

  // Full board: rostered + FA per position, VOR-ranked, owned flagged.
  const board: Record<string, BoardRow[]> = {}
  for (const pos of BOARD_POSITIONS) {
    const entries: BoardRow[] = []
    for (const p of pool) {
      if (normPos(p.position) !== pos) continue
      const pv = vorByKey[p.playerKey]
      entries.push({ playerKey: p.playerKey, name: p.name, position: pos, team: p.proTeam, headshot: p.headshot, vorRos: pv?.vorRos ?? 0, owned: p.teamKey === myTeamKey, unprojected: !pv })
    }
    for (const fa of freeAgents) {
      if (normPos(fa.position) !== pos) continue
      const v = vorByKey[faKey(fa)]
      if (!v) continue
      entries.push({ playerKey: faKey(fa), name: fa.name, position: pos, team: fa.team, headshot: fa.headshot, vorRos: v.vorRos, owned: false })
    }
    if (entries.length) board[pos] = entries.sort((a, b) => b.vorRos - a.vorRos)
  }

  return { bestAvailable, upgrades, thisWeek, board }
}
