// Shared cache so social templates can read the real chart data
// that CategoryMatchupsView already computed from ESPN daily stats.
// Usage:
//   CategoryMatchupsView: import { matchupChartCache } from '@/stores/matchupChartCache'
//                         matchupChartCache.set(matchupId, d1, d2, labels, team1WinProb, team2WinProb)
//   SocialTemplatesView:  import { matchupChartCache } from '@/stores/matchupChartCache'
//                         const entry = matchupChartCache.get(matchupId)

import { reactive } from 'vue'

interface CachedMatchup {
  d1: number[]
  d2: number[]
  labels: string[]
  team1WinProb: number
  team2WinProb: number
  team1Logo: string
  team2Logo: string
  updatedAt: number
}

const cache = reactive<Map<string | number, CachedMatchup>>(new Map())

// Also track all matchups from the current week so social graphic can list them
const currentWeekMatchups = reactive<Array<{
  matchupId: string | number
  team1Name: string
  team2Name: string
  team1Logo: string
  team2Logo: string
  team1WinProb: number
  team2WinProb: number
}>>([])

export const matchupChartCache = {
  set(
    matchupId: string | number,
    d1: number[],
    d2: number[],
    labels: string[],
    team1WinProb: number,
    team2WinProb: number,
    team1Logo = '',
    team2Logo = ''
  ) {
    cache.set(matchupId, { d1: [...d1], d2: [...d2], labels: [...labels], team1WinProb, team2WinProb, team1Logo, team2Logo, updatedAt: Date.now() })
  },

  get(matchupId: string | number): CachedMatchup | undefined {
    return cache.get(matchupId)
  },

  setWeekMatchups(matchups: typeof currentWeekMatchups) {
    currentWeekMatchups.splice(0, currentWeekMatchups.length, ...matchups)
  },

  getWeekMatchups() {
    return currentWeekMatchups
  },

  hasData() {
    return cache.size > 0
  }
}
