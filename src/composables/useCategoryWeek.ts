import { computed, type ComputedRef, type Ref } from 'vue'
import { categoryFormatOf } from '@/category/categoryFormat'
import { hockeyCategoryWeek } from '@/category/hockeyCategoryWeek'
import type { CategoryWeek } from '@/category/categoryWeek'

/**
 * Your category week, live — which columns are still in play and what is worth chasing.
 *
 * WHAT IT REPLACES ON SCREEN. The Today page showed a category league a seat-by-seat player
 * comparison with a points margin beside each man, which is the wrong question entirely: a
 * category league is not won by out-scoring an opponent seat for seat, it is won column by
 * column. A manager looking at that board cannot tell which columns he is winning, which are
 * gone, or where tonight's start would actually land.
 *
 * NULL IS A REAL ANSWER AND THE COMMON ONE. Everything here depends on a live scoreboard, a
 * readable slate, a format we recognise and a projection feed. Any of them missing and this
 * returns null so the page keeps what it had — a half-built column view is worse than the
 * imperfect one it replaces, because it looks finished.
 */

export interface CategoryWeekInputs {
  /** Live matchup snapshot — totals keyed by platform stat id, and days left. */
  snapshot: Ref<{ myStats: Record<string, number>; oppStats: Record<string, number>; daysRemaining: number } | null>
  /** Every rostered player in the league, both sides. */
  pool: Ref<Array<{ playerKey: string; name: string; teamKey: string; proTeam?: string }>>
  myTeamKey: Ref<string>
  opponentKey: Ref<string>
  /** Games each club has left in the window. */
  gamesByTeam: Ref<Record<string, number>>
  /** The league's columns, carrying our key and the platform's stat id. */
  categories: Ref<Array<{ key: string; statId: number; reverse: boolean }>>
  /** A player's raw projected line, by name. */
  projectionOf: Ref<(p: { name?: string }) => { stats: Record<string, number> } | null>
  /**
   * The league's own scoring_type, straight off settings.
   *
   * Passed in rather than read from the store so the objective this whole thing optimises for
   * is visible at the call site, and so it can be tested without a store at all.
   */
  scoringType: Ref<string | undefined>
}

export function useCategoryWeek(inputs: CategoryWeekInputs): {
  week: ComputedRef<CategoryWeek | null>
  /** Why there is nothing to show, when there is nothing to show. */
  reason: ComputedRef<string | null>
} {
  /*
   * Which objective the league scores by. Null means we do not recognise the format — roto, or
   * something new — and the honest response is to show nothing rather than pick one, because
   * the two formats disagree about whether a lost week is worth playing out.
   */
  const format = computed(() => categoryFormatOf(inputs.scoringType.value))

  const reason = computed<string | null>(() => {
    if (!format.value) return 'format'
    if (!inputs.snapshot.value) return 'no-matchup'
    if (!inputs.categories.value.length) return 'no-categories'
    if (!inputs.opponentKey.value) return 'no-opponent'
    if (!Object.keys(inputs.gamesByTeam.value ?? {}).length) return 'no-schedule'
    return null
  })

  const week = computed<CategoryWeek | null>(() => {
    if (reason.value) return null
    const snap = inputs.snapshot.value!
    return hockeyCategoryWeek({
      categories: inputs.categories.value,
      myStats: snap.myStats ?? {},
      oppStats: snap.oppStats ?? {},
      pool: inputs.pool.value ?? [],
      projectionFor: inputs.projectionOf.value,
      myTeamKey: inputs.myTeamKey.value,
      oppTeamKey: inputs.opponentKey.value,
      gamesByTeam: inputs.gamesByTeam.value ?? {},
      days: Math.max(0, Number(snap.daysRemaining) || 0),
      format: format.value!,
    })
  })

  return { week, reason }
}
