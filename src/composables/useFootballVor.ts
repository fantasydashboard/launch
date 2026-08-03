import { computed, ref, watch, type Ref } from 'vue'
import { sleeperService } from '@/services/sleeper'
import { fetchSeasonProjectionStats, fetchWeekProjectionStats } from '@/services/footballProjections'
import {
  buildFootballProjectionsByKey,
  type ProjPlayer,
  type SleeperPlayerMeta,
} from '@/football/buildFootballProjections'
import { defaultWeights } from '@/myteam/pointsScoring'
import { buildFootballVor, buildFootballVorAudit, type PlayerVor, type VorAudit } from '@/football/footballVor'
import { tagOpportunity, type OppPlayer } from '@/football/footballOpportunity'
import { playingTeams, zeroByeWeek } from '@/football/footballBye'
import type { PointsPoolPlayer } from '@/myteam/pointsTeam'
import type { AvailablePlayer } from '@/players/types'

const WEEKLY_HORIZON = 4 // next N weeks for streamability

/**
 * Builds per-player football VOR (`vorByKey`) from season + next-N-week Sleeper
 * projections calibrated to the league's replacement level. Shared by the Wire
 * and Trades surfaces so both read the same currency. Gated to football.
 */
export function useFootballVor(inputs: {
  pool: Ref<PointsPoolPlayer[]>
  freeAgents: Ref<AvailablePlayer[]>
  slots: Ref<Record<string, number>>
  teams: Ref<number>
  season: Ref<string>
  enabled: Ref<boolean>
  weeklyHorizon?: number // weeks of weekly-VOR/streamability to fetch (default 4; 0 = ROS only)
}): { vorByKey: Ref<Record<string, PlayerVor>>; audit: Ref<VorAudit | null>; loading: Ref<boolean>; load: () => void } {
  const vorByKey = ref<Record<string, PlayerVor>>({})
  const audit = ref<VorAudit | null>(null)
  const loading = ref(false)

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
    if (!inputs.enabled.value || projPlayers.value.length === 0) { vorByKey.value = {}; audit.value = null; return }
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
      const oppPlayers: OppPlayer[] = []
      for (const [id, pl] of Object.entries(playersMap)) {
        const p = pl as any
        meta[id] = { name: p?.full_name || '', position: p?.position || '' }
        // Opportunity is tagged against the FULL NFL player universe (so a backup's
        // injured starter is found even if he isn't rostered/skill-position).
        oppPlayers.push({
          playerKey: id,
          proTeam: (p?.team ?? '').toUpperCase(),
          position: p?.position || '',
          depthChartOrder: p?.depth_chart_order ?? null,
          injuryStatus: p?.injury_status ?? null,
        })
      }
      const opportunityByKey = tagOpportunity(oppPlayers)
      const seasonProj = buildFootballProjectionsByKey(projPlayers.value, seasonStats, meta, scoring)
      const points: Record<string, number> = {}
      for (const [k, v] of Object.entries(seasonProj)) points[k] = v.points

      const horizon = inputs.weeklyHorizon ?? WEEKLY_HORIZON
      const weeks = Array.from({ length: horizon }, (_, i) => currentWeek + i)
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
          console.warn('[useFootballVor] weekly fetch failed for week', wk, e)
        }
      }

      // One shared input object for both — the audit reports the levels the engine
      // used because it is handed the very same inputs, so it cannot drift.
      const vorInput = {
        points,
        positionByKey: positionByKey.value,
        slots: inputs.slots.value,
        teams: inputs.teams.value,
        weekly: weekly.length ? weekly : undefined,
        opportunityByKey,
      }
      vorByKey.value = buildFootballVor(vorInput)
      audit.value = buildFootballVorAudit(vorInput)
    } catch (e) {
      console.error('[useFootballVor] load failed', e)
      vorByKey.value = {}
      audit.value = null
    } finally {
      loading.value = false
    }
  }

  watch([inputs.enabled, projPlayers, inputs.season], load, { immediate: true })

  return { vorByKey, audit, loading, load }
}
