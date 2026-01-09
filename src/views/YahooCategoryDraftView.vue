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

    <!-- Offseason Notice Banner -->
    <div class="bg-slate-500/10 border border-slate-500/30 rounded-xl p-4 flex items-start gap-3">
      <div class="text-slate-400 text-xl flex-shrink-0">⚾</div>
      <div>
        <p class="text-slate-200 font-semibold">You're viewing the {{ selectedSeason }} season draft</p>
        <p class="text-slate-400 text-sm mt-1">Select a different season from the dropdown to view previous drafts.</p>
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
              <div class="flex items-center gap-2">
                <label class="text-sm text-dark-textMuted">Highlight Category:</label>
                <select v-model="highlightCategory" class="select text-sm py-1.5">
                  <option value="">All Categories</option>
                  <option v-for="cat in leagueCategories" :key="cat" :value="cat">{{ cat }}</option>
                </select>
              </div>
            </div>
            <div class="text-sm text-dark-textMuted">
              {{ filteredPicks.length }} picks shown
            </div>
          </div>
        </div>
      </div>

      <!-- Category Quick Stats -->
      <div class="card" v-if="highlightCategory">
        <div class="card-body py-3">
          <div class="flex items-center justify-between flex-wrap gap-4">
            <div class="flex items-center gap-2">
              <span class="text-lg">🎯</span>
              <span class="font-bold text-dark-text">{{ highlightCategory }} Leaders:</span>
            </div>
            <div class="flex items-center gap-4">
              <div v-for="(leader, idx) in getCategoryTopPicks(highlightCategory, 5)" :key="leader.pick" class="flex items-center gap-2">
                <span class="text-xs font-bold" :class="idx === 0 ? 'text-yellow-400' : 'text-dark-textMuted'">#{{ idx + 1 }}</span>
                <span class="text-sm text-dark-text">{{ leader.player_name }}</span>
                <span class="text-xs font-bold text-yellow-400">{{ formatStatValue(leader.stats?.[getStatIdForCategory(highlightCategory)], highlightCategory) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Hint Text -->
      <div class="text-sm text-dark-textMuted mb-2">
        <span class="text-yellow-400 font-semibold">Click any team header</span> to see detailed draft breakdown and share
      </div>

      <!-- Legend -->
      <div class="card">
        <div class="card-body py-3">
          <div class="flex flex-col gap-3">
            <div class="flex items-center justify-between flex-wrap gap-4">
              <div class="flex items-center gap-6 text-sm flex-wrap">
                <div class="flex items-center gap-2">
                  <div class="w-4 h-4 rounded bg-green-500/30 border-l-2 border-green-500"></div>
                  <span class="text-dark-textMuted">Elite Category Producer (Top 25%)</span>
                </div>
                <div class="flex items-center gap-2">
                  <div class="w-4 h-4 rounded bg-red-500/20 border-l-2 border-red-500"></div>
                  <span class="text-dark-textMuted">Category Underperformer (Bottom 25%)</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="px-1.5 py-0.5 rounded text-xs bg-green-500/20 text-green-400">HR</span>
                  <span class="text-dark-textMuted">= Best category contribution</span>
                </div>
              </div>
              <div class="text-sm text-dark-textMuted">
                Click any player for full category breakdown
              </div>
            </div>
            <!-- Value Score Explanation -->
            <div class="flex items-center gap-4 pt-2 border-t border-dark-border/50 text-sm flex-wrap">
              <div class="flex items-center gap-2">
                <span class="font-bold text-dark-text">Value Score:</span>
                <span class="text-dark-textMuted">Draft Position − Actual Rank by Category Production</span>
              </div>
              <div class="flex items-center gap-4">
                <div class="flex items-center gap-1">
                  <span class="px-1.5 py-0.5 rounded text-xs font-bold bg-green-500/20 text-green-400">+20</span>
                  <span class="text-dark-textMuted">= Steal (outperformed)</span>
                </div>
                <div class="flex items-center gap-1">
                  <span class="px-1.5 py-0.5 rounded text-xs font-bold bg-red-500/20 text-red-400">-15</span>
                  <span class="text-dark-textMuted">= Bust (underperformed)</span>
                </div>
              </div>
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
              class="w-44 flex-shrink-0 bg-dark-card rounded-t-lg p-2 text-center cursor-pointer hover:ring-2 hover:ring-primary transition-all"
              @click="selectedBoardTeam = team.team_key; showBoardTeamModal = true"
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
              <!-- Team Draft Score -->
              <div class="mt-1 text-lg font-black" :class="getTeamDraftScoreClass(team)">
                {{ getTeamDraftScore(team) }}
              </div>
              <div class="text-[10px] text-dark-textMuted">Draft Score</div>
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
                :class="getPickClassWithHighlight(getPickForRound(team.team_key, round))"
              >
                <div class="flex items-center justify-between">
                  <div class="text-xs font-medium text-dark-text truncate flex-1 mr-1">
                    {{ getPickForRound(team.team_key, round)?.player_name || 'Unknown' }}
                  </div>
                  <!-- Value Score Badge -->
                  <span 
                    v-if="getPickForRound(team.team_key, round)?.valueScore !== undefined"
                    class="text-[10px] font-bold px-1 py-0.5 rounded flex-shrink-0"
                    :class="getValueScoreClass(getPickForRound(team.team_key, round)?.valueScore)"
                    :title="`Value Score: ${getPickForRound(team.team_key, round)?.valueScore >= 0 ? '+' : ''}${getPickForRound(team.team_key, round)?.valueScore?.toFixed(0)} (Draft Position vs Actual Performance)`"
                  >
                    {{ getPickForRound(team.team_key, round)?.valueScore >= 0 ? '+' : '' }}{{ getPickForRound(team.team_key, round)?.valueScore?.toFixed(0) }}
                  </span>
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
                <!-- Show highlighted category stat OR best categories -->
                <div class="mt-1.5">
                  <!-- When a category is highlighted, show that stat prominently -->
                  <div v-if="highlightCategory" class="flex items-center justify-between">
                    <span class="text-[10px] px-1.5 py-0.5 rounded font-bold" :class="getCategoryColorClass(highlightCategory)">
                      {{ highlightCategory }}
                    </span>
                    <span class="text-sm font-bold" :class="getHighlightedStatClass(getPickForRound(team.team_key, round))">
                      {{ formatStatValue(getPickForRound(team.team_key, round)?.stats?.[getStatIdForCategory(highlightCategory)] || 0, highlightCategory) }}
                    </span>
                  </div>
                  <!-- Otherwise show best categories -->
                  <div v-else class="flex flex-wrap gap-1">
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
              </div>
              <div v-else class="bg-dark-border/20 rounded-lg p-2 h-full flex items-center justify-center">
                <span class="text-xs text-dark-textMuted">-</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Board Team Modal -->
      <Teleport to="body">
        <div 
          v-if="showBoardTeamModal && selectedBoardTeamData" 
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          @click.self="showBoardTeamModal = false"
        >
          <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
          <div class="relative bg-dark-elevated rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-dark-border">
            <div class="sticky top-0 z-10 px-6 py-4 border-b border-dark-border bg-dark-elevated flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-full bg-dark-border overflow-hidden">
                  <img :src="selectedBoardTeamData?.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
                </div>
                <div>
                  <h3 class="text-xl font-bold text-dark-text">{{ selectedBoardTeamData?.team_name }}</h3>
                  <p class="text-sm text-dark-textMuted">Draft Summary • {{ selectedBoardTeamData?.picks?.length }} picks</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button 
                  @click="downloadTeamDraftImage" 
                  :disabled="isDownloadingTeamDraft"
                  class="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-50"
                  style="background: #dc2626; color: #ffffff;"
                  @mouseover="$event.currentTarget.style.background = '#eab308'"
                  @mouseout="$event.currentTarget.style.background = '#dc2626'"
                >
                  <svg v-if="!isDownloadingTeamDraft" class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <svg v-else class="w-4 h-4 animate-spin pointer-events-none" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {{ isDownloadingTeamDraft ? 'Saving...' : 'Share' }}
                </button>
                <button @click="showBoardTeamModal = false" class="p-2 rounded-lg hover:bg-dark-border/50 transition-colors">
                  <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <!-- Team Stats Summary -->
            <div class="p-6 border-b border-dark-border bg-gradient-to-r from-yellow-500/10 to-transparent">
              <div class="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div class="text-3xl font-black" :class="getTeamDraftScoreClass(selectedBoardTeamData)">{{ getTeamDraftScore(selectedBoardTeamData) }}</div>
                  <div class="text-xs text-dark-textMuted">Draft Score</div>
                </div>
                <div>
                  <div class="text-3xl font-black text-green-400">{{ getTeamStealsCount(selectedBoardTeamData) }}</div>
                  <div class="text-xs text-dark-textMuted">Steals</div>
                </div>
                <div>
                  <div class="text-3xl font-black text-red-400">{{ getTeamBustsCount(selectedBoardTeamData) }}</div>
                  <div class="text-xs text-dark-textMuted">Busts</div>
                </div>
              </div>
            </div>
            
            <!-- Picks List -->
            <div class="p-6">
              <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-4">Draft Picks</h4>
              <div class="space-y-2">
                <div 
                  v-for="pick in selectedBoardTeamData?.picks" 
                  :key="pick.pick"
                  class="flex items-center gap-3 p-3 rounded-lg"
                  :class="pick.valueScore >= 10 ? 'bg-green-500/10' : pick.valueScore <= -10 ? 'bg-red-500/10' : 'bg-dark-border/20'"
                >
                  <div class="w-8 text-center">
                    <div class="text-xs font-bold text-dark-textMuted">R{{ pick.round }}</div>
                  </div>
                  <div class="w-10 h-10 rounded-full bg-dark-border overflow-hidden flex-shrink-0">
                    <img :src="pick.headshot || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="font-semibold text-dark-text">{{ pick.player_name }}</div>
                    <div class="text-xs text-dark-textMuted">{{ pick.position }} • Pick #{{ pick.pick }}</div>
                  </div>
                  <div class="text-right">
                    <div 
                      class="text-lg font-bold"
                      :class="pick.valueScore >= 10 ? 'text-green-400' : pick.valueScore <= -10 ? 'text-red-400' : 'text-dark-textMuted'"
                    >
                      {{ pick.valueScore >= 0 ? '+' : '' }}{{ pick.valueScore?.toFixed(0) }}
                    </div>
                    <div class="text-xs text-dark-textMuted">value</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Teleport>
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
                  <div class="text-2xl font-black text-yellow-400">{{ formatStatValue(cat.value, cat.category) }}</div>
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

      <!-- Category Value by Round -->
      <div class="card mt-6">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">📈</span>
            <h2 class="card-title">Category Value by Draft Round</h2>
          </div>
          <p class="card-subtitle mt-1">Where was value found in each category?</p>
        </div>
        <div class="card-body">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Hitting Categories -->
            <div>
              <div class="text-sm font-bold text-green-400 mb-3 flex items-center gap-2">
                <span>⚾</span> Hitting Categories
              </div>
              <div class="space-y-3">
                <div v-for="cat in categoryValueByRound.hitting" :key="cat.category" class="bg-dark-border/20 rounded-lg p-3">
                  <div class="flex items-center justify-between mb-2">
                    <span class="font-bold text-dark-text">{{ cat.category }}</span>
                    <span class="text-xs text-dark-textMuted">Best value: R{{ cat.bestValueRound }}</span>
                  </div>
                  <div class="flex gap-1">
                    <div 
                      v-for="round in cat.rounds" 
                      :key="round.round"
                      class="flex-1 h-8 rounded flex items-center justify-center text-xs font-bold cursor-pointer hover:ring-1 hover:ring-primary"
                      :class="getRoundValueClass(round.avgPercentile)"
                      :title="`R${round.round}: ${round.avgPercentile.toFixed(0)}% avg percentile (${round.count} players)`"
                    >
                      {{ round.round }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <!-- Pitching Categories -->
            <div>
              <div class="text-sm font-bold text-purple-400 mb-3 flex items-center gap-2">
                <span>🎯</span> Pitching Categories
              </div>
              <div class="space-y-3">
                <div v-for="cat in categoryValueByRound.pitching" :key="cat.category" class="bg-dark-border/20 rounded-lg p-3">
                  <div class="flex items-center justify-between mb-2">
                    <span class="font-bold text-dark-text">{{ cat.category }}</span>
                    <span class="text-xs text-dark-textMuted">Best value: R{{ cat.bestValueRound }}</span>
                  </div>
                  <div class="flex gap-1">
                    <div 
                      v-for="round in cat.rounds" 
                      :key="round.round"
                      class="flex-1 h-8 rounded flex items-center justify-center text-xs font-bold cursor-pointer hover:ring-1 hover:ring-primary"
                      :class="getRoundValueClass(round.avgPercentile)"
                      :title="`R${round.round}: ${round.avgPercentile.toFixed(0)}% avg percentile (${round.count} players)`"
                    >
                      {{ round.round }}
                    </div>
                  </div>
                </div>
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
      <!-- Hint Text -->
      <div class="text-sm text-dark-textMuted mb-4">
        <span class="text-yellow-400 font-semibold">Click any team</span> to see detailed category breakdown
      </div>

      <!-- Team Balance Overview -->
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <div 
          v-for="team in teamBalanceData" 
          :key="team.team_key"
          class="card cursor-pointer hover:ring-2 hover:ring-primary transition-all"
          @click="selectedBalanceTeam = team.team_key; showBalanceModal = true"
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

      <!-- Balance Modal -->
      <Teleport to="body">
        <div 
          v-if="showBalanceModal && selectedTeamData" 
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          @click.self="showBalanceModal = false"
        >
          <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
          <div class="relative bg-dark-elevated rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-dark-border">
            <div class="sticky top-0 z-10 px-6 py-4 border-b border-dark-border bg-dark-elevated flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-full bg-dark-border overflow-hidden">
                  <img :src="selectedTeamData?.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
                </div>
                <div>
                  <h3 class="text-xl font-bold text-dark-text">{{ selectedTeamData?.team_name }}</h3>
                  <p class="text-sm text-dark-textMuted">Draft Balance Breakdown</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button 
                  @click="downloadBalanceImage" 
                  :disabled="isDownloadingBalance"
                  class="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-50"
                  style="background: #dc2626; color: #ffffff;"
                  @mouseover="$event.currentTarget.style.background = '#eab308'"
                  @mouseout="$event.currentTarget.style.background = '#dc2626'"
                >
                  <svg v-if="!isDownloadingBalance" class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <svg v-else class="w-4 h-4 animate-spin pointer-events-none" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {{ isDownloadingBalance ? 'Saving...' : 'Share' }}
                </button>
                <button @click="showBalanceModal = false" class="p-2 rounded-lg hover:bg-dark-border/50 transition-colors">
                  <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div class="p-6">
              <!-- Category Breakdown -->
              <div class="grid grid-cols-2 gap-6">
                <!-- Hitting Categories -->
                <div>
                  <div class="text-sm font-bold text-green-400 mb-3 flex items-center gap-2">
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

              <!-- Strategy Info -->
              <div class="mt-6 pt-6 border-t border-dark-border">
                <div class="flex items-center gap-3">
                  <span class="text-2xl">{{ selectedTeamData?.strategyIcon }}</span>
                  <div>
                    <div class="font-bold text-dark-text">{{ selectedTeamData?.strategyLabel }}</div>
                    <div class="text-sm text-dark-textMuted">{{ selectedTeamData?.strategyDetail }}</div>
                  </div>
                  <div class="ml-auto text-3xl font-black" :class="getGradeClass(selectedTeamData?.balanceGrade)">
                    {{ selectedTeamData?.balanceGrade }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Teleport>
    </template>

    <!-- ==================== STEALS & BUSTS TAB ==================== -->
    <template v-else-if="activeTab === 'steals'">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Biggest Steals -->
        <div class="card">
          <div class="card-header">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-2xl">🔥</span>
                <div>
                  <h2 class="card-title">Biggest Draft Steals</h2>
                  <p class="card-subtitle mt-1">Best value relative to draft position</p>
                </div>
              </div>
              <button 
                @click="downloadStealsImage" 
                :disabled="isDownloadingSteals"
                class="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-50"
                style="background: #dc2626; color: #ffffff;"
                @mouseover="$event.currentTarget.style.background = '#22c55e'"
                @mouseout="$event.currentTarget.style.background = '#dc2626'"
              >
                <svg v-if="!isDownloadingSteals" class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <svg v-else class="w-4 h-4 animate-spin pointer-events-none" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ isDownloadingSteals ? 'Saving...' : 'Share' }}
              </button>
            </div>
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
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-2xl">💀</span>
                <div>
                  <h2 class="card-title">Biggest Draft Busts</h2>
                  <p class="card-subtitle mt-1">Underperformed relative to draft position</p>
                </div>
              </div>
              <button 
                @click="downloadBustsImage" 
                :disabled="isDownloadingBusts"
                class="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-50"
                style="background: #dc2626; color: #ffffff;"
                @mouseover="$event.currentTarget.style.background = '#ef4444'"
                @mouseout="$event.currentTarget.style.background = '#dc2626'"
              >
                <svg v-if="!isDownloadingBusts" class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <svg v-else class="w-4 h-4 animate-spin pointer-events-none" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ isDownloadingBusts ? 'Saving...' : 'Share' }}
              </button>
            </div>
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

      <!-- Category-Specific Steals -->
      <div class="card mt-6">
        <div class="card-header">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-2xl">🎯</span>
              <h2 class="card-title">Category-Specific Steals</h2>
            </div>
            <div class="flex items-center gap-2">
              <label class="text-sm text-dark-textMuted">Category:</label>
              <select v-model="selectedStealCategory" class="select text-sm py-1.5">
                <option v-for="cat in leagueCategories" :key="cat" :value="cat">{{ cat }}</option>
              </select>
            </div>
          </div>
          <p class="card-subtitle mt-1">Best value picks for {{ selectedStealCategory || 'each category' }}</p>
        </div>
        <div class="card-body">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div 
              v-for="(steal, idx) in categorySteals" 
              :key="steal.pick"
              class="bg-dark-border/20 rounded-xl p-4 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
              @click="selectPick(steal)"
            >
              <div class="flex items-center gap-3">
                <div class="text-lg font-bold w-6" :class="idx < 3 ? 'text-green-400' : 'text-dark-textMuted'">
                  {{ idx + 1 }}
                </div>
                <div class="w-10 h-10 rounded-full bg-dark-border overflow-hidden flex-shrink-0">
                  <img :src="steal.headshot || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-semibold text-dark-text">{{ steal.player_name }}</div>
                  <div class="text-xs text-dark-textMuted">
                    R{{ steal.round }} • {{ steal.team_name }}
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-xl font-black text-yellow-400">
                    {{ formatStatValue(steal.stats?.[getStatIdForCategory(selectedStealCategory)], selectedStealCategory) }}
                  </div>
                  <div class="text-xs font-bold" :class="steal.categoryValueScore >= 0 ? 'text-green-400' : 'text-red-400'">
                    {{ steal.categoryValueScore >= 0 ? '+' : '' }}{{ steal.categoryValueScore?.toFixed(0) }} value
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Late Round Gems by Category -->
      <div class="card mt-6">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">💎</span>
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
                <div class="text-lg font-bold text-yellow-400 mt-1">
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
                <div class="text-xs text-dark-textMuted mt-1">Overall #{{ selectedPick.pick }}</div>
              </div>
              <div class="bg-dark-border/30 rounded-xl p-4 text-center">
                <div class="text-sm text-dark-textMuted mb-1">Category Score</div>
                <div class="text-2xl font-bold" :class="getCategoryScoreClass(selectedPick.categoryScore)">
                  {{ selectedPick.categoryScore?.toFixed(0) || '0' }}
                </div>
                <div class="text-xs text-dark-textMuted mt-1">Avg percentile</div>
              </div>
              <div class="bg-dark-border/30 rounded-xl p-4 text-center">
                <div class="text-sm text-dark-textMuted mb-1">Value Score</div>
                <div class="text-2xl font-bold" :class="selectedPick.valueScore >= 0 ? 'text-green-400' : 'text-red-400'">
                  {{ selectedPick.valueScore >= 0 ? '+' : '' }}{{ selectedPick.valueScore?.toFixed(0) || '0' }}
                </div>
                <div class="text-xs text-dark-textMuted mt-1">
                  {{ selectedPick.valueScore >= 10 ? 'Steal!' : selectedPick.valueScore <= -10 ? 'Bust' : 'As expected' }}
                </div>
              </div>
            </div>

            <!-- Category Breakdown with Value -->
            <div class="bg-dark-border/30 rounded-xl p-4">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-bold text-dark-text">Category Performance</h3>
                <div class="text-xs text-dark-textMuted">
                  Value = Expected Rank − Actual Rank in each category
                </div>
              </div>
              <div class="grid grid-cols-5 gap-3">
                <div 
                  v-for="cat in leagueCategories" 
                  :key="cat"
                  class="text-center p-3 rounded-lg bg-dark-border/30"
                >
                  <div class="text-xs font-bold mb-1" :class="getCategoryColorClass(cat).replace('bg-', 'text-').replace('/20', '')">{{ cat }}</div>
                  <div class="text-lg font-black text-dark-text">
                    {{ formatStatValue(selectedPick.stats?.[getStatIdForCategory(cat)] || 0, cat) }}
                  </div>
                  <!-- Category Rank & Value -->
                  <div class="mt-1 flex items-center justify-center gap-1">
                    <span class="text-xs text-dark-textMuted">
                      #{{ getCategoryRank(selectedPick, cat) }}
                    </span>
                    <span 
                      class="text-xs font-bold px-1 rounded"
                      :class="getCategoryValueClass(selectedPick, cat)"
                    >
                      {{ formatCategoryValue(selectedPick, cat) }}
                    </span>
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
const selectedSeason = ref('2025')
const availableSeasons = ref(['2025', '2024', '2023', '2022'])
const positionFilter = ref('All')
const highlightCategory = ref('')
const selectedTeamFilter = ref('')
const impactSort = ref('pick')
const selectedBalanceTeam = ref<string | null>(null)
const selectedPick = ref<any>(null)
const selectedStealCategory = ref('HR')

