import { computed, ref, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { getNhlSeasonWindow, type NhlSeasonWindow } from '@/services/nhlSchedule'

/**
 * Which part of the season it is, so the daily page can stop pretending it is always October.
 *
 * THE BUG THIS EXISTS FOR. Today is built around tonight's slate. On a night with no games
 * every block on it is correctly empty, and the page falls back to one line: "no games today
 * — the board lights up when games resume". In late September that sentence is actively
 * misleading. Nothing is resuming; the season has not begun. Three real hockey leagues all
 * rendered a blank page with that line on it, and the honest reading of a blank page is that
 * the product is broken.
 *
 * A dark night inside the season and a night before the season has started are different
 * states that happen to have the same number of games, and they deserve different pages.
 *
 * SCOPE. Hockey only, deliberately. Baseball's daily board has the same shape and the same
 * latent problem, but its milestones come from a different feed (mlbSchedule), and inventing
 * a phase for it from the NHL's calendar would be worse than leaving it alone. `phase` is
 * 'unknown' for every other sport, and 'unknown' renders exactly what shipped before.
 */
export type SeasonPhase = 'before' | 'regular' | 'after' | 'unknown'

/** Local YYYY-MM-DD. Not toISOString(), which is UTC and rolls a day early all evening. */
export function localYmd(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Whole days from `from` to `to`, both YYYY-MM-DD. Negative when `to` is in the past. */
export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00`)
  const b = Date.parse(`${to}T00:00:00`)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0
  return Math.round((b - a) / 86_400_000)
}

export function phaseOf(today: string, w: NhlSeasonWindow | null): SeasonPhase {
  if (!w?.regularSeasonStart) return 'unknown'
  if (today < w.regularSeasonStart) return 'before'
  if (w.regularSeasonEnd && today > w.regularSeasonEnd) return 'after'
  return 'regular'
}

export function useSeasonPhase() {
  const leagueStore = useLeagueStore()
  const window = ref<NhlSeasonWindow | null>(null)
  const loaded = ref(false)
  const today = ref(localYmd())

  const isHockey = computed(() => leagueStore.activeSport === 'hockey')

  async function load() {
    if (!isHockey.value) { loaded.value = true; return }
    window.value = await getNhlSeasonWindow(today.value)
    loaded.value = true
  }

  const phase = computed<SeasonPhase>(() =>
    isHockey.value ? phaseOf(today.value, window.value) : 'unknown')

  /** Days until the first regular-season game. 0 means it starts today. */
  const daysUntilStart = computed(() => {
    const start = window.value?.regularSeasonStart
    return start && phase.value === 'before' ? daysBetween(today.value, start) : null
  })

  /** How the wait reads in a sentence, without making the reader do the arithmetic. */
  const startsWhen = computed(() => {
    const n = daysUntilStart.value
    if (n == null) return ''
    if (n <= 0) return 'today'
    if (n === 1) return 'tomorrow'
    return `in ${n} days`
  })

  /** Long form of the opening date, for the line under the headline. */
  const startDateLabel = computed(() => {
    const s = window.value?.regularSeasonStart
    if (!s) return ''
    const d = new Date(`${s}T12:00:00`)
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  })

  /** Games on opening night — a concrete number beats "the season starts soon". */
  const openingGames = computed(() => {
    const s = window.value?.regularSeasonStart
    if (!s) return 0
    return window.value?.days.find((d) => d.date === s)?.games ?? 0
  })

  watch(() => leagueStore.activeLeagueId, () => { loaded.value = false; load() })

  return { phase, window, loaded, load, daysUntilStart, startsWhen, startDateLabel, openingGames, today }
}
