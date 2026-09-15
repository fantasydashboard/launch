/**
 * What a player actually did last week, as opposed to what he was projected to do.
 *
 * WHY THIS EXISTS. Every number in this product is a projection, which is the right currency
 * for a lineup decision and the wrong one for a waiver claim. A waiver claim is a bet that a
 * ROLE has changed, and the evidence for that is snap share: how much of his offence a player
 * was on the field for, which is a fact about last Sunday rather than a model's opinion about
 * next Sunday.
 *
 * It is also the signal that separates a waiver add from a one-week fluke. A receiver who
 * scored twenty on three targets had a good afternoon; one who played eighty percent of the
 * snaps has a job. The first does not repeat and the second usually does.
 *
 * Sleeper publishes this for free on the same stats endpoint the banked-points work already
 * uses, so this costs one request per week and no new dependency.
 */

/** One player's real usage in a completed week. */
export interface PlayerUsage {
  playerKey: string
  /** Share of his team's offensive snaps, 0..1. Absent when Sleeper has not filed it. */
  snapShare: number | null
  /** Targets plus carries — the volume that produces points. */
  touches: number
  /** What he actually scored, in half-PPR. */
  points: number
}

export type UsageByKey = Record<string, PlayerUsage>

const BASE = 'https://api.sleeper.app/stats/nfl'
const TIMEOUT_MS = 12000
/* A completed week does not change, so this can be cached hard — unlike game state, which
   moves on a scale of minutes. Keyed by season and week so a new week never reads the old. */
const TTL_MS = 12 * 60 * 60 * 1000

interface Cached { at: number; usage: UsageByKey }
const memo = new Map<string, Cached>()

/** Turn one Sleeper stats payload into usage, keyed by player id. */
export function usageFromStats(payload: unknown): UsageByKey {
  const rows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object'
      ? Object.values(payload as Record<string, unknown>)
      : []
  const out: UsageByKey = {}
  for (const raw of rows) {
    const r = raw as Record<string, any>
    const player = (r.player ?? {}) as Record<string, any>
    const key = String(r.player_id ?? player.player_id ?? '').trim()
    if (!key) continue
    const s = (r.stats ?? {}) as Record<string, any>
    const own = Number(s.off_snp)
    const team = Number(s.tm_off_snp)
    /*
     * Snap share is null, never zero, when Sleeper has not filed it. Zero would say "he did
     * not play", which is a claim about the player; absent says "we do not know", which is a
     * claim about the data. The difference decides whether he belongs on a waiver board.
     */
    const snapShare = Number.isFinite(own) && Number.isFinite(team) && team > 0
      ? Math.min(1, own / team)
      : null
    out[key] = {
      playerKey: key,
      snapShare,
      touches: (Number(s.rec_tgt) || 0) + (Number(s.rush_att) || 0),
      points: Number(s.pts_half_ppr) || 0,
    }
  }
  return out
}

/**
 * Usage for one completed week. Empty when unavailable.
 *
 * An empty map means every consumer falls back to projections, which is the behaviour that
 * existed before this file — never a board full of players credited with no snaps.
 */
export async function getWeeklyUsage(season: number | string, week: number): Promise<UsageByKey> {
  if (!season || !week || week < 1) return {}
  const cacheKey = `${season}:${week}`
  const hit = memo.get(cacheKey)
  if (hit && Date.now() - hit.at <= TTL_MS) return hit.usage

  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS)
  try {
    const url = `${BASE}/${season}/${week}?season_type=regular`
      + '&position[]=QB&position[]=RB&position[]=WR&position[]=TE'
    const res = await fetch(url, { signal: ctl.signal })
    if (!res.ok) return {}
    const usage = usageFromStats(await res.json())
    if (!Object.keys(usage).length) return {}
    memo.set(cacheKey, { at: Date.now(), usage })
    return usage
  } catch {
    return {}
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Every scoring line of the season so far, for the defence-allowed table.
 *
 * Distinct from `getWeeklyUsage`, which answers "what did he do last week" for one player.
 * This answers "what has every defence given up", so it needs who a player faced — carried on
 * the stats row as `opponent` — and it needs every week, not the latest one.
 */
export interface SeasonLine {
  playerKey: string
  team: string
  opponent: string
  position: string
  points: number
  week: number
}

export function linesFromStats(payload: unknown, week: number): SeasonLine[] {
  const rows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object'
      ? Object.values(payload as Record<string, unknown>)
      : []
  const out: SeasonLine[] = []
  for (const raw of rows) {
    const r = raw as Record<string, any>
    const player = (r.player ?? {}) as Record<string, any>
    const key = String(r.player_id ?? player.player_id ?? '').trim()
    const team = String(r.team ?? '').toUpperCase()
    const opponent = String(r.opponent ?? '').toUpperCase()
    const position = String(player.position ?? r.position ?? '').toUpperCase()
    if (!key || !team || !opponent || !position) continue
    out.push({
      playerKey: key, team, opponent, position,
      points: Number((r.stats ?? {}).pts_half_ppr) || 0,
      week,
    })
  }
  return out
}

const seasonMemo = new Map<string, { at: number; lines: SeasonLine[] }>()

/**
 * Every PLAYED week's lines, up to and including `throughWeek`. Empty when unavailable.
 *
 * Callers pass the current week, not the one before it. A league's `currentWeek` stays on a
 * week until the next one opens, so "current minus one" skipped the week that had just
 * finished — which on the Tuesday after week one meant no data at all, and every column that
 * depends on this rendered blank.
 *
 * A week nobody has played yet returns rows that are all zero, and those are dropped here
 * rather than allowed to drag a defensive average toward nothing.
 */
export async function getSeasonLines(season: number | string, throughWeek: number): Promise<SeasonLine[]> {
  if (!season || throughWeek < 1) return []
  const cacheKey = `${season}:1-${throughWeek}`
  const hit = seasonMemo.get(cacheKey)
  if (hit && Date.now() - hit.at <= TTL_MS) return hit.lines

  const lines: SeasonLine[] = []
  for (let w = 1; w <= throughWeek; w++) {
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS)
    try {
      const url = `${BASE}/${season}/${w}?season_type=regular`
        + '&position[]=QB&position[]=RB&position[]=WR&position[]=TE'
      const res = await fetch(url, { signal: ctl.signal })
      if (res.ok) {
        const week = linesFromStats(await res.json(), w)
        /* An unplayed week comes back as rows of zeroes. Counting it would tell every defence
           it allowed nothing, which is the most flattering possible lie about all 32 of them. */
        if (week.some((l) => l.points > 0)) lines.push(...week)
      }
    } catch {
      /* One unreadable week is a smaller sample, not a failure — the rest still counts. */
    } finally {
      clearTimeout(timer)
    }
  }
  if (!lines.length) return []
  seasonMemo.set(cacheKey, { at: Date.now(), lines })
  return lines
}
