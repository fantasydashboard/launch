<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-bold text-dark-text mb-2">League History</h1>
      <p class="text-base text-dark-textMuted">
        Career statistics, championship records, and historical league data
      </p>
    </div>

    <!-- Offseason Notice Banner -->
    <div class="bg-slate-500/10 border border-slate-500/30 rounded-xl p-4 flex items-start gap-3">
      <div class="text-slate-400 text-xl flex-shrink-0">⚾</div>
      <div>
        <p class="text-slate-200 font-semibold">You're viewing the 2025 season</p>
        <p class="text-slate-400 text-sm mt-1">The 2026 season will automatically appear here when it begins.</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
        <div class="text-lg font-semibold text-dark-text mb-2">Loading League History</div>
        <div class="text-dark-textMuted text-sm">{{ loadingMessage }}</div>
        <div class="text-xs text-dark-textMuted/70 mt-2">This may take a minute for leagues with many seasons</div>
      </div>
    </div>

    <template v-else>
      <!-- Career Records (4 Cards) - Click opens modal -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">👑</span>
            <h2 class="card-title">Career Records</h2>
          </div>
          <p class="card-subtitle mt-2">All-time league leaders • Click for details</p>
        </div>
        <div class="card-body">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div v-for="record in careerRecords" :key="record.label" 
                 class="relative overflow-hidden cursor-pointer"
                 @click="openRecordModal(record.label)">
              <div class="p-6 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 rounded-xl border-2 border-yellow-500/20 hover:border-yellow-500/40 transition-all">
                <div class="flex items-start justify-between mb-4">
                  <div class="text-4xl">{{ record.icon }}</div>
                  <div class="text-right">
                    <div class="text-4xl font-black text-yellow-400 mb-1">{{ record.value }}</div>
                  </div>
                </div>
                <div class="space-y-1">
                  <div class="text-xs text-dark-textMuted uppercase tracking-wider font-bold">{{ record.label }}</div>
                  <div class="font-bold text-lg text-dark-text">{{ record.team }}</div>
                  <div class="text-xs text-dark-textMuted">{{ record.detail }}</div>
                </div>
                <div class="text-xs text-yellow-400 mt-2 opacity-70">Click for details →</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Career Statistics Table -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center justify-between flex-wrap gap-4">
            <div class="flex items-center gap-2">
              <span class="text-2xl">📊</span>
              <h2 class="card-title">Career Statistics</h2>
            </div>
            <div class="flex items-center gap-4">
              <div class="text-sm text-dark-textMuted">
                All-time regular season records
              </div>
              <!-- Toggle for current members only -->
              <label class="flex items-center gap-2 cursor-pointer">
                <span class="text-sm text-dark-textMuted">Current members only</span>
                <div class="relative">
                  <input type="checkbox" v-model="showCurrentMembersOnly" class="sr-only">
                  <div :class="[
                    'w-10 h-5 rounded-full transition-colors',
                    showCurrentMembersOnly ? 'bg-yellow-500' : 'bg-dark-border'
                  ]"></div>
                  <div :class="[
                    'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform',
                    showCurrentMembersOnly ? 'translate-x-5' : 'translate-x-0'
                  ]"></div>
                </div>
              </label>
              <button 
                @click="downloadCareerStats"
                :disabled="isDownloading"
                class="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 text-sm"
                style="background: #dc2626; color: #ffffff;"
                @mouseover="$event.currentTarget.style.background = '#eab308'; $event.currentTarget.style.color = '#0a0c14'"
                @mouseout="$event.currentTarget.style.background = '#dc2626'; $event.currentTarget.style.color = '#ffffff'"
              >
                <svg v-if="!isDownloading" class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <svg v-else class="w-4 h-4 animate-spin pointer-events-none" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ isDownloading ? 'Generating...' : 'Share' }}
              </button>
            </div>
          </div>
        </div>
        <div class="card-body overflow-x-auto">
          <table ref="careerTableRef" class="w-full text-sm">
            <thead>
              <tr class="border-b border-dark-border">
                <th class="text-left py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider">Team</th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider cursor-pointer hover:bg-dark-border/30 transition-colors" @click="sortBy('seasons')">
                  <div class="flex items-center justify-center gap-1">
                    Seasons
                    <span class="inline-flex flex-col" style="font-size: 10px; line-height: 8px;">
                      <span :class="sortColumn === 'seasons' && sortDirection === 'asc' ? 'text-red-400' : 'text-dark-textMuted'">▲</span>
                      <span :class="sortColumn === 'seasons' && sortDirection === 'desc' ? 'text-red-400' : 'text-dark-textMuted'">▼</span>
                    </span>
                  </div>
                </th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider cursor-pointer hover:bg-dark-border/30 transition-colors" @click="sortBy('championships')">
                  <div class="flex items-center justify-center gap-1">
                    🏆
                    <span class="inline-flex flex-col" style="font-size: 10px; line-height: 8px;">
                      <span :class="sortColumn === 'championships' && sortDirection === 'asc' ? 'text-red-400' : 'text-dark-textMuted'">▲</span>
                      <span :class="sortColumn === 'championships' && sortDirection === 'desc' ? 'text-red-400' : 'text-dark-textMuted'">▼</span>
                    </span>
                  </div>
                </th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider cursor-pointer hover:bg-dark-border/30 transition-colors" @click="sortBy('matchup_wins')">
                  <div class="flex items-center justify-center gap-1">
                    Record
                    <span class="inline-flex flex-col" style="font-size: 10px; line-height: 8px;">
                      <span :class="sortColumn === 'matchup_wins' && sortDirection === 'asc' ? 'text-red-400' : 'text-dark-textMuted'">▲</span>
                      <span :class="sortColumn === 'matchup_wins' && sortDirection === 'desc' ? 'text-red-400' : 'text-dark-textMuted'">▼</span>
                    </span>
                  </div>
                </th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider cursor-pointer hover:bg-dark-border/30 transition-colors" @click="sortBy('matchup_win_pct')">
                  <div class="flex items-center justify-center gap-1">
                    Win %
                    <span class="inline-flex flex-col" style="font-size: 10px; line-height: 8px;">
                      <span :class="sortColumn === 'matchup_win_pct' && sortDirection === 'asc' ? 'text-red-400' : 'text-dark-textMuted'">▲</span>
                      <span :class="sortColumn === 'matchup_win_pct' && sortDirection === 'desc' ? 'text-red-400' : 'text-dark-textMuted'">▼</span>
                    </span>
                  </div>
                </th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider cursor-pointer hover:bg-dark-border/30 transition-colors" @click="sortBy('hitting_cat_wins')">
                  <div class="flex items-center justify-center gap-1">
                    Hitting Cat W
                    <span class="inline-flex flex-col" style="font-size: 10px; line-height: 8px;">
                      <span :class="sortColumn === 'hitting_cat_wins' && sortDirection === 'asc' ? 'text-red-400' : 'text-dark-textMuted'">▲</span>
                      <span :class="sortColumn === 'hitting_cat_wins' && sortDirection === 'desc' ? 'text-red-400' : 'text-dark-textMuted'">▼</span>
                    </span>
                  </div>
                </th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider cursor-pointer hover:bg-dark-border/30 transition-colors" @click="sortBy('pitching_cat_wins')">
                  <div class="flex items-center justify-center gap-1">
                    Pitching Cat W
                    <span class="inline-flex flex-col" style="font-size: 10px; line-height: 8px;">
                      <span :class="sortColumn === 'pitching_cat_wins' && sortDirection === 'asc' ? 'text-red-400' : 'text-dark-textMuted'">▲</span>
                      <span :class="sortColumn === 'pitching_cat_wins' && sortDirection === 'desc' ? 'text-red-400' : 'text-dark-textMuted'">▼</span>
                    </span>
                  </div>
                </th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider cursor-pointer hover:bg-dark-border/30 transition-colors" @click="sortBy('cat_diff')">
                  <div class="flex items-center justify-center gap-1">
                    Cat +/-
                    <span class="inline-flex flex-col" style="font-size: 10px; line-height: 8px;">
                      <span :class="sortColumn === 'cat_diff' && sortDirection === 'asc' ? 'text-red-400' : 'text-dark-textMuted'">▲</span>
                      <span :class="sortColumn === 'cat_diff' && sortDirection === 'desc' ? 'text-red-400' : 'text-dark-textMuted'">▼</span>
                    </span>
                  </div>
                </th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider">Best Cat</th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider">Worst Cat</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(stat, idx) in filteredCareerStats" :key="stat.team_key" 
                  class="border-b border-dark-border hover:bg-dark-border/30 transition-colors">
                <td class="py-3 px-4">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                      <img
                        :src="stat.logo_url || defaultAvatar"
                        :alt="stat.team_name"
                        class="w-full h-full object-cover"
                        @error="handleImageError"
                      />
                    </div>
                    <div class="font-semibold text-dark-text">{{ stat.team_name }}</div>
                  </div>
                </td>
                <td class="text-center py-3 px-4 text-dark-text">{{ stat.seasons }}</td>
                <td class="text-center py-3 px-4">
                  <span v-if="stat.championships > 0" class="text-primary font-bold">
                    🏆 {{ stat.championships }}
                  </span>
                  <span v-else class="text-dark-textMuted">—</span>
                </td>
                <td class="text-center py-3 px-4 font-semibold" :class="getRecordClass(stat, 'matchup_wins')">
                  {{ stat.matchup_wins }}-{{ stat.matchup_losses }}-{{ stat.matchup_ties }}
                </td>
                <td class="text-center py-3 px-4">
                  <span :class="getRecordClass(stat, 'matchup_win_pct')">
                    {{ (stat.matchup_win_pct * 100).toFixed(1) }}%
                  </span>
                </td>
                <td class="text-center py-3 px-4" :class="getRecordClass(stat, 'hitting_cat_wins')">
                  {{ stat.hitting_cat_wins }}
                </td>
                <td class="text-center py-3 px-4" :class="getRecordClass(stat, 'pitching_cat_wins')">
                  {{ stat.pitching_cat_wins }}
                </td>
                <td class="text-center py-3 px-4">
                  <span :class="stat.cat_diff >= 0 ? 'text-green-400' : 'text-red-400'" class="font-semibold">
                    {{ stat.cat_diff >= 0 ? '+' : '' }}{{ stat.cat_diff }}
                  </span>
                </td>
                <td class="text-center py-3 px-4">
                  <span class="px-2 py-1 rounded text-xs font-bold bg-green-500/20 text-green-400">
                    {{ stat.best_category || '—' }}
                  </span>
                </td>
                <td class="text-center py-3 px-4">
                  <span class="px-2 py-1 rounded text-xs font-bold bg-red-500/20 text-red-400">
                    {{ stat.worst_category || '—' }}
                  </span>
                </td>
              </tr>
              <tr v-if="filteredCareerStats.length === 0">
                <td colspan="10" class="py-8 text-center text-dark-textMuted">
                  No historical data available
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Season-by-Season Records -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center justify-between flex-wrap gap-4">
            <div class="flex items-center gap-2">
              <span class="text-2xl">📅</span>
              <h2 class="card-title">Season-by-Season Records</h2>
            </div>
            <button 
              @click="downloadSeasonHistory"
              :disabled="isDownloadingSeason"
              class="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 text-sm"
              style="background: #dc2626; color: #ffffff;"
              @mouseover="$event.currentTarget.style.background = '#eab308'; $event.currentTarget.style.color = '#0a0c14'"
              @mouseout="$event.currentTarget.style.background = '#dc2626'; $event.currentTarget.style.color = '#ffffff'"
            >
              <svg v-if="!isDownloadingSeason" class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <svg v-else class="w-4 h-4 animate-spin pointer-events-none" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ isDownloadingSeason ? 'Generating...' : 'Share' }}
            </button>
          </div>
          <p class="card-subtitle mt-2">Historical performance by year</p>
        </div>
        <div class="card-body overflow-x-auto">
          <table ref="seasonTableRef" class="w-full text-sm">
            <thead>
              <tr class="border-b border-dark-border">
                <th class="text-left py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider">Season</th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider">Teams</th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider">Most Dominant</th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider">Most Categories Won</th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider">Fewest Categories Won</th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider">Closest Matchup</th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider">Champion</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="season in seasonRecords" :key="season.year" 
                  class="border-b border-dark-border hover:bg-dark-border/30 transition-colors">
                <td class="py-3 px-4 font-bold text-dark-text text-lg">{{ season.year }}</td>
                <td class="text-center py-3 px-4 text-dark-text">{{ season.teamCount }}</td>
                <td class="text-center py-3 px-4">
                  <div class="flex items-center justify-center gap-2">
                    <div class="w-6 h-6 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                      <img :src="season.mostDominant?.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
                    </div>
                    <span class="font-semibold text-green-400">{{ season.mostDominant?.name || 'N/A' }}</span>
                  </div>
                  <div class="text-xs text-dark-textMuted">{{ season.mostDominant?.record || '' }}</div>
                </td>
                <td class="text-center py-3 px-4">
                  <div class="flex items-center justify-center gap-2">
                    <div class="w-6 h-6 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                      <img :src="season.mostCatWins?.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
                    </div>
                    <span class="font-semibold text-green-400">{{ season.mostCatWins?.name || 'N/A' }}</span>
                  </div>
                  <div class="text-xs text-dark-textMuted">{{ season.mostCatWins?.value || '' }} cat wins</div>
                </td>
                <td class="text-center py-3 px-4">
                  <div class="flex items-center justify-center gap-2">
                    <div class="w-6 h-6 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                      <img :src="season.fewestCatWins?.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
                    </div>
                    <span class="font-semibold text-red-400">{{ season.fewestCatWins?.name || 'N/A' }}</span>
                  </div>
                  <div class="text-xs text-dark-textMuted">{{ season.fewestCatWins?.value || '' }} cat wins</div>
                </td>
                <td class="text-center py-3 px-4">
                  <div class="text-yellow-400 font-semibold">{{ season.closestMatchup?.score || 'N/A' }}</div>
                  <div class="text-xs text-dark-textMuted">{{ season.closestMatchup?.teams || '' }}</div>
                </td>
                <td class="text-center py-3 px-4">
                  <div class="flex items-center justify-center gap-2">
                    <span class="text-lg">🏆</span>
                    <div class="w-6 h-6 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                      <img :src="season.champion?.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
                    </div>
                    <span class="font-semibold text-primary">{{ season.champion?.name || 'TBD' }}</span>
                  </div>
                </td>
              </tr>
              <tr v-if="seasonRecords.length === 0">
                <td colspan="7" class="py-8 text-center text-dark-textMuted">
                  No season data available
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Head-to-Head Matrix -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center justify-between flex-wrap gap-4">
            <div class="flex items-center gap-2">
              <span class="text-2xl">⚔️</span>
              <h2 class="card-title">Head-to-Head Matrix</h2>
            </div>
            <div class="flex items-center gap-4">
              <!-- Toggle for current members only -->
              <label class="flex items-center gap-2 cursor-pointer">
                <span class="text-sm text-dark-textMuted">Current members only</span>
                <div class="relative">
                  <input type="checkbox" v-model="showCurrentMembersOnlyH2H" class="sr-only">
                  <div :class="[
                    'w-10 h-5 rounded-full transition-colors',
                    showCurrentMembersOnlyH2H ? 'bg-yellow-500' : 'bg-dark-border'
                  ]"></div>
                  <div :class="[
                    'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform',
                    showCurrentMembersOnlyH2H ? 'translate-x-5' : 'translate-x-0'
                  ]"></div>
                </div>
              </label>
              <button 
                @click="downloadH2HMatrix"
                :disabled="isDownloadingH2H"
                class="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 text-sm"
                style="background: #dc2626; color: #ffffff;"
                @mouseover="$event.currentTarget.style.background = '#eab308'; $event.currentTarget.style.color = '#0a0c14'"
                @mouseout="$event.currentTarget.style.background = '#dc2626'; $event.currentTarget.style.color = '#ffffff'"
              >
                <svg v-if="!isDownloadingH2H" class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <svg v-else class="w-4 h-4 animate-spin pointer-events-none" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ isDownloadingH2H ? 'Generating...' : 'Share' }}
              </button>
            </div>
          </div>
          <p class="card-subtitle mt-2">All-time records between teams (read horizontally: each row shows that team's record vs opponents)</p>
        </div>
        <div class="card-body overflow-x-auto scrollbar-thin">
          <table ref="h2hTableRef" class="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th class="sticky left-0 bg-dark-elevated z-10 px-3 py-2 text-left border border-dark-border min-w-[120px]">Team</th>
                <th 
                  v-for="team in filteredH2HTeams" 
                  :key="`header-${team.team_key}`"
                  class="px-2 py-2 text-center border border-dark-border font-semibold text-dark-textSecondary uppercase tracking-wider"
                  style="min-width: 90px;"
                >
                  <div class="flex flex-col items-center gap-1">
                    <div class="w-6 h-6 rounded-full overflow-hidden bg-dark-border">
                      <img :src="team.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
                    </div>
                    <div class="truncate text-[10px]" :title="team.team_name">{{ team.team_name.substring(0, 8) }}</div>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="rowTeam in filteredH2HTeams" :key="`row-${rowTeam.team_key}`">
                <td class="sticky left-0 bg-dark-elevated z-10 px-3 py-2 font-semibold text-dark-text border border-dark-border whitespace-nowrap">
                  <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                      <img :src="rowTeam.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
                    </div>
                    <span class="truncate">{{ rowTeam.team_name }}</span>
                  </div>
                </td>
                <td 
                  v-for="colTeam in filteredH2HTeams" 
                  :key="`cell-${rowTeam.team_key}-${colTeam.team_key}`"
                  class="px-2 py-2 text-center border border-dark-border"
                  :class="getH2HCellClass(rowTeam.team_key, colTeam.team_key)"
                >
                  <template v-if="rowTeam.team_key === colTeam.team_key">
                    <span class="text-dark-textMuted">—</span>
                  </template>
                  <template v-else>
                    <div class="font-bold">{{ getH2HRecord(rowTeam.team_key, colTeam.team_key) }}</div>
                    <div class="text-[9px] opacity-75">{{ getH2HCatDiff(rowTeam.team_key, colTeam.team_key) }}</div>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- H2H Legend -->
        <div class="card-footer border-t border-dark-border">
          <div class="flex items-center justify-center gap-6 text-xs">
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 rounded bg-green-500/20 border border-green-500/50"></div>
              <span class="text-dark-textMuted">Winning Record</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 rounded bg-red-500/20 border border-red-500/50"></div>
              <span class="text-dark-textMuted">Losing Record</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 rounded bg-yellow-500/20 border border-yellow-500/50"></div>
              <span class="text-dark-textMuted">Even Record</span>
            </div>
            <div class="text-dark-textMuted">
              <span class="font-semibold">Format:</span> W-L-T (Cat +/-)
            </div>
          </div>
        </div>
      </div>

      <!-- League Awards -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center justify-between flex-wrap gap-4">
            <div class="flex items-center gap-2">
              <span class="text-2xl">🏆</span>
              <h2 class="card-title">League Awards</h2>
            </div>
            <!-- Tabs -->
            <div class="flex items-center gap-2">
              <button @click="awardsTab = 'alltime'"
                      :class="[
                        'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                        awardsTab === 'alltime' 
                          ? 'bg-primary text-white' 
                          : 'bg-dark-elevated text-dark-textMuted hover:text-dark-text'
                      ]">
                All-Time
              </button>
              <button @click="awardsTab = 'yearly'"
                      :class="[
                        'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                        awardsTab === 'yearly' 
                          ? 'bg-primary text-white' 
                          : 'bg-dark-elevated text-dark-textMuted hover:text-dark-text'
                      ]">
                Yearly
              </button>
            </div>
          </div>
          <p class="card-subtitle mt-2">
            {{ awardsTab === 'alltime' ? 'Best and worst single-season performances across all years' : `Category leaders for ${selectedAwardsSeason} season` }} • Click to expand
          </p>
        </div>
        <div class="card-body">
          <!-- All-Time Tab -->
          <template v-if="awardsTab === 'alltime'">
            <!-- Hall of Fame -->
            <div class="mb-8">
              <h3 class="text-xl font-bold text-dark-text mb-4 flex items-center gap-2">
                <span>🏅</span>
                <span>Hall of Fame</span>
              </h3>
              
              <!-- Category Kings - Hitting -->
              <div class="mb-6">
                <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-3">👑 Hitting Category Kings (Best Single Season)</h4>
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div v-for="award in hallOfFameHitting" :key="award.category" 
                       class="cursor-pointer"
                       @click="openAwardModal(award.category, 'best', 'hitting')">
                    <div class="bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-xl p-4 border border-green-500/20 hover:border-green-500/40 transition-all">
                      <div class="text-center mb-2">
                        <span class="px-3 py-1 rounded-full text-xs font-bold bg-green-500/30 text-green-400">{{ award.category }}</span>
                      </div>
                      <div v-if="award.winner" class="text-center">
                        <div class="w-10 h-10 rounded-full overflow-hidden bg-dark-border mx-auto mb-2 ring-2 ring-green-500/50">
                          <img :src="award.winner.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
                        </div>
                        <div class="font-semibold text-dark-text text-sm truncate">{{ award.winner.team_name }}</div>
                        <div class="text-2xl font-black text-green-400">{{ award.winner.value }}</div>
                        <div class="text-xs text-dark-textMuted">wins in {{ award.winner.season }}</div>
                        <div class="text-xs text-green-400/70 mt-1">Click for details →</div>
                      </div>
                      <div v-else class="text-center text-sm text-dark-textMuted italic py-4">No data</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Category Kings - Pitching -->
              <div class="mb-6">
                <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-3">👑 Pitching Category Kings (Best Single Season)</h4>
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div v-for="award in hallOfFamePitching" :key="award.category"
                       class="cursor-pointer"
                       @click="openAwardModal(award.category, 'best', 'pitching')">
                    <div class="bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-xl p-4 border border-purple-500/20 hover:border-purple-500/40 transition-all">
                      <div class="text-center mb-2">
                        <span class="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/30 text-purple-400">{{ award.category }}</span>
                      </div>
                      <div v-if="award.winner" class="text-center">
                        <div class="w-10 h-10 rounded-full overflow-hidden bg-dark-border mx-auto mb-2 ring-2 ring-purple-500/50">
                          <img :src="award.winner.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
                        </div>
                        <div class="font-semibold text-dark-text text-sm truncate">{{ award.winner.team_name }}</div>
                        <div class="text-2xl font-black text-purple-400">{{ award.winner.value }}</div>
                        <div class="text-xs text-dark-textMuted">wins in {{ award.winner.season }}</div>
                        <div class="text-xs text-purple-400/70 mt-1">Click for details →</div>
                      </div>
                      <div v-else class="text-center text-sm text-dark-textMuted italic py-4">No data</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Hall of Shame -->
            <div>
              <h3 class="text-xl font-bold text-dark-text mb-4 flex items-center gap-2">
                <span>💩</span>
                <span>Hall of Shame</span>
              </h3>
              
              <!-- Category Struggles - Hitting -->
              <div class="mb-6">
                <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-3">💀 Hitting Category Struggles (Worst Single Season)</h4>
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div v-for="award in hallOfShameHitting" :key="award.category"
                       class="cursor-pointer"
                       @click="openAwardModal(award.category, 'worst', 'hitting')">
                    <div class="bg-gradient-to-br from-gray-500/10 to-gray-600/5 rounded-xl p-4 border border-gray-500/20 hover:border-red-500/40 transition-all">
                      <div class="text-center mb-2">
                        <span class="px-3 py-1 rounded-full text-xs font-bold bg-gray-500/30 text-gray-400">{{ award.category }}</span>
                      </div>
                      <div v-if="award.winner" class="text-center">
                        <div class="w-10 h-10 rounded-full overflow-hidden bg-dark-border mx-auto mb-2 ring-2 ring-gray-500/50">
                          <img :src="award.winner.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
                        </div>
                        <div class="font-semibold text-dark-text text-sm truncate">{{ award.winner.team_name }}</div>
                        <div class="text-2xl font-black text-gray-400">{{ award.winner.value }}</div>
                        <div class="text-xs text-dark-textMuted">wins in {{ award.winner.season }}</div>
                        <div class="text-xs text-red-400/70 mt-1">Click for details →</div>
                      </div>
                      <div v-else class="text-center text-sm text-dark-textMuted italic py-4">No data</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Category Struggles - Pitching -->
              <div>
                <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-3">💀 Pitching Category Struggles (Worst Single Season)</h4>
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div v-for="award in hallOfShamePitching" :key="award.category"
                       class="cursor-pointer"
                       @click="openAwardModal(award.category, 'worst', 'pitching')">
                    <div class="bg-gradient-to-br from-gray-500/10 to-gray-600/5 rounded-xl p-4 border border-gray-500/20 hover:border-red-500/40 transition-all">
                      <div class="text-center mb-2">
                        <span class="px-3 py-1 rounded-full text-xs font-bold bg-gray-500/30 text-gray-400">{{ award.category }}</span>
                      </div>
                      <div v-if="award.winner" class="text-center">
                        <div class="w-10 h-10 rounded-full overflow-hidden bg-dark-border mx-auto mb-2 ring-2 ring-gray-500/50">
                          <img :src="award.winner.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
                        </div>
                        <div class="font-semibold text-dark-text text-sm truncate">{{ award.winner.team_name }}</div>
                        <div class="text-2xl font-black text-gray-400">{{ award.winner.value }}</div>
                        <div class="text-xs text-dark-textMuted">wins in {{ award.winner.season }}</div>
                        <div class="text-xs text-red-400/70 mt-1">Click for details →</div>
                      </div>
                      <div v-else class="text-center text-sm text-dark-textMuted italic py-4">No data</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- Yearly Tab -->
          <template v-else>
            <!-- Season Dropdown -->
            <div class="flex items-center gap-2 mb-6">
              <label class="text-sm text-dark-textMuted">Select Season:</label>
              <select v-model="selectedAwardsSeason" 
                      class="bg-dark-elevated border border-dark-border rounded-lg px-3 py-2 text-dark-text focus:outline-none focus:ring-2 focus:ring-primary">
                <option v-for="year in availableSeasons" :key="year" :value="year">{{ year }}</option>
              </select>
            </div>

            <!-- Season Hall of Fame -->
            <div class="mb-8">
              <h3 class="text-xl font-bold text-dark-text mb-4 flex items-center gap-2">
                <span>🏅</span>
                <span>{{ selectedAwardsSeason }} Hall of Fame</span>
              </h3>
              
              <!-- Hitting Category Leaders -->
              <div class="mb-6">
                <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-3">👑 Hitting Category Leaders</h4>
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div v-for="award in seasonHallOfFameHitting" :key="award.category" 
                       class="cursor-pointer"
                       @click="toggleSeasonAwardCard(`season-fame-hitting-${award.category}`)">
                    <div class="bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-xl p-4 border border-green-500/20 hover:border-green-500/40 transition-all"
                         :class="expandedSeasonAwardCard === `season-fame-hitting-${award.category}` ? 'ring-2 ring-green-500' : ''">
                      <div class="text-center mb-2">
                        <span class="px-3 py-1 rounded-full text-xs font-bold bg-green-500/30 text-green-400">{{ award.category }}</span>
                      </div>
                      <div v-if="award.winner" class="text-center">
                        <div class="w-10 h-10 rounded-full overflow-hidden bg-dark-border mx-auto mb-2 ring-2 ring-green-500/50">
                          <img :src="award.winner.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
                        </div>
                        <div class="font-semibold text-dark-text text-sm truncate">{{ award.winner.team_name }}</div>
                        <div class="text-2xl font-black text-green-400">{{ award.winner.value }}</div>
                        <div class="text-xs text-dark-textMuted">category wins</div>
                        <div class="text-xs text-green-400/70 mt-1">Click for rankings →</div>
                      </div>
                      <div v-else class="text-center text-sm text-dark-textMuted italic py-4">No data</div>
                    </div>
                  </div>
                </div>
                
                <!-- Expanded Rankings Panel -->
                <transition name="expand">
                  <div v-if="expandedSeasonAwardCard?.startsWith('season-fame-hitting-')" 
                       class="mt-4 bg-dark-elevated rounded-xl border border-green-500/30 p-6">
                    <div class="flex items-center justify-between mb-4">
                      <div class="text-lg font-bold text-green-400">{{ expandedSeasonAwardCard?.replace('season-fame-hitting-', '') }} - {{ selectedAwardsSeason }} Rankings</div>
                      <button @click="expandedSeasonAwardCard = null" class="text-dark-textMuted hover:text-dark-text">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div class="space-y-3">
                      <div v-for="(team, idx) in getSeasonCategoryRankings(expandedSeasonAwardCard?.replace('season-fame-hitting-', '') || '', 'best')" 
                           :key="`${team.team_name}`"
                           class="relative">
                        <div class="flex items-center gap-4">
                          <div class="w-8 text-center font-bold text-lg" :class="idx === 0 ? 'text-green-400' : 'text-dark-textMuted'">
                            {{ idx + 1 }}
                          </div>
                          <div class="w-10 h-10 rounded-full overflow-hidden bg-dark-border flex-shrink-0 ring-2" 
                               :class="idx === 0 ? 'ring-green-500' : 'ring-dark-border'">
                            <img :src="team.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
                          </div>
                          <div class="w-40 flex-shrink-0">
                            <div class="font-semibold text-dark-text">{{ team.team_name }}</div>
                          </div>
                          <div class="flex-1 relative h-8 bg-dark-border/30 rounded-lg overflow-hidden">
                            <div class="absolute inset-y-0 left-0 rounded-lg transition-all duration-500"
                                 :class="idx === 0 ? 'bg-gradient-to-r from-green-600 to-green-400' : 'bg-green-500/50'"
                                 :style="{ width: getBarWidth(team.value, getSeasonCategoryRankings(expandedSeasonAwardCard?.replace('season-fame-hitting-', '') || '', 'best')) }">
                            </div>
                            <div class="absolute inset-0 flex items-center justify-end pr-3">
                              <span class="font-bold text-sm" :class="idx === 0 ? 'text-white' : 'text-dark-text'">{{ team.value }} wins</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </transition>
              </div>
              
              <!-- Pitching Category Leaders -->
              <div class="mb-6">
                <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-3">👑 Pitching Category Leaders</h4>
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div v-for="award in seasonHallOfFamePitching" :key="award.category"
                       class="cursor-pointer"
                       @click="toggleSeasonAwardCard(`season-fame-pitching-${award.category}`)">
                    <div class="bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-xl p-4 border border-purple-500/20 hover:border-purple-500/40 transition-all"
                         :class="expandedSeasonAwardCard === `season-fame-pitching-${award.category}` ? 'ring-2 ring-purple-500' : ''">
                      <div class="text-center mb-2">
                        <span class="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/30 text-purple-400">{{ award.category }}</span>
                      </div>
                      <div v-if="award.winner" class="text-center">
                        <div class="w-10 h-10 rounded-full overflow-hidden bg-dark-border mx-auto mb-2 ring-2 ring-purple-500/50">
                          <img :src="award.winner.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
                        </div>
                        <div class="font-semibold text-dark-text text-sm truncate">{{ award.winner.team_name }}</div>
                        <div class="text-2xl font-black text-purple-400">{{ award.winner.value }}</div>
                        <div class="text-xs text-dark-textMuted">category wins</div>
                        <div class="text-xs text-purple-400/70 mt-1">Click for rankings →</div>
                      </div>
                      <div v-else class="text-center text-sm text-dark-textMuted italic py-4">No data</div>
                    </div>
                  </div>
                </div>
                
                <!-- Expanded Rankings Panel -->
                <transition name="expand">
                  <div v-if="expandedSeasonAwardCard?.startsWith('season-fame-pitching-')" 
                       class="mt-4 bg-dark-elevated rounded-xl border border-purple-500/30 p-6">
                    <div class="flex items-center justify-between mb-4">
                      <div class="text-lg font-bold text-purple-400">{{ expandedSeasonAwardCard?.replace('season-fame-pitching-', '') }} - {{ selectedAwardsSeason }} Rankings</div>
                      <button @click="expandedSeasonAwardCard = null" class="text-dark-textMuted hover:text-dark-text">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div class="space-y-3">
                      <div v-for="(team, idx) in getSeasonCategoryRankings(expandedSeasonAwardCard?.replace('season-fame-pitching-', '') || '', 'best')" 
                           :key="`${team.team_name}`"
                           class="relative">
                        <div class="flex items-center gap-4">
                          <div class="w-8 text-center font-bold text-lg" :class="idx === 0 ? 'text-purple-400' : 'text-dark-textMuted'">
                            {{ idx + 1 }}
                          </div>
                          <div class="w-10 h-10 rounded-full overflow-hidden bg-dark-border flex-shrink-0 ring-2" 
                               :class="idx === 0 ? 'ring-purple-500' : 'ring-dark-border'">
                            <img :src="team.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
                          </div>
                          <div class="w-40 flex-shrink-0">
                            <div class="font-semibold text-dark-text">{{ team.team_name }}</div>
                          </div>
                          <div class="flex-1 relative h-8 bg-dark-border/30 rounded-lg overflow-hidden">
                            <div class="absolute inset-y-0 left-0 rounded-lg transition-all duration-500"
                                 :class="idx === 0 ? 'bg-gradient-to-r from-purple-600 to-purple-400' : 'bg-purple-500/50'"
                                 :style="{ width: getBarWidth(team.value, getSeasonCategoryRankings(expandedSeasonAwardCard?.replace('season-fame-pitching-', '') || '', 'best')) }">
                            </div>
                            <div class="absolute inset-0 flex items-center justify-end pr-3">
                              <span class="font-bold text-sm" :class="idx === 0 ? 'text-white' : 'text-dark-text'">{{ team.value }} wins</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </transition>
              </div>
            </div>

            <!-- Season Hall of Shame -->
            <div>
              <h3 class="text-xl font-bold text-dark-text mb-4 flex items-center gap-2">
                <span>💩</span>
                <span>{{ selectedAwardsSeason }} Hall of Shame</span>
              </h3>
              
              <!-- Hitting Category Struggles -->
              <div class="mb-6">
                <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-3">💀 Hitting Category Struggles</h4>
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div v-for="award in seasonHallOfShameHitting" :key="award.category"
                       class="cursor-pointer"
                       @click="toggleSeasonAwardCard(`season-shame-hitting-${award.category}`)">
                    <div class="bg-gradient-to-br from-gray-500/10 to-gray-600/5 rounded-xl p-4 border border-gray-500/20 hover:border-gray-500/40 transition-all"
                         :class="expandedSeasonAwardCard === `season-shame-hitting-${award.category}` ? 'ring-2 ring-red-500' : ''">
                      <div class="text-center mb-2">
                        <span class="px-3 py-1 rounded-full text-xs font-bold bg-gray-500/30 text-gray-400">{{ award.category }}</span>
                      </div>
                      <div v-if="award.winner" class="text-center">
                        <div class="w-10 h-10 rounded-full overflow-hidden bg-dark-border mx-auto mb-2 ring-2 ring-gray-500/50">
                          <img :src="award.winner.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
                        </div>
                        <div class="font-semibold text-dark-text text-sm truncate">{{ award.winner.team_name }}</div>
                        <div class="text-2xl font-black text-gray-400">{{ award.winner.value }}</div>
                        <div class="text-xs text-dark-textMuted">category wins</div>
                        <div class="text-xs text-gray-400/70 mt-1">Click for rankings →</div>
                      </div>
                      <div v-else class="text-center text-sm text-dark-textMuted italic py-4">No data</div>
                    </div>
                  </div>
                </div>
                
                <!-- Expanded Rankings Panel -->
                <transition name="expand">
                  <div v-if="expandedSeasonAwardCard?.startsWith('season-shame-hitting-')" 
                       class="mt-4 bg-dark-elevated rounded-xl border border-red-500/30 p-6">
                    <div class="flex items-center justify-between mb-4">
                      <div class="text-lg font-bold text-red-400">{{ expandedSeasonAwardCard?.replace('season-shame-hitting-', '') }} - {{ selectedAwardsSeason }} Rankings (Worst)</div>
                      <button @click="expandedSeasonAwardCard = null" class="text-dark-textMuted hover:text-dark-text">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div class="space-y-3">
                      <div v-for="(team, idx) in getSeasonCategoryRankings(expandedSeasonAwardCard?.replace('season-shame-hitting-', '') || '', 'worst')" 
                           :key="`${team.team_name}`"
                           class="relative">
                        <div class="flex items-center gap-4">
                          <div class="w-8 text-center font-bold text-lg" :class="idx === 0 ? 'text-red-400' : 'text-dark-textMuted'">
                            {{ idx + 1 }}
                          </div>
                          <div class="w-10 h-10 rounded-full overflow-hidden bg-dark-border flex-shrink-0 ring-2" 
                               :class="idx === 0 ? 'ring-red-500' : 'ring-dark-border'">
                            <img :src="team.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
                          </div>
                          <div class="w-40 flex-shrink-0">
                            <div class="font-semibold text-dark-text">{{ team.team_name }}</div>
                          </div>
                          <div class="flex-1 relative h-8 bg-dark-border/30 rounded-lg overflow-hidden">
                            <div class="absolute inset-y-0 left-0 rounded-lg transition-all duration-500"
                                 :class="idx === 0 ? 'bg-gradient-to-r from-red-600 to-red-400' : 'bg-red-500/50'"
                                 :style="{ width: getBarWidthWorst(team.value, getSeasonCategoryRankings(expandedSeasonAwardCard?.replace('season-shame-hitting-', '') || '', 'worst')) }">
                            </div>
                            <div class="absolute inset-0 flex items-center justify-end pr-3">
                              <span class="font-bold text-sm" :class="idx === 0 ? 'text-white' : 'text-dark-text'">{{ team.value }} wins</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </transition>
              </div>
              
              <!-- Pitching Category Struggles -->
              <div>
                <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-3">💀 Pitching Category Struggles</h4>
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div v-for="award in seasonHallOfShamePitching" :key="award.category"
                       class="cursor-pointer"
                       @click="toggleSeasonAwardCard(`season-shame-pitching-${award.category}`)">
                    <div class="bg-gradient-to-br from-gray-500/10 to-gray-600/5 rounded-xl p-4 border border-gray-500/20 hover:border-gray-500/40 transition-all"
                         :class="expandedSeasonAwardCard === `season-shame-pitching-${award.category}` ? 'ring-2 ring-red-500' : ''">
                      <div class="text-center mb-2">
                        <span class="px-3 py-1 rounded-full text-xs font-bold bg-gray-500/30 text-gray-400">{{ award.category }}</span>
                      </div>
                      <div v-if="award.winner" class="text-center">
                        <div class="w-10 h-10 rounded-full overflow-hidden bg-dark-border mx-auto mb-2 ring-2 ring-gray-500/50">
                          <img :src="award.winner.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
                        </div>
                        <div class="font-semibold text-dark-text text-sm truncate">{{ award.winner.team_name }}</div>
                        <div class="text-2xl font-black text-gray-400">{{ award.winner.value }}</div>
                        <div class="text-xs text-dark-textMuted">category wins</div>
                        <div class="text-xs text-gray-400/70 mt-1">Click for rankings →</div>
                      </div>
                      <div v-else class="text-center text-sm text-dark-textMuted italic py-4">No data</div>
                    </div>
                  </div>
                </div>
                
                <!-- Expanded Rankings Panel -->
                <transition name="expand">
                  <div v-if="expandedSeasonAwardCard?.startsWith('season-shame-pitching-')" 
                       class="mt-4 bg-dark-elevated rounded-xl border border-red-500/30 p-6">
                    <div class="flex items-center justify-between mb-4">
                      <div class="text-lg font-bold text-red-400">{{ expandedSeasonAwardCard?.replace('season-shame-pitching-', '') }} - {{ selectedAwardsSeason }} Rankings (Worst)</div>
                      <button @click="expandedSeasonAwardCard = null" class="text-dark-textMuted hover:text-dark-text">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div class="space-y-3">
                      <div v-for="(team, idx) in getSeasonCategoryRankings(expandedSeasonAwardCard?.replace('season-shame-pitching-', '') || '', 'worst')" 
                           :key="`${team.team_name}`"
                           class="relative">
                        <div class="flex items-center gap-4">
                          <div class="w-8 text-center font-bold text-lg" :class="idx === 0 ? 'text-red-400' : 'text-dark-textMuted'">
                            {{ idx + 1 }}
                          </div>
                          <div class="w-10 h-10 rounded-full overflow-hidden bg-dark-border flex-shrink-0 ring-2" 
                               :class="idx === 0 ? 'ring-red-500' : 'ring-dark-border'">
                            <img :src="team.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
                          </div>
                          <div class="w-40 flex-shrink-0">
                            <div class="font-semibold text-dark-text">{{ team.team_name }}</div>
                          </div>
                          <div class="flex-1 relative h-8 bg-dark-border/30 rounded-lg overflow-hidden">
                            <div class="absolute inset-y-0 left-0 rounded-lg transition-all duration-500"
                                 :class="idx === 0 ? 'bg-gradient-to-r from-red-600 to-red-400' : 'bg-red-500/50'"
                                 :style="{ width: getBarWidthWorst(team.value, getSeasonCategoryRankings(expandedSeasonAwardCard?.replace('season-shame-pitching-', '') || '', 'worst')) }">
                            </div>
                            <div class="absolute inset-0 flex items-center justify-end pr-3">
                              <span class="font-bold text-sm" :class="idx === 0 ? 'text-white' : 'text-dark-text'">{{ team.value }} wins</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </transition>
              </div>
            </div>
          </template>
        </div>
      </div>

    </template>
  </div>
  
  <!-- Career Record Modal -->
  <Teleport to="body">
    <div 
      v-if="showRecordModal" 
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @click.self="closeRecordModal"
    >
      <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
      <div class="relative bg-dark-elevated rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-dark-border">
        <div class="sticky top-0 z-10 px-6 py-4 border-b border-dark-border bg-dark-elevated flex items-center justify-between">
          <div>
            <h3 class="text-xl font-bold text-dark-text">{{ recordModalLabel }}</h3>
            <p class="text-sm"><span class="text-dark-textMuted">{{ leagueDisplayName }}</span> <span class="text-dark-textMuted">•</span> <span class="text-red-500 font-semibold">All-Time</span></p>
          </div>
          <div class="flex items-center gap-2">
            <button 
              @click="downloadRecordRankings(recordModalLabel)" 
              :disabled="isDownloadingRecord"
              class="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-50"
              style="background: #dc2626; color: #ffffff;"
              @mouseover="$event.currentTarget.style.background = '#eab308'; $event.currentTarget.style.color = '#0a0c14'"
              @mouseout="$event.currentTarget.style.background = '#dc2626'; $event.currentTarget.style.color = '#ffffff'"
            >
              <svg v-if="!isDownloadingRecord" class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <svg v-else class="w-4 h-4 animate-spin pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ isDownloadingRecord ? 'Saving...' : 'Share' }}
            </button>
            <button @click="closeRecordModal" class="p-2 rounded-lg hover:bg-dark-border/50 transition-colors">
              <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div class="p-6 border-b border-dark-border bg-gradient-to-r from-yellow-500/10 to-transparent" v-if="recordModalRankings[0]">
          <div class="flex items-center gap-4">
            <img 
              :src="recordModalRankings[0].logo_url || defaultAvatar" 
              :alt="recordModalRankings[0].team_name"
              class="w-16 h-16 rounded-full ring-4 ring-yellow-500/50 object-cover"
              @error="handleImageError"
            />
            <div class="flex-1">
              <div class="text-xl font-bold text-dark-text">{{ recordModalRankings[0].team_name }}</div>
              <div class="text-sm text-dark-textMuted">{{ recordModalRankings[0].detail }}</div>
            </div>
            <div class="text-right">
              <div class="text-3xl font-black text-yellow-400">{{ recordModalRankings[0].value }}</div>
            </div>
          </div>
        </div>
        
        <div class="p-6">
          <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-4">All-Time Rankings</h4>
          <div class="space-y-3">
            <div 
              v-for="(team, index) in recordModalRankings.slice(0, 10)" 
              :key="team.team_name"
              class="flex items-center gap-3"
            >
              <div class="w-6 text-center">
                <span class="text-sm font-bold" :class="index === 0 ? 'text-yellow-400' : 'text-dark-textMuted'">{{ index + 1 }}</span>
              </div>
              <img :src="team.logo_url || defaultAvatar" :alt="team.team_name" class="w-8 h-8 rounded-full object-cover" @error="handleImageError" />
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-dark-text truncate mb-1">{{ team.team_name }}</div>
                <div class="h-2.5 bg-dark-border rounded-full overflow-hidden">
                  <div 
                    class="h-full rounded-full transition-all duration-500 bg-yellow-500"
                    :style="{ width: getRecordBarWidth(team.value, recordModalLabel) }"
                  ></div>
                </div>
              </div>
              <div class="w-20 text-right">
                <div class="text-sm font-semibold" :class="index === 0 ? 'text-yellow-400' : 'text-dark-text'">
                  {{ team.value }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
  
  <!-- Award Modal -->
  <Teleport to="body">
    <div 
      v-if="showAwardModal" 
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @click.self="closeAwardModal"
    >
      <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
      <div class="relative bg-dark-elevated rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-dark-border">
        <div class="sticky top-0 z-10 px-6 py-4 border-b border-dark-border bg-dark-elevated flex items-center justify-between">
          <div>
            <h3 class="text-xl font-bold text-dark-text">{{ awardModalCategory }} - {{ awardModalType === 'best' ? 'Best' : 'Worst' }}</h3>
            <p class="text-sm"><span class="text-dark-textMuted">{{ leagueDisplayName }}</span> <span class="text-dark-textMuted">•</span> <span class="text-red-500 font-semibold">All-Time {{ awardModalCatType === 'hitting' ? 'Hitting' : 'Pitching' }}</span></p>
          </div>
          <div class="flex items-center gap-2">
            <button 
              @click="downloadAwardRankings(awardModalCategory, awardModalType, awardModalCatType)" 
              :disabled="isDownloadingAward"
              class="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-50"
              style="background: #dc2626; color: #ffffff;"
              @mouseover="$event.currentTarget.style.background = '#eab308'; $event.currentTarget.style.color = '#0a0c14'"
              @mouseout="$event.currentTarget.style.background = '#dc2626'; $event.currentTarget.style.color = '#ffffff'"
            >
              <svg v-if="!isDownloadingAward" class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <svg v-else class="w-4 h-4 animate-spin pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ isDownloadingAward ? 'Saving...' : 'Share' }}
            </button>
            <button @click="closeAwardModal" class="p-2 rounded-lg hover:bg-dark-border/50 transition-colors">
              <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div 
          class="p-6 border-b border-dark-border" 
          :class="awardModalType === 'best' ? (awardModalCatType === 'hitting' ? 'bg-gradient-to-r from-green-500/10 to-transparent' : 'bg-gradient-to-r from-purple-500/10 to-transparent') : 'bg-gradient-to-r from-red-500/10 to-transparent'"
          v-if="awardModalRankings[0]"
        >
          <div class="flex items-center gap-4">
            <img 
              :src="awardModalRankings[0].logo_url || defaultAvatar" 
              :alt="awardModalRankings[0].team_name"
              class="w-16 h-16 rounded-full ring-4 object-cover"
              :class="awardModalType === 'best' ? (awardModalCatType === 'hitting' ? 'ring-green-500/50' : 'ring-purple-500/50') : 'ring-red-500/50'"
              @error="handleImageError"
            />
            <div class="flex-1">
              <div class="text-xl font-bold text-dark-text">{{ awardModalRankings[0].team_name }}</div>
              <div class="text-sm text-dark-textMuted">{{ awardModalRankings[0].season }}</div>
            </div>
            <div class="text-right">
              <div 
                class="text-3xl font-black"
                :class="awardModalType === 'best' ? (awardModalCatType === 'hitting' ? 'text-green-400' : 'text-purple-400') : 'text-red-400'"
              >{{ awardModalRankings[0].value }}</div>
              <div class="text-xs text-dark-textMuted">category wins</div>
            </div>
          </div>
        </div>
        
        <div class="p-6">
          <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-4">{{ awardModalType === 'best' ? 'Best' : 'Worst' }} Single-Season Performances</h4>
          <div class="space-y-3">
            <div 
              v-for="(team, index) in awardModalRankings.slice(0, 10)" 
              :key="`${team.team_name}-${team.season}`"
              class="flex items-center gap-3"
            >
              <div class="w-6 text-center">
                <span 
                  class="text-sm font-bold" 
                  :class="index === 0 ? (awardModalType === 'best' ? (awardModalCatType === 'hitting' ? 'text-green-400' : 'text-purple-400') : 'text-red-400') : 'text-dark-textMuted'"
                >{{ index + 1 }}</span>
              </div>
              <img :src="team.logo_url || defaultAvatar" :alt="team.team_name" class="w-8 h-8 rounded-full object-cover" @error="handleImageError" />
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-sm font-medium text-dark-text truncate">{{ team.team_name }}</span>
                  <span class="text-xs text-dark-textMuted">{{ team.season }}</span>
                </div>
                <div class="h-2.5 bg-dark-border rounded-full overflow-hidden">
                  <div 
                    class="h-full rounded-full transition-all duration-500"
                    :class="awardModalType === 'best' ? (awardModalCatType === 'hitting' ? 'bg-green-500' : 'bg-purple-500') : 'bg-red-500'"
                    :style="{ width: awardModalType === 'worst' ? getBarWidthWorst(team.value, awardModalRankings) : getBarWidth(team.value, awardModalRankings) }"
                  ></div>
                </div>
              </div>
              <div class="w-16 text-right">
                <div 
                  class="text-sm font-semibold" 
                  :class="index === 0 ? (awardModalType === 'best' ? (awardModalCatType === 'hitting' ? 'text-green-400' : 'text-purple-400') : 'text-red-400') : 'text-dark-text'"
                >
                  {{ team.value }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useAuthStore } from '@/stores/auth'
import { yahooService } from '@/services/yahoo'
import html2canvas from 'html2canvas'

const leagueStore = useLeagueStore()
const authStore = useAuthStore()

interface CareerStat {
  team_key: string
  team_name: string
  logo_url: string
  seasons: number
  championships: number
  matchup_wins: number
  matchup_losses: number
  matchup_ties: number
  matchup_win_pct: number
  total_cat_wins: number
  total_cat_losses: number
  hitting_cat_wins: number
  pitching_cat_wins: number
  avg_cat_wins: number
  cat_diff: number
  total_matchups: number
  best_category: string
  worst_category: string
  category_records: Record<string, { wins: number; losses: number }>
}

const isLoading = ref(false)
const loadingMessage = ref('Loading historical data...')
const isDownloading = ref(false)
const isDownloadingSeason = ref(false)
const isDownloadingH2H = ref(false)
const isDownloadingRecord = ref(false)
const isDownloadingAward = ref(false)

// League display name
const leagueDisplayName = computed(() => {
  const activeId = leagueStore.activeLeagueId
  const savedLeague = leagueStore.savedLeagues?.find((l: any) => l.league_id === activeId?.split('.l.')[1])
  return savedLeague?.league_name || leagueStore.yahooLeague?.name || 'Fantasy League'
})

// Modal state for career records
const showRecordModal = ref(false)
const recordModalLabel = ref('')
const recordModalRankings = computed(() => getRecordRankings(recordModalLabel.value))

// Modal state for awards
const showAwardModal = ref(false)
const awardModalCategory = ref('')
const awardModalType = ref<'best' | 'worst'>('best')
const awardModalCatType = ref<'hitting' | 'pitching'>('hitting')
const awardModalRankings = computed(() => getCategoryRankings(awardModalCategory.value, awardModalType.value))
const showCurrentMembersOnly = ref(false)
const showCurrentMembersOnlyH2H = ref(false)
const sortColumn = ref('matchup_wins')
const sortDirection = ref<'asc' | 'desc'>('desc')

const careerTableRef = ref<HTMLElement | null>(null)
const seasonTableRef = ref<HTMLElement | null>(null)
const h2hTableRef = ref<HTMLElement | null>(null)
const historicalData = ref<Record<string, any>>({})
const currentMembers = ref<Set<string>>(new Set())
const allTeams = ref<Record<string, any>>({})
const leagueCategories = ref<string[]>([])
const h2hRecords = ref<Record<string, Record<string, { wins: number; losses: number; ties: number; catWins: number; catLosses: number }>>>({})

// Expandable card state
const expandedRecordCard = ref<string | null>(null)
const expandedAwardCard = ref<string | null>(null)
const expandedSeasonAwardCard = ref<string | null>(null)
const selectedAwardsSeason = ref<string>('')
const awardsTab = ref<'alltime' | 'yearly'>('alltime')

const defaultAvatar = 'https://s.yimg.com/cv/apiv2/default/mlb/mlb_dp_2_72.png'

// Open/close record modal
function openRecordModal(label: string) {
  recordModalLabel.value = label
  showRecordModal.value = true
}

function closeRecordModal() {
  showRecordModal.value = false
}

// Open/close award modal
function openAwardModal(category: string, type: 'best' | 'worst', catType: 'hitting' | 'pitching') {
  awardModalCategory.value = category
  awardModalType.value = type
  awardModalCatType.value = catType
  showAwardModal.value = true
}

function closeAwardModal() {
  showAwardModal.value = false
}

// Toggle card expansion (keep for backward compat)
function toggleRecordCard(label: string) {
  expandedRecordCard.value = expandedRecordCard.value === label ? null : label
}

// Toggle award expansion
function toggleAwardCard(title: string) {
  expandedAwardCard.value = expandedAwardCard.value === title ? null : title
}

// Toggle season award expansion
function toggleSeasonAwardCard(title: string) {
  expandedSeasonAwardCard.value = expandedSeasonAwardCard.value === title ? null : title
}

// Get rankings for a specific category (best or worst seasons)
function getCategoryRankings(category: string, type: 'best' | 'worst'): any[] {
  const results: any[] = []
  
  for (const season of seasonCategoryData.value) {
    const catWins = season.category_wins[category]
    if (catWins !== undefined) {
      results.push({
        team_name: season.team_name,
        logo_url: season.logo_url,
        value: catWins,
        season: season.year
      })
    }
  }
  
  // Sort by value - descending for best, ascending for worst
  if (type === 'best') {
    results.sort((a, b) => b.value - a.value)
  } else {
    results.sort((a, b) => a.value - b.value)
  }
  
  return results.slice(0, 10)
}

// Get all teams ranked for a specific record type
function getRecordRankings(recordType: string): any[] {
  const stats = careerStats.value
  if (stats.length === 0) return []
  
  let sorted: CareerStat[] = []
  
  switch (recordType) {
    case 'Most Championships':
      sorted = [...stats].sort((a, b) => b.championships - a.championships)
      return sorted.map((s, idx) => ({
        rank: idx + 1,
        team_name: s.team_name,
        logo_url: s.logo_url,
        value: s.championships,
        detail: `${s.seasons} season(s)`
      }))
    case 'Total Categories Won':
      sorted = [...stats].sort((a, b) => b.total_cat_wins - a.total_cat_wins)
      return sorted.map((s, idx) => ({
        rank: idx + 1,
        team_name: s.team_name,
        logo_url: s.logo_url,
        value: s.total_cat_wins,
        detail: `+${s.cat_diff} diff`
      }))
    case 'Hitting Categories Won':
      sorted = [...stats].sort((a, b) => b.hitting_cat_wins - a.hitting_cat_wins)
      return sorted.map((s, idx) => ({
        rank: idx + 1,
        team_name: s.team_name,
        logo_url: s.logo_url,
        value: s.hitting_cat_wins,
        detail: `${s.seasons} season(s)`
      }))
    case 'Pitching Categories Won':
      sorted = [...stats].sort((a, b) => b.pitching_cat_wins - a.pitching_cat_wins)
      return sorted.map((s, idx) => ({
        rank: idx + 1,
        team_name: s.team_name,
        logo_url: s.logo_url,
        value: s.pitching_cat_wins,
        detail: `${s.seasons} season(s)`
      }))
    default:
      return []
  }
}

// Get all rankings for Hall of Fame/Shame awards
function getAwardRankings(awardTitle: string, awardType: 'fame' | 'shame'): any[] {
  const stats = careerStats.value
  const seasonData = seasonCategoryData.value
  
  if (awardType === 'fame') {
    switch (awardTitle) {
      case '🏆 Dynasty Builder':
        return [...stats]
          .sort((a, b) => b.championships - a.championships)
          .slice(0, 10)
          .map((s, idx) => ({
            rank: idx + 1,
            team_name: s.team_name,
            logo_url: s.logo_url,
            value: s.championships,
            detail: `${s.seasons} seasons`,
            season: 'All-Time'
          }))
      case '🎯 Category Machine':
        return [...seasonData]
          .sort((a, b) => b.total_cat_wins - a.total_cat_wins)
          .slice(0, 10)
          .map((s, idx) => ({
            rank: idx + 1,
            team_name: s.team_name,
            logo_url: s.logo_url,
            value: s.total_cat_wins,
            detail: 'cat wins',
            season: s.year
          }))
      case '📊 Mr. Perfect':
        return [...seasonData]
          .filter(s => (s.matchup_wins + s.matchup_losses + s.matchup_ties) >= 10)
          .sort((a, b) => {
            const aRate = a.matchup_wins / (a.matchup_wins + a.matchup_losses + a.matchup_ties)
            const bRate = b.matchup_wins / (b.matchup_wins + b.matchup_losses + b.matchup_ties)
            return bRate - aRate
          })
          .slice(0, 10)
          .map((s, idx) => ({
            rank: idx + 1,
            team_name: s.team_name,
            logo_url: s.logo_url,
            value: `${((s.matchup_wins / (s.matchup_wins + s.matchup_losses + s.matchup_ties)) * 100).toFixed(0)}%`,
            detail: `${s.matchup_wins}-${s.matchup_losses}-${s.matchup_ties}`,
            season: s.year
          }))
      case '💎 Category King':
        return [...stats]
          .sort((a, b) => b.total_cat_wins - a.total_cat_wins)
          .slice(0, 10)
          .map((s, idx) => ({
            rank: idx + 1,
            team_name: s.team_name,
            logo_url: s.logo_url,
            value: s.total_cat_wins,
            detail: `+${s.cat_diff} diff`,
            season: 'All-Time'
          }))
      default:
        return []
    }
  } else {
    // Hall of Shame
    switch (awardTitle) {
      case '💩 Basement Dweller':
        return [...seasonData]
          .filter(s => (s.matchup_wins + s.matchup_losses + s.matchup_ties) >= 10)
          .sort((a, b) => {
            const aRate = a.matchup_wins / (a.matchup_wins + a.matchup_losses + a.matchup_ties)
            const bRate = b.matchup_wins / (b.matchup_wins + b.matchup_losses + b.matchup_ties)
            return aRate - bRate
          })
          .slice(0, 10)
          .map((s, idx) => ({
            rank: idx + 1,
            team_name: s.team_name,
            logo_url: s.logo_url,
            value: `${((s.matchup_wins / (s.matchup_wins + s.matchup_losses + s.matchup_ties)) * 100).toFixed(0)}%`,
            detail: `${s.matchup_wins}-${s.matchup_losses}-${s.matchup_ties}`,
            season: s.year
          }))
      case '📉 Category Crater':
        return [...seasonData]
          .filter(s => s.total_cat_wins > 0)
          .sort((a, b) => a.total_cat_wins - b.total_cat_wins)
          .slice(0, 10)
          .map((s, idx) => ({
            rank: idx + 1,
            team_name: s.team_name,
            logo_url: s.logo_url,
            value: s.total_cat_wins,
            detail: 'cat wins',
            season: s.year
          }))
      case '😢 Mr. Indecisive':
        return [...seasonData]
          .sort((a, b) => b.matchup_ties - a.matchup_ties)
          .slice(0, 10)
          .map((s, idx) => ({
            rank: idx + 1,
            team_name: s.team_name,
            logo_url: s.logo_url,
            value: s.matchup_ties,
            detail: 'ties',
            season: s.year
          }))
      case '🕳️ Category Hole':
        return [...stats]
          .sort((a, b) => a.cat_diff - b.cat_diff)
          .slice(0, 10)
          .map((s, idx) => ({
            rank: idx + 1,
            team_name: s.team_name,
            logo_url: s.logo_url,
            value: s.cat_diff,
            detail: 'cat differential',
            season: 'All-Time'
          }))
      default:
        return []
    }
  }
}

// Career Records - top 4 stats
const careerRecords = computed(() => {
  const stats = careerStats.value
  if (stats.length === 0) return []
  
  const mostChampionships = [...stats].sort((a, b) => b.championships - a.championships)[0]
  const mostCatWins = [...stats].sort((a, b) => b.total_cat_wins - a.total_cat_wins)[0]
  const mostHittingWins = [...stats].sort((a, b) => b.hitting_cat_wins - a.hitting_cat_wins)[0]
  const mostPitchingWins = [...stats].sort((a, b) => b.pitching_cat_wins - a.pitching_cat_wins)[0]
  
  return [
    {
      label: 'Most Championships',
      team: mostChampionships?.team_name || 'N/A',
      value: mostChampionships?.championships || 0,
      icon: '🏆',
      detail: `${mostChampionships?.seasons || 0} season(s) played`
    },
    {
      label: 'Total Categories Won',
      team: mostCatWins?.team_name || 'N/A',
      value: mostCatWins?.total_cat_wins || 0,
      icon: '🎯',
      detail: `+${mostCatWins?.cat_diff || 0} category differential`
    },
    {
      label: 'Hitting Categories Won',
      team: mostHittingWins?.team_name || 'N/A',
      value: mostHittingWins?.hitting_cat_wins || 0,
      icon: '⚾',
      detail: `${mostHittingWins?.seasons || 0} season(s) played`
    },
    {
      label: 'Pitching Categories Won',
      team: mostPitchingWins?.team_name || 'N/A',
      value: mostPitchingWins?.pitching_cat_wins || 0,
      icon: '💪',
      detail: `${mostPitchingWins?.seasons || 0} season(s) played`
    }
  ]
})

// Calculate variance in category performance
function calculateCategoryVariance(stat: CareerStat): number {
  const records = Object.values(stat.category_records || {})
  if (records.length === 0) return Infinity
  
  const winRates = records.map(r => r.wins / (r.wins + r.losses) || 0)
  const avg = winRates.reduce((a, b) => a + b, 0) / winRates.length
  const variance = winRates.reduce((sum, rate) => sum + Math.pow(rate - avg, 2), 0) / winRates.length
  return variance
}

// Computed: Career Stats
const careerStats = computed((): CareerStat[] => {
  const statsMap: Record<string, CareerStat> = {}
  
  console.log('careerStats computing... historicalData has', Object.keys(historicalData.value).length, 'seasons:', Object.keys(historicalData.value))
  
  // Aggregate stats across all seasons
  for (const [season, seasonData] of Object.entries(historicalData.value)) {
    const standings = seasonData.standings || []
    const matchups = seasonData.matchups || []
    console.log(`Processing ${season}: ${standings.length} teams, ${matchups.length} matchups`)
    
    for (const team of standings) {
      const teamKey = team.team_key
      const existing = statsMap[teamKey]
      
      const teamInfo = allTeams.value[teamKey]
      const logoUrl = teamInfo?.logo_url || team.logo_url || ''
      
      // Parse wins/losses/ties from standings (H2H Categories format)
      const wins = team.wins || 0
      const losses = team.losses || 0
      const ties = team.ties || 0
      
      if (existing) {
        existing.seasons++
        existing.matchup_wins += wins
        existing.matchup_losses += losses
        existing.matchup_ties += ties
        existing.total_matchups += wins + losses + ties
        if (team.is_champion) existing.championships++
        if (logoUrl && !existing.logo_url) existing.logo_url = logoUrl
      } else {
        statsMap[teamKey] = {
          team_key: teamKey,
          team_name: team.name || 'Unknown Team',
          logo_url: logoUrl,
          seasons: 1,
          championships: team.is_champion ? 1 : 0,
          matchup_wins: wins,
          matchup_losses: losses,
          matchup_ties: ties,
          matchup_win_pct: 0,
          total_cat_wins: 0,
          total_cat_losses: 0,
          hitting_cat_wins: 0,
          pitching_cat_wins: 0,
          avg_cat_wins: 0,
          cat_diff: 0,
          total_matchups: wins + losses + ties,
          best_category: '',
          worst_category: '',
          category_records: {}
        }
      }
    }
    
    // Process matchups to get category-level data
    for (const matchup of matchups) {
      if (!matchup.teams || matchup.teams.length < 2) continue
      
      // stat_winners is on the matchup level, not team level
      const statWinners = matchup.stat_winners || []
      
      for (const team of matchup.teams) {
        const teamKey = team.team_key
        if (!statsMap[teamKey]) continue
        
        const stat = statsMap[teamKey]
        
        // Category wins/losses from matchup - is_tied is a boolean now
        const catWins = statWinners.filter((w: any) => !w.is_tied && w.winner_team_key === teamKey).length || 0
        const catLosses = statWinners.filter((w: any) => !w.is_tied && w.winner_team_key && w.winner_team_key !== teamKey).length || 0
        
        stat.total_cat_wins += catWins
        stat.total_cat_losses += catLosses
        
        // Track category-specific records and hitting/pitching splits
        for (const catResult of statWinners) {
          const catId = catResult.stat_id
          const catName = getCategoryDisplayName(catId)
          
          if (!stat.category_records[catId]) {
            stat.category_records[catId] = { wins: 0, losses: 0 }
          }
          
          // is_tied is a boolean (false = not tied, true = tied)
          if (!catResult.is_tied) {
            if (catResult.winner_team_key === teamKey) {
              stat.category_records[catId].wins++
              // Track hitting vs pitching
              if (isHittingCategory(catName)) {
                stat.hitting_cat_wins++
              } else {
                stat.pitching_cat_wins++
              }
            } else if (catResult.winner_team_key) {
              stat.category_records[catId].losses++
            }
          }
        }
      }
    }
  }
  
  // Calculate derived stats and find best/worst categories
  const stats = Object.values(statsMap).map(stat => {
    const totalGames = stat.matchup_wins + stat.matchup_losses + stat.matchup_ties
    stat.matchup_win_pct = totalGames > 0 ? (stat.matchup_wins + stat.matchup_ties * 0.5) / totalGames : 0
    stat.cat_diff = stat.total_cat_wins - stat.total_cat_losses
    stat.avg_cat_wins = stat.total_matchups > 0 ? stat.total_cat_wins / stat.total_matchups : 0
    
    // Find best and worst categories
    const catRecords = Object.entries(stat.category_records)
    if (catRecords.length > 0) {
      const sorted = catRecords.sort((a, b) => {
        const aRate = a[1].wins / (a[1].wins + a[1].losses) || 0
        const bRate = b[1].wins / (b[1].wins + b[1].losses) || 0
        return bRate - aRate
      })
      stat.best_category = getCategoryDisplayName(sorted[0][0])
      stat.worst_category = getCategoryDisplayName(sorted[sorted.length - 1][0])
    }
    
    return stat
  })
  
  return sortStats(stats)
})

// Filtered career stats
const filteredCareerStats = computed(() => {
  if (!showCurrentMembersOnly.value) return careerStats.value
  return careerStats.value.filter(stat => currentMembers.value.has(stat.team_key))
})

// Season-by-Season Records
const seasonRecords = computed(() => {
  const records: any[] = []
  
  console.log('seasonRecords computing... historicalData has', Object.keys(historicalData.value).length, 'seasons')
  
  for (const [year, data] of Object.entries(historicalData.value)) {
    const standings = data.standings || []
    const matchups = data.matchups || []
    console.log(`seasonRecords processing ${year}: ${standings.length} teams`)
    
    if (standings.length === 0) continue
    
    // Find champion
    const champion = standings.find((t: any) => t.rank === 1 || t.is_champion)
    
    // Find most dominant (best record)
    const sorted = [...standings].sort((a: any, b: any) => {
      const aWinPct = (a.wins || 0) / ((a.wins || 0) + (a.losses || 0) + (a.ties || 0)) || 0
      const bWinPct = (b.wins || 0) / ((b.wins || 0) + (b.losses || 0) + (b.ties || 0)) || 0
      return bWinPct - aWinPct
    })
    const mostDominant = sorted[0]
    
    // Calculate average category wins per week
    let totalCatWins = 0
    let totalMatchups = 0
    for (const team of standings) {
      totalMatchups += (team.wins || 0) + (team.losses || 0) + (team.ties || 0)
    }
    // Estimate avg cat wins (would be more accurate with matchup data)
    const avgCatWins = totalMatchups > 0 ? 5.0 : 0 // Placeholder - would calculate from matchups
    
    // Find closest and biggest blowout matchups
    let closestMatchup: any = null
    let biggestBlowout: any = null
    let closestDiff = Infinity
    let biggestDiff = 0
    
    for (const matchup of matchups) {
      if (!matchup.teams || matchup.teams.length < 2) continue
      
      const team1 = matchup.teams[0]
      const team2 = matchup.teams[1]
      const statWinners = matchup.stat_winners || []
      
      // Calculate category differential for this matchup - use matchup.stat_winners
      const t1CatWins = statWinners.filter((w: any) => w.winner_team_key === team1.team_key && !w.is_tied).length || 0
      const t2CatWins = statWinners.filter((w: any) => w.winner_team_key === team2.team_key && !w.is_tied).length || 0
      const diff = Math.abs(t1CatWins - t2CatWins)
      
      const team1Name = allTeams.value[team1.team_key]?.name || team1.name || 'Team 1'
      const team2Name = allTeams.value[team2.team_key]?.name || team2.name || 'Team 2'
      
      if (diff < closestDiff && diff <= 2) {
        closestDiff = diff
        closestMatchup = {
          score: `${Math.max(t1CatWins, t2CatWins)}-${Math.min(t1CatWins, t2CatWins)}`,
          teams: `${team1Name} vs ${team2Name}`
        }
      }
      
      if (diff > biggestDiff) {
        biggestDiff = diff
        biggestBlowout = {
          score: `${Math.max(t1CatWins, t2CatWins)}-${Math.min(t1CatWins, t2CatWins)}`,
          teams: `${t1CatWins > t2CatWins ? team1Name : team2Name} def. ${t1CatWins > t2CatWins ? team2Name : team1Name}`
        }
      }
    }
    
    // Calculate category wins per team for the season
    const teamCatWins: Record<string, number> = {}
    for (const matchup of matchups) {
      if (!matchup.teams || matchup.teams.length < 2) continue
      const statWinners = matchup.stat_winners || []
      for (const team of matchup.teams) {
        const teamKey = team.team_key
        if (!teamKey) continue
        const catWins = statWinners.filter((w: any) => w.winner_team_key === teamKey && !w.is_tied).length || 0
        teamCatWins[teamKey] = (teamCatWins[teamKey] || 0) + catWins
      }
    }
    
    // Find most and fewest category wins
    const catWinEntries = Object.entries(teamCatWins).sort((a, b) => b[1] - a[1])
    const mostCatWinsTeam = catWinEntries[0]
    const fewestCatWinsTeam = catWinEntries[catWinEntries.length - 1]
    
    records.push({
      year,
      teamCount: standings.length,
      avgCatWins,
      champion: champion ? {
        name: champion.name,
        logo_url: allTeams.value[champion.team_key]?.logo_url || champion.logo_url
      } : null,
      mostDominant: mostDominant ? {
        name: mostDominant.name,
        logo_url: allTeams.value[mostDominant.team_key]?.logo_url || mostDominant.logo_url,
        record: `${mostDominant.wins || 0}-${mostDominant.losses || 0}-${mostDominant.ties || 0}`
      } : null,
      mostCatWins: mostCatWinsTeam ? {
        name: allTeams.value[mostCatWinsTeam[0]]?.name || standings.find((t: any) => t.team_key === mostCatWinsTeam[0])?.name || 'Unknown',
        logo_url: allTeams.value[mostCatWinsTeam[0]]?.logo_url || '',
        value: mostCatWinsTeam[1]
      } : null,
      fewestCatWins: fewestCatWinsTeam ? {
        name: allTeams.value[fewestCatWinsTeam[0]]?.name || standings.find((t: any) => t.team_key === fewestCatWinsTeam[0])?.name || 'Unknown',
        logo_url: allTeams.value[fewestCatWinsTeam[0]]?.logo_url || '',
        value: fewestCatWinsTeam[1]
      } : null,
      closestMatchup: closestMatchup || { score: 'N/A', teams: '' }
    })
  }
  
  return records.sort((a, b) => parseInt(b.year) - parseInt(a.year))
})

// Build season-level category data for awards
const seasonCategoryData = computed(() => {
  const data: any[] = []
  
  for (const [year, seasonData] of Object.entries(historicalData.value)) {
    const matchups = seasonData.matchups || []
    const standings = seasonData.standings || []
    
    // Track category wins per team for this season
    const teamCatWins: Record<string, Record<string, number>> = {}
    const teamTotalCatWins: Record<string, number> = {}
    
    for (const matchup of matchups) {
      if (!matchup.teams || matchup.teams.length < 2) continue
      const statWinners = matchup.stat_winners || []
      
      for (const team of matchup.teams) {
        const teamKey = team.team_key
        if (!teamKey) continue
        
        if (!teamCatWins[teamKey]) teamCatWins[teamKey] = {}
        if (!teamTotalCatWins[teamKey]) teamTotalCatWins[teamKey] = 0
        
        for (const catResult of statWinners) {
          const catId = catResult.stat_id
          const catName = getCategoryDisplayName(catId)
          
          // Skip unknown/invalid categories
          if (!catName) continue
          
          if (!catResult.is_tied && catResult.winner_team_key === teamKey) {
            if (!teamCatWins[teamKey][catName]) teamCatWins[teamKey][catName] = 0
            teamCatWins[teamKey][catName]++
            teamTotalCatWins[teamKey]++
          }
        }
      }
    }
    
    // Get team info
    for (const [teamKey, catWins] of Object.entries(teamCatWins)) {
      const teamInfo = allTeams.value[teamKey] || standings.find((t: any) => t.team_key === teamKey) || {}
      const teamStanding = standings.find((t: any) => t.team_key === teamKey)
      
      data.push({
        year,
        team_key: teamKey,
        team_name: teamInfo.name || 'Unknown',
        logo_url: teamInfo.logo_url || '',
        category_wins: catWins,
        total_cat_wins: teamTotalCatWins[teamKey] || 0,
        matchup_wins: teamStanding?.wins || 0,
        matchup_losses: teamStanding?.losses || 0,
        matchup_ties: teamStanding?.ties || 0
      })
    }
  }
  
  return data
})

// Get all unique categories from the data
const allCategories = computed(() => {
  const cats = new Set<string>()
  for (const season of seasonCategoryData.value) {
    for (const cat of Object.keys(season.category_wins || {})) {
      // Keys are already display names from seasonCategoryData
      cats.add(cat)
    }
  }
  return Array.from(cats)
})

// Hall of Fame - Overall Dominance
const hallOfFameOverall = computed(() => {
  const stats = careerStats.value
  const seasonData = seasonCategoryData.value
  
  // Most Championships
  const mostChamps = [...stats].sort((a, b) => b.championships - a.championships)[0]
  
  // Most Category Wins in a Single Season
  const bestCatSeason = [...seasonData].sort((a, b) => b.total_cat_wins - a.total_cat_wins)[0]
  
  // Best Single Season Win Rate
  const bestWinRate = [...seasonData]
    .filter(s => (s.matchup_wins + s.matchup_losses + s.matchup_ties) >= 10)
    .sort((a, b) => {
      const aRate = a.matchup_wins / (a.matchup_wins + a.matchup_losses + a.matchup_ties)
      const bRate = b.matchup_wins / (b.matchup_wins + b.matchup_losses + b.matchup_ties)
      return bRate - aRate
    })[0]
  
  // Most Total Category Wins All-Time
  const mostTotalCats = [...stats].sort((a, b) => b.total_cat_wins - a.total_cat_wins)[0]
  
  return [
    {
      title: '🏆 Dynasty Builder',
      winner: mostChamps ? {
        team_name: mostChamps.team_name,
        logo_url: mostChamps.logo_url,
        value: mostChamps.championships,
        detail: 'championships',
        season: 'All-Time'
      } : null
    },
    {
      title: '🎯 Category Machine',
      winner: bestCatSeason ? {
        team_name: bestCatSeason.team_name,
        logo_url: bestCatSeason.logo_url,
        value: bestCatSeason.total_cat_wins,
        detail: 'cat wins',
        season: bestCatSeason.year
      } : null
    },
    {
      title: '📊 Mr. Perfect',
      winner: bestWinRate ? {
        team_name: bestWinRate.team_name,
        logo_url: bestWinRate.logo_url,
        value: `${((bestWinRate.matchup_wins / (bestWinRate.matchup_wins + bestWinRate.matchup_losses + bestWinRate.matchup_ties)) * 100).toFixed(0)}%`,
        detail: `${bestWinRate.matchup_wins}-${bestWinRate.matchup_losses}-${bestWinRate.matchup_ties}`,
        season: bestWinRate.year
      } : null
    },
    {
      title: '💎 Category King',
      winner: mostTotalCats ? {
        team_name: mostTotalCats.team_name,
        logo_url: mostTotalCats.logo_url,
        value: mostTotalCats.total_cat_wins,
        detail: 'all-time cat wins',
        season: 'All-Time'
      } : null
    }
  ]
})

// Hall of Fame - Hitting Categories (Best Single Season)
const hallOfFameHitting = computed(() => {
  const hittingCats = allCategories.value.filter(cat => isHittingCategory(cat))
  
  return hittingCats.map(cat => {
    let bestSeason: any = null
    let bestValue = 0
    
    for (const season of seasonCategoryData.value) {
      const catWins = season.category_wins[cat] || 0
      if (catWins > bestValue) {
        bestValue = catWins
        bestSeason = {
          team_name: season.team_name,
          logo_url: season.logo_url,
          value: catWins,
          season: season.year
        }
      }
    }
    
    return { category: cat, winner: bestSeason }
  })
})

// Hall of Fame - Pitching Categories (Best Single Season)
const hallOfFamePitching = computed(() => {
  const pitchingCats = allCategories.value.filter(cat => !isHittingCategory(cat))
  
  return pitchingCats.map(cat => {
    let bestSeason: any = null
    let bestValue = 0
    
    for (const season of seasonCategoryData.value) {
      const catWins = season.category_wins[cat] || 0
      if (catWins > bestValue) {
        bestValue = catWins
        bestSeason = {
          team_name: season.team_name,
          logo_url: season.logo_url,
          value: catWins,
          season: season.year
        }
      }
    }
    
    return { category: cat, winner: bestSeason }
  })
})

// Hall of Shame - Overall Struggles
const hallOfShameOverall = computed(() => {
  const seasonData = seasonCategoryData.value
  
  // Worst Single Season Record
  const worstRecord = [...seasonData]
    .filter(s => (s.matchup_wins + s.matchup_losses + s.matchup_ties) >= 10)
    .sort((a, b) => {
      const aRate = a.matchup_wins / (a.matchup_wins + a.matchup_losses + a.matchup_ties)
      const bRate = b.matchup_wins / (b.matchup_wins + b.matchup_losses + b.matchup_ties)
      return aRate - bRate
    })[0]
  
  // Fewest Category Wins in a Season
  const fewestCats = [...seasonData]
    .filter(s => s.total_cat_wins > 0)
    .sort((a, b) => a.total_cat_wins - b.total_cat_wins)[0]
  
  // Most Ties in a Season
  const mostTies = [...seasonData].sort((a, b) => b.matchup_ties - a.matchup_ties)[0]
  
  // Worst Category Differential All-Time
  const stats = careerStats.value
  const worstDiff = [...stats].sort((a, b) => a.cat_diff - b.cat_diff)[0]
  
  return [
    {
      title: '💩 Basement Dweller',
      winner: worstRecord ? {
        team_name: worstRecord.team_name,
        logo_url: worstRecord.logo_url,
        value: `${((worstRecord.matchup_wins / (worstRecord.matchup_wins + worstRecord.matchup_losses + worstRecord.matchup_ties)) * 100).toFixed(0)}%`,
        detail: `${worstRecord.matchup_wins}-${worstRecord.matchup_losses}-${worstRecord.matchup_ties}`,
        season: worstRecord.year
      } : null
    },
    {
      title: '📉 Category Crater',
      winner: fewestCats ? {
        team_name: fewestCats.team_name,
        logo_url: fewestCats.logo_url,
        value: fewestCats.total_cat_wins,
        detail: 'cat wins',
        season: fewestCats.year
      } : null
    },
    {
      title: '😢 Mr. Indecisive',
      winner: mostTies && mostTies.matchup_ties > 0 ? {
        team_name: mostTies.team_name,
        logo_url: mostTies.logo_url,
        value: mostTies.matchup_ties,
        detail: 'ties',
        season: mostTies.year
      } : null
    },
    {
      title: '🕳️ Category Hole',
      winner: worstDiff ? {
        team_name: worstDiff.team_name,
        logo_url: worstDiff.logo_url,
        value: worstDiff.cat_diff,
        detail: 'cat differential',
        season: 'All-Time'
      } : null
    }
  ]
})

// Hall of Shame - Hitting Categories (Worst Single Season)
const hallOfShameHitting = computed(() => {
  const hittingCats = allCategories.value.filter(cat => isHittingCategory(cat))
  
  return hittingCats.map(cat => {
    let worstSeason: any = null
    let worstValue = Infinity
    
    for (const season of seasonCategoryData.value) {
      const catWins = season.category_wins[cat]
      if (catWins !== undefined && catWins < worstValue) {
        worstValue = catWins
        worstSeason = {
          team_name: season.team_name,
          logo_url: season.logo_url,
          value: catWins,
          season: season.year
        }
      }
    }
    
    return { category: cat, winner: worstSeason }
  })
})

// Hall of Shame - Pitching Categories (Worst Single Season)
const hallOfShamePitching = computed(() => {
  const pitchingCats = allCategories.value.filter(cat => !isHittingCategory(cat))
  
  return pitchingCats.map(cat => {
    let worstSeason: any = null
    let worstValue = Infinity
    
    for (const season of seasonCategoryData.value) {
      const catWins = season.category_wins[cat]
      if (catWins !== undefined && catWins < worstValue) {
        worstValue = catWins
        worstSeason = {
          team_name: season.team_name,
          logo_url: season.logo_url,
          value: catWins,
          season: season.year
        }
      }
    }
    
    return { category: cat, winner: worstSeason }
  })
})

// Available seasons for dropdown
const availableSeasons = computed(() => {
  const years = Object.keys(historicalData.value).sort((a, b) => parseInt(b) - parseInt(a))
  // Initialize selectedAwardsSeason if not set
  if (!selectedAwardsSeason.value && years.length > 0) {
    selectedAwardsSeason.value = years[0]
  }
  return years
})

// Get season data for selected season
const selectedSeasonData = computed(() => {
  return seasonCategoryData.value.filter(s => s.year === selectedAwardsSeason.value)
})

// Get categories available in selected season
const selectedSeasonCategories = computed(() => {
  const cats = new Set<string>()
  for (const team of selectedSeasonData.value) {
    for (const cat of Object.keys(team.category_wins || {})) {
      cats.add(cat)
    }
  }
  return Array.from(cats)
})

// Season Hall of Fame - Hitting
const seasonHallOfFameHitting = computed(() => {
  const hittingCats = selectedSeasonCategories.value.filter(cat => isHittingCategory(cat))
  
  return hittingCats.map(cat => {
    let bestTeam: any = null
    let bestValue = 0
    
    for (const team of selectedSeasonData.value) {
      const catWins = team.category_wins[cat] || 0
      if (catWins > bestValue) {
        bestValue = catWins
        bestTeam = {
          team_name: team.team_name,
          logo_url: team.logo_url,
          value: catWins
        }
      }
    }
    
    return { category: cat, winner: bestTeam }
  })
})

// Season Hall of Fame - Pitching
const seasonHallOfFamePitching = computed(() => {
  const pitchingCats = selectedSeasonCategories.value.filter(cat => !isHittingCategory(cat))
  
  return pitchingCats.map(cat => {
    let bestTeam: any = null
    let bestValue = 0
    
    for (const team of selectedSeasonData.value) {
      const catWins = team.category_wins[cat] || 0
      if (catWins > bestValue) {
        bestValue = catWins
        bestTeam = {
          team_name: team.team_name,
          logo_url: team.logo_url,
          value: catWins
        }
      }
    }
    
    return { category: cat, winner: bestTeam }
  })
})

// Season Hall of Shame - Hitting
const seasonHallOfShameHitting = computed(() => {
  const hittingCats = selectedSeasonCategories.value.filter(cat => isHittingCategory(cat))
  
  return hittingCats.map(cat => {
    let worstTeam: any = null
    let worstValue = Infinity
    
    for (const team of selectedSeasonData.value) {
      const catWins = team.category_wins[cat]
      if (catWins !== undefined && catWins < worstValue) {
        worstValue = catWins
        worstTeam = {
          team_name: team.team_name,
          logo_url: team.logo_url,
          value: catWins
        }
      }
    }
    
    return { category: cat, winner: worstTeam }
  })
})

// Season Hall of Shame - Pitching
const seasonHallOfShamePitching = computed(() => {
  const pitchingCats = selectedSeasonCategories.value.filter(cat => !isHittingCategory(cat))
  
  return pitchingCats.map(cat => {
    let worstTeam: any = null
    let worstValue = Infinity
    
    for (const team of selectedSeasonData.value) {
      const catWins = team.category_wins[cat]
      if (catWins !== undefined && catWins < worstValue) {
        worstValue = catWins
        worstTeam = {
          team_name: team.team_name,
          logo_url: team.logo_url,
          value: catWins
        }
      }
    }
    
    return { category: cat, winner: worstTeam }
  })
})

// Get season category rankings for a specific category
function getSeasonCategoryRankings(category: string, type: 'best' | 'worst'): any[] {
  const results: any[] = []
  
  for (const team of selectedSeasonData.value) {
    const catWins = team.category_wins[category]
    if (catWins !== undefined) {
      results.push({
        team_name: team.team_name,
        logo_url: team.logo_url,
        value: catWins
      })
    }
  }
  
  // Sort by value - descending for best, ascending for worst
  if (type === 'best') {
    results.sort((a, b) => b.value - a.value)
  } else {
    results.sort((a, b) => a.value - b.value)
  }
  
  return results
}

// H2H Teams list
const h2hTeams = computed(() => {
  const teams: any[] = []
  const seen = new Set<string>()
  
  for (const stat of careerStats.value) {
    if (!seen.has(stat.team_key)) {
      seen.add(stat.team_key)
      teams.push({
        team_key: stat.team_key,
        team_name: stat.team_name,
        logo_url: stat.logo_url
      })
    }
  }
  
  return teams.sort((a, b) => a.team_name.localeCompare(b.team_name))
})

// Filtered H2H teams
const filteredH2HTeams = computed(() => {
  if (!showCurrentMembersOnlyH2H.value) return h2hTeams.value
  return h2hTeams.value.filter(t => currentMembers.value.has(t.team_key))
})

// Get H2H record between two teams
function getH2HRecord(team1Key: string, team2Key: string): string {
  const record = h2hRecords.value[team1Key]?.[team2Key]
  if (!record) return '0-0-0'
  return `${record.wins}-${record.losses}-${record.ties}`
}

// Get H2H category differential
function getH2HCatDiff(team1Key: string, team2Key: string): string {
  const record = h2hRecords.value[team1Key]?.[team2Key]
  if (!record) return ''
  const diff = record.catWins - record.catLosses
  if (diff > 0) return `+${diff} cats`
  if (diff < 0) return `${diff} cats`
  return 'Even'
}

// Get H2H cell background class
function getH2HCellClass(team1Key: string, team2Key: string): string {
  if (team1Key === team2Key) return 'bg-dark-border/50'
  
  const record = h2hRecords.value[team1Key]?.[team2Key]
  if (!record) return ''
  
  if (record.wins > record.losses) return 'bg-green-500/20 text-green-400'
  if (record.losses > record.wins) return 'bg-red-500/20 text-red-400'
  if (record.wins === record.losses && record.wins > 0) return 'bg-yellow-500/10 text-yellow-400'
  return ''
}

// Sort functions
function sortBy(column: string) {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = column
    sortDirection.value = 'desc'
  }
}

