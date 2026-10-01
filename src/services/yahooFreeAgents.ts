/**
 * Yahoo's free-agent pool, as deep as the caller asked for.
 *
 * WHY THIS EXISTS. `getTopFreeAgents` fetched one request with `count=200`:
 *
 *     /league/${leagueKey}/players;status=FA;sort=OR;count=200
 *
 * Yahoo's players collection returns AT MOST 25 players per request. It does not error on a
 * larger `count`, it does not warn, and it does not say the list was truncated — it sends 25
 * and a `count: 25` beside them. So every Yahoo league in this product has had a 25-deep free
 * agent pool since the function was written, and the only way to notice was to count.
 *
 * WHAT MADE IT VISIBLE. A hockey Today board on a 3-game night. Twenty-five free agents spread
 * across seventeen clubs, six clubs playing, so ONE candidate cleared "has a game tonight" —
 * and he happened not to price, leaving a board with no free agents on it at all. The user read
 * that as the Yahoo pricing path being broken, which it is not: twenty of the twenty-five
 * priced correctly. The pool was simply too shallow to contain anyone playing.
 *
 * The same shallowness on a fifteen-game baseball day leaves twenty-three usable names and
 * looks entirely healthy. That is why it survived: the bug's severity is a function of how
 * many clubs play, so it hid in every sport but the one with short slates.
 *
 * PAGING, NOT A BIGGER COUNT. There is no parameter that lifts the cap; `start` is the only
 * way through the collection. The loop stops on a short page, because that is the collection's
 * own way of saying it has run out — asking again returns the same empty answer forever.
 */

/** Yahoo's hard per-request ceiling on the players collection. Not a preference. */
export const YAHOO_PLAYERS_PAGE = 25

/**
 * A stop, so a lying upstream cannot spin here.
 *
 * The short-page break is the real terminator. This exists for the case where every page comes
 * back full — a collection that never ends, or one whose `start` is being ignored — which
 * would otherwise be an unbounded request loop against a rate-limited API.
 */
const MAX_PAGES = 20

/**
 * A Yahoo player's eligible slots, dropping bench/IL/utility pseudo-slots.
 *
 * Lives here rather than in yahoo.ts so the import runs one direction only: yahoo.ts reads
 * this module, never the reverse.
 */
export function parseEligiblePositions(raw: any): string[] {
  if (!raw) return []
  const entries = Array.isArray(raw) ? raw : typeof raw === 'object' ? Object.values(raw) : []
  const skip = new Set(['BN', 'IL', 'IL+', 'NA', 'DL', 'UTIL', 'Util'])
  return entries
    .map((e: any) => (typeof e === 'string' ? e : e?.position))
    .filter((p: any): p is string => typeof p === 'string' && p.length > 0 && !skip.has(p))
}

/**
 * One page of the players collection, flattened.
 *
 * The collection arrives as an object keyed by index with a numeric `count` sitting among the
 * entries, which is why this walks values and skips anything without a `.player`.
 */
export function parseFreeAgentPage(data: any): any[] {
  const playersData = data?.fantasy_content?.league?.[1]?.players
  if (!playersData || typeof playersData !== 'object') return []

  const out: any[] = []
  for (const wrapper of Object.values(playersData) as any[]) {
    if (typeof wrapper !== 'object' || !wrapper?.player) continue
    const info = wrapper.player[0]
    if (!Array.isArray(info)) continue

    let playerKey = ''
    let playerId = ''
    let name = ''
    let team = ''
    let position = ''
    let headshot = ''
    let percentOwned = 0
    let percentDelta = 0
    let status = ''
    let injuryNote = ''
    let eligiblePositions: string[] = []

    for (const item of info) {
      if (item?.player_key) playerKey = item.player_key
      if (item?.player_id) playerId = item.player_id
      if (item?.name) name = item.name.full || `${item.name.first} ${item.name.last}`
      if (item?.editorial_team_abbr) team = item.editorial_team_abbr
      if (item?.display_position) position = item.display_position
      if (item?.eligible_positions) eligiblePositions = parseEligiblePositions(item.eligible_positions)
      if (item?.headshot) headshot = item.headshot.url || ''
      if (item?.percent_owned) {
        percentOwned = parseFloat(item.percent_owned.value || '0')
        percentDelta = parseFloat(item.percent_owned.delta || '0')
      }
      /*
       * THE ABBREVIATION, NOT THE SENTENCE. Yahoo sends both: `status` is "IR" / "NA" / "DTD",
       * `status_full` is "Injured Reserve" / "Not Active". This used to prefer the long form,
       * and availability() matches designations as whole tokens — so "INJURED RESERVE" matched
       * nothing, fell through to its unrecognised-means-doubtful branch, and a man on injured
       * reserve was priced as questionable and ranked among tonight's best free-agent adds.
       * The long form is kept only when there is no abbreviation to use.
       */
      if (item?.status) status = item.status
      /* `status` and `status_full` arrive as SEPARATE entries in this array, so an else-branch
         here guards nothing — it only skips the long form within its own item, and the long
         form then overwrote the abbreviation set by an earlier one. Guard on what we HAVE. */
      else if (item?.status_full && !status) status = item.status_full
      if (item?.injury_note) injuryNote = item.injury_note
    }

    if (!playerKey) continue
    out.push({
      player_key: playerKey,
      player_id: playerId,
      full_name: name,
      position,
      eligible_positions: eligiblePositions,
      /* The sport-agnostic team slot, despite the name — every normalizer already reads it. */
      mlb_team: team,
      headshot,
      percent_owned: percentOwned,
      percent_change: percentDelta,
      fantasy_team: null,
      fantasy_team_key: null,
      manager_name: null,
      status,
      injury_note: injuryNote,
    })
  }
  return out
}

/**
 * Walk the collection until `count` players are in hand.
 *
 * `fetchPage` takes the `start` offset so the caller owns the URL and the auth; this function
 * owns only the paging rule. A page that throws ENDS the walk and keeps what came before it:
 * the collection is sorted by ownership, so the first pages are the names that matter, and a
 * partial board beats the empty one a rethrown 429 would produce.
 */
export async function collectFreeAgents(
  fetchPage: (start: number) => Promise<any>,
  count: number,
): Promise<any[]> {
  const out: any[] = []
  const seen = new Set<string>()

  for (let p = 0; p < MAX_PAGES && out.length < count; p++) {
    let page: any[]
    try {
      page = parseFreeAgentPage(await fetchPage(p * YAHOO_PLAYERS_PAGE))
    } catch (e) {
      console.warn(`[yahoo] free agents: page ${p} failed, keeping ${out.length}`, e)
      break
    }

    for (const player of page) {
      /* A live sorted collection shifts under a walk — a player added between two requests
         pushes the boundary and repeats a name. Two rows for one man reads as two adds. */
      if (seen.has(player.player_key)) continue
      seen.add(player.player_key)
      out.push(player)
    }

    /* The collection's own end-of-list signal. */
    if (page.length < YAHOO_PLAYERS_PAGE) break
  }

  return out.slice(0, count)
}
