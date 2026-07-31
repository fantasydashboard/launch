<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useLeagueStore } from '@/stores/league'
import { useActivePointsSource } from '@/composables/useActivePointsSource'
import { useLeagueScoring } from '@/composables/useLeagueScoring'
import { buildPointsTeam } from '@/myteam/pointsTeam'
import { usePointsValue } from '@/composables/usePointsValue'
import { useSeasonOutlook } from '@/composables/useSeasonOutlook'
import { mlbTeamLogo } from '@/players/mlbTeamLogo'
import { nflTeamLogo } from '@/players/nflTeamLogo'

const route = useRoute()
const leagueStore = useLeagueStore()
const showAudit = computed(() => route.query.ptsaudit != null)

const isFootball = computed(() => leagueStore.activeSport === 'football')
const teamLogo = (abbr?: string) => (isFootball.value ? nflTeamLogo(abbr) : mlbTeamLogo(abbr))

const source = useActivePointsSource()
const scoring = useLeagueScoring()

function loadAll() {
  scoring.load()
  source.load()
}
onMounted(loadAll)
watch(() => leagueStore.activeLeagueId, loadAll)

// ── Platform-neutral inputs ──────────────────────────────────────────────────
const pool = source.pool
const fgByKey = source.fgByKey
const rosterSlots = source.rosterSlots
const loading = source.loading

// Precomputed player value (baseball from FG, football from Sleeper) — the points engine's input.
const season = computed(() => '') // useFootballProjections falls back to Sleeper NFL state season
const { valueByKey } = usePointsValue({ pool, fgByKey, sport: computed(() => leagueStore.activeSport), season })

// My team key as the POOL labels it (full Yahoo team_key / `espn_{id}`).
const myTeamKey = source.myTeamKey
const myTeamName = source.myTeamName
const myRecord = source.myRecord
const myTeamLogo = source.myTeamLogo

// All-team records for the playoff sim (mirror LeagueView's pointsTeamMeta, records only).
const teamMeta = source.teamMeta

const { outlook } = useSeasonOutlook({
  pool,
  valueByKey,
  rosterSlots,
  myTeamKey,
  teamMeta,
})

const recordLabel = computed(() => {
  const r = outlook.value?.record
  if (!r) return ''
  return `${r.wins}-${r.losses}${r.ties ? `-${r.ties}` : ''}`
})

const standingBadge = computed(() => {
  const s = outlook.value?.standingState
  switch (s) {
    case 'clinched': return { label: 'CLINCHED', cls: 'bg-primary/15 text-primary' }
    case 'in': return { label: 'IN THE FIELD', cls: 'bg-dark-textMuted/15 text-dark-text' }
    case 'bubble': return { label: 'ON THE BUBBLE', cls: 'bg-amber-500/15 text-amber-400' }
    case 'chasing': return { label: 'CHASING', cls: 'bg-dark-textMuted/15 text-dark-textMuted' }
    case 'eliminated': return { label: 'ELIMINATED', cls: 'bg-[#FF5C5C]/15 text-[#FF5C5C]' }
    default: return null
  }
})

const luckColor = computed(() => {
  const st = outlook.value?.luck.stance
  return st === 'sell-high' ? 'text-amber-400' : st === 'buy-low' ? 'text-primary' : 'text-dark-text'
})

// ── The model ────────────────────────────────────────────────────────────────
const model = computed(() => {
  if (!pool.value.length || !Object.keys(rosterSlots.value).length || !myTeamKey.value) return null
  return buildPointsTeam(pool.value, valueByKey.value, myTeamKey.value, rosterSlots.value)
})

const hitters = computed(() => model.value?.rosterRows.filter((r) => r.side === 'hit') ?? [])
const pitchers = computed(() => model.value?.rosterRows.filter((r) => r.side === 'pit') ?? [])

// Strongest / weakest unit — position slots AND the pitching staff (so a weak
// staff can be flagged as the biggest hole, not just position players).
const verdict = computed(() => {
  const m = model.value
  if (!m) return null
  const cands = m.slotRanks.filter((r) => r.starterKey).map((r) => ({ slot: r.slot, rank: r.rank }))
  if (m.pitching) cands.push({ slot: 'Pitching', rank: m.pitching.rank })
  if (!cands.length) return null
  const best = [...cands].sort((a, b) => a.rank - b.rank)[0]
  const worst = [...cands].sort((a, b) => b.rank - a.rank)[0]
  return { best, worst }
})

// Sport-agnostic "was this player actually matched to a projection" check —
// weeklyCap is 0 only for ZERO_VALUE (unmatched), and always >0 for a real
// baseball (6.5 / 1.3 / 3.5) or football (999) match. Reading fgByKey directly
// here would always read empty for football (it's baseball-only FanGraphs
// data), hiding every football roster row behind "no projection".
const hasProj = (key: string) => (valueByKey.value[key]?.weeklyCap ?? 0) > 0

const ord = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
const round = (n: number) => Math.round(n)

const tierColor = (tier: string) =>
  tier === 'CORE' ? 'text-primary' : tier === 'FRINGE' ? 'text-dark-textMuted' : 'text-dark-textSecondary'

