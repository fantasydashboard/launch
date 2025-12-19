<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-bold text-dark-text mb-2">League History</h1>
      <p class="text-base text-dark-textMuted">
        Career statistics, championship records, and historical trends
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-primary"></div>
    </div>

    <template v-else>
      <!-- Career Records -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">👑</span>
            <h2 class="card-title">Career Records</h2>
          </div>
          <p class="card-subtitle mt-2">All-time league leaders</p>
        </div>
        <div class="card-body">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div v-for="record in careerRecords" :key="record.label" 
                 class="relative overflow-hidden">
              <div class="p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border-2 border-primary/20 hover:border-primary/40 transition-all">
                <div class="flex items-start justify-between mb-4">
                  <div class="text-4xl">{{ record.icon }}</div>
                  <div class="text-right">
                    <div class="text-4xl font-black text-primary mb-1">{{ record.value }}</div>
                  </div>
                </div>
                <div class="space-y-1">
                  <div class="text-xs text-dark-textMuted uppercase tracking-wider font-bold">{{ record.label }}</div>
                  <div class="font-bold text-lg text-dark-text">{{ record.team }}</div>
                  <div class="text-xs text-dark-textMuted">{{ record.detail }}</div>
                </div>
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
                    showCurrentMembersOnlyCareer ? 'bg-primary' : 'bg-dark-border'
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
                  class="btn-primary flex items-center gap-2 text-sm"
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
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-dark-border">
                <th class="text-left py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider">Team</th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider cursor-pointer hover:bg-dark-border/30 transition-colors" @click="sortBy('seasons')">
                  <div class="flex items-center justify-center gap-1">
                    Seasons
                    <span class="inline-flex flex-col" style="font-size: 10px; line-height: 8px;">
                      <span :class="sortColumn === 'seasons' && sortDirection === 'asc' ? 'text-primary' : 'text-dark-textMuted'">▲</span>
                      <span :class="sortColumn === 'seasons' && sortDirection === 'desc' ? 'text-primary' : 'text-dark-textMuted'">▼</span>
                    </span>
                  </div>
                </th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider cursor-pointer hover:bg-dark-border/30 transition-colors" @click="sortBy('championships')">
                  <div class="flex items-center justify-center gap-1">
                    Championships
                    <span class="inline-flex flex-col" style="font-size: 10px; line-height: 8px;">
                      <span :class="sortColumn === 'championships' && sortDirection === 'asc' ? 'text-primary' : 'text-dark-textMuted'">▲</span>
                      <span :class="sortColumn === 'championships' && sortDirection === 'desc' ? 'text-primary' : 'text-dark-textMuted'">▼</span>
                    </span>
                  </div>
                </th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider cursor-pointer hover:bg-dark-border/30 transition-colors" @click="sortBy('wins')">
                  <div class="flex items-center justify-center gap-1">
                    Record
                    <span class="inline-flex flex-col" style="font-size: 10px; line-height: 8px;">
                      <span :class="sortColumn === 'wins' && sortDirection === 'asc' ? 'text-primary' : 'text-dark-textMuted'">▲</span>
                      <span :class="sortColumn === 'wins' && sortDirection === 'desc' ? 'text-primary' : 'text-dark-textMuted'">▼</span>
                    </span>
                  </div>
                </th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider cursor-pointer hover:bg-dark-border/30 transition-colors" @click="sortBy('win_pct')">
                  <div class="flex items-center justify-center gap-1">
                    Win %
                    <span class="inline-flex flex-col" style="font-size: 10px; line-height: 8px;">
                      <span :class="sortColumn === 'win_pct' && sortDirection === 'asc' ? 'text-primary' : 'text-dark-textMuted'">▲</span>
                      <span :class="sortColumn === 'win_pct' && sortDirection === 'desc' ? 'text-primary' : 'text-dark-textMuted'">▼</span>
                    </span>
                  </div>
                </th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider cursor-pointer hover:bg-dark-border/30 transition-colors" @click="sortBy('avg_ppg')">
                  <div class="flex items-center justify-center gap-1">
                    Avg PPG
                    <span class="inline-flex flex-col" style="font-size: 10px; line-height: 8px;">
                      <span :class="sortColumn === 'avg_ppg' && sortDirection === 'asc' ? 'text-primary' : 'text-dark-textMuted'">▲</span>
                      <span :class="sortColumn === 'avg_ppg' && sortDirection === 'desc' ? 'text-primary' : 'text-dark-textMuted'">▼</span>
                    </span>
                  </div>
                </th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider cursor-pointer hover:bg-dark-border/30 transition-colors" @click="sortBy('total_pf')">
                  <div class="flex items-center justify-center gap-1">
                    Total PF
                    <span class="inline-flex flex-col" style="font-size: 10px; line-height: 8px;">
                      <span :class="sortColumn === 'total_pf' && sortDirection === 'asc' ? 'text-primary' : 'text-dark-textMuted'">▲</span>
                      <span :class="sortColumn === 'total_pf' && sortDirection === 'desc' ? 'text-primary' : 'text-dark-textMuted'">▼</span>
                    </span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(stat, idx) in filteredCareerStats" :key="stat.owner_id" 
                  class="border-b border-dark-border hover:bg-dark-border/30 transition-colors">
                <td class="py-3 px-4">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                      <img
                        :src="stat.avatar"
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
                <td class="text-center py-3 px-4 font-semibold" :class="getRecordRankClass(stat.owner_id)">
                  {{ stat.wins }}-{{ stat.losses }}
                </td>
                <td class="text-center py-3 px-4">
                  <span :class="getWinPercentClass(stat.win_pct)">
                    {{ (stat.win_pct * 100).toFixed(1) }}%
                  </span>
                </td>
                <td class="text-center py-3 px-4 text-dark-text">{{ stat.avg_ppg.toFixed(1) }}</td>
                <td class="text-center py-3 px-4" :class="getPFRankClass(stat.owner_id)">{{ stat.total_pf.toFixed(0) }}</td>
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
              class="btn-primary flex items-center gap-2 text-sm"
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
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-dark-border">
                <th class="text-left py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider">Season</th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider">Avg PPG</th>
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
                <td class="text-center py-3 px-4 text-dark-text">{{ season.avg_ppg.toFixed(1) }}</td>
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
                    <span class="font-semibold text-dark-text">{{ season.champion }}</span>
                  </div>
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
              <span class="text-2xl">🎯</span>
              <h2 class="card-title">Head-to-Head Matrix</h2>
            </div>
            <div class="flex items-center gap-4">
              <!-- Toggle for current members only -->
              <label class="flex items-center gap-2 cursor-pointer">
                <span class="text-sm text-dark-textMuted">Current members only</span>
                <div class="relative">
                  <input type="checkbox" v-model="showCurrentMembersOnly" class="sr-only">
                  <div :class="[
                    'w-10 h-5 rounded-full transition-colors',
                    showCurrentMembersOnly ? 'bg-primary' : 'bg-dark-border'
                  ]"></div>
                  <div :class="[
                    'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform',
                    showCurrentMembersOnly ? 'translate-x-5' : 'translate-x-0'
                  ]"></div>
                </div>
              </label>
              <button 
                @click="downloadHeadToHead"
                :disabled="isDownloadingH2H"
                class="btn-primary flex items-center gap-2 text-sm"
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
          <table class="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th class="sticky left-0 bg-dark-elevated z-10 px-3 py-2 text-left border border-dark-border">Team</th>
                <th 
                  v-for="team in filteredH2HTeams" 
                  :key="`header-${team.user_id}`"
                  class="px-3 py-2 text-center border border-dark-border font-semibold text-dark-textSecondary uppercase tracking-wider"
                  style="min-width: 80px;"
                >
                  <div class="truncate" :title="team.team_name">{{ team.team_name.substring(0, 8) }}</div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="rowTeam in filteredH2HTeams" :key="`row-${rowTeam.user_id}`">
                <td class="sticky left-0 bg-dark-elevated z-10 px-3 py-2 font-semibold text-dark-text border border-dark-border whitespace-nowrap">
                  {{ rowTeam.team_name }}
                </td>
                <td 
                  v-for="colTeam in filteredH2HTeams" 
                  :key="`cell-${rowTeam.user_id}-${colTeam.user_id}`"
                  class="px-3 py-2 text-center border border-dark-border"
                  :class="getH2HCellClass(rowTeam.user_id, colTeam.user_id)"
                >
                  <span v-if="rowTeam.user_id === colTeam.user_id" class="text-dark-textMuted">—</span>
                  <span v-else class="font-semibold">
                    {{ getH2HRecord(rowTeam.user_id, colTeam.user_id) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
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
            <div class="flex gap-2">
              <button 
                v-for="tab in awardTabs" 
                :key="tab"
                @click="selectedAwardTab = tab"
                :class="[
                  'px-4 py-2 rounded-lg font-semibold transition-colors',
                  selectedAwardTab === tab 
                    ? 'bg-primary text-dark-bg' 
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
                <div v-for="award in allTimeHallOfFame" :key="award.title" class="bg-dark-border/30 rounded-xl p-4">
                  <div class="text-sm text-dark-textMuted uppercase tracking-wide mb-2">{{ award.title }}</div>
                  <div v-if="award.winner" class="flex items-center gap-3 mb-2">
                    <div class="w-12 h-12 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                      <img
                        :src="award.winner.avatar"
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
                      <div class="text-2xl font-bold text-green-400">{{ award.winner.value.toFixed(1) }}</div>
                    </div>
                  </div>
                  <div v-if="award.winner" class="text-xs text-dark-textSecondary">{{ award.winner.details }}</div>
                  <div v-else class="text-sm text-dark-textMuted italic">No data available</div>
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
                <div v-for="award in allTimeHallOfShame" :key="award.title" class="bg-dark-border/30 rounded-xl p-4">
                  <div class="text-sm text-dark-textMuted uppercase tracking-wide mb-2">{{ award.title }}</div>
                  <div v-if="award.winner" class="flex items-center gap-3 mb-2">
                    <div class="w-12 h-12 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                      <img
                        :src="award.winner.avatar"
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
                      <div class="text-2xl font-bold text-red-400">{{ award.winner.value.toFixed(1) }}</div>
                    </div>
                  </div>
                  <div v-if="award.winner" class="text-xs text-dark-textSecondary">{{ award.winner.details }}</div>
                  <div v-else class="text-sm text-dark-textMuted italic">No data available</div>
                </div>
              </div>
            </div>

            <!-- Trades & Waivers -->
            <div>
              <h3 class="text-xl font-bold text-dark-text mb-4 flex items-center gap-2">
                <span>📈</span>
                <span>Trades & Waivers</span>
              </h3>
              <div v-if="isLoadingTradeWaiverAwards" class="text-center py-8">
                <div class="animate-spin rounded-full h-12 w-12 border-b-4 border-primary mx-auto"></div>
                <p class="text-sm text-dark-textMuted mt-4">Analyzing transactions...</p>
              </div>
              <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <!-- Best Trade -->
                <div v-if="allTimeBestTrade" class="bg-dark-border/30 rounded-xl p-4">
                  <div class="text-sm text-dark-textMuted uppercase tracking-wide mb-3">🤝 Best Trade</div>
                  <div class="flex items-center gap-3 mb-3">
                    <div class="w-12 h-12 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                      <img
                        :src="allTimeBestTrade.avatar"
                        :alt="allTimeBestTrade.team_name"
                        class="w-full h-full object-cover"
                        @error="handleImageError"
                      />
                    </div>
                    <div class="flex-1">
                      <div class="font-bold text-dark-text">{{ allTimeBestTrade.team_name }}</div>
                      <div class="text-xs text-dark-textMuted">{{ allTimeBestTrade.season }}</div>
                    </div>
                  </div>
                  <div class="text-sm text-dark-textSecondary leading-relaxed">{{ allTimeBestTrade.details }}</div>
                </div>

                <!-- Best Waiver Pickups by Position -->
                <div v-for="waiver in allTimeBestWaivers" :key="waiver.position" class="bg-dark-border/30 rounded-xl p-4">
                  <div class="text-sm text-dark-textMuted uppercase tracking-wide mb-2">🎯 Best {{ waiver.position }} Waiver</div>
                  <div class="flex items-center gap-3 mb-2">
                    <div class="w-12 h-12 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                      <img
                        :src="waiver.avatar"
                        :alt="waiver.team_name"
                        class="w-full h-full object-cover"
                        @error="handleImageError"
                      />
                    </div>
                    <div class="flex-1">
                      <div class="font-bold text-dark-text">{{ waiver.player_name }}</div>
                      <div class="text-xs text-dark-textMuted">{{ waiver.team_name }} • {{ waiver.season }}</div>
                    </div>
                  </div>
                  <div class="text-xs text-dark-textSecondary">{{ waiver.details }}</div>
                </div>

                <!-- No data message -->
                <div v-if="!allTimeBestTrade && allTimeBestWaivers.length === 0" class="col-span-full text-center py-8 text-dark-textMuted italic">
                  No trade or waiver data available
                </div>
              </div>
            </div>
          </div>

          <!-- Season Awards -->
          <div v-if="selectedAwardTab === 'Season'">
            <!-- Best of the Year -->
            <div class="mb-8">
              <h3 class="text-xl font-bold text-dark-text mb-4 flex items-center gap-2">
                <span>⭐</span>
                <span>Best of {{ selectedAwardSeason }}</span>
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div v-for="award in seasonBestAwards" :key="award.title" class="bg-dark-border/30 rounded-xl p-4">
                  <div class="text-sm text-dark-textMuted uppercase tracking-wide mb-2">{{ award.title }}</div>
                  <div v-if="award.winner" class="flex items-center gap-3 mb-2">
                    <div class="w-12 h-12 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                      <img
                        :src="award.winner.avatar"
                        :alt="award.winner.team_name"
                        class="w-full h-full object-cover"
                        @error="handleImageError"
                      />
                    </div>
                    <div class="flex-1">
                      <div class="font-bold text-dark-text">{{ award.winner.team_name }}</div>
                      <div class="text-xs text-dark-textMuted">{{ selectedAwardSeason }}</div>
                    </div>
                    <div class="text-right">
                      <div class="text-2xl font-bold text-green-400">{{ award.winner.value.toFixed(1) }}</div>
                    </div>
                  </div>
                  <div v-if="award.winner" class="text-xs text-dark-textSecondary">{{ award.winner.details }}</div>
                  <div v-else class="text-sm text-dark-textMuted italic">No data available</div>
                </div>
              </div>
            </div>

            <!-- Worst of the Year -->
            <div class="mb-8">
              <h3 class="text-xl font-bold text-dark-text mb-4 flex items-center gap-2">
                <span>💀</span>
                <span>Worst of {{ selectedAwardSeason }}</span>
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div v-for="award in seasonWorstAwards" :key="award.title" class="bg-dark-border/30 rounded-xl p-4">
                  <div class="text-sm text-dark-textMuted uppercase tracking-wide mb-2">{{ award.title }}</div>
                  <div v-if="award.winner" class="flex items-center gap-3 mb-2">
                    <div class="w-12 h-12 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                      <img
                        :src="award.winner.avatar"
                        :alt="award.winner.team_name"
                        class="w-full h-full object-cover"
                        @error="handleImageError"
                      />
                    </div>
                    <div class="flex-1">
                      <div class="font-bold text-dark-text">{{ award.winner.team_name }}</div>
                      <div class="text-xs text-dark-textMuted">{{ selectedAwardSeason }}</div>
                    </div>
                    <div class="text-right">
                      <div class="text-2xl font-bold text-red-400">{{ award.winner.value.toFixed(1) }}</div>
                    </div>
                  </div>
                  <div v-if="award.winner" class="text-xs text-dark-textSecondary">{{ award.winner.details }}</div>
                  <div v-else class="text-sm text-dark-textMuted italic">No data available</div>
                </div>
              </div>
            </div>

            <!-- Trades & Waivers -->
            <div>
              <h3 class="text-xl font-bold text-dark-text mb-4 flex items-center gap-2">
                <span>📈</span>
                <span>Trades & Waivers - {{ selectedAwardSeason }}</span>
              </h3>
              <div v-if="isLoadingTradeWaiverAwards" class="text-center py-8">
                <div class="animate-spin rounded-full h-12 w-12 border-b-4 border-primary mx-auto"></div>
                <p class="text-sm text-dark-textMuted mt-4">Analyzing transactions...</p>
              </div>
              <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <!-- Best Trade for Season -->
                <div v-if="seasonBestTrade" class="bg-dark-border/30 rounded-xl p-4">
                  <div class="text-sm text-dark-textMuted uppercase tracking-wide mb-3">🤝 Best Trade</div>
                  <div class="flex items-center gap-3 mb-3">
                    <div class="w-12 h-12 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                      <img
                        :src="seasonBestTrade.avatar"
                        :alt="seasonBestTrade.team_name"
                        class="w-full h-full object-cover"
                        @error="handleImageError"
                      />
                    </div>
                    <div class="flex-1">
                      <div class="font-bold text-dark-text">{{ seasonBestTrade.team_name }}</div>
                      <div class="text-xs text-dark-textMuted">Week {{ seasonBestTrade.week }}</div>
                    </div>
                  </div>
                  <div class="text-sm text-dark-textSecondary leading-relaxed">{{ seasonBestTrade.details }}</div>
                </div>

                <!-- Best Waiver Pickups by Position for Season -->
                <div v-for="waiver in seasonBestWaivers" :key="waiver.position" class="bg-dark-border/30 rounded-xl p-4">
                  <div class="text-sm text-dark-textMuted uppercase tracking-wide mb-2">🎯 Best {{ waiver.position }} Waiver</div>
                  <div class="flex items-center gap-3 mb-2">
                    <div class="w-12 h-12 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                      <img
                        :src="waiver.avatar"
                        :alt="waiver.team_name"
                        class="w-full h-full object-cover"
                        @error="handleImageError"
                      />
                    </div>
                    <div class="flex-1">
                      <div class="font-bold text-dark-text">{{ waiver.player_name }}</div>
                      <div class="text-xs text-dark-textMuted">{{ waiver.team_name }}</div>
                    </div>
                  </div>
                  <div class="text-xs text-dark-textSecondary">{{ waiver.details }}</div>
                </div>

                <!-- No data message -->
                <div v-if="!seasonBestTrade && seasonBestWaivers.length === 0" class="col-span-full text-center py-8 text-dark-textMuted italic">
                  No trade or waiver data available for {{ selectedAwardSeason }}
                </div>
              </div>
            </div>
          </div>

          <!-- Weekly Awards -->
          <div v-if="selectedAwardTab === 'Weekly'">
            <!-- Best of the Week -->
            <div class="mb-8">
              <h3 class="text-xl font-bold text-dark-text mb-4 flex items-center gap-2">
                <span>🌟</span>
                <span>Best of Week {{ selectedWeeklyAwardWeek }}</span>
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div v-for="award in weeklyBestAwards" :key="award.title" class="bg-dark-border/30 rounded-xl p-4">
                  <div class="text-sm text-dark-textMuted uppercase tracking-wide mb-2">{{ award.title }}</div>
                  <div v-if="award.winner" class="flex items-center gap-3 mb-2">
                    <div class="w-12 h-12 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                      <img
                        :src="award.winner.avatar"
                        :alt="award.winner.team_name"
                        class="w-full h-full object-cover"
                        @error="handleImageError"
                      />
                    </div>
                    <div class="flex-1">
                      <div class="font-bold text-dark-text">{{ award.winner.team_name }}</div>
                      <div class="text-xs text-dark-textMuted">Week {{ selectedWeeklyAwardWeek }}, {{ selectedWeeklyAwardSeason }}</div>
                    </div>
                    <div class="text-right">
                      <div class="text-2xl font-bold text-green-400">{{ award.winner.value.toFixed(1) }}</div>
                    </div>
                  </div>
                  <div v-if="award.winner" class="text-xs text-dark-textSecondary">{{ award.winner.details }}</div>
                  <div v-else class="text-sm text-dark-textMuted italic">No data available</div>
                </div>
              </div>
            </div>

            <!-- Worst of the Week -->
            <div>
              <h3 class="text-xl font-bold text-dark-text mb-4 flex items-center gap-2">
                <span>😢</span>
                <span>Worst of Week {{ selectedWeeklyAwardWeek }}</span>
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div v-for="award in weeklyWorstAwards" :key="award.title" class="bg-dark-border/30 rounded-xl p-4">
                  <div class="text-sm text-dark-textMuted uppercase tracking-wide mb-2">{{ award.title }}</div>
                  <div v-if="award.winner" class="flex items-center gap-3 mb-2">
                    <div class="w-12 h-12 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                      <img
                        :src="award.winner.avatar"
                        :alt="award.winner.team_name"
                        class="w-full h-full object-cover"
                        @error="handleImageError"
                      />
                    </div>
                    <div class="flex-1">
                      <div class="font-bold text-dark-text">{{ award.winner.team_name }}</div>
                      <div class="text-xs text-dark-textMuted">Week {{ selectedWeeklyAwardWeek }}, {{ selectedWeeklyAwardSeason }}</div>
                    </div>
                    <div class="text-right">
                      <div class="text-2xl font-bold text-red-400">{{ award.winner.value.toFixed(1) }}</div>
                    </div>
                  </div>
                  <div v-if="award.winner" class="text-xs text-dark-textSecondary">{{ award.winner.details }}</div>
                  <div v-else class="text-sm text-dark-textMuted italic">No data available</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { sleeperService } from '@/services/sleeper'
import { awardsService } from '@/services/awards'
import type { AwardWinner, TradeAward, WaiverAward } from '@/services/awards'
import html2canvas from 'html2canvas'

const leagueStore = useLeagueStore()
const isLoading = ref(false)
const sortColumn = ref<string>('win_pct')
const sortDirection = ref<'asc' | 'desc'>('desc')

// Download state
const isDownloadingCareerStats = ref(false)
const isDownloadingSeasonHistory = ref(false)
const isDownloadingH2H = ref(false)

// H2H filter toggle
const showCurrentMembersOnly = ref(false)

// Career stats filter toggle
const showCurrentMembersOnlyCareer = ref(false)

// Awards state
const selectedAwardTab = ref<'All-Time' | 'Season' | 'Weekly'>('All-Time')
const selectedAwardSeason = ref<string>('')
const selectedWeeklyAwardSeason = ref<string>('')
const selectedWeeklyAwardWeek = ref<number>(1)
const awardTabs = ['All-Time', 'Season', 'Weekly']
const isLoadingTradeWaiverAwards = ref(false)
const allTimeBestTrade = ref<TradeAward | null>(null)
const allTimeBestWaivers = ref<WaiverAward[]>([])
const seasonBestTrade = ref<TradeAward | null>(null)
const seasonBestWaivers = ref<WaiverAward[]>([])
const seasonTradeCounts = ref<Map<string, number>>(new Map())

interface ChampionshipRecord {
  season: string
  team_name: string
  avatar: string
  record: string
  points: number
  owner_id: string
  total_championships: number
}

interface CareerStat {
  owner_id: string
  team_name: string
  avatar: string
  seasons: number
  championships: number
  wins: number
  losses: number
  win_pct: number
  avg_ppg: number
  total_pf: number
  potential_pf?: number
  efficiency: number
}

interface SeasonRecord {
  season: string
  team_count: number
  avg_ppg: number
  high_score: number
  high_scorer: string
  low_score: number
  low_scorer: string
  trade_count: number
  champion: string
}

interface RecordItem {
  label: string
  team: string
  value: string
  season?: string
  week?: number
  detail?: string
  icon?: string
}

// Computed Properties
const championships = computed((): ChampionshipRecord[] => {
  const champs: ChampionshipRecord[] = []
  
  console.log('=== CHAMPIONSHIP DETECTION (BRACKET-FIRST) ===')
  console.log('Processing seasons:', leagueStore.historicalSeasons.map(s => s.season))
  
  leagueStore.historicalSeasons.forEach(seasonInfo => {
    const rosters = leagueStore.historicalRosters.get(seasonInfo.season) || []
    const users = leagueStore.historicalUsers.get(seasonInfo.season) || []
    const bracket = leagueStore.historicalBrackets.get(seasonInfo.season) || []
    const matchups = leagueStore.historicalMatchups.get(seasonInfo.season)
    
    console.log(`\n--- Season ${seasonInfo.season} ---`)
    console.log('Bracket data:', bracket.length > 0 ? `${bracket.length} matchups` : 'NO BRACKET')
    
    let winnerRosterId: number | null = null
    let detectionMethod = 'none'
    
    // METHOD 1 (PRIMARY): Use winners_bracket endpoint
    if (bracket.length > 0) {
      winnerRosterId = sleeperService.getChampionFromBracket(bracket)
      if (winnerRosterId) {
        detectionMethod = 'winners_bracket'
        console.log(`✓ Method 1 (winners_bracket): Found winner roster_id = ${winnerRosterId}`)
      } else {
        console.log(`✗ Method 1 (winners_bracket): No winner in bracket data`)
      }
    }
    
    // METHOD 2: Check metadata for winner (fallback)
    if (!winnerRosterId && seasonInfo.metadata?.latest_league_winner_roster_id) {
      winnerRosterId = seasonInfo.metadata.latest_league_winner_roster_id
      detectionMethod = 'metadata'
      console.log(`✓ Method 2 (metadata): Found winner roster_id = ${winnerRosterId}`)
    }
    
    // METHOD 3: Look for team with most playoff_wins in settings
    if (!winnerRosterId && rosters.length > 0) {
      const maxPlayoffWins = Math.max(...rosters.map(r => r.settings?.playoff_wins || 0))
      if (maxPlayoffWins > 0) {
        const potentialWinners = rosters.filter(r => (r.settings?.playoff_wins || 0) === maxPlayoffWins)
        if (potentialWinners.length === 1) {
          winnerRosterId = potentialWinners[0].roster_id
          detectionMethod = 'playoff_wins'
          console.log(`✓ Method 3 (playoff_wins): Found winner roster_id = ${winnerRosterId} (${maxPlayoffWins} playoff wins)`)
        }
      }
    }
    
    // METHOD 4: Find championship matchup in playoff weeks
    if (!winnerRosterId && matchups) {
      const playoffWeekStart = seasonInfo.settings?.playoff_week_start || 15
      const weeks = Array.from(matchups.keys()).sort((a, b) => b - a)
      
      for (const week of weeks) {
        if (week >= playoffWeekStart) {
          const weekMatchups = matchups.get(week) || []
          const matchupGroups = new Map<number, typeof weekMatchups>()
          
          weekMatchups.forEach(m => {
            if (!m.matchup_id) return
            if (!matchupGroups.has(m.matchup_id)) {
              matchupGroups.set(m.matchup_id, [])
            }
            matchupGroups.get(m.matchup_id)!.push(m)
          })
          
          const twoTeamMatchups = Array.from(matchupGroups.values()).filter(m => m.length === 2)
          
          // Championship week typically has exactly 1 matchup (or look for matchup_id 1)
          if (twoTeamMatchups.length === 1) {
            const champGame = twoTeamMatchups[0]
            const winner = champGame.reduce((a, b) => ((a.points || 0) > (b.points || 0) ? a : b))
            winnerRosterId = winner.roster_id
            detectionMethod = 'championship_matchup'
            console.log(`✓ Method 4 (matchup): Found winner roster_id = ${winnerRosterId} in week ${week}`)
            break
          }
        }
      }
    }
    
    // If we found a winner by any method, add to championships
    if (winnerRosterId) {
      const roster = rosters.find(r => r.roster_id === winnerRosterId)
      if (roster) {
        const user = users.find(u => u.user_id === roster.owner_id)
        const teamName = sleeperService.getTeamName(roster, user)
        
        console.log(`✅ CHAMPION FOUND via ${detectionMethod}: ${teamName}`)
        
        champs.push({
          season: seasonInfo.season,
          team_name: teamName,
          avatar: sleeperService.getAvatarUrl(roster, user, seasonInfo),
          record: `${roster.settings?.wins || 0}-${roster.settings?.losses || 0}`,
          points: 0,
          owner_id: roster.owner_id,
          total_championships: 0
        })
      }
    } else {
      console.log(`❌ NO WINNER FOUND for ${seasonInfo.season}`)
    }
  })
  
  console.log(`\n=== CHAMPIONSHIP SUMMARY ===`)
  console.log(`Total championships found: ${champs.length}`)
  if (champs.length > 0) {
    console.log('Champions by season:', champs.map(c => `${c.season}: ${c.team_name}`).join(', '))
  }
  
  // Count total championships per owner
  const champCounts = new Map<string, number>()
  champs.forEach(champ => {
    champCounts.set(champ.owner_id, (champCounts.get(champ.owner_id) || 0) + 1)
  })
  
  if (champCounts.size > 0) {
    console.log('Championship counts:', Array.from(champCounts.entries()).map(([id, count]) => `${id}: ${count}`).join(', '))
  }
  
  // Add total championship count to each record
  champs.forEach(champ => {
    champ.total_championships = champCounts.get(champ.owner_id) || 0
  })
  
  return champs.sort((a, b) => b.season.localeCompare(a.season))
})

const careerStats = computed((): CareerStat[] => {
  const statsMap = new Map<string, CareerStat>()
  
  leagueStore.historicalSeasons.forEach(seasonInfo => {
    const rosters = leagueStore.historicalRosters.get(seasonInfo.season) || []
    const users = leagueStore.historicalUsers.get(seasonInfo.season) || []
    const matchups = leagueStore.historicalMatchups.get(seasonInfo.season) || new Map()
    const playoffStart = seasonInfo.settings?.playoff_week_start || 15
    
    rosters.forEach(roster => {
      const user = users.find(u => u.user_id === roster.owner_id)
      if (!user) return
      
      if (!statsMap.has(user.user_id)) {
        statsMap.set(user.user_id, {
          owner_id: user.user_id,
          team_name: sleeperService.getTeamName(roster, user),
          avatar: sleeperService.getAvatarUrl(roster, user, seasonInfo),
          seasons: 0,
          championships: 0,
          wins: 0,
          losses: 0,
          win_pct: 0,
          avg_ppg: 0,
          total_pf: 0,
          efficiency: 0
        })
      }
      
      const stat = statsMap.get(user.user_id)!
      stat.seasons++
      
      // Count championship for THIS season only - simple owner_id match
      const champRecord = championships.value.find(c => 
        c.season === seasonInfo.season && c.owner_id === user.user_id
      )
      if (champRecord) {
        stat.championships++
      }
      
      // Calculate regular season stats
      let seasonPoints = 0
      let seasonPotentialPoints = 0
      let seasonGames = 0
      let seasonWins = 0
      let seasonLosses = 0
      
      matchups.forEach((weekMatchups, week) => {
        if (week >= playoffStart) return
        
        const myMatch = weekMatchups.find(m => m.roster_id === roster.roster_id)
        if (!myMatch || !myMatch.matchup_id) return
        
        const opponent = weekMatchups.find(
          m => m.matchup_id === myMatch.matchup_id && m.roster_id !== roster.roster_id
        )
        
        if (opponent) {
          seasonPoints += myMatch.points || 0
          seasonGames++
          
          // Potential points is the max score that week
          const maxScoreThisWeek = Math.max(...weekMatchups.map(m => m.points || 0))
          seasonPotentialPoints += maxScoreThisWeek
          
          if ((myMatch.points || 0) > (opponent.points || 0)) seasonWins++
          else if ((myMatch.points || 0) < (opponent.points || 0)) seasonLosses++
        }
      })
      
      stat.wins += seasonWins
      stat.losses += seasonLosses
      stat.total_pf += seasonPoints
      
      // Track potential points for efficiency calculation
      if (!stat.potential_pf) stat.potential_pf = 0
      stat.potential_pf += seasonPotentialPoints
    })
  })
  
  // Calculate averages and efficiency
  const stats = Array.from(statsMap.values())
  stats.forEach(stat => {
    const totalGames = stat.wins + stat.losses
    stat.win_pct = totalGames > 0 ? stat.wins / totalGames : 0
    stat.avg_ppg = totalGames > 0 ? stat.total_pf / totalGames : 0
    
    // Efficiency: points / potential_points (simple formula)
    stat.efficiency = stat.potential_pf && stat.potential_pf > 0 
      ? stat.total_pf / stat.potential_pf 
      : 0
  })
  
  return stats.sort((a, b) => b.win_pct - a.win_pct)
})

const sortedCareerStats = computed((): CareerStat[] => {
  const stats = [...careerStats.value]
  
  stats.sort((a, b) => {
    let valA = a[sortColumn.value as keyof CareerStat]
    let valB = b[sortColumn.value as keyof CareerStat]
    
    // Handle string comparison
    if (typeof valA === 'string') valA = valA.toLowerCase()
    if (typeof valB === 'string') valB = valB.toLowerCase()
    
    if (sortDirection.value === 'asc') {
      return valA < valB ? -1 : valA > valB ? 1 : 0
    } else {
      return valA > valB ? -1 : valA < valB ? 1 : 0
    }
  })
  
  return stats
})

// Filtered career stats based on toggle
const filteredCareerStats = computed((): CareerStat[] => {
  if (!showCurrentMembersOnlyCareer.value) {
    return sortedCareerStats.value
  }
  return sortedCareerStats.value.filter(stat => currentMemberIds.value.has(stat.owner_id))
})

// Get record rankings for coloring (top 3 green, bottom 3 red)
const recordRankings = computed(() => {
  const stats = [...filteredCareerStats.value]
  // Sort by wins descending
  stats.sort((a, b) => b.wins - a.wins)
  
  const rankings = new Map<string, 'top' | 'bottom' | 'middle'>()
  
  stats.forEach((stat, idx) => {
    if (idx < 3) {
      rankings.set(stat.owner_id, 'top')
    } else if (idx >= stats.length - 3) {
      rankings.set(stat.owner_id, 'bottom')
    } else {
      rankings.set(stat.owner_id, 'middle')
    }
  })
  
  return rankings
})

// Get class for record column based on ranking
function getRecordRankClass(ownerId: string): string {
  const rank = recordRankings.value.get(ownerId)
  if (rank === 'top') return 'text-green-400'
  if (rank === 'bottom') return 'text-red-400'
  return 'text-dark-text'
}

// Get Total PF rankings for coloring (top 3 green, bottom 3 red)
const pfRankings = computed(() => {
  const stats = [...filteredCareerStats.value]
  // Sort by total_pf descending
  stats.sort((a, b) => b.total_pf - a.total_pf)
  
  const rankings = new Map<string, 'top' | 'bottom' | 'middle'>()
  
  stats.forEach((stat, idx) => {
    if (idx < 3) {
      rankings.set(stat.owner_id, 'top')
    } else if (idx >= stats.length - 3) {
      rankings.set(stat.owner_id, 'bottom')
    } else {
      rankings.set(stat.owner_id, 'middle')
    }
  })
  
  return rankings
})

// Get class for Total PF column based on ranking
function getPFRankClass(ownerId: string): string {
  const rank = pfRankings.value.get(ownerId)
  if (rank === 'top') return 'text-green-400'
  if (rank === 'bottom') return 'text-red-400'
  return 'text-dark-textMuted'
}

const seasonRecords = computed((): SeasonRecord[] => {
  const records: SeasonRecord[] = []
  
  leagueStore.historicalSeasons.forEach(seasonInfo => {
    const rosters = leagueStore.historicalRosters.get(seasonInfo.season) || []
    const users = leagueStore.historicalUsers.get(seasonInfo.season) || []
    const matchups = leagueStore.historicalMatchups.get(seasonInfo.season) || new Map()
    const playoffStart = seasonInfo.settings?.playoff_week_start || 15
    
    // Track season totals per team for high/low scores
    const teamSeasonTotals = new Map<number, { total: number; games: number; name: string }>()
    
    let totalPoints = 0
    let totalGames = 0
    
    matchups.forEach((weekMatchups, week) => {
      // Only count weeks 1-14 for regular season
      if (week >= playoffStart) return
      
      weekMatchups.forEach(matchup => {
        const score = matchup.points || 0
        totalPoints += score
        totalGames++
        
        // Track team season totals
        if (!teamSeasonTotals.has(matchup.roster_id)) {
          const roster = rosters.find(r => r.roster_id === matchup.roster_id)
          const user = users.find(u => u.user_id === roster?.owner_id)
          teamSeasonTotals.set(matchup.roster_id, {
            total: 0,
            games: 0,
            name: sleeperService.getTeamName(roster!, user)
          })
        }
        
        const teamData = teamSeasonTotals.get(matchup.roster_id)!
        teamData.total += score
        teamData.games++
      })
    })
    
    // Find highest and lowest season totals
    let highScore = 0
    let highScorer = 'N/A'
    let lowScore = Infinity
    let lowScorer = 'N/A'
    
    teamSeasonTotals.forEach((data, rosterId) => {
      if (data.total > highScore) {
        highScore = data.total
        highScorer = data.name
      }
      if (data.total < lowScore) {
        lowScore = data.total
        lowScorer = data.name
      }
    })
    
    // Get trade count from pre-fetched data
    const tradeCount = seasonTradeCounts.value.get(seasonInfo.season) || 0
    
    const champ = championships.value.find(c => c.season === seasonInfo.season)
    
    records.push({
      season: seasonInfo.season,
      team_count: rosters.length,
      avg_ppg: totalGames > 0 ? totalPoints / totalGames : 0,
      high_score: highScore,
      high_scorer: highScorer,
      low_score: lowScore === Infinity ? 0 : lowScore,
      low_scorer: lowScorer,
      trade_count: tradeCount,
      champion: champ?.team_name || 'TBD'
    })
  })
  
  return records.sort((a, b) => b.season.localeCompare(a.season))
})

const weeklyRecords = computed((): RecordItem[] => {
  let highestScore = { value: 0, team: 'N/A', season: '', week: 0 }
  let lowestScore = { value: Infinity, team: 'N/A', season: '', week: 0 }
  
  leagueStore.historicalSeasons.forEach(seasonInfo => {
    const rosters = leagueStore.historicalRosters.get(seasonInfo.season) || []
    const users = leagueStore.historicalUsers.get(seasonInfo.season) || []
    const matchups = leagueStore.historicalMatchups.get(seasonInfo.season) || new Map()
    
    matchups.forEach((weekMatchups, week) => {
      weekMatchups.forEach(matchup => {
        const score = matchup.points || 0
        const roster = rosters.find(r => r.roster_id === matchup.roster_id)
        const user = users.find(u => u.user_id === roster?.owner_id)
        const teamName = sleeperService.getTeamName(roster!, user)
        
        if (score > highestScore.value) {
          highestScore = { value: score, team: teamName, season: seasonInfo.season, week }
        }
        
        if (score < lowestScore.value && score > 0) {
          lowestScore = { value: score, team: teamName, season: seasonInfo.season, week }
        }
      })
    })
  })
  
  return [
    {
      label: 'Highest Single Week',
      team: highestScore.team,
      value: highestScore.value.toFixed(1),
      season: highestScore.season,
      week: highestScore.week
    },
    {
      label: 'Lowest Single Week',
      team: lowestScore.team,
      value: lowestScore.value === Infinity ? '0.0' : lowestScore.value.toFixed(1),
      season: lowestScore.season,
      week: lowestScore.week
    }
  ]
})

const careerRecords = computed((): RecordItem[] => {
  const stats = careerStats.value
  if (stats.length === 0) return []
  
  // Find all teams tied for each record
  const maxWins = Math.max(...stats.map(s => s.wins))
  const teamsWithMostWins = stats.filter(s => s.wins === maxWins)
  
  const maxPoints = Math.max(...stats.map(s => s.total_pf))
  const teamsWithMostPoints = stats.filter(s => s.total_pf === maxPoints)
  
  const maxWinPct = Math.max(...stats.map(s => s.win_pct))
  const teamsWithBestWinPct = stats.filter(s => s.win_pct === maxWinPct)
  
  const maxChamps = Math.max(...stats.map(s => s.championships))
  const teamsWithMostChamps = stats.filter(s => s.championships === maxChamps)
  
  // Helper to format team names (handles ties)
  const formatTeamNames = (teams: typeof stats) => {
    if (teams.length === 1) return teams[0].team_name
    if (teams.length === 2) return `${teams[0].team_name} & ${teams[1].team_name}`
    return teams.map(t => t.team_name).join(', ')
  }
  
  // Helper to format detail (handles ties)
  const formatDetail = (teams: typeof stats, detailFn: (t: typeof stats[0]) => string) => {
    if (teams.length === 1) return detailFn(teams[0])
    return `${teams.length}-way tie`
  }
  
  return [
    {
      label: 'Most Championships',
      team: formatTeamNames(teamsWithMostChamps),
      value: maxChamps.toString(),
      detail: formatDetail(teamsWithMostChamps, t => `${t.seasons} seasons`),
      icon: '🏆'
    },
    {
      label: 'Most Career Wins',
      team: formatTeamNames(teamsWithMostWins),
      value: maxWins.toString(),
      detail: formatDetail(teamsWithMostWins, t => `${t.seasons} seasons`),
      icon: '🎯'
    },
    {
      label: 'Most Career Points',
      team: formatTeamNames(teamsWithMostPoints),
      value: maxPoints.toFixed(0),
      detail: formatDetail(teamsWithMostPoints, t => `${t.avg_ppg.toFixed(1)} PPG`),
      icon: '⚡'
    },
    {
      label: 'Best Win Percentage',
      team: formatTeamNames(teamsWithBestWinPct),
      value: `${(maxWinPct * 100).toFixed(1)}%`,
      detail: formatDetail(teamsWithBestWinPct, t => `${t.wins}-${t.losses}`),
      icon: '📈'
    }
  ]
})

// Awards computed properties
const availableSeasons = computed(() => {
  return leagueStore.historicalSeasons.map(s => s.season).sort().reverse()
})

const availableWeeksForAwards = computed(() => {
  if (!selectedWeeklyAwardSeason.value) return []
  const matchups = leagueStore.historicalMatchups.get(selectedWeeklyAwardSeason.value)
  if (!matchups) return []
  const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === selectedWeeklyAwardSeason.value)
  const playoffStart = seasonInfo?.settings?.playoff_week_start || 15
  return Array.from(matchups.keys()).filter(w => w < playoffStart).sort((a, b) => a - b)
})

interface Award {
  title: string
  winner: AwardWinner | null
}

const allTimeHallOfFame = computed((): Award[] => {
  const awards: Award[] = []
  let bestSeason: AwardWinner | null = null
  let bestWeek: AwardWinner | null = null
  let bestBlowout: AwardWinner | null = null
  let luckiest: AwardWinner | null = null

  leagueStore.historicalSeasons.forEach(seasonInfo => {
    const rosters = leagueStore.historicalRosters.get(seasonInfo.season) || []
    const users = leagueStore.historicalUsers.get(seasonInfo.season) || []
    const matchups = leagueStore.historicalMatchups.get(seasonInfo.season)
    if (!matchups) return

    const playoffStart = seasonInfo.settings?.playoff_week_start || 15

    const seasonWinner = awardsService.findMostPointsSeason(rosters, users, matchups, seasonInfo, playoffStart)
    if (seasonWinner && (!bestSeason || seasonWinner.value > bestSeason.value)) {
      bestSeason = { ...seasonWinner, season: seasonInfo.season }
    }

    const weekWinner = awardsService.findMostPointsWeek(rosters, users, matchups, seasonInfo, playoffStart)
    if (weekWinner && (!bestWeek || weekWinner.value > bestWeek.value)) {
      bestWeek = { ...weekWinner, season: seasonInfo.season }
    }

    const blowout = awardsService.findBiggestBlowout(matchups, rosters, users, seasonInfo, playoffStart)
    if (blowout && (!bestBlowout || blowout.value > bestBlowout.value)) {
      bestBlowout = { ...blowout, season: seasonInfo.season }
    }

    const lucky = awardsService.findLuckiestTeam(rosters, users, matchups, seasonInfo, playoffStart)
    if (lucky && (!luckiest || lucky.value > luckiest.value)) {
      luckiest = { ...lucky, season: seasonInfo.season }
    }
  })

  awards.push({ title: '🏆 Most Points in a Season', winner: bestSeason })
  awards.push({ title: '🔥 Most Points in a Week', winner: bestWeek })
  awards.push({ title: '💥 Biggest Blowout', winner: bestBlowout })
  awards.push({ title: '🍀 Luckiest Team', winner: luckiest })

  return awards
})

const allTimeHallOfShame = computed((): Award[] => {
  const awards: Award[] = []
  let worstSeason: AwardWinner | null = null
  let worstWeek: AwardWinner | null = null
  let worstLoss: AwardWinner | null = null
  let unluckiest: AwardWinner | null = null

  leagueStore.historicalSeasons.forEach(seasonInfo => {
    const rosters = leagueStore.historicalRosters.get(seasonInfo.season) || []
    const users = leagueStore.historicalUsers.get(seasonInfo.season) || []
    const matchups = leagueStore.historicalMatchups.get(seasonInfo.season)
    if (!matchups) return

    const playoffStart = seasonInfo.settings?.playoff_week_start || 15

    const seasonLoser = awardsService.findLeastPointsSeason(rosters, users, matchups, seasonInfo, playoffStart)
    if (seasonLoser && (!worstSeason || seasonLoser.value < worstSeason.value)) {
      worstSeason = { ...seasonLoser, season: seasonInfo.season }
    }

    const weekLoser = awardsService.findLeastPointsWeek(rosters, users, matchups, seasonInfo, playoffStart)
    if (weekLoser && (!worstWeek || weekLoser.value < worstWeek.value)) {
      worstWeek = { ...weekLoser, season: seasonInfo.season }
    }

    const biggestLoss = awardsService.findBiggestLoss(matchups, rosters, users, seasonInfo, playoffStart)
    if (biggestLoss && (!worstLoss || biggestLoss.value > worstLoss.value)) {
      worstLoss = { ...biggestLoss, season: seasonInfo.season }
    }

    const unlucky = awardsService.findUnluckiestTeam(rosters, users, matchups, seasonInfo, playoffStart)
    if (unlucky && (!unluckiest || unlucky.value > unluckiest.value)) {
      unluckiest = { ...unlucky, season: seasonInfo.season }
    }
  })

  awards.push({ title: '💩 Least Points in a Season', winner: worstSeason })
  awards.push({ title: '😴 Least Points in a Week', winner: worstWeek })
  awards.push({ title: '😭 Biggest Loss', winner: worstLoss })
  awards.push({ title: '😢 Unluckiest Team', winner: unluckiest })

  return awards
})

const seasonBestAwards = computed((): Award[] => {
  if (!selectedAwardSeason.value) return []

  const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === selectedAwardSeason.value)
  if (!seasonInfo) return []

  const rosters = leagueStore.historicalRosters.get(selectedAwardSeason.value) || []
  const users = leagueStore.historicalUsers.get(selectedAwardSeason.value) || []
  const matchups = leagueStore.historicalMatchups.get(selectedAwardSeason.value)
  if (!matchups) return []

  const playoffStart = seasonInfo.settings?.playoff_week_start || 15

  return [
    { title: '🏆 Most Points', winner: awardsService.findMostPointsSeason(rosters, users, matchups, seasonInfo, playoffStart) },
    { title: '🔥 Highest Week', winner: awardsService.findMostPointsWeek(rosters, users, matchups, seasonInfo, playoffStart) },
    { title: '💥 Biggest Blowout', winner: awardsService.findBiggestBlowout(matchups, rosters, users, seasonInfo, playoffStart) },
    { title: '🍀 Luckiest Team', winner: awardsService.findLuckiestTeam(rosters, users, matchups, seasonInfo, playoffStart) }
  ]
})

