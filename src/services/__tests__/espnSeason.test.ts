import { describe, it, expect } from 'vitest'
import { EspnFantasyService } from '../espn'

/**
 * WHICH SEASON ESPN CALLS "NOW", PER SPORT.
 *
 * This is pinned because getting it wrong made two of our four sports impossible to ADD.
 * The league-id probe asked every sport for [thisYear, -1, -2]; hockey and basketball name a
 * season for the year it ENDS, so a league created for the upcoming season was never asked
 * for. The user was told to double-check a league id that had been correct all along.
 *
 * Verified against a real league: ESPN hockey id 1454426929 answers "Not Found" at season
 * 2026 and returns "Fantasy Nerds Gummies" at 2027.
 */
/* Built field by field, in LOCAL time. `new Date('2026-07-01')` parses as UTC midnight,
   which west of Greenwich is the previous day — so the string form silently tested June and
   failed a July assertion that was correct. The function reads `new Date()`, which is local,
   so local is what the fixture has to be. Month is 0-indexed. */
const season = (sport: any, y: number, monthHuman: number, d: number) =>
  EspnFantasyService.currentSeasonForSport(sport, new Date(y, monthHuman - 1, d))

describe('the season ESPN names for each sport', () => {
  it('names football and baseball for the year they start', () => {
    expect(season('football', 2026, 9, 18)).toBe(2026)
    expect(season('football', 2026, 12, 28)).toBe(2026)
    expect(season('baseball', 2026, 4, 2)).toBe(2026)
  })

  /* The bug, in one assertion: in September 2026 the live NHL season is 2027. */
  it('names hockey and basketball for the year they end', () => {
    expect(season('hockey', 2026, 9, 18)).toBe(2027)
    expect(season('basketball', 2026, 10, 20)).toBe(2027)
  })

  /* Drafts happen weeks before opening night, so the league exists well before October —
     which is why the cutover is July and not the first game. */
  it('rolls hockey to the new season in the summer, before opening night', () => {
    expect(season('hockey', 2026, 6, 30)).toBe(2026)   // still the season just ended
    expect(season('hockey', 2026, 7, 1)).toBe(2027)    // the one being drafted for
  })

  it('still calls the spring the season that ends this year', () => {
    expect(season('hockey', 2027, 3, 15)).toBe(2027)
    expect(season('basketball', 2027, 5, 1)).toBe(2027)
  })
})
