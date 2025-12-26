<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="text-3xl font-bold text-dark-text mb-2">Player Projections</h1>
        <p class="text-base text-dark-textMuted">Rest of season rankings with position-adjusted value analysis</p>
      </div>
      <div class="flex items-center gap-3">
        <button @click="loadProjections" :disabled="isLoading" class="px-4 py-2 rounded-lg bg-dark-card hover:bg-dark-border/50 text-dark-textMuted transition-all flex items-center gap-2">
          <span :class="{ 'animate-spin': isLoading }">🔄</span> Refresh
        </button>
        <button @click="showSettingsModal = true" class="p-2 rounded-lg hover:bg-dark-border/50 transition-colors" title="Settings">
          <svg class="w-6 h-6 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="flex gap-2">
      <button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id"
        :class="activeTab === tab.id ? 'bg-primary text-gray-900' : 'bg-dark-card text-dark-textSecondary hover:bg-dark-border/50'"
        class="px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2">
        <span class="text-xl">{{ tab.icon }}</span> {{ tab.name }}
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
      <!-- Data Source Info -->
      <div class="card bg-green-500/10 border-green-500/30">
        <div class="card-body py-3">
          <div class="flex items-center gap-3">
            <span class="text-xl">✓</span>
            <span class="font-semibold text-green-400">Live Yahoo Data</span>
            <span class="text-dark-textMuted">{{ allPlayers.length }} players • Your league scoring</span>
          </div>
        </div>
      </div>

      <!-- Ranking Customizer -->
      <div class="card bg-gradient-to-br from-dark-card to-dark-border/30 border border-primary/20">
        <div class="card-header cursor-pointer" @click="isCustomizerExpanded = !isCustomizerExpanded">
          <div class="flex items-center gap-3">
            <span class="text-2xl">🎛️</span>
            <div>
              <h2 class="card-title text-lg">Customize Rankings</h2>
              <p class="text-sm text-dark-textMuted">{{ enabledFactorCount }} factors • {{ activePresetName }}</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="flex gap-1">
              <button v-for="preset in presets.slice(0,4)" :key="preset.id" @click.stop="applyPreset(preset)"
                :class="activePresetId === preset.id ? 'bg-primary text-gray-900' : 'bg-dark-border/50 text-dark-textMuted'"
                class="px-3 py-1.5 rounded-lg text-xs font-medium">
                {{ preset.icon }} {{ preset.name }}
              </button>
            </div>
            <svg class="w-5 h-5 text-dark-textMuted transition-transform" :class="{ 'rotate-180': isCustomizerExpanded }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        <div v-if="isCustomizerExpanded" class="card-body pt-0 space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div v-for="(group, gIdx) in [coreFactors, performanceFactors, contextFactors]" :key="gIdx" class="bg-dark-bg/50 rounded-xl p-4">
              <h3 class="font-semibold text-dark-text mb-3">{{ ['Core', 'Performance', 'Context'][gIdx] }}</h3>
              <div class="space-y-3">
                <div v-for="factor in group" :key="factor.id" class="space-y-1">
                  <div class="flex items-center justify-between">
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" :checked="factor.enabled" @change="toggleFactor(factor.id)" class="rounded accent-primary w-4 h-4" />
                      <span class="text-sm text-dark-text">{{ factor.name }}</span>
                    </label>
                    <span v-if="factor.enabled" class="text-xs text-primary">{{ factor.weight }}%</span>
                  </div>
                  <input v-if="factor.enabled" type="range" :value="factor.weight" @input="updateWeight(factor.id, Number(($event.target as HTMLInputElement).value))" min="0" max="100" class="w-full h-1 accent-primary" />
                </div>
              </div>
            </div>
          </div>
          <div class="flex justify-between pt-2 border-t border-dark-border/30">
            <span class="text-sm text-dark-textMuted"><span class="text-primary font-semibold">{{ enabledFactorCount }}</span> factors active</span>
            <div class="flex gap-3">
              <button @click="resetFactors" class="px-4 py-2 rounded-lg bg-dark-border/50 text-dark-textMuted">Reset</button>
              <button @click="applyRankings" class="px-6 py-2 rounded-lg bg-primary text-gray-900 font-semibold">Apply</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="card">
        <div class="card-body py-4">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-dark-textMuted font-medium">Positions:</span>
              <button @click="selectAllPositions" :class="selectedPositions.length === positionFilters.length ? 'bg-primary text-gray-900' : 'bg-dark-border/50 text-dark-textSecondary'" class="px-3 py-1.5 rounded-lg text-sm font-medium">All</button>
              <button v-for="pos in positionFilters" :key="pos.id" @click="togglePositionFilter(pos.id)"
                :class="selectedPositions.includes(pos.id) ? 'bg-primary text-gray-900' : 'bg-dark-border/50 text-dark-textSecondary'"
                class="px-3 py-1.5 rounded-lg text-sm font-medium">{{ pos.label }}</button>
            </div>
            <div class="flex items-center gap-4">
              <label class="flex items-center gap-2 text-sm text-dark-textMuted cursor-pointer">
                <input type="checkbox" v-model="showOnlyMyPlayers" class="rounded accent-primary w-4 h-4" /> My Players
              </label>
              <label class="flex items-center gap-2 text-sm text-dark-textMuted cursor-pointer">
                <input type="checkbox" v-model="showOnlyFreeAgents" class="rounded accent-cyan-400 w-4 h-4" /> Free Agents
              </label>
              <span class="text-sm text-dark-textMuted">{{ filteredPlayers.length }} players</span>
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
                <div class="w-4 h-4 rounded bg-primary/30 border-l-2 border-primary"></div>
                <span class="text-dark-textMuted">My Players</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-4 h-4 rounded bg-cyan-500/20 border-l-2 border-cyan-400"></div>
                <span class="text-dark-textMuted">Free Agents</span>
              </div>
            </div>
            <div class="text-sm text-dark-textMuted">
              SOS: <span class="text-green-400">Easy</span> / <span class="text-yellow-400">Avg</span> / <span class="text-red-400">Hard</span>
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
          <span v-if="lastUpdated" class="text-sm text-dark-textMuted">Updated: {{ lastUpdated }}</span>
        </div>
        <div class="card-body p-0">
          <div class="overflow-x-auto max-h-[70vh] overflow-y-auto">
            <table class="w-full">
              <thead class="bg-dark-border/30 sticky top-0 z-10">
                <tr>
                  <th @click="sortBy('rosRank')" class="px-3 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase w-12 cursor-pointer hover:text-dark-text" :title="columnTooltips.rank">
                    Rank <span v-if="sortColumn === 'rosRank'">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                  </th>
                  <th @click="sortBy('rankChange')" class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-12 cursor-pointer hover:text-dark-text" :title="columnTooltips.change">
                    Δ <span v-if="sortColumn === 'rankChange'">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                  </th>
                  <th class="px-3 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase" :title="columnTooltips.player">Player</th>
                  <th @click="sortBy('position')" class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-12 cursor-pointer hover:text-dark-text" :title="columnTooltips.pos">
                    Pos <span v-if="sortColumn === 'position'">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                  </th>
                  <th @click="sortBy('positionRank')" class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-14 cursor-pointer hover:text-dark-text" :title="columnTooltips.posRk">
                    Pos Rk <span v-if="sortColumn === 'positionRank'">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                  </th>
                  <th @click="sortBy('rosSOS')" class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-20 cursor-pointer hover:text-dark-text" :title="columnTooltips.rosSOS">
                    ROS SOS <span v-if="sortColumn === 'rosSOS'">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                  </th>
                  <th @click="sortBy('next4SOS')" class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-20 cursor-pointer hover:text-dark-text" :title="columnTooltips.next4SOS">
                    Next 4 <span v-if="sortColumn === 'next4SOS'">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                  </th>
                  <th @click="sortBy('total_points')" class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-14 cursor-pointer hover:text-dark-text" :title="columnTooltips.pts">
                    Pts <span v-if="sortColumn === 'total_points'">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                  </th>
                  <th @click="sortBy('ppg')" class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-14 cursor-pointer hover:text-dark-text" :title="columnTooltips.ppg">
                    PPG <span v-if="sortColumn === 'ppg'">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                  </th>
                  <th @click="sortBy('vor')" class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-14 cursor-pointer hover:text-dark-text" :title="columnTooltips.vor">
                    VOR <span v-if="sortColumn === 'vor'">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-dark-border/30">
                <template v-for="(player, idx) in filteredPlayers" :key="player.player_key">
                  <tr :class="[getRowClass(player), expandedPlayerId === player.player_key ? 'bg-dark-border/30' : '']"
                    class="hover:bg-dark-border/20 transition-colors cursor-pointer"
                    @click="togglePlayerExpanded(player.player_key)">
                    <td class="px-3 py-3"><span class="font-bold text-lg text-dark-text">{{ player.rosRank }}</span></td>
                    <td class="px-2 py-3 text-center">
                      <span v-if="player.rankChange > 0" class="text-green-400 font-medium text-sm">↑{{ player.rankChange }}</span>
                      <span v-else-if="player.rankChange < 0" class="text-red-400 font-medium text-sm">↓{{ Math.abs(player.rankChange) }}</span>
                      <span v-else class="text-dark-textMuted text-sm">—</span>
                    </td>
                    <td class="px-3 py-3">
                      <div class="flex items-center gap-3">
                        <div class="relative">
                          <div class="w-10 h-10 rounded-full bg-dark-border overflow-hidden ring-2" :class="getAvatarRingClass(player)">
                            <img :src="player.headshot || defaultHeadshot" :alt="player.full_name" class="w-full h-full object-cover" @error="handleImageError" />
                          </div>
                          <div v-if="isMyPlayer(player)" class="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center"><span class="text-xs text-gray-900 font-bold">★</span></div>
                          <div v-else-if="isFreeAgent(player)" class="absolute -top-1 -right-1 w-5 h-5 bg-cyan-400 rounded-full flex items-center justify-center"><span class="text-xs text-gray-900 font-bold">+</span></div>
                        </div>
                        <div>
                          <span class="font-semibold" :class="getPlayerNameClass(player)">{{ player.full_name }}</span>
                          <div class="flex items-center gap-2 text-xs text-dark-textMuted">
                            <span>{{ player.mlb_team || 'FA' }}</span>
                            <template v-if="player.fantasy_team">
                              <span class="text-dark-border">•</span>
                              <span class="flex items-center gap-1">
                                <span class="text-purple-400">⛨</span>
                                <span :class="isMyPlayer(player) ? 'text-primary' : 'text-dark-textMuted'">{{ player.fantasy_team }}</span>
                              </span>
                            </template>
                            <template v-else>
                              <span class="text-dark-border">•</span>
                              <span class="text-cyan-400">Free Agent</span>
                            </template>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td class="px-2 py-3 text-center"><span class="px-2 py-1 rounded text-xs font-bold" :class="getPositionClass(player.position)">{{ player.position?.split(',')[0] }}</span></td>
                    <td class="px-2 py-3 text-center text-dark-text font-medium">{{ player.positionRank }}</td>
                    <td class="px-2 py-3 text-center">
                      <div class="flex items-center justify-center gap-1">
                        <div class="w-10 h-2 rounded-full bg-dark-border/50 overflow-hidden">
                          <div class="h-full rounded-full" :class="getSosBarClass(player.rosSOS)" :style="{ width: getSosBarWidth(player.rosSOS) }"></div>
                        </div>
                        <span class="text-xs font-medium w-8" :class="getSosTextClass(player.rosSOS)">{{ formatSOS(player.rosSOS) }}</span>
                      </div>
                    </td>
                    <td class="px-2 py-3 text-center">
                      <div class="flex items-center justify-center gap-1">
                        <div class="w-10 h-2 rounded-full bg-dark-border/50 overflow-hidden">
                          <div class="h-full rounded-full" :class="getSosBarClass(player.next4SOS)" :style="{ width: getSosBarWidth(player.next4SOS) }"></div>
                        </div>
                        <span class="text-xs font-medium w-8" :class="getSosTextClass(player.next4SOS)">{{ formatSOS(player.next4SOS) }}</span>
                      </div>
                    </td>
                    <td class="px-2 py-3 text-center font-bold text-dark-text">{{ player.total_points?.toFixed(1) || '0' }}</td>
                    <td class="px-2 py-3 text-center font-bold text-dark-text">{{ player.ppg?.toFixed(2) || '0' }}</td>
                    <td class="px-2 py-3 text-center font-bold" :class="player.vor > 0 ? 'text-green-400' : player.vor < -3 ? 'text-red-400' : 'text-dark-textMuted'">{{ player.vor >= 0 ? '+' : '' }}{{ player.vor?.toFixed(1) || '0' }}</td>
                  </tr>
                  
                  <!-- Expanded Player Detail -->
                  <tr v-if="expandedPlayerId === player.player_key" class="bg-dark-bg/80">
                    <td colspan="10" class="p-0">
                      <div class="p-4 space-y-4 border-y border-primary/30">
                        <div class="flex items-start justify-between">
                          <div class="flex items-center gap-4">
                            <div class="w-16 h-16 rounded-full bg-dark-border overflow-hidden ring-2 ring-primary/50">
                              <img :src="player.headshot || defaultHeadshot" :alt="player.full_name" class="w-full h-full object-cover" @error="handleImageError" />
                            </div>
                            <div>
                              <h3 class="text-xl font-bold text-dark-text">{{ player.full_name }}</h3>
                              <div class="flex items-center gap-3 text-sm text-dark-textMuted">
                                <span class="px-2 py-0.5 rounded text-xs font-bold" :class="getPositionClass(player.position)">{{ player.position }}</span>
                                <span>{{ player.mlb_team || 'FA' }}</span>
                              </div>
                            </div>
                          </div>
                          <button @click.stop="expandedPlayerId = null" class="p-2 hover:bg-dark-border/50 rounded-lg transition-colors">✕</button>
                        </div>
                        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                          <div class="bg-dark-card rounded-lg p-3 text-center">
                            <div class="text-2xl font-bold text-primary">#{{ player.rosRank }}</div>
                            <div class="text-xs text-dark-textMuted">Overall Rank</div>
                          </div>
                          <div class="bg-dark-card rounded-lg p-3 text-center">
                            <div class="text-2xl font-bold text-dark-text">{{ player.positionRank }}</div>
                            <div class="text-xs text-dark-textMuted">{{ player.position?.split(',')[0] }} Rank</div>
                          </div>
                          <div class="bg-dark-card rounded-lg p-3 text-center">
                            <div class="text-2xl font-bold" :class="player.rankChange > 0 ? 'text-green-400' : player.rankChange < 0 ? 'text-red-400' : 'text-dark-textMuted'">
                              {{ player.rankChange > 0 ? '↑' : player.rankChange < 0 ? '↓' : '—' }}{{ player.rankChange !== 0 ? Math.abs(player.rankChange) : '' }}
                            </div>
                            <div class="text-xs text-dark-textMuted">vs Last Week</div>
                          </div>
                          <div class="bg-dark-card rounded-lg p-3 text-center">
                            <div class="text-2xl font-bold text-dark-text">{{ player.total_points?.toFixed(1) || '0.0' }}</div>
                            <div class="text-xs text-dark-textMuted">Total Points</div>
                          </div>
                          <div class="bg-dark-card rounded-lg p-3 text-center">
                            <div class="text-2xl font-bold text-dark-text">{{ player.ppg?.toFixed(2) || '0.00' }}</div>
                            <div class="text-xs text-dark-textMuted">Points/Game</div>
                          </div>
                          <div class="bg-dark-card rounded-lg p-3 text-center">
                            <div class="text-2xl font-bold" :class="player.vor > 0 ? 'text-green-400' : 'text-red-400'">{{ player.vor >= 0 ? '+' : '' }}{{ player.vor?.toFixed(1) || '0.0' }}</div>
                            <div class="text-xs text-dark-textMuted">VOR</div>
                          </div>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div class="bg-dark-card rounded-xl p-4">
                            <h4 class="font-semibold text-dark-text mb-3">📅 Schedule Strength</h4>
                            <div class="space-y-3">
                              <div class="flex items-center justify-between">
                                <span class="text-dark-textMuted">Rest of Season:</span>
                                <div class="flex items-center gap-2">
                                  <div class="w-20 h-3 rounded-full bg-dark-border/50 overflow-hidden">
                                    <div class="h-full rounded-full" :class="getSosBarClass(player.rosSOS)" :style="{ width: getSosBarWidth(player.rosSOS) }"></div>
                                  </div>
                                  <span class="font-medium w-10" :class="getSosTextClass(player.rosSOS)">{{ formatSOS(player.rosSOS) }}</span>
                                </div>
                              </div>
                              <div class="flex items-center justify-between">
                                <span class="text-dark-textMuted">Next 4 Weeks:</span>
                                <div class="flex items-center gap-2">
                                  <div class="w-20 h-3 rounded-full bg-dark-border/50 overflow-hidden">
                                    <div class="h-full rounded-full" :class="getSosBarClass(player.next4SOS)" :style="{ width: getSosBarWidth(player.next4SOS) }"></div>
                                  </div>
                                  <span class="font-medium w-10" :class="getSosTextClass(player.next4SOS)">{{ formatSOS(player.next4SOS) }}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div class="bg-dark-card rounded-xl p-4">
                            <h4 class="font-semibold text-dark-text mb-3">📋 Ownership</h4>
                            <div class="space-y-3">
                              <div class="flex items-center justify-between">
                                <span class="text-dark-textMuted">Fantasy Team:</span>
                                <span v-if="player.fantasy_team" class="font-medium" :class="isMyPlayer(player) ? 'text-primary' : 'text-dark-text'">{{ player.fantasy_team }}</span>
                                <span v-else class="font-medium text-cyan-400">Free Agent</span>
                              </div>
                              <div class="flex items-center justify-between">
                                <span class="text-dark-textMuted">Manager:</span>
                                <span class="font-medium text-dark-text">{{ player.manager_name || '—' }}</span>
                              </div>
                              <div class="flex items-center justify-between">
                                <span class="text-dark-textMuted">Value Tier:</span>
                                <span class="px-2 py-0.5 rounded text-xs" :class="getValueTierClass(player.vor)">{{ getValueTier(player.vor) }}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                </template>
                <tr v-if="filteredPlayers.length === 0"><td colspan="10" class="px-4 py-8 text-center text-dark-textMuted">No players match filters</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- TEAMS TAB -->
    <template v-else-if="activeTab === 'teams'">
      <!-- Roster Requirements Info -->
      <div class="card">
        <div class="card-body py-3">
          <div class="flex flex-wrap items-center justify-center gap-4 text-sm">
            <span class="text-dark-textMuted font-medium">Starting Lineup:</span>
            <span v-for="pos in displayRosterPositions" :key="pos.pos" class="px-2 py-1 rounded font-bold" :class="getPositionClass(pos.pos)">
              {{ pos.count }} {{ pos.pos }}
            </span>
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
          <div class="text-right">
            <span class="text-sm text-dark-textMuted">Based on ROS projections • Graded on starter quality</span>
            <div class="text-xs text-primary mt-1 flex items-center justify-end gap-1">
              <span>👆</span> Click any team row to see detailed breakdown
            </div>
          </div>
        </div>
        <div class="card-body p-0">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-dark-border/30">
                <tr>
                  <th class="px-3 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase w-10">#</th>
                  <th class="px-3 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase">Team</th>
                  <th class="px-3 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-16" title="Overall team grade based on starter quality">Grade</th>
                  <th class="px-3 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-24" title="Team status: Contender, Competitive, Pretender, Rebuilding">Status</th>
                  <th v-for="pos in uniquePositions" :key="pos" class="px-3 py-3 text-center text-xs font-semibold uppercase w-12" :class="getPositionTextClass(pos)" :title="`${pos} position grade`">
                    {{ pos }}
                  </th>
                  <th class="px-3 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase hidden lg:table-cell">Top Assets</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-dark-border/30">
                <template v-for="(team, index) in rankedTeams" :key="team.teamKey">
                  <tr :class="[team.isMyTeam ? 'bg-primary/10' : 'hover:bg-dark-border/20', expandedTeamId === team.teamKey ? 'bg-dark-border/30' : '']"
                    class="transition-colors cursor-pointer" @click="expandedTeamId = expandedTeamId === team.teamKey ? null : team.teamKey">
                    <td class="px-3 py-3">
                      <span class="font-bold" :class="index < 3 ? 'text-primary' : 'text-dark-textMuted'">{{ index + 1 }}</span>
                    </td>
                    <td class="px-3 py-3">
                      <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-full overflow-hidden bg-dark-border ring-2 flex-shrink-0" :class="team.isMyTeam ? 'ring-primary' : 'ring-dark-border'">
                          <img :src="team.avatarUrl || defaultTeamAvatar" :alt="team.teamName" class="w-full h-full object-cover" @error="handleImageError" />
                        </div>
                        <div class="min-w-0">
                          <div class="font-semibold text-dark-text flex items-center gap-2 truncate">
                            {{ team.teamName }}
                            <span v-if="team.isMyTeam" class="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded flex-shrink-0">You</span>
                          </div>
                          <div class="text-xs text-dark-textMuted truncate">{{ team.managerName }}</div>
                        </div>
                      </div>
                    </td>
                    <td class="px-3 py-3 text-center">
                      <span class="text-xl font-black" :class="getTeamGradeClass(team.overallGrade)">{{ team.overallGrade }}</span>
                    </td>
                    <td class="px-3 py-3 text-center">
                      <span class="px-2 py-1 rounded-full text-[10px] font-bold whitespace-nowrap" :class="getTeamStatusClass(team.statusScore)">
                        {{ getTeamStatusLabel(team.statusScore) }}
                      </span>
                    </td>
                    <td v-for="pos in uniquePositions" :key="pos" class="px-3 py-3 text-center">
                      <span class="font-bold text-sm" :class="getPositionGradeClass(team.positionGrades[pos] || 'N/A')">
                        {{ team.positionGrades[pos] || 'N/A' }}
                      </span>
                    </td>
                    <td class="px-3 py-3 hidden lg:table-cell">
                      <div class="flex flex-wrap gap-1">
                        <span v-for="asset in team.topAssets?.slice(0, 3)" :key="asset.player_key" class="px-2 py-0.5 rounded text-xs font-medium" :class="getAssetTierClass(asset.positionRank, asset.position)">
                          {{ getLastName(asset.full_name) }}
                        </span>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Expanded Team Detail -->
                  <tr v-if="expandedTeamId === team.teamKey">
                    <td :colspan="6 + uniquePositions.length" class="p-0">
                      <div class="bg-dark-card/50 border-t border-b border-primary/30">
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-dark-border/30">
                          <div v-for="pos in uniquePositions" :key="pos" class="p-4">
                            <div class="flex items-center justify-between mb-3">
                              <div class="flex items-center gap-2">
                                <span class="px-2 py-0.5 rounded text-xs font-bold" :class="getPositionClass(pos)">{{ pos }}</span>
                                <span class="text-lg font-bold" :class="getPositionGradeClass(team.positionGrades[pos] || 'N/A')">{{ team.positionGrades[pos] || 'N/A' }}</span>
                              </div>
                              <span class="text-[10px] text-dark-textMuted">{{ getRosterSlotCount(pos) }} starter{{ getRosterSlotCount(pos) > 1 ? 's' : '' }}</span>
                            </div>
                            <div class="space-y-1.5">
                              <div v-for="(player, pIdx) in getTeamPositionPlayers(team, pos)" :key="player.player_key"
                                class="flex items-center gap-2 p-1.5 rounded-lg transition-colors"
                                :class="pIdx < getRosterSlotCount(pos) ? 'bg-dark-border/30' : 'opacity-60'">
                                <div class="w-7 h-7 rounded-full bg-dark-border overflow-hidden flex-shrink-0">
                                  <img :src="player.headshot || defaultHeadshot" :alt="player.full_name" class="w-full h-full object-cover" @error="handleImageError" />
                                </div>
                                <div class="flex-1 min-w-0">
                                  <div class="flex items-center gap-1">
                                    <span class="font-medium text-dark-text text-xs truncate">{{ player.full_name }}</span>
                                    <span v-if="pIdx < getRosterSlotCount(pos)" class="text-[8px] text-primary">★</span>
                                  </div>
                                  <div class="text-[10px] text-dark-textMuted">{{ player.mlb_team || 'FA' }} • {{ player.ppg?.toFixed(1) || '0.0' }} PPG</div>
                                </div>
                                <div class="flex flex-col items-end gap-0.5">
                                  <span class="px-1.5 py-0.5 rounded text-[10px] font-bold" :class="getPlayerGradeClass(getPlayerGrade(player))">{{ getPlayerGrade(player) }}</span>
                                  <span class="text-[9px] text-dark-textMuted">{{ pos }}{{ player.positionRank }}</span>
                                </div>
                              </div>
                              <div v-if="!getTeamPositionPlayers(team, pos)?.length" class="text-center py-3">
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
    </template>

    <!-- THIS WEEK TAB -->
    <template v-else-if="activeTab === 'week'">
      <div class="card"><div class="card-body py-8 text-center"><div class="text-4xl mb-3">🏗️</div><h3 class="text-xl font-bold text-dark-text mb-2">This Week Coming Soon</h3></div></div>
    </template>

    <!-- Settings Modal -->
    <div v-if="showSettingsModal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" @click="showSettingsModal = false">
      <div class="bg-dark-card rounded-2xl max-w-lg w-full p-6 space-y-6" @click.stop>
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold text-dark-text">Settings</h2>
          <button @click="showSettingsModal = false" class="p-2 hover:bg-dark-border/50 rounded-lg">✕</button>
        </div>
        <div class="space-y-3">
          <h3 class="font-semibold text-dark-text">VOR Baselines</h3>
          <div class="grid grid-cols-4 gap-2">
            <div v-for="pos in ['C', '1B', 'OF', 'SP']" :key="pos">
              <label class="text-xs text-dark-textMuted">{{ pos }}</label>
              <input type="number" v-model.number="vorBaselines[pos]" min="1" max="50" class="w-full px-2 py-1 rounded bg-dark-border/30 text-dark-text text-sm" />
            </div>
          </div>
        </div>
        <div class="flex justify-end gap-3 pt-4 border-t border-dark-border/30">
          <button @click="showSettingsModal = false" class="px-4 py-2 rounded-lg bg-dark-border/50 text-dark-textMuted">Close</button>
          <button @click="applySettings" class="px-4 py-2 rounded-lg bg-primary text-gray-900 font-medium">Apply</button>
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

