<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useYahooLeaguePool } from '@/composables/useYahooLeaguePool'
import { useEspnPointsTeamData } from '@/composables/useEspnPointsTeamData'
import { useAvailablePlayers } from '@/composables/useAvailablePlayers'
import { useLeagueScoring } from '@/composables/useLeagueScoring'
import { buildPointsWire, type WireAdd } from '@/myteam/pointsWire'
import { buildPointsTeam, type PointsPoolPlayer } from '@/myteam/pointsTeam'
import { buildPlayerMatchers, type FGProjection } from '@/services/projectionService'
import { getWeekSchedule, type WeekSchedule } from '@/services/mlbSchedule'
import { mlbTeamLogo } from '@/players/mlbTeamLogo'

const leagueStore = useLeagueStore()
const isEspn = computed(() => leagueStore.activePlatform === 'espn')

const yahooLeague = useYahooLeaguePool()
const espnPoints = useEspnPointsTeamData()
const avail = useAvailablePlayers()
const scoring = useLeagueScoring()
const schedule = ref<WeekSchedule>({ gamesByTeam: {}, startsByPitcher: {}, homeTeamByTeam: {} })
const matchFG = ref<((p: { full_name?: string; mlb_team?: string }) => FGProjection | null) | null>(null)

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
  if (isEspn.value) espnPoints.load()
  else {
    yahooLeague.load()
    avail.load(200)
  }
}
onMounted(async () => {
  loadAll()
  const { matchFG: fn } = await buildPlayerMatchers()
  matchFG.value = fn
})
watch(() => leagueStore.activeLeagueId, loadAll)

const pool = computed<PointsPoolPlayer[]>(() =>
  (isEspn.value ? espnPoints.pool.value : yahooLeague.pool.value) as PointsPoolPlayer[],
)
const fgByKey = computed(() => (isEspn.value ? espnPoints.fgByKey.value : yahooLeague.fgByKey.value))
const rosterSlots = computed(() => (isEspn.value ? espnPoints.rosterSlots.value : yahooLeague.rosterSlots.value))
const myTeamKey = computed<string>(() => {
  if (isEspn.value) return espnPoints.myTeamId.value ?? ''
  const me = (leagueStore.yahooTeams ?? []).find((t: any) => t?.is_my_team)
  return me ? String(me.team_key) : ''
})

// Free agents minus anyone already rostered (the platform FA feed leaks rostered players).
const freeAgents = computed(() => {
  const src = isEspn.value ? espnPoints.freeAgents.value : avail.players.value
  const rostered = new Set(pool.value.map((p) => p.playerKey))
  const guard = pool.value.length > 0
  return src.filter((fa) => !guard || !rostered.has(fa.playerKey))
})

const teamModel = computed(() => {
  if (!pool.value.length || !Object.keys(rosterSlots.value).length || !myTeamKey.value) return null
  return buildPointsTeam(pool.value, fgByKey.value, scoring.weights.value, myTeamKey.value, rosterSlots.value)
})
const rosterBodies = computed(() =>
  (teamModel.value?.rosterRows ?? []).map((r) => ({ name: r.player.name, position: r.player.position, points: r.points, side: r.side, onIL: r.player.onIL })),
)
const wire = computed(() => {
  if (!matchFG.value || !freeAgents.value.length) return null
  return buildPointsWire(freeAgents.value, matchFG.value, scoring.weights.value, schedule.value, rosterBodies.value)
})

// Drop candidates: your weakest rostered bodies (lowest projected points).
const drops = computed(() => [...(teamModel.value?.rosterRows ?? [])].sort((a, b) => a.points - b.points).slice(0, 5))

const round = (n: number) => Math.round(n)
const onLogoErr = (e: Event) => ((e.target as HTMLElement).style.display = 'none')
const loading = computed(() => (isEspn.value ? espnPoints.loading.value : yahooLeague.loading.value || avail.loading.value))
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
                <span class="font-mono text-[10px] uppercase">drop</span> {{ s.dropName }} <span class="opacity-60">({{ round(s.dropPoints) }})</span>
              </span>
            </span>
            <span class="shrink-0 text-right">
              <span class="font-mono text-sm font-bold text-primary">+{{ round(s.upgrade) }}</span>
              <span class="block font-mono text-[9px] uppercase text-dark-textMuted">pts ROS</span>
            </span>
          </div>
        </template>
        <p class="mt-2 font-mono text-[9px] text-dark-textMuted">you'd make ONE of these · upgrade = add's projected points − the body you cut</p>
      </section>

      <!-- 2. STREAM THIS WEEK — the timely volume edge -->
      <section v-if="wire.twoStart.length || wire.hotBats.length" class="mb-5 rounded-xl border border-dark-border bg-dark-card p-4">
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
                {{ r.player.position }} · <img :src="mlbTeamLogo(r.player.team)" alt="" @error="onLogoErr" class="h-3.5 w-3.5 object-contain" /> {{ r.player.team }}
              </span>
            </span>
            <span class="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">{{ r.startsThisWeek }} starts</span>
            <span class="w-12 shrink-0 text-right font-mono text-sm text-dark-text">{{ round(r.points) }}</span>
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
                {{ r.player.position }} · <img :src="mlbTeamLogo(r.player.team)" alt="" @error="onLogoErr" class="h-3.5 w-3.5 object-contain" /> {{ r.player.team }}
              </span>
            </span>
            <span v-for="c in r.chips" :key="c" class="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">{{ c }}</span>
            <span class="shrink-0 rounded bg-dark-border/50 px-1.5 py-0.5 font-mono text-[10px] text-dark-textMuted">{{ r.gamesThisWeek }} games</span>
            <span class="w-12 shrink-0 text-right font-mono text-sm text-dark-text">{{ round(r.points) }}</span>
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
                  {{ r.player.position }} · <img :src="mlbTeamLogo(r.player.team)" alt="" @error="onLogoErr" class="h-3.5 w-3.5 object-contain" /> {{ r.player.team }}
                </span>
              </span>
              <span v-for="c in r.chips" :key="c" class="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">{{ c }}</span>
              <span class="w-16 shrink-0 text-right">
                <span class="font-mono text-sm font-semibold text-dark-text">{{ round(r.points) }}</span>
                <span class="ml-1 font-mono text-[10px] text-dark-textMuted">{{ r.perGame.toFixed(1) }}/g</span>
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
              <span v-if="r.player.onIL" class="ml-1 rounded bg-[#e69a4a]/15 px-1 py-0.5 font-mono text-[9px] uppercase text-[#e69a4a]">IL</span>
              <span class="ml-1 text-[11px] text-dark-textMuted/70">{{ r.player.onIL ? "won't free an active spot" : 'lowest projected' }}</span>
            </span>
            <span class="font-mono text-[10px] uppercase text-dark-textMuted">{{ r.tier }}</span>
            <span class="w-12 shrink-0 text-right font-mono text-sm text-dark-textMuted">{{ round(r.points) }}</span>
          </div>
        </template>
        <p class="mt-3 font-mono text-[10px] text-dark-textMuted">your lowest-projecting rostered bodies — cut one of these for an add above</p>
      </section>
    </template>
  </div>
</template>
