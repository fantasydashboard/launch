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
import { indifferenceTiers } from '@/football/indifferenceTiers'
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
  /**
   * Who holds him, when it is not you and not nobody.
   *
   * `owned` and `free` between them could say "mine", "claimable" or "neither", and a waiver
   * board needs the third case named: the week's best pickup going to the team you are
   * chasing is a trade target, not a mystery.
   */
  ownerName?: string
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

/**
 * Who belongs on the OVERALL board. Kickers and team defences do not.
 *
 * The overall list ranks on value over replacement, which is precisely what lets a quarterback
 * and a tight end share one axis. It does that favour for skill positions and not for
 * specialists. Every kicker in the league projects within a point or two of every other, so the
 * whole position lands at a value of about zero — and on this board zero is not "no opinion",
 * it is "exactly replacement level", which drops the entire position into the middle of the
 * list above real players carrying negative value.
 *
 * Defences were worse. Sleeper files them with no full_name, so not one of them matches a
 * projection; all thirty-two arrive unprojected, get scored zero for want of anything better,
 * and sort into the same middle band. A live ESPN league showed sixteen consecutive rows of
 * "no proj" sitting above startable players.
 *
 * They keep their own columns, where the comparison is the one actually being made — this
 * kicker against that kicker — and the overall list answers the question it was built for:
 * of everything on this wire, what should I want with one roster spot.
 */
const OVERALL_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE'])
/* Folds team defence before splitting: ESPN spells the position "D/ST" and this split
   exists for multi-eligible players, so the slash turned a defence into "D". */
const normPos = (pos: string): string => canonicalPosition((pos || '').split(/[,/|]/)[0])
const faKey = (fa: { playerKey?: string; name: string }): string => fa.playerKey ?? `fa:${fa.name}`

/**
 * How many rows the board renders before asking to be expanded.
 *
 * Deep enough to be useful without dumping two hundred rows on someone who wanted the top of
 * the list; the surface offers the rest on request.
 */
export const BOARD_DEPTH = 50

/**
 * Tier the column and mark the cliffs, in place.
 *
 * Tiers run the WHOLE column, top to bottom. They used to stop at a fixed depth, which was a
 * workaround for a rule that had to spend a fixed number of cuts and would otherwise spend
 * them all in the tail. `indifferenceTiers` spends nothing it has not earned, so the limit is
 * gone — and it had to go, because rows past that depth are precisely where a waiver claim
 * gets made. Nobody needs a tier line to tell them about the best back on the board.
 */
function tierInPlace(entries: BoardRow[], weeksLeft: number): void {
  if (!entries.length) return
  const tierByKey = indifferenceTiers(
    entries.map((e) => ({ playerKey: e.playerKey, value: e.vorRos })),
    weeksLeft,
  )
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
  /** pool teamKey -> display name, so a rostered player can say who has him. */
  teamNames?: Record<string, string>
  /**
   * Weeks still to play. Tier width is stated in points per WEEK, so the horizon is what
   * converts a rest-of-season value into it — and it is required rather than defaulted
   * because a wrong horizon silently produces plausible, wrong tiers.
   */
  weeksLeft: number
}): FootballWire {
  const { freeAgents, vorByKey, pool, slots, myTeamKey, playingTeams, teamNames, weeksLeft } = input
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
   * Tier every row, at every depth.
   *
   * A tier here says one thing: these players are interchangeable — within a point per week of
   * whoever leads the group. That is the claim a manager needs at row eighty as much as at row
   * three, and arguably more, because the top of a board sorts itself. Six near-identical backs
   * in the middle of the wire is the answer to "who do I claim"; a ranked list of them is not.
   */
  // Full board: rostered + FA per position, VOR-ranked, owned/free flagged, tiered.
  const board: Record<string, BoardRow[]> = {}
  for (const pos of BOARD_POSITIONS.filter((p) => startable.has(p))) {
    const entries: BoardRow[] = []
    for (const p of pool) {
      if (normPos(p.position) !== pos) continue
      const pv = vorByKey[p.playerKey]
      entries.push({ playerKey: p.playerKey, name: p.name, position: pos, team: p.proTeam, headshot: p.headshot, vorRos: pv?.vorRos ?? 0, owned: p.teamKey === myTeamKey, unprojected: !pv, free: false, tier: 0, bye: onBye(p.proTeam), ownerName: p.teamKey === myTeamKey ? '' : (teamNames?.[p.teamKey] ?? '') })
    }
    for (const fa of freeAgents) {
      if (normPos(fa.position) !== pos) continue
      const v = vorByKey[faKey(fa)]
      if (!v) continue
      entries.push({ playerKey: faKey(fa), name: fa.name, position: pos, team: fa.team, headshot: fa.headshot, vorRos: v.vorRos, owned: false, free: true, tier: 0, bye: onBye(fa.team) })
    }
    if (!entries.length) continue

    entries.sort((a, b) => b.vorRos - a.vorRos)
    tierInPlace(entries, weeksLeft)
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
  const all: BoardRow[] = Object.entries(board)
    .filter(([pos]) => OVERALL_POSITIONS.has(pos))
    .flatMap(([, rows]) => rows)
    .sort((a, b) => b.vorRos - a.vorRos)
  if (all.length) {
    /* Re-tiered on its own, never inherited. A player's tier among ALL startable bodies is a
       different fact from his tier among receivers, and the rows above are shared objects. */
    const rows: BoardRow[] = all.map((r) => ({ ...r, tier: 0, tierBreak: undefined, tierDrop: undefined }))
    tierInPlace(rows, weeksLeft)
    board.ALL = rows
  }

  return { bestAvailable, upgrades, thisWeek, board }
}
