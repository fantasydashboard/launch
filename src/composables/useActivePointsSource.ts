import { computed, type ComputedRef } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useEspnPointsTeamData } from '@/composables/useEspnPointsTeamData'
import { useYahooLeaguePool } from '@/composables/useYahooLeaguePool'
import { useSleeperLeaguePool } from '@/composables/useSleeperLeaguePool'
import { useAvailablePlayers } from '@/composables/useAvailablePlayers'
import type { PointsPoolPlayer } from '@/myteam/pointsTeam'
import type { OutlookTeamMeta } from '@/myteam/seasonOutlook'
import type { AvailablePlayer } from '@/players/types'
import type { FGProjection } from '@/services/projectionService'

export function yahooMyTeamKey(teams: any[]): string {
  const me = (teams ?? []).find((t) => t?.is_my_team)
  return me ? String(me.team_key) : ''
}
export function yahooTeamNames(teams: any[]): Record<string, string> {
  return Object.fromEntries((teams ?? []).map((t) => [String(t.team_key), String(t.name ?? '')]))
}
export function yahooTeamMeta(teams: any[]): Record<string, OutlookTeamMeta> {
  const out: Record<string, OutlookTeamMeta> = {}
  for (const t of teams ?? []) {
    out[String(t.team_key)] = {
      wins: Number(t.wins ?? 0), losses: Number(t.losses ?? 0), ties: Number(t.ties ?? 0), pointsFor: Number(t.points_for ?? 0),
    }
  }
  return out
}
export function yahooTeamLogos(teams: any[]): Record<string, string> {
  return Object.fromEntries((teams ?? []).map((t) => [String(t.team_key), String(t.logo_url ?? '')]))
}
export function espnTeamMeta(recs: Record<string, { wins: number; losses: number; ties: number; pointsFor: number }>): Record<string, OutlookTeamMeta> {
  const out: Record<string, OutlookTeamMeta> = {}
  for (const [k, r] of Object.entries(recs ?? {})) out[k] = { wins: r.wins, losses: r.losses, ties: r.ties, pointsFor: r.pointsFor }
  return out
}

export interface ActivePointsSource {
  pool: ComputedRef<PointsPoolPlayer[]>
  fgByKey: ComputedRef<Record<string, FGProjection | null>>
  rosterSlots: ComputedRef<Record<string, number>>
  loading: ComputedRef<boolean>
  myTeamKey: ComputedRef<string>
  myTeamName: ComputedRef<string>
  myTeamLogo: ComputedRef<string>
  myRecord: ComputedRef<string>
  teamNames: ComputedRef<Record<string, string>>
  teamMeta: ComputedRef<Record<string, OutlookTeamMeta>>
  teamLogos: ComputedRef<Record<string, string>>
  freeAgents: ComputedRef<AvailablePlayer[]>
  freeAgentsLoading: ComputedRef<boolean>
  load: () => void
  loadFreeAgents: (count?: number) => void
}

export function useActivePointsSource(): ActivePointsSource {
  const leagueStore = useLeagueStore()
  const espn = useEspnPointsTeamData()
  const yahoo = useYahooLeaguePool()
  const sleeper = useSleeperLeaguePool()
  const avail = useAvailablePlayers()

  const platform = computed(() => leagueStore.activePlatform)
  const isEspn = computed(() => platform.value === 'espn')
  const isSleeper = computed(() => platform.value === 'sleeper')

  const pool = computed<PointsPoolPlayer[]>(() =>
    (isEspn.value ? espn.pool.value : isSleeper.value ? sleeper.pool.value : yahoo.pool.value) as PointsPoolPlayer[],
  )
  const fgByKey = computed(() => (isEspn.value ? espn.fgByKey.value : isSleeper.value ? sleeper.fgByKey.value : yahoo.fgByKey.value))
  const rosterSlots = computed(() => (isEspn.value ? espn.rosterSlots.value : isSleeper.value ? sleeper.rosterSlots.value : yahoo.rosterSlots.value))
  const loading = computed(() => (isEspn.value ? espn.loading.value : isSleeper.value ? sleeper.loading.value : yahoo.loading.value))

  const myTeamKey = computed(() =>
    isEspn.value ? (espn.myTeamId.value ?? '') : isSleeper.value ? sleeper.myTeamKey.value : yahooMyTeamKey(leagueStore.yahooTeams as any),
  )
  const myTeamName = computed(() => {
    if (isEspn.value) return espn.myTeamName.value || 'My Team'
    if (isSleeper.value) return sleeper.myTeamName.value
    const me = (leagueStore.yahooTeams ?? []).find((t: any) => t?.is_my_team)
    return String(me?.name ?? 'My Team')
  })
  const myTeamLogo = computed(() => {
    if (isEspn.value) return espn.myTeamLogo.value
    if (isSleeper.value) return sleeper.myTeamLogo.value
    const me = (leagueStore.yahooTeams ?? []).find((t: any) => t?.is_my_team)
    return String(me?.logo_url ?? '')
  })
  const myRecord = computed(() => (isEspn.value ? espn.myRecord.value : isSleeper.value ? sleeper.myRecord.value : ''))

  const teamNames = computed(() =>
    isEspn.value ? espn.teamNames.value : isSleeper.value ? sleeper.teamNames.value : yahooTeamNames(leagueStore.yahooTeams as any),
  )
  const teamMeta = computed(() =>
    isEspn.value ? espnTeamMeta(espn.teamRecords.value) : isSleeper.value ? sleeper.teamMeta.value : yahooTeamMeta(leagueStore.yahooTeams as any),
  )
  const teamLogos = computed(() =>
    isEspn.value ? espn.teamLogos.value : isSleeper.value ? sleeper.teamLogos.value : yahooTeamLogos(leagueStore.yahooTeams as any),
  )

  const freeAgents = computed<AvailablePlayer[]>(() =>
    isEspn.value ? (espn.freeAgents.value as any) : isSleeper.value ? sleeper.freeAgents.value : avail.players.value,
  )
  // ESPN loads FAs inside its own load()/loading; Sleeper derives them synchronously —
  // so only Yahoo has a separate FA-loading window (avail.load w/ retry/backoff) that can
  // still be running after yahoo.loading flips false.
  const freeAgentsLoading = computed(() => (!isEspn.value && !isSleeper.value ? avail.loading.value : false))

  function load() {
    if (isEspn.value) espn.load()
    else if (isSleeper.value) sleeper.load()
    else yahoo.load()
  }
  function loadFreeAgents(count = 200) {
    if (!isEspn.value && !isSleeper.value) avail.load(count)
  }

  return { pool, fgByKey, rosterSlots, loading, myTeamKey, myTeamName, myTeamLogo, myRecord, teamNames, teamMeta, teamLogos, freeAgents, freeAgentsLoading, load, loadFreeAgents }
}
