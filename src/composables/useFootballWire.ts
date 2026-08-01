import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import { sleeperService } from '@/services/sleeper'
import { fetchSeasonProjectionStats, fetchWeekProjectionStats } from '@/services/footballProjections'
import {
  buildFootballProjectionsByKey,
  type ProjPlayer,
  type SleeperPlayerMeta,
} from '@/football/buildFootballProjections'
import { defaultWeights } from '@/myteam/pointsScoring'
import { buildFootballVor, type PlayerVor } from '@/football/footballVor'
import { buildFootballWire, type FootballWire } from '@/football/footballWire'
import { playingTeams, zeroByeWeek } from '@/football/footballBye'
import type { PointsPoolPlayer } from '@/myteam/pointsTeam'
import type { AvailablePlayer } from '@/players/types'

const WEEKLY_HORIZON = 4 // next N weeks for streamability

/**
 * Orchestrates the football Wire: season + next-N-week Sleeper projections →
 * league-scored points → VOR (settings-derived replacement) → Wire model.
 * Gated to football; baseball callers never invoke it.
 */
export function useFootballWire(inputs: {
  pool: Ref<PointsPoolPlayer[]>
  freeAgents: Ref<AvailablePlayer[]>
  slots: Ref<Record<string, number>>
  myTeamKey: Ref<string>
  season: Ref<string>
  enabled: Ref<boolean>
}): { wire: ComputedRef<FootballWire | null>; loading: Ref<boolean>; load: () => void } {
  const vorByKey = ref<Record<string, PlayerVor>>({})
  const loading = ref(false)

  // All players (rostered + FA) as ProjPlayer, so projByKey covers the whole pool.
  const projPlayers = computed<ProjPlayer[]>(() => [
    ...inputs.pool.value.map((p) => ({ key: p.playerKey, name: p.name, position: p.position })),
    ...inputs.freeAgents.value.map((fa) => ({ key: fa.playerKey ?? `fa:${fa.name}`, name: fa.name, position: fa.position })),
  ])
  const positionByKey = computed<Record<string, string>>(() => {
    const out: Record<string, string> = {}
    for (const p of inputs.pool.value) out[p.playerKey] = p.position
    for (const fa of inputs.freeAgents.value) out[fa.playerKey ?? `fa:${fa.name}`] = fa.position
    return out
  })
  const proTeamByKey = computed<Record<string, string>>(() => {
    const out: Record<string, string> = {}
    for (const p of inputs.pool.value) out[p.playerKey] = (p.proTeam ?? '').toUpperCase()
    for (const fa of inputs.freeAgents.value) out[fa.playerKey ?? `fa:${fa.name}`] = (fa.team ?? '').toUpperCase()
    return out
  })

  async function load() {
    if (!inputs.enabled.value || projPlayers.value.length === 0) { vorByKey.value = {}; return }
    loading.value = true
    try {
      const state = await sleeperService.getNflState()
      const season = inputs.season.value || state.season
      const currentWeek = Number(state.week) || 1
      const scoring = defaultWeights('football')

      const [seasonStats, playersMap] = await Promise.all([
        fetchSeasonProjectionStats(season),
        sleeperService.getPlayers(),
      ])
      const meta: Record<string, SleeperPlayerMeta> = {}
      for (const [id, pl] of Object.entries(playersMap)) {
        meta[id] = { name: (pl as any)?.full_name || '', position: (pl as any)?.position || '' }
      }
      const seasonProj = buildFootballProjectionsByKey(projPlayers.value, seasonStats, meta, scoring)
      const points: Record<string, number> = {}
      for (const [k, v] of Object.entries(seasonProj)) points[k] = v.points

      // Next N weeks → per-key points, byes zeroed from the schedule. Defensive:
      // any weekly/schedule failure just drops that week from the streamability set.
      const weeks = Array.from({ length: WEEKLY_HORIZON }, (_, i) => currentWeek + i)
      const weekly: Record<string, number>[] = []
      for (const wk of weeks) {
        try {
          const [wkStats, sched] = await Promise.all([
            fetchWeekProjectionStats(season, wk),
            sleeperService.getNflSchedule(season, wk),
          ])
          const wkProj = buildFootballProjectionsByKey(projPlayers.value, wkStats, meta, scoring)
          const wkPoints: Record<string, number> = {}
          for (const [k, v] of Object.entries(wkProj)) wkPoints[k] = v.points
          weekly.push(zeroByeWeek(wkPoints, proTeamByKey.value, playingTeams(sched)))
        } catch (e) {
          console.warn('[useFootballWire] weekly fetch failed for week', wk, e)
        }
      }

      vorByKey.value = buildFootballVor({
        points,
        positionByKey: positionByKey.value,
        slots: inputs.slots.value,
        teams: new Set(inputs.pool.value.map((p) => p.teamKey)).size,
        weekly: weekly.length ? weekly : undefined,
      })
    } catch (e) {
      console.error('[useFootballWire] load failed', e)
      vorByKey.value = {}
    } finally {
      loading.value = false
    }
  }

  watch([inputs.enabled, projPlayers, inputs.season], load, { immediate: true })

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
