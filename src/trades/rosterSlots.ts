/** Slots that don't require a started player — excluded from need/surplus math. */
const NON_STARTING = new Set(['BN', 'BE', 'IL', 'NA', 'IR', 'DL', 'TAXI', 'BENCH'])

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

/**
 * ESPN NHL lineup slot id -> position label. Bench(7)/IR(8) intentionally absent.
 *
 * THE THIRD TIME THIS MAP HAS BEEN MISSING AND THE SECOND TIME IT SHIPPED. Football was read
 * through the baseball map until somebody noticed a quarterback coming back a catcher.
 * Hockey then did it again: a ten-team league starting nine forwards, five defencemen, two
 * goalies and a utility came back as nine THIRD BASEMEN, five shortstops and two outfielders,
 * and My Team, Trades and the Matchup all reported twenty-three empty baseball slots above a
 * bench holding the entire roster — because no hockey player can fill a shortstop.
 *
 * Derived in src/hockey/hockeyPositions.ts from the share of each position carrying each
 * eligibleSlots entry across the whole projection pool. Every cell there was 100% or 0%.
 */
const ESPN_NHL_SLOT_TO_POS: Record<string, string> = {
  '0': 'C', '1': 'LW', '2': 'RW', '3': 'F', '4': 'D', '5': 'G', '6': 'UTIL',
}

/**
 * Team-defence spellings, folded to one canonical label.
 *
 * ESPN calls the position "D/ST" while its own lineup slot 16 parses to "DEF", so the slot and
 * the player who fills it never matched: the board showed an open DEF seat above a bench
 * holding the Steelers. Worse, every position normaliser in the codebase splits on "/" to
 * handle multi-eligible players, so "D/ST" came out as "D" — which is why the row's rank read
 * "D9". Fold before anything splits, or the slash eats the position.
 *
 * Sleeper says DEF, Yahoo says DEF, ESPN says D/ST. One word downstream.
 */
export const DEF_ALIASES = new Set(['D/ST', 'DST', 'D-ST', 'DEF', 'DEFENSE'])

/**
 * The one spelling that means two different positions.
 *
 * "D" is a team defence in football and a defenceman in hockey, and nothing about the token
 * separates them — only the sport does. It lived in DEF_ALIASES because every football caller
 * splits "D/ST" on the slash BEFORE normalising and hands this function a bare "D".
 *
 * The cost of keeping it there was that every defenceman in every hockey league came back as
 * "DEF". coversSlot then asked whether a team defence can fill a D slot, which it cannot, so
 * no defenceman was ever seated: the Trades page drew four or five empty D slots beside a
 * roster full of them, on both platforms, while the forwards seated fine.
 *
 * src/hockey/hockeyVor.ts saw this and routed around it — it declines to reuse the football
 * VOR engine for exactly this reason and says so in its header — which fixed one file and
 * left the shared trade engine wrong.
 */
const BARE_D = 'D'

/** Canonical position label: folds team-defence spellings, leaves everything else alone. */
export function canonicalPosition(raw: string, sport?: string): string {
  const up = String(raw || '').trim().toUpperCase()
  if (DEF_ALIASES.has(up)) return 'DEF'
  /* Only football folds the bare letter. The default is the safe one: a caller that does not
     know its sport must not rename a hockey position after a football one. */
  if (up === BARE_D && String(sport ?? '').toLowerCase() === 'football') return 'DEF'
  return up
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
  UTIL: ['C', '1B', '2B', '3B', 'SS', 'OF', 'LF', 'CF', 'RF', 'DH', 'LW', 'RW', 'D'],
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
  /*
   * Hockey. F is the forward slot — any of the three forward positions.
   *
   * UTIL is the one key that genuinely collides: it means "any hitter" in baseball and "any
   * skater" in hockey. The lists merge rather than branch because the two vocabularies are
   * disjoint apart from C, which is utility-eligible in BOTH sports — there are no
   * defencemen in baseball and no shortstops in hockey, so neither sport can match the
   * other's entries. LW, RW and D are appended to UTIL below for that reason.
   *
   * Basketball will not get this luxury: its F and C mean different things again, and it
   * will need the sport passed in rather than another merge.
   */
  F: ['C', 'LW', 'RW'],
}

