<template>
  <div class="space-y-8">
    <!-- Offseason Notice Banner -->
    <div class="bg-slate-500/10 border border-slate-500/30 rounded-xl p-4 flex items-start gap-3">
      <div class="text-slate-400 text-xl flex-shrink-0">📅</div>
      <div>
        <p class="text-slate-200 font-semibold">You're viewing the {{ currentSeason }} season</p>
        <p class="text-slate-400 text-sm mt-1">The {{ Number(currentSeason) + 1 }} season will automatically appear here when it begins.</p>
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
            <p class="text-dark-textMuted text-base mt-1">{{ currentSeason }} Season • Week {{ currentWeek }}</p>
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
          <div 
            v-for="matchup in thisWeekMatchups" 
            :key="matchup.matchup_id" 
            class="bg-dark-bg/60 backdrop-blur rounded-xl p-4 border border-dark-border/50 hover:border-primary/50 hover:bg-dark-bg/80 transition-all cursor-pointer group"
          >
            <!-- Team 1 -->
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-3 flex-1 min-w-0">
                <div class="relative">
                  <img 
                    :src="matchup.team1.logo_url || defaultAvatar" 
                    :alt="matchup.team1.name" 
                    :class="['w-10 h-10 rounded-full border-2 transition-colors object-cover', matchup.team1.is_my_team ? 'border-primary ring-2 ring-primary/30' : 'border-dark-border group-hover:border-primary/50']"
                    @error="handleImageError" 
                  />
                  <div v-if="matchup.team1.is_my_team" class="absolute -top-0.5 -left-0.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center shadow">
                    <span class="text-[8px] text-gray-900 font-bold">★</span>
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-bold text-sm text-dark-text truncate">{{ matchup.team1.name }}</div>
                  <div class="text-xs text-dark-textMuted">{{ getTeamRecord(matchup.team1.team_key) }}</div>
                </div>
              </div>
              <div class="text-right pl-3">
                <div class="text-xl font-black text-dark-text">{{ (matchup.team1.points || 0).toFixed(1) }}</div>
                <div v-if="matchup.team1.projected_points" class="text-xs text-primary font-medium">
                  proj {{ matchup.team1.projected_points.toFixed(0) }}
                </div>
              </div>
            </div>
            
            <div class="h-px bg-dark-border/50 my-2"></div>
            
            <!-- Team 2 -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3 flex-1 min-w-0">
                <div class="relative">
                  <img 
                    :src="matchup.team2.logo_url || defaultAvatar" 
                    :alt="matchup.team2.name" 
                    :class="['w-10 h-10 rounded-full border-2 transition-colors object-cover', matchup.team2.is_my_team ? 'border-primary ring-2 ring-primary/30' : 'border-dark-border group-hover:border-primary/50']"
                    @error="handleImageError" 
                  />
                  <div v-if="matchup.team2.is_my_team" class="absolute -top-0.5 -left-0.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center shadow">
                    <span class="text-[8px] text-gray-900 font-bold">★</span>
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-bold text-sm text-dark-text truncate">{{ matchup.team2.name }}</div>
                  <div class="text-xs text-dark-textMuted">{{ getTeamRecord(matchup.team2.team_key) }}</div>
                </div>
              </div>
              <div class="text-right pl-3">
                <div class="text-xl font-black text-dark-text">{{ (matchup.team2.points || 0).toFixed(1) }}</div>
                <div v-if="matchup.team2.projected_points" class="text-xs text-primary font-medium">
                  proj {{ matchup.team2.projected_points.toFixed(0) }}
                </div>
              </div>
            </div>
          </div>
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
              <img 
                :src="leaders.mostPoints?.logo_url || defaultAvatar" 
                :alt="leaders.mostPoints?.name" 
                class="w-12 h-12 rounded-full border-2 border-yellow-500/50 object-cover" 
                @error="handleImageError" 
              />
              <div class="flex-1 min-w-0">
                <div class="font-bold text-lg text-dark-text truncate">{{ leaders.mostPoints?.name || 'N/A' }}</div>
                <div class="text-sm text-dark-textMuted">{{ leaders.mostPoints ? `${leaders.mostPoints.wins}-${leaders.mostPoints.losses}` : '' }}</div>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <div class="text-2xl font-black text-yellow-400">{{ leaders.mostPoints?.points_for?.toFixed(1) || '0.0' }}</div>
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
              <img 
                :src="leaders.bestRecord?.logo_url || defaultAvatar" 
                :alt="leaders.bestRecord?.name" 
                class="w-12 h-12 rounded-full border-2 border-green-500/50 object-cover" 
                @error="handleImageError" 
              />
              <div class="flex-1 min-w-0">
                <div class="font-bold text-lg text-dark-text truncate">{{ leaders.bestRecord?.name || 'N/A' }}</div>
                <div class="text-sm text-dark-textMuted">{{ leaders.bestRecord?.points_for ? (leaders.bestRecord.points_for / Math.max(leaders.bestRecord.wins + leaders.bestRecord.losses, 1)).toFixed(1) + ' PPG' : '' }}</div>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <div class="text-2xl font-black text-green-400">{{ leaders.bestRecord ? `${leaders.bestRecord.wins}-${leaders.bestRecord.losses}` : '0-0' }}</div>
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
              <img 
                :src="leaders.bestAllPlay?.logo_url || defaultAvatar" 
                :alt="leaders.bestAllPlay?.name" 
                class="w-12 h-12 rounded-full border-2 border-blue-500/50 object-cover" 
                @error="handleImageError" 
              />
              <div class="flex-1 min-w-0">
                <div class="font-bold text-lg text-dark-text truncate">{{ leaders.bestAllPlay?.name || 'N/A' }}</div>
                <div class="text-sm text-dark-textMuted">{{ leaders.bestAllPlay ? `${leaders.bestAllPlay.wins}-${leaders.bestAllPlay.losses}` : '' }}</div>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <div class="text-2xl font-black text-blue-400">{{ leaders.bestAllPlay?.all_play_wins || 0 }}-{{ leaders.bestAllPlay?.all_play_losses || 0 }}</div>
              <div class="text-xs text-blue-400/70 group-hover:text-blue-400 transition-colors">Click for details →</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Standings Section -->
    <div class="card">
      <div class="card-header">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-2xl">🏆</span>
            <h2 class="card-title">League Standings</h2>
          </div>
          <div class="text-sm text-dark-textMuted">
            {{ teamsWithAllPlay.length }} Teams
          </div>
        </div>
      </div>
      <div class="card-body">
        <div v-if="teamsWithAllPlay.length === 0" class="text-center py-8">
          <p class="text-dark-textMuted">No standings data available</p>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="text-left text-xs text-dark-textMuted uppercase border-b border-dark-border">
                <th class="py-3 px-4">Rank</th>
                <th class="py-3 px-4">Team</th>
                <th class="py-3 px-4 text-center">Record</th>
                <th class="py-3 px-4 text-center hidden sm:table-cell">All-Play</th>
                <th class="py-3 px-4 text-right hidden sm:table-cell">PF</th>
                <th class="py-3 px-4 text-right hidden md:table-cell">PA</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="team in sortedTeams" 
                :key="team.team_key"
                @click="openTeamDetailModal(team)"
                class="border-b border-dark-border/50 hover:bg-dark-border/20 transition-colors cursor-pointer"
                :class="{ 'bg-primary/5': team.is_my_team }"
              >
                <td class="py-3 px-4">
                  <div class="flex items-center gap-2">
                    <span 
                      class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      :class="getRankClass(team.rank)"
                    >
                      {{ team.rank }}
                    </span>
                  </div>
                </td>
                <td class="py-3 px-4">
                  <div class="flex items-center gap-3">
                    <img 
                      :src="team.logo_url || defaultAvatar" 
                      :alt="team.name"
                      class="w-8 h-8 rounded-full border border-dark-border object-cover"
                      @error="handleImageError"
                    />
                    <div class="flex items-center gap-2">
                      <span class="font-semibold text-dark-text">{{ team.name }}</span>
                      <span v-if="team.is_my_team" class="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">You</span>
                      <svg class="w-4 h-4 text-primary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </td>
                <td class="py-3 px-4 text-center">
                  <span class="font-bold" :class="getRecordClass(team)">
                    {{ team.wins }}-{{ team.losses }}{{ team.ties > 0 ? `-${team.ties}` : '' }}
                  </span>
                </td>
                <td class="py-3 px-4 text-center hidden sm:table-cell">
                  <span :class="getAllPlayClass(team)">
                    {{ team.all_play_wins }}-{{ team.all_play_losses }}
                  </span>
                </td>
                <td class="py-3 px-4 text-right hidden sm:table-cell">
                  <span class="font-medium" :class="getPointsForClass(team)">
                    {{ team.points_for?.toFixed(1) || '0.0' }}
                  </span>
                </td>
                <td class="py-3 px-4 text-right hidden md:table-cell">
                  <span :class="getPointsAgainstClass(team)">
                    {{ team.points_against?.toFixed(1) || '0.0' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Platform Badge -->
    <div class="flex justify-center">
      <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-600/10 border border-purple-600/30">
        <span class="text-sm font-bold text-purple-400">Y!</span>
        <span class="text-sm text-purple-300">Powered by Yahoo Fantasy</span>
      </div>
    </div>

    <!-- Leader Modal -->
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
                :src="leaderModalData.leader?.logo_url || defaultAvatar" 
                :alt="leaderModalData.leader?.name"
                class="w-16 h-16 rounded-full ring-4 object-cover"
                :class="leaderModalRingColor"
                @error="handleImageError"
              />
              <div class="flex-1">
                <div class="text-xl font-bold text-dark-text">{{ leaderModalData.leader?.name }}</div>
                <div class="text-sm text-dark-textMuted">{{ leaderModalData.leader?.wins }}-{{ leaderModalData.leader?.losses }}</div>
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
                :key="team.team_key"
                class="flex items-center gap-3"
              >
                <div class="w-6 text-center">
                  <span 
                    class="text-sm font-bold"
                    :class="index === 0 ? leaderModalTextColor : 'text-dark-textMuted'"
                  >{{ index + 1 }}</span>
                </div>
                <img 
                  :src="team.logo_url || defaultAvatar" 
                  :alt="team.name"
                  class="w-8 h-8 rounded-full object-cover"
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
                <div class="text-lg font-bold text-dark-text">{{ teamsWithAllPlay.length }}</div>
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
                :src="selectedTeam?.logo_url || defaultAvatar" 
                :alt="selectedTeam?.name"
                class="w-12 h-12 rounded-full ring-2 ring-primary object-cover"
                @error="handleImageError"
              />
              <div>
                <h3 class="text-xl font-bold text-dark-text">{{ selectedTeam?.name }}</h3>
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
                <div class="text-2xl font-black text-dark-text">{{ selectedTeam?.wins }}-{{ selectedTeam?.losses }}</div>
                <div class="text-xs text-dark-textMuted">Record</div>
              </div>
              <div class="bg-dark-border/30 rounded-xl p-4 text-center">
                <div class="text-2xl font-black text-primary">{{ selectedTeam?.rank }}</div>
                <div class="text-xs text-dark-textMuted">Rank</div>
              </div>
              <div class="bg-dark-border/30 rounded-xl p-4 text-center">
                <div class="text-2xl font-black text-dark-text">{{ selectedTeam?.all_play_wins }}-{{ selectedTeam?.all_play_losses }}</div>
                <div class="text-xs text-dark-textMuted">All-Play</div>
              </div>
              <div class="bg-dark-border/30 rounded-xl p-4 text-center">
                <div class="text-2xl font-black text-dark-text">{{ teamDetailStats.ppg }}</div>
                <div class="text-xs text-dark-textMuted">PPG</div>
              </div>
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
                <div class="text-lg font-bold" :class="parseFloat(teamDetailStats.pointDiff) >= 0 ? 'text-green-400' : 'text-red-400'">
                  {{ parseFloat(teamDetailStats.pointDiff) >= 0 ? '+' : '' }}{{ teamDetailStats.pointDiff }}
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
                :title="`Week ${idx + 1}: ${result.points.toFixed(1)} pts`"
              >
                {{ result.won ? 'W' : 'L' }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { yahooService } from '@/services/yahoo'
import { useAuthStore } from '@/stores/auth'

const leagueStore = useLeagueStore()
const authStore = useAuthStore()

const defaultAvatar = 'https://s.yimg.com/cv/apiv2/default/nfl/nfl_1_100.png'

// Modal state
const showLeaderModal = ref(false)
const showTeamDetailModal = ref(false)
const activeLeaderType = ref<'mostPoints' | 'bestRecord' | 'bestAllPlay'>('mostPoints')
const selectedTeam = ref<any>(null)

// All-play data (calculated from matchups)
const allPlayRecords = ref<Map<string, { wins: number; losses: number }>>(new Map())
const weeklyScoresMap = ref<Map<string, { week: number; points: number; won: boolean }[]>>(new Map())
const isLoadingAllPlay = ref(false)

const leagueName = computed(() => leagueStore.currentLeague?.name || 'Yahoo League')
const currentSeason = computed(() => leagueStore.currentLeague?.season || new Date().getFullYear().toString())
const currentWeek = computed(() => leagueStore.currentLeague?.settings?.leg || 1)
const isLoading = computed(() => leagueStore.isLoading)

// Transform matchups into a more usable format
const thisWeekMatchups = computed(() => {
  const matchups = leagueStore.yahooMatchups || []
  
  return matchups.map(matchup => {
    const team1 = matchup.teams[0] || {}
    const team2 = matchup.teams[1] || {}
    
    return {
      matchup_id: matchup.matchup_id,
      team1: { ...team1 },
      team2: { ...team2 }
    }
  })
})

// Teams with all-play records calculated
const teamsWithAllPlay = computed(() => {
  const teams = leagueStore.yahooTeams || []
  
  return teams.map(team => {
    const allPlay = allPlayRecords.value.get(team.team_key) || { wins: 0, losses: 0 }
    return {
      ...team,
      all_play_wins: allPlay.wins,
      all_play_losses: allPlay.losses
    }
  })
})

// Sorted teams by rank
const sortedTeams = computed(() => {
  return [...teamsWithAllPlay.value].sort((a, b) => (a.rank || 99) - (b.rank || 99))
})

// Best/Worst calculations for highlighting
const bestRecord = computed(() => {
  if (!teamsWithAllPlay.value.length) return null
  return teamsWithAllPlay.value.reduce((best, team) => 
    ((team.wins || 0) > (best.wins || 0) || ((team.wins || 0) === (best.wins || 0) && (team.losses || 0) < (best.losses || 0))) ? team : best
  )
})

const worstRecord = computed(() => {
  if (!teamsWithAllPlay.value.length) return null
  return teamsWithAllPlay.value.reduce((worst, team) => 
    ((team.wins || 0) < (worst.wins || 0) || ((team.wins || 0) === (worst.wins || 0) && (team.losses || 0) > (worst.losses || 0))) ? team : worst
  )
})

const bestAllPlay = computed(() => {
  if (!teamsWithAllPlay.value.length) return null
  return teamsWithAllPlay.value.reduce((best, team) => 
    (team.all_play_wins || 0) > (best.all_play_wins || 0) ? team : best
  )
})

const worstAllPlay = computed(() => {
  if (!teamsWithAllPlay.value.length) return null
  return teamsWithAllPlay.value.reduce((worst, team) => 
    (team.all_play_wins || 0) < (worst.all_play_wins || 0) ? team : worst
  )
})

const bestPointsFor = computed(() => {
  if (!teamsWithAllPlay.value.length) return null
  return teamsWithAllPlay.value.reduce((best, team) => 
    (team.points_for || 0) > (best.points_for || 0) ? team : best
  )
})

const worstPointsFor = computed(() => {
  if (!teamsWithAllPlay.value.length) return null
  return teamsWithAllPlay.value.reduce((worst, team) => 
    (team.points_for || 0) < (worst.points_for || 0) ? team : worst
  )
})

const bestPointsAgainst = computed(() => {
  // Best = LOWEST points against (lucky)
  if (!teamsWithAllPlay.value.length) return null
  return teamsWithAllPlay.value.reduce((best, team) => 
    (team.points_against || 999999) < (best.points_against || 999999) ? team : best
  )
})

const worstPointsAgainst = computed(() => {
  // Worst = HIGHEST points against (unlucky)
  if (!teamsWithAllPlay.value.length) return null
  return teamsWithAllPlay.value.reduce((worst, team) => 
    (team.points_against || 0) > (worst.points_against || 0) ? team : worst
  )
})

// Calculate leaders from teams data
const leaders = computed(() => {
  const teams = teamsWithAllPlay.value
  
  if (teams.length === 0) {
    return { mostPoints: null, bestRecord: null, bestAllPlay: null }
  }
  
  // Most Points For
  const mostPoints = [...teams].sort((a, b) => (b.points_for || 0) - (a.points_for || 0))[0]
  
  // Best Record (by win %, then PF)
  const bestRecordTeam = [...teams].sort((a, b) => {
    const aWinPct = (a.wins || 0) / Math.max((a.wins || 0) + (a.losses || 0), 1)
    const bWinPct = (b.wins || 0) / Math.max((b.wins || 0) + (b.losses || 0), 1)
    if (bWinPct !== aWinPct) return bWinPct - aWinPct
    return (b.points_for || 0) - (a.points_for || 0)
  })[0]
  
  // Best All-Play
  const bestAllPlayTeam = [...teams].sort((a, b) => {
    const aWinPct = (a.all_play_wins || 0) / Math.max((a.all_play_wins || 0) + (a.all_play_losses || 0), 1)
    const bWinPct = (b.all_play_wins || 0) / Math.max((b.all_play_wins || 0) + (b.all_play_losses || 0), 1)
    if (bWinPct !== aWinPct) return bWinPct - aWinPct
    return (b.all_play_wins || 0) - (a.all_play_wins || 0)
  })[0]
  
  return { mostPoints, bestRecord: bestRecordTeam, bestAllPlay: bestAllPlayTeam }
})

// Team detail stats
const teamDetailStats = computed(() => {
  if (!selectedTeam.value) {
    return { ppg: '0.0', highScore: '0.0', lowScore: '0.0', totalPoints: '0.0', pointsAgainst: '0.0', pointDiff: '0.0', winStreak: '-', weeklyResults: [] }
  }
  
  const team = selectedTeam.value
  const weeklyData = weeklyScoresMap.value.get(team.team_key) || []
  const scores = weeklyData.map(w => w.points)
  
  const gamesPlayed = Math.max((team.wins || 0) + (team.losses || 0), 1)
  const ppg = ((team.points_for || 0) / gamesPlayed).toFixed(1)
  const highScore = scores.length > 0 ? Math.max(...scores).toFixed(1) : '0.0'
  const lowScore = scores.length > 0 ? Math.min(...scores).toFixed(1) : '0.0'
  const totalPoints = (team.points_for || 0).toFixed(1)
  const pointsAgainst = (team.points_against || 0).toFixed(1)
  const pointDiff = ((team.points_for || 0) - (team.points_against || 0)).toFixed(1)
  
  // Calculate streak
  let streak = 0
  let streakType = ''
  for (let i = weeklyData.length - 1; i >= 0; i--) {
    if (i === weeklyData.length - 1) {
      streakType = weeklyData[i].won ? 'W' : 'L'
      streak = 1
    } else if ((weeklyData[i].won && streakType === 'W') || (!weeklyData[i].won && streakType === 'L')) {
      streak++
    } else {
      break
    }
  }
  const winStreak = weeklyData.length > 0 ? `${streakType}${streak}` : '-'
  
  return {
    ppg,
    highScore,
    lowScore,
    totalPoints,
    pointsAgainst,
    pointDiff,
    winStreak,
    weeklyResults: weeklyData.map(w => ({ won: w.won, points: w.points }))
  }
})

// Leader modal computed properties
const leaderModalTitle = computed(() => {
  switch (activeLeaderType.value) {
    case 'mostPoints': return '🏆 Most Points'
    case 'bestRecord': return '📊 Best Record'
    case 'bestAllPlay': return '🎯 Best All-Play'
    default: return 'Leaderboard'
  }
})

const leaderModalGradient = computed(() => {
  switch (activeLeaderType.value) {
    case 'mostPoints': return 'bg-gradient-to-r from-yellow-500/10 to-transparent'
    case 'bestRecord': return 'bg-gradient-to-r from-green-500/10 to-transparent'
    case 'bestAllPlay': return 'bg-gradient-to-r from-blue-500/10 to-transparent'
    default: return ''
  }
})

const leaderModalRingColor = computed(() => {
  switch (activeLeaderType.value) {
    case 'mostPoints': return 'ring-yellow-500'
    case 'bestRecord': return 'ring-green-500'
    case 'bestAllPlay': return 'ring-blue-500'
    default: return 'ring-primary'
  }
})

const leaderModalTextColor = computed(() => {
  switch (activeLeaderType.value) {
    case 'mostPoints': return 'text-yellow-400'
    case 'bestRecord': return 'text-green-400'
    case 'bestAllPlay': return 'text-blue-400'
    default: return 'text-primary'
  }
})

const leaderModalBarColor = computed(() => {
  switch (activeLeaderType.value) {
    case 'mostPoints': return 'bg-yellow-500'
    case 'bestRecord': return 'bg-green-500'
    case 'bestAllPlay': return 'bg-blue-500'
    default: return 'bg-primary'
  }
})

const leaderModalValue = computed(() => {
  const leader = leaderModalData.value.leader
  if (!leader) return '0'
  
  switch (activeLeaderType.value) {
    case 'mostPoints': return leader.points_for?.toFixed(1) || '0.0'
    case 'bestRecord': return `${leader.wins}-${leader.losses}`
    case 'bestAllPlay': return `${leader.all_play_wins}-${leader.all_play_losses}`
    default: return '0'
  }
})

const leaderModalUnit = computed(() => {
  switch (activeLeaderType.value) {
    case 'mostPoints': return 'Total Points'
    case 'bestRecord': return 'Record'
    case 'bestAllPlay': return 'All-Play Record'
    default: return ''
  }
})

const leaderModalData = computed(() => {
  const teams = teamsWithAllPlay.value
  let sorted: any[] = []
  let getValue: (t: any) => number
  
  switch (activeLeaderType.value) {
    case 'mostPoints':
      sorted = [...teams].sort((a, b) => (b.points_for || 0) - (a.points_for || 0))
      getValue = (t) => t.points_for || 0
      break
    case 'bestRecord':
      sorted = [...teams].sort((a, b) => {
        const aWinPct = (a.wins || 0) / Math.max((a.wins || 0) + (a.losses || 0), 1)
        const bWinPct = (b.wins || 0) / Math.max((b.wins || 0) + (b.losses || 0), 1)
        return bWinPct - aWinPct
      })
      getValue = (t) => (t.wins || 0) / Math.max((t.wins || 0) + (t.losses || 0), 1) * 100
      break
    case 'bestAllPlay':
      sorted = [...teams].sort((a, b) => {
        const aWinPct = (a.all_play_wins || 0) / Math.max((a.all_play_wins || 0) + (a.all_play_losses || 0), 1)
        const bWinPct = (b.all_play_wins || 0) / Math.max((b.all_play_wins || 0) + (b.all_play_losses || 0), 1)
        return bWinPct - aWinPct
      })
      getValue = (t) => t.all_play_wins || 0
      break
  }
  
  const comparison = sorted.map(t => ({ ...t, value: getValue(t) }))
  const values = comparison.map(t => t.value)
  const maxValue = Math.max(...values, 1)
  const average = values.reduce((a, b) => a + b, 0) / values.length
  const spread = Math.max(...values) - Math.min(...values)
  
  return {
    leader: sorted[0],
    comparison,
    maxValue,
    average,
    spread
  }
})

// Functions
function getTeamRecord(teamKey: string): string {
  const team = leagueStore.yahooTeams.find(t => t.team_key === teamKey)
  if (!team) return '0-0'
  return `${team.wins || 0}-${team.losses || 0}`
}

function getRankClass(rank: number): string {
  if (rank === 1) return 'bg-yellow-500 text-gray-900'
  if (rank === 2) return 'bg-gray-400 text-gray-900'
  if (rank === 3) return 'bg-amber-700 text-white'
  return 'bg-dark-border text-dark-textMuted'
}

function getRecordClass(team: any): string {
  if (bestRecord.value && team.team_key === bestRecord.value.team_key) {
    return 'text-green-400'
  }
  if (worstRecord.value && team.team_key === worstRecord.value.team_key) {
    return 'text-red-400'
  }
  return 'text-dark-text'
}

function getAllPlayClass(team: any): string {
  if (bestAllPlay.value && team.team_key === bestAllPlay.value.team_key) {
    return 'text-green-400 font-semibold'
  }
  if (worstAllPlay.value && team.team_key === worstAllPlay.value.team_key) {
    return 'text-red-400 font-semibold'
  }
  return 'text-dark-textMuted'
}

function getPointsForClass(team: any): string {
  if (bestPointsFor.value && team.team_key === bestPointsFor.value.team_key) {
    return 'text-green-400'
  }
  if (worstPointsFor.value && team.team_key === worstPointsFor.value.team_key) {
    return 'text-red-400'
  }
  return 'text-dark-text'
}

function getPointsAgainstClass(team: any): string {
  // Best = lowest (green), Worst = highest (red)
  if (bestPointsAgainst.value && team.team_key === bestPointsAgainst.value.team_key) {
    return 'text-green-400'
  }
  if (worstPointsAgainst.value && team.team_key === worstPointsAgainst.value.team_key) {
    return 'text-red-400'
  }
  return 'text-dark-textMuted'
}

function handleImageError(e: Event) {
  const img = e.target as HTMLImageElement
  img.src = defaultAvatar
}

function openLeaderModal(type: 'mostPoints' | 'bestRecord' | 'bestAllPlay') {
  activeLeaderType.value = type
  showLeaderModal.value = true
}

function closeLeaderModal() {
  showLeaderModal.value = false
}

function openTeamDetailModal(team: any) {
  selectedTeam.value = team
  showTeamDetailModal.value = true
}

function closeTeamDetailModal() {
  showTeamDetailModal.value = false
  selectedTeam.value = null
}

function formatLeaderValue(value: number): string {
  switch (activeLeaderType.value) {
    case 'mostPoints': return value.toFixed(1)
    case 'bestRecord': return `${value.toFixed(0)}%`
    case 'bestAllPlay': return value.toString()
    default: return value.toString()
  }
}

// Calculate all-play records and weekly scores from historical matchups
async function calculateAllPlayRecords() {
  const leagueKey = leagueStore.activeLeagueId
  if (!leagueKey || leagueStore.activePlatform !== 'yahoo') return
  
  isLoadingAllPlay.value = true
  const records = new Map<string, { wins: number; losses: number }>()
  const weeklyScores = new Map<string, { week: number; points: number; won: boolean }[]>()
  
  // Initialize all teams
  for (const team of leagueStore.yahooTeams) {
    records.set(team.team_key, { wins: 0, losses: 0 })
    weeklyScores.set(team.team_key, [])
  }
  
  try {
    // Make sure Yahoo service is initialized
    if (authStore.user?.id) {
      await yahooService.initialize(authStore.user.id)
    }
    
    // Fetch matchups for each completed week
    const completedWeeks = Math.max(0, currentWeek.value - 1)
    
    for (let week = 1; week <= completedWeeks; week++) {
      try {
        const matchups = await yahooService.getMatchups(leagueKey, week)
        
        // Get all team scores for this week
        const weekScoresData: { team_key: string; points: number }[] = []
        
        // Track who beat who this week
        for (const matchup of matchups) {
          if (matchup.teams.length >= 2) {
            const team1 = matchup.teams[0]
            const team2 = matchup.teams[1]
            
            // Record weekly results
            const team1Scores = weeklyScores.get(team1.team_key)
            const team2Scores = weeklyScores.get(team2.team_key)
            
            if (team1Scores) {
              team1Scores.push({
                week,
                points: team1.points || 0,
                won: (team1.points || 0) > (team2.points || 0)
              })
            }
            if (team2Scores) {
              team2Scores.push({
                week,
                points: team2.points || 0,
                won: (team2.points || 0) > (team1.points || 0)
              })
            }
          }
          
          for (const team of matchup.teams) {
            weekScoresData.push({
              team_key: team.team_key,
              points: team.points || 0
            })
          }
        }
        
        // Calculate all-play for each team
        for (const team of weekScoresData) {
          const record = records.get(team.team_key)
          if (!record) continue
          
          for (const opponent of weekScoresData) {
            if (opponent.team_key === team.team_key) continue
            
            if (team.points > opponent.points) {
              record.wins++
            } else if (team.points < opponent.points) {
              record.losses++
            }
            // Ties don't count
          }
        }
      } catch (e) {
        console.error(`Error fetching week ${week} matchups:`, e)
      }
    }
    
    allPlayRecords.value = records
    weeklyScoresMap.value = weeklyScores
  } catch (e) {
    console.error('Error calculating all-play records:', e)
  } finally {
    isLoadingAllPlay.value = false
  }
}

// Watch for league changes to recalculate all-play
watch(() => leagueStore.activeLeagueId, () => {
  if (leagueStore.activePlatform === 'yahoo') {
    calculateAllPlayRecords()
  }
})

watch(() => leagueStore.yahooTeams, () => {
  if (leagueStore.yahooTeams.length > 0 && leagueStore.activePlatform === 'yahoo') {
    calculateAllPlayRecords()
  }
}, { immediate: true })

onMounted(() => {
  if (leagueStore.yahooTeams.length > 0) {
    calculateAllPlayRecords()
  }
})
</script>
