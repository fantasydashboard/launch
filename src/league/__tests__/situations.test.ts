import { describe, expect, it } from 'vitest'
import { buildSituations, type SituationInput } from '../situations'

const base = (over: Partial<SituationInput> & { teamKey: string }): SituationInput => ({
  n: 10,
  talentRank: 5,
  recordRank: 5,
  ...over,
})
const kindOf = (out: ReturnType<typeof buildSituations>, key: string) =>
  out.find((s) => s.teamKey === key)?.kind ?? null

describe('buildSituations', () => {
  it('calls a team a sell-high when the standings and all-play disagree', () => {
    const out = buildSituations([base({ teamKey: 'lucky', recordRank: 1, allPlayRank: 8, talentRank: 7 })])
    expect(kindOf(out, 'lucky')).toBe('sell-high')
    expect(out[0].detail).toContain('all-play')
  })

  it('calls a team a buy-low when all-play is far ahead of the standings', () => {
    const out = buildSituations([base({ teamKey: 'unlucky', recordRank: 9, allPlayRank: 2, talentRank: 3 })])
    expect(kindOf(out, 'unlucky')).toBe('buy-low')
  })

  it('does not fire on a gap inside normal wobble', () => {
    // one spot apart in a 10-team league is nothing
    const out = buildSituations([base({ teamKey: 'steady', recordRank: 5, allPlayRank: 6, talentRank: 5 })])
    expect(kindOf(out, 'steady')).toBeNull()
  })

  it('says nothing about luck when all-play cannot be read yet', () => {
    // no allPlayRank at all — the signal is absent, so it must not be inferred from record
    const out = buildSituations([base({ teamKey: 'early', recordRank: 1, talentRank: 9 })])
    expect(kindOf(out, 'early')).toBeNull()
  })

  it('flags a soft run ahead only for a team good enough for it to matter', () => {
    const good = buildSituations([base({ teamKey: 'good', talentRank: 3, recordRank: 7, sosRank: 1 })])
    expect(kindOf(good, 'good')).toBe('schedule-turns')
    // the worst roster in the league is not rescued by an easy month
    const bad = buildSituations([base({ teamKey: 'bad', talentRank: 10, recordRank: 10, sosRank: 1 })])
    expect(kindOf(bad, 'bad')).toBeNull()
  })

  it('warns a front-runner facing the hardest run left', () => {
    const out = buildSituations([base({ teamKey: 'front', talentRank: 2, recordRank: 2, sosRank: 10 })])
    expect(kindOf(out, 'front')).toBe('gauntlet')
  })

  it('only says "no argument" when every signal agrees', () => {
    const agree = buildSituations([base({ teamKey: 'real', talentRank: 1, recordRank: 2, allPlayRank: 1 })])
    expect(kindOf(agree, 'real')).toBe('real-deal')
    // all-play disagrees → it is a sell-high story, not a confirmation
    const not = buildSituations([base({ teamKey: 'no', talentRank: 1, recordRank: 1, allPlayRank: 9 })])
    expect(kindOf(not, 'no')).toBe('sell-high')
  })

  it('gives each team at most one verdict — a row with three is a row nobody acts on', () => {
    const out = buildSituations([
      base({ teamKey: 'x', talentRank: 1, recordRank: 1, allPlayRank: 9, sosRank: 10 }),
    ])
    expect(out.filter((s) => s.teamKey === 'x')).toHaveLength(1)
  })

  it('an abandoned team is a free win and nothing else', () => {
    const out = buildSituations([
      base({ teamKey: 'gone', talentRank: 2, recordRank: 9, allPlayRank: 1, managerless: true }),
    ])
    expect(kindOf(out, 'gone')).toBe('stranded')
    expect(out.filter((s) => s.teamKey === 'gone')).toHaveLength(1)
  })

  it('ranks the most actionable first, and confirmation last', () => {
    const out = buildSituations([
      base({ teamKey: 'confirm', talentRank: 1, recordRank: 1, allPlayRank: 1 }),
      base({ teamKey: 'sell', talentRank: 8, recordRank: 1, allPlayRank: 9 }),
    ])
    expect(out[0].teamKey).toBe('sell')
    expect(out[out.length - 1].teamKey).toBe('confirm')
  })

  it('scales its thresholds with league size', () => {
    // A 3-spot gap is separation in a 10-team league and wobble in a 20-team one, so the
    // same numbers must stop reading as luck. (In the 20-team case the team is top-third
    // on every signal, so it correctly lands on the confirmation read instead — the point
    // being that it is no longer accused of riding its schedule.)
    const ten = buildSituations([base({ teamKey: 't', n: 10, recordRank: 1, allPlayRank: 4, talentRank: 4 })])
    expect(kindOf(ten, 't')).toBe('sell-high')
    const twenty = buildSituations([base({ teamKey: 't', n: 20, recordRank: 1, allPlayRank: 4, talentRank: 4 })])
    expect(kindOf(twenty, 't')).not.toBe('sell-high')
  })

  it('never throws on empty or junk', () => {
    expect(buildSituations([])).toEqual([])
    expect(buildSituations(null as never)).toEqual([])
  })
})
