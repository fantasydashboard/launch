import { computed, ref, watch, type Ref } from 'vue'
import { calibrateProjection } from '@/football/positionCalibration'
import { sleeperService } from '@/services/sleeper'
import { useLeagueStore } from '@/stores/league'
import { fetchSeasonProjectionStats, fetchWeekProjectionStats } from '@/services/footballProjections'
import { getSeasonLines } from '@/services/playerUsage'
import { buildRosPoints, forwardWeightFor, priorGamesFor } from '@/football/rosBlend'
import { rescoreObserved } from '@/football/observedPoints'
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
import { expectedGamesMissed, consecutiveMissed } from '@/football/availability'

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
  /**
   * The league's scoring weights. Absent means the football defaults, which is what every
   * caller got unconditionally before this existed.
   */
  scoring?: Ref<Record<string, number>>
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
  /* Bumped on every load() call and captured as `seq` at the top of each run, so a load that
     finishes after a newer one started can tell it is stale and skip its writes instead of
     overwriting the newer league's numbers with the older one's. */
  let loadSeq = 0

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
    /*
     * Bumped BEFORE the early return, not after. A load that clears the maps because the sport
     * switched off is still a load, and any older one still in flight has to be invalidated by
     * it. Incrementing only on the path that continues left the clear-to-empty case outside the
     * counter entirely, so a stale football load could resolve a moment later and put its board
     * back on a baseball league.
     */
    const seq = ++loadSeq
    if (!inputs.enabled.value || projPlayers.value.length === 0) { vorByKey.value = {}; audit.value = null; return }
    loading.value = true
    try {
      const state = await sleeperService.getNflState()
      const season = inputs.season.value || state.season
      const currentWeek = Number(state.week) || 1
      const scoring = inputs.scoring?.value ?? defaultWeights('football')

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
      /*
       * CALIBRATED ON THE WAY IN, so everything downstream runs on one honest scale: the blend,
       * VOR, the lineup totals the landscape ranks, the trade verdicts and the playoff odds that
       * come off those totals. Quarterbacks only, and four seasons say so — see
       * positionCalibration.ts. Applied to the PROJECTION, never to what a man actually scored.
       */
      const projectedByKey: Record<string, number> = {}
      for (const [k, v] of Object.entries(seasonProj)) {
        projectedByKey[k] = calibrateProjection(v.points, positionByKey.value[k])
      }

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
        for (const [k, v] of Object.entries(wkProj)) forwardRateByKey[k] = calibrateProjection(v.points, positionByKey.value[k])
      } catch { /* no forward week, no second opinion */ }

      /* How much that second opinion counts is position-specific: quarterback and tight end
         want it small, receiver large. rosBlend stays position-blind, so the map is built
         here, where the positions are. */
      const forwardWeightByKey: Record<string, number> = {}
      const priorGamesByKey: Record<string, number> = {}
      for (const p of projPlayers.value) {
        forwardWeightByKey[p.key] = forwardWeightFor(p.position)
        priorGamesByKey[p.key] = priorGamesFor(p.position)
      }

      /* The season so far, in the SAME currency as the forecast it is about to be blended
         with, and with touchdowns regressed to what each player's yardage implies. Both
         reasons are set out in observedPoints.ts. */
      const scoredLines = rescoreObserved(lines, scoring)

      /*
       * HOW MANY OF THE REMAINING GAMES HE IS EXPECTED TO MISS.
       *
       * Nothing upstream will tell us. The season projection is frozen at August, its `gp`
       * field is the constant 18.0 for every player including men on injured reserve, and the
       * weekly projection had a ruled-Out receiver at 15.8 points. So a hurt player kept a
       * healthy player's horizon, and a rest-of-season board ranked him accordingly.
       *
       * The designation alone is not enough — "Out" is a weekly flag that can mean one game or
       * ten — so the streak of games he has actually missed is counted from his own log and the
       * two are read together. See football/availability.ts for the measured table.
       */
      const playedByKey: Record<string, Set<number>> = {}
      for (const l of lines) {
        (playedByKey[l.playerKey] ??= new Set<number>()).add(l.week)
      }
      const expectedMissedByKey: Record<string, number> = {}
      const weeksLeft = Math.max(1, REGULAR_SEASON_WEEKS - Math.max(0, currentWeek - 1))
      for (const p of projPlayers.value) {
        const status = (playersMap as any)[p.key]?.injury_status ?? null
        const k = consecutiveMissed(playedByKey[p.key] ?? [], currentWeek, byeByKey[p.key] ?? null)
        const missed = expectedGamesMissed(status, k, weeksLeft)
        if (missed > 0) expectedMissedByKey[p.key] = missed
      }

      const ros = buildRosPoints({
        seasonProjection: projectedByKey, lines: scoredLines, currentWeek,
        byeWeekByKey: byeByKey, forwardRateByKey, forwardWeightByKey, priorGamesByKey,
        expectedMissedByKey,
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
      // Stale: a newer load started (a league switch, most likely) while this one was still
      // fetching. Its numbers belong to the league that was active when it started, not the
      // one on screen now — drop them rather than let them win the race by finishing last.
      if (seq !== loadSeq) return
      vorByKey.value = buildFootballVor(vorInput)
      audit.value = buildFootballVorAudit(vorInput)
    } catch (e) {
      console.error('[useFootballVor] load failed', e)
      if (seq !== loadSeq) return
      vorByKey.value = {}
      audit.value = null
    } finally {
      // Same reasoning: a stale load's completion must not flip the spinner off while the
      // newer load it was superseded by is still running.
      if (seq === loadSeq) loading.value = false
    }
  }

  /* Scoring is in here because it is an INPUT to every point total below, not a display
     preference. Without it, switching from a PPR league to a standard one leaves the first
     league's numbers on screen — correct-looking, and wrong. */
  watch(
    [inputs.enabled, projPlayers, inputs.season, () => inputs.scoring?.value],
    load,
    { immediate: true, deep: false },
  )

  return { vorByKey, audit, loading, load }
}
