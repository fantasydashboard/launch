<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="text-3xl font-bold text-dark-text mb-2">Draft Analysis</h1>
        <p class="text-base text-dark-textMuted">
          Visual draft board with pick analysis and performance tracking
        </p>
      </div>
      <div class="flex items-center gap-3">
        <!-- Platform Badge -->
        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full border" :class="platformBadgeClass">
          <img 
            :src="isEspn ? '/espn-logo.svg' : '/yahoo-fantasy.svg'" 
            :alt="platformName"
            class="h-5 w-auto"
          />
          <span class="text-sm" :class="platformTextClass">{{ platformName }} Fantasy Baseball</span>
        </div>
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
        :class="activeTab === tab.id ? 'bg-yellow-400 text-gray-900' : 'bg-dark-card text-dark-textSecondary hover:bg-dark-border/50'"
        class="px-4 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 text-sm"
      >
        <span class="text-lg">{{ tab.icon }}</span>
        {{ tab.name }}
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-yellow-400 mx-auto mb-4"></div>
        <p class="text-dark-textMuted">Loading draft data...</p>
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
                <span class="text-dark-textMuted">Value Pick (+8 or better)</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-4 h-4 rounded bg-red-500/20 border-l-2 border-red-500"></div>
                <span class="text-dark-textMuted">Reach (-8 or worse)</span>
              </div>
            </div>
            <div class="flex items-center gap-2 text-yellow-400 text-sm">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              <span>Select team or player for details</span>
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
              class="w-32 flex-shrink-0 bg-dark-card rounded-t-lg p-2 text-center"
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
              class="w-32 flex-shrink-0"
            >
              <div 
                v-if="getPickForRound(team.team_key, round)"
                @click="selectPick(getPickForRound(team.team_key, round))"
                class="bg-dark-card rounded-lg p-2 cursor-pointer hover:ring-2 hover:ring-yellow-400 transition-all h-full"
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
                <div v-if="getPickForRound(team.team_key, round)?.score !== undefined" class="mt-1">
                  <span 
                    class="text-xs font-bold"
                    :class="getPickForRound(team.team_key, round)?.score >= 0 ? 'text-green-400' : 'text-red-400'"
                  >
                    {{ getPickForRound(team.team_key, round)?.score >= 0 ? '+' : '' }}{{ getPickForRound(team.team_key, round)?.score?.toFixed(1) }}
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

    <!-- ==================== PLAYER GRADES TAB ==================== -->
    <template v-else-if="activeTab === 'grades'">
      <!-- Controls -->
      <div class="card">
        <div class="card-body py-3">
          <div class="flex items-center gap-4 flex-wrap">
            <div class="flex items-center gap-2">
              <label class="text-sm text-dark-textMuted">Team:</label>
              <select v-model="selectedTeamFilter" class="select text-sm py-1.5">
                <option value="">All Teams</option>
                <option v-for="team in draftBoard" :key="team.team_key" :value="team.team_key">
                  {{ team.team_name }}
                </option>
              </select>
            </div>
            <div class="flex items-center gap-2">
              <label class="text-sm text-dark-textMuted">Sort:</label>
              <select v-model="gradeSort" class="select text-sm py-1.5">
                <option value="pick">By Pick</option>
                <option value="score">By Score</option>
                <option value="grade">By Grade</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Team Draft Grades Summary -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div 
          v-for="team in teamGrades" 
          :key="team.team_key"
          class="card cursor-pointer hover:ring-2 hover:ring-yellow-400 transition-all"
          @click="selectedTeamFilter = team.team_key"
        >
          <div class="card-body">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 rounded-full bg-dark-border overflow-hidden">
                <img v-if="team.logo_url" :src="team.logo_url" class="w-full h-full object-cover" @error="handleImageError" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-dark-text truncate">{{ team.team_name }}</div>
                <div class="text-xs text-dark-textMuted">{{ team.picks.length }} picks</div>
              </div>
              <div 
                class="text-3xl font-black"
                :class="getGradeClass(team.grade)"
              >
                {{ team.grade }}
              </div>
            </div>
            <div class="grid grid-cols-3 gap-2 text-center text-xs">
              <div class="bg-dark-border/30 rounded p-2">
                <div class="font-bold text-dark-text">{{ team.totalScore >= 0 ? '+' : '' }}{{ team.totalScore.toFixed(1) }}</div>
                <div class="text-dark-textMuted">Total</div>
              </div>
              <div class="bg-dark-border/30 rounded p-2">
                <div class="font-bold text-green-400">{{ team.hits }}</div>
                <div class="text-dark-textMuted">Hits</div>
              </div>
              <div class="bg-dark-border/30 rounded p-2">
                <div class="font-bold text-red-400">{{ team.misses }}</div>
                <div class="text-dark-textMuted">Misses</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Individual Player Grades -->
      <div class="card mt-6">
        <div class="card-header">
          <h3 class="text-lg font-bold text-dark-text">
            {{ selectedTeamFilter ? teamGrades.find(t => t.team_key === selectedTeamFilter)?.team_name + ' Picks' : 'All Picks' }}
          </h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-dark-border">
                <th class="text-left p-3 text-sm font-semibold text-dark-textMuted">Pick</th>
                <th class="text-left p-3 text-sm font-semibold text-dark-textMuted">Player</th>
                <th class="text-left p-3 text-sm font-semibold text-dark-textMuted">Team</th>
                <th class="text-center p-3 text-sm font-semibold text-dark-textMuted">Pos</th>
                <th class="text-center p-3 text-sm font-semibold text-dark-textMuted">Score</th>
                <th class="text-center p-3 text-sm font-semibold text-dark-textMuted">Grade</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="pick in sortedGradePicks" 
                :key="pick.pick"
                class="border-b border-dark-border/50 hover:bg-dark-border/20 cursor-pointer"
                @click="selectPick(pick)"
              >
                <td class="p-3">
                  <div class="text-sm font-medium text-dark-text">{{ pick.round }}.{{ pick.pickInRound }}</div>
                  <div class="text-xs text-dark-textMuted">#{{ pick.pick }}</div>
                </td>
                <td class="p-3">
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full bg-dark-border overflow-hidden">
                      <img v-if="pick.headshot" :src="pick.headshot" class="w-full h-full object-cover" @error="handleImageError" />
                    </div>
                    <span class="font-medium text-dark-text">{{ pick.player_name }}</span>
                  </div>
                </td>
                <td class="p-3 text-sm text-dark-textMuted">{{ pick.team_name }}</td>
                <td class="p-3 text-center">
                  <span 
                    class="text-xs px-2 py-1 rounded font-bold"
                    :class="getPositionClass(pick.position)"
                  >
                    {{ pick.position }}
                  </span>
                </td>
                <td class="p-3 text-center">
                  <span 
                    class="font-bold"
                    :class="pick.score >= 0 ? 'text-green-400' : 'text-red-400'"
                  >
                    {{ pick.score >= 0 ? '+' : '' }}{{ pick.score?.toFixed(1) || '0.0' }}
                  </span>
                </td>
                <td class="p-3 text-center">
                  <span 
                    class="text-lg font-black"
                    :class="getGradeClass(pick.grade)"
                  >
                    {{ pick.grade }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- ==================== DEEP ANALYSIS TAB ==================== -->
    <template v-else-if="activeTab === 'analysis'">
      <!-- Round by Round Analysis -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="card">
          <div class="card-header">
            <h3 class="text-lg font-bold text-dark-text">🔥 Biggest Steals</h3>
          </div>
          <div class="card-body space-y-2">
            <div 
              v-for="(pick, idx) in topSteals" 
              :key="pick.pick"
              class="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg cursor-pointer hover:bg-green-500/20"
              @click="selectPick(pick)"
            >
              <div class="text-lg font-bold text-green-400 w-6">{{ idx + 1 }}</div>
              <div class="w-10 h-10 rounded-full bg-dark-border overflow-hidden">
                <img v-if="pick.headshot" :src="pick.headshot" class="w-full h-full object-cover" @error="handleImageError" />
              </div>
              <div class="flex-1">
                <div class="font-semibold text-dark-text">{{ pick.player_name }}</div>
                <div class="text-xs text-dark-textMuted">Round {{ pick.round }}, Pick {{ pick.pick }} • {{ pick.team_name }}</div>
              </div>
              <div class="text-right">
                <div class="text-lg font-bold text-green-400">+{{ pick.score?.toFixed(1) }}</div>
                <div class="text-xs text-dark-textMuted">{{ pick.position }}</div>
              </div>
            </div>
            <div v-if="topSteals.length === 0" class="text-center py-4 text-dark-textMuted">
              No significant steals found
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="text-lg font-bold text-dark-text">💀 Biggest Reaches</h3>
          </div>
          <div class="card-body space-y-2">
            <div 
              v-for="(pick, idx) in topReaches" 
              :key="pick.pick"
              class="flex items-center gap-3 p-3 bg-red-500/10 rounded-lg cursor-pointer hover:bg-red-500/20"
              @click="selectPick(pick)"
            >
              <div class="text-lg font-bold text-red-400 w-6">{{ idx + 1 }}</div>
              <div class="w-10 h-10 rounded-full bg-dark-border overflow-hidden">
                <img v-if="pick.headshot" :src="pick.headshot" class="w-full h-full object-cover" @error="handleImageError" />
              </div>
              <div class="flex-1">
                <div class="font-semibold text-dark-text">{{ pick.player_name }}</div>
                <div class="text-xs text-dark-textMuted">Round {{ pick.round }}, Pick {{ pick.pick }} • {{ pick.team_name }}</div>
              </div>
              <div class="text-right">
                <div class="text-lg font-bold text-red-400">{{ pick.score?.toFixed(1) }}</div>
                <div class="text-xs text-dark-textMuted">{{ pick.position }}</div>
              </div>
            </div>
            <div v-if="topReaches.length === 0" class="text-center py-4 text-dark-textMuted">
              No significant reaches found
            </div>
          </div>
        </div>
      </div>

      <!-- Position Breakdown -->
      <div class="card mt-6">
        <div class="card-header">
          <h3 class="text-lg font-bold text-dark-text">📊 Position Breakdown</h3>
        </div>
        <div class="card-body">
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div 
              v-for="pos in positionBreakdown" 
              :key="pos.position"
              class="bg-dark-border/30 rounded-xl p-4 text-center"
            >
              <div 
                class="text-2xl font-black mb-2"
                :class="getPositionClass(pos.position)"
              >
                {{ pos.position }}
              </div>
              <div class="text-sm text-dark-textMuted mb-2">{{ pos.count }} drafted</div>
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div class="font-bold text-dark-text">{{ pos.avgPick?.toFixed(1) || '-' }}</div>
                  <div class="text-dark-textMuted">Avg Pick</div>
                </div>
                <div>
                  <div class="font-bold" :class="pos.avgScore >= 0 ? 'text-green-400' : 'text-red-400'">
                    {{ pos.avgScore >= 0 ? '+' : '' }}{{ pos.avgScore?.toFixed(1) || '0.0' }}
                  </div>
                  <div class="text-dark-textMuted">Avg Score</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Round Analysis -->
      <div class="card mt-6">
        <div class="card-header">
          <h3 class="text-lg font-bold text-dark-text">🎯 Round-by-Round Analysis</h3>
        </div>
        <div class="card-body">
          <div class="space-y-3">
            <div 
              v-for="round in roundAnalysis" 
              :key="round.round"
              class="flex items-center gap-4 p-3 bg-dark-border/20 rounded-lg"
            >
              <div class="w-16 text-center">
                <div class="text-lg font-bold text-dark-text">R{{ round.round }}</div>
              </div>
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <div class="h-2 bg-green-500/30 rounded-full" :style="{ width: round.hitPct + '%' }"></div>
                  <div class="h-2 bg-red-500/30 rounded-full" :style="{ width: round.missPct + '%' }"></div>
                </div>
                <div class="text-xs text-dark-textMuted">
                  {{ round.hits }} hits, {{ round.misses }} misses
                </div>
              </div>
              <div class="text-right">
                <div 
                  class="font-bold"
                  :class="round.avgScore >= 0 ? 'text-green-400' : 'text-red-400'"
                >
                  {{ round.avgScore >= 0 ? '+' : '' }}{{ round.avgScore.toFixed(1) }}
                </div>
                <div class="text-xs text-dark-textMuted">avg score</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ==================== ACTUAL VALUE TAB ==================== -->
    <template v-else-if="activeTab === 'actual'">
      <div class="card">
        <div class="card-header">
          <h3 class="text-lg font-bold text-dark-text">🏆 Actual Season Value</h3>
          <p class="text-sm text-dark-textMuted mt-1">
            How each pick performed over the season based on total fantasy points
          </p>
        </div>
        <div class="card-body">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b border-dark-border">
                  <th class="text-left p-3 text-sm font-semibold text-dark-textMuted">Rank</th>
                  <th class="text-left p-3 text-sm font-semibold text-dark-textMuted">Player</th>
                  <th class="text-left p-3 text-sm font-semibold text-dark-textMuted">Team</th>
                  <th class="text-center p-3 text-sm font-semibold text-dark-textMuted">Drafted</th>
                  <th class="text-center p-3 text-sm font-semibold text-dark-textMuted">Points</th>
                  <th class="text-center p-3 text-sm font-semibold text-dark-textMuted">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="(player, idx) in actualValueRankings" 
                  :key="player.pick"
                  class="border-b border-dark-border/50 hover:bg-dark-border/20 cursor-pointer"
                  @click="selectPick(player)"
                >
                  <td class="p-3">
                    <div class="flex items-center gap-2">
                      <span class="text-lg font-bold" :class="idx < 3 ? 'text-primary' : 'text-dark-textMuted'">
                        {{ idx + 1 }}
                      </span>
                      <span v-if="idx === 0" class="text-xl">🥇</span>
                      <span v-else-if="idx === 1" class="text-xl">🥈</span>
                      <span v-else-if="idx === 2" class="text-xl">🥉</span>
                    </div>
                  </td>
                  <td class="p-3">
                    <div class="flex items-center gap-2">
                      <div class="w-8 h-8 rounded-full bg-dark-border overflow-hidden">
                        <img v-if="player.headshot" :src="player.headshot" class="w-full h-full object-cover" @error="handleImageError" />
                      </div>
                      <div>
                        <div class="font-medium text-dark-text">{{ player.player_name }}</div>
                        <span 
                          class="text-xs px-1.5 py-0.5 rounded font-bold"
                          :class="getPositionClass(player.position)"
                        >
                          {{ player.position }}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td class="p-3 text-sm text-dark-textMuted">{{ player.team_name }}</td>
                  <td class="p-3 text-center">
                    <div class="text-sm font-medium text-dark-text">R{{ player.round }}</div>
                    <div class="text-xs text-dark-textMuted">#{{ player.pick }}</div>
                  </td>
                  <td class="p-3 text-center">
                    <div class="font-bold text-primary">{{ player.totalPoints?.toFixed(1) || '0.0' }}</div>
                  </td>
                  <td class="p-3 text-center">
                    <span 
                      class="font-bold"
                      :class="player.valueScore >= 0 ? 'text-green-400' : 'text-red-400'"
                    >
                      {{ player.valueScore >= 0 ? '+' : '' }}{{ player.valueScore?.toFixed(1) || '0.0' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
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
        <div class="bg-dark-card rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
          <!-- Modal Header -->
          <div class="p-6 border-b border-dark-border flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="w-16 h-16 rounded-full bg-dark-border overflow-hidden ring-4" :class="getGradeRingClass(selectedPick.grade)">
                <img v-if="selectedPick.headshot" :src="selectedPick.headshot" class="w-full h-full object-cover" @error="handleImageError" />
              </div>
              <div>
                <h2 class="text-2xl font-bold text-dark-text">{{ selectedPick.player_name }}</h2>
                <div class="flex items-center gap-2 text-sm text-dark-textMuted">
                  <span class="px-2 py-0.5 rounded text-xs font-bold" :class="getPositionClass(selectedPick.position)">
                    {{ selectedPick.position }}
                  </span>
                  <span>•</span>
                  <span>{{ selectedPick.mlb_team || selectedPick.team }}</span>
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
            <!-- Draft Info & Grade -->
            <div class="grid grid-cols-2 gap-4">
              <div class="bg-dark-border/30 rounded-xl p-4">
                <div class="text-sm text-dark-textMuted mb-1">Draft Pick</div>
                <div class="text-2xl font-bold text-dark-text">R{{ selectedPick.round }}.{{ selectedPick.pickInRound }}</div>
                <div class="text-xs text-dark-textMuted">Overall #{{ selectedPick.pick }}</div>
              </div>
              <div class="bg-dark-border/30 rounded-xl p-4 text-center">
                <div class="text-sm text-dark-textMuted mb-1">Pick Grade</div>
                <div class="text-5xl font-black" :class="getGradeClass(selectedPick.grade)">{{ selectedPick.grade }}</div>
              </div>
            </div>

            <!-- Performance -->
            <div class="bg-dark-border/30 rounded-xl p-4">
              <h3 class="text-lg font-bold text-dark-text mb-4">Season Performance</h3>
              <div class="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div class="text-2xl font-bold text-primary">{{ selectedPick.totalPoints?.toFixed(1) || '0.0' }}</div>
                  <div class="text-xs text-dark-textMuted">Total Points</div>
                </div>
                <div>
                  <div class="text-2xl font-bold" :class="selectedPick.score >= 0 ? 'text-green-400' : 'text-red-400'">
                    {{ selectedPick.score >= 0 ? '+' : '' }}{{ selectedPick.score?.toFixed(1) || '0.0' }}
                  </div>
                  <div class="text-xs text-dark-textMuted">Value Score</div>
                </div>
              </div>
            </div>

            <!-- Drafted By -->
            <div class="bg-dark-border/30 rounded-xl p-4">
              <h3 class="text-lg font-bold text-dark-text mb-2">Drafted By</h3>
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-dark-border overflow-hidden">
                  <img v-if="selectedPick.team_logo" :src="selectedPick.team_logo" class="w-full h-full object-cover" @error="handleImageError" />
                </div>
                <div>
                  <div class="font-semibold text-dark-text">{{ selectedPick.team_name }}</div>
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

// Effective league key - use the actually loaded league (might be previous season)
const effectiveLeagueKey = computed(() => {
  if (leagueStore.currentLeague?.league_id) return leagueStore.currentLeague.league_id
  return leagueStore.activeLeagueId
})

// Check if ESPN platform - use both activePlatform AND league key format for robustness
const isEspn = computed(() => {
  // Primary check: activePlatform
  if (leagueStore.activePlatform === 'espn') return true
  // Fallback: check if league key starts with 'espn_'
  const leagueKey = leagueStore.currentLeague?.league_id || leagueStore.activeLeagueId
  if (leagueKey && leagueKey.startsWith('espn_')) return true
  return false
})

// Platform display helpers
const platformName = computed(() => isEspn.value ? 'ESPN' : 'Yahoo')

const platformBadgeClass = computed(() => {
  if (isEspn.value) {
    return 'border-red-500/30 bg-red-500/10'
  }
  return 'border-purple-500/30 bg-purple-500/10'
})

const platformTextClass = computed(() => {
  if (isEspn.value) {
    return 'text-red-400'
  }
  return 'text-purple-400'
})

// Tab options
const tabOptions = [
  { id: 'board', name: 'Draft Board', icon: '📋' },
  { id: 'grades', name: 'Player Grades', icon: '🎯' },
  { id: 'analysis', name: 'Deep Analysis', icon: '📊' },
  { id: 'actual', name: 'Actual Value', icon: '🏆' }
]

// State
const activeTab = ref('board')
const selectedSeason = ref('2025')
const positionFilter = ref('All')
const selectedTeamFilter = ref('')
const gradeSort = ref('pick')
const isLoading = ref(false)
const selectedPick = ref<any>(null)

// Data
const draftPicks = ref<any[]>([])
const playerData = ref<Map<string, any>>(new Map())
const playerStats = ref<Map<string, any>>(new Map())
const teamsData = ref<any[]>([])

// Default avatar for error handling
const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIGZpbGw9IiMzNzQxNTEiLz48cGF0aCBkPSJNMjAgMjBDMjMuMzEzNyAyMCAyNiAxNy4zMTM3IDI2IDE0QzI2IDEwLjY4NjMgMjMuMzEzNyA4IDIwIDhDMTYuNjg2MyA4IDE0IDEwLjY4NjMgMTQgMTRDMTQgMTcuMzEzNyAxNi42ODYzIDIwIDIwIDIwWiIgZmlsbD0iIzZCNzI4MCIvPjxwYXRoIGQ9Ik0zMiAzMkMzMiAyNy41ODE3IDI2LjYyNzQgMjQgMjAgMjRDMTMuMzcyNiAyNCAgMjcuNTgxNyA4IDMyIDMyWiIgZmlsbD0iIzZCNzI4MCIvPjwvc3ZnPg=='

// Available seasons based on game keys
const availableSeasons = computed(() => {
  return ['2025', '2024', '2023', '2022', '2021', '2020']
})

// Get available positions from draft picks
const availablePositions = computed(() => {
  const positions = new Set<string>()
  draftPicks.value.forEach(pick => {
    if (pick.position) positions.add(pick.position)
  })
  return Array.from(positions).sort()
})

// Filter picks by position
const filteredPicks = computed(() => {
  if (positionFilter.value === 'All') return draftPicks.value
  return draftPicks.value.filter(p => p.position === positionFilter.value)
})

// Total rounds in draft
const totalRounds = computed(() => {
  return Math.max(...draftPicks.value.map(p => p.round), 0)
})

// Draft board organized by teams
const draftBoard = computed(() => {
  const teamMap = new Map<string, any>()
  
  for (const pick of draftPicks.value) {
    if (!teamMap.has(pick.team_key)) {
      teamMap.set(pick.team_key, {
        team_key: pick.team_key,
        team_name: pick.team_name,
        logo_url: pick.team_logo,
        picks: []
      })
    }
    teamMap.get(pick.team_key).picks.push(pick)
  }
  
  return Array.from(teamMap.values()).sort((a, b) => {
    const aFirstPick = a.picks[0]?.pick || 999
    const bFirstPick = b.picks[0]?.pick || 999
    return aFirstPick - bFirstPick
  })
})

// Team grades
const teamGrades = computed(() => {
  return draftBoard.value.map(team => {
    const picks = team.picks
    const totalScore = picks.reduce((sum: number, p: any) => sum + (p.score || 0), 0)
    const hits = picks.filter((p: any) => (p.score || 0) >= 3).length
    const misses = picks.filter((p: any) => (p.score || 0) <= -3).length
    const avgScore = picks.length > 0 ? totalScore / picks.length : 0
    
    return {
      ...team,
      totalScore,
      hits,
      misses,
      avgScore,
      grade: calculateGrade(avgScore)
    }
  }).sort((a, b) => b.totalScore - a.totalScore)
})

// Sorted picks for grades tab
const sortedGradePicks = computed(() => {
  let picks = [...draftPicks.value]
  
  if (selectedTeamFilter.value) {
    picks = picks.filter(p => p.team_key === selectedTeamFilter.value)
  }
  
  if (gradeSort.value === 'score') {
    picks.sort((a, b) => (b.score || 0) - (a.score || 0))
  } else if (gradeSort.value === 'grade') {
    const gradeOrder: Record<string, number> = { 'A+': 10, 'A': 9, 'A-': 8, 'B+': 7, 'B': 6, 'B-': 5, 'C+': 4, 'C': 3, 'C-': 2, 'D': 1, 'F': 0 }
    picks.sort((a, b) => (gradeOrder[b.grade] || 0) - (gradeOrder[a.grade] || 0))
  } else {
    picks.sort((a, b) => a.pick - b.pick)
  }
  
  return picks
})

// Top steals (best value picks)
const topSteals = computed(() => {
  return [...draftPicks.value]
    .filter(p => (p.score || 0) >= 5)
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 10)
})

// Top reaches (worst value picks)
const topReaches = computed(() => {
  return [...draftPicks.value]
    .filter(p => (p.score || 0) <= -5)
    .sort((a, b) => (a.score || 0) - (b.score || 0))
    .slice(0, 10)
})

// Position breakdown
const positionBreakdown = computed(() => {
  const breakdown: Record<string, { position: string, count: number, totalPick: number, totalScore: number }> = {}
  
  for (const pick of draftPicks.value) {
    const pos = pick.position || 'Unknown'
    if (!breakdown[pos]) {
      breakdown[pos] = { position: pos, count: 0, totalPick: 0, totalScore: 0 }
    }
    breakdown[pos].count++
    breakdown[pos].totalPick += pick.pick
    breakdown[pos].totalScore += pick.score || 0
  }
  
  return Object.values(breakdown)
    .map(p => ({
      ...p,
      avgPick: p.count > 0 ? p.totalPick / p.count : 0,
      avgScore: p.count > 0 ? p.totalScore / p.count : 0
    }))
    .sort((a, b) => a.avgPick - b.avgPick)
})

// Round analysis
const roundAnalysis = computed(() => {
  const rounds: Record<number, { round: number, picks: any[] }> = {}
  
  for (const pick of draftPicks.value) {
    if (!rounds[pick.round]) {
      rounds[pick.round] = { round: pick.round, picks: [] }
    }
    rounds[pick.round].picks.push(pick)
  }
  
  return Object.values(rounds)
    .map(r => {
      const hits = r.picks.filter(p => (p.score || 0) >= 3).length
      const misses = r.picks.filter(p => (p.score || 0) <= -3).length
      const totalScore = r.picks.reduce((sum, p) => sum + (p.score || 0), 0)
      const total = r.picks.length
      
      return {
        round: r.round,
        hits,
        misses,
        hitPct: total > 0 ? (hits / total) * 100 : 0,
        missPct: total > 0 ? (misses / total) * 100 : 0,
        avgScore: total > 0 ? totalScore / total : 0
      }
    })
    .sort((a, b) => a.round - b.round)
})

// Actual value rankings (by total points)
const actualValueRankings = computed(() => {
  return [...draftPicks.value]
    .filter(p => p.totalPoints > 0)
    .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0))
    .map((p, idx) => ({
      ...p,
      valueScore: calculateValueScore(p, idx + 1)
    }))
})

