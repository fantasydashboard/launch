import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import type { PointsPoolPlayer } from '@/myteam/pointsTeam'
import type { FGProjection } from '@/services/projectionService'
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

/** name+position → FootballProjection, for resolving players not in valueByKey (free agents). */
export function footballNamePosIndex(
  projByKey: Record<string, FootballProjection>,
  pool: PointsPoolPlayer[],
): Map<string, FootballProjection> {
  const idx = new Map<string, FootballProjection>()
  for (const p of pool) {
    const proj = projByKey[p.playerKey]
    if (proj) idx.set(`${normalizeNflName(p.name)}|${(p.position || '').toUpperCase().split(/[,/|]/)[0]}`, proj)
  }
  return idx
}

export function usePointsValue(inputs: {
  pool: Ref<PointsPoolPlayer[]>
  fgByKey: Ref<Record<string, FGProjection | null>>
  sport: Ref<string>
  season: Ref<string>
}): {
  valueByKey: ComputedRef<ValueByKey>
  valueOf: ComputedRef<(p: { name?: string; position?: string; team?: string }) => PlayerValue | null>
  loading: Ref<boolean>
  load: () => void
} {
  const isFootball = computed(() => inputs.sport.value === 'football')

  const scoring = useLeagueScoring()
  const trajectory = usePowerTrajectory()
  const weeksLeft = computed(() => Math.max(1, trajectory.weeksLeft?.value ?? 1))

  const projPlayers = computed(() => (isFootball.value ? poolToProjPlayers(inputs.pool.value) : []))
  // v1: football uses the football pointsConfig defaults, NOT useLeagueScoring
  // (whose weights + normalizers are baseball-only). Custom football scoring is later.
  const footballScoring = computed(() => defaultWeights('football'))
  const football = useFootballProjections({
    players: projPlayers,
    scoring: footballScoring,
    season: inputs.season,
    enabled: isFootball,
  })

  // Baseball free-agent matcher (name+team → FGProjection), lazy-loaded.
  const matchFG = ref<((p: { full_name?: string; mlb_team?: string }) => FGProjection | null) | null>(null)

  function load() {
    if (isFootball.value) {
      trajectory.load()
      football.load()
    } else {
      scoring.load()
      if (!matchFG.value) buildPlayerMatchers().then((m) => { matchFG.value = m.matchFG })
    }
  }
  watch([inputs.sport, inputs.season], load, { immediate: true })

  const valueByKey = computed<ValueByKey>(() =>
    isFootball.value
      ? buildFootballValue(football.projByKey.value, weeksLeft.value)
      : buildBaseballValue(inputs.fgByKey.value, scoring.weights.value),
  )

  const faIndex = computed(() =>
    isFootball.value ? footballNamePosIndex(football.projByKey.value, inputs.pool.value) : new Map<string, FootballProjection>(),
  )

  const valueOf = computed(() => (p: { name?: string; position?: string; team?: string }): PlayerValue | null => {
    if (isFootball.value) {
      const key = `${normalizeNflName(p.name ?? '')}|${(p.position || '').toUpperCase().split(/[,/|]/)[0]}`
      const proj = faIndex.value.get(key)
      return proj ? footballValueOne(proj, weeksLeft.value) : null
    }
    const hasTeam = !!p.team && p.team.toUpperCase() !== 'FA'
    const fg = hasTeam && matchFG.value ? matchFG.value({ full_name: p.name, mlb_team: p.team }) : null
    return fg ? baseballValueOne(fg, scoring.weights.value) : null
  })

  const loading = computed(() => (isFootball.value ? football.loading.value : scoring.loading.value))

  return { valueByKey, valueOf, loading, load }
}
