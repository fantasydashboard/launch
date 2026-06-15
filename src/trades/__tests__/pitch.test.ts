import { describe, it, expect } from 'vitest'
import { buildPitch } from '../pitch'
import type { TradeOpportunity } from '../opportunities'

const opp = (over: Partial<TradeOpportunity> = {}): TradeOpportunity => ({
  id: 'x', partnerKey: 'them', partner: 'Chaplao',
  get: [{ playerKey: 'g', name: 'Ernie Clement', pos: '3B', value: 79, eligible: ['3B'] }],
  give: [{ playerKey: 'v', name: 'Jung Hoo Lee', pos: 'OF', value: 65, eligible: ['OF'] }],
  intents: ['winWin'], headline: 'Fills your 3B',
  you: { fillsPos: '3B', fillsCats: ['HR'], hurtsCats: [] },
  them: { fillsPos: 'OF', fillsCats: ['FPCT'], hurtsCats: [] },
  fit: { you: 0.8, them: 0.6 }, pitch: '', ...over,
})

describe('buildPitch', () => {
  it('leads with the partner angle and names the give + ask', () => {
    const p = buildPitch(opp())
    expect(p).toContain('Chaplao')
    expect(p).toContain('OF') // their hole the give fills
    expect(p).toContain('Jung Hoo Lee') // the give
    expect(p).toContain('Ernie Clement') // the ask
    expect(p).toContain('3B') // what it fills for you
  })

  it('degrades gracefully when the partner fills no position (category-only)', () => {
    const p = buildPitch(opp({ them: { fillsPos: undefined, fillsCats: ['SV'], hurtsCats: [] } }))
    expect(p).toContain('SV')
    expect(p).not.toContain('thin at  ') // no dangling "thin at" with no slot
    expect(p).not.toContain('thin at .')
  })

  it('handles a multi-player give (2-for-1) with plural phrasing', () => {
    const p = buildPitch(opp({
      give: [
        { playerKey: 'a', name: 'Taj Bradley', pos: 'SP', value: 42, eligible: ['SP'] },
        { playerKey: 'b', name: 'Willy Adames', pos: 'SS', value: 60, eligible: ['SS'] },
      ],
    }))
    expect(p).toContain('Taj Bradley')
    expect(p).toContain('Willy Adames')
  })
})