const seasonWorstAwards = computed((): Award[] => {
  if (!selectedAwardSeason.value) return []

  const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === selectedAwardSeason.value)
  if (!seasonInfo) return []

  const rosters = leagueStore.historicalRosters.get(selectedAwardSeason.value) || []
  const users = leagueStore.historicalUsers.get(selectedAwardSeason.value) || []
  const matchups = leagueStore.historicalMatchups.get(selectedAwardSeason.value)
  if (!matchups) return []

  const playoffStart = seasonInfo.settings?.playoff_week_start || 15

  return [
    { title: '💩 Least Points', winner: awardsService.findLeastPointsSeason(rosters, users, matchups, seasonInfo, playoffStart) },
    { title: '😴 Lowest Week', winner: awardsService.findLeastPointsWeek(rosters, users, matchups, seasonInfo, playoffStart) },
    { title: '😭 Biggest Loss', winner: awardsService.findBiggestLoss(matchups, rosters, users, seasonInfo, playoffStart) },
    { title: '😢 Unluckiest Team', winner: awardsService.findUnluckiestTeam(rosters, users, matchups, seasonInfo, playoffStart) }
  ]
})

const weeklyBestAwards = computed((): Award[] => {
  if (!selectedWeeklyAwardSeason.value || !selectedWeeklyAwardWeek.value) return []

  const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === selectedWeeklyAwardSeason.value)
  if (!seasonInfo) return []

  const rosters = leagueStore.historicalRosters.get(selectedWeeklyAwardSeason.value) || []
  const users = leagueStore.historicalUsers.get(selectedWeeklyAwardSeason.value) || []
  const matchups = leagueStore.historicalMatchups.get(selectedWeeklyAwardSeason.value)
  if (!matchups) return []

  const weekMatchups = matchups.get(selectedWeeklyAwardWeek.value) || []
  
  // Find highest score this week
  let highestScore: AwardWinner | null = null
  let highestMargin: AwardWinner | null = null
  
  weekMatchups.forEach(matchup => {
    const points = matchup.points || 0
    if (!highestScore || points > highestScore.value) {
      const roster = rosters.find(r => r.roster_id === matchup.roster_id)
      const user = users.find(u => u.user_id === roster?.owner_id)
      highestScore = {
        team_name: sleeperService.getTeamName(roster!, user),
        owner_id: roster?.owner_id || '',
        avatar: sleeperService.getAvatarUrl(roster!, user, seasonInfo),
        value: points,
        details: `${points.toFixed(1)} points`
      }
    }
  })

  // Find biggest blowout this week
  const matchupGroups = new Map<number, typeof weekMatchups>()
  weekMatchups.forEach(m => {
    if (!m.matchup_id) return
    if (!matchupGroups.has(m.matchup_id)) matchupGroups.set(m.matchup_id, [])
    matchupGroups.get(m.matchup_id)!.push(m)
  })

  matchupGroups.forEach(matchup => {
    if (matchup.length !== 2) return
    const [team1, team2] = matchup
    const margin = Math.abs((team1.points || 0) - (team2.points || 0))
    
    if (!highestMargin || margin > highestMargin.value) {
      const winner = (team1.points || 0) > (team2.points || 0) ? team1 : team2
      const roster = rosters.find(r => r.roster_id === winner.roster_id)
      const user = users.find(u => u.user_id === roster?.owner_id)
      highestMargin = {
        team_name: sleeperService.getTeamName(roster!, user),
        owner_id: roster?.owner_id || '',
        avatar: sleeperService.getAvatarUrl(roster!, user, seasonInfo),
        value: margin,
        details: `Won by ${margin.toFixed(1)} points`
      }
    }
  })

  return [
    { title: '🏆 Most Points', winner: highestScore },
    { title: '💥 Biggest Blowout', winner: highestMargin }
  ]
})

