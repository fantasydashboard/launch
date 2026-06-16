import { ref, computed, watch, type Ref } from 'vue'
import { mergePoint, projectedSegment, type TrendPoint } from '@/myteam/winProbTrend'

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/**
 * Captures the matchup win-probability once per day (to localStorage, keyed by
 * league + week) and exposes the actual history + the flat projected tail. The
 * history is real — it only contains days the page was actually viewed — so the
 * solid line grows over the week instead of fabricating a past. See
 * src/myteam/winProbTrend.ts for the honesty rationale.
 */
export function useWinProbTrend(opts: {
  leagueId: Ref<string | null | undefined>
  week: Ref<number>
  my: Ref<number>
  opp: Ref<number>
  daysRemaining: Ref<number>
  ready: Ref<boolean> // snapshot loaded and not completed
}) {
  const points = ref<TrendPoint[]>([])
  const weekEnd = ref<string>('')

  const storageKey = () => `ufd_wptrend_${opts.leagueId.value ?? ''}_${opts.week.value}`

  function readStored(): TrendPoint[] {
    if (typeof localStorage === 'undefined') return []
    try {
      const raw = localStorage.getItem(storageKey())
      const parsed = raw ? JSON.parse(raw) : []
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  function capture() {
    if (!opts.ready.value || !opts.leagueId.value) return
    const today = new Date()
    const merged = mergePoint(readStored(), {
      date: ymd(today),
      my: Math.round(opts.my.value),
      opp: Math.round(opts.opp.value),
    })
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(storageKey(), JSON.stringify(merged))
      } catch {
        /* quota / private mode — the chart still renders from in-memory points */
      }
    }
    points.value = merged
    const end = new Date(today)
    end.setDate(end.getDate() + Math.max(0, opts.daysRemaining.value))
    weekEnd.value = ymd(end)
  }

  watch(
    [opts.ready, opts.leagueId, opts.week, opts.my, opts.opp, opts.daysRemaining],
    capture,
    { immediate: true },
  )

  const projected = computed(() =>
    projectedSegment(points.value.length ? points.value[points.value.length - 1] : null, weekEnd.value),
  )

  return { points, projected, weekEnd }
}
