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

const WINNABLE_GAP = 1 // gapUp this small (tied or one win away) = eligible to attack
const MAX_WINNABLE = 3 // cap winnable on the few genuinely-close opportunities

/**
 * Per-category position + gap relative to the teams directly above/below me by
 * `perCategoryWins[statId]`. gapUp = wins needed to pass the team ranked above
 * (null if I'm 1st, 0 if tied); gapDown = my cushion over the team below (null if last).
 *
 * Winnable is assigned SELECTIVELY across the whole set, not per-category independently:
 *  - strong:   rank <= numTeams / 3 (top third), assigned first.
 *  - eligible-winnable: NON-strong, behind (gapUp !== null), gapUp <= 1, and not dead-last
 *      (rank === numTeams) unless tied (gapUp === 0). Sort eligible by gapUp asc then rank asc;
 *      take the top 3 → winnable.
 *  - of the remaining behind categories: lost if rank > numTeams * 2/3 (bottom third), else safe.
 */
export function computeCategoryGaps(
  standings: StandingRow[],
  profile: Profile,
  cats: CatSpec[],
): CategoryGap[] {
  const numTeams = profile.numTeams
  const topThird = numTeams / 3
  const bottomThird = (numTeams * 2) / 3

  // First pass: rank, gaps, and the base 'strong' classification.
  const base = cats.map((cat) => {
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

    const strong = rank <= topThird

    return { statId: cat.statId, rank, numTeams, gapUp, gapDown, strong }
  })

  // Select winnable across the whole non-strong, behind set.
  const eligible = base
    .filter((b) => {
      if (b.strong) return false
      if (b.gapUp === null) return false // 1st place (not behind)
      if (b.gapUp > WINNABLE_GAP) return false
      // dead-last only qualifies if tied
      if (b.rank === numTeams && b.gapUp !== 0) return false
      return true
    })
    .sort((a, b) => (a.gapUp! - b.gapUp!) || (a.rank - b.rank))

  const winnableSet = new Set(eligible.slice(0, MAX_WINNABLE).map((b) => b.statId))

  return base.map((b) => {
    let tier: CategoryGap['tier']
    if (b.strong) {
      tier = 'strong'
    } else if (winnableSet.has(b.statId)) {
      tier = 'winnable'
    } else if (b.rank > bottomThird) {
      tier = 'lost'
    } else {
      tier = 'safe'
    }
    return { statId: b.statId, rank: b.rank, numTeams: b.numTeams, tier, gapUp: b.gapUp, gapDown: b.gapDown }
  })
}
