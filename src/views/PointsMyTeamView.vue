<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useLeagueStore } from '@/stores/league'
import { useYahooLeaguePool } from '@/composables/useYahooLeaguePool'
import { useEspnPointsTeamData } from '@/composables/useEspnPointsTeamData'
import { useLeagueScoring } from '@/composables/useLeagueScoring'
import { buildPointsTeam, type PointsPoolPlayer } from '@/myteam/pointsTeam'
import { projectPlayerPoints } from '@/myteam/pointsValue'

const route = useRoute()
const leagueStore = useLeagueStore()
const showAudit = computed(() => route.query.ptsaudit != null)

const isEspn = computed(() => leagueStore.activePlatform === 'espn')

const yahooLeague = useYahooLeaguePool()
const espnPoints = useEspnPointsTeamData()
const scoring = useLeagueScoring()

function loadAll() {
  scoring.load()
  if (isEspn.value) espnPoints.load()
  else yahooLeague.load()
}
onMounted(loadAll)
watch(() => leagueStore.activeLeagueId, loadAll)

// ── Platform-neutral inputs ──────────────────────────────────────────────────
const pool = computed<PointsPoolPlayer[]>(() =>
  (isEspn.value ? espnPoints.pool.value : yahooLeague.pool.value) as PointsPoolPlayer[],
)
const fgByKey = computed(() => (isEspn.value ? espnPoints.fgByKey.value : yahooLeague.fgByKey.value))
const rosterSlots = computed(() => (isEspn.value ? espnPoints.rosterSlots.value : yahooLeague.rosterSlots.value))
const loading = computed(() => (isEspn.value ? espnPoints.loading.value : yahooLeague.loading.value))

// My team key as the POOL labels it (full Yahoo team_key / `espn_{id}`), derived
// from one of my own players so it matches on both platforms.
const myTeamKey = computed<string>(() => {
  if (isEspn.value) return espnPoints.myTeamId.value ?? ''
  const me = (leagueStore.yahooTeams ?? []).find((t: any) => t?.is_my_team)
  return me ? String(me.team_key) : ''
})
const myTeamName = computed<string>(() => {
  if (isEspn.value) return espnPoints.myTeamName.value || 'My Team'
  const me = (leagueStore.yahooTeams ?? []).find((t: any) => t?.is_my_team)
  return String(me?.name ?? 'My Team')
})

// ── The model ────────────────────────────────────────────────────────────────
const model = computed(() => {
  if (!pool.value.length || !Object.keys(rosterSlots.value).length || !myTeamKey.value) return null
  return buildPointsTeam(pool.value, fgByKey.value, scoring.weights.value, myTeamKey.value, rosterSlots.value)
})

const hitters = computed(() => model.value?.rosterRows.filter((r) => r.side === 'hit') ?? [])
const pitchers = computed(() => model.value?.rosterRows.filter((r) => r.side === 'pit') ?? [])

// Verdict: strongest / weakest lineup slot by rank.
const verdict = computed(() => {
  const s = model.value?.slotRanks ?? []
  if (!s.length) return null
  const best = [...s].sort((a, b) => a.rank - b.rank)[0]
  const worst = [...s].sort((a, b) => b.rank - a.rank)[0]
  return { best, worst }
})

const ord = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
const round = (n: number) => Math.round(n)

// Bar + color helpers — longer/greener = better rank, shorter/redder = worse.
function rankBar(rank: number, teams: number): number {
  if (teams <= 1) return 100
  return Math.round(((teams - rank + 1) / teams) * 100)
}
function rankClass(rank: number, teams: number): string {
  if (teams <= 1) return 'text-dark-text'
  const f = rank / teams
  if (f <= 0.34) return 'text-green-400'
  if (f >= 0.75) return 'text-red-400'
  return 'text-dark-text'
}
function barClass(rank: number, teams: number): string {
  if (teams <= 1) return 'bg-dark-textMuted/40'
  const f = rank / teams
  if (f <= 0.34) return 'bg-green-500'
  if (f >= 0.75) return 'bg-red-500/70'
  return 'bg-dark-textMuted/50'
}
function tierClass(tier: string): string {
  return tier === 'CORE' ? 'text-green-400' : tier === 'SOLID' ? 'text-dark-text' : 'text-dark-textMuted'
}

