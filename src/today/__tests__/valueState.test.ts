import { describe, it, expect } from 'vitest'
import { valueState } from '../valueState'

const s = (o: Partial<Parameters<typeof valueState>[0]>) =>
  valueState({ unsupported: false, loading: false, hasValues: false, ...o })

describe('valueState', () => {
  it('is ready once there are values', () => expect(s({ hasValues: true })).toBe('ready'))

  it('is loading while a source is in flight and nothing has arrived', () =>
    expect(s({ loading: true })).toBe('loading'))

  it('is unsupported when nothing can ever price the league', () =>
    expect(s({ unsupported: true })).toBe('unsupported'))

  /*
   * THE STATE THAT DID NOT EXIST. Everything settled and produced nothing — which the page used
   * to render as "still reading tonight's values", a promise of data that was never coming.
   */
  it('is none when everything finished and produced nothing', () =>
    expect(s({})).toBe('none'))

  /* An unsupported league is not "loading" however many unrelated fetches are in flight — that
     is precisely the spinner-forever this type exists to prevent. */
  it('reports unsupported even while other fetches are running', () =>
    expect(s({ unsupported: true, loading: true })).toBe('unsupported'))

  it('prefers real values over a still-running fetch', () =>
    expect(s({ loading: true, hasValues: true })).toBe('ready'))

  it('never calls an unsupported league ready, even with stale values present', () =>
    expect(s({ unsupported: true, hasValues: true })).toBe('unsupported'))
})
