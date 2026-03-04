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
        <h1 class="text-3xl font-bold text-dark-text mb-2">Player Projections</h1>
        <p class="text-base text-dark-textMuted">Rest of season rankings with position-adjusted value analysis</p>
      </div>
      <div class="flex items-center gap-3">
        <button @click="loadProjections" :disabled="isLoading" class="px-4 py-2 rounded-lg bg-dark-card hover:bg-dark-border/50 text-dark-textMuted transition-all flex items-center gap-2">
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
    <div class="flex gap-2">
      <button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id"
        :class="activeTab === tab.id ? 'bg-yellow-400 text-gray-900' : 'bg-dark-card text-dark-textSecondary hover:bg-dark-border/50'"
        class="px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2">
        <span class="text-xl">{{ tab.icon }}</span> {{ tab.name }}
      </button>
    </div>

    <!-- Loading State with Progress -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center py-20">
      <LoadingSpinner size="xl" />
      <div class="text-lg font-semibold text-dark-text mt-4">{{ loadingMessage }}</div>
      <div v-if="loadingProgress.currentStep" class="text-sm text-dark-textMuted mt-2">
        {{ loadingProgress.currentStep }}
      </div>
      <div v-if="loadingProgress.totalSteps > 0" class="mt-4 w-64">
        <div class="flex justify-between text-xs text-dark-textMuted mb-1">
          <span>{{ loadingProgress.currentStepName }}</span>
          <span>{{ loadingProgress.completedSteps }}/{{ loadingProgress.totalSteps }}</span>
        </div>
        <div class="h-1.5 bg-dark-border rounded-full overflow-hidden">
          <div 
            class="h-full bg-yellow-400 rounded-full transition-all duration-300"
            :style="{ width: `${(loadingProgress.completedSteps / loadingProgress.totalSteps) * 100}%` }"
          ></div>
        </div>
      </div>
    </div>

    <!-- REST OF SEASON TAB -->
    <template v-else-if="activeTab === 'ros'">
      <div class="card" :class="platformBadgeClass">
        <div class="card-body py-3">
          <div class="flex items-center gap-3">
            <img :src="platformLogo" :alt="platformName" class="w-5 h-5" />
            <span class="font-semibold" :class="platformTextClass">Live {{ platformName }} Data</span>
            <span class="text-dark-textMuted">{{ allPlayers.length }} players • Points League</span>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="card">
        <div class="card-body py-4">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-dark-textMuted font-medium">Positions:</span>
              <button @click="selectAllPositions" :class="selectedPositions.length === positionFilters.length ? 'bg-yellow-400 text-gray-900' : 'bg-dark-border/50 text-dark-textSecondary'" class="px-3 py-1.5 rounded-lg text-sm font-medium">All</button>
              <button v-for="pos in positionFilters" :key="pos.id" @click="togglePositionFilter(pos.id)"
                :class="selectedPositions.includes(pos.id) ? 'bg-yellow-400 text-gray-900' : 'bg-dark-border/50 text-dark-textSecondary'"
                class="px-3 py-1.5 rounded-lg text-sm font-medium">{{ pos.label }}</button>
            </div>
            <div class="flex items-center gap-4">
              <label class="flex items-center gap-2 text-sm text-dark-textMuted cursor-pointer">
                <input type="checkbox" v-model="showOnlyMyPlayers" class="rounded accent-yellow-400 w-4 h-4" /> My Players
              </label>
              <label class="flex items-center gap-2 text-sm text-dark-textMuted cursor-pointer">
                <input type="checkbox" v-model="showOnlyFreeAgents" class="rounded accent-cyan-400 w-4 h-4" /> Free Agents
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Ranking Customization Panel -->
      <div class="card">
        <div class="card-body">
          <!-- Header -->
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
              <span class="text-2xl">🎚️</span>
              <div>
                <h3 class="text-lg font-bold text-dark-text">Player Rankings</h3>
                <p class="text-xs text-dark-textMuted">{{ currentRankingFormula }}</p>
              </div>
            </div>
            <button 
              @click="showRankingCustomization = !showRankingCustomization"
              class="text-yellow-400 hover:text-yellow-300 font-semibold transition-colors flex items-center gap-1"
            >
              <span>Customize formula</span>
              <svg :class="{ 'rotate-90': showRankingCustomization }" class="w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <!-- Presets (always visible) -->
          <div class="flex flex-wrap gap-2 mb-3">
            <button
              v-for="preset in rankingPresets"
              :key="preset.id"
              @click="applyRankingPreset(preset)"
              :class="[
                'px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2',
                activeRankingPreset === preset.id 
                  ? 'bg-yellow-400 text-gray-900' 
                  : 'bg-dark-border/50 text-dark-textSecondary hover:bg-dark-border'
              ]"
            >
              <span class="text-lg">{{ preset.icon }}</span>
              <span>{{ preset.name }}</span>
            </button>
          </div>

          <!-- Expanded Factor Controls -->
          <div v-if="showRankingCustomization" class="space-y-5 pt-4 border-t border-dark-border">
            <!-- Factor Category Tabs -->
            <div class="flex gap-2 overflow-x-auto pb-2">
              <button
                v-for="category in rankingFactorCategories"
                :key="category.id"
                @click="activeFactorCategory = category.id"
                :class="[
                  'px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-2',
                  activeFactorCategory === category.id
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'bg-dark-border/30 text-dark-textSecondary hover:bg-dark-border/50'
                ]"
              >
                <span>{{ category.icon }}</span>
                <span>{{ category.name }}</span>
              </button>
            </div>

            <!-- Factors for Active Category -->
            <div class="grid gap-3 md:grid-cols-2">
              <div
                v-for="factor in factorsForActiveCategory"
                :key="factor.id"
                class="bg-dark-bg/30 rounded-xl p-4 border border-dark-border/50"
              >
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-3">
                    <span class="text-xl">{{ factor.icon }}</span>
                    <div>
                      <span class="font-semibold text-dark-text">{{ factor.name }}</span>
                      <span v-if="!factor.available" class="ml-2 text-xs bg-dark-border px-2 py-0.5 rounded text-dark-textMuted">Coming Soon</span>
                    </div>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      v-model="factor.enabled" 
                      :disabled="!factor.available"
                      class="sr-only peer" 
                      @change="onRankingFactorChange"
                    >
                    <div class="w-11 h-6 bg-dark-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50"></div>
                  </label>
                </div>
                <p class="text-xs text-dark-textMuted mb-3">{{ factor.description }}</p>
                <div v-if="factor.enabled && factor.available" class="flex items-center gap-3">
                  <input
                    type="range"
                    v-model.number="factor.weight"
                    min="0"
                    max="100"
                    step="5"
                    @input="onRankingFactorChange"
                    class="flex-1 h-2 bg-dark-border rounded-lg appearance-none cursor-pointer accent-primary"
                  >
                  <div 
                    class="text-sm font-bold w-14 text-right px-2 py-1 rounded"
                    :style="{ backgroundColor: factor.color + '20', color: factor.color }"
                  >
                    {{ factor.weight }}%
                  </div>
                </div>
                <div v-else-if="!factor.available" class="text-xs text-dark-textMuted italic">
                  Advanced data required - available in future update
                </div>
              </div>
            </div>

            <!-- Total Weight Info -->
            <div v-if="totalRankingWeight !== 100" class="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 flex items-center gap-3">
              <span class="text-orange-400 text-xl">⚠️</span>
              <div>
                <div class="text-orange-400 font-medium">Weights don't add up to 100%</div>
                <div class="text-sm text-orange-400/80">Current total: {{ totalRankingWeight }}%. Rankings will be normalized.</div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center justify-between pt-4 border-t border-dark-border">
              <button 
                @click="resetRankingFactors" 
                class="text-sm text-dark-textMuted hover:text-dark-text transition-colors flex items-center gap-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reset to Default
              </button>
              <button 
                @click="applyRankingChanges" 
                class="px-4 py-2 rounded-lg bg-primary text-gray-900 font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                Apply Rankings
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Rankings Table -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">📊</span>
            <h2 class="card-title">Rest of Season Rankings</h2>
          </div>
        </div>
        <div class="card-body p-0">
          <div class="overflow-x-auto max-h-[70vh] overflow-y-auto">
            <table class="w-full">
              <thead class="bg-dark-border/30 sticky top-0 z-10">
                <tr>
                  <th class="px-3 py-3 text-left text-xs font-semibold uppercase w-12 cursor-pointer hover:text-yellow-400" @click="setRosSort('rosRank')">
                    Rank <span v-if="rosSortColumn === 'rosRank'" class="text-yellow-400">{{ rosSortDirection === 'asc' ? '↑' : '↓' }}</span>
                  </th>
                  <th class="px-3 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase">Player</th>
                  <th class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-12">Pos</th>
                  <th class="px-2 py-3 text-center text-xs font-semibold uppercase w-14 cursor-pointer hover:text-yellow-400" @click="setRosSort('positionRank')">
                    Pos Rk <span v-if="rosSortColumn === 'positionRank'" class="text-yellow-400">{{ rosSortDirection === 'asc' ? '↑' : '↓' }}</span>
                  </th>
                  <th class="px-2 py-3 text-center text-xs font-semibold uppercase w-16 cursor-pointer hover:text-yellow-400" @click="setRosSort('compositeScore')">
                    Score <span v-if="rosSortColumn === 'compositeScore'" class="text-yellow-400">{{ rosSortDirection === 'asc' ? '↑' : '↓' }}</span>
                  </th>
                  <th class="px-2 py-3 text-center text-xs font-semibold uppercase w-14 cursor-pointer hover:text-yellow-400" @click="setRosSort('total_points')">
                    Pts <span v-if="rosSortColumn === 'total_points'" class="text-yellow-400">{{ rosSortDirection === 'asc' ? '↑' : '↓' }}</span>
                  </th>
                  <th class="px-2 py-3 text-center text-xs font-semibold uppercase w-14 cursor-pointer hover:text-yellow-400" @click="setRosSort('ppg')">
                    PPG <span v-if="rosSortColumn === 'ppg'" class="text-yellow-400">{{ rosSortDirection === 'asc' ? '↑' : '↓' }}</span>
                  </th>
                  <th class="px-2 py-3 text-center text-xs font-semibold uppercase w-14 cursor-pointer hover:text-yellow-400" @click="setRosSort('vor')">
                    VOR <span v-if="rosSortColumn === 'vor'" class="text-yellow-400">{{ rosSortDirection === 'asc' ? '↑' : '↓' }}</span>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-dark-border/30">
                <template v-for="(player, idx) in gatedFilteredPlayers" :key="player.player_key">
                  <!-- Tier Divider Row (only when sorted by rank/score) -->
                  <tr v-if="shouldShowTierDivider(player, idx)" class="bg-dark-border/10">
                    <td colspan="8" class="px-4 py-2">
                      <div class="flex items-center gap-2">
                        <div class="h-px flex-1 bg-yellow-400/30"></div>
                        <span class="text-xs font-bold text-yellow-400 uppercase">Tier {{ player.tier }}</span>
                        <div class="h-px flex-1 bg-yellow-400/30"></div>
                      </div>
                    </td>
                  </tr>
                  <!-- Player Row -->
                  <tr :class="getRowClass(player)" class="hover:bg-dark-border/20 transition-colors">
                    <td class="px-3 py-3"><span class="font-bold text-lg text-dark-text">{{ player.rosRank }}</span></td>
                    <td class="px-3 py-3">
                      <div class="flex items-center gap-3">
                        <div class="relative">
                          <div class="w-10 h-10 rounded-full bg-dark-border overflow-hidden ring-2" :class="getAvatarRingClass(player)">
                            <img :src="player.headshot || defaultHeadshot" :alt="player.full_name" class="w-full h-full object-cover" @error="handleImageError" />
                          </div>
                          <div v-if="isMyPlayer(player)" class="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center"><span class="text-xs text-gray-900 font-bold">★</span></div>
                          <div v-else-if="isFreeAgent(player)" class="absolute -top-1 -right-1 w-5 h-5 bg-cyan-400 rounded-full flex items-center justify-center"><span class="text-xs text-gray-900 font-bold">+</span></div>
                        </div>
                        <div>
                          <span class="font-semibold" :class="getPlayerNameClass(player)">{{ player.full_name }}</span>
                          <div class="flex items-center gap-2 text-xs text-dark-textMuted">
                            <span>{{ player.mlb_team || 'FA' }}</span>
                            <span class="text-dark-border">•</span>
                            <template v-if="player.fantasy_team">
                              <img :src="platformLogo" :alt="platformName" class="w-3 h-3 opacity-60" />
                              <span :class="isMyPlayer(player) ? 'text-yellow-400' : ''">{{ player.fantasy_team }}</span>
                            </template>
                            <span v-else class="text-cyan-400">Free Agent</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td class="px-2 py-3 text-center"><span class="px-2 py-1 rounded text-xs font-bold" :class="getPositionClass(player.position)">{{ player.position?.split(',')[0] }}</span></td>
                    <td class="px-2 py-3 text-center text-dark-text font-medium">{{ player.positionRank }}</td>
                    <td class="px-2 py-3 text-center">
                      <div class="flex items-center justify-center gap-1">
                        <span class="font-bold text-primary">{{ player.compositeScore?.toFixed(1) || '0' }}</span>
                      </div>
                    </td>
                    <td class="px-2 py-3 text-center font-bold text-dark-text">{{ player.total_points?.toFixed(1) || '0' }}</td>
                    <td class="px-2 py-3 text-center font-bold text-dark-text">{{ player.ppg?.toFixed(2) || '0' }}</td>
                    <td class="px-2 py-3 text-center font-bold" :class="player.vor > 0 ? 'text-green-400' : player.vor < -3 ? 'text-red-400' : 'text-dark-textMuted'">{{ player.vor >= 0 ? '+' : '' }}{{ player.vor?.toFixed(1) || '0' }}</td>
                  </tr>
                </template>
                <tr v-if="gatedFilteredPlayers.length === 0"><td colspan="8" class="px-4 py-8 text-center text-dark-textMuted">No players match filters</td></tr>
              </tbody>
            </table>
            
            <!-- Gated players overlay -->
            <div v-if="hiddenPlayersCount > 0" class="relative">
              <div class="blur-sm select-none pointer-events-none opacity-50 border-t border-dark-border/30">
                <div v-for="i in Math.min(hiddenPlayersCount, 3)" :key="'player-preview-' + i" class="flex items-center gap-4 px-4 py-3 border-b border-dark-border/20">
                  <div class="w-6 h-4 bg-dark-border/50 rounded"></div>
                  <div class="w-10 h-10 rounded-full bg-dark-border/50"></div>
                  <div class="flex-1"><div class="h-4 w-32 bg-dark-border/50 rounded mb-1"></div><div class="h-3 w-20 bg-dark-border/40 rounded"></div></div>
                  <div class="h-6 w-12 bg-dark-border/40 rounded"></div>
                </div>
              </div>
              <div class="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-dark-bg via-dark-bg/95 to-transparent">
                <div class="text-center p-6">
                  <div class="text-4xl mb-3">🔒</div>
                  <h3 class="text-lg font-bold text-dark-text mb-2">{{ hiddenPlayersCount }} More Players</h3>
                  <p class="text-sm text-dark-textMuted mb-4">Unlock full player rankings</p>
                  <button @click="$router.push('/pricing')" class="px-6 py-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-gray-900 font-bold rounded-lg transition-all transform hover:scale-105">Go Ultimate - $4.99/mo</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- TEAMS TAB -->
    <template v-else-if="activeTab === 'teams'">
      <div class="card">
        <div class="card-body py-3">
          <div class="flex flex-wrap items-center justify-center gap-4 text-sm">
            <span class="text-dark-textMuted font-medium">Starting Lineup:</span>
            <span v-for="pos in displayRosterPositions" :key="pos.pos" class="px-2 py-1 rounded font-bold" :class="getPositionClass(pos.pos)">{{ pos.count }} {{ pos.pos }}</span>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2"><span class="text-2xl">📊</span><h2 class="card-title">Team Roster Rankings</h2></div>
          <div class="flex items-center gap-2 text-yellow-400 text-sm mt-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
            <span>Select team for details</span>
          </div>
        </div>
        <div class="card-body p-0">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-dark-border/30">
                <tr>
                  <th class="px-3 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase w-10 cursor-pointer hover:text-yellow-400" @click="setTeamsSort('rank')">
                    # <span v-if="teamsSortColumn === 'rank'" class="text-yellow-400">{{ teamsSortDirection === 'asc' ? '↑' : '↓' }}</span>
                  </th>
                  <th class="px-3 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase">Team</th>
                  <th class="px-3 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-16 cursor-pointer hover:text-yellow-400" @click="setTeamsSort('overallGrade')">
                    Grade <span v-if="teamsSortColumn === 'overallGrade'" class="text-yellow-400">{{ teamsSortDirection === 'asc' ? '↑' : '↓' }}</span>
                  </th>
                  <th class="px-3 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-24 cursor-pointer hover:text-yellow-400" @click="setTeamsSort('statusScore')">
                    Status <span v-if="teamsSortColumn === 'statusScore'" class="text-yellow-400">{{ teamsSortDirection === 'asc' ? '↑' : '↓' }}</span>
                  </th>
                  <th v-for="pos in uniquePositions" :key="pos" class="px-3 py-3 text-center text-xs font-semibold uppercase w-12" :class="getPositionTextClass(pos)">{{ pos }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-dark-border/30">
                <template v-for="(team, index) in gatedRankedTeams" :key="team.teamKey">
                  <tr :class="[team.isMyTeam ? 'bg-yellow-500/10' : 'hover:bg-dark-border/20', expandedTeamId === team.teamKey ? 'bg-dark-border/30' : '']" class="transition-colors cursor-pointer" @click="expandedTeamId = expandedTeamId === team.teamKey ? null : team.teamKey">
                    <td class="px-3 py-3"><span class="font-bold" :class="index < 3 ? 'text-yellow-400' : 'text-dark-textMuted'">{{ index + 1 }}</span></td>
                    <td class="px-3 py-3">
                      <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-full overflow-hidden bg-dark-border ring-2 flex-shrink-0" :class="team.isMyTeam ? 'ring-yellow-400' : 'ring-dark-border'">
                          <img :src="team.logoUrl || defaultTeamAvatar" :alt="team.teamName" class="w-full h-full object-cover" @error="handleImageError" />
                        </div>
                        <div class="min-w-0">
                          <div class="font-semibold text-dark-text flex items-center gap-2 truncate">{{ team.teamName }}<span v-if="team.isMyTeam" class="text-[10px] bg-yellow-400/20 text-yellow-400 px-1.5 py-0.5 rounded">You</span></div>
                          <div class="text-xs text-dark-textMuted truncate">{{ team.managerName }}</div>
                        </div>
                      </div>
                    </td>
                    <td class="px-3 py-3 text-center"><span class="text-xl font-black" :class="getTeamGradeClass(team.overallGrade)">{{ team.overallGrade }}</span></td>
                    <td class="px-3 py-3 text-center"><span class="px-2 py-1 rounded-full text-[10px] font-bold whitespace-nowrap" :class="getTeamStatusClass(team.statusScore)">{{ getTeamStatusLabel(team.statusScore) }}</span></td>
                    <td v-for="pos in uniquePositions" :key="pos" class="px-3 py-3 text-center"><span class="font-bold text-sm" :class="getPositionGradeClass(team.positionGrades[pos] || 'N/A')">{{ team.positionGrades[pos] || 'N/A' }}</span></td>
                  </tr>
                  <tr v-if="expandedTeamId === team.teamKey">
                    <td :colspan="5 + uniquePositions.length" class="p-0">
                      <div class="bg-dark-card/50 border-t border-b border-yellow-400/30">
                        <div class="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 divide-y lg:divide-y-0 lg:divide-x divide-dark-border/30">
                          <div v-for="pos in uniquePositions" :key="pos" class="p-4">
                            <div class="flex items-center justify-between mb-3">
                              <div class="flex items-center gap-2">
                                <span class="px-2 py-0.5 rounded text-xs font-bold" :class="getPositionClass(pos)">{{ pos }}</span>
                                <span class="text-lg font-bold" :class="getPositionGradeClass(team.positionGrades[pos] || 'N/A')">{{ team.positionGrades[pos] || 'N/A' }}</span>
                              </div>
                            </div>
                            <div class="space-y-1.5">
                              <div v-for="(player, pIdx) in getTeamPositionPlayers(team, pos)" :key="player.player_key" class="flex items-center gap-2 p-1.5 rounded-lg" :class="pIdx < getRosterSlotCount(pos) ? 'bg-dark-border/30' : 'opacity-60'">
                                <div class="w-7 h-7 rounded-full bg-dark-border overflow-hidden flex-shrink-0"><img :src="player.headshot || defaultHeadshot" :alt="player.full_name" class="w-full h-full object-cover" @error="handleImageError" /></div>
                                <div class="flex-1 min-w-0">
                                  <div class="flex items-center gap-1"><span class="font-medium text-dark-text text-xs truncate">{{ player.full_name }}</span><span v-if="pIdx < getRosterSlotCount(pos)" class="text-[8px] text-yellow-400">★</span></div>
                                  <div class="text-[10px] text-dark-textMuted">{{ player.ppg?.toFixed(1) || '0.0' }} PPG</div>
                                </div>
                              </div>
                              <div v-if="!getTeamPositionPlayers(team, pos)?.length" class="text-center py-3"><span class="text-xs text-dark-textMuted italic">No {{ pos }}s</span></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
            
            <!-- Gated teams overlay -->
            <div v-if="hiddenTeamsCount > 0" class="relative">
              <div class="blur-sm select-none pointer-events-none opacity-50 border-t border-dark-border/30">
                <div v-for="i in Math.min(hiddenTeamsCount, 3)" :key="'team-preview-' + i" class="flex items-center gap-4 px-4 py-3 border-b border-dark-border/20">
                  <div class="w-6 h-4 bg-dark-border/50 rounded"></div>
                  <div class="w-9 h-9 rounded-full bg-dark-border/50"></div>
                  <div class="flex-1 h-4 bg-dark-border/50 rounded"></div>
                  <div class="h-8 w-8 bg-dark-border/40 rounded"></div>
                </div>
              </div>
              <div class="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-dark-bg via-dark-bg/95 to-transparent">
                <div class="text-center p-6">
                  <div class="text-4xl mb-3">🔒</div>
                  <h3 class="text-lg font-bold text-dark-text mb-2">{{ hiddenTeamsCount }} More Teams</h3>
                  <p class="text-sm text-dark-textMuted mb-4">Unlock full team rankings</p>
                  <button @click="$router.push('/pricing')" class="px-6 py-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-gray-900 font-bold rounded-lg transition-all transform hover:scale-105">Go Ultimate - $4.99/mo</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- START/SIT TAB -->
    <template v-else-if="activeTab === 'startsit'">
      <div class="space-y-5">

        <!-- HEADER: Date + Scoring Mode + Matchup Context -->
        <div class="card bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-blue-500/10 border-purple-500/30">
          <div class="card-body py-4">
            <div class="flex items-center justify-between flex-wrap gap-4">
              <!-- Left: Date + mode -->
              <div class="flex items-center gap-5">
                <div>
                  <div class="text-xs text-dark-textMuted uppercase mb-1">📅 {{ formatSelectedDate }}</div>
                  <div class="flex items-center gap-2">
                    <div class="flex rounded-lg overflow-hidden border border-dark-border/50">
                      <button @click="scoringMode = 'daily'" :class="scoringMode === 'daily' ? 'bg-yellow-400 text-gray-900' : 'bg-dark-card text-dark-textMuted hover:bg-dark-border/50'" class="px-3 py-1.5 text-xs font-semibold transition-colors">Daily</button>
                      <button @click="scoringMode = 'weekly'" :class="scoringMode === 'weekly' ? 'bg-yellow-400 text-gray-900' : 'bg-dark-card text-dark-textMuted hover:bg-dark-border/50'" class="px-3 py-1.5 text-xs font-semibold transition-colors">Weekly</button>
                    </div>
                    <span v-if="scoringMode === 'daily'" class="text-xs text-yellow-400 font-mono">{{ formatSelectedDate }}</span>
                    <span v-else class="text-xs text-yellow-400 font-mono">Week {{ currentWeek }}</span>
                  </div>
                </div>
              </div>
              <!-- Right: Ranking preset pills -->
              <div class="flex items-center gap-2 flex-wrap">
                <button v-for="preset in startSitPresets" :key="preset.id" @click="applyStartSitPreset(preset)"
                  :class="activeStartSitPreset === preset.id ? 'bg-yellow-400 text-gray-900' : 'bg-dark-border/50 text-dark-textSecondary hover:bg-dark-border'"
                  class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1">
                  <span>{{ preset.icon }}</span><span>{{ preset.name }}</span>
                </button>
                <button @click="showStartSitCustomization = !showStartSitCustomization"
                  class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-dark-border/30 text-yellow-400 hover:bg-dark-border/50 transition-colors flex items-center gap-1">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                  Customize
                </button>
              </div>
            </div>

            <!-- Expanded Customization Panel -->
            <div v-if="showStartSitCustomization" class="mt-4 pt-4 border-t border-dark-border/30 space-y-4">
              <div class="flex gap-2 overflow-x-auto pb-1">
                <button v-for="category in startSitFactorCategories" :key="category.id" @click="activeStartSitCategory = category.id"
                  :class="activeStartSitCategory === category.id ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-dark-border/30 text-dark-textSecondary hover:bg-dark-border/50'"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1">
                  <span>{{ category.icon }}</span><span>{{ category.name }}</span>
                </button>
              </div>
              <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                <div v-for="factor in startSitFactorsForActiveCategory" :key="factor.id" class="bg-dark-bg/50 rounded-lg p-3" :class="{ 'opacity-50': !factor.available }">
                  <div class="flex items-center justify-between mb-1">
                    <div class="flex items-center gap-1.5">
                      <input type="checkbox" v-model="factor.enabled" :disabled="!factor.available" class="rounded accent-yellow-400" @change="recalculateStartSit" />
                      <span class="text-xs font-medium text-dark-text">{{ factor.name }}</span>
                    </div>
                    <span class="text-xs font-bold" :class="factor.enabled && factor.available ? 'text-yellow-400' : 'text-dark-textMuted'">{{ factor.weight }}%</span>
                  </div>
                  <input type="range" v-model.number="factor.weight" min="0" max="100" step="5" :disabled="!factor.enabled || !factor.available" class="w-full accent-yellow-400" @input="onStartSitFactorChange" />
                </div>
              </div>
              <div v-if="totalStartSitWeight !== 100" class="bg-orange-500/10 border border-orange-500/30 rounded-lg p-2">
                <span class="text-orange-400 text-xs">⚠️ Weights total {{ totalStartSitWeight }}% (will be normalized)</span>
              </div>
            </div>
          </div>
        </div>

        <!-- CONTROLS BAR -->
        <div class="card">
          <div class="card-body py-3">
            <div class="flex items-center justify-between flex-wrap gap-3">
              <div class="flex items-center gap-2">
                <span class="text-xs text-dark-textMuted uppercase">Date:</span>
                <div class="flex rounded-lg overflow-hidden border border-dark-border/50">
                  <button @click="setToday" :class="isToday ? 'bg-yellow-400 text-gray-900' : 'bg-dark-card text-dark-textMuted hover:bg-dark-border/50'" class="px-3 py-1.5 text-xs font-semibold transition-colors">Today</button>
                  <button @click="setTomorrow" :class="isTomorrow ? 'bg-yellow-400 text-gray-900' : 'bg-dark-card text-dark-textMuted hover:bg-dark-border/50'" class="px-3 py-1.5 text-xs font-semibold transition-colors">Tomorrow</button>
                </div>
                <span class="text-xs text-yellow-400 font-mono">{{ formatSelectedDate }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-dark-textMuted uppercase">Position:</span>
                <select v-model="selectedStartSitPosition" class="px-3 py-1.5 text-xs font-semibold bg-dark-card text-dark-text border border-dark-border/50 rounded-lg focus:outline-none focus:border-yellow-400">
                  <option value="">All Positions</option>
                  <option v-for="pos in startSitPositions" :key="pos.id" :value="pos.id">{{ pos.label }}</option>
                </select>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-dark-textMuted uppercase">Show:</span>
                <div class="flex rounded-lg overflow-hidden border border-dark-border/50">
                  <button @click="startSitPlayerFilter = 'mine'" :class="startSitPlayerFilter === 'mine' ? 'bg-yellow-500 text-gray-900' : 'bg-dark-card text-dark-textMuted hover:bg-dark-border/50'" class="px-3 py-1.5 text-xs font-semibold transition-colors">My Team + FA</button>
                  <button @click="startSitPlayerFilter = 'all'" :class="startSitPlayerFilter === 'all' ? 'bg-yellow-400 text-gray-900' : 'bg-dark-card text-dark-textMuted hover:bg-dark-border/50'" class="px-3 py-1.5 text-xs font-semibold transition-colors">All Players</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- TODAY'S LINEUP -->
        <div class="card">
          <div class="card-header">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-2xl">🏆</span>
                <div>
                  <h2 class="text-xl font-bold text-dark-text">{{ scoringMode === 'daily' ? (isToday ? "Today's" : "Tomorrow's") : "This Week's" }} Lineup</h2>
                  <p class="text-xs text-dark-textMuted">Optimized players with games</p>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <div class="flex items-center gap-1 text-xs text-yellow-400">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
                  <span>Click player for details</span>
                </div>
                <div class="text-xs text-dark-textMuted">
                  {{ modifiedSuggestedLineup.filter(s => s.player).length }} / {{ modifiedSuggestedLineup.length }} slots filled
                </div>
                <button v-if="waiverLineupPlayers.length > 0" @click="clearWaiverLineup" class="px-2 py-1 text-xs font-medium bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors">Clear</button>
                <button @click="downloadSuggestedLineup" class="px-2 py-1 text-xs font-medium bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30 transition-colors flex items-center gap-1">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Export
                </button>
              </div>
            </div>
          </div>
          <div class="card-body p-0">
            <div class="divide-y divide-dark-border/20">
              <template v-for="(slot, idx) in modifiedSuggestedLineup" :key="idx">
                <div class="flex items-center gap-3 px-4 py-3 hover:bg-dark-border/10 transition-colors"
                  :class="slot.isWaiver ? 'bg-cyan-500/5 border-l-2 border-cyan-400' : ''"
                >
                  <!-- Position badge -->
                  <div class="flex-shrink-0 w-12">
                    <span class="px-2 py-1 rounded text-xs font-bold uppercase inline-block" :class="getPositionClass(slot.position)">{{ slot.position }}</span>
                  </div>

                  <template v-if="slot.player">
                    <!-- Avatar -->
                    <div class="w-10 h-10 rounded-full bg-dark-border overflow-hidden flex-shrink-0" :class="slot.isWaiver ? 'ring-2 ring-cyan-400' : ''">
                      <img :src="slot.player.headshot || defaultHeadshot" class="w-full h-full object-cover" @error="handleImageError" />
                    </div>
                    <!-- Player Info -->
                    <div class="flex-1 min-w-0">
                      <div class="font-semibold text-dark-text text-sm" :class="slot.isWaiver ? 'text-cyan-400' : ''">
                        {{ slot.player.full_name }}
                        <span v-if="slot.isWaiver" class="ml-1.5 text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded font-bold">WAIVER</span>
                      </div>
                      <div class="flex items-center gap-2 text-xs">
                        <template v-if="slot.player.opponent">
                          <img
                            :src="`https://a.espncdn.com/combiner/i?img=/i/teamlogos/${currentSport === 'basketball' ? 'nba' : currentSport === 'hockey' ? 'nhl' : 'mlb'}/500/${slot.player.nhl_team || slot.player.nba_team || slot.player.mlb_team || ''}.png&h=20&w=20`"
                            class="w-4 h-4 object-contain"
                            @error="(e: any) => e.target.style.display = 'none'"
                          />
                          <span class="text-green-400">{{ slot.player.opponent }}</span>
                          <span v-if="slot.player.gameTime" class="text-gray-400 font-light">{{ formatGameTime(slot.player.gameTime) }}</span>
                        </template>
                        <span v-else-if="scoringMode === 'weekly'" class="text-dark-textMuted">{{ slot.player.gamesThisWeek || 0 }} games this week</span>
                        <span v-else class="text-red-400">No game</span>
                      </div>
                    </div>
                    <!-- Projected score -->
                    <div class="text-right flex-shrink-0 px-2">
                      <div class="text-base font-bold text-yellow-400">{{ slot.player.projection?.toFixed(0) || slot.player.compositeScore?.toFixed(0) || '—' }}</div>
                      <div class="text-[9px] text-dark-textMuted uppercase">Score</div>
                    </div>
                    <!-- Status dot -->
                    <div class="w-2 h-2 rounded-full flex-shrink-0" :class="slot.player.isLive ? 'bg-green-400 animate-pulse' : slot.player.hasGame ? 'bg-green-400' : 'bg-red-400/50'"></div>
                    <!-- Remove waiver -->
                    <button v-if="slot.isWaiver" @click="removeFromWaiverLineup(slot.player)" class="text-red-400 hover:text-red-300 transition-colors flex-shrink-0">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </template>

                  <template v-else>
                    <div class="w-10 h-10 rounded-full bg-dark-border/30 flex-shrink-0"></div>
                    <div class="flex-1">
                      <span class="text-dark-textMuted italic text-sm">Empty slot</span>
                    </div>
                    <button class="px-3 py-1 text-xs bg-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/30 transition-colors" @click="selectedStartSitPosition = slot.position">
                      Find Player
                    </button>
                  </template>
                </div>
              </template>
            </div>

            <!-- Projected Total Bar -->
            <div class="px-4 py-3 bg-dark-border/20 border-t border-dark-border/30 flex items-center justify-between">
              <span class="text-dark-textMuted text-sm">Projected Total</span>
              <div class="flex items-center gap-3">
                <span v-if="waiverLineupPlayers.length > 0" :class="modifiedSuggestedLineupTotal - suggestedLineupTotal >= 0 ? 'text-green-400' : 'text-red-400'" class="text-sm font-semibold">
                  {{ modifiedSuggestedLineupTotal - suggestedLineupTotal >= 0 ? '+' : '' }}{{ (modifiedSuggestedLineupTotal - suggestedLineupTotal).toFixed(1) }} vs original
                </span>
                <span class="text-xl font-bold text-yellow-400">{{ modifiedSuggestedLineupTotal.toFixed(1) }}</span>
              </div>
            </div>

            <!-- Bench -->
            <div v-if="benchPlayers.length > 0" class="border-t border-dark-border/30">
              <div class="px-4 py-2 bg-dark-border/10">
                <span class="text-xs font-semibold text-dark-textMuted uppercase">Bench ({{ benchPlayers.length }})</span>
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-0 divide-y divide-x divide-dark-border/20">
                <div v-for="player in benchPlayers" :key="player.player_key" class="flex items-center gap-2 px-3 py-2">
                  <div class="w-7 h-7 rounded-full bg-dark-border overflow-hidden flex-shrink-0">
                    <img :src="player.headshot || defaultHeadshot" class="w-full h-full object-cover" @error="handleImageError" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-xs font-medium text-dark-text truncate">{{ player.full_name }}</div>
                    <div class="text-[10px] text-dark-textMuted">
                      <span class="mr-1">{{ player.position?.split(',')[0] }}</span>
                      <span v-if="player.opponent" class="text-green-400">{{ player.opponent }}</span>
                      <span v-else class="text-red-400/60">No game</span>
                    </div>
                  </div>
                  <div class="text-xs font-bold text-dark-textMuted flex-shrink-0">{{ player.projection?.toFixed(0) || '—' }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- AVAILABLE PLAYERS TABLE -->
        <div class="card">
          <div class="card-header">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-2xl">📋</span>
                <div>
                  <h2 class="text-xl font-bold text-dark-text">Available Players</h2>
                  <p class="text-xs text-dark-textMuted">Free agents with games {{ isToday ? 'today' : 'tomorrow' }} · Today's projections</p>
                </div>
              </div>
              <div class="flex items-center gap-2 text-xs text-dark-textMuted">
                <svg class="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" /></svg>
                <span class="text-yellow-400">Click to add to lineup</span>
                <span>· {{ filteredBestAvailable.length }} players</span>
              </div>
            </div>
          </div>
          <div class="card-body p-0 overflow-x-auto">
            <div class="max-h-[600px] overflow-y-auto">
              <table class="w-full min-w-[700px]">
                <thead class="sticky top-0 z-30">
                  <tr class="bg-[#1e2028] text-xs font-bold text-dark-textMuted uppercase border-b border-dark-border/20">
                    <th class="text-left px-4 py-2.5 sticky left-0 bg-[#1e2028] z-40 min-w-[220px]">Player</th>
                    <th class="text-center px-2 py-2.5 min-w-[90px]">Matchup</th>
                    <th class="text-center px-2 py-2.5 min-w-[55px]">PPG</th>
                    <th class="text-center px-2 py-2.5 min-w-[60px] text-yellow-400">Score ↓</th>
                    <th class="text-center px-2 py-2.5 min-w-[50px]">Tier</th>
                    <th class="text-center px-2 py-2.5 min-w-[80px]">Verdict</th>
                    <th class="px-2 py-2.5 w-[80px]"></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-dark-border/10">
                  <tr
                    v-for="player in filteredBestAvailable"
                    :key="player.player_key"
                    class="hover:bg-dark-border/10 transition-colors cursor-pointer"
                    :class="{ 'bg-cyan-500/10 border-l-2 border-cyan-400': isInWaiverLineup(player) }"
                    @click="handleAddPlayer(player)"
                  >
                    <!-- Player -->
                    <td class="px-4 py-2.5 sticky left-0 bg-dark-card z-10">
                      <div class="flex items-center gap-2 min-w-0">
                        <div class="w-9 h-9 rounded-full bg-dark-border overflow-hidden flex-shrink-0 ring-2 ring-cyan-500/50">
                          <img :src="player.headshot || defaultHeadshot" class="w-full h-full object-cover" @error="handleImageError" />
                        </div>
                        <div class="min-w-0">
                          <div class="font-semibold text-dark-text text-sm truncate" :class="{ 'text-cyan-400': isInWaiverLineup(player) }">
                            {{ player.full_name }}
                          </div>
                          <div class="flex items-center gap-1.5 text-xs">
                            <span class="px-1.5 py-0.5 rounded text-[10px] font-bold" :class="getPositionClass(player.position)">{{ player.position?.split(',')[0] }}</span>
                            <template v-if="player.opponent">
                              <span class="text-dark-textMuted">·</span>
                              <img
                                :src="`https://a.espncdn.com/combiner/i?img=/i/teamlogos/${currentSport === 'basketball' ? 'nba' : currentSport === 'hockey' ? 'nhl' : 'mlb'}/500/${player.nhl_team || player.nba_team || player.mlb_team || ''}.png&h=20&w=20`"
                                class="w-3.5 h-3.5 object-contain"
                                @error="(e: any) => e.target.style.display = 'none'"
                              />
                              <span class="text-green-400">{{ player.opponent }}</span>
                              <span v-if="player.gameTime" class="text-dark-textMuted">{{ formatGameTime(player.gameTime) }}</span>
                            </template>
                            <template v-else>
                              <span class="text-dark-textMuted">·</span>
                              <span class="text-red-400">No game</span>
                            </template>
                          </div>
                        </div>
                      </div>
                    </td>
                    <!-- Matchup Difficulty -->
                    <td class="px-2 py-2.5 text-center">
                      <template v-if="player.opponent">
                        <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase" :class="getMatchupClass(player.matchupDifficulty)">
                          {{ getMatchupLabel(player.matchupDifficulty) }}
                        </span>
                      </template>
                      <span v-else class="text-xs text-dark-textMuted">—</span>
                    </td>
                    <!-- PPG -->
                    <td class="px-2 py-2.5 text-center">
                      <span class="text-sm font-semibold text-dark-text">{{ player.ppg?.toFixed(1) || '0.0' }}</span>
                    </td>
                    <!-- Score -->
                    <td class="px-2 py-2.5 text-center">
                      <span class="text-base font-black text-yellow-400">{{ player.compositeScore?.toFixed(0) || '—' }}</span>
                    </td>
                    <!-- Tier -->
                    <td class="px-2 py-2.5 text-center">
                      <span class="text-xs font-bold" :class="getTierColorClass(player.tier)">{{ player.tier || '—' }}</span>
                    </td>
                    <!-- Verdict -->
                    <td class="px-2 py-2.5 text-center">
                      <span class="px-2 py-1 rounded text-xs font-bold" :class="getVerdictClass(player.verdict)">{{ player.verdict || '—' }}</span>
                    </td>
                    <!-- Add/Remove -->
                    <td class="px-2 py-2.5 text-right">
                      <button v-if="!isInWaiverLineup(player)"
                        class="px-2.5 py-1.5 text-xs font-semibold bg-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/30 transition-colors"
                        @click.stop="handleAddPlayer(player)">
                        + Add
                      </button>
                      <button v-else
                        class="px-2.5 py-1.5 text-xs font-semibold bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
                        @click.stop="togglePlayerInLineup(player)">
                        Remove
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="filteredBestAvailable.length === 0" class="p-12 text-center">
              <div class="text-4xl mb-3">📭</div>
              <div class="text-lg font-bold text-dark-text mb-2">No Available Players</div>
              <div class="text-sm text-dark-textMuted">No free agents have games {{ isToday ? 'today' : 'tomorrow' }}</div>
            </div>
          </div>
        </div>

        <!-- My Roster Rankings (collapsed position table kept for reference/power users) -->
        <div class="card">
          <div class="card-header cursor-pointer" @click="showStartSitRankings = !showStartSitRankings">
            <div class="flex items-center gap-2">
              <span class="text-xl">📊</span>
              <h2 class="card-title">My Roster Rankings</h2>
              <span class="text-xs text-dark-textMuted ml-2">{{ getStartSitPlayers(selectedStartSitPosition || 'PG').filter(p => isMyPlayer(p)).length }} rostered · all positions</span>
            </div>
            <svg :class="{ 'rotate-180': showStartSitRankings }" class="w-5 h-5 text-dark-textMuted transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <div v-if="showStartSitRankings" class="card-body p-0">
            <!-- Position tabs -->
            <div class="flex items-center gap-2 px-4 pt-3 pb-2 flex-wrap border-b border-dark-border/20">
              <button v-for="pos in startSitPositions" :key="pos.id" @click="selectedStartSitPosition = pos.id"
                :class="selectedStartSitPosition === pos.id ? 'bg-yellow-400 text-gray-900' : 'bg-dark-border/30 text-dark-textSecondary hover:text-dark-text'"
                class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all">{{ pos.label }}</button>
            </div>
            <div class="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table class="w-full">
                <thead class="bg-dark-border/30 sticky top-0 z-10">
                  <tr>
                    <th class="px-3 py-2.5 text-left text-xs font-semibold text-dark-textMuted uppercase w-12">Rank</th>
                    <th class="px-3 py-2.5 text-left text-xs font-semibold text-dark-textMuted uppercase">Player</th>
                    <th class="px-2 py-2.5 text-center text-xs font-semibold text-dark-textMuted uppercase w-24">{{ scoringMode === 'daily' ? 'Matchup' : 'Games' }}</th>
                    <th class="px-2 py-2.5 text-center text-xs font-semibold text-dark-textMuted uppercase w-20">Difficulty</th>
                    <th class="px-2 py-2.5 text-center text-xs font-semibold text-dark-textMuted uppercase w-16">PPG</th>
                    <th class="px-2 py-2.5 text-center text-xs font-semibold text-dark-textMuted uppercase w-16"><span class="text-yellow-400">Score</span></th>
                    <th class="px-2 py-2.5 text-center text-xs font-semibold text-dark-textMuted uppercase w-14">Tier</th>
                    <th class="px-2 py-2.5 text-center text-xs font-semibold text-dark-textMuted uppercase w-24">Verdict</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-dark-border/30">
                  <template v-for="(player, index) in gatedGetStartSitPlayers(selectedStartSitPosition || startSitPositions[0]?.id)" :key="player.player_key">
                    <tr v-if="showTierBreak(player, index, selectedStartSitPosition || startSitPositions[0]?.id)" class="bg-dark-border/10">
                      <td colspan="8" class="px-4 py-1.5">
                        <div class="flex items-center gap-2">
                          <div class="h-px flex-1 bg-yellow-400/30"></div>
                          <span class="text-xs font-bold text-yellow-400 uppercase">Tier {{ player.tier }}</span>
                          <div class="h-px flex-1 bg-yellow-400/30"></div>
                        </div>
                      </td>
                    </tr>
                    <tr :class="[getStartSitRowClass(player)]" class="hover:bg-dark-border/20 transition-colors">
                      <td class="px-3 py-2"><span class="font-bold text-dark-text">{{ index + 1 }}</span></td>
                      <td class="px-3 py-2">
                        <div class="flex items-center gap-2">
                          <div class="relative">
                            <div class="w-9 h-9 rounded-full bg-dark-border overflow-hidden ring-2" :class="getStartSitAvatarRingClass(player)">
                              <img :src="player.headshot || defaultHeadshot" :alt="player.full_name" class="w-full h-full object-cover" @error="handleImageError" />
                            </div>
                            <div v-if="isMyPlayer(player)" class="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center"><span class="text-[9px] text-gray-900 font-bold">★</span></div>
                          </div>
                          <div>
                            <span class="font-semibold text-sm" :class="getStartSitPlayerNameClass(player)">{{ player.full_name }}</span>
                            <div class="flex items-center gap-2 text-xs text-dark-textMuted">
                              <span>{{ player.mlb_team || 'FA' }}</span>
                              <template v-if="player.fantasy_team">
                                <span class="text-dark-border">·</span>
                                <span :class="isMyPlayer(player) ? 'text-yellow-400' : ''">{{ player.fantasy_team }}</span>
                              </template>
                              <span v-else class="text-cyan-400">Free Agent</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td class="px-2 py-2 text-center">
                        <span v-if="scoringMode === 'daily'" class="text-xs font-medium" :class="player.opponent ? 'text-dark-text' : 'text-dark-textMuted italic'">
                          {{ player.opponent || 'No Game' }}
                        </span>
                        <span v-else class="text-xs text-dark-text">{{ player.gamesThisWeek || 0 }} games</span>
                      </td>
                      <td class="px-2 py-2 text-center">
                        <span v-if="player.opponent" class="px-2 py-0.5 rounded text-xs font-bold" :class="getMatchupClass(player.matchupDifficulty)">{{ getMatchupLabel(player.matchupDifficulty) }}</span>
                        <span v-else class="text-xs text-dark-textMuted">—</span>
                      </td>
                      <td class="px-2 py-2 text-center"><span class="text-sm text-dark-textMuted">{{ player.ppg?.toFixed(1) || '0.0' }}</span></td>
                      <td class="px-2 py-2 text-center"><span class="font-bold text-sm text-primary">{{ player.compositeScore?.toFixed(1) || '—' }}</span></td>
                      <td class="px-2 py-2 text-center"><span class="text-xs font-bold" :class="getTierColorClass(player.tier)">{{ player.tier || '—' }}</span></td>
                      <td class="px-2 py-2 text-center"><span class="px-2 py-1 rounded text-xs font-bold" :class="getVerdictClass(player.verdict)">{{ player.verdict }}</span></td>
                    </tr>
                  </template>
                  <tr v-if="gatedGetStartSitPlayers(selectedStartSitPosition || startSitPositions[0]?.id).length === 0">
                    <td colspan="8" class="px-4 py-8 text-center text-dark-textMuted">No players found at this position</td>
                  </tr>
                </tbody>
              </table>
              <!-- Gated overlay -->
              <div v-if="getHiddenStartSitCount(selectedStartSitPosition || startSitPositions[0]?.id) > 0" class="relative">
                <div class="blur-sm select-none pointer-events-none opacity-50 border-t border-dark-border/30">
                  <div v-for="i in Math.min(getHiddenStartSitCount(selectedStartSitPosition || startSitPositions[0]?.id), 3)" :key="'preview-' + i" class="flex items-center gap-4 px-4 py-3 border-b border-dark-border/20">
                    <div class="w-6 h-4 bg-dark-border/50 rounded"></div>
                    <div class="w-9 h-9 rounded-full bg-dark-border/50"></div>
                    <div class="flex-1"><div class="h-4 w-32 bg-dark-border/50 rounded mb-1"></div><div class="h-3 w-20 bg-dark-border/40 rounded"></div></div>
                    <div class="h-6 w-16 bg-dark-border/40 rounded"></div>
                  </div>
                </div>
                <div class="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-dark-bg via-dark-bg/95 to-transparent">
                  <div class="text-center p-6">
                    <div class="text-4xl mb-3">🔒</div>
                    <h3 class="text-lg font-bold text-dark-text mb-2">{{ getHiddenStartSitCount(selectedStartSitPosition || startSitPositions[0]?.id) }} More Players</h3>
                    <p class="text-sm text-dark-textMuted mb-4">Unlock full start/sit recommendations</p>
                    <button @click="$router.push('/pricing')" class="px-6 py-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-gray-900 font-bold rounded-lg transition-all transform hover:scale-105">Go Ultimate - $4.99/mo</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </template>

    <!-- TRADE ANALYZER TAB -->
    <template v-else-if="activeTab === 'trade'">
      <!-- Simulated Data Banner for non-Premium users -->
      <SimulatedDataBanner v-if="!hasPremiumAccess" :is-ultimate-tier="true" class="mb-6" />
      
      <div class="relative">
        <div :class="!hasPremiumAccess ? 'blur-sm select-none pointer-events-none' : ''">
          <!-- Trade Setup Card -->
          <div class="card">
            <div class="card-header">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="text-2xl">🔄</span>
                  <h2 class="card-title">Trade Analyzer</h2>
                </div>
                <button 
                  v-if="tradeAnalysis" 
                  @click="resetTrade" 
                  class="px-3 py-1.5 bg-dark-border/50 hover:bg-dark-border text-dark-textMuted rounded-lg text-sm"
                >
                  Clear Trade
                </button>
              </div>
              <p class="text-sm text-dark-textMuted mt-1">Evaluate trades based on season point production</p>
            </div>
          </div>

          <!-- Debug Info (temporary - remove after confirming it works) -->
          <div v-if="!myTeamKey && teamsData.length > 0" class="card bg-orange-500/10 border border-orange-500/30 mt-4">
            <div class="card-body py-3">
              <div class="flex items-center gap-2 text-orange-300">
                <span>⚠️</span>
                <span class="font-semibold">Could not detect your team</span>
              </div>
              <p class="text-xs text-orange-300/70 mt-1">myTeamKey: {{ myTeamKey || 'null' }} | Teams: {{ teamsData.length }} | Players: {{ allPlayers.length }}</p>
            </div>
          </div>

          <!-- Trade Setup -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <!-- YOU GIVE -->
            <div class="card border-2 border-yellow-500/30">
              <div class="card-header bg-yellow-500/10">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-xl">📤</span>
                    <h3 class="font-bold text-yellow-400">You Give</h3>
                    <span v-if="tradeGivePlayers.length > 0" class="ml-2 px-2 py-0.5 bg-yellow-400/20 rounded-full text-xs font-bold text-yellow-400">
                      {{ tradeGivePlayers.length }} player{{ tradeGivePlayers.length > 1 ? 's' : '' }}
                    </span>
                  </div>
                  <span v-if="tradeGivePlayers.length > 0" class="text-sm font-bold text-yellow-400">
                    {{ tradeGiveTotalValue.toFixed(1) }} pts
                  </span>
                </div>
              </div>
              <div class="card-body">
                <!-- Selected Players to Give -->
                <div v-if="tradeGivePlayers.length > 0" class="space-y-2 mb-4">
                  <div v-for="player in tradeGivePlayers" :key="player.player_key" class="bg-yellow-500/10 rounded-xl p-3 border border-yellow-500/30">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <img :src="player.headshot || defaultHeadshot" class="w-10 h-10 rounded-full" @error="handleImageError" />
                        <div>
                          <div class="font-semibold text-dark-text">{{ player.full_name }}</div>
                          <div class="text-xs text-dark-textMuted">{{ player.position }} • {{ player.team }}</div>
                        </div>
                      </div>
                      <div class="flex items-center gap-3">
                        <div class="text-right">
                          <div class="font-bold text-yellow-400">{{ player.total_points?.toFixed(1) || '0' }}</div>
                          <div class="text-xs text-dark-textMuted">{{ player.ppg?.toFixed(1) || '0' }} PPG</div>
                        </div>
                        <button @click="removeGivePlayer(player)" class="text-red-400 hover:text-red-300 p-1">
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Player Search & Filter -->
                <div class="space-y-3">
                  <div class="text-sm text-dark-textMuted">{{ tradeGivePlayers.length > 0 ? 'Add another player:' : 'Select players from your roster:' }}</div>
                  <div class="flex gap-2">
                    <input 
                      v-model="tradeGiveSearch" 
                      type="text" 
                      placeholder="Search players..." 
                      class="flex-1 bg-dark-border border border-dark-border rounded-lg px-3 py-2 text-dark-text text-sm"
                    />
                    <select v-model="tradeGivePositionFilter" class="bg-dark-border border border-dark-border rounded-lg px-2 py-2 text-dark-text text-sm">
                      <option v-for="pos in tradePositionOptions" :key="pos.id" :value="pos.id">{{ pos.label }}</option>
                    </select>
                  </div>
                </div>

                <!-- Available Players List -->
                <div class="mt-3 max-h-64 overflow-y-auto space-y-1">
                  <button 
                    v-for="player in filteredMyPlayersForTrade.slice(0, 15)" 
                    :key="player.player_key"
                    @click="addGivePlayer(player)"
                    class="w-full flex items-center justify-between p-2 rounded-lg hover:bg-yellow-500/10 transition-colors text-left"
                  >
                    <div class="flex items-center gap-2">
                      <img :src="player.headshot || defaultHeadshot" class="w-8 h-8 rounded-full" @error="handleImageError" />
                      <div>
                        <div class="text-sm font-medium text-dark-text">{{ player.full_name }}</div>
                        <div class="text-xs text-dark-textMuted">{{ player.position }} • {{ player.team }}</div>
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="text-sm font-bold text-dark-text">{{ player.total_points?.toFixed(1) || '0' }}</div>
                      <div class="text-xs text-dark-textMuted">{{ player.ppg?.toFixed(1) || '0' }} PPG</div>
                    </div>
                  </button>
                  <div v-if="filteredMyPlayersForTrade.length === 0" class="text-center py-4 text-dark-textMuted text-sm">
                    No players found
                  </div>
                </div>
              </div>
            </div>

            <!-- YOU GET -->
            <div class="card border-2 border-cyan-500/30">
              <div class="card-header bg-cyan-500/10">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-xl">📥</span>
                    <h3 class="font-bold text-cyan-400">You Get</h3>
                    <span v-if="tradeGetPlayers.length > 0" class="ml-2 px-2 py-0.5 bg-cyan-400/20 rounded-full text-xs font-bold text-cyan-400">
                      {{ tradeGetPlayers.length }} player{{ tradeGetPlayers.length > 1 ? 's' : '' }}
                    </span>
                  </div>
                  <select 
                    v-model="tradePartnerKey" 
                    class="bg-dark-border border border-dark-border rounded-lg px-3 py-1.5 text-dark-text text-sm"
                    @change="tradeGetPlayers = []"
                  >
                    <option value="">Select trade partner...</option>
                    <option v-for="team in otherTeams" :key="team.team_key" :value="team.team_key">
                      {{ team.name }}
                    </option>
                  </select>
                </div>
                <span v-if="tradeGetPlayers.length > 0" class="text-sm font-bold text-cyan-400 mt-2 block">
                  {{ tradeGetTotalValue.toFixed(1) }} pts
                </span>
              </div>
              <div class="card-body">
                <!-- Selected Players to Get -->
                <div v-if="tradeGetPlayers.length > 0" class="space-y-2 mb-4">
                  <div v-for="player in tradeGetPlayers" :key="player.player_key" class="bg-cyan-500/10 rounded-xl p-3 border border-cyan-500/30">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <img :src="player.headshot || defaultHeadshot" class="w-10 h-10 rounded-full" @error="handleImageError" />
                        <div>
                          <div class="font-semibold text-dark-text">{{ player.full_name }}</div>
                          <div class="text-xs text-dark-textMuted">{{ player.position }} • {{ player.team }}</div>
                        </div>
                      </div>
                      <div class="flex items-center gap-3">
                        <div class="text-right">
                          <div class="font-bold text-cyan-400">{{ player.total_points?.toFixed(1) || '0' }}</div>
                          <div class="text-xs text-dark-textMuted">{{ player.ppg?.toFixed(1) || '0' }} PPG</div>
                        </div>
                        <button @click="removeGetPlayer(player)" class="text-red-400 hover:text-red-300 p-1">
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-if="tradePartnerKey" class="space-y-3">
                  <div class="text-sm text-dark-textMuted">{{ tradeGetPlayers.length > 0 ? 'Add another player:' : 'Select players from their roster:' }}</div>
                  <div class="flex gap-2">
                    <input 
                      v-model="tradeGetSearch" 
                      type="text" 
                      placeholder="Search players..." 
                      class="flex-1 bg-dark-border border border-dark-border rounded-lg px-3 py-2 text-dark-text text-sm"
                    />
                    <select v-model="tradeGetPositionFilter" class="bg-dark-border border border-dark-border rounded-lg px-2 py-2 text-dark-text text-sm">
                      <option v-for="pos in tradePositionOptions" :key="pos.id" :value="pos.id">{{ pos.label }}</option>
                    </select>
                  </div>

                  <!-- Available Players List -->
                  <div class="max-h-64 overflow-y-auto space-y-1">
                    <button 
                      v-for="player in filteredPartnerPlayersForTrade.slice(0, 15)" 
                      :key="player.player_key"
                      @click="addGetPlayer(player)"
                      class="w-full flex items-center justify-between p-2 rounded-lg hover:bg-cyan-500/10 transition-colors text-left"
                    >
                      <div class="flex items-center gap-2">
                        <img :src="player.headshot || defaultHeadshot" class="w-8 h-8 rounded-full" @error="handleImageError" />
                        <div>
                          <div class="text-sm font-medium text-dark-text">{{ player.full_name }}</div>
                          <div class="text-xs text-dark-textMuted">{{ player.position }} • {{ player.team }}</div>
                        </div>
                      </div>
                      <div class="text-right">
                        <div class="text-sm font-bold text-dark-text">{{ player.total_points?.toFixed(1) || '0' }}</div>
                        <div class="text-xs text-dark-textMuted">{{ player.ppg?.toFixed(1) || '0' }} PPG</div>
                      </div>
                    </button>
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
          <div v-if="tradeGivePlayers.length > 0 || tradeGetPlayers.length > 0" class="card mt-6">
            <div class="card-body py-4">
              <div class="flex items-center justify-between flex-wrap gap-4">
                <div class="flex items-center gap-6">
                  <div class="text-center">
                    <div class="text-2xl font-black text-yellow-400">{{ tradeGiveTotalValue.toFixed(1) }}</div>
                    <div class="text-xs text-dark-textMuted">You Give</div>
                  </div>
                  <div class="text-3xl text-dark-textMuted">⇄</div>
                  <div class="text-center">
                    <div class="text-2xl font-black text-cyan-400">{{ tradeGetTotalValue.toFixed(1) }}</div>
                    <div class="text-xs text-dark-textMuted">You Get</div>
                  </div>
                  <div class="text-center px-4 border-l border-dark-border">
                    <div class="text-2xl font-black" :class="tradeValueDifference >= 0 ? 'text-green-400' : 'text-red-400'">
                      {{ tradeValueDifference >= 0 ? '+' : '' }}{{ tradeValueDifference.toFixed(1) }}
                    </div>
                    <div class="text-xs text-dark-textMuted">Net Points</div>
                  </div>
                </div>
                <div class="text-sm text-dark-textMuted">
                  {{ tradeGivePlayers.length }} for {{ tradeGetPlayers.length }} trade
                </div>
              </div>
            </div>
          </div>

          <!-- Analyze Button -->
          <div class="flex justify-center mt-6">
            <button 
              @click="analyzeTrade"
              :disabled="tradeGivePlayers.length === 0 || tradeGetPlayers.length === 0 || isAnalyzingTrade"
              class="px-8 py-3 rounded-xl font-bold text-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              :class="tradeGivePlayers.length > 0 && tradeGetPlayers.length > 0 
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-gray-900' 
                : 'bg-dark-border text-dark-textMuted'"
            >
              <span class="flex items-center gap-2">
                <svg v-if="!isAnalyzingTrade" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <svg v-else class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ isAnalyzingTrade ? 'Analyzing...' : 'Analyze Trade' }}
              </span>
            </button>
          </div>

          <!-- Trade Analysis Results -->
          <template v-if="tradeAnalysis">
            <!-- Grade Card -->
            <div class="card overflow-hidden mt-6">
              <div class="p-6" :class="getTradeGradeBackground(tradeAnalysis.grade)">
                <div class="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <div class="text-sm text-dark-textMuted uppercase tracking-wider mb-1">Trade Grade</div>
                    <div class="text-6xl font-black" :class="getTradeGradeColor(tradeAnalysis.grade)">{{ tradeAnalysis.grade }}</div>
                  </div>
                  <div class="text-right flex-1 max-w-md">
                    <div class="text-xl font-semibold text-dark-text mb-2">{{ tradeAnalysis.headline }}</div>
                    <div class="text-sm text-dark-textMuted">{{ tradeAnalysis.summary }}</div>
                  </div>
                </div>
                
                <!-- Factor Scores -->
                <div class="mt-6 grid grid-cols-3 gap-4">
                  <div class="bg-dark-bg/50 rounded-xl p-4 text-center">
                    <div class="text-2xl font-black" :class="getTradeGradeColor(tradeAnalysis.valueGrade)">{{ tradeAnalysis.valueGrade }}</div>
                    <div class="text-xs text-dark-textMuted mt-1">Point Value</div>
                  </div>
                  <div class="bg-dark-bg/50 rounded-xl p-4 text-center">
                    <div class="text-2xl font-black" :class="getTradeGradeColor(tradeAnalysis.ppgGrade)">{{ tradeAnalysis.ppgGrade }}</div>
                    <div class="text-xs text-dark-textMuted mt-1">PPG Impact</div>
                  </div>
                  <div class="bg-dark-bg/50 rounded-xl p-4 text-center">
                    <div class="text-2xl font-black" :class="getTradeGradeColor(tradeAnalysis.positionGrade)">{{ tradeAnalysis.positionGrade }}</div>
                    <div class="text-xs text-dark-textMuted mt-1">Positional Value</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Trade Fairness Meter -->
            <div class="card mt-6">
              <div class="card-header">
                <div class="flex items-center gap-2">
                  <span class="text-xl">⚖️</span>
                  <h3 class="font-bold text-dark-text">Trade Fairness</h3>
                </div>
              </div>
              <div class="card-body">
                <div class="relative h-8 bg-dark-border/30 rounded-full overflow-hidden">
                  <div 
                    class="absolute top-0 bottom-0 transition-all duration-500"
                    :class="tradeAnalysis.fairnessPercent >= 50 ? 'bg-gradient-to-r from-green-600 to-green-400' : 'bg-gradient-to-r from-red-600 to-red-400'"
                    :style="{ 
                      left: tradeAnalysis.fairnessPercent >= 50 ? '50%' : tradeAnalysis.fairnessPercent + '%',
                      right: tradeAnalysis.fairnessPercent >= 50 ? (100 - tradeAnalysis.fairnessPercent) + '%' : '50%'
                    }"
                  ></div>
                  <div class="absolute top-0 bottom-0 left-1/2 w-1 bg-white/50 transform -translate-x-1/2"></div>
                </div>
                <div class="flex justify-between mt-2 text-sm">
                  <span class="text-red-400">They Win</span>
                  <span class="text-dark-textMuted">Fair Trade</span>
                  <span class="text-green-400">You Win</span>
                </div>
                <div class="text-center mt-4">
                  <span class="text-2xl font-bold" :class="tradeAnalysis.fairnessPercent >= 50 ? 'text-green-400' : 'text-red-400'">
                    {{ tradeAnalysis.fairnessPercent >= 50 ? '+' : '-' }}{{ Math.abs(tradeAnalysis.fairnessPercent - 50).toFixed(0) }}%
                  </span>
                  <span class="text-dark-textMuted ml-2">{{ tradeAnalysis.fairnessPercent >= 50 ? 'in your favor' : 'against you' }}</span>
                </div>
              </div>
            </div>

            <!-- Team Impact -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <!-- Before vs After -->
              <div class="card">
                <div class="card-header">
                  <div class="flex items-center gap-2">
                    <span class="text-xl">📊</span>
                    <h3 class="font-bold text-dark-text">Team Impact</h3>
                  </div>
                </div>
                <div class="card-body">
                  <div class="grid grid-cols-2 gap-4">
                    <div class="bg-dark-border/20 rounded-xl p-4 text-center">
                      <div class="text-sm text-dark-textMuted mb-1">Before Trade</div>
                      <div class="text-3xl font-black text-dark-text">{{ tradeAnalysis.teamBefore.totalPoints.toFixed(0) }}</div>
                      <div class="text-xs text-dark-textMuted mt-1">{{ tradeAnalysis.teamBefore.avgPPG.toFixed(1) }} avg PPG</div>
                    </div>
                    <div class="bg-dark-border/20 rounded-xl p-4 text-center">
                      <div class="text-sm text-dark-textMuted mb-1">After Trade</div>
                      <div class="text-3xl font-black" :class="tradeAnalysis.teamAfter.totalPoints > tradeAnalysis.teamBefore.totalPoints ? 'text-green-400' : 'text-red-400'">
                        {{ tradeAnalysis.teamAfter.totalPoints.toFixed(0) }}
                      </div>
                      <div class="text-xs text-dark-textMuted mt-1">{{ tradeAnalysis.teamAfter.avgPPG.toFixed(1) }} avg PPG</div>
                    </div>
                  </div>
                  <div class="mt-4 text-center">
                    <span class="text-lg font-bold" :class="tradeAnalysis.teamAfter.totalPoints > tradeAnalysis.teamBefore.totalPoints ? 'text-green-400' : 'text-red-400'">
                      {{ tradeAnalysis.teamAfter.totalPoints > tradeAnalysis.teamBefore.totalPoints ? '+' : '' }}{{ (tradeAnalysis.teamAfter.totalPoints - tradeAnalysis.teamBefore.totalPoints).toFixed(1) }} points
                    </span>
                  </div>
                </div>
              </div>

              <!-- Position Breakdown -->
              <div class="card">
                <div class="card-header">
                  <div class="flex items-center gap-2">
                    <span class="text-xl">🎯</span>
                    <h3 class="font-bold text-dark-text">Position Impact</h3>
                  </div>
                </div>
                <div class="card-body p-0">
                  <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                      <thead class="bg-dark-border/30">
                        <tr>
                          <th class="py-2 px-3 text-left text-dark-textMuted font-medium">Position</th>
                          <th class="py-2 px-3 text-center text-dark-textMuted font-medium">Giving</th>
                          <th class="py-2 px-3 text-center text-dark-textMuted font-medium">Getting</th>
                          <th class="py-2 px-3 text-center text-dark-textMuted font-medium">Net</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-dark-border/30">
                        <tr v-for="pos in tradeAnalysis.positionImpact" :key="pos.position" class="hover:bg-dark-border/10">
                          <td class="py-2 px-3 font-medium text-dark-text">{{ pos.position }}</td>
                          <td class="py-2 px-3 text-center text-yellow-400">{{ pos.giving > 0 ? '-' + pos.giving.toFixed(0) : '-' }}</td>
                          <td class="py-2 px-3 text-center text-cyan-400">{{ pos.getting > 0 ? '+' + pos.getting.toFixed(0) : '-' }}</td>
                          <td class="py-2 px-3 text-center font-bold" :class="pos.net >= 0 ? 'text-green-400' : 'text-red-400'">
                            {{ pos.net >= 0 ? '+' : '' }}{{ pos.net.toFixed(0) }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <!-- Player Comparison Table -->
            <div class="card mt-6">
              <div class="card-header">
                <div class="flex items-center gap-2">
                  <span class="text-xl">👥</span>
                  <h3 class="font-bold text-dark-text">Player Breakdown</h3>
                </div>
              </div>
              <div class="card-body p-0">
                <div class="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-dark-border/30">
                  <!-- Giving -->
                  <div class="p-4">
                    <div class="text-sm font-semibold text-yellow-400 mb-3">You Give</div>
                    <div class="space-y-2">
                      <div v-for="player in tradeGivePlayers" :key="player.player_key" class="flex items-center justify-between p-2 bg-yellow-500/5 rounded-lg">
                        <div class="flex items-center gap-2">
                          <img :src="player.headshot || defaultHeadshot" class="w-8 h-8 rounded-full" @error="handleImageError" />
                          <div>
                            <div class="text-sm font-medium text-dark-text">{{ player.full_name }}</div>
                            <div class="text-xs text-dark-textMuted">{{ player.position }}</div>
                          </div>
                        </div>
                        <div class="text-right">
                          <div class="font-bold text-yellow-400">{{ player.total_points?.toFixed(1) }}</div>
                          <div class="text-xs text-dark-textMuted">VOR: {{ player.vor?.toFixed(0) || '0' }}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <!-- Getting -->
                  <div class="p-4">
                    <div class="text-sm font-semibold text-cyan-400 mb-3">You Get</div>
                    <div class="space-y-2">
                      <div v-for="player in tradeGetPlayers" :key="player.player_key" class="flex items-center justify-between p-2 bg-cyan-500/5 rounded-lg">
                        <div class="flex items-center gap-2">
                          <img :src="player.headshot || defaultHeadshot" class="w-8 h-8 rounded-full" @error="handleImageError" />
                          <div>
                            <div class="text-sm font-medium text-dark-text">{{ player.full_name }}</div>
                            <div class="text-xs text-dark-textMuted">{{ player.position }}</div>
                          </div>
                        </div>
                        <div class="text-right">
                          <div class="font-bold text-cyan-400">{{ player.total_points?.toFixed(1) }}</div>
                          <div class="text-xs text-dark-textMuted">VOR: {{ player.vor?.toFixed(0) || '0' }}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- Premium Upgrade Overlay -->
        <div 
          v-if="!hasPremiumAccess" 
          class="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-dark-bg via-dark-bg/80 to-transparent"
        >
          <div class="text-center p-8 max-w-md">
            <div class="text-5xl mb-4">🔒</div>
            <h3 class="text-2xl font-bold text-dark-text mb-3">Unlock Trade Analyzer</h3>
            <p class="text-dark-textMuted mb-6">
              Get instant trade grades, point projections, and team impact analysis with Premium.
            </p>
            <div class="space-y-3">
              <button 
                @click="$router.push('/pricing')"
                class="w-full px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-gray-900 font-bold rounded-xl transition-all transform hover:scale-105 shadow-lg"
              >
                Upgrade to Premium
              </button>
              <p class="text-xs text-dark-textMuted">Unlock all features • Trade analyzer • Full projections</p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Platform Badge -->
    <div class="flex justify-center mt-8">
      <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full border" :class="platformBadgeClass">
        <img :src="platformLogo" :alt="platformName" class="w-5 h-5" />
        <span class="text-sm" :class="platformTextClass">{{ platformName }} Fantasy {{ sportName }}</span>
      </div>
    </div>
    
    <!-- Drop Player Modal -->
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
              <div class="col-span-2 text-center">PPG</div>
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
              <div class="col-span-2 text-center font-bold text-cyan-400">{{ getPlayerProjection(dropModalPlayer, 'today').toFixed(1) }}</div>
              <div class="col-span-2 text-center font-bold text-cyan-400">{{ getPlayerProjection(dropModalPlayer, '7day').toFixed(1) }}</div>
              <div class="col-span-2 text-center font-bold text-cyan-400">{{ getPlayerProjection(dropModalPlayer, '14day').toFixed(1) }}</div>
              <div class="col-span-2 text-center font-bold text-cyan-400">{{ getPlayerProjection(dropModalPlayer, 'ros').toFixed(1) }}</div>
            </template>
            <template v-else>
              <div class="col-span-2 text-center font-bold text-cyan-400">{{ getPlayerStats(dropModalPlayer, 'l7').toFixed(1) }}</div>
              <div class="col-span-2 text-center font-bold text-cyan-400">{{ getPlayerStats(dropModalPlayer, 'l14').toFixed(1) }}</div>
              <div class="col-span-2 text-center font-bold text-cyan-400">{{ getPlayerStats(dropModalPlayer, 'season').toFixed(1) }}</div>
              <div class="col-span-2 text-center font-bold text-cyan-400">{{ dropModalPlayer?.ppg?.toFixed(1) || '0' }}</div>
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
                <div class="col-span-2 text-center">
                  <div class="font-bold" :class="getComparisonClass(getPlayerProjection(dropModalPlayer, 'today'), getPlayerProjection(player, 'today'))">
                    {{ getPlayerProjection(player, 'today').toFixed(1) }}
                  </div>
                  <div class="text-[10px]" :class="getPlayerProjection(dropModalPlayer, 'today') - getPlayerProjection(player, 'today') >= 0 ? 'text-green-400' : 'text-red-400'">
                    {{ (getPlayerProjection(dropModalPlayer, 'today') - getPlayerProjection(player, 'today')) >= 0 ? '+' : '' }}{{ (getPlayerProjection(dropModalPlayer, 'today') - getPlayerProjection(player, 'today')).toFixed(1) }}
                  </div>
                </div>
                <div class="col-span-2 text-center">
                  <div class="font-bold" :class="getComparisonClass(getPlayerProjection(dropModalPlayer, '7day'), getPlayerProjection(player, '7day'))">
                    {{ getPlayerProjection(player, '7day').toFixed(1) }}
                  </div>
                  <div class="text-[10px]" :class="getPlayerProjection(dropModalPlayer, '7day') - getPlayerProjection(player, '7day') >= 0 ? 'text-green-400' : 'text-red-400'">
                    {{ (getPlayerProjection(dropModalPlayer, '7day') - getPlayerProjection(player, '7day')) >= 0 ? '+' : '' }}{{ (getPlayerProjection(dropModalPlayer, '7day') - getPlayerProjection(player, '7day')).toFixed(1) }}
                  </div>
                </div>
                <div class="col-span-2 text-center">
                  <div class="font-bold" :class="getComparisonClass(getPlayerProjection(dropModalPlayer, '14day'), getPlayerProjection(player, '14day'))">
                    {{ getPlayerProjection(player, '14day').toFixed(1) }}
                  </div>
                  <div class="text-[10px]" :class="getPlayerProjection(dropModalPlayer, '14day') - getPlayerProjection(player, '14day') >= 0 ? 'text-green-400' : 'text-red-400'">
                    {{ (getPlayerProjection(dropModalPlayer, '14day') - getPlayerProjection(player, '14day')) >= 0 ? '+' : '' }}{{ (getPlayerProjection(dropModalPlayer, '14day') - getPlayerProjection(player, '14day')).toFixed(1) }}
                  </div>
                </div>
                <div class="col-span-2 text-center">
                  <div class="font-bold" :class="getComparisonClass(getPlayerProjection(dropModalPlayer, 'ros'), getPlayerProjection(player, 'ros'))">
                    {{ getPlayerProjection(player, 'ros').toFixed(1) }}
                  </div>
                  <div class="text-[10px]" :class="getPlayerProjection(dropModalPlayer, 'ros') - getPlayerProjection(player, 'ros') >= 0 ? 'text-green-400' : 'text-red-400'">
                    {{ (getPlayerProjection(dropModalPlayer, 'ros') - getPlayerProjection(player, 'ros')) >= 0 ? '+' : '' }}{{ (getPlayerProjection(dropModalPlayer, 'ros') - getPlayerProjection(player, 'ros')).toFixed(1) }}
                  </div>
                </div>
              </template>
              <template v-else>
                <div class="col-span-2 text-center font-bold text-dark-text">{{ getPlayerStats(player, 'l7').toFixed(1) }}</div>
                <div class="col-span-2 text-center font-bold text-dark-text">{{ getPlayerStats(player, 'l14').toFixed(1) }}</div>
                <div class="col-span-2 text-center font-bold text-dark-text">{{ getPlayerStats(player, 'season').toFixed(1) }}</div>
                <div class="col-span-2 text-center font-bold text-dark-text">{{ player.ppg?.toFixed(1) || '0' }}</div>
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
            class="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-cyan-400 hover:to-blue-400 transition-all"
          >
            Add {{ dropModalPlayer?.full_name?.split(' ')[1] || 'Player' }}, Drop {{ selectedDropPlayer?.full_name?.split(' ')[1] || '...' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useAuthStore } from '@/stores/auth'
import { usePlatformsStore } from '@/stores/platforms'
import { yahooService } from '@/services/yahoo'
import { espnService } from '@/services/espn'
import { sleeperService } from '@/services/sleeper'
import { useFeatureAccess } from '@/composables/useFeatureAccess'
import SimulatedDataBanner from '@/components/SimulatedDataBanner.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { liveGamesService } from '@/services/live-games'

const leagueStore = useLeagueStore()
const authStore = useAuthStore()
const platformsStore = usePlatformsStore()
const { hasPremiumAccess } = useFeatureAccess()

// Effective league key - use the actually loaded league (might be previous season)
const effectiveLeagueKey = computed(() => {
  if (leagueStore.currentLeague?.league_id) return leagueStore.currentLeague.league_id
  return leagueStore.activeLeagueId
})

// Season detection for offseason banner
const currentSeason = computed(() => leagueStore.currentLeague?.season || new Date().getFullYear().toString())
const isSeasonComplete = computed(() => {
  if (leagueStore.currentLeague?.status === 'complete') return true
  const yahooLeague = Array.isArray(leagueStore.yahooLeague) ? leagueStore.yahooLeague[0] : leagueStore.yahooLeague
  return yahooLeague?.is_finished === 1
})

// Platform detection for badge - also check league ID format for robustness
const isSleeper = computed(() => leagueStore.activePlatform === 'sleeper')
const isEspn = computed(() => {
  const byPlatform = leagueStore.activePlatform === 'espn'
  const byLeagueId = leagueStore.activeLeagueId?.startsWith('espn_') || false
  return byPlatform || byLeagueId
})
const platformName = computed(() => {
  if (isEspn.value) return 'ESPN'
  if (isSleeper.value) return 'Sleeper'
  return 'Yahoo!'
})
const platformLogo = computed(() => {
  if (isEspn.value) return '/espn-logo.svg'
  if (isSleeper.value) return '/sleeper-logo.svg'
  return '/yahoo-fantasy.svg'
})
const platformBadgeClass = computed(() => {
  if (isEspn.value) return 'bg-[#5b8def]/10 border-[#5b8def]/30'
  if (isSleeper.value) return 'bg-[#01b5a5]/10 border-[#01b5a5]/30'
  return 'bg-purple-600/10 border-purple-600/30'
})
const platformTextClass = computed(() => {
  if (isEspn.value) return 'text-[#5b8def]'
  if (isSleeper.value) return 'text-[#01b5a5]'
  return 'text-purple-300'
})
const sportName = computed(() => {
  const saved = leagueStore.savedLeagues.find(l => l.league_id === leagueStore.activeLeagueId)
  const sport = saved?.sport || 'baseball'
  const names: Record<string, string> = { football: 'Football', baseball: 'Baseball', basketball: 'Basketball', hockey: 'Hockey' }
  return names[sport] || 'Fantasy'
})

// Detect current sport from active league across all platforms
const currentSport = computed(() => {
  const saved = leagueStore.savedLeagues.find(l => l.league_id === leagueStore.activeLeagueId)
  if (saved?.sport) return saved.sport
  // Fallback: parse from ESPN league key (espn_basketball_XXXX_2025)
  const id = leagueStore.activeLeagueId || ''
  if (id.startsWith('espn_')) {
    const parts = id.replace('espn_', '').split('_')
    if (['baseball', 'basketball', 'football', 'hockey'].includes(parts[0])) return parts[0]
  }
  return 'baseball'
})

// Sport-specific position configuration
const SPORT_POSITION_CONFIG: Record<string, {
  positions: string[]
  baselines: Record<string, number>
  rosterDefaults: Record<string, number>
  positionColors: Record<string, string>
  positionTextColors: Record<string, string>
  lineupSlots: string[]
  flexPositions: Record<string, string[]>
}> = {
  baseball: {
    positions: ['C', '1B', '2B', '3B', 'SS', 'OF', 'SP', 'RP'],
    baselines: { C: 12, '1B': 15, '2B': 15, '3B': 15, SS: 15, OF: 40, SP: 50, RP: 25 },
    rosterDefaults: { C: 1, '1B': 1, '2B': 1, '3B': 1, SS: 1, OF: 3, SP: 2, RP: 2, Util: 1 },
    positionColors: { C: 'bg-purple-500/30 text-purple-400', '1B': 'bg-red-500/30 text-red-400', '2B': 'bg-orange-500/30 text-orange-400', '3B': 'bg-yellow-500/30 text-yellow-400', SS: 'bg-green-500/30 text-green-400', OF: 'bg-blue-500/30 text-blue-400', SP: 'bg-cyan-500/30 text-cyan-400', RP: 'bg-pink-500/30 text-pink-400', Util: 'bg-gray-500/30 text-gray-400' },
    positionTextColors: { C: 'text-purple-400', '1B': 'text-red-400', '2B': 'text-orange-400', '3B': 'text-yellow-400', SS: 'text-green-400', OF: 'text-blue-400', SP: 'text-cyan-400', RP: 'text-pink-400', Util: 'text-gray-400' },
    lineupSlots: ['C', '1B', '2B', '3B', 'SS', 'OF', 'OF', 'OF', 'SP', 'SP', 'RP', 'RP', 'Util'],
    flexPositions: { Util: ['C','1B','2B','3B','SS','OF'], OF: ['OF','LF','CF','RF'] }
  },
  basketball: {
    positions: ['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'Util'],
    baselines: { PG: 15, SG: 15, SF: 15, PF: 15, C: 12, G: 20, F: 20, Util: 10 },
    rosterDefaults: { PG: 2, SG: 2, SF: 2, PF: 2, C: 1, G: 1, F: 1, Util: 1 },
    positionColors: { PG: 'bg-blue-500/30 text-blue-400', SG: 'bg-cyan-500/30 text-cyan-400', SF: 'bg-green-500/30 text-green-400', PF: 'bg-yellow-500/30 text-yellow-400', C: 'bg-purple-500/30 text-purple-400', G: 'bg-sky-500/30 text-sky-400', F: 'bg-lime-500/30 text-lime-400', Util: 'bg-gray-500/30 text-gray-400' },
    positionTextColors: { PG: 'text-blue-400', SG: 'text-cyan-400', SF: 'text-green-400', PF: 'text-yellow-400', C: 'text-purple-400', G: 'text-sky-400', F: 'text-lime-400', Util: 'text-gray-400' },
    lineupSlots: ['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'Util'],
    flexPositions: { G: ['PG','SG'], F: ['SF','PF'], Util: ['PG','SG','SF','PF','C'] }
  },
  football: {
    positions: ['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'Flex'],
    baselines: { QB: 12, RB: 20, WR: 30, TE: 12, K: 12, DEF: 12, Flex: 15 },
    rosterDefaults: { QB: 1, RB: 2, WR: 2, TE: 1, K: 1, DEF: 1, Flex: 1 },
    positionColors: { QB: 'bg-red-500/30 text-red-400', RB: 'bg-green-500/30 text-green-400', WR: 'bg-blue-500/30 text-blue-400', TE: 'bg-orange-500/30 text-orange-400', K: 'bg-gray-500/30 text-gray-400', DEF: 'bg-purple-500/30 text-purple-400', Flex: 'bg-yellow-500/30 text-yellow-400' },
    positionTextColors: { QB: 'text-red-400', RB: 'text-green-400', WR: 'text-blue-400', TE: 'text-orange-400', K: 'text-gray-400', DEF: 'text-purple-400', Flex: 'text-yellow-400' },
    lineupSlots: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'Flex', 'K', 'DEF'],
    flexPositions: { Flex: ['RB','WR','TE'] }
  },
  hockey: {
    positions: ['C', 'LW', 'RW', 'D', 'G'],
    baselines: { C: 15, LW: 15, RW: 15, D: 15, G: 8 },
    rosterDefaults: { C: 2, LW: 2, RW: 2, D: 4, G: 2 },
    positionColors: { C: 'bg-purple-500/30 text-purple-400', LW: 'bg-blue-500/30 text-blue-400', RW: 'bg-cyan-500/30 text-cyan-400', D: 'bg-green-500/30 text-green-400', G: 'bg-orange-500/30 text-orange-400' },
    positionTextColors: { C: 'text-purple-400', LW: 'text-blue-400', RW: 'text-cyan-400', D: 'text-green-400', G: 'text-orange-400' },
    lineupSlots: ['C', 'C', 'LW', 'LW', 'RW', 'RW', 'D', 'D', 'D', 'D', 'G', 'G'],
    flexPositions: {}
  }
}

const tabs = [
  { id: 'ros', name: 'Rest of Season', icon: '📊' },
  { id: 'teams', name: 'Teams', icon: '👥' },
  { id: 'startsit', name: 'Start/Sit', icon: '📅' },
  { id: 'trade', name: 'Trade Analyzer', icon: '🔄' }
]
const activeTab = ref('ros')
const isLoading = ref(true)
const loadingMessage = ref('Loading...')
const loadingProgress = ref({
  currentStep: '',
  currentStepName: '',
  completedSteps: 0,
  totalSteps: 0
})

// Platform detection
const isYahoo = computed(() => {
  return leagueStore.activePlatform === 'yahoo' || 
         (!leagueStore.activePlatform && leagueStore.activeLeagueId && !leagueStore.activeLeagueId.startsWith('espn_') && !leagueStore.activeLeagueId.startsWith('sleeper_'))
})
const expandedTeamId = ref<string | null>(null)
const allPlayers = ref<any[]>([])
const myTeamKey = ref<string | null>(null)
const selectedPositions = ref<string[]>([])
const showOnlyMyPlayers = ref(false)
const showOnlyFreeAgents = ref(false)
const defaultHeadshot = 'https://a.espncdn.com/combiner/i?img=/i/headshots/nophoto.png&w=200&h=145'
const defaultTeamAvatar = 'https://s.yimg.com/cv/apiv2/default/mlb/mlb_2_g.png'

const scoringMode = ref<'daily' | 'weekly'>('daily')
const selectedDate = ref(new Date())
const todaysGames = ref<any[]>([])
const tomorrowsGames = ref<any[]>([])
const currentWeek = computed(() => {
  // Calculate approximate MLB week (season typically starts late March/early April)
  const seasonStart = new Date(new Date().getFullYear(), 2, 28) // March 28
  const now = new Date()
  const diffTime = now.getTime() - seasonStart.getTime()
  const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7))
  return Math.max(1, Math.min(26, diffWeeks)) // MLB season is ~26 weeks
})
const selectedStartSitPosition = ref('')
const startSitPlayerFilter = ref<'all' | 'mine' | 'fa'>('mine')
const startSitPositions = computed(() => {
  const config = SPORT_POSITION_CONFIG[currentSport.value] || SPORT_POSITION_CONFIG.baseball
  return config.positions.map(p => ({ id: p, label: p }))
})

// Platform detection
const platform = computed(() => {
  if (isEspn.value) return 'espn'
  if (isSleeper.value) return 'sleeper'
  return 'yahoo'
})

// Start/Sit Customization State
const showStartSitCustomization = ref(false)
const showStartSitRankings = ref(false)
const activeStartSitPreset = ref('balanced')
const activeStartSitCategory = ref('production')

const startSitFactorCategories = [
  { id: 'production', name: 'Production', icon: '⚡' },
  { id: 'matchup', name: 'Matchup & Schedule', icon: '🎯' },
  { id: 'trending', name: 'Trending & Form', icon: '🔥' },
  { id: 'efficiency', name: 'Efficiency', icon: '📊' },
  { id: 'advanced', name: 'Advanced Metrics', icon: '🧪' }
]

const startSitFactors = ref([
  // Production factors
  { id: 'ppg', name: 'Points Per Game', description: 'Season average fantasy points', category: 'production', enabled: true, weight: 35, available: true },
  { id: 'vor', name: 'Value Over Replacement', description: 'Points above replacement-level at same position', category: 'production', enabled: false, weight: 0, available: true },
  { id: 'seasonTotal', name: 'Season Total Points', description: 'Total fantasy points this season', category: 'production', enabled: false, weight: 0, available: true },
  
  // Matchup factors
  { id: 'matchupDifficulty', name: 'Matchup Difficulty', description: 'Opponent strength vs this position', category: 'matchup', enabled: true, weight: 25, available: true },
  { id: 'homeAway', name: 'Home/Away Split', description: 'Player performs better at home or away', category: 'matchup', enabled: true, weight: 10, available: true },
  { id: 'parkFactor', name: 'Park Factor', description: 'Ballpark hitting friendliness (Coors, etc.)', category: 'matchup', enabled: false, weight: 0, available: false },
  { id: 'weather', name: 'Weather Conditions', description: 'Wind, temperature effects on scoring', category: 'matchup', enabled: false, weight: 0, available: false },
  
  // Trending factors
  { id: 'recentForm', name: 'Recent Form (7 days)', description: 'Performance trend over last week', category: 'trending', enabled: true, weight: 20, available: true },
  { id: 'last14', name: 'Last 14 Days Trend', description: 'Two-week performance trajectory', category: 'trending', enabled: false, weight: 0, available: true },
  { id: 'vsHandedness', name: 'vs L/R Pitcher', description: 'Platoon splits against today\'s pitcher', category: 'trending', enabled: false, weight: 0, available: false },
  
  // Efficiency factors
  { id: 'consistency', name: 'Consistency', description: 'Lower variance = more reliable floor', category: 'efficiency', enabled: true, weight: 10, available: true },
  { id: 'upside', name: 'Upside / Ceiling', description: 'Potential for big games (high variance)', category: 'efficiency', enabled: false, weight: 0, available: true },
  { id: 'gamesStarted', name: 'Games Started %', description: 'Lineup regularity', category: 'efficiency', enabled: false, weight: 0, available: false },
  
  // Advanced factors
  { id: 'xwoba', name: 'xwOBA', description: 'Expected weighted on-base average from contact quality', category: 'advanced', enabled: false, weight: 0, available: false },
  { id: 'barrelRate', name: 'Barrel Rate', description: 'Optimal contact percentage (98+ mph, ideal angle)', category: 'advanced', enabled: false, weight: 0, available: false },
  { id: 'hardHit', name: 'Hard Hit Rate', description: 'Balls hit 95+ mph', category: 'advanced', enabled: false, weight: 0, available: false },
  { id: 'sprintSpeed', name: 'Sprint Speed', description: 'Baserunning and stolen base predictor', category: 'advanced', enabled: false, weight: 0, available: false },
])

const startSitPresets = [
  { id: 'balanced', name: 'Balanced', icon: '⚖️', weights: { ppg: 35, matchupDifficulty: 25, recentForm: 20, homeAway: 10, consistency: 10 } },
  { id: 'matchupFocused', name: 'Matchup Focused', icon: '🎯', weights: { ppg: 25, matchupDifficulty: 40, recentForm: 15, homeAway: 15, consistency: 5 } },
  { id: 'hotHand', name: 'Hot Hand', icon: '🔥', weights: { ppg: 20, matchupDifficulty: 15, recentForm: 45, last14: 10, consistency: 10 } },
  { id: 'safeFloor', name: 'Safe Floor', icon: '🛡️', weights: { ppg: 30, matchupDifficulty: 15, recentForm: 10, homeAway: 10, consistency: 35 } },
  { id: 'highCeiling', name: 'High Ceiling', icon: '🚀', weights: { ppg: 25, matchupDifficulty: 25, recentForm: 20, upside: 25, consistency: 5 } },
]

// Sport-aware team abbreviations for opponent generation
const SPORT_TEAM_ABBREVS: Record<string, string[]> = {
  baseball: ['NYY','BOS','LAD','ATL','HOU','SD','PHI','SEA','TB','MIN','CHC','STL','TEX','BAL','MIL','ARI','SF','CLE','DET','KC','LAA','OAK','PIT','CIN','COL','MIA','WSH','NYM','TOR','CHW'],
  basketball: ['LAL','GSW','BOS','MIA','MIL','PHX','DEN','PHI','BKN','DAL','CHI','ATL','NYK','TOR','MEM','SAC','NOP','LAC','POR','IND','UTA','OKC','MIN','CLE','DET','ORL','HOU','WAS','CHA','SAS'],
  football: ['NE','KC','SF','DAL','GB','BUF','PHI','BAL','CIN','LAR','SEA','MIA','DEN','NO','TB','NYG','ARI','CAR','CHI','ATL','JAX','CLE','IND','MIN','DET','WAS','LV','LAC','TEN','HOU','NYJ','PIT'],
  hockey: ['BOS','TBL','COL','VGK','TOR','EDM','CAR','FLA','PIT','NYR','WSH','DAL','ANA','CHI','MTL','MIN','NSH','CBJ','PHI','BUF','ARI','NYI','SJS','VAN','WPG','OTT','CGY','STL','DET','NJD','LAK','SEA']
}

// Sport-aware matchup difficulty ratings (1-10, higher = easier for scorer)
const SPORT_MATCHUP_RATINGS: Record<string, Record<string, Record<string, number>>> = {
  baseball: {
    'NYY': { C: 5, '1B': 4, '2B': 6, '3B': 5, SS: 5, OF: 4, SP: 3, RP: 4 },
    'BOS': { C: 6, '1B': 7, '2B': 5, '3B': 6, SS: 6, OF: 7, SP: 5, RP: 6 },
    'LAD': { C: 4, '1B': 3, '2B': 4, '3B': 4, SS: 3, OF: 3, SP: 4, RP: 3 },
    'ATL': { C: 5, '1B': 5, '2B': 5, '3B': 6, SS: 5, OF: 5, SP: 4, RP: 5 },
    'HOU': { C: 4, '1B': 4, '2B': 5, '3B': 4, SS: 4, OF: 4, SP: 3, RP: 4 },
    'COL': { C: 9, '1B': 10, '2B': 9, '3B': 9, SS: 9, OF: 10, SP: 9, RP: 9 },
    'DET': { C: 8, '1B': 8, '2B': 8, '3B': 8, SS: 8, OF: 9, SP: 8, RP: 8 },
    'OAK': { C: 9, '1B': 9, '2B': 9, '3B': 9, SS: 9, OF: 10, SP: 9, RP: 9 },
  },
  basketball: {
    // Top defensive teams (hard = low score), weaker teams (easy = high score)
    'BOS': { PG: 4, SG: 4, SF: 4, PF: 5, C: 5, G: 4, F: 4, Util: 5 }, // elite defense
    'MIL': { PG: 5, SG: 5, SF: 5, PF: 4, C: 4, G: 5, F: 5, Util: 5 },
    'MIN': { PG: 5, SG: 4, SF: 5, PF: 4, C: 4, G: 5, F: 5, Util: 5 },
    'NYK': { PG: 5, SG: 5, SF: 5, PF: 5, C: 5, G: 5, F: 5, Util: 5 },
    'GSW': { PG: 5, SG: 5, SF: 5, PF: 6, C: 6, G: 5, F: 6, Util: 6 },
    'LAL': { PG: 6, SG: 6, SF: 6, PF: 6, C: 6, G: 6, F: 6, Util: 6 },
    'DEN': { PG: 6, SG: 6, SF: 6, PF: 5, C: 5, G: 6, F: 6, Util: 6 },
    'PHX': { PG: 6, SG: 6, SF: 7, PF: 7, C: 7, G: 6, F: 7, Util: 7 },
    'HOU': { PG: 7, SG: 7, SF: 7, PF: 7, C: 7, G: 7, F: 7, Util: 7 },
    'SAS': { PG: 8, SG: 8, SF: 8, PF: 8, C: 8, G: 8, F: 8, Util: 8 }, // weak team
    'DET': { PG: 8, SG: 8, SF: 8, PF: 8, C: 8, G: 8, F: 8, Util: 8 },
    'WAS': { PG: 8, SG: 8, SF: 8, PF: 8, C: 8, G: 8, F: 8, Util: 8 },
    'CHA': { PG: 9, SG: 9, SF: 8, PF: 8, C: 8, G: 9, F: 8, Util: 8 },
    'ORL': { PG: 7, SG: 7, SF: 7, PF: 7, C: 6, G: 7, F: 7, Util: 7 },
  },
  football: {
    'NE': { QB: 4, RB: 4, WR: 4, TE: 5, K: 5, DEF: 3, Flex: 4 },
    'SF': { QB: 4, RB: 4, WR: 4, TE: 5, K: 5, DEF: 3, Flex: 4 },
    'BUF': { QB: 5, RB: 5, WR: 5, TE: 5, K: 5, DEF: 4, Flex: 5 },
    'DAL': { QB: 6, RB: 6, WR: 7, TE: 6, K: 6, DEF: 5, Flex: 6 },
    'IND': { QB: 7, RB: 8, WR: 7, TE: 7, K: 7, DEF: 7, Flex: 7 },
    'NYG': { QB: 8, RB: 8, WR: 8, TE: 8, K: 8, DEF: 8, Flex: 8 },
    'CAR': { QB: 8, RB: 7, WR: 8, TE: 8, K: 7, DEF: 8, Flex: 8 },
  },
  hockey: {
    'BOS': { C: 4, LW: 4, RW: 4, D: 4, G: 4 },
    'TBL': { C: 4, LW: 4, RW: 4, D: 4, G: 4 },
    'COL': { C: 5, LW: 5, RW: 5, D: 5, G: 5 },
    'VGK': { C: 5, LW: 5, RW: 5, D: 5, G: 5 },
    'ARI': { C: 8, LW: 8, RW: 8, D: 8, G: 8 },
    'CBJ': { C: 8, LW: 8, RW: 8, D: 8, G: 8 },
    'CHI': { C: 8, LW: 8, RW: 8, D: 8, G: 8 },
  }
}

// Keep old ref name for backward compat but it's no longer used directly
const mlbTeamMatchupRatings = ref(SPORT_MATCHUP_RATINGS.baseball)

const totalStartSitWeight = computed(() => {
  return startSitFactors.value.filter(f => f.enabled).reduce((sum, f) => sum + f.weight, 0)
})

const startSitFactorsForActiveCategory = computed(() => {
  return startSitFactors.value.filter(f => f.category === activeStartSitCategory.value)
})

const startSitFormulaDescription = computed(() => {
  const enabled = startSitFactors.value.filter(f => f.enabled && f.weight > 0)
  if (enabled.length === 0) return 'No factors enabled'
  const sorted = [...enabled].sort((a, b) => b.weight - a.weight)
  const top3 = sorted.slice(0, 3)
  return top3.map(f => `${f.name} ${f.weight}%`).join(' • ')
})

function applyStartSitPreset(preset: typeof startSitPresets[0]) {
  activeStartSitPreset.value = preset.id
  startSitFactors.value.forEach(f => {
    const weight = (preset.weights as Record<string, number>)[f.id] || 0
    f.enabled = weight > 0
    f.weight = weight
  })
}

function onStartSitFactorChange() {
  activeStartSitPreset.value = 'custom'
}

function recalculateStartSit() {
  // Triggers reactivity - getStartSitPlayers will recalculate with new weights
}

function getMatchupDifficulty(opponentTeam: string, position: string): number {
  const sportRatings = SPORT_MATCHUP_RATINGS[currentSport.value] || SPORT_MATCHUP_RATINGS.baseball
  const teamRatings = sportRatings[opponentTeam]
  if (!teamRatings) return 5 // Default neutral
  return teamRatings[position] || 5
}

function getSportOpponents(): string[] {
  return SPORT_TEAM_ABBREVS[currentSport.value] || SPORT_TEAM_ABBREVS.baseball
}

function getMatchupClass(difficulty: number): string {
  if (difficulty >= 8) return 'text-green-400' // Easy matchup
  if (difficulty >= 6) return 'text-lime-400'
  if (difficulty >= 4) return 'text-yellow-400' // Neutral
  if (difficulty >= 2) return 'text-orange-400'
  return 'text-red-400' // Hard matchup
}

function getMatchupLabel(difficulty: number): string {
  if (difficulty >= 8) return 'Easy'
  if (difficulty >= 6) return 'Favorable'
  if (difficulty >= 4) return 'Neutral'
  if (difficulty >= 2) return 'Tough'
  return 'Hard'
}

// Sorting state for Rest of Season tab
const rosSortColumn = ref<string>('rosRank')
const rosSortDirection = ref<'asc' | 'desc'>('asc')

// Sorting state for Teams tab
const teamsSortColumn = ref<string>('statusScore')
const teamsSortDirection = ref<'asc' | 'desc'>('desc')

const rosterPositions = ref<any[]>([])
const espnMaxRosterSize = ref<number>(25) // Will be loaded from ESPN settings
const teamsData = ref<any[]>([])
const numTeams = computed(() => teamsData.value.length || 12)
const positionFilters = computed(() => {
  const config = SPORT_POSITION_CONFIG[currentSport.value] || SPORT_POSITION_CONFIG.baseball
  return config.positions.map(p => ({ id: p, label: p }))
})
const vorBaselines = computed(() => {
  const config = SPORT_POSITION_CONFIG[currentSport.value] || SPORT_POSITION_CONFIG.baseball
  return { ...config.baselines }
})
const positionBaselines = ref<Record<string, number>>({})

// Ranking Customization State
const showRankingCustomization = ref(false)
const activeRankingPreset = ref('balanced')
const activeFactorCategory = ref('production')

interface RankingFactor {
  id: string
  name: string
  description: string
  category: string
  enabled: boolean
  weight: number
  icon: string
  color: string
  available: boolean
}

const rankingFactorCategories = [
  { id: 'production', name: 'Production', icon: '⚡' },
  { id: 'volume', name: 'Volume & Games', icon: '📊' },
  { id: 'trending', name: 'Trending & Form', icon: '🔥' },
  { id: 'efficiency', name: 'Efficiency', icon: '🎯' },
  { id: 'advanced', name: 'Advanced Metrics', icon: '🧪' }
]

const rankingFactors = ref<RankingFactor[]>([
  // Production factors
  { id: 'ppg', name: 'Points Per Game', description: 'Average fantasy points per game played', category: 'production', enabled: true, weight: 35, icon: '📊', color: '#f5c451', available: true },
  { id: 'vor', name: 'Value Over Replacement', description: 'Points above a replacement-level player at same position', category: 'production', enabled: true, weight: 20, icon: '💎', color: '#a855f7', available: true },
  { id: 'seasonPoints', name: 'Season Total Points', description: 'Total fantasy points accumulated this season', category: 'production', enabled: true, weight: 20, icon: '📈', color: '#22c55e', available: true },
  
  // Volume factors
  { id: 'gamesPlayed', name: 'Games Played', description: 'Number of games played - more games = more opportunity', category: 'volume', enabled: true, weight: 5, icon: '🎮', color: '#3b82f6', available: true },
  { id: 'plateAppearances', name: 'Plate Appearances / Touches', description: 'Total opportunities (PA for hitters, touches for RBs)', category: 'volume', enabled: false, weight: 0, icon: '🏏', color: '#8b5cf6', available: false },
  
  // Trending factors
  { id: 'recentForm', name: 'Recent Form (7 Days)', description: 'Performance over last 7 days vs season average', category: 'trending', enabled: true, weight: 15, icon: '🔥', color: '#ef4444', available: true },
  { id: 'last14', name: 'Last 14 Days Trend', description: 'Performance trend over last 2 weeks', category: 'trending', enabled: false, weight: 0, icon: '📅', color: '#f97316', available: true },
  { id: 'ownershipTrend', name: 'Ownership Trend', description: 'Rising or falling ownership percentage', category: 'trending', enabled: false, weight: 0, icon: '📈', color: '#06b6d4', available: false },
  
  // Efficiency factors  
  { id: 'consistency', name: 'Consistency', description: 'Lower variance in scoring = more reliable floor', category: 'efficiency', enabled: true, weight: 5, icon: '🎯', color: '#ec4899', available: true },
  { id: 'gamesStarted', name: 'Games Started %', description: 'Percentage of games where player was in starting lineup', category: 'efficiency', enabled: false, weight: 0, icon: '⭐', color: '#10b981', available: false },
  
  // Advanced factors (sport-specific, coming soon)
  { id: 'xwoba', name: 'xwOBA (Expected wOBA)', description: 'Expected weighted on-base average based on contact quality', category: 'advanced', enabled: false, weight: 0, icon: '🧪', color: '#06b6d4', available: false },
  { id: 'barrelRate', name: 'Barrel Rate', description: 'Percentage of batted balls that are barrels (98+ mph, optimal angle)', category: 'advanced', enabled: false, weight: 0, icon: '💥', color: '#dc2626', available: false },
  { id: 'hardHitRate', name: 'Hard Hit Rate', description: 'Percentage of balls hit 95+ mph', category: 'advanced', enabled: false, weight: 0, icon: '🔨', color: '#f97316', available: false },
  { id: 'exitVelo', name: 'Exit Velocity', description: 'Average exit velocity on batted balls', category: 'advanced', enabled: false, weight: 0, icon: '🚀', color: '#ef4444', available: false },
])

const rankingPresets = [
  { id: 'balanced', name: 'Balanced', icon: '⚖️', factors: { ppg: 35, vor: 20, seasonPoints: 20, recentForm: 15, consistency: 5, gamesPlayed: 5 } },
  { id: 'seasonTotal', name: 'Season Total', icon: '📊', factors: { ppg: 20, vor: 15, seasonPoints: 45, recentForm: 10, consistency: 5, gamesPlayed: 5 } },
  { id: 'hotHand', name: 'Hot Hand', icon: '🔥', factors: { ppg: 20, vor: 10, seasonPoints: 15, recentForm: 40, consistency: 5, gamesPlayed: 5, last14: 5 } },
  { id: 'rosValue', name: 'ROS Value', icon: '💎', factors: { ppg: 40, vor: 30, seasonPoints: 10, recentForm: 10, consistency: 5, gamesPlayed: 5 } },
  { id: 'floorPlay', name: 'Floor Play', icon: '🛡️', factors: { ppg: 25, vor: 15, seasonPoints: 20, recentForm: 10, consistency: 25, gamesPlayed: 5 } },
]

const factorsForActiveCategory = computed(() => {
  return rankingFactors.value.filter(f => f.category === activeFactorCategory.value)
})

const totalRankingWeight = computed(() => {
  return rankingFactors.value.filter(f => f.enabled).reduce((sum, f) => sum + f.weight, 0)
})

const currentRankingFormula = computed(() => {
  const enabled = rankingFactors.value.filter(f => f.enabled && f.weight > 0)
  if (enabled.length === 0) return 'No factors enabled'
  
  const total = enabled.reduce((sum, f) => sum + f.weight, 0)
  return enabled
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 4)
    .map(f => `${f.name} (${Math.round(f.weight / total * 100)}%)`)
    .join(' + ') + (enabled.length > 4 ? ` + ${enabled.length - 4} more` : '')
})

function applyRankingPreset(preset: typeof rankingPresets[0]) {
  activeRankingPreset.value = preset.id
  
  // Reset all factors
  rankingFactors.value.forEach(f => {
    f.enabled = false
    f.weight = 0
  })
  
  // Apply preset weights
  Object.entries(preset.factors).forEach(([factorId, weight]) => {
    const factor = rankingFactors.value.find(f => f.id === factorId)
    if (factor && factor.available) {
      factor.enabled = true
      factor.weight = weight
    }
  })
  
  recalculateRankings()
}

function onRankingFactorChange() {
  activeRankingPreset.value = 'custom'
}

function applyRankingChanges() {
  saveRankingFactorsToStorage()
  recalculateRankings()
}

function resetRankingFactors() {
  applyRankingPreset(rankingPresets[0])
}

function saveRankingFactorsToStorage() {
  const key = `playerRankingFactors_${leagueStore.activePlatform}`
  localStorage.setItem(key, JSON.stringify(rankingFactors.value))
}

function loadRankingFactorsFromStorage() {
  const key = `playerRankingFactors_${leagueStore.activePlatform}`
  const saved = localStorage.getItem(key)
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      rankingFactors.value.forEach(f => {
        const savedFactor = parsed.find((sf: RankingFactor) => sf.id === f.id)
        if (savedFactor) {
          f.enabled = savedFactor.enabled
          f.weight = savedFactor.weight
        }
      })
      activeRankingPreset.value = 'custom'
    } catch (e) {
      console.error('Error loading saved ranking factors:', e)
    }
  }
}