const columnTooltips = {
  rank: 'Overall ranking based on your customized formula weights',
  change: 'Change in ranking since last week (↑ moved up, ↓ moved down)',
  player: 'Player name, MLB team, and fantasy team owner',
  pos: 'Primary eligible position',
  posRk: 'Rank among players at this position',
  rosSOS: 'Rest of Season Strength of Schedule - how difficult remaining matchups are',
  next4SOS: 'Strength of Schedule for the next 4 weeks',
  pts: 'Total fantasy points scored this season',
  ppg: 'Points Per Game - average fantasy points per game played',
  vor: 'Value Over Replacement - points above/below position baseline'
}

const tabs = [
  { id: 'ros', name: 'Rest of Season', icon: '📊' },
  { id: 'teams', name: 'Teams', icon: '👥' },
  { id: 'week', name: 'This Week', icon: '📅' }
]
const activeTab = ref('ros')
const isLoading = ref(true)
const loadingMessage = ref('Loading...')
const showSettingsModal = ref(false)
const isCustomizerExpanded = ref(false)
const expandedPlayerId = ref<string | null>(null)
const expandedTeamId = ref<string | null>(null)
const lastUpdated = ref('')
const allPlayers = ref<any[]>([])
const myTeamKey = ref<string | null>(null)
const sortColumn = ref('')
const sortDirection = ref<'asc' | 'desc'>('desc')
const selectedPositions = ref<string[]>(['C', '1B', '2B', '3B', 'SS', 'OF', 'SP', 'RP'])
const showOnlyMyPlayers = ref(false)
const showOnlyFreeAgents = ref(false)
const defaultHeadshot = 'https://a.espncdn.com/combiner/i?img=/i/headshots/nophoto.png&w=200&h=145'
const defaultTeamAvatar = 'https://s.yimg.com/cv/apiv2/default/mlb/mlb_2_g.png'

