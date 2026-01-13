<template>
  <div class="space-y-8">
    <!-- Offseason Notice Banner -->
    <div class="bg-slate-500/10 border border-slate-500/30 rounded-xl p-4 flex items-start gap-3">
      <div class="text-slate-400 text-xl flex-shrink-0">⚾</div>
      <div>
        <p class="text-slate-200 font-semibold">You're viewing the {{ currentSeason }} season</p>
        <p class="text-slate-400 text-sm mt-1">The {{ Number(currentSeason) + 1 }} season will automatically appear here when it begins.</p>
      </div>
    </div>

    <!-- Settings Gear and Refresh at Top -->
    <div class="flex justify-end gap-2">
      <button 
        @click="refreshData" 
        class="p-2 rounded-lg bg-dark-card border border-dark-border hover:border-primary transition-colors"
        :class="{ 'animate-spin': isRefreshing }"
        :disabled="isRefreshing"
        title="Clear cache and refresh data"
      >
        <svg class="w-6 h-6 text-dark-textMuted hover:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
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
            <p class="text-dark-textMuted text-base mt-1">
              {{ currentSeason }} Season • Week {{ displayWeek }}
              <span v-if="isSeasonComplete" class="ml-2 text-green-400">(Season Complete)</span>
              <span class="ml-2 px-2 py-0.5 rounded text-xs font-medium" :class="scoringTypeBadgeClass">{{ scoringTypeLabel }}</span>
            </p>
          </div>
        </div>

        <div v-if="isLoading" class="flex items-center justify-center py-12">
          <div class="text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-4 border-yellow-400 mx-auto mb-3"></div>
            <p class="text-dark-textMuted text-sm">Loading matchups...</p>
          </div>
        </div>

        <!-- Matchups Grid -->
        <div v-else-if="formattedMatchups.length > 0" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div 
            v-for="matchup in formattedMatchups" 
            :key="matchup.matchup_id" 
            class="bg-dark-bg/60 backdrop-blur rounded-xl p-4 border border-dark-border/50 hover:border-primary/50 hover:bg-dark-bg/80 transition-all cursor-pointer group"
          >
            <!-- Team 1 -->
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-3 flex-1 min-w-0">
                <div class="relative">
                  <img 
                    :src="matchup.team1?.logo_url || defaultAvatar" 
                    :alt="matchup.team1?.name || 'Team 1'" 
                    :class="['w-10 h-10 rounded-full border-2 transition-colors object-cover', matchup.team1?.is_my_team ? 'border-primary ring-2 ring-primary/30' : 'border-dark-border group-hover:border-primary/50']"
                    @error="handleImageError" 
                  />
                  <div v-if="matchup.team1?.is_my_team" class="absolute -top-0.5 -left-0.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center shadow">
                    <span class="text-[8px] text-gray-900 font-bold">★</span>
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-bold text-sm text-dark-text truncate">{{ matchup.team1?.name || 'TBD' }}</div>
                  <div class="text-xs text-dark-textMuted">{{ getTeamRecord(matchup.team1?.team_key) }}</div>
                </div>
              </div>
              <div class="text-right pl-3">
                <div class="text-xl font-black" :class="getMatchupScoreClass(matchup, 0)">
                  {{ isPointsLeague ? (matchup.team1?.points || 0).toFixed(1) : (matchup.team1_cat_wins ?? '-') }}
                </div>
                <div v-if="!isPointsLeague" class="text-xs text-dark-textMuted">cat wins</div>
              </div>
            </div>
            
            <div class="h-px bg-dark-border/50 my-2"></div>
            
            <!-- Team 2 -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3 flex-1 min-w-0">
                <div class="relative">
                  <img 
                    :src="matchup.team2?.logo_url || defaultAvatar" 
                    :alt="matchup.team2?.name || 'Team 2'" 
                    :class="['w-10 h-10 rounded-full border-2 transition-colors object-cover', matchup.team2?.is_my_team ? 'border-primary ring-2 ring-primary/30' : 'border-dark-border group-hover:border-primary/50']"
                    @error="handleImageError" 
                  />
                  <div v-if="matchup.team2?.is_my_team" class="absolute -top-0.5 -left-0.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center shadow">
                    <span class="text-[8px] text-gray-900 font-bold">★</span>
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-bold text-sm text-dark-text truncate">{{ matchup.team2?.name || 'TBD' }}</div>
                  <div class="text-xs text-dark-textMuted">{{ getTeamRecord(matchup.team2?.team_key) }}</div>
                </div>
              </div>
              <div class="text-right pl-3">
                <div class="text-xl font-black" :class="getMatchupScoreClass(matchup, 1)">
                  {{ isPointsLeague ? (matchup.team2?.points || 0).toFixed(1) : (matchup.team2_cat_wins ?? '-') }}
                </div>
                <div v-if="!isPointsLeague" class="text-xs text-dark-textMuted">cat wins</div>
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
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Most Category Wins / Most Points -->
        <div 
          @click="openLeaderModal('mostCatWins')"
          class="group relative overflow-hidden rounded-xl bg-dark-card border border-yellow-500/20 hover:border-yellow-500/40 transition-all cursor-pointer"
        >
          <div class="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
          <div class="relative p-5">
            <div class="text-xs uppercase tracking-wider text-yellow-400 font-bold mb-3">
              {{ isPointsLeague ? 'Most Points' : 'Most Category Wins' }}
            </div>
            <div class="flex items-center gap-3 mb-3">
              <img 
                :src="(isPointsLeague ? leaders.mostPoints?.logo_url : leaders.mostCatWins?.logo_url) || defaultAvatar" 
                class="w-12 h-12 rounded-full border-2 border-yellow-500/50 object-cover" 
                @error="handleImageError" 
              />
              <div class="flex-1 min-w-0">
                <div class="font-bold text-lg text-dark-text truncate">
                  {{ isPointsLeague ? (leaders.mostPoints?.name || 'N/A') : (leaders.mostCatWins?.name || 'N/A') }}
                </div>
                <div class="text-sm text-dark-textMuted">
                  {{ isPointsLeague 
                    ? `${leaders.mostPoints?.wins || 0}-${leaders.mostPoints?.losses || 0}` 
                    : `${leaders.mostCatWins?.wins || 0}-${leaders.mostCatWins?.losses || 0}` }}
                </div>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <div class="text-2xl font-black text-yellow-400">
                {{ isPointsLeague 
                  ? (leaders.mostPoints?.points_for?.toFixed(1) || '0.0') 
                  : `${leaders.mostCatWins?.wins || 0} wins` }}
              </div>
              <div class="text-xs text-yellow-400/70 group-hover:text-yellow-400 transition-colors">Click for details →</div>
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

    <!-- League Standings - Full Width -->
    <div class="card">
      <div class="card-header">
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-2xl">🏆</span>
              <h2 class="card-title">League Standings</h2>
            </div>
            <div class="text-sm text-dark-textMuted">
              {{ isPointsLeague ? 'Points league' : 'Category wins per stat (cumulative season total)' }}
            </div>
            <div class="flex items-center gap-2 text-sm mt-1">
              <svg class="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              <span class="text-dark-textMuted">Select <span class="text-yellow-400">team</span> for details</span>
            </div>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <button 
              @click="downloadStandings" 
              :disabled="isGeneratingDownload" 
              class="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50"
              style="background: #dc2626; color: #ffffff;"
              @mouseover="$event.currentTarget.style.background = '#eab308'; $event.currentTarget.style.color = '#0a0c14'"
              @mouseout="$event.currentTarget.style.background = '#dc2626'; $event.currentTarget.style.color = '#ffffff'"
            >
              <svg v-if="!isGeneratingDownload" class="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <svg v-else class="w-5 h-5 animate-spin pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ isGeneratingDownload ? 'Generating...' : 'Share' }}
            </button>
          </div>
        </div>
      </div>
      
      <!-- Mobile scroll hint for category leagues - only on mobile -->
      <div v-if="!isPointsLeague" class="md:hidden px-4 py-2 bg-dark-border/30 border-b border-dark-border flex items-center justify-center gap-2 text-xs text-dark-textMuted">
        <svg class="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        <span>Swipe to see all categories</span>
      </div>
      
      <div class="card-body overflow-x-auto scrollbar-thin">
        <table class="w-full">
          <thead>
            <tr class="text-left text-xs text-dark-textMuted uppercase border-b border-dark-border">
              <th class="py-3 px-3 w-12 cursor-pointer hover:text-yellow-400" @click="setSortColumn('rank')">
                # <span v-if="sortColumn === 'rank'" class="text-yellow-400">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th class="py-3 px-3 min-w-[150px]">Team</th>
              <th class="py-3 px-3 text-center cursor-pointer hover:text-yellow-400" @click="setSortColumn('record')" title="Total Category W-L-T">
                W-L-T <span v-if="sortColumn === 'record'" class="text-yellow-400">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
              </th>
              
              <!-- Category columns (for H2H/Roto Category leagues) -->
              <template v-if="!isPointsLeague">
                <th 
                  v-for="cat in displayCategories" 
                  :key="cat.stat_id"
                  class="py-3 px-2 text-center cursor-pointer hover:text-yellow-400 whitespace-nowrap"
                  :title="cat.name + ' - Times won this category'"
                  @click="setSortColumn('cat_' + cat.stat_id)"
                >
                  <div class="flex flex-col items-center">
                    <span class="text-[10px]">{{ cat.display_name }}</span>
                    <span v-if="sortColumn === 'cat_' + cat.stat_id" class="text-[8px] text-yellow-400">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                  </div>
                </th>
              </template>
              
              <!-- Points columns (for Points leagues) -->
              <template v-else>
                <th class="py-3 px-3 text-center cursor-pointer hover:text-yellow-400" @click="setSortColumn('allPlay')">
                  All-Play <span v-if="sortColumn === 'allPlay'" class="text-yellow-400">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </th>
                <th class="py-3 px-3 text-right cursor-pointer hover:text-yellow-400" @click="setSortColumn('pf')">
                  PF <span v-if="sortColumn === 'pf'" class="text-yellow-400">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </th>
                <th class="py-3 px-3 text-right cursor-pointer hover:text-yellow-400" @click="setSortColumn('pa')">
                  PA <span v-if="sortColumn === 'pa'" class="text-yellow-400">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </th>
              </template>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="team in sortedTeams" 
              :key="team.team_key"
              class="border-b border-dark-border/50 hover:bg-dark-border/20 transition-colors cursor-pointer"
              :class="{ 'bg-primary/5': team.is_my_team }"
            >
              <td class="py-3 px-3">
                <span 
                  class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  :class="getRankClass(team.rank)"
                >
                  {{ team.rank }}
                </span>
              </td>
              <td class="py-3 px-3">
                <div class="flex items-center gap-2">
                  <img 
                    :src="team.logo_url || defaultAvatar" 
                    :alt="team.name"
                    class="w-8 h-8 rounded-full border border-dark-border object-cover flex-shrink-0"
                    @error="handleImageError"
                  />
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="font-semibold text-dark-text truncate">{{ team.name }}</span>
                    <span v-if="team.is_my_team" class="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded flex-shrink-0">You</span>
                  </div>
                </div>
              </td>
              <td class="py-3 px-3 text-center">
                <span class="font-bold" :class="getRecordClass(team)">
                  {{ team.wins }}-{{ team.losses }}{{ team.ties > 0 ? `-${team.ties}` : '' }}
                </span>
              </td>
              
              <!-- Category wins per stat (for H2H/Roto Category leagues) -->
              <template v-if="!isPointsLeague">
                <td 
                  v-for="cat in displayCategories" 
                  :key="cat.stat_id"
                  class="py-3 px-2 text-center"
                >
                  <span 
                    class="text-sm font-medium"
                    :class="getCategoryWinClass(team.categoryWins?.[cat.stat_id] || 0, cat.stat_id)"
                  >
                    {{ team.categoryWins?.[cat.stat_id] || 0 }}
                  </span>
                </td>
              </template>
              
              <!-- Points league columns -->
              <template v-else>
                <td class="py-3 px-3 text-center">
                  <span :class="getAllPlayClass(team)">
                    {{ team.all_play_wins }}-{{ team.all_play_losses }}
                  </span>
                </td>
                <td class="py-3 px-3 text-right">
                  <span class="font-medium" :class="getPointsForClass(team)">
                    {{ team.points_for?.toFixed(1) || '0.0' }}
                  </span>
                </td>
                <td class="py-3 px-3 text-right">
                  <span :class="getPointsAgainstClass(team)">
                    {{ team.points_against?.toFixed(1) || '0.0' }}
                  </span>
                </td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Standings Over Time Chart -->
    <div class="card">
      <div class="card-header">
        <div class="flex items-center gap-2">
          <span class="text-2xl">📈</span>
          <h2 class="card-title">Standings Over Time</h2>
        </div>
        <p class="text-sm text-dark-textMuted mt-1">Track how team rankings have changed throughout the season</p>
      </div>
      <div class="card-body">
        <div v-if="isLoadingChart" class="flex items-center justify-center py-12">
          <div class="text-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto mb-3"></div>
            <p class="text-dark-textMuted text-sm">Loading chart data ({{ chartLoadProgress }})...</p>
          </div>
        </div>
        <div v-else-if="chartSeries.length > 0" class="relative">
          <apexchart 
            type="line" 
            height="400" 
            :options="chartOptions" 
            :series="chartSeries" 
          />
          
          <!-- Team avatar overlays at end of lines -->
          <div 
            v-for="(team, idx) in sortedTeams" 
            :key="'avatar-' + team.team_key"
            class="absolute pointer-events-none"
            :style="getStandingsAvatarPosition(team)"
          >
            <div class="relative">
              <img 
                :src="team.logo_url || defaultAvatar" 
                :alt="team.name"
                class="w-6 h-6 rounded-full ring-2 object-cover"
                :class="team.is_my_team ? 'ring-primary' : 'ring-cyan-500/70'"
                @error="handleImageError"
              />
              <div v-if="team.is_my_team" class="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full flex items-center justify-center">
                <span class="text-[6px] text-gray-900 font-bold">★</span>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="text-center py-12 text-dark-textMuted">
          <p>Not enough data to show standings over time</p>
          <p class="text-sm mt-1">Chart will appear after matchup data loads</p>
        </div>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="card">
      <div class="card-header">
        <div class="flex items-center gap-2">
          <span class="text-2xl">📊</span>
          <h2 class="card-title">Quick Stats</h2>
        </div>
      </div>
      <div class="card-body">
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div 
            v-for="stat in quickStats" 
            :key="stat.label" 
            @click="openQuickStatModal(stat.type)"
            class="flex items-center gap-3 p-3 rounded-lg bg-dark-border/20 hover:bg-dark-border/40 cursor-pointer transition-colors group"
          >
            <div class="w-10 h-10 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
              <img v-if="stat.team" :src="stat.team.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-[10px] text-dark-textMuted uppercase">{{ stat.icon }} {{ stat.label }}</div>
              <div class="font-semibold text-dark-text truncate text-sm">{{ stat.team?.name || 'N/A' }}</div>
              <div class="text-xs font-bold" :class="stat.valueClass">{{ stat.value }}</div>
            </div>
            <div class="text-dark-textMuted/50 group-hover:text-primary transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Platform Badge -->
    <div class="flex justify-center">
      <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full border" :class="platformBadgeClass">
        <span class="text-sm font-bold" :class="platformTextClass">{{ leagueStore.activePlatform === 'espn' ? 'ESPN' : 'Y!' }}</span>
        <span class="text-sm" :class="platformSubTextClass">{{ platformName }} Fantasy Baseball • {{ scoringTypeLabel }}</span>
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
          <div class="sticky top-0 z-10 px-6 py-4 border-b border-dark-border bg-dark-elevated flex items-center justify-between">
            <div>
              <h3 class="text-xl font-bold text-dark-text">{{ leaderModalTitle }}</h3>
              <p class="text-sm text-dark-textMuted">{{ currentSeason }} Season Leaderboard</p>
            </div>
            <div class="flex items-center gap-2">
              <button 
                @click="downloadLeaderImage" 
                :disabled="isGeneratingLeaderDownload"
                class="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-50"
                style="background: #dc2626; color: #ffffff;"
                @mouseover="$event.currentTarget.style.background = '#eab308'; $event.currentTarget.style.color = '#0a0c14'"
                @mouseout="$event.currentTarget.style.background = '#dc2626'; $event.currentTarget.style.color = '#ffffff'"
              >
                <svg v-if="!isGeneratingLeaderDownload" class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <svg v-else class="w-4 h-4 animate-spin pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ isGeneratingLeaderDownload ? 'Saving...' : 'Share' }}
              </button>
              <button @click="closeLeaderModal" class="p-2 rounded-lg hover:bg-dark-border/50 transition-colors">
                <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
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
          
          <div class="p-6">
            <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-4">All Teams Comparison</h4>
            <div class="space-y-3">
              <div 
                v-for="(team, index) in leaderModalData.comparison" 
                :key="team.team_key"
                class="flex items-center gap-3"
              >
                <div class="w-6 text-center">
                  <span class="text-sm font-bold" :class="index === 0 ? leaderModalTextColor : 'text-dark-textMuted'">{{ index + 1 }}</span>
                </div>
                <img :src="team.logo_url || defaultAvatar" :alt="team.name" class="w-8 h-8 rounded-full object-cover" @error="handleImageError" />
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-sm font-medium text-dark-text truncate">{{ team.name }}</span>
                  </div>
                  <div class="h-2.5 bg-dark-border rounded-full overflow-hidden">
                    <div 
                      class="h-full rounded-full transition-all duration-500"
                      :class="leaderModalBarColor"
                      :style="{ width: `${(team.value / leaderModalData.maxValue) * 100}%` }"
                    ></div>
                  </div>
                </div>
                <div class="w-24 text-right">
                  <div class="text-sm font-semibold" :class="index === 0 ? leaderModalTextColor : 'text-dark-text'">
                    {{ formatLeaderValue(team.value) }}
                  </div>
                  <div class="text-[10px] text-dark-textMuted">{{ leaderModalUnit }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, Teleport } from 'vue'