// Trade Analyzer State
const tradePartnerKey = ref('')
const tradeGivePlayers = ref<any[]>([])
const tradeGetPlayers = ref<any[]>([])
const tradeGiveSearch = ref('')
const tradeGetSearch = ref('')
const tradeGivePositionFilter = ref('all')
const tradeGetPositionFilter = ref('all')
const tradeAnalysis = ref<any>(null)
const isAnalyzingTrade = ref(false)

const tradePositionOptions = [
  { id: 'all', label: 'All Positions' },
  { id: 'C', label: 'C' }, { id: '1B', label: '1B' }, { id: '2B', label: '2B' }, { id: '3B', label: '3B' },
  { id: 'SS', label: 'SS' }, { id: 'OF', label: 'OF' }, { id: 'SP', label: 'SP' }, { id: 'RP', label: 'RP' }
]

// Trade computed values
const myTeamPlayers = computed(() => {
  if (!myTeamKey.value) return []
  return allPlayers.value.filter(p => p.fantasy_team_key === myTeamKey.value)
})

const tradePartnerPlayers = computed(() => {
  if (!tradePartnerKey.value) return []
  return allPlayers.value.filter(p => p.fantasy_team_key === tradePartnerKey.value)
})

const filteredMyPlayersForTrade = computed(() => {
  let players = myTeamPlayers.value.filter(p => !tradeGivePlayers.value.some(gp => gp.player_key === p.player_key))
  if (tradeGivePositionFilter.value !== 'all') {
    players = players.filter(p => p.position?.includes(tradeGivePositionFilter.value))
  }
  if (tradeGiveSearch.value) {
    const search = tradeGiveSearch.value.toLowerCase()
    players = players.filter(p => p.full_name?.toLowerCase().includes(search))
  }
  return players.sort((a, b) => (b.total_points || 0) - (a.total_points || 0))
})

