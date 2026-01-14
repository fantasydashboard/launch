<template>
  <div class="space-y-6">
    <!-- Offseason Notice Banner -->
    <div class="bg-slate-500/10 border border-slate-500/30 rounded-xl p-4 flex items-start gap-3">
      <div class="text-slate-400 text-xl flex-shrink-0">⚾</div>
      <div>
        <p class="text-slate-200 font-semibold">You're viewing the {{ currentSeason }} season</p>
        <p class="text-slate-400 text-sm mt-1">The {{ Number(currentSeason) + 1 }} season will automatically appear here when it begins.</p>
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
      <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-yellow-400 mb-4"></div>
      <div class="text-lg font-semibold text-dark-text mb-2">Loading League History</div>
      <p class="text-dark-textMuted text-sm">{{ loadingMessage }}</p>
      <div class="text-xs text-dark-textMuted/70 mt-2">This may take a minute for leagues with many seasons</div>
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
                  class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium flex items-center gap-2 text-sm transition-colors disabled:opacity-50"
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
              class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium flex items-center gap-2 text-sm transition-colors disabled:opacity-50"
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
                class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium flex items-center gap-2 text-sm transition-colors disabled:opacity-50"
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
                style="background: #dc2626; color: #ffffff;"
                @mouseover="$event.currentTarget.style.background = '#F5C451'; $event.currentTarget.style.color = '#0a0c14'"
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
              <h3 class="text-xl font-bold text-dark-text">{{ awardModalTitle }}</h3>
              <p class="text-sm"><span class="text-dark-textMuted">{{ leagueDisplayName }}</span> <span class="text-dark-textMuted">•</span> <span class="text-red-500 font-semibold">All-Time {{ awardModalType === 'best' ? 'Best' : 'Worst' }}</span></p>
            </div>
            <div class="flex items-center gap-2">
              <button 
                @click="downloadAwardRankings(awardModalTitle, awardModalType)" 
                :disabled="isDownloadingAward"
                class="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-50"
                style="background: #dc2626; color: #ffffff;"
                @mouseover="$event.currentTarget.style.background = '#F5C451'; $event.currentTarget.style.color = '#0a0c14'"
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
                style="background: #dc2626; color: #ffffff;"
                @mouseover="$event.currentTarget.style.background = '#F5C451'; $event.currentTarget.style.color = '#0a0c14'"
                @mouseout="$event.currentTarget.style.background = '#dc2626'; $event.currentTarget.style.color = '#ffffff'"
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
                style="background: #dc2626; color: #ffffff;"
                @mouseover="$event.currentTarget.style.background = '#F5C451'; $event.currentTarget.style.color = '#0a0c14'"
                @mouseout="$event.currentTarget.style.background = '#dc2626'; $event.currentTarget.style.color = '#ffffff'"
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

    <!-- Platform Badge -->
    <div class="flex justify-center mt-8">
      <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full border" :class="platformBadgeClass">
        <img 
          :src="isEspn ? '/espn-logo.svg' : '/yahoo-fantasy.svg'" 
          :alt="platformName"
          class="w-5 h-5"
        />
        <span class="text-sm" :class="platformTextClass">{{ platformName }} Fantasy Baseball • Points League</span>
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

const leagueStore = useLeagueStore()
const authStore = useAuthStore()

// Check if ESPN platform
const isEspn = computed(() => leagueStore.activePlatform === 'espn')

// Platform display
const platformName = computed(() => isEspn.value ? 'ESPN' : 'Yahoo')

const platformBadgeClass = computed(() => {
  if (isEspn.value) {
    return 'bg-[#5b8def]/10 border-[#5b8def]/30'
  }
  return 'bg-purple-600/10 border-purple-600/30'
})

const platformTextClass = computed(() => {
  if (isEspn.value) {
    return 'text-[#5b8def]'
  }
  return 'text-purple-300'
})

// Effective league key - use the actually loaded league (might be previous season)
const effectiveLeagueKey = computed(() => {
  if (leagueStore.currentLeague?.league_id) return leagueStore.currentLeague.league_id
  return leagueStore.activeLeagueId
})

// Current season for display
const currentSeason = computed(() => leagueStore.currentLeague?.season || new Date().getFullYear().toString())

