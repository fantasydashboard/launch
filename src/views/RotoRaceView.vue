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
      <div class="card" ref="standingsCardRef">
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
            <div class="flex items-center gap-2 self-start sm:self-auto">
              <!-- Points / Stats toggle -->
              <div class="inline-flex rounded-lg border border-dark-border/50 bg-dark-bg p-1">
                <button
                  @click="viewMode = 'points'"
                  class="px-4 py-1.5 text-xs font-semibold rounded-md transition-all"
                  :class="viewMode === 'points'
                    ? 'bg-yellow-400 text-gray-900 shadow-sm'
                    : 'text-dark-textMuted hover:text-dark-text'"
                >
                  Points
                </button>
                <button
                  @click="viewMode = 'stats'"
                  class="px-4 py-1.5 text-xs font-semibold rounded-md transition-all"
                  :class="viewMode === 'stats'
                    ? 'bg-yellow-400 text-gray-900 shadow-sm'
                    : 'text-dark-textMuted hover:text-dark-text'"
                >
                  Stats
                </button>
              </div>
              <!-- Share button -->
              <button
                @click="shareSection('standings')"
                :disabled="shareState.standings === 'loading'"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                :style="shareState.standings === 'success'
                  ? 'background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid #10b981;'
                  : 'background: transparent; color: #facc15; border: 1px solid #facc15;'"
                data-html2canvas-ignore
              >
                <svg v-if="shareState.standings === 'loading'" class="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <svg v-else-if="shareState.standings === 'success'" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/>
                </svg>
                {{ shareState.standings === 'loading' ? 'Generating…' : shareState.standings === 'success' ? 'Copied!' : 'Share' }}
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
                          row.team.team_key === myTeamKey ? 'text-yellow-400' : 'text-dark-text',
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
                  <td class="py-3 px-2 sm:px-3 text-right font-bold sm:border-l sm:border-dark-border/30 text-yellow-400 whitespace-nowrap">
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
      <div class="card" ref="distanceCardRef">
        <div class="card-header">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-start gap-2">
              <span class="text-2xl">📐</span>
              <div>
                <h2 class="card-title">Distance from Competition</h2>
                <p class="card-subtitle">
                  Click any team to see where they stand in every category — yellow highlights the selected team.
                </p>
              </div>
            </div>
            <!-- Share button -->
            <button
              @click="shareSection('distance')"
              :disabled="shareState.distance === 'loading'"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 flex-shrink-0"
              :style="shareState.distance === 'success'
                ? 'background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid #10b981;'
                : 'background: transparent; color: #facc15; border: 1px solid #facc15;'"
              data-html2canvas-ignore
            >
              <svg v-if="shareState.distance === 'loading'" class="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <svg v-else-if="shareState.distance === 'success'" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/>
              </svg>
              {{ shareState.distance === 'loading' ? 'Generating…' : shareState.distance === 'success' ? 'Copied!' : 'Share' }}
            </button>
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
              <div class="text-yellow-400 font-semibold mt-0.5">{{ viewedTeamSummary.total.toFixed(1) }}</div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useFeatureAccess } from '@/composables/useFeatureAccess'

const leagueStore = useLeagueStore()
const { canDownload } = useFeatureAccess()

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

// Template refs for share
const standingsCardRef = ref<HTMLElement | null>(null)
const distanceCardRef = ref<HTMLElement | null>(null)

// Share state: per-section 'idle' | 'loading' | 'success' | 'error'
const shareState = ref<{ standings: string; distance: string }>({ standings: 'idle', distance: 'idle' })

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

