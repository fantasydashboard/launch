<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="text-3xl font-bold text-dark-text mb-2">{{ isDynastyMode ? 'Dynasty Values' : 'Player Projections' }}</h1>
        <p class="text-base text-dark-textMuted">
          {{ isDynastyMode 
            ? 'Trade values powered by DynastyProcess.com crowdsourced rankings' 
            : 'Rest of season rankings with position-adjusted value analysis' 
          }}
        </p>
      </div>
      <div class="flex items-center gap-3">
        <!-- Mode Toggle (Redraft / Dynasty) -->
        <div class="flex items-center gap-2 bg-dark-card rounded-lg p-1">
          <button
            @click="isDynastyMode = false"
            :class="!isDynastyMode ? 'bg-primary text-gray-900' : 'text-dark-textMuted hover:text-dark-text'"
            class="px-4 py-2 rounded-lg font-medium transition-all text-sm"
          >
            Redraft
          </button>
          <button
            @click="isDynastyMode = true"
            :class="isDynastyMode ? 'bg-primary text-gray-900' : 'text-dark-textMuted hover:text-dark-text'"
            class="px-4 py-2 rounded-lg font-medium transition-all text-sm"
          >
            Dynasty
          </button>
        </div>
        
        <!-- Superflex Toggle (Dynasty mode only) -->
        <div v-if="isDynastyMode" class="flex items-center gap-2 bg-dark-card rounded-lg p-1">
          <button
            @click="isSuperFlex = false"
            :class="!isSuperFlex ? 'bg-cyan-500 text-gray-900' : 'text-dark-textMuted hover:text-dark-text'"
            class="px-3 py-2 rounded-lg font-medium transition-all text-sm"
          >
            1QB
          </button>
          <button
            @click="isSuperFlex = true"
            :class="isSuperFlex ? 'bg-cyan-500 text-gray-900' : 'text-dark-textMuted hover:text-dark-text'"
            class="px-3 py-2 rounded-lg font-medium transition-all text-sm"
          >
            SF
          </button>
        </div>
        
        <!-- Week Selector (Redraft mode only) -->
        <select v-if="!isDynastyMode" v-model="selectedWeek" @change="loadProjections" class="select">
          <option v-for="week in availableWeeks" :key="week" :value="week">
            {{ week === currentWeek ? `Week ${week} (Current)` : `Week ${week}` }}
          </option>
        </select>
        
        <!-- Refresh button (Dynasty mode only) -->
        <button 
          v-if="isDynastyMode"
          @click="refreshDynastyValues" 
          class="px-4 py-2 rounded-lg bg-dark-card hover:bg-dark-border/50 text-dark-textMuted transition-all flex items-center gap-2"
          :disabled="isLoading"
        >
          <span :class="{ 'animate-spin': isLoading }">🔄</span>
          Refresh
        </button>
      </div>
    </div>

    <!-- Not a Dynasty League Warning (Dynasty mode only) -->
    <div v-if="isDynastyMode && !isDynastyLeague" class="card bg-yellow-500/10 border border-yellow-500/30">
      <div class="card-body py-6 text-center">
        <div class="text-4xl mb-3">⚠️</div>
        <h3 class="text-xl font-bold text-yellow-400 mb-2">Not a Dynasty League</h3>
        <p class="text-dark-textMuted">
          This league appears to be a redraft league. Dynasty values are most useful for keeper and dynasty formats.
          <br>You can still view values, but they're designed for long-term player valuation.
        </p>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="flex gap-2">
      <button
        v-for="tab in currentTabOptions"
        :key="tab.id"
        @click="activeTab = tab.id"
        :class="activeTab === tab.id ? 'bg-primary text-gray-900' : 'bg-dark-card text-dark-textSecondary hover:bg-dark-border/50'"
        class="px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2"
      >
        <span class="text-xl">{{ tab.icon }}</span>
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

    <!-- REST OF SEASON TAB -->
    <template v-else-if="activeTab === 'ros'">
      <!-- ==================== DYNASTY MODE: Player Values ==================== -->
      <template v-if="isDynastyMode">
        <!-- Filters -->
        <div class="card">
          <div class="card-body py-4">
            <div class="flex flex-wrap items-center gap-4">
              <!-- Position Filter -->
              <div class="flex items-center gap-2">
                <span class="text-dark-textMuted font-medium">Position:</span>
                <div class="flex gap-1">
                  <button
                    v-for="pos in ['All', 'QB', 'RB', 'WR', 'TE']"
                    :key="pos"
                    @click="dynastySelectedPosition = pos"
                    :class="dynastySelectedPosition === pos ? 'bg-primary text-gray-900' : 'bg-dark-border/50 text-dark-textSecondary'"
                    class="px-3 py-1.5 rounded-lg font-medium transition-all text-sm"
                  >
                    {{ pos }}
                  </button>
                </div>
              </div>
              
              <!-- Ownership Filter -->
              <div class="flex items-center gap-2">
                <span class="text-dark-textMuted font-medium">Show:</span>
                <div class="flex gap-1">
                  <button
                    @click="dynastyOwnershipFilter = 'all'"
                    :class="dynastyOwnershipFilter === 'all' ? 'bg-primary text-gray-900' : 'bg-dark-border/50 text-dark-textSecondary'"
                    class="px-3 py-1.5 rounded-lg font-medium transition-all text-sm"
                  >
                    All
                  </button>
                  <button
                    @click="dynastyOwnershipFilter = 'rostered'"
                    :class="dynastyOwnershipFilter === 'rostered' ? 'bg-primary text-gray-900' : 'bg-dark-border/50 text-dark-textSecondary'"
                    class="px-3 py-1.5 rounded-lg font-medium transition-all text-sm"
                  >
                    Rostered
                  </button>
                  <button
                    @click="dynastyOwnershipFilter = 'available'"
                    :class="dynastyOwnershipFilter === 'available' ? 'bg-primary text-gray-900' : 'bg-dark-border/50 text-dark-textSecondary'"
                    class="px-3 py-1.5 rounded-lg font-medium transition-all text-sm"
                  >
                    Free Agents
                  </button>
                </div>
              </div>

              <!-- Tier Filter -->
              <div class="flex items-center gap-2">
                <span class="text-dark-textMuted font-medium">Tier:</span>
                <select v-model="dynastySelectedTier" class="select text-sm">
                  <option value="all">All Tiers</option>
                  <option value="Elite">Elite</option>
                  <option value="Starter+">Starter+</option>
                  <option value="Starter">Starter</option>
                  <option value="Bench">Bench</option>
                  <option value="Taxi">Taxi</option>
                </select>
              </div>

              <!-- Search -->
              <div class="flex-1 min-w-[200px]">
                <input 
                  v-model="dynastySearchQuery"
                  type="text"
                  placeholder="Search players..."
                  class="w-full px-4 py-2 rounded-lg bg-dark-border/30 text-dark-text placeholder-dark-textMuted border border-dark-border/50 focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Dynasty Player Values Table -->
        <div class="card">
          <div class="card-header">
            <div class="flex items-center gap-2">
              <span class="text-2xl">📊</span>
              <h2 class="card-title">Player Dynasty Values</h2>
            </div>
            <span class="text-sm text-dark-textMuted">{{ filteredDynastyPlayers.length }} players</span>
          </div>
          <div class="card-body p-0">
            <div class="overflow-x-auto max-h-[70vh] overflow-y-auto">
              <table class="w-full">
                <thead class="bg-dark-border/30 sticky top-0 z-10">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-12">#</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase tracking-wider">Player</th>
                    <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-16">Pos</th>
                    <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-16">Age</th>
                    <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-24">Value</th>
                    <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-20">Tier</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase tracking-wider">Owner</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-dark-border/30">
                  <tr 
                    v-for="(player, index) in filteredDynastyPlayers" 
                    :key="player.player_id"
                    :class="isDynastyMyPlayer(player.player_id) ? 'bg-primary/10' : 'hover:bg-dark-border/20'"
                    class="transition-colors"
                  >
                    <td class="px-4 py-3 text-dark-textMuted text-sm">{{ index + 1 }}</td>
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                          <img :src="getPlayerImageUrl(player.player_id)" :alt="player.player_name" class="w-full h-full object-cover" @error="handleImageError" />
                        </div>
                        <div>
                          <div class="font-semibold text-dark-text">{{ player.player_name }}</div>
                          <div class="text-xs text-dark-textMuted">{{ player.team || 'FA' }}</div>
                        </div>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <span class="px-2 py-1 rounded text-xs font-bold" :class="getPositionColorClass(player.position)">
                        {{ player.position }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <span :class="player.age < 25 ? 'text-green-400' : player.age > 28 ? 'text-orange-400' : 'text-dark-text'">
                        {{ player.age > 0 ? player.age.toFixed(1) : '—' }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <span class="text-lg font-black text-dark-text">
                        {{ formatDynastyVal(isSuperFlex ? player.value_2qb : player.value_1qb) }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <span 
                        class="px-2 py-1 rounded text-xs font-bold"
                        :class="getTierColorClass(isSuperFlex ? player.tier_2qb : player.tier_1qb)"
                      >
                        {{ isSuperFlex ? player.tier_2qb : player.tier_1qb }}
                      </span>
                    </td>
                    <td class="px-4 py-3">
                      <span v-if="getDynastyPlayerOwner(player.player_id)" class="text-sm text-dark-textMuted">
                        {{ getDynastyPlayerOwner(player.player_id) }}
                      </span>
                      <span v-else class="text-sm text-green-400">Free Agent</span>
                    </td>
                  </tr>
                  <tr v-if="filteredDynastyPlayers.length === 0">
                    <td colspan="7" class="px-4 py-8 text-center text-dark-textMuted">
                      No players match your filters
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        <!-- Dynasty Attribution -->
        <div class="text-center text-sm text-dark-textMuted py-4">
          Dynasty values powered by <a href="https://dynastyprocess.com" target="_blank" class="text-primary hover:underline">DynastyProcess.com</a>
          • Updated weekly • <span class="text-dark-textMuted/70">Last refresh: {{ dynastyLastRefresh }}</span>
        </div>
      </template>
      
      <!-- ==================== REDRAFT MODE: Rest of Season ==================== -->
      <template v-else>
      <!-- Custom Rankings Indicator OR Customize Panel Header -->
      <div v-if="hasCustomRankings" class="card bg-primary/10 border-primary/30">
        <div class="card-body py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="text-2xl">✓</span>
              <div>
                <h3 class="font-semibold text-primary">Using Custom Rankings</h3>
                <p class="text-sm text-dark-textMuted">
                  Week {{ customRankingsWeek }} • {{ customRankingsCount }} players loaded
                </p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <button @click="clearCustomRankings" class="px-4 py-2 rounded-lg bg-dark-card hover:bg-dark-border/50 text-dark-text font-medium transition-colors">
                Reset to Default Rankings
              </button>
              <button @click="showProjectionSettings = true" class="p-2 rounded-lg hover:bg-dark-border/50 transition-colors" title="Projection Settings">
                <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Ranking Customizer Panel with Settings Gear -->
      <div v-if="!hasCustomRankings" class="relative">
        <button 
          @click="showProjectionSettings = true" 
          class="absolute top-4 right-4 p-2 rounded-lg hover:bg-dark-border/50 transition-colors z-10" 
          title="Projection Settings"
        >
          <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        <RankingCustomizer 
          v-model="rankingFactors"
          @apply="loadProjections"
        />
      </div>

      <!-- Controls Card -->
      <div class="card">
        <div class="card-body py-4">
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <!-- Position Filters -->
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-dark-textMuted font-medium">Positions:</span>
              <div class="flex gap-2">
                <button
                  v-for="pos in positionFilters"
                  :key="pos.id"
                  @click="togglePositionFilter(pos.id)"
                  :class="selectedPositions.includes(pos.id) ? 'bg-primary text-gray-900' : 'bg-dark-border/50 text-dark-textSecondary'"
                  class="px-4 py-2 rounded-lg font-medium transition-all text-sm"
                >
                  {{ pos.label }}
                </button>
              </div>
            </div>
            
            <!-- View Toggle & Filters -->
            <div class="flex items-center gap-4 flex-wrap">
              <!-- Ranking Mode Toggle -->
              <div v-if="!hasCustomRankings" class="flex items-center gap-2 bg-dark-border/30 rounded-lg p-1">
                <button
                  @click="rankingMode = 'vor'"
                  :class="rankingMode === 'vor' ? 'bg-primary text-gray-900' : 'text-dark-textSecondary hover:text-dark-text'"
                  class="px-3 py-1.5 rounded-md text-sm font-medium transition-all"
                >
                  Position-Adjusted
                </button>
                <button
                  @click="rankingMode = 'raw'"
                  :class="rankingMode === 'raw' ? 'bg-primary text-gray-900' : 'text-dark-textSecondary hover:text-dark-text'"
                  class="px-3 py-1.5 rounded-md text-sm font-medium transition-all"
                >
                  Raw Points
                </button>
              </div>
              
              <label class="flex items-center gap-2 text-sm text-dark-textMuted cursor-pointer">
                <input type="checkbox" v-model="showOnlyMyPlayers" class="rounded accent-primary w-4 h-4" />
                <span>My Players Only</span>
              </label>
              
              <label class="flex items-center gap-2 text-sm text-dark-textMuted cursor-pointer">
                <input type="checkbox" v-model="showOnlyFreeAgents" class="rounded accent-cyan-400 w-4 h-4" />
                <span>Free Agents Only</span>
              </label>
              
              <div class="text-sm text-dark-textMuted">
                {{ filteredPlayers.length }} players
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- VOR Explanation Card -->
      <div v-if="rankingMode === 'vor' && !hasCustomRankings" class="card bg-primary/5 border-primary/20">
        <div class="card-body py-3">
          <div class="flex items-start gap-3">
            <span class="text-xl">💡</span>
            <div class="text-sm">
              <span class="font-semibold text-dark-text">Position-Adjusted Rankings (VOR)</span>
              <span class="text-dark-textMuted"> — Players ranked by Value Over Replacement. This accounts for position scarcity: a RB who scores 18 PPG may be more valuable than a QB who scores 24 PPG because replacement-level RBs score much less.</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Legend Card -->
      <div class="card">
        <div class="card-body py-3">
          <div class="flex items-center justify-between flex-wrap gap-4">
            <div class="flex items-center gap-6 text-sm">
              <div class="flex items-center gap-2">
                <div class="w-4 h-4 rounded bg-primary/30 border-l-2 border-primary"></div>
                <span class="text-dark-textMuted">My Players</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-4 h-4 rounded bg-cyan-500/20 border-l-2 border-cyan-400"></div>
                <span class="text-dark-textMuted">Free Agents</span>
              </div>
            </div>
            <div v-if="!hasCustomRankings" class="flex items-center gap-6 text-sm">
              <span class="text-dark-textMuted font-medium">Replacement Baselines:</span>
              <div v-for="(baseline, pos) in replacementBaselines" :key="pos" class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded text-xs font-bold" :class="getPositionClass(pos)">{{ pos }}</span>
                <span class="text-dark-textMuted">{{ baseline.rank }}</span>
                <span class="text-dark-text font-medium">{{ baseline.ppg.toFixed(1) }} PPG</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Rankings Table -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">📊</span>
            <h2 class="card-title">
              {{ hasCustomRankings ? 'Custom Rankings' : (rankingMode === 'vor' ? 'Position-Adjusted Rankings' : 'Raw Points Rankings') }}
              <span class="text-dark-textMuted font-normal text-base ml-2">Week {{ selectedWeek }}</span>
            </h2>
          </div>
          <div v-if="lastUpdated" class="text-sm text-dark-textMuted">
            Updated: {{ lastUpdated }}
          </div>
        </div>
        <div class="card-body p-0">
          <div class="overflow-x-auto max-h-[70vh] overflow-y-auto">
            <table class="w-full">
              <thead class="bg-dark-border/30 sticky top-0 z-10">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-16">Rank</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase tracking-wider">Player</th>
                  <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-16">Pos</th>
                  <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-20">Pos Rank</th>
                  <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-16">Δ</th>
                  <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-28 cursor-pointer hover:text-dark-text" @click="sortBy('rosSOS')">
                    ROS SOS
                    <span v-if="sortColumn === 'rosSOS'" class="ml-1">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                  </th>
                  <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-28 cursor-pointer hover:text-dark-text" @click="sortBy('next4SOS')">
                    Next 4
                    <span v-if="sortColumn === 'next4SOS'" class="ml-1">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                  </th>
                  <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-20 cursor-pointer hover:text-dark-text" @click="sortBy('ppg')">
                    PPG
                    <span v-if="sortColumn === 'ppg'" class="ml-1">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                  </th>
                  <th v-if="rankingMode === 'vor' && !hasCustomRankings" class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-20 cursor-pointer hover:text-dark-text" @click="sortBy('vor')">
                    VOR
                    <span v-if="sortColumn === 'vor'" class="ml-1">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                  </th>
                  <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-20">Bye</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-dark-border/30">
                <template v-for="(player, index) in filteredPlayers" :key="player.player_id">
                  <!-- Tier Break -->
                  <tr v-if="showTierBreak(player, index)" class="bg-dark-border/10">
                    <td :colspan="(rankingMode === 'vor' && !hasCustomRankings) ? 10 : 9" class="px-4 py-2">
                      <div class="flex items-center gap-2">
                        <div class="h-px flex-1 bg-primary/30"></div>
                        <span class="text-xs font-bold text-primary uppercase tracking-wider">{{ getTierLabel(player.tier) }}</span>
                        <div class="h-px flex-1 bg-primary/30"></div>
                      </div>
                    </td>
                  </tr>
                  <!-- Player Row -->
                  <tr
                    :class="[getRowClass(player), expandedPlayerId === player.player_id ? 'bg-dark-border/30' : '']"
                    class="hover:bg-dark-border/20 transition-colors cursor-pointer"
                    @click="togglePlayerExpanded(player.player_id)"
                  >
                    <td class="px-4 py-3">
                      <span class="font-bold text-lg text-dark-text">{{ player.rosRank }}</span>
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-3">
                        <div class="relative">
                          <div class="w-10 h-10 rounded-full bg-dark-border overflow-hidden flex-shrink-0 ring-2" :class="getAvatarRingClass(player)">
                            <img v-if="player.player_id" :src="getPlayerImageUrl(player.player_id)" :alt="player.full_name" class="w-full h-full object-cover" @error="handleImageError" />
                          </div>
                          <div v-if="isMyPlayer(player.player_id)" class="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-lg">
                            <span class="text-xs text-gray-900 font-bold">★</span>
                          </div>
                          <div v-else-if="isFreeAgent(player.player_id)" class="absolute -top-1 -right-1 w-5 h-5 bg-cyan-400 rounded-full flex items-center justify-center shadow-lg">
                            <span class="text-xs text-gray-900 font-bold">+</span>
                          </div>
                        </div>
                        <div>
                          <div class="flex items-center gap-2">
                            <span class="font-semibold" :class="getPlayerNameClass(player)">{{ player.full_name }}</span>
                            <!-- Trend Indicator -->
                            <span v-if="player.trendIndicator === 'hot'" class="text-orange-400 text-sm" title="Hot - Recent performance above average">🔥</span>
                            <span v-else-if="player.trendIndicator === 'cold'" class="text-blue-400 text-sm" title="Cold - Recent performance below average">❄️</span>
                            <!-- Consistency Badge -->
                            <span v-if="player.consistencyRating === 'elite'" class="text-[10px] px-1 py-0.5 rounded bg-green-500/20 text-green-400" title="Elite consistency">Steady</span>
                            <span v-else-if="player.consistencyRating === 'boom-bust'" class="text-[10px] px-1 py-0.5 rounded bg-purple-500/20 text-purple-400" title="High variance">Boom/Bust</span>
                            <span v-if="player.injury_status" class="text-xs px-1.5 py-0.5 rounded font-medium"
                              :class="getInjuryClass(player.injury_status)">
                              {{ player.injury_status }}
                            </span>
                          </div>
                          <div class="flex items-center gap-2 text-xs text-dark-textMuted">
                            <span>{{ player.team || 'FA' }}</span>
                            <template v-if="getFantasyOwner(player.player_id)">
                              <span class="text-dark-border">•</span>
                              <span class="flex items-center gap-1">
                                <img src="https://sleepercdn.com/images/v2/icons/league/league_avatar_mint.png" class="w-3 h-3" alt="Sleeper" />
                                <span :class="isMyPlayer(player.player_id) ? 'text-primary' : 'text-dark-textMuted'">
                                  {{ getFantasyOwner(player.player_id) }}
                                </span>
                              </span>
                            </template>
                            <template v-else>
                              <span class="text-dark-border">•</span>
                              <span class="text-cyan-400 font-medium">Free Agent</span>
                            </template>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <span class="px-2 py-1 rounded text-xs font-bold" :class="getPositionClass(player.position)">
                        {{ player.position }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <span class="font-medium text-dark-text">{{ player.positionRank }}</span>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <span v-if="player.rankChange !== 0" :class="player.rankChange > 0 ? 'text-green-400' : 'text-red-400'" class="font-medium">
                        {{ player.rankChange > 0 ? '↑' : '↓' }}{{ Math.abs(player.rankChange) }}
                      </span>
                      <span v-else class="text-dark-textMuted">—</span>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <div class="flex items-center justify-center gap-1">
                        <div class="w-14 h-2 rounded-full bg-dark-border/50 overflow-hidden">
                          <div class="h-full rounded-full transition-all" :class="getSosBarClass(player.rosSOS)" :style="{ width: getSosBarWidth(player.rosSOS) }"></div>
                        </div>
                        <span class="text-xs font-medium w-10 text-right" :class="getSosTextClass(player.rosSOS)">
                          {{ formatSOS(player.rosSOS) }}
                        </span>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <div class="flex items-center justify-center gap-1">
                        <div class="w-14 h-2 rounded-full bg-dark-border/50 overflow-hidden">
                          <div class="h-full rounded-full transition-all" :class="getSosBarClass(player.next4SOS)" :style="{ width: getSosBarWidth(player.next4SOS) }"></div>
                        </div>
                        <span class="text-xs font-medium w-10 text-right" :class="getSosTextClass(player.next4SOS)">
                          {{ formatSOS(player.next4SOS) }}
                        </span>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <span class="font-bold text-dark-text">{{ player.ppg.toFixed(1) }}</span>
                    </td>
                    <td v-if="rankingMode === 'vor' && !hasCustomRankings" class="px-4 py-3 text-center">
                      <span class="font-bold" :class="player.vor > 0 ? 'text-green-400' : player.vor < -2 ? 'text-red-400' : 'text-primary'">
                        {{ player.vor >= 0 ? '+' : '' }}{{ player.vor.toFixed(1) }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <div class="flex items-center justify-center gap-1">
                        <template v-if="player.byeWeek">
                          <span v-if="player.byeWeek < selectedWeek" class="text-green-400 font-medium">✓</span>
                          <span v-else-if="player.byeWeek === selectedWeek" class="text-red-400 font-medium">✗</span>
                          <span 
                            class="font-medium"
                            :class="player.byeWeek === selectedWeek ? 'text-red-400' : player.byeWeek < selectedWeek ? 'text-green-400' : 'text-dark-text'"
                          >
                            {{ player.byeWeek }}
                          </span>
                        </template>
                        <span v-else class="text-dark-textMuted">—</span>
                      </div>
                    </td>
                  </tr>
                  <!-- Expanded Player Detail -->
                  <PlayerExpandedDetail
                    v-if="expandedPlayerId === player.player_id"
                    :player="player"
                    :colspan="(rankingMode === 'vor' && !hasCustomRankings) ? 10 : 9"
                    :current-week="selectedWeek"
                    :league-id="leagueStore.activeLeagueId"
                    @close="expandedPlayerId = null"
                  />
                </template>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- My Team Summary Card -->
      <div v-if="myTeamPlayers.length > 0" class="card border-primary/30 bg-primary/5">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">⭐</span>
            <h2 class="card-title">My Team Summary</h2>
          </div>
          <span class="text-sm text-dark-textMuted">{{ myTeamPlayers.length }} players ranked</span>
        </div>
        <div class="card-body">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div v-for="pos in ['QB', 'RB', 'WR', 'TE']" :key="pos" class="bg-dark-card rounded-lg p-3">
              <div class="flex items-center justify-between mb-2">
                <span class="px-2 py-0.5 rounded text-xs font-bold" :class="getPositionClass(pos)">{{ pos }}</span>
                <span class="text-xs text-dark-textMuted">{{ myTeamByPosition[pos]?.length || 0 }} ranked</span>
              </div>
              <div class="space-y-1.5">
                <div v-for="player in (myTeamByPosition[pos] || []).slice(0, 4)" :key="player.player_id" class="flex items-center justify-between text-sm">
                  <span class="text-dark-text truncate flex-1 mr-2">{{ getLastName(player.full_name) }}</span>
                  <div class="flex items-center gap-2">
                    <span class="text-primary font-bold">#{{ player.rosRank }}</span>
                    <span v-if="rankingMode === 'vor' && !hasCustomRankings" class="text-xs" :class="player.vor >= 0 ? 'text-green-400' : 'text-red-400'">
                      {{ player.vor >= 0 ? '+' : '' }}{{ player.vor.toFixed(1) }}
                    </span>
                  </div>
                </div>
                <div v-if="!myTeamByPosition[pos]?.length" class="text-xs text-dark-textMuted italic">
                  No ranked players
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </template>
    </template>

    <!-- TEAMS TAB -->
    <template v-else-if="activeTab === 'teams'">
      <!-- ==================== DYNASTY MODE: Team Values ==================== -->
      <template v-if="isDynastyMode">
        <!-- League Summary -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="card bg-gradient-to-br from-primary/20 to-primary/5">
            <div class="card-body py-4 text-center">
              <div class="text-3xl mb-1">💰</div>
              <div class="text-2xl font-black text-primary">{{ formatDynastyVal(dynastyLeagueAvgValue) }}</div>
              <div class="text-xs text-dark-textMuted">League Avg Value</div>
            </div>
          </div>
          <div class="card bg-gradient-to-br from-green-500/20 to-green-500/5">
            <div class="card-body py-4 text-center">
              <div class="text-3xl mb-1">👑</div>
              <div class="text-lg font-bold text-green-400 truncate">{{ dynastyTopTeam?.team_name || 'N/A' }}</div>
              <div class="text-xs text-dark-textMuted">Highest Value Team</div>
            </div>
          </div>
          <div class="card bg-gradient-to-br from-cyan-500/20 to-cyan-500/5">
            <div class="card-body py-4 text-center">
              <div class="text-3xl mb-1">🎯</div>
              <div class="text-2xl font-black text-cyan-400">{{ dynastyContenderCount }}</div>
              <div class="text-xs text-dark-textMuted">Contenders</div>
            </div>
          </div>
          <div class="card bg-gradient-to-br from-purple-500/20 to-purple-500/5">
            <div class="card-body py-4 text-center">
              <div class="text-3xl mb-1">🔨</div>
              <div class="text-2xl font-black text-purple-400">{{ dynastyRebuilderCount }}</div>
              <div class="text-xs text-dark-textMuted">Rebuilding</div>
            </div>
          </div>
        </div>

        <!-- Dynasty Team Rankings -->
        <div class="card">
          <div class="card-header">
            <div class="flex items-center gap-2">
              <span class="text-2xl">🏆</span>
              <h2 class="card-title">Team Dynasty Values</h2>
            </div>
            <span class="text-sm text-dark-textMuted">{{ isSuperFlex ? 'SuperFlex' : '1QB' }} values</span>
          </div>
          <div class="card-body p-0">
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead class="bg-dark-border/30">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-12">#</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase tracking-wider">Team</th>
                    <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-24">Value</th>
                    <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-24">Status</th>
                    <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-16">
                      <span class="text-red-400">QB</span>
                    </th>
                    <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-16">
                      <span class="text-green-400">RB</span>
                    </th>
                    <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-16">
                      <span class="text-blue-400">WR</span>
                    </th>
                    <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-16">
                      <span class="text-yellow-400">TE</span>
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-dark-border/30">
                  <tr 
                    v-for="(team, index) in sortedDynastyTeamValues" 
                    :key="team.roster_id"
                    :class="team.roster_id === leagueStore.rosters.find(r => r.owner_id === leagueStore.currentUserId)?.roster_id ? 'bg-primary/10' : 'hover:bg-dark-border/20'"
                    class="transition-colors"
                  >
                    <td class="px-4 py-3">
                      <span class="font-bold" :class="index < 3 ? 'text-primary' : 'text-dark-textMuted'">{{ index + 1 }}</span>
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                          <img :src="team.avatar_url" :alt="team.team_name" class="w-full h-full object-cover" @error="handleImageError" />
                        </div>
                        <div class="font-semibold text-dark-text">{{ team.team_name }}</div>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <span class="text-lg font-black" :class="getDynastyValueColorClass(team.total_value, dynastyLeagueAvgValue)">
                        {{ formatDynastyVal(team.total_value) }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <span class="px-2 py-1 rounded text-xs font-bold" :class="getDynastyStatusClass(team.contender_score)">
                        {{ getDynastyStatusLabel(team.contender_score) }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <span :class="getDynastyPositionValueClass(isSuperFlex ? team.qb_value_2qb : team.qb_value_1qb, 'QB')">
                        {{ formatDynastyVal(isSuperFlex ? team.qb_value_2qb : team.qb_value_1qb) }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <span :class="getDynastyPositionValueClass(team.rb_value, 'RB')">
                        {{ formatDynastyVal(team.rb_value) }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <span :class="getDynastyPositionValueClass(team.wr_value, 'WR')">
                        {{ formatDynastyVal(team.wr_value) }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <span :class="getDynastyPositionValueClass(team.te_value, 'TE')">
                        {{ formatDynastyVal(team.te_value) }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        <!-- Dynasty Attribution -->
        <div class="text-center text-sm text-dark-textMuted py-4">
          Dynasty values powered by <a href="https://dynastyprocess.com" target="_blank" class="text-primary hover:underline">DynastyProcess.com</a>
          • Updated weekly • <span class="text-dark-textMuted/70">Last refresh: {{ dynastyLastRefresh }}</span>
        </div>
      </template>
      
      <!-- ==================== REDRAFT MODE: Team Rankings ==================== -->
      <template v-else>
      <!-- League Summary Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="card bg-gradient-to-br from-primary/20 to-primary/5">
          <div class="card-body py-4 text-center">
            <div class="text-3xl mb-1">🏆</div>
            <div class="text-2xl font-black text-primary">{{ leagueAvgGrade }}</div>
            <div class="text-xs text-dark-textMuted">League Avg Grade</div>
          </div>
        </div>
        <div class="card bg-gradient-to-br from-green-500/20 to-green-500/5">
          <div class="card-body py-4 text-center">
            <div class="text-3xl mb-1">👑</div>
            <div class="text-lg font-bold text-green-400 truncate">{{ topRankedTeam?.teamName || 'N/A' }}</div>
            <div class="text-xs text-dark-textMuted">Best Roster</div>
          </div>
        </div>
        <div class="card bg-gradient-to-br from-cyan-500/20 to-cyan-500/5">
          <div class="card-body py-4 text-center">
            <div class="text-3xl mb-1">🎯</div>
            <div class="text-2xl font-black text-cyan-400">{{ contenderTeamCount }}</div>
            <div class="text-xs text-dark-textMuted">Contenders</div>
          </div>
        </div>
        <div class="card bg-gradient-to-br from-red-500/20 to-red-500/5">
          <div class="card-body py-4 text-center">
            <div class="text-3xl mb-1">📉</div>
            <div class="text-2xl font-black text-red-400">{{ rebuildingTeamCount }}</div>
            <div class="text-xs text-dark-textMuted">Rebuilding</div>
          </div>
        </div>
      </div>

      <!-- Roster Requirements Info -->
      <div class="card">
        <div class="card-body py-3">
          <div class="flex flex-wrap items-center justify-center gap-4 text-sm">
            <span class="text-dark-textMuted font-medium">Starting Lineup:</span>
            <span class="px-2 py-1 rounded bg-red-500/20 text-red-400 font-bold">{{ rosterRequirements.QB }} QB</span>
            <span class="px-2 py-1 rounded bg-green-500/20 text-green-400 font-bold">{{ rosterRequirements.RB }} RB</span>
            <span class="px-2 py-1 rounded bg-blue-500/20 text-blue-400 font-bold">{{ rosterRequirements.WR }} WR</span>
            <span class="px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 font-bold">{{ rosterRequirements.TE }} TE</span>
            <span v-if="rosterRequirements.FLEX" class="px-2 py-1 rounded bg-purple-500/20 text-purple-400 font-bold">{{ rosterRequirements.FLEX }} FLEX</span>
            <span v-if="rosterRequirements.SUPER_FLEX" class="px-2 py-1 rounded bg-orange-500/20 text-orange-400 font-bold">{{ rosterRequirements.SUPER_FLEX }} SF</span>
          </div>
        </div>
      </div>

      <!-- Team Rankings Table -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">📊</span>
            <h2 class="card-title">Team Roster Rankings</h2>
          </div>
          <span class="text-sm text-dark-textMuted">
            Based on ROS projections • Graded on starter quality
          </span>
        </div>
        <div class="card-body p-0">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-dark-border/30">
                <tr>
                  <th class="px-3 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-10">#</th>
                  <th class="px-3 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase tracking-wider">Team</th>
                  <th class="px-3 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-16">Grade</th>
                  <th class="px-3 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-24">Status</th>
                  <th class="px-3 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-12">
                    <span class="text-red-400">QB</span>
                  </th>
                  <th class="px-3 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-12">
                    <span class="text-green-400">RB</span>
                  </th>
                  <th class="px-3 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-12">
                    <span class="text-blue-400">WR</span>
                  </th>
                  <th class="px-3 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-12">
                    <span class="text-yellow-400">TE</span>
                  </th>
                  <th class="px-3 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-12">
                    <span class="text-purple-400">FLX</span>
                  </th>
                  <th class="px-3 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase tracking-wider hidden lg:table-cell">Top Assets</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-dark-border/30">
                <template v-for="(team, index) in rankedTeamsWithStatus" :key="team.odwnerId">
                  <!-- Main Row -->
                  <tr 
                    :class="[
                      team.odwnerId === leagueStore.currentUserId ? 'bg-primary/10' : 'hover:bg-dark-border/20',
                      expandedTeamId === team.odwnerId ? 'bg-dark-border/30' : ''
                    ]"
                    class="transition-colors cursor-pointer"
                    @click="expandedTeamId = expandedTeamId === team.odwnerId ? null : team.odwnerId"
                  >
                    <td class="px-3 py-3">
                      <span class="font-bold" :class="index < 3 ? 'text-primary' : 'text-dark-textMuted'">
                        {{ index + 1 }}
                      </span>
                    </td>
                    <td class="px-3 py-3">
                      <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-full overflow-hidden bg-dark-border ring-2 flex-shrink-0" 
                             :class="team.odwnerId === leagueStore.currentUserId ? 'ring-primary' : 'ring-dark-border'">
                          <img :src="team.avatarUrl" :alt="team.teamName" class="w-full h-full object-cover" @error="handleTeamImageError" />
                        </div>
                        <div class="min-w-0">
                          <div class="font-semibold text-dark-text flex items-center gap-2 truncate">
                            {{ team.teamName }}
                            <span v-if="team.odwnerId === leagueStore.currentUserId" class="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded flex-shrink-0">You</span>
                          </div>
                          <div class="text-xs text-dark-textMuted truncate">{{ team.username }}</div>
                        </div>
                      </div>
                    </td>
                    <td class="px-3 py-3 text-center">
                      <span class="text-xl font-black" :class="getTeamGradeClass(team.overallGrade)">
                        {{ team.overallGrade }}
                      </span>
                    </td>
                    <td class="px-3 py-3 text-center">
                      <span 
                        class="px-2 py-1 rounded-full text-[10px] font-bold whitespace-nowrap"
                        :class="getTeamStatusClass(team.statusScore)"
                      >
                        {{ getTeamStatusLabel(team.statusScore) }}
                      </span>
                    </td>
                    <td class="px-3 py-3 text-center">
                      <span class="font-bold text-sm" :class="getPositionGradeClass(team.starterGrades.QB)">
                        {{ team.starterGrades.QB }}
                      </span>
                    </td>
                    <td class="px-3 py-3 text-center">
                      <span class="font-bold text-sm" :class="getPositionGradeClass(team.starterGrades.RB)">
                        {{ team.starterGrades.RB }}
                      </span>
                    </td>
                    <td class="px-3 py-3 text-center">
                      <span class="font-bold text-sm" :class="getPositionGradeClass(team.starterGrades.WR)">
                        {{ team.starterGrades.WR }}
                      </span>
                    </td>
                    <td class="px-3 py-3 text-center">
                      <span class="font-bold text-sm" :class="getPositionGradeClass(team.starterGrades.TE)">
                        {{ team.starterGrades.TE }}
                      </span>
                    </td>
                    <td class="px-3 py-3 text-center">
                      <span class="font-bold text-sm" :class="getPositionGradeClass(team.starterGrades.FLEX)">
                        {{ team.starterGrades.FLEX }}
                      </span>
                    </td>
                    <td class="px-3 py-3 hidden lg:table-cell">
                      <div class="flex flex-wrap gap-1">
                        <span 
                          v-for="asset in team.topAssets?.slice(0, 3)" 
                          :key="asset.player_id"
                          class="px-2 py-0.5 rounded text-xs font-medium"
                          :class="getAssetTierClass(asset.positionRank, asset.position)"
                        >
                          {{ asset.full_name?.split(' ').pop() }}
                        </span>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Expanded Detail Row -->
                  <tr v-if="expandedTeamId === team.odwnerId">
                    <td colspan="10" class="p-0">
                      <div class="bg-dark-card/50 border-t border-b border-primary/30">
                        <!-- Position Columns -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-dark-border/30">
                          <div v-for="pos in ['QB', 'RB', 'WR', 'TE', 'FLEX']" :key="pos" class="p-4">
                            <!-- Position Header -->
                            <div class="flex items-center justify-between mb-3">
                              <div class="flex items-center gap-2">
                                <span class="px-2 py-0.5 rounded text-xs font-bold" :class="getPositionClass(pos)">{{ pos }}</span>
                                <span class="text-lg font-bold" :class="getPositionGradeClass(team.starterGrades[pos])">
                                  {{ team.starterGrades[pos] }}
                                </span>
                              </div>
                              <span class="text-[10px] text-dark-textMuted">
                                {{ pos === 'FLEX' ? rosterRequirements.FLEX : rosterRequirements[pos] }} starter{{ (pos === 'FLEX' ? rosterRequirements.FLEX : rosterRequirements[pos]) > 1 ? 's' : '' }}
                              </span>
                            </div>
                            
                            <!-- Players List -->
                            <div class="space-y-1.5">
                              <div 
                                v-for="(player, pIdx) in getExpandedPositionPlayers(team, pos)" 
                                :key="player.player_id"
                                class="flex items-center gap-2 p-1.5 rounded-lg transition-colors"
                                :class="player.isStarter ? 'bg-dark-border/30' : 'opacity-60'"
                              >
                                <div class="w-7 h-7 rounded-full bg-dark-border overflow-hidden flex-shrink-0">
                                  <img :src="getPlayerImageUrl(player.player_id)" :alt="player.full_name" class="w-full h-full object-cover" @error="handleImageError" />
                                </div>
                                <div class="flex-1 min-w-0">
                                  <div class="flex items-center gap-1">
                                    <span class="font-medium text-dark-text text-xs truncate">{{ player.full_name }}</span>
                                    <span v-if="player.isStarter" class="text-[8px] text-primary">★</span>
                                  </div>
                                  <div class="text-[10px] text-dark-textMuted">{{ player.team || 'FA' }} • {{ player.ppg?.toFixed(1) || '0.0' }} PPG</div>
                                </div>
                                <div class="flex flex-col items-end gap-0.5">
                                  <span 
                                    class="px-1.5 py-0.5 rounded text-[10px] font-bold"
                                    :class="getPlayerGradeClass(player.playerGrade)"
                                  >
                                    {{ player.playerGrade }}
                                  </span>
                                  <span class="text-[9px] text-dark-textMuted">{{ player.position }}{{ player.positionRank }}</span>
                                </div>
                              </div>
                              
                              <div v-if="!getExpandedPositionPlayers(team, pos)?.length" class="text-center py-3">
                                <span class="text-xs text-dark-textMuted italic">No {{ pos }}s</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Trade Finder Card -->
      <div class="card mt-6">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">🔄</span>
            <h2 class="card-title">Trade Partner Finder</h2>
          </div>
          <span class="text-sm text-dark-textMuted">Teams with opposite strengths/weaknesses to yours</span>
        </div>
        <div class="card-body">
          <div v-if="tradePartners.length" class="space-y-3">
            <div 
              v-for="partner in tradePartners" 
              :key="partner.odwnerId"
              class="flex items-center justify-between p-4 rounded-lg hover:bg-dark-border/20 transition-colors"
            >
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-dark-border overflow-hidden">
                  <img :src="partner.avatarUrl" :alt="partner.teamName" class="w-full h-full object-cover" @error="handleTeamImageError" />
                </div>
                <div>
                  <div class="font-medium text-dark-text">{{ partner.teamName }}</div>
                  <div class="text-xs text-dark-textMuted">{{ partner.username }}</div>
                </div>
              </div>
              <div class="text-right">
                <div class="text-sm">
                  <span class="text-green-400">They need:</span>
                  <span class="text-dark-text ml-1">{{ partner.theyNeed.join(', ') }}</span>
                </div>
                <div class="text-sm">
                  <span class="text-primary">You need:</span>
                  <span class="text-dark-text ml-1">{{ partner.youNeed.join(', ') }}</span>
                </div>
              </div>
              <div class="text-center px-4">
                <div class="text-xl font-bold text-primary">{{ partner.matchScore }}%</div>
                <div class="text-xs text-dark-textMuted">Match</div>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-8 text-dark-textMuted">
            <p>No strong trade matches found based on team needs.</p>
          </div>
        </div>
      </div>
      </template>
    </template>

    <!-- THIS WEEK / PICK VALUES TAB -->
    <template v-else-if="activeTab === 'week'">
      <!-- ==================== DYNASTY MODE: Pick Values ==================== -->
      <template v-if="isDynastyMode">
        <div class="card">
          <div class="card-header">
            <div class="flex items-center gap-2">
              <span class="text-2xl">🎯</span>
              <h2 class="card-title">Draft Pick Values</h2>
            </div>
            <span class="text-sm text-dark-textMuted">{{ isSuperFlex ? 'SuperFlex' : '1QB' }} values</span>
          </div>
          <div class="card-body">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div v-for="pick in dynastyPickValues" :key="pick.pick" class="p-4 rounded-xl bg-dark-border/20">
                <div class="flex items-center justify-between mb-2">
                  <span class="font-bold text-dark-text">{{ pick.pick }}</span>
                  <span class="text-lg font-black text-primary">
                    {{ formatDynastyVal(isSuperFlex ? pick.value_2qb : pick.value_1qb) }}
                  </span>
                </div>
                <div class="h-2 bg-dark-border/30 rounded-full overflow-hidden">
                  <div 
                    class="h-full bg-primary rounded-full"
                    :style="{ width: getDynastyPickBarWidth(isSuperFlex ? pick.value_2qb : pick.value_1qb) }"
                  ></div>
                </div>
              </div>
            </div>
            
            <div v-if="dynastyPickValues.length === 0" class="py-8 text-center text-dark-textMuted">
              <div class="text-4xl mb-3">📋</div>
              <p>Draft pick values not available</p>
            </div>
          </div>
        </div>
        
        <!-- Dynasty Attribution -->
        <div class="text-center text-sm text-dark-textMuted py-4">
          Dynasty values powered by <a href="https://dynastyprocess.com" target="_blank" class="text-primary hover:underline">DynastyProcess.com</a>
          • Updated weekly • <span class="text-dark-textMuted/70">Last refresh: {{ dynastyLastRefresh }}</span>
        </div>
      </template>
      
      <!-- ==================== REDRAFT MODE: This Week ==================== -->
      <template v-else>
      
      <!-- Custom Rankings Indicator OR Customize Panel Header -->
      <div v-if="weeklyHasCustomRankings" class="card bg-primary/10 border-primary/30">
        <div class="card-body py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="text-2xl">✓</span>
              <div>
                <h3 class="font-semibold text-primary">Using Custom Weekly Rankings</h3>
                <p class="text-sm text-dark-textMuted">
                  Week {{ currentWeek }} • {{ weeklyCustomRankingsCount }} players loaded
                </p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <button @click="clearWeeklyCustomRankings" class="px-4 py-2 rounded-lg bg-dark-card hover:bg-dark-border/50 text-dark-text font-medium transition-colors">
                Reset to Default Rankings
              </button>
              <button @click="showWeeklyProjectionSettings = true" class="p-2 rounded-lg hover:bg-dark-border/50 transition-colors" title="Weekly Projection Settings">
                <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Weekly Ranking Customizer with Settings Gear -->
      <div v-if="!weeklyHasCustomRankings" class="relative">
        <button 
          @click="showWeeklyProjectionSettings = true" 
          class="absolute top-4 right-4 p-2 rounded-lg hover:bg-dark-border/50 transition-colors z-10" 
          title="Weekly Projection Settings"
        >
          <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        <WeeklyRankingCustomizer
          v-model="weeklyRankingFactors"
          @apply="loadWeeklyProjections"
        />
      </div>
      
      <!-- Header Card -->
      <div class="card">
        <div class="card-body">
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <!-- Title & Data Source -->
            <div class="flex items-center gap-4">
              <div>
                <h2 class="text-xl font-bold text-dark-text">Week {{ currentWeek }} Start/Sit Helper</h2>
                <p class="text-sm text-dark-textMuted mt-1">
                  <span v-if="weeklyHasCustomRankings" class="text-primary">✓ Using custom weekly rankings</span>
                  <span v-else-if="weeklyProjectionsLoaded" class="text-green-400">✓ Using Sleeper weekly projections</span>
                  <span v-else-if="weeklyProjectionsLoading" class="text-primary animate-pulse">Loading Sleeper projections...</span>
                  <span v-else>Using season PPG averages</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Legend Card -->
      <div class="card">
        <div class="card-body py-3">
          <div class="flex items-center justify-between flex-wrap gap-4">
            <div class="flex items-center gap-6 text-sm">
              <div class="flex items-center gap-2">
                <div class="w-4 h-4 rounded bg-primary/30 border-l-2 border-primary"></div>
                <span class="text-dark-textMuted">My Players</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-4 h-4 rounded bg-cyan-500/20 border-l-2 border-cyan-400"></div>
                <span class="text-dark-textMuted">Free Agents</span>
              </div>
            </div>
            <div class="text-sm text-dark-textMuted">
              Roster: {{ rosterRequirements.QB }} QB, {{ rosterRequirements.RB }} RB, {{ rosterRequirements.WR }} WR, {{ rosterRequirements.TE }} TE, {{ rosterRequirements.FLEX }} FLEX
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content: Player List (wider) + Sidebar (narrower, right) -->
      <div class="flex gap-6">
        <!-- Position Rankings (Main content - grows to fill space) -->
        <div class="flex-1 min-w-0">
          <!-- Position Selector -->
          <div class="flex items-center gap-2 mb-4">
            <button
              v-for="pos in weeklyPositionOptions"
              :key="pos.id"
              @click="selectedWeeklyPosition = pos.id"
              :class="selectedWeeklyPosition === pos.id ? 'bg-primary text-gray-900' : 'bg-dark-border/30 text-dark-textSecondary hover:text-dark-text'"
              class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            >
              {{ pos.label }}
            </button>
          </div>

          <!-- Position Card -->
          <div class="card">
            <div class="card-header">
              <div class="flex items-center gap-3">
                <span 
                  class="px-3 py-1 rounded text-sm font-bold" 
                  :class="selectedWeeklyPosition === 'FLEX' ? 'bg-purple-500/30 text-purple-400' : getPositionClass(selectedWeeklyPosition)"
                >
                  {{ selectedWeeklyPosition }}
                </span>
                <h3 class="card-title">
                  {{ getWeeklyPositionTitle(selectedWeeklyPosition) }}
                </h3>
                <span v-if="weeklyProjectionsLoading" class="text-xs text-primary animate-pulse">Loading projections...</span>
                <span v-else-if="weeklyProjectionsLoaded" class="text-xs text-green-400">✓ Sleeper projections loaded</span>
              </div>
              <div class="flex items-center gap-4 text-sm text-dark-textMuted">
                <span>Start {{ getStartCount(selectedWeeklyPosition) }}</span>
                <span>•</span>
                <span>{{ getWeeklyPositionPlayers(selectedWeeklyPosition).filter(p => isMyPlayer(p.player_id)).length }} rostered</span>
              </div>
            </div>
            <div class="card-body p-0">
              <div class="overflow-x-auto max-h-[65vh] overflow-y-auto">
                <table class="w-full">
                  <thead class="bg-dark-border/30 sticky top-0 z-10">
                    <tr>
                      <th class="px-3 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-14">Rank</th>
                      <th class="px-3 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase tracking-wider">Player</th>
                      <th v-if="selectedWeeklyPosition === 'FLEX'" class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-14">Pos</th>
                      <th class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-28">Matchup</th>
                      <th class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-16">PPG</th>
                      <th class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-18">
                        <span class="text-primary">Proj</span>
                      </th>
                      <th class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-14">Tier</th>
                      <th class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-24">Verdict</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-dark-border/30">
                    <!-- Tier Break -->
                    <template v-for="(player, index) in getWeeklyPositionPlayers(selectedWeeklyPosition)" :key="player.player_id">
                      <tr v-if="showWeeklyTierBreak(player, index, selectedWeeklyPosition)" class="bg-dark-border/10">
                        <td :colspan="selectedWeeklyPosition === 'FLEX' ? 9 : 8" class="px-4 py-2">
                          <div class="flex items-center gap-2">
                            <div class="h-px flex-1 bg-primary/30"></div>
                            <span class="text-xs font-bold text-primary uppercase tracking-wider">Tier {{ player.weeklyTier }}</span>
                            <div class="h-px flex-1 bg-primary/30"></div>
                          </div>
                        </td>
                      </tr>
                      <tr
                        :class="getWeeklyRowClass(player)"
                        class="hover:bg-dark-border/20 transition-colors"
                      >
                        <td class="px-3 py-2">
                          <span class="font-bold text-lg text-dark-text">{{ index + 1 }}</span>
                        </td>
                        <td class="px-3 py-2">
                          <div class="flex items-center gap-3">
                            <div class="relative">
                              <div class="w-10 h-10 rounded-full bg-dark-border overflow-hidden flex-shrink-0 ring-2" :class="getAvatarRingClass(player)">
                                <img :src="getPlayerImageUrl(player.player_id)" :alt="player.full_name" class="w-full h-full object-cover" @error="handleImageError" />
                              </div>
                              <div v-if="isMyPlayer(player.player_id)" class="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-lg">
                                <span class="text-xs text-gray-900 font-bold">★</span>
                              </div>
                              <div v-else-if="isFreeAgent(player.player_id)" class="absolute -top-1 -right-1 w-5 h-5 bg-cyan-400 rounded-full flex items-center justify-center shadow-lg">
                                <span class="text-xs text-gray-900 font-bold">+</span>
                              </div>
                            </div>
                            <div>
                              <div class="flex items-center gap-2">
                                <span class="font-semibold" :class="getPlayerNameClass(player)">{{ player.full_name }}</span>
                                <span v-if="player.injury_status" class="text-xs px-1.5 py-0.5 rounded font-medium" :class="getInjuryClass(player.injury_status)">
                                  {{ player.injury_status }}
                                </span>
                              </div>
                              <div class="flex items-center gap-2 text-xs text-dark-textMuted">
                                <span>{{ player.team || 'FA' }}</span>
                                <template v-if="getFantasyOwner(player.player_id)">
                                  <span class="text-dark-border">•</span>
                                  <span class="flex items-center gap-1">
                                    <img src="https://sleepercdn.com/images/v2/icons/league/league_avatar_mint.png" class="w-3 h-3" alt="Sleeper" />
                                    <span :class="isMyPlayer(player.player_id) ? 'text-primary' : 'text-dark-textMuted'">
                                      {{ getFantasyOwner(player.player_id) }}
                                    </span>
                                  </span>
                                </template>
                                <template v-else>
                                  <span class="text-dark-border">•</span>
                                  <span class="text-cyan-400 font-medium">Free Agent</span>
                                </template>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td v-if="selectedWeeklyPosition === 'FLEX'" class="px-2 py-2 text-center">
                          <span class="px-1.5 py-0.5 rounded text-[10px] font-bold" :class="getPositionClass(player.position)">{{ player.position }}</span>
                        </td>
                        <td class="px-2 py-2 text-center">
                          <div class="flex flex-col items-center gap-0.5">
                            <span class="text-xs text-dark-text font-medium">{{ getWeeklyMatchup(player) }}</span>
                            <div class="flex items-center gap-1">
                              <div class="w-10 h-1.5 bg-dark-border/30 rounded-full overflow-hidden">
                                <div 
                                  class="h-full rounded-full transition-all" 
                                  :class="getMatchupDifficultyClass(player)"
                                  :style="{ width: getMatchupDifficultyWidth(player) }"
                                ></div>
                              </div>
                              <span v-if="player.gameTotal" class="text-[10px] text-dark-textMuted">O/U {{ player.gameTotal.toFixed(1) }}</span>
                            </div>
                          </div>
                        </td>
                        <td class="px-2 py-2 text-center">
                          <span class="text-sm text-dark-textMuted">{{ player.ppg.toFixed(1) }}</span>
                        </td>
                        <td class="px-2 py-2 text-center">
                          <span class="font-bold text-sm" :class="getProjectedPointsClass(player.weeklyProjection)">
                            {{ player.weeklyProjection?.toFixed(1) || '—' }}
                          </span>
                        </td>
                        <td class="px-2 py-2 text-center">
                          <span class="text-xs font-bold" :class="getTierColorClass(player.weeklyTier)">{{ player.weeklyTier || '—' }}</span>
                        </td>
                        <td class="px-2 py-2 text-center">
                          <span 
                            class="px-2 py-1 rounded text-xs font-bold"
                            :class="getStartSitClass(player, selectedWeeklyPosition, index)"
                          >
                            {{ getStartSitVerdict(player, selectedWeeklyPosition, index) }}
                          </span>
                        </td>
                      </tr>
                    </template>
                    <tr v-if="getWeeklyPositionPlayers(selectedWeeklyPosition).length === 0">
                      <td :colspan="selectedWeeklyPosition === 'FLEX' ? 9 : 8" class="px-4 py-8 text-center text-dark-textMuted">
                        {{ weeklyProjectionsLoading ? 'Loading projections...' : `No ${selectedWeeklyPosition} players found` }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar: Suggested Lineup + Team Rankings -->
        <div class="w-80 flex-shrink-0 space-y-6">
          <!-- Suggested Starting Lineup -->
          <div class="card sticky top-4">
            <div class="card-header py-3">
              <div class="flex items-center gap-2">
                <span class="text-xl">🏆</span>
                <h2 class="text-base font-bold text-dark-text">Suggested Starting Lineup</h2>
              </div>
            </div>
            <div class="card-body p-0">
              <!-- Lineup Slots -->
              <div class="divide-y divide-dark-border/30">
                <div 
                  v-for="(slot, idx) in suggestedLineup" 
                  :key="idx"
                  class="flex items-center gap-2 px-3 py-2 hover:bg-dark-border/10 transition-colors"
                >
                  <!-- Slot Label -->
                  <div class="w-10 text-center flex-shrink-0">
                    <span 
                      class="px-1.5 py-0.5 rounded text-[10px] font-bold"
                      :class="getSlotClass(slot.slot)"
                    >
                      {{ slot.slot }}
                    </span>
                  </div>
                  
                  <!-- Player Info -->
                  <div v-if="slot.player" class="flex items-center gap-2 flex-1 min-w-0">
                    <div class="w-8 h-8 rounded-full bg-dark-border overflow-hidden flex-shrink-0">
                      <img :src="getPlayerImageUrl(slot.player.player_id)" :alt="slot.player.full_name" class="w-full h-full object-cover" @error="handleImageError" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="font-medium text-dark-text text-xs truncate">{{ slot.player.full_name }}</div>
                      <div class="text-[10px] text-dark-textMuted">{{ getWeeklyMatchup(slot.player) }}</div>
                    </div>
                    <div class="text-right flex-shrink-0">
                      <div class="font-bold text-primary text-sm">{{ (slot.player.weeklyProjection || slot.player.ppg).toFixed(1) }}</div>
                    </div>
                  </div>
                  
                  <!-- Empty Slot -->
                  <div v-else class="flex items-center gap-2 flex-1">
                    <div class="w-8 h-8 rounded-full bg-dark-border/30 flex-shrink-0"></div>
                    <div class="text-xs text-dark-textMuted italic">Empty</div>
                  </div>
                </div>
              </div>
              
              <!-- Total -->
              <div class="px-3 py-3 bg-dark-border/20 border-t border-dark-border/30">
                <div class="flex items-center justify-between">
                  <span class="text-dark-textMuted text-sm">Projected Total</span>
                  <span class="text-xl font-bold text-primary">{{ suggestedLineupTotal.toFixed(1) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Team Rankings Card -->
          <div class="card">
            <div class="card-header py-3">
              <div class="flex items-center gap-2">
                <span class="text-xl">📊</span>
                <h2 class="text-base font-bold text-dark-text">Team Projections</h2>
              </div>
            </div>
            <div class="card-body p-0">
              <div class="divide-y divide-dark-border/30 max-h-[400px] overflow-y-auto">
                <div 
                  v-for="(team, idx) in weeklyTeamRankings" 
                  :key="team.odwnerId"
                  class="flex items-center gap-2 px-3 py-2 hover:bg-dark-border/10 transition-colors"
                  :class="team.odwnerId === leagueStore.currentUserId ? 'bg-primary/10' : ''"
                >
                  <span class="w-6 text-center font-bold text-dark-textMuted text-sm">{{ idx + 1 }}</span>
                  <div class="w-8 h-8 rounded-full bg-dark-border overflow-hidden flex-shrink-0">
                    <img :src="team.avatarUrl" :alt="team.teamName" class="w-full h-full object-cover" @error="handleTeamImageError" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="font-medium text-dark-text text-xs truncate flex items-center gap-1">
                      {{ team.teamName }}
                      <span v-if="team.odwnerId === leagueStore.currentUserId" class="text-[10px] text-primary">(You)</span>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="font-bold text-sm" :class="idx === 0 ? 'text-green-400' : idx < 3 ? 'text-lime-400' : 'text-dark-text'">
                      {{ team.projectedTotal.toFixed(1) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </template>

      <!-- Unmatched Players Modal (shared) -->
      <div v-if="showUnmatchedModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-dark-card rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
          <div class="px-6 py-4 border-b border-dark-border/30 flex items-center justify-between">
            <div>
              <h3 class="text-lg font-bold text-dark-text">Unmatched Players</h3>
              <p class="text-sm text-dark-textMuted">{{ unmatchedPlayers.length }} players from your CSV couldn't be matched</p>
            </div>
            <button @click="closeUnmatchedModal" class="text-dark-textMuted hover:text-dark-text">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <div class="overflow-y-auto max-h-[60vh]">
            <div v-for="(unmatched, idx) in unmatchedPlayers" :key="idx" class="px-6 py-4 border-b border-dark-border/20">
              <div class="flex items-center justify-between mb-2">
                <div>
                  <span class="font-medium text-dark-text">{{ unmatched.name }}</span>
                  <span class="text-sm text-dark-textMuted ml-2">(Rank {{ unmatched.rank }}, Tier {{ unmatched.tier }})</span>
                </div>
                <button 
                  @click="skipUnmatchedPlayer(idx)"
                  class="text-xs text-dark-textMuted hover:text-red-400"
                >
                  Skip
                </button>
              </div>
              <div class="text-xs text-dark-textMuted mb-2">Select the correct player:</div>
              <div class="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                <button
                  v-for="suggestion in unmatched.suggestions"
                  :key="suggestion.player_id"
                  @click="matchUnmatchedPlayer(idx, suggestion)"
                  class="flex items-center gap-2 p-2 rounded bg-dark-border/20 hover:bg-dark-border/40 transition-colors text-left"
                >
                  <div class="w-8 h-8 rounded-full bg-dark-border overflow-hidden flex-shrink-0">
                    <img :src="getPlayerImageUrl(suggestion.player_id)" :alt="suggestion.full_name" class="w-full h-full object-cover" @error="handleImageError" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-xs font-medium text-dark-text truncate">{{ suggestion.full_name }}</div>
                    <div class="text-[10px] text-dark-textMuted">{{ suggestion.position }} • {{ suggestion.team }}</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
          <div class="px-6 py-4 border-t border-dark-border/30 flex justify-end gap-2">
            <button @click="skipAllUnmatched" class="btn btn-ghost text-sm">Skip All</button>
            <button @click="closeUnmatchedModal" class="btn btn-primary text-sm">Done</button>
          </div>
        </div>
      </div>
    </template>

    <!-- Projection Settings Modal -->
    <div v-if="showProjectionSettings" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" @click.self="showProjectionSettings = false">
      <div class="bg-dark-card rounded-2xl border border-dark-border max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="px-6 py-4 border-b border-dark-border/50 flex items-center justify-between sticky top-0 bg-dark-card">
          <h2 class="text-xl font-bold text-dark-text flex items-center gap-2">
            <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Projection Settings
          </h2>
          <button @click="showProjectionSettings = false" class="p-2 hover:bg-dark-border/50 rounded-lg transition-colors">
            <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="p-6 space-y-6">
          <!-- Upload Custom Rankings Section -->
          <div class="bg-dark-bg/50 rounded-xl p-4 border border-dark-border/50">
            <h3 class="font-semibold text-dark-text flex items-center gap-2 mb-3">
              <span class="text-xl">📤</span> Upload Custom Rankings
            </h3>
            <p class="text-sm text-dark-textMuted mb-4">
              Import rankings from your favorite fantasy analyst or your own custom rankings. Upload a CSV file with player rankings to override the default algorithm.
            </p>
            
            <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
              <div class="flex items-center gap-2">
                <span class="text-sm text-dark-textMuted">Apply to:</span>
                <select v-model="csvUploadWeek" class="select text-sm">
                  <option v-for="week in availableWeeks" :key="week" :value="week">
                    Week {{ week }}{{ week === currentWeek ? ' (Current)' : '' }}
                  </option>
                </select>
              </div>
              <label class="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-gray-900 font-medium cursor-pointer transition-colors flex items-center gap-2">
                <span>📁</span>
                <span>Choose CSV File</span>
                <input type="file" accept=".csv" @change="handleCsvUpload" class="hidden" />
              </label>
            </div>

            <div class="text-xs text-dark-textMuted space-y-1 p-3 bg-dark-border/20 rounded-lg">
              <p class="font-medium text-dark-textSecondary">Required CSV Columns:</p>
              <ul class="list-disc list-inside ml-2 space-y-0.5">
                <li><span class="text-primary">Position Rank</span> - Rank within position (1, 2, 3...)</li>
                <li><span class="text-primary">Player Name</span> - Full player name</li>
                <li><span class="text-primary">Tier</span> - Tier grouping (1, 2, 3...)</li>
              </ul>
              <p class="mt-2">Optional: <span class="text-yellow-400">Overall Rank</span> for cross-position sorting</p>
            </div>

            <p class="text-xs text-dark-textMuted mt-3">
              💡 Player stats (PPG, VOR, SOS) are preserved from live data. Only ranks and tiers are updated from your CSV.
            </p>
          </div>

          <!-- Request Analyst Format Section -->
          <div class="bg-dark-bg/50 rounded-xl p-4 border border-dark-border/50">
            <h3 class="font-semibold text-dark-text flex items-center gap-2 mb-3">
              <span class="text-xl">🎯</span> Request Analyst Format Support
            </h3>
            <p class="text-sm text-dark-textMuted mb-4">
              Want to use rankings from a specific fantasy analyst? Submit a request and we may add automatic format detection for their CSV exports.
            </p>

            <div v-if="!analystRequestSubmitted" class="space-y-3">
              <div>
                <label class="block text-sm text-dark-textMuted mb-1">Analyst / Creator Name</label>
                <input 
                  v-model="analystRequestName" 
                  type="text" 
                  placeholder="e.g., Fantasy Pros, JJ Zachariason, etc."
                  class="w-full px-4 py-2 rounded-lg bg-dark-border/30 border border-dark-border text-dark-text placeholder-dark-textMuted focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label class="block text-sm text-dark-textMuted mb-1">Example CSV (Optional)</label>
                <div class="flex items-center gap-2">
                  <label class="px-4 py-2 rounded-lg bg-dark-border/50 hover:bg-dark-border/70 text-dark-textMuted font-medium cursor-pointer transition-colors flex items-center gap-2 w-fit">
                    <span>📎</span>
                    <span>{{ analystSampleFileName || 'Attach Sample File' }}</span>
                    <input type="file" accept=".csv" @change="handleAnalystSampleUpload" class="hidden" />
                  </label>
                  <span v-if="analystSampleFileName" class="text-green-400 text-sm">✓</span>
                </div>
              </div>
              <button 
                @click="submitAnalystRequest"
                :disabled="!analystRequestName.trim()"
                class="px-4 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Request
              </button>
            </div>

            <div v-else class="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
              <p class="text-green-400 font-medium flex items-center gap-2">
                <span>✓</span> Request submitted for {{ analystRequestName }}
              </p>
              <p class="text-sm text-dark-textMuted mt-1">
                We'll review your request. This does not guarantee the format will be added.
              </p>
            </div>

            <div class="mt-4 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <p class="text-xs text-yellow-400/80">
                <strong>Note:</strong> Submitting a request is the first step. Not all submissions will be added. 
                You will still need to manually upload ranking files each week - we will never provide a creator's rankings ourselves.
              </p>
            </div>
          </div>
        </div>

        <div class="px-6 py-4 border-t border-dark-border/30 flex justify-end">
          <button @click="showProjectionSettings = false" class="px-4 py-2 rounded-lg bg-dark-border hover:bg-dark-border/70 text-dark-text font-medium transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- Weekly Projection Settings Modal -->
    <div v-if="showWeeklyProjectionSettings" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" @click.self="showWeeklyProjectionSettings = false">
      <div class="bg-dark-card rounded-2xl border border-dark-border max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="px-6 py-4 border-b border-dark-border/50 flex items-center justify-between sticky top-0 bg-dark-card">
          <h2 class="text-xl font-bold text-dark-text flex items-center gap-2">
            <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Weekly Projection Settings
          </h2>
          <button @click="showWeeklyProjectionSettings = false" class="p-2 hover:bg-dark-border/50 rounded-lg transition-colors">
            <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="p-6 space-y-6">
          <!-- Upload Custom Rankings Section -->
          <div class="bg-dark-bg/50 rounded-xl p-4 border border-dark-border/50">
            <h3 class="font-semibold text-dark-text flex items-center gap-2 mb-3">
              <span class="text-xl">📤</span> Upload Weekly Rankings
            </h3>
            <p class="text-sm text-dark-textMuted mb-4">
              Import this week's rankings from your favorite fantasy analyst. Upload a CSV file to override the default projections for Week {{ currentWeek }}.
            </p>
            
            <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
              <label class="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-gray-900 font-medium cursor-pointer transition-colors flex items-center gap-2">
                <span>📁</span>
                <span>Choose CSV File</span>
                <input type="file" accept=".csv" @change="handleWeeklyCSVUpload" class="hidden" />
              </label>
            </div>

            <div class="text-xs text-dark-textMuted space-y-1 p-3 bg-dark-border/20 rounded-lg">
              <p class="font-medium text-dark-textSecondary">Required CSV Columns:</p>
              <ul class="list-disc list-inside ml-2 space-y-0.5">
                <li><span class="text-primary">Position Rank</span> - Rank within position (1, 2, 3...)</li>
                <li><span class="text-primary">Player Name</span> - Full player name</li>
                <li><span class="text-primary">Tier</span> - Tier grouping (1, 2, 3...)</li>
              </ul>
              <p class="mt-2">Optional: <span class="text-yellow-400">Overall Rank</span> for FLEX sorting</p>
            </div>

            <div class="mt-3 p-3 bg-dark-bg rounded text-xs font-mono text-dark-textMuted">
              <div class="text-dark-textSecondary mb-1">Example CSV:</div>
              Overall Rank,Position Rank,Player Name,Tier<br>
              1,1,Patrick Mahomes,1<br>
              2,1,Saquon Barkley,1<br>
              3,2,Josh Allen,1<br>
              ...
            </div>
          </div>

          <!-- Request Analyst Format Section -->
          <div class="bg-dark-bg/50 rounded-xl p-4 border border-dark-border/50">
            <h3 class="font-semibold text-dark-text flex items-center gap-2 mb-3">
              <span class="text-xl">🎯</span> Request Analyst Format Support
            </h3>
            <p class="text-sm text-dark-textMuted mb-4">
              Want to use rankings from a specific fantasy analyst? Submit a request and we may add automatic format detection for their CSV exports.
            </p>

            <div v-if="!weeklyAnalystRequestSubmitted" class="space-y-3">
              <div>
                <label class="block text-sm text-dark-textMuted mb-1">Analyst / Creator Name</label>
                <input 
                  v-model="weeklyAnalystRequestName" 
                  type="text" 
                  placeholder="e.g., Fantasy Pros, JJ Zachariason, etc."
                  class="w-full px-4 py-2 rounded-lg bg-dark-border/30 border border-dark-border text-dark-text placeholder-dark-textMuted focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label class="block text-sm text-dark-textMuted mb-1">Example CSV (Optional)</label>
                <div class="flex items-center gap-2">
                  <label class="px-4 py-2 rounded-lg bg-dark-border/50 hover:bg-dark-border/70 text-dark-textMuted font-medium cursor-pointer transition-colors flex items-center gap-2 w-fit">
                    <span>📎</span>
                    <span>{{ weeklyAnalystSampleFileName || 'Attach Sample File' }}</span>
                    <input type="file" accept=".csv" @change="handleWeeklyAnalystSampleUpload" class="hidden" />
                  </label>
                  <span v-if="weeklyAnalystSampleFileName" class="text-green-400 text-sm">✓</span>
                </div>
              </div>
              <button 
                @click="submitWeeklyAnalystRequest"
                :disabled="!weeklyAnalystRequestName.trim()"
                class="px-4 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Request
              </button>
            </div>

            <div v-else class="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
              <p class="text-green-400 font-medium flex items-center gap-2">
                <span>✓</span> Request submitted for {{ weeklyAnalystRequestName }}
              </p>
              <p class="text-sm text-dark-textMuted mt-1">
                We'll review your request. This does not guarantee the format will be added.
              </p>
            </div>

            <div class="mt-4 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <p class="text-xs text-yellow-400/80">
                <strong>Note:</strong> Submitting a request is the first step. Not all submissions will be added. 
                You will still need to manually upload ranking files each week - we will never provide a creator's rankings ourselves.
              </p>
            </div>
          </div>
        </div>

        <div class="px-6 py-4 border-t border-dark-border/30 flex justify-end">
          <button @click="showWeeklyProjectionSettings = false" class="px-4 py-2 rounded-lg bg-dark-border hover:bg-dark-border/70 text-dark-text font-medium transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import { sleeperService } from '@/services/sleeper'
import { 
  type DynastyPlayerValue, 
  type DynastyPickValue,
  type TeamDynastyValue,
  fetchDynastyPlayerValues,
  fetchDynastyPickValues,
  calculateTeamDynastyValue,
  getTierColorClass,
  formatDynastyValue,
  clearDynastyValuesCache,
  generateFallbackDynastyValues
} from '@/services/dynastyValues'
import {
  getAdjustedDefenseRankings,
  type DefensePositionStats
} from '@/services/scheduleStrength'
import RankingCustomizer from '@/components/RankingCustomizer.vue'
import PlayerExpandedDetail from '@/components/PlayerExpandedDetail.vue'
import WeeklyRankingCustomizer from '@/components/WeeklyRankingCustomizer.vue'
import {
  DEFAULT_FACTORS,
  RANKING_PRESETS,
  DEFAULT_WEEKLY_FACTORS,
  WEEKLY_PRESETS,
  type RankingFactorConfig,
  type WeeklyFactorConfig,
  type PlayerRankingData,
  buildPlayerRankingData,
  calculateFinalScore,
  calculateWeeklyScore,
  getPlayerWeeklyScores,
  calculateSeasonPPG,
  calculateRecentPPG,
  calculateTrendMultiplier,
  calculateConsistency,
  getTrendIndicator,
  getConsistencyRating,
  getScarcityMultiplier,
  TEAM_PACE,
  TEAM_PASS_RATIO,
  TEAM_RED_ZONE_EFFICIENCY,
  TEAM_GARBAGE_TIME_FACTOR
} from '@/services/rankingFactors'

const leagueStore = useLeagueStore()

// Mode toggle
const isDynastyMode = ref(false)
const isSuperFlex = ref(false)

// ==================== RANKING FACTORS STATE ====================
const rankingFactors = ref<RankingFactorConfig[]>(JSON.parse(JSON.stringify(DEFAULT_FACTORS)))
const weeklyRankingFactors = ref<WeeklyFactorConfig[]>(JSON.parse(JSON.stringify(DEFAULT_WEEKLY_FACTORS)))
const showRankingCustomizer = ref(true)

// Expanded player state
const expandedPlayerId = ref<string | null>(null)

// Previous rankings cache (keyed by factor configuration hash)
const previousRankingsCache = ref<Map<string, Map<string, number>>>(new Map())

// Tab state
const activeTab = ref<'ros' | 'teams' | 'week'>('ros')
const redraftTabOptions = [
  { id: 'ros', name: 'Rest of Season', icon: '📈' },
  { id: 'teams', name: 'Teams', icon: '👥' },
  { id: 'week', name: 'This Week', icon: '📅' }
]
const dynastyTabOptions = [
  { id: 'ros', name: 'Dynasty Values', icon: '📊' },
  { id: 'teams', name: 'Team Values', icon: '🏆' },
  { id: 'week', name: 'Pick Values', icon: '🎯' }
]
const currentTabOptions = computed(() => isDynastyMode.value ? dynastyTabOptions : redraftTabOptions)

// Loading state
const isLoading = ref(false)
const loadingMessage = ref('Loading projections...')
const lastUpdated = ref<string | null>(null)

// ==================== DYNASTY MODE STATE ====================
// Dynasty data
const dynastyPlayerValues = ref<Map<string, DynastyPlayerValue>>(new Map())
const dynastyPickValues = ref<DynastyPickValue[]>([])
const dynastyTeamValues = ref<TeamDynastyValue[]>([])
const dynastyLastRefresh = ref('Never')

// Dynasty filters
const dynastySelectedPosition = ref('All')
const dynastyOwnershipFilter = ref<'all' | 'rostered' | 'available'>('all')
const dynastySelectedTier = ref('all')
const dynastySearchQuery = ref('')

// Check if this is a dynasty league
const isDynastyLeague = computed(() => {
  const leagueType = leagueStore.currentLeague?.settings?.type
  return leagueType === 1 || leagueType === 2
})

// Dynasty player to owner mapping
const dynastyPlayerOwnerMap = computed(() => {
  const map = new Map<string, string>()
  leagueStore.rosters.forEach(roster => {
    const user = leagueStore.users.find(u => u.user_id === roster.owner_id)
    const teamName = sleeperService.getTeamName(roster, user)
    roster.players?.forEach(playerId => {
      map.set(playerId, teamName)
    })
  })
  return map
})

// Get all rostered player IDs for dynasty
const dynastyRosteredPlayerIds = computed(() => {
  const ids = new Set<string>()
  leagueStore.rosters.forEach(roster => {
    roster.players?.forEach(id => ids.add(id))
  })
  return ids
})

// Sorted dynasty team values
const sortedDynastyTeamValues = computed(() => {
  return [...dynastyTeamValues.value].sort((a, b) => {
    const aVal = isSuperFlex.value ? a.total_value_2qb : a.total_value_1qb
    const bVal = isSuperFlex.value ? b.total_value_2qb : b.total_value_1qb
    return bVal - aVal
  }).map(team => ({
    ...team,
    total_value: isSuperFlex.value ? team.total_value_2qb : team.total_value_1qb
  }))
})

// Dynasty league average value
const dynastyLeagueAvgValue = computed(() => {
  if (sortedDynastyTeamValues.value.length === 0) return 0
  const total = sortedDynastyTeamValues.value.reduce((sum, t) => sum + t.total_value, 0)
  return Math.round(total / sortedDynastyTeamValues.value.length)
})

// Dynasty top team
const dynastyTopTeam = computed(() => sortedDynastyTeamValues.value[0] || null)

// Dynasty contender/rebuilder counts
const dynastyContenderCount = computed(() => {
  return dynastyTeamValues.value.filter(t => t.contender_score >= 60).length
})

const dynastyRebuilderCount = computed(() => {
  return dynastyTeamValues.value.filter(t => t.contender_score < 40).length
})

// Filtered dynasty players
const filteredDynastyPlayers = computed(() => {
  let players = Array.from(dynastyPlayerValues.value.values())
  
  if (dynastySelectedPosition.value !== 'All') {
    players = players.filter(p => p.position === dynastySelectedPosition.value)
  }
  
  if (dynastyOwnershipFilter.value === 'rostered') {
    players = players.filter(p => dynastyRosteredPlayerIds.value.has(p.player_id))
  } else if (dynastyOwnershipFilter.value === 'available') {
    players = players.filter(p => !dynastyRosteredPlayerIds.value.has(p.player_id))
  }
  
  if (dynastySelectedTier.value !== 'all') {
    players = players.filter(p => {
      const tier = isSuperFlex.value ? p.tier_2qb : p.tier_1qb
      return tier === dynastySelectedTier.value
    })
  }
  
  if (dynastySearchQuery.value.trim()) {
    const query = dynastySearchQuery.value.toLowerCase()
    players = players.filter(p => 
      p.player_name.toLowerCase().includes(query) ||
      p.team?.toLowerCase().includes(query)
    )
  }
  
  players.sort((a, b) => {
    const aVal = isSuperFlex.value ? a.value_2qb : a.value_1qb
    const bVal = isSuperFlex.value ? b.value_2qb : b.value_1qb
    return bVal - aVal
  })
  
  return players.slice(0, 200)
})

// ==================== END DYNASTY MODE STATE ====================

// Week selection
const selectedWeek = ref(14)
const currentWeek = computed(() => leagueStore.currentLeague?.settings?.leg || 14)
const availableWeeks = computed(() => {
  const weeks = []
  for (let w = 1; w <= Math.max(currentWeek.value, 17); w++) weeks.push(w)
  return weeks.reverse()
})

// CSV Upload state
const csvUploadWeek = ref(14)
const hasCustomRankings = ref(false)
const customRankingsWeek = ref<number | null>(null)
const customRankingsCount = ref(0)
const customRankingsData = ref<Map<number, Map<string, { rank: number, tier: number }>>>(new Map())
const showRosCSVInstructions = ref(false)
const showProjectionSettings = ref(false)
const analystRequestName = ref('')
const analystRequestSubmitted = ref(false)

// Filter state
const selectedPositions = ref<string[]>(['QB', 'RB', 'WR', 'TE'])
const showOnlyMyPlayers = ref(false)
const showOnlyFreeAgents = ref(false)
const rankingMode = ref<'vor' | 'raw'>('vor')
const positionFilters = [
  { id: 'QB', label: 'QB' },
  { id: 'RB', label: 'RB' },
  { id: 'WR', label: 'WR' },
  { id: 'TE', label: 'TE' }
]

// Sort state
const sortColumn = ref<string | null>(null)
const sortDirection = ref<'asc' | 'desc'>('desc')

// Data state
const rankedPlayers = ref<RankedPlayer[]>([])
const allPlayersData = ref<Map<string, any>>(new Map())
const weeklyRankings = ref<Map<number, Map<string, number>>>(new Map())

// Schedule Strength Data
const defenseRankings = ref<Map<string, DefensePositionStats[]>>(new Map())
const sosDataLoaded = ref(false)

// Player to fantasy team mapping
const playerToTeamMap = ref<Map<string, { teamName: string, odwnerId: string }>>(new Map())

// Replacement level baselines
const replacementBaselines = ref<Record<string, { rank: string, ppg: number }>>({
  QB: { rank: 'QB14', ppg: 15.0 },
  RB: { rank: 'RB32', ppg: 8.0 },
  WR: { rank: 'WR32', ppg: 8.5 },
  TE: { rank: 'TE14', ppg: 6.0 }
})

// NFL Team bye weeks for 2025 (from NFL Operations schedule)
const teamByeWeeks: Record<string, number> = {
  'ARI': 8, 'ATL': 12, 'BAL': 7, 'BUF': 7, 'CAR': 11, 'CHI': 7,
  'CIN': 10, 'CLE': 9, 'DAL': 6, 'DEN': 12, 'DET': 5, 'GB': 10,
  'HOU': 14, 'IND': 5, 'JAX': 8, 'KC': 3, 'LAC': 5, 'LAR': 8,
  'LV': 8, 'MIA': 5, 'MIN': 6, 'NE': 12, 'NO': 11, 'NYG': 12,
  'NYJ': 12, 'PHI': 9, 'PIT': 5, 'SEA': 8, 'SF': 13, 'TB': 5,
  'TEN': 10, 'WAS': 5
}

// 2025 NFL Schedule for SOS calculations
const nflSchedule2025: Record<string, Record<number, { opp: string; away: boolean }>> = {
  // AFC East
  BUF: { 1: { opp: 'BAL', away: false }, 2: { opp: 'NYJ', away: false }, 3: { opp: 'MIA', away: false }, 4: { opp: 'NO', away: false }, 5: { opp: 'NE', away: true }, 6: { opp: 'ATL', away: true }, 8: { opp: 'CAR', away: true }, 9: { opp: 'KC', away: true }, 10: { opp: 'MIA', away: true }, 11: { opp: 'TB', away: true }, 12: { opp: 'HOU', away: true }, 13: { opp: 'PIT', away: true }, 14: { opp: 'CIN', away: false }, 15: { opp: 'NE', away: true }, 16: { opp: 'CLE', away: false }, 17: { opp: 'PHI', away: true }, 18: { opp: 'NYJ', away: false } },
  MIA: { 1: { opp: 'IND', away: true }, 2: { opp: 'NE', away: true }, 3: { opp: 'BUF', away: true }, 4: { opp: 'NYJ', away: false }, 6: { opp: 'LAC', away: true }, 7: { opp: 'CLE', away: true }, 8: { opp: 'ATL', away: true }, 9: { opp: 'BAL', away: false }, 10: { opp: 'BUF', away: false }, 11: { opp: 'WAS', away: true }, 13: { opp: 'NO', away: false }, 14: { opp: 'NYJ', away: true }, 15: { opp: 'PIT', away: false }, 16: { opp: 'CIN', away: false }, 17: { opp: 'TB', away: true }, 18: { opp: 'NE', away: true } },
  NE: { 1: { opp: 'LV', away: false }, 2: { opp: 'MIA', away: false }, 3: { opp: 'PIT', away: false }, 4: { opp: 'CAR', away: true }, 5: { opp: 'BUF', away: false }, 6: { opp: 'NO', away: true }, 7: { opp: 'TEN', away: true }, 8: { opp: 'CLE', away: true }, 9: { opp: 'ATL', away: false }, 10: { opp: 'TB', away: true }, 11: { opp: 'NYJ', away: false }, 13: { opp: 'NYG', away: false }, 15: { opp: 'BUF', away: false }, 16: { opp: 'BAL', away: true }, 17: { opp: 'NYJ', away: true }, 18: { opp: 'MIA', away: false } },
  NYJ: { 1: { opp: 'PIT', away: false }, 2: { opp: 'BUF', away: true }, 3: { opp: 'TB', away: true }, 4: { opp: 'MIA', away: true }, 5: { opp: 'DAL', away: false }, 6: { opp: 'DEN', away: true }, 7: { opp: 'CAR', away: false }, 8: { opp: 'CIN', away: true }, 9: { opp: 'BAL', away: true }, 10: { opp: 'CLE', away: false }, 11: { opp: 'NE', away: true }, 13: { opp: 'ATL', away: false }, 14: { opp: 'MIA', away: false }, 15: { opp: 'JAX', away: true }, 16: { opp: 'NO', away: false }, 17: { opp: 'NE', away: false }, 18: { opp: 'BUF', away: true } },
  // AFC North
  BAL: { 1: { opp: 'BUF', away: true }, 2: { opp: 'CLE', away: false }, 3: { opp: 'DET', away: false }, 4: { opp: 'KC', away: true }, 5: { opp: 'HOU', away: true }, 6: { opp: 'LAR', away: false }, 8: { opp: 'CHI', away: true }, 9: { opp: 'MIA', away: true }, 10: { opp: 'MIN', away: true }, 11: { opp: 'CLE', away: true }, 12: { opp: 'NYJ', away: false }, 13: { opp: 'CIN', away: true }, 14: { opp: 'PIT', away: true }, 15: { opp: 'CIN', away: false }, 16: { opp: 'NE', away: false }, 17: { opp: 'GB', away: true }, 18: { opp: 'PIT', away: true } },
  CIN: { 1: { opp: 'CLE', away: true }, 2: { opp: 'JAX', away: false }, 3: { opp: 'MIN', away: true }, 4: { opp: 'DEN', away: false }, 5: { opp: 'DET', away: true }, 6: { opp: 'GB', away: true }, 7: { opp: 'PIT', away: false }, 8: { opp: 'NYJ', away: false }, 9: { opp: 'CHI', away: true }, 11: { opp: 'PIT', away: true }, 12: { opp: 'NE', away: true }, 13: { opp: 'BAL', away: false }, 14: { opp: 'BUF', away: true }, 15: { opp: 'BAL', away: true }, 16: { opp: 'MIA', away: true }, 17: { opp: 'ARI', away: false }, 18: { opp: 'CLE', away: false } },
  CLE: { 1: { opp: 'CIN', away: false }, 2: { opp: 'BAL', away: true }, 3: { opp: 'GB', away: true }, 4: { opp: 'DET', away: false }, 5: { opp: 'MIN', away: true }, 6: { opp: 'PIT', away: true }, 7: { opp: 'MIA', away: false }, 8: { opp: 'NE', away: false }, 9: { opp: 'SF', away: true }, 10: { opp: 'NYJ', away: true }, 11: { opp: 'BAL', away: false }, 12: { opp: 'LV', away: true }, 13: { opp: 'SF', away: false }, 14: { opp: 'TEN', away: false }, 15: { opp: 'CHI', away: true }, 16: { opp: 'BUF', away: true }, 17: { opp: 'PIT', away: false }, 18: { opp: 'CIN', away: true } },
  PIT: { 1: { opp: 'NYJ', away: true }, 2: { opp: 'SEA', away: false }, 3: { opp: 'NE', away: true }, 4: { opp: 'MIN', away: false }, 6: { opp: 'CLE', away: false }, 7: { opp: 'CIN', away: true }, 8: { opp: 'GB', away: true }, 9: { opp: 'IND', away: false }, 10: { opp: 'LAC', away: true }, 11: { opp: 'CIN', away: false }, 12: { opp: 'CHI', away: true }, 13: { opp: 'BUF', away: false }, 14: { opp: 'BAL', away: false }, 15: { opp: 'MIA', away: true }, 16: { opp: 'DET', away: true }, 17: { opp: 'CLE', away: true }, 18: { opp: 'BAL', away: false } },
  // AFC South
  HOU: { 1: { opp: 'LAR', away: true }, 2: { opp: 'TB', away: false }, 3: { opp: 'JAX', away: true }, 4: { opp: 'TEN', away: true }, 5: { opp: 'BAL', away: false }, 6: { opp: 'SF', away: true }, 7: { opp: 'SEA', away: false }, 8: { opp: 'SF', away: false }, 9: { opp: 'DEN', away: true }, 10: { opp: 'JAX', away: true }, 11: { opp: 'TEN', away: false }, 12: { opp: 'BUF', away: false }, 13: { opp: 'IND', away: false }, 14: { opp: 'KC', away: false }, 15: { opp: 'ARI', away: false }, 16: { opp: 'LV', away: false }, 17: { opp: 'LAC', away: true }, 18: { opp: 'IND', away: true } },
  IND: { 1: { opp: 'MIA', away: false }, 2: { opp: 'DEN', away: true }, 3: { opp: 'TEN', away: true }, 4: { opp: 'JAX', away: false }, 6: { opp: 'ARI', away: true }, 7: { opp: 'LAC', away: true }, 8: { opp: 'TEN', away: false }, 9: { opp: 'PIT', away: true }, 10: { opp: 'ATL', away: false }, 11: { opp: 'JAX', away: true }, 12: { opp: 'KC', away: true }, 13: { opp: 'HOU', away: true }, 14: { opp: 'JAX', away: false }, 15: { opp: 'SEA', away: true }, 16: { opp: 'SF', away: false }, 17: { opp: 'JAX', away: true }, 18: { opp: 'HOU', away: false } },
  JAX: { 1: { opp: 'CAR', away: false }, 2: { opp: 'CIN', away: true }, 3: { opp: 'HOU', away: false }, 4: { opp: 'IND', away: true }, 5: { opp: 'KC', away: false }, 6: { opp: 'SEA', away: false }, 7: { opp: 'LAR', away: false }, 8: { opp: 'LV', away: true }, 9: { opp: 'LV', away: false }, 10: { opp: 'HOU', away: false }, 11: { opp: 'IND', away: false }, 12: { opp: 'ARI', away: true }, 13: { opp: 'TEN', away: true }, 14: { opp: 'IND', away: true }, 15: { opp: 'NYJ', away: false }, 16: { opp: 'DEN', away: true }, 17: { opp: 'IND', away: false }, 18: { opp: 'TEN', away: false } },
  TEN: { 1: { opp: 'DEN', away: false }, 2: { opp: 'LAR', away: false }, 3: { opp: 'IND', away: false }, 4: { opp: 'HOU', away: false }, 5: { opp: 'ARI', away: true }, 6: { opp: 'LV', away: false }, 7: { opp: 'NE', away: false }, 8: { opp: 'IND', away: true }, 9: { opp: 'LAC', away: false }, 11: { opp: 'HOU', away: true }, 12: { opp: 'SEA', away: false }, 13: { opp: 'JAX', away: false }, 14: { opp: 'CLE', away: true }, 15: { opp: 'SF', away: false }, 16: { opp: 'KC', away: false }, 17: { opp: 'NO', away: true }, 18: { opp: 'JAX', away: true } },
  // AFC West
  DEN: { 1: { opp: 'TEN', away: true }, 2: { opp: 'IND', away: false }, 3: { opp: 'LAC', away: false }, 4: { opp: 'CIN', away: true }, 5: { opp: 'PHI', away: false }, 6: { opp: 'NYJ', away: false }, 7: { opp: 'NYG', away: true }, 8: { opp: 'DAL', away: true }, 9: { opp: 'HOU', away: false }, 10: { opp: 'LV', away: true }, 11: { opp: 'KC', away: false }, 13: { opp: 'WAS', away: true }, 14: { opp: 'LV', away: false }, 15: { opp: 'GB', away: false }, 16: { opp: 'JAX', away: false }, 17: { opp: 'KC', away: true }, 18: { opp: 'LAC', away: false } },
  KC: { 1: { opp: 'LAC', away: true }, 2: { opp: 'PHI', away: true }, 4: { opp: 'BAL', away: false }, 5: { opp: 'JAX', away: true }, 6: { opp: 'DET', away: true }, 7: { opp: 'LV', away: true }, 8: { opp: 'WAS', away: false }, 9: { opp: 'BUF', away: false }, 11: { opp: 'DEN', away: true }, 12: { opp: 'IND', away: false }, 13: { opp: 'DAL', away: true }, 14: { opp: 'HOU', away: true }, 15: { opp: 'LAC', away: false }, 16: { opp: 'TEN', away: true }, 17: { opp: 'DEN', away: false }, 18: { opp: 'LV', away: true } },
  LV: { 1: { opp: 'NE', away: true }, 2: { opp: 'LAC', away: false }, 3: { opp: 'WAS', away: true }, 4: { opp: 'CHI', away: true }, 5: { opp: 'IND', away: false }, 6: { opp: 'TEN', away: true }, 7: { opp: 'KC', away: false }, 8: { opp: 'JAX', away: false }, 9: { opp: 'JAX', away: true }, 10: { opp: 'DEN', away: false }, 11: { opp: 'DAL', away: false }, 12: { opp: 'CLE', away: false }, 13: { opp: 'LAC', away: true }, 14: { opp: 'DEN', away: true }, 15: { opp: 'PHI', away: true }, 16: { opp: 'HOU', away: true }, 17: { opp: 'NYG', away: false }, 18: { opp: 'KC', away: false } },
  LAC: { 1: { opp: 'KC', away: false }, 2: { opp: 'LV', away: true }, 3: { opp: 'DEN', away: true }, 4: { opp: 'NYG', away: false }, 6: { opp: 'MIA', away: false }, 7: { opp: 'IND', away: false }, 8: { opp: 'MIN', away: false }, 9: { opp: 'TEN', away: true }, 10: { opp: 'PIT', away: false }, 11: { opp: 'JAX', away: false }, 12: { opp: 'TB', away: false }, 13: { opp: 'LV', away: false }, 14: { opp: 'PHI', away: false }, 15: { opp: 'KC', away: true }, 16: { opp: 'DAL', away: false }, 17: { opp: 'HOU', away: false }, 18: { opp: 'DEN', away: true } },
  // NFC East
  DAL: { 1: { opp: 'PHI', away: true }, 2: { opp: 'NYG', away: false }, 3: { opp: 'CHI', away: true }, 4: { opp: 'GB', away: true }, 5: { opp: 'NYJ', away: true }, 7: { opp: 'WAS', away: true }, 8: { opp: 'DEN', away: false }, 9: { opp: 'ARI', away: false }, 11: { opp: 'LV', away: true }, 12: { opp: 'PHI', away: false }, 13: { opp: 'KC', away: false }, 14: { opp: 'DET', away: false }, 15: { opp: 'MIN', away: false }, 16: { opp: 'LAC', away: true }, 17: { opp: 'WAS', away: false }, 18: { opp: 'NYG', away: true } },
  NYG: { 1: { opp: 'WAS', away: true }, 2: { opp: 'DAL', away: true }, 3: { opp: 'KC', away: false }, 4: { opp: 'LAC', away: true }, 5: { opp: 'NO', away: false }, 6: { opp: 'PHI', away: false }, 7: { opp: 'DEN', away: false }, 8: { opp: 'PHI', away: true }, 9: { opp: 'SF', away: false }, 10: { opp: 'CHI', away: false }, 11: { opp: 'GB', away: true }, 13: { opp: 'NE', away: true }, 14: { opp: 'WAS', away: true }, 15: { opp: 'WAS', away: false }, 16: { opp: 'MIN', away: true }, 17: { opp: 'LV', away: true }, 18: { opp: 'DAL', away: false } },
  PHI: { 1: { opp: 'DAL', away: false }, 2: { opp: 'KC', away: false }, 3: { opp: 'LAR', away: false }, 4: { opp: 'TB', away: true }, 5: { opp: 'DEN', away: true }, 6: { opp: 'NYG', away: true }, 7: { opp: 'MIN', away: false }, 8: { opp: 'NYG', away: false }, 9: { opp: 'IND', away: true }, 10: { opp: 'GB', away: true }, 11: { opp: 'DET', away: false }, 12: { opp: 'DAL', away: true }, 13: { opp: 'CHI', away: true }, 14: { opp: 'LAC', away: true }, 15: { opp: 'LV', away: false }, 16: { opp: 'WAS', away: false }, 17: { opp: 'BUF', away: false }, 18: { opp: 'WAS', away: true } },
  WAS: { 1: { opp: 'NYG', away: false }, 2: { opp: 'GB', away: true }, 3: { opp: 'LV', away: false }, 4: { opp: 'ATL', away: true }, 6: { opp: 'CHI', away: true }, 7: { opp: 'DAL', away: false }, 8: { opp: 'KC', away: true }, 9: { opp: 'SEA', away: true }, 10: { opp: 'DET', away: false }, 11: { opp: 'MIA', away: false }, 13: { opp: 'DEN', away: false }, 14: { opp: 'NYG', away: false }, 15: { opp: 'NYG', away: true }, 16: { opp: 'PHI', away: true }, 17: { opp: 'DAL', away: true }, 18: { opp: 'PHI', away: false } },
  // NFC North
  CHI: { 1: { opp: 'MIN', away: false }, 2: { opp: 'DET', away: true }, 3: { opp: 'DAL', away: false }, 4: { opp: 'LV', away: false }, 5: { opp: 'ATL', away: false }, 6: { opp: 'WAS', away: false }, 7: { opp: 'NO', away: true }, 8: { opp: 'BAL', away: false }, 9: { opp: 'CIN', away: false }, 10: { opp: 'NYG', away: true }, 11: { opp: 'MIN', away: true }, 12: { opp: 'PIT', away: false }, 13: { opp: 'PHI', away: false }, 14: { opp: 'GB', away: false }, 15: { opp: 'CLE', away: false }, 16: { opp: 'GB', away: true }, 17: { opp: 'SF', away: true }, 18: { opp: 'DET', away: false } },
  DET: { 1: { opp: 'GB', away: true }, 2: { opp: 'CHI', away: false }, 3: { opp: 'BAL', away: true }, 4: { opp: 'CLE', away: true }, 5: { opp: 'CIN', away: false }, 6: { opp: 'KC', away: false }, 7: { opp: 'TB', away: false }, 8: { opp: 'MIN', away: true }, 9: { opp: 'MIN', away: false }, 10: { opp: 'WAS', away: true }, 11: { opp: 'PHI', away: true }, 12: { opp: 'NYG', away: true }, 13: { opp: 'GB', away: false }, 14: { opp: 'DAL', away: true }, 15: { opp: 'LAR', away: false }, 16: { opp: 'PIT', away: false }, 17: { opp: 'MIN', away: true }, 18: { opp: 'CHI', away: true } },
  GB: { 1: { opp: 'DET', away: false }, 2: { opp: 'WAS', away: false }, 3: { opp: 'CLE', away: false }, 4: { opp: 'DAL', away: false }, 5: { opp: 'ATL', away: false }, 6: { opp: 'CIN', away: false }, 7: { opp: 'ARI', away: true }, 8: { opp: 'PIT', away: false }, 9: { opp: 'CAR', away: true }, 10: { opp: 'PHI', away: false }, 11: { opp: 'NYG', away: false }, 12: { opp: 'MIN', away: true }, 13: { opp: 'DET', away: true }, 14: { opp: 'CHI', away: true }, 15: { opp: 'DEN', away: true }, 16: { opp: 'CHI', away: false }, 17: { opp: 'BAL', away: false }, 18: { opp: 'MIN', away: true } },
  MIN: { 1: { opp: 'CHI', away: true }, 2: { opp: 'ATL', away: false }, 3: { opp: 'CIN', away: false }, 4: { opp: 'PIT', away: true }, 5: { opp: 'CLE', away: false }, 7: { opp: 'PHI', away: true }, 8: { opp: 'DET', away: false }, 9: { opp: 'DET', away: true }, 10: { opp: 'BAL', away: false }, 11: { opp: 'CHI', away: false }, 12: { opp: 'GB', away: false }, 13: { opp: 'SEA', away: true }, 14: { opp: 'WAS', away: false }, 15: { opp: 'DAL', away: true }, 16: { opp: 'NYG', away: false }, 17: { opp: 'DET', away: false }, 18: { opp: 'GB', away: false } },
  // NFC South
  ATL: { 1: { opp: 'TB', away: false }, 2: { opp: 'MIN', away: true }, 3: { opp: 'CAR', away: false }, 4: { opp: 'WAS', away: false }, 5: { opp: 'CHI', away: true }, 6: { opp: 'BUF', away: false }, 7: { opp: 'SF', away: false }, 8: { opp: 'MIA', away: false }, 9: { opp: 'NE', away: true }, 10: { opp: 'IND', away: true }, 11: { opp: 'CAR', away: false }, 12: { opp: 'NO', away: false }, 13: { opp: 'NYJ', away: true }, 14: { opp: 'SEA', away: false }, 15: { opp: 'TB', away: true }, 16: { opp: 'ARI', away: false }, 17: { opp: 'LAR', away: false }, 18: { opp: 'NO', away: false } },
  CAR: { 1: { opp: 'JAX', away: true }, 2: { opp: 'ARI', away: false }, 3: { opp: 'ATL', away: true }, 4: { opp: 'NE', away: false }, 5: { opp: 'MIA', away: false }, 6: { opp: 'DAL', away: false }, 7: { opp: 'NYJ', away: true }, 8: { opp: 'BUF', away: false }, 9: { opp: 'GB', away: false }, 10: { opp: 'NO', away: false }, 11: { opp: 'ATL', away: true }, 12: { opp: 'SF', away: false }, 13: { opp: 'LAR', away: false }, 14: { opp: 'NO', away: true }, 15: { opp: 'NO', away: false }, 16: { opp: 'TB', away: true }, 17: { opp: 'SEA', away: false }, 18: { opp: 'TB', away: false } },
  NO: { 1: { opp: 'ARI', away: true }, 2: { opp: 'SF', away: false }, 3: { opp: 'SEA', away: false }, 4: { opp: 'BUF', away: true }, 5: { opp: 'NYG', away: true }, 6: { opp: 'NE', away: false }, 7: { opp: 'CHI', away: false }, 8: { opp: 'TB', away: false }, 9: { opp: 'LAR', away: false }, 10: { opp: 'CAR', away: true }, 12: { opp: 'ATL', away: true }, 13: { opp: 'MIA', away: true }, 14: { opp: 'CAR', away: false }, 15: { opp: 'CAR', away: true }, 16: { opp: 'NYJ', away: true }, 17: { opp: 'TEN', away: false }, 18: { opp: 'ATL', away: true } },
  TB: { 1: { opp: 'ATL', away: true }, 2: { opp: 'HOU', away: true }, 3: { opp: 'NYJ', away: false }, 4: { opp: 'PHI', away: false }, 6: { opp: 'SF', away: false }, 7: { opp: 'DET', away: true }, 8: { opp: 'NO', away: true }, 9: { opp: 'IND', away: true }, 10: { opp: 'NE', away: false }, 11: { opp: 'BUF', away: false }, 12: { opp: 'LAC', away: true }, 13: { opp: 'ARI', away: false }, 14: { opp: 'NO', away: false }, 15: { opp: 'ATL', away: false }, 16: { opp: 'CAR', away: false }, 17: { opp: 'MIA', away: false }, 18: { opp: 'CAR', away: true } },
  // NFC West
  ARI: { 1: { opp: 'NO', away: false }, 2: { opp: 'CAR', away: true }, 3: { opp: 'SF', away: false }, 4: { opp: 'SEA', away: false }, 5: { opp: 'TEN', away: false }, 6: { opp: 'IND', away: false }, 7: { opp: 'GB', away: false }, 9: { opp: 'DAL', away: true }, 10: { opp: 'SEA', away: true }, 11: { opp: 'SF', away: false }, 12: { opp: 'JAX', away: false }, 13: { opp: 'TB', away: true }, 14: { opp: 'LAR', away: false }, 15: { opp: 'HOU', away: true }, 16: { opp: 'ATL', away: true }, 17: { opp: 'CIN', away: true }, 18: { opp: 'LAR', away: true } },
  LAR: { 1: { opp: 'HOU', away: false }, 2: { opp: 'TEN', away: true }, 3: { opp: 'PHI', away: true }, 4: { opp: 'SF', away: false }, 5: { opp: 'SF', away: true }, 6: { opp: 'BAL', away: true }, 7: { opp: 'JAX', away: true }, 9: { opp: 'NO', away: true }, 10: { opp: 'SF', away: false }, 11: { opp: 'SEA', away: false }, 12: { opp: 'TB', away: true }, 13: { opp: 'CAR', away: true }, 14: { opp: 'ARI', away: true }, 15: { opp: 'DET', away: true }, 16: { opp: 'SEA', away: false }, 17: { opp: 'ATL', away: true }, 18: { opp: 'ARI', away: false } },
  SF: { 1: { opp: 'SEA', away: true }, 2: { opp: 'NO', away: true }, 3: { opp: 'ARI', away: true }, 4: { opp: 'LAR', away: true }, 5: { opp: 'LAR', away: false }, 6: { opp: 'HOU', away: false }, 7: { opp: 'ATL', away: true }, 8: { opp: 'HOU', away: true }, 9: { opp: 'CLE', away: false }, 10: { opp: 'LAR', away: true }, 11: { opp: 'ARI', away: true }, 12: { opp: 'CAR', away: true }, 13: { opp: 'CLE', away: true }, 14: { opp: 'SEA', away: false }, 15: { opp: 'TEN', away: true }, 16: { opp: 'IND', away: true }, 17: { opp: 'CHI', away: false }, 18: { opp: 'SEA', away: false } },
  SEA: { 1: { opp: 'SF', away: false }, 2: { opp: 'PIT', away: true }, 3: { opp: 'NO', away: true }, 4: { opp: 'ARI', away: true }, 5: { opp: 'TB', away: false }, 6: { opp: 'JAX', away: true }, 7: { opp: 'HOU', away: true }, 9: { opp: 'WAS', away: false }, 10: { opp: 'ARI', away: false }, 11: { opp: 'LAR', away: true }, 12: { opp: 'TEN', away: true }, 13: { opp: 'MIN', away: false }, 14: { opp: 'SF', away: true }, 15: { opp: 'IND', away: false }, 16: { opp: 'LAR', away: true }, 17: { opp: 'CAR', away: true }, 18: { opp: 'SF', away: true } }
}


interface RankedPlayer {
  player_id: string
  full_name: string
  position: string
  team: string | null
  rosRank: number
  positionRank: number
  rankChange: number
  rosSOS: number
  next4SOS: number
  playoffSOS: number
  ppg: number
  vor: number
  byeWeek: number | null
  tier: number
  rosScore: number
  injury_status: string | null
  
  // New ranking factor fields
  recentPPG: number
  trendMultiplier: number
  trendIndicator: 'hot' | 'cold' | 'neutral'
  weeklyScores: number[]
  consistency: number
  consistencyRating: 'elite' | 'stable' | 'volatile' | 'boom-bust'
  ceiling: number
  floor: number
  teamPace: number
  passRatio: number
  redZoneShare: number
  garbageTimeBoost: number
  factorBreakdown: { factor: string; contribution: number; multiplier: number }[]
}

// Build player to team mapping
function buildPlayerToTeamMap() {
  playerToTeamMap.value.clear()
  leagueStore.rosters.forEach(roster => {
    const user = leagueStore.users.find(u => u.user_id === roster.owner_id)
    const teamName = sleeperService.getTeamName(roster, user)
    roster.players?.forEach(playerId => {
      playerToTeamMap.value.set(playerId, { teamName, odwnerId: roster.owner_id })
    })
  })
}

// Get user's roster
const myRoster = computed(() => {
  if (!leagueStore.currentUserId) return null
  return leagueStore.rosters.find(r => r.owner_id === leagueStore.currentUserId)
})

const myPlayerIds = computed(() => new Set(myRoster.value?.players || []))

// Get all rostered player IDs
const allRosteredPlayerIds = computed(() => {
  const ids = new Set<string>()
  leagueStore.rosters.forEach(roster => {
    roster.players?.forEach(id => ids.add(id))
  })
  return ids
})

function isMyPlayer(playerId: string): boolean {
  return myPlayerIds.value.has(playerId)
}

function isFreeAgent(playerId: string): boolean {
  return !allRosteredPlayerIds.value.has(playerId)
}

function getFantasyOwner(playerId: string): string | null {
  const owner = playerToTeamMap.value.get(playerId)
  return owner?.teamName || null
}

function getPlayerOwner(playerId: string): string | null {
  return getFantasyOwner(playerId)
}

// Row styling
function getRowClass(player: RankedPlayer): string {
  if (isMyPlayer(player.player_id)) {
    return 'bg-primary/20 border-l-4 border-l-primary'
  }
  if (isFreeAgent(player.player_id)) {
    return 'bg-cyan-500/10 border-l-4 border-l-cyan-400'
  }
  if (player.injury_status) {
    return 'opacity-75'
  }
  return ''
}

function getAvatarRingClass(player: RankedPlayer): string {
  if (isMyPlayer(player.player_id)) {
    return 'ring-primary ring-offset-2 ring-offset-dark-card'
  }
  if (isFreeAgent(player.player_id)) {
    return 'ring-cyan-400 ring-offset-2 ring-offset-dark-card'
  }
  return 'ring-transparent'
}

function getPlayerNameClass(player: RankedPlayer): string {
  if (isMyPlayer(player.player_id)) return 'text-primary'
  if (isFreeAgent(player.player_id)) return 'text-cyan-400'
  return 'text-dark-text'
}

// My team players from rankings
const myTeamPlayers = computed(() => rankedPlayers.value.filter(p => isMyPlayer(p.player_id)))

const myTeamByPosition = computed(() => {
  const byPos: Record<string, RankedPlayer[]> = { QB: [], RB: [], WR: [], TE: [] }
  myTeamPlayers.value.forEach(p => {
    if (byPos[p.position]) byPos[p.position].push(p)
  })
  Object.keys(byPos).forEach(pos => byPos[pos].sort((a, b) => a.rosRank - b.rosRank))
  return byPos
})

function getLastName(fullName: string): string {
  const parts = fullName.split(' ')
  return parts.length > 1 ? parts.slice(1).join(' ') : fullName
}

// Filtered players
const filteredPlayers = computed(() => {
  let players = [...rankedPlayers.value]

  // If custom rankings, use those ranks (already applied)
  if (!hasCustomRankings.value) {
    if (rankingMode.value === 'raw') {
      players.sort((a, b) => (b.ppg * 4) - (a.ppg * 4))
      players.forEach((p, idx) => p.rosRank = idx + 1)
    } else {
      players.sort((a, b) => b.rosScore - a.rosScore)
      players.forEach((p, idx) => p.rosRank = idx + 1)
    }

    // Recalculate tiers for non-custom rankings
    players.forEach((player, idx) => {
      const pct = idx / players.length
      if (pct < 0.05) player.tier = 1
      else if (pct < 0.15) player.tier = 2
      else if (pct < 0.35) player.tier = 3
      else if (pct < 0.55) player.tier = 4
      else if (pct < 0.75) player.tier = 5
      else player.tier = 6
    })
  }

  // Recalculate position ranks
  const posCounts: Record<string, number> = { QB: 0, RB: 0, WR: 0, TE: 0 }
  players.forEach(p => {
    if (posCounts[p.position] !== undefined) {
      posCounts[p.position]++
      p.positionRank = posCounts[p.position]
    }
  })

  // Apply filters
  if (selectedPositions.value.length > 0 && selectedPositions.value.length < 4) {
    players = players.filter(p => selectedPositions.value.includes(p.position))
  }

  if (showOnlyMyPlayers.value) {
    players = players.filter(p => isMyPlayer(p.player_id))
  }

  if (showOnlyFreeAgents.value) {
    players = players.filter(p => isFreeAgent(p.player_id))
  }

  if (sortColumn.value) {
    players = [...players].sort((a, b) => {
      const aVal = a[sortColumn.value as keyof RankedPlayer] as number
      const bVal = b[sortColumn.value as keyof RankedPlayer] as number
      return sortDirection.value === 'asc' ? aVal - bVal : bVal - aVal
    })
  }

  return players
})

function togglePositionFilter(pos: string) {
  const idx = selectedPositions.value.indexOf(pos)
  if (idx === -1) selectedPositions.value.push(pos)
  else if (selectedPositions.value.length > 1) selectedPositions.value.splice(idx, 1)
}

function sortBy(column: string) {
  if (sortColumn.value === column) {
    if (sortDirection.value === 'desc') sortDirection.value = 'asc'
    else sortColumn.value = null
  } else {
    sortColumn.value = column
    sortDirection.value = 'desc'
  }
}

function showTierBreak(player: RankedPlayer, index: number): boolean {
  if (index === 0) return true
  const prevPlayer = filteredPlayers.value[index - 1]
  return prevPlayer && player.tier !== prevPlayer.tier
}

function getTierLabel(tier: number): string {
  // Use generic labels for custom rankings
  if (hasCustomRankings.value) {
    return `Tier ${tier}`
  }
  // Use descriptive labels for auto-calculated rankings
  const labels = ['Elite', 'High-End Starter', 'Solid Starter', 'Flex Play', 'Bench', 'Waiver Wire']
  return `Tier ${tier}: ${labels[tier - 1] || 'Other'}`
}

function getSosBarClass(sos: number): string {
  if (sos > 0.1) return 'bg-green-500'
  if (sos > 0) return 'bg-green-400'
  if (sos > -0.1) return 'bg-yellow-400'
  if (sos > -0.2) return 'bg-orange-400'
  return 'bg-red-500'
}

function getSosBarWidth(sos: number): string {
  const normalized = (sos + 0.5) / 1 * 100
  return `${Math.max(5, Math.min(95, normalized))}%`
}

function getSosTextClass(sos: number): string {
  if (sos > 0.05) return 'text-green-400'
  if (sos < -0.05) return 'text-red-400'
  return 'text-dark-textMuted'
}

function formatSOS(sos: number): string {
  // Convert back to points (multiply by 12 since we divided by 12 to normalize)
  const points = sos * 12
  return points >= 0 ? `+${points.toFixed(1)}` : points.toFixed(1)
}

function getPositionClass(pos: string): string {
  const classes: Record<string, string> = {
    QB: 'bg-red-500/20 text-red-400',
    RB: 'bg-green-500/20 text-green-400',
    WR: 'bg-blue-500/20 text-blue-400',
    TE: 'bg-orange-500/20 text-orange-400'
  }
  return classes[pos] || 'bg-gray-500/20 text-gray-400'
}

function getInjuryClass(status: string): string {
  const classes: Record<string, string> = {
    'Out': 'bg-red-500/20 text-red-400',
    'IR': 'bg-red-500/20 text-red-400',
    'Doubtful': 'bg-red-500/20 text-red-400',
    'Questionable': 'bg-yellow-500/20 text-yellow-400',
    'Probable': 'bg-green-500/20 text-green-400'
  }
  return classes[status] || 'bg-gray-500/20 text-gray-400'
}

function getPlayerImageUrl(playerId: string): string {
  return `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`
}

function handleImageError(e: Event) {
  const img = e.target as HTMLImageElement
  img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%233a3d52"/%3E%3C/svg%3E'
}

// CSV Upload Handler
function handleCsvUpload(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return
  const file = input.files[0]
  const reader = new FileReader()
  
  reader.onload = (event) => {
    try {
      const csv = event.target?.result as string
      parseCustomRankingsWithModal(csv, csvUploadWeek.value)
    } catch (err) {
      console.error('Failed to parse CSV:', err)
      alert('Failed to parse CSV file. Please ensure it has columns: Rank, Player Name, Tier')
    }
  }
  reader.readAsText(file)
  input.value = ''
}

function parseCustomRankingsWithModal(csv: string, week: number) {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) {
    alert('CSV file is empty or has no data rows')
    return
  }
  
  // Parse header to find column indices (ignore extra columns)
  const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''))
  const rankIdx = header.findIndex(h => h === 'rank' || h === 'ranking' || h === '#' || h.includes('position rank'))
  const nameIdx = header.findIndex(h => h.includes('player') || h.includes('name'))
  const tierIdx = header.findIndex(h => h === 'tier')
  
  if (nameIdx === -1) {
    alert('CSV must have a Player Name column\nFound columns: ' + header.join(', '))
    return
  }
  
  const customRanks = new Map<string, { rank: number, tier: number }>()
  const unmatched: Array<{ name: string, rank: number, tier: number, suggestions: Array<{ player_id: string, full_name: string, position: string, team: string }> }> = []
  
  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''))
    if (cols.length <= nameIdx) continue
    
    const rank = rankIdx >= 0 ? (parseInt(cols[rankIdx]) || i) : i
    const playerName = cols[nameIdx]
    const tier = tierIdx >= 0 ? (parseInt(cols[tierIdx]) || 1) : 1
    
    if (!playerName) continue
    
    // Find matching player by name
    const matchedPlayerId = findPlayerIdByName(playerName)
    if (matchedPlayerId) {
      customRanks.set(matchedPlayerId, { rank, tier })
    } else {
      // Find similar player names for suggestions
      const suggestions = findSimilarPlayers(playerName)
      unmatched.push({ name: playerName, rank, tier, suggestions })
    }
  }
  
  // Store pending rankings
  pendingRosRankings.value = customRanks
  isWeeklyUpload.value = false
  
  if (unmatched.length > 0) {
    // Show modal for unmatched players
    unmatchedPlayers.value = unmatched.sort((a, b) => a.rank - b.rank)
    showUnmatchedModal.value = true
  } else if (customRanks.size > 0) {
    // Apply rankings directly
    applyCustomRankings(customRanks, week)
    hasCustomRankings.value = true
    customRankingsWeek.value = week
    customRankingsCount.value = customRanks.size
  } else {
    alert('No players matched. Make sure player names match Sleeper data.')
  }
}

function parseCustomRankings(csv: string, week: number) {
  // Legacy function - now calls the modal version
  parseCustomRankingsWithModal(csv, week)
}

function findPlayerIdByName(searchName: string): string | null {
  const normalizedSearch = searchName.toLowerCase().replace(/[^a-z\s]/g, '').trim()
  
  // First try to find in current rankedPlayers
  const matchedRanked = rankedPlayers.value.find(p => {
    const normalizedPlayer = p.full_name.toLowerCase().replace(/[^a-z\s]/g, '').trim()
    if (normalizedPlayer === normalizedSearch) return true
    const searchParts = normalizedSearch.split(' ')
    const playerParts = normalizedPlayer.split(' ')
    if (searchParts.length > 0 && playerParts.length > 0) {
      const searchLast = searchParts[searchParts.length - 1]
      const playerLast = playerParts[playerParts.length - 1]
      if (searchLast === playerLast && searchParts[0]?.[0] === playerParts[0]?.[0]) return true
    }
    return false
  })
  
  if (matchedRanked) return matchedRanked.player_id
  
  // Try all players data
  for (const [playerId, playerData] of allPlayersData.value) {
    const fullName = playerData.full_name || `${playerData.first_name} ${playerData.last_name}`
    const normalizedPlayer = fullName.toLowerCase().replace(/[^a-z\s]/g, '').trim()
    if (normalizedPlayer === normalizedSearch) return playerId
    const searchParts = normalizedSearch.split(' ')
    const playerParts = normalizedPlayer.split(' ')
    if (searchParts.length > 0 && playerParts.length > 0) {
      const searchLast = searchParts[searchParts.length - 1]
      const playerLast = playerParts[playerParts.length - 1]
      if (searchLast === playerLast && searchParts[0]?.[0] === playerParts[0]?.[0]) return playerId
    }
  }
  
  return null
}

function applyCustomRankings(customRanks: Map<string, { rank: number, tier: number }>, week: number) {
  // Get previous week rankings for change calculation
  const prevWeekRanks = weeklyRankings.value.get(week - 1)
  
  // Filter to only players in the custom rankings
  const customPlayerIds = new Set(customRanks.keys())
  const customPlayers = rankedPlayers.value.filter(p => customPlayerIds.has(p.player_id))
  
  // Apply custom ranks and tiers
  customPlayers.forEach(player => {
    const customData = customRanks.get(player.player_id)
    if (customData) {
      player.rosRank = customData.rank
      player.tier = customData.tier
      
      // Calculate rank change from previous week
      if (prevWeekRanks?.has(player.player_id)) {
        const prevRank = prevWeekRanks.get(player.player_id)!
        player.rankChange = prevRank - customData.rank
      } else {
        player.rankChange = 0
      }
    }
  })
  
  // Sort by custom rank
  customPlayers.sort((a, b) => a.rosRank - b.rosRank)
  
  // Replace rankedPlayers with only custom players
  rankedPlayers.value = customPlayers
  
  // Store current week's ranks for future reference
  const currentRanks = new Map<string, number>()
  customPlayers.forEach(p => currentRanks.set(p.player_id, p.rosRank))
  weeklyRankings.value.set(week, currentRanks)
}

function clearCustomRankings() {
  hasCustomRankings.value = false
  customRankingsWeek.value = null
  customRankingsCount.value = 0
  loadProjections()
}

// Handle analyst sample file upload (just for form - doesn't process)
const analystSampleFileName = ref<string | null>(null)

function handleAnalystSampleUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) {
    analystSampleFileName.value = file.name
  }
}

// Submit analyst format request to Supabase
async function submitAnalystRequest() {
  if (!analystRequestName.value.trim()) return
  
  const authStore = useAuthStore()
  
  try {
    const { error } = await supabase
      .from('analyst_requests')
      .insert({
        analyst_name: analystRequestName.value.trim(),
        user_email: authStore.user?.email || null,
        sample_file_name: analystSampleFileName.value
      })
    
    if (error) throw error
    
    analystRequestSubmitted.value = true
    
    // Reset after 10 seconds so they can submit another
    setTimeout(() => {
      analystRequestSubmitted.value = false
      analystRequestName.value = ''
      analystSampleFileName.value = null
    }, 10000)
  } catch (err) {
    console.error('Failed to submit analyst request:', err)
    alert('Failed to submit request. Please try again.')
  }
}

// Toggle expanded player detail
function togglePlayerExpanded(playerId: string) {
  if (expandedPlayerId.value === playerId) {
    expandedPlayerId.value = null
  } else {
    expandedPlayerId.value = playerId
  }
}

// Generate a hash of current ranking factors for caching
function getFactorConfigHash(): string {
  const enabledFactors = rankingFactors.value
    .filter(f => f.enabled)
    .map(f => `${f.id}:${f.weight}`)
    .sort()
    .join('|')
  return enabledFactors
}

// Store rankings for previous week comparison
function storePreviousRankings(week: number, rankings: Map<string, number>) {
  const hash = getFactorConfigHash()
  const key = `${week}-${hash}`
  previousRankingsCache.value.set(key, rankings)
}

// Get previous week rankings with same factor config
function getPreviousRankings(week: number): Map<string, number> | null {
  const hash = getFactorConfigHash()
  const key = `${week - 1}-${hash}`
  return previousRankingsCache.value.get(key) || null
}

// Get bye week for a player's team
function getByeWeek(team: string | null): number | null {
  if (!team) return null
  return teamByeWeeks[team] || null
}

async function loadProjections() {
  isLoading.value = true
  loadingMessage.value = 'Loading player data...'
  
  try {
    const players = await sleeperService.getPlayers()
    const season = leagueStore.currentSeason
    const week = selectedWeek.value
    
    // Build player to team mapping
    buildPlayerToTeamMap()
    
    // Store all players data for later reference
    allPlayersData.value = new Map(Object.entries(players))
    
    // Load schedule strength data if not already loaded
    if (!sosDataLoaded.value && week >= 3) {
      loadingMessage.value = 'Loading schedule strength data...'
      try {
        const rankings = await getAdjustedDefenseRankings(season, week, players)
        defenseRankings.value = rankings
        sosDataLoaded.value = true
        console.log('✅ Schedule strength data loaded for Projections')
      } catch (err) {
        console.warn('Failed to load SOS data, using fallback:', err)
      }
    }
    
    // Load historical matchup data for trend/consistency calculations
    loadingMessage.value = 'Loading historical performance data...'
    const historicalMatchups = new Map<number, any[]>()
    try {
      if (leagueStore.activeLeagueId) {
        for (let w = 1; w < week; w++) {
          const weekMatchups = await sleeperService.getMatchups(leagueStore.activeLeagueId, w)
          historicalMatchups.set(w, weekMatchups)
        }
      }
    } catch (err) {
      console.warn('Could not load historical matchups:', err)
    }
    
    const relevantPlayers = Object.entries(players)
      .filter(([_, p]) => ['QB', 'RB', 'WR', 'TE'].includes(p.position) && p.active)
      .map(([id, p]) => ({ id, ...p }))
    
    loadingMessage.value = 'Fetching projections...'
    
    const remainingWeeks = []
    for (let w = week; w <= 17; w++) remainingWeeks.push(w)
    const playoffWeeks = [15, 16, 17].filter(w => w >= week)
    
    const playerProjections = new Map<string, { avgProj: number }>()
    const batchSize = 100
    const playerIds = relevantPlayers.map(p => p.id)
    
    for (let i = 0; i < playerIds.length; i += batchSize) {
      const batch = playerIds.slice(i, i + batchSize)
      loadingMessage.value = `Fetching projections (${Math.min(i + batchSize, playerIds.length)}/${playerIds.length})...`
      
      try {
        const weekProjs = await sleeperService.getMultiWeekProjections(season, remainingWeeks, batch)
        batch.forEach(playerId => {
          let totalProj = 0, weekCount = 0
          remainingWeeks.forEach(w => {
            const proj = weekProjs.get(w)?.get(playerId)
            const pts = proj?.stats?.pts_ppr || proj?.stats?.pts_half_ppr || 0
            if (pts > 0) { totalProj += pts; weekCount++ }
          })
          playerProjections.set(playerId, { avgProj: weekCount > 0 ? totalProj / weekCount : 0 })
        })
      } catch (err) {
        console.warn('Failed to fetch batch:', err)
      }
    }
    
    loadingMessage.value = 'Calculating baselines...'
    
    const playerPPGs: Record<string, { id: string, ppg: number }[]> = { QB: [], RB: [], WR: [], TE: [] }
    
    relevantPlayers.forEach(player => {
      const proj = playerProjections.get(player.id)
      const playerData = players[player.id]
      let ppg = proj?.avgProj || 0
      if (ppg === 0) {
        const seasonPts = playerData.stats?.pts_ppr || 0
        const gamesPlayed = playerData.stats?.gp || 1
        ppg = gamesPlayed > 0 ? seasonPts / gamesPlayed : 0
      }
      if (ppg >= 1 && playerPPGs[player.position]) {
        playerPPGs[player.position].push({ id: player.id, ppg })
      }
    })
    
    Object.keys(playerPPGs).forEach(pos => playerPPGs[pos].sort((a, b) => b.ppg - a.ppg))
    
    const numTeams = leagueStore.rosters.length || 12
    const replacementRanks: Record<string, number> = {
      QB: Math.ceil(numTeams * 1.2),
      RB: Math.ceil(numTeams * 3),
      WR: Math.ceil(numTeams * 3),
      TE: Math.ceil(numTeams * 1.2)
    }
    
    const baselines: Record<string, { rank: string, ppg: number }> = {}
    Object.keys(replacementRanks).forEach(pos => {
      const rank = replacementRanks[pos]
      const replacementPlayer = playerPPGs[pos][rank - 1]
      baselines[pos] = { rank: `${pos}${rank}`, ppg: replacementPlayer?.ppg || 0 }
    })
    replacementBaselines.value = baselines
    
    loadingMessage.value = 'Applying ranking factors...'
    
    const scoredPlayers: RankedPlayer[] = []
    
    relevantPlayers.forEach(player => {
      const proj = playerProjections.get(player.id)
      const playerData = players[player.id]
      let ppg = proj?.avgProj || 0
      if (ppg === 0) {
        const seasonPts = playerData.stats?.pts_ppr || 0
        const gamesPlayed = playerData.stats?.gp || 1
        ppg = gamesPlayed > 0 ? seasonPts / gamesPlayed : 0
      }
      if (ppg < 3) return
      
      const replacementPPG = baselines[player.position]?.ppg || 0
      const vor = ppg - replacementPPG
      
      // Calculate SOS values
      const rosSOS = calculatePlayerSOS(player.team, player.position, remainingWeeks)
      const next4SOS = calculatePlayerSOS(player.team, player.position, remainingWeeks.slice(0, 4))
      const playoffSOS = playoffWeeks.length > 0 
        ? calculatePlayerSOS(player.team, player.position, playoffWeeks) 
        : 0
      
      // Get bye week
      const byeWeek = getByeWeek(player.team) || playerData.bye_week || null
      const gamesRemaining = remainingWeeks.length - (byeWeek && byeWeek >= week ? 1 : 0)
      
      // Calculate historical performance metrics
      const weeklyScores = getPlayerWeeklyScores(player.id, historicalMatchups, week - 1)
      const seasonPPG = calculateSeasonPPG(weeklyScores)
      const recentPPG = calculateRecentPPG(weeklyScores, 4)
      const trendMultiplier = calculateTrendMultiplier(recentPPG, seasonPPG > 0 ? seasonPPG : ppg)
      const consistency = calculateConsistency(weeklyScores)
      // Trend indicator will be calculated after we have position ranks
      const consistencyRating = getConsistencyRating(consistency, seasonPPG > 0 ? seasonPPG : ppg)
      
      // Calculate ceiling/floor from historical data or estimate from PPG
      const validScores = weeklyScores.filter(s => s > 0)
      let ceiling = ppg * 1.3
      let floor = ppg * 0.7
      if (validScores.length >= 3) {
        const sorted = [...validScores].sort((a, b) => a - b)
        ceiling = sorted[Math.floor(sorted.length * 0.75)] || ceiling
        floor = sorted[Math.floor(sorted.length * 0.25)] || floor
      }
      
      // Get team context factors
      const teamPace = TEAM_PACE[player.team] || 1.0
      const passRatio = TEAM_PASS_RATIO[player.team] || 0.58
      const redZoneShare = TEAM_RED_ZONE_EFFICIENCY[player.team] || 0.55
      const garbageTimeBoost = TEAM_GARBAGE_TIME_FACTOR[player.team] || 1.0
      
      // Build player ranking data for factor calculation
      const playerRankingData: PlayerRankingData = {
        player_id: player.id,
        baseProjection: ppg,
        seasonPPG: seasonPPG > 0 ? seasonPPG : ppg,
        recentPPG: recentPPG > 0 ? recentPPG : ppg,
        trendMultiplier,
        consistency,
        weeklyScores,
        ceiling,
        floor,
        rosSOS,
        next4SOS,
        playoffSOS,
        teamPace,
        passRatio,
        redZoneShare,
        garbageTimeBoost,
        vegasImpliedTotal: 0,
        vegasSpread: 0,
        weatherImpact: 1.0,
        injuryStatus: playerData.injury_status || null,
        byeWeek,
        gamesRemaining
      }
      
      // Calculate final score using enabled factors
      const { score: rosScore, breakdown } = calculateFinalScore(
        playerRankingData,
        rankingFactors.value,
        replacementPPG
      )
      
      // Apply positional scarcity if enabled
      const scarcityFactor = rankingFactors.value.find(f => f.id === 'positionalScarcity')
      const scarcityMult = scarcityFactor?.enabled ? getScarcityMultiplier(player.position) : 1.0
      const finalScore = rosScore * scarcityMult
      
      scoredPlayers.push({
        player_id: player.id,
        full_name: playerData.full_name || `${playerData.first_name} ${playerData.last_name}`,
        position: player.position,
        team: player.team,
        rosRank: 0,
        positionRank: 0,
        rankChange: 0,
        rosSOS,
        next4SOS,
        playoffSOS,
        ppg,
        vor,
        byeWeek,
        tier: 0,
        rosScore: finalScore,
        injury_status: playerData.injury_status || null,
        recentPPG: recentPPG > 0 ? recentPPG : ppg,
        trendMultiplier,
        trendIndicator: 'neutral' as 'hot' | 'cold' | 'neutral', // Will be recalculated after position ranks
        weeklyScores, // Store for recalculating trend
        consistency,
        consistencyRating,
        ceiling,
        floor,
        teamPace,
        passRatio,
        redZoneShare,
        garbageTimeBoost,
        factorBreakdown: breakdown
      })
    })
    
    scoredPlayers.sort((a, b) => b.rosScore - a.rosScore)
    
    const top200 = scoredPlayers.slice(0, 200)
    const positionCounts: Record<string, number> = { QB: 0, RB: 0, WR: 0, TE: 0 }
    
    // Get previous week rankings WITH SAME FACTOR CONFIG
    const factorAwarePrevRanks = getPreviousRankings(week)
    // Fallback to regular weekly rankings if no factor-aware cache
    const prevWeekRanks = factorAwarePrevRanks || weeklyRankings.value.get(week - 1)
    
    top200.forEach((player, idx) => {
      player.rosRank = idx + 1
      positionCounts[player.position]++
      player.positionRank = positionCounts[player.position]
      
      // Now recalculate trend indicator with position rank
      player.trendIndicator = getTrendIndicator(
        player.trendMultiplier,
        player.weeklyScores,
        player.ppg,
        player.positionRank
      )
      
      if (prevWeekRanks?.has(player.player_id)) {
        const prevRank = prevWeekRanks.get(player.player_id)!
        player.rankChange = prevRank - player.rosRank
      }
      
      const pct = idx / 200
      if (pct < 0.05) player.tier = 1
      else if (pct < 0.15) player.tier = 2
      else if (pct < 0.35) player.tier = 3
      else if (pct < 0.55) player.tier = 4
      else if (pct < 0.75) player.tier = 5
      else player.tier = 6
    })
    
    // Store this week's rankings (both regular and factor-aware)
    const currentRanks = new Map<string, number>()
    top200.forEach(p => currentRanks.set(p.player_id, p.rosRank))
    weeklyRankings.value.set(week, currentRanks)
    storePreviousRankings(week, currentRanks)
    
    rankedPlayers.value = top200
    lastUpdated.value = new Date().toLocaleString()
    
    // Log enabled factors for debugging
    const enabledFactors = rankingFactors.value.filter(f => f.enabled).map(f => f.name)
    console.log('✅ Rankings calculated with factors:', enabledFactors)
    
    // Check if we have custom rankings for this week
    if (customRankingsData.value.has(week)) {
      hasCustomRankings.value = true
      customRankingsWeek.value = week
      customRankingsCount.value = customRankingsData.value.get(week)!.size
      applyCustomRankings(customRankingsData.value.get(week)!, week)
    }
    
  } catch (err) {
    console.error('Failed to load projections:', err)
  } finally {
    isLoading.value = false
  }
}

/**
 * Calculate player's strength of schedule using real defense rankings
 * Returns average PAE (Points Above Expectation) for the given weeks
 * Positive = easier schedule, Negative = harder schedule
 */
function calculatePlayerSOS(team: string | null, position: string, weeks: number[]): number {
  if (!team || weeks.length === 0) return 0
  
  // Get defense rankings for this position
  const positionRankings = defenseRankings.value.get(position)
  if (!positionRankings || positionRankings.length === 0) {
    // Fallback to old method if rankings not loaded
    return 0
  }
  
  // Build a map of team -> PAE for quick lookup
  const defenseByTeam = new Map<string, number>()
  positionRankings.forEach(d => {
    defenseByTeam.set(d.team, d.adjustmentDelta)
  })
  
  // Get the team's schedule for the given weeks
  const schedule = nflSchedule2025[team]
  if (!schedule) return 0
  
  let totalPAE = 0
  let matchupCount = 0
  
  weeks.forEach(week => {
    const matchup = schedule[week]
    if (matchup) {
      const opponentPAE = defenseByTeam.get(matchup.opp)
      if (opponentPAE !== undefined) {
        totalPAE += opponentPAE
        matchupCount++
      }
    }
  })
  
  // Return average PAE across all matchups
  // Normalize to a -0.5 to +0.5 scale for compatibility with existing code
  // PAE typically ranges from -6 to +6, so divide by 12 to get -0.5 to +0.5
  const avgPAE = matchupCount > 0 ? totalPAE / matchupCount : 0
  return avgPAE / 12
}

// ==================== TEAMS TAB LOGIC ====================

const numTeams = computed(() => leagueStore.rosters.length || 12)
const selectedTeamId = ref<string | null>(null)
const isMobileView = ref(false)

// Check for mobile view
function checkMobileView() {
  isMobileView.value = window.innerWidth < 1024
}

// Parse roster positions from league settings
const rosterRequirements = computed(() => {
  const positions = leagueStore.currentLeague?.roster_positions || []
  const reqs: Record<string, number> = { QB: 0, RB: 0, WR: 0, TE: 0, FLEX: 0, SUPER_FLEX: 0 }
  
  positions.forEach(pos => {
    if (pos === 'QB') reqs.QB++
    else if (pos === 'RB') reqs.RB++
    else if (pos === 'WR') reqs.WR++
    else if (pos === 'TE') reqs.TE++
    else if (pos === 'FLEX') reqs.FLEX++
    else if (pos === 'SUPER_FLEX' || pos === 'SUPER FLEX') reqs.SUPER_FLEX++
  })
  
  return reqs
})

// Calculate tier thresholds for each position based on roster requirements
const positionTierThresholds = computed(() => {
  const n = numTeams.value
  const reqs = rosterRequirements.value
  
  // For each position, calculate how many "starters" exist league-wide
  // Starter 1 = Position gets dedicated starting spot
  // Starter 2 = Second dedicated starting spot OR can fill FLEX
  // Flex = Can fill FLEX spots
  // Bench = Beyond flex-worthy
  
  return {
    QB: {
      starter1: n * reqs.QB,                                    // e.g., 10 QBs for 10-team 1QB
      starter2: n * (reqs.QB + (reqs.SUPER_FLEX > 0 ? 1 : 0)), // SF leagues add another tier
      flex: n * (reqs.QB + reqs.SUPER_FLEX),                    // All starting QBs
      bench: n * (reqs.QB + reqs.SUPER_FLEX + 1)               // Beyond starting
    },
    RB: {
      starter1: n * 1,                                          // RB1 for each team
      starter2: n * reqs.RB,                                    // All starting RBs (usually 2)
      flex: n * (reqs.RB + reqs.FLEX),                          // RBs who can start in FLEX
      bench: n * (reqs.RB + reqs.FLEX + 1)                      // Bench RBs
    },
    WR: {
      starter1: n * 1,                                          // WR1 for each team  
      starter2: n * reqs.WR,                                    // All starting WRs (usually 2-3)
      flex: n * (reqs.WR + reqs.FLEX),                          // WRs who can start in FLEX
      bench: n * (reqs.WR + reqs.FLEX + 1)                      // Bench WRs
    },
    TE: {
      starter1: n * reqs.TE,                                    // Starting TEs (usually 1)
      starter2: n * (reqs.TE + Math.min(1, reqs.FLEX)),        // TE + maybe flex
      flex: n * (reqs.TE + reqs.FLEX),                          // TEs in flex
      bench: n * (reqs.TE + reqs.FLEX + 1)                      // Bench TEs
    }
  }
})

interface TeamWithRankings {
  odwnerId: string
  rosterId: number
  teamName: string
  username: string
  avatarUrl: string
  playersByPosition: Record<string, RankedPlayer[]>
  positionAverages: Record<string, number>
  positionGrades: Record<string, string>
  positionNeeds: Record<string, string>
  overallGrade: string
  strengths: string[]
  weaknesses: string[]
}

// Build team data with rankings
const teamsWithRankings = computed<TeamWithRankings[]>(() => {
  const teams: TeamWithRankings[] = []
  const reqs = rosterRequirements.value
  const thresholds = positionTierThresholds.value
  
  leagueStore.rosters.forEach(roster => {
    const user = leagueStore.users.find(u => u.user_id === roster.owner_id)
    const teamName = sleeperService.getTeamName(roster, user)
    const avatarUrl = sleeperService.getAvatarUrl(roster, user, leagueStore.currentLeague!)
    
    // Get this team's players from rankings
    const teamPlayers = rankedPlayers.value.filter(p => 
      roster.players?.includes(p.player_id)
    )
    
    // Group by position
    const playersByPosition: Record<string, RankedPlayer[]> = { QB: [], RB: [], WR: [], TE: [] }
    teamPlayers.forEach(p => {
      if (playersByPosition[p.position]) {
        playersByPosition[p.position].push(p)
      }
    })
    
    // Sort each position by position rank
    Object.keys(playersByPosition).forEach(pos => {
      playersByPosition[pos].sort((a, b) => a.positionRank - b.positionRank)
    })
    
    // Calculate position averages, grades, and needs
    const positionAverages: Record<string, number> = {}
    const positionGrades: Record<string, string> = {}
    const positionNeeds: Record<string, string> = {}
    const strengths: string[] = []
    const weaknesses: string[] = []
    
    const posKeys = ['QB', 'RB', 'WR', 'TE'] as const
    posKeys.forEach(pos => {
      const players = playersByPosition[pos]
      const posThreshold = thresholds[pos]
      const required = pos === 'QB' ? reqs.QB : pos === 'RB' ? reqs.RB : pos === 'WR' ? reqs.WR : reqs.TE
      const flexSpots = reqs.FLEX
      
      if (players.length > 0) {
        // Calculate weighted average (starters matter more)
        const weights = players.map((_, i) => {
          if (i < required) return 3 // Starters
          if (i < required + flexSpots) return 2 // Flex-worthy
          return 1 // Bench
        })
        const totalWeight = weights.reduce((a, b) => a + b, 0)
        const weightedSum = players.reduce((sum, p, i) => sum + (p.positionRank * weights[i]), 0)
        const avgRank = weightedSum / totalWeight
        positionAverages[pos] = avgRank
        
        // Calculate grade based on tier thresholds
        const grade = getGradeFromAvgRank(avgRank, pos)
        positionGrades[pos] = grade
        
        // Check for needs based on roster requirements
        // Need: Do you have enough players in the top tiers to fill starting spots?
        const startersInTop2 = players.filter(p => p.positionRank <= posThreshold.starter2).length
        const flexWorthy = players.filter(p => p.positionRank <= posThreshold.flex).length
        
        if (startersInTop2 < required) {
          positionNeeds[pos] = `Need ${required - startersInTop2} more starter-level`
          weaknesses.push(pos)
        } else if (flexWorthy < required + (pos !== 'QB' && pos !== 'TE' ? Math.ceil(flexSpots / 2) : 0)) {
          // For RB/WR, should have some flex-worthy depth
          positionNeeds[pos] = `Thin depth`
          if (!weaknesses.includes(pos)) weaknesses.push(pos)
        } else if (grade.startsWith('A')) {
          strengths.push(pos)
        } else if (grade === 'D+' || grade === 'D' || grade === 'D-' || grade === 'F') {
          if (!weaknesses.includes(pos)) weaknesses.push(pos)
        }
      } else {
        positionGrades[pos] = 'F'
        positionNeeds[pos] = `No ranked ${pos}s`
        weaknesses.push(pos)
      }
    })
    
    // Calculate overall grade
    const gradeValues: Record<string, number> = {
      'A+': 12, 'A': 11, 'A-': 10, 'B+': 9, 'B': 8, 'B-': 7,
      'C+': 6, 'C': 5, 'C-': 4, 'D+': 3, 'D': 2, 'D-': 1, 'F': 0
    }
    const posWeights: Record<string, number> = { 
      QB: reqs.QB + (reqs.SUPER_FLEX > 0 ? 1 : 0), 
      RB: reqs.RB + (reqs.FLEX > 0 ? 1 : 0), 
      WR: reqs.WR + (reqs.FLEX > 0 ? 1 : 0), 
      TE: reqs.TE 
    }
    let totalGradeValue = 0
    let totalWeight = 0
    Object.keys(positionGrades).forEach(pos => {
      const weight = posWeights[pos] || 1
      totalGradeValue += (gradeValues[positionGrades[pos]] || 0) * weight
      totalWeight += weight
    })
    const avgGradeValue = totalGradeValue / totalWeight
    const overallGrade = getGradeFromValue(avgGradeValue)
    
    teams.push({
      odwnerId: roster.owner_id,
      rosterId: roster.roster_id,
      teamName,
      username: user?.display_name || user?.username || 'Unknown',
      avatarUrl,
      playersByPosition,
      positionAverages,
      positionGrades,
      positionNeeds,
      overallGrade,
      strengths,
      weaknesses
    })
  })
  
  // Sort: user's team first, then by overall grade
  teams.sort((a, b) => {
    if (a.odwnerId === leagueStore.currentUserId) return -1
    if (b.odwnerId === leagueStore.currentUserId) return 1
    const gradeOrder = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F']
    return gradeOrder.indexOf(a.overallGrade) - gradeOrder.indexOf(b.overallGrade)
  })
  
  return teams
})

// Expanded team state for detail view
const expandedTeamId = ref<string | null>(null)

// Get expanded team data
const expandedTeam = computed(() => {
  if (!expandedTeamId.value) return null
  return teamsWithRankings.value.find(t => t.odwnerId === expandedTeamId.value)
})

// Calculate starter-based grades for a position
/**
 * Calculate starter grade for a position group - LEAGUE SIZE AWARE
 * 
 * Uses weighted average of starter ranks, with penalties for:
 * - Missing starters
 * - Large gaps between starters (e.g., RB1 is #3 but RB2 is #45)
 */
function calculateStarterGrade(players: any[], requiredStarters: number, position: string): string {
  if (!players || players.length === 0) return 'F'
  
  const n = numTeams.value
  
  // League size adjustment - stricter for smaller leagues
  const leagueSizeAdjustment = n <= 8 ? 0.7 : n <= 10 ? 0.85 : n === 12 ? 1.0 : n <= 14 ? 1.1 : 1.2
  
  // Get the players who would be starters (sorted by rank already)
  const starters = players.slice(0, requiredStarters)
  
  if (starters.length === 0) return 'F'
  
  // Calculate average rank of starters with HEAVIER weighting on primary starter
  let totalWeight = 0
  let weightedRankSum = 0
  
  starters.forEach((player, idx) => {
    // First starter gets weight 4, second gets 2, third gets 1, etc.
    const weight = idx === 0 ? 4 : idx === 1 ? 2 : 1
    totalWeight += weight
    weightedRankSum += player.positionRank * weight
  })
  
  // Penalize if you don't have enough starters - HARSH penalty
  const missingStarters = Math.max(0, requiredStarters - starters.length)
  if (missingStarters > 0) {
    // Missing a starter is very bad - penalize heavily
    const penaltyRank = n * 5 // Equivalent to deep bench player
    for (let i = 0; i < missingStarters; i++) {
      const weight = i === 0 ? 3 : 1.5 // Missing primary starter is worse
      totalWeight += weight
      weightedRankSum += penaltyRank * weight
    }
  }
  
  // Additional penalty for large gaps between starters
  if (starters.length >= 2) {
    const gap = starters[1].positionRank - starters[0].positionRank
    if (gap > n) {
      // If your RB2 is more than N ranks below RB1, that's a problem
      const gapPenalty = (gap - n) * 0.5
      weightedRankSum += gapPenalty
    }
  }
  
  const avgRank = weightedRankSum / totalWeight
  
  // Tighter thresholds with league size adjustment
  const thresholds = {
    'A+': n * 0.4 * leagueSizeAdjustment,
    'A':  n * 0.6 * leagueSizeAdjustment,
    'A-': n * 0.85 * leagueSizeAdjustment,
    'B+': n * 1.1 * leagueSizeAdjustment,
    'B':  n * 1.35 * leagueSizeAdjustment,
    'B-': n * 1.6 * leagueSizeAdjustment,
    'C+': n * 1.9 * leagueSizeAdjustment,
    'C':  n * 2.2 * leagueSizeAdjustment,
    'C-': n * 2.6 * leagueSizeAdjustment,
    'D+': n * 3.0 * leagueSizeAdjustment,
    'D':  n * 3.5 * leagueSizeAdjustment,
    'D-': n * 4.5 * leagueSizeAdjustment,
  }
  
  if (avgRank <= thresholds['A+']) return 'A+'
  if (avgRank <= thresholds['A']) return 'A'
  if (avgRank <= thresholds['A-']) return 'A-'
  if (avgRank <= thresholds['B+']) return 'B+'
  if (avgRank <= thresholds['B']) return 'B'
  if (avgRank <= thresholds['B-']) return 'B-'
  if (avgRank <= thresholds['C+']) return 'C+'
  if (avgRank <= thresholds['C']) return 'C'
  if (avgRank <= thresholds['C-']) return 'C-'
  if (avgRank <= thresholds['D+']) return 'D+'
  if (avgRank <= thresholds['D']) return 'D'
  if (avgRank <= thresholds['D-']) return 'D-'
  return 'F'
}

/**
 * Calculate FLEX grade (best available RB/WR/TE after starters) - LEAGUE SIZE AWARE
 * 
 * FLEX is graded on a different scale since these are depth pieces.
 * The expectation is that flex players will be starter-2 to flex tier players.
 */
function calculateFlexGrade(team: any, flexSpots: number): string {
  if (flexSpots === 0) return 'N/A'
  
  const n = numTeams.value
  const reqs = rosterRequirements.value
  
  // League size adjustment
  const leagueSizeAdjustment = n <= 8 ? 0.75 : n <= 10 ? 0.9 : n === 12 ? 1.0 : n <= 14 ? 1.1 : 1.2
  
  // Get remaining players after starters are filled
  const rbRemainder = (team.playersByPosition.RB || []).slice(reqs.RB)
  const wrRemainder = (team.playersByPosition.WR || []).slice(reqs.WR)
  const teRemainder = (team.playersByPosition.TE || []).slice(reqs.TE)
  
  // Combine and sort by rank
  const flexCandidates = [...rbRemainder, ...wrRemainder, ...teRemainder]
    .sort((a, b) => a.positionRank - b.positionRank)
  
  if (flexCandidates.length === 0) return 'F'
  
  // Grade the best flex players
  const flexStarters = flexCandidates.slice(0, flexSpots)
  
  if (flexStarters.length === 0) return 'F'
  
  // Average their ranks, with penalty for missing flex spots
  let totalRank = flexStarters.reduce((sum, p) => sum + p.positionRank, 0)
  const missingFlex = flexSpots - flexStarters.length
  if (missingFlex > 0) {
    totalRank += missingFlex * n * 5 // Heavy penalty for missing flex
  }
  const avgRank = totalRank / flexSpots
  
  // FLEX thresholds - expect these to be lower quality than starters
  // But still stricter than before and league-size aware
  const thresholds = {
    'A+': n * 1.2 * leagueSizeAdjustment,   // Elite flex = solid S2 player
    'A':  n * 1.6 * leagueSizeAdjustment,   // Great flex
    'A-': n * 2.0 * leagueSizeAdjustment,   // Very good flex
    'B+': n * 2.4 * leagueSizeAdjustment,   // Good flex
    'B':  n * 2.8 * leagueSizeAdjustment,   // Above average flex
    'B-': n * 3.2 * leagueSizeAdjustment,   // Average flex
    'C+': n * 3.6 * leagueSizeAdjustment,   // Below average
    'C':  n * 4.0 * leagueSizeAdjustment,   // Weak flex
    'C-': n * 4.5 * leagueSizeAdjustment,   // Poor flex
    'D+': n * 5.0 * leagueSizeAdjustment,   // Bad flex
    'D':  n * 5.5 * leagueSizeAdjustment,   // Very bad
    'D-': n * 6.5 * leagueSizeAdjustment,   // Terrible
  }
  
  if (avgRank <= thresholds['A+']) return 'A+'
  if (avgRank <= thresholds['A']) return 'A'
  if (avgRank <= thresholds['A-']) return 'A-'
  if (avgRank <= thresholds['B+']) return 'B+'
  if (avgRank <= thresholds['B']) return 'B'
  if (avgRank <= thresholds['B-']) return 'B-'
  if (avgRank <= thresholds['C+']) return 'C+'
  if (avgRank <= thresholds['C']) return 'C'
  if (avgRank <= thresholds['C-']) return 'C-'
  if (avgRank <= thresholds['D+']) return 'D+'
  if (avgRank <= thresholds['D']) return 'D'
  if (avgRank <= thresholds['D-']) return 'D-'
  return 'F'
}

// Teams with calculated status scores and starter grades
const rankedTeamsWithStatus = computed(() => {
  const gradeValues: Record<string, number> = {
    'A+': 100, 'A': 92, 'A-': 85, 'B+': 78, 'B': 70, 'B-': 62,
    'C+': 55, 'C': 47, 'C-': 40, 'D+': 32, 'D': 25, 'D-': 18, 'F': 10, 'N/A': 50
  }
  
  const reqs = rosterRequirements.value
  
  return teamsWithRankings.value.map(team => {
    // Calculate starter-based grades for each position
    const starterGrades: Record<string, string> = {
      QB: calculateStarterGrade(team.playersByPosition.QB, reqs.QB + (reqs.SUPER_FLEX || 0), 'QB'),
      RB: calculateStarterGrade(team.playersByPosition.RB, reqs.RB, 'RB'),
      WR: calculateStarterGrade(team.playersByPosition.WR, reqs.WR, 'WR'),
      TE: calculateStarterGrade(team.playersByPosition.TE, reqs.TE, 'TE'),
      FLEX: calculateFlexGrade(team, reqs.FLEX || 0)
    }
    
    // Calculate overall grade from starter grades with position weighting
    const posWeights: Record<string, number> = {
      QB: reqs.QB + (reqs.SUPER_FLEX || 0),
      RB: reqs.RB + Math.ceil((reqs.FLEX || 0) * 0.4), // RBs often fill flex
      WR: reqs.WR + Math.ceil((reqs.FLEX || 0) * 0.4), // WRs often fill flex
      TE: reqs.TE,
      FLEX: reqs.FLEX || 0
    }
    
    let totalGradeValue = 0
    let totalWeight = 0
    
    Object.entries(starterGrades).forEach(([pos, grade]) => {
      if (grade === 'N/A') return
      const weight = posWeights[pos] || 1
      totalGradeValue += (gradeValues[grade] || 50) * weight
      totalWeight += weight
    })
    
    const avgGradeValue = totalWeight > 0 ? totalGradeValue / totalWeight : 50
    
    // Calculate status score using the new formula
    // This creates better distribution across Contender/Competitive/Pretender/Rebuilding
    
    // Factor 1: Overall grade quality (most important)
    const gradeScore = avgGradeValue
    
    // Factor 2: Star power - do you have any elite starters?
    const allPlayers: any[] = []
    Object.entries(team.playersByPosition).forEach(([pos, players]) => {
      (players as any[]).forEach(p => allPlayers.push({ ...p, position: pos }))
    })
    allPlayers.sort((a, b) => a.positionRank - b.positionRank)
    
    const n = numTeams.value
    const eliteCount = allPlayers.filter(p => p.positionRank <= n * 0.5).length
    const starterCount = allPlayers.filter(p => p.positionRank <= n).length
    const starScore = Math.min(100, (eliteCount * 15) + (starterCount * 5))
    
    // Factor 3: Depth - no huge holes
    const grades = Object.values(starterGrades).filter(g => g !== 'N/A')
    const fCount = grades.filter(g => g === 'F').length
    const dCount = grades.filter(g => g.startsWith('D')).length
    const depthPenalty = (fCount * 20) + (dCount * 8)
    const depthScore = Math.max(0, 100 - depthPenalty)
    
    // Combined status score
    const statusScore = Math.round(
      (gradeScore * 0.50) +  // Overall quality
      (starScore * 0.25) +   // Star power
      (depthScore * 0.25)    // Depth/balance
    )
    
    // Get top assets
    const topAssets = allPlayers.slice(0, 5)
    
    return {
      ...team,
      starterGrades,
      statusScore,
      topAssets,
      overallGrade: getGradeFromValue(avgGradeValue / 8.33) // Convert back to letter grade
    }
  }).sort((a, b) => {
    // Sort by status score descending
    return b.statusScore - a.statusScore
  })
})

// Get players for expanded view with individual grades
function getExpandedPositionPlayers(team: any, position: string): any[] {
  const reqs = rosterRequirements.value
  const n = numTeams.value
  
  let players: any[] = []
  
  if (position === 'FLEX') {
    // For FLEX, show the best remaining RB/WR/TE
    const rbRemainder = (team.playersByPosition.RB || []).slice(reqs.RB)
    const wrRemainder = (team.playersByPosition.WR || []).slice(reqs.WR)
    const teRemainder = (team.playersByPosition.TE || []).slice(reqs.TE)
    
    players = [...rbRemainder, ...wrRemainder, ...teRemainder]
      .sort((a, b) => a.positionRank - b.positionRank)
      .slice(0, Math.max(reqs.FLEX || 0, 3)) // Show at least 3 or the required amount
  } else {
    players = team.playersByPosition[position] || []
  }
  
  // Add individual grades and starter status
  const requiredStarters = position === 'FLEX' ? (reqs.FLEX || 0) : (reqs[position] || 0)
  
  return players.map((player: any, idx: number) => {
    const isStarter = idx < requiredStarters
    
    // Individual player grade based on their position rank
    let playerGrade = 'F'
    const rank = player.positionRank
    
    if (rank <= n * 0.3) playerGrade = 'A+'
    else if (rank <= n * 0.6) playerGrade = 'A'
    else if (rank <= n) playerGrade = 'A-'
    else if (rank <= n * 1.3) playerGrade = 'B+'
    else if (rank <= n * 1.6) playerGrade = 'B'
    else if (rank <= n * 2) playerGrade = 'B-'
    else if (rank <= n * 2.5) playerGrade = 'C+'
    else if (rank <= n * 3) playerGrade = 'C'
    else if (rank <= n * 3.5) playerGrade = 'C-'
    else if (rank <= n * 4) playerGrade = 'D+'
    else if (rank <= n * 5) playerGrade = 'D'
    else if (rank <= n * 6) playerGrade = 'D-'
    
    return {
      ...player,
      isStarter,
      playerGrade
    }
  })
}

// Helper function for player grade colors
function getPlayerGradeClass(grade: string): string {
  if (grade.startsWith('A')) return 'bg-green-500/30 text-green-400'
  if (grade.startsWith('B')) return 'bg-cyan-500/30 text-cyan-400'
  if (grade.startsWith('C')) return 'bg-yellow-500/30 text-yellow-400'
  if (grade.startsWith('D')) return 'bg-orange-500/30 text-orange-400'
  return 'bg-red-500/30 text-red-400'
}

// League average grade
const leagueAvgGrade = computed(() => {
  const gradeValues: Record<string, number> = {
    'A+': 12, 'A': 11, 'A-': 10, 'B+': 9, 'B': 8, 'B-': 7,
    'C+': 6, 'C': 5, 'C-': 4, 'D+': 3, 'D': 2, 'D-': 1, 'F': 0
  }
  
  const grades = rankedTeamsWithStatus.value.map(t => gradeValues[t.overallGrade] || 0)
  if (grades.length === 0) return 'C'
  
  const avg = grades.reduce((a, b) => a + b, 0) / grades.length
  return getGradeFromValue(avg)
})

// Top ranked team
const topRankedTeam = computed(() => {
  return rankedTeamsWithStatus.value[0] || null
})

// Contender count (top tier teams)
const contenderTeamCount = computed(() => {
  return rankedTeamsWithStatus.value.filter(t => t.statusScore >= 70).length
})

// Rebuilding count (bottom tier teams)
const rebuildingTeamCount = computed(() => {
  return rankedTeamsWithStatus.value.filter(t => t.statusScore < 40).length
})

// Team status helpers - adjusted thresholds for better distribution
function getTeamStatusClass(score: number): string {
  if (score >= 70) return 'bg-green-500/20 text-green-400'
  if (score >= 55) return 'bg-cyan-500/20 text-cyan-400'
  if (score >= 40) return 'bg-yellow-500/20 text-yellow-400'
  return 'bg-red-500/20 text-red-400'
}

function getTeamStatusLabel(score: number): string {
  if (score >= 70) return 'Contender'
  if (score >= 55) return 'Competitive'
  if (score >= 40) return 'Pretender'
  return 'Rebuilding'
}

function getAssetTierClass(posRank: number, position: string): string {
  const n = numTeams.value
  if (posRank <= n * 0.5) return 'bg-yellow-500/20 text-yellow-400' // Elite
  if (posRank <= n) return 'bg-green-500/20 text-green-400'         // Starter 1
  if (posRank <= n * 2) return 'bg-cyan-500/20 text-cyan-400'       // Starter 2
  return 'bg-gray-500/20 text-gray-400'                              // Flex/Bench
}

// Calculate grade from average position rank
/**
 * Get grade from average position rank - LEAGUE SIZE AWARE
 * 
 * The key insight: In smaller leagues, everyone has better players,
 * so the bar for each grade should be HIGHER (stricter).
 * 
 * 8-team:  Elite players everywhere - need top-tier to get A
 * 10-team: Good depth available - slightly easier
 * 12-team: Standard league - balanced grading
 * 14-team: Thin waiver wire - more forgiving
 * 16-team: Very deep - even more forgiving
 */
function getGradeFromAvgRank(avgRank: number, position: string): string {
  const n = numTeams.value
  
  // League size adjustment factor
  // Smaller leagues = stricter (multiply thresholds by less)
  // Larger leagues = more forgiving (multiply thresholds by more)
  const leagueSizeAdjustment = n <= 8 ? 0.7 : n <= 10 ? 0.85 : n === 12 ? 1.0 : n <= 14 ? 1.1 : 1.2
  
  // Base thresholds (calibrated for 12-team league)
  // These are TIGHTER than before to spread grades more evenly
  const thresholds = {
    'A+': n * 0.4 * leagueSizeAdjustment,   // Elite - top 40% of starter 1 tier
    'A':  n * 0.6 * leagueSizeAdjustment,   // Excellent - top 60% of starter 1
    'A-': n * 0.85 * leagueSizeAdjustment,  // Very good - most of starter 1
    'B+': n * 1.1 * leagueSizeAdjustment,   // Good - borderline S1/S2
    'B':  n * 1.35 * leagueSizeAdjustment,  // Above average - solid S2
    'B-': n * 1.6 * leagueSizeAdjustment,   // Average - mid S2
    'C+': n * 1.9 * leagueSizeAdjustment,   // Below average - low S2
    'C':  n * 2.2 * leagueSizeAdjustment,   // Weak - borderline S2/Flex
    'C-': n * 2.6 * leagueSizeAdjustment,   // Poor - flex territory
    'D+': n * 3.0 * leagueSizeAdjustment,   // Bad - low flex
    'D':  n * 3.5 * leagueSizeAdjustment,   // Very bad - bench level
    'D-': n * 4.5 * leagueSizeAdjustment,   // Terrible - deep bench
  }
  
  if (avgRank <= thresholds['A+']) return 'A+'
  if (avgRank <= thresholds['A']) return 'A'
  if (avgRank <= thresholds['A-']) return 'A-'
  if (avgRank <= thresholds['B+']) return 'B+'
  if (avgRank <= thresholds['B']) return 'B'
  if (avgRank <= thresholds['B-']) return 'B-'
  if (avgRank <= thresholds['C+']) return 'C+'
  if (avgRank <= thresholds['C']) return 'C'
  if (avgRank <= thresholds['C-']) return 'C-'
  if (avgRank <= thresholds['D+']) return 'D+'
  if (avgRank <= thresholds['D']) return 'D'
  if (avgRank <= thresholds['D-']) return 'D-'
  return 'F'
}

/**
 * Convert numeric grade value back to letter grade
 * Used for overall team grades (weighted average of position grades)
 */
function getGradeFromValue(value: number): string {
  // Slightly adjusted thresholds for better distribution
  if (value >= 11) return 'A+'
  if (value >= 10) return 'A'
  if (value >= 9) return 'A-'
  if (value >= 8) return 'B+'
  if (value >= 7) return 'B'
  if (value >= 6) return 'B-'
  if (value >= 5) return 'C+'
  if (value >= 4) return 'C'
  if (value >= 3) return 'C-'
  if (value >= 2) return 'D+'
  if (value >= 1) return 'D'
  if (value >= 0.5) return 'D-'
  return 'F'
}

// Color classes for position rank - 4 tier system
function getPositionRankBgClass(posRank: number, position: string): string {
  const n = numTeams.value
  if (posRank <= n) return 'bg-green-500/30'           // Starter 1
  if (posRank <= n * 2) return 'bg-lime-500/30'        // Starter 2
  if (posRank <= n * 3) return 'bg-yellow-500/30'      // Flex
  return 'bg-red-500/30'                               // Bench
}

function getPositionRankTextClass(posRank: number, position: string): string {
  const n = numTeams.value
  if (posRank <= n) return 'text-green-400'            // Starter 1
  if (posRank <= n * 2) return 'text-lime-400'         // Starter 2
  if (posRank <= n * 3) return 'text-yellow-400'       // Flex
  return 'text-red-400'                                // Bench
}

// Injury dot class
function getInjuryDotClass(status: string): string {
  if (status === 'Out' || status === 'IR') return 'bg-red-500'
  if (status === 'Doubtful') return 'bg-red-400'
  if (status === 'Questionable') return 'bg-yellow-400'
  return 'bg-green-400'
}

// Color classes for overall ROS rank
function getRosRankBgClass(rosRank: number): string {
  if (rosRank <= 24) return 'bg-green-500/20'
  if (rosRank <= 75) return 'bg-yellow-500/20'
  if (rosRank <= 150) return 'bg-orange-500/20'
  return 'bg-red-500/20'
}

function getRosRankTextClass(rosRank: number): string {
  if (rosRank <= 24) return 'text-green-400'
  if (rosRank <= 75) return 'text-yellow-400'
  if (rosRank <= 150) return 'text-orange-400'
  return 'text-red-400'
}

// Color for average rank
function getPositionAvgRankClass(avgRank: number | undefined): string {
  if (!avgRank) return 'text-dark-textMuted'
  const n = numTeams.value
  if (avgRank <= n) return 'text-green-400'
  if (avgRank <= n * 2) return 'text-lime-400'
  if (avgRank <= n * 3) return 'text-yellow-400'
  return 'text-red-400'
}

// Grade color classes
function getTeamGradeClass(grade: string): string {
  if (grade.startsWith('A')) return 'text-green-400'
  if (grade.startsWith('B')) return 'text-blue-400'
  if (grade.startsWith('C')) return 'text-yellow-400'
  if (grade.startsWith('D')) return 'text-orange-400'
  return 'text-red-400'
}

function getPositionGradeClass(grade: string): string {
  return getTeamGradeClass(grade)
}

function handleTeamImageError(e: Event) {
  const img = e.target as HTMLImageElement
  img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%233a3d52"/%3E%3C/svg%3E'
}

// Trade partner finder
const tradePartners = computed(() => {
  const myTeam = teamsWithRankings.value.find(t => t.odwnerId === leagueStore.currentUserId)
  if (!myTeam) return []
  
  const partners: Array<{
    odwnerId: string
    teamName: string
    username: string
    avatarUrl: string
    theyNeed: string[]
    youNeed: string[]
    matchScore: number
  }> = []
  
  teamsWithRankings.value.forEach(team => {
    if (team.odwnerId === leagueStore.currentUserId) return
    
    // What positions do they need (where they're weak)?
    const theyNeed = team.weaknesses.filter(pos => myTeam.strengths.includes(pos))
    // What positions do you need (where you're weak) that they have?
    const youNeed = myTeam.weaknesses.filter(pos => team.strengths.includes(pos))
    
    if (theyNeed.length > 0 && youNeed.length > 0) {
      // Calculate match score (higher = better match)
      const matchScore = Math.round(((theyNeed.length + youNeed.length) / 4) * 100)
      
      partners.push({
        odwnerId: team.odwnerId,
        teamName: team.teamName,
        username: team.username,
        avatarUrl: team.avatarUrl,
        theyNeed,
        youNeed,
        matchScore
      })
    }
  })
  
  // Sort by match score descending
  partners.sort((a, b) => b.matchScore - a.matchScore)
  
  return partners.slice(0, 5) // Top 5 matches
})

// ==================== THIS WEEK TAB LOGIC ====================

// Weekly custom rankings state
const weeklyHasCustomRankings = ref(false)
const weeklyCustomRankings = ref<Map<string, { rank: number, tier: number, overallRank?: number }>>(new Map())
const weeklyCustomRankingsCount = ref(0)

// Sleeper weekly projections
const sleeperWeeklyProjections = ref<Map<string, number>>(new Map())
const weeklyProjectionsLoaded = ref(false)
const weeklyProjectionsLoading = ref(false)

// Game totals (betting over/under)
const gameTotals = ref<Map<string, number>>(new Map())

// NFL Schedule data
const nflSchedule = ref<any[]>([])

// CSV instructions toggle
const showWeeklyCSVInstructions = ref(false)

// Weekly projection settings modal
const showWeeklyProjectionSettings = ref(false)
const weeklyAnalystRequestName = ref('')
const weeklyAnalystSampleFileName = ref<string | null>(null)
const weeklyAnalystRequestSubmitted = ref(false)

// Position selector for This Week tab
const selectedWeeklyPosition = ref<string>('QB')
const weeklyPositionOptions = [
  { id: 'QB', label: 'QB' },
  { id: 'RB', label: 'RB' },
  { id: 'WR', label: 'WR' },
  { id: 'TE', label: 'TE' },
  { id: 'FLEX', label: 'FLEX' }
]

// Load weekly projections from Sleeper
async function loadWeeklyProjections() {
  if (weeklyProjectionsLoading.value) return
  weeklyProjectionsLoading.value = true
  
  try {
    const season = leagueStore.currentSeason
    const week = currentWeek.value
    
    // Fetch Sleeper's weekly projections
    const projections = await sleeperService.getAllWeekProjections(season, week)
    
    const projMap = new Map<string, number>()
    Object.entries(projections).forEach(([playerId, data]: [string, any]) => {
      // Get PPR points projection from Sleeper
      const pts = data?.stats?.pts_ppr || data?.stats?.pts_half_ppr || data?.stats?.pts_std || 0
      if (pts > 0) {
        projMap.set(playerId, pts)
      }
    })
    
    sleeperWeeklyProjections.value = projMap
    weeklyProjectionsLoaded.value = true
    
    // Also fetch schedule for matchups
    const schedule = await sleeperService.getNflSchedule(season, week)
    nflSchedule.value = schedule
    
    // Build game totals map with realistic estimates based on team tendencies
    // Note: In production, you'd fetch from The Odds API: https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds
    const teamTotals: Record<string, number> = {
      // High-scoring offenses tend to have higher O/U
      'DET': 51.5, 'BAL': 49.5, 'MIA': 49.0, 'DAL': 48.5, 'BUF': 48.5,
      'SF': 47.5, 'PHI': 47.0, 'CIN': 47.0, 'JAX': 46.5, 'KC': 46.5,
      'LAC': 46.0, 'HOU': 45.5, 'MIN': 45.5, 'SEA': 45.5, 'GB': 45.0,
      'ATL': 45.0, 'LAR': 44.5, 'TB': 44.5, 'IND': 44.0, 'ARI': 44.0,
      'NYJ': 43.5, 'DEN': 43.5, 'CHI': 43.0, 'LV': 43.0, 'WAS': 43.0,
      'PIT': 42.5, 'NO': 42.5, 'TEN': 42.0, 'CLE': 41.5, 'NE': 41.0,
      'NYG': 40.5, 'CAR': 40.0
    }
    
    const totalsMap = new Map<string, number>()
    schedule.forEach((game: any) => {
      // Average the two teams' typical totals
      const homeTotal = teamTotals[game.home] || 44.5
      const awayTotal = teamTotals[game.away] || 44.5
      const gameTotal = (homeTotal + awayTotal) / 2
      
      if (game.home) totalsMap.set(game.home, gameTotal)
      if (game.away) totalsMap.set(game.away, gameTotal)
    })
    gameTotals.value = totalsMap
    
  } catch (error) {
    console.error('Failed to load weekly projections:', error)
  } finally {
    weeklyProjectionsLoading.value = false
  }
}

// Get roster requirements for starting spots
function getStartCount(pos: string): number {
  const reqs = rosterRequirements.value
  if (pos === 'QB') return reqs.QB || 1
  if (pos === 'RB') return reqs.RB || 2
  if (pos === 'WR') return reqs.WR || 2
  if (pos === 'TE') return reqs.TE || 1
  if (pos === 'FLEX') {
    // FLEX shows total starters: RB + WR + TE + FLEX spots
    return (reqs.RB || 2) + (reqs.WR || 2) + (reqs.TE || 1) + (reqs.FLEX || 1)
  }
  return 1
}

// Get title for weekly position
function getWeeklyPositionTitle(pos: string): string {
  if (pos === 'FLEX') return 'All Starters (RB/WR/TE + FLEX)'
  return pos + 's'
}

// Get slot class for lineup display
function getSlotClass(slot: string): string {
  if (slot === 'QB') return 'bg-red-500/30 text-red-400'
  if (slot === 'RB') return 'bg-green-500/30 text-green-400'
  if (slot === 'WR') return 'bg-blue-500/30 text-blue-400'
  if (slot === 'TE') return 'bg-yellow-500/30 text-yellow-400'
  if (slot === 'FLEX') return 'bg-purple-500/30 text-purple-400'
  if (slot === 'SUPER_FLEX' || slot === 'SF') return 'bg-pink-500/30 text-pink-400'
  return 'bg-dark-border/30 text-dark-textMuted'
}

// Get weekly matchup for a player
function getWeeklyMatchup(player: RankedPlayer): string {
  if (!player.team) return '—'
  
  // Try to find from schedule
  const game = nflSchedule.value.find((g: any) => g.home === player.team || g.away === player.team)
  if (game) {
    if (game.home === player.team) {
      return `vs ${game.away}`
    } else {
      return `@ ${game.home}`
    }
  }
  
  // Fallback to hardcoded (would be replaced with real schedule)
  const matchups: Record<string, string> = {
    'KC': 'vs CLE', 'BUF': '@ DEN', 'PHI': 'vs DAL', 'SF': '@ SEA',
    'DET': 'vs CHI', 'BAL': '@ NYG', 'CIN': 'vs TEN', 'MIA': '@ NE',
    'DAL': '@ PHI', 'GB': 'vs SEA', 'MIN': '@ LAR', 'LAR': 'vs MIN',
    'SEA': 'vs GB', 'NYJ': '@ JAX', 'JAX': 'vs NYJ', 'HOU': '@ PIT',
    'DEN': 'vs BUF', 'CLE': '@ KC', 'PIT': 'vs HOU', 'LV': '@ ATL',
    'ATL': 'vs LV', 'NO': '@ WAS', 'WAS': 'vs NO', 'TB': '@ CAR',
    'CAR': 'vs TB', 'CHI': '@ DET', 'IND': 'vs ARI', 'ARI': '@ IND',
    'TEN': '@ CIN', 'NYG': 'vs BAL', 'NE': 'vs MIA', 'LAC': 'BYE'
  }
  return matchups[player.team] || 'TBD'
}

// Get game total for a player's team
function getGameTotal(team: string | null): number | null {
  if (!team) return null
  return gameTotals.value.get(team) || null
}

// Calculate tier for weekly rankings based on position
function calculateWeeklyTier(projection: number, position: string): number {
  // Tier thresholds by position
  const thresholds: Record<string, number[]> = {
    QB: [25, 22, 19, 16, 13, 10], // Tier 1: 25+, Tier 2: 22-25, etc.
    RB: [18, 15, 12, 9, 6, 4],
    WR: [18, 15, 12, 9, 6, 4],
    TE: [14, 11, 8, 6, 4, 2]
  }
  
  const posThresholds = thresholds[position] || thresholds.RB
  
  for (let i = 0; i < posThresholds.length; i++) {
    if (projection >= posThresholds[i]) return i + 1
  }
  return posThresholds.length + 1
}

// Get tier color class
function getTierColorClass(tier: number | undefined): string {
  if (!tier) return 'text-dark-textMuted'
  if (tier === 1) return 'text-green-400'
  if (tier === 2) return 'text-lime-400'
  if (tier === 3) return 'text-yellow-400'
  if (tier === 4) return 'text-orange-400'
  if (tier === 5) return 'text-red-400'
  return 'text-dark-textMuted'
}

// Get matchup difficulty class (based on opponent's defense ranking)
function getMatchupDifficultyClass(player: RankedPlayer): string {
  // Use SOS as a proxy for matchup difficulty
  const sos = player.rosSOS || 0
  if (sos > 0.1) return 'bg-green-500'
  if (sos > 0) return 'bg-green-400'
  if (sos > -0.1) return 'bg-yellow-400'
  if (sos > -0.2) return 'bg-orange-400'
  return 'bg-red-500'
}

// Get matchup difficulty bar width
function getMatchupDifficultyWidth(player: RankedPlayer): string {
  const sos = player.rosSOS || 0
  // Convert SOS (-0.5 to +0.5) to percentage (5% to 95%)
  const normalized = (sos + 0.5) / 1 * 100
  return `${Math.max(5, Math.min(95, normalized))}%`
}

// Show tier break between players (always show, not just for custom rankings)
function showWeeklyTierBreak(player: RankedPlayer & { weeklyTier?: number }, index: number, pos: string): boolean {
  if (!player.weeklyTier) return false
  if (index === 0) return true
  const players = getWeeklyPositionPlayers(pos)
  const prevPlayer = players[index - 1]
  return prevPlayer && player.weeklyTier !== prevPlayer.weeklyTier
}

// Row class for This Week tab
function getWeeklyRowClass(player: RankedPlayer): string {
  if (isMyPlayer(player.player_id)) {
    return 'bg-primary/10 border-l-2 border-primary'
  }
  if (isFreeAgent(player.player_id)) {
    return 'bg-cyan-500/5 border-l-2 border-cyan-400'
  }
  return ''
}

// Get projected points color class
function getProjectedPointsClass(pts?: number): string {
  if (!pts) return 'text-dark-textMuted'
  if (pts >= 20) return 'text-green-400'
  if (pts >= 15) return 'text-lime-400'
  if (pts >= 10) return 'text-yellow-400'
  if (pts >= 5) return 'text-orange-400'
  return 'text-red-400'
}

// Get start/sit verdict - updated for FLEX logic
function getStartSitVerdict(player: RankedPlayer & { weeklyProjection?: number }, pos: string, index: number): string {
  const reqs = rosterRequirements.value
  
  if (!isMyPlayer(player.player_id)) {
    // Not my player - check if FA and worth a pickup
    if (isFreeAgent(player.player_id)) {
      // Compare to my worst starter
      const myPlayersAtPos = getWeeklyPositionPlayers(pos).filter(p => isMyPlayer(p.player_id))
      const startCount = pos === 'FLEX' 
        ? (reqs.RB || 2) + (reqs.WR || 2) + (reqs.TE || 1) + (reqs.FLEX || 1)
        : getStartCount(pos)
      
      if (myPlayersAtPos.length >= startCount) {
        const worstStarter = myPlayersAtPos[startCount - 1]
        if (worstStarter && (player.weeklyProjection || 0) > (worstStarter.weeklyProjection || 0)) {
          return 'PICKUP?'
        }
      }
    }
    return '—'
  }
  
  if (player.injury_status === 'Out' || player.injury_status === 'IR') {
    return 'OUT'
  }
  
  // For FLEX view, determine starter status differently
  if (pos === 'FLEX') {
    // Get all my RB/WR/TE players sorted by projection
    const myFlexPlayers = getWeeklyPositionPlayers('FLEX').filter(p => 
      isMyPlayer(p.player_id) && p.injury_status !== 'Out' && p.injury_status !== 'IR'
    )
    const myPlayerIndex = myFlexPlayers.findIndex(p => p.player_id === player.player_id)
    const totalFlexStarters = (reqs.RB || 2) + (reqs.WR || 2) + (reqs.TE || 1) + (reqs.FLEX || 1)
    
    if (myPlayerIndex < totalFlexStarters) {
      return 'START'
    }
    return 'SIT'
  }
  
  // For individual position views
  const myPlayersAtPos = getWeeklyPositionPlayers(pos).filter(p => 
    isMyPlayer(p.player_id) && p.injury_status !== 'Out' && p.injury_status !== 'IR'
  )
  const myPlayerIndex = myPlayersAtPos.findIndex(p => p.player_id === player.player_id)
  const startCount = getStartCount(pos)
  
  if (myPlayerIndex < startCount) {
    return 'START'
  }
  
  // Check if this player could be a FLEX option
  if (pos !== 'QB' && reqs.FLEX > 0) {
    // Get best non-starting RB/WR/TE for flex consideration
    const allMyFlex = getWeeklyPositionPlayers('FLEX').filter(p => 
      isMyPlayer(p.player_id) && p.injury_status !== 'Out' && p.injury_status !== 'IR'
    )
    const usedStarters = (reqs.RB || 2) + (reqs.WR || 2) + (reqs.TE || 1)
    const flexCandidates = allMyFlex.slice(usedStarters, usedStarters + (reqs.FLEX || 1))
    
    if (flexCandidates.some(p => p.player_id === player.player_id)) {
      return 'FLEX'
    }
  }
  
  return 'SIT'
}

// Get start/sit class
function getStartSitClass(player: RankedPlayer, pos: string, index: number): string {
  const verdict = getStartSitVerdict(player, pos, index)
  
  switch (verdict) {
    case 'START': return 'bg-green-500/20 text-green-400'
    case 'FLEX': return 'bg-purple-500/20 text-purple-400'
    case 'SIT': return 'bg-red-500/20 text-red-400'
    case 'OUT': return 'bg-red-500/30 text-red-300'
    case 'PICKUP?': return 'bg-cyan-500/20 text-cyan-400'
    default: return 'bg-dark-border/20 text-dark-textMuted'
  }
}

// Unmatched players modal state
const showUnmatchedModal = ref(false)
const unmatchedPlayers = ref<Array<{
  name: string
  rank: number
  tier: number
  suggestions: Array<{ player_id: string, full_name: string, position: string, team: string }>
}>>([])
const pendingWeeklyRankings = ref<Map<string, { rank: number, tier: number }>>(new Map())
const isWeeklyUpload = ref(false)

// Handle weekly CSV upload with Position Rank, Player Name, Tier columns
async function handleWeeklyCSVUpload(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  
  const file = input.files[0]
  const text = await file.text()
  const lines = text.trim().split('\n')
  
  // Parse header to find column indices
  const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''))
  const rankIdx = header.findIndex(h => h.includes('rank') || h === '#' || h === 'position rank')
  const nameIdx = header.findIndex(h => h.includes('player') || h.includes('name'))
  const tierIdx = header.findIndex(h => h === 'tier')
  
  if (nameIdx === -1) {
    alert('CSV must have a Player Name column')
    input.value = ''
    return
  }
  
  // Parse data rows
  const newRankings = new Map<string, { rank: number, tier: number }>()
  const unmatched: Array<{ name: string, rank: number, tier: number, suggestions: Array<{ player_id: string, full_name: string, position: string, team: string }> }> = []
  
  lines.slice(1).forEach((line, idx) => {
    const cols = line.split(',').map(c => c.trim().replace(/"/g, ''))
    if (cols.length > nameIdx) {
      const rank = rankIdx >= 0 ? (parseInt(cols[rankIdx]) || (idx + 1)) : (idx + 1)
      const playerName = cols[nameIdx]
      const tier = tierIdx >= 0 ? (parseInt(cols[tierIdx]) || 1) : 1
      
      // Try to match player
      const playerId = findPlayerIdByName(playerName)
      
      if (playerId) {
        newRankings.set(playerId, { rank, tier })
      } else {
        // Find similar player names for suggestions
        const suggestions = findSimilarPlayers(playerName)
        unmatched.push({ name: playerName, rank, tier, suggestions })
      }
    }
  })
  
  // Store pending rankings
  pendingWeeklyRankings.value = newRankings
  isWeeklyUpload.value = true
  
  if (unmatched.length > 0) {
    // Show modal for unmatched players
    unmatchedPlayers.value = unmatched.sort((a, b) => a.rank - b.rank)
    showUnmatchedModal.value = true
  } else {
    // Apply rankings directly
    applyWeeklyRankings(newRankings)
  }
  
  input.value = ''
}

// Find similar player names for suggestions
function findSimilarPlayers(searchName: string): Array<{ player_id: string, full_name: string, position: string, team: string }> {
  const normalizedSearch = searchName.toLowerCase().replace(/[^a-z\s]/g, '').trim()
  const searchParts = normalizedSearch.split(' ')
  const suggestions: Array<{ player_id: string, full_name: string, position: string, team: string, score: number }> = []
  
  // Check all ranked players
  rankedPlayers.value.forEach(p => {
    const normalizedPlayer = p.full_name.toLowerCase().replace(/[^a-z\s]/g, '').trim()
    const playerParts = normalizedPlayer.split(' ')
    
    let score = 0
    
    // Check for last name match
    const searchLast = searchParts[searchParts.length - 1]
    const playerLast = playerParts[playerParts.length - 1]
    if (searchLast === playerLast) score += 50
    else if (playerLast.includes(searchLast) || searchLast.includes(playerLast)) score += 30
    
    // Check for first name/initial match
    if (searchParts[0] && playerParts[0]) {
      if (searchParts[0] === playerParts[0]) score += 30
      else if (searchParts[0][0] === playerParts[0][0]) score += 15
    }
    
    // Check for partial matches
    if (normalizedPlayer.includes(normalizedSearch) || normalizedSearch.includes(normalizedPlayer)) {
      score += 20
    }
    
    if (score > 0) {
      suggestions.push({
        player_id: p.player_id,
        full_name: p.full_name,
        position: p.position,
        team: p.team || 'FA',
        score
      })
    }
  })
  
  // Sort by score and return top 8
  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ player_id, full_name, position, team }) => ({ player_id, full_name, position, team }))
}

// Match an unmatched player to a suggestion
function matchUnmatchedPlayer(idx: number, suggestion: { player_id: string, full_name: string }) {
  const unmatched = unmatchedPlayers.value[idx]
  if (isWeeklyUpload.value) {
    pendingWeeklyRankings.value.set(suggestion.player_id, { rank: unmatched.rank, tier: unmatched.tier })
  } else {
    pendingRosRankings.value.set(suggestion.player_id, { rank: unmatched.rank, tier: unmatched.tier })
  }
  unmatchedPlayers.value.splice(idx, 1)
  
  // If no more unmatched, close modal and apply
  if (unmatchedPlayers.value.length === 0) {
    closeUnmatchedModal()
  }
}

// Skip an unmatched player
function skipUnmatchedPlayer(idx: number) {
  unmatchedPlayers.value.splice(idx, 1)
  if (unmatchedPlayers.value.length === 0) {
    closeUnmatchedModal()
  }
}

// Skip all unmatched players
function skipAllUnmatched() {
  unmatchedPlayers.value = []
  closeUnmatchedModal()
}

// Close modal and apply rankings
function closeUnmatchedModal() {
  showUnmatchedModal.value = false
  
  if (isWeeklyUpload.value) {
    applyWeeklyRankings(pendingWeeklyRankings.value)
  } else {
    applyRosRankingsFromModal(pendingRosRankings.value)
  }
}

// Apply weekly rankings
function applyWeeklyRankings(rankings: Map<string, { rank: number, tier: number }>) {
  weeklyCustomRankings.value = rankings
  weeklyHasCustomRankings.value = rankings.size > 0
  weeklyCustomRankingsCount.value = rankings.size
  showWeeklyProjectionSettings.value = false // Close modal after upload
}

// Handle weekly analyst sample file upload
function handleWeeklyAnalystSampleUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) {
    weeklyAnalystSampleFileName.value = file.name
  }
}

// Submit weekly analyst format request to Supabase
async function submitWeeklyAnalystRequest() {
  if (!weeklyAnalystRequestName.value.trim()) return
  
  const authStore = useAuthStore()
  
  try {
    const { error } = await supabase
      .from('analyst_requests')
      .insert({
        analyst_name: weeklyAnalystRequestName.value.trim(),
        user_email: authStore.user?.email || null,
        sample_file_name: weeklyAnalystSampleFileName.value
      })
    
    if (error) throw error
    
    weeklyAnalystRequestSubmitted.value = true
    
    // Reset after 10 seconds so they can submit another
    setTimeout(() => {
      weeklyAnalystRequestSubmitted.value = false
      weeklyAnalystRequestName.value = ''
      weeklyAnalystSampleFileName.value = null
    }, 10000)
  } catch (err) {
    console.error('Failed to submit analyst request:', err)
    alert('Failed to submit request. Please try again.')
  }
}

// Pending ROS rankings for modal
const pendingRosRankings = ref<Map<string, { rank: number, tier: number }>>(new Map())

// Apply ROS rankings from modal
function applyRosRankingsFromModal(rankings: Map<string, { rank: number, tier: number }>) {
  // Convert to the format expected by the existing system
  const customRanks = new Map<string, { rank: number, tier: number }>()
  rankings.forEach((data, playerId) => {
    customRanks.set(playerId, data)
  })
  
  // Apply via existing function
  applyCustomRankings(customRanks, selectedWeek.value)
  hasCustomRankings.value = true
  customRankingsWeek.value = selectedWeek.value
  customRankingsCount.value = rankings.size
}

// Clear weekly custom rankings
function clearWeeklyCustomRankings() {
  weeklyCustomRankings.value = new Map()
  weeklyHasCustomRankings.value = false
  weeklyCustomRankingsCount.value = 0
}

// Get players for a position with weekly projection and tier info
function getWeeklyPositionPlayers(pos: string): (RankedPlayer & { weeklyProjection?: number, weeklyTier?: number, weeklyRank?: number, gameTotal?: number })[] {
  let players: RankedPlayer[]
  
  if (pos === 'FLEX') {
    players = rankedPlayers.value.filter(p => ['RB', 'WR', 'TE'].includes(p.position))
  } else {
    players = rankedPlayers.value.filter(p => p.position === pos)
  }
  
  // Add weekly projection and tier info
  const withProjections = players.map(p => {
    const customData = weeklyCustomRankings.value.get(p.player_id)
    
    // Priority: Custom CSV > Sleeper weekly projection > PPG
    let projection = p.ppg
    if (weeklyHasCustomRankings.value && customData) {
      // Custom rankings don't include projection, use PPG
      projection = p.ppg
    } else if (sleeperWeeklyProjections.value.has(p.player_id)) {
      projection = sleeperWeeklyProjections.value.get(p.player_id) || p.ppg
    }
    
    // Calculate tier based on projection (or use custom tier)
    const tier = customData?.tier || calculateWeeklyTier(projection, p.position)
    
    return {
      ...p,
      weeklyProjection: projection,
      weeklyTier: tier,
      weeklyRank: customData?.rank,
      gameTotal: getGameTotal(p.team)
    }
  })
  
  // Sort by custom rank if available, otherwise by projection
  withProjections.sort((a, b) => {
    if (weeklyHasCustomRankings.value) {
      // Players with custom ranks first, sorted by rank
      if (a.weeklyRank && b.weeklyRank) return a.weeklyRank - b.weeklyRank
      if (a.weeklyRank) return -1
      if (b.weeklyRank) return 1
    }
    return (b.weeklyProjection || 0) - (a.weeklyProjection || 0)
  })
  
  return withProjections
}

// Team rankings for the week
const weeklyTeamRankings = computed(() => {
  const teams: Array<{
    odwnerId: string
    teamName: string
    avatarUrl: string
    projectedTotal: number
  }> = []
  
  leagueStore.rosters.forEach(roster => {
    const user = leagueStore.users.find(u => u.user_id === roster.owner_id)
    const teamName = sleeperService.getTeamName(roster, user)
    const avatarUrl = sleeperService.getAvatarUrl(roster, user, leagueStore.currentLeague!)
    
    // Calculate optimal lineup projection for this team
    const positions = leagueStore.currentLeague?.roster_positions || []
    const usedPlayers = new Set<string>()
    let total = 0
    
    // Get all this team's players with Sleeper projections
    const teamPlayers = rankedPlayers.value
      .filter(p => roster.players?.includes(p.player_id))
      .map(p => ({
        ...p,
        // Use Sleeper weekly projection if available, otherwise PPG
        weeklyProjection: sleeperWeeklyProjections.value.get(p.player_id) || p.ppg
      }))
    
    // Helper to get best available
    const getBest = (allowedPositions: string[]): number => {
      const eligible = teamPlayers.filter(p => 
        allowedPositions.includes(p.position) &&
        !usedPlayers.has(p.player_id) &&
        p.injury_status !== 'Out' &&
        p.injury_status !== 'IR'
      ).sort((a, b) => (b.weeklyProjection || 0) - (a.weeklyProjection || 0))
      
      if (eligible.length > 0) {
        usedPlayers.add(eligible[0].player_id)
        return eligible[0].weeklyProjection || 0
      }
      return 0
    }
    
    // Fill lineup spots
    for (const pos of positions) {
      if (pos === 'BN' || pos === 'IR' || pos === 'TAXI') continue
      
      if (pos === 'QB') total += getBest(['QB'])
      else if (pos === 'RB') total += getBest(['RB'])
      else if (pos === 'WR') total += getBest(['WR'])
      else if (pos === 'TE') total += getBest(['TE'])
      else if (pos === 'FLEX' || pos === 'RB/WR/TE') total += getBest(['RB', 'WR', 'TE'])
      else if (pos === 'SUPER_FLEX' || pos === 'SUPERFLEX' || pos === 'OP') total += getBest(['QB', 'RB', 'WR', 'TE'])
      else if (pos === 'REC_FLEX' || pos === 'WR/TE') total += getBest(['WR', 'TE'])
    }
    
    teams.push({
      odwnerId: roster.owner_id,
      teamName,
      avatarUrl,
      projectedTotal: total
    })
  })
  
  // Sort by projected total
  teams.sort((a, b) => b.projectedTotal - a.projectedTotal)
  
  return teams
})

// Suggested starting lineup - uses exact roster_positions from league
const suggestedLineup = computed(() => {
  const positions = leagueStore.currentLeague?.roster_positions || []
  const lineup: Array<{ slot: string, player: (RankedPlayer & { weeklyProjection?: number }) | null }> = []
  
  // Track used players
  const usedPlayers = new Set<string>()
  
  // Helper to get best available player for given positions
  const getBestAvailable = (allowedPositions: string[]): (RankedPlayer & { weeklyProjection?: number }) | null => {
    // Get all eligible players across allowed positions
    const allEligible: (RankedPlayer & { weeklyProjection?: number })[] = []
    
    for (const pos of allowedPositions) {
      const players = getWeeklyPositionPlayers(pos).filter(p => 
        isMyPlayer(p.player_id) && 
        !usedPlayers.has(p.player_id) &&
        p.injury_status !== 'Out' &&
        p.injury_status !== 'IR'
      )
      allEligible.push(...players)
    }
    
    // Sort by projection and return best
    allEligible.sort((a, b) => (b.weeklyProjection || 0) - (a.weeklyProjection || 0))
    
    if (allEligible.length > 0) {
      usedPlayers.add(allEligible[0].player_id)
      return allEligible[0]
    }
    return null
  }
  
  // Iterate through roster positions in order (skip BN, IR, etc)
  for (const pos of positions) {
    // Skip bench and IR spots
    if (pos === 'BN' || pos === 'IR' || pos === 'TAXI') continue
    
    let player: (RankedPlayer & { weeklyProjection?: number }) | null = null
    let slotName = pos
    
    if (pos === 'QB') {
      player = getBestAvailable(['QB'])
    } else if (pos === 'RB') {
      player = getBestAvailable(['RB'])
    } else if (pos === 'WR') {
      player = getBestAvailable(['WR'])
    } else if (pos === 'TE') {
      player = getBestAvailable(['TE'])
    } else if (pos === 'FLEX' || pos === 'RB/WR/TE') {
      player = getBestAvailable(['RB', 'WR', 'TE'])
      slotName = 'FLEX'
    } else if (pos === 'SUPER_FLEX' || pos === 'SUPERFLEX' || pos === 'OP') {
      player = getBestAvailable(['QB', 'RB', 'WR', 'TE'])
      slotName = 'SF'
    } else if (pos === 'REC_FLEX' || pos === 'WR/TE') {
      player = getBestAvailable(['WR', 'TE'])
      slotName = 'W/T'
    } else if (pos === 'K') {
      // Skip kickers for now
      continue
    } else if (pos === 'DEF' || pos === 'D/ST') {
      // Skip defense for now
      continue
    }
    
    lineup.push({ slot: slotName, player })
  }
  
  return lineup
})

// Suggested lineup total
const suggestedLineupTotal = computed(() => {
  return suggestedLineup.value.reduce((sum, slot) => {
    if (slot.player) {
      return sum + (slot.player.weeklyProjection || slot.player.ppg || 0)
    }
    return sum
  }, 0)
})

onMounted(() => {
  selectedWeek.value = currentWeek.value
  csvUploadWeek.value = currentWeek.value
  checkMobileView()
  window.addEventListener('resize', checkMobileView)
  if (leagueStore.activeLeagueId) loadProjections()
  // Set initial selected team for mobile
  if (leagueStore.currentUserId) {
    selectedTeamId.value = leagueStore.currentUserId
  }
  
  // Auto-detect superflex from league settings
  const rosterPositions = leagueStore.currentLeague?.roster_positions || []
  isSuperFlex.value = rosterPositions.some(pos => 
    pos === 'SUPER_FLEX' || pos === 'SUPERFLEX' || pos === 'OP'
  )
})

// Watch for tab changes to load weekly projections when switching to This Week tab
watch(() => activeTab.value, (newTab) => {
  if (!isDynastyMode.value && newTab === 'week' && !weeklyProjectionsLoaded.value && !weeklyProjectionsLoading.value) {
    loadWeeklyProjections()
  }
})

// Watch for mode changes
watch(() => isDynastyMode.value, (isDynasty) => {
  if (isDynasty && dynastyPlayerValues.value.size === 0) {
    loadDynastyValues()
  }
})

// Watch for superflex toggle to recalculate dynasty values
watch(isSuperFlex, () => {
  if (isDynastyMode.value) {
    calculateDynastyTeamValues()
  }
})

watch(() => leagueStore.activeLeagueId, () => {
  if (leagueStore.activeLeagueId) {
    selectedWeek.value = currentWeek.value
    csvUploadWeek.value = currentWeek.value
    loadProjections()
    // Reset weekly projections when league changes
    weeklyProjectionsLoaded.value = false
    // Reset dynasty data when league changes
    dynastyPlayerValues.value = new Map()
    dynastyTeamValues.value = []
    if (isDynastyMode.value) {
      loadDynastyValues()
    }
  }
})

watch(currentWeek, (newWeek) => {
  if (selectedWeek.value > newWeek) selectedWeek.value = newWeek
  csvUploadWeek.value = newWeek
})

// ==================== DYNASTY FUNCTIONS ====================

// Load dynasty values
async function loadDynastyValues() {
  isLoading.value = true
  loadingMessage.value = 'Loading dynasty values...'
  
  try {
    let values = await fetchDynastyPlayerValues()
    
    if (values.size === 0) {
      console.log('⚠️ DynastyProcess data unavailable, using fallback values...')
      const rosteredIds = new Set<string>()
      leagueStore.rosters.forEach(roster => {
        roster.players?.forEach(id => rosteredIds.add(id))
      })
      values = await generateFallbackDynastyValues(leagueStore.players, rosteredIds)
    }
    
    dynastyPlayerValues.value = values
    
    try {
      dynastyPickValues.value = await fetchDynastyPickValues()
    } catch (e) {
      console.warn('Pick values unavailable:', e)
      dynastyPickValues.value = []
    }
    
    calculateDynastyTeamValues()
    dynastyLastRefresh.value = new Date().toLocaleTimeString()
  } catch (error) {
    console.error('Failed to load dynasty values:', error)
  } finally {
    isLoading.value = false
  }
}

// Calculate dynasty team values
function calculateDynastyTeamValues() {
  dynastyTeamValues.value = leagueStore.rosters.map(roster => {
    const user = leagueStore.users.find(u => u.user_id === roster.owner_id)
    const teamName = sleeperService.getTeamName(roster, user)
    const avatar = sleeperService.getAvatarUrl(roster, user, leagueStore.currentLeague)
    
    return calculateTeamDynastyValue(
      roster.roster_id,
      teamName,
      avatar,
      roster.players || [],
      dynastyPlayerValues.value,
      isSuperFlex.value
    )
  })
}

// Refresh dynasty values
async function refreshDynastyValues() {
  clearDynastyValuesCache()
  await loadDynastyValues()
}

// Dynasty helper functions
function formatDynastyVal(value: number): string {
  return formatDynastyValue(value)
}

function getDynastyPlayerOwner(playerId: string): string | null {
  return dynastyPlayerOwnerMap.value.get(playerId) || null
}

function isDynastyMyPlayer(playerId: string): boolean {
  const myRoster = leagueStore.rosters.find(r => r.owner_id === leagueStore.currentUserId)
  return myRoster?.players?.includes(playerId) || false
}

function getDynastyValueColorClass(value: number, avg: number): string {
  if (value >= avg * 1.2) return 'text-green-400'
  if (value >= avg) return 'text-cyan-400'
  if (value >= avg * 0.8) return 'text-yellow-400'
  return 'text-red-400'
}

function getDynastyStatusClass(score: number): string {
  if (score >= 65) return 'bg-green-500/20 text-green-400'
  if (score >= 45) return 'bg-cyan-500/20 text-cyan-400'
  if (score >= 30) return 'bg-yellow-500/20 text-yellow-400'
  return 'bg-purple-500/20 text-purple-400'
}

function getDynastyStatusLabel(score: number): string {
  if (score >= 65) return 'Contender'
  if (score >= 45) return 'Competitive'
  if (score >= 30) return 'Pretender'
  return 'Rebuilding'
}

function getDynastyPositionValueClass(value: number, position: string): string {
  const thresholds: Record<string, number[]> = {
    QB: [8000, 5000, 2000],
    RB: [15000, 8000, 4000],
    WR: [20000, 12000, 6000],
    TE: [6000, 3000, 1500]
  }
  const [high, mid, low] = thresholds[position] || [10000, 5000, 2000]
  
  if (value >= high) return 'text-green-400 font-bold'
  if (value >= mid) return 'text-cyan-400'
  if (value >= low) return 'text-dark-text'
  return 'text-dark-textMuted'
}

function getDynastyPickBarWidth(value: number): string {
  const maxValue = 9000
  const percentage = Math.min(100, (value / maxValue) * 100)
  return `${percentage}%`
}
</script>
