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
import { useDynastyValues } from '@/composables/useDynastyValues'

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
/* Folded by default. Whether there is a move to make is the headline; the rows behind it are
   the working, and they were pushing the board — the thing you actually browse — off-screen. */
const movesOpen = ref(false)

/*
 * Dynasty rides ALONGSIDE the rest-of-season number, never replacing it. A dynasty manager
 * still has to decide this week, and a win-now contender still has to know what an ageing
 * asset costs long term — showing one horizon means picking the wrong one for half the users
 * half the time. Both columns, and where they disagree is the read.
 *
 * Only fetched for actual dynasty leagues; a redraft manager never spends the request.
 */
const dynasty = useDynastyValues({
  rosterSlots: source.rosterSlots,
  leagueSize: source.leagueSize,
  scoring: computed(() => scoring.weights.value as Record<string, number>),
  enabled: isFootball,
})
const dynRow = (key?: string) => (key ? dynasty.rows.value[key] ?? null : null)
/* Position rank among players the market has priced, toned on the same scale as everything
   else on the page. Absent = "—", never a zero that would read as a verdict. */
const dynTone = (r: { positionRank: number } | null) =>
  !r ? 'text-dark-textMuted/40'
    : r.positionRank <= 12 ? 'text-[#7ee787]'
    : r.positionRank <= 24 ? 'text-[#3fb950]'
    : r.positionRank <= 48 ? 'text-dark-textMuted'
    : 'text-[#d29922]'
const LEAN_LABEL: Record<string, { text: string; cls: string }> = {
  'future': { text: 'future', cls: 'text-[#7ee787]' },
  'win-now': { text: 'win-now', cls: 'text-[#e69a4a]' },
  'level': { text: '', cls: '' },
}

const { wire: fbWire, loading: fbLoading, rosSource } = useFootballWire({
  pool,
  freeAgents,
  slots: rosterSlots,
  teams: leagueSize,
  myTeamKey,
  season,
  enabled: isFootball,
})
/**
 * Your most droppable bodies: lowest value-over-replacement among players you own.
 * "Who do I cut for this?" is the second half of every waiver decision, and the page only
 * ever answered it inside a concrete upgrade — so when no upgrade cleared the bar, the
 * question went unanswered entirely.
 */
const cutCandidates = computed(() => {
  const b = fbWire.value?.board
  if (!b) return []
  const mine = Object.values(b).flat().filter((r) => r.owned)
  return [...mine].sort((a, b2) => a.vorRos - b2.vorRos).slice(0, 3)
})

/* Open by default. This board is the product's rest-of-season ranked list — your roster and
   the wire in one order — and it was collapsed behind a "+" on a page framed as a waiver
   feed, so the most complete thing here was also the least likely to be seen. */
