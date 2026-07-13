import { ref } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { buildPlayerMatchers, type FGProjection } from '@/services/projectionService'
import { parseRosterSlots } from '@/trades/rosterSlots'
import { isYahooIL } from '@/wire/injury'
import { parseYahooAcquisition, type AcquisitionInfo } from '@/wire/acquisition'

/**
 * The league-wide rostered pool for a Yahoo category league, assembled from one
 * LIGHT `getRoster(teamKey)` call per team (sequential, gentle on Yahoo's
 * throttle) plus FanGraphs rest-of-season projections — instead of the single
 * heavy, rate-limit-prone `getAllRosteredPlayers`.
 *
 * The fetched rosters are cached in sessionStorage (keyed by league), so a
 * reload reuses the pool with ZERO Yahoo calls — both faster and immune to the
 * reload-throttle loop. The cache lives for the tab session; rosters barely move
 * within a session, and it clears when the tab closes.
 *
 * Pool players carry no raw stats; their projection comes from `fgByKey`
 * (matched by name + MLB team), which the consumer runs through the same
 * toEffectiveStats / mapFgStatsByKey pipeline (which prefers FG) — so totals are
 * ROS-based, exactly what the season-long Wire scores on.
 */
export interface LeaguePoolPlayer {
  playerKey: string
  name: string
  position: string
  teamKey: string // owning fantasy team_key
  proTeam: string // MLB team abbr
  headshot: string // player headshot URL ('' if absent)
  onIL: boolean // sits in an IL/NA reserve slot (not an active roster spot)
  status?: string // raw Yahoo injury status ('IL10' / 'DTD' / …)
  stats: Record<string, number> // empty; the FG projection in fgByKey drives totals
}

interface PoolRow {
  teamKey: string
  playerKey: string
  name: string
  position: string
  proTeam: string
  headshot: string
  status: string // Yahoo injury status ('IL10' / 'IL60' / 'NA' / 'DTD' / '')
}

export function useYahooLeaguePool() {
  const leagueStore = useLeagueStore()
  const pool = ref<LeaguePoolPlayer[]>([])
  const fgByKey = ref<Record<string, FGProjection | null>>({})
  // Required starting-slot counts per position (for position-aware drops).
  const rosterSlots = ref<Record<string, number>>({})
  const acquisition = ref<AcquisitionInfo>({ mode: 'unknown', budget: null })
  const loading = ref(false)
  const loaded = ref(false)

  // League roster requirements + waiver/FAAB mode; baseball defaults if the call fails.
  async function loadRosterSlots() {
    if (Object.keys(rosterSlots.value).length) return
    try {
      const { yahooService } = await import('@/services/yahoo')
      const settings = await yahooService.getLeagueSettings(String(leagueStore.activeLeagueId ?? ''))
      rosterSlots.value = parseRosterSlots('yahoo', settings)
      acquisition.value = parseYahooAcquisition(settings)
    } catch {
      rosterSlots.value = parseRosterSlots('yahoo', null)
    }
  }

  // v2: rows now carry injury `status` (for onIL) — bump invalidates pre-status caches.
  const cacheKey = () => `ufd_wirepool2_${leagueStore.activeLeagueId ?? ''}`

  function readCache(): PoolRow[] | null {
    if (typeof sessionStorage === 'undefined') return null
    try {
      const raw = sessionStorage.getItem(cacheKey())
      const parsed = raw ? JSON.parse(raw) : null
      return Array.isArray(parsed) && parsed.length ? (parsed as PoolRow[]) : null
    } catch {
      return null
    }
  }

  // Match each row to a FanGraphs projection and publish the pool + fg map.
  async function buildFromRows(rows: PoolRow[]) {
    const { matchFG } = await buildPlayerMatchers()
    const nextPool: LeaguePoolPlayer[] = []
    const nextFg: Record<string, FGProjection | null> = {}
    for (const r of rows) {
      nextPool.push({
        playerKey: r.playerKey,
        name: r.name,
        position: r.position,
        teamKey: r.teamKey,
        proTeam: r.proTeam,
        headshot: r.headshot,
        onIL: isYahooIL(r.status),
        status: r.status ?? '',
        stats: {},
      })
      try {
        nextFg[r.playerKey] = matchFG({ full_name: r.name, mlb_team: r.proTeam })
      } catch {
        nextFg[r.playerKey] = null
      }
    }
    pool.value = nextPool
    fgByKey.value = nextFg
    loaded.value = true
  }

  async function load() {
    void loadRosterSlots() // independent of the pool; fire it whenever we (re)load
    if (loading.value || loaded.value) return

    // 1) Cache hit: rebuild instantly, no Yahoo calls (breaks the reload throttle).
    const cached = readCache()
    if (cached) {
      await buildFromRows(cached)
      return
    }

    // 2) Cold: one light, throttle-friendly roster call per team, then cache.
    const teams = (leagueStore.yahooTeams ?? []).filter((t: any) => t?.team_key)
    if (!teams.length) return
    loading.value = true
    try {
      const { yahooService } = await import('@/services/yahoo')
      // Retry a team's roster on a transient failure (Yahoo 502/throttle) before
      // giving up on it — a single gateway blip shouldn't zero a team's players.
      const fetchRoster = async (teamKey: string): Promise<any[] | null> => {
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            return (await yahooService.getRoster(teamKey)) as any[]
          } catch {
            if (attempt < 2) await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
          }
        }
        return null
      }
      const rows: PoolRow[] = []
      let failed = 0
      for (const t of teams) {
        const teamKey = String(t.team_key)
        const roster = await fetchRoster(teamKey)
        if (roster === null) {
          failed++
        } else {
          for (const p of roster) {
            const playerKey = String(p?.player_key ?? p?.player_id ?? '')
            if (!playerKey) continue
            rows.push({
              teamKey,
              playerKey,
              name: String(p?.name?.full ?? ''),
              position: String(p?.position ?? ''),
              proTeam: String(p?.team_abbr ?? ''),
              headshot: String(p?.headshot ?? ''),
              status: String(p?.status ?? ''),
            })
          }
        }
        await new Promise((r) => setTimeout(r, 120)) // gap so the burst doesn't trip the throttle
      }
      if (!rows.length) return // total failure: keep retryable, don't cache an empty result
      // Only persist a COMPLETE fetch — caching a partial pool (a team's worth of
      // players missing) would skew standings on every reload. A partial pool still
      // renders this session; the next reload retries cold and usually completes.
      if (failed === 0) {
        try {
          sessionStorage.setItem(cacheKey(), JSON.stringify(rows))
        } catch {
          /* quota / private mode — pool still works in-memory */
        }
      }
      await buildFromRows(rows)
    } finally {
      loading.value = false
    }
  }

  return { pool, fgByKey, rosterSlots, acquisition, loading, loaded, load }
}