function sortStats(stats: CareerStat[]): CareerStat[] {
  return [...stats].sort((a, b) => {
    let aVal = (a as any)[sortColumn.value] || 0
    let bVal = (b as any)[sortColumn.value] || 0
    
    if (sortDirection.value === 'asc') {
      return aVal - bVal
    }
    return bVal - aVal
  })
}

function getRecordClass(stat: CareerStat, column: string): string {
  const stats = careerStats.value
  if (stats.length === 0) return 'text-dark-text'
  
  const values = stats.map(s => (s as any)[column] || 0)
  const max = Math.max(...values)
  const min = Math.min(...values)
  const val = (stat as any)[column] || 0
  
  if (val === max && column !== 'matchup_losses') return 'text-green-400 font-bold'
  if (val === min && column === 'matchup_losses') return 'text-green-400 font-bold'
  if (val === min && column !== 'matchup_losses') return 'text-red-400'
  if (val === max && column === 'matchup_losses') return 'text-red-400'
  return 'text-dark-text'
}

function getCategoryDisplayName(statId: string): string {
  // Map stat IDs to display names - comprehensive Yahoo baseball stat IDs
  const mapping: Record<string, string> = {
    // Hitting
    '3': 'AVG', '7': 'R', '8': 'H', '12': 'HR', '13': 'RBI', '16': 'SB',
    '55': 'OBP', '56': 'SLG', '60': 'OPS', '2': 'AB', '4': 'BB', '6': 'TB',
    '17': 'CS', '18': 'BB', '21': '2B', '22': '3B', '23': 'SF', '24': 'GDP',
    // Pitching  
    '26': 'ERA', '27': 'WHIP', '28': 'W', '29': 'L', '32': 'SV', '42': 'K',
    '34': 'IP', '37': 'H', '38': 'ER', '39': 'HR', '40': 'BB', '41': 'HBP',
    '48': 'QS', '50': 'HD', '57': 'K/9', '58': 'BB/9', '83': 'K/BB',
    // Additional
    '84': 'SVHD', '33': 'BS', '25': 'CG', '30': 'SO', '31': 'GS'
  }
  return mapping[statId] || null // Return null for unknown stat IDs
}

