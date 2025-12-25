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
      <!-- Career Records (4 Cards) -->
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
          <table ref="careerTableRef" class="w-full text-sm">
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
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider cursor-pointer hover:bg-dark-border/30 transition-colors" @click="sortBy('avg_ppw')">
                  <div class="flex items-center justify-center gap-1">
                    Avg PPW
                    <span class="inline-flex flex-col" style="font-size: 10px; line-height: 8px;">
                      <span :class="sortColumn === 'avg_ppw' && sortDirection === 'asc' ? 'text-primary' : 'text-dark-textMuted'">▲</span>
                      <span :class="sortColumn === 'avg_ppw' && sortDirection === 'desc' ? 'text-primary' : 'text-dark-textMuted'">▼</span>
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
                    showCurrentMembersOnlyH2H ? 'bg-primary' : 'bg-dark-border'
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
          <table ref="h2hTableRef" class="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th class="sticky left-0 bg-dark-elevated z-10 px-3 py-2 text-left border border-dark-border">Team</th>
                <th 
                  v-for="team in filteredH2HTeams" 
                  :key="`header-${team.team_key}`"
                  class="px-3 py-2 text-center border border-dark-border font-semibold text-dark-textSecondary uppercase tracking-wider"
                  style="min-width: 80px;"
                >
                  <div class="truncate" :title="team.team_name">{{ team.team_name.substring(0, 8) }}</div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="rowTeam in filteredH2HTeams" :key="`row-${rowTeam.team_key}`">
                <td class="sticky left-0 bg-dark-elevated z-10 px-3 py-2 font-semibold text-dark-text border border-dark-border whitespace-nowrap">
                  {{ rowTeam.team_name }}
                </td>
                <td 
                  v-for="colTeam in filteredH2HTeams" 
                  :key="`cell-${rowTeam.team_key}-${colTeam.team_key}`"
                  class="px-3 py-2 text-center border border-dark-border"
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
                <div 
                  v-for="award in allTimeHallOfFame" 
                  :key="award.title" 
                  class="bg-dark-border/30 rounded-xl p-4"
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
                  class="bg-dark-border/30 rounded-xl p-4"
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
                  class="bg-dark-border/30 rounded-xl p-4"
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
                  class="bg-dark-border/30 rounded-xl p-4"
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
                class="bg-dark-border/30 rounded-xl p-4"
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Platform Badge -->
    <div class="flex justify-center mt-8">
      <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-600/10 border border-purple-600/30">
        <span class="text-sm font-bold text-purple-400">Y!</span>
        <span class="text-sm text-purple-300">Yahoo Fantasy Baseball • Points League</span>
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

const defaultAvatar = 'https://s.yimg.com/cv/apiv2/default/mlb/mlb_1_100.png'

// State
const isLoading = ref(true)
const isDownloadingCareerStats = ref(false)
const isDownloadingSeasonHistory = ref(false)
const isDownloadingH2H = ref(false)

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
const historicalData = ref<Map<string, any>>(new Map())
const allMatchups = ref<Map<string, Map<number, any[]>>>(new Map()) // season -> week -> matchups
const allTeams = ref<Map<string, any>>(new Map()) // team_key -> team info
const currentMembers = ref<Set<string>>(new Set())

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
  return Array.from(historicalData.value.keys()).sort((a, b) => parseInt(b) - parseInt(a))
})

