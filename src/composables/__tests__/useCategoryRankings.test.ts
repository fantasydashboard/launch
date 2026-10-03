import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useCategoryRankings } from '../useCategoryRankings'
import { buildCategoryState } from '@/category/categoryBoard'
import { weekOdds } from '@/category/categoryLeverage'
import type { CategoryWeek } from '@/category/categoryWeek'
import type { RankedRow } from '../useDailyLineup'

function row(name: string): RankedRow {
  return {
    playerKey: name, name, position: 'C', team: 'TOR', today: 0, seasonValue: 0,
    status: '', owner: 'free', ownerName: '',
  }
}

/** A week with goals banked, shots dead level, and assists out of reach. */
function week(over: Partial<CategoryWeek> = {}): CategoryWeek {
  const cats = buildCategoryState({
    cats: [
      /* Banked: a 20-goal lead with a day left is not in doubt. */
      { key: 'G', label: 'G', mine: 30, theirs: 10, sigma: 1.5, lowerIsBetter: false, isRatio: false },
      /* The only column tonight can decide. */
      { key: 'SOG', label: 'SOG', mine: 100, theirs: 100, sigma: 6, lowerIsBetter: false, isRatio: false },
      /* Gone: no night of assists closes a 25-assist gap. */
      { key: 'A', label: 'A', mine: 5, theirs: 30, sigma: 2, lowerIsBetter: false, isRatio: false },
    ],
    days: 1,
    format: 'each',
  })
  return {
    cats: cats.map((c) => ({ ...c, movable: c.unitValue })),
    format: 'each',
    live: cats.filter((c) => c.status === 'live').length,
    safe: cats.filter((c) => c.status === 'safe').length,
    gone: cats.filter((c) => c.status === 'gone').length,
    worthChasing: ['SOG'],
    odds: weekOdds(cats.map((c) => c.winPct)),
    ...over,
  }
}

describe('useCategoryRankings', () => {
  /*
   * THE WHOLE POINT, as a test. The better player by season value is the scorer; the useful
   * player tonight is the shooter, because goals are banked and shots are the only live column.
   * If this assertion ever flips, the board is back to recommending the best player instead of
   * the most useful one — which is the behaviour the user flagged.
   */
  it('puts the man who moves a live column above the better player', () => {
    const projections: Record<string, { stats: Record<string, number> }> = {
      Scorer: { stats: { G: 50, A: 50, SOG: 150, GP: 80 } },
      Shooter: { stats: { G: 15, A: 10, SOG: 400, GP: 80 } },
    }
    const { rows } = useCategoryRankings({
      rankings: ref([row('Scorer'), row('Shooter')]),
      week: ref(week()),
      projectionOf: ref((p: { name?: string }) => projections[p.name ?? ''] ?? null),
    })
    expect(rows.value?.map((r) => r.name)).toEqual(['Shooter', 'Scorer'])
    expect(rows.value?.[0].helps).toEqual(['SOG'])
    /* Percentage points, so the board's one-decimal column and its tier threshold both have
       something to work with. A raw probability would render as 0.0 on every row. */
    expect(rows.value![0].need).toBeGreaterThan(rows.value![1].need)
    expect(rows.value![0].need).toBeGreaterThan(0.1)
  })

  /* A banked column and a lost one both pay nothing, so a man who only touches them is worth
     nothing tonight however good he is. That is punting, and it is arithmetic, not a mode. */
  it('scores a man who only moves settled columns at zero', () => {
    const { rows } = useCategoryRankings({
      rankings: ref([row('Specialist')]),
      week: ref(week()),
      projectionOf: ref(() => ({ stats: { G: 60, A: 60, GP: 80 } })),
    })
    expect(rows.value?.[0].need).toBe(0)
    /* And the readable unit is percentage points, not raw probability — see AS_PCT_POINTS. */
    expect(rows.value?.[0].helps).toEqual([])
  })

  it('leaves a man with no projection off the board rather than ranking him last', () => {
    const { rows } = useCategoryRankings({
      rankings: ref([row('Known'), row('Unknown')]),
      week: ref(week()),
      projectionOf: ref((p: { name?: string }) =>
        p.name === 'Known' ? { stats: { SOG: 300, GP: 80 } } : null),
    })
    expect(rows.value?.map((r) => r.name)).toEqual(['Known'])
  })

  it('hands the board back unweighted when there is no week to weight it by', () => {
    const { rows } = useCategoryRankings({
      rankings: ref([row('A')]),
      week: ref(null),
      projectionOf: ref(() => ({ stats: { SOG: 300, GP: 80 } })),
    })
    expect(rows.value).toBeNull()
  })

  /*
   * A settled week has no live column, so every score ties at zero and a sort would present
   * the incoming order as a ranking. Null, so the caller keeps the board it had.
   */
  it('declines to rank a week where nothing is still in play', () => {
    const settled = week()
    for (const c of settled.cats) c.unitValue = 0
    const { rows } = useCategoryRankings({
      rankings: ref([row('A'), row('B')]),
      week: ref(settled),
      projectionOf: ref(() => ({ stats: { SOG: 300, GP: 80 } })),
    })
    expect(rows.value).toBeNull()
  })
})

