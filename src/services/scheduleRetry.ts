/**
 * Read a slate, and read it again if the read failed.
 *
 * Today reads tonight's schedule twice: the lineup board through useDailyLineup, which already
 * retried, and the page's own banner through useToday, which did not. One blip on the second
 * read put "we couldn't read tonight's NHL schedule" above a matchup that was showing tonight's
 * games correctly — the page contradicting itself, and blaming us for a problem that had
 * already gone away. Same backoff as useDailyLineup, so the two reads give up together.
 */
export const SCHEDULE_RETRY_MS = [700, 1800]

export async function readSlateWithRetry<T extends { failed?: boolean }>(
  read: () => Promise<T>,
  delays: number[] = SCHEDULE_RETRY_MS,
  sleep: (ms: number) => Promise<unknown> = (ms) => new Promise((r) => setTimeout(r, ms)),
): Promise<T> {
  let slate = await read()
  for (const ms of delays) {
    if (!slate.failed) break
    await sleep(ms)
    slate = await read()
  }
  return slate
}
