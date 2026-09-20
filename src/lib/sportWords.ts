/**
 * The words a sport uses for the same idea.
 *
 * WHY THIS EXISTS. The points surfaces were written when baseball was the only non-football
 * sport, so its vocabulary went in as literal text: "HITTERS", "two-start arms", "full-slate
 * bats", "stream a bat", "bites at the apple", "No MLB games today". A hockey league read all
 * of it, which is not a cosmetic problem — a reader told to stream a bat has been told the
 * product does not know what sport they are playing, and stops trusting the numbers beside it.
 *
 * The concepts survive the translation because they are about VOLUME, not about baseball. A
 * hitter and a skater are both the everyday body who accrues counting stats; a pitcher and a
 * goalie are both the scarce, scheduled position whose starts you plan around. Hockey even
 * keeps two-start goalies. Where the idiom does NOT survive — "bites at the apple" is plate
 * appearances and nothing else — the phrase is replaced rather than translated.
 */

export interface SportWords {
  /** The everyday body. Plural, lower case. */
  skaters: string
  /** The scarce scheduled position. Plural, lower case. */
  goalies: string
  /** One of the scarce position, singular — for "stream a ___". */
  goalie: string
  /** One everyday body, singular — for "stream a ___". */
  skater: string
  /** How a week's volume is described: "hitter-games", "skater-games". */
  volumeLabel: string
  /** What a busy week buys you, in that sport's terms. */
  volumeIdiom: string
  /** The league's own name, for "No ___ games today". */
  league: string
}

const BASEBALL: SportWords = {
  skaters: 'hitters', goalies: 'pitchers', goalie: 'arm', skater: 'bat',
  volumeLabel: 'hitter-games', volumeIdiom: 'bites at the apple', league: 'MLB',
}

const WORDS: Record<string, SportWords> = {
  baseball: BASEBALL,
  hockey: {
    skaters: 'skaters', goalies: 'goalies', goalie: 'goalie', skater: 'skater',
    volumeLabel: 'skater-games', volumeIdiom: 'games played', league: 'NHL',
  },
  basketball: {
    skaters: 'players', goalies: 'centers', goalie: 'center', skater: 'player',
    volumeLabel: 'player-games', volumeIdiom: 'games played', league: 'NBA',
  },
  football: {
    /* Football has one weekly game per player, so none of the volume language applies — it
       has its own surfaces and does not read these. Present so a lookup never falls through
       to baseball's vocabulary by accident. */
    skaters: 'skill players', goalies: 'quarterbacks', goalie: 'quarterback', skater: 'flex',
    volumeLabel: 'games', volumeIdiom: 'snaps', league: 'NFL',
  },
}

/** The vocabulary for a sport. Baseball for anything unrecognised — it is where these came from. */
export function wordsFor(sport: string | undefined): SportWords {
  return WORDS[String(sport ?? '')] ?? BASEBALL
}

/** Title case for a heading: "HITTERS" / "SKATERS". */
export const upper = (s: string) => s.toUpperCase()
