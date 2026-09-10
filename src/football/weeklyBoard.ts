import { assignSlots, type DepthPlayer } from '@/trades/positionalLandscape'
import { parseEligible, type PointsPoolPlayer } from '@/myteam/pointsTeam'
import type { PlayerVor } from './footballVor'
import type { OpportunityTag } from './footballOpportunity'
import type { AvailablePlayer } from '@/players/types'
import { FLEX_ELIGIBILITY, startablePositions, canonicalPosition } from '@/trades/rosterSlots'
import { assignTiers } from '@/draft/room/tierCliffs'

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

/**
 * Below this, a start/sit is a coin-flip and calling it a move is dishonest.
 *
 * The page led with "1 START / SIT MOVE · +1 pts on the table" and two panels lower listed
 * the same swap under CLOSEST CALLS — "near coin-flips" — at 0.9 points. Both cannot be true.
 * A weekly projection does not resolve differences that small, so a sub-two-point edge is
 * reported as the close call it is and never as something to act on. Bye moves are exempt:
 * a starter on bye is a certain zero, which is not a projection question at all.
 */
export const MIN_MOVE_GAIN = 2

/**
 * How much bigger than a normal gap a drop has to be before it counts as a cliff.
 *
 * This was an absolute two points, and that was a number I guessed off ROUNDED values in a
 * screenshot: a real gap of 1.7 prints as "-2" and fails a >= 2 test, so nearly every tier on
 * the weekly board disappeared and the column went back to being a flat list — the exact
 * problem tiers exist to solve, reintroduced by the fix for the opposite problem.
 *
 * An absolute threshold cannot be right anyway. It has to hold for a quarterback column
 * spanning fourteen points and a kicker column spanning four, in whatever scoring a league
 * happens to use. So the test is relative: a cliff is a gap several times the typical gap in
 * that same column. Nothing to re-tune per position, per sport or per scoring system.
 *
 * Three times the median, with a small absolute floor so a break can never print "-0 pts".
 */
/** How many rows the view shows, and therefore how deep tiering runs. Kept in step with
 *  WeeklyView's BOARD_LIMIT — tiering a population nobody sees is how the Wire lost its. */
export const TIER_DEPTH = 30

export const TIER_DROP_MULTIPLE = 3
export const MIN_TIER_DROP_FLOOR = 0.75

/** A drop worth this share of the column's whole spread is a cliff whatever the median says. */
export const TIER_SPREAD_SHARE = 0.2

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
  /** Needed to ask whether his game is done — the row is otherwise identified only by name. */
  playerKey: string
  name: string
  position: string
  team?: string
  headshot?: string
  weekPoints: number
  bye: boolean
  posRank: number
  flexRank: number
}

/**
 * One roster spot, squared off. Both sides fill the same slot, so the comparison is the one
 * the week actually turns on — not "who has the better team" but "who wins this seat".
 * Either side can be null when the two rosters fill a slot a different number of times.
 */
export interface SlotDuel {
  slot: string
  mine: WeeklyStarter | null
  theirs: OppStarter | null
  /** Mine minus theirs, in this week's points. */
  edge: number
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
  /** Slot-by-slot, mine against theirs, in lineup order. */
  duels: SlotDuel[]
  /**
   * The seat-by-seat read, totalled.
   *
   * The duel rows are the most useful thing on the page and they never added up — nine rows
   * of QB10-vs-QB4 left the reader doing the arithmetic. Winning six seats and losing the
   * match is a different week from winning three and losing it, and only the tally says which.
   */
  seatsWon: number
  seatsLost: number
  seatsTied: number
  /** Points each side has already banked — the part of the score that cannot change. */
  myBanked: number
  oppBanked: number
  /** The seat costing you the most. Null when you are not behind at any seat. */
  worstSlot: string
  worstSlotEdge: number
}

