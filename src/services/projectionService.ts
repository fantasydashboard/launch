import { supabase } from '@/lib/supabase'

// ESPN stat ID → FanGraphs projection column mapping (baseball)
// For stats FG doesn't project, we return null and the caller falls back to ESPN values
const ESPN_TO_FG_BATTER: Record<string, string | ((p: any) => number | null)> = {
  '0':  'ab',           // AB
  '1':  'h',            // H
  '2':  'r',            // R (batting stat_id 2 = R in some leagues)
  '3':  'hr',           // HR
  '4':  'rbi',          // RBI (stat_id 4)
  '5':  'sb',           // SB
  '6':  'bb',           // BB
  '7':  'so',           // K (batting)
  '8':  'ops',          // OPS
  '9':  'obp',          // OBP
  '10': 'slg',          // SLG
  '11': 'avg',          // AVG
  '14': (p) => p.raw_data?.['2B'] != null ? parseInt(p.raw_data['2B']) : null, // 2B
  '15': (p) => p.raw_data?.['3B'] != null ? parseInt(p.raw_data['3B']) : null, // 3B
  '17': 'pa',           // PA
  '19': 'tb',           // TB (computed in edge fn from 1B+2B*2+3B*3+HR*4)
  '23': 'rbi',          // RBI (stat_id 23 in some leagues)
  '25': (p) => p.raw_data?.HBP != null ? parseInt(p.raw_data.HBP) : null,     // HBP
  '32': 'r',            // R (alternate stat_id)
  '33': 'hr',           // HR (alternate)
  '34': 'tb',           // TB (alternate)
}

