<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useToday } from '@/composables/useToday'
import type { ScoredPlay } from '@/today/todayBoard'

const leagueStore = useLeagueStore()
const { vm, loading, error, load } = useToday()

onMounted(() => load())
watch(() => leagueStore.activeLeagueId, () => load())

const today = computed(() =>
  new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
)

const bar = (bucket: number) => '▓'.repeat(bucket) + '░'.repeat(6 - bucket)

const scoreBar = (score: number) => bar(Math.round((Math.max(0, Math.min(100, score)) / 100) * 6))

function dropLabel(play: ScoredPlay): string | null {
  if (play.noCleanDrop) return 'no clean drop — you’d be cutting into value'
  if (play.drop) return `drop ${play.drop.name} (${play.drop.reason})`
  return null
}

const board = computed(() => vm.value)
const hasNothing = computed(
  () =>
    !board.value.hero &&
    !board.value.openSlots.length &&
    !board.value.streamers.length,
)
// No MLB games at all (off-day / All-Star break) is different from "you have games but
// nothing to change" — keep the two apart so the copy doesn't imply a lineup is optimized
// on a day nobody plays.
const noGames = computed(() => error.value === 'no-games')
const showEmpty = computed(() => noGames.value || (!loading.value && hasNothing.value))
const showFailed = computed(() => error.value === 'failed')

function fillLabel(play: ScoredPlay): string {
  return play.kind === 'startSit' ? `(free) start ${play.name} from your bench` : `add ${play.name}`
}