/**
 * UTIL, resolved by sport.
 *
 * THE MERGE ABOVE IS ONLY SAFE WHERE A PLAYER IS ON THE OTHER SIDE OF THE COMPARISON. Its own
 * comment argues the baseball and hockey vocabularies are disjoint apart from C, so neither
 * sport can match the other's entries — true for `coversSlot` and `slotAccepts`, which hold
 * the list up against a real player: no hockey player is shortstop-eligible, so the baseball
 * half is discarded for free, and those two keep using the merged list.
 *
 * `startableCounts` walks the list with NO player, so nothing discards anything. A hockey
 * league came back reporting a startable pool of one shortstop, one first baseman and one
 * designated hitter, while its own defencemen split the utility seat thirteen ways instead of
 * four. A baseball league had the same three phantoms at LW, RW and D.
 *
 * So the safety argument was never about the vocabularies being disjoint — it was about a
 * player being there to do the discarding. Where there is no player, the sport has to be
 * passed, which is what the FLEX_ELIGIBILITY comment predicted basketball would force.
 */
const UTIL_BY_SPORT: Record<string, string[]> = {
  hockey: ['C', 'LW', 'RW', 'D'],
  baseball: ['C', '1B', '2B', '3B', 'SS', 'OF', 'LF', 'CF', 'RF', 'DH'],
}

/**
 * Which concrete positions may fill a slot, for a caller that has no player to compare.
 *
 * Undefined for a concrete position, which is how callers tell a flex seat from a real one.
 * A sport with no UTIL table of its own keeps the merged list: wrong is recoverable and
 * visible, where an empty list would read as "this league has no utility seat".
 */
export function flexEligibility(slot: string, sport: string): string[] | undefined {
  const up = String(slot || '').toUpperCase()
  if (up === 'UTIL' && UTIL_BY_SPORT[sport]) return UTIL_BY_SPORT[sport]
  return FLEX_ELIGIBILITY[up]
}

/** Standard 12-team mixed-league baseball roster when settings are unavailable. */
export const DEFAULT_SLOTS: Record<string, number> = {
  C: 1, '1B': 1, '2B': 1, '3B': 1, SS: 1, OF: 3, UTIL: 2, SP: 5, RP: 3,
}

/** Standard 10-team football starting roster when settings are unavailable. */
/**
 * The lineup the free board is priced for, and the fallback for a league we could not read.
 *
 * THREE RECEIVERS, NOT TWO, AND THE REASON IS COHERENCE. The slot count is what sets
 * replacement level, and replacement level is the entire cross-position shape of the board.
 * At two, the replacement receiver sits around WR24-30, everyone past that prices below
 * replacement and sinks — and because the flex is then pulled toward running backs, deep
 * backs sink with them.
 *
 * Measured against an analyst rest-of-season baseline at week 4 of 2026, moving this one
 * number from 2 to 3 lifted overall Spearman from 0.880 to 0.907 and shrank the positional
 * bias at EVERY position at once: QB -22.8 to -8.5, RB +29.0 to +16.5, WR +13.1 to +9.9,
 * TE -12.2 to -4.8. Nothing else available touches four positions with one edit.
 *
 * But the argument for shipping it is not that it matches somebody: it is that the free board
 * is now scored at HALF PPR, which is Sleeper's default, and Sleeper's default lineup carries
 * three receivers. ESPN and Yahoo pair two receivers with full PPR. We were running Sleeper's
 * scoring on ESPN's lineup, and whichever default we choose both halves should come from the
 * same place.
 *
 * AND THE ONE REAL LEAGUE WE HAVE ON RECORD IS DEEPER STILL. League of Record starts
 * QB/RB/RB/WR/WR/TE/FLEX/FLEX/FLEX — NINE skill seats, against the seven this default used to
 * price for. Three flex slots push the effective receiver and back replacement far past a
 * two-receiver lineup, in the same direction this change moves and further. So three is a
 * conservative correction rather than an aggressive one.
 *
 * It remains a judgement about the typical league rather than a measurement of many: nothing
 * here samples connected leagues. If our users run two, it is one character back, and `SLOTS`
 * on scripts/football-board-export.ts shows what any lineup shape does to the board before
 * anybody ships it.
 */
export const DEFAULT_NFL_SLOTS: Record<string, number> = {
  QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1, K: 1, DEF: 1,
}

/**
 * The league's starting slots IN ORDER, one entry per seat.
 *
 * parseRosterSlots aggregates to counts, which is right for solving a lineup and useless for
 * reading one: platforms publish a set lineup as a positional array where the nth entry fills
 * the nth starting slot. Without the order we had to re-solve which seat each player occupied,
 * and the solver put a receiver in the flex because that is where it would have played him —
 * not where his manager did.
 *
 * Bench and IR are excluded, so the result lines up index-for-index with the starters array.
 */
