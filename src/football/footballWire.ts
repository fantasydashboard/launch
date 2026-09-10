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
import { canonicalPosition } from '@/trades/rosterSlots'

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
/* Folds team defence before splitting: ESPN spells the position "D/ST" and this split
   exists for multi-eligible players, so the slash turned a defence into "D". */
const normPos = (pos: string): string => canonicalPosition((pos || '').split(/[,/|]/)[0])
const faKey = (fa: { playerKey?: string; name: string }): string => fa.playerKey ?? `fa:${fa.name}`

/**
 * How many rows of a board the page shows, and therefore how many get tiered.
 *
 * One constant for both, because tiering a population the reader cannot see is what put every
 * visible quarterback in a single tier.
 */
export const BOARD_DEPTH = 25

/**
 * Cut tiers over the displayed depth and mark the cliffs, in place.
 *
 * Same rule the draft board uses — tiers are the visible cliffs, not every gap over a
 * threshold. A flat ranked column of forty receivers hides the only thing the reader is
 * looking for: where the drop-off is.
 */
function tierInPlace(entries: BoardRow[]): void {
  const shown = entries.slice(0, BOARD_DEPTH)
  if (!shown.length) return
  const tierByKey = assignTiers(shown.map((e) => ({ playerKey: e.playerKey, value: e.vorRos })))
  let prevTier = 0
  let prevVor = 0
  let lastTier = 1
  for (const row of shown) {
    row.tier = tierByKey[row.playerKey] ?? 1
    // Sorted descending, so the previous row IS the last row of the tier above.
    if (prevTier && row.tier !== prevTier) {
      row.tierBreak = true
      row.tierDrop = Math.max(0, prevVor - row.vorRos)
    }
    prevTier = row.tier
    prevVor = row.vorRos
    lastTier = row.tier
  }
  // Past the fold: carry the last tier, draw no line. These rows are off the page, and a
  // tier number on them would only matter if we ever showed them.
  for (const row of entries.slice(BOARD_DEPTH)) {
    row.tier = lastTier
    row.tierBreak = undefined
    row.tierDrop = undefined
  }
}

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

  /*
   * Tier the rows a reader can SEE.
   *
   * assignTiers spends a fixed budget of cuts on the biggest gaps in whatever column it is
   * given, and a position column in a real league runs far past what the page shows — third
   * quarterbacks and handcuff backs trailing to minus three hundred. Those gaps are enormous
   * and they are all in the tail, so they took every cut, and the twenty-five rows actually on
   * screen came back as one undifferentiated tier. The quarterback board showed a single line
   * under Josh Allen and then nineteen players spanning ninety points with no cliff drawn.
   *
   * Reproduced by adding a realistic tail to a fixture: five breaks, four of them at rows 26
   * to 29. The board was not under-tiered, it was tiered somewhere the reader never looks.
   *
   * So tiering runs over the displayed depth, and everything past it inherits the last tier
   * without drawing a line. The view imports this same constant, so the two cannot drift.
   */
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
    tierInPlace(entries)
    board[pos] = entries
  }

  /*
   * One board across every position.
   *
   * Value over replacement is cross-position by construction — it is how many points a player
   * is worth ABOVE the last startable body at his own position, which is the only honest way
   * to put a quarterback and a tight end on the same axis. So an overall order is not a
   * convenience view, it is the number this page already computes, finally shown whole.
   *
   * The per-position pills answered "who is the best receiver available". They could not
   * answer "of everything on this wire, what should I want", which is the question you ask
   * with one roster spot and a waiver claim. Positional rank hides that a free tight end at
   * -3 is worth more to you than a free quarterback at -1 whose seat is already filled.
   */
  const all: BoardRow[] = Object.values(board).flat().sort((a, b) => b.vorRos - a.vorRos)
  if (all.length) {
    /* Re-tiered on its own, never inherited. A player's tier among ALL startable bodies is a
       different fact from his tier among receivers, and the rows above are shared objects. */
    const rows: BoardRow[] = all.map((r) => ({ ...r, tier: 0, tierBreak: undefined, tierDrop: undefined }))
    tierInPlace(rows)
    board.ALL = rows
  }

  return { bestAvailable, upgrades, thisWeek, board }
}
