<script setup lang="ts">
/**
 * Where you finish in every column — the scoreboard a category draft is actually played on.
 *
 * WHY THIS IS THE CENTREPIECE AND THE BOARD IS NOT. A points draft can be won off a ranked
 * list, because value there is additive and context-free. A category league is won by taking
 * more COLUMNS than the man opposite, so third of ten in all nine of them takes none. That
 * means the question on the clock is never "who is the best player left" — it is "which column
 * am I losing, and who fixes it". No ranked list can answer that, and until now nothing on the
 * page even asked it.
 *
 * CLICKING A COLUMN CONCEDES IT. Punting is the largest edge in the format and it has to be one
 * gesture, because it is a decision taken on a pick clock. Conceding drops the column out of
 * every valuation immediately and the board re-sorts behind it.
 */
import { computed } from 'vue'
import type { LedgerColumn } from '@/hockey/categoryLedger'
import type { PuntSuggestion } from '@/hockey/puntAdvisor'

const props = defineProps<{
  ledger: LedgerColumn[]
  punted: Set<string>
  advice: PuntSuggestion[]
}>()
const emit = defineEmits<{ (e: 'toggle', key: string): void }>()

const TONE: Record<LedgerColumn['status'], string> = {
  winning: 'text-[#7ee787] border-[#7ee787]/40',
  tossup: 'text-[#e69a4a] border-[#e69a4a]/40',
  losing: 'text-[#FF5C5C] border-[#FF5C5C]/40',
  punted: 'text-dark-textMuted/40 border-dark-border',
}
const BAR: Record<LedgerColumn['status'], string> = {
  winning: 'bg-[#7ee787]', tossup: 'bg-[#e69a4a]',
  losing: 'bg-[#FF5C5C]', punted: 'bg-dark-border',
}

/** Columns won, which is the only number the format is scored on. */
const won = computed(() => props.ledger.filter((c) => c.status === 'winning').length)
const live = computed(() => props.ledger.filter((c) => c.status !== 'punted').length)
const need = computed(() => Math.floor(live.value / 2) + 1)

/*
 * A fill proportional to where you sit, not to the raw figure. The raw totals are in nine
 * different units — save percentage beside blocked shots — so a bar drawn from them would
 * compare nothing to nothing.
 */
const fill = (c: LedgerColumn) => `${Math.round(((c.of - c.rank) / Math.max(1, c.of - 1)) * 100)}%`

const top = computed(() => props.advice[0] ?? null)
</script>

<template>
  <section v-if="ledger.length" class="rounded-xl border border-dark-border bg-dark-card p-4">
    <div class="mb-3 flex flex-wrap items-baseline justify-between gap-2">
      <h2 class="font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">
        Your columns
        <span class="font-mono text-[10px] normal-case text-dark-textMuted/70">
          &middot; where you finish if the draft ended
        </span>
      </h2>
      <span class="font-mono text-[11px]"
            :class="won >= need ? 'text-[#7ee787]' : 'text-[#e69a4a]'">
        {{ won }} of {{ live }} &middot; need {{ need }}
      </span>
    </div>

    <div class="space-y-1">
      <button v-for="c in ledger" :key="c.key" type="button"
              class="flex w-full items-center gap-3 rounded-lg border px-2.5 py-1.5 text-left transition-colors hover:bg-dark-bg/50"
              :class="TONE[c.status]"
              :title="c.status === 'punted' ? `Contest ${c.key} again` : `Concede ${c.key}`"
              @click="emit('toggle', c.key)">
        <span class="w-14 shrink-0 font-mono text-[11px] font-bold uppercase"
              :class="c.status === 'punted' ? 'line-through' : ''">{{ c.key }}</span>
        <span class="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-dark-bg">
          <span class="block h-full rounded-full transition-all" :class="BAR[c.status]"
                :style="{ width: fill(c) }"></span>
        </span>
        <span class="w-12 shrink-0 text-right font-mono text-[11px]">
          {{ c.rank }}<span class="text-dark-textMuted/50">/{{ c.of }}</span>
        </span>
      </button>
    </div>

    <p class="mt-2 font-mono text-[9px] text-dark-textMuted/50">
      click a column to concede it &mdash; the board re-prices immediately
    </p>

    <!--
      The punt is offered with its argument attached, never applied on its own. A tool that
      silently reshapes the board mid-draft is one a manager cannot check on a pick clock, and
      the whole value of the advice is that you can disagree with it.
    -->
    <div v-if="top" class="mt-3 rounded-lg border border-[#e69a4a]/40 bg-[#e69a4a]/5 px-3 py-2">
      <p class="font-mono text-[11px] text-[#e69a4a]">
        Consider conceding {{ top.concede.join(' + ') }}
      </p>
      <p class="mt-1 font-mono text-[10px] text-dark-textMuted">
        You sit
        <template v-for="(t, i) in top.standing" :key="t.key">
          <span v-if="i">, </span>{{ t.rank }}/{{ t.of }} in {{ t.key }}</template>.
        Simulated out, conceding wins <b class="text-dark-text">{{ top.ifPunt }}</b> columns
        against <b class="text-dark-text">{{ top.ifContest }}</b> contesting
        <template v-if="top.improves.length"> &mdash; helps {{ top.improves.join(', ') }}</template>.
      </p>
      <button type="button"
              class="mt-1.5 rounded border border-[#e69a4a]/50 px-2 py-0.5 font-mono text-[10px] text-[#e69a4a] transition-colors hover:bg-[#e69a4a]/15"
              @click="top.concede.forEach((k) => emit('toggle', k))">
        concede {{ top.concede.join(' + ') }}
      </button>
      <p class="mt-1.5 font-mono text-[9px] text-dark-textMuted/50">
        a comparison between two simulated drafts, not a forecast of your season
      </p>
    </div>
  </section>
</template>
