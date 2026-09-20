import { nflTeamLogo } from './nflTeamLogo'
import { mlbTeamLogo } from './mlbTeamLogo'
import { nhlTeamLogo } from './nhlTeamLogo'

/**
 * A team logo for any sport, in one place.
 *
 * WHY THIS EXISTS. Six views each picked a logo helper with their own copy of
 * `isFootball ? nfl : mlb`, which was correct while there were two sports and became wrong
 * the moment there were three. Hockey fell to the MLB map everywhere, and because several
 * NHL abbreviations are also MLB ones — COL, DET, TOR, PIT, STL, PHI, BOS, CHI, WSH — the
 * result was not a broken image. It was the Red Sox beside David Pastrnak, the Blue Jays
 * beside Auston Matthews and the Pirates beside Kris Letang, with a broken icon for every
 * club baseball does not happen to share.
 *
 * A wrong logo that renders is worse than one that does not, because nothing looks broken.
 * One function, one place to add basketball.
 */
export function teamLogoFor(sport: string | undefined, abbr: string | undefined): string | undefined {
  switch (sport) {
    case 'football': return nflTeamLogo(abbr)
    case 'hockey': return nhlTeamLogo(abbr)
    case 'basketball': return undefined   // no NBA map yet — absent beats wrong
    default: return mlbTeamLogo(abbr)
  }
}
