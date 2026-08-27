import { describe, it, expect } from 'vitest'
import {
  blankLocalDraft, addLocalPick, undoLocalPick, localDraftMeta, localSleeperPicks,
  totalLocalPicks, type LocalDraft,
} from '../localDraft'
import { slotAtPick } from '../pickOrder'

const NOW = '2026-08-27T12:00:00.000Z'

/** A 4-team, 3-round snake, seats 1..4 held by rosters r1..r4, me at seat 2. */
const base = () => blankLocalDraft({
  leagueId: 'L1', season: '2026', teams: 4, rounds: 3, type: 'snake',
  slotToRosterId: { 1: 'r1', 2: 'r2', 3: 'r3', 4: 'r4' }, mySlot: 2,
}, NOW)

const player = (n: string) => ({ playerKey: `p${n}`, name: `First${n} Last${n}`, position: 'RB', proTeam: 'KC' })

/** Fill n picks in order. */
const withPicks = (n: number): LocalDraft => {
  let d = base()
  for (let i = 1; i <= n; i++) d = addLocalPick(d, player(String(i)), NOW)
  return d
}

describe('blankLocalDraft', () => {
  it('starts empty and stamped', () => {
    const d = base()
    expect(d.picks).toEqual([])
    expect(d.startedAt).toBe(NOW)
    expect(d.updatedAt).toBe(NOW)
    expect(totalLocalPicks(d)).toBe(12)
  })
})

describe('addLocalPick', () => {
  it('appends with the next overall number', () => {
    const d = withPicks(3)
    expect(d.picks.map((p) => p.overall)).toEqual([1, 2, 3])
  })

  it('does not mutate the draft it was given', () => {
    const before = base()
    addLocalPick(before, player('x'), NOW)
    expect(before.picks).toHaveLength(0)
  })

  it('refuses to run past the end of the draft', () => {
    const full = withPicks(12)
    const after = addLocalPick(full, player('13'), NOW)
    expect(after.picks).toHaveLength(12)
    expect(after).toBe(full) // unchanged reference: nothing happened
  })
})

describe('undoLocalPick', () => {
  it('pops the last pick', () => {
    const d = undoLocalPick(withPicks(3), NOW)
    expect(d.picks.map((p) => p.overall)).toEqual([1, 2])
  })

  it('is a no-op on an empty draft', () => {
    const d = base()
    expect(undoLocalPick(d, NOW)).toBe(d)
  })

  it('round-trips: N appends then N undos is the blank draft again', () => {
    let d = withPicks(5)
    for (let i = 0; i < 5; i++) d = undoLocalPick(d, NOW)
    expect(d.picks).toEqual([])
  })
})

describe('localSleeperPicks', () => {
  it('emits the exact shape useDraftRoom consumes', () => {
    const rows = localSleeperPicks(withPicks(1))
    expect(rows[0]).toEqual({
      pick_no: 1,
      player_id: 'p1',
      draft_slot: 1,
      roster_id: 'r1',
      metadata: { first_name: 'First1', last_name: 'Last1', position: 'RB', team: 'KC' },
    })
  })

  it('splits the name the way the room rejoins it', () => {
    // useDraftRoom rebuilds display names with
    //   [first_name, last_name].filter(Boolean).join(' ')
    // so the split has to survive that round trip exactly.
    let d = base()
    d = addLocalPick(d, { playerKey: 'x', name: 'Amon-Ra St. Brown', position: 'WR', proTeam: 'DET' }, NOW)
    const m = localSleeperPicks(d)[0].metadata
    expect([m.first_name, m.last_name].filter(Boolean).join(' ')).toBe('Amon-Ra St. Brown')
  })

  it('handles a single-token name without inventing an empty surname', () => {
    let d = base()
    d = addLocalPick(d, { playerKey: 'def', name: 'HOU', position: 'DEF', proTeam: 'HOU' }, NOW)
    const m = localSleeperPicks(d)[0].metadata
    expect(m.first_name).toBe('HOU')
    expect(m.last_name).toBe('')
    expect([m.first_name, m.last_name].filter(Boolean).join(' ')).toBe('HOU')
  })

  it('follows the snake, checked against slotAtPick itself', () => {
    const d = withPicks(12)
    const shape = { type: 'snake' as const, teams: 4, rounds: 3 }
    for (const row of localSleeperPicks(d)) {
      expect(row.draft_slot).toBe(slotAtPick(shape, row.pick_no))
    }
    // and concretely: round 2 runs backwards
    const slots = localSleeperPicks(d).map((r) => r.draft_slot)
    expect(slots.slice(0, 4)).toEqual([1, 2, 3, 4])
    expect(slots.slice(4, 8)).toEqual([4, 3, 2, 1])
    expect(slots.slice(8, 12)).toEqual([1, 2, 3, 4])
  })

  it('keeps a linear draft linear', () => {
    let d = blankLocalDraft({
      leagueId: 'L1', season: '2026', teams: 4, rounds: 2, type: 'linear',
      slotToRosterId: { 1: 'r1', 2: 'r2', 3: 'r3', 4: 'r4' }, mySlot: 1,
    }, NOW)
    for (let i = 1; i <= 8; i++) d = addLocalPick(d, player(String(i)), NOW)
    expect(localSleeperPicks(d).map((r) => r.draft_slot)).toEqual([1, 2, 3, 4, 1, 2, 3, 4])
  })

  it('gives each pick the roster seated in that slot', () => {
    const rows = localSleeperPicks(withPicks(5))
    expect(rows.map((r) => r.roster_id)).toEqual(['r1', 'r2', 'r3', 'r4', 'r4'])
  })
})

describe('localDraftMeta', () => {
  it('supplies every field the room reads', () => {
    const m = localDraftMeta(withPicks(1))
    for (const k of ['status', 'type', 'settings', 'draft_id', 'slot_to_roster_id',
                     'draft_order', 'season', 'metadata', 'league_id']) {
      expect(m[k], `missing ${k}`).toBeDefined()
    }
    expect(m.settings.teams).toBe(4)
    expect(m.settings.rounds).toBe(3)
  })

  it('carries the draft type, which decides snake vs linear', () => {
    // Read through an alias in the shape computed, so easy to omit and silent
    // when omitted: everything would become a snake.
    expect(localDraftMeta(base()).type).toBe('snake')
  })

  it('moves through the three statuses at the right boundaries', () => {
    expect(localDraftMeta(base()).status).toBe('pre_draft')
    expect(localDraftMeta(withPicks(1)).status).toBe('drafting')
    expect(localDraftMeta(withPicks(11)).status).toBe('drafting')
    expect(localDraftMeta(withPicks(12)).status).toBe('complete')
  })

  it('maps slots to rosters as strings, the way Sleeper does', () => {
    const m = localDraftMeta(base())
    expect(m.slot_to_roster_id['2']).toBe('r2')
  })
})
