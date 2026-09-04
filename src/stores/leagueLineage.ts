/**
 * Which saved leagues the switcher should offer.
 *
 * Sleeper mints a NEW league_id every season and chains it back through previous_league_id,
 * so a league you have been in for three years is three saved rows with three different ids.
 * Every dedup in the store keys on league_id, so all three are legitimately distinct and all
 * three survive — and the switcher renders name, format and team count with no season, so
 * they came out as "League of Record" three times over. Not a duplicate-insert bug: three
 * real rows that look identical.
 *
 * Collapsing on previous_league_id would be the exact fix, but saveLeague never persisted it,
 * so no existing row carries the chain (it does now, for later). Season IS persisted, so the
 * rule works on what is actually stored: same platform, same sport, same name, DIFFERENT
 * seasons is one league across years — keep the newest.
 *
 * Rows sharing a name AND a season are two different leagues that happen to be named alike,
 * which really occurs in this data, so both are kept. Collapsing those would hide a league
 * the user is actually in, which is worse than the duplicates this fixes.
 *
 * Nothing is deleted; History still reads every season. This only decides what you can switch
 * TO, and last season's copy is never what anyone meant.
 */
export interface Row { league_id: string; league_name?: string; platform: string; sport?: string; season?: string }

export function collapseSeasons<T extends Row>(saved: T[]): T[] {
  const groups = new Map<string, T[]>()
  for (const l of saved) {
    const key = `${l.platform}|${l.sport ?? ''}|${String(l.league_name ?? '').trim().toLowerCase()}`
    const g = groups.get(key)
    if (g) g.push(l); else groups.set(key, [l])
  }
  const out: T[] = []
  for (const g of groups.values()) {
    const seasons = new Set(g.map((l) => String(l.season ?? '')))
    if (seasons.size <= 1) { out.push(...g); continue }
    const newest = g.reduce((a, b) => (Number(b.season) > Number(a.season) ? b : a))
    out.push(...g.filter((l) => String(l.season) === String(newest.season)))
  }
  const keep = new Set(out.map((l) => l.league_id))
  return saved.filter((l) => keep.has(l.league_id))
}
