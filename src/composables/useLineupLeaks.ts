import { computed, type ComputedRef, type Ref } from 'vue'
import type { CatSpec } from '@/myteam/value'
import type { RosterPlayer } from '@/composables/useMyRoster'
import type { ThisWeekSnapshot } from '@/composables/useThisWeekMatchup'
import { detectLeaks, type LineupLeak } from '@/myteam/lineupLeaks/detectLeaks'
import { needWeightsFromSnapshot, type EligiblePlayer } from '@/myteam/lineupLeaks/positionalValue'

function toEligible(
  p: RosterPlayer,
  roleValueByKey: Map<string, number>,
  helpsByKey: Map<string, Set<string>>,
): EligiblePlayer {
  const eligible =
    p.eligiblePositions && p.eligiblePositions.length
      ? p.eligiblePositions
      : String(p.position).split(/[,/]/).map((s) => s.trim()).filter(Boolean)
  return {
    playerKey: p.playerKey,
    name: p.name,
    team: p.team ?? '',
    eligiblePositions: eligible,
    stats: p.stats ?? {},
    roleValue: roleValueByKey.get(p.playerKey) ?? 0,
    helpsCats: helpsByKey.get(p.playerKey),
    status: p.status,
  }
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
  // 0-100 roster-badge value per player key — Leaks ranks by this single model so
  // it never contradicts the roster ordering.
  roleValueByKey: Ref<Map<string, number>>
  // Per player, the categories shown green (a strength) on the roster row — the leak
  // cites only these, so it never calls a category a strength here that's red there.
  helpsByKey: Ref<Map<string, Set<string>>>
  // player keys Your Move already surfaces, so we don't double-flag them.
  excludeKeys?: Ref<Set<string>>
}): { leaks: ComputedRef<LineupLeak[]> } {
  const leaks = computed<LineupLeak[]>(() => {
    const snap = inputs.snapshot.value
    if (!snap) return []
    const rv = inputs.roleValueByKey.value
    const helps = inputs.helpsByKey.value
    const needWeights = needWeightsFromSnapshot(snap.categories)
    const starters = inputs.rosterPlayers.value.filter((p) => p.started === true).map((p) => toEligible(p, rv, helps))
    const bench = inputs.rosterPlayers.value.filter((p) => p.started === false).map((p) => toEligible(p, rv, helps))
    if (starters.length === 0 || bench.length === 0) return []
    return detectLeaks(starters, bench, [], inputs.catSpecs.value, needWeights, {
      excludeKeys: inputs.excludeKeys?.value,
    })
  })
  return { leaks }
}
