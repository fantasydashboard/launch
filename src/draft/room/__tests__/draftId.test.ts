import { describe, it, expect } from 'vitest'
import { parseDraftId, looksLikeDraftInput } from '../draftId'

describe('parseDraftId', () => {
  it('accepts a bare draft id', () => {
    expect(parseDraftId('992819274558156800')).toBe('992819274558156800')
  })

  it('pulls the id out of a Sleeper draft URL', () => {
    expect(parseDraftId('https://sleeper.com/draft/nfl/992819274558156800')).toBe('992819274558156800')
  })

  it('handles the app subdomain and trailing paths', () => {
    expect(parseDraftId('https://sleeper.app/draft/nfl/992819274558156800/board')).toBe('992819274558156800')
  })

  it('ignores query strings and fragments', () => {
    expect(parseDraftId('https://sleeper.com/draft/nfl/992819274558156800?tab=board#top')).toBe('992819274558156800')
  })

  it('tolerates surrounding whitespace and pasted text', () => {
    expect(parseDraftId('  join my draft: https://sleeper.com/draft/nfl/992819274558156800  ')).toBe('992819274558156800')
  })

  it('rejects input with no id', () => {
    expect(parseDraftId('https://sleeper.com/leagues')).toBeNull()
    expect(parseDraftId('not a draft')).toBeNull()
    expect(parseDraftId('')).toBeNull()
    expect(parseDraftId(null as any)).toBeNull()
  })

  it('rejects short numbers that cannot be ids', () => {
    expect(parseDraftId('2026')).toBeNull()
    expect(parseDraftId('nfl 2026')).toBeNull()
  })

  it('looksLikeDraftInput mirrors parseDraftId', () => {
    expect(looksLikeDraftInput('992819274558156800')).toBe(true)
    expect(looksLikeDraftInput('hello')).toBe(false)
  })
})