const availableWeeksForAwards = computed(() => {
  const seasonMatchups = allMatchups.value.get(selectedWeeklyAwardSeason.value)
  if (!seasonMatchups) return []
  return Array.from(seasonMatchups.keys()).sort((a, b) => a - b)
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
  const statsMap = new Map<string, CareerStat>()
  
  // Aggregate stats across all seasons
  for (const [season, seasonData] of historicalData.value) {
    const standings = seasonData.standings || []
    
    for (const team of standings) {
      const teamKey = team.team_key
      const existing = statsMap.get(teamKey)
      
      if (existing) {
        existing.seasons++
        existing.wins += team.wins || 0
        existing.losses += team.losses || 0
        existing.total_pf += team.points_for || 0
        existing.total_weeks += (team.wins || 0) + (team.losses || 0)
        if (team.is_champion) existing.championships++
      } else {
        statsMap.set(teamKey, {
          team_key: teamKey,
          team_name: team.name || 'Unknown Team',
          logo_url: team.logo_url || '',
          seasons: 1,
          championships: team.is_champion ? 1 : 0,
          wins: team.wins || 0,
          losses: team.losses || 0,
          win_pct: 0,
          avg_ppw: 0,
          total_pf: team.points_for || 0,
          total_weeks: (team.wins || 0) + (team.losses || 0)
        })
      }
    }
  }
  
  // Calculate derived stats
  const stats = Array.from(statsMap.values()).map(stat => {
    const totalGames = stat.wins + stat.losses
    stat.win_pct = totalGames > 0 ? stat.wins / totalGames : 0
    stat.avg_ppw = stat.total_weeks > 0 ? stat.total_pf / stat.total_weeks : 0
    return stat
  })
  
  // Sort by current sort column
  return sortStats(stats)
})

// Computed: Filtered career stats (current members only toggle)
const filteredCareerStats = computed(() => {
  if (!showCurrentMembersOnlyCareer.value) return careerStats.value
  return careerStats.value.filter(stat => currentMembers.value.has(stat.team_key))
})

