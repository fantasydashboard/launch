<!-- src/components/PublishWeeklyRankings.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { publishWeekly, type PublishedWeekly } from '@/services/weeklyRankings'
import { detectListWeek } from '@/football/weeklyBlend'
import { sleeperService } from '@/services/sleeper'

const props = defineProps<{ season: number; published: PublishedWeekly | null }>()
const emit = defineEmits<{ (e: 'published'): void }>()
const status = ref('')
const busy = ref(false)

const label = computed(() => {
  const p = props.published
  if (!p) return 'No list this week · Sleeper only'
  const when = new Date(p.published_at).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })
  return `Week ${p.week} · ${p.source_name} · published ${when}`
})

async function onFile(ev: Event) {
  const file = (ev.target as HTMLInputElement).files?.[0]
  if (!file) return
  busy.value = true; status.value = 'Checking which week this file is for…'
  try {
    const body = await file.text()
    const byWeek: Record<number, { home: string; away: string }[]> = {}
    for (let w = 1; w <= 18; w++) {
      byWeek[w] = (await sleeperService.getNflSchedule(String(props.season), w))
        .map((g: any) => ({ home: g.home, away: g.away }))
    }
    const hit = detectListWeek(body, byWeek)
    if (!hit) { status.value = "This file doesn't match any week's schedule. Not published."; return }
    const r = await publishWeekly({ sport: 'football', season: props.season, week: hit.week, source_name: file.name, body })
    status.value = r.ok ? `Published for week ${hit.week}.` : `Publish failed: ${r.error}`
    if (r.ok) emit('published')
  } finally {
    busy.value = false
    ;(ev.target as HTMLInputElement).value = ''
  }
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2 font-mono text-[10px] text-dark-textMuted">
    <span>{{ label }}</span>
    <label class="cursor-pointer rounded border border-dark-border px-2 py-0.5 hover:text-dark-text"
           :class="{ 'pointer-events-none opacity-50': busy }">
      Publish weekly rankings
      <input type="file" accept=".csv,text/csv" class="hidden" @change="onFile" />
    </label>
    <span v-if="status">{{ status }}</span>
  </div>
</template>
