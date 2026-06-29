/**
 * Trade radar: rank opponents by COMPLEMENTARY fit from the league landscape. A good
 * partner is strong where you're exposed (you can acquire there) AND weak where you're
 * strong (they'd want what you have) — mutual incentive is what makes a deal happen.
 *
 * This is a league-level "who do I even talk to?" pointer, not a deal-maker; the actual
 * player-for-player engine lives on the Trades page. Pure + deterministic.
 */
export interface TradeFitDim {
  key: string
  label: string
}

export interface TradePartner {
  teamKey: string
  teamName: string
  youGet: TradeFitDim[] // they're strong, you're weak — what you'd acquire
  theyGet: TradeFitDim[] // you're strong, they're weak — what they'd want
  score: number
}

export interface TradeFitView {
  teams: { key: string; name: string; isMe: boolean }[]
  rows: { key: string; label: string; ranks: (number | null)[] }[] // ranks aligned to `teams`
  numTeams: number
}

export function buildTradeFit(view: TradeFitView, myTeamKey: string): TradePartner[] {
  const myIdx = view.teams.findIndex((t) => t.key === myTeamKey)
  if (myIdx < 0) return []

  const n = view.numTeams
  const topThird = Math.max(1, Math.ceil(n / 3)) // surplus: rank in the top third
  const botThird = n - Math.max(1, Math.floor(n / 3)) + 1 // need: rank in the bottom third
  const isStrong = (r: number | null) => r != null && r <= topThird
  const isWeak = (r: number | null) => r != null && r >= botThird

  const partners: TradePartner[] = []
  view.teams.forEach((t, ti) => {
    if (ti === myIdx) return
    const youGet: TradeFitDim[] = []
    const theyGet: TradeFitDim[] = []
    for (const row of view.rows) {
      const myR = row.ranks[myIdx]
      const theirR = row.ranks[ti]
      if (isStrong(theirR) && isWeak(myR)) youGet.push({ key: row.key, label: row.label })
      if (isStrong(myR) && isWeak(theirR)) theyGet.push({ key: row.key, label: row.label })
    }
    // A real trade needs incentive on BOTH sides; one-way "fits" aren't deals.
    if (youGet.length && theyGet.length) {
      // Reward balance (both sides have something) over a lopsided pile on one side.
      const score = Math.min(youGet.length, theyGet.length) * 2 + youGet.length + theyGet.length
      partners.push({ teamKey: t.key, teamName: t.name, youGet, theyGet, score })
    }
  })

  return partners.sort((a, b) => b.score - a.score || (a.teamKey < b.teamKey ? -1 : 1))
}
