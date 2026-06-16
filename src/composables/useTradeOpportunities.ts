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

// Tuning dials — surfaced as named constants so they can be adjusted after a screenshot pass.
const HERO_COUNT = 3
const HURT_THRESHOLD = 0.15 // min need-weighted loss to surface as a "cost"
const POS_EDGE = 0.5
// The list shows every distinct positive-gain move — no length cap, no type tabs. The ONLY curation
// is a light de-dup so the same surplus body shopped to ten partners collapses to its best couple of
// fits, instead of becoming a repetitive wall.
const GIVE_CAP = 2 // max cards any one give player appears in (the same-player de-dup)
// A GET below this cross-value isn't a real rosterable upgrade — it can't "fill" a hole. Buy-lows
// are exempt: their depressed current value is the whole point (rebound coming).
const GET_FLOOR = 45
const MIN_GAIN = 0.05 // only surface deals that actually improve your weekly category wins

const maxGetVal = (o: { get: { value: number }[] }) => Math.max(0, ...o.get.map((s) => s.value))

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
  pressLeverage: Ref<boolean>
} {
  const pressLeverage = ref(false)

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
    const built = buildOpportunities(raws.value, {
      myKey,
      statIds: inputs.statIds.value,
      strengthByKey: eng.strengthByKey,
      catLandscape: eng.landscape,
      posLandscape: pl,
      myThin: myThin.value,
      hurtThreshold: HURT_THRESHOLD,
      labelOf: inputs.labelOf,
      cats: eng.cats,
      teamCatTotals: eng.teamCatTotals,
      projByKey: eng.projByKey,
    })
    // Stakes floor: a sub-floor GET is a scrub, not a fill — unless it's a buy-low (depressed on
    // purpose). Keeps "FILLS YOUR UTIL → Kazuma Okamoto (15)" type noise out.
    return built.filter((o) => o.intents.includes('buyLow') || maxGetVal(o) >= GET_FLOOR)
  })

  // Hero = your top DISTINCT moves by standings gain (deltaYou), excluding lopsided 'steal' deals,
  // with no two heroes sharing a filled position (headline), partner, or give player.
  const hero = computed<TradeOpportunity[]>(() => {
    const sorted = [...all.value].filter((o) => o.standings.partnerRead !== 'steal' && o.standings.deltaYou >= MIN_GAIN).sort((a, b) => b.standings.deltaYou - a.standings.deltaYou)
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

  // Main list: EVERY distinct positive-gain move (no length cap, no type tabs), gated to deals the
  // partner would plausibly accept — OR, under the Steals toggle, the lopsided 'steal' plays. Sorted
  // by your standings gain (deltaYou), hero-excluded. The ONLY curation is a light same-give-player
  // de-dup (GIVE_CAP) so one surplus body shopped to ten partners collapses to its best couple of fits.
  const ranked = computed<TradeOpportunity[]>(() => {
    const heroIds = new Set(hero.value.map((o) => o.id))
    const pool = [...all.value]
      .filter((o) => o.standings.deltaYou >= MIN_GAIN)
      .filter((o) => (pressLeverage.value ? o.standings.partnerRead === 'steal' : o.standings.partnerRead !== 'steal'))
      .filter((o) => !heroIds.has(o.id))
      .sort((a, b) => b.standings.deltaYou - a.standings.deltaYou)

    // Seed the de-dup budget with the give players the hero already shows above, so the list never
    // repeats a give player the hero is leaning on.
    const giveUse = new Map<string, number>()
    for (const o of hero.value) o.give.forEach((s) => giveUse.set(s.playerKey, (giveUse.get(s.playerKey) ?? 0) + 1))
    const out: TradeOpportunity[] = []
    for (const o of pool) {
      if (o.give.some((s) => (giveUse.get(s.playerKey) ?? 0) >= GIVE_CAP)) continue
      out.push(o)
      o.give.forEach((s) => giveUse.set(s.playerKey, (giveUse.get(s.playerKey) ?? 0) + 1))
    }
    return out
  })

  return { all, hero, ranked, pressLeverage }
}
