<template>
  <div class="space-y-6">
    <!-- Offseason Notice Banner - Only show when season is complete -->
    <div v-if="isSeasonComplete" class="bg-slate-500/10 border border-slate-500/30 rounded-xl p-4 flex items-start gap-3">
      <div class="text-slate-400 text-xl flex-shrink-0">📅</div>
      <div>
        <p class="text-slate-200 font-semibold">It's the offseason</p>
        <p class="text-slate-400 text-sm mt-1">You're viewing last season's data ({{ currentSeason }}). The {{ Number(currentSeason) + 1 }} season will appear automatically once Week 1 begins.</p>
      </div>
    </div>

    <!-- Header -->
    <div>
      <h1 class="text-3xl font-bold text-dark-text mb-2">League History</h1>
      <p class="text-base text-dark-textMuted">
        Career statistics, championship records, and historical trends
      </p>
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
              <div class="p-6 bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 rounded-xl border-2 border-yellow-500/20 hover:border-yellow-500/40 transition-all">
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
                All-time regular season records (playoffs excluded)
              </div>
              <!-- Toggle for current members only -->
              <label class="flex items-center gap-2 cursor-pointer">
                <span class="text-sm text-dark-textMuted">Current members only</span>
                <div class="relative">
                  <input type="checkbox" v-model="showCurrentMembersOnlyCareer" class="sr-only">
                  <div :class="[
                    'w-10 h-5 rounded-full transition-colors',
                    showCurrentMembersOnlyCareer ? 'bg-yellow-500' : 'bg-dark-border'
                  ]"></div>
                  <div :class="[
                    'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform',
                    showCurrentMembersOnlyCareer ? 'translate-x-5' : 'translate-x-0'
                  ]"></div>
                </div>
              </label>
              <div class="flex items-center gap-2">
                <span class="text-xs text-dark-textMuted italic">Downloads in current sort order</span>
                <button 
                  @click="downloadCareerStats"
                  :disabled="isDownloadingCareerStats"
                  class="px-4 py-2 border border-yellow-400 bg-transparent text-yellow-400 hover:bg-yellow-400 hover:text-gray-900 rounded-lg font-medium flex items-center gap-2 text-sm transition-colors disabled:opacity-50"
                >
                  <svg v-if="!isDownloadingCareerStats" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {{ isDownloadingCareerStats ? 'Generating...' : 'Share League History' }}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="card-body overflow-x-auto">
          <table ref="careerTableRef" class="w-full text-sm">
            <thead>
              <tr class="text-left text-xs text-dark-textMuted uppercase border-b border-dark-border">
                <th class="py-3 px-4 font-semibold">Team</th>
                <th class="py-3 px-4 text-center cursor-pointer hover:text-yellow-400" @click="sortBy('seasons')">
                  Seasons <span v-if="sortColumn === 'seasons'" class="text-yellow-400">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </th>
                <th class="py-3 px-4 text-center cursor-pointer hover:text-yellow-400" @click="sortBy('championships')">
                  Championships <span v-if="sortColumn === 'championships'" class="text-yellow-400">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </th>
                <th class="py-3 px-4 text-center cursor-pointer hover:text-yellow-400" @click="sortBy('wins')">
                  Record <span v-if="sortColumn === 'wins'" class="text-yellow-400">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </th>
                <th class="py-3 px-4 text-center cursor-pointer hover:text-yellow-400" @click="sortBy('win_pct')">
                  Win % <span v-if="sortColumn === 'win_pct'" class="text-yellow-400">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </th>
                <th class="py-3 px-4 text-center cursor-pointer hover:text-yellow-400" @click="sortBy('avg_ppw')">
                  Avg PPW <span v-if="sortColumn === 'avg_ppw'" class="text-yellow-400">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </th>
                <th class="py-3 px-4 text-center cursor-pointer hover:text-yellow-400" @click="sortBy('total_pf')">
                  Total PF <span v-if="sortColumn === 'total_pf'" class="text-yellow-400">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </th>
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
                  <span v-if="stat.championships > 0" class="text-yellow-400 font-bold">
                    🏆 {{ stat.championships }}
                  </span>
                  <span v-else class="text-dark-textMuted">—</span>
                </td>
                <td class="text-center py-3 px-4 font-semibold" :class="getRecordClass(stat, 'wins')">
                  {{ stat.wins }}-{{ stat.losses }}
                </td>
                <td class="text-center py-3 px-4">
                  <span :class="getRecordClass(stat, 'win_pct')">
                    {{ (stat.win_pct * 100).toFixed(1) }}%
                  </span>
                </td>
                <td class="text-center py-3 px-4" :class="getRecordClass(stat, 'avg_ppw')">{{ stat.avg_ppw.toFixed(1) }}</td>
                <td class="text-center py-3 px-4" :class="getRecordClass(stat, 'total_pf')">{{ stat.total_pf.toFixed(0) }}</td>
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
              :disabled="isDownloadingSeasonHistory"
              class="px-4 py-2 border border-yellow-400 bg-transparent text-yellow-400 hover:bg-yellow-400 hover:text-gray-900 rounded-lg font-medium flex items-center gap-2 text-sm transition-colors disabled:opacity-50"
            >
              <svg v-if="!isDownloadingSeasonHistory" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ isDownloadingSeasonHistory ? 'Generating...' : 'Share Season History' }}
            </button>
          </div>
          <p class="card-subtitle mt-2">Historical performance by year</p>
        </div>
        <div class="card-body overflow-x-auto">
          <table ref="seasonTableRef" class="w-full text-sm">
            <thead>
              <tr class="border-b border-dark-border">
                <th class="text-left py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider">Season</th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider">Avg PPW</th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider">High Score</th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider">Low Score</th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider">Trades</th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider">Champion</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="season in seasonRecords" :key="season.season" 
                  class="border-b border-dark-border hover:bg-dark-border/30 transition-colors">
                <td class="py-3 px-4 font-bold text-dark-text">{{ season.season }}</td>
                <td class="text-center py-3 px-4 text-dark-text">{{ season.avg_ppw.toFixed(1) }}</td>
                <td class="text-center py-3 px-4">
                  <div class="text-green-400 font-semibold">{{ season.high_score.toFixed(1) }}</div>
                  <div class="text-xs text-dark-textMuted">{{ season.high_scorer }}</div>
                </td>
                <td class="text-center py-3 px-4">
                  <div class="text-red-400 font-semibold">{{ season.low_score.toFixed(1) }}</div>
                  <div class="text-xs text-dark-textMuted">{{ season.low_scorer }}</div>
                </td>
                <td class="text-center py-3 px-4 text-dark-text font-semibold">{{ season.trade_count }}</td>
                <td class="text-center py-3 px-4">
                  <div class="flex items-center justify-center gap-2">
                    <span class="text-lg">🏆</span>
                    <span class="font-semibold text-dark-text">{{ season.champion || 'TBD' }}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      </template>

      <!-- ==================== HEAD-TO-HEAD TAB ==================== -->
      <template v-if="activeHistoryTab === 'h2h'">
      <!-- Head-to-Head Matrix -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center justify-between flex-wrap gap-4">
            <div class="flex items-center gap-2">
              <span class="text-2xl">🎯</span>
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
                @click="downloadHeadToHead"
                :disabled="isDownloadingH2H"
                class="px-4 py-2 border border-yellow-400 bg-transparent text-yellow-400 hover:bg-yellow-400 hover:text-gray-900 rounded-lg font-medium flex items-center gap-2 text-sm transition-colors disabled:opacity-50"
              >
                <svg v-if="!isDownloadingH2H" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ isDownloadingH2H ? 'Generating...' : 'Share Head to Head' }}
              </button>
            </div>
          </div>
          <p class="card-subtitle mt-2">All-time records between teams (read horizontally: each row shows that team's record against opponents)</p>
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
                  <span v-if="rowTeam.team_key === colTeam.team_key" class="text-dark-textMuted">—</span>
                  <span v-else class="font-semibold">
                    {{ getH2HRecord(rowTeam.team_key, colTeam.team_key) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
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
            <div class="flex gap-2">
              <button 
                v-for="tab in awardTabs" 
                :key="tab"
                @click="selectedAwardTab = tab"
                :class="[
                  'px-4 py-2 rounded-lg font-semibold transition-colors',
                  selectedAwardTab === tab 
                    ? 'bg-yellow-400 text-gray-900' 
                    : 'bg-dark-border/30 text-dark-textSecondary hover:bg-dark-border/50'
                ]"
              >
                {{ tab }}
              </button>
            </div>
          </div>
          <div v-if="selectedAwardTab === 'Season'" class="mt-4">
            <label class="text-sm text-dark-textMuted">Select Season:</label>
            <select 
              v-model="selectedAwardSeason"
              class="ml-3 px-4 py-2 bg-dark-border rounded-lg text-dark-text border border-dark-border/50 focus:border-primary focus:outline-none"
            >
              <option v-for="season in availableSeasons" :key="season" :value="season">
                {{ season }}
              </option>
            </select>
          </div>
          <div v-if="selectedAwardTab === 'Weekly'" class="mt-4 flex gap-4">
            <div>
              <label class="text-sm text-dark-textMuted">Season:</label>
              <select 
                v-model="selectedWeeklyAwardSeason"
                class="ml-3 px-4 py-2 bg-dark-border rounded-lg text-dark-text border border-dark-border/50 focus:border-primary focus:outline-none"
              >
                <option v-for="season in availableSeasons" :key="season" :value="season">
                  {{ season }}
                </option>
              </select>
            </div>
            <div>
              <label class="text-sm text-dark-textMuted">Week:</label>
              <select 
                v-model="selectedWeeklyAwardWeek"
                class="ml-3 px-4 py-2 bg-dark-border rounded-lg text-dark-text border border-dark-border/50 focus:border-primary focus:outline-none"
              >
                <option v-for="week in availableWeeksForAwards" :key="week" :value="week">
                  Week {{ week }}
                </option>
              </select>
            </div>
          </div>
        </div>
        
        <div class="card-body">
          <!-- All-Time Awards -->
          <div v-if="selectedAwardTab === 'All-Time'">
            <!-- Hall of Fame -->
            <div class="mb-8">
              <h3 class="text-xl font-bold text-dark-text mb-4 flex items-center gap-2">
                <span>🏅</span>
                <span>Hall of Fame</span>
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  v-for="award in allTimeHallOfFame" 
                  :key="award.title" 
                  class="bg-green-500/10 border border-green-500/30 rounded-xl p-4 cursor-pointer hover:bg-green-500/20 transition-colors"
                  @click="openAwardModal(award.title, 'best')"
                >
                  <div class="text-sm text-dark-textMuted uppercase tracking-wide mb-2">{{ award.title }}</div>
                  <div v-if="award.winner" class="flex items-center gap-3 mb-2">
                    <div class="w-12 h-12 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                      <img
                        :src="award.winner.logo_url || defaultAvatar"
                        :alt="award.winner.team_name"
                        class="w-full h-full object-cover"
                        @error="handleImageError"
                      />
                    </div>
                    <div class="flex-1">
                      <div class="font-bold text-dark-text">{{ award.winner.team_name }}</div>
                      <div class="text-xs text-dark-textMuted">{{ award.winner.season || 'All-Time' }}</div>
                    </div>
                    <div class="text-right">
                      <div class="text-2xl font-bold text-green-400">{{ award.winner.value }}</div>
                    </div>
                  </div>
                  <div v-if="award.winner" class="text-xs text-dark-textSecondary">{{ award.winner.details }}</div>
                  <div v-else class="text-sm text-dark-textMuted italic">No data available</div>
                  <div class="text-xs text-green-400 mt-2 opacity-70">Click for top 10 →</div>
                </div>
              </div>
            </div>

            <!-- Hall of Shame -->
            <div class="mb-8">
              <h3 class="text-xl font-bold text-dark-text mb-4 flex items-center gap-2">
                <span>💩</span>
                <span>Hall of Shame</span>
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  v-for="award in allTimeHallOfShame" 
                  :key="award.title" 
                  class="bg-dark-border/30 rounded-xl p-4 cursor-pointer hover:bg-dark-border/50 transition-colors"
                  @click="openAwardModal(award.title, 'worst')"
                >
                  <div class="text-sm text-dark-textMuted uppercase tracking-wide mb-2">{{ award.title }}</div>
                  <div v-if="award.winner" class="flex items-center gap-3 mb-2">
                    <div class="w-12 h-12 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                      <img
                        :src="award.winner.logo_url || defaultAvatar"
                        :alt="award.winner.team_name"
                        class="w-full h-full object-cover"
                        @error="handleImageError"
                      />
                    </div>
                    <div class="flex-1">
                      <div class="font-bold text-dark-text">{{ award.winner.team_name }}</div>
                      <div class="text-xs text-dark-textMuted">{{ award.winner.season || 'All-Time' }}</div>
                    </div>
                    <div class="text-right">
                      <div class="text-2xl font-bold text-red-400">{{ award.winner.value }}</div>
                    </div>
                  </div>
                  <div v-if="award.winner" class="text-xs text-dark-textSecondary">{{ award.winner.details }}</div>
                  <div v-else class="text-sm text-dark-textMuted italic">No data available</div>
                  <div class="text-xs text-red-400 mt-2 opacity-70">Click for bottom 10 →</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Season Awards -->
          <div v-if="selectedAwardTab === 'Season'">
            <!-- Hall of Fame -->
            <div class="mb-8">
              <h3 class="text-xl font-bold text-dark-text mb-4 flex items-center gap-2">
                <span>🏅</span>
                <span>{{ selectedAwardSeason }} Hall of Fame</span>
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  v-for="award in seasonHallOfFame" 
                  :key="award.title" 
                  class="bg-green-500/10 border border-green-500/30 rounded-xl p-4 cursor-pointer hover:bg-green-500/20 transition-colors"
                  @click="openSeasonAwardModal(award.title, 'best')"
                >
                  <div class="text-sm text-dark-textMuted uppercase tracking-wide mb-2">{{ award.title }}</div>
                  <div v-if="award.winner" class="flex items-center gap-3 mb-2">
                    <div class="w-12 h-12 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                      <img
                        :src="award.winner.logo_url || defaultAvatar"
                        :alt="award.winner.team_name"
                        class="w-full h-full object-cover"
                        @error="handleImageError"
                      />
                    </div>
                    <div class="flex-1">
                      <div class="font-bold text-dark-text">{{ award.winner.team_name }}</div>
                    </div>
                    <div class="text-right">
                      <div class="text-2xl font-bold text-green-400">{{ award.winner.value }}</div>
                    </div>
                  </div>
                  <div v-if="award.winner" class="text-xs text-dark-textSecondary">{{ award.winner.details }}</div>
                  <div v-else class="text-sm text-dark-textMuted italic">No data available</div>
                  <div class="text-xs text-green-400 mt-2 opacity-70">Click for top 10 →</div>
                </div>
              </div>
            </div>

            <!-- Hall of Shame -->
            <div class="mb-8">
              <h3 class="text-xl font-bold text-dark-text mb-4 flex items-center gap-2">
                <span>💩</span>
                <span>{{ selectedAwardSeason }} Hall of Shame</span>
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  v-for="award in seasonHallOfShame" 
                  :key="award.title" 
                  class="bg-dark-border/30 rounded-xl p-4 cursor-pointer hover:bg-dark-border/50 transition-colors"
                  @click="openSeasonAwardModal(award.title, 'worst')"
                >
                  <div class="text-sm text-dark-textMuted uppercase tracking-wide mb-2">{{ award.title }}</div>
                  <div v-if="award.winner" class="flex items-center gap-3 mb-2">
                    <div class="w-12 h-12 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                      <img
                        :src="award.winner.logo_url || defaultAvatar"
                        :alt="award.winner.team_name"
                        class="w-full h-full object-cover"
                        @error="handleImageError"
                      />
                    </div>
                    <div class="flex-1">
                      <div class="font-bold text-dark-text">{{ award.winner.team_name }}</div>
                    </div>
                    <div class="text-right">
                      <div class="text-2xl font-bold text-red-400">{{ award.winner.value }}</div>
                    </div>
                  </div>
                  <div v-if="award.winner" class="text-xs text-dark-textSecondary">{{ award.winner.details }}</div>
                  <div v-else class="text-sm text-dark-textMuted italic">No data available</div>
                  <div class="text-xs text-red-400 mt-2 opacity-70">Click for bottom 10 →</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Weekly Awards -->
          <div v-if="selectedAwardTab === 'Weekly'">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                v-for="award in weeklyAwards" 
                :key="award.title" 
                class="bg-dark-border/30 rounded-xl p-4 cursor-pointer hover:bg-dark-border/50 transition-colors"
                @click="openWeeklyAwardModal(award.title, award.isShame ? 'worst' : 'best')"
              >
                <div class="text-sm text-dark-textMuted uppercase tracking-wide mb-2">{{ award.title }}</div>
                <div v-if="award.winner" class="flex items-center gap-3 mb-2">
                  <div class="w-12 h-12 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                    <img
                      :src="award.winner.logo_url || defaultAvatar"
                      :alt="award.winner.team_name"
                      class="w-full h-full object-cover"
                      @error="handleImageError"
                    />
                  </div>
                  <div class="flex-1">
                    <div class="font-bold text-dark-text">{{ award.winner.team_name }}</div>
                  </div>
                  <div class="text-right">
                    <div class="text-2xl font-bold" :class="award.isShame ? 'text-red-400' : 'text-green-400'">{{ award.winner.value }}</div>
                  </div>
                </div>
                <div v-if="award.winner" class="text-xs text-dark-textSecondary">{{ award.winner.details }}</div>
                <div v-else class="text-sm text-dark-textMuted italic">No data available</div>
                <div class="text-xs text-yellow-400 mt-2 opacity-70">Click for details →</div>
              </div>
            </div>
          </div>
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
                  A comprehensive score measuring each manager's historical success. Points are awarded for championships, 
                  playoff appearances, wins, scoring achievements, and sustained excellence over time.
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
                      <div class="flex justify-between"><span>Each Win</span><span class="text-blue-400">+3</span></div>
                      <div class="flex justify-between"><span>Winning Record Season</span><span class="text-blue-400">+10</span></div>
                    </div>
                  </div>
                  <div class="bg-dark-bg/50 rounded-lg p-3">
                    <div class="font-semibold text-purple-400 mb-2">⭐ Scoring Achievements</div>
                    <div class="space-y-1 text-dark-textMuted">
                      <div class="flex justify-between"><span>Season Points Leader</span><span class="text-purple-400">+20</span></div>
                      <div class="flex justify-between"><span>Top 3 Season Scoring</span><span class="text-purple-400">+10</span></div>
                      <div class="flex justify-between"><span>Weekly High Score</span><span class="text-purple-400">+10</span></div>
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
                      <div class="flex justify-between"><span>Lowest Weekly Score</span><span class="text-red-400">-5</span></div>
                      <div class="flex justify-between"><span>Season Scoring Cellar</span><span class="text-red-400">-10</span></div>
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
            <div class="flex items-center gap-2">
              <span class="text-2xl">🏅</span>
              <h2 class="card-title">Legacy Leaderboard</h2>
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
                    :class="idx === 0 ? 'bg-yellow-500 text-black' : idx === 1 ? 'bg-gray-300 text-black' : idx === 2 ? 'bg-amber-600 text-white' : 'bg-dark-border text-dark-textMuted'"
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

        <!-- Score Distribution -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div class="card">
            <div class="card-body text-center">
              <div class="text-3xl mb-2">🏆</div>
              <div class="text-2xl font-bold text-yellow-400">{{ totalChampionshipsAwarded }}</div>
              <div class="text-xs text-dark-textMuted">Championships Awarded</div>
            </div>
          </div>
          <div class="card">
            <div class="card-body text-center">
              <div class="text-3xl mb-2">📈</div>
              <div class="text-2xl font-bold text-blue-400">{{ totalPlayoffAppearances }}</div>
              <div class="text-xs text-dark-textMuted">Playoff Appearances</div>
            </div>
          </div>
          <div class="card">
            <div class="card-body text-center">
              <div class="text-3xl mb-2">⭐</div>
              <div class="text-2xl font-bold text-purple-400">{{ totalWeeklyHighScores }}</div>
              <div class="text-xs text-dark-textMuted">Weekly High Scores</div>
            </div>
          </div>
          <div class="card">
            <div class="card-body text-center">
              <div class="text-3xl mb-2">📊</div>
              <div class="text-2xl font-bold text-green-400">{{ averageLegacyScore }}</div>
              <div class="text-xs text-dark-textMuted">Average Legacy Score</div>
            </div>
          </div>
        </div>
      </template>
    </template>

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
              <h3 class="text-xl font-bold text-dark-text">{{ awardModalTitle }}</h3>
              <p class="text-sm"><span class="text-dark-textMuted">{{ leagueDisplayName }}</span> <span class="text-dark-textMuted">•</span> <span class="text-red-500 font-semibold">All-Time {{ awardModalType === 'best' ? 'Best' : 'Worst' }}</span></p>
            </div>
            <div class="flex items-center gap-2">
              <button 
                @click="downloadAwardRankings(awardModalTitle, awardModalType)" 
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
          
          <div class="p-6 border-b border-dark-border" :class="awardModalType === 'best' ? 'bg-gradient-to-r from-green-500/10 to-transparent' : 'bg-gradient-to-r from-red-500/10 to-transparent'" v-if="awardModalRankings[0]">
            <div class="flex items-center gap-4">
              <img 
                :src="awardModalRankings[0].logo_url || defaultAvatar" 
                :alt="awardModalRankings[0].team_name"
                class="w-16 h-16 rounded-full ring-4 object-cover"
                :class="awardModalType === 'best' ? 'ring-green-500/50' : 'ring-red-500/50'"
                @error="handleImageError"
              />
              <div class="flex-1">
                <div class="text-xl font-bold text-dark-text">{{ awardModalRankings[0].team_name }}</div>
                <div class="text-sm text-dark-textMuted">{{ awardModalRankings[0].detail }}</div>
              </div>
              <div class="text-right">
                <div class="text-3xl font-black" :class="awardModalType === 'best' ? 'text-green-400' : 'text-red-400'">{{ awardModalRankings[0].value }}</div>
              </div>
            </div>
          </div>
          
          <div class="p-6">
            <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-4">{{ awardModalType === 'best' ? 'Top 10' : 'Bottom 10' }}</h4>
            <div class="space-y-3">
              <div 
                v-for="(team, index) in awardModalRankings.slice(0, 10)" 
                :key="team.team_name + index"
                class="flex items-center gap-3"
              >
                <div class="w-6 text-center">
                  <span class="text-sm font-bold" :class="index === 0 ? (awardModalType === 'best' ? 'text-green-400' : 'text-red-400') : 'text-dark-textMuted'">{{ index + 1 }}</span>
                </div>
                <img :src="team.logo_url || defaultAvatar" :alt="team.team_name" class="w-8 h-8 rounded-full object-cover" @error="handleImageError" />
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium text-dark-text truncate mb-1">{{ team.team_name }}</div>
                  <div class="h-2.5 bg-dark-border rounded-full overflow-hidden">
                    <div 
                      class="h-full rounded-full transition-all duration-500"
                      :class="awardModalType === 'best' ? 'bg-green-500' : 'bg-red-500'"
                      :style="{ width: getAwardBarWidth(team.value, awardModalTitle, awardModalType) }"
                    ></div>
                  </div>
                </div>
                <div class="w-20 text-right">
                  <div class="text-sm font-semibold" :class="index === 0 ? (awardModalType === 'best' ? 'text-green-400' : 'text-red-400') : 'text-dark-text'">
                    {{ team.value }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Season Award Modal -->
    <Teleport to="body">
      <div 
        v-if="showSeasonAwardModal" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="closeSeasonAwardModal"
      >
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
        <div class="relative bg-dark-elevated rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-dark-border">
          <div class="sticky top-0 z-10 px-6 py-4 border-b border-dark-border bg-dark-elevated flex items-center justify-between">
            <div>
              <h3 class="text-xl font-bold text-dark-text">{{ seasonAwardModalTitle }}</h3>
              <p class="text-sm"><span class="text-dark-textMuted">{{ leagueDisplayName }}</span> <span class="text-dark-textMuted">•</span> <span class="text-red-500 font-semibold">{{ selectedAwardSeason }} {{ seasonAwardModalType === 'best' ? 'Best' : 'Worst' }}</span></p>
            </div>
            <div class="flex items-center gap-2">
              <button 
                @click="downloadSeasonAwardRankings(seasonAwardModalTitle, seasonAwardModalType)" 
                :disabled="isDownloadingSeasonAward"
                class="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-50"
                style="background: transparent; color: #facc15; border: 1px solid #facc15;"
                @mouseover="$event.currentTarget.style.background = '#facc15'; $event.currentTarget.style.color = '#111827'"
                @mouseout="$event.currentTarget.style.background = 'transparent'; $event.currentTarget.style.color = '#facc15'"
              >
                <svg v-if="!isDownloadingSeasonAward" class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <svg v-else class="w-4 h-4 animate-spin pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ isDownloadingSeasonAward ? 'Saving...' : 'Share' }}
              </button>
              <button @click="closeSeasonAwardModal" class="p-2 rounded-lg hover:bg-dark-border/50 transition-colors">
                <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          <div class="p-6 border-b border-dark-border" :class="seasonAwardModalType === 'best' ? 'bg-gradient-to-r from-green-500/10 to-transparent' : 'bg-gradient-to-r from-red-500/10 to-transparent'" v-if="seasonAwardModalRankings[0]">
            <div class="flex items-center gap-4">
              <img 
                :src="seasonAwardModalRankings[0].logo_url || defaultAvatar" 
                :alt="seasonAwardModalRankings[0].team_name"
                class="w-16 h-16 rounded-full ring-4 object-cover"
                :class="seasonAwardModalType === 'best' ? 'ring-green-500/50' : 'ring-red-500/50'"
                @error="handleImageError"
              />
              <div class="flex-1">
                <div class="text-xl font-bold text-dark-text">{{ seasonAwardModalRankings[0].team_name }}</div>
                <div class="text-sm text-dark-textMuted">{{ seasonAwardModalRankings[0].detail }}</div>
              </div>
              <div class="text-right">
                <div class="text-3xl font-black" :class="seasonAwardModalType === 'best' ? 'text-green-400' : 'text-red-400'">{{ seasonAwardModalRankings[0].value }}</div>
              </div>
            </div>
          </div>
          
          <div class="p-6">
            <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-4">{{ seasonAwardModalType === 'best' ? 'Top 10' : 'Bottom 10' }}</h4>
            <div class="space-y-3">
              <div 
                v-for="(team, index) in seasonAwardModalRankings.slice(0, 10)" 
                :key="team.team_name + index"
                class="flex items-center gap-3"
              >
                <div class="w-6 text-center">
                  <span class="text-sm font-bold" :class="index === 0 ? (seasonAwardModalType === 'best' ? 'text-green-400' : 'text-red-400') : 'text-dark-textMuted'">{{ index + 1 }}</span>
                </div>
                <img :src="team.logo_url || defaultAvatar" :alt="team.team_name" class="w-8 h-8 rounded-full object-cover" @error="handleImageError" />
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium text-dark-text truncate mb-1">{{ team.team_name }}</div>
                  <div class="h-2.5 bg-dark-border rounded-full overflow-hidden">
                    <div 
                      class="h-full rounded-full transition-all duration-500"
                      :class="seasonAwardModalType === 'best' ? 'bg-green-500' : 'bg-red-500'"
                      :style="{ width: getSeasonAwardBarWidth(team.value, seasonAwardModalTitle, seasonAwardModalType) }"
                    ></div>
                  </div>
                </div>
                <div class="w-20 text-right">
                  <div class="text-sm font-semibold" :class="index === 0 ? (seasonAwardModalType === 'best' ? 'text-green-400' : 'text-red-400') : 'text-dark-text'">
                    {{ team.value }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Weekly Award Modal -->
    <Teleport to="body">
      <div 
        v-if="showWeeklyAwardModal" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="closeWeeklyAwardModal"
      >
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
        <div class="relative bg-dark-elevated rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-dark-border">
          <div class="sticky top-0 z-10 px-6 py-4 border-b border-dark-border bg-dark-elevated flex items-center justify-between">
            <div>
              <h3 class="text-xl font-bold text-dark-text">{{ weeklyAwardModalTitle }}</h3>
              <p class="text-sm"><span class="text-dark-textMuted">{{ leagueDisplayName }}</span> <span class="text-dark-textMuted">•</span> <span class="text-red-500 font-semibold">{{ selectedWeeklyAwardSeason }} Week {{ selectedWeeklyAwardWeek }}</span></p>
            </div>
            <div class="flex items-center gap-2">
              <button 
                @click="downloadWeeklyAwardRankings(weeklyAwardModalTitle, weeklyAwardModalType)" 
                :disabled="isDownloadingWeeklyAward"
                class="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-50"
                style="background: transparent; color: #facc15; border: 1px solid #facc15;"
                @mouseover="$event.currentTarget.style.background = '#facc15'; $event.currentTarget.style.color = '#111827'"
                @mouseout="$event.currentTarget.style.background = 'transparent'; $event.currentTarget.style.color = '#facc15'"
              >
                <svg v-if="!isDownloadingWeeklyAward" class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <svg v-else class="w-4 h-4 animate-spin pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ isDownloadingWeeklyAward ? 'Saving...' : 'Share' }}
              </button>
              <button @click="closeWeeklyAwardModal" class="p-2 rounded-lg hover:bg-dark-border/50 transition-colors">
                <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          <div class="p-6 border-b border-dark-border" :class="weeklyAwardModalType === 'best' ? 'bg-gradient-to-r from-green-500/10 to-transparent' : 'bg-gradient-to-r from-red-500/10 to-transparent'" v-if="weeklyAwardModalRankings[0]">
            <div class="flex items-center gap-4">
              <img 
                :src="weeklyAwardModalRankings[0].logo_url || defaultAvatar" 
                :alt="weeklyAwardModalRankings[0].team_name"
                class="w-16 h-16 rounded-full ring-4 object-cover"
                :class="weeklyAwardModalType === 'best' ? 'ring-green-500/50' : 'ring-red-500/50'"
                @error="handleImageError"
              />
              <div class="flex-1">
                <div class="text-xl font-bold text-dark-text">{{ weeklyAwardModalRankings[0].team_name }}</div>
                <div class="text-sm text-dark-textMuted">{{ weeklyAwardModalRankings[0].detail }}</div>
              </div>
              <div class="text-right">
                <div class="text-3xl font-black" :class="weeklyAwardModalType === 'best' ? 'text-green-400' : 'text-red-400'">{{ weeklyAwardModalRankings[0].value }}</div>
              </div>
            </div>
          </div>
          
          <div class="p-6">
            <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-4">Week Rankings</h4>
            <div class="space-y-3">
              <div 
                v-for="(team, index) in weeklyAwardModalRankings.slice(0, 10)" 
                :key="team.team_name + index"
                class="flex items-center gap-3"
              >
                <div class="w-6 text-center">
                  <span class="text-sm font-bold" :class="index === 0 ? (weeklyAwardModalType === 'best' ? 'text-green-400' : 'text-red-400') : 'text-dark-textMuted'">{{ index + 1 }}</span>
                </div>
                <img :src="team.logo_url || defaultAvatar" :alt="team.team_name" class="w-8 h-8 rounded-full object-cover" @error="handleImageError" />
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium text-dark-text truncate mb-1">{{ team.team_name }}</div>
                  <div class="h-2.5 bg-dark-border rounded-full overflow-hidden">
                    <div 
                      class="h-full rounded-full transition-all duration-500"
                      :class="weeklyAwardModalType === 'best' ? 'bg-green-500' : 'bg-red-500'"
                      :style="{ width: getWeeklyAwardBarWidth(team.value) }"
                    ></div>
                  </div>
                </div>
                <div class="w-20 text-right">
                  <div class="text-sm font-semibold" :class="index === 0 ? (weeklyAwardModalType === 'best' ? 'text-green-400' : 'text-red-400') : 'text-dark-text'">
                    {{ team.value }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Legacy Score Modal -->
    <Teleport to="body">
      <div 
        v-if="showLegacyModal && selectedLegacyTeam" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="closeLegacyModal"
      >
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
        <div class="relative bg-dark-elevated rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-dark-border">
          <!-- Header -->
          <div class="sticky top-0 z-10 px-6 py-4 border-b border-dark-border bg-dark-elevated">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-4">
                <img 
                  :src="selectedLegacyTeam.logo_url || defaultAvatar" 
                  :alt="selectedLegacyTeam.team_name"
                  class="w-14 h-14 rounded-full ring-4 ring-yellow-500/30 object-cover"
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
              <div class="text-xs text-dark-textMuted">Wins</div>
            </div>
            <div class="text-center">
              <div class="text-2xl">⭐</div>
              <div class="text-xl font-bold text-purple-400">{{ selectedLegacyTeam.season_high_scores }}</div>
              <div class="text-xs text-dark-textMuted">High Scores</div>
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

    <!-- Platform Badge -->
    <div class="flex justify-center mt-8">
      <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full border" :class="platformBadgeClass">
        <img 
          :src="platformLogo" 
          :alt="platformName"
          class="w-5 h-5"
        />
        <span class="text-sm" :class="platformTextClass">{{ platformName }} Fantasy {{ sportName }} • {{ scoringTypeLabel }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { yahooService } from '@/services/yahoo'
import { useAuthStore } from '@/stores/auth'
import html2canvas from 'html2canvas'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const leagueStore = useLeagueStore()
const authStore = useAuthStore()

// Check if ESPN platform - use both activePlatform AND league key format for robustness
const isEspn = computed(() => {
  // Primary check: activePlatform
  if (leagueStore.activePlatform === 'espn') return true
  // Fallback: check if league key starts with 'espn_'
  const leagueKey = leagueStore.currentLeague?.league_id || leagueStore.activeLeagueId
  if (leagueKey && leagueKey.startsWith('espn_')) return true
  return false
})

// Check if Sleeper platform - use both activePlatform AND league key format
const isSleeper = computed(() => {
  // Primary check: activePlatform
  if (leagueStore.activePlatform === 'sleeper') {
    // But make sure it's not ESPN or Yahoo (default is 'sleeper')
    const leagueKey = leagueStore.currentLeague?.league_id || leagueStore.activeLeagueId
    if (leagueKey) {
      if (leagueKey.startsWith('espn_')) return false
      if (/^\d+\.l\.\d+$/.test(leagueKey) || /^[a-z]+\.l\.\d+$/.test(leagueKey)) return false
    }
    return true
  }
  return false
})

// Platform display
const platformName = computed(() => {
  if (isEspn.value) return 'ESPN'
  if (isSleeper.value) return 'Sleeper'
  return 'Yahoo!'
})

const platformLogo = computed(() => {
  if (isEspn.value) return '/espn-logo.svg'
  if (isSleeper.value) return '/sleeper-logo.svg'
  return '/yahoo-fantasy.svg'
})

const platformBadgeClass = computed(() => {
  if (isEspn.value) return 'bg-[#5b8def]/10 border-[#5b8def]/30'
  if (isSleeper.value) return 'bg-[#01b5a5]/10 border-[#01b5a5]/30'
  return 'bg-purple-600/10 border-purple-600/30'
})

const platformTextClass = computed(() => {
  if (isEspn.value) return 'text-[#5b8def]'
  if (isSleeper.value) return 'text-[#01b5a5]'
  return 'text-purple-300'
})

const sportName = computed(() => {
  const saved = leagueStore.savedLeagues.find(l => l.league_id === leagueStore.activeLeagueId)
  const sport = saved?.sport || 'football'
  const names: Record<string, string> = { football: 'Football', baseball: 'Baseball', basketball: 'Basketball', hockey: 'Hockey' }
  return names[sport] || 'Fantasy'
})

// Scoring type label for badge
const scoringTypeLabel = computed(() => {
  const st = (leagueStore.currentLeague?.scoring_type || leagueStore.yahooLeague?.scoring_type || '').toLowerCase()
  if (st.includes('roto')) return 'Roto'
  if (st.includes('point') || st === 'headpoint') return 'H2H Points'
  if (st.includes('head')) return 'H2H Categories'
  return 'H2H Points'
})

// Effective league key - use the actually loaded league (might be previous season)
const effectiveLeagueKey = computed(() => {
  if (leagueStore.currentLeague?.league_id) return leagueStore.currentLeague.league_id
  return leagueStore.activeLeagueId
})

// Current season for display
const currentSeason = computed(() => leagueStore.currentLeague?.season || new Date().getFullYear().toString())
const isSeasonComplete = computed(() => {
  if (leagueStore.currentLeague?.status === 'complete') return true
  return leagueStore.yahooLeague?.is_finished === 1
})

const defaultAvatar = 'https://s.yimg.com/cv/apiv2/default/mlb/mlb_1_100.png'

// State
const isLoading = ref(false)  // Start as false - loadHistoricalData will set to true
const loadingMessage = ref('Initializing...')
const loadingProgress = ref({
  currentStep: '',
  season: '',
  week: 0,
  maxWeek: 0,
  seasonsLoaded: 0,
  totalSeasons: 0
})
const activeHistoryTab = ref('career')
const isDownloadingCareerStats = ref(false)
const isDownloadingSeasonHistory = ref(false)
const isDownloadingH2H = ref(false)

// Modal state
const showRecordModal = ref(false)
const recordModalLabel = ref('')
const isDownloadingRecord = ref(false)

const showAwardModal = ref(false)
const awardModalTitle = ref('')
const awardModalType = ref<'best' | 'worst'>('best')
const isDownloadingAward = ref(false)

// Season Award Modal state
const showSeasonAwardModal = ref(false)
const seasonAwardModalTitle = ref('')
const seasonAwardModalType = ref<'best' | 'worst'>('best')
const isDownloadingSeasonAward = ref(false)

// Weekly Award Modal state
const showWeeklyAwardModal = ref(false)
const weeklyAwardModalTitle = ref('')
const weeklyAwardModalType = ref<'best' | 'worst'>('best')
const isDownloadingWeeklyAward = ref(false)

// Sort state
const sortColumn = ref<string>('wins')
const sortDirection = ref<'asc' | 'desc'>('desc')

// Filter toggles
const showCurrentMembersOnlyCareer = ref(false)
const showCurrentMembersOnlyH2H = ref(false)

// Legacy tab state
const showLegacyExplainer = ref(false)
const includeLegacyPenalties = ref(false)  // Default OFF as requested
const showCurrentMembersOnlyLegacy = ref(false)
const showLegacyModal = ref(false)
const selectedLegacyTeam = ref<any>(null)

// Awards state
const selectedAwardTab = ref<'All-Time' | 'Season' | 'Weekly'>('All-Time')
const selectedAwardSeason = ref<string>('')
const selectedWeeklyAwardSeason = ref<string>('')
const selectedWeeklyAwardWeek = ref<number>(1)
const awardTabs = ['All-Time', 'Season', 'Weekly']

// Refs for downloading
const careerTableRef = ref<HTMLElement | null>(null)
const seasonTableRef = ref<HTMLElement | null>(null)
const h2hTableRef = ref<HTMLElement | null>(null)

// Data
const historicalData = ref<Record<string, any>>({})
const allMatchups = ref<Record<string, Record<number, any[]>>>({}) // season -> week -> matchups
const allTeams = ref<Record<string, any>>({}) // team_key -> team info
const currentMembers = ref<string[]>([])

// Interfaces
interface CareerStat {
  team_key: string
  team_name: string
  logo_url: string
  seasons: number
  championships: number
  wins: number
  losses: number
  win_pct: number
  avg_ppw: number
  total_pf: number
  total_weeks: number
}

interface SeasonRecord {
  season: string
  avg_ppw: number
  high_score: number
  high_scorer: string
  low_score: number
  low_scorer: string
  trade_count: number
  champion: string
}

interface H2HTeam {
  team_key: string
  team_name: string
  logo_url: string
}

interface AwardWinner {
  team_name: string
  logo_url: string
  value: string
  season?: string
  week?: number
  details: string
}

interface Award {
  title: string
  winner: AwardWinner | null
  isShame?: boolean
}

// Computed: Available seasons
const availableSeasons = computed(() => {
  return Object.keys(historicalData.value).sort((a, b) => parseInt(b) - parseInt(a))
})

const availableWeeksForAwards = computed(() => {
  const seasonMatchups = allMatchups.value[selectedWeeklyAwardSeason.value]
  if (!seasonMatchups) return []
  return Object.keys(seasonMatchups).map(w => parseInt(w)).sort((a, b) => a - b)
})

// Computed: Career Records (4 cards)
const careerRecords = computed(() => {
  const stats = careerStats.value
  if (stats.length === 0) return []
  
  const mostWins = [...stats].sort((a, b) => b.wins - a.wins)[0]
  const mostChampionships = [...stats].sort((a, b) => b.championships - a.championships)[0]
  const highestPPW = [...stats].sort((a, b) => b.avg_ppw - a.avg_ppw)[0]
  const mostPoints = [...stats].sort((a, b) => b.total_pf - a.total_pf)[0]
  
  return [
    {
      label: 'Most Wins',
      team: mostWins?.team_name || 'N/A',
      value: mostWins?.wins || 0,
      icon: '🏆',
      detail: `${mostWins?.wins || 0}-${mostWins?.losses || 0} career record`
    },
    {
      label: 'Most Championships',
      team: mostChampionships?.team_name || 'N/A',
      value: mostChampionships?.championships || 0,
      icon: '👑',
      detail: `${mostChampionships?.championships || 0} title(s) won`
    },
    {
      label: 'Highest Avg PPW',
      team: highestPPW?.team_name || 'N/A',
      value: highestPPW?.avg_ppw?.toFixed(1) || '0',
      icon: '📈',
      detail: `${highestPPW?.total_weeks || 0} weeks played`
    },
    {
      label: 'Most Total Points',
      team: mostPoints?.team_name || 'N/A',
      value: mostPoints?.total_pf?.toFixed(0) || '0',
      icon: '💎',
      detail: `Over ${mostPoints?.seasons || 0} season(s)`
    }
  ]
})

// Computed: Career Stats
const careerStats = computed((): CareerStat[] => {
  const statsMap: Record<string, CareerStat> = {}
  
  console.log('Computing career stats from historicalData:', Object.keys(historicalData.value).length, 'seasons')
  
  // Aggregate stats across all seasons
  for (const [season, seasonData] of Object.entries(historicalData.value)) {
    const standings = seasonData.standings || []
    console.log(`Processing ${season} standings:`, standings.length, 'teams')
    
    for (const team of standings) {
      const teamKey = team.team_key
      const existing = statsMap[teamKey]
      
      // Get logo from allTeams (populated from matchups)
      const teamInfo = allTeams.value[teamKey]
      const logoUrl = teamInfo?.logo_url || team.logo_url || ''
      
      console.log(`Team ${team.name}: wins=${team.wins}, losses=${team.losses}, points_for=${team.points_for}, rank=${team.rank}, is_champion=${team.is_champion}`)
      
      if (existing) {
        existing.seasons++
        existing.wins += team.wins || 0
        existing.losses += team.losses || 0
        existing.total_pf += team.points_for || 0
        existing.total_weeks += (team.wins || 0) + (team.losses || 0)
        if (team.is_champion) existing.championships++
        // Update logo if we have one
        if (logoUrl && !existing.logo_url) existing.logo_url = logoUrl
      } else {
        statsMap[teamKey] = {
          team_key: teamKey,
          team_name: team.name || 'Unknown Team',
          logo_url: logoUrl,
          seasons: 1,
          championships: team.is_champion ? 1 : 0,
          wins: team.wins || 0,
          losses: team.losses || 0,
          win_pct: 0,
          avg_ppw: 0,
          total_pf: team.points_for || 0,
          total_weeks: (team.wins || 0) + (team.losses || 0)
        }
      }
    }
  }
  
  console.log('Career stats map size:', Object.keys(statsMap).length)
  
  // Calculate derived stats
  const stats = Object.values(statsMap).map(stat => {
    const totalGames = stat.wins + stat.losses
    stat.win_pct = totalGames > 0 ? stat.wins / totalGames : 0
    stat.avg_ppw = stat.total_weeks > 0 ? stat.total_pf / stat.total_weeks : 0
    return stat
  })
  
  console.log('Final career stats:', stats)
  
  // Sort by current sort column
  return sortStats(stats)
})

// Computed: Filtered career stats (current members only toggle)
const filteredCareerStats = computed(() => {
  if (!showCurrentMembersOnlyCareer.value) return careerStats.value
  return careerStats.value.filter(stat => currentMembers.value.includes(stat.team_key))
})

// Computed: Season Records
const seasonRecords = computed((): SeasonRecord[] => {
  const records: SeasonRecord[] = []
  
  for (const [season, seasonData] of Object.entries(historicalData.value)) {
    const matchups = allMatchups.value[season] || {}
    const standings = seasonData.standings || []
    
    let totalPoints = 0
    let totalWeeks = 0
    let highScore = 0
    let highScorer = ''
    let lowScore = Infinity
    let lowScorer = ''
    
    // Find high/low scores from matchups
    for (const [week, weekMatchups] of Object.entries(matchups)) {
      for (const matchup of weekMatchups as any[]) {
        for (const team of matchup.teams || []) {
          const points = team.points || 0
          totalPoints += points
          totalWeeks++
          
          if (points > highScore) {
            highScore = points
            highScorer = team.name || 'Unknown'
          }
          if (points < lowScore && points > 0) {
            lowScore = points
            lowScorer = team.name || 'Unknown'
          }
        }
      }
    }
    
    // Find champion
    const champion = standings.find((t: any) => t.rank === 1)
    
    records.push({
      season,
      avg_ppw: totalWeeks > 0 ? totalPoints / totalWeeks : 0,
      high_score: highScore,
      high_scorer: highScorer,
      low_score: lowScore === Infinity ? 0 : lowScore,
      low_scorer: lowScorer,
      trade_count: seasonData.trade_count || 0,
      champion: champion?.name || 'TBD'
    })
  }
  
  return records.sort((a, b) => parseInt(b.season) - parseInt(a.season))
})

// Computed: H2H Teams
const h2hTeams = computed((): H2HTeam[] => {
  return Object.values(allTeams.value).map(team => ({
    team_key: team.team_key,
    team_name: team.name || 'Unknown',
    logo_url: team.logo_url || ''
  }))
})

const filteredH2HTeams = computed(() => {
  if (!showCurrentMembersOnlyH2H.value) return h2hTeams.value
  return h2hTeams.value.filter(team => currentMembers.value.includes(team.team_key))
})

// ==================== LEGACY SCORE CALCULATIONS ====================

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
  points_leader_seasons: number
  top_3_scoring_seasons: number
  above_avg_ppw_seasons: number
  // Historic Moments
  season_high_scores: number
  // Longevity
  playoff_streak_max: number
  winning_streak_max: number
  // Penalties (optional)
  last_place_finishes: number
  season_low_scores: number
  scoring_cellar_seasons: number
  losing_seasons: number
  // Breakdown for display
  breakdown: {
    category: string
    items: { label: string; count: number; points: number }[]
    subtotal: number
  }[]
}

// Scoring constants
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
  POINTS_LEADER: 20,
  TOP_3_SCORING: 10,
  ABOVE_AVG_PPW: 5,
  // Historic Moments
  SEASON_HIGH_SCORE: 10,
  // Longevity
  SEASON_PLAYED: 5,
  PLAYOFF_STREAK_3: 15,
  PLAYOFF_STREAK_5: 30,
  WINNING_STREAK_3: 10,
  // Penalties
  LAST_PLACE: -20,
  SEASON_LOW_SCORE: -5,
  SCORING_CELLAR: -10,
  LOSING_SEASON: -5
}

// Computed: Legacy Scores for all teams
const legacyScores = computed((): LegacyScore[] => {
  const teams: Record<string, LegacyScore> = {}
  const seasons = Object.keys(historicalData.value).sort()
  
  if (seasons.length === 0) return []
  
  // First pass: Collect all team data and calculate season-level metrics
  const seasonMetrics: Record<string, {
    standings: any[]
    avgPPW: number
    highScore: { value: number; team_key: string }
    lowScore: { value: number; team_key: string }
    pointsLeader: string
    top3Scorers: string[]
    numTeams: number
    playoffTeamCount: number
  }> = {}
  
  for (const season of seasons) {
    const seasonData = historicalData.value[season]
    const standings = seasonData.standings || []
    const matchups = allMatchups.value[season] || {}
    
    if (standings.length === 0) continue
    
    // Calculate season metrics
    let totalPoints = 0
    let totalWeeks = 0
    let highScore = { value: 0, team_key: '' }
    let lowScore = { value: Infinity, team_key: '' }
    
    for (const [week, weekMatchups] of Object.entries(matchups)) {
      for (const matchup of weekMatchups as any[]) {
        for (const team of matchup.teams || []) {
          const points = team.points || 0
          if (points > 0) {
            totalPoints += points
            totalWeeks++
            if (points > highScore.value) {
              highScore = { value: points, team_key: team.team_key }
            }
            if (points < lowScore.value) {
              lowScore = { value: points, team_key: team.team_key }
            }
          }
        }
      }
    }
    
    const avgPPW = totalWeeks > 0 ? totalPoints / totalWeeks : 0
    
    // Find points leaders
    const sortedByPoints = [...standings].sort((a: any, b: any) => (b.points_for || 0) - (a.points_for || 0))
    const pointsLeader = sortedByPoints[0]?.team_key || ''
    const top3Scorers = sortedByPoints.slice(0, 3).map((t: any) => t.team_key)
    
    // Determine playoff team count
    // Use playoff_seed if available, otherwise use heuristic (top 50% or 6, whichever is smaller)
    const teamsWithPlayoffSeed = standings.filter((t: any) => t.playoff_seed > 0)
    let playoffTeamCount = 6 // default
    
    if (teamsWithPlayoffSeed.length > 0) {
      // ESPN provides playoff_seed
      playoffTeamCount = teamsWithPlayoffSeed.length
    } else {
      // Heuristic: typically top 50% or max 6
      playoffTeamCount = Math.min(Math.floor(standings.length / 2), 6)
    }
    
    seasonMetrics[season] = {
      standings,
      avgPPW,
      highScore,
      lowScore: lowScore.value === Infinity ? { value: 0, team_key: '' } : lowScore,
      pointsLeader,
      top3Scorers,
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
    
    const { standings, avgPPW, highScore, lowScore, pointsLeader, top3Scorers, numTeams, playoffTeamCount } = metrics
    
    // Sort standings by rank for playoff determination
    const sortedStandings = [...standings].sort((a: any, b: any) => (a.rank || 999) - (b.rank || 999))
    
    for (const team of standings) {
      const teamKey = team.team_key
      
      // Initialize team if needed
      if (!teams[teamKey]) {
        teams[teamKey] = {
          team_key: teamKey,
          team_name: team.name || 'Unknown',
          logo_url: team.logo_url || allTeams.value[teamKey]?.logo_url || '',
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
          points_leader_seasons: 0,
          top_3_scoring_seasons: 0,
          above_avg_ppw_seasons: 0,
          season_high_scores: 0,
          playoff_streak_max: 0,
          winning_streak_max: 0,
          last_place_finishes: 0,
          season_low_scores: 0,
          scoring_cellar_seasons: 0,
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
      const pointsFor = team.points_for || 0
      const teamPPW = (wins + losses) > 0 ? pointsFor / (wins + losses) : 0
      
      // Determine if team made playoffs
      // Use playoff_seed if available, otherwise use rank <= playoffTeamCount
      const madePlayoffs = team.playoff_seed > 0 || rank <= playoffTeamCount
      
      // Championships & Playoffs
      if (rank === 1) t.championships++
      if (rank === 2) t.runner_ups++
      if (rank === 3) t.third_places++
      if (madePlayoffs) t.playoff_appearances++
      
      // Check for regular season title (most wins, or if tied, most points)
      const sortedByWins = [...standings].sort((a: any, b: any) => {
        if ((b.wins || 0) !== (a.wins || 0)) return (b.wins || 0) - (a.wins || 0)
        return (b.points_for || 0) - (a.points_for || 0)
      })
      if (sortedByWins[0]?.team_key === teamKey) t.regular_season_titles++
      
      // Season Performance
      t.total_wins += wins
      if (wins > losses) t.winning_seasons++
      if (rank <= 3) t.top_3_finishes++
      if (teamKey === pointsLeader) t.points_leader_seasons++
      if (top3Scorers.includes(teamKey)) t.top_3_scoring_seasons++
      if (teamPPW > avgPPW) t.above_avg_ppw_seasons++
      
      // Historic Moments
      if (teamKey === highScore.team_key) t.season_high_scores++
      
      // Penalties
      if (rank === numTeams) t.last_place_finishes++
      if (teamKey === lowScore.team_key) t.season_low_scores++
      const sortedByPointsAsc = [...standings].sort((a: any, b: any) => (a.points_for || 0) - (b.points_for || 0))
      if (sortedByPointsAsc[0]?.team_key === teamKey) t.scoring_cellar_seasons++
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
      { label: 'Total Wins', count: t.total_wins, points: t.total_wins * LEGACY_POINTS.WIN },
      { label: 'Winning Seasons', count: t.winning_seasons, points: t.winning_seasons * LEGACY_POINTS.WINNING_SEASON },
      { label: 'Top 3 Finishes', count: t.top_3_finishes, points: t.top_3_finishes * LEGACY_POINTS.TOP_3_FINISH }
    ].filter(i => i.count > 0)
    
    const perfSubtotal = perfItems.reduce((sum, i) => sum + i.points, 0)
    if (perfItems.length > 0) {
      breakdown.push({ category: '📈 Season Performance', items: perfItems, subtotal: perfSubtotal })
      total += perfSubtotal
    }
    
    // Scoring Achievements
    const scoreItems = [
      { label: 'Points Leader Seasons', count: t.points_leader_seasons, points: t.points_leader_seasons * LEGACY_POINTS.POINTS_LEADER },
      { label: 'Top 3 Scoring Seasons', count: t.top_3_scoring_seasons, points: t.top_3_scoring_seasons * LEGACY_POINTS.TOP_3_SCORING },
      { label: 'Above Avg PPW Seasons', count: t.above_avg_ppw_seasons, points: t.above_avg_ppw_seasons * LEGACY_POINTS.ABOVE_AVG_PPW },
      { label: 'Weekly High Scores', count: t.season_high_scores, points: t.season_high_scores * LEGACY_POINTS.SEASON_HIGH_SCORE }
    ].filter(i => i.count > 0)
    
    const scoreSubtotal = scoreItems.reduce((sum, i) => sum + i.points, 0)
    if (scoreItems.length > 0) {
      breakdown.push({ category: '⭐ Scoring Achievements', items: scoreItems, subtotal: scoreSubtotal })
      total += scoreSubtotal
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
        { label: 'Lowest Weekly Scores', count: t.season_low_scores, points: t.season_low_scores * LEGACY_POINTS.SEASON_LOW_SCORE },
        { label: 'Scoring Cellar Seasons', count: t.scoring_cellar_seasons, points: t.scoring_cellar_seasons * LEGACY_POINTS.SCORING_CELLAR },
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
  return legacyScores.value.filter(team => currentMembers.value.includes(team.team_key))
})

// Computed: Legacy statistics for summary cards
const totalChampionshipsAwarded = computed(() => {
  return legacyScores.value.reduce((sum, t) => sum + t.championships, 0)
})

const totalPlayoffAppearances = computed(() => {
  return legacyScores.value.reduce((sum, t) => sum + t.playoff_appearances, 0)
})

const totalWeeklyHighScores = computed(() => {
  return legacyScores.value.reduce((sum, t) => sum + t.season_high_scores, 0)
})

const averageLegacyScore = computed(() => {
  if (legacyScores.value.length === 0) return 0
  const total = legacyScores.value.reduce((sum, t) => sum + t.total_score, 0)
  return Math.round(total / legacyScores.value.length)
})

// Helper: Get legacy score color class
function getLegacyScoreColor(score: number): string {
  const max = legacyScores.value[0]?.total_score || 1
  const ratio = score / max
  if (ratio >= 0.9) return 'text-yellow-400'
  if (ratio >= 0.7) return 'text-green-400'
  if (ratio >= 0.5) return 'text-blue-400'
  if (ratio >= 0.3) return 'text-purple-400'
  return 'text-dark-textMuted'
}

// Helper: Get legacy bar width
function getLegacyBarWidth(score: number): string {
  const max = legacyScores.value[0]?.total_score || 1
  return `${(score / max * 100).toFixed(1)}%`
}

// Functions: Legacy modal
function openLegacyModal(team: LegacyScore) {
  selectedLegacyTeam.value = team
  showLegacyModal.value = true
}

function closeLegacyModal() {
  showLegacyModal.value = false
  selectedLegacyTeam.value = null
}

// ==================== END LEGACY SCORE CALCULATIONS ====================

// H2H Records Map
const h2hRecords = ref<Record<string, Record<string, { wins: number; losses: number }>>>({})

// Helper function to find logo by team name
function getLogoByTeamName(teamName: string): string {
  // First check allTeams by iterating values
  for (const team of Object.values(allTeams.value)) {
    if (team.name === teamName) return team.logo_url || ''
  }
  // Also check careerStats
  const stat = careerStats.value.find(s => s.team_name === teamName)
  return stat?.logo_url || ''
}

// Computed: All-Time Awards
const allTimeHallOfFame = computed((): Award[] => {
  const stats = careerStats.value
  if (stats.length === 0) return []
  
  // Find best performers across all matchups
  let highestScore = { value: 0, team: '', teamKey: '', logoUrl: '', season: '', week: 0 }
  let mostWins = { value: 0, team: '', logo: '' }
  let highestPPW = { value: 0, team: '', logo: '' }
  let bestWinPct = { value: 0, team: '', logo: '', record: '' }
  
  // Scan all matchups for highest single-week score
  for (const [season, seasonMatchups] of Object.entries(allMatchups.value)) {
    for (const [week, matchups] of Object.entries(seasonMatchups)) {
      for (const matchup of matchups as any[]) {
        for (const team of matchup.teams || []) {
          if ((team.points || 0) > highestScore.value) {
            highestScore = {
              value: team.points,
              team: team.name,
              teamKey: team.team_key || '',
              logoUrl: team.logo_url || allTeams.value[team.team_key]?.logo_url || '',
              season,
              week: parseInt(week)
            }
          }
        }
      }
    }
  }
  
  // Career stats awards
  const byWins = [...stats].sort((a, b) => b.wins - a.wins)[0]
  const byPPW = [...stats].sort((a, b) => b.avg_ppw - a.avg_ppw)[0]
  const byWinPct = [...stats].filter(s => s.wins + s.losses >= 10).sort((a, b) => b.win_pct - a.win_pct)[0]
  
  return [
    {
      title: 'Highest Single-Week Score',
      winner: highestScore.value > 0 ? {
        team_name: highestScore.team,
        logo_url: highestScore.logoUrl || getLogoByTeamName(highestScore.team),
        value: highestScore.value.toFixed(1),
        season: `${highestScore.season} Week ${highestScore.week}`,
        details: 'All-time best single-week performance'
      } : null
    },
    {
      title: 'Most Career Wins',
      winner: byWins ? {
        team_name: byWins.team_name,
        logo_url: byWins.logo_url || getLogoByTeamName(byWins.team_name),
        value: String(byWins.wins),
        details: `${byWins.wins}-${byWins.losses} career record`
      } : null
    },
    {
      title: 'Highest Career PPW',
      winner: byPPW ? {
        team_name: byPPW.team_name,
        logo_url: byPPW.logo_url || getLogoByTeamName(byPPW.team_name),
        value: byPPW.avg_ppw.toFixed(1),
        details: `Over ${byPPW.total_weeks} weeks`
      } : null
    },
    {
      title: 'Best Win Percentage',
      winner: byWinPct ? {
        team_name: byWinPct.team_name,
        logo_url: byWinPct.logo_url || getLogoByTeamName(byWinPct.team_name),
        value: `${(byWinPct.win_pct * 100).toFixed(1)}%`,
        details: `${byWinPct.wins}-${byWinPct.losses} (min 10 games)`
      } : null
    }
  ]
})

const allTimeHallOfShame = computed((): Award[] => {
  const stats = careerStats.value
  if (stats.length === 0) return []
  
  // Find worst performers
  let lowestScore = { value: Infinity, team: '', teamKey: '', logoUrl: '', season: '', week: 0 }
  
  for (const [season, seasonMatchups] of Object.entries(allMatchups.value)) {
    for (const [week, matchups] of Object.entries(seasonMatchups)) {
      for (const matchup of matchups as any[]) {
        for (const team of matchup.teams || []) {
          if ((team.points || 0) > 0 && (team.points || 0) < lowestScore.value) {
            lowestScore = {
              value: team.points,
              team: team.name,
              teamKey: team.team_key || '',
              logoUrl: team.logo_url || allTeams.value[team.team_key]?.logo_url || '',
              season,
              week: parseInt(week)
            }
          }
        }
      }
    }
  }
  
  const byLosses = [...stats].sort((a, b) => b.losses - a.losses)[0]
  const byLowPPW = [...stats].filter(s => s.total_weeks >= 10).sort((a, b) => a.avg_ppw - b.avg_ppw)[0]
  const byWorstWinPct = [...stats].filter(s => s.wins + s.losses >= 10).sort((a, b) => a.win_pct - b.win_pct)[0]
  
  return [
    {
      title: 'Lowest Single-Week Score',
      winner: lowestScore.value < Infinity ? {
        team_name: lowestScore.team,
        logo_url: lowestScore.logoUrl || getLogoByTeamName(lowestScore.team),
        value: lowestScore.value.toFixed(1),
        season: `${lowestScore.season} Week ${lowestScore.week}`,
        details: 'All-time worst single-week performance'
      } : null
    },
    {
      title: 'Most Career Losses',
      winner: byLosses ? {
        team_name: byLosses.team_name,
        logo_url: byLosses.logo_url || getLogoByTeamName(byLosses.team_name),
        value: String(byLosses.losses),
        details: `${byLosses.wins}-${byLosses.losses} career record`
      } : null
    },
    {
      title: 'Lowest Career PPW',
      winner: byLowPPW ? {
        team_name: byLowPPW.team_name,
        logo_url: byLowPPW.logo_url || getLogoByTeamName(byLowPPW.team_name),
        value: byLowPPW.avg_ppw.toFixed(1),
        details: `Over ${byLowPPW.total_weeks} weeks (min 10)`
      } : null
    },
    {
      title: 'Worst Win Percentage',
      winner: byWorstWinPct ? {
        team_name: byWorstWinPct.team_name,
        logo_url: byWorstWinPct.logo_url || getLogoByTeamName(byWorstWinPct.team_name),
        value: `${(byWorstWinPct.win_pct * 100).toFixed(1)}%`,
        details: `${byWorstWinPct.wins}-${byWorstWinPct.losses} (min 10 games)`
      } : null
    }
  ]
})

// League display name
const leagueDisplayName = computed(() => {
  const league = leagueStore.yahooLeague
  if (Array.isArray(league)) return league[0]?.name || 'Fantasy League'
  return league?.name || 'Fantasy League'
})

// Record Modal Rankings
const recordModalRankings = computed(() => getRecordRankings(recordModalLabel.value))

// Award Modal Rankings
const awardModalRankings = computed(() => getAwardRankings(awardModalTitle.value, awardModalType.value))

// Season Award Modal Rankings
const seasonAwardModalRankings = computed(() => getSeasonAwardRankings(seasonAwardModalTitle.value, seasonAwardModalType.value))

// Weekly Award Modal Rankings  
const weeklyAwardModalRankings = computed(() => getWeeklyAwardRankings(weeklyAwardModalTitle.value, weeklyAwardModalType.value))

// Get rankings for career records
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
    case 'Most Wins':
      sorted = [...stats].sort((a, b) => b.wins - a.wins)
      return sorted.map((s, idx) => ({
        rank: idx + 1,
        team_name: s.team_name,
        logo_url: s.logo_url,
        value: s.wins,
        detail: `${s.wins}-${s.losses} record`
      }))
    case 'Highest PPW':
    case 'Highest Avg PPW':
      sorted = [...stats].sort((a, b) => b.avg_ppw - a.avg_ppw)
      return sorted.map((s, idx) => ({
        rank: idx + 1,
        team_name: s.team_name,
        logo_url: s.logo_url,
        value: s.avg_ppw.toFixed(1),
        detail: `${s.total_weeks} weeks`
      }))
    case 'Most Total Points':
      sorted = [...stats].sort((a, b) => b.total_pf - a.total_pf)
      return sorted.map((s, idx) => ({
        rank: idx + 1,
        team_name: s.team_name,
        logo_url: s.logo_url,
        value: s.total_pf.toFixed(0),
        detail: `Over ${s.seasons} season(s)`
      }))
    default:
      return []
  }
}

// Get rankings for awards
function getAwardRankings(awardTitle: string, type: 'best' | 'worst'): any[] {
  const stats = careerStats.value
  if (stats.length === 0) return []
  
  // Helper to find logo by team name
  const getLogoByName = (teamName: string): string => {
    for (const team of Object.values(allTeams.value)) {
      if (team.name === teamName) return team.logo_url || ''
    }
    // Also check careerStats
    const stat = stats.find(s => s.team_name === teamName)
    return stat?.logo_url || ''
  }
  
  switch (awardTitle) {
    case 'Highest Single-Week Score':
    case 'Lowest Single-Week Score': {
      // Collect all weekly scores
      const weeklyScores: any[] = []
      for (const [season, seasonMatchups] of Object.entries(allMatchups.value)) {
        for (const [week, matchups] of Object.entries(seasonMatchups)) {
          for (const matchup of matchups as any[]) {
            for (const team of matchup.teams || []) {
              if ((team.points || 0) > 0) {
                weeklyScores.push({
                  team_name: team.name,
                  team_key: team.team_key,
                  logo_url: team.logo_url || allTeams.value[team.team_key]?.logo_url || getLogoByName(team.name),
                  value: (team.points || 0).toFixed(1),
                  detail: `${season} Week ${week}`
                })
              }
            }
          }
        }
      }
      if (type === 'best') {
        weeklyScores.sort((a, b) => parseFloat(b.value) - parseFloat(a.value))
      } else {
        weeklyScores.sort((a, b) => parseFloat(a.value) - parseFloat(b.value))
      }
      return weeklyScores.slice(0, 10)
    }
    case 'Most Career Wins':
    case 'Most Career Losses': {
      const sorted = type === 'best' 
        ? [...stats].sort((a, b) => b.wins - a.wins)
        : [...stats].sort((a, b) => b.losses - a.losses)
      return sorted.slice(0, 10).map(s => ({
        team_name: s.team_name,
        logo_url: s.logo_url || getLogoByName(s.team_name),
        value: type === 'best' ? String(s.wins) : String(s.losses),
        detail: `${s.wins}-${s.losses} career record`
      }))
    }
    case 'Highest Career PPW':
    case 'Lowest Career PPW': {
      const filtered = stats.filter(s => s.total_weeks >= 10)
      const sorted = type === 'best'
        ? [...filtered].sort((a, b) => b.avg_ppw - a.avg_ppw)
        : [...filtered].sort((a, b) => a.avg_ppw - b.avg_ppw)
      return sorted.slice(0, 10).map(s => ({
        team_name: s.team_name,
        logo_url: s.logo_url || getLogoByName(s.team_name),
        value: s.avg_ppw.toFixed(1),
        detail: `Over ${s.total_weeks} weeks`
      }))
    }
    case 'Best Win Percentage':
    case 'Worst Win Percentage': {
      const filtered = stats.filter(s => s.wins + s.losses >= 10)
      const sorted = type === 'best'
        ? [...filtered].sort((a, b) => b.win_pct - a.win_pct)
        : [...filtered].sort((a, b) => a.win_pct - b.win_pct)
      return sorted.slice(0, 10).map(s => ({
        team_name: s.team_name,
        logo_url: s.logo_url || getLogoByName(s.team_name),
        value: `${(s.win_pct * 100).toFixed(1)}%`,
        detail: `${s.wins}-${s.losses} (min 10 games)`
      }))
    }
    default:
      return []
  }
}

// Bar width calculations
function getRecordBarWidth(value: any, recordType: string): string {
  const rankings = recordModalRankings.value
  if (rankings.length === 0) return '0%'
  const maxVal = parseFloat(String(rankings[0].value))
  const currVal = parseFloat(String(value))
  if (maxVal === 0) return '0%'
  return `${(currVal / maxVal * 100).toFixed(1)}%`
}

function getAwardBarWidth(value: any, title: string, type: 'best' | 'worst'): string {
  const rankings = awardModalRankings.value
  if (rankings.length === 0) return '0%'
  const vals = rankings.map(r => parseFloat(String(r.value).replace('%', '')))
  const maxVal = Math.max(...vals)
  const minVal = Math.min(...vals)
  const currVal = parseFloat(String(value).replace('%', ''))
  
  if (type === 'best') {
    if (maxVal === 0) return '0%'
    return `${(currVal / maxVal * 100).toFixed(1)}%`
  } else {
    // For worst, invert - lower is "better" (more extreme)
    const range = maxVal - minVal
    if (range === 0) return '100%'
    return `${((maxVal - currVal) / range * 100 + 10).toFixed(1)}%`
  }
}

// Get rankings for season awards
function getSeasonAwardRankings(awardTitle: string, type: 'best' | 'worst'): any[] {
  const season = selectedAwardSeason.value
  if (!season) return []
  
  const seasonData = historicalData.value[season]
  const matchups = allMatchups.value[season]
  if (!seasonData || !matchups) return []
  
  const standings = seasonData.standings || []
  
  switch (awardTitle) {
    case 'Season High Score':
    case 'Season Low Score': {
      const weeklyScores: any[] = []
      for (const [week, weekMatchups] of Object.entries(matchups)) {
        for (const matchup of weekMatchups as any[]) {
          for (const team of matchup.teams || []) {
            if ((team.points || 0) > 0) {
              weeklyScores.push({
                team_name: team.name,
                logo_url: team.logo_url || allTeams.value[team.team_key]?.logo_url || getLogoByTeamName(team.name),
                value: (team.points || 0).toFixed(1),
                detail: `Week ${week}`
              })
            }
          }
        }
      }
      if (type === 'best') {
        weeklyScores.sort((a, b) => parseFloat(b.value) - parseFloat(a.value))
      } else {
        weeklyScores.sort((a, b) => parseFloat(a.value) - parseFloat(b.value))
      }
      return weeklyScores.slice(0, 10)
    }
    case 'Most Wins':
    case 'Most Losses': {
      const sorted = type === 'best'
        ? [...standings].sort((a: any, b: any) => (b.wins || 0) - (a.wins || 0))
        : [...standings].sort((a: any, b: any) => (b.losses || 0) - (a.losses || 0))
      return sorted.slice(0, 10).map((s: any) => ({
        team_name: s.name,
        logo_url: s.logo_url || getLogoByTeamName(s.name),
        value: type === 'best' ? String(s.wins || 0) : String(s.losses || 0),
        detail: `${s.wins || 0}-${s.losses || 0} record`
      }))
    }
    case 'Most Points Scored':
    case 'Fewest Points Scored': {
      const sorted = type === 'best'
        ? [...standings].sort((a: any, b: any) => (b.points_for || 0) - (a.points_for || 0))
        : [...standings].sort((a: any, b: any) => (a.points_for || 0) - (b.points_for || 0))
      return sorted.slice(0, 10).map((s: any) => ({
        team_name: s.name,
        logo_url: s.logo_url || getLogoByTeamName(s.name),
        value: (s.points_for || 0).toFixed(1),
        detail: 'Regular season total'
      }))
    }
    default:
      return []
  }
}

// Get rankings for weekly awards
function getWeeklyAwardRankings(awardTitle: string, type: 'best' | 'worst'): any[] {
  const season = selectedWeeklyAwardSeason.value
  const week = selectedWeeklyAwardWeek.value
  if (!season || !week) return []
  
  const seasonMatchups = allMatchups.value[season]
  if (!seasonMatchups) return []
  
  const weekMatchups = seasonMatchups[week] || []
  
  // Collect all scores for the week
  const scores: any[] = []
  for (const matchup of weekMatchups) {
    const teams = matchup.teams || []
    for (const team of teams) {
      if ((team.points || 0) > 0) {
        scores.push({
          team_name: team.name,
          logo_url: team.logo_url || allTeams.value[team.team_key]?.logo_url || getLogoByTeamName(team.name),
          value: (team.points || 0).toFixed(1),
          detail: `${season} Week ${week}`
        })
      }
    }
  }
  
  switch (awardTitle) {
    case 'Week High Score':
      scores.sort((a, b) => parseFloat(b.value) - parseFloat(a.value))
      return scores.slice(0, 10)
    case 'Week Low Score':
      scores.sort((a, b) => parseFloat(a.value) - parseFloat(b.value))
      return scores.slice(0, 10)
    case 'Biggest Blowout':
    case 'Closest Game': {
      const margins: any[] = []
      for (const matchup of weekMatchups) {
        const teams = matchup.teams || []
        if (teams.length === 2) {
          const [t1, t2] = teams
          const p1 = t1.points || 0
          const p2 = t2.points || 0
          const margin = Math.abs(p1 - p2)
          const winner = p1 > p2 ? t1 : t2
          const loser = p1 > p2 ? t2 : t1
          margins.push({
            team_name: winner.name,
            logo_url: winner.logo_url || allTeams.value[winner.team_key]?.logo_url || getLogoByTeamName(winner.name),
            value: margin.toFixed(1),
            detail: `defeated ${loser.name}`
          })
        }
      }
      if (awardTitle === 'Biggest Blowout') {
        margins.sort((a, b) => parseFloat(b.value) - parseFloat(a.value))
      } else {
        margins.sort((a, b) => parseFloat(a.value) - parseFloat(b.value))
      }
      return margins.slice(0, 10)
    }
    default:
      return []
  }
}

function getSeasonAwardBarWidth(value: any, title: string, type: 'best' | 'worst'): string {
  const rankings = seasonAwardModalRankings.value
  if (rankings.length === 0) return '0%'
  const vals = rankings.map(r => parseFloat(String(r.value).replace('%', '')))
  const maxVal = Math.max(...vals)
  const minVal = Math.min(...vals)
  const currVal = parseFloat(String(value).replace('%', ''))
  
  if (type === 'best') {
    if (maxVal === 0) return '0%'
    return `${(currVal / maxVal * 100).toFixed(1)}%`
  } else {
    const range = maxVal - minVal
    if (range === 0) return '100%'
    return `${((maxVal - currVal) / range * 100 + 10).toFixed(1)}%`
  }
}

function getWeeklyAwardBarWidth(value: any): string {
  const rankings = weeklyAwardModalRankings.value
  if (rankings.length === 0) return '0%'
  const vals = rankings.map(r => parseFloat(String(r.value)))
  const maxVal = Math.max(...vals)
  const currVal = parseFloat(String(value))
  if (maxVal === 0) return '0%'
  return `${(currVal / maxVal * 100).toFixed(1)}%`
}

// Modal functions
function openRecordModal(label: string) {
  recordModalLabel.value = label
  showRecordModal.value = true
}

function closeRecordModal() {
  showRecordModal.value = false
}

function openAwardModal(title: string, type: 'best' | 'worst') {
  awardModalTitle.value = title
  awardModalType.value = type
  showAwardModal.value = true
}

function closeAwardModal() {
  showAwardModal.value = false
}

function openSeasonAwardModal(title: string, type: 'best' | 'worst') {
  seasonAwardModalTitle.value = title
  seasonAwardModalType.value = type
  showSeasonAwardModal.value = true
}

function closeSeasonAwardModal() {
  showSeasonAwardModal.value = false
}

function openWeeklyAwardModal(title: string, type: 'best' | 'worst') {
  weeklyAwardModalTitle.value = title
  weeklyAwardModalType.value = type
  showWeeklyAwardModal.value = true
}

function closeWeeklyAwardModal() {
  showWeeklyAwardModal.value = false
}

// Computed: Season Awards
const seasonHallOfFame = computed((): Award[] => {
  const season = selectedAwardSeason.value
  if (!season) return []
  
  const seasonData = historicalData.value[season]
  const matchups = allMatchups.value[season]
  if (!seasonData || !matchups) return []
  
  const standings = seasonData.standings || []
  
  // Find high score for season
  let highScore = { value: 0, team: '', teamKey: '', logoUrl: '', week: 0 }
  for (const [week, weekMatchups] of Object.entries(matchups)) {
    for (const matchup of weekMatchups as any[]) {
      for (const team of matchup.teams || []) {
        if ((team.points || 0) > highScore.value) {
          highScore = { 
            value: team.points, 
            team: team.name, 
            teamKey: team.team_key || '',
            logoUrl: team.logo_url || allTeams.value[team.team_key]?.logo_url || '',
            week: parseInt(week) 
          }
        }
      }
    }
  }
  
  const byWins = [...standings].sort((a: any, b: any) => (b.wins || 0) - (a.wins || 0))[0]
  const byPoints = [...standings].sort((a: any, b: any) => (b.points_for || 0) - (a.points_for || 0))[0]
  
  return [
    {
      title: 'Season High Score',
      winner: highScore.value > 0 ? {
        team_name: highScore.team,
        logo_url: highScore.logoUrl || getLogoByTeamName(highScore.team),
        value: highScore.value.toFixed(1),
        details: `Week ${highScore.week}`
      } : null
    },
    {
      title: 'Most Wins',
      winner: byWins ? {
        team_name: byWins.name,
        logo_url: byWins.logo_url || getLogoByTeamName(byWins.name),
        value: String(byWins.wins || 0),
        details: `${byWins.wins}-${byWins.losses} record`
      } : null
    },
    {
      title: 'Most Points Scored',
      winner: byPoints ? {
        team_name: byPoints.name,
        logo_url: byPoints.logo_url || getLogoByTeamName(byPoints.name),
        value: (byPoints.points_for || 0).toFixed(1),
        details: 'Regular season total'
      } : null
    }
  ]
})

const seasonHallOfShame = computed((): Award[] => {
  const season = selectedAwardSeason.value
  if (!season) return []
  
  const seasonData = historicalData.value[season]
  const matchups = allMatchups.value[season]
  if (!seasonData || !matchups) return []
  
  const standings = seasonData.standings || []
  
  // Find low score for season
  let lowScore = { value: Infinity, team: '', teamKey: '', logoUrl: '', week: 0 }
  for (const [week, weekMatchups] of Object.entries(matchups)) {
    for (const matchup of weekMatchups as any[]) {
      for (const team of matchup.teams || []) {
        if ((team.points || 0) > 0 && (team.points || 0) < lowScore.value) {
          lowScore = { 
            value: team.points, 
            team: team.name, 
            teamKey: team.team_key || '',
            logoUrl: team.logo_url || allTeams.value[team.team_key]?.logo_url || '',
            week: parseInt(week) 
          }
        }
      }
    }
  }
  
  const byLosses = [...standings].sort((a: any, b: any) => (b.losses || 0) - (a.losses || 0))[0]
  const byLeastPoints = [...standings].sort((a: any, b: any) => (a.points_for || 0) - (b.points_for || 0))[0]
  
  return [
    {
      title: 'Season Low Score',
      winner: lowScore.value < Infinity ? {
        team_name: lowScore.team,
        logo_url: lowScore.logoUrl || getLogoByTeamName(lowScore.team),
        value: lowScore.value.toFixed(1),
        details: `Week ${lowScore.week}`
      } : null
    },
    {
      title: 'Most Losses',
      winner: byLosses ? {
        team_name: byLosses.name,
        logo_url: byLosses.logo_url || getLogoByTeamName(byLosses.name),
        value: String(byLosses.losses || 0),
        details: `${byLosses.wins}-${byLosses.losses} record`
      } : null
    },
    {
      title: 'Fewest Points Scored',
      winner: byLeastPoints ? {
        team_name: byLeastPoints.name,
        logo_url: byLeastPoints.logo_url || getLogoByTeamName(byLeastPoints.name),
        value: (byLeastPoints.points_for || 0).toFixed(1),
        details: 'Regular season total'
      } : null
    }
  ]
})

// Computed: Weekly Awards
const weeklyAwards = computed((): Award[] => {
  const season = selectedWeeklyAwardSeason.value
  const week = selectedWeeklyAwardWeek.value
  if (!season || !week) return []
  
  const seasonMatchups = allMatchups.value[season]
  if (!seasonMatchups) return []
  
  const weekMatchups = seasonMatchups[week] || []
  
  let highScore = { value: 0, team: '', logo: '' }
  let lowScore = { value: Infinity, team: '', logo: '' }
  let biggestBlowout = { margin: 0, winner: '', loser: '' }
  let closestGame = { margin: Infinity, winner: '', loser: '' }
  
  for (const matchup of weekMatchups) {
    const teams = matchup.teams || []
    if (teams.length !== 2) continue
    
    const [team1, team2] = teams
    const points1 = team1.points || 0
    const points2 = team2.points || 0
    
    // High/low scores
    if (points1 > highScore.value) {
      highScore = { value: points1, team: team1.name, logo: team1.logo_url || '' }
    }
    if (points2 > highScore.value) {
      highScore = { value: points2, team: team2.name, logo: team2.logo_url || '' }
    }
    if (points1 > 0 && points1 < lowScore.value) {
      lowScore = { value: points1, team: team1.name, logo: team1.logo_url || '' }
    }
    if (points2 > 0 && points2 < lowScore.value) {
      lowScore = { value: points2, team: team2.name, logo: team2.logo_url || '' }
    }
    
    // Margin
    const margin = Math.abs(points1 - points2)
    const winner = points1 > points2 ? team1.name : team2.name
    const loser = points1 > points2 ? team2.name : team1.name
    
    if (margin > biggestBlowout.margin) {
      biggestBlowout = { margin, winner, loser }
    }
    if (margin < closestGame.margin && margin > 0) {
      closestGame = { margin, winner, loser }
    }
  }
  
  return [
    {
      title: 'Week High Score',
      winner: highScore.value > 0 ? {
        team_name: highScore.team,
        logo_url: highScore.logo,
        value: highScore.value.toFixed(1),
        details: 'Best performance of the week'
      } : null,
      isShame: false
    },
    {
      title: 'Week Low Score',
      winner: lowScore.value < Infinity ? {
        team_name: lowScore.team,
        logo_url: lowScore.logo,
        value: lowScore.value.toFixed(1),
        details: 'Worst performance of the week'
      } : null,
      isShame: true
    },
    {
      title: 'Biggest Blowout',
      winner: biggestBlowout.margin > 0 ? {
        team_name: biggestBlowout.winner,
        logo_url: '',
        value: biggestBlowout.margin.toFixed(1),
        details: `defeated ${biggestBlowout.loser}`
      } : null,
      isShame: false
    },
    {
      title: 'Closest Game',
      winner: closestGame.margin < Infinity ? {
        team_name: closestGame.winner,
        logo_url: '',
        value: closestGame.margin.toFixed(1),
        details: `narrowly beat ${closestGame.loser}`
      } : null,
      isShame: false
    }
  ]
})

// Methods
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
    let aVal: number, bVal: number
    
    switch (sortColumn.value) {
      case 'seasons':
        aVal = a.seasons; bVal = b.seasons; break
      case 'championships':
        aVal = a.championships; bVal = b.championships; break
      case 'wins':
        aVal = a.wins; bVal = b.wins; break
      case 'win_pct':
        aVal = a.win_pct; bVal = b.win_pct; break
      case 'avg_ppw':
        aVal = a.avg_ppw; bVal = b.avg_ppw; break
      case 'total_pf':
        aVal = a.total_pf; bVal = b.total_pf; break
      default:
        aVal = a.wins; bVal = b.wins
    }
    
    return sortDirection.value === 'asc' ? aVal - bVal : bVal - aVal
  })
}

function getRecordClass(stat: CareerStat, field: string): string {
  const stats = filteredCareerStats.value
  if (stats.length < 2) return 'text-dark-text'
  
  let values: number[]
  switch (field) {
    case 'wins':
      values = stats.map(s => s.wins); break
    case 'win_pct':
      values = stats.map(s => s.win_pct); break
    case 'avg_ppw':
      values = stats.map(s => s.avg_ppw); break
    case 'total_pf':
      values = stats.map(s => s.total_pf); break
    default:
      return 'text-dark-text'
  }
  
  const max = Math.max(...values)
  const min = Math.min(...values)
  const statValue = field === 'wins' ? stat.wins : 
                    field === 'win_pct' ? stat.win_pct :
                    field === 'avg_ppw' ? stat.avg_ppw : stat.total_pf
  
  if (statValue === max) return 'text-green-400 font-bold'
  if (statValue === min) return 'text-red-400 font-bold'
  return 'text-dark-text'
}

function getH2HRecord(team1Key: string, team2Key: string): string {
  const team1Records = h2hRecords.value[team1Key]
  if (!team1Records) return '0-0'
  const record = team1Records[team2Key]
  if (!record) return '0-0'
  return `${record.wins}-${record.losses}`
}

function getH2HCellClass(team1Key: string, team2Key: string): string {
  if (team1Key === team2Key) return 'bg-dark-border/50'
  
  const team1Records = h2hRecords.value[team1Key]
  if (!team1Records) return ''
  const record = team1Records[team2Key]
  if (!record) return ''
  
  if (record.wins > record.losses) return 'bg-green-500/20 text-green-400'
  if (record.losses > record.wins) return 'bg-red-500/20 text-red-400'
  return 'bg-yellow-500/10 text-yellow-400'
}

function handleImageError(e: Event) {
  const img = e.target as HTMLImageElement
  img.src = defaultAvatar
}

// Download record rankings image
async function downloadRecordRankings(recordType: string) {
  isDownloadingRecord.value = true
  try {
    // Get league name
    const activeId = leagueStore.activeLeagueId
    const savedLeague = leagueStore.savedLeagues?.find((l: any) => l.league_id === activeId?.split('.l.')[1])
    const leagueName = savedLeague?.league_name || leagueStore.yahooLeague?.name || 'Fantasy League'
    
    const rankings = recordModalRankings.value.slice(0, 10)
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
      if (recordType.includes('Championships')) return 'Titles'
      if (recordType.includes('PPW')) return 'PPW'
      if (recordType.includes('Points')) return 'Points'
      if (recordType.includes('Wins')) return 'Wins'
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
            <div style="width: 20px; text-align: center; font-weight: bold; font-size: 12px; color: ${idx === 0 ? '#F5C451' : '#6b7280'};">${idx + 1}</div>
            <img src="${imageMap.get(team.team_name) || createPlaceholder(team.team_name)}" style="width: 28px; height: 28px; border-radius: 50%;" />
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 12px; font-weight: 600; color: #e5e7eb; margin-bottom: 5px;">${team.team_name}</div>
              <div style="height: 6px; background: rgba(58, 61, 82, 0.5); border-radius: 3px; overflow: hidden;">
                <div style="height: 100%; width: ${barWidth}%; background: #F5C451; opacity: ${idx === 0 ? 1 : 0.6}; border-radius: 3px;"></div>
              </div>
            </div>
            <div style="width: 65px; text-align: right;">
              <div style="font-size: 13px; font-weight: bold; color: ${idx === 0 ? '#F5C451' : '#e5e7eb'};">${team.value}</div>
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
            <div style="font-size: 17px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.1;">${recordType}</div>
            <div style="font-size: 12px; margin-top: 2px;">
              <span style="color: #e5e7eb;">${leagueName}</span>
              <span style="color: #6b7280; margin: 0 4px;">•</span>
              <span style="color: #facc15; font-weight: 600;">All-Time</span>
            </div>
          </div>
        </div>
        
        <!-- Featured Leader -->
        <div style="padding: 12px 16px; background: linear-gradient(135deg, rgba(245, 196, 81, 0.15) 0%, transparent 100%); border-bottom: 1px solid rgba(245, 196, 81, 0.2);">
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="${imageMap.get(leader.team_name) || createPlaceholder(leader.team_name)}" style="width: 44px; height: 44px; border-radius: 50%; border: 2px solid rgba(245, 196, 81, 0.5);" />
            <div style="flex: 1;">
              <div style="font-size: 15px; font-weight: bold; color: #ffffff;">${leader.team_name}</div>
              <div style="font-size: 11px; color: #9ca3af;">${leader.detail || ''}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 26px; font-weight: 900; color: #F5C451;">${leader.value}</div>
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
    link.download = `career-${recordType.toLowerCase().replace(/\s+/g, '-')}.png`
    link.href = finalCanvas.toDataURL('image/png')
    link.click()
  } finally {
    isDownloadingRecord.value = false
  }
}

// Download award rankings image
async function downloadAwardRankings(awardTitle: string, type: 'best' | 'worst') {
  isDownloadingAward.value = true
  try {
    // Get league name
    const activeId = leagueStore.activeLeagueId
    const savedLeague = leagueStore.savedLeagues?.find((l: any) => l.league_id === activeId?.split('.l.')[1])
    const leagueName = savedLeague?.league_name || leagueStore.yahooLeague?.name || 'Fantasy League'
    
    const rankings = awardModalRankings.value.slice(0, 10)
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
    
    // Colors based on type
    const colorMain = type === 'best' ? '#22c55e' : '#ef4444'
    const colorLight = type === 'best' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)'
    const colorBorder = type === 'best' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'
    
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
        ctx.fillStyle = colorMain
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
      const uniqueKey = team.team_name + (team.detail || '')
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
        imageMap.set(uniqueKey, await loadPromise)
      } catch {
        imageMap.set(uniqueKey, createPlaceholder(team.team_name))
      }
    }
    
    const maxValue = Math.max(...rankings.map(r => {
      if (typeof r.value === 'string') {
        if (r.value.includes('%')) return parseFloat(r.value.replace('%', ''))
        return parseFloat(r.value) || 0
      }
      return r.value || 0
    }))
    
    // Get value unit descriptor
    const getValueUnit = (): string => {
      if (awardTitle.includes('Score')) return 'Points'
      if (awardTitle.includes('Wins')) return 'Wins'
      if (awardTitle.includes('Losses')) return 'Losses'
      if (awardTitle.includes('PPW')) return 'PPW'
      if (awardTitle.includes('Percentage')) return 'Win %'
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
        const uniqueKey = team.team_name + (team.detail || '')
        
        return `
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
            <div style="width: 20px; text-align: center; font-weight: bold; font-size: 12px; color: ${idx === 0 ? colorMain : '#6b7280'};">${idx + 1}</div>
            <img src="${imageMap.get(uniqueKey) || createPlaceholder(team.team_name)}" style="width: 28px; height: 28px; border-radius: 50%;" />
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 12px; font-weight: 600; color: #e5e7eb; margin-bottom: 5px;">${team.team_name} <span style="color: #6b7280; font-weight: 400;">${team.detail || ''}</span></div>
              <div style="height: 6px; background: rgba(58, 61, 82, 0.5); border-radius: 3px; overflow: hidden;">
                <div style="height: 100%; width: ${barWidth}%; background: ${colorMain}; opacity: ${idx === 0 ? 1 : 0.6}; border-radius: 3px;"></div>
              </div>
            </div>
            <div style="width: 65px; text-align: right;">
              <div style="font-size: 13px; font-weight: bold; color: ${idx === 0 ? colorMain : '#e5e7eb'};">${team.value}</div>
              <div style="font-size: 9px; color: #6b7280; margin-top: 1px;">${valueUnit}</div>
            </div>
          </div>
        `
      }).join('')
    }
    
    const container = document.createElement('div')
    container.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 480px; font-family: system-ui, -apple-system, sans-serif;'
    
    const leaderUniqueKey = leader.team_name + (leader.detail || '')
    
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
            <div style="font-size: 17px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.1;">${awardTitle}</div>
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
            <img src="${imageMap.get(leaderUniqueKey) || createPlaceholder(leader.team_name)}" style="width: 44px; height: 44px; border-radius: 50%; border: 2px solid ${colorBorder};" />
            <div style="flex: 1;">
              <div style="font-size: 15px; font-weight: bold; color: #ffffff;">${leader.team_name}</div>
              <div style="font-size: 11px; color: #9ca3af;">${leader.detail || ''}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 26px; font-weight: 900; color: ${colorMain};">${leader.value}</div>
              <div style="font-size: 10px; color: #6b7280;">${valueUnit}</div>
            </div>
          </div>
        </div>
        
        <!-- Rankings List -->
        <div style="padding: 12px 16px;">
          <div style="font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">${type === 'best' ? 'Top' : 'Bottom'} Ten Comparison</div>
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
    link.download = `${awardTitle.toLowerCase().replace(/\s+/g, '-')}-${type}.png`
    link.href = finalCanvas.toDataURL('image/png')
    link.click()
  } finally {
    isDownloadingAward.value = false
  }
}

