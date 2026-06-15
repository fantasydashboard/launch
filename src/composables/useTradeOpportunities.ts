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
const ACCEPT_BAR = 0.45 // their-fit floor for the main list + hero (a deal they'd plausibly do)
const HERO_COUNT = 3
const HURT_THRESHOLD = 0.15 // min need-weighted loss to surface as a "cost"
const POS_EDGE = 0.5

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

  const myThin = computed<string[]>(() => {
    const pl = posLandscape.value
    const myKey = inputs.myTeamKey.value
    if (!pl || !myKey) return []
    const m = pl.get(myKey)
    if (!m) return []
    return [...m.entries()].filter(([, st]) => st.need >= POS_EDGE).map(([pos]) => pos)
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

  // Hero = the strongest acceptance-gated moves, cross-intent, ignoring chips + press-leverage.
  const hero = computed<TradeOpportunity[]>(() =>
    [...all.value].filter((o) => o.fit.them >= ACCEPT_BAR).sort((a, b) => b.fit.you - a.fit.you).slice(0, HERO_COUNT),
  )

  // Main list: gated by acceptance unless pressing leverage, filtered by intent chips, sorted by
  // your-fit, excluding whatever's already in the hero so a deal never shows twice.
  const ranked = computed<TradeOpportunity[]>(() => {
    const heroIds = new Set(hero.value.map((o) => o.id))
    const intents = activeIntents.value
    return [...all.value]
      .filter((o) => (pressLeverage.value || o.fit.them >= ACCEPT_BAR))
      .filter((o) => !intents.size || o.intents.some((i) => intents.has(i)))
      .filter((o) => !heroIds.has(o.id))
      .sort((a, b) => b.fit.you - a.fit.you)
  })

  return { all, hero, ranked, lens, activeIntents, pressLeverage, toggleIntent }
}
