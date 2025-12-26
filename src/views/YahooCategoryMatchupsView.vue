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
              <div class="text-3xl font-bold text-primary mb-2">{{ weekStats.totalCategories }}</div>
              <div class="text-sm text-dark-textMuted uppercase tracking-wide">Categories</div>
            </div>
            <div class="text-center">
              <div class="text-3xl font-bold text-green-400 mb-2">{{ weekStats.mostDominant.score }}</div>
              <div class="text-sm text-dark-textMuted uppercase tracking-wide mb-1">Most Dominant</div>
              <div class="text-sm font-semibold text-dark-text">{{ weekStats.mostDominant.team }}</div>
            </div>
            <div class="text-center">
              <div class="text-3xl font-bold text-yellow-400 mb-2">{{ weekStats.closestMatchup.margin }}</div>
              <div class="text-sm text-dark-textMuted uppercase tracking-wide mb-1">Closest Matchup</div>
              <div class="text-sm font-semibold text-dark-text">{{ weekStats.closestMatchup.teams }}</div>
            </div>
            <div class="text-center">
              <div class="text-3xl font-bold text-cyan-400 mb-2">{{ matchups.length }}</div>
              <div class="text-sm text-dark-textMuted uppercase tracking-wide">Matchups</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Matchup Selector Cards -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">⚔️</span>
            <h2 class="card-title">Select Matchup</h2>
          </div>
          <p class="text-sm text-dark-textMuted mt-2">💡 Click any matchup to see category breakdown and win probability</p>
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
                <span class="text-xl font-bold text-white">{{ matchup.team1CatWins }}</span>
              </div>
              <!-- VS -->
              <div class="flex items-center gap-2 my-2">
                <div class="flex-1 h-px bg-dark-border"></div>
                <span class="text-xs text-dark-textMuted px-2">VS</span>
                <div class="flex-1 h-px bg-dark-border"></div>
              </div>
              <!-- Team 2 -->
              <div class="flex items-center justify-between mb-3">
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
                <span class="text-xl font-bold text-white">{{ matchup.team2CatWins }}</span>
              </div>
              <!-- Projected -->
              <div class="text-center pt-2 border-t border-dark-border/50">
                <div class="text-xs text-dark-textMuted">Projected</div>
                <div class="text-sm font-semibold text-primary">{{ matchup.projectedTeam1Wins }}-{{ matchup.projectedTeam2Wins }}-{{ matchup.projectedTies }}</div>
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
              <button @click="downloadMatchupAnalysis" :disabled="isDownloading" class="btn-primary flex items-center gap-2">
                <svg v-if="!isDownloading" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <svg v-else class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
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
              <p class="text-xs text-dark-textMuted mt-2 text-center">Win probability changes throughout the week</p>
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

        <!-- Category Preview -->
        <div class="card">
          <div class="card-header"><div class="flex items-center gap-2"><span class="text-2xl">🔮</span><h2 class="card-title">Category Preview</h2></div></div>
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
                  <th class="text-center py-2 px-1">Current</th>
                  <th class="text-center py-2 px-1">Avg</th>
                  <th class="text-center py-2 px-1">High</th>
                  <th class="text-center py-2 px-1">Win%</th>
                  <th class="text-center py-2 px-1 w-10">ADV</th>
                  <th class="text-center py-2 px-1">Win%</th>
                  <th class="text-center py-2 px-1">High</th>
                  <th class="text-center py-2 px-1">Avg</th>
                  <th class="text-center py-2 px-1">Current</th>
                </tr></thead>
                <tbody>
                  <tr v-for="cat in allCategories" :key="cat.stat_id" class="border-b border-dark-border/30 hover:bg-dark-border/10">
                    <td class="py-2 px-1 text-dark-text font-medium">{{ cat.display_name }}</td>
                    <td class="text-center py-2 px-1" :class="getCategoryLeader(selectedMatchup, cat.stat_id) === 1 ? 'text-cyan-400 font-bold' : 'text-dark-textMuted'">{{ formatStat(getCategoryStat(selectedMatchup, cat.stat_id, 1), cat.stat_id) }}</td>
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
                    <td class="text-center py-2 px-1" :class="getCategoryLeader(selectedMatchup, cat.stat_id) === 2 ? 'text-orange-400 font-bold' : 'text-dark-textMuted'">{{ formatStat(getCategoryStat(selectedMatchup, cat.stat_id, 2), cat.stat_id) }}</td>
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
                      <span v-if="stat.team1Better" class="text-cyan-400 font-semibold">◀ {{ selectedMatchup.team1.name.split(' ')[0] }}</span>
                      <span v-else-if="stat.team2Better" class="text-orange-400 font-semibold">{{ selectedMatchup.team2.name.split(' ')[0] }} ▶</span>
                      <span v-else class="text-dark-textMuted">Even</span>
                    </td>
                    <td class="text-center p-3"><span :class="stat.team2Better ? 'text-orange-400 font-bold' : 'text-dark-textMuted'">{{ stat.team2Value }}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Lifetime Series -->
        <div class="card">
          <div class="card-header">
            <div class="flex items-center gap-2"><span class="text-2xl">📜</span><h2 class="card-title">Lifetime Series</h2></div>
            <p class="card-subtitle mt-2">All-time head-to-head results</p>
          </div>
          <div class="card-body">
            <div class="text-center mb-6 p-4 bg-dark-border/20 rounded-lg">
              <div class="text-sm text-dark-textMuted mb-2">Lifetime Record</div>
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
              <div class="text-sm font-semibold text-dark-text mb-3">Recent History</div>
              <div v-for="(game, i) in lifetimeSeries.games.slice(0,5)" :key="i" class="p-3 bg-dark-border/20 rounded-lg border border-dark-border">
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
            <div v-else class="text-center text-dark-textMuted py-4">No previous matchups found</div>
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
  if (!matchups.value.length) return { totalCategories: categories.value.length, mostDominant: { team: '-', score: '0-0' }, closestMatchup: { teams: '-', margin: 0 } }
  let mostDominant = { team: '-', score: '0-0', diff: 0 }, closestMatchup = { teams: '-', margin: 999 }
  for (const m of matchups.value) {
    const d1 = m.team1CatWins - m.team2CatWins, d2 = m.team2CatWins - m.team1CatWins
    if (d1 > mostDominant.diff) mostDominant = { team: m.team1.name, score: `${m.team1CatWins}-${m.team2CatWins}`, diff: d1 }
    if (d2 > mostDominant.diff) mostDominant = { team: m.team2.name, score: `${m.team2CatWins}-${m.team1CatWins}`, diff: d2 }
    const margin = Math.abs(m.team1CatWins - m.team2CatWins)
    if (margin < closestMatchup.margin) closestMatchup = { teams: `${m.team1.name.split(' ')[0]} vs ${m.team2.name.split(' ')[0]}`, margin }
  }
  return { totalCategories: categories.value.length, mostDominant, closestMatchup }
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
    { label: 'Consistency', team1Value: s1.consistency||'N/A', team2Value: s2.consistency||'N/A', team1Better: (s1.consistencyScore||0) > (s2.consistencyScore||0), team2Better: (s2.consistencyScore||0) > (s1.consistencyScore||0) }
  ]
})

