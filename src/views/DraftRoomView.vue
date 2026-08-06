<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDraftRoom } from '@/composables/useDraftRoom'
import { nflTeamLogo } from '@/players/nflTeamLogo'

const {
  status, loading, board, recommendation, myPick, myNextPick, isMyTurn,
  currentOverallPick, hasHistory, myPicks, starterSlots, draftedKeys,
  markDrafted, unmarkDrafted, syncHealthy, refresh, shape,
} = useDraftRoom()

type Tab = 'pick' | 'board' | 'room' | 'last'
const tab = ref<Tab>('pick')
const TABS: { id: Tab; label: string }[] = [
  { id: 'pick', label: 'Pick' },
  { id: 'board', label: 'Board' },
  { id: 'room', label: 'Room' },
  { id: 'last', label: "Won't Last" },
]

const round = (n: number) => Math.round(n)
const pct = (n: number) => `${Math.round(n * 100)}%`
const teamLogo = (abbr?: string) => nflTeamLogo(abbr)
const onImgErr = (e: Event) => ((e.target as HTMLElement).style.display = 'none')

/** Pick label like 2.04 — how drafters actually refer to picks. */
const pickLabel = computed(() => {
  const p = myPick.value ?? currentOverallPick.value
  const teams = shape.value?.teams ?? 12
  const r = Math.ceil(p / teams)
  const inRound = ((p - 1) % teams) + 1
  return `${r}.${String(inRound).padStart(2, '0')}`
})

const topBoard = computed(() => board.value.slice(0, 60))
const wontLast = computed(() =>
  board.value.filter((r) => r.survival < 0.7).slice(0, 25),
)
const safeUntilNext = computed(() =>
  board.value.filter((r) => r.survival >= 0.7).slice(0, 12),
)

