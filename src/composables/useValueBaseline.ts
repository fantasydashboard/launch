import { ref } from 'vue'
import { loadProjectionData, mapToEspnStats, type FGProjection } from '@/services/projectionService'
import { attachRatioVolume } from '@/myteam/catVolume'
import { computeValueBaseline, type ValueBaseline } from '@/myteam/value'
import type { CatSpec, ValuePoolPlayer } from '@/myteam/types'

// The full FanGraphs projection universe is league-independent, so cache it once per
// session across every page that anchors value to it.
let universeCache: FGProjection[] | null = null

// The baseline reference population must be the STARTABLE pool, not every projected row.
// The full universe is dragged down by minor-leaguers and part-timers, which pushes every
// real MLB regular above the mean in nearly every category — so values compress into one
// high band and a broad compiler out-totals a concentrated star (the "Duran > Carroll" bug).
// Restricting the reference to everyday regulars makes the per-category mean a real starter,
// so an elite skill scores a big z and a merely-average regular sits near zero.
// Reference population = the most-used regulars on EACH side, taken as a TOP-K by playing time
// rather than an absolute PA/IP threshold. An absolute threshold (350 PA) filtered out nearly
// every batter when the projection universe is rest-of-season (PA is naturally low), leaving ~1
// startable batter and collapsing the hitter baseline. Top-K self-adjusts to any horizon and
// always keeps batters AND pitchers represented.
const BATTER_POOL = 300 // ≈ MLB regulars; the startable batter reference
const PITCHER_POOL = 300 // starters + the better relievers
const batterVol = (fg: FGProjection) => fg.pa ?? fg.ab ?? 0
function topByPlayingTime(rows: FGProjection[], vol: (fg: FGProjection) => number, n: number): FGProjection[] {
  return [...rows].sort((a, b) => vol(b) - vol(a)).slice(0, n)
}

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
    // Reference population: the top regulars on each side by playing time (see BATTER_POOL /
    // PITCHER_POOL), so the baseline always has both batters and pitchers — never collapses one
    // side to a degenerate std.
    const batters = universeCache.filter((fg) => fg.player_type !== 'pitcher')
    const pitchers = universeCache.filter((fg) => fg.player_type === 'pitcher')
    const refPop = [
      ...topByPlayingTime(batters, batterVol, BATTER_POOL),
      ...topByPlayingTime(pitchers, (fg) => fg.ip ?? 0, PITCHER_POOL),
    ]
    const pool: ValuePoolPlayer[] = refPop.map((fg) => ({
      playerKey: String(fg.mlbam_id),
      // Side gate only needs hitter-vs-pitcher; per-cat participation is stat-gated.
      position: fg.player_type === 'pitcher' ? 'SP' : 'OF',
      // attachRatioVolume covers ratio cats with a SYNTHETIC volume id (no AB/IP category),
      // which the display-name map above can't resolve — fills IP/PA straight from the row.
      stats: (() => { const s = mapToEspnStats(fg, fgCats); attachRatioVolume(s, fg, catSpecs); return s })(),
    }))
    return computeValueBaseline(pool, catSpecs)
  }

  return { load, build, ready }
}
