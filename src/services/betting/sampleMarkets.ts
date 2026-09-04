// services/betting/sampleMarkets.ts
//
// A hand-built slate so the board is developable before an API key exists, and
// so the empty state and the working state can be told apart during review.
//
// The prices are realistic but invented. Anything rendered from this data is
// labelled SAMPLE in the UI, loudly, because a screen full of plausible looking
// picks that came from a fixture is exactly the kind of thing that ships by
// accident and then gets screenshotted.
//
// The slate deliberately covers all three confidence levels, because the whole
// point of the board is that it distinguishes them:
//   - Bijan has two sharp lines priced, so his numbers are fitted, not assumed.
//   - Drake London has one, so anything off that number is modeled.
//   - Chuba's app line sits exactly on a priced sharp line, so it is exact.

import type { Market } from './types'
import type { DfsOffer } from './picksBoard'

function minutesAgo(m: number): string {
  return new Date(Date.now() - m * 60_000).toISOString()
}

export const SAMPLE_EVENT = {
  id: 'sample:ATL@CAR',
  sport_key: 'americanfootball_nfl',
  league: 'NFL',
  commence_time: new Date(Date.now() + 26 * 3600_000).toISOString(),
  home_team: 'Carolina Panthers',
  away_team: 'Atlanta Falcons',
}

const E = SAMPLE_EVENT.id

function q(book: string, outcome: string, american: number, point: number, mins = 4) {
  return { book, outcome, american, point, observedAt: minutesAgo(mins) }
}

/** A sharp two-sided market at one number. */
function sharp(marketKey: string, player: string, point: number, over: number, under: number): Market {
  return {
    eventId: E, marketKey, player, point,
    outcomes: ['Over', 'Under'],
    quotes: [
      q('lowvig', 'Over', over, point), q('lowvig', 'Under', under, point),
      q('betonlineag', 'Over', over - 2, point), q('betonlineag', 'Under', under + 2, point),
    ],
  }
}

/** A pick'em app line. One number, no meaningful price on either side. */
function dfs(marketKey: string, player: string, point: number, books: string[]): Market {
  return {
    eventId: E, marketKey, player, point,
    outcomes: ['Over', 'Under'],
    quotes: books.flatMap(b => [
      q(b, 'Over', -119, point), q(b, 'Under', -119, point),
    ]),
  }
}

export function sampleMarkets(): Market[] {
  return [
    // ── Bijan: two sharp points, so the fit is real ──────────────────────────
    sharp('player_rush_yds', 'Bijan Robinson', 74.5, -110, -110),
    sharp('player_rush_yds', 'Bijan Robinson', 84.5, 145, -175),
    // The apps have him nearly ten yards low. This should top the board.
    dfs('player_rush_yds', 'Bijan Robinson', 65.5, ['prizepicks', 'underdog']),

    // ── Drake London: one sharp point, so anything off it is modeled ─────────
    sharp('player_reception_yds', 'Drake London', 61.5, -108, -112),
    dfs('player_reception_yds', 'Drake London', 68.5, ['prizepicks']),
    // Underdog disagrees with PrizePicks by three yards. Exactly the kind of
    // scatter that decides whether a Sleeper proxy is trustworthy.
    dfs('player_reception_yds', 'Drake London', 65.5, ['underdog']),

    // ── Chuba: the app line sits on the sharp line, so no edge and no model ──
    sharp('player_rush_yds', 'Chuba Hubbard', 52.5, -110, -110),
    dfs('player_rush_yds', 'Chuba Hubbard', 52.5, ['prizepicks', 'underdog']),

    // ── Bryce Young: passing, low variance, small but real gap ──────────────
    sharp('player_pass_yds', 'Bryce Young', 214.5, -112, -108),
    sharp('player_pass_yds', 'Bryce Young', 234.5, 130, -158),
    dfs('player_pass_yds', 'Bryce Young', 199.5, ['prizepicks', 'underdog']),

    // ── A Hard Rock sportsbook market, for the other tab ────────────────────
    {
      eventId: E, marketKey: 'totals', player: null, point: 44.5,
      outcomes: ['Over', 'Under'],
      quotes: [
        q('lowvig', 'Over', -106, 44.5), q('lowvig', 'Under', -104, 44.5),
        q('betonlineag', 'Over', -108, 44.5), q('betonlineag', 'Under', -102, 44.5),
        q('hardrockbet_fl', 'Over', 100, 44.5), q('hardrockbet_fl', 'Under', -122, 44.5),
      ],
    },
  ]
}

/** A hand-typed Sleeper line, to exercise the manual path without a database. */
export function sampleManualLines(): DfsOffer[] {
  return [
    {
      player: 'Bijan Robinson', marketKey: 'player_rush_yds', eventId: E,
      book: 'sleeper', point: 66.5, observedAt: minutesAgo(12), manual: true,
    },
  ]
}
