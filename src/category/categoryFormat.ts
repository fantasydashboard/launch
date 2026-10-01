import type { CategoryFormat } from './categoryLeverage'

/**
 * Which of the two category formats a league scores by.
 *
 * Both platforms publish it, and useIsCategoryLeague has been reading the string and collapsing
 * it into one boolean for as long as it has existed. The distinction decides the objective:
 *
 *   'each' — Yahoo `head`, ESPN H2H_CATEGORY. Every column won is a win in the standings, so
 *            the value of a column never changes. Taking back two columns in a week you have
 *            already lost is two wins, which is exactly why this format must NOT be given the
 *            clinch-and-gamble posture the other one needs.
 *
 *   'most' — Yahoo `headone`, ESPN H2H_MOST_CATEGORIES. Winning more columns than your opponent
 *            is one win, so a column is worth how often it decides the week — nothing once the
 *            week is settled either way.
 *
 * NULL IS A REAL ANSWER. Roto is a different game: you race the whole league rather than an
 * opponent, so neither objective applies, and useIsCategoryLeague already excludes it. An
 * unrecognised string returns null rather than defaulting, because 'each' is the
 * innocuous-looking default and it is the wrong one — it switches off the posture, so a
 * most-categories league would silently get risk-neutral advice in the weeks it can only win by
 * gambling. The caller shows the board without a posture rather than inventing one.
 */
export function categoryFormatOf(scoringType: string | null | undefined): CategoryFormat | null {
  const st = String(scoringType ?? '').trim().toLowerCase()
  if (!st) return null

  /* Most categories, one win for the week. */
  if (st === 'headone' || st === 'h2h_most_categories') return 'most'
  /* Every column counts on its own. */
  if (st === 'head' || st === 'h2h_category' || st === 'headcategory') return 'each'

  return null
}
