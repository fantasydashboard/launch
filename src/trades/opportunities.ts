import { computeFit, type FitPair, type FitWeights } from './fitScore'
import { coversSlot, type PositionalLandscape } from './positionalLandscape'
import { buildPitch } from './pitch'
import type { Landscape } from './landscape'
import { tradeStandingsDelta, expectedCatsWon, classifyPartnerRead, type CatRankMove, type PartnerRead, type TeamCategoryTotals } from './standings'
import type { CatSpec } from '@/myteam/value'

export type Intent = 'winWin' | 'steal' | 'consolidate' | 'buyLow' | 'sellHigh'

export interface OppSide {
  playerKey: string
  name: string
  pos: string
  value: number
  headshot?: string
  proLogo?: string
  eligible: string[]
}
export interface SideEffect {
  fillsPos?: string // position hole this plugs for this team
  fillsCats: string[] // category needs this helps for this team (need-weighted, top few)
  hurtsCats: string[] // categories this costs this team — thresholded (material losses only)
}

export interface StandingsImpact {
  ecwYouBefore: number
  ecwYouAfter: number
  ecwThemBefore: number
  ecwThemAfter: number
  deltaYou: number
  deltaThem: number
  partnerRead: PartnerRead
  ladder: CatRankMove[]
}

export interface TradeOpportunity {
  id: string
  partnerKey: string
  partner: string
  partnerLogo?: string
  get: OppSide[]
  give: OppSide[]
  intents: Intent[]
  headline: string
  you: SideEffect
  them: SideEffect
  fit: FitPair
  standings: StandingsImpact
  pitch: string // filled in Phase 3; '' until then
}

export interface RawDeal {
  partnerKey: string
  partner: string
  partnerLogo?: string
  get: OppSide[]
  give: OppSide[]
  intents: Intent[]
}

export interface OppContext {
  myKey: string
  statIds: string[]
  strengthByKey: Map<string, Record<string, number>>
  valueByKey: Map<string, number>
  catLandscape: Landscape
  posLandscape: PositionalLandscape
  myThin: string[]
  weights: FitWeights
  hurtThreshold: number
  labelOf: (statId: string) => string
  cats: CatSpec[]
  teamCatTotals: TeamCategoryTotals[]
  projByKey: Map<string, Record<string, number>>
}

const POS_EDGE = 0.5

const needMap = (ls: Landscape, team: string, statIds: string[]): Record<string, number> => {
  const cl = ls.get(team)
  const out: Record<string, number> = {}
  for (const c of statIds) out[c] = cl?.get(c)?.need ?? 0
  return out
}
const sumStr = (sides: OppSide[], sb: Map<string, Record<string, number>>, statIds: string[]): Record<string, number> => {
  const out: Record<string, number> = {}
  for (const s of sides) {
    const st = sb.get(s.playerKey) ?? {}
    for (const c of statIds) out[c] = (out[c] ?? 0) + (st[c] ?? 0)
  }
  return out
}
const sumVal = (sides: OppSide[], vb: Map<string, number>): number =>
  sides.reduce((s, x) => s + (vb.get(x.playerKey) ?? 0), 0)

// A category only matters to a side if they NEED it — "winning a category by a mile scores nothing".
// So gain/cost speak only in needed cats: gain = needs you improve, cost = needs you'd worsen.
// Losing a category you dominate isn't a cost, it's spending dead value (the point of a trade).
const NEED_SHOW = 0.25
// Categories a side gains (need-weighted positive delta) and loses (negative beyond threshold).
const catEffect = (
  getStr: Record<string, number>,
  giveStr: Record<string, number>,
  need: Record<string, number>,
  statIds: string[],
  labelOf: (s: string) => string,
  hurtThr: number,
): { gain: string[]; lose: string[] } => {
  const gain: { c: string; v: number }[] = []
  const lose: { c: string; v: number }[] = []
  for (const c of statIds) {
    if ((need[c] ?? 0) < NEED_SHOW) continue // only categories this side actually needs
    const delta = ((getStr[c] ?? 0) - (giveStr[c] ?? 0)) * (need[c] ?? 0)
    if (delta > 0.01) gain.push({ c, v: delta })
    else if (delta < -hurtThr) lose.push({ c, v: -delta })
  }
  gain.sort((a, b) => b.v - a.v)
  lose.sort((a, b) => b.v - a.v)
  return { gain: gain.slice(0, 3).map((x) => labelOf(x.c)), lose: lose.slice(0, 2).map((x) => labelOf(x.c)) }
}

const thinPositionsOf = (pl: PositionalLandscape, team: string): string[] => {
  const m = pl.get(team)
  if (!m) return []
  return [...m.entries()].filter(([, st]) => st.need >= POS_EDGE).map(([pos]) => pos)
}
// First thin slot any of these players covers (the hole they plug for that side).
const fillsPosFor = (sides: OppSide[], thin: string[]): string | undefined => {
  for (const t of thin) for (const s of sides) if (coversSlot(s.eligible, t)) return t
  return undefined
}
const posNeedAt = (pl: PositionalLandscape, team: string, pos?: string): number =>
  pos ? pl.get(team)?.get(pos)?.need ?? 0 : 0

