import { describe, it, expect } from 'vitest'
import { seasonLabel } from '@/lib/seasonLabel'

describe('seasonLabel', () => {
  /* The reported bug: the same NHL season shown as 2026 in one league and 2027 in another. */
  it('makes Yahoo and ESPN agree on the same hockey season', () => {
    expect(seasonLabel('hockey', 'yahoo', '2026')).toBe('2026-27')
    expect(seasonLabel('hockey', 'espn', '2027')).toBe('2026-27')
    expect(seasonLabel('hockey', 'yahoo', '2026')).toBe(seasonLabel('hockey', 'espn', '2027'))
  })

  it('treats basketball the same way', () => {
    expect(seasonLabel('basketball', 'yahoo', '2026')).toBe('2026-27')
    expect(seasonLabel('basketball', 'espn', '2027')).toBe('2026-27')
  })

  it('leaves single-year sports alone', () => {
    expect(seasonLabel('football', 'espn', '2026')).toBe('2026')
    expect(seasonLabel('baseball', 'yahoo', '2026')).toBe('2026')
  })

  it('rolls the century correctly', () => {
    expect(seasonLabel('hockey', 'yahoo', '2099')).toBe('2099-00')
    expect(seasonLabel('hockey', 'sleeper', '2009')).toBe('2009-10')
  })

  /* Never invent a label from something that is not a year — show it back unchanged. */
  it('passes through anything that is not a four-digit year', () => {
    expect(seasonLabel('hockey', 'espn', '')).toBe('')
    expect(seasonLabel('hockey', 'espn', null)).toBe('')
    expect(seasonLabel('hockey', 'espn', '2026-27')).toBe('2026-27')
  })
})
