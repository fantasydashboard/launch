/**
 * How many of the remaining games a player is expected to miss.
 *
 * THE PROBLEM THIS SOLVES. A rest-of-season number is a per-game rate multiplied by games
 * remaining, and until now "games remaining" meant weeks remaining minus a bye. So a man on
 * injured reserve carried a full season's worth of them. Sleeper cannot rescue us here: its
 * season projection is frozen at August — Josh Allen scoring 31.8 a game still reads 21.3 —
 * its `gp` field is the literal constant 18.0 for every player including men on IR, and its
 * weekly projection had Nico Collins at 15.8 in a week he was ruled Out.
 *
 * "OUT" IS NOT A DURATION, which is the whole difficulty. It is a weekly designation that can
 * mean one game or ten, and a flat discount is wrong in both directions — it writes off a man
 * who returns next Sunday and barely touches one who is gone until December.
 *
 * SO IT IS READ FROM THE GAME LOG, NOT THE FLAG. How many games he has ALREADY missed is
 * countable from box scores we load anyway, needs no injury-status history, and turns out to
 * carry most of the signal. Measured over 525 absence runs in 2025, byes excluded, counting
 * only players with an established role:
 *
 *     missed so far   expected more   back next week
 *           1              1.29            54%
 *           2              1.80            39%
 *           3              1.94            32%
 *           4              1.87            33%
 *           5              1.79            30%
 *
 * A man who has missed one game is usually back. A man who has missed three usually is not,
 * and the curve FLATTENS after three — past that the hazard is roughly a constant third per
 * week, so a three-step table captures nearly all of it.
 *
 * WHAT IS MEASURED AND WHAT IS NOT, because they should not be confused: the table above is
 * measured. The four-game floor for injured reserve is an NFL roster rule, so it is a fact
 * rather than an estimate. The Questionable discount is a judgement — status history is not
 * published, so it cannot be measured the same way, and it is deliberately small.
 */
export type InjuryStatus = string | null | undefined

/** E[further games missed | he has already missed k]. Measured on 2025; flat past three. */
const MORE_AFTER = [1.29, 1.80, 1.94]
function moreAfter(k: number): number {
  if (k <= 0) return MORE_AFTER[0]
  return MORE_AFTER[Math.min(k, MORE_AFTER.length) - 1]
}

/* Designations that mean he is not playing this week. */
const OUT = new Set(['OUT', 'IR', 'PUP', 'NA', 'SUS', 'DNR', 'DOUBTFUL'])
/* Injured reserve keeps a player down a minimum of four games by rule, so the floor is not a
   guess. PUP in season carries the same minimum. */
const LONG = new Set(['IR', 'PUP', 'NA', 'DNR'])
const QUESTIONABLE_COST = 0.2

export function expectedGamesMissed(
  status: InjuryStatus,
  consecutiveMissed: number,
  gamesRemaining: number,
): number {
  const s = String(status ?? '').trim().toUpperCase()
  const k = Math.max(0, Math.floor(consecutiveMissed || 0))
  const cap = Math.max(0, gamesRemaining)

  if (LONG.has(s)) {
    /* Four games from the designation, less the ones already served, and never below what the
       game log alone would imply — a man eight weeks into an IR stint is not nearly back. */
    const byRule = Math.max(0, 4 - k)
    return Math.min(cap, Math.max(byRule, 1 + moreAfter(k + 1)))
  }
  if (OUT.has(s)) {
    /* He misses this one for certain, plus whatever the log says usually follows. */
    return Math.min(cap, 1 + moreAfter(k + 1))
  }
  if (s === 'QUESTIONABLE') return Math.min(cap, QUESTIONABLE_COST)

  /* No designation but a live absence streak — a player quietly not dressing, which the status
     field sometimes misses entirely. Believe the log. */
  if (k > 0) return Math.min(cap, moreAfter(k))
  return 0
}

/**
 * Games missed at the END of his log, from a set of the weeks he actually played.
 *
 * Only the CURRENT streak counts. A back who missed three games in September and has played
 * since is available now, and charging him for a healed injury would be the opposite error to
 * the one this file exists to fix.
 */
export function consecutiveMissed(
  playedWeeks: Iterable<number>,
  currentWeek: number,
  byeWeek?: number | null,
): number {
  const played = new Set(playedWeeks)
  if (!played.size) return 0
  let k = 0
  for (let w = currentWeek - 1; w >= 1; w--) {
    if (byeWeek && w === byeWeek) continue
    if (played.has(w)) break
    k += 1
  }
  return k
}
