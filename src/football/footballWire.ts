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
import { startablePositions } from '@/trades/rosterSlots'
import { assignTiers } from '@/draft/room/tierCliffs'

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
  /**
   * Actually claimable right now. `owned` only ever meant "mine", so every other
   * team's roster and the entire free-agent pool both read as `owned: false` — on a
   * waiver page, where availability is the first thing you need to know.
   */
  free: boolean
  /** On bye this week. A rest-of-season decision still has to survive Sunday. */
  bye?: boolean
  /** Tier within this position, 1 = best. Same cut rule as the draft board. */
  tier: number
  /** True on the first row of a new tier, so the view can draw the cliff. */
  tierBreak?: boolean
  /** Points of separation from the tier above — only set on a tier's first row. */
  tierDrop?: number
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
  /**
   * NFL teams playing this week. Empty means the schedule is unknown — never fabricate byes
   * from missing data, the same rule zeroByeWeek follows.
   */
  playingTeams?: Set<string>
}): FootballWire {
  const { freeAgents, vorByKey, pool, slots, myTeamKey, playingTeams } = input
  const scheduleKnown = !!playingTeams && playingTeams.size > 0
  const onBye = (team?: string) => scheduleKnown && !playingTeams!.has(String(team ?? '').toUpperCase())

  /* Only positions this league can actually start. A league with no K or DEF slot was
     being handed kickers and defenses as "best available" — roughly 40% of the list —
     which is unusable advice and evidence the tool never read the settings. `slots` is
     already the parsed roster_positions, so the answer was always one call away. */
  const startable = startablePositions(slots)

  // Join each FA to its VOR row; only keep projectable (has a VOR entry).
  const rows: WireVorRow[] = []
  for (const fa of freeAgents) {
    const v = vorByKey[faKey(fa)]
    if (!v) continue
    if (!startable.has(String(fa.position ?? '').toUpperCase())) continue
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

  // Full board: rostered + FA per position, VOR-ranked, owned/free flagged, tiered.
  const board: Record<string, BoardRow[]> = {}
  for (const pos of BOARD_POSITIONS.filter((p) => startable.has(p))) {
    const entries: BoardRow[] = []
    for (const p of pool) {
      if (normPos(p.position) !== pos) continue
      const pv = vorByKey[p.playerKey]
      entries.push({ playerKey: p.playerKey, name: p.name, position: pos, team: p.proTeam, headshot: p.headshot, vorRos: pv?.vorRos ?? 0, owned: p.teamKey === myTeamKey, unprojected: !pv, free: false, tier: 0, bye: onBye(p.proTeam) })
    }
    for (const fa of freeAgents) {
      if (normPos(fa.position) !== pos) continue
      const v = vorByKey[faKey(fa)]
      if (!v) continue
      entries.push({ playerKey: faKey(fa), name: fa.name, position: pos, team: fa.team, headshot: fa.headshot, vorRos: v.vorRos, owned: false, free: true, tier: 0, bye: onBye(fa.team) })
    }
    if (!entries.length) continue

    entries.sort((a, b) => b.vorRos - a.vorRos)
    /* Same cut rule the draft board uses — tiers are the visible cliffs, not every gap
       over a threshold. A flat ranked column of 40 receivers hides the only thing the
       reader is actually looking for: where the drop-off is. */
    const tierByKey = assignTiers(entries.map((e) => ({ playerKey: e.playerKey, value: e.vorRos })))
    let prevTier = 0
    let prevVor = 0
    for (const row of entries) {
      row.tier = tierByKey[row.playerKey] ?? 1
      // Sorted descending, so the previous row IS the last row of the tier above.
      if (prevTier && row.tier !== prevTier) {
        row.tierBreak = true
        row.tierDrop = Math.max(0, prevVor - row.vorRos)
      }
      prevTier = row.tier
      prevVor = row.vorRos
    }
    board[pos] = entries
  }

  return { bestAvailable, upgrades, thisWeek, board }
}
