/**
 * An auth lock that cannot hang the app.
 *
 * WHAT WENT WRONG. supabase-js serialises every auth operation behind a Web Lock named
 * `lock:sb-<ref>-auth-token`, so that two tabs cannot refresh the same token at once. The lock
 * is waited on with no timeout. In production a client took it exclusively and never gave it
 * back — a suspended or crashed tab — and `navigator.locks.query()` showed it held by one
 * client with another request pending forever.
 *
 * Everything downstream stopped. `getSession()` never settled, every query behind it hung with
 * it, `await fetchProfile()` never returned, the profile stayed null, and a null tier reads as
 * 'free' — so an admin account was shown a paywall. Clearing cookies could not help: locks are
 * per-origin runtime state and have nothing to do with cookies, which is exactly why the
 * obvious remedy did nothing and the bug looked inexplicable.
 *
 * THE FIX IS TO BOUND THE WAIT, NOT TO REMOVE THE LOCK. Cross-tab serialisation is worth
 * having; waiting for it forever is not. Acquisition gets an AbortSignal, and if the lock
 * cannot be taken in time the work runs unlocked rather than never.
 *
 * WHY RUNNING UNLOCKED IS SAFE HERE. `navigator.locks.request` does not invoke the callback
 * when acquisition is aborted, so the work cannot run twice — once for us and once when the
 * lock is granted late. The worst case is two tabs refreshing a token concurrently, which
 * Supabase tolerates, against a certainty of the app hanging, which it does not.
 */

/** Matches supabase-js's `LockFunc`: (name, acquireTimeout, fn) => Promise<R>. */
export type LockFunc = <R>(name: string, acquireTimeout: number, fn: () => Promise<R>) => Promise<R>

/**
 * @param acquireMs how long to wait for the lock before giving up and proceeding.
 *   Three seconds: long enough for a healthy tab to finish a token refresh, short enough that
 *   a wedged one is not something a user sits through.
 */
export function makeTimeoutLock(acquireMs = 3000): LockFunc {
  return async function lock<R>(name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> {
    const locks = (globalThis as any)?.navigator?.locks
    // No Web Locks API (older Safari, non-browser): there is nothing to serialise against.
    if (!locks?.request) return fn()

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), acquireMs)
    try {
      return await locks.request(name, { mode: 'exclusive', signal: controller.signal }, fn)
    } catch (err) {
      /* Only an abandoned ACQUISITION is recoverable. An error thrown by the work itself, or
         by the locks implementation, is a real failure and must not be retried here — retrying
         would run the work a second time, which is the one thing this must never do. */
      if (controller.signal.aborted) return fn()
      throw err
    } finally {
      clearTimeout(timer)
    }
  }
}
