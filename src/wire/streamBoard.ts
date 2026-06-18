import { lookupStarts, type WeekSchedule } from '@/services/mlbSchedule'

export interface StreamWeakCat { statId: string; label: string; rank: number; side: 'hit' | 'pit'; isRatio: boolean }
export interface StreamFreeAgent { playerKey: string; name: string; position: string; team: string }
export interface StreamTarget {
  player: { key: string; name: string; team: string; position: string }
  cats: string[]        // weak cat labels this stream helps
  rationale: string
  twoStart?: boolean
  starts?: number
}
export interface StreamBoard {
  weakCats: { statId: string; label: string; rank: number }[]
  starters: StreamTarget[]
  relievers: StreamTarget[]
}

// Category labels a starter vs a reliever stream addresses (upper-cased compare).
const STARTER_CAT_LABELS = new Set(['K', 'SO', 'QS', 'W', 'ERA', 'WHIP', 'IP', 'K/9', 'K/BB'])
const RELIEVER_CAT_LABELS = new Set(['SV', 'HLD', 'SVHD', 'SV+H', 'SVH', 'S', 'HD'])
const MAX_PER_LIST = 5

const isSP = (pos: string) => /SP/.test(pos.toUpperCase()) || (/\bP\b/.test(pos.toUpperCase()) && !/RP/.test(pos.toUpperCase()))
const isRP = (pos: string) => /RP/.test(pos.toUpperCase())

export function buildStreamBoard(args: {
  freeAgents: StreamFreeAgent[]
  weakCats: StreamWeakCat[]
  schedule: WeekSchedule
}): StreamBoard {
  const pit = args.weakCats.filter((c) => c.side === 'pit')
  const starterCats = pit.filter((c) => STARTER_CAT_LABELS.has(c.label.toUpperCase().trim()))
  const relieverCats = pit.filter((c) => RELIEVER_CAT_LABELS.has(c.label.toUpperCase().trim()))
  const starterLabels = starterCats.map((c) => c.label)
  const relieverLabels = relieverCats.map((c) => c.label)

  const starters: StreamTarget[] = []
  if (starterCats.length) {
    for (const fa of args.freeAgents) {
      if (!isSP(fa.position)) continue
      const starts = lookupStarts(args.schedule, fa.name)
      if (!starts.length) continue
      const opps = starts.map((s) => `${s.opponentAbbr}`).join(', ')
      starters.push({
        player: { key: fa.playerKey, name: fa.name, team: fa.team, position: fa.position },
        cats: starterLabels,
        rationale: starts.length >= 2 ? `${starts.length} starts: ${opps}` : `1 start: ${opps}`,
        twoStart: starts.length >= 2,
        starts: starts.length,
      })
    }
    starters.sort((a, b) => (b.starts ?? 0) - (a.starts ?? 0))
  }

  const starterKeys = new Set(starters.map((s) => s.player.key))
  const relievers: StreamTarget[] = []
  if (relieverCats.length) {
    for (const fa of args.freeAgents) {
      if (!isRP(fa.position)) continue
      if (starterKeys.has(fa.playerKey)) continue // already shown as a starter, don't double-count
      relievers.push({
        player: { key: fa.playerKey, name: fa.name, team: fa.team, position: fa.position },
        cats: relieverLabels,
        rationale: fa.team ? `${fa.team} pen · ${relieverLabels.join('/')} upside` : `${relieverLabels.join('/')} upside`,
      })
    }
  }

  return {
    weakCats: pit.map((c) => ({ statId: c.statId, label: c.label, rank: c.rank })),
    starters: starters.slice(0, MAX_PER_LIST),
    relievers: relievers.slice(0, MAX_PER_LIST),
  }
}
