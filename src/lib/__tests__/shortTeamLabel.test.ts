import { describe, it, expect } from 'vitest'
import { shortTeamLabels } from '../shortTeamLabel'

describe('shortTeamLabels', () => {
  it('keeps initials when they are already distinct', () => {
    expect(shortTeamLabels(["Rock'em Sock'em", 'Danny Daring Team']))
      .toEqual(['RS', 'DDT'])
  })

  /* The bug: a twelve-team league showed two "MM" columns side by side. */
  it('never repeats a label, however the names collide', () => {
    const out = shortTeamLabels(["Makar's Mark", 'Mitch Muffin', 'Mighty Mice'])
    expect(new Set(out).size).toBe(out.length)
  })

  it('gives the first claimant the best-reading label', () => {
    const [first] = shortTeamLabels(["Makar's Mark", 'Mitch Muffin'])
    expect(first).toBe('MM')
  })

  it('handles single-word and empty names without colliding', () => {
    const out = shortTeamLabels(['Thunder', 'Thunder', '', ''])
    expect(new Set(out).size).toBe(out.length)
  })

  it('is stable: the same list gives the same labels', () => {
    const names = ["Makar's Mark", 'Mitch Muffin', 'The Woll of Shame']
    expect(shortTeamLabels(names)).toEqual(shortTeamLabels(names))
  })

  it('never returns more than three characters', () => {
    for (const l of shortTeamLabels(['Supercalifragilistic Expialidocious Team', 'A B C D E'])) {
      expect(l.length).toBeLessThanOrEqual(3)
    }
  })
})