async function downloadSeasonAwardRankings(awardTitle: string, type: 'best' | 'worst') {
  isDownloadingSeasonAward.value = true
  try {
    const activeId = leagueStore.activeLeagueId
    const savedLeague = leagueStore.savedLeagues?.find((l: any) => l.league_id === activeId?.split('.l.')[1])
    const leagueName = savedLeague?.league_name || leagueStore.yahooLeague?.name || 'Fantasy League'
    
    const rankings = seasonAwardModalRankings.value.slice(0, 10)
    if (rankings.length === 0) {
      isDownloadingSeasonAward.value = false
      return
    }
    
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
    
    const colorMain = type === 'best' ? '#22c55e' : '#ef4444'
    const colorLight = type === 'best' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)'
    const colorBorder = type === 'best' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'
    
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
        ctx.fillStyle = colorMain
        ctx.font = 'bold 28px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(name.charAt(0).toUpperCase(), 32, 34)
      }
      return canvas.toDataURL('image/png')
    }
    
    const logoBase64 = await loadLogo()
    const leader = rankings[0]
    
    const imageMap = new Map<string, string>()
    for (const team of rankings) {
      const uniqueKey = team.team_name + (team.detail || '')
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
        imageMap.set(uniqueKey, await loadPromise)
      } catch {
        imageMap.set(uniqueKey, createPlaceholder(team.team_name))
      }
    }
    
    const maxValue = Math.max(...rankings.map(r => parseFloat(String(r.value).replace('%', '')) || 0))
    
    const getValueUnit = (): string => {
      if (awardTitle.includes('Score')) return 'Points'
      if (awardTitle.includes('Wins')) return 'Wins'
      if (awardTitle.includes('Losses')) return 'Losses'
      if (awardTitle.includes('Points')) return 'Points'
      return ''
    }
    const valueUnit = getValueUnit()
    
    const generateRows = () => {
      return rankings.map((team, idx) => {
        let numValue = parseFloat(String(team.value).replace('%', '')) || 0
        const barWidth = maxValue > 0 ? (numValue / maxValue) * 100 : 0
        const uniqueKey = team.team_name + (team.detail || '')
        
        return `
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
            <div style="width: 20px; text-align: center; font-weight: bold; font-size: 12px; color: ${idx === 0 ? colorMain : '#6b7280'};">${idx + 1}</div>
            <img src="${imageMap.get(uniqueKey) || createPlaceholder(team.team_name)}" style="width: 28px; height: 28px; border-radius: 50%;" />
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 12px; font-weight: 600; color: #e5e7eb; margin-bottom: 5px;">${team.team_name} <span style="color: #6b7280; font-weight: 400;">${team.detail || ''}</span></div>
              <div style="height: 6px; background: rgba(58, 61, 82, 0.5); border-radius: 3px; overflow: hidden;">
                <div style="height: 100%; width: ${barWidth}%; background: ${colorMain}; opacity: ${idx === 0 ? 1 : 0.6}; border-radius: 3px;"></div>
              </div>
            </div>
            <div style="width: 65px; text-align: right;">
              <div style="font-size: 13px; font-weight: bold; color: ${idx === 0 ? colorMain : '#e5e7eb'};">${team.value}</div>
              <div style="font-size: 9px; color: #6b7280; margin-top: 1px;">${valueUnit}</div>
            </div>
          </div>
        `
      }).join('')
    }
    
    const container = document.createElement('div')
    container.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 480px; font-family: system-ui, -apple-system, sans-serif;'
    
    const leaderUniqueKey = leader.team_name + (leader.detail || '')
    
    container.innerHTML = `
      <div style="background: linear-gradient(160deg, #0f1219 0%, #0a0c14 50%, #0d1117 100%); border-radius: 16px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); position: relative; overflow: hidden;">
        
        <div style="background: #facc15; padding: 8px 20px; text-align: center;">
          <span style="font-size: 12px; font-weight: 700; color: #0a0c14; text-transform: uppercase; letter-spacing: 2px;">Ultimate Fantasy Dashboard</span>
        </div>
        
        <div style="display: flex; align-items: center; padding: 10px 16px; border-bottom: 1px solid rgba(250, 204, 21, 0.2);">
          ${logoBase64 ? `<img src="${logoBase64}" style="height: 40px; width: auto; flex-shrink: 0; margin-right: 12px; margin-top: 4px;" />` : ''}
          <div style="flex: 1;">
            <div style="font-size: 17px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.1;">${awardTitle}</div>
            <div style="font-size: 12px; margin-top: 2px;">
              <span style="color: #e5e7eb;">${leagueName}</span>
              <span style="color: #6b7280; margin: 0 4px;">•</span>
              <span style="color: #facc15; font-weight: 600;">${selectedAwardSeason.value} ${type === 'best' ? 'Best' : 'Worst'}</span>
            </div>
          </div>
        </div>
        
        <div style="padding: 12px 16px; background: linear-gradient(135deg, ${colorLight} 0%, transparent 100%); border-bottom: 1px solid ${colorBorder};">
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="${imageMap.get(leaderUniqueKey) || createPlaceholder(leader.team_name)}" style="width: 44px; height: 44px; border-radius: 50%; border: 2px solid ${colorBorder};" />
            <div style="flex: 1;">
              <div style="font-size: 15px; font-weight: bold; color: #ffffff;">${leader.team_name}</div>
              <div style="font-size: 11px; color: #9ca3af;">${leader.detail || ''}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 26px; font-weight: 900; color: ${colorMain};">${leader.value}</div>
              <div style="font-size: 10px; color: #6b7280;">${valueUnit}</div>
            </div>
          </div>
        </div>
        
        <div style="padding: 12px 16px;">
          <div style="font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">${type === 'best' ? 'Top' : 'Bottom'} Ten</div>
          ${generateRows()}
        </div>
        
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
    link.download = `${selectedAwardSeason.value}-${awardTitle.toLowerCase().replace(/\s+/g, '-')}-${type}.png`
    link.href = finalCanvas.toDataURL('image/png')
    link.click()
  } finally {
    isDownloadingSeasonAward.value = false
  }
}

async function downloadWeeklyAwardRankings(awardTitle: string, type: 'best' | 'worst') {
  isDownloadingWeeklyAward.value = true
  try {
    const activeId = leagueStore.activeLeagueId
    const savedLeague = leagueStore.savedLeagues?.find((l: any) => l.league_id === activeId?.split('.l.')[1])
    const leagueName = savedLeague?.league_name || leagueStore.yahooLeague?.name || 'Fantasy League'
    
    const rankings = weeklyAwardModalRankings.value.slice(0, 10)
    if (rankings.length === 0) {
      isDownloadingWeeklyAward.value = false
      return
    }
    
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
    
    const colorMain = type === 'best' ? '#22c55e' : '#ef4444'
    const colorLight = type === 'best' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)'
    const colorBorder = type === 'best' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'
    
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
        ctx.fillStyle = colorMain
        ctx.font = 'bold 28px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(name.charAt(0).toUpperCase(), 32, 34)
      }
      return canvas.toDataURL('image/png')
    }
    
    const logoBase64 = await loadLogo()
    const leader = rankings[0]
    
    const imageMap = new Map<string, string>()
    for (const team of rankings) {
      const uniqueKey = team.team_name + (team.detail || '')
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
        imageMap.set(uniqueKey, await loadPromise)
      } catch {
        imageMap.set(uniqueKey, createPlaceholder(team.team_name))
      }
    }
    
    const maxValue = Math.max(...rankings.map(r => parseFloat(String(r.value)) || 0))
    
    const valueUnit = awardTitle.includes('Blowout') || awardTitle.includes('Closest') ? 'Margin' : 'Points'
    
    const generateRows = () => {
      return rankings.map((team, idx) => {
        let numValue = parseFloat(String(team.value)) || 0
        const barWidth = maxValue > 0 ? (numValue / maxValue) * 100 : 0
        const uniqueKey = team.team_name + (team.detail || '')
        
        return `
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
            <div style="width: 20px; text-align: center; font-weight: bold; font-size: 12px; color: ${idx === 0 ? colorMain : '#6b7280'};">${idx + 1}</div>
            <img src="${imageMap.get(uniqueKey) || createPlaceholder(team.team_name)}" style="width: 28px; height: 28px; border-radius: 50%;" />
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 12px; font-weight: 600; color: #e5e7eb; margin-bottom: 5px;">${team.team_name} <span style="color: #6b7280; font-weight: 400;">${team.detail || ''}</span></div>
              <div style="height: 6px; background: rgba(58, 61, 82, 0.5); border-radius: 3px; overflow: hidden;">
                <div style="height: 100%; width: ${barWidth}%; background: ${colorMain}; opacity: ${idx === 0 ? 1 : 0.6}; border-radius: 3px;"></div>
              </div>
            </div>
            <div style="width: 65px; text-align: right;">
              <div style="font-size: 13px; font-weight: bold; color: ${idx === 0 ? colorMain : '#e5e7eb'};">${team.value}</div>
              <div style="font-size: 9px; color: #6b7280; margin-top: 1px;">${valueUnit}</div>
            </div>
          </div>
        `
      }).join('')
    }
    
    const container = document.createElement('div')
    container.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 480px; font-family: system-ui, -apple-system, sans-serif;'
    
    const leaderUniqueKey = leader.team_name + (leader.detail || '')
    
    container.innerHTML = `
      <div style="background: linear-gradient(160deg, #0f1219 0%, #0a0c14 50%, #0d1117 100%); border-radius: 16px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); position: relative; overflow: hidden;">
        
        <div style="background: #facc15; padding: 8px 20px; text-align: center;">
          <span style="font-size: 12px; font-weight: 700; color: #0a0c14; text-transform: uppercase; letter-spacing: 2px;">Ultimate Fantasy Dashboard</span>
        </div>
        
        <div style="display: flex; align-items: center; padding: 10px 16px; border-bottom: 1px solid rgba(250, 204, 21, 0.2);">
          ${logoBase64 ? `<img src="${logoBase64}" style="height: 40px; width: auto; flex-shrink: 0; margin-right: 12px; margin-top: 4px;" />` : ''}
          <div style="flex: 1;">
            <div style="font-size: 17px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.1;">${awardTitle}</div>
            <div style="font-size: 12px; margin-top: 2px;">
              <span style="color: #e5e7eb;">${leagueName}</span>
              <span style="color: #6b7280; margin: 0 4px;">•</span>
              <span style="color: #facc15; font-weight: 600;">${selectedWeeklyAwardSeason.value} Week ${selectedWeeklyAwardWeek.value}</span>
            </div>
          </div>
        </div>
        
        <div style="padding: 12px 16px; background: linear-gradient(135deg, ${colorLight} 0%, transparent 100%); border-bottom: 1px solid ${colorBorder};">
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="${imageMap.get(leaderUniqueKey) || createPlaceholder(leader.team_name)}" style="width: 44px; height: 44px; border-radius: 50%; border: 2px solid ${colorBorder};" />
            <div style="flex: 1;">
              <div style="font-size: 15px; font-weight: bold; color: #ffffff;">${leader.team_name}</div>
              <div style="font-size: 11px; color: #9ca3af;">${leader.detail || ''}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 26px; font-weight: 900; color: ${colorMain};">${leader.value}</div>
              <div style="font-size: 10px; color: #6b7280;">${valueUnit}</div>
            </div>
          </div>
        </div>
        
        <div style="padding: 12px 16px;">
          <div style="font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">Week Rankings</div>
          ${generateRows()}
        </div>
        
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
    link.download = `${selectedWeeklyAwardSeason.value}-week${selectedWeeklyAwardWeek.value}-${awardTitle.toLowerCase().replace(/\s+/g, '-')}.png`
    link.href = finalCanvas.toDataURL('image/png')
    link.click()
  } finally {
    isDownloadingWeeklyAward.value = false
  }
}