// Check if a stat ID is valid/known
function isValidCategory(statId: string): boolean {
  return getCategoryDisplayName(statId) !== null
}

function isHittingCategory(catName: string): boolean {
  const hittingCats = ['HR', 'RBI', 'R', 'SB', 'AVG', 'OPS', 'OBP', 'SLG', 'H', 'TB', 'BB', 'XBH', 'AB', 'PA', '2B', '3B', 'CS', 'SF', 'GDP']
  return hittingCats.includes(catName)
}

function getCategoryColorClass(cat: string): string {
  const hittingCats = ['HR', 'RBI', 'R', 'SB', 'AVG', 'OPS', 'OBP', 'SLG', 'H']
  if (hittingCats.includes(cat)) return 'bg-green-500/30 text-green-400'
  return 'bg-purple-500/30 text-purple-400'
}

// Get bar width as percentage - for "best" rankings (highest = 100%)
function getBarWidth(value: number, rankings: any[]): string {
  if (!rankings || rankings.length === 0) return '0%'
  const maxValue = Math.max(...rankings.map(r => r.value || 0))
  if (maxValue === 0) return '0%'
  return `${(value / maxValue) * 100}%`
}

// Get bar width for "worst" rankings - worst values get SHORTER bars
function getBarWidthWorst(value: number, rankings: any[]): string {
  if (!rankings || rankings.length === 0) return '0%'
  const maxValue = Math.max(...rankings.map(r => r.value || 0))
  if (maxValue === 0) return '0%'
  // Lower values = shorter bars (worst performance)
  return `${(value / maxValue) * 100}%`
}

