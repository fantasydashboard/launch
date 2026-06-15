import { computed, ref, type ComputedRef, type Ref } from 'vue'
import type { PoolPlayer } from '@/composables/useMyRoster'
import type { TradeEngine } from '@/trades/engine'
import type { TradeView, TradeTarget, ConsolidateTarget, TradeSide } from '@/composables/useTradeTargets'
import type { PositionalView, PosSide } from '@/composables/usePositionalTargets'
import {
  buildOpportunities,
  type Intent,
  type OppSide,
  type RawDeal,
  type TradeOpportunity,
} from '@/trades/opportunities'
import { buildPositionalLandscape, type DepthPlayer } from '@/trades/positionalLandscape'
import { FIT_WEIGHTS_POSITION, FIT_WEIGHTS_CATEGORY } from '@/trades/fitScore'

export type Lens = 'position' | 'category'

// Tuning dials — surfaced as named constants so they can be adjusted after a screenshot pass.
const ACCEPT_BAR = 0.4 // their-fit floor for the main list + hero (a deal they'd plausibly do)
const HERO_COUNT = 3
const HURT_THRESHOLD = 0.15 // min need-weighted loss to surface as a "cost"
const POS_EDGE = 0.5
// Curation caps — keep the merged list from becoming a repetitive wall (the same surplus body
// shopped to everyone, the same 2-for-1 package offered for five studs, one thin slot dominating).
const GIVE_CAP = 2 // max cards any one give player appears in
const GET_CAP = 2 // max cards any one target appears in
const PKG_CAP = 1 // max cards a given give-package (set of give players) appears in
const HEADLINE_CAP = 3 // max cards per headline (≈ per filled position)
const PARTNER_CAP = 3 // max cards per partner team
const MAX_LIST = 12 // overall length cap for the main list

const giveKeysOf = (o: { give: { playerKey: string }[] }) => o.give.map((s) => s.playerKey).sort().join(',')
const getKeysOf = (o: { get: { playerKey: string }[] }) => o.get.map((s) => s.playerKey).sort().join(',')

const eligFromPos = (pos: string): string[] =>
  pos.split(/[,/|]/).map((s) => s.trim()).filter(Boolean)

const catSide = (s: TradeSide): OppSide => ({
  playerKey: s.playerKey, name: s.name, pos: s.pos, value: s.value,
  headshot: s.headshot, proLogo: s.proLogo, eligible: eligFromPos(s.pos),
})
const posSide = (s: PosSide): OppSide => ({
  playerKey: s.playerKey, name: s.name, pos: s.pos, value: s.value,
  headshot: s.headshot, proLogo: s.proLogo, eligible: s.eligible,
})

const PITCH_POS = new Set(['P', 'SP', 'RP'])
const posIsPitching = (pos: string): boolean => PITCH_POS.has(pos)
const SIDE_NEED_MIN = 0.3 // a category counts toward a side's need only above this hump value

// Timing flags carried on the player sides (buy-low get / sell-high give) become opportunity tags.
const timingIntents = (get: TradeSide[], give: TradeSide[]): Intent[] => {
  const out: Intent[] = []
  if (get.some((s) => s.timing === 'buy')) out.push('buyLow')
  if (give.some((s) => s.timing === 'sell')) out.push('sellHigh')
  return out
}

