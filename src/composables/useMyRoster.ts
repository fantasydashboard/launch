import { ref } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { buildPlayerMatchers, type FGProjection, type StatcastData } from '@/services/projectionService'
import { parseRosterSlots } from '@/trades/rosterSlots'

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
  started: boolean // in the active lineup this period (false = bench/IL)
  eligiblePositions?: string[] // every position this player qualifies for, e.g. ['1B','OF']
}

// Eligible positions: prefer the parsed eligible_positions, else split the
// comma/slash-separated display position ("1B,OF").
function eligibleFrom(raw: any): string[] {
  if (Array.isArray(raw.eligible_positions) && raw.eligible_positions.length) {
    return raw.eligible_positions.map((p: any) => String(p)).filter(Boolean)
  }
  return String(raw.position ?? '')
    .split(/[,/]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

// Yahoo lineup slots that are NOT accruing stats this period.
const BENCH_SLOTS = new Set(['BN', 'IL', 'IL+', 'IL60', 'NA', 'DL'])

function normalizeRosterPlayer(raw: any): RosterPlayer {
  const selected = String(raw.selected_position ?? '').toUpperCase()
  // Default to started when the slot is unknown, so platforms without lineup data
  // never produce spurious "bench this player" calls.
  const started = selected === '' ? true : !BENCH_SLOTS.has(selected)
  return {
    playerKey: String(raw.player_key ?? raw.player_id ?? ''),
    name: String(raw.full_name ?? ''),
    position: String(raw.position ?? ''),
    team: String(raw.mlb_team ?? ''),
    headshot: raw.headshot ? String(raw.headshot) : undefined,
    status: raw.status ? String(raw.status) : '',
    totalPoints: typeof raw.total_points === 'number' ? raw.total_points : Number(raw.total_points) || 0,
    stats: raw.stats && typeof raw.stats === 'object' ? { ...raw.stats } : {},
    started,
    eligiblePositions: eligibleFrom(raw),
  }
}

/** A rostered player anywhere in the league, normalized to the minimum the
 * contribution engine needs (playerKey + position + season-total stats). teamKey/name
 * let league-wide consumers (Trades) group the pool by team and label players. */
export interface PoolPlayer {
  playerKey: string
  name: string
  position: string
  stats: Record<string, number>
  eligiblePositions?: string[]
  teamKey: string // owning fantasy team_key
  headshot?: string
  proTeam?: string // MLB team abbr, for the pro-team logo
  onIL?: boolean // sits in an IL/NA reserve slot (not an active roster spot)
  status?: string // raw platform injury status
}

function normalizePoolPlayer(raw: any): PoolPlayer {
  return {
    playerKey: String(raw.player_key ?? raw.player_id ?? ''),
    name: String(raw.full_name ?? ''),
    position: String(raw.position ?? ''),
    stats: raw.stats && typeof raw.stats === 'object' ? { ...raw.stats } : {},
    status: raw.status ? String(raw.status) : '',
    eligiblePositions: eligibleFrom(raw),
    teamKey: String(raw.fantasy_team_key ?? ''),
    headshot: raw.headshot ? String(raw.headshot) : undefined,
    proTeam: raw.mlb_team ? String(raw.mlb_team) : undefined,
  }
}

export function useMyRoster() {
  const players = ref<RosterPlayer[]>([])
  const pool = ref<PoolPlayer[]>([])
  const fgByKey = ref<Record<string, FGProjection | null>>({})
  const statcastByKey = ref<Record<string, StatcastData | null>>({})
  // Required starting-slot counts per position (for the positional trade dimension).
  const rosterSlots = ref<Record<string, number>>({})
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
      // getAllRosteredPlayers is a heavy multi-chunk Yahoo call that intermittently
      // returns either an empty array OR rows-without-stats (the inner getPlayerStats
      // chunks get rate-limited). Either case collapses the role-relative percentiles
      // to a flat 50, so retry until we get a load that actually carries stats.
      const statCoverage = (rows: any[]): number =>
        rows.length === 0 ? 0 : rows.filter((p) => p.stats && Object.keys(p.stats).length > 0).length / rows.length
      let all: any[] = []
      let coverage = 0
      for (let attempt = 0; attempt < 4; attempt++) {
        all = (await yahooService.getAllRosteredPlayers(String(leagueKey))) || []
        // Bail out if the active league changed while fetching (stale-league guard).
        if (leagueStore.activeLeagueId !== requestedId) return
        coverage = statCoverage(all)
        if (all.length > 0 && coverage >= 0.5) break
        await new Promise((r) => setTimeout(r, 700 * (attempt + 1)))
      }
      // Never overwrite an already-loaded pool with an empty / statless response.
      if (all.length === 0 || coverage < 0.5) {
        if (pool.value.length === 0) {
          console.warn('[useMyRoster] rostered pool unusable after retries (rows=%d, statCoverage=%s)', all.length, coverage.toFixed(2))
        }
        return
      }

      // Expose the full unfiltered rostered pool (used for league-wide percentiles).
      pool.value = all.map(normalizePoolPlayer)

      // Match each rostered player to a raw FanGraphs rest-of-season projection.
      const { matchFG, matchStatcast } = await buildPlayerMatchers()
      if (leagueStore.activeLeagueId !== requestedId) return
      const fg: Record<string, FGProjection | null> = {}
      const sc: Record<string, StatcastData | null> = {}
      for (const p of all) {
        const key = String(p.player_key ?? p.player_id ?? '')
        fg[key] = matchFG({ full_name: p.full_name, mlb_team: p.mlb_team })
        sc[key] = matchStatcast({ full_name: p.full_name, mlb_team: p.mlb_team })
      }
      fgByKey.value = fg
      statcastByKey.value = sc

      // League roster-slot requirements for the positional dimension. Best-effort: a settings
      // failure must not break the roster load, and parseRosterSlots falls back to baseball
      // defaults when settings are missing.
      try {
        const settings = await yahooService.getLeagueSettings(String(leagueKey))
        if (leagueStore.activeLeagueId === requestedId) rosterSlots.value = parseRosterSlots('yahoo', settings)
      } catch {
        rosterSlots.value = parseRosterSlots('yahoo', null)
      }

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

  return { players, pool, fgByKey, statcastByKey, rosterSlots, loading, loaded, load }
}