const filteredPartnerPlayersForTrade = computed(() => {
  let players = tradePartnerPlayers.value.filter(p => !tradeGetPlayers.value.some(gp => gp.player_key === p.player_key))
  if (tradeGetPositionFilter.value !== 'all') {
    players = players.filter(p => p.position?.includes(tradeGetPositionFilter.value))
  }
  if (tradeGetSearch.value) {
    const search = tradeGetSearch.value.toLowerCase()
    players = players.filter(p => p.full_name?.toLowerCase().includes(search))
  }
  return players.sort((a, b) => (b.total_points || 0) - (a.total_points || 0))
})

const tradeGiveTotalValue = computed(() => tradeGivePlayers.value.reduce((sum, p) => sum + (p.total_points || 0), 0))
const tradeGetTotalValue = computed(() => tradeGetPlayers.value.reduce((sum, p) => sum + (p.total_points || 0), 0))
const tradeValueDifference = computed(() => tradeGetTotalValue.value - tradeGiveTotalValue.value)

const otherTeams = computed(() => {
  return teamsData.value.filter(t => t.team_key !== myTeamKey.value)
})

const rosterRequirements = computed(() => {
  const config = SPORT_POSITION_CONFIG[currentSport.value] || SPORT_POSITION_CONFIG.baseball
  const reqs: Record<string, number> = {}
  Object.keys(config.rosterDefaults).forEach(pos => { reqs[pos] = 0 })
  rosterPositions.value.forEach((pos: any) => { const p = pos.position_type || pos.position; if (reqs[p] !== undefined) reqs[p]++ })
  return reqs
})

