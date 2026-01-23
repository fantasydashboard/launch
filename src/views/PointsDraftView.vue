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
        <h1 class="text-3xl font-bold text-dark-text mb-2">Draft Analysis</h1>
        <p class="text-base text-dark-textMuted">
          Visual draft board with pick analysis and performance tracking
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
        :class="activeTab === tab.id ? 'bg-yellow-400 text-gray-900' : 'bg-dark-card text-dark-textSecondary hover:bg-dark-border/50'"
        class="px-4 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 text-sm"
      >
        <span class="text-lg">{{ tab.icon }}</span>
        {{ tab.name }}
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center py-20">
      <LoadingSpinner size="xl" message="Loading draft data..." />
      <div v-if="loadingProgress.currentStep" class="mt-4 text-center">
        <div class="text-sm text-dark-textMuted">{{ loadingProgress.currentStep }}</div>
        <div v-if="loadingProgress.detail" class="text-xs text-dark-textMuted/70 mt-1">{{ loadingProgress.detail }}</div>
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
              <span><span class="text-yellow-400 font-semibold">Click any team header</span> to see detailed draft breakdown and share</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Draft Board Grid -->
      <div class="overflow-x-auto">
        <div class="inline-block min-w-full">
          <!-- Column Headers (Teams) - Clickable -->
          <div class="flex gap-1 mb-1">
            <div class="w-12 flex-shrink-0"></div>
            <div 
              v-for="team in draftBoard" 
              :key="team.team_key"
              class="w-32 flex-shrink-0 bg-dark-card rounded-t-lg p-2 text-center cursor-pointer hover:ring-2 hover:ring-yellow-400 transition-all"
              @click="openTeamModal(team)"
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
              <div class="mt-1">
                <span class="text-xs font-bold px-1.5 py-0.5 rounded" :class="getGradeClass(getTeamGrade(team.team_key))">
                  {{ getTeamGrade(team.team_key) }}
                </span>
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
                :class="[
                  getPickClass(getPickForRound(team.team_key, round)),
                  positionFilter !== 'All' && !pickMatchesPositionFilter(getPickForRound(team.team_key, round)) ? 'opacity-30' : ''
                ]"
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
                <!-- Position Rank Row -->
                <div class="flex items-center justify-between mt-1">
                  <span class="text-[9px] text-dark-textMuted">
                    {{ getPickForRound(team.team_key, round)?.position }}{{ getPickForRound(team.team_key, round)?.position_rank_drafted || '?' }}
                    <template v-if="getPickForRound(team.team_key, round)?.current_position_rank && getPickForRound(team.team_key, round)?.current_position_rank < 900">
                      → {{ getPickForRound(team.team_key, round)?.position }}{{ getPickForRound(team.team_key, round)?.current_position_rank }}
                    </template>
                  </span>
                  <span 
                    v-if="getPickForRound(team.team_key, round)?.score !== undefined"
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
      <!-- Grading Methodology Explainer -->
      <div class="card mb-4 border border-yellow-500/30">
        <div class="card-body">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
              <span class="text-xl">📊</span>
            </div>
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-2">
                <h3 class="font-bold text-dark-text">Premium Tier-Based Draft Grading</h3>
                <button 
                  @click="showGradingInfo = !showGradingInfo" 
                  class="text-xs px-2 py-0.5 rounded bg-dark-border text-dark-textMuted hover:text-yellow-400 transition-colors"
                >
                  {{ showGradingInfo ? 'Hide Details' : 'How It Works' }}
                </button>
              </div>
              <p class="text-sm text-dark-textMuted">
                Grades are based on <span class="text-yellow-400 font-semibold">tier movement</span>, not raw rank difference. 
                Drafting SS1 and getting SS3 (both elite) is very different than drafting SS24 and getting SS26 (both replacement level).
                Team grades are <span class="text-yellow-400 font-semibold">ranked relative</span> to other managers in your league.
              </p>
              
              <!-- Expanded Info -->
              <div v-if="showGradingInfo" class="mt-4 space-y-4">
                <!-- Tier Definitions -->
                <div class="bg-dark-border/30 rounded-lg p-4">
                  <h4 class="font-semibold text-dark-text mb-2">Position Tiers ({{ numTeams }}-team league)</h4>
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div class="flex items-center gap-2">
                      <span class="w-3 h-3 rounded-full bg-emerald-500"></span>
                      <span class="text-dark-textMuted">Elite: #1-{{ tierConfig.elite }}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="w-3 h-3 rounded-full bg-green-500"></span>
                      <span class="text-dark-textMuted">Starter: #1-{{ tierConfig.starter }}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="w-3 h-3 rounded-full bg-yellow-500"></span>
                      <span class="text-dark-textMuted">Bench: #{{ tierConfig.starter + 1 }}-{{ tierConfig.bench }}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="w-3 h-3 rounded-full bg-gray-500"></span>
                      <span class="text-dark-textMuted">Replacement: #{{ tierConfig.bench + 1 }}+</span>
                    </div>
                  </div>
                </div>
                
                <!-- Value Score Calculation -->
                <div class="bg-dark-border/30 rounded-lg p-4">
                  <h4 class="font-semibold text-dark-text mb-2">📈 Value Score Calculation</h4>
                  <div class="text-sm text-dark-textMuted space-y-2">
                    <p>Each pick's score is calculated using multiple factors:</p>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                      <div class="bg-dark-bg/50 rounded p-2">
                        <span class="text-yellow-400 font-semibold">1. Tier Movement</span>
                        <p class="text-xs mt-1">Base score from where you drafted vs where they finished. ELITE→ELITE = +10, BENCH→ELITE = +35, ELITE→BENCH = -20</p>
                      </div>
                      <div class="bg-dark-bg/50 rounded p-2">
                        <span class="text-yellow-400 font-semibold">2. Round Multiplier</span>
                        <p class="text-xs mt-1">Early round busts hurt 1.5x more. Late round steals get 1.5x bonus. Finding value late is rewarded!</p>
                      </div>
                      <div class="bg-dark-bg/50 rounded p-2">
                        <span class="text-yellow-400 font-semibold">3. Elite Bonus</span>
                        <p class="text-xs mt-1">+8 bonus for any pick that finishes in the elite tier, regardless of where drafted.</p>
                      </div>
                      <div class="bg-dark-bg/50 rounded p-2">
                        <span class="text-yellow-400 font-semibold">4. Position Scarcity</span>
                        <p class="text-xs mt-1">{{ sportScarcityExamples }}. Scarce positions get bonus value.</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- Team Grading -->
                <div class="bg-dark-border/30 rounded-lg p-4">
                  <h4 class="font-semibold text-dark-text mb-2">🏆 Team Grade Formula</h4>
                  <div class="text-sm text-dark-textMuted space-y-2">
                    <p>Team grades use <span class="text-yellow-400">weighted scoring</span> + <span class="text-yellow-400">relative ranking</span>:</p>
                    <ul class="list-disc list-inside text-xs space-y-1 mt-2">
                      <li>Rounds 1-2 picks weighted <span class="text-white font-semibold">5x</span></li>
                      <li>Rounds 3-5 picks weighted <span class="text-white font-semibold">3x</span></li>
                      <li>Rounds 6-10 picks weighted <span class="text-white font-semibold">2x</span></li>
                      <li>Rounds 11+ picks weighted <span class="text-white font-semibold">1x</span></li>
                      <li>Final grade adjusted by <span class="text-white font-semibold">league rank</span> (best drafter gets boost, worst gets penalty)</li>
                    </ul>
                  </div>
                </div>
                
                <!-- Key Principles -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div class="bg-dark-border/30 rounded-lg p-3">
                    <div class="font-semibold text-dark-text mb-1">🎯 Verdict Examples</div>
                    <div class="text-dark-textMuted text-xs">
                      💎 JACKPOT: Late pick → Elite<br>
                      🔥 STEAL: Bench pick → Starter<br>
                      💥 BUST: Elite pick → Bench
                    </div>
                  </div>
                  <div class="bg-dark-border/30 rounded-lg p-3">
                    <div class="font-semibold text-dark-text mb-1">⚖️ Grade Distribution</div>
                    <div class="text-dark-textMuted text-xs">
                      Top 10%: A+ to A<br>
                      Top 30%: A- to B+<br>
                      Middle 40%: B to B-<br>
                      Bottom 30%: C+ to F
                    </div>
                  </div>
                  <div class="bg-dark-border/30 rounded-lg p-3">
                    <div class="font-semibold text-dark-text mb-1">📉 What Hurts Most</div>
                    <div class="text-dark-textMuted text-xs">
                      Round 1-2 bust = -30 to -50<br>
                      Elite pick → Waiver = -40<br>
                      Multiple early busts = F grade
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Hint Text -->
      <div class="flex items-center gap-2 text-sm text-dark-textMuted mt-4 mb-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>
        <span>Click <span class="text-yellow-400 font-semibold">team card</span> for details</span>
      </div>

      <!-- Team Draft Grades Summary -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div 
          v-for="team in teamGrades" 
          :key="team.team_key"
          class="card cursor-pointer hover:ring-2 hover:ring-yellow-400 transition-all relative"
          @click="openTeamModal(team)"
        >
          <!-- Rank Badge -->
          <div 
            class="absolute -top-2 -left-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-lg"
            :class="team.rank === 1 ? 'bg-yellow-500 text-black' : team.rank === 2 ? 'bg-gray-300 text-black' : team.rank === 3 ? 'bg-amber-600 text-white' : 'bg-dark-border text-dark-textMuted'"
          >
            #{{ team.rank }}
          </div>
          <div class="card-body">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 rounded-full bg-dark-border overflow-hidden">
                <img v-if="team.logo_url" :src="team.logo_url" class="w-full h-full object-cover" @error="handleImageError" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-dark-text truncate">{{ team.team_name }}</div>
                <div class="text-xs text-dark-textMuted">{{ team.picks.length }} picks • Score: {{ team.gradeScore >= 0 ? '+' : '' }}{{ team.gradeScore?.toFixed(1) }}</div>
              </div>
              <div 
                class="text-3xl font-black"
                :class="getGradeClass(team.grade)"
              >
                {{ team.grade }}
              </div>
            </div>
            <!-- Updated stats with verdicts -->
            <div class="grid grid-cols-4 gap-1 text-center text-xs">
              <div class="bg-emerald-500/10 rounded p-1.5">
                <div class="font-bold text-emerald-400">{{ team.steals || 0 }}</div>
                <div class="text-dark-textMuted text-[10px]">Steals</div>
              </div>
              <div class="bg-green-500/10 rounded p-1.5">
                <div class="font-bold text-green-400">{{ team.hits || 0 }}</div>
                <div class="text-dark-textMuted text-[10px]">Hits</div>
              </div>
              <div class="bg-yellow-500/10 rounded p-1.5">
                <div class="font-bold text-yellow-400">{{ team.misses || 0 }}</div>
                <div class="text-dark-textMuted text-[10px]">Misses</div>
              </div>
              <div class="bg-red-500/10 rounded p-1.5">
                <div class="font-bold text-red-400">{{ team.busts || 0 }}</div>
                <div class="text-dark-textMuted text-[10px]">Busts</div>
              </div>
            </div>
            <!-- Early round hit rate -->
            <div class="mt-2 flex items-center justify-between text-xs">
              <span class="text-dark-textMuted">Early Round Hit Rate</span>
              <span :class="team.earlyRoundHitRate >= 60 ? 'text-green-400' : team.earlyRoundHitRate >= 40 ? 'text-yellow-400' : 'text-red-400'" class="font-semibold">
                {{ team.earlyRoundHitRate?.toFixed(0) || 0 }}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Individual Player Grades -->
      <div class="card mt-6">
        <div class="card-header flex flex-wrap items-center justify-between gap-4">
          <h3 class="text-lg font-bold text-dark-text">
            {{ selectedTeamFilter ? teamGrades.find(t => t.team_key === selectedTeamFilter)?.team_name + ' Picks' : 'All Picks' }}
          </h3>
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
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-dark-border">
                <th class="text-left p-3 text-sm font-semibold text-dark-textMuted">Pick</th>
                <th class="text-left p-3 text-sm font-semibold text-dark-textMuted">Player</th>
                <th class="text-left p-3 text-sm font-semibold text-dark-textMuted">Team</th>
                <th class="text-center p-3 text-sm font-semibold text-dark-textMuted">Position</th>
                <th class="text-center p-3 text-sm font-semibold text-dark-textMuted">Tier</th>
                <th class="text-center p-3 text-sm font-semibold text-dark-textMuted">Verdict</th>
                <th class="text-center p-3 text-sm font-semibold text-dark-textMuted">Grade</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="pick in sortedGradePicks" 
                :key="pick.pick + '-' + (pick.activePosition || pick.position)"
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
                    <div>
                      <div class="font-medium text-dark-text">{{ pick.player_name }}</div>
                      <div class="text-xs text-dark-textMuted">{{ pick.totalPoints?.toFixed(1) || 0 }} pts</div>
                    </div>
                  </div>
                </td>
                <td class="p-3 text-sm text-dark-textMuted">{{ pick.team_name }}</td>
                <td class="p-3 text-center">
                  <div class="flex items-center justify-center gap-1">
                    <!-- Position switcher arrows for multi-position players -->
                    <button 
                      v-if="pick.eligiblePositions && pick.eligiblePositions.length > 1"
                      @click.stop="cyclePosition(pick, -1)"
                      class="w-5 h-5 rounded hover:bg-dark-border flex items-center justify-center text-dark-textMuted hover:text-white transition-colors"
                    >
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    
                    <!-- Position badge with drafted rank and +/- difference -->
                    <span 
                      class="text-xs px-2 py-1 rounded font-bold"
                      :class="getPositionClass(pick.activePosition || pick.position)"
                    >
                      {{ pick.activePosition || pick.position }}{{ pick.position_rank_drafted || '?' }}
                      <span 
                        v-if="pick.current_position_rank < 900 && pick.position_rank_drafted"
                        class="ml-1"
                        :class="getPositionDiffClass(pick.position_rank_drafted - pick.current_position_rank)"
                      >
                        {{ formatPositionDiff(pick.position_rank_drafted - pick.current_position_rank) }}
                      </span>
                    </span>
                    
                    <!-- Position switcher arrows for multi-position players -->
                    <button 
                      v-if="pick.eligiblePositions && pick.eligiblePositions.length > 1"
                      @click.stop="cyclePosition(pick, 1)"
                      class="w-5 h-5 rounded hover:bg-dark-border flex items-center justify-center text-dark-textMuted hover:text-white transition-colors"
                    >
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    
                    <!-- Multi-position indicator -->
                    <span 
                      v-if="pick.eligiblePositions && pick.eligiblePositions.length > 1"
                      class="text-[10px] text-dark-textMuted ml-1"
                      :title="'Eligible: ' + pick.eligiblePositions.join(', ')"
                    >
                      ({{ pick.eligiblePositions.length }})
                    </span>
                  </div>
                </td>
                <td class="p-3 text-center">
                  <span class="text-xs text-dark-textMuted whitespace-nowrap">
                    {{ pick.tierMovement || '' }}
                  </span>
                </td>
                <td class="p-3 text-center">
                  <span 
                    v-if="pick.verdict"
                    class="text-xs px-2 py-1 rounded font-semibold whitespace-nowrap"
                    :class="getVerdictClass(pick.verdict)"
                  >
                    {{ getVerdictLabel(pick.verdict) }}
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
      <!-- Explanation Card -->
      <div class="card mb-6">
        <div class="card-body py-4">
          <div class="flex items-start gap-3">
            <span class="text-2xl">💡</span>
            <div class="text-sm">
              <p class="text-dark-text font-semibold mb-1">Understanding Value Scores</p>
              <p class="text-dark-textMuted">
                <span class="text-yellow-400 font-semibold">Value Score</span> = Position Rank at Draft − Current Position Rank by Points.
                A <span class="text-green-400 font-semibold">+10</span> means the player finished 10 spots higher than where they were drafted at their position (a steal!).
                A <span class="text-red-400 font-semibold">-10</span> means they finished 10 spots lower than drafted (a bust).
              </p>
            </div>
          </div>
        </div>
      </div>
      <!-- Round by Round Analysis -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="card">
          <div class="card-header">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-2xl">🔥</span>
                <div>
                  <h3 class="text-lg font-bold text-dark-text">Biggest Draft Steals</h3>
                  <p class="text-sm text-dark-textMuted">Best value relative to draft position</p>
                </div>
              </div>
              <button @click="downloadStealsImage" :disabled="isDownloadingSteals" class="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-50" style="background:transparent;color:#facc15;border:1px solid #facc15;" @mouseover="$event.currentTarget.style.background='#facc15';$event.currentTarget.style.color='#111827'" @mouseout="$event.currentTarget.style.background='transparent';$event.currentTarget.style.color='#facc15'">
                <svg v-if="!isDownloadingSteals" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                {{ isDownloadingSteals ? 'Saving...' : 'Share' }}
              </button>
            </div>
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
                <div class="text-xs text-dark-textMuted">R{{ pick.round }} • {{ pick.team_name }}</div>
              </div>
              <div class="text-right">
                <div class="text-lg font-bold text-green-400">+{{ pick.score?.toFixed(0) }}</div>
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
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-2xl">💀</span>
                <div>
                  <h3 class="text-lg font-bold text-dark-text">Biggest Draft Busts</h3>
                  <p class="text-sm text-dark-textMuted">Underperformed relative to draft position</p>
                </div>
              </div>
              <button @click="downloadBustsImage" :disabled="isDownloadingBusts" class="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-50" style="background:transparent;color:#facc15;border:1px solid #facc15;" @mouseover="$event.currentTarget.style.background='#facc15';$event.currentTarget.style.color='#111827'" @mouseout="$event.currentTarget.style.background='transparent';$event.currentTarget.style.color='#facc15'">
                <svg v-if="!isDownloadingBusts" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                {{ isDownloadingBusts ? 'Saving...' : 'Share' }}
              </button>
            </div>
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
                <div class="text-xs text-dark-textMuted">R{{ pick.round }} • {{ pick.team_name }}</div>
              </div>
              <div class="text-right">
                <div class="text-lg font-bold text-red-400">{{ pick.score?.toFixed(0) }}</div>
                <div class="text-xs text-dark-textMuted">{{ pick.position }}</div>
              </div>
            </div>
            <div v-if="topReaches.length === 0" class="text-center py-4 text-dark-textMuted">
              No significant busts found
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

    <!-- ==================== TEAM DETAIL MODAL ==================== -->
    <Teleport to="body">
      <div 
        v-if="showTeamModal && selectedTeamData" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="showTeamModal = false"
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
                <p class="text-sm text-dark-textMuted">Draft Breakdown</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button 
                @click="downloadTeamImage" 
                :disabled="isDownloadingTeam"
                class="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-50"
                style="background: transparent; color: #facc15; border: 1px solid #facc15;"
                @mouseover="$event.currentTarget.style.background = '#facc15'; $event.currentTarget.style.color = '#111827'"
                @mouseout="$event.currentTarget.style.background = 'transparent'; $event.currentTarget.style.color = '#facc15'"
              >
                <svg v-if="!isDownloadingTeam" class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <svg v-else class="w-4 h-4 animate-spin pointer-events-none" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ isDownloadingTeam ? 'Saving...' : 'Share' }}
              </button>
              <button @click="showTeamModal = false" class="p-2 rounded-lg hover:bg-dark-border/50 transition-colors">
                <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          <div class="p-6">
            <!-- Grade Summary -->
            <div class="flex items-center justify-between mb-6 p-4 bg-dark-border/20 rounded-xl">
              <div class="grid grid-cols-3 gap-4 flex-1 text-center">
                <div>
                  <div class="text-2xl font-bold text-dark-text">{{ selectedTeamData?.totalScore >= 0 ? '+' : '' }}{{ selectedTeamData?.totalScore?.toFixed(1) }}</div>
                  <div class="text-xs text-dark-textMuted">Total Score</div>
                </div>
                <div>
                  <div class="text-2xl font-bold text-green-400">{{ selectedTeamData?.hits }}</div>
                  <div class="text-xs text-dark-textMuted">Hits</div>
                </div>
                <div>
                  <div class="text-2xl font-bold text-red-400">{{ selectedTeamData?.misses }}</div>
                  <div class="text-xs text-dark-textMuted">Misses</div>
                </div>
              </div>
              <div class="text-center pl-6 border-l border-dark-border">
                <div class="text-5xl font-black" :class="getGradeClass(selectedTeamData?.grade)">
                  {{ selectedTeamData?.grade }}
                </div>
                <div class="text-xs text-dark-textMuted mt-1">Overall Grade</div>
              </div>
            </div>

            <!-- Position Breakdown -->
            <div class="mb-6">
              <h4 class="text-sm font-bold text-dark-textMuted uppercase mb-3">Position Breakdown</h4>
              <div class="grid grid-cols-5 gap-2">
                <div 
                  v-for="pos in getTeamPositionBreakdown(selectedTeamData?.team_key)" 
                  :key="pos.position"
                  class="text-center p-2 rounded-lg"
                  :class="getPositionStrengthClass(pos.avgScore)"
                >
                  <div class="text-sm font-bold">{{ pos.position }}</div>
                  <div class="text-xs opacity-75">{{ pos.count }} picks</div>
                  <div class="text-xs font-semibold mt-1">
                    {{ pos.avgScore >= 0 ? '+' : '' }}{{ pos.avgScore.toFixed(1) }}
                  </div>
                </div>
              </div>
            </div>

            <!-- All Picks -->
            <div>
              <h4 class="text-sm font-bold text-dark-textMuted uppercase mb-3">All Picks</h4>
              <div class="space-y-2">
                <div 
                  v-for="pick in selectedTeamData?.picks" 
                  :key="pick.pick"
                  class="flex items-center gap-3 p-3 bg-dark-border/20 rounded-lg"
                  :class="pick.score >= 3 ? 'border-l-2 border-green-500' : pick.score <= -3 ? 'border-l-2 border-red-500' : ''"
                >
                  <div class="w-8 text-center text-sm font-bold text-dark-textMuted">R{{ pick.round }}</div>
                  <div class="w-10 h-10 rounded-full bg-dark-border overflow-hidden flex-shrink-0">
                    <img v-if="pick.headshot" :src="pick.headshot" class="w-full h-full object-cover" @error="handleImageError" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="font-semibold text-dark-text truncate">{{ pick.player_name }}</div>
                    <div class="text-xs text-dark-textMuted">
                      {{ pick.position }}{{ pick.position_rank_drafted || '' }}
                      <template v-if="pick.current_position_rank && pick.current_position_rank < 900">
                        → {{ pick.position }}{{ pick.current_position_rank }}
                      </template>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="font-bold" :class="getGradeClass(pick.grade)">{{ pick.grade }}</div>
                    <div class="text-xs" :class="pick.score >= 0 ? 'text-green-400' : 'text-red-400'">
                      {{ pick.score >= 0 ? '+' : '' }}{{ pick.score?.toFixed(1) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

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
            <div class="grid grid-cols-3 gap-4">
              <div class="bg-dark-border/30 rounded-xl p-4">
                <div class="text-sm text-dark-textMuted mb-1">Draft Pick</div>
                <div class="text-2xl font-bold text-dark-text">R{{ selectedPick.round }}.{{ selectedPick.pickInRound }}</div>
                <div class="text-xs text-dark-textMuted">Overall #{{ selectedPick.pick }}</div>
              </div>
              <div class="bg-dark-border/30 rounded-xl p-4 text-center">
                <div class="text-sm text-dark-textMuted mb-1">Position Rank</div>
                <div class="text-2xl font-bold text-yellow-400">{{ selectedPick.position }}{{ selectedPick.position_rank_drafted || '?' }}</div>
                <div class="text-xs text-dark-textMuted">at draft</div>
              </div>
              <div class="bg-dark-border/30 rounded-xl p-4 text-center">
                <div class="text-sm text-dark-textMuted mb-1">Pick Grade</div>
                <div class="text-4xl font-black" :class="getGradeClass(selectedPick.grade)">{{ selectedPick.grade }}</div>
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

    <!-- Platform Badge at Bottom -->
    <div class="flex justify-center mt-8">
      <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full border" :class="platformBadgeClass">
        <img 
          :src="platformLogo" 
          :alt="platformName"
          class="w-5 h-5"
        />
        <span class="text-sm" :class="platformSubTextClass">{{ platformName }} Fantasy {{ sportName }} • {{ scoringTypeLabel }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useAuthStore } from '@/stores/auth'
import { yahooService } from '@/services/yahoo'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { 
  getTierConfig, 
  getTier, 
  calculatePickScore, 
  scoreToGrade, 
  calculateTeamGrade,
  getRelativeTeamGrade,
  getPositionScarcity,
  type Tier 
} from '@/services/draftGrading'

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

const isSleeper = computed(() => leagueStore.activePlatform === 'sleeper')

// Season detection for offseason banner
const currentSeason = computed(() => leagueStore.currentLeague?.season || new Date().getFullYear().toString())
const isSeasonComplete = computed(() => {
  if (leagueStore.currentLeague?.status === 'complete') return true
  const yahooLeague = Array.isArray(leagueStore.yahooLeague) ? leagueStore.yahooLeague[0] : leagueStore.yahooLeague
  return yahooLeague?.is_finished === 1
})

// Platform display helpers
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
  return 'text-purple-400'
})

