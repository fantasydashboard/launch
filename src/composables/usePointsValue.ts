import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import type { PointsPoolPlayer } from '@/myteam/pointsTeam'
import type { FGProjection } from '@/services/projectionService'
import { useHockeyValue } from '@/composables/useHockeyValue'
import type { FootballProjection, ProjPlayer } from '@/football/buildFootballProjections'
import { normalizeNflName } from '@/football/buildFootballProjections'
import {
  buildBaseballValue, buildFootballValue, baseballValueOne, footballValueOne,
  type PlayerValue, type ValueByKey,
} from '@/myteam/playerValue'
import { useLeagueScoring } from '@/composables/useLeagueScoring'
import { useFootballProjections } from '@/composables/useFootballProjections'
import { usePowerTrajectory } from '@/composables/usePowerTrajectory'
import { buildPlayerMatchers } from '@/services/projectionService'
import { defaultWeights } from '@/myteam/pointsScoring'

export function poolToProjPlayers(pool: PointsPoolPlayer[]): ProjPlayer[] {
  return pool.map((p) => ({ key: p.playerKey, name: p.name, position: p.position }))
}

/** name+position → FootballProjection, for resolving players not in valueByKey (free agents).
 *  `players` accepts anything with `{ playerKey?, name, position }` (rostered pool OR free
 *  agents), looked up in projByKey by roster key, falling back to the `fa:<name>` FA key. */
export function footballNamePosIndex(
  projByKey: Record<string, FootballProjection>,
  players: Array<{ playerKey?: string; name: string; position: string }>,
): Map<string, FootballProjection> {
  const idx = new Map<string, FootballProjection>()
  for (const p of players) {
    const proj = projByKey[p.playerKey ?? `fa:${p.name}`]
    if (proj) idx.set(`${normalizeNflName(p.name)}|${(p.position || '').toUpperCase().split(/[,/|]/)[0]}`, proj)
  }
  return idx
}

export function usePointsValue(inputs: {
  pool: Ref<PointsPoolPlayer[]>
  fgByKey: Ref<Record<string, FGProjection | null>>
  sport: Ref<string>
  season: Ref<string>
  /** The active league key, which hockey needs to read that league's own scoring. */
  leagueId?: Ref<string>
  // Optional free-agent pool (Wire only). Football projects + indexes these so a FA
  // that isn't in the rostered pool still resolves through valueOf.
  freeAgents?: Ref<Array<{ playerKey?: string; name: string; position: string; team?: string }>>
}): {
  valueByKey: ComputedRef<ValueByKey>
  valueOf: ComputedRef<(p: { name?: string; position?: string; team?: string }) => PlayerValue | null>
  loading: Ref<boolean>
  load: () => void
} {
  const isFootball = computed(() => inputs.sport.value === 'football')
  /*
   * HOCKEY WAS FALLING INTO THE BASEBALL BRANCH.
   *
   * This engine was a binary — football, or else baseball — so a hockey league was matched
   * against FanGraphs projections and found nothing. The Wire, Trades and My Team were not
   * missing for hockey; they were running the wrong sport and returning an empty board,
   * which looks identical to a sport with no free agents worth adding.
   */
  const isHockey = computed(() => inputs.sport.value === 'hockey')

  const scoring = useLeagueScoring()
  const trajectory = usePowerTrajectory()
  const weeksLeft = computed(() => Math.max(1, trajectory.weeksLeft?.value ?? 1))

  const projPlayers = computed<ProjPlayer[]>(() => {
    if (!isFootball.value) return []
    const fas = (inputs.freeAgents?.value ?? []).map((fa) => ({
      key: fa.playerKey ?? `fa:${fa.name}`, name: fa.name, position: fa.position,
    }))
    return [...poolToProjPlayers(inputs.pool.value), ...fas]
  })
  // v1: football uses the football pointsConfig defaults, NOT useLeagueScoring
  // (whose weights + normalizers are baseball-only). Custom football scoring is later.
  const footballScoring = computed(() => defaultWeights('football'))
  const football = useFootballProjections({
    players: projPlayers,
    scoring: footballScoring,
    season: inputs.season,
    enabled: isFootball,
  })

  /* ESPN league id out of the composite key `espn_{sport}_{leagueId}_{season}`. */
  const hockeyLeagueId = computed(() => {
    const parts = String(inputs.leagueId?.value ?? '').split('_')
    return parts.length >= 4 && parts[0] === 'espn' ? parts[2] : String(inputs.leagueId?.value ?? '')
  })
  const hockeySeason = computed(() => {
    const parts = String(inputs.leagueId?.value ?? '').split('_')
    const fromKey = parts.length >= 4 ? parseInt(parts[3], 10) : NaN
    if (Number.isFinite(fromKey) && fromKey > 2000) return fromKey
    const now = new Date()
    return now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear()
  })
  const hockey = useHockeyValue({
    leagueId: hockeyLeagueId,
    season: hockeySeason,
    enabled: isHockey,
    weeksLeft,
  })

  // Baseball free-agent matcher (name+team → FGProjection), lazy-loaded.
  const matchFG = ref<((p: { full_name?: string; mlb_team?: string }) => FGProjection | null) | null>(null)

  function load() {
    if (isFootball.value) {
      trajectory.load()
      football.load()
    } else if (isHockey.value) {
      trajectory.load()
      hockey.load()
    } else {
      scoring.load()
      if (!matchFG.value) buildPlayerMatchers().then((m) => { matchFG.value = m.matchFG })
    }
  }
  watch([inputs.sport, inputs.season], load, { immediate: true })

  const valueByKey = computed<ValueByKey>(() => {
    if (isFootball.value) return buildFootballValue(football.projByKey.value, weeksLeft.value)
    if (isHockey.value) return hockey.valueByKey.value
    return buildBaseballValue(inputs.fgByKey.value, scoring.weights.value)
  })

  const faIndex = computed(() => {
    if (!isFootball.value) return new Map<string, FootballProjection>()
    const players = [
      ...inputs.pool.value.map((p) => ({ playerKey: p.playerKey, name: p.name, position: p.position })),
      ...(inputs.freeAgents?.value ?? []).map((fa) => ({ playerKey: fa.playerKey ?? `fa:${fa.name}`, name: fa.name, position: fa.position })),
    ]
    return footballNamePosIndex(football.projByKey.value, players)
  })

  const valueOf = computed(() => (p: { name?: string; position?: string; team?: string }): PlayerValue | null => {
    if (isFootball.value) {
      const key = `${normalizeNflName(p.name ?? '')}|${(p.position || '').toUpperCase().split(/[,/|]/)[0]}`
      const proj = faIndex.value.get(key)
      return proj ? footballValueOne(proj, weeksLeft.value) : null
    }
    /* Hockey matches on name alone: the projection feed carries no team abbreviation the
       roster pool would agree with, and a name collision at NHL scale is rare enough to be
       a worse trade than missing every free agent. */
    if (isHockey.value) return hockey.valueOf.value({ name: p.name })
    const hasTeam = !!p.team && p.team.toUpperCase() !== 'FA'
    const fg = hasTeam && matchFG.value ? matchFG.value({ full_name: p.name, mlb_team: p.team }) : null
    return fg ? baseballValueOne(fg, scoring.weights.value) : null
  })

  const loading = computed(() => {
    if (isFootball.value) return football.loading.value
    if (isHockey.value) return hockey.loading.value
    return scoring.loading.value
  })

  return { valueByKey, valueOf, loading, load }
}