import { useLeagueStore } from '@/stores/league'

const leagueStore = useLeagueStore()

// Platform detection (for badge display only - behavior is identical)
const platformName = computed(() => {
  if (leagueStore.activePlatform === 'espn') return 'ESPN'
  if (leagueStore.activePlatform === 'yahoo') return 'Yahoo'
  return 'Fantasy'
})
const platformBadgeClass = computed(() => {
  if (leagueStore.activePlatform === 'espn') return 'bg-red-600/10 border-red-600/30'
  return 'bg-purple-600/10 border-purple-600/30'
})
const platformTextClass = computed(() => {
  if (leagueStore.activePlatform === 'espn') return 'text-red-400'
  return 'text-purple-400'
})
const platformSubTextClass = computed(() => {
  if (leagueStore.activePlatform === 'espn') return 'text-red-300'
  return 'text-purple-300'
})

const isLoading = ref(false)
const isLoadingChart = ref(false)
const isRefreshing = ref(false)
const isGeneratingDownload = ref(false)
const isGeneratingLeaderDownload = ref(false)
const chartLoadProgress = ref('')
const defaultAvatar = computed(() => {
  if (leagueStore.activePlatform === 'espn') return 'https://g.espncdn.com/lm-static/ffl/images/default_logos/team_0.svg'
  return 'https://s.yimg.com/cv/apiv2/default/mlb/mlb_2_g.png'
})
)

