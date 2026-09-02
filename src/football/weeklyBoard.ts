import { assignSlots, type DepthPlayer } from '@/trades/positionalLandscape'
import { parseEligible, type PointsPoolPlayer } from '@/myteam/pointsTeam'
import type { PlayerVor } from './footballVor'
import type { OpportunityTag } from './footballOpportunity'
import type { AvailablePlayer } from '@/players/types'
import { FLEX_ELIGIBILITY } from '@/trades/rosterSlots'

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

/** A start/sit that is nearly a coin flip — where a week is quietly won or lost. */
export interface WeeklyCloseCall {
  slot: string
  startName: string
  startPoints: number
  sitName: string
  sitPoints: number
  gap: number
}

/** This week's fantasy matchup, projected off the same weekly points as the lineup. */
export interface WeeklyMatchup {
  opponentName: string
  opponentLogo: string
  myPoints: number
  oppPoints: number
  margin: number // my - opp
  myWinPct: number // 0..100
}

export interface WeeklyBoard {
  starters: WeeklyStarter[]
  bench: WeeklyBenchRow[]
  moves: WeeklyMove[]
  streamers: WeeklyStreamer[]
  /** Empty when the lineup has no genuinely close decision in it. */
  closeCalls: WeeklyCloseCall[]
  /** Null when no opponent is known (bye week, or an unsupported platform). */
  matchup: WeeklyMatchup | null
  /** Starters on a bye — points you are certain to forfeit unless you move them. */
  byeStarters: WeeklyStarter[]
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
  /** The fantasy opponent's pool teamKey, when one is known. */
  oppTeamKey?: string
  oppTeamName?: string
  oppTeamLogo?: string
}): WeeklyBoard {
  const { pool, vorByKey, slots, myTeamKey, currentStarters, freeAgents, opponentByTeam, oppTeamKey, oppTeamName, oppTeamLogo } = input
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

  /*
   * Close calls: a started body whose best benched alternative for the same slot is within
   * a couple of points. These are where a football week is actually decided — the optimizer
   * is confident about the top of your lineup and nearly indifferent at the bottom, and only
   * the second kind is worth a manager's attention.
   */
  const CLOSE_PTS = 2.5
  const candidates: (WeeklyCloseCall & { altKey: string })[] = []
  for (const st of starters) {
    if (st.bye) continue
    // bench is sorted desc by weekPoints, so the first eligible body IS the best alternative.
    const allowed = FLEX_ELIGIBILITY[st.slot] ?? [st.slot]
    const alt = bench.find((b) => {
      if (b.bye) return false
      const elig = parseEligible(meta.get(b.playerKey) as PointsPoolPlayer)
      return elig.some((e) => allowed.includes(e))
    })
    if (!alt) continue
    const gap = st.weekPoints - alt.weekPoints
    if (gap < 0 || gap > CLOSE_PTS) continue
    candidates.push({
      slot: st.slot,
      startName: st.name,
      startPoints: st.weekPoints,
      sitName: alt.name,
      sitPoints: alt.weekPoints,
      gap,
      altKey: alt.playerKey,
    })
  }
  /* A bench player can only fill ONE slot, so he can only be one alternative. Offering the
     same body as the swap for two different FLEX spots reads as two independent choices when
     taking either forecloses the other. Tightest gap wins him; the rest are dropped. */
  const closeCalls: WeeklyCloseCall[] = []
  const usedAlt = new Set<string>()
  for (const c of [...candidates].sort((a, b) => a.gap - b.gap)) {
    if (usedAlt.has(c.altKey)) continue
    usedAlt.add(c.altKey)
    const { altKey: _drop, ...row } = c
    closeCalls.push(row)
  }

  const byeStarters = starters.filter((s) => s.bye)

  /*
   * The fantasy matchup, projected off the SAME weekly points the lineup above uses, so the
   * margin can always be checked against the rows on screen. Previously this lived on its own
   * tab and was computed from a different (baseball) model entirely.
   */
  let matchup: WeeklyMatchup | null = null
  if (oppTeamKey) {
    const oppDepth: DepthPlayer[] = pool
      .filter((p) => p.teamKey === oppTeamKey)
      .map((p) => ({
        playerKey: p.playerKey,
        teamKey: p.teamKey,
        eligiblePositions: parseEligible(p),
        value: week(p.playerKey),
        status: p.onIL ? 'IL' : '',
      }))
    if (oppDepth.length) {
      const oppAssigned = assignSlots(oppDepth, slots, 0).assignedByPos
      let oppPoints = 0
      for (const keys of Object.values(oppAssigned)) for (const k of keys) oppPoints += week(k)
      const myPoints = starters.reduce((sum, s) => sum + s.weekPoints, 0)
      const margin = myPoints - oppPoints
      // Logistic on the margin. ~28 points of weekly noise in a football week is the
      // conventional spread; it puts a 10-point edge near 60%, which matches intuition.
      const myWinPct = Math.round(100 / (1 + Math.exp(-margin / 16)))
      matchup = {
        opponentName: oppTeamName || 'Opponent',
        opponentLogo: oppTeamLogo || '',
        myPoints,
        oppPoints,
        margin,
        myWinPct: Math.max(1, Math.min(99, myWinPct)),
      }
    }
  }

  return { starters, bench, moves, streamers, closeCalls, matchup, byeStarters }
}
