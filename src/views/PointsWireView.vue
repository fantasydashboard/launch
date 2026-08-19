<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useActivePointsSource } from '@/composables/useActivePointsSource'
import { useLeagueScoring } from '@/composables/useLeagueScoring'
import { buildPointsWire, type Swap } from '@/myteam/pointsWire'
import { buildPointsTeam } from '@/myteam/pointsTeam'
import { usePointsValue } from '@/composables/usePointsValue'
import { getWeekSchedule, type WeekSchedule } from '@/services/mlbSchedule'
import { mlbTeamLogo } from '@/players/mlbTeamLogo'
import { nflTeamLogo } from '@/players/nflTeamLogo'
import { useFootballWire } from '@/composables/useFootballWire'
import RankingPicker from '@/components/RankingPicker.vue'

const leagueStore = useLeagueStore()
const isFootball = computed(() => leagueStore.activeSport === 'football')
const teamLogo = (abbr?: string) => (isFootball.value ? nflTeamLogo(abbr) : mlbTeamLogo(abbr))

const source = useActivePointsSource()
const scoring = useLeagueScoring()
const schedule = ref<WeekSchedule>({ gamesByTeam: {}, startsByPitcher: {}, homeTeamByTeam: {} })

async function loadSchedule() {
  const today = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const end = new Date(today)
  end.setDate(today.getDate() + ((7 - today.getDay()) % 7))
  schedule.value = await getWeekSchedule(fmt(today), fmt(end))
}

function loadAll() {
  scoring.load()
  loadSchedule()
  source.load()
  source.loadFreeAgents(200)
}
onMounted(loadAll)
watch(() => leagueStore.activeLeagueId, loadAll)

const pool = source.pool
const fgByKey = source.fgByKey
const rosterSlots = source.rosterSlots
const myTeamKey = source.myTeamKey
const leagueSize = source.leagueSize

// Free agents minus anyone already rostered (the platform FA feed leaks rostered players).
const freeAgents = computed(() => {
  const rostered = new Set(pool.value.map((p) => p.playerKey))
  const guard = pool.value.length > 0
  return source.freeAgents.value.filter((fa) => !guard || !rostered.has(fa.playerKey))
})

// Precomputed player value (baseball from FG, football from Sleeper) — the points engine's input.
// Free agents are fed in too so football FAs (not in the rostered pool) resolve through valueOf.
const season = computed(() => '') // useFootballProjections falls back to Sleeper NFL state season
const { valueByKey, valueOf, loading: valueLoading } = usePointsValue({
  pool,
  fgByKey,
  sport: computed(() => leagueStore.activeSport),
  season,
  freeAgents,
})

// Football Wire runs off the VOR engine (separate from the baseball wire brain above).
const { wire: fbWire, loading: fbLoading, rosSource, weekSource } = useFootballWire({
  pool,
  freeAgents,
  slots: rosterSlots,
  teams: leagueSize,
  myTeamKey,
  season,
  enabled: isFootball,
})
const boardOpen = ref(false)
const boardPositions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']
const boardPos = ref('RB') // which position the Full Board shows (one at a time)
// This-week streamers worth showing: only those above a replacement streamer. Empty in
// the offseason / a completed season (no live week), which hides the section entirely.
const streamers = computed(() => (fbWire.value?.thisWeek ?? []).filter((r) => r.vorWeek > 0))
// Positions that actually have players, in canonical order — drives the picker pills.
const boardPositionsWithRows = computed(() =>
  fbWire.value ? boardPositions.filter((p) => fbWire.value!.board[p]?.length) : [],
)

const teamModel = computed(() => {
  if (!pool.value.length || !Object.keys(rosterSlots.value).length || !myTeamKey.value) return null
  return buildPointsTeam(pool.value, valueByKey.value, myTeamKey.value, rosterSlots.value)
})
const rosterBodies = computed(() =>
  (teamModel.value?.rosterRows ?? []).map((r) => ({
    name: r.player.name, position: r.player.position, points: r.points, perGame: r.perGame, side: r.side, onIL: r.player.onIL,
  })),
)
const wire = computed(() => {
  if (!freeAgents.value.length) return null
  return buildPointsWire(freeAgents.value, valueOf.value, schedule.value, rosterBodies.value)
})