const platformSubTextClass = computed(() => {
  if (isEspn.value) return 'text-[#5b8def]'
  if (isSleeper.value) return 'text-[#01b5a5]'
  return 'text-purple-300'
})

const sportName = computed(() => {
  const saved = leagueStore.savedLeagues.find(l => l.league_id === leagueStore.activeLeagueId)
  const sport = saved?.sport || 'football'
  const names: Record<string, string> = { football: 'Football', baseball: 'Baseball', basketball: 'Basketball', hockey: 'Hockey' }
  return names[sport] || 'Fantasy'
})

// Scoring type label for badge
const scoringTypeLabel = computed(() => {
  const st = (leagueStore.currentLeague?.scoring_type || leagueStore.yahooLeague?.scoring_type || '').toLowerCase()
  if (st.includes('roto')) return 'Roto'
  if (st.includes('point') || st === 'headpoint') return 'H2H Points'
  if (st.includes('head')) return 'H2H Categories'
  return 'H2H Points'
})

// Tab options
const tabOptions = [
  { id: 'board', name: 'Draft Board', icon: '📋' },
  { id: 'grades', name: 'Player Grades', icon: '🎯' },
  { id: 'analysis', name: 'Steals & Busts', icon: '📊' },
  { id: 'actual', name: 'Actual Value', icon: '🏆' }
]

