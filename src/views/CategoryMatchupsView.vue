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

    <!-- Offseason Notice Banner - Only show when season is complete -->
    <div v-if="isSeasonComplete" class="bg-slate-500/10 border border-slate-500/30 rounded-xl p-4 flex items-start gap-3">
      <div class="text-slate-400 text-xl flex-shrink-0">📅</div>
      <div>
        <p class="text-slate-200 font-semibold">It's the offseason</p>
        <p class="text-slate-400 text-sm mt-1">You're viewing last season's data ({{ currentSeason }}). The {{ Number(currentSeason) + 1 }} season will appear automatically once Week 1 begins.</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center py-20">
      <LoadingSpinner size="xl" :message="loadingMessage" />
      
      <!-- Detailed progress -->
      <div class="mt-4 text-center space-y-2">
        <div v-if="loadingProgress.currentStep" class="text-sm text-dark-textMuted">
          {{ loadingProgress.currentStep }}
        </div>
        
        <!-- Week progress bar -->
        <div v-if="loadingProgress.maxWeek > 0" class="w-64 mx-auto">
          <div class="flex justify-between text-xs text-dark-textMuted/70 mb-1">
            <span>Week {{ loadingProgress.week }}</span>
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
          <div class="flex items-center gap-2">
              <span class="text-2xl">⚔️</span>
              <h2 class="card-title">Select Matchup</h2>
          </div>
          <p class="text-sm text-dark-textMuted mt-2">💡 <span class="text-yellow-400 font-medium">Click any matchup</span> to see category breakdown and win probability</p>
        </div>
        <div class="card-body">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button v-for="matchup in matchups" :key="matchup.matchup_id" @click="selectMatchup(matchup)"
              :class="[
                'p-4 rounded-xl border-2 transition-all text-left',
                selectedMatchup?.matchup_id === matchup.matchup_id 
                  ? 'border-yellow-400 bg-yellow-500/10 ring-2 ring-yellow-400/30' 
                  : 'border-dark-border bg-dark-card hover:border-yellow-400/50 hover:bg-dark-border/30'
              ]">
              <!-- Team 1 -->
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2 flex-1 min-w-0">
                  <div class="relative">
                    <img :src="matchup.team1.logo_url || defaultAvatar" class="w-9 h-9 rounded-full ring-2 ring-dark-border" @error="handleImageError"/>
                    <div v-if="matchup.team1.is_my_team" class="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center"><span class="text-[10px] text-gray-900">★</span></div>
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
                    <img :src="matchup.team2.logo_url || defaultAvatar" class="w-9 h-9 rounded-full ring-2 ring-dark-border" @error="handleImageError"/>
                    <div v-if="matchup.team2.is_my_team" class="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center"><span class="text-[10px] text-gray-900">★</span></div>
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
        <div class="card" ref="winProbSectionRef">
          <div class="card-header">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-2xl">🎲</span>
                <h2 class="card-title">Win Probability</h2>
              </div>
              <button 
                v-if="hasLeagueAccess"
                @click="downloadMatchupAnalysis" 
                :disabled="isDownloading" 
                class="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all disabled:opacity-50"
                :style="shareToast === 'success' ? 'background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid #10b981;' : 'background: transparent; color: #facc15; border: 1px solid #facc15;'"
              >
                <svg v-if="isDownloading" class="w-4 h-4 animate-spin pointer-events-none" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <svg v-else-if="shareToast === 'success'" class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                <svg v-else class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                {{ isDownloading ? 'Generating...' : shareToast === 'success' ? 'Copied! 📋' : 'Share' }}
              </button>
              <button
                v-else
                @click="goToPricing"
                class="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all"
                style="background: rgba(30,33,48,0.8); color: #6b7280; border: 1px solid #374151;"
                title="League Pass required to share"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Share
              </button>
            </div>
            <p class="card-subtitle mt-2">Live probability based on current category performance</p>
          </div>
          <div class="card-body">
            <!-- Big Team Cards -->
            <div class="grid grid-cols-2 gap-3 mb-6">
              <!-- Team 1 compact on mobile -->
              <div class="text-center p-3 sm:p-6 rounded-xl border-2 bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/30">
                <div class="relative inline-block">
                  <img :src="selectedMatchup.team1.logo_url || defaultAvatar" class="w-12 h-12 sm:w-20 sm:h-20 rounded-full mx-auto mb-2 border-4 border-cyan-500" @error="handleImageError"/>
                  <div v-if="selectedMatchup.team1.is_my_team" class="absolute -top-1 -right-1 w-4 h-4 sm:w-6 sm:h-6 bg-yellow-400 rounded-full flex items-center justify-center"><span class="text-[10px] sm:text-sm text-gray-900">★</span></div>
                </div>
                <div class="font-bold text-sm sm:text-xl mb-1 text-cyan-400 truncate">{{ selectedMatchup.team1.name }}</div>
                <div class="text-3xl sm:text-5xl font-black mb-1 text-cyan-400">{{ selectedMatchup.team1WinProb.toFixed(0) }}%</div>
                <div class="text-xs sm:text-sm space-y-0.5">
                  <div class="text-white">{{ selectedMatchup.team1CatWins }}-{{ selectedMatchup.team2CatWins }}-{{ selectedMatchup.ties }}</div>
                  <div class="text-cyan-400 text-[10px] sm:text-sm">Proj: {{ selectedMatchup.projectedTeam1Wins }}-{{ selectedMatchup.projectedTeam2Wins }}</div>
                </div>
              </div>
              <!-- Team 2 -->
              <div class="text-center p-3 sm:p-6 rounded-xl border-2 bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/30">
                <div class="relative inline-block">
                  <img :src="selectedMatchup.team2.logo_url || defaultAvatar" class="w-12 h-12 sm:w-20 sm:h-20 rounded-full mx-auto mb-2 border-4 border-orange-500" @error="handleImageError"/>
                  <div v-if="selectedMatchup.team2.is_my_team" class="absolute -top-1 -right-1 w-4 h-4 sm:w-6 sm:h-6 bg-yellow-400 rounded-full flex items-center justify-center"><span class="text-[10px] sm:text-sm text-gray-900">★</span></div>
                </div>
                <div class="font-bold text-sm sm:text-xl mb-1 text-orange-400 truncate">{{ selectedMatchup.team2.name }}</div>
                <div class="text-3xl sm:text-5xl font-black mb-1 text-orange-400">{{ selectedMatchup.team2WinProb.toFixed(0) }}%</div>
                <div class="text-xs sm:text-sm space-y-0.5">
                  <div class="text-white">{{ selectedMatchup.team2CatWins }}-{{ selectedMatchup.team1CatWins }}-{{ selectedMatchup.ties }}</div>
                  <div class="text-orange-400 text-[10px] sm:text-sm">Proj: {{ selectedMatchup.projectedTeam2Wins }}-{{ selectedMatchup.projectedTeam1Wins }}</div>
                </div>
              </div>
            </div>
            <!-- Win Probability Bar -->
            <div class="relative h-12 bg-dark-border/30 rounded-full overflow-hidden mb-6">
              <div class="absolute inset-0 transition-all duration-500" :style="gradientBarStyle"></div>
              <div class="absolute left-0 top-0 h-full flex items-center px-4 z-10"><span class="font-bold text-sm text-white drop-shadow-md">{{ selectedMatchup.team1.name }}</span></div>
              <div class="absolute right-0 top-0 h-full flex items-center px-4 z-10"><span class="font-bold text-sm text-white drop-shadow-md">{{ selectedMatchup.team2.name }}</span></div>
            </div>
            <!-- Chart + rest of win prob card — gated -->
            <LeagueGate wrap :locked="!hasLeagueAccess" label="Matchup Deep Dive">
            <div class="bg-dark-border/30 rounded-xl p-4">
              <h4 class="text-sm font-semibold text-dark-textMuted mb-3">{{ chartTitle }}</h4>
              <div v-if="chartLoading" class="h-48 flex items-center justify-center">
                <div class="text-dark-textMuted text-sm animate-pulse">Loading daily stats...</div>
              </div>
              <div ref="winProbChartEl" class="h-48"></div>
              <p class="text-xs text-dark-textMuted mt-2 text-center">Win probability after each day based on real cumulative stats.</p>
              <p class="text-xs text-dark-textMuted mt-1 text-center italic">10,000 Monte Carlo simulations per day using actual daily stat data.</p>
            </div>
            </LeagueGate>
          </div>
        </div>

        <!-- Scouting Reports + Breakdown — gated -->
        <LeagueGate wrap :locked="!hasLeagueAccess" label="Full Matchup Analysis">
        <div class="card">
          <div class="card-header"><div class="flex items-center gap-2"><span class="text-2xl">🔍</span><h2 class="card-title">Scouting Reports</h2></div></div>
          <div class="card-body">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="p-4 rounded-xl border bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/30">
                <div class="flex items-center gap-3 mb-4">
                  <div class="relative">
                    <img :src="selectedMatchup.team1.logo_url || defaultAvatar" class="w-12 h-12 rounded-full border-2 border-cyan-500" @error="handleImageError"/>
                    <div v-if="selectedMatchup.team1.is_my_team" class="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center"><span class="text-[10px] text-gray-900">★</span></div>
                  </div>
                  <div>
                    <div class="font-bold text-lg text-cyan-400">{{ selectedMatchup.team1.name }}</div>
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
              <div class="p-4 rounded-xl border bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/30">
                <div class="flex items-center gap-3 mb-4">
                  <div class="relative">
                    <img :src="selectedMatchup.team2.logo_url || defaultAvatar" class="w-12 h-12 rounded-full border-2 border-orange-500" @error="handleImageError"/>
                    <div v-if="selectedMatchup.team2.is_my_team" class="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center"><span class="text-[10px] text-gray-900">★</span></div>
                  </div>
                  <div>
                    <div class="font-bold text-lg text-orange-400">{{ selectedMatchup.team2.name }}</div>
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
          <div class="card-header">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2"><span class="text-2xl">📊</span><h2 class="card-title">Category Breakdown</h2></div>
              <button 
                @click="downloadCategoryBreakdown" 
                :disabled="isDownloadingCategories" 
                class="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50"
                style="background: transparent; color: #facc15; border: 1px solid #facc15;"
                @mouseover="$event.currentTarget.style.background = '#facc15'; $event.currentTarget.style.color = '#111827'"
                @mouseout="$event.currentTarget.style.background = 'transparent'; $event.currentTarget.style.color = '#facc15'"
              >
                <svg v-if="!isDownloadingCategories" class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                <svg v-else class="w-5 h-5 animate-spin pointer-events-none" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                {{ isDownloadingCategories ? 'Generating...' : shareToast === 'success' ? 'Copied! 📋' : 'Share' }}
              </button>
            </div>
          </div>
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
            <div class="sm:overflow-x-auto mt-4">
              <table class="w-full text-sm">
                <thead><tr class="text-xs text-dark-textMuted border-b border-dark-border/50">
                  <th class="text-left py-2 px-1">Category</th>
                  <th class="text-center py-2 px-1 cursor-help" title="Current week's stat total for this category">Current</th>
                  <th class="text-center py-2 px-1 cursor-help hidden sm:table-cell" title="Average weekly total for this category this season">Avg</th>
                  <th class="text-center py-2 px-1 cursor-help hidden sm:table-cell" title="Best single-week total for this category this season">High</th>
                  <th class="text-center py-2 px-1 cursor-help" title="Probability of winning this category by end of week">Win Prob</th>
                  <th class="text-center py-2 px-1 w-8 cursor-help" title="Current category leader">ADV</th>
                  <th class="text-center py-2 px-1 cursor-help" title="Probability of winning this category by end of week">Win Prob</th>
                  <th class="text-center py-2 px-1 cursor-help hidden sm:table-cell" title="Best single-week total for this category this season">High</th>
                  <th class="text-center py-2 px-1 cursor-help hidden sm:table-cell" title="Average weekly total for this category this season">Avg</th>
                  <th class="text-center py-2 px-1 cursor-help" title="Current week's stat total for this category">Current</th>
                </tr></thead>
                <tbody>
                  <tr v-for="cat in allCategories" :key="cat.stat_id" class="border-b border-dark-border/30 hover:bg-dark-border/10">
                    <td class="py-2 px-1 text-dark-text font-medium">{{ cat.display_name }}</td>
                    <td class="text-center py-2 px-1 text-white font-bold">{{ formatStat(getCategoryStat(selectedMatchup, cat.stat_id, 1), cat.stat_id) }}</td>
                    <td class="text-center py-2 px-1 text-dark-textMuted hidden sm:table-cell">{{ formatStat(getCategoryAvg(selectedMatchup.team1.team_key, cat.stat_id), cat.stat_id) }}</td>
                    <td class="text-center py-2 px-1 text-dark-textMuted hidden sm:table-cell">{{ formatStat(getCategoryHigh(selectedMatchup.team1.team_key, cat.stat_id), cat.stat_id) }}</td>
                    <td class="text-center py-2 px-1" :class="getCategoryWinProbClass(getCategoryWinProb(selectedMatchup, cat.stat_id, 1))">{{ getCategoryWinProb(selectedMatchup, cat.stat_id, 1).toFixed(0) }}%</td>
                    <td class="text-center py-2 px-1">
                      <span v-if="getCategoryLeader(selectedMatchup, cat.stat_id) === 1" class="text-cyan-400 text-lg font-bold">◀</span>
                      <span v-else-if="getCategoryLeader(selectedMatchup, cat.stat_id) === 2" class="text-orange-400 text-lg font-bold">▶</span>
                      <span v-else class="text-dark-textMuted">—</span>
                    </td>
                    <td class="text-center py-2 px-1" :class="getCategoryWinProbClass(getCategoryWinProb(selectedMatchup, cat.stat_id, 2))">{{ getCategoryWinProb(selectedMatchup, cat.stat_id, 2).toFixed(0) }}%</td>
                    <td class="text-center py-2 px-1 text-dark-textMuted hidden sm:table-cell">{{ formatStat(getCategoryHigh(selectedMatchup.team2.team_key, cat.stat_id), cat.stat_id) }}</td>
                    <td class="text-center py-2 px-1 text-dark-textMuted hidden sm:table-cell">{{ formatStat(getCategoryAvg(selectedMatchup.team2.team_key, cat.stat_id), cat.stat_id) }}</td>
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
                  <th class="text-left p-2 sm:p-3 text-dark-textMuted font-semibold text-xs sm:text-sm">Stat</th>
                  <th class="text-center p-2 sm:p-3 font-semibold text-cyan-400 text-xs sm:text-sm">
                    <span class="sm:hidden">{{ selectedMatchup.team1.name.split(' ')[0] }}</span>
                    <span class="hidden sm:inline">{{ selectedMatchup.team1.name }}</span>
                  </th>
                  <th class="text-center p-1 sm:p-3 text-dark-textMuted font-semibold text-xs w-8 sm:w-auto">
                    <span class="sm:hidden">Adv</span><span class="hidden sm:inline">Advantage</span>
                  </th>
                  <th class="text-center p-2 sm:p-3 font-semibold text-orange-400 text-xs sm:text-sm">
                    <span class="sm:hidden">{{ selectedMatchup.team2.name.split(' ')[0] }}</span>
                    <span class="hidden sm:inline">{{ selectedMatchup.team2.name }}</span>
                  </th>
                </tr></thead>
                <tbody>
                  <tr v-for="stat in comparisonStats" :key="stat.label" class="border-b border-dark-border/50 hover:bg-dark-border/10">
                    <td class="p-2 sm:p-3 text-dark-text font-medium text-xs sm:text-sm">{{ stat.label }}</td>
                    <td class="text-center p-2 sm:p-3"><span class="text-xs sm:text-sm" :class="stat.team1Better ? 'text-cyan-400 font-bold' : 'text-dark-textMuted'">{{ stat.team1Value }}</span></td>
                    <td class="text-center p-1 sm:p-3 w-8 sm:w-auto">
                      <span v-if="stat.team1Better" class="text-cyan-400 font-bold">
                        <span class="sm:hidden">◀</span><span class="hidden sm:inline">◀ {{ selectedMatchup.team1.name }}</span>
                      </span>
                      <span v-else-if="stat.team2Better" class="text-orange-400 font-bold">
                        <span class="sm:hidden">▶</span><span class="hidden sm:inline">{{ selectedMatchup.team2.name }} ▶</span>
                      </span>
                      <span v-else class="text-dark-textMuted text-xs">=</span>
                    </td>
                    <td class="text-center p-2 sm:p-3"><span class="text-xs sm:text-sm" :class="stat.team2Better ? 'text-orange-400 font-bold' : 'text-dark-textMuted'">{{ stat.team2Value }}</span></td>
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
                <div class="flex items-center justify-between gap-2">
                  <div class="text-sm flex items-center gap-2" :class="game.team1Won ? 'text-green-400 font-bold' : 'text-dark-textMuted'">
                    <span class="truncate max-w-[90px] sm:max-w-none">{{ selectedMatchup.team1.name }}</span>
                    <span class="font-bold flex-shrink-0">{{ game.team1Score }} cats</span>
                  </div>
                  <span class="text-dark-textMuted text-xs flex-shrink-0">vs</span>
                  <div class="text-sm flex items-center gap-2" :class="game.team2Won ? 'text-green-400 font-bold' : 'text-dark-textMuted'">
                    <span class="font-bold flex-shrink-0">{{ game.team2Score }} cats</span>
                    <span class="truncate max-w-[90px] sm:max-w-none">{{ selectedMatchup.team2.name }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="text-center text-dark-textMuted py-4">No previous matchups this season</div>
          </div>
        </div>
      </LeagueGate>
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
import { espnService } from '@/services/espn'
import ApexCharts from 'apexcharts'
import { matchupChartCache } from '@/stores/matchupChartCache'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import LeagueGate from '@/components/LeagueGate.vue'
import { useFeatureAccess } from '@/composables/useFeatureAccess'
import { useRouter } from 'vue-router'

const leagueStore = useLeagueStore()
const router = useRouter()
const { hasLeagueAccess } = useFeatureAccess()

function goToPricing() {
  const params = new URLSearchParams()
  if (leagueStore.activeLeagueId) params.set('league', leagueStore.activeLeagueId)
  if (leagueStore.activePlatform) params.set('platform', leagueStore.activePlatform)
  router.push(`/pricing?${params.toString()}`)
}
const authStore = useAuthStore()

// Platform detection
const isEspn = computed(() => leagueStore.activePlatform === 'espn')

const isLoading = ref(false)
const isRefreshing = ref(false)
const isDownloading = ref(false)
const isDownloadingCategories = ref(false)
const isDownloadingAll = ref(false)
const shareToast = ref<'idle'|'success'|'error'>('idle')
const downloadProgress = ref('')
const loadingMessage = ref('Loading matchups...')
const loadingProgress = ref({
  currentStep: '',
  week: 0,
  maxWeek: 0
})
const selectedWeek = ref('')
const matchups = ref<any[]>([])
const selectedMatchup = ref<any>(null)
const categories = ref<any[]>([])
const teamSeasonStats = ref<Map<string, any>>(new Map())
const gameWeeks = ref<{ week: number, start: string, end: string }[]>([])
const winProbChartEl = ref<HTMLElement | null>(null)
let winProbChart: ApexCharts | null = null
// Cache the actual computed chart data so download uses the same numbers shown on screen
const cachedChartD1 = ref<number[]>([])
const cachedChartD2 = ref<number[]>([])
const cachedChartLabels = ref<string[]>([])

const BATTING_STAT_IDS = ['60', '7', '12', '16', '3', '55', '56']
const PITCHING_STAT_IDS = ['28', '32', '42', '26', '27', '48']
const INVERSE_STATS = ['26', '27']

// ESPN stat IDs for batting/pitching categorization
const ESPN_BATTING_STAT_IDS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '40', '41', '42', '43']
const ESPN_PITCHING_STAT_IDS = ['17', '18', '19', '20', '21', '22', '23', '24', '32', '33', '34', '35', '36', '37', '99']
const ESPN_INVERSE_STATS = ['7', '12', '14', '18', '19', '21', '22', '24', '33', '45'] // Lower is better

