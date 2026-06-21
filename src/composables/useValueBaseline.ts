import { ref } from 'vue'
import { loadProjectionData, mapToEspnStats, type FGProjection } from '@/services/projectionService'
import { computeValueBaseline, type ValueBaseline } from '@/myteam/value'
import type { CatSpec, ValuePoolPlayer } from '@/myteam/types'

// The full FanGraphs projection universe is league-independent, so cache it once per
// session across every page that anchors value to it.
let universeCache: FGProjection[] | null = null

/**
 * Loads the full projected-player universe and turns it into a per-category value
 * baseline for a given league's categories. Anchoring player value to this universe
 * (instead of the league's own rostered pool) is what makes "VS ALL" reflect real
 * player quality — a league-leading skill scores a big z, breadth no longer wins.
 */
export function useValueBaseline() {
  const ready = ref(!!universeCache)

  async function load() {
    if (universeCache) {
      ready.value = true
      return
    }
    const { projections } = await loadProjectionData()
    universeCache = projections
    ready.value = true
  }

  /** Build the baseline for THESE league categories. Null until the universe is loaded. */
  function build(catSpecs: CatSpec[], labelOf: (statId: string) => string): ValueBaseline | null {
    if (!universeCache?.length || !catSpecs.length) return null
    // Map each FG row into the league's stat shape. Include each ratio cat's VOLUME stat
    // (IP / AB) even when it isn't itself a scoring category, so the volume-weighted ratio
    // impact has a denominator and ratio cats actually contribute to value.
    const volSide = new Map<string, boolean>() // volumeStatId -> isPitching
    for (const c of catSpecs) if (c.volumeStatId) volSide.set(c.volumeStatId, c.side === 'pit')
    const fgCats = [
      ...catSpecs.map((c) => ({ stat_id: c.statId, display_name: labelOf(c.statId), isPitching: c.side === 'pit' })),
      ...[...volSide.entries()]
        .filter(([id]) => !catSpecs.some((c) => c.statId === id))
        .map(([id, isPit]) => ({ stat_id: id, display_name: labelOf(id), isPitching: isPit })),
    ]
    const pool: ValuePoolPlayer[] = universeCache.map((fg) => ({
      playerKey: String(fg.mlbam_id),
      // Side gate only needs hitter-vs-pitcher; per-cat participation is stat-gated.
      position: fg.player_type === 'pitcher' ? 'SP' : 'OF',
      stats: mapToEspnStats(fg, fgCats),
    }))
    return computeValueBaseline(pool, catSpecs)
  }

  return { load, build, ready }
}
