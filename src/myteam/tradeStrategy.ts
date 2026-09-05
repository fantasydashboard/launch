/**
 * Who needs what you have, how badly, and what they will pay.
 *
 * THE ENGINE MODELLED THE WRONG THING. buildPointsTrades asks "what swap raises MY optimal
 * lineup?" and only afterwards checks whether the other manager happens to gain too. That is a
 * lineup optimisation. A trade is a negotiation, and the question a negotiation starts from is
 * theirs, not yours.
 *
 * The cost of getting that backwards was visible on the page: it proposed a tight end for a
 * tight end. Both teams start exactly one, so a same-position swap at a single-slot position
 * is zero-sum by construction — one side's slot rises by precisely what the other's falls.
 * There is no sweetener that fixes it, because nothing you hold at that position is something
 * they need. The board printed "costs them 29 — worth asking" on a deal no one would ever take.
 *
 * Everything below is observable. The rule this module holds to is that a claim about somebody
 * else's motivation has to be traceable to a number on their roster or their record — "their
 * RB2 is below replacement and they are 1-4" — never a vibe about what a manager might want.
 */
import { FLEX_ELIGIBILITY } from '@/trades/rosterSlots'

/** Where a team stands at one position, in the only terms that create urgency. */
export interface PositionNeed {
  position: string
  /**
   * VOR of the WEAKEST body they currently start there. Below zero means they are starting
   * someone worse than freely available — a hole, not a preference.
   */
  worstStarterVor: number
  /** True when that starter is below replacement. */
  isHole: boolean
  /** How many slots the league starts here. Single-slot positions cannot be traded like-for-like. */
  slots: number
}

/** What we know about a rival's season, which decides how motivated they are. */
export type TeamPosture = 'contender' | 'bubble' | 'rebuilder' | 'unknown'
/** Whether the season still matters to them. */
export type TeamStakes = 'must-win' | 'live' | 'coasting' | 'unknown'

export interface TeamSituation {
  posture: TeamPosture
  stakes: TeamStakes
}

/**
 * Positions the league starts exactly one of. A 1-for-1 swap at one of these can never help
 * both sides: the slot is a single seat, so whatever one team gains the other loses.
 */
export function singleSlotPositions(slots: Record<string, number>): Set<string> {
  const seats: Record<string, number> = {}
  for (const [slot, raw] of Object.entries(slots ?? {})) {
    const n = Number(raw)
    if (!Number.isFinite(n) || n <= 0) continue
    const flexes = FLEX_ELIGIBILITY[slot]
    if (flexes?.length) {
      // A flex seat means the position is NOT single-slot — a second body can start.
      for (const p of flexes) seats[p] = (seats[p] ?? 0) + n
    } else {
      seats[slot] = (seats[slot] ?? 0) + n
    }
  }
  return new Set(Object.entries(seats).filter(([, n]) => n === 1).map(([p]) => p))
}

/**
 * A same-position one-for-one is pointless wherever the position has a single seat.
 *
 * This is the TE-for-TE rule, stated generally: with one seat, the two lineups move by equal
 * and opposite amounts, so no price makes it mutual. Multi-seat positions are exempt — giving
 * an RB to get a better RB can genuinely help a team that starts three of them.
 */
export function isZeroSumSwap(
  givePositions: string[],
  getPositions: string[],
  slots: Record<string, number>,
): boolean {
  if (givePositions.length !== 1 || getPositions.length !== 1) return false
  const a = givePositions[0]
  if (a !== getPositions[0]) return false
  return singleSlotPositions(slots).has(a)
}

/**
 * Read a roster's holes: for each position, the weakest body they actually start.
 *
 * Rank says a team is eighth of ten at running back. This says their second starter is worth
 * less than a free agent — which is the difference between a preference and a problem, and the
 * only version of "need" worth acting on.
 */