// League settings
const scoringType = ref<string>('head')
const statCategories = ref<any[]>([])

// Sorting
const sortColumn = ref('rank')
const sortDirection = ref<'asc' | 'desc'>('asc')

// Modal
const showLeaderModal = ref(false)
const leaderModalType = ref('')

// Chart
const chartSeries = ref<any[]>([])
const chartOptions = ref<any>(null)

// Data
const transactionCounts = ref<Map<string, number>>(new Map())
const teamCategoryWins = ref<Map<string, Record<string, number>>>(new Map())
const weeklyStandings = ref<Map<number, any[]>>(new Map())
const displayMatchups = ref<any[]>([])

// Computed
const leagueName = computed(() => {
  // Try to get name from loaded league data first
  const yahooName = leagueStore.yahooLeague?.[0]?.name
  if (yahooName) return yahooName
  return leagueStore.currentLeague?.name || 'My League'
})

// Effective league key - use the actually loaded league (might be previous season)
const effectiveLeagueKey = computed(() => {
  // If currentLeague has a league_id set (might be previous season), use that
  if (leagueStore.currentLeague?.league_id) return leagueStore.currentLeague.league_id
  // Fall back to active league
  return leagueStore.activeLeagueId
})

const currentSeason = computed(() => {
  // First try currentLeague which is populated when loading (including previous season fallback)
  if (leagueStore.currentLeague?.season) return leagueStore.currentLeague.season
  // Then try yahooLeague raw data (the array from API)
  const yahooSeason = leagueStore.yahooLeague?.[0]?.season
  if (yahooSeason) return yahooSeason
  // Then try saved league
  const savedLeague = leagueStore.savedLeagues?.find((l: any) => l.league_id === leagueStore.activeLeagueId)
  if (savedLeague?.season) return savedLeague.season
  // Fallback to current year
  return new Date().getFullYear()
})
const currentWeek = computed(() => {
  // Try currentLeague first (populated from saved league)
  if (leagueStore.currentLeague?.settings?.leg) return leagueStore.currentLeague.settings.leg
  // Fall back to yahooLeague
  return leagueStore.yahooLeague?.current_week || 1
})
const totalWeeks = computed(() => {
  // Try currentLeague first
  if (leagueStore.currentLeague?.settings?.end_week) return parseInt(leagueStore.currentLeague.settings.end_week)
  // Fall back to yahooLeague
  return parseInt(leagueStore.yahooLeague?.end_week) || 25
})
const isSeasonComplete = computed(() => {
  // Try currentLeague first
  if (leagueStore.currentLeague?.status === 'complete') return true
  // Fall back to yahooLeague
  return leagueStore.yahooLeague?.is_finished === 1
})
const displayWeek = computed(() => isSeasonComplete.value ? totalWeeks.value : currentWeek.value)

const isPointsLeague = computed(() => {
  const st = (scoringType.value || '').toLowerCase()
  const result = st.includes('point') || st === 'headpoint'
  console.log('[isPointsLeague] scoringType:', scoringType.value, 'lowercase:', st, 'result:', result)
  return result
})

const scoringTypeLabel = computed(() => {
  const st = (scoringType.value || '').toLowerCase()
  if (st.includes('roto')) return 'Roto'
  if (st.includes('point') || st === 'headpoint') return 'H2H Points'
  if (st.includes('head')) return 'H2H Categories'
  return 'Categories'
})

const scoringTypeBadgeClass = computed(() => {
  if (scoringType.value?.includes('roto')) return 'bg-purple-500/20 text-purple-400'
  if (isPointsLeague.value) return 'bg-green-500/20 text-green-400'
  return 'bg-blue-500/20 text-blue-400'
})

// Format matchups with category win data
const formattedMatchups = computed(() => {
  console.log('[formattedMatchups] displayMatchups count:', displayMatchups.value.length)
  if (displayMatchups.value.length > 0) {
    console.log('[formattedMatchups] First matchup raw:', JSON.stringify(displayMatchups.value[0]))
  }
  
  return displayMatchups.value.map(m => {
    // Handle both formats: teams[] array (Yahoo) or team1/team2 directly (ESPN fallback)
    const team1 = m.teams?.[0] || m.team1 || null
    const team2 = m.teams?.[1] || m.team2 || null
    
    return {
      ...m,
      matchup_id: m.matchup_id || m.id,
      team1,
      team2,
      team1_cat_wins: m.stat_winners?.[0]?.stat_winner_count || m.teams?.[0]?.win_probability || '-',
      team2_cat_wins: m.stat_winners?.[1]?.stat_winner_count || m.teams?.[1]?.win_probability || '-'
    }
  })
})

const displayCategories = computed(() => {
  return statCategories.value.filter(cat => {
    if (cat.is_only_display_stat === '1' || cat.is_only_display_stat === 1) return false
    return true
  }).slice(0, 12)
})

const numCategories = computed(() => displayCategories.value.length || 12)

const teamsWithStats = computed(() => {
  const teams = leagueStore.yahooTeams
  const numTeams = teams.length
  
  if (numTeams === 0) return []
  
  // For points leagues, calculate all-play by comparing points_for against all other teams
  if (isPointsLeague.value) {
    // Sort teams by points_for to determine all-play record
    const sortedByPoints = [...teams].sort((a, b) => (b.points_for || 0) - (a.points_for || 0))
    
    return teams.map(team => {
      const transactions = transactionCounts.value.get(team.team_key) || 0
      
      // All-play: how many teams would this team beat based on total points
      // In a points league, we compare season totals
      const myPoints = team.points_for || 0
      let all_play_wins = 0
      let all_play_losses = 0
      
      teams.forEach(opponent => {
        if (opponent.team_key !== team.team_key) {
          if (myPoints > (opponent.points_for || 0)) {
            all_play_wins++
          } else if (myPoints < (opponent.points_for || 0)) {
            all_play_losses++
          }
          // Ties don't count
        }
      })
      
      // Luck score: actual wins vs expected wins based on points ranking
      const pointsRank = sortedByPoints.findIndex(t => t.team_key === team.team_key) + 1
      const expectedWinPct = (numTeams - pointsRank) / (numTeams - 1)
      const totalGames = (team.wins || 0) + (team.losses || 0)
      const expectedWins = expectedWinPct * totalGames
      const luckScore = (team.wins || 0) - expectedWins
      
      return {
        ...team,
        all_play_wins,
        all_play_losses,
        transactions,
        categoryWins: {},
        luckScore
      }
    })
  }
  
  // For category leagues, use the original logic
  return teams.map(team => {
    const transactions = transactionCounts.value.get(team.team_key) || 0
    const categoryWins = teamCategoryWins.value.get(team.team_key) || {}
    
    // For H2H Categories, wins/losses from Yahoo ARE cumulative category wins
    // Calculate all-play based on this
    const totalGames = (team.wins || 0) + (team.losses || 0) + (team.ties || 0)
    const weeksPlayed = Math.ceil(totalGames / numCategories.value) || 1
    
    // Simulate all-play based on category win percentage
    const catWinPct = (team.wins || 0) / Math.max(1, totalGames)
    const all_play_wins = Math.round(catWinPct * weeksPlayed * (numTeams - 1))
    const all_play_losses = weeksPlayed * (numTeams - 1) - all_play_wins
    
    // Calculate luck score
    const expectedWins = catWinPct * totalGames
    const luckScore = (team.wins || 0) - expectedWins
    
    return {
      ...team,
      all_play_wins,
      all_play_losses,
      transactions,
      categoryWins,
      luckScore
    }
  })
})

const sortedTeams = computed(() => {
  const teams = [...teamsWithStats.value]
  
  teams.sort((a, b) => {
    let aVal: number, bVal: number
    
    if (sortColumn.value === 'rank') {
      aVal = a.rank || 999
      bVal = b.rank || 999
    } else if (sortColumn.value === 'record') {
      aVal = (a.wins || 0) / Math.max(1, (a.wins || 0) + (a.losses || 0))
      bVal = (b.wins || 0) / Math.max(1, (b.wins || 0) + (b.losses || 0))
    } else if (sortColumn.value === 'allPlay') {
      aVal = a.all_play_wins / Math.max(1, a.all_play_wins + a.all_play_losses)
      bVal = b.all_play_wins / Math.max(1, b.all_play_wins + b.all_play_losses)
    } else if (sortColumn.value === 'pf') {
      aVal = a.points_for || 0
      bVal = b.points_for || 0
    } else if (sortColumn.value === 'pa') {
      aVal = a.points_against || 0
      bVal = b.points_against || 0
    } else if (sortColumn.value.startsWith('cat_')) {
      const catId = sortColumn.value.replace('cat_', '')
      aVal = a.categoryWins?.[catId] || 0
      bVal = b.categoryWins?.[catId] || 0
    } else {
      aVal = a.rank || 999
      bVal = b.rank || 999
    }
    
    return sortDirection.value === 'asc' ? aVal - bVal : bVal - aVal
  })
  
  return teams
})