const weeklyWorstAwards = computed((): Award[] => {
  if (!selectedWeeklyAwardSeason.value || !selectedWeeklyAwardWeek.value) return []

  const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === selectedWeeklyAwardSeason.value)
  if (!seasonInfo) return []

  const rosters = leagueStore.historicalRosters.get(selectedWeeklyAwardSeason.value) || []
  const users = leagueStore.historicalUsers.get(selectedWeeklyAwardSeason.value) || []
  const matchups = leagueStore.historicalMatchups.get(selectedWeeklyAwardSeason.value)
  if (!matchups) return []

  const weekMatchups = matchups.get(selectedWeeklyAwardWeek.value) || []
  
  // Find lowest score this week
  let lowestScore: AwardWinner | null = null
  let biggestLoss: AwardWinner | null = null
  
  weekMatchups.forEach(matchup => {
    const points = matchup.points || 0
    if (points > 0 && (!lowestScore || points < lowestScore.value)) {
      const roster = rosters.find(r => r.roster_id === matchup.roster_id)
      const user = users.find(u => u.user_id === roster?.owner_id)
      lowestScore = {
        team_name: sleeperService.getTeamName(roster!, user),
        owner_id: roster?.owner_id || '',
        avatar: sleeperService.getAvatarUrl(roster!, user, seasonInfo),
        value: points,
        details: `${points.toFixed(1)} points`
      }
    }
  })

  // Find biggest loss this week
  const matchupGroups = new Map<number, typeof weekMatchups>()
  weekMatchups.forEach(m => {
    if (!m.matchup_id) return
    if (!matchupGroups.has(m.matchup_id)) matchupGroups.set(m.matchup_id, [])
    matchupGroups.get(m.matchup_id)!.push(m)
  })

  matchupGroups.forEach(matchup => {
    if (matchup.length !== 2) return
    const [team1, team2] = matchup
    const margin = Math.abs((team1.points || 0) - (team2.points || 0))
    
    if (!biggestLoss || margin > biggestLoss.value) {
      const loser = (team1.points || 0) < (team2.points || 0) ? team1 : team2
      const roster = rosters.find(r => r.roster_id === loser.roster_id)
      const user = users.find(u => u.user_id === roster?.owner_id)
      biggestLoss = {
        team_name: sleeperService.getTeamName(roster!, user),
        owner_id: roster?.owner_id || '',
        avatar: sleeperService.getAvatarUrl(roster!, user, seasonInfo),
        value: margin,
        details: `Lost by ${margin.toFixed(1)} points`
      }
    }
  })

  return [
    { title: '💩 Least Points', winner: lowestScore },
    { title: '😭 Biggest Loss', winner: biggestLoss }
  ]
})

