<script setup lang="ts">
import { computed, onMounted, reactive, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useToday } from '@/composables/useToday'
import type { ScoredPlay } from '@/today/todayBoard'
import { mlbTeamLogo } from '@/players/mlbTeamLogo'

const leagueStore = useLeagueStore()
const { vm, loading, error, load, isPoints, budget } = useToday()

// Today is a daily-optimizer built for baseball's game-by-game slate. Football is weekly, not
// daily, so the nav hides this tab for football leagues — but a direct nav to /today should still
// show a graceful, sport-appropriate message instead of the baseball framing.
const isFootball = computed(() => leagueStore.activeSport === 'football')

onMounted(() => load())
watch(() => leagueStore.activeLeagueId, () => load())

const today = computed(() =>
  new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
)

const bar = (bucket: number) => '▓'.repeat(bucket) + '░'.repeat(6 - bucket)

const scoreBar = (score: number) => bar(Math.round((Math.max(0, Math.min(100, score)) / 100) * 6))

const moveBar = (p: ScoredPlay) => scoreBar(p.barPct ?? p.score)
const scoreText = (p: ScoredPlay) => (isPoints.value ? `${Math.round(p.score)} pts` : String(p.score))

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

// Team-logo <img> load failure → hide the broken image (mirrors PointsWireView.vue's onLogoErr).
const onLogoErr = (e: Event) => ((e.target as HTMLElement).style.display = 'none')
// Headshot <img> load failure → fall back to the neutral placeholder circle by swapping which
// element renders, mirroring the v-if/v-else pattern used elsewhere for a missing headshot.
// Keyed by playerKey (not object identity) so the flag survives the board's re-computation.
const brokenHeadshots = reactive(new Set<string>())
function onHeadshotErr(playerKey: string) {
  brokenHeadshots.add(playerKey)
}
function hasHeadshot(play: ScoredPlay): boolean {
  return !!play.headshot && !brokenHeadshots.has(play.playerKey)
}

function reasonLabel(reason: string): string {
  if (reason === 'off-day') return 'off today'
  if (reason === 'injured') return 'injured'
  return 'empty'
}

