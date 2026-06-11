import { describe, it, expect } from 'vitest'
import { addGenerator } from '../generators/addGenerator'
import type { CatSpec } from '@/myteam/value'
import type { AvailablePlayer } from '@/players/types'

const cats: CatSpec[] = [{ statId: 'HR', lowerIsBetter: false, side: 'hit', isRatio: false }]
const fas: AvailablePlayer[] = [
  { playerKey: 'fa1', name: 'Power Bat', position: 'OF', team: 'NYY', percentOwned: 20, stats: { HR: 24 } },
  { playerKey: 'sp1', name: 'A Pitcher', position: 'SP', team: 'SF', percentOwned: 5, stats: { K: 150 } },
]

describe('addGenerator', () => {
  it('emits a MoveCandidate per FA with side + projected delta, no scoring', () => {
    const cands = addGenerator(fas, cats, 5, 0.6)
    expect(cands).toHaveLength(2)
    const bat = cands.find((c) => c.player.key === 'fa1')!
    expect(bat.kind).toBe('add')
    expect(bat.side).toBe('hit')
    expect(bat.addDelta.HR).toBeGreaterThan(0)
    expect(cands.find((c) => c.player.key === 'sp1')!.side).toBe('pit')
  })
})
