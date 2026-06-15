import type { TradeOpportunity } from './opportunities'

/**
 * A partner-framed negotiation opener built from the merged facts. It leads with THEIR angle (the
 * hole or category your give addresses for them), then states the ask and what the return does for
 * you. Templated — instant and honest; an LLM "polish" can come later as an on-demand action.
 */
export function buildPitch(o: TradeOpportunity): string {
  const give = o.give.map((s) => s.name).join(' + ')
  const get = o.get.map((s) => s.name).join(' + ')
  const helps = o.give.length > 1 ? 'help' : 'helps'

  // Their angle — lead with the hole or need your give addresses for them.
  let lead: string
  if (o.them.fillsPos) {
    const also = o.them.fillsCats.length ? ` and ${helps} their ${o.them.fillsCats[0]}` : ''
    lead = `${o.partner} is thin at ${o.them.fillsPos} — ${give} ${helps} there${also}.`
  } else if (o.them.fillsCats.length) {
    lead = `${o.partner} is chasing ${o.them.fillsCats[0]} — ${give} ${helps} there.`
  } else {
    lead = `${o.partner} would take ${give} for the depth.`
  }

  // Your angle — what the return does for you.
  const yourGain = o.you.fillsPos
    ? `, who fills your ${o.you.fillsPos}`
    : o.you.fillsCats.length
      ? `, for the ${o.you.fillsCats[0]} you need`
      : ''
  return `${lead} Offer ${give} for ${get}${yourGain}.`
}