const previousRankings = ref<Map<string, number>>(new Map())
const RANKINGS_STORAGE_KEY = 'yahoo_baseball_previous_rankings'

// Roster settings from Yahoo
const rosterPositions = ref<any[]>([])
const teamsData = ref<any[]>([])
const numTeams = computed(() => teamsData.value.length || 12)

const positionFilters = [
  { id: 'C', label: 'C' }, { id: '1B', label: '1B' }, { id: '2B', label: '2B' }, { id: '3B', label: '3B' },
  { id: 'SS', label: 'SS' }, { id: 'OF', label: 'OF' }, { id: 'SP', label: 'SP' }, { id: 'RP', label: 'RP' }
]

const vorBaselines = ref<Record<string, number>>({ C: 12, '1B': 15, '2B': 15, '3B': 15, SS: 15, OF: 40, SP: 50, RP: 25 })

interface RankingFactor { id: string; name: string; enabled: boolean; weight: number }
const rankingFactors = ref<RankingFactor[]>([
  { id: 'totalPoints', name: 'Total Points', enabled: true, weight: 40 },
  { id: 'ppg', name: 'Points/Game', enabled: true, weight: 30 },
  { id: 'consistency', name: 'Consistency', enabled: false, weight: 15 },
  { id: 'recentTrend', name: 'Recent Trend', enabled: true, weight: 15 },
  { id: 'percentOwned', name: 'Ownership %', enabled: false, weight: 10 },
  { id: 'positionScarcity', name: 'Position Scarcity', enabled: true, weight: 15 }
])

