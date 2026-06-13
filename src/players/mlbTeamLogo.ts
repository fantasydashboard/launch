// Map a player's MLB team abbreviation (which varies by source — Yahoo `SD`/`CWS`, ESPN
// `sd`/`chw`, schedule `ATH`/`AZ`) to the ESPN team-logo CDN. Returns undefined for an
// unknown/blank abbr so callers OMIT the decorative logo rather than show a broken image.
const TO_ESPN: Record<string, string> = {
  ARI: 'ari', AZ: 'ari',
  ATL: 'atl',
  BAL: 'bal',
  BOS: 'bos',
  CHC: 'chc',
  CHW: 'chw', CWS: 'chw',
  CIN: 'cin',
  CLE: 'cle',
  COL: 'col',
  DET: 'det',
  HOU: 'hou',
  KC: 'kc', KCR: 'kc',
  LAA: 'laa', ANA: 'laa',
  LAD: 'lad',
  MIA: 'mia',
  MIL: 'mil',
  MIN: 'min',
  NYM: 'nym',
  NYY: 'nyy',
  ATH: 'oak', OAK: 'oak',
  PHI: 'phi',
  PIT: 'pit',
  SD: 'sd', SDP: 'sd',
  SEA: 'sea',
  SF: 'sf', SFG: 'sf',
  STL: 'stl',
  TB: 'tb', TBR: 'tb',
  TEX: 'tex',
  TOR: 'tor',
  WSH: 'wsh', WAS: 'wsh', WSN: 'wsh',
}

export function mlbTeamLogo(abbr: string | undefined): string | undefined {
  if (!abbr) return undefined
  const espn = TO_ESPN[abbr.toUpperCase().trim()]
  return espn ? `https://a.espncdn.com/i/teamlogos/mlb/500/${espn}.png` : undefined
}
