import type { Sport } from '@/types/supabase'

/** ESPN stat-id → display metadata. */
export interface EspnStatName {
  name: string
  display: string
  isNegative?: boolean
}

/**
 * ESPN stat-id → name maps, shared so both the category breakdown (which keys
 * its CATEGORIES off the GLOBAL/scoringItem id space) and any consumer that
 * needs to translate PLAYER-LEVEL stat ids work from one source of truth.
 *
 * IMPORTANT — two id spaces share this map by design:
 *  - Player-level season stats (rosterForMatchupPeriod / flattenStats) use the
 *    LOW ids, e.g. R=2, HR=3, RBI=4, TB=19.
 *  - League CATEGORIES (scoringItems) use the GLOBAL ids, e.g. R=32, HR=33,
 *    RBI=23, TB=34.
 * The intentional duplicate display names (2&32→"R", 3&33→"HR", 19&34→"TB",
 * 4&23→"RBI") are what lets a display-name match bridge the two spaces.
 */
export const espnBaseballStatNames: Record<number, EspnStatName> = {
  // Batting stats
  0: { name: 'At Bats', display: 'AB' },
  1: { name: 'Hits', display: 'H' },
  2: { name: 'Runs', display: 'R' },
  3: { name: 'Home Runs', display: 'HR' },
  4: { name: 'RBI', display: 'RBI' },
  5: { name: 'Stolen Bases', display: 'SB' },
  6: { name: 'Walks (Batting)', display: 'BB' },
  7: { name: 'Strikeouts (Batting)', display: 'K', isNegative: true },
  8: { name: 'OPS', display: 'OPS' },
  9: { name: 'On Base Percentage', display: 'OBP' },
  10: { name: 'Slugging Percentage', display: 'SLG' },
  11: { name: 'Batting Average', display: 'AVG' },
  12: { name: 'Grounded Into DP', display: 'GIDP', isNegative: true },
  13: { name: 'Singles', display: '1B' },
  14: { name: 'Doubles', display: '2B' },
  15: { name: 'Triples', display: '3B' },
  16: { name: 'Extra Base Hits', display: 'XBH' },
  17: { name: 'Plate Appearances', display: 'PA' },
  18: { name: 'Games', display: 'G' },
  19: { name: 'Total Bases', display: 'TB' },
  20: { name: "Fielder's Choice", display: 'FC' },
  21: { name: 'Fielding Percentage', display: 'FPCT' },
  22: { name: 'Sac Bunts', display: 'SAC' },
  23: { name: 'RBI', display: 'RBI' },
  24: { name: 'Errors', display: 'E', isNegative: true },
  25: { name: 'Hit By Pitch', display: 'HBP' },
  26: { name: 'Intentional Walks', display: 'IBB' },
  27: { name: 'Outfield Assists', display: 'OFAST' },
  28: { name: 'Double Plays Turned', display: 'DP' },
  29: { name: 'Putouts', display: 'PO' },
  30: { name: 'Assists', display: 'A' },
  31: { name: 'Total Chances', display: 'TC' },
  32: { name: 'Runs', display: 'R' },
  33: { name: 'Home Runs', display: 'HR' },
  34: { name: 'Total Bases', display: 'TB' },
  // Pitching stats
  35: { name: 'Wins', display: 'W' },
  36: { name: 'Losses', display: 'L', isNegative: true },
  37: { name: 'Saves', display: 'SV' },
  38: { name: 'Holds', display: 'HD' },
  39: { name: 'Innings Pitched', display: 'IP' },
  40: { name: 'Earned Runs', display: 'ER', isNegative: true },
  41: { name: 'Innings Pitched', display: 'IP' },
  42: { name: 'Earned Runs', display: 'ER', isNegative: true },
  43: { name: 'Strikeouts (Pitching)', display: 'K' },
  44: { name: 'Complete Games', display: 'CG' },
  45: { name: 'Shutouts', display: 'SHO' },
  46: { name: 'No Hitters', display: 'NH' },
  47: { name: 'ERA', display: 'ERA', isNegative: true },
  48: { name: 'WHIP', display: 'WHIP', isNegative: true },
  49: { name: 'Hits Allowed', display: 'HA', isNegative: true },
  50: { name: 'Runs Allowed', display: 'RA', isNegative: true },
  51: { name: 'Home Runs Allowed', display: 'HRA', isNegative: true },
  52: { name: 'Walks Allowed', display: 'BBI', isNegative: true },
  53: { name: 'Games Started', display: 'GS' },
  54: { name: 'Pitches Thrown', display: 'PC' },
  55: { name: 'Pickoffs', display: 'PKO' },
  56: { name: 'Wild Pitches', display: 'WP', isNegative: true },
  57: { name: 'Blown Saves', display: 'BS', isNegative: true },
  58: { name: 'Relief Wins', display: 'RW' },
  59: { name: 'Relief Losses', display: 'RL', isNegative: true },
  60: { name: 'Save Opportunities', display: 'SVO' },
  61: { name: 'Inherited Runners Scored', display: 'IRS', isNegative: true },
  62: { name: 'Strikeout to Walk Ratio', display: 'K/BB' },
  63: { name: 'Quality Starts', display: 'QS' },
  64: { name: 'Hit Batters', display: 'HB', isNegative: true },
  65: { name: 'Balks', display: 'BK', isNegative: true },
  66: { name: 'Ground Outs', display: 'GO' },
  67: { name: 'Batters Faced', display: 'BF' },
  68: { name: 'K/9', display: 'K/9' },
  69: { name: 'BB/9', display: 'BB/9', isNegative: true },
  70: { name: 'H/9', display: 'H/9', isNegative: true },
  71: { name: 'Saves + Holds', display: 'SVHD' },
  72: { name: 'Relief Appearances', display: 'RAPP' },
  73: { name: 'Total Bases Allowed', display: 'TBA', isNegative: true },
  74: { name: 'Win Percentage', display: 'W%' },
  75: { name: 'Losses (Pitching)', display: 'L', isNegative: true },
  76: { name: 'BABIP', display: 'BABIP' },
  77: { name: 'FIP', display: 'FIP', isNegative: true },
  78: { name: 'xFIP', display: 'xFIP', isNegative: true },
  79: { name: 'WAR (Batting)', display: 'WAR' },
  80: { name: 'WAR (Pitching)', display: 'WAR' },
  81: { name: 'wOBA', display: 'wOBA' },
  82: { name: 'wRC+', display: 'wRC+' },
  83: { name: 'Opponent Batting Avg', display: 'OBA', isNegative: true },
  99: { name: 'Games Pitched', display: 'GP' },
}