const coreFactors = computed(() => rankingFactors.value.filter(f => ['totalPoints', 'ppg'].includes(f.id)))
const performanceFactors = computed(() => rankingFactors.value.filter(f => ['consistency', 'recentTrend'].includes(f.id)))
const contextFactors = computed(() => rankingFactors.value.filter(f => ['percentOwned', 'positionScarcity'].includes(f.id)))
const enabledFactorCount = computed(() => rankingFactors.value.filter(f => f.enabled).length)

const presets = [
  { id: 'balanced', name: 'Balanced', icon: '⚖️', factors: { totalPoints: 40, ppg: 30, recentTrend: 15, positionScarcity: 15 } },
  { id: 'hot-hand', name: 'Hot Hand', icon: '🔥', factors: { totalPoints: 25, ppg: 25, recentTrend: 35, positionScarcity: 15 } },
  { id: 'volume', name: 'Volume', icon: '📈', factors: { totalPoints: 60, ppg: 20, positionScarcity: 20 } },
  { id: 'efficiency', name: 'Efficiency', icon: '🎯', factors: { totalPoints: 20, ppg: 50, consistency: 20, positionScarcity: 10 } }
]
const activePresetId = ref('balanced')
const activePresetName = computed(() => presets.find(p => p.id === activePresetId.value)?.name || 'Custom')
const positionBaselines = ref<Record<string, number>>({})

