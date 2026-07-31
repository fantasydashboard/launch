export type OpportunityTag = 'starter' | 'backup-elevated' | 'committee' | 'deep-bench' | ''

export interface OppPlayer {
  playerKey: string
  proTeam: string
  position: string
  depthChartOrder?: number | null
  injuryStatus?: string | null
}

/** Sleeper injury statuses that mean the player will not play. */
const OUT_STATUSES = new Set(['OUT', 'IR', 'PUP', 'SUSP', 'NA', 'DNR', 'DOUBTFUL'])
const isOut = (s?: string | null): boolean => OUT_STATUSES.has(String(s ?? '').toUpperCase())
const normPos = (pos: string): string => (pos || '').toUpperCase().split(/[,/|]/)[0].trim()

/**
 * Surface an opportunity tag per player from depth-chart order + team injuries.
 * The signal that matters for waivers: a healthy backup (order ≥ 2) whose same
 * team+position starter (order 1) is out → `backup-elevated`. Pure.
 */
export function tagOpportunity(players: OppPlayer[]): Record<string, OpportunityTag> {
  // Is the order-1 body at each team+position currently out?
  const starterOut = new Map<string, boolean>()
  for (const p of players) {
    if ((p.depthChartOrder ?? 0) === 1) {
      starterOut.set(`${p.proTeam}|${normPos(p.position)}`, isOut(p.injuryStatus))
    }
  }
  const out: Record<string, OpportunityTag> = {}
  for (const p of players) {
    const order = p.depthChartOrder ?? null
    if (order == null) { out[p.playerKey] = ''; continue }
    if (order === 1) { out[p.playerKey] = 'starter'; continue }
    const key = `${p.proTeam}|${normPos(p.position)}`
    out[p.playerKey] = starterOut.get(key) ? 'backup-elevated' : 'deep-bench'
  }
  return out
}
