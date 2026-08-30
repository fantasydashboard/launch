/**
 * All-play record: every week, score each team against EVERY other team, not just the
 * one the schedule happened to give it.
 *
 * Why this and not points-for: points-for answers "how much did they score", which is
 * only half the question — a big week is worth nothing if the whole league went big.
 * All-play asks "how many teams would you have beaten", which is the same question the
 * standings ask, with the schedule luck removed. A 3-6 team that is 30-24 in all-play is
 * not a bad team having a bad year; it is a good team that keeps drawing the league's
 * high scorer. That gap is the read.
 *
 * Deliberately built only from decided weeks that actually carry scores. A week that is
 * mid-flight, or a category league with no points at all, contributes nothing rather than
 * contributing a zero — a zero would silently score every team as having lost to the
 * entire league that week, which is the kind of confidently-wrong number this page keeps
 * having to be rescued from.
 *
 * Pure + deterministic.
 */
import type { WeekOutcomes } from './powerTrajectory'

export interface AllPlayRow {
  teamKey: string
  wins: number
  losses: number
  ties: number
  /** wins / games, ties counting half. 0..1. NaN is never returned — no games means 0. */
  pct: number
  /** 1 = best all-play record in the league */
  rank: number
  /** weeks that actually contributed a comparison */
  weeksCounted: number
}

export interface AllPlayResult {
  rows: AllPlayRow[]
  byTeam: Map<string, AllPlayRow>
  /** how many weeks carried usable scores — the caller gates its copy on this */
  weeksCounted: number
}

const EMPTY: AllPlayResult = { rows: [], byTeam: new Map(), weeksCounted: 0 }

export function buildAllPlay(outcomes: WeekOutcomes[], teamKeys: string[]): AllPlayResult {
  if (!Array.isArray(outcomes) || !Array.isArray(teamKeys) || teamKeys.length < 2) return EMPTY

  const keys = teamKeys.filter((k) => typeof k === 'string' && k)
  if (keys.length < 2) return EMPTY

  const w = new Map<string, number>(keys.map((k) => [k, 0]))
  const l = new Map<string, number>(keys.map((k) => [k, 0]))
  const t = new Map<string, number>(keys.map((k) => [k, 0]))
  let weeksCounted = 0

  for (const wk of outcomes) {
    const pts = wk?.points
    if (!pts) continue

    /* Only teams with a real number this week take part. A team on a bye in a league that
       runs them, or one whose score has not posted, must not be treated as having scored
       zero — that would hand a loss to nobody and a win to everyone else. */
    const present = keys.filter((k) => Number.isFinite(pts[k] as number))
    if (present.length < 2) continue

    weeksCounted++
    for (const a of present) {
      const pa = pts[a] as number
      for (const b of present) {
        if (a === b) continue
        const pb = pts[b] as number
        if (pa > pb) w.set(a, w.get(a)! + 1)
        else if (pa < pb) l.set(a, l.get(a)! + 1)
        else t.set(a, t.get(a)! + 1)
      }
    }
  }

  const rows: AllPlayRow[] = keys.map((k) => {
    const wins = w.get(k)!, losses = l.get(k)!, ties = t.get(k)!
    const games = wins + losses + ties
    return {
      teamKey: k,
      wins,
      losses,
      ties,
      pct: games > 0 ? (wins + 0.5 * ties) / games : 0,
      rank: 0,
      weeksCounted,
    }
  })

  /* Competition ranking: tied teams share the better rank, and the next rank skips.
     Presenting a tie as though it were separated is the 0-0 bug in miniature. */
  const sorted = [...rows].sort((a, b) => b.pct - a.pct || b.wins - a.wins)
  let rank = 0, seen = 0, prev = Number.NaN
  for (const r of sorted) {
    seen++
    if (r.pct !== prev) { rank = seen; prev = r.pct }
    r.rank = rank
  }

  return { rows: sorted, byTeam: new Map(sorted.map((r) => [r.teamKey, r])), weeksCounted }
}

/** "26-10" — for display beside the real record. */
export function formatAllPlay(r: Pick<AllPlayRow, 'wins' | 'losses' | 'ties'>): string {
  return r.ties ? `${r.wins}-${r.losses}-${r.ties}` : `${r.wins}-${r.losses}`
}

export interface AllPlayForm {
  teamKey: string
  recentPct: number // all-play win rate over the window
  seasonPct: number // all-play win rate over everything counted
  delta: number // recent − season. + = playing above their season level
  windowWeeks: number
}

export interface AllPlayFormResult {
  byTeam: Map<string, AllPlayForm>
  windowWeeks: number
  seasonWeeks: number
  /** false when there is nothing honest to say yet — the caller renders no form read */
  readable: boolean
}

/**
 * Form: the same all-play question asked over the last few weeks, then compared with the
 * season.
 *
 * Measured this way on purpose. Raw points over a window is the noisy version — a team can
 * post its best three weeks of the year and still have been beaten by most of the league,
 * because scoring environments move together. And "actual vs projected" would need the
 * projections that were live in past weeks, which only exist where a snapshot happened to
 * be captured; a form read that silently vanishes for most leagues is worse than none.
 *
 * All-play needs nothing that isn't already loaded, and because the window and the season
 * are measured in the identical unit, the difference between them is a real number rather
 * than two scales being eyeballed against each other.
 */
export function buildAllPlayForm(
  outcomes: WeekOutcomes[],
  teamKeys: string[],
  lastN = 3,
): AllPlayFormResult {
  const season = buildAllPlay(outcomes, teamKeys)
  const scored = (Array.isArray(outcomes) ? outcomes : [])
    .filter((w) => w?.points && teamKeys.some((k) => Number.isFinite(w.points![k] as number)))
    .sort((a, b) => a.week - b.week)
  const window = buildAllPlay(scored.slice(-lastN), teamKeys)

  /* The window has to be a SUBSET of the season, or "recent vs season" compares a thing
     with itself and every delta is exactly zero — a column of 0.0 that looks like a
     finding. One week of separation is the minimum that can say anything. */
  const readable = window.weeksCounted >= lastN && season.weeksCounted > window.weeksCounted

  const byTeam = new Map<string, AllPlayForm>()
  for (const k of teamKeys) {
    const r = window.byTeam.get(k)
    const s = season.byTeam.get(k)
    byTeam.set(k, {
      teamKey: k,
      recentPct: r?.pct ?? 0,
      seasonPct: s?.pct ?? 0,
      delta: (r?.pct ?? 0) - (s?.pct ?? 0),
      windowWeeks: window.weeksCounted,
    })
  }
  return { byTeam, windowWeeks: window.weeksCounted, seasonWeeks: season.weeksCounted, readable }
}