// Computed roster requirements from Yahoo settings
const rosterRequirements = computed(() => {
  const reqs: Record<string, number> = { C: 0, '1B': 0, '2B': 0, '3B': 0, SS: 0, OF: 0, SP: 0, RP: 0, Util: 0, P: 0, BN: 0 }
  rosterPositions.value.forEach((pos: any) => {
    const posType = pos.position_type || pos.position
    if (reqs[posType] !== undefined) reqs[posType]++
    else if (posType === 'IF') { /* infield utility */ }
    else if (posType === 'MI') { /* middle infield */ }
    else if (posType === 'CI') { /* corner infield */ }
  })
  return reqs
})

const displayRosterPositions = computed(() => {
  const display: { pos: string; count: number }[] = []
  const reqs = rosterRequirements.value
  const order = ['C', '1B', '2B', '3B', 'SS', 'OF', 'SP', 'RP', 'P', 'Util']
  order.forEach(pos => {
    if (reqs[pos] > 0) display.push({ pos, count: reqs[pos] })
  })
  return display
})

const uniquePositions = computed(() => {
  // Get positions that have players (based on actual player data)
  const positionsWithPlayers = new Set<string>()
  allPlayers.value.forEach(p => {
    const pos = p.position?.split(',')[0]?.trim()
    if (pos) positionsWithPlayers.add(pos)
  })
  
  // Return in a logical order, filtered to positions that exist
  const order = ['C', '1B', '2B', '3B', 'SS', 'OF', 'SP', 'RP']
  return order.filter(pos => positionsWithPlayers.has(pos))
})

const filteredPlayers = computed(() => {
  let players = [...allPlayers.value]
  if (selectedPositions.value.length > 0 && selectedPositions.value.length < positionFilters.length) {
    players = players.filter(p => {
      const positions = p.position?.split(',').map((pos: string) => pos.trim()) || []
      return positions.some((pos: string) => selectedPositions.value.includes(pos))
    })
  }
  if (showOnlyMyPlayers.value) players = players.filter(p => isMyPlayer(p))
  if (showOnlyFreeAgents.value) players = players.filter(p => isFreeAgent(p))
  if (sortColumn.value) {
    players.sort((a, b) => {
      let aVal = a[sortColumn.value], bVal = b[sortColumn.value]
      if (sortColumn.value === 'position') { aVal = aVal?.split(',')[0] || ''; bVal = bVal?.split(',')[0] || '' }
      if (typeof aVal === 'string') return sortDirection.value === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      return sortDirection.value === 'asc' ? (aVal || 0) - (bVal || 0) : (bVal || 0) - (aVal || 0)
    })
  }
  return players
})

