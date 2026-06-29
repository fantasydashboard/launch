<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useCategoryStrength } from '@/composables/useCategoryStrength'
import { useYahooLeaguePool } from '@/composables/useYahooLeaguePool'
import { useEspnPointsTeamData } from '@/composables/useEspnPointsTeamData'
import { useLeagueScoring } from '@/composables/useLeagueScoring'
import { usePowerTrajectory } from '@/composables/usePowerTrajectory'
import { useLeagueLandscape } from '@/composables/useLeagueLandscape'
import { buildPowerRankings, type PowerTeamInput } from '@/league/powerRankings'
import { buildLeagueStandings, type StakesTag } from '@/league/leagueStandings'
import { buildCategoryHeatmap } from '@/league/leagueHeatmap'
import { buildPointsTeam, type PointsPoolPlayer } from '@/myteam/pointsTeam'
import { buildPointsPositional } from '@/league/pointsPositional'
import { seasonStakes } from '@/myteam/seasonStakes'
import type { Landscape } from '@/trades/landscape'

const props = withDefaults(defineProps<{ scoring?: 'points' | 'category' }>(), { scoring: 'points' })
const isCategory = computed(() => props.scoring === 'category')

const leagueStore = useLeagueStore()
const isEspn = computed(() => leagueStore.activePlatform === 'espn')

const cat = useCategoryStrength()
const yahooLeague = useYahooLeaguePool()
const espnPoints = useEspnPointsTeamData()
const scoring = useLeagueScoring()
const trajectory = usePowerTrajectory()

function loadAll() {
  trajectory.load()
  if (isCategory.value) {
    cat.load()
  } else {
    scoring.load()
    if (isEspn.value) espnPoints.load()
    else yahooLeague.load()
  }
}
onMounted(loadAll)
watch(() => leagueStore.activeLeagueId, loadAll)

// ── POINTS branch data ────────────────────────────────────────────────────────

const pool = computed<PointsPoolPlayer[]>(() =>
  (isEspn.value ? espnPoints.pool.value : yahooLeague.pool.value) as PointsPoolPlayer[],
)
const fgByKey = computed(() => (isEspn.value ? espnPoints.fgByKey.value : yahooLeague.fgByKey.value))
const rosterSlots = computed(() => (isEspn.value ? espnPoints.rosterSlots.value : yahooLeague.rosterSlots.value))

const pointsMyTeamKey = computed<string>(() => {
  if (isEspn.value) return espnPoints.myTeamId.value ?? ''
  const me = (leagueStore.yahooTeams ?? []).find((t: any) => t?.is_my_team)
  return me ? String(me.team_key) : ''
})

function detectManagerless(t: any): boolean {
  return /manager-?less/i.test(String(t?.name ?? ''))
}

interface PointsMeta {
  name: string
  logo: string
  wins: number
  losses: number
  ties: number
  pointsFor: number
  managerless: boolean
}

const pointsTeamMeta = computed<Record<string, PointsMeta>>(() => {
  if (isEspn.value) {
    const names = espnPoints.teamNames.value
    const logos = espnPoints.teamLogos.value
    const recs = espnPoints.teamRecords.value
    const out: Record<string, PointsMeta> = {}
    for (const k of Object.keys(names)) {
      const r = recs[k] ?? { wins: 0, losses: 0, ties: 0, pointsFor: 0 }
      out[k] = { name: names[k] || 'Team', logo: logos[k] || '', wins: r.wins, losses: r.losses, ties: r.ties, pointsFor: r.pointsFor, managerless: false }
    }
    return out
  }
  const out: Record<string, PointsMeta> = {}
  for (const t of leagueStore.yahooTeams ?? []) {
    out[String(t.team_key)] = {
      name: String(t.name ?? 'Team'),
      logo: String(t.logo_url ?? ''),
      wins: Number(t.wins ?? 0),
      losses: Number(t.losses ?? 0),
      ties: Number(t.ties ?? 0),
      pointsFor: Number(t.points_for ?? 0),
      managerless: detectManagerless(t),
    }
  }
  return out
})

// ── RANKINGS: category or points ─────────────────────────────────────────────

