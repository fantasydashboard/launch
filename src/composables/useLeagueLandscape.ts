import { computed, type ComputedRef, type Ref } from 'vue'
import type { CatSpec } from '@/myteam/value'
import type { Landscape } from '@/trades/landscape'
import { coversSlot } from '@/trades/positionalLandscape'
import { eligOf, isPitcherElig, pitcherRoleFor } from '@/trades/lineupEligibility'
import type { FGProjection } from '@/services/projectionService'
import type { PoolPlayer } from '@/composables/useMyRoster'

// The Trades league landscape: every team's rank in each category AND at each position, so you
// can spot complementary trade partners (strong where you're weak, weak where you're strong).
// Category ranks reuse the engine's standings landscape; position strength is each team's best
// eligible body at the position (cross-role percentile), ranked across the league.

export interface LandscapeRow {
  key: string
  label: string
  ranks: (number | null)[] // aligned to `teams` order; null = team fields nobody here
}
export interface LandscapeView {
  teams: { key: string; label: string; name: string; isMe: boolean }[]
  categoryRows: LandscapeRow[]
  positionRows: LandscapeRow[]
  numTeams: number
}

// Concrete fielding positions worth comparing for trades (flex/util slots are overflow, not a
// position you target). SP/RP are derived from projected pitcher role.
const POSITION_ROWS = ['C', '1B', '2B', '3B', 'SS', 'OF', 'SP', 'RP']

function shorten(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1].slice(0, 2)).toUpperCase()
  return name.slice(0, 3).toUpperCase()
}

export function useLeagueLandscape(inputs: {
  pool: Ref<PoolPlayer[]>
  fgByKey: Ref<Record<string, FGProjection | null>>
  catSpecs: Ref<CatSpec[]>
  landscape: Ref<Landscape>
  roleValueByKey: Ref<Map<string, number>>
  myTeamKey: Ref<string | null>
  teamNameByKey: Ref<Map<string, string>>
  labelOf: (statId: string) => string
}): { view: ComputedRef<LandscapeView | null> } {
  const view = computed<LandscapeView | null>(() => {
    const pool = inputs.pool.value
    const ls = inputs.landscape.value
    if (!pool.length || !ls.size) return null
    const myKey = inputs.myTeamKey.value
    const nameOf = (k: string) => inputs.teamNameByKey.value.get(k) ?? k

    // Team columns: YOU first, then the rest alphabetically.
    const teamKeys = [...ls.keys()].sort((a, b) =>
      a === myKey ? -1 : b === myKey ? 1 : nameOf(a).localeCompare(nameOf(b)),
    )
    const teams = teamKeys.map((k) => ({ key: k, label: k === myKey ? 'YOU' : shorten(nameOf(k)), name: nameOf(k), isMe: k === myKey }))
    const numTeams = teamKeys.length

    // Category rows straight from the standings landscape (already direction-aware per cat).
    const categoryRows: LandscapeRow[] = inputs.catSpecs.value.map((c) => ({
      key: c.statId,
      label: inputs.labelOf(c.statId),
      ranks: teamKeys.map((tk) => ls.get(tk)?.get(c.statId)?.rank ?? null),
    }))

    // Position rows: each team's BEST eligible body at the position (cross-role percentile),
    // ranked across the league. Multi-eligible players count at every position they cover —
    // intended here, since the question is "how good is their best option at C / SS / SP".
    const role = inputs.roleValueByKey.value
    const fg = inputs.fgByKey.value
    const byTeam = new Map<string, PoolPlayer[]>()
    for (const p of pool) {
      const tk = String((p as { teamKey?: string }).teamKey ?? '')
      if (!tk) continue
      ;(byTeam.get(tk) ?? byTeam.set(tk, []).get(tk)!).push(p)
    }
    const covers = (p: PoolPlayer, pos: string): boolean => {
      const elig = eligOf(p)
      if (pos === 'SP' || pos === 'RP') return isPitcherElig(elig) && pitcherRoleFor(fg[p.playerKey], elig) === pos
      return !isPitcherElig(elig) && coversSlot(elig, pos)
    }
    const positionRows: LandscapeRow[] = []
    for (const pos of POSITION_ROWS) {
      const bestByTeam = new Map<string, number | null>()
      let anyTeam = false
      for (const tk of teamKeys) {
        const cands = (byTeam.get(tk) ?? []).filter((p) => covers(p, pos))
        if (!cands.length) { bestByTeam.set(tk, null); continue }
        anyTeam = true
        bestByTeam.set(tk, Math.max(...cands.map((p) => role.get(p.playerKey) ?? 0)))
      }
      if (!anyTeam) continue // position not used in this league
      const ranked = [...bestByTeam.entries()]
        .filter(([, v]) => v != null)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
      const rankByTeam = new Map<string, number>()
      ranked.forEach(([tk], i) => rankByTeam.set(tk, i + 1))
      positionRows.push({
        key: pos,
        label: pos,
        ranks: teamKeys.map((tk) => (bestByTeam.get(tk) == null ? null : rankByTeam.get(tk) ?? null)),
      })
    }

    return { teams, categoryRows, positionRows, numTeams }
  })

  return { view }
}