// ── ?ptsaudit dev panel ──────────────────────────────────────────────────────
const auditRows = computed(() => {
  if (!showAudit.value || !model.value) return []
  return [...(model.value.rosterRows ?? [])].slice(0, 8).map((r) => ({
    name: r.player.name,
    side: r.side,
    points: round(r.points),
    perGame: r.perGame.toFixed(1),
    perStat: Object.entries(projectPlayerPoints(fgByKey.value[r.player.playerKey], scoring.weights.value).perStat)
      .map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${round(v)}`)
      .join('  '),
  }))
})
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-6">
    <!-- Header -->
    <div class="mb-5">
      <h1 class="text-2xl font-bold text-dark-text">{{ myTeamName }}</h1>
      <p v-if="verdict" class="mt-1 text-sm text-dark-textMuted">
        Best lineup projects <span class="text-dark-text font-semibold">{{ ord(model!.myLineupRank) }}</span>
        of {{ model!.teams }} ·
        Strongest: {{ verdict.best.slot }} ({{ ord(verdict.best.rank) }}) ·
        Biggest hole: {{ verdict.worst.slot }} ({{ ord(verdict.worst.rank) }})
      </p>
    </div>

    <div v-if="loading && !model" class="py-16 text-center text-dark-textMuted">Loading your team…</div>
    <div v-else-if="!model" class="py-16 text-center text-dark-textMuted">
      Couldn't assemble your league pool yet. Try a refresh.
    </div>

    <template v-else>
      <!-- Slot-value spine -->
      <section class="mb-6 rounded-xl border border-dark-border bg-dark-card/40 p-4">
        <div class="mb-1 flex items-baseline justify-between">
          <h2 class="text-xs font-semibold uppercase tracking-wide text-dark-textMuted">
            Your lineup vs the league
          </h2>
          <span class="text-[11px] text-dark-textMuted">projected points · your starter vs every team's at that slot</span>
        </div>
        <div class="mt-3 space-y-1.5">
          <div v-for="(s, i) in model.slotRanks" :key="i" class="flex items-center gap-3">
            <span class="w-10 shrink-0 font-mono text-xs text-dark-textMuted">{{ s.slot }}</span>
            <span class="w-12 shrink-0 text-right font-mono text-sm font-semibold" :class="rankClass(s.rank, s.teams)">
              {{ ord(s.rank) }}
            </span>
            <span class="w-40 shrink-0 truncate text-sm text-dark-text">{{ s.starterName }}</span>
            <div class="relative h-2 flex-1 overflow-hidden rounded-full bg-dark-bg">
              <div class="absolute inset-y-0 left-0 rounded-full" :class="barClass(s.rank, s.teams)"
                :style="{ width: rankBar(s.rank, s.teams) + '%' }" />
            </div>
            <span class="w-12 shrink-0 text-right font-mono text-xs text-dark-textMuted">{{ round(s.points) }}</span>
          </div>
        </div>
      </section>

      <!-- Roster, by projected points -->
      <section class="rounded-xl border border-dark-border bg-dark-card/40 p-4">
        <h2 class="mb-3 text-xs font-semibold uppercase tracking-wide text-dark-textMuted">Your roster</h2>

        <template v-for="group in [{ label: 'Hitters', rows: hitters }, { label: 'Pitchers', rows: pitchers }]"
          :key="group.label">
          <div v-if="group.rows.length" class="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wide text-dark-textMuted">
            {{ group.label }} <span class="font-normal opacity-60">· projected fantasy points</span>
          </div>
          <div v-for="r in group.rows" :key="r.player.playerKey"
            class="flex items-center gap-3 border-b border-dark-border/40 py-1.5 last:border-0">
            <span class="w-12 shrink-0 font-mono text-[10px] font-semibold uppercase" :class="tierClass(r.tier)">
              {{ r.tier }}
            </span>
            <span class="min-w-0 flex-1 truncate text-sm text-dark-text">
              {{ r.player.name }}
              <span class="ml-1 text-[11px] text-dark-textMuted">{{ r.player.position }} · {{ r.player.proTeam }}</span>
            </span>
            <span class="w-14 shrink-0 text-right font-mono text-sm text-dark-text">{{ round(r.points) }}</span>
            <span class="w-10 shrink-0 text-right font-mono text-[11px] text-dark-textMuted">{{ r.perGame.toFixed(1) }}/g</span>
            <div class="relative hidden h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-dark-bg sm:block">
              <div class="absolute inset-y-0 left-0 rounded-full bg-green-500/70" :style="{ width: r.rankVsAll + '%' }" />
            </div>
          </div>
        </template>
        <p class="mt-3 text-[11px] text-dark-textMuted">
          points = projected rest-of-season fantasy points in your league's scoring · /g = per game ·
          tiers rank within hitters / pitchers
        </p>
      </section>

      <!-- Dev audit -->
      <section v-if="showAudit" class="mt-6 rounded-xl border border-amber-600/40 bg-amber-950/20 p-4 font-mono text-[11px]">
        <div class="mb-2 font-semibold text-amber-400">?ptsaudit — scoring source: {{ scoring.source.value }}</div>
        <div class="mb-2 text-dark-textMuted">
          weights: {{ Object.entries(scoring.weights.value).map(([k, v]) => `${k}:${v}`).join('  ') }}
        </div>
        <div v-for="a in auditRows" :key="a.name" class="border-t border-amber-600/20 py-1">
          <span class="text-dark-text">{{ a.name }}</span>
          <span class="ml-2 text-dark-textMuted">[{{ a.side }}] {{ a.points }} pts · {{ a.perGame }}/g</span>
          <div class="text-dark-textMuted">{{ a.perStat }}</div>
        </div>
        <pre class="mt-2 max-h-40 overflow-auto text-[10px] text-dark-textMuted">{{ scoring.rawDump.value }}</pre>
      </section>
    </template>
  </div>
</template>
