<script setup lang="ts">
/**
 * Inline "add / edit a past season" form for the League History page. Collapsed to one
 * quiet affordance; expands to a champions-only fast path with an optional full-standings
 * disclosure. Writes via saveManualSeason and emits `saved` so the parent reloads history.
 *
 * ADD mode: pick a missing year (< firstYear, not already present).
 * EDIT mode: parent passes a `prefill` HistorySeason (the caller's own manual row); the
 * season is fixed and fields are populated from it. Save upserts (updates the own row).
 */
import { computed, reactive, ref, watch } from 'vue'
import type { HistorySeason } from '@/history/types'
import { buildManualSeason, type ManualStandingRow } from '@/history/manualSeason'
import { saveManualSeason } from '@/services/historySnapshots'

const props = defineProps<{
  snapshotKey: string
  platform: string
  sport: string
  firstYear: number
  activeSeason: number
  existingSeasons: number[]
  prefill: HistorySeason | null
  canWrite: boolean
}>()

const emit = defineEmits<{ (e: 'saved'): void; (e: 'cancel-edit'): void }>()

const open = ref(false)
const editMode = computed(() => !!props.prefill)

const form = reactive({
  season: 0,
  champion: '',
  runnerUp: '',
  showStandings: false,
  standings: [] as ManualStandingRow[],
})
const saving = ref(false)
const errorMsg = ref('')

// Candidate years for ADD: the 15 years before firstYear, minus any already on record.
const candidateYears = computed(() => {
  const base = props.firstYear || props.activeSeason
  if (!base) return []
  const taken = new Set(props.existingSeasons)
  const years: number[] = []
  for (let y = base - 1; y >= base - 15; y--) if (!taken.has(y)) years.push(y)
  return years
})

function resetForm() {
  form.season = candidateYears.value[0] ?? 0
  form.champion = ''
  form.runnerUp = ''
  form.showStandings = false
  form.standings = [
    { name: '', wins: undefined, losses: undefined, ties: undefined },
    { name: '', wins: undefined, losses: undefined, ties: undefined },
  ]
  errorMsg.value = ''
}

// Populate from a prefill (edit mode): reconstruct champions-only vs standings.
function populateFromPrefill(season: HistorySeason) {
  const teams = [...season.teams].sort((a, b) => a.rank - b.rank)
  const hasRecords = teams.length > 2 || teams.some((t) => t.wins || t.losses || t.ties)
  form.season = season.season
  errorMsg.value = ''
  if (hasRecords) {
    form.showStandings = true
    form.standings = teams.map((t) => ({ name: t.teamName, wins: t.wins, losses: t.losses, ties: t.ties }))
    form.champion = teams[0]?.teamName ?? ''
    form.runnerUp = ''
  } else {
    form.showStandings = false
    form.champion = teams[0]?.teamName ?? ''
    form.runnerUp = teams[1]?.teamName ?? ''
    form.standings = [
      { name: '', wins: undefined, losses: undefined, ties: undefined },
      { name: '', wins: undefined, losses: undefined, ties: undefined },
    ]
  }
}

// Open + populate when a prefill arrives; close when it clears.
watch(
  () => props.prefill,
  (p) => {
    if (p) {
      open.value = true
      populateFromPrefill(p)
    }
  },
  { immediate: true },
)

function expand() {
  resetForm()
  open.value = true
}
function cancel() {
  open.value = false
  errorMsg.value = ''
  if (editMode.value) emit('cancel-edit')
}
function addStandingRow() {
  form.standings.push({ name: '', wins: undefined, losses: undefined, ties: undefined })
}

const canSubmit = computed(() => {
  if (!form.season) return false
  if (form.showStandings) return form.standings.some((r) => r.name.trim())
  return !!form.champion.trim()
})

