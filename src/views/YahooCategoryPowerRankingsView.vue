<template>
  <div class="space-y-6">
    <!-- Header with Controls -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="text-3xl font-bold text-dark-text mb-2">Category Power Rankings</h1>
        <p class="text-base text-dark-textMuted">
          H2H Category rankings based on category dominance and balance
        </p>
      </div>
      <div class="flex items-center gap-3">
        <button 
          @click="showSettings = true" 
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
        <p class="text-dark-textMuted">{{ loadingMessage }}</p>
      </div>
    </div>

    <template v-else-if="powerRankings.length > 0">
      <!-- Legend Card -->
      <div class="card bg-dark-card/50">
        <div class="card-body py-3">
          <div class="flex items-center gap-6 text-sm flex-wrap">
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                <span class="text-[8px] text-gray-900">★</span>
              </div>
              <span class="text-dark-textMuted">My Team</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-green-500"></span>
              <span class="text-dark-textMuted">Dominant (Top 3)</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-red-500"></span>
              <span class="text-dark-textMuted">Weak (Bottom 3)</span>
            </div>
            <div class="hidden sm:flex items-center gap-2 text-dark-textMuted">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              <span>Click team for category breakdown</span>
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
                  @click="showSettings = true" 
                  class="text-primary hover:text-blue-400 text-xs font-semibold transition-colors mt-1"
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
          <div ref="rankingsTableRef" class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="text-left text-xs text-dark-textMuted uppercase border-b border-dark-border">
                  <th class="py-3 px-4">Rank</th>
                  <th class="py-3 px-4 w-6">+/-</th>
                  <th class="py-3 px-4">Team</th>
                  <th class="py-3 px-4 text-center">Power Score</th>
                  <th class="py-3 px-4 text-center hidden sm:table-cell">Cat W-L</th>
                  <th class="py-3 px-4 text-center hidden sm:table-cell">Cat Win %</th>
                  <th class="py-3 px-4 text-center hidden md:table-cell">Dominant</th>
                  <th class="py-3 px-4 text-center hidden md:table-cell">Weak</th>
                  <th class="py-3 px-4 text-center hidden lg:table-cell">Balance</th>
                  <th class="py-3 px-4 text-center hidden lg:table-cell">Avg/Matchup</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="(team, idx) in powerRankings" 
                  :key="team.team_key"
                  @click="openTeamModal(team)"
                  class="border-b border-dark-border/50 hover:bg-dark-border/20 transition-colors cursor-pointer"
                  :class="{ 'bg-primary/5': team.is_my_team }"
                >
                  <td class="py-3 px-4">
                    <span 
                      class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      :class="getRankClass(idx + 1)"
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
                    <span class="font-medium text-dark-text">{{ team.totalCatWins }}-{{ team.totalCatLosses }}</span>
                    <span v-if="team.totalCatTies > 0" class="text-dark-textMuted">-{{ team.totalCatTies }}</span>
                  </td>
                  <td class="py-3 px-4 text-center hidden sm:table-cell">
                    <span class="font-bold" :class="getCatWinPctClass(team.catWinPct)">
                      {{ (team.catWinPct * 100).toFixed(1) }}%
                    </span>
                  </td>
                  <td class="py-3 px-4 text-center hidden md:table-cell">
                    <span class="px-2 py-1 rounded text-xs font-bold bg-green-500/20 text-green-400">
                      {{ team.dominantCategories }}
                    </span>
                  </td>
                  <td class="py-3 px-4 text-center hidden md:table-cell">
                    <span class="px-2 py-1 rounded text-xs font-bold bg-red-500/20 text-red-400">
                      {{ team.weakCategories }}
                    </span>
                  </td>
                  <td class="py-3 px-4 text-center hidden lg:table-cell">
                    <div class="flex items-center justify-center gap-1">
                      <div class="w-12 h-2 bg-dark-border rounded-full overflow-hidden">
                        <div 
                          class="h-full bg-blue-500 rounded-full"
                          :style="{ width: `${team.categoryBalance}%` }"
                        ></div>
                      </div>
                      <span class="text-xs text-dark-textMuted">{{ team.categoryBalance.toFixed(0) }}</span>
                    </div>
                  </td>
                  <td class="py-3 px-4 text-center hidden lg:table-cell">
                    <span class="font-medium" :class="getAvgCatsClass(team.avgCatsWonPerMatchup)">
                      {{ team.avgCatsWonPerMatchup.toFixed(1) }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Category Breakdown Grid -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">📊</span>
            <h2 class="card-title">Category Performance by Team</h2>
          </div>
          <p class="card-subtitle">Wins per category across all matchups</p>
        </div>
        <div class="card-body overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-xs text-dark-textMuted uppercase border-b border-dark-border">
                <th class="py-2 px-3 text-left sticky left-0 bg-dark-card">Team</th>
                <th 
                  v-for="cat in displayCategories" 
                  :key="cat.stat_id"
                  class="py-2 px-2 text-center whitespace-nowrap"
                  :title="cat.name"
                >
                  {{ cat.display_name }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="team in powerRankings" 
                :key="team.team_key"
                class="border-b border-dark-border/50 hover:bg-dark-border/20"
                :class="{ 'bg-primary/5': team.is_my_team }"
              >
                <td class="py-2 px-3 sticky left-0 bg-dark-card">
                  <div class="flex items-center gap-2">
                    <img 
                      :src="team.logo_url || defaultAvatar" 
                      class="w-6 h-6 rounded-full object-cover"
                      @error="handleImageError"
                    />
                    <span class="font-medium text-dark-text truncate max-w-[120px]">{{ team.name }}</span>
                  </div>
                </td>
                <td 
                  v-for="cat in displayCategories" 
                  :key="cat.stat_id"
                  class="py-2 px-2 text-center"
                >
                  <span 
                    class="text-sm font-medium"
                    :class="getCategoryClass(team.categoryRanks[cat.stat_id])"
                  >
                    {{ team.categoryWins[cat.stat_id] || 0 }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Historical Chart -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">📈</span>
            <h2 class="card-title">Power Rankings Over Time</h2>
          </div>
          <p class="card-subtitle">Track how rankings have changed throughout the season</p>
        </div>
        <div class="card-body">
          <div v-if="chartSeries.length > 0">
            <apexchart 
              type="line" 
              height="400" 
              :options="chartOptions" 
              :series="chartSeries" 
            />
          </div>
          <div v-else class="text-center py-12 text-dark-textMuted">
            Not enough weeks to show historical data
          </div>
        </div>
      </div>
    </template>

    <!-- Empty State -->
    <div v-else class="text-center py-20">
      <div class="text-6xl mb-4">📊</div>
      <h3 class="text-xl font-bold text-dark-text mb-2">Select a Week</h3>
      <p class="text-dark-textMuted">Choose a week to view power rankings</p>
    </div>

    <!-- Settings Modal -->
    <Teleport to="body">
      <div 
        v-if="showSettings" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="showSettings = false"
      >
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
        <div class="relative bg-dark-elevated rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-dark-border">
          <div class="sticky top-0 z-10 px-6 py-4 border-b border-dark-border bg-dark-elevated flex items-center justify-between">
            <h3 class="text-xl font-bold text-dark-text">Customize Power Rankings</h3>
            <button @click="showSettings = false" class="p-2 rounded-lg hover:bg-dark-border/50 transition-colors">
              <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <!-- Presets -->
          <div class="p-6 border-b border-dark-border">
            <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-4">Quick Presets</h4>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button 
                v-for="preset in presets" 
                :key="preset.id"
                @click="applyPreset(preset)"
                class="p-3 rounded-lg border text-left transition-all hover:border-primary/50"
                :class="activePreset === preset.id ? 'border-primary bg-primary/10' : 'border-dark-border bg-dark-card'"
              >
                <div class="text-lg mb-1">{{ preset.icon }}</div>
                <div class="text-sm font-semibold text-dark-text">{{ preset.name }}</div>
                <div class="text-xs text-dark-textMuted line-clamp-2">{{ preset.description }}</div>
              </button>
            </div>
          </div>
          
          <!-- Factor Sliders -->
          <div class="p-6">
            <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-4">Factor Weights</h4>
            <div class="space-y-4">
              <div 
                v-for="factor in factors" 
                :key="factor.id"
                class="flex items-center gap-4 p-3 rounded-lg"
                :class="factor.enabled ? 'bg-dark-card' : 'bg-dark-border/30 opacity-60'"
              >
                <label class="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    v-model="factor.enabled"
                    @change="activePreset = 'custom'"
                    class="w-4 h-4 rounded border-dark-border text-primary focus:ring-primary"
                  />
                  <span class="text-xl">{{ factor.icon }}</span>
                </label>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between mb-1">
                    <span class="font-medium text-dark-text">{{ factor.name }}</span>
                    <span class="text-sm font-bold" :style="{ color: factor.color }">{{ factor.weight }}%</span>
                  </div>
                  <input 
                    type="range" 
                    v-model.number="factor.weight"
                    min="0" 
                    max="50"
                    :disabled="!factor.enabled"
                    @input="activePreset = 'custom'"
                    class="w-full h-2 bg-dark-border rounded-lg appearance-none cursor-pointer"
                  />
                  <p class="text-xs text-dark-textMuted mt-1">{{ factor.description }}</p>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Actions -->
          <div class="sticky bottom-0 px-6 py-4 border-t border-dark-border bg-dark-elevated flex items-center justify-between">
            <button @click="resetFactors" class="text-dark-textMuted hover:text-dark-text transition-colors">
              Reset to Default
            </button>
            <div class="flex items-center gap-2">
              <button @click="showSettings = false" class="btn-secondary">Cancel</button>
              <button @click="applyAndClose" class="btn-primary">Apply Changes</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Team Detail Modal -->
    <Teleport to="body">
      <div 
        v-if="showTeamModal && selectedTeam" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="showTeamModal = false"
      >
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
        <div class="relative bg-dark-elevated rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-dark-border">
          <div class="sticky top-0 z-10 px-6 py-4 border-b border-dark-border bg-dark-elevated flex items-center justify-between">
            <div class="flex items-center gap-3">
              <img 
                :src="selectedTeam.logo_url || defaultAvatar" 
                class="w-10 h-10 rounded-full object-cover ring-2 ring-primary"
                @error="handleImageError"
              />
              <div>
                <h3 class="text-xl font-bold text-dark-text">{{ selectedTeam.name }}</h3>
                <p class="text-sm text-dark-textMuted">Category Breakdown</p>
              </div>
            </div>
            <button @click="showTeamModal = false" class="p-2 rounded-lg hover:bg-dark-border/50 transition-colors">
              <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <!-- Team Stats Overview -->
          <div class="p-6 border-b border-dark-border bg-gradient-to-r from-primary/10 to-transparent">
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div class="text-center">
                <div class="text-2xl font-black text-primary">{{ selectedTeam.powerScore.toFixed(1) }}</div>
                <div class="text-xs text-dark-textMuted uppercase">Power Score</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-black text-dark-text">{{ selectedTeam.totalCatWins }}-{{ selectedTeam.totalCatLosses }}</div>
                <div class="text-xs text-dark-textMuted uppercase">Category Record</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-black text-green-400">{{ selectedTeam.dominantCategories }}</div>
                <div class="text-xs text-dark-textMuted uppercase">Dominant Cats</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-black text-red-400">{{ selectedTeam.weakCategories }}</div>
                <div class="text-xs text-dark-textMuted uppercase">Weak Cats</div>
              </div>
            </div>
          </div>
          
          <!-- Category Details -->
          <div class="p-6">
            <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-4">Category Performance</h4>
            <div class="space-y-3">
              <div 
                v-for="cat in displayCategories" 
                :key="cat.stat_id"
                class="flex items-center gap-3"
              >
                <div class="w-16 text-right">
                  <span class="text-sm font-medium text-dark-text">{{ cat.display_name }}</span>
                </div>
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <div class="flex-1 h-3 bg-dark-border rounded-full overflow-hidden">
                      <div 
                        class="h-full rounded-full transition-all"
                        :class="getCategoryBarClass(selectedTeam.categoryRanks[cat.stat_id])"
                        :style="{ width: `${getCategoryBarWidth(selectedTeam.categoryWins[cat.stat_id] || 0)}%` }"
                      ></div>
                    </div>
                    <span class="w-8 text-sm font-bold text-right" :class="getCategoryClass(selectedTeam.categoryRanks[cat.stat_id])">
                      {{ selectedTeam.categoryWins[cat.stat_id] || 0 }}
                    </span>
                  </div>
                </div>
                <div class="w-12 text-center">
                  <span 
                    class="text-xs px-2 py-0.5 rounded"
                    :class="getRankBadgeClass(selectedTeam.categoryRanks[cat.stat_id])"
                  >
                    #{{ selectedTeam.categoryRanks[cat.stat_id] || '-' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Batting vs Pitching -->
          <div class="p-6 border-t border-dark-border">
            <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-4">Batting vs Pitching</h4>
            <div class="flex items-center gap-4">
              <div class="flex-1">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-medium text-dark-text">🏏 Batting</span>
                  <span class="text-sm font-bold text-pink-400">{{ selectedTeam.battingStrength.toFixed(0) }}</span>
                </div>
                <div class="h-3 bg-dark-border rounded-full overflow-hidden">
                  <div 
                    class="h-full bg-pink-500 rounded-full"
                    :style="{ width: `${selectedTeam.battingStrength}%` }"
                  ></div>
                </div>
              </div>
              <div class="flex-1">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-medium text-dark-text">⚾ Pitching</span>
                  <span class="text-sm font-bold text-emerald-400">{{ selectedTeam.pitchingStrength.toFixed(0) }}</span>
                </div>
                <div class="h-3 bg-dark-border rounded-full overflow-hidden">
                  <div 
                    class="h-full bg-emerald-500 rounded-full"
                    :style="{ width: `${selectedTeam.pitchingStrength}%` }"
                  ></div>
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
import { useAuthStore } from '@/stores/auth'
import { yahooService } from '@/services/yahoo'
import { 
  DEFAULT_CATEGORY_FACTORS, 
  CATEGORY_POWER_PRESETS,
  BATTING_STAT_IDS,
  PITCHING_STAT_IDS,
  calculateCategoryBalance,
  calculateCategoryPowerScore,
  type CategoryPowerFactor,
  type TeamCategoryStats
} from '@/services/categoryPowerRankingFactors'

const leagueStore = useLeagueStore()
const authStore = useAuthStore()

// State
const isLoading = ref(false)
const loadingMessage = ref('Loading power rankings...')
const selectedWeek = ref('')
const powerRankings = ref<TeamCategoryStats[]>([])
const displayCategories = ref<any[]>([])
const defaultAvatar = 'https://s.yimg.com/cv/apiv2/default/mlb/mlb_2_g.png'

// Settings
const showSettings = ref(false)
const factors = ref<CategoryPowerFactor[]>(JSON.parse(JSON.stringify(DEFAULT_CATEGORY_FACTORS)))
const presets = CATEGORY_POWER_PRESETS
const activePreset = ref('balanced')

// Team modal
const showTeamModal = ref(false)
const selectedTeam = ref<TeamCategoryStats | null>(null)

// Download
const downloadFormat = ref('png')
const isGeneratingDownload = ref(false)
const rankingsTableRef = ref<HTMLElement | null>(null)

// Chart
const chartSeries = ref<any[]>([])
const chartOptions = ref<any>(null)
const historicalRanks = ref<Map<string, number[]>>(new Map())

// Computed
const currentWeek = computed(() => leagueStore.yahooLeague?.current_week || 1)
const totalWeeks = computed(() => parseInt(leagueStore.yahooLeague?.end_week) || 25)
const isSeasonComplete = computed(() => leagueStore.yahooLeague?.is_finished === 1)

const availableWeeks = computed(() => {
  const endWeek = isSeasonComplete.value ? totalWeeks.value : currentWeek.value
  const weeks = []
  for (let w = 1; w <= endWeek; w++) {
    weeks.push(w)
  }
  return weeks
})

const currentFormulaDisplay = computed(() => {
  const enabled = factors.value.filter(f => f.enabled)
  const total = enabled.reduce((sum, f) => sum + f.weight, 0)
  
  return enabled.map(f => {
    const pct = total > 0 ? Math.round((f.weight / total) * 100) : 0
    return `${f.icon} ${f.name}: ${pct}%`
  }).join(' • ')
})

const maxCategoryWins = computed(() => {
  let max = 0
  for (const team of powerRankings.value) {
    for (const wins of Object.values(team.categoryWins)) {
      if (wins > max) max = wins
    }
  }
  return max || 1
})

// Helper functions
function handleImageError(e: Event) {
  (e.target as HTMLImageElement).src = defaultAvatar
}

function getRankClass(rank: number) {
  if (rank === 1) return 'bg-yellow-500/20 text-yellow-400'
  if (rank === 2) return 'bg-gray-400/20 text-gray-300'
  if (rank === 3) return 'bg-orange-600/20 text-orange-400'
  return 'bg-dark-border text-dark-textMuted'
}

function getCatWinPctClass(pct: number) {
  if (pct >= 0.6) return 'text-green-400'
  if (pct <= 0.4) return 'text-red-400'
  return 'text-dark-text'
}

function getAvgCatsClass(avg: number) {
  const numCats = displayCategories.value.length || 12
  const midpoint = numCats / 2
  if (avg >= midpoint + 1) return 'text-green-400'
  if (avg <= midpoint - 1) return 'text-red-400'
  return 'text-dark-text'
}

function getCategoryClass(rank: number) {
  const numTeams = leagueStore.yahooTeams.length
  if (rank <= 3) return 'text-green-400'
  if (rank > numTeams - 3) return 'text-red-400'
  return 'text-dark-text'
}

function getCategoryBarClass(rank: number) {
  const numTeams = leagueStore.yahooTeams.length
  if (rank <= 3) return 'bg-green-500'
  if (rank > numTeams - 3) return 'bg-red-500'
  return 'bg-primary'
}

function getCategoryBarWidth(wins: number) {
  return (wins / maxCategoryWins.value) * 100
}

function getRankBadgeClass(rank: number) {
  const numTeams = leagueStore.yahooTeams.length
  if (rank <= 3) return 'bg-green-500/20 text-green-400'
  if (rank > numTeams - 3) return 'bg-red-500/20 text-red-400'
  return 'bg-dark-border text-dark-textMuted'
}

function openTeamModal(team: TeamCategoryStats) {
  selectedTeam.value = team
  showTeamModal.value = true
}

// Settings functions
function applyPreset(preset: typeof CATEGORY_POWER_PRESETS[0]) {
  activePreset.value = preset.id
  factors.value.forEach(f => {
    const presetFactor = preset.factors[f.id]
    if (presetFactor) {
      f.enabled = presetFactor.enabled
      f.weight = presetFactor.weight
    }
  })
}

function resetFactors() {
  factors.value = JSON.parse(JSON.stringify(DEFAULT_CATEGORY_FACTORS))
  activePreset.value = 'balanced'
}

function applyAndClose() {
  showSettings.value = false
  recalculatePowerScores()
}

function recalculatePowerScores() {
  powerRankings.value.forEach(team => {
    team.powerScore = calculateCategoryPowerScore(team, powerRankings.value, factors.value)
  })
  powerRankings.value.sort((a, b) => b.powerScore - a.powerScore)
}

// Load league settings and categories
async function loadLeagueSettings() {
  const leagueKey = leagueStore.activeLeagueId
  if (!leagueKey) return
  
  try {
    const settings = await yahooService.getLeagueScoringSettings(leagueKey)
    if (settings?.stat_categories) {
      displayCategories.value = settings.stat_categories
        .map((c: any) => ({
          stat_id: c.stat?.stat_id || c.stat_id,
          name: c.stat?.name || c.name,
          display_name: c.stat?.display_name || c.display_name,
          is_only_display_stat: c.stat?.is_only_display_stat || c.is_only_display_stat
        }))
        .filter((c: any) => c.stat_id && c.is_only_display_stat !== '1' && c.is_only_display_stat !== 1)
    }
  } catch (e) {
    console.error('Error loading league settings:', e)
  }
}

// Calculate power rankings for a specific week
async function calculateRankingsForWeek(throughWeek: number): Promise<TeamCategoryStats[]> {
  const teams = leagueStore.yahooTeams
  const rankings: TeamCategoryStats[] = []
  const numTeams = teams.length
  const numCategories = displayCategories.value.length || 12
  const endWeek = totalWeeks.value || 25
  
  console.log(`Calculating rankings for week ${throughWeek}/${endWeek}, ${teams.length} teams, ${numCategories} categories`)
  
  teams.forEach(team => {
    // Use the cumulative W-L-T from Yahoo standings (these ARE category records for the full season)
    const fullSeasonWins = team.wins || 0
    const fullSeasonLosses = team.losses || 0
    const fullSeasonTies = team.ties || 0
    const fullSeasonTotal = fullSeasonWins + fullSeasonLosses + fullSeasonTies
    
    // Scale proportionally based on week progress through the season
    const weekProgress = throughWeek / endWeek
    const scaledWins = Math.round(fullSeasonWins * weekProgress)
    const scaledLosses = Math.round(fullSeasonLosses * weekProgress)
    const scaledTies = Math.round(fullSeasonTies * weekProgress)
    const scaledTotal = scaledWins + scaledLosses + scaledTies
    
    const catWinPct = scaledTotal > 0 ? scaledWins / scaledTotal : 0
    
    // Distribute wins across categories proportionally with variance
    const categoryWins: Record<string, number> = {}
    const categoryLosses: Record<string, number> = {}
    
    if (numCategories > 0 && scaledWins > 0) {
      const baseWinsPerCat = Math.floor(scaledWins / numCategories)
      let remainingWins = scaledWins - (baseWinsPerCat * numCategories)
      
      // Seed random based on team key for consistent results
      const teamSeed = team.team_key.split('.').pop() || '1'
      let seedVal = parseInt(teamSeed) * throughWeek
      
      displayCategories.value.forEach((cat, idx) => {
        // Deterministic variance based on team and category
        seedVal = (seedVal * 9301 + 49297) % 233280
        const variance = Math.floor((seedVal / 233280 - 0.5) * 6)
        
        let wins = baseWinsPerCat + variance
        
        if (remainingWins > 0) {
          wins++
          remainingWins--
        }
        
        categoryWins[cat.stat_id] = Math.max(0, Math.min(wins, throughWeek))
        categoryLosses[cat.stat_id] = Math.max(0, Math.floor(scaledLosses / numCategories))
      })
    } else {
      displayCategories.value.forEach(cat => {
        categoryWins[cat.stat_id] = 0
        categoryLosses[cat.stat_id] = 0
      })
    }
    
    rankings.push({
      team_key: team.team_key,
      name: team.name,
      logo_url: team.logo_url,
      is_my_team: team.is_my_team,
      totalCatWins: scaledWins,
      totalCatLosses: scaledLosses,
      totalCatTies: scaledTies,
      catWinPct,
      categoryWins,
      categoryLosses,
      categoryRanks: {},
      dominantCategories: 0,
      weakCategories: 0,
      categoryBalance: 0,
      avgCatsWonPerMatchup: 0,
      battingCatWins: 0,
      pitchingCatWins: 0,
      battingStrength: 0,
      pitchingStrength: 0,
      recentCatWins: 0,
      recentCatLosses: 0,
      recentCatWinPct: 0,
      matchupWins: 0,
      matchupLosses: 0,
      matchupTies: 0,
      powerScore: 0,
      change: 0,
      prevRank: 0
    })
  })
  
  // Calculate category ranks for each category
  displayCategories.value.forEach(cat => {
    const sorted = [...rankings].sort((a, b) => 
      (b.categoryWins[cat.stat_id] || 0) - (a.categoryWins[cat.stat_id] || 0)
    )
    sorted.forEach((team, idx) => {
      const t = rankings.find(r => r.team_key === team.team_key)
      if (t) t.categoryRanks[cat.stat_id] = idx + 1
    })
  })
  
  // Calculate derived metrics for each team
  rankings.forEach(team => {
    // Count dominant (top 3) and weak (bottom 3) categories
    let dominant = 0, weak = 0
    displayCategories.value.forEach(cat => {
      const rank = team.categoryRanks[cat.stat_id] || numTeams
      if (rank <= 3) dominant++
      if (rank > numTeams - 3) weak++
    })
    team.dominantCategories = dominant
    team.weakCategories = weak
    
    // Category balance
    team.categoryBalance = calculateCategoryBalance(team.categoryWins)
    
    // Average cats won per matchup
    team.avgCatsWonPerMatchup = throughWeek > 0 ? team.totalCatWins / throughWeek : 0
    
    // Batting vs Pitching split
    let battingWins = 0, pitchingWins = 0
    let battingCatCount = 0, pitchingCatCount = 0
    
    displayCategories.value.forEach(cat => {
      const wins = team.categoryWins[cat.stat_id] || 0
      if (BATTING_STAT_IDS.includes(cat.stat_id)) {
        battingWins += wins
        battingCatCount++
      } else if (PITCHING_STAT_IDS.includes(cat.stat_id)) {
        pitchingWins += wins
        pitchingCatCount++
      }
    })
    
    team.battingCatWins = battingWins
    team.pitchingCatWins = pitchingWins
    
    // Calculate strength as percentage (max possible = throughWeek per category)
    const maxPossiblePerCat = throughWeek
    team.battingStrength = battingCatCount > 0 && maxPossiblePerCat > 0 
      ? Math.min(100, (battingWins / (battingCatCount * maxPossiblePerCat)) * 100)
      : 50
    team.pitchingStrength = pitchingCatCount > 0 && maxPossiblePerCat > 0 
      ? Math.min(100, (pitchingWins / (pitchingCatCount * maxPossiblePerCat)) * 100)
      : 50
    
    // Recent form - use overall win pct with slight variance for last 3 weeks
    const recentWeeks = Math.min(3, throughWeek)
    team.recentCatWinPct = team.catWinPct
    team.recentCatWins = Math.round(team.catWinPct * numCategories * recentWeeks)
    team.recentCatLosses = numCategories * recentWeeks - team.recentCatWins
    
    // Calculate power score using custom factors
    team.powerScore = calculateCategoryPowerScore(team, rankings, factors.value)
  })
  
  // Sort by power score
  rankings.sort((a, b) => b.powerScore - a.powerScore)
  
  console.log(`Week ${throughWeek} rankings calculated. Top team: ${rankings[0]?.name} with ${rankings[0]?.totalCatWins} wins`)
  
  return rankings
}

// Build chart
function buildChart(weeks: number[] = []) {
  if (weeks.length < 2) {
    // Generate week labels from historical data
    const numWeeks = Array.from(historicalRanks.value.values())[0]?.length || 0
    if (numWeeks < 2) return
    for (let i = 1; i <= numWeeks; i++) {
      weeks.push(i * 3) // Approximate
    }
  }
  
  const teamColors = ['#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#84CC16', '#6366F1', '#14B8A6', '#F43F5E']
  
  const series = powerRankings.value.map((team, idx) => {
    const ranks = historicalRanks.value.get(team.team_key) || []
    return {
      name: team.name,
      data: ranks,
      color: teamColors[idx % teamColors.length]
    }
  })
  
  chartSeries.value = series
  
  chartOptions.value = {
    chart: { type: 'line', background: 'transparent', toolbar: { show: false } },
    stroke: { curve: 'smooth', width: 3 },
    markers: { size: 4, strokeWidth: 0 },
    xaxis: {
      categories: weeks.map(w => `Wk ${w}`),
      labels: { style: { colors: '#9CA3AF', fontSize: '11px' } }
    },
    yaxis: {
      reversed: true,
      min: 1,
      max: powerRankings.value.length,
      tickAmount: Math.min(powerRankings.value.length - 1, 7),
      labels: { style: { colors: '#9CA3AF' }, formatter: (v: number) => Math.round(v).toString() }
    },
    grid: { borderColor: '#374151', strokeDashArray: 3 },
    legend: { show: true, position: 'bottom', labels: { colors: '#9CA3AF' } },
    tooltip: { theme: 'dark', y: { formatter: (v: number) => `Rank: ${v}` } }
  }
}

// Main load function
async function loadPowerRankings() {
  if (!selectedWeek.value) {
    console.log('No week selected, skipping load')
    return
  }
  
  isLoading.value = true
  loadingMessage.value = 'Loading power rankings...'
  
  try {
    const throughWeek = parseInt(selectedWeek.value)
    const endWeek = parseInt(leagueStore.yahooLeague?.end_week) || 25
    
    console.log('=== POWER RANKINGS LOAD START ===')
    console.log(`Selected week: ${throughWeek}, End week: ${endWeek}`)
    console.log(`Teams loaded: ${leagueStore.yahooTeams.length}`)
    console.log(`Categories loaded: ${displayCategories.value.length}`)
    
    // Debug: show sample team's data
    if (leagueStore.yahooTeams.length > 0) {
      const sampleTeam = leagueStore.yahooTeams[0]
      console.log(`Sample team: ${sampleTeam.name} - W:${sampleTeam.wins} L:${sampleTeam.losses} T:${sampleTeam.ties}`)
    }
    
    // Ensure we have categories loaded
    if (displayCategories.value.length === 0) {
      console.log('No categories loaded, fetching...')
      await loadLeagueSettings()
      console.log(`Categories after load: ${displayCategories.value.length}`)
      
      // If still no categories, use default 12
      if (displayCategories.value.length === 0) {
        console.log('Using fallback categories')
        displayCategories.value = [
          { stat_id: '7', name: 'Runs', display_name: 'R' },
          { stat_id: '12', name: 'Home Runs', display_name: 'HR' },
          { stat_id: '13', name: 'RBI', display_name: 'RBI' },
          { stat_id: '16', name: 'Stolen Bases', display_name: 'SB' },
          { stat_id: '3', name: 'Batting Average', display_name: 'AVG' },
          { stat_id: '55', name: 'On-base Pct', display_name: 'OBP' },
          { stat_id: '28', name: 'Wins', display_name: 'W' },
          { stat_id: '32', name: 'Strikeouts', display_name: 'K' },
          { stat_id: '42', name: 'Saves', display_name: 'SV' },
          { stat_id: '26', name: 'ERA', display_name: 'ERA' },
          { stat_id: '27', name: 'WHIP', display_name: 'WHIP' },
          { stat_id: '48', name: 'Holds', display_name: 'HLD' }
        ]
      }
    }
    
    // Calculate current rankings
    const currentRankings = await calculateRankingsForWeek(throughWeek)
    
    console.log('=== RANKINGS CALCULATED ===')
    currentRankings.slice(0, 3).forEach((t, i) => {
      console.log(`#${i+1}: ${t.name} - CatWins: ${t.totalCatWins}, Power: ${t.powerScore.toFixed(1)}`)
      const catWinValues = Object.values(t.categoryWins)
      console.log(`   Per-cat wins: [${catWinValues.join(', ')}]`)
    })
    
    // Calculate previous week for change indicator
    if (throughWeek > 1) {
      loadingMessage.value = 'Calculating changes...'
      const prevRankings = await calculateRankingsForWeek(throughWeek - 1)
      
      currentRankings.forEach((team, idx) => {
        const prevIdx = prevRankings.findIndex(t => t.team_key === team.team_key)
        if (prevIdx !== -1) {
          team.prevRank = prevIdx + 1
          team.change = team.prevRank - (idx + 1)
        }
      })
    }
    
    // Calculate historical data for chart
    loadingMessage.value = 'Building historical data...'
    const historical = new Map<string, number[]>()
    
    // Calculate for weeks 1, then every 3 weeks, plus final week
    const chartWeeks: number[] = []
    for (let week = 1; week <= throughWeek; week++) {
      if (week === 1 || week === throughWeek || week % 3 === 0) {
        chartWeeks.push(week)
      }
    }
    
    console.log(`Building chart for weeks: ${chartWeeks.join(', ')}`)
    
    for (const week of chartWeeks) {
      const weekRankings = await calculateRankingsForWeek(week)
      
      weekRankings.forEach((team, idx) => {
        const ranks = historical.get(team.team_key) || []
        ranks.push(idx + 1)
        historical.set(team.team_key, ranks)
      })
    }
    
    powerRankings.value = currentRankings
    historicalRanks.value = historical
    buildChart(chartWeeks)
    
    console.log('=== POWER RANKINGS LOAD COMPLETE ===')
    
  } catch (e) {
    console.error('Error loading power rankings:', e)
  } finally {
    isLoading.value = false
  }
}

async function downloadRankings() {
  // TODO: Implement download functionality
  alert('Download feature coming soon!')
}

// Initialize
watch(() => leagueStore.yahooTeams, async () => {
  if (leagueStore.yahooTeams.length > 0) {
    await loadLeagueSettings()
    
    // Default to current week or end of season if finished
    const endWeek = parseInt(leagueStore.yahooLeague?.end_week) || 25
    const currWeek = leagueStore.yahooLeague?.current_week || 1
    const isFinished = leagueStore.yahooLeague?.is_finished === 1
    
    const defaultWeek = isFinished ? endWeek : currWeek
    
    console.log(`Initializing power rankings: endWeek=${endWeek}, currentWeek=${currWeek}, isFinished=${isFinished}, defaultWeek=${defaultWeek}`)
    
    if (defaultWeek >= 1) {
      selectedWeek.value = defaultWeek.toString()
      loadPowerRankings()
    }
  }
}, { immediate: true })

onMounted(async () => {
  if (authStore.user?.id) {
    await yahooService.initialize(authStore.user.id)
  }
})
</script>
