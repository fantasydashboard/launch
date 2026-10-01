import { catWinProb } from './categoryLeverage'

/**
 * What starting a man does to a RATIO column — including when the answer is "it costs you".
 *
 * THE CALL EVERY COUNTING-STAT MODEL IN THIS PRODUCT GETS WRONG. In a league scoring save
 * percentage, starting a goalie can lose you that column. He brings saves, so an additive model
 * scores him positive and says start him. If his expected rate is below the rate you are already
 * carrying, he drags the ratio DOWN — and if the column was close, he takes it with him.
 *
 * It recurs nightly, it is high-stakes, and it is the only decision here that can be worth a
 * negative number. The same shape governs ERA and WHIP in baseball and the percentages in
 * basketball: a man can be good and still be the wrong start.
 *
 * WHY THIS IS NOT catLeverage WITH A SIGN. A counting column takes a player's units and adds
 * them. A ratio blends: the new value depends on the VOLUME already behind your number as well
 * as the volume he brings. Two goalies with the same expected save percentage move your column
 * by different amounts depending on how many shots you have already faced, and a model without
 * the denominator cannot tell them apart.
 *
 * WITHOUT THE DENOMINATOR we answer less rather than guessing. Yahoo and ESPN report the ratio
 * because the league scores it; they do not always report the volume underneath. The SIGN of the
 * decision — the half a manager acts on — needs only his rate against yours, so that is still
 * answered. The magnitude is reported as unknown, because a plausible invented number is
 * indistinguishable on screen from a measured one.
 */

export interface RatioImpact {
  /** Change in your chance of taking this column. Null when the volume behind your ratio is unknown. */
  deltaWinPct: number | null
  /** Which way he moves it. Answerable even without a denominator. */
  direction: 'helps' | 'hurts' | 'neutral'
  /** Your ratio after starting him. Null when the volume behind yours is unknown. */
  newRatio: number | null
}

const NEUTRAL: RatioImpact = { deltaWinPct: 0, direction: 'neutral', newRatio: null }

/** Close enough to your own rate that the move is not a decision. */
const INDIFFERENT = 1e-9

export function ratioImpact(input: {
  /** Your ratio in this column so far. */
  myRatio: number
  theirRatio: number
  /** The volume behind YOUR ratio — shots against, innings, attempts. Null when not reported. */
  myVolume: number | null
  /** His expected rate tonight. */
  contributorRate: number
  /** The volume he is expected to take on — shots faced, innings, attempts. */
  contributorVolume: number
  /** Daily spread of the column, for turning a ratio change into a probability change. */
  sigma: number
  days: number
  /** GAA, ERA, WHIP. */
  lowerIsBetter: boolean
}): RatioImpact {
  const { myRatio, theirRatio, myVolume, contributorRate, contributorVolume, sigma, days, lowerIsBetter } = input

  if (!Number.isFinite(myRatio) || !Number.isFinite(contributorRate)) return NEUTRAL
  /* No volume is no decision — he does not touch the column tonight. */
  if (!Number.isFinite(contributorVolume) || contributorVolume <= 0) return NEUTRAL

  /*
   * THE SIGN NEEDS NOTHING BUT THE TWO RATES. Better than what you carry lifts your number;
   * worse drags it. Which of those counts as "helps" is what lowerIsBetter decides.
   */
  const better = lowerIsBetter ? contributorRate < myRatio : contributorRate > myRatio
  const worse = lowerIsBetter ? contributorRate > myRatio : contributorRate < myRatio
  const direction: RatioImpact['direction'] = Math.abs(contributorRate - myRatio) <= INDIFFERENT
    ? 'neutral'
    : better ? 'helps' : worse ? 'hurts' : 'neutral'

  if (direction === 'neutral') return { deltaWinPct: 0, direction, newRatio: myVolume != null ? myRatio : null }

  /* The magnitude is the part that needs the denominator. */
  if (myVolume == null || !Number.isFinite(myVolume) || myVolume < 0) {
    return { deltaWinPct: null, direction, newRatio: null }
  }

  const newRatio = (myRatio * myVolume + contributorRate * contributorVolume) / (myVolume + contributorVolume)
  const before = catWinProb(myRatio, theirRatio, sigma, days, lowerIsBetter)
  const after = catWinProb(newRatio, theirRatio, sigma, days, lowerIsBetter)

  return { deltaWinPct: after - before, direction, newRatio }
}
