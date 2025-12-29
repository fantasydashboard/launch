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
          <span :class="{ 'animate-spin': isLoading }">🔄</span> Refresh
        </button>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="flex items-center gap-2 border-b border-dark-border pb-2">
      <button 
        @click="activeTab = 'ros'"
        :class="activeTab === 'ros' ? 'bg-primary text-gray-900' : 'bg-dark-card text-dark-textMuted hover:bg-dark-border'"
        class="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
      >
        <span>📊</span> Rest of Season
      </button>
      <button 
        @click="activeTab = 'teams'"
        :class="activeTab === 'teams' ? 'bg-primary text-gray-900' : 'bg-dark-card text-dark-textMuted hover:bg-dark-border'"
        class="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
      >
        <span>👥</span> Teams
      </button>
      <button 
        @click="activeTab = 'startsit'"
        :class="activeTab === 'startsit' ? 'bg-primary text-gray-900' : 'bg-dark-card text-dark-textMuted hover:bg-dark-border'"
        class="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
      >
        <span>🎯</span> Start/Sit
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
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
                :class="selectedCategory === cat.stat_id ? 'bg-primary text-gray-900' : 'bg-dark-border/50 text-dark-textSecondary hover:bg-dark-border'"
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
            :class="selectedPositions.includes(pos) ? 'bg-primary/20 text-primary border-primary' : 'bg-dark-card text-dark-textMuted border-dark-border hover:border-dark-textMuted'"
            class="px-3 py-1 text-sm rounded-lg border transition-all"
          >{{ pos }}</button>
          <button @click="selectAllPositions" class="text-xs text-primary hover:underline ml-2">All</button>
        </div>
        <div class="flex items-center gap-3 ml-auto">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" v-model="showOnlyMyPlayers" class="w-4 h-4 rounded border-dark-border bg-dark-card text-primary" />
            <span class="text-sm text-dark-textMuted">My Players</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" v-model="showOnlyFreeAgents" class="w-4 h-4 rounded border-dark-border bg-dark-card text-cyan-400" />
            <span class="text-sm text-dark-textMuted">Free Agents</span>
          </label>
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
                  <th class="px-3 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase w-14 cursor-pointer hover:text-primary" @click="toggleSort('rank')" :title="columnTooltips.rank">
                    <div class="flex items-center gap-1">Rank <span v-if="sortColumn === 'rank'" class="text-primary">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span></div>
                  </th>
                  <th class="px-3 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase cursor-pointer hover:text-primary" @click="toggleSort('name')" :title="columnTooltips.player">
                    <div class="flex items-center gap-1">Player <span v-if="sortColumn === 'name'" class="text-primary">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span></div>
                  </th>
                  <th class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-14 cursor-pointer hover:text-primary" @click="toggleSort('position')" :title="columnTooltips.position">
                    <div class="flex items-center justify-center gap-1">Pos <span v-if="sortColumn === 'position'" class="text-primary">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span></div>
                  </th>
                  <th class="px-2 py-3 text-center text-xs font-semibold uppercase w-20 cursor-pointer hover:text-primary" @click="toggleSort('projected')" :title="columnTooltips.rosProj">
                    <div class="flex items-center justify-center gap-1"><span class="text-primary">ROS Proj</span> <span v-if="sortColumn === 'projected'" class="text-primary">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span></div>
                  </th>
                  <th class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-16 cursor-pointer hover:text-primary" @click="toggleSort('current')" :title="columnTooltips.current">
                    <div class="flex items-center justify-center gap-1">Current <span v-if="sortColumn === 'current'" class="text-primary">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span></div>
                  </th>
                  <th class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-16 cursor-pointer hover:text-primary" @click="toggleSort('perGame')" :title="columnTooltips.perGame">
                    <div class="flex items-center justify-center gap-1">Per Game <span v-if="sortColumn === 'perGame'" class="text-primary">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span></div>
                  </th>
                  <th class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-24 cursor-pointer hover:text-primary" @click="toggleSort('value')" :title="columnTooltips.value">
                    <div class="flex items-center justify-center gap-1">Value <span class="text-dark-textMuted/50 text-[10px]">ⓘ</span> <span v-if="sortColumn === 'value'" class="text-primary">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span></div>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-dark-border/30">
                <template v-for="(player, idx) in sortedPlayers" :key="player.player_key">
                  <!-- Tier Break -->
                  <tr v-if="showTierBreak(player, idx)" class="bg-dark-border/10">
                    <td colspan="7" class="px-4 py-2">
                      <div class="flex items-center gap-2">
                        <div class="h-px flex-1 bg-primary/30"></div>
                        <span class="text-xs font-bold text-primary uppercase tracking-wider">{{ getTierLabel(player.tier) }}</span>
                        <div class="h-px flex-1 bg-primary/30"></div>
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
                      <span class="text-lg font-bold text-primary">{{ formatStatValue(player.projectedValue) }}</span>
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
                  <!-- Expanded Player Detail -->
                  <tr v-if="expandedPlayerKey === player.player_key" class="bg-dark-bg/80">
                    <td colspan="7" class="p-0">
                      <div class="p-4 space-y-4 border-y border-primary/30">
                        <div class="flex items-start justify-between">
                          <div class="flex items-center gap-4">
                            <div class="w-16 h-16 rounded-full bg-dark-border overflow-hidden ring-2" :class="getAvatarRingClass(player)">
                              <img :src="player.headshot || defaultHeadshot" :alt="player.full_name" class="w-full h-full object-cover" @error="handleImageError" />
                            </div>
                            <div>
                              <h3 class="text-xl font-bold text-dark-text">{{ player.full_name }}</h3>
                              <div class="flex items-center gap-3 text-sm text-dark-textMuted">
                                <span class="px-2 py-0.5 rounded text-xs font-bold" :class="getPositionClass(player.position)">{{ player.position }}</span>
                                <span>{{ player.mlb_team || 'FA' }}</span>
                                <span v-if="player.fantasy_team">• {{ player.fantasy_team }}</span>
                              </div>
                            </div>
                          </div>
                          <button @click.stop="expandedPlayerKey = null" class="p-2 hover:bg-dark-border/50 rounded-lg transition-colors">
                            <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                        
                        <!-- Stats Grid -->
                        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                          <div class="bg-dark-card rounded-lg p-3 text-center">
                            <div class="text-2xl font-bold text-primary">#{{ player.categoryRank }}</div>
                            <div class="text-xs text-dark-textMuted">{{ selectedCategoryInfo?.display_name }} Rank</div>
                          </div>
                          <div class="bg-dark-card rounded-lg p-3 text-center">
                            <div class="text-2xl font-bold text-dark-text">{{ formatStatValue(player.projectedValue) }}</div>
                            <div class="text-xs text-dark-textMuted">ROS Projection</div>
                          </div>
                          <div class="bg-dark-card rounded-lg p-3 text-center">
                            <div class="text-2xl font-bold text-dark-text">{{ formatStatValue(player.currentValue) }}</div>
                            <div class="text-xs text-dark-textMuted">Current Season</div>
                          </div>
                          <div class="bg-dark-card rounded-lg p-3 text-center">
                            <div class="text-2xl font-bold text-dark-text">{{ formatStatValue(player.perGameValue, 3) }}</div>
                            <div class="text-xs text-dark-textMuted">Per Game Avg</div>
                          </div>
                          <div class="bg-dark-card rounded-lg p-3 text-center">
                            <div class="text-2xl font-bold" :class="getValueClass(player.overallValue)">{{ player.overallValue?.toFixed(1) }}</div>
                            <div class="text-xs text-dark-textMuted">Overall Value</div>
                          </div>
                          <div class="bg-dark-card rounded-lg p-3 text-center">
                            <div class="text-2xl font-bold text-dark-text">{{ player.categoriesContributing || 0 }}/{{ relevantCategories.length }}</div>
                            <div class="text-xs text-dark-textMuted">Multi-Cat Score</div>
                          </div>
                        </div>

                        <!-- Recent Performance Line Chart -->
                        <div class="bg-dark-card rounded-xl p-4">
                          <div class="flex items-center justify-between mb-4">
                            <h4 class="font-semibold text-dark-text flex items-center gap-2">
                              <span>📈</span> Last 5 Performances vs League Average
                            </h4>
                            <select v-model="chartCategory" class="select bg-dark-border border-dark-border text-dark-text px-3 py-1.5 rounded-lg text-sm">
                              <option v-for="cat in relevantCategories" :key="cat.stat_id" :value="cat.stat_id">
                                {{ cat.display_name }}
                              </option>
                            </select>
                          </div>
                          
                          <div v-if="isLoadingChart" class="h-56 flex items-center justify-center">
                            <div class="text-dark-textMuted text-sm animate-pulse">Loading performance data...</div>
                          </div>
                          <div v-else-if="recentPerformances.length > 0" class="space-y-4">
                            <!-- SVG Line Chart -->
                            <div class="h-56 relative">
                              <svg class="w-full h-full" viewBox="0 0 400 180" preserveAspectRatio="xMidYMid meet">
                                <!-- Grid lines -->
                                <g class="grid-lines">
                                  <line v-for="i in 5" :key="'h'+i" 
                                    :x1="50" :x2="380" 
                                    :y1="20 + (i-1) * 35" :y2="20 + (i-1) * 35" 
                                    stroke="#374151" stroke-width="1" stroke-dasharray="4,4" opacity="0.3"/>
                                </g>
                                
                                <!-- Y-axis labels -->
                                <g class="y-labels" fill="#9CA3AF" font-size="10">
                                  <text x="45" y="25" text-anchor="end">{{ chartYMax.toFixed(1) }}</text>
                                  <text x="45" y="95" text-anchor="end">{{ (chartYMax / 2).toFixed(1) }}</text>
                                  <text x="45" y="165" text-anchor="end">0</text>
                                </g>
                                
                                <!-- League Average Line (Yellow) -->
                                <polyline
                                  :points="leagueAvgLinePoints"
                                  fill="none"
                                  stroke="#EAB308"
                                  stroke-width="2"
                                  stroke-dasharray="6,4"
                                  opacity="0.8"
                                />
                                
                                <!-- Player Performance Line (Primary/Gold) -->
                                <polyline
                                  :points="playerLinePoints"
                                  fill="none"
                                  stroke="#F59E0B"
                                  stroke-width="3"
                                />
                                
                                <!-- Data points for player -->
                                <g v-for="(perf, idx) in recentPerformances" :key="'p'+idx">
                                  <circle
                                    :cx="getChartX(idx)"
                                    :cy="getChartY(perf.playerValue)"
                                    r="6"
                                    fill="#F59E0B"
                                    stroke="#1F2937"
                                    stroke-width="2"
                                  />
                                  <!-- Value label above point -->
                                  <text
                                    :x="getChartX(idx)"
                                    :y="getChartY(perf.playerValue) - 12"
                                    fill="#F59E0B"
                                    font-size="10"
                                    font-weight="bold"
                                    text-anchor="middle"
                                  >{{ perf.playerValue.toFixed(1) }}</text>
                                </g>
                                
                                <!-- Data points for league avg -->
                                <g v-for="(perf, idx) in recentPerformances" :key="'l'+idx">
                                  <circle
                                    :cx="getChartX(idx)"
                                    :cy="getChartY(perf.leagueAvg)"
                                    r="4"
                                    fill="#EAB308"
                                    stroke="#1F2937"
                                    stroke-width="2"
                                    opacity="0.8"
                                  />
                                </g>
                                
                                <!-- X-axis date labels -->
                                <g class="x-labels" fill="#9CA3AF" font-size="9">
                                  <text 
                                    v-for="(perf, idx) in recentPerformances" 
                                    :key="'d'+idx"
                                    :x="getChartX(idx)"
                                    y="178"
                                    text-anchor="middle"
                                  >{{ perf.date }}</text>
                                </g>
                              </svg>
                            </div>
                            
                            <!-- Legend -->
                            <div class="flex items-center justify-center gap-6 text-xs">
                              <div class="flex items-center gap-2">
                                <div class="w-4 h-1 bg-amber-500 rounded"></div>
                                <span class="text-dark-textMuted">{{ player.full_name?.split(' ').pop() }}</span>
                              </div>
                              <div class="flex items-center gap-2">
                                <div class="w-4 h-0.5 border-t-2 border-dashed border-yellow-500"></div>
                                <span class="text-dark-textMuted">League Avg (same dates)</span>
                              </div>
                            </div>
                            
                            <!-- Performance Summary -->
                            <div class="grid grid-cols-3 gap-3 pt-2 border-t border-dark-border">
                              <div class="text-center">
                                <div class="text-lg font-bold" :class="playerAvgVsLeague >= 0 ? 'text-green-400' : 'text-red-400'">
                                  {{ playerAvgVsLeague >= 0 ? '+' : '' }}{{ playerAvgVsLeague.toFixed(1) }}
                                </div>
                                <div class="text-[10px] text-dark-textMuted">vs League Avg</div>
                              </div>
                              <div class="text-center">
                                <div class="text-lg font-bold text-primary">{{ playerRecentAvg.toFixed(1) }}</div>
                                <div class="text-[10px] text-dark-textMuted">Player Avg (5 games)</div>
                              </div>
                              <div class="text-center">
                                <div class="text-lg font-bold text-yellow-500">{{ leagueRecentAvg.toFixed(1) }}</div>
                                <div class="text-[10px] text-dark-textMuted">League Avg (5 games)</div>
                              </div>
                            </div>
                          </div>
                          <div v-else class="h-56 flex items-center justify-center text-dark-textMuted text-sm">
                            No recent performance data available
                          </div>
                        </div>

                        <!-- All Category Stats & Value Breakdown -->
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div class="bg-dark-card rounded-xl p-4">
                            <h4 class="font-semibold text-dark-text mb-3 flex items-center gap-2"><span>📊</span> All {{ isPitchingCategory ? 'Pitching' : 'Hitting' }} Categories</h4>
                            <!-- Header Row -->
                            <div class="flex items-center text-xs text-dark-textMuted uppercase tracking-wider mb-2 px-3">
                              <div class="flex-1">Category</div>
                              <div class="w-24 text-center">Season</div>
                              <div class="w-px h-4 bg-dark-border mx-2"></div>
                              <div class="w-24 text-center">{{ isPitcher(player) ? 'Last 4' : 'Last 10' }}</div>
                            </div>
                            <div class="space-y-1 max-h-72 overflow-y-auto">
                              <div v-for="cat in relevantCategories" :key="cat.stat_id" 
                                class="flex items-center py-2 px-3 rounded-lg" 
                                :class="cat.stat_id === selectedCategory ? 'bg-primary/20 border border-primary/30' : 'bg-dark-border/30'">
                                <!-- Category Name -->
                                <div class="flex-1">
                                  <span class="text-sm text-dark-text font-medium">{{ cat.display_name }}</span>
                                </div>
                                <!-- Season Stats -->
                                <div class="w-24 flex items-center justify-end gap-2">
                                  <span class="text-sm font-bold" :class="cat.stat_id === selectedCategory ? 'text-primary' : 'text-dark-text'">
                                    {{ formatCategoryStat(player, cat.stat_id) }}
                                  </span>
                                  <span class="text-[10px] px-1.5 py-0.5 rounded" :class="getCategoryRankClass(player, cat.stat_id)">
                                    #{{ getCategoryRank(player, cat.stat_id) }}
                                  </span>
                                </div>
                                <!-- Vertical Divider -->
                                <div class="w-px h-8 bg-dark-border mx-3"></div>
                                <!-- Recent Stats -->
                                <div class="w-24 flex items-center justify-end gap-2">
                                  <span class="text-sm font-bold text-cyan-400">
                                    {{ getRecentStat(player, cat.stat_id) }}
                                  </span>
                                  <span class="text-[10px] px-1.5 py-0.5 rounded" :class="getRecentRankClass(player, cat.stat_id)">
                                    #{{ getRecentRank(player, cat.stat_id) }}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <!-- Legend -->
                            <div class="flex items-center justify-end gap-4 mt-3 pt-2 border-t border-dark-border text-[10px] text-dark-textMuted">
                              <span>Season totals</span>
                              <div class="w-px h-3 bg-dark-border"></div>
                              <span class="text-cyan-400">Recent performance</span>
                            </div>
                          </div>
                          <div class="bg-dark-card rounded-xl p-4">
                            <h4 class="font-semibold text-dark-text mb-3 flex items-center gap-2"><span>💎</span> Value Score Breakdown</h4>
                            <div class="space-y-4">
                              <div>
                                <div class="flex justify-between text-sm mb-1"><span class="text-dark-textMuted">Category Rank (40%)</span><span class="text-dark-text font-medium">{{ ((1 - (player.categoryRank - 1) / Math.max(filteredPlayers.length, 1)) * 100).toFixed(0) }}</span></div>
                                <div class="h-2 bg-dark-border rounded-full overflow-hidden"><div class="h-full bg-primary rounded-full" :style="{ width: `${(1 - (player.categoryRank - 1) / Math.max(filteredPlayers.length, 1)) * 100}%` }"></div></div>
                              </div>
                              <div>
                                <div class="flex justify-between text-sm mb-1"><span class="text-dark-textMuted">Multi-Category (25%)</span><span class="text-dark-text font-medium">{{ ((player.categoriesContributing || 0) / Math.max(relevantCategories.length, 1) * 100).toFixed(0) }}</span></div>
                                <div class="h-2 bg-dark-border rounded-full overflow-hidden"><div class="h-full bg-green-500 rounded-full" :style="{ width: `${(player.categoriesContributing || 0) / Math.max(relevantCategories.length, 1) * 100}%` }"></div></div>
                              </div>
                              <div>
                                <div class="flex justify-between text-sm mb-1"><span class="text-dark-textMuted">Position Scarcity (20%)</span><span class="text-dark-text font-medium">{{ player.scarcityScore || 50 }}</span></div>
                                <div class="h-2 bg-dark-border rounded-full overflow-hidden"><div class="h-full bg-yellow-500 rounded-full" :style="{ width: `${player.scarcityScore || 50}%` }"></div></div>
                              </div>
                              <div>
                                <div class="flex justify-between text-sm mb-1"><span class="text-dark-textMuted">Consistency (15%)</span><span class="text-dark-text font-medium">50</span></div>
                                <div class="h-2 bg-dark-border rounded-full overflow-hidden"><div class="h-full bg-cyan-500 rounded-full" style="width: 50%"></div></div>
                              </div>
                              <div class="border-t border-dark-border pt-3 mt-3">
                                <p class="text-xs text-dark-textMuted leading-relaxed"><strong class="text-dark-text">Value Score</strong> measures overall fantasy value: category rank, multi-category contribution, positional scarcity, and consistency.</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <!-- Pitcher Info -->
                        <div v-if="isPitcher(player)" class="bg-dark-card rounded-xl p-4">
                          <h4 class="font-semibold text-dark-text mb-3 flex items-center gap-2"><span>📅</span> Pitcher Info</h4>
                          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div class="text-center p-3 rounded-lg bg-dark-border/30">
                              <div class="text-2xl font-bold text-primary">~{{ player.position?.includes('SP') ? '13' : '25' }}</div>
                              <div class="text-xs text-dark-textMuted">{{ player.position?.includes('SP') ? 'Est. ROS Starts' : 'Est. ROS Apps' }}</div>
                            </div>
                            <div class="text-center p-3 rounded-lg bg-dark-border/30">
                              <div class="text-2xl font-bold text-dark-text">{{ formatCategoryStat(player, '50') || '-' }}</div>
                              <div class="text-xs text-dark-textMuted">Innings Pitched</div>
                            </div>
                            <div class="text-center p-3 rounded-lg bg-dark-border/30">
                              <div class="text-2xl font-bold text-dark-text">{{ formatCategoryStat(player, '42') || '-' }}</div>
                              <div class="text-xs text-dark-textMuted">Strikeouts</div>
                            </div>
                            <div class="text-center p-3 rounded-lg bg-dark-border/30">
                              <div class="text-2xl font-bold text-dark-text">{{ formatCategoryStat(player, player.position?.includes('SP') ? '28' : '32') || '-' }}</div>
                              <div class="text-xs text-dark-textMuted">{{ player.position?.includes('SP') ? 'Wins' : 'Saves' }}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                </template>
                <tr v-if="sortedPlayers.length === 0"><td colspan="7" class="px-4 py-8 text-center text-dark-textMuted">No players match filters</td></tr>
              </tbody>
            </table>
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
              <div class="text-3xl font-black text-primary">{{ formatStatValue(myTeamProjectedTotal) }}</div>
            </div>
            <div class="text-center p-4 rounded-xl bg-dark-border/20">
              <div class="text-sm text-dark-textMuted mb-1">League Rank</div>
              <div class="text-3xl font-black" :class="myTeamRank <= 3 ? 'text-green-400' : myTeamRank >= 10 ? 'text-red-400' : 'text-dark-text'">#{{ myTeamRank }}</div>
            </div>
            <div class="text-center p-4 rounded-xl bg-dark-border/20">
              <div class="text-sm text-dark-textMuted mb-1">Top Contributor</div>
              <div class="text-lg font-bold text-dark-text">{{ topContributor?.full_name || 'N/A' }}</div>
              <div class="text-sm text-primary">{{ formatStatValue(topContributor?.projectedValue) }}</div>
            </div>
          </div>
          <div class="mt-6">
            <h3 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-3">Your Roster ({{ selectedCategoryInfo?.display_name }})</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <div v-for="player in myPlayersInCategory.slice(0, 12)" :key="player.player_key" class="bg-dark-border/30 rounded-lg p-3 text-center hover:bg-dark-border/50 transition-colors cursor-pointer" @click="togglePlayerExpanded(player)">
                <div class="w-10 h-10 rounded-full bg-dark-border overflow-hidden mx-auto mb-2 ring-2 ring-yellow-400"><img :src="player.headshot || defaultHeadshot" :alt="player.full_name" class="w-full h-full object-cover" @error="handleImageError" /></div>
                <div class="text-sm font-medium text-dark-text truncate">{{ player.full_name?.split(' ').pop() }}</div>
                <div class="text-xs text-dark-textMuted">{{ player.position?.split(',')[0] }}</div>
                <div class="text-sm font-bold text-primary mt-1">{{ formatStatValue(player.projectedValue) }}</div>
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
          <div class="card bg-gradient-to-r from-primary/10 to-cyan-500/10 border-primary/30">
            <div class="card-body py-4">
              <div class="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 class="text-lg font-bold text-dark-text">Team Analysis</h2>
                  <p class="text-sm text-dark-textMuted">{{ displayCategories.length }} scoring categories • {{ teamsData.length }} teams</p>
                </div>
                <div class="flex gap-6">
                  <div class="text-center">
                    <div class="text-2xl font-bold text-primary">{{ hittingCategories.length }}</div>
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
              :class="teamsViewMode === 'grid' ? 'bg-primary text-gray-900' : 'bg-dark-card text-dark-textMuted hover:bg-dark-border'"
              class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            >
              <span class="mr-2">◻️</span> Grid View
            </button>
            <button 
              @click="teamsViewMode = 'table'" 
              :class="teamsViewMode === 'table' ? 'bg-primary text-gray-900' : 'bg-dark-card text-dark-textMuted hover:bg-dark-border'"
              class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            >
              <span class="mr-2">📊</span> Table View
            </button>
          </div>

          <!-- Team Cards Grid View -->
          <div v-if="teamsViewMode === 'grid'" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <div 
              v-for="team in rankedTeams" 
              :key="team.team_key"
              @click="toggleTeamExpanded(team)"
              class="card hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer"
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
                  <span class="text-xs text-dark-textMuted">{{ expandedTeamKey === team.team_key ? '▲ Click to collapse' : '▼ Click to expand' }}</span>
                </div>
              </div>

              <!-- Expanded Team Details -->
              <div v-if="expandedTeamKey === team.team_key" class="border-t border-dark-border bg-dark-card/50">
                <div class="p-6 space-y-6">
                  
                  <!-- Category Breakdown Table -->
                  <div>
                    <h4 class="font-semibold text-dark-text mb-3 flex items-center gap-2">
                      <span>📊</span> Category Breakdown
                    </h4>
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
                              {{ formatTeamCategoryStat(team.categoryTotals?.[cat.stat_id], cat) }}
                            </td>
                            <td class="py-2 px-3 text-center">
                              <span class="px-2 py-0.5 rounded text-xs font-bold" :class="getTeamRankBadgeClass(team.categoryRanks?.[cat.stat_id])">
                                #{{ team.categoryRanks?.[cat.stat_id] || '-' }}
                              </span>
                            </td>
                            <td class="py-2 px-3 text-center">
                              <span class="font-bold" :class="getTeamGradeColorClass(getTeamCategoryGrade(team.categoryRanks?.[cat.stat_id]))">
                                {{ getTeamCategoryGrade(team.categoryRanks?.[cat.stat_id]) }}
                              </span>
                            </td>
                            <td class="py-2 px-3">
                              <div v-if="team.topContributors?.[cat.stat_id]" class="flex items-center gap-2">
                                <img :src="team.topContributors[cat.stat_id].headshot || defaultHeadshot" class="w-6 h-6 rounded-full" @error="handleImageError" />
                                <span class="text-dark-text">{{ team.topContributors[cat.stat_id].name }}</span>
                                <span class="text-primary font-medium">({{ formatTeamCategoryStat(team.topContributors[cat.stat_id].value, cat) }})</span>
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
                    <h4 class="font-semibold text-dark-text mb-3 flex items-center gap-2">
                      <span>💡</span> Trade Insights
                    </h4>
                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <div class="text-xs text-dark-textMuted uppercase tracking-wider mb-2">Could Use</div>
                        <div class="flex flex-wrap gap-1">
                          <span v-for="cat in (team.weakestCategories || []).slice(0, 4)" :key="cat" class="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-medium">
                            {{ cat }}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div class="text-xs text-dark-textMuted uppercase tracking-wider mb-2">Has Surplus</div>
                        <div class="flex flex-wrap gap-1">
                          <span v-for="cat in (team.strongestCategories || []).slice(0, 4)" :key="cat" class="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium">
                            {{ cat }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

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
                    v-for="team in rankedTeams" 
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
                    <button @click="startSitMode = 'daily'" :class="startSitMode === 'daily' ? 'bg-primary text-gray-900' : 'bg-dark-card text-dark-textMuted'" class="px-4 py-2 text-sm font-medium transition-colors">📅 Daily</button>
                    <button @click="startSitMode = 'weekly'" :class="startSitMode === 'weekly' ? 'bg-primary text-gray-900' : 'bg-dark-card text-dark-textMuted'" class="px-4 py-2 text-sm font-medium transition-colors">📆 Weekly</button>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <template v-if="startSitMode === 'daily'">
                    <div class="flex rounded-lg overflow-hidden border border-dark-border/50">
                      <button @click="startSitDay = 'today'" :class="startSitDay === 'today' ? 'bg-primary text-gray-900' : 'bg-dark-card text-dark-textMuted hover:bg-dark-border/50'" class="px-4 py-2 text-sm font-medium transition-colors">Today</button>
                      <button @click="startSitDay = 'tomorrow'" :class="startSitDay === 'tomorrow' ? 'bg-primary text-gray-900' : 'bg-dark-card text-dark-textMuted hover:bg-dark-border/50'" class="px-4 py-2 text-sm font-medium transition-colors">Tomorrow</button>
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
                      :class="startSitPlayerFilter === 'all' ? 'bg-primary text-gray-900' : 'bg-dark-card text-dark-textMuted hover:bg-dark-border/50'" 
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
                  :class="selectedStartSitPosition === pos.id ? 'bg-primary text-gray-900' : 'bg-dark-border/30 text-dark-textSecondary hover:text-dark-text'"
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
                          <th class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-20">Impact</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-dark-border/30">
                        <tr 
                          v-for="(player, index) in getStartSitPlayersForPosition(selectedStartSitPosition)" 
                          :key="player.player_key"
                          :class="getStartSitRowClass(player)"
                          class="hover:bg-dark-border/20 transition-colors"
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
                              <span class="px-2 py-1 rounded text-xs font-bold" :class="getImpactClass(player)">
                                {{ getImpactLabel(player) }}
                              </span>
                              <span class="text-[10px] text-dark-textMuted">{{ getImpactCategoryCount(player) }} cats</span>
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
            <div class="w-96 flex-shrink-0 space-y-4">
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
                          <span class="w-10 font-medium text-dark-text">{{ cat.display_name }}</span>
                          <div class="flex-1 h-1.5 bg-dark-border rounded-full overflow-hidden">
                            <div class="h-full rounded-full" :class="cat.barClass" :style="{ width: cat.barWidth + '%' }"></div>
                          </div>
                          <span class="w-16 text-right font-mono" :class="cat.statusClass">
                            {{ cat.myProj }} - {{ cat.oppProj }}
                          </span>
                          <span class="w-6 text-center">
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
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { yahooService } from '@/services/yahoo'

const leagueStore = useLeagueStore()

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

// Tab state
const activeTab = ref<'ros' | 'teams' | 'startsit'>('ros')
const teamsViewMode = ref<'grid' | 'table'>('grid')
const expandedTeamKey = ref<string | null>(null)

// Start/Sit state
const startSitMode = ref<'daily' | 'weekly'>('daily')
const startSitDay = ref<'today' | 'tomorrow'>('today')
const selectedStartSitPosition = ref('C')
const currentMatchupWeek = ref(1)
const currentMatchup = ref<any>(null)
const startSitPlayerFilter = ref<'all' | 'mine' | 'fa'>('all')

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

const columnTooltips = {
  rank: 'Player rank in this category based on projected ROS performance',
  player: 'Player name, MLB team, and fantasy team owner',
  position: 'Primary fielding position',
  rosProj: 'Rest of Season Projection: Current stats + (per-game rate × remaining games)',
  current: 'Current season total for this category',
  perGame: 'Average production per game this season',
  value: 'Overall Value Score (0-100) combining: Category Rank (40%), Multi-Category Contribution (25%), Positional Scarcity (20%), and Consistency (15%)'
}

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
    const overallValue = (categoryRankScore * 0.40) + (multiCatScore * 0.25) + (scarcityScore * 0.20) + (consistencyScore * 0.15)
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
function getRowClass(player: any): string { if (isMyPlayer(player)) return 'bg-yellow-500/20 border-l-4 border-l-yellow-400'; if (isFreeAgent(player)) return 'bg-cyan-500/10 border-l-4 border-l-cyan-400'; return '' }
function getAvatarRingClass(player: any): string { if (isMyPlayer(player)) return 'ring-yellow-400 ring-offset-2 ring-offset-dark-card'; if (isFreeAgent(player)) return 'ring-cyan-400 ring-offset-2 ring-offset-dark-card'; return 'ring-dark-border' }
function getPlayerNameClass(player: any): string { if (isMyPlayer(player)) return 'text-yellow-400'; if (isFreeAgent(player)) return 'text-cyan-300'; return 'text-dark-text' }
function getPositionClass(position: string): string { const pos = position?.split(',')[0]?.trim(); const colors: Record<string, string> = { 'C': 'bg-purple-500/30 text-purple-300', '1B': 'bg-red-500/30 text-red-300', '2B': 'bg-green-500/30 text-green-300', '3B': 'bg-blue-500/30 text-blue-300', 'SS': 'bg-yellow-500/30 text-yellow-300', 'OF': 'bg-orange-500/30 text-orange-300', 'SP': 'bg-cyan-500/30 text-cyan-300', 'RP': 'bg-pink-500/30 text-pink-300' }; return colors[pos] || 'bg-dark-border text-dark-textMuted' }
function showTierBreak(player: any, index: number): boolean { if (sortColumn.value !== 'rank') return false; if (index === 0) return true; const prevPlayer = sortedPlayers.value[index - 1]; return prevPlayer && player.tier !== prevPlayer.tier }
function getTierLabel(tier: number): string { const labels: Record<number, string> = { 1: 'Tier 1: Elite', 2: 'Tier 2: Great', 3: 'Tier 3: Good', 4: 'Tier 4: Average', 5: 'Tier 5: Below Average' }; return labels[tier] || `Tier ${tier}` }
function getValueClass(value: number): string { if (value >= 80) return 'text-green-400'; if (value >= 60) return 'text-lime-400'; if (value >= 40) return 'text-yellow-400'; if (value >= 20) return 'text-orange-400'; return 'text-red-400' }
function getValueDotClass(value: number): string { if (value >= 80) return 'bg-green-400'; if (value >= 60) return 'bg-lime-400'; if (value >= 40) return 'bg-yellow-400'; if (value >= 20) return 'bg-orange-400'; return 'bg-red-400' }

const getCategoryCardClass = computed(() => isPitchingCategory.value ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-primary/10 border-primary/30')
const getCategoryBadgeClass = computed(() => isPitchingCategory.value ? 'bg-cyan-500/20 text-cyan-400' : 'bg-primary/20 text-primary')

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
    const myTeam = teamsData.value.find((t: any) => t.is_owned_by_current_login || t.is_my_team)
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
      fantasy_team: p.fantasy_team, 
      fantasy_team_key: p.fantasy_team_key, 
      stats: p.stats || {}, 
      total_points: p.total_points || 0 
    }))
    
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
    console.log('Players on my team:', myPlayers.length)
    
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
  if (status === 'losing' || status === 'close') return 'text-primary'
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
  if (player.fantasy_team_key === myTeamKey.value) return 'bg-yellow-500/10 border-l-4 border-l-yellow-400'
  if (!player.fantasy_team_key) return 'bg-cyan-500/5 border-l-4 border-l-cyan-400'
  return ''
}

function getStartSitAvatarClass(player: any): string {
  if (player.fantasy_team_key === myTeamKey.value) return 'ring-yellow-400'
  if (!player.fantasy_team_key) return 'ring-cyan-400'
  return 'ring-dark-border'
}

function getStartSitPlayerNameClass(player: any): string {
  if (player.fantasy_team_key === myTeamKey.value) return 'text-yellow-400'
  if (!player.fantasy_team_key) return 'text-cyan-300'
  return 'text-dark-text'
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
    
    return {
      ...cat,
      myProj: formatTeamCategoryStat(myProj, cat),
      oppProj: formatTeamCategoryStat(oppProj, cat),
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
onMounted(() => { loadProjections() })
</script>