function reasonLabel(reason: string): string {
  if (reason === 'off-day') return 'off today'
  if (reason === 'injured') return 'injured'
  return 'empty'
}
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 pt-6 pb-20">
    <header class="mb-6">
      <h1 class="font-display text-2xl font-bold text-dark-text">Today</h1>
      <p class="font-mono text-xs text-dark-textMuted">{{ today }}</p>
      <p class="mt-1 font-mono text-xs text-dark-textMuted">
        Stream an arm, plug your holes — win the day.
      </p>
    </header>

    <!-- ── LOADING ─────────────────────────────────────────────────────────── -->
    <!-- `loading` now reflects the full board inputs (schedule + roster + free agents),
         not just the schedule fetch — so this stays up until the board is genuinely ready
         and the empty "you're set" copy can't flash in the gap. -->
    <div v-if="loading && hasNothing && !showFailed" class="py-16 text-center">
      <div class="inline-flex items-center gap-2 font-mono text-xs text-dark-textMuted">
        <span class="h-1.5 w-1.5 animate-ping rounded-full bg-primary"></span>
        Reading today's slate…
      </div>
    </div>

    <!-- ── FAILED ──────────────────────────────────────────────────────────── -->
    <div v-else-if="showFailed" class="py-16 text-center font-mono text-xs text-dark-textMuted">
      Couldn't load today's slate. Try refreshing.
    </div>

    <!-- ── EMPTY — distinguish "no games at all" from "games, but nothing to do" ── -->
    <div v-else-if="showEmpty" class="py-16 text-center text-dark-textMuted">
      <template v-if="noGames">
        No MLB games today — the board lights up when games resume.
      </template>
      <template v-else>
        You're set for today — lineup's optimal.
      </template>
    </div>

    <template v-else>
      <!-- ── HERO: TODAY'S BEST PLAY ─────────────────────────────────────── -->
      <section v-if="board.hero" class="mb-8">
        <h2 class="font-display text-lg font-bold text-dark-text">★ Today's best play</h2>
        <p class="mb-3 font-mono text-xs text-dark-textMuted">The single highest-value move on the board.</p>

        <div class="rounded-xl border border-dark-border bg-dark-card px-4 py-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="truncate text-base font-semibold text-dark-text">{{ board.hero.name }}</span>
                <span class="shrink-0 font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">
                  {{ board.hero.team }} · {{ board.hero.position }}
                </span>
              </div>
              <div class="mt-1 font-mono text-xs text-dark-textMuted">{{ board.hero.detail }}</div>
              <div class="mt-2 flex flex-wrap items-center gap-2 font-mono text-sm text-primary">
                <span>{{ scoreBar(board.hero.score) }}</span>
                <span v-for="c in board.hero.helpsCats" :key="c"
                  class="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-primary">{{ c }}</span>
              </div>
              <p v-if="dropLabel(board.hero)" class="mt-2 font-mono text-[11px] text-dark-textMuted">
                → add {{ board.hero.name }} · {{ dropLabel(board.hero) }}
              </p>
              <p v-else-if="board.hero.oneDay" class="mt-2 font-mono text-[10px] text-dark-textMuted">
                one-day stream · drop tomorrow
              </p>
            </div>
            <div class="shrink-0 text-right">
              <div class="font-display text-2xl font-bold text-primary tabular-nums">{{ board.hero.score }}</div>
              <router-link
                v-if="board.hero.kind !== 'startSit'"
                to="/players"
                class="mt-1 inline-block font-mono text-[10px] text-dark-textMuted underline-offset-2 hover:text-dark-text hover:underline"
              >→ Wire</router-link>
            </div>
          </div>
        </div>
      </section>

      <!-- ── YOUR OPEN SLOTS ─────────────────────────────────────────────── -->
      <section v-if="board.openSlots.length" class="mb-8">
        <h2 class="font-display text-lg font-bold text-dark-text">Your open slots</h2>
        <p class="mb-3 font-mono text-xs text-dark-textMuted">Holes in today's active lineup.</p>

        <div class="rounded-xl border border-dark-border bg-dark-card divide-y divide-dark-border/40">
          <div v-for="slot in board.openSlots" :key="slot.slot" class="px-4 py-3">
            <div class="flex items-center gap-3">
              <span class="w-14 shrink-0 font-mono text-sm font-semibold text-dark-text">{{ slot.slot }}</span>
              <span class="shrink-0 font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">
                {{ reasonLabel(slot.reason) }}
              </span>
              <span v-if="slot.vacating" class="min-w-0 flex-1 truncate font-mono text-[10px] text-dark-textMuted">
                was {{ slot.vacating.name }}
              </span>
            </div>

            <div v-if="slot.fill" class="mt-2 flex items-center justify-between gap-3 pl-[4.5rem]">
              <div class="min-w-0">
                <span class="truncate text-sm text-primary">{{ fillLabel(slot.fill) }}</span>
                <span v-if="slot.fill.kind !== 'startSit'" class="ml-2 font-mono text-xs text-dark-textMuted">
                  {{ scoreBar(slot.fill.score) }}
                </span>
              </div>
              <router-link
                v-if="slot.fill.kind !== 'startSit'"
                to="/players"
                class="shrink-0 font-mono text-[10px] text-dark-textMuted underline-offset-2 hover:text-dark-text hover:underline"
              >→ Wire</router-link>
            </div>
            <div v-else class="mt-2 pl-[4.5rem] font-mono text-[10px] text-dark-textMuted">
              nothing available to fill this today
            </div>
            <p v-if="slot.fill && slot.fill.kind !== 'startSit' && dropLabel(slot.fill)" class="mt-1 pl-[4.5rem] font-mono text-[11px] text-dark-textMuted">
              · {{ dropLabel(slot.fill) }}
            </p>
          </div>
        </div>
      </section>

      <!-- ── STREAMING ────────────────────────────────────────────────────── -->
      <section v-if="board.streamers.length" class="mb-8">
        <h2 class="font-display text-lg font-bold text-dark-text">Streaming</h2>
        <p class="mb-3 font-mono text-xs text-dark-textMuted">Best arms on the wire today.</p>

        <div class="rounded-xl border border-dark-border bg-dark-card divide-y divide-dark-border/40">
          <div v-for="p in board.streamers" :key="p.playerKey" class="px-4 py-3">
            <div class="flex items-center gap-3">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="truncate text-sm font-semibold text-dark-text">{{ p.name }}</span>
                  <span class="shrink-0 font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">
                    {{ p.team }} · {{ p.position }}
                  </span>
                  <span v-for="c in p.helpsCats" :key="c"
                    class="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-primary">{{ c }}</span>
                </div>
                <div class="mt-0.5 font-mono text-[10px] text-dark-textMuted">{{ p.detail }}</div>
              </div>
              <span class="shrink-0 font-mono text-sm text-primary">{{ scoreBar(p.score) }}</span>
              <span class="shrink-0 font-mono text-sm font-bold text-primary tabular-nums">{{ p.score }}</span>
              <router-link to="/players"
                class="shrink-0 font-mono text-[10px] text-dark-textMuted underline-offset-2 hover:text-dark-text hover:underline">→ Wire</router-link>
            </div>
            <p v-if="dropLabel(p)" class="mt-1.5 font-mono text-[11px] text-dark-textMuted">
              → add {{ p.name }} · {{ dropLabel(p) }}
            </p>
          </div>
        </div>
      </section>

      <!-- ── UPGRADE TODAY ───────────────────────────────────────────────── -->
      <section v-if="board.upgrades.length || board.sitAlerts.length" class="mb-8">
        <h2 class="font-display text-lg font-bold text-dark-text">Upgrade today</h2>
        <p class="mb-3 font-mono text-xs text-dark-textMuted">Better plays than what's already in your lineup.</p>

        <div class="rounded-xl border border-dark-border bg-dark-card divide-y divide-dark-border/40">
          <div v-for="p in board.sitAlerts" :key="'sit-' + p.playerKey" class="px-4 py-3 flex items-center gap-3">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="truncate text-sm font-semibold text-dark-text">{{ p.name }}</span>
                <span class="shrink-0 font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">
                  {{ p.team }} · {{ p.position }}
                </span>
                <span
                  class="shrink-0 font-mono text-[9px] uppercase tracking-wider"
                  :style="{ color: '#e0625a' }"
                >sit alert</span>
              </div>
              <div class="mt-0.5 font-mono text-[10px]" :style="{ color: '#e0625a' }">{{ p.detail }}</div>
            </div>
            <span class="shrink-0 font-mono text-sm" :style="{ color: '#e0625a' }">{{ bar(p.bucket) }}</span>
          </div>

          <div v-for="p in board.upgrades" :key="'up-' + p.playerKey" class="px-4 py-3">
            <div class="flex items-center gap-3">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="truncate text-sm font-semibold text-dark-text">{{ p.name }}</span>
                  <span class="shrink-0 font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">
                    {{ p.team }} · {{ p.position }}
                  </span>
                  <span v-for="c in p.helpsCats" :key="c"
                    class="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-primary">{{ c }}</span>
                </div>
                <div class="mt-0.5 font-mono text-[10px] text-dark-textMuted">{{ p.detail }}</div>
              </div>
              <span class="shrink-0 font-mono text-sm text-primary">{{ scoreBar(p.score) }}</span>
              <span class="shrink-0 font-mono text-sm font-bold text-primary tabular-nums">{{ p.score }}</span>
              <router-link
                v-if="p.kind !== 'startSit'"
                to="/players"
                class="shrink-0 font-mono text-[10px] text-dark-textMuted underline-offset-2 hover:text-dark-text hover:underline"
              >→ Wire</router-link>
            </div>
            <p v-if="dropLabel(p)" class="mt-1.5 font-mono text-[11px] text-dark-textMuted">
              → add {{ p.name }} · {{ dropLabel(p) }}
            </p>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