// Modal states
const showBalanceModal = ref(false)
const showBoardTeamModal = ref(false)
const selectedBoardTeam = ref<string | null>(null)

// Download states
const isDownloadingSteals = ref(false)
const isDownloadingBusts = ref(false)
const isDownloadingTeamDraft = ref(false)
const isDownloadingBalance = ref(false)

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

// Category Value by Round - shows where value was found for each category
const categoryValueByRound = computed(() => {
  const maxRounds = Math.min(totalRounds.value, 15) // Limit to first 15 rounds
  
  const calculateForCategory = (cat: string) => {
    const statId = getStatIdForCategory(cat)
    const isLowerBetter = ['ERA', 'WHIP', 'L', 'BS'].includes(cat)
    
    // Get all values for percentile calculation
    const allValues = draftPicks.value
      .map(p => p.stats?.[statId] || 0)
      .filter(v => v > 0)
      .sort((a, b) => isLowerBetter ? a - b : b - a)
    
    const getPercentileForValue = (value: number) => {
      if (value === 0 || allValues.length === 0) return 0
      const rank = allValues.findIndex(v => isLowerBetter ? v >= value : v <= value)
      if (rank === -1) return isLowerBetter ? 100 : 0
      return Math.round((1 - rank / allValues.length) * 100)
    }
    
    // Calculate average percentile per round
    const rounds: Array<{round: number, avgPercentile: number, count: number}> = []
    let bestValueRound = 1
    let bestAvgPercentile = 0
    
    for (let r = 1; r <= maxRounds; r++) {
      const roundPicks = draftPicks.value.filter(p => p.round === r)
      const percentiles = roundPicks
        .map(p => getPercentileForValue(p.stats?.[statId] || 0))
        .filter(p => p > 0)
      
      const avgPercentile = percentiles.length > 0 
        ? percentiles.reduce((a, b) => a + b, 0) / percentiles.length 
        : 0
      
      rounds.push({ round: r, avgPercentile, count: percentiles.length })
      
      if (avgPercentile > bestAvgPercentile) {
        bestAvgPercentile = avgPercentile
        bestValueRound = r
      }
    }
    
    return { category: cat, rounds, bestValueRound }
  }
  
  const hittingCats = leagueCategories.value.filter(c => isHittingCategory(c))
  const pitchingCats = leagueCategories.value.filter(c => !isHittingCategory(c))
  
  return {
    hitting: hittingCats.map(calculateForCategory),
    pitching: pitchingCats.map(calculateForCategory)
  }
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

// Selected Board Team Data
const selectedBoardTeamData = computed(() => {
  return draftBoard.value.find(t => t.team_key === selectedBoardTeam.value)
})

// Team Draft Score helpers
function getTeamDraftScore(team: any): string {
  if (!team?.picks) return 'N/A'
  const totalValue = team.picks.reduce((sum: number, p: any) => sum + (p.valueScore || 0), 0)
  const avgValue = totalValue / team.picks.length
  if (avgValue >= 10) return 'A+'
  if (avgValue >= 5) return 'A'
  if (avgValue >= 2) return 'B+'
  if (avgValue >= 0) return 'B'
  if (avgValue >= -2) return 'C+'
  if (avgValue >= -5) return 'C'
  if (avgValue >= -10) return 'D'
  return 'F'
}

function getTeamDraftScoreClass(team: any): string {
  const score = getTeamDraftScore(team)
  if (score.startsWith('A')) return 'text-green-400'
  if (score.startsWith('B')) return 'text-yellow-400'
  if (score.startsWith('C')) return 'text-orange-400'
  return 'text-red-400'
}

function getTeamStealsCount(team: any): number {
  if (!team?.picks) return 0
  return team.picks.filter((p: any) => (p.valueScore || 0) >= 10).length
}

function getTeamBustsCount(team: any): number {
  if (!team?.picks) return 0
  return team.picks.filter((p: any) => (p.valueScore || 0) <= -10).length
}

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

// Category-specific steals - best value for selected category
const categorySteals = computed(() => {
  const cat = selectedStealCategory.value
  if (!cat) return []
  
  const statId = getStatIdForCategory(cat)
  const isLowerBetter = ['ERA', 'WHIP', 'L', 'BS'].includes(cat)
  
  // Get all values for this category to calculate expected rank
  const allValues = draftPicks.value
    .map(p => ({ pick: p.pick, value: p.stats?.[statId] || 0 }))
    .filter(p => p.value > 0)
    .sort((a, b) => isLowerBetter ? a.value - b.value : b.value - a.value)
  
  // Calculate value score for each pick in this category
  return draftPicks.value
    .filter(p => p.stats?.[statId] > 0)
    .map(p => {
      const value = p.stats?.[statId] || 0
      const actualRank = allValues.findIndex(v => v.pick === p.pick) + 1
      const expectedRank = p.pick // Draft position is expected rank
      const categoryValueScore = expectedRank - actualRank // Positive = outperformed
      
      return {
        ...p,
        categoryValueScore
      }
    })
    .sort((a, b) => b.categoryValueScore - a.categoryValueScore)
    .slice(0, 12)
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

// Get pick class with category highlight support
function getPickClassWithHighlight(pick: any) {
  if (!pick) return ''
  
  // If a category is highlighted, color based on that category's percentile
  if (highlightCategory.value) {
    const catPerf = pick.bestCategories?.find((c: any) => c.category === highlightCategory.value)
    const percentile = catPerf?.percentile || 0
    if (percentile >= 75) return 'bg-green-500/20 border-l-2 border-green-500'
    if (percentile >= 50) return 'bg-yellow-500/20 border-l-2 border-yellow-500'
    if (percentile >= 25) return 'bg-orange-500/20 border-l-2 border-orange-500'
    if (percentile > 0) return 'bg-red-500/20 border-l-2 border-red-500'
    return 'opacity-40' // No contribution to this category
  }
  
  // Default behavior
  const percentile = pick.categoryPercentile || 50
  if (percentile >= 75) return 'bg-green-500/20 border-l-2 border-green-500'
  if (percentile <= 25) return 'bg-red-500/20 border-l-2 border-red-500'
  return ''
}

// Get value score class for display on cards
function getValueScoreClass(valueScore: number) {
  if (valueScore >= 20) return 'bg-green-500/30 text-green-400'
  if (valueScore >= 10) return 'bg-green-500/20 text-green-400'
  if (valueScore >= 0) return 'bg-dark-border/30 text-dark-textMuted'
  if (valueScore >= -10) return 'bg-orange-500/20 text-orange-400'
  return 'bg-red-500/20 text-red-400'
}

// Get a player's rank in a specific category
function getCategoryRank(pick: any, cat: string): number {
  const statId = getStatIdForCategory(cat)
  const isLowerBetter = ['ERA', 'WHIP', 'L', 'BS'].includes(cat)
  const playerValue = pick.stats?.[statId] || 0
  
  if (playerValue === 0) return draftPicks.value.length
  
  // Sort all players by this category
  const sorted = [...draftPicks.value]
    .filter(p => p.stats?.[statId] > 0)
    .sort((a, b) => {
      const aVal = a.stats?.[statId] || (isLowerBetter ? Infinity : 0)
      const bVal = b.stats?.[statId] || (isLowerBetter ? Infinity : 0)
      return isLowerBetter ? aVal - bVal : bVal - aVal
    })
  
  const rank = sorted.findIndex(p => p.pick === pick.pick)
  return rank >= 0 ? rank + 1 : sorted.length
}

// Get category-specific value score (expected rank - actual rank)
function getCategoryValue(pick: any, cat: string): number {
  const actualRank = getCategoryRank(pick, cat)
  const expectedRank = pick.pick // Draft position
  return expectedRank - actualRank
}

// Format category value with +/- sign
function formatCategoryValue(pick: any, cat: string): string {
  const statId = getStatIdForCategory(cat)
  if (!pick.stats?.[statId] || pick.stats[statId] === 0) return '-'
  
  const value = getCategoryValue(pick, cat)
  if (value >= 0) return `+${value}`
  return `${value}`
}

// Get class for category value display
function getCategoryValueClass(pick: any, cat: string): string {
  const statId = getStatIdForCategory(cat)
  if (!pick.stats?.[statId] || pick.stats[statId] === 0) return 'text-dark-textMuted'
  
  const value = getCategoryValue(pick, cat)
  if (value >= 20) return 'bg-green-500/30 text-green-400'
  if (value >= 10) return 'bg-green-500/20 text-green-400'
  if (value >= 0) return 'text-green-400/70'
  if (value >= -10) return 'text-orange-400/70'
  return 'bg-red-500/20 text-red-400'
}

// Get highlighted stat class based on percentile
function getHighlightedStatClass(pick: any) {
  if (!pick || !highlightCategory.value) return 'text-dark-textMuted'
  const catPerf = pick.bestCategories?.find((c: any) => c.category === highlightCategory.value)
  const percentile = catPerf?.percentile || 0
  if (percentile >= 75) return 'text-green-400'
  if (percentile >= 50) return 'text-yellow-400'
  if (percentile >= 25) return 'text-orange-400'
  if (percentile > 0) return 'text-red-400'
  return 'text-dark-textMuted'
}

// Get top picks for a specific category
function getCategoryTopPicks(cat: string, limit: number = 5) {
  const statId = getStatIdForCategory(cat)
  const isLowerBetter = ['ERA', 'WHIP', 'L', 'BS'].includes(cat)
  
  return [...draftPicks.value]
    .filter(p => p.stats?.[statId] > 0)
    .sort((a, b) => {
      const aVal = a.stats?.[statId] || (isLowerBetter ? Infinity : 0)
      const bVal = b.stats?.[statId] || (isLowerBetter ? Infinity : 0)
      return isLowerBetter ? aVal - bVal : bVal - aVal
    })
    .slice(0, limit)
}

function getPositionClass(position: string) {
  const classes: Record<string, string> = {
    'C': 'bg-purple-500/20 text-purple-400',
    '1B': 'bg-red-500/20 text-red-400',
    '2B': 'bg-green-500/20 text-green-400',
    '3B': 'bg-blue-500/20 text-blue-400',
    'SS': 'bg-yellow-500/20 text-yellow-400',
    'OF': 'bg-orange-500/20 text-orange-400',
    'SP': 'bg-cyan-500/20 text-cyan-400',
    'RP': 'bg-pink-500/20 text-pink-400',
    'P': 'bg-cyan-500/20 text-cyan-400',
    'Util': 'bg-gray-500/20 text-gray-400',
  }
  return classes[position] || 'bg-gray-500/20 text-gray-400'
}

function getCategoryColorClass(cat: string) {
  if (isHittingCategory(cat)) return 'bg-green-500/20 text-green-400'
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

// Get class for round value heatmap
function getRoundValueClass(avgPercentile: number) {
  if (avgPercentile >= 70) return 'bg-green-500 text-white'
  if (avgPercentile >= 55) return 'bg-green-500/60 text-white'
  if (avgPercentile >= 45) return 'bg-yellow-500/60 text-white'
  if (avgPercentile >= 30) return 'bg-orange-500/60 text-white'
  if (avgPercentile > 0) return 'bg-red-500/40 text-white'
  return 'bg-dark-border/30 text-dark-textMuted'
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
      
      // Set default steal category to first hitting category
      if (leagueCategories.value.length > 0) {
        selectedStealCategory.value = leagueCategories.value[0]
      }
    } catch (e) {
      console.log('Could not load league settings, using defaults')
      leagueCategories.value = ['R', 'HR', 'RBI', 'SB', 'AVG', 'W', 'SV', 'K', 'ERA', 'WHIP']
      selectedStealCategory.value = 'HR'
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

// Get league name helper
function getLeagueName(): string {
  const activeId = leagueStore.activeLeagueId
  const savedLeague = leagueStore.savedLeagues?.find((l: any) => l.league_id === activeId?.split('.l.')[1])
  return savedLeague?.league_name || leagueStore.yahooLeague?.name || 'Fantasy League'
}

// Download Steals Image
async function downloadStealsImage() {
  isDownloadingSteals.value = true
  try {
    const html2canvas = (await import('html2canvas')).default
    const leagueName = getLeagueName()
    const steals = topSteals.value.slice(0, 10)
    
    if (steals.length === 0) {
      isDownloadingSteals.value = false
      return
    }
    
    // Load UFD logo
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
      } catch (e) { return '' }
    }
    
    const createPlaceholder = (name: string): string => {
      const canvas = document.createElement('canvas')
      canvas.width = 64
      canvas.height = 64
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#3a3d52'
        ctx.beginPath()
        ctx.arc(32, 32, 32, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 28px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(name.charAt(0).toUpperCase(), 32, 34)
      }
      return canvas.toDataURL('image/png')
    }
    
    const logoBase64 = await loadLogo()
    const leader = steals[0]
    
    // Pre-load images
    const imageMap = new Map<string, string>()
    for (const pick of steals) {
      try {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        const loadPromise = new Promise<string>((resolve) => {
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas')
              canvas.width = 64
              canvas.height = 64
              const ctx = canvas.getContext('2d')
              if (ctx) {
                ctx.beginPath()
                ctx.arc(32, 32, 32, 0, Math.PI * 2)
                ctx.closePath()
                ctx.clip()
                ctx.drawImage(img, 0, 0, 64, 64)
              }
              resolve(canvas.toDataURL('image/png'))
            } catch { resolve(createPlaceholder(pick.player_name)) }
          }
          img.onerror = () => resolve(createPlaceholder(pick.player_name))
          setTimeout(() => resolve(createPlaceholder(pick.player_name)), 3000)
        })
        img.src = pick.headshot || ''
        imageMap.set(pick.player_name, await loadPromise)
      } catch { imageMap.set(pick.player_name, createPlaceholder(pick.player_name)) }
    }
    
    const maxValue = Math.max(...steals.map(s => s.valueScore || 0))
    
    const generateRows = () => {
      return steals.map((pick, idx) => {
        const barWidth = maxValue > 0 ? ((pick.valueScore || 0) / maxValue) * 100 : 0
        return `
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
            <div style="width: 20px; text-align: center; font-weight: bold; font-size: 12px; color: ${idx === 0 ? '#22c55e' : '#6b7280'};">${idx + 1}</div>
            <img src="${imageMap.get(pick.player_name) || createPlaceholder(pick.player_name)}" style="width: 28px; height: 28px; border-radius: 50%;" />
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 12px; font-weight: 600; color: #e5e7eb;">${pick.player_name}</div>
              <div style="font-size: 10px; color: #9ca3af; margin-top: 1px;">Drafted by <span style="color: #facc15; font-weight: 600;">${pick.team_name}</span> • R${pick.round}</div>
              <div style="height: 6px; background: rgba(58, 61, 82, 0.5); border-radius: 3px; overflow: hidden; margin-top: 6px;">
                <div style="height: 100%; width: ${barWidth}%; background: #22c55e; opacity: ${idx === 0 ? 1 : 0.6}; border-radius: 3px;"></div>
              </div>
            </div>
            <div style="width: 50px; text-align: right;">
              <div style="font-size: 13px; font-weight: bold; color: ${idx === 0 ? '#22c55e' : '#e5e7eb'};">+${pick.valueScore?.toFixed(0)}</div>
            </div>
          </div>
        `
      }).join('')
    }
    
    const container = document.createElement('div')
    container.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 480px; font-family: system-ui, -apple-system, sans-serif;'
    
    container.innerHTML = `
      <div style="background: linear-gradient(160deg, #0f1219 0%, #0a0c14 50%, #0d1117 100%); border-radius: 16px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); position: relative; overflow: hidden;">
        <div style="background: #dc2626; padding: 8px 20px; text-align: center;">
          <span style="font-size: 12px; font-weight: 700; color: #0a0c14; text-transform: uppercase; letter-spacing: 2px;">Ultimate Fantasy Dashboard</span>
        </div>
        <div style="display: flex; align-items: center; padding: 10px 16px; border-bottom: 1px solid rgba(220, 38, 38, 0.2);">
          ${logoBase64 ? `<img src="${logoBase64}" style="height: 40px; width: auto; flex-shrink: 0; margin-right: 12px; margin-top: 4px;" />` : ''}
          <div style="flex: 1;">
            <div style="font-size: 17px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.1;">🔥 Biggest Draft Steals</div>
            <div style="font-size: 12px; margin-top: 2px;">
              <span style="color: #e5e7eb;">${leagueName}</span>
              <span style="color: #6b7280; margin: 0 4px;">•</span>
              <span style="color: #dc2626; font-weight: 600;">${selectedSeason.value} Draft</span>
            </div>
          </div>
        </div>
        <div style="padding: 12px 16px; background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, transparent 100%); border-bottom: 1px solid rgba(34, 197, 94, 0.2);">
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="${imageMap.get(leader.player_name) || createPlaceholder(leader.player_name)}" style="width: 44px; height: 44px; border-radius: 50%; border: 2px solid rgba(34, 197, 94, 0.5);" />
            <div style="flex: 1;">
              <div style="font-size: 15px; font-weight: bold; color: #ffffff;">${leader.player_name}</div>
              <div style="font-size: 11px; color: #9ca3af;">Drafted by <span style="color: #facc15;">${leader.team_name}</span></div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 26px; font-weight: 900; color: #22c55e;">+${leader.valueScore?.toFixed(0)}</div>
            </div>
          </div>
        </div>
        <div style="padding: 12px 16px;">${generateRows()}</div>
        <div style="padding: 10px 16px; text-align: center; border-top: 1px solid rgba(220, 38, 38, 0.2);">
          <span style="font-size: 14px; font-weight: bold; color: #dc2626;">ultimatefantasydashboard.com</span>
        </div>
      </div>
    `
    
    document.body.appendChild(container)
    await new Promise(r => setTimeout(r, 300))
    
    const finalCanvas = await html2canvas(container, { backgroundColor: '#0a0c14', scale: 2, useCORS: true, allowTaint: true })
    document.body.removeChild(container)
    
    const link = document.createElement('a')
    link.download = `${selectedSeason.value}-draft-steals.png`
    link.href = finalCanvas.toDataURL('image/png')
    link.click()
  } finally {
    isDownloadingSteals.value = false
  }
}

// Download Busts Image
async function downloadBustsImage() {
  isDownloadingBusts.value = true
  try {
    const html2canvas = (await import('html2canvas')).default
    const leagueName = getLeagueName()
    const busts = topBusts.value.slice(0, 10)
    
    if (busts.length === 0) {
      isDownloadingBusts.value = false
      return
    }
    
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
      } catch (e) { return '' }
    }
    
    const createPlaceholder = (name: string): string => {
      const canvas = document.createElement('canvas')
      canvas.width = 64
      canvas.height = 64
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#3a3d52'
        ctx.beginPath()
        ctx.arc(32, 32, 32, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 28px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(name.charAt(0).toUpperCase(), 32, 34)
      }
      return canvas.toDataURL('image/png')
    }
    
    const logoBase64 = await loadLogo()
    const leader = busts[0]
    
    const imageMap = new Map<string, string>()
    for (const pick of busts) {
      try {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        const loadPromise = new Promise<string>((resolve) => {
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas')
              canvas.width = 64
              canvas.height = 64
              const ctx = canvas.getContext('2d')
              if (ctx) {
                ctx.beginPath()
                ctx.arc(32, 32, 32, 0, Math.PI * 2)
                ctx.closePath()
                ctx.clip()
                ctx.drawImage(img, 0, 0, 64, 64)
              }
              resolve(canvas.toDataURL('image/png'))
            } catch { resolve(createPlaceholder(pick.player_name)) }
          }
          img.onerror = () => resolve(createPlaceholder(pick.player_name))
          setTimeout(() => resolve(createPlaceholder(pick.player_name)), 3000)
        })
        img.src = pick.headshot || ''
        imageMap.set(pick.player_name, await loadPromise)
      } catch { imageMap.set(pick.player_name, createPlaceholder(pick.player_name)) }
    }
    
    const minValue = Math.min(...busts.map(s => s.valueScore || 0))
    
    const generateRows = () => {
      return busts.map((pick, idx) => {
        const barWidth = minValue < 0 ? ((pick.valueScore || 0) / minValue) * 100 : 0
        return `
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
            <div style="width: 20px; text-align: center; font-weight: bold; font-size: 12px; color: ${idx === 0 ? '#ef4444' : '#6b7280'};">${idx + 1}</div>
            <img src="${imageMap.get(pick.player_name) || createPlaceholder(pick.player_name)}" style="width: 28px; height: 28px; border-radius: 50%;" />
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 12px; font-weight: 600; color: #e5e7eb;">${pick.player_name}</div>
              <div style="font-size: 10px; color: #9ca3af; margin-top: 1px;">Drafted by <span style="color: #facc15; font-weight: 600;">${pick.team_name}</span> • R${pick.round}</div>
              <div style="height: 6px; background: rgba(58, 61, 82, 0.5); border-radius: 3px; overflow: hidden; margin-top: 6px;">
                <div style="height: 100%; width: ${barWidth}%; background: #ef4444; opacity: ${idx === 0 ? 1 : 0.6}; border-radius: 3px;"></div>
              </div>
            </div>
            <div style="width: 50px; text-align: right;">
              <div style="font-size: 13px; font-weight: bold; color: ${idx === 0 ? '#ef4444' : '#e5e7eb'};">${pick.valueScore?.toFixed(0)}</div>
            </div>
          </div>
        `
      }).join('')
    }
    
    const container = document.createElement('div')
    container.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 480px; font-family: system-ui, -apple-system, sans-serif;'
    
    container.innerHTML = `
      <div style="background: linear-gradient(160deg, #0f1219 0%, #0a0c14 50%, #0d1117 100%); border-radius: 16px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); position: relative; overflow: hidden;">
        <div style="background: #dc2626; padding: 8px 20px; text-align: center;">
          <span style="font-size: 12px; font-weight: 700; color: #0a0c14; text-transform: uppercase; letter-spacing: 2px;">Ultimate Fantasy Dashboard</span>
        </div>
        <div style="display: flex; align-items: center; padding: 10px 16px; border-bottom: 1px solid rgba(220, 38, 38, 0.2);">
          ${logoBase64 ? `<img src="${logoBase64}" style="height: 40px; width: auto; flex-shrink: 0; margin-right: 12px; margin-top: 4px;" />` : ''}
          <div style="flex: 1;">
            <div style="font-size: 17px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.1;">💀 Biggest Draft Busts</div>
            <div style="font-size: 12px; margin-top: 2px;">
              <span style="color: #e5e7eb;">${leagueName}</span>
              <span style="color: #6b7280; margin: 0 4px;">•</span>
              <span style="color: #dc2626; font-weight: 600;">${selectedSeason.value} Draft</span>
            </div>
          </div>
        </div>
        <div style="padding: 12px 16px; background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, transparent 100%); border-bottom: 1px solid rgba(239, 68, 68, 0.2);">
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="${imageMap.get(leader.player_name) || createPlaceholder(leader.player_name)}" style="width: 44px; height: 44px; border-radius: 50%; border: 2px solid rgba(239, 68, 68, 0.5);" />
            <div style="flex: 1;">
              <div style="font-size: 15px; font-weight: bold; color: #ffffff;">${leader.player_name}</div>
              <div style="font-size: 11px; color: #9ca3af;">Drafted by <span style="color: #facc15;">${leader.team_name}</span></div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 26px; font-weight: 900; color: #ef4444;">${leader.valueScore?.toFixed(0)}</div>
            </div>
          </div>
        </div>
        <div style="padding: 12px 16px;">${generateRows()}</div>
        <div style="padding: 10px 16px; text-align: center; border-top: 1px solid rgba(220, 38, 38, 0.2);">
          <span style="font-size: 14px; font-weight: bold; color: #dc2626;">ultimatefantasydashboard.com</span>
        </div>
      </div>
    `
    
    document.body.appendChild(container)
    await new Promise(r => setTimeout(r, 300))
    
    const finalCanvas = await html2canvas(container, { backgroundColor: '#0a0c14', scale: 2, useCORS: true, allowTaint: true })
    document.body.removeChild(container)
    
    const link = document.createElement('a')
    link.download = `${selectedSeason.value}-draft-busts.png`
    link.href = finalCanvas.toDataURL('image/png')
    link.click()
  } finally {
    isDownloadingBusts.value = false
  }
}

