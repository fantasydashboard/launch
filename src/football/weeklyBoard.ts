import { assignSlots, type DepthPlayer } from '@/trades/positionalLandscape'
import { parseEligible, type PointsPoolPlayer } from '@/myteam/pointsTeam'
import type { PlayerVor } from './footballVor'
import type { OpportunityTag } from './footballOpportunity'
import type { AvailablePlayer } from '@/players/types'
import { FLEX_ELIGIBILITY, startablePositions } from '@/trades/rosterSlots'

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
  /**
   * Rank THIS WEEK at his own position, and among everyone eligible for a flex slot, over
   * every player rostered in the league PLUS the free agents — because the waiver wire is
   * available weekly and a start/sit is decided against it.
   *
   * There is deliberately no cross-position "overall": weekly ranking runs on raw projected
   * points, where quarterbacks outscore everyone, so an overall list would just be every QB
   * followed by everyone else. Flex rank is the number that answers the question a lineup
   * actually asks, since the QB slot has no competition.
   */
  posRank: number
  /** 0 when the league's flex slots can't take his position (a QB in a non-superflex league). */
  flexRank: number
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
  /**
   * Rank THIS WEEK at his own position, and among everyone eligible for a flex slot, over
   * every player rostered in the league PLUS the free agents — because the waiver wire is
   * available weekly and a start/sit is decided against it.
   *
   * There is deliberately no cross-position "overall": weekly ranking runs on raw projected
   * points, where quarterbacks outscore everyone, so an overall list would just be every QB
   * followed by everyone else. Flex rank is the number that answers the question a lineup
   * actually asks, since the QB slot has no competition.
   */
  posRank: number
  /** 0 when the league's flex slots can't take his position (a QB in a non-superflex league). */
  flexRank: number
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
  /**
   * Rank THIS WEEK at his own position, and among everyone eligible for a flex slot, over
   * every player rostered in the league PLUS the free agents — because the waiver wire is
   * available weekly and a start/sit is decided against it.
   *
   * There is deliberately no cross-position "overall": weekly ranking runs on raw projected
   * points, where quarterbacks outscore everyone, so an overall list would just be every QB
   * followed by everyone else. Flex rank is the number that answers the question a lineup
   * actually asks, since the QB slot has no competition.
   */
  posRank: number
  /** 0 when the league's flex slots can't take his position (a QB in a non-superflex league). */
  flexRank: number
  /**
   * Who comes off for him, and what the week actually gains. An add with no drop is half a
   * decision — "add Dak Prescott, 19" is useless beside a QB already projecting 19, and the
   * page never said so. Null when nobody on your bench is worse than him.
   */
  dropName: string | null
  dropKey: string | null
  gain: number
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

/**
 * Win probability from a projected margin. Exported so the view can recompute it from the
 * ROUNDED margin it actually prints — deriving it from the raw margin put "you +8" beside
 * "60% to win" when eight points is 62%, the same rounding mismatch as the totals, one layer
 * deeper. One formula, fed whichever number is on screen.
 *
 * Logistic with a 16-point scale: ~28 points of weekly noise is the conventional football
 * spread, which puts a 10-point edge near 62%.
 */
export function winPctFromMargin(margin: number): number {
  return Math.max(1, Math.min(99, Math.round(100 / (1 + Math.exp(-margin / 16)))))
}

/** One of the opponent's projected starters. */
export interface OppStarter {
  slot: string
  name: string
  position: string
  team?: string
  headshot?: string
  weekPoints: number
  bye: boolean
}

/** This week's fantasy matchup, projected off the same weekly points as the lineup. */
export interface WeeklyMatchup {
  opponentName: string
  opponentLogo: string
  myPoints: number
  oppPoints: number
  margin: number // my - opp
  myWinPct: number // 0..100
  /** Their projected starting lineup — you cannot change it, but you can read it. */
  oppStarters: OppStarter[]
  /** Their starters who are idle. Their problem is your margin, and it is the one
      genuinely actionable thing about another manager's roster. */
  oppByes: OppStarter[]
}

/** Who holds a player, from the point of view of the manager reading the page. */
export type WeeklyOwner = 'me' | 'opp' | 'free' | 'other'

