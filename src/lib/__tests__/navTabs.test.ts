import { describe, it, expect } from 'vitest'
import { showsDraftTab, showsHockeyBoardTab } from '../navTabs'

/*
 * The nav was sport- and platform-aware but not time-aware, so Draft Room sat second in the
 * bar in week three for every Sleeper football league — a month after anybody drafted. There
 * is precedent for the fix in the same file: My Team and Matchup came off the tab bar with
 * their routes left live, and the post-draft retrospective already has a home in History.
 */
describe('showsDraftTab', () => {
  const sleeper = { sport: 'football', platform: 'sleeper' }

  it('shows the tab before the draft', () => {
    expect(showsDraftTab({ ...sleeper, leagueStatus: 'pre_draft' })).toBe(true)
  })

  it('shows the tab while the draft is running', () => {
    expect(showsDraftTab({ ...sleeper, leagueStatus: 'drafting' })).toBe(true)
  })

  it('takes the tab down once the season is under way', () => {
    expect(showsDraftTab({ ...sleeper, leagueStatus: 'in_season' })).toBe(false)
  })

  it('takes the tab down for a finished season', () => {
    expect(showsDraftTab({ ...sleeper, leagueStatus: 'complete' })).toBe(false)
  })

  /* The room reads live picks from Sleeper, so it only ever appeared where it works. That
     does not change. */
  it('never shows for another platform', () => {
    expect(showsDraftTab({ sport: 'football', platform: 'espn', leagueStatus: 'pre_draft' })).toBe(false)
  })

  it('never shows for another sport', () => {
    expect(showsDraftTab({ sport: 'hockey', platform: 'sleeper', leagueStatus: 'pre_draft' })).toBe(false)
  })

  /*
   * The status is missing for a beat while the league loads, and on any league whose status we
   * never learned. Showing the tab is the safe default: a needless tab during a draft week is
   * a smaller failure than a missing one, because somebody mid-draft cannot reach the room at
   * all — and the route stays live either way, so a bookmark still works.
   */
  it('shows the tab when the status is not known yet', () => {
    expect(showsDraftTab({ ...sleeper, leagueStatus: null })).toBe(true)
    expect(showsDraftTab({ ...sleeper, leagueStatus: '' })).toBe(true)
    expect(showsDraftTab(sleeper)).toBe(true)
  })
})

describe('showsHockeyBoardTab', () => {
  const hockey = { sport: 'hockey', platform: 'espn' }

  it('shows the board before the games start', () => {
    expect(showsHockeyBoardTab({ ...hockey, seasonStarted: false })).toBe(true)
  })

  it('takes it down once there is a season to play', () => {
    expect(showsHockeyBoardTab({ ...hockey, seasonStarted: true })).toBe(false)
  })

  /* Unknown shows it, for the same reason the Draft Room does: a manager mid-draft with no
     way onto the board is a worse failure than a tab nobody needed. */
  it('shows it while the answer is still unknown', () => {
    expect(showsHockeyBoardTab(hockey)).toBe(true)
  })

  /* The board reads an ESPN league's own settings and draft feed, so it works nowhere else. */
  it('never shows for another sport or platform', () => {
    expect(showsHockeyBoardTab({ sport: 'football', platform: 'espn' })).toBe(false)
    expect(showsHockeyBoardTab({ sport: 'hockey', platform: 'yahoo' })).toBe(false)
    expect(showsHockeyBoardTab({ sport: 'hockey', platform: 'sleeper' })).toBe(false)
  })
})
