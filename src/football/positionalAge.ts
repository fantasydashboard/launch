/**
 * What an age MEANS, given the position.
 *
 * The board printed age as a bare number, so a 28-year-old back and a 28-year-old receiver
 * rendered identically. In dynasty they are not remotely the same asset: one is past the
 * point where his position holds value and the other is in the middle of his best years.
 * That single fact is most of what a dynasty ranking is built on, and we were showing the
 * input while withholding the meaning.
 *
 * WHY THIS IS A STATED CONVENTION AND NOT A DERIVED CURVE
 *
 * The intent was to derive the cliff from the market's own numbers — the age at which
 * dynasty value stops carrying a premium over redraft value. The data will not support it:
 * of the ~470 players the provider prices, only 98 have real standing in BOTH markets, which
 * across four positions and eight age buckets is about three players per cell. The result was
 * visibly noise (running backs dipping below parity at 26, then back above it at 28). Shipping
 * a curve fitted to three-player cells would have been a number that looked derived and was
 * not, which is worse than an opinion that admits what it is.
 *
 * So these are conventional fantasy aging bands, written here so they can be argued with
 * rather than buried. They are corroborated, not invented: measured against an analyst's
 * 200-player dynasty list, the same shape appears — at 27 and older that list rates running
 * backs 19 ranks below the market on average and tight ends 16 below, while receivers stay 5
 * ranks ABOVE it. Receivers do not fall off where backs do.
 *
 * The one place the sources disagree is tight end. Convention puts the decline near 30; that
 * analyst puts it closer to 27. We sit between them at 29 and say so here rather than pick a
 * side silently.
 *
 * Nothing here re-ranks anybody. It labels an age that was already on screen.
 */

export type AgePhase = 'ascending' | 'prime' | 'late' | 'old'

interface Bands {
  /** Below this he is still gaining. */
  prime: number
  /** At or above this the decline has started. */
  late: number
  /** At or above this he is priced for this season, not the next one. */
  old: number
}

/**
 * Age bands per position. Backs are the steepest and earliest; receivers hold longest among
 * the skill positions; quarterbacks barely age at all in fantasy terms, which is why a young
 * one commands so little premium in a one-quarterback league.
 */
export const AGE_BANDS: Record<string, Bands> = {
  RB: { prime: 24, late: 27, old: 29 },
  WR: { prime: 25, late: 30, old: 32 },
  TE: { prime: 25, late: 29, old: 32 },
  QB: { prime: 26, late: 34, old: 37 },
}

export interface AgeRead {
  phase: AgePhase
  /** Short label for a badge. Empty in prime — the unremarkable case needs no word. */
  label: string
  /** One sentence naming the position, so the reader can disagree with the premise. */
  detail: string
}

const PHASE_LABEL: Record<AgePhase, string> = {
  ascending: 'rising',
  prime: '',
  late: 'ageing',
  old: 'win-now',
}

const POS_NAME: Record<string, string> = {
  RB: 'running back',
  WR: 'receiver',
  TE: 'tight end',
  QB: 'quarterback',
}

/**
 * Read an age against its position.
 *
 * Returns null for an unknown position or a missing age rather than guessing — an unlabelled
 * age is honest, and a wrong label on a real player is not.
 */
export function readAge(position: string, age: number | null | undefined): AgeRead | null {
  const pos = (position || '').toUpperCase().split(/[,/|]/)[0].trim()
  const b = AGE_BANDS[pos]
  if (!b || typeof age !== 'number' || !Number.isFinite(age) || age <= 0) return null

  const phase: AgePhase =
    age >= b.old ? 'old' : age >= b.late ? 'late' : age >= b.prime ? 'prime' : 'ascending'

  const name = POS_NAME[pos] ?? pos
  const rounded = Math.floor(age)
  const detail =
    phase === 'ascending'
      ? `${rounded} is young for a ${name} — still gaining value.`
      : phase === 'prime'
        ? `${rounded} is prime for a ${name}.`
        : phase === 'late'
          ? `${rounded} is late for a ${name} — the decline usually starts here.`
          : `${rounded} is old for a ${name} — priced for this season, not the next one.`

  return { phase, label: PHASE_LABEL[phase], detail }
}

/** Tailwind tone per phase, matching the scale used everywhere else on the boards. */
export const AGE_TONE: Record<AgePhase, string> = {
  ascending: 'text-[#7ee787]',
  prime: 'text-dark-textMuted/60',
  late: 'text-[#d29922]',
  old: 'text-[#f85149]',
}