async function downloadCareerStats() {
  isDownloadingCareerStats.value = true
  try {
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
      'wins': 'Wins',
      'win_pct': 'Win%',
      'avg_ppw': 'PPW',
      'total_pf': 'Total Points'
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
          <td style="padding: 8px 12px; text-align: center; color: ${stat.championships > 0 ? '#F5C451' : '#6b7280'}; font-weight: ${stat.championships > 0 ? 'bold' : 'normal'};">${stat.championships}</td>
          <td style="padding: 8px 12px; text-align: center; color: #e5e7eb;">${stat.wins}-${stat.losses}</td>
          <td style="padding: 8px 12px; text-align: center; color: #e5e7eb;">${(stat.win_pct * 100).toFixed(1)}%</td>
          <td style="padding: 8px 12px; text-align: center; color: #10b981;">${stat.avg_ppw.toFixed(1)}</td>
          <td style="padding: 8px 12px; text-align: center; color: #8b5cf6;">${stat.total_pf.toFixed(0)}</td>
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
                <th style="padding: 10px 12px; text-align: center; color: #10b981; font-size: 11px; text-transform: uppercase;">PPW</th>
                <th style="padding: 10px 12px; text-align: center; color: #8b5cf6; font-size: 11px; text-transform: uppercase;">Total PF</th>
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
    link.download = 'points-league-career-stats.png'
    link.href = finalCanvas.toDataURL('image/png')
    link.click()
  } finally {
    isDownloadingCareerStats.value = false
  }
}

