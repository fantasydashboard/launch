import { computed, type ComputedRef, type Ref } from 'vue'
import { computeRosterValue, type ValuePoolPlayer } from '@/myteam/value'
import { classifyCategory } from '@/myteam/categorySide'
import { resolveVolumeStatId } from '@/myteam/catVolume'
import { projectedGames } from '@/myteam/pointsValue'
import { useValueBaseline } from '@/composables/useValueBaseline'
import type { CatSpec } from '@/myteam/types'
import type { CategoryDef } from '@/recommendations/types'
import type { FGProjection } from '@/services/projectionService'
import type { PlayerValue, ValueByKey } from '@/myteam/playerValue'

/**
 * What a player is worth TONIGHT in a category league.
 *
 * WHY THIS EXISTS AT ALL. The daily page ran every league through `usePointsValue`, which
 * needs scoring weights to turn stats into a number. A category league assigns no weights, so
 * every player came back at 0.0 — and a lineup sorted by all-zero values is not a weak
 * recommendation, it is the slot filler breaking ties in roster order wearing the costume of
 * one. The page said "we can't rank these yet" and it was telling the truth.
 *
 * WHAT REPLACES THE POINT TOTAL. A category league has no exchange rate between a stolen base
 * and a strikeout; you win a column by having more of it than the man opposite, so the
 * currency is STANDARD DEVIATIONS. That machinery already exists and is tested —
 * `computeRosterValue` scores exactly this, side-aware, with ratio categories volume-weighted
 * so a three-inning ERA cannot win a column. None of it was reachable from the daily page.
 * This composable is the join, not a second implementation.
 *
 * THE ONE GENUINELY NEW PIECE IS THE DIVISOR. Everything upstream answers "what is he worth
 * this season". Tonight is a different question, and the difference is not cosmetic: a
 * starting pitcher's season value is earned over roughly thirty starts and an everyday
 * hitter's over a hundred and fifty games, so ranking the two on season value puts every
 * starter above every hitter — the same arithmetic that once made the top forty forty
 * pitchers. Dividing by projected GAMES puts both on a per-appearance footing, which is what
 * a manager filling one seat tonight is actually choosing between.
 */

/** The shape the daily path consumes, so nothing downstream has to know which league this is. */
export interface DailyCategoryValue {
  valueByKey: ComputedRef<ValueByKey>
  /** False until the projection universe has loaded — the page must not call 0.0 a ranking. */
  ready: ComputedRef<boolean>
  load: () => void
}

/**
 * Games a player is projected to appear in, which is what separates tonight from the season.
 *
 * Absent is NOT one. A player we could not match to a projection has an unknown schedule, and
 * defaulting him to a single game would divide his season value by one and rocket him to the
 * top of tonight's board — the loudest possible answer drawn from the least information. He
 * returns zero, and a zero-game player is scored at zero rather than at infinity.
 */
export function gamesFor(fg: FGProjection | null | undefined): number {
  if (!fg) return 0
  const side = fg.player_type === 'pitcher' ? 'pit' : 'hit'
  const g = projectedGames(fg, side)
  return Number.isFinite(g) && g > 0 ? g : 0
}

/**
 * Lift a set of per-game category values so the lowest sits at zero.
 *
 * PER GAME FIRST, THEN SHIFT THE WHOLE SCALE.
 *
 * A category value is a sum of z-scores, so roughly half of any pool is NEGATIVE — a
 * replaceable body genuinely does sit below the average of the population he is measured
 * against. That is a true statement about him and a destructive one downstream, in two
 * separate ways. `assignSlots` fills seats down to a bar of zero, so a negative player loses
 * his seat to nobody and the optimal lineup comes back short. And `useDailyLineup` scores a
 * man with no game at exactly 0, which would rank him ABOVE every negative player who is
 * actually playing — precisely inverting the one thing this page exists to say.
 *
 * Adding a constant preserves every ordering, and ordering is the whole content of a category
 * ranking. It has to be added to the PER-GAME number rather than the season total: a constant
 * on the season total becomes a different amount per game for a hundred-and-fifty-game hitter
 * than for a thirty-start pitcher, which would silently re-rank the two groups against each
 * other.
 *
 * Returns per-game rates keyed as they came in. A player absent from the input is absent from
 * the output rather than defaulted — an unknown rate is not a zero one.
 */
export function shiftToNonNegative(perGame: Map<string, number>): Map<string, number> {
  let min = 0
  for (const v of perGame.values()) if (v < min) min = v
  const out = new Map<string, number>()
  for (const [k, v] of perGame) out.set(k, v - min)
  return out
}