// Get bar width for career record rankings
function getRecordBarWidth(value: any, recordLabel: string): string {
  const rankings = getRecordRankings(recordLabel)
  if (!rankings || rankings.length === 0) return '0%'
  
  // Parse numeric value
  let numValue = value
  if (typeof value === 'string') {
    // Handle percentage strings like "65.2%"
    if (value.includes('%')) {
      numValue = parseFloat(value.replace('%', ''))
    } else {
      numValue = parseFloat(value) || 0
    }
  }
  
  const maxValue = Math.max(...rankings.map(r => {
    let v = r.value
    if (typeof v === 'string') {
      if (v.includes('%')) return parseFloat(v.replace('%', ''))
      return parseFloat(v) || 0
    }
    return v || 0
  }))
  
  if (maxValue === 0) return '0%'
  return `${(numValue / maxValue) * 100}%`
}

function handleImageError(e: Event) {
  const img = e.target as HTMLImageElement
  img.src = defaultAvatar
}

async function downloadCareerStats() {
  isDownloading.value = true
  try {
    const html2canvas = (await import('html2canvas')).default
    
    // Get league name from saved leagues or yahooLeague
    const activeId = leagueStore.activeLeagueId
    const savedLeague = leagueStore.savedLeagues?.find((l: any) => l.league_id === activeId?.split('.l.')[1])
    const leagueName = savedLeague?.league_name || leagueStore.yahooLeague?.name || 'Fantasy League'
    
    // Load UFD logo
    const loadLogo = async (): Promise<string> => {
      try {
        const response = await fetch('/UFD_V5.png')
        if (!response.ok) return ''
        const blob = await response.blob()
        return new Promise((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.onerror = () => resolve('')
          reader.readAsDataURL(blob)
        })
      } catch (e) { return '' }
    }
    
    // Helper to create placeholder avatar
    const createPlaceholder = (name: string): string => {
      const canvas = document.createElement('canvas')
      canvas.width = 64
      canvas.height = 64
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#3a3d52'
        ctx.beginPath()
        ctx.arc(32, 32, 32, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 28px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(name.charAt(0).toUpperCase(), 32, 34)
      }
      return canvas.toDataURL('image/png')
    }
    
    const logoBase64 = await loadLogo()
    
    // Get sorted top 12 teams
    const sortedStats = sortStats(filteredCareerStats.value).slice(0, 12)
    
    // Pre-load all team images - use placeholders for all due to CORS issues with Yahoo
    const imageMap = new Map<string, string>()
    for (const stat of sortedStats) {
      // Always use placeholder to avoid CORS issues with Yahoo images
      imageMap.set(stat.team_key, createPlaceholder(stat.team_name))
    }
    
    // Column label mapping
    const columnLabels: Record<string, string> = {
      'seasons': 'Seasons',
      'championships': 'Championships',
      'matchup_wins': 'Wins',
      'matchup_win_pct': 'Win%',
      'hitting_cat_wins': 'Hitting',
      'pitching_cat_wins': 'Pitching',
      'cat_diff': '+/-'
    }
    
    // Generate table rows with logos
    const generateRows = () => {
      return sortedStats.map((stat, idx) => `
        <tr style="border-bottom: 1px solid rgba(58, 61, 82, 0.3);">
          <td style="padding: 8px 12px; color: #9ca3af; font-weight: 600;">${idx + 1}</td>
          <td style="padding: 8px 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <img src="${imageMap.get(stat.team_key) || createPlaceholder(stat.team_name)}" style="width: 28px; height: 28px; border-radius: 50%;" />
              <span style="color: #ffffff; font-weight: 600;">${stat.team_name}</span>
            </div>
          </td>
          <td style="padding: 8px 12px; text-align: center; color: #e5e7eb;">${stat.seasons}</td>
          <td style="padding: 8px 12px; text-align: center; color: ${stat.championships > 0 ? '#facc15' : '#6b7280'}; font-weight: ${stat.championships > 0 ? 'bold' : 'normal'};">${stat.championships}</td>
          <td style="padding: 8px 12px; text-align: center; color: #e5e7eb;">${stat.matchup_wins}-${stat.matchup_losses}-${stat.matchup_ties}</td>
          <td style="padding: 8px 12px; text-align: center; color: #e5e7eb;">${(stat.matchup_win_pct * 100).toFixed(1)}%</td>
          <td style="padding: 8px 12px; text-align: center; color: #10b981;">${stat.hitting_cat_wins}</td>
          <td style="padding: 8px 12px; text-align: center; color: #8b5cf6;">${stat.pitching_cat_wins}</td>
          <td style="padding: 8px 12px; text-align: center; color: ${stat.cat_diff > 0 ? '#10b981' : stat.cat_diff < 0 ? '#ef4444' : '#6b7280'};">${stat.cat_diff > 0 ? '+' : ''}${stat.cat_diff}</td>
        </tr>
      `).join('')
    }
    
    // Create wrapper with header/footer
    const container = document.createElement('div')
    container.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 700px; font-family: system-ui, -apple-system, sans-serif;'
    
    container.innerHTML = `
      <div style="background: linear-gradient(160deg, #0f1219 0%, #0a0c14 50%, #0d1117 100%); border-radius: 16px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); position: relative; overflow: hidden;">
        
        <!-- Top Red Bar -->
        <div style="background: #dc2626; padding: 10px 24px; text-align: center;">
          <span style="font-size: 16px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 3px;">Ultimate Fantasy Dashboard</span>
        </div>
        
        <!-- Header -->
        <div style="display: flex; align-items: center; padding: 12px 24px; border-bottom: 1px solid rgba(220, 38, 38, 0.2);">
          ${logoBase64 ? `<img src="${logoBase64}" style="height: 50px; width: auto; flex-shrink: 0; margin-right: 16px; margin-top: 6px;" />` : ''}
          <div style="flex: 1;">
            <div style="font-size: 24px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 1px; line-height: 1.1;">Career Statistics</div>
            <div style="font-size: 14px; margin-top: 3px; font-weight: 600;">
              <span style="color: #e5e7eb;">${leagueName}</span>
              <span style="color: #6b7280; margin: 0 6px;">•</span>
              <span style="color: #dc2626; font-weight: 700;">Top 12 by ${columnLabels[sortColumn.value] || sortColumn.value}</span>
            </div>
          </div>
        </div>
        
        <!-- Table Content -->
        <div style="padding: 16px 24px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="border-bottom: 2px solid rgba(220, 38, 38, 0.3);">
                <th style="padding: 10px 12px; text-align: left; color: #9ca3af; font-size: 11px; text-transform: uppercase;">#</th>
                <th style="padding: 10px 12px; text-align: left; color: #9ca3af; font-size: 11px; text-transform: uppercase;">Team</th>
                <th style="padding: 10px 12px; text-align: center; color: #9ca3af; font-size: 11px; text-transform: uppercase;">Yrs</th>
                <th style="padding: 10px 12px; text-align: center; color: #9ca3af; font-size: 11px; text-transform: uppercase;">🏆</th>
                <th style="padding: 10px 12px; text-align: center; color: #9ca3af; font-size: 11px; text-transform: uppercase;">Record</th>
                <th style="padding: 10px 12px; text-align: center; color: #9ca3af; font-size: 11px; text-transform: uppercase;">Win%</th>
                <th style="padding: 10px 12px; text-align: center; color: #10b981; font-size: 11px; text-transform: uppercase;">Hit</th>
                <th style="padding: 10px 12px; text-align: center; color: #8b5cf6; font-size: 11px; text-transform: uppercase;">Pitch</th>
                <th style="padding: 10px 12px; text-align: center; color: #9ca3af; font-size: 11px; text-transform: uppercase;">+/-</th>
              </tr>
            </thead>
            <tbody>
              ${generateRows()}
            </tbody>
          </table>
        </div>
        
        <!-- Note about full history -->
        <div style="padding: 0 24px 16px 24px; text-align: center;">
          <span style="font-size: 12px; color: #6b7280; font-style: italic;">Showing top 12 • See complete league history at ultimatefantasydashboard.com</span>
        </div>
        
        <!-- Footer -->
        <div style="padding: 16px 24px; text-align: center; border-top: 1px solid rgba(220, 38, 38, 0.2);">
          <span style="font-size: 20px; font-weight: bold; color: #dc2626;">ultimatefantasydashboard.com</span>
        </div>
      </div>
    `
    
    document.body.appendChild(container)
    await new Promise(r => setTimeout(r, 300))
    
    const finalCanvas = await html2canvas(container, {
      backgroundColor: '#0a0c14',
      scale: 2,
      useCORS: true,
      allowTaint: true
    })
    
    document.body.removeChild(container)
    
    const link = document.createElement('a')
    link.download = 'category-league-career-stats.png'
    link.href = finalCanvas.toDataURL('image/png')
    link.click()
  } finally {
    isDownloading.value = false
  }
}

