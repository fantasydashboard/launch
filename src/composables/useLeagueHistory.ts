/**
 * Orchestrates the multi-season history fetch per platform and normalizes it into a
 * platform-neutral `HistorySeason[]`, so the pure builders + HistoryView never branch
 * on platform. Mirrors the structure of `usePowerTrajectory` (refs, guarded async
 * `load()`, stale-guard on activeLeagueId).
 *
 * Cross-season team identity (teams rekey every season):
 *  - ESPN   → `primaryOwner ?? team_<id>_<season>`
 *  - Yahoo  → `manager_guid ?? team_key`
 *  - Sleeper→ `owner_id ?? roster_<roster_id>`
 *
 * The visible depth is naturally membership-gated: ESPN/Yahoo only return seasons you
 * were a member of; Sleeper returns the full `previous_league_id` chain. Any season
 * that fails to load is skipped, never fatal.
 *
 * Reuses the proven cross-season logic from the old PointsHistoryView.
 */
import { ref } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useAuthStore } from '@/stores/auth'
import { usePlatformsStore } from '@/stores/platforms'
import { yahooService } from '@/services/yahoo'
import { espnService } from '@/services/espn'
import { sleeperService } from '@/services/sleeper'
import type { Sport } from '@/types/supabase'
import type { HistorySeason, HistoryTeam, HistoryWeek, HistoryResult } from '@/history/types'
import { leagueSnapshotKey, fetchSnapshotRows, snapshotSeasons } from '@/services/historySnapshots'
import { mergeHistorySeasons } from '@/history/mergeSeasons'

function parseEspnKey(key: string): { sport: Sport; leagueId: string; season: number } | null {
  const parts = key.split('_')
  if (parts.length < 4 || parts[0] !== 'espn') return null
  return { sport: parts[1] as Sport, leagueId: parts[2], season: parseInt(parts[3], 10) }
}

