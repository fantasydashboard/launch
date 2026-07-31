// Map an NFL team abbreviation (Sleeper / standard sources) to the ESPN team-logo CDN.
// Returns undefined for an unknown/blank abbr so callers OMIT the decorative logo rather
// than show a broken image.
const TO_ESPN: Record<string, string> = {
  ARI: 'ari',
  ATL: 'atl',
  BAL: 'bal',
  BUF: 'buf',
  CAR: 'car',
  CHI: 'chi',
  CIN: 'cin',
  CLE: 'cle',
  DAL: 'dal',
  DEN: 'den',
  DET: 'det',
  GB: 'gb',
  HOU: 'hou',
  IND: 'ind',
  JAX: 'jax',
  KC: 'kc',
  LV: 'lv',
  LAC: 'lac',
  LAR: 'lar',
  MIA: 'mia',
  MIN: 'min',
  NE: 'ne',
  NO: 'no',
  NYG: 'nyg',
  NYJ: 'nyj',
  PHI: 'phi',
  PIT: 'pit',
  SF: 'sf',
  SEA: 'sea',
  TB: 'tb',
  TEN: 'ten',
  WAS: 'wsh',
}

export function nflTeamLogo(abbr: string | undefined): string | undefined {
  if (!abbr) return undefined
  const espn = TO_ESPN[abbr.toUpperCase().trim()]
  return espn ? `https://a.espncdn.com/i/teamlogos/nfl/500/${espn}.png` : undefined
}
