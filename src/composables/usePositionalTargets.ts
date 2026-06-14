import { computed, type ComputedRef, type Ref } from 'vue'
import type { PoolPlayer } from '@/composables/useMyRoster'
import {
  assignSlots,
  buildPositionalLandscape,
  coversSlot,
  STARTABLE_BAR,
  type DepthPlayer,
  type PositionalLandscape,
} from '@/trades/positionalLandscape'
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

// A deal is "even enough" to be believable as 1-for-1 when cross-role values are within this band.
const VALUE_BAND = 24
// A reach must extract a meaningfully more valuable body than you give (they're desperate)...
const REACH_MIN_OVERPAY = 6
// ...but a MODEST one. A team patches a positional hole with a slightly-better body, it doesn't
// hand you a franchise player — so the reach overpay is capped well below VALUE_BAND.
const REACH_MAX_GAIN = 16
// A team won't trade its best few players to patch a position. Exclude each team's top-N (by value)
// as a reach return; a smaller protection on the consolidate stud (a 2-for-1 CAN pry a good player,
// just not their cornerstone).
const CORE_PROTECT = 4
const CONSOLIDATE_PROTECT = 2
// surplus/need must clear this to count as real depth / a real hole.
const EDGE = 0.5
// Don't flood the list — show the strongest handful per intent.
const MAX_PER_MODE = 8
const MAX_CONSOLIDATE = 4
// A single surplus body can't be promised to everyone — cap how many cards reuse the same give.
const MAX_GIVE_REUSE = 2

// Friendlier labels for the Deep/Thin summary, and pitching collapsed to one chip.
const PRETTY_POS: Record<string, string> = { UTIL: 'Util', '2B/SS': 'MI', '1B/3B': 'CI' }
function prettyPositions(list: string[]): string[] {
  const out: string[] = []
  let pitch = false
  for (const p of list) {
    if (p === 'SP' || p === 'RP' || p === 'P') { pitch = true; continue }
    const label = PRETTY_POS[p] ?? p
    if (!out.includes(label)) out.push(label)
  }
  if (pitch) out.push('P')
  return out
}