const ESPN_TO_FG_PITCHER: Record<string, string | ((p: any) => number | null)> = {
  '18': 'gp',           // G (pitching appearances)
  '35': 'w',            // W
  '36': 'l',            // L
  '37': 'sv',           // SV
  '38': 'hld',          // HD
  '39': 'ip',           // IP
  '41': 'ip',           // IP (alternate)
  '43': 'so',           // K (pitching)
  '47': 'era',          // ERA
  '48': 'whip',         // WHIP
  '53': 'gs',           // GS
  '57': (p) => p.raw_data?.BS != null ? parseInt(p.raw_data.BS) : null,  // BS
  '62': (p) => p.raw_data?.['K/BB'] != null ? parseFloat(p.raw_data['K/BB']) : null, // K/BB
  '63': (p) => p.raw_data?.QS != null ? parseInt(p.raw_data.QS) : null, // QS
  '67': (p) => p.raw_data?.TBF != null ? parseInt(p.raw_data.TBF) : null, // BF
  '71': (p) => {         // SVHD = SV + HLD
    const sv = p.sv ?? 0
    const hld = p.hld ?? 0
    return sv + hld
  },
  '83': (p) => p.raw_data?.AVG != null ? parseFloat(p.raw_data.AVG) : null, // OBA (opp batting avg)
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/\bjr\.?\b/gi, '')
    .replace(/\bsr\.?\b/gi, '')
    .replace(/\biii\b/gi, '')
    .replace(/\bii\b/gi, '')
    .replace(/\biv\b/gi, '')
    .replace(/[^a-z ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function makeMatchKey(name: string, team?: string): string {
  return `${normalizeName(name)}|${(team || '').toUpperCase().trim()}`
}

function makeNameOnlyKey(name: string): string {
  return normalizeName(name)
}

export interface FGProjection {
  mlbam_id: number
  player_name: string
  team: string
  position: string
  player_type: 'batter' | 'pitcher'
  // Batting
  g?: number; ab?: number; pa?: number; h?: number; hr?: number; r?: number
  rbi?: number; sb?: number; bb?: number; so?: number; tb?: number
  avg?: number; obp?: number; slg?: number; ops?: number; woba?: number
  iso?: number; babip?: number; k_pct?: number; bb_pct?: number; war?: number
  // Pitching
  w?: number; l?: number; gs?: number; gp?: number; sv?: number; hld?: number
  ip?: number; era?: number; whip?: number; k9?: number; bb9?: number
  k_bb_pct?: number; fip?: number
  // Raw blob
  raw_data?: any
}

export interface StatcastData {
  mlbam_id: number
  player_name: string
  player_type: 'batter' | 'pitcher'
  xba?: number; xslg?: number; xwoba?: number; xobp?: number; xiso?: number
  xera?: number
  exit_velocity_avg?: number; launch_angle_avg?: number
  barrel_rate?: number; hard_hit_pct?: number
  k_pct?: number; bb_pct?: number; whiff_pct?: number
  pa?: number
}

export interface EnrichedProjection {
  fgProjection: FGProjection | null
  statcast: StatcastData | null
  mappedStats: Record<string, number>  // ESPN stat_id → projected value
  breakoutSignals: string[]
}

let cachedProjections: FGProjection[] | null = null
let cachedStatcast: StatcastData[] | null = null
let cacheTimestamp = 0
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes

export async function loadProjectionData(): Promise<{
  projections: FGProjection[]
  statcast: StatcastData[]
}> {
  if (cachedProjections && cachedStatcast && Date.now() - cacheTimestamp < CACHE_TTL) {
    return { projections: cachedProjections, statcast: cachedStatcast }
  }

  const season = new Date().getFullYear()

  const [fgResult, scResult] = await Promise.all([
    supabase
      .from('fangraphs_projections')
      .select('*')
      .eq('season', season),
    supabase
      .from('statcast_metrics')
      .select('*')
      .eq('season', season),
  ])

  if (fgResult.error) {
    console.error('[ProjectionService] FanGraphs query error:', fgResult.error)
  }
  if (scResult.error) {
    console.error('[ProjectionService] Statcast query error:', scResult.error)
  }

  cachedProjections = (fgResult.data || []) as FGProjection[]
  cachedStatcast = (scResult.data || []) as StatcastData[]
  cacheTimestamp = Date.now()

  console.log(`[ProjectionService] Loaded ${cachedProjections.length} FG projections, ${cachedStatcast.length} Statcast metrics`)

  return { projections: cachedProjections, statcast: cachedStatcast }
}

// Build lookup maps for fast matching
function buildLookups(projections: FGProjection[], statcast: StatcastData[]) {
  const fgByNameTeam = new Map<string, FGProjection>()
  const fgByName = new Map<string, FGProjection>()
  for (const p of projections) {
    fgByNameTeam.set(makeMatchKey(p.player_name, p.team), p)
    if (!fgByName.has(makeNameOnlyKey(p.player_name))) {
      fgByName.set(makeNameOnlyKey(p.player_name), p)
    }
  }

  const scByNameTeam = new Map<string, StatcastData>()
  const scByName = new Map<string, StatcastData>()
  for (const s of statcast) {
    const nameKey = makeNameOnlyKey(s.player_name)
    if (!scByName.has(nameKey)) {
      scByName.set(nameKey, s)
    }
  }

  return { fgByNameTeam, fgByName, scByNameTeam, scByName }
}

// Match an ESPN player to FanGraphs + Statcast data
function matchPlayer(
  espnPlayer: { full_name: string; mlb_team?: string; position?: string },
  lookups: ReturnType<typeof buildLookups>
): { fg: FGProjection | null; sc: StatcastData | null } {
  const { fgByNameTeam, fgByName, scByName } = lookups

  // Try name+team first, then name-only
  let fg = fgByNameTeam.get(makeMatchKey(espnPlayer.full_name, espnPlayer.mlb_team))
  if (!fg) {
    fg = fgByName.get(makeNameOnlyKey(espnPlayer.full_name)) || null
  }

  const sc = scByName.get(makeNameOnlyKey(espnPlayer.full_name)) || null

  return { fg, sc }
}

// Map FanGraphs projection to ESPN stat IDs for a player
function mapToEspnStats(
  fg: FGProjection,
  categoryStatIds: string[]
): Record<string, number> {
  const mapped: Record<string, number> = {}
  const mapping = fg.player_type === 'pitcher' ? ESPN_TO_FG_PITCHER : ESPN_TO_FG_BATTER

  for (const statId of categoryStatIds) {
    const mapper = mapping[statId]
    if (!mapper) continue

    let value: number | null = null
    if (typeof mapper === 'string') {
      value = (fg as any)[mapper] ?? null
    } else {
      value = mapper(fg)
    }

    if (value !== null && value !== undefined) {
      mapped[statId] = value
    }
  }

  return mapped
}

// Detect breakout signals by comparing Statcast actuals to FG projection
function detectBreakouts(fg: FGProjection | null, sc: StatcastData | null): string[] {
  if (!fg || !sc) return []
  const signals: string[] = []

  if (sc.player_type === 'batter') {
    // Barrel rate breakout (≥3% above career-like baseline implies power surge)
    if (sc.barrel_rate != null && sc.barrel_rate >= 12) {
      signals.push(`barrel_elite:${sc.barrel_rate.toFixed(1)}%`)
    }
    // xwOBA significantly above projection wOBA
    if (sc.xwoba != null && fg.woba != null && sc.xwoba - fg.woba > 0.030) {
      signals.push(`xwoba_up:+${((sc.xwoba - fg.woba) * 1000).toFixed(0)}pts`)
    }
    if (sc.xwoba != null && fg.woba != null && fg.woba - sc.xwoba > 0.030) {
      signals.push(`xwoba_down:-${((fg.woba - sc.xwoba) * 1000).toFixed(0)}pts`)
    }
    // Hard hit elite
    if (sc.hard_hit_pct != null && sc.hard_hit_pct >= 45) {
      signals.push(`hard_hit_elite:${sc.hard_hit_pct.toFixed(1)}%`)
    }
  }

  if (sc.player_type === 'pitcher') {
    // K-BB% elite
    if (sc.k_pct != null && sc.bb_pct != null) {
      const kbb = sc.k_pct - sc.bb_pct
      if (kbb >= 20) signals.push(`kbb_elite:${kbb.toFixed(1)}%`)
    }
    // xERA significantly below projected ERA
    if (sc.xera != null && fg.era != null && fg.era - sc.xera > 0.50) {
      signals.push(`xera_up:${sc.xera.toFixed(2)}vs${fg.era.toFixed(2)}`)
    }
    if (sc.xera != null && fg.era != null && sc.xera - fg.era > 0.50) {
      signals.push(`xera_down:${sc.xera.toFixed(2)}vs${fg.era.toFixed(2)}`)
    }
    // Whiff rate elite (swinging strike indicator)
    if (sc.whiff_pct != null && sc.whiff_pct >= 30) {
      signals.push(`whiff_elite:${sc.whiff_pct.toFixed(1)}%`)
    }
  }

  return signals
}

// Main function: enrich ESPN players with FanGraphs + Statcast data
export async function enrichPlayersWithProjections(
  espnPlayers: any[],
  categoryStatIds: string[]
): Promise<Map<string, EnrichedProjection>> {
  const { projections, statcast } = await loadProjectionData()

  if (projections.length === 0) {
    console.warn('[ProjectionService] No FanGraphs data available — using ESPN projections only')
    return new Map()
  }

  const lookups = buildLookups(projections, statcast)
  const enriched = new Map<string, EnrichedProjection>()

  let matched = 0
  let unmatched = 0

  for (const player of espnPlayers) {
    const { fg, sc } = matchPlayer(player, lookups)
    const playerKey = player.player_key || player.player_id?.toString() || player.full_name

    if (fg) {
      matched++
      enriched.set(playerKey, {
        fgProjection: fg,
        statcast: sc,
        mappedStats: mapToEspnStats(fg, categoryStatIds),
        breakoutSignals: detectBreakouts(fg, sc),
      })
    } else {
      unmatched++
    }
  }

  console.log(`[ProjectionService] Matched ${matched}/${matched + unmatched} ESPN players to FanGraphs projections`)

  return enriched
}
