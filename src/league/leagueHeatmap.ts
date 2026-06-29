import type { LandscapeView } from '@/composables/useLeagueLandscape'

export interface HeatCell {
  rank: number | null
  pct: number | null // 0..1 for color (1 = best). null when the team fields nobody in the cat.
}
export interface HeatRow {
  teamKey: string
  teamName: string
  isMe: boolean
  cells: HeatCell[] // aligned to `categories`
}
export interface Heatmap {
  categories: { key: string; label: string }[]
  rows: HeatRow[] // one per team, in the landscape's team order (YOU first)
}

/** Transpose the league landscape into a team × category heatmap of ranks (1 = best),
 *  with a 0..1 colour value so the UI can scale strong → weak. */
export function buildCategoryHeatmap(view: LandscapeView): Heatmap {
  const n = view.numTeams
  const categories = view.categoryRows.map((c) => ({ key: c.key, label: c.label }))
  const rows: HeatRow[] = view.teams.map((t, ti) => ({
    teamKey: t.key,
    teamName: t.name,
    isMe: t.isMe,
    cells: view.categoryRows.map((c) => {
      const rank = c.ranks[ti]
      const pct = rank == null || n <= 1 ? (rank == null ? null : 0.5) : (n - rank) / (n - 1)
      return { rank: rank ?? null, pct }
    }),
  }))
  return { categories, rows }
}
