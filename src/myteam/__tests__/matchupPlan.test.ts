import { describe, it, expect } from 'vitest'
import { matchupPlan, type PlanCategory } from '../matchupPlan'

const CATS: PlanCategory[] = [
  { statId: 'OPS', status: 'safe', myWinPct: 88 },
  { statId: 'H', status: 'safe', myWinPct: 80 },
  { statId: 'AB', status: 'safe', myWinPct: 75 },
  { statId: 'RBI', status: 'tossup', myWinPct: 52 },
  { statId: 'K', status: 'tossup', myWinPct: 48 },
  { statId: 'TB', status: 'loss', myWinPct: 40 }, // close loss
  { statId: 'R', status: 'loss', myWinPct: 10 }, // far loss
]

describe('matchupPlan', () => {
  it('clinch: fight the tossups, concede ALL losses, no swing tier', () => {
    const p = matchupPlan(CATS, 'clinch')
    expect(p.fight.sort()).toEqual(['K', 'RBI'])
    expect(p.concede.sort()).toEqual(['R', 'TB'])
    expect(p.swing).toEqual([])
    expect(p.path).toMatch(/coin-flip/i)
  })
  it('maximize: close losses become a swing tier; only far losses stay conceded', () => {
    const p = matchupPlan(CATS, 'maximize')
    expect(p.fight.sort()).toEqual(['K', 'RBI'])
    expect(p.swing).toEqual(['TB'])
    expect(p.concede).toEqual(['R'])
    expect(p.path).toMatch(/ground|beyond the majority|seeding/i)
  })
  it('must-win: everything not already safe is a fight; nothing conceded', () => {
    const p = matchupPlan(CATS, 'must-win')
    expect(p.fight.sort()).toEqual(['K', 'R', 'RBI', 'TB'])
    expect(p.concede).toEqual([])
    expect(p.swing).toEqual([])
    expect(p.path).toMatch(/tank|every move|must/i)
  })
  it('coast (manual, no coastKind): neutral conserve nudge', () => {
    const p = matchupPlan(CATS, 'coast')
    expect(p.path).toMatch(/conserve|waiver/i)
  })
  it('coast clinched: save resources for the playoffs', () => {
    const p = matchupPlan(CATS, 'coast', 'clinched')
    expect(p.path).toMatch(/set for the bracket|playoffs/i)
  })
  it('coast eliminated: does NOT claim the bracket — pride only', () => {
    const p = matchupPlan(CATS, 'coast', 'eliminated')
    expect(p.path).toMatch(/out of reach|pride/i)
    expect(p.path).not.toMatch(/set for the bracket/i)
  })
})
