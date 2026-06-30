/**
 * Pure builder: the league's record book ("legendary moments"). Returns only the
 * moments that are derivable from the available data — point-based records are
 * skipped for category leagues that carry no `points`.
 *
 *   biggest week ..... max single-team weekly `points` (points leagues only)
 *   longest win streak max run of consecutive 'W' in `results` ordered by (season, week)
 *   longest lose streak same for 'L'
 *   best season ...... team-season with the highest winPct (min 1 game)
 *   worst season ..... lowest winPct (min 1 game)
 *
 * Margin-based "biggest blowout" is intentionally omitted — it needs paired
 * matchups AND both scores; not built here.
 *
 * Deterministic + side-effect-free; unit-tested in __tests__/legendaryMoments.test.ts.
 */
import type { HistorySeason, HistoryResult } from './types'

export type MomentKind =
  | 'topWeek'
  | 'winStreak'
  | 'loseStreak'
  | 'bestSeason'
  | 'worstSeason'

export interface Moment {
  kind: MomentKind
  label: string
  teamName: string
  teamLogo?: string
  /** The headline number/string (a score, a streak length, a record string). */
  value: number | string
  valueLabel?: string
  season: number
  week?: number
}

export function buildLegendaryMoments(seasons: HistorySeason[]): Moment[] {
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

  return moments
}
