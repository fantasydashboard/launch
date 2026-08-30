/**
 * Situations: what to DO, read off the places where the honest signals disagree.
 *
 * The page already carries four separate reads — roster talent, all-play, recent form, and
 * how hard the remaining schedule is. The temptation is to average them into one "power
 * score". That would be a mistake: the blend has no unit, so nothing could ever contradict
 * it, and a number nobody can check is exactly how this project has been burned before.
 *
 * The value is in the disagreement. Everyone in the league can see a record. Almost nobody
 * has noticed that a 6-2 team has been outscored by most of the league most weeks, or that
 * the team sitting 8th has the softest month left. That gap is the edge, so it is named
 * rather than averaged away.
 *
 * Every situation states the two signals that produced it, so the claim is checkable
 * against the same row it sits on. Each input is optional and each carries a `readable`
 * flag: a signal that cannot yet say anything contributes nothing rather than a zero.
 *
 * Pure + deterministic.
 */

export interface SituationInput {
  teamKey: string
  n: number // league size, so thresholds scale
  talentRank: number // 1 = best roster
  recordRank: number // 1 = best record
  allPlayRank?: number // 1 = beaten the most teams
  formDelta?: number // recent all-play rate − season rate
  sosRank?: number // 1 = easiest remaining schedule
  managerless?: boolean
}

export type SituationKind =
  | 'sell-high'
  | 'buy-low'
  | 'schedule-turns'
  | 'gauntlet'
  | 'real-deal'
  | 'stranded'

export interface Situation {
  teamKey: string
  kind: SituationKind
  label: string // 3 words max, for a chip
  detail: string // the evidence, naming both signals
  /** bigger = more worth acting on; the caller sorts and takes the top few */
  weight: number
}

/** A gap of about a quarter of the league is separation, not wobble. Matches the luck read. */
const sep = (n: number) => Math.max(2, Math.round(n / 4))

const ord = (v: number) => {
  const s = ['th', 'st', 'nd', 'rd'], m = v % 100
  return v + (s[(m - 20) % 10] || s[m] || s[0])
}

/**
 * At most ONE situation per team — the strongest. A row carrying three competing verdicts
 * is a row nobody acts on.
 */
export function buildSituations(inputs: SituationInput[]): Situation[] {
  if (!Array.isArray(inputs) || !inputs.length) return []
  const out: Situation[] = []

  for (const t of inputs) {
    const n = t.n > 1 ? t.n : inputs.length
    const gap = sep(n)
    const cands: Situation[] = []

    if (t.managerless) {
      cands.push({
        teamKey: t.teamKey,
        kind: 'stranded',
        label: 'Free win',
        detail: `No manager setting this lineup — the ${ord(t.talentRank)}-best roster on paper won't be fielded.`,
        weight: 100,
      })
    } else {
      const ap = t.allPlayRank

      /* The strongest tell in the whole page: the standings and all-play disagree. That is
         schedule luck with the schedule taken out, so it is far better evidence than the
         talent-vs-record gap the luck flag already uses. */
      if (ap != null) {
        const luckGap = ap - t.recordRank // + = record flatters them
        if (luckGap >= gap) {
          cands.push({
            teamKey: t.teamKey,
            kind: 'sell-high',
            label: 'Sell high',
            detail: `${ord(t.recordRank)} in the standings but only ${ord(ap)} in all-play — they have been beating their schedule, not the league.`,
            weight: 60 + luckGap * 4,
          })
        } else if (-luckGap >= gap) {
          cands.push({
            teamKey: t.teamKey,
            kind: 'buy-low',
            label: 'Buy low',
            detail: `${ord(ap)} in all-play but stuck ${ord(t.recordRank)} in the standings — they have been losing to the schedule, not the league.`,
            weight: 60 + -luckGap * 4,
          })
        }
      }

      /* Forward-looking, and the part nobody else in the league is doing. Only fires for a
         team good enough for it to matter — a soft month does not rescue the worst roster,
         and saying so would be the "bottom-tier team due to climb" contradiction again. */
      if (t.sosRank != null) {
        const topHalf = t.talentRank <= Math.ceil(n / 2)
        if (t.sosRank <= Math.max(2, Math.round(n / 5)) && topHalf) {
          cands.push({
            teamKey: t.teamKey,
            kind: 'schedule-turns',
            label: 'Schedule turns',
            detail: `${ord(t.talentRank)} in talent with the ${ord(t.sosRank)}-easiest run left — set up to climb before the standings notice.`,
            weight: 50 + (n - t.sosRank),
          })
        } else if (t.sosRank >= n - Math.max(1, Math.round(n / 5)) + 1 && t.recordRank <= Math.ceil(n / 3)) {
          cands.push({
            teamKey: t.teamKey,
            kind: 'gauntlet',
            label: 'Gauntlet ahead',
            detail: `${ord(t.recordRank)} in the standings, but the hardest schedule left in the league. Bank on some of this lead going back.`,
            weight: 45 + t.sosRank,
          })
        }
      }

      /* Confirmation, not a disagreement — deliberately the weakest, so it never displaces
         something actionable. Requires all three to agree before claiming it. */
      const third = Math.max(1, Math.round(n / 3))
      if (t.talentRank <= third && t.recordRank <= third && (ap == null || ap <= third)) {
        cands.push({
          teamKey: t.teamKey,
          kind: 'real-deal',
          label: 'No argument',
          detail: ap == null
            ? `${ord(t.talentRank)} in talent, ${ord(t.recordRank)} in the standings — the roster and the results agree.`
            : `${ord(t.talentRank)} in talent, ${ord(ap)} in all-play, ${ord(t.recordRank)} in the standings. Everything agrees.`,
          weight: 10,
        })
      }
    }

    if (cands.length) {
      cands.sort((a, b) => b.weight - a.weight)
      out.push(cands[0])
    }
  }

  return out.sort((a, b) => b.weight - a.weight)
}
