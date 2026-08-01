import { computed, ref, type ComputedRef } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { sleeperService } from '@/services/sleeper'
import { parseRosterSlots } from '@/trades/rosterSlots'
import { buildPlayerMatchers, type FGProjection } from '@/services/projectionService'
import type { PointsPoolPlayer } from '@/myteam/pointsTeam'
import type { OutlookTeamMeta } from '@/myteam/seasonOutlook'
import type { AvailablePlayer } from '@/players/types'
import type { SleeperRoster, SleeperUser, SleeperPlayer } from '@/types/sleeper'

const FA_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE', 'K', 'DEF'])
const OUT_STATUSES = new Set(['OUT', 'IR', 'PUP', 'SUSP', 'NA', 'DNR'])

function isOut(injury?: string | null): boolean {
  const u = String(injury ?? '').toUpperCase()
  return OUT_STATUSES.has(u)
}

export function buildSleeperPool(
  rosters: SleeperRoster[],
  players: Record<string, SleeperPlayer>,
): PointsPoolPlayer[] {
  const out: PointsPoolPlayer[] = []
  for (const r of rosters) {
    for (const pid of r.players ?? []) {
      const p = players[pid]
      if (!p) continue
      out.push({
        playerKey: pid,
        name: p.full_name || `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(),
        position: p.position || (p.fantasy_positions?.[0] ?? ''),
        eligiblePositions: p.fantasy_positions?.length ? p.fantasy_positions : (p.position ? [p.position] : []),
        teamKey: String(r.roster_id),
        proTeam: p.team ?? '',
        headshot: `https://sleepercdn.com/content/nfl/players/thumb/${pid}.jpg`,
        onIL: isOut(p.injury_status),
        status: p.injury_status ?? p.status ?? '',
      })
    }
  }
  return out
}

export function sleeperMyTeamKey(rosters: SleeperRoster[], currentUserId: string | null): string {
  if (!currentUserId) return ''
  const mine = rosters.find((r) => r.owner_id === currentUserId)
  return mine ? String(mine.roster_id) : ''
}

export function buildSleeperTeamNames(rosters: SleeperRoster[], users: SleeperUser[]): Record<string, string> {
  const userById = new Map(users.map((u) => [u.user_id, u]))
  const out: Record<string, string> = {}
  for (const r of rosters) out[String(r.roster_id)] = sleeperService.getTeamName(r, userById.get(r.owner_id))
  return out
}

// All-teams avatar map (not just "my team") — used by league-wide boards (Power
// Rankings, League) that render every roster's logo, not only the viewer's own.
export function buildSleeperTeamLogos(
  rosters: SleeperRoster[],
  users: SleeperUser[],
  league: import('@/types/sleeper').SleeperLeague | null,
): Record<string, string> {
  if (!league) return {}
  const userById = new Map(users.map((u) => [u.user_id, u]))
  const out: Record<string, string> = {}
  for (const r of rosters) out[String(r.roster_id)] = sleeperService.getAvatarUrl(r, userById.get(r.owner_id), league)
  return out
}

export function buildSleeperTeamMeta(rosters: SleeperRoster[]): Record<string, OutlookTeamMeta> {
  const out: Record<string, OutlookTeamMeta> = {}
  for (const r of rosters) {
    const s: any = r.settings ?? {}
    out[String(r.roster_id)] = {
      wins: Number(s.wins ?? 0),
      losses: Number(s.losses ?? 0),
      ties: Number(s.ties ?? 0),
      pointsFor: Number(s.fpts ?? 0) + Number(s.fpts_decimal ?? 0) / 100,
    }
  }
  return out
}

