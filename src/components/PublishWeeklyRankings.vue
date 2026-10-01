<!-- src/components/PublishWeeklyRankings.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { publishWeekly, type PublishedWeekly } from '@/services/weeklyRankings'
import { detectListWeek } from '@/football/weeklyBlend'
import { sleeperService } from '@/services/sleeper'

const props = defineProps<{ season: number; published: PublishedWeekly | null; currentWeek?: number }>()
const emit = defineEmits<{ (e: 'published'): void }>()
const status = ref('')
const busy = ref(false)
/* A detected week waiting for the admin's go-ahead; nothing is published until Publish. */
const pending = ref<{ body: string; name: string; week: number; share: number } | null>(null)

const label = computed(() => {
  const p = props.published
  if (!p) return 'No list this week · Sleeper only'
  const when = new Date(p.published_at).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })
  return `Week ${p.week} · ${p.source_name} · published ${when}`
})

const preview = computed(() => {
  const p = pending.value
  if (!p) return ''
  const base = `Week ${p.week} detected (${Math.round(p.share * 100)}% of games matched).`
  const off = props.currentWeek && props.currentWeek !== p.week
    ? ` This is for week ${p.week}; the board is on week ${props.currentWeek}.`
    : ''
  return `${base}${off} Publish?`
})

async function onFile(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  busy.value = true; pending.value = null; status.value = 'Checking which week this file is for…'
  try {
    const body = await file.text()
    const byWeek: Record<number, { home: string; away: string }[]> = {}
    for (let w = 1; w <= 18; w++) {
      byWeek[w] = (await sleeperService.getNflSchedule(String(props.season), w))
        .map((g: any) => ({ home: g.home, away: g.away }))
    }
    if (!Object.values(byWeek).some((g) => g.length)) { status.value = 'Schedule unavailable — try again.'; return }
    const hit = detectListWeek(body, byWeek)
    if (!hit) { status.value = "This file doesn't match any week's schedule. Not published."; return }
    pending.value = { body, name: file.name, week: hit.week, share: hit.share }
    status.value = ''
  } catch (e) {
    console.error('[PublishWeeklyRankings] read failed', e)
    status.value = 'Could not read that file.'
  } finally {
    busy.value = false
    input.value = ''
  }
}

async function confirmPublish() {
  const p = pending.value
  if (!p) return
  busy.value = true
  try {
    const r = await publishWeekly({ sport: 'football', season: props.season, week: p.week, source_name: p.name, body: p.body })
    status.value = r.ok ? `Published for week ${p.week}.` : `Publish failed: ${r.error}`
    pending.value = null
    if (r.ok) emit('published')
  } catch (e) {
    console.error('[PublishWeeklyRankings] publish failed', e)
    status.value = 'Publish failed.'
    pending.value = null
  } finally {
    busy.value = false
  }
}

function cancelPublish() { pending.value = null; status.value = 'Cancelled. Not published.' }
</script>

<template>
  <div class="flex flex-wrap items-center gap-2 font-mono text-[10px] text-dark-textMuted">
    <span>{{ label }}</span>
    <label class="cursor-pointer rounded border border-dark-border px-2 py-0.5 hover:text-dark-text"
           :class="{ 'pointer-events-none opacity-50': busy }">
      Publish weekly rankings
      <input type="file" accept=".csv,text/csv" class="hidden" @change="onFile" />
    </label>
    <template v-if="pending">
      <span class="text-dark-text">{{ preview }}</span>
      <button type="button" class="rounded border border-dark-border px-2 py-0.5 hover:text-dark-text disabled:opacity-50"
              :disabled="busy" @click="confirmPublish">Publish</button>
      <button type="button" class="rounded border border-dark-border px-2 py-0.5 hover:text-dark-text disabled:opacity-50"
              :disabled="busy" @click="cancelPublish">Cancel</button>
    </template>
    <span v-else-if="status">{{ status }}</span>
  </div>
</template>
