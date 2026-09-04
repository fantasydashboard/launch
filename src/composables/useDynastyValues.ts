import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { getDynastyValues, type DynastyParams } from '@/services/dynastyService'
import { buildDynastyRows, type DynastyRow, type DynastySource } from '@/football/dynastyValues'
import { useCustomRankings, UFD_LABEL } from '@/composables/useCustomRankings'

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
  /** Everyone the board can show, so an uploaded list can be matched by name. */
  players?: Ref<{ playerKey: string; name: string; position?: string }[]> | ComputedRef<{ playerKey: string; name: string; position?: string }[]>
}): {
  isDynasty: ComputedRef<boolean>
  rows: ComputedRef<Record<string, DynastyRow>>
  /** True once a fetch has resolved with usable data — the flag views gate the column on. */
  ready: ComputedRef<boolean>
  loading: Ref<boolean>
  load: () => void
  /** Whose dynasty order the board is in — the market, or a list you uploaded. */
  sourceName: ComputedRef<string>
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

  const custom = useCustomRankings('dynasty')
  const marketRows = computed(() => (source.value.length ? buildDynastyRows(source.value) : {}))

  /*
   * An uploaded list REPLACES the market order rather than sitting beside it.
   *
   * The rest-of-season picker shipped as a cosmetic re-sort of one card while every number
   * around it stayed on our own order, and a control that cannot change what you are told is
   * worse than no control. So a dynasty list you upload becomes the dynasty ranking: the sort,
   * the DYN column, the buy-low read, all of it.
   *
   * Value is carried over from the market where we have it, because a ranking gives an ORDER
   * and the trade delta needs magnitudes. A player your list ranks but the market has never
   * priced still gets a rank; he simply contributes nothing to a deal total, which is the
   * same rule as before and is why a trade containing him refuses to score.
   */
  const rows = computed<Record<string, DynastyRow>>(() => {
    const market = marketRows.value
    const list = inputs.players?.value ?? []
    if (!custom.enabled.value || !list.length) return market

    const { rankByKey } = custom.match(list)
    if (!Object.keys(rankByKey).length) return market

    const ordered = list
      .filter((p) => rankByKey[p.playerKey])
      .sort((a, b) => rankByKey[a.playerKey] - rankByKey[b.playerKey])

    const seenByPos = new Map<string, number>()
    const out: Record<string, DynastyRow> = {}
    ordered.forEach((p, i) => {
      const pos = (p.position ?? '').toUpperCase().split(/[,/|]/)[0].trim()
      const n = (seenByPos.get(pos) ?? 0) + 1
      seenByPos.set(pos, n)
      const m = market[p.playerKey]
      out[p.playerKey] = {
        playerKey: p.playerKey,
        value: m?.value ?? 0,
        redraftValue: m?.redraftValue ?? 0,
        age: m?.age ?? null,
        lean: m?.lean ?? 'level',
        skew: m?.skew ?? 0,
        overallRank: i + 1,
        positionRank: n,
      }
    })
    return out
  })

  const ready = computed(() => isDynasty.value && Object.keys(rows.value).length > 0)
  const sourceName = computed(() => (custom.enabled.value ? custom.sourceName.value : UFD_LABEL))

  return { isDynasty, rows, ready, loading, load, sourceName }
}
