import { describe, it, expect } from 'vitest'
import { injuryTier, injuryDiscount } from '@/myteam/injuryStatus'

describe('injuryTier', () => {
  it('maps Yahoo IL/reserve codes to il', () => {
    for (const s of ['IL10', 'IL15', 'IL60', 'NA', 'DL', 'O', 'SUSP', 'PUP']) {
      expect(injuryTier(s)).toBe('il')
    }
  })
  it('maps ESPN IL/out codes to il', () => {
    for (const s of ['OUT', 'TEN_DAY_DL', 'SIXTY_DAY_DL']) {
      expect(injuryTier(s)).toBe('il')
    }
  })
  it('maps day-to-day / questionable codes to dtd', () => {
    for (const s of ['DTD', 'DAY_TO_DAY', 'GTD', 'Q', 'QUESTIONABLE', 'DOUBTFUL']) {
      expect(injuryTier(s)).toBe('dtd')
    }
  })
  it('treats empty / ACTIVE / unknown as healthy', () => {
    expect(injuryTier('')).toBe('healthy')
    expect(injuryTier(undefined)).toBe('healthy')
    expect(injuryTier(null)).toBe('healthy')
    expect(injuryTier('ACTIVE')).toBe('healthy')
    expect(injuryTier('SOMENEWCODE')).toBe('healthy')
  })
  it('onIL flag forces il even with an empty status string', () => {
    expect(injuryTier('', true)).toBe('il')
    expect(injuryTier(undefined, true)).toBe('il')
  })
  it('is case-insensitive', () => {
    expect(injuryTier('il60')).toBe('il')
    expect(injuryTier('dtd')).toBe('dtd')
  })
})

describe('injuryDiscount', () => {
  it('returns the tunable multipliers', () => {
    expect(injuryDiscount('healthy')).toBe(1)
    expect(injuryDiscount('dtd')).toBe(0.9)
    expect(injuryDiscount('il')).toBe(0.5)
  })
})