async function shareSection(section: 'standings' | 'distance') {
  if (!canDownload.value) {
    window.dispatchEvent(new CustomEvent('ufd:show-upgrade'))
    return
  }

  shareState.value[section] = 'loading'

  try {
    const html2canvas = (await import('html2canvas')).default

    // Preload UFD logo
    const loadLogo = async (): Promise<string> => {
      try {
        const res = await fetch('/UFD_V8.png')
        if (!res.ok) return ''
        const blob = await res.blob()
        return await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string || '')
          reader.onerror = () => resolve('')
          reader.readAsDataURL(blob)
        })
      } catch { return '' }
    }

    // Create a circular placeholder from team initials
    const placeholderLogo = (name: string): string => {
      const canvas = document.createElement('canvas')
      canvas.width = 64; canvas.height = 64
      const ctx = canvas.getContext('2d')
      if (ctx) {
        const colors = ['#0D8ABC', '#9B59B6', '#E91E63', '#F39C12', '#1ABC9C', '#2ECC71', '#E74C3C', '#00BCD4', '#8E44AD', '#3498DB']
        const colorIdx = (name || '').split('').reduce((s, c) => s + c.charCodeAt(0), 0) % colors.length
        ctx.fillStyle = colors[colorIdx]
        ctx.beginPath(); ctx.arc(32, 32, 32, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 28px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText((name || '?').charAt(0).toUpperCase(), 32, 34)
      }
      return canvas.toDataURL('image/png')
    }

    const drawCircle = (img: HTMLImageElement): string => {
      const c = document.createElement('canvas')
      c.width = 64; c.height = 64
      const ctx = c.getContext('2d')
      if (ctx) {
        ctx.beginPath(); ctx.arc(32, 32, 32, 0, Math.PI * 2); ctx.closePath(); ctx.clip()
        ctx.drawImage(img, 0, 0, 64, 64)
      }
      return c.toDataURL('image/png')
    }

    const loadTeamImage = async (team: any): Promise<string> => {
      const url = team.logo_url || ''
      if (!url) return placeholderLogo(team.name)
      const tryFetch = async (fetchUrl: string): Promise<string> => {
        try {
          const res = await fetch(fetchUrl, { signal: AbortSignal.timeout(6000) })
          if (!res.ok) return ''
          const blob = await res.blob()
          if (blob.size < 100) return ''
          const dataUrl = await new Promise<string>((resolve) => {
            const r = new FileReader()
            r.onloadend = () => resolve(r.result as string || '')
            r.onerror = () => resolve('')
            r.readAsDataURL(blob)
          })
          if (!dataUrl.startsWith('data:')) return ''
          return await new Promise<string>((resolve) => {
            const img = new Image()
            img.onload = () => { try { resolve(drawCircle(img)) } catch { resolve('') } }
            img.onerror = () => resolve('')
            img.src = dataUrl
          })
        } catch { return '' }
      }
      const r1 = await tryFetch(`/api/proxy-image?url=${encodeURIComponent(url)}`)
      if (r1) return r1
      const r2 = await tryFetch(url)
      if (r2) return r2
      return placeholderLogo(team.name)
    }

    const logoBase64 = await loadLogo()
    const imageMap = new Map<string, string>()
    await Promise.all(teams.value.map(async (t: any) => {
      imageMap.set(t.team_key, await loadTeamImage(t))
    }))

    const leagueName = (leagueStore.currentLeague as any)?.name
      || (leagueStore.yahooLeague as any)?.[0]?.name
      || (leagueStore.savedLeagues || []).find((l: any) => l.league_id === leagueStore.activeLeagueId)?.league_name
      || 'League'
    const dateStr = new Date().toLocaleDateString()

    const SHARE_WIDTH = section === 'standings' ? 1100 : 1200

    const brandFrame = (title: string, subtitle: string, inner: string) => `
      <div style="background: linear-gradient(160deg, #0f1219 0%, #0a0c14 50%, #0d1117 100%); border-radius: 16px; box-shadow: 0 12px 40px rgba(0,0,0,0.5); overflow: hidden;">
        <!-- Top Yellow Bar -->
        <div style="background: #facc15; padding: 10px 24px; text-align: center;">
          <span style="font-size: 16px; font-weight: 700; color: #0a0c14; text-transform: uppercase; letter-spacing: 3px; display: block; margin-top: -17px;">Ultimate Fantasy Dashboard</span>
        </div>
        <!-- Header -->
        <div style="display: flex; align-items: flex-start; padding: 18px 24px; border-bottom: 1px solid rgba(250,204,21,0.2);">
          ${logoBase64 ? `<img src="${logoBase64}" style="height: 64px; width: auto; margin-right: 20px; display: block;" />` : ''}
          <div style="flex: 1; margin-top: -10px;">
            <div style="font-size: 36px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 2px 8px rgba(250,204,21,0.4); line-height: 1.05;">${title}</div>
            <div style="font-size: 18px; margin-top: 8px; font-weight: 600; line-height: 1;">
              <span style="color: #e5e7eb;">${leagueName}</span>
              <span style="color: #6b7280; margin: 0 8px;">•</span>
              <span style="color: #facc15; font-weight: 700;">${subtitle}</span>
            </div>
          </div>
        </div>
        <!-- Main content -->
        <div style="padding: 20px 24px;">${inner}</div>
        <!-- Footer -->
        <div style="padding: 16px 24px 20px; text-align: center;">
          <span style="font-size: 22px; font-weight: bold; color: #facc15; letter-spacing: -0.5px; display: block; margin-top: -20px;">ultimatefantasydashboard.com</span>
        </div>
      </div>
    `

    const container = document.createElement('div')
    container.style.cssText = `position: absolute; left: -99999px; top: 0; width: ${SHARE_WIDTH}px; font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;`

    if (section === 'standings') {
      const cats = orderedCategories.value
      const rowHtml = standingsRows.value.map((row, idx) => {
        const cells = cats.map(cat => {
          const cell = row.cells[cat.stat_id]
          const val = viewMode.value === 'points' ? formatPoints(cell?.points) : formatStat(cell?.value, cat.stat_id)
          const color = cell?.isBest ? '#4ade80' : cell?.isWorst ? '#f87171' : '#e5e7eb'
          return `<td style="padding: 10px 6px; text-align: center; font-weight: 700; color: ${color}; font-size: 13px; white-space: nowrap;">${val}</td>`
        }).join('')
        const rankColor = idx === 0 ? '#facc15' : idx === 1 ? '#b0b3c2' : idx === 2 ? '#b87333' : '#7b7f92'
        const rowBg = row.team.team_key === myTeamKey.value ? 'background: rgba(250,204,21,0.08);' : ''
        return `
          <tr style="border-bottom: 1px solid rgba(38,42,58,0.5); ${rowBg}">
            <td style="padding: 10px 10px; font-weight: 900; color: ${rankColor}; font-size: 15px;">${idx + 1}</td>
            <td style="padding: 10px 8px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <img src="${imageMap.get(row.team.team_key) || ''}" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; background: #262a3a; flex-shrink: 0;" />
                <span style="font-weight: 700; color: ${row.team.team_key === myTeamKey.value ? '#facc15' : '#f7f7ff'}; font-size: 13px; white-space: nowrap;">${row.team.name}</span>
              </div>
            </td>
            ${cells}
            <td style="padding: 10px 10px; text-align: right; font-weight: 900; color: #facc15; font-size: 15px; border-left: 1px solid rgba(38,42,58,0.5); white-space: nowrap;">${row.total.toFixed(1)}</td>
            <td style="padding: 10px 10px; text-align: right; color: #7b7f92; font-size: 12px; white-space: nowrap;">${idx === 0 ? '—' : (standingsRows.value[0].total - row.total).toFixed(1)}</td>
          </tr>
        `
      }).join('')

      const catHeaders = cats.map(cat => {
        const border = cat.positionType === 'P' && battingCats.value.length ? 'border-left: 1px solid rgba(38,42,58,0.5);' : ''
        return `<th style="padding: 10px 6px; text-align: center; color: #7b7f92; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; ${border}">${cat.display_name}</th>`
      }).join('')

      const groupHeader = hasPositionGroups.value ? `
        <tr style="border-bottom: 1px solid rgba(38,42,58,0.4);">
          <th></th><th></th>
          ${battingCats.value.length ? `<th colspan="${battingCats.value.length}" style="padding: 8px; text-align: center; color: #b0b3c2; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Batting</th>` : ''}
          ${pitchingCats.value.length ? `<th colspan="${pitchingCats.value.length}" style="padding: 8px; text-align: center; color: #b0b3c2; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; border-left: 1px solid rgba(38,42,58,0.5);">Pitching</th>` : ''}
          <th></th><th></th>
        </tr>
      ` : ''

      const subtitle = viewMode.value === 'points'
        ? `Roto Points · #1 = ${standingsRows.value.length} pts`
        : 'Season Stats'

      const inner = `
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            ${groupHeader}
            <tr style="border-bottom: 1px solid rgba(38,42,58,0.6);">
              <th style="padding: 10px; text-align: left; color: #7b7f92; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">#</th>
              <th style="padding: 10px; text-align: left; color: #7b7f92; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Team</th>
              ${catHeaders}
              <th style="padding: 10px; text-align: right; color: #7b7f92; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-left: 1px solid rgba(38,42,58,0.5);">Total</th>
              <th style="padding: 10px; text-align: right; color: #7b7f92; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Back</th>
            </tr>
          </thead>
          <tbody>${rowHtml}</tbody>
        </table>
      `

      container.innerHTML = brandFrame('Overall Standings', subtitle, inner)
    } else {
      // Distance from Competition
      const cols = distanceColumns.value
      const AXIS_HEIGHT = 520
      const PAD = 16
      const colsHtml = cols.map(col => {
        const markers = col.entries.map((entry: any) => {
          const top = PAD + ((AXIS_HEIGHT - PAD * 2) * entry.yPct) / 100
          const isSelected = entry.isSelected
          const isAbove = entry.isAbove
          const isBelow = entry.isBelow
          const size = isSelected ? 30 : (isAbove || isBelow) ? 22 : 18
          const ring = isSelected ? '0 0 0 2.5px #facc15, 0 0 10px rgba(250,204,21,0.5)'
            : isAbove ? '0 0 0 1px rgba(239,68,68,0.7)'
            : isBelow ? '0 0 0 1px rgba(34,197,94,0.7)'
            : '0 0 0 1px rgba(38,42,58,0.6)'
          const opacity = isSelected || isAbove || isBelow ? 1 : 0.7
          const valueColor = isSelected ? '#fde047'
            : isAbove ? '#fca5a5'
            : isBelow ? '#86efac'
            : entry.rank === 1 ? '#4ade80'
            : entry.rank === col.entries.length ? '#f87171'
            : '#b0b3c2'
          const valueText = formatStat(entry.value, col.stat_id)
          const logoSrc = imageMap.get(entry.team_key) || ''
          const deltaLeft = isAbove
            ? `<span style="position: absolute; right: calc(100% + 6px); top: 50%; transform: translateY(-50%); font-size: 10px; font-weight: 700; color: #fca5a5; background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.5); border-radius: 4px; padding: 1px 4px; white-space: nowrap;">+${formatGap(col.aboveGap, col.stat_id)}</span>`
            : isBelow
            ? `<span style="position: absolute; right: calc(100% + 6px); top: 50%; transform: translateY(-50%); font-size: 10px; font-weight: 700; color: #86efac; background: rgba(34,197,94,0.15); border: 1px solid rgba(34,197,94,0.5); border-radius: 4px; padding: 1px 4px; white-space: nowrap;">−${formatGap(col.belowGap, col.stat_id)}</span>`
            : ''
          return `
            <div style="position: absolute; top: ${top}px; left: 50%; transform: translate(-50%, -50%); opacity: ${opacity};">
              <div style="position: relative; width: ${size}px; height: ${size}px;">
                <img src="${logoSrc}" style="width: ${size}px; height: ${size}px; border-radius: 50%; object-fit: cover; background: #11131a; box-shadow: ${ring}; display: block;" />
                <span style="position: absolute; left: calc(100% + 6px); top: 50%; transform: translateY(-50%); font-size: 11px; font-weight: 700; color: ${valueColor}; white-space: nowrap; font-family: 'SF Mono', Consolas, monospace;">${valueText}</span>
                ${deltaLeft}
              </div>
            </div>
          `
        }).join('')

        return `
          <div style="flex: 1; min-width: 100px; display: flex; flex-direction: column; align-items: stretch;">
            <div style="text-align: center; padding-bottom: 6px; margin-bottom: 6px; border-bottom: 1px solid rgba(38,42,58,0.5);">
              <div style="font-size: 13px; font-weight: 700; color: #f7f7ff;">${col.display_name}</div>
              <div style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #7b7f92; margin-top: 2px;">${col.isLowerBetter ? '↓ Lower' : '↑ Higher'}</div>
            </div>
            <div style="text-align: center; font-size: 11px; font-weight: 700; color: #4ade80; margin-bottom: 4px;">${formatStat(col.leaderVal, col.stat_id)}</div>
            <div style="position: relative; height: ${AXIS_HEIGHT}px; border-radius: 12px; background: rgba(5,6,10,0.55); overflow: visible;">
              <div style="position: absolute; top: ${PAD}px; bottom: ${PAD}px; left: 50%; transform: translateX(-50%); border-left: 2px dashed rgba(123,127,146,0.3);"></div>
              <div style="position: absolute; left: 12px; right: 12px; top: ${PAD - 1}px; height: 1px; background: rgba(34,197,94,0.4);"></div>
              <div style="position: absolute; left: 12px; right: 12px; bottom: ${PAD - 1}px; height: 1px; background: rgba(239,68,68,0.4);"></div>
              ${markers}
            </div>
            <div style="text-align: center; font-size: 11px; font-weight: 700; color: #f87171; margin-top: 6px;">${formatStat(col.lastVal, col.stat_id)}</div>
          </div>
        `
      }).join('')

      const selectedName = viewedTeam.value?.name || 'N/A'
      const inner = `<div style="display: flex; gap: 12px; justify-content: stretch;">${colsHtml}</div>`

      container.innerHTML = brandFrame('Distance from Competition', `Viewing: ${selectedName}`, inner)
    }

    document.body.appendChild(container)
    await nextTick()
    await new Promise(r => setTimeout(r, 200))

    const canvas = await html2canvas(container, {
      backgroundColor: '#0a0c14',
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true,
      width: SHARE_WIDTH
    })
    document.body.removeChild(container)

    const blobPromise = new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png')
    })
    const filename = section === 'standings' ? 'roto-standings.png' : 'roto-distance.png'
    if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blobPromise })])
        shareState.value[section] = 'success'
        setTimeout(() => { shareState.value[section] = 'idle' }, 3000)
        return
      } catch {
        // fall through to download
      }
    }
    const blob = await blobPromise
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = filename
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
    shareState.value[section] = 'success'
    setTimeout(() => { shareState.value[section] = 'idle' }, 3000)
  } catch (e) {
    console.error('[RotoRace] share failed:', e)
    shareState.value[section] = 'error'
    setTimeout(() => { shareState.value[section] = 'idle' }, 4000)
  }
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
