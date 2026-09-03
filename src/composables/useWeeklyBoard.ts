import { computed, onMounted, ref, watch, type ComputedRef, type Ref } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useActivePointsSource } from '@/composables/useActivePointsSource'
import { useFootballVor } from '@/composables/useFootballVor'
import { sleeperService } from '@/services/sleeper'
import { opponentMap } from '@/football/footballBye'
import { buildWeeklyBoard, type WeeklyBoard } from '@/football/weeklyBoard'
import { useThisWeekOpponent } from '@/composables/useThisWeekOpponent'
import { usePointsValue } from '@/composables/usePointsValue'
import { useSeasonOutlook } from '@/composables/useSeasonOutlook'
import { seasonStakes, type Stakes } from '@/myteam/seasonStakes'
import type { SleeperRoster } from '@/types/sleeper'

/**
 * The football "This Week" board: optimal weekly lineup vs the manager's set
 * lineup + streamers. `live` gates on the NFL state's season_type (regular/post);
 * offseason yields live=false and a null board (the view shows an empty state).
 */
export function useWeeklyBoard(): {
  board: ComputedRef<WeeklyBoard | null>
  live: Ref<boolean>
  currentWeek: Ref<number>
  hasCurrentLineup: ComputedRef<boolean>
  loading: ComputedRef<boolean>
  myTeamName: ComputedRef<string>
  myTeamLogo: ComputedRef<string>
  stakes: ComputedRef<Stakes | null>
  outlook: ComputedRef<ReturnType<typeof useSeasonOutlook>['outlook']['value']>
} {
  const leagueStore = useLeagueStore()
  const isFootball = computed(() => leagueStore.activeSport === 'football')
  const src = useActivePointsSource()
  const season = computed(() => '') // useFootballVor falls back to the Sleeper NFL state season

  const { vorByKey, loading: vorLoading } = useFootballVor({
    pool: src.pool,
    freeAgents: src.freeAgents,
    slots: src.rosterSlots,
    teams: src.leagueSize,
    season,
    enabled: isFootball,
  })

  /* This Week is now the Sunday page: the fantasy opponent belongs here, beside the lineup
     it is measured against, rather than on a separate tab computed from a different model. */
  const oppSvc = useThisWeekOpponent()

  const live = ref(false)
  const currentWeek = ref(0)
  const opponentByTeam = ref<Record<string, { opp: string; home: boolean }>>({})
  const scheduleLoading = ref(false)

  async function loadWeek() {
    if (!isFootball.value) { live.value = false; return }
    scheduleLoading.value = true
    try {
      const state = await sleeperService.getNflState()
      const st = String(state.season_type || '')
      live.value = st === 'regular' || st === 'post'
      currentWeek.value = Number(state.week) || 0
      opponentByTeam.value =
        live.value && currentWeek.value
          ? opponentMap(await sleeperService.getNflSchedule(state.season, currentWeek.value, st))
          : {}
    } catch (e) {
      console.error('[useWeeklyBoard] load failed', e)
      live.value = false
      opponentByTeam.value = {}
    } finally {
      scheduleLoading.value = false
    }
  }

  function init() {
    src.load()
    src.loadFreeAgents(200)
    loadWeek()
    oppSvc.load()
  }
  onMounted(init)
  watch(() => leagueStore.activeLeagueId, init)

  // The manager's set lineup comes from the Sleeper roster; ESPN/Yahoo football
  // leagues have no equivalent here, so the board falls back to "optimal only"
  // (no moves) and the view suppresses any already-optimal claim.
  const currentStarters = computed<string[]>(() => {
    const mine = (leagueStore.rosters as any as SleeperRoster[])?.find(
      (r) => String(r.roster_id) === src.myTeamKey.value,
    )
    return (mine?.starters ?? []).filter(Boolean)
  })
  const hasCurrentLineup = computed(() => currentStarters.value.length > 0)

  const board = computed<WeeklyBoard | null>(() => {
    if (!isFootball.value || !live.value || !src.myTeamKey.value || !Object.keys(vorByKey.value).length) return null
    return buildWeeklyBoard({
      pool: src.pool.value,
      vorByKey: vorByKey.value,
      slots: src.rosterSlots.value,
      myTeamKey: src.myTeamKey.value,
      currentStarters: currentStarters.value,
      freeAgents: src.freeAgents.value,
      opponentByTeam: opponentByTeam.value,
      oppTeamKey: oppSvc.opponent.value?.opponentKey,
      oppTeamName: oppSvc.opponent.value?.opponentName,
      oppTeamLogo: oppSvc.opponent.value?.opponentLogo,
      teamNames: src.teamNames.value,
    })
  })

  /*
   * Season context. This lived on the Matchup page and was stranded when that tab was hidden
   * for football — along with a 0-0 fix and football copy written for it days earlier. It
   * belongs beside the lineup: what a week is worth depends on where the season stands.
   */
  const { valueByKey } = usePointsValue({
    pool: src.pool,
    fgByKey: src.fgByKey,
    sport: computed(() => leagueStore.activeSport),
    season,
  })
  const { outlook } = useSeasonOutlook({
    pool: src.pool,
    valueByKey,
    rosterSlots: src.rosterSlots,
    myTeamKey: src.myTeamKey,
    teamMeta: src.teamMeta,
  })
  const stakes = computed<Stakes | null>(() => {
    const o = outlook.value
    if (!o) return null
    const leagueSize = new Set(src.pool.value.map((p) => p.teamKey)).size
    if (!leagueSize) return null
    return seasonStakes({
      rank: o.recordRank,
      leagueSize,
      weeksLeft: Math.max(0, leagueStore.playoffWeekStart - leagueStore.currentWeek),
      playoffSpots: Math.ceil(leagueSize / 2),
      // At 0-0 the rank is a tiebreak artifact; seasonStakes says so rather than inventing one.
      gamesPlayed: o.record.wins + o.record.losses + o.record.ties,
    })
  })

  const loading = computed(() => scheduleLoading.value || vorLoading.value || src.loading.value)

  return {
    board, live, currentWeek, hasCurrentLineup, loading,
    myTeamName: src.myTeamName, myTeamLogo: src.myTeamLogo,
    stakes, outlook,
  }
}
