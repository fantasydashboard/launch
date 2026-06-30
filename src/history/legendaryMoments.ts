/**
 * Pure builder: the league's record book ("legendary moments"). Returns only the
 * moments that are derivable from the available data — point-based records are
 * gated to points leagues; category-only moments to category leagues; and every
 * moment is skipped when its underlying data is missing/empty (zeros, no pairs).
 *
 * Always (both league types):
 *   longest win streak  max run of consecutive 'W' in `results` ordered by (season, week)
 *   longest lose streak same for 'L'
 *   best season ....... team-season with the highest winPct (min 1 game)
 *   worst season ...... lowest winPct (min 1 game)
 *
 * Points leagues only (scoring === 'points', needs `weeks.points` / `weeks.matchups`):
 *   biggest week ...... max single-team weekly `points`
 *   highest-scoring season  team-season with the max SUM of weekly points
 *   closest game ...... paired matchup with the smallest positive margin
 *   biggest blowout ... paired matchup with the largest margin
 *
 * Category leagues only (scoring === 'category', and only when category data is
 * actually present — some week has a points/category value > 0):
 *   biggest sweep ..... matchup week where the winner won the most categories
 *
 * Both (when available):
 *   most playoff trips  team with the most `madePlayoffs` seasons (skipped when
 *                       no team has any playoff data, e.g. Yahoo getStandings)
 *   fiercest rivalry .. the league pair that has met the most times (tiebreak
 *                       tightest split); needs `weeks.matchups`, all-time
 *
 * Deterministic + side-effect-free; unit-tested in __tests__/legendaryMoments.test.ts.
 */
import type { HistorySeason, HistoryResult } from './types'

export type Scoring = 'points' | 'category'

export type MomentKind =
  | 'topWeek'
  | 'winStreak'
  | 'loseStreak'
  | 'bestSeason'
  | 'worstSeason'
  | 'highScoringSeason'
  | 'closestGame'
  | 'biggestBlowout'
  | 'biggestSweep'
  | 'mostPlayoffTrips'
  | 'fiercestRivalry'

export interface Moment {
  kind: MomentKind
  label: string
  teamName: string
  teamLogo?: string
  /** The headline number/string (a score, a streak length, a record string). */
  value: number | string
  valueLabel?: string
  /** Opponent name/logo for game-based moments (closest / blowout / sweep). */
  vsName?: string
  vsLogo?: string
  /** Extra context line, e.g. the final score "142–138". */
  detail?: string
  season: number
  week?: number
}

