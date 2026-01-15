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

    <!-- Settings Gear at Top -->
    <div class="flex justify-end">
      <router-link to="/settings" class="p-2 rounded-lg bg-dark-card border border-dark-border hover:border-yellow-400 transition-colors">
        <svg class="w-6 h-6 text-dark-textMuted hover:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </router-link>
    </div>

    <!-- Hero Section - Current Week Matchups -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-600/10 via-dark-card to-dark-bg border border-dark-border">
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-red-600/5 via-transparent to-transparent"></div>
      
      <div class="relative p-6 md:p-8">
        <div class="flex items-center gap-3 mb-6">
          <div class="w-1.5 h-10 bg-red-600 rounded-full"></div>
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
            <div class="animate-spin rounded-full h-12 w-12 border-b-4 border-red-600 mx-auto mb-3"></div>
            <p class="text-dark-textMuted text-sm">Loading matchups...</p>
          </div>
        </div>

        <!-- Matchups Grid -->
        <div v-else-if="formattedMatchups.length > 0" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div 
            v-for="matchup in formattedMatchups" 
            :key="matchup.matchup_id" 
            class="bg-dark-bg/60 backdrop-blur rounded-xl p-4 border border-dark-border/50 hover:border-red-600/50 hover:bg-dark-bg/80 transition-all cursor-pointer group"
          >
            <!-- Team 1 -->
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-3 flex-1 min-w-0">
                <div class="relative">
                  <img 
                    :src="matchup.team1?.logo_url || defaultAvatar" 
                    :alt="matchup.team1?.name || 'Team 1'" 
                    :class="['w-10 h-10 rounded-full border-2 transition-colors object-cover', matchup.team1?.is_my_team ? 'border-yellow-500 ring-2 ring-yellow-500/30' : 'border-dark-border group-hover:border-red-600/50']"
                    @error="handleImageError" 
                  />
                  <div v-if="matchup.team1?.is_my_team" class="absolute -top-0.5 -left-0.5 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center shadow">
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
                    :class="['w-10 h-10 rounded-full border-2 transition-colors object-cover', matchup.team2?.is_my_team ? 'border-yellow-500 ring-2 ring-yellow-500/30' : 'border-dark-border group-hover:border-red-600/50']"
                    @error="handleImageError" 
                  />
                  <div v-if="matchup.team2?.is_my_team" class="absolute -top-0.5 -left-0.5 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center shadow">
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
      
      <!-- Mobile scroll hint for category leagues - only when content overflows -->
      <div 
        v-if="!isPointsLeague && showScrollHint" 
        class="px-4 py-2 bg-dark-border/30 border-b border-dark-border flex items-center justify-center gap-2 text-xs text-dark-textMuted"
      >
        <svg class="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        <span>Swipe to see all categories</span>
      </div>
      
      <div class="card-body overflow-x-auto scrollbar-thin" ref="standingsTableRef" @scroll="checkScrollHint">
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
              @click="openTeamDetailModal(team)"
              class="border-b border-dark-border/50 hover:bg-dark-border/20 transition-colors cursor-pointer"
              :class="{ 'bg-yellow-500/10 ring-2 ring-yellow-500/50 ring-inset': team.is_my_team }"
            >
              <td class="py-3 px-3">
                <div class="flex items-center justify-center">
                  <span 
                    class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-dark-border text-dark-textMuted"
                  >
                    {{ team.regularSeasonRank }}
                  </span>
                </div>
              </td>
              <td class="py-3 px-3">
                <div class="flex items-center gap-2">
                  <div class="relative flex-shrink-0">
                    <img 
                      :src="team.logo_url || defaultAvatar" 
                      :alt="team.name"
                      class="w-8 h-8 rounded-full object-cover ring-2"
                      :class="team.is_my_team ? 'ring-yellow-500' : 'ring-dark-border'"
                      @error="handleImageError"
                    />
                    <div v-if="team.is_my_team" class="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                      <span class="text-[8px] text-gray-900 font-bold">★</span>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="font-semibold text-dark-text truncate">{{ team.name }}</span>
                    <!-- Playoff finish trophy icons next to team name -->
                    <span v-if="team.playoffFinish === 1" class="text-yellow-400 text-base flex-shrink-0" title="League Champion">🏆</span>
                    <span v-else-if="team.playoffFinish === 2" class="text-gray-300 text-sm flex-shrink-0" title="Runner-up">🥈</span>
                    <span v-else-if="team.playoffFinish === 3" class="text-amber-600 text-sm flex-shrink-0" title="Third Place">🥉</span>
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
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-3"></div>
            <p class="text-dark-textMuted text-sm">Loading chart data ({{ chartLoadProgress }})...</p>
          </div>
        </div>
        <div v-else-if="chartSeries.length > 0" class="relative" ref="standingsChartRef">
          <apexchart 
            ref="apexChartRef"
            type="line" 
            height="400" 
            :options="chartOptions" 
            :series="chartSeries"
            @updated="onChartUpdated"
          />
          
          <!-- Team avatar overlays at end of lines - positioned after chart renders -->
          <div 
            v-for="(team, idx) in sortedTeams" 
            :key="'avatar-' + team.team_key"
            class="absolute pointer-events-none transition-all duration-300"
            :style="getChartAvatarStyle(team)"
          >
            <div class="relative">
              <img 
                :src="team.logo_url || defaultAvatar" 
                :alt="team.name"
                class="w-6 h-6 rounded-full ring-2 object-cover"
                :class="team.is_my_team ? 'ring-yellow-500' : 'ring-dark-border'"
                @error="handleImageError"
              />
              <div v-if="team.is_my_team" class="absolute -top-0.5 -right-0.5 w-3 h-3 bg-yellow-500 rounded-full flex items-center justify-center">
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
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
            <div class="text-dark-textMuted/50 group-hover:text-yellow-400 transition-colors">
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
        <img 
          :src="leagueStore.activePlatform === 'espn' ? '/espn-logo.svg' : '/yahoo-fantasy.svg'" 
          :alt="platformName"
          class="w-5 h-5"
        />
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
                :disabled="isDownloadingLeader"
                class="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-50"
                style="background: #dc2626; color: #ffffff;"
                @mouseover="$event.currentTarget.style.background = '#b91c1c'"
                @mouseout="$event.currentTarget.style.background = '#dc2626'"
              >
                <svg v-if="!isDownloadingLeader" class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <svg v-else class="w-4 h-4 animate-spin pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ isDownloadingLeader ? 'Generating...' : 'Share' }}
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
            <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-4">{{ leaderModalListTitle }}</h4>
            <div class="space-y-3">
              <div 
                v-for="(team, index) in leaderModalData.comparison.slice(0, leaderModalListLimit)" 
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

    <!-- Team Detail Modal -->
    <Teleport to="body">
      <div 
        v-if="showTeamDetailModal" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="showTeamDetailModal = false"
      >
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
        <div class="relative bg-dark-elevated rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-dark-border">
          <!-- Header -->
          <div class="sticky top-0 z-10 px-6 py-4 border-b border-dark-border bg-dark-elevated flex items-center justify-between">
            <div class="flex items-center gap-4">
              <img 
                :src="selectedTeamDetail?.logo_url || defaultAvatar" 
                :alt="selectedTeamDetail?.name"
                class="w-12 h-12 rounded-full ring-2 ring-red-600 object-cover"
                @error="handleImageError"
              />
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="text-xl font-bold text-dark-text">{{ selectedTeamDetail?.name }}</h3>
                  <span v-if="selectedTeamDetail?.playoffFinish === 1" class="text-yellow-400 text-xl" title="League Champion">🏆</span>
                  <span v-else-if="selectedTeamDetail?.playoffFinish === 2" class="text-gray-300 text-lg" title="Runner-up">🥈</span>
                  <span v-else-if="selectedTeamDetail?.playoffFinish === 3" class="text-amber-600 text-lg" title="Third Place">🥉</span>
                </div>
                <p class="text-sm text-dark-textMuted">Team Details - {{ currentSeason }} Season</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button 
                @click="downloadTeamDetailImage" 
                :disabled="isDownloadingTeamDetail"
                class="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-50"
                style="background: #dc2626; color: #ffffff;"
                @mouseover="$event.currentTarget.style.background = '#b91c1c'"
                @mouseout="$event.currentTarget.style.background = '#dc2626'"
              >
                <svg v-if="!isDownloadingTeamDetail" class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <svg v-else class="w-4 h-4 animate-spin pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ isDownloadingTeamDetail ? 'Generating...' : 'Share' }}
              </button>
              <button @click="showTeamDetailModal = false" class="p-2 rounded-lg hover:bg-dark-border/50 transition-colors">
                <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          <!-- Top Stats Cards -->
          <div class="p-6 border-b border-dark-border">
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div class="bg-dark-border/20 rounded-xl p-4 text-center">
                <div class="text-2xl font-black text-dark-text">{{ selectedTeamDetail?.wins }}-{{ selectedTeamDetail?.losses }}{{ selectedTeamDetail?.ties > 0 ? `-${selectedTeamDetail.ties}` : '' }}</div>
                <div class="text-xs text-dark-textMuted mt-1">Record</div>
              </div>
              <div class="bg-dark-border/20 rounded-xl p-4 text-center">
                <div class="flex items-center justify-center">
                  <span class="text-2xl font-black text-yellow-400">#{{ selectedTeamDetail?.regularSeasonRank }}</span>
                </div>
                <div class="text-xs text-dark-textMuted mt-1">Rank</div>
              </div>
              <div class="bg-dark-border/20 rounded-xl p-4 text-center">
                <div class="text-2xl font-black text-cyan-400">{{ selectedTeamDetail?.all_play_wins }}-{{ selectedTeamDetail?.all_play_losses }}</div>
                <div class="text-xs text-dark-textMuted mt-1">All-Play</div>
              </div>
              <div class="bg-dark-border/20 rounded-xl p-4 text-center">
                <div class="text-2xl font-black text-green-400">{{ isPointsLeague ? pointsLeagueTeamDetailStats.ppg : teamDetailAvgCatsPerWeek }}</div>
                <div class="text-xs text-dark-textMuted mt-1">{{ isPointsLeague ? 'PPG' : 'Cats/Week' }}</div>
              </div>
            </div>
          </div>
          
          <!-- Points League: Season Breakdown -->
          <template v-if="isPointsLeague">
            <div class="p-6 border-b border-dark-border">
              <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-4">Season Breakdown</h4>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div class="bg-dark-border/20 rounded-xl p-4">
                  <div class="text-lg font-bold text-green-400">{{ pointsLeagueTeamDetailStats.highScore }}</div>
                  <div class="text-xs text-dark-textMuted">High Score</div>
                </div>
                <div class="bg-dark-border/20 rounded-xl p-4">
                  <div class="text-lg font-bold text-red-400">{{ pointsLeagueTeamDetailStats.lowScore }}</div>
                  <div class="text-xs text-dark-textMuted">Low Score</div>
                </div>
                <div class="bg-dark-border/20 rounded-xl p-4">
                  <div class="text-lg font-bold text-dark-text">{{ pointsLeagueTeamDetailStats.totalPoints }}</div>
                  <div class="text-xs text-dark-textMuted">Total Points</div>
                </div>
                <div class="bg-dark-border/20 rounded-xl p-4">
                  <div class="text-lg font-bold text-dark-text">{{ pointsLeagueTeamDetailStats.pointsAgainst }}</div>
                  <div class="text-xs text-dark-textMuted">Points Against</div>
                </div>
                <div class="bg-dark-border/20 rounded-xl p-4">
                  <div class="text-lg font-bold" :class="parseFloat(pointsLeagueTeamDetailStats.pointDiff) >= 0 ? 'text-green-400' : 'text-red-400'">
                    {{ parseFloat(pointsLeagueTeamDetailStats.pointDiff) >= 0 ? '+' : '' }}{{ pointsLeagueTeamDetailStats.pointDiff }}
                  </div>
                  <div class="text-xs text-dark-textMuted">Point Differential</div>
                </div>
                <div class="bg-dark-border/20 rounded-xl p-4">
                  <div class="text-lg font-bold text-dark-text">{{ pointsLeagueTeamDetailStats.winStreak }}</div>
                  <div class="text-xs text-dark-textMuted">Current Streak</div>
                </div>
              </div>
            </div>
            
            <!-- Points League: Weekly Points Chart -->
            <div class="p-6 border-b border-dark-border">
              <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-4">Points Per Week</h4>
              <div class="h-48">
                <apexchart 
                  v-if="pointsLeagueTeamDetailChartOptions" 
                  type="line" 
                  height="100%" 
                  :options="pointsLeagueTeamDetailChartOptions" 
                  :series="pointsLeagueTeamDetailChartSeries" 
                />
              </div>
            </div>
            
            <!-- Points League: Week-by-Week Results -->
            <div class="p-6">
              <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-4">Week-by-Week Results</h4>
              <div class="flex flex-wrap gap-2">
                <div 
                  v-for="(result, idx) in pointsLeagueTeamDetailStats.weeklyResults" 
                  :key="idx"
                  class="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold"
                  :class="result.won ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'"
                  :title="`Week ${idx + 1}: ${result.points?.toFixed(1) || '0.0'} pts`"
                >
                  {{ result.won ? 'W' : 'L' }}
                </div>
              </div>
              <p class="text-xs text-dark-textMuted mt-3">Hover over a week to see points scored</p>
            </div>
          </template>
          
          <!-- Category League: Category Performance Chart -->
          <template v-else>
            <div class="p-6 border-b border-dark-border">
              <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-4">Weekly Category Wins vs League Average</h4>
              <div class="h-48">
                <apexchart 
                  v-if="teamDetailChartOptions" 
                  type="line" 
                  height="100%" 
                  :options="teamDetailChartOptions" 
                  :series="teamDetailChartSeries" 
                />
              </div>
            </div>
            
            <!-- Category Breakdown -->
            <div class="p-6 border-b border-dark-border">
              <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-4">Category Breakdown</h4>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div 
                  v-for="cat in teamDetailCategories" 
                  :key="cat.stat_id"
                  class="bg-dark-border/20 rounded-xl p-3"
                >
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-xs text-dark-textMuted font-medium">{{ cat.display_name }}</span>
                    <span 
                      class="text-xs px-1.5 py-0.5 rounded font-bold"
                      :class="cat.rankClass"
                    >
                      #{{ cat.rank }}
                    </span>
                  </div>
                  <div class="text-lg font-bold" :class="cat.valueClass">{{ cat.wins }}</div>
                  <div class="h-1.5 bg-dark-border rounded-full overflow-hidden mt-2">
                    <div 
                      class="h-full rounded-full transition-all"
                      :class="cat.barClass"
                      :style="{ width: `${cat.pct}%` }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Week-by-Week Results -->
            <div class="p-6">
              <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-4">Week-by-Week Results</h4>
              <div class="flex flex-wrap gap-2">
                <div 
                  v-for="(result, idx) in teamDetailWeeklyResults" 
                  :key="idx"
                  class="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold"
                  :class="result.won ? 'bg-green-500/20 text-green-400' : (result.tied ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400')"
                  :title="`Week ${idx + 1}: ${result.catWins}-${result.catLosses} vs ${result.opponent}`"
                >
                  {{ result.won ? 'W' : (result.tied ? 'T' : 'L') }}
                </div>
              </div>
              <p class="text-xs text-dark-textMuted mt-3">Hover over a week to see category score and opponent</p>
            </div>
          </template>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, Teleport } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useAuthStore } from '@/stores/auth'