async function downloadSeasonHistory() {
  if (!seasonTableRef.value) return
  isDownloadingSeasonHistory.value = true
  try {
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
    link.download = 'points-league-season-history.png'
    link.href = finalCanvas.toDataURL('image/png')
    link.click()
  } finally {
    isDownloadingSeasonHistory.value = false
  }
}

async function downloadHeadToHead() {
  isDownloadingH2H.value = true
  try {
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
    
    // Get current members only for the matrix
    const teams = currentMembers.value.map(key => {
      const team = allTeams.value[key]
      return {
        team_key: key,
        team_name: team?.name || 'Unknown',
        logo_url: team?.logo_url || ''
      }
    }).filter(t => t.team_name !== 'Unknown')
    
    if (teams.length === 0) {
      isDownloadingH2H.value = false
      return
    }
    
    // Pre-load all team images
    const imageMap = new Map<string, string>()
    for (const team of teams) {
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
        imageMap.set(team.team_key, await loadPromise)
      } catch {
        imageMap.set(team.team_key, createPlaceholder(team.team_name))
      }
    }
    
    // Build matrix header (opponent logos)
    const headerCells = teams.map(t => `
      <th style="padding: 4px; text-align: center; width: 50px;">
        <img src="${imageMap.get(t.team_key) || createPlaceholder(t.team_name)}" style="width: 24px; height: 24px; border-radius: 50%;" />
      </th>
    `).join('')
    
    // Build matrix rows
    const matrixRows = teams.map(rowTeam => {
      const cells = teams.map(colTeam => {
        if (rowTeam.team_key === colTeam.team_key) {
          return `<td style="padding: 4px; text-align: center; background: rgba(58, 61, 82, 0.3); color: #6b7280;">—</td>`
        }
        const record = h2hRecords.value[rowTeam.team_key]?.[colTeam.team_key]
        if (!record) {
          return `<td style="padding: 4px; text-align: center; color: #6b7280;">0-0</td>`
        }
        const isWinning = record.wins > record.losses
        const isLosing = record.losses > record.wins
        const color = isWinning ? '#22c55e' : isLosing ? '#ef4444' : '#e5e7eb'
        return `<td style="padding: 4px; text-align: center; color: ${color}; font-weight: ${isWinning || isLosing ? '600' : '400'}; font-size: 11px;">${record.wins}-${record.losses}</td>`
      }).join('')
      
      return `
        <tr style="border-bottom: 1px solid rgba(58, 61, 82, 0.3);">
          <td style="padding: 6px 8px; white-space: nowrap;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <img src="${imageMap.get(rowTeam.team_key) || createPlaceholder(rowTeam.team_name)}" style="width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0;" />
              <span style="color: #ffffff; font-size: 11px; font-weight: 500;">${rowTeam.team_name}</span>
            </div>
          </td>
          ${cells}
        </tr>
      `
    }).join('')
    
    // Calculate container width based on team count (wider for team names)
    const containerWidth = Math.max(700, 200 + (teams.length * 50))
    
    // Create wrapper with header/footer
    const container = document.createElement('div')
    container.style.cssText = `position: absolute; left: -9999px; top: 0; width: ${containerWidth}px; font-family: system-ui, -apple-system, sans-serif;`
    
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
            <div style="font-size: 24px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 1px; line-height: 1.1;">Head-to-Head Matrix</div>
            <div style="font-size: 14px; margin-top: 3px; font-weight: 600;">
              <span style="color: #e5e7eb;">${leagueName}</span>
              <span style="color: #6b7280; margin: 0 6px;">•</span>
              <span style="color: #facc15; font-weight: 700;">Current Members • All-Time</span>
            </div>
          </div>
        </div>
        
        <!-- Table Content -->
        <div style="padding: 16px 24px; overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr style="border-bottom: 2px solid rgba(250, 204, 21, 0.3);">
                <th style="padding: 8px; text-align: left; color: #9ca3af; font-size: 10px; text-transform: uppercase;">Team</th>
                ${headerCells}
              </tr>
            </thead>
            <tbody>
              ${matrixRows}
            </tbody>
          </table>
        </div>
        
        <!-- Legend -->
        <div style="padding: 8px 24px 16px 24px; display: flex; justify-content: center; gap: 16px;">
          <span style="font-size: 11px; color: #22c55e;">● Winning record</span>
          <span style="font-size: 11px; color: #ef4444;">● Losing record</span>
          <span style="font-size: 11px; color: #e5e7eb;">● Even record</span>
        </div>
        
        <!-- Footer -->
        <div style="padding: 12px 24px; text-align: center; border-top: 1px solid rgba(250, 204, 21, 0.2);">
          <span style="font-size: 18px; font-weight: bold; color: #facc15;">ultimatefantasydashboard.com</span>
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
    link.download = 'points-league-h2h-matrix.png'
    link.href = finalCanvas.toDataURL('image/png')
    link.click()
  } finally {
    isDownloadingH2H.value = false
  }
}

