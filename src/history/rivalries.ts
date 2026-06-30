/**
 * Pure builder: head-to-head rivalries across all visible seasons.
 *
 * IMPORTANT: `HistoryWeek.results` is per-team (teamKey → 'W'|'L'|'T') and CANNOT
 * reconstruct who-played-whom. Rivalries therefore require the optional
 * `HistoryWeek.matchups: [teamKeyA, teamKeyB][]` pairings (populated by
 * useLeagueHistory from each platform's matchup data — ESPN home/away, Yahoo two
 * teams, Sleeper rosters paired by matchup_id). When no week carries `matchups`,
 * this returns `{ mine: [], fiercest: null }` and the section hides. The outcome
 * for each pair is read from that week's `results`.
 *
 * `mine` = the user's record vs every opponent (sorted by games desc).
 * `fiercest` = the league pair with the most games (tiebreak smallest |W−L|).
 *
 * Deterministic + side-effect-free; unit-tested in __tests__/rivalries.test.ts.
 */
import type { HistorySeason, HistoryResult } from './types'

export interface RivalryRow {
  oppKey: string
  oppName: string
  oppLogo?: string
  wins: number
  losses: number
  ties: number
  games: number
  edge: 'up' | 'down' | 'even'
}

export interface Fiercest {
  aKey: string
  aName: string
  aLogo?: string
  bKey: string
  bName: string
  bLogo?: string
  games: number
  /** A's record vs B. */
  aWins: number
  bWins: number
  ties: number
}

export interface RivalriesResult {
  mine: RivalryRow[]
  fiercest: Fiercest | null
}

// Ordered, stable key for an unordered pair.
function pairKey(a: string, b: string): string {
  return a < b ? a + '|' + b : b + '|' + a
}

export function buildRivalries(
  seasons: HistorySeason[],
  myTeamKey: string,
): RivalriesResult {
  // Latest name/logo per teamKey (newest-first).
  const nameByKey = new Map<string, { name: string; logo?: string; season: number }>()
  for (const s of seasons) {
    for (const t of s.teams) {
      const prev = nameByKey.get(t.teamKey)
      if (!prev || s.season >= prev.season) {
        nameByKey.set(t.teamKey, {
          name: t.teamName,
          logo: t.teamLogo ?? prev?.logo,
          season: s.season,
        })
      }
    }
  }

  // Per unordered pair: from the first key's perspective (the lexicographically
  // smaller key is "a"), tally a-wins / b-wins / ties.
  interface PairAcc {
    aKey: string
    bKey: string
    aWins: number
    bWins: number
    ties: number
  }
  const pairs = new Map<string, PairAcc>()
  let sawMatchups = false

  for (const s of seasons) {
    for (const w of s.weeks ?? []) {
      if (!w.matchups || !w.matchups.length) continue
      sawMatchups = true
      for (const [x, y] of w.matchups) {
        const aKey = x < y ? x : y
        const bKey = x < y ? y : x
        const pk = pairKey(x, y)
        let acc = pairs.get(pk)
        if (!acc) {
          acc = { aKey, bKey, aWins: 0, bWins: 0, ties: 0 }
          pairs.set(pk, acc)
        }
        const ra: HistoryResult | undefined = w.results[aKey]
        const rb: HistoryResult | undefined = w.results[bKey]
        // Prefer A's result; fall back to inverting B's. Skip if neither present.
        let aOutcome: HistoryResult | undefined = ra
        if (aOutcome == null && rb != null) {
          aOutcome = rb === 'W' ? 'L' : rb === 'L' ? 'W' : 'T'
        }
        if (aOutcome == null) continue
        if (aOutcome === 'T') acc.ties += 1
        else if (aOutcome === 'W') acc.aWins += 1
        else acc.bWins += 1
      }
    }
  }

  if (!sawMatchups) return { mine: [], fiercest: null }

  // Mine: the user's record vs each opponent.
  const mine: RivalryRow[] = []
  if (myTeamKey) {
    for (const acc of pairs.values()) {
      if (acc.aKey !== myTeamKey && acc.bKey !== myTeamKey) continue
      const meIsA = acc.aKey === myTeamKey
      const oppKey = meIsA ? acc.bKey : acc.aKey
      const wins = meIsA ? acc.aWins : acc.bWins
      const losses = meIsA ? acc.bWins : acc.aWins
      const ties = acc.ties
      const games = wins + losses + ties
      if (games === 0) continue
      const info = nameByKey.get(oppKey)
      mine.push({
        oppKey,
        oppName: info?.name ?? oppKey,
        oppLogo: info?.logo,
        wins,
        losses,
        ties,
        games,
        edge: wins > losses ? 'up' : wins < losses ? 'down' : 'even',
      })
    }
    mine.sort((a, b) =>
      b.games !== a.games
        ? b.games - a.games
        : a.oppKey < b.oppKey
          ? -1
          : a.oppKey > b.oppKey
            ? 1
            : 0,
    )
  }

  // Fiercest: most games, tiebreak smallest |aWins - bWins|.
  let fiercest: Fiercest | null = null
  let bestGames = -1
  let bestSplit = Infinity
  for (const acc of pairs.values()) {
    const games = acc.aWins + acc.bWins + acc.ties
    if (games === 0) continue
    const split = Math.abs(acc.aWins - acc.bWins)
    if (games > bestGames || (games === bestGames && split < bestSplit)) {
      bestGames = games
      bestSplit = split
      const aInfo = nameByKey.get(acc.aKey)
      const bInfo = nameByKey.get(acc.bKey)
      fiercest = {
        aKey: acc.aKey,
        aName: aInfo?.name ?? acc.aKey,
        aLogo: aInfo?.logo,
        bKey: acc.bKey,
        bName: bInfo?.name ?? acc.bKey,
        bLogo: bInfo?.logo,
        games,
        aWins: acc.aWins,
        bWins: acc.bWins,
        ties: acc.ties,
      }
    }
  }

  return { mine, fiercest }
}