async function downloadSeasonHistory() {
  if (!seasonTableRef.value) return
  isDownloadingSeason.value = true
  try {
    const html2canvas = (await import('html2canvas')).default
    const leagueName = leagueStore.yahooLeague?.name || 'Fantasy League'
    
    // Load logo
    const loadLogo = async (): Promise<string> => {
      try {
        const response = await fetch('/UFD_V5.png')
        if (!response.ok) return ''
        const blob = await response.blob()
        return new Promise((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.onerror = () => resolve('')
          reader.readAsDataURL(blob)
        })
      } catch (e) { return '' }
    }
    
    const logoBase64 = await loadLogo()
    
    // Capture the table
    const tableCanvas = await html2canvas(seasonTableRef.value, {
      backgroundColor: '#0a0c14',
      scale: 2
    })
    const tableDataUrl = tableCanvas.toDataURL('image/png')
    
    // Create wrapper with header/footer
    const container = document.createElement('div')
    container.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 700px; font-family: system-ui, -apple-system, sans-serif;'
    
    container.innerHTML = `
      <div style="background: linear-gradient(160deg, #0f1219 0%, #0a0c14 50%, #0d1117 100%); border-radius: 16px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); position: relative; overflow: hidden;">
        
        <!-- Top Red Bar -->
        <div style="background: #dc2626; padding: 10px 24px; text-align: center;">
          <span style="font-size: 16px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 3px;">Ultimate Fantasy Dashboard</span>
        </div>
        
        <!-- Header -->
        <div style="display: flex; padding: 16px 24px; border-bottom: 1px solid rgba(220, 38, 38, 0.2);">
          ${logoBase64 ? `<img src="${logoBase64}" style="height: 70px; width: auto; flex-shrink: 0; margin-right: 24px;" />` : ''}
          <div style="flex: 1;">
            <div style="font-size: 36px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 2px 8px rgba(220, 38, 38, 0.4);">Season History</div>
            <div style="font-size: 18px; margin-top: 6px; font-weight: 600;">
              <span style="color: #e5e7eb;">${leagueName}</span>
              <span style="color: #6b7280; margin: 0 8px;">•</span>
              <span style="color: #dc2626; font-weight: 700;">Year-by-Year</span>
            </div>
          </div>
        </div>
        
        <!-- Table Content -->
        <div style="padding: 16px 24px;">
          <img src="${tableDataUrl}" style="width: 100%; height: auto; border-radius: 8px;" />
        </div>
        
        <!-- Footer -->
        <div style="padding: 16px 24px; text-align: center;">
          <span style="font-size: 20px; font-weight: bold; color: #dc2626;">ultimatefantasydashboard.com</span>
        </div>
      </div>
    `
    
    document.body.appendChild(container)
    await new Promise(r => setTimeout(r, 300))
    
    const finalCanvas = await html2canvas(container, {
      backgroundColor: '#0a0c14',
      scale: 2,
      useCORS: true,
      allowTaint: true
    })
    
    document.body.removeChild(container)
    
    const link = document.createElement('a')
    link.download = 'category-league-season-history.png'
    link.href = finalCanvas.toDataURL('image/png')
    link.click()
  } finally {
    isDownloadingSeason.value = false
  }
}

