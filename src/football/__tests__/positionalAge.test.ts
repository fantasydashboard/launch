import { describe, it, expect } from 'vitest'
import { readAge, AGE_BANDS, AGE_TONE } from '../positionalAge'

describe('readAge', () => {
  /* The whole reason this module exists: the board printed "28" for both of these and the
     two players are nothing alike. */
  it('reads the same age differently by position', () => {
    expect(readAge('RB', 28)!.phase).toBe('late')
    expect(readAge('WR', 28)!.phase).toBe('prime')
  })

  it('places the real players that motivated it', () => {
    expect(readAge('RB', 32)!.phase).toBe('old')   // Derrick Henry
    expect(readAge('RB', 21)!.phase).toBe('ascending') // Jeremiyah Love
    expect(readAge('RB', 30)!.phase).toBe('old')   // Christian McCaffrey
    expect(readAge('WR', 26)!.phase).toBe('prime') // Ja'Marr Chase
  })

  it('barely ages a quarterback, which is why young ones carry no premium in 1QB', () => {
    expect(readAge('QB', 30)!.phase).toBe('prime')
    expect(readAge('QB', 25)!.phase).toBe('ascending')
  })

  it('says nothing rather than guessing when it cannot know', () => {
    expect(readAge('K', 28)).toBeNull()
    expect(readAge('RB', null)).toBeNull()
    expect(readAge('RB', undefined)).toBeNull()
    expect(readAge('RB', 0)).toBeNull()
    expect(readAge('', 25)).toBeNull()
  })

  it('handles the multi-position strings the platforms send', () => {
    expect(readAge('RB,WR', 28)!.phase).toBe('late')
    expect(readAge('wr', 28)!.phase).toBe('prime')
  })

  it('leaves the unremarkable case unlabelled', () => {
    expect(readAge('WR', 27)!.label).toBe('')
    expect(readAge('RB', 28)!.label).toBe('ageing')
  })

  it('names the position in the detail so the premise can be argued with', () => {
    expect(readAge('RB', 28)!.detail).toContain('running back')
    expect(readAge('WR', 22)!.detail).toContain('receiver')
  })

  /* Every band must be ordered, or a player could be "old" before he is "late". */
  it('keeps every positional band monotonic', () => {
    for (const [pos, b] of Object.entries(AGE_BANDS)) {
      expect(b.prime, pos).toBeLessThan(b.late)
      expect(b.late, pos).toBeLessThan(b.old)
    }
  })

  it('encodes that backs decline before receivers', () => {
    expect(AGE_BANDS.RB.late).toBeLessThan(AGE_BANDS.WR.late)
    expect(AGE_BANDS.RB.old).toBeLessThan(AGE_BANDS.WR.old)
  })

  it('has a tone for every phase', () => {
    for (const p of ['ascending', 'prime', 'late', 'old'] as const) {
      expect(AGE_TONE[p]).toBeTruthy()
    }
  })
})