// ESPN stat ID → display name mappings by sport
// Shared between loadCategories() and loadMatchups() for category rebuild
function getEspnStatNames(sport: string): Record<number, { name: string; display: string; isNegative?: boolean }> {
  if (sport === 'hockey') return {
    // ESPN Fantasy Hockey stat IDs (DIFFERENT from other sports!)
    // Goalie stats use IDs 0-12, Skater stats use IDs 13+
    // Goalie stats
    0: { name: 'Games Started', display: 'GS' },
    1: { name: 'Wins', display: 'W' },
    2: { name: 'Losses', display: 'L', isNegative: true },
    3: { name: 'Shots Against', display: 'SA' },
    4: { name: 'Goals Against', display: 'GA', isNegative: true },
    5: { name: 'Saves', display: 'SV' },
    6: { name: 'Saves', display: 'SV' },
    7: { name: 'Shutouts', display: 'SHO' },
    8: { name: 'Minutes', display: 'MIN' },
    9: { name: 'Overtime Losses', display: 'OTL' },
    10: { name: 'Goals Against Average', display: 'GAA', isNegative: true },
    11: { name: 'Save Percentage', display: 'SV%' },
    12: { name: 'Shutouts', display: 'SHO' },
    // Skater stats (IDs 13+)
    13: { name: 'Goals', display: 'G' },
    14: { name: 'Assists', display: 'A' },
    15: { name: 'Plus/Minus', display: '+/-' },
    16: { name: 'Points', display: 'PTS' },
    17: { name: 'Penalty Minutes', display: 'PIM' },
    18: { name: 'Powerplay Goals', display: 'PPG' },
    19: { name: 'Powerplay Assists', display: 'PPA' },
    20: { name: 'Shorthanded Goals', display: 'SHG' },
    21: { name: 'Shorthanded Assists', display: 'SHA' },
    22: { name: 'Game-Winning Goals', display: 'GWG' },
    23: { name: 'Shorthanded Points', display: 'SHP' },
    24: { name: 'Shots on Goal', display: 'SOG' },
    25: { name: 'Time on Ice', display: 'TOI' },
    26: { name: 'Time on Ice (total)', display: 'TOI' },
    27: { name: 'Avg Time on Ice', display: 'ATOI' },
    28: { name: 'Hat Tricks', display: 'HAT' },
    29: { name: 'Shots on Goal', display: 'SOG' },
    30: { name: 'Games Played', display: 'GP' },
    31: { name: 'Blocked Shots', display: 'BLK' },
    32: { name: 'Takeaways', display: 'TK' },
    33: { name: 'Giveaways', display: 'GV', isNegative: true },
    34: { name: 'Games Started', display: 'GS' },
    35: { name: 'Faceoffs Won', display: 'FOW' },
    36: { name: 'Faceoffs Lost', display: 'FOL', isNegative: true },
    37: { name: 'Faceoff Total', display: 'FO' },
    38: { name: 'Powerplay Points', display: 'PPP' },
    39: { name: 'Shorthanded Points', display: 'SHP' },
    40: { name: 'Hits', display: 'HIT' },
    41: { name: 'Shooting Percentage', display: 'SH%' },
    42: { name: 'Faceoff Win Pct', display: 'FO%' }
  }
  if (sport === 'basketball') return {
    0: { name: 'Points', display: 'PTS' },
    1: { name: 'Blocks', display: 'BLK' },
    2: { name: 'Steals', display: 'STL' },
    3: { name: 'Assists', display: 'AST' },
    4: { name: 'Offensive Rebounds', display: 'OREB' },
    5: { name: 'Defensive Rebounds', display: 'DREB' },
    6: { name: 'Rebounds', display: 'REB' },
    7: { name: 'Ejections', display: 'EJ', isNegative: true },
    8: { name: 'Flagrant Fouls', display: 'FF', isNegative: true },
    9: { name: 'Personal Fouls', display: 'PF', isNegative: true },
    10: { name: 'Technical Fouls', display: 'TF', isNegative: true },
    11: { name: 'Turnovers', display: 'TO', isNegative: true },
    12: { name: 'Disqualifications', display: 'DQ', isNegative: true },
    13: { name: 'Field Goals Made', display: 'FGM' },
    14: { name: 'Field Goals Attempted', display: 'FGA' },
    15: { name: 'Free Throws Made', display: 'FTM' },
    16: { name: 'Free Throws Attempted', display: 'FTA' },
    17: { name: '3-Pointers Made', display: '3PM' },
    18: { name: '3-Pointers Attempted', display: '3PA' },
    19: { name: 'Field Goal Pct', display: 'FG%' },
    20: { name: 'Free Throw Pct', display: 'FT%' },
    21: { name: '3-Point Pct', display: '3P%' },
    37: { name: 'Double-Doubles', display: 'DD' },
    38: { name: 'Triple-Doubles', display: 'TD' },
    40: { name: 'Games Played', display: 'GP' },
    41: { name: 'Minutes', display: 'MIN' },
    42: { name: 'Games Started', display: 'GS' }
  }
  // baseball (default)
  return {
    0: { name: 'At Bats', display: 'AB' },
    1: { name: 'Hits', display: 'H' },
    2: { name: 'Runs', display: 'R' },
    3: { name: 'Home Runs', display: 'HR' },
    4: { name: 'RBI', display: 'RBI' },
    5: { name: 'Stolen Bases', display: 'SB' },
    6: { name: 'Walks (Batting)', display: 'BB' },
    7: { name: 'Strikeouts (Batting)', display: 'K', isNegative: true },
    8: { name: 'Batting Average', display: 'AVG' },
    9: { name: 'On Base Pct', display: 'OBP' },
    10: { name: 'Slugging Pct', display: 'SLG' },
    11: { name: 'OPS', display: 'OPS' },
    12: { name: 'Grounded Into DP', display: 'GIDP', isNegative: true },
    13: { name: 'Singles', display: '1B' },
    14: { name: 'Doubles', display: '2B' },
    15: { name: 'Triples', display: '3B' },
    16: { name: 'Total Bases', display: 'TB' },
    17: { name: 'Games Played', display: 'G' },
    18: { name: 'Plate Appearances', display: 'PA' },
    19: { name: 'Extra Base Hits', display: 'XBH' },
    20: { name: 'Hit By Pitch', display: 'HBP' },
    21: { name: 'Intentional Walks', display: 'IBB' },
    22: { name: 'Sac Bunts', display: 'SAC' },
    23: { name: 'Sacrifice Flies', display: 'SF' },
    24: { name: 'Errors', display: 'E', isNegative: true },
    25: { name: 'Fielder\'s Choice', display: 'FC' },
    26: { name: 'Fielding Percentage', display: 'FPCT' },
    27: { name: 'Outfield Assists', display: 'OFAST' },
    28: { name: 'Double Plays Turned', display: 'DP' },
    29: { name: 'Putouts', display: 'PO' },
    30: { name: 'Assists', display: 'A' },
    31: { name: 'Total Chances', display: 'TC' },
    32: { name: 'Caught Stealing', display: 'CS', isNegative: true },
    33: { name: 'Stolen Base Percentage', display: 'SB%' },
    34: { name: 'Net Stolen Bases', display: 'NSB' },
    35: { name: 'Wins', display: 'W' },
    36: { name: 'Losses', display: 'L', isNegative: true },
    37: { name: 'Saves', display: 'SV' },
    38: { name: 'Holds', display: 'HD' },
    39: { name: 'Innings Pitched', display: 'IP' },
    40: { name: 'Earned Runs', display: 'ER', isNegative: true },
    41: { name: 'Hits Allowed', display: 'HA', isNegative: true },
    42: { name: 'Walks Allowed', display: 'BBI', isNegative: true },
    43: { name: 'Strikeouts (Pitching)', display: 'Ks' },
    44: { name: 'Complete Games', display: 'CG' },
    45: { name: 'Shutouts', display: 'SHO' },
    46: { name: 'No Hitters', display: 'NH' },
    47: { name: 'ERA', display: 'ERA', isNegative: true },
    48: { name: 'WHIP', display: 'WHIP', isNegative: true },
    49: { name: 'Opponent Batting Avg', display: 'OBA', isNegative: true },
    50: { name: 'Runs Allowed', display: 'RA', isNegative: true },
    51: { name: 'Home Runs Allowed', display: 'HRA', isNegative: true },
    52: { name: 'Batters Faced', display: 'BF' },
    53: { name: 'Quality Starts', display: 'QS' },
    54: { name: 'Pitches Thrown', display: 'PC' },
    55: { name: 'Pickoffs', display: 'PKO' },
    56: { name: 'Wild Pitches', display: 'WP', isNegative: true },
    57: { name: 'Blown Saves', display: 'BS', isNegative: true },
    58: { name: 'Relief Wins', display: 'RW' },
    59: { name: 'Relief Losses', display: 'RL', isNegative: true },
    60: { name: 'Save Opportunities', display: 'SVO' },
    61: { name: 'Inherited Runners Scored', display: 'IRS', isNegative: true },
    62: { name: 'Strikeout to Walk Ratio', display: 'K/BB' },
    63: { name: 'Games Started', display: 'GS' },
    64: { name: 'Hit Batters', display: 'HB', isNegative: true },
    65: { name: 'Balks', display: 'BK', isNegative: true },
    66: { name: 'Ground Outs', display: 'GO' },
    67: { name: 'Fly Outs', display: 'AO' },
    68: { name: 'K/9', display: 'K/9' },
    69: { name: 'BB/9', display: 'BB/9', isNegative: true },
    70: { name: 'H/9', display: 'H/9', isNegative: true },
    71: { name: 'Saves + Holds', display: 'SVHD' },
    72: { name: 'Relief Appearances', display: 'RAPP' },
    73: { name: 'Total Bases Allowed', display: 'TBA', isNegative: true },
    74: { name: 'Win Percentage', display: 'W%' },
    76: { name: 'BABIP', display: 'BABIP' },
    77: { name: 'FIP', display: 'FIP', isNegative: true },
    78: { name: 'xFIP', display: 'xFIP', isNegative: true },
    79: { name: 'WAR (Batting)', display: 'WAR' },
    80: { name: 'WAR (Pitching)', display: 'WAR' },
    81: { name: 'wOBA', display: 'wOBA' },
    82: { name: 'wRC+', display: 'wRC+' },
    83: { name: 'Perfect Games', display: 'PG' },
    99: { name: 'Games Pitched', display: 'GP' }
  }
}

// ESPN standard display order by sport (stat IDs in ESPN's left-to-right order)
const ESPN_DISPLAY_ORDER: Record<string, string[]> = {
  // Hockey: Skater stats first (G,A,+/-,PIM,PPP,ATOI,SOG,PPG,PPA,SHG,SHA,GWG,HIT,BLK), then Goalie (W,L,GAA,SV%,SHO,SA)
  hockey: ['13','14','15','17','38','27','29','18','19','20','21','22','40','31','32','30','1','2','10','11','7','12','3','0'],
  basketball: ['19','20','17','6','3','2','1','0','11','13','14','15','16','18','21','37','38','40','41'],
  baseball: ['8','2','3','4','5','6','1','7','9','10','11','16','35','37','43','47','48','53','36','39','44','45','41','42','56','57'],
  football: []
}

// Helper: build category objects from stat IDs using ESPN mappings, sorted by display order
// Optional reverseMap overrides is_negative from scoringItems' isReverseItem (most accurate source)
function buildEspnCategories(sport: string, statIds: string[], reverseMap?: Record<string, boolean>): { stat_id: string; name: string; display_name: string; is_negative?: boolean }[] {
  const statNames = getEspnStatNames(sport)
  const cats = statIds.map(sid => {
    const statId = parseInt(sid)
    const info = statNames[statId] || { name: `Stat ${statId}`, display: `S${statId}` }
    // Use isReverseItem from scoringItems if available, otherwise fall back to mapping
    const isNeg = reverseMap ? (reverseMap[sid] ?? info.isNegative) : info.isNegative
    return {
      stat_id: sid,
      name: info.name,
      display_name: info.display,
      is_negative: isNeg
    }
  })
  // Sort by ESPN's standard display order
  const order = ESPN_DISPLAY_ORDER[sport] || []
  if (order.length > 0) {
    cats.sort((a, b) => {
      const ai = order.indexOf(a.stat_id)
      const bi = order.indexOf(b.stat_id)
      if (ai === -1 && bi === -1) return 0
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    })
  }
  return cats
}

const defaultAvatar = computed(() => {
  if (isEspn.value) return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0NSIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwIiB5PSI1OCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzg4OCIgZm9udC1zaXplPSIxOCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPkVTUE48L3RleHQ+PC9zdmc+'
  return 'https://s.yimg.com/cv/apiv2/default/mlb/mlb_2_g.png'
})