import { yahooService } from '@/services/yahoo'

const leagueStore = useLeagueStore()
const authStore = useAuthStore()

const isLoading = ref(false)
const isLoadingChart = ref(false)
const isGeneratingDownload = ref(false)
const isDownloadingLeader = ref(false)
const isDownloadingTeamDetail = ref(false)
const chartLoadProgress = ref('')
const defaultAvatar = computed(() => {
  if (leagueStore.activePlatform === 'espn') return 'https://g.espncdn.com/lm-static/ffl/images/default_logos/team_0.svg'
  return 'https://s.yimg.com/cv/apiv2/default/mlb/mlb_2_g.png'
})

// Platform styling
const platformName = computed(() => leagueStore.activePlatform === 'espn' ? 'ESPN' : 'Yahoo')
const platformBadgeClass = computed(() => leagueStore.activePlatform === 'espn' ? 'bg-[#0719b2]/10 border-[#0719b2]/30' : 'bg-purple-600/10 border-purple-600/30')
const platformTextClass = computed(() => leagueStore.activePlatform === 'espn' ? 'text-[#0719b2]' : 'text-purple-400')
const platformSubTextClass = computed(() => leagueStore.activePlatform === 'espn' ? 'text-[#3d5fc4]' : 'text-purple-300')

// Scoring type - read from store for both Yahoo and ESPN
const scoringType = computed(() => {
  // Try yahooLeague first (array format for Yahoo, mapped from ESPN)
  const yahooLeagueData = Array.isArray(leagueStore.yahooLeague) ? leagueStore.yahooLeague[0] : leagueStore.yahooLeague
  if (yahooLeagueData?.scoring_type) {
    console.log('[scoringType] from yahooLeague:', yahooLeagueData.scoring_type)
    return yahooLeagueData.scoring_type
  }
  // Try currentLeague
  if (leagueStore.currentLeague?.scoring_type) {
    console.log('[scoringType] from currentLeague:', leagueStore.currentLeague.scoring_type)
    return leagueStore.currentLeague.scoring_type
  }
  // Try savedLeagues using activeLeagueId
  const savedLeague = leagueStore.savedLeagues?.find((l: any) => l.league_id === leagueStore.activeLeagueId)
  if (savedLeague?.scoring_type) {
    console.log('[scoringType] from savedLeagues:', savedLeague.scoring_type)
    return savedLeague.scoring_type
  }
  console.log('[scoringType] defaulting to head')
  return 'head'
})

// League settings (for category stat details - Yahoo only)
const statCategories = ref<any[]>([])
const loadedSeason = ref<string>('')

// Sorting
const sortColumn = ref('rank')
const sortDirection = ref<'asc' | 'desc'>('asc')

// Modal
const showLeaderModal = ref(false)
const leaderModalType = ref('')

// Team Detail Modal
const showTeamDetailModal = ref(false)
const selectedTeamDetail = ref<any>(null)
const teamDetailChartSeries = ref<any[]>([])
const teamDetailChartOptions = ref<any>(null)
const teamDetailWeeklyResults = ref<any[]>([])

// Scroll hint - show only when table overflows
const showScrollHint = ref(false)
const standingsTableRef = ref<HTMLElement | null>(null)

// Chart refs for avatar positioning
const standingsChartRef = ref<HTMLElement | null>(null)
const apexChartRef = ref<any>(null)
const avatarPositions = ref<Map<string, { top: number, right: number }>>(new Map())

// Chart
const chartSeries = ref<any[]>([])
const chartOptions = ref<any>(null)

// Data
const transactionCounts = ref<Map<string, number>>(new Map())
const teamCategoryWins = ref<Map<string, Record<string, number>>>(new Map())
const weeklyStandings = ref<Map<number, any[]>>(new Map())
const displayMatchups = ref<any[]>([])

// Computed: Get regular season ranks based on category win percentage
// This ensures teams are ranked by regular season performance, not playoff results
const regularSeasonRanks = computed(() => {
  const ranks = new Map<string, number>()
  
  // Sort teams by category win percentage (this is how H2H Categories leagues rank)
  const sortedTeams = [...leagueStore.yahooTeams].sort((a, b) => {
    const aTotal = (a.wins || 0) + (a.losses || 0)
    const bTotal = (b.wins || 0) + (b.losses || 0)
    const aWinPct = aTotal > 0 ? (a.wins || 0) / aTotal : 0
    const bWinPct = bTotal > 0 ? (b.wins || 0) / bTotal : 0
    
    // Sort by win percentage descending
    if (bWinPct !== aWinPct) return bWinPct - aWinPct
    
    // Tiebreaker: more total games played
    return bTotal - aTotal
  })
  
  // Assign ranks
  sortedTeams.forEach((team, idx) => {
    ranks.set(team.team_key, idx + 1)
  })
  
  return ranks
})

// Store weekly matchup results per team: team_key -> week -> { catWins, catLosses, opponent, won, tied }
const weeklyMatchupResults = ref<Map<string, Map<number, any>>>(new Map())
const espnWeeklyScores = ref<Map<string, Map<number, number>>>(new Map())

// Computed
const leagueName = computed(() => {
  const league = leagueStore.yahooLeague
  // yahooLeague could be an array where index 0 has league info
  if (Array.isArray(league)) {
    return league[0]?.name || 'League'
  }
  return league?.name || 'League'
})

// Effective league key - use the actually loaded league (might be previous season)
const effectiveLeagueKey = computed(() => {
  // If currentLeague has a league_id set (might be previous season), use that
  if (leagueStore.currentLeague?.league_id) return leagueStore.currentLeague.league_id
  // Fall back to active league
  return leagueStore.activeLeagueId
})

const currentSeason = computed(() => {
  // First check season loaded directly from Yahoo API
  if (loadedSeason.value) return loadedSeason.value
  // Then check yahooLeague from API
  const league = leagueStore.yahooLeague
  if (Array.isArray(league) && league[0]?.season) {
    return league[0].season
  }
  if (league?.season) {
    return league.season
  }
  // Fall back to currentLeague
  return leagueStore.currentLeague?.season || new Date().getFullYear().toString()
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
  console.log('[isPointsLeague] scoringType:', scoringType.value, 'result:', result)
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
  return 'bg-red-500/20 text-red-400'
})