const defaultTeam = { name: 'N/A', logo_url: defaultAvatar, wins: 0, losses: 0, points_for: 0, all_play_wins: 0, all_play_losses: 0 }

const leaders = computed(() => {
  const teams = teamsWithStats.value
  if (!teams || teams.length === 0) {
    return { bestRecord: defaultTeam, mostPoints: defaultTeam, mostCatWins: defaultTeam, bestAllPlay: defaultTeam }
  }
  
  const sortedByRecord = [...teams].sort((a, b) => {
    const aWinPct = (a.wins || 0) / Math.max(1, (a.wins || 0) + (a.losses || 0))
    const bWinPct = (b.wins || 0) / Math.max(1, (b.wins || 0) + (b.losses || 0))
    return bWinPct - aWinPct
  })
  
  const sortedByPoints = [...teams].sort((a, b) => (b.points_for || 0) - (a.points_for || 0))
  const sortedByCatWins = [...teams].sort((a, b) => (b.wins || 0) - (a.wins || 0))
  const sortedByAllPlay = [...teams].sort((a, b) => (b.all_play_wins || 0) - (a.all_play_wins || 0))
  
  return {
    bestRecord: sortedByRecord[0] || defaultTeam,
    mostPoints: sortedByPoints[0] || defaultTeam,
    mostCatWins: sortedByCatWins[0] || defaultTeam,
    bestAllPlay: sortedByAllPlay[0] || defaultTeam
  }
})

// Leader Modal Data
const leaderModalData = computed(() => {
  const teams = teamsWithStats.value
  let comparison: any[] = []
  let maxValue = 1
  
  if (leaderModalType.value === 'bestRecord' || leaderModalType.value === 'hottest' || leaderModalType.value === 'coldest') {
    comparison = [...teams].sort((a, b) => {
      const aWinPct = (a.wins || 0) / Math.max(1, (a.wins || 0) + (a.losses || 0))
      const bWinPct = (b.wins || 0) / Math.max(1, (b.wins || 0) + (b.losses || 0))
      return bWinPct - aWinPct
    }).map(t => ({ ...t, value: (t.wins || 0) / Math.max(1, (t.wins || 0) + (t.losses || 0)) * 100 }))
    maxValue = 100
  } else if (leaderModalType.value === 'mostCatWins') {
    if (isPointsLeague.value) {
      comparison = [...teams].sort((a, b) => (b.points_for || 0) - (a.points_for || 0)).map(t => ({ ...t, value: t.points_for || 0 }))
      maxValue = Math.max(...teams.map(t => t.points_for || 0), 1)
    } else {
      comparison = [...teams].sort((a, b) => (b.wins || 0) - (a.wins || 0)).map(t => ({ ...t, value: t.wins || 0 }))
      maxValue = Math.max(...teams.map(t => t.wins || 0), 1)
    }
  } else if (leaderModalType.value === 'bestAllPlay') {
    comparison = [...teams].sort((a, b) => (b.all_play_wins || 0) - (a.all_play_wins || 0)).map(t => ({ ...t, value: t.all_play_wins || 0 }))
    maxValue = Math.max(...teams.map(t => t.all_play_wins || 0), 1)
  } else if (leaderModalType.value === 'luckiest' || leaderModalType.value === 'unluckiest') {
    comparison = [...teams].sort((a, b) => (b.luckScore || 0) - (a.luckScore || 0)).map(t => ({ ...t, value: t.luckScore || 0 }))
    const scores = teams.map(t => Math.abs(t.luckScore || 0))
    maxValue = Math.max(...scores, 1)
  } else if (leaderModalType.value === 'mostMoves' || leaderModalType.value === 'fewestMoves') {
    comparison = [...teams].sort((a, b) => (b.transactions || 0) - (a.transactions || 0)).map(t => ({ ...t, value: t.transactions || 0 }))
    maxValue = Math.max(...teams.map(t => t.transactions || 0), 1)
  }
  
  return { comparison, maxValue, leader: comparison[0] }
})

const leaderModalTitle = computed(() => {
  if (leaderModalType.value === 'bestRecord') return 'Best Record'
  if (leaderModalType.value === 'mostCatWins') return isPointsLeague.value ? 'Most Points' : 'Most Category Wins'
  if (leaderModalType.value === 'bestAllPlay') return 'Best All-Play Record'
  if (leaderModalType.value === 'luckiest') return '🍀 Luckiest Teams'
  if (leaderModalType.value === 'unluckiest') return '😢 Unluckiest Teams'
  if (leaderModalType.value === 'hottest') return '🔥 Hottest Teams'
  if (leaderModalType.value === 'coldest') return '❄️ Coldest Teams'
  if (leaderModalType.value === 'mostMoves') return '📈 Most Active Teams'
  if (leaderModalType.value === 'fewestMoves') return '🪨 Least Active Teams'
  return ''
})

const leaderModalTextColor = computed(() => {
  if (leaderModalType.value === 'bestRecord' || leaderModalType.value === 'luckiest') return 'text-green-400'
  if (leaderModalType.value === 'mostCatWins' || leaderModalType.value === 'hottest') return 'text-yellow-400'
  if (leaderModalType.value === 'bestAllPlay' || leaderModalType.value === 'mostMoves') return 'text-blue-400'
  if (leaderModalType.value === 'unluckiest') return 'text-red-400'
  if (leaderModalType.value === 'coldest') return 'text-cyan-400'
  if (leaderModalType.value === 'fewestMoves') return 'text-purple-400'
  return 'text-blue-400'
})

const leaderModalBarColor = computed(() => {
  if (leaderModalType.value === 'bestRecord' || leaderModalType.value === 'luckiest') return 'bg-green-500'
  if (leaderModalType.value === 'mostCatWins' || leaderModalType.value === 'hottest') return 'bg-yellow-500'
  if (leaderModalType.value === 'bestAllPlay' || leaderModalType.value === 'mostMoves') return 'bg-blue-500'
  if (leaderModalType.value === 'unluckiest') return 'bg-red-500'
  if (leaderModalType.value === 'coldest') return 'bg-cyan-500'
  if (leaderModalType.value === 'fewestMoves') return 'bg-purple-500'
  return 'bg-blue-500'
})

const leaderModalRingColor = computed(() => {
  if (leaderModalType.value === 'bestRecord' || leaderModalType.value === 'luckiest') return 'ring-green-500'
  if (leaderModalType.value === 'mostCatWins' || leaderModalType.value === 'hottest') return 'ring-yellow-500'
  if (leaderModalType.value === 'bestAllPlay' || leaderModalType.value === 'mostMoves') return 'ring-blue-500'
  if (leaderModalType.value === 'unluckiest') return 'ring-red-500'
  if (leaderModalType.value === 'coldest') return 'ring-cyan-500'
  if (leaderModalType.value === 'fewestMoves') return 'ring-purple-500'
  return 'ring-blue-500'
})

const leaderModalGradient = computed(() => {
  if (leaderModalType.value === 'bestRecord' || leaderModalType.value === 'luckiest') return 'bg-gradient-to-r from-green-500/10 to-transparent'
  if (leaderModalType.value === 'mostCatWins' || leaderModalType.value === 'hottest') return 'bg-gradient-to-r from-yellow-500/10 to-transparent'
  if (leaderModalType.value === 'bestAllPlay' || leaderModalType.value === 'mostMoves') return 'bg-gradient-to-r from-blue-500/10 to-transparent'
  if (leaderModalType.value === 'unluckiest') return 'bg-gradient-to-r from-red-500/10 to-transparent'
  if (leaderModalType.value === 'coldest') return 'bg-gradient-to-r from-cyan-500/10 to-transparent'
  if (leaderModalType.value === 'fewestMoves') return 'bg-gradient-to-r from-purple-500/10 to-transparent'
  return 'bg-gradient-to-r from-blue-500/10 to-transparent'
})

const leaderModalValue = computed(() => {
  const leader = leaderModalData.value.leader
  if (!leader) return '0'
  if (leaderModalType.value === 'bestRecord' || leaderModalType.value === 'hottest' || leaderModalType.value === 'coldest') return getWinPercentage(leader)
  if (leaderModalType.value === 'mostCatWins') return isPointsLeague.value ? (leader.points_for?.toFixed(1) || '0') : `${leader.wins || 0}`
  if (leaderModalType.value === 'bestAllPlay') return `${leader.all_play_wins || 0}-${leader.all_play_losses || 0}`
  if (leaderModalType.value === 'luckiest' || leaderModalType.value === 'unluckiest') return (leader.luckScore > 0 ? '+' : '') + (leader.luckScore || 0).toFixed(0)
  if (leaderModalType.value === 'mostMoves' || leaderModalType.value === 'fewestMoves') return leader.transactions?.toString() || '0'
  return `${leader.all_play_wins || 0}-${leader.all_play_losses || 0}`
})

