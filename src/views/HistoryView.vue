<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useLeagueHistory } from '@/composables/useLeagueHistory'
import { buildChampions } from '@/history/champions'
import { buildAllTimeStandings } from '@/history/allTimeStandings'
import TeamAvatar from '@/components/league/TeamAvatar.vue'

const leagueStore = useLeagueStore()
const history = useLeagueHistory()

onMounted(() => history.load())
watch(() => leagueStore.activeLeagueId, () => history.load())

// Theme `primary` var has no alpha slot so bg-primary/NN renders nothing — use color-mix.
const primaryTint = (pct: number) => `color-mix(in srgb, var(--color-primary, #C6FF3A) ${pct}%, transparent)`

const loading = computed(() => history.loading.value)
const firstYear = computed(() => history.firstYear.value)
const seasons = computed(() => history.data.value)
const singleSeason = computed(() => seasons.value.length === 1)
const isEspn = computed(() => history.platform.value === 'espn')

const subtitle = computed(() => {
  const n = seasons.value.length
  if (!n) return 'Bragging rights, title runs, and the all-time race.'
  if (n === 1) return 'One season in — the lore starts building now.'
  const span = `${history.firstYear.value}–${seasons.value[0].season}`
  return `${n} seasons of league lore · ${span}`
})

// Champions roll. With one season the title isn't won yet → show the current leader,
// labeled "in progress".
const champions = computed(() => buildChampions(seasons.value))

const allTime = computed(() =>
  buildAllTimeStandings(seasons.value, history.myTeamKey.value),
)

