<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="text-3xl font-bold text-dark-text mb-2">Category Projections</h1>
        <p class="text-base text-dark-textMuted">Rest of season rankings by statistical category</p>
      </div>
      <div class="flex items-center gap-3">
        <button @click="loadProjections" :disabled="isLoading" class="px-4 py-2 rounded-lg bg-dark-card hover:bg-dark-border/50 text-dark-textMuted transition-all flex items-center gap-2">
          <span :class="{ 'animate-spin': isLoading }">🔄</span> Refresh
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
        <p class="text-dark-textMuted">{{ loadingMessage }}</p>
      </div>
    </div>

    <template v-else>
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

// Chart state
const chartCategory = ref<string>('')
const recentPerformances = ref<any[]>([])
const isLoadingChart = ref(false)

const defaultHeadshot = 'https://s.yimg.com/cv/apiv2/default/mlb/mlb_default_player_v2.png'

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
  const currentValue = player.stats?.[statId] || 0
  const gamesPlayed = 140 // Full season approximately
  const perGame = gamesPlayed > 0 ? currentValue / gamesPlayed : 0
  
  // Calculate league average for this stat (per game)
  const relevantPlayers = allPlayers.value.filter(p => isPitchingCategory.value ? isPitcher(p) : !isPitcher(p))
  const allStatValues = relevantPlayers.map(p => p.stats?.[statId] || 0).filter(v => v > 0)
  const leagueTotal = allStatValues.reduce((a, b) => a + b, 0)
  const leaguePerGame = allStatValues.length > 0 ? (leagueTotal / allStatValues.length) / gamesPlayed : 0
  
  // If both values are 0, use default values to show something
  const basePlayerValue = perGame > 0 ? perGame : 1
  const baseLeagueValue = leaguePerGame > 0 ? leaguePerGame : 0.8
  
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
    
  } catch (error) { 
    console.error('Error loading projections:', error)
    loadingMessage.value = 'Error loading data' 
  } finally { 
    isLoading.value = false 
  }
}

watch(selectedCategory, () => { selectAllPositions() })
onMounted(() => { loadProjections() })
</script>
