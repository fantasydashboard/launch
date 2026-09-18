<script setup lang="ts">
/**
 * The hockey draft board.
 *
 * A MOCK BOARD, AND IT SAYS SO. Nothing here syncs with ESPN's draft room — taking a player
 * marks him gone locally so the board re-prices without him. That is the honest description
 * of what it does, and the header says it rather than letting a reader assume their real
 * draft is being tracked.
 *
 * The one number worth understanding is the left-hand column. Players are ordered by value
 * over REPLACEMENT, not by projected points, and in hockey those disagree constantly: a
 * defenceman competes for a seat that is far cheaper to fill badly than a forward's, so he
 * can rank above forwards who outscore him. Both numbers are on every row so the
 * disagreement is visible rather than something to take on faith.
 */
import { computed, ref, watchEffect } from 'vue'
import { useHockeyBoard } from '@/composables/useHockeyBoard'

const {
  loading, problem, rules, rows, replacement, unnamedScoredStatIds,
  mode, categoryKeys, perCategoryByKey,
  drafted, take, undo, reset, load,
} = useHockeyBoard()

const isCategories = computed(() => mode.value === 'categories')

/* The second column is a different quantity in each mode and must not wear the same label.
   In a points league it is projected points; in a category league it is a sum of z-scores,
   which is a number of standard deviations and means nothing if read as points. */
const ownLabel = computed(() => (isCategories.value ? 'z' : 'pts'))
const ownHint = computed(() =>
  isCategories.value
    ? 'His own total across the league\'s categories, in standard deviations'
    : 'His own projected points in this league\'s scoring',
)
const valueHint = 'Value over replacement — what he\'s worth above the last startable player at his seat'

/* Two decimals for z-scores, whole numbers for points: rounding a z to the nearest integer
   would collapse most of a draft board into three distinct values. */
const shown2 = (n: number | undefined) =>
  isCategories.value ? (n ?? 0).toFixed(2) : String(Math.round(n ?? 0))

/* A signed number, so a best column that happens to be negative reads "-0.3" rather than
   "+-0.3". It happens: a player can lead his own profile in a column he is still below
   average in, which is exactly the case worth showing honestly. */
