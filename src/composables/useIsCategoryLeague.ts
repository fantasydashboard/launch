/**
 * Canonical detection for Yahoo H2H category leagues.
 *
 * The league store treats `head`, `headone`, and `roto` as "category" leagues for
 * the purpose of fetching getCategoryMatchups (see stores/league.ts ~1098/1210).
 * However, MyTeamView's H2H-win-count math is only valid for *head-to-head*
 * category leagues. Roto leagues use different ranking semantics and are
 * intentionally OUT OF SCOPE here — this predicate must NOT return true for roto.
 *
 * Matches the broader set the app's wrappers used to inline:
 * a lowercased scoring_type that equals `head` / `headone` / `headcategory` /
 * `h2h_category`, or that contains `category`.
 */
export function isYahooCategoryLeague(scoringType: string | null | undefined): boolean {
  if (!scoringType) return false
  const st = scoringType.toLowerCase()
  if (st === 'roto') return false
  return (
    st === 'head' ||
    st === 'headone' ||
    st === 'headcategory' ||
    st === 'h2h_category' ||
    st.includes('category')
  )
}
