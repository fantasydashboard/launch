import type { PlayerUsage, UsageByKey } from '@/services/playerUsage'

/**
 * The waiver board: who took over a role last week, and whether you can actually have him.
 *
 * WHY THIS IS NOT THE EXISTING BEST-AVAILABLE LIST. The Wire already ranks free agents by
 * rest-of-season value, which answers "who is the best player nobody owns". A waiver claim
 * asks something narrower and more urgent: whose ROLE just changed. Those diverge constantly
 * — a receiver who has quietly been his team's WR3 all along outranks one who just took over
 * as the WR1 on a better offence, and only the second is worth a bid.
 *
 * SNAP SHARE IS THE SIGNAL. A player who scored well on three touches had an afternoon; one
 * who played eighty percent of the snaps has a job. The first does not repeat.
 *
 * TAKEN PLAYERS ARE KEPT, NOT FILTERED. Seeing that the week's best pickup went to the team
 * you are chasing is worth knowing — it is a trade target now rather than a waiver claim, and
 * a board that silently omits him leaves the reader wondering whether we missed him.
 */

export type Availability = 'free' | 'mine' | 'taken'

export interface WaiverTarget {
  playerKey: string
  name: string
  position: string
  team?: string
  headshot?: string
  /** Share of his team's snaps last week, 0..1. Null when unfiled. */
  snapShare: number | null
  touches: number
  /** What he scored last week — the thing that made anyone look. */
  points: number
  /** Rest-of-season value over replacement, so a one-week spike is visible as one. */
  vorRos: number
  availability: Availability
  /** Who holds him, when somebody does. Empty for free agents and for your own roster. */
  ownerName: string
  /**
   * What he would add to YOUR starting lineup, per week. Zero when he does not crack it.
   *
   * This is what makes the bid yours rather than a published range: the same player is worth
   * real money to a manager who would start him and nothing to one who would not.
   */
  lineupGain: number
  /** Suggested bid as a share of the season's FAAB budget, 0..100. */
  bidPct: number
  /** Why that bid, in one phrase — a bare number is what every other table already prints. */
  bidReason: string
}

/**
 * Below this, "he played a lot" is not a claim worth making.
 *
 * Roughly half a team's offensive snaps. Under it a player is a rotational body, and his
 * points last week say more about one drive than about a role.
 */
export const MIN_SNAP_SHARE = 0.5

/**
 * The most a single pickup is ever worth of a season's budget.
 *
 * FAAB is spent across a whole season, and no one player is worth all of it however good
 * last week looked. A cap is the difference between advice and a dare.
 */
export const MAX_BID_PCT = 35

/**
 * Turn a weekly lineup gain into a bid.
 *
 * A bid is a claim on a share of the remaining budget, so it scales with what he adds and
 * how long he can add it. Someone who does not crack the lineup gets zero and is told so —
 * a small percentage there reads as "a little bit worth it", which is the wrong answer
 * rather than a quiet one.
 */
export function bidFor(lineupGain: number, weeksLeft: number): number {
  if (!(lineupGain > 0) || weeksLeft <= 0) return 0
  /* Two points a week over a full season is a significant add; the curve is anchored so that
     lands mid-range rather than at the cap, leaving room above for a genuine league-winner. */
  const seasonPoints = lineupGain * weeksLeft
  const pct = Math.round((seasonPoints / 34) * 10)
  return Math.max(1, Math.min(MAX_BID_PCT, pct))
}

function reasonFor(t: { lineupGain: number; snapShare: number | null; availability: Availability; ownerName: string }): string {
  if (t.availability === 'mine') return 'already yours'
  if (t.availability === 'taken') return `rostered by ${t.ownerName || 'another team'}`
  if (!(t.lineupGain > 0)) return "wouldn't crack your lineup"
  const share = t.snapShare !== null ? `${Math.round(t.snapShare * 100)}% of snaps` : 'a starter’s role'
  return `${share} · +${t.lineupGain.toFixed(1)} a week to your lineup`
}

export function buildWaiverTargets(input: {
  /** Every player the league can see, with our ownership read. */
  players: {
    playerKey: string
    name: string
    position: string
    team?: string
    headshot?: string
    vorRos: number
    owned: boolean
    free: boolean
    ownerName?: string
  }[]
  usage: UsageByKey
  /** What each free agent would add to the reader's lineup, from the weekly board. */
  gainByKey?: Record<string, number>
  weeksLeft: number
  limit?: number
}): WaiverTarget[] {
  const { players, usage, gainByKey = {}, weeksLeft, limit = 12 } = input
  const out: WaiverTarget[] = []

  for (const p of players) {
    const u: PlayerUsage | undefined = usage[p.playerKey]
    if (!u) continue
    /* No snap data is not evidence of a role. Skipping is the honest reading — the board is
       a claim about workload, and without the workload there is nothing to claim. */
    if (u.snapShare === null || u.snapShare < MIN_SNAP_SHARE) continue
    if (u.touches <= 0 && u.points <= 0) continue

    const availability: Availability = p.owned ? 'mine' : p.free ? 'free' : 'taken'
    const lineupGain = availability === 'free' ? (gainByKey[p.playerKey] ?? 0) : 0
    const base = {
      playerKey: p.playerKey,
      name: p.name,
      position: p.position,
      team: p.team,
      headshot: p.headshot,
      snapShare: u.snapShare,
      touches: u.touches,
      points: u.points,
      vorRos: p.vorRos,
      availability,
      ownerName: p.ownerName ?? '',
      lineupGain,
    }
    out.push({
      ...base,
      /* Only a claimable player gets a bid. A number beside someone else's roster would be
         advice you cannot act on. */
      bidPct: availability === 'free' ? bidFor(lineupGain, weeksLeft) : 0,
      bidReason: reasonFor(base),
    })
  }

  /*
   * Claimable first, then by what they did.
   *
   * A taken player is context rather than an action, so he sorts below every free one however
   * good his week was — the reader came here to add somebody.
   */
  out.sort((a, b) => {
    const rank = (t: WaiverTarget) => (t.availability === 'free' ? 0 : t.availability === 'taken' ? 1 : 2)
    return rank(a) - rank(b)
      || b.points - a.points
      || (b.snapShare ?? 0) - (a.snapShare ?? 0)
  })
  return out.slice(0, limit)
}