// State
const activeTab = ref('board')
const selectedSeason = ref('2025')
const positionFilter = ref('All')
const selectedTeamFilter = ref('')
const gradeSort = ref('pick')
const isLoading = ref(false)
const loadingProgress = ref({ currentStep: '', detail: '' })
const selectedPick = ref<any>(null)

// Team Modal State
const showTeamModal = ref(false)
const selectedTeamData = ref<any>(null)
const isDownloadingTeam = ref(false)
const isDownloadingSteals = ref(false)
const isDownloadingBusts = ref(false)

// Grading info UI
const showGradingInfo = ref(false)

// Data
const draftPicks = ref<any[]>([])
const playerData = ref<Map<string, any>>(new Map())
const playerStats = ref<Map<string, any>>(new Map())
const teamsData = ref<any[]>([])

// Default avatar for error handling
const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIGZpbGw9IiMzNzQxNTEiLz48cGF0aCBkPSJNMjAgMjBDMjMuMzEzNyAyMCAyNiAxNy4zMTM3IDI2IDE0QzI2IDEwLjY4NjMgMjMuMzEzNyA4IDIwIDhDMTYuNjg2MyA4IDE0IDEwLjY4NjMgMTQgMTRDMTQgMTcuMzEzNyAxNi42ODYzIDIwIDIwIDIwWiIgZmlsbD0iIzZCNzI4MCIvPjxwYXRoIGQ9Ik0zMiAzMkMzMiAyNy41ODE3IDI2LjYyNzQgMjQgMjAgMjRDMTMuMzcyNiAyNCAgMjcuNTgxNyA4IDMyIDMyWiIgZmlsbD0iIzZCNzI4MCIvPjwvc3ZnPg=='

// Number of teams for tier calculations
const numTeams = computed(() => {
  return draftBoard.value.length || leagueStore.yahooTeams?.length || 10
})

// Tier configuration based on league size
const tierConfig = computed(() => getTierConfig(numTeams.value))

// Sport-specific scarcity examples for the info panel
const sportScarcityExamples = computed(() => {
  const sport = sportName.value?.toLowerCase() || 'baseball'
  switch (sport) {
    case 'football':
      return 'RB & TE most valuable, K & DEF least'
    case 'basketball':
      return 'Centers slightly more valuable for blocks/rebounds'
    case 'hockey':
      return 'Goalies most scarce, forwards plentiful'
    default: // baseball
      return 'C & SS most scarce, OF & 1B easiest to replace'
  }
})

// Available seasons based on game keys
const availableSeasons = computed(() => {
  // For Sleeper, use historical seasons from the store
  if (isSleeper.value && leagueStore.historicalSeasons.length > 0) {
    return leagueStore.historicalSeasons.map(s => s.season).sort((a, b) => b.localeCompare(a))
  }
  // Default for Yahoo/ESPN
  return ['2025', '2024', '2023', '2022', '2021', '2020']
})

// Get available positions from draft picks
const availablePositions = computed(() => {
  const positions = new Set<string>()
  const sport = leagueStore.currentSportType || 'baseball'
  
  // For baseball, extract individual positions from multi-position strings
  if (sport === 'baseball') {
    draftPicks.value.forEach(pick => {
      if (pick.position) {
        // Split by comma and add each individual position
        const posArray = pick.position.split(',').map((p: string) => p.trim())
        posArray.forEach((pos: string) => {
          if (pos) positions.add(pos)
        })
      }
    })
    // Return in logical baseball order
    const baseballOrder = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'OF', 'DH', 'UTIL', 'SP', 'RP', 'P']
    return Array.from(positions).sort((a, b) => {
      const aIdx = baseballOrder.indexOf(a)
      const bIdx = baseballOrder.indexOf(b)
      if (aIdx === -1 && bIdx === -1) return a.localeCompare(b)
      if (aIdx === -1) return 1
      if (bIdx === -1) return -1
      return aIdx - bIdx
    })
  }
  
  // For other sports, use full position strings
  draftPicks.value.forEach(pick => {
    if (pick.position) positions.add(pick.position)
  })
  return Array.from(positions).sort()
})

// Filter picks by position
const filteredPicks = computed(() => {
  if (positionFilter.value === 'All') return draftPicks.value
  
  const sport = leagueStore.currentSportType || 'baseball'
  
  // For baseball, check if player's position string includes the selected position
  if (sport === 'baseball') {
    return draftPicks.value.filter(p => {
      if (!p.position) return false
      const posArray = p.position.split(',').map((pos: string) => pos.trim())
      return posArray.includes(positionFilter.value)
    })
  }
  
  // For other sports, exact match
  return draftPicks.value.filter(p => p.position === positionFilter.value)
})