export function buildSleeperFreeAgents(
  rosters: SleeperRoster[],
  players: Record<string, SleeperPlayer>,
): AvailablePlayer[] {
  const rostered = new Set<string>()
  for (const r of rosters) for (const pid of r.players ?? []) rostered.add(pid)
  const out: AvailablePlayer[] = []
  for (const [pid, p] of Object.entries(players)) {
    if (rostered.has(pid)) continue
    if (!p.team) continue
    const pos = p.position || (p.fantasy_positions?.[0] ?? '')
    if (!FA_POSITIONS.has(pos)) continue
    out.push({
      playerKey: pid,
      name: p.full_name || `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(),
      position: pos,
      eligiblePositions: p.fantasy_positions?.length ? p.fantasy_positions : [pos],
      team: p.team,
      percentOwned: 0,
      status: p.injury_status ?? '',
      stats: {},
    })
  }
  return out
}

export function useSleeperLeaguePool(): {
  pool: ComputedRef<PointsPoolPlayer[]>
  fgByKey: ComputedRef<Record<string, FGProjection | null>>
  rosterSlots: ComputedRef<Record<string, number>>
  myTeamKey: ComputedRef<string>
  myTeamName: ComputedRef<string>
  myTeamLogo: ComputedRef<string>
  myRecord: ComputedRef<string>
  teamNames: ComputedRef<Record<string, string>>
  teamMeta: ComputedRef<Record<string, OutlookTeamMeta>>
  teamLogos: ComputedRef<Record<string, string>>
  freeAgents: ComputedRef<AvailablePlayer[]>
  loading: ComputedRef<boolean>
  loaded: ComputedRef<boolean>
  supported: ComputedRef<boolean>
  load: () => void
} {
  const leagueStore = useLeagueStore()

  const pool = computed(() => buildSleeperPool(leagueStore.rosters as any, leagueStore.players as any))

  const matchFG = ref<((p: { full_name?: string; mlb_team?: string }) => FGProjection | null) | null>(null)
  const fgByKey = computed<Record<string, FGProjection | null>>(() => {
    const m = matchFG.value
    if (!m) return {}
    const out: Record<string, FGProjection | null> = {}
    for (const p of pool.value) out[p.playerKey] = m({ full_name: p.name, mlb_team: p.proTeam })
    return out
  })

  const rosterSlots = computed(() =>
    parseRosterSlots('sleeper', { roster_positions: leagueStore.currentLeague?.roster_positions ?? [] }, leagueStore.activeSport),
  )

  const myTeamKey = computed(() => sleeperMyTeamKey(leagueStore.rosters as any, leagueStore.currentUserId))
  const teamNames = computed(() => buildSleeperTeamNames(leagueStore.rosters as any, leagueStore.users as any))
  const teamMeta = computed(() => buildSleeperTeamMeta(leagueStore.rosters as any))
  const teamLogos = computed(() => buildSleeperTeamLogos(leagueStore.rosters as any, leagueStore.users as any, leagueStore.currentLeague as any))
  const freeAgents = computed(() => buildSleeperFreeAgents(leagueStore.rosters as any, leagueStore.players as any))

  const myRoster = computed(() => (leagueStore.rosters as any as SleeperRoster[]).find((r) => r.owner_id === leagueStore.currentUserId))
  const userById = computed(() => new Map((leagueStore.users as any as SleeperUser[]).map((u) => [u.user_id, u])))
  const myTeamName = computed(() => (myRoster.value ? sleeperService.getTeamName(myRoster.value, userById.value.get(myRoster.value.owner_id)) : 'My Team'))
  const myTeamLogo = computed(() =>
    myRoster.value && leagueStore.currentLeague
      ? sleeperService.getAvatarUrl(myRoster.value, userById.value.get(myRoster.value.owner_id), leagueStore.currentLeague as any)
      : '',
  )
  const myRecord = computed(() => {
    const s: any = myRoster.value?.settings
    if (!s) return ''
    return `${s.wins ?? 0}-${s.losses ?? 0}${s.ties ? `-${s.ties}` : ''}`
  })

  // Loading until BOTH the roster list AND the players map are present — the pool needs both,
  // so `||` avoids flipping false (and flashing an empty pool) the instant rosters arrive.
  const loading = computed(() => Object.keys(leagueStore.players ?? {}).length === 0 || (leagueStore.rosters?.length ?? 0) === 0)
  const loaded = computed(() => (leagueStore.rosters?.length ?? 0) > 0)
  const supported = computed(() => true)

  function load() {
    if (!matchFG.value) buildPlayerMatchers().then((m) => { matchFG.value = m.matchFG })
  }

  return { pool, fgByKey, rosterSlots, myTeamKey, myTeamName, myTeamLogo, myRecord, teamNames, teamMeta, teamLogos, freeAgents, loading, loaded, supported, load }
}