const fmtPct = (p: number) => '.' + String(Math.round(p * 1000)).padStart(3, '0')
const record = (w: number, l: number, t: number) => `${w}-${l}${t ? '-' + t : ''}`
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 pt-6 pb-20">
    <header class="mb-6">
      <h1 class="font-display text-2xl font-bold text-dark-text">League history</h1>
      <p class="font-mono text-xs text-dark-textMuted">{{ subtitle }}</p>
    </header>

    <!-- ── LOADING / EMPTY STATES ─────────────────────────────────────────── -->
    <div v-if="loading && !seasons.length" class="py-16 text-center text-dark-textMuted">
      Digging up the archives…
    </div>
    <div
      v-else-if="!loading && !seasons.length"
      class="py-16 text-center text-dark-textMuted"
    >
      No history yet for this league. It'll start filling in as seasons complete.
    </div>

    <template v-else>
      <!-- ESPN membership note -->
      <p
        v-if="isEspn"
        class="mb-6 rounded-lg border border-dark-border/50 bg-dark-card px-3 py-2 font-mono text-[11px] leading-snug text-dark-textMuted"
      >
        ESPN only shares seasons you've been a member of, so your history starts at
        <span class="text-dark-text">{{ firstYear }}</span>. It'll grow each season.
      </p>

      <!-- ── CHAMPIONS ─────────────────────────────────────────────────────── -->
      <section class="mb-8">
        <h2 class="font-display text-lg font-bold text-dark-text">Champions</h2>
        <p class="mb-3 font-mono text-xs text-dark-textMuted">
          <template v-if="singleSeason">Who's leading the chase right now.</template>
          <template v-else>The title roll, season by season.</template>
        </p>

        <div class="rounded-xl border border-dark-border bg-dark-card divide-y divide-dark-border/40">
          <div
            v-for="c in champions"
            :key="c.season"
            class="px-4 py-3 flex items-center gap-3"
          >
            <span class="w-12 shrink-0 font-mono text-sm text-dark-textMuted">{{ c.season }}</span>
            <TeamAvatar :name="c.championName" :logo="c.championLogo" :size="32" />
            <span class="min-w-0 flex-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span class="truncate text-sm font-semibold text-dark-text">{{ c.championName }}</span>
              <span
                v-if="c.inProgress"
                class="shrink-0 rounded px-1 font-mono text-[9px] uppercase tracking-wider text-[#e69a4a]"
                :style="{ backgroundColor: 'rgba(230,154,74,0.14)' }"
              >in progress</span>
              <span
                v-else
                class="shrink-0 font-mono text-[9px] uppercase tracking-wider text-primary"
              >champion</span>
            </span>
            <div class="shrink-0 text-right font-mono text-[10px] leading-tight text-dark-textMuted">
              <div v-if="c.runnerUpName">runner-up: <span class="text-dark-text">{{ c.runnerUpName }}</span></div>
              <div v-if="c.regularLeaderName">reg. leader: <span class="text-dark-text">{{ c.regularLeaderName }}</span></div>
            </div>
          </div>
        </div>
      </section>

      <!-- ── ALL-TIME STANDINGS ────────────────────────────────────────────── -->
      <section class="mb-8">
        <h2 class="font-display text-lg font-bold text-dark-text">All-time standings</h2>
        <p class="mb-3 font-mono text-xs text-dark-textMuted">
          <template v-if="singleSeason">This season's race — all-time begins here.</template>
          <template v-else>The GOAT race across every visible season · titles, then win%.</template>
        </p>

        <div class="rounded-xl border border-dark-border bg-dark-card divide-y divide-dark-border/40">
          <!-- Column header -->
          <div class="px-4 py-1 flex items-center gap-3 border-b border-dark-border/40">
            <span class="w-6 shrink-0" />
            <span class="h-8 w-8 shrink-0" />
            <span class="min-w-0 flex-1" />
            <span class="shrink-0 w-24 text-right font-mono text-[9px] uppercase tracking-wider text-dark-textMuted">REC · WIN%</span>
            <span class="shrink-0 w-28 text-right font-mono text-[9px] uppercase tracking-wider text-dark-textMuted">TITLES · PO · SZN</span>
          </div>

          <div
            v-for="(r, i) in allTime"
            :key="r.teamKey"
            class="px-4 py-2.5 flex items-center gap-3"
            :style="r.isMe ? { backgroundColor: primaryTint(6) } : {}"
          >
            <span class="w-6 shrink-0 text-center font-mono text-sm text-dark-textMuted">{{ i + 1 }}</span>
            <TeamAvatar :name="r.teamName" :logo="r.teamLogo" :size="32" />
            <span class="min-w-0 flex-1 flex items-center gap-2 overflow-hidden">
              <span class="truncate text-sm font-semibold text-dark-text">{{ r.teamName }}</span>
              <span
                v-if="r.isMe"
                class="shrink-0 rounded px-1 font-mono text-[9px] uppercase text-primary"
                :style="{ backgroundColor: primaryTint(16) }"
              >you</span>
            </span>

            <!-- record + win% -->
            <span class="shrink-0 w-24 text-right font-mono text-[11px] text-dark-textMuted">
              {{ record(r.wins, r.losses, r.ties) }}
              <span class="text-dark-text"> · {{ fmtPct(r.winPct) }}</span>
            </span>

            <!-- titles · playoff apps · seasons -->
            <span class="shrink-0 w-28 text-right font-mono text-[11px] text-dark-textMuted">
              <span :class="r.titles > 0 ? 'text-primary' : ''">
                <template v-if="r.titles > 0">🏆×{{ r.titles }}</template>
                <template v-else>—</template>
              </span>
              <span class="text-dark-border/60"> · </span>{{ r.playoffAppearances }}<span class="text-dark-border/60">po</span>
              <span class="text-dark-border/60"> · </span>{{ r.seasonsPlayed }}<span class="text-dark-border/60">y</span>
            </span>
          </div>
        </div>
        <p class="mt-2 font-mono text-[10px] text-dark-textMuted">
          win% counts ties as half-wins · PO = playoff appearances · y = seasons played
        </p>
      </section>
    </template>
  </div>
</template>