const injuryBadge = (injury: string) =>
  injury === 'il' ? { label: 'IL', cls: 'bg-[#FF5C5C]/15 text-[#FF5C5C]' }
  : injury === 'dtd' ? { label: 'DTD', cls: 'bg-amber-500/15 text-amber-400' }
  : null

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
    perStat: Object.entries(valueByKey.value[r.player.playerKey]?.perStat ?? {})
      .map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${round(v)}`)
      .join('  '),
    injury: r.injury,
  }))
})

const auditOutlook = computed(() => {
  const o = outlook.value
  if (!showAudit.value || !o) return null
  return {
    record: recordLabel.value,
    recordRank: o.recordRank,
    talentRank: o.talentRank,
    projSeed: o.projSeed,
    playoffPct: o.playoffPct == null ? null : Math.round(o.playoffPct * 100),
    state: o.standingState,
    luck: `${o.luck.stance} (Δ${o.luck.luckDelta})`,
  }
})

const roster = computed(() => [
  { label: 'Hitters', rows: hitters.value },
  { label: 'Pitchers', rows: pitchers.value },
])

const injuredCount = computed(() =>
  (model.value?.rosterRows ?? []).filter((r) => r.injury === 'il' || r.injury === 'dtd').length,
)
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
        Strongest: {{ verdict.best.slot }} ({{ ord(verdict.best.rank) }})
        · Biggest hole: {{ verdict.worst.slot }} ({{ ord(verdict.worst.rank) }})
      </p>
      </div>
    </div>

    <div v-if="loading && !model" class="py-16 text-center text-dark-textMuted">Loading your team…</div>
    <div v-else-if="!model" class="py-16 text-center text-dark-textMuted">
      Couldn't assemble your league pool yet. Try a refresh.
    </div>

    <template v-else>
      <!-- Season Outlook -->
      <div v-if="outlook" class="mb-5 rounded-xl border border-dark-border bg-dark-card p-4">
        <div class="font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">Season outlook</div>

        <div class="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span class="text-3xl font-display font-bold text-dark-text">{{ recordLabel }}</span>
          <span class="text-sm text-dark-textMuted">{{ ord(outlook.recordRank) }} of {{ outlook.leagueSize }}</span>
          <span v-if="standingBadge" class="rounded px-2 py-0.5 font-mono text-[11px] font-semibold" :class="standingBadge.cls">
            {{ standingBadge.label }}
          </span>
        </div>

        <div v-if="outlook.ready && outlook.projSeed != null && outlook.playoffPct != null"
          class="mt-1 font-mono text-xs text-dark-textMuted">
          Projected seed <span class="text-dark-text">{{ ord(outlook.projSeed) }}</span>
          · <span class="text-dark-text">{{ Math.round(outlook.playoffPct * 100) }}%</span> to make the playoffs
          · top {{ outlook.playoffSpots }} advance
        </div>
        <div v-if="outlook.reasoning" class="mt-1 text-xs text-dark-textMuted">{{ outlook.reasoning }}</div>

        <div class="mt-2 text-[11px] text-dark-textMuted/80">
          Roster talent: {{ ord(outlook.talentRank) }} of {{ outlook.leagueSize }} · rest-of-season points
        </div>

        <!-- Luck action -->
        <div class="mt-3 flex items-start gap-3 rounded-lg border border-dark-border/70 bg-dark-bg/40 p-3">
          <div class="min-w-0 flex-1">
            <div class="text-sm font-semibold" :class="luckColor">{{ outlook.luck.headline }}</div>
            <div class="mt-0.5 text-xs text-dark-textMuted">{{ outlook.luck.detail }}</div>
          </div>
          <RouterLink v-if="outlook.luck.cta" :to="outlook.luck.cta.route"
            class="shrink-0 rounded-md bg-primary/15 px-2.5 py-1 font-mono text-[11px] text-primary hover:bg-primary/25">
            {{ outlook.luck.cta.label }}
          </RouterLink>
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
                    <img :src="teamLogo(row.player.proTeam)" alt="" @error="onLogoErr"
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

              <span v-if="injuryBadge(row.injury)"
                class="shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold"
                :class="injuryBadge(row.injury)!.cls">
                {{ injuryBadge(row.injury)!.label }}
              </span>

              <!-- Projected points + per-game (or a "no projection" note for unmatched) -->
              <span v-if="!hasProj(row.player.playerKey)"
                class="ml-auto shrink-0 font-mono text-[11px] italic text-dark-textMuted/50">no projection</span>
              <span v-else class="ml-auto flex shrink-0 items-baseline gap-1.5">
                <span class="font-mono text-sm font-semibold text-dark-text">{{ round(isFootball ? row.perGame : row.points) }}</span>
                <span v-if="!isFootball" class="font-mono text-[10px] text-dark-textMuted">{{ row.perGame.toFixed(1) }}/g</span>
                <span v-else class="font-mono text-[10px] text-dark-textMuted">/wk</span>
              </span>
            </div>
          </template>
        </div>

        <p class="px-4 py-3 font-mono text-[10px] leading-relaxed text-dark-textMuted">
          <span v-if="injuredCount" class="text-dark-text">
            {{ injuredCount }} injured — projections discounted (IL ×0.5, DTD ×0.9).
          </span>
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
          <span class="ml-2 text-dark-textMuted">inj: {{ a.injury }}</span>
          <div class="text-dark-textMuted">{{ a.perStat }}</div>
        </div>
        <div v-if="auditOutlook" class="mb-2 border-t border-amber-600/20 pt-2 text-dark-textMuted">
          outlook: {{ auditOutlook.record }} · recordRank {{ auditOutlook.recordRank }} · talentRank {{ auditOutlook.talentRank }}
          · seed {{ auditOutlook.projSeed }} · {{ auditOutlook.playoffPct }}% · {{ auditOutlook.state }} · {{ auditOutlook.luck }}
        </div>
        <pre class="mt-2 max-h-40 overflow-auto text-[10px] text-dark-textMuted">{{ scoring.rawDump.value }}</pre>
      </section>
    </template>
  </div>
</template>
