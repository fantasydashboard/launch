import { describe, it, expect } from 'vitest'
import { availability } from '../useDailyLineup'

/*
 * A player who cannot play must read as 'out', because 'out' is what keeps him OFF tonight's
 * board entirely. 'doubtful' keeps him on it at a 0.6 discount — which is how a man on injured
 * reserve came to be ranked sixth among tonight's best free-agent adds.
 */
describe('availability', () => {
  it.each(['IR', 'NA', 'OUT', 'IL', 'IL10', 'SUSPENSION', 'PUP'])(
    'treats the abbreviation %s as out', (s) => expect(availability(s)).toBe('out'))

  /* The regression: Yahoo publishes both forms and the free-agent parser was keeping this one. */
  it.each([
    'Injured Reserve', 'INJURED RESERVE', 'Not Active', 'NOT ACTIVE',
    'Suspended', 'Long Term Injured Reserve',
  ])('treats the spelled-out form %s as out', (s) => expect(availability(s)).toBe('out'))

  it.each(['DTD', 'DAY_TO_DAY', 'Day to Day', 'GTD', 'Questionable'])(
    'treats %s as playable but discounted', (s) => expect(availability(s)).toBe('doubtful'))

  it.each(['', '   ', 'ACTIVE', 'active'])(
    'treats %j as healthy', (s) => expect(availability(s)).toBe('ok'))

  /* An unrecognised designation is still a designation — something is wrong with him. */
  it('treats an unknown designation as doubtful rather than fine', () => {
    expect(availability('SOME_NEW_TAG')).toBe('doubtful')
  })
})
