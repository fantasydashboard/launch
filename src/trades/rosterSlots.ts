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
  // Football flex slots (keys don't collide with the baseball entries above).
  FLEX: ['RB', 'WR', 'TE'],
  SUPER_FLEX: ['QB', 'RB', 'WR', 'TE'],
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

/**
 * The concrete positions a league can actually START, with flex slots expanded to the
 * positions eligible to fill them.
 *
 * Recommending a kicker to a league with no kicker slot is the loudest possible way to
 * say "this tool did not read your settings" — and The Wire did exactly that, because it
 * carried a hardcoded QB/RB/WR/TE/K/DEF list while the parsed slots were sitting right
 * next to it. A league running QB/RB/RB/WR/WR/TE/FLEX×3 gets {QB, RB, WR, TE} here.
 */
export function startablePositions(slots: Record<string, number>): Set<string> {
  const out = new Set<string>()
  for (const [slot, count] of Object.entries(slots ?? {})) {
    if (!Number.isFinite(count) || Number(count) <= 0) continue
    const eligible = FLEX_ELIGIBILITY[slot]
    if (eligible) for (const p of eligible) out.add(p)
    else out.add(slot)
  }
  return out
}

/**
 * How many players at each position are STARTABLE across the whole league.
 *
 * A positional rank means nothing without this denominator: "WR44" and "WR51" look equally
 * bad, and "RB3" only reads as elite if you already know the league size. Dividing the rank
 * by the startable pool turns both into the same scale — and it handles onesie positions for
 * free, because "only ten quarterbacks start" is already in the denominator. No special case.
 *
 * Flex slots are allocated by how managers ACTUALLY fill them, because neither of the two
 * obvious derivations survives contact with real leagues:
 *
 *  - Splitting evenly gave TE a pool of 20 against QB's 10 in a standard league, so TE11 read
 *    as a comfortable starter while QB9 read as replaceable.
 *  - Splitting by dedicated slots still overfed TE (2:2:1 leaves it a fifth of every flex
 *    seat, which nobody plays), and it collapses entirely in superflex, where QB has one
 *    dedicated slot and yet roughly fifteen quarterbacks start.
 *
 * FLEX_USAGE is a stated football convention rather than something derived, and it is written
 * down here so it can be argued with: a superflex seat goes to a quarterback almost every
 * time, a standard flex goes to a back or receiver and only occasionally a tight end. The
 * weights are normalised across whichever positions a given slot admits, so the same table
 * produces the right answer for standard, superflex, and two-tight-end leagues alike.
 */
const FLEX_USAGE: Record<string, number> = { QB: 1.0, RB: 0.4, WR: 0.45, TE: 0.1 }
export function startableCounts(
  slots: Record<string, number>,
  leagueSize: number,
): Record<string, number> {
  const perTeam: Record<string, number> = {}
  for (const [slot, rawCount] of Object.entries(slots ?? {})) {
    const count = Number(rawCount)
    if (!Number.isFinite(count) || count <= 0) continue
    if (!FLEX_ELIGIBILITY[slot]) perTeam[slot] = (perTeam[slot] ?? 0) + count
  }

  /* Flex is allocated after the dedicated slots are known, so the weights exist to divide by.
     A position eligible for flex but with no dedicated slot of its own still deserves a
     share, so weights floor at a token amount rather than at zero. */
  for (const [slot, rawCount] of Object.entries(slots ?? {})) {
    const count = Number(rawCount)
    const eligible = FLEX_ELIGIBILITY[slot]
    if (!eligible?.length || !Number.isFinite(count) || count <= 0) continue
    const weights = eligible.map((pos) => FLEX_USAGE[pos] ?? 0.25)
    const total = weights.reduce((a, b) => a + b, 0)
    eligible.forEach((pos, i) => {
      perTeam[pos] = (perTeam[pos] ?? 0) + (count * weights[i]) / total
    })
  }
  const teams = Math.max(1, Math.floor(Number(leagueSize) || 0))
  const out: Record<string, number> = {}
  for (const [pos, n] of Object.entries(perTeam)) out[pos] = Math.max(1, Math.round(n * teams))
  return out
}

/**
 * Where a positional rank sits in the startable pool, as a fraction. <= 1 is a starter.
 * Returns null when the position has no startable pool (rank can't be placed on a scale).
 */
export function startableFraction(
  posRank: number,
  position: string,
  counts: Record<string, number>,
): number | null {
  const pool = counts[String(position ?? '').toUpperCase()]
  if (!pool || !posRank || posRank <= 0) return null
  return posRank / pool
}
