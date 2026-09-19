// Map a player's NHL team abbreviation to the ESPN team-logo CDN. Returns undefined for an
// unknown or blank abbr so callers OMIT the decorative logo rather than show a broken image —
// the same contract as mlbTeamLogo and nflTeamLogo.
//
// THE ABBREVIATIONS ARE ESPN'S OWN, taken from its proTeams table rather than written from
// memory. That distinction is not pedantry: the first hockey team map in this codebase was
// written from memory and put MacKinnon on San Jose, Celebrini on Seattle and Scheifele on
// Nashville. Every logo rendered, nothing looked broken, and only somebody who follows the
// NHL would have caught it.
//
//   curl 'https://lm-api-reads.fantasy.espn.com/apis/v3/games/fhl/seasons/2027
//         ?view=proTeamSchedules_wl'  ->  settings.proTeams[].abbrev
//
// Alternates are included where other sources disagree with ESPN: ESPN writes LA, NJ, SJ, TB
// and UTA where most feeds write LAK, NJD, SJS, TBL and UTAH.
const TO_ESPN: Record<string, string> = {
  ANA: 'ana',
  BOS: 'bos',
  BUF: 'buf',
  CAR: 'car',
  CBJ: 'cbj',
  CGY: 'cgy',
  CHI: 'chi',
  COL: 'col',
  DAL: 'dal',
  DET: 'det',
  EDM: 'edm',
  FLA: 'fla',
  LA: 'la', LAK: 'la',
  MIN: 'min',
  MTL: 'mtl',
  NJ: 'nj', NJD: 'nj',
  NSH: 'nsh',
  NYI: 'nyi',
  NYR: 'nyr',
  OTT: 'ott',
  PHI: 'phi',
  PIT: 'pit',
  SEA: 'sea',
  SJ: 'sj', SJS: 'sj',
  STL: 'stl',
  TB: 'tb', TBL: 'tb',
  TOR: 'tor',
  UTA: 'uta', UTAH: 'uta',
  VAN: 'van',
  VGK: 'vgk',
  WPG: 'wpg',
  WSH: 'wsh', WAS: 'wsh',
}

export function nhlTeamLogo(abbr: string | undefined): string | undefined {
  if (!abbr) return undefined
  const espn = TO_ESPN[abbr.toUpperCase().trim()]
  return espn ? `https://a.espncdn.com/i/teamlogos/nhl/500/${espn}.png` : undefined
}
