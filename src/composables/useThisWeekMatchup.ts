import { ref } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useAuthStore } from '@/stores/auth'
import { usePlatformsStore } from '@/stores/platforms'
import { calcOverallWinProb, calcCatWinProb, bucketCategory, type CatStatus } from '@/services/categoryWinProbability'
import type { Sport } from '@/types/supabase'

export interface SnapshotCategory { statId: string; label: string; status: CatStatus; myWinPct: number }
export interface ThisWeekSnapshot {
  opponentName: string
  myWinPct: number
  projWins: number; projLosses: number; projTies: number
  daysRemaining: number
  completed: boolean
  categories: SnapshotCategory[]
}

// Days left until the end of the standard fantasy week (Sun). Snapshot-grade
// approximation; the full Matchup view has exact per-week dates.
function daysUntilWeekEnd(): number {
  const dow = new Date().getDay() // 0 = Sun
  return dow === 0 ? 0 : 7 - dow
}

export function useThisWeekMatchup() {
  const snapshot = ref<ThisWeekSnapshot | null>(null)
  const loading = ref(false)
  const loaded = ref(false)

  async function load(catSpecs: { statId: string; label: string }[]) {
    const leagueStore = useLeagueStore()
    const leagueKey = leagueStore.activeLeagueId
    if (!leagueKey) return
    const requestedId = leagueKey
    const platform: 'yahoo' | 'espn' = leagueStore.activePlatform === 'espn' ? 'espn' : 'yahoo'
    if (leagueStore.activePlatform === 'sleeper') return
    loading.value = true
    snapshot.value = null
    try {
      const catIds = catSpecs.map((c) => c.statId)
      const labelByStat = new Map(catSpecs.map((c) => [c.statId, c.label]))
      let myStats: Record<string, number> = {}
      let oppStats: Record<string, number> = {}
      let opponentName = ''

      if (platform === 'yahoo') {
        const week = leagueStore.currentWeek
        if (!week) return
        const { yahooService } = await import('@/services/yahoo')
        const matchups = await yahooService.getCategoryMatchups(String(leagueKey), week)
        if (leagueStore.activeLeagueId !== requestedId) return
        // The parsed teams carry team_key + name + stats (string values), but not
        // is_my_team; resolve my team key via the store's yahooTeams (same source
        // CategoryMatchupsView uses to flag is_my_team on each matchup team).
        const myKey = leagueStore.yahooTeams?.find((t: any) => t.is_my_team)?.team_key ?? null
        if (!myKey) return
        const mine = (matchups || []).find((m: any) =>
          (m.teams || []).some((t: any) => t.team_key === myKey),
        )
        if (!mine) return
        const me = mine.teams.find((t: any) => t.team_key === myKey)
        const opp = mine.teams.find((t: any) => t.team_key !== myKey)
        if (!me || !opp) return
        const toNum = (stats: Record<string, string> | undefined): Record<string, number> => {
          const out: Record<string, number> = {}
          for (const [k, v] of Object.entries(stats || {})) out[k] = parseFloat(String(v)) || 0
          return out
        }
        myStats = toNum(me.stats)
        oppStats = toNum(opp.stats)
        opponentName = opp.name || 'Opponent'
      } else {
        const parts = String(leagueKey).split('_') // espn_{sport}_{id}_{season}
        if (parts.length < 4 || parts[0] !== 'espn') return
        const sport = parts[1] as Sport
        const espnId = parts[2]
        const season = parseInt(parts[3], 10)
        const week = leagueStore.currentWeek
        if (!week) return
        const { espnService } = await import('@/services/espn')
        // Same init pattern as useEspnCategoryTeamData: initialize then set the
        // stored SWID/espn_s2 credentials so getMyTeam can identify the user.
        const authStore = useAuthStore()
        const platformsStore = usePlatformsStore()
        if (authStore.user?.id) await espnService.initialize(authStore.user.id)
        const creds = platformsStore.getEspnCredentials()
        if (creds) espnService.setCredentials(creds.espn_s2, creds.swid)

        const myNumericId = (await espnService.getMyTeam(sport, espnId, season))?.id ?? null
        if (leagueStore.activeLeagueId !== requestedId) return
        if (myNumericId == null) return
        const matchups = await espnService.getMatchups(sport, espnId, season, week)
        if (leagueStore.activeLeagueId !== requestedId) return
        const mine = (matchups || []).find(
          (m: any) => m.homeTeamId === myNumericId || m.awayTeamId === myNumericId,
        )
        if (!mine) return
        const iAmHome = mine.homeTeamId === myNumericId
        const myBy = iAmHome ? mine.homeScoreByStat : mine.awayScoreByStat
        const oppBy = iAmHome ? mine.awayScoreByStat : mine.homeScoreByStat
        const flat = (by: Record<string, { score: number }> | undefined): Record<string, number> =>
          Object.fromEntries(Object.entries(by || {}).map(([k, v]) => [k, v?.score ?? 0]))
        myStats = flat(myBy)
        oppStats = flat(oppBy)
        const oppTeam = iAmHome ? mine.awayTeam : mine.homeTeam
        opponentName = oppTeam?.name || 'Opponent'
      }

      const days = daysUntilWeekEnd()
      const overall = calcOverallWinProb(myStats, oppStats, catIds, days, platform)
      const categories: SnapshotCategory[] = catIds.map((statId) => {
        const p = calcCatWinProb(myStats[statId] || 0, oppStats[statId] || 0, statId, days, platform)
        return { statId, label: labelByStat.get(statId) || statId, status: bucketCategory(p.team1), myWinPct: Math.round(p.team1) }
      })
      if (leagueStore.activeLeagueId !== requestedId) return
      snapshot.value = {
        opponentName,
        myWinPct: Math.round(overall.team1),
        projWins: Math.round(overall.avgT1Cats),
        projLosses: Math.round(overall.avgT2Cats),
        projTies: Math.max(0, catIds.length - Math.round(overall.avgT1Cats) - Math.round(overall.avgT2Cats)),
        daysRemaining: days,
        completed: days <= 0,
        categories,
      }
      loaded.value = true
    } catch (e) {
      console.error('[useThisWeekMatchup] load failed', e)
      loaded.value = true
    } finally {
      if (leagueStore.activeLeagueId === requestedId) loading.value = false
    }
  }

  return { snapshot, loading, loaded, load }
}