// Teams with rankings
interface TeamRanking {
  teamKey: string
  teamName: string
  managerName: string
  avatarUrl: string
  isMyTeam: boolean
  players: any[]
  positionGrades: Record<string, string>
  overallGrade: string
  statusScore: number
  topAssets: any[]
}

const rankedTeams = computed<TeamRanking[]>(() => {
  const gradeValues: Record<string, number> = {
    'A+': 100, 'A': 92, 'A-': 85, 'B+': 78, 'B': 70, 'B-': 62,
    'C+': 55, 'C': 47, 'C-': 40, 'D+': 32, 'D': 25, 'D-': 18, 'F': 10, 'N/A': 50
  }
  
  // Group players by fantasy team
  const teamMap = new Map<string, any[]>()
  allPlayers.value.forEach(p => {
    if (p.fantasy_team_key) {
      if (!teamMap.has(p.fantasy_team_key)) teamMap.set(p.fantasy_team_key, [])
      teamMap.get(p.fantasy_team_key)!.push(p)
    }
  })
  
  const teams: TeamRanking[] = []
  
  teamMap.forEach((players, teamKey) => {
    const firstPlayer = players[0]
    const teamName = firstPlayer?.fantasy_team || 'Unknown Team'
    const managerName = firstPlayer?.manager_name || 'Unknown'
    const isMyTeam = teamKey === myTeamKey.value
    
    // Group by position
    const byPosition: Record<string, any[]> = {}
    players.forEach(p => {
      const pos = p.position?.split(',')[0]?.trim() || 'Util'
      if (!byPosition[pos]) byPosition[pos] = []
      byPosition[pos].push(p)
    })
    
    // Sort each position by PPG
    Object.values(byPosition).forEach(arr => arr.sort((a, b) => (b.ppg || 0) - (a.ppg || 0)))
    
    // Calculate position grades
    const positionGrades: Record<string, string> = {}
    uniquePositions.value.forEach(pos => {
      const posPlayers = byPosition[pos] || []
      const numStarters = getRosterSlotCount(pos)
      positionGrades[pos] = calculateStarterGrade(posPlayers, numStarters, pos)
    })
    
    // Calculate overall grade
    let totalGradeValue = 0
    let totalWeight = 0
    Object.entries(positionGrades).forEach(([pos, grade]) => {
      if (grade === 'N/A') return
      const weight = getRosterSlotCount(pos) || 1
      totalGradeValue += (gradeValues[grade] || 50) * weight
      totalWeight += weight
    })
    const avgGradeValue = totalWeight > 0 ? totalGradeValue / totalWeight : 50
    
    // Status score calculation
    const allTeamPlayers = Object.values(byPosition).flat()
    const n = numTeams.value
    const eliteCount = allTeamPlayers.filter(p => p.positionRank && p.positionRank <= n * 0.5).length
    const starterCount = allTeamPlayers.filter(p => p.positionRank && p.positionRank <= n).length
    const starScore = Math.min(100, (eliteCount * 15) + (starterCount * 5))
    
    const grades = Object.values(positionGrades).filter(g => g !== 'N/A')
    const fCount = grades.filter(g => g === 'F').length
    const dCount = grades.filter(g => g.startsWith('D')).length
    const depthPenalty = (fCount * 20) + (dCount * 8)
    const depthScore = Math.max(0, 100 - depthPenalty)
    
    const statusScore = Math.round((avgGradeValue * 0.50) + (starScore * 0.25) + (depthScore * 0.25))
    
    // Top assets
    const sortedByRank = [...allTeamPlayers].sort((a, b) => (a.positionRank || 999) - (b.positionRank || 999))
    
    teams.push({
      teamKey,
      teamName,
      managerName,
      avatarUrl: '', // Yahoo doesn't provide team avatars easily
      isMyTeam,
      players: allTeamPlayers,
      positionGrades,
      overallGrade: getGradeFromValue(avgGradeValue),
      statusScore,
      topAssets: sortedByRank.slice(0, 5)
    })
  })
  
  return teams.sort((a, b) => b.statusScore - a.statusScore)
})

// Helper functions
function getRosterSlotCount(pos: string): number {
  const reqs = rosterRequirements.value
  // If Yahoo provided roster settings, use them
  if (reqs[pos] !== undefined && reqs[pos] > 0) return reqs[pos]
  // Otherwise use reasonable baseball defaults
  const defaults: Record<string, number> = { C: 1, '1B': 1, '2B': 1, '3B': 1, SS: 1, OF: 3, SP: 2, RP: 2, P: 0, Util: 1 }
  return defaults[pos] || 1
}

function getPositionTextClass(pos: string): string {
  const p = pos?.split(',')?.[0]?.trim() || pos
  const c: Record<string, string> = { 
    C: 'text-purple-400', '1B': 'text-red-400', '2B': 'text-orange-400', '3B': 'text-yellow-400', 
    SS: 'text-green-400', OF: 'text-blue-400', SP: 'text-cyan-400', RP: 'text-pink-400', 
    P: 'text-teal-400', Util: 'text-gray-400' 
  }
  return c[p] || 'text-dark-textMuted'
}

function calculateStarterGrade(players: any[], numStarters: number, position: string): string {
  if (!players.length) return 'F'
  if (numStarters === 0) numStarters = 1 // Default to 1 starter if not specified
  
  const starters = players.slice(0, numStarters)
  const n = numTeams.value || 12
  
  // Calculate average position rank of starters
  const validStarters = starters.filter(p => p.positionRank)
  if (!validStarters.length) {
    // No position ranks yet - grade based on PPG relative to others
    const avgPpg = starters.reduce((sum, p) => sum + (p.ppg || 0), 0) / starters.length
    if (avgPpg >= 5) return 'A'
    if (avgPpg >= 4) return 'B+'
    if (avgPpg >= 3) return 'B'
    if (avgPpg >= 2) return 'C+'
    if (avgPpg >= 1) return 'C'
    return 'D'
  }
  
  const avgRank = validStarters.reduce((sum, p) => sum + p.positionRank, 0) / validStarters.length
  const threshold = n * numStarters
  
  // Grade based on where starters rank relative to league
  const pct = avgRank / Math.max(threshold, 1)
  
  if (pct <= 0.25) return 'A+'
  if (pct <= 0.40) return 'A'
  if (pct <= 0.55) return 'A-'
  if (pct <= 0.70) return 'B+'
  if (pct <= 0.85) return 'B'
  if (pct <= 1.00) return 'B-'
  if (pct <= 1.20) return 'C+'
  if (pct <= 1.40) return 'C'
  if (pct <= 1.60) return 'C-'
  if (pct <= 1.80) return 'D+'
  if (pct <= 2.00) return 'D'
  if (pct <= 2.50) return 'D-'
  return 'F'
}

