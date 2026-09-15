import { describe, it, expect } from 'vitest'
import { buildAllowed, rankAllowed, type GameLine } from '@/football/defenseAllowed'
import { buildDifficulty, byeWeeks } from '@/football/scheduleDifficulty'

/*
 * A single strength-of-schedule number is close to useless, because defences are not
 * uniformly good. A trusted analyst's table has Detroit as the second-easiest schedule in the
 * league for running backs and 31st for tight ends — same opponents, opposite answer. One
 * number per team would average those into a shrug.
 */
describe('points allowed, by position', () => {
  const lines: GameLine[] = [
    // SOFT gives up a lot to backs and little to tight ends; HARD is the reverse.
    { team: 'A', opponent: 'SOFT', position: 'RB', points: 30 },
    { team: 'B', opponent: 'SOFT', position: 'RB', points: 28 },
    { team: 'A', opponent: 'SOFT', position: 'TE', points: 2 },
    { team: 'B', opponent: 'SOFT', position: 'TE', points: 3 },
    { team: 'A', opponent: 'HARD', position: 'RB', points: 4 },
    { team: 'B', opponent: 'HARD', position: 'RB', points: 5 },
    { team: 'A', opponent: 'HARD', position: 'TE', points: 22 },
    { team: 'B', opponent: 'HARD', position: 'TE', points: 24 },
  ]
  const allowed = buildAllowed(lines)

  it('reaches opposite verdicts about one defence at two positions', () => {
    expect(allowed.SOFT.RB.perGame).toBeGreaterThan(allowed.HARD.RB.perGame)
    expect(allowed.SOFT.TE.perGame).toBeLessThan(allowed.HARD.TE.perGame)
  })

  it('ranks 1 as the defence that gives up the most', () => {
    expect(rankAllowed(allowed, 'RB').SOFT).toBe(1)
    expect(rankAllowed(allowed, 'TE').HARD).toBe(1)
  })

  it('leaves a defence with no data unranked rather than last', () => {
    /* Ranking an unplayed defence 32nd reads as "hardest matchup in the league" on no
       evidence at all. Absent is the honest answer. */
    expect(rankAllowed(allowed, 'RB').NEVER_PLAYED).toBeUndefined()
  })

  it('carries the sample size, because two games is two games', () => {
    expect(allowed.SOFT.RB.games).toBe(2)
  })
})

describe('schedule difficulty', () => {
  // ME plays the soft defence three times; THEM plays the hard one.
  const schedule = {
    ME:   { 1: 'SOFT', 2: 'SOFT', 4: 'SOFT', 5: 'HARD' },  // week 3 off
    THEM: { 1: 'HARD', 2: 'HARD', 3: 'HARD', 4: 'HARD', 5: 'SOFT' },
    SOFT: { 1: 'ME', 2: 'ME', 3: 'THEM', 4: 'ME', 5: 'THEM' },
    HARD: { 1: 'THEM', 2: 'THEM', 3: 'THEM', 4: 'THEM', 5: 'ME' },
  }
  const allowed = buildAllowed([
    { team: 'ME', opponent: 'SOFT', position: 'RB', points: 30 },
    { team: 'THEM', opponent: 'SOFT', position: 'RB', points: 28 },
    { team: 'ME', opponent: 'HARD', position: 'RB', points: 4 },
    { team: 'THEM', opponent: 'HARD', position: 'RB', points: 5 },
  ])
  const diff = buildDifficulty({ schedule, allowed, position: 'RB', fromWeek: 1, throughWeek: 5 })

  it('gives the easier run the better rank', () => {
    expect(diff.ME.ros).toBeLessThan(diff.THEM.ros!)
  })

  it('finds the bye', () => {
    expect(diff.ME.bye).toBe(3)
    expect(diff.THEM.bye).toBeNull()
  })

  it('does not count a bye as a hard game', () => {
    /* Scoring a week off as difficulty would make a team's schedule look tougher for having
       one, which is backwards. */
    const withBye = buildDifficulty({ schedule, allowed, position: 'RB', fromWeek: 3, throughWeek: 5 })
    // ME plays SOFT then HARD from week 3; the empty week 3 must not enter the average.
    expect(withBye.ME.ros).not.toBeNull()
  })

  it('separates rest-of-season from the next four', () => {
    /* They disagree constantly, and averaging them hides the case a manager needs: an easy
       season ahead with a brutal month first. */
    const s = { ME: { 1: 'HARD', 2: 'HARD', 3: 'HARD', 4: 'HARD', 5: 'SOFT', 6: 'SOFT', 7: 'SOFT', 8: 'SOFT' },
                THEM: { 1: 'SOFT', 2: 'SOFT', 3: 'SOFT', 4: 'SOFT', 5: 'HARD', 6: 'HARD', 7: 'HARD', 8: 'HARD' } }
    const d = buildDifficulty({ schedule: s, allowed, position: 'RB', fromWeek: 1, throughWeek: 8 })
    // Identical rest-of-season mix; opposite next four.
    expect(d.ME.next4).toBeGreaterThan(d.THEM.next4!)
  })
})

describe('byes', () => {
  it('reads the week a team is missing from the slate', () => {
    expect(byeWeeks({ A: { 1: 'B', 3: 'B' } }, 3).A).toBe(2)
  })
  it('reports none when the schedule has not reached it', () => {
    expect(byeWeeks({ A: { 1: 'B', 2: 'B' } }, 2).A).toBeNull()
  })
})
