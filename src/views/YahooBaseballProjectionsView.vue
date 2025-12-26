<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="text-3xl font-bold text-dark-text mb-2">Player Projections</h1>
        <p class="text-base text-dark-textMuted">
          Rest of season rankings with position-adjusted value analysis
        </p>
      </div>
      <div class="flex items-center gap-3">
        <!-- Settings Gear -->
        <button 
          @click="showSettingsModal = true" 
          class="p-2 rounded-lg hover:bg-dark-border/50 transition-colors" 
          title="Projection Settings"
        >
          <svg class="w-6 h-6 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="flex gap-2">
      <button
        v-for="tab in tabs"
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
        <p class="text-dark-textMuted">Loading projections...</p>
      </div>
    </div>

    <!-- REST OF SEASON TAB -->
    <template v-else-if="activeTab === 'ros'">
      <!-- Custom Rankings Indicator -->
      <div v-if="hasCustomRankings" class="card bg-primary/10 border-primary/30">
        <div class="card-body py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="text-2xl">✓</span>
              <div>
                <h3 class="font-semibold text-primary">Using Custom Rankings</h3>
                <p class="text-sm text-dark-textMuted">
                  {{ customRankingsCount }} players loaded
                </p>
              </div>
            </div>
            <button @click="clearCustomRankings" class="px-4 py-2 rounded-lg bg-dark-card hover:bg-dark-border/50 text-dark-text font-medium transition-colors">
              Reset to Default Rankings
            </button>
          </div>
        </div>
      </div>

      <!-- Ranking Customizer Panel -->
      <div v-if="!hasCustomRankings" class="card bg-gradient-to-br from-dark-card to-dark-border/30 border border-primary/20">
        <div class="card-header cursor-pointer" @click="isCustomizerExpanded = !isCustomizerExpanded">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="text-2xl">🎛️</span>
              <div>
                <h2 class="card-title text-lg">Customize Your Rankings</h2>
                <p class="text-sm text-dark-textMuted">
                  {{ enabledFactorCount }} factors enabled • {{ activePresetName }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <div class="flex gap-1">
                <button
                  v-for="preset in presets.slice(0, 4)"
                  :key="preset.id"
                  @click.stop="applyPreset(preset)"
                  :class="activePresetId === preset.id ? 'bg-primary text-gray-900' : 'bg-dark-border/50 text-dark-textMuted hover:bg-dark-border'"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                >
                  {{ preset.icon }} {{ preset.name }}
                </button>
              </div>
              <svg 
                class="w-5 h-5 text-dark-textMuted transition-transform" 
                :class="{ 'rotate-180': isCustomizerExpanded }"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
        
        <div v-if="isCustomizerExpanded" class="card-body pt-0 space-y-6">
          <!-- Factor Categories Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <!-- Core Factors -->
            <div class="bg-dark-bg/50 rounded-xl p-4">
              <h3 class="font-semibold text-dark-text mb-3 flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-green-500"></span>
                Core
              </h3>
              <div class="space-y-3">
                <div v-for="factor in coreFactors" :key="factor.id" class="flex items-center justify-between">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      :checked="factor.enabled" 
                      @change="toggleFactor(factor.id)"
                      :disabled="factor.id === 'baseProjection'"
                      class="rounded accent-primary w-4 h-4"
                    />
                    <span class="text-sm text-dark-text">{{ factor.name }}</span>
                  </label>
                  <input 
                    v-if="factor.enabled"
                    type="range" 
                    :value="factor.weight" 
                    @input="updateWeight(factor.id, Number(($event.target as HTMLInputElement).value))"
                    min="0" max="100" 
                    class="w-16 h-1 accent-primary"
                  />
                </div>
              </div>
            </div>

            <!-- Performance Factors -->
            <div class="bg-dark-bg/50 rounded-xl p-4">
              <h3 class="font-semibold text-dark-text mb-3 flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-blue-500"></span>
                Performance
              </h3>
              <div class="space-y-3">
                <div v-for="factor in performanceFactors" :key="factor.id" class="flex items-center justify-between">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      :checked="factor.enabled" 
                      @change="toggleFactor(factor.id)"
                      class="rounded accent-primary w-4 h-4"
                    />
                    <span class="text-sm text-dark-text">{{ factor.name }}</span>
                  </label>
                  <input 
                    v-if="factor.enabled"
                    type="range" 
                    :value="factor.weight" 
                    @input="updateWeight(factor.id, Number(($event.target as HTMLInputElement).value))"
                    min="0" max="100" 
                    class="w-16 h-1 accent-primary"
                  />
                </div>
              </div>
            </div>

            <!-- Schedule Factors -->
            <div class="bg-dark-bg/50 rounded-xl p-4">
              <h3 class="font-semibold text-dark-text mb-3 flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-yellow-500"></span>
                Schedule
              </h3>
              <div class="space-y-3">
                <div v-for="factor in scheduleFactors" :key="factor.id" class="flex items-center justify-between">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      :checked="factor.enabled" 
                      @change="toggleFactor(factor.id)"
                      class="rounded accent-primary w-4 h-4"
                    />
                    <span class="text-sm text-dark-text">{{ factor.name }}</span>
                  </label>
                  <input 
                    v-if="factor.enabled"
                    type="range" 
                    :value="factor.weight" 
                    @input="updateWeight(factor.id, Number(($event.target as HTMLInputElement).value))"
                    min="0" max="100" 
                    class="w-16 h-1 accent-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center justify-between pt-2 border-t border-dark-border/30">
            <div class="text-sm text-dark-textMuted">
              <span class="text-primary font-semibold">{{ enabledFactorCount }}</span> factors will influence rankings
            </div>
            <div class="flex items-center gap-3">
              <button @click="resetFactors" class="px-4 py-2 rounded-lg bg-dark-border/50 text-dark-textMuted hover:bg-dark-border transition-colors">
                Reset
              </button>
              <button @click="applyRankings" class="px-6 py-2 rounded-lg bg-primary text-gray-900 font-semibold hover:bg-primary/90 transition-colors">
                Apply Rankings
              </button>
            </div>
          </div>
        </div>
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
          </div>
        </div>
      </div>

      <!-- Rankings Table -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">📊</span>
            <h2 class="card-title">
              Rest of Season Rankings
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
                  <th class="px-4 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-32">Team Owner</th>
                  <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-16">Pos</th>
                  <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-20">Pos Rank</th>
                  <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-16">Δ</th>
                  <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-24 cursor-pointer hover:text-dark-text" @click="sortBy('rosSOS')">
                    ROS SOS
                    <span v-if="sortColumn === 'rosSOS'" class="ml-1">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                  </th>
                  <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-24 cursor-pointer hover:text-dark-text" @click="sortBy('next4SOS')">
                    Next 4
                    <span v-if="sortColumn === 'next4SOS'" class="ml-1">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                  </th>
                  <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-20 cursor-pointer hover:text-dark-text" @click="sortBy('ppg')">
                    PPG
                    <span v-if="sortColumn === 'ppg'" class="ml-1">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                  </th>
                  <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-20 cursor-pointer hover:text-dark-text" @click="sortBy('vor')">
                    VOR
                    <span v-if="sortColumn === 'vor'" class="ml-1">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-dark-border/30">
                <template v-for="(player, index) in filteredPlayers" :key="player.player_id">
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
                          <div class="text-xs text-dark-textMuted">
                            {{ player.mlb_team || 'FA' }}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td class="px-4 py-3">
                      <span v-if="getFantasyOwner(player.player_id)" class="text-sm text-dark-textMuted">
                        {{ getFantasyOwner(player.player_id) }}
                      </span>
                      <span v-else class="text-sm text-cyan-400">Free Agent</span>
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
                    <td class="px-4 py-3 text-center">
                      <span class="font-bold" :class="player.vor > 0 ? 'text-green-400' : player.vor < -2 ? 'text-red-400' : 'text-primary'">
                        {{ player.vor >= 0 ? '+' : '' }}{{ player.vor.toFixed(1) }}
                      </span>
                    </td>
                  </tr>
                  
                  <!-- Expanded Player Detail -->
                  <tr v-if="expandedPlayerId === player.player_id" class="bg-dark-bg/80">
                    <td colspan="10" class="p-0">
                      <div class="p-4 space-y-4 border-y border-primary/30">
                        <!-- Header Row -->
                        <div class="flex items-start justify-between">
                          <div class="flex items-center gap-4">
                            <div class="w-16 h-16 rounded-full bg-dark-border overflow-hidden ring-2 ring-primary/50">
                              <img :src="getPlayerImageUrl(player.player_id)" :alt="player.full_name" class="w-full h-full object-cover" @error="handleImageError" />
                            </div>
                            <div>
                              <h3 class="text-xl font-bold text-dark-text">{{ player.full_name }}</h3>
                              <div class="flex items-center gap-3 text-sm text-dark-textMuted">
                                <span class="px-2 py-0.5 rounded text-xs font-bold" :class="getPositionClass(player.position)">{{ player.position }}</span>
                                <span>{{ player.mlb_team || 'FA' }}</span>
                              </div>
                            </div>
                          </div>
                          <button @click.stop="expandedPlayerId = null" class="p-2 hover:bg-dark-border/50 rounded-lg transition-colors">
                            <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        <!-- Stats Grid -->
                        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                          <div class="bg-dark-card rounded-lg p-3 text-center">
                            <div class="text-2xl font-bold text-primary">#{{ player.rosRank }}</div>
                            <div class="text-xs text-dark-textMuted">Overall Rank</div>
                          </div>
                          <div class="bg-dark-card rounded-lg p-3 text-center">
                            <div class="text-2xl font-bold text-dark-text">{{ player.positionRank }}</div>
                            <div class="text-xs text-dark-textMuted">{{ player.position }} Rank</div>
                          </div>
                          <div class="bg-dark-card rounded-lg p-3 text-center">
                            <div class="text-2xl font-bold" :class="player.rankChange > 0 ? 'text-green-400' : player.rankChange < 0 ? 'text-red-400' : 'text-dark-textMuted'">
                              {{ player.rankChange > 0 ? '↑' : player.rankChange < 0 ? '↓' : '—' }}{{ player.rankChange !== 0 ? Math.abs(player.rankChange) : '' }}
                            </div>
                            <div class="text-xs text-dark-textMuted">vs Last Week</div>
                          </div>
                          <div class="bg-dark-card rounded-lg p-3 text-center">
                            <div class="text-2xl font-bold text-dark-text">{{ player.ppg.toFixed(1) }}</div>
                            <div class="text-xs text-dark-textMuted">Season PPG</div>
                          </div>
                          <div class="bg-dark-card rounded-lg p-3 text-center">
                            <div class="text-2xl font-bold text-dark-text">{{ player.totalPoints?.toFixed(0) || '—' }}</div>
                            <div class="text-xs text-dark-textMuted">Total Points</div>
                          </div>
                          <div class="bg-dark-card rounded-lg p-3 text-center">
                            <div class="text-2xl font-bold" :class="player.vor > 0 ? 'text-green-400' : 'text-red-400'">
                              {{ player.vor >= 0 ? '+' : '' }}{{ player.vor.toFixed(1) }}
                            </div>
                            <div class="text-xs text-dark-textMuted">VOR</div>
                          </div>
                        </div>

                        <!-- Additional Info -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div class="bg-dark-card rounded-xl p-4">
                            <h4 class="font-semibold text-dark-text mb-3 flex items-center gap-2">
                              <span>📅</span> Schedule Strength
                            </h4>
                            <div class="space-y-3">
                              <div class="flex items-center justify-between">
                                <span class="text-dark-textMuted">ROS SOS:</span>
                                <span class="font-bold" :class="getSosTextClass(player.rosSOS)">{{ formatSOS(player.rosSOS) }}</span>
                              </div>
                              <div class="flex items-center justify-between">
                                <span class="text-dark-textMuted">Next 4 Weeks:</span>
                                <span class="font-bold" :class="getSosTextClass(player.next4SOS)">{{ formatSOS(player.next4SOS) }}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div class="bg-dark-card rounded-xl p-4">
                            <h4 class="font-semibold text-dark-text mb-3 flex items-center gap-2">
                              <span>📋</span> Ownership
                            </h4>
                            <div class="space-y-3">
                              <div class="flex items-center justify-between">
                                <span class="text-dark-textMuted">Fantasy Team:</span>
                                <span v-if="getFantasyOwner(player.player_id)" class="font-medium text-dark-text">{{ getFantasyOwner(player.player_id) }}</span>
                                <span v-else class="text-cyan-400 font-medium">Free Agent</span>
                              </div>
                              <div class="flex items-center justify-between">
                                <span class="text-dark-textMuted">MLB Team:</span>
                                <span class="font-medium text-dark-text">{{ player.mlb_team || 'N/A' }}</span>
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
    </template>

    <!-- TEAMS TAB -->
    <template v-else-if="activeTab === 'teams'">
      <div class="card">
        <div class="card-body py-8 text-center">
          <div class="text-4xl mb-3">🏗️</div>
          <h3 class="text-xl font-bold text-dark-text mb-2">Teams Tab Coming Soon</h3>
          <p class="text-dark-textMuted">Team roster rankings and analysis</p>
        </div>
      </div>
    </template>

    <!-- THIS WEEK TAB -->
    <template v-else-if="activeTab === 'week'">
      <div class="card">
        <div class="card-body py-8 text-center">
          <div class="text-4xl mb-3">🏗️</div>
          <h3 class="text-xl font-bold text-dark-text mb-2">This Week Tab Coming Soon</h3>
          <p class="text-dark-textMuted">Weekly start/sit recommendations</p>
        </div>
      </div>
    </template>

    <!-- Settings Modal -->
    <div v-if="showSettingsModal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" @click="showSettingsModal = false">
      <div class="bg-dark-card rounded-2xl max-w-lg w-full p-6 space-y-6" @click.stop>
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold text-dark-text">Projection Settings</h2>
          <button @click="showSettingsModal = false" class="p-2 hover:bg-dark-border/50 rounded-lg transition-colors">
            <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <!-- Upload Custom Rankings -->
        <div class="space-y-3">
          <h3 class="font-semibold text-dark-text">Upload Custom Rankings</h3>
          <p class="text-sm text-dark-textMuted">Upload a CSV file with your own player rankings. Format: player_name, rank, position</p>
          <div class="flex items-center gap-3">
            <input 
              type="file" 
              accept=".csv"
              @change="handleFileUpload"
              class="flex-1 text-sm text-dark-textMuted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-gray-900 file:font-medium hover:file:bg-primary/90"
            />
          </div>
        </div>
        
        <div class="pt-4 border-t border-dark-border/30 flex justify-end gap-3">
          <button @click="showSettingsModal = false" class="px-4 py-2 rounded-lg bg-dark-border/50 text-dark-textMuted hover:bg-dark-border transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- Platform Badge -->
    <div class="flex justify-center mt-8">
      <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-600/10 border border-purple-600/30">
        <span class="text-sm font-bold text-purple-400">Y!</span>
        <span class="text-sm text-purple-300">Yahoo Fantasy Baseball</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useAuthStore } from '@/stores/auth'
