import { describe, it, expect, vi, afterEach } from 'vitest'
import { makeTimeoutLock } from '../authLock'

const realNav = globalThis.navigator

function installLocks(impl: any) {
  Object.defineProperty(globalThis, 'navigator', {
    value: { ...(realNav ?? {}), locks: impl },
    configurable: true,
    writable: true,
  })
}
afterEach(() => {
  Object.defineProperty(globalThis, 'navigator', { value: realNav, configurable: true, writable: true })
})

describe('makeTimeoutLock', () => {
  it('runs the work under the lock when one can be taken', async () => {
    const request = vi.fn(async (_n: string, _o: any, fn: any) => fn())
    installLocks({ request })
    const lock = makeTimeoutLock(50)
    await expect(lock('x', 0, async () => 'done')).resolves.toBe('done')
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('runs the work anyway where the Web Locks API does not exist', async () => {
    installLocks(undefined)
    await expect(makeTimeoutLock(50)('x', 0, async () => 'done')).resolves.toBe('done')
  })

  /*
   * The failure this exists for, observed in production: another client held
   * `lock:sb-<ref>-auth-token` exclusively and never released it. Every auth call queued
   * behind it forever — getSession never settled, every query behind getSession hung with it,
   * and the profile fetch never returned. A lock that can be waited on indefinitely is a
   * single wedged tab away from taking the whole app down.
   */
  it('gives up waiting and proceeds unlocked', async () => {
    // A lock that is never granted: honours the abort signal and nothing else.
    installLocks({
      request: (_n: string, opts: any) =>
        new Promise((_res, rej) => {
          opts.signal.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError')))
        }),
    })
    const work = vi.fn(async () => 'ran anyway')
    await expect(makeTimeoutLock(20)('x', 0, work)).resolves.toBe('ran anyway')
    expect(work).toHaveBeenCalledTimes(1)
  })

  /*
   * The correctness argument for proceeding: navigator.locks.request never invokes the
   * callback when acquisition is aborted, so running it ourselves cannot run it twice.
   */
  it('runs the work exactly once when acquisition is abandoned', async () => {
    // Faithful to the Web Locks spec: once acquisition is aborted the request is dropped and
    // the callback is NEVER invoked. A fake that ran it anyway would be asserting a property
    // no implementation could satisfy.
    let grant: null | (() => void) = null
    installLocks({
      request: (_n: string, opts: any, fn: any) =>
        new Promise((res, rej) => {
          let aborted = false
          opts.signal.addEventListener('abort', () => {
            aborted = true
            rej(new DOMException('aborted', 'AbortError'))
          })
          grant = (() => { if (!aborted) res(fn()) }) as () => void
        }),
    })
    const work = vi.fn(async () => 'once')
    const result = await makeTimeoutLock(20)('x', 0, work)
    ;(grant as null | (() => void))?.() // granted late: the callback must not fire twice
    await new Promise((r) => setTimeout(r, 30))
    expect(result).toBe('once')
    expect(work).toHaveBeenCalledTimes(1)
  })

  it('passes a genuine lock error through rather than silently retrying', async () => {
    installLocks({ request: async () => { throw new Error('lock exploded') } })
    await expect(makeTimeoutLock(50)('x', 0, async () => 'no')).rejects.toThrow('lock exploded')
  })
})