// Helper to parse ESPN league key format: espn_hockey_1880415994_2025
function parseEspnLeagueKey(leagueKey: string) {
  if (typeof leagueKey === 'string' && leagueKey.startsWith('espn_')) {
    const parts = leagueKey.split('_')
    if (parts.length >= 4) {
      return { 
        sport: parts[1] as 'football' | 'baseball' | 'basketball' | 'hockey',
        leagueId: parts[2], 
        season: parseInt(parts[3]) || new Date().getFullYear() 
      }
    }
  }
  return { sport: 'baseball' as const, leagueId: leagueKey, season: new Date().getFullYear() }
}

const leagueInfo = computed(() => { const l = leagueStore.yahooLeague; return Array.isArray(l) ? l[0] || {} : l || {} })

// Get current sport type
const currentSport = computed(() => {
  if (isEspn.value) {
    const k = leagueStore.activeLeagueId
    if (k) {
      const { sport } = parseEspnLeagueKey(k)
      return sport
    }
  }
  return 'baseball'
})

const currentWeek = computed(() => {
  if (isEspn.value) {
    // Try yahooLeague first (holds ESPN data in same format)
    if (leagueInfo.value?.current_week) {
      console.log('[Matchups] currentWeek from leagueInfo:', leagueInfo.value.current_week)
      return parseInt(leagueInfo.value.current_week) || 1
    }
    // Try currentLeague
    if (leagueStore.currentLeague?.status?.currentMatchupPeriod) {
      console.log('[Matchups] currentWeek from currentLeague:', leagueStore.currentLeague.status.currentMatchupPeriod)
      return parseInt(leagueStore.currentLeague.status.currentMatchupPeriod) || 1
    }
    console.log('[Matchups] currentWeek defaulting to 1')
    return 1
  }
  return parseInt(leagueInfo.value?.current_week) || 1
})

const totalWeeks = computed(() => {
  if (isEspn.value) {
    if (leagueInfo.value?.end_week) {
      console.log('[Matchups] totalWeeks from leagueInfo:', leagueInfo.value.end_week)
      return parseInt(leagueInfo.value.end_week) || 25
    }
    if (leagueStore.currentLeague?.status?.finalMatchupPeriod) {
      console.log('[Matchups] totalWeeks from currentLeague:', leagueStore.currentLeague.status.finalMatchupPeriod)
      return parseInt(leagueStore.currentLeague.status.finalMatchupPeriod) || 25
    }
    console.log('[Matchups] totalWeeks defaulting to 25')
    return 25
  }
  return parseInt(leagueInfo.value?.end_week) || 25
})

const isSeasonComplete = computed(() => {
  if (isEspn.value) {
    if (leagueInfo.value?.is_finished === 1 || leagueInfo.value?.is_finished === true) {
      console.log('[Matchups] isSeasonComplete: true from leagueInfo')
      return true
    }
    if (leagueStore.currentLeague?.status?.isFinished) {
      console.log('[Matchups] isSeasonComplete: true from currentLeague')
      return true
    }
    console.log('[Matchups] isSeasonComplete: false')
    return false
  }
  return leagueInfo.value?.is_finished === 1 || leagueInfo.value?.is_finished === '1'
})

// Check if viewing current week (vs historical)
const isCurrentWeek = computed(() => {
  if (isSeasonComplete.value) return false
  const selected = parseInt(selectedWeek.value) || 0
  return selected === currentWeek.value
})

const currentSeason = computed(() => leagueStore.currentLeague?.season || new Date().getFullYear().toString())

const startWeek = computed(() => {
  if (isEspn.value) return 1
  return parseInt(leagueInfo.value?.start_week) || 1
})

const availableWeeks = computed(() => {
  const start = startWeek.value
  const end = isSeasonComplete.value ? totalWeeks.value : currentWeek.value
  const weeks = Array.from({ length: end - start + 1 }, (_, i) => start + i)
  console.log('[Matchups] availableWeeks:', weeks.length, 'weeks, start:', start, 'end:', end)
  return weeks
})
const allCategories = computed(() => {
  // Return ALL categories from the league settings - don't filter to predefined IDs
  // This ensures hockey, basketball, and any other sport's categories are shown
  return categories.value
})

// Get the start/end dates for a given matchup week from game weeks data
function getMatchupDates(weekNum: number): { start: string, end: string, totalDays: number, isExtended: boolean } | null {
  const gw = gameWeeks.value.find(w => w.week === weekNum)
  if (!gw || !gw.start || !gw.end) return null
  const startDate = new Date(gw.start + 'T00:00:00')
  const endDate = new Date(gw.end + 'T00:00:00')
  const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1
  return { start: gw.start, end: gw.end, totalDays, isExtended: totalDays > 7 }
}

// Calculate days remaining from today until matchup end date
function getMatchupDaysRemaining(weekNum: number, isCurrent: boolean): number {
  if (!isCurrent) return 0
  const md = getMatchupDates(weekNum)
  if (md) {
    const today = new Date()
    const endDate = new Date(md.end + 'T23:59:59')
    const diff = Math.ceil((endDate.getTime() - today.getTime()) / 86400000)
    return Math.max(0, diff)
  }
  // Fallback: standard 7-day week calculation
  const dayOfWeek = new Date().getDay()
  return (7 - dayOfWeek) % 7
}

// For extended matchups, determine which sub-week (0-indexed) we're in and total sub-weeks
function getMatchupSubWeekInfo(weekNum: number): { subWeek: number, totalSubWeeks: number, subWeekStartDate: string, subWeekDates: string[] } {
  const md = getMatchupDates(weekNum)
  if (!md || !md.isExtended) {
    return { subWeek: 0, totalSubWeeks: 1, subWeekStartDate: '', subWeekDates: [] }
  }
  const startDate = new Date(md.start + 'T00:00:00')
  const today = new Date()
  const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / 86400000)
  const subWeek = Math.floor(daysSinceStart / 7)
  const totalSubWeeks = Math.ceil(md.totalDays / 7)
  
  // Calculate the Mon-Sun dates for this sub-week
  const subWeekStart = new Date(startDate)
  subWeekStart.setDate(subWeekStart.getDate() + subWeek * 7)
  const endDate = new Date(md.end + 'T00:00:00')
  const subWeekDates: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(subWeekStart)
    d.setDate(subWeekStart.getDate() + i)
    if (d > endDate) break
    subWeekDates.push(d.toISOString().split('T')[0])
  }
  
  return { subWeek, totalSubWeeks, subWeekStartDate: subWeekStart.toISOString().split('T')[0], subWeekDates }
}

// Get ALL dates from matchup start up to (and including) a given date
function getMatchupDatesThrough(weekNum: number, throughDate: string): string[] {
  const md = getMatchupDates(weekNum)
  if (!md) return []
  const startDate = new Date(md.start + 'T00:00:00')
  const endDate = new Date(throughDate + 'T00:00:00')
  const dates: string[] = []
  const d = new Date(startDate)
  while (d <= endDate) {
    dates.push(d.toISOString().split('T')[0])
    d.setDate(d.getDate() + 1)
  }
  return dates
}

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
  const c1 = '#06b6d4' // cyan
  const c2 = '#f97316' // orange
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
  const hasHistory = (s1.weeksPlayed || 0) > 0 || (s2.weeksPlayed || 0) > 0
  if (!hasHistory) {
    return [
      { label: 'Record', team1Value: '—', team2Value: '—', team1Better: false, team2Better: false },
      { label: 'Avg Cats/Week', team1Value: '—', team2Value: '—', team1Better: false, team2Better: false },
      { label: 'Most Cats Won', team1Value: '—', team2Value: '—', team1Better: false, team2Better: false },
      { label: 'Least Cats Won', team1Value: '—', team2Value: '—', team1Better: false, team2Better: false },
      { label: 'Consistency (σ)', team1Value: '—', team2Value: '—', team1Better: false, team2Better: false }
    ]
  }
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
function getCategoryAvg(k: string, id: string): number | null { 
  const avgs = teamSeasonStats.value.get(k)?.categoryAvgs
  if (!avgs || !(id in avgs)) return null
  return avgs[id]
}
function getCategoryHigh(k: string, id: string): number | null { 
  const highs = teamSeasonStats.value.get(k)?.categoryHighs
  if (!highs || !(id in highs)) return null
  return highs[id]
}
// Build a set of stat IDs that are percentage categories (display_name contains "%")
function isPercentageStat(id: string): boolean {
  const cat = categories.value.find((c: any) => String(c.stat_id) === id)
  return !!(cat && (cat.display_name || cat.name || '').includes('%'))
}
// Build a set of stat IDs that are ratio categories (display_name contains "/")
function isRatioStat(id: string): boolean {
  const cat = categories.value.find((c: any) => String(c.stat_id) === id)
  return !!(cat && (cat.display_name || cat.name || '').includes('/'))
}
function formatStat(v: number | null, id: string) {
  if (v === null || v === undefined) return '—'
  if (isPercentageStat(id)) return (v * 100).toFixed(1) + '%'
  if (isRatioStat(id)) return v.toFixed(2)
  // Yahoo ERA/WHIP and ESPN GAA/SV%-like stats that need decimal formatting
  if (['26','27'].includes(id)) return v.toFixed(2)
  // ESPN hockey: GAA (stat 10) needs decimal formatting
  if (id === '10' && v > 0 && v < 20) return v.toFixed(3)
  // ESPN hockey: ATOI (stat 27 for ESPN) — if value > 100, it's likely in seconds, convert to mm:ss
  // Note: stat 27 is already handled by the isRatioStat/display check above via display_name
  return Math.round(v).toString()
}
function generateScoutingReport(teamKey: string) {
  const stats = teamSeasonStats.value.get(teamKey)
  if (!stats) return { recentForm: [], strengths: [], weaknesses: [] }
  
  // Get recent form from weekly wins data
  const recentForm: string[] = []
  const weeklyWins = stats.weeklyWins || []
  const numCategories = allCategories.value.length
  const midpoint = numCategories / 2
  
  // Last 5 weeks
  for (let i = Math.max(0, weeklyWins.length - 5); i < weeklyWins.length; i++) {
    const wins = weeklyWins[i]
    recentForm.push(wins > midpoint ? 'W' : wins < midpoint ? 'L' : 'T')
  }
  
  // Build strengths and weaknesses from category performance
  const strengths: string[] = []
  const weaknesses: string[] = []
  
  const categoryAvgs = stats.categoryAvgs || {}
  const categoryWinRates = stats.categoryWinRates || {}
  
  // Calculate category rankings based on win rates
  const catPerformance: { id: string, name: string, winRate: number }[] = []
  
  for (const cat of allCategories.value) {
    const winRate = categoryWinRates[cat.stat_id] || 0.5
    catPerformance.push({ 
      id: cat.stat_id, 
      name: cat.display_name || cat.name,
      winRate 
    })
  }
  
  // Sort by win rate
  catPerformance.sort((a, b) => b.winRate - a.winRate)
  
  // Top 3 are strengths
  for (let i = 0; i < Math.min(3, catPerformance.length); i++) {
    const cat = catPerformance[i]
    if (cat.winRate >= 0.5) {
      const pct = (cat.winRate * 100).toFixed(0)
      strengths.push(`${cat.name} (${pct}% win rate)`)
    }
  }
  
  // Bottom 3 are weaknesses
  for (let i = catPerformance.length - 1; i >= Math.max(0, catPerformance.length - 3); i--) {
    const cat = catPerformance[i]
    if (cat.winRate < 0.5) {
      const pct = (cat.winRate * 100).toFixed(0)
      weaknesses.push(`${cat.name} (${pct}% win rate)`)
    }
  }
  
  return { recentForm, strengths, weaknesses }
}

// Box-Muller transform to generate normally distributed random numbers
function randomNormal(mean: number, stdDev: number): number {
  const u1 = Math.random()
  const u2 = Math.random()
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return mean + z * stdDev
}

