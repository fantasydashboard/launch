<template>
  <div class="space-y-6">
    <!-- Header with Controls -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="text-3xl font-bold text-dark-text mb-2">Matchups</h1>
        <p class="text-base text-dark-textMuted">
          Head-to-head battles with deep analysis and win probability
        </p>
      </div>
      <div class="flex items-center gap-3">
        <button 
          @click="downloadAllMatchups" 
          :disabled="isDownloadingAll || matchups.length === 0"
          class="btn-secondary flex items-center gap-2"
        >
          <svg v-if="!isDownloadingAll" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ isDownloadingAll ? `Downloading ${downloadProgress}` : 'Download All' }}
        </button>
        <button 
          @click="refreshData" 
          :disabled="isRefreshing"
          class="btn-secondary flex items-center gap-2"
        >
          <svg 
            class="w-4 h-4" 
            :class="{ 'animate-spin': isRefreshing }" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {{ isRefreshing ? 'Refreshing...' : 'Refresh' }}
        </button>
        <select v-model="selectedWeek" @change="loadMatchups" class="select">
          <option value="">Select Week...</option>
          <option v-for="week in availableWeeks" :key="week" :value="week">
            Week {{ week }}
          </option>
        </select>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-primary"></div>
    </div>

    <template v-else-if="matchups.length > 0">
      <!-- Week Summary Stats -->
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
              <div class="text-3xl font-bold text-primary mb-2">
                {{ weekStats.highest_score.toFixed(1) }}
              </div>
              <div class="text-sm text-dark-textMuted uppercase tracking-wide mb-1">Highest Score</div>
              <div class="text-sm font-semibold text-dark-text">{{ weekStats.highest_scorer }}</div>
            </div>
            <div class="text-center">
              <div class="text-3xl font-bold text-red-400 mb-2">
                {{ weekStats.lowest_score.toFixed(1) }}
              </div>
              <div class="text-sm text-dark-textMuted uppercase tracking-wide mb-1">Lowest Score</div>
              <div class="text-sm font-semibold text-dark-text">{{ weekStats.lowest_scorer }}</div>
            </div>
            <div class="text-center">
              <div class="text-3xl font-bold text-green-400 mb-2">
                {{ weekStats.closest_matchup.toFixed(1) }}
              </div>
              <div class="text-sm text-dark-textMuted uppercase tracking-wide mb-1">Closest Game</div>
              <div class="text-sm font-semibold text-dark-text">{{ weekStats.closest_teams }}</div>
            </div>
            <div class="text-center">
              <div class="text-3xl font-bold text-cyan-400 mb-2">
                {{ weekStats.avg_score.toFixed(1) }}
              </div>
              <div class="text-sm text-dark-textMuted uppercase tracking-wide mb-1">League Average</div>
              <div class="text-sm font-semibold text-dark-text">All Teams</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Matchup Selector -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">⚔️</span>
            <h2 class="card-title">Select Matchup to Analyze</h2>
          </div>
          <p class="text-sm text-dark-textMuted mt-2">
            💡 Click any matchup to see head-to-head history, win probability, and detailed analysis
          </p>
        </div>
        <div class="card-body">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              v-for="matchup in matchups"
              :key="matchup.matchup_id"
              @click="selectMatchup(matchup)"
              :class="[
                'p-4 rounded-xl border-2 transition-all text-left',
                selectedMatchup?.matchup_id === matchup.matchup_id
                  ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                  : 'border-dark-border bg-dark-card hover:border-primary/50 hover:bg-dark-border/30'
              ]"
            >
              <!-- Status Badge -->
              <div class="flex items-center justify-between mb-4">
                <span class="text-xs font-semibold text-dark-textMuted uppercase tracking-wide">Matchup {{ matchup.matchup_id }}</span>
                <span :class="getMatchupStatusClass(matchup)" class="text-xs px-2.5 py-1 rounded-full border font-medium flex items-center gap-1">
                  <span v-if="matchup.status === 'live'" class="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                  {{ matchup.status === 'final' ? 'Final' : matchup.status === 'live' ? 'Live' : 'Upcoming' }}
                </span>
              </div>
              
              <!-- Team 1 -->
              <div class="space-y-1.5 mb-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2.5 flex-1 min-w-0">
                    <div class="relative">
                      <img 
                        :src="matchup.team1.logo_url || defaultAvatar" 
                        :alt="matchup.team1.name" 
                        :class="['w-9 h-9 rounded-full ring-2', matchup.team1_won ? 'ring-green-500' : 'ring-dark-border']"
                        @error="handleImageError" 
                      />
                      <div v-if="matchup.team1.is_my_team" class="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                        <span class="text-[10px]">★</span>
                      </div>
                    </div>
                    <span :class="['text-sm font-semibold truncate', matchup.team1_won ? 'text-green-400' : 'text-dark-text']">
                      {{ matchup.team1.name }}
                    </span>
                  </div>
                  <div class="text-right flex-shrink-0 ml-2">
                    <span class="text-lg font-bold text-white">{{ matchup.team1.points.toFixed(1) }}</span>
                    <div v-if="matchup.team1.projected_points" class="text-xs text-primary">
                      proj {{ matchup.team1.projected_points.toFixed(1) }}
                    </div>
                  </div>
                </div>
                <div class="text-xs text-dark-textMuted pl-11">
                  {{ getTeamRecord(matchup.team1.team_key) }}
                </div>
              </div>
              
              <!-- VS Divider -->
              <div class="flex items-center gap-2 my-2">
                <div class="flex-1 h-px bg-dark-border"></div>
                <span class="text-xs font-medium text-dark-textMuted px-2">VS</span>
                <div class="flex-1 h-px bg-dark-border"></div>
              </div>
              
              <!-- Team 2 -->
              <div class="space-y-1.5">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2.5 flex-1 min-w-0">
                    <div class="relative">
                      <img 
                        :src="matchup.team2.logo_url || defaultAvatar" 
                        :alt="matchup.team2.name" 
                        :class="['w-9 h-9 rounded-full ring-2', matchup.team2_won ? 'ring-green-500' : 'ring-dark-border']"
                        @error="handleImageError" 
                      />
                      <div v-if="matchup.team2.is_my_team" class="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                        <span class="text-[10px]">★</span>
                      </div>
                    </div>
                    <span :class="['text-sm font-semibold truncate', matchup.team2_won ? 'text-green-400' : 'text-dark-text']">
                      {{ matchup.team2.name }}
                    </span>
                  </div>
                  <div class="text-right flex-shrink-0 ml-2">
                    <span class="text-lg font-bold text-white">{{ matchup.team2.points.toFixed(1) }}</span>
                    <div v-if="matchup.team2.projected_points" class="text-xs text-primary">
                      proj {{ matchup.team2.projected_points.toFixed(1) }}
                    </div>
                  </div>
                </div>
                <div class="text-xs text-dark-textMuted pl-11">
                  {{ getTeamRecord(matchup.team2.team_key) }}
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- Selected Matchup Analysis -->
      <template v-if="selectedMatchup">
        <!-- Win Probability -->
        <div class="card">
          <div class="card-header">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-2xl">🎲</span>
                <h2 class="card-title">Win Probability</h2>
              </div>
              <button 
                @click="downloadWinProbability"
                :disabled="isDownloading"
                class="btn-primary flex items-center gap-2"
              >
                <svg v-if="!isDownloading" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <svg v-else class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ isDownloading ? 'Generating...' : 'Share' }}
              </button>
            </div>
            <p class="card-subtitle mt-2">Based on current scores and season performance</p>
          </div>
          <div class="card-body">
            <div ref="winProbRef" class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <!-- Team 1 Probability -->
              <div class="text-center p-6 rounded-xl border-2 bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/30">
                <div class="relative inline-block">
                  <img 
                    :src="selectedMatchup?.team1?.logo_url || defaultAvatar" 
                    :alt="selectedMatchup?.team1?.name || 'Team 1'" 
                    class="w-20 h-20 rounded-full mx-auto mb-3 border-4 border-cyan-500"
                    @error="handleImageError" 
                  />
                </div>
                <div class="font-bold text-xl mb-2 text-cyan-400">
                  {{ selectedMatchup?.team1?.name || 'Team 1' }}
                </div>
                <div class="text-5xl font-black mb-3 text-cyan-400">
                  {{ winProbability.team1.toFixed(1) }}%
                </div>
                <div class="space-y-1 text-sm">
                  <div class="text-white">Current: {{ (selectedMatchup?.team1?.points || 0).toFixed(1) }} pts</div>
                  <div v-if="selectedMatchup?.team1?.projected_points" class="text-cyan-400">
                    Projected: {{ selectedMatchup.team1.projected_points.toFixed(1) }}
                  </div>
                </div>
              </div>

              <!-- Team 2 Probability -->
              <div class="text-center p-6 rounded-xl border-2 bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/30">
                <div class="relative inline-block">
                  <img 
                    :src="selectedMatchup?.team2?.logo_url || defaultAvatar" 
                    :alt="selectedMatchup?.team2?.name || 'Team 2'" 
                    class="w-20 h-20 rounded-full mx-auto mb-3 border-4 border-orange-500"
                    @error="handleImageError" 
                  />
                </div>
                <div class="font-bold text-xl mb-2 text-orange-400">
                  {{ selectedMatchup?.team2?.name || 'Team 2' }}
                </div>
                <div class="text-5xl font-black mb-3 text-orange-400">
                  {{ winProbability.team2.toFixed(1) }}%
                </div>
                <div class="space-y-1 text-sm">
                  <div class="text-white">Current: {{ (selectedMatchup?.team2?.points || 0).toFixed(1) }} pts</div>
                  <div v-if="selectedMatchup?.team2?.projected_points" class="text-orange-400">
                    Projected: {{ selectedMatchup.team2.projected_points.toFixed(1) }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Probability Bar -->
            <div class="relative h-12 bg-dark-border/30 rounded-full overflow-hidden">
              <div 
                class="absolute inset-0 transition-all duration-500"
                :style="gradientBarStyle"
              ></div>
              <div class="absolute left-0 top-0 h-full flex items-center justify-start px-4 z-10">
                <span class="font-bold text-sm drop-shadow-md text-white">{{ selectedMatchup?.team1?.name || 'Team 1' }}</span>
              </div>
              <div class="absolute right-0 top-0 h-full flex items-center justify-end px-4 z-10">
                <span class="font-bold text-sm drop-shadow-md text-white">{{ selectedMatchup?.team2?.name || 'Team 2' }}</span>
              </div>
            </div>

            <!-- Win Probability Trend Chart -->
            <div class="mt-6">
              <div v-if="probabilityHistory.length > 0" class="h-52">
                <apexchart 
                  type="area" 
                  height="200" 
                  :options="probabilityChartOptions" 
                  :series="probabilityChartSeries" 
                />
              </div>
              <div v-else class="text-center py-8 text-dark-textMuted">
                <p>Win probability trend will show as the week progresses</p>
              </div>
              <div class="flex items-center justify-center gap-2 mt-1">
                <div v-if="hasRealSnapshots" class="flex items-center gap-1">
                  <span class="w-2 h-2 rounded-full bg-green-500"></span>
                  <span class="text-[10px] text-green-400">Real Data</span>
                </div>
                <div v-else class="flex items-center gap-1">
                  <span class="w-2 h-2 rounded-full bg-yellow-500"></span>
                  <span class="text-[10px] text-yellow-400">Simulated</span>
                </div>
                <span class="text-[10px] text-dark-textMuted">•</span>
                <span class="text-[10px] text-dark-textMuted">Win probability changes throughout the week based on game results</span>
              </div>
            </div>

            <!-- Game Status -->
            <div class="mt-4 p-4 bg-dark-border/30 rounded-lg">
              <div class="flex items-start gap-3">
                <span class="text-2xl">🎯</span>
                <div class="flex-1">
                  <div class="font-semibold text-dark-text mb-1">Matchup Status</div>
                  <p class="text-dark-textMuted">{{ getMatchupStatusText() }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Scouting Reports -->
        <div class="card">
          <div class="card-header">
            <div class="flex items-center gap-2">
              <span class="text-2xl">🔍</span>
              <h2 class="card-title">Scouting Reports</h2>
            </div>
          </div>
          <div class="card-body">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Team 1 Report -->
              <div class="p-4 rounded-xl border bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/30">
                <div class="flex items-center gap-3 mb-4">
                  <img 
                    :src="selectedMatchup?.team1?.logo_url || defaultAvatar" 
                    :alt="selectedMatchup?.team1?.name || 'Team 1'"
                    class="w-10 h-10 rounded-full"
                    @error="handleImageError"
                  />
                  <div>
                    <div class="font-bold text-dark-text">{{ selectedMatchup?.team1?.name || 'Team 1' }}</div>
                    <div class="text-xs text-dark-textMuted">{{ getTeamRecord(selectedMatchup?.team1?.team_key) }}</div>
                  </div>
                </div>
                
                <div class="space-y-3">
                  <div>
                    <div class="text-xs font-semibold text-green-400 uppercase mb-1">💪 Strengths</div>
                    <ul class="text-sm text-dark-textMuted space-y-1">
                      <li v-for="(strength, idx) in scoutingReports.team1.strengths" :key="idx">• {{ strength }}</li>
                    </ul>
                  </div>
                  <div>
                    <div class="text-xs font-semibold text-red-400 uppercase mb-1">⚠️ Weaknesses</div>
                    <ul class="text-sm text-dark-textMuted space-y-1">
                      <li v-for="(weakness, idx) in scoutingReports.team1.weaknesses" :key="idx">• {{ weakness }}</li>
                    </ul>
                  </div>
                  <div>
                    <div class="text-xs font-semibold text-blue-400 uppercase mb-1">📈 Recent Form</div>
                    <div class="flex gap-1">
                      <span 
                        v-for="(result, idx) in scoutingReports.team1.recentForm" 
                        :key="idx"
                        :class="['w-6 h-6 rounded flex items-center justify-center text-xs font-bold', result === 'W' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400']"
                      >
                        {{ result }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Team 2 Report -->
              <div class="p-4 rounded-xl border bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/30">
                <div class="flex items-center gap-3 mb-4">
                  <img 
                    :src="selectedMatchup?.team2?.logo_url || defaultAvatar" 
                    :alt="selectedMatchup?.team2?.name || 'Team 2'"
                    class="w-10 h-10 rounded-full"
                    @error="handleImageError"
                  />
                  <div>
                    <div class="font-bold text-dark-text">{{ selectedMatchup?.team2?.name || 'Team 2' }}</div>
                    <div class="text-xs text-dark-textMuted">{{ getTeamRecord(selectedMatchup?.team2?.team_key) }}</div>
                  </div>
                </div>
                
                <div class="space-y-3">
                  <div>
                    <div class="text-xs font-semibold text-green-400 uppercase mb-1">💪 Strengths</div>
                    <ul class="text-sm text-dark-textMuted space-y-1">
                      <li v-for="(strength, idx) in scoutingReports.team2.strengths" :key="idx">• {{ strength }}</li>
                    </ul>
                  </div>
                  <div>
                    <div class="text-xs font-semibold text-red-400 uppercase mb-1">⚠️ Weaknesses</div>
                    <ul class="text-sm text-dark-textMuted space-y-1">
                      <li v-for="(weakness, idx) in scoutingReports.team2.weaknesses" :key="idx">• {{ weakness }}</li>
                    </ul>
                  </div>
                  <div>
                    <div class="text-xs font-semibold text-blue-400 uppercase mb-1">📈 Recent Form</div>
                    <div class="flex gap-1">
                      <span 
                        v-for="(result, idx) in scoutingReports.team2.recentForm" 
                        :key="idx"
                        :class="['w-6 h-6 rounded flex items-center justify-center text-xs font-bold', result === 'W' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400']"
                      >
                        {{ result }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Statistical Comparison -->
        <div class="card">
          <div class="card-header flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-2xl">📊</span>
              <h2 class="card-title">Statistical Comparison ({{ currentSeason }})</h2>
            </div>
            <button
              @click="downloadComparison"
              :disabled="isDownloadingComparison"
              class="btn-primary flex items-center gap-2 text-sm"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              {{ isDownloadingComparison ? 'Generating...' : 'Share' }}
            </button>
          </div>
          <div class="card-body">
            <div ref="comparisonRef" class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-dark-border bg-dark-border/30">
                    <th class="text-left p-3 text-dark-textMuted font-semibold">Statistic</th>
                    <th class="text-center p-3 font-semibold text-cyan-400">
                      {{ selectedMatchup?.team1?.name || 'Team 1' }}
                    </th>
                    <th class="text-center p-3 text-dark-textMuted font-semibold">Advantage</th>
                    <th class="text-center p-3 font-semibold text-orange-400">
                      {{ selectedMatchup?.team2?.name || 'Team 2' }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="stat in comparisonStats" :key="stat.label" class="border-b border-dark-border/50 hover:bg-dark-border/10">
                    <td class="p-3 text-dark-text font-medium">{{ stat.label }}</td>
                    <td class="text-center p-3">
                      <span :class="stat.team1Better ? 'text-cyan-400 font-bold' : 'text-dark-textMuted'">
                        {{ stat.team1Value }}
                      </span>
                    </td>
                    <td class="text-center p-3">
                      <div v-if="stat.team1Better" class="text-cyan-400 font-semibold">
                        ◀ {{ selectedMatchup?.team1?.name || 'Team 1' }}
                      </div>
                      <div v-else-if="stat.team2Better" class="text-orange-400 font-semibold">
                        {{ selectedMatchup?.team2?.name || 'Team 2' }} ▶
                      </div>
                      <div v-else class="text-dark-textMuted">Even</div>
                    </td>
                    <td class="text-center p-3">
                      <span :class="stat.team2Better ? 'text-orange-400 font-bold' : 'text-dark-textMuted'">
                        {{ stat.team2Value }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Lifetime Series -->
        <div class="card">
          <div class="card-header">
            <div class="flex items-center gap-2">
              <span class="text-2xl">📜</span>
              <h2 class="card-title">Lifetime Series</h2>
            </div>
            <p class="card-subtitle mt-2">All-time head-to-head results across all seasons</p>
          </div>
          <div class="card-body">
            <!-- Series Record -->
            <div class="text-center mb-6 p-4 bg-dark-border/20 rounded-lg">
              <div class="text-sm text-dark-textMuted mb-2">Lifetime Record</div>
              <div class="flex items-center justify-center gap-4">
                <div class="text-center">
                  <div class="text-3xl font-bold" :class="lifetimeSeries.team1Wins > lifetimeSeries.team2Wins ? 'text-green-400' : 'text-dark-textMuted'">
                    {{ lifetimeSeries.team1Wins }}
                  </div>
                  <div class="text-xs text-dark-textMuted">{{ selectedMatchup?.team1?.name || 'Team 1' }}</div>
                </div>
                <div class="text-2xl text-dark-textMuted">-</div>
                <div class="text-center">
                  <div class="text-3xl font-bold" :class="lifetimeSeries.team2Wins > lifetimeSeries.team1Wins ? 'text-green-400' : 'text-dark-textMuted'">
                    {{ lifetimeSeries.team2Wins }}
                  </div>
                  <div class="text-xs text-dark-textMuted">{{ selectedMatchup?.team2?.name || 'Team 2' }}</div>
                </div>
              </div>
              <div v-if="lifetimeSeries.ties > 0" class="text-xs text-dark-textMuted mt-2">
                {{ lifetimeSeries.ties }} tie(s)
              </div>
            </div>

            <!-- Recent Matchups -->
            <div v-if="lifetimeSeries.games.length > 0" class="space-y-3">
              <div class="text-sm font-semibold text-dark-text mb-3">Recent History</div>
              <div
                v-for="(game, idx) in lifetimeSeries.games.slice(0, 5)"
                :key="idx"
                class="p-3 bg-dark-border/20 rounded-lg border border-dark-border"
              >
                <div class="flex items-center justify-between mb-2">
                  <div class="text-xs text-dark-textMuted">
                    <span class="font-semibold">{{ game.season }} Season</span>
                    <span class="mx-2">•</span>
                    <span>Week {{ game.week }}</span>
                  </div>
                  <div class="text-xs text-dark-textMuted">
                    Margin: {{ game.margin.toFixed(1) }}
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div class="text-sm" :class="game.team1Won ? 'text-green-400 font-bold' : 'text-dark-textMuted'">
                    {{ selectedMatchup?.team1?.name || 'Team 1' }}: {{ game.team1Score.toFixed(1) }}
                  </div>
                  <div class="text-sm text-right" :class="game.team2Won ? 'text-green-400 font-bold' : 'text-dark-textMuted'">
                    {{ selectedMatchup?.team2?.name || 'Team 2' }}: {{ game.team2Score.toFixed(1) }}
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="text-center py-6 text-dark-textMuted">
              No previous matchups between these teams
            </div>
          </div>
        </div>
      </template>
    </template>

    <div v-else class="card">
      <div class="card-body text-center py-12">
        <p class="text-dark-textMuted">Select a week to view matchups</p>
      </div>
    </div>

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
import { matchupSnapshotsService, type MatchupSnapshot } from '@/services/matchupSnapshots'
import html2canvas from 'html2canvas'

const leagueStore = useLeagueStore()
const authStore = useAuthStore()

const defaultAvatar = 'https://s.yimg.com/cv/apiv2/default/mlb/mlb_1_100.png'

// State
const selectedWeek = ref('')
const isLoading = ref(false)
const isRefreshing = ref(false)
const isDownloading = ref(false)
const isDownloadingComparison = ref(false)
const isDownloadingAll = ref(false)
const downloadProgress = ref('')
const matchupsData = ref<any[]>([])
const selectedMatchup = ref<any>(null)
const allMatchupsHistory = ref<Map<number, any[]>>(new Map())

// Snapshot state
const weekSnapshots = ref<Map<number, MatchupSnapshot[]>>(new Map())
const isSnapshotting = ref(false)

// Refs for download
const winProbRef = ref<HTMLElement | null>(null)
const comparisonRef = ref<HTMLElement | null>(null)

// Computed
const currentWeek = computed(() => leagueStore.currentLeague?.settings?.leg || 1)
const currentSeason = computed(() => leagueStore.currentLeague?.season || new Date().getFullYear().toString())

// Effective league key - use the actually loaded league (might be previous season)
const effectiveLeagueKey = computed(() => {
  if (leagueStore.currentLeague?.league_id) return leagueStore.currentLeague.league_id
  return leagueStore.activeLeagueId
})

const availableWeeks = computed(() => {
  const weeks = []
  for (let i = 1; i <= currentWeek.value; i++) {
    weeks.push(i)
  }
  return weeks
})

// Transform matchups for display
const matchups = computed(() => {
  return matchupsData.value.map(m => {
    const team1 = m.teams?.[0] || { name: 'Team 1', points: 0, logo_url: '', is_my_team: false, team_key: '' }
    const team2 = m.teams?.[1] || { name: 'Team 2', points: 0, logo_url: '', is_my_team: false, team_key: '' }
    const team1Points = team1.points || 0
    const team2Points = team2.points || 0
    
    return {
      matchup_id: m.matchup_id || 0,
      team1: { ...team1, points: team1Points, is_my_team: team1.is_my_team || false },
      team2: { ...team2, points: team2Points, is_my_team: team2.is_my_team || false },
      team1_won: team1Points > team2Points,
      team2_won: team2Points > team1Points,
      status: m.is_playoffs ? 'playoffs' : (parseInt(selectedWeek.value) < currentWeek.value ? 'final' : 'live'),
      is_playoffs: m.is_playoffs || false,
      is_consolation: m.is_consolation || false
    }
  })
})

// Week summary stats
const weekStats = computed(() => {
  if (matchups.value.length === 0) {
    return { highest_score: 0, highest_scorer: 'N/A', lowest_score: 0, lowest_scorer: 'N/A', closest_matchup: 0, closest_teams: 'N/A', avg_score: 0 }
  }
  
  let highest = { score: 0, name: '' }
  let lowest = { score: Infinity, name: '' }
  let closest = { margin: Infinity, teams: '' }
  let totalScore = 0
  let teamCount = 0
  
  matchups.value.forEach(m => {
    // Team 1
    if (m.team1.points > highest.score) {
      highest = { score: m.team1.points, name: m.team1.name }
    }
    if (m.team1.points < lowest.score && m.team1.points > 0) {
      lowest = { score: m.team1.points, name: m.team1.name }
    }
    totalScore += m.team1.points
    teamCount++
    
    // Team 2
    if (m.team2.points > highest.score) {
      highest = { score: m.team2.points, name: m.team2.name }
    }
    if (m.team2.points < lowest.score && m.team2.points > 0) {
      lowest = { score: m.team2.points, name: m.team2.name }
    }
    totalScore += m.team2.points
    teamCount++
    
    // Closest
    const margin = Math.abs(m.team1.points - m.team2.points)
    if (margin < closest.margin && margin > 0) {
      closest = { margin, teams: `${m.team1.name} vs ${m.team2.name}` }
    }
  })
  
  return {
    highest_score: highest.score,
    highest_scorer: highest.name,
    lowest_score: lowest.score === Infinity ? 0 : lowest.score,
    lowest_scorer: lowest.name || 'N/A',
    closest_matchup: closest.margin === Infinity ? 0 : closest.margin,
    closest_teams: closest.teams || 'N/A',
    avg_score: teamCount > 0 ? totalScore / teamCount : 0
  }
})

// Win probability calculation
const winProbability = computed(() => {
  if (!selectedMatchup.value?.team1 || !selectedMatchup.value?.team2) return { team1: 50, team2: 50 }
  
  const team1 = selectedMatchup.value.team1
  const team2 = selectedMatchup.value.team2
  
  // For completed weeks, use actual results
  if (selectedMatchup.value.status === 'final') {
    if ((team1.points || 0) > (team2.points || 0)) return { team1: 100, team2: 0 }
    if ((team2.points || 0) > (team1.points || 0)) return { team1: 0, team2: 100 }
    return { team1: 50, team2: 50 }
  }
  
  // For live weeks, calculate based on current + projected
  const team1Total = team1.projected_points || team1.points || 0
  const team2Total = team2.projected_points || team2.points || 0
  
  if (team1Total === 0 && team2Total === 0) return { team1: 50, team2: 50 }
  
  const total = team1Total + team2Total
  const team1Prob = (team1Total / total) * 100
  const team2Prob = (team2Total / total) * 100
  
  // Add some variance for uncertainty
  const adjustedTeam1 = Math.min(95, Math.max(5, team1Prob))
  const adjustedTeam2 = 100 - adjustedTeam1
  
  return { team1: adjustedTeam1, team2: adjustedTeam2 }
})

// Get snapshots for the currently selected matchup
const matchupSnapshots = computed(() => {
  if (!selectedMatchup.value) return []
  const matchupId = selectedMatchup.value.matchup_id
  return weekSnapshots.value.get(matchupId) || []
})

// Check if we have real snapshot data (not simulated)
const hasRealSnapshots = computed(() => matchupSnapshots.value.length > 0)

// Probability history for chart - uses REAL data when available, simulation otherwise
const probabilityHistory = computed(() => {
  if (!selectedMatchup.value?.team1 || !selectedMatchup.value?.team2) return []
  
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const matchup = selectedMatchup.value
  const isCompleted = matchup.status === 'final'
  const snapshots = matchupSnapshots.value
  
  // If we have real snapshot data, use it!
  if (snapshots.length > 0) {
    console.log(`Using ${snapshots.length} real snapshots for matchup ${matchup.matchup_id}`)
    
    const history = []
    
    for (let i = 0; i < 7; i++) {
      // Find snapshot for this day
      const snapshot = snapshots.find(s => s.day_of_week === i)
      
      if (snapshot) {
        // Use real data
        history.push({
          day: days[i],
          team1: snapshot.team1_win_prob,
          team2: snapshot.team2_win_prob,
          isFuture: false,
          isReal: true,
          points: {
            team1: snapshot.team1_points,
            team2: snapshot.team2_points
          }
        })
      } else {
        // No snapshot for this day yet - either future or missing
        const lastSnapshot = snapshots[snapshots.length - 1]
        const jsDay = new Date().getDay()
        const currentDayIndex = jsDay === 0 ? 6 : jsDay - 1
        
        if (i > currentDayIndex && !isCompleted) {
          // Future day - project from last known
          const lastProb = lastSnapshot?.team1_win_prob || 50
          history.push({
            day: days[i],
            team1: lastProb,
            team2: 100 - lastProb,
            isFuture: true,
            isReal: false
          })
        } else {
          // Missing historical day - interpolate or use placeholder
          history.push({
            day: days[i],
            team1: 50,
            team2: 50,
            isFuture: false,
            isReal: false
          })
        }
      }
    }
    
    return history
  }
  
  // No snapshots available - use simulation (for historical data before we started tracking)
  console.log(`Using simulated data for matchup ${matchup.matchup_id} (no snapshots found)`)
  
  // Get current day (0 = Sunday, 1 = Monday, etc.)
  const jsDay = new Date().getDay()
  // Convert to Monday-based index (Mon = 0, Sun = 6)
  const currentDayIndex = jsDay === 0 ? 6 : jsDay - 1
  
  // Get team scores
  const team1Score = matchup.team1.points || 0
  const team2Score = matchup.team2.points || 0
  const totalScore = team1Score + team2Score
  
  // Calculate current win probability based on actual scores
  let currentProb = 50
  if (totalScore > 0) {
    currentProb = (team1Score / totalScore) * 100
  }
  
  // For completed matchups, final day should be 100/0
  const finalTeam1Prob = isCompleted 
    ? (team1Score > team2Score ? 100 : (team1Score < team2Score ? 0 : 50))
    : currentProb
  
  const history = []
  
  for (let i = 0; i < 7; i++) {
    const dayProgress = (i + 1) / 7
    
    if (isCompleted) {
      // Completed week - simulate progression toward final result
      // Start at 50%, end at 100/0/50
      const team1Prob = 50 + (finalTeam1Prob - 50) * dayProgress
      
      // Add some variance for days 1-5 to make it look realistic
      const variance = i < 6 ? (Math.sin(i * 1.5) * 15 * (1 - dayProgress)) : 0
      const adjustedProb = i === 6 ? finalTeam1Prob : Math.min(95, Math.max(5, team1Prob + variance))
      
      history.push({
        day: days[i],
        team1: adjustedProb,
        team2: 100 - adjustedProb,
        isFuture: false,
        isReal: false
      })
    } else {
      // Live week
      if (i <= currentDayIndex) {
        // Past/current days - show progression from 50 to current
        const progressToNow = (i + 1) / (currentDayIndex + 1)
        const team1Prob = 50 + (currentProb - 50) * progressToNow
        
        // Add slight variance for past days
        const variance = i < currentDayIndex ? (Math.sin(i * 2) * 8) : 0
        const adjustedProb = Math.min(95, Math.max(5, team1Prob + variance))
        
        history.push({
          day: days[i],
          team1: adjustedProb,
          team2: 100 - adjustedProb,
          isFuture: false,
          isReal: false
        })
      } else {
        // Future days - project toward current trajectory
        // Assume current trend continues but with diminishing certainty
        const futureProgress = (i - currentDayIndex) / (6 - currentDayIndex)
        const projectedProb = currentProb + (currentProb - 50) * futureProgress * 0.3
        const adjustedProb = Math.min(90, Math.max(10, projectedProb))
        
        history.push({
          day: days[i],
          team1: adjustedProb,
          team2: 100 - adjustedProb,
          isFuture: true,
          isReal: false
        })
      }
    }
  }
  
  return history
})

// Probability chart options
const probabilityChartOptions = computed(() => ({
  chart: { 
    type: 'area', 
    toolbar: { show: false }, 
    background: 'transparent', 
    zoom: { enabled: false },
    animations: { enabled: true, speed: 500 }
  },
  stroke: { curve: 'smooth', width: 2, dashArray: [0, 0] },
  fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.1, stops: [0, 100] } },
  colors: ['#06b6d4', '#f97316'],
  xaxis: { 
    categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    labels: { style: { colors: '#8b8ea1' } },
    axisBorder: { show: false },
    axisTicks: { show: false }
  },
  yaxis: { min: 0, max: 100, labels: { style: { colors: '#8b8ea1' }, formatter: (v: number) => `${v.toFixed(0)}%` } },
  legend: { show: true, position: 'top', labels: { colors: '#8b8ea1' } },
  tooltip: { 
    theme: 'dark',
    y: { formatter: (v: number) => `${v}%` }
  },
  grid: { borderColor: '#374151', strokeDashArray: 3 },
  markers: {
    size: 4,
    strokeWidth: 0,
    hover: { size: 6 }
  }
}))

const probabilityChartSeries = computed(() => {
  if (!selectedMatchup.value?.team1 || !selectedMatchup.value?.team2) return []
  return [
    { name: selectedMatchup.value.team1.name || 'Team 1', data: probabilityHistory.value.map(h => h.team1.toFixed(1)) },
    { name: selectedMatchup.value.team2.name || 'Team 2', data: probabilityHistory.value.map(h => h.team2.toFixed(1)) }
  ]
})

// Gradient bar style - smooth transition in the middle
const gradientBarStyle = computed(() => {
  if (!selectedMatchup.value?.team1 || !selectedMatchup.value?.team2) return {}
  const team1Color = '#06b6d4'
  const team2Color = '#f97316'
  const team1Pct = winProbability.value.team1
  return {
    background: `linear-gradient(to right, ${team1Color} 0%, ${team1Color} ${Math.max(0, team1Pct - 10)}%, ${team2Color} ${Math.min(100, team1Pct + 10)}%, ${team2Color} 100%)`
  }
})

// Scouting reports
const scoutingReports = computed(() => {
  if (!selectedMatchup.value?.team1 || !selectedMatchup.value?.team2) {
    return { team1: { strengths: [], weaknesses: [], recentForm: [] }, team2: { strengths: [], weaknesses: [], recentForm: [] } }
  }
  
  const team1Stats = getTeamStats(selectedMatchup.value.team1.team_key)
  const team2Stats = getTeamStats(selectedMatchup.value.team2.team_key)
  
  return {
    team1: generateScoutingReport(team1Stats, team2Stats),
    team2: generateScoutingReport(team2Stats, team1Stats)
  }
})

// Comparison stats
const comparisonStats = computed(() => {
  if (!selectedMatchup.value?.team1?.team_key || !selectedMatchup.value?.team2?.team_key) return []
  
  const team1Stats = getTeamStats(selectedMatchup.value.team1.team_key)
  const team2Stats = getTeamStats(selectedMatchup.value.team2.team_key)
  
  const stats = [
    { label: 'Record', team1Value: `${team1Stats.wins}-${team1Stats.losses}`, team2Value: `${team2Stats.wins}-${team2Stats.losses}`, 
      team1Better: team1Stats.wins > team2Stats.wins, team2Better: team2Stats.wins > team1Stats.wins },
    { label: 'Points Per Week', team1Value: team1Stats.ppw.toFixed(1), team2Value: team2Stats.ppw.toFixed(1),
      team1Better: team1Stats.ppw > team2Stats.ppw, team2Better: team2Stats.ppw > team1Stats.ppw },
    { label: 'Total Points', team1Value: team1Stats.totalPoints.toFixed(1), team2Value: team2Stats.totalPoints.toFixed(1),
      team1Better: team1Stats.totalPoints > team2Stats.totalPoints, team2Better: team2Stats.totalPoints > team1Stats.totalPoints },
    { label: 'High Score', team1Value: team1Stats.highScore.toFixed(1), team2Value: team2Stats.highScore.toFixed(1),
      team1Better: team1Stats.highScore > team2Stats.highScore, team2Better: team2Stats.highScore > team1Stats.highScore },
    { label: 'Low Score', team1Value: team1Stats.lowScore.toFixed(1), team2Value: team2Stats.lowScore.toFixed(1),
      team1Better: team1Stats.lowScore > team2Stats.lowScore, team2Better: team2Stats.lowScore > team1Stats.lowScore },
    { label: 'All-Play Record', team1Value: `${team1Stats.allPlayWins}-${team1Stats.allPlayLosses}`, team2Value: `${team2Stats.allPlayWins}-${team2Stats.allPlayLosses}`,
      team1Better: team1Stats.allPlayWins > team2Stats.allPlayWins, team2Better: team2Stats.allPlayWins > team1Stats.allPlayWins },
    { label: 'Consistency (StdDev)', team1Value: team1Stats.stdDev.toFixed(1), team2Value: team2Stats.stdDev.toFixed(1),
      team1Better: team1Stats.stdDev < team2Stats.stdDev, team2Better: team2Stats.stdDev < team1Stats.stdDev },
    { label: 'Last 3 Weeks Avg', team1Value: team1Stats.last3Avg.toFixed(1), team2Value: team2Stats.last3Avg.toFixed(1),
      team1Better: team1Stats.last3Avg > team2Stats.last3Avg, team2Better: team2Stats.last3Avg > team1Stats.last3Avg }
  ]
  
  return stats
})

// Lifetime series
const lifetimeSeries = computed(() => {
  if (!selectedMatchup.value?.team1?.team_key || !selectedMatchup.value?.team2?.team_key) return { team1Wins: 0, team2Wins: 0, ties: 0, games: [] }
  
  const team1Key = selectedMatchup.value.team1.team_key
  const team2Key = selectedMatchup.value.team2.team_key
  
  let team1Wins = 0
  let team2Wins = 0
  let ties = 0
  const games: any[] = []
  
  // Search through all historical matchups
  for (const [week, weekMatchups] of allMatchupsHistory.value) {
    for (const matchup of weekMatchups) {
      const t1 = matchup.teams.find((t: any) => t.team_key === team1Key)
      const t2 = matchup.teams.find((t: any) => t.team_key === team2Key)
      
      if (t1 && t2) {
        const t1Points = t1.points || 0
        const t2Points = t2.points || 0
        
        if (t1Points > t2Points) team1Wins++
        else if (t2Points > t1Points) team2Wins++
        else ties++
        
        games.push({
          season: currentSeason.value,
          week,
          team1Score: t1Points,
          team2Score: t2Points,
          team1Won: t1Points > t2Points,
          team2Won: t2Points > t1Points,
          margin: Math.abs(t1Points - t2Points)
        })
      }
    }
  }
  
  // Sort games by week descending
  games.sort((a, b) => b.week - a.week)
  
  return { team1Wins, team2Wins, ties, games }
})

// Helper functions
function handleImageError(e: Event) {
  const img = e.target as HTMLImageElement
  img.src = defaultAvatar
}

function getTeamRecord(teamKey: string): string {
  const team = leagueStore.yahooTeams.find(t => t.team_key === teamKey)
  if (!team) return '0-0'
  return `${team.wins || 0}-${team.losses || 0}`
}

function getMatchupStatusClass(matchup: any): string {
  if (matchup.status === 'final') return 'bg-green-500/20 text-green-400 border-green-500/30'
  if (matchup.status === 'live') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
  return 'bg-dark-border text-dark-textMuted border-dark-border'
}

function getMatchupStatusText(): string {
  if (!selectedMatchup.value) return ''
  
  const team1 = selectedMatchup.value.team1
  const team2 = selectedMatchup.value.team2
  const diff = team1.points - team2.points
  
  if (selectedMatchup.value.status === 'final') {
    if (diff > 0) return `${team1.name} won by ${diff.toFixed(1)} points.`
    if (diff < 0) return `${team2.name} won by ${Math.abs(diff).toFixed(1)} points.`
    return 'The matchup ended in a tie.'
  }
  
  const projected1 = team1.projected_points || team1.points
  const projected2 = team2.projected_points || team2.points
  const projDiff = projected1 - projected2
  
  if (Math.abs(projDiff) < 10) {
    return 'This is projected to be a close matchup. Every point could matter!'
  }
  
  const favorite = projDiff > 0 ? team1.name : team2.name
  const underdog = projDiff > 0 ? team2.name : team1.name
  
  return `${favorite} is projected to win by ${Math.abs(projDiff).toFixed(1)} points. ${underdog} needs a big performance to pull off the upset.`
}

function getTeamStats(teamKey: string): any {
  const team = leagueStore.yahooTeams.find(t => t.team_key === teamKey)
  if (!team) {
    return { wins: 0, losses: 0, ppw: 0, totalPoints: 0, highScore: 0, lowScore: 0, allPlayWins: 0, allPlayLosses: 0, stdDev: 0, last3Avg: 0, recentResults: [] }
  }
  
  // Get all scores for this team from history
  const scores: number[] = []
  const results: string[] = []
  
  for (const [week, weekMatchups] of allMatchupsHistory.value) {
    for (const matchup of weekMatchups) {
      const myTeam = matchup.teams.find((t: any) => t.team_key === teamKey)
      const opponent = matchup.teams.find((t: any) => t.team_key !== teamKey)
      
      if (myTeam && opponent) {
        scores.push(myTeam.points || 0)
        if ((myTeam.points || 0) > (opponent.points || 0)) results.push('W')
        else if ((myTeam.points || 0) < (opponent.points || 0)) results.push('L')
        else results.push('T')
      }
    }
  }
  
  const totalPoints = scores.reduce((a, b) => a + b, 0)
  const ppw = scores.length > 0 ? totalPoints / scores.length : 0
  const highScore = scores.length > 0 ? Math.max(...scores) : 0
  const lowScore = scores.length > 0 ? Math.min(...scores) : 0
  
  // Standard deviation
  let stdDev = 0
  if (scores.length > 1) {
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - ppw, 2), 0) / scores.length
    stdDev = Math.sqrt(variance)
  }
  
  // Last 3 average
  const last3 = scores.slice(-3)
  const last3Avg = last3.length > 0 ? last3.reduce((a, b) => a + b, 0) / last3.length : 0
  
  return {
    wins: team.wins || 0,
    losses: team.losses || 0,
    ppw,
    totalPoints,
    highScore,
    lowScore,
    allPlayWins: 0, // Would need all-play calculation
    allPlayLosses: 0,
    stdDev,
    last3Avg,
    recentResults: results.slice(-5).reverse()
  }
}

function generateScoutingReport(teamStats: any, opponentStats: any): any {
  const strengths = []
  const weaknesses = []
  
  if (teamStats.ppw > opponentStats.ppw) strengths.push(`Higher scoring (${teamStats.ppw.toFixed(1)} PPW)`)
  else weaknesses.push(`Lower scoring (${teamStats.ppw.toFixed(1)} PPW)`)
  
  if (teamStats.stdDev < opponentStats.stdDev) strengths.push('More consistent week-to-week')
  else weaknesses.push('More volatile week-to-week')
  
  if (teamStats.highScore > opponentStats.highScore) strengths.push(`Higher ceiling (${teamStats.highScore.toFixed(0)} pts)`)
  
  if (teamStats.last3Avg > teamStats.ppw) strengths.push('Hot streak - trending up')
  else if (teamStats.last3Avg < teamStats.ppw * 0.9) weaknesses.push('Cold streak - trending down')
  
  if (teamStats.wins > teamStats.losses) strengths.push('Winning record')
  else if (teamStats.wins < teamStats.losses) weaknesses.push('Losing record')
  
  return {
    strengths: strengths.slice(0, 3),
    weaknesses: weaknesses.slice(0, 3),
    recentForm: teamStats.recentResults || []
  }
}

function selectMatchup(matchup: any) {
  // Make sure we have team1 and team2 with all required properties
  if (!matchup) {
    selectedMatchup.value = null
    return
  }
  
  // If this is a raw matchup from API, transform it
  if (matchup.teams && !matchup.team1) {
    const team1 = matchup.teams?.[0] || { name: 'Team 1', points: 0, logo_url: '', is_my_team: false, team_key: '' }
    const team2 = matchup.teams?.[1] || { name: 'Team 2', points: 0, logo_url: '', is_my_team: false, team_key: '' }
    
    selectedMatchup.value = {
      matchup_id: matchup.matchup_id || 0,
      team1: { ...team1, points: team1.points || 0, is_my_team: team1.is_my_team || false },
      team2: { ...team2, points: team2.points || 0, is_my_team: team2.is_my_team || false },
      status: matchup.is_playoffs ? 'playoffs' : (parseInt(selectedWeek.value) < currentWeek.value ? 'final' : 'live'),
      is_playoffs: matchup.is_playoffs || false,
      is_consolation: matchup.is_consolation || false
    }
  } else {
    // Already transformed
    selectedMatchup.value = matchup
  }
}

async function loadMatchups() {
  if (!selectedWeek.value) return
  
  isLoading.value = true
  
  try {
    const leagueKey = effectiveLeagueKey.value
    if (!leagueKey || !authStore.user?.id) {
      console.log('Missing leagueKey or userId:', { leagueKey, userId: authStore.user?.id })
      return
    }
    
    await yahooService.initialize(authStore.user.id)
    
    const week = parseInt(selectedWeek.value)
    console.log('Loading matchups for week:', week, 'league:', leagueKey)
    
    const matchups = await yahooService.getMatchups(leagueKey, week)
    console.log('Matchups received:', matchups.length, matchups)
    
    matchupsData.value = matchups
    
    // Also load history for lifetime series
    await loadMatchupHistory()
    
    // Auto-select first matchup or user's matchup
    if (matchups.length > 0) {
      const myMatchup = matchups.find((m: any) => 
        m.teams && Array.isArray(m.teams) && m.teams.some((t: any) => t?.is_my_team)
      )
      console.log('Selected matchup:', myMatchup || matchups[0])
      selectMatchup(myMatchup || matchups[0])
    } else {
      console.log('No matchups found')
    }
    
    // Load snapshots in background (non-blocking) - don't await
    loadSnapshotsInBackground(leagueKey, week, matchups)
    
  } catch (e) {
    console.error('Error loading matchups:', e)
  } finally {
    isLoading.value = false
  }
}

// Load snapshots in background without blocking page load
async function loadSnapshotsInBackground(leagueKey: string, week: number, matchups: any[]) {
  try {
    // Load existing snapshots for this week
    const snapshots = await matchupSnapshotsService.getWeekSnapshots(leagueKey, week, currentSeason.value)
    weekSnapshots.value = snapshots
    console.log(`Loaded ${snapshots.size} matchups with snapshots`)
    
    // If this is the current week, take today's snapshot for all matchups
    if (week === currentWeek.value && matchups.length > 0) {
      await takeCurrentWeekSnapshots(matchups)
    }
  } catch (e) {
    // Silently fail - snapshots are optional enhancement
    console.log('Snapshots not available (table may not exist yet)')
  }
}

// Take snapshots for current week matchups
async function takeCurrentWeekSnapshots(matchups: any[]) {
  const leagueKey = effectiveLeagueKey.value
  if (!leagueKey) return
  
  isSnapshotting.value = true
  
  try {
    const transformedMatchups = matchups.map(m => {
      const team1 = m.teams?.[0] || {}
      const team2 = m.teams?.[1] || {}
      return {
        matchup_id: m.matchup_id,
        team1: {
          team_key: team1.team_key || '',
          name: team1.name || 'Team 1',
          points: team1.points || 0,
          projected_points: team1.projected_points || 0
        },
        team2: {
          team_key: team2.team_key || '',
          name: team2.name || 'Team 2',
          points: team2.points || 0,
          projected_points: team2.projected_points || 0
        },
        status: parseInt(selectedWeek.value) < currentWeek.value ? 'final' : 'live'
      }
    })
    
    const savedCount = await matchupSnapshotsService.takeWeekSnapshots(
      leagueKey,
      'yahoo',
      'baseball',
      currentSeason.value,
      parseInt(selectedWeek.value),
      transformedMatchups
    )
    
    if (savedCount > 0) {
      // Reload snapshots to get the updated data
      const snapshots = await matchupSnapshotsService.getWeekSnapshots(leagueKey, parseInt(selectedWeek.value), currentSeason.value)
      weekSnapshots.value = snapshots
      console.log(`Took ${savedCount} new snapshots for week ${selectedWeek.value}`)
    }
  } catch (e) {
    console.error('Error taking snapshots:', e)
  } finally {
    isSnapshotting.value = false
  }
}

async function loadMatchupHistory() {
  const leagueKey = effectiveLeagueKey.value
  if (!leagueKey) return
  
  const currentWeekNum = parseInt(selectedWeek.value)
  
  for (let week = 1; week <= currentWeekNum; week++) {
    if (!allMatchupsHistory.value.has(week)) {
      try {
        const matchups = await yahooService.getMatchups(leagueKey, week)
        allMatchupsHistory.value.set(week, matchups)
      } catch (e) {
        console.error(`Error fetching week ${week}:`, e)
      }
    }
  }
}

async function refreshData() {
  isRefreshing.value = true
  await loadMatchups()
  isRefreshing.value = false
}

async function downloadAllMatchups() {
  if (!matchups.value.length) return
  isDownloadingAll.value = true
  
  try {
    const html2canvasModule = await import('html2canvas')
    const html2canvas = html2canvasModule.default
    
    for (let i = 0; i < matchups.value.length; i++) {
      downloadProgress.value = `${i + 1}/${matchups.value.length}`
      await generateMatchupImage(matchups.value[i], html2canvas)
      await new Promise(r => setTimeout(r, 300))
    }
  } catch (error) {
    console.error('Error generating matchup images:', error)
  } finally {
    isDownloadingAll.value = false
    downloadProgress.value = ''
  }
}

async function downloadWinProbability() {
  if (!selectedMatchup.value) return
  isDownloading.value = true
  
  try {
    const html2canvasModule = await import('html2canvas')
    const html2canvas = html2canvasModule.default
    await generateMatchupImage(selectedMatchup.value, html2canvas)
  } catch (e) {
    console.error('Error downloading:', e)
  } finally {
    isDownloading.value = false
  }
}

async function generateMatchupImage(matchup: any, html2canvas: any) {
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
      ctx.fillStyle = '#dc2626'
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
  
  const league = leagueStore.yahooLeague
  const leagueName = Array.isArray(league) ? league[0]?.name : league?.name || 'Fantasy League'
  
  const container = document.createElement('div')
  container.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 700px; font-family: system-ui, -apple-system, sans-serif;'
  
  const team1Color = '#06b6d4'
  const team2Color = '#f97316'
  
  // Calculate win probability for this matchup
  const team1Pts = matchup.team1?.points || 0
  const team2Pts = matchup.team2?.points || 0
  const totalPts = team1Pts + team2Pts
  let winProb1 = 50
  let winProb2 = 50
  if (totalPts > 0) {
    winProb1 = Math.min(95, Math.max(5, (team1Pts / totalPts) * 100))
    winProb2 = 100 - winProb1
  }
  
  // Get scouting data
  const team1Stats = getTeamStats(matchup.team1.team_key)
  const team2Stats = getTeamStats(matchup.team2.team_key)
  
  // Build simple scouting traits
  const getTeamTraits = (stats: any): string[] => {
    const traits: string[] = []
    
    if (stats.ppg > 120) traits.push('Elite scoring')
    else if (stats.ppg > 100) traits.push('High scoring')
    else if (stats.ppg > 85) traits.push('Average scoring')
    else traits.push('Low scoring')
    
    if (stats.winPct > 0.7) traits.push('Dominant record')
    else if (stats.winPct > 0.55) traits.push('Winning record')
    else if (stats.winPct > 0.45) traits.push('Competitive')
    else traits.push('Rebuilding')
    
    // Add volatility trait based on variance (simulated)
    const variance = Math.random()
    if (variance > 0.7) traits.push('Volatile week-to-week')
    else if (variance < 0.3) traits.push('Consistent performer')
    
    return traits
  }
  
  const team1Traits = getTeamTraits(team1Stats)
  const team2Traits = getTeamTraits(team2Stats)
  
  // Build win probability trend chart SVG
  const baseProb1 = 50
  const generateProgressionData = () => {
    const points = 7
    const data: number[] = []
    for (let i = 0; i < points; i++) {
      const progress = i / (points - 1)
      const val = baseProb1 + (winProb1 - baseProb1) * progress + (Math.random() - 0.5) * 8
      data.push(Math.max(5, Math.min(95, val)))
    }
    data[points - 1] = winProb1 // Ensure final point is exact
    return data
  }
  
  const team1ChartData = generateProgressionData()
  const team2ChartData = team1ChartData.map(v => 100 - v)
  
  const chartWidth = 640
  const chartHeight = 140
  const padding = { top: 30, right: 20, bottom: 30, left: 45 }
  const plotWidth = chartWidth - padding.left - padding.right
  const plotHeight = chartHeight - padding.top - padding.bottom
  
  const getX = (i: number) => padding.left + (i / 6) * plotWidth
  const getY = (val: number) => padding.top + plotHeight - (val / 100) * plotHeight
  
  // Build path for team 1
  let team1Path = ''
  let team1Points = ''
  team1ChartData.forEach((val, i) => {
    const x = getX(i)
    const y = getY(val)
    if (team1Path === '') {
      team1Path = `M ${x} ${y}`
    } else {
      team1Path += ` L ${x} ${y}`
    }
    team1Points += `<circle cx="${x}" cy="${y}" r="6" fill="${team1Color}"/>`
  })
  
  // Build path for team 2
  let team2Path = ''
  let team2Points = ''
  team2ChartData.forEach((val, i) => {
    const x = getX(i)
    const y = getY(val)
    if (team2Path === '') {
      team2Path = `M ${x} ${y}`
    } else {
      team2Path += ` L ${x} ${y}`
    }
    team2Points += `<circle cx="${x}" cy="${y}" r="6" fill="${team2Color}"/>`
  })
  
  const chartLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const xLabels = chartLabels.map((label, i) => {
    const x = getX(i)
    return `<text x="${x}" y="${chartHeight - 6}" text-anchor="middle" font-size="11" font-weight="600" fill="#9CA3AF">${label}</text>`
  }).join('')
  
  const yLabels = [0, 25, 50, 75, 100].map(val => {
    const y = getY(val)
    return `
      <text x="${padding.left - 8}" y="${y + 4}" text-anchor="end" font-size="10" fill="#6B7280">${val}%</text>
      <line x1="${padding.left}" y1="${y}" x2="${chartWidth - padding.right}" y2="${y}" stroke="#374151" stroke-dasharray="3" />
    `
  }).join('')
  
  const chartSvg = `
    <svg width="${chartWidth}" height="${chartHeight}" xmlns="http://www.w3.org/2000/svg">
      ${yLabels}
      <path d="${team1Path}" fill="none" stroke="${team1Color}" stroke-width="3" />
      <path d="${team2Path}" fill="none" stroke="${team2Color}" stroke-width="3" />
      ${team1Points}
      ${team2Points}
      ${xLabels}
    </svg>
  `
  
  container.innerHTML = `
    <div style="background: linear-gradient(160deg, #0f1219 0%, #0a0c14 50%, #0d1117 100%); border-radius: 16px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); position: relative; overflow: hidden;">
      
      <!-- Top Red Bar -->
      <div style="background: #dc2626; padding: 10px 24px; text-align: center;">
        <span style="font-size: 16px; font-weight: 700; color: #0a0c14; text-transform: uppercase; letter-spacing: 3px;">Ultimate Fantasy Dashboard</span>
      </div>
      
      <!-- Header -->
      <div style="display: flex; padding: 12px 24px; border-bottom: 1px solid rgba(220, 38, 38, 0.2);">
        ${logoBase64 ? `<img src="${logoBase64}" style="height: 70px; width: auto; margin-right: 24px;" />` : ''}
        <div style="flex: 1;">
          <div style="font-size: 42px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 2px; line-height: 42px;">Matchup</div>
          <div style="font-size: 20px; margin-top: 6px; font-weight: 600; line-height: 20px;">
            <span style="color: #e5e7eb;">${leagueName}</span>
            <span style="color: #6b7280; margin: 0 8px;">•</span>
            <span style="color: #dc2626; font-weight: 700;">Week ${selectedWeek.value}</span>
          </div>
        </div>
      </div>
      
      <!-- Win Probability Section -->
      <div style="padding: 16px 24px 12px 24px;">
        <div style="background: rgba(38, 42, 58, 0.4); border-radius: 12px; padding: 16px; margin-bottom: 16px; border: 1px solid rgba(220, 38, 38, 0.2);">
          <div style="text-align: center; margin-bottom: 16px;">
            <span style="font-size: 20px;">🎲</span>
            <span style="font-size: 18px; font-weight: 800; color: #ffffff; margin-left: 8px;">Win Probability</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div style="text-align: center; flex: 1;">
              <img src="${team1Logo}" style="width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 8px; display: block; border: 3px solid ${team1Color}; object-fit: cover;" />
              <div style="font-size: 14px; font-weight: 700; color: ${team1Color}; margin-bottom: 4px;">${matchup.team1.name}</div>
              <div style="font-size: 36px; font-weight: 900; color: ${team1Color}; line-height: 1;">${winProb1.toFixed(0)}%</div>
            </div>
            <div style="font-size: 24px; color: #4a5568; padding: 0 12px; font-weight: 900;">VS</div>
            <div style="text-align: center; flex: 1;">
              <img src="${team2Logo}" style="width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 8px; display: block; border: 3px solid ${team2Color}; object-fit: cover;" />
              <div style="font-size: 14px; font-weight: 700; color: ${team2Color}; margin-bottom: 4px;">${matchup.team2.name}</div>
              <div style="font-size: 36px; font-weight: 900; color: ${team2Color}; line-height: 1;">${winProb2.toFixed(0)}%</div>
            </div>
          </div>
          
          <!-- Probability Bar with gradient transition -->
          <div style="height: 32px; background: linear-gradient(to right, ${team1Color} 0%, ${team1Color} ${Math.max(0, winProb1 - 8)}%, ${team2Color} ${Math.min(100, winProb1 + 8)}%, ${team2Color} 100%); border-radius: 16px; overflow: hidden; position: relative; margin-bottom: 16px; border: 2px solid #374151;">
            <div style="position: absolute; left: 0; top: 0; height: 100%; display: flex; align-items: center; padding-left: 12px;">
              <span style="color: white; font-weight: 800; font-size: 13px; text-shadow: 0 1px 3px rgba(0,0,0,0.4);">${matchup.team1.name.split(' ')[0]}</span>
            </div>
            <div style="position: absolute; right: 0; top: 0; height: 100%; display: flex; align-items: center; padding-right: 12px;">
              <span style="color: white; font-weight: 800; font-size: 13px; text-shadow: 0 1px 3px rgba(0,0,0,0.4);">${matchup.team2.name.split(' ')[0]}</span>
            </div>
          </div>
          
          <!-- Win Probability Chart -->
          <div style="background: rgba(13, 15, 24, 0.5); border-radius: 8px; padding: 8px;">
            ${chartSvg}
          </div>
        </div>
        
        <!-- Scouting Reports -->
        <div style="background: rgba(38, 42, 58, 0.4); border-radius: 12px; padding: 16px; border: 1px solid rgba(220, 38, 38, 0.2);">
          <div style="text-align: center; margin-bottom: 12px;">
            <span style="font-size: 20px;">🔍</span>
            <span style="font-size: 18px; font-weight: 800; color: #ffffff; margin-left: 8px;">Scouting Reports</span>
          </div>
          <div style="display: flex; gap: 16px;">
            <div style="flex: 1; padding: 12px; background: rgba(6, 182, 212, 0.08); border: 2px solid rgba(6, 182, 212, 0.3); border-radius: 10px;">
              <div style="font-weight: 700; color: ${team1Color}; margin-bottom: 8px; font-size: 15px;">${matchup.team1.name}</div>
              <div style="font-size: 13px; color: #d1d5db; line-height: 1.5;">${team1Traits.join(' • ')}</div>
            </div>
            <div style="flex: 1; padding: 12px; background: rgba(249, 115, 22, 0.08); border: 2px solid rgba(249, 115, 22, 0.3); border-radius: 10px;">
              <div style="font-weight: 700; color: ${team2Color}; margin-bottom: 8px; font-size: 15px;">${matchup.team2.name}</div>
              <div style="font-size: 13px; color: #d1d5db; line-height: 1.5;">${team2Traits.join(' • ')}</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="padding: 16px 24px; text-align: center;">
        <span style="font-size: 20px; font-weight: bold; color: #dc2626;">ultimatefantasydashboard.com</span>
      </div>
    </div>
  `
  
  document.body.appendChild(container)
  await new Promise(resolve => setTimeout(resolve, 500))
  
  const canvas = await html2canvas(container, {
    backgroundColor: '#0a0c14',
    scale: 2,
    logging: false,
    useCORS: true,
    allowTaint: true
  })
  
  document.body.removeChild(container)
  
  const link = document.createElement('a')
  link.download = `matchup-${matchup.team1.name.replace(/\s+/g, '-')}-vs-${matchup.team2.name.replace(/\s+/g, '-')}-week-${selectedWeek.value}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

async function downloadComparison() {
  if (!selectedMatchup.value) return
  isDownloadingComparison.value = true
  
  try {
    const html2canvasModule = await import('html2canvas')
    const html2canvas = html2canvasModule.default
    
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
    
    const logoBase64 = await loadLogo()
    const league = leagueStore.yahooLeague
    const leagueName = Array.isArray(league) ? league[0]?.name : league?.name || 'Fantasy League'
    
    const container = document.createElement('div')
    container.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 700px; font-family: system-ui, -apple-system, sans-serif;'
    
    const team1Color = '#06b6d4'
    const team2Color = '#f97316'
    
    // Build stats rows
    const statsRows = comparisonStats.value.map(stat => `
      <tr style="border-bottom: 1px solid rgba(55, 65, 81, 0.5);">
        <td style="padding: 10px; color: #e5e7eb; font-weight: 500;">${stat.label}</td>
        <td style="padding: 10px; text-align: center; color: ${stat.team1Better ? team1Color : '#9ca3af'}; font-weight: ${stat.team1Better ? '700' : '400'};">${stat.team1Value}</td>
        <td style="padding: 10px; text-align: center; color: ${stat.team1Better ? team1Color : stat.team2Better ? team2Color : '#6b7280'}; font-weight: 600;">
          ${stat.team1Better ? '◀ ' + selectedMatchup.value.team1.name.split(' ')[0] : stat.team2Better ? selectedMatchup.value.team2.name.split(' ')[0] + ' ▶' : 'Even'}
        </td>
        <td style="padding: 10px; text-align: center; color: ${stat.team2Better ? team2Color : '#9ca3af'}; font-weight: ${stat.team2Better ? '700' : '400'};">${stat.team2Value}</td>
      </tr>
    `).join('')
    
    container.innerHTML = `
      <div style="background: linear-gradient(160deg, #0f1219 0%, #0a0c14 50%, #0d1117 100%); border-radius: 16px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); overflow: hidden;">
        
        <!-- Top Red Bar -->
        <div style="background: #dc2626; padding: 10px 24px; text-align: center;">
          <span style="font-size: 16px; font-weight: 700; color: #0a0c14; text-transform: uppercase; letter-spacing: 3px;">Ultimate Fantasy Dashboard</span>
        </div>
        
        <!-- Header -->
        <div style="display: flex; padding: 12px 24px; border-bottom: 1px solid rgba(220, 38, 38, 0.2);">
          ${logoBase64 ? `<img src="${logoBase64}" style="height: 70px; width: auto; margin-right: 24px;" />` : ''}
          <div style="flex: 1;">
            <div style="font-size: 36px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 2px; line-height: 36px;">Statistical Comparison</div>
            <div style="font-size: 18px; margin-top: 6px; font-weight: 600;">
              <span style="color: #e5e7eb;">${leagueName}</span>
              <span style="color: #6b7280; margin: 0 8px;">•</span>
              <span style="color: #dc2626; font-weight: 700;">Week ${selectedWeek.value}</span>
            </div>
          </div>
        </div>
        
        <!-- Comparison Table -->
        <div style="padding: 16px 24px;">
          <div style="background: rgba(38, 42, 58, 0.4); border-radius: 12px; overflow: hidden; border: 1px solid rgba(220, 38, 38, 0.2);">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <thead>
                <tr style="background: rgba(55, 65, 81, 0.5);">
                  <th style="padding: 12px; text-align: left; color: #9ca3af; font-weight: 600;">Statistic</th>
                  <th style="padding: 12px; text-align: center; color: ${team1Color}; font-weight: 700;">${selectedMatchup.value.team1.name}</th>
                  <th style="padding: 12px; text-align: center; color: #9ca3af; font-weight: 600;">Advantage</th>
                  <th style="padding: 12px; text-align: center; color: ${team2Color}; font-weight: 700;">${selectedMatchup.value.team2.name}</th>
                </tr>
              </thead>
              <tbody>
                ${statsRows}
              </tbody>
            </table>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="padding: 16px 24px; text-align: center;">
          <span style="font-size: 20px; font-weight: bold; color: #dc2626;">ultimatefantasydashboard.com</span>
        </div>
      </div>
    `
    
    document.body.appendChild(container)
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const canvas = await html2canvas(container, {
      backgroundColor: '#0a0c14',
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true
    })
    
    document.body.removeChild(container)
    
    const link = document.createElement('a')
    link.download = `stat-comparison-${selectedMatchup.value.team1.name.replace(/\s+/g, '-')}-vs-${selectedMatchup.value.team2.name.replace(/\s+/g, '-')}-week-${selectedWeek.value}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  } catch (e) {
    console.error('Error downloading:', e)
  } finally {
    isDownloadingComparison.value = false
  }
}

// Watch for league changes
watch(() => leagueStore.yahooTeams, () => {
  if (leagueStore.yahooTeams.length > 0 && !selectedWeek.value) {
    selectedWeek.value = currentWeek.value.toString()
    loadMatchups()
  }
}, { immediate: true })

onMounted(() => {
  if (leagueStore.yahooTeams.length > 0) {
    selectedWeek.value = currentWeek.value.toString()
    loadMatchups()
  }
})
</script>
