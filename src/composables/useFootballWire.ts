import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import { buildFootballWire, type FootballWire } from '@/football/footballWire'
import { applyRankingOrder } from '@/draft/room/customRankings'
import { useCustomRankings } from '@/composables/useCustomRankings'
import { useFootballVor } from './useFootballVor'
import { sleeperService } from '@/services/sleeper'
import { playingTeams as playingTeamsOf } from '@/football/footballBye'
import type { PlayerVor } from '@/football/footballVor'
import type { PointsPoolPlayer } from '@/myteam/pointsTeam'
import type { AvailablePlayer } from '@/players/types'

/**
 * Re-seat rest-of-season value onto a ranking list's order, keeping our own value curve.
 *
 * POINTS are what move. Re-seating vorRos alone looks right on every screen that prints a
 * VOR number and reaches nothing: the lineup-marginal math behind the add/drop verdict runs
 * on pointsRos, so an analyst's order would have re-sorted the cards and left the actual
 * recommendation on our own numbers — the precise failure this change exists to fix, which
 * the first version of it reintroduced.
 *
 * VOR is then derived rather than re-seated separately. `pointsRos - vorRos` is the
 * position's replacement level, a constant we already computed, so recomputing VOR from the
 * new points against the same level keeps the two fields telling one story.
 *
 * Exported so this is testable directly, without standing up the whole composable.
 */
export function reseatRos(
  base: Record<string, PlayerVor>,
  rankByKey: Record<string, number>,
): Record<string, PlayerVor> {
  if (!Object.keys(base).length || !Object.keys(rankByKey).length) return base
  const reseated = applyRankingOrder(
    Object.entries(base).map(([k, v]) => ({ playerKey: k, value: v.pointsRos })),
    rankByKey,
  )
  const out: Record<string, PlayerVor> = {}
  for (const [k, v] of Object.entries(base)) {
    const pointsRos = reseated[k] ?? v.pointsRos
    out[k] = { ...v, pointsRos, vorRos: pointsRos - (v.pointsRos - v.vorRos) }
  }
  return out
}

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
  /** Whose order the board is in, for the surface to display. */
  rosSource: ComputedRef<string>
} {
  /*
   * The Wire runs on one clock — rest of season. The weekly list used to be read here too,
   * back when the streamer block lived on this page; it moved to This Week, so reading it
   * here would be selecting a list that changes nothing.
   */
  const rosRankings = useCustomRankings('ros')
  const { vorByKey: rawVor, loading, load } = useFootballVor({
    pool: inputs.pool,
    freeAgents: inputs.freeAgents,
    slots: inputs.slots,
    teams: inputs.teams,
    season: inputs.season,
    enabled: inputs.enabled,
  })

  /* This week's NFL schedule, so a rest-of-season board can still warn that a body is idle
     on Sunday. Empty until it loads (and if it fails), which reads as "unknown" rather than
     as 32 byes. */
  const playingTeams = ref<Set<string>>(new Set())
  async function loadSchedule() {
    if (!inputs.enabled.value) return
    try {
      const state = await sleeperService.getNflState()
      const week = Number(state.week) || 0
      if (!week) return
      const games = await sleeperService.getNflSchedule(state.season, week, String(state.season_type || 'regular'))
      playingTeams.value = playingTeamsOf(games)
    } catch {
      playingTeams.value = new Set()
    }
  }
  watch(inputs.enabled, loadSchedule, { immediate: true })

  const nameByKey = computed(() => {
    const m = new Map<string, string>()
    for (const p of inputs.pool.value) m.set(p.playerKey, p.name)
    for (const fa of inputs.freeAgents.value) m.set(fa.playerKey ?? `fa:${fa.name}`, fa.name)
    return m
  })

  /*
   * An active list re-seats rest-of-season value BEFORE the wire is built, rather than
   * re-sorting one list after the fact.
   *
   * It used to do the latter: Best Available came back in the analyst's order while the full
   * board, its tier cliffs and every add/drop verdict stayed on our own order. Uploading a
   * list you trusted moved one card on the page and left the rest arguing with it, which is
   * the "whose ranking am I looking at?" failure the picker exists to prevent.
   *
   * Re-seating at the source is the same move This Week makes with a weekly list. It also
   * reaches the upgrades, which the old code deliberately spared on the grounds that a swap's
   * worth is a calculation rather than an opinion — true, and untouched: the calculation still
   * runs, it just runs on the values you said to trust. An analyst's order that cannot change
   * what you are told to add is not being used for anything.
   */
  const vorByKey = computed(() => {
    if (!rosRankings.enabled.value) return rawVor.value
    const named = Object.keys(rawVor.value).map((k) => ({
      playerKey: k, name: nameByKey.value.get(k) ?? '',
    }))
    return reseatRos(rawVor.value, rosRankings.match(named).rankByKey)
  })

  const wire = computed<FootballWire | null>(() => {
    if (!inputs.enabled.value || !inputs.myTeamKey.value || !Object.keys(vorByKey.value).length) return null
    return buildFootballWire({
      freeAgents: inputs.freeAgents.value,
      vorByKey: vorByKey.value,
      pool: inputs.pool.value,
      slots: inputs.slots.value,
      myTeamKey: inputs.myTeamKey.value,
      playingTeams: playingTeams.value,
    })
  })

  return { wire, loading, load, rosSource: rosRankings.sourceName }
}