const displayRosterPositions = computed(() => {
  const config = SPORT_POSITION_CONFIG[currentSport.value] || SPORT_POSITION_CONFIG.baseball
  const display: { pos: string; count: number }[] = []
  const order = [...config.positions, 'Util']
  order.forEach(pos => { const c = getRosterSlotCount(pos); if (c > 0) display.push({ pos, count: c }) })
  return display
})

const uniquePositions = computed(() => {
  const config = SPORT_POSITION_CONFIG[currentSport.value] || SPORT_POSITION_CONFIG.baseball
  const set = new Set<string>()
  allPlayers.value.forEach(p => { const pos = p.position?.split(',')[0]?.trim(); if (pos) set.add(pos) })
  return config.positions.filter(pos => set.has(pos))
})

const filteredPlayers = computed(() => {
  let players = [...allPlayers.value]
  if (selectedPositions.value.length > 0 && selectedPositions.value.length < positionFilters.value.length) {
    players = players.filter(p => selectedPositions.value.some(pos => p.position?.includes(pos)))
  }
  
  // Fix: If both checkboxes checked, show union (my players OR free agents)
  // If only one checked, show just that filter
  if (showOnlyMyPlayers.value && showOnlyFreeAgents.value) {
    players = players.filter(p => isMyPlayer(p) || isFreeAgent(p))
  } else if (showOnlyMyPlayers.value) {
    players = players.filter(p => isMyPlayer(p))
  } else if (showOnlyFreeAgents.value) {
    players = players.filter(p => isFreeAgent(p))
  }
  
  // Apply sorting
  const col = rosSortColumn.value
  const dir = rosSortDirection.value
  players.sort((a, b) => {
    let aVal = a[col] ?? 0
    let bVal = b[col] ?? 0
    if (typeof aVal === 'string') aVal = aVal.toLowerCase()
    if (typeof bVal === 'string') bVal = bVal.toLowerCase()
    if (aVal < bVal) return dir === 'asc' ? -1 : 1
    if (aVal > bVal) return dir === 'asc' ? 1 : -1
    return 0
  })
  return players
})

