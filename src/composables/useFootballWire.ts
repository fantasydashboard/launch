import { computed, type ComputedRef, type Ref } from 'vue'
import { buildFootballWire, type FootballWire } from '@/football/footballWire'
import { orderByRanking } from '@/draft/room/customRankings'
import { useCustomRankings } from '@/composables/useCustomRankings'
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
}): {
  wire: ComputedRef<FootballWire | null>
  loading: Ref<boolean>
  load: () => void
  /** Whose order each half of the board is in, for the surface to display. */
  rosSource: ComputedRef<string>
  weekSource: ComputedRef<string>
} {
  // Two lists, two clocks. Rest-of-season ranks drive best-available; this
  // week's ranks drive the streaming board. Selecting one never silently moves
  // the other.
  const rosRankings = useCustomRankings('ros')
  const weekRankings = useCustomRankings('week')
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
    const built = buildFootballWire({
      freeAgents: inputs.freeAgents.value,
      vorByKey: vorByKey.value,
      pool: inputs.pool.value,
      slots: inputs.slots.value,
      myTeamKey: inputs.myTeamKey.value,
    })

    // Order only — every number on these rows stays ours. Upgrades are left
    // alone deliberately: that list is ranked by what a swap is worth to your
    // lineup, which is a calculation rather than an opinion, and no ranking list
    // knows what you already have.
    const keyOf = (r: { player: { playerKey?: string; name: string } }) =>
      r.player.playerKey ?? `fa:${r.player.name}`
    const named = (r: { player: { playerKey?: string; name: string } }) => ({
      playerKey: keyOf(r), name: r.player.name,
    })

    const rosRanks = rosRankings.enabled.value
      ? rosRankings.match(built.bestAvailable.map(named)).rankByKey
      : {}
    const weekRanks = weekRankings.enabled.value
      ? weekRankings.match(built.thisWeek.map(named)).rankByKey
      : {}

    return {
      ...built,
      bestAvailable: orderByRanking(built.bestAvailable, rosRanks, keyOf),
      thisWeek: orderByRanking(built.thisWeek, weekRanks, keyOf),
    }
  })

  return {
    wire,
    loading,
    load,
    rosSource: rosRankings.sourceName,
    weekSource: weekRankings.sourceName,
  }
}
