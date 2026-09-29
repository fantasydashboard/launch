import { computed, watch, type Ref, type ComputedRef } from 'vue'
import { computeMovement, type Movement } from '@/football/rankingMovement'

/**
 * Which way a player's rest-of-season value moved since last week, kept across visits.
 *
 * WHY IT IS STORED AND NOT COMPUTED. There is no historical board to reconstruct: the model
 * projects forward from today's data, so asking it what it thought last Tuesday returns what
 * it thinks now. The only way to know a player moved is to have written down where he was —
 * so the board snapshots itself once per week, and the first week of any season shows no
 * movement at all, correctly.
 *
 * ONE SNAPSHOT PER WEEK, WRITTEN ONCE. Re-writing it on every visit would quietly erase the
 * movement: open the page twice on Thursday and the second visit compares Thursday with
 * Thursday. The key carries the week, and a week that already has a snapshot keeps it.
 */
const KEY = (sport: string, week: number) => `ufd:rosSnap:${sport}:${week}`
const MAX_LOOKBACK = 6

function read(key: string): Record<string, number> | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

export function useRankingMovement(inputs: {
  rows: ComputedRef<{ playerKey: string; vorRos: number }[]> | Ref<{ playerKey: string; vorRos: number }[]>
  week: ComputedRef<number> | Ref<number>
  sport: ComputedRef<string> | Ref<string>
  ready: ComputedRef<boolean> | Ref<boolean>
}) {
  const snapshot = computed<Record<string, number>>(() =>
    Object.fromEntries(inputs.rows.value.map((r) => [r.playerKey, r.vorRos])))

  /* The most recent earlier week we actually have. Not week-1: a manager who skipped a week
     should see movement since the last time the board was recorded, not nothing at all. */
  const previous = computed<Record<string, number> | null>(() => {
    const w = inputs.week.value
    for (let back = 1; back <= MAX_LOOKBACK; back++) {
      const found = read(KEY(inputs.sport.value, w - back))
      if (found && Object.keys(found).length) return found
    }
    return null
  })

  const movement = computed<Record<string, Movement>>(() =>
    inputs.ready.value ? computeMovement(previous.value, snapshot.value) : {})

  /* Written after the comparison is available, and only when this week has nothing yet. */
  watch([() => inputs.ready.value, () => inputs.week.value], () => {
    if (!inputs.ready.value || typeof localStorage === 'undefined') return
    const key = KEY(inputs.sport.value, inputs.week.value)
    if (read(key)) return
    const rows = snapshot.value
    if (Object.keys(rows).length < 20) return   // a half-loaded board is not a week
    try { localStorage.setItem(key, JSON.stringify(rows)) } catch { /* private mode */ }
  }, { immediate: true })

  const hasHistory = computed(() => !!previous.value)
  return { movement, hasHistory }
}
