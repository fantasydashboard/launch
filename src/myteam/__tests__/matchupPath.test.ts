import { describe, it, expect } from 'vitest'
import { matchupPath } from '../matchupPath'

type S = 'safe' | 'tossup' | 'loss'
const make = (safe: number, toss: number, loss: number): { status: S }[] => [
  ...Array.from({ length: safe }, () => ({ status: 'safe' as S })),
  ...Array.from({ length: toss }, () => ({ status: 'tossup' as S })),
  ...Array.from({ length: loss }, () => ({ status: 'loss' as S })),
]

describe('matchupPath', () => {
  it('returns null with no categories', () => {
    expect(matchupPath([])).toBeNull()
  })

  it('normal case: names the in-play target and flags the losses as no-spend', () => {
    // 10 cats, majority 6. safe 4 -> need 2 of 4 in play.
    const path = matchupPath(make(4, 4, 2))
    expect(path).toContain('Win 2 of 4 categories in play to take the week.')
    expect(path).toContain("don't spend")
  })

  it('singularizes a one-category target', () => {
    // 10 cats, majority 6. safe 5 -> need 1 of 1 in play.
    expect(matchupPath(make(5, 1, 4))).toContain('Win 1 of 1 category in play ')
  })

  it('omits the no-spend clause when there are no likely losses', () => {
    // 8 cats, majority 5, safe 4 -> need 1 of 4 in play, no losses to flag.
    const path = matchupPath(make(4, 4, 0))!
    expect(path).toContain('Win 1 of 4 categories in play')
    expect(path).not.toContain('out of reach')
  })

  it('already ahead on safe cats alone', () => {
    // 10 cats, majority 6, safe 6 -> needed <= 0.
    expect(matchupPath(make(6, 2, 2))).toContain("You're ahead")
  })

  it('behind with nothing in play: must steal a loss', () => {
    // majority 6, safe 2, no tossups.
    expect(matchupPath(make(2, 0, 8))).toContain('steal one of the likely losses')
  })

  it('contested sweep still short: names how many losses to steal', () => {
    // 10 cats, majority 6, safe 2, toss 3 -> need 4, sweep gives 3, steal 1 loss.
    expect(matchupPath(make(2, 3, 5))).toContain('Steal 1 of the likely losses')
  })

  it('emits no em dashes (copy rule)', () => {
    for (const c of [make(4, 4, 2), make(6, 2, 2), make(2, 0, 8), make(2, 3, 5)]) {
      expect(matchupPath(c)).not.toContain('—')
    }
  })
})
