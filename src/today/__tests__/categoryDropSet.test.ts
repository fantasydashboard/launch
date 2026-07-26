/**
 * Regression coverage for the CATEGORY half of useToday.ts's `categoryDropSet` — the exact
 * pipeline Today now reuses from the Wire (src/composables/useWire.ts ~lines 400-415):
 *
 *   computeDropCandidates(myContributions) ∩ expendableKeys(eligibility excluding IL, rosterSlots)
 *
 * useToday.ts isn't practical to unit-test directly (it pulls in ESPN/Yahoo composables, roster
 * loaders, schedule fetches, etc.), so this test replicates the pipeline with the same pure
 * building blocks (computeDropCandidates + expendableKeys + pickSafeDrop) to lock in the actual
 * reported bug: an IL pitcher (Helsley/Griffin) has the lowest roleValue on the roster, but
 * because it's excluded from the eligibility list before expendableKeys runs, it must never reach
 * pickSafeDrop's candidate pool — dropping an IL body never frees an active spot.
 */
import { describe, it, expect } from 'vitest'
import { computeDropCandidates } from '@/myteam/dropCandidates'
import { expendableKeys } from '@/wire/dropEligibility'
import { pickSafeDrop, type DroppableBody } from '@/today/safeDrop'
import type { PlayerContribution } from '@/myteam/types'

function contrib(
  playerKey: string,
  role: 'hitter' | 'pitcher',
  roleValue: number,
  crossPercentile: number,
): PlayerContribution {
  return {
    playerKey,
    contribs: [],
    plusCount: 0,
    minusCount: 0,
    overallValue: 0,
    valueScore: 0,
    role,
    roleValue,
    crossValue: 0,
    crossPercentile,
    topStatId: null,
  }
}

interface RosterBody {
  playerKey: string
  position: string
  onIL: boolean
  role: 'hitter' | 'pitcher'
  roleValue: number
  crossPercentile: number
}

/** Mirrors useToday.ts's categoryDropSet computed exactly (categoryEligibility -> categoryExpendable
 * -> categoryDropCandidates -> categoryDropSet). */
function buildCategoryDropSet(roster: RosterBody[], rosterSlots: Record<string, number>): DroppableBody[] {
  const eligibility = roster
    .filter((p) => !p.onIL)
    .map((p) => ({ playerKey: p.playerKey, eligiblePositions: [p.position] }))
  const expendable = expendableKeys(eligibility, rosterSlots)
  const contributions = roster.map((p) => contrib(p.playerKey, p.role, p.roleValue, p.crossPercentile))
  const dropCandidates = computeDropCandidates(contributions)
  return dropCandidates.candidates
    .filter((c) => expendable.has(c.playerKey))
    .map((c) => {
      const r = roster.find((p) => p.playerKey === c.playerKey)!
      return {
        playerKey: c.playerKey,
        name: c.playerKey,
        side: r.role === 'pitcher' ? ('pit' as const) : ('hit' as const),
        rosValue: r.crossPercentile,
        bottomTier: true,
        reason: c.reason,
      }
    })
}

describe('categoryDropSet (Wire drop-to-make-room, replicated for Today)', () => {
  // Two catchers (one core, one fringe) + three pitchers (one core ace, one healthy fringe arm, one
  // IL arm) — the Helsley/Griffin shape: the IL arm has the LOWEST roleValue on the whole roster.
  const roster: RosterBody[] = [
    { playerKey: 'Helsley', position: 'SP', onIL: true, role: 'pitcher', roleValue: 5, crossPercentile: 12 },
    { playerKey: 'LowSP', position: 'SP', onIL: false, role: 'pitcher', roleValue: 15, crossPercentile: 25 },
    { playerKey: 'AceSP', position: 'SP', onIL: false, role: 'pitcher', roleValue: 90, crossPercentile: 88 },
    { playerKey: 'CoreC', position: 'C', onIL: false, role: 'hitter', roleValue: 85, crossPercentile: 80 },
    { playerKey: 'BackupC', position: 'C', onIL: false, role: 'hitter', roleValue: 20, crossPercentile: 8 },
  ]
  const slots = { C: 1, SP: 1 }

  it('never includes the IL body, even though it has the lowest roleValue on the roster', () => {
    const dropSet = buildCategoryDropSet(roster, slots)
    expect(dropSet.map((d) => d.playerKey)).not.toContain('Helsley')
  })

  it('never includes a protected/core body (roleValue >= 50)', () => {
    const dropSet = buildCategoryDropSet(roster, slots)
    expect(dropSet.map((d) => d.playerKey)).not.toContain('AceSP')
    expect(dropSet.map((d) => d.playerKey)).not.toContain('CoreC')
  })

  it('surfaces the genuinely droppable healthy bottom-tier bodies', () => {
    const dropSet = buildCategoryDropSet(roster, slots)
    expect(dropSet.map((d) => d.playerKey).sort()).toEqual(['BackupC', 'LowSP'])
  })

  it('pickSafeDrop takes the lowest cross-comparable body first, then the other on a second claim', () => {
    const dropSet = buildCategoryDropSet(roster, slots)
    const claimed = new Set<string>()
    const first = pickSafeDrop(dropSet, claimed)
    expect(first?.playerKey).toBe('BackupC') // crossPercentile 8 < LowSP's 25
    claimed.add(first!.playerKey)
    const second = pickSafeDrop(dropSet, claimed)
    expect(second?.playerKey).toBe('LowSP')
    claimed.add(second!.playerKey)
    expect(pickSafeDrop(dropSet, claimed)).toBeNull() // both claimed -> no clean drop
  })

  it('empty drop set (everyone protected or IL) -> pickSafeDrop returns null', () => {
    const allProtected: RosterBody[] = [
      { playerKey: 'Helsley', position: 'SP', onIL: true, role: 'pitcher', roleValue: 5, crossPercentile: 12 },
      { playerKey: 'AceSP', position: 'SP', onIL: false, role: 'pitcher', roleValue: 90, crossPercentile: 88 },
      { playerKey: 'CoreC', position: 'C', onIL: false, role: 'hitter', roleValue: 85, crossPercentile: 80 },
    ]
    const dropSet = buildCategoryDropSet(allProtected, { C: 1, SP: 1 })
    expect(dropSet).toEqual([])
    expect(pickSafeDrop(dropSet, new Set())).toBeNull()
  })
})
