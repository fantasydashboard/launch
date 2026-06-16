/**
 * "Your path": the one-line strategic read of a this-week category matchup. H2H
 * category is won by taking a majority of categories, so the safe cats are banked, the
 * likely losses are gone, and the COIN-FLIPS are the battleground. The path states how
 * many coin-flips you must win and tells the manager to stop spending on the out-of-reach
 * cats. It's the synthesis that turns the snapshot's status chips into a plan.
 *
 * The majority threshold ignores category ties (treats every cat as decided), so it's
 * mildly conservative: it may ask for one more coin-flip than a tie-heavy week strictly
 * needs. Conservative beats overpromising for a strategic nudge. Returns null when there
 * are no categories to reason about.
 */
export function matchupPath(categories: { status: 'safe' | 'tossup' | 'loss' }[]): string | null {
  const total = categories.length
  if (total === 0) return null

  const safe = categories.filter((c) => c.status === 'safe').length
  const toss = categories.filter((c) => c.status === 'tossup').length
  const loss = categories.filter((c) => c.status === 'loss').length

  const majority = Math.floor(total / 2) + 1 // more than half = a win, not a tie
  const needed = majority - safe
  // "Categories in play" = every contested cat (the page tiers these into the
  // narrow coin-flip band + leaning + volume); the path counts all of them, so
  // it must not call them "coin-flips" or the count won't match the UI section.
  const inPlay = (n: number) => `${n} categor${n === 1 ? 'y' : 'ies'} in play`

  // Already over the line on safe cats alone.
  if (needed <= 0) {
    return `You're ahead. Protect your ${safe} safe categories and the week is yours.`
  }
  // No coin-flips left to win, and not enough safe: the only road is stealing a loss.
  if (toss === 0) {
    return `You're behind. You'll need to steal one of the likely losses to take the week.`
  }
  // Even sweeping every contested cat falls short: name how many losses must also be stolen.
  if (needed > toss) {
    const steal = needed - toss
    return `Winning every category in play still falls short. Steal ${steal} of the likely losses too.`
  }
  // The normal case: a clear target, with the losses flagged as no-spend.
  const base = `Win ${needed} of ${inPlay(toss)} to take the week.`
  return loss > 0
    ? `${base} The likely losses are out of reach, so don't spend moves there.`
    : base
}