// Helper function to check if a pick matches the position filter (for baseball multi-position)
function pickMatchesPositionFilter(pick: any): boolean {
  if (!pick || positionFilter.value === 'All') return true
  if (!pick.position) return false
  
  const sport = leagueStore.currentSportType || 'baseball'
  if (sport === 'baseball') {
    const posArray = pick.position.split(',').map((pos: string) => pos.trim())
    return posArray.includes(positionFilter.value)
  }
  
  return pick.position === positionFilter.value
}

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

// Team grades using premium tier-based system with relative ranking
const teamGrades = computed(() => {
  // First pass: calculate raw grades for all teams
  const teamsWithRawGrades = draftBoard.value.map(team => {
    const picks = team.picks
    
    // Use the new calculateTeamGrade function
    const pickData = picks.map((p: any) => ({
      round: p.round,
      score: p.score || 0,
      verdict: p.verdict || 'SOLID'
    }))
    
    const gradeResult = calculateTeamGrade(pickData)
    
    // Count verdicts for display
    const steals = picks.filter((p: any) => p.verdict === 'JACKPOT' || p.verdict === 'STEAL').length
    const hits = picks.filter((p: any) => p.verdict === 'HIT').length
    const misses = picks.filter((p: any) => p.verdict === 'MISS').length
    const busts = picks.filter((p: any) => p.verdict === 'BUST' || p.verdict === 'DISASTER').length
    
    return {
      ...team,
      totalScore: gradeResult.totalScore,
      avgScore: gradeResult.avgScore,
      rawGrade: gradeResult.grade,
      gradeScore: gradeResult.gradeScore,
      steals,
      hits,
      misses,
      busts,
      earlyRoundHitRate: gradeResult.earlyRoundHitRate,
      earlyRoundScore: gradeResult.earlyRoundScore,
      lateRoundScore: gradeResult.lateRoundScore
    }
  })
  
  // Sort by gradeScore to get rankings
  const sorted = [...teamsWithRawGrades].sort((a, b) => b.gradeScore - a.gradeScore)
  
  // Second pass: apply relative grading based on league rank
  return sorted.map((team, index) => {
    const rank = index + 1
    const numTeams = sorted.length
    
    // Use relative grading for final grade
    const grade = getRelativeTeamGrade(rank, numTeams, team.gradeScore)
    
    return {
      ...team,
      grade,
      rank
    }
  })
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
    // Baseball
    'C': 'bg-blue-500/20 text-blue-400',
    '1B': 'bg-green-500/20 text-green-400',
    '2B': 'bg-yellow-500/20 text-yellow-400',
    '3B': 'bg-orange-500/20 text-orange-400',
    'SS': 'bg-purple-500/20 text-purple-400',
    'OF': 'bg-pink-500/20 text-pink-400',
    'LF': 'bg-pink-500/20 text-pink-400',
    'CF': 'bg-pink-500/20 text-pink-400',
    'RF': 'bg-pink-500/20 text-pink-400',
    'SP': 'bg-red-500/20 text-red-400',
    'RP': 'bg-cyan-500/20 text-cyan-400',
    'P': 'bg-red-500/20 text-red-400',
    'DH': 'bg-amber-500/20 text-amber-400',
    'Util': 'bg-gray-500/20 text-gray-400',
    'UTIL': 'bg-gray-500/20 text-gray-400',
    'MI': 'bg-indigo-500/20 text-indigo-400',
    'CI': 'bg-lime-500/20 text-lime-400',
    'BN': 'bg-gray-500/20 text-gray-400',
    // Football
    'QB': 'bg-red-500/20 text-red-400',
    'RB': 'bg-green-500/20 text-green-400',
    'WR': 'bg-blue-500/20 text-blue-400',
    'TE': 'bg-orange-500/20 text-orange-400',
    'K': 'bg-purple-500/20 text-purple-400',
    'DEF': 'bg-yellow-500/20 text-yellow-400',
    'D/ST': 'bg-yellow-500/20 text-yellow-400',
    'FLEX': 'bg-pink-500/20 text-pink-400',
    'OP': 'bg-cyan-500/20 text-cyan-400',
    // Basketball
    'PG': 'bg-blue-500/20 text-blue-400',
    'SG': 'bg-green-500/20 text-green-400',
    'SF': 'bg-yellow-500/20 text-yellow-400',
    'PF': 'bg-orange-500/20 text-orange-400',
    'G': 'bg-teal-500/20 text-teal-400',
    'F': 'bg-lime-500/20 text-lime-400',
    // Hockey
    'LW': 'bg-blue-500/20 text-blue-400',
    'RW': 'bg-green-500/20 text-green-400',
    'D': 'bg-orange-500/20 text-orange-400',
    'G': 'bg-purple-500/20 text-purple-400',
  }
  return classes[position] || 'bg-gray-500/20 text-gray-400'
}

// Get eligible positions for a player based on their primary position and sport
// This is a fallback for platforms that don't provide eligibility data
// NOTE: This only returns the primary position since we can't determine dual eligibility without API data
function getEligiblePositions(position: string, sport: string): string[] {
  // For now, just return the primary position
  // Dual eligibility (like 1B/OF) should come from the platform's API (ESPN eligibleSlots)
  // We don't want to show generic flex slots like UTIL, FLEX, etc.
  return [position]
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
  // Use the new premium grading system
  return scoreToGrade(score)
}

function calculateValueScore(pick: any, actualRank: number): number {
  // Value = draft pick number - actual finish rank
  // Positive = outperformed draft position
  return pick.pick - actualRank
}

// Verdict display helpers
function getVerdictClass(verdict: string): string {
  switch (verdict) {
    case 'JACKPOT': return 'bg-emerald-500/20 text-emerald-400'
    case 'STEAL': return 'bg-green-500/20 text-green-400'
    case 'HIT': return 'bg-lime-500/20 text-lime-400'
    case 'SOLID': return 'bg-gray-500/20 text-gray-400'
    case 'MISS': return 'bg-yellow-500/20 text-yellow-400'
    case 'BUST': return 'bg-orange-500/20 text-orange-400'
    case 'DISASTER': return 'bg-red-500/20 text-red-400'
    default: return 'bg-gray-500/20 text-gray-400'
  }
}

function getVerdictLabel(verdict: string): string {
  switch (verdict) {
    case 'JACKPOT': return '💎 JACKPOT'
    case 'STEAL': return '🔥 STEAL'
    case 'HIT': return '✓ HIT'
    case 'SOLID': return '○ SOLID'
    case 'MISS': return '✗ MISS'
    case 'BUST': return '💥 BUST'
    case 'DISASTER': return '💀 DISASTER'
    default: return verdict
  }
}

// Position difference helpers
function getPositionDiffClass(diff: number): string {
  if (diff > 0) return 'text-green-400'
  if (diff < 0) return 'text-red-400'
  return 'text-gray-400'
}

function formatPositionDiff(diff: number): string {
  if (diff > 0) return `+${diff}`
  if (diff < 0) return `${diff}`
  return '±0'
}

// Position cycling for multi-eligible players
function cyclePosition(pick: any, direction: number) {
  if (!pick.eligiblePositions || pick.eligiblePositions.length <= 1) return
  
  const currentPos = pick.activePosition || pick.position
  const currentIndex = pick.eligiblePositions.indexOf(currentPos)
  let newIndex = currentIndex + direction
  
  // Wrap around
  if (newIndex < 0) newIndex = pick.eligiblePositions.length - 1
  if (newIndex >= pick.eligiblePositions.length) newIndex = 0
  
  // Update the active position
  pick.activePosition = pick.eligiblePositions[newIndex]
  
  // TODO: Recalculate position ranks for the new position
  // For now, just visual change - would need to track ranks per position
}

function handleImageError(e: Event) {
  const img = e.target as HTMLImageElement
  img.src = defaultAvatar
}

function selectPick(pick: any) {
  selectedPick.value = pick
}

// Team Modal Functions
function openTeamModal(team: any) {
  const teamData = teamGrades.value.find(t => t.team_key === team.team_key)
  selectedTeamData.value = teamData || team
  showTeamModal.value = true
}

function getTeamGrade(teamKey: string): string {
  const team = teamGrades.value.find(t => t.team_key === teamKey)
  return team?.grade || 'C'
}

function getTeamPositionBreakdown(teamKey: string) {
  const team = draftBoard.value.find(t => t.team_key === teamKey)
  if (!team) return []
  const posMap = new Map<string, { position: string; count: number; totalScore: number }>()
  for (const pick of team.picks) {
    const pos = pick.position || 'Unknown'
    if (!posMap.has(pos)) posMap.set(pos, { position: pos, count: 0, totalScore: 0 })
    const entry = posMap.get(pos)!
    entry.count++
    entry.totalScore += pick.score || 0
  }
  return Array.from(posMap.values()).map(p => ({ ...p, avgScore: p.count > 0 ? p.totalScore / p.count : 0 })).sort((a, b) => b.count - a.count)
}

function getPositionStrengthClass(avgScore: number): string {
  if (avgScore >= 5) return 'bg-green-500/30 text-green-400'
  if (avgScore >= 0) return 'bg-yellow-500/20 text-yellow-400'
  if (avgScore >= -5) return 'bg-orange-500/20 text-orange-400'
  return 'bg-red-500/20 text-red-400'
}

function getLeagueName(): string {
  return leagueStore.currentLeague?.name || 'Fantasy Baseball'
}

