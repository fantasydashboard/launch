import { computed, type ComputedRef, type Ref } from 'vue'
import type { PoolPlayer } from '@/composables/useMyRoster'
import { buildPositionalLandscape, type DepthPlayer, type PositionalLandscape } from '@/trades/positionalLandscape'
import type { Landscape } from '@/trades/landscape'
import { evalDeal } from '@/trades/deals'
import { mlbTeamLogo } from '@/players/mlbTeamLogo'

export interface PosSide {
  playerKey: string
  name: string
  pos: string
  value: number
  headshot?: string
  proLogo?: string
}
export type PosTier = 'both' | 'one' // win-win only: fits-both vs fits-one(fallback)
export interface PositionalTarget {
  position: string // the slot this deal addresses
  get: PosSide
  give: PosSide
  fromTeam: string
  fromTeamLogo?: string
  tier?: PosTier // set on win-win
  secondaryHelps: string[] // categories the deal also helps you (the twofer tag)
}
export interface PositionalConsolidate {
  position: string
  get: PosSide
  give: PosSide[]
  fromTeam: string
  fromTeamLogo?: string
  secondaryHelps: string[]
}
export interface PositionalView {
  myDeep: string[] // positions you can trade from (surplus)
  myThin: string[] // positions you need (need)
  reach: PositionalTarget[]
  winWin: PositionalTarget[]
  consolidate: PositionalConsolidate[]
}

// A deal is "even enough" to be believable as 1-for-1 when values are within this band.
const VALUE_BAND = 24
// A reach must extract a meaningfully more valuable body than you give (they're desperate).
const REACH_MIN_OVERPAY = 6
// surplus/need must clear this to count as real depth / a real hole.
const EDGE = 0.5

