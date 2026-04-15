<template>
  <div class="space-y-6">
    <!-- Loading state -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p class="text-dark-textMuted">Loading roto race data...</p>
      </div>
    </div>

    <template v-else>
      <!-- Header -->
      <div class="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 class="text-3xl font-bold text-dark-text mb-2 flex items-center gap-3">
            <span>🏁</span> Roto Race
          </h1>
          <p class="text-base text-dark-textMuted">
            Category-by-category breakdown — see where you can gain points
          </p>
        </div>
        <div class="flex items-center gap-2 text-xs text-dark-textMuted">
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          Live · updated {{ lastUpdatedLabel }}
        </div>
      </div>

      <!-- Tightest Race callout -->
      <div
        v-if="tightestRace && tightestRace.gap <= 3"
        class="rounded-xl p-4 flex items-start gap-3"
        style="background: rgba(234,179,8,0.07); border: 1px solid rgba(234,179,8,0.3);"
      >
        <div class="text-yellow-400 text-xl flex-shrink-0">⚡</div>
        <div>
          <p class="font-bold text-yellow-400 text-sm">Tightest Race</p>
          <p class="text-sm text-dark-text mt-0.5">
            {{ tightestRace.team1.name }} and {{ tightestRace.team2.name }} separated by only
            <span class="text-yellow-400 font-bold">{{ tightestRace.gap.toFixed(1) }}</span> roto points
          </p>
        </div>
      </div>

      <!-- Overall Standings Card -->
      <div class="card">
        <div class="card-header">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="text-2xl">📊</span>
              <div>
                <h2 class="card-title">Overall Standings</h2>
                <p class="card-subtitle">
                  {{ viewMode === 'points'
                    ? `Roto points per category · #1 = ${sortedTeams.length} pts, last = 1 pt`
                    : 'Raw season stats per category' }}
                </p>
              </div>
            </div>
            <!-- Points / Stats toggle -->
            <div class="inline-flex rounded-lg border border-dark-border/50 bg-dark-bg p-1 self-start sm:self-auto">
              <button
                @click="viewMode = 'points'"
                class="px-4 py-1.5 text-xs font-semibold rounded-md transition-all"
                :class="viewMode === 'points'
                  ? 'bg-primary text-gray-900 shadow-sm'
                  : 'text-dark-textMuted hover:text-dark-text'"
              >
                Points
              </button>
              <button
                @click="viewMode = 'stats'"
                class="px-4 py-1.5 text-xs font-semibold rounded-md transition-all"
                :class="viewMode === 'stats'
                  ? 'bg-primary text-gray-900 shadow-sm'
                  : 'text-dark-textMuted hover:text-dark-text'"
              >
                Stats
              </button>
            </div>
          </div>
        </div>

        <div class="card-body !p-0">
          <!-- Mobile category page nav -->
          <div v-if="standingsPageCount > 1" class="sm:hidden flex items-center justify-center gap-3 py-2 border-b border-dark-border/30">
            <button
              @click="standingsPage = Math.max(0, standingsPage - 1)"
              :disabled="standingsPage === 0"
              class="w-7 h-7 rounded-full flex items-center justify-center transition-all"
              :class="standingsPage === 0 ? 'text-dark-border cursor-default' : 'text-yellow-400 hover:bg-yellow-400/10'"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <div class="flex gap-1.5">
              <div
                v-for="i in standingsPageCount"
                :key="i"
                class="w-2 h-2 rounded-full transition-colors"
                :class="i - 1 === standingsPage ? 'bg-yellow-400' : 'bg-dark-border/60'"
              />
            </div>
            <button
              @click="standingsPage = Math.min(standingsPageCount - 1, standingsPage + 1)"
              :disabled="standingsPage >= standingsPageCount - 1"
              class="w-7 h-7 rounded-full flex items-center justify-center transition-all"
              :class="standingsPage >= standingsPageCount - 1 ? 'text-dark-border cursor-default' : 'text-yellow-400 hover:bg-yellow-400/10'"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <!-- Position group header (Batting / Pitching) - desktop only for simplicity -->
                <tr v-if="hasPositionGroups" class="hidden sm:table-row text-xs text-dark-textMuted uppercase tracking-wider border-b border-dark-border/30">
                  <th class="py-2 px-3"></th>
                  <th class="py-2 px-3"></th>
                  <th
                    v-if="battingCats.length"
                    :colspan="battingCats.length"
                    class="py-2 px-2 text-center font-semibold text-dark-textSecondary border-l border-dark-border/30"
                  >
                    Batting
                  </th>
                  <th
                    v-if="pitchingCats.length"
                    :colspan="pitchingCats.length"
                    class="py-2 px-2 text-center font-semibold text-dark-textSecondary border-l border-dark-border/30"
                  >
                    Pitching
                  </th>
                  <th class="py-2 px-3 border-l border-dark-border/30"></th>
                  <th class="py-2 px-3"></th>
                </tr>
                <tr class="text-xs text-dark-textMuted uppercase tracking-wider border-b border-dark-border/50">
                  <th class="py-3 px-2 sm:px-3 text-left font-medium">#</th>
                  <!-- Team column: full on page 0, logo-only on subsequent mobile pages -->
                  <th
                    class="py-3 px-2 sm:px-3 text-left font-medium min-w-[110px] sm:min-w-[160px]"
                    :class="standingsPage > 0 ? 'sm:min-w-[160px]' : ''"
                  >Team</th>
                  <th
                    v-for="cat in orderedCategories"
                    :key="cat.stat_id"
                    class="py-3 px-2 text-center font-medium whitespace-nowrap"
                    :class="[
                      cat.positionType === 'P' && battingCats.length ? 'sm:border-l sm:border-dark-border/30' : '',
                      isCatOnStandingsPage(cat) ? '' : 'hidden sm:table-cell'
                    ]"
                    :title="(cat.name || cat.display_name) + (cat.isLowerBetter ? ' (lower is better)' : '')"
                  >
                    {{ cat.display_name }}
                  </th>
                  <th class="py-3 px-2 sm:px-3 text-right font-medium sm:border-l sm:border-dark-border/30 whitespace-nowrap">
                    Total
                  </th>
                  <th class="hidden sm:table-cell py-3 px-3 text-right font-medium whitespace-nowrap">Back</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, idx) in standingsRows"
                  :key="row.team.team_key"
                  class="border-b border-dark-border/20 hover:bg-dark-border/10 transition-colors last:border-b-0"
                  :class="row.team.team_key === myTeamKey ? 'bg-primary/5' : ''"
                >
                  <td class="py-3 px-2 sm:px-3 font-bold" :class="rankColorClass(idx)">{{ idx + 1 }}</td>
                  <td class="py-3 px-2 sm:px-3">
                    <div class="flex items-center gap-2 sm:gap-3">
                      <img
                        v-if="row.team.logo_url"
                        :src="row.team.logo_url"
                        class="w-7 h-7 rounded-full bg-dark-border object-cover flex-shrink-0"
                        @error="(e: any) => e.target.style.display = 'none'"
                      />
                      <!-- Name hidden on mobile past page 0 -->
                      <span
                        class="font-semibold truncate"
                        :class="[
                          row.team.team_key === myTeamKey ? 'text-primary' : 'text-dark-text',
                          standingsPage > 0 ? 'hidden sm:inline' : ''
                        ]"
                      >{{ row.team.name }}</span>
                    </div>
                  </td>
                  <td
                    v-for="cat in orderedCategories"
                    :key="cat.stat_id"
                    class="py-3 px-2 text-center font-semibold whitespace-nowrap"
                    :class="[
                      cat.positionType === 'P' && battingCats.length ? 'sm:border-l sm:border-dark-border/30' : '',
                      cellColorClass(row.cells[cat.stat_id]),
                      isCatOnStandingsPage(cat) ? '' : 'hidden sm:table-cell'
                    ]"
                  >
                    {{ viewMode === 'points'
                      ? formatPoints(row.cells[cat.stat_id]?.points)
                      : formatStat(row.cells[cat.stat_id]?.value, cat.stat_id) }}
                  </td>
                  <td class="py-3 px-2 sm:px-3 text-right font-bold sm:border-l sm:border-dark-border/30 text-primary whitespace-nowrap">
                    {{ row.total.toFixed(1) }}
                  </td>
                  <td class="hidden sm:table-cell py-3 px-3 text-right text-dark-textMuted whitespace-nowrap">
                    {{ idx === 0 ? '—' : (standingsRows[0].total - row.total).toFixed(1) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Distance from Competition -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-start gap-2">
            <span class="text-2xl">📐</span>
            <div>
              <h2 class="card-title">Distance from Competition</h2>
              <p class="card-subtitle">
                Click any team to see where they stand in every category — yellow highlights the selected team.
              </p>
            </div>
          </div>

          <!-- Horizontal team selector (ordered by roto points) -->
          <div class="mt-4 pt-4 border-t border-dark-border/30">
            <!-- Desktop: scrollable full list -->
            <div class="hidden sm:block overflow-x-auto">
              <div class="flex items-center gap-1.5 min-w-max pb-1">
                <button
                  v-for="(row, idx) in standingsRows"
                  :key="row.team.team_key"
                  @click="selectedTeamKey = row.team.team_key"
                  class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all flex-shrink-0 border"
                  :class="row.team.team_key === selectedTeamKey
                    ? 'bg-yellow-400/15 border-yellow-400/70 text-yellow-200 shadow-sm'
                    : 'border-transparent hover:bg-dark-border/40 text-dark-textSecondary'"
                >
                  <span class="text-[10px] text-dark-textMuted font-bold w-4 text-center">{{ idx + 1 }}</span>
                  <img
                    v-if="row.team.logo_url"
                    :src="row.team.logo_url"
                    class="w-5 h-5 rounded-full bg-dark-elevated object-cover flex-shrink-0"
                    @error="(e: any) => e.target.style.display = 'none'"
                  />
                  <span class="font-semibold truncate max-w-[110px]">{{ row.team.name }}</span>
                  <span v-if="row.team.team_key === myTeamKey" class="text-yellow-400 text-[10px]">★</span>
                </button>
              </div>
            </div>
            <!-- Mobile: paginated -->
            <div class="sm:hidden">
              <div class="flex items-center gap-2">
                <button
                  @click="teamSelectorPage = Math.max(0, teamSelectorPage - 1)"
                  :disabled="teamSelectorPage === 0"
                  class="w-7 h-7 rounded-full flex items-center justify-center transition-all flex-shrink-0"
                  :class="teamSelectorPage === 0 ? 'text-dark-border cursor-default' : 'text-yellow-400 hover:bg-yellow-400/10'"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                </button>
                <div class="flex-1 grid grid-cols-3 gap-1.5">
                  <button
                    v-for="row in mobileTeamSelectorRows"
                    :key="row.team.team_key"
                    @click="selectedTeamKey = row.team.team_key"
                    class="flex items-center gap-1.5 px-1.5 py-1.5 rounded-lg text-xs transition-all border min-w-0"
                    :class="row.team.team_key === selectedTeamKey
                      ? 'bg-yellow-400/15 border-yellow-400/70 text-yellow-200 shadow-sm'
                      : 'border-transparent bg-dark-border/20 text-dark-textSecondary'"
                  >
                    <span class="text-[10px] text-dark-textMuted font-bold flex-shrink-0">{{ standingsRows.findIndex(r => r.team.team_key === row.team.team_key) + 1 }}</span>
                    <img
                      v-if="row.team.logo_url"
                      :src="row.team.logo_url"
                      class="w-5 h-5 rounded-full bg-dark-elevated object-cover flex-shrink-0"
                      @error="(e: any) => e.target.style.display = 'none'"
                    />
                    <span class="font-semibold truncate text-[11px] min-w-0">{{ row.team.name }}</span>
                  </button>
                </div>
                <button
                  @click="teamSelectorPage = Math.min(teamSelectorPageCount - 1, teamSelectorPage + 1)"
                  :disabled="teamSelectorPage >= teamSelectorPageCount - 1"
                  class="w-7 h-7 rounded-full flex items-center justify-center transition-all flex-shrink-0"
                  :class="teamSelectorPage >= teamSelectorPageCount - 1 ? 'text-dark-border cursor-default' : 'text-yellow-400 hover:bg-yellow-400/10'"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                </button>
              </div>
              <div class="flex justify-center gap-1.5 mt-2" v-if="teamSelectorPageCount > 1">
                <div
                  v-for="i in teamSelectorPageCount"
                  :key="i"
                  class="w-1.5 h-1.5 rounded-full transition-colors"
                  :class="i - 1 === teamSelectorPage ? 'bg-yellow-400' : 'bg-dark-border/60'"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="card-body">
          <!-- Mobile distance page nav -->
          <div v-if="distancePageCount > 1" class="sm:hidden flex items-center justify-center gap-3 pb-3 mb-2">
            <button
              @click="distancePage = Math.max(0, distancePage - 1)"
              :disabled="distancePage === 0"
              class="w-7 h-7 rounded-full flex items-center justify-center transition-all"
              :class="distancePage === 0 ? 'text-dark-border cursor-default' : 'text-yellow-400 hover:bg-yellow-400/10'"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <div class="flex gap-1.5">
              <div
                v-for="i in distancePageCount"
                :key="i"
                class="w-2 h-2 rounded-full transition-colors"
                :class="i - 1 === distancePage ? 'bg-yellow-400' : 'bg-dark-border/60'"
              />
            </div>
            <button
              @click="distancePage = Math.min(distancePageCount - 1, distancePage + 1)"
              :disabled="distancePage >= distancePageCount - 1"
              class="w-7 h-7 rounded-full flex items-center justify-center transition-all"
              :class="distancePage >= distancePageCount - 1 ? 'text-dark-border cursor-default' : 'text-yellow-400 hover:bg-yellow-400/10'"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>

          <div class="overflow-x-auto">
            <div class="flex gap-4 sm:min-w-max pb-2 justify-center sm:justify-start">
              <div
                v-for="col in distanceColumns"
                :key="col.stat_id"
                class="flex-col"
                :class="isCatOnDistancePage(col) ? 'flex flex-1 sm:flex-none' : 'hidden sm:flex'"
                style="min-width: 124px;"
              >
                <!-- Category header -->
                <div class="text-center pb-2 mb-2 border-b border-dark-border/30">
                  <div class="text-sm font-bold text-dark-text">{{ col.display_name }}</div>
                  <div class="text-[10px] uppercase tracking-wider text-dark-textMuted mt-0.5">
                    {{ col.isLowerBetter ? '↓ Lower' : '↑ Higher' }}
                  </div>
                </div>

                <!-- Leader value -->
                <div class="text-center text-[11px] font-bold text-green-400 mb-1.5">
                  {{ formatStat(col.leaderVal, col.stat_id) }}
                </div>

                <!-- Vertical axis: every team plotted at its proportional y-position -->
                <div
                  class="relative rounded-xl"
                  style="height: 620px; background: rgba(5,6,10,0.55);"
                >
                  <!-- Top/bottom hairlines -->
                  <div class="absolute inset-x-3 h-px bg-green-500/40" style="top: 18px;"></div>
                  <div class="absolute inset-x-3 h-px bg-red-500/40" style="bottom: 18px;"></div>

                  <!-- Central dashed spine -->
                  <div
                    class="absolute left-1/2 -translate-x-1/2 border-l-2 border-dashed border-dark-textMuted/30 pointer-events-none"
                    style="top: 18px; bottom: 18px; z-index: 1;"
                  ></div>

                  <!-- Team rows: logo is the centered anchor on the spine; value right, delta (neighbors only) left -->
                  <div
                    v-for="entry in col.entries"
                    :key="entry.team_key"
                    class="absolute"
                    :style="{ top: `calc(18px + (100% - 36px) * ${entry.yPct} / 100)`, left: '50%', transform: 'translate(-50%, -50%)', zIndex: markerZ(entry) + 5 }"
                    :title="entry.name"
                  >
                    <div class="relative flex items-center justify-center" :style="{ width: logoSize(entry), height: logoSize(entry) }">
                      <!-- Logo -->
                      <template v-if="entry.logoUrl">
                        <img
                          :src="entry.logoUrl"
                          class="absolute inset-0 w-full h-full rounded-full bg-dark-elevated object-cover transition-all"
                          :class="logoClass(entry)"
                          :style="logoInlineStyle(entry)"
                          @error="(e: any) => { e.target.style.display = 'none' }"
                        />
                      </template>
                      <div
                        v-else
                        class="absolute inset-0 w-full h-full rounded-full bg-dark-border flex items-center justify-center text-[9px] font-bold text-dark-text transition-all"
                        :class="logoClass(entry)"
                      >{{ initials(entry.name) }}</div>

                      <!-- Value to the right of logo -->
                      <span
                        class="absolute top-1/2 -translate-y-1/2 text-[11px] font-mono font-semibold whitespace-nowrap"
                        :class="valueClass(entry, col)"
                        style="left: calc(100% + 6px);"
                      >{{ formatStat(entry.value, col.stat_id) }}</span>

                      <!-- Delta to the left of neighbor logo: team ahead of user (red +X) -->
                      <span
                        v-if="entry.isAbove"
                        class="absolute top-1/2 -translate-y-1/2 text-[10px] font-bold text-red-300 bg-red-500/15 border border-red-500/50 rounded px-1 py-px whitespace-nowrap"
                        style="right: calc(100% + 6px);"
                      >+{{ formatGap(col.aboveGap, col.stat_id) }}</span>
                      <!-- Delta to the left of neighbor logo: team behind user (green −X) -->
                      <span
                        v-else-if="entry.isBelow"
                        class="absolute top-1/2 -translate-y-1/2 text-[10px] font-bold text-green-300 bg-green-500/15 border border-green-500/50 rounded px-1 py-px whitespace-nowrap"
                        style="right: calc(100% + 6px);"
                      >−{{ formatGap(col.belowGap, col.stat_id) }}</span>
                    </div>
                  </div>
                </div>

                <!-- Last value -->
                <div class="text-center text-[11px] font-bold text-red-400 mt-1.5">
                  {{ formatStat(col.lastVal, col.stat_id) }}
                </div>
              </div>
            </div>
          </div>

          <!-- Quick summary for selected team -->
          <div v-if="viewedTeamSummary" class="mt-6 pt-4 border-t border-dark-border/30 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <div class="text-xs text-dark-textMuted uppercase tracking-wider">Best category</div>
              <div class="text-green-400 font-semibold mt-0.5">
                {{ viewedTeamSummary.best.display_name }}
                <span class="text-dark-textMuted font-normal">· #{{ viewedTeamSummary.best.rank }}</span>
              </div>
            </div>
            <div>
              <div class="text-xs text-dark-textMuted uppercase tracking-wider">Worst category</div>
              <div class="text-red-400 font-semibold mt-0.5">
                {{ viewedTeamSummary.worst.display_name }}
                <span class="text-dark-textMuted font-normal">· #{{ viewedTeamSummary.worst.rank }}</span>
              </div>
            </div>
            <div>
              <div class="text-xs text-dark-textMuted uppercase tracking-wider">Categories led</div>
              <div class="text-dark-text font-semibold mt-0.5">{{ viewedTeamSummary.led }}</div>
            </div>
            <div>
              <div class="text-xs text-dark-textMuted uppercase tracking-wider">Total roto pts</div>
              <div class="text-primary font-semibold mt-0.5">{{ viewedTeamSummary.total.toFixed(1) }}</div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'

const leagueStore = useLeagueStore()

type ViewMode = 'points' | 'stats'

interface StatCategory {
  stat_id: string
  name: string
  display_name: string
  positionType: string
  isLowerBetter: boolean
}

interface CellData {
  value: number
  points: number
  rank: number
  isBest: boolean
  isWorst: boolean
}

interface StandingsRow {
  team: any
  cells: Record<string, CellData>
  total: number
}

const loading = ref(true)
const statCategories = ref<StatCategory[]>([])
const teamSeasonStats = ref<Record<string, Record<string, number>>>({})
const viewMode = ref<ViewMode>('points')
const selectedTeamKey = ref<string>('')
const lastUpdated = ref<Date>(new Date())
const nowTick = ref(Date.now())

// Mobile pagination
const standingsPage = ref(0)
const STANDINGS_CATS_PER_PAGE = 4
const distancePage = ref(0)
const DISTANCE_COLS_PER_PAGE = 2
const teamSelectorPage = ref(0)
const TEAM_SELECTOR_PER_PAGE = 3

const LOWER_IS_BETTER = new Set(['26', '27'])

// Auto-refresh: poll every 60s while mounted
let pollTimer: number | null = null
let tickTimer: number | null = null

const myTeam = computed(() => leagueStore.yahooTeams?.find((t: any) => t.is_my_team))
const myTeamKey = computed(() => myTeam.value?.team_key || '')

const teams = computed(() => leagueStore.yahooTeams || leagueStore.yahooStandings || [])

const battingCats = computed(() => statCategories.value.filter(c => c.positionType === 'B' || c.positionType === ''))
const pitchingCats = computed(() => statCategories.value.filter(c => c.positionType === 'P'))
const hasPositionGroups = computed(() => battingCats.value.length > 0 && pitchingCats.value.length > 0)
const orderedCategories = computed(() => hasPositionGroups.value
  ? [...battingCats.value, ...pitchingCats.value]
  : statCategories.value
)

const teamsForSelect = computed(() => {
  const list = [...teams.value]
  return list.sort((a: any, b: any) => {
    if (a.team_key === myTeamKey.value) return -1
    if (b.team_key === myTeamKey.value) return 1
    return (a.name || '').localeCompare(b.name || '')
  })
})

const viewedTeam = computed(() => teams.value.find((t: any) => t.team_key === selectedTeamKey.value))

// Mobile pagination computeds
const standingsPageCount = computed(() => Math.max(1, Math.ceil(orderedCategories.value.length / STANDINGS_CATS_PER_PAGE)))
const mobileStandingsCats = computed(() => {
  const start = standingsPage.value * STANDINGS_CATS_PER_PAGE
  return orderedCategories.value.slice(start, start + STANDINGS_CATS_PER_PAGE)
})
const distancePageCount = computed(() => Math.max(1, Math.ceil(orderedCategories.value.length / DISTANCE_COLS_PER_PAGE)))
const mobileDistanceCols = computed(() => {
  const start = distancePage.value * DISTANCE_COLS_PER_PAGE
  return distanceColumns.value.slice(start, start + DISTANCE_COLS_PER_PAGE)
})
const teamSelectorPageCount = computed(() => Math.max(1, Math.ceil(standingsRows.value.length / TEAM_SELECTOR_PER_PAGE)))
const mobileTeamSelectorRows = computed(() => {
  const start = teamSelectorPage.value * TEAM_SELECTOR_PER_PAGE
  return standingsRows.value.slice(start, start + TEAM_SELECTOR_PER_PAGE)
})

// Build per-team cells: rank + ranking-point per category
const standingsRows = computed<StandingsRow[]>(() => {
  const rows: StandingsRow[] = teams.value
    .filter((t: any) => teamSeasonStats.value[t.team_key])
    .map((t: any) => ({
      team: t,
      cells: {} as Record<string, CellData>,
      total: 0
    }))

  const numTeams = rows.length
  for (const cat of statCategories.value) {
    const sid = cat.stat_id
    const sorted = [...rows].sort((a, b) => {
      const av = teamSeasonStats.value[a.team.team_key]?.[sid] ?? 0
      const bv = teamSeasonStats.value[b.team.team_key]?.[sid] ?? 0
      return cat.isLowerBetter ? av - bv : bv - av
    })
    // Handle ties with average ranking points
    let i = 0
    while (i < sorted.length) {
      let j = i
      const v = teamSeasonStats.value[sorted[i].team.team_key]?.[sid] ?? 0
      while (
        j + 1 < sorted.length &&
        (teamSeasonStats.value[sorted[j + 1].team.team_key]?.[sid] ?? 0) === v
      ) j++
      const avgPoints = (numTeams - i + numTeams - j) / 2
      for (let k = i; k <= j; k++) {
        sorted[k].cells[sid] = {
          value: teamSeasonStats.value[sorted[k].team.team_key]?.[sid] ?? 0,
          points: avgPoints,
          rank: i + 1,
          isBest: i === 0,
          isWorst: j === sorted.length - 1
        }
      }
      i = j + 1
    }
  }

  for (const r of rows) {
    r.total = Object.values(r.cells).reduce((s, c) => s + c.points, 0)
  }
  rows.sort((a, b) => b.total - a.total)
  return rows
})

const sortedTeams = computed(() => standingsRows.value.map(r => r.team))

const tightestRace = computed(() => {
  const rows = standingsRows.value
  if (rows.length < 2) return null
  let minGap = Infinity
  let a: any = null
  let b: any = null
  for (let i = 0; i < rows.length - 1; i++) {
    const gap = rows[i].total - rows[i + 1].total
    if (gap < minGap && gap >= 0) {
      minGap = gap
      a = rows[i].team
      b = rows[i + 1].team
    }
  }
  return { team1: a, team2: b, gap: minGap }
})

// Distance-from-competition columns (proportional vertical axis)
const distanceColumns = computed(() => {
  return orderedCategories.value.map(cat => {
    const raw = teams.value
      .filter((t: any) => teamSeasonStats.value[t.team_key] !== undefined)
      .map((t: any) => ({
        team_key: t.team_key,
        name: t.name,
        logoUrl: t.logo_url || '',
        value: teamSeasonStats.value[t.team_key]?.[cat.stat_id] ?? 0
      }))
    raw.sort((a: any, b: any) => cat.isLowerBetter ? a.value - b.value : b.value - a.value)

    const values = raw.map((e: any) => e.value)
    const vMin = values.length ? Math.min(...values) : 0
    const vMax = values.length ? Math.max(...values) : 0
    const range = vMax - vMin || 1

    const selectedIdx = raw.findIndex((e: any) => e.team_key === selectedTeamKey.value)
    const selected = selectedIdx >= 0 ? raw[selectedIdx] : null
    const above = selectedIdx > 0 ? raw[selectedIdx - 1] : null
    const below = selectedIdx >= 0 && selectedIdx < raw.length - 1 ? raw[selectedIdx + 1] : null

    const entries = raw.map((e: any, idx: number) => {
      // yPct: 0 at top (best), 100 at bottom (worst)
      const pct = range === 0
        ? 50
        : cat.isLowerBetter
          ? ((e.value - vMin) / range) * 100
          : ((vMax - e.value) / range) * 100
      return {
        ...e,
        rank: idx + 1,
        yPct: pct,
        isSelected: e.team_key === selectedTeamKey.value,
        isMyTeam: e.team_key === myTeamKey.value,
        isAbove: !!above && e.team_key === above.team_key,
        isBelow: !!below && e.team_key === below.team_key
      }
    })

    return {
      ...cat,
      entries,
      leaderVal: raw.length ? raw[0].value : 0,
      lastVal: raw.length ? raw[raw.length - 1].value : 0,
      selected,
      above,
      below,
      aboveGap: above && selected ? Math.abs(above.value - selected.value) : 0,
      belowGap: below && selected ? Math.abs(selected.value - below.value) : 0
    }
  })
})

const viewedTeamSummary = computed(() => {
  if (!selectedTeamKey.value) return null
  const row = standingsRows.value.find(r => r.team.team_key === selectedTeamKey.value)
  if (!row) return null
  let best: any = null
  let worst: any = null
  let led = 0
  for (const cat of statCategories.value) {
    const cell = row.cells[cat.stat_id]
    if (!cell) continue
    if (cell.isBest) led++
    if (!best || cell.rank < best.rank) best = { ...cat, rank: cell.rank }
    if (!worst || cell.rank > worst.rank) worst = { ...cat, rank: cell.rank }
  }
  return { best, worst, led, total: row.total }
})

const lastUpdatedLabel = computed(() => {
  void nowTick.value
  const diffSec = Math.floor((Date.now() - lastUpdated.value.getTime()) / 1000)
  if (diffSec < 10) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`
  const m = Math.floor(diffSec / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return `${h}h ago`
})

function isCatOnStandingsPage(cat: StatCategory) {
  const idx = orderedCategories.value.indexOf(cat)
  const start = standingsPage.value * STANDINGS_CATS_PER_PAGE
  return idx >= start && idx < start + STANDINGS_CATS_PER_PAGE
}

function isCatOnDistancePage(col: any) {
  const idx = orderedCategories.value.findIndex(c => c.stat_id === col.stat_id)
  const start = distancePage.value * DISTANCE_COLS_PER_PAGE
  return idx >= start && idx < start + DISTANCE_COLS_PER_PAGE
}

function rankColorClass(idx: number) {
  if (idx === 0) return 'text-yellow-400'
  if (idx === 1) return 'text-dark-textSecondary'
  if (idx === 2) return 'text-amber-600'
  return 'text-dark-textMuted'
}

function cellColorClass(cell: CellData | undefined) {
  if (!cell) return 'text-dark-textMuted'
  if (cell.isBest) return 'text-green-400'
  if (cell.isWorst) return 'text-red-400'
  return 'text-dark-text'
}

function markerZ(entry: any) {
  if (entry.isSelected) return 40
  if (entry.isAbove || entry.isBelow) return 30
  if (entry.isMyTeam) return 20
  if (entry.rank === 1 || entry.yPct >= 99) return 10
  return 1
}

function valueClass(entry: any, col: any) {
  if (entry.isSelected) return 'text-yellow-300 font-bold'
  if (entry.isAbove) return 'text-red-300'
  if (entry.isBelow) return 'text-green-300'
  if (entry.isMyTeam && selectedTeamKey.value !== myTeamKey.value) return 'text-yellow-400/70'
  if (entry.rank === 1) return 'text-green-400'
  if (entry.rank === col.entries.length) return 'text-red-400'
  return 'text-dark-textSecondary'
}

function logoClass(entry: any) {
  if (entry.isSelected) return 'shadow-lg'
  if (entry.isMyTeam && selectedTeamKey.value !== myTeamKey.value) {
    return 'ring-1 ring-yellow-400/60'
  }
  if (entry.isAbove) return 'ring-1 ring-red-500/70'
  if (entry.isBelow) return 'ring-1 ring-green-500/70'
  return 'border border-dark-border/60 opacity-70 hover:opacity-100 transition-opacity'
}

function logoSize(entry: any) {
  if (entry.isSelected) return '30px'
  if (entry.isMyTeam && selectedTeamKey.value !== myTeamKey.value) return '24px'
  if (entry.isAbove || entry.isBelow) return '22px'
  return '20px'
}

function logoInlineStyle(entry: any) {
  const size = logoSize(entry)
  const style: Record<string, string> = { width: size, height: size }
  if (entry.isSelected) {
    style.boxShadow = '0 0 0 2.5px #facc15, 0 0 14px rgba(250,204,21,0.45), 0 4px 10px rgba(0,0,0,0.4)'
  }
  return style
}

function initials(name: string) {
  if (!name) return '?'
  return name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function formatGap(gap: number, statId: string) {
  if (gap === 0) return '0'
  if (['4', '26', '27'].includes(statId)) return gap.toFixed(3)
  if (Number.isInteger(gap)) return gap.toString()
  return gap.toFixed(1)
}

function formatPoints(p: number | undefined) {
  if (p === undefined) return '—'
  return Number.isInteger(p) ? p.toString() : p.toFixed(1)
}

function formatStat(v: number | undefined, statId: string) {
  if (v === undefined || v === null || Number.isNaN(v)) return '—'
  // Rate stats
  if (['4', '26', '27'].includes(statId)) return v.toFixed(3)
  if (Number.isInteger(v)) return v.toString()
  return v.toFixed(1)
}

async function loadData(silent = false) {
  if (!silent) loading.value = true
  try {
    const { yahooService } = await import('@/services/yahoo')
    const leagueKey = leagueStore.currentLeague?.league_id || leagueStore.activeLeagueId
    if (!leagueKey) return

    const settings = await yahooService.getLeagueSettings(leagueKey)
    const rawCats = settings?.stat_categories?.stats || settings?.stat_categories || []
    const cats: StatCategory[] = []
    for (const cat of rawCats) {
      const s = cat?.stat || cat
      const sid = String(s?.stat_id ?? '')
      if (!sid || s?.is_only_display_stat === '1' || s?.is_only_display_stat === 1) continue
      const isLower = s?.sort_order === '0' || s?.sort_order === 0 || LOWER_IS_BETTER.has(sid)
      if (isLower) LOWER_IS_BETTER.add(sid)
      cats.push({
        stat_id: sid,
        name: s?.display_name || s?.name || `Stat ${sid}`,
        display_name: s?.abbr || s?.display_name || s?.name || `S${sid}`,
        positionType: s?.position_type || '',
        isLowerBetter: isLower
      })
    }
    LOWER_IS_BETTER.add('26')
    LOWER_IS_BETTER.add('27')
    statCategories.value = cats

    const ts = leagueStore.yahooTeams || leagueStore.yahooStandings || []
    const stats: Record<string, Record<string, number>> = {}
    for (const team of ts) {
      const tk = team.team_key || team.team_id
      if (!tk) continue
      try {
        const teamStats = await yahooService.getTeamSeasonStats(tk)
        if (teamStats && Object.keys(teamStats).length > 0) {
          stats[tk] = teamStats
        }
      } catch {
        // skip
      }
    }
    teamSeasonStats.value = stats
    lastUpdated.value = new Date()

    if (!selectedTeamKey.value) {
      selectedTeamKey.value = myTeamKey.value || ts[0]?.team_key || ''
    }
  } catch (e) {
    console.error('[RotoRace] Failed to load data:', e)
  } finally {
    if (!silent) loading.value = false
  }
}

onMounted(() => {
  loadData()
  pollTimer = window.setInterval(() => loadData(true), 60_000)
  tickTimer = window.setInterval(() => { nowTick.value = Date.now() }, 10_000)
})

onBeforeUnmount(() => {
  if (pollTimer) window.clearInterval(pollTimer)
  if (tickTimer) window.clearInterval(tickTimer)
})

watch(() => leagueStore.activeLeagueId, () => {
  selectedTeamKey.value = ''
  standingsPage.value = 0
  distancePage.value = 0
  teamSelectorPage.value = 0
  loadData()
})

// Auto-page the team selector to show the user's team (or currently selected team)
watch([standingsRows, selectedTeamKey], ([rows, key]) => {
  if (!rows.length || !key) return
  const idx = rows.findIndex(r => r.team.team_key === key)
  if (idx < 0) return
  teamSelectorPage.value = Math.floor(idx / TEAM_SELECTOR_PER_PAGE)
}, { immediate: true })
</script>