import { yahooService } from '@/services/yahoo'

const leagueStore = useLeagueStore()
const authStore = useAuthStore()

// Tabs
const tabs = [
  { id: 'ros', name: 'Rest of Season', icon: '📊' },
  { id: 'teams', name: 'Teams', icon: '👥' },
  { id: 'week', name: 'This Week', icon: '📅' }
]
const activeTab = ref('ros')

// State
const isLoading = ref(true)
const showSettingsModal = ref(false)
const isCustomizerExpanded = ref(false)
const expandedPlayerId = ref<string | null>(null)
const lastUpdated = ref('')

// Rankings data
const allPlayers = ref<any[]>([])
const myPlayerIds = ref<Set<string>>(new Set())
const playerOwnerMap = ref<Map<string, string>>(new Map())

// Custom rankings
const hasCustomRankings = ref(false)
const customRankingsCount = ref(0)

// Sorting
const sortColumn = ref('')
const sortDirection = ref<'asc' | 'desc'>('desc')

// Filters
const selectedPositions = ref<string[]>(['C', '1B', '2B', '3B', 'SS', 'OF', 'SP', 'RP'])
const showOnlyMyPlayers = ref(false)
const showOnlyFreeAgents = ref(false)

const positionFilters = [
  { id: 'C', label: 'C' },
  { id: '1B', label: '1B' },
  { id: '2B', label: '2B' },
  { id: '3B', label: '3B' },
  { id: 'SS', label: 'SS' },
  { id: 'OF', label: 'OF' },
  { id: 'SP', label: 'SP' },
  { id: 'RP', label: 'RP' }
]

