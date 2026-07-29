/** Slots that don't require a started player — excluded from need/surplus math. */
const NON_STARTING = new Set(['BN', 'BE', 'IL', 'NA', 'IR', 'DL', 'TAXI'])

/** ESPN MLB lineup slot id -> position label. Bench(16)/IL(17) intentionally absent. */
const ESPN_SLOT_TO_POS: Record<string, string> = {
  '0': 'C', '1': '1B', '2': '2B', '3': '3B', '4': 'SS', '5': 'OF',
  '6': '2B/SS', '7': '1B/3B', '8': 'LF', '9': 'CF', '10': 'RF', '11': 'DH',
  '12': 'UTIL', '13': 'P', '14': 'SP', '15': 'RP',
}

/** ESPN NFL lineup slot id -> position label. Bench(20)/IR(21) intentionally absent. */
const ESPN_NFL_SLOT_TO_POS: Record<string, string> = {
  '0': 'QB', '2': 'RB', '3': 'RB/WR', '4': 'WR', '5': 'WR/TE', '6': 'TE',
  '7': 'SUPER_FLEX', '16': 'DEF', '17': 'K', '23': 'FLEX',
}

/** Sleeper NFL flex slot labels -> canonical bucket. Non-flex labels pass through. */
const SLEEPER_NFL_FLEX_ALIASES: Record<string, string> = {
  WRRB_FLEX: 'FLEX', REC_FLEX: 'FLEX', FLEX: 'FLEX', SUPER_FLEX: 'SUPER_FLEX',
}

/** Yahoo NFL flex position labels -> canonical bucket. Non-flex labels pass through. */
const YAHOO_NFL_FLEX_ALIASES: Record<string, string> = {
  'W/R/T': 'FLEX', 'Q/W/R/T': 'SUPER_FLEX',
}

/** A flex slot -> the concrete eligible sub-positions that may fill it. */
export const FLEX_ELIGIBILITY: Record<string, string[]> = {
  UTIL: ['C', '1B', '2B', '3B', 'SS', 'OF', 'LF', 'CF', 'RF', 'DH'],
  DH: ['C', '1B', '2B', '3B', 'SS', 'OF', 'LF', 'CF', 'RF', 'DH'],
  IF: ['1B', '2B', '3B', 'SS'],
  MI: ['2B', 'SS'],
  CI: ['1B', '3B'],
  OF: ['OF', 'LF', 'CF', 'RF'],
  P: ['SP', 'RP', 'P'],
  '2B/SS': ['2B', 'SS'],
  '1B/3B': ['1B', '3B'],
}

/** Standard 12-team mixed-league baseball roster when settings are unavailable. */
export const DEFAULT_SLOTS: Record<string, number> = {
  C: 1, '1B': 1, '2B': 1, '3B': 1, SS: 1, OF: 3, UTIL: 2, SP: 5, RP: 3,
}

/** Standard 10-team football starting roster when settings are unavailable. */
export const DEFAULT_NFL_SLOTS: Record<string, number> = {
  QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, K: 1, DEF: 1,
}

export function parseRosterSlots(
  platform: 'yahoo' | 'espn' | 'sleeper' | string,
  settings: any,
  sport: string = 'baseball',
): Record<string, number> {
  const isFootball = sport === 'football'
  const espnMap = isFootball ? ESPN_NFL_SLOT_TO_POS : ESPN_SLOT_TO_POS
  const out: Record<string, number> = {}

  if (platform === 'yahoo' && Array.isArray(settings?.roster_positions)) {
    for (const rp of settings.roster_positions) {
      const node = rp?.roster_position ?? rp
      const raw = String(node?.position ?? '').trim()
      const pos = YAHOO_NFL_FLEX_ALIASES[raw] ?? raw
      const count = Number(node?.count ?? 0)
      if (!pos || NON_STARTING.has(pos) || count <= 0) continue
      out[pos] = (out[pos] ?? 0) + count
    }
  } else if (platform === 'sleeper' && Array.isArray(settings?.roster_positions)) {
    for (const slot of settings.roster_positions as string[]) {
      const raw = String(slot || '').trim()
      if (!raw || NON_STARTING.has(raw)) continue
      const pos = SLEEPER_NFL_FLEX_ALIASES[raw] ?? raw
      out[pos] = (out[pos] ?? 0) + 1
    }
  } else if (platform === 'espn' && settings?.rosterSettings?.lineupSlotCounts) {
    for (const [slotId, count] of Object.entries(settings.rosterSettings.lineupSlotCounts)) {
      const pos = espnMap[slotId]
      const n = Number(count)
      if (!pos || NON_STARTING.has(pos) || n <= 0) continue
      out[pos] = (out[pos] ?? 0) + n
    }
  }

  // Baseball only: fold granular outfield slots into one OF pool. Managers think in "OF",
  // and an OF-eligible player fills any of LF/CF/RF — keeping them separate manufactured
  // phantom holes. Football has no such slots, so skip it there.
  if (!isFootball) {
    for (const g of ['LF', 'CF', 'RF']) {
      if (out[g]) { out['OF'] = (out['OF'] ?? 0) + out[g]; delete out[g] }
    }
  }

  if (Object.keys(out).length) return out
  return isFootball ? { ...DEFAULT_NFL_SLOTS } : { ...DEFAULT_SLOTS }
}
