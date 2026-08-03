import { computed, type ComputedRef, type Ref } from 'vue'
import { buildFootballWire, type FootballWire } from '@/football/footballWire'
import { useFootballVor } from './useFootballVor'
import type { PointsPoolPlayer } from '@/myteam/pointsTeam'
import type { AvailablePlayer } from '@/players/types'

/**
 * The football Wire view-model: builds per-player VOR (via useFootballVor) and
 * assembles the best-available / upgrades / this-week / board model. Gated to
 * football; baseball callers never invoke it.
 */
export function useFootballWire(inputs: {
  pool: Ref<PointsPoolPlayer[]>
  freeAgents: Ref<AvailablePlayer[]>
  slots: Ref<Record<string, number>>
  teams: Ref<number>
  myTeamKey: Ref<string>
  season: Ref<string>
  enabled: Ref<boolean>
}): { wire: ComputedRef<FootballWire | null>; loading: Ref<boolean>; load: () => void } {
  const { vorByKey, loading, load } = useFootballVor({
    pool: inputs.pool,
    freeAgents: inputs.freeAgents,
    slots: inputs.slots,
    teams: inputs.teams,
    season: inputs.season,
    enabled: inputs.enabled,
  })

  const wire = computed<FootballWire | null>(() => {
    if (!inputs.enabled.value || !inputs.myTeamKey.value || !Object.keys(vorByKey.value).length) return null
    return buildFootballWire({
      freeAgents: inputs.freeAgents.value,
      vorByKey: vorByKey.value,
      pool: inputs.pool.value,
      slots: inputs.slots.value,
      myTeamKey: inputs.myTeamKey.value,
    })
  })

  return { wire, loading, load }
}