// Ranking factors
interface RankingFactor {
  id: string
  name: string
  enabled: boolean
  weight: number
}

const rankingFactors = ref<RankingFactor[]>([
  // Core
  { id: 'baseProjection', name: 'Base Projection', enabled: true, weight: 50 },
  { id: 'seasonPPG', name: 'Season PPG', enabled: true, weight: 30 },
  { id: 'recentPerformance', name: 'Recent Performance', enabled: true, weight: 20 },
  // Performance
  { id: 'consistency', name: 'Consistency', enabled: false, weight: 15 },
  { id: 'upside', name: 'Upside Potential', enabled: false, weight: 10 },
  // Schedule
  { id: 'rosSOS', name: 'ROS Schedule', enabled: true, weight: 15 },
  { id: 'next4SOS', name: 'Next 4 Weeks', enabled: false, weight: 10 }
])

const coreFactors = computed(() => rankingFactors.value.filter(f => ['baseProjection', 'seasonPPG', 'recentPerformance'].includes(f.id)))
const performanceFactors = computed(() => rankingFactors.value.filter(f => ['consistency', 'upside'].includes(f.id)))
const scheduleFactors = computed(() => rankingFactors.value.filter(f => ['rosSOS', 'next4SOS'].includes(f.id)))

const enabledFactorCount = computed(() => rankingFactors.value.filter(f => f.enabled).length)

