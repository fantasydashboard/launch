import { describe, it, expect, vi } from 'vitest'
import { withTimeout, retryWithTimeout } from '../withTimeout'

const later = <T>(ms: number, value: T) => new Promise<T>((r) => setTimeout(() => r(value), ms))
const never = <T>() => new Promise<T>(() => {})

describe('withTimeout', () => {
  it('passes through a result that arrives in time', async () => {
    await expect(withTimeout(later(5, 'ok'), 200, 'test')).resolves.toBe('ok')
  })

  it('rejects when the work never settles', async () => {
    await expect(withTimeout(never<string>(), 20, 'profile fetch')).rejects.toThrow(/profile fetch/)
  })

  it('passes a real rejection through untouched', async () => {
    await expect(withTimeout(Promise.reject(new Error('boom')), 200, 'test')).rejects.toThrow('boom')
  })
})

/*
 * The failure this exists for: Supabase's client can wedge — getSession stops settling and
 * every query behind it hangs with it, resolving and rejecting never. An await on that is an
 * await forever, which is how an admin ended up looking like a free user: the profile fetch
 * never returned, the profile stayed null, and a null tier reads as 'free'.
 */
describe('retryWithTimeout', () => {
  it('returns the first successful attempt without retrying', async () => {
    const work = vi.fn(async () => 'first')
    await expect(retryWithTimeout(work, { attempts: 3, ms: 100, label: 'x', backoffMs: 1 })).resolves.toBe('first')
    expect(work).toHaveBeenCalledTimes(1)
  })

  it('retries a hung attempt and succeeds on a later one', async () => {
    let n = 0
    const work = vi.fn(() => (++n === 1 ? never<string>() : Promise.resolve('second')))
    await expect(retryWithTimeout(work, { attempts: 3, ms: 20, label: 'x', backoffMs: 1 })).resolves.toBe('second')
    expect(work).toHaveBeenCalledTimes(2)
  })

  it('gives up after the last attempt rather than hanging forever', async () => {
    const work = vi.fn(() => never<string>())
    await expect(retryWithTimeout(work, { attempts: 2, ms: 15, label: 'profile', backoffMs: 1 }))
      .rejects.toThrow(/profile/)
    expect(work).toHaveBeenCalledTimes(2)
  })

  it('retries a thrown error too, not just a hang', async () => {
    let n = 0
    const work = vi.fn(async () => {
      if (++n === 1) throw new Error('transient')
      return 'recovered'
    })
    await expect(retryWithTimeout(work, { attempts: 2, ms: 100, label: 'x', backoffMs: 1 })).resolves.toBe('recovered')
  })
})
