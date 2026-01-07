<template>
  <!-- Show Yahoo Baseball Home if Yahoo baseball league is active -->
  <YahooBaseballHome v-if="leagueStore.activePlatform === 'yahoo' && currentSport === 'baseball'" />
  
  <!-- Show Yahoo League Home for other Yahoo sports (football, etc.) -->
  <YahooLeagueHome v-else-if="leagueStore.activePlatform === 'yahoo'" />
  
  <!-- Show Sleeper League Home -->
  <div v-else class="space-y-8">
    <!-- Offseason Notice Banner -->
    <div class="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
      <div class="text-amber-400 text-xl flex-shrink-0">🏈</div>
      <div>
        <p class="text-amber-200 font-semibold">You're viewing the 2024 season</p>
        <p class="text-amber-200/70 text-sm mt-1">The 2025 season will automatically appear here closer to the NFL season kickoff.</p>
      </div>
    </div>

    <!-- Settings Gear at Top -->
    <div class="flex justify-end">
      <router-link to="/settings" class="p-2 rounded-lg bg-dark-card border border-dark-border hover:border-primary transition-colors">
        <svg class="w-6 h-6 text-dark-textMuted hover:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </router-link>
    </div>

    <!-- Hero Section - Current Week Matchups -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-dark-card to-dark-bg border border-dark-border">
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent"></div>
      
      <div class="relative p-6 md:p-8">
        <div class="flex items-center gap-3 mb-6">
          <div class="w-1.5 h-10 bg-primary rounded-full"></div>
          <div>
            <h1 class="text-3xl md:text-4xl font-black text-dark-text tracking-tight">{{ leagueName }}</h1>
            <p class="text-dark-textMuted text-base mt-1"><span class="text-amber-400 font-semibold">{{ currentSeason }} Season</span> • Week {{ currentWeek }}</p>
          </div>
        </div>

        <div v-if="isLoading" class="flex items-center justify-center py-12">
          <div class="text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-4 border-primary mx-auto mb-3"></div>
            <p class="text-dark-textMuted text-sm">Loading matchups...</p>
          </div>
        </div>

        <!-- Matchups Grid -->
        <div v-else-if="thisWeekMatchups.length > 0" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <router-link 
            v-for="matchup in thisWeekMatchups" 
            :key="matchup.matchup_id" 
            :to="'/matchups?week=' + currentWeek + '&matchup=' + matchup.matchup_id"
            class="bg-dark-bg/60 backdrop-blur rounded-xl p-4 border border-dark-border/50 hover:border-primary/50 hover:bg-dark-bg/80 transition-all cursor-pointer group"
          >
            <!-- Team 1 -->
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-3 flex-1 min-w-0">
                <div class="relative">
                  <img :src="matchup.team1_avatar" :alt="matchup.team1_name" 
                    :class="['w-10 h-10 rounded-full border-2 transition-colors', isMyTeam(matchup.team1_roster_id) ? 'border-primary ring-2 ring-primary/30' : 'border-dark-border group-hover:border-primary/50']"
                    @error="handleImageError" />
                  <div v-if="isMyTeam(matchup.team1_roster_id)" class="absolute -top-0.5 -left-0.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center shadow">
                    <span class="text-[8px] text-gray-900 font-bold">★</span>
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-bold text-sm text-dark-text truncate">{{ matchup.team1_name }}</div>
                  <div class="text-xs text-dark-textMuted">{{ matchup.team1_record }}</div>
                </div>
              </div>
              <div class="text-right pl-3">
                <div class="text-xl font-black text-dark-text">{{ matchup.team1_points.toFixed(1) }}</div>
                <div class="text-xs text-primary font-medium">proj {{ matchup.team1_projected.toFixed(0) }}</div>
              </div>
            </div>
            <div class="h-px bg-dark-border/50 my-2"></div>
            <!-- Team 2 -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3 flex-1 min-w-0">
                <div class="relative">
                  <img :src="matchup.team2_avatar" :alt="matchup.team2_name" 
                    :class="['w-10 h-10 rounded-full border-2 transition-colors', isMyTeam(matchup.team2_roster_id) ? 'border-primary ring-2 ring-primary/30' : 'border-dark-border group-hover:border-primary/50']"
                    @error="handleImageError" />
                  <div v-if="isMyTeam(matchup.team2_roster_id)" class="absolute -top-0.5 -left-0.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center shadow">
                    <span class="text-[8px] text-gray-900 font-bold">★</span>
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-bold text-sm text-dark-text truncate">{{ matchup.team2_name }}</div>
                  <div class="text-xs text-dark-textMuted">{{ matchup.team2_record }}</div>
                </div>
              </div>
              <div class="text-right pl-3">
                <div class="text-xl font-black text-dark-text">{{ matchup.team2_points.toFixed(1) }}</div>
                <div class="text-xs text-primary font-medium">proj {{ matchup.team2_projected.toFixed(0) }}</div>
              </div>
            </div>
          </router-link>
        </div>
        <div v-else class="text-center py-8 text-dark-textMuted">No matchups found for this week</div>
      </div>
    </div>

    <!-- League Leaders -->
    <div>
      <h2 class="text-2xl font-black text-dark-text mb-4 flex items-center gap-2">
        <span class="text-2xl">👑</span>League Leaders
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Most Points -->
        <div 
          @click="openLeaderModal('mostPoints')"
          class="group relative overflow-hidden rounded-xl bg-dark-card border border-yellow-500/20 hover:border-yellow-500/40 transition-all cursor-pointer"
        >
          <div class="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
          <div class="relative p-5">
            <div class="text-xs uppercase tracking-wider text-yellow-400 font-bold mb-3">Most Points</div>
            <div class="flex items-center gap-3 mb-3">
              <img :src="leaders.mostPoints.avatar" :alt="leaders.mostPoints.name" class="w-12 h-12 rounded-full border-2 border-yellow-500/50" @error="handleImageError" />
              <div class="flex-1 min-w-0">
                <div class="font-bold text-lg text-dark-text truncate">{{ leaders.mostPoints.name }}</div>
                <div class="text-sm text-dark-textMuted">{{ leaders.mostPoints.record }}</div>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <div class="text-2xl font-black text-yellow-400">{{ leaders.mostPoints.points.toFixed(1) }}</div>
              <div class="text-xs text-yellow-400/70 group-hover:text-yellow-400 transition-colors">Click for details →</div>
            </div>
          </div>
        </div>
        
        <!-- Best Record -->
        <div 
          @click="openLeaderModal('bestRecord')"
          class="group relative overflow-hidden rounded-xl bg-dark-card border border-green-500/20 hover:border-green-500/40 transition-all cursor-pointer"
        >
          <div class="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
          <div class="relative p-5">
            <div class="text-xs uppercase tracking-wider text-green-400 font-bold mb-3">Best Record</div>
            <div class="flex items-center gap-3 mb-3">
              <img :src="leaders.bestRecord.avatar" :alt="leaders.bestRecord.name" class="w-12 h-12 rounded-full border-2 border-green-500/50" @error="handleImageError" />
              <div class="flex-1 min-w-0">
                <div class="font-bold text-lg text-dark-text truncate">{{ leaders.bestRecord.name }}</div>
                <div class="text-sm text-dark-textMuted">{{ leaders.bestRecord.ppg.toFixed(1) }} PPG</div>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <div class="text-2xl font-black text-green-400">{{ leaders.bestRecord.wins }}-{{ leaders.bestRecord.losses }}</div>
              <div class="text-xs text-green-400/70 group-hover:text-green-400 transition-colors">Click for details →</div>
            </div>
          </div>
        </div>
        
        <!-- Best All-Play -->
        <div 
          @click="openLeaderModal('bestAllPlay')"
          class="group relative overflow-hidden rounded-xl bg-dark-card border border-blue-500/20 hover:border-blue-500/40 transition-all cursor-pointer"
        >
          <div class="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
          <div class="relative p-5">
            <div class="text-xs uppercase tracking-wider text-blue-400 font-bold mb-3">Best All-Play</div>
            <div class="flex items-center gap-3 mb-3">
              <img :src="leaders.bestAllPlay.avatar" :alt="leaders.bestAllPlay.name" class="w-12 h-12 rounded-full border-2 border-blue-500/50" @error="handleImageError" />
              <div class="flex-1 min-w-0">
                <div class="font-bold text-lg text-dark-text truncate">{{ leaders.bestAllPlay.name }}</div>
                <div class="text-sm text-dark-textMuted">{{ leaders.bestAllPlay.record }}</div>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <div class="text-2xl font-black text-blue-400">{{ leaders.bestAllPlay.allPlayWins }}-{{ leaders.bestAllPlay.allPlayLosses }}</div>
              <div class="text-xs text-blue-400/70 group-hover:text-blue-400 transition-colors">Click for details →</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Leader Comparison Modal -->
    <Teleport to="body">
      <div 
        v-if="showLeaderModal" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="closeLeaderModal"
      >
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
        <div class="relative bg-dark-elevated rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-dark-border">
          <!-- Header -->
          <div class="sticky top-0 z-10 px-6 py-4 border-b border-dark-border bg-dark-elevated flex items-center justify-between">
            <div>
              <h3 class="text-xl font-bold text-dark-text">{{ leaderModalTitle }}</h3>
              <p class="text-sm text-dark-textMuted">{{ currentSeason }} Season Leaderboard</p>
            </div>
            <button @click="closeLeaderModal" class="p-2 rounded-lg hover:bg-dark-border/50 transition-colors">
              <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <!-- Winner Highlight -->
          <div class="p-6 border-b border-dark-border" :class="leaderModalGradient">
            <div class="flex items-center gap-4">
              <img 
                :src="leaderModalData.leader?.avatar" 
                :alt="leaderModalData.leader?.name"
                class="w-16 h-16 rounded-full ring-4"
                :class="leaderModalRingColor"
                @error="handleImageError"
              />
              <div class="flex-1">
                <div class="text-xl font-bold text-dark-text">{{ leaderModalData.leader?.name }}</div>
                <div class="text-sm text-dark-textMuted">{{ leaderModalData.leader?.record }}</div>
              </div>
              <div class="text-right">
                <div class="text-3xl font-black" :class="leaderModalTextColor">{{ leaderModalValue }}</div>
                <div class="text-sm text-dark-textMuted">{{ leaderModalUnit }}</div>
              </div>
            </div>
          </div>
          
          <!-- Comparison Bar Chart -->
          <div class="p-6">
            <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-4">All Teams Comparison</h4>
            <div class="space-y-3">
              <div 
                v-for="(team, index) in leaderModalData.comparison" 
                :key="team.roster_id"
                class="flex items-center gap-3"
              >
                <div class="w-6 text-center">
                  <span 
                    class="text-sm font-bold"
                    :class="index === 0 ? leaderModalTextColor : 'text-dark-textMuted'"
                  >{{ index + 1 }}</span>
                </div>
                <img 
                  :src="team.avatar" 
                  :alt="team.name"
                  class="w-8 h-8 rounded-full"
                  @error="handleImageError"
                />
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-sm font-medium text-dark-text truncate">{{ team.name }}</span>
                  </div>
                  <div class="h-2.5 bg-dark-border rounded-full overflow-hidden">
                    <div 
                      class="h-full rounded-full transition-all duration-500"
                      :class="index === 0 ? leaderModalBarColor : 'bg-primary/60'"
                      :style="{ width: `${(team.value / leaderModalData.maxValue) * 100}%` }"
                    ></div>
                  </div>
                </div>
                <div class="w-20 text-right">
                  <span class="text-sm font-semibold" :class="index === 0 ? leaderModalTextColor : 'text-dark-text'">
                    {{ formatLeaderValue(team.value) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Quick Stats -->
          <div class="px-6 pb-6">
            <div class="grid grid-cols-3 gap-4 p-4 bg-dark-border/30 rounded-xl">
              <div class="text-center">
                <div class="text-lg font-bold text-dark-text">{{ standingsTeams.length }}</div>
                <div class="text-xs text-dark-textMuted">Teams</div>
              </div>
              <div class="text-center">
                <div class="text-lg font-bold text-dark-text">{{ leaderModalData.average?.toFixed(1) }}</div>
                <div class="text-xs text-dark-textMuted">Average</div>
              </div>
              <div class="text-center">
                <div class="text-lg font-bold text-dark-text">{{ leaderModalData.spread?.toFixed(1) }}</div>
                <div class="text-xs text-dark-textMuted">Spread</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
    
    <!-- Team Detail Modal -->
    <Teleport to="body">
      <div 
        v-if="showTeamDetailModal" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="closeTeamDetailModal"
      >
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
        <div class="relative bg-dark-elevated rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-dark-border">
          <!-- Header -->
          <div class="sticky top-0 z-10 px-6 py-4 border-b border-dark-border bg-dark-elevated flex items-center justify-between">
            <div class="flex items-center gap-4">
              <img 
                :src="selectedTeamDetail?.avatar_url" 
                :alt="selectedTeamDetail?.team_name"
                class="w-12 h-12 rounded-full ring-2 ring-primary"
                @error="handleImageError"
              />
              <div>
                <h3 class="text-xl font-bold text-dark-text">{{ selectedTeamDetail?.team_name }}</h3>
                <p class="text-sm text-dark-textMuted">{{ currentSeason }} Season Details</p>
              </div>
            </div>
            <button @click="closeTeamDetailModal" class="p-2 rounded-lg hover:bg-dark-border/50 transition-colors">
              <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <!-- Stats Overview -->
          <div class="p-6 border-b border-dark-border">
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div class="bg-dark-border/30 rounded-xl p-4 text-center">
                <div class="text-2xl font-black text-dark-text">{{ selectedTeamDetail?.wins }}-{{ selectedTeamDetail?.losses }}</div>
                <div class="text-xs text-dark-textMuted">Record</div>
              </div>
              <div class="bg-dark-border/30 rounded-xl p-4 text-center">
                <div class="text-2xl font-black text-primary">{{ selectedTeamDetail?.rank }}</div>
                <div class="text-xs text-dark-textMuted">Rank</div>
              </div>
              <div class="bg-dark-border/30 rounded-xl p-4 text-center">
                <div class="text-2xl font-black text-dark-text">{{ selectedTeamDetail?.all_play_wins }}-{{ selectedTeamDetail?.all_play_losses }}</div>
                <div class="text-xs text-dark-textMuted">All-Play</div>
              </div>
              <div class="bg-dark-border/30 rounded-xl p-4 text-center">
                <div class="text-2xl font-black text-dark-text">{{ teamDetailStats.ppg }}</div>
                <div class="text-xs text-dark-textMuted">PPG</div>
              </div>
            </div>
          </div>
          
          <!-- Weekly Scores Chart -->
          <div class="p-6 border-b border-dark-border">
            <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-4">Weekly Scores vs League Average</h4>
            <div class="h-64">
              <apexchart 
                v-if="teamDetailChartOptions" 
                type="line" 
                height="100%" 
                :options="teamDetailChartOptions" 
                :series="teamDetailChartSeries" 
              />
            </div>
          </div>
          
          <!-- Additional Stats -->
          <div class="p-6">
            <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-4">Season Breakdown</h4>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div class="bg-dark-border/20 rounded-xl p-4">
                <div class="text-lg font-bold text-green-400">{{ teamDetailStats.highScore }}</div>
                <div class="text-xs text-dark-textMuted">High Score</div>
              </div>
              <div class="bg-dark-border/20 rounded-xl p-4">
                <div class="text-lg font-bold text-red-400">{{ teamDetailStats.lowScore }}</div>
                <div class="text-xs text-dark-textMuted">Low Score</div>
              </div>
              <div class="bg-dark-border/20 rounded-xl p-4">
                <div class="text-lg font-bold text-dark-text">{{ teamDetailStats.totalPoints }}</div>
                <div class="text-xs text-dark-textMuted">Total Points</div>
              </div>
              <div class="bg-dark-border/20 rounded-xl p-4">
                <div class="text-lg font-bold text-dark-text">{{ teamDetailStats.pointsAgainst }}</div>
                <div class="text-xs text-dark-textMuted">Points Against</div>
              </div>
              <div class="bg-dark-border/20 rounded-xl p-4">
                <div class="text-lg font-bold" :class="teamDetailStats.pointDiff >= 0 ? 'text-green-400' : 'text-red-400'">
                  {{ teamDetailStats.pointDiff >= 0 ? '+' : '' }}{{ teamDetailStats.pointDiff }}
                </div>
                <div class="text-xs text-dark-textMuted">Point Differential</div>
              </div>
              <div class="bg-dark-border/20 rounded-xl p-4">
                <div class="text-lg font-bold text-dark-text">{{ teamDetailStats.winStreak }}</div>
                <div class="text-xs text-dark-textMuted">Current Streak</div>
              </div>
            </div>
            
            <!-- Week-by-Week Results -->
            <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mt-6 mb-4">Week-by-Week Results</h4>
            <div class="flex flex-wrap gap-2">
              <div 
                v-for="(result, idx) in teamDetailStats.weeklyResults" 
                :key="idx"
                class="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold"
                :class="result.won ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'"
                :title="`Week ${idx + 1}: ${result.points.toFixed(1)} pts vs ${result.opponent}`"
              >
                {{ result.won ? 'W' : 'L' }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Main Content Grid: Standings + Sidebar -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- LEFT: Standings Table (2/3 width) -->
      <div class="lg:col-span-2">
        <div class="card">
          <div class="card-header flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-2xl">🏆</span>
              <h2 class="card-title">League Standings</h2>
            </div>
            <div class="flex items-center gap-3">
              <button @click="downloadStandingsImage" :disabled="isGeneratingImage" class="px-4 py-2 bg-primary hover:bg-yellow-600 text-dark-bg font-semibold rounded-lg transition-colors text-sm disabled:opacity-50">
                {{ isGeneratingImage ? 'Generating...' : 'Share' }}
              </button>
              <div v-if="hasDivisions" class="flex items-center gap-2">
                <span class="text-sm text-dark-textMuted font-medium">Divisions</span>
                <button @click="showDivisions = !showDivisions" class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors" :class="showDivisions ? 'bg-primary' : 'bg-dark-border'">
                  <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform" :class="showDivisions ? 'translate-x-6' : 'translate-x-1'" />
                </button>
              </div>
            </div>
          </div>
          
          <!-- Mobile scroll hint -->
          <div class="sm:hidden px-4 py-2 bg-dark-border/30 border-b border-dark-border flex items-center justify-center gap-2 text-xs text-dark-textMuted">
            <svg class="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span>Swipe to see more columns</span>
          </div>
          
          <div class="card-body overflow-x-auto scrollbar-thin">
            <template v-if="showDivisions && hasDivisions">
              <div v-for="(teams, divisionName) in teamsByDivision" :key="divisionName" class="mb-8 last:mb-0">
                <div class="flex items-center gap-2 mb-4 pb-2 border-b border-primary/30">
                  <span class="text-primary">●</span>
                  <h3 class="text-lg font-bold text-dark-text">{{ divisionName }}</h3>
                </div>
                <StandingsTable :teams="teams" :show-highlights="true" @team-click="openTeamDetailModal" />
              </div>
            </template>
            <template v-else>
              <StandingsTable :teams="standingsTeams" :show-highlights="true" @team-click="openTeamDetailModal" />
            </template>
          </div>
        </div>
      </div>

      <!-- RIGHT: League News + Quick Stats -->
      <div class="flex flex-col gap-6">
        <!-- League News Card (moved above Quick Stats) -->
        <div class="card">
          <div class="card-header flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-2xl">📰</span>
              <h2 class="card-title">League News</h2>
            </div>
            <button 
              v-if="leagueNews" 
              @click="generateLeagueNews" 
              :disabled="isGeneratingNews"
              class="text-xs text-primary hover:text-yellow-500 font-medium"
            >
              {{ isGeneratingNews ? 'Generating...' : 'Refresh' }}
            </button>
          </div>
          <div class="card-body">
            <div v-if="leagueNews" class="text-sm text-dark-text leading-relaxed">
              {{ leagueNews }}
            </div>
            <div v-else class="text-center py-6">
              <div class="text-dark-border mb-3">
                <svg class="w-10 h-10 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <p class="text-dark-textMuted text-sm mb-3">AI-generated league insights</p>
              <button @click="generateLeagueNews" :disabled="isGeneratingNews" class="text-primary hover:text-yellow-500 text-sm font-semibold transition-colors disabled:opacity-50">
                {{ isGeneratingNews ? 'Generating...' : 'Generate News →' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Quick Stats Card -->
        <div class="card">
          <div class="card-header">
            <div class="flex items-center gap-2">
              <span class="text-2xl">📊</span>
              <h2 class="card-title">Quick Stats</h2>
            </div>
          </div>
          <div class="card-body">
            <div class="space-y-3">
              <!-- Best All-Play -->
              <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-border/20 transition-colors">
                <div class="w-9 h-9 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                  <img v-if="bestAllPlayTeam" :src="bestAllPlayTeam.avatar_url" class="w-full h-full object-cover" @error="handleImageError" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs text-dark-textMuted uppercase tracking-wide">Best All-Play</div>
                  <div class="font-semibold text-dark-text truncate text-sm">{{ bestAllPlayTeam?.team_name || 'N/A' }}</div>
                </div>
                <div class="text-sm font-bold text-green-400">{{ bestAllPlayTeam ? bestAllPlayTeam.all_play_wins + '-' + bestAllPlayTeam.all_play_losses : '-' }}</div>
              </div>
              <!-- Hottest Team -->
              <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-border/20 transition-colors">
                <div class="w-9 h-9 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                  <img v-if="hottestTeam" :src="hottestTeam.avatar_url" class="w-full h-full object-cover" @error="handleImageError" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs text-dark-textMuted uppercase tracking-wide">🔥 Hottest (Last 3)</div>
                  <div class="font-semibold text-dark-text truncate text-sm">{{ hottestTeam?.team_name || 'N/A' }}</div>
                </div>
                <div class="text-sm font-bold text-orange-400">{{ hottestTeam ? hottestTeam.last3Avg.toFixed(1) : '-' }}</div>
              </div>
              <!-- Most Transactions -->
              <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-border/20 transition-colors">
                <div class="w-9 h-9 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                  <img v-if="mostActiveManager" :src="mostActiveManager.avatar_url" class="w-full h-full object-cover" @error="handleImageError" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs text-dark-textMuted uppercase tracking-wide">Most Transactions</div>
                  <div class="font-semibold text-dark-text truncate text-sm">{{ mostActiveManager?.team_name || 'N/A' }}</div>
                </div>
                <div class="text-sm font-bold text-blue-400">{{ mostActiveManager ? mostActiveManager.transactions : '-' }}</div>
              </div>
              
              <div class="border-t border-dark-border my-2"></div>
              
              <!-- Worst All-Play -->
              <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-border/20 transition-colors">
                <div class="w-9 h-9 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                  <img v-if="worstAllPlayTeam" :src="worstAllPlayTeam.avatar_url" class="w-full h-full object-cover" @error="handleImageError" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs text-dark-textMuted uppercase tracking-wide">Worst All-Play</div>
                  <div class="font-semibold text-dark-text truncate text-sm">{{ worstAllPlayTeam?.team_name || 'N/A' }}</div>
                </div>
                <div class="text-sm font-bold text-red-400">{{ worstAllPlayTeam ? worstAllPlayTeam.all_play_wins + '-' + worstAllPlayTeam.all_play_losses : '-' }}</div>
              </div>
              <!-- Coldest Team -->
              <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-border/20 transition-colors">
                <div class="w-9 h-9 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                  <img v-if="coldestTeam" :src="coldestTeam.avatar_url" class="w-full h-full object-cover" @error="handleImageError" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs text-dark-textMuted uppercase tracking-wide">❄️ Coldest (Last 3)</div>
                  <div class="font-semibold text-dark-text truncate text-sm">{{ coldestTeam?.team_name || 'N/A' }}</div>
                </div>
                <div class="text-sm font-bold text-cyan-400">{{ coldestTeam ? coldestTeam.last3Avg.toFixed(1) : '-' }}</div>
              </div>
              <!-- Least Transactions -->
              <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-border/20 transition-colors">
                <div class="w-9 h-9 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                  <img v-if="leastActiveManager" :src="leastActiveManager.avatar_url" class="w-full h-full object-cover" @error="handleImageError" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs text-dark-textMuted uppercase tracking-wide">Least Transactions</div>
                  <div class="font-semibold text-dark-text truncate text-sm">{{ leastActiveManager?.team_name || 'N/A' }}</div>
                </div>
                <div class="text-sm font-bold text-purple-400">{{ leastActiveManager ? leastActiveManager.transactions : '-' }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Standings Chart -->
    <div class="card">
      <div class="card-header">
        <div class="flex items-center gap-2">
          <span class="text-2xl">📈</span>
          <h2 class="card-title">Standings Over Time</h2>
        </div>
        <p class="text-sm text-dark-textMuted mt-1">Track how team rankings have changed throughout the season</p>
      </div>
      
      <!-- Mobile scroll hint -->
      <div class="sm:hidden px-4 py-2 bg-dark-border/30 border-b border-dark-border flex items-center justify-center gap-2 text-xs text-dark-textMuted">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>Swipe left to see earlier weeks</span>
      </div>
      
      <div class="card-body">
        <template v-if="showDivisions && hasDivisions && divisionChartData.length > 0">
          <div class="space-y-6">
            <div v-for="(divData, divIdx) in divisionChartData" :key="divData.division" class="border border-dark-border rounded-xl p-4">
              <div class="mb-3 pb-2 border-b border-dark-border">
                <h3 class="text-lg font-bold text-primary flex items-center gap-2">
                  <span>●</span>{{ divData.division }}
                </h3>
              </div>
              <!-- Mobile: Scrollable container - scrolls to right on mount -->
              <div 
                :ref="el => setDivisionChartRef(el, divIdx)"
                class="overflow-x-auto scrollbar-thin -mx-4 px-4 sm:mx-0 sm:px-0"
              >
                <div class="relative" :style="{ minWidth: getMobileChartWidth(divData.options?.xaxis?.categories?.length || 0) }">
                  <apexchart v-if="divData.options" type="line" height="300" :options="getMobileChartOptions(divData.options)" :series="divData.series" />
                  <div v-for="(team, idx) in divData.teams" :key="'avatar-div-' + team.roster_id"
                    class="absolute pointer-events-none" :style="getAvatarPositionForDivision(team, divData.division, 300)">
                    <div class="relative">
                      <img :src="team.avatar_url" :alt="team.team_name"
                        :class="['w-6 h-6 sm:w-7 sm:h-7 rounded-full ring-2 object-cover', isMyTeam(team.roster_id) ? 'ring-primary' : 'ring-cyan-500/70']"
                        @error="handleImageError" />
                      <div v-if="isMyTeam(team.roster_id)" class="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full flex items-center justify-center">
                        <span class="text-[6px] text-gray-900 font-bold">★</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
        <template v-else>
          <!-- Mobile: Scrollable container - scrolls to right on mount -->
          <div 
            ref="mainChartScrollRef"
            class="overflow-x-auto scrollbar-thin -mx-6 px-6 sm:mx-0 sm:px-0"
          >
            <div class="relative" :style="{ minWidth: getMobileChartWidth(chartOptions?.xaxis?.categories?.length || 0) }">
              <apexchart v-if="chartOptions" type="line" :height="isMobile ? 300 : 400" :options="getMobileChartOptions(chartOptions)" :series="chartSeries" />
              <div v-for="(team, idx) in standingsTeams" :key="'avatar-' + team.roster_id"
                class="absolute pointer-events-none" :style="getAvatarPosition(team, isMobile ? 300 : 400)">
                <div class="relative">
                  <img :src="team.avatar_url" :alt="team.team_name"
                    :class="['w-6 h-6 sm:w-7 sm:h-7 rounded-full ring-2 object-cover', isMyTeam(team.roster_id) ? 'ring-primary' : 'ring-cyan-500/70']"
                    @error="handleImageError" />
                  <div v-if="isMyTeam(team.roster_id)" class="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full flex items-center justify-center">
                    <span class="text-[6px] text-gray-900 font-bold">★</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Playoff Predictor -->
    <PlayoffPredictor v-if="currentSeason" :season="currentSeason" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useSportStore } from '@/stores/sport'
import { sleeperService } from '@/services/sleeper'
import { useTeamCustomizations } from '@/composables/useTeamCustomizations'
import PlayoffPredictor from '@/components/PlayoffPredictor.vue'
import StandingsTable from '@/components/StandingsTable.vue'
import YahooLeagueHome from '@/components/YahooLeagueHome.vue'
import YahooBaseballHome from '@/components/YahooBaseballHome.vue'
import { calculateAllPlayRecord, calculateTransactionCount, getStandingsOverTime } from '@/utils/calculations'
import type { SleeperMatchup } from '@/types/sleeper'

const leagueStore = useLeagueStore()
const sportStore = useSportStore()
const { applyCustomizations } = useTeamCustomizations()

// Current sport for routing
const currentSport = computed(() => sportStore.activeSport)

// State
const isLoading = ref(true)
const isGeneratingImage = ref(false)
const isGeneratingNews = ref(false)
const showDivisions = ref(true)
const leagueNews = ref<string | null>(null)
const isMobile = ref(false)

// Chart scroll refs
const mainChartScrollRef = ref<HTMLElement | null>(null)
const divisionChartRefs = ref<(HTMLElement | null)[]>([])

function setDivisionChartRef(el: any, index: number) {
  divisionChartRefs.value[index] = el as HTMLElement
}

// Check for mobile screen size
function checkMobile() {
  isMobile.value = window.innerWidth < 640
}

// Scroll all chart containers to the right (most recent weeks)
function scrollChartsToRight() {
  if (!isMobile.value) return
  
  // Use nextTick to ensure DOM is updated
  setTimeout(() => {
    if (mainChartScrollRef.value) {
      mainChartScrollRef.value.scrollLeft = mainChartScrollRef.value.scrollWidth
    }
    divisionChartRefs.value.forEach(ref => {
      if (ref) {
        ref.scrollLeft = ref.scrollWidth
      }
    })
  }, 100)
}

// Get minimum width for chart container on mobile (50px per week)
function getMobileChartWidth(weekCount: number): string {
  if (!isMobile.value) return 'auto'
  const minWidth = Math.max(weekCount * 50, 300)
  return `${minWidth}px`
}

// Adjust chart options for mobile - disable zoom, adjust fonts
function getMobileChartOptions(options: any): any {
  if (!options) return options
  
  return {
    ...options,
    chart: {
      ...options.chart,
      toolbar: { show: false },
      zoom: { enabled: false },
      selection: { enabled: false },
      pan: { enabled: false }
    },
    xaxis: {
      ...options.xaxis,
      labels: {
        ...options.xaxis?.labels,
        style: { 
          colors: '#8b8ea1',
          fontSize: isMobile.value ? '10px' : '12px'
        },
        rotate: isMobile.value ? -45 : 0,
        rotateAlways: isMobile.value
      }
    },
    yaxis: {
      ...options.yaxis,
      labels: {
        ...options.yaxis?.labels,
        style: { 
          colors: '#8b8ea1',
          fontSize: isMobile.value ? '10px' : '12px'
        }
      }
    }
  }
}

// Computed
const leagueName = computed(() => leagueStore.historicalSeasons[0]?.name || 'Fantasy League')
const currentSeason = computed(() => leagueStore.historicalSeasons.length > 0 ? leagueStore.historicalSeasons[0].season : new Date().getFullYear().toString())
const currentWeek = computed(() => leagueStore.historicalSeasons[0]?.settings?.leg || 1)

function isMyTeam(rosterId: number): boolean {
  const rosters = leagueStore.historicalRosters.get(currentSeason.value) || []
  const roster = rosters.find(r => r.roster_id === rosterId)
  return roster?.owner_id === leagueStore.currentUserId
}

// Types
interface Matchup {
  matchup_id: number
  team1_name: string
  team1_avatar: string
  team1_points: number
  team1_projected: number
  team1_record: string
  team1_roster_id: number
  team2_name: string
  team2_avatar: string
  team2_points: number
  team2_projected: number
  team2_record: string
  team2_roster_id: number
}

interface Leader {
  name: string
  avatar: string
  points: number
  wins: number
  losses: number
  record: string
  ppg: number
  allPlayWins?: number
  allPlayLosses?: number
  roster_id?: number
}

interface TeamData {
  roster_id: number
  team_name: string
  avatar_url: string
  rank: number
  wins: number
  losses: number
  ties: number
  points_for: number
  points_against: number
  all_play_wins: number
  all_play_losses: number
  division?: number
  transactions?: number
  last3Avg?: number
}

// Matchups data
const thisWeekMatchups = ref<Matchup[]>([])
const playerProjections = ref<Map<string, any>>(new Map())

// Leaders
const leaders = ref<{ mostPoints: Leader; bestRecord: Leader; bestAllPlay: Leader }>({
  mostPoints: { name: '', avatar: '', points: 0, wins: 0, losses: 0, record: '', ppg: 0 },
  bestRecord: { name: '', avatar: '', points: 0, wins: 0, losses: 0, record: '', ppg: 0 },
  bestAllPlay: { name: '', avatar: '', points: 0, wins: 0, losses: 0, record: '', ppg: 0, allPlayWins: 0, allPlayLosses: 0 }
})

// Leader Modal State
const showLeaderModal = ref(false)
const selectedLeaderType = ref<'mostPoints' | 'bestRecord' | 'bestAllPlay'>('mostPoints')
const leaderModalData = ref<{
  leader: Leader | null
  comparison: { roster_id: number; name: string; avatar: string; value: number }[]
  maxValue: number
  average: number
  spread: number
}>({
  leader: null,
  comparison: [],
  maxValue: 0,
  average: 0,
  spread: 0
})

const leaderModalTitle = computed(() => {
  switch (selectedLeaderType.value) {
    case 'mostPoints': return 'Most Points'
    case 'bestRecord': return 'Best Record'
    case 'bestAllPlay': return 'Best All-Play Record'
    default: return ''
  }
})

const leaderModalGradient = computed(() => {
  switch (selectedLeaderType.value) {
    case 'mostPoints': return 'bg-gradient-to-r from-yellow-500/10 to-transparent'
    case 'bestRecord': return 'bg-gradient-to-r from-green-500/10 to-transparent'
    case 'bestAllPlay': return 'bg-gradient-to-r from-blue-500/10 to-transparent'
    default: return ''
  }
})

const leaderModalRingColor = computed(() => {
  switch (selectedLeaderType.value) {
    case 'mostPoints': return 'ring-yellow-500'
    case 'bestRecord': return 'ring-green-500'
    case 'bestAllPlay': return 'ring-blue-500'
    default: return 'ring-primary'
  }
})

const leaderModalTextColor = computed(() => {
  switch (selectedLeaderType.value) {
    case 'mostPoints': return 'text-yellow-400'
    case 'bestRecord': return 'text-green-400'
    case 'bestAllPlay': return 'text-blue-400'
    default: return 'text-primary'
  }
})

const leaderModalBarColor = computed(() => {
  switch (selectedLeaderType.value) {
    case 'mostPoints': return 'bg-yellow-500'
    case 'bestRecord': return 'bg-green-500'
    case 'bestAllPlay': return 'bg-blue-500'
    default: return 'bg-primary'
  }
})

const leaderModalValue = computed(() => {
  const leader = leaderModalData.value.leader
  if (!leader) return ''
  switch (selectedLeaderType.value) {
    case 'mostPoints': return leader.points.toFixed(1)
    case 'bestRecord': return `${leader.wins}-${leader.losses}`
    case 'bestAllPlay': return `${leader.allPlayWins}-${leader.allPlayLosses}`
    default: return ''
  }
})

const leaderModalUnit = computed(() => {
  switch (selectedLeaderType.value) {
    case 'mostPoints': return 'total points'
    case 'bestRecord': return 'win-loss record'
    case 'bestAllPlay': return 'all-play record'
    default: return ''
  }
})

function openLeaderModal(type: 'mostPoints' | 'bestRecord' | 'bestAllPlay') {
  selectedLeaderType.value = type
  
  // Build comparison data
  let comparison: { roster_id: number; name: string; avatar: string; value: number }[] = []
  
  if (type === 'mostPoints') {
    comparison = standingsTeams.value.map(t => ({
      roster_id: t.roster_id,
      name: t.team_name,
      avatar: t.avatar_url,
      value: t.points_for
    })).sort((a, b) => b.value - a.value)
  } else if (type === 'bestRecord') {
    comparison = standingsTeams.value.map(t => ({
      roster_id: t.roster_id,
      name: t.team_name,
      avatar: t.avatar_url,
      value: t.wins + (t.wins / (t.wins + t.losses + 0.001)) * 0.5 // wins + win% tiebreaker
    })).sort((a, b) => b.value - a.value)
    // Recalculate for display with just wins
    comparison = standingsTeams.value.map(t => ({
      roster_id: t.roster_id,
      name: t.team_name,
      avatar: t.avatar_url,
      value: t.wins
    })).sort((a, b) => {
      if (b.value !== a.value) return b.value - a.value
      const aTeam = standingsTeams.value.find(x => x.roster_id === a.roster_id)
      const bTeam = standingsTeams.value.find(x => x.roster_id === b.roster_id)
      return (bTeam?.points_for || 0) - (aTeam?.points_for || 0)
    })
  } else if (type === 'bestAllPlay') {
    comparison = standingsTeams.value.map(t => ({
      roster_id: t.roster_id,
      name: t.team_name,
      avatar: t.avatar_url,
      value: t.all_play_wins
    })).sort((a, b) => b.value - a.value)
  }
  
  const values = comparison.map(c => c.value)
  const maxValue = Math.max(...values)
  const average = values.reduce((a, b) => a + b, 0) / values.length
  const spread = maxValue - Math.min(...values)
  
  leaderModalData.value = {
    leader: leaders.value[type],
    comparison,
    maxValue,
    average,
    spread
  }
  
  showLeaderModal.value = true
}

function closeLeaderModal() {
  showLeaderModal.value = false
}

function formatLeaderValue(value: number): string {
  if (selectedLeaderType.value === 'mostPoints') {
    return value.toFixed(1)
  } else if (selectedLeaderType.value === 'bestRecord') {
    const team = standingsTeams.value.find(t => t.wins === value)
    if (team) return `${team.wins}-${team.losses}`
    return value.toString()
  } else if (selectedLeaderType.value === 'bestAllPlay') {
    const team = standingsTeams.value.find(t => t.all_play_wins === value)
    if (team) return `${team.all_play_wins}-${team.all_play_losses}`
    return value.toString()
  }
  return value.toString()
}

// Team Detail Modal State
const showTeamDetailModal = ref(false)
const selectedTeamDetail = ref<TeamData | null>(null)
const teamDetailChartOptions = ref<any>(null)
const teamDetailChartSeries = ref<any[]>([])
const teamDetailStats = ref({
  ppg: '0.0',
  highScore: '0.0',
  lowScore: '0.0',
  totalPoints: '0.0',
  pointsAgainst: '0.0',
  pointDiff: '0.0',
  winStreak: '0',
  weeklyResults: [] as { won: boolean; points: number; opponent: string }[]
})

function openTeamDetailModal(team: TeamData) {
  selectedTeamDetail.value = team
  
  // Calculate detailed stats
  const gamesPlayed = team.wins + team.losses + team.ties
  const ppg = gamesPlayed > 0 ? team.points_for / gamesPlayed : 0
  const pointDiff = team.points_for - team.points_against
  
  // Get weekly scores for this team
  const weeklyScores: number[] = []
  const weeklyResults: { won: boolean; points: number; opponent: string }[] = []
  const leagueAverages: number[] = []
  const weeks: number[] = []
  
  // Find this team's weekly matchups
  for (let week = 1; week < playoffWeekStart.value; week++) {
    const weekMatchups = matchupsByWeek.value.get(week) || []
    
    // Calculate league average for this week
    let weekTotal = 0
    let weekCount = 0
    weekMatchups.forEach(m => {
      if (m.points !== undefined && m.points !== null) {
        weekTotal += m.points
        weekCount++
      }
    })
    const weekAvg = weekCount > 0 ? weekTotal / weekCount : 0
    
    // Find this team's matchup
    const teamMatchup = weekMatchups.find(m => m.roster_id === team.roster_id)
    if (teamMatchup && teamMatchup.points !== undefined && teamMatchup.points !== null) {
      weeks.push(week)
      weeklyScores.push(teamMatchup.points)
      leagueAverages.push(weekAvg)
      
      // Find opponent
      const opponentMatchup = weekMatchups.find(m => 
        m.matchup_id === teamMatchup.matchup_id && m.roster_id !== team.roster_id
      )
      const opponentTeam = standingsTeams.value.find(t => t.roster_id === opponentMatchup?.roster_id)
      const opponentPoints = opponentMatchup?.points || 0
      
      weeklyResults.push({
        won: teamMatchup.points > opponentPoints,
        points: teamMatchup.points,
        opponent: opponentTeam?.team_name || 'Unknown'
      })
    }
  }
  
  // Calculate streak
  let streak = 0
  let streakType = ''
  for (let i = weeklyResults.length - 1; i >= 0; i--) {
    if (i === weeklyResults.length - 1) {
      streakType = weeklyResults[i].won ? 'W' : 'L'
      streak = 1
    } else if ((weeklyResults[i].won && streakType === 'W') || (!weeklyResults[i].won && streakType === 'L')) {
      streak++
    } else {
      break
    }
  }
  
  const highScore = weeklyScores.length > 0 ? Math.max(...weeklyScores) : 0
  const lowScore = weeklyScores.length > 0 ? Math.min(...weeklyScores) : 0
  
  teamDetailStats.value = {
    ppg: ppg.toFixed(1),
    highScore: highScore.toFixed(1),
    lowScore: lowScore.toFixed(1),
    totalPoints: team.points_for.toFixed(1),
    pointsAgainst: team.points_against.toFixed(1),
    pointDiff: pointDiff.toFixed(1),
    winStreak: `${streakType}${streak}`,
    weeklyResults
  }
  
  // Build chart
  teamDetailChartSeries.value = [
    {
      name: team.team_name,
      data: weeklyScores,
      color: '#f5c451'
    },
    {
      name: 'League Average',
      data: leagueAverages,
      color: '#6b7280'
    }
  ]
  
  teamDetailChartOptions.value = {
    chart: {
      type: 'line',
      toolbar: { show: false },
      background: 'transparent',
      animations: { enabled: true, speed: 500 }
    },
    stroke: { curve: 'smooth', width: [3, 2], dashArray: [0, 5] },
    markers: { size: [5, 0], strokeWidth: 0 },
    xaxis: {
      categories: weeks.map(w => `Wk ${w}`),
      labels: { style: { colors: '#8b8ea1' } },
      axisBorder: { color: '#3a3d52' },
      axisTicks: { color: '#3a3d52' }
    },
    yaxis: {
      labels: { 
        style: { colors: '#8b8ea1' },
        formatter: (v: number) => v.toFixed(0)
      }
    },
    grid: { borderColor: '#3a3d52', strokeDashArray: 4 },
    legend: { 
      show: true, 
      position: 'top',
      labels: { colors: '#8b8ea1' }
    },
    tooltip: { 
      theme: 'dark',
      y: { formatter: (v: number) => v.toFixed(1) + ' pts' }
    }
  }
  
  showTeamDetailModal.value = true
}

function closeTeamDetailModal() {
  showTeamDetailModal.value = false
  selectedTeamDetail.value = null
}

// Standings
const standingsTeams = ref<TeamData[]>([])
const matchupsByWeek = ref<Map<number, SleeperMatchup[]>>(new Map())
const playoffWeekStart = ref(15)

// Store standings over time for each division separately
const overallStandingsData = ref<Map<number, Map<number, number>>>(new Map())
const divisionStandingsData = ref<Map<string, Map<number, Map<number, number>>>>(new Map())

// Computed stats
const bestAllPlayTeam = computed(() => standingsTeams.value.length ? [...standingsTeams.value].sort((a, b) => b.all_play_wins - a.all_play_wins)[0] : null)
const worstAllPlayTeam = computed(() => standingsTeams.value.length ? [...standingsTeams.value].sort((a, b) => a.all_play_wins - b.all_play_wins)[0] : null)
const hottestTeam = computed(() => {
  const teams = standingsTeams.value.filter(t => t.last3Avg && t.last3Avg > 0)
  return teams.length ? [...teams].sort((a, b) => (b.last3Avg || 0) - (a.last3Avg || 0))[0] : null
})
const coldestTeam = computed(() => {
  const teams = standingsTeams.value.filter(t => t.last3Avg && t.last3Avg > 0)
  return teams.length ? [...teams].sort((a, b) => (a.last3Avg || 0) - (b.last3Avg || 0))[0] : null
})
const mostActiveManager = computed(() => standingsTeams.value.length ? [...standingsTeams.value].sort((a, b) => (b.transactions || 0) - (a.transactions || 0))[0] : null)
const leastActiveManager = computed(() => standingsTeams.value.length ? [...standingsTeams.value].sort((a, b) => (a.transactions || 0) - (b.transactions || 0))[0] : null)

const hasDivisions = computed(() => standingsTeams.value.some(t => t.division !== undefined && t.division !== null))

const teamsByDivision = computed(() => {
  if (!hasDivisions.value) return {}
  const divisions: Record<string, TeamData[]> = {}
  const season = leagueStore.historicalSeasons[0]
  const divNames = season?.metadata?.division_1 ? [season.metadata.division_1, season.metadata.division_2] : ['Division 1', 'Division 2']
  
  standingsTeams.value.forEach(team => {
    const dName = divNames[team.division || 0] || `Division ${(team.division || 0) + 1}`
    if (!divisions[dName]) divisions[dName] = []
    divisions[dName].push(team)
  })
  
  Object.keys(divisions).forEach(d => {
    divisions[d].sort((a, b) => b.wins !== a.wins ? b.wins - a.wins : b.points_for - a.points_for)
    divisions[d].forEach((t, i) => t.rank = i + 1)
  })
  return divisions
})

// Chart data
const chartSeries = ref<{ name: string; data: number[]; color: string }[]>([])
const chartOptions = ref<any>(null)
const divisionChartData = ref<{ division: string; teams: TeamData[]; series: any[]; options: any }[]>([])

// Calculate player projected points using league scoring
function calculatePlayerProjectedPoints(playerId: string): number {
  const projection = playerProjections.value.get(playerId)
  if (!projection || !projection.stats) return 0
  
  const stats = projection.stats
  const seasonInfo = leagueStore.historicalSeasons[0]
  const scoringSettings = seasonInfo?.scoring_settings || {}
  const recValue = scoringSettings.rec ?? 1
  
  // Try pre-calculated values first
  if (recValue >= 0.9 && stats.pts_ppr > 0) return stats.pts_ppr
  if (recValue >= 0.4 && recValue < 0.9 && stats.pts_half_ppr > 0) return stats.pts_half_ppr
  if (recValue < 0.4 && stats.pts_std > 0) return stats.pts_std
  
  // Adjust from available pre-calc
  if (stats.pts_ppr > 0) return stats.pts_ppr - (1 - recValue) * (stats.rec || 0)
  if (stats.pts_half_ppr > 0) return stats.pts_half_ppr + (recValue - 0.5) * (stats.rec || 0)
  if (stats.pts_std > 0) return stats.pts_std + recValue * (stats.rec || 0)
  
  // Calculate from raw stats
  let points = 0
  points += (stats.pass_yd || 0) * (scoringSettings.pass_yd || 0.04)
  points += (stats.pass_td || 0) * (scoringSettings.pass_td || 4)
  points += (stats.pass_int || 0) * (scoringSettings.pass_int || -1)
  points += (stats.rush_yd || 0) * (scoringSettings.rush_yd || 0.1)
  points += (stats.rush_td || 0) * (scoringSettings.rush_td || 6)
  points += (stats.rec || 0) * recValue
  points += (stats.rec_yd || 0) * (scoringSettings.rec_yd || 0.1)
  points += (stats.rec_td || 0) * (scoringSettings.rec_td || 6)
  points += (stats.fum_lost || 0) * (scoringSettings.fum_lost || -2)
  
  return points
}

function calcTeamProjected(starters: string[]): number {
  let total = 0
  starters.forEach(pid => {
    if (pid && pid !== '0') {
      total += calculatePlayerProjectedPoints(pid)
    }
  })
  return total
}

// Avatar position for overall chart
function getAvatarPosition(team: TeamData, chartHeight: number): Record<string, string> {
  const teamRanks = overallStandingsData.value.get(team.roster_id)
  if (!teamRanks || teamRanks.size === 0) return { display: 'none' }
  
  const weeks = Array.from(teamRanks.keys()).sort((a, b) => a - b)
  const lastRank = teamRanks.get(weeks[weeks.length - 1]) || 1
  const totalTeams = standingsTeams.value.length
  
  const chartPadding = { top: 30, bottom: 70 }
  const usableHeight = chartHeight - chartPadding.top - chartPadding.bottom
  const yPercent = (lastRank - 1) / Math.max(totalTeams - 1, 1)
  const yPos = chartPadding.top + (yPercent * usableHeight) - 14
  
  return { right: '15px', top: `${yPos}px` }
}

// Avatar position for division chart (uses division-specific rankings 1-N)
function getAvatarPositionForDivision(team: TeamData, divisionName: string, chartHeight: number): Record<string, string> {
  const divStandings = divisionStandingsData.value.get(divisionName)
  if (!divStandings) return { display: 'none' }
  
  const teamRanks = divStandings.get(team.roster_id)
  if (!teamRanks || teamRanks.size === 0) return { display: 'none' }
  
  const weeks = Array.from(teamRanks.keys()).sort((a, b) => a - b)
  const lastRank = teamRanks.get(weeks[weeks.length - 1]) || 1
  const divTeams = teamsByDivision.value[divisionName] || []
  const totalTeams = divTeams.length
  
  const chartPadding = { top: 30, bottom: 70 }
  const usableHeight = chartHeight - chartPadding.top - chartPadding.bottom
  const yPercent = (lastRank - 1) / Math.max(totalTeams - 1, 1)
  const yPos = chartPadding.top + (yPercent * usableHeight) - 14
  
  return { right: '15px', top: `${yPos}px` }
}

// Build chart for a set of teams (calculates within-group rankings)
function buildChartForTeams(teams: TeamData[], divisionName: string | null = null): { series: any[]; options: any } | null {
  const season = leagueStore.historicalSeasons[0]
  if (!season) return null
  
  const rosters = leagueStore.historicalRosters.get(season.season) || []
  const teamRosterIds = new Set(teams.map(t => t.roster_id))
  const divisionRosters = rosters.filter(r => teamRosterIds.has(r.roster_id))
  
  const weeks = Array.from(matchupsByWeek.value.keys())
    .filter(w => w < playoffWeekStart.value)
    .sort((a, b) => a - b)
  
  if (weeks.length === 0) return null
  
  // Calculate standings within this group only
  const standingsOverTimeArray = getStandingsOverTime(divisionRosters, matchupsByWeek.value, playoffWeekStart.value)
  
  // Convert to Map for this group
  const standingsMap = new Map<number, Map<number, number>>()
  standingsOverTimeArray.forEach(weekData => {
    // Only consider teams in this group when assigning ranks
    const groupStandings = weekData.standings.filter(s => teamRosterIds.has(s.rosterId))
    groupStandings.forEach((standing, idx) => {
      if (!standingsMap.has(standing.rosterId)) {
        standingsMap.set(standing.rosterId, new Map())
      }
      standingsMap.get(standing.rosterId)!.set(weekData.week, idx + 1)
    })
  })
  
  // Store for avatar positioning
  if (divisionName) {
    divisionStandingsData.value.set(divisionName, standingsMap)
  } else {
    overallStandingsData.value = standingsMap
  }
  
  const colors = ['#f5c451', '#3b82f6', '#10b981', '#ef4444', '#a855f7', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6', '#f43f5e']
  
  const series = teams.map((team, idx) => ({
    name: team.team_name,
    data: weeks.map(w => standingsMap.get(team.roster_id)?.get(w) || 0),
    color: colors[idx % colors.length]
  }))
  
  const options = {
    chart: { type: 'line', toolbar: { show: false }, background: 'transparent', animations: { enabled: true, speed: 500 } },
    colors: series.map(s => s.color),
    stroke: { curve: 'smooth', width: 3 },
    markers: { size: 4, strokeWidth: 0 },
    xaxis: { categories: weeks.map(w => `Wk ${w}`), labels: { style: { colors: '#8b8ea1' } }, axisBorder: { color: '#3a3d52' }, axisTicks: { color: '#3a3d52' } },
    yaxis: { reversed: true, min: 1, max: teams.length, tickAmount: Math.min(teams.length - 1, 5), labels: { style: { colors: '#8b8ea1' }, formatter: (v: number) => Math.round(v).toString() } },
    grid: { borderColor: '#3a3d52', strokeDashArray: 4 },
    legend: { show: false },
    tooltip: { theme: 'dark', y: { formatter: (v: number) => `Rank: ${v}` } }
  }
  
  return { series, options }
}

// Load data
async function loadData() {
  if (!leagueStore.historicalSeasons.length) return
  isLoading.value = true
  
  try {
    const season = leagueStore.historicalSeasons[0]
    const week = currentWeek.value
    const rosters = leagueStore.historicalRosters.get(season.season) || []
    const users = leagueStore.historicalUsers.get(season.season) || []
    const matchups = leagueStore.historicalMatchups.get(season.season) || new Map()
    
    matchupsByWeek.value = matchups
    playoffWeekStart.value = season.settings?.playoff_week_start || 15
    
    // Get player IDs for projections
    const weekMatchups = matchups.get(week) || []
    const allPlayerIds: string[] = []
    weekMatchups.forEach(m => {
      if (m.starters?.length) allPlayerIds.push(...m.starters.filter(id => id && id !== '0'))
    })
    const uniquePlayerIds = [...new Set(allPlayerIds)]
    
    // Fetch projections
    if (uniquePlayerIds.length > 0) {
      try {
        console.log(`📊 Fetching projections for ${uniquePlayerIds.length} players...`)
        playerProjections.value = await sleeperService.getPlayerProjections(season.season, week, uniquePlayerIds, 'regular')
        console.log(`✅ Got projections for ${playerProjections.value.size} players`)
      } catch (e) { console.warn('Could not fetch projections:', e) }
    }
    
    // Build matchups
    const groups = new Map<number, SleeperMatchup[]>()
    weekMatchups.forEach(m => {
      if (m.matchup_id) {
        if (!groups.has(m.matchup_id)) groups.set(m.matchup_id, [])
        groups.get(m.matchup_id)!.push(m)
      }
    })
    
    const built: Matchup[] = []
    groups.forEach((teams, id) => {
      if (teams.length === 2) {
        const r1 = rosters.find(r => r.roster_id === teams[0].roster_id)
        const r2 = rosters.find(r => r.roster_id === teams[1].roster_id)
        const u1 = users.find(u => u.user_id === r1?.owner_id)
        const u2 = users.find(u => u.user_id === r2?.owner_id)
        
        const team1Proj = calcTeamProjected(teams[0].starters || [])
        const team2Proj = calcTeamProjected(teams[1].starters || [])
        
        built.push({
          matchup_id: id,
          team1_name: sleeperService.getTeamName(r1!, u1),
          team1_avatar: sleeperService.getAvatarUrl(r1!, u1, season),
          team1_points: teams[0].points || 0,
          team1_projected: team1Proj > 0 ? team1Proj : 100,
          team1_record: `${r1?.settings?.wins || 0}-${r1?.settings?.losses || 0}`,
          team1_roster_id: teams[0].roster_id,
          team2_name: sleeperService.getTeamName(r2!, u2),
          team2_avatar: sleeperService.getAvatarUrl(r2!, u2, season),
          team2_points: teams[1].points || 0,
          team2_projected: team2Proj > 0 ? team2Proj : 100,
          team2_record: `${r2?.settings?.wins || 0}-${r2?.settings?.losses || 0}`,
          team2_roster_id: teams[1].roster_id
        })
      }
    })
    thisWeekMatchups.value = built
    
    // Transactions
    const wNum = Math.max(...Array.from(matchups.keys()))
    const txs = await sleeperService.getAllTransactions(season.league_id, wNum)
    
    // Build standings
    const teams: TeamData[] = rosters.map((roster, idx) => {
      const user = users.find(u => u.user_id === roster.owner_id)
      const ap = calculateAllPlayRecord(roster.roster_id, matchups, playoffWeekStart.value)
      const txCount = calculateTransactionCount(roster.roster_id, txs)
      
      let l3Total = 0, l3Count = 0
      Array.from(matchups.keys()).sort((a, b) => b - a).forEach(w => {
        if (w >= playoffWeekStart.value || l3Count >= 3) return
        const m = (matchups.get(w) || []).find(x => x.roster_id === roster.roster_id)
        if (m?.points) { l3Total += m.points; l3Count++ }
      })
      
      return {
        roster_id: roster.roster_id,
        team_name: sleeperService.getTeamName(roster, user),
        avatar_url: sleeperService.getAvatarUrl(roster, user, season),
        rank: idx + 1,
        wins: roster.settings?.wins || 0,
        losses: roster.settings?.losses || 0,
        ties: roster.settings?.ties || 0,
        points_for: roster.settings?.fpts || 0,
        points_against: roster.settings?.fpts_against || 0,
        all_play_wins: ap.wins,
        all_play_losses: ap.losses,
        division: roster.settings?.division,
        transactions: txCount,
        last3Avg: l3Count > 0 ? l3Total / l3Count : 0
      }
    })
    
    teams.sort((a, b) => b.wins !== a.wins ? b.wins - a.wins : b.points_for - a.points_for)
    teams.forEach((t, i) => t.rank = i + 1)
    standingsTeams.value = teams.map(t => applyCustomizations(t))
    
    // Leaders
    const byPts = [...teams].sort((a, b) => b.points_for - a.points_for)
    const byWins = [...teams].sort((a, b) => b.wins !== a.wins ? b.wins - a.wins : b.points_for - a.points_for)
    const byAllPlay = [...teams].sort((a, b) => b.all_play_wins !== a.all_play_wins ? b.all_play_wins - a.all_play_wins : b.points_for - a.points_for)
    
    if (byPts[0]) {
      const t = byPts[0], ppg = t.wins + t.losses > 0 ? t.points_for / (t.wins + t.losses) : 0
      leaders.value.mostPoints = { name: t.team_name, avatar: t.avatar_url, points: t.points_for, wins: t.wins, losses: t.losses, record: `${t.wins}-${t.losses}`, ppg, roster_id: t.roster_id }
    }
    if (byWins[0]) {
      const t = byWins[0], ppg = t.wins + t.losses > 0 ? t.points_for / (t.wins + t.losses) : 0
      leaders.value.bestRecord = { name: t.team_name, avatar: t.avatar_url, points: t.points_for, wins: t.wins, losses: t.losses, record: `${t.wins}-${t.losses}`, ppg, roster_id: t.roster_id }
    }
    if (byAllPlay[0]) {
      const t = byAllPlay[0], ppg = t.wins + t.losses > 0 ? t.points_for / (t.wins + t.losses) : 0
      leaders.value.bestAllPlay = { name: t.team_name, avatar: t.avatar_url, points: t.points_for, wins: t.wins, losses: t.losses, record: `${t.wins}-${t.losses}`, ppg, allPlayWins: t.all_play_wins, allPlayLosses: t.all_play_losses, roster_id: t.roster_id }
    }
    
    // Build overall chart
    const cd = buildChartForTeams(standingsTeams.value, null)
    if (cd) { chartSeries.value = cd.series; chartOptions.value = cd.options }
    
    // Build division charts (with within-division rankings)
    if (hasDivisions.value) {
      const divCharts: typeof divisionChartData.value = []
      Object.entries(teamsByDivision.value).forEach(([n, ts]) => {
        const dc = buildChartForTeams(ts, n)
        if (dc) divCharts.push({ division: n, teams: ts, series: dc.series, options: dc.options })
      })
      divisionChartData.value = divCharts
    }
    
  } catch (e) { console.error('Error loading home data:', e) } finally { 
    isLoading.value = false
    // Scroll charts to show most recent weeks on mobile
    scrollChartsToRight()
  }
}

function handleImageError(e: Event) { (e.target as HTMLImageElement).src = 'https://sleepercdn.com/avatars/thumbs/default' }

// AI League News Generation
async function generateLeagueNews() {
  isGeneratingNews.value = true
  
  try {
    const season = leagueStore.historicalSeasons[0]
    const week = currentWeek.value
    
    // Build context for AI
    const matchupSummaries = thisWeekMatchups.value.map(m => {
      const proj1 = m.team1_projected, proj2 = m.team2_projected
      const actual1 = m.team1_points, actual2 = m.team2_points
      return `${m.team1_name} (${actual1.toFixed(1)} pts, proj ${proj1.toFixed(0)}) vs ${m.team2_name} (${actual2.toFixed(1)} pts, proj ${proj2.toFixed(0)})`
    }).join('\n')
    
    const hotTeam = hottestTeam.value?.team_name || 'N/A'
    const coldTeam = coldestTeam.value?.team_name || 'N/A'
    const topTeam = standingsTeams.value[0]?.team_name || 'N/A'
    
    const prompt = `You are a fantasy football analyst. Write a brief 3-4 sentence league update for Week ${week} of ${leagueName.value}.

MATCHUPS THIS WEEK:
${matchupSummaries}

KEY STATS:
- First place: ${topTeam}
- Hottest team (last 3 weeks): ${hotTeam}
- Coldest team (last 3 weeks): ${coldTeam}
- Best all-play: ${bestAllPlayTeam.value?.team_name || 'N/A'}
- Worst all-play: ${worstAllPlayTeam.value?.team_name || 'N/A'}

FOCUS ON:
1. Any close matchups or upsets based on projections vs actual scores
2. Teams on hot or cold streaks
3. Playoff implications if relevant
4. Brief, engaging tone - like a sports update

Write in paragraph form, no bullets. Be specific with team names.`

    // Try API calls
    const apiUrl = import.meta.env.VITE_API_URL
    const anthropicKey = import.meta.env.VITE_ANTHROPIC_API_KEY
    const openaiKey = import.meta.env.VITE_OPENAI_API_KEY
    
    // Try serverless first
    if (apiUrl) {
      try {
        const response = await fetch(`${apiUrl}/generate-analysis`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, type: 'leaguenews' })
        })
        if (response.ok) {
          const data = await response.json()
          leagueNews.value = data.text
          return
        }
      } catch (e) { console.log('Serverless failed, trying direct API...') }
    }
    
    // Try Anthropic
    if (anthropicKey) {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'anthropic-dangerous-direct-browser-access': 'true',
            'x-api-key': anthropicKey
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 300,
            messages: [{ role: 'user', content: prompt }]
          })
        })
        if (response.ok) {
          const data = await response.json()
          leagueNews.value = data.content[0]?.text || 'Failed to generate.'
          return
        }
      } catch (e) { console.log('Anthropic failed:', e) }
    }
    
    // Try OpenAI
    if (openaiKey) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'system', content: 'You are a fantasy football analyst.' }, { role: 'user', content: prompt }],
            temperature: 0.8,
            max_tokens: 300
          })
        })
        if (response.ok) {
          const data = await response.json()
          leagueNews.value = data.choices[0]?.message?.content || 'Failed to generate.'
          return
        }
      } catch (e) { console.log('OpenAI failed:', e) }
    }
    
    // Fallback
    leagueNews.value = `Week ${week} is underway in ${leagueName.value}. ${topTeam} sits atop the standings while ${hotTeam} has been on fire lately. Keep an eye on the matchups as playoff positioning heats up!`
    
  } catch (e) {
    console.error('Failed to generate news:', e)
    leagueNews.value = 'Unable to generate league news at this time.'
  } finally {
    isGeneratingNews.value = false
  }
}