async function loadHistoricalData() {
  console.log('loadHistoricalData called')
  console.log('Platform detection:', {
    activePlatform: leagueStore.activePlatform,
    isEspn: isEspn.value,
    isSleeper: isSleeper.value,
    activeLeagueId: leagueStore.activeLeagueId,
    currentLeagueId: leagueStore.currentLeague?.league_id
  })
  
  // Prevent concurrent executions
  if (isLoading.value) {
    console.log('loadHistoricalData already in progress, skipping')
    return
  }
  
  isLoading.value = true
  loadingMessage.value = 'Loading historical data...'
  loadingProgress.value = { currentStep: 'Initializing...', season: '', week: 0, maxWeek: 0, seasonsLoaded: 0, totalSeasons: 0 }
  
  // Helper to update progress with reactivity
  const updateProgress = (updates: Partial<typeof loadingProgress.value>) => {
    loadingProgress.value = { ...loadingProgress.value, ...updates }
  }
  
  // Reset all data at start to prevent accumulation from multiple calls
  historicalData.value = {}
  allMatchups.value = {}
  allTeams.value = {}
  h2hRecords.value = {}
  
  try {
    const leagueKey = effectiveLeagueKey.value
    console.log('Loading history for league:', leagueKey, 'platform:', leagueStore.activePlatform)
    
    if (!leagueKey) {
      console.log('Missing leagueKey, waiting...')
      loadingMessage.value = 'Waiting for league data...'
      isLoading.value = false
      // Retry after a delay
      setTimeout(() => {
        if (effectiveLeagueKey.value && !isLoading.value) {
          loadHistoricalData()
        }
      }, 1000)
      return
    }
    
    // Handle ESPN leagues FIRST (most reliable detection via league key format)
    if (isEspn.value) {
      console.log('[ESPN] Loading historical data for ESPN league')
      updateProgress({ currentStep: 'Initializing ESPN connection...' })
      
      // Parse league key to get ESPN details
      const parts = leagueKey.split('_')
      const sport = parts[1] as 'football' | 'baseball' | 'basketball' | 'hockey'
      const espnLeagueId = parts[2]
      const currentSeason = parseInt(parts[3])
      
      // Dynamically import ESPN service
      const { espnService } = await import('@/services/espn')
      
      // Try to load multiple seasons (current and previous years)
      const seasonsToTry = []
      for (let year = currentSeason; year >= currentSeason - 5; year--) {
        seasonsToTry.push(year)
      }
      
      console.log('[ESPN] Will attempt to load seasons:', seasonsToTry)
      updateProgress({ totalSeasons: seasonsToTry.length })
      
      let successCount = 0
      
      for (const season of seasonsToTry) {
        loadingMessage.value = `Loading ${season} season...`
        updateProgress({ currentStep: `Fetching ${season} standings`, season: season.toString() })
        
        try {
          // Fetch teams for this season - use historical method for past seasons
          console.log(`[ESPN History] Fetching teams for ${season}...`)
          const isCurrentSeason = season === currentSeason
          const teams = isCurrentSeason 
            ? await espnService.getTeams(sport, espnLeagueId, season)
            : await espnService.getHistoricalTeams(sport, espnLeagueId, season)
          
          console.log(`[ESPN History] ${season} returned ${teams?.length || 0} teams`)
          
          if (!teams || teams.length === 0) {
            console.log(`[ESPN History] No data for ${season} season - skipping`)
            continue
          }
          
          successCount++
          updateProgress({ seasonsLoaded: successCount })
          
          // Log owner info for debugging
          console.log(`[ESPN ${season}] Teams with owners:`, teams.map((t: any) => ({
            id: t.id,
            name: t.name,
            primaryOwner: t.primaryOwner,
            ownerName: t.ownerName
          })))
          
          // Transform teams to standings format
          // KEY: Use owner_id for tracking (new owner = new history)
          // DISPLAY: Use team name (not owner name)
          const standings = teams.map((team: any, idx: number) => {
            // Create unique key: prefer owner_id, but include season to handle missing owners
            const ownerKey = team.primaryOwner 
              ? team.primaryOwner 
              : `team_${team.id}_${season}` // Fallback includes season so different years = different entries
            
            return {
              team_key: ownerKey,
              team_id: team.id.toString(),
              name: team.name, // Use TEAM NAME for display
              logo_url: team.logo || '',
              wins: team.wins || 0,
              losses: team.losses || 0,
              ties: team.ties || 0,
              points_for: team.pointsFor || 0,
              points_against: team.pointsAgainst || 0,
              rank: team.rank || idx + 1,
              playoff_seed: team.playoffSeed || 0,
              is_champion: (team.rank || idx + 1) === 1,
              owner_id: team.primaryOwner || '',
              season: season,
              num_teams: teams.length
            }
          })
          
          console.log(`[ESPN] Got standings for ${season}:`, standings.length, 'teams')
          
          // Store season data
          historicalData.value[season.toString()] = {
            standings: standings,
            trade_count: 0
          }
          
          // Track team info
          standings.forEach((team: any) => {
            const trackingKey = team.team_key
            
            if (!currentMembers.value.includes(trackingKey)) {
              currentMembers.value.push(trackingKey)
            }
            
            // Store team info - use team NAME for display
            if (!allTeams.value[trackingKey]) {
              allTeams.value[trackingKey] = {
                team_key: trackingKey,
                name: team.name, // TEAM NAME, not owner name
                logo_url: team.logo_url || ''
              }
            }
          })
          
          // Load matchups for H2H calculation
          loadingMessage.value = `Loading ${season} matchups...`
          updateProgress({ currentStep: `Loading ${season} matchups` })
          const seasonMatchupsObj: Record<number, any[]> = {}
          
          // For current season, use current week; for past seasons, load all weeks
          // Note: isCurrentSeason already defined above when fetching teams
          const maxWeek = isCurrentSeason 
            ? Math.min(leagueStore.currentLeague?.settings?.leg || 25, 25)
            : 25
          
          updateProgress({ maxWeek })
          let consecutiveFailures = 0
          
          for (let week = 1; week <= maxWeek; week++) {
            updateProgress({ week })
            loadingMessage.value = `Loading ${season} week ${week}/${maxWeek}...`
            try {
              // Use historical method for past seasons
              const weekMatchups = isCurrentSeason
                ? await espnService.getMatchups(sport, espnLeagueId, season, week)
                : await espnService.getHistoricalMatchups(sport, espnLeagueId, season, week)
              
              if (weekMatchups && weekMatchups.length > 0) {
                consecutiveFailures = 0
                
                // Transform ESPN matchups
                const transformedMatchups = weekMatchups.map((m: any) => {
                  const homeTeamData = standings.find((t: any) => t.team_id === m.homeTeamId?.toString())
                  const awayTeamData = standings.find((t: any) => t.team_id === m.awayTeamId?.toString())
                  
                  // Use owner-based key for H2H tracking
                  const homeKey = homeTeamData?.team_key || `team_${m.homeTeamId}_${season}`
                  const awayKey = awayTeamData?.team_key || `team_${m.awayTeamId}_${season}`
                  
                  return {
                    matchup_id: m.id,
                    season: season,
                    teams: [
                      {
                        team_key: homeKey,
                        team_id: m.homeTeamId?.toString(),
                        name: homeTeamData?.name || 'Home Team', // TEAM NAME
                        points: m.homeScore || 0,
                        logo_url: homeTeamData?.logo_url || ''
                      },
                      {
                        team_key: awayKey,
                        team_id: m.awayTeamId?.toString(),
                        name: awayTeamData?.name || 'Away Team', // TEAM NAME
                        points: m.awayScore || 0,
                        logo_url: awayTeamData?.logo_url || ''
                      }
                    ],
                    winner_team_key: m.winner === 'HOME' ? homeKey : 
                                     m.winner === 'AWAY' ? awayKey : null
                  }
                })
                
                seasonMatchupsObj[week] = transformedMatchups
                
                // Build H2H records (by owner key)
                for (const matchup of transformedMatchups) {
                  const teams = matchup.teams || []
                  if (teams.length === 2) {
                    const [team1, team2] = teams
                    
                    // Skip if either team has no points (bye week or incomplete)
                    if ((team1.points || 0) === 0 && (team2.points || 0) === 0) continue
                    
                    const team1Won = (team1.points || 0) > (team2.points || 0)
                    
                    // Update team info
                    if (!allTeams.value[team1.team_key]) {
                      allTeams.value[team1.team_key] = {
                        team_key: team1.team_key,
                        name: team1.name,
                        logo_url: team1.logo_url || ''
                      }
                    }
                    if (!allTeams.value[team2.team_key]) {
                      allTeams.value[team2.team_key] = {
                        team_key: team2.team_key,
                        name: team2.name,
                        logo_url: team2.logo_url || ''
                      }
                    }
                    
                    // Update team1's record vs team2
                    if (!h2hRecords.value[team1.team_key]) {
                      h2hRecords.value[team1.team_key] = {}
                    }
                    if (!h2hRecords.value[team1.team_key][team2.team_key]) {
                      h2hRecords.value[team1.team_key][team2.team_key] = { wins: 0, losses: 0 }
                    }
                    if (team1Won) h2hRecords.value[team1.team_key][team2.team_key].wins++
                    else h2hRecords.value[team1.team_key][team2.team_key].losses++
                    
                    // Update team2's record vs team1
                    if (!h2hRecords.value[team2.team_key]) {
                      h2hRecords.value[team2.team_key] = {}
                    }
                    if (!h2hRecords.value[team2.team_key][team1.team_key]) {
                      h2hRecords.value[team2.team_key][team1.team_key] = { wins: 0, losses: 0 }
                    }
                    if (!team1Won) h2hRecords.value[team2.team_key][team1.team_key].wins++
                    else h2hRecords.value[team2.team_key][team1.team_key].losses++
                  }
                }
              } else {
                consecutiveFailures++
              }
            } catch (e) {
              consecutiveFailures++
            }
            
            if (consecutiveFailures >= 3 && Object.keys(seasonMatchupsObj).length > 0) {
              console.log(`[ESPN] Stopping at week ${week} for ${season} - season appears to have ended`)
              break
            }
          }
          
          if (Object.keys(seasonMatchupsObj).length > 0) {
            allMatchups.value[season.toString()] = seasonMatchupsObj
          }
          
          console.log(`[ESPN] ✓ Loaded ${season}: ${standings.length} teams, ${Object.keys(seasonMatchupsObj).length} weeks`)
          
          // Small delay between seasons
          await new Promise(resolve => setTimeout(resolve, 100))
          
        } catch (e: any) {
          console.log(`[ESPN] Could not load ${season} season:`, e?.message || e)
          // Continue to next season instead of breaking
        }
      }
      
      console.log(`[ESPN] Finished loading: ${successCount} seasons, historicalData keys:`, Object.keys(historicalData.value))
      
      // Set default award season
      if (availableSeasons.value.length > 0) {
        selectedAwardSeason.value = availableSeasons.value[0]
        selectedWeeklyAwardSeason.value = availableSeasons.value[0]
      }
      
      loadingMessage.value = `Done! Loaded ${successCount} season${successCount !== 1 ? 's' : ''}.`
      loadingProgress.value = { currentStep: 'Complete!', season: '', week: 0, maxWeek: 0, seasonsLoaded: successCount, totalSeasons: successCount }
      isLoading.value = false
      return
    }
    
    // Handle Sleeper leagues
    if (isSleeper.value) {
      console.log('[SLEEPER] Loading historical data for Sleeper league')
      console.log('[SLEEPER] leagueKey:', leagueKey)
      console.log('[SLEEPER] activePlatform:', leagueStore.activePlatform)
      updateProgress({ currentStep: 'Loading Sleeper league history...' })
      
      // Sleeper history is handled differently - seasons are stored in historicalSeasons
      const { sleeperService } = await import('@/services/sleeper')
      
      // Get historical seasons from the store
      const historicalSeasons = leagueStore.historicalSeasons || []
      console.log('[SLEEPER] Historical seasons available:', historicalSeasons.length)
      
      if (historicalSeasons.length === 0) {
        console.log('[SLEEPER] No historical seasons, ending loading')
        loadingMessage.value = 'No historical data available for this Sleeper league.'
        isLoading.value = false
        return
      }
      
      updateProgress({ totalSeasons: historicalSeasons.length })
      let successCount = 0
      
      for (const seasonInfo of historicalSeasons) {
        const season = seasonInfo.season
        loadingMessage.value = `Loading ${season} season...`
        updateProgress({ currentStep: `Loading ${season} standings and matchups`, season: season })
        
        try {
          // Get rosters/standings for this season
          const rosters = await sleeperService.getLeagueRosters(seasonInfo.league_id)
          const users = await sleeperService.getLeagueUsers(seasonInfo.league_id)
          
          if (!rosters || rosters.length === 0) continue
          
          // Transform to standings format
          const standings = rosters.map((roster: any, idx: number) => {
            const user = users.find((u: any) => u.user_id === roster.owner_id)
            const teamName = sleeperService.getTeamName(roster, user)
            const avatar = sleeperService.getAvatarUrl(roster, user, seasonInfo)
            
            return {
              team_key: roster.owner_id || `roster_${roster.roster_id}`,
              team_id: roster.roster_id.toString(),
              name: teamName,
              logo_url: avatar,
              wins: roster.settings?.wins || 0,
              losses: roster.settings?.losses || 0,
              ties: roster.settings?.ties || 0,
              points_for: roster.settings?.fpts || 0,
              points_against: roster.settings?.fpts_against || 0,
              rank: idx + 1,
              is_champion: idx === 0,
              owner_id: roster.owner_id || '',
              season: season
            }
          }).sort((a: any, b: any) => {
            if (b.wins !== a.wins) return b.wins - a.wins
            return b.points_for - a.points_for
          })
          
          historicalData.value[season] = { standings, trade_count: 0 }
          
          // Track teams
          standings.forEach((team: any) => {
            if (!currentMembers.value.includes(team.team_key)) {
              currentMembers.value.push(team.team_key)
            }
            if (!allTeams.value[team.team_key]) {
              allTeams.value[team.team_key] = {
                team_key: team.team_key,
                name: team.name,
                logo_url: team.logo_url
              }
            }
          })
          
          // Load matchups for H2H
          updateProgress({ currentStep: `Loading ${season} matchups`, maxWeek: 18 })
          const seasonMatchupsObj: Record<number, any[]> = {}
          
          for (let week = 1; week <= 18; week++) {
            updateProgress({ week })
            try {
              const matchups = await sleeperService.getMatchups(seasonInfo.league_id, week)
              if (matchups && matchups.length > 0) {
                // Group matchups by matchup_id
                const grouped = new Map()
                for (const m of matchups) {
                  if (!grouped.has(m.matchup_id)) grouped.set(m.matchup_id, [])
                  grouped.get(m.matchup_id).push(m)
                }
                
                const transformedMatchups = Array.from(grouped.values())
                  .filter(pair => pair.length === 2)
                  .map(([m1, m2]) => {
                    const team1 = standings.find((t: any) => t.team_id === m1.roster_id.toString())
                    const team2 = standings.find((t: any) => t.team_id === m2.roster_id.toString())
                    return {
                      matchup_id: m1.matchup_id,
                      season,
                      teams: [
                        { team_key: team1?.team_key, name: team1?.name, points: m1.points || 0, logo_url: team1?.logo_url },
                        { team_key: team2?.team_key, name: team2?.name, points: m2.points || 0, logo_url: team2?.logo_url }
                      ]
                    }
                  })
                
                if (transformedMatchups.length > 0) {
                  seasonMatchupsObj[week] = transformedMatchups
                  
                  // Build H2H records
                  for (const matchup of transformedMatchups) {
                    const [t1, t2] = matchup.teams
                    if (!t1.team_key || !t2.team_key) continue
                    const t1Won = (t1.points || 0) > (t2.points || 0)
                    
                    if (!h2hRecords.value[t1.team_key]) h2hRecords.value[t1.team_key] = {}
                    if (!h2hRecords.value[t1.team_key][t2.team_key]) h2hRecords.value[t1.team_key][t2.team_key] = { wins: 0, losses: 0 }
                    if (t1Won) h2hRecords.value[t1.team_key][t2.team_key].wins++
                    else h2hRecords.value[t1.team_key][t2.team_key].losses++
                    
                    if (!h2hRecords.value[t2.team_key]) h2hRecords.value[t2.team_key] = {}
                    if (!h2hRecords.value[t2.team_key][t1.team_key]) h2hRecords.value[t2.team_key][t1.team_key] = { wins: 0, losses: 0 }
                    if (!t1Won) h2hRecords.value[t2.team_key][t1.team_key].wins++
                    else h2hRecords.value[t2.team_key][t1.team_key].losses++
                  }
                }
              }
            } catch (e) {
              // Week might not exist
            }
          }
          
          if (Object.keys(seasonMatchupsObj).length > 0) {
            allMatchups.value[season] = seasonMatchupsObj
          }
          
          successCount++
          updateProgress({ seasonsLoaded: successCount })
          console.log(`[SLEEPER] Loaded ${season}: ${standings.length} teams, ${Object.keys(seasonMatchupsObj).length} weeks`)
          
        } catch (e) {
          console.log(`[SLEEPER] Could not load ${season}:`, e)
        }
      }
      
      if (availableSeasons.value.length > 0) {
        selectedAwardSeason.value = availableSeasons.value[0]
        selectedWeeklyAwardSeason.value = availableSeasons.value[0]
      }
      
      loadingMessage.value = `Done! Loaded ${successCount} season${successCount !== 1 ? 's' : ''}.`
      loadingProgress.value = { currentStep: 'Complete!', season: '', week: 0, maxWeek: 0, seasonsLoaded: successCount, totalSeasons: successCount }
      isLoading.value = false
      return
    }
    
    // Yahoo leagues - original logic
    if (!authStore.user?.id) {
      console.log('Missing userId, retrying in 1 second...')
      loadingMessage.value = 'Waiting for authentication...'
      isLoading.value = false
      setTimeout(() => {
        if (!isLoading.value) loadHistoricalData()
      }, 1000)
      return
    }
    
    updateProgress({ currentStep: 'Initializing Yahoo connection...' })
    await yahooService.initialize(authStore.user.id)
    
    // Get current league info to find game key
    const gameKey = leagueKey.split('.')[0] // e.g., "431" from "431.l.136233"
    console.log('Game key:', gameKey)
    
    // Baseball game keys by year - CORRECTED MAPPING
    const gameKeys: Record<string, string> = {
      '2025': '458', '2024': '431', '2023': '422', '2022': '412',
      '2021': '404', '2020': '398', '2019': '388', '2018': '378',
      '2017': '370', '2016': '357', '2015': '346', '2014': '328',
      '2013': '308', '2012': '283', '2011': '268', '2010': '253'
    }
    
    // Reverse lookup - find year from game key
    const yearsByKey = Object.fromEntries(
      Object.entries(gameKeys).map(([year, key]) => [key, year])
    )
    
    // Get league number from current league key
    const leagueNum = leagueKey.split('.l.')[1]
    console.log('League number:', leagueNum)
    
    // Load ALL available seasons (will skip years where league didn't exist)
    const currentYear = yearsByKey[gameKey] || '2024'
    const seasons = Object.keys(gameKeys).sort((a, b) => parseInt(b) - parseInt(a))
    console.log('Will attempt to load seasons:', seasons)
    updateProgress({ totalSeasons: seasons.length })
    
    let successCount = 0
    let failCount = 0
    
    for (const season of seasons) {
      const seasonGameKey = gameKeys[season]
      if (!seasonGameKey) continue
      
      const seasonLeagueKey = `${seasonGameKey}.l.${leagueNum}`
      loadingMessage.value = `Loading ${season} season...`
      updateProgress({ currentStep: `Fetching ${season} standings`, season })
      
      try {
        // Get standings for this season
        const standings = await yahooService.getStandings(seasonLeagueKey)
        console.log(`Got standings for ${season}:`, standings?.length || 0, 'teams')
        if (!standings || standings.length === 0) {
          failCount++
          continue
        }
        
        successCount++
        updateProgress({ seasonsLoaded: successCount })
        
        // Store season data - mark rank 1 as champion
        const enhancedStandings = standings.map((team: any) => ({
          ...team,
          is_champion: team.rank === 1
        }))
        
        historicalData.value[season] = {
          standings: enhancedStandings,
          trade_count: 0 // Would need separate API call
        }
        
        // If this is the current season, track current members
        if (season === currentYear) {
          enhancedStandings.forEach((team: any) => {
            if (!currentMembers.value.includes(team.team_key)) {
              currentMembers.value.push(team.team_key)
            }
          })
        }
        
        // Load matchups for H2H calculation and to get team logos
        updateProgress({ currentStep: `Loading ${season} matchups`, maxWeek: 25 })
        const seasonMatchupsObj: Record<number, any[]> = {}
        let consecutiveFailures = 0
        
        for (let week = 1; week <= 25; week++) {
          updateProgress({ week })
          loadingMessage.value = `Loading ${season} week ${week}/25...`
          try {
            const weekMatchups = await yahooService.getMatchups(seasonLeagueKey, week)
            if (weekMatchups && weekMatchups.length > 0) {
              consecutiveFailures = 0
              seasonMatchupsObj[week] = weekMatchups
              
              // Build H2H records and collect team info with logos
              for (const matchup of weekMatchups) {
                const teams = matchup.teams || []
                if (teams.length === 2) {
                  const [team1, team2] = teams
                  
                  // Store team info with logo (only by team_key, not by name)
                  if (!allTeams.value[team1.team_key]) {
                    allTeams.value[team1.team_key] = {
                      team_key: team1.team_key,
                      name: team1.name,
                      logo_url: team1.logo_url || ''
                    }
                  }
                  if (!allTeams.value[team2.team_key]) {
                    allTeams.value[team2.team_key] = {
                      team_key: team2.team_key,
                      name: team2.name,
                      logo_url: team2.logo_url || ''
                    }
                  }
                  
                  const team1Won = (team1.points || 0) > (team2.points || 0)
                  
                  // Update team1's record vs team2
                  if (!h2hRecords.value[team1.team_key]) {
                    h2hRecords.value[team1.team_key] = {}
                  }
                  if (!h2hRecords.value[team1.team_key][team2.team_key]) {
                    h2hRecords.value[team1.team_key][team2.team_key] = { wins: 0, losses: 0 }
                  }
                  if (team1Won) h2hRecords.value[team1.team_key][team2.team_key].wins++
                  else h2hRecords.value[team1.team_key][team2.team_key].losses++
                  
                  // Update team2's record vs team1
                  if (!h2hRecords.value[team2.team_key]) {
                    h2hRecords.value[team2.team_key] = {}
                  }
                  if (!h2hRecords.value[team2.team_key][team1.team_key]) {
                    h2hRecords.value[team2.team_key][team1.team_key] = { wins: 0, losses: 0 }
                  }
                  if (!team1Won) h2hRecords.value[team2.team_key][team1.team_key].wins++
                  else h2hRecords.value[team2.team_key][team1.team_key].losses++
                }
              }
            } else {
              consecutiveFailures++
            }
          } catch (e) {
            // Week doesn't exist or error
            consecutiveFailures++
          }
          
          // If 3 consecutive failures, season has likely ended
          if (consecutiveFailures >= 3 && Object.keys(seasonMatchupsObj).length > 0) {
            console.log(`Stopping at week ${week} for ${season} - season appears to have ended`)
            break
          }
        }
        
        if (Object.keys(seasonMatchupsObj).length > 0) {
          allMatchups.value[season] = seasonMatchupsObj
        }
        
        console.log(`✓ Loaded ${season}: ${standings.length} teams, ${Object.keys(seasonMatchupsObj).length} weeks`)
        
        // Small delay between seasons to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (e) {
        // Season doesn't exist for this league
        console.log(`✗ Could not load ${season} season`)
        failCount++
      }
    }
    
    console.log(`Finished loading: ${successCount} seasons loaded, ${failCount} not found`)
    console.log('Loaded seasons:', Object.keys(historicalData.value))
    
    // Set default award season
    if (availableSeasons.value.length > 0) {
      selectedAwardSeason.value = availableSeasons.value[0]
      selectedWeeklyAwardSeason.value = availableSeasons.value[0]
    }
    
    loadingMessage.value = `Done! Loaded ${successCount} seasons.`
    loadingProgress.value = { currentStep: 'Complete!', season: '', week: 0, maxWeek: 0, seasonsLoaded: successCount, totalSeasons: successCount }
    
  } catch (e) {
    console.error('Error loading historical data:', e)
    loadingMessage.value = 'Error loading data. Please try refreshing.'
    loadingProgress.value = { ...loadingProgress.value, currentStep: 'Error occurred' }
  } finally {
    isLoading.value = false
  }
}