function setRosSort(column: string) {
  if (rosSortColumn.value === column) {
    rosSortDirection.value = rosSortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    rosSortColumn.value = column
    rosSortDirection.value = column === 'rosRank' || column === 'positionRank' ? 'asc' : 'desc'
  }
}

// Gated filtered players - show top 3 for non-premium users
const gatedFilteredPlayers = computed(() => {
  if (hasPremiumAccess.value) return filteredPlayers.value
  return filteredPlayers.value.slice(0, 3)
})

const hiddenPlayersCount = computed(() => {
  if (hasPremiumAccess.value) return 0
  return Math.max(0, filteredPlayers.value.length - 3)
})

const formatSelectedDate = computed(() => selectedDate.value.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }))

const isToday = computed(() => {
  const today = new Date()
  return selectedDate.value.toDateString() === today.toDateString()
})

const isTomorrow = computed(() => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return selectedDate.value.toDateString() === tomorrow.toDateString()
})

function setToday() {
  selectedDate.value = new Date()
}

function setTomorrow() {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  selectedDate.value = tomorrow
}

function getStartSitPlayers(position: string): any[] {
  // For OF position, also include LF, CF, RF (ESPN uses specific OF positions)
  const outfieldPositions = ['OF', 'LF', 'CF', 'RF']
  let players = allPlayers.value.filter(p => {
    if (position === 'Util') return true
    if (position === 'OF') {
      return outfieldPositions.some(ofPos => p.position?.includes(ofPos))
    }
    return p.position?.includes(position)
  })
  
  // Apply player filter
  if (startSitPlayerFilter.value === 'mine') {
    players = players.filter(p => isMyPlayer(p) || isFreeAgent(p))
  } else if (startSitPlayerFilter.value === 'fa') {
    players = players.filter(p => isFreeAgent(p))
  }
  
  // Use the selected date to generate deterministic "games" data
  const dateStr = selectedDate.value.toISOString().split('T')[0]
  
  // Get enabled factors and their normalized weights
  const enabledFactors = startSitFactors.value.filter(f => f.enabled && f.available && f.weight > 0)
  const totalWeight = enabledFactors.reduce((sum, f) => sum + f.weight, 0) || 1
  
  players = players.map(p => {
    // Create deterministic hash from player key + date
    const hashInput = (p.player_key || '') + dateStr
    const hash = hashInput.split('').reduce((a: number, b: string) => ((a << 5) - a) + b.charCodeAt(0), 0)
    
    // Daily mode: ~60% chance of having a game on any given day
    const hasGameToday = Math.abs(hash) % 10 < 6
    
    // Weekly mode: 4-7 games per week (realistic MLB schedule)
    const gamesThisWeek = 4 + (Math.abs(hash) % 4)
    
    // Generate opponent based on hash (deterministic per player per date)
    const opponents = getSportOpponents()
    const opponentTeam = opponents[Math.abs(hash) % opponents.length]
    const opponent = hasGameToday ? `vs ${opponentTeam}` : null
    
    // Home/away based on hash (50/50)
    const isHome = Math.abs(hash >> 4) % 2 === 0
    
    // Get matchup difficulty for this position vs opponent
    const playerPos = p.position?.split(',')[0]?.trim() || position
    const matchupDifficulty = hasGameToday ? getMatchupDifficulty(opponentTeam, playerPos) : 5
    
    // Calculate base stats
    const ppg = p.ppg || 0
    const vor = p.vor || 0
    const seasonTotal = p.total_points || 0
    const recentPpg = p.recent_ppg || ppg
    const last14Ppg = p.last14_ppg || ppg
    const recentFormRatio = ppg > 0 ? recentPpg / ppg : 1
    const last14FormRatio = ppg > 0 ? last14Ppg / ppg : 1
    const stdDev = p.std_dev || (ppg * 0.3) // Estimate if not available
    const consistencyScore = Math.max(0, 100 - (stdDev * 10)) // Lower variance = higher score
    const upsideScore = Math.min(100, stdDev * 15) // Higher variance = higher upside potential
    
    // Home/away split bonus (simulated: +10% at home on average)
    const homeAwayBonus = isHome ? 1.1 : 0.95
    
    // Calculate weighted composite score (0-100 scale)
    let compositeScore = 0
    
    enabledFactors.forEach(factor => {
      // Skip unavailable factors
      if (!factor.available) return
      
      let factorScore = 0
      const normalizedWeight = factor.weight / totalWeight
      
      switch (factor.id) {
        case 'ppg':
          // Normalize PPG to 0-100 (assume max ~10 PPG for elite players)
          factorScore = Math.min(100, (ppg / 10) * 100)
          break
        case 'vor':
          // VOR can be negative, normalize to 0-100 (assume range -5 to +10)
          factorScore = Math.min(100, Math.max(0, (vor + 5) / 15 * 100))
          break
        case 'seasonTotal':
          // Normalize season total (assume max ~500 points for elite)
          factorScore = Math.min(100, (seasonTotal / 500) * 100)
          break
        case 'matchupDifficulty':
          // Already on 1-10 scale, convert to 0-100
          factorScore = matchupDifficulty * 10
          break
        case 'homeAway':
          // Home = higher score
          factorScore = isHome ? 70 : 30
          break
        case 'recentForm':
          // Recent form ratio: 1.0 = avg, >1 = hot, <1 = cold
          // Convert to 0-100 where 50 = average
          factorScore = Math.min(100, Math.max(0, recentFormRatio * 50))
          break
        case 'last14':
          // Same as recent form but 14-day window
          factorScore = Math.min(100, Math.max(0, last14FormRatio * 50))
          break
        case 'consistency':
          // Already 0-100
          factorScore = consistencyScore
          break
        case 'upside':
          // Higher variance = higher ceiling potential
          factorScore = upsideScore
          break
      }
      
      compositeScore += factorScore * normalizedWeight
    })
    
    // Calculate projection (PPG × games × matchup modifier)
    const matchupModifier = 0.7 + (matchupDifficulty / 10 * 0.6) // 0.7 to 1.3 range
    let projection = 0
    
    if (scoringMode.value === 'daily') {
      projection = hasGameToday ? ppg * matchupModifier * (isHome ? 1.05 : 0.98) : 0
    } else {
      projection = ppg * gamesThisWeek * matchupModifier
    }
    
    // Calculate tier and verdict based on composite score
    let tier = 5
    let verdict = 'Avoid'
    
    if (scoringMode.value === 'daily') {
      if (!hasGameToday) { tier = 6; verdict = 'No Game' }
      else if (compositeScore >= 75) { tier = 1; verdict = 'Must Start' }
      else if (compositeScore >= 60) { tier = 2; verdict = 'Start' }
      else if (compositeScore >= 45) { tier = 3; verdict = 'Flex' }
      else if (compositeScore >= 30) { tier = 4; verdict = 'Sit' }
      else { tier = 5; verdict = 'Avoid' }
    } else {
      // Weekly: based on composite + projection
      const weeklyScore = compositeScore * 0.6 + (Math.min(100, projection / 35 * 100)) * 0.4
      if (weeklyScore >= 75) { tier = 1; verdict = 'Must Start' }
      else if (weeklyScore >= 60) { tier = 2; verdict = 'Start' }
      else if (weeklyScore >= 45) { tier = 3; verdict = 'Flex' }
      else if (weeklyScore >= 30) { tier = 4; verdict = 'Sit' }
      else { tier = 5; verdict = 'Avoid' }
    }
    
    return { 
      ...p, 
      projection, 
      opponent, 
      opponentTeam,
      gamesThisWeek, 
      tier, 
      verdict, 
      hasGame: hasGameToday,
      isHome,
      matchupDifficulty,
      compositeScore
    }
  })
  
  // Sort by: has game first, then by composite score
  if (scoringMode.value === 'daily') {
    players.sort((a, b) => {
      if (a.hasGame && !b.hasGame) return -1
      if (!a.hasGame && b.hasGame) return 1
      return (b.compositeScore || 0) - (a.compositeScore || 0)
    })
  } else {
    players.sort((a, b) => (b.compositeScore || 0) - (a.compositeScore || 0))
  }
  
  return players
}

// Gated start/sit players - show top 3 for non-premium users
function gatedGetStartSitPlayers(position: string): any[] {
  const players = getStartSitPlayers(position)
  if (hasPremiumAccess.value) return players
  return players.slice(0, 3)
}

function getHiddenStartSitCount(position: string): number {
  if (hasPremiumAccess.value) return 0
  return Math.max(0, getStartSitPlayers(position).length - 3)
}

function showTierBreak(player: any, index: number, position: string): boolean {
  if (index === 0) return true
  return getStartSitPlayers(position)[index - 1]?.tier !== player.tier
}

const suggestedLineup = computed(() => {
  const slots: { position: string; player: any }[] = []
  const used = new Set<string>()
  const myPlayers = allPlayers.value.filter(p => isMyPlayer(p))
  const config = SPORT_POSITION_CONFIG[currentSport.value] || SPORT_POSITION_CONFIG.baseball
  
  // Build order from actual rosterPositions if available, else fall back to config defaults
  let order: string[]
  if (rosterPositions.value.length > 0) {
    const nonRoster = new Set(['BN', 'IL', 'IR', 'NA', 'IL+'])
    order = rosterPositions.value
      .map((p: any) => p.position_type || p.position)
      .filter((p: string) => !nonRoster.has(p))
  } else {
    order = config.lineupSlots
  }
  
  const dateStr = selectedDate.value.toISOString().split('T')[0]
  
  order.forEach(pos => {
    const flexEligible = config.flexPositions[pos] || []
    let eligible = myPlayers.filter(p => {
      if (used.has(p.player_key)) return false
      // Use all eligible positions (comma-separated from Yahoo/ESPN, array from Sleeper)
      const eligiblePositions: string[] = p.eligible_positions?.length
        ? p.eligible_positions
        : (p.position || '').split(',').map((s: string) => s.trim()).filter(Boolean)
      return eligiblePositions.includes(pos) || flexEligible.some((fp: string) => eligiblePositions.includes(fp))
    })
    const activeGames = todaysGames.value
    eligible = eligible.map(p => {
      const hashInput = (p.player_key || '') + dateStr
      const hash = hashInput.split('').reduce((a: number, b: string) => ((a << 5) - a) + b.charCodeAt(0), 0)
      const gamesThisWeek = 4 + (Math.abs(hash) % 4)
      const ppg = p.ppg || 0
      // Try real live game data first
      // mlb_team is the final fallback for ALL sports: Yahoo stores team abbrev in mlb_team
      // regardless of sport (nhl_team/nba_team fields may not be set by Yahoo service)
      const teamCode = currentSport.value === 'basketball' ? (p.nba_team || p.editorial_team_abbr || p.team_abbr || p.mlb_team)
        : currentSport.value === 'hockey' ? (p.nhl_team || p.editorial_team_abbr || p.team_abbr || p.mlb_team)
        : (p.mlb_team || p.editorial_team_abbr || p.team_abbr)
      const liveInfo = teamCode && activeGames.length ? liveGamesService.getPlayerGameInfo(teamCode, activeGames) : null
      const hasGameToday = liveInfo?.hasGame ?? (Math.abs(hash) % 10 < 6)
      const isLive = liveInfo?.isLive ?? false
      const gameTime = liveInfo?.gameTime ?? null
      const opponent = liveInfo?.hasGame ? liveInfo.opponent : (hasGameToday ? `vs ${getSportOpponents()[Math.abs(hash) % getSportOpponents().length]}` : null)
      const projection = scoringMode.value === 'daily' ? (hasGameToday ? ppg : 0) : ppg * gamesThisWeek
      return { ...p, projection, ppg, hasGame: hasGameToday, isLive, gameTime, opponent, gamesThisWeek }
    })
    // Sort: game-players first (by ppg), then non-game players (by ppg) - never leave slots empty due to fake schedule
    .sort((a, b) => {
      if (a.hasGame !== b.hasGame) return a.hasGame ? -1 : 1
      return (b.ppg || 0) - (a.ppg || 0)
    })
    const best = eligible[0]
    if (best) { used.add(best.player_key); slots.push({ position: pos, player: best }) }
    else slots.push({ position: pos, player: null })
  })
  return slots
})

const suggestedLineupTotal = computed(() => suggestedLineup.value.reduce((sum, s) => sum + (s.player?.projection || 0), 0))

// Bench players - my players not in suggested lineup
const benchPlayers = computed(() => {
  const usedPlayerKeys = new Set(
    modifiedSuggestedLineup.value
      .filter(slot => slot.player)
      .map(slot => slot.player.player_key)
  )
  
  const dateStr = selectedDate.value.toISOString().split('T')[0]
  
  return allPlayers.value
    .filter(p => isMyPlayer(p) && !usedPlayerKeys.has(p.player_key))
    .map(p => {
      const hashInput = (p.player_key || '') + dateStr
      const hash = hashInput.split('').reduce((a: number, b: string) => ((a << 5) - a) + b.charCodeAt(0), 0)
      const gamesThisWeek = 4 + (Math.abs(hash) % 4)
      const ppg = p.ppg || 0
      const bTeamCode = currentSport.value === 'basketball' ? (p.nba_team || p.editorial_team_abbr || p.team_abbr || p.mlb_team)
        : currentSport.value === 'hockey' ? (p.nhl_team || p.editorial_team_abbr || p.team_abbr || p.mlb_team)
        : (p.mlb_team || p.editorial_team_abbr || p.team_abbr)
      const bLiveInfo = bTeamCode && todaysGames.value.length ? liveGamesService.getPlayerGameInfo(bTeamCode, todaysGames.value) : null
      const hasGameToday = bLiveInfo?.hasGame ?? (Math.abs(hash) % 10 < 6)
      const projection = scoringMode.value === 'daily' ? (hasGameToday ? ppg : 0) : ppg * gamesThisWeek
      return { 
        ...p, 
        projection,
        opponent: bLiveInfo?.hasGame ? bLiveInfo.opponent : (hasGameToday ? `vs ${getSportOpponents()[Math.abs(hash) % getSportOpponents().length]}` : null),
        gamesThisWeek,
        hasGame: hasGameToday,
        isLive: bLiveInfo?.isLive ?? false,
        gameTime: bLiveInfo?.gameTime ?? null
      }
    })
    .sort((a, b) => (b.projection || 0) - (a.projection || 0))
})

// Waiver lineup management
const waiverLineupPlayers = ref<any[]>([])
const bestAvailablePosition = ref('all')
const bestAvailableViewMode = ref<'projections' | 'stats'>('projections')

// Drop player modal state
const showDropModal = ref(false)
const dropModalPlayer = ref<any>(null)
const dropModalViewMode = ref<'projections' | 'stats'>('projections')
const selectedDropPlayer = ref<any>(null)