async function downloadH2HMatrix() {
  if (!h2hTableRef.value) return
  isDownloadingH2H.value = true
  try {
    const html2canvas = (await import('html2canvas')).default
    const leagueName = leagueStore.yahooLeague?.name || 'Fantasy League'
    
    // Load logo
    const loadLogo = async (): Promise<string> => {
      try {
        const response = await fetch('/UFD_V5.png')
        if (!response.ok) return ''
        const blob = await response.blob()
        return new Promise((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.onerror = () => resolve('')
          reader.readAsDataURL(blob)
        })
      } catch (e) { return '' }
    }
    
    const logoBase64 = await loadLogo()
    
    // Capture the table
    const tableCanvas = await html2canvas(h2hTableRef.value, {
      backgroundColor: '#0a0c14',
      scale: 2
    })
    const tableDataUrl = tableCanvas.toDataURL('image/png')
    
    // Create wrapper with header/footer
    const container = document.createElement('div')
    container.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 700px; font-family: system-ui, -apple-system, sans-serif;'
    
    container.innerHTML = `
      <div style="background: linear-gradient(160deg, #0f1219 0%, #0a0c14 50%, #0d1117 100%); border-radius: 16px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); position: relative; overflow: hidden;">
        
        <!-- Top Red Bar -->
        <div style="background: #dc2626; padding: 10px 24px; text-align: center;">
          <span style="font-size: 16px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 3px;">Ultimate Fantasy Dashboard</span>
        </div>
        
        <!-- Header -->
        <div style="display: flex; padding: 16px 24px; border-bottom: 1px solid rgba(220, 38, 38, 0.2);">
          ${logoBase64 ? `<img src="${logoBase64}" style="height: 70px; width: auto; flex-shrink: 0; margin-right: 24px;" />` : ''}
          <div style="flex: 1;">
            <div style="font-size: 36px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 2px 8px rgba(220, 38, 38, 0.4);">Head-to-Head</div>
            <div style="font-size: 18px; margin-top: 6px; font-weight: 600;">
              <span style="color: #e5e7eb;">${leagueName}</span>
              <span style="color: #6b7280; margin: 0 8px;">•</span>
              <span style="color: #dc2626; font-weight: 700;">All-Time Records</span>
            </div>
          </div>
        </div>
        
        <!-- Table Content -->
        <div style="padding: 16px 24px;">
          <img src="${tableDataUrl}" style="width: 100%; height: auto; border-radius: 8px;" />
        </div>
        
        <!-- Footer -->
        <div style="padding: 16px 24px; text-align: center;">
          <span style="font-size: 20px; font-weight: bold; color: #dc2626;">ultimatefantasydashboard.com</span>
        </div>
      </div>
    `
    
    document.body.appendChild(container)
    await new Promise(r => setTimeout(r, 300))
    
    const finalCanvas = await html2canvas(container, {
      backgroundColor: '#0a0c14',
      scale: 2,
      useCORS: true,
      allowTaint: true
    })
    
    document.body.removeChild(container)
    
    const link = document.createElement('a')
    link.download = 'category-league-h2h-matrix.png'
    link.href = finalCanvas.toDataURL('image/png')
    link.click()
  } finally {
    isDownloadingH2H.value = false
  }
}