export function usePositionalTargets(inputs: {
  pool: Ref<PoolPlayer[]>
  valueByKey: Ref<Map<string, number>>
  strengthByKey: Ref<Map<string, Record<string, number>>>
  slots: Ref<Record<string, number>>
  myStatuses: Ref<Map<string, string>> // playerKey -> injury status, my roster only
  catLandscape: Ref<Landscape> // for the category guardrail + secondary tagging
  statIds: Ref<string[]>
  myTeamKey: Ref<string | null>
  teamNameByKey: Ref<Map<string, string>>
  teamLogoByKey?: Ref<Map<string, string>>
  labelOf: (statId: string) => string
}): { view: ComputedRef<PositionalView | null> } {
  const view = computed<PositionalView | null>(() => {
    const pool = inputs.pool.value
    const slots = inputs.slots.value
    const myKey = inputs.myTeamKey.value
    if (!pool.length || !Object.keys(slots).length || !myKey) return null

    const valueByKey = inputs.valueByKey.value
    const teamName = (k: string) => inputs.teamNameByKey.value.get(k) ?? 'Team'
    const teamLogo = (k: string) => inputs.teamLogoByKey?.value.get(k)

    // Build depth players (inject my injury status so my holes are precise).
    const depth: DepthPlayer[] = pool.map((p) => ({
      playerKey: p.playerKey,
      teamKey: p.teamKey,
      eligiblePositions: p.eligiblePositions ?? p.position.split(/[,/|]/).map((s) => s.trim()).filter(Boolean),
      value: valueByKey.get(p.playerKey) ?? 0,
      status: p.teamKey === myKey ? inputs.myStatuses.value.get(p.playerKey) ?? '' : '',
    }))
    const ls: PositionalLandscape = buildPositionalLandscape(depth, slots, undefined)
    const byKey = new Map(pool.map((p) => [p.playerKey, p]))
    const sideOf = (key: string): PosSide => {
      const p = byKey.get(key)!
      return { playerKey: key, name: p.name, pos: p.position, value: Math.round(valueByKey.get(key) ?? 0),
        headshot: p.headshot, proLogo: p.proTeam ? mlbTeamLogo(p.proTeam) : undefined }
    }

    const mine = ls.get(myKey)
    const positions = Object.keys(slots)
    const myDeep = positions.filter((pos) => (mine?.get(pos)?.surplus ?? 0) >= EDGE)
    const myThin = positions.filter((pos) => (mine?.get(pos)?.need ?? 0) >= EDGE)

    const eligibleAt = (key: string, pos: string) => (byKey.get(key)?.eligiblePositions ?? []).includes(pos)

    // My giveable bodies per position (startable I'm deep in), worst first (give the least extra).
    const myGiveablesAt = (pos: string): string[] =>
      depth.filter((p) => p.teamKey === myKey && p.value > 0 && eligibleAt(p.playerKey, pos))
        .sort((a, b) => a.value - b.value).map((p) => p.playerKey)

    // The category guardrail: reject a deal that nets a category LOSS; tag the categories it helps.
    const guardrail = (getKey: string, giveKey: string): { ok: boolean; secondaryHelps: string[] } => {
      const stat = inputs.statIds.value
      if (!stat.length) return { ok: true, secondaryHelps: [] }
      const cl = inputs.catLandscape.value.get(myKey)
      const myNeed: Record<string, number> = {}
      for (const c of stat) myNeed[c] = cl?.get(c)?.need ?? 0
      const sb = inputs.strengthByKey.value
      const getStr = sb.get(getKey) ?? {}
      const giveStr = sb.get(giveKey) ?? {}
      const ev = evalDeal(getStr, giveStr, myNeed, myNeed, stat)
      const secondaryHelps = stat
        .filter((c) => (myNeed[c] ?? 0) > 0 && (getStr[c] ?? 0) - (giveStr[c] ?? 0) > 0.01)
        .sort((a, b) => ((getStr[b] ?? 0) - (giveStr[b] ?? 0)) - ((getStr[a] ?? 0) - (giveStr[a] ?? 0)))
        .slice(0, 3).map((c) => inputs.labelOf(c))
      return { ok: ev.yourGain >= 0, secondaryHelps } // reject only a net category LOSS
    }

    // REACH: their hole at pos + my surplus at pos. I give them a startable body at the slot they're
    // desperate for; because they're desperate they overpay — I get back a MORE valuable body (not
    // from their own hole), with my gain in [REACH_MIN_OVERPAY, VALUE_BAND]. One-sided in my favor.
    const reach: PositionalTarget[] = []
    for (const [teamKey, m] of ls) {
      if (teamKey === myKey) continue
      for (const pos of positions) {
        if ((m.get(pos)?.need ?? 0) < EDGE) continue // they aren't thin here
        if ((mine?.get(pos)?.surplus ?? 0) < EDGE) continue // I'm not deep here
        const giveKey = myGiveablesAt(pos)[0]
        if (!giveKey) continue
        const giveVal = valueByKey.get(giveKey) ?? 0
        const theirReturn = depth
          .filter((p) => p.teamKey === teamKey && !eligibleAt(p.playerKey, pos) && p.value > 0)
          .map((p) => ({ p, gain: (valueByKey.get(p.playerKey) ?? 0) - giveVal }))
          .filter((x) => x.gain >= REACH_MIN_OVERPAY && x.gain <= VALUE_BAND)
          .sort((a, b) => b.gain - a.gain)[0]?.p // maximize my gain (the most reach)
        if (!theirReturn) continue
        const g = guardrail(theirReturn.playerKey, giveKey)
        if (!g.ok) continue
        reach.push({ position: pos, get: sideOf(theirReturn.playerKey), give: sideOf(giveKey),
          fromTeam: teamName(teamKey), fromTeamLogo: teamLogo(teamKey), secondaryHelps: g.secondaryHelps })
      }
    }

    // WIN-WIN: a position I need (my hole) where THEY have surplus, AND a position they need where I
    // have surplus — each fills the other's hole, values even. Tier by the secondary (category)
    // effect: 'both' if the swap also helps a category you need, else 'one'.
    const winWin: PositionalTarget[] = []
    for (const [teamKey, m] of ls) {
      if (teamKey === myKey) continue
      for (const myHole of myThin) {
        if ((m.get(myHole)?.surplus ?? 0) < EDGE) continue // they aren't deep at my hole
        for (const theirHole of positions) {
          if ((m.get(theirHole)?.need ?? 0) < EDGE) continue // not their hole
          if ((mine?.get(theirHole)?.surplus ?? 0) < EDGE) continue // I'm not deep there
          // I get their best body at my hole; I give my worst extra at their hole.
          const getKey = depth.filter((p) => p.teamKey === teamKey && eligibleAt(p.playerKey, myHole) && p.value > 0)
            .sort((a, b) => b.value - a.value)[0]?.playerKey
          const giveKey = myGiveablesAt(theirHole)[0]
          if (!getKey || !giveKey) continue
          const getVal = valueByKey.get(getKey) ?? 0
          const giveVal = valueByKey.get(giveKey) ?? 0
          if (Math.abs(getVal - giveVal) > VALUE_BAND) continue // must be even
          const g = guardrail(getKey, giveKey)
          if (!g.ok) continue
          winWin.push({ position: myHole, get: sideOf(getKey), give: sideOf(giveKey),
            fromTeam: teamName(teamKey), fromTeamLogo: teamLogo(teamKey),
            tier: g.secondaryHelps.length ? 'both' : 'one', secondaryHelps: g.secondaryHelps })
        }
      }
    }
    // Tier 1 (both) before Tier 2 (one); within a tier, closest value first.
    winWin.sort((a, b) => (a.tier === b.tier ? 0 : a.tier === 'both' ? -1 : 1))

    return { myDeep, myThin, reach, winWin, consolidate: [] }
  })
  return { view }
}
