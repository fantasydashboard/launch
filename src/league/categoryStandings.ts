import type { TeamCategoryTotals } from '@/trades/standings'

/**
 * Where every team stands in every scored category.
 *
 * THE GAP THIS FILLS. A category manager's whole season is one question — which columns am I
 * winning, which am I losing, and by how much — and the League page could not answer it. It
 * showed one strength number per team, which is the right summary and the wrong tool: "4th of
 * twelve" tells a manager nothing about WHERE, and a category league is decided entirely by
 * where. A points manager can read a single total because his league has an exchange rate; a
 * category manager cannot, because his does not.
 *
 * ONE RANKED COLUMN PER CATEGORY, with every team in it. The rank alone would be cheaper and
 * much less useful: being 8th in average is a different problem when the seven above you are
 * bunched inside two points than when they are strung out, and only the column shows that.
 *
 * Lower-is-better categories are handled where they are defined rather than at the call site,
 * because ERA and WHIP being backwards is exactly the sort of thing a caller forgets once and
 * then prints a league leader who is last.
 */

export interface CategorySpec {
  statId: string
  lowerIsBetter: boolean
  /** Hitting or pitching, skaters or goalies — used only to group the display. */
  side?: string
  /** A rate rather than a count — a ratio with no volume behind it is not a zero. */
  isRatio?: boolean
}

/**
 * The value to SORT on, which is not always the value to print.
 *
 * Matches `sortValue` in trades/standings.ts deliberately: a team with no entry in a category
 * sorts last, and so does a ratio with nothing behind it. Treating a missing value as zero is
 * only harmless where bigger is better — in a lower-is-better column it crowns the team we know
 * nothing about as the league leader, which is how an empty ERA becomes a first place.
 */
function sortValue(v: number | undefined, spec: CategorySpec, hasEntry: boolean): number {
  if (!hasEntry || !Number.isFinite(v as number)) return spec.lowerIsBetter ? Infinity : -Infinity
  return v as number
}

export interface CategoryTeamRow {
  teamKey: string
  value: number
  /** What the ordering used — differs from `value` for a missing or empty-volume entry. */
  sort: number
  /** 1 = best in this category. Ties share a rank, as a league's own standings do. */
  rank: number
}

export interface CategoryColumn {
  statId: string
  side?: string
  lowerIsBetter: boolean
  /**
   * A rate rather than a count. Carried through to the display because how a number should be
   * PRINTED is a fact about the column, not about how big the number happens to be: formatting
   * on magnitude alone printed a hockey team's plus-minus of -2 as "-3.819".
   */
  isRatio: boolean
  /** Every team, best first. */
  rows: CategoryTeamRow[]
  /** Where the viewing team sits, 0 when he is not in this league's totals. */
  myRank: number
  myValue: number
  teams: number
  /**
   * How far from the next place up, in the category's own units. The number that turns "8th"
   * into a decision: a tenth of a point of average is a waiver claim, half a run of ERA is not.
   * Null at the top, where there is nothing to chase.
   */
  gapToNext: number | null
  /** Same, downward — what you are defending. Null at the bottom. */
  gapToPrev: number | null
}

export interface CategoryStandings {
  columns: CategoryColumn[]
  /** Categories where the viewing team is top third, bottom third — the headline read. */
  strong: string[]
  weak: string[]
  teams: number
}

/**
 * Rank every team in every category.
 *
 * Returns an empty board rather than throwing when a league has no totals yet — preseason is a
 * real state, not an error, and the view says so in its own words.
 */
/**
 * Distance to the nearest team on a DIFFERENT rank, walking up (-1) or down (+1).
 *
 * Null when there is nobody in that direction — the top of a column has nothing to chase, and
 * a column where everyone is level has nothing in either.
 */
function gapTo(rows: CategoryTeamRow[], from: number, step: -1 | 1): number | null {
  if (from < 0) return null
  const mine = rows[from]
  for (let i = from + step; i >= 0 && i < rows.length; i += step) {
    if (rows[i].rank !== mine.rank) return Math.abs(rows[i].value - mine.value)
  }
  return null
}

export function buildCategoryStandings(
  totals: TeamCategoryTotals[],
  specs: CategorySpec[],
  myTeamKey: string,
): CategoryStandings {
  const teams = totals.length
  if (!teams || !specs.length) return { columns: [], strong: [], weak: [], teams: 0 }

  const third = Math.max(1, Math.round(teams / 3))
  const columns: CategoryColumn[] = []

  for (const spec of specs) {
    const rows = totals
      .map((t) => {
        const agg = t.cats?.[spec.statId]
        const hasEntry = !!agg && !(spec.isRatio && (agg.den ?? 0) <= 0)
        return {
          teamKey: t.teamId,
          value: Number(agg?.value ?? 0),
          sort: sortValue(Number(agg?.value), spec, hasEntry),
          rank: 0,
        }
      })
      .sort((a, b) => (spec.lowerIsBetter ? a.sort - b.sort : b.sort - a.sort))

    /* Ties share a rank and then skip, which is how every standings table a manager has ever
       read behaves — 1,2,2,4 rather than 1,2,2,3. */
    let rank = 0
    let prev = Number.NaN
    rows.forEach((r, i) => {
      /* Tie on the SORT value, not the printed one: two teams with no entry are level with each
         other, and their printed zeros would otherwise tie them with a genuine zero. */
      if (r.sort !== prev) { rank = i + 1; prev = r.sort }
      r.rank = rank
    })

    const mine = rows.find((r) => r.teamKey === myTeamKey)
    const myIdx = mine ? rows.indexOf(mine) : -1
    columns.push({
      statId: spec.statId,
      side: spec.side,
      lowerIsBetter: spec.lowerIsBetter,
      isRatio: !!spec.isRatio,
      rows,
      myRank: mine?.rank ?? 0,
      myValue: mine?.value ?? 0,
      teams,
      /*
       * MEASURED AGAINST A BETTER RANK, not against the next row.
       *
       * Those are the same thing until two teams tie, and then they are not: tied teams share a
       * rank but hold different positions in the array, so the row above can be a team level
       * with you. A real league found this immediately — a column where every team sat on zero
       * printed "1st" beside ".000 behind 0th", which is three wrong things in four words.
       */
      gapToNext: gapTo(rows, myIdx, -1),
      gapToPrev: gapTo(rows, myIdx, +1),
    })
  }

  const strong = columns.filter((c) => c.myRank > 0 && c.myRank <= third).map((c) => c.statId)
  const weak = columns.filter((c) => c.myRank > 0 && c.myRank > teams - third).map((c) => c.statId)
  return { columns, strong, weak, teams }
}
