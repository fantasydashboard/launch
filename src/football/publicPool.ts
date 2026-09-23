import type { PointsPoolPlayer } from '@/myteam/pointsTeam'

/**
 * What a public board ranks.
 *
 * Kickers and team defences are absent for the same reason they are absent from the overall
 * Wire board: every kicker projects within a point or two of every other, so the position
 * lands at replacement level and sorts into the middle of a value-ranked list above real
 * players carrying negative value. A reader with no league has no kicker slot to fill either.
 */
export const PUBLIC_POSITIONS: readonly string[] = ['QB', 'RB', 'WR', 'TE']

const POSITIONS = new Set(PUBLIC_POSITIONS)

/**
 * Every rankable NFL player, from Sleeper's player map, owned by nobody.
 *
 * The league-backed boards build their pool from a roster and a free-agent list, both of which
 * describe one league. A public board has neither, so it starts from the league the players
 * actually play in. Ownership is the thing it cannot know and does not claim: `teamKey` is
 * empty for everyone, which reads downstream as "held by no team in this league" — true, since
 * there is no league.
 */
export function publicNflPool(players: Record<string, any>): PointsPoolPlayer[] {
  const out: PointsPoolPlayer[] = []
  for (const [pid, p] of Object.entries(players)) {
    if (!p || p.active === false) continue
    const position = String(p.position ?? p.fantasy_positions?.[0] ?? '').toUpperCase()
    if (!POSITIONS.has(position)) continue
    /* No NFL team means no schedule: no bye, no games remaining, and every rest-of-season
       number about him would be a guess wearing a projection's clothes. */
    const proTeam = String(p.team ?? '').toUpperCase()
    if (!proTeam) continue
    const name = p.full_name || `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim()
    if (!name) continue
    out.push({
      playerKey: pid,
      name,
      position,
      eligiblePositions: p.fantasy_positions?.length ? p.fantasy_positions : [position],
      teamKey: '',
      proTeam,
      headshot: `https://sleepercdn.com/content/nfl/players/thumb/${pid}.jpg`,
      status: p.injury_status ?? '',
    })
  }
  return out
}