// Download individual record ranking as image
async function downloadRecordRankings(recordLabel: string) {
  isDownloadingRecord.value = true
  try {
    const html2canvas = (await import('html2canvas')).default
    
    // Get league name
    const activeId = leagueStore.activeLeagueId
    const savedLeague = leagueStore.savedLeagues?.find((l: any) => l.league_id === activeId?.split('.l.')[1])
    const leagueName = savedLeague?.league_name || leagueStore.yahooLeague?.name || 'Fantasy League'
    
    const rankings = getRecordRankings(recordLabel).slice(0, 10)
    
    if (rankings.length === 0) {
      isDownloadingRecord.value = false
      return
    }
    
    // Load UFD logo
    const loadLogo = async (): Promise<string> => {
      try {
        const response = await fetch('/UFD_V5.png')
        if (!response.ok) return ''
        const blob = await response.blob()
        return new Promise((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.onerror = () => resolve('')
          reader.readAsDataURL(blob)
        })
      } catch (e) { return '' }
    }
    
    // Helper to create placeholder avatar
    const createPlaceholder = (name: string): string => {
      const canvas = document.createElement('canvas')
      canvas.width = 64
      canvas.height = 64
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#3a3d52'
        ctx.beginPath()
        ctx.arc(32, 32, 32, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 28px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(name.charAt(0).toUpperCase(), 32, 34)
      }
      return canvas.toDataURL('image/png')
    }
    
    const logoBase64 = await loadLogo()
    const leader = rankings[0]
    
    // Pre-load all team images - use placeholders to avoid CORS issues
    const imageMap = new Map<string, string>()
    for (const team of rankings) {
      imageMap.set(team.team_name, createPlaceholder(team.team_name))
    }
    
    const maxValue = Math.max(...rankings.map(r => {
      if (typeof r.value === 'string') {
        if (r.value.includes('%')) return parseFloat(r.value.replace('%', ''))
        return parseFloat(r.value) || 0
      }
      return r.value || 0
    }))
    
    // Generate ranking rows with images
    const generateRows = () => {
      return rankings.map((team, idx) => {
        let numValue = team.value
        if (typeof numValue === 'string') {
          if (numValue.includes('%')) numValue = parseFloat(numValue.replace('%', ''))
          else numValue = parseFloat(numValue) || 0
        }
        const barWidth = maxValue > 0 ? (numValue / maxValue) * 100 : 0
        
        return `
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
            <div style="width: 20px; text-align: center; font-weight: bold; font-size: 12px; color: ${idx === 0 ? '#facc15' : '#6b7280'};">${idx + 1}</div>
            <img src="${imageMap.get(team.team_name) || createPlaceholder(team.team_name)}" style="width: 28px; height: 28px; border-radius: 50%;" />
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 12px; font-weight: 600; color: #e5e7eb; margin-bottom: 5px;">${team.team_name}</div>
              <div style="height: 6px; background: rgba(58, 61, 82, 0.5); border-radius: 3px; overflow: hidden;">
                <div style="height: 100%; width: ${barWidth}%; background: #facc15; opacity: ${idx === 0 ? 1 : 0.6}; border-radius: 3px;"></div>
              </div>
            </div>
            <div style="width: 50px; text-align: right;">
              <div style="font-size: 13px; font-weight: bold; color: ${idx === 0 ? '#facc15' : '#e5e7eb'};">${team.value}</div>
            </div>
          </div>
        `
      }).join('')
    }
    
    const container = document.createElement('div')
    container.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 480px; font-family: system-ui, -apple-system, sans-serif;'
    
    container.innerHTML = `
      <div style="background: linear-gradient(160deg, #0f1219 0%, #0a0c14 50%, #0d1117 100%); border-radius: 16px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); position: relative; overflow: hidden;">
        
        <!-- Top Red Bar -->
        <div style="background: #dc2626; padding: 8px 20px; text-align: center;">
          <span style="font-size: 12px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 2px;">Ultimate Fantasy Dashboard</span>
        </div>
        
        <!-- Header -->
        <div style="display: flex; align-items: center; padding: 10px 16px; border-bottom: 1px solid rgba(220, 38, 38, 0.2);">
          ${logoBase64 ? `<img src="${logoBase64}" style="height: 40px; width: auto; flex-shrink: 0; margin-right: 12px; margin-top: 4px;" />` : ''}
          <div style="flex: 1;">
            <div style="font-size: 17px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.1;">${recordLabel}</div>
            <div style="font-size: 12px; margin-top: 2px;">
              <span style="color: #e5e7eb;">${leagueName}</span>
              <span style="color: #6b7280; margin: 0 4px;">•</span>
              <span style="color: #dc2626; font-weight: 600;">All-Time</span>
            </div>
          </div>
        </div>
        
        <!-- Featured Leader -->
        <div style="padding: 12px 16px; background: linear-gradient(135deg, rgba(250, 204, 21, 0.15) 0%, transparent 100%); border-bottom: 1px solid rgba(250, 204, 21, 0.2);">
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="${imageMap.get(leader.team_name) || createPlaceholder(leader.team_name)}" style="width: 44px; height: 44px; border-radius: 50%; border: 2px solid rgba(250, 204, 21, 0.5);" />
            <div style="flex: 1;">
              <div style="font-size: 15px; font-weight: bold; color: #ffffff;">${leader.team_name}</div>
              <div style="font-size: 11px; color: #9ca3af;">${leader.detail || ''}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 26px; font-weight: 900; color: #facc15;">${leader.value}</div>
            </div>
          </div>
        </div>
        
        <!-- Rankings List -->
        <div style="padding: 12px 16px;">
          ${generateRows()}
        </div>
        
        <!-- Footer -->
        <div style="padding: 10px 16px; text-align: center; border-top: 1px solid rgba(220, 38, 38, 0.2);">
          <span style="font-size: 14px; font-weight: bold; color: #dc2626;">ultimatefantasydashboard.com</span>
        </div>
      </div>
    `
    
    document.body.appendChild(container)
    await new Promise(r => setTimeout(r, 300))
    
    const finalCanvas = await html2canvas(container, {
      backgroundColor: '#0a0c14',
      scale: 2,
      useCORS: true,
      allowTaint: true
    })
    
    document.body.removeChild(container)
    
    const link = document.createElement('a')
    link.download = `career-${recordLabel.toLowerCase().replace(/\s+/g, '-')}.png`
    link.href = finalCanvas.toDataURL('image/png')
    link.click()
  } finally {
    isDownloadingRecord.value = false
  }
}