export function usePositionalTargets(inputs: {
  pool: Ref<PoolPlayer[]>
  valueByKey: Ref<Map<string, number>> // cross-role percentile — for display + value bands
  roleValueByKey: Ref<Map<string, number>> // within-role percentile — for "startable" + slot assignment
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

    const crossVal = (key: string) => inputs.valueByKey.value.get(key) ?? 0
    const roleScore = (key: string) => inputs.roleValueByKey.value.get(key) ?? 0
    const teamName = (k: string) => inputs.teamNameByKey.value.get(k) ?? 'Team'
    const teamLogo = (k: string) => inputs.teamLogoByKey?.value.get(k)

    // Depth players are scored by ROLE-relative value (pitcher-vs-pitcher), so the startable bar
    // and slot assignment don't read every pitcher as a hole the way cross-role value would.
    const byKey = new Map(pool.map((p) => [p.playerKey, p]))
    const eligOf = (key: string) =>
      byKey.get(key)?.eligiblePositions ??
      (byKey.get(key)?.position.split(/[,/|]/).map((s) => s.trim()).filter(Boolean) ?? [])
    const depth: DepthPlayer[] = pool.map((p) => ({
      playerKey: p.playerKey,
      teamKey: p.teamKey,
      eligiblePositions: eligOf(p.playerKey),
      value: roleScore(p.playerKey),
      status: p.teamKey === myKey ? inputs.myStatuses.value.get(p.playerKey) ?? '' : '',
    }))
    const ls: PositionalLandscape = buildPositionalLandscape(depth, slots)

    // Each team's genuine SURPLUS = startable bodies that didn't make its starting lineup. The GIVE
    // side comes from here (never a starter, never a sub-replacement scrub) — this is the fix that
    // stops shipping a value-1 body to "fill" someone's hole.
    const depthByTeam = new Map<string, DepthPlayer[]>()
    for (const d of depth) (depthByTeam.get(d.teamKey) ?? depthByTeam.set(d.teamKey, []).get(d.teamKey)!).push(d)
    const benchByTeam = new Map<string, Set<string>>()
    for (const [team, players] of depthByTeam) {
      benchByTeam.set(team, new Set(assignSlots(players, slots).benchStartable.map((p) => p.playerKey)))
    }
    const myBench = benchByTeam.get(myKey) ?? new Set<string>()

    // Each team's most valuable few players — the cornerstones they won't move to patch a position.
    const coreByTeam = new Map<string, string[]>()
    for (const [team, players] of depthByTeam) {
      coreByTeam.set(team, [...players].sort((a, b) => crossVal(b.playerKey) - crossVal(a.playerKey)).map((p) => p.playerKey))
    }
    const isCore = (team: string, key: string, n: number) => (coreByTeam.get(team) ?? []).slice(0, n).includes(key)

    const sideOf = (key: string): PosSide => {
      const p = byKey.get(key)!
      return { playerKey: key, name: p.name, pos: p.position, value: Math.round(crossVal(key)),
        headshot: p.headshot, proLogo: p.proTeam ? mlbTeamLogo(p.proTeam) : undefined }
    }

    const mine = ls.get(myKey)
    const positions = Object.keys(slots)
    const myDeep = positions.filter((pos) => (mine?.get(pos)?.surplus ?? 0) >= EDGE)
    const myThin = positions.filter((pos) => (mine?.get(pos)?.need ?? 0) >= EDGE)
    // Does a player cover any slot I'm thin at? Used to prefer reach returns that fill a real hole
    // instead of piling onto a position I'm already deep in.
    const fillsMyThin = (key: string) => myThin.some((t) => coversSlot(eligOf(key), t))

    // My giveable bodies for a slot: my surplus starters that can fill it, cheapest (cross-value) first.
    const myGiveablesAt = (pos: string): string[] =>
      [...myBench].filter((k) => coversSlot(eligOf(k), pos)).sort((a, b) => crossVal(a) - crossVal(b))
    const theirSurplusAt = (team: string, pos: string): string[] =>
      [...(benchByTeam.get(team) ?? [])].filter((k) => coversSlot(eligOf(k), pos)).sort((a, b) => crossVal(b) - crossVal(a))

    // Category guardrail: reject a net category LOSS; tag the categories the deal also helps.
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
      return { ok: ev.yourGain >= 0, secondaryHelps }
    }

    // Keep only the best card per GET player (kills duplicate cards for the same target).
    const dedupeByGet = <T extends { get: PosSide }>(deals: T[], rank: (t: T) => number): T[] => {
      const best = new Map<string, T>()
      for (const d of deals) {
        const cur = best.get(d.get.playerKey)
        if (!cur || rank(d) > rank(cur)) best.set(d.get.playerKey, d)
      }
      return [...best.values()].sort((a, b) => rank(b) - rank(a)).slice(0, MAX_PER_MODE)
    }
    // A single surplus body can't be promised to everyone — keep at most MAX_GIVE_REUSE cards per
    // give player (input already sorted best-first).
    const capGiveReuse = (deals: PositionalTarget[]): PositionalTarget[] => {
      const used = new Map<string, number>()
      const out: PositionalTarget[] = []
      for (const d of deals) {
        const n = used.get(d.give.playerKey) ?? 0
        if (n >= MAX_GIVE_REUSE) continue
        used.set(d.give.playerKey, n + 1)
        out.push(d)
      }
      return out
    }

    // REACH: they're thin at a slot you're deep in. You GIVE a startable surplus body that fills
    // their hole; because they're desperate they overpay — you GET a more valuable body of theirs,
    // gain in [REACH_MIN_OVERPAY, REACH_MAX_GAIN]. NOT one of their cornerstones (CORE_PROTECT), and
    // preferring a return that fills a slot YOU'RE thin at over one that piles onto your strength.
    const reachRaw: (PositionalTarget & { rank: number })[] = []
    for (const [teamKey, m] of ls) {
      if (teamKey === myKey) continue
      for (const pos of positions) {
        if ((m.get(pos)?.need ?? 0) < EDGE) continue
        if ((mine?.get(pos)?.surplus ?? 0) < EDGE) continue
        const giveKey = myGiveablesAt(pos)[0]
        if (!giveKey) continue
        const giveVal = crossVal(giveKey)
        const ret = (depthByTeam.get(teamKey) ?? [])
          .filter((p) => !coversSlot(p.eligiblePositions, pos) && crossVal(p.playerKey) > 0 && !isCore(teamKey, p.playerKey, CORE_PROTECT))
          .map((p) => ({ key: p.playerKey, gain: crossVal(p.playerKey) - giveVal, thin: fillsMyThin(p.playerKey) }))
          .filter((x) => x.gain >= REACH_MIN_OVERPAY && x.gain <= REACH_MAX_GAIN)
          // a return that fills your hole beats a bigger overpay that piles onto a strength.
          .sort((a, b) => (Number(b.thin) - Number(a.thin)) || (b.gain - a.gain))[0]
        if (!ret) continue
        const g = guardrail(ret.key, giveKey)
        if (!g.ok) continue
        reachRaw.push({ position: pos, get: sideOf(ret.key), give: sideOf(giveKey),
          rank: (ret.thin ? 100 : 0) + ret.gain,
          fromTeam: teamName(teamKey), fromTeamLogo: teamLogo(teamKey), secondaryHelps: g.secondaryHelps })
      }
    }
    const reach = capGiveReuse(dedupeByGet(reachRaw, (t) => t.rank))

    // WIN-WIN: a slot you need where THEY have surplus, AND a slot they need where YOU have surplus —
    // each fills the other's hole from spare parts, values even. Tier by the secondary (category) effect.
    const winWinRaw: (PositionalTarget & { closeness: number })[] = []
    for (const [teamKey, m] of ls) {
      if (teamKey === myKey) continue
      for (const myHole of myThin) {
        if ((m.get(myHole)?.surplus ?? 0) < EDGE) continue
        const getKey = theirSurplusAt(teamKey, myHole)[0]
        if (!getKey) continue
        for (const theirHole of positions) {
          if ((m.get(theirHole)?.need ?? 0) < EDGE) continue
          if ((mine?.get(theirHole)?.surplus ?? 0) < EDGE) continue
          const giveKey = myGiveablesAt(theirHole)[0]
          if (!giveKey) continue
          const diff = Math.abs(crossVal(getKey) - crossVal(giveKey))
          if (diff > VALUE_BAND) continue
          const g = guardrail(getKey, giveKey)
          if (!g.ok) continue
          winWinRaw.push({ position: myHole, get: sideOf(getKey), give: sideOf(giveKey),
            tier: g.secondaryHelps.length ? 'both' : 'one', secondaryHelps: g.secondaryHelps,
            closeness: VALUE_BAND - diff, fromTeam: teamName(teamKey), fromTeamLogo: teamLogo(teamKey) })
        }
      }
    }
    const winWin = dedupeByGet(winWinRaw, (t) => (t.tier === 'both' ? 1000 : 0) + t.closeness)

    // CONSOLIDATE: package two surplus bodies for one genuine STARTER (role-startable) at a slot you
    // need. Frees a roster spot. The stud must clear the bar and out-value each piece individually.
    const consolidateRaw: (PositionalConsolidate & { studVal: number })[] = []
    for (const [teamKey] of ls) {
      if (teamKey === myKey) continue
      for (const myHole of myThin) {
        const stud = (depthByTeam.get(teamKey) ?? [])
          .filter((p) => coversSlot(p.eligiblePositions, myHole) && roleScore(p.playerKey) >= STARTABLE_BAR && !isCore(teamKey, p.playerKey, CONSOLIDATE_PROTECT))
          .sort((a, b) => crossVal(b.playerKey) - crossVal(a.playerKey))[0]
        if (!stud) continue
        const giveTwo = [...myBench].map((k) => ({ k, v: crossVal(k) })).sort((a, b) => a.v - b.v).slice(0, 2)
        if (giveTwo.length < 2) continue
        const studVal = crossVal(stud.playerKey)
        const giveSum = giveTwo.reduce((s, x) => s + x.v, 0)
        if (giveSum < studVal - VALUE_BAND || studVal < Math.max(...giveTwo.map((x) => x.v))) continue
        const g = guardrail(stud.playerKey, giveTwo[0].k)
        if (!g.ok) continue
        consolidateRaw.push({ position: myHole, get: sideOf(stud.playerKey), studVal,
          give: giveTwo.map((x) => sideOf(x.k)), fromTeam: teamName(teamKey),
          fromTeamLogo: teamLogo(teamKey), secondaryHelps: g.secondaryHelps })
      }
    }
    const consolidate = (() => {
      const best = new Map<string, (typeof consolidateRaw)[number]>()
      for (const d of consolidateRaw) if (!best.has(d.get.playerKey)) best.set(d.get.playerKey, d)
      return [...best.values()].sort((a, b) => b.studVal - a.studVal).slice(0, MAX_CONSOLIDATE)
        .map(({ studVal: _studVal, ...rest }) => rest)
    })()

    return { myDeep: prettyPositions(myDeep), myThin: prettyPositions(myThin), reach, winWin, consolidate }
  })
  return { view }
}
