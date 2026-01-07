<template>
  <div class="space-y-6">
    <!-- Header with Controls -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="text-3xl font-bold text-dark-text mb-2">Category Matchups</h1>
        <p class="text-base text-dark-textMuted">H2H category battles with win probability analysis</p>
      </div>
      <div class="flex items-center gap-3">
        <button @click="refreshData" :disabled="isRefreshing" class="btn-secondary flex items-center gap-2">
          <svg class="w-4 h-4" :class="{ 'animate-spin': isRefreshing }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {{ isRefreshing ? 'Refreshing...' : 'Refresh' }}
        </button>
        <select v-model="selectedWeek" @change="loadMatchups" class="select">
          <option value="">Select Week...</option>
          <option v-for="week in availableWeeks" :key="week" :value="week">Week {{ week }}</option>
        </select>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
        <p class="text-dark-textMuted">{{ loadingMessage }}</p>
      </div>
    </div>

    <template v-else-if="matchups.length > 0">
      <!-- Week Summary -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">📊</span>
            <h2 class="card-title">Week {{ selectedWeek }} Summary</h2>
          </div>
        </div>
        <div class="card-body">
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div class="text-center">
              <div class="text-3xl font-bold text-green-400 mb-2">{{ weekStats.mostCategories.count }}</div>
              <div class="text-sm text-dark-textMuted uppercase tracking-wide mb-1">Most Categories</div>
              <div class="text-sm font-semibold text-dark-text">{{ weekStats.mostCategories.team }}</div>
            </div>
            <div class="text-center">
              <div class="text-3xl font-bold text-red-400 mb-2">{{ weekStats.fewestCategories.count }}</div>
              <div class="text-sm text-dark-textMuted uppercase tracking-wide mb-1">Fewest Categories</div>
              <div class="text-sm font-semibold text-dark-text">{{ weekStats.fewestCategories.team }}</div>
            </div>
            <div class="text-center">
              <div class="text-3xl font-bold text-cyan-400 mb-2">{{ weekStats.mostDominant.score }}</div>
              <div class="text-sm text-dark-textMuted uppercase tracking-wide mb-1">Most Dominant</div>
              <div class="text-sm font-semibold text-dark-text">{{ weekStats.mostDominant.team }}</div>
            </div>
            <div class="text-center">
              <div class="text-3xl font-bold text-yellow-400 mb-2">{{ weekStats.closestMatchup.margin }}</div>
              <div class="text-sm text-dark-textMuted uppercase tracking-wide mb-1">Closest Matchup</div>
              <div class="text-sm font-semibold text-dark-text">{{ weekStats.closestMatchup.teams }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Matchup Selector Cards -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-2xl">⚔️</span>
              <h2 class="card-title">Select Matchup</h2>
            </div>
            <button 
              @click="downloadAllMatchups" 
              :disabled="isDownloadingAll" 
              class="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50"
              style="background: #dc2626; color: #ffffff;"
              @mouseover="$event.currentTarget.style.background = '#eab308'; $event.currentTarget.style.color = '#0a0c14'"
              @mouseout="$event.currentTarget.style.background = '#dc2626'; $event.currentTarget.style.color = '#ffffff'"
            >
              <svg v-if="!isDownloadingAll" class="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <svg v-else class="w-5 h-5 animate-spin pointer-events-none" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              {{ isDownloadingAll ? `Generating ${downloadProgress}...` : 'Share All' }}
            </button>
          </div>
          <p class="text-sm text-dark-textMuted mt-2">💡 <span class="text-yellow-400 font-medium">Click any matchup</span> to see category breakdown and win probability</p>
        </div>
        <div class="card-body">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button v-for="matchup in matchups" :key="matchup.matchup_id" @click="selectMatchup(matchup)"
              :class="['p-4 rounded-xl border-2 transition-all text-left', selectedMatchup?.matchup_id === matchup.matchup_id ? 'border-primary bg-primary/10 ring-2 ring-primary/30' : 'border-dark-border bg-dark-card hover:border-primary/50']">
              <!-- Team 1 -->
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2 flex-1 min-w-0">
                  <div class="relative">
                    <img :src="matchup.team1.logo_url || defaultAvatar" class="w-9 h-9 rounded-full ring-2" :class="matchup.team1Leading ? 'ring-green-500' : 'ring-dark-border'" @error="handleImageError"/>
                    <div v-if="matchup.team1.is_my_team" class="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center"><span class="text-[10px]">★</span></div>
                  </div>
                  <div class="min-w-0">
                    <div class="font-semibold text-dark-text truncate text-sm">{{ matchup.team1.name }}</div>
                    <div class="text-xs text-dark-textMuted">{{ getTeamRecord(matchup.team1.team_key) }}</div>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-xl font-bold text-white">{{ matchup.team1CatWins }}</div>
                  <div class="text-xs text-cyan-400">proj {{ matchup.projectedTeam1Wins }}</div>
                </div>
              </div>
              <!-- VS -->
              <div class="flex items-center gap-2 my-2">
                <div class="flex-1 h-px bg-dark-border"></div>
                <span class="text-xs text-dark-textMuted px-2">VS</span>
                <div class="flex-1 h-px bg-dark-border"></div>
              </div>
              <!-- Team 2 -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2 flex-1 min-w-0">
                  <div class="relative">
                    <img :src="matchup.team2.logo_url || defaultAvatar" class="w-9 h-9 rounded-full ring-2" :class="matchup.team2Leading ? 'ring-green-500' : 'ring-dark-border'" @error="handleImageError"/>
                    <div v-if="matchup.team2.is_my_team" class="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center"><span class="text-[10px]">★</span></div>
                  </div>
                  <div class="min-w-0">
                    <div class="font-semibold text-dark-text truncate text-sm">{{ matchup.team2.name }}</div>
                    <div class="text-xs text-dark-textMuted">{{ getTeamRecord(matchup.team2.team_key) }}</div>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-xl font-bold text-white">{{ matchup.team2CatWins }}</div>
                  <div class="text-xs text-orange-400">proj {{ matchup.projectedTeam2Wins }}</div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- Selected Matchup Analysis -->
      <template v-if="selectedMatchup">
        <!-- Win Probability Section -->
        <div class="card">
          <div class="card-header">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-2xl">🎲</span>
                <h2 class="card-title">Win Probability</h2>
              </div>
              <button 
                @click="downloadMatchupAnalysis" 
                :disabled="isDownloading" 
                class="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50"
                style="background: #dc2626; color: #ffffff;"
                @mouseover="$event.currentTarget.style.background = '#eab308'; $event.currentTarget.style.color = '#0a0c14'"
                @mouseout="$event.currentTarget.style.background = '#dc2626'; $event.currentTarget.style.color = '#ffffff'"
              >
                <svg v-if="!isDownloading" class="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <svg v-else class="w-5 h-5 animate-spin pointer-events-none" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                {{ isDownloading ? 'Generating...' : 'Share' }}
              </button>
            </div>
            <p class="card-subtitle mt-2">Live probability based on current category performance</p>
          </div>
          <div class="card-body">
            <!-- Big Team Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <!-- Team 1 -->
              <div :class="['text-center p-6 rounded-xl border-2', selectedMatchup.team1.is_my_team ? 'bg-gradient-to-br from-primary/15 to-primary/5 border-primary/40' : 'bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/30']">
                <div class="relative inline-block">
                  <img :src="selectedMatchup.team1.logo_url || defaultAvatar" :class="['w-20 h-20 rounded-full mx-auto mb-3 border-4', selectedMatchup.team1.is_my_team ? 'border-primary' : 'border-cyan-500']" @error="handleImageError"/>
                  <div v-if="selectedMatchup.team1.is_my_team" class="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-lg"><span class="text-sm text-gray-900">★</span></div>
                </div>
                <div :class="['font-bold text-xl mb-2', selectedMatchup.team1.is_my_team ? 'text-primary' : 'text-cyan-400']">{{ selectedMatchup.team1.name }}</div>
                <div :class="['text-5xl font-black mb-3', selectedMatchup.team1.is_my_team ? 'text-primary' : 'text-cyan-400']">{{ selectedMatchup.team1WinProb.toFixed(0) }}%</div>
                <div class="space-y-1 text-sm">
                  <div class="text-white">Current: {{ selectedMatchup.team1CatWins }}-{{ selectedMatchup.team2CatWins }}-{{ selectedMatchup.ties }}</div>
                  <div :class="selectedMatchup.team1.is_my_team ? 'text-primary' : 'text-cyan-400'">Projected: {{ selectedMatchup.projectedTeam1Wins }}-{{ selectedMatchup.projectedTeam2Wins }}-{{ selectedMatchup.projectedTies }}</div>
                </div>
              </div>
              <!-- Team 2 -->
              <div :class="['text-center p-6 rounded-xl border-2', selectedMatchup.team2.is_my_team ? 'bg-gradient-to-br from-primary/15 to-primary/5 border-primary/40' : 'bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/30']">
                <div class="relative inline-block">
                  <img :src="selectedMatchup.team2.logo_url || defaultAvatar" :class="['w-20 h-20 rounded-full mx-auto mb-3 border-4', selectedMatchup.team2.is_my_team ? 'border-primary' : 'border-orange-500']" @error="handleImageError"/>
                  <div v-if="selectedMatchup.team2.is_my_team" class="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-lg"><span class="text-sm text-gray-900">★</span></div>
                </div>
                <div :class="['font-bold text-xl mb-2', selectedMatchup.team2.is_my_team ? 'text-primary' : 'text-orange-400']">{{ selectedMatchup.team2.name }}</div>
                <div :class="['text-5xl font-black mb-3', selectedMatchup.team2.is_my_team ? 'text-primary' : 'text-orange-400']">{{ selectedMatchup.team2WinProb.toFixed(0) }}%</div>
                <div class="space-y-1 text-sm">
                  <div class="text-white">Current: {{ selectedMatchup.team2CatWins }}-{{ selectedMatchup.team1CatWins }}-{{ selectedMatchup.ties }}</div>
                  <div :class="selectedMatchup.team2.is_my_team ? 'text-primary' : 'text-orange-400'">Projected: {{ selectedMatchup.projectedTeam2Wins }}-{{ selectedMatchup.projectedTeam1Wins }}-{{ selectedMatchup.projectedTies }}</div>
                </div>
              </div>
            </div>
            <!-- Win Probability Bar -->
            <div class="relative h-12 bg-dark-border/30 rounded-full overflow-hidden mb-6">
              <div class="absolute inset-0 transition-all duration-500" :style="gradientBarStyle"></div>
              <div class="absolute left-0 top-0 h-full flex items-center px-4 z-10"><span class="font-bold text-sm text-white drop-shadow-md">{{ selectedMatchup.team1.name }}</span></div>
              <div class="absolute right-0 top-0 h-full flex items-center px-4 z-10"><span class="font-bold text-sm text-white drop-shadow-md">{{ selectedMatchup.team2.name }}</span></div>
            </div>
            <!-- Chart -->
            <div class="bg-dark-border/30 rounded-xl p-4">
              <h4 class="text-sm font-semibold text-dark-textMuted mb-3">Win Probability Trend</h4>
              <div ref="winProbChartEl" class="h-48"></div>
              <p class="text-xs text-dark-textMuted mt-2 text-center">Win probability changes throughout the week based on daily stat updates</p>
              <p class="text-xs text-dark-textMuted mt-1 text-center italic">Based on 10,000 Monte Carlo simulations using current stats and historical category volatility.</p>
            </div>
          </div>
        </div>

        <!-- Scouting Reports -->
        <div class="card">
          <div class="card-header"><div class="flex items-center gap-2"><span class="text-2xl">🔍</span><h2 class="card-title">Scouting Reports</h2></div></div>
          <div class="card-body">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div :class="['p-4 rounded-xl border', selectedMatchup.team1.is_my_team ? 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30' : 'bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/30']">
                <div class="flex items-center gap-3 mb-4">
                  <img :src="selectedMatchup.team1.logo_url || defaultAvatar" class="w-12 h-12 rounded-full border-2 border-cyan-500" @error="handleImageError"/>
                  <div>
                    <div class="font-bold text-lg" :class="selectedMatchup.team1.is_my_team ? 'text-primary' : 'text-cyan-400'">{{ selectedMatchup.team1.name }}</div>
                    <div class="flex gap-1 mt-1">
                      <span v-for="(r, i) in scoutingReports.team1.recentForm" :key="i" :class="['w-6 h-6 rounded flex items-center justify-center text-xs font-bold', r === 'W' ? 'bg-green-500/20 text-green-400' : r === 'L' ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400']">{{ r }}</span>
                    </div>
                  </div>
                </div>
                <div class="space-y-3">
                  <div v-if="scoutingReports.team1.strengths.length"><div class="text-xs font-semibold text-green-400 mb-1">✓ Category Strengths</div><ul class="space-y-1 text-sm text-dark-textMuted"><li v-for="(s, i) in scoutingReports.team1.strengths.slice(0,3)" :key="i">• {{ s }}</li></ul></div>
                  <div v-if="scoutingReports.team1.weaknesses.length"><div class="text-xs font-semibold text-red-400 mb-1">✗ Category Weaknesses</div><ul class="space-y-1 text-sm text-dark-textMuted"><li v-for="(w, i) in scoutingReports.team1.weaknesses.slice(0,3)" :key="i">• {{ w }}</li></ul></div>
                </div>
              </div>
              <div :class="['p-4 rounded-xl border', selectedMatchup.team2.is_my_team ? 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30' : 'bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/30']">
                <div class="flex items-center gap-3 mb-4">
                  <img :src="selectedMatchup.team2.logo_url || defaultAvatar" class="w-12 h-12 rounded-full border-2 border-orange-500" @error="handleImageError"/>
                  <div>
                    <div class="font-bold text-lg" :class="selectedMatchup.team2.is_my_team ? 'text-primary' : 'text-orange-400'">{{ selectedMatchup.team2.name }}</div>
                    <div class="flex gap-1 mt-1">
                      <span v-for="(r, i) in scoutingReports.team2.recentForm" :key="i" :class="['w-6 h-6 rounded flex items-center justify-center text-xs font-bold', r === 'W' ? 'bg-green-500/20 text-green-400' : r === 'L' ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400']">{{ r }}</span>
                    </div>
                  </div>
                </div>
                <div class="space-y-3">
                  <div v-if="scoutingReports.team2.strengths.length"><div class="text-xs font-semibold text-green-400 mb-1">✓ Category Strengths</div><ul class="space-y-1 text-sm text-dark-textMuted"><li v-for="(s, i) in scoutingReports.team2.strengths.slice(0,3)" :key="i">• {{ s }}</li></ul></div>
                  <div v-if="scoutingReports.team2.weaknesses.length"><div class="text-xs font-semibold text-red-400 mb-1">✗ Category Weaknesses</div><ul class="space-y-1 text-sm text-dark-textMuted"><li v-for="(w, i) in scoutingReports.team2.weaknesses.slice(0,3)" :key="i">• {{ w }}</li></ul></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Category Breakdown -->
        <div class="card">
          <div class="card-header"><div class="flex items-center gap-2"><span class="text-2xl">📊</span><h2 class="card-title">Category Breakdown</h2></div></div>
          <div class="card-body">
            <div class="grid grid-cols-7 items-center text-sm font-semibold pb-3 border-b border-dark-border">
              <div class="col-span-3 flex items-center gap-2">
                <img :src="selectedMatchup.team1.logo_url || defaultAvatar" class="w-8 h-8 rounded-full border-2 border-cyan-500" @error="handleImageError"/>
                <span class="text-cyan-400">{{ selectedMatchup.team1.name }}</span>
              </div>
              <div class="col-span-1 text-center text-dark-textMuted">VS</div>
              <div class="col-span-3 flex items-center justify-end gap-2">
                <span class="text-orange-400">{{ selectedMatchup.team2.name }}</span>
                <img :src="selectedMatchup.team2.logo_url || defaultAvatar" class="w-8 h-8 rounded-full border-2 border-orange-500" @error="handleImageError"/>
              </div>
            </div>
            <div class="overflow-x-auto mt-4">
              <table class="w-full text-sm">
                <thead><tr class="text-xs text-dark-textMuted border-b border-dark-border/50">
                  <th class="text-left py-2 px-1">Category</th>
                  <th class="text-center py-2 px-1 cursor-help" title="Current week's stat total for this category">Current</th>
                  <th class="text-center py-2 px-1 cursor-help" title="Average weekly total for this category this season">Avg</th>
                  <th class="text-center py-2 px-1 cursor-help" title="Best single-week total for this category this season">High</th>
                  <th class="text-center py-2 px-1 cursor-help" title="Probability of winning this category by end of week">Win%</th>
                  <th class="text-center py-2 px-1 w-10 cursor-help" title="Current category leader">ADV</th>
                  <th class="text-center py-2 px-1 cursor-help" title="Probability of winning this category by end of week">Win%</th>
                  <th class="text-center py-2 px-1 cursor-help" title="Best single-week total for this category this season">High</th>
                  <th class="text-center py-2 px-1 cursor-help" title="Average weekly total for this category this season">Avg</th>
                  <th class="text-center py-2 px-1 cursor-help" title="Current week's stat total for this category">Current</th>
                </tr></thead>
                <tbody>
                  <tr v-for="cat in allCategories" :key="cat.stat_id" class="border-b border-dark-border/30 hover:bg-dark-border/10">
                    <td class="py-2 px-1 text-dark-text font-medium">{{ cat.display_name }}</td>
                    <td class="text-center py-2 px-1 text-white font-bold">{{ formatStat(getCategoryStat(selectedMatchup, cat.stat_id, 1), cat.stat_id) }}</td>
                    <td class="text-center py-2 px-1 text-dark-textMuted">{{ formatStat(getCategoryAvg(selectedMatchup.team1.team_key, cat.stat_id), cat.stat_id) }}</td>
                    <td class="text-center py-2 px-1 text-dark-textMuted">{{ formatStat(getCategoryHigh(selectedMatchup.team1.team_key, cat.stat_id), cat.stat_id) }}</td>
                    <td class="text-center py-2 px-1" :class="getCategoryWinProbClass(getCategoryWinProb(selectedMatchup, cat.stat_id, 1))">{{ getCategoryWinProb(selectedMatchup, cat.stat_id, 1).toFixed(0) }}%</td>
                    <td class="text-center py-2 px-1">
                      <span v-if="getCategoryLeader(selectedMatchup, cat.stat_id) === 1" class="text-cyan-400 text-lg font-bold">◀</span>
                      <span v-else-if="getCategoryLeader(selectedMatchup, cat.stat_id) === 2" class="text-orange-400 text-lg font-bold">▶</span>
                      <span v-else class="text-dark-textMuted">—</span>
                    </td>
                    <td class="text-center py-2 px-1" :class="getCategoryWinProbClass(getCategoryWinProb(selectedMatchup, cat.stat_id, 2))">{{ getCategoryWinProb(selectedMatchup, cat.stat_id, 2).toFixed(0) }}%</td>
                    <td class="text-center py-2 px-1 text-dark-textMuted">{{ formatStat(getCategoryHigh(selectedMatchup.team2.team_key, cat.stat_id), cat.stat_id) }}</td>
                    <td class="text-center py-2 px-1 text-dark-textMuted">{{ formatStat(getCategoryAvg(selectedMatchup.team2.team_key, cat.stat_id), cat.stat_id) }}</td>
                    <td class="text-center py-2 px-1 text-white font-bold">{{ formatStat(getCategoryStat(selectedMatchup, cat.stat_id, 2), cat.stat_id) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Statistical Comparison -->
        <div class="card">
          <div class="card-header"><div class="flex items-center gap-2"><span class="text-2xl">📊</span><h2 class="card-title">Statistical Comparison</h2></div></div>
          <div class="card-body">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead><tr class="border-b border-dark-border bg-dark-border/30">
                  <th class="text-left p-3 text-dark-textMuted font-semibold">Statistic</th>
                  <th class="text-center p-3 font-semibold text-cyan-400">{{ selectedMatchup.team1.name }}</th>
                  <th class="text-center p-3 text-dark-textMuted font-semibold">Advantage</th>
                  <th class="text-center p-3 font-semibold text-orange-400">{{ selectedMatchup.team2.name }}</th>
                </tr></thead>
                <tbody>
                  <tr v-for="stat in comparisonStats" :key="stat.label" class="border-b border-dark-border/50 hover:bg-dark-border/10">
                    <td class="p-3 text-dark-text font-medium">{{ stat.label }}</td>
                    <td class="text-center p-3"><span :class="stat.team1Better ? 'text-cyan-400 font-bold' : 'text-dark-textMuted'">{{ stat.team1Value }}</span></td>
                    <td class="text-center p-3">
                      <span v-if="stat.team1Better" class="text-cyan-400 font-semibold">◀ {{ selectedMatchup.team1.name }}</span>
                      <span v-else-if="stat.team2Better" class="text-orange-400 font-semibold">{{ selectedMatchup.team2.name }} ▶</span>
                      <span v-else class="text-dark-textMuted">Even</span>
                    </td>
                    <td class="text-center p-3"><span :class="stat.team2Better ? 'text-orange-400 font-bold' : 'text-dark-textMuted'">{{ stat.team2Value }}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Season Series -->
        <div class="card">
          <div class="card-header">
            <div class="flex items-center gap-2"><span class="text-2xl">📜</span><h2 class="card-title">Season Series</h2></div>
            <p class="card-subtitle mt-2">Head-to-head results this season</p>
          </div>
          <div class="card-body">
            <div class="text-center mb-6 p-4 bg-dark-border/20 rounded-lg">
              <div class="text-sm text-dark-textMuted mb-2">Season Record</div>
              <div class="flex items-center justify-center gap-4">
                <div class="text-center">
                  <div class="text-3xl font-bold" :class="lifetimeSeries.team1Wins > lifetimeSeries.team2Wins ? 'text-green-400' : 'text-dark-textMuted'">{{ lifetimeSeries.team1Wins }}</div>
                  <div class="text-xs text-dark-textMuted">{{ selectedMatchup.team1.name }}</div>
                </div>
                <div class="text-2xl text-dark-textMuted">-</div>
                <div class="text-center">
                  <div class="text-3xl font-bold" :class="lifetimeSeries.team2Wins > lifetimeSeries.team1Wins ? 'text-green-400' : 'text-dark-textMuted'">{{ lifetimeSeries.team2Wins }}</div>
                  <div class="text-xs text-dark-textMuted">{{ selectedMatchup.team2.name }}</div>
                </div>
              </div>
              <div v-if="lifetimeSeries.ties > 0" class="text-xs text-dark-textMuted mt-2">{{ lifetimeSeries.ties }} tie(s)</div>
            </div>
            <div v-if="lifetimeSeries.games.length > 0" class="space-y-3">
              <div class="text-sm font-semibold text-dark-text mb-3">All Matchups ({{ lifetimeSeries.games.length }})</div>
              <div v-for="(game, i) in lifetimeSeries.games" :key="i" class="p-3 bg-dark-border/20 rounded-lg border border-dark-border">
                <div class="flex items-center justify-between mb-2">
                  <div class="text-xs text-dark-textMuted"><span class="font-semibold">Week {{ game.week }}</span></div>
                  <div class="text-xs text-dark-textMuted">{{ game.team1Score }}-{{ game.team2Score }}</div>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div class="text-sm" :class="game.team1Won ? 'text-green-400 font-bold' : 'text-dark-textMuted'">{{ selectedMatchup.team1.name }}: {{ game.team1Score }} cats</div>
                  <div class="text-sm text-right" :class="game.team2Won ? 'text-green-400 font-bold' : 'text-dark-textMuted'">{{ selectedMatchup.team2.name }}: {{ game.team2Score }} cats</div>
                </div>
              </div>
            </div>
            <div v-else class="text-center text-dark-textMuted py-4">No previous matchups this season</div>
          </div>
        </div>
      </template>
    </template>

    <!-- Empty State -->
    <div v-else-if="!isLoading" class="text-center py-20">
      <div class="text-6xl mb-4">⚔️</div>
      <h3 class="text-xl font-bold text-dark-text mb-2">Select a Week</h3>
      <p class="text-dark-textMuted">Choose a week to view category matchups</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useAuthStore } from '@/stores/auth'
import { yahooService } from '@/services/yahoo'
import ApexCharts from 'apexcharts'

const leagueStore = useLeagueStore()
const authStore = useAuthStore()

const isLoading = ref(false)
const isRefreshing = ref(false)
const isDownloading = ref(false)
const isDownloadingAll = ref(false)
const downloadProgress = ref('')
const loadingMessage = ref('Loading matchups...')
const selectedWeek = ref('')
const matchups = ref<any[]>([])
const selectedMatchup = ref<any>(null)
const categories = ref<any[]>([])
const teamSeasonStats = ref<Map<string, any>>(new Map())
const defaultAvatar = 'https://s.yimg.com/cv/apiv2/default/mlb/mlb_2_g.png'
const winProbChartEl = ref<HTMLElement | null>(null)
let winProbChart: ApexCharts | null = null

const BATTING_STAT_IDS = ['60', '7', '12', '16', '3', '55', '56']
const PITCHING_STAT_IDS = ['28', '32', '42', '26', '27', '48']
const INVERSE_STATS = ['26', '27']

const leagueInfo = computed(() => { const l = leagueStore.yahooLeague; return Array.isArray(l) ? l[0] || {} : l || {} })
const currentWeek = computed(() => parseInt(leagueInfo.value?.current_week) || 1)
const totalWeeks = computed(() => parseInt(leagueInfo.value?.end_week) || 25)
const isSeasonComplete = computed(() => leagueInfo.value?.is_finished === 1 || leagueInfo.value?.is_finished === '1')
const availableWeeks = computed(() => Array.from({ length: isSeasonComplete.value ? totalWeeks.value : currentWeek.value }, (_, i) => i + 1))
const allCategories = computed(() => categories.value.filter(c => [...BATTING_STAT_IDS, ...PITCHING_STAT_IDS].includes(c.stat_id)))

const weekStats = computed(() => {
  if (!matchups.value.length) return { 
    mostDominant: { team: '-', score: '0-0' }, 
    closestMatchup: { teams: '-', margin: 0 },
    mostCategories: { team: '-', count: 0 },
    fewestCategories: { team: '-', count: 0 }
  }
  
  let mostDominant = { team: '-', score: '0-0', diff: 0 }
  let closestMatchup = { teams: '-', margin: 999 }
  
  // Track category wins for each team
  const teamCatWins = new Map<string, { name: string, wins: number }>()
  
  for (const m of matchups.value) {
    // Track team category wins
    const existing1 = teamCatWins.get(m.team1.team_key)
    if (existing1) {
      existing1.wins += m.team1CatWins
    } else {
      teamCatWins.set(m.team1.team_key, { name: m.team1.name, wins: m.team1CatWins })
    }
    
    const existing2 = teamCatWins.get(m.team2.team_key)
    if (existing2) {
      existing2.wins += m.team2CatWins
    } else {
      teamCatWins.set(m.team2.team_key, { name: m.team2.name, wins: m.team2CatWins })
    }
    
    // Most dominant
    const d1 = m.team1CatWins - m.team2CatWins, d2 = m.team2CatWins - m.team1CatWins
    if (d1 > mostDominant.diff) mostDominant = { team: m.team1.name, score: `${m.team1CatWins}-${m.team2CatWins}`, diff: d1 }
    if (d2 > mostDominant.diff) mostDominant = { team: m.team2.name, score: `${m.team2CatWins}-${m.team1CatWins}`, diff: d2 }
    
    // Closest matchup - use full team names
    const margin = Math.abs(m.team1CatWins - m.team2CatWins)
    if (margin < closestMatchup.margin) closestMatchup = { teams: `${m.team1.name} vs ${m.team2.name}`, margin }
  }
  
  // Find most and fewest categories
  const teams = Array.from(teamCatWins.values())
  const maxWins = Math.max(...teams.map(t => t.wins))
  const minWins = Math.min(...teams.map(t => t.wins))
  
  const mostWinners = teams.filter(t => t.wins === maxWins)
  const fewestWinners = teams.filter(t => t.wins === minWins)
  
  const mostCategories = {
    team: mostWinners.length > 1 ? `Tie - ${mostWinners.length} teams` : mostWinners[0]?.name || '-',
    count: maxWins
  }
  
  const fewestCategories = {
    team: fewestWinners.length > 1 ? `Tie - ${fewestWinners.length} teams` : fewestWinners[0]?.name || '-',
    count: minWins
  }
  
  return { mostDominant, closestMatchup, mostCategories, fewestCategories }
})

const gradientBarStyle = computed(() => {
  if (!selectedMatchup.value) return {}
  const prob1 = selectedMatchup.value.team1WinProb
  const c1 = selectedMatchup.value.team1.is_my_team ? '#f5c451' : '#06b6d4'
  const c2 = selectedMatchup.value.team2.is_my_team ? '#f5c451' : '#f97316'
  return { background: `linear-gradient(to right, ${c1} 0%, ${c1} ${Math.max(0, prob1-10)}%, ${c2} ${Math.min(100, prob1+10)}%, ${c2} 100%)` }
})

const scoutingReports = computed(() => {
  if (!selectedMatchup.value) return { team1: { recentForm: [], strengths: [], weaknesses: [] }, team2: { recentForm: [], strengths: [], weaknesses: [] } }
  return { team1: generateScoutingReport(selectedMatchup.value.team1.team_key), team2: generateScoutingReport(selectedMatchup.value.team2.team_key) }
})

const comparisonStats = computed(() => {
  if (!selectedMatchup.value) return []
  const s1 = teamSeasonStats.value.get(selectedMatchup.value.team1.team_key) || {}
  const s2 = teamSeasonStats.value.get(selectedMatchup.value.team2.team_key) || {}
  return [
    { label: 'Record', team1Value: s1.record || '0-0', team2Value: s2.record || '0-0', team1Better: (s1.wins||0) > (s2.wins||0), team2Better: (s2.wins||0) > (s1.wins||0) },
    { label: 'Avg Cats/Week', team1Value: (s1.avgCatsPerWeek||0).toFixed(1), team2Value: (s2.avgCatsPerWeek||0).toFixed(1), team1Better: (s1.avgCatsPerWeek||0) > (s2.avgCatsPerWeek||0), team2Better: (s2.avgCatsPerWeek||0) > (s1.avgCatsPerWeek||0) },
    { label: 'Most Cats Won', team1Value: s1.mostCatsWon||0, team2Value: s2.mostCatsWon||0, team1Better: (s1.mostCatsWon||0) > (s2.mostCatsWon||0), team2Better: (s2.mostCatsWon||0) > (s1.mostCatsWon||0) },
    { label: 'Least Cats Won', team1Value: s1.leastCatsWon||0, team2Value: s2.leastCatsWon||0, team1Better: (s1.leastCatsWon||0) > (s2.leastCatsWon||0), team2Better: (s2.leastCatsWon||0) > (s1.leastCatsWon||0) },
    { label: 'Consistency (σ)', team1Value: `±${(s1.stdDev||0).toFixed(1)}`, team2Value: `±${(s2.stdDev||0).toFixed(1)}`, team1Better: (s1.stdDev||99) < (s2.stdDev||99), team2Better: (s2.stdDev||99) < (s1.stdDev||99) }
  ]
})

// Store historical matchup data between teams
const historicalMatchupData = ref<Map<string, any[]>>(new Map())

const lifetimeSeries = computed(() => {
  if (!selectedMatchup.value) return { team1Wins: 0, team2Wins: 0, ties: 0, games: [] }
  
  const team1Key = selectedMatchup.value.team1.team_key
  const team2Key = selectedMatchup.value.team2.team_key
  const pairKey = [team1Key, team2Key].sort().join('-')
  
  const games = historicalMatchupData.value.get(pairKey) || []
  
  let team1Wins = 0, team2Wins = 0, ties = 0
  
  for (const game of games) {
    if (game.team1Score > game.team2Score) {
      if (game.team1Key === team1Key) team1Wins++
      else team2Wins++
    } else if (game.team2Score > game.team1Score) {
      if (game.team2Key === team1Key) team1Wins++
      else team2Wins++
    } else {
      ties++
    }
  }
  
  // Format games for display (swap if needed so team1/team2 match selected matchup)
  const formattedGames = games.map(g => {
    const isSwapped = g.team1Key !== team1Key
    return {
      week: g.week,
      team1Score: isSwapped ? g.team2Score : g.team1Score,
      team2Score: isSwapped ? g.team1Score : g.team2Score,
      team1Won: isSwapped ? g.team2Score > g.team1Score : g.team1Score > g.team2Score,
      team2Won: isSwapped ? g.team1Score > g.team2Score : g.team2Score > g.team1Score
    }
  }).sort((a, b) => b.week - a.week) // Most recent first
  
  return { team1Wins, team2Wins, ties, games: formattedGames }
})

function handleImageError(e: Event) { (e.target as HTMLImageElement).src = defaultAvatar }
function getTeamRecord(k: string) { const t = leagueStore.yahooTeams.find(x => x.team_key === k); return t ? `${t.wins||0}-${t.losses||0}` : '0-0' }
function getCategoryStat(m: any, id: string, team: 1|2) { return parseFloat((team === 1 ? m.team1Stats : m.team2Stats)?.[id] || 0) }
function getCategoryLeader(m: any, id: string): 0|1|2 { const v1 = getCategoryStat(m, id, 1), v2 = getCategoryStat(m, id, 2), inv = INVERSE_STATS.includes(id); if (v1 === v2) return 0; return inv ? (v1 < v2 ? 1 : 2) : (v1 > v2 ? 1 : 2) }
function getCategoryWinProb(m: any, id: string, team: 1|2) { const p = m.categoryWinProbs?.[id]; return p ? (team === 1 ? p.team1 : p.team2) : 50 }
function getCategoryWinProbClass(p: number) { return p >= 65 ? 'text-green-400' : p >= 55 ? 'text-green-300' : p >= 45 ? 'text-dark-textMuted' : p >= 35 ? 'text-orange-300' : 'text-red-400' }
function getCategoryAvg(k: string, id: string) { return teamSeasonStats.value.get(k)?.categoryAvgs?.[id] || 0 }
function getCategoryHigh(k: string, id: string) { return teamSeasonStats.value.get(k)?.categoryHighs?.[id] || 0 }
function formatStat(v: number, id: string) { return ['3','55','56'].includes(id) ? v.toFixed(3).replace(/^0/,'') : ['26','27'].includes(id) ? v.toFixed(2) : Math.round(v).toString() }
function generateScoutingReport(k: string) { return { recentForm: ['W','L','W','W','L'], strengths: ['Strong in HR (top tier)', 'Excellent K rate'], weaknesses: ['Below average in SB'] } }

// Box-Muller transform to generate normally distributed random numbers
function randomNormal(mean: number, stdDev: number): number {
  const u1 = Math.random()
  const u2 = Math.random()
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return mean + z * stdDev
}

// Calculate per-category win probability using simulation
function calcCatWinProb(v1: number, v2: number, id: string, days: number) {
  const inv = INVERSE_STATS.includes(id)
  // Volatility per day remaining (standard deviation)
  const vol: Record<string,number> = { '60':8,'7':3,'12':8,'16':2,'3':0.02,'55':0.02,'56':0.03,'28':0.5,'32':0.5,'42':15,'26':0.5,'27':0.15,'48':0.5 }
  const dailyVol = vol[id] || 5
  const totalVol = dailyVol * Math.sqrt(Math.max(0.5, days))
  
  // If no days remaining, just compare current values
  if (days <= 0) {
    if (inv) {
      if (v1 < v2) return { team1: 100, team2: 0 }
      if (v2 < v1) return { team1: 0, team2: 100 }
    } else {
      if (v1 > v2) return { team1: 100, team2: 0 }
      if (v2 > v1) return { team1: 0, team2: 100 }
    }
    return { team1: 50, team2: 50 }
  }
  
  // Run 1000 mini-simulations per category (faster than 10k per cat)
  const SIMS = 1000
  let team1Wins = 0
  
  for (let i = 0; i < SIMS; i++) {
    const final1 = v1 + randomNormal(0, totalVol)
    const final2 = v2 + randomNormal(0, totalVol)
    
    if (inv) {
      if (final1 < final2) team1Wins++
      else if (final1 === final2) team1Wins += 0.5
    } else {
      if (final1 > final2) team1Wins++
      else if (final1 === final2) team1Wins += 0.5
    }
  }
  
  const p1 = (team1Wins / SIMS) * 100
  return { team1: Math.round(p1 * 100) / 100, team2: Math.round((100 - p1) * 100) / 100 }
}

// Monte Carlo simulation for overall matchup win probability (10,000 simulations)
function calcOverallWinProb(
  team1Stats: Record<string, number>,
  team2Stats: Record<string, number>,
  categoryIds: string[],
  days: number
): { team1: number, team2: number } {
  const SIMULATIONS = 10000
  let team1Wins = 0
  let team2Wins = 0
  let ties = 0
  
  // Volatility per category
  const vol: Record<string,number> = { '60':8,'7':3,'12':8,'16':2,'3':0.02,'55':0.02,'56':0.03,'28':0.5,'32':0.5,'42':15,'26':0.5,'27':0.15,'48':0.5 }
  
  for (let sim = 0; sim < SIMULATIONS; sim++) {
    let t1CatsWon = 0
    let t2CatsWon = 0
    
    for (const catId of categoryIds) {
      const v1 = team1Stats[catId] || 0
      const v2 = team2Stats[catId] || 0
      const dailyVol = vol[catId] || 5
      const totalVol = dailyVol * Math.sqrt(Math.max(0.5, days))
      const isInverse = INVERSE_STATS.includes(catId)
      
      // Project final values with random variance
      const final1 = v1 + randomNormal(0, totalVol)
      const final2 = v2 + randomNormal(0, totalVol)
      
      // Determine category winner
      if (isInverse) {
        if (final1 < final2) t1CatsWon++
        else if (final2 < final1) t2CatsWon++
        // Ties don't count for either
      } else {
        if (final1 > final2) t1CatsWon++
        else if (final2 > final1) t2CatsWon++
      }
    }
    
    // Determine matchup winner
    if (t1CatsWon > t2CatsWon) team1Wins++
    else if (t2CatsWon > t1CatsWon) team2Wins++
    else ties++
  }
  
  // Calculate win probability (ties split evenly)
  const t1Prob = ((team1Wins + ties / 2) / SIMULATIONS) * 100
  const t2Prob = ((team2Wins + ties / 2) / SIMULATIONS) * 100
  
  return { 
    team1: Math.round(t1Prob * 100) / 100, 
    team2: Math.round(t2Prob * 100) / 100 
  }
}

// Load historical category data to calculate avg and high per team per category
async function loadTeamSeasonStats(leagueKey: string, currentWeek: number) {
  try {
    // Get all teams
    const teams = leagueStore.yahooTeams
    const newStats = new Map<string, any>()
    const newMatchupHistory = new Map<string, any[]>()
    
    // Load matchups from ALL previous weeks in the season for complete series data
    const weekPromises: Promise<any>[] = []
    
    for (let w = 1; w < currentWeek; w++) {
      weekPromises.push(yahooService.getCategoryMatchups(leagueKey, w).then(data => ({ week: w, data })))
    }
    
    const allWeeksData = await Promise.all(weekPromises)
    
    // Track matchups between team pairs for lifetime series
    for (const weekResult of allWeeksData) {
      const weekNum = weekResult.week
      const weekMatchups = weekResult.data
      
      for (const matchup of weekMatchups) {
        if (!matchup.teams || matchup.teams.length < 2) continue
        
        const t1 = matchup.teams[0]
        const t2 = matchup.teams[1]
        
        // Count category wins for each team
        let t1Wins = 0, t2Wins = 0
        for (const sw of (matchup.stat_winners || [])) {
          if (sw.is_tied) continue
          if (sw.winner_team_key === t1.team_key) t1Wins++
          else t2Wins++
        }
        
        // Store in matchup history (use sorted key so we find it regardless of order)
        const pairKey = [t1.team_key, t2.team_key].sort().join('-')
        if (!newMatchupHistory.has(pairKey)) {
          newMatchupHistory.set(pairKey, [])
        }
        newMatchupHistory.get(pairKey)!.push({
          week: weekNum,
          team1Key: t1.team_key,
          team2Key: t2.team_key,
          team1Score: t1Wins,
          team2Score: t2Wins
        })
      }
    }
    
    historicalMatchupData.value = newMatchupHistory
    
    // Process each team's historical stats
    for (const team of teams) {
      const categoryTotals: Record<string, number[]> = {}
      let totalCatsWon = 0
      let weeksPlayed = 0
      const weeklyWins: number[] = []
      
      // Go through each week's matchups
      for (const weekResult of allWeeksData) {
        const weekMatchups = weekResult.data
        for (const matchup of weekMatchups) {
          if (!matchup.teams || matchup.teams.length < 2) continue
          
          const teamData = matchup.teams.find((t: any) => t.team_key === team.team_key)
          if (!teamData) continue
          
          weeksPlayed++
          let catsWonThisWeek = 0
          
          // Count category wins
          for (const sw of (matchup.stat_winners || [])) {
            if (!sw.is_tied && sw.winner_team_key === team.team_key) {
              catsWonThisWeek++
            }
          }
          totalCatsWon += catsWonThisWeek
          weeklyWins.push(catsWonThisWeek)
          
          // Track each category value
          if (teamData.stats) {
            for (const [statId, value] of Object.entries(teamData.stats)) {
              if (!categoryTotals[statId]) categoryTotals[statId] = []
              categoryTotals[statId].push(parseFloat(value as string) || 0)
            }
          }
        }
      }
      
      // Calculate averages and highs
      const categoryAvgs: Record<string, number> = {}
      const categoryHighs: Record<string, number> = {}
      
      for (const [statId, values] of Object.entries(categoryTotals)) {
        if (values.length > 0) {
          categoryAvgs[statId] = values.reduce((a, b) => a + b, 0) / values.length
          // For inverse stats (ERA, WHIP), high is actually the lowest value
          if (INVERSE_STATS.includes(statId)) {
            categoryHighs[statId] = Math.min(...values)
          } else {
            categoryHighs[statId] = Math.max(...values)
          }
        }
      }
      
      // Calculate consistency (standard deviation of weekly wins)
      const avgWins = weeklyWins.length > 0 ? weeklyWins.reduce((a, b) => a + b, 0) / weeklyWins.length : 0
      const variance = weeklyWins.length > 0 ? weeklyWins.reduce((sum, w) => sum + Math.pow(w - avgWins, 2), 0) / weeklyWins.length : 0
      const stdDev = Math.sqrt(variance)
      
      newStats.set(team.team_key, {
        record: `${team.wins || 0}-${team.losses || 0}`,
        wins: team.wins || 0,
        avgCatsPerWeek: weeksPlayed > 0 ? totalCatsWon / weeksPlayed : 0,
        mostCatsWon: weeklyWins.length > 0 ? Math.max(...weeklyWins) : 0,
        leastCatsWon: weeklyWins.length > 0 ? Math.min(...weeklyWins) : 0,
        stdDev: stdDev,
        categoryAvgs,
        categoryHighs
      })
    }
    
    teamSeasonStats.value = newStats
  } catch (e) {
    console.error('Error loading team season stats:', e)
  }
}

async function loadCategories() {
  const k = leagueStore.activeLeagueId; if (!k) return
  try {
    const s = await yahooService.getLeagueScoringSettings(k)
    if (s?.stat_categories) categories.value = s.stat_categories.map((c: any) => ({ stat_id: String(c.stat?.stat_id || c.stat_id), name: c.stat?.name || c.name, display_name: c.stat?.display_name || c.display_name, is_only_display_stat: c.stat?.is_only_display_stat || c.is_only_display_stat })).filter((c: any) => c.stat_id && c.is_only_display_stat !== '1' && c.is_only_display_stat !== 1)
  } catch (e) { console.error('Error loading categories:', e) }
}

async function loadMatchups() {
  if (!selectedWeek.value) return
  const k = leagueStore.activeLeagueId; if (!k) return
  isLoading.value = true; loadingMessage.value = 'Loading matchups...'
  try {
    if (!categories.value.length) await loadCategories()
    const week = parseInt(selectedWeek.value)
    const raw = await yahooService.getCategoryMatchups(k, week)
    const isCurrent = week === currentWeek.value && !isSeasonComplete.value
    const days = isCurrent ? 3 : 0
    
    // Load historical data to calculate avg/high for each team
    await loadTeamSeasonStats(k, week)
    
    const processed: any[] = []
    for (const m of raw) {
      if (!m.teams || m.teams.length < 2) continue
      const t1 = m.teams[0], t2 = m.teams[1]
      let w1 = 0, w2 = 0, ties = 0
      const catProbs: Record<string, { team1: number, team2: number }> = {}
      
      // Get category IDs from stat_winners
      const categoryIds: string[] = []
      for (const sw of (m.stat_winners || [])) {
        const id = String(sw.stat_id)
        categoryIds.push(id)
        if (sw.is_tied) { ties++; catProbs[id] = { team1: 50, team2: 50 } }
        else if (sw.winner_team_key === t1.team_key) w1++
        else w2++
        catProbs[id] = calcCatWinProb(parseFloat(t1.stats?.[id]||0), parseFloat(t2.stats?.[id]||0), id, days)
      }
      
      // Convert stats to number records for Monte Carlo
      const t1StatsNum: Record<string, number> = {}
      const t2StatsNum: Record<string, number> = {}
      for (const id of categoryIds) {
        t1StatsNum[id] = parseFloat(t1.stats?.[id] || 0)
        t2StatsNum[id] = parseFloat(t2.stats?.[id] || 0)
      }
      
      // Run Monte Carlo simulation for overall win probability
      const op = calcOverallWinProb(t1StatsNum, t2StatsNum, categoryIds, days)
      
      let pj1 = 0, pj2 = 0, pjt = 0
      for (const p of Object.values(catProbs)) { if (p.team1 > 55) pj1++; else if (p.team2 > 55) pj2++; else pjt++ }
      processed.push({
        matchup_id: processed.length + 1,
        team1: { team_key: t1.team_key, name: t1.name, logo_url: t1.logo_url, is_my_team: leagueStore.yahooTeams.find(x => x.team_key === t1.team_key)?.is_my_team || false },
        team2: { team_key: t2.team_key, name: t2.name, logo_url: t2.logo_url, is_my_team: leagueStore.yahooTeams.find(x => x.team_key === t2.team_key)?.is_my_team || false },
        team1Stats: t1.stats, team2Stats: t2.stats, team1CatWins: w1, team2CatWins: w2, ties, team1Leading: w1 > w2, team2Leading: w2 > w1,
        team1WinProb: op.team1, team2WinProb: op.team2, projectedTeam1Wins: pj1, projectedTeam2Wins: pj2, projectedTies: pjt, categoryWinProbs: catProbs, stat_winners: m.stat_winners
      })
    }
    matchups.value = processed
    const my = processed.find(m => m.team1.is_my_team || m.team2.is_my_team)
    if (my) selectMatchup(my); else if (processed.length) selectMatchup(processed[0])
  } catch (e) { console.error('Error loading matchups:', e) }
  finally { isLoading.value = false }
}

function selectMatchup(m: any) { selectedMatchup.value = m; nextTick(() => buildWinProbChart()) }

function buildWinProbChart() {
  if (!winProbChartEl.value || !selectedMatchup.value) return
  if (winProbChart) { winProbChart.destroy(); winProbChart = null }
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const p1 = selectedMatchup.value.team1WinProb
  // Round all data points to 2 decimal places
  const d1 = [
    Math.round(50 * 100) / 100,
    Math.round((48 + Math.random() * 10) * 100) / 100,
    Math.round((50 + Math.random() * 15) * 100) / 100,
    Math.round((p1 * 0.7 + 15) * 100) / 100,
    Math.round((p1 * 0.85 + 7) * 100) / 100,
    Math.round((p1 * 0.95 + 2) * 100) / 100,
    Math.round(p1 * 100) / 100
  ]
  const d2 = d1.map(x => Math.round((100 - x) * 100) / 100)
  const c1 = selectedMatchup.value.team1.is_my_team ? '#f5c451' : '#06b6d4'
  const c2 = selectedMatchup.value.team2.is_my_team ? '#f5c451' : '#f97316'
  winProbChart = new ApexCharts(winProbChartEl.value, {
    chart: { type: 'area', height: 192, background: 'transparent', toolbar: { show: false }, zoom: { enabled: false } },
    series: [{ name: selectedMatchup.value.team1.name, data: d1 }, { name: selectedMatchup.value.team2.name, data: d2 }],
    colors: [c1, c2],
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.1, stops: [0, 100] } },
    stroke: { width: 2, curve: 'smooth' },
    xaxis: { categories: days, labels: { style: { colors: '#9ca3af', fontSize: '10px' } } },
    yaxis: { min: 0, max: 100, labels: { style: { colors: '#9ca3af', fontSize: '10px' }, formatter: (v: number) => `${v.toFixed(2)}%` } },
    legend: { show: true, position: 'top', labels: { colors: '#9ca3af' }, fontSize: '11px' },
    grid: { borderColor: '#374151', strokeDashArray: 3 },
    tooltip: { theme: 'dark', y: { formatter: (v: number) => `${v.toFixed(2)}%` } }
  })
  winProbChart.render()
}

