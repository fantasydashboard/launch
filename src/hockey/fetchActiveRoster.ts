import { normalizeName } from './normalizeName'

export interface ActiveRoster {
  fetchedAt: string
  /** NHL player ids on a club's current roster. */
  ids: Set<number>
  /** The same players by normalized name, for rows that carry no NHL id (ESPN-only goalies). */
  names: Set<string>
  /**
   * `surname|CLUB`, for when the two feeds spell a first name differently: ESPN's "Sam
   * Montembeault" is the NHL's "Samuel", and a name-only check called MTL's starter retired.
   */
  surnameTeam: Set<string>
}

/* ESPN and the NHL spell four clubs differently. */
const CLUB: Record<string, string> = { LA: 'LAK', NJ: 'NJD', SJ: 'SJS', TB: 'TBL' }
export const canonClub = (team: string | null | undefined) => {
  const t = String(team ?? '').trim().toUpperCase()
  return CLUB[t] ?? t
}
export const surnameTeamKey = (surname: string, team: string | null | undefined) =>
  `${normalizeName(surname)}|${canonClub(team)}`

/**
 * Every player on an NHL roster right now, or null.
 *
 * Soft by design, like the baseline: without it nobody is removed, which is the behaviour this
 * replaced. A partial list never arrives — the relay refuses a pull missing clubs — but a list
 * this short is refused here too, because every player on a missing club would read as retired.
 */
export async function fetchActiveRoster(url = '/api/nhl-stats?rosters=current'): Promise<ActiveRoster | null> {
  try {
    /* Fifteen seconds: a cold relay pull paces 32 clubs against the NHL's throttle, and the feed
       only needs this list at the end, after its own slower fetches. */
    const res = await fetch(url, typeof AbortSignal?.timeout === 'function' ? { signal: AbortSignal.timeout(15000) } : undefined)
    if (!res.ok) { console.warn(`[nhl rosters] ${url} -> ${res.status}`); return null }
    if (!/json/i.test(res.headers.get('content-type') ?? '')) return null
    const b = await res.json()
    const players = Array.isArray(b?.players) ? b.players : []
    if (players.length < 600 || Number(b?.teams) < 32) { console.warn(`[nhl rosters] only ${players.length} players; ignoring`); return null }
    const ids = new Set<number>()
    const names = new Set<string>()
    const surnameTeam = new Set<string>()
    for (const p of players) {
      if (Number.isFinite(p?.id)) ids.add(p.id)
      if (typeof p?.name === 'string' && p.name) names.add(normalizeName(p.name))
      const last = typeof p?.last === 'string' && p.last ? p.last : String(p?.name ?? '').split(' ').pop()
      if (last && p?.team) surnameTeam.add(surnameTeamKey(last, p.team))
    }
    return { fetchedAt: String(b.fetchedAt ?? ''), ids, names, surnameTeam }
  } catch (e) {
    console.warn('[nhl rosters] unavailable', e)
    return null
  }
}
