import type { CategoryGap } from './types'

interface StandingRow {
  team: { teamId: string }
  perCategoryWins?: Record<string, number>
}

interface Profile {
  teamId: string
  numTeams: number
  categories: { statId: string; rank: number }[]
}

interface CatSpec {
  statId: string
  lowerIsBetter: boolean
}

const WINNABLE_GAP = 2 // gapUp this small (and not already strong) = worth attacking
const LOST_GAP = 3 // bottom-third AND gapUp larger than this = punt candidate

/**
 * Per-category position + gap relative to the teams directly above/below me by
 * `perCategoryWins[statId]`. gapUp = wins needed to pass the team ranked above
 * (null if I'm 1st); gapDown = my cushion over the team below (null if last).
 *
 * Tier:
 *  - strong:   rank <= numTeams / 3 (top third)
 *  - winnable: not strong and gapUp is small (<= WINNABLE_GAP)
 *  - lost:     bottom third (rank > numTeams * 2/3) and gapUp is large (> LOST_GAP)
 *  - safe:     otherwise
 */
export function computeCategoryGaps(
  standings: StandingRow[],
  profile: Profile,
  cats: CatSpec[],
): CategoryGap[] {
  const numTeams = profile.numTeams
  const topThird = numTeams / 3
  const bottomThird = (numTeams * 2) / 3

  return cats.map((cat) => {
    const rank = profile.categories.find((c) => c.statId === cat.statId)?.rank ?? numTeams

    // Sort teams by per-category wins, best first. Higher wins = better rank.
    const sorted = [...standings]
      .map((row) => ({ teamId: row.team.teamId, wins: row.perCategoryWins?.[cat.statId] ?? 0 }))
      .sort((a, b) => b.wins - a.wins)

    const myIdx = sorted.findIndex((s) => s.teamId === profile.teamId)
    const myWins = myIdx >= 0 ? sorted[myIdx].wins : 0

    let gapUp: number | null = null
    let gapDown: number | null = null
    if (myIdx > 0) gapUp = sorted[myIdx - 1].wins - myWins
    if (myIdx >= 0 && myIdx < sorted.length - 1) gapDown = myWins - sorted[myIdx + 1].wins

    let tier: CategoryGap['tier']
    if (rank <= topThird) {
      tier = 'strong'
    } else if (gapUp !== null && gapUp <= WINNABLE_GAP) {
      tier = 'winnable'
    } else if (rank > bottomThird && gapUp !== null && gapUp > LOST_GAP) {
      tier = 'lost'
    } else {
      tier = 'safe'
    }

    return { statId: cat.statId, rank, numTeams, tier, gapUp, gapDown }
  })
}
