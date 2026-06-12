import { describe, it, expect } from 'vitest'
import { pickCounterparty, type RosterSlotPlayer } from '../pairDrop'

const sp = (key: string, roleValue: number, started = true, position = 'SP'): RosterSlotPlayer => ({
  playerKey: key,
  name: key,
  team: 'X',
  position,
  side: 'pit',
  roleValue,
  started,
  stats: {},
})

describe('pickCounterparty', () => {
  it('startSit on an SP sits an SP, never a reliever', () => {
    const roster = [sp('weakRP', 5, true, 'RP'), sp('weakSP', 20, true, 'SP')]
    // Candidate is an SP; the RP is lower-value but slot-incompatible -> pick the SP.
    const cp = pickCounterparty(roster, 'pit', 'startSit', undefined, 'SP')
    expect(cp?.playerKey).toBe('weakSP')
  })

  it('startSit on an SP returns null when only relievers are sittable', () => {
    const roster = [sp('weakRP', 5, true, 'RP')]
    expect(pickCounterparty(roster, 'pit', 'startSit', undefined, 'SP')).toBeNull()
  })

  it('a dual SP,RP player is a valid sit for either subtype', () => {
    const roster = [sp('swing', 20, true, 'SP,RP')]
    expect(pickCounterparty(roster, 'pit', 'startSit', undefined, 'SP')?.playerKey).toBe('swing')
    expect(pickCounterparty(roster, 'pit', 'startSit', undefined, 'RP')?.playerKey).toBe('swing')
  })

  it('add/stream drops the weakest same-side player regardless of subtype', () => {
    // A roster drop frees a bench spot, so cross-subtype is fine.
    const roster = [sp('weakRP', 5, true, 'RP'), sp('weakSP', 20, true, 'SP')]
    expect(pickCounterparty(roster, 'pit', 'add', undefined, 'SP')?.playerKey).toBe('weakRP')
    expect(pickCounterparty(roster, 'pit', 'stream', undefined, 'SP')?.playerKey).toBe('weakRP')
  })
})