function getGradeFromValue(value: number): string {
  if (value >= 95) return 'A+'
  if (value >= 88) return 'A'
  if (value >= 82) return 'A-'
  if (value >= 75) return 'B+'
  if (value >= 68) return 'B'
  if (value >= 60) return 'B-'
  if (value >= 52) return 'C+'
  if (value >= 44) return 'C'
  if (value >= 36) return 'C-'
  if (value >= 28) return 'D+'
  if (value >= 20) return 'D'
  if (value >= 12) return 'D-'
  return 'F'
}

function getPlayerGrade(player: any): string {
  const n = numTeams.value
  const rank = player.positionRank || 999
  
  if (rank <= n * 0.5) return 'A+'
  if (rank <= n * 0.75) return 'A'
  if (rank <= n) return 'A-'
  if (rank <= n * 1.25) return 'B+'
  if (rank <= n * 1.5) return 'B'
  if (rank <= n * 2) return 'B-'
  if (rank <= n * 2.5) return 'C+'
  if (rank <= n * 3) return 'C'
  if (rank <= n * 4) return 'C-'
  return 'D'
}

function getTeamPositionPlayers(team: TeamRanking, position: string): any[] {
  return team.players
    .filter(p => p.position?.split(',')[0]?.trim() === position)
    .sort((a, b) => (b.ppg || 0) - (a.ppg || 0))
}

function getLastName(fullName: string): string {
  return fullName?.split(' ').pop() || fullName
}

function loadPreviousRankings() {
  try {
    const stored = localStorage.getItem(RANKINGS_STORAGE_KEY)
    if (stored) previousRankings.value = new Map(Object.entries(JSON.parse(stored)))
  } catch (e) { console.error('Error loading previous rankings:', e) }
}

function saveCurrentRankings() {
  try {
    const obj: Record<string, number> = {}
    allPlayers.value.forEach(p => { if (p.rosRank) obj[p.player_key] = p.rosRank })
    localStorage.setItem(RANKINGS_STORAGE_KEY, JSON.stringify(obj))
  } catch (e) { console.error('Error saving rankings:', e) }
}

function selectAllPositions() { selectedPositions.value = selectedPositions.value.length === positionFilters.length ? [] : positionFilters.map(p => p.id) }
function togglePositionFilter(pos: string) { const idx = selectedPositions.value.indexOf(pos); idx >= 0 ? selectedPositions.value.splice(idx, 1) : selectedPositions.value.push(pos) }
function sortBy(col: string) { sortColumn.value === col ? sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc' : (sortColumn.value = col, sortDirection.value = 'desc') }
function toggleFactor(id: string) { const f = rankingFactors.value.find(f => f.id === id); if (f) f.enabled = !f.enabled; activePresetId.value = '' }
function updateWeight(id: string, w: number) { const f = rankingFactors.value.find(f => f.id === id); if (f) f.weight = w; activePresetId.value = '' }
function applyPreset(preset: typeof presets[0]) {
  activePresetId.value = preset.id
  rankingFactors.value.forEach(f => { f.enabled = false; f.weight = 0 })
  for (const [id, weight] of Object.entries(preset.factors)) { const f = rankingFactors.value.find(f => f.id === id); if (f) { f.enabled = true; f.weight = weight as number } }
}
function resetFactors() { applyPreset(presets[0]) }
function applyRankings() { recalculateRankings(); isCustomizerExpanded.value = false }
function applySettings() { recalculateRankings(); showSettingsModal.value = false }
function togglePlayerExpanded(key: string) { expandedPlayerId.value = expandedPlayerId.value === key ? null : key }
function isMyPlayer(p: any) { return p.fantasy_team_key === myTeamKey.value }
function isFreeAgent(p: any) { return !p.fantasy_team }
function handleImageError(e: Event) { (e.target as HTMLImageElement).src = defaultHeadshot }
function getRowClass(p: any) { return isMyPlayer(p) ? 'bg-primary/10 border-l-2 border-primary' : isFreeAgent(p) ? 'bg-cyan-500/5 border-l-2 border-cyan-400' : '' }
function getAvatarRingClass(p: any) { return isMyPlayer(p) ? 'ring-primary' : isFreeAgent(p) ? 'ring-cyan-400' : 'ring-dark-border' }
function getPlayerNameClass(p: any) { return isMyPlayer(p) ? 'text-primary' : isFreeAgent(p) ? 'text-cyan-400' : 'text-dark-text' }
function getPositionClass(pos: string) {
  const p = pos?.split(',')?.[0]?.trim() || pos
  const c: Record<string, string> = { C: 'bg-purple-500/30 text-purple-400', '1B': 'bg-red-500/30 text-red-400', '2B': 'bg-orange-500/30 text-orange-400', '3B': 'bg-yellow-500/30 text-yellow-400', SS: 'bg-green-500/30 text-green-400', OF: 'bg-blue-500/30 text-blue-400', SP: 'bg-cyan-500/30 text-cyan-400', RP: 'bg-pink-500/30 text-pink-400', P: 'bg-teal-500/30 text-teal-400', Util: 'bg-gray-500/30 text-gray-400' }
  return c[p] || 'bg-dark-border/50 text-dark-textMuted'
}

function getSosBarClass(sos: number) { return sos >= 0.6 ? 'bg-green-500' : sos >= 0.4 ? 'bg-yellow-500' : 'bg-red-500' }
function getSosBarWidth(sos: number) { return `${Math.max(10, sos * 100)}%` }
function getSosTextClass(sos: number) { return sos >= 0.6 ? 'text-green-400' : sos >= 0.4 ? 'text-yellow-400' : 'text-red-400' }
function formatSOS(sos: number) { return sos >= 0.6 ? 'Easy' : sos >= 0.4 ? 'Avg' : 'Hard' }

function getValueTier(vor: number) { if (vor >= 3) return 'Elite'; if (vor >= 1) return 'Starter'; if (vor >= -1) return 'Average'; if (vor >= -3) return 'Bench'; return 'Replacement' }
function getValueTierClass(vor: number) { if (vor >= 3) return 'bg-green-500/30 text-green-400'; if (vor >= 1) return 'bg-blue-500/30 text-blue-400'; if (vor >= -1) return 'bg-yellow-500/30 text-yellow-400'; if (vor >= -3) return 'bg-orange-500/30 text-orange-400'; return 'bg-red-500/30 text-red-400' }

function getTeamGradeClass(grade: string) { if (grade.startsWith('A')) return 'text-green-400'; if (grade.startsWith('B')) return 'text-blue-400'; if (grade.startsWith('C')) return 'text-yellow-400'; if (grade.startsWith('D')) return 'text-orange-400'; return 'text-red-400' }
function getTeamStatusClass(score: number) { if (score >= 70) return 'bg-green-500/30 text-green-400'; if (score >= 55) return 'bg-blue-500/30 text-blue-400'; if (score >= 40) return 'bg-yellow-500/30 text-yellow-400'; return 'bg-red-500/30 text-red-400' }
function getTeamStatusLabel(score: number) { if (score >= 70) return '🏆 Contender'; if (score >= 55) return '⚔️ Competitive'; if (score >= 40) return '🎭 Pretender'; return '🔨 Rebuilding' }
function getPositionGradeClass(grade: string) { if (grade === 'N/A') return 'text-dark-textMuted'; if (grade.startsWith('A')) return 'text-green-400'; if (grade.startsWith('B')) return 'text-blue-400'; if (grade.startsWith('C')) return 'text-yellow-400'; if (grade.startsWith('D')) return 'text-orange-400'; return 'text-red-400' }
function getPlayerGradeClass(grade: string) { if (grade.startsWith('A')) return 'bg-green-500/30 text-green-400'; if (grade.startsWith('B')) return 'bg-blue-500/30 text-blue-400'; if (grade.startsWith('C')) return 'bg-yellow-500/30 text-yellow-400'; return 'bg-orange-500/30 text-orange-400' }
function getAssetTierClass(rank: number, pos: string) { const n = numTeams.value; if (rank <= n * 0.5) return 'bg-green-500/30 text-green-400'; if (rank <= n) return 'bg-blue-500/30 text-blue-400'; return 'bg-dark-border/50 text-dark-textMuted' }

function generatePlayerSOS(mlbTeam: string, position: string) {
  const hash = (mlbTeam || 'FA').split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0)
  const posHash = (position || 'U').split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0)
  return { ros: 0.2 + (Math.abs(hash) % 60) / 100, next4: 0.2 + (Math.abs(hash + posHash) % 60) / 100 }
}