// Calculate per-category win probability using simulation
function calcCatWinProb(v1: number, v2: number, id: string, days: number) {
  const inv = isEspn.value ? ESPN_INVERSE_STATS.includes(id) : INVERSE_STATS.includes(id)
  // Volatility per day remaining (standard deviation)
  // Yahoo stat IDs
  const yahooVol: Record<string,number> = { '60':8,'7':3,'12':8,'16':2,'3':0.02,'55':0.02,'56':0.03,'28':0.5,'32':0.5,'42':15,'26':0.5,'27':0.15,'48':0.5 }
  // ESPN stat IDs (similar volatility concepts)
  const espnVol: Record<string,number> = { '2':8,'3':3,'4':8,'5':2,'8':0.02,'9':0.02,'10':0.03,'17':0.5,'20':0.5,'34':15,'18':0.5,'19':0.15,'32':0.5 }
  const vol = isEspn.value ? espnVol : yahooVol
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
// Clamp win probability: 0.1% min, 99.9% max while matchup is still active.
// Only allow exact 0/100 after the matchup is fully completed.
function clampWinProb(prob: number, isCompleted: boolean = false): number {
  if (isCompleted) return prob
  return Math.min(99.9, Math.max(0.1, prob))
}

function calcOverallWinProb(
  team1Stats: Record<string, number>,
  team2Stats: Record<string, number>,
  categoryIds: string[],
  days: number
): { team1: number, team2: number, avgT1Cats: number, avgT2Cats: number } {
  const SIMULATIONS = 10000
  let team1Wins = 0
  let team2Wins = 0
  let ties = 0
  let totalT1Cats = 0
  let totalT2Cats = 0
  
  // Volatility per category
  const yahooVol: Record<string,number> = { '60':8,'7':3,'12':8,'16':2,'3':0.02,'55':0.02,'56':0.03,'28':0.5,'32':0.5,'42':15,'26':0.5,'27':0.15,'48':0.5 }
  const espnVol: Record<string,number> = { '2':8,'3':3,'4':8,'5':2,'8':0.02,'9':0.02,'10':0.03,'17':0.5,'20':0.5,'34':15,'18':0.5,'19':0.15,'32':0.5 }
  const vol = isEspn.value ? espnVol : yahooVol
  const inverseStats = isEspn.value ? ESPN_INVERSE_STATS : INVERSE_STATS
  
  for (let sim = 0; sim < SIMULATIONS; sim++) {
    let t1CatsWon = 0
    let t2CatsWon = 0
    
    for (const catId of categoryIds) {
      const v1 = team1Stats[catId] || 0
      const v2 = team2Stats[catId] || 0
      const dailyVol = vol[catId] || 5
      const totalVol = dailyVol * Math.sqrt(Math.max(0.5, days))
      const isInverse = inverseStats.includes(catId)
      
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
    totalT1Cats += t1CatsWon
    totalT2Cats += t2CatsWon
  }
  
  // Calculate win probability (ties split evenly)
  const t1Prob = ((team1Wins + ties / 2) / SIMULATIONS) * 100
  const t2Prob = ((team2Wins + ties / 2) / SIMULATIONS) * 100
  
  return { 
    team1: Math.round(t1Prob * 100) / 100, 
    team2: Math.round(t2Prob * 100) / 100,
    avgT1Cats: Math.round(totalT1Cats / SIMULATIONS * 10) / 10,
    avgT2Cats: Math.round(totalT2Cats / SIMULATIONS * 10) / 10
  }
}

// Load historical category data to calculate avg and high per team per category
async function loadTeamSeasonStats(leagueKey: string, currentWeekNum: number) {
  try {
    // Get all teams
    const teams = leagueStore.yahooTeams
    const newStats = new Map<string, any>()
    const newMatchupHistory = new Map<string, any[]>()
    
    // Load matchups from ALL previous weeks in the season for complete series data
    const weekPromises: Promise<any>[] = []
    
    if (isEspn.value) {
      // ESPN historical data
      const { sport, leagueId, season } = parseEspnLeagueKey(leagueKey)
      
      for (let w = 1; w < currentWeekNum; w++) {
        weekPromises.push(espnService.getMatchups(sport, leagueId, season, w).then(data => ({ week: w, data })))
      }
      
      const allWeeksData = await Promise.all(weekPromises)
      
      // Track matchups between team pairs for lifetime series
      for (const weekResult of allWeeksData) {
        const weekNum = weekResult.week
        const weekMatchups = weekResult.data
        
        for (const matchup of weekMatchups) {
          if (!matchup.awayTeamId) continue // Skip bye weeks
          
          const homeKey = `espn_${leagueId}_${season}_${matchup.homeTeamId}`
          const awayKey = `espn_${leagueId}_${season}_${matchup.awayTeamId}`
          
          // Count category wins for each team from homePerCategoryResults
          let homeWins = 0, awayWins = 0
          if (matchup.homePerCategoryResults) {
            for (const result of Object.values(matchup.homePerCategoryResults)) {
              if (result === 'WIN') homeWins++
              else if (result === 'LOSS') awayWins++
            }
          }
          
          // Store in matchup history
          const pairKey = [homeKey, awayKey].sort().join('-')
          if (!newMatchupHistory.has(pairKey)) {
            newMatchupHistory.set(pairKey, [])
          }
          newMatchupHistory.get(pairKey)!.push({
            week: weekNum,
            team1Key: homeKey,
            team2Key: awayKey,
            team1Score: homeWins,
            team2Score: awayWins
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
            if (!matchup.awayTeamId) continue
            
            const homeKey = `espn_${leagueId}_${season}_${matchup.homeTeamId}`
            const awayKey = `espn_${leagueId}_${season}_${matchup.awayTeamId}`
            
            const isHome = team.team_key === homeKey
            const isAway = team.team_key === awayKey
            if (!isHome && !isAway) continue
            
            weeksPlayed++
            let catsWonThisWeek = 0
            
            // Count category wins from homePerCategoryResults
            if (matchup.homePerCategoryResults) {
              for (const [statId, result] of Object.entries(matchup.homePerCategoryResults)) {
                if (isHome && result === 'WIN') catsWonThisWeek++
                else if (isAway && result === 'LOSS') catsWonThisWeek++
                
                // Track stat values
                const statValue = isHome 
                  ? matchup.homeScoreByStat?.[statId]?.score 
                  : matchup.awayScoreByStat?.[statId]?.score
                if (statValue !== undefined) {
                  if (!categoryTotals[statId]) categoryTotals[statId] = []
                  categoryTotals[statId].push(parseFloat(statValue) || 0)
                }
              }
            }
            totalCatsWon += catsWonThisWeek
            weeklyWins.push(catsWonThisWeek)
          }
        }
        
        // Calculate averages and highs
        const categoryAvgs: Record<string, number> = {}
        const categoryHighs: Record<string, number> = {}
        
        for (const [statId, values] of Object.entries(categoryTotals)) {
          if (values.length > 0) {
            categoryAvgs[statId] = values.reduce((a, b) => a + b, 0) / values.length
            if (ESPN_INVERSE_STATS.includes(statId)) {
              categoryHighs[statId] = Math.min(...values)
            } else {
              categoryHighs[statId] = Math.max(...values)
            }
          }
        }
        
        // Calculate consistency
        const avgWins = weeklyWins.length > 0 ? weeklyWins.reduce((a, b) => a + b, 0) / weeklyWins.length : 0
        const variance = weeklyWins.length > 0 ? weeklyWins.reduce((sum, w) => sum + Math.pow(w - avgWins, 2), 0) / weeklyWins.length : 0
        const stdDev = Math.sqrt(variance)
        
        // Calculate category win rates
        const categoryWinRates: Record<string, number> = {}
        const categoryWinCounts: Record<string, { wins: number, total: number }> = {}
        
        for (const weekResult of allWeeksData) {
          for (const matchup of weekResult.data) {
            if (!matchup.awayTeamId) continue
            
            const homeKey = `espn_${leagueId}_${season}_${matchup.homeTeamId}`
            const awayKey = `espn_${leagueId}_${season}_${matchup.awayTeamId}`
            const isHome = team.team_key === homeKey
            const isAway = team.team_key === awayKey
            if (!isHome && !isAway) continue
            
            if (matchup.homePerCategoryResults) {
              for (const [statId, result] of Object.entries(matchup.homePerCategoryResults)) {
                if (!categoryWinCounts[statId]) categoryWinCounts[statId] = { wins: 0, total: 0 }
                categoryWinCounts[statId].total++
                if ((isHome && result === 'WIN') || (isAway && result === 'LOSS')) {
                  categoryWinCounts[statId].wins++
                }
              }
            }
          }
        }
        
        for (const [statId, counts] of Object.entries(categoryWinCounts)) {
          categoryWinRates[statId] = counts.total > 0 ? counts.wins / counts.total : 0.5
        }
        
        newStats.set(team.team_key, {
          record: `${team.wins || 0}-${team.losses || 0}`,
          wins: team.wins || 0,
          weeksPlayed,
          avgCatsPerWeek: weeksPlayed > 0 ? totalCatsWon / weeksPlayed : 0,
          mostCatsWon: weeklyWins.length > 0 ? Math.max(...weeklyWins) : 0,
          leastCatsWon: weeklyWins.length > 0 ? Math.min(...weeklyWins) : 0,
          stdDev: stdDev,
          categoryAvgs,
          categoryHighs,
          categoryWinRates,
          weeklyWins
        })
      }
    } else {
      // Yahoo historical data - start from league's start_week (not always 1)
      const histStart = startWeek.value
      for (let w = histStart; w < currentWeekNum; w++) {
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
          
          // Count category wins for each team (stat_winners already filtered by service)
          let t1Wins = 0, t2Wins = 0
          for (const sw of (matchup.stat_winners || [])) {
            if (sw.is_tied) continue
            if (sw.winner_team_key === t1.team_key) t1Wins++
            else if (sw.winner_team_key === t2.team_key) t2Wins++
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
            
            // Count category wins (stat_winners already filtered by service)
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
        
        // Calculate category win rates from historical matchups
        const categoryWinRates: Record<string, number> = {}
        const categoryWinCounts: Record<string, { wins: number, total: number }> = {}
        
        for (const weekResult of allWeeksData) {
          for (const matchup of weekResult.data) {
            if (!matchup.teams || matchup.teams.length < 2) continue
            const teamData = matchup.teams.find((t: any) => t.team_key === team.team_key)
            if (!teamData) continue
            
            for (const sw of (matchup.stat_winners || [])) {
              const statId = String(sw.stat_id)
              if (!categoryWinCounts[statId]) categoryWinCounts[statId] = { wins: 0, total: 0 }
              categoryWinCounts[statId].total++
              if (!sw.is_tied && sw.winner_team_key === team.team_key) {
                categoryWinCounts[statId].wins++
              }
            }
          }
        }
        
        for (const [statId, counts] of Object.entries(categoryWinCounts)) {
          categoryWinRates[statId] = counts.total > 0 ? counts.wins / counts.total : 0.5
        }
        
        newStats.set(team.team_key, {
          record: `${team.wins || 0}-${team.losses || 0}`,
          wins: team.wins || 0,
          weeksPlayed,
          avgCatsPerWeek: weeksPlayed > 0 ? totalCatsWon / weeksPlayed : 0,
          mostCatsWon: weeklyWins.length > 0 ? Math.max(...weeklyWins) : 0,
          leastCatsWon: weeklyWins.length > 0 ? Math.min(...weeklyWins) : 0,
          stdDev: stdDev,
          categoryAvgs,
          categoryHighs,
          categoryWinRates,
          weeklyWins
        })
      }
    }
    
    teamSeasonStats.value = newStats
  } catch (e) {
    console.error('Error loading team season stats:', e)
  }
}

async function loadCategories() {
  const k = leagueStore.activeLeagueId; if (!k) return
  try {
    if (isEspn.value) {
      // ESPN categories
      const { sport, leagueId, season } = parseEspnLeagueKey(k)
      console.log('[Matchups ESPN] Loading categories for league:', leagueId, 'season:', season, 'sport:', sport)
      
      const scoringSettings = await espnService.getScoringSettings(sport, leagueId, season)
      const scoringItems = scoringSettings?.scoringItems || []
      console.log(`[Matchups ESPN] scoringItems count: ${scoringItems.length}`)
      
      // Build initial categories from scoringItems (may be overridden by matchup data later)
      // NOTE: scoringItems is NOT always reliable for H2H category leagues (e.g., hockey).
      // The definitive category list comes from scoreByStat in actual matchup data.
      // loadMatchups() will rebuild categories from matchup data when available.
      const reverseMap: Record<string, boolean> = {}
      for (const item of scoringItems) {
        reverseMap[String(item.statId ?? item.id ?? 0)] = !!item.isReverseItem
      }
      const scoringCategories = buildEspnCategories(
        sport,
        scoringItems.map((item: any) => String(item.statId ?? item.id ?? 0)).filter((s: string) => s !== ''),
        reverseMap
      )
      
      // Store reverseMap for later use in matchup rebuild
      ;(window as any).__espnReverseMap = reverseMap
      
      categories.value = scoringCategories
      console.log(`[Matchups ESPN] ${scoringCategories.length} initial categories from scoringItems:`, scoringCategories.map((c: any) => `${c.stat_id}=${c.display_name}`))
      
      // Store schedule settings for extended matchup detection
      const scheduleSettings = scoringSettings?._scheduleSettings
      if (scheduleSettings?.matchupPeriods) {
        console.log(`[Matchups ESPN] Schedule has ${Object.keys(scheduleSettings.matchupPeriods).length} matchup periods`)
        for (const [mpId, spIds] of Object.entries(scheduleSettings.matchupPeriods)) {
          const periods = spIds as number[]
          if (periods.length > 1) {
            console.log(`[Matchups ESPN] ⚡ Extended matchup period ${mpId}: scoring periods ${periods.join(', ')}`)
          }
        }
      }
      
      console.log(`[Matchups ESPN ${sport}] Final`, categories.value.length, 'categories:', categories.value.map(c => `${c.stat_id}=${c.display_name}`))
    } else {
      // Yahoo categories
      const s = await yahooService.getLeagueScoringSettings(k)
      if (s?.stat_categories) categories.value = s.stat_categories.map((c: any) => ({ stat_id: String(c.stat?.stat_id || c.stat_id), name: c.stat?.name || c.name, display_name: c.stat?.display_name || c.display_name, is_only_display_stat: c.stat?.is_only_display_stat || c.is_only_display_stat })).filter((c: any) => c.stat_id && c.is_only_display_stat !== '1' && c.is_only_display_stat !== 1)
      // Fetch game week dates (for detecting extended matchups like Olympic breaks)
      try {
        gameWeeks.value = await yahooService.getGameWeeks(k)
        console.log('[Matchups] Loaded', gameWeeks.value.length, 'game weeks')
      } catch (e) { console.warn('[Matchups] Could not load game weeks:', e) }
    }
  } catch (e) { console.error('Error loading categories:', e) }
}

async function loadMatchups() {
  if (!selectedWeek.value) return
  const k = leagueStore.activeLeagueId; if (!k) return
  isLoading.value = true
  loadingMessage.value = 'Loading matchups...'
  loadingProgress.value = { currentStep: 'Initializing...', week: 0, maxWeek: parseInt(selectedWeek.value) }
  try {
    // Always reload categories for ESPN leagues to ensure we have the right sport's categories
    // (categories from a different sport may be cached from prior navigation)
    if (!categories.value.length || isEspn.value) {
      loadingProgress.value = { ...loadingProgress.value, currentStep: 'Loading scoring categories...' }
      categories.value = [] // Clear any stale categories
      await loadCategories()
    }
    const week = parseInt(selectedWeek.value)
    const isCurrent = week === currentWeek.value && !isSeasonComplete.value
    // Calculate actual days remaining in matchup (supports extended matchups like Olympic breaks)
    const days = getMatchupDaysRemaining(week, isCurrent)
    const matchupDates = getMatchupDates(week)
    if (matchupDates?.isExtended) {
      console.log(`[Matchups] Extended matchup detected: ${matchupDates.start} to ${matchupDates.end} (${matchupDates.totalDays} days, ${days} remaining)`)
    }
    
    // Load historical data to calculate avg/high for each team
    loadingProgress.value = { currentStep: 'Loading team season stats...', week, maxWeek: week }
    await loadTeamSeasonStats(k, week)
    
    loadingProgress.value = { currentStep: `Processing week ${week} matchups...`, week, maxWeek: week }
    
    const processed: any[] = []
    
    if (isEspn.value) {
      // ESPN matchups
      const { sport, leagueId, season } = parseEspnLeagueKey(k)
      console.log('[Matchups ESPN] Loading week', week, 'for league:', leagueId, 'season:', season, 'sport:', sport)
      console.log('[Matchups ESPN] selectedWeek.value:', selectedWeek.value)
      
      // DIAGNOSTIC: Dump current categories and scoring settings every time
      console.log('[Matchups ESPN DIAG] Current categories:', categories.value.map(c => `${c.stat_id}=${c.display_name}`).join(', '))
      console.log('[Matchups ESPN DIAG] Category count:', categories.value.length)
      
      // DIAGNOSTIC: Fetch and dump raw scoringSettings to see actual scoringItems
      try {
        const diagSettings = await espnService.getScoringSettings(sport, leagueId, season)
        const diagItems = diagSettings?.scoringItems || []
        console.log('[Matchups ESPN DIAG] Raw scoringItems count:', diagItems.length)
        console.log('[Matchups ESPN DIAG] Raw scoringItems FULL:', JSON.stringify(diagItems.map((item: any) => ({
          statId: item.statId,
          id: item.id,
          statSourceId: item.statSourceId,
          pointsOverride: item.pointsOverride,
          isReverseItem: item.isReverseItem,
          forTeamId: item.forTeamId,
          isScoringCategory: item.isScoringCategory
        }))))
        // Log first 3 items completely
        for (let i = 0; i < Math.min(3, diagItems.length); i++) {
          console.log(`[Matchups ESPN DIAG] scoringItem[${i}] ALL KEYS:`, JSON.stringify(diagItems[i]))
        }
      } catch (e) { console.warn('[Matchups ESPN DIAG] Settings fetch error:', e) }
      
      const raw = await espnService.getMatchups(sport, leagueId, season, week)
      console.log('[Matchups ESPN] Got', raw.length, 'matchups for week', week)
      
      if (raw.length > 0) {
        console.log('[Matchups ESPN] First matchup:', raw[0])
        console.log('[Matchups ESPN] First matchup matchupPeriodId:', raw[0].matchupPeriodId)
        // DIAGNOSTIC: Dump all available stat sources
        const m0 = raw[0]
        console.log('[Matchups ESPN DIAG] First matchup data sources:',
          `homePerCategoryResults=${m0.homePerCategoryResults ? Object.keys(m0.homePerCategoryResults).length : 'null'},`,
          `homeScoreByStat=${m0.homeScoreByStat ? Object.keys(m0.homeScoreByStat).length : 'null'},`,
          `homeValuesByStat=${m0.homeValuesByStat ? Object.keys(m0.homeValuesByStat).length : 'null'},`,
          `homeRosterEntries=${m0.homeRosterEntries ? m0.homeRosterEntries.length : 'null'}`)
        if (m0.homeValuesByStat) {
          console.log('[Matchups ESPN DIAG] homeValuesByStat:', JSON.stringify(m0.homeValuesByStat))
        }
        
        // FIX: Rebuild categories from actual matchup per-category RESULTS data.
        // ESPN's scoringItems is NOT reliable for H2H category leagues (especially hockey).
        // homePerCategoryResults only contains stats with WIN/LOSS/TIE results (i.e., actual scoring categories),
        // while homeScoreByStat contains ALL stats including informational/non-scoring ones (result: null).
        const matchupWithResults = raw.find((r: any) => r.homePerCategoryResults && Object.keys(r.homePerCategoryResults).length > 0)
        if (matchupWithResults) {
          const actualStatIds = Object.keys(matchupWithResults.homePerCategoryResults)
          const currentCatIds = new Set(categories.value.map((c: any) => c.stat_id))
          
          // Check if categories need rebuilding (different stat IDs)
          const needsRebuild = actualStatIds.length !== currentCatIds.size ||
            actualStatIds.some(id => !currentCatIds.has(id))
          
          if (needsRebuild) {
            console.log('[Matchups ESPN] ⚠️ scoringItems categories MISMATCH actual scoring categories from matchup data!')
            console.log('[Matchups ESPN]   scoringItems had:', [...currentCatIds].join(', '))
            console.log('[Matchups ESPN]   Actual scoring categories:', actualStatIds.join(', '))
            
            categories.value = buildEspnCategories(sport, actualStatIds, (window as any).__espnReverseMap)
            console.log('[Matchups ESPN] ✅ Rebuilt categories from matchup results:', categories.value.map((c: any) => `${c.stat_id}=${c.display_name}`))
          } else {
            console.log('[Matchups ESPN] ✅ Categories match matchup scoring data — no rebuild needed')
          }
        }
      }
      
      for (const m of raw) {
        if (!m.awayTeamId) continue // Skip bye weeks
        
        // Team keys must match the format used in yahooTeams: espn_leagueId_season_teamId
        const homeKey = `espn_${leagueId}_${season}_${m.homeTeamId}`
        const awayKey = `espn_${leagueId}_${season}_${m.awayTeamId}`
        
        // Find team info from yahooTeams (which holds ESPN team data)
        const homeTeam = leagueStore.yahooTeams.find(t => t.team_key === homeKey)
        const awayTeam = leagueStore.yahooTeams.find(t => t.team_key === awayKey)
        
        if (!homeTeam || !awayTeam) {
          console.log('[Matchups ESPN] Team not found:', homeKey, awayKey, 'Available keys:', leagueStore.yahooTeams.slice(0, 3).map(t => t.team_key))
          continue
        }
        
        let w1 = 0, w2 = 0, ties = 0
        const catProbs: Record<string, { team1: number, team2: number }> = {}
        const categoryIds: string[] = []
        const statWinners: any[] = []
        
        // Build stats and wins from homePerCategoryResults
        const homeStats: Record<string, number> = {}
        const awayStats: Record<string, number> = {}
        
        if (m.homePerCategoryResults) {
          // BEST: scoreByStat has per-category results AND values
          for (const [statId, result] of Object.entries(m.homePerCategoryResults)) {
            categoryIds.push(statId)
            
            const homeStatValue = m.homeScoreByStat?.[statId]?.score || 0
            const awayStatValue = m.awayScoreByStat?.[statId]?.score || 0
            homeStats[statId] = homeStatValue
            awayStats[statId] = awayStatValue
            
            if (result === 'WIN') {
              w1++
              statWinners.push({ stat_id: statId, winner_team_key: homeKey, is_tied: false })
            } else if (result === 'LOSS') {
              w2++
              statWinners.push({ stat_id: statId, winner_team_key: awayKey, is_tied: false })
            } else if (result === 'TIE') {
              ties++
              statWinners.push({ stat_id: statId, winner_team_key: null, is_tied: true })
            }
            
            catProbs[statId] = calcCatWinProb(homeStatValue, awayStatValue, statId, days)
          }
          console.log(`[Matchups ESPN] Used scoreByStat for stat values`)
        } else if (categories.value.length > 0) {
          // FALLBACK: scoreByStat was null. Try multiple data sources in order.
          // Priority: 1) match.valuesByStat  2) roster aggregation  3) team valuesByStat
          
          let homeVBS: Record<string, number> = {}
          let awayVBS: Record<string, number> = {}
          let statSource = 'none'
          
          // Source 1: Match-level valuesByStat (matchup-period cumulative stats)
          if (m.homeValuesByStat && Object.keys(m.homeValuesByStat).length > 0) {
            homeVBS = m.homeValuesByStat
            awayVBS = m.awayValuesByStat || {}
            statSource = 'match.valuesByStat'
          }
          
          // Source 2: Aggregate from rosterForMatchupPeriod (player-level stats)
          if (statSource === 'none' && m.homeRosterEntries && m.homeRosterEntries.length > 0) {
            // Aggregate player stats into team totals
            // For hockey/baseball, player stats use LOCAL IDs per statSourceId
            // Need to apply offset for goalie/pitcher stats to get global IDs
            const playerSourceOffsets: Record<string, Record<number, number>> = {
              hockey: { 0: 0, 1: 19 },    // Goalie stats: local 0→global 19 (W), etc.
              baseball: { 0: 0, 1: 35 },
              basketball: { 0: 0 },
              football: { 0: 0 }
            }
            const pOffsets = playerSourceOffsets[sport] || { 0: 0 }
            
            const aggregateRoster = (entries: any[]): Record<string, number> => {
              const totals: Record<string, number> = {}
              for (const entry of entries) {
                // Only count active lineup slots (not bench/IR)
                const lineupSlot = entry.lineupSlotId
                // Bench = 20/21, IR = 22/23/24 for most sports
                if (lineupSlot >= 20) continue
                
                const player = entry.playerPoolEntry?.player || entry.player || {}
                const statsArray = player.stats || []
                
                // Find the matchup-period stats (statSplitTypeId=0 is full period, statSourceId=0 is actual)
                const actualStats = statsArray.find((s: any) => s.statSourceId === 0 && s.statSplitTypeId === 0) ||
                                     statsArray.find((s: any) => s.statSourceId === 0) || {}
                
                if (actualStats.stats) {
                  // Determine source offset based on player position
                  // ESPN uses defaultPositionId: 5=G for hockey goalie, etc.
                  const isGoalie = sport === 'hockey' && player.defaultPositionId === 5
                  const isPitcher = sport === 'baseball' && player.defaultPositionId === 1
                  const sourceOffset = (isGoalie || isPitcher) ? (pOffsets[1] || 0) : 0
                  
                  for (const [localId, val] of Object.entries(actualStats.stats)) {
                    const globalId = String(parseInt(localId) + sourceOffset)
                    totals[globalId] = (totals[globalId] || 0) + (val as number)
                  }
                }
              }
              return totals
            }
            
            homeVBS = aggregateRoster(m.homeRosterEntries)
            awayVBS = m.awayRosterEntries ? aggregateRoster(m.awayRosterEntries) : {}
            statSource = 'rosterForMatchupPeriod'
          }
          
          // Source 3: Team-level valuesByStat (season totals — last resort)
          if (statSource === 'none') {
            const homeTeamData = m.homeTeam as any
            const awayTeamData = m.awayTeam as any
            homeVBS = homeTeamData?.valuesByStat || {}
            awayVBS = awayTeamData?.valuesByStat || {}
            statSource = 'team.valuesByStat (season totals)'
          }
          
          console.log(`[Matchups ESPN] Using ${statSource} for stats.`,
            `Home: ${Object.keys(homeVBS).length} stats, Away: ${Object.keys(awayVBS).length} stats`)
          
          for (const cat of categories.value) {
            const statId = cat.stat_id
            categoryIds.push(statId)
            
            const homeVal = homeVBS[statId] ?? 0
            const awayVal = awayVBS[statId] ?? 0
            homeStats[statId] = homeVal
            awayStats[statId] = awayVal
            
            // Determine winner: for negative stats (GAA, etc.) lower is better
            const isNeg = cat.is_negative
            if (homeVal === awayVal) {
              ties++
              statWinners.push({ stat_id: statId, winner_team_key: null, is_tied: true })
            } else {
              const homeWins = isNeg ? (homeVal < awayVal) : (homeVal > awayVal)
              if (homeWins) {
                w1++
                statWinners.push({ stat_id: statId, winner_team_key: homeKey, is_tied: false })
              } else {
                w2++
                statWinners.push({ stat_id: statId, winner_team_key: awayKey, is_tied: false })
              }
            }
            
            catProbs[statId] = calcCatWinProb(homeVal, awayVal, statId, days)
          }
        }
        
        // Monte Carlo simulation
        const op = calcOverallWinProb(homeStats, awayStats, categoryIds, days)
        
        // Use Monte Carlo average projected category wins
        const pj1 = Math.round(op.avgT1Cats)
        const pj2 = Math.round(op.avgT2Cats)
        const pjt = Math.max(0, categoryIds.length - pj1 - pj2)
        
        processed.push({
          matchup_id: processed.length + 1,
          team1: { team_key: homeKey, name: homeTeam.name, logo_url: homeTeam.logo_url, is_my_team: homeTeam.is_my_team || false },
          team2: { team_key: awayKey, name: awayTeam.name, logo_url: awayTeam.logo_url, is_my_team: awayTeam.is_my_team || false },
          team1Stats: homeStats, team2Stats: awayStats, team1CatWins: w1, team2CatWins: w2, ties, 
          team1Leading: w1 > w2, team2Leading: w2 > w1,
          team1WinProb: clampWinProb(op.team1), team2WinProb: clampWinProb(op.team2), 
          projectedTeam1Wins: pj1, projectedTeam2Wins: pj2, projectedTies: pjt, 
          categoryWinProbs: catProbs, stat_winners: statWinners
        })
      }
      
      console.log('[Matchups ESPN] Processed', processed.length, 'matchups')
    } else {
      // Yahoo matchups
      const raw = await yahooService.getCategoryMatchups(k, week)
      
      for (const m of raw) {
        if (!m.teams || m.teams.length < 2) continue
        const t1 = m.teams[0], t2 = m.teams[1]
        let w1 = 0, w2 = 0, ties = 0
        const catProbs: Record<string, { team1: number, team2: number }> = {}
        
        // Get category IDs from stat_winners (already filtered to scoring-only by service)
        const categoryIds: string[] = []
        for (const sw of (m.stat_winners || [])) {
          const id = String(sw.stat_id)
          categoryIds.push(id)
          if (sw.is_tied) { ties++; catProbs[id] = { team1: 50, team2: 50 } }
          else if (sw.winner_team_key === t1.team_key) w1++
          else if (sw.winner_team_key === t2.team_key) w2++
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
        
        // Use Monte Carlo average projected category wins
        const pj1 = Math.round(op.avgT1Cats)
        const pj2 = Math.round(op.avgT2Cats)
        const pjt = Math.max(0, categoryIds.length - pj1 - pj2)
        processed.push({
          matchup_id: processed.length + 1,
          team1: { team_key: t1.team_key, name: t1.name, logo_url: t1.logo_url, is_my_team: leagueStore.yahooTeams.find(x => x.team_key === t1.team_key)?.is_my_team || false },
          team2: { team_key: t2.team_key, name: t2.name, logo_url: t2.logo_url, is_my_team: leagueStore.yahooTeams.find(x => x.team_key === t2.team_key)?.is_my_team || false },
          team1Stats: t1.stats, team2Stats: t2.stats, team1CatWins: w1, team2CatWins: w2, ties, team1Leading: w1 > w2, team2Leading: w2 > w1,
          team1WinProb: clampWinProb(op.team1), team2WinProb: clampWinProb(op.team2), projectedTeam1Wins: pj1, projectedTeam2Wins: pj2, projectedTies: pjt, categoryWinProbs: catProbs, stat_winners: m.stat_winners
        })
      }
    }
    
    matchups.value = processed
  // Compute chart data for social graphic in background (after real chart renders)
  // Use setTimeout so it doesn't block selectMatchup/buildWinProbChart
  setTimeout(() => {
  const allDaysForCache = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const nowForCache = new Date()
  const hourForCache = nowForCache.getHours()
  const jsDayForCache = nowForCache.getDay()
  const dayMapForCache: Record<number, number> = { 1:0, 2:1, 3:2, 4:3, 5:4, 6:5, 0:6 }
  const todayIdxForCache = dayMapForCache[jsDayForCache]
  const lastCompletedForCache = hourForCache >= 3 ? todayIdxForCache - 1 : todayIdxForCache - 2
  const daysToShowForCache = !isCurrentWeek.value ? 7 : Math.max(0, lastCompletedForCache + 1)
  const sportForCache = currentSport.value
  const dailyWtsForCache = getDailyWeights(sportForCache)
  let cumWtForCache = 0
  const cumWtsForCache: number[] = []
  for (let i = 0; i < 7; i++) { cumWtForCache += dailyWtsForCache[i]; cumWtsForCache.push(cumWtForCache) }

  const weekMatchupsForCache = processed.map((m: any) => {
    const t1Stats = m.team1Stats || {}
    const t2Stats = m.team2Stats || {}
    const catIds = Object.keys(t1Stats)
    const d1: number[] = [], d2: number[] = [], labs: string[] = []

    for (let day = 0; day < daysToShowForCache; day++) {
      const t1c: Record<string,number> = {}, t2c: Record<string,number> = {}
      if (!isCurrentWeek.value) {
        for (const id of catIds) { t1c[id] = (parseFloat(t1Stats[id])||0)*cumWtsForCache[day]; t2c[id] = (parseFloat(t2Stats[id])||0)*cumWtsForCache[day] }
      } else {
        const refDay = Math.max(0, lastCompletedForCache)
        const frac = day <= refDay ? cumWtsForCache[day] / Math.max(0.01, cumWtsForCache[refDay]) : 1
        for (const id of catIds) { t1c[id] = (parseFloat(t1Stats[id])||0)*frac; t2c[id] = (parseFloat(t2Stats[id])||0)*frac }
      }
      const dLeft = 6 - day
      let p1: number, p2: number
      if (dLeft <= 0) {
        p1 = clampWinProb(m.team1WinProb||50, !isCurrentWeek.value)
        p2 = clampWinProb(m.team2WinProb||50, !isCurrentWeek.value)
      } else {
        const remFrac = 1 - cumWtsForCache[day]
        const refWt = !isCurrentWeek.value ? 1.0 : cumWtsForCache[Math.max(0, Math.min(lastCompletedForCache, day))]
        const t1e: Record<string,number> = {}, t2e: Record<string,number> = {}
        for (const id of catIds) {
          const f1 = !isCurrentWeek.value ? (parseFloat(t1Stats[id])||0) : (parseFloat(t1Stats[id])||0)/Math.max(0.01,refWt)
          const f2 = !isCurrentWeek.value ? (parseFloat(t2Stats[id])||0) : (parseFloat(t2Stats[id])||0)/Math.max(0.01,refWt)
          t1e[id]=f1*remFrac; t2e[id]=f2*remFrac
        }
        const mc = catIds.length > 0 ? runCategoryMonteCarloWithCumulative(t1c,t2c,t1e,t2e,catIds,dLeft) : {team1:50,team2:50}
        p1 = clampWinProb(mc.team1, false); p2 = clampWinProb(mc.team2, false)
      }
      d1.push(Math.round(p1*10)/10); d2.push(Math.round(p2*10)/10); labs.push(allDaysForCache[day])
    }
    // Add today's live point
    if (isCurrentWeek.value && todayIdxForCache < 7 && todayIdxForCache > lastCompletedForCache) {
      d1.push(Math.round(clampWinProb(m.team1WinProb||50,false)*10)/10)
      d2.push(Math.round(clampWinProb(m.team2WinProb||50,false)*10)/10)
      labs.push(allDaysForCache[todayIdxForCache])
    }
    return {
      matchupId: m.matchup_id,
      team1Name: m.team1?.name || '',
      team2Name: m.team2?.name || '',
      team1Logo: typeof m.team1?.logo_url === 'string' ? m.team1.logo_url : '',
      team2Logo: typeof m.team2?.logo_url === 'string' ? m.team2.logo_url : '',
      team1WinProb: m.team1WinProb || 50,
      team2WinProb: m.team2WinProb || 50,
      d1, d2, labels: labs
    }
  })
  matchupChartCache.setWeekMatchups(weekMatchupsForCache)
  console.log('[CategoryMatchups] Stored chart data for', weekMatchupsForCache.length, 'matchups in cache')
  }, 100) // end setTimeout — chart renders first, then cache computes in background
    const my = processed.find(m => m.team1.is_my_team || m.team2.is_my_team)
    if (my) selectMatchup(my); else if (processed.length) selectMatchup(processed[0])
  } catch (e) { console.error('Error loading matchups:', e) }
  finally { isLoading.value = false }
}

// Compute chart data for all matchups in the background and write to shared cache
function cacheAllMatchupCharts(allMatchups: any[]) {
  const isCompletedWeek = !isCurrentWeek.value
  const sport = currentSport.value
  const dailyWeights = getDailyWeights(sport)
  let cumulativeWeight = 0
  const cumulativeWeights: number[] = []
  for (let i = 0; i < 7; i++) {
    cumulativeWeight += dailyWeights[i]
    cumulativeWeights.push(cumulativeWeight)
  }
  const now = new Date()
  const hourOfDay = now.getHours()
  const dayOfWeek = now.getDay()
  const dayMap: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 }
  const todayIndex = dayMap[dayOfWeek]
  const lastCompletedDayIndex = hourOfDay >= 3 ? todayIndex - 1 : todayIndex - 2
  const daysToShow = isCompletedWeek ? 7 : Math.max(0, lastCompletedDayIndex + 1)
  const allDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const chartLabels = allDays.slice(0, daysToShow)

  for (const matchup of allMatchups) {
    const team1FinalStats = matchup.team1Stats || {}
    const team2FinalStats = matchup.team2Stats || {}
    const categoryIds = Object.keys(team1FinalStats)
    if (categoryIds.length === 0) continue

    const d1: number[] = []
    const d2: number[] = []

    for (let day = 0; day < daysToShow; day++) {
      const team1CumulativeStats: Record<string, number> = {}
      const team2CumulativeStats: Record<string, number> = {}
      const refDay = Math.max(0, lastCompletedDayIndex)
      const dayFraction = !isCompletedWeek
        ? (day <= refDay ? cumulativeWeights[day] / Math.max(0.01, cumulativeWeights[refDay]) : 1)
        : cumulativeWeights[day]
      for (const catId of categoryIds) {
        const v1 = parseFloat(team1FinalStats[catId]) || 0
        const v2 = parseFloat(team2FinalStats[catId]) || 0
        team1CumulativeStats[catId] = isCompletedWeek ? v1 * cumulativeWeights[day] : v1 * dayFraction
        team2CumulativeStats[catId] = isCompletedWeek ? v2 * cumulativeWeights[day] : v2 * dayFraction
      }
      const daysRemaining = 6 - day
      let team1Prob: number, team2Prob: number
      if (daysRemaining <= 0) {
        team1Prob = clampWinProb(matchup.team1WinProb || 50, isCompletedWeek)
        team2Prob = clampWinProb(matchup.team2WinProb || 50, isCompletedWeek)
      } else {
        const remainingFraction = 1 - cumulativeWeights[day]
        const refDayWeight = isCompletedWeek ? 1.0 : cumulativeWeights[Math.max(0, Math.min(lastCompletedDayIndex, day))]
        const team1ExpectedRemaining: Record<string, number> = {}
        const team2ExpectedRemaining: Record<string, number> = {}
        for (const catId of categoryIds) {
          const full1 = isCompletedWeek ? (parseFloat(team1FinalStats[catId]) || 0) : (parseFloat(team1FinalStats[catId]) || 0) / Math.max(0.01, refDayWeight)
          const full2 = isCompletedWeek ? (parseFloat(team2FinalStats[catId]) || 0) : (parseFloat(team2FinalStats[catId]) || 0) / Math.max(0.01, refDayWeight)
          team1ExpectedRemaining[catId] = full1 * remainingFraction
          team2ExpectedRemaining[catId] = full2 * remainingFraction
        }
        const mcResult = runCategoryMonteCarloWithCumulative(
          team1CumulativeStats, team2CumulativeStats,
          team1ExpectedRemaining, team2ExpectedRemaining,
          categoryIds, daysRemaining
        )
        team1Prob = clampWinProb(mcResult.team1, false)
        team2Prob = clampWinProb(mcResult.team2, false)
      }
      d1.push(Math.round(team1Prob * 10) / 10)
      d2.push(Math.round(team2Prob * 10) / 10)
    }

    // Add today's live point
    const todayLabels = [...chartLabels]
    if (!isCompletedWeek && todayIndex < 7 && todayIndex > lastCompletedDayIndex) {
      d1.push(Math.round(clampWinProb(matchup.team1WinProb || 50, false) * 10) / 10)
      d2.push(Math.round(clampWinProb(matchup.team2WinProb || 50, false) * 10) / 10)
      todayLabels.push(allDays[todayIndex])
    }

    const logo1 = typeof matchup.team1?.logo_url === 'string' ? matchup.team1.logo_url : ''
    const logo2 = typeof matchup.team2?.logo_url === 'string' ? matchup.team2.logo_url : ''
    matchupChartCache.set(
      matchup.matchup_id, d1, d2, todayLabels,
      matchup.team1WinProb || 50, matchup.team2WinProb || 50,
      logo1, logo2
    )
  }
  console.log('[CategoryMatchups] Pre-cached charts for', allMatchups.length, 'matchups')
}

function selectMatchup(m: any) {
  selectedMatchup.value = m
  nextTick(() => buildWinProbChart())
  if (window.innerWidth < 640 && winProbSectionRef.value) {
    setTimeout(() => winProbSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }
}

// Compute the 7 dates (Mon-Sun) for a given matchup week number
function getWeekDates(weekNum: number, currentWeekNum: number): string[] {
  const today = new Date()
  // Find Monday of current week
  const dayOfWeek = today.getDay() // 0=Sun, 1=Mon...
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const currentMonday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysFromMonday)
  
  // Calculate Monday of target week
  const weekDiff = weekNum - currentWeekNum
  const targetMonday = new Date(currentMonday)
  targetMonday.setDate(currentMonday.getDate() + weekDiff * 7)
  
  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(targetMonday)
    d.setDate(targetMonday.getDate() + i)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    dates.push(`${yyyy}-${mm}-${dd}`)
  }
  return dates
}

// Get daily weights for a sport (how stats are distributed across the week) - used by ESPN fallback
function getDailyWeights(sport: string): number[] {
  if (sport === 'baseball') return [0.14, 0.15, 0.15, 0.14, 0.14, 0.14, 0.14]
  if (sport === 'hockey') return [0.10, 0.15, 0.12, 0.16, 0.14, 0.17, 0.16]
  if (sport === 'basketball') return [0.12, 0.14, 0.15, 0.14, 0.15, 0.16, 0.14]
  return [1/7, 1/7, 1/7, 1/7, 1/7, 1/7, 1/7]
}

const chartLoading = ref(false)
const chartTitle = ref('Win Probability Trend')
const winProbSectionRef = ref<HTMLElement | null>(null)

async function buildWinProbChart() {
  if (!winProbChartEl.value || !selectedMatchup.value) return
  if (winProbChart) { winProbChart.destroy(); winProbChart = null }
  
  const matchup = selectedMatchup.value
  const allDayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  
  const isCompletedWeek = !isCurrentWeek.value
  const weekNum = parseInt(selectedWeek.value)
  const matchupDates = getMatchupDates(weekNum)
  const isExtended = matchupDates?.isExtended || false
  
  const now = new Date()
  const hourOfDay = now.getHours()
  const dayOfWeek = now.getDay()
  const dayMap: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 }
  const todayIndex = dayMap[dayOfWeek]
  
  // For extended matchups, determine sub-week info
  const subWeekInfo = isExtended ? getMatchupSubWeekInfo(weekNum) : null
  
  // Determine chart dates (the Mon-Sun currently being displayed)
  let chartDates: string[] = []
  let chartDayLabels: string[] = []
  let allPriorDates: string[] = [] // Dates before the chart sub-week (for cumulative base)
  
  if (isExtended && subWeekInfo && matchupDates) {
    chartDates = subWeekInfo.subWeekDates
    chartDayLabels = chartDates.map(d => {
      const dt = new Date(d + 'T12:00:00')
      return allDayLabels[dayMap[dt.getDay()] ?? 0] || d.slice(5)
    })
    // All dates from matchup start through the day before current sub-week start
    if (subWeekInfo.subWeekStartDate && subWeekInfo.subWeekStartDate > matchupDates.start) {
      const startDate = new Date(matchupDates.start + 'T00:00:00')
      const subStart = new Date(subWeekInfo.subWeekStartDate + 'T00:00:00')
      const d = new Date(startDate)
      while (d < subStart) {
        allPriorDates.push(d.toISOString().split('T')[0])
        d.setDate(d.getDate() + 1)
      }
    }
    console.log(`[WinProb Chart] Extended matchup: sub-week ${subWeekInfo.subWeek + 1} of ${subWeekInfo.totalSubWeeks}, ${allPriorDates.length} prior days, ${chartDates.length} chart days`)
  } else {
    const weekDatesArr = getWeekDates(weekNum, currentWeek.value)
    chartDates = weekDatesArr
    chartDayLabels = [...allDayLabels]
  }
  
  // Determine completed days in the chart sub-week
  const todayStr = now.toISOString().split('T')[0]
  const yesterdayDate = new Date(now)
  yesterdayDate.setDate(yesterdayDate.getDate() - (hourOfDay >= 3 ? 1 : 2))
  const lastCompletedDateStr = yesterdayDate.toISOString().split('T')[0]
  
  let daysToShowOnChart: number
  if (isCompletedWeek) {
    daysToShowOnChart = chartDates.length
  } else {
    // Count how many chart dates are completed (on or before lastCompletedDateStr)
    daysToShowOnChart = chartDates.filter(d => d <= lastCompletedDateStr).length
  }
  
  // For extended completed matchups past the current sub-week, show full 7 days
  if (isExtended && isCompletedWeek) {
    daysToShowOnChart = chartDates.length
  }
  
  if (daysToShowOnChart === 0 && isCompletedWeek) {
    console.log('[WinProb Chart] No completed days to show for completed week')
    return
  }
  
  const team1Key = matchup.team1?.team_key
  const team2Key = matchup.team2?.team_key
  
  const scoringCatIds = categories.value
    .filter((c: any) => c.is_only_display_stat !== '1' && c.is_only_display_stat !== 1)
    .map((c: any) => String(c.stat_id))
  
  if (scoringCatIds.length === 0 || !team1Key || !team2Key) {
    console.log('[WinProb Chart] Missing data - falling back to simple chart')
    buildSimpleWinProbChart(matchup, daysToShowOnChart, chartDayLabels)
    return
  }
  
  const isYahoo = !isEspn.value
  
  if (!isYahoo) {
    buildSimpleWinProbChart(matchup, daysToShowOnChart, chartDayLabels)
    return
  }
  
  chartLoading.value = true
  
  try {
    // Dates to fetch: prior dates (base cumulative) + chart dates (displayed)
    const chartDatesToFetch = chartDates.slice(0, daysToShowOnChart)
    const allDatesToFetch = [...allPriorDates, ...chartDatesToFetch]
    
    console.log('[WinProb Chart] Fetching real daily stats for', allDatesToFetch.length, 'total days (' + allPriorDates.length + ' prior +', chartDatesToFetch.length, 'chart)')
    
    // Fetch daily stats for both teams - all days in parallel
    const [team1DailyResults, team2DailyResults] = await Promise.all([
      Promise.all(allDatesToFetch.map(date => 
        yahooService.getTeamDailyStats(team1Key, date).catch(err => {
          console.warn(`[WinProb Chart] Failed to fetch ${team1Key} on ${date}:`, err)
          return {} as Record<string, string>
        })
      )),
      Promise.all(allDatesToFetch.map(date => 
        yahooService.getTeamDailyStats(team2Key, date).catch(err => {
          console.warn(`[WinProb Chart] Failed to fetch ${team2Key} on ${date}:`, err)
          return {} as Record<string, string>
        })
      ))
    ])
    
    // Build base cumulative from prior dates (pre-chart sub-week)
    const team1Cumulative: Record<string, number> = {}
    const team2Cumulative: Record<string, number> = {}
    
    for (let i = 0; i < allPriorDates.length; i++) {
      const t1Daily = team1DailyResults[i] || {}
      const t2Daily = team2DailyResults[i] || {}
      const allStatIds = new Set([...Object.keys(t1Daily), ...Object.keys(t2Daily), ...Object.keys(team1Cumulative), ...Object.keys(team2Cumulative)])
      for (const statId of allStatIds) {
        team1Cumulative[statId] = (team1Cumulative[statId] || 0) + (parseFloat(t1Daily[statId] || '0') || 0)
        team2Cumulative[statId] = (team2Cumulative[statId] || 0) + (parseFloat(t2Daily[statId] || '0') || 0)
      }
    }
    
    if (allPriorDates.length > 0) {
      console.log('[WinProb Chart] Base cumulative from', allPriorDates.length, 'prior days built')
    }
    
    // Now add chart days on top and run Monte Carlo at each
    const d1: number[] = []
    const d2: number[] = []
    
    // Calculate matchup end date for days remaining
    const matchupEndDate = matchupDates?.end || chartDates[chartDates.length - 1] || ''
    
    for (let day = 0; day < daysToShowOnChart; day++) {
      const fetchIndex = allPriorDates.length + day // offset by prior dates
      const t1Daily = team1DailyResults[fetchIndex] || {}
      const t2Daily = team2DailyResults[fetchIndex] || {}
      
      const allStatIds = new Set([...Object.keys(t1Daily), ...Object.keys(t2Daily), ...Object.keys(team1Cumulative), ...Object.keys(team2Cumulative)])
      for (const statId of allStatIds) {
        team1Cumulative[statId] = (team1Cumulative[statId] || 0) + (parseFloat(t1Daily[statId] || '0') || 0)
        team2Cumulative[statId] = (team2Cumulative[statId] || 0) + (parseFloat(t2Daily[statId] || '0') || 0)
      }
      
      const t1Stats: Record<string, number> = {}
      const t2Stats: Record<string, number> = {}
      for (const catId of scoringCatIds) {
        t1Stats[catId] = team1Cumulative[catId] || 0
        t2Stats[catId] = team2Cumulative[catId] || 0
      }
      
      // Days remaining = days from this chart date to matchup end
      const chartDate = chartDatesToFetch[day]
      const daysRemaining = matchupEndDate && chartDate
        ? Math.max(0, Math.round((new Date(matchupEndDate + 'T00:00:00').getTime() - new Date(chartDate + 'T00:00:00').getTime()) / 86400000))
        : 6 - day
      
      if (daysRemaining <= 0) {
        const inverseStats = INVERSE_STATS
        let w1 = 0, w2 = 0
        for (const catId of scoringCatIds) {
          const v1 = t1Stats[catId], v2 = t2Stats[catId]
          if (inverseStats.includes(catId)) {
            if (v1 < v2) w1++; else if (v2 < v1) w2++
          } else {
            if (v1 > v2) w1++; else if (v2 > v1) w2++
          }
        }
        d1.push(w1 > w2 ? 100 : w1 === w2 ? 50 : 0)
        d2.push(w2 > w1 ? 100 : w1 === w2 ? 50 : 0)
      } else {
        const mcResult = calcOverallWinProb(t1Stats, t2Stats, scoringCatIds, daysRemaining)
        d1.push(Math.round(clampWinProb(mcResult.team1) * 10) / 10)
        d2.push(Math.round(mcResult.team2 * 10) / 10)
      }
    }
    
    console.log('[WinProb Chart] Real data probabilities:', 
      d1.map((p, i) => `${chartDayLabels[i]}: ${p}%`).join(', '))
    
    // For current week: append today's live point
    const chartLabels = chartDayLabels.slice(0, daysToShowOnChart)
    const todayInChart = chartDates.indexOf(todayStr)
    const lastShownIndex = daysToShowOnChart - 1
    if (!isCompletedWeek && todayInChart > -1 && todayInChart > lastShownIndex) {
      d1.push(Math.round(clampWinProb(matchup.team1WinProb || 50) * 10) / 10)
      d2.push(Math.round(clampWinProb(matchup.team2WinProb || 50) * 10) / 10)
      chartLabels.push(chartDayLabels[todayInChart] || 'Now')
      console.log('[WinProb Chart] Added live point for', chartDayLabels[todayInChart], ':', matchup.team1WinProb, '/', matchup.team2WinProb)
    }
    
    // Add sub-week indicator to chart title if extended
    const chartTitle = isExtended && subWeekInfo 
      ? `Win Probability Trend (Week ${subWeekInfo.subWeek + 1} of ${subWeekInfo.totalSubWeeks})`
      : 'Win Probability Trend'
    
    renderWinProbChart(matchup, d1, d2, chartLabels, chartTitle)
  } catch (e) {
    console.error('[WinProb Chart] Error fetching daily stats, falling back:', e)
    buildSimpleWinProbChart(matchup, daysToShowOnChart, chartDayLabels)
  } finally {
    chartLoading.value = false
  }
}

// Fallback chart for ESPN or when Yahoo daily stats fail (uses estimation)
function buildSimpleWinProbChart(matchup: any, daysToShow: number, allDayLabels: string[]) {
  if (!winProbChartEl.value) return
  
  const isCompletedWeek = !isCurrentWeek.value
  const team1FinalStats = matchup.team1Stats || {}
  const team2FinalStats = matchup.team2Stats || {}
  const categoryIds = Object.keys(team1FinalStats)
  
  if (categoryIds.length === 0) return
  
  const team1FinalWins = matchup.team1CatWins || 0
  const team2FinalWins = matchup.team2CatWins || 0
  
  const sport = currentSport.value
  const dailyWeights = getDailyWeights(sport)
  let cumulativeWeight = 0
  const cumulativeWeights: number[] = []
  for (let i = 0; i < 7; i++) {
    cumulativeWeight += dailyWeights[i]
    cumulativeWeights.push(cumulativeWeight)
  }
  
  const now = new Date()
  const hourOfDay = now.getHours()
  const dayOfWeek = now.getDay()
  const dayMap: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 }
  const todayIndex = dayMap[dayOfWeek]
  const lastCompletedDayIndex = (hourOfDay >= 3 ? todayIndex - 1 : todayIndex - 2)
  
  const d1: number[] = []
  const d2: number[] = []
  
  for (let day = 0; day < daysToShow; day++) {
    let team1Prob: number, team2Prob: number
    
    if (day === 6 && isCompletedWeek) {
      const t1w = team1FinalWins > team2FinalWins
      const t2w = team2FinalWins > team1FinalWins
      team1Prob = t1w ? 100 : t2w ? 0 : 50
      team2Prob = t2w ? 100 : t1w ? 0 : 50
    } else {
      const team1CumulativeStats: Record<string, number> = {}
      const team2CumulativeStats: Record<string, number> = {}
      
      if (isCompletedWeek) {
        for (const catId of categoryIds) {
          team1CumulativeStats[catId] = (parseFloat(team1FinalStats[catId]) || 0) * cumulativeWeights[day]
          team2CumulativeStats[catId] = (parseFloat(team2FinalStats[catId]) || 0) * cumulativeWeights[day]
        }
      } else {
        const refDay = Math.max(0, lastCompletedDayIndex)
        const dayFraction = day <= refDay ? cumulativeWeights[day] / cumulativeWeights[refDay] : 1
        for (const catId of categoryIds) {
          team1CumulativeStats[catId] = (parseFloat(team1FinalStats[catId]) || 0) * dayFraction
          team2CumulativeStats[catId] = (parseFloat(team2FinalStats[catId]) || 0) * dayFraction
        }
      }
      
      const daysRemaining = 6 - day
      if (daysRemaining <= 0) {
        team1Prob = matchup.team1WinProb || 50
        team2Prob = matchup.team2WinProb || 50
      } else {
        const remainingFraction = 1 - cumulativeWeights[day]
        const team1ExpectedRemaining: Record<string, number> = {}
        const team2ExpectedRemaining: Record<string, number> = {}
        const refDayWeight = isCompletedWeek ? 1.0 : cumulativeWeights[Math.max(0, Math.min(lastCompletedDayIndex, day))]
        for (const catId of categoryIds) {
          const full1 = isCompletedWeek ? (parseFloat(team1FinalStats[catId]) || 0) : (parseFloat(team1FinalStats[catId]) || 0) / refDayWeight
          const full2 = isCompletedWeek ? (parseFloat(team2FinalStats[catId]) || 0) : (parseFloat(team2FinalStats[catId]) || 0) / refDayWeight
          team1ExpectedRemaining[catId] = full1 * remainingFraction
          team2ExpectedRemaining[catId] = full2 * remainingFraction
        }
        const mcResult = runCategoryMonteCarloWithCumulative(team1CumulativeStats, team2CumulativeStats, team1ExpectedRemaining, team2ExpectedRemaining, categoryIds, daysRemaining)
        team1Prob = mcResult.team1
        team2Prob = mcResult.team2
      }
    }
    
    d1.push(Math.round(clampWinProb(team1Prob, isCompletedWeek) * 10) / 10)
    d2.push(Math.round(clampWinProb(team2Prob, isCompletedWeek) * 10) / 10)
  }
  
  // For current week: append today's live point
  const chartLabels = allDayLabels.slice(0, daysToShow)
  if (!isCompletedWeek && todayIndex < 7 && todayIndex > lastCompletedDayIndex) {
    d1.push(Math.round((matchup.team1WinProb || 50) * 10) / 10)
    d2.push(Math.round((matchup.team2WinProb || 50) * 10) / 10)
    chartLabels.push(allDayLabels[todayIndex])
  }
  
  renderWinProbChart(matchup, d1, d2, chartLabels)
}

// Render the ApexCharts win probability chart
function renderWinProbChart(matchup: any, d1: number[], d2: number[], dayLabels: string[], title?: string) {
  if (!winProbChartEl.value) return
  if (winProbChart) { winProbChart.destroy(); winProbChart = null }
  // Cache for download/share — so the graphic exactly matches what's on screen
  cachedChartD1.value = [...d1]
  cachedChartD2.value = [...d2]
  cachedChartLabels.value = [...dayLabels]
  // Write to shared cache so social templates can read it
  const logo1 = matchup.team1?.logo_url || ''
  const logo2 = matchup.team2?.logo_url || ''
  matchupChartCache.set(
    matchup.matchup_id,
    d1, d2, dayLabels,
    matchup.team1WinProb || 50,
    matchup.team2WinProb || 50,
    typeof logo1 === 'string' ? logo1 : '',
    typeof logo2 === 'string' ? logo2 : ''
  )
  chartTitle.value = title || 'Win Probability Trend'
  
  const c1 = '#06b6d4' // cyan
  const c2 = '#f97316' // orange
  
  winProbChart = new ApexCharts(winProbChartEl.value, {
    chart: { type: 'area', height: 192, background: 'transparent', toolbar: { show: false }, zoom: { enabled: false }, animations: { enabled: true, speed: 500 } },
    series: [{ name: matchup.team1.name, data: d1 }, { name: matchup.team2.name, data: d2 }],
    colors: [c1, c2],
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.1, stops: [0, 100] } },
    stroke: { width: 2, curve: 'smooth' },
    xaxis: { categories: dayLabels, labels: { style: { colors: '#9ca3af', fontSize: '10px' } } },
    yaxis: { min: 0, max: 100, labels: { style: { colors: '#9ca3af', fontSize: '10px' }, formatter: (v: number) => `${v.toFixed(0)}%` } },
    legend: { show: true, position: 'top', labels: { colors: '#9ca3af' }, fontSize: '11px' },
    grid: { borderColor: '#374151', strokeDashArray: 3 },
    tooltip: { theme: 'dark', y: { formatter: (v: number) => `${v.toFixed(0)}%` } },
    markers: { size: 4, strokeWidth: 0, hover: { size: 6 } }
  })
  winProbChart.render()
}

