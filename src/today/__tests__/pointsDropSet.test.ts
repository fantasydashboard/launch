/**
 * Regression coverage for the POINTS half of useToday.ts's `pointsDropSet` — the exact pipeline
 * Today now reuses from buildPointsTeam (src/myteam/pointsTeam.ts), same model + cutoffs as My
 * Team / PointsWireView.vue's roster tiering:
 *
 *   buildPointsTeam(...).rosterRows.filter(r => !r.player.onIL && r.tier === 'FRINGE')
 *
 * useToday.ts isn't practical to unit-test directly (ESPN/Yahoo composables, roster loaders,
 * schedule fetches), so this test drives the real buildPointsTeam with the same shape useToday.ts
 * feeds it, to lock in the actual reported bug: a core starter (Shane Baz / Jose Soriano) must
 * never be offered as a drop, and an IL body must never be offered even if its discounted points
 * are the lowest on the roster.
 */
import { describe, it, expect } from 'vitest'
import { buildPointsTeam, type PointsPoolPlayer } from '@/myteam/pointsTeam'
import { pickSafeDrop, type DroppableBody } from '@/today/safeDrop'
import type { FGProjection } from '@/services/projectionService'

const weights = { W: 5, IP: 1, SO: 1, ER: -2 }

function arm(key: string, w: number, ip: number, so: number, er: number, onIL = false): {
  p: PointsPoolPlayer
  fg: FGProjection
} {
  return {
    p: { playerKey: key, name: key, position: 'SP', teamKey: 'me', eligiblePositions: ['SP'], onIL },
    fg: { mlbam_id: 1, player_name: key, team: 'A', position: 'SP', player_type: 'pitcher', w, ip, so, er, gp: 30, gs: 30 },
  }
}

// Five arms spanning CORE -> FRINGE by descending projected points: Baz and Soriano are the two
// best (CORE), MidArm is the roster's middle arm (SOLID), Erceg is the genuinely fringe arm
// (FRINGE), and HurtArm projects even lower than Erceg but is parked on the IL.
const rows = [
  arm('Baz', 15, 200, 240, 50), // best
  arm('Soriano', 14, 190, 220, 55), // 2nd best
  arm('MidArm', 8, 140, 130, 60), // middle
  arm('Erceg', 3, 60, 50, 40), // fringe, healthy — the genuinely safe cut
  arm('HurtArm', 2, 40, 30, 45, true), // lowest raw points AND on IL — must be excluded either way
]
const pool = rows.map((r) => r.p)
const fgByKey: Record<string, FGProjection | null> = {}
rows.forEach((r) => (fgByKey[r.p.playerKey] = r.fg))

/** Mirrors useToday.ts's pointsDropSet computed exactly. */
function buildPointsDropSet(): DroppableBody[] {
  const model = buildPointsTeam(pool, fgByKey, weights, 'me', { SP: 1 })
  return model.rosterRows
    .filter((r) => !r.player.onIL && r.tier === 'FRINGE')
    .map((r) => ({
      playerKey: r.player.playerKey,
      name: r.player.name,
      side: r.side,
      rosValue: r.points,
      bottomTier: true,
      reason: 'lowest projected',
    }))
}

describe('pointsDropSet (points-league Wire drop-to-make-room, replicated for Today)', () => {
  it('never includes a core starter (Baz/Soriano)', () => {
    const dropSet = buildPointsDropSet()
    expect(dropSet.map((d) => d.playerKey)).not.toContain('Baz')
    expect(dropSet.map((d) => d.playerKey)).not.toContain('Soriano')
  })

  it('never includes the IL body, even though it projects the fewest points on the roster', () => {
    const dropSet = buildPointsDropSet()
    expect(dropSet.map((d) => d.playerKey)).not.toContain('HurtArm')
  })

  it('surfaces the genuinely fringe healthy body (Erceg) and only that body', () => {
    const dropSet = buildPointsDropSet()
    expect(dropSet.map((d) => d.playerKey)).toEqual(['Erceg'])
  })

  it('pickSafeDrop returns the fringe body, then null once claimed (no double-drop)', () => {
    const dropSet = buildPointsDropSet()
    const claimed = new Set<string>()
    const first = pickSafeDrop(dropSet, claimed)
    expect(first?.playerKey).toBe('Erceg')
    claimed.add(first!.playerKey)
    expect(pickSafeDrop(dropSet, claimed)).toBeNull() // no clean drop left
  })

  it('empty drop set when nobody on the roster is FRINGE -> pickSafeDrop returns null', () => {
    // A single arm never tiers as FRINGE (percentile tiering needs a bottom slice to exist) — the
    // "genuinely nothing safe to cut" case.
    const soloRows = [arm('OnlyArm', 15, 200, 240, 50)]
    const soloPool = soloRows.map((r) => r.p)
    const soloFg: Record<string, FGProjection | null> = {}
    soloRows.forEach((r) => (soloFg[r.p.playerKey] = r.fg))
    const model = buildPointsTeam(soloPool, soloFg, weights, 'me', { SP: 1 })
    const dropSet = model.rosterRows
      .filter((r) => !r.player.onIL && r.tier === 'FRINGE')
      .map((r) => ({ playerKey: r.player.playerKey, name: r.player.name, side: r.side, rosValue: r.points, bottomTier: true, reason: 'lowest projected' }))
    expect(dropSet).toEqual([])
    expect(pickSafeDrop(dropSet, new Set())).toBeNull()
  })
})