describe('the tags describe what sets a player apart, not what is biggest', () => {
  /** A week where shots and hits are both live and nothing is settled. */
  function openWeek(): CategoryWeek {
    const cats = buildCategoryState({
      cats: [
        { key: 'SOG', label: 'SOG', mine: 100, theirs: 100, sigma: 6, lowerIsBetter: false, isRatio: false },
        { key: 'HIT', label: 'HIT', mine: 20, theirs: 20, sigma: 3, lowerIsBetter: false, isRatio: false },
      ],
      days: 3,
      format: 'each',
    })
    return {
      cats: cats.map((c) => ({ ...c, movable: c.unitValue })),
      format: 'each',
      live: cats.length, safe: 0, gone: 0,
      worthChasing: ['SOG', 'HIT'],
      odds: weekOdds(cats.map((c) => c.winPct)),
    }
  }

  /*
   * THE REGRESSION, from a live board. Shots are the highest-volume counting stat in hockey, so
   * the man's biggest column is shots for nearly every skater alive — and the board printed
   * "SOG" on all ten rows, which cannot explain why row one beats row ten.
   */
  it('does not name a column that every player on the board fills', () => {
    const everyone: Record<string, { stats: Record<string, number> }> = {
      A: { stats: { SOG: 240, HIT: 80, GP: 80 } },
      B: { stats: { SOG: 244, HIT: 82, GP: 80 } },
      C: { stats: { SOG: 236, HIT: 78, GP: 80 } },
    }
    const { rows } = useCategoryRankings({
      rankings: ref([row('A'), row('B'), row('C')]),
      week: ref(openWeek()),
      projectionOf: ref((p: { name?: string }) => everyone[p.name ?? ''] ?? null),
    })
    /* Three interchangeable skaters: nobody stands out, so nobody is labelled as if he did. */
    expect(rows.value?.every((r) => r.helps.length === 0)).toBe(true)
  })

  it('names the column where a player genuinely beats the field', () => {
    const pool: Record<string, { stats: Record<string, number> }> = {
      Typical1: { stats: { SOG: 240, HIT: 80, GP: 80 } },
      Typical2: { stats: { SOG: 240, HIT: 80, GP: 80 } },
      Banger: { stats: { SOG: 240, HIT: 300, GP: 80 } },
    }
    const { rows } = useCategoryRankings({
      rankings: ref([row('Typical1'), row('Typical2'), row('Banger')]),
      week: ref(openWeek()),
      projectionOf: ref((p: { name?: string }) => pool[p.name ?? ''] ?? null),
    })
    const banger = rows.value?.find((r) => r.name === 'Banger')
    expect(banger?.helps).toEqual(['HIT'])
    /* And the men he is being compared against stay unlabelled rather than all claiming hits. */
    expect(rows.value?.find((r) => r.name === 'Typical1')?.helps).toEqual([])
  })

  /* The number still measures total movement, so the board's ORDER is unchanged by any of
     this — a distinctive player is not automatically the most valuable start. */
  it('still ranks by total movement, not by distinctiveness', () => {
    const pool: Record<string, { stats: Record<string, number> }> = {
      Everything: { stats: { SOG: 400, HIT: 200, GP: 80 } },
      OnlyHits: { stats: { SOG: 40, HIT: 260, GP: 80 } },
      Typical: { stats: { SOG: 240, HIT: 80, GP: 80 } },
    }
    const { rows } = useCategoryRankings({
      rankings: ref([row('OnlyHits'), row('Typical'), row('Everything')]),
      week: ref(openWeek()),
      projectionOf: ref((p: { name?: string }) => pool[p.name ?? ''] ?? null),
    })
    expect(rows.value?.[0].name).toBe('Everything')
  })
})

describe('a day-to-day man is a less likely start', () => {
  /*
   * The seats and the wire adds already discount him. Without the same discount here, this
   * board would rank him above them and the two halves of one page would disagree about the
   * same player on the same night.
   */
  it('discounts him by the same factor the rest of the page uses', () => {
    const line = { stats: { SOG: 300, GP: 80 } }
    const healthy = { ...row('Healthy'), status: 'ACTIVE' }
    const dtd = { ...row('Doubtful'), status: 'DTD' }
    const { rows } = useCategoryRankings({
      rankings: ref([healthy, dtd]),
      week: ref(week()),
      projectionOf: ref(() => line),
    })
    const a = rows.value!.find((r) => r.name === 'Healthy')!.need
    const b = rows.value!.find((r) => r.name === 'Doubtful')!.need
    expect(b / a).toBeCloseTo(0.6, 5)
  })

  /* A man who is out never reaches this board at all — he is filtered upstream — so the only
     discount this needs to know about is the day-to-day one. */
  it('leaves a healthy man undiscounted', () => {
    const { rows } = useCategoryRankings({
      rankings: ref([{ ...row('Healthy'), status: '' }]),
      week: ref(week()),
      projectionOf: ref(() => ({ stats: { SOG: 300, GP: 80 } })),
    })
    expect(rows.value![0].need).toBeGreaterThan(0)
  })
})