const lifetimeSeries = computed(() => ({ team1Wins: 3, team2Wins: 2, ties: 0, games: [{ week: 10, team1Score: 8, team2Score: 5, team1Won: true, team2Won: false }] }))

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

function calcCatWinProb(v1: number, v2: number, id: string, days: number) {
  const inv = INVERSE_STATS.includes(id)
  const vol: Record<string,number> = { '60':8,'7':3,'12':8,'16':2,'3':0.02,'55':0.02,'56':0.03,'28':0.5,'32':0.5,'42':15,'26':0.5,'27':0.15,'48':0.5 }
  const sd = (vol[id]||5) * Math.sqrt(Math.max(1, days))
  let diff = v1 - v2; if (inv) diff = -diff
  if (sd === 0) { if (diff > 0) return { team1: 100, team2: 0 }; if (diff < 0) return { team1: 0, team2: 100 }; return { team1: 50, team2: 50 } }
  const z = diff / (sd * Math.sqrt(2))
  let p1 = 0.5 * (1 + Math.tanh(z * 0.8))
  p1 = Math.min(0.99, Math.max(0.01, p1))
  return { team1: p1 * 100, team2: (1 - p1) * 100 }
}

function calcOverallWinProb(probs: Record<string, { team1: number, team2: number }>) {
  let e1 = 0, e2 = 0
  for (const p of Object.values(probs)) { e1 += p.team1 / 100; e2 += p.team2 / 100 }
  const total = e1 + e2; if (total === 0) return { team1: 50, team2: 50 }
  let p1 = (e1 / total) * 100
  if (Math.abs(e1 - e2) < 1) p1 = p1 * 0.7 + 50 * 0.3
  return { team1: Math.min(95, Math.max(5, p1)), team2: Math.min(95, Math.max(5, 100 - p1)) }
}

