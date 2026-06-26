<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useLeagueStore } from '@/stores/league'
import { useYahooLeaguePool } from '@/composables/useYahooLeaguePool'
import { useEspnPointsTeamData } from '@/composables/useEspnPointsTeamData'
import { useLeagueScoring } from '@/composables/useLeagueScoring'
import { buildPointsTeam, type PointsPoolPlayer } from '@/myteam/pointsTeam'
import { projectPlayerPoints } from '@/myteam/pointsValue'
import { mlbTeamLogo } from '@/players/mlbTeamLogo'

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

// My team key as the POOL labels it (full Yahoo team_key / `espn_{id}`).
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
const myRecord = computed<string>(() => (isEspn.value ? espnPoints.myRecord.value : ''))
const myTeamLogo = computed<string>(() => {
  if (isEspn.value) return espnPoints.myTeamLogo.value
  const me = (leagueStore.yahooTeams ?? []).find((t: any) => t?.is_my_team)
  return String(me?.logo_url ?? '')
})

// ── The model ────────────────────────────────────────────────────────────────
const model = computed(() => {
  if (!pool.value.length || !Object.keys(rosterSlots.value).length || !myTeamKey.value) return null
  return buildPointsTeam(pool.value, fgByKey.value, scoring.weights.value, myTeamKey.value, rosterSlots.value)
})

const hitters = computed(() => model.value?.rosterRows.filter((r) => r.side === 'hit') ?? [])
const pitchers = computed(() => model.value?.rosterRows.filter((r) => r.side === 'pit') ?? [])

