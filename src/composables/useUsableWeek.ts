import { computed, ref, watch, type Ref } from 'vue'
import { getNhlWeekNights } from '@/services/nhlSchedule'
import { openNights, usableFor, type Night, type SkaterSlots, type UsableRosterPlayer, type SkaterPos } from '@/hockey/usableGames'
import { weekBounds, remainingNights } from '@/hockey/usableWeek'

export function useUsableWeek(roster: Ref<UsableRosterPlayer[]>, slots: Ref<SkaterSlots>) {
  const nights = ref<Night[]>([])
  const ready = ref(false)
  const { from, to } = weekBounds(new Date())
  getNhlWeekNights(from, to).then(({ nights: n, failed }) => {
    nights.value = remainingNights(n, from)
    ready.value = !failed && nights.value.some((x) => x.teams.size > 0)
  })
  const open = computed(() => openNights(roster.value, slots.value, nights.value))
  const scoreOf = (p: { team: string; positions: SkaterPos[]; rate: number }) =>
    ready.value && p.positions.length ? usableFor(p, nights.value, open.value) : null
  return { ready, nights, open, scoreOf }
}