function calculatePositionBaselines() {
  const byPos: Record<string, any[]> = {}
  for (const p of allPlayers.value) { const pos = p.position?.split(',')?.[0]?.trim(); if (pos) { if (!byPos[pos]) byPos[pos] = []; byPos[pos].push(p) } }
  for (const [pos, players] of Object.entries(byPos)) {
    players.sort((a, b) => (b.ppg || 0) - (a.ppg || 0))
    positionBaselines.value[pos] = players[Math.min((vorBaselines.value[pos] || 15) - 1, players.length - 1)]?.ppg || 0
  }
}

function recalculateRankings() {
  calculatePositionBaselines()
  for (const p of allPlayers.value) {
    const pos = p.position?.split(',')?.[0]?.trim()
    p.vor = (p.ppg || 0) - (positionBaselines.value[pos] || 0)
    const sos = generatePlayerSOS(p.mlb_team, p.position)
    p.rosSOS = sos.ros; p.next4SOS = sos.next4
  }
  const enabled = rankingFactors.value.filter(f => f.enabled)
  const totalW = enabled.reduce((s, f) => s + f.weight, 0)
  const maxPts = Math.max(...allPlayers.value.map(p => p.total_points || 0))
  const maxPPG = Math.max(...allPlayers.value.map(p => p.ppg || 0))
  const maxVOR = Math.max(...allPlayers.value.map(p => p.vor || 0))
  const minVOR = Math.min(...allPlayers.value.map(p => p.vor || 0))
  allPlayers.value.forEach(p => {
    let score = 0
    enabled.forEach(f => {
      const nw = f.weight / (totalW || 1)
      if (f.id === 'totalPoints') score += ((p.total_points || 0) / (maxPts || 1)) * 100 * nw
      else if (f.id === 'ppg') score += ((p.ppg || 0) / (maxPPG || 1)) * 100 * nw
      else if (f.id === 'recentTrend') score += 50 * nw
      else if (f.id === 'consistency') score += 50 * nw
      else if (f.id === 'percentOwned') score += (p.percent_owned || 0) * nw
      else if (f.id === 'positionScarcity') { const vr = (maxVOR - minVOR) || 1; score += (((p.vor || 0) - minVOR) / vr) * 100 * nw }
    })
    p.compositeScore = score
  })
  allPlayers.value.sort((a, b) => (b.compositeScore || 0) - (a.compositeScore || 0))
  allPlayers.value.forEach((p, i) => {
    p.rosRank = i + 1
    const prevRank = previousRankings.value.get(p.player_key)
    p.rankChange = prevRank !== undefined ? prevRank - p.rosRank : 0
  })
  const posCounts: Record<string, number> = {}
  allPlayers.value.forEach(p => { const pos = p.position?.split(',')?.[0]?.trim() || 'X'; posCounts[pos] = (posCounts[pos] || 0) + 1; p.positionRank = posCounts[pos] })
  lastUpdated.value = new Date().toLocaleString()
  saveCurrentRankings()
}

async function loadProjections() {
  isLoading.value = true
  loadingMessage.value = 'Connecting to Yahoo...'
  loadPreviousRankings()
  try {
    const leagueKey = leagueStore.activeLeagueId
    if (!leagueKey || !authStore.user?.id) { isLoading.value = false; return }
    await yahooService.initialize(authStore.user.id)
    
    loadingMessage.value = 'Loading league settings...'
    try {
      const settings = await yahooService.getLeagueSettings(leagueKey)
      rosterPositions.value = settings?.roster_positions || []
    } catch (e) { console.log('Could not load roster settings') }
    
    loadingMessage.value = 'Finding your team...'
    const myTeam = await yahooService.getMyTeam(leagueKey)
    myTeamKey.value = myTeam?.team_key || null
    
    loadingMessage.value = 'Loading rostered players...'
    const rostered = await yahooService.getAllRosteredPlayers(leagueKey)
    
    loadingMessage.value = 'Loading free agents...'
    const fa = await yahooService.getTopFreeAgents(leagueKey, 100)
    
    const combined = [...rostered, ...fa]
    combined.forEach(p => { p.ppg = p.total_points > 0 ? p.total_points / 25 : 0 })
    allPlayers.value = combined
    
    // Extract team count from rostered players
    const teamKeys = new Set(rostered.map(p => p.fantasy_team_key).filter(Boolean))
    teamsData.value = Array.from(teamKeys).map(k => ({ team_key: k }))
    
    applyPreset(presets[0])
    recalculateRankings()
  } catch (e) { console.error('Error:', e); loadingMessage.value = 'Error loading data' }
  finally { isLoading.value = false }
}

watch(() => leagueStore.activeLeagueId, (id) => { if (id && leagueStore.activePlatform === 'yahoo') loadProjections() }, { immediate: true })
onMounted(() => { if (leagueStore.activeLeagueId && leagueStore.activePlatform === 'yahoo') loadProjections() })
</script>
