import { ref } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { buildPlayerMatchers, type FGProjection } from '@/services/projectionService'

/**
 * The league-wide rostered pool for a Yahoo category league, assembled from one
 * LIGHT `getRoster(teamKey)` call per team plus FanGraphs rest-of-season
 * projections — instead of the single heavy, rate-limit-prone
 * `getAllRosteredPlayers` (which chunks per-player stat fetches and frequently
 * returns empty under throttling, leaving standings-dependent pages stuck).
 *
 * Each pool player carries no raw stats; their projection comes from `fgByKey`
 * (matched by name + MLB team). Consumers run this through the same
 * `toEffectiveStats` / `mapFgStatsByKey` pipeline, which prefers the FG
 * projection when present — so the pool's category totals are ROS-based, exactly
 * what the season-long Wire scores on.
 */
export interface LeaguePoolPlayer {
  playerKey: string
  name: string
  position: string
  teamKey: string // owning fantasy team_key (matches a team's team_key)
  proTeam: string // MLB team abbr
  stats: Record<string, number> // empty; the FG projection in fgByKey drives totals
}

export function useYahooLeaguePool() {
  const leagueStore = useLeagueStore()
  const pool = ref<LeaguePoolPlayer[]>([])
  const fgByKey = ref<Record<string, FGProjection | null>>({})
  const loading = ref(false)
  const loaded = ref(false)

  async function load() {
    if (loading.value) return
    const teams = (leagueStore.yahooTeams ?? []).filter((t: any) => t?.team_key)
    if (!teams.length) return
    loading.value = true
    try {
      const { yahooService } = await import('@/services/yahoo')
      const { matchFG } = await buildPlayerMatchers()

      // One light roster call per team, in parallel; a single team failing just
      // drops that team's players rather than failing the whole pool.
      const rosters = await Promise.all(
        teams.map(async (t: any) => {
          const teamKey = String(t.team_key)
          try {
            const roster = await yahooService.getRoster(teamKey)
            return roster.map((p: any) => ({ teamKey, p }))
          } catch {
            return [] as { teamKey: string; p: any }[]
          }
        }),
      )

      const rows = rosters.flat()
      if (!rows.length) return // keep any previously-loaded pool rather than blanking it

      const nextPool: LeaguePoolPlayer[] = []
      const nextFg: Record<string, FGProjection | null> = {}
      for (const { teamKey, p } of rows) {
        const playerKey = String(p?.player_key ?? p?.player_id ?? '')
        if (!playerKey) continue
        const name = String(p?.name?.full ?? '')
        const proTeam = String(p?.team_abbr ?? '')
        nextPool.push({ playerKey, name, position: String(p?.position ?? ''), teamKey, proTeam, stats: {} })
        nextFg[playerKey] = matchFG({ full_name: name, mlb_team: proTeam })
      }
      pool.value = nextPool
      fgByKey.value = nextFg
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  return { pool, fgByKey, loading, loaded, load }
}
