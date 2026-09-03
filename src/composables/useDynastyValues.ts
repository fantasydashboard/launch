import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { getDynastyValues, type DynastyParams } from '@/services/dynastyService'
import { buildDynastyRows, type DynastyRow, type DynastySource } from '@/football/dynastyValues'

/** Sleeper league type: 0 redraft, 1 keeper, 2 dynasty. */
const DYNASTY_LEAGUE_TYPE = 2

/**
 * Dynasty values for the active league, keyed by our own playerKey.
 *
 * Two things this deliberately does NOT do:
 *
 *  - It does not replace anything. Our rest-of-season VOR is untouched and stays the number
 *    every existing calculation runs on. Dynasty rides alongside as a second currency, because
 *    the useful thing is the disagreement between the two horizons, and one blended score is
 *    exactly how that gets hidden.
 *
 *  - It does not fire for redraft leagues. A redraft manager has no use for a long-term market
 *    and no reason to spend a request on it.
 *
 * KEEPER LEAGUES (type 1) are treated as redraft here, on purpose. Keeper value depends on
 * what a player costs to keep and in which round — a different model we do not have. Guessing
 * with dynasty numbers would be confidently wrong for a format that is neither.
 */
export function useDynastyValues(inputs: {
  rosterSlots: Ref<Record<string, number>> | ComputedRef<Record<string, number>>
  leagueSize: Ref<number> | ComputedRef<number>
  scoring: Ref<Record<string, number>> | ComputedRef<Record<string, number>>
  enabled: Ref<boolean> | ComputedRef<boolean>
}): {
  isDynasty: ComputedRef<boolean>
  rows: ComputedRef<Record<string, DynastyRow>>
  /** True once a fetch has resolved with usable data — the flag views gate the column on. */
  ready: ComputedRef<boolean>
  loading: Ref<boolean>
  load: () => void
} {
  const leagueStore = useLeagueStore()
  const source = ref<DynastySource[]>([])
  const loading = ref(false)

  const leagueType = computed(() => Number((leagueStore.currentLeague as any)?.settings?.type ?? 0))
  const isDynasty = computed(() => leagueType.value === DYNASTY_LEAGUE_TYPE)

  /*
   * Superflex is the one parameter shown to move this provider's ordering — numQbs=2 lifts
   * Josh Allen from 18th overall to 2nd. numTeams and ppr are sent because they are part of
   * the documented query and cost nothing, but the same probe returned identical output for
   * them, so nothing here claims the values adapt to those.
   *
   * The signals themselves are the ones adpVariantFor already reads, so the dynasty market
   * and the draft market cannot end up describing two different leagues.
   */
  const params = computed<DynastyParams>(() => {
    const superFlex = (inputs.rosterSlots.value?.SUPER_FLEX ?? 0) > 0
    const rec = Number(inputs.scoring.value?.rec ?? 0)
    return {
      numQbs: superFlex ? 2 : 1,
      numTeams: Math.max(2, Math.floor(inputs.leagueSize.value || 12)),
      ppr: rec >= 1 ? 1 : rec > 0 ? 0.5 : 0,
    }
  })

  async function load() {
    if (!inputs.enabled.value || !isDynasty.value) {
      source.value = []
      return
    }
    loading.value = true
    try {
      source.value = await getDynastyValues(params.value)
    } finally {
      loading.value = false
    }
  }

  watch(
    () => [inputs.enabled.value, isDynasty.value, JSON.stringify(params.value)] as const,
    load,
    { immediate: true },
  )

  const rows = computed(() => (source.value.length ? buildDynastyRows(source.value) : {}))
  const ready = computed(() => isDynasty.value && Object.keys(rows.value).length > 0)

  return { isDynasty, rows, ready, loading, load }
}
