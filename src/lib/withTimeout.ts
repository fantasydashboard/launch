/**
 * Bounding work that can hang forever.
 *
 * WHY THIS IS SHARED NOW. It lived privately in stores/platforms.ts, where it was written for
 * a stalled Supabase query, and auth.ts then reintroduced the same hazard one function later
 * without it. That cost an admin their access: `supabase.auth.getSession()` stopped settling,
 * the `profiles` query behind it hung with it, `await fetchProfile()` never returned, and the
 * profile stayed null. A null tier reads as 'free', so the account was shown a paywall for a
 * product it owned — and no amount of clearing cookies could help, because nothing was wrong
 * with the cookies.
 *
 * A promise that neither resolves nor rejects is the worst failure shape there is: no error
 * surfaces, no catch fires, and the await simply never comes back. Every call that crosses the
 * network and gates something a user can see should be bounded.
 */

/** Race work against a clock. Rejects with a named error rather than hanging. */
export async function withTimeout<T>(work: PromiseLike<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)),
      ms,
    )
  })
  try {
    return await Promise.race([Promise.resolve(work), timeout])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/**
 * The same, with retries — because a wedged client often recovers on a fresh call.
 *
 * `work` is a FACTORY rather than a promise: retrying means starting the request again, and a
 * promise that has already hung will hang forever no matter how many times it is awaited.
 */
export async function retryWithTimeout<T>(
  work: () => PromiseLike<T>,
  opts: { attempts: number; ms: number; label: string; backoffMs?: number },
): Promise<T> {
  const { attempts, ms, label, backoffMs = 400 } = opts
  let last: unknown
  for (let i = 0; i < Math.max(1, attempts); i++) {
    try {
      return await withTimeout(work(), ms, label)
    } catch (err) {
      last = err
      // No pause after the final attempt — nobody is waiting on it.
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, backoffMs * (i + 1)))
    }
  }
  throw last instanceof Error ? last : new Error(`${label} failed`)
}