export function useDailyCategoryValue(inputs: {
  /** Rostered players across the whole league, with ESPN's stats keyed by statId. */
  pool: Ref<Array<{ playerKey: string; position: string; stats: Record<string, number> }>>
  freeAgents: Ref<Array<{ playerKey: string; position?: string; stats?: Record<string, number> }>>
  /** The league's own columns, which is the only place the categories can come from. */
  categories: Ref<CategoryDef[]>
  cats: Ref<Array<{ statId: string; lowerIsBetter: boolean }>>
  fgByKey: Ref<Record<string, FGProjection | null>>
  enabled: Ref<boolean>
}): DailyCategoryValue {
  const baselineSvc = useValueBaseline()

  const lowerBetterByStatId = computed(() => {
    const m = new Map<string, boolean>()
    for (const c of inputs.cats.value) m.set(c.statId, c.lowerIsBetter)
    return m
  })
  const labelOf = (statId: string) =>
    inputs.categories.value.find((c) => c.statId === statId)?.label || statId

  /*
   * The league's columns, classified. Identical construction to useToday's — deliberately, so
   * a player's value on the daily page and his value on every other page are the same number.
   * A board that quietly disagrees with the rest of the app about who is good is worse than
   * one that says nothing.
   */
  const catSpecs = computed<CatSpec[]>(() => {
    const findStatId = (names: string[]): string | undefined => {
      for (const c of inputs.categories.value) {
        const label = (c.label || c.name || '').toUpperCase().trim()
        if (names.includes(label)) return c.statId
      }
      return undefined
    }
    const ipStatId = findStatId(['IP', 'INNINGS PITCHED'])
    const abStatId = findStatId(['AB', 'AT BATS', 'PA', 'PLATE APPEARANCES'])
    return inputs.categories.value.map((c) => {
      const lower = lowerBetterByStatId.value.get(c.statId) ?? false
      const { side, isRatio } = classifyCategory(c.label || c.name || c.statId, lower)
      return {
        statId: c.statId,
        lowerIsBetter: lower,
        side,
        isRatio,
        volumeStatId: resolveVolumeStatId(isRatio, side, ipStatId, abStatId),
      }
    })
  })

  const baseline = computed(() =>
    baselineSvc.ready.value && catSpecs.value.length
      ? baselineSvc.build(catSpecs.value, labelOf)
      : null,
  )

  /*
   * Standardise against ALL of MLB, not against this league's rosters.
   *
   * Measured against the pool alone, "elite" degrades to "better than the people already
   * taken", which in a deep league compresses a genuine star down into the crowd and in a
   * shallow one inflates a replaceable body into a must-start. The universe baseline is the
   * same one the Wire and My Team rank against — and the same zClamp, so an outlier's real
   * categories register at full size instead of being flattened at three deviations.
   */
  const contributions = computed(() => {
    if (!inputs.enabled.value || !baseline.value || !catSpecs.value.length) return []
    const rostered: ValuePoolPlayer[] = inputs.pool.value.map((p) => ({
      playerKey: p.playerKey,
      position: p.position,
      stats: p.stats,
    }))
    /* Free agents are scored beside rostered players because on any given night the best
       available body is frequently unowned, and the rankings panel shows both. */
    const free: ValuePoolPlayer[] = inputs.freeAgents.value.map((p) => ({
      playerKey: p.playerKey,
      position: p.position ?? '',
      stats: p.stats ?? {},
    }))
    const all = [...rostered, ...free]
    if (!all.length) return []
    return computeRosterValue(all, all.map((p) => p.playerKey), catSpecs.value, {
      baseline: baseline.value,
      zClamp: 8,
    })
  })

  const valueByKey = computed<ValueByKey>(() => {
    const raw = new Map<string, number>()
    for (const c of contributions.value) {
      const games = gamesFor(inputs.fgByKey.value[c.playerKey] ?? null)
      /* No projected games means no known schedule, not a one-game season — see gamesFor. */
      if (games > 0) raw.set(c.playerKey, c.valueScore / games)
    }
    const rates = shiftToNonNegative(raw)

    const out: ValueByKey = {}
    for (const c of contributions.value) {
      const games = gamesFor(inputs.fgByKey.value[c.playerKey] ?? null)
      const rate = rates.get(c.playerKey) ?? 0
      out[c.playerKey] = {
        /* total/games is what the daily path reads back out, so total carries the shift. */
        total: rate * games,
        games,
        perStat: {},
        side: c.role === 'pitcher' ? 'pit' : 'hit',
        weeklyCap: c.role === 'pitcher' ? 1.3 : 6.5,
      } as PlayerValue
    }
    return out
  })

  const ready = computed(() =>
    inputs.enabled.value && !!baseline.value && contributions.value.length > 0,
  )

  return { valueByKey, ready, load: () => baselineSvc.load() }
}