// Helper Methods
// Trade & Waiver Award Loading
async function loadAllTimeTradeWaiverAwards() {
  isLoadingTradeWaiverAwards.value = true
  allTimeBestTrade.value = null
  allTimeBestWaivers.value = []

  try {
    const allPlayers = await sleeperService.getPlayers()
    let bestTrade: TradeAward | null = null
    const bestWaiversByPosition = new Map<string, WaiverAward>()

    // Analyze all seasons
    for (const seasonInfo of leagueStore.historicalSeasons) {
      const season = seasonInfo.season
      const leagueId = seasonInfo.league_id
      const rosters = leagueStore.historicalRosters.get(season) || []
      const users = leagueStore.historicalUsers.get(season) || []
      const matchups = leagueStore.historicalMatchups.get(season)
      if (!matchups) continue

      // Fetch transactions for this season
      const transactions = await sleeperService.getAllTransactions(leagueId)
      if (transactions.length === 0) continue

      // Find best trade
      const seasonTrade = await awardsService.findBestTrade(
        season,
        leagueId,
        transactions,
        matchups,
        rosters,
        users,
        seasonInfo,
        allPlayers
      )

      if (seasonTrade && (!bestTrade || seasonTrade.value < bestTrade.value)) {
        bestTrade = seasonTrade
      }

      // Find best waivers for each position
      for (const position of ['QB', 'RB', 'WR', 'TE']) {
        const waiver = await awardsService.findBestWaiverPickup(
          position,
          season,
          leagueId,
          transactions,
          matchups,
          rosters,
          users,
          seasonInfo,
          allPlayers
        )

        if (waiver) {
          const existing = bestWaiversByPosition.get(position)
          if (!existing || waiver.avg_rank < existing.avg_rank) {
            bestWaiversByPosition.set(position, waiver)
          }
        }
      }
    }

    allTimeBestTrade.value = bestTrade
    allTimeBestWaivers.value = Array.from(bestWaiversByPosition.values())
  } catch (error) {
    console.error('Error loading all-time trade/waiver awards:', error)
  } finally {
    isLoadingTradeWaiverAwards.value = false
  }
}