// Presets
const presets = [
  { id: 'balanced', name: 'Balanced', icon: '⚖️', factors: { baseProjection: 50, seasonPPG: 30, recentPerformance: 20, rosSOS: 15 } },
  { id: 'hot-hand', name: 'Hot Hand', icon: '🔥', factors: { baseProjection: 30, seasonPPG: 20, recentPerformance: 50, upside: 20 } },
  { id: 'consistency', name: 'Consistency', icon: '📈', factors: { baseProjection: 40, seasonPPG: 40, consistency: 30 } },
  { id: 'schedule', name: 'Schedule', icon: '📅', factors: { baseProjection: 40, seasonPPG: 25, rosSOS: 25, next4SOS: 20 } }
]
const activePresetId = ref('balanced')
const activePresetName = computed(() => presets.find(p => p.id === activePresetId.value)?.name || 'Custom')

// Player filtering
const filteredPlayers = computed(() => {
  let players = [...allPlayers.value]
  
  // Position filter
  if (selectedPositions.value.length > 0) {
    players = players.filter(p => selectedPositions.value.includes(p.position))
  }
  
  // My players filter
  if (showOnlyMyPlayers.value) {
    players = players.filter(p => myPlayerIds.value.has(p.player_id))
  }
  
  // Free agents filter
  if (showOnlyFreeAgents.value) {
    players = players.filter(p => !playerOwnerMap.value.has(p.player_id))
  }
  
  // Sorting
  if (sortColumn.value) {
    players.sort((a, b) => {
      const aVal = a[sortColumn.value] || 0
      const bVal = b[sortColumn.value] || 0
      return sortDirection.value === 'asc' ? aVal - bVal : bVal - aVal
    })
  }
  
  return players
})