// Droppable players - all my roster players sorted by worst first
const droppablePlayers = computed(() => {
  return myTeamPlayers.value
    .slice()
    .sort((a, b) => (a.compositeScore || 0) - (b.compositeScore || 0))
})

// Projection calculations for free agents
function getPlayerProjection(player: any, period: string): number {
  if (!player) return 0
  const ppg = player.ppg || 0
  const gamesPerDay = 0.6 // ~60% chance of game on any day
  
  switch (period) {
    case 'today':
      return ppg * gamesPerDay
    case '7day':
      return ppg * 7 * gamesPerDay
    case '14day':
      return ppg * 14 * gamesPerDay
    case 'ros':
      return ppg * 60 * gamesPerDay // ~60 days remaining
    default:
      return ppg
  }
}

// Stats calculations (using actual historical data if available, else estimate from PPG)
function getPlayerStats(player: any, period: string): number {
  if (!player) return 0
  const ppg = player.ppg || 0
  const totalPoints = player.total_points || player.season_total || (ppg * 100)
  const gamesPlayed = player.games_played || Math.round(totalPoints / (ppg || 1)) || 100
  
  switch (period) {
    case 'l7':
      // Last 7 days - use recent_ppg if available, else estimate
      const l7ppg = player.recent_7_ppg || player.recent_ppg || ppg
      return l7ppg * 4 // ~4 games in last 7 days
    case 'l14':
      const l14ppg = player.recent_14_ppg || player.recent_ppg || ppg
      return l14ppg * 8 // ~8 games in last 14 days
    case 'season':
      return totalPoints
    default:
      return ppg
  }
}

// Comparison class for projections
function getComparisonClass(pickupValue: number, dropValue: number): string {
  if (pickupValue > dropValue) return 'text-red-400' // Drop player is worse
  if (pickupValue < dropValue) return 'text-green-400' // Drop player is better
  return 'text-dark-text'
}

// Handle adding player - check if roster is full
function handleAddPlayer(player: any) {
  if (!isFreeAgent(player)) return
  
  if (isInWaiverLineup(player)) {
    removeFromWaiverLineup(player)
    return
  }
  
  // Check if roster is full
  if (rosterSpotsAvailable.value <= 0) {
    // Show drop modal
    dropModalPlayer.value = player
    selectedDropPlayer.value = null
    showDropModal.value = true
  } else {
    // Directly add to lineup
    togglePlayerInLineup(player)
  }
}

function closeDropModal() {
  showDropModal.value = false
  dropModalPlayer.value = null
  selectedDropPlayer.value = null
}

function confirmDrop() {
  if (!dropModalPlayer.value || !selectedDropPlayer.value) return
  
  // Add the pickup player to waiver lineup
  const enrichedPlayer = getStartSitPlayers('Util').find(p => p.player_key === dropModalPlayer.value.player_key) || dropModalPlayer.value
  waiverLineupPlayers.value.push({
    ...enrichedPlayer,
    droppingPlayer: selectedDropPlayer.value // Track who we're dropping for this player
  })
  
  closeDropModal()
}

const filteredBestAvailable = computed(() => {
  let freeAgents = allPlayers.value
    .filter(p => isFreeAgent(p))
    .sort((a, b) => (b.compositeScore || 0) - (a.compositeScore || 0))
  
  if (bestAvailablePosition.value !== 'all') {
    const pos = bestAvailablePosition.value
    const outfieldPositions = ['OF', 'LF', 'CF', 'RF']
    if (pos === 'OF') {
      freeAgents = freeAgents.filter(p => outfieldPositions.some(ofPos => p.position?.includes(ofPos)))
    } else {
      freeAgents = freeAgents.filter(p => p.position?.includes(pos))
    }
  }
  
  return freeAgents.slice(0, 50) // Top 50 free agents
})

function isInWaiverLineup(player: any): boolean {
  return waiverLineupPlayers.value.some(p => p.player_key === player.player_key)
}

function togglePlayerInLineup(player: any) {
  if (!isFreeAgent(player)) return
  
  if (isInWaiverLineup(player)) {
    removeFromWaiverLineup(player)
  } else {
    // Add player with their Start/Sit projection data
    const enrichedPlayer = getStartSitPlayers('Util').find(p => p.player_key === player.player_key) || player
    waiverLineupPlayers.value.push(enrichedPlayer)
  }
}

function removeFromWaiverLineup(player: any) {
  waiverLineupPlayers.value = waiverLineupPlayers.value.filter(p => p.player_key !== player.player_key)
}

function clearWaiverLineup() {
  waiverLineupPlayers.value = []
}

const modifiedSuggestedLineup = computed(() => {
  // Start with original suggested lineup
  const slots = suggestedLineup.value.map(slot => ({ ...slot, isWaiver: false }))
  const config = SPORT_POSITION_CONFIG[currentSport.value] || SPORT_POSITION_CONFIG.baseball
  
  // Try to fit waiver players into appropriate slots
  waiverLineupPlayers.value.forEach(waiverPlayer => {
    const playerPos = waiverPlayer.position?.split(',')[0]?.trim() || 'Util'
    
    // Find best slot for this player
    let bestSlotIdx = -1
    let bestImprovement = -Infinity
    
    slots.forEach((slot, idx) => {
      // Check if position matches using sport-aware flex rules
      const flexEligible = config.flexPositions[slot.position] || []
      const slotMatches = slot.position === playerPos || flexEligible.includes(playerPos)
      
      if (!slotMatches) return
      
      // Calculate improvement (prefer empty slots or replacing lower projection)
      const currentProjection = slot.player?.projection || 0
      const waiverProjection = waiverPlayer.projection || (waiverPlayer.ppg * 0.6) || 0
      const improvement = waiverProjection - currentProjection
      
      // Prefer this slot if: empty, or better improvement, or replaces non-my-team player
      const isMyTeamInSlot = slot.player && !slot.isWaiver && isMyPlayer(slot.player)
      
      if (!slot.player || (!isMyTeamInSlot && improvement > bestImprovement) || (improvement > 0 && improvement > bestImprovement)) {
        bestSlotIdx = idx
        bestImprovement = improvement
      }
    })
    
    if (bestSlotIdx >= 0) {
      slots[bestSlotIdx] = {
        position: slots[bestSlotIdx].position,
        player: waiverPlayer,
        isWaiver: true
      }
    }
  })
  
  return slots
})

const modifiedSuggestedLineupTotal = computed(() => {
  return modifiedSuggestedLineup.value.reduce((sum, s) => sum + (s.player?.projection || 0), 0)
})

async function downloadSuggestedLineup() {
  const date = selectedDate.value.toISOString().split('T')[0]
  const mode = scoringMode.value === 'daily' ? 'Daily' : 'Weekly'
  
  try {
    const html2canvas = (await import('html2canvas')).default
    
    const WIDTH = 500
    
    // Load main UFD logo (same as Power Rankings)
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
        console.warn('Failed to load logo:', e)
        return ''
      }
    }
    
    const logoBase64 = await loadLogo()
    
    // Position colors function
    const getPosColor = (pos: string) => {
      const colors: Record<string, string> = {
        'C': '#ef4444', '1B': '#f97316', '2B': '#eab308', '3B': '#84cc16',
        'SS': '#22c55e', 'OF': '#06b6d4', 'SP': '#8b5cf6', 'RP': '#ec4899',
        'LF': '#06b6d4', 'CF': '#06b6d4', 'RF': '#06b6d4', 'Util': '#6b7280'
      }
      return colors[pos] || '#6b7280'
    }
    
    // Generate lineup row
    const generateLineupRow = (slot: any) => {
      const pos = slot.position
      const player = slot.player
      const isWaiver = slot.isWaiver
      
      if (!player) {
        return `
          <div style="display: flex; height: 52px; padding: 0 12px; background: rgba(38, 42, 58, 0.4); border-radius: 8px; margin-bottom: 4px; border: 1px solid rgba(58, 61, 82, 0.4); align-items: center;">
            <div style="width: 50px; flex-shrink: 0;">
              <span style="display: inline-block; font-size: 11px; font-weight: bold; padding: 4px 8px; border-radius: 4px; background: ${getPosColor(pos)}; color: white;">${pos}</span>
            </div>
            <div style="flex: 1; color: #6b7280; font-style: italic; font-size: 13px;">Empty slot</div>
          </div>
        `
      }
      
      const borderColor = isWaiver ? '#06b6d4' : 'rgba(58, 61, 82, 0.4)'
      const bgColor = isWaiver ? 'rgba(6, 182, 212, 0.1)' : 'rgba(38, 42, 58, 0.4)'
      const nameColor = isWaiver ? '#06b6d4' : '#f7f7ff'
      const projColor = isWaiver ? '#06b6d4' : '#facc15'
      const matchupText = player.opponent || (scoringMode.value === 'daily' ? 'No game' : `${player.gamesThisWeek || 0} games`)
      const matchupColor = player.opponent ? '#9ca3af' : '#ef4444'
      
      return `
        <div style="display: flex; height: 52px; padding: 0 12px; background: ${bgColor}; border-radius: 8px; margin-bottom: 4px; border: 1px solid ${borderColor}; align-items: center;">
          <div style="width: 50px; flex-shrink: 0;">
            <span style="display: inline-block; font-size: 11px; font-weight: bold; padding: 4px 8px; border-radius: 4px; background: ${getPosColor(pos)}; color: white;">${pos}</span>
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 14px; font-weight: 600; color: ${nameColor}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${player.full_name}</div>
            <div style="font-size: 11px; color: ${matchupColor};">${matchupText}</div>
          </div>
          <div style="width: 55px; flex-shrink: 0; text-align: right;">
            <div style="font-size: 18px; font-weight: bold; color: ${projColor};">${(player.projection || 0).toFixed(1)}</div>
          </div>
        </div>
      `
    }
    
    // Build all lineup rows
    const lineupRows = modifiedSuggestedLineup.value.map(slot => generateLineupRow(slot)).join('')
    
    const container = document.createElement('div')
    container.style.cssText = 'position: absolute; left: -9999px; top: 0; width: ' + WIDTH + 'px; font-family: system-ui, -apple-system, sans-serif;'
    
    container.innerHTML = `
      <div style="background: linear-gradient(160deg, #0f1219 0%, #0a0c14 50%, #0d1117 100%); border-radius: 16px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); position: relative; overflow: hidden;">
        
        <!-- Top Yellow Bar -->
        <div style="background: #facc15; padding: 10px 24px 10px 24px; text-align: center; overflow: visible;">
          <span style="font-size: 14px; font-weight: 700; color: #0a0c14; text-transform: uppercase; letter-spacing: 3px; display: block; margin-top: -14px;">Ultimate Fantasy Dashboard</span>
        </div>
        
        <!-- Header -->
        <div style="display: flex; padding: 16px 24px; border-bottom: 1px solid rgba(250, 204, 21, 0.2); position: relative; z-index: 10; align-items: center;">
          ${logoBase64 ? `<img src="${logoBase64}" style="height: 60px; width: auto; flex-shrink: 0; margin-right: 20px; display: block;" />` : ''}
          <div style="flex: 1; margin-top: -10px;">
            <div style="font-size: 32px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 1px; text-shadow: 0 2px 8px rgba(250, 204, 21, 0.4); line-height: 1;">Suggested Lineup</div>
            <div style="font-size: 16px; margin-top: 4px; font-weight: 600; line-height: 1;">
              <span style="color: #e5e7eb;">${mode}</span>
              <span style="color: #6b7280; margin: 0 8px;">•</span>
              <span style="color: #facc15; font-weight: 700;">${date}</span>
            </div>
          </div>
        </div>
        
        <!-- Main content -->
        <div style="padding: 16px 24px 12px 24px; position: relative;">
          
          <!-- Lineup Rows -->
          <div style="margin-bottom: 16px;">
            ${lineupRows}
          </div>
          
          <!-- Total Box -->
          <div style="background: rgba(38, 42, 58, 0.6); border-radius: 12px; padding: 16px; border: 2px solid #facc15; display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 18px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 1px;">Projected Total</div>
            <div style="font-size: 36px; font-weight: 900; color: #facc15; text-shadow: 0 2px 8px rgba(250, 204, 21, 0.3);">${modifiedSuggestedLineupTotal.value.toFixed(1)}</div>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="padding: 16px 24px 20px 24px; text-align: center; position: relative; z-index: 1;">
          <span style="font-size: 20px; font-weight: bold; color: #facc15; letter-spacing: -0.5px; display: block; margin-top: -30px;">ultimatefantasydashboard.com</span>
        </div>
      </div>
    `
    
    document.body.appendChild(container)
    
    const canvas = await html2canvas(container, {
      backgroundColor: null,
      scale: 2,
      logging: false
    })
    
    document.body.removeChild(container)
    
    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = `lineup-${date}.png`
    link.click()
    
  } catch (e) {
    console.error('Failed to download lineup:', e)
    // Fallback to text download
    let content = `Suggested Lineup - ${mode} (${date})\n${'='.repeat(50)}\n\n`
    modifiedSuggestedLineup.value.forEach(slot => {
      const pos = slot.position.padEnd(4)
      if (slot.player) {
        const name = slot.player.full_name.padEnd(25)
        const proj = (slot.player.projection || 0).toFixed(1).padStart(6)
        content += `${pos} ${name} ${proj}\n`
      } else {
        content += `${pos} (Empty)\n`
      }
    })
    content += `\nTotal: ${modifiedSuggestedLineupTotal.value.toFixed(1)}`
    
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lineup-${date}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }
}

// Roster spots calculation
const rosterSpotsAvailable = computed(() => {
  let maxRosterSize = 25 // Default
  
  if (isEspn.value) {
    // Use ESPN roster size from settings (already excludes IL/IR slots)
    maxRosterSize = espnMaxRosterSize.value
  } else if (rosterPositions.value.length > 0) {
    // Yahoo: sum up position counts, excluding IL/IR/DL positions
    maxRosterSize = rosterPositions.value.reduce((sum: number, pos: any) => {
      const posType = (pos.position_type || pos.position || '').toUpperCase()
      if (['IL', 'IR', 'IL+', 'DL', 'NA'].includes(posType)) {
        return sum // Don't count IL/IR slots
      }
      return sum + (pos.count || 1)
    }, 0)
  }
  
  // Count only active roster players (exclude those on IL/IR)
  const activeRosterPlayers = myTeamPlayers.value.filter(p => {
    const slot = (p.lineupSlot || p.selected_position || '').toUpperCase()
    const injury = (p.injuryStatus || '').toUpperCase()
    // Exclude players in IL/IR slots or with IL-eligible injury status
    return !['IL', 'IR', 'IL+', 'DL', 'NA'].includes(slot)
  })
  
  const currentRosterSize = activeRosterPlayers.length
  console.log('[Roster] Max Active:', maxRosterSize, 'Current Active:', currentRosterSize, 'Available:', maxRosterSize - currentRosterSize, '(Total players:', myTeamPlayers.value.length, ')')
  return maxRosterSize - currentRosterSize
})

// Recommended moves calculation
const recommendedMoves = computed(() => {
  const moves: Array<{
    pickup: any
    drop: any | null
    impact: {
      today: number
      next7Days: number
      next14Days: number
      thisWeek: number
      next3Weeks: number
      ros: number
    }
    reason: string
  }> = []

  // Get free agents sorted by composite score
  const freeAgents = allPlayers.value
    .filter(p => isFreeAgent(p))
    .sort((a, b) => (b.compositeScore || 0) - (a.compositeScore || 0))
    .slice(0, 20) // Top 20 free agents

  // Get my weakest players at each position
  const myPlayersByPos: Record<string, any[]> = {}
  myTeamPlayers.value.forEach(p => {
    const pos = p.position?.split(',')[0]?.trim() || 'Util'
    if (!myPlayersByPos[pos]) myPlayersByPos[pos] = []
    myPlayersByPos[pos].push(p)
  })

  // Sort my players by composite score (worst first)
  Object.values(myPlayersByPos).forEach(arr => {
    arr.sort((a, b) => (a.compositeScore || 0) - (b.compositeScore || 0))
  })

  // Find beneficial pickups
  freeAgents.forEach(fa => {
    const faPos = fa.position?.split(',')[0]?.trim() || 'Util'
    const faScore = fa.compositeScore || 0
    const faPpg = fa.ppg || 0

    // Check if this FA is better than any of my players at this position
    const outfieldPositions = ['OF', 'LF', 'CF', 'RF']
    let relevantMyPlayers = myPlayersByPos[faPos] || []
    
    // For outfielders, check all OF positions
    if (outfieldPositions.includes(faPos)) {
      relevantMyPlayers = outfieldPositions
        .flatMap(pos => myPlayersByPos[pos] || [])
        .sort((a, b) => (a.compositeScore || 0) - (b.compositeScore || 0))
    }

    if (relevantMyPlayers.length === 0) {
      // No players at this position - definite pickup opportunity
      const hasOpenSlot = rosterSpotsAvailable.value > 0

      // Find worst player on my roster if no open slot
      const allMyPlayers = [...myTeamPlayers.value].sort((a, b) => (a.compositeScore || 0) - (b.compositeScore || 0))
      const dropCandidate = hasOpenSlot ? null : allMyPlayers[0]

      // Calculate impact
      const impact = calculateMoveImpact(fa, dropCandidate)

      if (impact.ros > 0) {
        moves.push({
          pickup: fa,
          drop: dropCandidate,
          impact,
          reason: `Fills empty ${faPos} slot. ${fa.full_name} projects ${faPpg.toFixed(1)} PPG with a composite score of ${faScore.toFixed(0)}.`
        })
      }
    } else {
      // Compare to worst player at this position
      const worstAtPos = relevantMyPlayers[0]
      const worstScore = worstAtPos?.compositeScore || 0
      const worstPpg = worstAtPos?.ppg || 0

      // Only recommend if FA is significantly better
      const scoreDiff = faScore - worstScore
      const ppgDiff = faPpg - worstPpg

      if (scoreDiff > 5 && ppgDiff > 0.3) {
        const impact = calculateMoveImpact(fa, worstAtPos)

        if (impact.ros > 2) { // Minimum 2 point ROS improvement
          moves.push({
            pickup: fa,
            drop: worstAtPos,
            impact,
            reason: `${fa.full_name} (${faPpg.toFixed(1)} PPG) is significantly better than ${worstAtPos.full_name} (${worstPpg.toFixed(1)} PPG) at ${faPos}. +${scoreDiff.toFixed(0)} composite score improvement.`
          })
        }
      }
    }
  })

  // Sort by ROS impact and return top recommendations
  return moves.sort((a, b) => b.impact.ros - a.impact.ros).slice(0, 10)
})

function calculateMoveImpact(pickup: any, drop: any | null): { today: number; next7Days: number; next14Days: number; thisWeek: number; next3Weeks: number; ros: number } {
  const pickupPpg = pickup.ppg || 0
  const dropPpg = drop?.ppg || 0
  const ppgDiff = pickupPpg - dropPpg

  // Estimate games for each timeframe
  const isFootball = sportName.value === 'Football'
  
  if (isFootball) {
    // Football: 1 game per week
    return {
      today: 0,
      next7Days: 0,
      next14Days: 0,
      thisWeek: ppgDiff * 1,
      next3Weeks: ppgDiff * 3,
      ros: ppgDiff * 10 // ~10 weeks remaining in season
    }
  } else {
    // Baseball/Basketball/Hockey: estimate games
    const gamesPerDay = 0.6 // ~60% chance of game on any day
    return {
      today: ppgDiff * gamesPerDay,
      next7Days: ppgDiff * 7 * gamesPerDay,
      next14Days: ppgDiff * 14 * gamesPerDay,
      thisWeek: ppgDiff * 7 * gamesPerDay,
      next3Weeks: ppgDiff * 21 * gamesPerDay,
      ros: ppgDiff * 60 * gamesPerDay // ~60 days remaining
    }
  }
}

function getMoveVerdict(rosImpact: number): string {
  if (rosImpact >= 20) return 'Must Add'
  if (rosImpact >= 10) return 'Add'
  if (rosImpact >= 5) return 'Consider'
  if (rosImpact >= 0) return 'Optional'
  return 'Skip'
}

function getMoveVerdictClass(rosImpact: number): string {
  if (rosImpact >= 20) return 'text-green-400'
  if (rosImpact >= 10) return 'text-lime-400'
  if (rosImpact >= 5) return 'text-yellow-400'
  if (rosImpact >= 0) return 'text-dark-textMuted'
  return 'text-red-400'
}

interface TeamRanking { teamKey: string; teamName: string; managerName: string; logoUrl: string; isMyTeam: boolean; players: any[]; positionGrades: Record<string, string>; overallGrade: string; statusScore: number }

const rankedTeams = computed<TeamRanking[]>(() => {
  const gradeValues: Record<string, number> = { 'A+': 100, 'A': 92, 'A-': 85, 'B+': 78, 'B': 70, 'B-': 62, 'C+': 55, 'C': 47, 'C-': 40, 'D+': 32, 'D': 25, 'D-': 18, 'F': 10 }
  const teamMap = new Map<string, any[]>()
  allPlayers.value.forEach(p => { if (p.fantasy_team_key) { if (!teamMap.has(p.fantasy_team_key)) teamMap.set(p.fantasy_team_key, []); teamMap.get(p.fantasy_team_key)!.push(p) } })
  const teams: TeamRanking[] = []
  teamMap.forEach((players, teamKey) => {
    const first = players[0]
    const teamData = teamsData.value.find(t => t.team_key === teamKey)
    const byPos: Record<string, any[]> = {}
    const config = SPORT_POSITION_CONFIG[currentSport.value] || SPORT_POSITION_CONFIG.baseball
    players.forEach(p => {
      // Use all eligible positions so multi-position players show up in each bucket they qualify for
      const eligiblePositions = (p.eligible_positions || [p.position?.split(',')[0]?.trim() || 'Util'])
        .filter((ep: string) => config.positions.includes(ep))
      const positionsToAdd = eligiblePositions.length > 0 ? eligiblePositions : [p.position?.split(',')[0]?.trim() || 'Util']
      positionsToAdd.forEach((pos: string) => { if (!byPos[pos]) byPos[pos] = []; byPos[pos].push(p) })
    })
    Object.values(byPos).forEach(arr => arr.sort((a, b) => (b.ppg || 0) - (a.ppg || 0)))
    const positionGrades: Record<string, string> = {}
    uniquePositions.value.forEach(pos => { positionGrades[pos] = calculateStarterGrade(byPos[pos] || [], getRosterSlotCount(pos)) })
    let totalVal = 0, totalWt = 0
    Object.entries(positionGrades).forEach(([pos, grade]) => { const wt = getRosterSlotCount(pos) || 1; totalVal += (gradeValues[grade] || 50) * wt; totalWt += wt })
    const avgVal = totalWt > 0 ? totalVal / totalWt : 50
    const allTeamPlayers = players // deduplicated original list, not the expanded byPos buckets
    const n = numTeams.value
    const elites = allTeamPlayers.filter(p => p.positionRank && p.positionRank <= n * 0.5).length
    const starters = allTeamPlayers.filter(p => p.positionRank && p.positionRank <= n).length
    const starScore = Math.min(100, elites * 15 + starters * 5)
    const grades = Object.values(positionGrades)
    const depthScore = Math.max(0, 100 - grades.filter(g => g === 'F').length * 20 - grades.filter(g => g.startsWith('D')).length * 8)
    const statusScore = Math.round(avgVal * 0.5 + starScore * 0.25 + depthScore * 0.25)
    teams.push({ teamKey, teamName: teamData?.name || first?.fantasy_team || 'Unknown', managerName: teamData?.manager_name || teamData?.owner_name || first?.manager_name || '', logoUrl: teamData?.team_logos?.[0]?.url || teamData?.logo_url || '', isMyTeam: teamKey === myTeamKey.value, players: allTeamPlayers, positionGrades, overallGrade: getGradeFromValue(avgVal), statusScore })
  })
  
  // Apply sorting
  const gradeOrder: Record<string, number> = { 'A+': 13, 'A': 12, 'A-': 11, 'B+': 10, 'B': 9, 'B-': 8, 'C+': 7, 'C': 6, 'C-': 5, 'D+': 4, 'D': 3, 'D-': 2, 'F': 1 }
  const col = teamsSortColumn.value
  const dir = teamsSortDirection.value
  return teams.sort((a, b) => {
    let aVal: number, bVal: number
    if (col === 'overallGrade') {
      aVal = gradeOrder[a.overallGrade] || 0
      bVal = gradeOrder[b.overallGrade] || 0
    } else if (col === 'statusScore') {
      aVal = a.statusScore
      bVal = b.statusScore
    } else {
      aVal = 0
      bVal = 0
    }
    if (dir === 'asc') return aVal - bVal
    return bVal - aVal
  })
})

function setTeamsSort(column: string) {
  if (teamsSortColumn.value === column) {
    teamsSortDirection.value = teamsSortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    teamsSortColumn.value = column
    teamsSortDirection.value = column === 'rank' ? 'asc' : 'desc'
  }
}

// Gated ranked teams - show top 3 for non-premium users
const gatedRankedTeams = computed(() => {
  if (hasPremiumAccess.value) return rankedTeams.value
  return rankedTeams.value.slice(0, 3)
})

const hiddenTeamsCount = computed(() => {
  if (hasPremiumAccess.value) return 0
  return Math.max(0, rankedTeams.value.length - 3)
})