/** Roster holes: starting slots not yet filled, with the best available at each. */
const holes = computed(() => {
  const bySlot: Record<string, number> = {}
  for (const p of myPicks.value) {
    const pos = String((p as any)?.metadata?.position ?? '').toUpperCase()
    if (pos) bySlot[pos] = (bySlot[pos] ?? 0) + 1
  }
  const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']
  return positions.map((pos) => ({
    pos,
    have: bySlot[pos] ?? 0,
    best: board.value.find((r) => r.position === pos) ?? null,
  }))
})
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-6">
    <header class="mb-4 flex items-end justify-between gap-3">
      <div>
        <h1 class="font-display text-2xl font-bold text-dark-text">Draft Room</h1>
        <p class="font-mono text-xs text-dark-textMuted">
          <template v-if="status === 'drafting'">
            pick {{ pickLabel }}<span v-if="isMyTurn" class="text-primary"> · you're on the clock</span>
          </template>
          <template v-else>your board, your league, your opponents</template>
        </p>
      </div>
      <button
        v-if="status === 'drafting'"
        @click="refresh"
        class="shrink-0 rounded-lg border border-dark-border px-3 py-1.5 font-mono text-[11px] text-dark-textMuted hover:text-dark-text"
      >
        refresh
      </button>
    </header>

    <!-- Gates -->
    <div v-if="status === 'unsupported-league'" class="rounded-xl border border-dark-border bg-dark-card px-4 py-16 text-center">
      <p class="font-display text-sm font-semibold text-dark-text">Sleeper football only</p>
      <p class="mt-1 font-mono text-xs text-dark-textMuted">The Draft Room reads live picks from Sleeper. ESPN and Yahoo support is coming.</p>
    </div>

    <div v-else-if="status === 'unsupported-type'" class="rounded-xl border border-dark-border bg-dark-card px-4 py-16 text-center">
      <p class="font-display text-sm font-semibold text-dark-text">Auction drafts aren't supported yet</p>
      <p class="mt-1 font-mono text-xs text-dark-textMuted">Pick-order math doesn't apply to an auction — budgets replace draft slots. Snake and linear drafts work.</p>
    </div>

    <div v-else-if="status === 'no-draft'" class="rounded-xl border border-dark-border bg-dark-card px-4 py-16 text-center">
      <p class="font-display text-sm font-semibold text-dark-text">No draft found for this league</p>
      <p class="mt-1 font-mono text-xs text-dark-textMuted">Once Sleeper creates the draft, it'll show up here.</p>
    </div>

    <div v-else-if="loading && !board.length" class="py-16 text-center text-dark-textMuted">Building your board…</div>

    <template v-else>
      <!-- Say plainly when the model is working with less than it wants -->
      <p v-if="!hasHistory" class="mb-3 rounded-lg border border-dark-border bg-dark-card px-3 py-2 font-mono text-[11px] text-dark-textMuted">
        No past drafts loaded for this league — opponent reads use league-average behavior, not your managers'.
      </p>
      <p v-if="!syncHealthy" class="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 font-mono text-[11px] text-amber-300">
        Live sync is failing. Mark players drafted yourself on the Board tab — the recommendation keeps working.
      </p>
      <p v-if="status === 'pre-draft'" class="mb-3 rounded-lg border border-dark-border bg-dark-card px-3 py-2 font-mono text-[11px] text-dark-textMuted">
        Draft hasn't started. This is your prep board — survival reads activate once picks begin.
      </p>
      <p v-if="status === 'complete'" class="mb-3 rounded-lg border border-dark-border bg-dark-card px-3 py-2 font-mono text-[11px] text-dark-textMuted">
        This draft is complete.
      </p>

      <!-- Tabs -->
      <div class="mb-4 flex gap-1 border-b border-dark-border">
        <button
          v-for="t in TABS" :key="t.id" @click="tab = t.id"
          class="px-3 py-2 font-mono text-xs transition-colors"
          :class="tab === t.id ? 'border-b-2 border-primary text-primary' : 'text-dark-textMuted hover:text-dark-text'"
        >{{ t.label }}</button>
      </div>

      <!-- PICK -->
      <section v-if="tab === 'pick'">
        <div v-if="!recommendation" class="py-12 text-center font-mono text-xs text-dark-textMuted">No players left to recommend.</div>
        <template v-else>
          <div class="mb-4 rounded-xl border border-primary/40 bg-dark-card p-4">
            <p class="mb-2 font-mono text-[10px] uppercase tracking-wide text-primary">take</p>
            <div class="mb-3 flex items-center gap-3">
              <img v-if="recommendation.pick.headshot" :src="recommendation.pick.headshot" :alt="recommendation.pick.name" @error="onImgErr" class="h-12 w-12 shrink-0 rounded-full bg-dark-border object-cover" />
              <div class="min-w-0">
                <p class="truncate font-display text-xl font-bold text-dark-text">{{ recommendation.pick.name }}</p>
                <p class="flex items-center gap-1 font-mono text-xs text-dark-textMuted">
                  {{ recommendation.pick.position }}
                  <template v-if="recommendation.pick.proTeam">
                    · <img :src="teamLogo(recommendation.pick.proTeam)" alt="" @error="onImgErr" class="h-3 w-3 object-contain" />{{ recommendation.pick.proTeam }}
                  </template>
                  <span v-if="recommendation.pick.flag === 'value'" class="ml-1 rounded bg-emerald-500/15 px-1 py-0.5 text-[9px] uppercase text-emerald-400">value</span>
                  <span v-else-if="recommendation.pick.flag === 'reach'" class="ml-1 rounded bg-amber-500/15 px-1 py-0.5 text-[9px] uppercase text-amber-400">reach</span>
                </p>
              </div>
            </div>
            <ul class="space-y-1.5">
              <li v-for="(r, i) in recommendation.reasons" :key="i" class="flex gap-2 font-mono text-[11px] text-dark-textMuted">
                <span class="text-primary">·</span><span>{{ r.text }}</span>
              </li>
            </ul>
          </div>

          <section v-if="recommendation.alternates.length" class="rounded-xl border border-dark-border bg-dark-card p-4">
            <h2 class="mb-3 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">Alternates</h2>
            <div v-for="a in recommendation.alternates" :key="a.row.playerKey" class="flex items-center gap-3 border-b border-dark-border/40 py-2 last:border-0">
              <span class="min-w-0 flex-1">
                <span class="truncate text-sm font-semibold text-dark-text">{{ a.row.name }}</span>
                <span class="block font-mono text-[10px] text-dark-textMuted">{{ a.row.position }} · {{ a.note }}</span>
              </span>
              <span class="shrink-0 text-right font-mono text-sm text-dark-text">{{ round(a.row.score) > 0 ? '+' : '' }}{{ round(a.row.score) }}</span>
            </div>
          </section>
        </template>
      </section>

      <!-- BOARD -->
      <section v-else-if="tab === 'board'" class="rounded-xl border border-dark-border bg-dark-card p-4">
        <p class="mb-3 font-mono text-[10px] text-dark-textMuted">tap a row to mark drafted · tier breaks shown</p>
        <template v-for="(r, i) in topBoard" :key="r.playerKey">
          <div
            v-if="i > 0 && topBoard[i - 1].position === r.position && topBoard[i - 1].tier !== r.tier"
            class="my-1 border-t border-dashed border-dark-border/70"
          />
          <button
            @click="markDrafted(r.playerKey)"
            class="flex w-full items-center gap-3 border-b border-dark-border/40 py-2 text-left last:border-0 hover:bg-dark-border/20"
          >
            <span class="w-6 shrink-0 font-mono text-[10px] text-dark-textMuted">{{ i + 1 }}</span>
            <span class="min-w-0 flex-1">
              <span class="truncate text-sm font-semibold text-dark-text">
                {{ r.name }}
                <span v-if="r.flag === 'value'" class="ml-1 rounded bg-emerald-500/15 px-1 py-0.5 font-mono text-[9px] uppercase text-emerald-400">value</span>
                <span v-else-if="r.flag === 'reach'" class="ml-1 rounded bg-amber-500/15 px-1 py-0.5 font-mono text-[9px] uppercase text-amber-400">reach</span>
              </span>
              <span class="block font-mono text-[10px] text-dark-textMuted">
                {{ r.position }} · tier {{ r.tier }}<template v-if="r.adp !== null"> · adp {{ round(r.adp) }}</template>
              </span>
            </span>
            <span class="w-14 shrink-0 text-right font-mono text-xs text-dark-textMuted">{{ pct(r.survival) }}</span>
            <span class="w-12 shrink-0 text-right font-mono text-sm font-bold text-dark-text">{{ round(r.score) }}</span>
          </button>
        </template>
      </section>

      <!-- ROOM -->
      <section v-else-if="tab === 'room'" class="rounded-xl border border-dark-border bg-dark-card p-4">
        <h2 class="mb-1 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">Your roster</h2>
        <p class="mb-3 font-mono text-[10px] text-dark-textMuted">{{ myPicks.length }} picked · {{ starterSlots }} starting slots</p>
        <div v-for="h in holes" :key="h.pos" class="flex items-center gap-3 border-b border-dark-border/40 py-2 last:border-0">
          <span class="w-12 shrink-0 font-mono text-[11px] uppercase text-dark-textMuted">{{ h.pos }}</span>
          <span class="w-8 shrink-0 font-mono text-sm" :class="h.have ? 'text-dark-text' : 'text-[#FF5C5C]'">{{ h.have }}</span>
          <span class="min-w-0 flex-1 truncate font-mono text-[11px] text-dark-textMuted">
            <template v-if="h.best">best avail: <span class="text-dark-text">{{ h.best.name }}</span> ({{ round(h.best.score) }})</template>
            <template v-else>—</template>
          </span>
        </div>
      </section>

      <!-- WON'T LAST -->
      <section v-else class="rounded-xl border border-dark-border bg-dark-card p-4">
        <h2 class="mb-1 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">
          Won't last<template v-if="myNextPick"> to {{ myNextPick }}</template>
        </h2>
        <p class="mb-3 font-mono text-[10px] text-dark-textMuted">simulated from how your league actually drafts</p>
        <div v-if="!wontLast.length" class="py-6 text-center font-mono text-xs text-dark-textMuted">Everyone worth taking should still be there.</div>
        <div v-for="r in wontLast" :key="r.playerKey" class="flex items-center gap-3 border-b border-dark-border/40 py-2 last:border-0">
          <span class="min-w-0 flex-1">
            <span class="truncate text-sm font-semibold text-dark-text">{{ r.name }}</span>
            <span class="block font-mono text-[10px] text-dark-textMuted">{{ r.position }} · tier {{ r.tier }}</span>
          </span>
          <span class="shrink-0 font-mono text-sm font-bold text-[#FF5C5C]">{{ pct(1 - r.survival) }}</span>
        </div>

        <template v-if="safeUntilNext.length">
          <h3 class="mb-2 mt-4 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">Should still be there</h3>
          <p class="font-mono text-[11px] text-dark-textMuted">{{ safeUntilNext.map((r) => r.name).join(' · ') }}</p>
        </template>
      </section>
    </template>
  </div>
</template>