// Methods
function togglePositionFilter(pos: string) {
  const idx = selectedPositions.value.indexOf(pos)
  if (idx >= 0) {
    selectedPositions.value.splice(idx, 1)
  } else {
    selectedPositions.value.push(pos)
  }
}

function sortBy(column: string) {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = column
    sortDirection.value = 'desc'
  }
}

function toggleFactor(factorId: string) {
  const factor = rankingFactors.value.find(f => f.id === factorId)
  if (factor && factorId !== 'baseProjection') {
    factor.enabled = !factor.enabled
    activePresetId.value = ''
  }
}

function updateWeight(factorId: string, weight: number) {
  const factor = rankingFactors.value.find(f => f.id === factorId)
  if (factor) {
    factor.weight = weight
    activePresetId.value = ''
  }
}

function applyPreset(preset: typeof presets[0]) {
  activePresetId.value = preset.id
  
  // Reset all factors
  rankingFactors.value.forEach(f => {
    f.enabled = false
    f.weight = 0
  })
  
  // Apply preset factors
  for (const [id, weight] of Object.entries(preset.factors)) {
    const factor = rankingFactors.value.find(f => f.id === id)
    if (factor) {
      factor.enabled = true
      factor.weight = weight as number
    }
  }
}

function resetFactors() {
  applyPreset(presets[0])
}

