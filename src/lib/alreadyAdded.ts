/**
 * Whether a league in the picker is one the user already has.
 *
 * WHY IT MATTERS NOW. Adding used to be automatic — every league on a Yahoo account was
 * imported, so a picker never needed to say which were already in. Now that adding is an
 * explicit act, the list is long, mostly historical, and gives no sign of what is already on
 * the dashboard. A person pruning ten years of leagues has to remember, which is the one thing
 * a list like this exists to save them from.
 *
 * MATCHED THE WAY THEY ARE SAVED, which for Yahoo is BY NAME. saveYahooLeague looks for an
 * existing row with the same platform and league_name and rolls it forward to the newer season
 * — because a league keeps its name across years and gets a fresh key each one. So a check
 * keyed on the id would call last season's "Wood Roasters" unadded, offer to add it, and then
 * silently update the row the user already had. Everything else is keyed by id.
 */
export interface SavedLike {
  platform?: string | null
  league_id?: string | null
  league_name?: string | null
}

export function isAlreadyAdded(
  candidate: { league_key?: string | null; league_id?: string | null; name?: string | null },
  saved: SavedLike[],
  platform: string,
): boolean {
  if (platform === 'yahoo') {
    const name = String(candidate.name ?? '').trim()
    if (!name) return false
    return saved.some((s) => s.platform === 'yahoo' && String(s.league_name ?? '').trim() === name)
  }
  const id = String(candidate.league_id ?? candidate.league_key ?? '').trim()
  if (!id) return false
  return saved.some((s) => String(s.league_id ?? '') === id)
}
