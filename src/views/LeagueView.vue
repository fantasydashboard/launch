<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useCategoryStrength } from '@/composables/useCategoryStrength'
import { usePowerTrajectory } from '@/composables/usePowerTrajectory'
import { useLeagueLandscape } from '@/composables/useLeagueLandscape'
import { buildPowerRankings, type PowerTeamInput } from '@/league/powerRankings'
import { buildLeagueStandings, type StakesTag } from '@/league/leagueStandings'
import { buildCategoryHeatmap } from '@/league/leagueHeatmap'
import { seasonStakes } from '@/myteam/seasonStakes'
import type { Landscape } from '@/trades/landscape'

const props = withDefaults(defineProps<{ scoring?: 'points' | 'category' }>(), { scoring: 'points' })
const isCategory = computed(() => props.scoring === 'category')

const leagueStore = useLeagueStore()
const cat = useCategoryStrength()
const trajectory = usePowerTrajectory()

function loadAll() {
  if (isCategory.value) { cat.load(); trajectory.load() }
}
onMounted(loadAll)
watch(() => leagueStore.activeLeagueId, loadAll)

const catRankings = computed(() => {
  const s = cat.strengths.value
  if (!s.length || !cat.myTeamKey.value) return null
  const meta = cat.teamMeta.value
  const inputs: PowerTeamInput[] = s.map((x) => {
    const m = meta[x.teamKey] ?? { name: 'Team', logo: '', wins: 0, losses: 0, ties: 0 }
    return { teamKey: x.teamKey, teamName: m.name, teamLogo: m.logo, strength: x.strength, wins: m.wins, losses: m.losses, ties: m.ties }
  })
  return buildPowerRankings(inputs)
})

const stakesMap = computed(() => {
  const out = new Map<string, StakesTag>()
  const rows = catRankings.value?.rows ?? []
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
  catRankings.value ? buildLeagueStandings(catRankings.value.rows, stakesMap.value, cat.myTeamKey.value) : [],
)

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

    <template v-if="isCategory">
      <!-- ── STANDINGS ─────────────────────────────────────────────────── -->
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

      <!-- ── THE LANDSCAPE (category heatmap) ──────────────────────────── -->
      <section v-if="heatmap && heatmap.categories.length" class="mb-8">
        <h2 class="mb-1 font-display text-lg font-bold text-dark-text">The landscape</h2>
        <p class="mb-3 font-mono text-[10px] text-dark-textMuted">
          brighter = stronger in that category · your row highlighted
        </p>
        <div class="rounded-xl border border-dark-border bg-dark-card overflow-x-auto">
          <!-- Header row -->
          <div class="flex border-b border-dark-border/40">
            <!-- Corner blank — matches the team-name column width -->
            <div class="min-w-[8rem] shrink-0" />
            <!-- Category labels -->
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
            <!-- Team name pinned left -->
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

            <!-- Heat cells -->
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

      <!-- ── POSITION STRENGTH ──────────────────────────────────────────── -->
      <section v-if="landscapeView && landscapeView.positionRows.length" class="mb-8">
        <h2 class="mb-1 font-display text-lg font-bold text-dark-text">Position strength</h2>
        <p class="mb-3 font-mono text-[10px] text-dark-textMuted">
          rank by best eligible player at each position · brighter = stronger
        </p>
        <div class="rounded-xl border border-dark-border bg-dark-card overflow-x-auto">
          <!-- Header: team names as columns -->
          <div class="flex border-b border-dark-border/40">
            <!-- Corner blank — matches the position label column width -->
            <div class="min-w-[3.5rem] shrink-0" />
            <!-- Team label columns -->
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

          <!-- Position rows -->
          <div
            v-for="posRow in landscapeView.positionRows"
            :key="posRow.key"
            class="flex items-center border-b border-dark-border/20 last:border-0"
          >
            <!-- Position label pinned left -->
            <div class="min-w-[3.5rem] shrink-0 px-3 py-1.5 font-mono text-[10px] text-dark-textSecondary uppercase tracking-wider">
              {{ posRow.label }}
            </div>

            <!-- Heat cells aligned to teams -->
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
  </div>
</template>