function applyRankings() {
  recalculateRankings()
  isCustomizerExpanded.value = false
}

function clearCustomRankings() {
  hasCustomRankings.value = false
  customRankingsCount.value = 0
  loadProjections()
}

function handleFileUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const text = e.target?.result as string
      const lines = text.split('\n').filter(l => l.trim())
      // TODO: Parse CSV and apply custom rankings
      console.log('Uploaded', lines.length, 'lines')
      hasCustomRankings.value = true
      customRankingsCount.value = lines.length - 1 // minus header
      showSettingsModal.value = false
    } catch (err) {
      console.error('Error parsing CSV:', err)
    }
  }
  reader.readAsText(file)
}

function togglePlayerExpanded(playerId: string) {
  expandedPlayerId.value = expandedPlayerId.value === playerId ? null : playerId
}

function isMyPlayer(playerId: string): boolean {
  return myPlayerIds.value.has(playerId)
}

function isFreeAgent(playerId: string): boolean {
  return !playerOwnerMap.value.has(playerId)
}

function getFantasyOwner(playerId: string): string | null {
  return playerOwnerMap.value.get(playerId) || null
}

function getPlayerImageUrl(playerId: string): string {
  // MLB headshot URL pattern
  return `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${playerId}/headshot/67/current`
}

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement
  img.src = 'https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/0/headshot/67/current'
}

function getRowClass(player: any): string {
  if (isMyPlayer(player.player_id)) return 'bg-primary/10 border-l-2 border-primary'
  if (isFreeAgent(player.player_id)) return 'bg-cyan-500/5 border-l-2 border-cyan-400'
  return ''
}

function getAvatarRingClass(player: any): string {
  if (isMyPlayer(player.player_id)) return 'ring-primary'
  if (isFreeAgent(player.player_id)) return 'ring-cyan-400'
  return 'ring-dark-border'
}