async function submit() {
  if (!canSubmit.value || saving.value) return
  errorMsg.value = ''
  saving.value = true
  try {
    const season = buildManualSeason({
      season: form.season,
      champion: form.champion,
      runnerUp: form.runnerUp,
      standings: form.showStandings ? form.standings : undefined,
    })
    const res = await saveManualSeason({
      key: props.snapshotKey,
      platform: props.platform,
      sport: props.sport,
      activeSeason: props.activeSeason,
      season,
    })
    if (res.ok) {
      open.value = false
      if (editMode.value) emit('cancel-edit')
      emit('saved')
      return
    }
    errorMsg.value =
      res.reason === 'auth'
        ? 'Sign in to add history.'
        : res.reason === 'conflict'
          ? "That season's already on record."
          : "Couldn't save right now — try again."
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mb-6">
    <!-- Not signed in → a muted hint, no form. -->
    <p
      v-if="!canWrite"
      class="rounded-lg border border-dark-border/50 bg-dark-card px-3 py-2 font-mono text-[11px] text-dark-textMuted"
    >
      Sign in to add seasons from before {{ firstYear }}.
    </p>

    <!-- Collapsed affordance (only when there are earlier years to add). -->
    <button
      v-else-if="!open && candidateYears.length"
      class="font-mono text-[11px] text-dark-textMuted transition-colors hover:text-dark-text"
      @click="expand"
    >
      ⊕ Add a season before {{ firstYear }}
    </button>

    <!-- Expanded form. -->
    <div
      v-else-if="open"
      class="rounded-xl border border-dark-border bg-dark-card px-4 py-4"
    >
      <div class="mb-3 flex items-center justify-between">
        <h3 class="font-display text-sm font-bold text-dark-text">
          {{ editMode ? 'Edit season ' + form.season : 'Add a past season' }}
        </h3>
        <button class="font-mono text-[11px] text-dark-textMuted hover:text-dark-text" @click="cancel">
          cancel
        </button>
      </div>

      <!-- Season selector (fixed in edit mode). -->
      <div class="mb-3 flex items-center gap-2">
        <label class="w-20 font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">Season</label>
        <span v-if="editMode" class="font-mono text-sm text-dark-text">{{ form.season }}</span>
        <select
          v-else
          v-model.number="form.season"
          class="rounded-lg border border-dark-border bg-dark-bg px-2.5 py-1 font-mono text-[12px] text-dark-text focus:border-dark-textMuted focus:outline-none"
        >
          <option v-for="y in candidateYears" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>

      <!-- Champions-only fast path. -->
      <template v-if="!form.showStandings">
        <div class="mb-2 flex items-center gap-2">
          <label class="w-20 shrink-0 font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">Champion</label>
          <input
            v-model="form.champion"
            type="text"
            placeholder="Team name"
            class="min-w-0 flex-1 rounded-lg border border-dark-border bg-dark-bg px-2.5 py-1 font-mono text-[12px] text-dark-text focus:border-dark-textMuted focus:outline-none"
          />
          <span class="shrink-0 font-mono text-[11px] text-primary">★</span>
        </div>
        <div class="mb-3 flex items-center gap-2">
          <label class="w-20 shrink-0 font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">Runner-up</label>
          <input
            v-model="form.runnerUp"
            type="text"
            placeholder="Optional"
            class="min-w-0 flex-1 rounded-lg border border-dark-border bg-dark-bg px-2.5 py-1 font-mono text-[12px] text-dark-text focus:border-dark-textMuted focus:outline-none"
          />
        </div>
        <button
          class="mb-3 font-mono text-[11px] text-dark-textMuted transition-colors hover:text-dark-text"
          @click="form.showStandings = true"
        >
          ▸ Add full standings (optional)
        </button>
      </template>

      <!-- Full standings. -->
      <template v-else>
        <div class="mb-1 flex items-center justify-between">
          <span class="font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">Full standings (1 = champion)</span>
          <button
            class="font-mono text-[11px] text-dark-textMuted hover:text-dark-text"
            @click="form.showStandings = false"
          >
            ▾ champions only
          </button>
        </div>
        <div
          v-for="(row, i) in form.standings"
          :key="i"
          class="mb-1.5 flex items-center gap-1.5"
        >
          <span class="w-5 shrink-0 text-center font-mono text-[12px] text-dark-textMuted">{{ i + 1 }}</span>
          <input
            v-model="row.name"
            type="text"
            placeholder="Team name"
            class="min-w-0 flex-1 rounded-lg border border-dark-border bg-dark-bg px-2 py-1 font-mono text-[12px] text-dark-text focus:border-dark-textMuted focus:outline-none"
          />
          <input v-model.number="row.wins" type="number" min="0" placeholder="W"
            class="w-11 shrink-0 rounded-lg border border-dark-border bg-dark-bg px-1.5 py-1 text-center font-mono text-[12px] text-dark-text focus:border-dark-textMuted focus:outline-none" />
          <input v-model.number="row.losses" type="number" min="0" placeholder="L"
            class="w-11 shrink-0 rounded-lg border border-dark-border bg-dark-bg px-1.5 py-1 text-center font-mono text-[12px] text-dark-text focus:border-dark-textMuted focus:outline-none" />
          <input v-model.number="row.ties" type="number" min="0" placeholder="T"
            class="w-11 shrink-0 rounded-lg border border-dark-border bg-dark-bg px-1.5 py-1 text-center font-mono text-[12px] text-dark-text focus:border-dark-textMuted focus:outline-none" />
          <span v-if="i === 0" class="shrink-0 font-mono text-[12px]">🏆</span>
          <span v-else class="w-4 shrink-0" />
        </div>
        <button
          class="mb-3 font-mono text-[11px] text-dark-textMuted transition-colors hover:text-dark-text"
          @click="addStandingRow"
        >
          ⊕ add team
        </button>
      </template>

      <!-- Error + actions -->
      <p v-if="errorMsg" class="mb-2 font-mono text-[11px] text-[#e0625a]">{{ errorMsg }}</p>
      <div class="flex items-center gap-2">
        <button
          class="rounded-lg px-3 py-1.5 font-mono text-[12px] font-bold transition-opacity disabled:opacity-40"
          :style="{ backgroundColor: 'var(--color-primary, #C6FF3A)', color: '#10130a' }"
          :disabled="!canSubmit || saving"
          @click="submit"
        >
          {{ saving ? 'Saving…' : 'Save season' }}
        </button>
        <span class="font-mono text-[10px] text-dark-textMuted">
          Hand-entered — you can edit or remove what you add.
        </span>
      </div>
    </div>
  </div>
</template>