const signed = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}`

/** The columns a player is best and worst in, for the one-line reason on his row. */
function edge(playerKey: string): string {
  const per = perCategoryByKey.value[playerKey]
  if (!per) return ''
  const sorted = Object.entries(per).sort((a, b) => b[1] - a[1])
  if (!sorted.length) return ''
  const [bestKey, bestZ] = sorted[0]
  const [worstKey, worstZ] = sorted[sorted.length - 1]
  if (sorted.length === 1 || worstZ >= 0) return `${bestKey} ${signed(bestZ)}`
  return `${bestKey} ${signed(bestZ)} · ${worstKey} ${signed(worstZ)}`
}

const POSITIONS = ['ALL', 'C', 'LW', 'RW', 'D', 'G'] as const
const filter = ref<(typeof POSITIONS)[number]>('ALL')
const LIMIT = 60

const shown = computed(() =>
  (filter.value === 'ALL' ? rows.value : rows.value.filter((r) => r.position === filter.value))
    .slice(0, LIMIT),
)
/* Names, not ESPN's numeric ids. The chips are how you undo a misclick, and "4233563 x" is
   not something anybody can undo with confidence. Kept as a map built from every row we have
   ever seen, because a player drops off `rows` the moment he is taken. */
const nameCache = new Map<string, string>()
watchEffect(() => { for (const r of rows.value) nameCache.set(r.playerKey, r.name) })
const takenList = computed(() =>
  [...drafted.value].map((key) => ({ key, name: nameCache.get(key) ?? key })),
)

/* Tone by position so the eye can group a board that mixes five of them. */
const POS_TONE: Record<string, string> = {
  C: 'text-[#7ee787]', LW: 'text-[#3fb950]', RW: 'text-[#56d364]',
  D: 'text-[#7FC8FF]', G: 'text-[#e69a4a]',
}
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-6">
    <header class="mb-4">
      <h1 class="font-display text-2xl font-bold text-dark-text">Hockey draft board</h1>
      <p class="font-mono text-xs text-dark-textMuted">
        Ranked by value over replacement &middot; a mock board, nothing is synced to your draft
      </p>
      <p v-if="rules" class="mt-1 font-mono text-[11px] text-dark-textMuted/70">
        {{ rules.name }} &middot; {{ rules.teams }} teams &middot; {{ rules.scoringType }}
        &middot; {{ Object.entries(rules.slots).map(([s, n]) => `${n} ${s}`).join(' · ') }}
      </p>
    </header>

    <div v-if="loading" class="py-16 text-center font-mono text-sm text-dark-textMuted">
      Building the board&hellip;
    </div>

    <!-- A stated reason, never an empty board with no explanation. -->
    <div v-else-if="problem" class="rounded-xl border border-[#e69a4a]/30 bg-[#e69a4a]/5 p-4">
      <p class="font-mono text-xs text-[#e69a4a]">{{ problem }}</p>
      <button class="mt-3 rounded-lg border border-dark-border px-3 py-1.5 font-mono text-[11px] text-dark-text hover:border-primary"
              @click="load()">Try again</button>
    </div>

    <template v-else>
      <!--
        The gap, said out loud. If the league pays for a stat we cannot identify, every total
        on this page is short by whatever it was worth — and a board that hides that looks
        exactly like one with nothing missing.
      -->
      <p v-if="unnamedScoredStatIds.length"
         class="mb-3 rounded-lg border border-[#e69a4a]/30 bg-[#e69a4a]/5 px-3 py-2 font-mono text-[11px] text-[#e69a4a]">
        This league scores {{ unnamedScoredStatIds.length }} stats we can't yet identify
        (ESPN ids {{ unnamedScoredStatIds.join(', ') }}). Every total below is short by whatever
        they're worth.
      </p>

      <!--
        A category league is priced in a different currency, and saying so is not decoration:
        a reader who assumes these are points will read a 6.2 as a bad season rather than as
        an excellent one.
      -->
      <p v-if="isCategories" class="mb-3 rounded-lg border border-dark-border bg-dark-card px-3 py-2 font-mono text-[11px] text-dark-textMuted">
        Category league. Players are measured in standard deviations across
        {{ categoryKeys.length }} columns &mdash; {{ categoryKeys.join(', ') }} &mdash; not in
        points. A column everybody is level in is worth nothing here however big its numbers.
      </p>

      <div class="mb-3 flex flex-wrap items-center gap-2">
        <button v-for="p in POSITIONS" :key="p"
                class="rounded-lg border px-2.5 py-1 font-mono text-[11px] uppercase transition-colors"
                :class="filter === p ? 'border-primary text-primary' : 'border-dark-border text-dark-textMuted hover:text-dark-text'"
                @click="filter = p">{{ p }}</button>
        <span class="flex-1"></span>
        <span class="font-mono text-[11px] text-dark-textMuted">{{ takenList.length }} taken</span>
        <button v-if="takenList.length" class="rounded-lg border border-dark-border px-2.5 py-1 font-mono text-[11px] text-dark-textMuted hover:text-dark-text"
                @click="reset()">reset</button>
      </div>

      <p class="mb-1 flex items-center gap-3 font-mono text-[9px] uppercase tracking-wider text-dark-textMuted/60">
        <span class="w-7"></span><span class="w-8">pos</span><span class="flex-1">player</span>
        <span class="w-14 text-right" :title="valueHint">vor</span>
        <span class="w-14 text-right" :title="ownHint">{{ ownLabel }}</span>
        <span class="w-14"></span>
      </p>

      <div v-for="(r, i) in shown" :key="r.playerKey"
           class="flex items-center gap-3 border-b border-dark-border/40 py-2 text-sm last:border-0">
        <span class="w-7 shrink-0 text-right font-mono text-[10px] text-dark-textMuted/60">{{ i + 1 }}</span>
        <span class="w-8 shrink-0 font-mono text-[10px]" :class="POS_TONE[r.position]">{{ r.position }}</span>
        <span class="min-w-0 flex-1 truncate">
          <span class="text-dark-text">{{ r.name }}</span>
          <span v-if="isCategories && edge(r.playerKey)"
                class="ml-2 font-mono text-[10px] text-dark-textMuted/70">{{ edge(r.playerKey) }}</span>
        </span>
        <span class="w-14 shrink-0 text-right font-mono text-xs font-semibold text-dark-text">{{ shown2(r.value) }}</span>
        <span class="w-14 shrink-0 text-right font-mono text-xs text-dark-textMuted">{{ shown2(r.projected) }}</span>
        <button class="w-14 shrink-0 rounded border border-dark-border px-1.5 py-0.5 font-mono text-[10px] text-dark-textMuted hover:border-primary hover:text-primary"
                @click="take(r.playerKey)">take</button>
      </div>

      <p v-if="rows.length > LIMIT" class="mt-2 font-mono text-[10px] text-dark-textMuted">
        showing {{ shown.length }} of {{ rows.length }}
      </p>

      <!-- Replacement is the reason the order is what it is, so it belongs on the page. -->
      <div v-if="Object.keys(replacement).length" class="mt-5 rounded-xl border border-dark-border bg-dark-card p-3">
        <p class="font-mono text-[9px] uppercase tracking-widest text-dark-textMuted/70">replacement level</p>
        <p class="mt-1 font-mono text-[11px] text-dark-textMuted">
          <span v-for="(v, pool) in replacement" :key="pool" class="mr-4">{{ pool }} {{ shown2(v) }}</span>
        </p>
        <p class="mt-1 font-mono text-[10px] text-dark-textMuted/60">
          The last startable player at each seat. A defenceman outranking a higher-scoring
          forward is this number doing its job, not a mistake.
        </p>
      </div>

      <div v-if="takenList.length" class="mt-4">
        <p class="font-mono text-[9px] uppercase tracking-widest text-dark-textMuted/70">taken</p>
        <div class="mt-1 flex flex-wrap gap-1.5">
          <button v-for="t in takenList" :key="t.key"
                  class="rounded border border-dark-border px-2 py-0.5 font-mono text-[10px] text-dark-textMuted hover:border-[#FF5C5C] hover:text-[#FF5C5C]"
                  title="Put him back" @click="undo(t.key)">{{ t.name }} &times;</button>
        </div>
      </div>
    </template>
  </div>
</template>
