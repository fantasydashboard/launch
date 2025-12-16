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
        <select v-model="selectedSeason" @change="onSeasonChange" class="select">
          <option v-for="season in leagueStore.historicalSeasons" :key="season.season" :value="season.season">
            {{ season.season }} Season
          </option>
        </select>
        <select v-model="selectedWeek" class="select">
          <option value="final">Final Results</option>
          <option v-for="week in availableWeeks" :key="week" :value="week">
            Through Week {{ week }}
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
        <p class="text-dark-textMuted">Loading draft data...</p>
      </div>
    </div>

    <!-- ==================== DRAFT BOARD TAB ==================== -->
    <template v-else-if="activeTab === 'board' && draftBoard.length > 0">
      <!-- Controls Card -->
      <div class="card">
        <div class="card-body py-3">
          <div class="flex items-center justify-between flex-wrap gap-4">
            <div class="flex items-center gap-4">
              <div class="flex items-center gap-2">
                <label class="text-sm text-dark-textMuted">Position:</label>
                <select v-model="positionFilter" class="select text-sm py-1.5">
                  <option value="All">All Positions</option>
                  <option value="QB">QB</option>
                  <option value="RB">RB</option>
                  <option value="WR">WR</option>
                  <option value="TE">TE</option>
                </select>
              </div>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" v-model="showTradesOnly" class="rounded border-dark-border bg-dark-card text-primary focus:ring-primary" />
                <span class="text-sm text-dark-textMuted">Traded picks only</span>
              </label>
            </div>
            <div class="text-sm text-dark-textMuted">
              {{ totalPicks }} total picks
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
                <div class="w-4 h-4 rounded bg-green-500/30 border-l-2 border-green-500"></div>
                <span class="text-dark-textMuted">Value Pick (+8 or better)</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-4 h-4 rounded bg-red-500/20 border-l-2 border-red-500"></div>
                <span class="text-dark-textMuted">Reach (-8 or worse)</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-4 h-4 rounded bg-blue-500/20 border-l-2 border-blue-500"></div>
                <span class="text-dark-textMuted">Traded Pick</span>
              </div>
            </div>
            <div class="text-sm text-dark-textMuted">
              Score weighted by finish tier • Click any player for details
            </div>
          </div>
        </div>
      </div>

      <!-- Draft Board Grid - Full Page Scroll -->
      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <div class="inline-flex gap-3 p-4 min-w-full">
            <!-- Team Columns -->
            <div v-for="team in draftBoard" :key="team.roster_id" class="flex-shrink-0 w-48">
              <!-- Team Header (Sticky) -->
              <div class="bg-dark-card rounded-t-xl p-3 border-b border-dark-border sticky top-0 z-10">
                <div class="flex items-center gap-2 mb-2">
                  <div class="w-8 h-8 rounded-full bg-dark-border overflow-hidden flex-shrink-0">
                    <img :src="team.avatar" :alt="team.team_name" class="w-full h-full object-cover" @error="handleImageError" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="font-semibold text-dark-text text-sm truncate">{{ team.team_name }}</div>
                    <div class="text-xs text-dark-textMuted">Pick {{ team.draft_position }}</div>
                  </div>
                </div>
                <div class="text-center">
                  <span class="text-lg font-bold" :class="team.total_score >= 0 ? 'text-green-400' : 'text-red-400'">
                    {{ team.total_score >= 0 ? '+' : '' }}{{ team.total_score.toFixed(1) }}
                  </span>
                  <span class="text-xs text-dark-textMuted ml-1">total</span>
                </div>
              </div>
              
              <!-- Team Picks -->
              <div class="bg-dark-card/50 rounded-b-xl p-2 space-y-1.5">
                <template v-for="pick in team.picks" :key="pick.pick_id">
                  <div 
                    v-if="shouldShowPick(pick)"
                    :class="getPickClass(pick)"
                    class="p-2 rounded-lg transition-all cursor-pointer hover:ring-2 hover:ring-primary/50"
                    @click="openPlayerModal(pick, team.team_name)"
                  >
                    <div class="flex items-center justify-between gap-1 mb-1">
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-1">
                          <span class="font-semibold text-dark-text text-xs truncate">{{ pick.player_name }}</span>
                          <span v-if="pick.is_traded" class="text-blue-400 text-[10px]" title="Traded pick">🔄</span>
                        </div>
                        <div class="text-[10px] text-dark-textMuted flex items-center gap-1">
                          <span class="px-1 py-0.5 rounded text-[9px] font-bold" :class="getPositionClass(pick.position)">
                            {{ pick.position }}
                          </span>
                          <span>{{ pick.pick_label }}</span>
                        </div>
                      </div>
                      <div class="text-right flex-shrink-0">
                        <div class="text-sm font-bold" :class="getScoreClass(pick.score)">
                          {{ pick.score >= 0 ? '+' : '' }}{{ pick.score.toFixed(1) }}
                        </div>
                      </div>
                    </div>
                    
                    <!-- Rank change indicator -->
                    <div class="text-[9px] text-dark-textMuted text-right">
                      {{ pick.position }}{{ pick.position_rank_drafted }} → {{ pick.current_position_rank < 900 ? pick.position + pick.current_position_rank : 'N/A' }}
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ==================== PLAYER GRADES TAB ==================== -->
    <template v-else-if="activeTab === 'grades'">
      <div class="card">
        <div class="card-header">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-2xl">🎯</span>
              <h2 class="card-title">Player Grades</h2>
            </div>
            <div class="flex items-center gap-3">
              <select v-model="selectedGradeTeam" class="select text-sm">
                <option value="">All Teams</option>
                <option v-for="team in draftBoard" :key="team.roster_id" :value="team.roster_id">
                  {{ team.team_name }}
                </option>
              </select>
              <div class="flex gap-1">
                <button 
                  v-for="opt in gradeSortOptions" 
                  :key="opt.id"
                  @click="gradeSort = opt.id"
                  :class="gradeSort === opt.id ? 'bg-primary text-gray-900' : 'bg-dark-border text-dark-textMuted'"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="card-body p-0">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-dark-border/30">
                <tr>
                  <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-20">Grade</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase tracking-wider">Player</th>
                  <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-16">Pos</th>
                  <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-20">Pick</th>
                  <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-24">Drafted</th>
                  <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-24">Finished</th>
                  <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-20">Score</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-dark-border/30">
                <tr 
                  v-for="grade in filteredPlayerGrades" 
                  :key="grade.pick_id"
                  :class="getGradeRowClass(grade)"
                  class="hover:bg-dark-border/20 transition-colors cursor-pointer"
                  @click="openPlayerModal(grade, grade.team_name)"
                >
                  <td class="px-4 py-3">
                    <span class="text-3xl font-black" :class="getGradeClass(grade.grade)">
                      {{ grade.grade }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-full bg-dark-border overflow-hidden flex-shrink-0 ring-2" :class="getGradeRingClass(grade.grade)">
                        <img :src="getPlayerImageUrl(grade.player_id)" :alt="grade.player_name" class="w-full h-full object-cover" @error="handleImageError" />
                      </div>
                      <div>
                        <div class="font-semibold text-dark-text">{{ grade.player_name }}</div>
                        <div class="text-xs text-dark-textMuted">{{ grade.team_name }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span class="px-2 py-1 rounded text-xs font-bold" :class="getPositionClass(grade.position)">
                      {{ grade.position }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span class="font-medium text-dark-text">{{ grade.pick_label }}</span>
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span class="font-medium text-dark-textMuted">{{ grade.position }}{{ grade.position_rank_drafted }}</span>
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span class="font-bold" :class="grade.score >= 0 ? 'text-green-400' : 'text-red-400'">
                      {{ grade.current_position_rank < 900 ? grade.position + grade.current_position_rank : 'N/A' }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span class="text-xl font-black" :class="getScoreClass(grade.score)">
                      {{ grade.score >= 0 ? '+' : '' }}{{ grade.score.toFixed(1) }}
                    </span>
                  </td>
                </tr>
                <tr v-if="filteredPlayerGrades.length === 0">
                  <td colspan="7" class="px-4 py-8 text-center text-dark-textMuted">
                    No player grades available
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- ==================== DEEP ANALYSIS TAB ==================== -->
    <template v-else-if="activeTab === 'analysis'">
      <!-- Round by Round Analysis -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">📊</span>
            <h2 class="card-title">Best & Worst Picks by Round</h2>
          </div>
        </div>
        <div class="card-body p-0">
          <div class="divide-y divide-dark-border/30">
            <div v-for="round in roundAnalyses" :key="round.round" class="p-4">
              <div class="flex items-center justify-between mb-3">
                <h3 class="font-bold text-dark-text">Round {{ round.round }}</h3>
                <span class="text-sm px-2 py-1 rounded-full" :class="round.avgValue >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'">
                  Avg: {{ round.avgValue >= 0 ? '+' : '' }}{{ round.avgValue.toFixed(1) }}
                </span>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <!-- Best Pick -->
                <div v-if="round.bestPick" class="bg-green-500/10 rounded-lg p-3 border border-green-500/30">
                  <div class="text-xs text-green-400 font-medium mb-2">🏆 Best Pick</div>
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-dark-border overflow-hidden ring-2 ring-green-500/50">
                      <img :src="getPlayerImageUrl(round.bestPick.player_id)" class="w-full h-full object-cover" @error="handleImageError" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="font-semibold text-dark-text text-sm truncate">{{ round.bestPick.player_name }}</div>
                      <div class="text-xs text-dark-textMuted">{{ round.bestPick.team_name }}</div>
                    </div>
                    <div class="text-right">
                      <div class="text-lg font-bold text-green-400">+{{ round.bestPick.adjustedScore.toFixed(1) }}</div>
                      <div class="text-xs text-dark-textMuted">{{ round.bestPick.position }}{{ round.bestPick.positionExpectedRank }} → {{ round.bestPick.positionRank }}</div>
                    </div>
                  </div>
                </div>
                <!-- Worst Pick -->
                <div v-if="round.worstPick" class="bg-red-500/10 rounded-lg p-3 border border-red-500/30">
                  <div class="text-xs text-red-400 font-medium mb-2">💀 Worst Pick</div>
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-dark-border overflow-hidden ring-2 ring-red-500/50">
                      <img :src="getPlayerImageUrl(round.worstPick.player_id)" class="w-full h-full object-cover" @error="handleImageError" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="font-semibold text-dark-text text-sm truncate">{{ round.worstPick.player_name }}</div>
                      <div class="text-xs text-dark-textMuted">{{ round.worstPick.team_name }}</div>
                    </div>
                    <div class="text-right">
                      <div class="text-lg font-bold text-red-400">{{ round.worstPick.adjustedScore.toFixed(1) }}</div>
                      <div class="text-xs text-dark-textMuted">{{ round.worstPick.position }}{{ round.worstPick.positionExpectedRank }} → {{ round.worstPick.positionRank < 900 ? round.worstPick.positionRank : 'N/A' }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Team Draft Grade Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div v-for="team in teamDraftGrades" :key="team.roster_id" class="card">
          <div class="card-header pb-2">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-full bg-dark-border overflow-hidden ring-2" :class="getGradeRingClass(team.overallGrade)">
                  <img :src="getTeamAvatar(team.roster_id)" class="w-full h-full object-cover" @error="handleImageError" />
                </div>
                <div>
                  <h3 class="font-bold text-dark-text">{{ team.team_name }}</h3>
                  <div class="text-xs text-dark-textMuted">
                    Total: <span :class="team.totalAdjustedScore >= 0 ? 'text-green-400' : 'text-red-400'">
                      {{ team.totalAdjustedScore >= 0 ? '+' : '' }}{{ team.totalAdjustedScore.toFixed(1) }}
                    </span>
                  </div>
                </div>
              </div>
              <div class="text-5xl font-black" :class="getGradeClass(team.overallGrade)">
                {{ team.overallGrade }}
              </div>
            </div>
          </div>
          <div class="card-body pt-2">
            <!-- Player Grid -->
            <div class="grid grid-cols-4 gap-1.5">
              <div 
                v-for="pick in getTeamPicks(team.roster_id).slice(0, 12)" 
                :key="pick.player_id"
                class="text-center cursor-pointer hover:scale-105 transition-transform"
                @click="openPlayerModal(pick, team.team_name)"
                :title="`${pick.player_name}: ${pick.score >= 0 ? '+' : ''}${pick.score.toFixed(1)}`"
              >
                <div class="w-10 h-10 mx-auto rounded-full bg-dark-border overflow-hidden ring-2" :class="getScoreRingClass(pick.score)">
                  <img :src="getPlayerImageUrl(pick.player_id)" class="w-full h-full object-cover" @error="handleImageError" />
                </div>
                <div class="text-[9px] text-dark-textMuted mt-0.5 truncate">{{ pick.player_name.split(' ').pop() }}</div>
              </div>
            </div>
            <!-- Stats Row -->
            <div class="flex justify-between mt-3 pt-3 border-t border-dark-border/30 text-xs">
              <div class="text-center">
                <div class="text-green-400 font-bold">{{ team.steals?.length || 0 }}</div>
                <div class="text-dark-textMuted">Steals</div>
              </div>
              <div class="text-center">
                <div class="text-blue-400 font-bold">{{ team.hits?.length || 0 }}</div>
                <div class="text-dark-textMuted">Hits</div>
              </div>
              <div class="text-center">
                <div class="text-red-400 font-bold">{{ team.busts?.length || 0 }}</div>
                <div class="text-dark-textMuted">Busts</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ==================== ACTUAL VALUE TAB ==================== -->
    <template v-else-if="activeTab === 'actual'">
      <div v-if="isLoadingTransactions" class="flex items-center justify-center py-20">
        <div class="text-center">
          <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
          <p class="text-dark-textMuted">Loading transaction data...</p>
        </div>
      </div>
      
      <template v-else>
        <!-- True Draft Grades Overview -->
        <div class="card mb-6">
          <div class="card-header">
            <div class="flex items-center gap-2">
              <span class="text-2xl">🏆</span>
              <h2 class="card-title">True Roster Building Grades</h2>
            </div>
            <p class="text-sm text-dark-textMuted">Draft picks adjusted for drops/trades + waiver acquisitions + trade gains/losses</p>
          </div>
          <div class="card-body p-0">
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead class="bg-dark-border/30">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase">Team</th>
                    <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase">Draft</th>
                    <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase">Waivers</th>
                    <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase">Trades</th>
                    <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase">True Grade</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-dark-border/30">
                  <tr v-for="team in trueGrades" :key="team.roster_id" class="hover:bg-dark-border/20">
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-dark-border overflow-hidden">
                          <img :src="getTeamAvatar(team.roster_id)" class="w-full h-full object-cover" @error="handleImageError" />
                        </div>
                        <span class="font-semibold text-dark-text">{{ team.team_name }}</span>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <div class="text-lg font-bold" :class="team.draftValue >= 0 ? 'text-green-400' : 'text-red-400'">
                        {{ team.draftValue >= 0 ? '+' : '' }}{{ team.draftValue.toFixed(1) }}
                      </div>
                      <div class="text-xs text-dark-textMuted">{{ team.draftGrade }}</div>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <div class="text-lg font-bold" :class="team.waiverValue >= 0 ? 'text-green-400' : 'text-red-400'">
                        {{ team.waiverValue >= 0 ? '+' : '' }}{{ team.waiverValue.toFixed(1) }}
                      </div>
                      <div class="text-xs text-dark-textMuted">{{ team.waiverCount }} adds</div>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <div class="text-lg font-bold" :class="team.tradeValue >= 0 ? 'text-green-400' : 'text-red-400'">
                        {{ team.tradeValue >= 0 ? '+' : '' }}{{ team.tradeValue.toFixed(1) }}
                      </div>
                      <div class="text-xs text-dark-textMuted">{{ team.tradeCount }} trades</div>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <span class="text-4xl font-black" :class="getGradeClass(team.trueGrade)">
                        {{ team.trueGrade }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Team Detail Cards -->
        <div class="space-y-6">
          <div v-for="team in trueGrades" :key="'detail-' + team.roster_id" class="card">
            <div class="card-header">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-full bg-dark-border overflow-hidden">
                    <img :src="getTeamAvatar(team.roster_id)" class="w-full h-full object-cover" @error="handleImageError" />
                  </div>
                  <div>
                    <h3 class="font-bold text-dark-text text-lg">{{ team.team_name }}</h3>
                    <div class="text-sm text-dark-textMuted">
                      True Value: <span class="font-bold" :class="team.totalValue >= 0 ? 'text-green-400' : 'text-red-400'">
                        {{ team.totalValue >= 0 ? '+' : '' }}{{ team.totalValue.toFixed(1) }}
                      </span>
                    </div>
                  </div>
                </div>
                <div class="text-5xl font-black" :class="getGradeClass(team.trueGrade)">{{ team.trueGrade }}</div>
              </div>
            </div>
            <div class="card-body space-y-4">
              <!-- Draft Picks Section -->
              <div>
                <h4 class="text-sm font-semibold text-dark-textMuted mb-2 flex items-center gap-2">
                  <span>📋</span> Draft Picks (Adjusted for drops)
                </h4>
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  <div 
                    v-for="pick in team.draftPicks" 
                    :key="pick.player_id"
                    class="bg-dark-border/30 rounded-lg p-2 flex items-center gap-2"
                    :class="pick.wasDropped ? 'opacity-60' : ''"
                  >
                    <div class="w-8 h-8 rounded-full bg-dark-border overflow-hidden flex-shrink-0">
                      <img :src="getPlayerImageUrl(pick.player_id)" class="w-full h-full object-cover" @error="handleImageError" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="text-xs font-medium text-dark-text truncate">{{ pick.player_name }}</div>
                      <div class="text-[10px] text-dark-textMuted">
                        {{ pick.position }}{{ pick.draftedRank }} → {{ pick.finalRank < 900 ? pick.finalRank : 'N/A' }}
                        <span v-if="pick.wasDropped" class="text-orange-400"> (Dropped Wk{{ pick.dropWeek }})</span>
                      </div>
                    </div>
                    <div class="text-sm font-bold" :class="pick.adjustedValue >= 0 ? 'text-green-400' : 'text-red-400'">
                      {{ pick.adjustedValue >= 0 ? '+' : '' }}{{ pick.adjustedValue.toFixed(1) }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Waiver Acquisitions Section -->
              <div v-if="team.waiverAdds.length > 0">
                <h4 class="text-sm font-semibold text-dark-textMuted mb-2 flex items-center gap-2">
                  <span>📋</span> Waiver & FA Pickups
                </h4>
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  <div 
                    v-for="add in team.waiverAdds" 
                    :key="'waiver-' + add.player_id"
                    class="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2 flex items-center gap-2"
                  >
                    <div class="w-8 h-8 rounded-full bg-dark-border overflow-hidden flex-shrink-0">
                      <img :src="getPlayerImageUrl(add.player_id)" class="w-full h-full object-cover" @error="handleImageError" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="text-xs font-medium text-dark-text truncate">{{ add.player_name }}</div>
                      <div class="text-[10px] text-dark-textMuted">
                        Wk{{ add.addWeek }} • {{ add.position }}{{ add.rankFromAdd }}
                        <span v-if="add.faabSpent > 0" class="text-yellow-400">${{ add.faabSpent }}</span>
                      </div>
                    </div>
                    <div class="text-sm font-bold" :class="add.value >= 0 ? 'text-green-400' : 'text-red-400'">
                      {{ add.value >= 0 ? '+' : '' }}{{ add.value.toFixed(1) }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Trades Section -->
              <div v-if="team.trades.length > 0">
                <h4 class="text-sm font-semibold text-dark-textMuted mb-2 flex items-center gap-2">
                  <span>🔄</span> Trades
                </h4>
                <div class="space-y-2">
                  <div 
                    v-for="(trade, idx) in team.trades" 
                    :key="'trade-' + idx"
                    class="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3"
                  >
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-xs text-dark-textMuted">Week {{ trade.week }} • vs {{ trade.otherTeam }}</span>
                      <span class="text-sm font-bold" :class="trade.netValue >= 0 ? 'text-green-400' : 'text-red-400'">
                        Net: {{ trade.netValue >= 0 ? '+' : '' }}{{ trade.netValue.toFixed(1) }}
                      </span>
                    </div>
                    <div class="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <div class="text-red-400 font-medium mb-1">Gave Up:</div>
                        <div v-for="p in trade.sent" :key="'sent-' + p.player_id" class="flex justify-between">
                          <span class="text-dark-textMuted">{{ p.player_name }}</span>
                          <span class="text-red-400">-{{ Math.abs(p.value).toFixed(1) }}</span>
                        </div>
                      </div>
                      <div>
                        <div class="text-green-400 font-medium mb-1">Received:</div>
                        <div v-for="p in trade.received" :key="'recv-' + p.player_id" class="flex justify-between">
                          <span class="text-dark-textMuted">{{ p.player_name }}</span>
                          <span class="text-green-400">+{{ p.value.toFixed(1) }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </template>

    <!-- No Data State -->
    <template v-else>
      <div class="card">
        <div class="card-body text-center py-12">
          <div class="text-6xl mb-4">📋</div>
          <h3 class="text-xl font-bold text-dark-text mb-2">No Draft Data Available</h3>
          <p class="text-dark-textMuted">Select a season to view draft analysis</p>
        </div>
      </div>
    </template>

    <!-- Player Detail Modal -->
    <Teleport to="body">
      <div v-if="selectedPlayer" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" @click.self="selectedPlayer = null">
        <div class="bg-dark-card rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
          <!-- Modal Header -->
          <div class="p-6 border-b border-dark-border flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="w-16 h-16 rounded-full bg-dark-border overflow-hidden ring-4" :class="getGradeRingClass(selectedPlayer.grade)">
                <img :src="getPlayerImageUrl(selectedPlayer.player_id)" :alt="selectedPlayer.player_name" class="w-full h-full object-cover" @error="handleImageError" />
              </div>
              <div>
                <h2 class="text-2xl font-bold text-dark-text">{{ selectedPlayer.player_name }}</h2>
                <div class="flex items-center gap-2 text-sm text-dark-textMuted">
                  <span class="px-2 py-0.5 rounded text-xs font-bold" :class="getPositionClass(selectedPlayer.position)">{{ selectedPlayer.position }}</span>
                  <span>•</span>
                  <span>{{ selectedPlayer.team_name }}</span>
                </div>
              </div>
            </div>
            <button @click="selectedPlayer = null" class="text-dark-textMuted hover:text-dark-text p-2">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Modal Content -->
          <div class="p-6 overflow-y-auto max-h-[calc(90vh-120px)] space-y-6">
            <!-- Draft Info & Grade -->
            <div class="grid grid-cols-2 gap-4">
              <div class="bg-dark-border/30 rounded-xl p-4">
                <div class="text-sm text-dark-textMuted mb-1">Draft Pick</div>
                <div class="text-2xl font-bold text-dark-text">{{ selectedPlayer.pick_label }}</div>
                <div class="text-xs text-dark-textMuted">Round {{ selectedPlayer.round }}, Pick #{{ selectedPlayer.pick_no }}</div>
              </div>
              <div class="bg-dark-border/30 rounded-xl p-4 text-center">
                <div class="text-sm text-dark-textMuted mb-1">Pick Grade</div>
                <div class="text-5xl font-black" :class="getGradeClass(selectedPlayer.grade)">{{ selectedPlayer.grade }}</div>
              </div>
            </div>

            <!-- Performance Summary -->
            <div class="bg-dark-border/30 rounded-xl p-4">
              <h3 class="text-lg font-bold text-dark-text mb-4">Season Performance</h3>
              <div class="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div class="text-2xl font-bold text-primary">{{ selectedPlayer.position }}{{ selectedPlayer.position_rank_drafted }}</div>
                  <div class="text-xs text-dark-textMuted">Drafted As</div>
                </div>
                <div>
                  <div class="text-2xl font-bold" :class="selectedPlayer.score >= 0 ? 'text-green-400' : 'text-red-400'">
                    {{ selectedPlayer.current_position_rank < 900 ? selectedPlayer.position + selectedPlayer.current_position_rank : 'N/A' }}
                  </div>
                  <div class="text-xs text-dark-textMuted">Finished As</div>
                </div>
                <div>
                  <div class="text-2xl font-bold" :class="selectedPlayer.score >= 0 ? 'text-green-400' : 'text-red-400'">
                    {{ selectedPlayer.score >= 0 ? '+' : '' }}{{ selectedPlayer.score.toFixed(1) }}
                  </div>
                  <div class="text-xs text-dark-textMuted">Value Score</div>
                </div>
              </div>
            </div>

            <!-- Transaction History -->
            <div class="bg-dark-border/30 rounded-xl p-4">
              <h3 class="text-lg font-bold text-dark-text mb-4">Transaction History</h3>
              <div v-if="playerTransactionHistory.length === 0" class="text-center py-4 text-dark-textMuted">
                No transactions - player stayed on original roster all season
              </div>
              <div v-else class="space-y-2">
                <div v-for="(tx, idx) in playerTransactionHistory" :key="idx" 
                     class="flex items-center gap-3 p-3 rounded-lg"
                     :class="tx.type === 'trade' ? 'bg-blue-500/10' : tx.type === 'drop' ? 'bg-red-500/10' : 'bg-green-500/10'">
                  <span class="text-xl">
                    {{ tx.type === 'trade' ? '🔄' : tx.type === 'drop' ? '⬇️' : tx.type === 'waiver' ? '📋' : '➕' }}
                  </span>
                  <div class="flex-1">
                    <div class="font-medium text-dark-text">
                      {{ tx.type === 'trade' ? 'Traded' : tx.type === 'drop' ? 'Dropped' : tx.type === 'waiver' ? 'Waiver Claim' : 'Added' }}
                    </div>
                    <div class="text-xs text-dark-textMuted">
                      Week {{ tx.week }}
                      <span v-if="tx.fromTeam"> • From: {{ tx.fromTeam }}</span>
                      <span v-if="tx.toTeam"> • To: {{ tx.toTeam }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Verdict -->
            <div class="bg-dark-border/30 rounded-xl p-4">
              <h3 class="text-lg font-bold text-dark-text mb-2">Verdict</h3>
              <p class="text-dark-textMuted">
                <template v-if="selectedPlayer.score >= 15">
                  <span class="text-green-400 font-bold">💎 ELITE STEAL!</span> 
                  Exceptional value - this player finished as an elite starter while being drafted much later.
                </template>
                <template v-else-if="selectedPlayer.score >= 8">
                  <span class="text-green-400 font-bold">✨ Great Pick</span>
                  Strong value that significantly outperformed draft position.
                </template>
                <template v-else-if="selectedPlayer.score >= 3">
                  <span class="text-lime-400 font-bold">✓ Solid Hit</span>
                  Good value pick that exceeded expectations.
                </template>
                <template v-else-if="selectedPlayer.score >= -3">
                  <span class="text-blue-400 font-bold">➡️ As Expected</span>
                  Performed roughly as drafted - no major gain or loss.
                </template>
                <template v-else-if="selectedPlayer.score >= -10">
                  <span class="text-orange-400 font-bold">⚠️ Underperformed</span>
                  Didn't live up to draft position - moderate miss.
                </template>
                <template v-else>
                  <span class="text-red-400 font-bold">💀 Bust</span>
                  Significant underperformance relative to draft capital spent.
                </template>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { sleeperService } from '@/services/sleeper'
import draftAnalysisService, { type DraftPickAnalysis, type TeamDraftGrade, type RoundAnalysis } from '@/services/draftAnalysis'

const leagueStore = useLeagueStore()

// Tab options - now with 4 tabs
const tabOptions = [
  { id: 'board', name: 'Draft Board', icon: '📋' },
  { id: 'grades', name: 'Player Grades', icon: '🎯' },
  { id: 'analysis', name: 'Deep Analysis', icon: '📊' },
  { id: 'actual', name: 'Actual Value', icon: '🏆' }
]

// State
const activeTab = ref('board')
const selectedSeason = ref('')
const selectedWeek = ref('final')
const positionFilter = ref('All')
const showTradesOnly = ref(false)
const selectedGradeTeam = ref('')
const gradeSort = ref('pick')
const isLoading = ref(false)
const isLoadingTransactions = ref(false)

// Analysis data
const teamDraftGrades = ref<TeamDraftGrade[]>([])
const roundAnalyses = ref<RoundAnalysis[]>([])
const allSteals = ref<DraftPickAnalysis[]>([])
const allReaches = ref<DraftPickAnalysis[]>([])

// Player modal state
const selectedPlayer = ref<any>(null)
const playerTransactions = ref<Map<string, any[]>>(new Map())
const transactionsLoaded = ref(false)

// True grades data (for Actual Value tab)
const trueGrades = ref<any[]>([])
const allTransactions = ref<any[]>([])

// Computed: transaction history for selected player
const playerTransactionHistory = computed(() => {
  if (!selectedPlayer.value) return []
  return playerTransactions.value.get(selectedPlayer.value.player_id) || []
})

// Sort options for grades - removed 'grade' option
const gradeSortOptions = [
  { id: 'pick', label: 'By Pick' },
  { id: 'score', label: 'By Score' }
]

// Available weeks (1-17 for regular season)
const availableWeeks = computed(() => {
  return Array.from({ length: 17 }, (_, i) => i + 1)
})

// Total picks count
const totalPicks = computed(() => {
  return draftBoard.value.reduce((sum, team) => sum + team.picks.length, 0)
})

// Interfaces
interface DraftPick {
  pick_id: string
  player_id: string
  player_name: string
  position: string
  pick_label: string
  pick_no: number
  round: number
  is_traded: boolean
  score: number
  position_rank_drafted: number
  current_position_rank: number
}

interface TeamDraft {
  roster_id: number
  team_name: string
  avatar: string
  draft_position: number
  picks: DraftPick[]
  total_score: number
}

// Draft board computed from store data
const draftBoard = computed<TeamDraft[]>(() => {
  if (!selectedSeason.value) return []
  
  const draft = leagueStore.historicalDrafts.get(selectedSeason.value)
  if (!draft || !draft.picks) return []
  
  const rosters = leagueStore.historicalRosters.get(selectedSeason.value) || []
  const users = leagueStore.historicalUsers.get(selectedSeason.value) || []
  const matchups = leagueStore.historicalMatchups.get(selectedSeason.value)
  const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === selectedSeason.value)
  
  if (!matchups || !seasonInfo) return []
  
  // Build player positions map from draft picks
  const playerPositions = new Map<string, string>()
  draft.picks.forEach((pick: any) => {
    const pos = pick.metadata?.position
    if (pos && pick.player_id) {
      playerPositions.set(pick.player_id, pos)
    }
  })
  
  // Calculate player stats with position data
  const playoffStart = seasonInfo.settings?.playoff_week_start || 15
  const maxWeek = selectedWeek.value === 'final' ? playoffStart - 1 : parseInt(selectedWeek.value as string)
  const playerStats = draftAnalysisService.calculatePlayerSeasonStats(matchups, maxWeek, playerPositions)
  
  // Group picks by team
  const teamPicks = new Map<number, any[]>()
  const draftSlots = new Map<number, number>()
  
  draft.picks.forEach((pick: any) => {
    if (!teamPicks.has(pick.roster_id)) {
      teamPicks.set(pick.roster_id, [])
    }
    teamPicks.get(pick.roster_id)!.push(pick)
    
    if (pick.round === 1) {
      draftSlots.set(pick.roster_id, pick.draft_slot)
    }
  })
  
  // Calculate position ranks at draft time
  const positionDraftOrder: Record<string, string[]> = { QB: [], RB: [], WR: [], TE: [] }
  draft.picks.forEach((pick: any) => {
    const pos = pick.metadata?.position
    if (pos && positionDraftOrder[pos]) {
      positionDraftOrder[pos].push(pick.player_id)
    }
  })
  
  // Build team draft data
  const teams: TeamDraft[] = []
  const numTeams = rosters.length || 12
  
  rosters.forEach(roster => {
    const picks = teamPicks.get(roster.roster_id) || []
    if (picks.length === 0) return
    
    const user = users.find(u => u.user_id === roster.owner_id)
    const teamName = sleeperService.getTeamName(roster, user)
    const avatar = sleeperService.getAvatarUrl(roster, user, seasonInfo)
    
    const processedPicks: DraftPick[] = picks.map(pick => {
      const position = pick.metadata?.position || 'Unknown'
      const playerName = pick.metadata?.first_name && pick.metadata?.last_name
        ? `${pick.metadata.first_name} ${pick.metadata.last_name}`
        : `Player ${pick.player_id}`
      
      // Get drafted position rank
      const draftedRank = (positionDraftOrder[position]?.indexOf(pick.player_id) ?? -1) + 1
      
      // Get current position rank from stats
      const stats = playerStats.get(pick.player_id)
      let currentRank = 999
      if (stats) {
        const samePositionPlayers = Array.from(playerStats.entries())
          .filter(([, s]) => s.position === position)
          .sort((a, b) => b[1].totalPoints - a[1].totalPoints)
        currentRank = samePositionPlayers.findIndex(([id]) => id === pick.player_id) + 1
        if (currentRank === 0) currentRank = 999
      }
      
      // Calculate ADJUSTED score with positional value multiplier
      const adjustedScore = draftAnalysisService.calculateAdjustedScore(
        draftedRank,
        currentRank,
        pick.round,
        numTeams
      )
      
      const isTradedPick = typeof pick.picked_by === 'number' && 
                          pick.picked_by > 0 && 
                          pick.roster_id !== pick.picked_by
      
      return {
        pick_id: `${pick.round}-${pick.pick_no}`,
        player_id: pick.player_id,
        player_name: playerName,
        position,
        pick_label: `${pick.round}.${String(pick.draft_slot).padStart(2, '0')}`,
        pick_no: pick.pick_no,
        round: pick.round,
        is_traded: isTradedPick,
        score: Math.round(adjustedScore * 10) / 10,
        position_rank_drafted: draftedRank,
        current_position_rank: currentRank
      }
    })
    
    const totalScore = Math.round(processedPicks.reduce((sum, p) => sum + p.score, 0) * 10) / 10
    
    teams.push({
      roster_id: roster.roster_id,
      team_name: teamName,
      avatar,
      draft_position: draftSlots.get(roster.roster_id) || 0,
      picks: processedPicks,
      total_score: totalScore
    })
  })
  
  // Sort by draft position
  teams.sort((a, b) => a.draft_position - b.draft_position)
  
  return teams
})

// Player grades from draft board
const playerGrades = computed(() => {
  const grades: any[] = []
  
  draftBoard.value.forEach(team => {
    team.picks.forEach(pick => {
      if (pick.current_position_rank >= 900) return
      
      grades.push({
        ...pick,
        team_name: team.team_name,
        grade: calculateGrade(pick.score)
      })
    })
  })
  
  return grades
})

// Filtered and sorted player grades
const filteredPlayerGrades = computed(() => {
  let grades = [...playerGrades.value]
  
  // Filter by team
  if (selectedGradeTeam.value) {
    grades = grades.filter(g => {
      const team = draftBoard.value.find(t => t.roster_id === parseInt(selectedGradeTeam.value))
      return team && g.team_name === team.team_name
    })
  }
  
  // Sort
  if (gradeSort.value === 'pick') {
    grades.sort((a, b) => a.pick_no - b.pick_no)
  } else if (gradeSort.value === 'score') {
    grades.sort((a, b) => b.score - a.score)
  }
  
  return grades
})

// Filtered steals for Deep Analysis
const filteredSteals = computed(() => {
  return allSteals.value.slice(0, 10)
})

// Get team picks for Deep Analysis cards
function getTeamPicks(rosterId: number): DraftPick[] {
  const team = draftBoard.value.find(t => t.roster_id === rosterId)
  return team?.picks || []
}

/**
 * Calculate grade using adjusted score
 */
function calculateGrade(adjustedScore: number): string {
  if (adjustedScore >= 20) return 'A+'
  if (adjustedScore >= 15) return 'A'
  if (adjustedScore >= 10) return 'A-'
  if (adjustedScore >= 6) return 'B+'
  if (adjustedScore >= 3) return 'B'
  if (adjustedScore >= 0) return 'B-'
  if (adjustedScore >= -3) return 'C+'
  if (adjustedScore >= -6) return 'C'
  if (adjustedScore >= -10) return 'C-'
  if (adjustedScore >= -15) return 'D'
  return 'F'
}

function shouldShowPick(pick: DraftPick): boolean {
  if (showTradesOnly.value && !pick.is_traded) return false
  if (positionFilter.value === 'All') return true
  return pick.position === positionFilter.value
}

// Open player detail modal
async function openPlayerModal(pick: any, teamName: string) {
  const grade = calculateGrade(pick.score)
  selectedPlayer.value = { ...pick, team_name: teamName, grade }
  
  // Load transactions if not already loaded
  if (!transactionsLoaded.value && selectedSeason.value) {
    await loadTransactions()
  }
}

async function loadTransactions() {
  const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === selectedSeason.value)
  if (!seasonInfo?.league_id) return
  
  try {
    const txs = await draftAnalysisService.fetchLeagueTransactions(seasonInfo.league_id, 17)
    
    // Enrich with team names
    const rosters = leagueStore.historicalRosters.get(selectedSeason.value) || []
    const users = leagueStore.historicalUsers.get(selectedSeason.value) || []
    const teamNameMap = new Map<number, string>()
    
    rosters.forEach(roster => {
      const user = users.find(u => u.user_id === roster.owner_id)
      teamNameMap.set(roster.roster_id, sleeperService.getTeamName(roster, user))
    })
    
    // Add team names to transactions
    txs.forEach((playerTxs, playerId) => {
      playerTxs.forEach(tx => {
        if (tx.fromRosterId) tx.fromTeam = teamNameMap.get(tx.fromRosterId)
        if (tx.toRosterId) tx.toTeam = teamNameMap.get(tx.toRosterId)
      })
    })
    
    playerTransactions.value = txs
    transactionsLoaded.value = true
  } catch (err) {
    console.warn('Failed to load transactions:', err)
  }
}

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement
  img.src = 'https://sleepercdn.com/avatars/thumbs/default'
}

function getPlayerImageUrl(playerId: string): string {
  return `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`
}

function getScoreClass(score: number): string {
  if (score >= 15) return 'text-green-400'
  if (score >= 8) return 'text-green-300'
  if (score >= 3) return 'text-lime-400'
  if (score >= 0) return 'text-blue-400'
  if (score >= -5) return 'text-yellow-400'
  if (score >= -10) return 'text-orange-400'
  return 'text-red-400'
}

function getGradeClass(grade: string): string {
  if (grade.startsWith('A')) return 'text-green-400'
  if (grade.startsWith('B')) return 'text-blue-400'
  if (grade.startsWith('C')) return 'text-yellow-400'
  if (grade.startsWith('D')) return 'text-orange-400'
  return 'text-red-400'
}

function getGradeRingClass(grade: string): string {
  if (grade.startsWith('A')) return 'ring-green-500/50'
  if (grade.startsWith('B')) return 'ring-blue-500/50'
  if (grade.startsWith('C')) return 'ring-yellow-500/50'
  if (grade.startsWith('D')) return 'ring-orange-500/50'
  return 'ring-red-500/50'
}

function getScoreRingClass(score: number): string {
  if (score >= 8) return 'ring-green-500/50'
  if (score >= 0) return 'ring-blue-500/50'
  if (score >= -8) return 'ring-yellow-500/50'
  return 'ring-red-500/50'
}

function getGradeRowClass(grade: any): string {
  if (grade.score >= 15) return 'bg-green-500/5'
  if (grade.score <= -10) return 'bg-red-500/5'
  return ''
}

function getPickClass(pick: DraftPick): string {
  let base = 'border '
  
  if (pick.is_traded) {
    base += 'border-blue-500/50 bg-blue-500/5 '
  } else if (pick.score >= 8) {
    base += 'border-green-500/30 bg-green-500/5 '
  } else if (pick.score <= -8) {
    base += 'border-red-500/30 bg-red-500/5 '
  } else {
    base += 'border-dark-border bg-dark-border/30 '
  }
  
  return base
}

function getPositionClass(position: string): string {
  const classes: Record<string, string> = {
    QB: 'bg-red-500/20 text-red-400',
    RB: 'bg-green-500/20 text-green-400',
    WR: 'bg-blue-500/20 text-blue-400',
    TE: 'bg-yellow-500/20 text-yellow-400',
    K: 'bg-purple-500/20 text-purple-400',
    DEF: 'bg-orange-500/20 text-orange-400'
  }
  return classes[position] || 'bg-gray-500/20 text-gray-400'
}

function getTeamAvatar(rosterId: number): string {
  const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === selectedSeason.value)
  if (!seasonInfo) return 'https://sleepercdn.com/avatars/thumbs/default'
  
  const rosters = leagueStore.historicalRosters.get(selectedSeason.value) || []
  const users = leagueStore.historicalUsers.get(selectedSeason.value) || []
  
  const roster = rosters.find(r => r.roster_id === rosterId)
  if (!roster) return 'https://sleepercdn.com/avatars/thumbs/default'
  
  const user = users.find(u => u.user_id === roster.owner_id)
  return sleeperService.getAvatarUrl(roster, user, seasonInfo)
}

async function loadDraft() {
  if (!selectedSeason.value) return
  isLoading.value = true
  
  try {
    const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === selectedSeason.value)
    if (!seasonInfo) return
    
    // Load draft if not already loaded
    if (!leagueStore.historicalDrafts.has(selectedSeason.value)) {
      await leagueStore.loadHistoricalDraft(seasonInfo.league_id, selectedSeason.value)
    }
    
    // Load matchups if not already loaded
    if (!leagueStore.historicalMatchups.has(selectedSeason.value)) {
      await leagueStore.loadHistoricalMatchups(seasonInfo.league_id, selectedSeason.value)
    }
  } catch (error) {
    console.error('Failed to load draft:', error)
  } finally {
    isLoading.value = false
  }
}

function onSeasonChange() {
  selectedWeek.value = 'final'
  transactionsLoaded.value = false
  playerTransactions.value = new Map()
  selectedPlayer.value = null
  trueGrades.value = []
  loadDraft()
  loadDraftAnalysis()
}

async function loadDraftAnalysis() {
  if (!selectedSeason.value) return
  
  try {
    const draft = leagueStore.historicalDrafts.get(selectedSeason.value)
    if (!draft || !draft.picks) return
    
    const matchups = leagueStore.historicalMatchups.get(selectedSeason.value)
    if (!matchups) return
    
    const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === selectedSeason.value)
    if (!seasonInfo) return
    
    const rosters = leagueStore.historicalRosters.get(selectedSeason.value) || []
    const users = leagueStore.historicalUsers.get(selectedSeason.value) || []
    const numTeams = rosters.length || 12
    
    // Build player positions map
    const playerPositions = new Map<string, string>()
    draft.picks.forEach((pick: any) => {
      const pos = pick.metadata?.position
      if (pos && pick.player_id) {
        playerPositions.set(pick.player_id, pos)
      }
    })
    
    const playoffStart = seasonInfo.settings?.playoff_week_start || 15
    const playerStats = draftAnalysisService.calculatePlayerSeasonStats(matchups, playoffStart, playerPositions)
    
    const playerNames = new Map<string, string>()
    draft.picks.forEach((pick: any) => {
      const name = pick.metadata?.first_name && pick.metadata?.last_name
        ? `${pick.metadata.first_name} ${pick.metadata.last_name}`
        : `Player ${pick.player_id}`
      playerNames.set(pick.player_id, name)
    })
    
    const teamNames = new Map<number, string>()
    rosters.forEach(roster => {
      const user = users.find(u => u.user_id === roster.owner_id)
      teamNames.set(roster.roster_id, sleeperService.getTeamName(roster, user))
    })
    
    const analyzed = draftAnalysisService.analyzeDraftPicks(
      draft.picks,
      playerStats,
      playerNames,
      teamNames,
      numTeams
    )
    
    teamDraftGrades.value = draftAnalysisService.calculateTeamDraftGrades(analyzed, teamNames, numTeams)
    roundAnalyses.value = draftAnalysisService.analyzeRounds(analyzed)
    
    allSteals.value = analyzed
      .filter(p => p.isSteal)
      .sort((a, b) => b.adjustedScore - a.adjustedScore)
    
    allReaches.value = analyzed
      .filter(p => p.isReach)
      .sort((a, b) => a.adjustedScore - b.adjustedScore)
    
  } catch (error) {
    console.error('Failed to load draft analysis:', error)
  }
}

// Load actual value data when switching to that tab
async function loadActualValue() {
  if (trueGrades.value.length > 0) return // Already loaded
  
  isLoadingTransactions.value = true
  
  try {
    const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === selectedSeason.value)
    if (!seasonInfo?.league_id) return
    
    // Load all transactions for the season
    const txs = await fetchAllTransactions(seasonInfo.league_id)
    
    const rosters = leagueStore.historicalRosters.get(selectedSeason.value) || []
    const users = leagueStore.historicalUsers.get(selectedSeason.value) || []
    const matchups = leagueStore.historicalMatchups.get(selectedSeason.value)
    const draft = leagueStore.historicalDrafts.get(selectedSeason.value)
    
    if (!matchups || !draft) return
    
    const playoffStart = seasonInfo.settings?.playoff_week_start || 15
    const numTeams = rosters.length || 12
    
    // Build player positions and names
    const playerPositions = new Map<string, string>()
    const playerNames = new Map<string, string>()
    draft.picks.forEach((pick: any) => {
      if (pick.metadata?.position) playerPositions.set(pick.player_id, pick.metadata.position)
      if (pick.metadata?.first_name) {
        playerNames.set(pick.player_id, `${pick.metadata.first_name} ${pick.metadata.last_name}`)
      }
    })
    
    // Get all player names from transactions too
    txs.forEach(tx => {
      if (tx.adds) {
        Object.keys(tx.adds).forEach(pid => {
          if (!playerNames.has(pid)) {
            playerNames.set(pid, `Player ${pid}`)
          }
        })
      }
    })
    
    // Build team name map
    const teamNames = new Map<number, string>()
    rosters.forEach(roster => {
      const user = users.find(u => u.user_id === roster.owner_id)
      teamNames.set(roster.roster_id, sleeperService.getTeamName(roster, user))
    })
    
    // Calculate true grades for each team
    const grades = rosters.map(roster => {
      const rosterId = roster.roster_id
      const teamName = teamNames.get(rosterId) || `Team ${rosterId}`
      
      // Get draft picks for this team
      const teamDraftPicks = draft.picks.filter((p: any) => p.roster_id === rosterId)
      
      // Process each draft pick - check if dropped
      const draftPicksWithValue = teamDraftPicks.map((pick: any) => {
        const position = pick.metadata?.position || 'FLEX'
        const playerName = playerNames.get(pick.player_id) || `Player ${pick.player_id}`
        
        // Check if this player was dropped
        const dropTx = txs.find(tx => 
          tx.drops && 
          tx.drops[pick.player_id] === rosterId
        )
        
        const wasDropped = !!dropTx
        const dropWeek = dropTx?.leg || 0
        
        // Calculate value at drop time or end of season
        let finalRank = 999
        let adjustedValue = 0
        
        // Get drafted position rank
        const positionDraftOrder = draft.picks
          .filter((p: any) => p.metadata?.position === position)
          .map((p: any) => p.player_id)
        const draftedRank = positionDraftOrder.indexOf(pick.player_id) + 1
        
        if (wasDropped) {
          // Calculate rank at time of drop
          const statsAtDrop = calculateStatsUpToWeek(matchups, dropWeek, playerPositions)
          const stats = statsAtDrop.get(pick.player_id)
          if (stats) {
            finalRank = stats.positionRank
          }
          adjustedValue = draftAnalysisService.calculateAdjustedScore(draftedRank, finalRank, pick.round, numTeams) * 0.5 // Reduced value for dropped players
        } else {
          // Full season value
          const fullStats = draftAnalysisService.calculatePlayerSeasonStats(matchups, playoffStart, playerPositions)
          const stats = fullStats.get(pick.player_id)
          if (stats) {
            finalRank = stats.positionRank
          }
          adjustedValue = draftAnalysisService.calculateAdjustedScore(draftedRank, finalRank, pick.round, numTeams)
        }
        
        return {
          player_id: pick.player_id,
          player_name: playerName,
          position,
          draftedRank,
          finalRank,
          wasDropped,
          dropWeek,
          adjustedValue: Math.round(adjustedValue * 10) / 10
        }
      })
      
      // Get waiver adds
      const waiverAdds: any[] = []
      txs.forEach(tx => {
        if ((tx.type === 'waiver' || tx.type === 'free_agent') && tx.adds) {
          Object.entries(tx.adds).forEach(([playerId, addRosterId]) => {
            if (addRosterId === rosterId) {
              const position = playerPositions.get(playerId) || 'FLEX'
              const playerName = playerNames.get(playerId) || `Player ${playerId}`
              
              // Calculate value from add week to end of season
              const addWeek = tx.leg || 1
              const statsFromAdd = calculateStatsFromWeek(matchups, addWeek, playoffStart, playerPositions)
              const stats = statsFromAdd.get(playerId)
              
              // Treat as free acquisition - compare to last round pick
              const equivalentDraftRank = numTeams * 15 // Last round equivalent
              const rankFromAdd = stats?.positionRank || 999
              const value = draftAnalysisService.calculateAdjustedScore(equivalentDraftRank, rankFromAdd, 15, numTeams)
              
              // Get FAAB spent if any
              const faabSpent = tx.waiver_budget?.find((wb: any) => wb.sender === rosterId)?.amount || 0
              
              waiverAdds.push({
                player_id: playerId,
                player_name: playerName,
                position,
                addWeek,
                rankFromAdd,
                value: Math.round(value * 10) / 10,
                faabSpent
              })
            }
          })
        }
      })
      
      // Get trades
      const trades: any[] = []
      txs.forEach(tx => {
        if (tx.type === 'trade' && tx.roster_ids?.includes(rosterId)) {
          const otherRosterId = tx.roster_ids.find((id: number) => id !== rosterId)
          const otherTeam = teamNames.get(otherRosterId) || `Team ${otherRosterId}`
          
          const sent: any[] = []
          const received: any[] = []
          
          // Players sent (in drops for this team, adds for other)
          if (tx.drops) {
            Object.entries(tx.drops).forEach(([playerId, dropRosterId]) => {
              if (dropRosterId === rosterId) {
                const position = playerPositions.get(playerId) || 'FLEX'
                const playerName = playerNames.get(playerId) || `Player ${playerId}`
                
                // Value from trade week to end of season (what they gave up)
                const tradeWeek = tx.leg || 1
                const statsFromTrade = calculateStatsFromWeek(matchups, tradeWeek, playoffStart, playerPositions)
                const stats = statsFromTrade.get(playerId)
                const rankFromTrade = stats?.positionRank || 999
                
                // Approximate their draft value
                const positionDraftOrder = draft.picks
                  .filter((p: any) => p.metadata?.position === position)
                  .map((p: any) => p.player_id)
                const draftedRank = positionDraftOrder.indexOf(playerId) + 1 || numTeams * 8
                
                const value = draftAnalysisService.calculateAdjustedScore(draftedRank, rankFromTrade, 8, numTeams)
                
                sent.push({
                  player_id: playerId,
                  player_name: playerName,
                  value: Math.round(value * 10) / 10
                })
              }
            })
          }
          
          // Players received (in adds for this team)
          if (tx.adds) {
            Object.entries(tx.adds).forEach(([playerId, addRosterId]) => {
              if (addRosterId === rosterId) {
                const position = playerPositions.get(playerId) || 'FLEX'
                const playerName = playerNames.get(playerId) || `Player ${playerId}`
                
                const tradeWeek = tx.leg || 1
                const statsFromTrade = calculateStatsFromWeek(matchups, tradeWeek, playoffStart, playerPositions)
                const stats = statsFromTrade.get(playerId)
                const rankFromTrade = stats?.positionRank || 999
                
                const positionDraftOrder = draft.picks
                  .filter((p: any) => p.metadata?.position === position)
                  .map((p: any) => p.player_id)
                const draftedRank = positionDraftOrder.indexOf(playerId) + 1 || numTeams * 8
                
                const value = draftAnalysisService.calculateAdjustedScore(draftedRank, rankFromTrade, 8, numTeams)
                
                received.push({
                  player_id: playerId,
                  player_name: playerName,
                  value: Math.round(value * 10) / 10
                })
              }
            })
          }
          
          if (sent.length > 0 || received.length > 0) {
            const sentValue = sent.reduce((sum, p) => sum + p.value, 0)
            const receivedValue = received.reduce((sum, p) => sum + p.value, 0)
            
            trades.push({
              week: tx.leg || 0,
              otherTeam,
              sent,
              received,
              netValue: Math.round((receivedValue - sentValue) * 10) / 10
            })
          }
        }
      })
      
      // Calculate totals
      const draftValue = draftPicksWithValue.reduce((sum, p) => sum + p.adjustedValue, 0)
      const waiverValue = waiverAdds.reduce((sum, p) => sum + p.value, 0)
      const tradeValue = trades.reduce((sum, t) => sum + t.netValue, 0)
      const totalValue = draftValue + waiverValue + tradeValue
      
      return {
        roster_id: rosterId,
        team_name: teamName,
        draftPicks: draftPicksWithValue,
        draftValue: Math.round(draftValue * 10) / 10,
        draftGrade: calculateGrade(draftValue / Math.max(1, draftPicksWithValue.length)),
        waiverAdds,
        waiverValue: Math.round(waiverValue * 10) / 10,
        waiverCount: waiverAdds.length,
        trades,
        tradeValue: Math.round(tradeValue * 10) / 10,
        tradeCount: trades.length,
        totalValue: Math.round(totalValue * 10) / 10,
        trueGrade: calculateGrade(totalValue / 10) // Scaled for overall grade
      }
    })
    
    // Sort by total value
    grades.sort((a, b) => b.totalValue - a.totalValue)
    trueGrades.value = grades
    
  } catch (error) {
    console.error('Failed to load actual value:', error)
  } finally {
    isLoadingTransactions.value = false
  }
}

// Fetch all transactions for a league
async function fetchAllTransactions(leagueId: string): Promise<any[]> {
  const allTxs: any[] = []
  
  for (let week = 1; week <= 17; week++) {
    try {
      const response = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/transactions/${week}`)
      if (response.ok) {
        const txs = await response.json()
        allTxs.push(...txs.map((tx: any) => ({ ...tx, leg: week })))
      }
    } catch (e) {
      // Ignore errors for individual weeks
    }
  }
  
  return allTxs
}

// Calculate stats up to a specific week
function calculateStatsUpToWeek(
  matchupsByWeek: Map<number, any[]>,
  maxWeek: number,
  playerPositions: Map<string, string>
): Map<string, { positionRank: number; totalPoints: number }> {
  const playerPoints = new Map<string, number>()
  
  matchupsByWeek.forEach((weekMatchups, week) => {
    if (week > maxWeek) return
    
    weekMatchups.forEach(matchup => {
      if (!matchup.players_points) return
      
      Object.entries(matchup.players_points).forEach(([playerId, points]) => {
        playerPoints.set(playerId, (playerPoints.get(playerId) || 0) + (points as number))
      })
    })
  })
  
  // Calculate position ranks
  const byPosition = new Map<string, { playerId: string; points: number }[]>()
  playerPoints.forEach((points, playerId) => {
    const pos = playerPositions.get(playerId) || 'FLEX'
    if (!byPosition.has(pos)) byPosition.set(pos, [])
    byPosition.get(pos)!.push({ playerId, points })
  })
  
  const result = new Map<string, { positionRank: number; totalPoints: number }>()
  byPosition.forEach((players, pos) => {
    players.sort((a, b) => b.points - a.points)
    players.forEach((p, idx) => {
      result.set(p.playerId, { positionRank: idx + 1, totalPoints: p.points })
    })
  })
  
  return result
}

// Calculate stats from a specific week to end of season
function calculateStatsFromWeek(
  matchupsByWeek: Map<number, any[]>,
  startWeek: number,
  endWeek: number,
  playerPositions: Map<string, string>
): Map<string, { positionRank: number; totalPoints: number }> {
  const playerPoints = new Map<string, number>()
  
  matchupsByWeek.forEach((weekMatchups, week) => {
    if (week < startWeek || week >= endWeek) return
    
    weekMatchups.forEach(matchup => {
      if (!matchup.players_points) return
      
      Object.entries(matchup.players_points).forEach(([playerId, points]) => {
        playerPoints.set(playerId, (playerPoints.get(playerId) || 0) + (points as number))
      })
    })
  })
  
  // Calculate position ranks
  const byPosition = new Map<string, { playerId: string; points: number }[]>()
  playerPoints.forEach((points, playerId) => {
    const pos = playerPositions.get(playerId) || 'FLEX'
    if (!byPosition.has(pos)) byPosition.set(pos, [])
    byPosition.get(pos)!.push({ playerId, points })
  })
  
  const result = new Map<string, { positionRank: number; totalPoints: number }>()
  byPosition.forEach((players, pos) => {
    players.sort((a, b) => b.points - a.points)
    players.forEach((p, idx) => {
      result.set(p.playerId, { positionRank: idx + 1, totalPoints: p.points })
    })
  })
  
  return result
}

watch(activeTab, (newTab) => {
  if (newTab === 'analysis' && teamDraftGrades.value.length === 0) {
    loadDraftAnalysis()
  }
  if (newTab === 'actual') {
    loadActualValue()
  }
})

onMounted(() => {
  if (leagueStore.historicalSeasons.length > 0) {
    selectedSeason.value = leagueStore.historicalSeasons[0].season
    loadDraft()
  }
})
</script>

<style scoped>
.overflow-y-auto::-webkit-scrollbar,
.overflow-x-auto::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track,
.overflow-x-auto::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb,
.overflow-x-auto::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover,
.overflow-x-auto::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
