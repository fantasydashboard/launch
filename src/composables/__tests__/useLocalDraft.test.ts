import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useLocalDraft, localDraftKey } from '../useLocalDraft'

const config = {
  leagueId: 'L1', season: '2026', teams: 4, rounds: 2, type: 'snake' as const,
  slotToRosterId: { 1: 'r1', 2: 'r2', 3: 'r3', 4: 'r4' }, mySlot: 2,
}
const player = { playerKey: 'p1', name: 'Bijan Robinson', position: 'RB', proTeam: 'ATL' }

beforeEach(() => localStorage.clear())

describe('useLocalDraft', () => {
  it('has nothing until a draft is started', () => {
    const d = useLocalDraft(ref('L1'))
    expect(d.draft.value).toBeNull()
    expect(d.isActive.value).toBe(false)
  })

  it('starts, picks and undoes', () => {
    const d = useLocalDraft(ref('L1'))
    d.start(config)
    expect(d.isActive.value).toBe(true)
    d.pick(player)
    expect(d.draft.value!.picks).toHaveLength(1)
    d.undo()
    expect(d.draft.value!.picks).toHaveLength(0)
  })

  it('survives a refresh — the whole point of persisting', () => {
    const a = useLocalDraft(ref('L1'))
    a.start(config)
    a.pick(player)

    const b = useLocalDraft(ref('L1'))          // a fresh mount, as after reload
    expect(b.draft.value!.picks).toHaveLength(1)
    expect(b.draft.value!.picks[0].name).toBe('Bijan Robinson')
  })

  it('keeps leagues apart', () => {
    const a = useLocalDraft(ref('L1'))
    a.start(config)
    const b = useLocalDraft(ref('L2'))
    expect(b.draft.value).toBeNull()
  })

  it('discards', () => {
    const d = useLocalDraft(ref('L1'))
    d.start(config)
    d.discard()
    expect(d.draft.value).toBeNull()
    expect(localStorage.getItem(localDraftKey('L1'))).toBeNull()
  })

  it('ignores a corrupt payload rather than throwing', () => {
    localStorage.setItem(localDraftKey('L1'), '{not json')
    const d = useLocalDraft(ref('L1'))
    expect(d.draft.value).toBeNull()
  })

  it('ignores a stored draft belonging to another league', () => {
    // The key is per league, so a mismatch means tampering. Refuse it rather
    // than seat one league's rosters in another league's draft.
    localStorage.setItem(localDraftKey('L1'), JSON.stringify({ ...config, leagueId: 'L9', picks: [], startedAt: 'x', updatedAt: 'x' }))
    const d = useLocalDraft(ref('L1'))
    expect(d.draft.value).toBeNull()
  })

  it('does nothing when there is no active league', () => {
    const d = useLocalDraft(ref(null))
    d.start(config)
    expect(d.draft.value).toBeNull()
  })
})