const budgetBanner = computed(() => {
  const b = budget.value
  if (b.kind === 'count') return `${b.remaining} of ${b.limit} adds left ${b.period === 'week' ? 'this week' : 'this season'}`
  if (b.kind === 'faab') return b.budget != null ? `$${b.remaining} of $${b.budget} FAAB left` : `$${b.remaining} FAAB left`
  return null
})
function budgetTagText(p: ScoredPlay): string | null {
  if (p.budgetTag === 'worth-add') return '✓ worth an add'
  if (p.budgetTag === 'worth-bid') return 'worth a bid'
  if (p.budgetTag === 'save-add') return budget.value.kind === 'faab' ? 'no FAAB budget left' : 'save your add'
  return null
}
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 pt-6 pb-20">
    <header class="mb-6">
      <h1 class="font-display text-2xl font-bold text-dark-text">Today</h1>
      <p class="font-mono text-xs text-dark-textMuted">{{ today }}</p>
      <p class="mt-1 font-mono text-xs text-dark-textMuted">
        <template v-if="isFootball">Weekly, not daily — football lives on My Team, The Wire, and Matchup.</template>
        <template v-else>Stream an arm, plug your holes — win the day.</template>
      </p>
    </header>

    <p v-if="budgetBanner" class="mb-4 font-mono text-[11px] uppercase tracking-wider text-dark-textMuted">
      {{ budgetBanner }}
    </p>

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
      <template v-if="isFootball">
        No daily board for football — head to My Team or The Wire.
      </template>
      <template v-else-if="noGames">
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
            <div class="flex min-w-0 items-start gap-3">
              <img v-if="hasHeadshot(board.hero)" :src="board.hero.headshot" :alt="board.hero.name" loading="lazy"
                class="h-10 w-10 shrink-0 rounded-full bg-dark-border object-cover" @error="onHeadshotErr(board.hero.playerKey)" />
              <span v-else class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-dark-border font-mono text-[10px] text-dark-textMuted">{{ board.hero.position }}</span>
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <span class="truncate text-base font-semibold text-dark-text">{{ board.hero.name }}</span>
                  <span class="flex shrink-0 items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">
                    {{ board.hero.position }} · <img :src="mlbTeamLogo(board.hero.team)" alt="" loading="lazy" @error="onLogoErr" class="h-3 w-3 object-contain" /> {{ board.hero.team }}
                  </span>
                </div>
                <div class="mt-1 font-mono text-xs text-dark-textMuted">{{ board.hero.detail }}</div>
                <div class="mt-2 flex flex-wrap items-center gap-2 font-mono text-sm text-primary">
                  <span>{{ moveBar(board.hero) }}</span>
                  <span v-for="c in board.hero.helpsCats" :key="c"
                    class="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-primary">{{ c }}</span>
                </div>
                <p v-if="dropLabel(board.hero)" class="mt-2 font-mono text-[11px] text-dark-textMuted">
                  → add {{ board.hero.name }} · {{ dropLabel(board.hero) }}
                  <span v-if="budgetTagText(board.hero)" class="ml-2 font-mono text-[10px]"
                    :class="board.hero.budgetTag === 'save-add' ? 'text-dark-textMuted' : 'text-primary'">{{ budgetTagText(board.hero) }}</span>
                </p>
                <p v-else-if="board.hero.oneDay" class="mt-2 font-mono text-[10px] text-dark-textMuted">
                  one-day stream · drop tomorrow
                </p>
              </div>
            </div>
            <div class="shrink-0 text-right">
              <div class="font-display text-2xl font-bold text-primary tabular-nums">{{ scoreText(board.hero) }}</div>
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

            <div v-if="slot.fill" class="mt-2 flex items-start gap-2 pl-[4.5rem]">
              <img v-if="hasHeadshot(slot.fill)" :src="slot.fill.headshot" :alt="slot.fill.name" loading="lazy"
                class="mt-0.5 h-6 w-6 shrink-0 rounded-full bg-dark-border object-cover" @error="onHeadshotErr(slot.fill.playerKey)" />
              <span v-else class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-dark-border font-mono text-[8px] text-dark-textMuted">{{ slot.fill.position }}</span>
              <div class="min-w-0 flex-1">
                <div class="flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <span class="truncate text-sm text-primary">{{ fillLabel(slot.fill) }}</span>
                    <span v-if="slot.fill.kind !== 'startSit'" class="ml-2 font-mono text-xs text-dark-textMuted">
                      {{ moveBar(slot.fill) }}
                    </span>
                  </div>
                  <router-link
                    v-if="slot.fill.kind !== 'startSit'"
                    to="/players"
                    class="shrink-0 font-mono text-[10px] text-dark-textMuted underline-offset-2 hover:text-dark-text hover:underline"
                  >→ Wire</router-link>
                </div>
                <div class="flex items-center gap-1 font-mono text-[10px] text-dark-textMuted">
                  {{ slot.fill.position }} · <img :src="mlbTeamLogo(slot.fill.team)" alt="" loading="lazy" @error="onLogoErr" class="h-3 w-3 object-contain" /> {{ slot.fill.team }}
                </div>
              </div>
            </div>
            <div v-else class="mt-2 pl-[4.5rem] font-mono text-[10px] text-dark-textMuted">
              nothing available to fill this today
            </div>
            <p v-if="slot.fill && slot.fill.kind !== 'startSit' && dropLabel(slot.fill)" class="mt-1 pl-[4.5rem] font-mono text-[11px] text-dark-textMuted">
              · {{ dropLabel(slot.fill) }}
              <span v-if="budgetTagText(slot.fill)" class="ml-2 font-mono text-[10px]"
                :class="slot.fill.budgetTag === 'save-add' ? 'text-dark-textMuted' : 'text-primary'">{{ budgetTagText(slot.fill) }}</span>
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
              <img v-if="hasHeadshot(p)" :src="p.headshot" :alt="p.name" loading="lazy"
                class="h-7 w-7 shrink-0 rounded-full bg-dark-border object-cover" @error="onHeadshotErr(p.playerKey)" />
              <span v-else class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-dark-border font-mono text-[9px] text-dark-textMuted">{{ p.position }}</span>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="truncate text-sm font-semibold text-dark-text">{{ p.name }}</span>
                  <span class="flex shrink-0 items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">
                    {{ p.position }} · <img :src="mlbTeamLogo(p.team)" alt="" loading="lazy" @error="onLogoErr" class="h-3 w-3 object-contain" /> {{ p.team }}
                  </span>
                  <span v-for="c in p.helpsCats" :key="c"
                    class="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-primary">{{ c }}</span>
                </div>
                <div class="mt-0.5 font-mono text-[10px] text-dark-textMuted">{{ p.detail }}</div>
              </div>
              <span class="shrink-0 font-mono text-sm text-primary">{{ moveBar(p) }}</span>
              <span class="shrink-0 font-mono text-sm font-bold text-primary tabular-nums">{{ scoreText(p) }}</span>
              <router-link to="/players"
                class="shrink-0 font-mono text-[10px] text-dark-textMuted underline-offset-2 hover:text-dark-text hover:underline">→ Wire</router-link>
            </div>
            <p v-if="dropLabel(p)" class="mt-1.5 font-mono text-[11px] text-dark-textMuted">
              → add {{ p.name }} · {{ dropLabel(p) }}
              <span v-if="budgetTagText(p)" class="ml-2 font-mono text-[10px]"
                :class="p.budgetTag === 'save-add' ? 'text-dark-textMuted' : 'text-primary'">{{ budgetTagText(p) }}</span>
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
              <img v-if="hasHeadshot(p)" :src="p.headshot" :alt="p.name" loading="lazy"
                class="h-7 w-7 shrink-0 rounded-full bg-dark-border object-cover" @error="onHeadshotErr(p.playerKey)" />
              <span v-else class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-dark-border font-mono text-[9px] text-dark-textMuted">{{ p.position }}</span>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="truncate text-sm font-semibold text-dark-text">{{ p.name }}</span>
                  <span class="flex shrink-0 items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">
                    {{ p.position }} · <img :src="mlbTeamLogo(p.team)" alt="" loading="lazy" @error="onLogoErr" class="h-3 w-3 object-contain" /> {{ p.team }}
                  </span>
                  <span v-for="c in p.helpsCats" :key="c"
                    class="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-primary">{{ c }}</span>
                </div>
                <div class="mt-0.5 font-mono text-[10px] text-dark-textMuted">{{ p.detail }}</div>
              </div>
              <span class="shrink-0 font-mono text-sm text-primary">{{ moveBar(p) }}</span>
              <span class="shrink-0 font-mono text-sm font-bold text-primary tabular-nums">{{ scoreText(p) }}</span>
              <router-link
                v-if="p.kind !== 'startSit'"
                to="/players"
                class="shrink-0 font-mono text-[10px] text-dark-textMuted underline-offset-2 hover:text-dark-text hover:underline"
              >→ Wire</router-link>
            </div>
            <p v-if="dropLabel(p)" class="mt-1.5 font-mono text-[11px] text-dark-textMuted">
              → add {{ p.name }} · {{ dropLabel(p) }}
              <span v-if="budgetTagText(p)" class="ml-2 font-mono text-[10px]"
                :class="p.budgetTag === 'save-add' ? 'text-dark-textMuted' : 'text-primary'">{{ budgetTagText(p) }}</span>
            </p>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