async function loadSeasonTradeWaiverAwards(season: string) {
  if (!season) return
  
  isLoadingTradeWaiverAwards.value = true
  seasonBestTrade.value = null
  seasonBestWaivers.value = []

  try {
    const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === season)
    if (!seasonInfo) return

    const leagueId = seasonInfo.league_id
    const rosters = leagueStore.historicalRosters.get(season) || []
    const users = leagueStore.historicalUsers.get(season) || []
    const matchups = leagueStore.historicalMatchups.get(season)
    if (!matchups) return

    const allPlayers = await sleeperService.getPlayers()
    const transactions = await sleeperService.getAllTransactions(leagueId)
    if (transactions.length === 0) return

    // Find best trade for this season
    const trade = await awardsService.findBestTrade(
      season,
      leagueId,
      transactions,
      matchups,
      rosters,
      users,
      seasonInfo,
      allPlayers
    )
    seasonBestTrade.value = trade

    // Find best waivers for each position
    const waivers: WaiverAward[] = []
    for (const position of ['QB', 'RB', 'WR', 'TE']) {
      const waiver = await awardsService.findBestWaiverPickup(
        position,
        season,
        leagueId,
        transactions,
        matchups,
        rosters,
        users,
        seasonInfo,
        allPlayers
      )
      if (waiver) waivers.push(waiver)
    }
    seasonBestWaivers.value = waivers
  } catch (error) {
    console.error('Error loading season trade/waiver awards:', error)
  } finally {
    isLoadingTradeWaiverAwards.value = false
  }
}

