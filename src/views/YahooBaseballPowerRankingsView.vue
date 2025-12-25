<template>
  <div class="space-y-6">
    <!-- Header with Controls -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="text-3xl font-bold text-dark-text mb-2">Power Rankings</h1>
        <p class="text-base text-dark-textMuted">
          Comprehensive team rankings based on performance metrics
        </p>
      </div>
      <div class="flex items-center gap-3">
        <button 
          @click="showPowerRankingSettings = true" 
          class="p-2 rounded-lg hover:bg-dark-border/50 transition-colors" 
          title="Customize Power Rankings"
        >
          <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        <select v-model="selectedWeek" @change="loadPowerRankings" class="select">
          <option value="">Select Week...</option>
          <option v-for="week in availableWeeks" :key="week" :value="week">
            Through Week {{ week }}
          </option>
        </select>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
        <p class="text-dark-textMuted">Loading power rankings...</p>
      </div>
    </div>

    <template v-else-if="powerRankings.length > 0">
      <!-- Legend Card -->
      <div class="card bg-dark-card/50">
        <div class="card-body py-3">
          <div class="flex items-center gap-6 text-sm">
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                <span class="text-[8px] text-gray-900">★</span>
              </div>
              <span class="text-dark-textMuted">My Team</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 rounded-full ring-2 ring-cyan-500 bg-dark-card"></div>
              <span class="text-dark-textMuted">Other Teams</span>
            </div>
            <div class="hidden sm:flex items-center gap-2 text-dark-textMuted">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              <span>Click team for details</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Power Rankings Table -->
      <div class="card">
        <div class="card-header">
          <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-2xl">⚡</span>
                <h2 class="card-title">Power Rankings - Week {{ selectedWeek }}</h2>
              </div>
              <div class="mt-2">
                <p class="card-subtitle text-sm leading-relaxed">
                  {{ currentFormulaDisplay }}
                </p>
                <button 
                  @click="showPowerRankingSettings = true" 
                  class="text-primary hover:text-yellow-500 text-xs font-semibold transition-colors mt-1"
                >
                  Customize Formula →
                </button>
              </div>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <select v-model="downloadFormat" class="bg-dark-card border border-dark-border rounded px-3 py-2 text-sm text-dark-text">
                <option value="png">Static Image (PNG)</option>
                <option value="gif">Animated GIF</option>
              </select>
              <button @click="downloadRankings" :disabled="isGeneratingDownload" class="btn-primary flex items-center gap-2">
                <svg v-if="!isGeneratingDownload" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <svg v-else class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ isGeneratingDownload ? 'Generating...' : 'Download' }}
              </button>
            </div>
          </div>
        </div>
        <div class="card-body">
          <!-- Power Rankings Table -->
          <div ref="rankingsTableRef" class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="text-left text-xs text-dark-textMuted uppercase border-b border-dark-border">
                  <th class="py-3 px-4">Rank</th>
                  <th class="py-3 px-4 w-6">+/-</th>
                  <th class="py-3 px-4">Team</th>
                  <th class="py-3 px-4 text-center">Power Score</th>
                  <th class="py-3 px-4 text-center hidden sm:table-cell">Record</th>
                  <th class="py-3 px-4 text-center hidden sm:table-cell">All-Play</th>
                  <th class="py-3 px-4 text-right hidden md:table-cell">PPW</th>
                  <th class="py-3 px-4 text-right hidden lg:table-cell">Last 3</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="(team, idx) in powerRankings" 
                  :key="team.team_key"
                  @click="openTeamDetailModal(team)"
                  class="border-b border-dark-border/50 hover:bg-dark-border/20 transition-colors cursor-pointer"
                  :class="{ 'bg-primary/5': team.is_my_team }"
                >
                  <td class="py-3 px-4">
                    <span 
                      class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      :class="getRankClass(idx + 1, powerRankings.length)"
                    >
                      {{ idx + 1 }}
                    </span>
                  </td>
                  <td class="py-3 px-4">
                    <div v-if="team.change !== 0" class="flex items-center gap-1">
                      <span v-if="team.change > 0" class="text-green-400 text-sm font-bold">▲{{ team.change }}</span>
                      <span v-else class="text-red-400 text-sm font-bold">▼{{ Math.abs(team.change) }}</span>
                    </div>
                    <span v-else class="text-dark-textMuted text-sm">—</span>
                  </td>
                  <td class="py-3 px-4">
                    <div class="flex items-center gap-3">
                      <div class="relative">
                        <img 
                          :src="team.logo_url || defaultAvatar" 
                          :alt="team.name"
                          class="w-8 h-8 rounded-full object-cover"
                          :class="team.is_my_team ? 'ring-2 ring-primary' : 'ring-2 ring-cyan-500/50'"
                          @error="handleImageError"
                        />
                        <div v-if="team.is_my_team" class="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full flex items-center justify-center">
                          <span class="text-[6px] text-gray-900 font-bold">★</span>
                        </div>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="font-semibold text-dark-text">{{ team.name }}</span>
                        <svg class="w-4 h-4 text-primary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </td>
                  <td class="py-3 px-4 text-center">
                    <div class="flex items-center justify-center gap-2">
                      <div class="w-16 h-2 bg-dark-border rounded-full overflow-hidden">
                        <div 
                          class="h-full bg-primary rounded-full transition-all duration-500"
                          :style="{ width: `${team.powerScore}%` }"
                        ></div>
                      </div>
                      <span class="font-bold text-primary">{{ team.powerScore.toFixed(1) }}</span>
                    </div>
                  </td>
                  <td class="py-3 px-4 text-center hidden sm:table-cell">
                    <span class="font-medium text-dark-text">{{ team.wins }}-{{ team.losses }}</span>
                  </td>
                  <td class="py-3 px-4 text-center hidden sm:table-cell">
                    <span class="text-dark-textMuted">{{ team.allPlayWins }}-{{ team.allPlayLosses }}</span>
                  </td>
                  <td class="py-3 px-4 text-right hidden md:table-cell">
                    <span class="font-medium text-dark-text">{{ team.avgScore.toFixed(1) }}</span>
                  </td>
                  <td class="py-3 px-4 text-right hidden lg:table-cell">
                    <span :class="team.recentAvg > team.avgScore ? 'text-green-400' : team.recentAvg < team.avgScore ? 'text-red-400' : 'text-dark-textMuted'">
                      {{ team.recentAvg.toFixed(1) }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Power Score Trend Chart -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">📈</span>
            <h2 class="card-title">Power Score Trend</h2>
          </div>
          <p class="text-sm text-dark-textMuted mt-1">Track power ranking changes throughout the season</p>
        </div>
        <div class="card-body">
          <div v-if="chartSeries.length > 0" class="relative">
            <apexchart 
              type="line" 
              height="400" 
              :options="chartOptions" 
              :series="chartSeries" 
            />
            <!-- Team avatars at end of lines -->
            <div 
              v-for="team in powerRankings" 
              :key="'avatar-' + team.team_key"
              class="absolute pointer-events-none" 
              :style="getAvatarPosition(team)"
            >
              <div class="relative">
                <img 
                  :src="team.logo_url || defaultAvatar" 
                  :alt="team.name"
                  :class="['w-6 h-6 rounded-full ring-2 object-cover', team.is_my_team ? 'ring-primary' : 'ring-cyan-500/70']"
                  @error="handleImageError" 
                />
                <div v-if="team.is_my_team" class="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full flex items-center justify-center">
                  <span class="text-[6px] text-gray-900 font-bold">★</span>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-12 text-dark-textMuted">
            <p>Not enough data for trend chart</p>
            <p class="text-sm mt-1">Chart will appear after Week 3</p>
          </div>
        </div>
      </div>

      <!-- Movers & Shakers -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Biggest Climber -->
        <div class="card bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20">
          <div class="card-body">
            <div class="text-xs uppercase tracking-wider text-green-400 font-bold mb-3">🚀 Biggest Climber</div>
            <div v-if="biggestClimber" class="flex items-center gap-3">
              <img 
                :src="biggestClimber.logo_url || defaultAvatar" 
                :alt="biggestClimber.name"
                class="w-12 h-12 rounded-full border-2 border-green-500/50 object-cover"
                @error="handleImageError"
              />
              <div class="flex-1 min-w-0">
                <div class="font-bold text-dark-text truncate">{{ biggestClimber.name }}</div>
                <div class="text-sm text-dark-textMuted">#{{ biggestClimber.firstRank }} → #{{ biggestClimber.lastRank }}</div>
              </div>
              <div class="text-2xl font-black text-green-400">+{{ biggestClimber.climb }}</div>
            </div>
            <div v-else class="text-dark-textMuted text-sm">Not enough data</div>
          </div>
        </div>

        <!-- Biggest Faller -->
        <div class="card bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20">
          <div class="card-body">
            <div class="text-xs uppercase tracking-wider text-red-400 font-bold mb-3">📉 Biggest Faller</div>
            <div v-if="biggestFaller" class="flex items-center gap-3">
              <img 
                :src="biggestFaller.logo_url || defaultAvatar" 
                :alt="biggestFaller.name"
                class="w-12 h-12 rounded-full border-2 border-red-500/50 object-cover"
                @error="handleImageError"
              />
              <div class="flex-1 min-w-0">
                <div class="font-bold text-dark-text truncate">{{ biggestFaller.name }}</div>
                <div class="text-sm text-dark-textMuted">#{{ biggestFaller.firstRank }} → #{{ biggestFaller.lastRank }}</div>
              </div>
              <div class="text-2xl font-black text-red-400">-{{ biggestFaller.fall }}</div>
            </div>
            <div v-else class="text-dark-textMuted text-sm">Not enough data</div>
          </div>
        </div>

        <!-- Most Consistent -->
        <div class="card bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
          <div class="card-body">
            <div class="text-xs uppercase tracking-wider text-blue-400 font-bold mb-3">🎯 Most Consistent</div>
            <div v-if="mostConsistent" class="flex items-center gap-3">
              <img 
                :src="mostConsistent.logo_url || defaultAvatar" 
                :alt="mostConsistent.name"
                class="w-12 h-12 rounded-full border-2 border-blue-500/50 object-cover"
                @error="handleImageError"
              />
              <div class="flex-1 min-w-0">
                <div class="font-bold text-dark-text truncate">{{ mostConsistent.name }}</div>
                <div class="text-sm text-dark-textMuted">Avg Rank: #{{ mostConsistent.avgRank }}</div>
              </div>
              <div class="text-lg font-black text-blue-400">±{{ mostConsistent.variance.toFixed(1) }}</div>
            </div>
            <div v-else class="text-dark-textMuted text-sm">Not enough data</div>
          </div>
        </div>

        <!-- Most Volatile -->
        <div class="card bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
          <div class="card-body">
            <div class="text-xs uppercase tracking-wider text-purple-400 font-bold mb-3">🎢 Most Volatile</div>
            <div v-if="mostVolatile" class="flex items-center gap-3">
              <img 
                :src="mostVolatile.logo_url || defaultAvatar" 
                :alt="mostVolatile.name"
                class="w-12 h-12 rounded-full border-2 border-purple-500/50 object-cover"
                @error="handleImageError"
              />
              <div class="flex-1 min-w-0">
                <div class="font-bold text-dark-text truncate">{{ mostVolatile.name }}</div>
                <div class="text-sm text-dark-textMuted">#{{ mostVolatile.minRank }} ↔ #{{ mostVolatile.maxRank }}</div>
              </div>
              <div class="text-lg font-black text-purple-400">±{{ mostVolatile.variance.toFixed(1) }}</div>
            </div>
            <div v-else class="text-dark-textMuted text-sm">Not enough data</div>
          </div>
        </div>
      </div>

      <!-- ROS Projections by Position -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">🔮</span>
            <h2 class="card-title">Rest of Season Projections by Position</h2>
          </div>
          <p class="text-sm text-dark-textMuted mt-1">Projected points for remaining weeks by position group</p>
        </div>
        <div class="card-body">
          <div v-if="rosProjectionsAvailable" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div 
              v-for="pos in baseballPositions" 
              :key="pos.id"
              @click="openPositionModal(pos.id)"
              class="bg-dark-border/30 rounded-xl p-4 text-center cursor-pointer hover:bg-dark-border/50 transition-colors group"
            >
              <div class="text-2xl mb-2">{{ pos.icon }}</div>
              <div class="text-sm font-bold text-dark-text">{{ pos.name }}</div>
              <div class="text-xs text-dark-textMuted mt-1">{{ getPositionLeader(pos.id) }}</div>
              <div class="text-xs text-primary mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                View Rankings →
              </div>
            </div>
          </div>
          <div v-else class="text-center py-8 text-dark-textMuted">
            <p>ROS projections not available for this league</p>
            <p class="text-sm mt-1">Yahoo doesn't provide player-level projections via API</p>
          </div>
        </div>
      </div>

      <!-- Position Strength Rankings -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">💪</span>
            <h2 class="card-title">Position Strength Rankings</h2>
          </div>
          <p class="text-sm text-dark-textMuted mt-1">Compare teams by position group strength</p>
        </div>
        <div class="card-body">
          <div v-if="positionStrengthData.length > 0" class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="text-left text-xs text-dark-textMuted uppercase border-b border-dark-border">
                  <th class="py-3 px-4 cursor-pointer hover:text-primary" @click="sortPositionBy('rank')">
                    Rank <span v-if="positionSortColumn === 'rank'">{{ positionSortDirection === 'asc' ? '↑' : '↓' }}</span>
                  </th>
                  <th class="py-3 px-4">Team</th>
                  <th 
                    v-for="pos in baseballPositions.slice(0, 8)" 
                    :key="pos.id"
                    class="py-3 px-4 text-center cursor-pointer hover:text-primary"
                    @click="sortPositionBy(pos.id)"
                  >
                    {{ pos.abbrev }} <span v-if="positionSortColumn === pos.id">{{ positionSortDirection === 'asc' ? '↑' : '↓' }}</span>
                  </th>
                  <th class="py-3 px-4 text-right cursor-pointer hover:text-primary" @click="sortPositionBy('total')">
                    Total <span v-if="positionSortColumn === 'total'">{{ positionSortDirection === 'asc' ? '↑' : '↓' }}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="(team, idx) in sortedPositionStrength" 
                  :key="team.team_key"
                  class="border-b border-dark-border/50 hover:bg-dark-border/20"
                  :class="{ 'bg-primary/5': team.is_my_team }"
                >
                  <td class="py-3 px-4">
                    <span 
                      class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      :class="getRankClass(idx + 1, positionStrengthData.length)"
                    >
                      {{ idx + 1 }}
                    </span>
                  </td>
                  <td class="py-3 px-4">
                    <div class="flex items-center gap-2">
                      <img 
                        :src="team.logo_url || defaultAvatar" 
                        :alt="team.name"
                        class="w-6 h-6 rounded-full object-cover"
                        @error="handleImageError"
                      />
                      <span class="font-medium text-dark-text text-sm">{{ team.name }}</span>
                    </div>
                  </td>
                  <td 
                    v-for="pos in baseballPositions.slice(0, 8)" 
                    :key="pos.id"
                    class="py-3 px-4 text-center"
                  >
                    <span 
                      class="text-sm font-medium"
                      :class="getPositionRankClass(team.rankings[pos.id], positionStrengthData.length)"
                    >
                      {{ team.rankings[pos.id] || '-' }}
                    </span>
                  </td>
                  <td class="py-3 px-4 text-right">
                    <span class="font-bold text-primary">{{ team.rosTotal?.toFixed(0) || '-' }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="text-center py-8 text-dark-textMuted">
            <p>Position strength data not available</p>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="text-center py-20">
      <div class="text-6xl mb-4">⚡</div>
      <h2 class="text-2xl font-bold text-dark-text mb-2">Select a Week</h2>
      <p class="text-dark-textMuted">Choose a week to view power rankings</p>
    </div>

    <!-- Power Ranking Settings Modal -->
    <Teleport to="body">
      <div 
        v-if="showPowerRankingSettings" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="showPowerRankingSettings = false"
      >
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
        <div class="relative bg-dark-elevated rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-dark-border">
          <!-- Header -->
          <div class="sticky top-0 z-10 px-6 py-4 border-b border-dark-border bg-dark-elevated flex items-center justify-between">
            <div>
              <h3 class="text-xl font-bold text-dark-text">Customize Power Rankings</h3>
              <p class="text-sm text-dark-textMuted">Adjust weights to personalize your rankings</p>
            </div>
            <button @click="showPowerRankingSettings = false" class="p-2 rounded-lg hover:bg-dark-border/50 transition-colors">
              <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Presets -->
          <div class="p-6 border-b border-dark-border">
            <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-3">Quick Presets</h4>
            <div class="flex flex-wrap gap-2">
              <button 
                v-for="preset in powerRankingPresets" 
                :key="preset.id"
                @click="applyPreset(preset)"
                class="px-3 py-2 rounded-lg border border-dark-border text-sm hover:border-primary hover:text-primary transition-colors"
              >
                {{ preset.icon }} {{ preset.name }}
              </button>
            </div>
          </div>

          <!-- Factors -->
          <div class="p-6">
            <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-4">Factor Weights</h4>
            <div class="space-y-4">
              <div 
                v-for="factor in powerRankingFactors" 
                :key="factor.id"
                class="bg-dark-border/30 rounded-xl p-4"
              >
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2">
                    <span class="text-lg">{{ factor.icon }}</span>
                    <span class="font-medium text-dark-text">{{ factor.name }}</span>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" v-model="factor.enabled" class="sr-only peer" @change="recalculatePowerRankings">
                    <div class="w-9 h-5 bg-dark-border rounded-full peer peer-checked:bg-primary transition-colors"></div>
                    <div class="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4"></div>
                  </label>
                </div>
                <p class="text-xs text-dark-textMuted mb-3">{{ factor.description }}</p>
                <div v-if="factor.enabled" class="flex items-center gap-3">
                  <input 
                    type="range" 
                    v-model.number="factor.weight" 
                    min="0" 
                    max="100" 
                    class="flex-1 h-2 bg-dark-border rounded-lg appearance-none cursor-pointer"
                    @input="recalculatePowerRankings"
                  />
                  <span class="text-sm font-bold text-primary w-12 text-right">{{ factor.weight }}%</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="sticky bottom-0 px-6 py-4 border-t border-dark-border bg-dark-elevated flex items-center justify-between">
            <button @click="resetFactors" class="text-sm text-dark-textMuted hover:text-dark-text transition-colors">
              Reset to Default
            </button>
            <button @click="showPowerRankingSettings = false" class="btn-primary">
              Apply Changes
            </button>
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
                :src="selectedTeamDetail?.logo_url || defaultAvatar" 
                :alt="selectedTeamDetail?.name"
                class="w-12 h-12 rounded-full ring-2 ring-primary object-cover"
                @error="handleImageError"
              />
              <div>
                <h3 class="text-xl font-bold text-dark-text">{{ selectedTeamDetail?.name }}</h3>
                <p class="text-sm text-dark-textMuted">Power Rank #{{ selectedTeamDetail ? powerRankings.indexOf(selectedTeamDetail) + 1 : '-' }}</p>
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
                <div class="text-2xl font-black text-primary">{{ selectedTeamDetail?.powerScore.toFixed(1) }}</div>
                <div class="text-xs text-dark-textMuted">Power Score</div>
              </div>
              <div class="bg-dark-border/30 rounded-xl p-4 text-center">
                <div class="text-2xl font-black text-dark-text">{{ selectedTeamDetail?.wins }}-{{ selectedTeamDetail?.losses }}</div>
                <div class="text-xs text-dark-textMuted">Record</div>
              </div>
              <div class="bg-dark-border/30 rounded-xl p-4 text-center">
                <div class="text-2xl font-black text-dark-text">{{ selectedTeamDetail?.allPlayWins }}-{{ selectedTeamDetail?.allPlayLosses }}</div>
                <div class="text-xs text-dark-textMuted">All-Play</div>
              </div>
              <div class="bg-dark-border/30 rounded-xl p-4 text-center">
                <div class="text-2xl font-black text-dark-text">{{ selectedTeamDetail?.avgScore.toFixed(1) }}</div>
                <div class="text-xs text-dark-textMuted">PPW</div>
              </div>
            </div>
          </div>
          
          <!-- Factor Breakdown -->
          <div class="p-6">
            <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-4">Power Score Breakdown</h4>
            <div class="space-y-3">
              <div 
                v-for="factor in teamDetailFactors" 
                :key="factor.id"
                class="flex items-center gap-3"
              >
                <span class="text-lg w-8">{{ factor.icon }}</span>
                <div class="flex-1">
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-sm text-dark-text">{{ factor.name }}</span>
                    <span class="text-sm text-dark-textMuted">{{ factor.weight }}</span>
                  </div>
                  <div class="h-2 bg-dark-border rounded-full overflow-hidden">
                    <div 
                      class="h-full rounded-full transition-all duration-500"
                      :style="{ width: `${factor.score}%`, backgroundColor: factor.color }"
                    ></div>
                  </div>
                </div>
                <div class="w-16 text-right">
                  <span class="text-sm font-bold" :style="{ color: factor.color }">{{ factor.score.toFixed(1) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Position Modal -->
    <Teleport to="body">
      <div 
        v-if="showPositionModal" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="closePositionModal"
      >
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
        <div class="relative bg-dark-elevated rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-dark-border">
          <!-- Header -->
          <div class="sticky top-0 z-10 px-6 py-4 border-b border-dark-border bg-dark-elevated flex items-center justify-between">
            <div>
              <h3 class="text-xl font-bold text-dark-text">{{ selectedPosition?.name }} Rankings</h3>
              <p class="text-sm text-dark-textMuted">Rest of Season projections</p>
            </div>
            <button @click="closePositionModal" class="p-2 rounded-lg hover:bg-dark-border/50 transition-colors">
              <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <!-- Position Rankings Content -->
          <div class="p-6">
            <div class="text-center py-8 text-dark-textMuted">
              <p>Player-level ROS projections require external data source</p>
              <p class="text-sm mt-1">Yahoo API doesn't provide individual player projections</p>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Platform Badge -->
    <div class="flex justify-center mt-8">
      <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-600/10 border border-purple-600/30">
        <span class="text-sm font-bold text-purple-400">Y!</span>
        <span class="text-sm text-purple-300">Yahoo Fantasy Baseball • Points League</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { yahooService } from '@/services/yahoo'
import { useAuthStore } from '@/stores/auth'
import html2canvas from 'html2canvas'

const leagueStore = useLeagueStore()
const authStore = useAuthStore()

const defaultAvatar = 'https://s.yimg.com/cv/apiv2/default/mlb/mlb_1_100.png'

// State
const isLoading = ref(false)
const selectedWeek = ref('')
const downloadFormat = ref<'png' | 'gif'>('png')
const isGeneratingDownload = ref(false)
const rankingsTableRef = ref<HTMLElement | null>(null)

// Modal state
const showPowerRankingSettings = ref(false)
const showTeamDetailModal = ref(false)
const showPositionModal = ref(false)
const selectedTeamDetail = ref<PowerRankingData | null>(null)
const selectedPosition = ref<{ id: string; name: string } | null>(null)

// Position sorting
const positionSortColumn = ref<string>('rank')
const positionSortDirection = ref<'asc' | 'desc'>('asc')

// Power rankings data
const powerRankings = ref<PowerRankingData[]>([])
const historicalPowerRanks = ref<Map<string, number[]>>(new Map())
const allMatchups = ref<Map<number, any[]>>(new Map())

// Power ranking factors
const powerRankingFactors = ref<PowerRankingFactorConfig[]>([
  { id: 'record', name: 'Win-Loss Record', description: 'Team record and winning percentage', enabled: true, weight: 30, icon: '🏆', color: '#22c55e' },
  { id: 'pointsFor', name: 'Total Points Scored', description: 'Total points for the season', enabled: true, weight: 20, icon: '📊', color: '#f5c451' },
  { id: 'allPlay', name: 'All-Play Record', description: 'Record if you played every team every week', enabled: true, weight: 18, icon: '⚔️', color: '#3b82f6' },
  { id: 'recentForm', name: 'Recent Form (Last 3)', description: 'Average points over last 3 weeks', enabled: true, weight: 15, icon: '🔥', color: '#a855f7' },
  { id: 'consistency', name: 'Consistency', description: 'Lower variance = more reliable', enabled: true, weight: 12, icon: '🎯', color: '#ec4899' },
  { id: 'pointsAgainst', name: 'Points Against (Luck)', description: 'Lower PA can indicate schedule luck', enabled: false, weight: 5, icon: '🍀', color: '#10b981' }
])

const powerRankingPresets = [
  { id: 'balanced', name: 'Balanced', icon: '⚖️', factors: { record: 30, pointsFor: 20, allPlay: 18, recentForm: 15, consistency: 12, pointsAgainst: 5 } },
  { id: 'winsMatter', name: 'Wins Matter', icon: '🏆', factors: { record: 50, pointsFor: 15, allPlay: 15, recentForm: 10, consistency: 10, pointsAgainst: 0 } },
  { id: 'trueStrength', name: 'True Strength', icon: '💪', factors: { record: 15, pointsFor: 30, allPlay: 30, recentForm: 10, consistency: 10, pointsAgainst: 5 } },
  { id: 'hotHand', name: 'Hot Hand', icon: '🔥', factors: { record: 20, pointsFor: 15, allPlay: 10, recentForm: 40, consistency: 10, pointsAgainst: 5 } }
]

// Baseball positions
const baseballPositions = [
  { id: 'C', name: 'Catcher', abbrev: 'C', icon: '🥎' },
  { id: '1B', name: 'First Base', abbrev: '1B', icon: '1️⃣' },
  { id: '2B', name: 'Second Base', abbrev: '2B', icon: '2️⃣' },
  { id: '3B', name: 'Third Base', abbrev: '3B', icon: '3️⃣' },
  { id: 'SS', name: 'Shortstop', abbrev: 'SS', icon: '⚡' },
  { id: 'OF', name: 'Outfield', abbrev: 'OF', icon: '🌿' },
  { id: 'UTIL', name: 'Utility', abbrev: 'UTIL', icon: '🔧' },
  { id: 'SP', name: 'Starting Pitcher', abbrev: 'SP', icon: '⚾' },
  { id: 'RP', name: 'Relief Pitcher', abbrev: 'RP', icon: '🔥' }
]

// Interfaces
interface PowerRankingData {
  team_key: string
  name: string
  logo_url: string
  is_my_team: boolean
  powerScore: number
  avgScore: number
  wins: number
  losses: number
  ties: number
  totalPointsFor: number
  pointsAgainst: number
  allPlayWins: number
  allPlayLosses: number
  recentAvg: number
  stdDev: number
  weekCount: number
  change: number
  prevRank: number
}

interface PowerRankingFactorConfig {
  id: string
  name: string
  description: string
  enabled: boolean
  weight: number
  icon: string
  color: string
}

// Computed
const currentWeek = computed(() => leagueStore.currentLeague?.settings?.leg || 1)

const availableWeeks = computed(() => {
  const weeks = []
  const week = currentWeek.value
  for (let i = 3; i <= week; i++) {
    weeks.push(i)
  }
  return weeks
})

const historicalWeeks = computed(() => {
  if (!selectedWeek.value) return []
  const weeks = []
  const endWeek = parseInt(selectedWeek.value)
  for (let i = 3; i <= endWeek; i++) {
    weeks.push(i)
  }
  return weeks
})

const currentFormulaDisplay = computed(() => {
  const enabled = powerRankingFactors.value.filter(f => f.enabled && f.weight > 0)
  if (enabled.length === 0) return 'No factors enabled'
  
  const total = enabled.reduce((sum, f) => sum + f.weight, 0)
  return enabled.map(f => `${f.name} (${Math.round(f.weight / total * 100)}%)`).join(' + ')
})

const rosProjectionsAvailable = computed(() => false) // Yahoo doesn't provide player projections

const positionStrengthData = computed(() => {
  // Would need player-level data from Yahoo
  return []
})

const sortedPositionStrength = computed(() => positionStrengthData.value)

// Team detail factors for modal
const teamDetailFactors = computed(() => {
  if (!selectedTeamDetail.value) return []
  
  const team = selectedTeamDetail.value
  const enabled = powerRankingFactors.value.filter(f => f.enabled)
  const totalWeight = enabled.reduce((sum, f) => sum + f.weight, 0)
  
  return enabled.map(factor => {
    const normalizedWeight = Math.round(factor.weight / totalWeight * 100)
    let score = 0
    
    switch (factor.id) {
      case 'record':
        const games = team.wins + team.losses
        score = games > 0 ? (team.wins / games) * 100 : 0
        break
      case 'pointsFor':
        const maxPF = Math.max(...powerRankings.value.map(t => t.totalPointsFor))
        score = maxPF > 0 ? (team.totalPointsFor / maxPF) * 100 : 0
        break
      case 'allPlay':
        const allPlayTotal = team.allPlayWins + team.allPlayLosses
        score = allPlayTotal > 0 ? (team.allPlayWins / allPlayTotal) * 100 : 0
        break
      case 'recentForm':
        const maxRecent = Math.max(...powerRankings.value.map(t => t.recentAvg))
        score = maxRecent > 0 ? (team.recentAvg / maxRecent) * 100 : 0
        break
      case 'consistency':
        const maxStdDev = Math.max(...powerRankings.value.map(t => t.stdDev))
        score = maxStdDev > 0 ? ((maxStdDev - team.stdDev) / maxStdDev) * 100 : 50
        break
      case 'pointsAgainst':
        const maxPA = Math.max(...powerRankings.value.map(t => t.pointsAgainst))
        const minPA = Math.min(...powerRankings.value.map(t => t.pointsAgainst))
        const range = maxPA - minPA
        score = range > 0 ? ((maxPA - team.pointsAgainst) / range) * 100 : 50
        break
    }
    
    return { ...factor, weight: `${normalizedWeight}%`, score }
  })
})

// Chart configuration
const chartOptions = computed(() => {
  if (powerRankings.value.length === 0) return null
  
  return {
    chart: { type: 'line', background: 'transparent', toolbar: { show: false }, zoom: { enabled: false } },
    theme: { mode: 'dark' },
    colors: powerRankings.value.map((team) => team.is_my_team ? '#F5C451' : getTeamColor(powerRankings.value.indexOf(team))),
    stroke: { width: powerRankings.value.map((team) => team.is_my_team ? 4 : 2), curve: 'smooth' },
    markers: { size: 0, hover: { size: 6 } },
    xaxis: {
      categories: historicalWeeks.value.map(w => `Wk ${w}`),
      labels: { style: { colors: '#9ca3af' } }
    },
    yaxis: {
      reversed: true,
      min: 1,
      max: powerRankings.value.length,
      labels: { style: { colors: '#9ca3af' }, formatter: (v: number) => `#${Math.round(v)}` }
    },
    legend: { show: false },
    tooltip: { theme: 'dark' },
    grid: { borderColor: '#374151', padding: { right: 50 } }
  }
})

const chartSeries = computed(() => {
  if (powerRankings.value.length === 0) return []
  return powerRankings.value.map(team => ({
    name: team.name,
    data: historicalPowerRanks.value.get(team.team_key) || []
  }))
})

// Movers & Shakers
const biggestClimber = computed(() => {
  if (powerRankings.value.length === 0 || historicalWeeks.value.length < 2) return null
  
  let maxClimb = 0
  let climber = null
  
  powerRankings.value.forEach(team => {
    const ranks = historicalPowerRanks.value.get(team.team_key) || []
    if (ranks.length < 2) return
    
    const firstRank = ranks[0]
    const lastRank = ranks[ranks.length - 1]
    const climb = firstRank - lastRank
    
    if (climb > maxClimb) {
      maxClimb = climb
      climber = { ...team, climb, firstRank, lastRank }
    }
  })
  
  return climber
})

const biggestFaller = computed(() => {
  if (powerRankings.value.length === 0 || historicalWeeks.value.length < 2) return null
  
  let maxFall = 0
  let faller = null
  
  powerRankings.value.forEach(team => {
    const ranks = historicalPowerRanks.value.get(team.team_key) || []
    if (ranks.length < 2) return
    
    const firstRank = ranks[0]
    const lastRank = ranks[ranks.length - 1]
    const fall = lastRank - firstRank
    
    if (fall > maxFall) {
      maxFall = fall
      faller = { ...team, fall, firstRank, lastRank }
    }
  })
  
  return faller
})

const mostConsistent = computed(() => {
  if (powerRankings.value.length === 0 || historicalWeeks.value.length < 2) return null
  
  let minVariance = Infinity
  let consistent = null
  
  powerRankings.value.forEach(team => {
    const ranks = historicalPowerRanks.value.get(team.team_key) || []
    if (ranks.length < 2) return
    
    const avg = ranks.reduce((a, b) => a + b, 0) / ranks.length
    const variance = ranks.reduce((sum, rank) => sum + Math.pow(rank - avg, 2), 0) / ranks.length
    
    if (variance < minVariance) {
      minVariance = variance
      consistent = { ...team, variance, avgRank: Math.round(avg) }
    }
  })
  
  return consistent
})

const mostVolatile = computed(() => {
  if (powerRankings.value.length === 0 || historicalWeeks.value.length < 2) return null
  
  let maxVariance = 0
  let volatile = null
  
  powerRankings.value.forEach(team => {
    const ranks = historicalPowerRanks.value.get(team.team_key) || []
    if (ranks.length < 2) return
    
    const avg = ranks.reduce((a, b) => a + b, 0) / ranks.length
    const variance = ranks.reduce((sum, rank) => sum + Math.pow(rank - avg, 2), 0) / ranks.length
    const minRank = Math.min(...ranks)
    const maxRank = Math.max(...ranks)
    
    if (variance > maxVariance) {
      maxVariance = variance
      volatile = { ...team, variance, minRank, maxRank }
    }
  })
  
  return volatile
})

// Methods
function handleImageError(e: Event) {
  const img = e.target as HTMLImageElement
  img.src = defaultAvatar
}

function getTeamColor(idx: number): string {
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6', '#f43f5e']
  return colors[idx % colors.length]
}

function getRankClass(rank: number, total: number): string {
  const percentile = rank / total
  if (percentile <= 0.25) return 'bg-green-500/20 text-green-400'
  if (percentile <= 0.5) return 'bg-blue-500/20 text-blue-400'
  if (percentile <= 0.75) return 'bg-yellow-500/20 text-yellow-400'
  return 'bg-red-500/20 text-red-400'
}

function getPositionRankClass(rank: number, total: number): string {
  if (!rank) return 'text-dark-textMuted'
  const percentile = rank / total
  if (percentile <= 0.25) return 'text-green-400'
  if (percentile <= 0.5) return 'text-blue-400'
  if (percentile <= 0.75) return 'text-yellow-400'
  return 'text-red-400'
}

function getAvatarPosition(team: PowerRankingData): { top: string; left: string } {
  const ranks = historicalPowerRanks.value.get(team.team_key) || []
  if (ranks.length === 0) return { top: '0px', left: '0px' }
  
  const lastRank = ranks[ranks.length - 1]
  const numTeams = powerRankings.value.length
  const chartHeight = 400
  const yPercent = ((lastRank - 1) / (numTeams - 1)) * 100
  const top = (chartHeight * 0.08) + (chartHeight * 0.82 * yPercent / 100) - 14
  
  return { top: `${top}px`, left: 'calc(100% - 40px)' }
}

function getPositionLeader(posId: string): string {
  return 'N/A' // Would need player data
}

function sortPositionBy(column: string) {
  if (positionSortColumn.value === column) {
    positionSortDirection.value = positionSortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    positionSortColumn.value = column
    positionSortDirection.value = column === 'rank' ? 'asc' : 'desc'
  }
}

function applyPreset(preset: any) {
  powerRankingFactors.value.forEach(factor => {
    if (preset.factors[factor.id] !== undefined) {
      factor.weight = preset.factors[factor.id]
      factor.enabled = preset.factors[factor.id] > 0
    }
  })
  recalculatePowerRankings()
}

function resetFactors() {
  powerRankingFactors.value = [
    { id: 'record', name: 'Win-Loss Record', description: 'Team record and winning percentage', enabled: true, weight: 30, icon: '🏆', color: '#22c55e' },
    { id: 'pointsFor', name: 'Total Points Scored', description: 'Total points for the season', enabled: true, weight: 20, icon: '📊', color: '#f5c451' },
    { id: 'allPlay', name: 'All-Play Record', description: 'Record if you played every team every week', enabled: true, weight: 18, icon: '⚔️', color: '#3b82f6' },
    { id: 'recentForm', name: 'Recent Form (Last 3)', description: 'Average points over last 3 weeks', enabled: true, weight: 15, icon: '🔥', color: '#a855f7' },
    { id: 'consistency', name: 'Consistency', description: 'Lower variance = more reliable', enabled: true, weight: 12, icon: '🎯', color: '#ec4899' },
    { id: 'pointsAgainst', name: 'Points Against (Luck)', description: 'Lower PA can indicate schedule luck', enabled: false, weight: 5, icon: '🍀', color: '#10b981' }
  ]
  recalculatePowerRankings()
}

function openTeamDetailModal(team: PowerRankingData) {
  selectedTeamDetail.value = team
  showTeamDetailModal.value = true
}

function closeTeamDetailModal() {
  showTeamDetailModal.value = false
  selectedTeamDetail.value = null
}

function openPositionModal(posId: string) {
  const pos = baseballPositions.find(p => p.id === posId)
  if (pos) {
    selectedPosition.value = pos
    showPositionModal.value = true
  }
}

function closePositionModal() {
  showPositionModal.value = false
  selectedPosition.value = null
}

async function downloadRankings() {
  if (!rankingsTableRef.value) return
  
  isGeneratingDownload.value = true
  
  try {
    const canvas = await html2canvas(rankingsTableRef.value, {
      backgroundColor: '#1a1b2e',
      scale: 2
    })
    
    const link = document.createElement('a')
    link.download = `power-rankings-week-${selectedWeek.value}.png`
    link.href = canvas.toDataURL()
    link.click()
  } catch (e) {
    console.error('Error generating download:', e)
  } finally {
    isGeneratingDownload.value = false
  }
}

function calculatePowerScore(team: any, allTeams: any[]): number {
  const enabled = powerRankingFactors.value.filter(f => f.enabled)
  const totalWeight = enabled.reduce((sum, f) => sum + f.weight, 0)
  if (totalWeight === 0) return 0
  
  let score = 0
  
  const maxPointsFor = Math.max(...allTeams.map(t => t.totalPointsFor))
  const maxRecentAvg = Math.max(...allTeams.map(t => t.recentAvg))
  const maxStdDev = Math.max(...allTeams.map(t => t.stdDev))
  const maxPA = Math.max(...allTeams.map(t => t.pointsAgainst))
  const minPA = Math.min(...allTeams.map(t => t.pointsAgainst))
  
  enabled.forEach(factor => {
    const normalizedWeight = factor.weight / totalWeight
    let componentScore = 0
    
    switch (factor.id) {
      case 'record':
        const games = team.wins + team.losses
        componentScore = games > 0 ? (team.wins / games) * 100 : 0
        break
      case 'pointsFor':
        componentScore = maxPointsFor > 0 ? (team.totalPointsFor / maxPointsFor) * 100 : 0
        break
      case 'allPlay':
        const apTotal = team.allPlayWins + team.allPlayLosses
        componentScore = apTotal > 0 ? (team.allPlayWins / apTotal) * 100 : 0
        break
      case 'recentForm':
        componentScore = maxRecentAvg > 0 ? (team.recentAvg / maxRecentAvg) * 100 : 0
        break
      case 'consistency':
        componentScore = maxStdDev > 0 ? ((maxStdDev - team.stdDev) / maxStdDev) * 100 : 50
        break
      case 'pointsAgainst':
        const range = maxPA - minPA
        componentScore = range > 0 ? ((maxPA - team.pointsAgainst) / range) * 100 : 50
        break
    }
    
    score += componentScore * normalizedWeight
  })
  
  return score
}

async function calculatePowerRankingsForWeek(throughWeek: number): Promise<PowerRankingData[]> {
  const teams = leagueStore.yahooTeams
  const rankings: PowerRankingData[] = []
  
  // Get matchups for all weeks up to throughWeek
  let matchupsNeeded = false
  for (let w = 1; w <= throughWeek; w++) {
    if (!allMatchups.value.has(w)) {
      matchupsNeeded = true
      break
    }
  }
  
  if (matchupsNeeded) {
    const leagueKey = leagueStore.activeLeagueId
    if (leagueKey && authStore.user?.id) {
      await yahooService.initialize(authStore.user.id)
      for (let w = 1; w <= throughWeek; w++) {
        if (!allMatchups.value.has(w)) {
          try {
            const matchups = await yahooService.getMatchups(leagueKey, w)
            allMatchups.value.set(w, matchups)
          } catch (e) {
            console.error(`Error fetching week ${w}:`, e)
          }
        }
      }
    }
  }
  
  // Calculate stats for each team
  teams.forEach(team => {
    let wins = 0, losses = 0, ties = 0
    let totalPointsFor = 0, totalPointsAgainst = 0
    let allPlayWins = 0, allPlayLosses = 0
    let weekCount = 0
    const weeklyScores: number[] = []
    
    // Calculate from matchups
    for (let week = 1; week <= throughWeek; week++) {
      const matchups = allMatchups.value.get(week) || []
      
      // Find this team's matchup
      for (const matchup of matchups) {
        const myTeam = matchup.teams.find((t: any) => t.team_key === team.team_key)
        const opponent = matchup.teams.find((t: any) => t.team_key !== team.team_key)
        
        if (myTeam && opponent) {
          const myPoints = myTeam.points || 0
          const oppPoints = opponent.points || 0
          
          totalPointsFor += myPoints
          totalPointsAgainst += oppPoints
          weeklyScores.push(myPoints)
          weekCount++
          
          if (myPoints > oppPoints) wins++
          else if (myPoints < oppPoints) losses++
          else ties++
        }
      }
      
      // All-play calculation
      const weekScores: { team_key: string; points: number }[] = []
      for (const matchup of matchups) {
        for (const t of matchup.teams) {
          weekScores.push({ team_key: t.team_key, points: t.points || 0 })
        }
      }
      
      const myScore = weekScores.find(s => s.team_key === team.team_key)
      if (myScore) {
        weekScores.forEach(opp => {
          if (opp.team_key !== team.team_key) {
            if (myScore.points > opp.points) allPlayWins++
            else if (myScore.points < opp.points) allPlayLosses++
          }
        })
      }
    }
    
    // Recent form (last 3)
    const recentScores = weeklyScores.slice(-3)
    const recentAvg = recentScores.length > 0 ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length : 0
    
    // Consistency (std dev)
    let stdDev = 0
    if (weeklyScores.length > 1) {
      const mean = totalPointsFor / weekCount
      const variance = weeklyScores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / weeklyScores.length
      stdDev = Math.sqrt(variance)
    }
    
    rankings.push({
      team_key: team.team_key,
      name: team.name,
      logo_url: team.logo_url,
      is_my_team: team.is_my_team,
      powerScore: 0,
      avgScore: weekCount > 0 ? totalPointsFor / weekCount : 0,
      wins,
      losses,
      ties,
      totalPointsFor,
      pointsAgainst: totalPointsAgainst,
      allPlayWins,
      allPlayLosses,
      recentAvg,
      stdDev,
      weekCount,
      change: 0,
      prevRank: 0
    })
  })
  
  // Calculate power scores
  rankings.forEach(team => {
    team.powerScore = calculatePowerScore(team, rankings)
  })
  
  // Sort by power score
  rankings.sort((a, b) => b.powerScore - a.powerScore)
  
  return rankings
}

async function loadPowerRankings() {
  if (!selectedWeek.value) return
  
  isLoading.value = true
  
  try {
    const throughWeek = parseInt(selectedWeek.value)
    
    // Calculate rankings for current week
    const currentRankings = await calculatePowerRankingsForWeek(throughWeek)
    
    // Calculate rankings for previous week to get change
    if (throughWeek > 3) {
      const prevRankings = await calculatePowerRankingsForWeek(throughWeek - 1)
      
      currentRankings.forEach((team, idx) => {
        const prevIdx = prevRankings.findIndex(t => t.team_key === team.team_key)
        if (prevIdx !== -1) {
          team.prevRank = prevIdx + 1
          team.change = team.prevRank - (idx + 1)
        }
      })
    }
    
    // Calculate historical rankings for chart
    const historical = new Map<string, number[]>()
    
    for (let week = 3; week <= throughWeek; week++) {
      const weekRankings = await calculatePowerRankingsForWeek(week)
      
      weekRankings.forEach((team, idx) => {
        const ranks = historical.get(team.team_key) || []
        ranks.push(idx + 1)
        historical.set(team.team_key, ranks)
      })
    }
    
    powerRankings.value = currentRankings
    historicalPowerRanks.value = historical
  } catch (e) {
    console.error('Error loading power rankings:', e)
  } finally {
    isLoading.value = false
  }
}

function recalculatePowerRankings() {
  if (selectedWeek.value) {
    loadPowerRankings()
  }
}

// Watch for league changes
watch(() => leagueStore.yahooTeams, () => {
  if (leagueStore.yahooTeams.length > 0 && !selectedWeek.value) {
    const week = currentWeek.value
    if (week >= 3) {
      selectedWeek.value = week.toString()
      loadPowerRankings()
    }
  }
}, { immediate: true })

onMounted(() => {
  if (leagueStore.yahooTeams.length > 0 && currentWeek.value >= 3) {
    selectedWeek.value = currentWeek.value.toString()
    loadPowerRankings()
  }
})
</script>
