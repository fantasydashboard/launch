import { computed, type ComputedRef, type Ref } from 'vue'
import { scoreLine } from '@/category/categoryBoard'
import { perGameLine } from '@/category/nightlyLine'
import type { CategoryWeek } from '@/category/categoryWeek'
import type { RankedRow } from './useDailyLineup'

/**
 * Tonight's board, ranked by what your week actually needs.
 *
 * THE PROBLEM THIS SOLVES. The daily rankings sorted a category league by total category value
 * — a season-long measure of how good a player is across every column. That is the right
 * number for a draft and the wrong one for tonight. If you have banked goals and are two shots
 * behind, the man who helps you is the volume shooter, not the better hockey player; and a
 * board that puts the better hockey player on top is telling you to spend a move on a column
 * that cannot change your week. Worse, it reads as advice.
 *
 * So a column already banked or already lost is worth zero here, which falls out of
 * categoryLeverage rather than being special-cased: a win chance near 1 or near 0 has no
 * leverage left. Punting is not a mode you switch on — it is what the arithmetic says once a
 * column is gone.
 *
 * NOT A FALLBACK. If the week cannot be built, this returns null and the caller keeps the
 * existing board. A need-weighted board is only better than a value-weighted one when the
 * needs are real.
 */

/**
 * Probability is the native unit; percentage points are the readable one.
 *
 * scoreLine returns a win-probability sum, so a genuinely useful start is worth something like
 * 0.02. Rendered through the board's one-decimal formatter that is "0.0" for every row alive,
 * and the tier-divider threshold — an absolute drop of 0.05 in the displayed number — would
 * never fire. Scaling to percentage points gives the column a real meaning a manager can read
 * off the page ("this start is worth about two points of category win chance") and puts it on
 * the same magnitude as the points board the panel was built for.
 */
const AS_PCT_POINTS = 100

export interface CategoryRankedRow extends RankedRow {
  /**
   * What this start is worth tonight, in percentage points of category win chance, summed over
   * every column still in play. In an each-category league that is expected columns gained
   * x 100; in a most-categories one each column is first weighted by how often it decides the
   * week, so a start in a column that cannot swing the matchup is worth near nothing.
   */
  need: number
  /** The columns he actually moves, his best first — the sentence beside the number. */
  helps: string[]
}

export function useCategoryRankings(inputs: {
  rankings: Ref<RankedRow[]>
  week: Ref<CategoryWeek | null>
  /** A player's raw projected line — season totals, which is why perGameLine is in the way. */
  projectionOf: Ref<(p: { name?: string }) => { stats: Record<string, number> } | null>
}): { rows: ComputedRef<CategoryRankedRow[] | null> } {
  const rows = computed<CategoryRankedRow[] | null>(() => {
    const week = inputs.week.value
    if (!week) return null

    /*
     * With nothing live there is nothing to need. Every unitValue is zero, every score ties at
     * zero, and the sort collapses to whatever order the rows arrived in — which would present
     * an arbitrary list as a ranking. The honest answer is to hand the board back unweighted.
     */
    if (!week.cats.some((c) => c.unitValue > 0)) return null

    const scored: CategoryRankedRow[] = []
    for (const r of inputs.rankings.value ?? []) {
      const line = perGameLine(inputs.projectionOf.value({ name: r.name })?.stats)
      /* No line is no verdict. He stays off this board rather than being ranked last, which
         would say he is a worse play than the man above him instead of an unknown one. */
      if (!line) continue
      const { score, helps } = scoreLine(line, week.cats)
      scored.push({ ...r, need: score * AS_PCT_POINTS, helps })
    }

    return scored.sort((a, b) => b.need - a.need)
  })

  return { rows }
}
