import { describe, it, expect } from 'vitest'
import { normalizeProTeam } from '../proTeam'
import { addWeek } from '../nflSchedule'
import { statesFromScoreboard } from '../gameLines'

describe('pro team spelling across feeds', () => {
  /*
   * The bug this file exists for: ESPN writes Washington as WSH and Sleeper writes WAS, so
   * every join between the two dropped Washington players — and only Washington players.
   * Thirty-one teams matched, which is why it went unnoticed: a blank cell reads as "no data
   * yet" rather than "we spelled it differently".
   */
  it('speaks Sleeper, so a player record finds his own team', () => {
    expect(normalizeProTeam('WSH')).toBe('WAS')
    expect(normalizeProTeam('wsh')).toBe('WAS')
  })

  it('leaves the thirty-one teams both feeds agree on alone', () => {
    for (const t of ['KC', 'SF', 'LAR', 'LAC', 'JAX', 'LV', 'NE', 'GB']) {
      expect(normalizeProTeam(t)).toBe(t)
    }
  })

  it('is safe on the empty team a free agent carries', () => {
    expect(normalizeProTeam(undefined)).toBe('')
    expect(normalizeProTeam(null)).toBe('')
  })

  it('keys the schedule so Washington has a ROS difficulty and a bye at all', () => {
    const schedule = addWeek({}, 3, {
      events: [{ competitions: [{ competitors: [
        { team: { abbreviation: 'WSH' } },
        { team: { abbreviation: 'NYG' } },
      ] }] }],
    })
    // Keyed the way a Sleeper player record spells it — the side that does the lookup.
    expect(schedule.WAS?.[3]).toBe('NYG')
    expect(schedule.WSH).toBeUndefined()
    // And the opponent is normalized too: NYG's week 3 must match a defence-allowed key.
    expect(schedule.NYG?.[3]).toBe('WAS')
  })

  it('keys game state, so a Washington player can be live or locked', () => {
    const states = statesFromScoreboard({
      events: [{
        status: { type: { state: 'in' } },
        competitions: [{ competitors: [
          { team: { abbreviation: 'WSH' } },
          { team: { abbreviation: 'DAL' } },
        ] }],
      }],
    })
    expect(states.WAS).toBe('in')
    expect(states.DAL).toBe('in')
  })
})