export function useLeagueHistory() {
  const data = ref<HistorySeason[]>([]) // sorted by season DESC
  const firstYear = ref(0) // min season across visible history
  const platform = ref<string>('') // 'espn' | 'yahoo' | 'sleeper'
  const myTeamKey = ref('') // cross-season identity of the user's team
  const loading = ref(false)
  const loaded = ref(false)
  const snapshotKey = ref('') // stable per-league key for durable snapshots
  const backfilled = ref(false) // true when stored snapshots deepened the history
  const sport = ref('') // resolved sport, exposed so the backfill form can label its writes
  // Per-season provenance for seasons that came from STORAGE (not the user's live fetch).
  const origin = ref<Map<number, { source: 'auto' | 'manual'; contributorUserId: string; isMine: boolean }>>(
    new Map(),
  )
  // Per-season → platform-key map, so callers can re-fetch/load an older season directly.
  const seasonKeys = ref<Map<number, string>>(new Map())

  // ── ESPN ──────────────────────────────────────────────────────────────────────
  async function loadEspn(leagueKey: string): Promise<HistorySeason[]> {
    const parsed = parseEspnKey(leagueKey)
    if (!parsed) return []
    const { sport, leagueId, season: currentSeason } = parsed
    snapshotKey.value = leagueSnapshotKey({ platform: 'espn', sport, leagueId })

    const authStore = useAuthStore()
    const platformsStore = usePlatformsStore()
    if (authStore.user?.id) await espnService.initialize(authStore.user.id)
    const creds = platformsStore.getEspnCredentials()
    if (creds) espnService.setCredentials(creds.espn_s2, creds.swid)

    // Identity key for one ESPN team in a given season.
    const keyFor = (team: any, s: number) =>
      team.primaryOwner ? String(team.primaryOwner) : `team_${team.id}_${s}`

    // Resolve the user's cross-season key from their current-season team.
    try {
      const myTeam = await espnService.getMyTeam(sport, leagueId, currentSeason)
      if (myTeam) myTeamKey.value = keyFor(myTeam, currentSeason)
    } catch {
      /* leave myTeamKey empty → no YOU highlight, not fatal */
    }

    const out: HistorySeason[] = []
    for (let s = currentSeason; s >= currentSeason - 5; s--) {
      seasonKeys.value.set(s, leagueId)
      try {
        const isCurrent = s === currentSeason
        const teams = isCurrent
          ? await espnService.getTeams(sport, leagueId, s)
          : await espnService.getHistoricalTeams(sport, leagueId, s)
        if (!teams || teams.length === 0) continue

        const historyTeams: HistoryTeam[] = teams.map((t: any, idx: number) => {
          const rank = Number(t.rank) || idx + 1
          return {
            teamKey: keyFor(t, s),
            teamName: String(t.name ?? 'Team'),
            teamLogo: String(t.logo ?? '') || undefined,
            wins: Number(t.wins) || 0,
            losses: Number(t.losses) || 0,
            ties: Number(t.ties) || 0,
            pointsFor: Number(t.pointsFor) || 0,
            rank,
            playoffSeed: Number(t.playoffSeed) || undefined,
            madePlayoffs: Number(t.playoffSeed) > 0,
            // Past seasons are finished → standings rank 1 is the champion.
            champion: !isCurrent && rank === 1,
          }
        })

        // Map ESPN team id → cross-season key, for matchup result keying.
        const keyByEspnId = new Map<number, string>()
        for (const t of teams as any[]) keyByEspnId.set(Number(t.id), keyFor(t, s))

        // Weekly matchups (current + as available). Defensive per-week.
        const maxWeek = 25
        const weeks: HistoryWeek[] = []
        for (let week = 1; week <= maxWeek; week++) {
          try {
            const matchups = isCurrent
              ? await espnService.getMatchups(sport, leagueId, s, week)
              : await espnService.getHistoricalMatchups(sport, leagueId, s, week)
            if (!matchups || matchups.length === 0) {
              // Bail early once we've collected weeks and hit a gap.
              if (weeks.length > 0) break
              continue
            }
            const results: Record<string, HistoryResult> = {}
            const points: Record<string, number> = {}
            const pairs: [string, string][] = []
            for (const m of matchups as any[]) {
              if (!m.winner || m.winner === 'UNDECIDED') continue
              const homeKey = keyByEspnId.get(Number(m.homeTeamId))
              const awayKey = keyByEspnId.get(Number(m.awayTeamId))
              if (!homeKey || !awayKey) continue
              if (m.winner === 'TIE') {
                results[homeKey] = 'T'
                results[awayKey] = 'T'
              } else {
                results[homeKey] = m.winner === 'HOME' ? 'W' : 'L'
                results[awayKey] = m.winner === 'AWAY' ? 'W' : 'L'
              }
              if (m.homeScore != null) points[homeKey] = Number(m.homeScore)
              if (m.awayScore != null) points[awayKey] = Number(m.awayScore)
              pairs.push([homeKey, awayKey])
            }
            if (Object.keys(results).length) {
              weeks.push({
                week,
                results,
                points: Object.keys(points).length ? points : undefined,
                matchups: pairs.length ? pairs : undefined,
              })
            }
          } catch {
            if (weeks.length > 0) break
          }
        }

        out.push({ season: s, teams: historyTeams, weeks: weeks.length ? weeks : undefined })
      } catch {
        // Skip this season; never fatal.
      }
    }

    return out
  }

  // ── YAHOO ─────────────────────────────────────────────────────────────────────
  async function loadYahoo(leagueKey: string): Promise<HistorySeason[]> {
    const authStore = useAuthStore()
    if (authStore.user?.id) await yahooService.initialize(authStore.user.id)

    const leagueStore = useLeagueStore()
    const saved = leagueStore.savedLeagues.find((l: any) => l.league_id === leagueStore.activeLeagueId)
    const sport = String(saved?.sport || leagueStore.activeSport || 'football')
    const maxMatchupWeeks = sport === 'football' ? 17 : 30
    snapshotKey.value = leagueSnapshotKey({ platform: 'yahoo', sport, leagueKey })

    const out: HistorySeason[] = []
    let currentKey: string | undefined = leagueKey
    const visited = new Set<string>()
    const maxSeasons = 15

    while (currentKey && !visited.has(currentKey) && out.length < maxSeasons) {
      visited.add(currentKey)
      try {
        const metadata = await yahooService.getLeagueMetadata(currentKey)
        const season = Number(metadata.season) || parseInt(String(currentKey).split('.')[0], 10)
        seasonKeys.value.set(season, currentKey)
        const standings = await yahooService.getStandings(currentKey)
        if (!standings || standings.length === 0) break

        // Cross-season identity: Yahoo team_keys change every season, so we prefer the
        // stable manager GUID — but ONLY when it's actually unique per team. Some Yahoo
        // standings responses return the same guid for every team (which would collapse
        // the whole league into one bucket), so we fall back to the normalized team name
        // (unique within a season, stable enough across seasons) when the guid is bogus.
        const guidCounts = new Map<string, number>()
        for (const t of standings as any[]) {
          const g = String(t?.manager_guid ?? '').trim()
          if (g) guidCounts.set(g, (guidCounts.get(g) ?? 0) + 1)
        }
        const guidReliable = guidCounts.size > 1 && [...guidCounts.values()].every((c) => c === 1)
        const identityOf = (t: any): string => {
          const guid = String(t?.manager_guid ?? '').trim()
          if (guidReliable && guid) return 'g:' + guid
          const name = String(t?.name ?? '').trim().toLowerCase()
          if (name) return 'n:' + name
          return 'k:' + String(t?.team_key ?? '')
        }
        const idByTeamKey = new Map<string, string>()
        for (const t of standings as any[]) {
          const tk = String(t.team_key ?? '')
          if (tk) idByTeamKey.set(tk, identityOf(t))
        }
        const keyFor = (teamKey: string) => idByTeamKey.get(String(teamKey)) ?? 'k:' + String(teamKey)

        const historyTeams: HistoryTeam[] = (standings as any[]).map((t: any) => ({
          teamKey: identityOf(t),
          teamName: String(t.name ?? 'Team'),
          teamLogo: String(t.logo_url ?? '') || undefined,
          wins: Number(t.wins) || 0,
          losses: Number(t.losses) || 0,
          ties: Number(t.ties) || 0,
          pointsFor: Number(t.points_for ?? t.points ?? 0) || 0,
          rank: Number(t.rank) || 0,
          playoffSeed: Number(t.playoff_seed) || undefined,
          madePlayoffs: Number(t.playoff_seed) > 0,
          champion: !!metadata.isFinished && Number(t.rank) === 1,
        }))

        // myTeamKey is derived from matchup data below (getStandings doesn't flag the
        // user's team; getMatchups does via is_my_team).

        // Weekly matchups, normalized to manager-guid keys.
        const weeks: HistoryWeek[] = []
        let consecutiveFailures = 0
        for (let week = 1; week <= maxMatchupWeeks; week++) {
          try {
            const matchups = await yahooService.getMatchups(currentKey, week)
            if (!matchups || matchups.length === 0) {
              consecutiveFailures++
            } else {
              consecutiveFailures = 0
              const results: Record<string, HistoryResult> = {}
              const points: Record<string, number> = {}
              const pairs: [string, string][] = []
              for (const m of matchups as any[]) {
                if (m.is_playoffs || m.is_consolation) continue
                const teams = (m.teams ?? []).filter((t: any) => t?.team_key)
                if (teams.length < 2) continue
                const keys = teams.map((t: any) => keyFor(String(t.team_key)))
                if (keys.length === 2) pairs.push([keys[0], keys[1]])
                for (const t of teams) {
                  const k = keyFor(String(t.team_key))
                  if (t.points != null) points[k] = Number(t.points)
                  // getStandings doesn't flag the user's team, so grab it here (most recent season).
                  if (out.length === 0 && t.is_my_team) myTeamKey.value = k
                }
                if (m.is_tied) {
                  for (const k of keys) results[k] = 'T'
                } else if (m.winner_team_key) {
                  const winKey = keyFor(String(m.winner_team_key))
                  for (const k of keys) results[k] = k === winKey ? 'W' : 'L'
                } else if (teams.length === 2) {
                  // Fall back to points comparison when winner not flagged.
                  const [a, b] = teams
                  const aPts = Number(a.points) || 0
                  const bPts = Number(b.points) || 0
                  if (aPts === bPts) continue
                  const aKey = keyFor(String(a.team_key))
                  const bKey = keyFor(String(b.team_key))
                  results[aKey] = aPts > bPts ? 'W' : 'L'
                  results[bKey] = bPts > aPts ? 'W' : 'L'
                }
              }
              if (Object.keys(results).length) {
                weeks.push({
                  week,
                  results,
                  points: Object.keys(points).length ? points : undefined,
                  matchups: pairs.length ? pairs : undefined,
                })
              }
            }
          } catch {
            consecutiveFailures++
          }
          if (consecutiveFailures >= 3 && weeks.length > 0) break
        }

        out.push({ season, teams: historyTeams, weeks: weeks.length ? weeks : undefined })

        // Chain backward via the renew link ("{game_key}_{league_id}").
        const renew = metadata.renew
        currentKey = renew ? renew.replace('_', '.l.') : undefined
      } catch {
        break
      }
    }

    return out
  }

  // ── SLEEPER ─────────────────────────────────────────────────────────────────────
  async function loadSleeper(leagueKey: string): Promise<HistorySeason[]> {
    // Sleeper league key format: `sleeper_<leagueId>` or a raw league id.
    const sleeperLeagueId = leagueKey.startsWith('sleeper_') ? leagueKey.slice('sleeper_'.length) : leagueKey
    const leagueStore = useLeagueStore()
    myTeamKey.value = String(leagueStore.currentUserId ?? '')

    const hist = await sleeperService.getHistoricalData(sleeperLeagueId)
    if (!hist || !hist.seasons.length) return []
    // Chain root (oldest season's league_id) is stable across seasons and members.
    const rootLeagueId = String(
      [...hist.seasons].sort((a: any, b: any) => Number(a.season) - Number(b.season))[0]?.league_id ??
        sleeperLeagueId,
    )
    snapshotKey.value = leagueSnapshotKey({ platform: 'sleeper', rootLeagueId })

    const out: HistorySeason[] = []
    for (const league of hist.seasons) {
      try {
        const seasonStr = String(league.season)
        const season = Number(league.season)
        seasonKeys.value.set(season, league.league_id)
        const rosters = hist.rosters.get(seasonStr) ?? []
        const users = hist.users.get(seasonStr) ?? []
        if (!rosters.length) continue

        const isFinished = String(league.status ?? 'complete') === 'complete'

        // Champion via the winners bracket where available.
        let championRosterId: number | null = null
        try {
          const bracket = await sleeperService.getWinnersBracket(league.league_id)
          championRosterId = sleeperService.getChampionFromBracket(bracket)
        } catch {
          /* no bracket → fall back to rank-1 below */
        }

        const userByOwner = new Map<string, any>()
        for (const u of users as any[]) userByOwner.set(String(u.user_id), u)

        const keyFor = (roster: any) =>
          roster.owner_id ? String(roster.owner_id) : `roster_${roster.roster_id}`

        const built = (rosters as any[]).map((roster: any) => {
          const user = userByOwner.get(String(roster.owner_id))
          return {
            teamKey: keyFor(roster),
            rosterId: Number(roster.roster_id),
            teamName: sleeperService.getTeamName(roster, user),
            teamLogo: sleeperService.getAvatarUrl(roster, user, league) || undefined,
            wins: Number(roster.settings?.wins) || 0,
            losses: Number(roster.settings?.losses) || 0,
            ties: Number(roster.settings?.ties) || 0,
            pointsFor: Number(roster.settings?.fpts) || 0,
            championRoster: championRosterId,
          }
        })

        // Rank by wins then points (Sleeper rosters have no stored rank).
        built.sort((a, b) => (b.wins !== a.wins ? b.wins - a.wins : b.pointsFor - a.pointsFor))

        const historyTeams: HistoryTeam[] = built.map((b, idx) => {
          const rank = idx + 1
          const isChamp =
            championRosterId != null ? b.rosterId === championRosterId : rank === 1
          return {
            teamKey: b.teamKey,
            teamName: b.teamName,
            teamLogo: b.teamLogo,
            wins: b.wins,
            losses: b.losses,
            ties: b.ties,
            pointsFor: b.pointsFor,
            rank,
            madePlayoffs: false,
            champion: isFinished && isChamp,
          }
        })

        // rosterId → cross-season key, for matchup result keying.
        const keyByRosterId = new Map<number, string>()
        for (const b of built) keyByRosterId.set(b.rosterId, b.teamKey)

        const seasonMatchups = hist.matchups.get(seasonStr)
        const weeks: HistoryWeek[] = []
        if (seasonMatchups) {
          for (const [week, weekMatchups] of seasonMatchups) {
            const grouped = new Map<number, any[]>()
            for (const m of weekMatchups as any[]) {
              if (m.matchup_id == null) continue
              if (!grouped.has(m.matchup_id)) grouped.set(m.matchup_id, [])
              grouped.get(m.matchup_id)!.push(m)
            }
            const results: Record<string, HistoryResult> = {}
            const points: Record<string, number> = {}
            const pairs: [string, string][] = []
            for (const pair of grouped.values()) {
              if (pair.length !== 2) continue
              const [m1, m2] = pair
              const k1 = keyByRosterId.get(Number(m1.roster_id))
              const k2 = keyByRosterId.get(Number(m2.roster_id))
              if (!k1 || !k2) continue
              const p1 = Number(m1.points) || 0
              const p2 = Number(m2.points) || 0
              points[k1] = p1
              points[k2] = p2
              if (p1 === p2) {
                results[k1] = 'T'
                results[k2] = 'T'
              } else {
                results[k1] = p1 > p2 ? 'W' : 'L'
                results[k2] = p2 > p1 ? 'W' : 'L'
              }
              pairs.push([k1, k2])
            }
            if (Object.keys(results).length) {
              weeks.push({ week, results, points, matchups: pairs.length ? pairs : undefined })
            }
          }
        }
        weeks.sort((a, b) => a.week - b.week)

        out.push({ season, teams: historyTeams, weeks: weeks.length ? weeks : undefined })
      } catch {
        // Skip this season.
      }
    }

    return out
  }

  async function load() {
    const leagueStore = useLeagueStore()
    const leagueKey = leagueStore.activeLeagueId
    if (!leagueKey) return
    const requested = leagueKey
    loading.value = true
    myTeamKey.value = ''
    snapshotKey.value = ''
    backfilled.value = false
    sport.value = String(leagueStore.activeSport || 'football')
    origin.value = new Map()
    seasonKeys.value = new Map()
    try {
      const p = leagueStore.activePlatform
      platform.value = p
      let result: HistorySeason[]
      if (p === 'espn') result = await loadEspn(leagueKey)
      else if (p === 'sleeper') result = await loadSleeper(leagueKey)
      else result = await loadYahoo(leagueKey)

      if (leagueStore.activeLeagueId !== requested) return // stale

      result.sort((a, b) => b.season - a.season)
      data.value = result
      firstYear.value = result.length ? Math.min(...result.map((s) => s.season)) : 0

      // Durable snapshots: merge in seasons other members contributed, then persist
      // the seasons we fetched firsthand. Non-fatal — the live fetch already renders.
      try {
        const key = snapshotKey.value
        if (key) {
          const rows = await fetchSnapshotRows(key)
          if (leagueStore.activeLeagueId !== requested) return // stale re-check
          const stored = rows.map((r) => r.payload)
          const merged = mergeHistorySeasons(result, stored)
          // Only re-render + compute provenance when storage actually deepened history
          // (merge only ADDS seasons the live fetch lacked). Skips a redundant render on
          // the common no-backfill path.
          if (merged.length > result.length) {
            data.value = merged
            firstYear.value = Math.min(...merged.map((s) => s.season))
            const liveMin = result.length ? Math.min(...result.map((s) => s.season)) : 0
            backfilled.value = liveMin > 0 && firstYear.value < liveMin

            // Provenance only for stored-origin seasons (live wins on overlap, so a season
            // the user fetched firsthand is never "from storage").
            const liveSeasons = new Set(result.map((s) => s.season))
            const uid = useAuthStore().user?.id ?? ''
            const om = new Map<number, { source: 'auto' | 'manual'; contributorUserId: string; isMine: boolean }>()
            for (const r of rows) {
              if (liveSeasons.has(r.season)) continue
              om.set(r.season, {
                source: r.source,
                contributorUserId: r.contributorUserId,
                isMine: r.source === 'manual' && !!uid && r.contributorUserId === uid,
              })
            }
            origin.value = om
          }
          const activeSeason = result.length ? Math.max(...result.map((s) => s.season)) : 0
          void snapshotSeasons({ key, platform: p, sport: sport.value, activeSeason, seasons: result })
        }
      } catch (e) {
        console.error('[useLeagueHistory] snapshot step failed', e)
      }

      loaded.value = true
    } catch (e) {
      console.error('[useLeagueHistory] load failed', e)
      data.value = []
      firstYear.value = 0
      loaded.value = true
    } finally {
      if (leagueStore.activeLeagueId === requested) loading.value = false
    }
  }

  return {
    data,
    firstYear,
    platform,
    sport,
    myTeamKey,
    backfilled,
    snapshotKey,
    origin,
    loading,
    loaded,
    load,
    seasonKeys,
  }
}