// Download Team Draft Image
async function downloadTeamDraftImage() {
  if (!selectedBoardTeamData.value) return
  isDownloadingTeamDraft.value = true
  try {
    const html2canvas = (await import('html2canvas')).default
    const leagueName = getLeagueName()
    const team = selectedBoardTeamData.value
    const picks = team.picks || []
    
    if (picks.length === 0) {
      isDownloadingTeamDraft.value = false
      return
    }
    
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
      } catch (e) { return '' }
    }
    
    const createPlaceholder = (name: string): string => {
      const canvas = document.createElement('canvas')
      canvas.width = 64
      canvas.height = 64
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#3a3d52'
        ctx.beginPath()
        ctx.arc(32, 32, 32, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 28px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(name.charAt(0).toUpperCase(), 32, 34)
      }
      return canvas.toDataURL('image/png')
    }
    
    const logoBase64 = await loadLogo()
    
    // Load team logo
    let teamLogoBase64 = ''
    if (team.logo_url) {
      try {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        teamLogoBase64 = await new Promise<string>((resolve) => {
          img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = 64
            canvas.height = 64
            const ctx = canvas.getContext('2d')
            if (ctx) {
              ctx.beginPath()
              ctx.arc(32, 32, 32, 0, Math.PI * 2)
              ctx.closePath()
              ctx.clip()
              ctx.drawImage(img, 0, 0, 64, 64)
            }
            resolve(canvas.toDataURL('image/png'))
          }
          img.onerror = () => resolve(createPlaceholder(team.team_name))
          img.src = team.logo_url
        })
      } catch { teamLogoBase64 = createPlaceholder(team.team_name) }
    }
    
    const imageMap = new Map<string, string>()
    for (const pick of picks) {
      try {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        const loadPromise = new Promise<string>((resolve) => {
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas')
              canvas.width = 64
              canvas.height = 64
              const ctx = canvas.getContext('2d')
              if (ctx) {
                ctx.beginPath()
                ctx.arc(32, 32, 32, 0, Math.PI * 2)
                ctx.closePath()
                ctx.clip()
                ctx.drawImage(img, 0, 0, 64, 64)
              }
              resolve(canvas.toDataURL('image/png'))
            } catch { resolve(createPlaceholder(pick.player_name)) }
          }
          img.onerror = () => resolve(createPlaceholder(pick.player_name))
          setTimeout(() => resolve(createPlaceholder(pick.player_name)), 3000)
        })
        img.src = pick.headshot || ''
        imageMap.set(pick.player_name, await loadPromise)
      } catch { imageMap.set(pick.player_name, createPlaceholder(pick.player_name)) }
    }
    
    const draftScore = getTeamDraftScore(team)
    const stealsCount = getTeamStealsCount(team)
    const bustsCount = getTeamBustsCount(team)
    
    // Split picks into two columns
    const midPoint = Math.ceil(picks.length / 2)
    const leftPicks = picks.slice(0, midPoint)
    const rightPicks = picks.slice(midPoint)
    
    const generatePickRow = (pick: any) => {
      const valueColor = (pick.valueScore || 0) >= 10 ? '#22c55e' : (pick.valueScore || 0) <= -10 ? '#ef4444' : '#9ca3af'
      const bgColor = (pick.valueScore || 0) >= 10 ? 'rgba(34, 197, 94, 0.1)' : (pick.valueScore || 0) <= -10 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(58, 61, 82, 0.3)'
      return `
        <div style="display: flex; align-items: center; gap: 6px; height: 42px; padding: 6px; border-radius: 6px; background: ${bgColor}; margin-bottom: 6px; box-sizing: border-box;">
          <div style="width: 22px; flex-shrink: 0; text-align: center; font-weight: bold; font-size: 10px; color: #6b7280;">R${pick.round}</div>
          <img src="${imageMap.get(pick.player_name) || createPlaceholder(pick.player_name)}" style="width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0;" />
          <div style="flex: 1; min-width: 0; padding-top: 2px;">
            <div style="font-size: 11px; font-weight: 600; color: #e5e7eb; white-space: nowrap; overflow: visible; line-height: 1.2;">${pick.player_name}</div>
            <div style="font-size: 9px; color: #9ca3af; line-height: 1.2;">${pick.position}</div>
          </div>
          <div style="width: 32px; flex-shrink: 0; text-align: right;">
            <div style="font-size: 11px; font-weight: bold; color: ${valueColor};">${(pick.valueScore || 0) >= 0 ? '+' : ''}${pick.valueScore?.toFixed(0)}</div>
          </div>
        </div>
      `
    }
    
    const generateLeftColumn = () => leftPicks.map(generatePickRow).join('')
    const generateRightColumn = () => rightPicks.map(generatePickRow).join('')
    
    const container = document.createElement('div')
    container.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 580px; font-family: system-ui, -apple-system, sans-serif;'
    
    container.innerHTML = `
      <div style="background: linear-gradient(160deg, #0f1219 0%, #0a0c14 50%, #0d1117 100%); border-radius: 16px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); position: relative; overflow: hidden;">
        <div style="background: #dc2626; padding: 8px 20px; text-align: center;">
          <span style="font-size: 12px; font-weight: 700; color: #0a0c14; text-transform: uppercase; letter-spacing: 2px;">Ultimate Fantasy Dashboard</span>
        </div>
        <div style="display: flex; align-items: center; padding: 10px 16px; border-bottom: 1px solid rgba(220, 38, 38, 0.2);">
          ${logoBase64 ? `<img src="${logoBase64}" style="height: 40px; width: auto; flex-shrink: 0; margin-right: 12px; margin-top: 4px;" />` : ''}
          <div style="flex: 1;">
            <div style="font-size: 17px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.1;">Draft Summary</div>
            <div style="font-size: 12px; margin-top: 2px;">
              <span style="color: #e5e7eb;">${leagueName}</span>
              <span style="color: #6b7280; margin: 0 4px;">•</span>
              <span style="color: #dc2626; font-weight: 600;">${selectedSeason.value} Draft</span>
            </div>
          </div>
        </div>
        <div style="padding: 12px 16px; background: linear-gradient(135deg, rgba(250, 204, 21, 0.15) 0%, transparent 100%); border-bottom: 1px solid rgba(250, 204, 21, 0.2);">
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="${teamLogoBase64 || createPlaceholder(team.team_name)}" style="width: 44px; height: 44px; border-radius: 50%; border: 2px solid rgba(250, 204, 21, 0.5);" />
            <div style="flex: 1;">
              <div style="font-size: 15px; font-weight: bold; color: #ffffff;">${team.team_name}</div>
              <div style="font-size: 11px; color: #9ca3af;">${picks.length} picks</div>
            </div>
            <div style="text-align: center; padding: 0 12px;">
              <div style="font-size: 22px; font-weight: 900; color: #facc15;">${draftScore}</div>
              <div style="font-size: 9px; color: #9ca3af;">GRADE</div>
            </div>
            <div style="text-align: center; padding: 0 8px;">
              <div style="font-size: 18px; font-weight: 900; color: #22c55e;">${stealsCount}</div>
              <div style="font-size: 9px; color: #9ca3af;">STEALS</div>
            </div>
            <div style="text-align: center; padding: 0 8px;">
              <div style="font-size: 18px; font-weight: 900; color: #ef4444;">${bustsCount}</div>
              <div style="font-size: 9px; color: #9ca3af;">BUSTS</div>
            </div>
          </div>
        </div>
        <div style="padding: 16px 16px 20px 16px; display: flex; gap: 12px;">
          <div style="flex: 1;">${generateLeftColumn()}</div>
          <div style="flex: 1;">${generateRightColumn()}</div>
        </div>
        <div style="padding: 10px 16px; text-align: center; border-top: 1px solid rgba(220, 38, 38, 0.2);">
          <span style="font-size: 14px; font-weight: bold; color: #dc2626;">ultimatefantasydashboard.com</span>
        </div>
      </div>
    `
    
    document.body.appendChild(container)
    await new Promise(r => setTimeout(r, 300))
    
    const finalCanvas = await html2canvas(container, { backgroundColor: '#0a0c14', scale: 2, useCORS: true, allowTaint: true, width: 580 })
    document.body.removeChild(container)
    
    const link = document.createElement('a')
    const safeTeamName = team.team_name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-').toLowerCase()
    link.download = `${selectedSeason.value}-draft-${safeTeamName}.png`
    link.href = finalCanvas.toDataURL('image/png')
    link.click()
  } finally {
    isDownloadingTeamDraft.value = false
  }
}

