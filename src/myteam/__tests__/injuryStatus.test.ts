import { describe, it, expect } from 'vitest'
import { injuryTier, injuryDiscount, missesNextGame, OUT_DISCOUNT } from '@/myteam/injuryStatus'

describe('injuryTier', () => {
  it('maps Yahoo IL/reserve codes to il', () => {
    for (const s of ['IL10', 'IL15', 'IL60', 'NA', 'DL', 'SUSP', 'PUP', 'IR']) {
      expect(injuryTier(s)).toBe('il')
    }
  })
  it('maps ESPN IL/out codes to il', () => {
    for (const s of ['TEN_DAY_DL', 'SIXTY_DAY_DL']) {
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

describe('out is not IL', () => {
  /*
   * The bug: Brock Bowers carried Sleeper's "Out" tag, which bucketed with IL. That halved his
   * rest-of-season points AND barred assignSlots from seating him, so trading two bench bodies
   * for an elite TE reported "+0 · your starting lineup does not improve" with no slot moves
   * at all. An Out tag resets every Wednesday; it must not price a season-ending injury.
   */
  it('reads a weekly Out designation as its own tier', () => {
    for (const s of ['Out', 'OUT', 'O', 'out']) expect(injuryTier(s)).toBe('out')
  })

  it('keeps the genuinely multi-week codes on IL, which is where they belong', () => {
    for (const s of ['IR', 'PUP', 'NA', 'SUSP', 'IL60', 'SIXTY_DAY_DL']) {
      expect(injuryTier(s)).toBe('il')
    }
  })

  it('charges one game, not half a season', () => {
    expect(injuryDiscount('out')).toBe(OUT_DISCOUNT)
    expect(injuryDiscount('out')).toBeGreaterThan(injuryDiscount('il'))
    // Still a haircut — he is definitely missing the next one.
    expect(injuryDiscount('out')).toBeLessThan(1)
  })

  it('still counts as unavailable where the question is about the next game', () => {
    expect(missesNextGame('out')).toBe(true)
    expect(missesNextGame('il')).toBe(true)
    expect(missesNextGame('dtd')).toBe(false)
    expect(missesNextGame('healthy')).toBe(false)
  })

  it('a reserve-slot flag still overrides the string', () => {
    expect(injuryTier('Out', true)).toBe('il')
  })
})
