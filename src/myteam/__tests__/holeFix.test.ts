import { describe, it, expect } from 'vitest'
import { holeFixNote } from '../holeFix'

describe('holeFixNote', () => {
  it('counting cat: states plainly that the wire is empty', () => {
    expect(holeFixNote('R', false)).toBe('No clean R add on the wire right now.')
  })

  it('rate cat: adds the slow-moving context', () => {
    const note = holeFixNote('ERA', true)
    expect(note).toContain('ERA')
    expect(note).toContain('moves slowly')
  })

  it('does not invent a trade CTA (honest silence, not hollow filler)', () => {
    expect(holeFixNote('TB', false).toLowerCase()).not.toContain('trade')
    expect(holeFixNote('AVG', true).toLowerCase()).not.toContain('trade')
  })
})