// Download award category rankings as image
async function downloadAwardRankings(category: string, type: 'best' | 'worst', catType: 'hitting' | 'pitching') {
  isDownloadingAward.value = true
  try {
    const html2canvas = (await import('html2canvas')).default
    
    // Get league name properly
    const activeId = leagueStore.activeLeagueId
    const savedLeague = leagueStore.savedLeagues?.find((l: any) => l.league_id === activeId?.split('.l.')[1])
    const leagueName = savedLeague?.league_name || leagueStore.yahooLeague?.name || 'Fantasy League'
    
    const rankings = getCategoryRankings(category, type).slice(0, 10)
    
    if (rankings.length === 0) {
      isDownloadingAward.value = false
      return
    }
    
    // Load UFD logo
    const loadLogo = async (): Promise<string> => {
      try {
        const response = await fetch('/UFD_V5.png')
        if (!response.ok) return ''
        const blob = await response.blob()
        return new Promise((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.onerror = () => resolve('')
          reader.readAsDataURL(blob)
        })
      } catch (e) { return '' }
    }
    
    // Helper to create placeholder avatar
    const createPlaceholder = (name: string, color: string): string => {
      const canvas = document.createElement('canvas')
      canvas.width = 64
      canvas.height = 64
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#3a3d52'
        ctx.beginPath()
        ctx.arc(32, 32, 32, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = color
        ctx.font = 'bold 28px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(name.charAt(0).toUpperCase(), 32, 34)
      }
      return canvas.toDataURL('image/png')
    }
    
    const logoBase64 = await loadLogo()
    const leader = rankings[0]
    const maxValue = Math.max(...rankings.map(r => r.value || 0))
    
    // Colors based on type
    const colorMain = type === 'best' ? (catType === 'hitting' ? '#22c55e' : '#a855f7') : '#ef4444'
    const colorLight = type === 'best' ? (catType === 'hitting' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(168, 85, 247, 0.15)') : 'rgba(239, 68, 68, 0.15)'
    const colorBorder = type === 'best' ? (catType === 'hitting' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(168, 85, 247, 0.3)') : 'rgba(239, 68, 68, 0.3)'
    
    // Pre-load all team images - use placeholders to avoid CORS issues
    const imageMap = new Map<string, string>()
    for (const team of rankings) {
      imageMap.set(team.team_name + team.season, createPlaceholder(team.team_name, colorMain))
    }
    
    // Generate ranking rows with proper layout
    const generateRows = () => {
      return rankings.map((team, idx) => {
        const barWidth = maxValue > 0 ? (team.value / maxValue) * 100 : 0
        
        return `
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
            <div style="width: 20px; text-align: center; font-weight: bold; font-size: 12px; color: ${idx === 0 ? colorMain : '#6b7280'};">${idx + 1}</div>
            <img src="${imageMap.get(team.team_name + team.season) || createPlaceholder(team.team_name, colorMain)}" style="width: 28px; height: 28px; border-radius: 50%;" />
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 12px; font-weight: 600; color: #e5e7eb; margin-bottom: 5px;">${team.team_name} <span style="color: #6b7280; font-weight: 400;">${team.season}</span></div>
              <div style="height: 6px; background: rgba(58, 61, 82, 0.5); border-radius: 3px; overflow: hidden;">
                <div style="height: 100%; width: ${barWidth}%; background: ${colorMain}; opacity: ${idx === 0 ? 1 : 0.6}; border-radius: 3px;"></div>
              </div>
            </div>
            <div style="width: 40px; text-align: right;">
              <div style="font-size: 13px; font-weight: bold; color: ${idx === 0 ? colorMain : '#e5e7eb'};">${team.value}</div>
            </div>
          </div>
        `
      }).join('')
    }
    
    const container = document.createElement('div')
    container.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 480px; font-family: system-ui, -apple-system, sans-serif;'
    
    container.innerHTML = `
      <div style="background: linear-gradient(160deg, #0f1219 0%, #0a0c14 50%, #0d1117 100%); border-radius: 16px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); position: relative; overflow: hidden;">
        
        <!-- Top Red Bar -->
        <div style="background: #dc2626; padding: 8px 20px; text-align: center;">
          <span style="font-size: 12px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 2px;">Ultimate Fantasy Dashboard</span>
        </div>
        
        <!-- Header -->
        <div style="display: flex; align-items: center; padding: 10px 16px; border-bottom: 1px solid rgba(220, 38, 38, 0.2);">
          ${logoBase64 ? `<img src="${logoBase64}" style="height: 40px; width: auto; flex-shrink: 0; margin-right: 12px; margin-top: 4px;" />` : ''}
          <div style="flex: 1;">
            <div style="font-size: 17px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.1;">${category}</div>
            <div style="font-size: 12px; margin-top: 2px;">
              <span style="color: #e5e7eb;">${leagueName}</span>
              <span style="color: #6b7280; margin: 0 4px;">•</span>
              <span style="color: #dc2626; font-weight: 600;">${type === 'best' ? 'Best' : 'Worst'} All-Time</span>
            </div>
          </div>
        </div>
        
        <!-- Featured Leader -->
        <div style="padding: 12px 16px; background: linear-gradient(135deg, ${colorLight} 0%, transparent 100%); border-bottom: 1px solid ${colorBorder};">
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="${imageMap.get(leader.team_name + leader.season) || createPlaceholder(leader.team_name, colorMain)}" style="width: 44px; height: 44px; border-radius: 50%; border: 2px solid ${colorBorder};" />
            <div style="flex: 1;">
              <div style="font-size: 15px; font-weight: bold; color: #ffffff;">${leader.team_name}</div>
              <div style="font-size: 11px; color: #9ca3af;">${leader.season}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 26px; font-weight: 900; color: ${colorMain};">${leader.value}</div>
              <div style="font-size: 10px; color: #6b7280;">category wins</div>
            </div>
          </div>
        </div>
        
        <!-- Rankings List -->
        <div style="padding: 12px 16px;">
          ${generateRows()}
        </div>
        
        <!-- Footer -->
        <div style="padding: 10px 16px; text-align: center; border-top: 1px solid rgba(220, 38, 38, 0.2);">
          <span style="font-size: 14px; font-weight: bold; color: #dc2626;">ultimatefantasydashboard.com</span>
        </div>
      </div>
    `
    
    document.body.appendChild(container)
    await new Promise(r => setTimeout(r, 300))
    
    const finalCanvas = await html2canvas(container, {
      backgroundColor: '#0a0c14',
      scale: 2,
      useCORS: true,
      allowTaint: true
    })
    
    document.body.removeChild(container)
    
    const link = document.createElement('a')
    link.download = `${type}-${catType}-${category.toLowerCase()}.png`
    link.href = finalCanvas.toDataURL('image/png')
    link.click()
  } finally {
    isDownloadingAward.value = false
  }
}

// Build H2H records from matchup data
function buildH2HRecords() {
  const records: Record<string, Record<string, { wins: number; losses: number; ties: number; catWins: number; catLosses: number }>> = {}
  
  for (const [year, data] of Object.entries(historicalData.value)) {
    const matchups = data.matchups || []
    
    for (const matchup of matchups) {
      if (!matchup.teams || matchup.teams.length < 2) continue
      
      const team1 = matchup.teams[0]
      const team2 = matchup.teams[1]
      const team1Key = team1.team_key
      const team2Key = team2.team_key
      const statWinners = matchup.stat_winners || []
      
      if (!team1Key || !team2Key) continue
      
      // Initialize records if needed
      if (!records[team1Key]) records[team1Key] = {}
      if (!records[team2Key]) records[team2Key] = {}
      if (!records[team1Key][team2Key]) records[team1Key][team2Key] = { wins: 0, losses: 0, ties: 0, catWins: 0, catLosses: 0 }
      if (!records[team2Key][team1Key]) records[team2Key][team1Key] = { wins: 0, losses: 0, ties: 0, catWins: 0, catLosses: 0 }
      
      // Calculate category wins for each team - use matchup.stat_winners
      const t1CatWins = statWinners.filter((w: any) => w.winner_team_key === team1Key && !w.is_tied).length || 0
      const t2CatWins = statWinners.filter((w: any) => w.winner_team_key === team2Key && !w.is_tied).length || 0
      const ties = statWinners.filter((w: any) => w.is_tied).length || 0
      
      // Determine matchup winner
      if (t1CatWins > t2CatWins) {
        records[team1Key][team2Key].wins++
        records[team2Key][team1Key].losses++
      } else if (t2CatWins > t1CatWins) {
        records[team1Key][team2Key].losses++
        records[team2Key][team1Key].wins++
      } else {
        records[team1Key][team2Key].ties++
        records[team2Key][team1Key].ties++
      }
      
      // Track category totals
      records[team1Key][team2Key].catWins += t1CatWins
      records[team1Key][team2Key].catLosses += t2CatWins
      records[team2Key][team1Key].catWins += t2CatWins
      records[team2Key][team1Key].catLosses += t1CatWins
    }
  }
  
  h2hRecords.value = records
}

async function loadHistoricalData() {
  isLoading.value = true
  loadingMessage.value = 'Connecting to Yahoo...'
  
  try {
    const leagueKey = leagueStore.activeLeagueId
    if (!leagueKey || !authStore.user?.id) {
      isLoading.value = false
      return
    }
    
    await yahooService.initialize(authStore.user.id)
    
    const gameKey = leagueKey.split('.')[0]
    
    // Baseball game keys by year - includes all available years
    const gameKeys: Record<string, string> = {
      '2025': '458', '2024': '431', '2023': '422', '2022': '412',
      '2021': '404', '2020': '398', '2019': '388', '2018': '378',
      '2017': '370', '2016': '357', '2015': '346', '2014': '328',
      '2013': '308', '2012': '283', '2011': '268', '2010': '253'
    }
    
    // Extract league ID from current league key
    const leagueId = leagueKey.split('.l.')[1]
    loadingMessage.value = `Loading league ${leagueId} history...`
    
    // Try to load ALL seasons (no limit) - will skip years where league didn't exist
    const data: Record<string, any> = {}
    const years = Object.keys(gameKeys).sort((a, b) => parseInt(b) - parseInt(a))
    
    console.log('=== Starting History Load ===')
    console.log('League ID:', leagueId)
    console.log('Will attempt to load seasons:', years)
    let successCount = 0
    let failCount = 0
    
    for (const year of years) { // Load all available years
      const yearGameKey = gameKeys[year]
      const yearLeagueKey = `${yearGameKey}.l.${leagueId}`
      
      loadingMessage.value = `Loading ${year} season... (${successCount} loaded, ${failCount} not found)`
      console.log(`Attempting to load ${year} with key: ${yearLeagueKey}`)
      
      try {
        const standings = await yahooService.getStandings(yearLeagueKey)
        console.log(`${year} standings response:`, standings?.length || 0, 'teams')
        
        if (standings && standings.length > 0) {
          console.log(`✓ Loaded ${year} season: ${standings.length} teams`)
          successCount++
          
          // Determine champion (rank 1 at end of playoffs)
          const champion = standings.find((t: any) => t.rank === 1)
          if (champion) champion.is_champion = true
          
          data[year] = { standings, matchups: [] }
          
          // Store current members from most recent season
          if (Object.keys(data).length === 1) {
            standings.forEach((t: any) => {
              currentMembers.value.add(t.team_key)
              allTeams.value[t.team_key] = t
            })
          } else {
            // Also store team info from older seasons
            standings.forEach((t: any) => {
              if (!allTeams.value[t.team_key]) {
                allTeams.value[t.team_key] = t
              }
            })
          }
          
          // Try to load matchups for category data - need to load each week
          try {
            loadingMessage.value = `Loading ${year} matchups...`
            const allMatchups: any[] = []
            
            // Get total weeks from standings or default to 25 for baseball
            const totalWeeks = 25 // Baseball regular season typically has ~25 weeks
            let consecutiveFailures = 0
            
            // Load matchups for each week (break early if season seems to have ended)
            for (let week = 1; week <= totalWeeks; week++) {
              try {
                loadingMessage.value = `Loading ${year} week ${week}/${totalWeeks}...`
                const weekMatchups = await yahooService.getCategoryMatchups(yearLeagueKey, week)
                if (weekMatchups && weekMatchups.length > 0) {
                  allMatchups.push(...weekMatchups)
                  consecutiveFailures = 0
                } else {
                  consecutiveFailures++
                }
              } catch (weekError) {
                // Week might not exist (playoffs, etc)
                consecutiveFailures++
              }
              
              // If we get 3 consecutive failures, the season has likely ended
              if (consecutiveFailures >= 3 && allMatchups.length > 0) {
                console.log(`Stopping at week ${week} for ${year} - season appears to have ended`)
                break
              }
            }
            
            console.log(`Loaded ${allMatchups.length} total matchups for ${year}`)
            if (allMatchups.length > 0) {
              data[year].matchups = allMatchups
            }
          } catch (e) {
            console.log(`Could not load matchups for ${year}:`, e)
          }
          
          // Small delay between seasons to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100))
        } else {
          console.log(`✗ ${year} - No standings data returned`)
          failCount++
        }
      } catch (e: any) {
        console.log(`✗ Could not load ${year} season:`, e?.message || e)
        failCount++
      }
    }
    
    console.log('=== History Load Complete ===')
    console.log(`Finished loading: ${successCount} seasons loaded, ${failCount} not found`)
    console.log('Loaded seasons:', Object.keys(data))
    console.log('Data keys:', Object.keys(data).length)
    
    // IMPORTANT: Assign data to reactive ref
    historicalData.value = data
    console.log('historicalData.value now has:', Object.keys(historicalData.value).length, 'seasons')
    
    // Build H2H records from matchup data
    loadingMessage.value = 'Building head-to-head records...'
    buildH2HRecords()
    
    loadingMessage.value = 'Done!'
    
  } catch (e) {
    console.error('Error loading history:', e)
    loadingMessage.value = 'Error loading data'
  } finally {
    isLoading.value = false
  }
}

watch(() => leagueStore.activeLeagueId, (id) => {
  if (id && leagueStore.activePlatform === 'yahoo' && !isLoading.value) {
    loadHistoricalData()
  }
}, { immediate: true })

// Removed duplicate onMounted call - the watch with immediate: true handles initial load
</script>

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  margin-top: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 400px;
  margin-top: 0.5rem;
}
</style>
