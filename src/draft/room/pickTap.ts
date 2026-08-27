/**
 * Should this tap on the board be recorded as a pick, or is it the second half
 * of an accidental double-tap?
 *
 * The hazard, precisely: on the default board (`showDrafted === false`) a row is
 * REMOVED the instant its player is picked, and every row below shifts up. Vue's
 * DOM patch runs in a microtask, which drains BETWEEN two discrete click events,
 * so the second click of a fast double-tap lands on a `<button>` that has already
 * re-rendered with a different row's data. It records a player the user never
 * aimed at, and because it also advances the pick log a slot, it misattributes
 * the seat as well.
 *
 * Two rules were tried and both were wrong:
 *
 *   • A flat time window dropped ANY second tap inside 350ms. In local mode the
 *     user enters every team's pick, so fast taps on different players are the
 *     normal workflow — this capped entry at roughly three a second and gave no
 *     feedback when it swallowed one. Somebody transcribing a known pick list
 *     loses taps and never finds out.
 *
 *   • Keying on `playerKey` guarded the wrong case entirely. Because the row is
 *     removed on pick, the second click carries a DIFFERENT key and sails
 *     straight through — exactly the tap that needed stopping. The same-key case
 *     it did catch is only reachable with `showDrafted === true`, where the
 *     template's own `!r.takenAt` check already blocks it.
 *
 * What actually separates the two cases is neither the player nor the elapsed
 * time: it is WHERE THE CLICK LANDED. An accidental double-tap is two clicks at
 * essentially the same screen position. Deliberate fast entry is clicks at
 * different positions, because the user has to move to the row they want. So a
 * tap is dropped only when it is both inside the window AND within a few pixels
 * of the last accepted pick.
 */

export interface PickTap {
  /**
   * Viewport coordinates of the click, or null when the activation did not come
   * from a pointer at all — see `acceptPickTap` for why null means "accept".
   */
  x: number | null
  y: number | null
  /** Epoch ms. Passed in rather than read, so this module has no clock. */
  t: number
}

/**
 * Long enough to cover a real double-tap (browser double-click thresholds sit
 * around 500ms, but the dangerous re-render window here is one microtask plus
 * paint) and short enough that it cannot bracket two considered picks.
 */
export const PICK_TAP_WINDOW_MS = 350

/**
 * Chosen against the row box, not plucked from the air. A board row is ~44px
 * tall (`py-2` around a `h-7` avatar), so the nearest DIFFERENT row a user could
 * deliberately aim at is ~44px away centre-to-centre and ~22px away at the very
 * worst — a tap right on the shared edge of two rows. Staying under that keeps
 * every deliberate pick reachable. Above it sits real double-tap jitter, which
 * is 0-3px for a mouse and roughly 5-12px for a finger lifted and replaced "in
 * the same spot". 14px clears both.
 */
export const PICK_TAP_RADIUS_PX = 14

/**
 * True to record the pick, false to drop it as a double-tap.
 *
 * DEFAULTS TO ACCEPTING whenever it cannot prove the tap was a repeat, and every
 * ambiguous branch below is deliberately on that side. Dropping a pick the user
 * meant is silent and near-invisible — nothing on screen would flag it, and Undo
 * only helps someone who noticed — whereas letting a genuine double-tap through
 * produces a visibly wrong pick log that Undo fixes directly. Silent wrong beats
 * loud wrong is the wrong trade for a rehearsal tool.
 */
export function acceptPickTap(
  prev: PickTap | null | undefined,
  next: PickTap,
  windowMs: number = PICK_TAP_WINDOW_MS,
  radiusPx: number = PICK_TAP_RADIUS_PX,
): boolean {
  if (!prev) return true

  const dt = next.t - prev.t
  /* `dt < 0` guards a clock that went backwards (NTP correction, or a test
     feeding times out of order). Outside the window either way: accept. */
  if (!(dt >= 0 && dt < windowMs)) return true

  /* No coordinates on either tap means this was not a pointer click at all: a
     keyboard activation of the focused button (Enter/Space reports `detail: 0`
     and `clientX/clientY` of 0), or a programmatic `.click()`. There is no
     "same spot" hazard there — keyboard activation follows focus through the
     DOM rather than leaving a cursor parked over whatever slides underneath —
     and treating two keyboard picks as a double-tap would make the board
     unusable without a mouse. Accept, explicitly. */
  if (prev.x === null || prev.y === null || next.x === null || next.y === null) return true

  const dx = next.x - prev.x
  const dy = next.y - prev.y
  /* Euclidean, not per-axis: the rows shift vertically, so a per-axis check
     would have to treat dx and dy differently and would let a diagonal slip. */
  return Math.hypot(dx, dy) > radiusPx
}
