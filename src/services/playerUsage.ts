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