const boardOpen = ref(true)
// Canonical order only — which of these actually appear is decided by the league's own
// roster_positions inside buildFootballWire, so a league with no K/DEF slot never sees them.
const boardPositions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']
const boardPos = ref('RB') // which position the Full Board shows (one at a time)
// Positions that actually have players, in canonical order — drives the picker pills.
const boardPositionsWithRows = computed(() =>
  fbWire.value ? boardPositions.filter((p) => fbWire.value!.board[p]?.length) : [],
)
// Keep the selected pill on a position this league actually has — otherwise switching to a
// league without the current selection leaves the board rendering nothing.
watch(boardPositionsWithRows, (available) => {
  if (available.length && !available.includes(boardPos.value)) boardPos.value = available[0]
})

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
      <p class="font-mono text-xs text-dark-textMuted">Your roster vs the wire &middot; rest of season</p>
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
          <!--
            One card, folded, carrying the verdict either way — the same shape This Week gives
            start/sit. "No add worth a drop" is a real answer rather than an empty state to
            hide, so it keeps its own headline; what folds is the working behind it (the rows,
            or the who-to-cut chips). Both used to sit open above the board and pushed the
            thing you actually browse off the bottom of the page.
          -->
          <section class="mb-5 rounded-xl border bg-dark-card"
                   :class="fbWire.upgrades.length ? 'border-primary/40' : 'border-dark-border'">
            <button class="flex w-full items-center justify-between gap-3 p-4" @click="movesOpen = !movesOpen">
              <span class="min-w-0 text-left">
                <span v-if="fbWire.upgrades.length" class="font-display text-xs font-semibold uppercase tracking-wide text-primary">
                  ★ {{ fbWire.upgrades.length }} add / drop move{{ fbWire.upgrades.length > 1 ? 's' : '' }}
                  <span class="font-mono text-[10px] normal-case text-dark-textMuted">
                    · +{{ round(fbWire.upgrades.reduce((t, s) => t + s.marginal, 0)) }} lineup pts on the table
                  </span>
                </span>
                <span v-else class="font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">
                  ✓ No add worth a drop
                </span>
                <span class="mt-0.5 block font-mono text-[10px] text-dark-textMuted/70">
                  <template v-if="fbWire.upgrades.length">add a free agent, cut the body it beats — the lineup points you'd gain</template>
                  <template v-else>nothing available beats a body already in your lineup<template v-if="cutCandidates.length"> · who to cut if you add anyway</template></template>
                </span>
              </span>
              <span class="shrink-0 font-mono text-dark-textMuted">{{ movesOpen ? '−' : '+' }}</span>
            </button>

            <div v-if="movesOpen" class="border-t border-dark-border/40 px-4 pb-4 pt-3">
              <template v-if="fbWire.upgrades.length">
                <div v-for="(s, i) in fbWire.upgrades" :key="'fbup-' + i"
                     class="flex items-center gap-3 border-b border-dark-border/40 py-2.5 last:border-0">
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
              <template v-else-if="cutCandidates.length">
                <p class="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">If you add anyway, cut from here</p>
                <div class="flex flex-wrap gap-2">
                  <span v-for="c in cutCandidates" :key="'cut-' + c.playerKey"
                        class="rounded bg-dark-bg px-2 py-1 font-mono text-[11px] text-dark-textSecondary">
                    {{ c.name }} <span class="text-dark-textMuted/70">{{ c.position }} · {{ c.vorRos >= 0 ? '+' : '' }}{{ round(c.vorRos) }}</span>
                  </span>
                </div>
              </template>
              <p v-else class="font-mono text-[10px] text-dark-textMuted">
                Nothing available beats a body already in your lineup, so there's no cut to make this week.
              </p>
            </div>
          </section>

          <!--
            The weekly streamer block moved to This Week. The Wire is a REST-OF-SEASON page —
            "should this player be on my roster instead of one of mine" — and a one-week
            rental is a different decision on a different clock. Running both here meant the
            page answered two questions with two currencies and the reader had to notice which
            was which. This Week owns the weekly clock; the drop is obvious there because the
            bench is on the same screen.
          -->

          <!-- 3. BEST AVAILABLE — ROS VOR -->
          <section class="mb-5 rounded-xl border border-dark-border bg-dark-card p-4">
            <div class="mb-1 flex flex-wrap items-baseline justify-between gap-2">
              <h2 class="font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">
                Best available
              </h2>
              <RankingPicker kind="ros" />
            </div>
            <p class="mb-3 font-mono text-[10px] text-dark-textMuted">
              <!-- Say the scope out loud: the list drives this card, the board below it and the
                   add/drop verdict above it, so naming only this card would understate it. -->
              <template v-if="rosSource !== 'UFD'">{{ rosSource }}'s order, our points — drives this page</template>
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
                <!-- Where the two horizons disagree, say which way. A 22-year-old the market
                     likes and the projection does not is the entire dynasty waiver thesis. -->
                <span v-if="dynasty.ready.value" class="hidden w-24 shrink-0 text-right sm:block">
                  <span class="block font-mono text-[11px]" :class="dynTone(dynRow(r.player.playerKey))">
                    {{ dynRow(r.player.playerKey) ? 'DYN ' + r.player.position + dynRow(r.player.playerKey)!.positionRank : '—' }}
                  </span>
                  <span v-if="dynRow(r.player.playerKey) && LEAN_LABEL[dynRow(r.player.playerKey)!.lean].text"
                        class="block font-mono text-[9px] uppercase tracking-wide"
                        :class="LEAN_LABEL[dynRow(r.player.playerKey)!.lean].cls">
                    {{ LEAN_LABEL[dynRow(r.player.playerKey)!.lean].text }}<template v-if="dynRow(r.player.playerKey)!.age"> &middot; {{ Math.floor(dynRow(r.player.playerKey)!.age!) }}</template>
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
              <!-- legend: the board mixes three states and only one of them used to be visible -->
              <div class="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[9px] uppercase tracking-wide text-dark-textMuted">
                <span><span class="text-primary">★</span> yours</span>
                <span><span class="text-[#4ade80]">●</span> free agent</span>
                <span><span class="text-dark-textMuted/50">●</span> rostered elsewhere</span>
                <span v-if="dynasty.ready.value" class="hidden sm:inline">
                  <span class="text-dark-textSecondary">DYN</span> = dynasty market rank &middot; age
                </span>
              </div>
              <!-- selected position only, top 25 by VOR -->
              <template v-for="row in (fbWire.board[boardPos] ?? []).slice(0, 25)" :key="'fbbd-' + row.playerKey">
                <!-- tier cliff: the drop-off is the decision, so name it rather than leaving a flat list -->
                <div v-if="row.tierBreak" class="flex items-center gap-2 py-1.5">
                  <span class="h-px flex-1 bg-dark-border"></span>
                  <span class="font-mono text-[9px] uppercase tracking-wider text-dark-textMuted/70">
                    tier {{ row.tier }} &middot; &minus;{{ round(row.tierDrop ?? 0) }} pts
                  </span>
                  <span class="h-px flex-1 bg-dark-border"></span>
                </div>
                <div class="flex items-center gap-2.5 border-b border-dark-border/40 py-1.5 text-sm last:border-0" :class="row.owned ? 'text-primary' : row.free ? 'text-dark-text' : 'text-dark-textMuted'">
                  <img v-if="row.headshot" :src="row.headshot" :alt="row.name" loading="lazy" @error="onLogoErr" class="h-6 w-6 shrink-0 rounded-full bg-dark-border object-cover" />
                  <span v-else class="h-6 w-6 shrink-0 rounded-full bg-dark-border" />
                  <span class="min-w-0 flex-1 truncate">
                    {{ row.owned ? '★ ' : '' }}{{ row.name }}
                    <!-- A season-long call still has to survive Sunday: don't cut a player who
                         is playing for one who is idle without seeing it. -->
                    <span v-if="row.bye" class="ml-1 font-mono text-[9px] uppercase text-[#FF5C5C]">bye</span>
                  </span>
                  <span
                    v-if="!row.owned"
                    class="shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide"
                    :class="row.free ? 'bg-[#4ade80]/15 text-[#4ade80]' : 'bg-dark-bg text-dark-textMuted/60'"
                  >{{ row.free ? 'free' : 'rostered' }}</span>
                  <img v-if="row.team" :src="teamLogo(row.team)" alt="" @error="onLogoErr" class="h-3.5 w-3.5 shrink-0 object-contain" />
                  <!--
                    The second horizon. Only in dynasty leagues, and only for players the
                    market actually priced — an unpriced player shows an em dash, because a
                    zero here would sort a real body last and read as a verdict we never made.
                  -->
                  <template v-if="dynasty.ready.value">
                    <span class="hidden w-9 shrink-0 text-right font-mono text-[10px] sm:inline"
                          :class="dynTone(dynRow(row.playerKey))"
                          :title="dynRow(row.playerKey) ? `Dynasty market: ${row.position}${dynRow(row.playerKey)!.positionRank} overall ${dynRow(row.playerKey)!.overallRank}` : 'Not priced by the dynasty market'">
                      {{ dynRow(row.playerKey) ? row.position + dynRow(row.playerKey)!.positionRank : '—' }}
                    </span>
                    <span class="hidden w-6 shrink-0 text-right font-mono text-[10px] text-dark-textMuted/60 md:inline">
                      {{ dynRow(row.playerKey)?.age ? Math.floor(dynRow(row.playerKey)!.age!) : '' }}
                    </span>
                  </template>
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
