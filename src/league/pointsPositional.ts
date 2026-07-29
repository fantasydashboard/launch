import { parseEligible, type PointsPoolPlayer } from '@/myteam/pointsTeam'
import type { ValueByKey } from '@/myteam/playerValue'

const POSITIONS = ['C', '1B', '2B', '3B', 'SS', 'OF', 'SP', 'RP']

export interface PosCell {
  teamKey: string
  points: number | null // best startable player's projected points at this position; null = none
  rank: number | null // 1 = best in the league at this position
}
export interface PosRow {
  position: string
  cells: PosCell[] // aligned to the teamKeys passed in
}
export interface PositionalGrid {
  positions: PosRow[]
}

/** Each team's best projected-points player at each lineup position, ranked across the
 *  league — the points-league analog of the category landscape. */
export function buildPointsPositional(
  pool: PointsPoolPlayer[],
  valueByKey: ValueByKey,
  teamKeys: string[],
): PositionalGrid {
  const ptsOf = (key: string) => valueByKey[key]?.total ?? 0
  const positions: PosRow[] = POSITIONS.map((pos) => {
    const best = new Map<string, number>()
    for (const p of pool) {
      if (!parseEligible(p).includes(pos)) continue
      const pts = ptsOf(p.playerKey)
      if (!best.has(p.teamKey) || pts > best.get(p.teamKey)!) best.set(p.teamKey, pts)
    }
    const ranked = [...best.entries()].sort((a, b) => b[1] - a[1])
    const rankByTeam = new Map<string, number>()
    ranked.forEach(([k], i) => rankByTeam.set(k, i + 1))
    const cells: PosCell[] = teamKeys.map((tk) => ({
      teamKey: tk,
      points: best.has(tk) ? best.get(tk)! : null,
      rank: rankByTeam.get(tk) ?? null,
    }))
    return { position: pos, cells }
  }).filter((row) => row.cells.some((c) => c.rank != null))
  return { positions }
}