const verdict = computed(() => {
  const s = model.value?.slotRanks.filter((r) => r.starterKey) ?? []
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

const tierColor = (tier: string) =>
  tier === 'CORE' ? 'text-primary' : tier === 'FRINGE' ? 'text-dark-textMuted' : 'text-dark-textSecondary'

// Slot-spine rank coloring (green good, red weak).
function rankClass(rank: number, teams: number): string {
  if (teams <= 1) return 'text-dark-text'
  const f = rank / teams
  if (f <= 0.34) return 'text-primary'
  if (f >= 0.75) return 'text-[#FF5C5C]'
  return 'text-dark-text'
}
function barClass(rank: number, teams: number): string {
  if (teams <= 1) return 'bg-dark-textMuted/40'
  const f = rank / teams
  if (f <= 0.34) return 'bg-primary'
  if (f >= 0.75) return 'bg-[#FF5C5C]/70'
  return 'bg-dark-textMuted/50'
}
const rankBar = (rank: number, teams: number) => (teams <= 1 ? 100 : Math.round(((teams - rank + 1) / teams) * 100))
const onLogoErr = (e: Event) => ((e.target as HTMLElement).style.display = 'none')

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

const roster = computed(() => [
  { label: 'Hitters', rows: hitters.value },
  { label: 'Pitchers', rows: pitchers.value },
])
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-6">
    <!-- Header -->
    <div class="mb-5 flex items-center gap-3">
      <img v-if="myTeamLogo" :src="myTeamLogo" alt="" @error="onLogoErr"
        class="h-11 w-11 shrink-0 rounded-full bg-dark-border object-cover" />
      <div>
      <h1 class="text-2xl font-display font-bold text-dark-text">
        {{ myTeamName }}
        <span v-if="myRecord" class="ml-1 align-middle text-base font-normal text-dark-textMuted">{{ myRecord }}</span>
      </h1>
      <p v-if="verdict" class="mt-1 text-sm text-dark-textMuted">
        Best lineup projects
        <span class="font-semibold text-dark-text">{{ ord(model!.myLineupRank) }} of {{ model!.teams }}</span>
        · Strongest: {{ verdict.best.slot }} ({{ ord(verdict.best.rank) }})
        · Biggest hole: {{ verdict.worst.slot }} ({{ ord(verdict.worst.rank) }})
      </p>
      </div>
    </div>

    <div v-if="loading && !model" class="py-16 text-center text-dark-textMuted">Loading your team…</div>
    <div v-else-if="!model" class="py-16 text-center text-dark-textMuted">
      Couldn't assemble your league pool yet. Try a refresh.
    </div>

    <template v-else>
      <!-- Projected finish card -->
      <div class="mb-5 rounded-xl border border-dark-border bg-dark-card p-4">
        <div class="font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">Projected finish</div>
        <div class="mt-1 flex items-baseline gap-2">
          <span class="text-3xl font-display font-bold text-primary">{{ ord(model.myLineupRank) }}</span>
          <span class="text-sm text-dark-textMuted">of {{ model.teams }}</span>
        </div>
        <div class="mt-0.5 font-mono text-xs text-dark-textMuted">
          by projected starting-lineup points · rest of season
        </div>
      </div>

      <!-- Slot-value spine -->
      <section class="mb-6 rounded-xl border border-dark-border bg-dark-card">
        <div class="flex items-baseline justify-between px-4 pt-4 pb-1">
          <h2 class="font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">
            Your lineup vs the league
          </h2>
          <span class="font-mono text-[10px] text-dark-textMuted/70">projected points · your starter vs every team's</span>
        </div>
        <div class="space-y-1.5 px-4 pb-4 pt-2">
          <div v-for="(s, i) in model.slotRanks" :key="i" class="flex items-center gap-3">
            <span class="w-10 shrink-0 font-mono text-xs text-dark-textMuted">{{ s.slot }}</span>
            <span class="w-12 shrink-0 text-right font-mono text-sm font-semibold"
              :class="s.starterKey ? rankClass(s.rank, s.teams) : 'text-dark-textMuted/50'">
              {{ s.starterKey ? ord(s.rank) : '—' }}
            </span>
            <span class="w-40 shrink-0 truncate text-sm"
              :class="s.starterKey ? 'text-dark-text' : 'italic text-dark-textMuted/60'">
              {{ s.starterKey ? s.starterName : 'open slot' }}
            </span>
            <div class="relative h-2 flex-1 overflow-hidden rounded-full bg-dark-bg">
              <div v-if="s.starterKey" class="absolute inset-y-0 left-0 rounded-full" :class="barClass(s.rank, s.teams)"
                :style="{ width: rankBar(s.rank, s.teams) + '%' }" />
            </div>
            <span class="w-12 shrink-0 text-right font-mono text-xs text-dark-textMuted">
              {{ s.starterKey ? round(s.points) : '' }}
            </span>
          </div>

          <!-- Pitching as ONE staff unit — ranking each arm vs other teams' same-rank
               arm inverts (your ace shows the worst rank), so rank the staff together. -->
          <template v-if="model.pitching">
            <div class="flex items-center gap-3 pt-1">
              <span class="w-10 shrink-0 font-mono text-xs text-dark-textMuted">P</span>
              <span class="w-12 shrink-0 text-right font-mono text-sm font-semibold"
                :class="rankClass(model.pitching.rank, model.pitching.teams)">
                {{ ord(model.pitching.rank) }}
              </span>
              <span class="w-40 shrink-0 truncate text-sm text-dark-text">Pitching staff</span>
              <div class="relative h-2 flex-1 overflow-hidden rounded-full bg-dark-bg">
                <div class="absolute inset-y-0 left-0 rounded-full" :class="barClass(model.pitching.rank, model.pitching.teams)"
                  :style="{ width: rankBar(model.pitching.rank, model.pitching.teams) + '%' }" />
              </div>
              <span class="w-12 shrink-0 text-right font-mono text-xs text-dark-textMuted">{{ round(model.pitching.points) }}</span>
            </div>
            <!-- Your starting arms, by points (no misleading per-arm cross-rank) -->
            <div v-for="arm in model.pitching.arms" :key="arm.starterKey" class="flex items-center gap-3">
              <span class="w-10 shrink-0" />
              <span class="w-12 shrink-0" />
              <span class="min-w-0 flex-1 truncate text-xs text-dark-textMuted">{{ arm.name }}</span>
              <span class="w-12 shrink-0 text-right font-mono text-[11px] text-dark-textMuted">{{ round(arm.points) }}</span>
            </div>
          </template>
        </div>
      </section>

      <!-- Roster, by projected points — mirrors the category RosterPanel -->
      <h2 class="mb-2 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">Your roster</h2>
      <div class="rounded-xl border border-dark-border bg-dark-card divide-y divide-dark-border/40">
        <div v-for="group in roster" :key="group.label">
          <div v-if="group.rows.length" class="px-4 pt-4 pb-1 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">
            {{ group.label }}
            <span class="font-mono text-[10px] normal-case tracking-normal text-dark-textMuted/70">· projected fantasy points</span>
          </div>
          <template v-for="(row, i) in group.rows" :key="row.player.playerKey">
            <!-- Tier divider -->
            <div v-if="i === 0 || row.tier !== group.rows[i - 1].tier" class="flex items-center gap-2 px-4 pt-2 pb-1">
              <span class="font-mono text-[10px] uppercase tracking-wider" :class="tierColor(row.tier)">{{ row.tier }}</span>
              <span class="h-px flex-1 bg-dark-border/50" />
            </div>

            <div class="flex items-center gap-3 px-4 py-2.5">
              <!-- Headshot -->
              <img v-if="row.player.headshot" :src="row.player.headshot" :alt="row.player.name" loading="lazy"
                class="h-8 w-8 shrink-0 rounded-full bg-dark-border object-cover" />
              <span v-else aria-hidden="true"
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dark-border font-mono text-xs text-dark-textMuted">
                {{ (row.player.position || '—').slice(0, 2) }}
              </span>

              <!-- Name + position · team -->
              <span class="min-w-0">
                <span class="truncate text-sm font-sans font-semibold text-dark-text">{{ row.player.name }}</span>
                <span class="flex items-center gap-1 text-xs text-dark-textMuted">
                  {{ row.player.position }}
                  <template v-if="row.player.proTeam">
                    ·
                    <img :src="mlbTeamLogo(row.player.proTeam)" alt="" @error="onLogoErr"
                      class="h-3.5 w-3.5 shrink-0 object-contain" />
                    {{ row.player.proTeam }}
                  </template>
                </span>
              </span>

              <!-- Specialist chips (what makes this player different) -->
              <span class="flex shrink-0 flex-wrap items-center gap-1">
                <span v-for="c in row.chips" :key="'s-' + c"
                  class="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-xs text-primary">{{ c }}</span>
              </span>

              <!-- Projected points + per-game -->
              <span class="ml-auto flex shrink-0 items-baseline gap-1.5">
                <span class="font-mono text-sm font-semibold text-dark-text">{{ round(row.points) }}</span>
                <span class="font-mono text-[10px] text-dark-textMuted">{{ row.perGame.toFixed(1) }}/g</span>
              </span>
            </div>
          </template>
        </div>

        <p class="px-4 py-3 font-mono text-[10px] leading-relaxed text-dark-textMuted">
          <span class="text-primary">chips</span> = a specialist edge (SB / SV / HLD / QS) ·
          right number = projected rest-of-season fantasy points (/g per game) ·
          tiers rank within hitters / pitchers
        </p>
      </div>

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
