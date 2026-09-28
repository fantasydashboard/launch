import { normalizeName } from './normalizeName'

/**
 * Which of our goalie projections belongs to an ESPN goalie row.
 *
 * WHY THIS IS NOT JUST A MAP LOOKUP. It was, keyed on the normalised full name, and it failed
 * for exactly one goalie in fifty-eight: ESPN writes "Sam Montembeault" and the NHL writes
 * "Samuel Montembeault". One miss out of fifty-eight sounds like nothing. What it did was put
 * him FIRST on the goalie board — because a goalie whose projection does not join keeps ESPN's
 * own, ESPN had him at 33 wins where our model has 17.9, and 33 wins is the best line on the
 * board. Our own numbers ranked him about fifteenth.
 *
 * This is the third instance of one failure mode: an unmatched row does not disappear, it falls
 * back to the other source's projection and looks like a confident answer. See
 * src/hockey/espnRateJoin.ts, which is the same bug for skaters at sixty-six times the scale.
 *
 * SURNAME ONLY WHEN IT IS UNAMBIGUOUS. Two goalies sharing a surname is not hypothetical, and
 * handing one the other's projected workload would be worse than leaving both on ESPN's — so a
 * shared surname refuses rather than guesses.
 */

export interface NamedGoalie { name?: string }

export interface GoalieMatcher<T> {
  /** Our projection for this ESPN name, or undefined when nothing can be said. */
  find(espnName: string): T | undefined
  /** How many surnames more than one goalie answers to — those are refused. */
  ambiguousSurnames: number
}

const surnameOf = (normalised: string) => normalised.split(' ').filter(Boolean).slice(-1)[0] ?? ''

export function goalieMatcher<T extends NamedGoalie>(goalies: T[]): GoalieMatcher<T> {
  const byFullName = new Map<string, T>()
  const bySurname = new Map<string, T[]>()
  for (const g of goalies) {
    if (!g?.name) continue
    const n = normalizeName(g.name)
    byFullName.set(n, g)
    const s = surnameOf(n)
    if (!s) continue
    const a = bySurname.get(s)
    if (a) a.push(g)
    else bySurname.set(s, [g])
  }

  let ambiguousSurnames = 0
  for (const list of bySurname.values()) if (list.length > 1) ambiguousSurnames++

  return {
    find(espnName: string): T | undefined {
      const n = normalizeName(espnName ?? '')
      if (!n) return undefined
      const exact = byFullName.get(n)
      if (exact) return exact
      /* "Sam" against "Samuel", "Alex" against "Alexander" — the given name is where the two
         feeds differ and the surname is where they agree. */
      const cands = bySurname.get(surnameOf(n))
      return cands && cands.length === 1 ? cands[0] : undefined
    },
    ambiguousSurnames,
  }
}
