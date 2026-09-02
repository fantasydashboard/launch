import { ref } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useAuthStore } from '@/stores/auth'
import { usePlatformsStore } from '@/stores/platforms'
import type { Sport } from '@/types/supabase'

/**
 * Resolves THIS week's opponent for a points league — just the identity (team
 * key as the pool labels it, name, logo) plus the week number. The points
 * Matchup projects both rosters' weeks from the shared league pool, so unlike
 * the category useThisWeekMatchup this carries no stat lines.
 */
export interface ThisWeekOpponent {
  opponentKey: string // pool teamKey: full Yahoo team_key / `espn_{id}`
  opponentName: string
  opponentLogo: string
  week: number
}

export function useThisWeekOpponent() {
  const opponent = ref<ThisWeekOpponent | null>(null)
  const loading = ref(false)
  const loaded = ref(false)

  async function load() {
    const leagueStore = useLeagueStore()
    const leagueKey = leagueStore.activeLeagueId
    if (!leagueKey) return
    const requestedId = leagueKey
    const week = leagueStore.currentWeek
    if (!week) return
    loading.value = true
    opponent.value = null
    try {
      if (leagueStore.activePlatform === 'sleeper') {
        /*
         * Sleeper had no branch here at all, so a Sleeper league fell through to the Yahoo
         * path, found no yahooTeams, and returned with `opponent` still null — which the
         * view reads as "no matchup exists" and renders "weekly matchup for football is
         * coming soon". The screen was built the whole time; nothing was resolving an
         * opponent for it. Sleeper publishes pairings as soon as the schedule is set, so
         * this works from the moment a draft ends.
         *
         * Pairing is by `matchup_id`: the two roster entries sharing one are playing
         * each other. teamKey is the roster_id as a string, matching the league pool.
         */
        // Same helper the league pool uses, so `opponentKey` lands in the same
        // namespace as every pool teamKey (the roster_id as a string).
        const { sleeperMyTeamKey, buildSleeperTeamNames, buildSleeperTeamLogos } =
          await import('@/composables/useSleeperLeaguePool')
        const rosters = (leagueStore.rosters ?? []) as any[]
        const meKey = sleeperMyTeamKey(rosters as any, leagueStore.currentUserId)
        if (!meKey) return

        const { sleeperService } = await import('@/services/sleeper')
        const rows = await sleeperService.getMatchups(String(leagueKey), week)
        if (leagueStore.activeLeagueId !== requestedId) return

        const mine = (rows || []).find((m: any) => String(m.roster_id) === meKey)
        // A bye week (odd league size) has no matchup_id — correctly leaves opponent null.
        if (!mine || mine.matchup_id == null) return
        const oppRow = (rows || []).find(
          (m: any) => m.matchup_id === mine.matchup_id && String(m.roster_id) !== meKey,
        )
        if (!oppRow) return

        const oppKey = String(oppRow.roster_id)
        const names = buildSleeperTeamNames(rosters as any, (leagueStore.users ?? []) as any)
        const logos = buildSleeperTeamLogos(
          rosters as any,
          (leagueStore.users ?? []) as any,
          leagueStore.currentLeague as any,
        )
        opponent.value = {
          opponentKey: oppKey,
          opponentName: names[oppKey] || `Team ${oppKey}`,
          opponentLogo: logos[oppKey] || '',
          week,
        }
      } else if (leagueStore.activePlatform === 'espn') {
        const parts = String(leagueKey).split('_') // espn_{sport}_{id}_{season}
        if (parts.length < 4 || parts[0] !== 'espn') return
        const sport = parts[1] as Sport
        const espnId = parts[2]
        const season = parseInt(parts[3], 10)
        const { espnService } = await import('@/services/espn')
        const authStore = useAuthStore()
        const platformsStore = usePlatformsStore()
        if (authStore.user?.id) await espnService.initialize(authStore.user.id)
        const creds = platformsStore.getEspnCredentials()
        if (creds) espnService.setCredentials(creds.espn_s2, creds.swid)
        const myId = (await espnService.getMyTeam(sport, espnId, season))?.id ?? null
        if (leagueStore.activeLeagueId !== requestedId || myId == null) return
        const matchups = await espnService.getMatchups(sport, espnId, season, week)
        if (leagueStore.activeLeagueId !== requestedId) return
        const mine = (matchups || []).find((m: any) => m.homeTeamId === myId || m.awayTeamId === myId)
        if (!mine) return
        const iAmHome = mine.homeTeamId === myId
        const oppTeam = iAmHome ? mine.awayTeam : mine.homeTeam
        const oppId = iAmHome ? mine.awayTeamId : mine.homeTeamId
        if (!oppId) return
        opponent.value = {
          opponentKey: `espn_${oppId}`,
          opponentName: oppTeam?.name || 'Opponent',
          opponentLogo: (oppTeam as any)?.logo || '',
          week,
        }
      } else {
        const myKey = leagueStore.yahooTeams?.find((t: any) => t.is_my_team)?.team_key ?? null
        if (!myKey) return
        const { yahooService } = await import('@/services/yahoo')
        const matchups = await yahooService.getMatchups(String(leagueKey), week)
        if (leagueStore.activeLeagueId !== requestedId) return
        const mine = (matchups || []).find((m: any) => (m.teams || []).some((t: any) => t.team_key === myKey))
        if (!mine) return
        const opp = mine.teams.find((t: any) => t.team_key !== myKey)
        if (!opp) return
        opponent.value = {
          opponentKey: String(opp.team_key),
          opponentName: opp.name || 'Opponent',
          opponentLogo:
            opp.logo_url ||
            leagueStore.yahooTeams?.find((t: any) => t.team_key === opp.team_key)?.logo_url ||
            '',
          week,
        }
      }
      loaded.value = true
    } catch (e) {
      console.error('[useThisWeekOpponent] load failed', e)
      loaded.value = true
    } finally {
      if (leagueStore.activeLeagueId === requestedId) loading.value = false
    }
  }

  return { opponent, loading, loaded, load }
}
