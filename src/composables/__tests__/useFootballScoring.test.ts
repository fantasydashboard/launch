import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { scoringLabel, useFootballScoring } from '../useFootballScoring'
import { resolveFootballScoring } from '@/football/footballScoring'
import { useLeagueStore } from '@/stores/league'

/*
 * The label exists because the fallback has to be legible on the page. A board built from the
 * league's own rules and a board built from our defaults look identical, and only one of them
 * is telling the reader about their league.
 */
describe('scoringLabel', () => {
  it('names the league as the source when the league answered', () => {
    expect(scoringLabel('sleeper')).toBe("your league's scoring")
    expect(scoringLabel('espn')).toBe("your league's scoring")
    expect(scoringLabel('yahoo')).toBe("your league's scoring")
  })

  it('says plainly when it is our default instead', () => {
    expect(scoringLabel('default')).toBe('standard scoring (full PPR)')
  })
})

/* The guard behind useFootballScoring's sport check: a non-football league must never come
   back tagged with a platform, because that tag is what scoringLabel turns into the words
   "your league's scoring". */
describe('a non-football league', () => {
  it('resolves to football defaults rather than its own sport\'s weights', () => {
    const r = resolveFootballScoring({
      platform: null,
      sleeperScoringSettings: { R: 1, HR: 4, RBI: 1, SB: 2 },
    })
    expect(r.source).toBe('default')
    expect(r.weights).not.toHaveProperty('HR')
  })
})

/*
 * The composable itself — the two lines that actually run against the real league store,
 * as opposed to resolveFootballScoring called directly (above). This is what would have
 * caught the sport gate NOT being reached: the direct-call tests above pass whether or not
 * useFootballScoring.ts:38 threads the sport through, because they never go through it.
 */
describe('useFootballScoring composable', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('football + sleeper: an explicit zero survives (standard scoring)', () => {
    const leagueStore = useLeagueStore()
    leagueStore.activeSport = 'football'
    leagueStore.activePlatform = 'sleeper'
    leagueStore.currentLeague = { scoring_settings: { rec: 0, pass_td: 4, rush_yd: 0.1 } } as any

    const { weights, source } = useFootballScoring()
    expect(source.value).toBe('sleeper')
    expect(weights.value.rec).toBe(0)
  })

  /*
   * The sport gate, reached through the real composable. A baseball Sleeper league's
   * scoring_settings is a perfectly usable weights map by sleeperFootballWeights' own rules
   * (three-plus numeric keys) — the ONLY thing standing between it and a "your league's
   * scoring" label on a football page is useFootballScoring.ts:38 routing sport through the
   * platform slot before it ever reaches resolveFootballScoring.
   */
  it('baseball + sleeper: does not leak the league\'s scoring through', () => {
    const leagueStore = useLeagueStore()
    leagueStore.activeSport = 'baseball'
    leagueStore.activePlatform = 'sleeper'
    leagueStore.currentLeague = { scoring_settings: { R: 1, HR: 4, RBI: 1, SB: 2 } } as any

    const { weights, source } = useFootballScoring()
    expect(source.value).toBe('default')
    expect(weights.value).not.toHaveProperty('HR')
  })

  it('football + espn: falls back to defaults (ESPN cannot be read yet)', () => {
    const leagueStore = useLeagueStore()
    leagueStore.activeSport = 'football'
    leagueStore.activePlatform = 'espn'
    leagueStore.currentLeague = null

    const { weights, source } = useFootballScoring()
    expect(source.value).toBe('default')
    expect(weights.value).toBeTruthy()
  })
})