// Download Balance Image
async function downloadBalanceImage() {
  if (!selectedTeamData.value) return
  isDownloadingBalance.value = true
  try {
    const html2canvas = (await import('html2canvas')).default
    const leagueName = getLeagueName()
    const team = selectedTeamData.value
    
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
      } catch (e) { return '' }
    }
    
    const createPlaceholder = (name: string): string => {
      const canvas = document.createElement('canvas')
      canvas.width = 64
      canvas.height = 64
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#3a3d52'
        ctx.beginPath()
        ctx.arc(32, 32, 32, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 28px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(name.charAt(0).toUpperCase(), 32, 34)
      }
      return canvas.toDataURL('image/png')
    }
    
    const logoBase64 = await loadLogo()
    
    // Load team logo
    let teamLogoBase64 = ''
    if (team.logo_url) {
      try {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        teamLogoBase64 = await new Promise<string>((resolve) => {
          img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = 64
            canvas.height = 64
            const ctx = canvas.getContext('2d')
            if (ctx) {
              ctx.beginPath()
              ctx.arc(32, 32, 32, 0, Math.PI * 2)
              ctx.closePath()
              ctx.clip()
              ctx.drawImage(img, 0, 0, 64, 64)
            }
            resolve(canvas.toDataURL('image/png'))
          }
          img.onerror = () => resolve(createPlaceholder(team.team_name))
          img.src = team.logo_url
        })
      } catch { teamLogoBase64 = createPlaceholder(team.team_name) }
    }
    
    const hittingCats = team.categoryStrengths.filter((c: any) => isHittingCategory(c.category))
    const pitchingCats = team.categoryStrengths.filter((c: any) => !isHittingCategory(c.category))
    
    const getBarColor = (percentile: number) => {
      if (percentile >= 75) return '#22c55e'
      if (percentile >= 50) return '#eab308'
      if (percentile >= 25) return '#f97316'
      return '#ef4444'
    }
    
    const generateCategoryRow = (cat: any) => {
      return `
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <div style="width: 40px; font-size: 11px; font-weight: 600; color: #9ca3af;">${cat.category}</div>
          <div style="flex: 1; height: 12px; background: rgba(58, 61, 82, 0.5); border-radius: 6px; overflow: hidden;">
            <div style="height: 100%; width: ${cat.percentile}%; background: ${getBarColor(cat.percentile)}; border-radius: 6px;"></div>
          </div>
          <div style="width: 36px; text-align: right; font-size: 11px; font-weight: bold; color: ${getBarColor(cat.percentile)};">${cat.percentile}%</div>
        </div>
      `
    }
    
    const container = document.createElement('div')
    container.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 480px; font-family: system-ui, -apple-system, sans-serif;'
    
    container.innerHTML = `
      <div style="background: linear-gradient(160deg, #0f1219 0%, #0a0c14 50%, #0d1117 100%); border-radius: 16px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); position: relative; overflow: hidden;">
        <div style="background: #dc2626; padding: 8px 20px; text-align: center;">
          <span style="font-size: 12px; font-weight: 700; color: #0a0c14; text-transform: uppercase; letter-spacing: 2px;">Ultimate Fantasy Dashboard</span>
        </div>
        <div style="display: flex; align-items: center; padding: 10px 16px; border-bottom: 1px solid rgba(220, 38, 38, 0.2);">
          ${logoBase64 ? `<img src="${logoBase64}" style="height: 40px; width: auto; flex-shrink: 0; margin-right: 12px; margin-top: 4px;" />` : ''}
          <div style="flex: 1;">
            <div style="font-size: 17px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.1;">Draft Balance</div>
            <div style="font-size: 12px; margin-top: 2px;">
              <span style="color: #e5e7eb;">${leagueName}</span>
              <span style="color: #6b7280; margin: 0 4px;">•</span>
              <span style="color: #dc2626; font-weight: 600;">${selectedSeason.value} Draft</span>
            </div>
          </div>
        </div>
        <div style="padding: 12px 16px; background: linear-gradient(135deg, rgba(250, 204, 21, 0.15) 0%, transparent 100%); border-bottom: 1px solid rgba(250, 204, 21, 0.2);">
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="${teamLogoBase64 || createPlaceholder(team.team_name)}" style="width: 44px; height: 44px; border-radius: 50%; border: 2px solid rgba(250, 204, 21, 0.5);" />
            <div style="flex: 1;">
              <div style="font-size: 15px; font-weight: bold; color: #ffffff;">${team.team_name}</div>
              <div style="font-size: 11px; color: #9ca3af;">${team.strategyLabel}</div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 28px; font-weight: 900; color: #facc15;">${team.balanceGrade}</div>
              <div style="font-size: 9px; color: #9ca3af;">BALANCE</div>
            </div>
          </div>
        </div>
        <div style="padding: 16px; display: flex; gap: 16px;">
          <div style="flex: 1;">
            <div style="font-size: 12px; font-weight: bold; color: #60a5fa; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
              <span>⚾</span> Hitting
            </div>
            ${hittingCats.map(generateCategoryRow).join('')}
          </div>
          <div style="flex: 1;">
            <div style="font-size: 12px; font-weight: bold; color: #a78bfa; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
              <span>🎯</span> Pitching
            </div>
            ${pitchingCats.map(generateCategoryRow).join('')}
          </div>
        </div>
        <div style="padding: 12px 16px; border-top: 1px solid rgba(58, 61, 82, 0.5);">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 20px;">${team.strategyIcon}</span>
            <div style="flex: 1;">
              <div style="font-size: 13px; font-weight: bold; color: #e5e7eb;">${team.strategyLabel}</div>
              <div style="font-size: 11px; color: #9ca3af;">${team.strategyDetail}</div>
            </div>
          </div>
        </div>
        <div style="padding: 10px 16px; text-align: center; border-top: 1px solid rgba(220, 38, 38, 0.2);">
          <span style="font-size: 14px; font-weight: bold; color: #dc2626;">ultimatefantasydashboard.com</span>
        </div>
      </div>
    `
    
    document.body.appendChild(container)
    await new Promise(r => setTimeout(r, 300))
    
    const finalCanvas = await html2canvas(container, { backgroundColor: '#0a0c14', scale: 2, useCORS: true, allowTaint: true, width: 480 })
    document.body.removeChild(container)
    
    const link = document.createElement('a')
    const safeTeamName = team.team_name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-').toLowerCase()
    link.download = `${selectedSeason.value}-draft-balance-${safeTeamName}.png`
    link.href = finalCanvas.toDataURL('image/png')
    link.click()
  } finally {
    isDownloadingBalance.value = false
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