// Monte Carlo simulation for category matchups with cumulative stats
function runCategoryMonteCarloWithCumulative(
  team1CurrentStats: Record<string, number>,
  team2CurrentStats: Record<string, number>,
  team1ExpectedRemaining: Record<string, number>,
  team2ExpectedRemaining: Record<string, number>,
  categoryIds: string[],
  daysRemaining: number
): { team1: number, team2: number } {
  const SIMULATIONS = 3000
  let team1Wins = 0
  let team2Wins = 0
  let ties = 0
  
  // Volatility per category - scales with remaining time
  const yahooVol: Record<string,number> = { '60':8,'7':3,'12':8,'16':2,'3':0.02,'55':0.02,'56':0.03,'28':0.5,'32':0.5,'42':15,'26':0.5,'27':0.15,'48':0.5 }
  const espnVol: Record<string,number> = { '2':8,'3':3,'4':8,'5':2,'8':0.02,'9':0.02,'10':0.03,'17':0.5,'20':0.5,'34':15,'18':0.5,'19':0.15,'32':0.5,'47':0.5,'48':0.15 }
  const vol = isEspn.value ? espnVol : yahooVol
  const inverseStats = isEspn.value ? ESPN_INVERSE_STATS : INVERSE_STATS
  
  // Variance scale based on days remaining
  const varianceScale = Math.sqrt(daysRemaining / 7)
  
  for (let sim = 0; sim < SIMULATIONS; sim++) {
    let t1CatsWon = 0
    let t2CatsWon = 0
    
    for (const catId of categoryIds) {
      const current1 = team1CurrentStats[catId] || 0
      const current2 = team2CurrentStats[catId] || 0
      const expected1 = team1ExpectedRemaining[catId] || 0
      const expected2 = team2ExpectedRemaining[catId] || 0
      
      // Calculate standard deviation for remaining stats
      const dailyVol = vol[catId] || 5
      const stdDev1 = expected1 * 0.3 * varianceScale + dailyVol * varianceScale
      const stdDev2 = expected2 * 0.3 * varianceScale + dailyVol * varianceScale
      
      // Project remaining stats with variance
      const remaining1 = Math.max(0, expected1 + randomNormal(0, stdDev1))
      const remaining2 = Math.max(0, expected2 + randomNormal(0, stdDev2))
      
      // Final projected stats
      const final1 = current1 + remaining1
      const final2 = current2 + remaining2
      
      const isInverse = inverseStats.includes(catId)
      
      // Determine category winner
      if (isInverse) {
        if (final1 < final2) t1CatsWon++
        else if (final2 < final1) t2CatsWon++
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
  
  return { team1: t1Prob, team2: t2Prob }
}

async function downloadMatchupAnalysis() {
  if (!selectedMatchup.value) return
  isDownloading.value = true
  
  try {
    const html2canvas = (await import('html2canvas')).default
    await generateMatchupAnalysisImage(selectedMatchup.value, html2canvas)
  } catch (error) {
    console.error('Error generating matchup image:', error)
    shareToast.value = 'error'
      setTimeout(() => { shareToast.value = 'idle' }, 4000)
  } finally {
    isDownloading.value = false
  }
}

async function downloadCategoryBreakdown() {
  if (!selectedMatchup.value) return
  isDownloadingCategories.value = true
  
  try {
    const html2canvas = (await import('html2canvas')).default
    await generateCategoryBreakdownImage(selectedMatchup.value, html2canvas)
  } catch (error) {
    console.error('Error generating category breakdown image:', error)
    shareToast.value = 'error'
      setTimeout(() => { shareToast.value = 'idle' }, 4000)
  } finally {
    isDownloadingCategories.value = false
  }
}

async function downloadAllMatchups() {
  if (!matchups.value.length) return
  isDownloadingAll.value = true
  
  try {
    const html2canvas = (await import('html2canvas')).default
    
    for (let i = 0; i < matchups.value.length; i++) {
      downloadProgress.value = `${i + 1}/${matchups.value.length}`
      await generateMatchupAnalysisImage(matchups.value[i], html2canvas)
      // Small delay between downloads
      await new Promise(r => setTimeout(r, 300))
    }
  } catch (error) {
    console.error('Error generating matchup images:', error)
    shareToast.value = 'error'
      setTimeout(() => { shareToast.value = 'idle' }, 4000)
  } finally {
    isDownloadingAll.value = false
    downloadProgress.value = ''
  }
}

// Generate Win Probability + Scouting Report image
async function generateMatchupAnalysisImage(matchup: any, html2canvas: any) {
  // Helper to load logo
  const loadLogo = async (): Promise<string> => {
    try {
      const response = await fetch('/UFD_V8.png')
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
      ctx.fillStyle = '#facc15'
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
        // Guard: logo_url must be a string, not an object
        const logoUrl = typeof team.logo_url === 'string' ? team.logo_url : ''
        img.src = logoUrl
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
  const team1Color = '#06b6d4'
  const team2Color = '#f97316'
  
  // Get scouting report data
  const team1Report = generateScoutingReport(matchup.team1.team_key)
  const team2Report = generateScoutingReport(matchup.team2.team_key)
  
  // Build scouting report HTML
  const buildScoutingHtml = (teamName: string, report: any, color: string, borderColor: string, bgRgba: string) => {
    const strengths = report.strengths.slice(0, 2).map((s: string) => `<div style="font-size: 13px; color: #d1d5db; margin-bottom: 4px; line-height: 1.3;">✓ ${s}</div>`).join('')
    const weaknesses = report.weaknesses.slice(0, 2).map((w: string) => `<div style="font-size: 13px; color: #d1d5db; margin-bottom: 4px; line-height: 1.3;">✗ ${w}</div>`).join('')
    const form = report.recentForm.map((r: string) => `
      <span style="display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; font-size: 14px; font-weight: bold; margin-right: 4px; background: ${r === 'W' ? 'rgba(34, 197, 94, 0.3)' : r === 'L' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(156, 163, 175, 0.3)'}; color: ${r === 'W' ? '#22c55e' : r === 'L' ? '#ef4444' : '#9ca3af'};">${r}</span>
    `).join('')
    
    return `
      <div style="padding: 14px; background: ${bgRgba}; border: 2px solid ${borderColor}; border-radius: 12px; margin-bottom: 10px;">
        <div style="font-weight: 800; color: ${color}; margin-bottom: 10px; font-size: 16px;">${teamName}</div>
        <div style="display: flex; gap: 16px;">
          <div style="flex: 1; min-width: 0;">
            ${strengths ? `<div style="margin-bottom: 8px;"><div style="font-size: 10px; font-weight: 800; color: #22c55e; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px;">Strengths</div>${strengths}</div>` : ''}
            ${weaknesses ? `<div><div style="font-size: 10px; font-weight: 800; color: #ef4444; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px;">Weaknesses</div>${weaknesses}</div>` : ''}
          </div>
          <div style="flex-shrink: 0;">
            <div style="font-size: 10px; color: #6b7280; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">Form</div>
            <div style="display: flex; align-items: center;">${form || '<span style="color: #6b7280; font-size: 12px;">No data</span>'}</div>
          </div>
        </div>
      </div>
    `
  }
  
  // Build win probability trend chart SVG
  // Use the SAME data that's displayed on screen (cached when chart was rendered)
  // Fall back to final win prob only if no chart has been rendered yet
  const winProb1 = matchup.team1WinProb || 50
  const winProb2 = matchup.team2WinProb || 50
  const team1ChartData: number[] = cachedChartD1.value.length > 0
    ? [...cachedChartD1.value]
    : [matchup.team1WinProb || 50]
  const team2ChartData: number[] = cachedChartD2.value.length > 0
    ? [...cachedChartD2.value]
    : [matchup.team2WinProb || 50]
  const chartLabels: string[] = cachedChartLabels.value.length > 0
    ? [...cachedChartLabels.value]
    : ['Now']
  
  // ── Chart SVG — styled to match the landing page card ──────────────────────
  const chartWidth = 640
  const chartHeight = 260
  // right padding 60 so the last data label pill doesn't clip off the edge
  const padding = { top: 40, right: 60, bottom: 50, left: 52 }
  const plotWidth = chartWidth - padding.left - padding.right
  const plotHeight = chartHeight - padding.top - padding.bottom

  const numPoints = team1ChartData.length
  const getX = (i: number) => padding.left + (numPoints > 1 ? (i / (numPoints - 1)) * plotWidth : plotWidth / 2)
  const getY = (val: number) => padding.top + plotHeight - (val / 100) * plotHeight
  const bottomY = padding.top + plotHeight

  // Build SVG paths + shaded fill areas
  let t1Path = '', t2Path = ''
  const t1xs: number[] = [], t1ys: number[] = []
  const t2xs: number[] = [], t2ys: number[] = []

  team1ChartData.forEach((val, i) => {
    const x = getX(i); const y = getY(val)
    t1xs.push(x); t1ys.push(y)
    t1Path += (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`)
  })
  team2ChartData.forEach((val, i) => {
    const x = getX(i); const y = getY(val)
    t2xs.push(x); t2ys.push(y)
    t2Path += (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`)
  })

  // Shaded fill: close path along bottom edge
  const t1FillPath = t1Path + ` L ${t1xs[t1xs.length-1]} ${bottomY} L ${t1xs[0]} ${bottomY} Z`
  const t2FillPath = t2Path + ` L ${t2xs[t2xs.length-1]} ${bottomY} L ${t2xs[0]} ${bottomY} Z`

  // Grid lines at 0%, 25%, 50%, 75%, 100%
  const gridLines = [0, 25, 50, 75, 100].map(val => {
    const y = getY(val)
    const isMid = val === 50
    return `
      <line x1="${padding.left}" y1="${y}" x2="${chartWidth - padding.right}" y2="${y}"
        stroke="${isMid ? '#4b5563' : '#262a3a'}" stroke-width="${isMid ? 1.5 : 1}"
        stroke-dasharray="${isMid ? '4 3' : '2 4'}"/>
      <text x="${padding.left - 8}" y="${y + 4}" text-anchor="end" font-size="11"
        font-weight="${isMid ? '700' : '500'}" fill="${isMid ? '#9ca3af' : '#4b5563'}"
        font-family="Helvetica Neue,Arial,sans-serif">${val}%</text>
    `
  }).join('')

  // X-axis labels
  const xLabels = chartLabels.map((label, i) => {
    const x = getX(i)
    return `<text x="${x}" y="${chartHeight - 10}" text-anchor="middle" font-size="12"
      font-weight="700" fill="#9ca3af" font-family="Helvetica Neue,Arial,sans-serif">${label}</text>`
  }).join('')

  // Data point labels — pill label goes ABOVE the dot for the favored team that day,
  // BELOW the dot for the underdog. This prevents overlap and visually communicates
  // who's winning on each day regardless of which team that is.
  let dataLabels = ''
  team1ChartData.forEach((val, i) => {
    const x = t1xs[i]; const y = t1ys[i]
    const label = val.toFixed(1)
    const lw = label.length * 7 + 10
    // Favored team (>50%) goes above, underdog goes below
    const t1Favored = val >= (team2ChartData[i] ?? 50)
    const labelY = t1Favored ? y - 26 : y + 9
    const textY  = t1Favored ? y - 13 : y + 22
    dataLabels += `
      <rect x="${x - lw/2}" y="${labelY}" width="${lw}" height="18" rx="4"
        fill="${team1Color}" opacity="0.92"/>
      <text x="${x}" y="${textY}" text-anchor="middle" font-size="11" font-weight="800"
        fill="#0a0c14" font-family="Helvetica Neue,Arial,sans-serif">${label}</text>
      <circle cx="${x}" cy="${y}" r="5" fill="${team1Color}" stroke="#0a0c14" stroke-width="1.5"/>
    `
  })
  team2ChartData.forEach((val, i) => {
    const x = t2xs[i]; const y = t2ys[i]
    const label = val.toFixed(1)
    const lw = label.length * 7 + 10
    // Mirror of team1: if team2 is favored (>50%) it goes above, otherwise below
    const t2Favored = val > (team1ChartData[i] ?? 50)
    const labelY = t2Favored ? y - 26 : y + 9
    const textY  = t2Favored ? y - 13 : y + 22
    dataLabels += `
      <rect x="${x - lw/2}" y="${labelY}" width="${lw}" height="18" rx="4"
        fill="${team2Color}" opacity="0.92"/>
      <text x="${x}" y="${textY}" text-anchor="middle" font-size="11" font-weight="800"
        fill="#0a0c14" font-family="Helvetica Neue,Arial,sans-serif">${label}</text>
      <circle cx="${x}" cy="${y}" r="5" fill="${team2Color}" stroke="#0a0c14" stroke-width="1.5"/>
    `
  })

  // Legend at bottom
  const legendY = chartHeight - 28
  const legendCenterX = chartWidth / 2
  const legend = `
    <circle cx="${legendCenterX - 90}" cy="${legendY}" r="5" fill="${team1Color}"/>
    <text x="${legendCenterX - 80}" y="${legendY + 4}" font-size="11" font-weight="700"
      fill="${team1Color}" font-family="Helvetica Neue,Arial,sans-serif">${matchup.team1.name}</text>
    <circle cx="${legendCenterX + 30}" cy="${legendY}" r="5" fill="${team2Color}"/>
    <text x="${legendCenterX + 40}" y="${legendY + 4}" font-size="11" font-weight="700"
      fill="${team2Color}" font-family="Helvetica Neue,Arial,sans-serif">${matchup.team2.name}</text>
  `

  const chartSvg = `
    <svg width="${chartWidth}" height="${chartHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${team1Color}" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="${team1Color}" stop-opacity="0.03"/>
        </linearGradient>
        <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${team2Color}" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="${team2Color}" stop-opacity="0.03"/>
        </linearGradient>
      </defs>
      ${gridLines}
      <path d="${t1FillPath}" fill="url(#g1)"/>
      <path d="${t2FillPath}" fill="url(#g2)"/>
      <path d="${t1Path}" fill="none" stroke="${team1Color}" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="${t2Path}" fill="none" stroke="${team2Color}" stroke-width="2.5" stroke-linejoin="round"/>
      ${xLabels}
      ${dataLabels}
      ${legend}
    </svg>
  `
  
  container.innerHTML = `
    <div style="background: linear-gradient(160deg, #0f1219 0%, #0a0c14 50%, #0d1117 100%); border-radius: 16px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); position: relative; overflow: hidden;">
      
      <!-- Top Yellow Bar with site name -->
      <div style="background: #facc15; padding: 10px 24px 10px 24px; text-align: center; overflow: visible;">
        <span style="font-size: 16px; font-weight: 700; color: #0a0c14; text-transform: uppercase; letter-spacing: 3px; display: block; margin-top: -17px;">Ultimate Fantasy Dashboard</span>
      </div>
      
      <!-- HEADER - Logo on left with text next to it -->
      <div style="display: flex; padding: 12px 24px 12px 24px; border-bottom: 1px solid rgba(250, 204, 21, 0.2); position: relative; z-index: 10;">
        ${logoBase64 ? `<img src="${logoBase64}" style="height: 70px; width: auto; flex-shrink: 0; margin-right: 24px; display: block;" />` : ''}
        <div style="flex: 1; margin-top: -5px;">
          <div style="font-size: 42px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 2px 8px rgba(250, 204, 21, 0.4); line-height: 42px; display: block;">Matchup</div>
          <div style="font-size: 20px; margin-top: 6px; font-weight: 600; line-height: 20px; display: block;">
            <span style="color: #e5e7eb;">${leagueName}</span>
            <span style="color: #6b7280; margin: 0 8px;">•</span>
            <span style="color: #facc15; font-weight: 700;">Week ${selectedWeek.value}</span>
          </div>
        </div>
      </div>
      
      <!-- Main content area -->
      <div style="padding: 16px 24px 12px 24px; position: relative;">
        
        <!-- Win Probability Section -->
        <div style="background: rgba(38, 42, 58, 0.4); border-radius: 12px; padding: 16px; margin-bottom: 16px; border: 1px solid rgba(250, 204, 21, 0.2);">
          <div style="text-align: center; margin-bottom: 16px;">
            <span style="font-size: 22px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 2px;">WIN PROBABILITY</span>
          </div>
          
          <!-- Team Probabilities -->
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
          
          <!-- Probability Bar -->
          <div style="height: 32px; background: linear-gradient(to right, ${team1Color} 0%, ${team1Color} ${Math.max(0, winProb1 - 8)}%, ${team2Color} ${Math.min(100, winProb1 + 8)}%, ${team2Color} 100%); border-radius: 16px; overflow: hidden; position: relative; margin-bottom: 16px; border: 2px solid #374151;">
            <div style="position: absolute; left: 0; top: 0; height: 100%; display: flex; align-items: center; padding-left: 12px;">
              <span style="color: white; font-weight: 800; font-size: 13px; text-shadow: 0 1px 3px rgba(0,0,0,0.4);">${matchup.team1.name.split(' ')[0]}</span>
            </div>
            <div style="position: absolute; right: 0; top: 0; height: 100%; display: flex; align-items: center; padding-right: 12px;">
              <span style="color: white; font-weight: 800; font-size: 13px; text-shadow: 0 1px 3px rgba(0,0,0,0.4);">${matchup.team2.name.split(' ')[0]}</span>
            </div>
          </div>
          
          <!-- Win Probability Trend Chart -->
          <div style="background: rgba(10, 12, 20, 0.6); border-radius: 10px; padding: 12px 8px 4px; margin-top: 4px;">
            <div style="font-size: 12px; font-weight: 800; color: #6b7280; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 4px; padding-left: 8px;">
              📈 WIN PROBABILITY TREND
            </div>
            <div style="font-size: 10px; color: #4b5563; padding-left: 8px; margin-bottom: 8px;">
              Win probability after each day based on real cumulative stats. 10,000 Monte Carlo simulations per day.
            </div>
            ${chartSvg}
          </div>
        </div>
        
        <!-- Scouting Reports -->
        <div style="background: rgba(38, 42, 58, 0.4); border-radius: 12px; padding: 16px; border: 1px solid rgba(250, 204, 21, 0.2);">
          <div style="text-align: center; margin-bottom: 12px;">
            <span style="font-size: 22px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 2px;">SCOUTING REPORTS</span>
          </div>
          ${buildScoutingHtml(matchup.team1.name, team1Report, team1Color, 'rgba(6, 182, 212, 0.3)', 'rgba(6, 182, 212, 0.08)')}
          ${buildScoutingHtml(matchup.team2.name, team2Report, team2Color, 'rgba(249, 115, 22, 0.3)', 'rgba(249, 115, 22, 0.08)')}
        </div>
      </div>
      
      <!-- Footer -->
      <div style="padding: 16px 24px; text-align: center; position: relative; z-index: 1;">
        <span style="font-size: 20px; font-weight: bold; color: #facc15; letter-spacing: -0.5px;">ultimatefantasydashboard.com</span>
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

  const team1Short = matchup.team1.name.split(' ')[0]
  const team2Short = matchup.team2.name.split(' ')[0]
  const _shareBlobPromise = new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png')
  })
  if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': _shareBlobPromise })])
    shareToast.value = 'success'
    setTimeout(() => { shareToast.value = 'idle' }, 3000)
  } else {
    const _shareUrl = URL.createObjectURL(await _shareBlobPromise)
    const link = document.createElement('a')
    link.download = `matchup-analysis-week${selectedWeek.value}-${team1Short}-vs-${team2Short}.png`
    link.href = _shareUrl
    link.click()
    URL.revokeObjectURL(_shareUrl)
  }
}

// Generate Category Breakdown image
async function generateCategoryBreakdownImage(matchup: any, html2canvas: any) {
  // Helper to load logo
  const loadLogo = async (): Promise<string> => {
    try {
      const response = await fetch('/UFD_V8.png')
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
      ctx.fillStyle = '#facc15'
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
        // Guard: logo_url must be a string, not an object
        const logoUrl = typeof team.logo_url === 'string' ? team.logo_url : ''
        img.src = logoUrl
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
  const team1Color = '#06b6d4'
  const team2Color = '#f97316'
  
  // Generate category rows
  const generateCategoryRow = (cat: any) => {
    const stat1 = getCategoryStat(matchup, cat.stat_id, 1)
    const stat2 = getCategoryStat(matchup, cat.stat_id, 2)
    const leader = getCategoryLeader(matchup, cat.stat_id)
    const winProb1 = getCategoryWinProb(matchup, cat.stat_id, 1)
    const winProb2 = getCategoryWinProb(matchup, cat.stat_id, 2)
    
    // Separate advantage indicators for each team
    const team1Adv = leader === 1 
      ? `<span style="color: ${team1Color}; font-size: 16px;">◀</span>` 
      : '<span style="color: #6b7280;">—</span>'
    const team2Adv = leader === 2 
      ? `<span style="color: ${team2Color}; font-size: 16px;">▶</span>` 
      : '<span style="color: #6b7280;">—</span>'
    
    const prob1Color = winProb1 >= 70 ? '#10b981' : winProb1 >= 40 ? '#f59e0b' : '#ef4444'
    const prob2Color = winProb2 >= 70 ? '#10b981' : winProb2 >= 40 ? '#f59e0b' : '#ef4444'
    
    return `
      <tr style="border-bottom: 1px solid rgba(58, 61, 82, 0.3);">
        <td style="padding: 8px 4px; text-align: center; color: ${prob1Color}; font-weight: 600; font-size: 11px;">${winProb1.toFixed(0)}%</td>
        <td style="padding: 8px 4px; text-align: center; color: #ffffff; font-weight: 700; font-size: 13px;">${formatStat(stat1, cat.stat_id)}</td>
        <td style="padding: 8px 4px; text-align: center; width: 30px;">${team1Adv}</td>
        <td style="padding: 8px 4px; text-align: center; color: #9ca3af; font-size: 11px; font-weight: 600;">${cat.display_name}</td>
        <td style="padding: 8px 4px; text-align: center; width: 30px;">${team2Adv}</td>
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
      
      <!-- Top Yellow Bar with site name -->
      <div style="background: #facc15; padding: 10px 24px 10px 24px; text-align: center; overflow: visible;">
        <span style="font-size: 16px; font-weight: 700; color: #0a0c14; text-transform: uppercase; letter-spacing: 3px; display: block; margin-top: -17px;">Ultimate Fantasy Dashboard</span>
      </div>
      
      <!-- HEADER - Logo on left with text next to it -->
      <div style="display: flex; padding: 12px 24px 12px 24px; border-bottom: 1px solid rgba(250, 204, 21, 0.2); position: relative; z-index: 10;">
        ${logoBase64 ? `<img src="${logoBase64}" style="height: 70px; width: auto; flex-shrink: 0; margin-right: 24px; display: block;" />` : ''}
        <div style="flex: 1; margin-top: -5px;">
          <div style="font-size: 42px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 2px 8px rgba(250, 204, 21, 0.4); line-height: 42px; display: block;">Matchup</div>
          <div style="font-size: 20px; margin-top: 6px; font-weight: 600; line-height: 20px; display: block;">
            <span style="color: #e5e7eb;">${leagueName}</span>
            <span style="color: #6b7280; margin: 0 8px;">•</span>
            <span style="color: #facc15; font-weight: 700;">Week ${selectedWeek.value}</span>
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
        
        <!-- Category Breakdown Table -->
        <div style="background: rgba(38, 42, 58, 0.3); border-radius: 12px; padding: 12px; border: 1px solid rgba(250, 204, 21, 0.2);">
          <h3 style="color: #facc15; font-size: 14px; margin: 0 0 12px 0; text-align: center; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Category Breakdown</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 1px solid rgba(250, 204, 21, 0.3);">
                <th style="padding: 6px 4px; text-align: center; color: ${team1Color}; font-size: 10px; text-transform: uppercase;">Win Prob</th>
                <th style="padding: 6px 4px; text-align: center; color: ${team1Color}; font-size: 10px; text-transform: uppercase;">Stat</th>
                <th style="padding: 6px 4px; width: 30px; text-align: center; color: ${team1Color}; font-size: 10px; text-transform: uppercase;">Adv</th>
                <th style="padding: 6px 4px; text-align: center; color: #6b7280; font-size: 10px; text-transform: uppercase;">Category</th>
                <th style="padding: 6px 4px; width: 30px; text-align: center; color: ${team2Color}; font-size: 10px; text-transform: uppercase;">Adv</th>
                <th style="padding: 6px 4px; text-align: center; color: ${team2Color}; font-size: 10px; text-transform: uppercase;">Stat</th>
                <th style="padding: 6px 4px; text-align: center; color: ${team2Color}; font-size: 10px; text-transform: uppercase;">Win Prob</th>
              </tr>
            </thead>
            <tbody>
              ${categoryRows}
            </tbody>
          </table>
        </div>
        
        <!-- Projected Final -->
        <div style="text-align: center; margin-top: 12px; padding: 8px; background: rgba(250, 204, 21, 0.1); border-radius: 8px;">
          <span style="font-size: 11px; color: #6b7280; text-transform: uppercase;">Projected Final: </span>
          <span style="font-size: 14px; font-weight: 700; color: #ffffff;">${matchup.projectedTeam1Wins}-${matchup.projectedTeam2Wins}-${matchup.projectedTies}</span>
          <span style="font-size: 11px; color: #6b7280;"> • </span>
          ${projectedWinnerText}
        </div>
      </div>
      
      <!-- Footer -->
      <div style="padding: 16px 24px; text-align: center; position: relative; z-index: 1;">
        <span style="font-size: 20px; font-weight: bold; color: #facc15; letter-spacing: -0.5px;">ultimatefantasydashboard.com</span>
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
  const team1Short = matchup.team1.name.split(' ')[0]
  const team2Short = matchup.team2.name.split(' ')[0]
      const _shareBlobPromise = new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png')
      })
      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': _shareBlobPromise })])
        shareToast.value = 'success'
        setTimeout(() => { shareToast.value = 'idle' }, 3000)
      } else {
        const _shareUrl = URL.createObjectURL(await _shareBlobPromise)
        const link = document.createElement('a')
        link.download = `category-breakdown-week${selectedWeek.value}-${team1Short}-vs-${team2Short}.png`
        link.href = _shareUrl
        link.click()
        URL.revokeObjectURL(_shareUrl)
      }
}

async function refreshData() { isRefreshing.value = true; await loadMatchups(); isRefreshing.value = false }

watch(() => leagueStore.yahooTeams, async () => {
  if (leagueStore.yahooTeams.length > 0) {
    console.log('[Matchups] yahooTeams loaded:', leagueStore.yahooTeams.length, 'teams')
    console.log('[Matchups] yahooLeague raw:', leagueStore.yahooLeague)
    console.log('[Matchups] leagueInfo:', leagueInfo.value)
    await loadCategories()
    const dw = isSeasonComplete.value ? totalWeeks.value : currentWeek.value
    console.log('[Matchups] Setting selectedWeek to:', dw, '(isComplete:', isSeasonComplete.value, 'total:', totalWeeks.value, 'current:', currentWeek.value, ')')
    if (dw >= 1) { selectedWeek.value = dw.toString(); loadMatchups() }
  }
}, { immediate: true })

onMounted(async () => { 
  if (authStore.user?.id) {
    if (isEspn.value) {
      // ESPN credentials are set in the store when league is selected
      console.log('[Matchups] ESPN platform detected')
    } else {
      await yahooService.initialize(authStore.user.id) 
    }
  }
})
</script>
