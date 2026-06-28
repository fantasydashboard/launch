/**
 * Fetches the season's weekly matchup results (Yahoo + ESPN) and reduces them to
 * per-week WeekOutcomes that the trajectory engine turns into a standings race.
 * Defensive throughout — any fetch/parse failure yields empty outcomes so the
 * chart simply hides rather than breaking the page.
 */
import { ref } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useAuthStore } from '@/stores/auth'
import { usePlatformsStore } from '@/stores/platforms'
import { yahooService } from '@/services/yahoo'
import { espnService } from '@/services/espn'
import type { Sport } from '@/types/supabase'
import type { WeekOutcomes, Outcome } from '@/league/powerTrajectory'

function parseEspnKey(key: string): { sport: Sport; leagueId: string; season: number } | null {
  const parts = key.split('_')
  if (parts.length < 4 || parts[0] !== 'espn') return null
  return { sport: parts[1] as Sport, leagueId: parts[2], season: parseInt(parts[3], 10) }
}

export function usePowerTrajectory() {
  const outcomes = ref<WeekOutcomes[]>([])
  const currentWeek = ref(0)
  const weeksLeft = ref(0) // regular-season weeks remaining (incl. current); 0 = unknown
  const loading = ref(false)
  const loaded = ref(false)

  async function loadYahoo(leagueKey: string): Promise<WeekOutcomes[]> {
    const authStore = useAuthStore()
    if (authStore.user?.id) await yahooService.initialize(authStore.user.id)

    const leagueStore = useLeagueStore()
    let cw = Number(leagueStore.currentLeague?.current_week) || 0
    let sw = Number(leagueStore.currentLeague?.start_week) || 1
    let ew = Number(leagueStore.currentLeague?.end_week) || 0
    if (!cw || !ew) {
      const meta = await yahooService.getLeagueMetadata(leagueKey)
      cw = cw || meta.currentWeek
      sw = sw || meta.startWeek || 1
      ew = ew || meta.endWeek || 0
    }

    currentWeek.value = cw
    if (ew) weeksLeft.value = Math.max(1, ew - cw + 1)
    const weeks = Array.from({ length: Math.max(0, cw - sw + 1) }, (_, i) => sw + i)
    const perWeek = await Promise.all(
      weeks.map(async (week): Promise<WeekOutcomes | null> => {
        try {
          const matchups = await yahooService.getMatchups(leagueKey, week)
          const results: Record<string, Outcome> = {}
          for (const m of matchups) {
            if (m.is_playoffs || m.is_consolation) continue
            const teams = m.teams ?? []
            if (teams.length < 2) continue
            if (m.is_tied) {
              for (const t of teams) if (t.team_key) results[String(t.team_key)] = 'T'
            } else if (m.winner_team_key) {
              for (const t of teams) {
                if (!t.team_key) continue
                results[String(t.team_key)] = String(t.team_key) === String(m.winner_team_key) ? 'W' : 'L'
              }
            }
          }
          return Object.keys(results).length ? { week, results } : null
        } catch {
          return null
        }
      }),
    )
    return perWeek.filter((w): w is WeekOutcomes => w != null)
  }

  async function loadEspn(leagueKey: string): Promise<WeekOutcomes[]> {
    const parsed = parseEspnKey(leagueKey)
    if (!parsed) return []
    const { sport, leagueId, season } = parsed

    const authStore = useAuthStore()
    const platformsStore = usePlatformsStore()
    if (authStore.user?.id) await espnService.initialize(authStore.user.id)
    const creds = platformsStore.getEspnCredentials()
    if (creds) espnService.setCredentials(creds.espn_s2, creds.swid)

    const league = await espnService.getLeague(sport, leagueId, season)
    const cw = Number(league?.status?.currentMatchupPeriod) || Number(league?.currentMatchupPeriod) || 0
    if (!cw) return []

    currentWeek.value = cw
    const regSeason = Number(league?.settings?.regularSeasonMatchupPeriodCount) || 0
    if (regSeason) weeksLeft.value = Math.max(1, regSeason - cw + 1)
    const weeks = Array.from({ length: cw }, (_, i) => i + 1)
    const perWeek = await Promise.all(
      weeks.map(async (week): Promise<WeekOutcomes | null> => {
        try {
          const matchups = await espnService.getMatchups(sport, leagueId, season, week)
          const results: Record<string, Outcome> = {}
          for (const m of matchups) {
            if (!m.winner || m.winner === 'UNDECIDED') continue
            const home = `espn_${m.homeTeamId}`
            const away = `espn_${m.awayTeamId}`
            if (m.winner === 'TIE') {
              results[home] = 'T'
              results[away] = 'T'
            } else {
              results[home] = m.winner === 'HOME' ? 'W' : 'L'
              results[away] = m.winner === 'AWAY' ? 'W' : 'L'
            }
          }
          return Object.keys(results).length ? { week, results } : null
        } catch {
          return null
        }
      }),
    )
    return perWeek.filter((w): w is WeekOutcomes => w != null)
  }

  async function load() {
    const leagueStore = useLeagueStore()
    const leagueKey = leagueStore.activeLeagueId
    if (!leagueKey) return
    const requested = leagueKey
    loading.value = true
    try {
      const isEspn = leagueStore.activePlatform === 'espn'
      const result = isEspn ? await loadEspn(leagueKey) : await loadYahoo(leagueKey)
      if (leagueStore.activeLeagueId !== requested) return
      outcomes.value = result
      loaded.value = true
    } catch (e) {
      console.error('[usePowerTrajectory] load failed', e)
      outcomes.value = []
      loaded.value = true
    } finally {
      if (leagueStore.activeLeagueId === requested) loading.value = false
    }
  }

  return { outcomes, currentWeek, weeksLeft, loading, loaded, load }
}