function getPlayerNameClass(player: any): string {
  if (isMyPlayer(player.player_id)) return 'text-primary'
  if (isFreeAgent(player.player_id)) return 'text-cyan-400'
  return 'text-dark-text'
}

function getPositionClass(position: string): string {
  const classes: Record<string, string> = {
    'C': 'bg-purple-500/30 text-purple-400',
    '1B': 'bg-red-500/30 text-red-400',
    '2B': 'bg-orange-500/30 text-orange-400',
    '3B': 'bg-yellow-500/30 text-yellow-400',
    'SS': 'bg-green-500/30 text-green-400',
    'OF': 'bg-blue-500/30 text-blue-400',
    'SP': 'bg-cyan-500/30 text-cyan-400',
    'RP': 'bg-pink-500/30 text-pink-400'
  }
  return classes[position] || 'bg-dark-border/50 text-dark-textMuted'
}

function getInjuryClass(status: string): string {
  if (status === 'IR' || status === 'IL' || status === 'Out') return 'bg-red-500/20 text-red-400'
  if (status === 'DTD' || status === 'Day-To-Day') return 'bg-yellow-500/20 text-yellow-400'
  return 'bg-dark-border/50 text-dark-textMuted'
}

function getSosBarClass(sos: number): string {
  if (sos >= 0.6) return 'bg-green-500'
  if (sos >= 0.4) return 'bg-yellow-500'
  return 'bg-red-500'
}

function getSosBarWidth(sos: number): string {
  return `${Math.max(10, sos * 100)}%`
}

function getSosTextClass(sos: number): string {
  if (sos >= 0.6) return 'text-green-400'
  if (sos >= 0.4) return 'text-yellow-400'
  return 'text-red-400'
}

function formatSOS(sos: number): string {
  if (sos >= 0.6) return 'Easy'
  if (sos >= 0.4) return 'Avg'
  return 'Hard'
}

function recalculateRankings() {
  // Calculate weighted scores based on enabled factors
  const enabledFactors = rankingFactors.value.filter(f => f.enabled)
  const totalWeight = enabledFactors.reduce((sum, f) => sum + f.weight, 0)
  
  allPlayers.value.forEach(player => {
    let score = 0
    
    enabledFactors.forEach(factor => {
      const normalizedWeight = factor.weight / totalWeight
      
      switch (factor.id) {
        case 'baseProjection':
          score += (player.projectedPoints || player.ppg * 10) * normalizedWeight
          break
        case 'seasonPPG':
          score += player.ppg * 10 * normalizedWeight
          break
        case 'recentPerformance':
          score += (player.recentPPG || player.ppg) * 10 * normalizedWeight
          break
        case 'consistency':
          score += (1 - (player.stdDev || 0.3)) * 30 * normalizedWeight
          break
        case 'upside':
          score += (player.maxScore || player.ppg * 1.5) * normalizedWeight
          break
        case 'rosSOS':
          score += player.rosSOS * 20 * normalizedWeight
          break
        case 'next4SOS':
          score += player.next4SOS * 20 * normalizedWeight
          break
      }
    })
    
    player.compositeScore = score
  })
  
  // Sort by composite score
  allPlayers.value.sort((a, b) => b.compositeScore - a.compositeScore)
  
  // Assign ranks
  allPlayers.value.forEach((player, idx) => {
    player.rosRank = idx + 1
  })
  
  // Calculate position ranks
  const positionCounts: Record<string, number> = {}
  allPlayers.value.forEach(player => {
    positionCounts[player.position] = (positionCounts[player.position] || 0) + 1
    player.positionRank = positionCounts[player.position]
  })
}