const catRankings = computed(() => {
  const s = cat.strengths.value
  if (!s.length || !cat.myTeamKey.value) return null
  const meta = cat.teamMeta.value
  const inputs: PowerTeamInput[] = s.map((x) => {
    const m = meta[x.teamKey] ?? { name: 'Team', logo: '', wins: 0, losses: 0, ties: 0 }
    return { teamKey: x.teamKey, teamName: m.name, teamLogo: m.logo, strength: x.strength, wins: m.wins, losses: m.losses, ties: m.ties, managerless: isEspn.value ? false : /manager-?less/i.test(m.name) }
  })
  return buildPowerRankings(inputs)
})

const pointsRankings = computed(() => {
  if (!pool.value.length || !Object.keys(rosterSlots.value).length || !pointsMyTeamKey.value) return null
  const wl = trajectory.weeksLeft.value
  const model = buildPointsTeam(pool.value, fgByKey.value, scoring.weights.value, pointsMyTeamKey.value, rosterSlots.value, {
    basis: wl > 0 ? 'perWeek' : 'total',
    weeksLeft: wl,
  })
  const meta = pointsTeamMeta.value
  const inputs: PowerTeamInput[] = model.standings.map((s) => {
    const m = meta[s.teamKey] ?? { name: 'Team', logo: '', wins: 0, losses: 0, ties: 0, pointsFor: 0, managerless: false }
    return {
      teamKey: s.teamKey,
      teamName: m.name,
      teamLogo: m.logo,
      strength: s.startingPoints,
      wins: m.wins,
      losses: m.losses,
      ties: m.ties,
      pointsFor: m.pointsFor,
      managerless: m.managerless,
    }
  })
  return buildPowerRankings(inputs)
})

// Unified rankings (drives both Standings + Landscape regardless of scoring type).
const rankings = computed(() => (isCategory.value ? catRankings.value : pointsRankings.value))

// Unified myTeamKey for standings.
const activeMyTeamKey = computed(() => (isCategory.value ? cat.myTeamKey.value : pointsMyTeamKey.value))

// ── STAKES + STANDINGS (shared) ───────────────────────────────────────────────

const stakesMap = computed(() => {
  const out = new Map<string, StakesTag>()
  const rows = rankings.value?.rows ?? []
  const spots = trajectory.playoffSpots.value
  const wl = trajectory.weeksLeft.value
  if (!spots || !wl || !rows.length) return out
  for (const r of rows) {
    const sk = seasonStakes({ rank: r.recordRank, leagueSize: rows.length, weeksLeft: wl, playoffSpots: spots })
    if (sk.coastKind === 'clinched') out.set(r.teamKey, 'clinched')
    else if (sk.coastKind === 'eliminated') out.set(r.teamKey, 'eliminated')
    else if (sk.mode === 'must-win') out.set(r.teamKey, 'bubble')
  }
  return out
})

const standings = computed(() =>
  rankings.value ? buildLeagueStandings(rankings.value.rows, stakesMap.value, activeMyTeamKey.value) : [],
)

// ── CATEGORY LANDSCAPE ────────────────────────────────────────────────────────

const { view: landscapeView } = useLeagueLandscape({
  pool: cat.pool,
  fgByKey: cat.fgByKey,
  catSpecs: cat.catSpecs,
  landscape: computed<Landscape>(() => cat.engine.value?.landscape ?? new Map()),
  roleValueByKey: computed(() => cat.engine.value?.roleValueByKey ?? new Map<string, number>()),
  myTeamKey: cat.myTeamKey,
  teamNameByKey: cat.teamNameByKey,
  labelOf: cat.labelOf,
})

const heatmap = computed(() => (landscapeView.value ? buildCategoryHeatmap(landscapeView.value) : null))

// ── POINTS LANDSCAPE ──────────────────────────────────────────────────────────

const pointsPositional = computed(() => {
  if (!pool.value.length) return null
  const teamKeys = [...new Set(pool.value.map((p) => p.teamKey))]
  return buildPointsPositional(pool.value, fgByKey.value, scoring.weights.value, teamKeys)
})

// Strength bar: min-anchored (same pattern as PowerRankingsRedesignView).
const strengthBounds = computed(() => {
  const vals = rankings.value?.rows.map((r) => r.strength) ?? [1]
  return { min: Math.min(...vals), max: Math.max(...vals) }
})
const barPct = (s: number) => {
  const { min, max } = strengthBounds.value
  if (max <= min) return 100
  return 14 + 86 * ((s - min) / (max - min))
}

// ── LOADING ───────────────────────────────────────────────────────────────────