// Format matchups with category win data
const formattedMatchups = computed(() => {
  console.log('[formattedMatchups] displayMatchups count:', displayMatchups.value.length)
  return displayMatchups.value.map(m => {
    // Handle both formats: teams[] array (Yahoo) or team1/team2 directly (ESPN)
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
  return leagueStore.yahooTeams.map(team => {
    const transactions = transactionCounts.value.get(team.team_key) || 0
    const categoryWins = teamCategoryWins.value.get(team.team_key) || {}
    const numTeams = leagueStore.yahooTeams.length
    
    let all_play_wins = 0
    let all_play_losses = 0
    
    if (isPointsLeague.value) {
      // For points leagues, calculate all-play based on points comparison
      // Count how many teams this team would beat based on points_for
      const teamPoints = team.points_for || 0
      for (const opponent of leagueStore.yahooTeams) {
        if (opponent.team_key === team.team_key) continue
        const oppPoints = opponent.points_for || 0
        if (teamPoints > oppPoints) all_play_wins++
        else if (teamPoints < oppPoints) all_play_losses++
        // ties split evenly
      }
    } else {
      // For H2H Categories, wins/losses from Yahoo ARE cumulative category wins
      // Calculate all-play based on category win percentage
      const totalGames = (team.wins || 0) + (team.losses || 0) + (team.ties || 0)
      const weeksPlayed = Math.ceil(totalGames / numCategories.value) || 1
      
      const catWinPct = (team.wins || 0) / Math.max(1, totalGames)
      all_play_wins = Math.round(catWinPct * weeksPlayed * (numTeams - 1))
      all_play_losses = weeksPlayed * (numTeams - 1) - all_play_wins
    }
    
    // Calculate luck score based on all-play vs actual matchup wins
    const matchupWins = team.wins ?? 0
    const matchupLosses = team.losses ?? 0
    const totalMatchups = matchupWins + matchupLosses
    const expectedMatchupWinPct = totalMatchups > 0 ? all_play_wins / Math.max(1, all_play_wins + all_play_losses) : 0.5
    const expectedMatchupWins = expectedMatchupWinPct * totalMatchups
    const luckScore = matchupWins - expectedMatchupWins
    
    // Use regular season rank from computed weeklyStandings (matches chart)
    // Falls back to Yahoo's rank if weeklyStandings hasn't loaded yet
    const regularSeasonRank = regularSeasonRanks.value.get(team.team_key) || team.rank || 999
    
    // Playoff finish: Only set if season is complete, based on Yahoo's final rank
    // 1 = Champion (🏆), 2 = Runner-up (🥈), 3 = Third place (🥉)
    const playoffFinish = isSeasonComplete.value && team.rank && team.rank <= 3 ? team.rank : null
    
    return {
      ...team,
      all_play_wins,
      all_play_losses,
      transactions,
      categoryWins,
      luckScore,
      regularSeasonRank,
      playoffFinish
    }
  })
})

const sortedTeams = computed(() => {
  const teams = [...teamsWithStats.value]
  
  teams.sort((a, b) => {
    let aVal: number, bVal: number
    
    if (sortColumn.value === 'rank') {
      // Use regular season rank (matches chart) instead of Yahoo's final rank
      aVal = a.regularSeasonRank || 999
      bVal = b.regularSeasonRank || 999
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
      // Default fallback uses regular season rank
      aVal = a.regularSeasonRank || 999
      bVal = b.regularSeasonRank || 999
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

// Leader Modal Data - Top 5 only
const leaderModalData = computed(() => {
  const teams = teamsWithStats.value
  let comparison: any[] = []
  let maxValue = 1
  
  if (leaderModalType.value === 'bestRecord') {
    // Best to worst (highest win % first)
    comparison = [...teams].sort((a, b) => {
      const aWinPct = (a.wins || 0) / Math.max(1, (a.wins || 0) + (a.losses || 0))
      const bWinPct = (b.wins || 0) / Math.max(1, (b.wins || 0) + (b.losses || 0))
      return bWinPct - aWinPct
    }).map(t => ({ ...t, value: (t.wins || 0) / Math.max(1, (t.wins || 0) + (t.losses || 0)) * 100 }))
    maxValue = 100
  } else if (leaderModalType.value === 'hottest') {
    // Hottest based on last 3 weeks category wins (most wins first)
    comparison = [...teams].sort((a, b) => {
      const aLast3 = last3WeeksWins.value.get(a.team_key) || 0
      const bLast3 = last3WeeksWins.value.get(b.team_key) || 0
      return bLast3 - aLast3
    }).map(t => ({ ...t, value: last3WeeksWins.value.get(t.team_key) || 0 }))
    maxValue = Math.max(...teams.map(t => last3WeeksWins.value.get(t.team_key) || 0), 1)
  } else if (leaderModalType.value === 'coldest') {
    // Coldest based on last 3 weeks category wins (fewest wins first)
    comparison = [...teams].sort((a, b) => {
      const aLast3 = last3WeeksWins.value.get(a.team_key) || 0
      const bLast3 = last3WeeksWins.value.get(b.team_key) || 0
      return aLast3 - bLast3
    }).map(t => ({ ...t, value: last3WeeksWins.value.get(t.team_key) || 0 }))
    maxValue = Math.max(...teams.map(t => last3WeeksWins.value.get(t.team_key) || 0), 1)
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
  } else if (leaderModalType.value === 'mostMoves') {
    // Most to fewest
    comparison = [...teams].sort((a, b) => (b.transactions || 0) - (a.transactions || 0)).map(t => ({ ...t, value: t.transactions || 0 }))
    maxValue = Math.max(...teams.map(t => t.transactions || 0), 1)
  } else if (leaderModalType.value === 'fewestMoves') {
    // Fewest to most
    comparison = [...teams].sort((a, b) => (a.transactions || 0) - (b.transactions || 0)).map(t => ({ ...t, value: t.transactions || 0 }))
    maxValue = Math.max(...teams.map(t => t.transactions || 0), 1)
  }
  
  // Show all teams (no limit)
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
  if (leaderModalType.value === 'bestRecord') return getWinPercentage(leader)
  if (leaderModalType.value === 'hottest' || leaderModalType.value === 'coldest') return `${last3WeeksWins.value.get(leader.team_key) || 0}`
  if (leaderModalType.value === 'mostCatWins') return isPointsLeague.value ? (leader.points_for?.toFixed(1) || '0') : `${leader.wins || 0}`
  if (leaderModalType.value === 'bestAllPlay') return `${leader.all_play_wins || 0}-${leader.all_play_losses || 0}`
  if (leaderModalType.value === 'luckiest' || leaderModalType.value === 'unluckiest') return (leader.luckScore > 0 ? '+' : '') + (leader.luckScore || 0).toFixed(0)
  if (leaderModalType.value === 'mostMoves' || leaderModalType.value === 'fewestMoves') return leader.transactions?.toString() || '0'
  return `${leader.all_play_wins || 0}-${leader.all_play_losses || 0}`
})

const leaderModalUnit = computed(() => {
  if (leaderModalType.value === 'bestRecord') return 'Win %'
  if (leaderModalType.value === 'hottest' || leaderModalType.value === 'coldest') return isPointsLeague.value ? 'Wins (Last 3)' : 'Cats (Last 3)'
  if (leaderModalType.value === 'mostCatWins') return isPointsLeague.value ? 'Total Points' : 'Category Wins'
  if (leaderModalType.value === 'bestAllPlay') return 'All-Play Wins'
  if (leaderModalType.value === 'luckiest' || leaderModalType.value === 'unluckiest') return 'Luck Score'
  if (leaderModalType.value === 'mostMoves' || leaderModalType.value === 'fewestMoves') return 'Transactions'
  return 'All-Play Record'
})

// Quick stats show top 5, others show top 10
const leaderModalListLimit = computed(() => {
  const quickStatTypes = ['hottest', 'coldest', 'mostMoves', 'fewestMoves']
  return quickStatTypes.includes(leaderModalType.value) ? 5 : 10
})

const leaderModalListTitle = computed(() => {
  const quickStatTypes = ['hottest', 'coldest', 'mostMoves', 'fewestMoves']
  return quickStatTypes.includes(leaderModalType.value) ? 'Top 5' : 'Top Ten Comparison'
})

// Team Detail Modal Computed
const teamDetailAvgCatsPerWeek = computed(() => {
  if (!selectedTeamDetail.value) return '0.0'
  const totalCatWins = selectedTeamDetail.value.wins || 0
  const weeks = Array.from(weeklyStandings.value.keys()).length || 1
  return (totalCatWins / weeks).toFixed(1)
})

// Points League Team Detail Stats (for football-style view)
const pointsLeagueTeamDetailStats = computed(() => {
  if (!selectedTeamDetail.value) {
    return {
      ppg: '0.0',
      highScore: '0.0',
      lowScore: '0.0',
      totalPoints: '0.0',
      pointsAgainst: '0.0',
      pointDiff: '0.0',
      winStreak: 'N/A',
      weeklyResults: []
    }
  }
  
  const team = selectedTeamDetail.value
  const pointsFor = team.points_for || 0
  const pointsAgainst = team.points_against || 0
  const totalGames = (team.wins || 0) + (team.losses || 0)
  const ppg = totalGames > 0 ? (pointsFor / totalGames).toFixed(1) : '0.0'
  
  // Get weekly results from weeklyMatchupResults map
  const teamMatchups = weeklyMatchupResults.value.get(team.team_key)
  const weeklyResults: { won: boolean; points: number }[] = []
  let highScore = 0
  let lowScore = Infinity
  let totalPointsAgainst = 0
  
  if (teamMatchups && teamMatchups.size > 0) {
    // Sort weeks and build results array
    const sortedWeeks = Array.from(teamMatchups.keys()).sort((a, b) => a - b)
    
    sortedWeeks.forEach(week => {
      const result = teamMatchups.get(week)
      if (result) {
        const pts = result.points || 0
        weeklyResults.push({ won: result.won, points: pts })
        
        if (pts > highScore) highScore = pts
        if (pts > 0 && pts < lowScore) lowScore = pts
        // Handle both field names: oppPoints (Yahoo) and opponentPoints (ESPN)
        totalPointsAgainst += result.opponentPoints || result.oppPoints || 0
      }
    })
  }
  
  // Calculate streak from end (most recent first)
  let currentStreak = 0
  let streakType = ''
  for (let i = weeklyResults.length - 1; i >= 0; i--) {
    const result = weeklyResults[i]
    if (i === weeklyResults.length - 1) {
      streakType = result.won ? 'W' : 'L'
      currentStreak = 1
    } else if ((result.won && streakType === 'W') || (!result.won && streakType === 'L')) {
      currentStreak++
    } else {
      break
    }
  }
  
  // Fall back to generated data if no actual matchups found
  if (weeklyResults.length === 0 && totalGames > 0) {
    const avgPts = pointsFor / totalGames
    for (let i = 0; i < team.wins; i++) {
      weeklyResults.push({ won: true, points: avgPts * (0.9 + Math.random() * 0.2) })
    }
    for (let i = 0; i < team.losses; i++) {
      weeklyResults.push({ won: false, points: avgPts * (0.8 + Math.random() * 0.2) })
    }
    // Shuffle to make it look more natural
    weeklyResults.sort(() => Math.random() - 0.5)
    
    highScore = Math.max(...weeklyResults.map(r => r.points))
    lowScore = Math.min(...weeklyResults.map(r => r.points))
    
    // Recalculate streak for shuffled results
    currentStreak = 0
    streakType = ''
    for (let i = weeklyResults.length - 1; i >= 0; i--) {
      if (i === weeklyResults.length - 1) {
        streakType = weeklyResults[i].won ? 'W' : 'L'
        currentStreak = 1
      } else if ((weeklyResults[i].won && streakType === 'W') || (!weeklyResults[i].won && streakType === 'L')) {
        currentStreak++
      } else {
        break
      }
    }
  }
  
  if (lowScore === Infinity) lowScore = 0
  
  // Use actual points against if we calculated it, otherwise use team data
  const finalPointsAgainst = totalPointsAgainst > 0 ? totalPointsAgainst : pointsAgainst
  
  return {
    ppg,
    highScore: highScore.toFixed(1),
    lowScore: lowScore.toFixed(1),
    totalPoints: pointsFor.toFixed(1),
    pointsAgainst: finalPointsAgainst.toFixed(1),
    pointDiff: (pointsFor - finalPointsAgainst).toFixed(1),
    winStreak: currentStreak > 0 ? `${streakType}${currentStreak}` : '-',
    weeklyResults
  }
})

// Points League Team Detail Chart Options
const pointsLeagueTeamDetailChartOptions = computed(() => {
  const weeklyResults = pointsLeagueTeamDetailStats.value.weeklyResults
  if (weeklyResults.length === 0) return null
  
  return {
    chart: {
      type: 'line',
      toolbar: { show: false },
      background: 'transparent',
      animations: { enabled: true, easing: 'easeinout', speed: 500 }
    },
    stroke: {
      curve: 'smooth',
      width: [3, 2],
      dashArray: [0, 5]
    },
    colors: ['#22c55e', '#6b7280'],
    xaxis: {
      categories: weeklyResults.map((_, i) => `Wk ${i + 1}`),
      labels: { style: { colors: '#9ca3af', fontSize: '10px' } },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: { 
        style: { colors: '#9ca3af' },
        formatter: (val: number) => val.toFixed(0)
      }
    },
    grid: {
      borderColor: '#374151',
      strokeDashArray: 3
    },
    legend: {
      show: true,
      position: 'top',
      labels: { colors: '#9ca3af' }
    },
    tooltip: {
      theme: 'dark',
      y: { formatter: (val: number) => val.toFixed(1) + ' pts' }
    }
  }
})

// Points League Team Detail Chart Series
const pointsLeagueTeamDetailChartSeries = computed(() => {
  const weeklyResults = pointsLeagueTeamDetailStats.value.weeklyResults
  if (weeklyResults.length === 0) return []
  
  // Calculate weekly league averages from all teams' matchup results
  const weeklyLeagueAvgs: number[] = []
  
  for (let weekIdx = 0; weekIdx < weeklyResults.length; weekIdx++) {
    const weekNum = weekIdx + 1 // Weeks are 1-indexed
    let totalPoints = 0
    let teamCount = 0
    
    // Sum up all teams' points for this week
    leagueStore.yahooTeams.forEach(team => {
      const teamMatchups = weeklyMatchupResults.value.get(team.team_key)
      if (teamMatchups) {
        const weekResult = teamMatchups.get(weekNum)
        if (weekResult && weekResult.points > 0) {
          totalPoints += weekResult.points
          teamCount++
        }
      }
    })
    
    // Calculate average for this week
    const weekAvg = teamCount > 0 ? totalPoints / teamCount : 0
    weeklyLeagueAvgs.push(parseFloat(weekAvg.toFixed(1)))
  }
  
  return [
    {
      name: selectedTeamDetail.value?.name || 'Team',
      data: weeklyResults.map(r => parseFloat(r.points?.toFixed(1) || '0'))
    },
    {
      name: 'League Avg',
      data: weeklyLeagueAvgs
    }
  ]
})

const teamDetailCategories = computed(() => {
  if (!selectedTeamDetail.value || displayCategories.value.length === 0) return []
  
  const team = selectedTeamDetail.value
  const cats = displayCategories.value.map(cat => {
    const wins = team.categoryWins?.[cat.stat_id] || 0
    
    // Calculate rank for this category
    const allTeamWins = teamsWithStats.value.map(t => ({
      teamKey: t.team_key,
      wins: t.categoryWins?.[cat.stat_id] || 0
    })).sort((a, b) => b.wins - a.wins)
    
    const rank = allTeamWins.findIndex(t => t.teamKey === team.team_key) + 1
    const maxWins = Math.max(...allTeamWins.map(t => t.wins), 1)
    const pct = (wins / maxWins) * 100
    
    // Color classes based on rank
    let rankClass = 'bg-dark-border text-dark-textMuted'
    let valueClass = 'text-dark-text'
    let barClass = 'bg-dark-textMuted'
    
    const totalTeams = teamsWithStats.value.length
    if (rank <= Math.ceil(totalTeams * 0.25)) {
      rankClass = 'bg-green-500/20 text-green-400'
      valueClass = 'text-green-400'
      barClass = 'bg-green-500'
    } else if (rank <= Math.ceil(totalTeams * 0.5)) {
      rankClass = 'bg-cyan-500/20 text-cyan-400'
      valueClass = 'text-cyan-400'
      barClass = 'bg-cyan-500'
    } else if (rank > totalTeams - Math.ceil(totalTeams * 0.25)) {
      rankClass = 'bg-red-500/20 text-red-400'
      valueClass = 'text-red-400'
      barClass = 'bg-red-500'
    }
    
    return {
      ...cat,
      wins,
      rank,
      pct,
      rankClass,
      valueClass,
      barClass
    }
  })
  
  // Sort by wins descending (best categories first)
  return cats.sort((a, b) => b.wins - a.wins)
})

// Calculate last 3 weeks category wins for each team
const last3WeeksWins = computed(() => {
  const weeks = Array.from(weeklyStandings.value.keys()).sort((a, b) => a - b)
  const last3Weeks = weeks.slice(-3)
  
  const result = new Map<string, number>()
  
  leagueStore.yahooTeams.forEach(team => {
    const teamMatchups = weeklyMatchupResults.value.get(team.team_key)
    if (!teamMatchups) {
      result.set(team.team_key, 0)
      return
    }
    
    if (isPointsLeague.value) {
      // For points leagues, count wins in last 3 weeks
      let totalWins = 0
      last3Weeks.forEach(week => {
        const weekResult = teamMatchups.get(week)
        if (weekResult?.won) {
          totalWins++
        }
      })
      result.set(team.team_key, totalWins)
    } else {
      // For category leagues, sum category wins in last 3 weeks
      let totalWins = 0
      last3Weeks.forEach(week => {
        const weekResult = teamMatchups.get(week)
        if (weekResult) {
          totalWins += weekResult.catWins || 0
        }
      })
      result.set(team.team_key, totalWins)
    }
  })
  
  return result
})

// Quick Stats - without luckiest/unluckiest
const quickStats = computed(() => {
  const teams = teamsWithStats.value
  
  // Hottest/Coldest based on last 3 weeks performance
  const teamsWithLast3 = teams.map(t => ({
    ...t,
    last3Wins: last3WeeksWins.value.get(t.team_key) || 0
  }))
  const hottest = [...teamsWithLast3].sort((a, b) => b.last3Wins - a.last3Wins)[0]
  const coldest = [...teamsWithLast3].sort((a, b) => a.last3Wins - b.last3Wins)[0]
  
  // For points leagues, show "X wins" in last 3 weeks
  // For category leagues, show "X cat wins" in last 3 weeks
  const winsLabel = isPointsLeague.value ? 'wins' : 'cat wins'
  
  // Most/Fewest Moves - works for all platforms
  const mostActive = [...teams].sort((a, b) => (b.transactions || 0) - (a.transactions || 0))[0]
  const leastActive = [...teams].sort((a, b) => (a.transactions || 0) - (b.transactions || 0))[0]
  
  const stats = [
    { icon: '🔥', label: 'Hottest', team: hottest, value: hottest ? `${hottest.last3Wins} ${winsLabel}` : '-', valueClass: 'text-orange-400', type: 'hottest' },
    { icon: '❄️', label: 'Coldest', team: coldest, value: coldest ? `${coldest.last3Wins} ${winsLabel}` : '-', valueClass: 'text-cyan-400', type: 'coldest' },
    { icon: '📈', label: 'Most Moves', team: mostActive, value: mostActive?.transactions?.toString() || '0', valueClass: 'text-blue-400', type: 'mostMoves' },
    { icon: '🪨', label: 'Fewest Moves', team: leastActive, value: leastActive?.transactions?.toString() || '0', valueClass: 'text-purple-400', type: 'fewestMoves' }
  ]
  
  return stats
})

// Open quick stat modal - reuses the leader modal
function openQuickStatModal(type: string) {
  leaderModalType.value = type
  showLeaderModal.value = true
}

// Chart updated event handler
function onChartUpdated() {
  setTimeout(updateAvatarPositions, 100)
}

// Update avatar positions based on actual chart rendering
function updateAvatarPositions() {
  if (!apexChartRef.value?.chart) return
  
  const chart = apexChartRef.value.chart
  const weeks = Array.from(weeklyStandings.value.keys()).sort((a, b) => a - b)
  if (weeks.length === 0) return
  
  const lastWeek = weeks[weeks.length - 1]
  const lastDataPointIndex = weeks.length - 1
  
  const newPositions = new Map<string, { top: number, right: number }>()
  
  leagueStore.yahooTeams.forEach((team, seriesIndex) => {
    const weekData = weeklyStandings.value.get(lastWeek) || []
    const teamStanding = weekData.find((t: any) => t.team_key === team.team_key)
    const lastRank = teamStanding?.rank || leagueStore.yahooTeams.length
    
    // Get the actual Y position from ApexCharts
    try {
      const w = chart.w
      const yaxis = w.globals.yAxisScale[0]
      const plotHeight = w.globals.gridHeight
      const plotTop = w.globals.translateY
      
      // Calculate Y position - reversed axis means rank 1 is at top
      const totalTeams = leagueStore.yahooTeams.length
      const yPercent = (lastRank - 1) / Math.max(1, totalTeams - 1)
      const yPos = plotTop + (yPercent * plotHeight) - 12 // -12 to center 24px avatar
      
      // X position - right edge of plot
      const rightPadding = 8
      
      newPositions.set(team.team_key, { top: yPos, right: rightPadding })
    } catch (e) {
      // Fallback positioning
      const totalTeams = leagueStore.yahooTeams.length
      const yPercent = (lastRank - 1) / Math.max(1, totalTeams - 1)
      const yPos = 15 + (yPercent * 340) - 12
      newPositions.set(team.team_key, { top: yPos, right: 8 })
    }
  })
  
  avatarPositions.value = newPositions
}

// Get avatar style for a team
function getChartAvatarStyle(team: any): Record<string, string> {
  const pos = avatarPositions.value.get(team.team_key)
  if (pos) {
    return {
      top: `${pos.top}px`,
      right: `${pos.right}px`
    }
  }
  
  // Fallback: calculate position
  const weeks = Array.from(weeklyStandings.value.keys()).sort((a, b) => a - b)
  if (weeks.length === 0) return { display: 'none' }
  
  const lastWeek = weeks[weeks.length - 1]
  const weekData = weeklyStandings.value.get(lastWeek) || []
  const teamStanding = weekData.find((t: any) => t.team_key === team.team_key)
  const lastRank = teamStanding?.rank || sortedTeams.value.length
  
  const totalTeams = sortedTeams.value.length
  const yPercent = (lastRank - 1) / Math.max(1, totalTeams - 1)
  const yPos = 15 + (yPercent * 340) - 12
  
  return {
    top: `${yPos}px`,
    right: '8px'
  }
}

// Open team detail modal
function openTeamDetailModal(team: any) {
  selectedTeamDetail.value = team
  showTeamDetailModal.value = true
  
  // Build the weekly chart data
  buildTeamDetailChart(team)
  
  // Build weekly results
  buildTeamDetailWeeklyResults(team)
}

function buildTeamDetailChart(team: any) {
  const weeks = Array.from(weeklyStandings.value.keys()).sort((a, b) => a - b)
  if (weeks.length === 0) {
    teamDetailChartSeries.value = []
    teamDetailChartOptions.value = null
    return
  }
  
  // Get team's weekly matchup data
  const teamMatchups = weeklyMatchupResults.value.get(team.team_key)
  
  const teamWeeklyCatWins: number[] = []
  const opponentWeeklyCatWins: number[] = []
  
  weeks.forEach(week => {
    const matchup = teamMatchups?.get(week)
    if (matchup) {
      teamWeeklyCatWins.push(matchup.catWins || 0)
      opponentWeeklyCatWins.push(matchup.catLosses || 0) // catLosses = opponent's wins
    } else {
      // Fallback: estimate from totals
      const avgPerWeek = (team.wins || 0) / weeks.length
      teamWeeklyCatWins.push(avgPerWeek)
      opponentWeeklyCatWins.push(avgPerWeek)
    }
  })
  
  teamDetailChartSeries.value = [
    { name: 'Your Cats Won', data: teamWeeklyCatWins },
    { name: 'Opponent Cats Won', data: opponentWeeklyCatWins }
  ]
  
  teamDetailChartOptions.value = {
    chart: { type: 'line', background: 'transparent', toolbar: { show: false }, zoom: { enabled: false } },
    stroke: { curve: 'smooth', width: [3, 3] },
    colors: ['#22c55e', '#ef4444'], // Green for team, Red for opponent
    markers: { size: [5, 5] },
    xaxis: {
      categories: weeks.map(w => `Wk ${w}`),
      labels: { style: { colors: '#9CA3AF', fontSize: '10px' } }
    },
    yaxis: {
      min: 0,
      labels: { style: { colors: '#9CA3AF', fontSize: '10px' }, formatter: (val: number) => val.toFixed(0) }
    },
    grid: { borderColor: '#374151', strokeDashArray: 3 },
    legend: { show: true, position: 'top', horizontalAlign: 'right', labels: { colors: '#9CA3AF' } },
    tooltip: { 
      theme: 'dark',
      y: { formatter: (val: number) => `${val} categories` }
    }
  }
}

function buildTeamDetailWeeklyResults(team: any) {
  const weeks = Array.from(weeklyStandings.value.keys()).sort((a, b) => a - b)
  const teamMatchups = weeklyMatchupResults.value.get(team.team_key)
  
  const results: any[] = []
  
  weeks.forEach(week => {
    const matchup = teamMatchups?.get(week)
    if (matchup) {
      results.push({
        won: matchup.won,
        tied: matchup.tied,
        catWins: matchup.catWins || 0,
        catLosses: matchup.catLosses || 0,
        opponent: matchup.opponentName || 'Unknown'
      })
    } else {
      // No data available
      results.push({
        won: false,
        tied: false,
        catWins: 0,
        catLosses: 0,
        opponent: 'Unknown'
      })
    }
  })
  
  teamDetailWeeklyResults.value = results
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
  if (!teams || teams.length === 0) return 'text-dark-text'
  
  // Sort by win percentage
  const sorted = [...teams].sort((a, b) => {
    const aWinPct = (a.wins || 0) / Math.max(1, (a.wins || 0) + (a.losses || 0))
    const bWinPct = (b.wins || 0) / Math.max(1, (b.wins || 0) + (b.losses || 0))
    return bWinPct - aWinPct
  })
  
  if (team.team_key === sorted[0]?.team_key) return 'text-green-400'
  if (team.team_key === sorted[sorted.length - 1]?.team_key) return 'text-red-400'
  return 'text-dark-text'
}

function getAllPlayClass(team: any) {
  const teams = teamsWithStats.value
  if (!teams || teams.length === 0) return 'text-dark-textMuted'
  
  // Sort by all-play win percentage
  const sorted = [...teams].sort((a, b) => {
    const aWinPct = a.all_play_wins / Math.max(1, a.all_play_wins + a.all_play_losses)
    const bWinPct = b.all_play_wins / Math.max(1, b.all_play_wins + b.all_play_losses)
    return bWinPct - aWinPct
  })
  
  if (team.team_key === sorted[0]?.team_key) return 'text-green-400'
  if (team.team_key === sorted[sorted.length - 1]?.team_key) return 'text-red-400'
  return 'text-dark-textMuted'
}

function getPointsForClass(team: any) {
  const teams = teamsWithStats.value
  if (!teams || teams.length === 0) return 'text-dark-text'
  
  // Sort by points for (highest first)
  const sorted = [...teams].sort((a, b) => (b.points_for || 0) - (a.points_for || 0))
  
  if (team.team_key === sorted[0]?.team_key) return 'text-green-400'
  if (team.team_key === sorted[sorted.length - 1]?.team_key) return 'text-red-400'
  return 'text-dark-text'
}

function getPointsAgainstClass(team: any) {
  const teams = teamsWithStats.value
  if (!teams || teams.length === 0) return 'text-dark-textMuted'
  
  // Sort by points against (lowest first is best)
  const sorted = [...teams].sort((a, b) => (a.points_against || 0) - (b.points_against || 0))
  
  if (team.team_key === sorted[0]?.team_key) return 'text-green-400'
  if (team.team_key === sorted[sorted.length - 1]?.team_key) return 'text-red-400'
  return 'text-dark-textMuted'
}

function getCategoryWinClass(wins: number, catId: string) {
  const avg = getAverageCategoryWins(catId)
  if (wins > avg * 1.2) return 'text-green-400'
  if (wins < avg * 0.8) return 'text-red-400'
  return 'text-dark-text'
}

function handleImageError(e: Event) { (e.target as HTMLImageElement).src = defaultAvatar }
function openLeaderModal(type: string) { leaderModalType.value = type; showLeaderModal.value = true }
function closeLeaderModal() { showLeaderModal.value = false }
function formatLeaderValue(value: number) {
  if (leaderModalType.value === 'bestRecord') return value.toFixed(0) + '%'
  if (leaderModalType.value === 'hottest' || leaderModalType.value === 'coldest') return Math.round(value).toString()
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
    chart: { 
      type: 'line', 
      background: 'transparent', 
      toolbar: { show: false }, 
      zoom: { enabled: false }, 
      animations: { enabled: true, speed: 500 },
      events: {
        mounted: () => setTimeout(updateAvatarPositions, 100),
        updated: () => setTimeout(updateAvatarPositions, 100)
      }
    },
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
    grid: { borderColor: '#374151', strokeDashArray: 3, padding: { right: 50 } },
    legend: { show: false },
    tooltip: {
      theme: 'dark',
      shared: true,
      intersect: false,
      custom: function({ series: seriesData, dataPointIndex, w }: any) {
        // Get all teams with their ranks at this week
        const teamsWithRanks = leagueStore.yahooTeams.map((team: any, idx: number) => ({
          name: team.name,
          rank: seriesData[idx]?.[dataPointIndex] || leagueStore.yahooTeams.length,
          color: w.globals.colors[idx],
          isMyTeam: team.is_my_team
        }))
        
        // Sort by rank (ascending - #1 first)
        teamsWithRanks.sort((a: any, b: any) => a.rank - b.rank)
        
        const weekLabel = w.globals.categoryLabels?.[dataPointIndex] || `Week ${dataPointIndex + 1}`
        
        let html = `<div class="apexcharts-tooltip-title" style="font-weight: bold; padding: 6px 10px; background: #1f2937; border-bottom: 1px solid #374151;">${weekLabel}</div>`
        html += `<div style="padding: 6px 10px; max-height: 300px; overflow-y: auto;">`
        
        teamsWithRanks.forEach((team: any) => {
          const highlight = team.isMyTeam ? 'font-weight: bold; color: #F5C451;' : ''
          html += `<div style="display: flex; align-items: center; gap: 8px; padding: 3px 0; ${highlight}">
            <span style="color: ${team.color}; font-size: 16px;">●</span>
            <span style="min-width: 24px; color: #9ca3af;">#${team.rank}</span>
            <span>${team.name}</span>
          </div>`
        })
        
        html += `</div>`
        return html
      }
    }
  }
}

// Download standings as shareable image
async function downloadStandings() {
  isGeneratingDownload.value = true
  
  try {
    const html2canvas = (await import('html2canvas')).default
    
    // Team colors for chart
    const teamColors = ['#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#84CC16', '#6366F1', '#14B8A6', '#F43F5E']
    const getTeamColor = (idx: number) => teamColors[idx % teamColors.length]
    
    // Helper to load logo (same as header)
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
        console.warn('Failed to load logo:', e)
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
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 28px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(teamName.charAt(0).toUpperCase(), 32, 34)
      }
      return canvas.toDataURL('image/png')
    }
    
    const logoBase64 = await loadLogo()
    
    // Pre-load all team images
    const imageMap = new Map<string, string>()
    for (const team of sortedTeams.value) {
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
        imageMap.set(team.team_key, await loadPromise)
      } catch {
        imageMap.set(team.team_key, createPlaceholder(team.name))
      }
    }
    
    // Create container - use fixed width of 800px for consistent downloads regardless of team count
    const container = document.createElement('div')
    container.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 800px; font-family: system-ui, -apple-system, sans-serif;'
    
    // Split teams for two columns
    const midpoint = Math.ceil(sortedTeams.value.length / 2)
    const firstHalf = sortedTeams.value.slice(0, midpoint)
    const secondHalf = sortedTeams.value.slice(midpoint)
    
    // Calculate number of teams for percentage color thresholds
    const numTeams = sortedTeams.value.length
    const topThird = Math.ceil(numTeams / 3)
    const bottomThird = numTeams - Math.ceil(numTeams / 3)
    
    // Generate standings row - matching power rankings style
    const generateStandingsRow = (team: any, rank: number) => {
      // Record (wins-losses-ties)
      const record = `${team.wins || 0}-${team.losses || 0}${(team.ties || 0) > 0 ? `-${team.ties}` : ''}`
      
      // For points leagues, show total points; for category leagues, show cat win %
      let statValue: string
      let statLabel: string
      
      if (isPointsLeague.value) {
        statValue = (team.points_for || 0).toFixed(1)
        statLabel = 'Points'
      } else {
        const totalCats = (team.wins || 0) + (team.losses || 0) + (team.ties || 0)
        statValue = totalCats > 0 ? ((team.wins || 0) / totalCats * 100).toFixed(0) + '%' : '0%'
        statLabel = 'Cat Win %'
      }
      
      // Conditional color: green for top third, yellow for middle, red for bottom third
      let pctColor = '#f59e0b' // yellow default (middle)
      if (rank <= topThird) {
        pctColor = '#10b981' // green for top
      } else if (rank > bottomThird) {
        pctColor = '#ef4444' // red for bottom
      }
      
      // Trophy icon for playoff finishers
      let trophyIcon = ''
      if (team.playoffFinish === 1) {
        trophyIcon = '<span style="margin-left: 6px; font-size: 16px;" title="League Champion">🏆</span>'
      } else if (team.playoffFinish === 2) {
        trophyIcon = '<span style="margin-left: 6px; font-size: 14px;" title="Runner-up">🥈</span>'
      } else if (team.playoffFinish === 3) {
        trophyIcon = '<span style="margin-left: 6px; font-size: 14px;" title="Third Place">🥉</span>'
      }
      
      return `
      <div style="display: flex; height: 80px; padding: 0 12px; background: rgba(38, 42, 58, 0.4); border-radius: 10px; margin-bottom: 6px; border: 1px solid rgba(58, 61, 82, 0.4); box-sizing: border-box;">
        <!-- Rank Number - white -->
        <div style="width: 44px; flex-shrink: 0; padding-top: 8px;">
          <span style="font-size: 36px; font-weight: 900; color: #ffffff; font-family: 'Impact', 'Arial Black', sans-serif; letter-spacing: -2px; line-height: 1;">${rank}</span>
        </div>
        <!-- Team Logo - 48px logo -->
        <div style="width: 60px; flex-shrink: 0; padding-top: 16px;">
          <img src="${imageMap.get(team.team_key) || ''}" style="width: 48px; height: 48px; border-radius: 50%; border: 2px solid #3a3d52; background: #262a3a; object-fit: cover;" />
        </div>
        <!-- Team Info with trophy -->
        <div style="flex: 1; min-width: 0; padding-top: 16px;">
          <div style="font-size: 14px; font-weight: 700; color: #f7f7ff; white-space: nowrap; overflow: visible; line-height: 1.2; display: flex; align-items: center;">${team.name}${trophyIcon}</div>
          <div style="font-size: 11px; color: #9ca3af; line-height: 1.2; margin-top: 4px;">${record}</div>
        </div>
        <!-- Stat Value - big and colorful with label -->
        <div style="width: 65px; flex-shrink: 0; text-align: center; padding-top: 14px;">
          <div style="font-size: 22px; font-weight: bold; color: ${pctColor}; line-height: 1;">${statValue}</div>
          <div style="font-size: 9px; color: #6b7280; margin-top: 2px; text-transform: uppercase;">${statLabel}</div>
        </div>
      </div>
    `}
    
    container.innerHTML = `
      <div style="background: linear-gradient(160deg, #0f1219 0%, #0a0c14 50%, #0d1117 100%); border-radius: 16px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); position: relative; overflow: hidden;">
        
        <!-- Top Red Bar with site name -->
        <div style="background: #dc2626; padding: 10px 24px 10px 24px; text-align: center; overflow: visible;">
          <span style="font-size: 16px; font-weight: 700; color: #0a0c14; text-transform: uppercase; letter-spacing: 3px; display: block; margin-top: -17px;">Ultimate Fantasy Dashboard</span>
        </div>
        
        <!-- HEADER - Logo on left with text next to it -->
        <div style="display: flex; align-items: center; padding: 16px 24px; border-bottom: 1px solid rgba(220, 38, 38, 0.2); position: relative; z-index: 10;">
          <!-- Main Logo - maintain aspect ratio -->
          ${logoBase64 ? `<img src="${logoBase64}" style="height: 70px; width: auto; flex-shrink: 0; margin-right: 24px; display: block;" />` : ''}
          <!-- Title and League Info - vertically centered -->
          <div style="flex: 1; margin-top: -14px;">
            <div style="font-size: 42px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 2px 8px rgba(220, 38, 38, 0.4); line-height: 1;">League Standings</div>
            <div style="font-size: 20px; margin-top: 8px; font-weight: 600; line-height: 1;">
              <span style="color: #e5e7eb;">${leagueName.value}</span>
              <span style="color: #6b7280; margin: 0 8px;">•</span>
              <span style="color: #dc2626; font-weight: 700;">Week ${displayWeek.value}</span>
            </div>
          </div>
        </div>
        
        <!-- Main content area -->
        <div style="padding: 16px 24px 12px 24px; position: relative;">
          
          <!-- Standings (Two Columns) -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; position: relative; z-index: 1;">
            <div>${firstHalf.map((team, idx) => generateStandingsRow(team, idx + 1)).join('')}</div>
            <div>${secondHalf.map((team, idx) => generateStandingsRow(team, idx + midpoint + 1)).join('')}</div>
          </div>
          
          <!-- Trend Chart -->
          <div style="background: rgba(38, 42, 58, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 12px; border: 1px solid rgba(220, 38, 38, 0.2); position: relative; z-index: 1;">
            <h3 style="color: #dc2626; font-size: 18px; margin: 0 0 12px 0; text-align: center; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Standings Trend</h3>
            <div id="standings-trend-chart" style="height: 220px; width: 100%; min-width: 400px; position: relative;"></div>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="padding: 20px 24px 20px 24px; text-align: center; position: relative; z-index: 1;">
          <span style="font-size: 24px; font-weight: bold; color: #dc2626; letter-spacing: -0.5px; display: block; margin-top: -35px;">ultimatefantasydashboard.com</span>
        </div>
      </div>
    `
    
    document.body.appendChild(container)
    
    // Create trend chart with team logos at endpoints
    const trendChartContainer = container.querySelector('#standings-trend-chart')
    const weeks = Array.from(weeklyStandings.value.keys()).sort((a, b) => a - b)
    
    console.log('Download chart: weeks available =', weeks.length, 'trendChartContainer =', !!trendChartContainer)
    
    if (trendChartContainer && weeks.length >= 2) {
      try {
        const ApexCharts = (await import('apexcharts')).default
        console.log('ApexCharts loaded successfully')
      
      // Get last 7 weeks of data
      const maxWeeksToShow = 7
      const startIdx = Math.max(0, weeks.length - maxWeeksToShow)
      const weeksToShow = weeks.slice(startIdx)
      
      // Build series with last 7 weeks
      const trendSeries = sortedTeams.value.map((team) => {
        const data = weeksToShow.map(week => {
          const weekData = weeklyStandings.value.get(week) || []
          const teamStanding = weekData.find((t: any) => t.team_key === team.team_key)
          return teamStanding?.rank || sortedTeams.value.length
        })
        return {
          name: team.name,
          data: data
        }
      })
      
      const trendChart = new ApexCharts(trendChartContainer, {
        chart: {
          type: 'line',
          height: 220,
          width: '100%',
          background: 'transparent',
          toolbar: { show: false },
          animations: { enabled: false }
        },
        series: trendSeries,
        colors: sortedTeams.value.map((team, idx) => getTeamColor(idx)),
        stroke: {
          width: 2,
          curve: 'smooth'
        },
        markers: {
          size: 0,
          strokeWidth: 0
        },
        xaxis: {
          categories: weeksToShow.map(w => `Wk ${w}`),
          labels: {
            style: {
              colors: '#9ca3af',
              fontSize: '10px'
            }
          }
        },
        yaxis: {
          reversed: true,
          min: 1,
          max: sortedTeams.value.length,
          labels: {
            style: {
              colors: '#9ca3af',
              fontSize: '10px'
            },
            formatter: (value: number) => `#${Math.round(value)}`
          }
        },
        legend: {
          show: false
        },
        grid: {
          borderColor: '#374151',
          strokeDashArray: 3,
          padding: { right: 50 }
        },
        tooltip: { enabled: false }
      })
      
      await trendChart.render()
      
      // Wait for chart to render, then add team logos at endpoints
      // Use longer wait for larger leagues
      const waitTime = sortedTeams.value.length > 8 ? 800 : 600
      await new Promise(resolve => setTimeout(resolve, waitTime))
      
      console.log('Chart rendered, adding logos...')
      
      // Add team logos at the final data point of each line
      const chartEl = trendChartContainer.querySelector('.apexcharts-inner') as HTMLElement
      const plotArea = trendChartContainer.querySelector('.apexcharts-plot-series') as HTMLElement
      
      if (chartEl && plotArea) {
        console.log('Adding logos to chart - plotArea found')
        const plotRect = plotArea.getBoundingClientRect()
        const containerRect = (trendChartContainer as HTMLElement).getBoundingClientRect()
        
        const plotLeft = plotRect.left - containerRect.left
        const plotTop = plotRect.top - containerRect.top
        const plotHeight = plotRect.height
        const plotWidth = plotRect.width
        
        const logoContainer = document.createElement('div')
        logoContainer.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10;'
        
        for (let i = 0; i < sortedTeams.value.length; i++) {
          const team = sortedTeams.value[i]
          const seriesData = trendSeries[i]?.data || []
          if (seriesData.length === 0) continue
          
          const lastRank = seriesData[seriesData.length - 1]
          
          // Calculate y position based on rank (inverted axis: rank 1 at top, rank N at bottom)
          const yPercent = (lastRank - 1) / (numTeams - 1)
          const yPos = plotTop + (yPercent * plotHeight)
          
          // X position is at the right edge of the plot area
          const xPos = plotLeft + plotWidth
          
          const logoSize = 20
          
          const logoDiv = document.createElement('div')
          logoDiv.style.cssText = `
            position: absolute;
            left: ${xPos - logoSize / 2 + 4}px;
            top: ${yPos - logoSize / 2}px;
            width: ${logoSize}px;
            height: ${logoSize}px;
            border-radius: 50%;
            overflow: hidden;
            border: 2px solid ${team.is_my_team ? '#F5C451' : getTeamColor(i)};
            background: #262a3a;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          `
          logoDiv.innerHTML = `<img src="${imageMap.get(team.team_key) || ''}" style="width: 100%; height: 100%; object-fit: cover;" />`
          logoContainer.appendChild(logoDiv)
        }
        
        ;(trendChartContainer as HTMLElement).style.position = 'relative'
        trendChartContainer.appendChild(logoContainer)
      }
      
      // Wait for logos to render
      await new Promise(resolve => setTimeout(resolve, 300))
      } catch (chartError) {
        console.error('Error rendering chart:', chartError)
      }
    } else {
      // No chart data - wait for images only
      console.log('Skipping chart render - weeks:', weeks.length, 'container:', !!trendChartContainer)
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    // Capture the image with fixed width
    const canvas = await html2canvas(container, {
      backgroundColor: '#0a0c14',
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true,
      width: 800
    })
    
    document.body.removeChild(container)
    
    // Download the image
    const link = document.createElement('a')
    const safeLeagueName = leagueName.value.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-')
    link.download = `Standings - Week ${displayWeek.value} - ${safeLeagueName}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    
  } catch (error) {
    console.error('Error generating standings image:', error)
    alert('Failed to generate image. Please try again.')
  } finally {
    isGeneratingDownload.value = false
  }
}

// Download Leader Modal image (Most Category Wins, Best All Play, etc.)
async function downloadLeaderImage() {
  isDownloadingLeader.value = true
  try {
    const html2canvas = (await import('html2canvas')).default
    
    const rankings = leaderModalData.value.comparison.slice(0, leaderModalListLimit.value)
    if (rankings.length === 0) {
      isDownloadingLeader.value = false
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
    
    // Get accent color based on modal type
    const getAccentColor = (): string => {
      if (leaderModalType.value === 'bestRecord') return '#22c55e' // green
      if (leaderModalType.value === 'mostCatWins') return '#eab308' // yellow
      if (leaderModalType.value === 'hottest') return '#f97316' // orange
      if (leaderModalType.value === 'bestAllPlay') return '#3b82f6' // blue
      if (leaderModalType.value === 'coldest') return '#06b6d4' // cyan
      if (leaderModalType.value === 'mostMoves') return '#3b82f6' // blue
      if (leaderModalType.value === 'fewestMoves') return '#a855f7' // purple
      return '#eab308' // default yellow
    }
    const accentColor = getAccentColor()
    
    // Format value for display
    const formatValue = (val: number): string => {
      if (leaderModalType.value === 'bestRecord') return val.toFixed(0) + '%'
      return Math.round(val).toString()
    }
    
    // Get value unit for display in rows
    const getValueUnit = (): string => {
      if (leaderModalType.value === 'mostCatWins') return isPointsLeague.value ? 'Points' : 'Cat Wins'
      if (leaderModalType.value === 'bestAllPlay') return 'All-Play Wins'
      if (leaderModalType.value === 'hottest' || leaderModalType.value === 'coldest') return 'Cats (Last 3)'
      if (leaderModalType.value === 'mostMoves' || leaderModalType.value === 'fewestMoves') return 'Moves'
      return ''
    }
    const valueUnit = getValueUnit()
    
    // Generate ranking rows
    const generateRows = () => {
      return rankings.map((team: any, idx: number) => {
        const barWidth = maxValue > 0 ? (team.value / maxValue) * 100 : 0
        const isFirst = idx === 0
        
        return `
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
            <div style="width: 20px; text-align: center; font-weight: bold; font-size: 12px; color: ${isFirst ? accentColor : '#6b7280'};">${idx + 1}</div>
            <img src="${imageMap.get(team.name) || createPlaceholder(team.name)}" style="width: 28px; height: 28px; border-radius: 50%; border: 2px solid ${isFirst ? accentColor : '#3a3d52'};" />
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 12px; font-weight: 600; color: #e5e7eb; margin-bottom: 5px;">${team.name}</div>
              <div style="height: 6px; background: rgba(58, 61, 82, 0.5); border-radius: 3px; overflow: hidden;">
                <div style="height: 100%; width: ${barWidth}%; background: ${accentColor}; opacity: ${isFirst ? 1 : 0.6}; border-radius: 3px;"></div>
              </div>
            </div>
            <div style="width: 65px; text-align: right;">
              <div style="font-size: 13px; font-weight: bold; color: ${isFirst ? accentColor : '#e5e7eb'};">${formatValue(team.value)}</div>
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
            <div style="font-size: 17px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.1;">${leaderModalTitle.value}</div>
            <div style="font-size: 12px; margin-top: 2px;">
              <span style="color: #e5e7eb;">${leagueName.value}</span>
              <span style="color: #6b7280; margin: 0 4px;">•</span>
              <span style="color: #dc2626; font-weight: 600;">Week ${displayWeek.value}, ${currentSeason.value}</span>
            </div>
          </div>
        </div>
        
        <!-- Featured Leader -->
        <div style="padding: 12px 16px; background: linear-gradient(135deg, ${accentColor}20 0%, transparent 100%); border-bottom: 1px solid ${accentColor}30;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="${imageMap.get(leader.name) || createPlaceholder(leader.name)}" style="width: 44px; height: 44px; border-radius: 50%; border: 2px solid ${accentColor}80;" />
            <div style="flex: 1;">
              <div style="font-size: 15px; font-weight: bold; color: #ffffff;">${leader.name}</div>
              <div style="font-size: 11px; color: #9ca3af;">${leader.wins || 0}-${leader.losses || 0}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 26px; font-weight: 900; color: ${accentColor};">${formatValue(leader.value)}</div>
            </div>
          </div>
        </div>
        
        <!-- Rankings List -->
        <div style="padding: 12px 16px;">
          <div style="font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">${leaderModalListTitle.value}</div>
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
    const safeTitle = leaderModalTitle.value.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-')
    link.download = `${safeTitle}-${currentSeason.value}.png`
    link.href = finalCanvas.toDataURL('image/png')
    link.click()
  } catch (error) {
    console.error('Error generating leader image:', error)
    alert('Failed to generate image. Please try again.')
  } finally {
    isDownloadingLeader.value = false
  }
}

// Download Team Detail Modal image
async function downloadTeamDetailImage() {
  if (!selectedTeamDetail.value) return
  
  isDownloadingTeamDetail.value = true
  try {
    const html2canvas = (await import('html2canvas')).default
    const team = selectedTeamDetail.value
    
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
        ctx.fillStyle = '#eab308'
        ctx.font = 'bold 28px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(name.charAt(0).toUpperCase(), 32, 34)
      }
      return canvas.toDataURL('image/png')
    }
    
    const logoBase64 = await loadLogo()
    
    // Load team logo
    let teamLogoBase64 = createPlaceholder(team.name)
    if (team.logo_url) {
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
        img.src = team.logo_url
        teamLogoBase64 = await loadPromise
      } catch {
        teamLogoBase64 = createPlaceholder(team.name)
      }
    }
    
    // Get weekly results
    const weeklyResults = teamDetailWeeklyResults.value.slice(0, 20) // Up to 20 weeks
    
    // Generate weekly results grid
    const generateWeeklyResults = () => {
      return weeklyResults.map((result: any, idx: number) => {
        const bgColor = result.won ? 'rgba(34, 197, 94, 0.2)' : (result.tied ? 'rgba(234, 179, 8, 0.2)' : 'rgba(239, 68, 68, 0.2)')
        const textColor = result.won ? '#22c55e' : (result.tied ? '#eab308' : '#ef4444')
        const label = result.won ? 'W' : (result.tied ? 'T' : 'L')
        
        return `
          <div style="width: 32px; height: 32px; border-radius: 6px; background: ${bgColor}; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 11px; font-weight: bold; color: ${textColor};">${label}</span>
          </div>
        `
      }).join('')
    }
    
    // Get top categories for the team
    const topCategories = teamDetailCategories.value.slice(0, 6)
    
    // Generate category breakdown
    const generateCategories = () => {
      return topCategories.map((cat: any) => {
        const rankColor = cat.rank <= 3 ? '#22c55e' : (cat.rank <= 6 ? '#eab308' : '#ef4444')
        
        return `
          <div style="background: rgba(58, 61, 82, 0.3); border-radius: 8px; padding: 8px 10px; display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 11px; color: #9ca3af;">${cat.display_name}</span>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 13px; font-weight: bold; color: #e5e7eb;">${cat.wins}-${cat.losses}${cat.ties > 0 ? '-' + cat.ties : ''}</span>
              <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: ${rankColor}20; color: ${rankColor}; font-weight: 600;">#${cat.rank}</span>
            </div>
          </div>
        `
      }).join('')
    }
    
    const container = document.createElement('div')
    container.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 480px; font-family: system-ui, -apple-system, sans-serif;'
    
    const tiesText = team.ties > 0 ? `-${team.ties}` : ''
    const playoffBadge = team.playoffFinish === 1 ? '🏆' : (team.playoffFinish === 2 ? '🥈' : (team.playoffFinish === 3 ? '🥉' : ''))
    
    container.innerHTML = `
      <div style="background: linear-gradient(160deg, #0f1219 0%, #0a0c14 50%, #0d1117 100%); border-radius: 16px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); position: relative; overflow: hidden;">
        
        <!-- Top Red Bar -->
        <div style="background: #dc2626; padding: 8px 20px; text-align: center;">
          <span style="font-size: 12px; font-weight: 700; color: #0a0c14; text-transform: uppercase; letter-spacing: 2px;">Ultimate Fantasy Dashboard</span>
        </div>
        
        <!-- Header with Team -->
        <div style="display: flex; align-items: center; padding: 12px 16px; border-bottom: 1px solid rgba(220, 38, 38, 0.2);">
          ${logoBase64 ? `<img src="${logoBase64}" style="height: 40px; width: auto; flex-shrink: 0; margin-right: 12px;" />` : ''}
          <div style="flex: 1;">
            <div style="font-size: 11px; color: #9ca3af; margin-bottom: 2px;">${leagueName.value}</div>
            <div style="font-size: 12px; color: #dc2626; font-weight: 600;">${currentSeason.value} Season</div>
          </div>
        </div>
        
        <!-- Team Hero -->
        <div style="padding: 16px; background: linear-gradient(135deg, rgba(234, 179, 8, 0.1) 0%, transparent 100%); border-bottom: 1px solid rgba(234, 179, 8, 0.2);">
          <div style="display: flex; align-items: center; gap: 14px;">
            <img src="${teamLogoBase64}" style="width: 56px; height: 56px; border-radius: 50%; border: 3px solid rgba(234, 179, 8, 0.5);" />
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 20px; font-weight: 900; color: #ffffff;">${team.name}</span>
                ${playoffBadge ? `<span style="font-size: 18px;">${playoffBadge}</span>` : ''}
              </div>
              <div style="font-size: 12px; color: #9ca3af; margin-top: 2px;">Rank #${team.regularSeasonRank}</div>
            </div>
          </div>
        </div>
        
        <!-- Stats Grid -->
        <div style="padding: 12px 16px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; border-bottom: 1px solid rgba(58, 61, 82, 0.5);">
          <div style="background: rgba(58, 61, 82, 0.3); border-radius: 8px; padding: 10px; text-align: center;">
            <div style="font-size: 18px; font-weight: 900; color: #ffffff;">${team.wins}-${team.losses}${tiesText}</div>
            <div style="font-size: 10px; color: #9ca3af; margin-top: 2px;">Record</div>
          </div>
          <div style="background: rgba(58, 61, 82, 0.3); border-radius: 8px; padding: 10px; text-align: center;">
            <div style="font-size: 18px; font-weight: 900; color: #eab308;">#${team.regularSeasonRank}</div>
            <div style="font-size: 10px; color: #9ca3af; margin-top: 2px;">Rank</div>
          </div>
          <div style="background: rgba(58, 61, 82, 0.3); border-radius: 8px; padding: 10px; text-align: center;">
            <div style="font-size: 18px; font-weight: 900; color: #06b6d4;">${team.all_play_wins}-${team.all_play_losses}</div>
            <div style="font-size: 10px; color: #9ca3af; margin-top: 2px;">All-Play</div>
          </div>
          <div style="background: rgba(58, 61, 82, 0.3); border-radius: 8px; padding: 10px; text-align: center;">
            <div style="font-size: 18px; font-weight: 900; color: #22c55e;">${teamDetailAvgCatsPerWeek.value}</div>
            <div style="font-size: 10px; color: #9ca3af; margin-top: 2px;">Cats/Week</div>
          </div>
        </div>
        
        <!-- Category Breakdown -->
        <div style="padding: 12px 16px; border-bottom: 1px solid rgba(58, 61, 82, 0.5);">
          <div style="font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Category Breakdown</div>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px;">
            ${generateCategories()}
          </div>
        </div>
        
        <!-- Weekly Results -->
        <div style="padding: 12px 16px;">
          <div style="font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Weekly Results</div>
          <div style="display: flex; flex-wrap: wrap; gap: 4px;">
            ${generateWeeklyResults()}
          </div>
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
    const safeTeamName = team.name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-')
    link.download = `${safeTeamName}-${currentSeason.value}.png`
    link.href = finalCanvas.toDataURL('image/png')
    link.click()
  } catch (error) {
    console.error('Error generating team detail image:', error)
    alert('Failed to generate image. Please try again.')
  } finally {
    isDownloadingTeamDetail.value = false
  }
}

// Load league settings
async function loadLeagueSettings() {
  const leagueKey = effectiveLeagueKey.value || leagueStore.activeLeagueId
  if (!leagueKey) return
  
  // For ESPN, scoring type is already in the store (set during league loading)
  if (leagueStore.activePlatform === 'espn') {
    console.log('[loadLeagueSettings] ESPN platform - using store data')
    console.log('[loadLeagueSettings] scoringType:', scoringType.value)
    statCategories.value = [] // ESPN doesn't need category details
    return
  }
  
  // For Yahoo, call the API
  try {
    // Get league details to get the season
    const leagueDetails = await yahooService.getLeagueDetails(leagueKey)
    if (leagueDetails?.[0]?.season) {
      loadedSeason.value = leagueDetails[0].season
      console.log('Loaded season from API:', loadedSeason.value)
    }
    
    const settings = await yahooService.getLeagueScoringSettings(leagueKey)
    if (settings) {
      // Note: scoringType is now computed from store, no need to set it here
      const cats = settings.stat_categories || []
      statCategories.value = cats.map((c: any) => ({
        stat_id: c.stat?.stat_id || c.stat_id,
        name: c.stat?.name || c.name,
        display_name: c.stat?.display_name || c.display_name,
        is_only_display_stat: c.stat?.is_only_display_stat || c.is_only_display_stat
      })).filter((c: any) => c.stat_id)
      
      console.log('Loaded scoring type:', scoringType.value, 'Categories:', statCategories.value.length)
    }
  } catch (e) {
    console.error('Error loading league settings:', e)
  }
}

// Load all matchup data for chart
async function loadAllMatchups() {
  const leagueKey = effectiveLeagueKey.value || leagueStore.activeLeagueId
  if (!leagueKey) {
    console.log('No league key, skipping matchup load')
    return
  }
  
  console.log(`Loading matchups for league: ${leagueKey}, platform: ${leagueStore.activePlatform}`)
  isLoadingChart.value = true
  
  // For ESPN, use matchups from store (already loaded)
  if (leagueStore.activePlatform === 'espn') {
    console.log('[ESPN] Using matchups from store:', leagueStore.yahooMatchups?.length || 0)
    displayMatchups.value = leagueStore.yahooMatchups || []
    
    // Generate standings progression for chart
    const yahooLeagueData = Array.isArray(leagueStore.yahooLeague) ? leagueStore.yahooLeague[0] : leagueStore.yahooLeague
    const endWeek = yahooLeagueData?.end_week || 25
    const startWeek = yahooLeagueData?.start_week || 1
    
    generateStandingsProgression(startWeek, endWeek)
    buildChart()
    
    isLoadingChart.value = false
    chartLoadProgress.value = ''
    return
  }
  
  // For H2H Categories, we need to simulate standings over time
  // since Yahoo doesn't give us weekly W-L for category leagues
  // Instead, we'll generate estimated standings based on final standings
  const endWeek = totalWeeks.value || 25
  const startWeek = parseInt(leagueStore.yahooLeague?.start_week) || 1
  
  console.log(`Loading matchups for weeks ${startWeek}-${endWeek}, isSeasonComplete: ${isSeasonComplete.value}`)
  
  try {
    // For category leagues, load actual matchup data per week
    if (!isPointsLeague.value) {
      console.log('Category league detected - loading weekly matchup data')
      
      const standings = new Map<number, any[]>()
      const allMatchupResults = new Map<string, Map<number, any>>()
      
      // Initialize matchup results map for each team
      leagueStore.yahooTeams.forEach(t => {
        allMatchupResults.set(t.team_key, new Map())
      })
      
      // Cumulative category wins per team
      const cumulativeCatWins = new Map<string, number>()
      const cumulativeCatLosses = new Map<string, number>()
      const cumulativeMatchupWins = new Map<string, number>()
      const cumulativeMatchupLosses = new Map<string, number>()
      
      leagueStore.yahooTeams.forEach(t => {
        cumulativeCatWins.set(t.team_key, 0)
        cumulativeCatLosses.set(t.team_key, 0)
        cumulativeMatchupWins.set(t.team_key, 0)
        cumulativeMatchupLosses.set(t.team_key, 0)
      })
      
      for (let week = startWeek; week <= endWeek; week++) {
        chartLoadProgress.value = `Week ${week}/${endWeek}`
        
        try {
          const matchups = await yahooService.getCategoryMatchups(leagueKey, week)
          console.log(`Week ${week}: ${matchups.length} matchups`)
          
          for (const matchup of matchups) {
            if (!matchup.teams || matchup.teams.length < 2) continue
            
            const t1 = matchup.teams[0]
            const t2 = matchup.teams[1]
            const t1Key = t1?.team_key
            const t2Key = t2?.team_key
            
            if (!t1Key || !t2Key) continue
            
            // Count category wins from stat_winners
            let t1CatWins = 0
            let t2CatWins = 0
            let ties = 0
            
            if (matchup.stat_winners && matchup.stat_winners.length > 0) {
              for (const sw of matchup.stat_winners) {
                if (sw.is_tied === '1') {
                  ties++
                } else if (sw.winner_team_key === t1Key) {
                  t1CatWins++
                } else if (sw.winner_team_key === t2Key) {
                  t2CatWins++
                }
              }
            }
            
            // Determine matchup winner
            const t1Won = t1CatWins > t2CatWins
            const t2Won = t2CatWins > t1CatWins
            const tied = t1CatWins === t2CatWins
            
            // Update cumulative stats
            cumulativeCatWins.set(t1Key, (cumulativeCatWins.get(t1Key) || 0) + t1CatWins)
            cumulativeCatLosses.set(t1Key, (cumulativeCatLosses.get(t1Key) || 0) + t2CatWins)
            cumulativeCatWins.set(t2Key, (cumulativeCatWins.get(t2Key) || 0) + t2CatWins)
            cumulativeCatLosses.set(t2Key, (cumulativeCatLosses.get(t2Key) || 0) + t1CatWins)
            
            if (t1Won) {
              cumulativeMatchupWins.set(t1Key, (cumulativeMatchupWins.get(t1Key) || 0) + 1)
              cumulativeMatchupLosses.set(t2Key, (cumulativeMatchupLosses.get(t2Key) || 0) + 1)
            } else if (t2Won) {
              cumulativeMatchupWins.set(t2Key, (cumulativeMatchupWins.get(t2Key) || 0) + 1)
              cumulativeMatchupLosses.set(t1Key, (cumulativeMatchupLosses.get(t1Key) || 0) + 1)
            }
            
            // Store matchup result for each team
            const t1TeamData = leagueStore.yahooTeams.find(t => t.team_key === t1Key)
            const t2TeamData = leagueStore.yahooTeams.find(t => t.team_key === t2Key)
            
            allMatchupResults.get(t1Key)?.set(week, {
              catWins: t1CatWins,
              catLosses: t2CatWins,
              won: t1Won,
              tied: tied,
              opponentKey: t2Key,
              opponentName: t2TeamData?.name || 'Unknown'
            })
            
            allMatchupResults.get(t2Key)?.set(week, {
              catWins: t2CatWins,
              catLosses: t1CatWins,
              won: t2Won,
              tied: tied,
              opponentKey: t1Key,
              opponentName: t1TeamData?.name || 'Unknown'
            })
          }
          
          // Build week standings
          const weekStandings = leagueStore.yahooTeams.map(t => ({
            team_key: t.team_key,
            name: t.name,
            wins: cumulativeCatWins.get(t.team_key) || 0,
            losses: cumulativeCatLosses.get(t.team_key) || 0,
            matchupWins: cumulativeMatchupWins.get(t.team_key) || 0,
            matchupLosses: cumulativeMatchupLosses.get(t.team_key) || 0
          })).sort((a, b) => {
            // Sort by matchup wins first, then cat win %
            if (b.matchupWins !== a.matchupWins) return b.matchupWins - a.matchupWins
            const aWinPct = a.wins / Math.max(1, a.wins + a.losses)
            const bWinPct = b.wins / Math.max(1, b.wins + b.losses)
            return bWinPct - aWinPct
          })
          
          weekStandings.forEach((t, idx) => (t as any).rank = idx + 1)
          standings.set(week, weekStandings)
          
          if (week === endWeek) {
            displayMatchups.value = matchups
          }
          
        } catch (e) {
          console.error(`Error loading week ${week}:`, e)
        }
      }
      
      weeklyStandings.value = standings
      weeklyMatchupResults.value = allMatchupResults
      console.log(`Loaded ${standings.size} weeks of category matchup data`)
      
    } else {
      // For points leagues, load actual matchup data
      const standings = new Map<number, any[]>()
      const allMatchupResults = new Map<string, Map<number, any>>()
      
      // Initialize matchup results map for each team
      leagueStore.yahooTeams.forEach(t => {
        allMatchupResults.set(t.team_key, new Map())
      })
      
      for (let week = startWeek; week <= endWeek; week++) {
        chartLoadProgress.value = `Week ${week}/${endWeek}`
        
        try {
          const matchups = await yahooService.getMatchups(leagueKey, week)
          console.log(`Week ${week}: ${matchups.length} matchups`)
          
          const cumulativeWins = new Map<string, number>()
          const cumulativeLosses = new Map<string, number>()
          const cumulativePoints = new Map<string, number>()
          
          if (week > startWeek) {
            const prevStandings = standings.get(week - 1) || []
            prevStandings.forEach(t => {
              cumulativeWins.set(t.team_key, t.wins || 0)
              cumulativeLosses.set(t.team_key, t.losses || 0)
              cumulativePoints.set(t.team_key, t.points_for || 0)
            })
          } else {
            leagueStore.yahooTeams.forEach(t => {
              cumulativeWins.set(t.team_key, 0)
              cumulativeLosses.set(t.team_key, 0)
              cumulativePoints.set(t.team_key, 0)
            })
          }
          
          for (const matchup of matchups) {
            if (!matchup.teams || matchup.teams.length < 2) continue
            const t1 = matchup.teams[0]
            const t2 = matchup.teams[1]
            
            // Get points for this week
            const t1Points = parseFloat(t1.team_points?.total || t1.points || '0')
            const t2Points = parseFloat(t2.team_points?.total || t2.points || '0')
            
            // Store matchup results for each team
            const t1Results = allMatchupResults.get(t1.team_key)
            const t2Results = allMatchupResults.get(t2.team_key)
            
            if (t1Results) {
              t1Results.set(week, {
                points: t1Points,
                oppPoints: t2Points,
                won: matchup.winner_team_key === t1.team_key
              })
            }
            if (t2Results) {
              t2Results.set(week, {
                points: t2Points,
                oppPoints: t1Points,
                won: matchup.winner_team_key === t2.team_key
              })
            }
            
            // Track cumulative points
            cumulativePoints.set(t1.team_key, (cumulativePoints.get(t1.team_key) || 0) + t1Points)
            cumulativePoints.set(t2.team_key, (cumulativePoints.get(t2.team_key) || 0) + t2Points)
            
            if (matchup.winner_team_key) {
              if (matchup.winner_team_key === t1.team_key) {
                cumulativeWins.set(t1.team_key, (cumulativeWins.get(t1.team_key) || 0) + 1)
                cumulativeLosses.set(t2.team_key, (cumulativeLosses.get(t2.team_key) || 0) + 1)
              } else {
                cumulativeWins.set(t2.team_key, (cumulativeWins.get(t2.team_key) || 0) + 1)
                cumulativeLosses.set(t1.team_key, (cumulativeLosses.get(t1.team_key) || 0) + 1)
              }
            }
          }
          
          const weekStandings = leagueStore.yahooTeams.map(t => ({
            team_key: t.team_key,
            name: t.name,
            wins: cumulativeWins.get(t.team_key) || 0,
            losses: cumulativeLosses.get(t.team_key) || 0,
            points_for: cumulativePoints.get(t.team_key) || 0
          })).sort((a, b) => {
            const aWinPct = a.wins / Math.max(1, a.wins + a.losses)
            const bWinPct = b.wins / Math.max(1, b.wins + b.losses)
            return bWinPct - aWinPct
          })
          
          weekStandings.forEach((t, idx) => (t as any).rank = idx + 1)
          standings.set(week, weekStandings)
          
          if (week === endWeek) {
            displayMatchups.value = matchups
          }
          
        } catch (e) {
          console.error(`Error loading week ${week}:`, e)
        }
      }
      
      weeklyStandings.value = standings
      weeklyMatchupResults.value = allMatchupResults
    }
    
    buildChart()
    console.log(`Chart built with ${weeklyStandings.value.size} weeks of data`)
    
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

// Load all data for Yahoo
async function loadAllData() {
  // Use effectiveLeagueKey which might be the previous season if current has no data
  const leagueKey = effectiveLeagueKey.value || leagueStore.activeLeagueId
  if (!leagueKey || leagueStore.activePlatform !== 'yahoo') return
  
  console.log(`loadAllData using league key: ${leagueKey}`)
  isLoading.value = true
  
  try {
    if (authStore.user?.id) await yahooService.initialize(authStore.user.id)
    
    await loadLeagueSettings()
    
    // Fetch transaction counts
    const transCounts = await yahooService.getTransactionCounts(leagueKey)
    transactionCounts.value = transCounts
    console.log(`Loaded transaction counts for ${transCounts.size} teams`)
    
    // Distribute category wins proportionally
    if (!isPointsLeague.value && displayCategories.value.length > 0) {
      distributeCategoryWins()
    }
    
    isLoading.value = false
    
    // Load matchups in background for chart
    loadAllMatchups()
    
  } catch (e) {
    console.error('Error loading baseball data:', e)
    isLoading.value = false
  }
}

// Load all data for ESPN
async function loadEspnData() {
  const leagueKey = leagueStore.activeLeagueId
  if (!leagueKey || leagueStore.activePlatform !== 'espn') return
  
  console.log('[ESPN] loadEspnData for:', leagueKey)
  isLoading.value = true
  
  try {
    // Settings are already in store, just log them
    loadLeagueSettings()
    
    // Parse league key to get ESPN details
    const parts = leagueKey.split('_')
    const sport = parts[1] as 'football' | 'baseball' | 'basketball' | 'hockey'
    const espnLeagueId = parts[2]
    const season = parseInt(parts[3])
    
    // Dynamically import ESPN service
    const { espnService } = await import('@/services/espn')
    
    // Fetch transactions for move counts
    try {
      const transactions = await espnService.getTransactions(sport, espnLeagueId, season)
      console.log('[ESPN] Fetched transactions:', transactions.length)
      
      // Count transactions per team
      const counts = new Map<string, number>()
      transactions.forEach((tx: any) => {
        // ESPN transactions have different structures - try to get team ID
        const teamId = tx.teamId || tx.team?.id
        if (teamId) {
          const teamKey = `espn_${teamId}`
          counts.set(teamKey, (counts.get(teamKey) || 0) + 1)
        }
        // Also count by items array if present
        if (tx.items) {
          tx.items.forEach((item: any) => {
            if (item.fromTeamId) {
              const fromKey = `espn_${item.fromTeamId}`
              counts.set(fromKey, (counts.get(fromKey) || 0) + 1)
            }
            if (item.toTeamId) {
              const toKey = `espn_${item.toTeamId}`
              counts.set(toKey, (counts.get(toKey) || 0) + 1)
            }
          })
        }
      })
      transactionCounts.value = counts
      console.log('[ESPN] Transaction counts:', Object.fromEntries(counts))
    } catch (txErr) {
      console.warn('[ESPN] Could not fetch transactions:', txErr)
      transactionCounts.value = new Map()
    }
    
    // Fetch all historical matchups for proper streak/weekly data
    try {
      const allMatchups = await espnService.getAllMatchups(sport, espnLeagueId, season)
      console.log('[ESPN] Fetched all matchups for', allMatchups.size, 'weeks')
      
      // Build weekly matchup results from actual data
      const allMatchupResults = new Map<string, Map<number, any>>()
      const weeklyScores = new Map<string, Map<number, number>>()
      
      // Initialize maps for each team
      leagueStore.yahooTeams.forEach(team => {
        allMatchupResults.set(team.team_key, new Map())
        weeklyScores.set(team.team_key, new Map())
      })
      
      // Process each week's matchups
      allMatchups.forEach((matchups, week) => {
        matchups.forEach(matchup => {
          const homeTeamKey = `espn_${matchup.homeTeamId}`
          const awayTeamKey = `espn_${matchup.awayTeamId}`
          const homeScore = matchup.homeScore || 0
          const awayScore = matchup.awayScore || 0
          
          // Record for home team
          const homeResults = allMatchupResults.get(homeTeamKey)
          if (homeResults) {
            homeResults.set(week, {
              won: homeScore > awayScore,
              tied: homeScore === awayScore,
              points: homeScore,
              opponentPoints: awayScore,
              opponent: awayTeamKey
            })
          }
          
          // Record for away team
          const awayResults = allMatchupResults.get(awayTeamKey)
          if (awayResults) {
            awayResults.set(week, {
              won: awayScore > homeScore,
              tied: homeScore === awayScore,
              points: awayScore,
              opponentPoints: homeScore,
              opponent: homeTeamKey
            })
          }
          
          // Record weekly scores
          const homeScores = weeklyScores.get(homeTeamKey)
          if (homeScores) homeScores.set(week, homeScore)
          const awayScores = weeklyScores.get(awayTeamKey)
          if (awayScores) awayScores.set(week, awayScore)
        })
      })
      
      weeklyMatchupResults.value = allMatchupResults
      espnWeeklyScores.value = weeklyScores
      console.log('[ESPN] Built matchup results for', allMatchupResults.size, 'teams')
      
    } catch (matchupErr) {
      console.warn('[ESPN] Could not fetch all matchups, using generated data:', matchupErr)
      // Fall back to generated data
      const yahooLeagueData = Array.isArray(leagueStore.yahooLeague) ? leagueStore.yahooLeague[0] : leagueStore.yahooLeague
      const endWeek = yahooLeagueData?.end_week || 25
      const startWeek = yahooLeagueData?.start_week || 1
      generateEspnMatchupResults(startWeek, endWeek)
    }
    
    // Load matchups from store
    displayMatchups.value = leagueStore.yahooMatchups || []
    console.log('[ESPN] Matchups from store:', displayMatchups.value.length)
    
    // Fetch real category stats breakdown for ESPN category leagues
    if (!isPointsLeague.value) {
      console.log('[ESPN] Category league detected - fetching real category stats')
      try {
        const categoryBreakdown = await espnService.getCategoryStatsBreakdown(sport, espnLeagueId, season)
        
        console.log('[ESPN] Got category breakdown:', {
          categoriesCount: categoryBreakdown.categories.length,
          teamsCount: categoryBreakdown.teamCategoryWins.size
        })
        
        // Set stat categories from ESPN
        statCategories.value = categoryBreakdown.categories
        
        // Convert teamCategoryWins Map to use team_key format consistent with yahooTeams
        const convertedCatWins = new Map<string, Record<string, number>>()
        for (const team of leagueStore.yahooTeams) {
          // Try different key formats to find the matching entry
          const espnKey = `espn_${team.team_id}`
          const catWins = categoryBreakdown.teamCategoryWins.get(espnKey)
          if (catWins) {
            convertedCatWins.set(team.team_key, catWins)
          }
        }
        
        teamCategoryWins.value = convertedCatWins
        console.log('[ESPN] Category wins set for', convertedCatWins.size, 'teams')
        
      } catch (error) {
        console.error('[ESPN] Error fetching category breakdown:', error)
        // Fall back to distribution method
        if (displayCategories.value.length > 0) {
          distributeCategoryWins()
        }
      }
    }
    
    // Generate standings progression
    const yahooLeagueData = Array.isArray(leagueStore.yahooLeague) ? leagueStore.yahooLeague[0] : leagueStore.yahooLeague
    const endWeek = yahooLeagueData?.end_week || 25
    const startWeek = yahooLeagueData?.start_week || 1
    
    generateStandingsProgression(startWeek, endWeek)
    buildChart()
    
    isLoading.value = false
    isLoadingChart.value = false
    
  } catch (e) {
    console.error('[ESPN] Error loading data:', e)
    isLoading.value = false
  }
}

// Generate fake matchup results for ESPN (for hottest/coldest stats)
function generateEspnMatchupResults(startWeek: number, endWeek: number) {
  const allMatchupResults = new Map<string, Map<number, any>>()
  const teams = leagueStore.yahooTeams
  const numWeeks = endWeek - startWeek + 1
  
  // Initialize map for each team
  teams.forEach(team => {
    allMatchupResults.set(team.team_key, new Map())
  })
  
  // Distribute wins/losses across weeks proportionally
  teams.forEach(team => {
    const totalWins = team.wins || 0
    const totalLosses = team.losses || 0
    const teamResults = allMatchupResults.get(team.team_key)!
    
    let cumulativeWins = 0
    let cumulativeLosses = 0
    
    for (let week = startWeek; week <= endWeek; week++) {
      const progress = (week - startWeek + 1) / numWeeks
      const expectedWins = Math.floor(totalWins * progress)
      const expectedLosses = Math.floor(totalLosses * progress)
      
      const weekWins = expectedWins - cumulativeWins
      const weekLosses = expectedLosses - cumulativeLosses
      
      cumulativeWins = expectedWins
      cumulativeLosses = expectedLosses
      
      teamResults.set(week, {
        won: weekWins > weekLosses,
        catWins: weekWins, // For points leagues, this represents matchup wins
        catLosses: weekLosses
      })
    }
  })
  
  weeklyMatchupResults.value = allMatchupResults
  console.log('[ESPN] Generated matchup results for', teams.length, 'teams')
}

watch(() => leagueStore.activeLeagueId, () => {
  if (leagueStore.activePlatform === 'yahoo') loadAllData()
  if (leagueStore.activePlatform === 'espn') loadEspnData()
})

// Watch for currentLeague changes (happens when fallback to previous season occurs)
watch(() => leagueStore.currentLeague?.league_id, (newKey, oldKey) => {
  if (newKey && newKey !== oldKey) {
    console.log(`Current league changed from ${oldKey} to ${newKey}, reloading data...`)
    if (leagueStore.activePlatform === 'yahoo') loadAllData()
    if (leagueStore.activePlatform === 'espn') loadEspnData()
  }
})

watch(() => leagueStore.yahooTeams, () => {
  if (leagueStore.yahooTeams.length > 0) {
    if (leagueStore.activePlatform === 'yahoo') loadAllData()
    if (leagueStore.activePlatform === 'espn') loadEspnData()
  }
}, { immediate: true })

// Watch for matchups changes (they might load after teams)
watch(() => leagueStore.yahooMatchups, () => {
  if (leagueStore.activePlatform === 'espn' && leagueStore.yahooMatchups?.length > 0) {
    console.log('[Watch yahooMatchups] ESPN matchups changed:', leagueStore.yahooMatchups.length)
    displayMatchups.value = leagueStore.yahooMatchups
  }
}, { immediate: true })

function checkScrollHint() {
  if (standingsTableRef.value) {
    const { scrollWidth, clientWidth } = standingsTableRef.value
    showScrollHint.value = scrollWidth > clientWidth
  }
}

onMounted(() => {
  if (leagueStore.yahooTeams.length > 0) {
    if (leagueStore.activePlatform === 'yahoo') loadAllData()
    if (leagueStore.activePlatform === 'espn') loadEspnData()
  }
  
  // Check scroll hint after a delay for DOM to settle
  setTimeout(checkScrollHint, 500)
  window.addEventListener('resize', checkScrollHint)
})
</script>