export interface WeeklyBoardRow {
  playerKey: string
  name: string
  position: string
  team?: string
  headshot?: string
  weekPoints: number
  posRank: number
  flexRank: number
  owner: WeeklyOwner
  ownerName: string // '' for me and for free agents
  bye: boolean
  opponent: string
  home: boolean
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
  /**
   * Every rostered player and free agent, ranked for THIS week, keyed by position — plus a
   * 'FLEX' key holding everyone the league's flex slots can take, ranked together. Answers
   * "where do my guys sit against the wire, and who goes in the flex" from one list rather
   * than from two mental cross-references.
   */
  /** Starting slots with nobody in them. Points forfeited, not merely lost. */
  emptySlots: number
  board: Record<string, WeeklyBoardRow[]>
  /** Positions with rows, in canonical order, FLEX last. Drives the picker. */
  boardPositions: string[]
}

const SLOT_ORDER = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'SUPER_FLEX', 'K', 'DEF']
const normPosOf = (p: string) => (p || '').toUpperCase().split(/[,/|]/)[0].trim()
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
  /** pool teamKey -> display name, for badging whoever else holds a player. */
  teamNames?: Record<string, string>
}): WeeklyBoard {
  const { pool, vorByKey, slots, myTeamKey, currentStarters, freeAgents, opponentByTeam, oppTeamKey, oppTeamName, oppTeamLogo, teamNames } = input
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

  /*
   * Weekly ranks over the population a start/sit is actually decided against: every rostered
   * player in the league PLUS the free agents. Leaving the wire out would rank your WR3 among
   * rostered receivers only and hide the fact that a better one is sitting there unowned.
   *
   * Bye players are excluded from the ranking entirely rather than ranked last on zero points,
   * which would bury dozens of real players beneath them and distort every number below.
   */
  const flexPositions = new Set(
    Object.entries(slots)
      .filter(([slot, n]) => Number(n) > 0 && FLEX_ELIGIBILITY[slot])
      .flatMap(([slot]) => FLEX_ELIGIBILITY[slot]),
  )
  const rankable: { key: string; pos: string; pts: number }[] = []
  for (const p of pool) {
    if (byeOf(p.playerKey)) continue
    rankable.push({ key: p.playerKey, pos: normPosOf(p.position), pts: week(p.playerKey) })
  }
  for (const fa of freeAgents) {
    const k = faKey(fa)
    if (!vorByKey[k]) continue
    const t = (fa.team ?? '').toUpperCase()
    if (scheduleKnown && !opponentByTeam[t]) continue
    rankable.push({ key: k, pos: normPosOf(fa.position), pts: week(k) })
  }
  const rankIn = (rows: { key: string; pts: number }[]): Map<string, number> =>
    new Map([...rows].sort((a, b) => b.pts - a.pts).map((r, i) => [r.key, i + 1] as const))

  const posRankByKey = new Map<string, number>()
  for (const pos of new Set(rankable.map((r) => r.pos))) {
    for (const [k, v] of rankIn(rankable.filter((r) => r.pos === pos))) posRankByKey.set(k, v)
  }
  const flexRankByKey = rankIn(rankable.filter((r) => flexPositions.has(r.pos)))
  const ranksOf = (key: string) => ({
    posRank: posRankByKey.get(key) ?? 0,
    flexRank: flexRankByKey.get(key) ?? 0,
  })

  // Optimal weekly lineup for my roster (value = this-week points; IL excluded).
  const myPlayers = pool.filter((p) => p.teamKey === myTeamKey)
  const myDepth: DepthPlayer[] = myPlayers.map((p) => ({
    playerKey: p.playerKey,
    teamKey: p.teamKey,
    eligiblePositions: parseEligible(p),
    value: week(p.playerKey),
    status: p.onIL ? 'IL' : '',
  }))
  const myAssign = assignSlots(myDepth, slots, 0)
  const assigned = myAssign.assignedByPos
  /* A slot you never filled scores zero — the loudest, cheapest thing to warn about, and it
     was stranded on the Matchup page when that tab was hidden for football. */
  const emptySlots = myAssign.unfilled.length
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
        ...ranksOf(key),
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
      ...ranksOf(p.playerKey),
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

  /* The weakest body you could reasonably cut: last on the bench by this week's points.
     Byes are skipped as drop candidates — a player on bye this week is not automatically
     the right cut, he is just idle. */
  const droppable = [...bench].filter((b) => !b.bye).sort((a, b) => a.weekPoints - b.weekPoints)[0] ?? null

  const streamers: WeeklyStreamer[] = freeAgents
    .map((fa) => ({ fa, v: vorByKey[faKey(fa)] }))
    .filter((x) => x.v && x.v.vorWeek > 0)
    .sort((a, b) => b.v!.vorWeek - a.v!.vorWeek)
    .slice(0, 8)
    .map(({ fa, v }) => {
      // Only a real upgrade counts: the streamer has to beat the body he would replace.
      const beatsDrop = droppable !== null && v!.pointsNextWeek > droppable.weekPoints
      return {
        player: fa,
        weekPoints: v!.pointsNextWeek,
        vorWeek: v!.vorWeek,
        streamWeeks: v!.streamWeeks,
        streamOf: v!.streamOf,
        opportunity: v!.opportunity,
        ...ranksOf(faKey(fa)),
        dropName: beatsDrop ? droppable!.name : null,
        dropKey: beatsDrop ? droppable!.playerKey : null,
        gain: beatsDrop ? v!.pointsNextWeek - droppable!.weekPoints : 0,
      }
    })

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
      const oppStarters: OppStarter[] = []
      for (const [slot, keys] of Object.entries(oppAssigned)) {
        for (const k of keys) {
          oppPoints += week(k)
          const p = meta.get(k)
          oppStarters.push({
            slot,
            name: p?.name ?? '—',
            position: p?.position ?? '',
            team: p?.proTeam,
            headshot: p?.headshot,
            weekPoints: week(k),
            bye: byeOf(k),
          })
        }
      }
      oppStarters.sort((a, b) => slotIdx(a.slot) - slotIdx(b.slot) || b.weekPoints - a.weekPoints)
      const myPoints = starters.reduce((sum, s) => sum + s.weekPoints, 0)
      const margin = myPoints - oppPoints
      matchup = {
        opponentName: oppTeamName || 'Opponent',
        opponentLogo: oppTeamLogo || '',
        myPoints,
        oppPoints,
        margin,
        myWinPct: winPctFromMargin(margin),
        oppStarters,
        oppByes: oppStarters.filter((o) => o.bye),
      }
    }
  }

  /*
   * The weekly board: everyone who could occupy a slot this week, in one order per position,
   * plus a FLEX list. Bye players are KEPT here (you need to see your own guy is idle) but
   * carry no rank, matching how they were excluded from the ranking above — a zero-point
   * player ranked last would push dozens of real bodies down the list.
   */
  const boardRow = (
    key: string,
    name: string,
    position: string,
    team: string | undefined,
    headshot: string | undefined,
    owner: WeeklyOwner,
    ownerName: string,
  ): WeeklyBoardRow => ({
    playerKey: key,
    name,
    position: normPosOf(position),
    team,
    headshot,
    weekPoints: week(key),
    ...ranksOf(key),
    owner,
    ownerName,
    bye: scheduleKnown && !opponentByTeam[(team ?? '').toUpperCase()],
    opponent: opponentByTeam[(team ?? '').toUpperCase()]?.opp ?? '',
    home: opponentByTeam[(team ?? '').toUpperCase()]?.home ?? false,
  })

  const allRows: WeeklyBoardRow[] = []
  for (const p of pool) {
    const owner: WeeklyOwner =
      p.teamKey === myTeamKey ? 'me' : oppTeamKey && p.teamKey === oppTeamKey ? 'opp' : 'other'
    allRows.push(
      boardRow(p.playerKey, p.name, p.position, p.proTeam, p.headshot, owner,
        owner === 'me' ? '' : (teamNames?.[p.teamKey] ?? '')),
    )
  }
  for (const fa of freeAgents) {
    const k = faKey(fa)
    if (!vorByKey[k]) continue
    allRows.push(boardRow(k, fa.name, fa.position, fa.team, fa.headshot, 'free', ''))
  }

  const byPoints = (a: WeeklyBoardRow, b: WeeklyBoardRow) => b.weekPoints - a.weekPoints
  const board: Record<string, WeeklyBoardRow[]> = {}
  for (const pos of ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']) {
    if (!startablePositions(slots).has(pos)) continue
    const rows = allRows.filter((r) => r.position === pos).sort(byPoints)
    if (rows.length) board[pos] = rows
  }
  // FLEX is a filter over the same rows, not a separate ranking — it IS the flex decision.
  const flexRows = allRows.filter((r) => flexPositions.has(r.position)).sort(byPoints)
  if (flexPositions.size && flexRows.length) board.FLEX = flexRows

  const boardPositions = [...Object.keys(board).filter((k) => k !== 'FLEX'), ...(board.FLEX ? ['FLEX'] : [])]

  return { starters, bench, moves, streamers, closeCalls, matchup, byeStarters, emptySlots, board, boardPositions }
}
