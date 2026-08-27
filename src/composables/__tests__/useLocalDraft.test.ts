import { describe, it, expect, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'
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

  it('rejects a payload with a null pick to prevent downstream crashes', () => {
    localStorage.setItem(localDraftKey('L1'), JSON.stringify({ ...config, picks: [null], startedAt: 'x', updatedAt: 'x' }))
    const d = useLocalDraft(ref('L1'))
    expect(d.draft.value).toBeNull()
  })

  it('rejects a payload with a missing teams field', () => {
    const badPayload = { ...config, picks: [], startedAt: 'x', updatedAt: 'x' }
    delete (badPayload as any).teams
    localStorage.setItem(localDraftKey('L1'), JSON.stringify(badPayload))
    const d = useLocalDraft(ref('L1'))
    expect(d.draft.value).toBeNull()
  })

  it('rejects a payload with invalid type', () => {
    localStorage.setItem(localDraftKey('L1'), JSON.stringify({ ...config, type: 'invalid', picks: [], startedAt: 'x', updatedAt: 'x' }))
    const d = useLocalDraft(ref('L1'))
    expect(d.draft.value).toBeNull()
  })

  it('switches leagues when leagueId ref changes on a single instance', async () => {
    const leagueId = ref('L1')
    const d = useLocalDraft(leagueId)
    d.start(config)
    d.pick(player)
    expect(d.draft.value).not.toBeNull()

    leagueId.value = 'L2'
    await nextTick()
    expect(d.draft.value).toBeNull()

    leagueId.value = 'L1'
    await nextTick()
    expect(d.draft.value).not.toBeNull()
    expect(d.draft.value!.picks[0].name).toBe('Bijan Robinson')
  })

  it('rejects a payload with Infinity in teams (JSON.parse("1e400"))', () => {
    /* JSON.parse('{"teams":1e400}') yields Infinity, which is a valid JSON number
       that overflows on parse. It passes typeof checks but silently corrupts slot
       assignment where Math.max(1, Infinity) makes every pick compute wrong. */
    const badPayload = { ...config, picks: [], startedAt: 'x', updatedAt: 'x', teams: JSON.parse('1e400') }
    localStorage.setItem(localDraftKey('L1'), JSON.stringify(badPayload))
    const d = useLocalDraft(ref('L1'))
    expect(d.draft.value).toBeNull()
  })

  it('rejects a payload with absurdly large rounds that would cause hangs', () => {
    /* nextPickFor loops for (p = ...; p <= teams * rounds; p++). Large finite
       rounds like 1e15 cause infinite loops. A real draft has at most ~20 rounds. */
    localStorage.setItem(localDraftKey('L1'), JSON.stringify({ ...config, rounds: 1e15, picks: [], startedAt: 'x', updatedAt: 'x' }))
    const d = useLocalDraft(ref('L1'))
    expect(d.draft.value).toBeNull()
  })
})