async function loadProjections() {
  isLoading.value = true
  
  try {
    const leagueKey = leagueStore.activeLeagueId
    if (!leagueKey || !authStore.user?.id) {
      console.log('Missing league or user')
      return
    }
    
    await yahooService.initialize(authStore.user.id)
    
    // Get all team rosters to build player ownership map
    const standings = await yahooService.getStandings(leagueKey)
    
    // For now, create mock projection data
    // In a real implementation, you'd fetch actual player stats from Yahoo
    const mockPlayers = generateMockPlayers()
    
    allPlayers.value = mockPlayers
    recalculateRankings()
    
    lastUpdated.value = new Date().toLocaleString()
    
  } catch (e) {
    console.error('Error loading projections:', e)
  } finally {
    isLoading.value = false
  }
}

function generateMockPlayers(): any[] {
  // Generate sample baseball players for demonstration
  const positions = ['C', '1B', '2B', '3B', 'SS', 'OF', 'SP', 'RP']
  const players: any[] = []
  
  const samplePlayers = [
    { name: 'Shohei Ohtani', pos: 'OF', team: 'LAD', ppg: 8.5 },
    { name: 'Mookie Betts', pos: 'OF', team: 'LAD', ppg: 7.2 },
    { name: 'Corey Seager', pos: 'SS', team: 'TEX', ppg: 6.8 },
    { name: 'Freddie Freeman', pos: '1B', team: 'LAD', ppg: 6.5 },
    { name: 'Ronald Acuña Jr.', pos: 'OF', team: 'ATL', ppg: 7.8 },
    { name: 'Trea Turner', pos: 'SS', team: 'PHI', ppg: 6.2 },
    { name: 'Marcus Semien', pos: '2B', team: 'TEX', ppg: 5.8 },
    { name: 'Matt Olson', pos: '1B', team: 'ATL', ppg: 6.1 },
    { name: 'Austin Riley', pos: '3B', team: 'ATL', ppg: 5.9 },
    { name: 'J.T. Realmuto', pos: 'C', team: 'PHI', ppg: 4.8 },
    { name: 'Gerrit Cole', pos: 'SP', team: 'NYY', ppg: 15.2 },
    { name: 'Zack Wheeler', pos: 'SP', team: 'PHI', ppg: 14.5 },
    { name: 'Spencer Strider', pos: 'SP', team: 'ATL', ppg: 14.8 },
    { name: 'Josh Hader', pos: 'RP', team: 'HOU', ppg: 8.5 },
    { name: 'Emmanuel Clase', pos: 'RP', team: 'CLE', ppg: 9.2 },
    { name: 'Julio Rodríguez', pos: 'OF', team: 'SEA', ppg: 6.4 },
    { name: 'Bobby Witt Jr.', pos: 'SS', team: 'KC', ppg: 6.6 },
    { name: 'Adley Rutschman', pos: 'C', team: 'BAL', ppg: 5.2 },
    { name: 'Corbin Carroll', pos: 'OF', team: 'ARI', ppg: 5.8 },
    { name: 'Yordan Alvarez', pos: 'OF', team: 'HOU', ppg: 6.9 }
  ]
  
  samplePlayers.forEach((p, idx) => {
    players.push({
      player_id: `mlb_${idx + 1}`,
      full_name: p.name,
      position: p.pos,
      mlb_team: p.team,
      ppg: p.ppg + (Math.random() * 2 - 1),
      totalPoints: p.ppg * 22 + (Math.random() * 50 - 25),
      rosRank: idx + 1,
      positionRank: 0,
      rankChange: Math.floor(Math.random() * 10 - 5),
      rosSOS: 0.3 + Math.random() * 0.5,
      next4SOS: 0.3 + Math.random() * 0.5,
      vor: (Math.random() * 10 - 3),
      injury_status: Math.random() > 0.9 ? 'DTD' : null,
      compositeScore: 0
    })
  })
  
  return players
}

// Watch for league changes
watch(() => leagueStore.activeLeagueId, (newId) => {
  if (newId && leagueStore.activePlatform === 'yahoo') {
    loadProjections()
  }
}, { immediate: true })

onMounted(() => {
  if (leagueStore.activeLeagueId && leagueStore.activePlatform === 'yahoo') {
    loadProjections()
  }
})
</script>