async function downloadStandingsImage() {
  isGeneratingImage.value = true
  try {
    const html2canvas = (await import('html2canvas')).default
    const container = document.createElement('div')
    container.style.cssText = 'position:absolute;left:-9999px;width:1080px;padding:32px;background:linear-gradient(135deg,#1a1d2e 0%,#0d0f18 100%);font-family:system-ui,-apple-system,sans-serif;'
    
    const teams = showDivisions.value && hasDivisions.value ? Object.values(teamsByDivision.value).flat() : standingsTeams.value
    let rows = ''
    teams.forEach((t, i) => {
      const rankBg = i === 0 ? 'background:linear-gradient(135deg,#f5c451,#fcd34d);' : 'background:rgba(58,61,82,0.5);'
      const rankC = i === 0 ? 'color:#1a1d2e;' : 'color:#f7f7ff;'
      rows += `<div style="display:flex;align-items:center;gap:16px;padding:16px;background:rgba(38,42,58,0.3);border-radius:12px;margin-bottom:8px;"><div style="width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:18px;${rankBg}${rankC}">${i + 1}</div><img src="${t.avatar_url}" style="width:48px;height:48px;border-radius:50%;border:2px solid rgba(58,61,82,0.5);" crossorigin="anonymous" /><div style="flex:1;"><div style="font-weight:700;font-size:16px;color:#f7f7ff;">${t.team_name}</div><div style="font-size:13px;color:#8b8ea1;">${t.points_for.toFixed(1)} PF</div></div><div style="text-align:right;"><div style="font-size:20px;font-weight:900;color:${t.wins > t.losses ? '#10b981' : '#ef4444'};">${t.wins}-${t.losses}</div><div style="font-size:12px;color:#8b8ea1;">All-Play: ${t.all_play_wins}-${t.all_play_losses}</div></div></div>`
    })
    
    container.innerHTML = `<div style="text-align:center;margin-bottom:32px;"><div style="font-size:36px;font-weight:900;color:#f5c451;margin-bottom:8px;">🏆 ${leagueName.value}</div><div style="font-size:16px;color:#8b8ea1;">${currentSeason.value} Season • Week ${currentWeek.value}</div></div>${rows}<div style="text-align:center;font-size:12px;color:#6b7280;margin-top:24px;">Generated by Fantasy Dashboard</div>`
    
    document.body.appendChild(container)
    await new Promise(r => setTimeout(r, 200))
    const canvas = await html2canvas(container, { scale: 2, backgroundColor: null, useCORS: true, allowTaint: true })
    document.body.removeChild(container)
    
    canvas.toBlob(b => {
      if (b) {
        const u = URL.createObjectURL(b)
        const a = document.createElement('a')
        a.href = u
        a.download = `${leagueName.value.replace(/\s+/g, '-')}-standings-${currentSeason.value}.png`
        a.click()
        URL.revokeObjectURL(u)
      }
    })
  } catch (e) { console.error('Failed:', e); alert('Failed to generate image.') } finally { isGeneratingImage.value = false }
}

onMounted(() => { 
  checkMobile()
  window.addEventListener('resize', checkMobile)
  if (leagueStore.historicalSeasons.length > 0) loadData() 
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
watch(() => leagueStore.historicalSeasons.length, n => { if (n > 0) loadData() })
watch(() => leagueStore.activeLeagueId, () => { if (leagueStore.historicalSeasons.length > 0) loadData() })
watch(() => showDivisions.value, () => { scrollChartsToRight() })
</script>
