import { describe, it, expect } from 'vitest'
import { availability, DOUBTFUL_DISCOUNT } from '../useDailyLineup'

describe('who can actually play tonight', () => {
  /*
   * THE BUG THIS EXISTS TO STOP. `playsToday` answers a question about the SCHEDULE, and the
   * rankings read it as an answer about the PLAYER — so Shohei Ohtani on the fifteen-day list
   * came through at full value and ranked FIRST among hitters, on a panel whose own subtitle
   * says a man who is not playing "is no play at all". Seven of the top twenty-three were
   * injured. The app was recommending players who could not take the field.
   */
  it('treats every flavour of the injured list as out', () => {
    for (const s of ['OUT', 'IR', 'IL', 'IL10', 'DL', 'TEN_DAY_DL', 'FIFTEEN_DAY_DL',
                     'SIXTY_DAY_DL', 'SUSPENSION', 'NA', 'PUP', 'NFI']) {
      expect(availability(s)).toBe('out')
    }
  })

  /*
   * Day-to-day is NOT out. He usually plays. Collapsing the two is what made the warning
   * ignorable — a day-to-day outfielder shared a red banner with two pitchers on the
   * fifteen-day list, and a warning that cries wolf gets skimmed past when it matters.
   */
  it('keeps day-to-day separate, because he usually plays', () => {
    for (const s of ['DAY_TO_DAY', 'DTD', 'QUESTIONABLE', 'DOUBTFUL', 'GTD']) {
      expect(availability(s)).toBe('doubtful')
    }
  })

  it('treats a blank or ACTIVE status as fine', () => {
    for (const s of ['', '   ', 'ACTIVE', undefined, null]) {
      expect(availability(s as any)).toBe('ok')
    }
  })

  /*
   * An unrecognised designation is still a designation: something is wrong with him and we do
   * not know what. Doubtful rather than fine, because starting a man who cannot play costs
   * more than ranking a healthy one slightly low.
   */
  it('does not wave through a designation it has never seen', () => {
    expect(availability('PATERNITY')).toBe('doubtful')
    expect(availability('BEREAVEMENT')).toBe('doubtful')
  })

  /* Matched whole, not by prefix: DTD must not be swallowed by a rule meant for DL. */
  it('matches the whole token rather than a prefix', () => {
    expect(availability('DTD')).toBe('doubtful')
    expect(availability('DL')).toBe('out')
  })

  it('discounts a doubtful player rather than zeroing or ignoring him', () => {
    expect(DOUBTFUL_DISCOUNT).toBeGreaterThan(0)
    expect(DOUBTFUL_DISCOUNT).toBeLessThan(1)
  })
})
