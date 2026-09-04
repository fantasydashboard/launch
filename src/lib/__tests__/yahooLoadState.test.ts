import { describe, it, expect } from 'vitest'
import { errorMessageOf, summarizeYahooLoad } from '../yahooLoadState'

import { YAHOO_UNAVAILABLE_MESSAGE } from '@/lib/yahooStatus'
/* One source of truth — the copy lives beside the flag that turns Yahoo back on, so a
   reworded message cannot leave this test asserting a string nothing produces. */
const UNAVAILABLE = YAHOO_UNAVAILABLE_MESSAGE

describe('errorMessageOf', () => {
  it('prefers an Error message', () => {
    expect(errorMessageOf(new Error(UNAVAILABLE))).toBe(UNAVAILABLE)
  })

  it('accepts a plain string', () => {
    expect(errorMessageOf('boom')).toBe('boom')
  })

  it('falls back for shapeless values', () => {
    expect(errorMessageOf(null)).toBe('Yahoo could not be reached.')
    expect(errorMessageOf({})).toBe('Yahoo could not be reached.')
  })
})

describe('summarizeYahooLoad', () => {
  it('ok when any sport returned leagues', () => {
    const out = summarizeYahooLoad([
      { status: 'rejected', reason: new Error(UNAVAILABLE) },
      { status: 'fulfilled', value: [{ league_key: 'a' }] },
    ])
    expect(out.kind).toBe('ok')
  })

  it('unavailable when every sport failed — this is the 403 case', () => {
    const out = summarizeYahooLoad([
      { status: 'rejected', reason: new Error(UNAVAILABLE) },
      { status: 'rejected', reason: new Error(UNAVAILABLE) },
      { status: 'rejected', reason: new Error(UNAVAILABLE) },
      { status: 'rejected', reason: new Error(UNAVAILABLE) },
    ])
    expect(out.kind).toBe('unavailable')
    expect(out.kind === 'unavailable' && out.message).toBe(UNAVAILABLE)
  })

  it('empty when calls succeeded but the user genuinely has no leagues', () => {
    const out = summarizeYahooLoad([
      { status: 'fulfilled', value: [] },
      { status: 'fulfilled', value: [] },
    ])
    expect(out.kind).toBe('empty')
  })

  it('empty — not unavailable — when some succeeded and others failed with none found', () => {
    // A partial failure must not claim Yahoo is down; the reachable sports answered.
    const out = summarizeYahooLoad([
      { status: 'fulfilled', value: [] },
      { status: 'rejected', reason: new Error(UNAVAILABLE) },
    ])
    expect(out.kind).toBe('empty')
  })

  it('empty on no results at all rather than asserting an outage', () => {
    expect(summarizeYahooLoad([]).kind).toBe('empty')
  })
})