/**
 * How cheap a position is in THIS league, read off who is still unowned.
 *
 * The board already carried the fact and never said it: the quarterback column showed QB7 and
 * QB8 sitting free while the reader started QB10. That is not a "+1, go add Herbert" nudge —
 * a one-point weekly edge is inside the noise, and selling it as a move is the error the
 * start/sit floor exists to prevent. It is a structural read about the league: when the
 * seventh-best starter at a position is unowned, the position is close to free, and nobody
 * should be trading a real asset to get one.
 *
 * The inverse matters more. A position whose best free agent is thirtieth is genuinely scarce,
 * and holding a good one there is worth more than any points total suggests.
 */
export interface WeeklyScarcity {
  position: string
  /** Weekly rank of the best free agent at this position. */
  bestFreeRank: number
  bestFreeName: string
  bestFreePoints: number
  /** Where the reader's own starter at that position ranks, for the comparison. */
  myStarterRank: number
  myStarterName: string
  /** True when a free agent outranks the reader's own starter. */
  freeBeatsMine: boolean
  /** 'cheap' when the wire is stocked here, 'scarce' when it is bare. */
  verdict: 'cheap' | 'scarce'
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
  /** Tier within this list, 1 = best. Same cut rule as the draft board and The Wire. */
  tier: number
  /** First row of a new tier — where the view draws the cliff. */
  tierBreak?: boolean
  /** Points of separation from the tier above; only set on a tier's first row. */
  tierDrop?: number
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
  /** What the wire says each position is worth in this league. Empty when unknowable. */
  scarcity: WeeklyScarcity[]
}

const SLOT_ORDER = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'SUPER_FLEX', 'K', 'DEF']
/* Folds team defence before splitting: ESPN spells the position "D/ST" and this split
   exists for multi-eligible players, so the slash turned a defence into "D". */