// Computed: Season Records
const seasonRecords = computed((): SeasonRecord[] => {
  const records: SeasonRecord[] = []
  
  for (const [season, seasonData] of historicalData.value) {
    const matchups = allMatchups.value.get(season) || new Map()
    const standings = seasonData.standings || []
    
    let totalPoints = 0
    let totalWeeks = 0
    let highScore = 0
    let highScorer = ''
    let lowScore = Infinity
    let lowScorer = ''
    
    // Find high/low scores from matchups
    for (const [week, weekMatchups] of matchups) {
      for (const matchup of weekMatchups) {
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
  return Array.from(allTeams.value.values()).map(team => ({
    team_key: team.team_key,
    team_name: team.name || 'Unknown',
    logo_url: team.logo_url || ''
  }))
})

const filteredH2HTeams = computed(() => {
  if (!showCurrentMembersOnlyH2H.value) return h2hTeams.value
  return h2hTeams.value.filter(team => currentMembers.value.has(team.team_key))
})

// H2H Records Map
const h2hRecords = ref<Map<string, Map<string, { wins: number; losses: number }>>>(new Map())

// Computed: All-Time Awards
const allTimeHallOfFame = computed((): Award[] => {
  const stats = careerStats.value
  if (stats.length === 0) return []
  
  // Find best performers across all matchups
  let highestScore = { value: 0, team: '', season: '', week: 0 }
  let mostWins = { value: 0, team: '', logo: '' }
  let highestPPW = { value: 0, team: '', logo: '' }
  let bestWinPct = { value: 0, team: '', logo: '', record: '' }
  
  // Scan all matchups for highest single-week score
  for (const [season, seasonMatchups] of allMatchups.value) {
    for (const [week, matchups] of seasonMatchups) {
      for (const matchup of matchups) {
        for (const team of matchup.teams || []) {
          if ((team.points || 0) > highestScore.value) {
            highestScore = {
              value: team.points,
              team: team.name,
              season,
              week
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
        logo_url: allTeams.value.get(highestScore.team)?.logo_url || '',
        value: highestScore.value.toFixed(1),
        season: `${highestScore.season} Week ${highestScore.week}`,
        details: 'All-time best single-week performance'
      } : null
    },
    {
      title: 'Most Career Wins',
      winner: byWins ? {
        team_name: byWins.team_name,
        logo_url: byWins.logo_url,
        value: String(byWins.wins),
        details: `${byWins.wins}-${byWins.losses} career record`
      } : null
    },
    {
      title: 'Highest Career PPW',
      winner: byPPW ? {
        team_name: byPPW.team_name,
        logo_url: byPPW.logo_url,
        value: byPPW.avg_ppw.toFixed(1),
        details: `Over ${byPPW.total_weeks} weeks`
      } : null
    },
    {
      title: 'Best Win Percentage',
      winner: byWinPct ? {
        team_name: byWinPct.team_name,
        logo_url: byWinPct.logo_url,
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
  let lowestScore = { value: Infinity, team: '', season: '', week: 0 }
  
  for (const [season, seasonMatchups] of allMatchups.value) {
    for (const [week, matchups] of seasonMatchups) {
      for (const matchup of matchups) {
        for (const team of matchup.teams || []) {
          if ((team.points || 0) > 0 && (team.points || 0) < lowestScore.value) {
            lowestScore = {
              value: team.points,
              team: team.name,
              season,
              week
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
        logo_url: allTeams.value.get(lowestScore.team)?.logo_url || '',
        value: lowestScore.value.toFixed(1),
        season: `${lowestScore.season} Week ${lowestScore.week}`,
        details: 'All-time worst single-week performance'
      } : null
    },
    {
      title: 'Most Career Losses',
      winner: byLosses ? {
        team_name: byLosses.team_name,
        logo_url: byLosses.logo_url,
        value: String(byLosses.losses),
        details: `${byLosses.wins}-${byLosses.losses} career record`
      } : null
    },
    {
      title: 'Lowest Career PPW',
      winner: byLowPPW ? {
        team_name: byLowPPW.team_name,
        logo_url: byLowPPW.logo_url,
        value: byLowPPW.avg_ppw.toFixed(1),
        details: `Over ${byLowPPW.total_weeks} weeks (min 10)`
      } : null
    },
    {
      title: 'Worst Win Percentage',
      winner: byWorstWinPct ? {
        team_name: byWorstWinPct.team_name,
        logo_url: byWorstWinPct.logo_url,
        value: `${(byWorstWinPct.win_pct * 100).toFixed(1)}%`,
        details: `${byWorstWinPct.wins}-${byWorstWinPct.losses} (min 10 games)`
      } : null
    }
  ]
})

// Computed: Season Awards
const seasonHallOfFame = computed((): Award[] => {
  const season = selectedAwardSeason.value
  if (!season) return []
  
  const seasonData = historicalData.value.get(season)
  const matchups = allMatchups.value.get(season)
  if (!seasonData || !matchups) return []
  
  const standings = seasonData.standings || []
  
  // Find high score for season
  let highScore = { value: 0, team: '', week: 0 }
  for (const [week, weekMatchups] of matchups) {
    for (const matchup of weekMatchups) {
      for (const team of matchup.teams || []) {
        if ((team.points || 0) > highScore.value) {
          highScore = { value: team.points, team: team.name, week }
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
        logo_url: allTeams.value.get(highScore.team)?.logo_url || '',
        value: highScore.value.toFixed(1),
        details: `Week ${highScore.week}`
      } : null
    },
    {
      title: 'Most Wins',
      winner: byWins ? {
        team_name: byWins.name,
        logo_url: byWins.logo_url || '',
        value: String(byWins.wins || 0),
        details: `${byWins.wins}-${byWins.losses} record`
      } : null
    },
    {
      title: 'Most Points Scored',
      winner: byPoints ? {
        team_name: byPoints.name,
        logo_url: byPoints.logo_url || '',
        value: (byPoints.points_for || 0).toFixed(1),
        details: 'Regular season total'
      } : null
    }
  ]
})

const seasonHallOfShame = computed((): Award[] => {
  const season = selectedAwardSeason.value
  if (!season) return []
  
  const seasonData = historicalData.value.get(season)
  const matchups = allMatchups.value.get(season)
  if (!seasonData || !matchups) return []
  
  const standings = seasonData.standings || []
  
  // Find low score for season
  let lowScore = { value: Infinity, team: '', week: 0 }
  for (const [week, weekMatchups] of matchups) {
    for (const matchup of weekMatchups) {
      for (const team of matchup.teams || []) {
        if ((team.points || 0) > 0 && (team.points || 0) < lowScore.value) {
          lowScore = { value: team.points, team: team.name, week }
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
        logo_url: allTeams.value.get(lowScore.team)?.logo_url || '',
        value: lowScore.value.toFixed(1),
        details: `Week ${lowScore.week}`
      } : null
    },
    {
      title: 'Most Losses',
      winner: byLosses ? {
        team_name: byLosses.name,
        logo_url: byLosses.logo_url || '',
        value: String(byLosses.losses || 0),
        details: `${byLosses.wins}-${byLosses.losses} record`
      } : null
    },
    {
      title: 'Fewest Points Scored',
      winner: byLeastPoints ? {
        team_name: byLeastPoints.name,
        logo_url: byLeastPoints.logo_url || '',
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
  
  const seasonMatchups = allMatchups.value.get(season)
  if (!seasonMatchups) return []
  
  const weekMatchups = seasonMatchups.get(week) || []
  
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
  const team1Records = h2hRecords.value.get(team1Key)
  if (!team1Records) return '0-0'
  const record = team1Records.get(team2Key)
  if (!record) return '0-0'
  return `${record.wins}-${record.losses}`
}

function getH2HCellClass(team1Key: string, team2Key: string): string {
  if (team1Key === team2Key) return 'bg-dark-border/50'
  
  const team1Records = h2hRecords.value.get(team1Key)
  if (!team1Records) return ''
  const record = team1Records.get(team2Key)
  if (!record) return ''
  
  if (record.wins > record.losses) return 'bg-green-500/20 text-green-400'
  if (record.losses > record.wins) return 'bg-red-500/20 text-red-400'
  return 'bg-yellow-500/10 text-yellow-400'
}

function handleImageError(e: Event) {
  const img = e.target as HTMLImageElement
  img.src = defaultAvatar
}

async function downloadCareerStats() {
  if (!careerTableRef.value) return
  isDownloadingCareerStats.value = true
  try {
    const canvas = await html2canvas(careerTableRef.value, {
      backgroundColor: '#1a1d23',
      scale: 2
    })
    const link = document.createElement('a')
    link.download = 'league-career-stats.png'
    link.href = canvas.toDataURL()
    link.click()
  } finally {
    isDownloadingCareerStats.value = false
  }
}

async function downloadSeasonHistory() {
  if (!seasonTableRef.value) return
  isDownloadingSeasonHistory.value = true
  try {
    const canvas = await html2canvas(seasonTableRef.value, {
      backgroundColor: '#1a1d23',
      scale: 2
    })
    const link = document.createElement('a')
    link.download = 'league-season-history.png'
    link.href = canvas.toDataURL()
    link.click()
  } finally {
    isDownloadingSeasonHistory.value = false
  }
}

async function downloadHeadToHead() {
  if (!h2hTableRef.value) return
  isDownloadingH2H.value = true
  try {
    const canvas = await html2canvas(h2hTableRef.value, {
      backgroundColor: '#1a1d23',
      scale: 2
    })
    const link = document.createElement('a')
    link.download = 'league-head-to-head.png'
    link.href = canvas.toDataURL()
    link.click()
  } finally {
    isDownloadingH2H.value = false
  }
}

async function loadHistoricalData() {
  console.log('loadHistoricalData called')
  isLoading.value = true
  
  try {
    const leagueKey = leagueStore.activeLeagueId
    console.log('Loading history for league:', leagueKey)
    console.log('User ID:', authStore.user?.id)
    
    if (!leagueKey) {
      console.log('Missing leagueKey, waiting...')
      isLoading.value = false
      return
    }
    
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
    
    // Baseball game keys by year
    const gameKeys: Record<string, string> = {
      '2025': '431', '2024': '422', '2023': '412', '2022': '404',
      '2021': '398', '2020': '388', '2019': '378', '2018': '370',
      '2017': '364', '2016': '357', '2015': '346', '2014': '328',
      '2013': '308', '2012': '268', '2011': '253', '2010': '238'
    }
    
    // Reverse lookup - find year from game key
    const yearsByKey = Object.fromEntries(
      Object.entries(gameKeys).map(([year, key]) => [key, year])
    )
    
    // Get league number from current league key
    const leagueNum = leagueKey.split('.l.')[1]
    console.log('League number:', leagueNum)
    
    // Start with current season only for now to avoid rate limiting
    const currentYear = yearsByKey[gameKey] || '2024'
    const seasons = [currentYear]
    console.log('Loading seasons:', seasons)
    
    for (const season of seasons) {
      const seasonGameKey = gameKeys[season]
      if (!seasonGameKey) continue
      
      const seasonLeagueKey = `${seasonGameKey}.l.${leagueNum}`
      
      try {
        // Get standings for this season
        const standings = await yahooService.getStandings(seasonLeagueKey)
        if (standings.length === 0) continue
        
        // Store season data
        historicalData.value.set(season, {
          standings,
          trade_count: 0 // Would need separate API call
        })
        
        // Track all teams
        for (const team of standings) {
          if (!allTeams.value.has(team.team_key)) {
            allTeams.value.set(team.team_key, team)
          }
          // Also map by name for lookups
          allTeams.value.set(team.name, team)
        }
        
        // If this is the current season, track current members
        if (season === yearsByKey[gameKey]) {
          standings.forEach((team: any) => currentMembers.value.add(team.team_key))
        }
        
        // Load matchups for H2H calculation
        const seasonMatchups = new Map<number, any[]>()
        for (let week = 1; week <= 25; week++) {
          try {
            const weekMatchups = await yahooService.getMatchups(seasonLeagueKey, week)
            if (weekMatchups.length > 0) {
              seasonMatchups.set(week, weekMatchups)
              
              // Build H2H records
              for (const matchup of weekMatchups) {
                const teams = matchup.teams || []
                if (teams.length === 2) {
                  const [team1, team2] = teams
                  const team1Won = (team1.points || 0) > (team2.points || 0)
                  
                  // Update team1's record vs team2
                  if (!h2hRecords.value.has(team1.team_key)) {
                    h2hRecords.value.set(team1.team_key, new Map())
                  }
                  const t1Records = h2hRecords.value.get(team1.team_key)!
                  if (!t1Records.has(team2.team_key)) {
                    t1Records.set(team2.team_key, { wins: 0, losses: 0 })
                  }
                  const t1VsT2 = t1Records.get(team2.team_key)!
                  if (team1Won) t1VsT2.wins++
                  else t1VsT2.losses++
                  
                  // Update team2's record vs team1
                  if (!h2hRecords.value.has(team2.team_key)) {
                    h2hRecords.value.set(team2.team_key, new Map())
                  }
                  const t2Records = h2hRecords.value.get(team2.team_key)!
                  if (!t2Records.has(team1.team_key)) {
                    t2Records.set(team1.team_key, { wins: 0, losses: 0 })
                  }
                  const t2VsT1 = t2Records.get(team1.team_key)!
                  if (!team1Won) t2VsT1.wins++
                  else t2VsT1.losses++
                }
              }
            }
          } catch (e) {
            // Week doesn't exist or error, continue
            break
          }
        }
        
        if (seasonMatchups.size > 0) {
          allMatchups.value.set(season, seasonMatchups)
        }
        
        console.log(`Loaded ${season} season data: ${standings.length} teams, ${seasonMatchups.size} weeks`)
      } catch (e) {
        // Season doesn't exist for this league
        console.log(`No data for ${season} season`)
      }
    }
    
    // Set default award season
    if (availableSeasons.value.length > 0) {
      selectedAwardSeason.value = availableSeasons.value[0]
      selectedWeeklyAwardSeason.value = availableSeasons.value[0]
    }
    
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
    historicalData.value.clear()
    allMatchups.value.clear()
    allTeams.value.clear()
    h2hRecords.value.clear()
    currentMembers.value.clear()
    // Reload
    loadHistoricalData()
  }
}, { immediate: true })

// Load data on mount (as backup)
onMounted(() => {
  console.log('YahooBaseballHistoryView mounted - activeLeagueId:', leagueStore.activeLeagueId)
  if (leagueStore.activeLeagueId && historicalData.value.size === 0) {
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
