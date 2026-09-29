import { describe, it, expect } from 'vitest'
import { seasonLabel, staleSeasonLabel, newestSeasonBySport } from '@/lib/seasonLabel'

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

/*
 * WHICH seasons are worth printing, as opposed to how to spell them.
 *
 * The switcher printed every league's year, so a list of current leagues read "2026 · 2026 ·
 * 2026" and the one dormant league in it looked exactly like the rest.
 */
describe('staleSeasonLabel', () => {
  const L = (sport: string, platform: string, season: string | number | null) =>
    ({ sport, platform, season })

  it('says nothing for a league in the newest season its sport has', () => {
    const n = newestSeasonBySport([L('football', 'yahoo', 2026), L('football', 'yahoo', 2026)])
    expect(staleSeasonLabel(L('football', 'yahoo', 2026), n)).toBeNull()
  })

  it('shows the year for a league left behind a newer one', () => {
    const n = newestSeasonBySport([L('basketball', 'yahoo', 2026), L('basketball', 'yahoo', 2025)])
    expect(staleSeasonLabel(L('basketball', 'yahoo', 2025), n)).toBe('2025-26')
  })

  /*
   * THE CROSS-PLATFORM TRAP. ESPN stores a split season by the year it ends and Yahoo by the
   * year it starts, so a raw comparison calls the Yahoo league a season behind when both are
   * in 2026-27 — marking a live league stale.
   */
  it('does not call a Yahoo hockey league stale against the same ESPN season', () => {
    const n = newestSeasonBySport([L('hockey', 'espn', 2027), L('hockey', 'yahoo', 2026)])
    expect(staleSeasonLabel(L('hockey', 'yahoo', 2026), n)).toBeNull()
    expect(staleSeasonLabel(L('hockey', 'espn', 2027), n)).toBeNull()
  })

  it('still flags a genuinely older hockey league across platforms', () => {
    const n = newestSeasonBySport([L('hockey', 'espn', 2027), L('hockey', 'yahoo', 2024)])
    expect(staleSeasonLabel(L('hockey', 'yahoo', 2024), n)).toBe('2024-25')
  })

  it('compares within a sport, not across them', () => {
    const n = newestSeasonBySport([L('football', 'yahoo', 2027), L('hockey', 'yahoo', 2026)])
    expect(staleSeasonLabel(L('hockey', 'yahoo', 2026), n)).toBeNull()
  })

  it('says nothing when a sport has only one league, whatever its year', () => {
    const n = newestSeasonBySport([L('hockey', 'yahoo', 2019)])
    expect(staleSeasonLabel(L('hockey', 'yahoo', 2019), n)).toBeNull()
  })

  it('handles a missing or unparseable season rather than printing it', () => {
    const n = newestSeasonBySport([L('football', 'yahoo', 2026)])
    expect(staleSeasonLabel(L('football', 'yahoo', null), n)).toBeNull()
    expect(staleSeasonLabel(L('football', 'yahoo', 'unknown'), n)).toBeNull()
  })
})