export function buildLegendaryMoments(
  seasons: HistorySeason[],
  scoring: Scoring = 'points',
): Moment[] {
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
  const nameOf = (k: string) => nameByKey.get(k)?.name ?? k
  const logoOf = (k: string) => nameByKey.get(k)?.logo

  const moments: Moment[] = []

  // ── Biggest week (points leagues only) ─────────────────────────────────────
  if (scoring === 'points') {
    let topWeek: { key: string; pts: number; season: number; week: number } | null = null
    for (const s of seasons) {
      for (const w of s.weeks ?? []) {
        if (!w.points) continue
        for (const [key, raw] of Object.entries(w.points)) {
          const pts = Number(raw)
          if (!Number.isFinite(pts)) continue
          if (!topWeek || pts > topWeek.pts) {
            topWeek = { key, pts, season: s.season, week: w.week }
          }
        }
      }
    }
    if (topWeek) {
      moments.push({
        kind: 'topWeek',
        label: 'Biggest week',
        teamName: nameOf(topWeek.key),
        teamLogo: logoOf(topWeek.key),
        value: Math.round(topWeek.pts * 10) / 10,
        valueLabel: 'pts',
        season: topWeek.season,
        week: topWeek.week,
      })
    }
  }

  // ── Win / lose streaks (across ordered weeks) ──────────────────────────────
  // Walk each team's results in (season, week) order, tracking current and best run.
  interface Streak {
    bestW: number
    bestWSeason: number
    curW: number
    bestL: number
    bestLSeason: number
    curL: number
  }
  const streaks = new Map<string, Streak>()
  // Flatten all (season, week) with results, ordered.
  const orderedWeeks: { season: number; week: number; results: Record<string, HistoryResult> }[] = []
  for (const s of seasons) {
    for (const w of s.weeks ?? []) {
      orderedWeeks.push({ season: s.season, week: w.week, results: w.results })
    }
  }
  orderedWeeks.sort((a, b) => (a.season !== b.season ? a.season - b.season : a.week - b.week))

  const ensure = (k: string): Streak => {
    let st = streaks.get(k)
    if (!st) {
      st = { bestW: 0, bestWSeason: 0, curW: 0, bestL: 0, bestLSeason: 0, curL: 0 }
      streaks.set(k, st)
    }
    return st
  }

  for (const ow of orderedWeeks) {
    for (const [key, res] of Object.entries(ow.results)) {
      const st = ensure(key)
      if (res === 'W') {
        st.curW += 1
        st.curL = 0
        if (st.curW > st.bestW) {
          st.bestW = st.curW
          st.bestWSeason = ow.season
        }
      } else if (res === 'L') {
        st.curL += 1
        st.curW = 0
        if (st.curL > st.bestL) {
          st.bestL = st.curL
          st.bestLSeason = ow.season
        }
      } else {
        // Tie breaks both streaks.
        st.curW = 0
        st.curL = 0
      }
    }
  }

  let bestWin: { key: string; len: number; season: number } | null = null
  let bestLose: { key: string; len: number; season: number } | null = null
  for (const [key, st] of streaks) {
    if (st.bestW >= 2 && (!bestWin || st.bestW > bestWin.len)) {
      bestWin = { key, len: st.bestW, season: st.bestWSeason }
    }
    if (st.bestL >= 2 && (!bestLose || st.bestL > bestLose.len)) {
      bestLose = { key, len: st.bestL, season: st.bestLSeason }
    }
  }
  if (bestWin) {
    moments.push({
      kind: 'winStreak',
      label: 'Longest win streak',
      teamName: nameOf(bestWin.key),
      teamLogo: logoOf(bestWin.key),
      value: bestWin.len,
      valueLabel: 'in a row',
      season: bestWin.season,
    })
  }
  if (bestLose) {
    moments.push({
      kind: 'loseStreak',
      label: 'Longest losing streak',
      teamName: nameOf(bestLose.key),
      teamLogo: logoOf(bestLose.key),
      value: bestLose.len,
      valueLabel: 'in a row',
      season: bestLose.season,
    })
  }

  // ── Best / worst season (by winPct, min 1 game) ────────────────────────────
  let best: { key: string; pct: number; rec: string; season: number } | null = null
  let worst: { key: string; pct: number; rec: string; season: number } | null = null
  for (const s of seasons) {
    for (const t of s.teams) {
      const games = t.wins + t.losses + t.ties
      if (games < 1) continue
      const pct = (t.wins + 0.5 * t.ties) / games
      const rec = `${t.wins}-${t.losses}${t.ties ? '-' + t.ties : ''}`
      if (!best || pct > best.pct) best = { key: t.teamKey, pct, rec, season: s.season }
      if (!worst || pct < worst.pct) worst = { key: t.teamKey, pct, rec, season: s.season }
    }
  }
  if (best) {
    moments.push({
      kind: 'bestSeason',
      label: 'Best season',
      teamName: nameOf(best.key),
      teamLogo: logoOf(best.key),
      value: best.rec,
      season: best.season,
    })
  }
  if (worst) {
    moments.push({
      kind: 'worstSeason',
      label: 'Worst season',
      teamName: nameOf(worst.key),
      teamLogo: logoOf(worst.key),
      value: worst.rec,
      season: worst.season,
    })
  }

  // ── Highest-scoring season (points leagues only) ───────────────────────────
  if (scoring === 'points') {
    // Sum each team's weekly points, scoped per (teamKey, season).
    let topSeason: { key: string; total: number; season: number } | null = null
    for (const s of seasons) {
      const totals = new Map<string, number>()
      let sawPoints = false
      for (const w of s.weeks ?? []) {
        if (!w.points) continue
        for (const [key, raw] of Object.entries(w.points)) {
          const pts = Number(raw)
          if (!Number.isFinite(pts)) continue
          sawPoints = true
          totals.set(key, (totals.get(key) ?? 0) + pts)
        }
      }
      if (!sawPoints) continue
      for (const [key, total] of totals) {
        if (!topSeason || total > topSeason.total) {
          topSeason = { key, total, season: s.season }
        }
      }
    }
    if (topSeason) {
      moments.push({
        kind: 'highScoringSeason',
        label: 'Highest-scoring season',
        teamName: nameOf(topSeason.key),
        teamLogo: logoOf(topSeason.key),
        value: Math.round(topSeason.total * 10) / 10,
        valueLabel: 'pts',
        season: topSeason.season,
      })
    }
  }

  // ── Closest game / biggest blowout (points leagues only, paired data) ──────
  if (scoring === 'points') {
    interface Game {
      winKey: string
      loseKey: string
      winPts: number
      losePts: number
      margin: number
      season: number
      week: number
    }
    let closest: Game | null = null
    let blowout: Game | null = null
    for (const s of seasons) {
      for (const w of s.weeks ?? []) {
        if (!w.matchups || !w.points) continue
        for (const [a, b] of w.matchups) {
          const pa = w.points[a]
          const pb = w.points[b]
          if (pa == null || pb == null) continue
          if (!Number.isFinite(pa) || !Number.isFinite(pb)) continue
          const margin = Math.abs(pa - pb)
          if (margin <= 0) continue // skip ties — no positive margin
          const winKey = pa > pb ? a : b
          const loseKey = pa > pb ? b : a
          const winPts = Math.max(pa, pb)
          const losePts = Math.min(pa, pb)
          const game: Game = { winKey, loseKey, winPts, losePts, margin, season: s.season, week: w.week }
          if (!closest || margin < closest.margin) closest = game
          if (!blowout || margin > blowout.margin) blowout = game
        }
      }
    }
    const fmtScore = (g: { winPts: number; losePts: number }) =>
      `${Math.round(g.winPts * 10) / 10}–${Math.round(g.losePts * 10) / 10}`
    if (closest) {
      moments.push({
        kind: 'closestGame',
        label: 'Closest game',
        teamName: nameOf(closest.winKey),
        teamLogo: logoOf(closest.winKey),
        vsName: nameOf(closest.loseKey),
        vsLogo: logoOf(closest.loseKey),
        value: Math.round(closest.margin * 10) / 10,
        valueLabel: 'pt margin',
        detail: fmtScore(closest),
        season: closest.season,
        week: closest.week,
      })
    }
    if (blowout) {
      moments.push({
        kind: 'biggestBlowout',
        label: 'Biggest blowout',
        teamName: nameOf(blowout.winKey),
        teamLogo: logoOf(blowout.winKey),
        vsName: nameOf(blowout.loseKey),
        vsLogo: logoOf(blowout.loseKey),
        value: Math.round(blowout.margin * 10) / 10,
        valueLabel: 'pt margin',
        detail: fmtScore(blowout),
        season: blowout.season,
        week: blowout.week,
      })
    }
  }

  // ── Biggest sweep (category leagues only, real category data present) ───────
  if (scoring === 'category') {
    interface Sweep {
      winKey: string
      loseKey: string
      winCats: number
      loseCats: number
      season: number
      week: number
    }
    let sweep: Sweep | null = null
    for (const s of seasons) {
      for (const w of s.weeks ?? []) {
        if (!w.matchups || !w.points) continue
        for (const [a, b] of w.matchups) {
          const ca = w.points[a]
          const cb = w.points[b]
          if (ca == null || cb == null) continue
          if (!Number.isFinite(ca) || !Number.isFinite(cb)) continue
          // ESPN cats carry all-zero "points"; require a real category margin.
          if (ca <= 0 && cb <= 0) continue
          if (ca === cb) continue
          const winKey = ca > cb ? a : b
          const loseKey = ca > cb ? b : a
          const winCats = Math.max(ca, cb)
          const loseCats = Math.min(ca, cb)
          // Most categories won by the winner (tiebreak: largest margin).
          if (
            !sweep ||
            winCats > sweep.winCats ||
            (winCats === sweep.winCats && winCats - loseCats > sweep.winCats - sweep.loseCats)
          ) {
            sweep = { winKey, loseKey, winCats, loseCats, season: s.season, week: w.week }
          }
        }
      }
    }
    if (sweep) {
      moments.push({
        kind: 'biggestSweep',
        label: 'Biggest sweep',
        teamName: nameOf(sweep.winKey),
        teamLogo: logoOf(sweep.winKey),
        vsName: nameOf(sweep.loseKey),
        vsLogo: logoOf(sweep.loseKey),
        value: sweep.winCats,
        valueLabel: 'cats',
        detail: `${sweep.winCats}–${sweep.loseCats}`,
        season: sweep.season,
        week: sweep.week,
      })
    }
  }

  // ── Most playoff trips (both, only when playoff data exists) ───────────────
  {
    const trips = new Map<string, number>()
    let sawPlayoffs = false
    for (const s of seasons) {
      for (const t of s.teams) {
        if (t.madePlayoffs) {
          sawPlayoffs = true
          trips.set(t.teamKey, (trips.get(t.teamKey) ?? 0) + 1)
        }
      }
    }
    if (sawPlayoffs) {
      let top: { key: string; count: number } | null = null
      for (const [key, count] of trips) {
        if (!top || count > top.count || (count === top.count && key < top.key)) {
          top = { key, count }
        }
      }
      if (top && top.count > 0) {
        moments.push({
          kind: 'mostPlayoffTrips',
          label: 'Most playoff trips',
          teamName: nameOf(top.key),
          teamLogo: logoOf(top.key),
          value: top.count,
          valueLabel: 'playoffs',
          season: 0, // all-time count — no single season; the view hides a 0 season
        })
      }
    }
  }

  // ── Fiercest rivalry (both, needs matchup pairings) ────────────────────────
  // The league pair that has met the most times (tiebreak: tightest all-time split).
  {
    interface PairAcc {
      aKey: string
      bKey: string
      aWins: number
      bWins: number
      ties: number
    }
    const pairs = new Map<string, PairAcc>()
    for (const s of seasons) {
      for (const w of s.weeks ?? []) {
        if (!w.matchups || !w.matchups.length) continue
        for (const [x, y] of w.matchups) {
          const aKey = x < y ? x : y
          const bKey = x < y ? y : x
          const pk = aKey + '|' + bKey
          let acc = pairs.get(pk)
          if (!acc) {
            acc = { aKey, bKey, aWins: 0, bWins: 0, ties: 0 }
            pairs.set(pk, acc)
          }
          const ra = w.results[aKey]
          const rb = w.results[bKey]
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
    let best: PairAcc | null = null
    let bestGames = -1
    let bestSplit = Infinity
    for (const acc of pairs.values()) {
      const games = acc.aWins + acc.bWins + acc.ties
      if (games === 0) continue
      const split = Math.abs(acc.aWins - acc.bWins)
      if (games > bestGames || (games === bestGames && split < bestSplit)) {
        best = acc
        bestGames = games
        bestSplit = split
      }
    }
    if (best) {
      const ties = best.ties
      moments.push({
        kind: 'fiercestRivalry',
        label: 'Fiercest rivalry',
        teamName: nameOf(best.aKey),
        teamLogo: logoOf(best.aKey),
        vsName: nameOf(best.bKey),
        vsLogo: logoOf(best.bKey),
        value: bestGames,
        valueLabel: 'meetings',
        detail: `${best.aWins}–${best.bWins}${ties ? '-' + ties : ''}`,
        season: 0, // all-time — no single season
      })
    }
  }

  return moments
}