function sortBy(column: string) {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = column
    sortDirection.value = 'desc'
  }
}

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement
  img.src = 'https://sleepercdn.com/avatars/thumbs/default'
}

function getWinPercentClass(winPct: number): string {
  if (winPct >= 0.6) return 'text-green-400 font-bold'
  if (winPct <= 0.4) return 'text-red-400'
  return 'text-dark-text'
}

function getEfficiencyClass(efficiency: number): string {
  if (efficiency >= 1.0) return 'text-green-400 font-bold'
  if (efficiency <= 0.85) return 'text-red-400'
  return 'text-dark-text'
}

// Watch for tab changes to load trade/waiver data
watch(selectedAwardTab, (newTab) => {
  if (newTab === 'All-Time') {
    loadAllTimeTradeWaiverAwards()
  }
})

watch(selectedAwardSeason, (newSeason) => {
  if (newSeason && selectedAwardTab.value === 'Season') {
    loadSeasonTradeWaiverAwards(newSeason)
  }
})

// ===== H2H MATRIX FUNCTIONS =====

// Get current season's member user IDs
const currentMemberIds = computed(() => {
  const currentSeason = leagueStore.historicalSeasons[0]
  if (!currentSeason) return new Set<string>()
  
  const rosters = leagueStore.historicalRosters.get(currentSeason.season) || []
  return new Set(rosters.map(r => r.owner_id).filter(Boolean))
})

// Get all teams for H2H Matrix
const h2hMatrixTeams = computed(() => {
  // Get all unique users across all seasons
  const usersMap = new Map<string, { user_id: string; team_name: string; avatar: string }>()
  
  leagueStore.historicalSeasons.forEach(seasonInfo => {
    const rosters = leagueStore.historicalRosters.get(seasonInfo.season) || []
    const users = leagueStore.historicalUsers.get(seasonInfo.season) || []
    
    rosters.forEach(roster => {
      const user = users.find(u => u.user_id === roster.owner_id)
      if (user && !usersMap.has(user.user_id)) {
        usersMap.set(user.user_id, {
          user_id: user.user_id,
          team_name: sleeperService.getTeamName(roster, user),
          avatar: sleeperService.getAvatarUrl(roster, user, seasonInfo)
        })
      }
    })
  })
  
  return Array.from(usersMap.values()).sort((a, b) => a.team_name.localeCompare(b.team_name))
})

// Filtered H2H teams based on toggle
const filteredH2HTeams = computed(() => {
  if (!showCurrentMembersOnly.value) {
    return h2hMatrixTeams.value
  }
  return h2hMatrixTeams.value.filter(team => currentMemberIds.value.has(team.user_id))
})

// Get all-time H2H record between two users
function getH2HRecord(userId1: string, userId2: string): string {
  if (userId1 === userId2) return '—'
  
  let wins = 0
  let losses = 0
  
  leagueStore.historicalSeasons.forEach(seasonInfo => {
    const rosters = leagueStore.historicalRosters.get(seasonInfo.season) || []
    const matchups = leagueStore.historicalMatchups.get(seasonInfo.season) || new Map()
    
    const roster1 = rosters.find(r => r.owner_id === userId1)
    const roster2 = rosters.find(r => r.owner_id === userId2)
    
    if (!roster1 || !roster2) return
    
    matchups.forEach((weekMatchups) => {
      const match1 = weekMatchups.find(m => m.roster_id === roster1.roster_id)
      const match2 = weekMatchups.find(m => m.roster_id === roster2.roster_id)
      
      if (match1 && match2 && match1.matchup_id === match2.matchup_id) {
        const points1 = match1.points || 0
        const points2 = match2.points || 0
        
        if (points1 > points2) wins++
        else if (points1 < points2) losses++
      }
    })
  })
  
  return `${wins}-${losses}`
}