const loading = computed(() =>
  isCategory.value
    ? cat.loading.value
    : isEspn.value
      ? espnPoints.loading.value
      : yahooLeague.loading.value,
)

// ── SHARED HELPERS ────────────────────────────────────────────────────────────

// Theme `primary` var has no alpha slot so bg-primary/NN renders nothing — use color-mix.
const primaryTint = (pct: number) => `color-mix(in srgb, var(--color-primary, #C6FF3A) ${pct}%, transparent)`
const heatBg = (pctOrNull: number | null) =>
  pctOrNull == null ? 'transparent' : primaryTint(Math.round(pctOrNull * 70))
const ord = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 pt-6 pb-20">
    <header class="mb-6">
      <h1 class="font-display text-2xl font-bold text-dark-text">League</h1>
      <p class="font-mono text-xs text-dark-textMuted">How you stack up against the field.</p>
    </header>

    <!-- ── LOADING / EMPTY STATES ─────────────────────────────────────────── -->
    <div v-if="loading && !rankings" class="py-16 text-center text-dark-textMuted">Sizing up the league…</div>
    <div v-else-if="!loading && !rankings" class="py-16 text-center text-dark-textMuted">Couldn't assemble the league yet. Try a refresh.</div>

    <template v-else>
    <!-- ── STANDINGS (shared by both scoring types) ───────────────────────── -->
    <section class="mb-8">
      <h2 class="mb-2 font-display text-lg font-bold text-dark-text">Standings</h2>
      <div v-if="!standings.length" class="py-10 text-center font-mono text-xs text-dark-textMuted">
        Loading standings…
      </div>
      <div v-else class="rounded-xl border border-dark-border bg-dark-card divide-y divide-dark-border/40">
        <div
          v-for="(r, i) in standings"
          :key="r.teamKey"
          class="px-4 py-2.5 flex items-center gap-3"
          :style="r.isMe ? { backgroundColor: primaryTint(6) } : {}"
        >
          <!-- Position -->
          <span class="w-6 shrink-0 text-center font-mono text-sm text-dark-textMuted">{{ i + 1 }}</span>

          <!-- Logo -->
          <img
            v-if="r.teamLogo"
            :src="r.teamLogo"
            alt=""
            class="h-8 w-8 shrink-0 rounded-full bg-dark-border object-cover"
            @error="($event.target as HTMLElement).style.display = 'none'"
          />
          <span v-else class="h-8 w-8 shrink-0 rounded-full bg-dark-border" />

          <!-- Name + stakes -->
          <span class="min-w-0 flex-1 flex items-center gap-2 overflow-hidden">
            <span class="truncate text-sm font-semibold text-dark-text">{{ r.teamName }}</span>
            <span
              v-if="r.isMe"
              class="shrink-0 rounded px-1 font-mono text-[9px] uppercase text-primary"
              :style="{ backgroundColor: primaryTint(16) }"
            >you</span>
            <span
              v-if="r.stakes === 'clinched'"
              class="shrink-0 font-mono text-[9px] uppercase tracking-wider text-primary"
            >clinched</span>
            <span
              v-else-if="r.stakes === 'eliminated'"
              class="shrink-0 font-mono text-[9px] uppercase tracking-wider text-dark-textMuted"
            >eliminated</span>
            <span
              v-else-if="r.stakes === 'bubble'"
              class="shrink-0 font-mono text-[9px] uppercase tracking-wider text-[#e69a4a]"
            >bubble</span>
          </span>

          <!-- Record -->
          <span class="shrink-0 font-mono text-[11px] text-dark-textMuted">
            {{ r.wins }}-{{ r.losses }}{{ r.ties ? '-' + r.ties : '' }}
          </span>

          <!-- Power-Rankings connector: talent rank + luck arrow -->
          <span class="hidden sm:flex shrink-0 items-center gap-1 font-mono text-[11px] text-dark-textMuted">
            talent {{ ord(r.talentRank) }}
            <span v-if="r.luck === 'sleeper'" class="text-primary">▲</span>
            <span v-else-if="r.luck === 'pretender'" class="text-[#e69a4a]">▼</span>
          </span>
        </div>
      </div>
    </section>

    <!-- ── CATEGORY landscape ─────────────────────────────────────────────── -->
    <template v-if="isCategory">
      <!-- Category heatmap -->
      <section v-if="heatmap && heatmap.categories.length" class="mb-8">
        <h2 class="mb-1 font-display text-lg font-bold text-dark-text">The landscape</h2>
        <p class="mb-3 font-mono text-[10px] text-dark-textMuted">
          brighter = stronger in that category · your row highlighted
        </p>
        <div class="rounded-xl border border-dark-border bg-dark-card overflow-x-auto">
          <!-- Header row -->
          <div class="flex border-b border-dark-border/40">
            <div class="min-w-[8rem] shrink-0" />
            <div
              v-for="cat in heatmap.categories"
              :key="cat.key"
              class="w-7 shrink-0 py-1.5 text-center font-mono text-[8px] uppercase tracking-wide text-dark-textMuted leading-tight"
              :title="cat.label"
            >
              {{ cat.label.slice(0, 3) }}
            </div>
          </div>

          <!-- Body rows -->
          <div
            v-for="row in heatmap.rows"
            :key="row.teamKey"
            class="flex items-center border-b border-dark-border/20 last:border-0"
            :style="row.isMe ? { backgroundColor: primaryTint(6) } : {}"
          >
            <div
              class="min-w-[8rem] shrink-0 px-3 py-1.5 font-mono text-[11px] truncate text-dark-text"
              :class="row.isMe ? 'font-bold' : ''"
            >
              <span
                v-if="row.isMe"
                class="inline-block rounded px-1 mr-1 font-mono text-[9px] uppercase text-primary"
                :style="{ backgroundColor: primaryTint(16) }"
              >you</span>{{ row.teamName }}
            </div>

            <div
              v-for="(cell, ci) in row.cells"
              :key="ci"
              class="w-7 shrink-0 py-1.5 text-center font-mono text-[10px] text-dark-text leading-none"
              :style="{ backgroundColor: heatBg(cell.pct) }"
            >
              {{ cell.rank ?? '' }}
            </div>
          </div>
        </div>
      </section>

      <!-- Category position strength -->
      <section v-if="landscapeView && landscapeView.positionRows.length" class="mb-8">
        <h2 class="mb-1 font-display text-lg font-bold text-dark-text">Position strength</h2>
        <p class="mb-3 font-mono text-[10px] text-dark-textMuted">
          rank by best eligible player at each position · brighter = stronger
        </p>
        <div class="rounded-xl border border-dark-border bg-dark-card overflow-x-auto">
          <div class="flex border-b border-dark-border/40">
            <div class="min-w-[3.5rem] shrink-0" />
            <div
              v-for="team in landscapeView.teams"
              :key="team.key"
              class="w-10 shrink-0 py-1.5 text-center font-mono text-[8px] uppercase tracking-wide leading-tight truncate"
              :class="team.isMe ? 'text-primary font-bold' : 'text-dark-textMuted'"
              :title="team.name"
            >
              {{ team.isMe ? 'YOU' : team.label }}
            </div>
          </div>

          <div
            v-for="posRow in landscapeView.positionRows"
            :key="posRow.key"
            class="flex items-center border-b border-dark-border/20 last:border-0"
          >
            <div class="min-w-[3.5rem] shrink-0 px-3 py-1.5 font-mono text-[10px] text-dark-textSecondary uppercase tracking-wider">
              {{ posRow.label }}
            </div>

            <div
              v-for="(rank, ti) in posRow.ranks"
              :key="ti"
              class="w-10 shrink-0 py-1.5 text-center font-mono text-[10px] text-dark-text leading-none"
              :style="{
                backgroundColor: rank == null
                  ? 'transparent'
                  : heatBg(landscapeView.numTeams <= 1 ? 0.5 : (landscapeView.numTeams - rank) / (landscapeView.numTeams - 1))
              }"
            >
              {{ rank ?? '' }}
            </div>
          </div>
        </div>
      </section>
    </template>

    <!-- ── POINTS landscape ───────────────────────────────────────────────── -->
    <template v-else>
      <!-- Projected points / week bars -->
      <section v-if="rankings && rankings.rows.length" class="mb-8">
        <h2 class="mb-1 font-display text-lg font-bold text-dark-text">Projected points</h2>
        <p class="mb-3 font-mono text-[10px] text-dark-textMuted">
          optimal-lineup projection · bar length = roster talent
        </p>
        <div class="rounded-xl border border-dark-border bg-dark-card divide-y divide-dark-border/40">
          <div
            v-for="r in rankings.rows"
            :key="r.teamKey"
            class="px-4 py-2.5 flex items-center gap-3"
            :style="r.teamKey === activeMyTeamKey ? { backgroundColor: primaryTint(6) } : {}"
          >
            <!-- Rank -->
            <span class="w-6 shrink-0 text-center font-mono text-sm font-bold text-dark-textMuted">{{ r.strengthRank }}</span>

            <!-- Logo -->
            <img
              v-if="r.teamLogo"
              :src="r.teamLogo"
              alt=""
              class="h-8 w-8 shrink-0 rounded-full bg-dark-border object-cover"
              @error="($event.target as HTMLElement).style.display = 'none'"
            />
            <span v-else class="h-8 w-8 shrink-0 rounded-full bg-dark-border" />

            <!-- Name + YOU badge -->
            <span class="min-w-0 flex-1 flex items-center gap-2 overflow-hidden">
              <span class="truncate text-sm font-semibold text-dark-text">{{ r.teamName }}</span>
              <span
                v-if="r.teamKey === activeMyTeamKey"
                class="shrink-0 rounded px-1 font-mono text-[9px] uppercase text-primary"
                :style="{ backgroundColor: primaryTint(16) }"
              >you</span>
            </span>

            <!-- Strength bar + value -->
            <div class="hidden w-40 shrink-0 sm:block">
              <div class="relative h-2 overflow-hidden rounded-full" :style="{ backgroundColor: 'rgba(255,255,255,0.08)' }">
                <div
                  class="absolute inset-y-0 left-0 rounded-full"
                  :style="{ width: barPct(r.strength) + '%', backgroundColor: 'var(--color-primary, #C6FF3A)' }"
                />
              </div>
              <div class="mt-0.5 text-right font-mono text-[9px] text-dark-textMuted">
                {{ Math.round(r.strength / 10) * 10 }}{{ trajectory.weeksLeft.value > 0 ? ' pts/wk' : ' pts' }}
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Position strength grid (points) -->
      <section
        v-if="pointsPositional && pointsPositional.positions.length"
        class="mb-8"
      >
        <h2 class="mb-1 font-display text-lg font-bold text-dark-text">Position strength</h2>
        <p class="mb-3 font-mono text-[10px] text-dark-textMuted">
          best startable player per position, ranked across the league · brighter = stronger
        </p>
        <div class="rounded-xl border border-dark-border bg-dark-card overflow-x-auto">
          <!-- Header: team short names as columns -->
          <div class="flex border-b border-dark-border/40">
            <div class="min-w-[3.5rem] shrink-0" />
            <div
              v-for="tk in [...new Set(pool.map(p => p.teamKey))]"
              :key="tk"
              class="w-10 shrink-0 py-1.5 text-center font-mono text-[8px] uppercase tracking-wide leading-tight truncate"
              :class="tk === activeMyTeamKey ? 'text-primary font-bold' : 'text-dark-textMuted'"
              :title="pointsTeamMeta[tk]?.name ?? tk"
            >
              {{ tk === activeMyTeamKey ? 'YOU' : (pointsTeamMeta[tk]?.name ?? tk).slice(0, 4) }}
            </div>
          </div>

          <!-- Position rows -->
          <div
            v-for="posRow in pointsPositional.positions"
            :key="posRow.position"
            class="flex items-center border-b border-dark-border/20 last:border-0"
          >
            <div class="min-w-[3.5rem] shrink-0 px-3 py-1.5 font-mono text-[10px] text-dark-textSecondary uppercase tracking-wider">
              {{ posRow.position }}
            </div>
            <div
              v-for="cell in posRow.cells"
              :key="cell.teamKey"
              class="w-10 shrink-0 py-1.5 text-center font-mono text-[10px] text-dark-text leading-none"
              :style="{
                backgroundColor: cell.rank == null
                  ? 'transparent'
                  : heatBg(
                      (() => {
                        const tc = new Set(pool.map(p => p.teamKey)).size
                        return tc <= 1 ? 0.5 : (tc - cell.rank) / (tc - 1)
                      })()
                    )
              }"
            >
              {{ cell.rank ?? '' }}
            </div>
          </div>
        </div>
      </section>
    </template>
    </template><!-- /v-else (rankings ready) -->
  </div>
</template>