const defaultAvatar = 'https://s.yimg.com/cv/apiv2/default/mlb/mlb_1_100.png'

// State
const isLoading = ref(true)
const loadingMessage = ref('Loading historical data...')
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
        
        <!-- Top Red Bar -->
        <div style="background: #dc2626; padding: 8px 20px; text-align: center;">
          <span style="font-size: 12px; font-weight: 700; color: #0a0c14; text-transform: uppercase; letter-spacing: 2px;">Ultimate Fantasy Dashboard</span>
        </div>
        
        <!-- Header -->
        <div style="display: flex; align-items: center; padding: 10px 16px; border-bottom: 1px solid rgba(220, 38, 38, 0.2);">
          ${logoBase64 ? `<img src="${logoBase64}" style="height: 40px; width: auto; flex-shrink: 0; margin-right: 12px; margin-top: 4px;" />` : ''}
          <div style="flex: 1;">
            <div style="font-size: 17px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.1;">${recordType}</div>
            <div style="font-size: 12px; margin-top: 2px;">
              <span style="color: #e5e7eb;">${leagueName}</span>
              <span style="color: #6b7280; margin: 0 4px;">•</span>
              <span style="color: #dc2626; font-weight: 600;">All-Time</span>
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
        
        <!-- Top Red Bar -->
        <div style="background: #dc2626; padding: 8px 20px; text-align: center;">
          <span style="font-size: 12px; font-weight: 700; color: #0a0c14; text-transform: uppercase; letter-spacing: 2px;">Ultimate Fantasy Dashboard</span>
        </div>
        
        <!-- Header -->
        <div style="display: flex; align-items: center; padding: 10px 16px; border-bottom: 1px solid rgba(220, 38, 38, 0.2);">
          ${logoBase64 ? `<img src="${logoBase64}" style="height: 40px; width: auto; flex-shrink: 0; margin-right: 12px; margin-top: 4px;" />` : ''}
          <div style="flex: 1;">
            <div style="font-size: 17px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.1;">${awardTitle}</div>
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
        
        <div style="background: #dc2626; padding: 8px 20px; text-align: center;">
          <span style="font-size: 12px; font-weight: 700; color: #0a0c14; text-transform: uppercase; letter-spacing: 2px;">Ultimate Fantasy Dashboard</span>
        </div>
        
        <div style="display: flex; align-items: center; padding: 10px 16px; border-bottom: 1px solid rgba(220, 38, 38, 0.2);">
          ${logoBase64 ? `<img src="${logoBase64}" style="height: 40px; width: auto; flex-shrink: 0; margin-right: 12px; margin-top: 4px;" />` : ''}
          <div style="flex: 1;">
            <div style="font-size: 17px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.1;">${awardTitle}</div>
            <div style="font-size: 12px; margin-top: 2px;">
              <span style="color: #e5e7eb;">${leagueName}</span>
              <span style="color: #6b7280; margin: 0 4px;">•</span>
              <span style="color: #dc2626; font-weight: 600;">${selectedAwardSeason.value} ${type === 'best' ? 'Best' : 'Worst'}</span>
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
        
        <div style="background: #dc2626; padding: 8px 20px; text-align: center;">
          <span style="font-size: 12px; font-weight: 700; color: #0a0c14; text-transform: uppercase; letter-spacing: 2px;">Ultimate Fantasy Dashboard</span>
        </div>
        
        <div style="display: flex; align-items: center; padding: 10px 16px; border-bottom: 1px solid rgba(220, 38, 38, 0.2);">
          ${logoBase64 ? `<img src="${logoBase64}" style="height: 40px; width: auto; flex-shrink: 0; margin-right: 12px; margin-top: 4px;" />` : ''}
          <div style="flex: 1;">
            <div style="font-size: 17px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.1;">${awardTitle}</div>
            <div style="font-size: 12px; margin-top: 2px;">
              <span style="color: #e5e7eb;">${leagueName}</span>
              <span style="color: #6b7280; margin: 0 4px;">•</span>
              <span style="color: #dc2626; font-weight: 600;">${selectedWeeklyAwardSeason.value} Week ${selectedWeeklyAwardWeek.value}</span>
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
        
        <!-- Top Red Bar -->
        <div style="background: #dc2626; padding: 10px 24px; text-align: center;">
          <span style="font-size: 16px; font-weight: 700; color: #0a0c14; text-transform: uppercase; letter-spacing: 3px;">Ultimate Fantasy Dashboard</span>
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
        
        <!-- Top Red Bar -->
        <div style="background: #dc2626; padding: 10px 24px; text-align: center;">
          <span style="font-size: 16px; font-weight: 700; color: #0a0c14; text-transform: uppercase; letter-spacing: 3px;">Ultimate Fantasy Dashboard</span>
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
        
        <!-- Top Red Bar -->
        <div style="background: #dc2626; padding: 10px 24px; text-align: center;">
          <span style="font-size: 16px; font-weight: 700; color: #0a0c14; text-transform: uppercase; letter-spacing: 3px;">Ultimate Fantasy Dashboard</span>
        </div>
        
        <!-- Header -->
        <div style="display: flex; align-items: center; padding: 12px 24px; border-bottom: 1px solid rgba(220, 38, 38, 0.2);">
          ${logoBase64 ? `<img src="${logoBase64}" style="height: 50px; width: auto; flex-shrink: 0; margin-right: 16px; margin-top: 6px;" />` : ''}
          <div style="flex: 1;">
            <div style="font-size: 24px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 1px; line-height: 1.1;">Head-to-Head Matrix</div>
            <div style="font-size: 14px; margin-top: 3px; font-weight: 600;">
              <span style="color: #e5e7eb;">${leagueName}</span>
              <span style="color: #6b7280; margin: 0 6px;">•</span>
              <span style="color: #dc2626; font-weight: 700;">Current Members • All-Time</span>
            </div>
          </div>
        </div>
        
        <!-- Table Content -->
        <div style="padding: 16px 24px; overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr style="border-bottom: 2px solid rgba(220, 38, 38, 0.3);">
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
        <div style="padding: 12px 24px; text-align: center; border-top: 1px solid rgba(220, 38, 38, 0.2);">
          <span style="font-size: 18px; font-weight: bold; color: #dc2626;">ultimatefantasydashboard.com</span>
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
  isLoading.value = true
  
  try {
    const leagueKey = effectiveLeagueKey.value
    console.log('Loading history for league:', leagueKey, 'platform:', leagueStore.activePlatform)
    
    if (!leagueKey) {
      console.log('Missing leagueKey, waiting...')
      isLoading.value = false
      return
    }
    
    // Handle ESPN leagues
    if (isEspn.value) {
      console.log('[ESPN] Loading historical data for ESPN league')
      
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
      
      let successCount = 0
      
      for (const season of seasonsToTry) {
        loadingMessage.value = `Loading ${season} season... (${successCount} loaded)`
        
        try {
          // Fetch teams for this season
          const teams = await espnService.getTeams(sport, espnLeagueId, season)
          
          if (!teams || teams.length === 0) {
            console.log(`[ESPN] No data for ${season} season`)
            continue
          }
          
          successCount++
          
          // Transform teams to standings format
          const standings = teams.map((team: any, idx: number) => ({
            team_key: `espn_${sport}_${espnLeagueId}_${team.id}_${season}`,
            team_id: team.id.toString(),
            name: team.name,
            logo_url: team.logo || '',
            wins: team.wins || 0,
            losses: team.losses || 0,
            ties: team.ties || 0,
            points_for: team.pointsFor || 0,
            points_against: team.pointsAgainst || 0,
            rank: idx + 1,
            is_champion: idx === 0,
            // Owner info for proper attribution
            owner_id: team.primaryOwner || '',
            owner_name: team.ownerName || team.name
          }))
          
          console.log(`[ESPN] Got standings for ${season}:`, standings.length, 'teams')
          
          // Store season data
          historicalData.value[season.toString()] = {
            standings: standings,
            trade_count: 0
          }
          
          // Track team info (by owner for multi-season)
          standings.forEach((team: any) => {
            // Use owner_id as the key if available, otherwise team_key
            const trackingKey = team.owner_id || team.team_key
            
            if (!currentMembers.value.includes(trackingKey)) {
              currentMembers.value.push(trackingKey)
            }
            
            // Store team info keyed by owner for proper multi-season tracking
            if (!allTeams.value[trackingKey]) {
              allTeams.value[trackingKey] = {
                team_key: trackingKey,
                name: team.owner_name || team.name,
                logo_url: team.logo_url || ''
              }
            }
          })
          
          // Load matchups for H2H calculation
          loadingMessage.value = `Loading ${season} matchups...`
          const seasonMatchupsObj: Record<number, any[]> = {}
          
          // For current season, use current week; for past seasons, load all weeks
          const isCurrentSeason = season === currentSeason
          const maxWeek = isCurrentSeason 
            ? Math.min(leagueStore.currentLeague?.settings?.leg || 25, 25)
            : 25
          
          let consecutiveFailures = 0
          
          for (let week = 1; week <= maxWeek; week++) {
            loadingMessage.value = `Loading ${season} week ${week}...`
            try {
              const weekMatchups = await espnService.getMatchups(sport, espnLeagueId, season, week)
              
              if (weekMatchups && weekMatchups.length > 0) {
                consecutiveFailures = 0
                
                // Transform ESPN matchups - use owner IDs for tracking
                const transformedMatchups = weekMatchups.map((m: any) => {
                  const homeTeamData = standings.find((t: any) => t.team_id === m.homeTeamId?.toString())
                  const awayTeamData = standings.find((t: any) => t.team_id === m.awayTeamId?.toString())
                  
                  // Use owner_id for H2H tracking if available
                  const homeOwner = homeTeamData?.owner_id || `espn_${m.homeTeamId}`
                  const awayOwner = awayTeamData?.owner_id || `espn_${m.awayTeamId}`
                  
                  return {
                    matchup_id: m.id,
                    season: season,
                    teams: [
                      {
                        team_key: homeOwner,
                        team_id: m.homeTeamId?.toString(),
                        name: homeTeamData?.owner_name || homeTeamData?.name || 'Home Team',
                        points: m.homeScore || 0,
                        logo_url: homeTeamData?.logo_url || ''
                      },
                      {
                        team_key: awayOwner,
                        team_id: m.awayTeamId?.toString(),
                        name: awayTeamData?.owner_name || awayTeamData?.name || 'Away Team',
                        points: m.awayScore || 0,
                        logo_url: awayTeamData?.logo_url || ''
                      }
                    ],
                    winner_team_key: m.winner === 'HOME' ? homeOwner : 
                                     m.winner === 'AWAY' ? awayOwner : null
                  }
                })
                
                seasonMatchupsObj[week] = transformedMatchups
                
                // Build H2H records (by owner)
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
          
        } catch (e) {
          console.log(`[ESPN] Could not load ${season} season:`, e)
        }
      }
      
      console.log(`[ESPN] Finished loading: ${successCount} seasons`)
      
      // Set default award season
      if (availableSeasons.value.length > 0) {
        selectedAwardSeason.value = availableSeasons.value[0]
        selectedWeeklyAwardSeason.value = availableSeasons.value[0]
      }
      
      loadingMessage.value = `Done! Loaded ${successCount} season${successCount !== 1 ? 's' : ''}.`
      isLoading.value = false
      return
    }
    
    // Yahoo leagues - original logic
    if (!authStore.user?.id) {
      console.log('Missing userId, retrying in 1 second...')
      isLoading.value = false
      setTimeout(() => loadHistoricalData(), 1000)
      return
    }
    
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
    
    let successCount = 0
    let failCount = 0
    
    for (const season of seasons) {
      const seasonGameKey = gameKeys[season]
      if (!seasonGameKey) continue
      
      const seasonLeagueKey = `${seasonGameKey}.l.${leagueNum}`
      loadingMessage.value = `Loading ${season} season... (${successCount} loaded)`
      
      try {
        // Get standings for this season
        const standings = await yahooService.getStandings(seasonLeagueKey)
        console.log(`Got standings for ${season}:`, standings?.length || 0, 'teams')
        if (!standings || standings.length === 0) {
          failCount++
          continue
        }
        
        successCount++
        
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
        const seasonMatchupsObj: Record<number, any[]> = {}
        let consecutiveFailures = 0
        
        for (let week = 1; week <= 25; week++) {
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
    
  } catch (e) {
    console.error('Error loading historical data:', e)
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
