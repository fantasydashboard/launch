import { computed, type ComputedRef } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { resolveFootballScoring, type FootballScoringSource } from '@/football/footballScoring'

/** What to call the scoring on screen, so a fallback is never mistaken for the league's own. */
export function scoringLabel(source: FootballScoringSource): string {
  return source === 'default' ? 'standard scoring (full PPR)' : "your league's scoring"
}

/**
 * The active football league's scoring weights.
 *
 * No fetching, deliberately. Sleeper's settings already ride along on the league object, and
 * ESPN's and Yahoo's cannot be read at all — the shared normalisers for both are keyed to
 * BASEBALL stats and this repo has no football statId map, so `resolveFootballScoring` refuses
 * them outright. Fetching settings we would then discard unread is a round trip bought for
 * nothing.
 *
 * Separate from `useLeagueScoring`, which predates this, covers Yahoo and ESPN for the daily
 * sports, and falls back to `defaultWeights()` with NO argument — returning baseball weights.
 * Football opted out of it for exactly that reason (see usePointsValue.ts). Unifying the two
 * is a later job.
 */
export function useFootballScoring(): {
  weights: ComputedRef<Record<string, number>>
  source: ComputedRef<FootballScoringSource>
} {
  const leagueStore = useLeagueStore()
  const resolved = computed(() =>
    resolveFootballScoring({
      platform: leagueStore.activePlatform,
      sleeperScoringSettings: (leagueStore.currentLeague as any)?.scoring_settings,
    }),
  )
  return {
    weights: computed(() => resolved.value.weights),
    source: computed(() => resolved.value.source),
  }
}