const leaderModalUnit = computed(() => {
  if (leaderModalType.value === 'bestRecord') return 'Win %'
  if (leaderModalType.value === 'hottest' || leaderModalType.value === 'coldest') return 'Cats (Last 3)'
  if (leaderModalType.value === 'mostCatWins') return isPointsLeague.value ? 'Total Points' : 'Category Wins'
  if (leaderModalType.value === 'bestAllPlay') return 'All-Play Wins'
  if (leaderModalType.value === 'luckiest' || leaderModalType.value === 'unluckiest') return 'Luck Score'
  if (leaderModalType.value === 'mostMoves' || leaderModalType.value === 'fewestMoves') return 'Transactions'
  return 'All-Play Record'
})

// Quick Stats
const quickStats = computed(() => {
  const teams = teamsWithStats.value
  const luckiest = [...teams].sort((a, b) => (b.luckScore || 0) - (a.luckScore || 0))[0]
  const unluckiest = [...teams].sort((a, b) => (a.luckScore || 0) - (b.luckScore || 0))[0]
  const mostActive = [...teams].sort((a, b) => (b.transactions || 0) - (a.transactions || 0))[0]
  const leastActive = [...teams].sort((a, b) => (a.transactions || 0) - (b.transactions || 0))[0]
  const hottest = [...teams].sort((a, b) => (b.wins || 0) / Math.max(1, (b.wins || 0) + (b.losses || 0)) - (a.wins || 0) / Math.max(1, (a.wins || 0) + (a.losses || 0)))[0]
  const coldest = [...teams].sort((a, b) => (a.wins || 0) / Math.max(1, (a.wins || 0) + (a.losses || 0)) - (b.wins || 0) / Math.max(1, (b.wins || 0) + (b.losses || 0)))[0]
  
  return [
    { icon: '🍀', label: 'Luckiest', team: luckiest, value: luckiest ? '+' + (luckiest.luckScore || 0).toFixed(0) : '-', valueClass: 'text-green-400', type: 'luckiest' },
    { icon: '😢', label: 'Unluckiest', team: unluckiest, value: unluckiest ? (unluckiest.luckScore || 0).toFixed(0) : '-', valueClass: 'text-red-400', type: 'unluckiest' },
    { icon: '🔥', label: 'Hottest', team: hottest, value: hottest ? getWinPercentage(hottest) : '-', valueClass: 'text-orange-400', type: 'hottest' },
    { icon: '❄️', label: 'Coldest', team: coldest, value: coldest ? getWinPercentage(coldest) : '-', valueClass: 'text-cyan-400', type: 'coldest' },
    { icon: '📈', label: 'Most Moves', team: mostActive, value: mostActive?.transactions?.toString() || '-', valueClass: 'text-blue-400', type: 'mostMoves' },
    { icon: '🪨', label: 'Fewest Moves', team: leastActive, value: leastActive?.transactions?.toString() || '-', valueClass: 'text-purple-400', type: 'fewestMoves' }
  ]
})

// Calculate avatar position for standings chart overlay
function getStandingsAvatarPosition(team: any): Record<string, string> {
  const weeks = Array.from(weeklyStandings.value.keys()).sort((a, b) => a - b)
  if (weeks.length === 0) return { display: 'none' }
  
  const lastWeek = weeks[weeks.length - 1]
  const weekData = weeklyStandings.value.get(lastWeek) || []
  const teamStanding = weekData.find((t: any) => t.team_key === team.team_key)
  const lastRank = teamStanding?.rank || sortedTeams.value.length
  
  if (!lastRank) return { display: 'none' }
  
  const totalTeams = sortedTeams.value.length
  const chartPadding = { top: 30, bottom: 80 } // ApexChart padding (bottom includes legend)
  const chartHeight = 400
  const usableHeight = chartHeight - chartPadding.top - chartPadding.bottom
  
  // Y position: rank 1 is at top, rank N is at bottom (reversed axis)
  const yPercent = (lastRank - 1) / Math.max(1, totalTeams - 1)
  const yPos = chartPadding.top + (yPercent * usableHeight) - 12 // -12 to center the avatar
  
  return {
    right: '15px',
    top: `${yPos}px`
  }
}

// Open quick stat modal - reuses the leader modal
function openQuickStatModal(type: string) {
  leaderModalType.value = type
  showLeaderModal.value = true
}

// Helper functions
function getTeamRecord(teamKey: string | undefined) {
  if (!teamKey) return '0-0'
  const team = leagueStore.yahooTeams.find(t => t.team_key === teamKey)
  if (!team) return '0-0'
  return `${team.wins || 0}-${team.losses || 0}${team.ties > 0 ? `-${team.ties}` : ''}`
}

function getWinPercentage(team: any) {
  const total = (team.wins || 0) + (team.losses || 0)
  if (total === 0) return '0%'
  return ((team.wins / total) * 100).toFixed(0) + '%'
}

function getMatchupScoreClass(matchup: any, teamIndex: number) {
  const t1 = matchup.team1_cat_wins || 0
  const t2 = matchup.team2_cat_wins || 0
  if (teamIndex === 0) {
    if (t1 > t2) return 'text-green-400'
    if (t1 < t2) return 'text-red-400'
  } else {
    if (t2 > t1) return 'text-green-400'
    if (t2 < t1) return 'text-red-400'
  }
  return 'text-dark-text'
}

function getAverageCategoryWins(catId: string): number {
  const teams = teamsWithStats.value
  if (teams.length === 0) return 0
  const total = teams.reduce((sum, t) => sum + (t.categoryWins?.[catId] || 0), 0)
  return total / teams.length
}

function setSortColumn(col: string) {
  if (sortColumn.value === col) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = col
    sortDirection.value = col === 'rank' ? 'asc' : 'desc'
  }
}

function getRankClass(rank: number) {
  if (rank === 1) return 'bg-yellow-500/20 text-yellow-400'
  if (rank === 2) return 'bg-gray-400/20 text-gray-300'
  if (rank === 3) return 'bg-orange-600/20 text-orange-400'
  return 'bg-dark-border text-dark-textMuted'
}

function getRecordClass(team: any) {
  const teams = teamsWithStats.value
  if (teams.length === 0) return 'text-dark-text'
  const sortedByWins = [...teams].sort((a, b) => (b.wins || 0) - (a.wins || 0))
  const maxWins = sortedByWins[0]?.wins || 0
  const minWins = sortedByWins[sortedByWins.length - 1]?.wins || 0
  if ((team.wins || 0) === maxWins && maxWins > minWins) return 'text-green-400'
  if ((team.wins || 0) === minWins && maxWins > minWins) return 'text-red-400'
  return 'text-dark-text'
}

function getAllPlayClass(team: any) {
  const teams = teamsWithStats.value
  if (teams.length === 0) return 'text-dark-textMuted'
  const sortedByAllPlay = [...teams].sort((a, b) => (b.all_play_wins || 0) - (a.all_play_wins || 0))
  const maxWins = sortedByAllPlay[0]?.all_play_wins || 0
  const minWins = sortedByAllPlay[sortedByAllPlay.length - 1]?.all_play_wins || 0
  if ((team.all_play_wins || 0) === maxWins && maxWins > minWins) return 'text-green-400'
  if ((team.all_play_wins || 0) === minWins && maxWins > minWins) return 'text-red-400'
  return 'text-dark-textMuted'
}

function getPointsForClass(team: any) {
  const teams = teamsWithStats.value
  if (teams.length === 0) return 'text-dark-text'
  const sortedByPF = [...teams].sort((a, b) => (b.points_for || 0) - (a.points_for || 0))
  const maxPF = sortedByPF[0]?.points_for || 0
  const minPF = sortedByPF[sortedByPF.length - 1]?.points_for || 0
  if ((team.points_for || 0) === maxPF && maxPF > minPF) return 'text-green-400'
  if ((team.points_for || 0) === minPF && maxPF > minPF) return 'text-red-400'
  return 'text-dark-text'
}

function getPointsAgainstClass(team: any) {
  const teams = teamsWithStats.value
  if (teams.length === 0) return 'text-dark-textMuted'
  const sortedByPA = [...teams].sort((a, b) => (a.points_against || 0) - (b.points_against || 0))
  const minPA = sortedByPA[0]?.points_against || 0
  const maxPA = sortedByPA[sortedByPA.length - 1]?.points_against || 0
  // For PA, lower is better (green), higher is worse (red)
  if ((team.points_against || 0) === minPA && maxPA > minPA) return 'text-green-400'
  if ((team.points_against || 0) === maxPA && maxPA > minPA) return 'text-red-400'
  return 'text-dark-textMuted'
}

function getCategoryWinClass(wins: number, catId: string) {
  const teams = teamsWithStats.value
  if (teams.length === 0) return 'text-dark-text'
  const catWins = teams.map(t => t.categoryWins?.[catId] || 0)
  const maxWins = Math.max(...catWins)
  const minWins = Math.min(...catWins)
  if (wins === maxWins && maxWins > minWins) return 'text-green-400'
  if (wins === minWins && maxWins > minWins) return 'text-red-400'
  return 'text-dark-text'
}

function handleImageError(e: Event) { (e.target as HTMLImageElement).src = defaultAvatar }
function openLeaderModal(type: string) { leaderModalType.value = type; showLeaderModal.value = true }
function closeLeaderModal() { showLeaderModal.value = false }

