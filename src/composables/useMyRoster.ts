import { ref } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { buildPlayerMatchers, type FGProjection } from '@/services/projectionService'

/** A rostered player on the logged-in user's team, normalized from the Yahoo service shape. */
export interface RosterPlayer {
  playerKey: string
  name: string
  position: string
  team: string // MLB team abbr
  headshot?: string
  status?: string // injury/IL status, '' if healthy
  totalPoints: number
  stats: Record<string, number> // keyed by Yahoo stat_id (season totals)
}

function normalizeRosterPlayer(raw: any): RosterPlayer {
  return {
    playerKey: String(raw.player_key ?? raw.player_id ?? ''),
    name: String(raw.full_name ?? ''),
    position: String(raw.position ?? ''),
    team: String(raw.mlb_team ?? ''),
    headshot: raw.headshot ? String(raw.headshot) : undefined,
    status: raw.status ? String(raw.status) : '',
    totalPoints: typeof raw.total_points === 'number' ? raw.total_points : Number(raw.total_points) || 0,
    stats: raw.stats && typeof raw.stats === 'object' ? { ...raw.stats } : {},
  }
}

/** A rostered player anywhere in the league, normalized to the minimum the
 * contribution engine needs (playerKey + position + season-total stats). */
export interface PoolPlayer {
  playerKey: string
  position: string
  stats: Record<string, number>
}

function normalizePoolPlayer(raw: any): PoolPlayer {
  return {
    playerKey: String(raw.player_key ?? raw.player_id ?? ''),
    position: String(raw.position ?? ''),
    stats: raw.stats && typeof raw.stats === 'object' ? { ...raw.stats } : {},
  }
}

export function useMyRoster() {
  const players = ref<RosterPlayer[]>([])
  const pool = ref<PoolPlayer[]>([])
  const fgByKey = ref<Record<string, FGProjection | null>>({})
  const loading = ref(false)
  const loaded = ref(false)

  async function load() {
    const leagueStore = useLeagueStore()
    // Resolve leagueKey the same way the other composables do: use activeLeagueId
    // directly (matches getAllRosteredPlayers(leagueKey) contract).
    const leagueKey = leagueStore.activeLeagueId
    if (!leagueKey) return

    // Resolve the logged-in user's Yahoo team_key. MyTeamView derives myTeamId from
    // the is_my_team team's `team_id ?? team_key`, but rostered players carry the
    // full `fantasy_team_key` (e.g. "431.l.12345.t.7"), so we match on team_key.
    const myTeam = leagueStore.yahooTeams?.find((t: any) => t.is_my_team)
    const myTeamKey = myTeam?.team_key ? String(myTeam.team_key) : null

    const requestedId = leagueKey
    loading.value = true
    try {
      const { yahooService } = await import('@/services/yahoo')
      const raw = await yahooService.getAllRosteredPlayers(String(leagueKey))
      // Bail out if the active league changed while fetching (stale-league guard).
      if (leagueStore.activeLeagueId !== requestedId) return

      const all = raw || []
      // Expose the full unfiltered rostered pool (used for league-wide percentiles).
      pool.value = all.map(normalizePoolPlayer)

      // Match each rostered player to a raw FanGraphs rest-of-season projection.
      const { matchFG } = await buildPlayerMatchers()
      if (leagueStore.activeLeagueId !== requestedId) return
      const fg: Record<string, FGProjection | null> = {}
      for (const p of all) {
        const key = String(p.player_key ?? p.player_id ?? '')
        fg[key] = matchFG({ full_name: p.full_name, mlb_team: p.mlb_team })
      }
      fgByKey.value = fg

      // Filter to the logged-in user's team via fantasy_team_key (the full Yahoo
      // team_key). Fall back to the team name when a team_key is unavailable.
      let mine: any[] = []
      if (myTeamKey) {
        mine = all.filter((p: any) => String(p.fantasy_team_key ?? '') === myTeamKey)
      }
      if (mine.length === 0 && myTeam?.name) {
        const myName = String(myTeam.name)
        mine = all.filter((p: any) => String(p.fantasy_team ?? '') === myName)
      }

      players.value = mine.map(normalizeRosterPlayer)
      loaded.value = true
    } catch (e) {
      console.error('[useMyRoster] load failed', e)
    } finally {
      if (leagueStore.activeLeagueId === requestedId) loading.value = false
    }
  }

  return { players, pool, fgByKey, loading, loaded, load }
}