function getRosterSlotCount(pos: string): number { const r = rosterRequirements.value; if (r[pos] > 0) return r[pos]; const config = SPORT_POSITION_CONFIG[currentSport.value] || SPORT_POSITION_CONFIG.baseball; return config.rosterDefaults[pos] || 1 }
function calculateStarterGrade(players: any[], numStarters: number): string { if (!players.length) return 'F'; const n = numTeams.value || 12; const starters = players.slice(0, Math.max(numStarters, 1)); const valid = starters.filter(p => p.positionRank); if (!valid.length) { const avg = starters.reduce((s, p) => s + (p.ppg || 0), 0) / starters.length; if (avg >= 5) return 'A'; if (avg >= 4) return 'B+'; if (avg >= 3) return 'B'; if (avg >= 2) return 'C+'; return 'C' }; const avgRank = valid.reduce((s, p) => s + p.positionRank, 0) / valid.length; const pct = avgRank / Math.max(n * numStarters, 1); if (pct <= 0.25) return 'A+'; if (pct <= 0.4) return 'A'; if (pct <= 0.55) return 'A-'; if (pct <= 0.7) return 'B+'; if (pct <= 0.85) return 'B'; if (pct <= 1) return 'B-'; if (pct <= 1.2) return 'C+'; if (pct <= 1.4) return 'C'; if (pct <= 1.6) return 'C-'; if (pct <= 1.8) return 'D+'; if (pct <= 2) return 'D'; if (pct <= 2.5) return 'D-'; return 'F' }
function getGradeFromValue(v: number): string { if (v >= 95) return 'A+'; if (v >= 88) return 'A'; if (v >= 82) return 'A-'; if (v >= 75) return 'B+'; if (v >= 68) return 'B'; if (v >= 60) return 'B-'; if (v >= 52) return 'C+'; if (v >= 44) return 'C'; if (v >= 36) return 'C-'; if (v >= 28) return 'D+'; if (v >= 20) return 'D'; if (v >= 12) return 'D-'; return 'F' }
function getTeamPositionPlayers(team: TeamRanking, pos: string): any[] {
  return team.players
    .filter(p => {
      const eligible = p.eligible_positions || [p.position?.split(',')[0]?.trim() || 'Util']
      return eligible.includes(pos)
    })
    .sort((a, b) => (b.ppg || 0) - (a.ppg || 0))
}

function selectAllPositions() { selectedPositions.value = selectedPositions.value.length === positionFilters.value.length ? [] : positionFilters.value.map(p => p.id) }
function togglePositionFilter(pos: string) { const i = selectedPositions.value.indexOf(pos); i >= 0 ? selectedPositions.value.splice(i, 1) : selectedPositions.value.push(pos) }
function isMyPlayer(p: any) { return p.fantasy_team_key === myTeamKey.value }

function formatGameTime(gameTimeString: string | null | undefined): string {
  if (!gameTimeString) return ''
  try {
    const date = new Date(gameTimeString)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  } catch (e) { return '' }
}


function isFreeAgent(p: any) { return !p.fantasy_team }
function handleImageError(e: Event) { (e.target as HTMLImageElement).src = defaultHeadshot }
function getRowClass(p: any) { return isMyPlayer(p) ? 'bg-yellow-500/10 border-l-2 border-yellow-400' : isFreeAgent(p) ? 'bg-cyan-500/5 border-l-2 border-cyan-400' : '' }
function getAvatarRingClass(p: any) { return isMyPlayer(p) ? 'ring-yellow-400' : isFreeAgent(p) ? 'ring-cyan-400' : 'ring-dark-border' }
function getPlayerNameClass(p: any) { return isMyPlayer(p) ? 'text-yellow-400' : isFreeAgent(p) ? 'text-cyan-400' : 'text-dark-text' }
function getStartSitRowClass(p: any) { return isMyPlayer(p) ? 'bg-yellow-500/10 border-l-4 border-yellow-400' : isFreeAgent(p) ? 'bg-cyan-500/5 border-l-4 border-cyan-400' : '' }
function getStartSitAvatarRingClass(p: any) { return isMyPlayer(p) ? 'ring-yellow-400' : isFreeAgent(p) ? 'ring-cyan-400' : 'ring-dark-border' }
function getStartSitPlayerNameClass(p: any) { return isMyPlayer(p) ? 'text-yellow-400' : isFreeAgent(p) ? 'text-cyan-400' : 'text-dark-text' }
function getPositionClass(pos: string) { const p = pos?.split(',')[0]?.trim() || pos; const config = SPORT_POSITION_CONFIG[currentSport.value] || SPORT_POSITION_CONFIG.baseball; return config.positionColors[p] || 'bg-dark-border/50 text-dark-textMuted' }
function getPositionTextClass(pos: string) { const config = SPORT_POSITION_CONFIG[currentSport.value] || SPORT_POSITION_CONFIG.baseball; return config.positionTextColors[pos] || 'text-dark-textMuted' }
function getTeamGradeClass(g: string) { if (g.startsWith('A')) return 'text-green-400'; if (g.startsWith('B')) return 'text-blue-400'; if (g.startsWith('C')) return 'text-yellow-400'; if (g.startsWith('D')) return 'text-orange-400'; return 'text-red-400' }
function getTeamStatusClass(s: number) { if (s >= 70) return 'bg-green-500/30 text-green-400'; if (s >= 55) return 'bg-blue-500/30 text-blue-400'; if (s >= 40) return 'bg-yellow-500/30 text-yellow-400'; return 'bg-red-500/30 text-red-400' }
function getTeamStatusLabel(s: number) { if (s >= 70) return '🏆 Contender'; if (s >= 55) return '⚔️ Competitive'; if (s >= 40) return '🎭 Pretender'; return '🔨 Rebuilding' }
function getPositionGradeClass(g: string) { if (g === 'N/A') return 'text-dark-textMuted'; if (g.startsWith('A')) return 'text-green-400'; if (g.startsWith('B')) return 'text-blue-400'; if (g.startsWith('C')) return 'text-yellow-400'; if (g.startsWith('D')) return 'text-orange-400'; return 'text-red-400' }
function getProjectedPointsClass(proj: number) { if (proj >= 5) return 'text-green-400'; if (proj >= 3) return 'text-lime-400'; if (proj >= 1) return 'text-yellow-400'; return 'text-dark-textMuted' }
function getTierColorClass(t: number) { if (t === 1) return 'text-green-400'; if (t === 2) return 'text-lime-400'; if (t === 3) return 'text-yellow-400'; if (t === 4) return 'text-orange-400'; return 'text-red-400' }
function getVerdictClass(v: string) { if (v === 'Must Start') return 'bg-green-500/30 text-green-400'; if (v === 'Start') return 'bg-lime-500/30 text-lime-400'; if (v === 'Flex') return 'bg-yellow-500/30 text-yellow-400'; if (v === 'Sit') return 'bg-orange-500/30 text-orange-400'; if (v === 'No Game') return 'bg-dark-border/30 text-dark-textMuted'; return 'bg-red-500/30 text-red-400' }

function calculatePositionBaselines() { const byPos: Record<string, any[]> = {}; allPlayers.value.forEach(p => { const pos = p.position?.split(',')[0]?.trim(); if (pos) { if (!byPos[pos]) byPos[pos] = []; byPos[pos].push(p) } }); Object.entries(byPos).forEach(([pos, players]) => { players.sort((a, b) => (b.ppg || 0) - (a.ppg || 0)); positionBaselines.value[pos] = players[Math.min((vorBaselines.value[pos] || 15) - 1, players.length - 1)]?.ppg || 0 }) }

function recalculateRankings() {
  // Calculate position baselines and VOR for each player
  calculatePositionBaselines()
  allPlayers.value.forEach(p => { 
    const pos = p.position?.split(',')[0]?.trim()
    p.vor = (p.ppg || 0) - (positionBaselines.value[pos] || 0) 
  })
  
  // Get enabled factors and calculate normalized weights
  const enabledFactors = rankingFactors.value.filter(f => f.enabled && f.available && f.weight > 0)
  const totalWeight = enabledFactors.reduce((sum, f) => sum + f.weight, 0)
  
  if (enabledFactors.length === 0 || totalWeight === 0) {
    // Fallback to PPG-only ranking
    allPlayers.value.sort((a, b) => (b.ppg || 0) - (a.ppg || 0))
    allPlayers.value.forEach((p, i) => { p.rosRank = i + 1; p.compositeScore = p.ppg || 0 })
  } else {
    // Calculate min/max for each factor to normalize scores
    const factorStats: Record<string, { min: number; max: number; values: Map<string, number> }> = {}
    
    enabledFactors.forEach(factor => {
      let values = new Map<string, number>()
      let min = Infinity, max = -Infinity
      
      allPlayers.value.forEach(p => {
        let val = 0
        switch (factor.id) {
          case 'ppg': val = p.ppg || 0; break
          case 'vor': val = p.vor || 0; break
          case 'seasonPoints': val = p.total_points || 0; break
          case 'gamesPlayed': val = p.games_played || p.gp || 100; break
          case 'recentForm': 
            // Recent form: compare last 7 days to season average (simulated for now)
            val = p.recent_ppg ? (p.recent_ppg / (p.ppg || 1)) * 100 : 100
            break
          case 'last14':
            val = p.last14_ppg ? (p.last14_ppg / (p.ppg || 1)) * 100 : 100
            break
          case 'consistency':
            // Consistency: inverse of standard deviation (lower variance = higher score)
            val = p.std_dev ? Math.max(0, 100 - (p.std_dev * 10)) : 50
            break
          default: val = 0
        }
        values.set(p.player_key, val)
        if (val < min) min = val
        if (val > max) max = val
      })
      
      factorStats[factor.id] = { min, max, values }
    })
    
    // Calculate composite score for each player
    allPlayers.value.forEach(p => {
      let compositeScore = 0
      
      enabledFactors.forEach(factor => {
        const stats = factorStats[factor.id]
        if (!stats) return
        
        const rawValue = stats.values.get(p.player_key) || 0
        const range = stats.max - stats.min
        // Normalize to 0-100 scale
        const normalizedValue = range > 0 ? ((rawValue - stats.min) / range) * 100 : 50
        // Apply weight (normalized)
        const weightedValue = normalizedValue * (factor.weight / totalWeight)
        compositeScore += weightedValue
      })
      
      p.compositeScore = compositeScore
    })
    
    // Sort by composite score
    allPlayers.value.sort((a, b) => (b.compositeScore || 0) - (a.compositeScore || 0))
    allPlayers.value.forEach((p, i) => p.rosRank = i + 1)
  }
  
  // Calculate position ranks
  const posCounts: Record<string, number> = {}
  allPlayers.value.forEach(p => { 
    const pos = p.position?.split(',')[0]?.trim() || 'X'
    posCounts[pos] = (posCounts[pos] || 0) + 1
    p.positionRank = posCounts[pos] 
  })
  
  // Calculate tiers using gap-based algorithm
  // Players with similar composite scores are grouped together
  calculateTiers()
}

function calculateTiers() {
  if (allPlayers.value.length === 0) return
  
  // Sort by compositeScore (same as display default) to ensure tier order matches
  allPlayers.value.sort((a, b) => (b.compositeScore || 0) - (a.compositeScore || 0))
  
  // Update rosRank based on this sort
  allPlayers.value.forEach((p, i) => p.rosRank = i + 1)
  
  // Calculate standard deviation of scores for threshold
  const scores = allPlayers.value.map(p => p.compositeScore || 0)
  if (scores.length === 0) return
  
  const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length
  const stdDev = Math.sqrt(variance)
  
  // Tier threshold: use 1/4 of standard deviation for tight grouping
  // Players within this score range are considered interchangeable
  const tierThreshold = Math.max(stdDev / 4, 1.0) // Minimum 1 point difference
  
  // Assign tiers based on score clustering
  let currentTier = 1
  let tierStartScore = scores[0] || 100
  
  allPlayers.value.forEach((p, i) => {
    const score = p.compositeScore || 0
    
    // If score dropped more than threshold from tier start, begin new tier
    if (tierStartScore - score > tierThreshold) {
      currentTier++
      tierStartScore = score
    }
    
    p.tier = currentTier
  })
  
  // Store tier info for any descriptions needed
  calculateTierInfo()
}

function calculateTierInfo() {
  // Calculate tier summaries (avg score, player count per tier)
  const tierData: Record<number, { count: number; avgScore: number; minScore: number; maxScore: number }> = {}
  
  allPlayers.value.forEach(p => {
    const tier = p.tier || 1
    if (!tierData[tier]) {
      tierData[tier] = { count: 0, avgScore: 0, minScore: Infinity, maxScore: -Infinity }
    }
    tierData[tier].count++
    tierData[tier].avgScore += p.compositeScore || 0
    tierData[tier].minScore = Math.min(tierData[tier].minScore, p.compositeScore || 0)
    tierData[tier].maxScore = Math.max(tierData[tier].maxScore, p.compositeScore || 0)
  })
  
  // Finalize averages
  Object.keys(tierData).forEach(tier => {
    tierData[parseInt(tier)].avgScore /= tierData[parseInt(tier)].count
  })
  
  // Store for use in getTierDescription
  tierInfo.value = tierData
}

const tierInfo = ref<Record<number, { count: number; avgScore: number; minScore: number; maxScore: number }>>({})

function shouldShowTierDivider(player: any, idx: number): boolean {
  // Only show tier dividers when sorted by ranking columns (rosRank, compositeScore, tier)
  // Otherwise tiers would appear out of order
  const validSortColumns = ['rosRank', 'compositeScore', 'tier']
  if (!validSortColumns.includes(rosSortColumn.value)) {
    return false
  }
  
  // Always show tier 1 divider at the start
  if (idx === 0) return true
  
  // Show divider when tier changes from previous player
  const prevPlayer = gatedFilteredPlayers.value[idx - 1]
  if (!prevPlayer) return false
  
  // Only show if this tier is greater than previous (ensures ascending order)
  return player.tier > prevPlayer.tier
}

function getTierDescription(tier: number): string {
  const info = tierInfo.value[tier]
  if (!info) return ''
  
  const count = info.count
  
  // Tier labels based on value and interchangeability
  const tierLabels: Record<number, string> = {
    1: 'Elite - Untouchable',
    2: 'Premium Starters',
    3: 'Strong Starters', 
    4: 'Solid Starters',
    5: 'Reliable Options',
    6: 'Fringe Starters',
    7: 'Strong Bench',
    8: 'Bench Depth',
    9: 'Streaming Options',
    10: 'Deep League Value',
  }
  
  const label = tier <= 10 ? tierLabels[tier] : 'Replacement Level'
  return `${label} • ${count} player${count !== 1 ? 's' : ''}`
}

async function loadGamesForPoints() {
  try {
    const targetDate = selectedDate.value
    const tomorrow = new Date(targetDate.getTime() + 86400000)
    const [todayGames, tmrwGames] = await Promise.all([
      liveGamesService.getGamesByDate(currentSport.value, targetDate),
      liveGamesService.getGamesByDate(currentSport.value, tomorrow)
    ])
    todaysGames.value = todayGames
    tomorrowsGames.value = tmrwGames
  } catch (e) {
    console.warn('[PointsView] Could not load live games:', e)
  }
}

async function loadProjections() {
  isLoading.value = true
  loadingMessage.value = 'Loading Player Projections'
  loadingProgress.value = { currentStep: 'Connecting to Yahoo...', currentStepName: 'Initializing', completedSteps: 0, totalSteps: 5 }
  
  try {
    const leagueKey = effectiveLeagueKey.value
    if (!leagueKey || !authStore.user?.id) { isLoading.value = false; return }
    await yahooService.initialize(authStore.user.id)
    
    loadingProgress.value = { ...loadingProgress.value, currentStep: 'Loading league settings...', currentStepName: 'Settings', completedSteps: 1 }
    try { const settings = await yahooService.getLeagueSettings(leagueKey); rosterPositions.value = settings?.roster_positions || [] } catch (e) { console.log('Could not load roster settings') }
    
    // Load teams first (like Category page does)
    loadingProgress.value = { ...loadingProgress.value, currentStep: 'Loading teams...', currentStepName: 'Teams', completedSteps: 2 }
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
    
    loadingProgress.value = { ...loadingProgress.value, currentStep: 'Loading rostered players...', currentStepName: 'Rosters', completedSteps: 3 }
    const rostered = await yahooService.getAllRosteredPlayers(leagueKey)
    
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
    
    loadingProgress.value = { ...loadingProgress.value, currentStep: 'Loading free agents...', currentStepName: 'Free Agents', completedSteps: 4 }
    const fa = await yahooService.getTopFreeAgents(leagueKey, 100)
    const combined = [...rostered, ...fa]
    combined.forEach(p => {
      p.ppg = p.total_points > 0 ? p.total_points / 25 : 0
      // Parse all eligible positions from comma-separated position string
      if (!p.eligible_positions) {
        p.eligible_positions = (p.position || '').split(',').map((s: string) => s.trim()).filter(Boolean)
      }
    })
    allPlayers.value = combined
    
    // Debug logging
    console.log('=== Trade Analyzer Debug ===')
    console.log('myTeamKey:', myTeamKey.value)
    console.log('teamsData count:', teamsData.value.length)
    const myPlayers = allPlayers.value.filter(p => p.fantasy_team_key === myTeamKey.value)
    console.log('Players on my team:', myPlayers.length)
    
    loadingProgress.value = { ...loadingProgress.value, currentStep: 'Calculating rankings...', currentStepName: 'Complete', completedSteps: 5 }
    recalculateRankings()
  } catch (e) { console.error('Error:', e); loadingMessage.value = 'Error loading data' }
  finally { isLoading.value = false }
}

// Sleeper version of loadProjections
async function loadSleeperProjections() {
  isLoading.value = true
  loadingMessage.value = 'Loading Sleeper Data'
  loadingProgress.value = { currentStep: 'Connecting to Sleeper...', currentStepName: 'Initializing', completedSteps: 0, totalSteps: 6 }

  try {
    const leagueId = leagueStore.activeLeagueId?.replace('sleeper_', '') || leagueStore.currentLeague?.league_id || ''
    if (!leagueId) { isLoading.value = false; return }

    // Load league info to get sport + roster positions
    loadingProgress.value = { ...loadingProgress.value, currentStep: 'Loading league settings...', currentStepName: 'Settings', completedSteps: 1 }
    const league = await sleeperService.getLeague(leagueId)
    const sport = (league as any).sport || 'nfl'
    const mappedSport = sport === 'nba' ? 'basketball' : sport === 'nfl' ? 'football' : sport === 'mlb' ? 'baseball' : sport === 'nhl' ? 'hockey' : 'football'

    // Build rosterPositions from league.roster_positions
    if (league.roster_positions?.length) {
      const nonRoster = new Set(['BN', 'IL', 'IR'])
      rosterPositions.value = league.roster_positions
        .filter((p: string) => !nonRoster.has(p))
        .map((p: string) => ({ position_type: p, position: p }))
    }

    // Load users + rosters in parallel
    loadingProgress.value = { ...loadingProgress.value, currentStep: 'Loading teams...', currentStepName: 'Teams', completedSteps: 2 }
    const [users, rosters] = await Promise.all([
      sleeperService.getLeagueUsers(leagueId),
      sleeperService.getLeagueRosters(leagueId)
    ])

    const userMap = new Map(users.map((u: any) => [u.user_id, u]))
    // Use the Sleeper-specific currentUserId from leagueStore (set when Sleeper username was entered)
    // Fall back to localStorage where it's persisted, then Supabase auth user ID as last resort
    const myUserId = leagueStore.currentUserId || localStorage.getItem('ufd_current_user_id') || leagueStore.currentLeague?.metadata?.user_id || authStore.user?.id
    console.log('[Sleeper Projections] Resolving myUserId:', myUserId, '(leagueStore.currentUserId:', leagueStore.currentUserId, ')')
    const myRoster = rosters.find((r: any) => r.owner_id === myUserId)
    myTeamKey.value = myRoster ? `sleeper_${leagueId}_${myRoster.roster_id}` : null
    console.log('[Sleeper Projections] myRoster:', myRoster?.roster_id, '→ myTeamKey:', myTeamKey.value)

    teamsData.value = rosters.map((r: any) => {
      const user = userMap.get(r.owner_id) as any
      return {
        team_key: `sleeper_${leagueId}_${r.roster_id}`,
        team_id: String(r.roster_id),
        name: user?.metadata?.team_name || user?.display_name || `Team ${r.roster_id}`,
        owner_name: user?.display_name || user?.username || '',
        manager_name: user?.display_name || user?.username || '',
        logo_url: user?.avatar ? `https://sleepercdn.com/avatars/thumbs/${user.avatar}` : '',
        is_my_team: !!(myUserId && r.owner_id === myUserId),
        wins: r.settings?.wins || 0,
        losses: r.settings?.losses || 0,
        ties: r.settings?.ties || 0
      }
    })

    // Fetch all completed weeks of matchup data to get per-player actual fantasy points
    // This is the most accurate approach - uses the league's own scoring settings
    loadingProgress.value = { ...loadingProgress.value, currentStep: 'Loading season stats...', currentStepName: 'Stats', completedSteps: 3 }
    const currentWeek = Math.max(1, league.settings?.leg || league.settings?.week || 1)
    const weeksToFetch = Math.min(currentWeek, 25)

    const weekPromises: Promise<any[]>[] = []
    for (let w = 1; w <= weeksToFetch; w++) {
      weekPromises.push(sleeperService.getMatchups(leagueId, w).catch(() => []))
    }
    const allWeekMatchups = await Promise.all(weekPromises)

    // Build per-player points map: playerId -> { totalPoints, weeksWithGame }
    const playerPointsMap = new Map<string, { total: number; weeks: number }>()
    for (const weekMatchups of allWeekMatchups) {
      for (const matchup of weekMatchups) {
        if (!matchup.players_points) continue
        for (const [playerId, pts] of Object.entries(matchup.players_points as Record<string, number>)) {
          if (!playerPointsMap.has(playerId)) playerPointsMap.set(playerId, { total: 0, weeks: 0 })
          const entry = playerPointsMap.get(playerId)!
          if ((pts as number) > 0) { // only count weeks the player actually scored
            entry.total += pts as number
            entry.weeks += 1
          }
        }
      }
    }

    // Load player database for names/positions/headshots
    loadingProgress.value = { ...loadingProgress.value, currentStep: 'Loading player database...', currentStepName: 'Players', completedSteps: 4 }
    const allPlayerData = await sleeperService.getPlayersBySport(mappedSport)

    // Build rostered players with real PPG from matchup history
    loadingProgress.value = { ...loadingProgress.value, currentStep: 'Building rosters...', currentStepName: 'Rosters', completedSteps: 5 }
    const allRosteredPlayers: any[] = []
    const freeAgentPlayers: any[] = []
    const rosteredIds = new Set<string>()

    for (const roster of rosters) {
      const team = teamsData.value.find((t: any) => t.team_id === String(roster.roster_id))
      const teamKey = team?.team_key || null
      const teamName = team?.name || `Team ${roster.roster_id}`

      for (const playerId of (roster.players || [])) {
        rosteredIds.add(String(playerId))
        const p = allPlayerData[String(playerId)]
        if (!p) continue
        const pointsEntry = playerPointsMap.get(String(playerId))
        const totalPts = pointsEntry?.total || 0
        const weeksPlayed = Math.max(pointsEntry?.weeks || 1, 1)
        const ppg = totalPts / weeksPlayed
        allRosteredPlayers.push({
          player_key: `sleeper_${playerId}`,
          player_id: String(playerId),
          full_name: p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown',
          position: p.fantasy_positions?.[0] || p.position || 'UTIL',
          eligible_positions: p.fantasy_positions || [p.position || 'UTIL'],
          mlb_team: p.team || 'FA',
          headshot: `https://sleepercdn.com/content/${sport}/players/thumb/${playerId}.jpg`,
          fantasy_team: teamName,
          fantasy_team_key: teamKey,
          stats: {},
          total_points: totalPts,
          ppg,
          games_played: weeksPlayed
        })
      }
    }

    // Free agents: players NOT on a roster who actually scored this season
    for (const [playerId, pointsEntry] of playerPointsMap.entries()) {
      if (rosteredIds.has(playerId)) continue
      const p = allPlayerData[playerId]
      if (!p) continue
      const weeksPlayed = Math.max(pointsEntry.weeks, 1)
      const ppg = pointsEntry.total / weeksPlayed
      if (ppg <= 0) continue
      freeAgentPlayers.push({
        player_key: `sleeper_${playerId}`,
        player_id: playerId,
        full_name: p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
        position: p.fantasy_positions?.[0] || p.position || 'UTIL',
        eligible_positions: p.fantasy_positions || [p.position || 'UTIL'],
        mlb_team: p.team || 'FA',
        headshot: `https://sleepercdn.com/content/${sport}/players/thumb/${playerId}.jpg`,
        fantasy_team: null,
        fantasy_team_key: null,
        stats: {},
        total_points: pointsEntry.total,
        ppg,
        games_played: weeksPlayed
      })
    }

    freeAgentPlayers.sort((a, b) => (b.ppg || 0) - (a.ppg || 0))
    const combined = [...allRosteredPlayers, ...freeAgentPlayers.slice(0, 150)]
    allPlayers.value = combined

    loadingProgress.value = { ...loadingProgress.value, currentStep: 'Calculating rankings...', currentStepName: 'Complete', completedSteps: 6 }
    recalculateRankings()
    console.log('[Sleeper Projections] Loaded', allRosteredPlayers.length, 'rostered +', freeAgentPlayers.length, 'FAs | Weeks:', weeksToFetch, '| Sport:', mappedSport)
  } catch (e) {
    console.error('[Sleeper Projections] Error:', e)
    loadingMessage.value = 'Error loading Sleeper data'
  } finally {
    isLoading.value = false
  }
}

// ESPN Helper Functions
function parseEspnLeagueKey(leagueKey: string): { leagueId: string; season: string; sport: string } {
  // Format: espn_baseball_1227422768_2025
  const parts = leagueKey.replace('espn_', '').split('_')
  return {
    sport: parts[0] || 'baseball',
    leagueId: parts[1] || '',
    season: parts[2] || new Date().getFullYear().toString()
  }
}