export function startingSlotOrder(
  platform: 'yahoo' | 'espn' | 'sleeper' | string,
  settings: any,
  sport: string = 'baseball',
): string[] {
  const isFootball = sport === 'football'
  const out: string[] = []
  if (platform === 'sleeper' && Array.isArray(settings?.roster_positions)) {
    for (const slot of settings.roster_positions as string[]) {
      const raw = String(slot || '').trim()
      if (!raw || NON_STARTING.has(raw)) continue
      out.push(SLEEPER_NFL_FLEX_ALIASES[raw] ?? canonicalPosition(raw))
    }
  } else if (platform === 'yahoo' && Array.isArray(settings?.roster_positions)) {
    for (const rp of settings.roster_positions) {
      const node = rp?.roster_position ?? rp
      const raw = String(node?.position ?? '').trim()
      const pos = YAHOO_NFL_FLEX_ALIASES[raw] ?? canonicalPosition(raw)
      const count = Number(node?.count ?? 0)
      if (!pos || NON_STARTING.has(pos) || count <= 0) continue
      for (let i = 0; i < count; i++) out.push(pos)
    }
  } else if (platform === 'espn' && settings?.rosterSettings?.lineupSlotCounts) {
    const map = isFootball ? ESPN_NFL_SLOT_TO_POS : ESPN_SLOT_TO_POS
    /* ESPN publishes counts keyed by slot id, so the only order available is the slot id
       itself — which is the order ESPN itself renders a lineup in. */
    const ids = Object.keys(settings.rosterSettings.lineupSlotCounts)
      .sort((a, b) => Number(a) - Number(b))
    for (const id of ids) {
      const pos = map[id]
      const n = Number(settings.rosterSettings.lineupSlotCounts[id])
      if (!pos || NON_STARTING.has(pos) || !Number.isFinite(n) || n <= 0) continue
      for (let i = 0; i < n; i++) out.push(pos)
    }
  }
  return out
}

export function parseRosterSlots(
  platform: 'yahoo' | 'espn' | 'sleeper' | string,
  settings: any,
  sport: string = 'baseball',
): Record<string, number> {
  const isFootball = sport === 'football'
  const isHockey = sport === 'hockey'
  /* Baseball is the default because it was the only sport when this was written, not because
     it is a sensible fallback — an unmapped sport gets a lineup of catchers and shortstops. */
  const espnMap = isFootball ? ESPN_NFL_SLOT_TO_POS
    : isHockey ? ESPN_NHL_SLOT_TO_POS
    : ESPN_SLOT_TO_POS
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
  // phantom holes.
  //
  // This tested `!isFootball`, which was the same thing while there were two sports and
  // stopped being so the moment there were three — hockey would have run baseball's outfield
  // folding. Naming the sport it applies to rather than the one it does not is what keeps
  // that from happening again at basketball.
  if (!isFootball && !isHockey) {
    for (const g of ['LF', 'CF', 'RF']) {
      if (out[g]) { out['OF'] = (out['OF'] ?? 0) + out[g]; delete out[g] }
    }
  }

  if (Object.keys(out).length) return out
  /* No hockey default: a league we could not read is not a league we should invent a lineup
     for, and the two existing defaults are both guesses that happen to predate anyone
     noticing. Returning nothing lets the caller say so. */
  if (isHockey) return {}
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
/**
 * `sport` is required rather than defaulted because every wrong answer this function has
 * given came from a flex list that meant one sport while the league was another, and a
 * default would put that mistake back one call site at a time.
 */
export function startableCounts(
  slots: Record<string, number>,
  leagueSize: number,
  sport: string,
): Record<string, number> {
  const perTeam: Record<string, number> = {}
  for (const [slot, rawCount] of Object.entries(slots ?? {})) {
    const count = Number(rawCount)
    if (!Number.isFinite(count) || count <= 0) continue
    if (!flexEligibility(slot, sport)) perTeam[slot] = (perTeam[slot] ?? 0) + count
  }

  /* Flex is allocated after the dedicated slots are known, so the weights exist to divide by.
     A position eligible for flex but with no dedicated slot of its own still deserves a
     share, so weights floor at a token amount rather than at zero. */
  for (const [slot, rawCount] of Object.entries(slots ?? {})) {
    const count = Number(rawCount)
    const eligible = flexEligibility(slot, sport)
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
