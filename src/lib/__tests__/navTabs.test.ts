import { describe, it, expect } from 'vitest'
import { showsDraftTab } from '../navTabs'

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
