<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="text-3xl font-bold text-dark-text mb-2">Draft Analysis</h1>
        <p class="text-base text-dark-textMuted">
          Category-focused draft insights and team balance analysis
        </p>
      </div>
      <div class="flex items-center gap-3">
        <select v-model="selectedSeason" @change="loadDraftData" class="select">
          <option v-for="season in availableSeasons" :key="season" :value="season">
            {{ season }} Season
          </option>
        </select>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="flex gap-2 flex-wrap">
      <button
        v-for="tab in tabOptions"
        :key="tab.id"
        @click="activeTab = tab.id"
        :class="activeTab === tab.id ? 'bg-primary text-gray-900' : 'bg-dark-card text-dark-textSecondary hover:bg-dark-border/50'"
        class="px-4 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 text-sm"
      >
        <span class="text-lg">{{ tab.icon }}</span>
        {{ tab.name }}
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
        <p class="text-dark-textMuted">{{ loadingMessage }}</p>
      </div>
    </div>

    <!-- No Draft Data -->
    <div v-else-if="draftPicks.length === 0" class="card">
      <div class="card-body text-center py-12">
        <div class="text-6xl mb-4">📋</div>
        <h3 class="text-xl font-bold text-dark-text mb-2">No Draft Data Available</h3>
        <p class="text-dark-textMuted">
          Draft results are not available for this league or season.
        </p>
      </div>
    </div>

    <!-- ==================== DRAFT BOARD TAB ==================== -->
    <template v-else-if="activeTab === 'board'">
      <!-- Controls -->
      <div class="card">
        <div class="card-body py-3">
          <div class="flex items-center justify-between flex-wrap gap-4">
            <div class="flex items-center gap-4">
              <div class="flex items-center gap-2">
                <label class="text-sm text-dark-textMuted">Position:</label>
                <select v-model="positionFilter" class="select text-sm py-1.5">
                  <option value="All">All Positions</option>
                  <option v-for="pos in availablePositions" :key="pos" :value="pos">{{ pos }}</option>
                </select>
              </div>
            </div>
            <div class="text-sm text-dark-textMuted">
              {{ filteredPicks.length }} picks shown
            </div>
          </div>
        </div>
      </div>

      <!-- Legend -->
      <div class="card">
        <div class="card-body py-3">
          <div class="flex items-center justify-between flex-wrap gap-4">
            <div class="flex items-center gap-6 text-sm">
              <div class="flex items-center gap-2">
                <div class="w-4 h-4 rounded bg-green-500/30 border-l-2 border-green-500"></div>
                <span class="text-dark-textMuted">Elite Category Producer (Top 25%)</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-4 h-4 rounded bg-red-500/20 border-l-2 border-red-500"></div>
                <span class="text-dark-textMuted">Category Underperformer (Bottom 25%)</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="px-1.5 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">HR</span>
                <span class="text-dark-textMuted">= Best category contribution</span>
              </div>
            </div>
            <div class="text-sm text-dark-textMuted">
              Click any player for full category breakdown
            </div>
          </div>
        </div>
      </div>

      <!-- Draft Board Grid -->
      <div class="overflow-x-auto">
        <div class="inline-block min-w-full">
          <!-- Column Headers (Teams) -->
          <div class="flex gap-1 mb-1">
            <div class="w-12 flex-shrink-0"></div>
            <div 
              v-for="team in draftBoard" 
              :key="team.team_key"
              class="w-44 flex-shrink-0 bg-dark-card rounded-t-lg p-2 text-center"
            >
              <div class="w-8 h-8 rounded-full bg-dark-border mx-auto mb-1 overflow-hidden">
                <img v-if="team.logo_url" :src="team.logo_url" class="w-full h-full object-cover" @error="handleImageError" />
                <div v-else class="w-full h-full flex items-center justify-center text-xs font-bold text-dark-textMuted">
                  {{ team.team_name?.substring(0, 2).toUpperCase() }}
                </div>
              </div>
              <div class="text-xs font-semibold text-dark-text truncate" :title="team.team_name">
                {{ team.team_name }}
              </div>
            </div>
          </div>

          <!-- Round Rows -->
          <div v-for="round in totalRounds" :key="round" class="flex gap-1 mb-1">
            <!-- Round Label -->
            <div class="w-12 flex-shrink-0 bg-dark-card/50 rounded-l-lg flex items-center justify-center">
              <span class="text-xs font-bold text-dark-textMuted">R{{ round }}</span>
            </div>
            
            <!-- Picks in this round -->
            <div 
              v-for="team in draftBoard" 
              :key="`${round}-${team.team_key}`"
              class="w-44 flex-shrink-0"
            >
              <div 
                v-if="getPickForRound(team.team_key, round)"
                @click="selectPick(getPickForRound(team.team_key, round))"
                class="bg-dark-card rounded-lg p-2 cursor-pointer hover:ring-2 hover:ring-primary transition-all h-full"
                :class="getPickClass(getPickForRound(team.team_key, round))"
              >
                <div class="text-xs font-medium text-dark-text truncate">
                  {{ getPickForRound(team.team_key, round)?.player_name || 'Unknown' }}
                </div>
                <div class="flex items-center justify-between mt-1">
                  <span 
                    class="text-xs px-1.5 py-0.5 rounded font-bold"
                    :class="getPositionClass(getPickForRound(team.team_key, round)?.position)"
                  >
                    {{ getPickForRound(team.team_key, round)?.position }}
                  </span>
                  <span class="text-xs text-dark-textMuted">
                    #{{ getPickForRound(team.team_key, round)?.pick }}
                  </span>
                </div>
                <!-- Best Categories for this player -->
                <div class="mt-1.5 flex flex-wrap gap-1">
                  <span 
                    v-for="cat in getPickForRound(team.team_key, round)?.bestCategories?.slice(0, 3)" 
                    :key="cat.category"
                    class="text-[10px] px-1.5 py-0.5 rounded font-bold"
                    :class="getCategoryColorClass(cat.category)"
                    :title="`${cat.category}: ${formatStatValue(cat.value, cat.category)} (${cat.percentile}%)`"
                  >
                    {{ cat.category }}
                  </span>
                  <span 
                    v-if="!getPickForRound(team.team_key, round)?.bestCategories?.length"
                    class="text-[10px] text-dark-textMuted italic"
                  >
                    No stats
                  </span>
                </div>
              </div>
              <div v-else class="bg-dark-border/20 rounded-lg p-2 h-full flex items-center justify-center">
                <span class="text-xs text-dark-textMuted">-</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ==================== CATEGORY IMPACT TAB ==================== -->
    <template v-else-if="activeTab === 'impact'">
      <!-- Category Leaders from Draft -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">🏆</span>
            <h2 class="card-title">Category Leaders from Draft</h2>
          </div>
          <p class="card-subtitle mt-1">Best drafted player in each category</p>
        </div>
        <div class="card-body">
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div 
              v-for="cat in categoryLeaders" 
              :key="cat.category"
              class="bg-dark-border/20 rounded-xl p-4 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
              @click="cat.player && selectPick(cat.player)"
            >
              <div class="text-center mb-3">
                <span 
                  class="px-3 py-1 rounded-full text-sm font-bold"
                  :class="getCategoryColorClass(cat.category)"
                >
                  {{ cat.category }}
                </span>
              </div>
              <div v-if="cat.player" class="space-y-2">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                    <img :src="cat.player.headshot || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="font-semibold text-dark-text text-sm truncate">{{ cat.player.player_name }}</div>
                    <div class="text-xs text-dark-textMuted">{{ cat.player.team_name }}</div>
                  </div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-black text-primary">{{ formatStatValue(cat.value, cat.category) }}</div>
                  <div class="text-xs text-dark-textMuted">R{{ cat.player.round }} Pick</div>
                </div>
              </div>
              <div v-else class="text-center text-sm text-dark-textMuted italic py-4">
                No data
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Player Category Impact Table -->
      <div class="card mt-6">
        <div class="card-header">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-2xl">📊</span>
              <h2 class="card-title">Player Category Breakdown</h2>
            </div>
            <div class="flex items-center gap-3">
              <select v-model="selectedTeamFilter" class="select text-sm">
                <option value="">All Teams</option>
                <option v-for="team in draftBoard" :key="team.team_key" :value="team.team_key">
                  {{ team.team_name }}
                </option>
              </select>
              <select v-model="impactSort" class="select text-sm">
                <option value="pick">By Pick</option>
                <option value="score">By Total Impact</option>
                <option v-for="cat in leagueCategories" :key="cat" :value="cat">By {{ cat }}</option>
              </select>
            </div>
          </div>
        </div>
        <div class="card-body p-0 overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-dark-border/30">
              <tr>
                <th class="text-left p-3 font-semibold text-dark-textMuted sticky left-0 bg-dark-card z-10">Player</th>
                <th class="text-center p-3 font-semibold text-dark-textMuted">Pick</th>
                <th class="text-center p-3 font-semibold text-dark-textMuted">Team</th>
                <th 
                  v-for="cat in leagueCategories" 
                  :key="cat"
                  class="text-center p-3 font-semibold text-dark-textMuted min-w-[60px]"
                  :class="getCategoryColorClass(cat)"
                >
                  {{ cat }}
                </th>
                <th class="text-center p-3 font-semibold text-dark-textMuted">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="pick in sortedImpactPicks" 
                :key="pick.pick"
                class="border-b border-dark-border/50 hover:bg-dark-border/20 cursor-pointer"
                @click="selectPick(pick)"
              >
                <td class="p-3 sticky left-0 bg-dark-card z-10">
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full bg-dark-border overflow-hidden flex-shrink-0">
                      <img :src="pick.headshot || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
                    </div>
                    <div>
                      <div class="font-medium text-dark-text">{{ pick.player_name }}</div>
                      <span class="text-xs px-1.5 py-0.5 rounded font-bold" :class="getPositionClass(pick.position)">
                        {{ pick.position }}
                      </span>
                    </div>
                  </div>
                </td>
                <td class="p-3 text-center text-dark-textMuted">R{{ pick.round }}.{{ pick.pickInRound }}</td>
                <td class="p-3 text-center text-dark-textMuted text-xs">{{ pick.team_name }}</td>
                <td 
                  v-for="cat in leagueCategories" 
                  :key="cat"
                  class="p-3 text-center"
                  :class="getStatCellClass(pick.stats?.[getStatIdForCategory(cat)], cat)"
                >
                  {{ formatStatValue(pick.stats?.[getStatIdForCategory(cat)] || 0, cat) }}
                </td>
                <td class="p-3 text-center">
                  <span class="font-bold" :class="getCategoryScoreClass(pick.categoryScore)">
                    {{ pick.categoryScore?.toFixed(0) || '0' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- ==================== DRAFT BALANCE TAB ==================== -->
    <template v-else-if="activeTab === 'balance'">
      <!-- Team Balance Overview -->
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <div 
          v-for="team in teamBalanceData" 
          :key="team.team_key"
          class="card cursor-pointer hover:ring-2 hover:ring-primary transition-all"
          @click="selectedBalanceTeam = team.team_key"
        >
          <div class="card-body">
            <!-- Team Header -->
            <div class="flex items-center gap-3 mb-4">
              <div class="w-12 h-12 rounded-full bg-dark-border overflow-hidden">
                <img :src="team.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
              </div>
              <div class="flex-1">
                <div class="font-bold text-dark-text">{{ team.team_name }}</div>
                <div class="text-xs text-dark-textMuted">{{ team.picks.length }} picks</div>
              </div>
              <div class="text-right">
                <div class="text-2xl font-black" :class="getGradeClass(team.balanceGrade)">
                  {{ team.balanceGrade }}
                </div>
                <div class="text-xs text-dark-textMuted">Balance</div>
              </div>
            </div>

            <!-- Category Strengths/Weaknesses -->
            <div class="space-y-2">
              <div class="text-xs text-dark-textMuted uppercase font-bold mb-1">Category Strength</div>
              <div class="grid grid-cols-5 gap-1">
                <div 
                  v-for="cat in team.categoryStrengths.slice(0, 10)" 
                  :key="cat.category"
                  class="text-center p-1.5 rounded"
                  :class="getCategoryStrengthClass(cat.percentile)"
                  :title="`${cat.category}: ${cat.percentile}th percentile`"
                >
                  <div class="text-xs font-bold">{{ cat.category }}</div>
                  <div class="text-[10px] opacity-75">{{ cat.percentile }}%</div>
                </div>
              </div>
            </div>

            <!-- Draft Strategy Detection -->
            <div class="mt-4 pt-4 border-t border-dark-border">
              <div class="flex items-center gap-2">
                <span class="text-lg">{{ team.strategyIcon }}</span>
                <div>
                  <div class="text-sm font-semibold text-dark-text">{{ team.strategyLabel }}</div>
                  <div class="text-xs text-dark-textMuted">{{ team.strategyDetail }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Selected Team Deep Dive -->
      <div v-if="selectedBalanceTeam" class="card mt-6">
        <div class="card-header">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-dark-border overflow-hidden">
                <img :src="selectedTeamData?.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
              </div>
              <div>
                <h2 class="card-title">{{ selectedTeamData?.team_name }} Draft Breakdown</h2>
                <p class="card-subtitle">Category contribution by round</p>
              </div>
            </div>
            <button @click="selectedBalanceTeam = null" class="text-dark-textMuted hover:text-dark-text p-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div class="card-body">
          <!-- Category Radar Chart (simplified bar version) -->
          <div class="grid grid-cols-2 gap-4">
            <!-- Hitting Categories -->
            <div>
              <div class="text-sm font-bold text-blue-400 mb-3 flex items-center gap-2">
                <span>⚾</span> Hitting Categories
              </div>
              <div class="space-y-2">
                <div v-for="cat in selectedTeamHittingCategories" :key="cat.category" class="flex items-center gap-2">
                  <div class="w-12 text-xs font-medium text-dark-textMuted">{{ cat.category }}</div>
                  <div class="flex-1 h-4 bg-dark-border/30 rounded-full overflow-hidden">
                    <div 
                      class="h-full rounded-full transition-all duration-500"
                      :class="cat.percentile >= 75 ? 'bg-green-500' : cat.percentile >= 50 ? 'bg-yellow-500' : cat.percentile >= 25 ? 'bg-orange-500' : 'bg-red-500'"
                      :style="{ width: cat.percentile + '%' }"
                    ></div>
                  </div>
                  <div class="w-10 text-xs font-bold text-right" :class="getCategoryScoreClass(cat.percentile)">
                    {{ cat.percentile }}%
                  </div>
                </div>
              </div>
            </div>
            <!-- Pitching Categories -->
            <div>
              <div class="text-sm font-bold text-purple-400 mb-3 flex items-center gap-2">
                <span>🎯</span> Pitching Categories
              </div>
              <div class="space-y-2">
                <div v-for="cat in selectedTeamPitchingCategories" :key="cat.category" class="flex items-center gap-2">
                  <div class="w-12 text-xs font-medium text-dark-textMuted">{{ cat.category }}</div>
                  <div class="flex-1 h-4 bg-dark-border/30 rounded-full overflow-hidden">
                    <div 
                      class="h-full rounded-full transition-all duration-500"
                      :class="cat.percentile >= 75 ? 'bg-green-500' : cat.percentile >= 50 ? 'bg-yellow-500' : cat.percentile >= 25 ? 'bg-orange-500' : 'bg-red-500'"
                      :style="{ width: cat.percentile + '%' }"
                    ></div>
                  </div>
                  <div class="w-10 text-xs font-bold text-right" :class="getCategoryScoreClass(cat.percentile)">
                    {{ cat.percentile }}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ==================== STEALS & BUSTS TAB ==================== -->
    <template v-else-if="activeTab === 'steals'">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Biggest Steals -->
        <div class="card">
          <div class="card-header">
            <div class="flex items-center gap-2">
              <span class="text-2xl">🔥</span>
              <h2 class="card-title">Biggest Draft Steals</h2>
            </div>
            <p class="card-subtitle mt-1">Best value relative to draft position</p>
          </div>
          <div class="card-body space-y-2">
            <div 
              v-for="(pick, idx) in topSteals" 
              :key="pick.pick"
              class="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg cursor-pointer hover:bg-green-500/20 transition-all"
              @click="selectPick(pick)"
            >
              <div class="text-lg font-bold text-green-400 w-6">{{ idx + 1 }}</div>
              <div class="w-10 h-10 rounded-full bg-dark-border overflow-hidden flex-shrink-0">
                <img :src="pick.headshot || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-dark-text">{{ pick.player_name }}</div>
                <div class="text-xs text-dark-textMuted">R{{ pick.round }} • {{ pick.team_name }}</div>
              </div>
              <div class="text-right">
                <div class="text-lg font-bold text-green-400">+{{ pick.valueScore?.toFixed(0) }}</div>
                <div class="text-xs text-dark-textMuted">{{ pick.position }}</div>
              </div>
            </div>
            <div v-if="topSteals.length === 0" class="text-center py-8 text-dark-textMuted">
              No significant steals found
            </div>
          </div>
        </div>

        <!-- Biggest Busts -->
        <div class="card">
          <div class="card-header">
            <div class="flex items-center gap-2">
              <span class="text-2xl">💀</span>
              <h2 class="card-title">Biggest Draft Busts</h2>
            </div>
            <p class="card-subtitle mt-1">Underperformed relative to draft position</p>
          </div>
          <div class="card-body space-y-2">
            <div 
              v-for="(pick, idx) in topBusts" 
              :key="pick.pick"
              class="flex items-center gap-3 p-3 bg-red-500/10 rounded-lg cursor-pointer hover:bg-red-500/20 transition-all"
              @click="selectPick(pick)"
            >
              <div class="text-lg font-bold text-red-400 w-6">{{ idx + 1 }}</div>
              <div class="w-10 h-10 rounded-full bg-dark-border overflow-hidden flex-shrink-0">
                <img :src="pick.headshot || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-dark-text">{{ pick.player_name }}</div>
                <div class="text-xs text-dark-textMuted">R{{ pick.round }} • {{ pick.team_name }}</div>
              </div>
              <div class="text-right">
                <div class="text-lg font-bold text-red-400">{{ pick.valueScore?.toFixed(0) }}</div>
                <div class="text-xs text-dark-textMuted">{{ pick.position }}</div>
              </div>
            </div>
            <div v-if="topBusts.length === 0" class="text-center py-8 text-dark-textMuted">
              No significant busts found
            </div>
          </div>
        </div>
      </div>

      <!-- Category-Specific Leaders -->
      <div class="card mt-6">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">🎯</span>
            <h2 class="card-title">Late Round Gems by Category</h2>
          </div>
          <p class="card-subtitle mt-1">Best performers drafted after round 10</p>
        </div>
        <div class="card-body">
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div 
              v-for="gem in lateRoundGems" 
              :key="gem.category"
              class="bg-dark-border/20 rounded-xl p-4 text-center cursor-pointer hover:ring-2 hover:ring-primary transition-all"
              @click="gem.player && selectPick(gem.player)"
            >
              <span 
                class="px-2 py-1 rounded-full text-xs font-bold mb-2 inline-block"
                :class="getCategoryColorClass(gem.category)"
              >
                {{ gem.category }}
              </span>
              <div v-if="gem.player" class="mt-2">
                <div class="font-semibold text-dark-text text-sm">{{ gem.player.player_name }}</div>
                <div class="text-xs text-dark-textMuted">R{{ gem.player.round }}</div>
                <div class="text-lg font-bold text-primary mt-1">
                  {{ formatStatValue(gem.value, gem.category) }}
                </div>
              </div>
              <div v-else class="text-xs text-dark-textMuted mt-2">No late gems</div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Player Detail Modal -->
    <Teleport to="body">
      <div 
        v-if="selectedPick"
        class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
        @click.self="selectedPick = null"
      >
        <div class="bg-dark-card rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          <!-- Modal Header -->
          <div class="p-6 border-b border-dark-border flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="w-16 h-16 rounded-full bg-dark-border overflow-hidden ring-4" :class="getGradeRingClass(selectedPick.grade)">
                <img :src="selectedPick.headshot || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
              </div>
              <div>
                <h2 class="text-2xl font-bold text-dark-text">{{ selectedPick.player_name }}</h2>
                <div class="flex items-center gap-2 text-sm text-dark-textMuted">
                  <span class="px-2 py-0.5 rounded text-xs font-bold" :class="getPositionClass(selectedPick.position)">
                    {{ selectedPick.position }}
                  </span>
                  <span>•</span>
                  <span>{{ selectedPick.mlb_team }}</span>
                </div>
              </div>
            </div>
            <button @click="selectedPick = null" class="text-dark-textMuted hover:text-dark-text p-2">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Modal Content -->
          <div class="p-6 overflow-y-auto max-h-[calc(90vh-120px)] space-y-4">
            <!-- Draft Info -->
            <div class="grid grid-cols-3 gap-4">
              <div class="bg-dark-border/30 rounded-xl p-4 text-center">
                <div class="text-sm text-dark-textMuted mb-1">Draft Pick</div>
                <div class="text-2xl font-bold text-dark-text">R{{ selectedPick.round }}.{{ selectedPick.pickInRound }}</div>
              </div>
              <div class="bg-dark-border/30 rounded-xl p-4 text-center">
                <div class="text-sm text-dark-textMuted mb-1">Category Score</div>
                <div class="text-2xl font-bold" :class="getCategoryScoreClass(selectedPick.categoryScore)">
                  {{ selectedPick.categoryScore?.toFixed(0) || '0' }}
                </div>
              </div>
              <div class="bg-dark-border/30 rounded-xl p-4 text-center">
                <div class="text-sm text-dark-textMuted mb-1">Value Score</div>
                <div class="text-2xl font-bold" :class="selectedPick.valueScore >= 0 ? 'text-green-400' : 'text-red-400'">
                  {{ selectedPick.valueScore >= 0 ? '+' : '' }}{{ selectedPick.valueScore?.toFixed(0) || '0' }}
                </div>
              </div>
            </div>

            <!-- Category Breakdown -->
            <div class="bg-dark-border/30 rounded-xl p-4">
              <h3 class="text-lg font-bold text-dark-text mb-4">Season Stats</h3>
              <div class="grid grid-cols-5 gap-3">
                <div 
                  v-for="cat in leagueCategories" 
                  :key="cat"
                  class="text-center p-2 rounded-lg"
                  :class="getCategoryColorClass(cat)"
                >
                  <div class="text-xs font-bold mb-1">{{ cat }}</div>
                  <div class="text-lg font-black">
                    {{ formatStatValue(selectedPick.stats?.[getStatIdForCategory(cat)] || 0, cat) }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Drafted By -->
            <div class="bg-dark-border/30 rounded-xl p-4">
              <h3 class="text-lg font-bold text-dark-text mb-2">Drafted By</h3>
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-dark-border overflow-hidden">
                  <img :src="selectedPick.team_logo || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
                </div>
                <div>
                  <div class="font-semibold text-dark-text">{{ selectedPick.team_name }}</div>
                  <div class="text-sm text-dark-textMuted">Overall Pick #{{ selectedPick.pick }}</div>
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
import { ref, computed, onMounted, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useAuthStore } from '@/stores/auth'
import { yahooService } from '@/services/yahoo'

const leagueStore = useLeagueStore()
const authStore = useAuthStore()

// State
const isLoading = ref(true)
const loadingMessage = ref('Loading draft data...')
const activeTab = ref('board')
const selectedSeason = ref('2024')
const availableSeasons = ref(['2024', '2023', '2022'])
const positionFilter = ref('All')
const selectedTeamFilter = ref('')
const impactSort = ref('pick')
const selectedBalanceTeam = ref<string | null>(null)
const selectedPick = ref<any>(null)

// Data
const draftPicks = ref<any[]>([])
const teamsData = ref<any[]>([])
const playerStats = ref<Map<string, any>>(new Map())
const leagueCategories = ref<string[]>([])
const leagueSettings = ref<any>(null)

const defaultAvatar = 'https://s.yimg.com/cv/apiv2/default/mlb/mlb_dp_2_72.png'

// Tab options
const tabOptions = [
  { id: 'board', name: 'Draft Board', icon: '📋' },
  { id: 'impact', name: 'Category Impact', icon: '📊' },
  { id: 'balance', name: 'Draft Balance', icon: '⚖️' },
  { id: 'steals', name: 'Steals & Busts', icon: '🎯' }
]

// Stat ID mapping
const statIdMapping: Record<string, string> = {
  'R': '7', 'HR': '12', 'RBI': '13', 'SB': '16', 'AVG': '3',
  'OBP': '55', 'SLG': '56', 'OPS': '60', 'H': '8', 'BB': '18',
  'W': '28', 'SV': '32', 'K': '42', 'ERA': '26', 'WHIP': '27',
  'QS': '48', 'HD': '50', 'IP': '34', 'L': '29', 'BS': '33'
}

const reverseStatIdMapping: Record<string, string> = Object.fromEntries(
  Object.entries(statIdMapping).map(([k, v]) => [v, k])
)

function getStatIdForCategory(cat: string): string {
  return statIdMapping[cat] || cat
}

function getCategoryDisplayName(statId: string): string {
  return reverseStatIdMapping[statId] || statId
}

// Computed
const draftBoard = computed(() => {
  const teams: Record<string, any> = {}
  
  for (const pick of draftPicks.value) {
    if (!teams[pick.team_key]) {
      teams[pick.team_key] = {
        team_key: pick.team_key,
        team_name: pick.team_name,
        logo_url: pick.team_logo,
        picks: []
      }
    }
    teams[pick.team_key].picks.push(pick)
  }
  
  return Object.values(teams)
})

const totalRounds = computed(() => {
  if (draftPicks.value.length === 0) return 0
  return Math.max(...draftPicks.value.map(p => p.round))
})

const availablePositions = computed(() => {
  const positions = new Set(draftPicks.value.map(p => p.position).filter(Boolean))
  return Array.from(positions).sort()
})

const filteredPicks = computed(() => {
  if (positionFilter.value === 'All') return draftPicks.value
  return draftPicks.value.filter(p => p.position === positionFilter.value)
})

// Category Leaders
const categoryLeaders = computed(() => {
  return leagueCategories.value.map(cat => {
    const statId = getStatIdForCategory(cat)
    const isLowerBetter = ['ERA', 'WHIP', 'L', 'BS'].includes(cat)
    
    let best: any = null
    let bestValue = isLowerBetter ? Infinity : -Infinity
    
    for (const pick of draftPicks.value) {
      const value = pick.stats?.[statId] || 0
      if (value === 0) continue
      
      if (isLowerBetter) {
        if (value < bestValue) {
          bestValue = value
          best = pick
        }
      } else {
        if (value > bestValue) {
          bestValue = value
          best = pick
        }
      }
    }
    
    return {
      category: cat,
      player: best,
      value: bestValue === Infinity || bestValue === -Infinity ? 0 : bestValue
    }
  })
})

// Sorted picks for impact tab
const sortedImpactPicks = computed(() => {
  let picks = [...draftPicks.value]
  
  if (selectedTeamFilter.value) {
    picks = picks.filter(p => p.team_key === selectedTeamFilter.value)
  }
  
  if (impactSort.value === 'score') {
    picks.sort((a, b) => (b.categoryScore || 0) - (a.categoryScore || 0))
  } else if (impactSort.value === 'pick') {
    picks.sort((a, b) => a.pick - b.pick)
  } else {
    // Sort by specific category
    const statId = getStatIdForCategory(impactSort.value)
    const isLowerBetter = ['ERA', 'WHIP', 'L', 'BS'].includes(impactSort.value)
    picks.sort((a, b) => {
      const aVal = a.stats?.[statId] || (isLowerBetter ? Infinity : 0)
      const bVal = b.stats?.[statId] || (isLowerBetter ? Infinity : 0)
      return isLowerBetter ? aVal - bVal : bVal - aVal
    })
  }
  
  return picks
})

// Team Balance Data
const teamBalanceData = computed(() => {
  return draftBoard.value.map(team => {
    const teamPicks = team.picks || []
    
    // Calculate category totals for this team
    const categoryTotals: Record<string, number> = {}
    for (const cat of leagueCategories.value) {
      const statId = getStatIdForCategory(cat)
      categoryTotals[cat] = teamPicks.reduce((sum: number, pick: any) => {
        return sum + (pick.stats?.[statId] || 0)
      }, 0)
    }
    
    // Calculate percentiles vs other teams
    const categoryStrengths = leagueCategories.value.map(cat => {
      const allTeamTotals = draftBoard.value.map(t => {
        const statId = getStatIdForCategory(cat)
        return (t.picks || []).reduce((sum: number, p: any) => sum + (p.stats?.[statId] || 0), 0)
      })
      
      const isLowerBetter = ['ERA', 'WHIP', 'L', 'BS'].includes(cat)
      const sorted = [...allTeamTotals].sort((a, b) => isLowerBetter ? a - b : b - a)
      const rank = sorted.indexOf(categoryTotals[cat]) + 1
      const percentile = Math.round(((draftBoard.value.length - rank + 1) / draftBoard.value.length) * 100)
      
      return {
        category: cat,
        value: categoryTotals[cat],
        percentile,
        rank
      }
    })
    
    // Detect strategy
    const hittingCats = categoryStrengths.filter(c => isHittingCategory(c.category))
    const pitchingCats = categoryStrengths.filter(c => !isHittingCategory(c.category))
    const avgHitting = hittingCats.reduce((s, c) => s + c.percentile, 0) / (hittingCats.length || 1)
    const avgPitching = pitchingCats.reduce((s, c) => s + c.percentile, 0) / (pitchingCats.length || 1)
    
    const weakCats = categoryStrengths.filter(c => c.percentile < 30)
    const strongCats = categoryStrengths.filter(c => c.percentile >= 70)
    
    let strategyLabel = 'Balanced'
    let strategyDetail = 'Well-rounded across categories'
    let strategyIcon = '⚖️'
    
    if (weakCats.length >= 2 && weakCats.some(c => ['SV', 'HD', 'SVHD'].includes(c.category))) {
      strategyLabel = 'Punt Saves'
      strategyDetail = `Sacrificed ${weakCats.map(c => c.category).join(', ')}`
      strategyIcon = '🎯'
    } else if (avgHitting > avgPitching + 20) {
      strategyLabel = 'Hitting Heavy'
      strategyDetail = 'Prioritized offense in draft'
      strategyIcon = '⚾'
    } else if (avgPitching > avgHitting + 20) {
      strategyLabel = 'Pitching Heavy'
      strategyDetail = 'Prioritized pitching in draft'
      strategyIcon = '🎯'
    } else if (strongCats.length >= 5) {
      strategyLabel = 'Elite Core'
      strategyDetail = `Dominant in ${strongCats.slice(0, 3).map(c => c.category).join(', ')}`
      strategyIcon = '👑'
    }
    
    // Calculate balance grade
    const avgPercentile = categoryStrengths.reduce((s, c) => s + c.percentile, 0) / categoryStrengths.length
    const variance = categoryStrengths.reduce((s, c) => s + Math.pow(c.percentile - avgPercentile, 2), 0) / categoryStrengths.length
    const balanceScore = avgPercentile - (Math.sqrt(variance) * 0.5) // Penalize high variance
    
    return {
      ...team,
      categoryTotals,
      categoryStrengths: categoryStrengths.sort((a, b) => b.percentile - a.percentile),
      strategyLabel,
      strategyDetail,
      strategyIcon,
      balanceGrade: calculateGrade(balanceScore / 10)
    }
  }).sort((a, b) => {
    const aAvg = a.categoryStrengths.reduce((s: number, c: any) => s + c.percentile, 0) / a.categoryStrengths.length
    const bAvg = b.categoryStrengths.reduce((s: number, c: any) => s + c.percentile, 0) / b.categoryStrengths.length
    return bAvg - aAvg
  })
})

const selectedTeamData = computed(() => {
  return teamBalanceData.value.find(t => t.team_key === selectedBalanceTeam.value)
})

const selectedTeamHittingCategories = computed(() => {
  if (!selectedTeamData.value) return []
  return selectedTeamData.value.categoryStrengths.filter((c: any) => isHittingCategory(c.category))
})

const selectedTeamPitchingCategories = computed(() => {
  if (!selectedTeamData.value) return []
  return selectedTeamData.value.categoryStrengths.filter((c: any) => !isHittingCategory(c.category))
})

// Top Steals & Busts
const topSteals = computed(() => {
  return [...draftPicks.value]
    .filter(p => (p.valueScore || 0) >= 10)
    .sort((a, b) => (b.valueScore || 0) - (a.valueScore || 0))
    .slice(0, 10)
})

const topBusts = computed(() => {
  return [...draftPicks.value]
    .filter(p => (p.valueScore || 0) <= -10)
    .sort((a, b) => (a.valueScore || 0) - (b.valueScore || 0))
    .slice(0, 10)
})

// Late Round Gems (drafted after round 10)
const lateRoundGems = computed(() => {
  const lateRoundPicks = draftPicks.value.filter(p => p.round >= 10)
  
  return leagueCategories.value.slice(0, 10).map(cat => {
    const statId = getStatIdForCategory(cat)
    const isLowerBetter = ['ERA', 'WHIP', 'L', 'BS'].includes(cat)
    
    let best: any = null
    let bestValue = isLowerBetter ? Infinity : -Infinity
    
    for (const pick of lateRoundPicks) {
      const value = pick.stats?.[statId] || 0
      if (value === 0) continue
      
      if (isLowerBetter) {
        if (value < bestValue) {
          bestValue = value
          best = pick
        }
      } else {
        if (value > bestValue) {
          bestValue = value
          best = pick
        }
      }
    }
    
    return {
      category: cat,
      player: best,
      value: bestValue === Infinity || bestValue === -Infinity ? 0 : bestValue
    }
  })
})

// Helper functions
function getPickForRound(teamKey: string, round: number) {
  return draftPicks.value.find(p => p.team_key === teamKey && p.round === round)
}

function getPickClass(pick: any) {
  if (!pick) return ''
  const score = pick.categoryScore || 0
  const percentile = pick.categoryPercentile || 50
  if (percentile >= 75) return 'bg-green-500/20 border-l-2 border-green-500'
  if (percentile <= 25) return 'bg-red-500/20 border-l-2 border-red-500'
  return ''
}

function getPositionClass(position: string) {
  const classes: Record<string, string> = {
    'C': 'bg-blue-500/20 text-blue-400',
    '1B': 'bg-green-500/20 text-green-400',
    '2B': 'bg-yellow-500/20 text-yellow-400',
    '3B': 'bg-orange-500/20 text-orange-400',
    'SS': 'bg-purple-500/20 text-purple-400',
    'OF': 'bg-pink-500/20 text-pink-400',
    'SP': 'bg-red-500/20 text-red-400',
    'RP': 'bg-cyan-500/20 text-cyan-400',
    'P': 'bg-red-500/20 text-red-400',
    'Util': 'bg-gray-500/20 text-gray-400',
  }
  return classes[position] || 'bg-gray-500/20 text-gray-400'
}

function getCategoryColorClass(cat: string) {
  if (isHittingCategory(cat)) return 'bg-blue-500/20 text-blue-400'
  return 'bg-purple-500/20 text-purple-400'
}

function isHittingCategory(cat: string): boolean {
  const hittingCats = ['HR', 'RBI', 'R', 'SB', 'AVG', 'OPS', 'OBP', 'SLG', 'H', 'TB', 'BB', 'XBH', 'AB']
  return hittingCats.includes(cat)
}

function getCategoryScoreClass(score: number) {
  if (score >= 75) return 'text-green-400'
  if (score >= 50) return 'text-yellow-400'
  if (score >= 25) return 'text-orange-400'
  return 'text-red-400'
}

function getCategoryStrengthClass(percentile: number) {
  if (percentile >= 75) return 'bg-green-500/30 text-green-400'
  if (percentile >= 50) return 'bg-yellow-500/30 text-yellow-400'
  if (percentile >= 25) return 'bg-orange-500/30 text-orange-400'
  return 'bg-red-500/30 text-red-400'
}

function getStatCellClass(value: number, cat: string) {
  if (!value) return 'text-dark-textMuted'
  // Could add percentile coloring here
  return 'text-dark-text'
}

function formatStatValue(value: number, cat: string): string {
  if (value === 0 || value === undefined) return '-'
  if (['AVG', 'OBP', 'SLG', 'OPS'].includes(cat)) {
    return value.toFixed(3).replace(/^0/, '')
  }
  if (['ERA', 'WHIP'].includes(cat)) {
    return value.toFixed(2)
  }
  if (['IP'].includes(cat)) {
    return value.toFixed(1)
  }
  return Math.round(value).toString()
}

function getGradeClass(grade: string) {
  if (grade?.startsWith('A')) return 'text-green-400'
  if (grade?.startsWith('B')) return 'text-lime-400'
  if (grade?.startsWith('C')) return 'text-yellow-400'
  if (grade?.startsWith('D')) return 'text-orange-400'
  return 'text-red-400'
}

function getGradeRingClass(grade: string) {
  if (grade?.startsWith('A')) return 'ring-green-500'
  if (grade?.startsWith('B')) return 'ring-lime-500'
  if (grade?.startsWith('C')) return 'ring-yellow-500'
  if (grade?.startsWith('D')) return 'ring-orange-500'
  return 'ring-red-500'
}

function calculateGrade(score: number): string {
  if (score >= 8) return 'A+'
  if (score >= 7) return 'A'
  if (score >= 6) return 'A-'
  if (score >= 5) return 'B+'
  if (score >= 4) return 'B'
  if (score >= 3) return 'B-'
  if (score >= 2) return 'C+'
  if (score >= 1) return 'C'
  if (score >= 0) return 'C-'
  return 'D'
}

function handleImageError(e: Event) {
  const img = e.target as HTMLImageElement
  img.src = defaultAvatar
}

function selectPick(pick: any) {
  selectedPick.value = pick
}

// Load draft data
async function loadDraftData() {
  const leagueKey = leagueStore.activeLeagueId
  if (!leagueKey || !authStore.user?.id) return
  
  isLoading.value = true
  loadingMessage.value = 'Loading draft data...'
  
  try {
    await yahooService.initialize(authStore.user.id)
    
    // Get draft results
    loadingMessage.value = 'Fetching draft results...'
    const draftResults = await yahooService.getDraftResults(leagueKey)
    
    if (!draftResults.picks || draftResults.picks.length === 0) {
      draftPicks.value = []
      isLoading.value = false
      return
    }
    
    // Get league settings for categories
    loadingMessage.value = 'Loading league categories...'
    try {
      const settings = await yahooService.getLeagueSettings(leagueKey)
      leagueSettings.value = settings
      
      // Extract stat categories
      const statCats = settings?.stat_categories || []
      leagueCategories.value = statCats
        .filter((cat: any) => cat.is_only_display_stat !== '1')
        .map((cat: any) => getCategoryDisplayName(cat.stat_id) || cat.display_name)
        .filter((name: string) => name)
      
      if (leagueCategories.value.length === 0) {
        // Default categories if none found
        leagueCategories.value = ['R', 'HR', 'RBI', 'SB', 'AVG', 'W', 'SV', 'K', 'ERA', 'WHIP']
      }
    } catch (e) {
      console.log('Could not load league settings, using defaults')
      leagueCategories.value = ['R', 'HR', 'RBI', 'SB', 'AVG', 'W', 'SV', 'K', 'ERA', 'WHIP']
    }
    
    // Get player details and stats
    loadingMessage.value = 'Loading player stats...'
    const playerKeys = draftResults.picks.map((p: any) => p.player_key).filter(Boolean)
    const players = await yahooService.getPlayers(playerKeys)
    const stats = await yahooService.getPlayerStats(leagueKey, playerKeys)
    playerStats.value = stats
    
    // Get teams
    const standings = await yahooService.getStandings(leagueKey)
    teamsData.value = standings
    
    const teamLookup = new Map<string, any>()
    for (const team of standings) {
      teamLookup.set(team.team_key, team)
    }
    
    // Calculate category scores for each player
    loadingMessage.value = 'Calculating category impact...'
    
    // First, calculate league averages and totals for percentile calculation
    const categoryTotals: Record<string, number[]> = {}
    for (const cat of leagueCategories.value) {
      categoryTotals[cat] = []
    }
    
    for (const pick of draftResults.picks) {
      const stat = stats.get(pick.player_key)
      if (!stat?.stats) continue
      
      for (const cat of leagueCategories.value) {
        const statId = getStatIdForCategory(cat)
        const value = stat.stats[statId] || 0
        if (value > 0) {
          categoryTotals[cat].push(value)
        }
      }
    }
    
    // Calculate percentiles
    const categoryPercentiles: Record<string, number[]> = {}
    for (const cat of leagueCategories.value) {
      const isLowerBetter = ['ERA', 'WHIP', 'L', 'BS'].includes(cat)
      categoryPercentiles[cat] = [...categoryTotals[cat]].sort((a, b) => 
        isLowerBetter ? a - b : b - a
      )
    }
    
    function getPercentile(cat: string, value: number): number {
      const sorted = categoryPercentiles[cat]
      if (!sorted || sorted.length === 0 || value === 0) return 0
      const isLowerBetter = ['ERA', 'WHIP', 'L', 'BS'].includes(cat)
      const rank = sorted.findIndex(v => isLowerBetter ? v >= value : v <= value)
      if (rank === -1) return isLowerBetter ? 100 : 0
      return Math.round((1 - rank / sorted.length) * 100)
    }
    
    // Process draft picks
    const numTeams = standings.length || 12
    draftPicks.value = draftResults.picks.map((pick: any) => {
      const player = players.get(pick.player_key) || {}
      const stat = stats.get(pick.player_key) || {}
      const team = teamLookup.get(pick.team_key) || {}
      
      const pickInRound = ((pick.pick - 1) % numTeams) + 1
      
      // Calculate category score (sum of percentiles) and find best categories
      let categoryScore = 0
      let catCount = 0
      const playerStats = stat.stats || {}
      const categoryPerformance: Array<{category: string, value: number, percentile: number}> = []
      
      for (const cat of leagueCategories.value) {
        const statId = getStatIdForCategory(cat)
        const value = playerStats[statId] || 0
        if (value > 0) {
          const percentile = getPercentile(cat, value)
          categoryScore += percentile
          catCount++
          categoryPerformance.push({ category: cat, value, percentile })
        }
      }
      
      // Sort by percentile to find best categories
      const bestCategories = [...categoryPerformance]
        .sort((a, b) => b.percentile - a.percentile)
        .slice(0, 5) // Top 5 categories
      
      const avgPercentile = catCount > 0 ? categoryScore / catCount : 0
      
      // Calculate value score (expected vs actual)
      const expectedRank = pick.pick
      const allScores = draftResults.picks.map((p: any) => {
        const s = stats.get(p.player_key)
        let score = 0
        let count = 0
        for (const cat of leagueCategories.value) {
          const statId = getStatIdForCategory(cat)
          const value = s?.stats?.[statId] || 0
          if (value > 0) {
            score += getPercentile(cat, value)
            count++
          }
        }
        return { pick: p.pick, score: count > 0 ? score / count : 0 }
      }).sort((a, b) => b.score - a.score)
      
      const actualRank = allScores.findIndex(s => s.pick === pick.pick) + 1
      const valueScore = expectedRank - actualRank
      
      return {
        pick: pick.pick,
        round: pick.round,
        pickInRound,
        team_key: pick.team_key,
        team_name: team.name || 'Unknown Team',
        team_logo: team.logo_url || '',
        player_key: pick.player_key,
        player_name: player.name || 'Unknown Player',
        position: player.position || 'Unknown',
        mlb_team: player.team || '',
        headshot: player.headshot || '',
        stats: playerStats,
        categoryScore: avgPercentile,
        categoryPercentile: avgPercentile,
        bestCategories,
        valueScore,
        grade: calculateGrade(valueScore / 5)
      }
    })
    
    console.log('Processed draft picks:', draftPicks.value.length)
    console.log('League categories:', leagueCategories.value)
    
  } catch (e) {
    console.error('Error loading draft data:', e)
    draftPicks.value = []
  } finally {
    isLoading.value = false
  }
}

// Watch for league changes
watch(() => leagueStore.activeLeagueId, (newId) => {
  if (newId) {
    loadDraftData()
  }
}, { immediate: true })

onMounted(() => {
  if (leagueStore.activeLeagueId) {
    loadDraftData()
  }
})
</script>

<style scoped>
.select {
  @apply bg-dark-card border border-dark-border rounded-lg px-3 py-2 text-dark-text focus:outline-none focus:ring-2 focus:ring-primary;
}

.card {
  @apply bg-dark-card rounded-xl border border-dark-border;
}

.card-header {
  @apply p-4 border-b border-dark-border;
}

.card-title {
  @apply text-lg font-bold text-dark-text;
}

.card-subtitle {
  @apply text-sm text-dark-textMuted;
}

.card-body {
  @apply p-4;
}
</style>