export const espnHockeyStatNames: Record<number, EspnStatName> = {
  0: { name: 'Goals', display: 'G' },
  1: { name: 'Assists', display: 'A' },
  2: { name: 'Points', display: 'PTS' },
  3: { name: 'Plus/Minus', display: '+/-' },
  4: { name: 'Penalty Minutes', display: 'PIM' },
  5: { name: 'Powerplay Goals', display: 'PPG' },
  6: { name: 'Powerplay Assists', display: 'PPA' },
  7: { name: 'Powerplay Points', display: 'PPP' },
  8: { name: 'Shorthanded Goals', display: 'SHG' },
  9: { name: 'Shorthanded Assists', display: 'SHA' },
  10: { name: 'Shorthanded Points', display: 'SHP' },
  11: { name: 'Game-Winning Goals', display: 'GWG' },
  12: { name: 'Shots on Goal', display: 'SOG' },
  13: { name: 'Shooting Percentage', display: 'SH%' },
  14: { name: 'Faceoffs Won', display: 'FOW' },
  15: { name: 'Faceoffs Lost', display: 'FOL', isNegative: true },
  16: { name: 'Hits', display: 'HIT' },
  17: { name: 'Blocks', display: 'BLK' },
  18: { name: 'Takeaways', display: 'TK' },
  19: { name: 'Wins', display: 'W' },
  20: { name: 'Losses', display: 'L', isNegative: true },
  21: { name: 'Goals Against', display: 'GA', isNegative: true },
  22: { name: 'Goals Against Average', display: 'GAA', isNegative: true },
  23: { name: 'Saves', display: 'SV' },
  24: { name: 'Save Percentage', display: 'SV%' },
  25: { name: 'Shutouts', display: 'SHO' },
  26: { name: 'Overtime Losses', display: 'OTL' },
  27: { name: 'Games Started', display: 'GS' },
  28: { name: 'Giveaways', display: 'GV', isNegative: true },
  29: { name: 'Avg Time on Ice', display: 'ATOI' },
  30: { name: 'Games Played', display: 'GP' },
  31: { name: 'Hat Tricks', display: 'HAT' },
  32: { name: 'Defensemen Points', display: 'DEF' },
  33: { name: 'Special Teams Points', display: 'STP' },
  34: { name: 'Faceoff Win Pct', display: 'FO%' },
  35: { name: 'Minutes', display: 'MIN' },
  36: { name: 'Shots', display: 'SH' },
  37: { name: 'Goalie Wins', display: 'GW' },
  38: { name: 'Shots Against', display: 'SA' },
  39: { name: 'Goals Saved Above Avg', display: 'GSAA' },
}

export const espnBasketballStatNames: Record<number, EspnStatName> = {
  0: { name: 'Points', display: 'PTS' },
  1: { name: 'Blocks', display: 'BLK' },
  2: { name: 'Steals', display: 'STL' },
  3: { name: 'Assists', display: 'AST' },
  4: { name: 'Offensive Rebounds', display: 'OREB' },
  5: { name: 'Defensive Rebounds', display: 'DREB' },
  6: { name: 'Rebounds', display: 'REB' },
  7: { name: 'Ejections', display: 'EJ', isNegative: true },
  8: { name: 'Flagrant Fouls', display: 'FF', isNegative: true },
  9: { name: 'Personal Fouls', display: 'PF', isNegative: true },
  10: { name: 'Technical Fouls', display: 'TF', isNegative: true },
  11: { name: 'Turnovers', display: 'TO', isNegative: true },
  12: { name: 'Disqualifications', display: 'DQ', isNegative: true },
  13: { name: 'Field Goals Made', display: 'FGM' },
  14: { name: 'Field Goals Attempted', display: 'FGA' },
  15: { name: 'Free Throws Made', display: 'FTM' },
  16: { name: 'Free Throws Attempted', display: 'FTA' },
  17: { name: '3-Pointers Made', display: '3PM' },
  18: { name: '3-Pointers Attempted', display: '3PA' },
  19: { name: 'Field Goal Pct', display: 'FG%' },
  20: { name: 'Free Throw Pct', display: 'FT%' },
  21: { name: '3-Point Pct', display: '3P%' },
  37: { name: 'Double-Doubles', display: 'DD' },
  38: { name: 'Triple-Doubles', display: 'TD' },
  40: { name: 'Games Played', display: 'GP' },
  41: { name: 'Minutes', display: 'MIN' },
  42: { name: 'Games Started', display: 'GS' },
}

/** Select the id → name map for a sport (baseball default). */
export function espnStatNamesForSport(sport: Sport): Record<number, EspnStatName> {
  return sport === 'hockey'
    ? espnHockeyStatNames
    : sport === 'basketball'
      ? espnBasketballStatNames
      : espnBaseballStatNames
}