// Drop candidates: your weakest rostered bodies (lowest projected points).
const drops = computed(() => [...(teamModel.value?.rosterRows ?? [])].sort((a, b) => a.points - b.points).slice(0, 5))

const round = (n: number) => Math.round(n)
// Football's currency is per-week; baseball's is rest-of-season. Both the drop's
// points and the swap's upgrade need the same basis so the two stay comparable.
const dropDisplay = (s: Swap) => (isFootball.value ? s.dropPerGame : s.dropPoints)
const upgradeDisplay = (s: Swap) => (isFootball.value ? s.add.perGame - s.dropPerGame : s.upgrade)
// Injury badge (health) — separate from the onIL reserve-slot mechanic below, so a discounted
// but still-active injured body (DTD / status-only IL) isn't captioned as merely "lowest projected".
const injuryBadge = (injury: string) =>
  injury === 'il' ? { label: 'IL', cls: 'bg-[#FF5C5C]/15 text-[#FF5C5C]' }
  : injury === 'dtd' ? { label: 'DTD', cls: 'bg-amber-500/15 text-amber-400' }
  : null
const onLogoErr = (e: Event) => ((e.target as HTMLElement).style.display = 'none')
// OR in usePointsValue's own loading (baseball's matchFG lands async, after the
// pool/free-agent fetch resolves) — otherwise the wire can flash empty for a beat.
const loading = computed(() => source.loading.value || source.freeAgentsLoading.value || valueLoading.value)
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-6">
    <header class="mb-4">
      <h1 class="font-display text-2xl font-bold text-dark-text">The Wire</h1>
      <p class="font-mono text-xs text-dark-textMuted">Add points. Stream volume.</p>
    </header>

    <div v-if="loading && !wire" class="py-16 text-center text-dark-textMuted">Loading the wire…</div>
    <div v-else-if="!wire" class="py-16 text-center text-dark-textMuted">No free agents available right now.</div>

    <template v-else>
      <template v-if="!isFootball">
      <!-- 1. BEST UPGRADES — concrete add→drop swaps, the headline move -->
      <section v-if="wire.swaps.length" class="mb-5 rounded-xl border border-primary/40 bg-dark-card p-4">
        <h2 class="mb-1 font-display text-xs font-semibold uppercase tracking-wide text-primary">★ Best upgrades</h2>
        <p class="mb-3 font-mono text-[10px] text-dark-textMuted">add a free agent, cut your weakest body — the points you'd gain</p>
        <template v-for="(s, i) in wire.swaps" :key="'sw-' + i">
          <div class="flex items-center gap-3 border-b border-dark-border/40 py-2.5 last:border-0">
            <img v-if="s.add.player.headshot" :src="s.add.player.headshot" :alt="s.add.player.name" loading="lazy" class="h-8 w-8 shrink-0 rounded-full bg-dark-border object-cover" />
            <span v-else class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dark-border font-mono text-[10px] text-dark-textMuted">{{ s.add.player.position }}</span>
            <span class="min-w-0 flex-1">
              <span class="text-sm text-dark-text">
                <span class="font-mono text-[10px] uppercase text-primary">add</span> <span class="font-semibold">{{ s.add.player.name }}</span>
                <span class="text-[11px] text-dark-textMuted"> {{ s.add.player.position }} · {{ s.add.player.team }}</span>
              </span>
              <span class="block text-xs text-dark-textMuted">
                <span class="font-mono text-[10px] uppercase">drop</span> {{ s.dropName }} <span class="opacity-60">({{ round(dropDisplay(s)) }})</span>
              </span>
            </span>
            <span class="shrink-0 text-right">
              <span class="font-mono text-sm font-bold text-primary">+{{ round(upgradeDisplay(s)) }}</span>
              <span class="block font-mono text-[9px] uppercase text-dark-textMuted">{{ isFootball ? 'pts/wk' : 'pts ROS' }}</span>
            </span>
          </div>
        </template>
        <p class="mt-2 font-mono text-[9px] text-dark-textMuted">you'd make ONE of these · upgrade = add's projected points − the body you cut</p>
      </section>

      <!-- 2. STREAM THIS WEEK — the timely volume edge (baseball two-start/full-slate volume;
           meaningless for football's weekly schedule, so hidden there) -->
      <section v-if="!isFootball && (wire.twoStart.length || wire.hotBats.length)" class="mb-5 rounded-xl border border-dark-border bg-dark-card p-4">
        <h2 class="mb-1 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">Stream this week</h2>
        <p class="mb-3 font-mono text-[10px] text-dark-textMuted">two-start arms and full-slate bats — the volume native apps don't flag</p>

        <div v-if="wire.twoStart.length" class="mb-2 font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">Two-start arms</div>
        <template v-for="r in wire.twoStart" :key="'ts-' + r.player.playerKey">
          <div class="flex items-center gap-3 border-b border-dark-border/40 py-2 last:border-0">
            <img v-if="r.player.headshot" :src="r.player.headshot" :alt="r.player.name" loading="lazy" class="h-8 w-8 shrink-0 rounded-full bg-dark-border object-cover" />
            <span v-else class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dark-border font-mono text-[10px] text-dark-textMuted">{{ r.player.position }}</span>
            <span class="min-w-0 flex-1">
              <span class="truncate text-sm font-semibold text-dark-text">{{ r.player.name }}</span>
              <span class="flex items-center gap-1 text-xs text-dark-textMuted">
                {{ r.player.position }} · <img :src="teamLogo(r.player.team)" alt="" @error="onLogoErr" class="h-3.5 w-3.5 object-contain" /> {{ r.player.team }}
              </span>
            </span>
            <span class="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">{{ r.startsThisWeek }} starts</span>
            <span class="w-12 shrink-0 text-right font-mono text-sm text-dark-text">{{ round(isFootball ? r.perGame : r.points) }}</span>
          </div>
        </template>

        <div v-if="wire.hotBats.length" class="mb-2 mt-4 font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">Full-slate bats</div>
        <template v-for="r in wire.hotBats" :key="'hb-' + r.player.playerKey">
          <div class="flex items-center gap-3 border-b border-dark-border/40 py-2 last:border-0">
            <img v-if="r.player.headshot" :src="r.player.headshot" :alt="r.player.name" loading="lazy" class="h-8 w-8 shrink-0 rounded-full bg-dark-border object-cover" />
            <span v-else class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dark-border font-mono text-[10px] text-dark-textMuted">{{ r.player.position }}</span>
            <span class="min-w-0 flex-1">
              <span class="truncate text-sm font-semibold text-dark-text">{{ r.player.name }}</span>
              <span class="flex items-center gap-1 text-xs text-dark-textMuted">
                {{ r.player.position }} · <img :src="teamLogo(r.player.team)" alt="" @error="onLogoErr" class="h-3.5 w-3.5 object-contain" /> {{ r.player.team }}
              </span>
            </span>
            <span v-for="c in r.chips" :key="c" class="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">{{ c }}</span>
            <span class="shrink-0 rounded bg-dark-border/50 px-1.5 py-0.5 font-mono text-[10px] text-dark-textMuted">{{ r.gamesThisWeek }} games</span>
            <span class="w-12 shrink-0 text-right font-mono text-sm text-dark-text">{{ round(isFootball ? r.perGame : r.points) }}</span>
          </div>
        </template>
      </section>

      <!-- 2. BEST AVAILABLE — rest-of-season value -->
      <section class="mb-5 rounded-xl border border-dark-border bg-dark-card p-4">
        <h2 class="mb-3 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">
          Best available <span class="font-mono text-[10px] normal-case text-dark-textMuted/70">· projected rest-of-season points</span>
        </h2>
        <template v-for="group in [{ label: 'Hitters', rows: wire.topHitters }, { label: 'Pitchers', rows: wire.topPitchers }]" :key="group.label">
          <div v-if="group.rows.length" class="mb-1 mt-3 font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">{{ group.label }}</div>
          <template v-for="r in group.rows" :key="'ba-' + r.player.playerKey">
            <div class="flex items-center gap-3 border-b border-dark-border/40 py-2 last:border-0">
              <img v-if="r.player.headshot" :src="r.player.headshot" :alt="r.player.name" loading="lazy" class="h-8 w-8 shrink-0 rounded-full bg-dark-border object-cover" />
              <span v-else class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dark-border font-mono text-[10px] text-dark-textMuted">{{ r.player.position }}</span>
              <span class="min-w-0 flex-1">
                <span class="truncate text-sm font-semibold text-dark-text">{{ r.player.name }}</span>
                <span class="flex items-center gap-1 text-xs text-dark-textMuted">
                  {{ r.player.position }} · <img :src="teamLogo(r.player.team)" alt="" @error="onLogoErr" class="h-3.5 w-3.5 object-contain" /> {{ r.player.team }}
                </span>
              </span>
              <span v-for="c in r.chips" :key="c" class="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">{{ c }}</span>
              <span class="w-16 shrink-0 text-right">
                <span class="font-mono text-sm font-semibold text-dark-text">{{ round(isFootball ? r.perGame : r.points) }}</span>
                <span v-if="!isFootball" class="ml-1 font-mono text-[10px] text-dark-textMuted">{{ r.perGame.toFixed(1) }}/g</span>
                <span v-else class="ml-1 font-mono text-[10px] text-dark-textMuted">/wk</span>
              </span>
            </div>
          </template>
        </template>
      </section>

      <!-- 3. DROP TO MAKE ROOM -->
      <section v-if="drops.length" class="rounded-xl border border-dark-border bg-dark-card p-4">
        <h2 class="mb-3 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">Drop to make room</h2>
        <template v-for="r in drops" :key="'dr-' + r.player.playerKey">
          <div class="flex items-center gap-3 border-b border-dark-border/40 py-2 last:border-0">
            <span class="min-w-0 flex-1 truncate text-sm text-dark-text">
              {{ r.player.name }}
              <span class="ml-1 text-[11px] text-dark-textMuted">{{ r.player.position }} · {{ r.player.proTeam }}</span>
              <span v-if="injuryBadge(r.injury)" class="ml-1 rounded px-1 py-0.5 font-mono text-[9px] uppercase" :class="injuryBadge(r.injury)!.cls">{{ injuryBadge(r.injury)!.label }}</span>
              <span class="ml-1 text-[11px] text-dark-textMuted/70">{{ r.player.onIL ? "won't free an active spot" : 'lowest projected' }}</span>
            </span>
            <span class="font-mono text-[10px] uppercase text-dark-textMuted">{{ r.tier }}</span>
            <span class="w-12 shrink-0 text-right font-mono text-sm text-dark-textMuted">{{ round(isFootball ? r.perGame : r.points) }}</span>
          </div>
        </template>
        <p class="mt-3 font-mono text-[10px] text-dark-textMuted">your lowest-projecting rostered bodies — cut one of these for an add above</p>
      </section>
      </template>

      <template v-if="isFootball">
        <div v-if="fbLoading && !fbWire" class="py-10 text-center text-sm text-dark-textMuted">Loading league values…</div>
        <div v-else-if="!fbWire" class="py-10 text-center text-dark-textMuted">No free agents available right now.</div>

        <template v-else>
          <!-- 1. BEST UPGRADES — flex-aware lineup-marginal -->
          <section v-if="fbWire.upgrades.length" class="mb-5 rounded-xl border border-primary/40 bg-dark-card p-4">
            <h2 class="mb-1 font-display text-xs font-semibold uppercase tracking-wide text-primary">★ Best upgrades</h2>
            <p class="mb-3 font-mono text-[10px] text-dark-textMuted">add a free agent, cut the body it beats — the lineup points you'd gain</p>
            <template v-for="(s, i) in fbWire.upgrades" :key="'fbup-' + i">
              <div class="flex items-center gap-3 border-b border-dark-border/40 py-2.5 last:border-0">
                <img :src="teamLogo(s.add.player.team)" alt="" @error="onLogoErr" class="h-6 w-6 shrink-0 object-contain" />
                <span class="min-w-0 flex-1">
                  <span class="text-sm text-dark-text">
                    <span class="font-mono text-[10px] uppercase text-primary">add</span> <span class="font-semibold">{{ s.add.player.name }}</span>
                    <span class="text-[11px] text-dark-textMuted"> {{ s.add.player.position }} · {{ s.add.player.team }}</span>
                  </span>
                  <span class="block text-xs text-dark-textMuted">
                    <span class="font-mono text-[10px] uppercase">drop</span> {{ s.dropName }}
                  </span>
                </span>
                <span class="shrink-0 text-right">
                  <span class="font-mono text-sm font-bold text-primary">+{{ round(s.marginal) }}</span>
                  <span class="block font-mono text-[9px] uppercase text-dark-textMuted">lineup pts</span>
                </span>
              </div>
            </template>
          </section>

          <!-- 2. THIS WEEK — next-week VOR + streamability (hidden in the offseason: no live week) -->
          <section v-if="streamers.length" class="mb-5 rounded-xl border border-dark-border bg-dark-card p-4">
            <div class="mb-1 flex flex-wrap items-baseline justify-between gap-2">
              <h2 class="font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">This week</h2>
              <RankingPicker kind="week" />
            </div>
            <p class="mb-3 font-mono text-[10px] text-dark-textMuted">
              value over a replacement-level streamer this week<template v-if="weekSource !== 'UFD'">
              · ordered by {{ weekSource }}</template>
            </p>
            <template v-for="r in streamers" :key="'fbtw-' + (r.player.playerKey ?? r.player.name)">
              <div class="flex items-center gap-3 border-b border-dark-border/40 py-2 last:border-0">
                <img :src="teamLogo(r.player.team)" alt="" @error="onLogoErr" class="h-6 w-6 shrink-0 object-contain" />
                <span class="min-w-0 flex-1">
                  <span class="truncate text-sm font-semibold text-dark-text">
                    {{ r.player.name }}
                    <span v-if="r.opportunity === 'backup-elevated'" class="ml-1 rounded bg-amber-500/15 px-1 py-0.5 font-mono text-[9px] uppercase text-amber-400" title="Healthy backup — the starter ahead of him is injured">step-up</span>
                  </span>
                  <span class="text-xs text-dark-textMuted">{{ r.player.position }} · {{ r.player.team }}</span>
                </span>
                <span v-if="r.streamOf > 0" class="shrink-0 rounded bg-dark-border/50 px-1.5 py-0.5 font-mono text-[10px] text-dark-textMuted">startable {{ r.streamWeeks }}/{{ r.streamOf }}</span>
                <span class="w-12 shrink-0 text-right font-mono text-sm" :class="r.vorWeek >= 0 ? 'text-dark-text' : 'text-dark-textMuted'">{{ r.vorWeek >= 0 ? '+' : '' }}{{ round(r.vorWeek) }}</span>
              </div>
            </template>
          </section>

          <!-- 3. BEST AVAILABLE — ROS VOR -->
          <section class="mb-5 rounded-xl border border-dark-border bg-dark-card p-4">
            <div class="mb-1 flex flex-wrap items-baseline justify-between gap-2">
              <h2 class="font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">
                Best available
              </h2>
              <RankingPicker kind="ros" />
            </div>
            <p class="mb-3 font-mono text-[10px] text-dark-textMuted">
              <template v-if="rosSource !== 'UFD'">ordered by {{ rosSource }} · numbers are ours</template>
              <template v-else>value over replacement (season)</template>
            </p>
            <template v-for="r in fbWire.bestAvailable.slice(0, 15)" :key="'fbba-' + (r.player.playerKey ?? r.player.name)">
              <div class="flex items-center gap-3 border-b border-dark-border/40 py-2 last:border-0">
                <img v-if="r.player.headshot" :src="r.player.headshot" :alt="r.player.name" loading="lazy" @error="onLogoErr" class="h-8 w-8 shrink-0 rounded-full bg-dark-border object-cover" />
                <span v-else class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dark-border font-mono text-[10px] text-dark-textMuted">{{ r.player.position }}</span>
                <span class="min-w-0 flex-1">
                  <span class="truncate text-sm font-semibold text-dark-text">
                    {{ r.player.name }}
                    <span v-if="r.opportunity === 'backup-elevated'" class="ml-1 rounded bg-amber-500/15 px-1 py-0.5 font-mono text-[9px] uppercase text-amber-400" title="Healthy backup — the starter ahead of him is injured">step-up</span>
                    <span v-if="r.confidence === 'low'" class="ml-1 font-mono text-[10px] text-amber-400" title="Thin or absent projection">⚠</span>
                  </span>
                  <span class="flex items-center gap-1 text-xs text-dark-textMuted">
                    {{ r.player.position }} · <img :src="teamLogo(r.player.team)" alt="" @error="onLogoErr" class="h-3 w-3 object-contain" />{{ r.player.team }}
                  </span>
                </span>
                <span class="w-12 shrink-0 text-right font-mono text-sm font-semibold" :class="r.vorRos >= 0 ? 'text-dark-text' : 'text-dark-textMuted'">{{ r.vorRos >= 0 ? '+' : '' }}{{ round(r.vorRos) }}</span>
              </div>
            </template>
          </section>

          <!-- 4. FULL BOARD — every player by position, VOR-ranked, yours highlighted -->
          <section class="rounded-xl border border-dark-border bg-dark-card p-4">
            <button class="flex w-full items-center justify-between font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted" @click="boardOpen = !boardOpen">
              <span>Full board <span class="font-mono text-[10px] normal-case text-dark-textMuted/70">· your roster vs the wire</span></span>
              <span class="font-mono">{{ boardOpen ? '−' : '+' }}</span>
            </button>
            <div v-if="boardOpen" class="mt-3">
              <!-- position picker -->
              <div class="mb-3 flex flex-wrap gap-1.5">
                <button
                  v-for="pos in boardPositionsWithRows"
                  :key="pos"
                  class="rounded px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide transition-colors"
                  :class="boardPos === pos ? 'bg-primary/20 text-primary' : 'bg-dark-bg text-dark-textMuted hover:text-dark-text'"
                  @click="boardPos = pos"
                >
                  {{ pos }}
                </button>
              </div>
              <!-- selected position only, top 25 by VOR -->
              <template v-for="row in (fbWire.board[boardPos] ?? []).slice(0, 25)" :key="'fbbd-' + row.playerKey">
                <div class="flex items-center gap-2.5 border-b border-dark-border/40 py-1.5 text-sm last:border-0" :class="row.owned ? 'text-primary' : 'text-dark-text'">
                  <img v-if="row.headshot" :src="row.headshot" :alt="row.name" loading="lazy" @error="onLogoErr" class="h-6 w-6 shrink-0 rounded-full bg-dark-border object-cover" />
                  <span v-else class="h-6 w-6 shrink-0 rounded-full bg-dark-border" />
                  <span class="min-w-0 flex-1 truncate">{{ row.owned ? '★ ' : '' }}{{ row.name }}</span>
                  <img v-if="row.team" :src="teamLogo(row.team)" alt="" @error="onLogoErr" class="h-3.5 w-3.5 shrink-0 object-contain" />
                  <span v-if="row.unprojected" class="w-10 shrink-0 text-right font-mono text-[10px] italic text-dark-textMuted/50">no proj</span>
                  <span v-else class="w-10 shrink-0 text-right font-mono text-xs" :class="row.vorRos >= 0 ? '' : 'text-dark-textMuted'">{{ row.vorRos >= 0 ? '+' : '' }}{{ round(row.vorRos) }}</span>
                </div>
              </template>
              <p v-if="(fbWire.board[boardPos]?.length ?? 0) > 25" class="mt-2 font-mono text-[9px] text-dark-textMuted">
                top 25 of {{ fbWire.board[boardPos].length }} {{ boardPos }} — the rest are deep below replacement
              </p>
            </div>
          </section>
        </template>
      </template>
    </template>
  </div>
</template>