// Download Team Image
async function downloadTeamImage() {
  if (!selectedTeamData.value) return
  isDownloadingTeam.value = true
  try {
    const html2canvas = (await import('html2canvas')).default
    const team = selectedTeamData.value
    const loadLogo = async (): Promise<string> => { try { const r = await fetch('/UFD_V5.png'); if (!r.ok) return ''; const b = await r.blob(); return new Promise(res => { const rd = new FileReader(); rd.onloadend = () => res(rd.result as string); rd.onerror = () => res(''); rd.readAsDataURL(b) }) } catch { return '' } }
    const createPlaceholder = (n: string): string => { const c = document.createElement('canvas'); c.width = 64; c.height = 64; const ctx = c.getContext('2d'); if (ctx) { ctx.fillStyle = '#3a3d52'; ctx.beginPath(); ctx.arc(32, 32, 32, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(n.charAt(0).toUpperCase(), 32, 34) } return c.toDataURL('image/png') }
    const logoBase64 = await loadLogo()
    let teamLogoBase64 = team.logo_url ? await new Promise<string>(res => { const img = new Image(); img.crossOrigin = 'anonymous'; img.onload = () => { const c = document.createElement('canvas'); c.width = 64; c.height = 64; const ctx = c.getContext('2d'); if (ctx) { ctx.beginPath(); ctx.arc(32, 32, 32, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(img, 0, 0, 64, 64) }; res(c.toDataURL('image/png')) }; img.onerror = () => res(createPlaceholder(team.team_name)); setTimeout(() => res(createPlaceholder(team.team_name)), 3000); img.src = team.logo_url }) : createPlaceholder(team.team_name)
    const generatePickRows = () => team.picks.slice(0, 15).map((p: any) => `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);"><div style="width:24px;text-align:center;font-size:10px;color:#6b7280;">R${p.round}</div><div style="flex:1;font-size:11px;color:#e5e7eb;">${p.player_name}</div><div style="font-size:10px;color:#9ca3af;">${p.position}</div><div style="width:32px;text-align:center;font-size:12px;font-weight:bold;color:${p.grade?.startsWith('A') ? '#22c55e' : p.grade?.startsWith('B') ? '#eab308' : p.grade?.startsWith('C') ? '#f97316' : '#ef4444'};">${p.grade}</div><div style="width:40px;text-align:right;font-size:11px;font-weight:bold;color:${p.score >= 3 ? '#22c55e' : p.score <= -3 ? '#ef4444' : '#9ca3af'};">${p.score >= 0 ? '+' : ''}${p.score?.toFixed(1)}</div></div>`).join('')
    const container = document.createElement('div'); container.style.cssText = 'position:absolute;left:-9999px;top:0;width:480px;font-family:system-ui,-apple-system,sans-serif;'
    container.innerHTML = `<div style="background:linear-gradient(160deg,#0f1219 0%,#0a0c14 50%,#0d1117 100%);border-radius:16px;overflow:hidden;"><div style="background:#facc15;padding:8px 20px;text-align:center;"><span style="font-size:12px;font-weight:700;color:#0a0c14;text-transform:uppercase;letter-spacing:2px;">Ultimate Fantasy Dashboard</span></div><div style="display:flex;align-items:center;padding:12px 16px;border-bottom:1px solid rgba(220,38,38,0.2);">${logoBase64 ? `<img src="${logoBase64}" style="height:40px;width:auto;flex-shrink:0;margin-right:12px;" />` : ''}<div style="flex:1;"><div style="font-size:16px;font-weight:900;color:#fff;">Draft Report Card</div><div style="font-size:12px;margin-top:2px;"><span style="color:#e5e7eb;">${getLeagueName()}</span><span style="color:#6b7280;margin:0 4px;">•</span><span style="color:#facc15;font-weight:600;">${selectedSeason.value}</span></div></div></div><div style="padding:16px;background:linear-gradient(135deg,rgba(34,197,94,0.1) 0%,transparent 100%);"><div style="display:flex;align-items:center;gap:16px;"><img src="${teamLogoBase64}" style="width:56px;height:56px;border-radius:50%;border:2px solid rgba(255,255,255,0.1);" /><div style="flex:1;"><div style="font-size:18px;font-weight:bold;color:#fff;">${team.team_name}</div><div style="font-size:12px;color:#9ca3af;margin-top:2px;">${team.picks.length} picks</div></div><div style="text-align:center;"><div style="font-size:48px;font-weight:900;color:${team.grade?.startsWith('A') ? '#22c55e' : team.grade?.startsWith('B') ? '#eab308' : team.grade?.startsWith('C') ? '#f97316' : '#ef4444'};">${team.grade}</div></div></div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:16px;"><div style="text-align:center;padding:8px;background:rgba(255,255,255,0.05);border-radius:8px;"><div style="font-size:18px;font-weight:bold;color:#e5e7eb;">${team.totalScore >= 0 ? '+' : ''}${team.totalScore?.toFixed(1)}</div><div style="font-size:10px;color:#6b7280;">Total Score</div></div><div style="text-align:center;padding:8px;background:rgba(255,255,255,0.05);border-radius:8px;"><div style="font-size:18px;font-weight:bold;color:#22c55e;">${team.hits}</div><div style="font-size:10px;color:#6b7280;">Hits</div></div><div style="text-align:center;padding:8px;background:rgba(255,255,255,0.05);border-radius:8px;"><div style="font-size:18px;font-weight:bold;color:#ef4444;">${team.misses}</div><div style="font-size:10px;color:#6b7280;">Misses</div></div></div></div><div style="padding:12px 16px;">${generatePickRows()}</div><div style="padding:10px 16px;text-align:center;border-top:1px solid rgba(220,38,38,0.2);"><span style="font-size:14px;font-weight:bold;color:#facc15;">ultimatefantasydashboard.com</span></div></div>`
    document.body.appendChild(container); await new Promise(r => setTimeout(r, 300))
    const finalCanvas = await html2canvas(container, { backgroundColor: '#0a0c14', scale: 2, useCORS: true, allowTaint: true }); document.body.removeChild(container)
    const link = document.createElement('a'); link.download = `${team.team_name.replace(/\s+/g, '-')}-draft-report.png`; link.href = finalCanvas.toDataURL('image/png'); link.click()
  } finally { isDownloadingTeam.value = false }
}

// Download Steals Image
async function downloadStealsImage() {
  isDownloadingSteals.value = true
  try {
    const html2canvas = (await import('html2canvas')).default
    const steals = topSteals.value.slice(0, 10)
    if (steals.length === 0) { isDownloadingSteals.value = false; return }
    
    const loadLogo = async (): Promise<string> => { 
      try { 
        const r = await fetch('/UFD_V5.png')
        if (!r.ok) return ''
        const b = await r.blob()
        return new Promise(res => { 
          const rd = new FileReader()
          rd.onloadend = () => res(rd.result as string)
          rd.onerror = () => res('')
          rd.readAsDataURL(b) 
        }) 
      } catch { return '' } 
    }
    
    const logoBase64 = await loadLogo()
    const leader = steals[0]
    const maxValue = Math.max(...steals.map(s => s.score || 0))
    
    // Generate player headshot placeholder
    const getHeadshotHtml = (p: any, size: number = 32) => {
      if (p.headshot) {
        return `<img src="${p.headshot}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;flex-shrink:0;" crossorigin="anonymous" />`
      }
      // Fallback placeholder
      const colors = ['#0D8ABC', '#3498DB', '#9B59B6', '#E91E63', '#F39C12', '#1ABC9C', '#2ECC71', '#E74C3C']
      const colorIndex = (p.player_name || '').split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) % colors.length
      const initial = (p.player_name || 'P').charAt(0).toUpperCase()
      return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${colors[colorIndex]};display:flex;align-items:center;justify-content:center;flex-shrink:0;"><span style="color:#fff;font-weight:bold;font-size:${size * 0.45}px;">${initial}</span></div>`
    }
    
    const generateRows = () => steals.map((p, i) => { 
      const w = maxValue > 0 ? ((p.score || 0) / maxValue) * 100 : 0
      return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
        <div style="width:20px;text-align:center;font-weight:bold;font-size:12px;color:${i === 0 ? '#22c55e' : '#6b7280'};">${i + 1}</div>
        ${getHeadshotHtml(p, 32)}
        <div style="flex:1;min-width:0;">
          <div style="font-size:12px;font-weight:600;color:#e5e7eb;">${p.player_name}</div>
          <div style="font-size:10px;color:#9ca3af;margin-top:1px;">Drafted by <span style="color:#facc15;font-weight:600;">${p.team_name}</span> • R${p.round}</div>
          <div style="height:6px;background:rgba(58,61,82,0.5);border-radius:3px;overflow:hidden;margin-top:6px;">
            <div style="height:100%;width:${w}%;background:#22c55e;opacity:${i === 0 ? 1 : 0.6};border-radius:3px;"></div>
          </div>
        </div>
        <div style="width:50px;text-align:right;">
          <div style="font-size:13px;font-weight:bold;color:${i === 0 ? '#22c55e' : '#e5e7eb'};">+${p.score?.toFixed(0)}</div>
        </div>
      </div>` 
    }).join('')
    
    const container = document.createElement('div')
    container.style.cssText = 'position:absolute;left:-9999px;top:0;width:480px;font-family:system-ui,-apple-system,sans-serif;'
    container.innerHTML = `<div style="background:linear-gradient(160deg,#0f1219 0%,#0a0c14 50%,#0d1117 100%);border-radius:16px;overflow:hidden;">
      <div style="background:#facc15;padding:8px 20px;text-align:center;">
        <span style="font-size:12px;font-weight:700;color:#0a0c14;text-transform:uppercase;letter-spacing:2px;">Ultimate Fantasy Dashboard</span>
      </div>
      <div style="display:flex;align-items:center;padding:10px 16px;border-bottom:1px solid rgba(220,38,38,0.2);">
        ${logoBase64 ? `<img src="${logoBase64}" style="height:40px;width:auto;flex-shrink:0;margin-right:12px;margin-top:4px;" />` : ''}
        <div style="flex:1;">
          <div style="font-size:17px;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:0.5px;line-height:1.1;">🔥 Biggest Draft Steals</div>
          <div style="font-size:12px;margin-top:2px;"><span style="color:#e5e7eb;">${getLeagueName()}</span><span style="color:#6b7280;margin:0 4px;">•</span><span style="color:#facc15;font-weight:600;">${selectedSeason.value} Draft</span></div>
        </div>
      </div>
      <div style="padding:12px 16px;background:linear-gradient(135deg,rgba(34,197,94,0.15) 0%,transparent 100%);border-bottom:1px solid rgba(34,197,94,0.2);">
        <div style="display:flex;align-items:center;gap:12px;">
          ${getHeadshotHtml(leader, 48)}
          <div style="flex:1;">
            <div style="font-size:15px;font-weight:bold;color:#fff;">${leader.player_name}</div>
            <div style="font-size:11px;color:#9ca3af;">Drafted by <span style="color:#facc15;">${leader.team_name}</span></div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:26px;font-weight:900;color:#22c55e;">+${leader.score?.toFixed(0)}</div>
          </div>
        </div>
      </div>
      <div style="padding:12px 16px;">${generateRows()}</div>
      <div style="padding:8px 16px;background:rgba(34,197,94,0.1);border-top:1px solid rgba(34,197,94,0.2);">
        <div style="font-size:10px;color:#9ca3af;text-align:center;"><span style="color:#22c55e;font-weight:600;">Value Score</span> = Position Rank at Draft − Current Position Rank</div>
      </div>
      <div style="padding:10px 16px;text-align:center;border-top:1px solid rgba(220,38,38,0.2);">
        <span style="font-size:14px;font-weight:bold;color:#facc15;">ultimatefantasydashboard.com</span>
      </div>
    </div>`
    
    document.body.appendChild(container)
    await new Promise(r => setTimeout(r, 300))
    const finalCanvas = await html2canvas(container, { backgroundColor: '#0a0c14', scale: 2, useCORS: true, allowTaint: true })
    document.body.removeChild(container)
    const link = document.createElement('a')
    link.download = `${selectedSeason.value}-draft-steals.png`
    link.href = finalCanvas.toDataURL('image/png')
    link.click()
  } finally { isDownloadingSteals.value = false }
}

// Download Busts Image
async function downloadBustsImage() {
  isDownloadingBusts.value = true
  try {
    const html2canvas = (await import('html2canvas')).default
    const busts = topReaches.value.slice(0, 10)
    if (busts.length === 0) { isDownloadingBusts.value = false; return }
    
    const loadLogo = async (): Promise<string> => { 
      try { 
        const r = await fetch('/UFD_V5.png')
        if (!r.ok) return ''
        const b = await r.blob()
        return new Promise(res => { 
          const rd = new FileReader()
          rd.onloadend = () => res(rd.result as string)
          rd.onerror = () => res('')
          rd.readAsDataURL(b) 
        }) 
      } catch { return '' } 
    }
    
    const logoBase64 = await loadLogo()
    const leader = busts[0]
    const maxValue = Math.max(...busts.map(s => Math.abs(s.score || 0)))
    
    // Generate player headshot placeholder
    const getHeadshotHtml = (p: any, size: number = 32) => {
      if (p.headshot) {
        return `<img src="${p.headshot}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;flex-shrink:0;" crossorigin="anonymous" />`
      }
      // Fallback placeholder
      const colors = ['#0D8ABC', '#3498DB', '#9B59B6', '#E91E63', '#F39C12', '#1ABC9C', '#2ECC71', '#E74C3C']
      const colorIndex = (p.player_name || '').split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) % colors.length
      const initial = (p.player_name || 'P').charAt(0).toUpperCase()
      return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${colors[colorIndex]};display:flex;align-items:center;justify-content:center;flex-shrink:0;"><span style="color:#fff;font-weight:bold;font-size:${size * 0.45}px;">${initial}</span></div>`
    }
    
    const generateRows = () => busts.map((p, i) => { 
      const w = maxValue > 0 ? (Math.abs(p.score || 0) / maxValue) * 100 : 0
      return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
        <div style="width:20px;text-align:center;font-weight:bold;font-size:12px;color:${i === 0 ? '#ef4444' : '#6b7280'};">${i + 1}</div>
        ${getHeadshotHtml(p, 32)}
        <div style="flex:1;min-width:0;">
          <div style="font-size:12px;font-weight:600;color:#e5e7eb;">${p.player_name}</div>
          <div style="font-size:10px;color:#9ca3af;margin-top:1px;">Drafted by <span style="color:#facc15;font-weight:600;">${p.team_name}</span> • R${p.round}</div>
          <div style="height:6px;background:rgba(58,61,82,0.5);border-radius:3px;overflow:hidden;margin-top:6px;">
            <div style="height:100%;width:${w}%;background:#ef4444;opacity:${i === 0 ? 1 : 0.6};border-radius:3px;"></div>
          </div>
        </div>
        <div style="width:50px;text-align:right;">
          <div style="font-size:13px;font-weight:bold;color:${i === 0 ? '#ef4444' : '#e5e7eb'};">${p.score?.toFixed(0)}</div>
        </div>
      </div>` 
    }).join('')
    
    const container = document.createElement('div')
    container.style.cssText = 'position:absolute;left:-9999px;top:0;width:480px;font-family:system-ui,-apple-system,sans-serif;'
    container.innerHTML = `<div style="background:linear-gradient(160deg,#0f1219 0%,#0a0c14 50%,#0d1117 100%);border-radius:16px;overflow:hidden;">
      <div style="background:#facc15;padding:8px 20px;text-align:center;">
        <span style="font-size:12px;font-weight:700;color:#0a0c14;text-transform:uppercase;letter-spacing:2px;">Ultimate Fantasy Dashboard</span>
      </div>
      <div style="display:flex;align-items:center;padding:10px 16px;border-bottom:1px solid rgba(220,38,38,0.2);">
        ${logoBase64 ? `<img src="${logoBase64}" style="height:40px;width:auto;flex-shrink:0;margin-right:12px;margin-top:4px;" />` : ''}
        <div style="flex:1;">
          <div style="font-size:17px;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:0.5px;line-height:1.1;">💀 Biggest Draft Busts</div>
          <div style="font-size:12px;margin-top:2px;"><span style="color:#e5e7eb;">${getLeagueName()}</span><span style="color:#6b7280;margin:0 4px;">•</span><span style="color:#facc15;font-weight:600;">${selectedSeason.value} Draft</span></div>
        </div>
      </div>
      <div style="padding:12px 16px;background:linear-gradient(135deg,rgba(239,68,68,0.15) 0%,transparent 100%);border-bottom:1px solid rgba(239,68,68,0.2);">
        <div style="display:flex;align-items:center;gap:12px;">
          ${getHeadshotHtml(leader, 48)}
          <div style="flex:1;">
            <div style="font-size:15px;font-weight:bold;color:#fff;">${leader.player_name}</div>
            <div style="font-size:11px;color:#9ca3af;">Drafted by <span style="color:#facc15;">${leader.team_name}</span></div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:26px;font-weight:900;color:#ef4444;">${leader.score?.toFixed(0)}</div>
          </div>
        </div>
      </div>
      <div style="padding:12px 16px;">${generateRows()}</div>
      <div style="padding:8px 16px;background:rgba(239,68,68,0.1);border-top:1px solid rgba(239,68,68,0.2);">
        <div style="font-size:10px;color:#9ca3af;text-align:center;"><span style="color:#ef4444;font-weight:600;">Value Score</span> = Position Rank at Draft − Current Position Rank</div>
      </div>
      <div style="padding:10px 16px;text-align:center;border-top:1px solid rgba(220,38,38,0.2);">
        <span style="font-size:14px;font-weight:bold;color:#facc15;">ultimatefantasydashboard.com</span>
      </div>
    </div>`
    
    document.body.appendChild(container)
    await new Promise(r => setTimeout(r, 300))
    const finalCanvas = await html2canvas(container, { backgroundColor: '#0a0c14', scale: 2, useCORS: true, allowTaint: true })
    document.body.removeChild(container)
    const link = document.createElement('a')
    link.download = `${selectedSeason.value}-draft-busts.png`
    link.href = finalCanvas.toDataURL('image/png')
    link.click()
  } finally { isDownloadingBusts.value = false }
}

// Load draft data
async function loadDraftData() {
  const leagueKey = effectiveLeagueKey.value
  if (!leagueKey || !authStore.user?.id) return
  
  isLoading.value = true
  loadingProgress.value = { currentStep: 'Initializing...', detail: '' }
  
  try {
    // Handle ESPN leagues
    if (isEspn.value) {
      console.log('[ESPN DRAFT] Loading draft for ESPN league:', leagueKey)
      loadingProgress.value = { currentStep: 'Loading ESPN service...', detail: '' }
      
      // Dynamically import ESPN service
      const { espnService } = await import('@/services/espn')
      
      // Parse league key: espn_baseball_1227422768_2025
      const parts = leagueKey.split('_')
      const sport = parts[1] as 'football' | 'baseball' | 'basketball' | 'hockey'
      const espnLeagueId = parts[2]
      const currentSeason = parseInt(parts[3])
      const season = parseInt(selectedSeason.value) || currentSeason
      
      console.log('[ESPN DRAFT] Fetching draft for:', { sport, espnLeagueId, season })
      loadingProgress.value = { currentStep: 'Fetching draft picks...', detail: `${season} Season` }
      
      // Get draft picks with player info pre-resolved
      const espnDraftPicks = await espnService.getDraftWithPlayers(sport, espnLeagueId, season)
      console.log('[ESPN DRAFT] Got', espnDraftPicks.length, 'draft picks with player info')
      
      if (!espnDraftPicks || espnDraftPicks.length === 0) {
        console.log('[ESPN DRAFT] No draft data available')
        draftPicks.value = []
        isLoading.value = false
        return
      }
      
      // Debug first few picks
      console.log('[ESPN DRAFT] Sample picks:', espnDraftPicks.slice(0, 5).map(p => ({
        pick: p.overallPickNumber,
        name: p.playerName,
        position: p.position,
        playerId: p.playerId
      })))
      
      loadingProgress.value = { currentStep: 'Loading team data...', detail: `${espnDraftPicks.length} picks found` }
      
      // Get teams for mapping
      const teams = await espnService.getTeams(sport, espnLeagueId, season)
      teamsData.value = teams
      console.log('[ESPN DRAFT] Got', teams.length, 'teams')
      
      // Build team lookup
      const teamMap = new Map<number, any>()
      for (const team of teams) {
        teamMap.set(team.id, team)
      }
      
      loadingProgress.value = { currentStep: 'Fetching player stats...', detail: 'Calculating season totals' }
      
      // Get teams with rosters for player season points
      let playerSeasonPoints = new Map<number, number>()
      try {
        // Get all matchups to calculate total points per player
        const teamsWithRosters = await espnService.getTeamsWithRosters(sport, espnLeagueId, season)
        for (const team of teamsWithRosters) {
          if (team.roster) {
            for (const player of team.roster) {
              // actualPoints contains season total in some cases
              if (player.actualPoints && player.actualPoints > 0) {
                playerSeasonPoints.set(player.playerId, player.actualPoints)
              }
            }
          }
        }
        console.log('[ESPN DRAFT] Got season points for', playerSeasonPoints.size, 'players from rosters')
      } catch (e) {
        console.log('[ESPN DRAFT] Could not get player season points:', e)
      }
      
      loadingProgress.value = { currentStep: 'Calculating draft grades...', detail: '' }
      
      // Get matchups to calculate total points per team
      const teamTotalPoints = new Map<number, number>()
      for (const team of teams) {
        const pointsFor = team.pointsFor || 0
        teamTotalPoints.set(team.id, pointsFor)
      }
      
      const numTeams = teams.length || 12
      
      // Calculate team performance ranks (by total points)
      const teamRanks = [...teams]
        .sort((a, b) => (teamTotalPoints.get(b.id) || 0) - (teamTotalPoints.get(a.id) || 0))
        .map((team, idx) => ({ teamId: team.id, rank: idx + 1 }))
      
      const teamRankMap = new Map(teamRanks.map(t => [t.teamId, t.rank]))
      
      // Group picks by team
      const picksByTeam = new Map<number, any[]>()
      for (const pick of espnDraftPicks) {
        if (!picksByTeam.has(pick.teamId)) {
          picksByTeam.set(pick.teamId, [])
        }
        picksByTeam.get(pick.teamId)!.push(pick)
      }
      
      // ========== POSITION RANK TRACKING ==========
      // Calculate position_rank_drafted - the order each position was drafted
      const positionDraftOrder = new Map<string, number[]>() // position -> array of playerIds in draft order
      
      // Build draft order by position (picks are in draft order by overallPickNumber)
      const sortedPicks = [...espnDraftPicks].sort((a, b) => a.overallPickNumber - b.overallPickNumber)
      for (const pick of sortedPicks) {
        const position = pick.position || 'Unknown'
        if (!positionDraftOrder.has(position)) {
          positionDraftOrder.set(position, [])
        }
        positionDraftOrder.get(position)!.push(pick.playerId)
      }
      
      // Build a map of playerId -> position_rank_drafted
      const positionRankDraftedMap = new Map<number, number>()
      for (const [position, playerIds] of positionDraftOrder) {
        playerIds.forEach((playerId, index) => {
          positionRankDraftedMap.set(playerId, index + 1)
        })
      }
      
      console.log('[ESPN DRAFT] Position draft order:', 
        [...positionDraftOrder.entries()].map(([pos, ids]) => `${pos}: ${ids.length}`).join(', ')
      )
      
      // ========== CURRENT POSITION RANK (based on points) ==========
      // Group players by position and sort by season points to get current rank
      const currentPositionRankMap = new Map<number, number>()
      
      // First, collect points for all drafted players
      const playerPointsData: { playerId: number; position: string; points: number }[] = []
      for (const pick of espnDraftPicks) {
        const points = playerSeasonPoints.get(pick.playerId) || 0
        playerPointsData.push({
          playerId: pick.playerId,
          position: pick.position || 'Unknown',
          points
        })
      }
      
      // Group by position and sort by points
      const positionGroups = new Map<string, typeof playerPointsData>()
      for (const data of playerPointsData) {
        if (!positionGroups.has(data.position)) {
          positionGroups.set(data.position, [])
        }
        positionGroups.get(data.position)!.push(data)
      }
      
      // Calculate current rank within each position
      for (const [position, players] of positionGroups) {
        const sortedByPoints = [...players].sort((a, b) => b.points - a.points)
        sortedByPoints.forEach((player, index) => {
          currentPositionRankMap.set(player.playerId, index + 1)
        })
      }
      
      console.log('[ESPN DRAFT] Current position ranks calculated for', currentPositionRankMap.size, 'players')
      
      // Get sport for position scarcity (use existing sport variable from earlier)
      const espnSport = parts[1] as string
      
      // Process draft picks with premium tier-based grading
      draftPicks.value = sortedPicks.map((pick: any) => {
        const team = teamMap.get(pick.teamId)
        const teamRank = teamRankMap.get(pick.teamId) || numTeams
        const teamPoints = teamTotalPoints.get(pick.teamId) || 0
        
        const round = pick.roundId
        const pickInRound = pick.roundPickNumber
        
        const position = pick.position || 'Unknown'
        const position_rank_drafted = positionRankDraftedMap.get(pick.playerId) || 0
        const current_position_rank = currentPositionRankMap.get(pick.playerId) || 999
        
        // Player points from roster data
        const playerPoints = playerSeasonPoints.get(pick.playerId) || 0
        
        // Use premium tier-based grading system
        const pickResult = calculatePickScore(
          pick.overallPickNumber,
          round,
          position_rank_drafted || round, // If no position rank, use round as proxy
          current_position_rank,
          position,
          numTeams,
          espnDraftPicks.length,
          espnSport
        )
        
        // Get eligible positions from ESPN API (or fallback to position-based list)
        const eligiblePositions = pick.eligiblePositions && pick.eligiblePositions.length > 1 
          ? pick.eligiblePositions 
          : [position]
        
        return {
          pick: pick.overallPickNumber,
          round,
          pickInRound,
          team_key: `espn_team_${pick.teamId}`,
          team_name: team?.name || `Team ${pick.teamId}`,
          team_logo: team?.logo || '',
          player_key: `espn_player_${pick.playerId}`,
          player_name: pick.playerName || `Player ${pick.playerId}`,
          position,
          eligiblePositions,
          activePosition: position, // Track currently selected position
          position_rank_drafted,
          current_position_rank,
          mlb_team: pick.proTeam || '',
          headshot: `https://a.espncdn.com/combiner/i?img=/i/headshots/mlb/players/full/${pick.playerId}.png&w=96&h=70&cb=1`,
          totalPoints: playerPoints,
          score: pickResult.totalScore,
          grade: scoreToGrade(pickResult.totalScore),
          verdict: pickResult.verdict,
          tierMovement: pickResult.tierMovement,
          draftedTier: pickResult.draftedTier,
          finishedTier: pickResult.finishedTier,
          keeper: pick.keeper,
          bidAmount: pick.bidAmount
        }
      })
      
      // Log summary
      const unresolvedCount = draftPicks.value.filter(p => p.player_name.startsWith('Player ')).length
      const unknownPosCount = draftPicks.value.filter(p => p.position === 'Unknown').length
      console.log('[ESPN DRAFT] Processed', draftPicks.value.length, 'picks. Unresolved names:', unresolvedCount, 'Unknown positions:', unknownPosCount)
      
      isLoading.value = false
      return
    }
    
    // Handle Sleeper leagues
    if (isSleeper.value) {
      console.log('[SLEEPER DRAFT] Loading draft for Sleeper league:', leagueKey)
      loadingProgress.value = { currentStep: 'Loading Sleeper service...', detail: '' }
      
      // Import services
      const { sleeperService } = await import('@/services/sleeper')
      const { draftAnalysisService } = await import('@/services/draftAnalysis')
      
      // Find the season info from historical seasons
      const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === selectedSeason.value)
      if (!seasonInfo) {
        console.log('[SLEEPER DRAFT] No season info found for:', selectedSeason.value)
        draftPicks.value = []
        isLoading.value = false
        return
      }
      
      loadingProgress.value = { currentStep: 'Fetching draft picks...', detail: `${selectedSeason.value} Season` }
      
      // Load draft if not already loaded
      if (!leagueStore.historicalDrafts.has(selectedSeason.value)) {
        console.log('[SLEEPER DRAFT] Loading draft from store for season:', selectedSeason.value)
        await leagueStore.loadHistoricalDraft(seasonInfo.league_id, selectedSeason.value)
      }
      
      loadingProgress.value = { currentStep: 'Loading matchup data...', detail: '' }
      
      // Load matchups if not already loaded
      if (!leagueStore.historicalMatchups.has(selectedSeason.value)) {
        await leagueStore.loadHistoricalMatchups(seasonInfo.league_id, selectedSeason.value)
      }
      
      const draft = leagueStore.historicalDrafts.get(selectedSeason.value)
      if (!draft || !draft.picks || draft.picks.length === 0) {
        console.log('[SLEEPER DRAFT] No draft picks found')
        draftPicks.value = []
        isLoading.value = false
        return
      }
      
      console.log('[SLEEPER DRAFT] Got', draft.picks.length, 'draft picks')
      loadingProgress.value = { currentStep: 'Calculating draft grades...', detail: `${draft.picks.length} picks found` }
      
      const rosters = leagueStore.historicalRosters.get(selectedSeason.value) || []
      const users = leagueStore.historicalUsers.get(selectedSeason.value) || []
      const matchups = leagueStore.historicalMatchups.get(selectedSeason.value)
      
      // Build player positions map from draft picks
      const playerPositions = new Map<string, string>()
      draft.picks.forEach((pick: any) => {
        const pos = pick.metadata?.position
        if (pos && pick.player_id) {
          playerPositions.set(pick.player_id, pos)
        }
      })
      
      // Calculate player stats
      const playoffStart = seasonInfo.settings?.playoff_week_start || 15
      const playerStats = matchups ? draftAnalysisService.calculatePlayerSeasonStats(matchups, playoffStart - 1, playerPositions) : new Map()
      
      // Build position draft order for calculating position rank at draft
      const positionDraftOrder: Record<string, string[]> = {}
      draft.picks.forEach((pick: any) => {
        const pos = pick.metadata?.position
        if (pos && pick.player_id) {
          if (!positionDraftOrder[pos]) positionDraftOrder[pos] = []
          positionDraftOrder[pos].push(pick.player_id)
        }
      })
      
      // Build team lookup
      const teamLookup = new Map<number, { name: string, avatar: string }>()
      rosters.forEach((roster: any) => {
        const user = users.find((u: any) => u.user_id === roster.owner_id)
        const teamName = sleeperService.getTeamName(roster, user)
        const avatar = sleeperService.getAvatarUrl(roster, user, seasonInfo)
        teamLookup.set(roster.roster_id, { name: teamName, avatar })
      })
      
      // Store teams data for the view
      teamsData.value = rosters.map((r: any) => {
        const info = teamLookup.get(r.roster_id)
        return {
          team_key: String(r.roster_id),
          team_name: info?.name || `Team ${r.roster_id}`,
          logo: info?.avatar || ''
        }
      })
      
      const numTeams = rosters.length || 12
      
      // Determine sport for Sleeper (usually football)
      const sleeperSport = leagueStore.currentLeague?.sport || 'football'
      
      // Process picks with premium tier-based grading
      const processedPicks = draft.picks.map((pick: any) => {
        const position = pick.metadata?.position || 'Unknown'
        const playerName = pick.metadata?.first_name && pick.metadata?.last_name
          ? `${pick.metadata.first_name} ${pick.metadata.last_name}`
          : `Player ${pick.player_id}`
        
        // Get drafted position rank
        const draftedRank = (positionDraftOrder[position]?.indexOf(pick.player_id) ?? -1) + 1
        
        // Get current position rank from stats
        const stats = playerStats.get(pick.player_id)
        let currentRank = 999
        let totalPoints = 0
        if (stats) {
          totalPoints = stats.totalPoints || 0
          const samePositionPlayers = Array.from(playerStats.entries())
            .filter(([, s]) => s.position === position)
            .sort((a, b) => b[1].totalPoints - a[1].totalPoints)
          currentRank = samePositionPlayers.findIndex(([id]) => id === pick.player_id) + 1
          if (currentRank === 0) currentRank = 999
        }
        
        // Use premium tier-based grading system
        const pickResult = calculatePickScore(
          pick.pick_no || pick.draft_slot,
          pick.round,
          draftedRank || pick.round, // Use round as fallback
          currentRank,
          position,
          numTeams,
          draft.picks.length,
          sleeperSport
        )
        
        const teamInfo = teamLookup.get(pick.roster_id)
        
        // Get eligible positions for multi-position support
        const eligiblePositions = getEligiblePositions(position, sleeperSport)
        
        return {
          player_key: pick.player_id,
          player_name: playerName,
          position,
          eligiblePositions,
          activePosition: position,
          round: pick.round,
          pick: pick.pick_no || pick.draft_slot,
          pickInRound: ((pick.pick_no || pick.draft_slot) - 1) % numTeams + 1,
          team_key: String(pick.roster_id),
          team_name: teamInfo?.name || `Team ${pick.roster_id}`,
          team_logo: teamInfo?.avatar || '',
          headshot: pick.metadata?.headshot_url || `https://sleepercdn.com/content/nfl/players/thumb/${pick.player_id}.jpg`,
          position_rank_drafted: draftedRank,
          current_position_rank: currentRank,
          totalPoints: totalPoints,
          score: pickResult.totalScore,
          grade: scoreToGrade(pickResult.totalScore),
          verdict: pickResult.verdict,
          tierMovement: pickResult.tierMovement,
          draftedTier: pickResult.draftedTier,
          finishedTier: pickResult.finishedTier
        }
      })
      
      draftPicks.value = processedPicks
      console.log('[SLEEPER DRAFT] Processed', processedPicks.length, 'picks')
      
      isLoading.value = false
      return
    }
    
    // Yahoo league handling (existing code)
    loadingProgress.value = { currentStep: 'Loading Yahoo service...', detail: '' }
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
    loadingProgress.value = { currentStep: 'Fetching draft results...', detail: seasonLeagueKey }
    
    // Get draft results
    let draftResults = await yahooService.getDraftResults(seasonLeagueKey)
    console.log('[POINTS DRAFT] Draft results type:', draftResults.type, 'picks:', draftResults.picks?.length)
    
    // Check if draft has player data (draft_status might be "predraft" or picks might not have player_keys)
    let playerKeys = draftResults.picks?.map((p: any) => p.player_key).filter(Boolean) || []
    console.log('[POINTS DRAFT] Player keys found:', playerKeys.length, 'from', draftResults.picks?.length, 'picks')
    
    // If no player keys (draft hasn't happened), try to fall back to previous season
    if (playerKeys.length === 0 && draftResults.picks?.length > 0) {
      console.log('[POINTS DRAFT] Draft has picks but no player keys (predraft). Checking for previous season...')
      loadingProgress.value = { currentStep: 'Checking previous season...', detail: 'Draft not yet complete' }
      
      // Use renew field from draft results (already contains previous season info)
      const renewedFrom = draftResults.renew // Format: "431_136233" (previous year's game_leaguenum)
      console.log('[POINTS DRAFT] Renew field from draft results:', renewedFrom)
      
      if (renewedFrom) {
        const [prevGameKey, prevLeagueNum] = renewedFrom.split('_')
        const prevLeagueKey = `${prevGameKey}.l.${prevLeagueNum}`
        console.log('[POINTS DRAFT] Found previous season:', prevLeagueKey, '- loading that draft instead')
        loadingProgress.value = { currentStep: 'Loading previous season draft...', detail: prevLeagueKey }
        
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
    loadingProgress.value = { currentStep: 'Fetching player details...', detail: `${finalPlayerKeys.length} players` }
    const players = await yahooService.getPlayers(finalPlayerKeys, seasonLeagueKey)
    playerData.value = players
    console.log('[POINTS DRAFT] Got player details:', players.size)
    
    // Debug: Check if headshots are present
    let headshotCount = 0
    for (const [key, player] of players) {
      if (player.headshot) headshotCount++
    }
    console.log('[POINTS DRAFT] Players with headshots:', headshotCount, 'of', players.size)
    
    // Get player stats
    loadingProgress.value = { currentStep: 'Fetching player stats...', detail: 'Calculating season totals' }
    const stats = await yahooService.getPlayerStats(seasonLeagueKey, finalPlayerKeys)
    playerStats.value = stats
    console.log('Got player stats:', stats.size)
    
    loadingProgress.value = { currentStep: 'Calculating draft grades...', detail: '' }
    
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
    const pickPointsData: { pick: number, points: number, playerKey: string, position: string }[] = []
    for (const pick of draftResults.picks) {
      const stat = stats.get(pick.player_key)
      const player = players.get(pick.player_key) || {}
      pickPointsData.push({
        pick: pick.pick,
        points: stat?.total_points || 0,
        playerKey: pick.player_key,
        position: player.position || 'Unknown'
      })
    }
    
    // Sort by points descending to get actual rank
    const sortedByPoints = [...pickPointsData].sort((a, b) => b.points - a.points)
    const actualRankMap = new Map<string, number>()
    sortedByPoints.forEach((p, idx) => {
      actualRankMap.set(p.playerKey, idx + 1)
    })
    
    // ========== POSITION RANK TRACKING FOR YAHOO ==========
    // Calculate position_rank_drafted - the order each position was drafted
    const yahooPositionDraftOrder = new Map<string, string[]>() // position -> array of playerKeys in draft order
    
    // Build draft order by position (picks are already in draft order)
    for (const pick of draftResults.picks) {
      const player = players.get(pick.player_key) || {}
      const position = player.position || 'Unknown'
      
      if (!yahooPositionDraftOrder.has(position)) {
        yahooPositionDraftOrder.set(position, [])
      }
      yahooPositionDraftOrder.get(position)!.push(pick.player_key)
    }
    
    // Build a map of playerKey -> position_rank_drafted
    const yahooPositionRankDraftedMap = new Map<string, number>()
    for (const [position, playerKeys] of yahooPositionDraftOrder) {
      playerKeys.forEach((playerKey, index) => {
        yahooPositionRankDraftedMap.set(playerKey, index + 1)
      })
    }
    
    // Calculate current position ranks based on points within each position
    const currentPositionRankMap = new Map<string, number>()
    for (const [position, playerKeys] of yahooPositionDraftOrder) {
      // Sort players of this position by their total points
      const positionPlayers = playerKeys.map(pk => ({
        playerKey: pk,
        points: pickPointsData.find(p => p.playerKey === pk)?.points || 0
      })).sort((a, b) => b.points - a.points)
      
      positionPlayers.forEach((player, index) => {
        currentPositionRankMap.set(player.playerKey, index + 1)
      })
    }
    
    console.log('Top 5 players by points:', sortedByPoints.slice(0, 5))
    console.log('[YAHOO DRAFT] Position draft order calculated:', 
      [...yahooPositionDraftOrder.entries()].map(([pos, keys]) => `${pos}: ${keys.length} players`).join(', ')
    )
    
    // Process draft picks with player info and premium tier-based grading
    const numTeams = standings.length || 12
    
    // Determine Yahoo sport (usually football or baseball based on league)
    const yahooSport = leagueStore.currentLeague?.sport || 'football'
    
    draftPicks.value = draftResults.picks.map((pick: any) => {
      const player = players.get(pick.player_key) || {}
      const stat = stats.get(pick.player_key) || {}
      const team = teamLookup.get(pick.team_key) || {}
      
      const pickInRound = ((pick.pick - 1) % numTeams) + 1
      const totalPoints = stat.total_points || 0
      
      // Get position ranks
      const position_rank_drafted = yahooPositionRankDraftedMap.get(pick.player_key) || 0
      const current_position_rank = currentPositionRankMap.get(pick.player_key) || 999
      const position = player.position || 'Unknown'
      
      // Use premium tier-based grading system
      const pickResult = calculatePickScore(
        pick.pick,
        pick.round,
        position_rank_drafted || pick.round, // Use round as fallback
        current_position_rank,
        position,
        numTeams,
        draftResults.picks.length,
        yahooSport
      )
      
      // Get eligible positions for multi-position support
      const eligiblePositions = getEligiblePositions(position, yahooSport)
      
      return {
        pick: pick.pick,
        round: pick.round,
        pickInRound,
        team_key: pick.team_key,
        team_name: team.name || 'Unknown Team',
        team_logo: team.logo_url || '',
        player_key: pick.player_key,
        player_name: player.name || 'Unknown Player',
        position,
        eligiblePositions,
        activePosition: position,
        position_rank_drafted,
        current_position_rank,
        mlb_team: player.team || '',
        headshot: player.headshot || '',
        totalPoints,
        score: pickResult.totalScore,
        grade: scoreToGrade(pickResult.totalScore),
        verdict: pickResult.verdict,
        tierMovement: pickResult.tierMovement,
        draftedTier: pickResult.draftedTier,
        finishedTier: pickResult.finishedTier
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

// Watch for historical seasons loading (for Sleeper)
watch(() => leagueStore.historicalSeasons.length, (newLen) => {
  if (isSleeper.value && newLen > 0 && !selectedSeason.value) {
    const seasons = leagueStore.historicalSeasons.map(s => s.season).sort((a, b) => b.localeCompare(a))
    selectedSeason.value = seasons[0] || '2024'
    loadDraftData()
  }
})

// Watch for currentLeague changes (happens when fallback to previous season occurs)
watch(() => leagueStore.currentLeague?.league_id, (newKey, oldKey) => {
  if (newKey && newKey !== oldKey) {
    console.log(`Draft: League changed from ${oldKey} to ${newKey}, reloading...`)
    loadDraftData()
  }
})

onMounted(() => {
  // For Sleeper, set selected season from historical seasons
  if (isSleeper.value && leagueStore.historicalSeasons.length > 0) {
    const seasons = leagueStore.historicalSeasons.map(s => s.season).sort((a, b) => b.localeCompare(a))
    selectedSeason.value = seasons[0] || '2024'
  }
  
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
