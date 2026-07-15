import { describe, it, expect } from 'vitest'
import { buildDraftReport } from '@/draft/report/buildDraftReport'
import type { GradedDraft, GradedPick, GradedTeam } from '@/draft/report/types'

function pick(p: Partial<GradedPick> & { teamKey: string; playerName: string; round: number; score: number }): GradedPick {
  return {
    teamName: p.teamKey, teamLogo: '', position: p.position ?? 'OF',
    overallPick: p.overallPick ?? p.round * 10, grade: p.grade ?? 'B',
    verdict: p.verdict ?? 'SOLID', tierMovement: p.tierMovement ?? 'STARTER→STARTER',
    draftedTier: 'STARTER', finishedTier: 'STARTER', ...p,
  }
}
function team(teamKey: string, gradeScore: number, rank: number): GradedTeam {
  return { teamKey, teamName: teamKey, teamLogo: '', gradeScore, grade: 'B', rank }
}

const draft: GradedDraft = {
  numTeams: 3,
  myTeamKey: 't2',
  teams: [team('t1', 30, 1), team('t2', 10, 2), team('t3', -20, 3)],
  picks: [
    pick({ teamKey: 't1', playerName: 'Steal Guy', round: 8, score: 45, verdict: 'JACKPOT', tierMovement: 'WAIVER→ELITE' }),
    pick({ teamKey: 't3', playerName: 'Bust Guy', round: 2, score: -35, verdict: 'DISASTER', tierMovement: 'ELITE→WAIVER' }),
    pick({ teamKey: 't2', playerName: 'My Best', round: 3, score: 20 }),
    pick({ teamKey: 't2', playerName: 'My Worst', round: 1, score: -10, verdict: 'BUST' }),
    pick({ teamKey: 't1', playerName: 'Late Flier', round: 14, score: -40 }),
  ],
}

describe('buildDraftReport', () => {
  it('steal = highest-score pick', () => {
    const r = buildDraftReport(draft, 2024)
    expect(r.steal?.playerName).toBe('Steal Guy')
    expect(r.steal?.valueLabel).toBe('Rd 8 · WAIVER→ELITE')
  })
  it('bust = lowest score among early (round<=5) picks, not a late flier', () => {
    const r = buildDraftReport(draft, 2024)
    expect(r.bust?.playerName).toBe('Bust Guy')
  })
  it('best/worst drafter come from ranked teams', () => {
    const r = buildDraftReport(draft, 2024)
    expect(r.bestDrafter?.teamKey).toBe('t1')
    expect(r.worstDrafter?.teamKey).toBe('t3')
    expect(r.teamGrades.map((t) => t.teamKey)).toEqual(['t1', 't2', 't3'])
    expect(r.teamGrades.find((t) => t.teamKey === 't2')?.isMe).toBe(true)
  })
  it('spotlight uses my team, with my best/worst pick', () => {
    const r = buildDraftReport(draft, 2024)
    expect(r.mySpotlight?.rank).toBe(2)
    expect(r.mySpotlight?.bestPick?.playerName).toBe('My Best')
    expect(r.mySpotlight?.worstPick?.playerName).toBe('My Worst')
  })
  it('no myTeamKey -> null spotlight', () => {
    const r = buildDraftReport({ ...draft, myTeamKey: null }, 2024)
    expect(r.mySpotlight).toBeNull()
  })
  it('empty draft -> all null / empty, no throw', () => {
    const r = buildDraftReport({ picks: [], teams: [], numTeams: 0, myTeamKey: null }, 2024)
    expect(r.steal).toBeNull(); expect(r.bust).toBeNull()
    expect(r.bestDrafter).toBeNull(); expect(r.teamGrades).toEqual([])
    expect(r.mySpotlight).toBeNull()
  })
  it('bust falls back to overall min when there are no early picks', () => {
    const late: GradedDraft = { numTeams: 1, myTeamKey: null, teams: [team('t1', 0, 1)], picks: [
      pick({ teamKey: 't1', playerName: 'A', round: 9, score: -5 }),
      pick({ teamKey: 't1', playerName: 'B', round: 12, score: -30 }),
    ] }
    expect(buildDraftReport(late, 2024).bust?.playerName).toBe('B')
  })
})