const headlineOf = (you: SideEffect, them: SideEffect, intents: Intent[], s: StandingsImpact): string => {
  const ecw = `wins ${s.ecwYouBefore.toFixed(1)} → ${s.ecwYouAfter.toFixed(1)} cats/week`
  let what = ''
  if (you.fillsPos) what = `fills your ${you.fillsPos}`
  else if (intents.includes('steal') && them.fillsPos) what = `press their ${them.fillsPos} hole`
  else if (you.fillsCats.length) what = `adds ${you.fillsCats[0]}`
  else if (intents.includes('buyLow')) what = 'buy-low window'
  return what ? `${ecw} · ${what}` : ecw
}

const ecwOf = (teamId: string, ctx: OppContext): number =>
  expectedCatsWon(teamId, ctx.teamCatTotals, ctx.cats)

const standingsOf = (d: RawDeal, ctx: OppContext): StandingsImpact => {
  const giveKeys = d.give.map((s) => s.playerKey)
  const getKeys = d.get.map((s) => s.playerKey)
  const delta = tradeStandingsDelta(
    ctx.teamCatTotals, ctx.projByKey, ctx.cats, ctx.myKey, d.partnerKey, giveKeys, getKeys,
  )
  const ecwYouBefore = ecwOf(ctx.myKey, ctx)
  const ecwThemBefore = ecwOf(d.partnerKey, ctx)
  return {
    ecwYouBefore,
    ecwYouAfter: ecwYouBefore + delta.you,
    ecwThemBefore,
    ecwThemAfter: ecwThemBefore + delta.them,
    deltaYou: delta.you,
    deltaThem: delta.them,
    partnerRead: classifyPartnerRead(delta.them),
    ladder: delta.ladder,
  }
}

const idOf = (d: RawDeal): string =>
  `${d.partnerKey}|${d.get.map((s) => s.playerKey).sort().join(',')}|${d.give.map((s) => s.playerKey).sort().join(',')}`

export function buildOpportunities(raws: RawDeal[], ctx: OppContext): TradeOpportunity[] {
  const myNeed = needMap(ctx.catLandscape, ctx.myKey, ctx.statIds)
  const byId = new Map<string, TradeOpportunity>()
  for (const d of raws) {
    const id = idOf(d)
    const existing = byId.get(id)
    if (existing) {
      // same deal from the other generator — union intents, refresh headline.
      for (const it of d.intents) if (!existing.intents.includes(it)) existing.intents.push(it)
      existing.headline = headlineOf(existing.you, existing.them, existing.intents, existing.standings)
      continue
    }
    const theirNeed = needMap(ctx.catLandscape, d.partnerKey, ctx.statIds)
    const theirThin = thinPositionsOf(ctx.posLandscape, d.partnerKey)
    const getStr = sumStr(d.get, ctx.strengthByKey, ctx.statIds)
    const giveStr = sumStr(d.give, ctx.strengthByKey, ctx.statIds)
    const youCat = catEffect(getStr, giveStr, myNeed, ctx.statIds, ctx.labelOf, ctx.hurtThreshold)
    const themCat = catEffect(giveStr, getStr, theirNeed, ctx.statIds, ctx.labelOf, ctx.hurtThreshold)
    const youFillsPos = fillsPosFor(d.get, ctx.myThin)
    const themFillsPos = fillsPosFor(d.give, theirThin)
    const you: SideEffect = { fillsPos: youFillsPos, fillsCats: youCat.gain, hurtsCats: youCat.lose }
    const them: SideEffect = { fillsPos: themFillsPos, fillsCats: themCat.gain, hurtsCats: themCat.lose }
    const fit = computeFit(
      {
        getStr,
        giveStr,
        myNeed,
        theirNeed,
        statIds: ctx.statIds,
        myPosNeed: posNeedAt(ctx.posLandscape, ctx.myKey, youFillsPos),
        theirPosNeed: posNeedAt(ctx.posLandscape, d.partnerKey, themFillsPos),
        getVal: sumVal(d.get, ctx.valueByKey),
        giveVal: sumVal(d.give, ctx.valueByKey),
      },
      ctx.weights,
    )
    const standings = standingsOf(d, ctx)
    const opp: TradeOpportunity = {
      id,
      partnerKey: d.partnerKey,
      partner: d.partner,
      partnerLogo: d.partnerLogo,
      get: d.get,
      give: d.give,
      intents: [...d.intents],
      headline: headlineOf(you, them, d.intents, standings),
      you,
      them,
      fit,
      standings,
      pitch: '',
    }
    opp.pitch = buildPitch(opp)
    byId.set(id, opp)
  }
  return [...byId.values()]
}