const normPosOf = (p: string) => canonicalPosition((p || '').split(/[,/|]/)[0])
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
  /**
   * The lineup the OPPONENT actually set, in slot order. Empty when unpublished.
   *
   * Their starters used to come from assignSlots — our optimiser answering a question nobody
   * asked. You cannot change their lineup, so an idealised version of it misstates your own
   * matchup, and once a game is final it rewrites history: a receiver who played on Thursday
   * and scored badly was quietly benched for them and replaced by someone who had not played.
   */
  oppStarterKeys?: string[]
  /**
   * Points already BANKED this week, keyed by playerKey. Present only for players whose games
   * have produced them.
   *
   * A projection is a claim about a game that has not happened. Once it has, the projection is
   * the one number on the page that is definitely wrong, and this replaces it.
   */
  actualPoints?: Record<string, number>
  /**
   * NFL team -> whether their game has kicked off. Without it nothing is ever treated as
   * banked, because presence in `actualPoints` does not mean a game has been played.
   */
  gameStates?: Record<string, 'pre' | 'in' | 'post'>
  /**
   * The tiers the ACTIVE RANKING LIST declares, when it declares any.
   *
   * An analyst's weekly file carries a Tier column, and it is a better answer than anything
   * we can derive: it is a judgement about which quarterbacks are interchangeable this week,
   * made by the person whose order the reader chose to trust. Our own cliff-finding is a
   * fallback for when nobody has said.
   *
   * Partial by nature — a list covers thirty quarterbacks and the board carries a hundred.
   * Players the list never mentions keep no tier rather than being lumped into the last one.
   */
  tierByKey?: Record<string, number>
}): WeeklyBoard {
  const { pool, vorByKey, slots, myTeamKey, currentStarters, freeAgents, opponentByTeam, oppTeamKey, oppTeamName, oppTeamLogo, teamNames, tierByKey, oppStarterKeys, actualPoints, gameStates } = input
  /*
   * What a player is worth to this week's score.
   *
   * Banked if his game has produced points, projected otherwise. A projection is a claim about
   * a game that has not happened; once it has, the projection is the only number on the page
   * that is definitely wrong. Zero is a real score, so the test is presence in the map rather
   * than truthiness — a player who was held scoreless has banked nothing, and that is a fact
   * about him rather than missing data.
   */
  /*
   * Has this player's game actually happened?
   *
   * NOT "is he in the points map". Sleeper lists every rostered player in `players_points` at
   * 0.0 from the moment a week opens, so presence marked whole rosters as having banked
   * nothing — which is precisely what shipped: both teams in the matchup rendered 0, ranked in
   * the hundreds, while every other team kept its projections. "Zero is a real score" was true
   * and I applied it to a payload where zero mostly means "has not played".
   *
   * The kickoff has to come from the schedule. No game state means no banking: an unreadable
   * scoreboard falls back to projections, which is merely the old behaviour, where guessing
   * the other way empties a roster.
   */
  const banked = (key: string): boolean => {
    if (!actualPoints || !(key in actualPoints) || !gameStates) return false
    const st = gameStates[(meta.get(key)?.proTeam ?? '').toUpperCase()]
    return st === 'in' || st === 'post'
  }
  const week = (key: string): number =>
    banked(key) ? actualPoints![key] : (vorByKey[key]?.pointsNextWeek ?? 0)
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
  const rawMoves: WeeklyMove[] = []
  const n = Math.min(startThese.length, sitThese.length)
  for (let i = 0; i < n; i++) {
    const s = startThese[i]
    const d = sitThese[i]
    rawMoves.push({
      kind: d.bye ? 'bye' : 'swap',
      slot: s.slot,
      startKey: s.playerKey,
      startName: s.name,
      sitKey: d.key,
      sitName: d.name,
      gain: s.weekPoints - d.pts,
    })
  }
  /* A bye is a certainty, so it always survives; a swap has to clear the coin-flip floor. */
  const moves = rawMoves.filter((m) => m.kind === 'bye' || m.gain >= MIN_MOVE_GAIN)

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
      /*
       * Their real lineup where the platform publishes it; ours only as a fallback.
       *
       * assignSlots answers "what is the best they could do", which is a different question
       * from "what did they do" — and only the second one is your opponent. Sleeper hands us
       * the set lineup in slot order on a payload we already fetch, so where it exists the
       * optimiser has nothing to add and one real way to mislead: after a Thursday game it
       * would bench a receiver who had already played and replace him with someone who had
       * not, inventing points nobody can score.
       *
       * Slot order is the league's own, taken from the same roster_positions that built
       * `slots`, so the nth starter fills the nth seat.
       */
      const onOpp = new Set(oppDepth.map((d) => d.playerKey))
      const named = oppStarterKeys ?? []
      const declared = new Set(named.filter((k) => onOpp.has(k)))
      /*
       * A starter we could not resolve is our bug, not their empty seat.
       *
       * Seating only the ones that matched leaves a hole indistinguishable from a slot they
       * genuinely left unfilled — and it understates their score using our own failure, which
       * is the worst direction to be wrong in a matchup. The platform's empty-slot sentinel is
       * stripped upstream, so anything left here that does not resolve is a matching problem.
       * Where that happens the remaining seats are filled from their bench, which is at worst
       * the old optimiser behaviour on the part we could not read.
       */
      const unresolved = named.length - declared.size
      /*
       * Seat them by eligibility, not by array index.
       *
       * The first version paired the nth declared starter with the nth seat, which assumes the
       * platform's slot order matches ours. It need not: `slots` is aggregated by position and
       * re-sorted canonically, so any league whose roster_positions run in a different order
       * would have had its lineup silently transposed — a tight end shown in a flex seat, a
       * duel drawn against the wrong opponent. Restricting assignSlots to exactly the players
       * they started keeps the decision theirs and lets the solver do the only part it is
       * actually good at: which legal seat each body occupies.
       */
      /*
       * Two passes, so their decision cannot be optimised away.
       *
       * Sorting the declared players to the front and hoping the solver prefers them does not
       * work — assignSlots optimises by value and ignores input order, so a starter who scored
       * badly would still lose his seat to a bench body, which is the whole bug. Seat the
       * declared players alone first, then fill only the seats still open from the rest of the
       * roster. Deterministic, and the second pass runs only when a starter went unresolved.
       */
      let oppAssigned: Record<string, string[]>
      if (declared.size) {
        /*
         * A declared starter is seated whatever his injury tag says.
         *
         * assignSlots drops anyone flagged out, which is right for "who should I start" and
         * wrong for "who did they start" — and this is the second question. A manager can
         * start a questionable player, and once the game is played the points are banked no
         * matter what the tag says. Leaving him out left a hole in their lineup exactly where
         * A.J. Brown was: he resolved, he was declared, and the solver refused him.
         *
         * Cleared only on this pass. The filler below is still a guess about seats we could
         * not read, and a guess should not stage an injured player.
         */
        oppAssigned = assignSlots(
          oppDepth
            .filter((d) => declared.has(d.playerKey))
            .map((d) => ({ ...d, status: '' })),
          slots,
          0,
        ).assignedByPos
        if (unresolved > 0) {
          const open: Record<string, number> = {}
          for (const [slot, n] of Object.entries(slots)) {
            const taken = (oppAssigned[slot] ?? []).length
            const spare = Number(n) - taken
            if (spare > 0) open[slot] = spare
          }
          if (Object.keys(open).length) {
            const filler = assignSlots(
              oppDepth.filter((d) => !declared.has(d.playerKey)), open, 0,
            ).assignedByPos
            for (const [slot, keys] of Object.entries(filler)) {
              oppAssigned[slot] = [...(oppAssigned[slot] ?? []), ...keys]
            }
          }
        }
      } else {
        oppAssigned = assignSlots(oppDepth, slots, 0).assignedByPos
      }
      let oppPoints = 0
      const oppStarters: OppStarter[] = []
      for (const [slot, keys] of Object.entries(oppAssigned)) {
        for (const k of keys) {
          oppPoints += week(k)
          const p = meta.get(k)
          oppStarters.push({
            slot,
            playerKey: k,
            name: p?.name ?? '—',
            position: p?.position ?? '',
            team: p?.proTeam,
            headshot: p?.headshot,
            weekPoints: week(k),
            bye: byeOf(k),
            ...ranksOf(k),
          })
        }
      }
      oppStarters.sort((a, b) => slotIdx(a.slot) - slotIdx(b.slot) || b.weekPoints - a.weekPoints)

      /* Pair the two lineups seat by seat. Both are already sorted by slot then by points, so
         the nth body at a slot on one side faces the nth on the other — a league that starts
         two backs pits RB1 against RB1 and RB2 against RB2, which is the comparison a manager
         makes in their head anyway. */
      const duels: SlotDuel[] = []
      const slotOrder = [...new Set([...starters.map((x) => x.slot), ...oppStarters.map((x) => x.slot)])]
        .sort((a, b) => slotIdx(a) - slotIdx(b))
      for (const slot of slotOrder) {
        const mineAt = starters.filter((x) => x.slot === slot)
        const theirsAt = oppStarters.filter((x) => x.slot === slot)
        for (let i = 0; i < Math.max(mineAt.length, theirsAt.length); i++) {
          const mine = mineAt[i] ?? null
          const theirs = theirsAt[i] ?? null
          duels.push({
            slot,
            mine,
            theirs,
            edge: (mine?.weekPoints ?? 0) - (theirs?.weekPoints ?? 0),
          })
        }
      }
      const myPoints = starters.reduce((sum, s) => sum + s.weekPoints, 0)
      const margin = myPoints - oppPoints
      /*
       * Total the seats. A seat is only won or lost when both managers have somebody in it —
       * an empty seat on either side is a hole, not a duel, and counting it as a win would
       * flatter a lineup with a slot nobody filled.
       *
       * A seat within half a point is a tie. The projection does not separate two players that
       * closely, and calling it a win invites the reader to trust a distinction that is noise.
       */
      const SEAT_TIE = 0.5
      const contested = duels.filter((d) => d.mine && d.theirs)
      const seatsWon = contested.filter((d) => d.edge > SEAT_TIE).length
      const seatsLost = contested.filter((d) => d.edge < -SEAT_TIE).length
      const worst = contested.filter((d) => d.edge < -SEAT_TIE)
        .sort((a, b) => a.edge - b.edge)[0] ?? null
      /* How much of each score is settled. A page reporting 144-125 in the middle of a week
         is stating two different kinds of number as one, and only this separates them. */
      const myBanked = starters.reduce((sum, st) => sum + (banked(st.playerKey) ? st.weekPoints : 0), 0)
      const oppBanked = oppStarters.reduce((sum, o) => sum + (banked(o.playerKey) ? o.weekPoints : 0), 0)
      matchup = {
        opponentName: oppTeamName || 'Opponent',
        opponentLogo: oppTeamLogo || '',
        myPoints,
        oppPoints,
        margin,
        myWinPct: winPctFromMargin(margin),
        oppStarters,
        oppByes: oppStarters.filter((o) => o.bye),
        duels,
        seatsWon,
        seatsLost,
        seatsTied: contested.length - seatsWon - seatsLost,
        worstSlot: worst?.slot ?? '',
        worstSlotEdge: worst?.edge ?? 0,
        myBanked,
        oppBanked,
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
    tier: 0,
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
  /* Tiers are the visible cliffs, not every gap over a threshold — the same rule the draft
     board cuts on, so "tier" means one thing across the product. A flat column of forty
     receivers hides the only thing the reader is looking for: where the drop-off is. */
  /**
   * Tiers the source declared, rather than cliffs we inferred.
   *
   * Walks the column in order and starts a new tier wherever the list's own tier number
   * changes. The drop is still measured in our points, because that is the only number on
   * the row and the reader is entitled to know how big the cliff they are being shown is.
   *
   * Returns false when the list has nothing to say about this column, so the caller falls
   * back to deriving them.
   */
  const tierFromSource = (rows: WeeklyBoardRow[], tiers: Record<string, number>): boolean => {
    const walk = [...rows].sort((a, b) => b.weekPoints - a.weekPoints)
    const covered = walk.filter((r) => typeof tiers[r.playerKey] === 'number')
    // One tier across everything the list covers is not a tiering, it is a list.
    if (covered.length < 2 || new Set(covered.map((r) => tiers[r.playerKey])).size < 2) return false

    for (const r of walk) { r.tierBreak = undefined; r.tierDrop = undefined }
    let shown = 1
    let prevSourceTier: number | null = null
    let prevPts = 0
    let seen = false
    for (const r of walk) {
      const t = tiers[r.playerKey]
      if (typeof t !== 'number') {
        // Past the end of the list. Carry the last tier and draw no line — the source stopped
        // having an opinion here, and inventing one under its name would misattribute it.
        r.tier = shown
        continue
      }
      if (seen && prevSourceTier !== null && t !== prevSourceTier) {
        shown += 1
        r.tier = shown
        r.tierBreak = true
        r.tierDrop = Math.max(0, prevPts - r.weekPoints)
      } else {
        r.tier = shown
      }
      seen = true
      prevSourceTier = t
      prevPts = r.weekPoints
    }
    return true
  }

  const tierUp = (rows: WeeklyBoardRow[]): WeeklyBoardRow[] => {
    if (tierByKey && tierFromSource(rows, tierByKey)) return rows
    /* Tier the rows that are displayed. The full column carries every free agent at the
       position — a hundred-odd bodies whose gaps would take every cut assignTiers has to
       spend, exactly as they did on the Wire's board. */
    const byKey = assignTiers(
      [...rows].sort((a, b) => b.weekPoints - a.weekPoints).slice(0, TIER_DEPTH)
        .map((r) => ({ playerKey: r.playerKey, value: r.weekPoints })),
    )
    let prevTier = 0
    let prevPts = 0
    /*
     * assignTiers sorts internally by value and hands back a strictly increasing tier, but
     * this loop walked the caller's array. Wherever players tie — and a weekly board ties
     * constantly, half a column sitting on 20 points — the two orderings disagree about which
     * of the tied players comes first, so the walk could go 5, 6, 5 and print "TIER 5" twice
     * with a row between them. The board showed exactly that: TIER 5 and TIER 6 each labelled
     * more than once down a single column.
     *
     * Walking in the same order the tiers were computed in removes the disagreement, and a
     * break only ever counts as one when the tier actually advances.
     */
    const walk = [...rows].sort((a, b) => b.weekPoints - a.weekPoints)
    /*
     * Clear before walking, because this runs TWICE over the same rows.
     *
     * The per-position pass goes first and mutates the shared row objects; FLEX then copies
     * them and re-tiers. Only ever SETTING the flag meant every cliff earned in the receiver
     * column rode into the flex column still flagged, attached to a flex tier number that had
     * already been printed — so the repeats came back on FLEX after the walk-order fix cured
     * them everywhere else. Same symptom, entirely different cause.
     */
    for (const r of walk) { r.tierBreak = undefined; r.tierDrop = undefined }

    /*
     * A cliff has to be a cliff.
     *
     * assignTiers cuts on the biggest gaps in a column, which is right for a draft board where
     * values run from 300 to 20. A weekly column is compressed — forty flex bodies inside
     * fourteen points — so the "biggest" gaps are a point or less, and picking the top seven
     * of them is picking noise. The board showed the result: five consecutive tiers of exactly
     * one player at receiver, and a break on the flex column captioned "TIER 3 · -0 PTS",
     * which is a cliff labelled no drop at all.
     *
     * So a break earns its line only if the drop is worth a reader's attention. Two points is
     * roughly the difference between a good week and a bad one from the same player, and it is
     * the same floor a start/sit has to clear to be called a move. Where nothing qualifies the
     * column simply carries no tiers, which is the honest reading: these players are the same.
     *
     * Renumbered after the cull so the labels stay 1, 2, 3 down the page. Leaving assignTiers'
     * numbers in place would print "TIER 1" then "TIER 6" and invite the reader to wonder what
     * happened to the four in between.
     */
    /*
     * The bar, measured from this column rather than assumed.
     *
     * Median gap among the rows a reader can actually see — the tail is excluded for the same
     * reason it is excluded from tiering itself, and because a hundred backups separated by
     * hundredths would drag the median to nothing and let every gap qualify.
     */
    const shownRows = walk.slice(0, TIER_DEPTH)
    const gaps: number[] = []
    for (let i = 1; i < shownRows.length; i++) {
      gaps.push(shownRows[i - 1].weekPoints - shownRows[i].weekPoints)
    }
    const sortedGaps = [...gaps].sort((a, b) => a - b)
    const medianGap = sortedGaps.length ? sortedGaps[Math.floor(sortedGaps.length / 2)] : 0
    /*
     * ...and a ceiling on that bar, because a short column has a noisy median.
     *
     * A five-man column with one huge cliff has its median dragged up by the sparse rows
     * either side of it, so three times the median came out at twenty-one and rejected a
     * nineteen-point drop — the most obvious cliff in the fixture, missed by the rule meant to
     * find cliffs. A gap worth a fifth of the whole column's spread is a cliff whatever the
     * median says, so it clears on that alone.
     */
    const spread = shownRows.length
      ? shownRows[0].weekPoints - shownRows[shownRows.length - 1].weekPoints
      : 0
    const bar = Math.max(
      MIN_TIER_DROP_FLOOR,
      Math.min(TIER_DROP_MULTIPLE * medianGap, TIER_SPREAD_SHARE * spread),
    )

    let shown = 1
    let first = true
    for (const r of walk) {
      const raw = byKey[r.playerKey] ?? 1
      // The drop is the gap across the boundary — this row against the one directly above it,
      // which is what "separation from the tier above" has always meant here.
      const drop = prevPts - r.weekPoints
      if (!first && raw > prevTier && drop >= bar) {
        shown += 1
        r.tier = shown
        r.tierBreak = true
        r.tierDrop = drop
      } else {
        r.tier = shown
      }
      first = false
      prevTier = raw
      prevPts = r.weekPoints
    }
    return rows
  }
  const board: Record<string, WeeklyBoardRow[]> = {}
  for (const pos of ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']) {
    if (!startablePositions(slots).has(pos)) continue
    const rows = allRows.filter((r) => r.position === pos).sort(byPoints)
    if (rows.length) board[pos] = tierUp(rows)
  }
  // FLEX is a filter over the same rows, not a separate ranking — it IS the flex decision.
  // FLEX rows are the same objects as the per-position ones, so tier them on a copy — a
  // player's tier among all flex bodies is a different fact from his tier among receivers.
  const flexRows = allRows.filter((r) => flexPositions.has(r.position)).map((r) => ({ ...r })).sort(byPoints)
  if (flexPositions.size && flexRows.length) board.FLEX = tierUp(flexRows)

  const boardPositions = [...Object.keys(board).filter((k) => k !== 'FLEX'), ...(board.FLEX ? ['FLEX'] : [])]

  /*
   * Read the wire's depth off the board we just built, one position at a time.
   *
   * The line is the last starting seat in the league: teams times seats at that position. Ten
   * teams starting one quarterback means QB10 is the worst starter anybody has, so a free QB7
   * is not depth — it is a starter going unclaimed, and paying a real asset for one is a
   * mistake. Above that line the wire is genuinely bare and a good one is worth holding.
   *
   * I first set this line at 0.6 of the seats and the reader's own league disproved it: ten
   * teams, QB7 unowned, and the rule called the position scarce while the board plainly showed
   * three startable quarterbacks free. The seat count is the honest boundary; a fraction of it
   * was a number I picked.
   *
   * Flex-eligible positions get one extra seat rather than a share of every flex slot. Crude,
   * and deliberately the conservative direction: it widens 'cheap' slightly at running back
   * and receiver, where flex genuinely does add starting jobs.
   */
  const teamCount = new Set(pool.map((p) => p.teamKey)).size || 10
  const scarcity: WeeklyScarcity[] = []
  for (const pos of boardPositions) {
    if (pos === 'FLEX') continue
    const rows = board[pos] ?? []
    if (!rows.length) continue
    const seats = (slots[pos] ?? 0) + (flexPositions.has(pos) ? 1 : 0)
    if (seats <= 0) continue
    const cheapRank = Math.max(2, teamCount * seats)
    const bestFree = rows.find((r) => r.owner === 'free' && !r.bye)
    if (!bestFree) continue
    const mine = rows.find((r) => r.owner === 'me' && !r.bye)
    scarcity.push({
      position: pos,
      bestFreeRank: bestFree.posRank,
      bestFreeName: bestFree.name,
      bestFreePoints: bestFree.weekPoints,
      myStarterRank: mine?.posRank ?? 0,
      myStarterName: mine?.name ?? '',
      freeBeatsMine: !!mine && bestFree.posRank < mine.posRank,
      verdict: bestFree.posRank <= cheapRank ? 'cheap' : 'scarce',
    })
  }
  scarcity.sort((a, b) => a.bestFreeRank - b.bestFreeRank)

  return { starters, bench, moves, streamers, closeCalls, matchup, byeStarters, emptySlots, board, boardPositions, scarcity }
}
