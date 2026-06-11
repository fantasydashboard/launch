import { computed, type ComputedRef, type Ref } from 'vue'
import type { CatSpec } from '@/myteam/value'
import type { RosterPlayer } from '@/composables/useMyRoster'
import type { ThisWeekSnapshot } from '@/composables/useThisWeekMatchup'
import { detectLeaks, type LineupLeak } from '@/myteam/lineupLeaks/detectLeaks'
import { needWeightsFromSnapshot, type EligiblePlayer } from '@/myteam/lineupLeaks/positionalValue'

function toEligible(p: RosterPlayer): EligiblePlayer {
  const eligible =
    p.eligiblePositions && p.eligiblePositions.length
      ? p.eligiblePositions
      : String(p.position).split(/[,/]/).map((s) => s.trim()).filter(Boolean)
  return { playerKey: p.playerKey, name: p.name, team: p.team ?? '', eligiblePositions: eligible, stats: p.stats ?? {}, status: p.status }
}

/**
 * "Lineup Leaks": started hitters who are materially weaker, for the team's needs,
 * than a better eligible player sitting on the bench. v1 is bench-only (a free
 * start/sit), so it complements Your Move's adds/streams rather than duplicating
 * them, and it only fires where the lineup carries a real started/bench split
 * (Yahoo today; ESPN once its started flag is plumbed).
 */
export function useLineupLeaks(inputs: {
  rosterPlayers: Ref<RosterPlayer[]>
  catSpecs: Ref<CatSpec[]>
  snapshot: Ref<ThisWeekSnapshot | null>
  // player keys Your Move already surfaces, so we don't double-flag them.
  excludeKeys?: Ref<Set<string>>
}): { leaks: ComputedRef<LineupLeak[]> } {
  const leaks = computed<LineupLeak[]>(() => {
    const snap = inputs.snapshot.value
    if (!snap) return []
    const needWeights = needWeightsFromSnapshot(snap.categories)
    const starters = inputs.rosterPlayers.value.filter((p) => p.started === true).map(toEligible)
    const bench = inputs.rosterPlayers.value.filter((p) => p.started === false).map(toEligible)
    if (starters.length === 0 || bench.length === 0) return []
    return detectLeaks(starters, bench, [], inputs.catSpecs.value, needWeights, {
      materiality: 0.5,
      excludeKeys: inputs.excludeKeys?.value,
    })
  })
  return { leaks }
}
