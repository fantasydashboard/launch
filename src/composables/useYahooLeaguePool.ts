import { ref } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { buildPlayerMatchers, type FGProjection } from '@/services/projectionService'
import { parseRosterSlots } from '@/trades/rosterSlots'

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
  stats: Record<string, number> // empty; the FG projection in fgByKey drives totals
}

interface PoolRow {
  teamKey: string
  playerKey: string
  name: string
  position: string
  proTeam: string
  headshot: string
}

export function useYahooLeaguePool() {
  const leagueStore = useLeagueStore()
  const pool = ref<LeaguePoolPlayer[]>([])
  const fgByKey = ref<Record<string, FGProjection | null>>({})
  // Required starting-slot counts per position (for position-aware drops).
  const rosterSlots = ref<Record<string, number>>({})
  const loading = ref(false)
  const loaded = ref(false)

  // League roster requirements; baseball defaults if the settings call fails.
  async function loadRosterSlots() {
    if (Object.keys(rosterSlots.value).length) return
    try {
      const { yahooService } = await import('@/services/yahoo')
      const settings = await yahooService.getLeagueSettings(String(leagueStore.activeLeagueId ?? ''))
      rosterSlots.value = parseRosterSlots('yahoo', settings)
    } catch {
      rosterSlots.value = parseRosterSlots('yahoo', null)
    }
  }

  const cacheKey = () => `ufd_wirepool_${leagueStore.activeLeagueId ?? ''}`

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
      const rows: PoolRow[] = []
      for (const t of teams) {
        const teamKey = String(t.team_key)
        try {
          const roster = await yahooService.getRoster(teamKey)
          for (const p of roster as any[]) {
            const playerKey = String(p?.player_key ?? p?.player_id ?? '')
            if (!playerKey) continue
            rows.push({
              teamKey,
              playerKey,
              name: String(p?.name?.full ?? ''),
              position: String(p?.position ?? ''),
              proTeam: String(p?.team_abbr ?? ''),
              headshot: String(p?.headshot ?? ''),
            })
          }
        } catch {
          /* skip this team */
        }
        await new Promise((r) => setTimeout(r, 120)) // gap so the burst doesn't trip the throttle
      }
      if (!rows.length) return // keep retryable; don't cache an empty (throttled) result
      try {
        sessionStorage.setItem(cacheKey(), JSON.stringify(rows))
      } catch {
        /* quota / private mode — pool still works in-memory */
      }
      await buildFromRows(rows)
    } finally {
      loading.value = false
    }
  }

  return { pool, fgByKey, rosterSlots, loading, loaded, load }
}
