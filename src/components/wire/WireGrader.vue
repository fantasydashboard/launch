<script setup lang="ts">
import { ref, computed } from 'vue'
import Avatar from '@/components/trades/Avatar.vue'
import ValueBadge from '@/components/trades/ValueBadge.vue'

interface Pick {
  key: string
  name: string
  pos: string
  headshot?: string
  proLogo?: string
  value: number
  onIL?: boolean
  trend?: number
}
interface GradeResult {
  deltaEcw: number
  verdict: { label: string; tone: 'up' | 'flat' | 'down' }
  add: Pick | null
  drop: Pick | null
  fit: { label: string; pct: number }[]
  holdsLabels: string[]
  valueGap: number
  ilWarning: boolean
}

const props = defineProps<{
  adds: Pick[]
  drops: Pick[]
  grade: (addKey: string | null, dropKey: string | null) => GradeResult | null
}>()

const open = ref(false)
const addSel = ref<string | null>(null)
const dropSel = ref<string | null>(null)
const filter = ref('')

const toggleAdd = (k: string) => (addSel.value = addSel.value === k ? null : k)
const toggleDrop = (k: string) => (dropSel.value = dropSel.value === k ? null : k)

const filteredAdds = computed(() => {
  const q = filter.value.trim().toLowerCase()
  const list = q ? props.adds.filter((p) => p.name.toLowerCase().includes(q)) : props.adds
  return list.slice(0, 60)
})

const result = computed(() => props.grade(addSel.value, dropSel.value))