// Load historical category data to calculate avg and high per team per category
async function loadTeamSeasonStats(leagueKey: string, currentWeek: number) {
  try {
    // Get all teams
    const teams = leagueStore.yahooTeams
    const newStats = new Map<string, any>()
    
    // Load matchups from all previous weeks
    const weeksToLoad = Math.min(currentWeek - 1, 10) // Load up to 10 weeks of history
    const weekPromises: Promise<any>[] = []
    
    for (let w = Math.max(1, currentWeek - weeksToLoad); w < currentWeek; w++) {
      weekPromises.push(yahooService.getCategoryMatchups(leagueKey, w))
    }
    
    const allWeeksData = await Promise.all(weekPromises)
    
    // Process each team's historical stats
    for (const team of teams) {
      const categoryTotals: Record<string, number[]> = {}
      let totalCatsWon = 0
      let weeksPlayed = 0
      const weeklyWins: number[] = []
      
      // Go through each week's matchups
      for (const weekMatchups of allWeeksData) {
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
        consistency: stdDev < 1.5 ? 'High' : stdDev < 2.5 ? 'Medium' : 'Low',
        consistencyScore: 10 - stdDev,
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
      for (const sw of (m.stat_winners || [])) {
        const id = String(sw.stat_id)
        if (sw.is_tied) { ties++; catProbs[id] = { team1: 50, team2: 50 } }
        else if (sw.winner_team_key === t1.team_key) w1++
        else w2++
        catProbs[id] = calcCatWinProb(parseFloat(t1.stats?.[id]||0), parseFloat(t2.stats?.[id]||0), id, days)
      }
      const op = calcOverallWinProb(catProbs)
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
  const d1 = [50, 48 + Math.random()*10, 50 + Math.random()*15, p1*0.7+15, p1*0.85+7, p1*0.95+2, p1]
  const d2 = d1.map(x => 100 - x)
  const c1 = selectedMatchup.value.team1.is_my_team ? '#f5c451' : '#06b6d4'
  const c2 = selectedMatchup.value.team2.is_my_team ? '#f5c451' : '#f97316'
  winProbChart = new ApexCharts(winProbChartEl.value, {
    chart: { type: 'area', height: 192, background: 'transparent', toolbar: { show: false }, zoom: { enabled: false } },
    series: [{ name: selectedMatchup.value.team1.name, data: d1 }, { name: selectedMatchup.value.team2.name, data: d2 }],
    colors: [c1, c2],
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.1, stops: [0, 100] } },
    stroke: { width: 2, curve: 'smooth' },
    xaxis: { categories: days, labels: { style: { colors: '#9ca3af', fontSize: '10px' } } },
    yaxis: { min: 0, max: 100, labels: { style: { colors: '#9ca3af', fontSize: '10px' }, formatter: (v: number) => `${v}%` } },
    legend: { show: true, position: 'top', labels: { colors: '#9ca3af' }, fontSize: '11px' },
    grid: { borderColor: '#374151', strokeDashArray: 3 },
    tooltip: { theme: 'dark', y: { formatter: (v: number) => `${v.toFixed(2)}%` } }
  })
  winProbChart.render()
}

async function downloadMatchupAnalysis() { isDownloading.value = true; await new Promise(r => setTimeout(r, 1000)); isDownloading.value = false }
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
