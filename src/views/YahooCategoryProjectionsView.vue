<template>
  <div class="space-y-6">
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
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-yellow-400 mx-auto mb-4"></div>
        <p class="text-dark-textMuted">{{ loadingMessage }}</p>
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
                <optgroup label="Hitting">
                  <option v-for="cat in hittingCategories" :key="cat.stat_id" :value="cat.stat_id">
                    {{ cat.name }} ({{ cat.display_name }})
                  </option>
                </optgroup>
                <optgroup label="Pitching">
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
                  {{ isRatioCategory ? 'Ratio stat' : 'Counting stat' }} • {{ isPitchingCategory ? 'Pitching' : 'Hitting' }}
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
          <button 
            @click="showRankingSettings = true"
            class="px-3 py-1.5 text-sm rounded-lg border transition-all flex items-center gap-2 bg-dark-card text-dark-textMuted border-dark-border hover:border-yellow-400 hover:text-yellow-400"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Customize Rankings
          </button>
        </div>
      </div>

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
          <div class="card bg-gradient-to-r from-green-500/10 to-cyan-500/10 border-green-500/30">
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
                    <div class="text-2xl font-bold text-cyan-400">{{ pitchingCategories.length }}</div>
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
                      <img :src="team.logo || defaultLogo" :alt="team.name" class="w-full h-full object-cover" @error="handleImageError" />
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
                        <img :src="team.logo || defaultLogo" class="w-8 h-8 rounded-lg" @error="handleImageError" />
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
        <div class="space-y-4">
          
          <!-- Current Matchup Context -->
          <div class="card bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30">
            <div class="card-body py-4">
              <div class="flex items-center justify-between flex-wrap gap-4">
                <div class="flex items-center gap-4">
                  <div class="text-center">
                    <div class="text-xs text-dark-textMuted uppercase mb-1">Your Matchup</div>
                    <div class="flex items-center gap-3">
                      <div class="text-right">
                        <div class="font-bold text-dark-text">{{ myTeamName }}</div>
                        <div class="text-2xl font-black text-green-400">{{ matchupWins }}</div>
                      </div>
                      <div class="text-dark-textMuted font-bold">vs</div>
                      <div class="text-left">
                        <div class="font-bold text-dark-text">{{ opponentName }}</div>
                        <div class="text-2xl font-black text-red-400">{{ matchupLosses }}</div>
                      </div>
                    </div>
                  </div>
                  <div class="h-12 w-px bg-dark-border mx-2"></div>
                  <div class="text-center">
                    <div class="text-xs text-dark-textMuted uppercase mb-1">Tied</div>
                    <div class="text-2xl font-black text-yellow-400">{{ matchupTies }}</div>
                  </div>
                </div>
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
              </div>
            </div>
          </div>

          <!-- Date & Mode Toggle -->
          <div class="card">
            <div class="card-body py-3">
              <div class="flex items-center justify-between flex-wrap gap-4">
                <div class="flex items-center gap-3">
                  <span class="text-dark-textMuted font-medium">View:</span>
                  <div class="flex rounded-lg overflow-hidden border border-dark-border/50">
                    <button @click="startSitMode = 'daily'" :class="startSitMode === 'daily' ? 'bg-yellow-400 text-gray-900' : 'bg-dark-card text-dark-textMuted'" class="px-4 py-2 text-sm font-medium transition-colors">📅 Daily</button>
                    <button @click="startSitMode = 'weekly'" :class="startSitMode === 'weekly' ? 'bg-yellow-400 text-gray-900' : 'bg-dark-card text-dark-textMuted'" class="px-4 py-2 text-sm font-medium transition-colors">📆 Weekly</button>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <template v-if="startSitMode === 'daily'">
                    <div class="flex rounded-lg overflow-hidden border border-dark-border/50">
                      <button @click="startSitDay = 'today'" :class="startSitDay === 'today' ? 'bg-yellow-400 text-gray-900' : 'bg-dark-card text-dark-textMuted hover:bg-dark-border/50'" class="px-4 py-2 text-sm font-medium transition-colors">Today</button>
                      <button @click="startSitDay = 'tomorrow'" :class="startSitDay === 'tomorrow' ? 'bg-yellow-400 text-gray-900' : 'bg-dark-card text-dark-textMuted hover:bg-dark-border/50'" class="px-4 py-2 text-sm font-medium transition-colors">Tomorrow</button>
                    </div>
                    <span class="text-dark-text font-semibold">{{ formatStartSitDate }}</span>
                  </template>
                  <template v-else>
                    <span class="text-dark-text font-semibold">Week {{ currentMatchupWeek }}</span>
                  </template>
                </div>
              </div>
            </div>
          </div>

          <!-- Legend & Filters -->
          <div class="card">
            <div class="card-body py-3">
              <div class="flex items-center justify-between flex-wrap gap-4">
                <div class="flex items-center gap-4">
                  <span class="text-dark-textMuted text-sm font-medium">Show:</span>
                  <div class="flex rounded-lg overflow-hidden border border-dark-border/50">
                    <button 
                      @click="startSitPlayerFilter = 'all'" 
                      :class="startSitPlayerFilter === 'all' ? 'bg-yellow-400 text-gray-900' : 'bg-dark-card text-dark-textMuted hover:bg-dark-border/50'" 
                      class="px-3 py-1.5 text-sm font-medium transition-colors"
                    >All Players</button>
                    <button 
                      @click="startSitPlayerFilter = 'mine'" 
                      :class="startSitPlayerFilter === 'mine' ? 'bg-yellow-500 text-gray-900' : 'bg-dark-card text-dark-textMuted hover:bg-dark-border/50'" 
                      class="px-3 py-1.5 text-sm font-medium transition-colors"
                    >My Team + FA</button>
                    <button 
                      @click="startSitPlayerFilter = 'fa'" 
                      :class="startSitPlayerFilter === 'fa' ? 'bg-cyan-500 text-gray-900' : 'bg-dark-card text-dark-textMuted hover:bg-dark-border/50'" 
                      class="px-3 py-1.5 text-sm font-medium transition-colors"
                    >Free Agents</button>
                  </div>
                </div>
                <div class="flex items-center gap-6 text-sm">
                  <div class="flex items-center gap-2"><div class="w-4 h-4 rounded bg-yellow-500/30 border-l-2 border-yellow-400"></div><span class="text-dark-textMuted">My Players</span></div>
                  <div class="flex items-center gap-2"><div class="w-4 h-4 rounded bg-cyan-500/20 border-l-2 border-cyan-400"></div><span class="text-dark-textMuted">Free Agents</span></div>
                </div>
                <div class="flex items-center gap-4 text-sm">
                  <span class="text-dark-textMuted">Category Status:</span>
                  <span class="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-xs font-bold">Winning</span>
                  <span class="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-xs font-bold">Close</span>
                  <span class="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-xs font-bold">Losing</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Main Content: Position Tabs + Player List + Sidebar -->
          <div class="flex gap-6">
            <!-- Left: Position List -->
            <div class="flex-1 min-w-0">
              <!-- Position Selector -->
              <div class="flex items-center gap-2 mb-4 flex-wrap">
                <button 
                  v-for="pos in startSitPositions" 
                  :key="pos.id" 
                  @click="selectedStartSitPosition = pos.id"
                  :class="selectedStartSitPosition === pos.id ? 'bg-yellow-400 text-gray-900' : 'bg-dark-border/30 text-dark-textSecondary hover:text-dark-text'"
                  class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                >
                  {{ pos.label }}
                </button>
              </div>

              <!-- Player List -->
              <div class="card">
                <div class="card-header">
                  <div class="flex items-center gap-3">
                    <span class="px-3 py-1 rounded text-sm font-bold" :class="getStartSitPositionClass(selectedStartSitPosition)">{{ selectedStartSitPosition }}</span>
                    <h2 class="card-title">{{ startSitMode === 'daily' ? (startSitDay === 'today' ? "Today's" : "Tomorrow's") : "This Week's" }} Players</h2>
                  </div>
                  <div class="text-sm text-dark-textMuted">{{ getStartSitPlayersForPosition(selectedStartSitPosition).filter(p => p.fantasy_team_key === myTeamKey).length }} rostered</div>
                </div>
                <div class="card-body p-0">
                  <div class="overflow-x-auto max-h-[60vh] overflow-y-auto">
                    <table class="w-full">
                      <thead class="bg-dark-border/30 sticky top-0 z-10">
                        <tr>
                          <th class="px-3 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase w-12">#</th>
                          <th class="px-3 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase">Player</th>
                          <th class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-24">{{ startSitMode === 'daily' ? 'Matchup' : 'Games' }}</th>
                          <th 
                            v-for="cat in relevantStartSitCategories" 
                            :key="cat.stat_id" 
                            class="px-2 py-3 text-center text-xs font-semibold uppercase w-14"
                            :class="getCategoryHeaderClass(cat.stat_id)"
                            :title="cat.name"
                          >
                            {{ cat.display_name }}
                          </th>
                          <th class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-32">Recommendation</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-dark-border/30">
                        <tr 
                          v-for="(player, index) in getStartSitPlayersForPosition(selectedStartSitPosition)" 
                          :key="player.player_key"
                          :class="getStartSitRowClass(player)"
                          class="hover:bg-dark-border/20 transition-colors cursor-pointer"
                          @click="openSwapModal(player)"
                        >
                          <td class="px-3 py-3">
                            <span class="font-bold text-lg text-dark-text">{{ index + 1 }}</span>
                          </td>
                          <td class="px-3 py-3">
                            <div class="flex items-center gap-3">
                              <div class="relative">
                                <div class="w-10 h-10 rounded-full bg-dark-border overflow-hidden ring-2" :class="getStartSitAvatarClass(player)">
                                  <img :src="player.headshot || defaultHeadshot" :alt="player.full_name" class="w-full h-full object-cover" @error="handleImageError" />
                                </div>
                                <div v-if="player.fantasy_team_key === myTeamKey" class="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                                  <span class="text-xs text-gray-900 font-bold">★</span>
                                </div>
                                <div v-else-if="!player.fantasy_team_key" class="absolute -top-1 -right-1 w-5 h-5 bg-cyan-400 rounded-full flex items-center justify-center">
                                  <span class="text-xs text-gray-900 font-bold">+</span>
                                </div>
                              </div>
                              <div>
                                <span class="font-semibold" :class="getStartSitPlayerNameClass(player)">{{ player.full_name }}</span>
                                <div class="flex items-center gap-2 text-xs text-dark-textMuted">
                                  <span>{{ player.mlb_team || 'FA' }}</span>
                                  <span class="text-dark-border">•</span>
                                  <template v-if="player.fantasy_team">
                                    <div class="flex items-center gap-1" :class="player.fantasy_team_key === myTeamKey ? 'text-yellow-400' : 'text-dark-textMuted'">
                                      <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
                                      <span>{{ player.fantasy_team }}</span>
                                    </div>
                                  </template>
                                  <span v-else class="text-cyan-400 flex items-center gap-1">
                                    <span>+</span> Free Agent
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td class="px-2 py-3 text-center">
                            <span v-if="startSitMode === 'daily'" class="text-xs font-medium" :class="player.hasGame ? 'text-dark-text' : 'text-dark-textMuted italic'">
                              {{ player.opponent || 'No Game' }}
                            </span>
                            <span v-else class="text-xs text-dark-text font-medium">{{ player.gamesThisWeek || 0 }} games</span>
                          </td>
                          <td 
                            v-for="cat in relevantStartSitCategories" 
                            :key="cat.stat_id" 
                            class="px-2 py-3 text-center"
                          >
                            <div class="flex flex-col items-center">
                              <span class="text-sm font-bold" :class="getCategoryProjectionClass(player, cat)">
                                {{ formatCategoryProjection(player, cat) }}
                              </span>
                              <span class="text-[10px] text-dark-textMuted">
                                {{ getCategoryPerGame(player, cat) }}/g
                              </span>
                            </div>
                          </td>
                          <td class="px-2 py-3 text-center">
                            <div class="flex flex-col items-center gap-1">
                              <span class="px-2 py-1 rounded text-xs font-bold whitespace-nowrap" :class="getRecommendationClass(player)">
                                {{ getRecommendation(player).verdict }}
                              </span>
                              <span class="text-[10px] text-dark-textMuted whitespace-nowrap">{{ getRecommendation(player).reason }}</span>
                            </div>
                          </td>
                        </tr>
                        <tr v-if="getStartSitPlayersForPosition(selectedStartSitPosition).length === 0">
                          <td :colspan="4 + relevantStartSitCategories.length" class="px-4 py-8 text-center text-dark-textMuted">
                            No {{ selectedStartSitPosition }} players found{{ startSitMode === 'daily' ? ' with games ' + (startSitDay === 'today' ? 'today' : 'tomorrow') : '' }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right Sidebar: Starting Lineup & Category Impact -->
            <div class="w-[420px] flex-shrink-0 space-y-4">
              <!-- Starting Lineup -->
              <div class="card sticky top-4">
                <div class="card-header py-3">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="text-xl">🏆</span>
                      <h2 class="text-base font-bold text-dark-text">{{ startSitMode === 'daily' ? "Today's" : "This Week's" }} Lineup</h2>
                    </div>
                    <span class="text-xs text-dark-textMuted">{{ suggestedLineupPlayerCount }} starters</span>
                  </div>
                </div>
                <div class="card-body p-0">
                  <div class="divide-y divide-dark-border/30 max-h-[35vh] overflow-y-auto">
                    <div v-for="(slot, idx) in suggestedCategoryLineup" :key="idx" class="flex items-center gap-2 px-3 py-2 hover:bg-dark-border/20">
                      <div class="w-10 text-center">
                        <span class="px-1.5 py-0.5 rounded text-[10px] font-bold" :class="getStartSitPositionClass(slot.position)">{{ slot.position }}</span>
                      </div>
                      <div v-if="slot.player" class="flex items-center gap-2 flex-1 min-w-0">
                        <div class="w-8 h-8 rounded-full bg-dark-border overflow-hidden">
                          <img :src="slot.player.headshot || defaultHeadshot" class="w-full h-full object-cover" @error="handleImageError" />
                        </div>
                        <div class="flex-1 min-w-0">
                          <div class="font-medium text-dark-text text-xs truncate">{{ slot.player.full_name }}</div>
                          <div class="text-[10px] text-dark-textMuted">{{ slot.player.opponent || (slot.player.gamesThisWeek + ' games') }}</div>
                        </div>
                        <div class="text-right">
                          <div class="text-[10px] text-dark-textMuted">{{ slot.player.impactCats || 0 }} cats</div>
                        </div>
                      </div>
                      <div v-else class="flex items-center gap-2 flex-1">
                        <div class="w-8 h-8 rounded-full bg-dark-border/30"></div>
                        <span class="text-xs text-dark-textMuted italic">Empty</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Category Impact Analysis -->
              <div class="card">
                <div class="card-header py-3">
                  <div class="flex items-center gap-2">
                    <span class="text-xl">📊</span>
                    <h2 class="text-base font-bold text-dark-text">Category Impact</h2>
                  </div>
                </div>
                <div class="card-body p-0">
                  <div class="divide-y divide-dark-border/30">
                    <!-- Current vs Projected -->
                    <div class="p-3">
                      <div class="text-xs text-dark-textMuted uppercase tracking-wider mb-2">Matchup Projection</div>
                      <div class="flex items-center justify-between mb-3">
                        <div class="text-center flex-1">
                          <div class="text-2xl font-black text-green-400">{{ projectedWins }}</div>
                          <div class="text-[10px] text-dark-textMuted">Proj Wins</div>
                        </div>
                        <div class="text-center px-4">
                          <div class="text-lg font-bold text-dark-textMuted">-</div>
                        </div>
                        <div class="text-center flex-1">
                          <div class="text-2xl font-black text-red-400">{{ projectedLosses }}</div>
                          <div class="text-[10px] text-dark-textMuted">Proj Losses</div>
                        </div>
                        <div class="text-center px-4">
                          <div class="text-lg font-bold text-dark-textMuted">-</div>
                        </div>
                        <div class="text-center flex-1">
                          <div class="text-2xl font-black text-yellow-400">{{ projectedTies }}</div>
                          <div class="text-[10px] text-dark-textMuted">Toss-ups</div>
                        </div>
                      </div>
                      <!-- Win Probability Bar -->
                      <div class="mb-2">
                        <div class="flex items-center justify-between text-xs mb-1">
                          <span class="text-dark-textMuted">Win Probability</span>
                          <span class="font-bold" :class="winProbabilityClass">{{ winProbability }}%</span>
                        </div>
                        <div class="h-2 bg-dark-border rounded-full overflow-hidden">
                          <div class="h-full rounded-full transition-all duration-500" :class="winProbabilityBarClass" :style="{ width: winProbability + '%' }"></div>
                        </div>
                      </div>
                    </div>

                    <!-- Category-by-Category Breakdown -->
                    <div class="p-3">
                      <div class="text-xs text-dark-textMuted uppercase tracking-wider mb-2">Category Breakdown</div>
                      <div class="space-y-1.5 max-h-[30vh] overflow-y-auto">
                        <div v-for="cat in categoryImpactBreakdown" :key="cat.stat_id" class="flex items-center gap-2 text-xs">
                          <span class="w-8 font-medium text-dark-text shrink-0">{{ cat.display_name }}</span>
                          <div class="flex-1 h-1.5 bg-dark-border rounded-full overflow-hidden min-w-[40px]">
                            <div class="h-full rounded-full" :class="cat.barClass" :style="{ width: cat.barWidth + '%' }"></div>
                          </div>
                          <div class="flex items-center gap-1 shrink-0">
                            <span class="font-mono text-[11px]" :class="cat.statusClass">{{ cat.myProj }}</span>
                            <span class="text-dark-textMuted">v</span>
                            <span class="font-mono text-[11px] text-dark-textMuted">{{ cat.oppProj }}</span>
                          </div>
                          <span class="w-4 text-center shrink-0">
                            <span v-if="cat.status === 'winning'" class="text-green-400">✓</span>
                            <span v-else-if="cat.status === 'losing'" class="text-red-400">✗</span>
                            <span v-else class="text-yellow-400">~</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <!-- Potential Flips -->
                    <div class="p-3">
                      <div class="text-xs text-dark-textMuted uppercase tracking-wider mb-2">🔄 Potential Category Flips</div>
                      <div v-if="potentialFlips.length > 0" class="space-y-2">
                        <div v-for="flip in potentialFlips" :key="flip.stat_id" class="bg-dark-border/20 rounded-lg px-3 py-2">
                          <div class="flex items-center justify-between">
                            <span class="font-medium text-dark-text text-sm">{{ flip.display_name }}</span>
                            <span class="text-xs" :class="flip.direction === 'gain' ? 'text-green-400' : 'text-red-400'">
                              {{ flip.direction === 'gain' ? '📈 Can Win' : '📉 At Risk' }}
                            </span>
                          </div>
                          <div class="text-[10px] text-dark-textMuted mt-1">
                            {{ flip.description }}
                          </div>
                        </div>
                      </div>
                      <div v-else class="text-sm text-dark-textMuted italic text-center py-2">
                        No close categories to flip
                      </div>
                    </div>

                    <!-- Pickup Suggestions -->
                    <div class="p-3 bg-cyan-500/5">
                      <div class="text-xs text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <span>🎯</span> Pickup Suggestions
                      </div>
                      <div v-if="pickupSuggestions.length > 0" class="space-y-2">
                        <div v-for="suggestion in pickupSuggestions" :key="suggestion.player_key" class="bg-dark-border/30 rounded-lg px-3 py-2">
                          <div class="flex items-center gap-2">
                            <img :src="suggestion.headshot || defaultHeadshot" class="w-8 h-8 rounded-full" @error="handleImageError" />
                            <div class="flex-1 min-w-0">
                              <div class="font-medium text-cyan-300 text-sm truncate">{{ suggestion.full_name }}</div>
                              <div class="text-[10px] text-dark-textMuted">{{ suggestion.position?.split(',')[0] }} • {{ suggestion.mlb_team }}</div>
                            </div>
                          </div>
                          <div class="mt-2 flex items-center justify-between">
                            <div class="flex flex-wrap gap-1">
                              <span v-for="cat in suggestion.helpsWith" :key="cat" class="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-[10px] font-medium">
                                {{ cat }}
                              </span>
                            </div>
                            <span class="text-[10px] text-cyan-400 font-medium">+{{ suggestion.impactScore }} impact</span>
                          </div>
                          <div class="text-[10px] text-dark-textMuted mt-1">
                            {{ suggestion.reason }}
                          </div>
                        </div>
                      </div>
                      <div v-else class="text-sm text-dark-textMuted italic text-center py-2">
                        No high-impact pickups available
                      </div>
                    </div>
                  </div>
                </div>
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
                </div>
                <span class="text-sm text-dark-textMuted">{{ myTeamName }}</span>
              </div>
              <div class="card-body">
                <!-- Selected Player to Give -->
                <div v-if="tradeGivePlayer" class="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/30 mb-4">
                  <div class="flex items-center gap-4">
                    <div class="w-14 h-14 rounded-full bg-dark-border overflow-hidden ring-2 ring-yellow-400">
                      <img :src="tradeGivePlayer.headshot || defaultHeadshot" :alt="tradeGivePlayer.full_name" class="w-full h-full object-cover" @error="handleImageError" />
                    </div>
                    <div class="flex-1">
                      <div class="font-bold text-yellow-400">{{ tradeGivePlayer.full_name }}</div>
                      <div class="text-sm text-dark-textMuted">{{ tradeGivePlayer.position }} • {{ tradeGivePlayer.mlb_team }}</div>
                    </div>
                    <button @click="tradeGivePlayer = null" class="p-2 hover:bg-dark-border/50 rounded-lg">
                      <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <!-- Player Key Stats -->
                  <div class="mt-3 grid grid-cols-4 gap-2">
                    <div v-for="cat in displayCategories.slice(0, 4)" :key="cat.stat_id" class="text-center bg-dark-border/30 rounded-lg py-2">
                      <div class="text-sm font-bold text-dark-text">{{ formatPlayerStat(tradeGivePlayer, cat.stat_id) }}</div>
                      <div class="text-[10px] text-dark-textMuted">{{ cat.display_name }}</div>
                    </div>
                  </div>
                </div>

                <!-- Player Selection -->
                <div v-if="!tradeGivePlayer">
                  <div class="text-sm text-dark-textMuted mb-3">Select a player from your roster:</div>
                  <div class="relative mb-3">
                    <input 
                      v-model="tradeGiveSearch" 
                      type="text" 
                      placeholder="Search your players..." 
                      class="w-full bg-dark-border/50 border border-dark-border rounded-lg px-4 py-2 text-dark-text placeholder-dark-textMuted text-sm"
                    />
                  </div>
                  <div class="space-y-1 max-h-64 overflow-y-auto">
                    <div 
                      v-for="player in filteredMyPlayersForTrade" 
                      :key="player.player_key"
                      @click="tradeGivePlayer = player"
                      class="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-yellow-400/10 transition-colors"
                    >
                      <div class="w-10 h-10 rounded-full bg-dark-border overflow-hidden">
                        <img :src="player.headshot || defaultHeadshot" :alt="player.full_name" class="w-full h-full object-cover" @error="handleImageError" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="font-medium text-dark-text text-sm truncate">{{ player.full_name }}</div>
                        <div class="text-xs text-dark-textMuted">{{ player.position }} • {{ player.mlb_team }}</div>
                      </div>
                      <div class="text-right">
                        <div class="text-sm font-bold text-yellow-400">{{ player.overallValue?.toFixed(0) || '-' }}</div>
                        <div class="text-[10px] text-dark-textMuted">Value</div>
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
                </div>
                <select 
                  v-model="tradePartnerKey" 
                  class="select bg-dark-border border-dark-border text-dark-text px-3 py-1.5 rounded-lg text-sm"
                  @change="tradeGetPlayer = null"
                >
                  <option value="">Select trade partner...</option>
                  <option v-for="team in otherTeams" :key="team.team_key" :value="team.team_key">
                    {{ team.name }}
                  </option>
                </select>
              </div>
              <div class="card-body">
                <!-- Selected Player to Get -->
                <div v-if="tradeGetPlayer" class="bg-cyan-500/10 rounded-xl p-4 border border-cyan-500/30 mb-4">
                  <div class="flex items-center gap-4">
                    <div class="w-14 h-14 rounded-full bg-dark-border overflow-hidden ring-2 ring-cyan-400">
                      <img :src="tradeGetPlayer.headshot || defaultHeadshot" :alt="tradeGetPlayer.full_name" class="w-full h-full object-cover" @error="handleImageError" />
                    </div>
                    <div class="flex-1">
                      <div class="font-bold text-cyan-400">{{ tradeGetPlayer.full_name }}</div>
                      <div class="text-sm text-dark-textMuted">{{ tradeGetPlayer.position }} • {{ tradeGetPlayer.mlb_team }}</div>
                    </div>
                    <button @click="tradeGetPlayer = null" class="p-2 hover:bg-dark-border/50 rounded-lg">
                      <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <!-- Player Key Stats -->
                  <div class="mt-3 grid grid-cols-4 gap-2">
                    <div v-for="cat in displayCategories.slice(0, 4)" :key="cat.stat_id" class="text-center bg-dark-border/30 rounded-lg py-2">
                      <div class="text-sm font-bold text-dark-text">{{ formatPlayerStat(tradeGetPlayer, cat.stat_id) }}</div>
                      <div class="text-[10px] text-dark-textMuted">{{ cat.display_name }}</div>
                    </div>
                  </div>
                </div>

                <!-- Player Selection -->
                <div v-if="!tradeGetPlayer && tradePartnerKey">
                  <div class="text-sm text-dark-textMuted mb-3">Select a player from their roster:</div>
                  <div class="relative mb-3">
                    <input 
                      v-model="tradeGetSearch" 
                      type="text" 
                      placeholder="Search their players..." 
                      class="w-full bg-dark-border/50 border border-dark-border rounded-lg px-4 py-2 text-dark-text placeholder-dark-textMuted text-sm"
                    />
                  </div>
                  <div class="space-y-1 max-h-64 overflow-y-auto">
                    <div 
                      v-for="player in filteredPartnerPlayersForTrade" 
                      :key="player.player_key"
                      @click="tradeGetPlayer = player"
                      class="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-cyan-400/10 transition-colors"
                    >
                      <div class="w-10 h-10 rounded-full bg-dark-border overflow-hidden">
                        <img :src="player.headshot || defaultHeadshot" :alt="player.full_name" class="w-full h-full object-cover" @error="handleImageError" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="font-medium text-dark-text text-sm truncate">{{ player.full_name }}</div>
                        <div class="text-xs text-dark-textMuted">{{ player.position }} • {{ player.mlb_team }}</div>
                      </div>
                      <div class="text-right">
                        <div class="text-sm font-bold text-cyan-400">{{ player.overallValue?.toFixed(0) || '-' }}</div>
                        <div class="text-[10px] text-dark-textMuted">Value</div>
                      </div>
                    </div>
                    <div v-if="filteredPartnerPlayersForTrade.length === 0" class="text-center py-4 text-dark-textMuted text-sm">
                      {{ tradePartnerKey ? 'No players found' : 'Select a trade partner' }}
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

          <!-- Analyze Button -->
          <div class="flex justify-center">
            <button 
              @click="analyzeTrade"
              :disabled="!tradeGivePlayer || !tradeGetPlayer"
              class="px-8 py-3 rounded-xl font-bold text-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              :class="tradeGivePlayer && tradeGetPlayer 
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
    
    <!-- ROS Rankings Settings Modal -->
    <div v-if="showRankingSettings" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" @click.self="showRankingSettings = false">
      <div class="bg-dark-elevated rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-dark-border">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-dark-border flex items-center justify-between">
          <div>
            <h3 class="text-xl font-bold text-dark-text">ROS Rankings Settings</h3>
            <p class="text-sm text-dark-textMuted">Customize how player value scores are calculated</p>
          </div>
          <button @click="showRankingSettings = false" class="p-2 hover:bg-dark-border/50 rounded-lg transition-colors">
            <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <!-- Presets -->
        <div class="px-6 py-4 border-b border-dark-border">
          <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-3">Quick Presets</h4>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <button
              v-for="preset in rosRankingPresets"
              :key="preset.id"
              @click="applyPreset(preset)"
              class="p-3 rounded-xl border transition-colors text-left"
              :class="currentPresetId === preset.id 
                ? 'border-yellow-400 bg-yellow-400/10' 
                : 'border-dark-border hover:border-dark-textMuted bg-dark-border/20'"
            >
              <div class="flex items-start gap-2">
                <span class="text-xl flex-shrink-0">{{ preset.icon }}</span>
                <div class="min-w-0 flex-1">
                  <div class="text-sm font-semibold" :class="currentPresetId === preset.id ? 'text-yellow-400' : 'text-dark-text'">{{ preset.name }}</div>
                  <div class="text-xs text-dark-textMuted mt-0.5 leading-tight">{{ preset.description }}</div>
                </div>
              </div>
            </button>
          </div>
        </div>
        
        <!-- Factors -->
        <div class="px-6 py-4 overflow-y-auto max-h-[45vh]">
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider">Ranking Factors</h4>
            <span class="text-xs" :class="totalWeight === 100 ? 'text-green-400' : 'text-yellow-400'">Total: {{ totalWeight }}%</span>
          </div>
          
          <div class="space-y-3">
            <div 
              v-for="factor in rosRankingFactors" 
              :key="factor.id"
              class="bg-dark-border/20 rounded-xl p-4"
            >
              <div class="flex items-start justify-between gap-4 mb-2">
                <div class="flex items-start gap-3 flex-1 min-w-0">
                  <span class="text-2xl flex-shrink-0 mt-0.5">{{ factor.icon }}</span>
                  <div class="flex-1 min-w-0">
                    <div class="font-semibold text-dark-text text-sm">{{ factor.name }}</div>
                    <p class="text-xs text-dark-textMuted mt-1 leading-relaxed">{{ factor.description }}</p>
                  </div>
                </div>
                <label class="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                  <input 
                    type="checkbox" 
                    v-model="factor.enabled" 
                    @change="onFactorChange"
                    class="sr-only peer"
                  />
                  <div class="w-11 h-6 bg-dark-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-400"></div>
                </label>
              </div>
              
              <div v-if="factor.enabled" class="flex items-center gap-4 mt-3 pt-3 border-t border-dark-border/30">
                <input 
                  type="range" 
                  v-model.number="factor.weight" 
                  min="0" 
                  max="100" 
                  step="5"
                  @input="onFactorChange"
                  class="flex-1 h-2 bg-dark-border rounded-lg appearance-none cursor-pointer accent-yellow-400"
                />
                <div class="w-16 flex items-center gap-1 flex-shrink-0">
                  <input 
                    type="number" 
                    v-model.number="factor.weight" 
                    min="0" 
                    max="100"
                    @input="onFactorChange"
                    class="w-12 px-2 py-1 rounded bg-dark-bg border border-dark-border text-dark-text text-sm text-center"
                  />
                  <span class="text-dark-textMuted text-sm">%</span>
                </div>
              </div>
              
              <!-- Weight bar visualization -->
              <div v-if="factor.enabled" class="mt-2 h-1.5 bg-dark-border rounded-full overflow-hidden">
                <div 
                  class="h-full rounded-full transition-all"
                  :style="{ width: `${factor.weight}%`, backgroundColor: factor.color }"
                ></div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="px-6 py-4 border-t border-dark-border flex items-center justify-between">
          <button 
            @click="resetWeights"
            class="px-4 py-2 text-sm text-dark-textMuted hover:text-dark-text transition-colors"
          >
            Reset to Default
          </button>
          <button 
            @click="showRankingSettings = false"
            class="px-6 py-2 bg-yellow-400 text-gray-900 rounded-lg font-semibold text-sm hover:bg-yellow-300 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>

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
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
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
                    <text x="45" y="25" text-anchor="end">{{ chartYMax.toFixed(1) }}</text>
                    <text x="45" y="95" text-anchor="end">{{ (chartYMax / 2).toFixed(1) }}</text>
                    <text x="45" y="165" text-anchor="end">0</text>
                  </g>
                  <polyline :points="leagueAvgLinePoints" fill="none" stroke="#EAB308" stroke-width="2" stroke-dasharray="6,4" opacity="0.8" />
                  <polyline :points="playerLinePoints" fill="none" stroke="#F59E0B" stroke-width="3" />
                  <g v-for="(perf, idx) in recentPerformances" :key="'p'+idx">
                    <circle :cx="getChartX(idx)" :cy="getChartY(perf.playerValue)" r="6" fill="#F59E0B" stroke="#1F2937" stroke-width="2" />
                    <text :x="getChartX(idx)" :y="getChartY(perf.playerValue) - 12" fill="#F59E0B" font-size="10" font-weight="bold" text-anchor="middle">{{ perf.playerValue.toFixed(1) }}</text>
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
              <h4 class="font-semibold text-dark-text mb-3 flex items-center gap-2"><span>📊</span> All {{ isPitchingCategory ? 'Pitching' : 'Hitting' }} Categories</h4>
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
                  <div class="flex justify-between text-sm mb-1"><span class="text-dark-textMuted">Category Rank ({{ rankingWeights.categoryRank }}%)</span><span class="text-dark-text font-medium">{{ ((1 - (selectedPlayer.categoryRank - 1) / Math.max(filteredPlayers.length, 1)) * 100).toFixed(0) }}</span></div>
                  <div class="h-2 bg-dark-border rounded-full overflow-hidden"><div class="h-full bg-yellow-400 rounded-full" :style="{ width: `${(1 - (selectedPlayer.categoryRank - 1) / Math.max(filteredPlayers.length, 1)) * 100}%` }"></div></div>
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
              <img :src="selectedTeam.logo_url || defaultLogo" :alt="selectedTeam.name" class="w-full h-full object-cover" @error="handleImageError" />
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
                  <span v-for="cat in (selectedTeam.weakCategories || []).slice(0, 4)" :key="cat" class="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-medium">
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { yahooService } from '@/services/yahoo'
import { useFeatureAccess } from '@/composables/useFeatureAccess'
import SimulatedDataBanner from '@/components/SimulatedDataBanner.vue'

const leagueStore = useLeagueStore()
const { hasPremiumAccess } = useFeatureAccess()

const isLoading = ref(true)
const loadingMessage = ref('Loading...')
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

// Ranking customization - factor-based like Power Rankings
const showRankingSettings = ref(false)

interface RankingFactor {
  id: string
  name: string
  description: string
  enabled: boolean
  weight: number
  icon: string
  color: string
}

const DEFAULT_ROS_FACTORS: RankingFactor[] = [
  {
    id: 'categoryRank',
    name: 'Category Rank',
    description: 'How the player ranks in this specific category based on ROS projections',
    enabled: true,
    weight: 40,
    icon: '📊',
    color: '#facc15' // yellow-400
  },
  {
    id: 'multiCategory',
    name: 'Multi-Category Value',
    description: 'Contribution across multiple scoring categories - rewards versatile players',
    enabled: true,
    weight: 25,
    icon: '🎯',
    color: '#22c55e' // green-500
  },
  {
    id: 'scarcity',
    name: 'Position Scarcity',
    description: 'Value boost for positions with fewer quality options (C, SS, RP)',
    enabled: true,
    weight: 20,
    icon: '💎',
    color: '#06b6d4' // cyan-400
  },
  {
    id: 'consistency',
    name: 'Consistency',
    description: 'How reliable and consistent the player\'s production has been',
    enabled: true,
    weight: 15,
    icon: '📈',
    color: '#a855f7' // purple-400
  }
]

const rosRankingFactors = ref<RankingFactor[]>(JSON.parse(JSON.stringify(DEFAULT_ROS_FACTORS)))

interface RankingPreset {
  id: string
  name: string
  description: string
  icon: string
  factors: Record<string, { enabled: boolean; weight: number }>
}

const rosRankingPresets: RankingPreset[] = [
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'Default balanced approach',
    icon: '⚖️',
    factors: {
      categoryRank: { enabled: true, weight: 40 },
      multiCategory: { enabled: true, weight: 25 },
      scarcity: { enabled: true, weight: 20 },
      consistency: { enabled: true, weight: 15 }
    }
  },
  {
    id: 'categoryFocused',
    name: 'Category Focused',
    description: 'Prioritize single-category dominance',
    icon: '🎯',
    factors: {
      categoryRank: { enabled: true, weight: 70 },
      multiCategory: { enabled: true, weight: 10 },
      scarcity: { enabled: true, weight: 10 },
      consistency: { enabled: true, weight: 10 }
    }
  },
  {
    id: 'versatile',
    name: 'Versatile',
    description: 'Favor players who contribute everywhere',
    icon: '🌟',
    factors: {
      categoryRank: { enabled: true, weight: 25 },
      multiCategory: { enabled: true, weight: 50 },
      scarcity: { enabled: true, weight: 15 },
      consistency: { enabled: true, weight: 10 }
    }
  },
  {
    id: 'scarcityHunter',
    name: 'Scarcity Hunter',
    description: 'Find value at thin positions',
    icon: '💎',
    factors: {
      categoryRank: { enabled: true, weight: 30 },
      multiCategory: { enabled: true, weight: 15 },
      scarcity: { enabled: true, weight: 45 },
      consistency: { enabled: true, weight: 10 }
    }
  },
  {
    id: 'reliable',
    name: 'Reliable Floor',
    description: 'Prioritize consistent performers',
    icon: '🛡️',
    factors: {
      categoryRank: { enabled: true, weight: 30 },
      multiCategory: { enabled: true, weight: 20 },
      scarcity: { enabled: true, weight: 10 },
      consistency: { enabled: true, weight: 40 }
    }
  },
  {
    id: 'simple',
    name: 'Simple Rank',
    description: 'Pure category ranking only',
    icon: '📋',
    factors: {
      categoryRank: { enabled: true, weight: 100 },
      multiCategory: { enabled: false, weight: 0 },
      scarcity: { enabled: false, weight: 0 },
      consistency: { enabled: false, weight: 0 }
    }
  }
]

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
  rosRankingFactors.value = JSON.parse(JSON.stringify(DEFAULT_ROS_FACTORS))
  currentPresetId.value = 'balanced'
  saveWeights()
}