function getEspnHeadshotUrl(playerId: number, sport: string): string {
  if (sport === 'baseball') {
    return `https://a.espncdn.com/combiner/i?img=/i/headshots/mlb/players/full/${playerId}.png&w=96&h=70&cb=1`
  } else if (sport === 'hockey') {
    return `https://a.espncdn.com/combiner/i?img=/i/headshots/nhl/players/full/${playerId}.png&w=96&h=70&cb=1`
  } else if (sport === 'basketball') {
    return `https://a.espncdn.com/combiner/i?img=/i/headshots/nba/players/full/${playerId}.png&w=96&h=70&cb=1`
  } else if (sport === 'football') {
    return `https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/${playerId}.png&w=96&h=70&cb=1`
  }
  return `https://a.espncdn.com/combiner/i?img=/i/headshots/nophoto.png&w=96&h=70`
}

function getEspnPositionAbbrev(positionId: number): string {
  const posMap: Record<number, string> = {
    0: 'C', 1: '1B', 2: '2B', 3: '3B', 4: 'SS', 5: 'OF', 6: 'OF', 7: 'OF',
    8: 'DH', 9: 'UTIL', 10: 'SP', 11: 'RP', 12: 'P', 13: 'BN', 14: 'IL'
  }
  return posMap[positionId] || 'UTIL'
}

function getEspnTeamAbbrev(teamId: number): string {
  const teamMap: Record<number, string> = {
    1: 'BAL', 2: 'BOS', 3: 'LAA', 4: 'CWS', 5: 'CLE', 6: 'DET', 7: 'KC', 8: 'MIL',
    9: 'MIN', 10: 'NYY', 11: 'OAK', 12: 'SEA', 13: 'TEX', 14: 'TOR', 15: 'ATL',
    16: 'CHC', 17: 'CIN', 18: 'HOU', 19: 'LAD', 20: 'WSH', 21: 'NYM', 22: 'PHI',
    23: 'PIT', 24: 'STL', 25: 'SD', 26: 'SF', 27: 'COL', 28: 'MIA', 29: 'ARI', 30: 'TB'
  }
  return teamMap[teamId] || 'FA'
}

// ESPN version of loadProjections
async function loadEspnProjections() {
  console.log('[ESPN Points Projections] ========== STARTING ==========')
  isLoading.value = true
  loadingMessage.value = 'Loading ESPN Projections'
  loadingProgress.value = { currentStep: 'Connecting to ESPN...', currentStepName: 'Initializing', completedSteps: 0, totalSteps: 6 }
  
  try {
    const leagueKey = leagueStore.activeLeagueId
    console.log('[ESPN Points Projections] League key:', leagueKey)
    if (!leagueKey) { 
      loadingMessage.value = 'No league selected'
      isLoading.value = false
      return 
    }
    
    const { leagueId, season, sport } = parseEspnLeagueKey(leagueKey)
    console.log('[ESPN Points Projections] Parsed - leagueId:', leagueId, 'season:', season, 'sport:', sport)
    
    // Load ESPN credentials
    const credentials = platformsStore.getEspnCredentials()
    if (credentials) {
      console.log('[ESPN Points Projections] Credentials found, applying...')
      espnService.setCredentials(credentials.espn_s2, credentials.swid)
    } else {
      console.log('[ESPN Points Projections] No credentials - my team highlighting may not work')
    }
    
    loadingProgress.value = { ...loadingProgress.value, currentStep: 'Loading league settings...', currentStepName: 'Settings', completedSteps: 1 }
    
    // Load league settings including roster configuration
    let maxRosterSizeFromSettings = 25 // Default
    let activeRosterSize = 25 // Excludes IL/IR slots
    try {
      const league = await espnService.getLeague(sport as any, leagueId, season)
      if (league?.settings?.rosterSettings?.lineupSlotCounts) {
        // Sum up all lineup slot counts to get total roster size
        const slotCounts = league.settings.rosterSettings.lineupSlotCounts
        maxRosterSizeFromSettings = Object.values(slotCounts).reduce((sum: number, count: any) => sum + (count || 0), 0)
        
        // Calculate active roster size (exclude IL/IR/IL+/NA slots)
        // Baseball: 17=IL, 18=IL+, 19=NA
        // Football/Other: 21=IR
        const excludedSlotIds = [17, 18, 19, 21]
        activeRosterSize = Object.entries(slotCounts).reduce((sum: number, [slotId, count]: [string, any]) => {
          if (excludedSlotIds.includes(parseInt(slotId))) {
            console.log(`[ESPN] Excluding slot ${slotId} (${count} slots) from active roster`)
            return sum
          }
          return sum + (count || 0)
        }, 0)
        
        // Build rosterPositions from ESPN lineup slot maps so rosterRequirements works correctly
        // ESPN lineup slot IDs mapped to position abbreviations per sport
        const espnSlotToPosition: Record<string, Record<number, string>> = {
          basketball: { 0: 'PG', 1: 'SG', 2: 'SF', 3: 'PF', 4: 'C', 5: 'G', 6: 'F', 11: 'Util', 12: 'BN', 13: 'IL' },
          football: { 0: 'QB', 2: 'RB', 4: 'WR', 6: 'TE', 16: 'DEF', 17: 'K', 23: 'Flex', 20: 'BN', 21: 'IR' },
          baseball: { 0: 'C', 1: '1B', 2: '2B', 3: '3B', 4: 'SS', 5: 'OF', 6: 'OF', 7: 'OF', 12: 'Util', 13: 'BN', 14: 'SP', 15: 'RP', 17: 'IL', 18: 'IL', 19: 'NA' },
          hockey: { 0: 'C', 1: 'LW', 2: 'RW', 3: 'D', 4: 'G', 5: 'Util', 8: 'BN', 13: 'IR' }
        }
        const slotMap = espnSlotToPosition[sport] || {}
        const nonRosterSlots = new Set(['BN', 'IL', 'IR', 'NA'])
        const builtPositions: any[] = []
        Object.entries(slotCounts).forEach(([slotId, count]: [string, any]) => {
          const pos = slotMap[parseInt(slotId)]
          if (pos && !nonRosterSlots.has(pos)) {
            for (let i = 0; i < (count || 0); i++) { builtPositions.push({ position_type: pos, position: pos }) }
          }
        })
        if (builtPositions.length > 0) {
          rosterPositions.value = builtPositions
          console.log('[ESPN Points Projections] Built rosterPositions:', builtPositions.map(p => p.position).join(', '))
        }
        
        console.log('[ESPN Points Projections] Total roster size:', maxRosterSizeFromSettings, 'Active (excl IL/IR):', activeRosterSize, 'slots:', slotCounts)
      }
      espnMaxRosterSize.value = activeRosterSize // Use active roster size, not total
    } catch (e) {
      console.log('[ESPN Points Projections] Could not load league settings:', e)
    }
    
    // Load scoring settings to get point values
    let scoringMap: Record<number, number> = {}
    try {
      const scoringSettings = await espnService.getScoringSettings(sport as any, leagueId, season)
      if (scoringSettings?.scoringItems) {
        for (const item of scoringSettings.scoringItems) {
          scoringMap[item.statId] = item.pointsOverride ?? item.points ?? 0
        }
        console.log('[ESPN Points Projections] Scoring map loaded:', Object.keys(scoringMap).length, 'stats')
      }
    } catch (e) {
      console.log('[ESPN Points Projections] Could not load scoring settings:', e)
    }
    
    loadingProgress.value = { ...loadingProgress.value, currentStep: 'Loading teams...', currentStepName: 'Teams', completedSteps: 2 }
    
    // Load authoritative proTeamId -> abbreviation map from ESPN's settings API
    // ESPN uses non-sequential sport-specific IDs — only the API itself knows the correct mapping
    let proTeamMap: Record<number, string> = {}
    try {
      proTeamMap = await espnService.getProTeamMap(sport as any, leagueId, season)
      console.log('[ESPN Points Projections] proTeamMap loaded:', Object.keys(proTeamMap).length, 'teams')
    } catch (e) {
      console.log('[ESPN Points Projections] Could not load proTeamMap:', e)
    }
    
    // Load teams with rosters
    const teams = await espnService.getTeamsWithRosters(sport as any, leagueId, season)
    
    // Get my team ID
    let myTeamId: number | null = null
    try {
      const myTeam = await espnService.getMyTeam(sport as any, leagueId, season)
      if (myTeam) {
        myTeamId = myTeam.id
        console.log('[ESPN Points Projections] Found my team:', myTeam.name, 'ID:', myTeamId)
      }
    } catch (e) {
      console.log('[ESPN Points Projections] Could not get my team:', e)
    }
    
    // Transform teams
    teamsData.value = teams.map((team: any) => {
      let logoUrl = team.logo
      if (!logoUrl) {
        logoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(team.name)}&background=random&color=fff&size=64`
      }
      
      return {
        team_key: `espn_${leagueId}_${season}_${team.id}`,
        team_id: team.id.toString(),
        name: team.name,
        logo: logoUrl,
        logo_url: logoUrl,
        is_my_team: myTeamId !== null && team.id === myTeamId,
        wins: team.wins || 0,
        losses: team.losses || 0,
        ties: team.ties || 0
      }
    })
    
    console.log('[ESPN Points Projections] Teams loaded:', teamsData.value.length)
    
    const myTeam = teamsData.value.find((t: any) => t.is_my_team)
    myTeamKey.value = myTeam?.team_key || null
    console.log('[ESPN Points Projections] My team key:', myTeamKey.value)
    
    loadingProgress.value = { ...loadingProgress.value, currentStep: 'Loading rosters...', currentStepName: 'Rosters', completedSteps: 3 }
    
    // Extract all rostered players
    const allRosteredPlayers: any[] = []
    const playerIdList: number[] = []
    
    for (const team of teams) {
      const roster = team.roster || []
      for (const entry of roster) {
        const playerId = entry.playerId || entry.id
        const playerName = entry.fullName || entry.name || 'Unknown'
        
        if (playerId) playerIdList.push(playerId)
        
        // Use proTeamMap (from ESPN's own API) for accurate team abbreviations
        const espnTeamAbbr = (entry.proTeamId && proTeamMap[entry.proTeamId])
          || getEspnTeamAbbrev(entry.proTeamId)
        
        allRosteredPlayers.push({
          player_key: `espn_player_${playerId}`,
          player_id: playerId,
          full_name: playerName,
          position: entry.position || getEspnPositionAbbrev(entry.positionId || entry.defaultPositionId),
          mlb_team: sport === 'baseball' ? espnTeamAbbr : '',
          nhl_team: sport === 'hockey' ? espnTeamAbbr : '',
          nba_team: sport === 'basketball' ? espnTeamAbbr : '',
          headshot: getEspnHeadshotUrl(playerId, sport),
          fantasy_team: team.name,
          fantasy_team_key: `espn_${leagueId}_${season}_${team.id}`,
          stats: entry.stats || {},
          total_points: entry.actualPoints || 0,
          ppg: 0  // Will calculate below
        })
      }
    }
    
    console.log('[ESPN Points Projections] Rostered players:', allRosteredPlayers.length)
    
    loadingProgress.value = { ...loadingProgress.value, currentStep: 'Loading player stats...', currentStepName: 'Stats', completedSteps: 4 }
    
    // Fetch player stats
    if (playerIdList.length > 0) {
      try {
        const statsMap = await espnService.getPlayersWithStats(sport as any, leagueId, season, playerIdList)
        console.log('[ESPN Points Projections] Got stats for', statsMap.size, 'players')
        
        for (const player of allRosteredPlayers) {
          const playerStats = statsMap.get(player.player_id)
          if (playerStats?.stats) {
            player.stats = playerStats.stats
            // Calculate total points from stats using scoring map
            let totalPts = 0
            for (const [statId, value] of Object.entries(playerStats.stats)) {
              const pts = scoringMap[parseInt(statId)] || 0
              totalPts += pts * (value as number)
            }
            if (totalPts > 0) {
              player.total_points = totalPts
            }
          }
          // Estimate PPG (points per game) - assume ~100 games played
          player.ppg = player.total_points > 0 ? player.total_points / 100 : 0
        }
      } catch (e) {
        console.error('[ESPN Points Projections] Error fetching stats:', e)
      }
    }
    
    loadingProgress.value = { ...loadingProgress.value, currentStep: 'Loading free agents...', currentStepName: 'Free Agents', completedSteps: 5 }
    
    // Fetch free agents
    const freeAgentPlayers: any[] = []
    try {
      const freeAgents = await espnService.getFreeAgents(sport as any, leagueId, parseInt(season), 100)
      console.log('[ESPN Points Projections] Got', freeAgents.length, 'free agents')
      
      for (const fa of freeAgents) {
        // Calculate total points using scoring map
        let totalPts = fa.actualPoints || 0
        if (fa.stats && Object.keys(scoringMap).length > 0) {
          let calculatedPts = 0
          for (const [statId, value] of Object.entries(fa.stats)) {
            const pts = scoringMap[parseInt(statId)] || 0
            calculatedPts += pts * (value as number)
          }
          if (calculatedPts > 0) totalPts = calculatedPts
        }
        
        freeAgentPlayers.push({
          player_key: `espn_player_${fa.id}`,
          player_id: fa.id,
          full_name: fa.fullName || 'Unknown',
          position: fa.position || getEspnPositionAbbrev(fa.positionId || 0),
          mlb_team: sport === 'baseball' ? (proTeamMap[fa.proTeamId] || fa.proTeam || getEspnTeamAbbrev(fa.proTeamId || 0)) : '',
          nhl_team: sport === 'hockey' ? (proTeamMap[fa.proTeamId] || fa.proTeam || getEspnTeamAbbrev(fa.proTeamId || 0)) : '',
          nba_team: sport === 'basketball' ? (proTeamMap[fa.proTeamId] || fa.proTeam || getEspnTeamAbbrev(fa.proTeamId || 0)) : '',
          headshot: getEspnHeadshotUrl(fa.id, sport),
          fantasy_team: null,  // Free agent - no team
          fantasy_team_key: null,
          stats: fa.stats || {},
          total_points: totalPts,
          ppg: totalPts > 0 ? totalPts / 100 : 0,
          ownership_pct: fa.percentOwned || 0
        })
      }
      console.log('[ESPN Points Projections] Processed', freeAgentPlayers.length, 'free agents')
    } catch (e) {
      console.error('[ESPN Points Projections] Error fetching free agents:', e)
    }
    
    // Combine rostered players and free agents
    // Set eligible_positions for multi-position ESPN players
    ;[...allRosteredPlayers, ...freeAgentPlayers].forEach(p => {
      if (!p.eligible_positions) {
        p.eligible_positions = (p.position || '').split(',').map((s: string) => s.trim()).filter(Boolean)
      }
    })
    allPlayers.value = [...allRosteredPlayers, ...freeAgentPlayers]
    console.log('[ESPN Points Projections] Total players:', allPlayers.value.length, '(rostered:', allRosteredPlayers.length, ', FA:', freeAgentPlayers.length, ')')
    
    loadingProgress.value = { ...loadingProgress.value, currentStep: 'Calculating rankings...', currentStepName: 'Complete', completedSteps: 6 }
    
    recalculateRankings()
    console.log('[ESPN Points Projections] Complete!')
    
  } catch (e) {
    console.error('[ESPN Points Projections] Error:', e)
    loadingMessage.value = 'Error loading ESPN data'
  } finally {
    isLoading.value = false
  }
}

watch(() => leagueStore.activeLeagueId, (id) => { 
  console.log('[PointsProjections] Watch triggered - id:', id, 'platform:', leagueStore.activePlatform)
  if (id) {
    if (isEspn.value) {
      loadEspnProjections()
    } else if (leagueStore.activePlatform === 'yahoo') {
      loadProjections()
    } else if (leagueStore.activePlatform === 'sleeper') {
      loadSleeperProjections()
    } else {
      // For other platforms, stop loading
      console.log('[PointsProjections] Unsupported platform, stopping loading')
      isLoading.value = false
    }
  } else {
    isLoading.value = false
  }
}, { immediate: true })

// Watch for currentLeague changes (happens when fallback to previous season occurs)
watch(() => leagueStore.currentLeague?.league_id, (newKey, oldKey) => {
  if (newKey && newKey !== oldKey) {
    console.log(`Projections: League changed from ${oldKey} to ${newKey}, reloading...`)
    if (isEspn.value) {
      loadEspnProjections()
    } else if (leagueStore.activePlatform === 'yahoo') {
      loadProjections()
    } else if (leagueStore.activePlatform === 'sleeper') {
      loadSleeperProjections()
    }
  }
})

// Also watch for platform changes (in case platform is set after league ID)
watch(() => leagueStore.activePlatform, (platform) => {
  console.log('[PointsProjections] Platform changed to:', platform)
  if (platform === 'espn' && leagueStore.activeLeagueId) {
    loadEspnProjections()
  } else if (platform === 'yahoo' && leagueStore.activeLeagueId) {
    loadProjections()
  } else if (platform === 'sleeper' && leagueStore.activeLeagueId) {
    loadSleeperProjections()
  }
})

// When sport changes, reset position filters and start/sit position to sport defaults
watch(currentSport, (sport) => {
  const config = SPORT_POSITION_CONFIG[sport] || SPORT_POSITION_CONFIG.baseball
  selectedPositions.value = [...config.positions]
  selectedStartSitPosition.value = config.positions[0] || ''
}, { immediate: true })

onMounted(() => { 
  console.log('[PointsProjections] onMounted - platform:', leagueStore.activePlatform, 'leagueId:', effectiveLeagueKey.value, 'isEspn:', isEspn.value)
  
  // Load saved ranking factors
  loadRankingFactorsFromStorage()
  
  // Load live game schedule for real game times and live status
  loadGamesForPoints()
  
  if (effectiveLeagueKey.value) {
    if (isEspn.value) {
      loadEspnProjections()
    } else if (leagueStore.activePlatform === 'yahoo') {
      loadProjections()
    } else if (leagueStore.activePlatform === 'sleeper') {
      loadSleeperProjections()
    } else {
      console.log('[PointsProjections] Unsupported platform in onMounted')
      isLoading.value = false
    }
  } else {
    isLoading.value = false
  }
  
  // Fallback: if still loading after 30 seconds, stop to prevent infinite loading
  setTimeout(() => {
    if (isLoading.value) {
      console.warn('[PointsProjections] Loading timeout - forcing stop')
      isLoading.value = false
      loadingMessage.value = 'Loading timed out'
    }
  }, 30000)
})

// Trade Analyzer Functions
function addGivePlayer(player: any) {
  if (!tradeGivePlayers.value.some(p => p.player_key === player.player_key)) {
    tradeGivePlayers.value.push(player)
  }
  tradeGiveSearch.value = ''
  tradeAnalysis.value = null
}

function removeGivePlayer(player: any) {
  tradeGivePlayers.value = tradeGivePlayers.value.filter(p => p.player_key !== player.player_key)
  tradeAnalysis.value = null
}

function addGetPlayer(player: any) {
  if (!tradeGetPlayers.value.some(p => p.player_key === player.player_key)) {
    tradeGetPlayers.value.push(player)
  }
  tradeGetSearch.value = ''
  tradeAnalysis.value = null
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

function getTradeGradeBackground(grade: string): string {
  if (grade.startsWith('A')) return 'bg-gradient-to-br from-green-600/30 to-green-800/10'
  if (grade.startsWith('B')) return 'bg-gradient-to-br from-blue-600/30 to-blue-800/10'
  if (grade.startsWith('C')) return 'bg-gradient-to-br from-yellow-600/30 to-yellow-800/10'
  if (grade.startsWith('D')) return 'bg-gradient-to-br from-orange-600/30 to-orange-800/10'
  return 'bg-gradient-to-br from-red-600/30 to-red-800/10'
}

function getTradeGradeColor(grade: string): string {
  if (grade.startsWith('A')) return 'text-green-400'
  if (grade.startsWith('B')) return 'text-blue-400'
  if (grade.startsWith('C')) return 'text-yellow-400'
  if (grade.startsWith('D')) return 'text-orange-400'
  return 'text-red-400'
}

function calculateTradeGrade(valueDiff: number, ppgDiff: number, vorDiff: number): { grade: string; headline: string; summary: string } {
  // Weighted score: 40% total points, 30% PPG, 30% VOR
  const normalizedValueDiff = valueDiff / 50 // Normalize to ~-2 to +2 range
  const normalizedPpgDiff = ppgDiff / 2
  const normalizedVorDiff = vorDiff / 30
  
  const compositeScore = (normalizedValueDiff * 0.4) + (normalizedPpgDiff * 0.3) + (normalizedVorDiff * 0.3)
  
  let grade: string
  let headline: string
  let summary: string
  
  if (compositeScore >= 1.5) {
    grade = 'A+'
    headline = 'Smash Accept! 🔥'
    summary = 'This trade significantly improves your team. The value you\'re getting is exceptional.'
  } else if (compositeScore >= 1.0) {
    grade = 'A'
    headline = 'Great Trade!'
    summary = 'You\'re coming out ahead in this deal with a nice boost to your lineup.'
  } else if (compositeScore >= 0.5) {
    grade = 'B+'
    headline = 'Solid Win'
    summary = 'A favorable trade that adds good value to your roster.'
  } else if (compositeScore >= 0.2) {
    grade = 'B'
    headline = 'Slight Edge'
    summary = 'You have a small advantage in this trade. Could be worth doing.'
  } else if (compositeScore >= -0.2) {
    grade = 'C'
    headline = 'Fair Trade'
    summary = 'This trade is relatively balanced. Consider your specific roster needs.'
  } else if (compositeScore >= -0.5) {
    grade = 'C-'
    headline = 'Slight Disadvantage'
    summary = 'You\'re giving up a bit more than you\'re getting. Proceed with caution.'
  } else if (compositeScore >= -1.0) {
    grade = 'D'
    headline = 'Not Recommended'
    summary = 'This trade favors the other team. Consider asking for more.'
  } else if (compositeScore >= -1.5) {
    grade = 'D-'
    headline = 'Bad Deal'
    summary = 'You\'re losing significant value here. Strongly consider declining.'
  } else {
    grade = 'F'
    headline = 'Reject This! ❌'
    summary = 'This trade heavily favors the other team. Don\'t do it.'
  }
  
  return { grade, headline, summary }
}

function getSubGrade(diff: number, scale: number): string {
  const normalized = diff / scale
  if (normalized >= 1.5) return 'A+'
  if (normalized >= 1.0) return 'A'
  if (normalized >= 0.5) return 'B+'
  if (normalized >= 0.2) return 'B'
  if (normalized >= -0.2) return 'C'
  if (normalized >= -0.5) return 'C-'
  if (normalized >= -1.0) return 'D'
  if (normalized >= -1.5) return 'D-'
  return 'F'
}

function analyzeTrade() {
  if (tradeGivePlayers.value.length === 0 || tradeGetPlayers.value.length === 0) return
  
  isAnalyzingTrade.value = true
  
  // Simulate analysis time for UX
  setTimeout(() => {
    // Calculate totals
    const giveTotal = tradeGivePlayers.value.reduce((sum, p) => sum + (p.total_points || 0), 0)
    const getTotal = tradeGetPlayers.value.reduce((sum, p) => sum + (p.total_points || 0), 0)
    const valueDiff = getTotal - giveTotal
    
    const givePPG = tradeGivePlayers.value.reduce((sum, p) => sum + (p.ppg || 0), 0)
    const getPPG = tradeGetPlayers.value.reduce((sum, p) => sum + (p.ppg || 0), 0)
    const ppgDiff = getPPG - givePPG
    
    const giveVOR = tradeGivePlayers.value.reduce((sum, p) => sum + (p.vor || 0), 0)
    const getVOR = tradeGetPlayers.value.reduce((sum, p) => sum + (p.vor || 0), 0)
    const vorDiff = getVOR - giveVOR
    
    // Calculate grade
    const { grade, headline, summary } = calculateTradeGrade(valueDiff, ppgDiff, vorDiff)
    
    // Calculate fairness percentage (50% = fair, >50% = you win, <50% = they win)
    const totalValue = giveTotal + getTotal
    const fairnessPercent = totalValue > 0 ? (getTotal / totalValue) * 100 : 50
    
    // Calculate team before/after
    const teamBefore = {
      totalPoints: myTeamPlayers.value.reduce((sum, p) => sum + (p.total_points || 0), 0),
      avgPPG: myTeamPlayers.value.reduce((sum, p) => sum + (p.ppg || 0), 0) / Math.max(myTeamPlayers.value.length, 1)
    }
    
    const teamAfterPlayers = myTeamPlayers.value
      .filter(p => !tradeGivePlayers.value.some(gp => gp.player_key === p.player_key))
      .concat(tradeGetPlayers.value)
    
    const teamAfter = {
      totalPoints: teamAfterPlayers.reduce((sum, p) => sum + (p.total_points || 0), 0),
      avgPPG: teamAfterPlayers.reduce((sum, p) => sum + (p.ppg || 0), 0) / Math.max(teamAfterPlayers.length, 1)
    }
    
    // Position impact
    const positions = ['C', '1B', '2B', '3B', 'SS', 'OF', 'SP', 'RP']
    const positionImpact = positions.map(pos => {
      const giving = tradeGivePlayers.value
        .filter(p => p.position?.includes(pos))
        .reduce((sum, p) => sum + (p.total_points || 0), 0)
      const getting = tradeGetPlayers.value
        .filter(p => p.position?.includes(pos))
        .reduce((sum, p) => sum + (p.total_points || 0), 0)
      return { position: pos, giving, getting, net: getting - giving }
    }).filter(p => p.giving > 0 || p.getting > 0)
    
    tradeAnalysis.value = {
      grade,
      headline,
      summary,
      valueGrade: getSubGrade(valueDiff, 50),
      ppgGrade: getSubGrade(ppgDiff, 2),
      positionGrade: getSubGrade(vorDiff, 30),
      fairnessPercent,
      teamBefore,
      teamAfter,
      positionImpact,
      valueDiff,
      ppgDiff,
      vorDiff
    }
    
    isAnalyzingTrade.value = false
  }, 500)
}
</script>