// Helper functions
function getPickForRound(teamKey: string, round: number) {
  return draftPicks.value.find(p => p.team_key === teamKey && p.round === round)
}

function getPickClass(pick: any) {
  if (!pick) return ''
  const score = pick.score || 0
  if (score >= 8) return 'bg-green-500/20 border-l-2 border-green-500'
  if (score <= -8) return 'bg-red-500/20 border-l-2 border-red-500'
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
    'BN': 'bg-gray-500/20 text-gray-400',
  }
  return classes[position] || 'bg-gray-500/20 text-gray-400'
}

function getGradeClass(grade: string) {
  if (grade.startsWith('A')) return 'text-green-400'
  if (grade.startsWith('B')) return 'text-lime-400'
  if (grade.startsWith('C')) return 'text-yellow-400'
  if (grade.startsWith('D')) return 'text-orange-400'
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
  if (score >= 10) return 'A+'
  if (score >= 7) return 'A'
  if (score >= 4) return 'A-'
  if (score >= 2) return 'B+'
  if (score >= 0) return 'B'
  if (score >= -2) return 'B-'
  if (score >= -4) return 'C+'
  if (score >= -6) return 'C'
  if (score >= -8) return 'C-'
  if (score >= -10) return 'D'
  return 'F'
}

function calculateValueScore(pick: any, actualRank: number): number {
  // Value = draft pick number - actual finish rank
  // Positive = outperformed draft position
  return pick.pick - actualRank
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
  const leagueKey = effectiveLeagueKey.value
  if (!leagueKey || !authStore.user?.id) return
  
  isLoading.value = true
  
  try {
    // Handle ESPN leagues
    if (isEspn.value) {
      console.log('[ESPN DRAFT] Loading draft for ESPN league:', leagueKey)
      
      // Dynamically import ESPN service
      const { espnService } = await import('@/services/espn')
      
      // Parse league key: espn_baseball_1227422768_2025
      const parts = leagueKey.split('_')
      const sport = parts[1] as 'football' | 'baseball' | 'basketball' | 'hockey'
      const espnLeagueId = parts[2]
      const currentSeason = parseInt(parts[3])
      const season = parseInt(selectedSeason.value) || currentSeason
      
      console.log('[ESPN DRAFT] Fetching draft for:', { sport, espnLeagueId, season })
      
      // Get draft picks
      const espnDraftPicks = await espnService.getDraft(sport, espnLeagueId, season)
      console.log('[ESPN DRAFT] Got', espnDraftPicks.length, 'draft picks')
      
      if (!espnDraftPicks || espnDraftPicks.length === 0) {
        console.log('[ESPN DRAFT] No draft data available')
        draftPicks.value = []
        isLoading.value = false
        return
      }
      
      // Get teams for mapping
      const teams = await espnService.getTeams(sport, espnLeagueId, season)
      teamsData.value = teams
      console.log('[ESPN DRAFT] Got', teams.length, 'teams')
      
      // Build team lookup
      const teamMap = new Map<number, any>()
      for (const team of teams) {
        teamMap.set(team.id, team)
      }
      
      // Collect all player IDs that need name resolution
      const playerIdsNeedingNames = espnDraftPicks
        .filter((p: any) => !p.playerName || p.playerName.startsWith('Player '))
        .map((p: any) => p.playerId)
      
      console.log('[ESPN DRAFT] Need to resolve names for', playerIdsNeedingNames.length, 'players')
      
      // Fetch player info for all drafted players
      let playerInfoMap = new Map<number, { name: string; position: string; team: string }>()
      if (playerIdsNeedingNames.length > 0) {
        try {
          playerInfoMap = await espnService.getPlayersByIds(sport, espnLeagueId, season, playerIdsNeedingNames)
          console.log('[ESPN DRAFT] Resolved', playerInfoMap.size, 'player names')
        } catch (e) {
          console.log('[ESPN DRAFT] Could not resolve player names:', e)
        }
      }
      
      // Also try to get roster data for additional player info (positions, etc.)
      let playerPositionMap = new Map<number, string>()
      try {
        const teamsWithRosters = await espnService.getTeamsWithRosters(sport, espnLeagueId, season)
        for (const team of teamsWithRosters) {
          if (team.roster) {
            for (const player of team.roster) {
              playerPositionMap.set(player.playerId, player.position)
              // Also use roster data for names if we didn't get them from getPlayersByIds
              if (!playerInfoMap.has(player.playerId) && player.fullName) {
                playerInfoMap.set(player.playerId, {
                  name: player.fullName,
                  position: player.position,
                  team: player.proTeam
                })
              }
            }
          }
        }
        console.log('[ESPN DRAFT] Got positions for', playerPositionMap.size, 'players from rosters')
      } catch (e) {
        console.log('[ESPN DRAFT] Could not get roster data for positions:', e)
      }
      
      // Get matchups to calculate total points per team
      const totalWeeks = sport === 'baseball' ? 24 : 17
      const teamTotalPoints = new Map<number, number>()
      
      // Initialize team points
      for (const team of teams) {
        // Use pointsFor from team record if available
        const pointsFor = team.pointsFor || 0
        teamTotalPoints.set(team.id, pointsFor)
      }
      
      console.log('[ESPN DRAFT] Team point totals:', [...teamTotalPoints.entries()])
      
      // Process draft picks
      // For ESPN, we'll use a simpler scoring approach based on draft position vs team performance
      const numTeams = teams.length || 12
      
      // Calculate team performance ranks (by total points)
      const teamRanks = [...teams]
        .sort((a, b) => (teamTotalPoints.get(b.id) || 0) - (teamTotalPoints.get(a.id) || 0))
        .map((team, idx) => ({ teamId: team.id, rank: idx + 1 }))
      
      const teamRankMap = new Map(teamRanks.map(t => [t.teamId, t.rank]))
      
      // Group picks by team to calculate team-level draft performance
      const picksByTeam = new Map<number, any[]>()
      for (const pick of espnDraftPicks) {
        if (!picksByTeam.has(pick.teamId)) {
          picksByTeam.set(pick.teamId, [])
        }
        picksByTeam.get(pick.teamId)!.push(pick)
      }
      
      // For individual pick scoring, we'll estimate based on:
      // Pick value = expected team finish based on draft position vs actual team finish
      // This is a team-level approximation since ESPN doesn't easily expose player season totals
      
      draftPicks.value = espnDraftPicks.map((pick: any) => {
        const team = teamMap.get(pick.teamId)
        const teamRank = teamRankMap.get(pick.teamId) || numTeams
        const teamPoints = teamTotalPoints.get(pick.teamId) || 0
        
        // Calculate round and pick in round
        const round = pick.roundId
        const pickInRound = pick.roundPickNumber
        
        // Get player info from our resolved data
        const playerInfo = playerInfoMap.get(pick.playerId)
        const playerName = pick.playerName && !pick.playerName.startsWith('Player ') 
          ? pick.playerName 
          : (playerInfo?.name || `Player ${pick.playerId}`)
        
        // Get position from multiple sources
        const position = pick.position || playerInfo?.position || playerPositionMap.get(pick.playerId) || 'Unknown'
        
        // Get MLB team
        const mlbTeam = playerInfo?.team || ''
        
        // For ESPN, estimate player value based on overall pick position
        // Earlier picks from successful teams = good picks
        // Later picks from successful teams = steals
        // Earlier picks from poor teams = reaches
        const expectedRank = Math.ceil(pick.overallPickNumber / Math.max(1, espnDraftPicks.length / numTeams))
        const score = expectedRank - teamRank
        
        return {
          pick: pick.overallPickNumber,
          round,
          pickInRound,
          team_key: `espn_team_${pick.teamId}`,
          team_name: team?.name || `Team ${pick.teamId}`,
          team_logo: team?.logo || '',
          player_key: `espn_player_${pick.playerId}`,
          player_name: playerName,
          position,
          mlb_team: mlbTeam,
          headshot: '',
          totalPoints: teamPoints / picksByTeam.get(pick.teamId)!.length, // Estimate per-player contribution
          score,
          grade: calculateGrade(score),
          keeper: pick.keeper,
          bidAmount: pick.bidAmount
        }
      })
      
      console.log('[ESPN DRAFT] Processed', draftPicks.value.length, 'draft picks')
      isLoading.value = false
      return
    }
    
    // Yahoo league handling (existing code)
    await yahooService.initialize(authStore.user.id)
    
    // Get game key and build league key for selected season
    const gameKeys: Record<string, string> = {
      '2025': '458', '2024': '431', '2023': '422', '2022': '412',
      '2021': '404', '2020': '398', '2019': '388'
    }
    
    const currentGameKey = leagueKey.split('.')[0]
    const leagueNum = leagueKey.split('.l.')[1]
    let seasonLeagueKey = leagueKey
    
    console.log('[POINTS DRAFT] Loading draft for league:', seasonLeagueKey)
    
    // Get draft results
    let draftResults = await yahooService.getDraftResults(seasonLeagueKey)
    console.log('[POINTS DRAFT] Draft results type:', draftResults.type, 'picks:', draftResults.picks?.length)
    
    // Check if draft has player data (draft_status might be "predraft" or picks might not have player_keys)
    let playerKeys = draftResults.picks?.map((p: any) => p.player_key).filter(Boolean) || []
    console.log('[POINTS DRAFT] Player keys found:', playerKeys.length, 'from', draftResults.picks?.length, 'picks')
    
    // If no player keys (draft hasn't happened), try to fall back to previous season
    if (playerKeys.length === 0 && draftResults.picks?.length > 0) {
      console.log('[POINTS DRAFT] Draft has picks but no player keys (predraft). Checking for previous season...')
      
      // Use renew field from draft results (already contains previous season info)
      const renewedFrom = draftResults.renew // Format: "431_136233" (previous year's game_leaguenum)
      console.log('[POINTS DRAFT] Renew field from draft results:', renewedFrom)
      
      if (renewedFrom) {
        const [prevGameKey, prevLeagueNum] = renewedFrom.split('_')
        const prevLeagueKey = `${prevGameKey}.l.${prevLeagueNum}`
        console.log('[POINTS DRAFT] Found previous season:', prevLeagueKey, '- loading that draft instead')
        
        // Load previous season's draft
        draftResults = await yahooService.getDraftResults(prevLeagueKey)
        seasonLeagueKey = prevLeagueKey
        console.log('[POINTS DRAFT] Previous season draft picks:', draftResults.picks?.length)
        
        // Update player keys
        playerKeys = draftResults.picks?.map((p: any) => p.player_key).filter(Boolean) || []
        console.log('[POINTS DRAFT] Previous season player keys:', playerKeys.length)
        
        if (playerKeys.length === 0) {
          console.log('[POINTS DRAFT] Previous season also has no draft data')
          draftPicks.value = []
          isLoading.value = false
          return
        }
      } else {
        console.log('[POINTS DRAFT] No previous season found (no renew field)')
        draftPicks.value = []
        isLoading.value = false
        return
      }
    }
    
    if (!draftResults.picks || draftResults.picks.length === 0) {
      draftPicks.value = []
      isLoading.value = false
      return
    }
    
    // Get player details (re-calculate playerKeys in case we switched seasons)
    const finalPlayerKeys = draftResults.picks.map((p: any) => p.player_key).filter(Boolean)
    console.log('[POINTS DRAFT] Fetching details for', finalPlayerKeys.length, 'players from', seasonLeagueKey)
    const players = await yahooService.getPlayers(finalPlayerKeys, seasonLeagueKey)
    playerData.value = players
    console.log('[POINTS DRAFT] Got player details:', players.size)
    
    // Get player stats
    const stats = await yahooService.getPlayerStats(seasonLeagueKey, finalPlayerKeys)
    playerStats.value = stats
    console.log('Got player stats:', stats.size)
    
    // Debug: log a few player stats
    let debugCount = 0
    for (const [key, stat] of stats) {
      if (debugCount < 5) {
        console.log(`Player ${key} total_points:`, stat.total_points)
        debugCount++
      }
    }
    
    // Get teams for mapping
    const standings = await yahooService.getStandings(seasonLeagueKey)
    teamsData.value = standings
    
    // Build team lookup
    const teamLookup = new Map<string, any>()
    for (const team of standings) {
      teamLookup.set(team.team_key, team)
    }
    
    // Calculate points for each pick and sort to get rankings
    const pickPointsData: { pick: number, points: number, playerKey: string }[] = []
    for (const pick of draftResults.picks) {
      const stat = stats.get(pick.player_key)
      pickPointsData.push({
        pick: pick.pick,
        points: stat?.total_points || 0,
        playerKey: pick.player_key
      })
    }
    
    // Sort by points descending to get actual rank
    const sortedByPoints = [...pickPointsData].sort((a, b) => b.points - a.points)
    const actualRankMap = new Map<string, number>()
    sortedByPoints.forEach((p, idx) => {
      actualRankMap.set(p.playerKey, idx + 1)
    })
    
    console.log('Top 5 players by points:', sortedByPoints.slice(0, 5))
    
    // Process draft picks with player info and scores
    const numTeams = standings.length || 12
    draftPicks.value = draftResults.picks.map((pick: any) => {
      const player = players.get(pick.player_key) || {}
      const stat = stats.get(pick.player_key) || {}
      const team = teamLookup.get(pick.team_key) || {}
      
      const pickInRound = ((pick.pick - 1) % numTeams) + 1
      const totalPoints = stat.total_points || 0
      
      // Calculate score based on expected value vs actual
      // Positive = player finished higher than drafted (good pick)
      // Negative = player finished lower than drafted (bad pick)
      const expectedRank = pick.pick
      const actualRank = actualRankMap.get(pick.player_key) || expectedRank
      const score = expectedRank - actualRank
      
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
        totalPoints,
        score,
        grade: calculateGrade(score)
      }
    })
    
    console.log('Processed draft picks:', draftPicks.value.length)
    
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

// Watch for currentLeague changes (happens when fallback to previous season occurs)
watch(() => leagueStore.currentLeague?.league_id, (newKey, oldKey) => {
  if (newKey && newKey !== oldKey) {
    console.log(`Draft: League changed from ${oldKey} to ${newKey}, reloading...`)
    loadDraftData()
  }
})

onMounted(() => {
  if (effectiveLeagueKey.value) {
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

.card-body {
  @apply p-4;
}
</style>
