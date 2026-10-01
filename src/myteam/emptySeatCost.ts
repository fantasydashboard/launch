/**
 * What an empty roster spot actually costs you, in the language of the sport.
 *
 * The Trades page told a hockey manager that freeing a roster spot meant "thinner cover for
 * byes" — four times on one page. Hockey has no byes. Neither does baseball or basketball;
 * what they have is nights when a seat's man has no game, which is the same risk under a name
 * the reader recognises.
 *
 * Copy written for one sport and shown to another is not a cosmetic problem: it tells the
 * reader the tool does not know what it is looking at, and that is the one thing a projection
 * cannot afford to suggest.
 */
export function emptySeatCost(sport: string): string {
  return String(sport || '').toLowerCase() === 'football'
    ? 'thinner cover for byes'
    : 'thinner cover on nights a seat has no game'
}

/** The same fact as a sentence, for the trade-analysis warning list. */
export function emptySeatWarning(sport: string, gives: number, gets: number): string {
  const tail = String(sport || '').toLowerCase() === 'football'
    ? 'and byes get harder'
    : 'and nights with an empty seat get harder'
  return `You send ${gives} and get ${gets} back — the roster spots you free still have to be filled, ${tail}.`
}
