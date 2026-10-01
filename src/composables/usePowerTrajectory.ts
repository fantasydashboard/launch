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
import { sleeperService } from '@/services/sleeper'
import type { Sport } from '@/types/supabase'
import type { WeekOutcomes, Outcome } from '@/league/powerTrajectory'
import type { ScheduleWeek } from '@/league/playoffOdds'

function parseEspnKey(key: string): { sport: Sport; leagueId: string; season: number } | null {
  const parts = key.split('_')
  if (parts.length < 4 || parts[0] !== 'espn') return null
  return { sport: parts[1] as Sport, leagueId: parts[2], season: parseInt(parts[3], 10) }
}

export function usePowerTrajectory() {
  const outcomes = ref<WeekOutcomes[]>([])
  const currentWeek = ref(0)
  const weeksLeft = ref(0) // regular-season weeks remaining (incl. current); 0 = unknown
  const playoffSpots = ref(0) // teams that make the bracket; 0 = unknown (no stakes badges)
  const remainingSchedule = ref<ScheduleWeek[]>([]) // undecided games, current week → season end
  const loading = ref(false)
  const loaded = ref(false)

  async function loadYahoo(leagueKey: string, categoryForm = false): Promise<WeekOutcomes[]> {
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
          const points: Record<string, number> = {}
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
            for (const t of teams) if (t.team_key && t.points != null) points[String(t.team_key)] = Number(t.points)
          }
          return Object.keys(results).length ? { week, results, points } : null
        } catch {
          return null
        }
      }),
    )

    // Remaining schedule: undecided games from the current week to the season end.
    if (ew) {
      const schedWeeks = Array.from({ length: Math.max(0, ew - cw + 1) }, (_, i) => cw + i)
      const sched = await Promise.all(
        schedWeeks.map(async (week): Promise<ScheduleWeek | null> => {
          try {
            const matchups = await yahooService.getMatchups(leagueKey, week)
            const pairs: [string, string][] = []
            for (const m of matchups) {
              if (m.is_playoffs || m.is_consolation || m.winner_team_key || m.is_tied) continue
              const teams = m.teams ?? []
              if (teams.length < 2 || !teams[0].team_key || !teams[1].team_key) continue
              pairs.push([String(teams[0].team_key), String(teams[1].team_key)])
            }
            return pairs.length ? { week, matchups: pairs } : null
          } catch {
            return null
          }
        }),
      )
      remainingSchedule.value = sched.filter((w): w is ScheduleWeek => w != null)
    }

    const decided = perWeek.filter((w): w is WeekOutcomes => w != null)

    // Category leagues: enrich the most recent weeks with per-category win tallies, the
    // cats-native "who's hot" signal. Yahoo exposes stat winners only via a separate
    // (cached) scoreboard parse, so we fetch just the last few weeks Hot/Cold needs.
    if (categoryForm && decided.length) {
      const recentWeeks = [...decided].sort((a, b) => a.week - b.week).slice(-3).map((w) => w.week)
      await Promise.all(
        recentWeeks.map(async (week) => {
          try {
            const catMatchups = await yahooService.getCategoryMatchups(leagueKey, week)
            const cw: Record<string, number> = {}
            const cl: Record<string, number> = {}
            const ct: Record<string, number> = {}
            for (const m of catMatchups) {
              const teams = (m.teams ?? []).map((t: any) => String(t.team_key)).filter(Boolean)
              if (teams.length < 2) continue
              for (const sw of m.stat_winners ?? []) {
                if (sw.is_tied) {
                  for (const tk of teams) ct[tk] = (ct[tk] ?? 0) + 1
                } else if (sw.winner_team_key) {
                  const win = String(sw.winner_team_key)
                  cw[win] = (cw[win] ?? 0) + 1
                  for (const tk of teams) if (tk !== win) cl[tk] = (cl[tk] ?? 0) + 1
                }
              }
            }
            const entry = decided.find((w) => w.week === week)
            if (entry && Object.keys(cw).length) {
              entry.catWins = cw
              entry.catLosses = cl
              entry.catTies = ct
            }
          } catch {
            /* leave the week without cat data; Hot/Cold falls back to record */
          }
        }),
      )
    }

    return decided
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
    // ESPN exposes the bracket size; Yahoo doesn't reliably, so it stays 0 (no badges).
    playoffSpots.value = Number(league?.settings?.playoffTeamCount) || 0
    const weeks = Array.from({ length: cw }, (_, i) => i + 1)
    const perWeek = await Promise.all(
      weeks.map(async (week): Promise<WeekOutcomes | null> => {
        try {
          const matchups = await espnService.getMatchups(sport, leagueId, season, week)
          const results: Record<string, Outcome> = {}
          const points: Record<string, number> = {}
          const catWins: Record<string, number> = {}
          const catLosses: Record<string, number> = {}
          const catTies: Record<string, number> = {}
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
            if (m.homeScore != null) points[home] = Number(m.homeScore)
            if (m.awayScore != null) points[away] = Number(m.awayScore)
            // Category leagues: per-week categories won/lost/tied (free in the payload).
            if (m.homeCategoryWins != null) {
              catWins[home] = Number(m.homeCategoryWins)
              catLosses[home] = Number(m.homeCategoryLosses ?? 0)
              catTies[home] = Number(m.homeCategoryTies ?? 0)
            }
            if (m.awayCategoryWins != null) {
              catWins[away] = Number(m.awayCategoryWins)
              catLosses[away] = Number(m.awayCategoryLosses ?? 0)
              catTies[away] = Number(m.awayCategoryTies ?? 0)
            }
          }
          return Object.keys(results).length ? { week, results, points, catWins, catLosses, catTies } : null
        } catch {
          return null
        }
      }),
    )

    // Remaining schedule: undecided games from the current week to the regular-season end.
    const lastWeek = regSeason || cw
    const schedWeeks = Array.from({ length: Math.max(0, lastWeek - cw + 1) }, (_, i) => cw + i)
    const sched = await Promise.all(
      schedWeeks.map(async (week): Promise<ScheduleWeek | null> => {
        try {
          const matchups = await espnService.getMatchups(sport, leagueId, season, week)
          const pairs: [string, string][] = []
          for (const m of matchups) {
            if (m.winner && m.winner !== 'UNDECIDED') continue
            pairs.push([`espn_${m.homeTeamId}`, `espn_${m.awayTeamId}`])
          }
          return pairs.length ? { week, matchups: pairs } : null
        } catch {
          return null
        }
      }),
    )
    remainingSchedule.value = sched.filter((w): w is ScheduleWeek => w != null)

    return perWeek.filter((w): w is WeekOutcomes => w != null)
  }

  // Sleeper: no weekly matchup fetch here (yet) — but we still resolve weeks-left from the
  // league's own week bounds so the per-week value basis works (games remaining = the divisor
  // for a player's per-week projection). weeksLeft = regular-season weeks remaining incl. current
  // = playoff_week_start − current_week, clamped to ≥ 1 (a completed league yields 1). Outcomes
  // stay empty (the standings-race chart simply hides), which is fine for football in-season v1.
  /**
   * Sleeper, which was a stub returning nothing.
   *
   * ESPN and Yahoo both fetched their matchups here; Sleeper set two numbers and returned an
   * empty array, so `remainingSchedule` stayed empty for every Sleeper league. Four sections of
   * the League page are gated on that schedule — playoff odds, championship odds, the schedule
   * outlook and the trajectory chart — so all four silently did not exist on the platform a lot
   * of football leagues actually run on. Nothing errored; the page simply fell through to its
   * no-schedule layout and looked finished.
   *
   * Sleeper pairs teams by `matchup_id` rather than naming an opponent, so two rosters sharing
   * one are playing each other.
   *
   * KEYED AS THE BARE ROSTER ID, because that is what `useSleeperLeaguePool` puts on a pool
   * player (`teamKey: String(r.roster_id)`) and therefore what the standings and power rankings
   * are keyed by. The store's own team list uses `sleeper_<id>` for the SAME teams, and a first
   * version of this used that — the schedule then named teams the simulator had never heard of,
   * so every matchup was silently dropped and every team finished on exactly the record it
   * started with. It looked like a working playoff-odds column: ">99%" for everyone above the
   * cut and "<1%" for everyone below, which is what you get when nothing is left to play.
   */
  async function loadSleeper(leagueKey: string): Promise<WeekOutcomes[]> {
    const leagueStore = useLeagueStore()
    const cw = leagueStore.currentWeek
    const ew = Math.max(cw, leagueStore.playoffWeekStart - 1)   // last REGULAR-season week
    currentWeek.value = cw
    weeksLeft.value = Math.max(1, leagueStore.playoffWeekStart - cw)
    const leagueId = leagueKey.startsWith('sleeper_') ? leagueKey.slice('sleeper_'.length) : leagueKey
    const key = (rosterId: number | string) => String(rosterId)

    /** One week's matchups, grouped into pairs by matchup_id. */
    const pairsFor = async (week: number): Promise<[string, string][]> => {
      const rows = await sleeperService.getMatchups(leagueId, week)
      const byId = new Map<number, typeof rows>()
      for (const r of rows ?? []) {
        if (r?.matchup_id == null || r?.roster_id == null) continue
        const list = byId.get(r.matchup_id) ?? []
        list.push(r)
        byId.set(r.matchup_id, list)
      }
      const out: [string, string][] = []
      /* Exactly two to a matchup. A bye or a broken group is skipped rather than guessed at —
         inventing an opponent would put a phantom win into every simulated season. */
      for (const list of byId.values()) {
        if (list.length === 2) out.push([key(list[0].roster_id), key(list[1].roster_id)])
      }
      return out
    }

    /* Weeks already played, for the trajectory. Sleeper reports no winner, so the higher score
       takes it — which is the rule the league itself applies. */
    const past = await Promise.all(
      Array.from({ length: Math.max(0, cw - 1) }, (_, i) => i + 1).map(async (week): Promise<WeekOutcomes | null> => {
        try {
          const rows = await sleeperService.getMatchups(leagueId, week)
          const byId = new Map<number, typeof rows>()
          for (const r of rows ?? []) {
            if (r?.matchup_id == null || r?.roster_id == null) continue
            byId.set(r.matchup_id, [...(byId.get(r.matchup_id) ?? []), r])
          }
          const results: Record<string, 'W' | 'L' | 'T'> = {}
          const points: Record<string, number> = {}
          for (const list of byId.values()) {
            if (list.length !== 2) continue
            const [a, c] = list
            points[key(a.roster_id)] = Number(a.points ?? 0)
            points[key(c.roster_id)] = Number(c.points ?? 0)
            const pa = Number(a.points ?? 0)
            const pc = Number(c.points ?? 0)
            if (pa === pc) { results[key(a.roster_id)] = 'T'; results[key(c.roster_id)] = 'T' }
            else if (pa > pc) { results[key(a.roster_id)] = 'W'; results[key(c.roster_id)] = 'L' }
            else { results[key(a.roster_id)] = 'L'; results[key(c.roster_id)] = 'W' }
          }
          return Object.keys(results).length ? { week, results, points } : null
        } catch { return null }
      }),
    )

    const sched = await Promise.all(
      Array.from({ length: Math.max(0, ew - cw + 1) }, (_, i) => cw + i).map(
        async (week): Promise<ScheduleWeek | null> => {
          try {
            const matchups = await pairsFor(week)
            return matchups.length ? { week, matchups } : null
          } catch { return null }
        },
      ),
    )
    remainingSchedule.value = sched.filter((w): w is ScheduleWeek => w != null)
    return past.filter((w): w is WeekOutcomes => w != null)
  }

  async function load(opts?: { categoryForm?: boolean }) {
    const leagueStore = useLeagueStore()
    const leagueKey = leagueStore.activeLeagueId
    if (!leagueKey) return
    const requested = leagueKey
    loading.value = true
    try {
      const platform = leagueStore.activePlatform
      const result =
        platform === 'espn'
          ? await loadEspn(leagueKey)
          : platform === 'sleeper'
            ? await loadSleeper(leagueKey)
            : await loadYahoo(leagueKey, opts?.categoryForm)
      if (leagueStore.activeLeagueId !== requested) return
      outcomes.value = result
      loaded.value = true
    } catch (e) {
      console.error('[usePowerTrajectory] load failed', e)
      outcomes.value = []
      remainingSchedule.value = []
      loaded.value = true
    } finally {
      if (leagueStore.activeLeagueId === requested) loading.value = false
    }
  }

  return { outcomes, currentWeek, weeksLeft, playoffSpots, remainingSchedule, loading, loaded, load }
}