describe('buildDraftReport — substance', () => {
  const draft2: GradedDraft = {
    numTeams: 2, myTeamKey: 't1', keeperCount: 2,
    teams: [team('t1', 30, 1), team('t2', -10, 2)],
    picks: [
      pick({ teamKey: 't1', playerName: 'A', round: 10, score: 40, verdict: 'JACKPOT', tierMovement: 'WAIVER→ELITE' }),
      pick({ teamKey: 't1', playerName: 'B', round: 12, score: 25, verdict: 'STEAL' }),
      pick({ teamKey: 't1', playerName: 'C', round: 1, score: -20, verdict: 'BUST', tierMovement: 'ELITE→BENCH' }),
      pick({ teamKey: 't2', playerName: 'D', round: 2, score: -35, verdict: 'DISASTER' }),
      pick({ teamKey: 't2', playerName: 'E', round: 5, score: 5, verdict: 'SOLID' }),
    ],
  }

  it('per-team rows carry best pick + steal/bust counts', () => {
    const r = buildDraftReport(draft2, 2024)
    const t1 = r.teamGrades.find((t) => t.teamKey === 't1')!
    expect(t1.bestPick?.playerName).toBe('A')
    expect(t1.steals).toBe(2)
    expect(t1.busts).toBe(1)
    const t2 = r.teamGrades.find((t) => t.teamKey === 't2')!
    expect(t2.steals).toBe(0)
    expect(t2.busts).toBe(1)
  })
  it('top steals/reaches are top-3 by score with sign filter', () => {
    const r = buildDraftReport(draft2, 2024)
    expect(r.topSteals.map((s) => s.playerName)).toEqual(['A', 'B', 'E'])
    expect(r.topReaches.map((s) => s.playerName)).toEqual(['D', 'C'])
  })
  it('keeperCount passes through (undefined -> 0)', () => {
    expect(buildDraftReport(draft2, 2024).keeperCount).toBe(2)
    expect(buildDraftReport({ ...draft2, keeperCount: undefined }, 2024).keeperCount).toBe(0)
  })
  it('narrative: steals + a bust', () => {
    const r = buildDraftReport(draft2, 2024)
    expect(r.mySpotlight?.narrative).toBe('2 steals, led by A (Rd 10 · WAIVER→ELITE). Your biggest miss: C (Rd 1 · ELITE→BENCH).')
  })
  it('narrative: no steals, only a bust', () => {
    const d = { ...draft2, myTeamKey: 't2' }
    expect(buildDraftReport(d, 2024).mySpotlight?.narrative).toBe('A quiet draft — your roughest pick was D (Rd 2 · STARTER→STARTER).')
  })
  it('narrative: steady when neither', () => {
    const d: GradedDraft = { numTeams: 1, myTeamKey: 't1', teams: [team('t1', 0, 1)], picks: [
      pick({ teamKey: 't1', playerName: 'X', round: 3, score: 2, verdict: 'SOLID' }),
    ] }
    expect(buildDraftReport(d, 2024).mySpotlight?.narrative).toBe('A steady, no-drama draft.')
  })
  it('headshot/proTeam flow through highlights', () => {
    const d: GradedDraft = { numTeams: 1, myTeamKey: null, teams: [team('t1', 0, 1)], picks: [
      pick({ teamKey: 't1', playerName: 'H', round: 9, score: 30, verdict: 'STEAL', headshot: 'h.png', proTeam: 'NYY' }),
    ] }
    expect(buildDraftReport(d, 2024).steal?.headshot).toBe('h.png')
    expect(buildDraftReport(d, 2024).steal?.proTeam).toBe('NYY')
  })
})

describe('buildDraftReport — critique fixes', () => {
  function keeper(teamKey: string, playerName: string, finishedTier: string, points: number, round = 15) {
    return { teamKey, teamName: teamKey, teamLogo: '', playerName, position: 'OF', round, finishedTier, points }
  }
  const base: GradedDraft = {
    numTeams: 4, myTeamKey: 't1', keeperCount: 3,
    teams: [team('t1', 20, 1), team('t2', 4, 2), team('t3', -4, 3), team('t4', -20, 4)], // sum 0 -> mean 0
    picks: [
      pick({ teamKey: 't1', playerName: 'MySteal', round: 12, score: 40, verdict: 'JACKPOT' }),
      pick({ teamKey: 't1', playerName: 'MyMeh', round: 10, score: -3, verdict: 'SOLID' }),
      pick({ teamKey: 't4', playerName: 'Flop', round: 2, score: -40, verdict: 'DISASTER' }),
    ],
    keepers: [
      keeper('t2', 'Held Ace', 'ELITE', 400, 18),
      keeper('t1', 'Held Bat', 'STARTER', 300, 14),
      keeper('t3', 'Held Dud', 'REPLACEMENT', 50, 20),
    ],
  }

  it('grades spread across the full A+..F range by rank', () => {
    const r = buildDraftReport(base, 2024)
    const g = r.teamGrades.map((t) => t.grade)
    expect(g[0]).toBe('A+')
    expect(g[g.length - 1]).toBe('F')
    expect(new Set(g).size).toBeGreaterThan(2)
  })
  it('score gap = gradeScore minus league mean, rounded', () => {
    const r = buildDraftReport(base, 2024)
    expect(r.teamGrades.find((t) => t.teamKey === 't1')!.scoreGap).toBe(20)
    expect(r.teamGrades.find((t) => t.teamKey === 't4')!.scoreGap).toBe(-20)
  })
  it('top keepers = ELITE/STARTER finishers, best first; drops REPLACEMENT', () => {
    const r = buildDraftReport(base, 2024)
    expect(r.topKeepers.map((k) => k.playerName)).toEqual(['Held Ace', 'Held Bat'])
  })
  it('worst pick only shows a real bust (else null)', () => {
    const r = buildDraftReport(base, 2024)
    expect(r.mySpotlight?.worstPick).toBeNull()
    const r2 = buildDraftReport({ ...base, myTeamKey: 't4' }, 2024)
    expect(r2.mySpotlight?.worstPick?.playerName).toBe('Flop')
  })
  it('no keepers -> empty topKeepers', () => {
    expect(buildDraftReport({ ...base, keepers: undefined }, 2024).topKeepers).toEqual([])
  })
})
