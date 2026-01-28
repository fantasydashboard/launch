<template>
  <div class="space-y-6">
    <!-- Offseason Notice Banner - Only show when season is complete -->
    <div v-if="isSeasonComplete" class="bg-slate-500/10 border border-slate-500/30 rounded-xl p-4 flex items-start gap-3">
      <div class="text-slate-400 text-xl flex-shrink-0">📅</div>
      <div>
        <p class="text-slate-200 font-semibold">It's the offseason</p>
        <p class="text-slate-400 text-sm mt-1">You're viewing last season's data ({{ currentSeason }}). The {{ Number(currentSeason) + 1 }} season will appear automatically once Week 1 begins.</p>
      </div>
    </div>

    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="text-3xl font-bold text-dark-text mb-2">Category Projections</h1>
        <p class="text-base text-dark-textMuted">Rest of season rankings by statistical category</p>
      </div>
      <div class="flex items-center gap-3">
        <button @click="refreshData" :disabled="isLoading" class="px-4 py-2 rounded-lg bg-dark-card hover:bg-dark-border/50 text-dark-textMuted transition-all flex items-center gap-2">
          <svg :class="{ 'animate-spin': isLoading }" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>
    </div>

    <!-- Simulated Data Banner for non-Ultimate users -->
    <SimulatedDataBanner v-if="!hasPremiumAccess" :is-ultimate-tier="true" class="mb-6" />

    <!-- Tab Navigation -->
    <div class="flex items-center gap-2 border-b border-dark-border pb-2">
      <button 
        @click="activeTab = 'ros'"
        :class="activeTab === 'ros' ? 'bg-yellow-400 text-gray-900' : 'bg-dark-card text-dark-textMuted hover:bg-dark-border'"
        class="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
      >
        <span>📊</span> Rest of Season
      </button>
      <button 
        @click="activeTab = 'teams'"
        :class="activeTab === 'teams' ? 'bg-yellow-400 text-gray-900' : 'bg-dark-card text-dark-textMuted hover:bg-dark-border'"
        class="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
      >
        <span>👥</span> Teams
      </button>
      <button 
        @click="activeTab = 'startsit'"
        :class="activeTab === 'startsit' ? 'bg-yellow-400 text-gray-900' : 'bg-dark-card text-dark-textMuted hover:bg-dark-border'"
        class="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
      >
        <span>🎯</span> Start/Sit
      </button>
      <button 
        @click="activeTab = 'trade'"
        :class="activeTab === 'trade' ? 'bg-yellow-400 text-gray-900' : 'bg-dark-card text-dark-textMuted hover:bg-dark-border'"
        class="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
      >
        <span>🔄</span> Trade Analyzer
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center py-20">
      <LoadingSpinner size="xl" :message="loadingMessage" />
      
      <!-- Detailed progress -->
      <div class="mt-4 text-center space-y-2">
        <div v-if="loadingProgress.currentStep" class="text-sm text-dark-textMuted">
          {{ loadingProgress.currentStep }}
        </div>
        
        <!-- Progress bar -->
        <div v-if="loadingProgress.maxWeek > 0" class="w-64 mx-auto">
          <div class="flex justify-between text-xs text-dark-textMuted/70 mb-1">
            <span>Step {{ loadingProgress.week }}</span>
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

    <template v-else>
      <!-- REST OF SEASON TAB -->
      <template v-if="activeTab === 'ros'">
      <!-- Category Selector -->
      <div class="card">
        <div class="card-body py-4">
          <div class="flex flex-col gap-4">
            <div class="flex items-center gap-3">
              <span class="text-dark-textMuted font-medium">Select Category:</span>
              <select v-model="selectedCategory" class="select bg-dark-card border-dark-border text-dark-text px-4 py-2 rounded-lg min-w-[200px]">
                <optgroup :label="skaterCategoryLabel">
                  <option v-for="cat in hittingCategories" :key="cat.stat_id" :value="cat.stat_id">
                    {{ cat.name }} ({{ cat.display_name }})
                  </option>
                </optgroup>
                <optgroup :label="goalieCategoryLabel">
                  <option v-for="cat in pitchingCategories" :key="cat.stat_id" :value="cat.stat_id">
                    {{ cat.name }} ({{ cat.display_name }})
                  </option>
                </optgroup>
              </select>
            </div>
            <div class="flex flex-wrap gap-2">
              <span class="text-dark-textMuted text-sm mr-2 self-center">Quick:</span>
              <button 
                v-for="cat in displayCategories" 
                :key="cat.stat_id"
                @click="selectedCategory = cat.stat_id"
                :class="selectedCategory === cat.stat_id ? 'bg-yellow-400 text-gray-900' : 'bg-dark-border/50 text-dark-textSecondary hover:bg-dark-border'"
                class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              >
                {{ cat.display_name }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Selected Category Info -->
      <div v-if="selectedCategoryInfo" class="card" :class="getCategoryCardClass">
        <div class="card-body py-4">
          <div class="flex items-center justify-between flex-wrap gap-4">
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black" :class="getCategoryBadgeClass">
                {{ selectedCategoryInfo.display_name }}
              </div>
              <div>
                <h2 class="text-xl font-bold text-dark-text">{{ selectedCategoryInfo.name }}</h2>
                <p class="text-sm text-dark-textMuted">
                  {{ isRatioCategory ? 'Ratio stat' : 'Counting stat' }} • {{ categoryTypeLabel }}
                </p>
              </div>
            </div>
            <div class="text-right">
              <div class="text-sm text-dark-textMuted">Players Ranked</div>
              <div class="text-2xl font-bold text-dark-text">{{ filteredPlayers.length }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap items-center gap-4">
        <div class="flex items-center gap-2">
          <span class="text-dark-textMuted text-sm">Filter:</span>
          <button 
            v-for="pos in availablePositions" 
            :key="pos"
            @click="togglePositionFilter(pos)"
            :class="selectedPositions.includes(pos) ? 'bg-green-500/20 text-green-400 border-green-500' : 'bg-dark-card text-dark-textMuted border-dark-border hover:border-dark-textMuted'"
            class="px-3 py-1 text-sm rounded-lg border transition-all"
          >{{ pos }}</button>
          <button @click="selectAllPositions" class="text-xs text-green-400 hover:underline ml-2">All</button>
        </div>
        <div class="flex items-center gap-3 ml-auto">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" v-model="showOnlyMyPlayers" class="w-4 h-4 rounded border-dark-border bg-dark-card text-yellow-400" />
            <span class="text-sm text-dark-textMuted">My Players</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" v-model="showOnlyFreeAgents" class="w-4 h-4 rounded border-dark-border bg-dark-card text-cyan-400" />
            <span class="text-sm text-dark-textMuted">Free Agents</span>
          </label>
        </div>
      </div>

      <!-- Ranking Customizer -->
      <CategoryRankingCustomizer 
        v-model="rosRankingFactors"
        @apply="onRankingFactorsApplied"
      />

      <!-- Rankings Table -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">📊</span>
            <h2 class="card-title">{{ selectedCategoryInfo?.name || 'Category' }} Rankings - Rest of Season</h2>
          </div>
          <p class="card-subtitle">Click on a player to see detailed stats and performance chart</p>
        </div>
        <div class="card-body p-0">
          <div class="overflow-x-auto max-h-[70vh] overflow-y-auto">
            <table class="w-full">
              <thead class="bg-dark-border/30 sticky top-0 z-10">
                <tr>
                  <th class="px-3 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase w-14 cursor-pointer hover:text-yellow-400" @click="toggleSort('rank')" :title="columnTooltips.rank">
                    <div class="flex items-center gap-1">Rank <span v-if="sortColumn === 'rank'" class="text-yellow-400">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span></div>
                  </th>
                  <th class="px-3 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase cursor-pointer hover:text-yellow-400" @click="toggleSort('name')" :title="columnTooltips.player">
                    <div class="flex items-center gap-1">Player <span v-if="sortColumn === 'name'" class="text-yellow-400">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span></div>
                  </th>
                  <th class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-14 cursor-pointer hover:text-yellow-400" @click="toggleSort('position')" :title="columnTooltips.position">
                    <div class="flex items-center justify-center gap-1">Pos <span v-if="sortColumn === 'position'" class="text-yellow-400">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span></div>
                  </th>
                  <th class="px-2 py-3 text-center text-xs font-semibold uppercase w-20 cursor-pointer hover:text-yellow-400" @click="toggleSort('projected')" :title="columnTooltips.rosProj">
                    <div class="flex items-center justify-center gap-1"><span class="text-yellow-400">ROS Proj</span> <span v-if="sortColumn === 'projected'" class="text-yellow-400">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span></div>
                  </th>
                  <th class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-16 cursor-pointer hover:text-yellow-400" @click="toggleSort('current')" :title="columnTooltips.current">
                    <div class="flex items-center justify-center gap-1">Current <span v-if="sortColumn === 'current'" class="text-yellow-400">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span></div>
                  </th>
                  <th class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-16 cursor-pointer hover:text-yellow-400" @click="toggleSort('perGame')" :title="columnTooltips.perGame">
                    <div class="flex items-center justify-center gap-1">Per Game <span v-if="sortColumn === 'perGame'" class="text-yellow-400">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span></div>
                  </th>
                  <th class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-24 cursor-pointer hover:text-yellow-400" @click="toggleSort('value')" :title="columnTooltips.value">
                    <div class="flex items-center justify-center gap-1">Value <span class="text-dark-textMuted/50 text-[10px]">ⓘ</span> <span v-if="sortColumn === 'value'" class="text-yellow-400">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span></div>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-dark-border/30">
                <template v-for="(player, idx) in gatedSortedPlayers" :key="player.player_key">
                  <!-- Tier Break -->
                  <tr v-if="showTierBreak(player, idx)" class="bg-dark-border/10">
                    <td colspan="7" class="px-4 py-2">
                      <div class="flex items-center gap-2">
                        <div class="h-px flex-1 bg-yellow-400/30"></div>
                        <span class="text-xs font-bold text-yellow-400 uppercase tracking-wider">{{ getTierLabel(player.tier) }}</span>
                        <div class="h-px flex-1 bg-yellow-400/30"></div>
                      </div>
                    </td>
                  </tr>
                  <!-- Player Row -->
                  <tr :class="[getRowClass(player), expandedPlayerKey === player.player_key ? 'bg-dark-border/30' : '']" class="hover:bg-dark-border/20 transition-colors cursor-pointer" @click="togglePlayerExpanded(player)">
                    <td class="px-3 py-3">
                      <span class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-dark-border text-dark-textMuted">{{ player.categoryRank }}</span>
                    </td>
                    <td class="px-3 py-3">
                      <div class="flex items-center gap-3">
                        <div class="relative">
                          <div class="w-10 h-10 rounded-full bg-dark-border overflow-hidden ring-2" :class="getAvatarRingClass(player)">
                            <img :src="player.headshot || defaultHeadshot" :alt="player.full_name" class="w-full h-full object-cover" @error="handleImageError" />
                          </div>
                          <div v-if="isMyPlayer(player)" class="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
                            <span class="text-xs text-gray-900 font-bold">★</span>
                          </div>
                          <div v-else-if="isFreeAgent(player)" class="absolute -top-1 -right-1 w-5 h-5 bg-cyan-400 rounded-full flex items-center justify-center shadow-lg">
                            <span class="text-xs text-gray-900 font-bold">+</span>
                          </div>
                        </div>
                        <div>
                          <span class="font-semibold" :class="getPlayerNameClass(player)">{{ player.full_name }}</span>
                          <div class="flex items-center gap-2 text-xs text-dark-textMuted">
                            <span>{{ player.mlb_team || 'FA' }}</span>
                            <span class="text-dark-border">•</span>
                            <template v-if="player.fantasy_team">
                              <span class="flex items-center gap-1" :class="isMyPlayer(player) ? 'text-yellow-400' : ''">
                                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
                                {{ player.fantasy_team }}
                              </span>
                            </template>
                            <span v-else class="text-cyan-400 font-medium">Free Agent</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td class="px-2 py-3 text-center">
                      <span class="px-2 py-1 rounded text-xs font-bold" :class="getPositionClass(player.position)">{{ player.position?.split(',')[0] }}</span>
                    </td>
                    <td class="px-2 py-3 text-center">
                      <span class="text-lg font-bold text-yellow-400">{{ formatStatValue(player.projectedValue) }}</span>
                    </td>
                    <td class="px-2 py-3 text-center text-dark-text font-medium">{{ formatStatValue(player.currentValue) }}</td>
                    <td class="px-2 py-3 text-center text-dark-textMuted">{{ formatStatValue(player.perGameValue, 3) }}</td>
                    <td class="px-2 py-3 text-center">
                      <div class="flex flex-col items-center gap-1">
                        <span class="text-lg font-black" :class="getValueClass(player.overallValue)">{{ player.overallValue?.toFixed(1) || '-' }}</span>
                        <div class="flex items-center gap-0.5">
                          <span v-for="i in 5" :key="i" class="w-1.5 h-1.5 rounded-full" :class="i <= Math.ceil(player.overallValue / 20) ? getValueDotClass(player.overallValue) : 'bg-dark-border'"></span>
                        </div>
                      </div>
                    </td>
                  </tr>
                </template>
                <tr v-if="gatedSortedPlayers.length === 0"><td colspan="7" class="px-4 py-8 text-center text-dark-textMuted">No players match filters</td></tr>
              </tbody>
            </table>
            
            <!-- Gated players overlay -->
            <div v-if="hiddenPlayersCount > 0" class="relative">
              <div class="blur-sm select-none pointer-events-none opacity-50 border-t border-dark-border/30">
                <div v-for="i in Math.min(hiddenPlayersCount, 3)" :key="'player-preview-' + i" class="flex items-center gap-4 px-4 py-3 border-b border-dark-border/20">
                  <div class="w-8 h-8 rounded-full bg-dark-border/50"></div>
                  <div class="w-10 h-10 rounded-full bg-dark-border/50"></div>
                  <div class="flex-1"><div class="h-4 w-32 bg-dark-border/50 rounded mb-1"></div><div class="h-3 w-20 bg-dark-border/40 rounded"></div></div>
                  <div class="h-6 w-16 bg-dark-border/40 rounded"></div>
                </div>
              </div>
              <div class="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-dark-bg via-dark-bg/95 to-transparent">
                <div class="text-center p-6">
                  <div class="text-4xl mb-3">🔒</div>
                  <h3 class="text-lg font-bold text-dark-text mb-2">{{ hiddenPlayersCount }} More Players</h3>
                  <p class="text-sm text-dark-textMuted mb-4">Unlock full category rankings</p>
                  <button @click="$router.push('/pricing')" class="px-6 py-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-gray-900 font-bold rounded-lg transition-all transform hover:scale-105">Go Ultimate - $4.99/mo</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Your Team's Category Strength -->
      <div v-if="myTeamKey" class="card">
        <div class="card-header">
          <div class="flex items-center gap-2"><span class="text-2xl">💪</span><h2 class="card-title">Your Team's {{ selectedCategoryInfo?.display_name }} Strength</h2></div>
        </div>
        <div class="card-body">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="text-center p-4 rounded-xl bg-dark-border/20">
              <div class="text-sm text-dark-textMuted mb-1">Team Projected Total</div>
              <div class="text-3xl font-black text-yellow-400">{{ formatStatValue(myTeamProjectedTotal) }}</div>
            </div>
            <div class="text-center p-4 rounded-xl bg-dark-border/20">
              <div class="text-sm text-dark-textMuted mb-1">League Rank</div>
              <div class="text-3xl font-black" :class="myTeamRank <= 3 ? 'text-green-400' : myTeamRank >= 10 ? 'text-red-400' : 'text-dark-text'">#{{ myTeamRank }}</div>
            </div>
            <div class="text-center p-4 rounded-xl bg-dark-border/20">
              <div class="text-sm text-dark-textMuted mb-1">Top Contributor</div>
              <div class="text-lg font-bold text-dark-text">{{ topContributor?.full_name || 'N/A' }}</div>
              <div class="text-sm text-yellow-400">{{ formatStatValue(topContributor?.projectedValue) }}</div>
            </div>
          </div>
          <div class="mt-6">
            <h3 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-3">Your Roster ({{ selectedCategoryInfo?.display_name }})</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <div v-for="player in myPlayersInCategory.slice(0, 12)" :key="player.player_key" class="bg-dark-border/30 rounded-lg p-3 text-center hover:bg-dark-border/50 transition-colors cursor-pointer" @click="togglePlayerExpanded(player)">
                <div class="w-10 h-10 rounded-full bg-dark-border overflow-hidden mx-auto mb-2 ring-2 ring-yellow-400"><img :src="player.headshot || defaultHeadshot" :alt="player.full_name" class="w-full h-full object-cover" @error="handleImageError" /></div>
                <div class="text-sm font-medium text-dark-text truncate">{{ player.full_name?.split(' ').pop() }}</div>
                <div class="text-xs text-dark-textMuted">{{ player.position?.split(',')[0] }}</div>
                <div class="text-sm font-bold text-yellow-400 mt-1">{{ formatStatValue(player.projectedValue) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </template>

      <!-- TEAMS TAB -->
      <template v-if="activeTab === 'teams'">
        <!-- Teams View Content -->
        <div class="space-y-6">
          <!-- League Category Summary -->
          <div class="card bg-gradient-to-r from-green-500/10 to-purple-500/10 border-green-500/30">
            <div class="card-body py-4">
              <div class="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 class="text-lg font-bold text-dark-text">Team Analysis</h2>
                  <p class="text-sm text-dark-textMuted">{{ displayCategories.length }} scoring categories • {{ teamsData.length }} teams</p>
                </div>
                <div class="flex gap-6">
                  <div class="text-center">
                    <div class="text-2xl font-bold text-green-400">{{ hittingCategories.length }}</div>
                    <div class="text-xs text-dark-textMuted">Hitting</div>
                  </div>
                  <div class="text-center">
                    <div class="text-2xl font-bold text-purple-400">{{ pitchingCategories.length }}</div>
                    <div class="text-xs text-dark-textMuted">Pitching</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- View Toggle -->
          <div class="flex items-center gap-2">
            <button 
              @click="teamsViewMode = 'grid'" 
              :class="teamsViewMode === 'grid' ? 'bg-yellow-400 text-gray-900' : 'bg-dark-card text-dark-textMuted hover:bg-dark-border'"
              class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            >
              <span class="mr-2">◻️</span> Grid View
            </button>
            <button 
              @click="teamsViewMode = 'table'" 
              :class="teamsViewMode === 'table' ? 'bg-yellow-400 text-gray-900' : 'bg-dark-card text-dark-textMuted hover:bg-dark-border'"
              class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            >
              <span class="mr-2">📊</span> Table View
            </button>
          </div>

          <!-- Team Cards Grid View -->
          <div v-if="teamsViewMode === 'grid'" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <div 
              v-for="team in gatedRankedTeams" 
              :key="team.team_key"
              @click="toggleTeamExpanded(team)"
              class="card hover:ring-2 hover:ring-yellow-400/50 transition-all cursor-pointer"
              :class="[
                team.is_my_team ? 'ring-2 ring-yellow-400/50 bg-yellow-500/5' : '',
                expandedTeamKey === team.team_key ? 'ring-2 ring-primary' : ''
              ]"
            >
              <div class="card-body">
                <!-- Team Header -->
                <div class="flex items-center gap-4 mb-4">
                  <div class="relative">
                    <div class="w-14 h-14 rounded-xl bg-dark-border overflow-hidden ring-2" :class="team.is_my_team ? 'ring-yellow-400' : 'ring-dark-border'">
                      <img :src="team.logo || defaultLogo" :alt="team.name" class="w-full h-full object-cover" @error="handleLogoError" />
                    </div>
                    <div v-if="team.is_my_team" class="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
                      <span class="text-xs text-gray-900 font-bold">★</span>
                    </div>
                  </div>
                  <div class="flex-1 min-w-0">
                    <h3 class="font-bold text-dark-text truncate">{{ team.name }}</h3>
                    <p class="text-sm text-dark-textMuted">{{ team.manager_name }}</p>
                  </div>
                  <div class="text-right">
                    <div class="text-3xl font-black" :class="getTeamGradeColorClass(team.overallGrade)">{{ team.overallGrade }}</div>
                    <div class="text-xs text-dark-textMuted">Overall</div>
                  </div>
                </div>

                <!-- Strategy Tag -->
                <div class="mb-4">
                  <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium" :class="getStrategyClass(team.strategy)">
                    <span>{{ getStrategyIcon(team.strategy) }}</span>
                    {{ team.strategy }}
                  </span>
                </div>

                <!-- Category Heatmap -->
                <div class="mb-4">
                  <div class="text-xs text-dark-textMuted mb-2 font-medium">Category Performance</div>
                  <div class="flex flex-wrap gap-1">
                    <div 
                      v-for="cat in displayCategories" 
                      :key="cat.stat_id"
                      :title="`${cat.display_name}: Rank #${team.categoryRanks?.[cat.stat_id] || '-'}`"
                      class="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold"
                      :class="getCategoryHeatmapClass(team.categoryRanks?.[cat.stat_id])"
                    >
                      {{ cat.display_name?.substring(0, 2) }}
                    </div>
                  </div>
                  <!-- Heatmap Legend -->
                  <div class="flex items-center gap-2 mt-2 text-[10px] text-dark-textMuted">
                    <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-green-500"></span> Top 3</span>
                    <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-yellow-500"></span> Mid</span>
                    <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-red-500"></span> Bottom 3</span>
                  </div>
                </div>

                <!-- Quick Stats -->
                <div class="grid grid-cols-3 gap-2 text-center">
                  <div class="bg-dark-border/30 rounded-lg p-2">
                    <div class="text-lg font-bold text-green-400">{{ team.top3Count || 0 }}</div>
                    <div class="text-[10px] text-dark-textMuted">Top 3</div>
                  </div>
                  <div class="bg-dark-border/30 rounded-lg p-2">
                    <div class="text-lg font-bold text-yellow-400">{{ team.middleCount || 0 }}</div>
                    <div class="text-[10px] text-dark-textMuted">Middle</div>
                  </div>
                  <div class="bg-dark-border/30 rounded-lg p-2">
                    <div class="text-lg font-bold text-red-400">{{ team.bottom3Count || 0 }}</div>
                    <div class="text-[10px] text-dark-textMuted">Bottom 3</div>
                  </div>
                </div>

                <!-- Strengths & Weaknesses -->
                <div class="mt-4 pt-4 border-t border-dark-border">
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <div class="text-[10px] text-dark-textMuted uppercase tracking-wider mb-1">Strongest</div>
                      <div class="flex flex-wrap gap-1">
                        <span v-for="cat in (team.strongestCategories || []).slice(0, 3)" :key="cat" class="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs font-medium">
                          {{ cat }}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div class="text-[10px] text-dark-textMuted uppercase tracking-wider mb-1">Weakest</div>
                      <div class="flex flex-wrap gap-1">
                        <span v-for="cat in (team.weakestCategories || []).slice(0, 3)" :key="cat" class="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs font-medium">
                          {{ cat }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Expand Indicator -->
                <div class="mt-4 text-center">
                  <span class="text-xs text-dark-textMuted">Click to view details</span>
                </div>
              </div>
            </div>
            
            <!-- Gated teams grid overlay -->
            <div v-if="hiddenTeamsCount > 0" class="col-span-full relative">
              <div class="blur-sm select-none pointer-events-none opacity-50 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <div v-for="i in Math.min(hiddenTeamsCount, 3)" :key="'team-preview-' + i" class="card">
                  <div class="card-body">
                    <div class="flex items-center gap-4">
                      <div class="w-14 h-14 rounded-xl bg-dark-border/50"></div>
                      <div class="flex-1"><div class="h-4 w-24 bg-dark-border/50 rounded mb-2"></div><div class="h-3 w-16 bg-dark-border/40 rounded"></div></div>
                      <div class="h-12 w-12 bg-dark-border/40 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-dark-bg via-dark-bg/95 to-transparent">
                <div class="text-center p-6">
                  <div class="text-4xl mb-3">🔒</div>
                  <h3 class="text-lg font-bold text-dark-text mb-2">{{ hiddenTeamsCount }} More Teams</h3>
                  <p class="text-sm text-dark-textMuted mb-4">Unlock full team analysis</p>
                  <button @click="$router.push('/pricing')" class="px-6 py-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-gray-900 font-bold rounded-lg transition-all transform hover:scale-105">Go Ultimate - $4.99/mo</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Table View -->
          <div v-if="teamsViewMode === 'table'" class="card">
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead class="bg-dark-border/30">
                  <tr>
                    <th class="text-left py-3 px-4 text-dark-textMuted font-medium text-sm">Team</th>
                    <th class="text-center py-3 px-2 text-dark-textMuted font-medium text-sm">Grade</th>
                    <th class="text-center py-3 px-2 text-dark-textMuted font-medium text-sm">Strategy</th>
                    <th v-for="cat in displayCategories" :key="cat.stat_id" class="text-center py-3 px-1 text-dark-textMuted font-medium text-xs" :title="cat.name">
                      {{ cat.display_name }}
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-dark-border/30">
                  <tr 
                    v-for="team in gatedRankedTeams" 
                    :key="team.team_key" 
                    class="hover:bg-dark-border/20 cursor-pointer"
                    :class="team.is_my_team ? 'bg-yellow-500/10' : ''"
                    @click="toggleTeamExpanded(team)"
                  >
                    <td class="py-3 px-4">
                      <div class="flex items-center gap-3">
                        <img :src="team.logo || defaultLogo" class="w-8 h-8 rounded-lg" @error="handleLogoError" />
                        <div>
                          <div class="font-medium text-dark-text flex items-center gap-2">
                            {{ team.name }}
                            <span v-if="team.is_my_team" class="text-yellow-400">★</span>
                          </div>
                          <div class="text-xs text-dark-textMuted">{{ team.manager_name }}</div>
                        </div>
                      </div>
                    </td>
                    <td class="py-3 px-2 text-center">
                      <span class="text-xl font-black" :class="getTeamGradeColorClass(team.overallGrade)">{{ team.overallGrade }}</span>
                    </td>
                    <td class="py-3 px-2 text-center">
                      <span class="px-2 py-0.5 rounded text-xs font-medium" :class="getStrategyClass(team.strategy)">
                        {{ team.strategy }}
                      </span>
                    </td>
                    <td v-for="cat in displayCategories" :key="cat.stat_id" class="py-3 px-1 text-center">
                      <span class="w-7 h-7 inline-flex items-center justify-center rounded text-xs font-bold" :class="getCategoryHeatmapClass(team.categoryRanks?.[cat.stat_id])">
                        {{ team.categoryRanks?.[cat.stat_id] || '-' }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
              
              <!-- Gated teams table overlay -->
              <div v-if="hiddenTeamsCount > 0" class="relative">
                <div class="blur-sm select-none pointer-events-none opacity-50 border-t border-dark-border/30">
                  <div v-for="i in Math.min(hiddenTeamsCount, 3)" :key="'team-table-preview-' + i" class="flex items-center gap-4 px-4 py-3 border-b border-dark-border/20">
                    <div class="w-8 h-8 rounded-lg bg-dark-border/50"></div>
                    <div class="flex-1 h-4 bg-dark-border/50 rounded"></div>
                    <div class="h-8 w-8 bg-dark-border/40 rounded"></div>
                  </div>
                </div>
                <div class="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-dark-bg via-dark-bg/95 to-transparent">
                  <div class="text-center p-6">
                    <div class="text-4xl mb-3">🔒</div>
                    <h3 class="text-lg font-bold text-dark-text mb-2">{{ hiddenTeamsCount }} More Teams</h3>
                    <p class="text-sm text-dark-textMuted mb-4">Unlock full team analysis</p>
                    <button @click="$router.push('/pricing')" class="px-6 py-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-gray-900 font-bold rounded-lg transition-all transform hover:scale-105">Go Ultimate - $4.99/mo</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- START/SIT TAB -->
      <template v-if="activeTab === 'startsit'">
        <div class="space-y-5">
          
          <!-- 📅 DAILY COMMAND CENTER HEADER -->
          <div class="card bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-blue-500/10 border-purple-500/30">
            <div class="card-body py-4">
              <div class="flex items-center justify-between flex-wrap gap-4">
                <!-- Matchup Status -->
                <div class="flex items-center gap-6">
                  <div>
                    <div class="text-xs text-dark-textMuted uppercase mb-1">📅 {{ formatStartSitDate }}</div>
                    <div class="flex items-center gap-3">
                      <div class="text-right">
                        <div class="font-bold text-dark-text text-sm">{{ myTeamName }}</div>
                        <div class="text-2xl font-black text-green-400">{{ matchupWins }}</div>
                      </div>
                      <div class="text-dark-textMuted font-bold text-sm">vs</div>
                      <div class="text-left">
                        <div class="font-bold text-dark-text text-sm">{{ opponentName }}</div>
                        <div class="text-2xl font-black text-red-400">{{ matchupLosses }}</div>
                      </div>
                      <div class="text-center ml-2">
                        <div class="text-xs text-dark-textMuted">Tied</div>
                        <div class="text-xl font-black text-yellow-400">{{ matchupTies }}</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- Category Pills -->
                <div class="flex items-center gap-4">
                  <div class="flex flex-wrap gap-1.5">
                    <span 
                      v-for="cat in displayCategories" 
                      :key="cat.stat_id"
                      class="px-2 py-1 rounded text-xs font-bold"
                      :class="getCategoryMatchupClass(cat.stat_id)"
                      :title="getCategoryMatchupTooltip(cat.stat_id)"
                    >
                      {{ cat.display_name }}
                    </span>
                  </div>
                  <button
                    @click="showMatchupAnalysisModal = true"
                    class="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors font-semibold text-sm flex items-center gap-2 whitespace-nowrap"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Analyze Matchup
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- CONTROLS BAR -->
          <div class="card">
            <div class="card-body py-3">
              <div class="flex items-center justify-between flex-wrap gap-3">
                <!-- Date Selector -->
                <div class="flex items-center gap-2">
                  <span class="text-xs text-dark-textMuted uppercase">Date:</span>
                  <div class="flex rounded-lg overflow-hidden border border-dark-border/50">
                    <button @click="startSitDay = 'today'" :class="startSitDay === 'today' ? 'bg-yellow-400 text-gray-900' : 'bg-dark-card text-dark-textMuted'" class="px-3 py-1.5 text-xs font-semibold transition-colors">Today</button>
                    <button @click="startSitDay = 'tomorrow'" :class="startSitDay === 'tomorrow' ? 'bg-yellow-400 text-gray-900' : 'bg-dark-card text-dark-textMuted'" class="px-3 py-1.5 text-xs font-semibold transition-colors">Tomorrow</button>
                  </div>
                  <span class="text-xs text-yellow-400 font-mono">{{ requestedGameDate }}</span>
                </div>

                <!-- View Selector -->
                <div class="flex items-center gap-2">
                  <span class="text-xs text-dark-textMuted uppercase">View:</span>
                  <div class="flex rounded-lg overflow-hidden border border-dark-border/50">
                    <button @click="commandCenterView = 'lineup'" :class="commandCenterView === 'lineup' ? 'bg-yellow-400 text-gray-900' : 'bg-dark-card text-dark-textMuted'" class="px-3 py-1.5 text-xs font-semibold transition-colors">🏆 Lineup</button>
                    <button @click="commandCenterView = 'available'" :class="commandCenterView === 'available' ? 'bg-yellow-400 text-gray-900' : 'bg-dark-card text-dark-textMuted'" class="px-3 py-1.5 text-xs font-semibold transition-colors">📊 Available</button>
                    <button @click="commandCenterView = 'moves'" :class="commandCenterView === 'moves' ? 'bg-yellow-400 text-gray-900' : 'bg-dark-card text-dark-textMuted'" class="px-3 py-1.5 text-xs font-semibold transition-colors">💡 Smart Moves</button>
                  </div>
                </div>

              </div>
            </div>
          </div>

          <!-- MAIN CONTENT AREA -->
          <!-- VIEW 1: OPTIMAL LINEUP -->
          <template v-if="commandCenterView === 'lineup'">
            <div class="card">
              <div class="card-header">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-2xl">🏆</span>
                    <div>
                      <h2 class="text-xl font-bold text-dark-text">Today's Optimal Lineup</h2>
                      <p class="text-xs text-dark-textMuted">Auto-optimized based on matchup needs</p>
                    </div>
                  </div>
                  <button 
                    @click="downloadSuggestedCategoryLineup"
                    class="px-3 py-2 text-sm font-medium bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors flex items-center gap-2"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export
                  </button>
                </div>
              </div>
              <div class="card-body p-0">
                <!-- Flat List - Each Roster Position as Individual Row -->
                <div class="divide-y divide-dark-border/20">
                  <template v-for="(slot, idx) in modifiedSuggestedLineup" :key="idx">
                    <!-- Skip bench slots -->
                    <div 
                      v-if="slot.position !== 'BN' && slot.position !== 'Bench'"
                      class="flex items-center gap-3 px-4 py-3 hover:bg-dark-border/10 transition-colors"
                    >
                      <!-- Position Label (Left Side) -->
                      <div class="flex-shrink-0 w-12">
                        <span class="px-2 py-1 rounded text-xs font-bold uppercase inline-block" :class="getStartSitPositionClass(slot.position)">
                          {{ slot.position }}
                        </span>
                      </div>
                      
                      <template v-if="slot.player">
                        <!-- Player Avatar -->
                        <div class="w-10 h-10 rounded-full bg-dark-border overflow-hidden flex-shrink-0">
                          <img :src="slot.player.headshot || defaultHeadshot" class="w-full h-full object-cover" @error="handleImageError" />
                        </div>
                        
                        <!-- Player Info -->
                        <div class="flex-1 min-w-0">
                          <div class="font-semibold text-dark-text text-sm">{{ slot.player.full_name }}</div>
                          <div class="flex items-center gap-2 text-xs">
                            <span :class="slot.player.hasGame ? 'text-green-400' : 'text-red-400'">
                              {{ slot.player.hasGame ? `vs ${slot.player.opponent}` : 'No game' }}
                            </span>
                            <span class="text-dark-textMuted">•</span>
                            <span class="text-dark-textMuted">{{ slot.player.mlb_team || slot.player.nba_team || slot.player.nhl_team }}</span>
                          </div>
                        </div>
                        
                        <!-- Value Score -->
                        <div class="text-right flex-shrink-0 px-2">
                          <div class="text-base font-bold text-yellow-400">{{ slot.player.overallValue?.toFixed(0) || 'N/A' }}</div>
                          <div class="text-[9px] text-dark-textMuted uppercase">Value</div>
                        </div>
                        
                        <!-- Game Status Dot -->
                        <div class="w-2 h-2 rounded-full flex-shrink-0" :class="slot.player.hasGame ? 'bg-green-400' : 'bg-red-400/50'"></div>
                      </template>
                      <template v-else>
                        <!-- Empty Slot -->
                        <div class="w-10 h-10 rounded-full bg-dark-border/30 flex-shrink-0"></div>
                        <div class="flex-1">
                          <span class="text-dark-textMuted italic text-sm">Empty slot</span>
                        </div>
                        <button class="px-3 py-1 text-xs bg-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/30 transition-colors" @click="openPositionPicker(slot.position)">
                          Find Player
                        </button>
                      </template>
                    </div>
                  </template>
                </div>
                
                <!-- Bench Section -->
                <div v-if="benchPlayers.length > 0" class="border-t-2 border-dark-border">
                  <div class="px-4 py-2 bg-dark-border/10 flex items-center justify-between">
                    <span class="text-xs font-bold text-dark-textMuted uppercase">Bench ({{ benchPlayers.length }})</span>
                    <span class="text-xs text-dark-textMuted">{{ benchPlayers.filter(p => p.hasGame).length }} have games</span>
                  </div>
                  <div class="divide-y divide-dark-border/20 max-h-48 overflow-y-auto">
                    <div 
                      v-for="player in benchPlayers" 
                      :key="player.player_key" 
                      class="flex items-center gap-3 px-4 py-2 hover:bg-dark-border/10"
                    >
                      <div class="w-8 h-8 rounded-full bg-dark-border overflow-hidden">
                        <img :src="player.headshot || defaultHeadshot" class="w-full h-full object-cover" @error="handleImageError" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="font-medium text-dark-text text-sm">{{ player.full_name }}</div>
                        <div class="text-xs text-dark-textMuted">{{ player.position?.split(',')[0] }}</div>
                      </div>
                      <div class="text-right">
                        <span v-if="player.hasGame" class="text-xs text-green-400">{{ player.opponent }}</span>
                        <span v-else class="text-xs text-red-400 italic">No game</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- VIEW 2: AVAILABLE IMPACT PLAYERS -->
          <template v-if="commandCenterView === 'available'">
            <div class="card">
              <div class="card-header">
                <div class="flex items-center gap-2">
                  <span class="text-2xl">📊</span>
                  <div>
                    <h2 class="text-xl font-bold text-dark-text">Available Players</h2>
                    <p class="text-xs text-dark-textMuted">Free agents with games {{ startSitDay === 'today' ? 'today' : 'tomorrow' }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <!-- Time Period Dropdown -->
                  <div class="relative">
                    <select 
                      v-model="availableTimePeriod" 
                      class="bg-dark-border border border-dark-border/50 rounded-lg px-3 py-2 text-sm text-dark-text appearance-none pr-8 cursor-pointer"
                    >
                      <optgroup label="📈 PROJECTIONS">
                        <option value="today">Today</option>
                        <option value="next7">Next 7 Days</option>
                        <option value="next14">Next 14 Days</option>
                        <option value="ros">Rest of Season</option>
                      </optgroup>
                      <optgroup label="📊 STATS">
                        <option value="last7">Last 7 Days</option>
                        <option value="last14">Last 14 Days</option>
                        <option value="season">Season</option>
                      </optgroup>
                    </select>
                  </div>
                  
                  <!-- Position Filter -->
                  <select v-model="selectedStartSitPosition" class="bg-dark-border border border-dark-border/50 rounded-lg px-3 py-2 text-sm text-dark-text">
                    <option value="All">All Positions</option>
                    <option v-for="pos in startSitPositions" :key="pos.id" :value="pos.id">{{ pos.label }}</option>
                  </select>
                </div>
              </div>
              <div class="card-body p-0">
                <div class="overflow-x-auto">
                  <table class="w-full">
                    <thead class="bg-dark-border/30 sticky top-0 z-10">
                      <tr>
                        <th 
                          @click="toggleAvailableSort('name')"
                          class="px-4 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase cursor-pointer hover:bg-dark-border/50 transition-colors"
                        >
                          <div class="flex items-center gap-1">
                            Player
                            <span v-if="availableSortColumn === 'name'" class="text-xs">
                              {{ availableSortDirection === 'asc' ? '↑' : '↓' }}
                            </span>
                          </div>
                        </th>
                        <th 
                          @click="toggleAvailableSort('matchup')"
                          class="px-3 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-20 cursor-pointer hover:bg-dark-border/50 transition-colors"
                        >
                          <div class="flex items-center justify-center gap-1">
                            Matchup
                            <span v-if="availableSortColumn === 'matchup'" class="text-xs">
                              {{ availableSortDirection === 'asc' ? '↑' : '↓' }}
                            </span>
                          </div>
                        </th>
                        <th 
                          v-for="cat in relevantStartSitCategories" 
                          :key="cat.stat_id"
                          @click="toggleAvailableSort(cat.stat_id)"
                          class="px-2 py-3 text-center text-xs font-semibold uppercase w-14 cursor-pointer hover:bg-dark-border/50 transition-colors"
                          :class="getCategoryHeaderClass(cat.stat_id)"
                        >
                          <div class="flex items-center justify-center gap-1">
                            {{ cat.display_name }}
                            <span v-if="availableSortColumn === cat.stat_id" class="text-xs">
                              {{ availableSortDirection === 'asc' ? '↑' : '↓' }}
                            </span>
                          </div>
                        </th>
                        <th 
                          @click="toggleAvailableSort('value')"
                          class="px-3 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-28 cursor-pointer hover:bg-dark-border/50 transition-colors"
                        >
                          <div class="flex items-center justify-center gap-1">
                            Value
                            <span v-if="availableSortColumn === 'value'" class="text-xs">
                              {{ availableSortDirection === 'asc' ? '↑' : '↓' }}
                            </span>
                          </div>
                        </th>
                        <th class="px-3 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-24">Action</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-dark-border/30">
                      <tr 
                        v-for="(player, idx) in sortedAvailableFreeAgents" 
                        :key="player.player_key"
                        class="hover:bg-dark-border/20 transition-colors"
                      >
                        <td class="px-4 py-3">
                          <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-dark-border overflow-hidden">
                              <img :src="player.headshot || defaultHeadshot" class="w-full h-full object-cover" @error="handleImageError" />
                            </div>
                            <div>
                              <div class="font-semibold text-dark-text">{{ player.full_name }}</div>
                              <div class="text-xs text-dark-textMuted">{{ player.mlb_team }} • {{ player.position }}</div>
                            </div>
                          </div>
                        </td>
                        <td class="px-3 py-3 text-center">
                          <span class="text-xs font-medium" :class="getMatchupDifficultyClass(player)">{{ player.opponent }}</span>
                        </td>
                        <td 
                          v-for="cat in relevantStartSitCategories" 
                          :key="cat.stat_id" 
                          class="px-2 py-3 text-center"
                        >
                          <span class="text-sm font-bold" :class="getCategoryProjectionClass(player, cat)">
                            {{ formatCategoryProjection(player, cat) }}
                          </span>
                        </td>
                        <td class="px-3 py-3 text-center">
                          <div class="text-xl font-black text-yellow-400">{{ player.overallValue?.toFixed(0) || 'N/A' }}</div>
                        </td>
                        <td class="px-3 py-3 text-center">
                          <button 
                            @click="openPlayerAnalysis(player)"
                            class="px-3 py-1.5 text-xs font-semibold bg-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/30 transition-colors"
                          >
                            Analyze
                          </button>
                        </td>
                      </tr>
                      <tr v-if="availableFreeAgents.length === 0">
                        <td :colspan="6 + relevantStartSitCategories.length" class="px-4 py-8 text-center text-dark-textMuted">
                          No free agents found with games {{ startSitDay === 'today' ? 'today' : 'tomorrow' }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </template>

          <!-- VIEW 3: SMART WAIVER RECOMMENDATIONS -->
          <template v-if="commandCenterView === 'moves'">
            <div class="space-y-4">
              <!-- Recommendations List -->
              <div class="card">
                <div class="card-header">
                  <div class="flex items-center gap-2">
                    <span class="text-2xl">💡</span>
                    <div>
                      <h2 class="text-xl font-bold text-dark-text">Smart Waiver Recommendations</h2>
                      <p class="text-xs text-dark-textMuted">AI-powered move suggestions based on today's matchups</p>
                    </div>
                  </div>
                </div>
                <div class="card-body p-4">
                  <div class="space-y-3">
                    <!-- Top Recommendation -->
                    <div v-for="(rec, idx) in smartWaiverRecommendations.slice(0, 5)" :key="idx" 
                      class="bg-gradient-to-r from-green-500/10 to-cyan-500/10 border border-green-500/30 rounded-xl p-4">
                      <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center gap-2">
                          <span class="text-2xl">{{ idx === 0 ? '🔥' : idx === 1 ? '⭐' : '📈' }}</span>
                          <span class="text-sm font-bold text-green-400">Suggestion #{{ idx + 1 }}</span>
                          <span v-if="idx === 0" class="px-2 py-0.5 bg-green-500/30 text-green-400 rounded text-[10px] font-bold">BEST MOVE</span>
                        </div>
                        <span class="text-xs text-dark-textMuted">{{ rec.confidence }}% confidence</span>
                      </div>
                      
                      <div class="grid grid-cols-2 gap-4 mb-3">
                        <!-- Add Player -->
                        <div class="bg-dark-elevated rounded-lg p-3 border-l-2 border-green-400">
                          <div class="text-xs text-green-400 font-bold mb-2">➕ ADD</div>
                          <div class="flex items-center gap-2 mb-2">
                            <div class="w-10 h-10 rounded-full bg-dark-border overflow-hidden">
                              <img :src="rec.addPlayer.headshot || defaultHeadshot" class="w-full h-full object-cover" @error="handleImageError" />
                            </div>
                            <div>
                              <div class="font-bold text-dark-text text-sm">{{ rec.addPlayer.full_name }}</div>
                              <div class="text-xs text-dark-textMuted">{{ rec.addPlayer.position }} • {{ rec.addPlayer.mlb_team }}</div>
                            </div>
                          </div>
                          <div class="text-xs text-dark-textMuted">vs {{ rec.addPlayer.opponent }} {{ startSitDay === 'today' ? 'today' : 'tomorrow' }}</div>
                        </div>
                        
                        <!-- Drop Player -->
                        <div class="bg-dark-elevated rounded-lg p-3 border-l-2 border-red-400">
                          <div class="text-xs text-red-400 font-bold mb-2">➖ DROP</div>
                          <div class="flex items-center gap-2 mb-2">
                            <div class="w-10 h-10 rounded-full bg-dark-border overflow-hidden">
                              <img :src="rec.dropPlayer.headshot || defaultHeadshot" class="w-full h-full object-cover" @error="handleImageError" />
                            </div>
                            <div>
                              <div class="font-bold text-dark-text text-sm">{{ rec.dropPlayer.full_name }}</div>
                              <div class="text-xs text-dark-textMuted">{{ rec.dropPlayer.position }} • {{ rec.dropPlayer.mlb_team }}</div>
                            </div>
                          </div>
                          <div class="text-xs text-dark-textMuted">{{ rec.dropPlayer.hasGame ? `vs ${rec.dropPlayer.opponent}` : 'No game today' }}</div>
                        </div>
                      </div>
                      
                      <!-- Impact Analysis -->
                      <div class="grid grid-cols-2 gap-4 mb-3">
                        <div class="bg-dark-card rounded-lg p-2">
                          <div class="text-[10px] text-dark-textMuted uppercase mb-1">Impact Today</div>
                          <div class="text-lg font-black" :class="rec.todayImpact >= 0 ? 'text-green-400' : 'text-red-400'">
                            {{ rec.todayImpact >= 0 ? '+' : '' }}{{ rec.todayImpact }} cats
                          </div>
                        </div>
                        <div class="bg-dark-card rounded-lg p-2">
                          <div class="text-[10px] text-dark-textMuted uppercase mb-1">Impact ROS</div>
                          <div class="text-lg font-black" :class="rec.rosImpact >= 0 ? 'text-green-400' : 'text-red-400'">
                            {{ rec.rosImpact >= 0 ? '+' : '' }}{{ rec.rosImpact }}
                          </div>
                        </div>
                      </div>
                      
                      <!-- Explanation -->
                      <div class="bg-dark-card rounded-lg p-3 mb-3">
                        <div class="text-xs font-semibold text-dark-text mb-1">Why this move?</div>
                        <div class="text-xs text-dark-textMuted">{{ rec.reasoning }}</div>
                      </div>
                      
                      <!-- Actions -->
                      <button 
                        @click="openPlayerComparison(rec.addPlayer, rec.dropPlayer)"
                        class="w-full px-4 py-2 bg-cyan-500 text-gray-900 font-semibold rounded-lg hover:bg-cyan-400 transition-colors"
                      >
                        Analyze Move
                      </button>
                    </div>
                    
                    <!-- No Moves Recommended -->
                    <div v-if="smartWaiverRecommendations.length === 0" class="bg-dark-card border border-dark-border rounded-xl p-6 text-center">
                      <div class="text-4xl mb-2">✓</div>
                      <div class="font-bold text-dark-text mb-1">Your lineup looks good!</div>
                      <div class="text-sm text-dark-textMuted">No beneficial waiver moves found for {{ startSitDay === 'today' ? 'today' : 'tomorrow' }}.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>


          <!-- MODAL 1: POSITION PICKER (Find Player by Position) -->
          <div v-if="showPositionPickerModal" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" @click.self="showPositionPickerModal = false">
            <div class="bg-dark-card rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden border border-dark-border shadow-2xl" @click.stop>
              <div class="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 px-6 py-4 border-b border-dark-border flex items-center justify-between">
                <div>
                  <h2 class="text-2xl font-bold text-dark-text">Find {{ positionPickerPosition }} Player</h2>
                  <p class="text-sm text-dark-textMuted mt-1">Free agents with games {{ startSitDay === 'today' ? 'today' : 'tomorrow' }}</p>
                </div>
                <button @click="showPositionPickerModal = false" class="text-dark-textMuted hover:text-dark-text transition-colors">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div class="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                <div class="overflow-x-auto">
                  <table class="w-full">
                    <thead class="bg-dark-border/30 sticky top-0 z-10">
                      <tr>
                        <th class="px-4 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase">Player</th>
                        <th class="px-3 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-20">Matchup</th>
                        <th 
                          v-for="cat in relevantStartSitCategories" 
                          :key="cat.stat_id" 
                          class="px-2 py-3 text-center text-xs font-semibold uppercase w-14"
                          :class="getCategoryHeaderClass(cat.stat_id)"
                        >
                          {{ cat.display_name }}
                        </th>
                        <th class="px-3 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-28">Impact</th>
                        <th class="px-3 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-32">Action</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-dark-border/30">
                      <tr 
                        v-for="player in getPositionFilteredPlayers(positionPickerPosition)" 
                        :key="player.player_key"
                        class="hover:bg-dark-border/20 transition-colors"
                      >
                        <td class="px-4 py-3">
                          <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-dark-border overflow-hidden">
                              <img :src="player.headshot || defaultHeadshot" class="w-full h-full object-cover" @error="handleImageError" />
                            </div>
                            <div>
                              <div class="font-semibold text-dark-text">{{ player.full_name }}</div>
                              <div class="text-xs text-dark-textMuted">{{ player.mlb_team }} • {{ player.position }}</div>
                            </div>
                          </div>
                        </td>
                        <td class="px-3 py-3 text-center">
                          <span class="text-xs font-medium text-green-400">{{ player.opponent }}</span>
                        </td>
                        <td 
                          v-for="cat in relevantStartSitCategories" 
                          :key="cat.stat_id" 
                          class="px-2 py-3 text-center"
                        >
                          <span class="text-sm font-bold" :class="getCategoryProjectionClass(player, cat)">
                            {{ formatCategoryProjection(player, cat) }}
                          </span>
                        </td>
                        <td class="px-3 py-3 text-center">
                          <div class="flex flex-col items-center">
                            <span class="text-lg font-black text-green-400">{{ player.overallValue?.toFixed(0) || 'N/A' }}</span>
                            <span class="text-[10px] text-dark-textMuted">categories</span>
                          </div>
                        </td>
                        <td class="px-3 py-3 text-center">
                          <div class="flex gap-2 justify-center">
                            <button 
                              @click="openPlayerAnalysis(player)"
                              class="px-3 py-1.5 text-xs font-semibold bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30 transition-colors"
                            >
                              Analyze
                            </button>
                            <button 
                              @click="analyzeWaiverMove(player)"
                              class="px-3 py-1.5 text-xs font-semibold bg-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/30 transition-colors"
                            >
                              Add
                            </button>
                          </div>
                        </td>
                      </tr>
                      <tr v-if="getPositionFilteredPlayers(positionPickerPosition).length === 0">
                        <td :colspan="6 + relevantStartSitCategories.length" class="px-4 py-8 text-center text-dark-textMuted">
                          No {{ positionPickerPosition }} players found with games {{ startSitDay === 'today' ? 'today' : 'tomorrow' }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <!-- MODAL 2: PLAYER ANALYSIS (Detailed Stats & Charts) -->
                    <!-- MODAL 2: ENHANCED PLAYER ANALYSIS (Premium Strategic Tool) -->
          <div v-if="showPlayerAnalysisModal && playerAnalysisData" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" @click.self="showPlayerAnalysisModal = false">
            <div class="bg-dark-card rounded-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden border border-dark-border shadow-2xl" @click.stop>
              
              <!-- Header -->
              <div class="bg-gradient-to-r from-purple-500/20 to-pink-500/20 px-6 py-4 border-b border-dark-border">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-4">
                    <div class="w-16 h-16 rounded-full bg-dark-border overflow-hidden ring-2 ring-purple-500">
                      <img :src="playerAnalysisData.headshot || defaultHeadshot" class="w-full h-full object-cover" @error="handleImageError" />
                    </div>
                    <div>
                      <h2 class="text-2xl font-bold text-dark-text">{{ playerAnalysisData.full_name }}</h2>
                      <p class="text-sm text-dark-textMuted">{{ playerAnalysisData.mlb_team }} • {{ playerAnalysisData.position }}</p>
                    </div>
                    <div class="ml-4 px-4 py-2 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
                      <div class="text-xs text-yellow-400 uppercase mb-1">Value Score</div>
                      <div class="text-2xl font-black text-yellow-400">{{ playerAnalysisData.overallValue?.toFixed(1) || 'N/A' }}</div>
                    </div>
                  </div>
                  <button @click="showPlayerAnalysisModal = false" class="text-dark-textMuted hover:text-dark-text transition-colors">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div class="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                
                <!-- Top Row: Game Info + Value Breakdown -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                  
                  <!-- Game Status -->
                  <div class="card">
                    <div class="card-header py-3">
                      <h3 class="text-lg font-bold">{{ startSitDay === 'today' ? "Today's" : "Tomorrow's" }} Game</h3>
                    </div>
                    <div class="card-body">
                      <div v-if="playerAnalysisData.hasGame" class="space-y-3">
                        <div class="flex items-center justify-between p-3 bg-dark-elevated rounded-lg">
                          <span class="text-dark-textMuted">Opponent</span>
                          <span class="font-bold text-dark-text">{{ playerAnalysisData.isHome ? 'vs' : '@' }} {{ playerAnalysisData.opponent }}</span>
                        </div>
                        <div class="flex items-center justify-between p-3 bg-dark-elevated rounded-lg">
                          <span class="text-dark-textMuted">Status</span>
                          <span class="px-2 py-1 bg-green-500/20 text-green-400 rounded text-sm font-bold">✓ Playing</span>
                        </div>
                      </div>
                      <div v-else class="p-6 text-center">
                        <div class="text-red-400 text-4xl mb-2">🔴</div>
                        <div class="font-bold text-dark-text">No Game {{ startSitDay === 'today' ? 'Today' : 'Tomorrow' }}</div>
                      </div>
                    </div>
                  </div>

                  <!-- Value Score Breakdown -->
                  <div class="card lg:col-span-2">
                    <div class="card-header py-3">
                      <h3 class="text-lg font-bold">Value Score Breakdown</h3>
                    </div>
                    <div class="card-body">
                      <div class="grid grid-cols-2 gap-3">
                        <div class="p-3 bg-dark-elevated rounded-lg">
                          <div class="text-xs text-dark-textMuted uppercase mb-1">Overall Value</div>
                          <div class="text-3xl font-black text-yellow-400">{{ playerAnalysisData.overallValue?.toFixed(1) || 'N/A' }}</div>
                        </div>
                        <div class="p-3 bg-dark-elevated rounded-lg">
                          <div class="text-xs text-dark-textMuted uppercase mb-1">Rank (Position)</div>
                          <div class="text-3xl font-black text-dark-text">#{{ getPlayerPositionRank(playerAnalysisData) }}</div>
                        </div>
                        <div class="p-3 bg-dark-elevated rounded-lg">
                          <div class="text-xs text-dark-textMuted uppercase mb-1">Categories Helped</div>
                          <div class="text-3xl font-black text-green-400">{{ getPlayerCategoryCount(playerAnalysisData) }}</div>
                        </div>
                        <div class="p-3 bg-dark-elevated rounded-lg">
                          <div class="text-xs text-dark-textMuted uppercase mb-1">Schedule Grade</div>
                          <div class="text-3xl font-black" :class="getScheduleGradeClass(playerAnalysisData)">{{ getPlayerScheduleGrade(playerAnalysisData) }}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Multi-Period Projections Table -->
                <div class="card mb-6">
                  <div class="card-header py-3">
                    <h3 class="text-lg font-bold">📊 Projected Performance</h3>
                  </div>
                  <div class="card-body p-0">
                    <div class="overflow-x-auto">
                      <table class="w-full">
                        <thead class="bg-dark-border/30">
                          <tr>
                            <th class="px-4 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase sticky left-0 bg-dark-border/30">Category</th>
                            <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase">Today</th>
                            <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase">Next 7 Days</th>
                            <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase">Next 14 Days</th>
                            <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase">Season Avg</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-dark-border/30">
                          <tr v-for="cat in displayCategories" :key="'proj-'+cat.stat_id" class="hover:bg-dark-border/10">
                            <td class="px-4 py-3 font-semibold text-dark-text sticky left-0 bg-dark-card">{{ cat.display_name }}</td>
                            <td class="px-4 py-3 text-center font-bold text-dark-text">{{ getPlayerProjection(playerAnalysisData, cat, 'today') }}</td>
                            <td class="px-4 py-3 text-center font-bold text-dark-text">{{ getPlayerProjection(playerAnalysisData, cat, 'next7') }}</td>
                            <td class="px-4 py-3 text-center font-bold text-dark-text">{{ getPlayerProjection(playerAnalysisData, cat, 'next14') }}</td>
                            <td class="px-4 py-3 text-center text-dark-textMuted">{{ getPlayerSeasonAvg(playerAnalysisData, cat) }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <!-- Schedule Strength Analysis -->
                <div class="card">
                  <div class="card-header py-3">
                    <h3 class="text-lg font-bold">📅 Strength of Schedule (Next 14 Days)</h3>
                  </div>
                  <div class="card-body">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div class="p-4 bg-dark-elevated rounded-lg text-center">
                        <div class="text-xs text-dark-textMuted uppercase mb-2">Total Games</div>
                        <div class="text-4xl font-black text-dark-text mb-1">{{ getPlayerUpcomingGames(playerAnalysisData, 14) }}</div>
                        <div class="text-xs text-dark-textMuted">Next 2 weeks</div>
                      </div>
                      <div class="p-4 bg-dark-elevated rounded-lg text-center">
                        <div class="text-xs text-dark-textMuted uppercase mb-2">Schedule Difficulty</div>
                        <div class="text-4xl font-black" :class="getScheduleDifficultyClass(playerAnalysisData)">
                          {{ getScheduleDifficulty(playerAnalysisData) }}
                        </div>
                        <div class="text-xs text-dark-textMuted">vs average</div>
                      </div>
                      <div class="p-4 bg-dark-elevated rounded-lg text-center">
                        <div class="text-xs text-dark-textMuted uppercase mb-2">Opportunity Score</div>
                        <div class="text-4xl font-black text-green-400">{{ getOpportunityScore(playerAnalysisData) }}</div>
                        <div class="text-xs text-dark-textMuted">Games × Difficulty</div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              <!-- Footer Actions -->
              <div class="px-6 py-4 border-t border-dark-border flex justify-between items-center">
                <div class="text-xs text-dark-textMuted">
                  💎 Premium Analysis Tool
                </div>
                <div class="flex gap-3">
                  <button @click="showPlayerAnalysisModal = false" class="px-4 py-2 bg-dark-border text-dark-textMuted rounded-lg hover:bg-dark-border/50 transition-colors font-semibold">
                    Close
                  </button>
                  <button @click="analyzeWaiverMove(playerAnalysisData); showPlayerAnalysisModal = false" class="px-4 py-2 bg-cyan-500 text-gray-900 rounded-lg hover:bg-cyan-400 transition-colors font-semibold">
                    Add to Lineup
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <!-- MODAL: SMART MOVES PLAYER COMPARISON -->
          <div v-if="showPlayerComparisonModal && comparisonPlayerAdd && comparisonPlayerDrop" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" @click.self="showPlayerComparisonModal = false">
            <div class="bg-dark-card rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto border border-dark-border shadow-2xl" @click.stop>
              
              <!-- Header -->
              <div class="bg-gradient-to-r from-green-500/20 to-red-500/20 px-6 py-4 border-b border-dark-border flex items-center justify-between">
                <div>
                  <h2 class="text-2xl font-bold text-dark-text">Compare Players</h2>
                  <p class="text-sm text-dark-textMuted mt-1">Analyze last 5 weeks performance</p>
                </div>
                <button @click="showPlayerComparisonModal = false" class="text-dark-textMuted hover:text-dark-text transition-colors">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
              
              <!-- Player Headers -->
              <div class="grid grid-cols-2 gap-4 p-6 border-b border-dark-border">
                <!-- ADD Player -->
                <div class="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                  <div class="text-xs font-semibold text-green-400 uppercase mb-2">⬆️ ADD</div>
                  <div class="flex items-center gap-3">
                    <div class="w-16 h-16 rounded-full bg-dark-border overflow-hidden">
                      <img :src="comparisonPlayerAdd.headshot || defaultHeadshot" class="w-full h-full object-cover" @error="handleImageError" />
                    </div>
                    <div class="flex-1">
                      <div class="font-bold text-dark-text">{{ comparisonPlayerAdd.full_name }}</div>
                      <div class="text-xs text-dark-textMuted">{{ comparisonPlayerAdd.position }} • {{ comparisonPlayerAdd.mlb_team || comparisonPlayerAdd.nba_team || comparisonPlayerAdd.nhl_team }}</div>
                      <div class="text-sm font-semibold text-green-400 mt-1">Value: {{ comparisonPlayerAdd.overallValue?.toFixed(0) || 'N/A' }}</div>
                    </div>
                  </div>
                </div>
                
                <!-- DROP Player -->
                <div class="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                  <div class="text-xs font-semibold text-red-400 uppercase mb-2">⬇️ DROP</div>
                  <div class="flex items-center gap-3">
                    <div class="w-16 h-16 rounded-full bg-dark-border overflow-hidden">
                      <img :src="comparisonPlayerDrop.headshot || defaultHeadshot" class="w-full h-full object-cover" @error="handleImageError" />
                    </div>
                    <div class="flex-1">
                      <div class="font-bold text-dark-text">{{ comparisonPlayerDrop.full_name }}</div>
                      <div class="text-xs text-dark-textMuted">{{ comparisonPlayerDrop.position }} • {{ comparisonPlayerDrop.mlb_team || comparisonPlayerDrop.nba_team || comparisonPlayerDrop.nhl_team }}</div>
                      <div class="text-sm font-semibold text-red-400 mt-1">Value: {{ comparisonPlayerDrop.overallValue?.toFixed(0) || 'N/A' }}</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Category Selector -->
              <div class="p-6 border-b border-dark-border">
                <label class="block text-sm font-semibold text-dark-textMuted uppercase mb-2">Select Category to Compare</label>
                <select v-model="comparisonSelectedCategory" class="w-full bg-dark-border border border-dark-border/50 rounded-lg px-4 py-3 text-dark-text">
                  <option value="">-- Choose a category --</option>
                  <option v-for="cat in displayCategories" :key="cat.stat_id" :value="cat.stat_id">
                    {{ cat.display_name }}
                  </option>
                </select>
              </div>
              
              <!-- Comparison Chart -->
              <div v-if="comparisonSelectedCategory" class="p-6">
                <div class="bg-dark-elevated rounded-xl p-6">
                  <h3 class="text-lg font-bold text-dark-text mb-4">
                    {{ displayCategories.find(c => c.stat_id === comparisonSelectedCategory)?.display_name }} - Last 5 Weeks
                  </h3>
                  
                  <!-- Line Chart Placeholder -->
                  <div class="bg-dark-card rounded-lg p-8 text-center border border-dark-border">
                    <div class="text-6xl mb-4">📊</div>
                    <div class="text-lg font-semibold text-dark-text mb-2">5-Week Trend Comparison</div>
                    <div class="text-sm text-dark-textMuted max-w-md mx-auto">
                      Line chart showing weekly performance for {{ displayCategories.find(c => c.stat_id === comparisonSelectedCategory)?.display_name }}
                      over the last 5 weeks. Green line for {{ comparisonPlayerAdd.full_name }}, Red line for {{ comparisonPlayerDrop.full_name }}.
                    </div>
                    <div class="mt-6 text-xs text-dark-textMuted italic">
                      Note: Historical weekly data would be displayed here with actual implementation
                    </div>
                  </div>
                  
                  <!-- Stats Comparison Table -->
                  <div class="mt-6 grid grid-cols-2 gap-4">
                    <div class="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                      <div class="text-xs font-semibold text-green-400 uppercase mb-2">{{ comparisonPlayerAdd.full_name }}</div>
                      <div class="space-y-2">
                        <div class="flex justify-between text-sm">
                          <span class="text-dark-textMuted">Season Avg:</span>
                          <span class="font-semibold text-dark-text">{{ getPlayerSeasonAvg(comparisonPlayerAdd, displayCategories.find(c => c.stat_id === comparisonSelectedCategory)) }}</span>
                        </div>
                        <div class="flex justify-between text-sm">
                          <span class="text-dark-textMuted">Today's Proj:</span>
                          <span class="font-semibold text-dark-text">{{ getPlayerProjection(comparisonPlayerAdd, displayCategories.find(c => c.stat_id === comparisonSelectedCategory), 'today') }}</span>
                        </div>
                        <div class="flex justify-between text-sm">
                          <span class="text-dark-textMuted">Next 7 Days:</span>
                          <span class="font-semibold text-dark-text">{{ getPlayerProjection(comparisonPlayerAdd, displayCategories.find(c => c.stat_id === comparisonSelectedCategory), 'next7') }}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                      <div class="text-xs font-semibold text-red-400 uppercase mb-2">{{ comparisonPlayerDrop.full_name }}</div>
                      <div class="space-y-2">
                        <div class="flex justify-between text-sm">
                          <span class="text-dark-textMuted">Season Avg:</span>
                          <span class="font-semibold text-dark-text">{{ getPlayerSeasonAvg(comparisonPlayerDrop, displayCategories.find(c => c.stat_id === comparisonSelectedCategory)) }}</span>
                        </div>
                        <div class="flex justify-between text-sm">
                          <span class="text-dark-textMuted">Today's Proj:</span>
                          <span class="font-semibold text-dark-text">{{ getPlayerProjection(comparisonPlayerDrop, displayCategories.find(c => c.stat_id === comparisonSelectedCategory), 'today') }}</span>
                        </div>
                        <div class="flex justify-between text-sm">
                          <span class="text-dark-textMuted">Next 7 Days:</span>
                          <span class="font-semibold text-dark-text">{{ getPlayerProjection(comparisonPlayerDrop, displayCategories.find(c => c.stat_id === comparisonSelectedCategory), 'next7') }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Close Button -->
              <div class="p-6 border-t border-dark-border">
                <button @click="showPlayerComparisonModal = false" class="w-full px-4 py-3 bg-dark-border text-dark-text font-semibold rounded-lg hover:bg-dark-border/50 transition-colors">
                  Close
                </button>
              </div>
              
            </div>
          </div>
          
          <!-- MODAL: PLAYER COMPARISON (Add vs Drop Analysis) -->
          <div v-if="showSwapModal && swapSourcePlayer" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" @click.self="showSwapModal = false">
            <div class="bg-dark-card rounded-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden border border-dark-border shadow-2xl" @click.stop>
              
              <!-- Header -->
              <div class="bg-gradient-to-r from-green-500/20 via-cyan-500/20 to-blue-500/20 px-6 py-4 border-b border-dark-border">
                <div class="flex items-center justify-between">
                  <div>
                    <h2 class="text-2xl font-bold text-dark-text">Player Comparison</h2>
                    <p class="text-sm text-dark-textMuted mt-1">Analyze the strategic impact of this move</p>
                  </div>
                  <button @click="showSwapModal = false" class="text-dark-textMuted hover:text-dark-text transition-colors">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div class="p-6 overflow-y-auto max-h-[calc(90vh-220px)]">
                
                <!-- Player Headers with Value Scores -->
                <div class="grid grid-cols-2 gap-4 mb-6">
                  <!-- ADD Player -->
                  <div class="card bg-gradient-to-br from-green-500/10 to-cyan-500/10 border-green-500/30">
                    <div class="card-body text-center">
                      <div class="text-xs text-green-400 uppercase font-bold mb-2">➕ ADDING</div>
                      <div class="w-20 h-20 rounded-full bg-dark-border overflow-hidden mx-auto mb-3 ring-2 ring-green-400">
                        <img :src="swapSourcePlayer.headshot || defaultHeadshot" class="w-full h-full object-cover" @error="handleImageError" />
                      </div>
                      <div class="font-bold text-xl text-dark-text mb-1">{{ swapSourcePlayer.full_name }}</div>
                      <div class="text-sm text-dark-textMuted mb-3">{{ swapSourcePlayer.position }} • {{ swapSourcePlayer.mlb_team }}</div>
                      <div class="inline-block px-4 py-2 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
                        <div class="text-xs text-yellow-400 uppercase">Value Score</div>
                        <div class="text-3xl font-black text-yellow-400">{{ swapSourcePlayer.overallValue?.toFixed(1) || 'N/A' }}</div>
                      </div>
                    </div>
                  </div>

                  <!-- DROP Player -->
                  <div class="card bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/30">
                    <div class="card-body text-center">
                      <div class="text-xs text-red-400 uppercase font-bold mb-2">➖ DROPPING</div>
                      <div class="w-20 h-20 rounded-full bg-dark-border overflow-hidden mx-auto mb-3 ring-2 ring-red-400">
                        <img :src="selectedSwapTarget?.headshot || defaultHeadshot" class="w-full h-full object-cover" @error="handleImageError" />
                      </div>
                      <div class="font-bold text-xl text-dark-text mb-1">{{ selectedSwapTarget?.full_name || 'Select player below' }}</div>
                      <div v-if="selectedSwapTarget" class="text-sm text-dark-textMuted mb-3">{{ selectedSwapTarget.position }} • {{ selectedSwapTarget.mlb_team }}</div>
                      <div v-else class="text-sm text-dark-textMuted mb-3">Choose from your roster</div>
                      <div v-if="selectedSwapTarget" class="inline-block px-4 py-2 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
                        <div class="text-xs text-yellow-400 uppercase">Value Score</div>
                        <div class="text-3xl font-black text-yellow-400">{{ selectedSwapTarget.overallValue?.toFixed(1) || 'N/A' }}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Net Impact Summary -->
                <div v-if="selectedSwapTarget" class="card mb-6 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/30">
                  <div class="card-body">
                    <div class="grid grid-cols-3 gap-4">
                      <div class="text-center">
                        <div class="text-xs text-dark-textMuted uppercase mb-1">Value Change</div>
                        <div class="text-3xl font-black" :class="getValueChangeClass(swapSourcePlayer, selectedSwapTarget)">
                          {{ getValueChange(swapSourcePlayer, selectedSwapTarget) }}
                        </div>
                      </div>
                      <div class="text-center">
                        <div class="text-xs text-dark-textMuted uppercase mb-1">Categories Improved</div>
                        <div class="text-3xl font-black text-green-400">{{ getCategoriesImproved(swapSourcePlayer, selectedSwapTarget) }}</div>
                      </div>
                      <div class="text-center">
                        <div class="text-xs text-dark-textMuted uppercase mb-1">Recommendation</div>
                        <div class="text-lg font-black" :class="getSwapRecommendationClass(swapSourcePlayer, selectedSwapTarget)">
                          {{ getSwapRecommendation(swapSourcePlayer, selectedSwapTarget) }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- View Mode Toggle -->
                <div class="flex justify-center mb-4">
                  <div class="inline-flex rounded-lg border border-dark-border overflow-hidden">
                    <button 
                      @click="swapComparisonMode = 'projections'" 
                      :class="swapComparisonMode === 'projections' ? 'bg-green-500 text-gray-900' : 'bg-dark-card text-dark-textMuted'"
                      class="px-4 py-2 text-sm font-semibold transition-colors"
                    >
                      📈 Upcoming Projections
                    </button>
                    <button 
                      @click="swapComparisonMode = 'recent'" 
                      :class="swapComparisonMode === 'recent' ? 'bg-blue-500 text-gray-900' : 'bg-dark-card text-dark-textMuted'"
                      class="px-4 py-2 text-sm font-semibold transition-colors"
                    >
                      📊 Recent Stats (L14)
                    </button>
                  </div>
                </div>

                <!-- Category-by-Category Comparison Charts -->
                <div v-if="selectedSwapTarget" class="card">
                  <div class="card-header py-3">
                    <h3 class="text-lg font-bold">
                      {{ swapComparisonMode === 'projections' ? '📈 Projected Performance (Next 14 Days)' : '📊 Recent Performance (Last 14 Days)' }}
                    </h3>
                  </div>
                  <div class="card-body space-y-3">
                    <div v-for="cat in displayCategories" :key="'compare-'+cat.stat_id">
                      <div class="flex items-center justify-between mb-2">
                        <span class="font-semibold text-dark-text">{{ cat.display_name }}</span>
                        <div class="flex items-center gap-2">
                          <span class="text-xs text-dark-textMuted">Difference:</span>
                          <span class="font-bold text-sm" :class="getCategoryDifferenceColor(swapSourcePlayer, selectedSwapTarget, cat)">
                            {{ getCategoryComparisonDiff(swapSourcePlayer, selectedSwapTarget, cat) }}
                          </span>
                        </div>
                      </div>
                      
                      <!-- Horizontal Bar Comparison -->
                      <div class="relative h-8 bg-dark-elevated rounded-lg overflow-hidden">
                        <div class="absolute inset-y-0 left-0 right-1/2 flex items-center justify-end pr-2">
                          <div 
                            class="h-full bg-red-500/50 rounded-l flex items-center justify-end pr-2"
                            :style="{ width: getCategoryBarWidth(selectedSwapTarget, cat, swapComparisonMode) }"
                          >
                            <span class="text-xs font-bold text-dark-text">{{ getCategoryValue(selectedSwapTarget, cat, swapComparisonMode) }}</span>
                          </div>
                        </div>
                        <div class="absolute inset-y-0 left-1/2 right-0 flex items-center justify-start pl-2">
                          <div 
                            class="h-full bg-green-500/50 rounded-r flex items-center justify-start pl-2"
                            :style="{ width: getCategoryBarWidth(swapSourcePlayer, cat, swapComparisonMode) }"
                          >
                            <span class="text-xs font-bold text-dark-text">{{ getCategoryValue(swapSourcePlayer, cat, swapComparisonMode) }}</span>
                          </div>
                        </div>
                        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div class="w-px h-full bg-dark-border"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Select Drop Candidate -->
                <div v-if="!selectedSwapTarget" class="card">
                  <div class="card-header py-3">
                    <h3 class="text-lg font-bold">Select Player to Drop</h3>
                  </div>
                  <div class="card-body">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div 
                        v-for="player in droppablePlayers.slice(0, 8)" 
                        :key="player.player_key"
                        @click="selectedSwapTarget = player"
                        class="p-3 bg-dark-elevated rounded-lg hover:bg-dark-border/30 cursor-pointer transition-colors border-2 border-transparent hover:border-red-500/50 flex items-center gap-3"
                      >
                        <div class="w-12 h-12 rounded-full bg-dark-border overflow-hidden">
                          <img :src="player.headshot || defaultHeadshot" class="w-full h-full object-cover" @error="handleImageError" />
                        </div>
                        <div class="flex-1">
                          <div class="font-semibold text-dark-text">{{ player.full_name }}</div>
                          <div class="text-xs text-dark-textMuted">{{ player.position }} • Value: {{ player.overallValue?.toFixed(1) || 'N/A' }}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              <!-- Footer -->
              <div class="px-6 py-4 border-t border-dark-border flex justify-between items-center">
                <div class="text-xs text-dark-textMuted">
                  💎 Premium Strategic Analysis
                </div>
                <div class="flex gap-3">
                  <button @click="showSwapModal = false; selectedSwapTarget = null" class="px-4 py-2 bg-dark-border text-dark-textMuted rounded-lg hover:bg-dark-border/50 transition-colors font-semibold">
                    Cancel
                  </button>
                  <button 
                    v-if="selectedSwapTarget"
                    @click="confirmSwap"
                    class="px-6 py-2 bg-green-500 text-gray-900 rounded-lg hover:bg-green-400 transition-colors font-semibold"
                  >
                    Confirm Move
                  </button>
                </div>
              </div>
            </div>
          </div>


          <!-- MODAL 3: MATCHUP ANALYSIS -->
          <div v-if="showMatchupAnalysisModal" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" @click.self="showMatchupAnalysisModal = false">
            <div class="bg-dark-card rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden border border-dark-border shadow-2xl" @click.stop>
              <div class="bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-blue-500/20 px-6 py-4 border-b border-dark-border flex items-center justify-between">
                <div>
                  <h2 class="text-2xl font-bold text-dark-text">Matchup Analysis</h2>
                  <p class="text-sm text-dark-textMuted mt-1">{{ myTeamName }} vs {{ opponentName }}</p>
                </div>
                <button @click="showMatchupAnalysisModal = false" class="text-dark-textMuted hover:text-dark-text transition-colors">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div class="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                
                <!-- Overall Status -->
                <div class="grid grid-cols-3 gap-4 mb-6">
                  <div class="card bg-green-500/10 border-green-500/30">
                    <div class="card-body text-center py-4">
                      <div class="text-xs text-green-400 uppercase mb-1">Winning</div>
                      <div class="text-4xl font-black text-green-400">{{ matchupWins }}</div>
                      <div class="text-xs text-dark-textMuted mt-1">categories</div>
                    </div>
                  </div>
                  <div class="card bg-yellow-500/10 border-yellow-500/30">
                    <div class="card-body text-center py-4">
                      <div class="text-xs text-yellow-400 uppercase mb-1">Close</div>
                      <div class="text-4xl font-black text-yellow-400">{{ matchupTies }}</div>
                      <div class="text-xs text-dark-textMuted mt-1">categories</div>
                    </div>
                  </div>
                  <div class="card bg-red-500/10 border-red-500/30">
                    <div class="card-body text-center py-4">
                      <div class="text-xs text-red-400 uppercase mb-1">Losing</div>
                      <div class="text-4xl font-black text-red-400">{{ matchupLosses }}</div>
                      <div class="text-xs text-dark-textMuted mt-1">categories</div>
                    </div>
                  </div>
                </div>

                <!-- Category Breakdown -->
                <div class="card mb-6">
                  <div class="card-header py-3">
                    <h3 class="text-lg font-bold">Category-by-Category Breakdown</h3>
                  </div>
                  <div class="card-body p-0">
                    <div class="divide-y divide-dark-border/30">
                      <div v-for="cat in displayCategories" :key="'matchup-'+cat.stat_id" class="flex items-center justify-between p-4 hover:bg-dark-border/10 transition-colors">
                        <div class="flex items-center gap-3">
                          <span class="px-3 py-1.5 rounded font-bold text-sm" :class="getCategoryMatchupClass(cat.stat_id)">
                            {{ cat.display_name }}
                          </span>
                          <span class="text-sm font-medium" :class="getCategoryMatchupTextClass(cat.stat_id)">
                            {{ getCategoryMatchupStatus(cat.stat_id) }}
                          </span>
                        </div>
                        <div class="flex items-center gap-6">
                          <div class="text-right">
                            <div class="text-xs text-dark-textMuted">You</div>
                            <div class="text-lg font-bold text-dark-text">{{ matchupCategoryStatus[cat.stat_id]?.myValue || '0' }}</div>
                          </div>
                          <div class="text-dark-textMuted">vs</div>
                          <div class="text-right">
                            <div class="text-xs text-dark-textMuted">Opponent</div>
                            <div class="text-lg font-bold text-dark-text">{{ matchupCategoryStatus[cat.stat_id]?.oppValue || '0' }}</div>
                          </div>
                          <div class="text-right min-w-[80px]">
                            <div class="text-xs text-dark-textMuted">Difference</div>
                            <div class="text-lg font-bold" :class="getCategoryDifferenceClass(cat.stat_id)">
                              {{ getCategoryDifference(cat.stat_id) }}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Strategic Insights -->
                <div class="card">
                  <div class="card-header py-3">
                    <h3 class="text-lg font-bold">💡 Strategic Insights</h3>
                  </div>
                  <div class="card-body">
                    <div class="space-y-3">
                      <div class="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <div class="font-bold text-green-400 mb-2">✓ Lock These In</div>
                        <div class="text-sm text-dark-text">
                          Categories you're safely winning: {{ getSafeCategoryNames }}
                        </div>
                      </div>
                      <div class="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <div class="font-bold text-yellow-400 mb-2">⚠️ Focus Here</div>
                        <div class="text-sm text-dark-text">
                          Close categories to target: {{ getCloseCategoryNames }}
                        </div>
                      </div>
                      <div class="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <div class="font-bold text-red-400 mb-2">📈 Comeback Needed</div>
                        <div class="text-sm text-dark-text">
                          Categories to chase: {{ getLosingCategoryNames }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="px-6 py-4 border-t border-dark-border flex justify-end">
                <button @click="showMatchupAnalysisModal = false" class="px-6 py-2 bg-purple-500 text-gray-900 rounded-lg hover:bg-purple-400 transition-colors font-semibold">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- TRADE ANALYZER TAB -->
      <template v-if="activeTab === 'trade'">
        <div class="space-y-6">
          <!-- Header -->
          <div class="card">
            <div class="card-body py-4">
              <div class="flex items-center justify-between">
                <div>
                  <h2 class="text-xl font-bold text-dark-text flex items-center gap-2">
                    <span>🔄</span> Trade Analyzer
                  </h2>
                  <p class="text-sm text-dark-textMuted mt-1">Evaluate trades and see how they'd impact your team</p>
                </div>
                <button 
                  v-if="tradeAnalysis" 
                  @click="resetTrade" 
                  class="px-4 py-2 bg-dark-border/50 text-dark-textMuted rounded-lg text-sm hover:bg-dark-border transition-colors"
                >
                  Clear Trade
                </button>
              </div>
            </div>
          </div>

          <!-- Trade Setup -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Your Side -->
            <div class="card">
              <div class="card-header border-b border-yellow-400/30">
                <div class="flex items-center gap-2">
                  <span class="text-xl">📤</span>
                  <h3 class="text-lg font-bold text-yellow-400">You Give</h3>
                  <span v-if="tradeGivePlayers.length > 0" class="ml-2 px-2 py-0.5 bg-yellow-400/20 rounded-full text-xs font-bold text-yellow-400">
                    {{ tradeGivePlayers.length }} player{{ tradeGivePlayers.length > 1 ? 's' : '' }}
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-sm text-dark-textMuted">{{ myTeamName }}</span>
                  <span v-if="tradeGivePlayers.length > 0" class="text-sm font-bold text-yellow-400">
                    Total: {{ tradeGiveTotalValue.toFixed(0) }}
                  </span>
                </div>
              </div>
              <div class="card-body">
                <!-- Selected Players to Give -->
                <div v-if="tradeGivePlayers.length > 0" class="space-y-2 mb-4">
                  <div v-for="player in tradeGivePlayers" :key="player.player_key" class="bg-yellow-500/10 rounded-xl p-3 border border-yellow-500/30">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-full bg-dark-border overflow-hidden ring-2 ring-yellow-400">
                        <img :src="player.headshot || defaultHeadshot" :alt="player.full_name" class="w-full h-full object-cover" @error="handleImageError" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="font-bold text-yellow-400 text-sm truncate">{{ player.full_name }}</div>
                        <div class="text-xs text-dark-textMuted">{{ player.position }} • {{ player.mlb_team }}</div>
                      </div>
                      <div class="text-right mr-2">
                        <div class="text-lg font-black text-yellow-400">{{ player.overallValue?.toFixed(0) || '-' }}</div>
                        <div class="text-[10px] text-dark-textMuted">Value</div>
                      </div>
                      <button @click="removeGivePlayer(player)" class="p-1.5 hover:bg-dark-border/50 rounded-lg">
                        <svg class="w-4 h-4 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Player Selection Controls -->
                <div class="space-y-3">
                  <div class="text-sm text-dark-textMuted">{{ tradeGivePlayers.length > 0 ? 'Add another player:' : 'Select players from your roster:' }}</div>
                  
                  <!-- Search & Filters -->
                  <div class="flex gap-2">
                    <input 
                      v-model="tradeGiveSearch" 
                      type="text" 
                      placeholder="Search..." 
                      class="flex-1 bg-dark-border/50 border border-dark-border rounded-lg px-3 py-2 text-dark-text placeholder-dark-textMuted text-sm"
                    />
                    <select v-model="tradeGivePositionFilter" class="bg-dark-border border border-dark-border rounded-lg px-2 py-2 text-dark-text text-sm">
                      <option v-for="pos in tradePositionOptions" :key="pos.id" :value="pos.id">{{ pos.label }}</option>
                    </select>
                  </div>
                  
                  <!-- Sort Options -->
                  <div class="flex items-center gap-2 text-xs flex-wrap">
                    <span class="text-dark-textMuted">Sort:</span>
                    <button @click="tradeGiveSortBy = 'value'" :class="tradeGiveSortBy === 'value' ? 'bg-yellow-400/20 text-yellow-400' : 'bg-dark-border/30 text-dark-textMuted'" class="px-2 py-1 rounded">Value</button>
                    <button @click="tradeGiveSortBy = 'position'" :class="tradeGiveSortBy === 'position' ? 'bg-yellow-400/20 text-yellow-400' : 'bg-dark-border/30 text-dark-textMuted'" class="px-2 py-1 rounded">Position</button>
                    <select 
                      v-model="tradeGiveSortBy" 
                      class="bg-dark-border/30 border-0 rounded px-2 py-1 text-xs"
                      :class="tradeGiveSortBy !== 'value' && tradeGiveSortBy !== 'position' ? 'text-yellow-400 bg-yellow-400/20' : 'text-dark-textMuted'"
                    >
                      <option value="" disabled>By Category...</option>
                      <option v-for="cat in displayCategories" :key="cat.stat_id" :value="cat.stat_id">{{ cat.display_name }}</option>
                    </select>
                  </div>
                  
                  <!-- Column Headers -->
                  <div class="flex items-center gap-3 px-2 py-1 text-[10px] uppercase tracking-wider text-dark-textMuted border-b border-dark-border">
                    <div class="w-9"></div>
                    <div class="flex-1">Player</div>
                    <div class="w-16 text-right flex items-center justify-end gap-1">
                      <span>{{ tradeGiveSortBy !== 'value' && tradeGiveSortBy !== 'position' ? getCategoryName(tradeGiveSortBy) : 'Value' }}</span>
                      <button @click="showValueExplanation = !showValueExplanation" class="text-dark-textMuted hover:text-yellow-400">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </button>
                    </div>
                  </div>
                  
                  <!-- Value Explanation Tooltip -->
                  <div v-if="showValueExplanation" class="bg-dark-card border border-dark-border rounded-lg p-3 text-xs text-dark-textMuted">
                    <div class="font-bold text-dark-text mb-1">How Value is Calculated:</div>
                    <ul class="space-y-1 list-disc list-inside">
                      <li><span class="text-yellow-400">Category Percentile</span> - Player's rank in each stat vs. same player type</li>
                      <li><span class="text-yellow-400">Multi-Category Bonus</span> - Rewards contributing across all categories</li>
                      <li><span class="text-yellow-400">Position Scarcity</span> - C, SS, 2B hitters get +5 for thin pools</li>
                      <li><span class="text-yellow-400">Normalization</span> - Scores balanced so pitchers & hitters compare fairly</li>
                    </ul>
                    <div class="mt-2 text-[10px]">Value ranges from 10-90. Higher is better. Pitchers & hitters are normalized separately then scaled to the same range.</div>
                  </div>
                  
                  <!-- Player List -->
                  <div class="space-y-1 max-h-64 overflow-y-auto">
                    <div 
                      v-for="player in filteredMyPlayersForTrade" 
                      :key="player.player_key"
                      @click="addGivePlayer(player)"
                      class="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-yellow-400/10 transition-colors"
                      :class="isPlayerInGive(player) ? 'opacity-40 pointer-events-none' : ''"
                    >
                      <div class="w-9 h-9 rounded-full bg-dark-border overflow-hidden">
                        <img :src="player.headshot || defaultHeadshot" :alt="player.full_name" class="w-full h-full object-cover" @error="handleImageError" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="font-medium text-dark-text text-sm truncate">{{ player.full_name }}</div>
                        <div class="text-xs text-dark-textMuted">{{ player.position }} • {{ player.mlb_team }}</div>
                      </div>
                      <div class="w-16 text-right">
                        <div class="text-base font-black text-yellow-400">
                          {{ getTradePlayerSortValue(player, tradeGiveSortBy) }}
                        </div>
                        <div v-if="tradeGiveSortBy !== 'value' && tradeGiveSortBy !== 'position'" class="text-[10px] text-dark-textMuted">
                          Val: {{ player.overallValue?.toFixed(0) || '-' }}
                        </div>
                      </div>
                    </div>
                    <div v-if="filteredMyPlayersForTrade.length === 0" class="text-center py-4 text-dark-textMuted text-sm">
                      No players found
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Their Side -->
            <div class="card">
              <div class="card-header border-b border-cyan-400/30">
                <div class="flex items-center gap-2">
                  <span class="text-xl">📥</span>
                  <h3 class="text-lg font-bold text-cyan-400">You Get</h3>
                  <span v-if="tradeGetPlayers.length > 0" class="ml-2 px-2 py-0.5 bg-cyan-400/20 rounded-full text-xs font-bold text-cyan-400">
                    {{ tradeGetPlayers.length }} player{{ tradeGetPlayers.length > 1 ? 's' : '' }}
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <select 
                    v-model="tradePartnerKey" 
                    class="select bg-dark-border border-dark-border text-dark-text px-3 py-1.5 rounded-lg text-sm"
                    @change="tradeGetPlayers = []"
                  >
                    <option value="">Select team...</option>
                    <option v-for="team in otherTeams" :key="team.team_key" :value="team.team_key">
                      {{ team.name }}
                    </option>
                  </select>
                  <span v-if="tradeGetPlayers.length > 0" class="text-sm font-bold text-cyan-400">
                    Total: {{ tradeGetTotalValue.toFixed(0) }}
                  </span>
                </div>
              </div>
              <div class="card-body">
                <!-- Selected Players to Get -->
                <div v-if="tradeGetPlayers.length > 0" class="space-y-2 mb-4">
                  <div v-for="player in tradeGetPlayers" :key="player.player_key" class="bg-cyan-500/10 rounded-xl p-3 border border-cyan-500/30">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-full bg-dark-border overflow-hidden ring-2 ring-cyan-400">
                        <img :src="player.headshot || defaultHeadshot" :alt="player.full_name" class="w-full h-full object-cover" @error="handleImageError" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="font-bold text-cyan-400 text-sm truncate">{{ player.full_name }}</div>
                        <div class="text-xs text-dark-textMuted">{{ player.position }} • {{ player.mlb_team }}</div>
                      </div>
                      <div class="text-right mr-2">
                        <div class="text-lg font-black text-cyan-400">{{ player.overallValue?.toFixed(0) || '-' }}</div>
                        <div class="text-[10px] text-dark-textMuted">Value</div>
                      </div>
                      <button @click="removeGetPlayer(player)" class="p-1.5 hover:bg-dark-border/50 rounded-lg">
                        <svg class="w-4 h-4 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Player Selection Controls -->
                <div v-if="tradePartnerKey" class="space-y-3">
                  <div class="text-sm text-dark-textMuted">{{ tradeGetPlayers.length > 0 ? 'Add another player:' : 'Select players from their roster:' }}</div>
                  
                  <!-- Search & Filters -->
                  <div class="flex gap-2">
                    <input 
                      v-model="tradeGetSearch" 
                      type="text" 
                      placeholder="Search..." 
                      class="flex-1 bg-dark-border/50 border border-dark-border rounded-lg px-3 py-2 text-dark-text placeholder-dark-textMuted text-sm"
                    />
                    <select v-model="tradeGetPositionFilter" class="bg-dark-border border border-dark-border rounded-lg px-2 py-2 text-dark-text text-sm">
                      <option v-for="pos in tradePositionOptions" :key="pos.id" :value="pos.id">{{ pos.label }}</option>
                    </select>
                  </div>
                  
                  <!-- Sort Options -->
                  <div class="flex items-center gap-2 text-xs flex-wrap">
                    <span class="text-dark-textMuted">Sort:</span>
                    <button @click="tradeGetSortBy = 'value'" :class="tradeGetSortBy === 'value' ? 'bg-cyan-400/20 text-cyan-400' : 'bg-dark-border/30 text-dark-textMuted'" class="px-2 py-1 rounded">Value</button>
                    <button @click="tradeGetSortBy = 'position'" :class="tradeGetSortBy === 'position' ? 'bg-cyan-400/20 text-cyan-400' : 'bg-dark-border/30 text-dark-textMuted'" class="px-2 py-1 rounded">Position</button>
                    <select 
                      v-model="tradeGetSortBy" 
                      class="bg-dark-border/30 border-0 rounded px-2 py-1 text-xs"
                      :class="tradeGetSortBy !== 'value' && tradeGetSortBy !== 'position' ? 'text-cyan-400 bg-cyan-400/20' : 'text-dark-textMuted'"
                    >
                      <option value="" disabled>By Category...</option>
                      <option v-for="cat in displayCategories" :key="cat.stat_id" :value="cat.stat_id">{{ cat.display_name }}</option>
                    </select>
                  </div>
                  
                  <!-- Column Headers -->
                  <div class="flex items-center gap-3 px-2 py-1 text-[10px] uppercase tracking-wider text-dark-textMuted border-b border-dark-border">
                    <div class="w-9"></div>
                    <div class="flex-1">Player</div>
                    <div class="w-16 text-right">
                      {{ tradeGetSortBy !== 'value' && tradeGetSortBy !== 'position' ? getCategoryName(tradeGetSortBy) : 'Value' }}
                    </div>
                  </div>
                  
                  <!-- Player List -->
                  <div class="space-y-1 max-h-64 overflow-y-auto">
                    <div 
                      v-for="player in filteredPartnerPlayersForTrade" 
                      :key="player.player_key"
                      @click="addGetPlayer(player)"
                      class="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-cyan-400/10 transition-colors"
                      :class="isPlayerInGet(player) ? 'opacity-40 pointer-events-none' : ''"
                    >
                      <div class="w-9 h-9 rounded-full bg-dark-border overflow-hidden">
                        <img :src="player.headshot || defaultHeadshot" :alt="player.full_name" class="w-full h-full object-cover" @error="handleImageError" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="font-medium text-dark-text text-sm truncate">{{ player.full_name }}</div>
                        <div class="text-xs text-dark-textMuted">{{ player.position }} • {{ player.mlb_team }}</div>
                      </div>
                      <div class="w-16 text-right">
                        <div class="text-base font-black text-cyan-400">
                          {{ getTradePlayerSortValue(player, tradeGetSortBy) }}
                        </div>
                        <div v-if="tradeGetSortBy !== 'value' && tradeGetSortBy !== 'position'" class="text-[10px] text-dark-textMuted">
                          Val: {{ player.overallValue?.toFixed(0) || '-' }}
                        </div>
                      </div>
                    </div>
                    <div v-if="filteredPartnerPlayersForTrade.length === 0" class="text-center py-4 text-dark-textMuted text-sm">
                      No players found
                    </div>
                  </div>
                </div>

                <div v-if="!tradePartnerKey" class="text-center py-8 text-dark-textMuted">
                  <div class="text-4xl mb-2">👆</div>
                  <div class="text-sm">Select a trade partner above</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Trade Value Summary -->
          <div v-if="tradeGivePlayers.length > 0 || tradeGetPlayers.length > 0" class="card">
            <div class="card-body py-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-6">
                  <div class="text-center">
                    <div class="text-2xl font-black text-yellow-400">{{ tradeGiveTotalValue.toFixed(0) }}</div>
                    <div class="text-xs text-dark-textMuted">You Give</div>
                  </div>
                  <div class="text-3xl text-dark-textMuted">⇄</div>
                  <div class="text-center">
                    <div class="text-2xl font-black text-cyan-400">{{ tradeGetTotalValue.toFixed(0) }}</div>
                    <div class="text-xs text-dark-textMuted">You Get</div>
                  </div>
                  <div class="text-center px-4 border-l border-dark-border">
                    <div class="text-2xl font-black" :class="tradeValueDifference >= 0 ? 'text-green-400' : 'text-red-400'">
                      {{ tradeValueDifference >= 0 ? '+' : '' }}{{ tradeValueDifference.toFixed(0) }}
                    </div>
                    <div class="text-xs text-dark-textMuted">Net Value</div>
                  </div>
                </div>
                <div class="text-sm text-dark-textMuted">
                  {{ tradeGivePlayers.length }} for {{ tradeGetPlayers.length }} trade
                </div>
              </div>
            </div>
          </div>

          <!-- Analyze Button -->
          <div class="flex justify-center">
            <button 
              @click="analyzeTrade"
              :disabled="tradeGivePlayers.length === 0 || tradeGetPlayers.length === 0"
              class="px-8 py-3 rounded-xl font-bold text-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              :class="tradeGivePlayers.length > 0 && tradeGetPlayers.length > 0 
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-gray-900' 
                : 'bg-dark-border text-dark-textMuted'"
            >
              <span class="flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Analyze Trade
              </span>
            </button>
          </div>

          <!-- Trade Analysis Results -->
          <template v-if="tradeAnalysis">
            <!-- Grade Card -->
            <div class="card overflow-hidden">
              <div class="p-6" :class="getTradeGradeBackground(tradeAnalysis.grade)">
                <div class="flex items-start justify-between">
                  <div>
                    <div class="text-sm text-dark-textMuted uppercase tracking-wider mb-1">Trade Grade</div>
                    <div class="text-5xl font-black" :class="getTradeGradeColor(tradeAnalysis.grade)">{{ tradeAnalysis.grade }}</div>
                  </div>
                  <div class="text-right flex-1 max-w-md">
                    <div class="text-lg font-semibold text-dark-text mb-2">{{ tradeAnalysis.headline }}</div>
                    <div class="text-sm text-dark-textMuted">{{ tradeAnalysis.summary }}</div>
                  </div>
                </div>
                
                <!-- Factor Scores -->
                <div class="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div class="bg-dark-bg/50 rounded-xl p-4 text-center">
                    <div class="text-2xl font-black" :class="getTradeGradeColor(tradeAnalysis.categoryGrade)">{{ tradeAnalysis.categoryGrade }}</div>
                    <div class="text-xs text-dark-textMuted mt-1">Category Impact</div>
                  </div>
                  <div class="bg-dark-bg/50 rounded-xl p-4 text-center">
                    <div class="text-2xl font-black" :class="getTradeGradeColor(tradeAnalysis.valueGrade)">{{ tradeAnalysis.valueGrade }}</div>
                    <div class="text-xs text-dark-textMuted mt-1">Player Value</div>
                  </div>
                  <div class="bg-dark-bg/50 rounded-xl p-4 text-center">
                    <div class="text-2xl font-black" :class="getTradeGradeColor(tradeAnalysis.balanceGrade)">{{ tradeAnalysis.balanceGrade }}</div>
                    <div class="text-xs text-dark-textMuted mt-1">Team Balance</div>
                  </div>
                  <div class="bg-dark-bg/50 rounded-xl p-4 text-center">
                    <div class="text-2xl font-black" :class="getTradeGradeColor(tradeAnalysis.scarcityGrade)">{{ tradeAnalysis.scarcityGrade }}</div>
                    <div class="text-xs text-dark-textMuted mt-1">Scarcity</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Category Impact & Rankings -->
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <!-- Category Impact Table -->
              <div class="card">
                <div class="card-header">
                  <div class="flex items-center gap-2">
                    <span class="text-xl">📊</span>
                    <h3 class="text-lg font-bold text-dark-text">Category Impact</h3>
                  </div>
                  <div class="flex items-center gap-3 text-sm">
                    <span class="text-green-400">+{{ tradeAnalysis.categoriesUp }} ↑</span>
                    <span class="text-red-400">{{ tradeAnalysis.categoriesDown }} ↓</span>
                    <span class="text-dark-textMuted">{{ tradeAnalysis.categoriesSame }} →</span>
                  </div>
                </div>
                <div class="card-body p-0">
                  <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                      <thead class="bg-dark-border/30">
                        <tr>
                          <th class="text-left py-2 px-3 text-dark-textMuted font-medium">Category</th>
                          <th class="text-center py-2 px-3 text-dark-textMuted font-medium">Before</th>
                          <th class="text-center py-2 px-3 text-dark-textMuted font-medium">After</th>
                          <th class="text-center py-2 px-3 text-dark-textMuted font-medium">Change</th>
                          <th class="text-center py-2 px-3 text-dark-textMuted font-medium">Rank</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-dark-border/30">
                        <tr v-for="cat in tradeAnalysis.categoryImpact" :key="cat.stat_id" class="hover:bg-dark-border/10">
                          <td class="py-2 px-3 font-medium text-dark-text">{{ cat.display_name }}</td>
                          <td class="py-2 px-3 text-center text-dark-textMuted">{{ cat.before }}</td>
                          <td class="py-2 px-3 text-center font-medium" :class="cat.changeColor">{{ cat.after }}</td>
                          <td class="py-2 px-3 text-center font-mono" :class="cat.changeColor">
                            {{ cat.change > 0 ? '+' : '' }}{{ cat.changeDisplay }}
                          </td>
                          <td class="py-2 px-3 text-center">
                            <div class="flex items-center justify-center gap-1">
                              <span class="w-6 h-6 inline-flex items-center justify-center rounded text-xs font-bold" :class="getCategoryHeatmapClass(cat.rankBefore)">
                                {{ cat.rankBefore }}
                              </span>
                              <span class="text-dark-textMuted">→</span>
                              <span class="w-6 h-6 inline-flex items-center justify-center rounded text-xs font-bold" :class="getCategoryHeatmapClass(cat.rankAfter)">
                                {{ cat.rankAfter }}
                              </span>
                              <span v-if="cat.rankChange !== 0" class="ml-1 text-xs font-bold" :class="cat.rankChange < 0 ? 'text-green-400' : 'text-red-400'">
                                {{ cat.rankChange < 0 ? '↑' : '↓' }}{{ Math.abs(cat.rankChange) }}
                              </span>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <!-- Power Rankings Impact -->
              <div class="card">
                <div class="card-header">
                  <div class="flex items-center gap-2">
                    <span class="text-xl">🏆</span>
                    <h3 class="text-lg font-bold text-dark-text">Power Rankings Impact</h3>
                  </div>
                </div>
                <div class="card-body space-y-4">
                  <!-- Overall Rank Change -->
                  <div class="bg-dark-border/20 rounded-xl p-4">
                    <div class="flex items-center justify-between">
                      <div>
                        <div class="text-sm text-dark-textMuted">Power Rank</div>
                        <div class="flex items-center gap-3 mt-1">
                          <span class="text-3xl font-black text-dark-text">#{{ tradeAnalysis.powerRankBefore }}</span>
                          <span class="text-2xl text-dark-textMuted">→</span>
                          <span class="text-3xl font-black" :class="tradeAnalysis.powerRankAfter < tradeAnalysis.powerRankBefore ? 'text-green-400' : tradeAnalysis.powerRankAfter > tradeAnalysis.powerRankBefore ? 'text-red-400' : 'text-dark-text'">#{{ tradeAnalysis.powerRankAfter }}</span>
                        </div>
                      </div>
                      <div v-if="tradeAnalysis.powerRankChange !== 0" class="text-right">
                        <div class="text-4xl font-black" :class="tradeAnalysis.powerRankChange < 0 ? 'text-green-400' : 'text-red-400'">
                          {{ tradeAnalysis.powerRankChange < 0 ? '↑' : '↓' }}{{ Math.abs(tradeAnalysis.powerRankChange) }}
                        </div>
                        <div class="text-xs text-dark-textMuted">positions</div>
                      </div>
                      <div v-else class="text-3xl">🔄</div>
                    </div>
                  </div>

                  <!-- Score Breakdown -->
                  <div class="space-y-3">
                    <div class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider">Score Breakdown</div>
                    <div class="space-y-2">
                      <div class="flex items-center gap-3">
                        <span class="w-28 text-sm text-dark-text">Category Balance</span>
                        <div class="flex-1 h-2 bg-dark-border rounded-full overflow-hidden">
                          <div class="h-full bg-yellow-400 rounded-full transition-all" :style="{ width: tradeAnalysis.balanceScoreAfter + '%' }"></div>
                        </div>
                        <span class="w-16 text-right text-sm" :class="tradeAnalysis.balanceScoreChange >= 0 ? 'text-green-400' : 'text-red-400'">
                          {{ tradeAnalysis.balanceScoreAfter.toFixed(0) }} 
                          <span class="text-xs">({{ tradeAnalysis.balanceScoreChange >= 0 ? '+' : '' }}{{ tradeAnalysis.balanceScoreChange.toFixed(0) }})</span>
                        </span>
                      </div>
                      <div class="flex items-center gap-3">
                        <span class="w-28 text-sm text-dark-text">Star Power</span>
                        <div class="flex-1 h-2 bg-dark-border rounded-full overflow-hidden">
                          <div class="h-full bg-purple-400 rounded-full transition-all" :style="{ width: tradeAnalysis.starPowerAfter + '%' }"></div>
                        </div>
                        <span class="w-16 text-right text-sm" :class="tradeAnalysis.starPowerChange >= 0 ? 'text-green-400' : 'text-red-400'">
                          {{ tradeAnalysis.starPowerAfter.toFixed(0) }}
                          <span class="text-xs">({{ tradeAnalysis.starPowerChange >= 0 ? '+' : '' }}{{ tradeAnalysis.starPowerChange.toFixed(0) }})</span>
                        </span>
                      </div>
                      <div class="flex items-center gap-3">
                        <span class="w-28 text-sm text-dark-text">Depth</span>
                        <div class="flex-1 h-2 bg-dark-border rounded-full overflow-hidden">
                          <div class="h-full bg-cyan-400 rounded-full transition-all" :style="{ width: tradeAnalysis.depthAfter + '%' }"></div>
                        </div>
                        <span class="w-16 text-right text-sm" :class="tradeAnalysis.depthChange >= 0 ? 'text-green-400' : 'text-red-400'">
                          {{ tradeAnalysis.depthAfter.toFixed(0) }}
                          <span class="text-xs">({{ tradeAnalysis.depthChange >= 0 ? '+' : '' }}{{ tradeAnalysis.depthChange.toFixed(0) }})</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Top Category Rank Changes -->
                  <div class="bg-dark-border/20 rounded-xl p-4">
                    <div class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-3">Notable Rank Changes</div>
                    <div class="grid grid-cols-2 gap-2">
                      <div v-for="change in tradeAnalysis.topRankChanges" :key="change.stat_id" class="flex items-center gap-2 text-sm">
                        <span :class="change.direction === 'up' ? 'text-green-400' : 'text-red-400'">
                          {{ change.direction === 'up' ? '↑' : '↓' }}
                        </span>
                        <span class="text-dark-text">{{ change.display_name }}</span>
                        <span class="text-dark-textMuted">#{{ change.before }} → #{{ change.after }}</span>
                      </div>
                      <div v-if="tradeAnalysis.topRankChanges.length === 0" class="col-span-2 text-center text-dark-textMuted">
                        No significant rank changes
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Strategic Analysis -->
            <div class="card">
              <div class="card-header">
                <div class="flex items-center gap-2">
                  <span class="text-xl">🎯</span>
                  <h3 class="text-lg font-bold text-dark-text">Strategic Analysis</h3>
                </div>
              </div>
              <div class="card-body">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <!-- Strengths -->
                  <div>
                    <div class="flex items-center gap-2 mb-3">
                      <span class="text-green-400 text-lg">✅</span>
                      <span class="font-semibold text-dark-text">Strengths</span>
                    </div>
                    <ul class="space-y-2">
                      <li v-for="(point, idx) in tradeAnalysis.strengths" :key="'s'+idx" class="flex items-start gap-2 text-sm">
                        <span class="text-green-400 mt-0.5">•</span>
                        <span class="text-dark-text">{{ point }}</span>
                      </li>
                      <li v-if="tradeAnalysis.strengths.length === 0" class="text-dark-textMuted text-sm">No clear strengths identified</li>
                    </ul>
                  </div>
                  
                  <!-- Concerns -->
                  <div>
                    <div class="flex items-center gap-2 mb-3">
                      <span class="text-red-400 text-lg">⚠️</span>
                      <span class="font-semibold text-dark-text">Concerns</span>
                    </div>
                    <ul class="space-y-2">
                      <li v-for="(point, idx) in tradeAnalysis.concerns" :key="'c'+idx" class="flex items-start gap-2 text-sm">
                        <span class="text-red-400 mt-0.5">•</span>
                        <span class="text-dark-text">{{ point }}</span>
                      </li>
                      <li v-if="tradeAnalysis.concerns.length === 0" class="text-dark-textMuted text-sm">No major concerns</li>
                    </ul>
                  </div>
                </div>

                <!-- Bottom Line -->
                <div class="mt-6 p-4 rounded-xl" :class="tradeAnalysis.recommendation === 'accept' ? 'bg-green-500/10 border border-green-500/30' : tradeAnalysis.recommendation === 'decline' ? 'bg-red-500/10 border border-red-500/30' : 'bg-yellow-500/10 border border-yellow-500/30'">
                  <div class="flex items-center gap-3">
                    <span class="text-3xl">{{ tradeAnalysis.recommendation === 'accept' ? '✅' : tradeAnalysis.recommendation === 'decline' ? '❌' : '🤔' }}</span>
                    <div>
                      <div class="font-bold text-lg" :class="tradeAnalysis.recommendation === 'accept' ? 'text-green-400' : tradeAnalysis.recommendation === 'decline' ? 'text-red-400' : 'text-yellow-400'">
                        {{ tradeAnalysis.recommendation === 'accept' ? 'Make This Trade' : tradeAnalysis.recommendation === 'decline' ? 'Pass on This Trade' : 'Consider Carefully' }}
                      </div>
                      <div class="text-sm text-dark-textMuted">{{ tradeAnalysis.bottomLine }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </template>

    </template>

    <!-- Player Detail Modal -->
    <div v-if="selectedPlayer" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" @click.self="expandedPlayerKey = null">
      <div class="bg-dark-elevated rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-dark-border">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-yellow-400/30 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 rounded-full bg-dark-border overflow-hidden ring-2" :class="getAvatarRingClass(selectedPlayer)">
              <img :src="selectedPlayer.headshot || defaultHeadshot" :alt="selectedPlayer.full_name" class="w-full h-full object-cover" @error="handleImageError" />
            </div>
            <div>
              <h3 class="text-xl font-bold text-dark-text">{{ selectedPlayer.full_name }}</h3>
              <div class="flex items-center gap-3 text-sm text-dark-textMuted">
                <span class="px-2 py-0.5 rounded text-xs font-bold" :class="getPositionClass(selectedPlayer.position)">{{ selectedPlayer.position }}</span>
                <span>{{ selectedPlayer.mlb_team || 'FA' }}</span>
                <span v-if="selectedPlayer.fantasy_team" :class="isMyPlayer(selectedPlayer) ? 'text-yellow-400' : ''">• {{ selectedPlayer.fantasy_team }}</span>
                <span v-else class="text-cyan-400">• Free Agent</span>
              </div>
            </div>
          </div>
          <button @click="expandedPlayerKey = null" class="p-2 hover:bg-dark-border/50 rounded-lg transition-colors">
            <svg class="w-6 h-6 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <!-- Content -->
        <div class="p-6 overflow-y-auto max-h-[calc(90vh-100px)] space-y-6">
          <!-- Stats Grid -->
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div class="bg-dark-card rounded-lg p-3 text-center">
              <div class="text-2xl font-bold text-yellow-400">#{{ selectedPlayer.categoryRank }}</div>
              <div class="text-xs text-dark-textMuted">{{ selectedCategoryInfo?.display_name }} Rank</div>
            </div>
            <div class="bg-dark-card rounded-lg p-3 text-center">
              <div class="text-2xl font-bold text-dark-text">{{ formatStatValue(selectedPlayer.projectedValue) }}</div>
              <div class="text-xs text-dark-textMuted">ROS Projection</div>
            </div>
            <div class="bg-dark-card rounded-lg p-3 text-center">
              <div class="text-2xl font-bold text-dark-text">{{ formatStatValue(selectedPlayer.currentValue) }}</div>
              <div class="text-xs text-dark-textMuted">Current Season</div>
            </div>
            <div class="bg-dark-card rounded-lg p-3 text-center">
              <div class="text-2xl font-bold text-dark-text">{{ formatStatValue(selectedPlayer.perGameValue, 3) }}</div>
              <div class="text-xs text-dark-textMuted">Per Game Avg</div>
            </div>
            <div class="bg-dark-card rounded-lg p-3 text-center">
              <div class="text-2xl font-bold" :class="getValueClass(selectedPlayer.overallValue)">{{ selectedPlayer.overallValue?.toFixed(1) }}</div>
              <div class="text-xs text-dark-textMuted">Overall Value</div>
            </div>
            <div class="bg-dark-card rounded-lg p-3 text-center">
              <div class="text-2xl font-bold text-dark-text">{{ selectedPlayer.categoriesContributing || 0 }}/{{ relevantCategories.length }}</div>
              <div class="text-xs text-dark-textMuted">Multi-Cat Score</div>
            </div>
          </div>

          <!-- Performance Chart -->
          <div class="bg-dark-card rounded-xl p-4">
            <div class="flex items-center justify-between mb-4">
              <h4 class="font-semibold text-dark-text flex items-center gap-2"><span>📈</span> Recent Performance</h4>
              <select v-model="chartCategory" class="select bg-dark-border border-dark-border text-dark-text px-3 py-1.5 rounded-lg text-sm">
                <option v-for="cat in relevantCategories" :key="cat.stat_id" :value="cat.stat_id">
                  {{ cat.display_name }} - {{ cat.name }}
                </option>
              </select>
            </div>
            <div v-if="isLoadingChart" class="h-48 flex items-center justify-center">
              <LoadingSpinner size="md" />
            </div>
            <div v-else-if="recentPerformances.length > 0" class="space-y-4">
              <div class="h-48 relative">
                <svg viewBox="0 0 400 180" class="w-full h-full" preserveAspectRatio="xMidYMid meet">
                  <g class="grid-lines" stroke="#374151" stroke-width="1" opacity="0.3">
                    <line x1="50" y1="20" x2="380" y2="20" />
                    <line x1="50" y1="90" x2="380" y2="90" />
                    <line x1="50" y1="160" x2="380" y2="160" />
                  </g>
                  <g class="y-labels" fill="#9CA3AF" font-size="10">
                    <text x="45" y="25" text-anchor="end">{{ formatChartValue(chartYMax) }}</text>
                    <text x="45" y="95" text-anchor="end">{{ formatChartValue(chartYMax / 2) }}</text>
                    <text x="45" y="165" text-anchor="end">0</text>
                  </g>
                  <polyline :points="leagueAvgLinePoints" fill="none" stroke="#EAB308" stroke-width="2" stroke-dasharray="6,4" opacity="0.8" />
                  <polyline :points="playerLinePoints" fill="none" stroke="#F59E0B" stroke-width="3" />
                  <g v-for="(perf, idx) in recentPerformances" :key="'p'+idx">
                    <circle :cx="getChartX(idx)" :cy="getChartY(perf.playerValue)" r="6" fill="#F59E0B" stroke="#1F2937" stroke-width="2" />
                    <text :x="getChartX(idx)" :y="getChartY(perf.playerValue) - 12" fill="#F59E0B" font-size="10" font-weight="bold" text-anchor="middle">{{ formatChartValue(perf.playerValue) }}</text>
                  </g>
                  <g v-for="(perf, idx) in recentPerformances" :key="'l'+idx">
                    <circle :cx="getChartX(idx)" :cy="getChartY(perf.leagueAvg)" r="4" fill="#EAB308" stroke="#1F2937" stroke-width="2" opacity="0.8" />
                  </g>
                  <g class="x-labels" fill="#9CA3AF" font-size="9">
                    <text v-for="(perf, idx) in recentPerformances" :key="'d'+idx" :x="getChartX(idx)" y="178" text-anchor="middle">{{ perf.date }}</text>
                  </g>
                </svg>
              </div>
              <div class="flex items-center justify-center gap-6 text-sm">
                <div class="flex items-center gap-2"><div class="w-4 h-1 bg-amber-500 rounded"></div><span class="text-dark-textMuted">Player</span></div>
                <div class="flex items-center gap-2"><div class="w-4 h-1 bg-yellow-500 rounded opacity-80" style="background: repeating-linear-gradient(90deg, #EAB308, #EAB308 4px, transparent 4px, transparent 8px)"></div><span class="text-dark-textMuted">League Avg</span></div>
              </div>
            </div>
            <div v-else class="h-48 flex items-center justify-center text-dark-textMuted text-sm">
              No recent performance data available
            </div>
          </div>

          <!-- All Categories & Value Breakdown -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div class="bg-dark-card rounded-xl p-4">
              <h4 class="font-semibold text-dark-text mb-3 flex items-center gap-2"><span>📊</span> All {{ categoryTypeLabel }} Categories</h4>
              <div class="space-y-1 max-h-64 overflow-y-auto">
                <div v-for="cat in relevantCategories" :key="cat.stat_id" 
                  class="flex items-center py-2 px-3 rounded-lg" 
                  :class="cat.stat_id === selectedCategory ? 'bg-yellow-400/20 border border-yellow-400/30' : 'bg-dark-border/30'">
                  <div class="flex-1"><span class="text-sm text-dark-text font-medium">{{ cat.display_name }}</span></div>
                  <div class="w-24 flex items-center justify-end gap-2">
                    <span class="text-sm font-bold" :class="cat.stat_id === selectedCategory ? 'text-yellow-400' : 'text-dark-text'">
                      {{ formatCategoryStat(selectedPlayer, cat.stat_id) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div class="bg-dark-card rounded-xl p-4">
              <h4 class="font-semibold text-dark-text mb-3 flex items-center gap-2"><span>💎</span> Value Score Breakdown</h4>
              <div class="space-y-4">
                <div>
                  <div class="flex justify-between text-sm mb-1"><span class="text-dark-textMuted">Category Rank ({{ rankingWeights.categoryRank }}%)</span><span class="text-dark-text font-medium">{{ Math.max(0, Math.min(100, ((1 - (selectedPlayer.categoryRank - 1) / Math.max(filteredPlayers.length, 1)) * 100))).toFixed(0) }}</span></div>
                  <div class="h-2 bg-dark-border rounded-full overflow-hidden"><div class="h-full bg-yellow-400 rounded-full" :style="{ width: `${Math.max(0, Math.min(100, (1 - (selectedPlayer.categoryRank - 1) / Math.max(filteredPlayers.length, 1)) * 100))}%` }"></div></div>
                </div>
                <div>
                  <div class="flex justify-between text-sm mb-1"><span class="text-dark-textMuted">Multi-Category ({{ rankingWeights.multiCategory }}%)</span><span class="text-dark-text font-medium">{{ ((selectedPlayer.categoriesContributing || 0) / Math.max(relevantCategories.length, 1) * 100).toFixed(0) }}</span></div>
                  <div class="h-2 bg-dark-border rounded-full overflow-hidden"><div class="h-full bg-green-500 rounded-full" :style="{ width: `${(selectedPlayer.categoriesContributing || 0) / Math.max(relevantCategories.length, 1) * 100}%` }"></div></div>
                </div>
                <div>
                  <div class="flex justify-between text-sm mb-1"><span class="text-dark-textMuted">Position Scarcity ({{ rankingWeights.scarcity }}%)</span><span class="text-dark-text font-medium">{{ selectedPlayer.scarcityScore || 50 }}</span></div>
                  <div class="h-2 bg-dark-border rounded-full overflow-hidden"><div class="h-full bg-cyan-400 rounded-full" :style="{ width: `${selectedPlayer.scarcityScore || 50}%` }"></div></div>
                </div>
                <div>
                  <div class="flex justify-between text-sm mb-1"><span class="text-dark-textMuted">Consistency ({{ rankingWeights.consistency }}%)</span><span class="text-dark-text font-medium">50</span></div>
                  <div class="h-2 bg-dark-border rounded-full overflow-hidden"><div class="h-full bg-purple-400 rounded-full" style="width: 50%"></div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Team Detail Modal -->
    <div v-if="selectedTeam" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" @click.self="expandedTeamKey = null">
      <div class="bg-dark-elevated rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-dark-border">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-dark-border flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-xl bg-dark-border overflow-hidden" :class="selectedTeam.is_my_team ? 'ring-2 ring-yellow-400' : ''">
              <img :src="selectedTeam.logo_url || defaultLogo" :alt="selectedTeam.name" class="w-full h-full object-cover" @error="handleLogoError" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-xl font-bold text-dark-text">{{ selectedTeam.name }}</h3>
                <span v-if="selectedTeam.is_my_team" class="text-yellow-400">★</span>
              </div>
              <div class="text-sm text-dark-textMuted">Rank #{{ selectedTeam.overallRank || '-' }} • {{ selectedTeam.wins || 0 }}-{{ selectedTeam.losses || 0 }}</div>
            </div>
          </div>
          <button @click="expandedTeamKey = null" class="p-2 hover:bg-dark-border/50 rounded-lg transition-colors">
            <svg class="w-6 h-6 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <!-- Content -->
        <div class="p-6 overflow-y-auto max-h-[calc(90vh-100px)] space-y-6">
          <!-- Category Breakdown Table -->
          <div>
            <h4 class="font-semibold text-dark-text mb-3 flex items-center gap-2"><span>📊</span> Category Breakdown</h4>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-dark-border">
                    <th class="text-left py-2 px-3 text-dark-textMuted font-medium">Category</th>
                    <th class="text-center py-2 px-3 text-dark-textMuted font-medium">Total</th>
                    <th class="text-center py-2 px-3 text-dark-textMuted font-medium">Rank</th>
                    <th class="text-center py-2 px-3 text-dark-textMuted font-medium">Grade</th>
                    <th class="text-left py-2 px-3 text-dark-textMuted font-medium">Top Contributor</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-dark-border/30">
                  <tr v-for="cat in displayCategories" :key="cat.stat_id" class="hover:bg-dark-border/20">
                    <td class="py-2 px-3">
                      <span class="font-medium text-dark-text">{{ cat.display_name }}</span>
                      <span class="text-dark-textMuted ml-1">({{ cat.name }})</span>
                    </td>
                    <td class="py-2 px-3 text-center font-bold text-dark-text">
                      {{ formatTeamCategoryStat(selectedTeam.categoryTotals?.[cat.stat_id], cat) }}
                    </td>
                    <td class="py-2 px-3 text-center">
                      <span class="px-2 py-0.5 rounded text-xs font-bold" :class="getTeamRankBadgeClass(selectedTeam.categoryRanks?.[cat.stat_id])">
                        #{{ selectedTeam.categoryRanks?.[cat.stat_id] || '-' }}
                      </span>
                    </td>
                    <td class="py-2 px-3 text-center">
                      <span class="font-bold" :class="getTeamGradeColorClass(getTeamCategoryGrade(selectedTeam.categoryRanks?.[cat.stat_id]))">
                        {{ getTeamCategoryGrade(selectedTeam.categoryRanks?.[cat.stat_id]) }}
                      </span>
                    </td>
                    <td class="py-2 px-3">
                      <div v-if="selectedTeam.topContributors?.[cat.stat_id]" class="flex items-center gap-2">
                        <img :src="selectedTeam.topContributors[cat.stat_id].headshot || defaultHeadshot" class="w-6 h-6 rounded-full" @error="handleImageError" />
                        <span class="text-dark-text">{{ selectedTeam.topContributors[cat.stat_id].name }}</span>
                        <span class="text-yellow-400 font-medium">({{ formatTeamCategoryStat(selectedTeam.topContributors[cat.stat_id].value, cat) }})</span>
                      </div>
                      <span v-else class="text-dark-textMuted">-</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Trade Insights -->
          <div class="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-4 border border-purple-500/20">
            <h4 class="font-semibold text-dark-text mb-3 flex items-center gap-2"><span>💡</span> Trade Insights</h4>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <div class="text-xs text-dark-textMuted uppercase tracking-wider mb-2">Could Use</div>
                <div class="flex flex-wrap gap-2">
                  <span v-for="cat in (selectedTeam.weakestCategories || []).slice(0, 4)" :key="cat" class="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-medium">
                    {{ cat }}
                  </span>
                </div>
              </div>
              <div>
                <div class="text-xs text-dark-textMuted uppercase tracking-wider mb-2">Strong In</div>
                <div class="flex flex-wrap gap-2">
                  <span v-for="cat in (selectedTeam.strongestCategories || []).slice(0, 4)" :key="cat" class="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium">
                    {{ cat }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Player Swap Analysis Modal -->
    <div v-if="showSwapModal && swapSourcePlayer" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" @click.self="closeSwapModal">
      <div class="bg-dark-elevated rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden border border-dark-border">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-cyan-400/30 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-full bg-dark-border overflow-hidden ring-2 ring-cyan-400">
              <img :src="swapSourcePlayer.headshot || defaultHeadshot" :alt="swapSourcePlayer.full_name" class="w-full h-full object-cover" @error="handleImageError" />
            </div>
            <div>
              <h3 class="text-lg font-bold text-dark-text">Swap Analysis</h3>
              <div class="flex items-center gap-2 text-sm">
                <span class="text-cyan-400 font-semibold">{{ swapSourcePlayer.full_name }}</span>
                <span class="text-dark-textMuted">{{ swapSourcePlayer.mlb_team }}</span>
              </div>
            </div>
          </div>
          <button @click="closeSwapModal" class="p-2 hover:bg-dark-border/50 rounded-lg transition-colors">
            <svg class="w-6 h-6 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <!-- Content -->
        <div class="p-6 overflow-y-auto max-h-[calc(90vh-80px)] space-y-6">
          <!-- Source Player Stats -->
          <div class="bg-cyan-500/10 rounded-xl p-4 border border-cyan-500/20">
            <div class="flex items-center justify-between mb-3">
              <div class="text-sm font-semibold text-cyan-400">
                {{ swapSourcePlayer.fantasy_team_key === myTeamKey ? '⭐ Your Player' : '➕ Available Player' }}
              </div>
              <div class="text-xs text-dark-textMuted">
                {{ swapSourcePlayer.opponent || 'No game today' }}
              </div>
            </div>
            <div class="grid grid-cols-4 gap-3">
              <div v-for="cat in relevantStartSitCategories.slice(0, 4)" :key="cat.stat_id" class="text-center">
                <div class="text-lg font-bold text-dark-text">{{ formatCategoryProjection(swapSourcePlayer, cat) }}</div>
                <div class="text-[10px] text-dark-textMuted">{{ cat.display_name }}</div>
              </div>
            </div>
          </div>

          <!-- Select Player to Drop -->
          <div>
            <div class="text-sm font-semibold text-dark-text mb-3 flex items-center gap-2">
              <span class="text-yellow-400">🔄</span>
              {{ swapSourcePlayer.fantasy_team_key === myTeamKey ? 'Compare With' : 'Select Player to Drop' }}
            </div>
            <div class="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
              <div 
                v-for="player in getSwapCandidates()" 
                :key="player.player_key"
                @click="selectSwapTarget(player)"
                class="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                :class="selectedSwapTarget?.player_key === player.player_key 
                  ? 'bg-yellow-400/20 border-2 border-yellow-400' 
                  : 'bg-dark-border/30 border-2 border-transparent hover:border-dark-border'"
              >
                <div class="w-10 h-10 rounded-full bg-dark-border overflow-hidden ring-2 ring-yellow-400/50">
                  <img :src="player.headshot || defaultHeadshot" :alt="player.full_name" class="w-full h-full object-cover" @error="handleImageError" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-semibold text-dark-text text-sm truncate">{{ player.full_name }}</div>
                  <div class="text-xs text-dark-textMuted">{{ player.position }} • {{ player.mlb_team }}</div>
                </div>
                <div class="text-right">
                  <div class="text-sm font-bold text-yellow-400">{{ player.opponent || 'OFF' }}</div>
                  <div class="text-[10px] text-dark-textMuted">{{ player.hasGame ? 'Playing' : 'No game' }}</div>
                </div>
              </div>
              <div v-if="getSwapCandidates().length === 0" class="text-center py-4 text-dark-textMuted text-sm">
                No eligible players at this position
              </div>
            </div>
          </div>

          <!-- Impact Analysis -->
          <div v-if="selectedSwapTarget && swapImpact" class="space-y-4">
            <div class="text-sm font-semibold text-dark-text flex items-center gap-2">
              <span>📊</span> Matchup Impact
            </div>
            
            <!-- Summary -->
            <div class="grid grid-cols-3 gap-3">
              <div class="bg-dark-card rounded-xl p-3 text-center">
                <div class="text-2xl font-black" :class="swapImpact.netChange > 0 ? 'text-green-400' : swapImpact.netChange < 0 ? 'text-red-400' : 'text-dark-textMuted'">
                  {{ swapImpact.netChange > 0 ? '+' : '' }}{{ swapImpact.netChange.toFixed(1) }}
                </div>
                <div class="text-[10px] text-dark-textMuted">Net Category Change</div>
              </div>
              <div class="bg-dark-card rounded-xl p-3 text-center">
                <div class="text-2xl font-black text-green-400">{{ swapImpact.categoriesImproved }}</div>
                <div class="text-[10px] text-dark-textMuted">Categories Improved</div>
              </div>
              <div class="bg-dark-card rounded-xl p-3 text-center">
                <div class="text-2xl font-black text-red-400">{{ swapImpact.categoriesHurt }}</div>
                <div class="text-[10px] text-dark-textMuted">Categories Hurt</div>
              </div>
            </div>

            <!-- Category-by-Category -->
            <div class="bg-dark-card rounded-xl p-4">
              <div class="space-y-2">
                <div v-for="cat in swapImpact.categoryChanges" :key="cat.stat_id" class="flex items-center gap-2 text-xs">
                  <span class="w-10 font-medium text-dark-text">{{ cat.display_name }}</span>
                  <div class="flex-1 flex items-center gap-2">
                    <span class="text-dark-textMuted w-12 text-right">{{ cat.before }}</span>
                    <span class="text-dark-textMuted">→</span>
                    <span class="w-12" :class="cat.change > 0 ? 'text-green-400' : cat.change < 0 ? 'text-red-400' : 'text-dark-textMuted'">
                      {{ cat.after }}
                    </span>
                  </div>
                  <span class="w-12 text-right font-mono" :class="cat.change > 0 ? 'text-green-400' : cat.change < 0 ? 'text-red-400' : 'text-dark-textMuted'">
                    {{ cat.change > 0 ? '+' : '' }}{{ cat.changeDisplay }}
                  </span>
                  <span class="w-6 text-center">
                    <span v-if="cat.impact === 'flip-win'" class="text-green-400 text-sm">🔥</span>
                    <span v-else-if="cat.impact === 'flip-lose'" class="text-red-400 text-sm">⚠️</span>
                    <span v-else-if="cat.change > 0" class="text-green-400">↑</span>
                    <span v-else-if="cat.change < 0" class="text-red-400">↓</span>
                    <span v-else class="text-dark-textMuted">-</span>
                  </span>
                </div>
              </div>
            </div>

            <!-- Recommendation -->
            <div class="rounded-xl p-4" :class="swapImpact.recommendation === 'do-it' ? 'bg-green-500/10 border border-green-500/30' : swapImpact.recommendation === 'avoid' ? 'bg-red-500/10 border border-red-500/30' : 'bg-yellow-500/10 border border-yellow-500/30'">
              <div class="flex items-center gap-3">
                <span class="text-2xl">{{ swapImpact.recommendation === 'do-it' ? '✅' : swapImpact.recommendation === 'avoid' ? '❌' : '🤔' }}</span>
                <div>
                  <div class="font-semibold" :class="swapImpact.recommendation === 'do-it' ? 'text-green-400' : swapImpact.recommendation === 'avoid' ? 'text-red-400' : 'text-yellow-400'">
                    {{ swapImpact.recommendation === 'do-it' ? 'Make This Swap!' : swapImpact.recommendation === 'avoid' ? 'Avoid This Swap' : 'Consider Carefully' }}
                  </div>
                  <div class="text-xs text-dark-textMuted">{{ swapImpact.reason }}</div>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="!selectedSwapTarget" class="text-center py-6 text-dark-textMuted">
            Select a player above to see the matchup impact
          </div>
        </div>
      </div>
    </div>

    <!-- Drop Player Modal (for waiver pickups at roster limit) -->
    <div v-if="showDropModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70" @click.self="closeDropModal">
      <div class="bg-dark-card border border-dark-border rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <!-- Modal Header -->
        <div class="px-6 py-4 border-b border-dark-border bg-dark-border/20">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-bold text-dark-text">Select Player to Drop</h3>
              <p class="text-sm text-dark-textMuted mt-1">
                Adding <span class="text-cyan-400 font-semibold">{{ dropModalPlayer?.full_name }}</span> requires dropping a player
              </p>
            </div>
            <button @click="closeDropModal" class="text-dark-textMuted hover:text-dark-text transition-colors">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <!-- View Toggle -->
          <div class="flex items-center gap-4 mt-4">
            <span class="text-xs text-dark-textMuted uppercase">View:</span>
            <div class="flex items-center bg-dark-border/30 rounded-lg p-0.5">
              <button 
                @click="dropModalViewMode = 'projections'"
                class="px-3 py-1 text-xs font-medium rounded-md transition-colors"
                :class="dropModalViewMode === 'projections' ? 'bg-green-500 text-gray-900' : 'text-dark-textMuted hover:text-dark-text'"
              >
                Projections
              </button>
              <button 
                @click="dropModalViewMode = 'stats'"
                class="px-3 py-1 text-xs font-medium rounded-md transition-colors"
                :class="dropModalViewMode === 'stats' ? 'bg-blue-500 text-gray-900' : 'text-dark-textMuted hover:text-dark-text'"
              >
                Stats
              </button>
            </div>
          </div>
        </div>
        
        <!-- Player Comparison Header -->
        <div class="px-6 py-3 bg-dark-bg/50 border-b border-dark-border/50">
          <div class="grid grid-cols-12 gap-2 text-xs font-semibold text-dark-textMuted uppercase">
            <div class="col-span-4">Player</div>
            <template v-if="dropModalViewMode === 'projections'">
              <div class="col-span-2 text-center">Today</div>
              <div class="col-span-2 text-center">Next 7</div>
              <div class="col-span-2 text-center">Next 14</div>
              <div class="col-span-2 text-center">ROS</div>
            </template>
            <template v-else>
              <div class="col-span-2 text-center">Last 7</div>
              <div class="col-span-2 text-center">Last 14</div>
              <div class="col-span-2 text-center">Season</div>
              <div class="col-span-2 text-center">Value</div>
            </template>
          </div>
        </div>
        
        <!-- Pickup Player Row (for comparison) -->
        <div class="px-6 py-3 bg-cyan-500/10 border-b border-cyan-500/30">
          <div class="grid grid-cols-12 gap-2 items-center">
            <div class="col-span-4 flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-dark-border overflow-hidden ring-2 ring-cyan-400">
                <img :src="dropModalPlayer?.headshot || defaultHeadshot" class="w-full h-full object-cover" @error="handleImageError" />
              </div>
              <div>
                <div class="font-semibold text-cyan-400">{{ dropModalPlayer?.full_name }}</div>
                <div class="text-xs text-dark-textMuted">{{ dropModalPlayer?.position?.split(',')[0] }} • {{ dropModalPlayer?.mlb_team || 'FA' }} <span class="text-cyan-400">(PICKUP)</span></div>
              </div>
            </div>
            <template v-if="dropModalViewMode === 'projections'">
              <div class="col-span-2 text-center font-bold text-cyan-400">{{ (dropModalPlayer?.projectedValue / 10 || 0).toFixed(1) }}</div>
              <div class="col-span-2 text-center font-bold text-cyan-400">{{ (dropModalPlayer?.projectedValue / 3 || 0).toFixed(1) }}</div>
              <div class="col-span-2 text-center font-bold text-cyan-400">{{ (dropModalPlayer?.projectedValue / 1.5 || 0).toFixed(1) }}</div>
              <div class="col-span-2 text-center font-bold text-cyan-400">{{ dropModalPlayer?.projectedValue?.toFixed(1) || '0' }}</div>
            </template>
            <template v-else>
              <div class="col-span-2 text-center font-bold text-cyan-400">{{ (dropModalPlayer?.currentValue / 3 || 0).toFixed(1) }}</div>
              <div class="col-span-2 text-center font-bold text-cyan-400">{{ (dropModalPlayer?.currentValue / 1.5 || 0).toFixed(1) }}</div>
              <div class="col-span-2 text-center font-bold text-cyan-400">{{ dropModalPlayer?.currentValue?.toFixed(1) || '0' }}</div>
              <div class="col-span-2 text-center font-bold text-cyan-400">{{ dropModalPlayer?.overallValue?.toFixed(0) || '0' }}</div>
            </template>
          </div>
        </div>
        
        <!-- Droppable Players List -->
        <div class="max-h-80 overflow-y-auto">
          <div 
            v-for="player in droppablePlayers" 
            :key="player.player_key"
            class="px-6 py-3 border-b border-dark-border/30 hover:bg-dark-border/20 cursor-pointer transition-colors"
            :class="{ 'bg-red-500/10 border-red-500/30': selectedDropPlayer?.player_key === player.player_key }"
            @click="selectedDropPlayer = player"
          >
            <div class="grid grid-cols-12 gap-2 items-center">
              <div class="col-span-4 flex items-center gap-3">
                <div class="relative">
                  <div class="w-10 h-10 rounded-full bg-dark-border overflow-hidden" :class="selectedDropPlayer?.player_key === player.player_key ? 'ring-2 ring-red-400' : ''">
                    <img :src="player.headshot || defaultHeadshot" class="w-full h-full object-cover" @error="handleImageError" />
                  </div>
                  <div v-if="selectedDropPlayer?.player_key === player.player_key" class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <span class="text-xs text-white font-bold">✓</span>
                  </div>
                </div>
                <div>
                  <div class="font-semibold text-dark-text">{{ player.full_name }}</div>
                  <div class="text-xs text-dark-textMuted">{{ player.position?.split(',')[0] }} • {{ player.mlb_team || 'FA' }}</div>
                </div>
              </div>
              <template v-if="dropModalViewMode === 'projections'">
                <div class="col-span-2 text-center font-bold text-dark-text">{{ (player.projectedValue / 10 || 0).toFixed(1) }}</div>
                <div class="col-span-2 text-center font-bold text-dark-text">{{ (player.projectedValue / 3 || 0).toFixed(1) }}</div>
                <div class="col-span-2 text-center font-bold text-dark-text">{{ (player.projectedValue / 1.5 || 0).toFixed(1) }}</div>
                <div class="col-span-2 text-center font-bold text-dark-text">{{ player.projectedValue?.toFixed(1) || '0' }}</div>
              </template>
              <template v-else>
                <div class="col-span-2 text-center font-bold text-dark-text">{{ (player.currentValue / 3 || 0).toFixed(1) }}</div>
                <div class="col-span-2 text-center font-bold text-dark-text">{{ (player.currentValue / 1.5 || 0).toFixed(1) }}</div>
                <div class="col-span-2 text-center font-bold text-dark-text">{{ player.currentValue?.toFixed(1) || '0' }}</div>
                <div class="col-span-2 text-center font-bold text-dark-text">{{ player.overallValue?.toFixed(0) || '0' }}</div>
              </template>
            </div>
          </div>
        </div>
        
        <!-- Modal Footer -->
        <div class="px-6 py-4 border-t border-dark-border bg-dark-border/20 flex items-center justify-between">
          <button @click="closeDropModal" class="px-4 py-2 text-dark-textMuted hover:text-dark-text transition-colors">
            Cancel
          </button>
          <button 
            @click="confirmDrop"
            :disabled="!selectedDropPlayer"
            :class="selectedDropPlayer ? 'bg-cyan-500 hover:bg-cyan-600 text-gray-900' : 'bg-dark-border text-dark-textMuted cursor-not-allowed'"
            class="px-6 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2"
          >
            <span>Add {{ dropModalPlayer?.full_name?.split(' ')[1] }}</span>
            <span v-if="selectedDropPlayer">& Drop {{ selectedDropPlayer.full_name?.split(' ')[1] }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Platform Badge -->
    <div class="flex justify-center mt-8">
      <div v-if="isEspn" class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#5b8def]/10 border border-[#5b8def]/30">
        <img src="/espn-logo.svg" alt="ESPN" class="w-5 h-5" />
        <span class="text-sm text-[#5b8def]">ESPN Fantasy Baseball • H2H Categories</span>
      </div>
      <div v-else class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-600/10 border border-purple-600/30">
        <img src="/yahoo-fantasy.svg" alt="Yahoo" class="w-5 h-5" />
        <span class="text-sm text-purple-300">Yahoo Fantasy Baseball • H2H Categories</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { usePlatformsStore } from '@/stores/platforms'
import { yahooService } from '@/services/yahoo'
import { espnService } from '@/services/espn'
import { useFeatureAccess } from '@/composables/useFeatureAccess'
import SimulatedDataBanner from '@/components/SimulatedDataBanner.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import CategoryRankingCustomizer from '@/components/CategoryRankingCustomizer.vue'
import { liveGamesService, type LiveGame } from '@/services/live-games'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { 
  DEFAULT_CATEGORY_ROS_FACTORS, 
  CATEGORY_ROS_PRESETS,
  type CategoryRankingFactor,
  type CategoryRankingPreset 
} from '@/services/categoryRankingFactors'

// ===== TEAM CORRECTION SERVICE (INLINE) =====
// Fixes incorrect team codes from ESPN/Yahoo APIs

// NBA Player to Team Mappings (2025-26 Season)
const nbaPlayerTeamMappings: Record<string, string> = {
  "Precious Achiuwa": "NYK", "Bam Adebayo": "MIA", "Steven Adams": "HOU",
  "LaMelo Ball": "CHA", "Lonzo Ball": "CHI", "Paolo Banchero": "ORL",
  "Scottie Barnes": "TOR", "Desmond Bane": "MEM", "RJ Barrett": "TOR",
  "Keegan Murray": "SAC", "Dejounte Murray": "NOP", "Jamal Murray": "DEN",
  "Giannis Antetokounmpo": "MIL", "OG Anunoby": "NYK", "Cole Anthony": "ORL",
  "Wendell Carter Jr.": "ORL", "Alex Caruso": "OKC", "Jimmy Butler": "MIA",
  "Jalen Brunson": "NYK", "Jaylen Brown": "BOS", "Brook Lopez": "MIL",
  "Anthony Davis": "LAL", "DeMar DeRozan": "SAC", "Luka Doncic": "DAL",
  "Kevin Durant": "PHX", "Anthony Edwards": "MIN", "Joel Embiid": "PHI",
  "De'Andre Hunter": "ATL", "Trae Young": "ATL", "Kyrie Irving": "DAL",
  "LeBron James": "LAL", "Jaren Jackson Jr.": "MEM", "Nikola Jokic": "DEN",
  "Nikola Jovic": "MIA", "Tyrese Haliburton": "IND", "James Harden": "LAC",
  "Tyler Herro": "MIA", "Buddy Hield": "GSW", "Jrue Holiday": "BOS",
  "Brandon Ingram": "NOP", "Derrick Jones Jr.": "LAC", "Tyrese Maxey": "PHI",
  "CJ McCollum": "NOP", "Donovan Mitchell": "CLE", "Ja Morant": "MEM",
  "Kawhi Leonard": "LAC", "Damian Lillard": "MIL", "Karl-Anthony Towns": "NYK",
  "Myles Turner": "IND", "Jonas Valanciunas": "WAS", "Nikola Vucevic": "CHI",
  "Russell Westbrook": "DEN", "Zion Williamson": "NOP", "Chet Holmgren": "OKC",
  "Shai Gilgeous-Alexander": "OKC", "Darius Garland": "CLE", "Evan Mobley": "CLE",
  "Jarrett Allen": "CLE", "Alperen Sengun": "HOU", "Pascal Siakam": "IND",
  "Ben Simmons": "BKN", "Jalen Smith": "CHI", "Marcus Smart": "MEM",
  "Jayson Tatum": "BOS", "Klay Thompson": "DAL", "Franz Wagner": "ORL",
  "Derrick White": "BOS", "Jalen Williams": "OKC", "Zach LaVine": "CHI",
  "Devin Booker": "PHX", "Bradley Beal": "PHX", "Chris Paul": "SAS",
  "Draymond Green": "GSW", "Stephen Curry": "GSW", "Andrew Wiggins": "GSW",
  "Jordan Poole": "WAS", "Kristaps Porzingis": "BOS", "Al Horford": "BOS",
  "Malcolm Brogdon": "WAS", "Bennedict Mathurin": "IND", "Obi Toppin": "IND",
  "Rui Hachimura": "LAL", "Austin Reaves": "LAL", "D'Angelo Russell": "LAL",
  "Jarred Vanderbilt": "LAL", "Christian Wood": "LAL", "Paul George": "PHI",
  "Tobias Harris": "DET", "Kelly Oubre Jr.": "PHI", "Nicolas Batum": "LAC",
  "Norman Powell": "LAC", "Ivica Zubac": "LAC", "Bones Hyland": "LAC",
  "Victor Wembanyama": "SAS", "Devin Vassell": "SAS", "Keldon Johnson": "SAS",
  "Jeremy Sochan": "SAS", "Tre Jones": "SAS", "Lauri Markkanen": "UTA",
  "Jordan Clarkson": "UTA", "Collin Sexton": "UTA", "Walker Kessler": "UTA",
  "John Collins": "UTA", "Scoot Henderson": "POR", "Anfernee Simons": "POR",
  "Jerami Grant": "POR", "Deandre Ayton": "POR", "Shaedon Sharpe": "POR",
  "Brandon Miller": "CHA", "Miles Bridges": "CHA", "Terry Rozier": "MIA",
  "Gordon Hayward": "OKC", "Cade Cunningham": "DET", "Jaden Ivey": "DET",
  "Ausar Thompson": "DET", "Isaiah Stewart": "DET", "Jalen Duren": "DET",
  "Bojan Bogdanovic": "BKN", "Marcus Sasser": "DET", "Killian Hayes": "BKN",
  "Donte DiVincenzo": "MIN", "Julius Randle": "MIN", "Rudy Gobert": "MIN",
  "Mike Conley": "MIN", "Naz Reid": "MIN", "Kyle Anderson": "GSW",
  "Trayce Jackson-Davis": "GSW", "Jonathan Kuminga": "GSW", "Moses Moody": "GSW",
  "Gary Payton II": "GSW", "De'Anthony Melton": "GSW", "Kevon Looney": "GSW"
}

// Team Correction Service
function correctPlayerTeam(player: any, sport: string): any {
  if (!player || sport !== 'basketball') return player
  
  const playerName = player.full_name || player.name
  const currentTeamCode = player.mlb_team || player.nba_team || player.nhl_team || 
                         player.editorial_team_abbr || player.team_abbr
  
  // Check if we have a mapping for this player
  if (nbaPlayerTeamMappings[playerName]) {
    const correctTeam = nbaPlayerTeamMappings[playerName]
    
    // Log correction if different
    if (currentTeamCode && currentTeamCode !== correctTeam) {
      console.log(`[TeamCorrection] Fixed ${playerName}: ${currentTeamCode} -> ${correctTeam}`)
    }
    
    return {
      ...player,
      nba_team: correctTeam,
      mlb_team: undefined,
      nhl_team: undefined,
      correctedTeam: true
    }
  }
  
  // Check if current code is obviously wrong (NFL/MLB code for NBA)
  const invalidNBACodes = ['PIT', 'TEN', 'CAR', 'NE', 'FA', 'GB', 'KC', 'BAL', 'CIN', 'JAX', 'TB', 'ARI', 'SEA', 'LAR', 'SF']
  if (currentTeamCode && invalidNBACodes.includes(currentTeamCode)) {
    console.warn(`[TeamCorrection] Invalid NBA code for ${playerName}: ${currentTeamCode} (no mapping available)`)
    return {
      ...player,
      nba_team: null,
      mlb_team: undefined,
      nhl_team: undefined
    }
  }
  
  return player
}

function correctPlayerTeams(players: any[], sport: string): any[] {
  if (sport !== 'basketball') return players
  return players.map(p => correctPlayerTeam(p, sport))
}
// ===== END TEAM CORRECTION SERVICE =====

const leagueStore = useLeagueStore()
const { hasPremiumAccess } = useFeatureAccess()

// Platform detection - check both activePlatform AND league ID format for robustness
const isEspn = computed(() => {
  const byPlatform = leagueStore.activePlatform === 'espn'
  const byLeagueId = leagueStore.activeLeagueId?.startsWith('espn_') || false
  console.log('[CategoryProjections] isEspn check:', { byPlatform, byLeagueId, activeLeagueId: leagueStore.activeLeagueId, activePlatform: leagueStore.activePlatform })
  return byPlatform || byLeagueId
})

// Season detection for offseason banner
const currentSeason = computed(() => leagueStore.currentLeague?.season || new Date().getFullYear().toString())
const isSeasonComplete = computed(() => {
  if (leagueStore.currentLeague?.status === 'complete') return true
  const yahooLeague = Array.isArray(leagueStore.yahooLeague) ? leagueStore.yahooLeague[0] : leagueStore.yahooLeague
  return yahooLeague?.is_finished === 1
})

// Parse ESPN league key
function parseEspnLeagueKey(leagueKey: string): { leagueId: string; season: number; sport: string } {
  const parts = leagueKey.split('_')
  return {
    sport: parts[1] || 'baseball',
    leagueId: parts[2] || '',
    season: parseInt(parts[3]) || new Date().getFullYear()
  }
}

// Detect sport from Yahoo game key
// Yahoo game keys map to specific sports - these are the known mappings
function detectSportFromGameKey(gameKey: string): string | null {
  const key = parseInt(gameKey)
  if (!key) return null
  
  // Basketball (NBA) game keys
  const basketballKeys = [428, 418, 410, 402, 395, 385, 375, 364, 353, 340, 322, 304, 282, 265, 249]
  if (basketballKeys.includes(key)) return 'basketball'
  
  // Hockey (NHL) game keys
  const hockeyKeys = [427, 419, 411, 403, 396, 386, 376, 365, 354, 341, 321, 303, 281]
  if (hockeyKeys.includes(key)) return 'hockey'
  
  // Football (NFL) game keys
  const footballKeys = [449, 423, 414, 390, 371, 399, 380, 359, 348, 331, 314, 299, 273, 257, 242, 222]
  if (footballKeys.includes(key)) return 'football'
  
  // Baseball (MLB) game keys
  const baseballKeys = [458, 431, 422, 412, 404, 398, 388, 378, 370, 357, 346, 328, 308, 283, 268, 253]
  if (baseballKeys.includes(key)) return 'baseball'
  
  return null
}

const isLoading = ref(true)
const loadingMessage = ref('Loading...')
const loadingProgress = ref({
  currentStep: '',
  week: 0,
  maxWeek: 0
})

// Live games state
const todaysGames = ref<LiveGame[]>([])
const tomorrowsGames = ref<LiveGame[]>([])
const liveGamesSubscription = ref<RealtimeChannel | null>(null)
const gamesLoading = ref(false)
const scraperHealth = ref<Record<string, any>>({})

const statCategories = ref<any[]>([])
const selectedCategory = ref<string>('')
const allPlayers = ref<any[]>([])
const teamsData = ref<any[]>([])
const myTeamKey = ref<string | null>(null)
const selectedPositions = ref<string[]>([])
const showOnlyMyPlayers = ref(false)
const showOnlyFreeAgents = ref(false)
const expandedPlayerKey = ref<string | null>(null)
const sortColumn = ref<string>('rank')
const sortDirection = ref<'asc' | 'desc'>('asc')
const currentSport = ref<string>('baseball')
const leagueRosterPositions = ref<any[]>([]) // Actual roster positions from league settings
const totalRosterSlots = computed(() => {
  if (!leagueRosterPositions.value || leagueRosterPositions.value.length === 0) {
    const sport = currentSport.value
    if (sport === 'basketball') return 13
    if (sport === 'hockey') return 16
    if (sport === 'baseball') return 26
    return 25
  }
  
  let count = 0
  for (const rp of leagueRosterPositions.value) {
    const posValue = typeof rp === 'string' ? rp : (rp.position || rp.abbr || rp.display_name || '')
    if (typeof posValue === 'string') {
      const pos = posValue.toUpperCase()
      if (pos !== 'BN' && pos !== 'IL' && pos !== 'IR' && pos !== 'BENCH') {
        count++
      }
    }
  }
  
  console.log('[totalRosterSlots] Calculated:', count, 'from positions:', leagueRosterPositions.value)
  return count || 25
})

// Sport-specific headshot URL generation
function getEspnHeadshotUrl(playerId: string | number, sport: string): string {
  if (!playerId) return getDefaultHeadshot(sport)
  // ESPN uses different paths for different sports
  const sportPath = sport === 'hockey' ? 'nhl' : sport === 'basketball' ? 'nba' : sport === 'football' ? 'nfl' : 'mlb'
  return `https://a.espncdn.com/combiner/i?img=/i/headshots/${sportPath}/players/full/${playerId}.png&w=96&h=70&cb=1`
}

function getDefaultHeadshot(sport?: string): string {
  const s = sport || currentSport.value
  if (s === 'hockey') return 'https://a.espncdn.com/combiner/i?img=/i/headshots/nophoto.png&w=96&h=70'
  if (s === 'basketball') return 'https://a.espncdn.com/combiner/i?img=/i/headshots/nophoto.png&w=96&h=70'
  if (s === 'football') return 'https://a.espncdn.com/combiner/i?img=/i/headshots/nophoto.png&w=96&h=70'
  return 'https://s.yimg.com/cv/apiv2/default/mlb/mlb_default_player_v2.png'
}

function getDefaultLogo(sport?: string): string {
  const s = sport || currentSport.value
  if (s === 'hockey') return 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/nhl/500/default.png&w=72&h=72'
  if (s === 'basketball') return 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/nba/500/default.png&w=72&h=72'
  if (s === 'football') return 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/nfl/500/default.png&w=72&h=72'
  return 'https://s.yimg.com/cv/apiv2/default/mlb/mlb_dp_2_72.png'
}

// Ranking customization - factor-based like Power Rankings
const showRankingSettings = ref(false)

// Use imported types from categoryRankingFactors service
const rosRankingFactors = ref<CategoryRankingFactor[]>(JSON.parse(JSON.stringify(DEFAULT_CATEGORY_ROS_FACTORS)))

// Use imported presets from categoryRankingFactors service
const rosRankingPresets = CATEGORY_ROS_PRESETS

const currentPresetId = ref<string | null>('balanced')

// Load saved factors from localStorage
const loadSavedWeights = () => {
  try {
    const saved = localStorage.getItem('rosRankingFactors')
    if (saved) {
      const parsed = JSON.parse(saved)
      rosRankingFactors.value = parsed
      // Check if it matches any preset
      updateCurrentPreset()
    }
  } catch (e) { console.error('Error loading ranking factors:', e) }
}

const saveWeights = () => {
  try {
    localStorage.setItem('rosRankingFactors', JSON.stringify(rosRankingFactors.value))
    updateCurrentPreset()
  } catch (e) { console.error('Error saving ranking factors:', e) }
}

const resetWeights = () => {
  rosRankingFactors.value = JSON.parse(JSON.stringify(DEFAULT_CATEGORY_ROS_FACTORS))
  currentPresetId.value = 'balanced'
  saveWeights()
}

const applyPreset = (preset: CategoryRankingPreset) => {
  rosRankingFactors.value.forEach(factor => {
    const presetFactor = preset.factors[factor.id]
    if (presetFactor) {
      factor.enabled = presetFactor.enabled
      factor.weight = presetFactor.weight
    } else {
      factor.enabled = false
      factor.weight = 0
    }
  })
  currentPresetId.value = preset.id
  saveWeights()
}

const updateCurrentPreset = () => {
  // Check if current factors match any preset
  for (const preset of rosRankingPresets) {
    let matches = true
    for (const factor of rosRankingFactors.value) {
      const presetFactor = preset.factors[factor.id]
      if (!presetFactor || presetFactor.enabled !== factor.enabled || presetFactor.weight !== factor.weight) {
        matches = false
        break
      }
    }
    if (matches) {
      currentPresetId.value = preset.id
      return
    }
  }
  currentPresetId.value = null // Custom
}

const onFactorChange = () => {
  saveWeights()
}

// Handler for when ranking factors are applied from the customizer
const onRankingFactorsApplied = () => {
  saveWeights()
  // Optionally trigger a re-sort or refresh of the rankings
  console.log('[CategoryProjections] Ranking factors applied:', rosRankingFactors.value.filter(f => f.enabled).map(f => f.name).join(', '))
}

const totalWeight = computed(() => {
  return rosRankingFactors.value.filter(f => f.enabled).reduce((sum, f) => sum + f.weight, 0)
})

// Helper to get weights for calculations
const rankingWeights = computed(() => {
  const factors: Record<string, number> = {}
  rosRankingFactors.value.forEach(f => {
    factors[f.id] = f.enabled ? f.weight : 0
  })
  return factors
})

// Tab state
const activeTab = ref<'ros' | 'teams' | 'startsit' | 'trade'>('ros')
const teamsViewMode = ref<'grid' | 'table'>('grid')
const expandedTeamKey = ref<string | null>(null)

// Start/Sit state
const startSitMode = ref<'daily' | 'weekly'>('daily')
const startSitDay = ref<'today' | 'tomorrow'>('today')

// Debug: Show what date we're actually requesting
const requestedGameDate = computed(() => {
  const now = new Date()
  const target = startSitDay.value === 'today' ? now : new Date(now.getTime() + 86400000)
  return target.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
})

const selectedStartSitPosition = ref('C')
const availableSortColumn = ref<string>('value') // Default sort by value
const availableSortDirection = ref<'asc' | 'desc'>('desc') // Default descending
const currentMatchupWeek = ref(1)
const currentMatchup = ref<any>(null)
const startSitPlayerFilter = ref<'all' | 'mine' | 'fa'>('all')
const commandCenterView = ref<'lineup' | 'available' | 'moves'>('lineup') // New: Daily Command Center view switcher

// Watch for view changes - reload games when switching to Available to ensure fresh data
watch(commandCenterView, async (newView) => {
  if (newView === 'available') {
    console.log('[Watch] Switched to Available view - reloading games to ensure fresh data')
    await loadLiveGames()
  }
})

// Watch for day changes - reload games when switching between Today/Tomorrow
watch(startSitDay, async (newDay) => {
  console.log(`[Watch] Day changed to ${newDay} - reloading games`)
  await loadLiveGames()
})

// Enhanced Start/Sit features
const startSitTimePeriod = ref<'today' | 'next7' | 'next14' | 'ros'>('today')
const startSitViewMode = ref<'projections' | 'stats'>('projections')
const availableTimePeriod = ref<'today' | 'next7' | 'next14' | 'ros' | 'last7' | 'last14' | 'season'>('today')
const waiverLineupPlayers = ref<any[]>([])  // Players added from FA for comparison
const currentMatchupData = ref<any>(null)  // Real matchup data from Yahoo API
const isLoadingMatchup = ref(false)
const showDropModal = ref(false)
const dropModalPlayer = ref<any>(null)
const selectedDropPlayer = ref<any>(null)
const dropModalViewMode = ref<'projections' | 'stats'>('projections')

// New modal states
const showPositionPickerModal = ref(false)
const positionPickerPosition = ref<string>('')
const showPlayerAnalysisModal = ref(false)
const showPlayerComparisonModal = ref(false)
const comparisonPlayerAdd = ref<any>(null)
const comparisonPlayerDrop = ref<any>(null)
const comparisonSelectedCategory = ref<string>('')
const playerAnalysisData = ref<any>(null)
const showMatchupAnalysisModal = ref(false)

// Roster limits - loaded from platform
const rosterLimits = ref({
  maxRosterSize: 25,
  currentRosterSize: 0,
  irSpots: 0,
  usedIrSpots: 0
})

// Player swap state
const swapSourcePlayer = ref<any>(null)  // Player to potentially add
const showSwapModal = ref(false)
const swapImpact = ref<any>(null)  // Calculated impact of swap
const selectedSwapTarget = ref<any>(null)  // Player on my team to drop

// Trade analyzer state
const tradePartnerKey = ref<string>('')
const tradeGivePlayers = ref<any[]>([])  // Array of players to give
const tradeGetPlayers = ref<any[]>([])   // Array of players to get
const tradeGiveSearch = ref('')
const tradeGetSearch = ref('')
const tradeGivePositionFilter = ref<string>('all')
const tradeGetPositionFilter = ref<string>('all')
const tradeGiveSortBy = ref<string>('value')  // 'value', 'position', or a stat_id
const tradeGetSortBy = ref<string>('value')   // 'value', 'position', or a stat_id
const tradeAnalysis = ref<any>(null)
const showValueExplanation = ref(false)

// Position options for trade filter - sport-aware
const tradePositionOptions = computed(() => {
  const sport = currentSport.value
  
  if (sport === 'basketball') {
    return [
      { id: 'all', label: 'All Positions' },
      { id: 'PG', label: 'Point Guard' },
      { id: 'SG', label: 'Shooting Guard' },
      { id: 'SF', label: 'Small Forward' },
      { id: 'PF', label: 'Power Forward' },
      { id: 'C', label: 'Center' },
      { id: 'G', label: 'Guard' },
      { id: 'F', label: 'Forward' }
    ]
  }
  
  if (sport === 'hockey') {
    return [
      { id: 'all', label: 'All Positions' },
      { id: 'C', label: 'Center' },
      { id: 'LW', label: 'Left Wing' },
      { id: 'RW', label: 'Right Wing' },
      { id: 'D', label: 'Defense' },
      { id: 'G', label: 'Goalie' }
    ]
  }
  
  if (sport === 'football') {
    return [
      { id: 'all', label: 'All Positions' },
      { id: 'QB', label: 'Quarterback' },
      { id: 'RB', label: 'Running Back' },
      { id: 'WR', label: 'Wide Receiver' },
      { id: 'TE', label: 'Tight End' },
      { id: 'K', label: 'Kicker' },
      { id: 'DEF', label: 'Defense' }
    ]
  }
  
  // Baseball (default)
  return [
    { id: 'all', label: 'All Positions' },
    { id: 'C', label: 'Catcher' },
    { id: '1B', label: 'First Base' },
    { id: '2B', label: 'Second Base' },
    { id: '3B', label: 'Third Base' },
    { id: 'SS', label: 'Shortstop' },
    { id: 'OF', label: 'Outfield' },
    { id: 'SP', label: 'Starting Pitcher' },
    { id: 'RP', label: 'Relief Pitcher' }
  ]
})

// Start/Sit positions - sport-aware
const startSitPositions = computed(() => {
  const sport = currentSport.value
  
  if (sport === 'basketball') {
    return [
      { id: 'PG', label: 'PG' },
      { id: 'SG', label: 'SG' },
      { id: 'SF', label: 'SF' },
      { id: 'PF', label: 'PF' },
      { id: 'C', label: 'C' },
      { id: 'G', label: 'G' },
      { id: 'F', label: 'F' },
      { id: 'Util', label: 'Util' }
    ]
  }
  
  if (sport === 'hockey') {
    return [
      { id: 'C', label: 'C' },
      { id: 'LW', label: 'LW' },
      { id: 'RW', label: 'RW' },
      { id: 'D', label: 'D' },
      { id: 'G', label: 'G' },
      { id: 'Util', label: 'Util' }
    ]
  }
  
  if (sport === 'football') {
    return [
      { id: 'QB', label: 'QB' },
      { id: 'RB', label: 'RB' },
      { id: 'WR', label: 'WR' },
      { id: 'TE', label: 'TE' },
      { id: 'K', label: 'K' },
      { id: 'DEF', label: 'DEF' },
      { id: 'Flex', label: 'Flex' }
    ]
  }
  
  // Baseball (default)
  return [
    { id: 'C', label: 'C' },
    { id: '1B', label: '1B' },
    { id: '2B', label: '2B' },
    { id: '3B', label: '3B' },
    { id: 'SS', label: 'SS' },
    { id: 'OF', label: 'OF' },
    { id: 'SP', label: 'SP' },
    { id: 'RP', label: 'RP' }
  ]
})

// Chart state
const chartCategory = ref<string>('')
const recentPerformances = ref<any[]>([])
const isLoadingChart = ref(false)

// Default images are now computed based on current sport
const defaultHeadshot = computed(() => getDefaultHeadshot())
const defaultLogo = computed(() => getDefaultLogo())

const columnTooltips = computed(() => ({
  rank: 'Player rank in this category based on projected ROS performance',
  player: 'Player name, MLB team, and fantasy team owner',
  position: 'Primary fielding position',
  rosProj: 'Rest of Season Projection: Current stats + (per-game rate × remaining games)',
  current: 'Current season total for this category',
  perGame: 'Average production per game this season',
  value: `Overall Value Score (0-100) combining: Category Rank (${rankingWeights.value.categoryRank}%), Multi-Category (${rankingWeights.value.multiCategory}%), Scarcity (${rankingWeights.value.scarcity}%), Consistency (${rankingWeights.value.consistency}%)`
}))

// Stat detection - use names instead of hardcoded IDs since IDs vary by league
// Baseball pitching stats
const baseballPitchingStatNames = ['ERA', 'WHIP', 'W', 'SV', 'K', 'IP', 'QS', 'HLD', 'Wins', 'Saves', 'Strikeouts', 'Innings', 'Quality', 'Holds', 'L', 'Losses', 'BB', 'Walks', 'CG', 'SHO', 'BSV', 'Blown']
// Hockey goalie stats (these are the "pitching" equivalent for hockey)
const hockeyGoalieStatNames = ['GAA', 'SV%', 'SO', 'Shutouts', 'Saves', 'Goals Against', 'Goalie', 'GW', 'GA', 'MIN', 'GS', 'SA']
const ratioStatNames = ['ERA', 'WHIP', 'AVG', 'OPS', 'OBP', 'SLG', 'BABIP', 'K/9', 'BB/9', 'K/BB', 'GAA', 'SV%', 'SH%', 'FG%', 'FT%', '3P%', 'FGA', 'FTA']
const lowerIsBetterNames = ['ERA', 'WHIP', 'BB', 'L', 'ER', 'H', 'Losses', 'Walks', 'GAA', 'GA', 'GV']

function isPitchingStat(cat: any): boolean {
  if (!cat) return false
  const name = (cat.name || '').toUpperCase()
  const display = (cat.display_name || '').toUpperCase()
  
  // For basketball, there's no pitcher/hitter distinction - all stats are for all players
  if (currentSport.value === 'basketball') {
    return false // Never treat any basketball stat as "pitching"
  }
  
  // For football, there's no pitcher/hitter distinction either
  if (currentSport.value === 'football') {
    return false // Never treat any football stat as "pitching"
  }
  
  // For hockey, use goalie stat names
  if (currentSport.value === 'hockey') {
    return hockeyGoalieStatNames.some(gn => name.includes(gn.toUpperCase()) || display.includes(gn.toUpperCase()))
  }
  
  // Baseball (default)
  return baseballPitchingStatNames.some(pn => name.includes(pn.toUpperCase()) || display.includes(pn.toUpperCase()))
}

function isRatioStat(cat: any): boolean {
  if (!cat) return false
  const name = (cat.name || '').toUpperCase()
  const display = (cat.display_name || '').toUpperCase()
  return ratioStatNames.some(rn => name.includes(rn.toUpperCase()) || display.includes(rn.toUpperCase()))
}

function isPercentageStat(cat: any): boolean {
  if (!cat) return false
  const name = (cat.name || '').toUpperCase()
  const display = (cat.display_name || '').toUpperCase()
  return name.includes('FG%') || name.includes('FT%') || name.includes('3P%') || 
         display.includes('FG%') || display.includes('FT%') || display.includes('3P%') ||
         name.includes('FIELD GOAL') || name.includes('FREE THROW') || name.includes('THREE POINT')
}

function isLowerBetterStat(cat: any): boolean {
  if (!cat) return false
  const name = (cat.name || '').toUpperCase()
  const display = (cat.display_name || '').toUpperCase()
  return lowerIsBetterNames.some(ln => name.includes(ln.toUpperCase()) || display.includes(ln.toUpperCase()))
}

const displayCategories = computed(() => statCategories.value.filter(c => !c.is_only_display_stat && c.stat_id))
const hittingCategories = computed(() => displayCategories.value.filter(c => !isPitchingStat(c)))
const pitchingCategories = computed(() => displayCategories.value.filter(c => isPitchingStat(c)))
const selectedCategoryInfo = computed(() => displayCategories.value.find(c => c.stat_id === selectedCategory.value))

const isPitchingCategory = computed(() => {
  const cat = selectedCategoryInfo.value
  return isPitchingStat(cat)
})

const isRatioCategory = computed(() => { 
  const cat = selectedCategoryInfo.value
  return isRatioStat(cat)
})

const isLowerBetter = computed(() => { 
  const cat = selectedCategoryInfo.value
  return isLowerBetterStat(cat)
})

// Sport-aware category type label
const categoryTypeLabel = computed(() => {
  const sport = currentSport.value
  if (sport === 'hockey') {
    return isPitchingCategory.value ? 'Goalie' : 'Skater'
  }
  // Baseball (default)
  return isPitchingCategory.value ? 'Pitching' : 'Hitting'
})

// Sport-aware category group labels for dropdown
const skaterCategoryLabel = computed(() => {
  const sport = currentSport.value
  if (sport === 'hockey') return 'Skater Stats'
  if (sport === 'basketball') return 'Player Stats'
  if (sport === 'football') return 'Offensive Stats'
  return 'Hitting'
})

const goalieCategoryLabel = computed(() => {
  const sport = currentSport.value
  if (sport === 'hockey') return 'Goalie Stats'
  if (sport === 'basketball') return 'Advanced Stats'
  if (sport === 'football') return 'Defensive/Special Teams'
  return 'Pitching'
})

const relevantCategories = computed(() => isPitchingCategory.value ? pitchingCategories.value : hittingCategories.value)

// Sport-specific position filters
const availablePositions = computed(() => {
  const sport = currentSport.value
  
  if (sport === 'hockey') {
    // Hockey positions - skaters vs goalies
    return isPitchingCategory.value 
      ? ['G']  // Goalies (for goalie stats like SV%, GAA, W)
      : ['C', 'LW', 'RW', 'D', 'F', 'Util']  // Skaters
  }
  
  if (sport === 'basketball') {
    return ['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'Util']
  }
  
  if (sport === 'football') {
    return ['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'Flex']
  }
  
  // Baseball (default)
  return isPitchingCategory.value ? ['SP', 'RP'] : ['C', '1B', '2B', '3B', 'SS', 'OF', 'Util']
})

// Helper to check if player is a pitcher/goalie (the "other" position type)
// Get default roster positions for a sport
function getSportDefaultPositions(sport: string): string[] {
  if (sport === 'basketball') {
    return ['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'Util', 'Util', 'Util']
  } else if (sport === 'hockey') {
    return ['C', 'C', 'LW', 'LW', 'RW', 'RW', 'D', 'D', 'D', 'D', 'G', 'G', 'Util', 'Util']
  } else if (sport === 'football') {
    return ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'Flex', 'K', 'DEF']
  } else {
    // Baseball (default)
    return ['C', '1B', '2B', '3B', 'SS', 'OF', 'OF', 'OF', 'Util', 'SP', 'SP', 'RP', 'RP']
  }
}

function isPitcher(player: any): boolean {
  const pos = (player.position || '').toUpperCase()
  const sport = currentSport.value
  
  if (sport === 'hockey') {
    // For hockey, "pitching" stats are actually goalie stats
    return pos.includes('G') && !pos.includes('LW') && !pos.includes('RW')
  }
  
  // Baseball
  return pos.includes('SP') || pos.includes('RP') || pos === 'P'
}

const categoryRankedPlayers = computed(() => {
  if (!selectedCategory.value) return []
  const catInfo = selectedCategoryInfo.value
  if (!catInfo) return []
  const gamesRemaining = 65, gamesPlayed = 97, statId = catInfo.stat_id
  
  console.log(`[categoryRankedPlayers] sport=${currentSport.value}, category=${catInfo.display_name}, isPitchingCategory=${isPitchingCategory.value}`)
  console.log(`[categoryRankedPlayers] allPlayers count: ${allPlayers.value.length}`)
  
  // Filter players by position type
  let players = allPlayers.value.filter(p => {
    const isPlayerPitcher = isPitcher(p)
    return isPitchingCategory.value ? isPlayerPitcher : !isPlayerPitcher
  })
  
  console.log(`[categoryRankedPlayers] After pitcher/hitter filter: ${players.length} players`)
  if (players.length === 0 && allPlayers.value.length > 0) {
    console.log(`[categoryRankedPlayers] WARNING: All players filtered out! Sample positions:`, 
      allPlayers.value.slice(0, 5).map(p => ({ name: p.full_name, position: p.position })))
  }
  
  players = players.map(p => {
    const currentValue = p.stats?.[statId] || 0
    let projectedValue = 0, perGameValue = 0
    if (isRatioCategory.value) { projectedValue = currentValue; perGameValue = currentValue }
    else { perGameValue = gamesPlayed > 0 ? currentValue / gamesPlayed : 0; projectedValue = currentValue + (perGameValue * gamesRemaining) }
    return { ...p, currentValue, projectedValue: Math.round(projectedValue * 10) / 10, perGameValue: Math.round(perGameValue * 1000) / 1000 }
  })
  
  if (isLowerBetter.value) { 
    players.sort((a, b) => { 
      if (a.projectedValue === 0 && b.projectedValue === 0) return 0
      if (a.projectedValue === 0) return 1
      if (b.projectedValue === 0) return -1
      return a.projectedValue - b.projectedValue 
    }) 
  } else { 
    players.sort((a, b) => b.projectedValue - a.projectedValue) 
  }
  
  const positionCounts: Record<string, number> = {}
  players.forEach(p => { const pos = p.position?.split(',')[0]?.trim() || 'Util'; positionCounts[pos] = (positionCounts[pos] || 0) + 1 })
  const avgPositionCount = Object.values(positionCounts).reduce((a, b) => a + b, 0) / Math.max(Object.keys(positionCounts).length, 1)
  
  players = players.map((p, index) => {
    const percentile = players.length > 0 ? index / players.length : 1
    let tier = 5
    if (percentile <= 0.05) tier = 1
    else if (percentile <= 0.15) tier = 2
    else if (percentile <= 0.35) tier = 3
    else if (percentile <= 0.60) tier = 4
    
    const categoryRankScore = (1 - percentile) * 100
    let categoriesContributing = 0
    const relevantCats = relevantCategories.value
    relevantCats.forEach(cat => { 
      const catValue = p.stats?.[cat.stat_id] || 0
      if (catValue > 0) { 
        const allCatValues = players.map(pl => pl.stats?.[cat.stat_id] || 0).filter(v => v > 0)
        const avgCatValue = allCatValues.length > 0 ? allCatValues.reduce((a, b) => a + b, 0) / allCatValues.length : 0
        if (catValue > avgCatValue * 0.8) categoriesContributing++ 
      } 
    })
    const multiCatScore = relevantCats.length > 0 ? (categoriesContributing / relevantCats.length) * 100 : 50
    const playerPos = p.position?.split(',')[0]?.trim() || 'Util'
    const posCount = positionCounts[playerPos] || avgPositionCount
    const scarcityScore = posCount < avgPositionCount ? Math.min(100, (avgPositionCount / posCount) * 50) : Math.max(0, 50 - ((posCount - avgPositionCount) / avgPositionCount) * 30)
    let consistencyScore = 50
    if (p.projectedValue > 0 && !isRatioCategory.value) { 
      const expectedPerGame = p.projectedValue / (gamesPlayed + gamesRemaining)
      const actualPerGame = p.perGameValue
      if (actualPerGame > 0 && expectedPerGame > 0) { consistencyScore = Math.min(100, Math.max(0, (actualPerGame / expectedPerGame) * 50)) } 
    }
    // Use custom weights from ranking factors
    const weights = rankingWeights.value
    
    // Core factors: categoryRank, multiCategory, projectedVolume, positionScarcity
    // Performance factors: consistency, recentTrend, ceilingMode, floorMode, eliteStatus
    // Calculate enabled weight total for normalization
    const coreW = (weights.categoryRank || 0) + (weights.multiCategory || 0) + 
                  (weights.projectedVolume || 0) + (weights.positionScarcity || 0)
    const perfW = (weights.consistency || 0) + (weights.recentTrend || 0) + 
                  (weights.eliteStatus || 0)
    const scarcityW = (weights.categoryScarcity || 0)
    const totalW = coreW + perfW + scarcityW
    const normFactor = totalW > 0 ? 100 / totalW : 1
    
    // Calculate volume score (based on projected volume/games)
    const volumeScore = p.projectedValue > 0 ? Math.min(100, (p.projectedValue / (players[0]?.projectedValue || 1)) * 100) : 0
    
    // Elite status bonus (top 5% in category)
    const eliteBonus = percentile <= 0.05 ? 20 : 0
    
    // Recent trend score (placeholder - would need historical data)
    const trendScore = 50 // Neutral for now
    
    // Calculate overall value with all enabled factors
    let overallValue = 0
    overallValue += categoryRankScore * ((weights.categoryRank || 0) / 100 * normFactor)
    overallValue += multiCatScore * ((weights.multiCategory || 0) / 100 * normFactor)
    overallValue += volumeScore * ((weights.projectedVolume || 0) / 100 * normFactor)
    overallValue += scarcityScore * ((weights.positionScarcity || 0) / 100 * normFactor)
    overallValue += consistencyScore * ((weights.consistency || 0) / 100 * normFactor)
    overallValue += trendScore * ((weights.recentTrend || 0) / 100 * normFactor)
    overallValue += eliteBonus * ((weights.eliteStatus || 0) / 100 * normFactor)
    
    // Category scarcity adjustment (for rare cats like SB, SV)
    if (weights.categoryScarcity) {
      const catScarcity = getCategoryScarcityMultiplier(selectedCategory.value)
      overallValue += (catScarcity * 50) * ((weights.categoryScarcity || 0) / 100 * normFactor)
    }
    
    return { ...p, tier, categoryRank: index + 1, overallValue: Math.round(overallValue * 10) / 10, categoriesContributing, scarcityScore: Math.round(scarcityScore) }
  })
  return players
})

const filteredPlayers = computed(() => {
  let players = [...categoryRankedPlayers.value]
  if (selectedPositions.value.length > 0 && selectedPositions.value.length < availablePositions.value.length) { 
    players = players.filter(p => selectedPositions.value.some(pos => p.position?.includes(pos))) 
  }
  if (showOnlyMyPlayers.value) players = players.filter(p => isMyPlayer(p))
  if (showOnlyFreeAgents.value) players = players.filter(p => isFreeAgent(p))
  return players
})

const sortedPlayers = computed(() => {
  let players = [...filteredPlayers.value]
  const dir = sortDirection.value === 'asc' ? 1 : -1
  switch (sortColumn.value) {
    case 'name': players.sort((a, b) => dir * (a.full_name || '').localeCompare(b.full_name || '')); break
    case 'position': players.sort((a, b) => dir * (a.position || '').localeCompare(b.position || '')); break
    case 'projected': players.sort((a, b) => dir * ((a.projectedValue || 0) - (b.projectedValue || 0))); break
    case 'current': players.sort((a, b) => dir * ((a.currentValue || 0) - (b.currentValue || 0))); break
    case 'perGame': players.sort((a, b) => dir * ((a.perGameValue || 0) - (b.perGameValue || 0))); break
    case 'value': players.sort((a, b) => dir * ((a.overallValue || 0) - (b.overallValue || 0))); break
    case 'rank': default: if (sortDirection.value === 'desc') players.reverse(); break
  }
  return players
})

// Gated sorted players - show top 3 for non-premium users
const gatedSortedPlayers = computed(() => {
  if (hasPremiumAccess.value) return sortedPlayers.value
  return sortedPlayers.value.slice(0, 3)
})

const hiddenPlayersCount = computed(() => {
  if (hasPremiumAccess.value) return 0
  return Math.max(0, sortedPlayers.value.length - 3)
})

// Selected player for modal
const selectedPlayer = computed(() => {
  if (!expandedPlayerKey.value) return null
  return sortedPlayers.value.find(p => p.player_key === expandedPlayerKey.value) || 
         allPlayers.value.find(p => p.player_key === expandedPlayerKey.value) || null
})

// Selected team for modal
const selectedTeam = computed(() => {
  if (!expandedTeamKey.value) return null
  return teamsData.value.find((t: any) => t.team_key === expandedTeamKey.value) || null
})

const myPlayersInCategory = computed(() => categoryRankedPlayers.value.filter(p => isMyPlayer(p)).sort((a, b) => b.projectedValue - a.projectedValue))
const myTeamProjectedTotal = computed(() => { 
  if (isRatioCategory.value) { 
    const players = myPlayersInCategory.value
    if (players.length === 0) return 0
    return players.reduce((sum, p) => sum + (p.projectedValue || 0), 0) / players.length 
  }
  return myPlayersInCategory.value.reduce((sum, p) => sum + (p.projectedValue || 0), 0) 
})

const myTeamRank = computed(() => { 
  const teamTotals: { team: string, total: number }[] = []
  teamsData.value.forEach((team: any) => { 
    const teamPlayers = categoryRankedPlayers.value.filter(p => p.fantasy_team_key === team.team_key)
    let total = 0
    if (isRatioCategory.value) { total = teamPlayers.length > 0 ? teamPlayers.reduce((sum, p) => sum + (p.projectedValue || 0), 0) / teamPlayers.length : 0 } 
    else { total = teamPlayers.reduce((sum, p) => sum + (p.projectedValue || 0), 0) }
    teamTotals.push({ team: team.team_key, total }) 
  })
  if (isLowerBetter.value) { teamTotals.sort((a, b) => a.total - b.total) } 
  else { teamTotals.sort((a, b) => b.total - a.total) }
  const idx = teamTotals.findIndex(t => t.team === myTeamKey.value)
  return idx >= 0 ? idx + 1 : teamsData.value.length 
})

const topContributor = computed(() => myPlayersInCategory.value[0] || null)

// Chart computed values
const chartYMax = computed(() => {
  if (recentPerformances.value.length === 0) return 10
  const allValues = recentPerformances.value.flatMap(p => [p.playerValue, p.leagueAvg])
  return Math.max(...allValues) * 1.3 || 10
})

const playerLinePoints = computed(() => {
  return recentPerformances.value.map((perf, idx) => `${getChartX(idx)},${getChartY(perf.playerValue)}`).join(' ')
})

const leagueAvgLinePoints = computed(() => {
  return recentPerformances.value.map((perf, idx) => `${getChartX(idx)},${getChartY(perf.leagueAvg)}`).join(' ')
})

const playerRecentAvg = computed(() => {
  if (recentPerformances.value.length === 0) return 0
  return recentPerformances.value.reduce((sum, p) => sum + p.playerValue, 0) / recentPerformances.value.length
})

const leagueRecentAvg = computed(() => {
  if (recentPerformances.value.length === 0) return 0
  return recentPerformances.value.reduce((sum, p) => sum + p.leagueAvg, 0) / recentPerformances.value.length
})

const playerAvgVsLeague = computed(() => {
  return playerRecentAvg.value - leagueRecentAvg.value
})

// Format chart values based on stat type (percentages vs regular stats)
const formatChartValue = (value: number): string => {
  const cat = displayCategories.value.find(c => c.stat_id === chartCategory.value)
  if (isPercentageStat(cat)) {
    return (value * 100).toFixed(1) + '%'
  }
  return value.toFixed(1)
}

// Chart helper functions
function getChartX(index: number): number {
  const padding = 70
  const width = 400 - padding - 20
  const step = width / Math.max(recentPerformances.value.length - 1, 1)
  return padding + (index * step)
}

function getChartY(value: number): number {
  const top = 25
  const bottom = 160
  const range = bottom - top
  const ratio = value / chartYMax.value
  return bottom - (ratio * range)
}

// Category scarcity multipliers for rare categories
function getCategoryScarcityMultiplier(statId: string): number {
  const scarcityMap: Record<string, number> = {
    // Very scarce categories (higher multiplier = more valuable)
    'SB': 1.25,
    '16': 1.25, // Yahoo SB
    'SV': 1.30,
    '32': 1.30, // Yahoo SV
    'HLD': 1.20,
    'SV+H': 1.25,
    // Moderately scarce
    'W': 1.10,
    '28': 1.10, // Yahoo W
    'QS': 1.05,
    // Common (baseline)
    'HR': 1.0,
    'R': 1.0,
    'RBI': 1.0,
    'K': 0.95,
    'AVG': 1.0,
    'ERA': 1.0,
    'WHIP': 1.0
  }
  return scarcityMap[statId] || 1.0
}

// Functions
function isMyPlayer(player: any): boolean { 
  if (!myTeamKey.value) return false
  return player.fantasy_team_key === myTeamKey.value 
}

function isFreeAgent(player: any): boolean { return !player.fantasy_team && !player.fantasy_team_key }
function selectAllPositions() { selectedPositions.value = [...availablePositions.value] }
function togglePositionFilter(pos: string) { const idx = selectedPositions.value.indexOf(pos); if (idx >= 0) { selectedPositions.value.splice(idx, 1) } else { selectedPositions.value.push(pos) } }
function toggleSort(column: string) { if (sortColumn.value === column) { sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc' } else { sortColumn.value = column; sortDirection.value = (column === 'name' || column === 'position') ? 'asc' : 'desc' } }

async function togglePlayerExpanded(player: any) {
  if (expandedPlayerKey.value === player.player_key) {
    expandedPlayerKey.value = null
  } else {
    expandedPlayerKey.value = player.player_key
    chartCategory.value = selectedCategory.value
    await loadRecentPerformances(player)
  }
}

async function loadRecentPerformances(player: any) {
  isLoadingChart.value = true
  recentPerformances.value = []
  
  try {
    const leagueKey = leagueStore.activeLeagueId
    const statId = chartCategory.value
    if (!leagueKey || !statId || !player.player_key) return
    
    // For now, we'll use the weekly stats endpoint which is more reliable
    // The date-based endpoint requires additional Yahoo service methods
    // Try to get real weekly stats from Yahoo API
    const weeklyData = await loadWeeklyStatsFromYahoo(leagueKey, player.player_key, statId)
    
    if (weeklyData.length > 0) {
      recentPerformances.value = weeklyData
    } else {
      // Fall back to simulated data if no real data available
      await loadSimulatedPerformances(player, statId)
    }
    
  } catch (error) {
    console.error('Error loading performance data:', error)
    // Fall back to simulated data on error
    const statId = chartCategory.value
    if (statId) await loadSimulatedPerformances(player, statId)
  } finally {
    isLoadingChart.value = false
  }
}

// Helper: Load weekly stats from Yahoo API
async function loadWeeklyStatsFromYahoo(leagueKey: string, playerKey: string, statId: string): Promise<any[]> {
  const performances: any[] = []
  
  try {
    // Get the last 5 weeks of stats
    const currentWeek = 25 // Approximate current week - could be dynamic
    const weeks = [currentWeek - 4, currentWeek - 3, currentWeek - 2, currentWeek - 1, currentWeek].filter(w => w > 0)
    
    const weeklyStats = await yahooService.getPlayerWeeklyStats(leagueKey, playerKey, weeks)
    
    // Calculate league average per week (get weekly stats for top players)
    const relevantPlayers = allPlayers.value.filter(p => isPitchingCategory.value ? isPitcher(p) : !isPitcher(p)).slice(0, 20)
    
    // Try to get weekly stats for league players (for proper league avg calculation)
    const leagueWeeklyStats = new Map<number, number>()
    for (const week of weeks) {
      const weekAvgValues: number[] = []
      
      for (const p of relevantPlayers.slice(0, 10)) {  // Sample top 10 players
        try {
          const playerWeekStats = await yahooService.getPlayerWeeklyStats(leagueKey, p.player_key, [week])
          const weekData = playerWeekStats.get(week)
          if (weekData?.stats) {
            const statEntry = weekData.stats.find((s: any) => s.stat?.stat_id === statId)
            const value = statEntry ? parseFloat(statEntry.stat?.value || '0') : 0
            if (value > 0) weekAvgValues.push(value)
          }
        } catch (e) {
          // Skip players that error
        }
      }
      
      // Calculate avg for this week, or fall back to season avg estimate
      if (weekAvgValues.length > 0) {
        leagueWeeklyStats.set(week, weekAvgValues.reduce((a, b) => a + b, 0) / weekAvgValues.length)
      } else {
        // Fallback: use season avg divided by weeks with some variance
        const allStatValues = relevantPlayers.map(p => (p.stats?.[statId] || 0) / 25).filter(v => v > 0)
        const baseAvg = allStatValues.length > 0 ? allStatValues.reduce((a, b) => a + b, 0) / allStatValues.length : 0
        const variance = 0.8 + (Math.random() * 0.4) // 0.8 to 1.2 variance
        leagueWeeklyStats.set(week, baseAvg * variance)
      }
    }
    
    for (const week of weeks) {
      const playerWeekData = weeklyStats.get(week)
      if (!playerWeekData) continue
      
      // Find the specific stat value
      const statEntry = playerWeekData.stats?.find((s: any) => s.stat?.stat_id === statId)
      const playerValue = statEntry ? parseFloat(statEntry.stat?.value || '0') : 0
      
      // Get league average for this specific week
      const leagueAvg = leagueWeeklyStats.get(week) || 0
      
      performances.push({
        date: `Wk ${week}`,
        fullDate: `Week ${week}`,
        playerValue: Math.round(playerValue * 100) / 100,
        leagueAvg: Math.round(leagueAvg * 100) / 100
      })
    }
  } catch (e) {
    console.error('Error loading weekly stats:', e)
  }
  
  return performances
}

// Fallback: Simulated data based on season stats
async function loadSimulatedPerformances(player: any, statId: string) {
  console.log('=== loadSimulatedPerformances DEBUG ===')
  console.log('Player:', player.full_name)
  console.log('Stat ID:', statId)
  console.log('Player stats object:', player.stats)
  console.log('Value for statId:', player.stats?.[statId])
  
  const currentValue = player.stats?.[statId] || 0
  const gamesPlayed = 140 // Full season approximately
  const perGame = gamesPlayed > 0 ? currentValue / gamesPlayed : 0
  
  console.log('Current value:', currentValue, 'Per game:', perGame)
  
  // Calculate league average for this stat (per game)
  const relevantPlayers = allPlayers.value.filter(p => isPitchingCategory.value ? isPitcher(p) : !isPitcher(p))
  const allStatValues = relevantPlayers.map(p => p.stats?.[statId] || 0).filter(v => v > 0)
  const leagueTotal = allStatValues.reduce((a, b) => a + b, 0)
  const leaguePerGame = allStatValues.length > 0 ? (leagueTotal / allStatValues.length) / gamesPlayed : 0
  
  console.log('League stat values count:', allStatValues.length, 'Total:', leagueTotal, 'Per game:', leaguePerGame)
  
  // If both values are 0, use default values to show something
  const basePlayerValue = perGame > 0 ? perGame : 1
  const baseLeagueValue = leaguePerGame > 0 ? leaguePerGame : 0.8
  
  console.log('Base player value:', basePlayerValue, 'Base league value:', baseLeagueValue)
  
  // Generate last 5 game dates
  const today = new Date()
  const gameDates: Date[] = []
  let daysBack = 1
  
  // For pitchers, space games out more (every 5 days roughly)
  const isPitcherPlayer = isPitcher(player)
  const daySkip = isPitcherPlayer ? 5 : 1
  
  while (gameDates.length < 5 && daysBack < 60) {
    const gameDate = new Date(today)
    gameDate.setDate(today.getDate() - daysBack)
    
    // Add game date
    gameDates.push(gameDate)
    daysBack += daySkip + Math.floor(Math.random() * 2) // Add some variance
  }
  
  gameDates.reverse()
  
  // Pre-generate league averages with different values for each day
  const leagueAvgValues = gameDates.map(() => {
    const variance = 0.5 + Math.random() * 1.0 // 0.5 to 1.5 variance
    return Math.max(0.1, baseLeagueValue * variance)
  })
  
  recentPerformances.value = gameDates.map((date, idx) => {
    // Player performance varies day to day
    const playerVariance = 0.3 + Math.random() * 1.4 // 0.3 to 1.7 variance
    const playerValue = Math.max(0, basePlayerValue * playerVariance)
    
    // Use pre-generated league avg for this specific day
    const leagueAvg = leagueAvgValues[idx]
    
    return {
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      fullDate: date.toISOString().split('T')[0],
      playerValue: Math.round(playerValue * 100) / 100,
      leagueAvg: Math.round(leagueAvg * 100) / 100
    }
  })
  
  console.log('Chart data generated:', recentPerformances.value)
}

// Watch chart category changes
watch(chartCategory, async () => {
  const player = sortedPlayers.value.find(p => p.player_key === expandedPlayerKey.value)
  if (player) {
    await loadRecentPerformances(player)
  }
})

function formatStatValue(value: number | undefined, decimals: number = 1): string { 
  if (value === undefined || value === null) return '-'
  if (value === 0) return '0'
  
  // Check if current selected category is a percentage stat
  const cat = selectedCategoryInfo.value
  if (isPercentageStat(cat)) {
    // Convert decimal (0.5) to percentage (50%)
    return (value * 100).toFixed(1) + '%'
  }
  
  if (isRatioCategory.value) { 
    if (value < 1 && value > 0) return value.toFixed(3).replace(/^0/, '')
    return value.toFixed(2) 
  }
  if (Number.isInteger(value)) return value.toString()
  return value.toFixed(decimals) 
}

function formatCategoryStat(player: any, statId: string): string { 
  const value = player.stats?.[statId]
  if (value === undefined || value === null) return '-'
  
  // Check if this is a ratio stat by looking up the category
  const cat = displayCategories.value.find(c => c.stat_id === statId)
  
  // Handle percentage stats
  if (isPercentageStat(cat)) {
    return (value * 100).toFixed(1) + '%'
  }
  
  if (isRatioStat(cat)) { 
    if (value < 1 && value > 0) return value.toFixed(3).replace(/^0/, '')
    return value.toFixed(2) 
  }
  return Math.round(value).toString() 
}

function getCategoryRank(player: any, statId: string): number { 
  const value = player.stats?.[statId]
  if (!value || value === 0) return 999 // Unranked if no value
  
  // Find the category info to check if it's pitching/ratio
  const cat = displayCategories.value.find(c => c.stat_id === statId)
  const isPitchingStatCat = isPitchingStat(cat)
  const isRatioStatCat = isRatioStat(cat)
  const isLowerBetterCat = isLowerBetterStat(cat)
  
  const allValues = allPlayers.value
    .filter(p => isPitchingStatCat ? isPitcher(p) : !isPitcher(p))
    .map(p => p.stats?.[statId] || 0)
    .filter(v => v > 0)
    .sort((a, b) => isLowerBetterCat ? a - b : b - a)
  
  if (allValues.length === 0) return 999
  
  const rank = allValues.indexOf(value) + 1
  return rank > 0 ? rank : allValues.length + 1 
}

function getCategoryRankClass(player: any, statId: string): string { 
  const rank = getCategoryRank(player, statId)
  if (rank <= 10) return 'bg-green-500/20 text-green-400'
  if (rank <= 30) return 'bg-yellow-500/20 text-yellow-400'
  if (rank <= 60) return 'bg-orange-500/20 text-orange-400'
  return 'bg-dark-border text-dark-textMuted' 
}

// Recent stats functions (simulated for now since we don't have daily data from Yahoo)
// Uses season stats with variance to simulate recent performance
function getRecentStat(player: any, statId: string): string {
  const seasonValue = player.stats?.[statId] || 0
  if (seasonValue === 0) return '-'
  
  const cat = displayCategories.value.find(c => c.stat_id === statId)
  const isRatio = isRatioStat(cat)
  const numGames = isPitcher(player) ? 4 : 10
  
  // For counting stats, estimate recent games based on per-game rate with some variance
  // For ratio stats, show the same value (ratios don't sum)
  if (isRatio) {
    // Add slight variance to ratio for "recent" form
    const variance = 0.9 + (Math.random() * 0.2) // 0.9-1.1
    const recentValue = seasonValue * variance
    if (recentValue < 1 && recentValue > 0) return recentValue.toFixed(3).replace(/^0/, '')
    return recentValue.toFixed(2)
  } else {
    // Counting stat: estimate per-game, multiply by recent games
    const gamesPlayed = 140 // Approximate season games
    const perGame = seasonValue / gamesPlayed
    const variance = 0.6 + (Math.random() * 0.8) // 0.6-1.4 variance
    const recentValue = perGame * numGames * variance
    return Math.round(recentValue).toString()
  }
}

function getRecentRank(player: any, statId: string): number {
  // Simulate recent rank based on season rank with some variance
  const seasonRank = getCategoryRank(player, statId)
  const variance = Math.floor(Math.random() * 20) - 10 // -10 to +10
  const recentRank = Math.max(1, seasonRank + variance)
  return recentRank
}

function getRecentRankClass(player: any, statId: string): string {
  const rank = getRecentRank(player, statId)
  if (rank <= 10) return 'bg-cyan-500/20 text-cyan-400'
  if (rank <= 30) return 'bg-teal-500/20 text-teal-400'
  if (rank <= 60) return 'bg-slate-500/20 text-slate-400'
  return 'bg-dark-border text-dark-textMuted'
}

function handleImageError(e: Event) { 
  const img = e.target as HTMLImageElement
  // Prevent infinite loop by checking if already set to default
  if (!img.src.includes('nophoto') && !img.src.includes('default')) {
    img.src = getDefaultHeadshot() 
  }
}

function handleLogoError(e: Event) { 
  const img = e.target as HTMLImageElement
  // Prevent infinite loop by checking if already set to default
  if (!img.src.includes('default')) {
    img.src = getDefaultLogo() 
  }
}
function getRowClass(player: any): string { if (isMyPlayer(player)) return 'bg-yellow-500/20 border-l-4 border-l-yellow-400'; if (isFreeAgent(player)) return 'bg-cyan-500/20 border-l-4 border-l-cyan-400'; return '' }
function getAvatarRingClass(player: any): string { if (isMyPlayer(player)) return 'ring-yellow-400 ring-offset-2 ring-offset-dark-card'; if (isFreeAgent(player)) return 'ring-cyan-400 ring-offset-2 ring-offset-dark-card'; return 'ring-dark-border' }
function getPlayerNameClass(player: any): string { if (isMyPlayer(player)) return 'text-yellow-400'; if (isFreeAgent(player)) return 'text-cyan-400'; return 'text-dark-text' }
function getPositionClass(position: string): string { const pos = position?.split(',')[0]?.trim(); const colors: Record<string, string> = { 'C': 'bg-purple-500/20 text-purple-400', '1B': 'bg-red-500/20 text-red-400', '2B': 'bg-green-500/20 text-green-400', '3B': 'bg-blue-500/20 text-blue-400', 'SS': 'bg-yellow-500/20 text-yellow-400', 'OF': 'bg-orange-500/20 text-orange-400', 'SP': 'bg-cyan-500/20 text-cyan-400', 'RP': 'bg-pink-500/20 text-pink-400' }; return colors[pos] || 'bg-dark-border text-dark-textMuted' }
function showTierBreak(player: any, index: number): boolean { if (sortColumn.value !== 'rank') return false; if (index === 0) return true; const prevPlayer = sortedPlayers.value[index - 1]; return prevPlayer && player.tier !== prevPlayer.tier }
function getTierLabel(tier: number): string { const labels: Record<number, string> = { 1: 'Tier 1: Elite', 2: 'Tier 2: Great', 3: 'Tier 3: Good', 4: 'Tier 4: Average', 5: 'Tier 5: Below Average' }; return labels[tier] || `Tier ${tier}` }
function getValueClass(value: number): string { if (value >= 80) return 'text-green-400'; if (value >= 60) return 'text-lime-400'; if (value >= 40) return 'text-yellow-400'; if (value >= 20) return 'text-orange-400'; return 'text-red-400' }
function getValueDotClass(value: number): string { if (value >= 80) return 'bg-green-400'; if (value >= 60) return 'bg-lime-400'; if (value >= 40) return 'bg-yellow-400'; if (value >= 20) return 'bg-orange-400'; return 'bg-red-400' }

const getCategoryCardClass = computed(() => isPitchingCategory.value ? 'bg-purple-500/10 border-purple-500/30' : 'bg-green-500/10 border-green-500/30')
const getCategoryBadgeClass = computed(() => isPitchingCategory.value ? 'bg-purple-500/20 text-purple-400' : 'bg-green-500/20 text-green-400')

async function loadProjections() {
  isLoading.value = true
  loadingMessage.value = 'Loading league settings...'
  loadingProgress.value = { currentStep: 'Loading league settings...', week: 1, maxWeek: 4 }
  try {
    const leagueKey = leagueStore.activeLeagueId
    if (!leagueKey) { loadingMessage.value = 'No league selected'; return }
    
    // Detect sport from saved league or league key
    const savedLeague = leagueStore.savedLeagues.find(l => l.league_id === leagueKey)
    if (savedLeague?.sport) {
      currentSport.value = savedLeague.sport
      console.log('[CategoryProjections] Sport detected from savedLeague:', currentSport.value)
    } else {
      // Try to detect from league key (Yahoo keys like 428.l.12345)
      const gameKey = leagueKey.split('.')[0]
      const detectedSport = detectSportFromGameKey(gameKey)
      if (detectedSport) {
        currentSport.value = detectedSport
        console.log('[CategoryProjections] Sport detected from game key:', currentSport.value)
      }
    }
    
    loadingProgress.value = { currentStep: 'Loading scoring categories...', week: 2, maxWeek: 4 }
    const settings = await yahooService.getLeagueScoringSettings(leagueKey)
    
    // DEBUG: Log entire settings object to see what we're getting
    console.log('[CategoryProjections] ===== SETTINGS DEBUG =====')
    console.log('[CategoryProjections] settings:', settings)
    console.log('[CategoryProjections] settings.roster_positions:', settings?.roster_positions)
    console.log('[CategoryProjections] typeof roster_positions:', typeof settings?.roster_positions)
    console.log('[CategoryProjections] ===== END SETTINGS DEBUG =====')
    
    if (settings) {
      const cats = settings.stat_categories || []
      console.log('[CategoryProjections] ===== CATEGORIES DEBUG =====')
      console.log('[CategoryProjections] Raw stat_categories:', cats)
      console.log('[CategoryProjections] Number of categories:', cats.length)
      console.log('[CategoryProjections] First category structure:', cats[0])
      console.log('[CategoryProjections] All category structures:', cats.map((c: any) => ({
        stat_id: c.stat?.stat_id || c.stat_id,
        name: c.stat?.name || c.name,
        display_name: c.stat?.display_name || c.display_name || c.stat?.abbr || c.abbr
      })))
      
      statCategories.value = cats.map((c: any) => ({ 
        stat_id: c.stat?.stat_id || c.stat_id, 
        name: c.stat?.name || c.name, 
        display_name: c.stat?.display_name || c.display_name || c.stat?.abbr || c.abbr, 
        is_only_display_stat: c.stat?.is_only_display_stat || c.is_only_display_stat 
      })).filter((c: any) => c.stat_id)
      
      console.log('[CategoryProjections] Mapped categories:', statCategories.value)
      console.log('[CategoryProjections] Display categories (filtered):', displayCategories.value)
      console.log('[CategoryProjections] Display categories count:', displayCategories.value.length)
      console.log('[CategoryProjections] ===== END CATEGORIES DEBUG =====')
      
      // If we have very few categories, something might be wrong - log warning
      if (displayCategories.value.length < 5) {
        console.warn('[CategoryProjections] ⚠️ WARNING: Only', displayCategories.value.length, 'categories loaded. This seems low!')
        console.warn('[CategoryProjections] Full settings object:', settings)
      }
      // Capture roster positions from league settings
      if (settings.roster_positions) {
        leagueRosterPositions.value = settings.roster_positions
        console.log('[CategoryProjections] ✅ Loaded roster positions:', leagueRosterPositions.value)
        console.log('[CategoryProjections] Roster positions type:', typeof leagueRosterPositions.value)
        console.log('[CategoryProjections] Roster positions length:', leagueRosterPositions.value.length)
        console.log('[CategoryProjections] First position:', leagueRosterPositions.value[0])
      } else {
        console.warn('[CategoryProjections] ⚠️ No roster_positions in settings!', settings)
      }
      
      console.log('Loaded categories:', statCategories.value.map(c => `${c.display_name} (${c.stat_id})`))
      console.log('Hitting categories:', hittingCategories.value.map(c => c.display_name))
      console.log('Pitching categories:', pitchingCategories.value.map(c => c.display_name))
      
      if (displayCategories.value.length > 0 && !selectedCategory.value) {
        selectedCategory.value = displayCategories.value[0].stat_id
      }
    }
    
    loadingMessage.value = 'Loading teams...'
    loadingProgress.value = { currentStep: 'Loading team data...', week: 3, maxWeek: 4 }
    const teams = await yahooService.getTeams(leagueKey)
    teamsData.value = teams || []
    
    // Debug: log all teams
    console.log('All teams:', teamsData.value.map(t => ({ name: t.name, team_key: t.team_key, is_my_team: t.is_my_team })))
    
    // First try to find team with is_my_team flag
    let myTeam = teamsData.value.find((t: any) => t.is_owned_by_current_login || t.is_my_team)
    
    // If not found, use getMyTeam which uses Yahoo's special "me" syntax
    if (!myTeam) {
      console.log('No is_my_team flag found, trying getMyTeam endpoint...')
      const myTeamData = await yahooService.getMyTeam(leagueKey)
      if (myTeamData) {
        console.log('Found my team via getMyTeam:', myTeamData.name, myTeamData.team_key)
        myTeam = teamsData.value.find(t => t.team_key === myTeamData.team_key)
        if (myTeam) {
          myTeam.is_my_team = true
        }
      }
    }
    
    myTeamKey.value = myTeam?.team_key || null
    console.log('Teams loaded:', teamsData.value.length, 'My team:', myTeam?.name, 'Key:', myTeamKey.value)
    
    loadingMessage.value = 'Loading player data...'
    loadingProgress.value = { currentStep: 'Loading player data and projections...', week: 4, maxWeek: 4 }
    const rosteredPlayers = await yahooService.getAllRosteredPlayers(leagueKey)
    const freeAgents = await yahooService.getTopFreeAgents(leagueKey, 100)
    
    const rostered = (rosteredPlayers || []).map((p: any) => ({ 
      ...p, 
      player_key: p.player_key, 
      full_name: p.full_name || p.name || 'Unknown', 
      position: p.position || 'Util', 
      mlb_team: p.mlb_team || '', 
      nba_team: p.nba_team || '', 
      nhl_team: p.nhl_team || '',
      headshot: p.headshot || '', 
      fantasy_team: p.fantasy_team || p.team_name, 
      fantasy_team_key: p.fantasy_team_key || p.team_key, 
      stats: p.stats || {}, 
      total_points: p.total_points || 0 
    }))
    
    // Debug: log first few rostered players to see their team data
    if (rostered.length > 0) {
      console.log('========== YAHOO PLAYER TEAM DATA DEBUG ==========')
      console.log('Sample rostered players:', rostered.slice(0, 5).map(p => ({
        name: p.full_name,
        mlb_team: p.mlb_team,
        nba_team: p.nba_team,
        nhl_team: p.nhl_team,
        editorial_team_abbr: p.editorial_team_abbr,
        team_abbr: p.team_abbr,
        fantasy_team: p.fantasy_team,
        fantasy_team_key: p.fantasy_team_key
      })))
      console.log('==================================================')
    }
    
    // If myTeamKey is set, check if any players match
    if (myTeamKey.value) {
      const matchingPlayers = rostered.filter(p => p.fantasy_team_key === myTeamKey.value)
      console.log(`Players matching myTeamKey (${myTeamKey.value}):`, matchingPlayers.length)
      
      // If no match, try matching by team name
      if (matchingPlayers.length === 0 && myTeam?.name) {
        const byName = rostered.filter(p => p.fantasy_team === myTeam.name)
        console.log(`Players matching by team name (${myTeam.name}):`, byName.length)
        
        // If we found players by name, update their team keys
        if (byName.length > 0) {
          console.log('Fixing player team keys to match myTeamKey')
          byName.forEach(p => {
            const idx = rostered.findIndex(r => r.player_key === p.player_key)
            if (idx >= 0) {
              rostered[idx].fantasy_team_key = myTeamKey.value
            }
          })
        }
      }
    }
    
    const fas = (freeAgents || []).map((p: any) => ({ 
      ...p, 
      player_key: p.player_key, 
      full_name: p.full_name || p.name || 'Unknown', 
      position: p.position || 'Util', 
      mlb_team: p.mlb_team || '', 
      nba_team: p.nba_team || '',
      nhl_team: p.nhl_team || '',
      headshot: p.headshot || '', 
      fantasy_team: null, 
      fantasy_team_key: null, 
      stats: p.stats || {}, 
      total_points: p.total_points || 0 
    }))
    
    // Debug: log free agents team data
    if (fas.length > 0) {
      console.log('========== YAHOO FREE AGENT TEAM DATA DEBUG ==========')
      console.log('Sample free agents:', fas.slice(0, 5).map(p => ({
        name: p.full_name,
        mlb_team: p.mlb_team,
        nba_team: p.nba_team,
        nhl_team: p.nhl_team,
        editorial_team_abbr: p.editorial_team_abbr,
        team_abbr: p.team_abbr
      })))
      console.log('======================================================')
    }
    
    // Apply team corrections for basketball
    if (currentSport.value === 'basketball') {
      console.log('[TeamCorrection] Applying corrections to Yahoo players...')
      const correctedRostered = correctPlayerTeams(rostered, 'basketball')
      const correctedFas = correctPlayerTeams(fas, 'basketball')
      allPlayers.value = [...correctedRostered, ...correctedFas]
      console.log('[TeamCorrection] ✅ Corrections applied to', allPlayers.value.length, 'Yahoo players')
    } else {
      allPlayers.value = [...rostered, ...fas]
    }
    
    selectAllPositions()
    
    // Debug logging
    const pitchers = allPlayers.value.filter(p => isPitcher(p))
    const hitters = allPlayers.value.filter(p => !isPitcher(p))
    console.log('Players loaded:', allPlayers.value.length, '- Pitchers:', pitchers.length, '- Hitters:', hitters.length)
    
    // Log sample player stats to verify data
    if (allPlayers.value.length > 0) {
      const samplePlayer = allPlayers.value[0]
      console.log('Sample player stats:', samplePlayer.full_name, samplePlayer.stats)
      console.log('Available stat IDs:', Object.keys(samplePlayer.stats || {}))
    }
    
    const myPlayers = allPlayers.value.filter(p => p.fantasy_team_key === myTeamKey.value)
    console.log('Players on my team:', myPlayers.length, 'myTeamKey:', myTeamKey.value)
    
    // Debug: show unique team keys to identify mismatch
    const uniqueTeamKeys = [...new Set(allPlayers.value.filter(p => p.fantasy_team_key).map(p => p.fantasy_team_key))]
    console.log('Unique fantasy_team_keys in players:', uniqueTeamKeys)
    
    // Process teams for Teams tab
    processTeamsData()
    
  } catch (error) { 
    console.error('Error loading projections:', error)
    loadingMessage.value = 'Error loading data' 
  } finally { 
    isLoading.value = false 
  }
}

// ESPN version of loadProjections
async function loadEspnProjections() {
  console.log('[ESPN Projections] ========== STARTING loadEspnProjections ==========')
  isLoading.value = true
  loadingMessage.value = 'Loading ESPN league settings...'
  try {
    const leagueKey = leagueStore.activeLeagueId
    console.log('[ESPN Projections] League key:', leagueKey)
    if (!leagueKey) { loadingMessage.value = 'No league selected'; return }
    
    const { leagueId, season, sport } = parseEspnLeagueKey(leagueKey)
    currentSport.value = sport  // Set sport for sport-specific defaults
    console.log('[ESPN Projections] Parsed - leagueId:', leagueId, 'season:', season, 'sport:', sport)
    
    // Ensure ESPN credentials are loaded before trying to identify user's team
    console.log('[ESPN Projections] ===== CREDENTIAL CHECK START =====')
    const platformsStore = usePlatformsStore()
    
    // First check raw localStorage
    const rawCreds = localStorage.getItem('espn_credentials')
    console.log('[ESPN Projections] Raw localStorage check:', rawCreds ? 'EXISTS' : 'MISSING')
    if (rawCreds) {
      try {
        const parsed = JSON.parse(rawCreds)
        console.log('[ESPN Projections] localStorage SWID:', parsed.swid)
        console.log('[ESPN Projections] localStorage espn_s2 length:', parsed.espn_s2?.length || 0)
      } catch (e) {
        console.log('[ESPN Projections] Failed to parse localStorage:', e)
      }
    }
    
    const credentials = platformsStore.getEspnCredentials()
    console.log('[ESPN Projections] getEspnCredentials result:', credentials ? 'FOUND' : 'NOT FOUND')
    console.log('[ESPN Projections] ===== CREDENTIAL CHECK END =====')
    
    if (credentials) {
      console.log('[ESPN Projections] Using SWID:', credentials.swid)
      console.log('[ESPN Projections] Using espn_s2 length:', credentials.espn_s2?.length || 0)
      espnService.setCredentials(credentials.espn_s2, credentials.swid)
      console.log('[ESPN Projections] Credentials applied to espnService')
    } else {
      console.log('[ESPN Projections] WARNING: No ESPN credentials found!')
      console.log('[ESPN Projections] "My Team" highlighting will NOT work without credentials')
    }
    
    // Load scoring settings
    const scoringSettings = await espnService.getScoringSettings(sport as any, leagueId, season)
    if (scoringSettings?.scoringItems) {
      // ESPN stat ID to display name mapping - baseball
      const espnBaseballStatNames: Record<number, { name: string; display: string; isHitting: boolean }> = {
        // Hitting
        0: { name: 'At Bats', display: 'AB', isHitting: true },
        1: { name: 'Hits', display: 'H', isHitting: true },
        2: { name: 'Batting Average', display: 'AVG', isHitting: true },
        3: { name: 'Home Runs', display: 'HR', isHitting: true },
        4: { name: 'Runs', display: 'R', isHitting: true },
        5: { name: 'Runs Batted In', display: 'RBI', isHitting: true },
        6: { name: 'Stolen Bases', display: 'SB', isHitting: true },
        7: { name: 'Walks', display: 'BB', isHitting: true },
        8: { name: 'Strikeouts', display: 'K', isHitting: true },
        9: { name: 'Doubles', display: '2B', isHitting: true },
        10: { name: 'Triples', display: '3B', isHitting: true },
        11: { name: 'Total Bases', display: 'TB', isHitting: true },
        12: { name: 'On Base Percentage', display: 'OBP', isHitting: true },
        13: { name: 'Slugging Percentage', display: 'SLG', isHitting: true },
        14: { name: 'On Base Plus Slugging', display: 'OPS', isHitting: true },
        // Pitching
        32: { name: 'Wins', display: 'W', isHitting: false },
        33: { name: 'Losses', display: 'L', isHitting: false },
        34: { name: 'Saves', display: 'SV', isHitting: false },
        35: { name: 'Holds', display: 'HD', isHitting: false },
        36: { name: 'Earned Run Average', display: 'ERA', isHitting: false },
        37: { name: 'WHIP', display: 'WHIP', isHitting: false },
        38: { name: 'Innings Pitched', display: 'IP', isHitting: false },
        39: { name: 'Strikeouts', display: 'K', isHitting: false },
        40: { name: 'Quality Starts', display: 'QS', isHitting: false },
        41: { name: 'Blown Saves', display: 'BS', isHitting: false }
      }
      
      // ESPN stat ID to display name mapping - basketball
      const espnBasketballStatNames: Record<number, { name: string; display: string; isHitting: boolean }> = {
        0: { name: 'Points', display: 'PTS', isHitting: true },
        1: { name: 'Blocks', display: 'BLK', isHitting: true },
        2: { name: 'Steals', display: 'STL', isHitting: true },
        3: { name: 'Assists', display: 'AST', isHitting: true },
        4: { name: 'Offensive Rebounds', display: 'OREB', isHitting: true },
        5: { name: 'Defensive Rebounds', display: 'DREB', isHitting: true },
        6: { name: 'Rebounds', display: 'REB', isHitting: true },
        7: { name: 'Turnovers', display: 'TO', isHitting: true },
        8: { name: 'Field Goals Attempted', display: 'FGA', isHitting: true },
        9: { name: 'Field Goals Made', display: 'FGM', isHitting: true },
        10: { name: 'Free Throws Attempted', display: 'FTA', isHitting: true },
        11: { name: 'Free Throws Made', display: 'FTM', isHitting: true },
        12: { name: 'Three Pointers Attempted', display: '3PTA', isHitting: true },
        13: { name: 'Three Pointers Made', display: '3PM', isHitting: true },
        14: { name: 'Personal Fouls', display: 'PF', isHitting: true },
        15: { name: 'Field Goal Percentage', display: 'FG%', isHitting: true },
        16: { name: 'Free Throw Percentage', display: 'FT%', isHitting: true },
        17: { name: 'Free Throw Percentage', display: 'FT%', isHitting: true },
        18: { name: 'Three Point Percentage', display: '3P%', isHitting: true },
        19: { name: 'Three Pointers Made', display: '3PM', isHitting: true },
        20: { name: 'Three Pointers Attempted', display: '3PA', isHitting: true },
        21: { name: 'Minutes', display: 'MIN', isHitting: true },
        22: { name: 'Games Played', display: 'GP', isHitting: true },
        23: { name: 'Games Started', display: 'GS', isHitting: true },
        24: { name: 'Technical Fouls', display: 'TECH', isHitting: true },
        25: { name: 'Flagrant Fouls', display: 'FLAG', isHitting: true },
        26: { name: 'Ejections', display: 'EJ', isHitting: true },
        27: { name: 'Double Doubles', display: 'DD', isHitting: true },
        28: { name: 'Triple Doubles', display: 'TD', isHitting: true },
        29: { name: 'Efficiency', display: 'EFF', isHitting: true },
        30: { name: 'Disqualifications', display: 'DQ', isHitting: true },
        31: { name: 'Player Efficiency Rating', display: 'PER', isHitting: true }
      }
      
      // ESPN stat ID to display name mapping - hockey
      const espnHockeyStatNames: Record<number, { name: string; display: string; isHitting: boolean }> = {
        0: { name: 'Goals', display: 'G', isHitting: true },
        1: { name: 'Assists', display: 'A', isHitting: true },
        2: { name: 'Points', display: 'PTS', isHitting: true },
        3: { name: 'Plus/Minus', display: '+/-', isHitting: true },
        4: { name: 'Penalty Minutes', display: 'PIM', isHitting: true },
        5: { name: 'Powerplay Goals', display: 'PPG', isHitting: true },
        6: { name: 'Powerplay Assists', display: 'PPA', isHitting: true },
        7: { name: 'Powerplay Points', display: 'PPP', isHitting: true },
        8: { name: 'Shorthanded Goals', display: 'SHG', isHitting: true },
        9: { name: 'Shorthanded Assists', display: 'SHA', isHitting: true },
        10: { name: 'Shorthanded Points', display: 'SHP', isHitting: true },
        11: { name: 'Game-Winning Goals', display: 'GWG', isHitting: true },
        12: { name: 'Shots on Goal', display: 'SOG', isHitting: true },
        13: { name: 'Shooting Percentage', display: 'SH%', isHitting: true },
        14: { name: 'Faceoffs Won', display: 'FOW', isHitting: true },
        15: { name: 'Faceoffs Lost', display: 'FOL', isHitting: true },
        16: { name: 'Hits', display: 'HIT', isHitting: true },
        17: { name: 'Blocks', display: 'BLK', isHitting: true },
        18: { name: 'Takeaways', display: 'TK', isHitting: true },
        19: { name: 'Defensemen Points', display: 'DEF', isHitting: true },
        20: { name: 'Hat Tricks', display: 'HAT', isHitting: true },
        21: { name: 'Special Teams Goals', display: 'STG', isHitting: true },
        22: { name: 'Special Teams Assists', display: 'STA', isHitting: true },
        23: { name: 'Special Teams Points', display: 'STP', isHitting: true },
        24: { name: 'Games Played', display: 'GP', isHitting: true },
        25: { name: 'Average Time on Ice', display: 'ATOI', isHitting: true },
        26: { name: 'Giveaways', display: 'GV', isHitting: true },
        27: { name: 'Games Started', display: 'GS', isHitting: false },
        28: { name: 'Wins', display: 'W', isHitting: false },
        29: { name: 'Losses', display: 'L', isHitting: false },
        30: { name: 'Goals Against', display: 'GA', isHitting: false },
        31: { name: 'Goals Against Average', display: 'GAA', isHitting: false },
        32: { name: 'Saves', display: 'SV', isHitting: false },
        33: { name: 'Save Percentage', display: 'SV%', isHitting: false },
        34: { name: 'Shutouts', display: 'SO', isHitting: false },
        35: { name: 'Minutes', display: 'MIN', isHitting: false },
        36: { name: 'Shots Against', display: 'SA', isHitting: false },
        37: { name: 'Goalie Wins', display: 'GW', isHitting: false },
        38: { name: 'Shots Against', display: 'SA', isHitting: false },
        39: { name: 'Goals Saved Above Avg', display: 'GSAA', isHitting: false }
      }
      
      // Select appropriate stat names based on sport
      let espnStatNames
      if (sport === 'basketball') {
        espnStatNames = espnBasketballStatNames
      } else if (sport === 'hockey') {
        espnStatNames = espnHockeyStatNames
      } else {
        espnStatNames = espnBaseballStatNames
      }
      
      console.log('[ESPN] Loading categories for sport:', sport)
      console.log('[ESPN] Using stat mapping:', sport === 'basketball' ? 'Basketball' : sport === 'hockey' ? 'Hockey' : 'Baseball')
      
      statCategories.value = scoringSettings.scoringItems.map((item: any) => {
        const statInfo = espnStatNames[item.statId] || { name: `Stat ${item.statId}`, display: `S${item.statId}`, isHitting: item.statId < 20 }
        return {
          stat_id: item.statId.toString(),
          name: statInfo.name,
          display_name: statInfo.display,
          is_only_display_stat: false,
          isHitting: statInfo.isHitting
        }
      })
      
      console.log('[ESPN Projections] Loaded categories:', statCategories.value.map(c => `${c.display_name}(${c.stat_id})`))
      
      if (displayCategories.value.length > 0 && !selectedCategory.value) {
        selectedCategory.value = displayCategories.value[0].stat_id
      }
    }
    
    loadingMessage.value = 'Loading teams...'
    const teams = await espnService.getTeamsWithRosters(sport as any, leagueId, season)
    
    // Get my team ID from ESPN
    let myTeamId: number | null = null
    try {
      const myTeam = await espnService.getMyTeam(sport as any, leagueId, season)
      if (myTeam) {
        myTeamId = myTeam.id
        console.log('[ESPN Projections] Found my team via getMyTeam:', myTeam.name, 'ID:', myTeamId)
      }
    } catch (e) {
      console.log('[ESPN Projections] Could not get my team:', e)
    }
    
    // Transform ESPN teams to our format
    teamsData.value = teams.map((team: any) => {
      // Get team logo - ESPN provides this in multiple places
      let logoUrl = team.logo
      if (!logoUrl && team.owners?.length > 0) {
        // Try to get from team ID based URL
        logoUrl = `https://g.espncdn.com/lm-static/fba/images/default_logos/team_${team.id % 30}.svg`
      }
      if (!logoUrl) {
        logoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(team.name)}&background=random&color=fff&size=64`
      }
      
      return {
        team_key: `espn_${leagueId}_${season}_${team.id}`,
        team_id: team.id.toString(),
        name: team.name,
        logo: logoUrl,  // Template uses team.logo
        logo_url: logoUrl,  // Also set logo_url for modals
        is_my_team: myTeamId !== null && team.id === myTeamId,
        wins: team.wins || 0,
        losses: team.losses || 0,
        ties: team.ties || 0
      }
    })
    
    console.log('[ESPN Projections] Teams loaded:', teamsData.value.length)
    console.log('[ESPN Projections] Teams with is_my_team:', teamsData.value.filter(t => t.is_my_team).map(t => ({ name: t.name, team_key: t.team_key })))
    
    // Find my team - only set if we actually found one
    const myTeam = teamsData.value.find((t: any) => t.is_my_team)
    myTeamKey.value = myTeam?.team_key || null  // Don't default to first team
    console.log('[ESPN Projections] My team key:', myTeamKey.value, 'Name:', myTeam?.name)
    
    // Debug: Log all team_keys for comparison
    console.log('[ESPN Projections] All team_keys:', teamsData.value.map(t => ({ name: t.name, team_key: t.team_key })))
    
    loadingMessage.value = 'Loading player data...'
    
    // Get all rostered players from teams with rosters
    const allRosteredPlayers: any[] = []
    const playerIdList: number[] = []
    
    for (const team of teams) {
      const roster = team.roster || []
      console.log(`[ESPN Projections] Team ${team.name} has ${roster.length} roster entries`)
      
      for (const entry of roster) {
        // ESPN service's parsePlayer already processed the roster entries
        // So we can access properties directly from entry
        const playerId = entry.playerId || entry.id
        const playerName = entry.fullName || entry.name || 'Unknown'
        const playerStats = entry.stats || {}
        
        // Collect player IDs for stat fetching
        if (playerId) {
          playerIdList.push(playerId)
        }
        
        // Debug first player's stats
        if (allRosteredPlayers.length === 0) {
          console.log('[ESPN Projections] Sample roster entry keys:', Object.keys(entry))
          console.log('[ESPN Projections] Sample player initial stats:', playerStats)
          console.log('[ESPN Projections] Sample player stats keys:', Object.keys(playerStats))
        }
        
        allRosteredPlayers.push({
          player_key: `espn_player_${playerId}`,
          player_id: playerId,
          full_name: playerName,
          position: entry.position || getEspnPositionAbbrev(entry.positionId || entry.defaultPositionId),
          mlb_team: entry.proTeam || getEspnTeamAbbrev(entry.proTeamId),
          headshot: getEspnHeadshotUrl(playerId, sport),
          fantasy_team: team.name,
          fantasy_team_key: `espn_${leagueId}_${season}_${team.id}`,
          stats: playerStats,  // Initial stats from roster (may be empty)
          total_points: entry.actualPoints || 0
        })
      }
    }
    
    console.log('[ESPN Projections] Rostered players:', allRosteredPlayers.length)
    console.log('[ESPN Projections] Player IDs to fetch stats for:', playerIdList.length)
    
    // Fetch actual player stats using the stats API
    if (playerIdList.length > 0) {
      try {
        loadingMessage.value = 'Loading player statistics...'
        console.log('[ESPN Projections] Fetching stats for players...')
        
        const statsMap = await espnService.getPlayersWithStats(sport as any, leagueId, season, playerIdList)
        console.log('[ESPN Projections] Got stats for', statsMap.size, 'players')
        
        // Merge stats back into players
        for (const player of allRosteredPlayers) {
          const playerStats = statsMap.get(player.player_id)
          if (playerStats?.stats) {
            player.stats = playerStats.stats
          }
        }
        
        // Debug: check if stats were loaded
        const playersWithStats = allRosteredPlayers.filter(p => Object.keys(p.stats || {}).length > 0)
        console.log('[ESPN Projections] Players with stats after fetch:', playersWithStats.length)
      } catch (e) {
        console.error('[ESPN Projections] Error fetching player stats:', e)
      }
    }
    
    // Log sample player to verify stats structure
    if (allRosteredPlayers.length > 0) {
      const samplePlayer = allRosteredPlayers[0]
      console.log('[ESPN Projections] ===== SAMPLE PLAYER DEBUG =====')
      console.log('[ESPN Projections] Sample player name:', samplePlayer.full_name)
      console.log('[ESPN Projections] Sample player fantasy_team_key:', samplePlayer.fantasy_team_key)
      console.log('[ESPN Projections] Sample player stats object:', JSON.stringify(samplePlayer.stats))
      console.log('[ESPN Projections] Sample player stats keys:', Object.keys(samplePlayer.stats || {}))
      
      // Compare with category stat_ids
      console.log('[ESPN Projections] ===== CATEGORY ID COMPARISON =====')
      console.log('[ESPN Projections] Category stat_ids:', statCategories.value.map(c => c.stat_id))
      
      // Check if any stats match
      for (const cat of statCategories.value.slice(0, 5)) {
        const statValue = samplePlayer.stats?.[cat.stat_id]
        console.log(`[ESPN Projections] Category ${cat.display_name} (id=${cat.stat_id}): player value = ${statValue}`)
      }
    }
    
    // Debug myTeamKey
    console.log('[ESPN Projections] ===== MY TEAM DEBUG =====')
    console.log('[ESPN Projections] myTeamKey.value:', myTeamKey.value)
    console.log('[ESPN Projections] First few player fantasy_team_keys:', allRosteredPlayers.slice(0, 3).map(p => p.fantasy_team_key))
    
    // Check if any players match myTeamKey
    if (myTeamKey.value) {
      const myPlayers = allRosteredPlayers.filter(p => p.fantasy_team_key === myTeamKey.value)
      console.log('[ESPN Projections] Players matching myTeamKey:', myPlayers.length)
    } else {
      console.log('[ESPN Projections] WARNING: myTeamKey is null/empty - no player highlighting will work')
    }
    
    // Load ESPN free agents
    loadingMessage.value = 'Loading free agents...'
    let freeAgents: any[] = []
    try {
      const espnFreeAgents = await espnService.getFreeAgents(sport as any, leagueId, season, 100)
      console.log('[ESPN Projections] Loaded', espnFreeAgents.length, 'free agents')
      
      freeAgents = espnFreeAgents.map((player: any) => ({
        player_key: `espn_player_${player.playerId || player.id}`,
        player_id: player.playerId || player.id,
        full_name: player.fullName || 'Unknown',
        position: player.position || 'Util',
        mlb_team: player.proTeam || '',
        headshot: getEspnHeadshotUrl(player.playerId || player.id, sport),
        fantasy_team: null,  // Free agents have no team
        fantasy_team_key: null,  // Free agents have no team key
        stats: player.stats || {},
        total_points: player.actualPoints || 0
      }))
      
      // If free agents don't have stats, fetch them
      const faIdsWithoutStats = freeAgents.filter(p => Object.keys(p.stats || {}).length === 0).map(p => p.player_id)
      if (faIdsWithoutStats.length > 0) {
        console.log('[ESPN Projections] Fetching stats for', faIdsWithoutStats.length, 'free agents...')
        try {
          const faStatsMap = await espnService.getPlayersWithStats(sport as any, leagueId, season, faIdsWithoutStats)
          for (const fa of freeAgents) {
            const faStats = faStatsMap.get(fa.player_id)
            if (faStats?.stats) {
              fa.stats = faStats.stats
            }
          }
        } catch (e) {
          console.log('[ESPN Projections] Could not fetch free agent stats:', e)
        }
      }
    } catch (e) {
      console.error('[ESPN Projections] Error loading free agents:', e)
    }
    
    // Apply team corrections for basketball
    if (currentSport.value === 'basketball') {
      console.log('[TeamCorrection] Applying corrections to ESPN players...')
      const correctedRostered = correctPlayerTeams(allRosteredPlayers, 'basketball')
      const correctedFas = correctPlayerTeams(freeAgents, 'basketball')
      allPlayers.value = [...correctedRostered, ...correctedFas]
      console.log('[TeamCorrection] ✅ Corrections applied to', allPlayers.value.length, 'ESPN players')
    } else {
      allPlayers.value = [...allRosteredPlayers, ...freeAgents]
    }
    
    selectAllPositions()
    
    const pitchers = allPlayers.value.filter(p => isPitcher(p))
    const hitters = allPlayers.value.filter(p => !isPitcher(p))
    console.log('[ESPN Projections] Players loaded:', allPlayers.value.length, '- Pitchers:', pitchers.length, '- Hitters:', hitters.length, '- Free Agents:', freeAgents.length)
    
    // Process teams for Teams tab
    processTeamsData()
    
  } catch (error) { 
    console.error('[ESPN Projections] Error loading:', error)
    loadingMessage.value = 'Error loading data' 
  } finally { 
    isLoading.value = false 
  }
}

// Helper functions for ESPN data transformation
function getEspnPositionAbbrev(positionId: number): string {
  const positions: Record<number, string> = {
    1: 'SP', 2: 'C', 3: '1B', 4: '2B', 5: '3B', 6: 'SS', 7: 'LF', 8: 'CF', 9: 'RF',
    10: 'DH', 11: 'RP', 12: 'P', 13: 'OF', 14: 'Util'
  }
  return positions[positionId] || 'Util'
}

function getEspnTeamAbbrev(teamId: number): string {
  const teams: Record<number, string> = {
    1: 'BAL', 2: 'BOS', 3: 'LAA', 4: 'CWS', 5: 'CLE', 6: 'DET', 7: 'KC', 8: 'MIL',
    9: 'MIN', 10: 'NYY', 11: 'OAK', 12: 'SEA', 13: 'TEX', 14: 'TOR', 15: 'ATL',
    16: 'CHC', 17: 'CIN', 18: 'HOU', 19: 'LAD', 20: 'WSH', 21: 'NYM', 22: 'PHI',
    23: 'PIT', 24: 'STL', 25: 'SD', 26: 'SF', 27: 'COL', 28: 'MIA', 29: 'ARI', 30: 'TB'
  }
  return teams[teamId] || ''
}

function transformEspnPlayerStats(statsArray: any[]): Record<string, number> {
  const stats: Record<string, number> = {}
  if (!statsArray || !Array.isArray(statsArray)) {
    // Check if it's already an object (not an array)
    if (statsArray && typeof statsArray === 'object' && !Array.isArray(statsArray)) {
      for (const [statId, value] of Object.entries(statsArray)) {
        stats[statId] = typeof value === 'number' ? value : parseFloat(value as string) || 0
      }
      return stats
    }
    return stats
  }
  
  // Look for season stats - try multiple sources
  // statSourceId: 0 = actuals, 1 = projections
  // statSplitTypeId: 0 = season total
  let seasonStats = statsArray.find((s: any) => s.statSourceId === 0 && s.statSplitTypeId === 0)
  
  // If not found, try just statSourceId 0
  if (!seasonStats?.stats) {
    seasonStats = statsArray.find((s: any) => s.statSourceId === 0)
  }
  
  // If still not found, try the first entry with stats
  if (!seasonStats?.stats) {
    seasonStats = statsArray.find((s: any) => s.stats && Object.keys(s.stats).length > 0)
  }
  
  if (seasonStats?.stats) {
    for (const [statId, value] of Object.entries(seasonStats.stats)) {
      stats[statId] = typeof value === 'number' ? value : parseFloat(value as string) || 0
    }
  }
  
  return stats
}

// ==================== TEAMS TAB FUNCTIONS ====================

// Computed: Ranked teams sorted by grade
const rankedTeams = computed(() => {
  return [...teamsData.value].sort((a, b) => {
    const gradeOrder = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F']
    return gradeOrder.indexOf(a.overallGrade || 'C') - gradeOrder.indexOf(b.overallGrade || 'C')
  })
})

// Gated ranked teams - show top 3 for non-premium users
const gatedRankedTeams = computed(() => {
  if (hasPremiumAccess.value) return rankedTeams.value
  return rankedTeams.value.slice(0, 3)
})

const hiddenTeamsCount = computed(() => {
  if (hasPremiumAccess.value) return 0
  return Math.max(0, rankedTeams.value.length - 3)
})

// Process teams data to calculate category ranks and grades
function processTeamsData() {
  if (!teamsData.value.length || !displayCategories.value.length) return
  
  const processedTeams = teamsData.value.map(team => {
    // Get players on this team
    const teamPlayers = allPlayers.value.filter((p: any) => p.fantasy_team_key === team.team_key)
    
    // Calculate category totals and find top contributors
    const categoryTotals: Record<string, number> = {}
    const topContributors: Record<string, any> = {}
    
    for (const cat of displayCategories.value) {
      const statId = cat.stat_id
      let total = 0
      let topPlayer: any = null
      let topValue = -Infinity
      
      for (const player of teamPlayers) {
        const value = parseFloat(player.stats?.[statId] || 0)
        if (!isNaN(value)) {
          // For counting stats, sum them up
          // For ratio stats like ERA/WHIP, we'd need weighted average (simplified here)
          if (!isRatioStat(cat)) {
            total += value
          } else {
            total = value // Just use as placeholder for ratio stats
          }
          
          if (value > topValue || (isLowerBetterStat(cat) && value < topValue)) {
            topValue = value
            topPlayer = { name: player.full_name, headshot: player.headshot, value }
          }
        }
      }
      
      categoryTotals[statId] = total
      if (topPlayer) {
        topContributors[statId] = topPlayer
      }
    }
    
    return {
      ...team,
      roster: teamPlayers,
      categoryTotals,
      topContributors,
      categoryRanks: {},
      overallGrade: 'C',
      strategy: 'Balanced',
      strongestCategories: [],
      weakestCategories: [],
      top3Count: 0,
      middleCount: 0,
      bottom3Count: 0
    }
  })
  
  // Calculate ranks for each category
  for (const cat of displayCategories.value) {
    const statId = cat.stat_id
    const isLowerBetter = isLowerBetterStat(cat)
    
    // Sort teams by this category
    const sorted = [...processedTeams].sort((a, b) => {
      const aVal = a.categoryTotals[statId] || 0
      const bVal = b.categoryTotals[statId] || 0
      return isLowerBetter ? aVal - bVal : bVal - aVal
    })
    
    // Assign ranks
    sorted.forEach((team, idx) => {
      team.categoryRanks[statId] = idx + 1
    })
  }
  
  // Calculate overall grades, strategies, and counts
  for (const team of processedTeams) {
    team.overallGrade = calculateTeamGrade(team)
    team.strategy = detectTeamStrategy(team)
    
    // Count top/middle/bottom
    const ranks = Object.values(team.categoryRanks) as number[]
    const totalTeams = processedTeams.length
    
    team.top3Count = ranks.filter(r => r <= 3).length
    team.bottom3Count = ranks.filter(r => r > totalTeams - 3).length
    team.middleCount = ranks.length - team.top3Count - team.bottom3Count
    
    // Find strongest and weakest categories
    const catRankPairs = displayCategories.value.map(c => ({
      name: c.display_name,
      rank: team.categoryRanks[c.stat_id] || 999
    }))
    
    team.strongestCategories = catRankPairs
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 5)
      .map(c => c.name)
    
    team.weakestCategories = catRankPairs
      .sort((a, b) => b.rank - a.rank)
      .slice(0, 5)
      .map(c => c.name)
  }
  
  teamsData.value = processedTeams
  console.log('Processed teams with grades:', processedTeams.length)
}

function calculateTeamGrade(team: any): string {
  const ranks = Object.values(team.categoryRanks || {}) as number[]
  if (ranks.length === 0) return 'C'
  
  const avgRank = ranks.reduce((a, b) => a + b, 0) / ranks.length
  const totalTeams = teamsData.value.length || 8
  const pct = (totalTeams - avgRank + 1) / totalTeams
  
  // Factor in balance - penalize high variance
  const variance = ranks.reduce((acc, r) => acc + Math.pow(r - avgRank, 2), 0) / ranks.length
  const balanceBonus = variance < 2 ? 0.1 : variance > 4 ? -0.1 : 0
  
  const adjustedPct = Math.min(1, Math.max(0, pct + balanceBonus))
  
  if (adjustedPct >= 0.85) return 'A+'
  if (adjustedPct >= 0.75) return 'A'
  if (adjustedPct >= 0.65) return 'A-'
  if (adjustedPct >= 0.55) return 'B+'
  if (adjustedPct >= 0.45) return 'B'
  if (adjustedPct >= 0.35) return 'B-'
  if (adjustedPct >= 0.25) return 'C+'
  if (adjustedPct >= 0.15) return 'C'
  return 'C-'
}

function detectTeamStrategy(team: any): string {
  const ranks = team.categoryRanks || {}
  const totalTeams = teamsData.value.length || 8
  const bottom3Threshold = totalTeams - 2
  
  // Find categories where team is bottom 3
  const puntedCats: string[] = []
  
  for (const cat of displayCategories.value) {
    const rank = ranks[cat.stat_id]
    if (rank && rank >= bottom3Threshold) {
      puntedCats.push(cat.display_name)
    }
  }
  
  // Check for punt strategies
  if (puntedCats.some(c => c === 'SV' || c.includes('Save'))) return 'Punt Saves'
  if (puntedCats.some(c => c === 'SB' || c.includes('Stolen'))) return 'Punt Steals'
  if (puntedCats.some(c => c === 'AVG' || c.includes('Average'))) return 'Punt AVG'
  
  // Check for heavy tilt
  const hittingRanks = hittingCategories.value.map(c => ranks[c.stat_id] || totalTeams / 2)
  const pitchingRanks = pitchingCategories.value.map(c => ranks[c.stat_id] || totalTeams / 2)
  
  if (hittingRanks.length && pitchingRanks.length) {
    const avgHitting = hittingRanks.reduce((a, b) => a + b, 0) / hittingRanks.length
    const avgPitching = pitchingRanks.reduce((a, b) => a + b, 0) / pitchingRanks.length
    
    if (avgHitting < avgPitching - 2) return 'Hitting Heavy'
    if (avgPitching < avgHitting - 2) return 'Pitching Heavy'
  }
  
  return 'Balanced'
}

function toggleTeamExpanded(team: any) {
  if (expandedTeamKey.value === team.team_key) {
    expandedTeamKey.value = null
  } else {
    expandedTeamKey.value = team.team_key
  }
}

function getTeamGradeColorClass(grade: string): string {
  if (!grade) return 'text-dark-textMuted'
  if (grade.startsWith('A')) return 'text-green-400'
  if (grade.startsWith('B')) return 'text-lime-400'
  if (grade.startsWith('C')) return 'text-yellow-400'
  if (grade.startsWith('D')) return 'text-orange-400'
  return 'text-red-400'
}

function getTeamCategoryGrade(rank: number): string {
  if (!rank) return '-'
  const totalTeams = teamsData.value.length || 8
  const pct = (totalTeams - rank + 1) / totalTeams
  
  if (pct >= 0.9) return 'A+'
  if (pct >= 0.8) return 'A'
  if (pct >= 0.7) return 'A-'
  if (pct >= 0.6) return 'B+'
  if (pct >= 0.5) return 'B'
  if (pct >= 0.4) return 'B-'
  if (pct >= 0.3) return 'C+'
  if (pct >= 0.2) return 'C'
  if (pct >= 0.1) return 'C-'
  return 'D'
}

function getCategoryHeatmapClass(rank: number): string {
  if (!rank) return 'bg-dark-border text-dark-textMuted'
  const totalTeams = teamsData.value.length || 8
  
  if (rank <= 3) return 'bg-green-500/80 text-white'
  if (rank <= Math.ceil(totalTeams / 2)) return 'bg-yellow-500/80 text-gray-900'
  if (rank > totalTeams - 3) return 'bg-red-500/80 text-white'
  return 'bg-orange-500/60 text-white'
}

function getTeamRankBadgeClass(rank: number): string {
  if (!rank) return 'bg-dark-border text-dark-textMuted'
  const totalTeams = teamsData.value.length || 8
  
  if (rank === 1) return 'bg-yellow-400 text-gray-900'
  if (rank <= 3) return 'bg-green-500/30 text-green-400'
  if (rank > totalTeams - 3) return 'bg-red-500/30 text-red-400'
  return 'bg-dark-border text-dark-textMuted'
}

function getStrategyClass(strategy: string): string {
  if (strategy?.includes('Punt')) return 'bg-purple-500/20 text-purple-400'
  if (strategy === 'Balanced') return 'bg-green-500/20 text-green-400'
  if (strategy?.includes('Heavy')) return 'bg-cyan-500/20 text-cyan-400'
  return 'bg-dark-border text-dark-textMuted'
}

function getStrategyIcon(strategy: string): string {
  if (strategy?.includes('Punt')) return '🎯'
  if (strategy === 'Balanced') return '⚖️'
  if (strategy?.includes('Pitching')) return '⚾'
  if (strategy?.includes('Hitting')) return '🏏'
  return '📊'
}

function formatTeamCategoryStat(value: any, cat: any): string {
  if (value === null || value === undefined || value === '') return '-'
  const num = parseFloat(value)
  if (isNaN(num)) return String(value)
  
  if (isRatioStat(cat)) {
    if (num < 1 && num > 0) return num.toFixed(3).replace(/^0/, '')
    return num.toFixed(2)
  }
  return Math.round(num).toString()
}

function refreshData() {
  if (isEspn.value) {
    loadEspnProjections()
  } else {
    loadProjections()
  }
}

// ==================== START/SIT TAB FUNCTIONS ====================

// Computed: My team name
const myTeamName = computed(() => {
  const myTeam = teamsData.value.find(t => t.team_key === myTeamKey.value)
  return myTeam?.name || 'My Team'
})

// Computed: Opponent name (simulated for now)
const opponentName = computed(() => {
  if (currentMatchup.value?.opponent) return currentMatchup.value.opponent.name
  // Find a different team as placeholder
  const opponent = teamsData.value.find(t => t.team_key !== myTeamKey.value)
  return opponent?.name || 'Opponent'
})

// Load real matchup data from Yahoo API
async function loadCurrentMatchup() {
  const leagueKey = leagueStore.activeLeagueId
  if (!leagueKey || !myTeamKey.value || isEspn.value) return
  
  isLoadingMatchup.value = true
  try {
    const metadata = await yahooService.getLeagueMetadata(leagueKey)
    const currentWeek = metadata.currentWeek
    
    console.log(`[loadCurrentMatchup] Loading matchup data for week ${currentWeek}`)
    
    // Get category matchups for current week
    const matchups = await yahooService.getCategoryMatchups(leagueKey, currentWeek)
    
    // Find my matchup
    const myMatchup = matchups.find(m => 
      m.teams.some((t: any) => t.team_key === myTeamKey.value)
    )
    
    if (myMatchup) {
      currentMatchupData.value = myMatchup
      console.log('[loadCurrentMatchup] Current matchup loaded:', {
        teams: myMatchup.teams.map((t: any) => t.name),
        stat_winners: myMatchup.stat_winners?.length || 0
      })
    } else {
      console.warn('[loadCurrentMatchup] Could not find matchup for team:', myTeamKey.value)
    }
  } catch (error) {
    console.error('[loadCurrentMatchup] Error loading matchup:', error)
    currentMatchupData.value = null
  } finally {
    isLoadingMatchup.value = false
  }
}

// Computed: Matchup category wins/losses/ties (simulated)
const matchupCategoryStatus = computed(() => {
  const status: Record<string, { myValue: number, oppValue: number, status: 'winning' | 'losing' | 'tied' | 'close' }> = {}
  
  // If we have real matchup data from Yahoo, use it
  if (currentMatchupData.value && currentMatchupData.value.teams) {
    const myTeam = currentMatchupData.value.teams.find((t: any) => t.team_key === myTeamKey.value)
    const oppTeam = currentMatchupData.value.teams.find((t: any) => t.team_key !== myTeamKey.value)
    
    if (myTeam && oppTeam) {
      for (const cat of displayCategories.value) {
        const statId = cat.stat_id
        const myValue = parseFloat(myTeam.stats?.[statId] || '0')
        const oppValue = parseFloat(oppTeam.stats?.[statId] || '0')
        
        // Check stat_winners from Yahoo for actual category result
        const statWinner = currentMatchupData.value.stat_winners?.find((sw: any) => sw.stat_id === statId)
        
        let catStatus: 'winning' | 'losing' | 'tied' | 'close'
        if (statWinner?.is_tied) {
          catStatus = 'tied'
        } else if (statWinner?.winner_team_key === myTeamKey.value) {
          catStatus = 'winning'
        } else if (statWinner?.winner_team_key && statWinner.winner_team_key !== myTeamKey.value) {
          catStatus = 'losing'
        } else {
          // Week in progress - calculate based on current values
          const isLowerBetter = isLowerBetterStat(cat)
          const diff = Math.abs(myValue - oppValue)
          const threshold = Math.max(myValue, oppValue) * 0.05 // 5% threshold for close
          
          if (diff < threshold) {
            catStatus = 'close'
          } else if (isLowerBetter) {
            catStatus = myValue < oppValue ? 'winning' : 'losing'
          } else {
            catStatus = myValue > oppValue ? 'winning' : 'losing'
          }
        }
        
        status[statId] = { myValue, oppValue, status: catStatus }
      }
      
      return status
    }
  }
  
  // Fallback: use season totals (old behavior when real matchup data unavailable)
  for (const cat of displayCategories.value) {
    const statId = cat.stat_id
    // Simulate matchup values based on team totals
    const myTeam = teamsData.value.find(t => t.team_key === myTeamKey.value)
    const oppTeam = teamsData.value.find(t => t.team_key !== myTeamKey.value)
    
    const myValue = myTeam?.categoryTotals?.[statId] || Math.random() * 100
    const oppValue = oppTeam?.categoryTotals?.[statId] || Math.random() * 100
    
    const isLowerBetter = isLowerBetterStat(cat)
    const diff = Math.abs(myValue - oppValue)
    const threshold = Math.max(myValue, oppValue) * 0.1 // 10% threshold for "close"
    
    let catStatus: 'winning' | 'losing' | 'tied' | 'close'
    if (isLowerBetter) {
      if (myValue < oppValue - threshold) catStatus = 'winning'
      else if (myValue > oppValue + threshold) catStatus = 'losing'
      else if (Math.abs(myValue - oppValue) < threshold) catStatus = 'close'
      else catStatus = 'tied'
    } else {
      if (myValue > oppValue + threshold) catStatus = 'winning'
      else if (myValue < oppValue - threshold) catStatus = 'losing'
      else if (Math.abs(myValue - oppValue) < threshold) catStatus = 'close'
      else catStatus = 'tied'
    }
    
    status[statId] = { myValue, oppValue, status: catStatus }
  }
  
  return status
})

const matchupWins = computed(() => Object.values(matchupCategoryStatus.value).filter(s => s.status === 'winning').length)
const matchupLosses = computed(() => Object.values(matchupCategoryStatus.value).filter(s => s.status === 'losing').length)
const matchupTies = computed(() => Object.values(matchupCategoryStatus.value).filter(s => s.status === 'tied' || s.status === 'close').length)

// Computed: Categories by status
const winningCategories = computed(() => {
  return displayCategories.value.filter(cat => matchupCategoryStatus.value[cat.stat_id]?.status === 'winning')
})

const closeOrLosingCategories = computed(() => {
  return displayCategories.value
    .filter(cat => {
      const status = matchupCategoryStatus.value[cat.stat_id]?.status
      return status === 'losing' || status === 'close'
    })
    .map(cat => {
      const status = matchupCategoryStatus.value[cat.stat_id]
      return {
        ...cat,
        myValue: formatTeamCategoryStat(status?.myValue, cat),
        oppValue: formatTeamCategoryStat(status?.oppValue, cat),
        diff: Math.abs((status?.myValue || 0) - (status?.oppValue || 0)).toFixed(1),
        status: status?.status
      }
    })
})

// Computed: Relevant categories for current position type
const relevantStartSitCategories = computed(() => {
  const sport = currentSport.value
  
  // Baseball: Filter by hitting vs pitching
  if (sport === 'baseball') {
    const isPitching = ['SP', 'RP', 'P'].includes(selectedStartSitPosition.value)
    return isPitching ? pitchingCategories.value : hittingCategories.value
  }
  
  // All other sports: Use all display categories
  return displayCategories.value
})

// Computed: Format date for display
const formatStartSitDate = computed(() => {
  const date = new Date()
  if (startSitDay.value === 'tomorrow') date.setDate(date.getDate() + 1)
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
})

// Get players for a position in Start/Sit
function getStartSitPlayersForPosition(position: string): any[] {
  let players = allPlayers.value.filter(p => {
    const pos = p.position || ''
    if (position === 'OF') return pos.includes('OF') || pos.includes('LF') || pos.includes('CF') || pos.includes('RF')
    return pos.includes(position)
  })
  
  // Apply player filter
  if (startSitPlayerFilter.value === 'mine') {
    players = players.filter(p => p.fantasy_team_key === myTeamKey.value || !p.fantasy_team_key)
  } else if (startSitPlayerFilter.value === 'fa') {
    players = players.filter(p => !p.fantasy_team_key)
  }
  
  // Add simulated game info
  players = players.map(p => ({
    ...p,
    hasGame: Math.random() > 0.2, // 80% chance of having a game
    opponent: Math.random() > 0.2 ? ['vs NYY', 'vs BOS', '@ LAD', '@ CHC', 'vs HOU', '@ ATL'][Math.floor(Math.random() * 6)] : null,
    gamesThisWeek: Math.floor(Math.random() * 4) + 3, // 3-6 games
    impactScore: calculatePlayerImpact(p)
  }))
  
  // Filter by game availability in daily mode
  if (startSitMode.value === 'daily') {
    players = players.filter(p => p.hasGame)
  }
  
  // Sort by impact score
  return players.sort((a, b) => b.impactScore - a.impactScore)
}

// Calculate player impact score based on matchup needs
function calculatePlayerImpact(player: any): number {
  let impact = 0
  const cats = ['SP', 'RP'].includes(selectedStartSitPosition.value) ? pitchingCategories.value : hittingCategories.value
  
  for (const cat of cats) {
    const statId = cat.stat_id
    const playerValue = parseFloat(player.stats?.[statId] || 0)
    const catStatus = matchupCategoryStatus.value[statId]?.status
    
    // Higher weight for categories we're losing or close in
    if (catStatus === 'losing') impact += playerValue * 3
    else if (catStatus === 'close') impact += playerValue * 2
    else if (catStatus === 'winning') impact += playerValue * 0.5
  }
  
  return impact
}

// Get impact label
function getImpactLabel(player: any): string {
  const score = player.impactScore || 0
  if (score >= 50) return 'HIGH'
  if (score >= 25) return 'MED'
  if (score >= 10) return 'LOW'
  return 'MIN'
}

// Get impact category count
function getImpactCategoryCount(player: any): number {
  let count = 0
  const cats = ['SP', 'RP'].includes(selectedStartSitPosition.value) ? pitchingCategories.value : hittingCategories.value
  
  for (const cat of cats) {
    const statId = cat.stat_id
    const playerValue = parseFloat(player.stats?.[statId] || 0)
    const catStatus = matchupCategoryStatus.value[statId]?.status
    
    if (playerValue > 0 && (catStatus === 'losing' || catStatus === 'close')) {
      count++
    }
  }
  return count
}

function getImpactClass(player: any): string {
  const label = getImpactLabel(player)
  if (label === 'HIGH') return 'bg-green-500/30 text-green-400'
  if (label === 'MED') return 'bg-yellow-500/30 text-yellow-400'
  if (label === 'LOW') return 'bg-orange-500/30 text-orange-400'
  return 'bg-dark-border text-dark-textMuted'
}

// Smart recommendation based on matchup context
function getRecommendation(player: any): { verdict: string; reason: string } {
  const isPitcherPlayer = isPitcher(player)
  const cats = isPitcherPlayer ? pitchingCategories.value : hittingCategories.value
  
  // Count which categories this player helps that we need
  const helpsCats: string[] = []
  const helpsWinningCats: string[] = []
  
  for (const cat of cats) {
    const statId = cat.stat_id
    const playerValue = parseFloat(player.stats?.[statId] || 0)
    if (playerValue <= 0) continue
    
    const catStatus = matchupCategoryStatus.value[statId]?.status
    if (catStatus === 'losing' || catStatus === 'close') {
      helpsCats.push(cat.display_name)
    } else if (catStatus === 'winning') {
      helpsWinningCats.push(cat.display_name)
    }
  }
  
  const isFreeAgent = !player.fantasy_team_key
  const isMyPlayer = player.fantasy_team_key === myTeamKey.value
  
  // Generate smart recommendation
  if (isFreeAgent) {
    if (helpsCats.length >= 3) {
      return { verdict: '🔥 PICKUP', reason: `Helps ${helpsCats.slice(0, 3).join(', ')}` }
    } else if (helpsCats.length >= 1) {
      return { verdict: '📈 Consider', reason: `Boosts ${helpsCats[0]}` }
    }
    return { verdict: '➖ Pass', reason: 'Low impact on needs' }
  }
  
  if (isMyPlayer) {
    if (helpsCats.length >= 4) {
      return { verdict: '🔥 MUST START', reason: `Helps ${helpsCats.length} categories` }
    } else if (helpsCats.length >= 2) {
      return { verdict: '✅ Start', reason: `For ${helpsCats.slice(0, 2).join(', ')}` }
    } else if (helpsCats.length === 1) {
      return { verdict: '🟡 Flex', reason: `Start for ${helpsCats[0]}` }
    } else if (helpsWinningCats.length >= 2) {
      return { verdict: '⚪ Sit OK', reason: `Already winning ${helpsWinningCats[0]}` }
    }
    return { verdict: '🔻 Sit', reason: "Won't help matchup" }
  }
  
  // Other team's player
  if (helpsCats.length >= 3) {
    return { verdict: '⚠️ Threat', reason: `Strong in ${helpsCats.length} cats` }
  }
  return { verdict: '—', reason: 'Opponent' }
}

function getRecommendationClass(player: any): string {
  const rec = getRecommendation(player)
  if (rec.verdict.includes('MUST START') || rec.verdict.includes('PICKUP')) return 'bg-green-500/30 text-green-400'
  if (rec.verdict.includes('Start') || rec.verdict.includes('Consider')) return 'bg-lime-500/30 text-lime-400'
  if (rec.verdict.includes('Flex')) return 'bg-yellow-500/30 text-yellow-400'
  if (rec.verdict.includes('Sit OK')) return 'bg-dark-border text-dark-textMuted'
  if (rec.verdict.includes('Sit') || rec.verdict.includes('Pass')) return 'bg-orange-500/30 text-orange-400'
  if (rec.verdict.includes('Threat')) return 'bg-red-500/30 text-red-400'
  return 'bg-dark-border text-dark-textMuted'
}

// Pickup suggestions - free agents who can help flip categories
const pickupSuggestions = computed(() => {
  const freeAgents = allPlayers.value.filter(p => !p.fantasy_team_key)
  const isPitchingPosition = ['SP', 'RP'].includes(selectedStartSitPosition.value)
  
  // Filter to relevant position
  const relevantFAs = freeAgents.filter(p => {
    const pos = p.position || ''
    if (selectedStartSitPosition.value === 'OF') {
      return pos.includes('OF') || pos.includes('LF') || pos.includes('CF') || pos.includes('RF')
    }
    if (isPitchingPosition) {
      return pos.includes('SP') || pos.includes('RP') || pos.includes('P')
    }
    return pos.includes(selectedStartSitPosition.value)
  })
  
  // Score each FA by how much they help losing/close categories
  const scored = relevantFAs.map(player => {
    const cats = isPitchingPosition ? pitchingCategories.value : hittingCategories.value
    const helpsWith: string[] = []
    let impactScore = 0
    
    for (const cat of cats) {
      const statId = cat.stat_id
      const playerValue = parseFloat(player.stats?.[statId] || 0)
      if (playerValue <= 0) continue
      
      const catStatus = matchupCategoryStatus.value[statId]?.status
      if (catStatus === 'losing') {
        helpsWith.push(cat.display_name)
        impactScore += playerValue * 3
      } else if (catStatus === 'close') {
        helpsWith.push(cat.display_name)
        impactScore += playerValue * 2
      }
    }
    
    // Generate reason
    let reason = ''
    if (helpsWith.length >= 3) {
      reason = `Could flip ${helpsWith[0]} and boost ${helpsWith.length - 1} more categories`
    } else if (helpsWith.length >= 1) {
      reason = `Available to help with ${helpsWith.join(', ')}`
    } else {
      reason = 'Depth add'
    }
    
    return {
      ...player,
      helpsWith: helpsWith.slice(0, 3),
      impactScore: Math.round(impactScore),
      reason
    }
  })
  
  // Sort by impact and return top 3
  return scored
    .filter(p => p.impactScore > 0)
    .sort((a, b) => b.impactScore - a.impactScore)
    .slice(0, 3)
})

function getCategoryMatchupClass(statId: string): string {
  const status = matchupCategoryStatus.value[statId]?.status
  if (status === 'winning') return 'bg-green-500/30 text-green-400'
  if (status === 'losing') return 'bg-red-500/30 text-red-400'
  if (status === 'close') return 'bg-yellow-500/30 text-yellow-400'
  return 'bg-dark-border text-dark-textMuted'
}

function getCategoryMatchupTooltip(statId: string): string {
  const cat = displayCategories.value.find(c => c.stat_id === statId)
  const status = matchupCategoryStatus.value[statId]
  if (!status) return cat?.name || ''
  return `${cat?.name}: ${status.myValue.toFixed(1)} vs ${status.oppValue.toFixed(1)}`
}

function getCategoryHeaderClass(statId: string): string {
  const status = matchupCategoryStatus.value[statId]?.status
  if (status === 'winning') return 'text-green-400'
  if (status === 'losing') return 'text-red-400'
  if (status === 'close') return 'text-yellow-400'
  return 'text-dark-textMuted'
}

function getCategoryProjectionClass(player: any, cat: any): string {
  // Get all values for this category from available free agents
  const allValues = availableFreeAgents.value
    .map(p => parseFloat(formatCategoryProjection(p, cat).replace('%', '').replace('-', '0') || '0'))
    .filter(v => !isNaN(v) && v > 0)
  
  if (allValues.length === 0) return 'text-dark-text'
  
  const currentValue = parseFloat(formatCategoryProjection(player, cat).replace('%', '').replace('-', '0') || '0')
  if (currentValue === 0 || isNaN(currentValue)) return 'text-dark-text'
  
  const max = Math.max(...allValues)
  const min = Math.min(...allValues)
  
  // Best value = green
  if (currentValue === max) return 'text-green-400'
  
  // Worst value = yellow  
  if (currentValue === min) return 'text-yellow-400'
  
  // Everything else = white
  return 'text-dark-text'
}

// Get matchup difficulty color based on opponent defensive strength for player's position
function getMatchupDifficultyClass(player: any): string {
  // This is a simplified version - in reality you'd want actual opponent defensive rankings
  // For now, we'll use a hash-based approach to vary colors realistically
  
  if (!player.opponent) return 'text-dark-textMuted'
  
  // Simple hash to get consistent color for same matchup
  const hash = (player.opponent + player.position).split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc)
  }, 0)
  
  const difficulty = Math.abs(hash) % 3
  
  // 0 = Easy (green), 1 = Average (yellow), 2 = Hard (red)
  if (difficulty === 0) return 'text-green-400'  // Easy matchup
  if (difficulty === 1) return 'text-yellow-400' // Average matchup  
  return 'text-red-400' // Hard matchup
}

// Helper: Get estimated game count for time period based on sport
function getGameCountForPeriod(player: any): number {
  const sport = currentSport.value
  const period = startSitTimePeriod.value
  const hasGame = player.hasGameToday || false
  
  // Today: 1 game if playing, 0 if not
  if (period === 'today') {
    return hasGame ? 1 : 0
  }
  
  // Next 7/14/ROS: estimate based on sport schedules
  if (sport === 'baseball') {
    if (period === 'next7') return 6   // ~6 games per week
    if (period === 'next14') return 12 // ~12 games per 2 weeks
    return 50 // ROS: ~50 games remaining (average)
  } else if (sport === 'basketball' || sport === 'hockey') {
    if (period === 'next7') return 3   // ~3 games per week
    if (period === 'next14') return 6  // ~6 games per 2 weeks
    return 30 // ROS: ~30 games remaining (average)
  } else if (sport === 'football') {
    if (period === 'next7') return 1   // 1 game per week
    if (period === 'next14') return 2  // 2 games per 2 weeks
    return 8  // ROS: ~8 games remaining (average)
  }
  
  // Fallback
  return period === 'ros' ? 30 : 4
}

function formatCategoryProjection(player: any, category: any): string {
  if (!player || !category) return '-'
  
  // DEBUG: Log the first time we see a player
  if (Math.random() < 0.01) { // Only log 1% of the time to avoid spam
    console.log('[formatCategoryProjection] DEBUG:', {
      player: player.full_name,
      categoryId: category.stat_id,
      categoryName: category.display_name,
      playerStats: player.stats,
      statKeys: player.stats ? Object.keys(player.stats) : 'no stats',
      statValue: player.stats?.[category.stat_id]
    })
  }
  
  // Check if this is a percentage stat - be very thorough
  const statId = String(category.stat_id || '').toLowerCase()
  const displayName = String(category.display_name || '').toLowerCase()
  const isPercentage = 
    statId.includes('%') || 
    statId.includes('pct') || 
    statId.includes('percentage') ||
    displayName.includes('%') ||
    displayName.includes('pct') ||
    displayName.includes('percentage') ||
    statId === 'fg%' || statId === 'ft%' || statId === '3p%' || statId === 'fg_pct' || statId === 'ft_pct' ||
    statId === 'fgpct' || statId === 'ftpct' || statId === '3ppct' ||
    statId === '5' || // Yahoo FG%
    statId === '15' || // Yahoo FT%
    category.stat_id === 5 || // Numeric Yahoo FG%
    category.stat_id === 15 // Numeric Yahoo FT%
  
  // Determine if we're showing projections or stats
  const period = availableTimePeriod.value
  const isProjection = ['today', 'next7', 'next14', 'ros'].includes(period)
  
  let projection: string
  
  if (isProjection) {
    // Use projection function
    if (period === 'today') {
      projection = getPlayerProjection(player, category, 'today')
    } else if (period === 'next7') {
      projection = getPlayerProjection(player, category, 'next7')
    } else if (period === 'next14') {
      projection = getPlayerProjection(player, category, 'next14')
    } else { // ros
      projection = getPlayerSeasonProjection(player, category)
    }
  } else {
    // Show historical stats
    projection = getPlayerHistoricalStat(player, category, period as 'last7' | 'last14' | 'season')
  }
  
  // If it's actually zero/empty, show dash
  if (projection === '0' || projection === '0.0' || projection === '0.00' || projection === '0.000') return '-'
  
  // For percentages, convert to percentage format
  if (isPercentage) {
    const numValue = parseFloat(projection)
    if (isNaN(numValue)) return '-'
    
    console.log('[formatCategoryProjection] Percentage detected:', {
      statId: category.stat_id,
      displayName: category.display_name,
      value: numValue,
      player: player.full_name
    })
    
    // If value is already in percentage form (> 1), just add %
    if (numValue >= 1) {
      return numValue.toFixed(1) + '%'
    }
    // If value is very small (< 0.01), it's probably a decimal that needs conversion
    else if (numValue < 0.01) {
      return (numValue * 100).toFixed(2) + '%'
    }
    // If value is decimal (like 0.472), convert to percentage
    else {
      return (numValue * 100).toFixed(1) + '%'
    }
  }
  
  return projection
}

function getCategoryPerGame(player: any, cat: any): string {
  const seasonValue = parseFloat(player.stats?.[cat.stat_id] || 0)
  
  // Percentages don't have "per game" - they're rates
  if (isPercentageStat(cat)) {
    const percentValue = seasonValue * 100
    return percentValue.toFixed(1) + '%'
  }
  
  const gamesPlayed = isPitcher(player) ? 30 : 140
  const perGame = seasonValue / gamesPlayed
  
  if (isRatioStat(cat)) {
    if (perGame < 1) return perGame.toFixed(3).replace(/^0/, '')
    return perGame.toFixed(2)
  }
  return perGame.toFixed(2)
}

function getProjectedCategoryTotal(cat: any): string {
  const players = getStartSitPlayersForPosition(selectedStartSitPosition.value)
    .filter(p => p.fantasy_team_key === myTeamKey.value)
  
  const mode = startSitViewMode.value
  const period = startSitTimePeriod.value
  const isPercentage = isPercentageStat(cat)
  
  // Percentages are averaged, not summed
  if (isPercentage) {
    let sum = 0
    let count = 0
    for (const player of players) {
      const seasonValue = parseFloat(player.stats?.[cat.stat_id] || 0)
      if (seasonValue > 0) {
        sum += seasonValue
        count++
      }
    }
    if (count === 0) return '-'
    const avgValue = (sum / count) * 100
    return avgValue.toFixed(1) + '%'
  }
  
  let total = 0
  for (const player of players) {
    const seasonValue = parseFloat(player.stats?.[cat.stat_id] || 0)
    const gamesPlayed = isPitcher(player) ? 30 : 140
    
    if (mode === 'stats') {
      // STATS MODE: actual past performance
      if (period === 'ros') {
        // Full season
        total += seasonValue
      } else {
        // Last 7 or Last 14 - scale from season
        const games = period === 'next7' ? 
          (currentSport.value === 'baseball' ? 6 : 3) : 
          (currentSport.value === 'baseball' ? 12 : 6)
        const perGame = seasonValue / gamesPlayed
        total += perGame * games
      }
    } else {
      // PROJECTIONS MODE: future projections
      const games = getGameCountForPeriod(player)
      if (games === 0) continue // Skip players with no games
      
      const perGame = seasonValue / gamesPlayed
      total += perGame * games
    }
  }
  
  if (isRatioStat(cat)) return total.toFixed(2)
  return total.toFixed(1)
}

function getStartSitPositionClass(position: string): string {
  const colors: Record<string, string> = {
    'C': 'bg-purple-500/20 text-purple-400',
    '1B': 'bg-red-500/20 text-red-400',
    '2B': 'bg-green-500/20 text-green-400',
    '3B': 'bg-blue-500/20 text-blue-400',
    'SS': 'bg-yellow-500/20 text-yellow-400',
    'OF': 'bg-orange-500/20 text-orange-400',
    'SP': 'bg-cyan-500/20 text-cyan-400',
    'RP': 'bg-pink-500/20 text-pink-400'
  }
  return colors[position] || 'bg-dark-border text-dark-textMuted'
}

function getStartSitRowClass(player: any): string {
  if (player.fantasy_team_key === myTeamKey.value) return 'bg-yellow-500/20 border-l-4 border-l-yellow-400'
  if (!player.fantasy_team_key) return 'bg-cyan-500/20 border-l-4 border-l-cyan-400'
  return ''
}

function getStartSitAvatarClass(player: any): string {
  if (player.fantasy_team_key === myTeamKey.value) return 'ring-yellow-400'
  if (!player.fantasy_team_key) return 'ring-cyan-400'
  return 'ring-dark-border'
}

function getStartSitPlayerNameClass(player: any): string {
  if (player.fantasy_team_key === myTeamKey.value) return 'text-yellow-400'
  if (!player.fantasy_team_key) return 'text-cyan-400'
  return 'text-dark-text'
}

// ==================== PLAYER SWAP FUNCTIONS ====================

// Computed: Roster spots available (accounting for IR)
const rosterSpotsAvailable = computed(() => {
  try {
    // Calculate from actual roster: total slots - current players
    const myPlayers = allPlayers.value?.filter(p => p.fantasy_team_key === myTeamKey.value) || []
    const totalSlots = totalRosterSlots.value || 25 // Use league roster positions or default
    const currentPlayers = myPlayers.length
    const openSpots = totalSlots - currentPlayers
    
    console.log('[rosterSpotsAvailable]', {
      totalSlots,
      currentPlayers,
      openSpots,
      rosterPositions: leagueRosterPositions.value?.length || 0
    })
    
    return Math.max(0, openSpots) // Never negative
  } catch (error) {
    console.error('[rosterSpotsAvailable] Error:', error)
    return 0
  }
})

// Computed: Droppable players (my team, sorted by value)
const droppablePlayers = computed(() => {
  return allPlayers.value
    .filter(p => p.fantasy_team_key === myTeamKey.value)
    .sort((a, b) => (a.overallValue || 0) - (b.overallValue || 0)) // Lowest value first
})

// Computed: Modified lineup including waiver pickups
const modifiedSuggestedLineup = computed(() => {
  const lineup = [...suggestedCategoryLineup.value]
  
  // Add waiver players to their appropriate slots
  for (const waiverPlayer of waiverLineupPlayers.value) {
    const pos = waiverPlayer.position?.split(',')[0]?.trim() || 'Util'
    const slotIdx = lineup.findIndex(s => 
      (s.position === pos || s.position === 'Util') && 
      (!s.player || s.player.overallValue < waiverPlayer.overallValue)
    )
    if (slotIdx >= 0) {
      lineup[slotIdx] = { ...lineup[slotIdx], player: waiverPlayer, isWaiver: true }
    }
  }
  
  return lineup
})

// Group lineup by position type for better organization
const groupedLineup = computed(() => {
  // Safety check
  if (!modifiedSuggestedLineup.value || modifiedSuggestedLineup.value.length === 0) return []
  
  try {
    const groups: { position: string; slots: any[]; total: number; filled: number }[] = []
    const positionMap = new Map<string, any[]>()
    
    // Group slots by position
    for (const slot of modifiedSuggestedLineup.value) {
      if (!slot || !slot.position) continue
      if (!positionMap.has(slot.position)) {
        positionMap.set(slot.position, [])
      }
      positionMap.get(slot.position)!.push(slot)
    }
    
    // Convert to array with stats
    for (const [position, slots] of positionMap.entries()) {
      groups.push({
        position,
        slots,
        total: slots.length,
        filled: slots.filter(s => s && s.player).length
      })
    }
    
    return groups
  } catch (error) {
    console.error('[groupedLineup] Error:', error)
    return []
  }
})

function openSwapModal(player: any) {
  // If clicking a free agent and at roster limit, show drop modal
  if (!player.fantasy_team_key && rosterSpotsAvailable.value <= 0) {
    dropModalPlayer.value = player
    selectedDropPlayer.value = null
    showDropModal.value = true
    return
  }
  
  // If clicking a free agent with roster space, add directly
  if (!player.fantasy_team_key) {
    addToWaiverLineup(player)
    return
  }
  
  // Otherwise show regular swap modal for rostered players
  swapSourcePlayer.value = player
  selectedSwapTarget.value = null
  swapImpact.value = null
  showSwapModal.value = true
}

function addToWaiverLineup(player: any) {
  if (waiverLineupPlayers.value.some(p => p.player_key === player.player_key)) return
  waiverLineupPlayers.value.push({ ...player, isWaiver: true })
}

function removeFromWaiverLineup(player: any) {
  waiverLineupPlayers.value = waiverLineupPlayers.value.filter(p => p.player_key !== player.player_key)
}

function clearWaiverLineup() {
  waiverLineupPlayers.value = []
}

// Download suggested lineup as text file
function downloadSuggestedCategoryLineup() {
  const date = startSitDay.value === 'today' 
    ? new Date().toISOString().split('T')[0]
    : new Date(Date.now() + 86400000).toISOString().split('T')[0]
  const mode = startSitMode.value === 'daily' ? 'Daily' : 'Weekly'
  
  let content = `Suggested Lineup - ${mode} (${date})\n`
  content += `${'='.repeat(60)}\n\n`
  content += `STARTERS\n`
  content += `${'='.repeat(60)}\n`
  
  modifiedSuggestedLineup.value.forEach(slot => {
    const pos = slot.position.padEnd(6)
    if (slot.player) {
      const name = slot.player.full_name.padEnd(25)
      const opponent = slot.player.opponent || (slot.player.hasGame ? `${slot.player.gamesThisWeek} games` : 'No game')
      const oppStr = opponent.padEnd(15)
      const cats = `${slot.player.impactCats || 0} cats`
      const waiverTag = slot.isWaiver ? ' [WAIVER]' : ''
      content += `${pos} ${name} ${oppStr} ${cats}${waiverTag}\n`
    } else {
      content += `${pos} (Empty)\n`
    }
  })
  
  if (benchPlayers.value.length > 0) {
    content += `\nBENCH (${benchPlayers.value.length})\n`
    content += `${'='.repeat(60)}\n`
    benchPlayers.value.forEach(player => {
      const name = player.full_name.padEnd(25)
      const pos = (player.position?.split(',')[0] || '').padEnd(6)
      const opponent = player.opponent || (player.hasGame ? `${player.gamesThisWeek} games` : 'No game')
      content += `${pos} ${name} ${opponent}\n`
    })
  }
  
  content += `\nGenerated by Ultimate Fantasy Dashboard\n`
  content += `ultimatefantasydashboard.com\n`
  
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `category-lineup-${date}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

// Function to analyze a specific waiver move
function analyzeWaiverMove(player: any) {
  // Open modal showing this player vs all droppable players
  swapSourcePlayer.value = player
  selectedSwapTarget.value = null
  swapImpact.value = null
  showSwapModal.value = true
}

// Function to approve a waiver move
function approveWaiverMove(recommendation: any) {
  // This would integrate with your waiver system
  // For now, just show confirmation
  alert(`Move approved: Add ${recommendation.addPlayer.full_name}, Drop ${recommendation.dropPlayer.full_name}`)
  // In production, this would:
  // 1. Add to waiver lineup
  // 2. Queue waiver claim
  // 3. Update UI
}

// Open position picker modal
function openPositionPicker(position: string) {
  positionPickerPosition.value = position
  // Set the selected position filter
  selectedStartSitPosition.value = position
  showPositionPickerModal.value = true
}

// Get players filtered by position for the modal
function getPositionFilteredPlayers(position: string) {
  if (!availableFreeAgents.value) return []
  
  return availableFreeAgents.value.filter(p => {
    const playerPos = p.position || ''
    
    // Handle Util/Flex positions
    if (position === 'Util' || position === 'Flex') {
      const sport = currentSport.value
      if (sport === 'baseball') return !playerPos.includes('SP') && !playerPos.includes('RP')
      if (sport === 'hockey') return !playerPos.includes('G')
      return true
    }
    
    // Handle guard/forward positions in basketball
    if (currentSport.value === 'basketball') {
      if (position === 'G') return playerPos.includes('PG') || playerPos.includes('SG') || playerPos.includes('G')
      if (position === 'F') return playerPos.includes('SF') || playerPos.includes('PF') || playerPos.includes('F')
    }
    
    // Handle OF in baseball
    if (position === 'OF') return playerPos.includes('OF') || playerPos.includes('LF') || playerPos.includes('CF') || playerPos.includes('RF')
    
    return playerPos.includes(position)
  })
}

// Open player analysis modal
function openPlayerAnalysis(player: any) {
  try {
    console.log('[openPlayerAnalysis] Opening analysis for:', player?.full_name || player?.name)
    console.log('[openPlayerAnalysis] Player data:', player)
    
    if (!player) {
      console.error('[openPlayerAnalysis] No player data provided!')
      return
    }
    
    playerAnalysisData.value = player
    showPlayerAnalysisModal.value = true
    
    console.log('[openPlayerAnalysis] Modal opened successfully')
  } catch (error) {
    console.error('[openPlayerAnalysis] Error opening modal:', error)
  }
}

function openPlayerComparison(addPlayer: any, dropPlayer: any) {
  console.log('[openPlayerComparison] Opening comparison:', addPlayer?.full_name, 'vs', dropPlayer?.full_name)
  
  if (!addPlayer || !dropPlayer) {
    console.error('[openPlayerComparison] Missing player data!')
    return
  }
  
  comparisonPlayerAdd.value = addPlayer
  comparisonPlayerDrop.value = dropPlayer
  
  // Default to first category
  if (displayCategories.value.length > 0) {
    comparisonSelectedCategory.value = displayCategories.value[0].stat_id
  }
  
  showPlayerComparisonModal.value = true
}

// Helper functions for matchup analysis modal
function getCategoryMatchupStatus(statId: string): string {
  const status = matchupCategoryStatus.value[statId]?.status
  if (status === 'winning') return 'Winning'
  if (status === 'losing') return 'Losing'
  if (status === 'close') return 'Close'
  return 'Tied'
}

function getCategoryMatchupTextClass(statId: string): string {
  const status = matchupCategoryStatus.value[statId]?.status
  if (status === 'winning') return 'text-green-400'
  if (status === 'losing') return 'text-red-400'
  if (status === 'close') return 'text-yellow-400'
  return 'text-dark-textMuted'
}

function getCategoryDifference(statId: string): string {
  const data = matchupCategoryStatus.value[statId]
  if (!data) return '0'
  
  const diff = data.myValue - data.oppValue
  const sign = diff > 0 ? '+' : ''
  return `${sign}${diff.toFixed(1)}`
}

function getCategoryDifferenceClass(statId: string): string {
  const data = matchupCategoryStatus.value[statId]
  if (!data) return 'text-dark-textMuted'
  
  const diff = data.myValue - data.oppValue
  if (diff > 0) return 'text-green-400'
  if (diff < 0) return 'text-red-400'
  return 'text-yellow-400'
}

const getSafeCategoryNames = computed(() => {
  const safe = displayCategories.value
    .filter(cat => matchupCategoryStatus.value[cat.stat_id]?.status === 'winning')
    .map(cat => cat.display_name)
  return safe.length > 0 ? safe.join(', ') : 'None yet'
})

const getCloseCategoryNames = computed(() => {
  const close = displayCategories.value
    .filter(cat => matchupCategoryStatus.value[cat.stat_id]?.status === 'close')
    .map(cat => cat.display_name)
  return close.length > 0 ? close.join(', ') : 'None'
})

const getLosingCategoryNames = computed(() => {
  const losing = displayCategories.value
    .filter(cat => matchupCategoryStatus.value[cat.stat_id]?.status === 'losing')
    .map(cat => cat.display_name)
  return losing.length > 0 ? losing.join(', ') : 'None'
})

function closeDropModal() {
  showDropModal.value = false
  dropModalPlayer.value = null
  selectedDropPlayer.value = null
}

function confirmDrop() {
  if (!selectedDropPlayer.value || !dropModalPlayer.value) return
  
  // Remove the dropped player from our "virtual roster"
  // In a real implementation, this would queue up a waiver claim
  
  // Add the pickup to waiver lineup
  addToWaiverLineup(dropModalPlayer.value)
  
  closeDropModal()
}

// Get player projection for different time periods
function getPlayerCategoryProjection(player: any, period: string, category: any): number {
  const basePerGame = player.perGameValue || player.stats?.[category?.stat_id] || 0
  
  switch (period) {
    case 'today': return player.hasGame ? basePerGame : 0
    case 'next7': return basePerGame * 5.5 // ~5.5 games in 7 days
    case 'next14': return basePerGame * 11
    case 'ros': return player.projectedValue || basePerGame * 60
    default: return basePerGame
  }
}

// Get player stats for looking back
function getPlayerCategoryStats(player: any, period: string, category: any): number {
  const seasonTotal = player.currentValue || player.stats?.[category?.stat_id] || 0
  const perGame = player.perGameValue || 0
  
  switch (period) {
    case 'l7': return perGame * 5 // Last 7 days estimate
    case 'l14': return perGame * 10
    case 'season': return seasonTotal
    default: return perGame
  }
}

function closeSwapModal() {
  showSwapModal.value = false
  swapSourcePlayer.value = null
  selectedSwapTarget.value = null
  swapImpact.value = null
}

function getSwapCandidates(): any[] {
  if (!swapSourcePlayer.value) return []
  
  const sourcePos = swapSourcePlayer.value.position || ''
  const sourceIsMyPlayer = swapSourcePlayer.value.fantasy_team_key === myTeamKey.value
  
  // Get my players at similar positions
  const myPlayers = allPlayers.value.filter(p => {
    if (p.fantasy_team_key !== myTeamKey.value) return false
    if (p.player_key === swapSourcePlayer.value.player_key) return false
    
    const playerPos = p.position || ''
    // Check if positions overlap
    const sourcePositions = sourcePos.split(',').map((s: string) => s.trim())
    const playerPositions = playerPos.split(',').map((s: string) => s.trim())
    
    // Allow any overlap or if either is Util
    return sourcePositions.some((sp: string) => 
      playerPositions.includes(sp) || sp === 'Util' || playerPositions.includes('Util')
    ) || (isPitcher(swapSourcePlayer.value) && isPitcher({ position: playerPos }))
      || (!isPitcher(swapSourcePlayer.value) && !isPitcher({ position: playerPos }))
  })
  
  // Add game info
  return myPlayers.map(p => ({
    ...p,
    hasGame: Math.random() > 0.2, // Simulate - would come from real schedule
    opponent: Math.random() > 0.2 ? ['NYY', 'BOS', 'LAD', 'HOU', 'ATL', 'PHI'][Math.floor(Math.random() * 6)] : null
  })).sort((a, b) => {
    // Prioritize players without games
    if (!a.hasGame && b.hasGame) return -1
    if (a.hasGame && !b.hasGame) return 1
    return 0
  })
}

function selectSwapTarget(player: any) {
  selectedSwapTarget.value = player
  calculateSwapImpact()
}

function calculateSwapImpact() {
  if (!swapSourcePlayer.value || !selectedSwapTarget.value) {
    swapImpact.value = null
    return
  }
  
  const source = swapSourcePlayer.value
  const target = selectedSwapTarget.value
  
  const categoryChanges: any[] = []
  let totalPositiveChange = 0
  let totalNegativeChange = 0
  let categoriesImproved = 0
  let categoriesHurt = 0
  let flipsWon = 0
  let flipsLost = 0
  
  for (const cat of relevantStartSitCategories.value) {
    const statId = cat.stat_id
    const isLowerBetter = isLowerBetterStat(cat)
    
    // Get current values
    const sourceValue = source.stats?.[statId] || 0
    const targetValue = target.stats?.[statId] || 0
    
    // Calculate per-game rates (simplified)
    const gamesPlayed = 97
    const sourcePerGame = gamesPlayed > 0 ? sourceValue / gamesPlayed : 0
    const targetPerGame = gamesPlayed > 0 ? targetValue / gamesPlayed : 0
    
    // Calculate impact (if we add source and drop target)
    const dailyChange = sourcePerGame - targetPerGame
    const weeklyChange = dailyChange * 6 // Approximate week
    
    // Get current matchup standing
    const currentStanding = categoryImpactBreakdown.value.find(c => c.stat_id === statId)
    const currentStatus = currentStanding?.status || 'close'
    
    // Determine impact
    let impact = 'neutral'
    if (isLowerBetter) {
      if (dailyChange < 0 && currentStatus === 'losing') impact = 'flip-win'
      else if (dailyChange > 0 && currentStatus === 'winning') impact = 'flip-lose'
    } else {
      if (dailyChange > 0 && currentStatus === 'losing') impact = 'flip-win'
      else if (dailyChange < 0 && currentStatus === 'winning') impact = 'flip-lose'
    }
    
    const absChange = Math.abs(dailyChange)
    if ((dailyChange > 0 && !isLowerBetter) || (dailyChange < 0 && isLowerBetter)) {
      totalPositiveChange += absChange
      if (absChange > 0.01) categoriesImproved++
    } else if ((dailyChange < 0 && !isLowerBetter) || (dailyChange > 0 && isLowerBetter)) {
      totalNegativeChange += absChange
      if (absChange > 0.01) categoriesHurt++
    }
    
    if (impact === 'flip-win') flipsWon++
    if (impact === 'flip-lose') flipsLost++
    
    const formatVal = (val: number) => {
      if (isRatioStat(cat)) return val.toFixed(3).replace(/^0/, '')
      return Math.round(val).toString()
    }
    
    categoryChanges.push({
      ...cat,
      before: formatVal(targetPerGame),
      after: formatVal(sourcePerGame),
      change: dailyChange,
      changeDisplay: isRatioStat(cat) ? dailyChange.toFixed(3) : dailyChange.toFixed(2),
      impact
    })
  }
  
  // Calculate recommendation
  const netChange = totalPositiveChange - totalNegativeChange
  let recommendation: 'do-it' | 'avoid' | 'consider' = 'consider'
  let reason = ''
  
  if (flipsWon > flipsLost && categoriesImproved > categoriesHurt) {
    recommendation = 'do-it'
    reason = `Could flip ${flipsWon} categor${flipsWon === 1 ? 'y' : 'ies'} in your favor!`
  } else if (flipsLost > flipsWon) {
    recommendation = 'avoid'
    reason = `Risk losing ${flipsLost} categor${flipsLost === 1 ? 'y' : 'ies'} you're currently winning.`
  } else if (categoriesImproved > categoriesHurt) {
    recommendation = 'do-it'
    reason = `Net positive impact across ${categoriesImproved} categories.`
  } else if (categoriesHurt > categoriesImproved) {
    recommendation = 'avoid'
    reason = `Would hurt ${categoriesHurt} categories more than help.`
  } else {
    recommendation = 'consider'
    reason = 'Mixed impact - consider your specific needs this week.'
  }
  
  swapImpact.value = {
    categoryChanges,
    netChange,
    categoriesImproved,
    categoriesHurt,
    flipsWon,
    flipsLost,
    recommendation,
    reason
  }
}

// ==================== TRADE ANALYZER FUNCTIONS ====================

// Other teams (not mine)
const otherTeams = computed(() => {
  return teamsData.value.filter(t => t.team_key !== myTeamKey.value)
})

// All players with calculated overall values (for trade analyzer)
const allPlayersWithValues = computed(() => {
  if (allPlayers.value.length === 0) return []
  
  // First pass: calculate raw scores for all players
  const playersWithRawScores = allPlayers.value.map(p => {
    const isPlayerPitcher = isPitcher(p)
    const relevantCats = isPlayerPitcher ? pitchingCategories.value : hittingCategories.value
    
    if (relevantCats.length === 0) return { ...p, rawScore: 50, isPlayerPitcher }
    
    // Calculate how good this player is across their relevant categories
    let totalScore = 0
    let catsWithValue = 0
    
    // Get all players of same type for comparison
    const samePlayers = allPlayers.value.filter(pl => isPitcher(pl) === isPlayerPitcher)
    
    for (const cat of relevantCats) {
      const statId = cat.stat_id
      const value = parseFloat(p.stats?.[statId] || 0)
      
      if (value === 0) continue
      
      // Get all non-zero values for this stat
      const allValues = samePlayers
        .map(pl => parseFloat(pl.stats?.[statId] || 0))
        .filter(v => v > 0)
      
      if (allValues.length === 0) continue
      
      // Sort based on whether lower is better
      const isLower = isLowerBetterStat(cat)
      allValues.sort((a, b) => isLower ? a - b : b - a)
      
      // Find rank (handle ties by finding first occurrence)
      const rank = allValues.indexOf(value)
      const percentile = rank >= 0 ? (1 - (rank / allValues.length)) * 100 : 50
      
      totalScore += percentile
      catsWithValue++
    }
    
    const avgScore = catsWithValue > 0 ? totalScore / catsWithValue : 50
    
    // Smaller multi-category bonus (max 10 instead of 20)
    // Scale by percentage of categories contributed to, not absolute count
    const catContributionRate = relevantCats.length > 0 ? catsWithValue / relevantCats.length : 0
    const multiCatBonus = catContributionRate * 10
    
    // Position scarcity bonus (only for hitters at scarce positions)
    const pos = p.position?.split(',')[0]?.trim() || 'Util'
    const scarcePositions = ['C', 'SS', '2B']
    const scarcityBonus = (!isPlayerPitcher && scarcePositions.includes(pos)) ? 5 : 0
    
    const rawScore = avgScore + multiCatBonus + scarcityBonus
    
    return { ...p, rawScore, isPlayerPitcher }
  })
  
  // Second pass: normalize scores within each group (pitchers vs hitters)
  const pitchers = playersWithRawScores.filter(p => p.isPlayerPitcher)
  const hitters = playersWithRawScores.filter(p => !p.isPlayerPitcher)
  
  // Calculate stats for normalization
  const getStats = (players: any[]) => {
    if (players.length === 0) return { min: 0, max: 100, avg: 50 }
    const scores = players.map(p => p.rawScore)
    return {
      min: Math.min(...scores),
      max: Math.max(...scores),
      avg: scores.reduce((a, b) => a + b, 0) / scores.length
    }
  }
  
  const pitcherStats = getStats(pitchers)
  const hitterStats = getStats(hitters)
  
  // Normalize to 0-100 scale within each group, then blend
  // Target: both groups should have similar distribution centered around 50
  const normalizeScore = (rawScore: number, stats: { min: number; max: number; avg: number }) => {
    if (stats.max === stats.min) return 50
    // Normalize to 0-100 range
    const normalized = ((rawScore - stats.min) / (stats.max - stats.min)) * 80 + 10
    return Math.min(100, Math.max(0, normalized))
  }
  
  return playersWithRawScores.map(p => {
    const stats = p.isPlayerPitcher ? pitcherStats : hitterStats
    const overallValue = normalizeScore(p.rawScore, stats)
    return { ...p, overallValue: Math.round(overallValue * 10) / 10 }
  })
})

// Total values for trade comparison
const tradeGiveTotalValue = computed(() => {
  return tradeGivePlayers.value.reduce((sum, p) => sum + (p.overallValue || 0), 0)
})

const tradeGetTotalValue = computed(() => {
  return tradeGetPlayers.value.reduce((sum, p) => sum + (p.overallValue || 0), 0)
})

const tradeValueDifference = computed(() => {
  return tradeGetTotalValue.value - tradeGiveTotalValue.value
})

// Helper to get category name for display
function getCategoryName(statId: string): string {
  const cat = displayCategories.value.find(c => c.stat_id === statId)
  return cat?.display_name || statId
}

// Helper to get sort value for trade player display
function getTradePlayerSortValue(player: any, sortBy: string): string {
  if (sortBy === 'value') {
    return player.overallValue?.toFixed(0) || '-'
  }
  if (sortBy === 'position') {
    return player.position || '-'
  }
  // It's a category stat_id
  const value = player?.stats?.[sortBy]
  if (value === null || value === undefined) return '-'
  const cat = displayCategories.value.find(c => c.stat_id === sortBy)
  if (isRatioStat(cat)) {
    return parseFloat(value).toFixed(3).replace(/^0/, '')
  }
  return Math.round(parseFloat(value)).toString()
}

// Helper to sort by category stat
function sortByCategory(players: any[], statId: string): any[] {
  const cat = displayCategories.value.find(c => c.stat_id === statId)
  const isLower = isLowerBetterStat(cat)
  
  return [...players].sort((a, b) => {
    const aVal = parseFloat(a.stats?.[statId] || 0)
    const bVal = parseFloat(b.stats?.[statId] || 0)
    // For lower-is-better stats (like ERA), sort ascending but put 0s at the end
    if (isLower) {
      if (aVal === 0 && bVal === 0) return 0
      if (aVal === 0) return 1
      if (bVal === 0) return -1
      return aVal - bVal
    }
    // For higher-is-better stats, sort descending
    return bVal - aVal
  })
}

// My players for trade selection (filtered and sorted)
const filteredMyPlayersForTrade = computed(() => {
  let myPlayers = allPlayersWithValues.value.filter(p => p.fantasy_team_key === myTeamKey.value)
  
  // Apply position filter
  if (tradeGivePositionFilter.value !== 'all') {
    myPlayers = myPlayers.filter(p => {
      const pos = p.position || ''
      if (tradeGivePositionFilter.value === 'OF') {
        return pos.includes('OF') || pos.includes('LF') || pos.includes('CF') || pos.includes('RF')
      }
      return pos.includes(tradeGivePositionFilter.value)
    })
  }
  
  // Apply search filter
  if (tradeGiveSearch.value) {
    const search = tradeGiveSearch.value.toLowerCase()
    myPlayers = myPlayers.filter(p => 
      p.full_name?.toLowerCase().includes(search) ||
      p.position?.toLowerCase().includes(search) ||
      p.mlb_team?.toLowerCase().includes(search)
    )
  }
  
  // Sort
  const sortBy = tradeGiveSortBy.value
  if (sortBy === 'value') {
    return myPlayers.sort((a, b) => (b.overallValue || 0) - (a.overallValue || 0))
  }
  if (sortBy === 'position') {
    return myPlayers.sort((a, b) => (a.position || '').localeCompare(b.position || ''))
  }
  // Sort by category
  return sortByCategory(myPlayers, sortBy)
})

// Trade partner's players (filtered and sorted)
const filteredPartnerPlayersForTrade = computed(() => {
  if (!tradePartnerKey.value) return []
  let partnerPlayers = allPlayersWithValues.value.filter(p => p.fantasy_team_key === tradePartnerKey.value)
  
  // Apply position filter
  if (tradeGetPositionFilter.value !== 'all') {
    partnerPlayers = partnerPlayers.filter(p => {
      const pos = p.position || ''
      if (tradeGetPositionFilter.value === 'OF') {
        return pos.includes('OF') || pos.includes('LF') || pos.includes('CF') || pos.includes('RF')
      }
      return pos.includes(tradeGetPositionFilter.value)
    })
  }
  
  // Apply search filter
  if (tradeGetSearch.value) {
    const search = tradeGetSearch.value.toLowerCase()
    partnerPlayers = partnerPlayers.filter(p => 
      p.full_name?.toLowerCase().includes(search) ||
      p.position?.toLowerCase().includes(search) ||
      p.mlb_team?.toLowerCase().includes(search)
    )
  }
  
  // Sort
  const sortBy = tradeGetSortBy.value
  if (sortBy === 'value') {
    return partnerPlayers.sort((a, b) => (b.overallValue || 0) - (a.overallValue || 0))
  }
  if (sortBy === 'position') {
    return partnerPlayers.sort((a, b) => (a.position || '').localeCompare(b.position || ''))
  }
  // Sort by category
  return sortByCategory(partnerPlayers, sortBy)
})

function formatPlayerStat(player: any, statId: string): string {
  const value = player?.stats?.[statId]
  if (value === null || value === undefined) return '-'
  const cat = displayCategories.value.find(c => c.stat_id === statId)
  if (isRatioStat(cat)) {
    return parseFloat(value).toFixed(3).replace(/^0/, '')
  }
  return Math.round(parseFloat(value)).toString()
}

function isPlayerInGive(player: any): boolean {
  return tradeGivePlayers.value.some(p => p.player_key === player.player_key)
}

function isPlayerInGet(player: any): boolean {
  return tradeGetPlayers.value.some(p => p.player_key === player.player_key)
}

function addGivePlayer(player: any) {
  if (!isPlayerInGive(player)) {
    tradeGivePlayers.value.push(player)
    tradeAnalysis.value = null // Reset analysis when changing players
  }
}

function removeGivePlayer(player: any) {
  tradeGivePlayers.value = tradeGivePlayers.value.filter(p => p.player_key !== player.player_key)
  tradeAnalysis.value = null
}

function addGetPlayer(player: any) {
  if (!isPlayerInGet(player)) {
    tradeGetPlayers.value.push(player)
    tradeAnalysis.value = null
  }
}

function removeGetPlayer(player: any) {
  tradeGetPlayers.value = tradeGetPlayers.value.filter(p => p.player_key !== player.player_key)
  tradeAnalysis.value = null
}

function resetTrade() {
  tradeGivePlayers.value = []
  tradeGetPlayers.value = []
  tradePartnerKey.value = ''
  tradeGiveSearch.value = ''
  tradeGetSearch.value = ''
  tradeGivePositionFilter.value = 'all'
  tradeGetPositionFilter.value = 'all'
  tradeAnalysis.value = null
}

function analyzeTrade() {
  if (tradeGivePlayers.value.length === 0 || tradeGetPlayers.value.length === 0) return
  
  const givePlayers = tradeGivePlayers.value
  const getPlayers = tradeGetPlayers.value
  
  // Calculate totals for all players being traded
  const giveTotal = givePlayers.reduce((sum, p) => sum + (p.overallValue || 0), 0)
  const getTotal = getPlayers.reduce((sum, p) => sum + (p.overallValue || 0), 0)
  
  // Calculate category impact
  const categoryImpact: any[] = []
  let categoriesUp = 0
  let categoriesDown = 0
  let categoriesSame = 0
  
  // Get current team totals
  const myTeam = teamsData.value.find(t => t.team_key === myTeamKey.value)
  
  for (const cat of displayCategories.value) {
    const statId = cat.stat_id
    const isLower = isLowerBetterStat(cat)
    const isRatio = isRatioStat(cat)
    
    // Sum up stats from all players being traded
    const giveValue = givePlayers.reduce((sum, p) => sum + parseFloat(p.stats?.[statId] || 0), 0)
    const getValue = getPlayers.reduce((sum, p) => sum + parseFloat(p.stats?.[statId] || 0), 0)
    const currentTotal = myTeam?.categoryTotals?.[statId] || 0
    
    // Calculate new total (subtract what we give, add what we get)
    let newTotal: number
    if (isRatio) {
      // For ratios, it's more complex - use weighted average approximation
      newTotal = currentTotal + (getValue - giveValue) * 0.1 // Simplified
    } else {
      newTotal = currentTotal - giveValue + getValue
    }
    
    const change = newTotal - currentTotal
    const changeDisplay = isRatio ? change.toFixed(3) : change.toFixed(0)
    
    // Calculate rank changes
    const currentRank = myTeam?.categoryRanks?.[statId] || 6
    const newRank = calculateNewCategoryRank(statId, newTotal, isLower)
    const rankChange = newRank - currentRank
    
    // Determine if this is an improvement
    let isImprovement = false
    if (isLower) {
      isImprovement = change < 0
    } else {
      isImprovement = change > 0
    }
    
    if (Math.abs(change) < 0.01) {
      categoriesSame++
    } else if (isImprovement) {
      categoriesUp++
    } else {
      categoriesDown++
    }
    
    categoryImpact.push({
      ...cat,
      before: isRatio ? currentTotal.toFixed(3).replace(/^0/, '') : Math.round(currentTotal).toString(),
      after: isRatio ? newTotal.toFixed(3).replace(/^0/, '') : Math.round(newTotal).toString(),
      change,
      changeDisplay,
      changeColor: Math.abs(change) < 0.01 ? 'text-dark-textMuted' : isImprovement ? 'text-green-400' : 'text-red-400',
      rankBefore: currentRank,
      rankAfter: newRank,
      rankChange
    })
  }
  
  // Calculate power ranking impact
  const currentPowerRank = calculateCurrentPowerRank()
  const { newPowerRank, balanceBefore, balanceAfter, starPowerBefore, starPowerAfter, depthBefore, depthAfter } = calculateNewPowerRank(givePlayers, getPlayers)
  
  // Get top rank changes
  const topRankChanges = categoryImpact
    .filter(c => c.rankChange !== 0)
    .sort((a, b) => Math.abs(b.rankChange) - Math.abs(a.rankChange))
    .slice(0, 4)
    .map(c => ({
      ...c,
      direction: c.rankChange < 0 ? 'up' : 'down',
      before: c.rankBefore,
      after: c.rankAfter
    }))
  
  // Calculate grades
  const categoryGrade = calculateCategoryGrade(categoriesUp, categoriesDown, categoryImpact)
  const valueGrade = calculateValueGrade(giveTotal, getTotal)
  const balanceGrade = calculateBalanceGrade(balanceAfter - balanceBefore)
  const scarcityGrade = calculateScarcityGrade(givePlayers, getPlayers)
  const overallGrade = calculateOverallTradeGrade(categoryGrade, valueGrade, balanceGrade, scarcityGrade)
  
  // Generate analysis text
  const { headline, summary, strengths, concerns, recommendation, bottomLine } = generateTradeAnalysis(
    givePlayers, getPlayers, categoryImpact, categoriesUp, categoriesDown, 
    currentPowerRank, newPowerRank, balanceAfter - balanceBefore, giveTotal, getTotal
  )
  
  tradeAnalysis.value = {
    grade: overallGrade,
    categoryGrade,
    valueGrade,
    balanceGrade,
    scarcityGrade,
    headline,
    summary,
    categoryImpact,
    categoriesUp,
    categoriesDown,
    categoriesSame,
    powerRankBefore: currentPowerRank,
    powerRankAfter: newPowerRank,
    powerRankChange: newPowerRank - currentPowerRank,
    balanceScoreBefore: balanceBefore,
    balanceScoreAfter: balanceAfter,
    balanceScoreChange: balanceAfter - balanceBefore,
    starPowerBefore,
    starPowerAfter,
    starPowerChange: starPowerAfter - starPowerBefore,
    depthBefore,
    depthAfter,
    depthChange: depthAfter - depthBefore,
    topRankChanges,
    strengths,
    concerns,
    recommendation,
    bottomLine
  }
}

function calculateNewCategoryRank(statId: string, newTotal: number, isLowerBetter: boolean): number {
  // Get all teams' totals for this category
  const teamTotals = teamsData.value.map(t => ({
    key: t.team_key,
    total: t.team_key === myTeamKey.value ? newTotal : (t.categoryTotals?.[statId] || 0)
  }))
  
  // Sort by total
  teamTotals.sort((a, b) => isLowerBetter ? a.total - b.total : b.total - a.total)
  
  // Find my rank
  const myIndex = teamTotals.findIndex(t => t.key === myTeamKey.value)
  return myIndex + 1
}

function calculateCurrentPowerRank(): number {
  const myTeam = teamsData.value.find(t => t.team_key === myTeamKey.value)
  if (!myTeam) return 6
  
  // Sort teams by overall grade/score
  const sorted = [...teamsData.value].sort((a, b) => {
    const gradeOrder = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F']
    return gradeOrder.indexOf(a.overallGrade || 'C') - gradeOrder.indexOf(b.overallGrade || 'C')
  })
  
  return sorted.findIndex(t => t.team_key === myTeamKey.value) + 1
}

function calculateNewPowerRank(givePlayers: any[], getPlayers: any[]): { newPowerRank: number; balanceBefore: number; balanceAfter: number; starPowerBefore: number; starPowerAfter: number; depthBefore: number; depthAfter: number } {
  const myTeam = teamsData.value.find(t => t.team_key === myTeamKey.value)
  const totalTeams = teamsData.value.length
  
  // Calculate balance score (how evenly distributed ranks are)
  const currentRanks = Object.values(myTeam?.categoryRanks || {}) as number[]
  const avgRank = currentRanks.length > 0 ? currentRanks.reduce((a, b) => a + b, 0) / currentRanks.length : 6
  const variance = currentRanks.length > 0 ? currentRanks.reduce((sum, r) => sum + Math.pow(r - avgRank, 2), 0) / currentRanks.length : 10
  const balanceBefore = Math.max(0, 100 - variance * 3)
  
  // Calculate value difference
  const giveTotal = givePlayers.reduce((sum, p) => sum + (p.overallValue || 0), 0)
  const getTotal = getPlayers.reduce((sum, p) => sum + (p.overallValue || 0), 0)
  const valueDiff = getTotal - giveTotal
  
  // Estimate new balance after trade (category diversity)
  const balanceAfter = balanceBefore + (valueDiff > 10 ? 5 : valueDiff < -10 ? -5 : 0)
  
  // Star power (based on elite player count)
  const myPlayers = allPlayersWithValues.value.filter(p => p.fantasy_team_key === myTeamKey.value)
  const eliteThreshold = 70
  const eliteCount = myPlayers.filter(p => (p.overallValue || 0) >= eliteThreshold).length
  const starPowerBefore = Math.min(100, eliteCount * 12)
  
  // After trade star power
  const giveEliteCount = givePlayers.filter(p => (p.overallValue || 0) >= eliteThreshold).length
  const getEliteCount = getPlayers.filter(p => (p.overallValue || 0) >= eliteThreshold).length
  const newEliteCount = eliteCount - giveEliteCount + getEliteCount
  const starPowerAfter = Math.min(100, Math.max(0, newEliteCount * 12))
  
  // Depth (based on roster quality distribution)
  const goodPlayerThreshold = 50
  const depthBefore = Math.min(100, myPlayers.filter(p => (p.overallValue || 0) >= goodPlayerThreshold).length * 6)
  const giveGoodCount = givePlayers.filter(p => (p.overallValue || 0) >= goodPlayerThreshold).length
  const getGoodCount = getPlayers.filter(p => (p.overallValue || 0) >= goodPlayerThreshold).length
  const depthAfter = depthBefore + (getGoodCount - giveGoodCount) * 6
  
  // Calculate overall score change
  const scoreBefore = (balanceBefore + starPowerBefore + depthBefore) / 3
  const scoreAfter = (Math.max(0, Math.min(100, balanceAfter)) + Math.max(0, Math.min(100, starPowerAfter)) + Math.max(0, Math.min(100, depthAfter))) / 3
  const scoreDiff = scoreAfter - scoreBefore
  
  // Estimate new rank (simplified)
  const currentRank = calculateCurrentPowerRank()
  let newRank = currentRank
  if (scoreDiff > 8) newRank = Math.max(1, currentRank - 2)
  else if (scoreDiff > 4) newRank = Math.max(1, currentRank - 1)
  else if (scoreDiff < -8) newRank = Math.min(totalTeams, currentRank + 2)
  else if (scoreDiff < -4) newRank = Math.min(totalTeams, currentRank + 1)
  
  return {
    newPowerRank: newRank,
    balanceBefore,
    balanceAfter: Math.max(0, Math.min(100, balanceAfter)),
    starPowerBefore,
    starPowerAfter: Math.max(0, Math.min(100, starPowerAfter)),
    depthBefore,
    depthAfter: Math.max(0, Math.min(100, depthAfter))
  }
}

function calculateCategoryGrade(up: number, down: number, impact: any[]): string {
  const net = up - down
  const significantChanges = impact.filter(c => Math.abs(c.rankChange) >= 2).length
  const totalCats = impact.length
  
  // Consider both net change and proportion of categories affected
  const netRatio = totalCats > 0 ? net / totalCats : 0
  
  if (net >= 5 || (net >= 3 && significantChanges >= 3)) return 'A+'
  if (net >= 4 || (net >= 2 && significantChanges >= 2)) return 'A'
  if (net >= 3 || significantChanges >= 3) return 'A-'
  if (net >= 2 || significantChanges >= 2) return 'B+'
  if (net >= 1) return 'B'
  if (net === 0 && down === 0) return 'B-'
  if (net === 0) return 'C+'
  if (net >= -1) return 'C'
  if (net >= -2) return 'C-'
  if (net >= -3) return 'D+'
  if (net >= -4) return 'D'
  return 'F'
}

function calculateValueGrade(giveTotal: number, getTotal: number): string {
  const diff = getTotal - giveTotal
  const percentDiff = giveTotal > 0 ? (diff / giveTotal) * 100 : diff
  
  // Use both absolute and percentage difference
  if (diff >= 50 || percentDiff >= 40) return 'A+'
  if (diff >= 40 || percentDiff >= 30) return 'A'
  if (diff >= 30 || percentDiff >= 20) return 'A-'
  if (diff >= 20 || percentDiff >= 15) return 'B+'
  if (diff >= 10 || percentDiff >= 5) return 'B'
  if (diff >= 0) return 'B-'
  if (diff >= -10 || percentDiff >= -5) return 'C+'
  if (diff >= -20 || percentDiff >= -15) return 'C'
  if (diff >= -30 || percentDiff >= -20) return 'C-'
  if (diff >= -40 || percentDiff >= -30) return 'D+'
  if (diff >= -50 || percentDiff >= -40) return 'D'
  return 'F'
}

function calculateBalanceGrade(balanceChange: number): string {
  if (balanceChange >= 15) return 'A+'
  if (balanceChange >= 10) return 'A'
  if (balanceChange >= 5) return 'B+'
  if (balanceChange >= 2) return 'B'
  if (balanceChange >= 0) return 'B-'
  if (balanceChange >= -2) return 'C+'
  if (balanceChange >= -5) return 'C'
  if (balanceChange >= -10) return 'D'
  return 'F'
}

function calculateScarcityGrade(givePlayers: any[], getPlayers: any[]): string {
  // Check position scarcity
  const scarcePositions = ['C', 'SS', '2B']
  
  const givingScarce = givePlayers.filter(p => {
    const pos = p.position?.split(',')[0] || ''
    return scarcePositions.some(sp => pos.includes(sp))
  }).length
  
  const gettingScarce = getPlayers.filter(p => {
    const pos = p.position?.split(',')[0] || ''
    return scarcePositions.some(sp => pos.includes(sp))
  }).length
  
  const netScarce = gettingScarce - givingScarce
  
  if (netScarce >= 2) return 'A'
  if (netScarce >= 1) return 'B+'
  if (netScarce === 0 && givingScarce === 0) return 'B'
  if (netScarce === 0) return 'B-'
  if (netScarce >= -1) return 'C'
  return 'D'
}

function calculateOverallTradeGrade(catGrade: string, valGrade: string, balGrade: string, scarGrade: string): string {
  const gradeToNum = (g: string): number => {
    const grades: Record<string, number> = { 
      'A+': 100, 'A': 95, 'A-': 90, 
      'B+': 85, 'B': 80, 'B-': 75, 
      'C+': 70, 'C': 65, 'C-': 60, 
      'D+': 55, 'D': 50, 'D-': 45, 
      'F': 35 
    }
    return grades[g] || 65
  }
  
  const numToGrade = (n: number): string => {
    if (n >= 97) return 'A+'
    if (n >= 92) return 'A'
    if (n >= 87) return 'A-'
    if (n >= 82) return 'B+'
    if (n >= 77) return 'B'
    if (n >= 72) return 'B-'
    if (n >= 67) return 'C+'
    if (n >= 62) return 'C'
    if (n >= 57) return 'C-'
    if (n >= 52) return 'D+'
    if (n >= 47) return 'D'
    if (n >= 42) return 'D-'
    return 'F'
  }
  
  // Weighted average: Category 30%, Value 30%, Balance 20%, Scarcity 20%
  const score = gradeToNum(catGrade) * 0.30 + gradeToNum(valGrade) * 0.30 + gradeToNum(balGrade) * 0.20 + gradeToNum(scarGrade) * 0.20
  return numToGrade(score)
}

function generateTradeAnalysis(givePlayers: any[], getPlayers: any[], categoryImpact: any[], catsUp: number, catsDown: number, rankBefore: number, rankAfter: number, balanceChange: number, giveTotal: number, getTotal: number): { headline: string; summary: string; strengths: string[]; concerns: string[]; recommendation: 'accept' | 'decline' | 'consider'; bottomLine: string } {
  const strengths: string[] = []
  const concerns: string[] = []
  
  const valueDiff = getTotal - giveTotal
  const percentDiff = giveTotal > 0 ? (valueDiff / giveTotal) * 100 : 0
  const tradeSize = Math.max(givePlayers.length, getPlayers.length)
  const giveNames = givePlayers.map(p => p.full_name).join(', ')
  const getNames = getPlayers.map(p => p.full_name).join(', ')
  
  // Analyze value
  if (valueDiff > 20) {
    strengths.push(`Gaining ${Math.round(valueDiff)} total value points (+${percentDiff.toFixed(0)}%)`)
  } else if (valueDiff > 0) {
    strengths.push(`Slight value gain of ${Math.round(valueDiff)} points`)
  } else if (valueDiff < -20) {
    concerns.push(`Giving up ${Math.round(Math.abs(valueDiff))} more value than receiving (${percentDiff.toFixed(0)}% loss)`)
  } else if (valueDiff < 0) {
    concerns.push(`Slight value loss of ${Math.round(Math.abs(valueDiff))} points`)
  }
  
  // Analyze number of players
  if (givePlayers.length > getPlayers.length + 1) {
    concerns.push(`Trading ${givePlayers.length} players for only ${getPlayers.length} - losing roster depth`)
  } else if (getPlayers.length > givePlayers.length + 1) {
    strengths.push(`Getting ${getPlayers.length} players for ${givePlayers.length} - gaining roster depth`)
  }
  
  // Analyze categories
  if (catsUp > catsDown + 2) {
    strengths.push(`Strong category improvement: ${catsUp} up vs ${catsDown} down`)
  } else if (catsUp > catsDown) {
    strengths.push(`Improves ${catsUp} categories vs hurts ${catsDown}`)
  } else if (catsDown > catsUp + 2) {
    concerns.push(`Significant category decline: ${catsDown} hurt vs ${catsUp} improved`)
  } else if (catsDown > catsUp) {
    concerns.push(`Hurts ${catsDown} categories vs improves ${catsUp}`)
  }
  
  // Analyze rank changes
  const bigImprovements = categoryImpact.filter(c => c.rankChange <= -2)
  const bigDeclines = categoryImpact.filter(c => c.rankChange >= 2)
  
  if (bigImprovements.length > 0) {
    strengths.push(`Significant rank improvements in: ${bigImprovements.map(c => c.display_name).join(', ')}`)
  }
  if (bigDeclines.length > 0) {
    concerns.push(`Risk dropping in: ${bigDeclines.map(c => c.display_name).join(', ')}`)
  }
  
  // Analyze power rank
  if (rankAfter < rankBefore) {
    strengths.push(`Could improve power ranking by ${rankBefore - rankAfter} spot${rankBefore - rankAfter > 1 ? 's' : ''}`)
  } else if (rankAfter > rankBefore) {
    concerns.push(`May drop ${rankAfter - rankBefore} spot${rankAfter - rankBefore > 1 ? 's' : ''} in power rankings`)
  }
  
  // Analyze balance
  if (balanceChange > 5) {
    strengths.push('Makes your team more well-rounded')
  } else if (balanceChange < -5) {
    concerns.push('Creates more category imbalance')
  }
  
  // Analyze positions
  const scarcePositions = ['C', 'SS', '2B']
  const gettingScarce = getPlayers.filter(p => {
    const pos = p.position || ''
    return scarcePositions.some(sp => pos.includes(sp))
  })
  const givingScarce = givePlayers.filter(p => {
    const pos = p.position || ''
    return scarcePositions.some(sp => pos.includes(sp))
  })
  
  if (gettingScarce.length > 0) {
    strengths.push(`Acquiring premium position player(s): ${gettingScarce.map(p => `${p.full_name} (${p.position})`).join(', ')}`)
  }
  if (givingScarce.length > 0) {
    concerns.push(`Giving up scarce position eligibility: ${givingScarce.map(p => `${p.full_name} (${p.position})`).join(', ')}`)
  }
  
  // Generate headline and summary
  let headline = ''
  let summary = ''
  let recommendation: 'accept' | 'decline' | 'consider' = 'consider'
  let bottomLine = ''
  
  // Calculate net score based on all factors
  const valueFactor = valueDiff / 20  // Normalize value diff
  const catFactor = (catsUp - catsDown) * 0.5
  const rankFactor = (rankBefore - rankAfter) * 0.5
  const balanceFactor = balanceChange / 10
  const depthFactor = (getPlayers.length - givePlayers.length) * 0.3
  
  const netScore = valueFactor + catFactor + rankFactor + balanceFactor + depthFactor
  
  if (netScore >= 4) {
    headline = 'Excellent Trade for You!'
    summary = `This ${tradeSize > 1 ? 'multi-player trade' : 'trade'} is a clear win. You're getting significantly more value and production.`
    recommendation = 'accept'
    bottomLine = 'This is a great deal - make this trade!'
  } else if (netScore >= 2) {
    headline = 'Strong Trade for You'
    summary = `This trade significantly improves your team. The incoming player(s) provide more value than what you're giving up.`
    recommendation = 'accept'
    bottomLine = 'This is a favorable deal - you should strongly consider making this trade.'
  } else if (netScore >= 0.5) {
    headline = 'Slight Win for You'
    summary = `This trade provides modest improvement to your team. The incoming player(s) should help in key areas.`
    recommendation = 'accept'
    bottomLine = 'The trade is in your favor, though not by a huge margin.'
  } else if (netScore >= -0.5) {
    headline = 'Roughly Even Trade'
    summary = `This is a fair exchange that could work depending on your specific needs. Consider what categories matter most for your playoff push.`
    recommendation = 'consider'
    bottomLine = 'This is close to a fair trade - evaluate based on your specific team needs.'
  } else if (netScore >= -2) {
    headline = 'Slight Loss for You'
    summary = `You may be giving up a bit more than you're getting back. Make sure this addresses a critical need.`
    recommendation = 'consider'
    bottomLine = 'You\'re likely overpaying slightly - only do this if you really need what you\'re getting.'
  } else if (netScore >= -4) {
    headline = 'Bad Trade for You'
    summary = `This trade would hurt your team. You're giving up significantly more value than you're receiving.`
    recommendation = 'decline'
    bottomLine = 'This trade is not recommended - you can do better.'
  } else {
    headline = 'Terrible Trade - Avoid!'
    summary = `This trade would seriously damage your team. You're giving away far too much value for what you're getting back.`
    recommendation = 'decline'
    bottomLine = 'Do NOT make this trade - it heavily favors the other team.'
  }
  
  return { headline, summary, strengths, concerns, recommendation, bottomLine }
}

function getTradeGradeBackground(grade: string): string {
  if (grade.startsWith('A')) return 'bg-gradient-to-r from-green-500/20 to-emerald-500/20'
  if (grade.startsWith('B')) return 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20'
  if (grade.startsWith('C')) return 'bg-gradient-to-r from-gray-500/20 to-slate-500/20'
  return 'bg-gradient-to-r from-red-500/20 to-rose-500/20'
}

function getTradeGradeColor(grade: string): string {
  if (grade.startsWith('A')) return 'text-green-400'
  if (grade.startsWith('B')) return 'text-yellow-400'
  if (grade.startsWith('C')) return 'text-gray-400'
  return 'text-red-400'
}

// ==================== STARTING LINEUP & CATEGORY IMPACT ====================

// Suggested lineup for categories
const suggestedCategoryLineup = computed(() => {
  const slots: { position: string; player: any }[] = []
  const used = new Set<string>()
  const myPlayers = allPlayersWithValues.value.filter(p => p.fantasy_team_key === myTeamKey.value)
  
  // Use actual league roster positions if available, otherwise fall back to sport defaults
  let lineupOrder: string[]
  const sport = currentSport.value // Define sport at top level so it's available throughout
  
  if (leagueRosterPositions.value && leagueRosterPositions.value.length > 0) {
    // Use actual roster positions from league settings
    console.log('[suggestedCategoryLineup] Raw roster positions:', JSON.stringify(leagueRosterPositions.value))
    
    lineupOrder = []
    
    for (const rp of leagueRosterPositions.value) {
      // Handle string format (ESPN)
      if (typeof rp === 'string') {
        console.log('[suggestedCategoryLineup] String position:', rp)
        lineupOrder.push(rp)
        continue
      }
      
      // Handle Yahoo nested object format: {roster_position: {position: "PG", count: 2, is_starting_position: 1}}
      let positionObj = rp
      if (rp.roster_position) {
        positionObj = rp.roster_position
        console.log('[suggestedCategoryLineup] Found nested roster_position:', positionObj)
      }
      
      // Extract position name
      const position = positionObj.position || positionObj.abbr || positionObj.display_name || positionObj.position_type
      const count = parseInt(positionObj.count || 1)
      const isStarting = positionObj.is_starting_position === 1 || positionObj.is_starting_position === '1' || positionObj.is_starting_position === true
      
      console.log('[suggestedCategoryLineup] Position:', position, 'Count:', count, 'IsStarting:', isStarting)
      
      // Only add starting positions (not bench)
      if (position && isStarting) {
        // Add position 'count' times
        for (let i = 0; i < count; i++) {
          lineupOrder.push(position)
        }
        console.log('[suggestedCategoryLineup] Added', count, 'x', position)
      } else if (position && !isStarting) {
        console.log('[suggestedCategoryLineup] Skipped bench position:', position)
      }
    }
    
    console.log('[suggestedCategoryLineup] Final lineup order:', lineupOrder)
  } else {
    console.log('[suggestedCategoryLineup] ⚠️ No roster positions from settings')
    
    // YAHOO FALLBACK: Try to extract positions from actual team roster
    const myTeam = teamsData.value.find(t => t.is_my_team || t.is_owned_by_current_login)
    console.log('[suggestedCategoryLineup] ===== YAHOO ROSTER DEBUG =====')
    console.log('[suggestedCategoryLineup] teamsData.value:', teamsData.value)
    console.log('[suggestedCategoryLineup] Looking for my team...')
    console.log('[suggestedCategoryLineup] Found team:', myTeam)
    console.log('[suggestedCategoryLineup] Team name:', myTeam?.name)
    console.log('[suggestedCategoryLineup] Has roster?:', !!myTeam?.roster)
    console.log('[suggestedCategoryLineup] Roster structure:', myTeam?.roster)
    
    if (myTeam && myTeam.roster && myTeam.roster.players) {
      console.log('[suggestedCategoryLineup] Found roster with', myTeam.roster.players.length, 'players')
      const extractedPositions: string[] = []
      
      for (const player of myTeam.roster.players) {
        console.log('[suggestedCategoryLineup] ===== PLAYER DEBUG =====')
        console.log('[suggestedCategoryLineup] Full player object:', player)
        console.log('[suggestedCategoryLineup] Player name:', player.name || player.full_name)
        console.log('[suggestedCategoryLineup] player.selected_position:', player.selected_position)
        console.log('[suggestedCategoryLineup] player.roster_position:', player.roster_position)
        console.log('[suggestedCategoryLineup] player.position:', player.position)
        console.log('[suggestedCategoryLineup] All player keys:', Object.keys(player))
        
        const selectedPos = player.selected_position || player.roster_position || player.position
        console.log('[suggestedCategoryLineup] Final selectedPos:', selectedPos)
        
        if (selectedPos && selectedPos !== 'BN' && selectedPos !== 'IL' && selectedPos !== 'IR' && selectedPos !== 'Bench') {
          extractedPositions.push(selectedPos)
          console.log('[suggestedCategoryLineup] ✅ Added position:', selectedPos)
        } else {
          console.log('[suggestedCategoryLineup] ❌ Skipped (bench/IL or empty):', selectedPos)
        }
      }
      
      console.log('[suggestedCategoryLineup] ===== END ROSTER DEBUG =====')
      
      if (extractedPositions.length > 0) {
        lineupOrder = extractedPositions
        console.log('[suggestedCategoryLineup] ✅ Extracted', extractedPositions.length, 'positions from roster:', lineupOrder)
      } else {
        console.log('[suggestedCategoryLineup] ⚠️ No positions extracted, using sport defaults')
        lineupOrder = getSportDefaultPositions(sport)
      }
    } else {
      console.log('[suggestedCategoryLineup] ⚠️ No team roster found')
      console.log('[suggestedCategoryLineup] myTeam exists?:', !!myTeam)
      console.log('[suggestedCategoryLineup] myTeam.roster exists?:', !!myTeam?.roster)
      console.log('[suggestedCategoryLineup] myTeam.roster.players exists?:', !!myTeam?.roster?.players)
      console.log('[suggestedCategoryLineup] Using sport defaults')
      lineupOrder = getSportDefaultPositions(sport)
    }
    
    console.log('[suggestedCategoryLineup] Final lineup order:', lineupOrder)
  }
  
  for (const pos of lineupOrder) {
    let eligible = myPlayers.filter(p => {
      if (used.has(p.player_key)) return false
      const playerPos = p.position || ''
      
      if (pos === 'Util' || pos === 'Flex') {
        // Util/Flex can be any non-pitcher/non-goalie
        if (sport === 'baseball') return !playerPos.includes('SP') && !playerPos.includes('RP')
        if (sport === 'hockey') return !playerPos.includes('G')
        return true
      }
      
      // Basketball guard/forward eligibility
      if (sport === 'basketball') {
        if (pos === 'G') return playerPos.includes('PG') || playerPos.includes('SG') || playerPos.includes('G')
        if (pos === 'F') return playerPos.includes('SF') || playerPos.includes('PF') || playerPos.includes('F')
      }
      
      // Outfield eligibility for baseball
      if (pos === 'OF') return playerPos.includes('OF') || playerPos.includes('LF') || playerPos.includes('CF') || playerPos.includes('RF')
      
      return playerPos.includes(pos)
    })
    
    // Add game info and impact score - USE REAL LIVE GAMES DATA
    const activeGames = startSitDay.value === 'today' ? todaysGames.value : tomorrowsGames.value
    
    eligible = eligible.map(p => {
      // Get REAL game info from live data
      const gameInfo = liveGamesService.getPlayerGameInfo(p.mlb_team, activeGames)
      const impactCats = getImpactCategoryCount(p)
      
      return { 
        ...p, 
        hasGame: gameInfo.hasGame,
        opponent: gameInfo.opponent,
        isHome: gameInfo.isHome,
        gameTime: gameInfo.gameTime,
        status: gameInfo.status,
        period: gameInfo.period,
        timeRemaining: gameInfo.timeRemaining,
        liveScore: gameInfo.score,
        isLive: gameInfo.isLive,
        impactCats,
        impactScore: calculatePlayerImpact(p)
      }
    })
    
    // In daily mode, filter by game availability BUT ensure we have at least some players
    // If no players have games for this position, show all players
    if (startSitMode.value === 'daily') {
      const withGames = eligible.filter(p => p.hasGame)
      if (withGames.length > 0) {
        eligible = withGames
      }
      // If no one has a game, keep all eligible players (don't filter)
    }
    
    // Sort by impact score
    eligible.sort((a, b) => b.impactScore - a.impactScore)
    
    const best = eligible[0] || null
    if (best) {
      used.add(best.player_key)
    }
    
    slots.push({ position: pos, player: best })
  }
  
  return slots
})

const suggestedLineupPlayerCount = computed(() => {
  return suggestedCategoryLineup.value.filter(s => s.player).length
})

// Bench players - my players not in suggested lineup
const benchPlayers = computed(() => {
  const usedPlayerKeys = new Set(
    modifiedSuggestedLineup.value
      .filter(slot => slot.player)
      .map(slot => slot.player.player_key)
  )
  
  // Get active games list
  const activeGames = startSitDay.value === 'today' ? todaysGames.value : tomorrowsGames.value
  
  return allPlayers.value
    .filter(p => isMyPlayer(p) && !usedPlayerKeys.has(p.player_key))
    .map(p => {
      // Get REAL game info from live data
      const gameInfo = liveGamesService.getPlayerGameInfo(p.mlb_team, activeGames)
      const impactCats = getImpactCategoryCount(p)
      
      return { 
        ...p, 
        hasGame: gameInfo.hasGame,
        opponent: gameInfo.opponent,
        isHome: gameInfo.isHome,
        gameTime: gameInfo.gameTime,
        status: gameInfo.status,
        liveScore: gameInfo.score,
        isLive: gameInfo.isLive,
        impactCats,
        impactScore: calculatePlayerImpact(p)
      }
    })
    .sort((a, b) => {
      // Sort by: has game first, then by impact score
      if (a.hasGame && !b.hasGame) return -1
      if (!a.hasGame && b.hasGame) return 1
      return (b.impactScore || 0) - (a.impactScore || 0)
    })
})

// Available free agents with games today/tomorrow (for "Available" view)
const availableFreeAgents = computed(() => {
  // Safety check - only run if on startsit tab and data is loaded
  if (!allPlayersWithValues.value || allPlayersWithValues.value.length === 0) {
    console.log('[availableFreeAgents] No players loaded')
    return []
  }
  if (!liveGamesService) {
    console.log('[availableFreeAgents] No liveGamesService')
    return []
  }
  
  const activeGames = startSitDay.value === 'today' ? todaysGames.value : tomorrowsGames.value
  if (!activeGames) {
    console.log('[availableFreeAgents] No active games')
    return []
  }
  
  console.log('[availableFreeAgents] Processing...', {
    totalPlayers: allPlayersWithValues.value.length,
    activeGamesCount: activeGames.length,
    sport: currentSport.value
  })
  
  try {
    // Get ALL free agents and add game info to each
    let debugCounter = 0 // Track how many we've checked for debug logging
    
    let results = allPlayersWithValues.value
      .filter(p => {
        // Must be free agent
        if (p.fantasy_team_key) return false
        
        // Position filter
        if (selectedStartSitPosition.value !== 'All') {
          const playerPos = p.position || ''
          if (!playerPos.includes(selectedStartSitPosition.value)) return false
        }
        
        return true
      })
      .map(p => {
        // Get team code - for basketball, prefer nba_team (corrected)
        const teamCode = currentSport.value === 'basketball'
          ? (p.nba_team || p.mlb_team || p.editorial_team_abbr || p.team_abbr)
          : (p.mlb_team || p.nba_team || p.nhl_team || p.editorial_team_abbr || p.team_abbr)
        
        const gameInfo = teamCode ? liveGamesService.getPlayerGameInfo(teamCode, activeGames) : null
        
        // DEBUG: Always log first 10 players to see what's happening
        debugCounter++
        if (debugCounter <= 10) {
          console.log(`[availableFreeAgents] ========== PLAYER ${debugCounter} ==========`)
          console.log('[availableFreeAgents] Player:', p.full_name)
          console.log('[availableFreeAgents] Team code:', teamCode)
          console.log('[availableFreeAgents] All team properties:', {
            mlb_team: p.mlb_team,
            nba_team: p.nba_team,
            nhl_team: p.nhl_team,
            editorial_team_abbr: p.editorial_team_abbr,
            team_abbr: p.team_abbr
          })
          console.log('[availableFreeAgents] Active games count:', activeGames.length)
          console.log('[availableFreeAgents] Game info result:', gameInfo)
          console.log('[availableFreeAgents] Has game?:', gameInfo?.hasGame)
          console.log('[availableFreeAgents] Opponent:', gameInfo?.opponent)
          
          if (activeGames.length > 0 && activeGames.length < 5) {
            console.log('[availableFreeAgents] All games:', activeGames.map((g: any) => ({
              home: g.homeTeam || g.home_team || g.home,
              away: g.awayTeam || g.away_team || g.away
            })))
          }
          console.log(`[availableFreeAgents] ===================================`)
        }
        
        const impactCats = getImpactCategoryCount(p)
        
        return {
          ...p,
          hasGame: gameInfo?.hasGame || false,
          opponent: gameInfo?.opponent || null,
          isHome: gameInfo?.isHome || false,
          impactCats,
          impactScore: calculatePlayerImpact(p)
        }
      })
      .sort((a, b) => (b.overallValue || 0) - (a.overallValue || 0))
    
    console.log('[availableFreeAgents] Found', results.length, 'free agents (all players, filtered by day selection)')
    return results.slice(0, 200) // Top 200 total (increased from 100)
  } catch (error) {
    console.error('[availableFreeAgents] Error:', error)
    return []
  }
})

// Sorted available free agents for display
const sortedAvailableFreeAgents = computed(() => {
  let players = [...availableFreeAgents.value]
  
  // FILTER: When "Today" is selected, only show players with games today
  if (startSitDay.value === 'today') {
    players = players.filter(p => p.hasGame)
    console.log('[sortedAvailableFreeAgents] Filtered to players with games today:', players.length)
  }
  
  const column = availableSortColumn.value
  const direction = availableSortDirection.value === 'asc' ? 1 : -1
  
  // DEFAULT SORT: When "Today" is selected, sort by game time (earliest first)
  if (startSitDay.value === 'today' && column === 'value') {
    players.sort((a, b) => {
      // Primary: Sort by game time (earliest first)
      const aTime = a.gameTime ? new Date(a.gameTime).getTime() : Infinity
      const bTime = b.gameTime ? new Date(b.gameTime).getTime() : Infinity
      if (aTime !== bTime) return aTime - bTime
      
      // Secondary: Sort by value (highest first)
      return ((b.overallValue || 0) - (a.overallValue || 0))
    })
  } else if (column === 'name') {
    players.sort((a, b) => direction * (a.full_name || '').localeCompare(b.full_name || ''))
  } else if (column === 'value') {
    players.sort((a, b) => direction * ((a.overallValue || 0) - (b.overallValue || 0)))
  } else if (column === 'matchup') {
    players.sort((a, b) => {
      // Sort by has game, then by opponent
      if (a.hasGame && !b.hasGame) return -direction
      if (!a.hasGame && b.hasGame) return direction
      return direction * (a.opponent || '').localeCompare(b.opponent || '')
    })
  } else {
    // Sorting by category stat
    players.sort((a, b) => {
      const aVal = parseFloat(a.stats?.[column] || 0)
      const bVal = parseFloat(b.stats?.[column] || 0)
      return direction * (aVal - bVal)
    })
  }
  
  return players
})

// Toggle sort for Available view
function toggleAvailableSort(column: string) {
  if (availableSortColumn.value === column) {
    // Toggle direction
    availableSortDirection.value = availableSortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    // New column, default to descending (highest first)
    availableSortColumn.value = column
    availableSortDirection.value = 'desc'
  }
}

// Smart waiver recommendations (for "Smart Moves" view)
const smartWaiverRecommendations = computed(() => {
  // Safety check - only run if data is loaded
  if (!allPlayersWithValues.value || allPlayersWithValues.value.length === 0) return []
  if (!myTeamKey.value) return []
  if (!liveGamesService) return []
  
  const activeGames = startSitDay.value === 'today' ? todaysGames.value : tomorrowsGames.value
  if (!activeGames) return []
  
  try {
    const recommendations: any[] = []
    const myPlayers = allPlayersWithValues.value.filter(p => p.fantasy_team_key === myTeamKey.value)
    
    // Get FAs with games today - VERY RELAXED FILTERS
    const freeAgentsWithGames = allPlayersWithValues.value
      .filter(p => {
        if (p.fantasy_team_key) return false // Must be FA
        
        // Filter out severely injured players only (relaxed - allow DTD, Q)
        const injuryStatus = (p.injury_status || p.status || '').toUpperCase()
        if (injuryStatus === 'O' || injuryStatus === 'IL') return false
        
        // VERY RELAXED: Minimum value 10 (was 15)
        if ((p.overallValue || 0) < 10) return false
        
        return true
      })
      .map(p => {
        const teamCode = currentSport.value === 'basketball'
          ? (p.nba_team || p.mlb_team || p.editorial_team_abbr || p.team_abbr)
          : (p.mlb_team || p.nba_team || p.nhl_team || p.editorial_team_abbr || p.team_abbr)
        const gameInfo = liveGamesService.getPlayerGameInfo(teamCode, activeGames)
        return {
          ...p,
          hasGame: gameInfo?.hasGame || false,
          opponent: gameInfo?.opponent || '',
          impactCats: getImpactCategoryCount(p),
          impactScore: calculatePlayerImpact(p),
          rosValue: p.overallValue || 0
        }
      })
      .filter(p => p.hasGame && p.rosValue >= 12) // VERY RELAXED: was 18
      .sort((a, b) => b.rosValue - a.rosValue)
      .slice(0, 30) // More candidates (was 20)
    
    // Get droppable players - VERY PERMISSIVE
    const droppablePlayers = myPlayers
      .map(p => {
        const teamCode = currentSport.value === 'basketball'
          ? (p.nba_team || p.mlb_team || p.editorial_team_abbr || p.team_abbr)
          : (p.mlb_team || p.nba_team || p.nhl_team || p.editorial_team_abbr || p.team_abbr)
        const gameInfo = liveGamesService.getPlayerGameInfo(teamCode, activeGames)
        return {
          ...p,
          hasGame: gameInfo?.hasGame || false,
          opponent: gameInfo?.opponent || '',
          impactCats: getImpactCategoryCount(p),
          impactScore: calculatePlayerImpact(p),
          rosValue: p.overallValue || 0
        }
      })
      .filter(p => (p.rosValue || 0) < 75) // VERY RELAXED: was 70
      .sort((a, b) => (a.rosValue || 0) - (b.rosValue || 0))
    
    // Find best add/drop combinations
    for (const addPlayer of freeAgentsWithGames.slice(0, 15)) { // More FAs (was 10)
      for (const dropPlayer of droppablePlayers.slice(0, 12)) { // More droppable (was 10)
        
        // CRITICAL SAFEGUARDS (very lenient)
        // Never drop elite players (value > 70, was 65)
        if ((dropPlayer.rosValue || 0) > 70) continue
        
        // Only recommend if some benefit
        const rosImpact = (addPlayer.rosValue || 0) - (dropPlayer.rosValue || 0)
        const todayImpact = addPlayer.impactCats - (dropPlayer.hasGame ? dropPlayer.impactCats : 0)
        
        // RELAXED: Show if +1 ROS value OR +1 today impact (was +3/+2)
        if (rosImpact < 1 && todayImpact < 1) continue
        
        // Build reasoning
        let reasoning = ''
        if (rosImpact >= 10 && todayImpact > 0) {
          reasoning = `Significant upgrade: +${rosImpact.toFixed(0)} value and helps ${todayImpact} categories today. `
        } else if (rosImpact >= 10) {
          reasoning = `Strong ROS upgrade (+${rosImpact.toFixed(0)} value). `
        } else if (rosImpact >= 5) {
          reasoning = `Moderate upgrade (+${rosImpact.toFixed(0)} value). `
        } else if (todayImpact >= 3) {
          reasoning = `Helps ${todayImpact} critical categories today. `
        } else if (rosImpact > 0) {
          reasoning = `Small upgrade (+${rosImpact.toFixed(0)} value). `
        } else {
          reasoning = `Today's matchup benefit (+${todayImpact} cats) but slight ROS downgrade (${rosImpact.toFixed(0)}). `
        }
        
        if (!dropPlayer.hasGame) {
          reasoning += `${dropPlayer.full_name} has no game today. `
        }
        
        // Add warning if dropping valuable player
        if ((dropPlayer.rosValue || 0) > 55) {
          reasoning += `⚠️ Warning: Dropping a quality player (value ${dropPlayer.rosValue?.toFixed(0)}). `
        }
        
        // Calculate confidence - weighted 60% ROS, 40% today
        let confidence = 50
        if (rosImpact >= 15) confidence += 25
        else if (rosImpact >= 10) confidence += 20
        else if (rosImpact >= 5) confidence += 15
        else if (rosImpact >= 3) confidence += 10
        else if (rosImpact > 0) confidence += 5
        
        if (todayImpact >= 3) confidence += 15
        else if (todayImpact >= 2) confidence += 10
        else if (todayImpact >= 1) confidence += 5
        
        if (!dropPlayer.hasGame) confidence += 10
        
        // PENALTY for risky moves (relaxed thresholds)
        if ((dropPlayer.rosValue || 0) > 65) confidence -= 15 // was 60
        else if ((dropPlayer.rosValue || 0) > 60) confidence -= 10 // was 55
        
        confidence = Math.max(30, Math.min(95, confidence))
        
        // SHOW EVEN MORE: Only skip if confidence < 35 (was 45)
        if (confidence < 35) continue
        
        recommendations.push({
          addPlayer,
          dropPlayer,
          todayImpact,
          rosImpact,
          reasoning,
          confidence
        })
      }
    }
    
    // Sort by combined score (60% ROS, 40% today for better balance)
    return recommendations
      .sort((a, b) => {
        const scoreA = (a.rosImpact * 0.6) + (a.todayImpact * 0.4)
        const scoreB = (b.rosImpact * 0.6) + (b.todayImpact * 0.4)
        return scoreB - scoreA
      })
      .slice(0, 10) // Show up to 10 (was 5)
  } catch (error) {
    console.error('[smartWaiverRecommendations] Error:', error)
    return []
  }
})

// Projected category totals with lineup
const projectedCategoryTotals = computed(() => {
  const totals: Record<string, { my: number; opp: number }> = {}
  const mode = startSitViewMode.value
  const period = startSitTimePeriod.value
  
  for (const cat of displayCategories.value) {
    const statId = cat.stat_id
    const currentStatus = matchupCategoryStatus.value[statId]
    
    // Start with current matchup values
    let myTotal = currentStatus?.myValue || 0
    let oppTotal = currentStatus?.oppValue || 0
    
    // Add projected/historical contributions from lineup
    for (const slot of suggestedCategoryLineup.value) {
      if (slot.player) {
        const playerValue = parseFloat(slot.player.stats?.[statId] || 0)
        const gamesPlayed = isPitcher(slot.player) ? 30 : 140
        const perGame = playerValue / gamesPlayed
        
        if (mode === 'stats') {
          // STATS MODE: past performance
          if (period === 'ros') {
            myTotal += playerValue * 0.3 // Scale factor
          } else {
            const games = period === 'next7' ? 
              (currentSport.value === 'baseball' ? 6 : 3) : 
              (currentSport.value === 'baseball' ? 12 : 6)
            myTotal += perGame * games * 0.3
          }
        } else {
          // PROJECTIONS MODE: future projections
          const games = getGameCountForPeriod(slot.player)
          if (games > 0) {
            myTotal += perGame * games * 0.3 // Scale factor for daily projection
          }
        }
      }
    }
    
    totals[statId] = { my: myTotal, opp: oppTotal }
  }
  
  return totals
})

// Projected wins/losses/ties
const projectedWins = computed(() => {
  let wins = 0
  for (const cat of displayCategories.value) {
    const totals = projectedCategoryTotals.value[cat.stat_id]
    if (!totals) continue
    const isLowerBetter = isLowerBetterStat(cat)
    if (isLowerBetter) {
      if (totals.my < totals.opp * 0.95) wins++
    } else {
      if (totals.my > totals.opp * 1.05) wins++
    }
  }
  return wins
})

const projectedLosses = computed(() => {
  let losses = 0
  for (const cat of displayCategories.value) {
    const totals = projectedCategoryTotals.value[cat.stat_id]
    if (!totals) continue
    const isLowerBetter = isLowerBetterStat(cat)
    if (isLowerBetter) {
      if (totals.my > totals.opp * 1.05) losses++
    } else {
      if (totals.my < totals.opp * 0.95) losses++
    }
  }
  return losses
})

const projectedTies = computed(() => {
  return displayCategories.value.length - projectedWins.value - projectedLosses.value
})

// Win probability calculation
const winProbability = computed(() => {
  const totalCats = displayCategories.value.length
  if (totalCats === 0) return 50
  
  const wins = projectedWins.value
  const losses = projectedLosses.value
  const ties = projectedTies.value
  
  // Simple probability model: wins are certain, ties are 50/50
  const expectedWins = wins + (ties * 0.5)
  const neededToWin = Math.ceil(totalCats / 2) + 0.5
  
  // Calculate probability based on how far ahead/behind
  const margin = expectedWins - neededToWin
  const prob = 50 + (margin * 10)
  
  return Math.max(5, Math.min(95, Math.round(prob)))
})

const winProbabilityClass = computed(() => {
  const prob = winProbability.value
  if (prob >= 65) return 'text-green-400'
  if (prob >= 45) return 'text-yellow-400'
  return 'text-red-400'
})

const winProbabilityBarClass = computed(() => {
  const prob = winProbability.value
  if (prob >= 65) return 'bg-green-500'
  if (prob >= 45) return 'bg-yellow-500'
  return 'bg-red-500'
})

// Category-by-category impact breakdown
const categoryImpactBreakdown = computed(() => {
  return displayCategories.value.map(cat => {
    const totals = projectedCategoryTotals.value[cat.stat_id]
    const myProj = totals?.my || 0
    const oppProj = totals?.opp || 0
    const isLowerBetter = isLowerBetterStat(cat)
    
    let status: 'winning' | 'losing' | 'close'
    let barWidth: number
    
    if (isLowerBetter) {
      if (myProj < oppProj * 0.95) {
        status = 'winning'
        barWidth = 75
      } else if (myProj > oppProj * 1.05) {
        status = 'losing'
        barWidth = 25
      } else {
        status = 'close'
        barWidth = 50
      }
    } else {
      if (myProj > oppProj * 1.05) {
        status = 'winning'
        barWidth = 75
      } else if (myProj < oppProj * 0.95) {
        status = 'losing'
        barWidth = 25
      } else {
        status = 'close'
        barWidth = 50
      }
    }
    
    // Format projections compactly
    const formatCompact = (val: number) => {
      if (isRatioStat(cat)) {
        return val.toFixed(3).replace(/^0/, '')
      }
      return Math.round(val).toString()
    }
    
    return {
      ...cat,
      myProj: formatCompact(myProj),
      oppProj: formatCompact(oppProj),
      myProjRaw: myProj,
      oppProjRaw: oppProj,
      status,
      barWidth,
      barClass: status === 'winning' ? 'bg-green-500' : status === 'losing' ? 'bg-red-500' : 'bg-yellow-500',
      statusClass: status === 'winning' ? 'text-green-400' : status === 'losing' ? 'text-red-400' : 'text-yellow-400'
    }
  })
})

// Potential category flips
const potentialFlips = computed(() => {
  const flips: any[] = []
  
  for (const cat of categoryImpactBreakdown.value) {
    if (cat.status === 'close') {
      // Determine if we can gain or might lose this category
      const currentStatus = matchupCategoryStatus.value[cat.stat_id]?.status
      
      if (currentStatus === 'losing') {
        flips.push({
          ...cat,
          direction: 'gain',
          description: `Strong lineup today could flip this to a win`
        })
      } else if (currentStatus === 'winning') {
        flips.push({
          ...cat,
          direction: 'lose',
          description: `Close lead - don't bench key contributors`
        })
      } else {
        flips.push({
          ...cat,
          direction: 'gain',
          description: `Toss-up category - your starters could decide it`
        })
      }
    }
  }
  
  return flips.slice(0, 4) // Max 4 flips to show
})

watch(selectedCategory, () => { selectAllPositions() })

// Watch for sport changes to reset positions
watch(currentSport, (newSport) => {
  console.log('[CategoryProjections] Sport changed to:', newSport)
  selectAllPositions()
  // Reset selectedStartSitPosition to first position for new sport
  const positions = startSitPositions.value
  if (positions.length > 0) {
    selectedStartSitPosition.value = positions[0].id
  }
})

/**
 * Load live games schedule
 */
async function loadLiveGames() {
  gamesLoading.value = true
  
  try {
    // Get current local date/time
    const now = new Date()
    const localDateString = now.toLocaleDateString('en-US', { 
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    
    console.log(`[LiveGames] Current time: ${now.toLocaleString()}`)
    console.log(`[LiveGames] Local date: ${localDateString}`)
    console.log(`[LiveGames] UTC date: ${now.toISOString().split('T')[0]}`)
    
    // Calculate the date to load
    let targetDate: Date
    if (startSitDay.value === 'today') {
      targetDate = now
      console.log(`[LiveGames] Loading games for TODAY`)
    } else {
      // Tomorrow - add 24 hours
      targetDate = new Date(now.getTime() + 86400000)
      console.log(`[LiveGames] Loading games for TOMORROW`)
    }
    
    console.log(`[LiveGames] Target date: ${targetDate.toLocaleDateString()} ${targetDate.toLocaleTimeString()}`)
    console.log(`[LiveGames] Loading ${currentSport.value} games for ${startSitDay.value}`)
    
    const games = await liveGamesService.getGamesByDate(currentSport.value, targetDate)
    
    if (startSitDay.value === 'today') {
      todaysGames.value = games
    } else {
      tomorrowsGames.value = games
    }
    
    console.log(`[LiveGames] ========== GAMES LOADED ==========`)
    console.log(`[LiveGames] Count: ${games.length}`)
    console.log(`[LiveGames] Games array:`, games)
    
    if (games.length > 0) {
      console.log('[LiveGames] First game structure:', games[0])
      console.log('[LiveGames] Sample games:', games.slice(0, 3).map((g: any) => ({
        home: g.homeTeam || g.home_team || g.home,
        away: g.awayTeam || g.away_team || g.away,
        status: g.status,
        time: g.time || g.gameTime,
        gameDate: g.gameDate
      })))
    } else {
      console.warn('[LiveGames] ⚠️ No games loaded! This might be why players show wrong game info.')
    }
    console.log(`[LiveGames] ================================`)
    
  } catch (error) {
    console.error('[LiveGames] Error loading games:', error)
  } finally {
    gamesLoading.value = false
  }
}

/**
 * Subscribe to live game updates
 */
function subscribeToLiveGames() {
  if (liveGamesSubscription.value) {
    liveGamesSubscription.value.unsubscribe()
    liveGamesSubscription.value = null
  }
  
  // Calculate target date
  const now = new Date()
  const targetDate = startSitDay.value === 'today' 
    ? now
    : new Date(now.getTime() + 86400000)
  
  console.log('[LiveGames] Subscribing to games for:', targetDate.toLocaleDateString())
  
  liveGamesSubscription.value = liveGamesService.subscribeToLiveGames(
    currentSport.value,
    targetDate,
    (games) => {
      console.log('[LiveGames] Received update:', games.length, 'games')
      
      if (startSitDay.value === 'today') {
        todaysGames.value = games
      } else {
        tomorrowsGames.value = games
      }
    }
  )
}

/**
 * Check scraper health
 */
async function checkScraperHealth() {
  try {
    const scraperName = currentSport.value === 'basketball' ? 'nba_games'
                       : currentSport.value === 'hockey' ? 'nhl_games'
                       : 'mlb_games'
    
    const health = await liveGamesService.checkScraperHealth(scraperName)
    scraperHealth.value[scraperName] = health
    
    if (!health.isHealthy) {
      console.warn(`[LiveGames] Scraper ${scraperName} is unhealthy!`, health)
    }
  } catch (error) {
    console.error('[LiveGames] Error checking scraper health:', error)
  }
}

// Load data on mount - use appropriate loader based on platform
onMounted(async () => { 
  console.log('[CategoryProjections] ===== onMounted =====')
  console.log('[CategoryProjections] activePlatform:', leagueStore.activePlatform)
  console.log('[CategoryProjections] activeLeagueId:', leagueStore.activeLeagueId)
  console.log('[CategoryProjections] isEspn.value:', isEspn.value)
  
  loadSavedWeights()
  if (isEspn.value) {
    console.log('[CategoryProjections] Calling loadEspnProjections...')
    loadEspnProjections()
  } else {
    console.log('[CategoryProjections] Calling loadProjections (Yahoo/Sleeper)...')
    loadProjections()
    // Load real matchup data for Yahoo leagues
    setTimeout(() => loadCurrentMatchup(), 1000) // Wait for data to load
  }
  
  // Load live games
  await loadLiveGames()
  subscribeToLiveGames()
  await checkScraperHealth()
})

// Cleanup on unmount
onUnmounted(() => {
  if (liveGamesSubscription.value) {
    liveGamesSubscription.value.unsubscribe()
    liveGamesSubscription.value = null
  }
})

// Watch for today/tomorrow toggle
watch(() => startSitDay.value, async () => {
  await loadLiveGames()
  subscribeToLiveGames()
})

// Watch for projections/stats mode toggle - adjust period accordingly
watch(() => startSitViewMode.value, (newMode) => {
  if (newMode === 'stats') {
    // Switching to stats mode - default to Last 7 if currently on Today
    if (startSitTimePeriod.value === 'today') {
      startSitTimePeriod.value = 'next7'
    }
  }
  // When switching to projections, keep current period
})

// Watch for sport changes to reload games
const originalWatchCurrentSport = watch(currentSport, async (newSport) => {
  await loadLiveGames()
  subscribeToLiveGames()
  await checkScraperHealth()
})

// Watch for league changes
watch(() => leagueStore.activeLeagueId, (newId, oldId) => {
  console.log('[CategoryProjections] ===== League Changed =====')
  console.log('[CategoryProjections] Old ID:', oldId, '-> New ID:', newId)
  console.log('[CategoryProjections] activePlatform:', leagueStore.activePlatform)
  console.log('[CategoryProjections] isEspn.value:', isEspn.value)
  
  if (newId && newId !== oldId) {
    if (isEspn.value) {
      console.log('[CategoryProjections] Calling loadEspnProjections...')
      loadEspnProjections()
    } else {
      console.log('[CategoryProjections] Calling loadProjections (Yahoo/Sleeper)...')
      loadProjections()
      // Load real matchup data for Yahoo leagues
      setTimeout(() => loadCurrentMatchup(), 1000)
    }
  }
})
// New state variable for comparison mode
const swapComparisonMode = ref<'projections' | 'recent'>('projections')

// ====================================================================================
// PLAYER ANALYSIS MODAL FUNCTIONS
// ====================================================================================

// Get player's rank within their position
function getPlayerPositionRank(player: any): number {
  if (!player || !allPlayers.value) return 0
  
  const samePosition = allPlayers.value.filter(p => {
    const pPos = p.position?.split(',')[0] || ''
    const playerPos = player.position?.split(',')[0] || ''
    return pPos === playerPos
  })
  
  const sorted = samePosition.sort((a, b) => (b.overallValue || 0) - (a.overallValue || 0))
  const rank = sorted.findIndex(p => p.player_key === player.player_key)
  return rank >= 0 ? rank + 1 : 0
}

// Get count of categories player significantly contributes to
function getPlayerCategoryCount(player: any): number {
  if (!player || !displayCategories.value) return 0
  
  let count = 0
  for (const cat of displayCategories.value) {
    const value = parseFloat(player.stats?.[cat.stat_id] || 0)
    const gamesPlayed = isPitcher(player) ? 30 : 140
    const perGame = value / gamesPlayed
    
    // Count if above threshold
    if (perGame > 0.1) count++
  }
  return count
}

// Get player's schedule grade (A, B, C, D, F)
function getPlayerScheduleGrade(player: any): string {
  const games = getPlayerUpcomingGames(player, 14)
  if (games >= 7) return 'A'
  if (games >= 6) return 'B'
  if (games >= 5) return 'C'
  if (games >= 4) return 'D'
  return 'F'
}

function getScheduleGradeClass(player: any): string {
  const grade = getPlayerScheduleGrade(player)
  if (grade === 'A') return 'text-green-400'
  if (grade === 'B') return 'text-blue-400'
  if (grade === 'C') return 'text-yellow-400'
  if (grade === 'D') return 'text-orange-400'
  return 'text-red-400'
}

// Get projected stat for specific time period
function getPlayerProjection(player: any, category: any, period: 'today' | 'next7' | 'next14'): string {
  if (!player || !category) return '0'
  
  // Check if this is a percentage stat - comprehensive detection
  const statId = String(category.stat_id || '').toLowerCase()
  const displayName = String(category.display_name || '').toLowerCase()
  const isPercentage = 
    statId.includes('%') || 
    statId.includes('pct') || 
    statId.includes('percentage') ||
    displayName.includes('%') ||
    displayName.includes('pct') ||
    statId === 'fg%' || statId === 'ft%' || statId === '3p%' ||
    statId === 'fgpct' || statId === 'ftpct' || statId === 'fg_pct' || statId === 'ft_pct' ||
    statId === '5' || statId === '15' || // Yahoo numeric IDs
    category.stat_id === 5 || category.stat_id === 15
  
  // Get the stat value - try multiple possible locations
  let statValue = 0
  
  // Try player.stats first (most common)
  if (player.stats && player.stats[category.stat_id] !== undefined) {
    statValue = parseFloat(player.stats[category.stat_id])
  }
  // Try projections if available
  else if (player.projections && player.projections[category.stat_id] !== undefined) {
    statValue = parseFloat(player.projections[category.stat_id])
  }
  // Try season totals
  else if (player.season_stats && player.season_stats[category.stat_id] !== undefined) {
    statValue = parseFloat(player.season_stats[category.stat_id])
  }
  
  // DEBUG: If no stat value found, log details
  if (statValue === 0 && Math.random() < 0.05) {
    console.log('[getPlayerProjection] No stat found:', {
      player: player.full_name,
      categoryId: category.stat_id,
      categoryName: category.display_name,
      hasStats: !!player.stats,
      statsKeys: player.stats ? Object.keys(player.stats).slice(0, 5) : 'none',
      hasProjections: !!player.projections,
      hasSeason: !!player.season_stats
    })
  }
  
  // If still no data, return 0
  if (isNaN(statValue) || statValue === 0) return '0'
  
  // CRITICAL FIX: Percentages don't project - they're rates, not counting stats
  if (isPercentage) {
    // Just return the percentage value (don't multiply by games)
    // If it's already in percentage form (> 1), return as-is
    if (statValue > 1) {
      return statValue.toFixed(1)
    }
    // If it's in decimal form (0.472), return as decimal for formatCategoryProjection to convert
    else {
      return statValue.toFixed(3)
    }
  }
  
  // For counting stats (points, rebounds, etc.), calculate per-game and project
  const sport = currentSport.value
  let estimatedGamesPlayed = 140
  if (sport === 'basketball') estimatedGamesPlayed = 70
  else if (sport === 'hockey') estimatedGamesPlayed = 70
  else if (sport === 'baseball') estimatedGamesPlayed = 140
  else if (sport === 'football') estimatedGamesPlayed = 17
  
  // For pitchers, use different baseline
  if (isPitcher(player)) {
    estimatedGamesPlayed = 30
  }
  
  const perGame = estimatedGamesPlayed > 0 ? statValue / estimatedGamesPlayed : 0
  
  // Calculate games for period
  let games = 0
  if (period === 'today') {
    games = player.hasGame ? 1 : 0
  } else if (period === 'next7') {
    games = getPlayerUpcomingGames(player, 7)
  } else if (period === 'next14') {
    games = getPlayerUpcomingGames(player, 14)
  }
  
  const projected = perGame * games
  
  // Format counting stats
  if (projected < 1) {
    return projected.toFixed(2)
  } else if (projected < 10) {
    return projected.toFixed(1)
  } else {
    return Math.round(projected).toString()
  }
}

// Get season average per game
function getPlayerSeasonAvg(player: any, category: any): string {
  if (!player || !category) return '0'
  
  const statValue = parseFloat(player.stats?.[category.stat_id] || 0)
  const gamesPlayed = isPitcher(player) ? 30 : 140
  const perGame = gamesPlayed > 0 ? statValue / gamesPlayed : 0
  
  const statIdStr = String(category.stat_id || '')
  if (statIdStr.includes('%') || statIdStr.includes('PCT')) {
    return (statValue * 100).toFixed(1) + '%'
  } else if (perGame < 1) {
    return perGame.toFixed(2)
  } else {
    return perGame.toFixed(1)
  }
}

// Get rest of season projection
function getPlayerSeasonProjection(player: any, category: any): string {
  if (!player || !category) return '0'
  
  // Check if percentage
  const statId = String(category.stat_id || '').toLowerCase()
  const isPercentage = statId.includes('%') || statId.includes('pct')
  
  const statValue = parseFloat(player.stats?.[category.stat_id] || 0)
  if (isNaN(statValue) || statValue === 0) return '0'
  
  if (isPercentage) {
    // Return season average for percentages
    if (statValue > 1) return statValue.toFixed(1)
    else return statValue.toFixed(3)
  }
  
  // For counting stats, estimate remaining games
  const sport = currentSport.value
  let remainingGames = 30
  if (sport === 'basketball') remainingGames = 25
  else if (sport === 'hockey') remainingGames = 25
  else if (sport === 'baseball') remainingGames = 50
  
  const gamesPlayed = isPitcher(player) ? 30 : (sport === 'baseball' ? 140 : 70)
  const perGame = gamesPlayed > 0 ? statValue / gamesPlayed : 0
  const projected = perGame * remainingGames
  
  if (projected < 1) return projected.toFixed(2)
  else if (projected < 10) return projected.toFixed(1)
  else return Math.round(projected).toString()
}

// Get historical stat for last N days or season
function getPlayerHistoricalStat(player: any, category: any, period: 'last7' | 'last14' | 'season'): string {
  if (!player || !category) return '0'
  
  // Check if percentage
  const statId = String(category.stat_id || '').toLowerCase()
  const isPercentage = statId.includes('%') || statId.includes('pct')
  
  const statValue = parseFloat(player.stats?.[category.stat_id] || 0)
  if (isNaN(statValue) || statValue === 0) return '0'
  
  if (period === 'season') {
    // Return full season stats
    if (isPercentage) {
      if (statValue > 1) return statValue.toFixed(1)
      else return statValue.toFixed(3)
    }
    return statValue.toFixed(1)
  }
  
  // For last 7 or 14 days, estimate based on per-game
  if (isPercentage) {
    // Percentages stay the same
    if (statValue > 1) return statValue.toFixed(1)
    else return statValue.toFixed(3)
  }
  
  const sport = currentSport.value
  const gamesPlayed = isPitcher(player) ? 30 : (sport === 'baseball' ? 140 : 70)
  const perGame = gamesPlayed > 0 ? statValue / gamesPlayed : 0
  
  // Estimate games in period
  const games = period === 'last7' ? 
    (sport === 'baseball' ? 6 : 3) : 
    (sport === 'baseball' ? 12 : 6)
  
  const periodTotal = perGame * games
  
  if (periodTotal < 1) return periodTotal.toFixed(2)
  else if (periodTotal < 10) return periodTotal.toFixed(1)
  else return Math.round(periodTotal).toString()
}

// Calculate upcoming games (placeholder - would need real schedule data)
function getPlayerUpcomingGames(player: any, days: number): number {
  if (!player || !player.mlb_team) return 0
  
  // Estimate: basketball ~3.5 games per week, baseball ~6 per week, hockey ~3.5 per week
  const sport = currentSport.value
  let gamesPerWeek = 4
  if (sport === 'baseball') gamesPerWeek = 6
  else if (sport === 'hockey') gamesPerWeek = 3.5
  else if (sport === 'basketball') gamesPerWeek = 3.5
  
  const weeks = days / 7
  return Math.round(gamesPerWeek * weeks)
}

// Get schedule difficulty rating
function getScheduleDifficulty(player: any): string {
  // This would ideally use real opponent strength data
  // For now, randomize between Easy/Average/Hard
  const games = getPlayerUpcomingGames(player, 14)
  if (games >= 7) return 'Easy'
  if (games >= 5) return 'Average'
  return 'Hard'
}

function getScheduleDifficultyClass(player: any): string {
  const diff = getScheduleDifficulty(player)
  if (diff === 'Easy') return 'text-green-400'
  if (diff === 'Average') return 'text-yellow-400'
  return 'text-red-400'
}

// Calculate opportunity score
function getOpportunityScore(player: any): number {
  const games = getPlayerUpcomingGames(player, 14)
  const difficulty = getScheduleDifficulty(player)
  
  let multiplier = 1
  if (difficulty === 'Easy') multiplier = 1.2
  else if (difficulty === 'Hard') multiplier = 0.8
  
  return Math.round(games * multiplier * 10) / 10
}

// ====================================================================================
// PLAYER COMPARISON MODAL FUNCTIONS
// ====================================================================================

// Calculate value change from swap
function getValueChange(addPlayer: any, dropPlayer: any): string {
  const addValue = addPlayer?.overallValue || 0
  const dropValue = dropPlayer?.overallValue || 0
  const diff = addValue - dropValue
  
  if (diff > 0) return `+${diff.toFixed(1)}`
  return diff.toFixed(1)
}

function getValueChangeClass(addPlayer: any, dropPlayer: any): string {
  const addValue = addPlayer?.overallValue || 0
  const dropValue = dropPlayer?.overallValue || 0
  
  if (addValue > dropValue) return 'text-green-400'
  if (addValue < dropValue) return 'text-red-400'
  return 'text-yellow-400'
}

// Count categories improved
function getCategoriesImproved(addPlayer: any, dropPlayer: any): number {
  if (!addPlayer || !dropPlayer) return 0
  
  let improved = 0
  for (const cat of displayCategories.value) {
    const addValue = parseFloat(addPlayer.stats?.[cat.stat_id] || 0)
    const dropValue = parseFloat(dropPlayer.stats?.[cat.stat_id] || 0)
    
    if (addValue > dropValue) improved++
  }
  return improved
}

// Get swap recommendation
function getSwapRecommendation(addPlayer: any, dropPlayer: any): string {
  const valueDiff = (addPlayer?.overallValue || 0) - (dropPlayer?.overallValue || 0)
  const catsImproved = getCategoriesImproved(addPlayer, dropPlayer)
  
  if (valueDiff >= 10 && catsImproved >= 5) return '🔥 MUST DO'
  if (valueDiff >= 5 && catsImproved >= 3) return '✅ DO IT'
  if (valueDiff > 0 && catsImproved > 0) return '👍 GOOD'
  if (valueDiff > -5) return '🤷 MEH'
  return '❌ BAD'
}

function getSwapRecommendationClass(addPlayer: any, dropPlayer: any): string {
  const rec = getSwapRecommendation(addPlayer, dropPlayer)
  if (rec.includes('MUST') || rec.includes('DO IT')) return 'text-green-400'
  if (rec.includes('GOOD')) return 'text-blue-400'
  if (rec.includes('MEH')) return 'text-yellow-400'
  return 'text-red-400'
}

// Get category value for comparison
function getCategoryValue(player: any, category: any, mode: 'projections' | 'recent'): string {
  if (!player || !category) return '0'
  
  if (mode === 'recent') {
    // Recent stats (last 14 days estimate)
    const seasonValue = parseFloat(player.stats?.[category.stat_id] || 0)
    const gamesPlayed = isPitcher(player) ? 30 : 140
    const perGame = gamesPlayed > 0 ? seasonValue / gamesPlayed : 0
    const recent = perGame * 10 // Assume ~10 games in last 14 days
    
    return recent.toFixed(1)
  } else {
    // Projections (next 14 days)
    return getPlayerProjection(player, category, 'next14')
  }
}

// Get bar width for visualization (0-100%)
function getCategoryBarWidth(player: any, category: any, mode: 'projections' | 'recent'): string {
  const value = parseFloat(getCategoryValue(player, category, mode))
  
  // Find max value between both players for scaling
  const addValue = swapSourcePlayer.value ? parseFloat(getCategoryValue(swapSourcePlayer.value, category, mode)) : 0
  const dropValue = selectedSwapTarget.value ? parseFloat(getCategoryValue(selectedSwapTarget.value, category, mode)) : 0
  const maxValue = Math.max(addValue, dropValue, 0.1)
  
  const percentage = (value / maxValue) * 100
  return `${Math.min(percentage, 100)}%`
}

// Get comparison difference
function getCategoryComparisonDiff(addPlayer: any, dropPlayer: any, category: any): string {
  const mode = swapComparisonMode.value
  const addValue = parseFloat(getCategoryValue(addPlayer, category, mode))
  const dropValue = parseFloat(getCategoryValue(dropPlayer, category, mode))
  const diff = addValue - dropValue
  
  if (diff > 0) return `+${diff.toFixed(1)}`
  return diff.toFixed(1)
}

function getCategoryDifferenceColor(addPlayer: any, dropPlayer: any, category: any): string {
  const mode = swapComparisonMode.value
  const addValue = parseFloat(getCategoryValue(addPlayer, category, mode))
  const dropValue = parseFloat(getCategoryValue(dropPlayer, category, mode))
  
  if (addValue > dropValue) return 'text-green-400'
  if (addValue < dropValue) return 'text-red-400'
  return 'text-yellow-400'
}

// Confirm the swap
function confirmSwap() {
  if (!swapSourcePlayer.value || !selectedSwapTarget.value) return
  
  alert(`Move confirmed: Add ${swapSourcePlayer.value.full_name}, Drop ${selectedSwapTarget.value.full_name}`)
  
  // Close modal and reset
  showSwapModal.value = false
  selectedSwapTarget.value = null
  swapSourcePlayer.value = null
}

// Get actual category abbreviation from platform
function getCategoryDisplayName(category: any): string {
  if (!category) return ''
  
  // Try these in order of preference
  return category.display_name || 
         category.abbr || 
         category.name || 
         category.stat_id || 
         ''
}

// Add injury indicator to player cards
function getInjuryStatus(player: any): { status: string; description: string; color: string } | null {
  const injuryStatus = player.injury_status || player.status || ''
  const injuryNote = player.injury_note || player.injury_description || ''
  
  if (!injuryStatus) return null
  
  const statusMap: Record<string, { description: string; color: string }> = {
    'O': { description: 'Out', color: 'text-red-500' },
    'IL': { description: 'Injured List', color: 'text-red-500' },
    'INJ': { description: 'Injured', color: 'text-red-500' },
    'DTD': { description: 'Day-to-Day', color: 'text-yellow-500' },
    'Q': { description: 'Questionable', color: 'text-yellow-500' },
    'D': { description: 'Doubtful', color: 'text-orange-500' },
    'P': { description: 'Probable', color: 'text-green-500' },
    'SUSP': { description: 'Suspended', color: 'text-red-500' }
  }
  
  const info = statusMap[injuryStatus.toUpperCase()]
  if (!info) return null
  
  return {
    status: injuryStatus.toUpperCase(),
    description: injuryNote || info.description,
    color: info.color
  }
}

// ====================================================================================
// YAHOO ROSTER POSITIONS FIX
// ====================================================================================

// Add this at the end of loadYahooLeague function to manually construct roster positions if needed
async function fixYahooRosterPositions(leagueKey: string) {
  console.log('[fixYahooRosterPositions] Attempting to fix Yahoo roster positions...')
  
  // If we don't have roster positions, construct them from the first team's roster
  if (!leagueRosterPositions.value || leagueRosterPositions.value.length === 0) {
    try {
      const myTeam = teamsData.value.find(t => t.is_my_team || t.is_owned_by_current_login)
      if (myTeam && myTeam.roster) {
        console.log('[fixYahooRosterPositions] Building from roster:', myTeam.roster)
        
        // Extract positions from actual roster
        const positions: string[] = []
        for (const player of myTeam.roster.players || []) {
          if (player.selected_position && player.selected_position !== 'BN' && player.selected_position !== 'IL') {
            positions.push(player.selected_position)
          }
        }
        
        leagueRosterPositions.value = positions
        console.log('[fixYahooRosterPositions] ✅ Fixed positions:', leagueRosterPositions.value)
      }
    } catch (error) {
      console.error('[fixYahooRosterPositions] Error:', error)
    }
  }
}
</script>
