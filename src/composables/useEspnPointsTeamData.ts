import { ref } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useAuthStore } from '@/stores/auth'
import { usePlatformsStore } from '@/stores/platforms'
import { espnService } from '@/services/espn'
import type { Sport } from '@/types/supabase'
import type { PoolPlayer, RosterPlayer } from '@/composables/useMyRoster'
import type { AvailablePlayer } from '@/players/types'
import { mapRostersToPool, mapRosterToPlayers } from '@/myteam/espn/mapRosters'
import { mapEspnFreeAgents } from '@/myteam/espn/mapFreeAgents'
import { buildPlayerMatchers, type FGProjection, type StatcastData } from '@/services/projectionService'
import { parseRosterSlots } from '@/trades/rosterSlots'

/** Parse an ESPN league key `espn_{sport}_{leagueId}_{season}`. */
function parseEspnKey(key: string): { sport: Sport; leagueId: string; season: number } | null {
  const parts = key.split('_')
  if (parts.length < 4 || parts[0] !== 'espn') return null
  return { sport: parts[1] as Sport, leagueId: parts[2], season: parseInt(parts[3], 10) }
}

/**
 * ESPN team-data for a POINTS league. Mirrors useEspnCategoryTeamData's roster
 * loading (same mappers, FG matching, free agents, slot requirements) but skips
 * the category-wins breakdown — a points league has no per-category standings.
 * Projected-points standings are derived downstream from the pool, so this only
 * needs to surface the league-wide pool, FG map, my roster, and roster slots.
 *
 * `supported` resolves true for any ESPN points-style league (H2H_POINTS /
 * TOTAL_POINTS), false otherwise.
 */
export function useEspnPointsTeamData() {
  const pool = ref<PoolPlayer[]>([])
  const fgByKey = ref<Record<string, FGProjection | null>>({})
  const statcastByKey = ref<Record<string, StatcastData | null>>({})
  const rosterPlayers = ref<RosterPlayer[]>([])
  const freeAgents = ref<AvailablePlayer[]>([])
  const myTeamId = ref<string | null>(null)
  const myTeamName = ref<string>('')
  const myTeamLogo = ref<string>('')
  const myRecord = ref<string>('')
  const rosterSlots = ref<Record<string, number>>({})
  const playoffTeamCount = ref(0)
  const supported = ref<boolean | null>(null)
  const loading = ref(false)
  const loaded = ref(false)

  function reset() {
    pool.value = []
    fgByKey.value = {}
    statcastByKey.value = {}
    rosterPlayers.value = []
    freeAgents.value = []
    myTeamId.value = null
    rosterSlots.value = {}
    playoffTeamCount.value = 0
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

      const league = await espnService.getLeague(sport, leagueId, season)
      if (leagueStore.activeLeagueId !== requestedId) return
      const st = String(league?.scoringType || '').toUpperCase()
      // Anything that isn't category is a points-style league here (H2H_POINTS,
      // TOTAL_POINTS, and any other non-category scoring).
      if (!league || st === 'H2H_CATEGORY' || st === 'ROTO') {
        supported.value = false
        loaded.value = true
        return
      }
      supported.value = true
      rosterSlots.value = parseRosterSlots('espn', { rosterSettings: league.settings?.rosterSettings })
      playoffTeamCount.value = Number(league.settings?.playoffTeamCount) || 0

      const [teams, myTeam] = await Promise.all([
        espnService.getTeamsWithRosters(sport, leagueId, season),
        espnService.getMyTeam(sport, leagueId, season),
      ])
      if (leagueStore.activeLeagueId !== requestedId) return

      pool.value = mapRostersToPool(teams, sport)

      const { matchFG, matchStatcast } = await buildPlayerMatchers()
      if (leagueStore.activeLeagueId !== requestedId) return
      const fg: Record<string, FGProjection | null> = {}
      const sc: Record<string, StatcastData | null> = {}
      for (const t of teams) {
        for (const pl of t.roster ?? []) {
          fg[String(pl.playerId)] = matchFG({ full_name: pl.fullName, mlb_team: pl.proTeam })
          sc[String(pl.playerId)] = matchStatcast({ full_name: pl.fullName, mlb_team: pl.proTeam })
        }
      }
      fgByKey.value = fg
      statcastByKey.value = sc

      if (myTeam) {
        myTeamId.value = `espn_${myTeam.id}`
        const mine = teams.find((t) => t.id === myTeam.id) ?? myTeam
        rosterPlayers.value = mapRosterToPlayers(mine, sport)
        myTeamName.value = String((mine as any).name ?? (myTeam as any).name ?? '')
        myTeamLogo.value = String((mine as any).logo ?? (myTeam as any).logo ?? '')
        const rec = (mine as any).record?.overall ?? (myTeam as any).record?.overall
        if (rec && rec.wins != null) myRecord.value = `${rec.wins}-${rec.losses}${rec.ties ? `-${rec.ties}` : ''}`
      }

      const fa = await espnService.getFreeAgents(sport, leagueId, season, 1000)
      if (leagueStore.activeLeagueId !== requestedId) return
      freeAgents.value = mapEspnFreeAgents(fa, sport)

      loaded.value = true
    } catch (e) {
      console.error('[useEspnPointsTeamData] load failed', e)
      loaded.value = true
    } finally {
      if (leagueStore.activeLeagueId === requestedId) loading.value = false
    }
  }

  return {
    pool,
    fgByKey,
    statcastByKey,
    rosterPlayers,
    freeAgents,
    myTeamId,
    myTeamName,
    myTeamLogo,
    myRecord,
    rosterSlots,
    playoffTeamCount,
    supported,
    loading,
    loaded,
    load,
  }
}
