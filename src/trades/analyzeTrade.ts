import { evalDeal } from './deals'
import type { TradeEngine } from './engine'

// Mirror the generator's constants so a custom deal is judged on the same scale.
const NEED_FLOOR = 0.25
const EVEN_BAND = 12
// A category you genuinely need (hump need at/above the landscape DEMAND threshold).
const NEED_MIN = 0.5

export type AnalyzeClass = 'winWin' | 'leverage' | 'fleece' | 'badForYou'
export type Accept = 'likely' | 'maybe' | 'unlikely'

export interface TradeAnalysis {
  klass: AnalyzeClass
  headline: string
  accept: Accept
  yourGain: number
  theirGain: number
  getVal: number
  giveVal: number
  valueGap: number // getVal - giveVal (+ you gain value)
  helps: string[] // categories you net
  costs: string[] // categories it costs you (analyzer-only — the generator never gives these up)
  pitch: string[] // what it gives THEM (their need your give fills)
  warnings: string[] // the critique: overpay / selling-low / shipping-a-need / buying-high
}

/**
 * Evaluate an ARBITRARY proposed trade (any N-for-M between your team and one partner) and
 * return an honest, category-aware verdict. Unlike the generator, it judges bad deals too —
 * overpay, selling low, shipping a needed player, "they won't accept" — in standings terms.
 */
export function analyzeTrade(
  engine: TradeEngine,
  opts: { myKey: string; partnerKey: string; giveKeys: string[]; getKeys: string[]; labelOf: (s: string) => string },
): TradeAnalysis | null {
  const { statIds, valueByKey, strengthByKey, timingByKey, landscape } = engine
  const { myKey, partnerKey, giveKeys, getKeys, labelOf } = opts
  if (!giveKeys.length || !getKeys.length) return null

  const needOf = (teamKey: string, floor: boolean): Record<string, number> => {
    const m = landscape.get(teamKey)
    const out: Record<string, number> = {}
    for (const c of statIds) out[c] = floor ? Math.max(NEED_FLOOR, m?.get(c)?.need ?? 0) : m?.get(c)?.need ?? 0
    return out
  }
  const myNeed = needOf(myKey, true)
  const myRawNeed = needOf(myKey, false)
  const theirNeed = needOf(partnerKey, true)
  const theirRawNeed = needOf(partnerKey, false)

  const combine = (keys: string[]): Record<string, number> => {
    const out: Record<string, number> = {}
    for (const k of keys) {
      const s = strengthByKey.get(k) ?? {}
      for (const c of statIds) out[c] = (out[c] ?? 0) + (s[c] ?? 0)
    }
    return out
  }
  const getStr = combine(getKeys)
  const giveStr = combine(giveKeys)
  const getVal = getKeys.reduce((t, k) => t + (valueByKey.get(k) ?? 0), 0)
  const giveVal = giveKeys.reduce((t, k) => t + (valueByKey.get(k) ?? 0), 0)
  const valueGap = Math.round(getVal - giveVal)

  const ev = evalDeal(getStr, giveStr, myNeed, theirNeed, statIds)

  // Need-weighted category ranking. helps = where get > give; costs = where give > get.
  const net: Record<string, number> = {}
  for (const c of statIds) net[c] = (getStr[c] ?? 0) - (giveStr[c] ?? 0)
  const top = (weight: Record<string, number>, vec: Record<string, number>): string[] =>
    statIds
      .map((c) => ({ c, g: (weight[c] ?? 0) * (vec[c] ?? 0) }))
      .filter((x) => x.g > 0.01)
      .sort((a, b) => b.g - a.g)
      .slice(0, 3)
      .map((x) => labelOf(x.c))
  const negNet: Record<string, number> = {}
  for (const c of statIds) negNet[c] = -net[c]
  const helps = top(myRawNeed, net)
  const costs = top(myRawNeed, negNet)
  const pitch = top(theirRawNeed, giveStr)

  // The critique.
  const warnings: string[] = []
  for (const c of statIds) {
    if ((myRawNeed[c] ?? 0) >= NEED_MIN && (giveStr[c] ?? 0) >= 0.5 && net[c] < 0) {
      warnings.push(`You're shipping ${labelOf(c)} help — a category you need`)
      break
    }
  }
  if (giveKeys.some((k) => timingByKey.get(k)?.dir === 'buy')) warnings.push('You’re selling a buy-low low — a rebound is coming')
  if (getKeys.some((k) => timingByKey.get(k)?.dir === 'sell')) warnings.push('You’re buying a sell-high high — due to cool off')

  let klass: AnalyzeClass
  let headline: string
  let accept: Accept
  if (ev.yourGain <= 0) {
    klass = 'badForYou'
    headline = valueGap < -EVEN_BAND ? `Pass — you'd overpay ~${-valueGap} and it doesn't help your standings` : `Pass — this doesn't improve your standings`
    accept = ev.theirGain > 0 ? 'likely' : 'unlikely'
  } else if (ev.theirGain <= 0) {
    klass = 'fleece'
    headline = 'Great for you — but they have little reason to accept. Sweeten it.'
    accept = 'unlikely'
  } else if (ev.klass === 'leverage') {
    klass = 'leverage'
    headline = valueGap >= 0 ? 'Lopsided your way — worth asking; they may counter' : `In your favor on need, but you give ~${-valueGap} value — they may counter`
    accept = 'maybe'
  } else {
    klass = 'winWin'
    headline = 'Solid — both teams improve'
    accept = 'likely'
  }
  if (klass !== 'badForYou' && valueGap < -EVEN_BAND && !headline.includes('value')) {
    warnings.unshift(`You give ~${-valueGap} more value than you get`)
  }

  return {
    klass,
    headline,
    accept,
    yourGain: ev.yourGain,
    theirGain: ev.theirGain,
    getVal: Math.round(getVal),
    giveVal: Math.round(giveVal),
    valueGap,
    helps,
    costs,
    pitch,
    warnings,
  }
}