const signed = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}`
const toneClass = (t: 'up' | 'flat' | 'down') =>
  t === 'up' ? 'text-primary' : t === 'down' ? 'text-[#f26d6d]' : 'text-dark-textSecondary'
const onLogoError = (e: Event) => {
  ;(e.target as HTMLImageElement).style.display = 'none'
}
</script>

<template>
  <section class="rounded-xl border border-dark-border bg-dark-card">
    <!-- collapsible header -->
    <button
      type="button"
      class="flex w-full items-center justify-between px-4 py-3 text-left"
      @click="open = !open"
    >
      <span>
        <span class="font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">Grade a move</span>
        <span class="mt-0.5 block font-mono text-[9px] text-dark-textMuted">
          Pick a player to add and one to drop — see it graded.
        </span>
      </span>
      <span class="font-mono text-[11px] text-dark-textMuted">{{ open ? '−' : '+' }}</span>
    </button>

    <div v-if="open" class="space-y-3 px-4 pb-4">
      <div class="grid gap-3 sm:grid-cols-2">
        <!-- ADD picker -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="font-mono text-[10px] font-bold tracking-wider text-primary">ADD</span>
            <input
              v-model="filter"
              type="text"
              placeholder="filter…"
              class="w-24 rounded border border-dark-border bg-dark-bg px-2 py-0.5 font-mono text-[10px] text-dark-text placeholder:text-dark-textMuted focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>
          <div class="max-h-56 space-y-1 overflow-y-auto pr-1">
            <button
              v-for="p in filteredAdds"
              :key="p.key"
              type="button"
              class="flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors"
              :class="addSel === p.key ? 'border-primary/50 bg-primary/15' : 'border-dark-border bg-dark-bg hover:border-dark-border/80'"
              @click="toggleAdd(p.key)"
            >
              <Avatar :src="p.headshot" :label="p.name" cls="h-6 w-6 rounded-full" />
              <span class="truncate text-[12px] font-semibold text-dark-text">{{ p.name }}</span>
              <img v-if="p.proLogo" :src="p.proLogo" alt="" @error="onLogoError" class="h-3.5 w-3.5 shrink-0 object-contain" />
              <span class="font-mono text-[9px] text-dark-textMuted">{{ p.pos }}</span>
              <span v-if="(p.trend ?? 0) >= 3" class="shrink-0 font-mono text-[9px] text-[#F2B33A]" title="rising ownership this week">▲{{ p.trend }}%</span>
              <span class="ml-auto shrink-0 font-mono text-[10px] text-dark-textMuted">{{ p.value }}</span>
            </button>
            <p v-if="!filteredAdds.length" class="px-2 py-1.5 font-mono text-[10px] text-dark-textMuted">No free agents match.</p>
          </div>
        </div>

        <!-- DROP picker -->
        <div class="space-y-1.5">
          <span class="font-mono text-[10px] font-bold tracking-wider text-dark-textMuted">DROP</span>
          <div class="max-h-56 space-y-1 overflow-y-auto pr-1">
            <button
              v-for="p in props.drops"
              :key="p.key"
              type="button"
              class="flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors"
              :class="dropSel === p.key ? 'border-[#f26d6d]/50 bg-[#f26d6d]/10' : 'border-dark-border bg-dark-bg hover:border-dark-border/80'"
              @click="toggleDrop(p.key)"
            >
              <Avatar :src="p.headshot" :label="p.name" cls="h-6 w-6 rounded-full" />
              <span class="truncate text-[12px] font-semibold text-dark-textSecondary">{{ p.name }}</span>
              <img v-if="p.proLogo" :src="p.proLogo" alt="" @error="onLogoError" class="h-3.5 w-3.5 shrink-0 object-contain" />
              <span class="font-mono text-[9px] text-dark-textMuted">{{ p.pos }}</span>
              <span
                v-if="p.onIL"
                class="rounded border border-[#f2b33a]/50 px-1 font-mono text-[8px] uppercase tracking-wider text-[#f2b33a]"
              >IL</span>
              <span class="ml-auto shrink-0 font-mono text-[10px] text-dark-textMuted">{{ p.value }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- result -->
      <div v-if="result" class="overflow-hidden rounded-xl border border-dark-border bg-dark-bg">
        <div class="flex items-center justify-between border-b border-dark-border/60 px-4 py-2">
          <span class="text-sm font-bold" :class="toneClass(result.verdict.tone)">{{ result.verdict.label }}</span>
          <span class="font-mono text-[13px] font-bold" :class="toneClass(result.verdict.tone)">{{ signed(result.deltaEcw) }} cats/wk</span>
        </div>

        <!-- ADD row -->
        <div v-if="result.add" class="flex items-center gap-2 px-4 pt-2.5">
          <span class="w-10 shrink-0 font-mono text-[10px] font-bold tracking-wider text-primary">ADD</span>
          <Avatar :src="result.add.headshot" :label="result.add.name" cls="h-7 w-7 rounded-full" />
          <span class="font-display text-[14px] font-bold text-dark-text">{{ result.add.name }}</span>
          <img v-if="result.add.proLogo" :src="result.add.proLogo" alt="" @error="onLogoError" class="h-4 w-4 shrink-0 object-contain" />
          <span class="font-mono text-[10px] text-dark-textMuted">{{ result.add.pos }}</span>
          <span class="ml-auto"><ValueBadge :value="result.add.value" /></span>
        </div>

        <!-- fit bars -->
        <div v-if="result.fit.length" class="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 pt-1.5 pl-[56px]">
          <span
            v-for="f in result.fit"
            :key="f.label"
            class="inline-flex items-center gap-1.5 font-mono text-[10px]"
            :title="`${f.label}: ${f.pct}/100 in this category`"
          >
            <span class="text-primary">{{ f.label }}</span>
            <span class="relative h-1 w-8 shrink-0 overflow-hidden rounded-full bg-dark-border">
              <span class="absolute inset-y-0 left-0 rounded-full bg-primary" :style="{ width: f.pct + '%' }" />
            </span>
          </span>
        </div>

        <!-- DROP row -->
        <div v-if="result.drop" class="flex items-center gap-2 px-4 pt-2">
          <span class="w-10 shrink-0 font-mono text-[10px] font-bold tracking-wider text-dark-textMuted">DROP</span>
          <Avatar :src="result.drop.headshot" :label="result.drop.name" cls="h-7 w-7 rounded-full" />
          <span class="text-sm font-semibold text-dark-textSecondary">{{ result.drop.name }}</span>
          <img v-if="result.drop.proLogo" :src="result.drop.proLogo" alt="" @error="onLogoError" class="h-3.5 w-3.5 shrink-0 object-contain" />
          <span class="font-mono text-[10px] text-dark-textMuted">{{ result.drop.pos }}</span>
          <span
            v-if="result.drop.onIL"
            class="rounded border border-[#f2b33a]/50 px-1 font-mono text-[8px] uppercase tracking-wider text-[#f2b33a]"
          >IL</span>
          <span class="ml-auto"><ValueBadge :value="result.drop.value" /></span>
        </div>

        <!-- IL warning -->
        <p v-if="result.ilWarning" class="px-4 pt-1.5 pl-[56px] font-mono text-[10px] text-[#f2b33a]">
          ⚠ On IL — dropping won't open an active roster spot. You'll also need to drop an active player to make the add.
        </p>

        <!-- holds + value gap -->
        <div class="flex flex-wrap items-center gap-x-4 gap-y-0.5 border-t border-dark-border/40 px-4 py-1.5 pl-[56px]">
          <span v-if="result.holdsLabels.length" class="font-mono text-[10px] text-dark-textMuted">
            holds {{ result.holdsLabels.join(' ') }}
          </span>
          <span v-if="result.add && result.drop" class="font-mono text-[10px] text-dark-textMuted">
            value {{ result.drop.value }} → {{ result.add.value }}
          </span>
        </div>
      </div>
      <p v-else class="rounded-lg border border-dashed border-dark-border px-4 py-3 text-center font-mono text-[11px] text-dark-textMuted">
        Pick an add and/or a drop to grade the move.
      </p>
    </div>
  </section>
</template>
