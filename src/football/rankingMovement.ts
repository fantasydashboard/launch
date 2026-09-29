/**
 * Week-over-week movement on the rest-of-season board, as a colour rather than a number.
 *
 * WHY NOT PLACES MOVED, WHICH IS THE OBVIOUS ANSWER. Rank places are not a constant unit: they
 * are cheap where the board is dense and dear where it is sparse. Measured across two real
 * snapshots five days apart, the top twenty had a MEDIAN move of one place and not a single
 * player moved more than ten — while in the 101-150 band, fifteen of thirty-five moved more
 * than ten. Colouring on places would therefore have left the part of the board people
 * actually use entirely grey and set fire to the part nobody scrolls to.
 *
 * Relative movement does not rescue it either. A one-place move at rank seven is 14% of his
 * rank and is not news.
 *
 * So movement is measured in the currency that actually moved: his value. A player whose
 * rest-of-season projection gained fifteen points has genuinely changed, at rank four or rank
 * a hundred and four, and the rank he lands on afterwards is a consequence rather than the
 * thing itself.
 *
 * INTENSITY IS SELF-CALIBRATING, ANCHORED AT BOTH ENDS. A fixed threshold would be wrong by
 * November — value changes are large in September, when three games can rewrite a projection,
 * and small in December, when sixteen cannot. So the scale is the board's own: the MEDIAN
 * absolute change is the noise floor and the ninetieth percentile is full brightness.
 *
 * Both anchors are needed. Scaling on the ninetieth percentile alone fails whenever most of
 * the board moves by the same small amount, because then that amount IS the ninetieth
 * percentile and every row lights up at once — which is the same as no row lighting up. Taking
 * the median as the floor guarantees that about half the board stays grey no matter what shape
 * the week has, and half a board of grey is what makes the other half legible.
 */
export interface Movement {
  /** Signed change in value. Positive is a rise. */
  delta: number
  /** 0..1, for opacity. Zero below the noise floor. */
  intensity: number
  dir: 'up' | 'down' | 'flat'
}

export function computeMovement(
  previous: Record<string, number> | null | undefined,
  current: Record<string, number> | null | undefined,
): Record<string, Movement> {
  const prev = previous ?? {}
  const curr = current ?? {}
  const out: Record<string, Movement> = {}
  if (!Object.keys(prev).length || !Object.keys(curr).length) return out

  const deltas: { key: string; delta: number }[] = []
  for (const [key, value] of Object.entries(curr)) {
    const was = prev[key]
    /* A player absent last week is NOT a riser. He is new to the board — a promotion, a return
       from injury, a name that only just joined — and painting him bright green would claim a
       movement we never measured. */
    if (typeof was !== 'number' || typeof value !== 'number') continue
    deltas.push({ key, delta: value - was })
  }
  if (!deltas.length) return out

  const mags = deltas.map((d) => Math.abs(d.delta)).sort((a, b) => a - b)
  const at = (q: number) => mags[Math.min(mags.length - 1, Math.floor(q * (mags.length - 1)))]
  const floor = at(0.5)
  const full = at(0.9)
  const span = full - floor
  for (const { key, delta } of deltas) {
    const mag = Math.abs(delta)
    const intensity = mag <= floor ? 0 : span > 0 ? Math.min(1, (mag - floor) / span) : 1
    out[key] = { delta, intensity, dir: intensity === 0 ? 'flat' : delta > 0 ? 'up' : 'down' }
  }
  return out
}
