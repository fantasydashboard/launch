import { ref } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useAuthStore } from '@/stores/auth'
import { usePlatformsStore } from '@/stores/platforms'
import { espnService } from '@/services/espn'
import type { Sport } from '@/types/supabase'
import type { StandingsEntryLike } from '@/recommendations/fromStandings'
import type { CategoryDef } from '@/recommendations/types'
import type { PoolPlayer, RosterPlayer } from '@/composables/useMyRoster'
import type { AvailablePlayer } from '@/players/types'
import { mapBreakdownToCategoryData } from '@/myteam/espn/mapStandings'
import { mapRostersToPool, mapRosterToPlayers } from '@/myteam/espn/mapRosters'
import { mapEspnFreeAgents } from '@/myteam/espn/mapFreeAgents'

/** Parse an ESPN league key `espn_{sport}_{leagueId}_{season}`. */
function parseEspnKey(key: string): { sport: Sport; leagueId: string; season: number } | null {
  const parts = key.split('_')
  if (parts.length < 4 || parts[0] !== 'espn') return null
  return { sport: parts[1] as Sport, leagueId: parts[2], season: parseInt(parts[3], 10) }
}

/**
 * Loads an ESPN H2H category league and exposes the platform-neutral base
 * inputs MyTeamView needs. `supported` is null until resolved, then true for
 * H2H_CATEGORY leagues and false otherwise. `myTeamId` is null when ESPN
 * credentials can't identify the user's team.
 */
export function useEspnCategoryTeamData() {
  const standings = ref<StandingsEntryLike[]>([])
  const categories = ref<CategoryDef[]>([])
  const cats = ref<{ statId: string; lowerIsBetter: boolean }[]>([])
  const myTeamId = ref<string | null>(null)
  const myOverallRank = ref(0)
  const pool = ref<PoolPlayer[]>([])
  const rosterPlayers = ref<RosterPlayer[]>([])
  const freeAgents = ref<AvailablePlayer[]>([])
  const supported = ref<boolean | null>(null)
  const loading = ref(false)
  const loaded = ref(false)

  function reset() {
    standings.value = []
    categories.value = []
    cats.value = []
    myTeamId.value = null
    myOverallRank.value = 0
    pool.value = []
    rosterPlayers.value = []
    freeAgents.value = []
    supported.value = null
    loaded.value = false
  }

  async function load() {
    const leagueStore = useLeagueStore()
    const authStore = useAuthStore()
    const platformsStore = usePlatformsStore()

    const leagueKey = leagueStore.activeLeagueId
    if (!leagueKey) return
    const parsed = parseEspnKey(leagueKey)
    if (!parsed) return
    const { sport, leagueId, season } = parsed
    const requestedId = leagueKey

    reset()
    loading.value = true
    try {
      if (authStore.user?.id) await espnService.initialize(authStore.user.id)
      const creds = platformsStore.getEspnCredentials()
      if (creds) espnService.setCredentials(creds.espn_s2, creds.swid)

      // Detect category league via scoringType; bail (supported=false) otherwise.
      const league = await espnService.getLeague(sport, leagueId, season)
      if (leagueStore.activeLeagueId !== requestedId) return
      if (!league || league.scoringType !== 'H2H_CATEGORY') {
        supported.value = false
        loaded.value = true
        return
      }
      supported.value = true

      const [breakdown, teams, myTeam] = await Promise.all([
        espnService.getCategoryStatsBreakdown(sport, leagueId, season),
        espnService.getTeamsWithRosters(sport, leagueId, season),
        espnService.getMyTeam(sport, leagueId, season),
      ])
      if (leagueStore.activeLeagueId !== requestedId) return

      const mapped = mapBreakdownToCategoryData(breakdown, teams)
      standings.value = mapped.standings
      categories.value = mapped.categories
      cats.value = mapped.cats
      pool.value = mapRostersToPool(teams)

      if (myTeam) {
        myTeamId.value = `espn_${myTeam.id}`
        const myTeamWithRoster = teams.find((t) => t.id === myTeam.id) ?? myTeam
        rosterPlayers.value = mapRosterToPlayers(myTeamWithRoster, sport)
        // Overall rank: position among teams by total category wins (desc).
        const totals = breakdown.teamTotalCategoryWins
        const ranked = [...teams]
          .map((t) => ({ key: `espn_${t.id}`, wins: totals.get(`espn_${t.id}`) ?? 0 }))
          .sort((a, b) => b.wins - a.wins)
        const idx = ranked.findIndex((r) => r.key === myTeamId.value)
        myOverallRank.value = idx >= 0 ? idx + 1 : 0
      }

      // Free agents for the inline "top add per weak category" line.
      const fa = await espnService.getFreeAgents(sport, leagueId, season, 150)
      if (leagueStore.activeLeagueId !== requestedId) return
      freeAgents.value = mapEspnFreeAgents(fa, sport)

      loaded.value = true
    } catch (e) {
      console.error('[useEspnCategoryTeamData] load failed', e)
      loaded.value = true
    } finally {
      if (leagueStore.activeLeagueId === requestedId) loading.value = false
    }
  }

  return {
    standings,
    categories,
    cats,
    myTeamId,
    myOverallRank,
    pool,
    rosterPlayers,
    freeAgents,
    supported,
    loading,
    loaded,
    load,
  }
}
