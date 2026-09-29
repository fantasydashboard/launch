/**
 * Why the Today page can or cannot put a number beside a player.
 *
 * WHY A STATE AND NOT A BOOLEAN. It was two booleans — `canValue` and `valuesUnsupported` — and
 * everything that was not "unsupported" fell through to the words "still reading tonight's
 * values". That sentence is a promise: it says data is on its way. Three different situations
 * produced it, and in two of them nothing was loading and nothing ever would.
 *
 * useDailyLineup's own comment records the first time this bit someone: "universe permanently
 * 'still reading'. Nothing was loading; there was nothing to load." The fix then was to add
 * `valuesUnsupported` for the one case they had found. This names the rest of them, so a page
 * that cannot price a league says so instead of spinning at the reader forever.
 *
 * The same principle as WeekSchedule.failed: an empty result and a broken one are different
 * facts, and only one of them is the reader's to wait out.
 */
export type ValueState =
  /** Numbers are real and can be shown. */
  | 'ready'
  /** A source is genuinely in flight. "Still reading" is honest here and nowhere else. */
  | 'loading'
  /** No source exists that could ever price this league — a fact about us, not about tonight. */
  | 'unsupported'
  /** Everything finished and produced nothing. A dead end, and the reader should be told. */
  | 'none'

export function valueState(input: {
  /** No pricing source serves this league and platform combination. */
  unsupported: boolean
  /** At least one value source is still fetching. */
  loading: boolean
  /** The value map came back with something in it. */
  hasValues: boolean
}): ValueState {
  /* Unsupported first: a league nothing can price should never be described as loading, however
     many other fetches happen to be in flight for it. */
  if (input.unsupported) return 'unsupported'
  if (input.hasValues) return 'ready'
  if (input.loading) return 'loading'
  return 'none'
}