// Get cell styling for H2H matrix
function getH2HCellClass(userId1: string, userId2: string): string {
  if (userId1 === userId2) return 'bg-dark-border/30'
  
  const record = getH2HRecord(userId1, userId2)
  const [wins, losses] = record.split('-').map(Number)
  
  if (wins > losses) return 'bg-green-500/10 text-green-400'
  if (losses > wins) return 'bg-red-500/10 text-red-400'
  return ''
}

// Fetch trade counts for all seasons (for the season-by-season table)
async function fetchSeasonTradeCounts() {
  const counts = new Map<string, number>()
  
  for (const seasonInfo of leagueStore.historicalSeasons) {
    try {
      const transactions = await sleeperService.getAllTransactions(seasonInfo.league_id)
      // Count only trades (type === 'trade')
      const tradeCount = transactions.filter(t => t.type === 'trade').length
      counts.set(seasonInfo.season, tradeCount)
      console.log(`Season ${seasonInfo.season}: ${tradeCount} trades`)
    } catch (error) {
      console.warn(`Failed to fetch transactions for ${seasonInfo.season}`)
      counts.set(seasonInfo.season, 0)
    }
  }
  
  seasonTradeCounts.value = counts
}

onMounted(async () => {
  // Initialize award selectors with most recent season
  if (leagueStore.historicalSeasons.length > 0) {
    const latestSeason = leagueStore.historicalSeasons
      .map(s => s.season)
      .sort()
      .reverse()[0]
    
    selectedAwardSeason.value = latestSeason
    selectedWeeklyAwardSeason.value = latestSeason
    
    // Initialize week to 1
    selectedWeeklyAwardWeek.value = 1

    // Load all-time trade/waiver awards
    loadAllTimeTradeWaiverAwards()
    
    // Fetch trade counts for season-by-season table
    fetchSeasonTradeCounts()
  }
})

// ===== DOWNLOAD FUNCTIONS =====

// Helper to get UFD logo as base64
async function getUFDLogoBase64(): Promise<string> {
  try {
    const response = await fetch('/ufd-logo.png')
    const blob = await response.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
  } catch {
    return ''
  }
}

// Create fallback avatar from initials
function createFallbackAvatar(name: string): string {
  const canvas = document.createElement('canvas')
  canvas.width = 100
  canvas.height = 100
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  
  // Background
  ctx.fillStyle = '#3a3d52'
  ctx.beginPath()
  ctx.arc(50, 50, 50, 0, Math.PI * 2)
  ctx.fill()
  
  // Text
  ctx.fillStyle = '#f7f7ff'
  ctx.font = 'bold 40px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const initials = name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
  ctx.fillText(initials, 50, 50)
  
  return canvas.toDataURL('image/png')
}

// Load avatar through proxy API or use fallback
async function loadAvatarAsBase64(avatarUrl: string, name: string): Promise<string> {
  if (!avatarUrl) return createFallbackAvatar(name)
  
  try {
    // Extract avatar ID from URL
    const avatarId = avatarUrl.split('/').pop()
    if (!avatarId || avatarId === 'default') return createFallbackAvatar(name)
    
    // Use our proxy API
    const proxyUrl = `/api/avatar?id=${avatarId}`
    const response = await fetch(proxyUrl)
    
    if (!response.ok) {
      return createFallbackAvatar(name)
    }
    
    const blob = await response.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(createFallbackAvatar(name))
      reader.readAsDataURL(blob)
    })
  } catch (e) {
    return createFallbackAvatar(name)
  }
}

// Download Career Statistics
async function downloadCareerStats() {
  isDownloadingCareerStats.value = true
  
  try {
    const ufdLogoBase64 = await getUFDLogoBase64()
    const leagueName = leagueStore.currentLeague?.name || 'Fantasy League'
    
    // Use filtered stats (respects toggle), limit to 20 teams max
    const statsToShow = filteredCareerStats.value.slice(0, 20)
    
    // Sort by wins to determine top/bottom 3 for record coloring
    const sortedByWins = [...statsToShow].sort((a, b) => b.wins - a.wins)
    const top3WinsIds = new Set(sortedByWins.slice(0, 3).map(s => s.owner_id))
    const bottom3WinsIds = new Set(sortedByWins.slice(-3).map(s => s.owner_id))
    
    // Sort by total_pf to determine top/bottom 3 for total PF coloring
    const sortedByPF = [...statsToShow].sort((a, b) => b.total_pf - a.total_pf)
    const top3PFIds = new Set(sortedByPF.slice(0, 3).map(s => s.owner_id))
    const bottom3PFIds = new Set(sortedByPF.slice(-3).map(s => s.owner_id))
    
    // Load all avatars as base64
    const avatarPromises = statsToShow.map(stat => loadAvatarAsBase64(stat.avatar, stat.team_name))
    const avatarBase64s = await Promise.all(avatarPromises)
    
    const container = document.createElement('div')
    container.style.cssText = `
      position: fixed;
      left: -9999px;
      width: 850px;
      padding: 40px;
      background: #0d0f18;
      font-family: system-ui, -apple-system, sans-serif;
      color: #f7f7ff;
    `
    
    const tableRows = statsToShow.map((stat, idx) => {
      // Determine record color
      let recordColor = '#f7f7ff'
      if (top3WinsIds.has(stat.owner_id)) recordColor = '#4ade80'
      else if (bottom3WinsIds.has(stat.owner_id)) recordColor = '#f87171'
      
      // Determine total PF color
      let pfColor = '#9ca3af'
      if (top3PFIds.has(stat.owner_id)) pfColor = '#4ade80'
      else if (bottom3PFIds.has(stat.owner_id)) pfColor = '#f87171'
      
      return `
      <tr style="border-bottom: 1px solid rgba(58, 61, 82, 0.5);">
        <td style="padding: 14px 10px; text-align: left;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="color: #6b7280; font-size: 13px; min-width: 24px;">${idx + 1}</span>
            <img src="${avatarBase64s[idx]}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;" />
            <span style="font-weight: 600; font-size: 14px;">${stat.team_name}</span>
          </div>
        </td>
        <td style="padding: 14px 10px; text-align: center; font-size: 14px;">${stat.seasons}</td>
        <td style="padding: 14px 10px; text-align: center; color: ${stat.championships > 0 ? '#facc15' : '#6b7280'}; font-size: 14px;">
          ${stat.championships > 0 ? '🏆 ' + stat.championships : '—'}
        </td>
        <td style="padding: 14px 10px; text-align: center; font-weight: 600; color: ${recordColor}; font-size: 14px;">${stat.wins}-${stat.losses}</td>
        <td style="padding: 14px 10px; text-align: center; color: ${stat.win_pct >= 0.6 ? '#4ade80' : stat.win_pct <= 0.4 ? '#f87171' : '#f7f7ff'}; font-weight: ${stat.win_pct >= 0.6 ? '700' : '400'}; font-size: 14px;">
          ${(stat.win_pct * 100).toFixed(1)}%
        </td>
        <td style="padding: 14px 10px; text-align: center; font-size: 14px;">${stat.avg_ppg.toFixed(1)}</td>
        <td style="padding: 14px 10px; text-align: center; color: ${pfColor}; font-size: 14px;">${stat.total_pf.toFixed(0)}</td>
      </tr>
    `}).join('')
    
    container.innerHTML = `
      <!-- Header -->
      <div style="display: flex; align-items: center; gap: 24px; margin-bottom: 28px;">
        ${ufdLogoBase64 ? `<img src="${ufdLogoBase64}" style="width: 70px; height: 70px; object-fit: contain;" />` : ''}
        <div>
          <div style="font-size: 28px; font-weight: 800; color: #f7f7ff; margin-bottom: 6px;">League History</div>
          <div style="font-size: 16px; color: #9ca3af; letter-spacing: 0.5px;">${leagueName} • Career Statistics</div>
        </div>
      </div>
      
      <!-- Divider -->
      <div style="height: 2px; background: linear-gradient(to right, rgba(245, 196, 81, 0.6), rgba(245, 196, 81, 0.1)); margin-bottom: 28px;"></div>
      
      <!-- Table -->
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 2px solid rgba(58, 61, 82, 0.8);">
            <th style="padding: 14px 10px; text-align: left; color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Team</th>
            <th style="padding: 14px 10px; text-align: center; color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Seasons</th>
            <th style="padding: 14px 10px; text-align: center; color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Champs</th>
            <th style="padding: 14px 10px; text-align: center; color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Record</th>
            <th style="padding: 14px 10px; text-align: center; color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Win %</th>
            <th style="padding: 14px 10px; text-align: center; color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Avg PPG</th>
            <th style="padding: 14px 10px; text-align: center; color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Total PF</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      
      <!-- Footer -->
      <div style="text-align: center; padding-top: 28px; margin-top: 28px; border-top: 1px solid rgba(58, 61, 82, 0.5);">
        <div style="display: flex; align-items: center; justify-content: center; gap: 20px;">
          ${ufdLogoBase64 ? `<img src="${ufdLogoBase64}" style="width: 48px; height: 48px; object-fit: contain;" />` : ''}
          <div>
            <div style="font-size: 15px; color: #9ca3af; margin-bottom: 4px; letter-spacing: 0.3px;">See complete league history at</div>
            <div style="font-size: 19px; font-weight: bold; color: #facc15; letter-spacing: 0.5px;">ultimatefantasydashboard.com/history</div>
          </div>
        </div>
      </div>
    `
    
    document.body.appendChild(container)
    
    const canvas = await html2canvas(container, {
      backgroundColor: '#0d0f18',
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true
    })
    
    document.body.removeChild(container)
    
    const link = document.createElement('a')
    link.download = `${leagueName.replace(/[^a-z0-9]/gi, '-')}-career-statistics.png`.toLowerCase()
    link.href = canvas.toDataURL('image/png')
    link.click()
    
  } catch (error) {
    console.error('Failed to download career stats:', error)
  } finally {
    isDownloadingCareerStats.value = false
  }
}