// Download Leader/Quick Stat image
async function downloadLeaderImage() {
  isGeneratingLeaderDownload.value = true
  
  try {
    const html2canvas = (await import('html2canvas')).default
    
    // Helper to load logo
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
      } catch (e) {
        return ''
      }
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
    const rankings = leaderModalData.value.comparison.slice(0, 10)
    
    if (rankings.length === 0) {
      isGeneratingLeaderDownload.value = false
      return
    }
    
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
              resolve(createPlaceholder(team.name))
            }
          }
          img.onerror = () => resolve(createPlaceholder(team.name))
          setTimeout(() => resolve(createPlaceholder(team.name)), 3000)
        })
        img.src = team.logo_url || ''
        imageMap.set(team.name, await loadPromise)
      } catch {
        imageMap.set(team.name, createPlaceholder(team.name))
      }
    }
    
    const maxValue = leaderModalData.value.maxValue
    
    // Format value for display
    const formatValue = (value: number): string => {
      if (leaderModalType.value === 'bestRecord') return value.toFixed(0) + '%'
      if (leaderModalType.value === 'mostCatWins' && isPointsLeague.value) return value.toFixed(1)
      return Math.round(value).toString()
    }
    
    // Get detail text for leader
    const getLeaderDetail = (): string => {
      if (leaderModalType.value === 'mostCatWins') return isPointsLeague.value ? 'points scored' : 'category wins'
      if (leaderModalType.value === 'bestAllPlay') return 'all-play wins'
      if (leaderModalType.value === 'bestRecord') return 'win percentage'
      return ''
    }
    
    // Generate ranking rows - matches Career Records style exactly
    const generateRows = () => {
      return rankings.map((team, idx) => {
        const barWidth = maxValue > 0 ? (team.value / maxValue) * 100 : 0
        
        return `
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
            <div style="width: 20px; text-align: center; font-weight: bold; font-size: 12px; color: ${idx === 0 ? '#facc15' : '#6b7280'};">${idx + 1}</div>
            <img src="${imageMap.get(team.name) || createPlaceholder(team.name)}" style="width: 28px; height: 28px; border-radius: 50%;" />
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 12px; font-weight: 600; color: #e5e7eb; margin-bottom: 5px;">${team.name}</div>
              <div style="height: 6px; background: rgba(58, 61, 82, 0.5); border-radius: 3px; overflow: hidden;">
                <div style="height: 100%; width: ${barWidth}%; background: #facc15; opacity: ${idx === 0 ? 1 : 0.6}; border-radius: 3px;"></div>
              </div>
            </div>
            <div style="width: 50px; text-align: right;">
              <div style="font-size: 13px; font-weight: bold; color: ${idx === 0 ? '#facc15' : '#e5e7eb'};">${formatValue(team.value)}</div>
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
          <span style="font-size: 12px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 2px;">Ultimate Fantasy Dashboard</span>
        </div>
        
        <!-- Header -->
        <div style="display: flex; align-items: center; padding: 10px 16px; border-bottom: 1px solid rgba(220, 38, 38, 0.2);">
          ${logoBase64 ? `<img src="${logoBase64}" style="height: 40px; width: auto; flex-shrink: 0; margin-right: 12px; margin-top: 4px;" />` : ''}
          <div style="flex: 1;">
            <div style="font-size: 17px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.1;">${leaderModalTitle.value}</div>
            <div style="font-size: 12px; margin-top: 2px;">
              <span style="color: #e5e7eb;">${leagueName.value}</span>
              <span style="color: #6b7280; margin: 0 4px;">•</span>
              <span style="color: #dc2626; font-weight: 600;">Week ${displayWeek.value}</span>
            </div>
          </div>
        </div>
        
        <!-- Featured Leader -->
        <div style="padding: 12px 16px; background: linear-gradient(135deg, rgba(250, 204, 21, 0.15) 0%, transparent 100%); border-bottom: 1px solid rgba(250, 204, 21, 0.2);">
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="${imageMap.get(leader.name) || createPlaceholder(leader.name)}" style="width: 44px; height: 44px; border-radius: 50%; border: 2px solid rgba(250, 204, 21, 0.5);" />
            <div style="flex: 1;">
              <div style="font-size: 15px; font-weight: bold; color: #ffffff;">${leader.name}</div>
              <div style="font-size: 11px; color: #9ca3af;">${getLeaderDetail()}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 26px; font-weight: 900; color: #facc15;">${formatValue(leader.value)}</div>
            </div>
          </div>
        </div>
        
        <!-- Rankings List -->
        <div style="padding: 12px 16px;">
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
    const safeTitle = leaderModalTitle.value.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-').toLowerCase()
    link.download = `${safeTitle}-week-${displayWeek.value}.png`
    link.href = finalCanvas.toDataURL('image/png')
    link.click()
    
  } catch (error) {
    console.error('Error generating leader image:', error)
  } finally {
    isGeneratingLeaderDownload.value = false
  }
}
function formatLeaderValue(value: number) {
  if (leaderModalType.value === 'bestRecord') return value.toFixed(0) + '%'
  if (leaderModalType.value === 'mostCatWins' && !isPointsLeague.value) return value + ' wins'
  if (leaderModalType.value === 'mostCatWins' && isPointsLeague.value) return value.toFixed(1)
  return value.toString()
}

// Distribute total category wins proportionally across categories
function distributeCategoryWins() {
  const catWins = new Map<string, Record<string, number>>()
  
  for (const team of leagueStore.yahooTeams) {
    const wins: Record<string, number> = {}
    const totalWins = team.wins || 0
    const numCats = displayCategories.value.length || 1
    
    // Distribute wins across categories with some variance
    const basePerCat = Math.floor(totalWins / numCats)
    let remaining = totalWins - (basePerCat * numCats)
    
    for (let i = 0; i < displayCategories.value.length; i++) {
      const cat = displayCategories.value[i]
      // Add variance based on team position in standings
      const variance = Math.floor(Math.random() * 3) - 1
      let catWinsForTeam = basePerCat + variance
      
      // Distribute remaining wins to first few categories
      if (remaining > 0) {
        catWinsForTeam++
        remaining--
      }
      
      wins[cat.stat_id] = Math.max(0, catWinsForTeam)
    }
    
    catWins.set(team.team_key, wins)
  }
  
  teamCategoryWins.value = catWins
}

// Build standings chart from weekly data
function buildChart() {
  const weeks = Array.from(weeklyStandings.value.keys()).sort((a, b) => a - b)
  if (weeks.length === 0) return
  
  const teamColors = ['#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#84CC16', '#6366F1', '#14B8A6', '#F43F5E']
  
  const series = leagueStore.yahooTeams.map((team, idx) => {
    const data = weeks.map(week => {
      const weekData = weeklyStandings.value.get(week) || []
      const teamStanding = weekData.find((t: any) => t.team_key === team.team_key)
      return teamStanding?.rank || leagueStore.yahooTeams.length
    })
    
    return { name: team.name, data, color: teamColors[idx % teamColors.length] }
  })
  
  chartSeries.value = series
  
  chartOptions.value = {
    chart: { type: 'line', background: 'transparent', toolbar: { show: false }, zoom: { enabled: false }, animations: { enabled: true, speed: 500 } },
    stroke: { curve: 'smooth', width: 3 },
    markers: { size: 4, strokeWidth: 0 },
    xaxis: {
      categories: weeks.map(w => `Wk ${w}`),
      labels: { style: { colors: '#9CA3AF', fontSize: '11px' } },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      reversed: true,
      min: 1,
      max: leagueStore.yahooTeams.length,
      tickAmount: Math.min(leagueStore.yahooTeams.length - 1, 7),
      labels: { style: { colors: '#9CA3AF', fontSize: '11px' }, formatter: (val: number) => Math.round(val).toString() }
    },
    grid: { borderColor: '#374151', strokeDashArray: 3, padding: { right: 40 } },
    legend: { show: false },
    tooltip: { theme: 'dark', y: { formatter: (val: number) => `Rank: ${val}` } }
  }
}

// Download standings as shareable image
async function downloadStandings() {
  isGeneratingDownload.value = true
  
  try {
    const html2canvas = (await import('html2canvas')).default
    
    // Preload team images
    const imageMap = new Map<string, string>()
    await Promise.all(sortedTeams.value.map(async (team) => {
      if (team.logo_url) {
        try {
          const response = await fetch(team.logo_url)
          const blob = await response.blob()
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.readAsDataURL(blob)
          })
          imageMap.set(team.team_key, base64)
        } catch {
          imageMap.set(team.team_key, defaultAvatar)
        }
      }
    }))
    
    // Load logo
    let logoBase64 = ''
    try {
      const logoResponse = await fetch('/img/logo.png')
      const logoBlob = await logoResponse.blob()
      logoBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(logoBlob)
      })
    } catch (e) {
      console.log('Could not load logo')
    }
    
    // Create container
    const container = document.createElement('div')
    container.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 700px; font-family: system-ui, -apple-system, sans-serif;'
    
    // Generate table rows
    const generateStandingsRow = (team: any, rank: number) => {
      const recordText = `${team.wins}-${team.losses}${team.ties > 0 ? `-${team.ties}` : ''}`
      const winPct = ((team.wins || 0) / Math.max(1, (team.wins || 0) + (team.losses || 0) + (team.ties || 0)) * 100).toFixed(0)
      
      // Rank badge color
      let rankBg = 'rgba(58, 61, 82, 0.6)'
      let rankColor = '#9ca3af'
      if (rank === 1) { rankBg = 'rgba(234, 179, 8, 0.3)'; rankColor = '#fbbf24' }
      else if (rank === 2) { rankBg = 'rgba(156, 163, 175, 0.3)'; rankColor = '#d1d5db' }
      else if (rank === 3) { rankBg = 'rgba(249, 115, 22, 0.3)'; rankColor = '#fb923c' }
      
      return `
      <div style="display: flex; height: 56px; padding: 0 12px; background: rgba(38, 42, 58, 0.4); border-radius: 8px; margin-bottom: 4px; border: 1px solid rgba(58, 61, 82, 0.4);">
        <!-- Rank -->
        <div style="width: 36px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <span style="width: 28px; height: 28px; border-radius: 50%; background: ${rankBg}; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: ${rankColor};">${rank}</span>
        </div>
        <!-- Team Logo -->
        <div style="width: 48px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <img src="${imageMap.get(team.team_key) || defaultAvatar}" style="width: 36px; height: 36px; border-radius: 50%; border: 2px solid #3a3d52; object-fit: cover;" />
        </div>
        <!-- Team Name -->
        <div style="flex: 1; min-width: 0; display: flex; align-items: center; padding-left: 8px;">
          <span style="font-size: 14px; font-weight: 600; color: #f7f7ff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${team.name}</span>
        </div>
        <!-- Record -->
        <div style="width: 70px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <span style="font-size: 14px; font-weight: 700; color: ${rank <= 3 ? '#10b981' : '#f7f7ff'};">${recordText}</span>
        </div>
        <!-- Win % -->
        <div style="width: 50px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <span style="font-size: 13px; color: #9ca3af;">${winPct}%</span>
        </div>
      </div>
    `}
    
    // Split teams into two columns
    const teams = sortedTeams.value
    const midpoint = Math.ceil(teams.length / 2)
    const firstHalf = teams.slice(0, midpoint)
    const secondHalf = teams.slice(midpoint)
    
    container.innerHTML = `
      <div style="background: linear-gradient(160deg, #0f1219 0%, #0a0c14 50%, #0d1117 100%); border-radius: 16px; padding: 8px 24px 12px 24px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); position: relative; overflow: hidden;">
        <!-- Decorative blue glow at top -->
        <div style="position: absolute; top: -100px; left: 50%; transform: translateX(-50%); width: 400px; height: 200px; background: radial-gradient(ellipse, rgba(59, 159, 232, 0.3) 0%, transparent 70%); pointer-events: none;"></div>
        
        <!-- Ghosted baseball diamond field SVG background - bottom right -->
        <div style="position: absolute; bottom: -100px; right: -100px; width: 500px; height: 500px; opacity: 0.07; pointer-events: none;">
          <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M100 20 Q20 20 20 100 Q20 140 60 170 L100 130 L140 170 Q180 140 180 100 Q180 20 100 20" stroke="#3B9FE8" stroke-width="1.5" fill="none"/>
            <path d="M100 50 Q55 50 55 100 Q55 120 75 140 L100 115 L125 140 Q145 120 145 100 Q145 50 100 50" stroke="#3B9FE8" stroke-width="1.5" fill="none"/>
            <path d="M100 70 L130 100 L100 130 L70 100 Z" stroke="#3B9FE8" stroke-width="1.5" fill="none"/>
            <circle cx="100" cy="100" r="8" stroke="#3B9FE8" stroke-width="1.5" fill="none"/>
            <path d="M95 130 L100 140 L105 130 L105 125 L95 125 Z" stroke="#3B9FE8" stroke-width="1.5" fill="none"/>
            <line x1="100" y1="130" x2="40" y2="190" stroke="#3B9FE8" stroke-width="1.5"/>
            <line x1="100" y1="130" x2="160" y2="190" stroke="#3B9FE8" stroke-width="1.5"/>
          </svg>
        </div>
        
        <!-- Smaller ghosted diamond - top left -->
        <div style="position: absolute; top: -60px; left: -60px; width: 250px; height: 250px; opacity: 0.04; pointer-events: none; transform: rotate(15deg);">
          <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M100 20 Q20 20 20 100 Q20 140 60 170 L100 130 L140 170 Q180 140 180 100 Q180 20 100 20" stroke="#3B9FE8" stroke-width="2" fill="none"/>
            <path d="M100 70 L130 100 L100 130 L70 100 Z" stroke="#3B9FE8" stroke-width="2" fill="none"/>
            <circle cx="100" cy="100" r="8" stroke="#3B9FE8" stroke-width="2" fill="none"/>
          </svg>
        </div>
        
        <!-- Blue diagonal lines pattern overlay -->
        <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; opacity: 0.03; pointer-events: none; background: repeating-linear-gradient(45deg, transparent, transparent 20px, #3B9FE8 20px, #3B9FE8 21px);"></div>
        
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 12px; position: relative; z-index: 1;">
          <div style="font-size: 44px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 3px; text-shadow: 0 0 30px rgba(59, 159, 232, 0.5); line-height: 1;">LEAGUE STANDINGS</div>
          <div style="font-size: 18px; margin-top: 4px; font-weight: 600;"><span style="color: #9ca3af;">${leagueName.value}</span> <span style="color: #9ca3af;">•</span> <span style="color: #3B9FE8; font-weight: 700;">Week ${displayWeek.value}</span></div>
        </div>
        
        <!-- Table Header -->
        <div style="display: flex; padding: 0 12px 8px 12px; position: relative; z-index: 1;">
          <div style="width: 36px; flex-shrink: 0;"></div>
          <div style="width: 48px; flex-shrink: 0;"></div>
          <div style="flex: 1; padding-left: 8px; font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Team</div>
          <div style="width: 70px; text-align: center; font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; flex-shrink: 0;">Record</div>
          <div style="width: 50px; text-align: center; font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; flex-shrink: 0;">Win%</div>
        </div>
        
        <!-- Standings (Two Columns) -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; position: relative; z-index: 1;">
          <div>${firstHalf.map((team, idx) => generateStandingsRow(team, idx + 1)).join('')}</div>
          <div>${secondHalf.map((team, idx) => generateStandingsRow(team, idx + midpoint + 1)).join('')}</div>
        </div>
        
        <!-- Trend Chart -->
        <div style="background: rgba(38, 42, 58, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 12px; border: 1px solid rgba(59, 159, 232, 0.2); position: relative; z-index: 1;">
          <h3 style="color: #3B9FE8; font-size: 14px; margin: 0 0 12px 0; text-align: center; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">📈 Standings Trend</h3>
          <div id="standings-trend-chart" style="height: 220px; position: relative;"></div>
        </div>
        
        <!-- Footer -->
        <div style="border-top: 1px solid rgba(59, 159, 232, 0.2); padding-top: 8px; padding-bottom: 2px; position: relative; z-index: 1;">
          <div style="display: flex; align-items: center; justify-content: center; gap: 16px;">
            ${logoBase64 ? `<img src="${logoBase64}" style="width: 100px; height: 100px; object-fit: contain; flex-shrink: 0;" />` : ''}
            <div style="text-align: left; padding-bottom: 8px;">
              <div style="font-size: 12px; color: #9ca3af; margin-bottom: 4px;">Shareable Dashboards, Smart Projections, League History, & So Much More</div>
              <div style="font-size: 24px; font-weight: bold; color: #3B9FE8; letter-spacing: -0.5px;">ultimatefantasydashboard.com</div>
            </div>
          </div>
        </div>
      </div>
    `
    
    document.body.appendChild(container)
    
    // Create trend chart
    const trendChartContainer = container.querySelector('#standings-trend-chart')
    if (trendChartContainer && chartSeries.value.length > 0) {
      const ApexCharts = (await import('apexcharts')).default
      
      const weeks = Array.from(weeklyStandings.value.keys()).sort((a, b) => a - b)
      const maxWeeksToShow = 7
      const startIdx = Math.max(0, weeks.length - maxWeeksToShow)
      const weeksToShow = weeks.slice(startIdx)
      
      const trendSeries = sortedTeams.value.map((team, idx) => {
        const data = weeksToShow.map(week => {
          const weekData = weeklyStandings.value.get(week) || []
          const teamStanding = weekData.find((t: any) => t.team_key === team.team_key)
          return teamStanding?.rank || sortedTeams.value.length
        })
        return { name: team.name, data }
      })
      
      const teamColors = ['#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#84CC16', '#6366F1', '#14B8A6', '#F43F5E']
      
      const trendChart = new ApexCharts(trendChartContainer, {
        chart: { type: 'line', height: 220, background: 'transparent', toolbar: { show: false }, animations: { enabled: false } },
        colors: teamColors.slice(0, sortedTeams.value.length),
        stroke: { width: 2, curve: 'smooth' },
        markers: { size: 0 },
        xaxis: {
          categories: weeksToShow.map(w => `Wk ${w}`),
          labels: { style: { colors: '#9ca3af', fontSize: '10px' } },
          axisBorder: { show: false },
          axisTicks: { show: false }
        },
        yaxis: {
          reversed: true,
          min: 1,
          max: sortedTeams.value.length,
          labels: { style: { colors: '#9ca3af', fontSize: '10px' }, formatter: (val: number) => `#${Math.round(val)}` }
        },
        legend: { show: false },
        tooltip: { enabled: false },
        grid: { borderColor: '#374151', strokeDashArray: 3, padding: { right: 10 } }
      })
      
      await trendChart.render()
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    // Generate image
    const canvas = await html2canvas(container, {
      backgroundColor: '#0a0c14',
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false
    })
    
    document.body.removeChild(container)
    
    // Download
    const link = document.createElement('a')
    link.download = `standings-week-${displayWeek.value}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    
  } catch (error) {
    console.error('Error generating standings image:', error)
    alert('Failed to generate image. Please try again.')
  } finally {
    isGeneratingDownload.value = false
  }
}

// Load league settings
// Load league settings from store data (platform-agnostic)
function loadLeagueSettings() {
  const leagueKey = effectiveLeagueKey.value || leagueStore.activeLeagueId
  if (!leagueKey) return
  
  console.log('[loadLeagueSettings] Loading from store for:', leagueKey)
  
  // Get scoring type from store data (populated by league store for both Yahoo and ESPN)
  let detectedScoringType = 'head' // Default
  
  // Try yahooLeague first (works for both Yahoo and ESPN since we map ESPN to this format)
  const yahooLeagueData = Array.isArray(leagueStore.yahooLeague) ? leagueStore.yahooLeague[0] : leagueStore.yahooLeague
  if (yahooLeagueData?.scoring_type) {
    detectedScoringType = yahooLeagueData.scoring_type
    console.log('[loadLeagueSettings] Got scoring_type from yahooLeague:', detectedScoringType)
  }
  // Try currentLeague
  else if (leagueStore.currentLeague?.scoring_type) {
    detectedScoringType = leagueStore.currentLeague.scoring_type
    console.log('[loadLeagueSettings] Got scoring_type from currentLeague:', detectedScoringType)
  }
  // Try savedLeagues
  else {
    const savedLeague = leagueStore.savedLeagues?.find((l: any) => l.league_id === leagueKey)
    if (savedLeague?.scoring_type) {
      detectedScoringType = savedLeague.scoring_type
      console.log('[loadLeagueSettings] Got scoring_type from savedLeagues:', detectedScoringType)
    }
  }
  
  scoringType.value = detectedScoringType
  
  console.log('[loadLeagueSettings] Final scoring type:', scoringType.value)
  console.log('[loadLeagueSettings] isPointsLeague:', scoringType.value.toLowerCase().includes('point'))
  
  // For now, clear stat categories (category tracking is complex and platform-specific)
  // TODO: Add category support when needed
  statCategories.value = []
}

// Load matchup data for display and chart (platform-agnostic)
function loadAllMatchups() {
  const leagueKey = effectiveLeagueKey.value || leagueStore.activeLeagueId
  if (!leagueKey) {
    console.log('No league key, skipping matchup load')
    return
  }
  
  console.log('[loadAllMatchups] Loading from store for:', leagueKey)
  isLoadingChart.value = true
  
  try {
    // Use matchups from store (populated by league store for both Yahoo and ESPN)
    displayMatchups.value = leagueStore.yahooMatchups || []
    console.log('[loadAllMatchups] Matchups from store:', displayMatchups.value.length)
    
    // Generate standings progression for chart
    const yahooLeagueData = Array.isArray(leagueStore.yahooLeague) ? leagueStore.yahooLeague[0] : leagueStore.yahooLeague
    const endWeek = yahooLeagueData?.end_week || leagueStore.currentLeague?.settings?.end_week || 25
    const startWeek = yahooLeagueData?.start_week || 1
    
    console.log('[loadAllMatchups] Generating standings progression for weeks', startWeek, '-', endWeek)
    generateStandingsProgression(startWeek, endWeek)
    
    buildChart()
    console.log('[loadAllMatchups] Chart built with', weeklyStandings.value.size, 'weeks of data')
    
  } catch (e) {
    console.error('Error loading matchups:', e)
  } finally {
    isLoadingChart.value = false
    chartLoadProgress.value = ''
  }
}

// Generate standings progression for category leagues
// Since we can't get weekly W-L from Yahoo for category leagues,
// we simulate the progression based on final standings
function generateStandingsProgression(startWeek: number, endWeek: number) {
  const standings = new Map<number, any[]>()
  const numWeeks = endWeek - startWeek + 1
  
  // Get final standings from yahooTeams
  const finalStandings = [...leagueStore.yahooTeams].sort((a, b) => (a.rank || 999) - (b.rank || 999))
  
  for (let week = startWeek; week <= endWeek; week++) {
    const weekProgress = (week - startWeek + 1) / numWeeks
    
    // Calculate intermediate standings
    // Earlier weeks have more variance, later weeks converge to final standings
    const weekStandings = finalStandings.map(team => {
      const finalWins = team.wins || 0
      const finalLosses = team.losses || 0
      
      // Proportional wins/losses up to this week
      const winsToDate = Math.round(finalWins * weekProgress)
      const lossesToDate = Math.round(finalLosses * weekProgress)
      
      return {
        team_key: team.team_key,
        name: team.name,
        wins: winsToDate,
        losses: lossesToDate
      }
    }).sort((a, b) => {
      const aWinPct = a.wins / Math.max(1, a.wins + a.losses)
      const bWinPct = b.wins / Math.max(1, b.wins + b.losses)
      if (Math.abs(aWinPct - bWinPct) < 0.001) return b.wins - a.wins
      return bWinPct - aWinPct
    })
    
    // Add some variance in early weeks
    if (weekProgress < 0.3) {
      // Shuffle a bit in early weeks
      for (let i = 0; i < weekStandings.length - 1; i++) {
        if (Math.random() < 0.3) {
          const temp = weekStandings[i]
          weekStandings[i] = weekStandings[i + 1]
          weekStandings[i + 1] = temp
        }
      }
    }
    
    weekStandings.forEach((t, idx) => (t as any).rank = idx + 1)
    standings.set(week, weekStandings)
  }
  
  weeklyStandings.value = standings
  console.log(`Generated standings for ${standings.size} weeks`)
}

// Load all data
// Clear cache and force refresh data
async function refreshData() {
  const leagueKey = effectiveLeagueKey.value
  if (!leagueKey) return
  
  isRefreshing.value = true
  
  try {
    // Reload league data through the store (handles both Yahoo and ESPN)
    if (leagueStore.activePlatform === 'espn') {
      await leagueStore.loadEspnLeagueData(leagueKey)
    } else if (leagueStore.activePlatform === 'yahoo') {
      await leagueStore.loadYahooLeague(leagueKey)
    }
    
    // Reload our local view data
    loadAllData()
    
    console.log('Data refreshed successfully')
  } catch (e) {
    console.error('Error refreshing data:', e)
  } finally {
    isRefreshing.value = false
  }
}

// Load all data from store (platform-agnostic)
function loadAllData() {
  const leagueKey = effectiveLeagueKey.value
  const isYahooOrEspn = leagueStore.activePlatform === 'yahoo' || leagueStore.activePlatform === 'espn'
  if (!leagueKey || !isYahooOrEspn) return
  
  isLoading.value = true
  
  try {
    // Load settings from store data
    loadLeagueSettings()
    
    // Debug: Log what teams we have
    console.log('=== DEBUG: loadAllData ===')
    console.log('Platform:', leagueStore.activePlatform)
    console.log('League Key:', leagueKey)
    console.log('Teams count:', leagueStore.yahooTeams.length)
    if (leagueStore.yahooTeams.length > 0) {
      const sampleTeam = leagueStore.yahooTeams[0]
      console.log('Sample team data:', {
        name: sampleTeam.name,
        wins: sampleTeam.wins,
        losses: sampleTeam.losses,
        points_for: sampleTeam.points_for,
        points_against: sampleTeam.points_against,
        rank: sampleTeam.rank
      })
    }
    console.log('Is Points League:', isPointsLeague.value)
    console.log('Scoring Type:', scoringType.value)
    console.log('Current Season:', currentSeason.value)
    console.log('=== END DEBUG ===')
    
    // Distribute category wins proportionally (for category leagues)
    if (!isPointsLeague.value && displayCategories.value.length > 0) {
      distributeCategoryWins()
    }
    
    isLoading.value = false
    
    // Load matchups for chart
    loadAllMatchups()
    
  } catch (e) {
    console.error('Error loading baseball data:', e)
    isLoading.value = false
  }
}

// Trigger load on league change (for both Yahoo and ESPN)
watch(() => leagueStore.activeLeagueId, () => {
  const isYahooOrEspn = leagueStore.activePlatform === 'yahoo' || leagueStore.activePlatform === 'espn'
  if (isYahooOrEspn) loadAllData()
})

watch(() => leagueStore.yahooTeams, () => {
  const isYahooOrEspn = leagueStore.activePlatform === 'yahoo' || leagueStore.activePlatform === 'espn'
  if (leagueStore.yahooTeams.length > 0 && isYahooOrEspn) loadAllData()
}, { immediate: true })

// Also watch for matchups changes (they might load after teams)
watch(() => leagueStore.yahooMatchups, () => {
  const isYahooOrEspn = leagueStore.activePlatform === 'yahoo' || leagueStore.activePlatform === 'espn'
  if (leagueStore.yahooMatchups?.length > 0 && isYahooOrEspn) {
    console.log('[Watch yahooMatchups] Matchups changed, updating displayMatchups:', leagueStore.yahooMatchups.length)
    displayMatchups.value = leagueStore.yahooMatchups
  }
}, { immediate: true })

onMounted(() => {
  if (leagueStore.yahooTeams.length > 0) loadAllData()
})
</script>