const applyPreset = (preset: RankingPreset) => {
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
const selectedStartSitPosition = ref('C')
const currentMatchupWeek = ref(1)
const currentMatchup = ref<any>(null)
const startSitPlayerFilter = ref<'all' | 'mine' | 'fa'>('all')

// Player swap state
const swapSourcePlayer = ref<any>(null)  // Player to potentially add
const showSwapModal = ref(false)
const swapImpact = ref<any>(null)  // Calculated impact of swap
const selectedSwapTarget = ref<any>(null)  // Player on my team to drop

// Trade analyzer state
const tradePartnerKey = ref<string>('')
const tradeGivePlayer = ref<any>(null)
const tradeGetPlayer = ref<any>(null)
const tradeGiveSearch = ref('')
const tradeGetSearch = ref('')
const tradeAnalysis = ref<any>(null)

const startSitPositions = [
  { id: 'C', label: 'C' },
  { id: '1B', label: '1B' },
  { id: '2B', label: '2B' },
  { id: '3B', label: '3B' },
  { id: 'SS', label: 'SS' },
  { id: 'OF', label: 'OF' },
  { id: 'SP', label: 'SP' },
  { id: 'RP', label: 'RP' }
]

// Chart state
const chartCategory = ref<string>('')
const recentPerformances = ref<any[]>([])
const isLoadingChart = ref(false)

const defaultHeadshot = 'https://s.yimg.com/cv/apiv2/default/mlb/mlb_default_player_v2.png'
const defaultLogo = 'https://s.yimg.com/cv/apiv2/default/mlb/mlb_dp_2_72.png'

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
const pitchingStatNames = ['ERA', 'WHIP', 'W', 'SV', 'K', 'IP', 'QS', 'HLD', 'Wins', 'Saves', 'Strikeouts', 'Innings', 'Quality', 'Holds', 'L', 'Losses', 'BB', 'Walks', 'CG', 'SHO', 'BSV', 'Blown']
const ratioStatNames = ['ERA', 'WHIP', 'AVG', 'OPS', 'OBP', 'SLG', 'BABIP', 'K/9', 'BB/9', 'K/BB']
const lowerIsBetterNames = ['ERA', 'WHIP', 'BB', 'L', 'ER', 'H', 'Losses', 'Walks']

function isPitchingStat(cat: any): boolean {
  if (!cat) return false
  const name = (cat.name || '').toUpperCase()
  const display = (cat.display_name || '').toUpperCase()
  return pitchingStatNames.some(pn => name.includes(pn.toUpperCase()) || display.includes(pn.toUpperCase()))
}

function isRatioStat(cat: any): boolean {
  if (!cat) return false
  const name = (cat.name || '').toUpperCase()
  const display = (cat.display_name || '').toUpperCase()
  return ratioStatNames.some(rn => name.includes(rn.toUpperCase()) || display.includes(rn.toUpperCase()))
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

const relevantCategories = computed(() => isPitchingCategory.value ? pitchingCategories.value : hittingCategories.value)

const availablePositions = computed(() => isPitchingCategory.value ? ['SP', 'RP'] : ['C', '1B', '2B', '3B', 'SS', 'OF'])

// Helper to check if player is a pitcher
function isPitcher(player: any): boolean {
  const pos = player.position || ''
  return pos.includes('SP') || pos.includes('RP') || pos === 'P'
}

const categoryRankedPlayers = computed(() => {
  if (!selectedCategory.value) return []
  const catInfo = selectedCategoryInfo.value
  if (!catInfo) return []
  const gamesRemaining = 65, gamesPlayed = 97, statId = catInfo.stat_id
  
  // Filter players by position type
  let players = allPlayers.value.filter(p => {
    const isPlayerPitcher = isPitcher(p)
    return isPitchingCategory.value ? isPlayerPitcher : !isPlayerPitcher
  })
  
  console.log(`Filtering for ${isPitchingCategory.value ? 'pitching' : 'hitting'}: found ${players.length} players`)
  
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
    // Use custom weights, normalized to sum to 1
    const weights = rankingWeights.value
    const totalW = weights.categoryRank + weights.multiCategory + weights.scarcity + weights.consistency
    const normFactor = totalW > 0 ? 100 / totalW : 1
    const overallValue = (categoryRankScore * (weights.categoryRank / 100 * normFactor)) + 
                        (multiCatScore * (weights.multiCategory / 100 * normFactor)) + 
                        (scarcityScore * (weights.scarcity / 100 * normFactor)) + 
                        (consistencyScore * (weights.consistency / 100 * normFactor))
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
    
    // Calculate league average per week
    const relevantPlayers = allPlayers.value.filter(p => isPitchingCategory.value ? isPitcher(p) : !isPitcher(p)).slice(0, 10)
    
    for (const week of weeks) {
      const playerWeekData = weeklyStats.get(week)
      if (!playerWeekData) continue
      
      // Find the specific stat value
      const statEntry = playerWeekData.stats?.find((s: any) => s.stat?.stat_id === statId)
      const playerValue = statEntry ? parseFloat(statEntry.stat?.value || '0') : 0
      
      // Calculate league average for this week (simplified - use season avg divided by weeks)
      const allStatValues = relevantPlayers.map(p => (p.stats?.[statId] || 0) / 25).filter(v => v > 0)
      const leagueAvg = allStatValues.length > 0 ? allStatValues.reduce((a, b) => a + b, 0) / allStatValues.length : 0
      
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
  if (isRatioStat(cat)) { 
    if (value < 1 && value > 0) return value.toFixed(3).replace(/^0/, '')
    return value.toFixed(2) 
  }
  return Math.round(value).toString() 
}

function getCategoryRank(player: any, statId: string): number { 
  const value = player.stats?.[statId] || 0
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

function handleImageError(e: Event) { (e.target as HTMLImageElement).src = defaultHeadshot }
function getRowClass(player: any): string { if (isMyPlayer(player)) return 'bg-yellow-500/20 border-l-4 border-l-yellow-400'; if (isFreeAgent(player)) return 'bg-cyan-500/20 border-l-4 border-l-cyan-400'; return '' }
function getAvatarRingClass(player: any): string { if (isMyPlayer(player)) return 'ring-yellow-400 ring-offset-2 ring-offset-dark-card'; if (isFreeAgent(player)) return 'ring-cyan-400 ring-offset-2 ring-offset-dark-card'; return 'ring-dark-border' }
function getPlayerNameClass(player: any): string { if (isMyPlayer(player)) return 'text-yellow-400'; if (isFreeAgent(player)) return 'text-cyan-400'; return 'text-dark-text' }
function getPositionClass(position: string): string { const pos = position?.split(',')[0]?.trim(); const colors: Record<string, string> = { 'C': 'bg-purple-500/30 text-purple-300', '1B': 'bg-red-500/30 text-red-300', '2B': 'bg-green-500/30 text-green-300', '3B': 'bg-blue-500/30 text-blue-300', 'SS': 'bg-yellow-500/30 text-yellow-300', 'OF': 'bg-orange-500/30 text-orange-300', 'SP': 'bg-cyan-500/30 text-cyan-300', 'RP': 'bg-pink-500/30 text-pink-300' }; return colors[pos] || 'bg-dark-border text-dark-textMuted' }
function showTierBreak(player: any, index: number): boolean { if (sortColumn.value !== 'rank') return false; if (index === 0) return true; const prevPlayer = sortedPlayers.value[index - 1]; return prevPlayer && player.tier !== prevPlayer.tier }
function getTierLabel(tier: number): string { const labels: Record<number, string> = { 1: 'Tier 1: Elite', 2: 'Tier 2: Great', 3: 'Tier 3: Good', 4: 'Tier 4: Average', 5: 'Tier 5: Below Average' }; return labels[tier] || `Tier ${tier}` }
function getValueClass(value: number): string { if (value >= 80) return 'text-green-400'; if (value >= 60) return 'text-lime-400'; if (value >= 40) return 'text-yellow-400'; if (value >= 20) return 'text-orange-400'; return 'text-red-400' }
function getValueDotClass(value: number): string { if (value >= 80) return 'bg-green-400'; if (value >= 60) return 'bg-lime-400'; if (value >= 40) return 'bg-yellow-400'; if (value >= 20) return 'bg-orange-400'; return 'bg-red-400' }

const getCategoryCardClass = computed(() => isPitchingCategory.value ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-green-500/10 border-green-500/30')
const getCategoryBadgeClass = computed(() => isPitchingCategory.value ? 'bg-cyan-500/20 text-cyan-400' : 'bg-green-500/20 text-green-400')

async function loadProjections() {
  isLoading.value = true
  loadingMessage.value = 'Loading league settings...'
  try {
    const leagueKey = leagueStore.activeLeagueId
    if (!leagueKey) { loadingMessage.value = 'No league selected'; return }
    
    const settings = await yahooService.getLeagueScoringSettings(leagueKey)
    if (settings) {
      const cats = settings.stat_categories || []
      statCategories.value = cats.map((c: any) => ({ 
        stat_id: c.stat?.stat_id || c.stat_id, 
        name: c.stat?.name || c.name, 
        display_name: c.stat?.display_name || c.display_name || c.stat?.abbr || c.abbr, 
        is_only_display_stat: c.stat?.is_only_display_stat || c.is_only_display_stat 
      })).filter((c: any) => c.stat_id)
      
      console.log('Loaded categories:', statCategories.value.map(c => `${c.display_name} (${c.stat_id})`))
      console.log('Hitting categories:', hittingCategories.value.map(c => c.display_name))
      console.log('Pitching categories:', pitchingCategories.value.map(c => c.display_name))
      
      if (displayCategories.value.length > 0 && !selectedCategory.value) {
        selectedCategory.value = displayCategories.value[0].stat_id
      }
    }
    
    loadingMessage.value = 'Loading teams...'
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
    const rosteredPlayers = await yahooService.getAllRosteredPlayers(leagueKey)
    const freeAgents = await yahooService.getTopFreeAgents(leagueKey, 100)
    
    const rostered = (rosteredPlayers || []).map((p: any) => ({ 
      ...p, 
      player_key: p.player_key, 
      full_name: p.full_name || p.name || 'Unknown', 
      position: p.position || 'Util', 
      mlb_team: p.mlb_team || '', 
      headshot: p.headshot || '', 
      fantasy_team: p.fantasy_team || p.team_name, 
      fantasy_team_key: p.fantasy_team_key || p.team_key, 
      stats: p.stats || {}, 
      total_points: p.total_points || 0 
    }))
    
    // Debug: log first few rostered players to see their team keys
    if (rostered.length > 0) {
      console.log('Sample rostered players:', rostered.slice(0, 3).map(p => ({
        name: p.full_name,
        fantasy_team: p.fantasy_team,
        fantasy_team_key: p.fantasy_team_key
      })))
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
      headshot: p.headshot || '', 
      fantasy_team: null, 
      fantasy_team_key: null, 
      stats: p.stats || {}, 
      total_points: p.total_points || 0 
    }))
    
    allPlayers.value = [...rostered, ...fas]
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
  loadProjections()
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

// Computed: Matchup category wins/losses/ties (simulated)
const matchupCategoryStatus = computed(() => {
  const status: Record<string, { myValue: number, oppValue: number, status: 'winning' | 'losing' | 'tied' | 'close' }> = {}
  
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
  const isPitching = ['SP', 'RP'].includes(selectedStartSitPosition.value)
  return isPitching ? pitchingCategories.value : hittingCategories.value
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
  const value = parseFloat(player.stats?.[cat.stat_id] || 0)
  if (value <= 0) return 'text-dark-textMuted'
  
  const status = matchupCategoryStatus.value[cat.stat_id]?.status
  if (status === 'losing' || status === 'close') return 'text-yellow-400'
  return 'text-dark-text'
}

function formatCategoryProjection(player: any, cat: any): string {
  const seasonValue = parseFloat(player.stats?.[cat.stat_id] || 0)
  if (seasonValue <= 0) return '-'
  
  const games = startSitMode.value === 'daily' ? 1 : (player.gamesThisWeek || 4)
  const gamesPlayed = isPitcher(player) ? 30 : 140
  const perGame = seasonValue / gamesPlayed
  const projected = perGame * games
  
  if (isRatioStat(cat)) {
    if (projected < 1) return projected.toFixed(3).replace(/^0/, '')
    return projected.toFixed(2)
  }
  return projected.toFixed(1)
}

function getCategoryPerGame(player: any, cat: any): string {
  const seasonValue = parseFloat(player.stats?.[cat.stat_id] || 0)
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
  
  let total = 0
  for (const player of players) {
    const seasonValue = parseFloat(player.stats?.[cat.stat_id] || 0)
    const games = startSitMode.value === 'daily' ? 1 : (player.gamesThisWeek || 4)
    const gamesPlayed = isPitcher(player) ? 30 : 140
    const perGame = seasonValue / gamesPlayed
    total += perGame * games
  }
  
  if (isRatioStat(cat)) return total.toFixed(2)
  return total.toFixed(1)
}

function getStartSitPositionClass(position: string): string {
  const colors: Record<string, string> = {
    'C': 'bg-purple-500/30 text-purple-300',
    '1B': 'bg-red-500/30 text-red-300',
    '2B': 'bg-green-500/30 text-green-300',
    '3B': 'bg-blue-500/30 text-blue-300',
    'SS': 'bg-yellow-500/30 text-yellow-300',
    'OF': 'bg-orange-500/30 text-orange-300',
    'SP': 'bg-cyan-500/30 text-cyan-300',
    'RP': 'bg-pink-500/30 text-pink-300'
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

function openSwapModal(player: any) {
  swapSourcePlayer.value = player
  selectedSwapTarget.value = null
  swapImpact.value = null
  showSwapModal.value = true
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

// My players for trade selection (filtered)
const filteredMyPlayersForTrade = computed(() => {
  const myPlayers = allPlayers.value.filter(p => p.fantasy_team_key === myTeamKey.value)
  if (!tradeGiveSearch.value) return myPlayers.sort((a, b) => (b.overallValue || 0) - (a.overallValue || 0))
  const search = tradeGiveSearch.value.toLowerCase()
  return myPlayers.filter(p => 
    p.full_name?.toLowerCase().includes(search) ||
    p.position?.toLowerCase().includes(search) ||
    p.mlb_team?.toLowerCase().includes(search)
  ).sort((a, b) => (b.overallValue || 0) - (a.overallValue || 0))
})

// Trade partner's players (filtered)
const filteredPartnerPlayersForTrade = computed(() => {
  if (!tradePartnerKey.value) return []
  const partnerPlayers = allPlayers.value.filter(p => p.fantasy_team_key === tradePartnerKey.value)
  if (!tradeGetSearch.value) return partnerPlayers.sort((a, b) => (b.overallValue || 0) - (a.overallValue || 0))
  const search = tradeGetSearch.value.toLowerCase()
  return partnerPlayers.filter(p => 
    p.full_name?.toLowerCase().includes(search) ||
    p.position?.toLowerCase().includes(search) ||
    p.mlb_team?.toLowerCase().includes(search)
  ).sort((a, b) => (b.overallValue || 0) - (a.overallValue || 0))
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

function resetTrade() {
  tradeGivePlayer.value = null
  tradeGetPlayer.value = null
  tradePartnerKey.value = ''
  tradeGiveSearch.value = ''
  tradeGetSearch.value = ''
  tradeAnalysis.value = null
}

function analyzeTrade() {
  if (!tradeGivePlayer.value || !tradeGetPlayer.value) return
  
  const give = tradeGivePlayer.value
  const get = tradeGetPlayer.value
  
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
    
    const giveValue = parseFloat(give.stats?.[statId] || 0)
    const getValue = parseFloat(get.stats?.[statId] || 0)
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
  const { newPowerRank, balanceBefore, balanceAfter, starPowerBefore, starPowerAfter, depthBefore, depthAfter } = calculateNewPowerRank(give, get)
  
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
  const valueGrade = calculateValueGrade(give, get)
  const balanceGrade = calculateBalanceGrade(balanceAfter - balanceBefore)
  const scarcityGrade = calculateScarcityGrade(give, get)
  const overallGrade = calculateOverallTradeGrade(categoryGrade, valueGrade, balanceGrade, scarcityGrade)
  
  // Generate analysis text
  const { headline, summary, strengths, concerns, recommendation, bottomLine } = generateTradeAnalysis(
    give, get, categoryImpact, categoriesUp, categoriesDown, 
    currentPowerRank, newPowerRank, balanceAfter - balanceBefore
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

function calculateNewPowerRank(give: any, get: any): { newPowerRank: number; balanceBefore: number; balanceAfter: number; starPowerBefore: number; starPowerAfter: number; depthBefore: number; depthAfter: number } {
  const myTeam = teamsData.value.find(t => t.team_key === myTeamKey.value)
  const totalTeams = teamsData.value.length
  
  // Calculate balance score (how evenly distributed ranks are)
  const currentRanks = Object.values(myTeam?.categoryRanks || {}) as number[]
  const avgRank = currentRanks.reduce((a, b) => a + b, 0) / currentRanks.length
  const variance = currentRanks.reduce((sum, r) => sum + Math.pow(r - avgRank, 2), 0) / currentRanks.length
  const balanceBefore = Math.max(0, 100 - variance * 3)
  
  // Estimate new balance after trade
  const balanceAfter = balanceBefore + (give.overallValue > get.overallValue ? -5 : 5) + Math.random() * 10 - 5
  
  // Star power (based on elite player count)
  const myPlayers = allPlayers.value.filter(p => p.fantasy_team_key === myTeamKey.value)
  const eliteCount = myPlayers.filter(p => (p.overallValue || 0) > 70).length
  const starPowerBefore = Math.min(100, eliteCount * 15)
  
  // After trade star power
  const giveIsElite = (give.overallValue || 0) > 70
  const getIsElite = (get.overallValue || 0) > 70
  let starPowerAfter = starPowerBefore
  if (giveIsElite && !getIsElite) starPowerAfter -= 15
  if (!giveIsElite && getIsElite) starPowerAfter += 15
  
  // Depth (based on roster quality distribution)
  const depthBefore = Math.min(100, myPlayers.filter(p => (p.overallValue || 0) > 40).length * 8)
  const depthAfter = depthBefore + ((get.overallValue || 0) - (give.overallValue || 0)) * 0.5
  
  // Calculate overall score change
  const scoreBefore = (balanceBefore + starPowerBefore + depthBefore) / 3
  const scoreAfter = (Math.max(0, Math.min(100, balanceAfter)) + Math.max(0, Math.min(100, starPowerAfter)) + Math.max(0, Math.min(100, depthAfter))) / 3
  const scoreDiff = scoreAfter - scoreBefore
  
  // Estimate new rank (simplified)
  const currentRank = calculateCurrentPowerRank()
  let newRank = currentRank
  if (scoreDiff > 5) newRank = Math.max(1, currentRank - 1)
  if (scoreDiff > 10) newRank = Math.max(1, currentRank - 2)
  if (scoreDiff < -5) newRank = Math.min(totalTeams, currentRank + 1)
  if (scoreDiff < -10) newRank = Math.min(totalTeams, currentRank + 2)
  
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
  
  if (net >= 4 || significantChanges >= 3) return 'A'
  if (net >= 2 || significantChanges >= 2) return 'B+'
  if (net >= 1) return 'B'
  if (net === 0) return 'C'
  if (net >= -1) return 'C-'
  if (net >= -2) return 'D'
  return 'F'
}

function calculateValueGrade(give: any, get: any): string {
  const giveValue = give.overallValue || 50
  const getValue = get.overallValue || 50
  const diff = getValue - giveValue
  
  if (diff >= 15) return 'A'
  if (diff >= 10) return 'A-'
  if (diff >= 5) return 'B+'
  if (diff >= 0) return 'B'
  if (diff >= -5) return 'B-'
  if (diff >= -10) return 'C'
  if (diff >= -15) return 'D'
  return 'F'
}

function calculateBalanceGrade(balanceChange: number): string {
  if (balanceChange >= 10) return 'A'
  if (balanceChange >= 5) return 'B+'
  if (balanceChange >= 0) return 'B'
  if (balanceChange >= -5) return 'C'
  if (balanceChange >= -10) return 'D'
  return 'F'
}

function calculateScarcityGrade(give: any, get: any): string {
  // Check position scarcity
  const scarcePositions = ['C', 'SS', '2B']
  const givePos = give.position?.split(',')[0] || ''
  const getPos = get.position?.split(',')[0] || ''
  
  const givingScarce = scarcePositions.some(p => givePos.includes(p))
  const gettingScarce = scarcePositions.some(p => getPos.includes(p))
  
  if (gettingScarce && !givingScarce) return 'A'
  if (!gettingScarce && !givingScarce) return 'B'
  if (gettingScarce && givingScarce) return 'B-'
  if (!gettingScarce && givingScarce) return 'C'
  return 'C'
}

function calculateOverallTradeGrade(catGrade: string, valGrade: string, balGrade: string, scarGrade: string): string {
  const gradeToNum = (g: string): number => {
    const grades: Record<string, number> = { 'A+': 97, 'A': 93, 'A-': 90, 'B+': 87, 'B': 83, 'B-': 80, 'C+': 77, 'C': 73, 'C-': 70, 'D+': 67, 'D': 63, 'D-': 60, 'F': 50 }
    return grades[g] || 73
  }
  
  const numToGrade = (n: number): string => {
    if (n >= 95) return 'A+'
    if (n >= 90) return 'A'
    if (n >= 87) return 'A-'
    if (n >= 83) return 'B+'
    if (n >= 80) return 'B'
    if (n >= 77) return 'B-'
    if (n >= 73) return 'C+'
    if (n >= 70) return 'C'
    if (n >= 67) return 'C-'
    if (n >= 63) return 'D+'
    if (n >= 60) return 'D'
    if (n >= 55) return 'D-'
    return 'F'
  }
  
  // Weighted average: Category 30%, Value 25%, Balance 25%, Scarcity 20%
  const score = gradeToNum(catGrade) * 0.30 + gradeToNum(valGrade) * 0.25 + gradeToNum(balGrade) * 0.25 + gradeToNum(scarGrade) * 0.20
  return numToGrade(score)
}

function generateTradeAnalysis(give: any, get: any, categoryImpact: any[], catsUp: number, catsDown: number, rankBefore: number, rankAfter: number, balanceChange: number): { headline: string; summary: string; strengths: string[]; concerns: string[]; recommendation: 'accept' | 'decline' | 'consider'; bottomLine: string } {
  const strengths: string[] = []
  const concerns: string[] = []
  
  const giveValue = give.overallValue || 50
  const getValue = get.overallValue || 50
  const valueDiff = getValue - giveValue
  
  // Analyze value
  if (valueDiff > 10) {
    strengths.push(`Getting ${Math.round(valueDiff)} more player value points`)
  } else if (valueDiff < -10) {
    concerns.push(`Giving up ${Math.round(Math.abs(valueDiff))} player value points`)
  }
  
  // Analyze categories
  if (catsUp > catsDown) {
    strengths.push(`Improves ${catsUp} categories vs hurts ${catsDown}`)
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
  const givePos = give.position || ''
  const getPos = get.position || ''
  if (getPos.includes('C') || getPos.includes('SS')) {
    strengths.push(`${get.full_name} plays a premium position (${getPos})`)
  }
  if (givePos.includes('C') || givePos.includes('SS')) {
    concerns.push(`Giving up scarce position eligibility (${givePos})`)
  }
  
  // Generate headline and summary
  let headline = ''
  let summary = ''
  let recommendation: 'accept' | 'decline' | 'consider' = 'consider'
  let bottomLine = ''
  
  const netScore = (catsUp - catsDown) + (valueDiff / 10) + balanceChange / 5
  
  if (netScore >= 3) {
    headline = 'Strong Trade for You'
    summary = `This trade significantly improves your team across multiple dimensions. ${get.full_name} brings more value and helps balance your roster.`
    recommendation = 'accept'
    bottomLine = 'This is a favorable deal - you should strongly consider making this trade.'
  } else if (netScore >= 1) {
    headline = 'Slight Win for You'
    summary = `This trade provides modest improvement to your team. You gain some category production while maintaining competitive balance.`
    recommendation = 'accept'
    bottomLine = 'The trade is in your favor, though not by a huge margin.'
  } else if (netScore >= -1) {
    headline = 'Roughly Even Trade'
    summary = `This is a fair exchange that could work depending on your specific needs. Consider what categories matter most for your playoff push.`
    recommendation = 'consider'
    bottomLine = 'This is close to a fair trade - evaluate based on your specific team needs.'
  } else if (netScore >= -3) {
    headline = 'Slight Loss for You'
    summary = `You may be giving up a bit more than you\'re getting back. Make sure this addresses a critical need.`
    recommendation = 'consider'
    bottomLine = 'You\'re likely overpaying slightly - only do this if you really need what you\'re getting.'
  } else {
    headline = 'Unfavorable Trade'
    summary = `This trade would likely hurt your team. You\'re giving up significant value without adequate return.`
    recommendation = 'decline'
    bottomLine = 'This trade is not recommended - look for a better deal.'
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
  const myPlayers = allPlayers.value.filter(p => p.fantasy_team_key === myTeamKey.value)
  
  // Standard lineup positions
  const lineupOrder = ['C', '1B', '2B', '3B', 'SS', 'OF', 'OF', 'OF', 'Util', 'SP', 'SP', 'RP', 'RP']
  
  for (const pos of lineupOrder) {
    let eligible = myPlayers.filter(p => {
      if (used.has(p.player_key)) return false
      const playerPos = p.position || ''
      if (pos === 'Util') return !playerPos.includes('SP') && !playerPos.includes('RP')
      if (pos === 'OF') return playerPos.includes('OF') || playerPos.includes('LF') || playerPos.includes('CF') || playerPos.includes('RF')
      return playerPos.includes(pos)
    })
    
    // Add game info and impact score
    eligible = eligible.map(p => {
      const hasGame = Math.random() > 0.2
      const impactCats = getImpactCategoryCount(p)
      return { ...p, hasGame, impactCats, impactScore: calculatePlayerImpact(p) }
    })
    
    // Filter by game availability in daily mode
    if (startSitMode.value === 'daily') {
      eligible = eligible.filter(p => p.hasGame)
    }
    
    // Sort by impact score
    eligible.sort((a, b) => b.impactScore - a.impactScore)
    
    const best = eligible[0] || null
    if (best) {
      used.add(best.player_key)
      best.opponent = ['vs NYY', 'vs BOS', '@ LAD', '@ CHC', 'vs HOU'][Math.floor(Math.random() * 5)]
      best.gamesThisWeek = Math.floor(Math.random() * 3) + 4
    }
    
    slots.push({ position: pos, player: best })
  }
  
  return slots
})

const suggestedLineupPlayerCount = computed(() => {
  return suggestedCategoryLineup.value.filter(s => s.player).length
})

// Projected category totals with lineup
const projectedCategoryTotals = computed(() => {
  const totals: Record<string, { my: number; opp: number }> = {}
  
  for (const cat of displayCategories.value) {
    const statId = cat.stat_id
    const currentStatus = matchupCategoryStatus.value[statId]
    
    // Start with current matchup values
    let myTotal = currentStatus?.myValue || 0
    let oppTotal = currentStatus?.oppValue || 0
    
    // Add projected contributions from lineup
    for (const slot of suggestedCategoryLineup.value) {
      if (slot.player) {
        const playerValue = parseFloat(slot.player.stats?.[statId] || 0)
        const gamesPlayed = isPitcher(slot.player) ? 30 : 140
        const perGame = playerValue / gamesPlayed
        const games = startSitMode.value === 'daily' ? 1 : (slot.player.gamesThisWeek || 4)
        myTotal += perGame * games * 0.3 // Scale factor for daily projection
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
onMounted(() => { loadSavedWeights(); loadProjections() })
</script>