// Download Season History
async function downloadSeasonHistory() {
  isDownloadingSeasonHistory.value = true
  
  try {
    const ufdLogoBase64 = await getUFDLogoBase64()
    const leagueName = leagueStore.currentLeague?.name || 'Fantasy League'
    
    const container = document.createElement('div')
    container.style.cssText = `
      position: fixed;
      left: -9999px;
      width: 950px;
      padding: 40px;
      background: #0d0f18;
      font-family: system-ui, -apple-system, sans-serif;
      color: #f7f7ff;
    `
    
    const tableRows = seasonRecords.value.map(season => `
      <tr style="border-bottom: 1px solid rgba(58, 61, 82, 0.5);">
        <td style="padding: 14px 12px; text-align: left; font-weight: 700; font-size: 15px;">${season.season}</td>
        <td style="padding: 14px 12px; text-align: center; font-size: 14px;">${season.avg_ppg.toFixed(1)}</td>
        <td style="padding: 14px 12px; text-align: center;">
          <div style="color: #4ade80; font-weight: 600; font-size: 14px;">${season.high_score.toFixed(1)}</div>
          <div style="color: #9ca3af; font-size: 12px; margin-top: 2px;">${season.high_scorer}</div>
        </td>
        <td style="padding: 14px 12px; text-align: center;">
          <div style="color: #f87171; font-size: 14px;">${season.low_score.toFixed(1)}</div>
          <div style="color: #9ca3af; font-size: 12px; margin-top: 2px;">${season.low_scorer}</div>
        </td>
        <td style="padding: 14px 12px; text-align: center; font-size: 14px;">${season.trade_count}</td>
        <td style="padding: 14px 12px; text-align: center;">
          <span style="color: #facc15; font-weight: 700; font-size: 14px;">🏆 ${season.champion}</span>
        </td>
      </tr>
    `).join('')
    
    container.innerHTML = `
      <!-- Header -->
      <div style="display: flex; align-items: center; gap: 24px; margin-bottom: 28px;">
        ${ufdLogoBase64 ? `<img src="${ufdLogoBase64}" style="width: 70px; height: 70px; object-fit: contain;" />` : ''}
        <div>
          <div style="font-size: 28px; font-weight: 800; color: #f7f7ff; margin-bottom: 6px;">Season History</div>
          <div style="font-size: 16px; color: #9ca3af; letter-spacing: 0.5px;">${leagueName} • Year-by-Year Records</div>
        </div>
      </div>
      
      <!-- Divider -->
      <div style="height: 2px; background: linear-gradient(to right, rgba(245, 196, 81, 0.6), rgba(245, 196, 81, 0.1)); margin-bottom: 28px;"></div>
      
      <!-- Table -->
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 2px solid rgba(58, 61, 82, 0.8);">
            <th style="padding: 14px 12px; text-align: left; color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Season</th>
            <th style="padding: 14px 12px; text-align: center; color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Avg PPG</th>
            <th style="padding: 14px 12px; text-align: center; color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">High Score</th>
            <th style="padding: 14px 12px; text-align: center; color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Low Score</th>
            <th style="padding: 14px 12px; text-align: center; color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Trades</th>
            <th style="padding: 14px 12px; text-align: center; color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Champion</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      
      <!-- Footer -->
      <div style="text-align: center; padding-top: 28px; margin-top: 28px; border-top: 1px solid rgba(58, 61, 82, 0.5);">
        <div style="display: flex; align-items: center; justify-content: center; gap: 20px;">
          ${ufdLogoBase64 ? `<img src="${ufdLogoBase64}" style="width: 48px; height: 48px; object-fit: contain;" />` : ''}
          <div>
            <div style="font-size: 15px; color: #9ca3af; margin-bottom: 4px; letter-spacing: 0.3px;">See complete league history at</div>
            <div style="font-size: 19px; font-weight: bold; color: #facc15; letter-spacing: 0.5px;">ultimatefantasydashboard.com/history</div>
          </div>
        </div>
      </div>
    `
    
    document.body.appendChild(container)
    
    const canvas = await html2canvas(container, {
      backgroundColor: '#0d0f18',
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true
    })
    
    document.body.removeChild(container)
    
    const link = document.createElement('a')
    link.download = `${leagueName.replace(/[^a-z0-9]/gi, '-')}-season-history.png`.toLowerCase()
    link.href = canvas.toDataURL('image/png')
    link.click()
    
  } catch (error) {
    console.error('Failed to download season history:', error)
  } finally {
    isDownloadingSeasonHistory.value = false
  }
}

// Download Head to Head Matrix (current members only)
async function downloadHeadToHead() {
  isDownloadingH2H.value = true
  
  try {
    const ufdLogoBase64 = await getUFDLogoBase64()
    const leagueName = leagueStore.currentLeague?.name || 'Fantasy League'
    
    // Always use current members for download
    const teamsToShow = h2hMatrixTeams.value.filter(team => currentMemberIds.value.has(team.user_id))
    
    // Load all avatars as base64
    const avatarPromises = teamsToShow.map(team => loadAvatarAsBase64(team.avatar, team.team_name))
    const avatarBase64s = await Promise.all(avatarPromises)
    
    // Create a map for quick lookup
    const avatarMap = new Map<string, string>()
    teamsToShow.forEach((team, idx) => {
      avatarMap.set(team.user_id, avatarBase64s[idx])
    })
    
    const container = document.createElement('div')
    container.style.cssText = `
      position: fixed;
      left: -9999px;
      width: ${Math.max(700, teamsToShow.length * 60 + 220)}px;
      padding: 40px;
      background: #0d0f18;
      font-family: system-ui, -apple-system, sans-serif;
      color: #f7f7ff;
    `
    
    // Build header row with logos only (no names)
    const headerCells = teamsToShow.map(team => 
      `<th style="padding: 10px 6px; text-align: center; border: 1px solid rgba(58, 61, 82, 0.5); min-width: 50px;">
        <img src="${avatarMap.get(team.user_id)}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;" title="${team.team_name}" />
      </th>`
    ).join('')
    
    // Build data rows with logo + name in first column
    const dataRows = teamsToShow.map(rowTeam => {
      const cells = teamsToShow.map(colTeam => {
        if (rowTeam.user_id === colTeam.user_id) {
          return `<td style="padding: 10px 6px; text-align: center; border: 1px solid rgba(58, 61, 82, 0.5); background: rgba(58, 61, 82, 0.3); color: #6b7280;">—</td>`
        }
        const record = getH2HRecord(rowTeam.user_id, colTeam.user_id)
        const [wins, losses] = record.split('-').map(Number)
        let bgColor = 'transparent'
        let textColor = '#f7f7ff'
        if (wins > losses) {
          bgColor = 'rgba(74, 222, 128, 0.1)'
          textColor = '#4ade80'
        } else if (losses > wins) {
          bgColor = 'rgba(248, 113, 113, 0.1)'
          textColor = '#f87171'
        }
        return `<td style="padding: 10px 6px; text-align: center; border: 1px solid rgba(58, 61, 82, 0.5); background: ${bgColor}; color: ${textColor}; font-weight: 600; font-size: 13px;">${record}</td>`
      }).join('')
      
      return `<tr>
        <td style="padding: 10px 12px; text-align: left; border: 1px solid rgba(58, 61, 82, 0.5); background: rgba(38, 42, 58, 0.5); white-space: nowrap;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <img src="${avatarMap.get(rowTeam.user_id)}" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover;" />
            <span style="font-weight: 600; font-size: 13px;">${rowTeam.team_name}</span>
          </div>
        </td>
        ${cells}
      </tr>`
    }).join('')
    
    container.innerHTML = `
      <!-- Header -->
      <div style="display: flex; align-items: center; gap: 24px; margin-bottom: 28px;">
        ${ufdLogoBase64 ? `<img src="${ufdLogoBase64}" style="width: 70px; height: 70px; object-fit: contain;" />` : ''}
        <div>
          <div style="font-size: 28px; font-weight: 800; color: #f7f7ff; margin-bottom: 6px;">Head-to-Head Matrix</div>
          <div style="font-size: 16px; color: #9ca3af; letter-spacing: 0.5px;">${leagueName} • All-Time Records</div>
        </div>
      </div>
      
      <!-- Divider -->
      <div style="height: 2px; background: linear-gradient(to right, rgba(245, 196, 81, 0.6), rgba(245, 196, 81, 0.1)); margin-bottom: 28px;"></div>
      
      <!-- Instructions -->
      <div style="font-size: 13px; color: #9ca3af; margin-bottom: 20px; font-style: italic; letter-spacing: 0.3px;">
        Read horizontally: each row shows that team's record against opponents
      </div>
      
      <!-- Table -->
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="padding: 10px 12px; text-align: left; color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; border: 1px solid rgba(58, 61, 82, 0.5); background: rgba(38, 42, 58, 0.5);">Team</th>
            ${headerCells}
          </tr>
        </thead>
        <tbody>
          ${dataRows}
        </tbody>
      </table>
      
      <!-- Footer -->
      <div style="text-align: center; padding-top: 28px; margin-top: 28px; border-top: 1px solid rgba(58, 61, 82, 0.5);">
        <div style="display: flex; align-items: center; justify-content: center; gap: 20px;">
          ${ufdLogoBase64 ? `<img src="${ufdLogoBase64}" style="width: 48px; height: 48px; object-fit: contain;" />` : ''}
          <div>
            <div style="font-size: 15px; color: #9ca3af; margin-bottom: 4px; letter-spacing: 0.3px;">See complete league history at</div>
            <div style="font-size: 19px; font-weight: bold; color: #facc15; letter-spacing: 0.5px;">ultimatefantasydashboard.com/history</div>
          </div>
        </div>
      </div>
    `
    
    document.body.appendChild(container)
    
    const canvas = await html2canvas(container, {
      backgroundColor: '#0d0f18',
      scale: 2,
      logging: false
    })
    
    document.body.removeChild(container)
    
    const link = document.createElement('a')
    link.download = `${leagueName.replace(/[^a-z0-9]/gi, '-')}-head-to-head.png`.toLowerCase()
    link.href = canvas.toDataURL('image/png')
    link.click()
    
  } catch (error) {
    console.error('Failed to download H2H matrix:', error)
  } finally {
    isDownloadingH2H.value = false
  }
}
</script>
