/** Where a team sits in the playoff picture, derived from Monte-Carlo odds (not from record alone). */
export type StandingState = 'clinched' | 'eliminated' | 'in' | 'bubble' | 'chasing' | 'unknown'

export type LuckStance = 'sell-high' | 'buy-low' | 'aligned'

export interface LuckVerdict {
  stance: LuckStance
  luckDelta: number // talentRank - recordRank; positive = record beats talent = lucky (sell-high)
  headline: string
  detail: string
  cta: { label: string; route: string } | null
}

/**
 * Record-vs-talent luck as an actionable stance. Mirrors src/league/powerRankings.ts so the two
 * pages never disagree on who's lucky: tol = max(2, round(n/4)); luckDelta = talentRank - recordRank.
 * standingState gates the copy — an eliminated team is never told to "sell high to save the season",
 * a clinched team gets a next-year framing.
 */
export function luckVerdict(input: {
  recordRank: number // 1 = best by record
  talentRank: number // 1 = best by rest-of-season per-week points
  leagueSize: number
  standingState: StandingState
}): LuckVerdict {
  const { recordRank, talentRank, leagueSize, standingState } = input
  const tol = Math.max(2, Math.round(leagueSize / 4))
  const luckDelta = talentRank - recordRank
  const trades = { label: 'Explore trades', route: '/trades' }

  if (standingState === 'eliminated') {
    return {
      stance: 'aligned',
      luckDelta,
      headline: 'Out of the race',
      detail: 'Play the string out — move win-now pieces for next year if a partner will pay.',
      cta: trades,
    }
  }

  if (luckDelta >= tol) {
    if (standingState === 'clinched') {
      return {
        stance: 'sell-high',
        luckDelta,
        headline: 'Locked in — and outrunning your roster',
        detail: 'You are in the bracket but your talent trails your seed. Sell a hot bat high for a playoff or next-year upgrade.',
        cta: { label: 'Find sell-high trades', route: '/trades' },
      }
    }
    return {
      stance: 'sell-high',
      luckDelta,
      headline: 'You are outrunning your roster',
      detail: 'Your record beats your talent — sell high and trade from your inflated standing before it regresses.',
      cta: { label: 'Find sell-high trades', route: '/trades' },
    }
  }

  if (luckDelta <= -tol) {
    return {
      stance: 'buy-low',
      luckDelta,
      headline: 'Your roster is better than your record',
      detail: 'Talent says you are underachieving — buy low or stay patient. Do not sell your studs cheap.',
      cta: trades,
    }
  }

  return {
    stance: 'aligned',
    luckDelta,
    headline: 'Roster and record are in step',
    detail: 'No arbitrage in your standing — win at the margins with streams and lineup edges.',
    cta: { label: "Set this week's lineup", route: '/matchup' },
  }
}