export function useTradeOpportunities(inputs: {
  pool: Ref<PoolPlayer[]>
  engine: Ref<TradeEngine | null>
  catView: ComputedRef<TradeView | undefined> | Ref<TradeView | undefined>
  posView: Ref<PositionalView | null>
  slots: Ref<Record<string, number>>
  myStatuses: Ref<Map<string, string>>
  myTeamKey: Ref<string | null>
  statIds: Ref<string[]>
  catSideById: Ref<Map<string, 'hit' | 'pit'>> // for tying positional need to category need by side
  labelOf: (statId: string) => string
}): {
  all: ComputedRef<TradeOpportunity[]>
  hero: ComputedRef<TradeOpportunity[]>
  ranked: ComputedRef<TradeOpportunity[]>
  lens: Ref<Lens>
  activeIntents: Ref<Set<Intent>>
  pressLeverage: Ref<boolean>
  toggleIntent: (i: Intent) => void
} {
  const lens = ref<Lens>('category')
  const activeIntents = ref<Set<Intent>>(new Set())
  const pressLeverage = ref(false)
  const toggleIntent = (i: Intent) => {
    const next = new Set(activeIntents.value)
    next.has(i) ? next.delete(i) : next.add(i)
    activeIntents.value = next
  }

  // Positional landscape (per team per slot) — role-relative value so the startable bar and
  // thin/deep reads match usePositionalTargets.
  const posLandscape = computed(() => {
    const eng = inputs.engine.value
    const slots = inputs.slots.value
    const myKey = inputs.myTeamKey.value
    if (!eng || !Object.keys(slots).length) return null
    const role = eng.roleValueByKey
    const depth: DepthPlayer[] = inputs.pool.value.map((p) => ({
      playerKey: p.playerKey,
      teamKey: p.teamKey,
      eligiblePositions: p.eligiblePositions?.length ? p.eligiblePositions : eligFromPos(p.position),
      value: role.get(p.playerKey) ?? 0,
      status: p.teamKey === myKey ? inputs.myStatuses.value.get(p.playerKey) ?? '' : '',
    }))
    return buildPositionalLandscape(depth, slots)
  })

  // Do I have any unmet HITTING vs PITCHING category? A positional hole only matters competitively
  // if filling it advances a category I need — so a hitting-rich team (1st in every hitting cat)
  // shouldn't be told to "fill" its 2B/UTIL/MI flex slots with more dead-value bats.
  const sideNeed = computed(() => {
    const eng = inputs.engine.value
    const myKey = inputs.myTeamKey.value
    const cl = myKey ? eng?.landscape.get(myKey) : undefined
    let hit = false
    let pit = false
    for (const c of inputs.statIds.value) {
      if ((cl?.get(c)?.need ?? 0) < SIDE_NEED_MIN) continue
      if (inputs.catSideById.value.get(c) === 'pit') pit = true
      else hit = true
    }
    return { hit, pit }
  })

  const myThin = computed<string[]>(() => {
    const pl = posLandscape.value
    const myKey = inputs.myTeamKey.value
    if (!pl || !myKey) return []
    const m = pl.get(myKey)
    if (!m) return []
    const { hit, pit } = sideNeed.value
    return [...m.entries()]
      .filter(([, st]) => st.need >= POS_EDGE)
      // keep a positional hole only if I actually need that side's categories.
      .filter(([pos]) => (posIsPitching(pos) ? pit : hit))
      .map(([pos]) => pos)
  })

  // Map both generators' outputs into the common RawDeal shape.
  const raws = computed<RawDeal[]>(() => {
    const out: RawDeal[] = []
    const cv = inputs.catView.value
    const oneFor = (t: TradeTarget, intents: Intent[]) =>
      out.push({ partnerKey: t.partnerKey, partner: t.fromTeam, partnerLogo: t.fromTeamLogo,
        get: [catSide(t.get)], give: [catSide(t.give)], intents: [...intents, ...timingIntents([t.get], [t.give])] })
    const twoFor = (t: ConsolidateTarget, intents: Intent[]) =>
      out.push({ partnerKey: t.partnerKey, partner: t.fromTeam, partnerLogo: t.fromTeamLogo,
        get: [catSide(t.get)], give: t.give.map(catSide), intents: [...intents, ...timingIntents([t.get], t.give)] })
    if (cv) {
      for (const t of cv.winWin) oneFor(t, ['winWin'])
      for (const t of cv.reach) oneFor(t, ['steal'])
      for (const t of cv.timing) oneFor(t, [])
      for (const t of cv.consolidate) twoFor(t, ['consolidate'])
      for (const t of cv.timingConsolidate) twoFor(t, ['consolidate'])
    }
    const pv = inputs.posView.value
    if (pv) {
      for (const t of pv.winWin) out.push({ partnerKey: t.partnerKey, partner: t.fromTeam, partnerLogo: t.fromTeamLogo, get: [posSide(t.get)], give: [posSide(t.give)], intents: ['winWin'] })
      for (const t of pv.reach) out.push({ partnerKey: t.partnerKey, partner: t.fromTeam, partnerLogo: t.fromTeamLogo, get: [posSide(t.get)], give: [posSide(t.give)], intents: ['steal'] })
      for (const t of pv.consolidate) out.push({ partnerKey: t.partnerKey, partner: t.fromTeam, partnerLogo: t.fromTeamLogo, get: [posSide(t.get)], give: t.give.map(posSide), intents: ['consolidate'] })
    }
    return out
  })

  const all = computed<TradeOpportunity[]>(() => {
    const eng = inputs.engine.value
    const pl = posLandscape.value
    const myKey = inputs.myTeamKey.value
    if (!eng || !pl || !myKey) return []
    return buildOpportunities(raws.value, {
      myKey,
      statIds: inputs.statIds.value,
      strengthByKey: eng.strengthByKey,
      valueByKey: eng.valueByKey,
      catLandscape: eng.landscape,
      posLandscape: pl,
      myThin: myThin.value,
      weights: lens.value === 'position' ? FIT_WEIGHTS_POSITION : FIT_WEIGHTS_CATEGORY,
      hurtThreshold: HURT_THRESHOLD,
      labelOf: inputs.labelOf,
    })
  })

  // Hero = your strongest DISTINCT moves: top acceptance-gated by your-fit, but no two heroes share
  // the same filled position (headline) or partner — three variations of one move isn't three moves.
  const hero = computed<TradeOpportunity[]>(() => {
    const sorted = [...all.value].filter((o) => o.fit.them >= ACCEPT_BAR).sort((a, b) => b.fit.you - a.fit.you)
    const out: TradeOpportunity[] = []
    const heads = new Set<string>()
    const partners = new Set<string>()
    const gives = new Set<string>()
    for (const o of sorted) {
      if (heads.has(o.headline) || partners.has(o.partnerKey)) continue
      if (o.give.some((s) => gives.has(s.playerKey))) continue // no two heroes lean on the same give
      out.push(o)
      heads.add(o.headline)
      partners.add(o.partnerKey)
      o.give.forEach((s) => gives.add(s.playerKey))
      if (out.length >= HERO_COUNT) break
    }
    return out
  })

  // Main list: gated by acceptance (unless pressing leverage), filtered by intent chips, sorted by
  // your-fit, hero-excluded, then CURATED so no single give player / package / position / partner
  // floods the list — the fix for the repetitive wall.
  const ranked = computed<TradeOpportunity[]>(() => {
    const heroIds = new Set(hero.value.map((o) => o.id))
    const intents = activeIntents.value
    const pool = [...all.value]
      .filter((o) => pressLeverage.value || o.fit.them >= ACCEPT_BAR)
      .filter((o) => !intents.size || o.intents.some((i) => intents.has(i)))
      .filter((o) => !heroIds.has(o.id))
      .sort((a, b) => b.fit.you - a.fit.you)

    // Seed the curation budget with what the hero already spent, so the list never repeats a give
    // player or package the hero is already showing above it.
    const giveUse = new Map<string, number>()
    const getUse = new Map<string, number>()
    const pkgUse = new Map<string, number>()
    const headUse = new Map<string, number>()
    const partnerUse = new Map<string, number>()
    for (const o of hero.value) {
      o.give.forEach((s) => giveUse.set(s.playerKey, (giveUse.get(s.playerKey) ?? 0) + 1))
      pkgUse.set(giveKeysOf(o), (pkgUse.get(giveKeysOf(o)) ?? 0) + 1)
    }
    const out: TradeOpportunity[] = []
    for (const o of pool) {
      const pkg = giveKeysOf(o)
      const get = getKeysOf(o)
      if (o.give.some((s) => (giveUse.get(s.playerKey) ?? 0) >= GIVE_CAP)) continue
      if ((getUse.get(get) ?? 0) >= GET_CAP) continue
      if ((pkgUse.get(pkg) ?? 0) >= PKG_CAP) continue
      if ((headUse.get(o.headline) ?? 0) >= HEADLINE_CAP) continue
      if ((partnerUse.get(o.partnerKey) ?? 0) >= PARTNER_CAP) continue
      out.push(o)
      o.give.forEach((s) => giveUse.set(s.playerKey, (giveUse.get(s.playerKey) ?? 0) + 1))
      getUse.set(get, (getUse.get(get) ?? 0) + 1)
      pkgUse.set(pkg, (pkgUse.get(pkg) ?? 0) + 1)
      headUse.set(o.headline, (headUse.get(o.headline) ?? 0) + 1)
      partnerUse.set(o.partnerKey, (partnerUse.get(o.partnerKey) ?? 0) + 1)
      if (out.length >= MAX_LIST) break
    }
    return out
  })

  return { all, hero, ranked, lens, activeIntents, pressLeverage, toggleIntent }
}
