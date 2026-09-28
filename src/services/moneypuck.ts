import type { ExpectedGoals } from '@/hockey/expectedGoals'

/**
 * MoneyPuck's season summaries, read through `/api/moneypuck`.
 *
 * Relayed, not fetched directly: it is a CSV served with no access-control header, so a browser
 * cannot read it. The relay also drops the ~116 columns and four game situations this does not
 * use, which is the difference between 3.5MB and a few tens of kilobytes on a phone.
 *
 * JOINED ON NHL playerId. MoneyPuck keys on the same ids the NHL's own feeds use — 8478402 is
 * Connor McDavid in both — so there is no name matching here and no fuzzy join to go wrong on
 * an accent or a Jr. That is the single reason this source is worth having over the others
 * considered: every other public projection set would have had to be matched by name.
 */

const RELAY = '/api/moneypuck'

/** Per session. A completed season does not change; the current one changes nightly at most. */
const cache = new Map<number, Map<number, ExpectedGoals>>()

/** For tests and the measurement scripts, which must not inherit a previous run's answer. */
export function clearMoneyPuckCache(): void {
  cache.clear()
}

/**
 * Expected goals for one season, by playerId.
 *
 * `season` is the start year, as MoneyPuck spells it: 2025 is 2025-26.
 *
 * SOFT FAILURE, DELIBERATELY. An empty map makes blendExpectedGoals the identity, so a
 * MoneyPuck outage costs the accuracy the blend buys and never costs a board. The warning is
 * what makes that visible — a silent empty map here is exactly how three separate experiments
 * this month reported confident no-ops, so anything measuring against this must check the size
 * rather than trust it.
 */
export async function fetchExpectedGoals(season: number): Promise<Map<number, ExpectedGoals>> {
  const hit = cache.get(season)
  if (hit) return hit

  const out = new Map<number, ExpectedGoals>()
  try {
    const res = await fetch(`${RELAY}?season=${season}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    /* Content type checked because a dev server that does not know this route answers 200 with
       the handler's own source as text/javascript, and res.json() then throws somewhere far
       less obvious than here. That has happened. */
    const type = res.headers.get('content-type') ?? ''
    if (!type.includes('application/json')) throw new Error(`expected JSON, got ${type}`)
    const payload = await res.json()
    for (const p of payload?.players ?? []) {
      if (typeof p?.playerId !== 'number') continue
      out.set(p.playerId, { xGoals: Number(p.xGoals) || 0, gamesPlayed: Number(p.gamesPlayed) || 0 })
    }
  } catch (err) {
    console.warn(`[moneypuck] ${season} expected goals unavailable, blend skipped`, err)
    return out
  }

  cache.set(season, out)
  return out
}