export function readNeeds(
  starters: { position: string; vor: number }[],
  slots: Record<string, number>,
): Record<string, PositionNeed> {
  const seats: Record<string, number> = {}
  for (const [slot, raw] of Object.entries(slots ?? {})) {
    const n = Number(raw)
    if (!Number.isFinite(n) || n <= 0) continue
    const flexes = FLEX_ELIGIBILITY[slot]
    if (flexes?.length) for (const p of flexes) seats[p] = (seats[p] ?? 0) + n
    else seats[slot] = (seats[slot] ?? 0) + n
  }

  const out: Record<string, PositionNeed> = {}
  for (const s of starters) {
    const pos = (s.position || '').toUpperCase().split(/[,/|]/)[0].trim()
    if (!pos) continue
    const prev = out[pos]
    if (!prev || s.vor < prev.worstStarterVor) {
      out[pos] = {
        position: pos,
        worstStarterVor: s.vor,
        isHole: s.vor < 0,
        slots: seats[pos] ?? 0,
      }
    }
  }
  return out
}

/**
 * How likely they are to say yes, 0..1.
 *
 * Asks were ranked by NET SURPLUS — your gain minus their loss — which optimises your outcome
 * while ignoring whether anyone would accept, and is exactly how "costs them 29" reached the
 * top of the list. A five-point gain a desperate team takes is worth more than a thirty-point
 * gain nobody takes, so the ranking wants a probability in it.
 *
 * Deliberately coarse. This estimates whether a deal is *sendable*, not what a specific human
 * will do; pretending to finer resolution than the inputs support would be the same error as
 * the confident numbers this page has already been corrected for.
 */
export function acceptOdds(input: {
  /** Change to THEIR optimal lineup. Positive means the deal helps them on its own merits. */
  theirGain: number
  /** Change to YOUR optimal lineup, for scale. */
  myGain: number
  /** Their hole at the position you are sending into, if any. */
  fills?: PositionNeed | null
  situation?: TeamSituation
}): number {
  const { theirGain, myGain, fills, situation } = input

  let p: number
  if (theirGain > 0) {
    // It improves their lineup unprompted. The only question is whether they notice.
    p = 0.7
  } else {
    /* It costs them. How much, relative to what you are gaining, is the whole story: giving up
       a little to fix a hole is a normal trade, giving up as much as you gain is a donation. */
    const ratio = myGain > 0 ? -theirGain / myGain : 2
    p = ratio <= 0.25 ? 0.45 : ratio <= 0.6 ? 0.3 : ratio <= 1 ? 0.15 : 0.05
  }

  // Filling a genuine hole is the strongest lever there is — they are starting someone
  // who should not be starting, and they know it.
  if (fills?.isHole) p += 0.2

  switch (situation?.stakes) {
    case 'must-win': p += 0.1; break   // will pay to fix this week
    case 'coasting': p -= 0.25; break  // season decided; often stops answering
    default: break
  }
  if (situation?.posture === 'contender' && theirGain > 0) p += 0.05
  if (situation?.posture === 'rebuilder') p -= 0.1

  return Math.max(0.02, Math.min(0.95, p))
}

/** Where a deal sits on the ask ladder — what you open with, and where it probably lands. */
export type Rung = 'fair' | 'reach' | 'long-shot'

export function rungFor(theirGain: number, myGain: number): Rung {
  if (theirGain > 0) return 'fair'
  const ratio = myGain > 0 ? -theirGain / myGain : 2
  return ratio <= 0.5 ? 'reach' : 'long-shot'
}

/**
 * The opener, led with THEIR angle.
 *
 * Both the landing page and the paywall promise "the message that gets a reply" and neither
 * the trades page nor anything else ever wrote one. A pitch that opens with what you gain is
 * the one that does not get answered, so this opens with the hole on their roster and names
 * it — a claim they can check against their own lineup rather than take on faith.
 */
export function pitchFor(input: {
  theirTeamName: string
  getNames: string[]
  giveNames: string[]
  fills?: PositionNeed | null
  theirGain: number
  situation?: TeamSituation
}): string {
  const { theirTeamName, getNames, giveNames, fills, theirGain, situation } = input
  const give = giveNames.join(' and ')
  const get = getNames.join(' and ')

  const opener = fills?.isHole
    ? `${theirTeamName} — you're starting a ${fills.position} below replacement right now, and I'm deep there.`
    : theirGain > 0
      ? `${theirTeamName} — I think this one helps us both.`
      : `${theirTeamName} — throwing this out there in case the shape works for you.`

  const urgency = situation?.stakes === 'must-win'
    ? ' You need the win this week more than you need the depth.'
    : ''

  const body = theirGain > 0
    ? ` ${give} for ${get} raises both our starting lineups.`
    : ` Would you do ${give} for ${get}?`

  return opener + body + urgency
}
