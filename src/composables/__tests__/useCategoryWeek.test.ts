import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useCategoryWeek, type CategoryWeekInputs } from '../useCategoryWeek'

/*
 * These tests are about the GATE, not the arithmetic — the engine underneath has its own 81.
 * What can only go wrong here is the composable rendering a confident column board out of
 * inputs that have not arrived, which looks finished and is wrong. Every missing-input case
 * below is a real state this page passes through on a normal load.
 */

function inputs(over: Partial<CategoryWeekInputs> = {}): CategoryWeekInputs {
  return {
    snapshot: ref({ myStats: { '1': 10 }, oppStats: { '1': 8 }, daysRemaining: 3 }),
    pool: ref([
      { playerKey: 'p1', name: 'Mine Guy', teamKey: 'me', proTeam: 'TOR' },
      { playerKey: 'p2', name: 'Their Guy', teamKey: 'them', proTeam: 'BOS' },
    ]),
    myTeamKey: ref('me'),
    opponentKey: ref('them'),
    gamesByTeam: ref({ TOR: 3, BOS: 3 }),
    categories: ref([{ key: 'G', statId: 1, reverse: false }]),
    projectionOf: ref((p: { name?: string }) =>
      p.name === 'Mine Guy' ? { stats: { G: 0.5, GP: 1 } } : { stats: { G: 0.4, GP: 1 } }),
    scoringType: ref('head'),
    ...over,
  } as CategoryWeekInputs
}

describe('useCategoryWeek', () => {
  it('builds the week when every input has arrived', () => {
    const { week, reason } = useCategoryWeek(inputs())
    expect(reason.value).toBeNull()
    expect(week.value?.cats.map((c) => c.key)).toEqual(['G'])
    expect(week.value?.format).toBe('each')
  })

  it('reads the format off the league rather than assuming one', () => {
    const { week } = useCategoryWeek(inputs({ scoringType: ref('headone') }))
    expect(week.value?.format).toBe('most')
  })

  /*
   * Roto is the case that matters most. Its objective is season-long standings points, so
   * "this column is gone, stop spending on it" — true in a weekly matchup — is actively wrong
   * advice. Showing nothing is the only honest answer we have for it today.
   */
  it('shows nothing for a format it does not understand', () => {
    const { week, reason } = useCategoryWeek(inputs({ scoringType: ref('roto') }))
    expect(reason.value).toBe('format')
    expect(week.value).toBeNull()
  })

  it.each([
    ['no-matchup', { snapshot: ref(null) }],
    ['no-categories', { categories: ref([]) }],
    ['no-opponent', { opponentKey: ref('') }],
    ['no-schedule', { gamesByTeam: ref({}) }],
  ])('withholds the board and says why when %s', (why, over) => {
    const { week, reason } = useCategoryWeek(inputs(over as Partial<CategoryWeekInputs>))
    expect(reason.value).toBe(why)
    expect(week.value).toBeNull()
  })

  it('tracks its inputs, so the board follows a live scoreboard', () => {
    const snapshot = ref<any>(null)
    const { week } = useCategoryWeek(inputs({ snapshot }))
    expect(week.value).toBeNull()
    snapshot.value = { myStats: { '1': 20 }, oppStats: { '1': 1 }, daysRemaining: 1 }
    expect(week.value?.cats[0].mine).toBe(20)
  })
})