// Watch for award season changes
watch(selectedWeeklyAwardSeason, () => {
  const weeks = availableWeeksForAwards.value
  if (weeks.length > 0 && !weeks.includes(selectedWeeklyAwardWeek.value)) {
    selectedWeeklyAwardWeek.value = weeks[0]
  }
})

// Watch for league changes
watch(() => leagueStore.activeLeagueId, (newLeagueId) => {
  console.log('YahooBaseballHistoryView - League watcher triggered:', newLeagueId)
  if (newLeagueId) {
    console.log('League changed, reloading history:', newLeagueId)
    // Reset data
    historicalData.value = {}
    allMatchups.value = {}
    allTeams.value = {}
    h2hRecords.value = {}
    currentMembers.value = []
    // Reload
    loadHistoricalData()
  }
}, { immediate: true })

// Watch for currentLeague changes (happens when fallback to previous season occurs)
watch(() => leagueStore.currentLeague?.league_id, (newKey, oldKey) => {
  if (newKey && newKey !== oldKey) {
    console.log(`History: League changed from ${oldKey} to ${newKey}, reloading...`)
    historicalData.value = {}
    allMatchups.value = {}
    allTeams.value = {}
    h2hRecords.value = {}
    currentMembers.value = []
    loadHistoricalData()
  }
})

// Load data on mount (as backup)
onMounted(() => {
  console.log('YahooBaseballHistoryView mounted - effectiveLeagueKey:', effectiveLeagueKey.value)
  if (effectiveLeagueKey.value && Object.keys(historicalData.value).length === 0) {
    loadHistoricalData()
  }
})
</script>

<style scoped>
.scrollbar-thin::-webkit-scrollbar {
  height: 8px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: rgba(55, 65, 81, 0.3);
  border-radius: 4px;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background: rgba(107, 114, 128, 0.5);
  border-radius: 4px;
}

.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: rgba(107, 114, 128, 0.7);
}
</style>
