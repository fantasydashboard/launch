import { computed, ref, watch, type Ref } from 'vue'
import { sleeperService } from '@/services/sleeper'
import { useLeagueStore } from '@/stores/league'
import { fetchSeasonProjectionStats, fetchWeekProjectionStats } from '@/services/footballProjections'
import { getSeasonLines } from '@/services/playerUsage'
import { buildRosPoints } from '@/football/rosBlend'
import {
  buildFootballProjectionsByKey,
  type ProjPlayer,
  type SleeperPlayerMeta,
} from '@/football/buildFootballProjections'
import { defaultWeights } from '@/myteam/pointsScoring'
import { buildFootballVor, buildFootballVorAudit, type PlayerVor, type VorAudit } from '@/football/footballVor'
import { tagOpportunity, type OppPlayer } from '@/football/footballOpportunity'
import { playingTeams, zeroByeWeek, byeWeekByPlayer } from '@/football/footballBye'
import { byeWeeks } from '@/football/scheduleDifficulty'
import { getSeasonSchedule, REGULAR_SEASON_WEEKS } from '@/services/nflSchedule'
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
  /**
   * Whether `playerKey` is already a Sleeper player id.
   *
   * Normally answered by the active league's platform. The public rankings board has no
   * active league and builds its pool straight from Sleeper's player map, so it says so
   * outright rather than being told "no" by a store that has nothing to say.
   */
  keysAreSleeperIds?: Ref<boolean>
}): { vorByKey: Ref<Record<string, PlayerVor>>; audit: Ref<VorAudit | null>; loading: Ref<boolean>; load: () => void } {
  const leagueStore = useLeagueStore()
  /**
   * On Sleeper the playerKey IS the Sleeper id, so projections can be matched
   * exactly instead of by name. That is not just tidier: team defenses have no
   * name at all in Sleeper's data, so name matching silently dropped every
   * defense from the board.
   */
  const keysAreSleeperIds = computed(
    () => inputs.keysAreSleeperIds?.value ?? leagueStore.activePlatform === 'sleeper',
  )

  const vorByKey = ref<Record<string, PlayerVor>>({})
  const audit = ref<VorAudit | null>(null)
  const loading = ref(false)

  const projPlayers = computed<ProjPlayer[]>(() => {
    const sid = keysAreSleeperIds.value
    return [
      ...inputs.pool.value.map((p) => ({
        key: p.playerKey, name: p.name, position: p.position,
        ...(sid ? { sleeperId: p.playerKey } : {}),
      })),
      ...inputs.freeAgents.value.map((fa) => {
        const key = fa.playerKey ?? `fa:${fa.name}`
        return { key, name: fa.name, position: fa.position, ...(sid ? { sleeperId: key } : {}) }
      }),
    ]
  })
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
      const projectedByKey: Record<string, number> = {}
      for (const [k, v] of Object.entries(seasonProj)) projectedByKey[k] = v.points

      /*
       * Update the forecast with the season so far, rather than shipping it untouched.
       *
       * Sleeper's season projection does not converge — the same number in week fourteen as in
       * week one — so a rest-of-season board built on it alone cannot learn. It was also a
       * FULL-season figure serving as a REST-of-season one, counting games already played as
       * points still to win. buildRosPoints fixes both: it shrinks toward the forecast rather
       * than chasing a two-game sample, and returns what is left rather than the whole year.
       *
       * A failed fetch leaves `lines` empty, which returns the prior scaled to the games that
       * remain — strictly better than what we had, and never worse.
       */
      let lines: Awaited<ReturnType<typeof getSeasonLines>> = []
      try { lines = await getSeasonLines(season, currentWeek) } catch { /* prior alone */ }

      /* Games remaining, not weeks remaining — a player whose bye is still ahead plays one
         fewer of them. An unreadable schedule yields an empty map, which the blend treats as
         "unknown" and leaves every player exactly where he was. */
      let byeByKey: Record<string, number | null> = {}
      try {
        const schedule = await getSeasonSchedule(Number(season))
        byeByKey = byeWeekByPlayer(byeWeeks(schedule, REGULAR_SEASON_WEEKS), proTeamByKey.value)
      } catch { /* no schedule, no adjustment */ }

      /*
       * A second opinion that updates. Everything feeding the blend above descends from a
       * preseason forecast frozen in August, so the only thing that could move a player was his
       * own box scores. Sleeper's projection for the UPCOMING week already reflects the depth
       * chart, the injury and the role, and rosBlend averages its rate in. A failed fetch leaves
       * the map empty, which changes nothing.
       */
      let forwardRateByKey: Record<string, number> = {}
      try {
        const wkStats = await fetchWeekProjectionStats(season, currentWeek)
        const wkProj = buildFootballProjectionsByKey(projPlayers.value, wkStats, meta, scoring)
        for (const [k, v] of Object.entries(wkProj)) forwardRateByKey[k] = v.points
      } catch { /* no forward week, no second opinion */ }

      const ros = buildRosPoints({
        seasonProjection: projectedByKey, lines, currentWeek,
        byeWeekByKey: byeByKey, forwardRateByKey,
      })
      const points: Record<string, number> = {}
      for (const [k, v] of Object.entries(ros)) points[k] = v.pointsRos

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
