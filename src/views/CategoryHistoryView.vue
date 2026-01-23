<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-bold text-dark-text mb-2">League History</h1>
      <p class="text-base text-dark-textMuted">
        Career statistics, championship records, and historical league data
      </p>
    </div>

    <!-- Offseason Notice Banner - Only show when season is complete -->
    <div v-if="isSeasonComplete" class="bg-slate-500/10 border border-slate-500/30 rounded-xl p-4 flex items-start gap-3">
      <div class="text-slate-400 text-xl flex-shrink-0">📅</div>
      <div>
        <p class="text-slate-200 font-semibold">It's the offseason</p>
        <p class="text-slate-400 text-sm mt-1">You're viewing last season's data ({{ currentSeason }}). The {{ Number(currentSeason) + 1 }} season will appear automatically once Week 1 begins.</p>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="flex gap-2 flex-wrap">
      <button
        @click="activeHistoryTab = 'career'"
        :class="activeHistoryTab === 'career' ? 'bg-yellow-400 text-gray-900' : 'bg-dark-card text-dark-textSecondary hover:bg-dark-border/50'"
        class="px-4 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 text-sm"
      >
        <span class="text-lg">📊</span>
        Career
      </button>
      <button
        @click="activeHistoryTab = 'h2h'"
        :class="activeHistoryTab === 'h2h' ? 'bg-yellow-400 text-gray-900' : 'bg-dark-card text-dark-textSecondary hover:bg-dark-border/50'"
        class="px-4 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 text-sm"
      >
        <span class="text-lg">⚔️</span>
        Head-to-Head
      </button>
      <button
        @click="activeHistoryTab = 'awards'"
        :class="activeHistoryTab === 'awards' ? 'bg-yellow-400 text-gray-900' : 'bg-dark-card text-dark-textSecondary hover:bg-dark-border/50'"
        class="px-4 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 text-sm"
      >
        <span class="text-lg">🏆</span>
        Awards
      </button>
      <button
        @click="activeHistoryTab = 'legacy'"
        :class="activeHistoryTab === 'legacy' ? 'bg-yellow-400 text-gray-900' : 'bg-dark-card text-dark-textSecondary hover:bg-dark-border/50'"
        class="px-4 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 text-sm"
      >
        <span class="text-lg">👑</span>
        Legacy
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center py-20">
      <LoadingSpinner size="xl" :message="loadingMessage" />
      
      <!-- Detailed progress -->
      <div class="mt-4 text-center space-y-2">
        <div v-if="loadingProgress.currentStep" class="text-sm text-dark-textMuted">
          {{ loadingProgress.currentStep }}
        </div>
        
        <!-- Season progress -->
        <div v-if="loadingProgress.totalSeasons > 0" class="text-xs text-dark-textMuted/70">
          Seasons: {{ loadingProgress.seasonsLoaded }}/{{ loadingProgress.totalSeasons }}
        </div>
        
        <!-- Week progress bar -->
        <div v-if="loadingProgress.maxWeek > 0" class="w-64 mx-auto">
          <div class="flex justify-between text-xs text-dark-textMuted/70 mb-1">
            <span>{{ loadingProgress.season }} Week {{ loadingProgress.week }}</span>
            <span>{{ loadingProgress.week }}/{{ loadingProgress.maxWeek }}</span>
          </div>
          <div class="h-1.5 bg-dark-border rounded-full overflow-hidden">
            <div 
              class="h-full bg-yellow-400 transition-all duration-300"
              :style="{ width: `${(loadingProgress.week / loadingProgress.maxWeek) * 100}%` }"
            ></div>
          </div>
        </div>
      </div>
      
      <div class="text-xs text-dark-textMuted/50 mt-4">This may take a minute for leagues with many seasons</div>
    </div>

    <template v-else>
      <!-- ==================== CAREER TAB ==================== -->
      <template v-if="activeHistoryTab === 'career'">
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
                style="background: transparent; color: #facc15; border: 1px solid #facc15;"
                @mouseover="$event.currentTarget.style.background = '#facc15'; $event.currentTarget.style.color = '#111827'"
                @mouseout="$event.currentTarget.style.background = 'transparent'; $event.currentTarget.style.color = '#facc15'"
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
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider cursor-pointer hover:text-yellow-400 transition-colors" @click="sortBy('seasons')">
                  Seasons <span v-if="sortColumn === 'seasons'" class="text-yellow-400">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider cursor-pointer hover:text-yellow-400 transition-colors" @click="sortBy('championships')">
                  🏆 <span v-if="sortColumn === 'championships'" class="text-yellow-400">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider cursor-pointer hover:text-yellow-400 transition-colors" @click="sortBy('matchup_wins')">
                  Record <span v-if="sortColumn === 'matchup_wins'" class="text-yellow-400">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider cursor-pointer hover:text-yellow-400 transition-colors" @click="sortBy('matchup_win_pct')">
                  Win % <span v-if="sortColumn === 'matchup_win_pct'" class="text-yellow-400">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider cursor-pointer hover:text-yellow-400 transition-colors" @click="sortBy('hitting_cat_wins')">
                  Hitting Cat W <span v-if="sortColumn === 'hitting_cat_wins'" class="text-yellow-400">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider cursor-pointer hover:text-yellow-400 transition-colors" @click="sortBy('pitching_cat_wins')">
                  Pitching Cat W <span v-if="sortColumn === 'pitching_cat_wins'" class="text-yellow-400">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider cursor-pointer hover:text-yellow-400 transition-colors" @click="sortBy('cat_diff')">
                  Cat +/- <span v-if="sortColumn === 'cat_diff'" class="text-yellow-400">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
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
                        :key="`career-${stat.team_key}`"
                        :alt="stat.team_name"
                        class="w-full h-full object-cover"
                        loading="lazy"
                        @error="handleImageError"
                      />
                    </div>
                    <div class="font-semibold text-dark-text">{{ stat.team_name }}</div>
                  </div>
                </td>
                <td class="text-center py-3 px-4 text-dark-text">{{ stat.seasons }}</td>
                <td class="text-center py-3 px-4">
                  <span v-if="stat.championships > 0" class="text-yellow-400 font-bold">
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
              style="background: transparent; color: #facc15; border: 1px solid #facc15;"
              @mouseover="$event.currentTarget.style.background = '#facc15'; $event.currentTarget.style.color = '#111827'"
              @mouseout="$event.currentTarget.style.background = 'transparent'; $event.currentTarget.style.color = '#facc15'"
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
                      <img :src="season.mostDominant?.logo_url || defaultAvatar" :key="`dominant-${season.year}`" class="w-full h-full object-cover" loading="lazy" @error="handleImageError" />
                    </div>
                    <span class="font-semibold text-green-400">{{ season.mostDominant?.name || 'N/A' }}</span>
                  </div>
                  <div class="text-xs text-dark-textMuted">{{ season.mostDominant?.record || '' }}</div>
                </td>
                <td class="text-center py-3 px-4">
                  <div class="flex items-center justify-center gap-2">
                    <div class="w-6 h-6 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                      <img :src="season.mostCatWins?.logo_url || defaultAvatar" :key="`catwin-${season.year}`" class="w-full h-full object-cover" loading="lazy" @error="handleImageError" />
                    </div>
                    <span class="font-semibold text-green-400">{{ season.mostCatWins?.name || 'N/A' }}</span>
                  </div>
                  <div class="text-xs text-dark-textMuted">{{ season.mostCatWins?.value || '' }} cat wins</div>
                </td>
                <td class="text-center py-3 px-4">
                  <div class="flex items-center justify-center gap-2">
                    <div class="w-6 h-6 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                      <img :src="season.fewestCatWins?.logo_url || defaultAvatar" :key="`catlose-${season.year}`" class="w-full h-full object-cover" loading="lazy" @error="handleImageError" />
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
                      <img :src="season.champion?.logo_url || defaultAvatar" :key="`champ-${season.year}`" class="w-full h-full object-cover" loading="lazy" @error="handleImageError" />
                    </div>
                    <span class="font-semibold text-yellow-400">{{ season.champion?.name || 'TBD' }}</span>
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
      </template>

      <!-- ==================== HEAD-TO-HEAD TAB ==================== -->
      <template v-if="activeHistoryTab === 'h2h'">
      
      <!-- Team Comparison Section -->
      <div class="card mb-6">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">⚔️</span>
            <h2 class="card-title">Compare Teams</h2>
          </div>
          <p class="card-subtitle mt-1">Select two teams to see their head-to-head history</p>
        </div>
        <div class="card-body">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Team 1 Selector -->
            <div>
              <label class="block text-sm font-semibold text-dark-text mb-2">Team 1</label>
              <select v-model="compareTeam1Key" class="select w-full">
                <option value="">Select Team...</option>
                <option v-for="team in compareAvailableTeams1" :key="team.team_key" :value="team.team_key">
                  {{ team.team_name }}
                </option>
              </select>
            </div>

            <!-- Team 2 Selector -->
            <div>
              <label class="block text-sm font-semibold text-dark-text mb-2">Team 2</label>
              <select v-model="compareTeam2Key" class="select w-full">
                <option value="">Select Team...</option>
                <option v-for="team in compareAvailableTeams2" :key="team.team_key" :value="team.team_key">
                  {{ team.team_name }}
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Comparison Results (only show when both teams selected) -->
      <template v-if="compareTeam1Key && compareTeam2Key && compareData">
        <!-- Tale of the Tape -->
        <div class="card mb-6">
          <div class="card-header">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-2xl">🥊</span>
                <h2 class="card-title">Tale of the Tape</h2>
              </div>
              <button 
                @click="downloadComparison"
                :disabled="isDownloadingComparison"
                class="px-4 py-2 border border-yellow-400 bg-transparent text-yellow-400 hover:bg-yellow-400 hover:text-gray-900 rounded-lg font-medium flex items-center gap-2 text-sm transition-colors disabled:opacity-50"
              >
                <svg v-if="!isDownloadingComparison" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ isDownloadingComparison ? 'Generating...' : 'Share' }}
              </button>
            </div>
            <p class="card-subtitle mt-2">All-time comparison</p>
          </div>
          <div class="card-body">
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <!-- Team 1 Stats -->
              <div class="text-center p-6 bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 rounded-xl border-2 border-cyan-500/30">
                <img 
                  :src="compareTeam1Data?.logo_url || defaultAvatar" 
                  :key="`compare1-${compareTeam1Key}`"
                  :alt="compareTeam1Data?.team_name" 
                  class="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-cyan-500 object-cover" 
                  loading="lazy"
                  @error="handleImageError" 
                />
                <div class="font-bold text-xl text-dark-text mb-3">{{ compareTeam1Data?.team_name }}</div>
                
                <div class="space-y-2 text-left text-sm">
                  <div class="flex justify-between">
                    <span class="text-dark-textMuted">🏆 Championships:</span>
                    <span class="font-bold text-dark-text">{{ compareData.team1.championships }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-dark-textMuted">📅 Seasons:</span>
                    <span class="font-bold text-dark-text">{{ compareData.team1.seasons }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-dark-textMuted">Matchup Record:</span>
                    <span class="font-bold text-dark-text">{{ compareData.team1.matchupWins }}-{{ compareData.team1.matchupLosses }}-{{ compareData.team1.matchupTies }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-dark-textMuted">Win %:</span>
                    <span class="font-bold text-dark-text">{{ (compareData.team1.winPct * 100).toFixed(1) }}%</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-dark-textMuted">Avg Cat Wins:</span>
                    <span class="font-bold text-dark-text">{{ compareData.team1.avgCatWins.toFixed(1) }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-dark-textMuted">Cat Diff:</span>
                    <span class="font-bold" :class="compareData.team1.catDiff >= 0 ? 'text-green-400' : 'text-red-400'">{{ compareData.team1.catDiff >= 0 ? '+' : '' }}{{ compareData.team1.catDiff }}</span>
                  </div>
                </div>
              </div>

              <!-- VS Section -->
              <div class="flex flex-col items-center justify-center p-6">
                <div class="text-5xl font-black text-dark-textMuted mb-4">VS</div>
                
                <!-- Head-to-Head Record -->
                <div class="text-center mb-4">
                  <div class="text-sm text-dark-textMuted mb-2">Head-to-Head Record</div>
                  <div class="flex items-center justify-center gap-3">
                    <div class="text-center">
                      <div class="text-3xl font-bold" :class="compareData.h2h.team1Wins > compareData.h2h.team2Wins ? 'text-green-400' : 'text-dark-textMuted'">
                        {{ compareData.h2h.team1Wins }}
                      </div>
                    </div>
                    <div class="text-2xl text-dark-textMuted">-</div>
                    <div class="text-center">
                      <div class="text-3xl font-bold" :class="compareData.h2h.team2Wins > compareData.h2h.team1Wins ? 'text-green-400' : 'text-dark-textMuted'">
                        {{ compareData.h2h.team2Wins }}
                      </div>
                    </div>
                  </div>
                  <div v-if="compareData.h2h.ties > 0" class="text-xs text-dark-textMuted mt-1">
                    {{ compareData.h2h.ties }} tie(s)
                  </div>
                </div>

                <!-- Rivalry Stats -->
                <div class="w-full space-y-2 text-sm">
                  <div class="flex justify-between p-2 bg-dark-border/20 rounded">
                    <span class="text-dark-textMuted">Total Meetings:</span>
                    <span class="font-semibold text-dark-text">{{ compareData.h2h.totalGames }}</span>
                  </div>
                  <div v-if="compareData.h2h.totalGames > 0" class="flex justify-between p-2 bg-dark-border/20 rounded">
                    <span class="text-dark-textMuted">Cat Diff:</span>
                    <span class="font-semibold" :class="compareData.h2h.catDiff > 0 ? 'text-cyan-400' : compareData.h2h.catDiff < 0 ? 'text-orange-400' : 'text-dark-text'">
                      {{ compareData.h2h.catDiff > 0 ? '+' : '' }}{{ compareData.h2h.catDiff }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Team 2 Stats -->
              <div class="text-center p-6 bg-gradient-to-br from-orange-500/10 to-orange-600/5 rounded-xl border-2 border-orange-500/30">
                <img 
                  :src="compareTeam2Data?.logo_url || defaultAvatar" 
                  :key="`compare2-${compareTeam2Key}`"
                  :alt="compareTeam2Data?.team_name" 
                  class="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-orange-500 object-cover" 
                  loading="lazy"
                  @error="handleImageError" 
                />
                <div class="font-bold text-xl text-dark-text mb-3">{{ compareTeam2Data?.team_name }}</div>
                
                <div class="space-y-2 text-left text-sm">
                  <div class="flex justify-between">
                    <span class="text-dark-textMuted">🏆 Championships:</span>
                    <span class="font-bold text-dark-text">{{ compareData.team2.championships }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-dark-textMuted">📅 Seasons:</span>
                    <span class="font-bold text-dark-text">{{ compareData.team2.seasons }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-dark-textMuted">Matchup Record:</span>
                    <span class="font-bold text-dark-text">{{ compareData.team2.matchupWins }}-{{ compareData.team2.matchupLosses }}-{{ compareData.team2.matchupTies }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-dark-textMuted">Win %:</span>
                    <span class="font-bold text-dark-text">{{ (compareData.team2.winPct * 100).toFixed(1) }}%</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-dark-textMuted">Avg Cat Wins:</span>
                    <span class="font-bold text-dark-text">{{ compareData.team2.avgCatWins.toFixed(1) }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-dark-textMuted">Cat Diff:</span>
                    <span class="font-bold" :class="compareData.team2.catDiff >= 0 ? 'text-green-400' : 'text-red-400'">{{ compareData.team2.catDiff >= 0 ? '+' : '' }}{{ compareData.team2.catDiff }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Rivalry Highlights -->
        <div v-if="compareRivalryHighlights" class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div class="card">
            <div class="card-body p-4">
              <div class="text-xs text-dark-textMuted mb-2">💥 Biggest Blowout</div>
              <div class="font-bold text-dark-text mb-1">{{ compareRivalryHighlights.biggestBlowout.winner }}</div>
              <div class="text-lg text-primary font-bold">{{ compareRivalryHighlights.biggestBlowout.margin }} cat margin</div>
              <div class="text-xs text-dark-textMuted mt-1">{{ compareRivalryHighlights.biggestBlowout.season }} Week {{ compareRivalryHighlights.biggestBlowout.week }}</div>
            </div>
          </div>
          
          <div class="card">
            <div class="card-body p-4">
              <div class="text-xs text-dark-textMuted mb-2">🎯 Closest Game</div>
              <div class="font-bold text-dark-text mb-1">{{ compareRivalryHighlights.closestGame.winner }}</div>
              <div class="text-lg text-primary font-bold">{{ compareRivalryHighlights.closestGame.margin }} cat margin</div>
              <div class="text-xs text-dark-textMuted mt-1">{{ compareRivalryHighlights.closestGame.season }} Week {{ compareRivalryHighlights.closestGame.week }}</div>
            </div>
          </div>
          
          <div class="card">
            <div class="card-body p-4">
              <div class="text-xs text-dark-textMuted mb-2">🔥 Most Categories Won</div>
              <div class="font-bold text-dark-text mb-1">{{ compareRivalryHighlights.highestCats.totalCats }} total cats</div>
              <div class="text-lg text-primary font-bold">{{ compareRivalryHighlights.highestCats.score }}</div>
              <div class="text-xs text-dark-textMuted mt-1">{{ compareRivalryHighlights.highestCats.season }} Week {{ compareRivalryHighlights.highestCats.week }}</div>
            </div>
          </div>
        </div>

        <!-- Rivalry History -->
        <div class="card mb-6" v-if="compareRivalryHistory.length > 0">
          <div class="card-header">
            <div class="flex items-center gap-2">
              <span class="text-2xl">📜</span>
              <h2 class="card-title">Rivalry History</h2>
            </div>
            <p class="card-subtitle mt-2">All {{ compareRivalryHistory.length }} head-to-head matchups</p>
          </div>
          <div class="card-body">
            <div class="space-y-3 max-h-96 overflow-y-auto">
              <div 
                v-for="(matchup, idx) in compareRivalryHistory" 
                :key="idx"
                class="p-3 bg-dark-border/20 rounded-lg border border-dark-border"
              >
                <div class="flex items-center justify-between">
                  <div class="text-sm">
                    <span class="font-semibold text-dark-text">{{ matchup.season }} Week {{ matchup.week }}</span>
                    <span v-if="matchup.isPlayoff" class="ml-2 px-2 py-0.5 bg-primary/20 text-primary text-xs rounded">
                      Playoff
                    </span>
                  </div>
                  <div class="flex items-center gap-4">
                    <div class="text-right">
                      <div class="text-xs text-dark-textMuted">{{ compareTeam1Data?.team_name?.split(' ')[0] }}</div>
                      <div class="font-bold" :class="matchup.team1Wins > matchup.team2Wins ? 'text-green-400' : matchup.team1Wins < matchup.team2Wins ? 'text-red-400' : 'text-dark-text'">
                        {{ matchup.team1Wins }}-{{ matchup.team1Losses }}
                      </div>
                    </div>
                    <div class="text-dark-textMuted text-sm">vs</div>
                    <div class="text-left">
                      <div class="text-xs text-dark-textMuted">{{ compareTeam2Data?.team_name?.split(' ')[0] }}</div>
                      <div class="font-bold" :class="matchup.team2Wins > matchup.team1Wins ? 'text-green-400' : matchup.team2Wins < matchup.team1Wins ? 'text-red-400' : 'text-dark-text'">
                        {{ matchup.team2Wins }}-{{ matchup.team2Losses }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- No matchups found message -->
        <div v-if="compareRivalryHistory.length === 0" class="card mb-6">
          <div class="card-body text-center py-8">
            <p class="text-dark-textMuted">No head-to-head matchups found between these teams</p>
          </div>
        </div>
      </template>

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
                style="background: transparent; color: #facc15; border: 1px solid #facc15;"
                @mouseover="$event.currentTarget.style.background = '#facc15'; $event.currentTarget.style.color = '#111827'"
                @mouseout="$event.currentTarget.style.background = 'transparent'; $event.currentTarget.style.color = '#facc15'"
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
                      <img :src="team.logo_url || defaultAvatar" :key="`h2h-header-${team.team_key}`" class="w-full h-full object-cover" loading="lazy" @error="handleImageError" />
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
                      <img :src="rowTeam.logo_url || defaultAvatar" :key="`h2h-row-${rowTeam.team_key}`" class="w-full h-full object-cover" loading="lazy" @error="handleImageError" />
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
      </template>

      <!-- ==================== AWARDS TAB ==================== -->
      <template v-if="activeHistoryTab === 'awards'">
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
                          ? 'bg-yellow-400 text-gray-900' 
                          : 'bg-dark-elevated text-dark-textMuted hover:text-dark-text'
                      ]">
                All-Time
              </button>
              <button @click="awardsTab = 'yearly'"
                      :class="[
                        'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                        awardsTab === 'yearly' 
                          ? 'bg-yellow-400 text-gray-900' 
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
                          <img :src="award.winner.logo_url || defaultAvatar" :key="`award-${award.category}`" class="w-full h-full object-cover" loading="lazy" @error="handleImageError" />
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
                          <img :src="award.winner.logo_url || defaultAvatar" :key="`award-${award.category}`" class="w-full h-full object-cover" loading="lazy" @error="handleImageError" />
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
                          <img :src="award.winner.logo_url || defaultAvatar" :key="`award-${award.category}`" class="w-full h-full object-cover" loading="lazy" @error="handleImageError" />
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
                          <img :src="award.winner.logo_url || defaultAvatar" :key="`award-${award.category}`" class="w-full h-full object-cover" loading="lazy" @error="handleImageError" />
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
                          <img :src="award.winner.logo_url || defaultAvatar" :key="`award-${award.category}`" class="w-full h-full object-cover" loading="lazy" @error="handleImageError" />
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
                      <div class="flex items-center gap-2">
                        <button 
                          @click="downloadSeasonCategoryRankings(expandedSeasonAwardCard?.replace('season-fame-hitting-', '') || '', 'best', 'hitting')"
                          :disabled="isDownloadingSeasonCategory"
                          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-50 text-xs"
                          style="background: transparent; color: #facc15; border: 1px solid #facc15;"
                          @mouseover="$event.currentTarget.style.background = '#22c55e'; $event.currentTarget.style.color = '#111827'"
                          @mouseout="$event.currentTarget.style.background = 'transparent'; $event.currentTarget.style.color = '#facc15'"
                        >
                          <svg v-if="!isDownloadingSeasonCategory" class="w-3.5 h-3.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          <svg v-else class="w-3.5 h-3.5 animate-spin pointer-events-none" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {{ isDownloadingSeasonCategory ? 'Saving...' : 'Share' }}
                        </button>
                        <button @click="expandedSeasonAwardCard = null" class="text-dark-textMuted hover:text-dark-text">
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
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
                            <img :src="team.logo_url || defaultAvatar" :key="`team-${team.team_key || team.team_name}`" class="w-full h-full object-cover" loading="lazy" @error="handleImageError" />
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
                          <img :src="award.winner.logo_url || defaultAvatar" :key="`award-${award.category}`" class="w-full h-full object-cover" loading="lazy" @error="handleImageError" />
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
                      <div class="flex items-center gap-2">
                        <button 
                          @click="downloadSeasonCategoryRankings(expandedSeasonAwardCard?.replace('season-fame-pitching-', '') || '', 'best', 'pitching')"
                          :disabled="isDownloadingSeasonCategory"
                          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-50 text-xs"
                          style="background: transparent; color: #facc15; border: 1px solid #facc15;"
                          @mouseover="$event.currentTarget.style.background = '#a855f7'; $event.currentTarget.style.color = '#111827'"
                          @mouseout="$event.currentTarget.style.background = 'transparent'; $event.currentTarget.style.color = '#facc15'"
                        >
                          <svg v-if="!isDownloadingSeasonCategory" class="w-3.5 h-3.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          <svg v-else class="w-3.5 h-3.5 animate-spin pointer-events-none" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {{ isDownloadingSeasonCategory ? 'Saving...' : 'Share' }}
                        </button>
                        <button @click="expandedSeasonAwardCard = null" class="text-dark-textMuted hover:text-dark-text">
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
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
                            <img :src="team.logo_url || defaultAvatar" :key="`team-${team.team_key || team.team_name}`" class="w-full h-full object-cover" loading="lazy" @error="handleImageError" />
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
                          <img :src="award.winner.logo_url || defaultAvatar" :key="`award-${award.category}`" class="w-full h-full object-cover" loading="lazy" @error="handleImageError" />
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
                      <div class="flex items-center gap-2">
                        <button 
                          @click="downloadSeasonCategoryRankings(expandedSeasonAwardCard?.replace('season-shame-hitting-', '') || '', 'worst', 'hitting')"
                          :disabled="isDownloadingSeasonCategory"
                          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-50 text-xs"
                          style="background: transparent; color: #facc15; border: 1px solid #facc15;"
                          @mouseover="$event.currentTarget.style.background = '#ef4444'; $event.currentTarget.style.color = '#111827'"
                          @mouseout="$event.currentTarget.style.background = 'transparent'; $event.currentTarget.style.color = '#facc15'"
                        >
                          <svg v-if="!isDownloadingSeasonCategory" class="w-3.5 h-3.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          <svg v-else class="w-3.5 h-3.5 animate-spin pointer-events-none" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {{ isDownloadingSeasonCategory ? 'Saving...' : 'Share' }}
                        </button>
                        <button @click="expandedSeasonAwardCard = null" class="text-dark-textMuted hover:text-dark-text">
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
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
                            <img :src="team.logo_url || defaultAvatar" :key="`team-${team.team_key || team.team_name}`" class="w-full h-full object-cover" loading="lazy" @error="handleImageError" />
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
                          <img :src="award.winner.logo_url || defaultAvatar" :key="`award-${award.category}`" class="w-full h-full object-cover" loading="lazy" @error="handleImageError" />
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
                      <div class="flex items-center gap-2">
                        <button 
                          @click="downloadSeasonCategoryRankings(expandedSeasonAwardCard?.replace('season-shame-pitching-', '') || '', 'worst', 'pitching')"
                          :disabled="isDownloadingSeasonCategory"
                          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-50 text-xs"
                          style="background: transparent; color: #facc15; border: 1px solid #facc15;"
                          @mouseover="$event.currentTarget.style.background = '#ef4444'; $event.currentTarget.style.color = '#111827'"
                          @mouseout="$event.currentTarget.style.background = 'transparent'; $event.currentTarget.style.color = '#facc15'"
                        >
                          <svg v-if="!isDownloadingSeasonCategory" class="w-3.5 h-3.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          <svg v-else class="w-3.5 h-3.5 animate-spin pointer-events-none" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {{ isDownloadingSeasonCategory ? 'Saving...' : 'Share' }}
                        </button>
                        <button @click="expandedSeasonAwardCard = null" class="text-dark-textMuted hover:text-dark-text">
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
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
                            <img :src="team.logo_url || defaultAvatar" :key="`team-${team.team_key || team.team_name}`" class="w-full h-full object-cover" loading="lazy" @error="handleImageError" />
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

      <!-- ==================== LEGACY TAB ==================== -->
      <template v-if="activeHistoryTab === 'legacy'">
        <!-- Explanation Card -->
        <div class="card mb-6 border border-yellow-500/30">
          <div class="card-body py-4">
            <div class="flex items-start gap-3">
              <div class="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500/20 to-amber-500/20 flex items-center justify-center flex-shrink-0">
                <span class="text-2xl">👑</span>
              </div>
              <div class="flex-1">
                <h3 class="font-bold text-dark-text text-lg">Legacy Score</h3>
                <p class="text-sm text-dark-textMuted mt-1">
                  A comprehensive score measuring each manager's historical success in category leagues. Points are awarded for championships, 
                  playoff appearances, matchup wins, category dominance, and sustained excellence over time.
                </p>
                <button 
                  @click="showLegacyExplainer = !showLegacyExplainer"
                  class="text-xs text-yellow-400 mt-2 hover:underline"
                >
                  {{ showLegacyExplainer ? 'Hide scoring breakdown ↑' : 'View scoring breakdown →' }}
                </button>
                
                <!-- Scoring Breakdown -->
                <div v-if="showLegacyExplainer" class="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  <div class="bg-dark-bg/50 rounded-lg p-3">
                    <div class="font-semibold text-emerald-400 mb-2">🏆 Championships</div>
                    <div class="space-y-1 text-dark-textMuted">
                      <div class="flex justify-between"><span>Championship Win</span><span class="text-emerald-400">+100</span></div>
                      <div class="flex justify-between"><span>Runner-up</span><span class="text-emerald-400">+50</span></div>
                      <div class="flex justify-between"><span>3rd Place</span><span class="text-emerald-400">+25</span></div>
                    </div>
                  </div>
                  <div class="bg-dark-bg/50 rounded-lg p-3">
                    <div class="font-semibold text-blue-400 mb-2">📈 Season Performance</div>
                    <div class="space-y-1 text-dark-textMuted">
                      <div class="flex justify-between"><span>Playoff Appearance</span><span class="text-blue-400">+20</span></div>
                      <div class="flex justify-between"><span>Regular Season Title</span><span class="text-blue-400">+30</span></div>
                      <div class="flex justify-between"><span>Each Matchup Win</span><span class="text-blue-400">+3</span></div>
                      <div class="flex justify-between"><span>Winning Record Season</span><span class="text-blue-400">+10</span></div>
                    </div>
                  </div>
                  <div class="bg-dark-bg/50 rounded-lg p-3">
                    <div class="font-semibold text-purple-400 mb-2">⭐ Category Achievements</div>
                    <div class="space-y-1 text-dark-textMuted">
                      <div class="flex justify-between"><span>Season Category Leader</span><span class="text-purple-400">+20</span></div>
                      <div class="flex justify-between"><span>Top 3 Category Performance</span><span class="text-purple-400">+10</span></div>
                      <div class="flex justify-between"><span>Best Weekly Cat Performance</span><span class="text-purple-400">+10</span></div>
                    </div>
                  </div>
                  <div class="bg-dark-bg/50 rounded-lg p-3">
                    <div class="font-semibold text-amber-400 mb-2">🎖️ Longevity</div>
                    <div class="space-y-1 text-dark-textMuted">
                      <div class="flex justify-between"><span>Per Season Played</span><span class="text-amber-400">+5</span></div>
                      <div class="flex justify-between"><span>3+ Year Playoff Streak</span><span class="text-amber-400">+15</span></div>
                      <div class="flex justify-between"><span>5+ Year Playoff Streak</span><span class="text-amber-400">+30</span></div>
                    </div>
                  </div>
                  <div v-if="includeLegacyPenalties" class="bg-dark-bg/50 rounded-lg p-3 border border-red-500/20">
                    <div class="font-semibold text-red-400 mb-2">💀 Penalties</div>
                    <div class="space-y-1 text-dark-textMuted">
                      <div class="flex justify-between"><span>Last Place Finish</span><span class="text-red-400">-20</span></div>
                      <div class="flex justify-between"><span>Worst Weekly Performance</span><span class="text-red-400">-5</span></div>
                      <div class="flex justify-between"><span>Season Category Cellar</span><span class="text-red-400">-10</span></div>
                      <div class="flex justify-between"><span>Losing Record Season</span><span class="text-red-400">-5</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Controls -->
        <div class="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div class="flex items-center gap-4">
            <!-- Toggle Penalties -->
            <label class="flex items-center gap-2 cursor-pointer">
              <span class="text-sm text-dark-textMuted">Include Penalties</span>
              <div class="relative">
                <input type="checkbox" v-model="includeLegacyPenalties" class="sr-only">
                <div :class="[
                  'w-10 h-5 rounded-full transition-colors',
                  includeLegacyPenalties ? 'bg-red-500' : 'bg-dark-border'
                ]"></div>
                <div :class="[
                  'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform',
                  includeLegacyPenalties ? 'translate-x-5' : 'translate-x-0'
                ]"></div>
              </div>
            </label>
            <!-- Current members only -->
            <label class="flex items-center gap-2 cursor-pointer">
              <span class="text-sm text-dark-textMuted">Current members only</span>
              <div class="relative">
                <input type="checkbox" v-model="showCurrentMembersOnlyLegacy" class="sr-only">
                <div :class="[
                  'w-10 h-5 rounded-full transition-colors',
                  showCurrentMembersOnlyLegacy ? 'bg-yellow-500' : 'bg-dark-border'
                ]"></div>
                <div :class="[
                  'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform',
                  showCurrentMembersOnlyLegacy ? 'translate-x-5' : 'translate-x-0'
                ]"></div>
              </div>
            </label>
          </div>
          <div class="text-xs text-dark-textMuted">
            Playoff teams determined by platform data • {{ Object.keys(historicalData).length }} seasons analyzed
          </div>
        </div>

        <!-- Legacy Leaderboard -->
        <div class="card">
          <div class="card-header">
            <div class="flex items-center justify-between">
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-2xl">🏅</span>
                  <h2 class="card-title">Legacy Leaderboard</h2>
                </div>
              </div>
              <button 
                @click="downloadLegacyLeaderboard"
                :disabled="isDownloadingLegacy"
                class="px-4 py-2 border border-yellow-400 bg-transparent text-yellow-400 hover:bg-yellow-400 hover:text-gray-900 rounded-lg font-medium flex items-center gap-2 text-sm transition-colors disabled:opacity-50"
              >
                <svg v-if="!isDownloadingLegacy" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ isDownloadingLegacy ? 'Generating...' : 'Share' }}
              </button>
            </div>
          </div>
          <div class="card-body p-0">
            <div class="divide-y divide-dark-border">
              <div 
                v-for="(team, idx) in filteredLegacyScores" 
                :key="team.team_key"
                class="p-4 hover:bg-dark-border/20 transition-colors cursor-pointer"
                @click="openLegacyModal(team)"
              >
                <div class="flex items-center gap-4">
                  <!-- Rank Badge -->
                  <div 
                    class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0"
                    :class="idx === 0 ? 'bg-yellow-500 text-black' : idx === 1 ? 'bg-gray-300 text-black' : idx === 2 ? 'bg-amber-600 text-white' : 'bg-blue-500 text-white'"
                  >
                    {{ idx + 1 }}
                  </div>
                  
                  <!-- Team Info -->
                  <div class="w-12 h-12 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                    <img :src="team.logo_url || defaultAvatar" :alt="team.team_name" class="w-full h-full object-cover" @error="handleImageError">
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="font-bold text-dark-text truncate">{{ team.team_name }}</div>
                    <div class="text-xs text-dark-textMuted">{{ team.seasons }} season{{ team.seasons !== 1 ? 's' : '' }}</div>
                  </div>
                  
                  <!-- Achievement Badges -->
                  <div class="hidden md:flex items-center gap-2 flex-shrink-0">
                    <div v-if="team.championships > 0" class="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-400 text-xs">
                      <span>🏆</span> {{ team.championships }}
                    </div>
                    <div v-if="team.playoff_appearances > 0" class="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs">
                      <span>📈</span> {{ team.playoff_appearances }}
                    </div>
                    <div v-if="team.regular_season_titles > 0" class="flex items-center gap-1 px-2 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs">
                      <span>👑</span> {{ team.regular_season_titles }}
                    </div>
                  </div>
                  
                  <!-- Score -->
                  <div class="text-right flex-shrink-0">
                    <div class="text-2xl font-black" :class="getLegacyScoreColor(team.total_score)">{{ team.total_score.toLocaleString() }}</div>
                    <div class="text-xs text-dark-textMuted">Legacy Score</div>
                  </div>
                  
                  <!-- Expand Arrow -->
                  <div class="text-dark-textMuted">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
                
                <!-- Score Bar -->
                <div class="mt-3 ml-14">
                  <div class="h-2 bg-dark-border rounded-full overflow-hidden">
                    <div 
                      class="h-full rounded-full transition-all duration-500"
                      :class="idx === 0 ? 'bg-gradient-to-r from-yellow-500 to-amber-400' : idx === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-300' : idx === 2 ? 'bg-gradient-to-r from-amber-600 to-amber-500' : 'bg-gradient-to-r from-blue-500 to-blue-400'"
                      :style="{ width: getLegacyBarWidth(team.total_score) }"
                    ></div>
                  </div>
                </div>
              </div>
              
              <div v-if="filteredLegacyScores.length === 0" class="p-8 text-center text-dark-textMuted">
                No legacy data available. Load historical data to see legacy scores.
              </div>
            </div>
          </div>
        </div>

        <!-- Legend (below leaderboard) -->
        <div class="bg-dark-card/50 rounded-xl p-4 mt-4 border border-dark-border/50">
          <div class="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <div class="flex items-center gap-2">
              <span class="text-lg">🏆</span>
              <span class="text-sm text-dark-textMuted">Championships</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-lg">📈</span>
              <span class="text-sm text-dark-textMuted">Playoff Appearances</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-lg">👑</span>
              <span class="text-sm text-dark-textMuted">Regular Season Titles</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-lg">🎯</span>
              <span class="text-sm text-dark-textMuted">Category Leader Seasons</span>
            </div>
          </div>
        </div>
      </template>

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
              style="background: transparent; color: #facc15; border: 1px solid #facc15;"
              @mouseover="$event.currentTarget.style.background = '#facc15'; $event.currentTarget.style.color = '#111827'"
              @mouseout="$event.currentTarget.style.background = 'transparent'; $event.currentTarget.style.color = '#facc15'"
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
              :key="`recordmodal-${activeRecordModal}`"
              :alt="recordModalRankings[0].team_name"
              class="w-16 h-16 rounded-full ring-4 ring-yellow-500/50 object-cover"
              loading="lazy"
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
              <img :src="team.logo_url || defaultAvatar" :key="`modal-${team.team_key || team.team_name}`" :alt="team.team_name" class="w-8 h-8 rounded-full object-cover" loading="lazy" @error="handleImageError" />
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
              style="background: transparent; color: #facc15; border: 1px solid #facc15;"
              @mouseover="$event.currentTarget.style.background = '#facc15'; $event.currentTarget.style.color = '#111827'"
              @mouseout="$event.currentTarget.style.background = 'transparent'; $event.currentTarget.style.color = '#facc15'"
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
              :key="`awardmodal-${awardModalCategory}-${awardModalType}`"
              :alt="awardModalRankings[0].team_name"
              class="w-16 h-16 rounded-full ring-4 object-cover"
              :class="awardModalType === 'best' ? (awardModalCatType === 'hitting' ? 'ring-green-500/50' : 'ring-purple-500/50') : 'ring-red-500/50'"
              loading="lazy"
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
              <img :src="team.logo_url || defaultAvatar" :key="`modal-${team.team_key || team.team_name}`" :alt="team.team_name" class="w-8 h-8 rounded-full object-cover" loading="lazy" @error="handleImageError" />
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

  <!-- Legacy Team Modal -->
  <Teleport to="body">
    <div 
      v-if="showLegacyModal && selectedLegacyTeam" 
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @click.self="closeLegacyModal"
    >
      <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
      <div class="relative bg-dark-elevated rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-dark-border">
        <!-- Header -->
        <div class="sticky top-0 z-10 px-6 py-4 border-b border-dark-border bg-dark-elevated flex items-center justify-between">
          <div class="flex items-center gap-4">
            <img 
              :src="selectedLegacyTeam.logo_url || defaultAvatar" 
              :alt="selectedLegacyTeam.team_name"
              class="w-12 h-12 rounded-full object-cover"
              @error="handleImageError"
            />
            <div>
              <h3 class="text-xl font-bold text-dark-text">{{ selectedLegacyTeam.team_name }}</h3>
              <p class="text-sm text-dark-textMuted">{{ selectedLegacyTeam.seasons }} season{{ selectedLegacyTeam.seasons !== 1 ? 's' : '' }} played</p>
            </div>
          </div>
          <button @click="closeLegacyModal" class="p-2 rounded-lg hover:bg-dark-border/50 transition-colors">
            <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <!-- Total Score -->
        <div class="p-6 bg-gradient-to-r from-yellow-500/10 to-transparent border-b border-dark-border">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm text-dark-textMuted uppercase tracking-wider">Total Legacy Score</div>
              <div class="text-5xl font-black text-yellow-400">{{ selectedLegacyTeam.total_score.toLocaleString() }}</div>
            </div>
            <div class="text-right">
              <div class="text-sm text-dark-textMuted">Rank</div>
              <div class="text-3xl font-bold text-dark-text">#{{ legacyScores.findIndex(t => t.team_key === selectedLegacyTeam.team_key) + 1 }}</div>
            </div>
          </div>
        </div>
        
        <!-- Quick Stats -->
        <div class="grid grid-cols-4 gap-4 p-4 border-b border-dark-border bg-dark-bg/30">
          <div class="text-center">
            <div class="text-2xl">🏆</div>
            <div class="text-xl font-bold text-yellow-400">{{ selectedLegacyTeam.championships }}</div>
            <div class="text-xs text-dark-textMuted">Titles</div>
          </div>
          <div class="text-center">
            <div class="text-2xl">📈</div>
            <div class="text-xl font-bold text-blue-400">{{ selectedLegacyTeam.playoff_appearances }}</div>
            <div class="text-xs text-dark-textMuted">Playoffs</div>
          </div>
          <div class="text-center">
            <div class="text-2xl">✓</div>
            <div class="text-xl font-bold text-green-400">{{ selectedLegacyTeam.total_wins }}</div>
            <div class="text-xs text-dark-textMuted">Matchup Wins</div>
          </div>
          <div class="text-center">
            <div class="text-2xl">🎯</div>
            <div class="text-xl font-bold text-purple-400">{{ selectedLegacyTeam.category_leader_seasons }}</div>
            <div class="text-xs text-dark-textMuted">Cat Leaders</div>
          </div>
        </div>
        
        <!-- Breakdown -->
        <div class="p-6 space-y-6">
          <div v-for="section in selectedLegacyTeam.breakdown" :key="section.category">
            <div class="flex items-center justify-between mb-3">
              <div class="font-semibold text-dark-text">{{ section.category }}</div>
              <div class="text-sm font-bold" :class="section.subtotal >= 0 ? 'text-green-400' : 'text-red-400'">
                {{ section.subtotal >= 0 ? '+' : '' }}{{ section.subtotal }}
              </div>
            </div>
            <div class="space-y-2 pl-2">
              <div v-for="item in section.items" :key="item.label" class="flex items-center justify-between text-sm">
                <div class="text-dark-textMuted">
                  {{ item.label }}
                  <span v-if="item.count > 1" class="text-dark-textSecondary">(×{{ item.count }})</span>
                </div>
                <div :class="item.points >= 0 ? 'text-green-400' : 'text-red-400'">
                  {{ item.points >= 0 ? '+' : '' }}{{ item.points }}
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
import { espnService } from '@/services/espn'
import html2canvas from 'html2canvas'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const leagueStore = useLeagueStore()
const authStore = useAuthStore()

// Platform detection
const isEspn = computed(() => leagueStore.activePlatform === 'espn')

// Season detection
const currentSeason = computed(() => leagueStore.currentLeague?.season || new Date().getFullYear().toString())
const isSeasonComplete = computed(() => {
  if (leagueStore.currentLeague?.status === 'complete') return true
  const yahooLeague = Array.isArray(leagueStore.yahooLeague) ? leagueStore.yahooLeague[0] : leagueStore.yahooLeague
  return yahooLeague?.is_finished === 1
})

// Helper to parse ESPN league key format: espn_baseball_1880415994_2025
function parseEspnLeagueKey(leagueKey: string) {
  if (typeof leagueKey === 'string' && leagueKey.startsWith('espn_')) {
    const parts = leagueKey.split('_')
    if (parts.length >= 4) {
      return { leagueId: parts[2], season: parseInt(parts[3]) || new Date().getFullYear() }
    }
  }
  return { leagueId: leagueKey, season: new Date().getFullYear() }
}

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

interface LegacyScore {
  team_key: string
  team_name: string
  logo_url: string
  seasons: number
  total_score: number
  // Championship & Playoffs
  championships: number
  runner_ups: number
  third_places: number
  playoff_appearances: number
  regular_season_titles: number
  // Season Performance
  total_wins: number
  winning_seasons: number
  top_3_finishes: number
  category_leader_seasons: number
  top_3_category_seasons: number
  above_avg_cat_win_rate: number
  // Historic Moments
  best_weekly_cat_performances: number
  // Longevity
  playoff_streak_max: number
  winning_streak_max: number
  // Penalties (optional)
  last_place_finishes: number
  worst_weekly_performances: number
  category_cellar_seasons: number
  losing_seasons: number
  // Breakdown for display
  breakdown: {
    category: string
    items: { label: string; count: number; points: number }[]
    subtotal: number
  }[]
}

const isLoading = ref(false)
const loadingMessage = ref('Loading historical data...')
const loadingProgress = ref({
  currentStep: '',
  season: '',
  week: 0,
  maxWeek: 0,
  seasonsLoaded: 0,
  totalSeasons: 0
})
const isDownloading = ref(false)
const isDownloadingSeason = ref(false)
const isDownloadingH2H = ref(false)
const isDownloadingRecord = ref(false)
const isDownloadingAward = ref(false)
const isDownloadingSeasonCategory = ref(false)

// Tab state
const activeHistoryTab = ref('career')

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
const showCurrentMembersOnlyLegacy = ref(false)
const sortColumn = ref('matchup_wins')
const sortDirection = ref<'asc' | 'desc'>('desc')

// Legacy tab state
const showLegacyExplainer = ref(false)
const includeLegacyPenalties = ref(false)
const showLegacyModal = ref(false)
const selectedLegacyTeam = ref<LegacyScore | null>(null)
const isDownloadingLegacy = ref(false)

// Team Comparison state
const compareTeam1Key = ref('')
const compareTeam2Key = ref('')
const isDownloadingComparison = ref(false)

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

// ==================== LEGACY TAB COMPUTEDS ====================

// Default legacy point values for category leagues
const LEGACY_POINTS = {
  // Championships & Playoffs
  CHAMPIONSHIP: 100,
  RUNNER_UP: 50,
  THIRD_PLACE: 25,
  PLAYOFF_APPEARANCE: 20,
  REGULAR_SEASON_TITLE: 30,
  // Season Performance
  WIN: 3,
  WINNING_SEASON: 10,
  TOP_3_FINISH: 15,
  CATEGORY_LEADER: 20,
  TOP_3_CATEGORY: 10,
  ABOVE_AVG_CAT_WIN_RATE: 5,
  // Historic Moments
  BEST_WEEKLY_CAT: 10,
  // Longevity
  SEASON_PLAYED: 5,
  PLAYOFF_STREAK_3: 15,
  PLAYOFF_STREAK_5: 30,
  WINNING_STREAK_3: 10,
  // Penalties
  LAST_PLACE: -20,
  WORST_WEEKLY_CAT: -5,
  CATEGORY_CELLAR: -10,
  LOSING_SEASON: -5
}

// Computed: Legacy Scores for category leagues
const legacyScores = computed((): LegacyScore[] => {
  const teams: Record<string, LegacyScore> = {}
  const seasons = Object.keys(historicalData.value).sort((a, b) => parseInt(a) - parseInt(b)) // Ascending for streak tracking
  
  if (seasons.length === 0) return []
  
  // Track most recent season data for each team (for name/logo)
  const mostRecentTeamData: Record<string, { name: string; logo_url: string; season: string }> = {}
  
  // Pre-populate with most recent data (process seasons in descending order for this)
  const descendingSeasons = [...seasons].reverse()
  for (const season of descendingSeasons) {
    const seasonData = historicalData.value[season]
    const standings = seasonData.standings || []
    for (const team of standings) {
      if (!mostRecentTeamData[team.team_key]) {
        mostRecentTeamData[team.team_key] = {
          name: team.name || 'Unknown',
          logo_url: team.logo_url || allTeams.value[team.team_key]?.logo_url || '',
          season: season
        }
      }
    }
  }
  
  // First pass: Collect all team data and calculate season-level metrics
  const seasonMetrics: Record<string, {
    standings: any[]
    matchups: any[]
    avgCatWinRate: number
    bestWeeklyCat: { value: number; team_key: string }
    worstWeeklyCat: { value: number; team_key: string }
    categoryLeader: string
    top3Category: string[]
    numTeams: number
    playoffTeamCount: number
  }> = {}
  
  for (const season of seasons) {
    const seasonData = historicalData.value[season]
    const standings = seasonData.standings || []
    const matchups = seasonData.matchups || []
    
    if (standings.length === 0) continue
    
    // Calculate season metrics
    let totalCatWins = 0
    let totalMatchups = 0
    let bestWeeklyCat = { value: 0, team_key: '' }
    let worstWeeklyCat = { value: Infinity, team_key: '' }
    
    // Track category wins per matchup (weekly)
    for (const matchup of matchups) {
      const statWinners = matchup.stat_winners || []
      if (matchup.teams?.length >= 2) {
        for (const team of matchup.teams) {
          const teamCatWins = statWinners.filter((w: any) => w.winner_team_key === team.team_key && !w.is_tied).length || 0
          if (teamCatWins > bestWeeklyCat.value) {
            bestWeeklyCat = { value: teamCatWins, team_key: team.team_key }
          }
          if (teamCatWins < worstWeeklyCat.value && statWinners.length > 0) {
            worstWeeklyCat = { value: teamCatWins, team_key: team.team_key }
          }
        }
      }
    }
    
    // Calculate total category wins for each team for the season
    const teamSeasonCatWins: Record<string, number> = {}
    for (const matchup of matchups) {
      const statWinners = matchup.stat_winners || []
      for (const team of matchup.teams || []) {
        const catWins = statWinners.filter((w: any) => w.winner_team_key === team.team_key && !w.is_tied).length || 0
        teamSeasonCatWins[team.team_key] = (teamSeasonCatWins[team.team_key] || 0) + catWins
        totalCatWins += catWins
        totalMatchups++
      }
    }
    
    const avgCatWinRate = totalMatchups > 0 ? totalCatWins / totalMatchups : 0
    
    // Find category leaders
    const sortedByCats = Object.entries(teamSeasonCatWins).sort((a, b) => b[1] - a[1])
    const categoryLeader = sortedByCats[0]?.[0] || ''
    const top3Category = sortedByCats.slice(0, 3).map(t => t[0])
    
    // Determine playoff team count
    const playoffTeamCount = Math.min(Math.floor(standings.length / 2), 6)
    
    seasonMetrics[season] = {
      standings,
      matchups,
      avgCatWinRate,
      bestWeeklyCat,
      worstWeeklyCat: worstWeeklyCat.value === Infinity ? { value: 0, team_key: '' } : worstWeeklyCat,
      categoryLeader,
      top3Category,
      numTeams: standings.length,
      playoffTeamCount
    }
  }
  
  // Track playoff and winning streaks per team
  const teamStreaks: Record<string, { playoffStreak: number; winningStreak: number; maxPlayoffStreak: number; maxWinningStreak: number }> = {}
  
  // Second pass: Calculate legacy scores
  for (const season of seasons) {
    const metrics = seasonMetrics[season]
    if (!metrics) continue
    
    const { standings, avgCatWinRate, bestWeeklyCat, worstWeeklyCat, categoryLeader, top3Category, numTeams, playoffTeamCount } = metrics
    
    // Sort standings by rank for playoff determination
    const sortedStandings = [...standings].sort((a: any, b: any) => (a.rank || 999) - (b.rank || 999))
    
    for (const team of standings) {
      const teamKey = team.team_key
      
      // Initialize team if needed - use most recent name/logo
      if (!teams[teamKey]) {
        const recentData = mostRecentTeamData[teamKey]
        teams[teamKey] = {
          team_key: teamKey,
          team_name: recentData?.name || team.name || 'Unknown',
          logo_url: recentData?.logo_url || team.logo_url || allTeams.value[teamKey]?.logo_url || '',
          seasons: 0,
          total_score: 0,
          championships: 0,
          runner_ups: 0,
          third_places: 0,
          playoff_appearances: 0,
          regular_season_titles: 0,
          total_wins: 0,
          winning_seasons: 0,
          top_3_finishes: 0,
          category_leader_seasons: 0,
          top_3_category_seasons: 0,
          above_avg_cat_win_rate: 0,
          best_weekly_cat_performances: 0,
          playoff_streak_max: 0,
          winning_streak_max: 0,
          last_place_finishes: 0,
          worst_weekly_performances: 0,
          category_cellar_seasons: 0,
          losing_seasons: 0,
          breakdown: []
        }
      }
      
      // Initialize streak tracking
      if (!teamStreaks[teamKey]) {
        teamStreaks[teamKey] = { playoffStreak: 0, winningStreak: 0, maxPlayoffStreak: 0, maxWinningStreak: 0 }
      }
      
      const t = teams[teamKey]
      const streak = teamStreaks[teamKey]
      
      t.seasons++
      
      const wins = team.wins || 0
      const losses = team.losses || 0
      const rank = team.rank || 999
      
      // Calculate team's category win rate for this season
      const teamSeasonCatWins = metrics.matchups.reduce((total, matchup) => {
        const statWinners = matchup.stat_winners || []
        return total + statWinners.filter((w: any) => w.winner_team_key === teamKey && !w.is_tied).length
      }, 0)
      const teamMatchups = metrics.matchups.filter(m => m.teams?.some((t: any) => t.team_key === teamKey)).length
      const teamCatWinRate = teamMatchups > 0 ? teamSeasonCatWins / teamMatchups : 0
      
      // Determine if team made playoffs
      const madePlayoffs = team.playoff_seed > 0 
        ? team.playoff_seed <= playoffTeamCount 
        : rank <= playoffTeamCount
      
      // Championships & Playoffs
      if (team.is_champion) t.championships++
      if (rank === 2 && !team.is_champion) t.runner_ups++
      if (rank === 3) t.third_places++
      if (madePlayoffs) t.playoff_appearances++
      
      // Check for regular season title (most wins)
      const sortedByWins = [...standings].sort((a: any, b: any) => {
        if ((b.wins || 0) !== (a.wins || 0)) return (b.wins || 0) - (a.wins || 0)
        return 0
      })
      if (sortedByWins[0]?.team_key === teamKey) t.regular_season_titles++
      
      // Season Performance
      t.total_wins += wins
      if (wins > losses) t.winning_seasons++
      if (rank <= 3) t.top_3_finishes++
      if (teamKey === categoryLeader) t.category_leader_seasons++
      if (top3Category.includes(teamKey)) t.top_3_category_seasons++
      if (teamCatWinRate > avgCatWinRate) t.above_avg_cat_win_rate++
      
      // Historic Moments
      if (teamKey === bestWeeklyCat.team_key) t.best_weekly_cat_performances++
      
      // Penalties
      if (rank === numTeams) t.last_place_finishes++
      if (teamKey === worstWeeklyCat.team_key) t.worst_weekly_performances++
      const sortedByCatsAsc = Object.entries(metrics.matchups.reduce((acc: Record<string, number>, matchup) => {
        const statWinners = matchup.stat_winners || []
        for (const team of matchup.teams || []) {
          acc[team.team_key] = (acc[team.team_key] || 0) + statWinners.filter((w: any) => w.winner_team_key === team.team_key && !w.is_tied).length
        }
        return acc
      }, {})).sort((a, b) => a[1] - b[1])
      if (sortedByCatsAsc[0]?.[0] === teamKey) t.category_cellar_seasons++
      if (wins < losses) t.losing_seasons++
      
      // Streak tracking
      if (madePlayoffs) {
        streak.playoffStreak++
        streak.maxPlayoffStreak = Math.max(streak.maxPlayoffStreak, streak.playoffStreak)
      } else {
        streak.playoffStreak = 0
      }
      
      if (wins > losses) {
        streak.winningStreak++
        streak.maxWinningStreak = Math.max(streak.maxWinningStreak, streak.winningStreak)
      } else {
        streak.winningStreak = 0
      }
    }
  }
  
  // Update max streaks
  for (const [teamKey, streak] of Object.entries(teamStreaks)) {
    if (teams[teamKey]) {
      teams[teamKey].playoff_streak_max = streak.maxPlayoffStreak
      teams[teamKey].winning_streak_max = streak.maxWinningStreak
    }
  }
  
  // Calculate total scores and breakdowns
  const includePenalties = includeLegacyPenalties.value
  
  for (const t of Object.values(teams)) {
    const breakdown: LegacyScore['breakdown'] = []
    let total = 0
    
    // Championships & Playoffs
    const champItems = [
      { label: 'Championships', count: t.championships, points: t.championships * LEGACY_POINTS.CHAMPIONSHIP },
      { label: 'Runner-ups', count: t.runner_ups, points: t.runner_ups * LEGACY_POINTS.RUNNER_UP },
      { label: '3rd Place', count: t.third_places, points: t.third_places * LEGACY_POINTS.THIRD_PLACE },
      { label: 'Playoff Appearances', count: t.playoff_appearances, points: t.playoff_appearances * LEGACY_POINTS.PLAYOFF_APPEARANCE },
      { label: 'Regular Season Titles', count: t.regular_season_titles, points: t.regular_season_titles * LEGACY_POINTS.REGULAR_SEASON_TITLE }
    ].filter(i => i.count > 0)
    
    const champSubtotal = champItems.reduce((sum, i) => sum + i.points, 0)
    if (champItems.length > 0) {
      breakdown.push({ category: '🏆 Championships & Playoffs', items: champItems, subtotal: champSubtotal })
      total += champSubtotal
    }
    
    // Season Performance
    const perfItems = [
      { label: 'Total Matchup Wins', count: t.total_wins, points: t.total_wins * LEGACY_POINTS.WIN },
      { label: 'Winning Seasons', count: t.winning_seasons, points: t.winning_seasons * LEGACY_POINTS.WINNING_SEASON },
      { label: 'Top 3 Finishes', count: t.top_3_finishes, points: t.top_3_finishes * LEGACY_POINTS.TOP_3_FINISH }
    ].filter(i => i.count > 0)
    
    const perfSubtotal = perfItems.reduce((sum, i) => sum + i.points, 0)
    if (perfItems.length > 0) {
      breakdown.push({ category: '📈 Season Performance', items: perfItems, subtotal: perfSubtotal })
      total += perfSubtotal
    }
    
    // Category Achievements
    const catItems = [
      { label: 'Category Leader Seasons', count: t.category_leader_seasons, points: t.category_leader_seasons * LEGACY_POINTS.CATEGORY_LEADER },
      { label: 'Top 3 Category Seasons', count: t.top_3_category_seasons, points: t.top_3_category_seasons * LEGACY_POINTS.TOP_3_CATEGORY },
      { label: 'Above Avg Cat Win Rate', count: t.above_avg_cat_win_rate, points: t.above_avg_cat_win_rate * LEGACY_POINTS.ABOVE_AVG_CAT_WIN_RATE },
      { label: 'Best Weekly Cat Performances', count: t.best_weekly_cat_performances, points: t.best_weekly_cat_performances * LEGACY_POINTS.BEST_WEEKLY_CAT }
    ].filter(i => i.count > 0)
    
    const catSubtotal = catItems.reduce((sum, i) => sum + i.points, 0)
    if (catItems.length > 0) {
      breakdown.push({ category: '🎯 Category Achievements', items: catItems, subtotal: catSubtotal })
      total += catSubtotal
    }
    
    // Longevity
    const longItems = [
      { label: 'Seasons Played', count: t.seasons, points: t.seasons * LEGACY_POINTS.SEASON_PLAYED }
    ]
    if (t.playoff_streak_max >= 5) {
      longItems.push({ label: '5+ Year Playoff Streak', count: 1, points: LEGACY_POINTS.PLAYOFF_STREAK_5 })
    } else if (t.playoff_streak_max >= 3) {
      longItems.push({ label: '3+ Year Playoff Streak', count: 1, points: LEGACY_POINTS.PLAYOFF_STREAK_3 })
    }
    if (t.winning_streak_max >= 3) {
      longItems.push({ label: '3+ Year Winning Streak', count: 1, points: LEGACY_POINTS.WINNING_STREAK_3 })
    }
    
    const longSubtotal = longItems.reduce((sum, i) => sum + i.points, 0)
    breakdown.push({ category: '🎖️ Longevity', items: longItems, subtotal: longSubtotal })
    total += longSubtotal
    
    // Penalties (if enabled)
    if (includePenalties) {
      const penItems = [
        { label: 'Last Place Finishes', count: t.last_place_finishes, points: t.last_place_finishes * LEGACY_POINTS.LAST_PLACE },
        { label: 'Worst Weekly Performances', count: t.worst_weekly_performances, points: t.worst_weekly_performances * LEGACY_POINTS.WORST_WEEKLY_CAT },
        { label: 'Category Cellar Seasons', count: t.category_cellar_seasons, points: t.category_cellar_seasons * LEGACY_POINTS.CATEGORY_CELLAR },
        { label: 'Losing Seasons', count: t.losing_seasons, points: t.losing_seasons * LEGACY_POINTS.LOSING_SEASON }
      ].filter(i => i.count > 0)
      
      const penSubtotal = penItems.reduce((sum, i) => sum + i.points, 0)
      if (penItems.length > 0) {
        breakdown.push({ category: '💀 Penalties', items: penItems, subtotal: penSubtotal })
        total += penSubtotal
      }
    }
    
    t.breakdown = breakdown
    t.total_score = total
  }
  
  // Sort by total score descending
  return Object.values(teams).sort((a, b) => b.total_score - a.total_score)
})

// Computed: Filtered legacy scores
const filteredLegacyScores = computed(() => {
  if (!showCurrentMembersOnlyLegacy.value) return legacyScores.value
  return legacyScores.value.filter(team => currentMembers.value.has(team.team_key))
})

// Legacy helper functions
function getLegacyScoreColor(score: number): string {
  const max = legacyScores.value[0]?.total_score || 1
  const pct = score / max
  if (pct >= 0.8) return 'text-yellow-400'
  if (pct >= 0.6) return 'text-green-400'
  if (pct >= 0.4) return 'text-blue-400'
  return 'text-dark-text'
}

function getLegacyBarWidth(score: number): string {
  const max = legacyScores.value[0]?.total_score || 1
  return `${Math.max(5, (score / max) * 100)}%`
}

function openLegacyModal(team: LegacyScore) {
  selectedLegacyTeam.value = team
  showLegacyModal.value = true
}

function closeLegacyModal() {
  showLegacyModal.value = false
  selectedLegacyTeam.value = null
}

async function downloadLegacyLeaderboard() {
  if (filteredLegacyScores.value.length === 0) return
  isDownloadingLegacy.value = true
  
  try {
    const leagueName = leagueDisplayName.value
    
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
    const teams = filteredLegacyScores.value.slice(0, 12)
    const maxScore = teams[0]?.total_score || 1
    
    const container = document.createElement('div')
    container.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 700px; font-family: system-ui, -apple-system, sans-serif;'
    
    const teamRows = teams.map((team, idx) => {
      const barWidth = Math.max(5, (team.total_score / maxScore) * 100)
      const rankBg = idx === 0 ? 'background: #facc15; color: #000;' : idx === 1 ? 'background: #d1d5db; color: #000;' : idx === 2 ? 'background: #d97706; color: #fff;' : 'background: #3b82f6; color: #fff;'
      const barGradient = idx === 0 ? 'linear-gradient(90deg, #facc15, #fbbf24)' : idx === 1 ? 'linear-gradient(90deg, #9ca3af, #d1d5db)' : idx === 2 ? 'linear-gradient(90deg, #d97706, #f59e0b)' : 'linear-gradient(90deg, #3b82f6, #60a5fa)'
      
      return `
        <div style="display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
          <div style="width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; ${rankBg}">${idx + 1}</div>
          <div style="width: 40px; height: 40px; border-radius: 50%; background: #1f2937; overflow: hidden;">
            <img src="${team.logo_url || defaultAvatar}" style="width: 100%; height: 100%; object-fit: cover;" />
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: bold; color: #fff; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${team.team_name}</div>
            <div style="height: 6px; background: #1f2937; border-radius: 999px; margin-top: 4px; overflow: hidden;">
              <div style="height: 100%; width: ${barWidth}%; background: ${barGradient}; border-radius: 999px;"></div>
            </div>
          </div>
          <div style="text-align: right; flex-shrink: 0;">
            <div style="font-size: 18px; font-weight: 900; color: ${idx < 3 ? '#facc15' : '#60a5fa'};">${team.total_score.toLocaleString()}</div>
            <div style="font-size: 10px; color: #6b7280;">Legacy Score</div>
          </div>
        </div>
      `
    }).join('')
    
    container.innerHTML = `
      <div style="background: linear-gradient(160deg, #0f1219 0%, #0a0c14 50%, #0d1117 100%); border-radius: 16px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); position: relative; overflow: hidden;">
        <div style="background: #facc15; padding: 10px 24px; text-align: center;">
          <span style="font-size: 16px; font-weight: 700; color: #0a0c14; text-transform: uppercase; letter-spacing: 3px;">Ultimate Fantasy Dashboard</span>
        </div>
        <div style="display: flex; padding: 16px 24px; border-bottom: 1px solid rgba(250, 204, 21, 0.2);">
          ${logoBase64 ? `<img src="${logoBase64}" style="height: 70px; width: auto; flex-shrink: 0; margin-right: 24px;" />` : ''}
          <div style="flex: 1;">
            <div style="font-size: 36px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 2px 8px rgba(250, 204, 21, 0.4);">Legacy Leaderboard</div>
            <div style="font-size: 18px; margin-top: 6px; font-weight: 600;">
              <span style="color: #e5e7eb;">${leagueName}</span>
              <span style="color: #6b7280; margin: 0 8px;">•</span>
              <span style="color: #facc15; font-weight: 700;">All-Time Rankings</span>
            </div>
          </div>
        </div>
        <div style="padding: 8px 24px;">
          ${teamRows}
        </div>
        <div style="padding: 16px 24px; text-align: center;">
          <span style="font-size: 20px; font-weight: bold; color: #facc15;">ultimatefantasydashboard.com</span>
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
    link.download = 'category-legacy-leaderboard.png'
    link.href = finalCanvas.toDataURL('image/png')
    link.click()
  } finally {
    isDownloadingLegacy.value = false
  }
}

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

// ==================== TEAM COMPARISON COMPUTED ====================

// Available teams for comparison dropdowns
const compareAvailableTeams1 = computed(() => {
  return h2hTeams.value.filter(t => t.team_key !== compareTeam2Key.value)
})

const compareAvailableTeams2 = computed(() => {
  return h2hTeams.value.filter(t => t.team_key !== compareTeam1Key.value)
})

// Get full team data for selected teams
const compareTeam1Data = computed(() => {
  if (!compareTeam1Key.value) return null
  return h2hTeams.value.find(t => t.team_key === compareTeam1Key.value) || null
})

const compareTeam2Data = computed(() => {
  if (!compareTeam2Key.value) return null
  return h2hTeams.value.find(t => t.team_key === compareTeam2Key.value) || null
})

// Get all H2H matchups between the two selected teams
const compareRivalryHistory = computed(() => {
  if (!compareTeam1Key.value || !compareTeam2Key.value) return []
  
  const matchups: Array<{
    season: string
    week: number
    team1Wins: number
    team1Losses: number
    team2Wins: number
    team2Losses: number
    tie: boolean
    winner: string
    isPlayoff: boolean
  }> = []
  
  // Iterate through all historical data
  for (const [season, seasonData] of Object.entries(historicalData.value)) {
    const seasonMatchups = seasonData.matchups || []
    for (const matchup of seasonMatchups) {
      const teams = matchup.teams || []
      if (teams.length < 2) continue
      
      // Check if this matchup is between our two teams
      const team1 = teams.find((t: any) => t.team_key === compareTeam1Key.value)
      const team2 = teams.find((t: any) => t.team_key === compareTeam2Key.value)
      
      if (team1 && team2) {
        // Calculate category wins from stat_winners array (like other parts of the code do)
        const statWinners = matchup.stat_winners || []
        const team1CatWins = statWinners.filter((w: any) => w.winner_team_key === compareTeam1Key.value && !w.is_tied).length || 0
        const team2CatWins = statWinners.filter((w: any) => w.winner_team_key === compareTeam2Key.value && !w.is_tied).length || 0
        const totalCats = statWinners.length || (team1CatWins + team2CatWins) || 1
        const team1CatLosses = totalCats - team1CatWins - statWinners.filter((w: any) => w.is_tied).length
        const team2CatLosses = totalCats - team2CatWins - statWinners.filter((w: any) => w.is_tied).length
        
        // Determine matchup winner based on category wins
        let winner = 'Tie'
        let tie = false
        if (team1CatWins > team2CatWins) {
          winner = compareTeam1Data.value?.team_name || 'Team 1'
        } else if (team2CatWins > team1CatWins) {
          winner = compareTeam2Data.value?.team_name || 'Team 2'
        } else {
          tie = true
        }
        
        matchups.push({
          season,
          week: matchup.week || matchup.matchupPeriodId || 1,
          team1Wins: team1CatWins,
          team1Losses: team2CatWins,
          team2Wins: team2CatWins,
          team2Losses: team1CatWins,
          tie,
          winner,
          isPlayoff: (matchup.week || matchup.matchupPeriodId || 0) > 20
        })
      }
    }
  }
  
  // Sort by season desc, then week desc
  return matchups.sort((a, b) => {
    if (a.season !== b.season) return parseInt(b.season) - parseInt(a.season)
    return b.week - a.week
  })
})

// Calculate comparison data between the two teams
const compareData = computed(() => {
  if (!compareTeam1Key.value || !compareTeam2Key.value) return null
  
  const team1Career = careerStats.value.find(t => t.team_key === compareTeam1Key.value)
  const team2Career = careerStats.value.find(t => t.team_key === compareTeam2Key.value)
  
  if (!team1Career || !team2Career) return null
  
  // Get H2H record from h2hRecords
  const h2hRecord = h2hRecords.value[compareTeam1Key.value]?.[compareTeam2Key.value]
  const team1Wins = h2hRecord?.wins || 0
  const team2Wins = h2hRecord?.losses || 0
  const ties = h2hRecord?.ties || 0
  const team1CatWins = h2hRecord?.catWins || 0
  const team2CatWins = h2hRecord?.catLosses || 0
  
  return {
    team1: {
      championships: team1Career.championships,
      seasons: team1Career.seasons,
      matchupWins: team1Career.matchup_wins,
      matchupLosses: team1Career.matchup_losses,
      matchupTies: team1Career.matchup_ties,
      winPct: team1Career.matchup_win_pct,
      totalCatWins: team1Career.total_cat_wins,
      avgCatWins: team1Career.avg_cat_wins,
      catDiff: team1Career.cat_diff
    },
    team2: {
      championships: team2Career.championships,
      seasons: team2Career.seasons,
      matchupWins: team2Career.matchup_wins,
      matchupLosses: team2Career.matchup_losses,
      matchupTies: team2Career.matchup_ties,
      winPct: team2Career.matchup_win_pct,
      totalCatWins: team2Career.total_cat_wins,
      avgCatWins: team2Career.avg_cat_wins,
      catDiff: team2Career.cat_diff
    },
    h2h: {
      team1Wins,
      team2Wins,
      ties,
      totalGames: team1Wins + team2Wins + ties,
      team1CatWins,
      team2CatWins,
      catDiff: team1CatWins - team2CatWins
    }
  }
})

// Rivalry highlights
const compareRivalryHighlights = computed(() => {
  if (compareRivalryHistory.value.length === 0) return null
  
  let biggestBlowout = compareRivalryHistory.value[0]
  let closestGame = compareRivalryHistory.value[0]
  let highestCats = compareRivalryHistory.value[0]
  
  for (const matchup of compareRivalryHistory.value) {
    const margin = Math.abs(matchup.team1Wins - matchup.team2Wins)
    const biggestMargin = Math.abs(biggestBlowout.team1Wins - biggestBlowout.team2Wins)
    const closestMargin = Math.abs(closestGame.team1Wins - closestGame.team2Wins)
    const totalCats = matchup.team1Wins + matchup.team2Wins
    const highestTotalCats = highestCats.team1Wins + highestCats.team2Wins
    
    if (margin > biggestMargin) {
      biggestBlowout = matchup
    }
    if (margin < closestMargin) {
      closestGame = matchup
    }
    if (totalCats > highestTotalCats) {
      highestCats = matchup
    }
  }
  
  return {
    biggestBlowout: {
      winner: biggestBlowout.winner,
      margin: Math.abs(biggestBlowout.team1Wins - biggestBlowout.team2Wins),
      season: biggestBlowout.season,
      week: biggestBlowout.week,
      score: `${biggestBlowout.team1Wins}-${biggestBlowout.team1Losses} vs ${biggestBlowout.team2Wins}-${biggestBlowout.team2Losses}`
    },
    closestGame: {
      winner: closestGame.winner,
      margin: Math.abs(closestGame.team1Wins - closestGame.team2Wins),
      season: closestGame.season,
      week: closestGame.week,
      score: `${closestGame.team1Wins}-${closestGame.team1Losses} vs ${closestGame.team2Wins}-${closestGame.team2Losses}`
    },
    highestCats: {
      totalCats: highestCats.team1Wins + highestCats.team2Wins,
      season: highestCats.season,
      week: highestCats.week,
      score: `${highestCats.team1Wins}-${highestCats.team1Losses} vs ${highestCats.team2Wins}-${highestCats.team2Losses}`
    }
  }
})

// ==================== END TEAM COMPARISON ====================

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
  const yahooMapping: Record<string, string> = {
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
  
  // ESPN baseball stat IDs
  const espnMapping: Record<string, string> = {
    // Hitting
    '0': 'AB', '1': 'H', '2': 'R', '3': 'HR', '4': 'RBI', '5': 'SB',
    '6': 'BB', '7': 'K', '8': 'AVG', '9': 'OBP', '10': 'SLG', '11': 'OPS',
    '12': 'CS', '13': 'NSB', '14': 'GDP', '15': 'HBP', '16': 'SAC',
    '40': 'TB', '41': '2B', '42': '3B', '43': '1B', '45': 'E',
    // Pitching
    '17': 'IP', '18': 'ERA', '19': 'WHIP', '20': 'Ks', '21': 'BBs',
    '22': 'HA', '23': 'HD', '24': 'BS', '32': 'W', '33': 'L',
    '34': 'SV', '35': 'QS', '36': 'SHO', '37': 'CG', '99': 'GP'
  }
  
  // Try Yahoo mapping first, then ESPN
  return yahooMapping[statId] || espnMapping[statId] || null
}

// Check if a stat ID is valid/known
function isValidCategory(statId: string): boolean {
  return getCategoryDisplayName(statId) !== null
}

function isHittingCategory(catName: string): boolean {
  // Hitting categories - includes both Yahoo and ESPN naming conventions
  const hittingCats = ['HR', 'RBI', 'R', 'SB', 'AVG', 'OPS', 'OBP', 'SLG', 'H', 'TB', 'BB', 'XBH', 'AB', 'PA', '2B', '3B', 'CS', 'SF', 'GDP', 'NSB', '1B', 'HBP', 'SAC', 'E', 'K']
  // Note: 'K' (strikeouts batting) is hitting, 'Ks' (strikeouts pitching) is pitching
  return hittingCats.includes(catName)
}

function getCategoryColorClass(cat: string): string {
  // Hitting categories - includes both Yahoo and ESPN naming conventions
  const hittingCats = ['HR', 'RBI', 'R', 'SB', 'AVG', 'OPS', 'OBP', 'SLG', 'H', 'TB', 'BB', 'AB', '2B', '3B', '1B', 'K', 'CS', 'NSB', 'GDP', 'HBP', 'SAC', 'E']
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
    
    // Pre-load all team images
    const imageMap = new Map<string, string>()
    for (const stat of sortedStats) {
      try {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        const loadPromise = new Promise<string>((resolve) => {
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas')
              canvas.width = 64
              canvas.height = 64
              const ctx = canvas.getContext('2d')
              if (ctx) {
                ctx.beginPath()
                ctx.arc(32, 32, 32, 0, Math.PI * 2)
                ctx.closePath()
                ctx.clip()
                ctx.drawImage(img, 0, 0, 64, 64)
              }
              resolve(canvas.toDataURL('image/png'))
            } catch {
              resolve(createPlaceholder(stat.team_name))
            }
          }
          img.onerror = () => resolve(createPlaceholder(stat.team_name))
          setTimeout(() => resolve(createPlaceholder(stat.team_name)), 3000)
        })
        img.src = stat.logo_url || ''
        imageMap.set(stat.team_key, await loadPromise)
      } catch {
        imageMap.set(stat.team_key, createPlaceholder(stat.team_name))
      }
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
        
        <!-- Top Yellow Bar -->
        <div style="background: #facc15; padding: 10px 24px; text-align: center;">
          <span style="font-size: 16px; font-weight: 700; color: #0a0c14; text-transform: uppercase; letter-spacing: 3px;">Ultimate Fantasy Dashboard</span>
        </div>
        
        <!-- Header -->
        <div style="display: flex; align-items: center; padding: 12px 24px; border-bottom: 1px solid rgba(250, 204, 21, 0.2);">
          ${logoBase64 ? `<img src="${logoBase64}" style="height: 50px; width: auto; flex-shrink: 0; margin-right: 16px; margin-top: 6px;" />` : ''}
          <div style="flex: 1;">
            <div style="font-size: 24px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 1px; line-height: 1.1;">Career Statistics</div>
            <div style="font-size: 14px; margin-top: 3px; font-weight: 600;">
              <span style="color: #e5e7eb;">${leagueName}</span>
              <span style="color: #6b7280; margin: 0 6px;">•</span>
              <span style="color: #facc15; font-weight: 700;">Top 12 by ${columnLabels[sortColumn.value] || sortColumn.value}</span>
            </div>
          </div>
        </div>
        
        <!-- Table Content -->
        <div style="padding: 16px 24px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="border-bottom: 2px solid rgba(250, 204, 21, 0.3);">
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
        <div style="padding: 16px 24px; text-align: center; border-top: 1px solid rgba(250, 204, 21, 0.2);">
          <span style="font-size: 20px; font-weight: bold; color: #facc15;">ultimatefantasydashboard.com</span>
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
        
        <!-- Top Yellow Bar -->
        <div style="background: #facc15; padding: 10px 24px; text-align: center;">
          <span style="font-size: 16px; font-weight: 700; color: #0a0c14; text-transform: uppercase; letter-spacing: 3px;">Ultimate Fantasy Dashboard</span>
        </div>
        
        <!-- Header -->
        <div style="display: flex; padding: 16px 24px; border-bottom: 1px solid rgba(250, 204, 21, 0.2);">
          ${logoBase64 ? `<img src="${logoBase64}" style="height: 70px; width: auto; flex-shrink: 0; margin-right: 24px;" />` : ''}
          <div style="flex: 1;">
            <div style="font-size: 36px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 2px 8px rgba(250, 204, 21, 0.4);">Season History</div>
            <div style="font-size: 18px; margin-top: 6px; font-weight: 600;">
              <span style="color: #e5e7eb;">${leagueName}</span>
              <span style="color: #6b7280; margin: 0 8px;">•</span>
              <span style="color: #facc15; font-weight: 700;">Year-by-Year</span>
            </div>
          </div>
        </div>
        
        <!-- Table Content -->
        <div style="padding: 16px 24px;">
          <img src="${tableDataUrl}" style="width: 100%; height: auto; border-radius: 8px;" />
        </div>
        
        <!-- Footer -->
        <div style="padding: 16px 24px; text-align: center;">
          <span style="font-size: 20px; font-weight: bold; color: #facc15;">ultimatefantasydashboard.com</span>
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
      scale: 2,
      useCORS: true,
      allowTaint: true
    })
    const tableDataUrl = tableCanvas.toDataURL('image/png')
    
    // Create wrapper with header/footer
    const container = document.createElement('div')
    container.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 700px; font-family: system-ui, -apple-system, sans-serif;'
    
    container.innerHTML = `
      <div style="background: linear-gradient(160deg, #0f1219 0%, #0a0c14 50%, #0d1117 100%); border-radius: 16px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); position: relative; overflow: hidden;">
        
        <!-- Top Yellow Bar -->
        <div style="background: #facc15; padding: 10px 24px; text-align: center;">
          <span style="font-size: 16px; font-weight: 700; color: #0a0c14; text-transform: uppercase; letter-spacing: 3px;">Ultimate Fantasy Dashboard</span>
        </div>
        
        <!-- Header -->
        <div style="display: flex; padding: 16px 24px; border-bottom: 1px solid rgba(250, 204, 21, 0.2);">
          ${logoBase64 ? `<img src="${logoBase64}" style="height: 70px; width: auto; flex-shrink: 0; margin-right: 24px;" />` : ''}
          <div style="flex: 1;">
            <div style="font-size: 36px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 2px 8px rgba(250, 204, 21, 0.4);">Head-to-Head</div>
            <div style="font-size: 18px; margin-top: 6px; font-weight: 600;">
              <span style="color: #e5e7eb;">${leagueName}</span>
              <span style="color: #6b7280; margin: 0 8px;">•</span>
              <span style="color: #facc15; font-weight: 700;">All-Time Records</span>
            </div>
          </div>
        </div>
        
        <!-- Table Content -->
        <div style="padding: 16px 24px;">
          <img src="${tableDataUrl}" style="width: 100%; height: auto; border-radius: 8px;" />
        </div>
        
        <!-- Footer -->
        <div style="padding: 16px 24px; text-align: center;">
          <span style="font-size: 20px; font-weight: bold; color: #facc15;">ultimatefantasydashboard.com</span>
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

// Download Team Comparison Image
async function downloadComparison() {
  if (!compareTeam1Data.value || !compareTeam2Data.value || !compareData.value) return
  isDownloadingComparison.value = true
  
  try {
    const html2canvas = (await import('html2canvas')).default
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
    
    const createPlaceholder = (name: string, color: string): string => {
      const canvas = document.createElement('canvas')
      canvas.width = 64
      canvas.height = 64
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = color
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
    
    // Load team logos
    const loadTeamLogo = async (url: string | undefined, name: string, color: string): Promise<string> => {
      if (!url) return createPlaceholder(name, color)
      try {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        return await new Promise<string>((resolve) => {
          img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = 64
            canvas.height = 64
            const ctx = canvas.getContext('2d')
            if (ctx) {
              ctx.beginPath()
              ctx.arc(32, 32, 32, 0, Math.PI * 2)
              ctx.closePath()
              ctx.clip()
              ctx.drawImage(img, 0, 0, 64, 64)
            }
            resolve(canvas.toDataURL('image/png'))
          }
          img.onerror = () => resolve(createPlaceholder(name, color))
          setTimeout(() => resolve(createPlaceholder(name, color)), 3000)
          img.src = url
        })
      } catch { return createPlaceholder(name, color) }
    }
    
    const team1Logo = await loadTeamLogo(compareTeam1Data.value.logo_url, compareTeam1Data.value.team_name, '#06b6d4')
    const team2Logo = await loadTeamLogo(compareTeam2Data.value.logo_url, compareTeam2Data.value.team_name, '#f97316')
    
    const data = compareData.value
    const h2h = data.h2h
    
    // Create container
    const container = document.createElement('div')
    container.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 700px; font-family: system-ui, -apple-system, sans-serif;'
    
    container.innerHTML = `
      <div style="background: linear-gradient(160deg, #0f1219 0%, #0a0c14 50%, #0d1117 100%); border-radius: 16px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); position: relative; overflow: hidden;">
        
        <!-- Top Yellow Bar -->
        <div style="background: #facc15; padding: 10px 24px; text-align: center;">
          <span style="font-size: 16px; font-weight: 700; color: #0a0c14; text-transform: uppercase; letter-spacing: 3px;">Ultimate Fantasy Dashboard</span>
        </div>
        
        <!-- Header -->
        <div style="display: flex; align-items: center; padding: 16px 24px; border-bottom: 1px solid rgba(250, 204, 21, 0.2);">
          ${logoBase64 ? `<img src="${logoBase64}" style="height: 50px; width: auto; flex-shrink: 0; margin-right: 16px;" />` : ''}
          <div style="flex: 1;">
            <div style="font-size: 28px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 1px;">Tale of the Tape</div>
            <div style="font-size: 14px; margin-top: 4px;">
              <span style="color: #e5e7eb;">${leagueName}</span>
              <span style="color: #6b7280; margin: 0 6px;">•</span>
              <span style="color: #facc15; font-weight: 700;">H2H Categories • All-Time</span>
            </div>
          </div>
        </div>
        
        <!-- Comparison Grid -->
        <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 16px; padding: 24px;">
          <!-- Team 1 -->
          <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(6, 182, 212, 0.05) 100%); border-radius: 12px; border: 2px solid rgba(6, 182, 212, 0.3);">
            <img src="${team1Logo}" style="width: 64px; height: 64px; border-radius: 50%; border: 3px solid #06b6d4; margin-bottom: 12px;" />
            <div style="font-weight: 700; font-size: 16px; color: #ffffff; margin-bottom: 12px;">${compareTeam1Data.value.team_name}</div>
            <div style="text-align: left; font-size: 13px;">
              <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.1);"><span style="color: #9ca3af;">🏆 Championships</span><span style="color: #ffffff; font-weight: 600;">${data.team1.championships}</span></div>
              <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.1);"><span style="color: #9ca3af;">📅 Seasons</span><span style="color: #ffffff; font-weight: 600;">${data.team1.seasons}</span></div>
              <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.1);"><span style="color: #9ca3af;">Matchup Record</span><span style="color: #ffffff; font-weight: 600;">${data.team1.matchupWins}-${data.team1.matchupLosses}-${data.team1.matchupTies}</span></div>
              <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.1);"><span style="color: #9ca3af;">Win %</span><span style="color: #ffffff; font-weight: 600;">${(data.team1.winPct * 100).toFixed(1)}%</span></div>
              <div style="display: flex; justify-content: space-between; padding: 6px 0;"><span style="color: #9ca3af;">Avg Cat Wins</span><span style="color: #ffffff; font-weight: 600;">${data.team1.avgCatWins.toFixed(1)}</span></div>
            </div>
          </div>
          
          <!-- VS Section -->
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px;">
            <div style="font-size: 36px; font-weight: 900; color: #6b7280; margin-bottom: 16px;">VS</div>
            <div style="text-align: center; margin-bottom: 12px;">
              <div style="font-size: 11px; color: #9ca3af; margin-bottom: 6px;">HEAD-TO-HEAD</div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 28px; font-weight: 900; color: ${h2h.team1Wins > h2h.team2Wins ? '#22c55e' : '#9ca3af'};">${h2h.team1Wins}</span>
                <span style="font-size: 20px; color: #6b7280;">-</span>
                <span style="font-size: 28px; font-weight: 900; color: ${h2h.team2Wins > h2h.team1Wins ? '#22c55e' : '#9ca3af'};">${h2h.team2Wins}</span>
              </div>
              ${h2h.ties > 0 ? `<div style="font-size: 11px; color: #6b7280; margin-top: 4px;">${h2h.ties} tie(s)</div>` : ''}
            </div>
            <div style="background: rgba(58, 61, 82, 0.3); border-radius: 8px; padding: 8px 12px; font-size: 12px;">
              <div style="color: #9ca3af;">Total Games: <span style="color: #ffffff; font-weight: 600;">${h2h.totalGames}</span></div>
              ${h2h.totalGames > 0 ? `<div style="color: #9ca3af; margin-top: 4px;">Cat Diff: <span style="color: ${h2h.catDiff > 0 ? '#06b6d4' : h2h.catDiff < 0 ? '#f97316' : '#ffffff'}; font-weight: 600;">${h2h.catDiff > 0 ? '+' : ''}${h2h.catDiff}</span></div>` : ''}
            </div>
          </div>
          
          <!-- Team 2 -->
          <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, rgba(249, 115, 22, 0.1) 0%, rgba(249, 115, 22, 0.05) 100%); border-radius: 12px; border: 2px solid rgba(249, 115, 22, 0.3);">
            <img src="${team2Logo}" style="width: 64px; height: 64px; border-radius: 50%; border: 3px solid #f97316; margin-bottom: 12px;" />
            <div style="font-weight: 700; font-size: 16px; color: #ffffff; margin-bottom: 12px;">${compareTeam2Data.value.team_name}</div>
            <div style="text-align: left; font-size: 13px;">
              <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.1);"><span style="color: #9ca3af;">🏆 Championships</span><span style="color: #ffffff; font-weight: 600;">${data.team2.championships}</span></div>
              <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.1);"><span style="color: #9ca3af;">📅 Seasons</span><span style="color: #ffffff; font-weight: 600;">${data.team2.seasons}</span></div>
              <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.1);"><span style="color: #9ca3af;">Matchup Record</span><span style="color: #ffffff; font-weight: 600;">${data.team2.matchupWins}-${data.team2.matchupLosses}-${data.team2.matchupTies}</span></div>
              <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.1);"><span style="color: #9ca3af;">Win %</span><span style="color: #ffffff; font-weight: 600;">${(data.team2.winPct * 100).toFixed(1)}%</span></div>
              <div style="display: flex; justify-content: space-between; padding: 6px 0;"><span style="color: #9ca3af;">Avg Cat Wins</span><span style="color: #ffffff; font-weight: 600;">${data.team2.avgCatWins.toFixed(1)}</span></div>
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="padding: 12px 24px; border-top: 1px solid rgba(58, 61, 82, 0.4); display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #6b7280; font-size: 11px;">Generated by Ultimate Fantasy Dashboard</span>
          <span style="color: #facc15; font-size: 11px; font-weight: 600;">ultimatefantasydashboard.com</span>
        </div>
      </div>
    `
    
    document.body.appendChild(container)
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const canvas = await html2canvas(container, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      allowTaint: true
    })
    
    document.body.removeChild(container)
    
    const link = document.createElement('a')
    const team1Short = compareTeam1Data.value.team_name.replace(/[^a-z0-9]/gi, '-').substring(0, 15)
    const team2Short = compareTeam2Data.value.team_name.replace(/[^a-z0-9]/gi, '-').substring(0, 15)
    link.download = `comparison-${team1Short}-vs-${team2Short}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  } finally {
    isDownloadingComparison.value = false
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
    
    // Pre-load all team images
    const imageMap = new Map<string, string>()
    for (const team of rankings) {
      try {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        const loadPromise = new Promise<string>((resolve) => {
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas')
              canvas.width = 64
              canvas.height = 64
              const ctx = canvas.getContext('2d')
              if (ctx) {
                ctx.beginPath()
                ctx.arc(32, 32, 32, 0, Math.PI * 2)
                ctx.closePath()
                ctx.clip()
                ctx.drawImage(img, 0, 0, 64, 64)
              }
              resolve(canvas.toDataURL('image/png'))
            } catch {
              resolve(createPlaceholder(team.team_name))
            }
          }
          img.onerror = () => resolve(createPlaceholder(team.team_name))
          setTimeout(() => resolve(createPlaceholder(team.team_name)), 3000)
        })
        img.src = team.logo_url || ''
        imageMap.set(team.team_name, await loadPromise)
      } catch {
        imageMap.set(team.team_name, createPlaceholder(team.team_name))
      }
    }
    
    const maxValue = Math.max(...rankings.map(r => {
      if (typeof r.value === 'string') {
        if (r.value.includes('%')) return parseFloat(r.value.replace('%', ''))
        return parseFloat(r.value) || 0
      }
      return r.value || 0
    }))
    
    // Get value unit descriptor based on record label
    const getValueUnit = (): string => {
      if (recordLabel.includes('Championships')) return 'Titles'
      if (recordLabel.includes('Categories Won')) return 'Cat Wins'
      if (recordLabel.includes('Win %') || recordLabel.includes('Pct')) return 'Win %'
      if (recordLabel.includes('Wins')) return 'Wins'
      if (recordLabel.includes('Losses')) return 'Losses'
      if (recordLabel.includes('Seasons')) return 'Seasons'
      return ''
    }
    const valueUnit = getValueUnit()
    
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
            <div style="width: 65px; text-align: right;">
              <div style="font-size: 13px; font-weight: bold; color: ${idx === 0 ? '#facc15' : '#e5e7eb'};">${team.value}</div>
              <div style="font-size: 9px; color: #6b7280; margin-top: 1px;">${valueUnit}</div>
            </div>
          </div>
        `
      }).join('')
    }
    
    const container = document.createElement('div')
    container.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 480px; font-family: system-ui, -apple-system, sans-serif;'
    
    container.innerHTML = `
      <div style="background: linear-gradient(160deg, #0f1219 0%, #0a0c14 50%, #0d1117 100%); border-radius: 16px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); position: relative; overflow: hidden;">
        
        <!-- Top Yellow Bar -->
        <div style="background: #facc15; padding: 8px 20px; text-align: center;">
          <span style="font-size: 12px; font-weight: 700; color: #0a0c14; text-transform: uppercase; letter-spacing: 2px;">Ultimate Fantasy Dashboard</span>
        </div>
        
        <!-- Header -->
        <div style="display: flex; align-items: center; padding: 10px 16px; border-bottom: 1px solid rgba(250, 204, 21, 0.2);">
          ${logoBase64 ? `<img src="${logoBase64}" style="height: 40px; width: auto; flex-shrink: 0; margin-right: 12px; margin-top: 4px;" />` : ''}
          <div style="flex: 1;">
            <div style="font-size: 17px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.1;">${recordLabel}</div>
            <div style="font-size: 12px; margin-top: 2px;">
              <span style="color: #e5e7eb;">${leagueName}</span>
              <span style="color: #6b7280; margin: 0 4px;">•</span>
              <span style="color: #facc15; font-weight: 600;">All-Time</span>
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
          <div style="font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">Top Ten Comparison</div>
          ${generateRows()}
        </div>
        
        <!-- Footer -->
        <div style="padding: 10px 16px; text-align: center; border-top: 1px solid rgba(250, 204, 21, 0.2);">
          <span style="font-size: 14px; font-weight: bold; color: #facc15;">ultimatefantasydashboard.com</span>
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

// Download season category rankings as image (mirrors Career Leaders style)
async function downloadSeasonCategoryRankings(category: string, type: 'best' | 'worst', catType: 'hitting' | 'pitching') {
  isDownloadingSeasonCategory.value = true
  try {
    const html2canvas = (await import('html2canvas')).default
    
    // Get league name
    const activeId = leagueStore.activeLeagueId
    const savedLeague = leagueStore.savedLeagues?.find((l: any) => l.league_id === activeId?.split('.l.')[1])
    const leagueName = savedLeague?.league_name || leagueStore.yahooLeague?.name || 'Fantasy League'
    
    const rankings = getSeasonCategoryRankings(category, type).slice(0, 10)
    
    if (rankings.length === 0) {
      isDownloadingSeasonCategory.value = false
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
    
    // Pre-load all team images
    const imageMap = new Map<string, string>()
    for (const team of rankings) {
      try {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        const loadPromise = new Promise<string>((resolve) => {
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas')
              canvas.width = 64
              canvas.height = 64
              const ctx = canvas.getContext('2d')
              if (ctx) {
                ctx.beginPath()
                ctx.arc(32, 32, 32, 0, Math.PI * 2)
                ctx.closePath()
                ctx.clip()
                ctx.drawImage(img, 0, 0, 64, 64)
              }
              resolve(canvas.toDataURL('image/png'))
            } catch {
              resolve(createPlaceholder(team.team_name))
            }
          }
          img.onerror = () => resolve(createPlaceholder(team.team_name))
          setTimeout(() => resolve(createPlaceholder(team.team_name)), 3000)
        })
        img.src = team.logo_url || ''
        imageMap.set(team.team_name, await loadPromise)
      } catch {
        imageMap.set(team.team_name, createPlaceholder(team.team_name))
      }
    }
    
    const maxValue = Math.max(...rankings.map(r => r.value || 0))
    
    // Generate ranking rows with images - EXACT same style as Career Records
    const generateRows = () => {
      return rankings.map((team, idx) => {
        const barWidth = maxValue > 0 ? (team.value / maxValue) * 100 : 0
        
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
            <div style="width: 65px; text-align: right;">
              <div style="font-size: 13px; font-weight: bold; color: ${idx === 0 ? '#facc15' : '#e5e7eb'};">${team.value}</div>
              <div style="font-size: 9px; color: #6b7280; margin-top: 1px;">Cat Wins</div>
            </div>
          </div>
        `
      }).join('')
    }
    
    const container = document.createElement('div')
    container.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 480px; font-family: system-ui, -apple-system, sans-serif;'
    
    container.innerHTML = `
      <div style="background: linear-gradient(160deg, #0f1219 0%, #0a0c14 50%, #0d1117 100%); border-radius: 16px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); position: relative; overflow: hidden;">
        
        <!-- Top Yellow Bar -->
        <div style="background: #facc15; padding: 8px 20px; text-align: center;">
          <span style="font-size: 12px; font-weight: 700; color: #0a0c14; text-transform: uppercase; letter-spacing: 2px;">Ultimate Fantasy Dashboard</span>
        </div>
        
        <!-- Header -->
        <div style="display: flex; align-items: center; padding: 10px 16px; border-bottom: 1px solid rgba(250, 204, 21, 0.2);">
          ${logoBase64 ? `<img src="${logoBase64}" style="height: 40px; width: auto; flex-shrink: 0; margin-right: 12px; margin-top: 4px;" />` : ''}
          <div style="flex: 1;">
            <div style="font-size: 17px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.1;">${category} Leaders</div>
            <div style="font-size: 12px; margin-top: 2px;">
              <span style="color: #e5e7eb;">${leagueName}</span>
              <span style="color: #6b7280; margin: 0 4px;">•</span>
              <span style="color: #facc15; font-weight: 600;">${selectedAwardsSeason.value} Season</span>
            </div>
          </div>
        </div>
        
        <!-- Featured Leader -->
        <div style="padding: 12px 16px; background: linear-gradient(135deg, rgba(250, 204, 21, 0.15) 0%, transparent 100%); border-bottom: 1px solid rgba(250, 204, 21, 0.2);">
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="${imageMap.get(leader.team_name) || createPlaceholder(leader.team_name)}" style="width: 44px; height: 44px; border-radius: 50%; border: 2px solid rgba(250, 204, 21, 0.5);" />
            <div style="flex: 1;">
              <div style="font-size: 15px; font-weight: bold; color: #ffffff;">${leader.team_name}</div>
              <div style="font-size: 11px; color: #9ca3af;">${leader.value} category wins</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 26px; font-weight: 900; color: #facc15;">${leader.value}</div>
            </div>
          </div>
        </div>
        
        <!-- Rankings List -->
        <div style="padding: 12px 16px;">
          <div style="font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">Top Ten Comparison</div>
          ${generateRows()}
        </div>
        
        <!-- Footer -->
        <div style="padding: 10px 16px; text-align: center; border-top: 1px solid rgba(250, 204, 21, 0.2);">
          <span style="font-size: 14px; font-weight: bold; color: #facc15;">ultimatefantasydashboard.com</span>
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
    link.download = `${selectedAwardsSeason.value}-${category.toLowerCase()}-leaders.png`
    link.href = finalCanvas.toDataURL('image/png')
    link.click()
  } finally {
    isDownloadingSeasonCategory.value = false
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
    
    // Pre-load all team images
    const imageMap = new Map<string, string>()
    for (const team of rankings) {
      try {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        const loadPromise = new Promise<string>((resolve) => {
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas')
              canvas.width = 64
              canvas.height = 64
              const ctx = canvas.getContext('2d')
              if (ctx) {
                ctx.beginPath()
                ctx.arc(32, 32, 32, 0, Math.PI * 2)
                ctx.closePath()
                ctx.clip()
                ctx.drawImage(img, 0, 0, 64, 64)
              }
              resolve(canvas.toDataURL('image/png'))
            } catch {
              resolve(createPlaceholder(team.team_name, colorMain))
            }
          }
          img.onerror = () => resolve(createPlaceholder(team.team_name, colorMain))
          setTimeout(() => resolve(createPlaceholder(team.team_name, colorMain)), 3000)
        })
        img.src = team.logo_url || ''
        imageMap.set(team.team_name + team.season, await loadPromise)
      } catch {
        imageMap.set(team.team_name + team.season, createPlaceholder(team.team_name, colorMain))
      }
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
            <div style="width: 65px; text-align: right;">
              <div style="font-size: 13px; font-weight: bold; color: ${idx === 0 ? colorMain : '#e5e7eb'};">${team.value}</div>
              <div style="font-size: 9px; color: #6b7280; margin-top: 1px;">Cat Wins</div>
            </div>
          </div>
        `
      }).join('')
    }
    
    const container = document.createElement('div')
    container.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 480px; font-family: system-ui, -apple-system, sans-serif;'
    
    container.innerHTML = `
      <div style="background: linear-gradient(160deg, #0f1219 0%, #0a0c14 50%, #0d1117 100%); border-radius: 16px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); position: relative; overflow: hidden;">
        
        <!-- Top Yellow Bar -->
        <div style="background: #facc15; padding: 8px 20px; text-align: center;">
          <span style="font-size: 12px; font-weight: 700; color: #0a0c14; text-transform: uppercase; letter-spacing: 2px;">Ultimate Fantasy Dashboard</span>
        </div>
        
        <!-- Header -->
        <div style="display: flex; align-items: center; padding: 10px 16px; border-bottom: 1px solid rgba(250, 204, 21, 0.2);">
          ${logoBase64 ? `<img src="${logoBase64}" style="height: 40px; width: auto; flex-shrink: 0; margin-right: 12px; margin-top: 4px;" />` : ''}
          <div style="flex: 1;">
            <div style="font-size: 17px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.1;">${category}</div>
            <div style="font-size: 12px; margin-top: 2px;">
              <span style="color: #e5e7eb;">${leagueName}</span>
              <span style="color: #6b7280; margin: 0 4px;">•</span>
              <span style="color: #facc15; font-weight: 600;">${type === 'best' ? 'Best' : 'Worst'} All-Time</span>
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
          <div style="font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">Top Ten Comparison</div>
          ${generateRows()}
        </div>
        
        <!-- Footer -->
        <div style="padding: 10px 16px; text-align: center; border-top: 1px solid rgba(250, 204, 21, 0.2);">
          <span style="font-size: 14px; font-weight: bold; color: #facc15;">ultimatefantasydashboard.com</span>
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
  loadingMessage.value = isEspn.value ? 'Connecting to ESPN...' : 'Connecting to Yahoo...'
  
  try {
    const leagueKey = leagueStore.activeLeagueId
    if (!leagueKey || !authStore.user?.id) {
      isLoading.value = false
      return
    }
    
    if (isEspn.value) {
      // ESPN Historical Data Loading
      await loadEspnHistoricalData(leagueKey)
    } else {
      // Yahoo Historical Data Loading
      await loadYahooHistoricalData(leagueKey)
    }
    
  } catch (e) {
    console.error('Error loading history:', e)
    loadingMessage.value = 'Error loading data'
  } finally {
    isLoading.value = false
  }
}

async function loadEspnHistoricalData(leagueKey: string) {
  const { leagueId, season: currentSeason } = parseEspnLeagueKey(leagueKey)
  console.log('[History ESPN] Loading history for league:', leagueId, 'current season:', currentSeason)
  
  loadingMessage.value = `Connecting to ESPN for league ${leagueId}...`
  
  // Quick check - verify we can access the current season
  try {
    const testLeague = await espnService.getLeague('baseball', leagueId, currentSeason)
    if (!testLeague) {
      loadingMessage.value = 'League not found or not accessible'
      console.log('[History ESPN] Failed initial league check')
      return
    }
    console.log('[History ESPN] Initial check passed, league:', testLeague.name)
  } catch (e: any) {
    loadingMessage.value = `Error connecting: ${e?.message || 'Unknown error'}`
    console.error('[History ESPN] Initial check failed:', e)
    return
  }
  
  // For ESPN, we'll try to load seasons going back in time
  const data: Record<string, any> = {}
  let successCount = 0
  let consecutiveFailures = 0
  
  // Try loading from current season back to 2015
  const currentYear = currentSeason || new Date().getFullYear()
  const years: number[] = []
  for (let year = currentYear; year >= 2015; year--) {
    years.push(year)
  }
  
  console.log('[History ESPN] Will attempt to load seasons:', years)
  loadingMessage.value = `Found league! Checking ${years.length} seasons...`
  
  for (const year of years) {
    loadingMessage.value = `Checking ${year} season... (${successCount} found so far)`
    console.log(`[History ESPN] Attempting to load ${year}`)
    
    try {
      // Get league info to check if it exists for this season
      const league = await espnService.getLeague('baseball', leagueId, year)
      
      if (!league) {
        console.log(`[History ESPN] ✗ ${year} - League not found (null response)`)
        // Don't count as failure - league just didn't exist that year
        continue
      }
      
      console.log(`[History ESPN] ${year} league found:`, league.name, 'status:', league.status)
      
      // Get standings/teams
      const standings = await espnService.getStandings('baseball', leagueId, year)
      console.log(`[History ESPN] ${year} standings response:`, standings?.length || 0, 'teams')
      
      if (standings && standings.length > 0) {
        console.log(`[History ESPN] ✓ Loaded ${year} season: ${standings.length} teams`)
        successCount++
        consecutiveFailures = 0 // Reset consecutive failure count
        loadingMessage.value = `Found ${year} season (${standings.length} teams)...`
        
        // Determine champion - look for rankCalculatedFinal === 1 or rank === 1 for finished seasons
        // For past seasons (year < current year), assume finished
        const nowYear = new Date().getFullYear()
        const isPastSeason = year < nowYear
        const isFinished = isPastSeason || league.status?.isFinished === true || !league.status?.isActive
        console.log(`[History ESPN] ${year} isFinished:`, isFinished, `(isPastSeason: ${isPastSeason}, status.isFinished: ${league.status?.isFinished}, status.isActive: ${league.status?.isActive})`)
        
        // Log raw standings data for debugging
        if (standings.length > 0) {
          console.log(`[History ESPN] ${year} first team raw data:`, {
            name: standings[0].name,
            rank: standings[0].rank,
            rankCalculatedFinal: standings[0].rankCalculatedFinal,
            playoffSeed: standings[0].playoffSeed
          })
        }
        
        // Transform ESPN standings to match Yahoo format
        const transformedStandings = standings.map((team: any, index: number) => {
          // For champion detection:
          // - rankCalculatedFinal is the final standings after playoffs (preferred)
          // - rank is current/final rank
          // - playoffSeed is seed going INTO playoffs (not the result)
          // Priority: rankCalculatedFinal > rank > playoffSeed > index
          const finalRank = team.rankCalculatedFinal || team.rank || team.playoffSeed || (index + 1)
          const isChampion = isFinished && finalRank === 1
          
          if (finalRank === 1) {
            console.log(`[History ESPN] ${year} Rank 1 team: ${team.name} (isFinished: ${isFinished}, isChampion: ${isChampion})`)
          }
          
          return {
            team_key: `espn_${team.id}`,
            team_id: team.id,
            name: team.name || team.teamName || `Team ${team.id}`,
            team_name: team.name || team.teamName || `Team ${team.id}`,
            logo_url: team.logo || '',
            rank: finalRank,
            wins: team.record?.overall?.wins || team.wins || 0,
            losses: team.record?.overall?.losses || team.losses || 0,
            ties: team.record?.overall?.ties || team.ties || 0,
            points_for: team.record?.overall?.pointsFor || team.pointsFor || 0,
            is_champion: isChampion
          }
        })
        
        data[year.toString()] = { standings: transformedStandings, matchups: [] }
        
        // Store current members from most recent season
        if (Object.keys(data).length === 1) {
          transformedStandings.forEach((t: any) => {
            currentMembers.value.add(t.team_key)
            allTeams.value[t.team_key] = t
          })
        } else {
          transformedStandings.forEach((t: any) => {
            if (!allTeams.value[t.team_key]) {
              allTeams.value[t.team_key] = t
            }
          })
        }
        
        // Load matchups for category data
        try {
          loadingMessage.value = `Loading ${year} matchups...`
          const allMatchups: any[] = []
          
          // Get total weeks from league info
          const totalWeeks = league.status?.finalMatchupPeriod || 25
          let weekFailures = 0
          
          // For historical data, we don't need forceRefresh - cached data is fine
          // Only force refresh for current season's current week
          const needsForceRefresh = year === currentYear
          
          for (let week = 1; week <= totalWeeks; week++) {
            try {
              // Update progress every few weeks to not spam the UI
              if (week === 1 || week % 5 === 0 || week === totalWeeks) {
                loadingMessage.value = `${year}: Loading week ${week}/${totalWeeks}...`
              }
              
              const weekMatchups = await espnService.getMatchups('baseball', leagueId, year, week, needsForceRefresh)
              
              if (weekMatchups && weekMatchups.length > 0) {
                // Transform ESPN matchups to match expected format
                const transformedMatchups = weekMatchups.map((m: any) => ({
                  week: week,
                  matchupPeriodId: week,
                  teams: [
                    { 
                      team_key: `espn_${m.homeTeamId}`,
                      name: allTeams.value[`espn_${m.homeTeamId}`]?.name || `Team ${m.homeTeamId}`,
                      stats: {}
                    },
                    { 
                      team_key: `espn_${m.awayTeamId}`,
                      name: allTeams.value[`espn_${m.awayTeamId}`]?.name || `Team ${m.awayTeamId}`,
                      stats: {}
                    }
                  ],
                  // Store ESPN-specific data for processing
                  espn_data: {
                    homePerCategoryResults: m.homePerCategoryResults,
                    awayPerCategoryResults: m.awayPerCategoryResults,
                    homeTeamId: m.homeTeamId,
                    awayTeamId: m.awayTeamId
                  },
                  // Create stat_winners from homePerCategoryResults for compatibility
                  stat_winners: m.homePerCategoryResults ? Object.entries(m.homePerCategoryResults).map(([statId, result]) => ({
                    stat_id: statId,
                    winner_team_key: result === 'WIN' ? `espn_${m.homeTeamId}` : result === 'LOSS' ? `espn_${m.awayTeamId}` : null,
                    is_tied: result === 'TIE'
                  })) : []
                }))
                allMatchups.push(...transformedMatchups)
                weekFailures = 0
              } else {
                weekFailures++
              }
            } catch (weekError) {
              weekFailures++
            }
            
            if (weekFailures >= 3 && allMatchups.length > 0) {
              console.log(`[History ESPN] Stopping at week ${week} for ${year} - season appears to have ended`)
              break
            }
          }
          
          console.log(`[History ESPN] Loaded ${allMatchups.length} total matchups for ${year}`)
          if (allMatchups.length > 0) {
            data[year.toString()].matchups = allMatchups
          }
        } catch (e) {
          console.log(`[History ESPN] Could not load matchups for ${year}:`, e)
        }
        
        // Small delay between seasons
        await new Promise(resolve => setTimeout(resolve, 100))
      } else {
        console.log(`[History ESPN] ✗ ${year} - No standings data returned`)
        // Don't count as failure - might just be empty data
      }
    } catch (e: any) {
      const errorMsg = e?.message || String(e)
      console.log(`[History ESPN] ✗ Could not load ${year} season:`, errorMsg)
      
      // Don't count 404 "League not found" as a failure - league just didn't exist that year
      if (errorMsg.includes('not found') || errorMsg.includes('404')) {
        console.log(`[History ESPN] ${year} - League didn't exist this year, continuing to check older years`)
        continue
      }
      
      // For other errors (network, auth, etc), count as failure
      consecutiveFailures++
      // If we've had 5 consecutive real failures, stop
      if (consecutiveFailures >= 5) {
        console.log(`[History ESPN] Stopping after ${consecutiveFailures} consecutive failures`)
        break
      }
    }
  }
  
  console.log('[History ESPN] === History Load Complete ===')
  console.log(`[History ESPN] Finished loading: ${successCount} seasons loaded`)
  console.log('[History ESPN] Loaded seasons:', Object.keys(data))
  
  historicalData.value = data
  console.log('[History ESPN] historicalData.value now has:', Object.keys(historicalData.value).length, 'seasons')
  
  loadingMessage.value = 'Building head-to-head records...'
  buildH2HRecords()
  
  loadingMessage.value = 'Done!'
}

async function loadYahooHistoricalData(leagueKey: string) {
    await yahooService.initialize(authStore.user!.id)
    
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
}

watch(() => leagueStore.activeLeagueId, (id) => {
  if (id && (leagueStore.activePlatform === 'yahoo' || leagueStore.activePlatform === 'espn') && !isLoading.value) {
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
