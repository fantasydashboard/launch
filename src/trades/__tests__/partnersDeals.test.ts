import { describe, it, expect } from 'vitest'
import { rankPartners } from '../partners'
import { evalDeal } from '../deals'
import type { Landscape, CatStanding } from '../landscape'

const st = (rank: number, surplus: number, need: number): CatStanding => ({ rank, surplus, need })

// You: surplus in HR, need in ERA. Mirror has the opposite. Rival shares your shape.
const landscape: Landscape = new Map([
  ['you', new Map([['HR', st(1, 0.9, 0)], ['ERA', st(11, 0, 0.9)]])],
  ['mirror', new Map([['HR', st(11, 0, 0.9)], ['ERA', st(1, 0.9, 0)]])],
  ['rival', new Map([['HR', st(2, 0.8, 0)], ['ERA', st(10, 0, 0.8)]])],
])

describe('rankPartners', () => {
  it('ranks the mirror team (opposite shape) above a same-shape rival', () => {
    const ranked = rankPartners(landscape, 'you', ['HR', 'ERA'])
    expect(ranked[0].teamId).toBe('mirror')
    expect(ranked.find((p) => p.teamId === 'rival')!.score).toBeLessThan(ranked[0].score)
  })
  it('never ranks yourself as a partner', () => {
    expect(rankPartners(landscape, 'you', ['HR', 'ERA']).some((p) => p.teamId === 'you')).toBe(false)
  })
})

describe('evalDeal — need-weighted, not raw value', () => {
  const cats = ['HR', 'ERA']
  // You're 1st in HR (need 0), 11th in ERA (need 0.9). They're the mirror.
  const myNeed = { HR: 0, ERA: 0.9 }
  const theirNeed = { HR: 0.9, ERA: 0 }
  // ERA strength is direction-normalized (higher = better ERA).
  const eraArm = { HR: 0, ERA: 2 } // the ace you'd GET
  const slugger = { HR: 2, ERA: 0 } // the bat you'd GIVE (from your HR surplus)

  it('giving from a category you do not need costs ~0 -> both sides win', () => {
    const d = evalDeal(eraArm, slugger, myNeed, theirNeed, cats)
    expect(d.yourGain).toBeGreaterThan(0) // you gain ERA you badly need
    expect(d.theirGain).toBeGreaterThan(0) // they gain HR they badly need
    expect(d.klass).toBe('winWin')
  })

  it('flags a fleece when the counterparty gains nothing', () => {
    // They have no need for what you give (HR need 0 for them here).
    const d = evalDeal(eraArm, slugger, myNeed, { HR: 0, ERA: 0 }, cats)
    expect(d.theirGain).toBeLessThanOrEqual(0)
    expect(d.klass).toBe('fleece')
  })

  it('flags leverage when you gain far more than they do', () => {
    // They need HR only weakly; you need ERA strongly -> your gain >> theirs.
    const d = evalDeal(eraArm, slugger, myNeed, { HR: 0.2, ERA: 0 }, cats)
    expect(d.yourGain).toBeGreaterThan(d.theirGain)
    expect(d.klass).toBe('leverage')
  })
})