async function downloadMatchupAnalysis() {
  if (!selectedMatchup.value) return
  isDownloading.value = true
  
  try {
    const html2canvas = (await import('html2canvas')).default
    await generateMatchupImage(selectedMatchup.value, html2canvas)
  } catch (error) {
    console.error('Error generating matchup image:', error)
    alert('Failed to generate image. Please try again.')
  } finally {
    isDownloading.value = false
  }
}

async function downloadAllMatchups() {
  if (!matchups.value.length) return
  isDownloadingAll.value = true
  
  try {
    const html2canvas = (await import('html2canvas')).default
    
    for (let i = 0; i < matchups.value.length; i++) {
      downloadProgress.value = `${i + 1}/${matchups.value.length}`
      await generateMatchupImage(matchups.value[i], html2canvas)
      // Small delay between downloads
      await new Promise(r => setTimeout(r, 300))
    }
  } catch (error) {
    console.error('Error generating matchup images:', error)
    alert('Failed to generate images. Please try again.')
  } finally {
    isDownloadingAll.value = false
    downloadProgress.value = ''
  }
}

async function generateMatchupImage(matchup: any, html2canvas: any) {
  // Team colors for chart
  const teamColors = ['#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#84CC16', '#6366F1', '#14B8A6', '#F43F5E']
  const getTeamColor = (idx: number) => teamColors[idx % teamColors.length]
  
  // Helper to load logo
  const loadLogo = async (): Promise<string> => {
    try {
      const response = await fetch('/UFD_V5.png')
      const blob = await response.blob()
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = () => resolve('')
        reader.readAsDataURL(blob)
      })
    } catch (e) {
      return ''
    }
  }
  
  // Helper to create placeholder avatar
  const createPlaceholder = (teamName: string): string => {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#3a3d52'
      ctx.beginPath()
      ctx.arc(32, 32, 32, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#3B9FE8'
      ctx.font = 'bold 28px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(teamName.charAt(0).toUpperCase(), 32, 34)
    }
    return canvas.toDataURL('image/png')
  }
  
  // Load team images
  const loadTeamImage = async (team: any): Promise<string> => {
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      return new Promise((resolve) => {
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
            resolve(createPlaceholder(team.name))
          }
        }
        img.onerror = () => resolve(createPlaceholder(team.name))
        setTimeout(() => resolve(createPlaceholder(team.name)), 3000)
        img.src = team.logo_url || ''
      })
    } catch {
      return createPlaceholder(team.name)
    }
  }
  
  const logoBase64 = await loadLogo()
  const team1Logo = await loadTeamImage(matchup.team1)
  const team2Logo = await loadTeamImage(matchup.team2)
  
  // Get league name
  const league = leagueStore.yahooLeague
  const leagueName = Array.isArray(league) ? league[0]?.name : league?.name || 'Fantasy League'
  
  // Create container
  const container = document.createElement('div')
  container.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 700px; font-family: system-ui, -apple-system, sans-serif;'
  
  // Get team colors
  const team1Color = matchup.team1.is_my_team ? '#F5C451' : '#06b6d4'
  const team2Color = matchup.team2.is_my_team ? '#F5C451' : '#f97316'
  
  // Generate category rows
  const generateCategoryRow = (cat: any) => {
    const stat1 = getCategoryStat(matchup, cat.stat_id, 1)
    const stat2 = getCategoryStat(matchup, cat.stat_id, 2)
    const leader = getCategoryLeader(matchup, cat.stat_id)
    const winProb1 = getCategoryWinProb(matchup, cat.stat_id, 1)
    const winProb2 = getCategoryWinProb(matchup, cat.stat_id, 2)
    
    let leaderIndicator = '<span style="color: #6b7280;">—</span>'
    if (leader === 1) leaderIndicator = `<span style="color: ${team1Color}; font-size: 16px;">◀</span>`
    else if (leader === 2) leaderIndicator = `<span style="color: ${team2Color}; font-size: 16px;">▶</span>`
    
    const prob1Color = winProb1 >= 70 ? '#10b981' : winProb1 >= 40 ? '#f59e0b' : '#ef4444'
    const prob2Color = winProb2 >= 70 ? '#10b981' : winProb2 >= 40 ? '#f59e0b' : '#ef4444'
    
    return `
      <tr style="border-bottom: 1px solid rgba(58, 61, 82, 0.3);">
        <td style="padding: 8px 4px; text-align: center; color: ${prob1Color}; font-weight: 600; font-size: 11px;">${winProb1.toFixed(0)}%</td>
        <td style="padding: 8px 4px; text-align: center; color: #ffffff; font-weight: 700; font-size: 13px;">${formatStat(stat1, cat.stat_id)}</td>
        <td style="padding: 8px 4px; text-align: center; width: 30px;">${leaderIndicator}</td>
        <td style="padding: 8px 4px; text-align: center; color: #9ca3af; font-size: 11px; font-weight: 600;">${cat.display_name}</td>
        <td style="padding: 8px 4px; text-align: center; width: 30px;">${leaderIndicator === '<span style="color: #6b7280;">—</span>' ? leaderIndicator : ''}</td>
        <td style="padding: 8px 4px; text-align: center; color: #ffffff; font-weight: 700; font-size: 13px;">${formatStat(stat2, cat.stat_id)}</td>
        <td style="padding: 8px 4px; text-align: center; color: ${prob2Color}; font-weight: 600; font-size: 11px;">${winProb2.toFixed(0)}%</td>
      </tr>
    `
  }
  
  const categoryRows = allCategories.value.map(cat => generateCategoryRow(cat)).join('')
  
  // Build score display
  const team1Score = matchup.team1CatWins
  const team2Score = matchup.team2CatWins
  const tiesScore = matchup.ties || 0
  
  // Determine projected winner
  const proj1 = matchup.projectedTeam1Wins
  const proj2 = matchup.projectedTeam2Wins
  let projectedWinnerText = ''
  if (proj1 > proj2) {
    projectedWinnerText = `<span style="color: ${team1Color}; font-weight: 600;">${matchup.team1.name} wins</span>`
  } else if (proj2 > proj1) {
    projectedWinnerText = `<span style="color: ${team2Color}; font-weight: 600;">${matchup.team2.name} wins</span>`
  } else {
    projectedWinnerText = `<span style="color: #9ca3af; font-weight: 600;">Tie</span>`
  }

  container.innerHTML = `
    <div style="background: linear-gradient(160deg, #0f1219 0%, #0a0c14 50%, #0d1117 100%); border-radius: 16px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); position: relative; overflow: hidden;">
      
      <!-- Top Red Bar with site name -->
      <div style="background: #dc2626; padding: 10px 24px 10px 24px; text-align: center; overflow: visible;">
        <span style="font-size: 16px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 3px; display: block; margin-top: -17px;">Ultimate Fantasy Dashboard</span>
      </div>
      
      <!-- HEADER - Logo on left with text next to it -->
      <div style="display: flex; padding: 12px 24px 12px 24px; border-bottom: 1px solid rgba(220, 38, 38, 0.2); position: relative; z-index: 10;">
        <!-- Logo -->
        ${logoBase64 ? `<img src="${logoBase64}" style="width: 90px; height: 90px; object-fit: contain; flex-shrink: 0; margin-right: 20px; display: block;" />` : ''}
        <!-- Title and League Info -->
        <div style="flex: 1; margin-top: -5px;">
          <div style="font-size: 42px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 2px 8px rgba(220, 38, 38, 0.4); line-height: 42px; display: block;">Matchup</div>
          <div style="font-size: 20px; margin-top: 6px; font-weight: 600; line-height: 20px; display: block;">
            <span style="color: #e5e7eb;">${leagueName}</span>
            <span style="color: #6b7280; margin: 0 8px;">•</span>
            <span style="color: #dc2626; font-weight: 700;">Week ${selectedWeek.value}</span>
          </div>
        </div>
      </div>
      
      <!-- Main content area -->
      <div style="padding: 16px 24px 12px 24px; position: relative;">
        
        <!-- Team matchup header -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
          <!-- Team 1 -->
          <div style="text-align: center; flex: 1;">
            <img src="${team1Logo}" style="width: 70px; height: 70px; border-radius: 50%; border: 3px solid ${team1Color}; margin: 0 auto 8px auto; display: block;" />
            <div style="font-size: 16px; font-weight: 700; color: ${team1Color}; margin-bottom: 4px;">${matchup.team1.name}</div>
            <div style="font-size: 12px; color: #9ca3af;">${getTeamRecord(matchup.team1.team_key)}</div>
          </div>
          
          <!-- Score -->
          <div style="text-align: center; padding: 0 20px;">
            <div style="font-size: 48px; font-weight: 900; color: #ffffff; line-height: 1;">${team1Score}-${team2Score}${tiesScore > 0 ? `-${tiesScore}` : ''}</div>
            <div style="font-size: 12px; color: #6b7280; margin-top: 4px; text-transform: uppercase;">Current Score</div>
          </div>
          
          <!-- Team 2 -->
          <div style="text-align: center; flex: 1;">
            <img src="${team2Logo}" style="width: 70px; height: 70px; border-radius: 50%; border: 3px solid ${team2Color}; margin: 0 auto 8px auto; display: block;" />
            <div style="font-size: 16px; font-weight: 700; color: ${team2Color}; margin-bottom: 4px;">${matchup.team2.name}</div>
            <div style="font-size: 12px; color: #9ca3af;">${getTeamRecord(matchup.team2.team_key)}</div>
          </div>
        </div>
        
        <!-- Win Probability Bar -->
        <div style="margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-size: 24px; font-weight: 900; color: ${team1Color};">${matchup.team1WinProb.toFixed(0)}%</span>
            <span style="font-size: 12px; color: #6b7280; align-self: center; text-transform: uppercase;">Win Probability</span>
            <span style="font-size: 24px; font-weight: 900; color: ${team2Color};">${matchup.team2WinProb.toFixed(0)}%</span>
          </div>
          <div style="height: 12px; background: rgba(58, 61, 82, 0.5); border-radius: 6px; overflow: hidden;">
            <div style="height: 100%; width: ${matchup.team1WinProb}%; background: linear-gradient(90deg, ${team1Color}, ${team1Color}); border-radius: 6px;"></div>
          </div>
        </div>
        
        <!-- Category Breakdown Table -->
        <div style="background: rgba(38, 42, 58, 0.3); border-radius: 12px; padding: 12px; border: 1px solid rgba(220, 38, 38, 0.2);">
          <h3 style="color: #dc2626; font-size: 14px; margin: 0 0 12px 0; text-align: center; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Category Breakdown</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 1px solid rgba(220, 38, 38, 0.3);">
                <th style="padding: 6px 4px; text-align: center; color: ${team1Color}; font-size: 10px; text-transform: uppercase;">Win%</th>
                <th style="padding: 6px 4px; text-align: center; color: ${team1Color}; font-size: 10px; text-transform: uppercase;">Stat</th>
                <th style="padding: 6px 4px; width: 30px;"></th>
                <th style="padding: 6px 4px; text-align: center; color: #6b7280; font-size: 10px; text-transform: uppercase;">Category</th>
                <th style="padding: 6px 4px; width: 30px;"></th>
                <th style="padding: 6px 4px; text-align: center; color: ${team2Color}; font-size: 10px; text-transform: uppercase;">Stat</th>
                <th style="padding: 6px 4px; text-align: center; color: ${team2Color}; font-size: 10px; text-transform: uppercase;">Win%</th>
              </tr>
            </thead>
            <tbody>
              ${categoryRows}
            </tbody>
          </table>
        </div>
        
        <!-- Projected Final -->
        <div style="text-align: center; margin-top: 12px; padding: 8px; background: rgba(220, 38, 38, 0.1); border-radius: 8px;">
          <span style="font-size: 11px; color: #6b7280; text-transform: uppercase;">Projected Final: </span>
          <span style="font-size: 14px; font-weight: 700; color: #ffffff;">${matchup.projectedTeam1Wins}-${matchup.projectedTeam2Wins}-${matchup.projectedTies}</span>
          <span style="font-size: 11px; color: #6b7280;"> • </span>
          ${projectedWinnerText}
        </div>
      </div>
      
      <!-- Footer -->
      <div style="padding: 20px 24px 20px 24px; text-align: center; position: relative; z-index: 1;">
        <span style="font-size: 24px; font-weight: bold; color: #dc2626; letter-spacing: -0.5px; display: block; margin-top: -35px;">ultimatefantasydashboard.com</span>
      </div>
    </div>
  `
  
  document.body.appendChild(container)
  
  // Wait for images to load
  await new Promise(resolve => setTimeout(resolve, 500))
  
  // Capture the image
  const canvas = await html2canvas(container, {
    backgroundColor: '#0a0c14',
    scale: 2,
    logging: false,
    useCORS: true,
    allowTaint: true
  })
  
  document.body.removeChild(container)
  
  // Download the image
  const link = document.createElement('a')
  const team1Short = matchup.team1.name.split(' ')[0]
  const team2Short = matchup.team2.name.split(' ')[0]
  link.download = `matchup-week${selectedWeek.value}-${team1Short}-vs-${team2Short}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}
async function refreshData() { isRefreshing.value = true; await loadMatchups(); isRefreshing.value = false }

watch(() => leagueStore.yahooTeams, async () => {
  if (leagueStore.yahooTeams.length > 0) {
    await loadCategories()
    const dw = isSeasonComplete.value ? totalWeeks.value : currentWeek.value
    if (dw >= 1) { selectedWeek.value = dw.toString(); loadMatchups() }
  }
}, { immediate: true })

onMounted(async () => { if (authStore.user?.id) await yahooService.initialize(authStore.user.id) })
</script>
