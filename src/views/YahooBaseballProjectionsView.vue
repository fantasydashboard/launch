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
      </div>
    </div>

    <!-- Simulated Data Banner for non-Ultimate users -->
    <SimulatedDataBanner v-if="!hasPremiumAccess" :is-ultimate-tier="true" class="mb-6" />

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
      <div class="card bg-green-500/10 border-green-500/30">
        <div class="card-body py-3">
          <div class="flex items-center gap-3">
            <span class="text-xl">✓</span>
            <span class="font-semibold text-green-400">Live Yahoo Data</span>
            <span class="text-dark-textMuted">{{ allPlayers.length }} players</span>
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
                  <th class="px-3 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase w-12">Rank</th>
                  <th class="px-3 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase">Player</th>
                  <th class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-12">Pos</th>
                  <th class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-14">Pos Rk</th>
                  <th class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-14">Pts</th>
                  <th class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-14">PPG</th>
                  <th class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-14">VOR</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-dark-border/30">
                <tr v-for="(player, idx) in gatedFilteredPlayers" :key="player.player_key" :class="getRowClass(player)" class="hover:bg-dark-border/20 transition-colors">
                  <td class="px-3 py-3"><span class="font-bold text-lg text-dark-text">{{ player.rosRank }}</span></td>
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
                          <span class="text-dark-border">•</span>
                          <span v-if="player.fantasy_team" :class="isMyPlayer(player) ? 'text-primary' : ''">{{ player.fantasy_team }}</span>
                          <span v-else class="text-cyan-400">Free Agent</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="px-2 py-3 text-center"><span class="px-2 py-1 rounded text-xs font-bold" :class="getPositionClass(player.position)">{{ player.position?.split(',')[0] }}</span></td>
                  <td class="px-2 py-3 text-center text-dark-text font-medium">{{ player.positionRank }}</td>
                  <td class="px-2 py-3 text-center font-bold text-dark-text">{{ player.total_points?.toFixed(1) || '0' }}</td>
                  <td class="px-2 py-3 text-center font-bold text-dark-text">{{ player.ppg?.toFixed(2) || '0' }}</td>
                  <td class="px-2 py-3 text-center font-bold" :class="player.vor > 0 ? 'text-green-400' : player.vor < -3 ? 'text-red-400' : 'text-dark-textMuted'">{{ player.vor >= 0 ? '+' : '' }}{{ player.vor?.toFixed(1) || '0' }}</td>
                </tr>
                <tr v-if="gatedFilteredPlayers.length === 0"><td colspan="7" class="px-4 py-8 text-center text-dark-textMuted">No players match filters</td></tr>
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
          <div class="text-right text-sm text-dark-textMuted">Click any team to see breakdown</div>
        </div>
        <div class="card-body p-0">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-dark-border/30">
                <tr>
                  <th class="px-3 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase w-10">#</th>
                  <th class="px-3 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase">Team</th>
                  <th class="px-3 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-16">Grade</th>
                  <th class="px-3 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-24">Status</th>
                  <th v-for="pos in uniquePositions" :key="pos" class="px-3 py-3 text-center text-xs font-semibold uppercase w-12" :class="getPositionTextClass(pos)">{{ pos }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-dark-border/30">
                <template v-for="(team, index) in gatedRankedTeams" :key="team.teamKey">
                  <tr :class="[team.isMyTeam ? 'bg-primary/10' : 'hover:bg-dark-border/20', expandedTeamId === team.teamKey ? 'bg-dark-border/30' : '']" class="transition-colors cursor-pointer" @click="expandedTeamId = expandedTeamId === team.teamKey ? null : team.teamKey">
                    <td class="px-3 py-3"><span class="font-bold" :class="index < 3 ? 'text-primary' : 'text-dark-textMuted'">{{ index + 1 }}</span></td>
                    <td class="px-3 py-3">
                      <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-full overflow-hidden bg-dark-border ring-2 flex-shrink-0" :class="team.isMyTeam ? 'ring-primary' : 'ring-dark-border'">
                          <img :src="defaultTeamAvatar" :alt="team.teamName" class="w-full h-full object-cover" />
                        </div>
                        <div class="min-w-0">
                          <div class="font-semibold text-dark-text flex items-center gap-2 truncate">{{ team.teamName }}<span v-if="team.isMyTeam" class="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded">You</span></div>
                          <div class="text-xs text-dark-textMuted truncate">{{ team.managerName }}</div>
                        </div>
                      </div>
                    </td>
                    <td class="px-3 py-3 text-center"><span class="text-xl font-black" :class="getTeamGradeClass(team.overallGrade)">{{ team.overallGrade }}</span></td>
                    <td class="px-3 py-3 text-center"><span class="px-2 py-1 rounded-full text-[10px] font-bold" :class="getTeamStatusClass(team.statusScore)">{{ getTeamStatusLabel(team.statusScore) }}</span></td>
                    <td v-for="pos in uniquePositions" :key="pos" class="px-3 py-3 text-center"><span class="font-bold text-sm" :class="getPositionGradeClass(team.positionGrades[pos] || 'N/A')">{{ team.positionGrades[pos] || 'N/A' }}</span></td>
                  </tr>
                  <tr v-if="expandedTeamId === team.teamKey">
                    <td :colspan="5 + uniquePositions.length" class="p-0">
                      <div class="bg-dark-card/50 border-t border-b border-primary/30">
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
                                  <div class="flex items-center gap-1"><span class="font-medium text-dark-text text-xs truncate">{{ player.full_name }}</span><span v-if="pIdx < getRosterSlotCount(pos)" class="text-[8px] text-primary">★</span></div>
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
      <!-- Scoring Type Toggle -->
      <div class="card">
        <div class="card-body py-4">
          <div class="flex items-center justify-between flex-wrap gap-4">
            <div class="flex items-center gap-3">
              <span class="text-dark-textMuted font-medium">Scoring Type:</span>
              <div class="flex rounded-lg overflow-hidden border border-dark-border/50">
                <button @click="scoringMode = 'daily'" :class="scoringMode === 'daily' ? 'bg-primary text-gray-900' : 'bg-dark-card text-dark-textMuted'" class="px-4 py-2 text-sm font-medium transition-colors">📅 Daily</button>
                <button @click="scoringMode = 'weekly'" :class="scoringMode === 'weekly' ? 'bg-primary text-gray-900' : 'bg-dark-card text-dark-textMuted'" class="px-4 py-2 text-sm font-medium transition-colors">📆 Weekly</button>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <template v-if="scoringMode === 'daily'">
                <div class="flex rounded-lg overflow-hidden border border-dark-border/50">
                  <button @click="setToday" :class="isToday ? 'bg-primary text-gray-900' : 'bg-dark-card text-dark-textMuted hover:bg-dark-border/50'" class="px-4 py-2 text-sm font-medium transition-colors">Today</button>
                  <button @click="setTomorrow" :class="isTomorrow ? 'bg-primary text-gray-900' : 'bg-dark-card text-dark-textMuted hover:bg-dark-border/50'" class="px-4 py-2 text-sm font-medium transition-colors">Tomorrow</button>
                </div>
                <span class="text-dark-text font-semibold">{{ formatSelectedDate }}</span>
              </template>
              <template v-else>
                <span class="text-dark-text font-semibold">Week {{ currentWeek }}</span>
              </template>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Projections Note -->
      <div class="card bg-blue-500/10 border-blue-500/30">
        <div class="card-body py-3">
          <div class="flex items-center gap-3">
            <span class="text-xl">ℹ️</span>
            <span class="text-sm text-blue-300">
              <span class="font-semibold">Projections based on PPG × games.</span>
              Yahoo's premium projections (RotoWire, The BLITZ) are not available via API.
              {{ scoringMode === 'daily' ? 'Use Tomorrow tab to plan waiver pickups before overnight processing.' : 'Weekly mode accounts for games played this week.' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Legend & Filters -->
      <div class="card">
        <div class="card-body py-3">
          <div class="flex items-center justify-between flex-wrap gap-4">
            <div class="flex items-center gap-4">
              <span class="text-dark-textMuted text-sm font-medium">Show:</span>
              <div class="flex rounded-lg overflow-hidden border border-dark-border/50">
                <button 
                  @click="startSitPlayerFilter = 'all'" 
                  :class="startSitPlayerFilter === 'all' ? 'bg-primary text-gray-900' : 'bg-dark-card text-dark-textMuted hover:bg-dark-border/50'" 
                  class="px-3 py-1.5 text-sm font-medium transition-colors"
                >All Players</button>
                <button 
                  @click="startSitPlayerFilter = 'mine'" 
                  :class="startSitPlayerFilter === 'mine' ? 'bg-yellow-500 text-gray-900' : 'bg-dark-card text-dark-textMuted hover:bg-dark-border/50'" 
                  class="px-3 py-1.5 text-sm font-medium transition-colors"
                >My Team + FA</button>
                <button 
                  @click="startSitPlayerFilter = 'fa'" 
                  :class="startSitPlayerFilter === 'fa' ? 'bg-cyan-500 text-gray-900' : 'bg-dark-card text-dark-textMuted hover:bg-dark-border/50'" 
                  class="px-3 py-1.5 text-sm font-medium transition-colors"
                >Free Agents</button>
              </div>
            </div>
            <div class="flex items-center gap-6 text-sm">
              <div class="flex items-center gap-2"><div class="w-4 h-4 rounded bg-yellow-500/30 border-l-2 border-yellow-400"></div><span class="text-dark-textMuted">My Players</span></div>
              <div class="flex items-center gap-2"><div class="w-4 h-4 rounded bg-cyan-500/20 border-l-2 border-cyan-400"></div><span class="text-dark-textMuted">Free Agents</span></div>
            </div>
            <div class="text-sm text-dark-textMuted">
              <span class="text-green-400">Must Start</span> / <span class="text-lime-400">Start</span> / <span class="text-yellow-400">Flex</span> / <span class="text-orange-400">Sit</span> / <span class="text-red-400">Avoid</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="flex gap-6">
        <div class="flex-1 min-w-0">
          <!-- Position Selector -->
          <div class="flex items-center gap-2 mb-4 flex-wrap">
            <button v-for="pos in startSitPositions" :key="pos.id" @click="selectedStartSitPosition = pos.id"
              :class="selectedStartSitPosition === pos.id ? 'bg-primary text-gray-900' : 'bg-dark-border/30 text-dark-textSecondary hover:text-dark-text'"
              class="px-4 py-2 rounded-lg text-sm font-medium transition-all">{{ pos.label }}</button>
          </div>

          <!-- Position Card -->
          <div class="card">
            <div class="card-header">
              <div class="flex items-center gap-3">
                <span class="px-3 py-1 rounded text-sm font-bold" :class="getPositionClass(selectedStartSitPosition)">{{ selectedStartSitPosition }}</span>
                <h2 class="card-title">{{ scoringMode === 'daily' ? "Today's" : "This Week's" }} Rankings</h2>
              </div>
              <div class="text-sm text-dark-textMuted">{{ getStartSitPlayers(selectedStartSitPosition).filter(p => isMyPlayer(p)).length }} rostered</div>
            </div>
            <div class="card-body p-0">
              <div class="overflow-x-auto max-h-[65vh] overflow-y-auto">
                <table class="w-full">
                  <thead class="bg-dark-border/30 sticky top-0 z-10">
                    <tr>
                      <th class="px-3 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase w-14">Rank</th>
                      <th class="px-3 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase">Player</th>
                      <th class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-28">{{ scoringMode === 'daily' ? 'Matchup' : 'Games' }}</th>
                      <th class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-16">PPG</th>
                      <th class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-18"><span class="text-primary">Proj</span></th>
                      <th class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-14">Tier</th>
                      <th class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-24">Verdict</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-dark-border/30">
                    <template v-for="(player, index) in gatedGetStartSitPlayers(selectedStartSitPosition)" :key="player.player_key">
                      <tr v-if="showTierBreak(player, index, selectedStartSitPosition)" class="bg-dark-border/10">
                        <td colspan="7" class="px-4 py-2">
                          <div class="flex items-center gap-2">
                            <div class="h-px flex-1 bg-primary/30"></div>
                            <span class="text-xs font-bold text-primary uppercase">Tier {{ player.tier }}</span>
                            <div class="h-px flex-1 bg-primary/30"></div>
                          </div>
                        </td>
                      </tr>
                      <tr :class="getStartSitRowClass(player)" class="hover:bg-dark-border/20 transition-colors">
                        <td class="px-3 py-2"><span class="font-bold text-lg text-dark-text">{{ index + 1 }}</span></td>
                        <td class="px-3 py-2">
                          <div class="flex items-center gap-3">
                            <div class="relative">
                              <div class="w-10 h-10 rounded-full bg-dark-border overflow-hidden ring-2" :class="getStartSitAvatarRingClass(player)">
                                <img :src="player.headshot || defaultHeadshot" :alt="player.full_name" class="w-full h-full object-cover" @error="handleImageError" />
                              </div>
                              <div v-if="isMyPlayer(player)" class="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center"><span class="text-xs text-gray-900 font-bold">★</span></div>
                              <div v-else-if="isFreeAgent(player)" class="absolute -top-1 -right-1 w-5 h-5 bg-cyan-400 rounded-full flex items-center justify-center"><span class="text-xs text-gray-900 font-bold">+</span></div>
                            </div>
                            <div>
                              <span class="font-semibold" :class="getStartSitPlayerNameClass(player)">{{ player.full_name }}</span>
                              <div class="flex items-center gap-2 text-xs text-dark-textMuted">
                                <span>{{ player.mlb_team || 'FA' }}</span>
                                <span class="text-dark-border">•</span>
                                <template v-if="player.fantasy_team">
                                  <div class="flex items-center gap-1" :class="isMyPlayer(player) ? 'text-yellow-400' : 'text-dark-textMuted'">
                                    <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
                                    <span>{{ player.fantasy_team }}</span>
                                  </div>
                                </template>
                                <span v-else class="text-cyan-400 flex items-center gap-1">
                                  <span>+</span> Free Agent
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td class="px-2 py-2 text-center">
                          <span v-if="scoringMode === 'daily'" class="text-xs font-medium" :class="player.opponent ? 'text-dark-text' : 'text-dark-textMuted italic'">{{ player.opponent || 'No Game' }}</span>
                          <span v-else class="text-xs text-dark-text font-medium">{{ player.gamesThisWeek || 0 }} games</span>
                        </td>
                        <td class="px-2 py-2 text-center"><span class="text-sm text-dark-textMuted">{{ player.ppg?.toFixed(1) || '0.0' }}</span></td>
                        <td class="px-2 py-2 text-center"><span class="font-bold text-sm" :class="getProjectedPointsClass(player.projection)">{{ player.projection?.toFixed(1) || '—' }}</span></td>
                        <td class="px-2 py-2 text-center"><span class="text-xs font-bold" :class="getTierColorClass(player.tier)">{{ player.tier || '—' }}</span></td>
                        <td class="px-2 py-2 text-center"><span class="px-2 py-1 rounded text-xs font-bold" :class="getVerdictClass(player.verdict)">{{ player.verdict }}</span></td>
                      </tr>
                    </template>
                    <tr v-if="gatedGetStartSitPlayers(selectedStartSitPosition).length === 0">
                      <td colspan="7" class="px-4 py-8 text-center text-dark-textMuted">No {{ selectedStartSitPosition }} players found{{ scoringMode === 'daily' ? ' playing today' : '' }}</td>
                    </tr>
                  </tbody>
                </table>
                
                <!-- Gated start/sit overlay -->
                <div v-if="getHiddenStartSitCount(selectedStartSitPosition) > 0" class="relative">
                  <div class="blur-sm select-none pointer-events-none opacity-50 border-t border-dark-border/30">
                    <div v-for="i in Math.min(getHiddenStartSitCount(selectedStartSitPosition), 3)" :key="'startsit-preview-' + i" class="flex items-center gap-4 px-4 py-3 border-b border-dark-border/20">
                      <div class="w-6 h-4 bg-dark-border/50 rounded"></div>
                      <div class="w-10 h-10 rounded-full bg-dark-border/50"></div>
                      <div class="flex-1"><div class="h-4 w-32 bg-dark-border/50 rounded mb-1"></div><div class="h-3 w-20 bg-dark-border/40 rounded"></div></div>
                      <div class="h-6 w-16 bg-dark-border/40 rounded"></div>
                    </div>
                  </div>
                  <div class="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-dark-bg via-dark-bg/95 to-transparent">
                    <div class="text-center p-6">
                      <div class="text-4xl mb-3">🔒</div>
                      <h3 class="text-lg font-bold text-dark-text mb-2">{{ getHiddenStartSitCount(selectedStartSitPosition) }} More Players</h3>
                      <p class="text-sm text-dark-textMuted mb-4">Unlock full start/sit recommendations</p>
                      <button @click="$router.push('/pricing')" class="px-6 py-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-gray-900 font-bold rounded-lg transition-all transform hover:scale-105">Go Ultimate - $4.99/mo</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="w-80 flex-shrink-0">
          <div class="card sticky top-4">
            <div class="card-header py-3">
              <div class="flex items-center gap-2">
                <span class="text-xl">🏆</span>
                <h2 class="text-base font-bold text-dark-text">Suggested Lineup</h2>
              </div>
            </div>
            <div class="card-body p-0">
              <div class="divide-y divide-dark-border/30">
                <div v-for="(slot, idx) in suggestedLineup" :key="idx" class="flex items-center gap-2 px-3 py-2">
                  <div class="w-10 text-center"><span class="px-1.5 py-0.5 rounded text-[10px] font-bold" :class="getPositionClass(slot.position)">{{ slot.position }}</span></div>
                  <div v-if="slot.player" class="flex items-center gap-2 flex-1 min-w-0">
                    <div class="w-8 h-8 rounded-full bg-dark-border overflow-hidden"><img :src="slot.player.headshot || defaultHeadshot" class="w-full h-full object-cover" @error="handleImageError" /></div>
                    <div class="flex-1 min-w-0">
                      <div class="font-medium text-dark-text text-xs truncate">{{ slot.player.full_name }}</div>
                      <div class="text-[10px] text-dark-textMuted">{{ slot.player.opponent || (slot.player.gamesThisWeek + ' games') }}</div>
                    </div>
                    <div class="font-bold text-primary text-sm">{{ slot.player.projection?.toFixed(1) || '—' }}</div>
                  </div>
                  <div v-else class="flex items-center gap-2 flex-1"><div class="w-8 h-8 rounded-full bg-dark-border/30"></div><span class="text-xs text-dark-textMuted italic">Empty</span></div>
                </div>
              </div>
              <div class="px-3 py-3 bg-dark-border/20 border-t border-dark-border/30">
                <div class="flex items-center justify-between">
                  <span class="text-dark-textMuted text-sm">Projected Total</span>
                  <span class="text-xl font-bold text-primary">{{ suggestedLineupTotal.toFixed(1) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

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
import { useFeatureAccess } from '@/composables/useFeatureAccess'
import SimulatedDataBanner from '@/components/SimulatedDataBanner.vue'

const leagueStore = useLeagueStore()
const authStore = useAuthStore()
const { hasPremiumAccess } = useFeatureAccess()

const tabs = [
  { id: 'ros', name: 'Rest of Season', icon: '📊' },
  { id: 'teams', name: 'Teams', icon: '👥' },
  { id: 'startsit', name: 'Start/Sit', icon: '📅' }
]
const activeTab = ref('ros')
const isLoading = ref(true)
const loadingMessage = ref('Loading...')
const expandedTeamId = ref<string | null>(null)
const allPlayers = ref<any[]>([])
const myTeamKey = ref<string | null>(null)
const selectedPositions = ref<string[]>(['C', '1B', '2B', '3B', 'SS', 'OF', 'SP', 'RP'])
const showOnlyMyPlayers = ref(false)
const showOnlyFreeAgents = ref(false)
const defaultHeadshot = 'https://a.espncdn.com/combiner/i?img=/i/headshots/nophoto.png&w=200&h=145'
const defaultTeamAvatar = 'https://s.yimg.com/cv/apiv2/default/mlb/mlb_2_g.png'

const scoringMode = ref<'daily' | 'weekly'>('daily')
const selectedDate = ref(new Date())
const currentWeek = computed(() => {
  // Calculate approximate MLB week (season typically starts late March/early April)
  const seasonStart = new Date(new Date().getFullYear(), 2, 28) // March 28
  const now = new Date()
  const diffTime = now.getTime() - seasonStart.getTime()
  const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7))
  return Math.max(1, Math.min(26, diffWeeks)) // MLB season is ~26 weeks
})
const selectedStartSitPosition = ref('C')
const startSitPlayerFilter = ref<'all' | 'mine' | 'fa'>('all')
const startSitPositions = [
  { id: 'C', label: 'C' }, { id: '1B', label: '1B' }, { id: '2B', label: '2B' }, { id: '3B', label: '3B' },
  { id: 'SS', label: 'SS' }, { id: 'OF', label: 'OF' }, { id: 'SP', label: 'SP' }, { id: 'RP', label: 'RP' }, { id: 'Util', label: 'UTIL' }
]

const rosterPositions = ref<any[]>([])
const teamsData = ref<any[]>([])
const numTeams = computed(() => teamsData.value.length || 12)
const positionFilters = [
  { id: 'C', label: 'C' }, { id: '1B', label: '1B' }, { id: '2B', label: '2B' }, { id: '3B', label: '3B' },
  { id: 'SS', label: 'SS' }, { id: 'OF', label: 'OF' }, { id: 'SP', label: 'SP' }, { id: 'RP', label: 'RP' }
]
const vorBaselines = ref<Record<string, number>>({ C: 12, '1B': 15, '2B': 15, '3B': 15, SS: 15, OF: 40, SP: 50, RP: 25 })
const positionBaselines = ref<Record<string, number>>({})

const rosterRequirements = computed(() => {
  const reqs: Record<string, number> = { C: 0, '1B': 0, '2B': 0, '3B': 0, SS: 0, OF: 0, SP: 0, RP: 0, Util: 0 }
  rosterPositions.value.forEach((pos: any) => { const p = pos.position_type || pos.position; if (reqs[p] !== undefined) reqs[p]++ })
  return reqs
})

const displayRosterPositions = computed(() => {
  const display: { pos: string; count: number }[] = []
  const order = ['C', '1B', '2B', '3B', 'SS', 'OF', 'SP', 'RP', 'Util']
  order.forEach(pos => { const c = getRosterSlotCount(pos); if (c > 0) display.push({ pos, count: c }) })
  return display
})

const uniquePositions = computed(() => {
  const set = new Set<string>()
  allPlayers.value.forEach(p => { const pos = p.position?.split(',')[0]?.trim(); if (pos) set.add(pos) })
  return ['C', '1B', '2B', '3B', 'SS', 'OF', 'SP', 'RP'].filter(pos => set.has(pos))
})

const filteredPlayers = computed(() => {
  let players = [...allPlayers.value]
  if (selectedPositions.value.length > 0 && selectedPositions.value.length < positionFilters.length) {
    players = players.filter(p => selectedPositions.value.some(pos => p.position?.includes(pos)))
  }
  if (showOnlyMyPlayers.value) players = players.filter(p => isMyPlayer(p))
  if (showOnlyFreeAgents.value) players = players.filter(p => isFreeAgent(p))
  return players
})

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
  let players = allPlayers.value.filter(p => position === 'Util' || p.position?.includes(position))
  
  // Apply player filter
  if (startSitPlayerFilter.value === 'mine') {
    players = players.filter(p => isMyPlayer(p) || isFreeAgent(p))
  } else if (startSitPlayerFilter.value === 'fa') {
    players = players.filter(p => isFreeAgent(p))
  }
  
  // Use the selected date to generate deterministic "games" data
  // In a real implementation, this would come from MLB schedule API
  const dateStr = selectedDate.value.toISOString().split('T')[0]
  
  players = players.map(p => {
    // Create deterministic hash from player key + date
    const hashInput = (p.player_key || '') + dateStr
    const hash = hashInput.split('').reduce((a: number, b: string) => ((a << 5) - a) + b.charCodeAt(0), 0)
    
    // Daily mode: ~60% chance of having a game on any given day
    const hasGameToday = Math.abs(hash) % 10 < 6
    
    // Weekly mode: 4-7 games per week (realistic MLB schedule)
    const gamesThisWeek = 4 + (Math.abs(hash) % 4)
    
    // Calculate projection
    const ppg = p.ppg || 0
    let projection = 0
    
    if (scoringMode.value === 'daily') {
      projection = hasGameToday ? ppg : 0
    } else {
      projection = ppg * gamesThisWeek
    }
    
    // Generate opponent based on hash (deterministic per player per date)
    const opponents = ['NYY', 'BOS', 'LAD', 'ATL', 'HOU', 'SD', 'PHI', 'SEA', 'TB', 'MIN', 'CHC', 'STL']
    const opponent = hasGameToday ? `vs ${opponents[Math.abs(hash) % opponents.length]}` : null
    
    // Calculate tier and verdict based on projection
    let tier = 5
    let verdict = 'Avoid'
    
    if (scoringMode.value === 'daily') {
      if (!hasGameToday) { tier = 6; verdict = 'No Game' }
      else if (ppg >= 5) { tier = 1; verdict = 'Must Start' }
      else if (ppg >= 3.5) { tier = 2; verdict = 'Start' }
      else if (ppg >= 2.5) { tier = 3; verdict = 'Flex' }
      else if (ppg >= 1.5) { tier = 4; verdict = 'Sit' }
      else { tier = 5; verdict = 'Avoid' }
    } else {
      // Weekly: based on total projected points
      if (projection >= 30) { tier = 1; verdict = 'Must Start' }
      else if (projection >= 22) { tier = 2; verdict = 'Start' }
      else if (projection >= 15) { tier = 3; verdict = 'Flex' }
      else if (projection >= 8) { tier = 4; verdict = 'Sit' }
      else { tier = 5; verdict = 'Avoid' }
    }
    
    return { ...p, projection, opponent, gamesThisWeek, tier, verdict, hasGame: hasGameToday }
  })
  
  // In daily mode, sort by: has game first, then by projection
  if (scoringMode.value === 'daily') {
    players.sort((a, b) => {
      if (a.hasGame && !b.hasGame) return -1
      if (!a.hasGame && b.hasGame) return 1
      return (b.projection || 0) - (a.projection || 0)
    })
  } else {
    players.sort((a, b) => (b.projection || 0) - (a.projection || 0))
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
  const order = ['C', '1B', '2B', '3B', 'SS', 'OF', 'OF', 'OF', 'SP', 'SP', 'RP', 'RP', 'Util']
  
  const dateStr = selectedDate.value.toISOString().split('T')[0]
  
  order.forEach(pos => {
    let eligible = myPlayers.filter(p => !used.has(p.player_key) && (pos === 'Util' || p.position?.includes(pos)))
    eligible = eligible.map(p => {
      const hashInput = (p.player_key || '') + dateStr
      const hash = hashInput.split('').reduce((a: number, b: string) => ((a << 5) - a) + b.charCodeAt(0), 0)
      const hasGameToday = Math.abs(hash) % 10 < 6
      const gamesThisWeek = 4 + (Math.abs(hash) % 4)
      const ppg = p.ppg || 0
      const projection = scoringMode.value === 'daily' ? (hasGameToday ? ppg : 0) : ppg * gamesThisWeek
      const opponents = ['NYY', 'BOS', 'LAD', 'ATL', 'HOU']
      return { ...p, projection, opponent: hasGameToday ? `vs ${opponents[Math.abs(hash) % 5]}` : null, gamesThisWeek }
    }).filter(p => scoringMode.value === 'weekly' || p.projection > 0) // Only include players with games in daily mode
    .sort((a, b) => (b.projection || 0) - (a.projection || 0))
    const best = eligible[0]
    if (best) { used.add(best.player_key); slots.push({ position: pos, player: best }) }
    else slots.push({ position: pos, player: null })
  })
  return slots
})

const suggestedLineupTotal = computed(() => suggestedLineup.value.reduce((sum, s) => sum + (s.player?.projection || 0), 0))

interface TeamRanking { teamKey: string; teamName: string; managerName: string; isMyTeam: boolean; players: any[]; positionGrades: Record<string, string>; overallGrade: string; statusScore: number }

const rankedTeams = computed<TeamRanking[]>(() => {
  const gradeValues: Record<string, number> = { 'A+': 100, 'A': 92, 'A-': 85, 'B+': 78, 'B': 70, 'B-': 62, 'C+': 55, 'C': 47, 'C-': 40, 'D+': 32, 'D': 25, 'D-': 18, 'F': 10 }
  const teamMap = new Map<string, any[]>()
  allPlayers.value.forEach(p => { if (p.fantasy_team_key) { if (!teamMap.has(p.fantasy_team_key)) teamMap.set(p.fantasy_team_key, []); teamMap.get(p.fantasy_team_key)!.push(p) } })
  const teams: TeamRanking[] = []
  teamMap.forEach((players, teamKey) => {
    const first = players[0]
    const byPos: Record<string, any[]> = {}
    players.forEach(p => { const pos = p.position?.split(',')[0]?.trim() || 'Util'; if (!byPos[pos]) byPos[pos] = []; byPos[pos].push(p) })
    Object.values(byPos).forEach(arr => arr.sort((a, b) => (b.ppg || 0) - (a.ppg || 0)))
    const positionGrades: Record<string, string> = {}
    uniquePositions.value.forEach(pos => { positionGrades[pos] = calculateStarterGrade(byPos[pos] || [], getRosterSlotCount(pos)) })
    let totalVal = 0, totalWt = 0
    Object.entries(positionGrades).forEach(([pos, grade]) => { const wt = getRosterSlotCount(pos) || 1; totalVal += (gradeValues[grade] || 50) * wt; totalWt += wt })
    const avgVal = totalWt > 0 ? totalVal / totalWt : 50
    const allTeamPlayers = Object.values(byPos).flat()
    const n = numTeams.value
    const elites = allTeamPlayers.filter(p => p.positionRank && p.positionRank <= n * 0.5).length
    const starters = allTeamPlayers.filter(p => p.positionRank && p.positionRank <= n).length
    const starScore = Math.min(100, elites * 15 + starters * 5)
    const grades = Object.values(positionGrades)
    const depthScore = Math.max(0, 100 - grades.filter(g => g === 'F').length * 20 - grades.filter(g => g.startsWith('D')).length * 8)
    const statusScore = Math.round(avgVal * 0.5 + starScore * 0.25 + depthScore * 0.25)
    teams.push({ teamKey, teamName: first?.fantasy_team || 'Unknown', managerName: first?.manager_name || 'Unknown', isMyTeam: teamKey === myTeamKey.value, players: allTeamPlayers, positionGrades, overallGrade: getGradeFromValue(avgVal), statusScore })
  })
  return teams.sort((a, b) => b.statusScore - a.statusScore)
})

// Gated ranked teams - show top 3 for non-premium users
const gatedRankedTeams = computed(() => {
  if (hasPremiumAccess.value) return rankedTeams.value
  return rankedTeams.value.slice(0, 3)
})

const hiddenTeamsCount = computed(() => {
  if (hasPremiumAccess.value) return 0
  return Math.max(0, rankedTeams.value.length - 3)
})

function getRosterSlotCount(pos: string): number { const r = rosterRequirements.value; if (r[pos] > 0) return r[pos]; const d: Record<string, number> = { C: 1, '1B': 1, '2B': 1, '3B': 1, SS: 1, OF: 3, SP: 2, RP: 2, Util: 1 }; return d[pos] || 1 }
function calculateStarterGrade(players: any[], numStarters: number): string { if (!players.length) return 'F'; const n = numTeams.value || 12; const starters = players.slice(0, Math.max(numStarters, 1)); const valid = starters.filter(p => p.positionRank); if (!valid.length) { const avg = starters.reduce((s, p) => s + (p.ppg || 0), 0) / starters.length; if (avg >= 5) return 'A'; if (avg >= 4) return 'B+'; if (avg >= 3) return 'B'; if (avg >= 2) return 'C+'; return 'C' }; const avgRank = valid.reduce((s, p) => s + p.positionRank, 0) / valid.length; const pct = avgRank / Math.max(n * numStarters, 1); if (pct <= 0.25) return 'A+'; if (pct <= 0.4) return 'A'; if (pct <= 0.55) return 'A-'; if (pct <= 0.7) return 'B+'; if (pct <= 0.85) return 'B'; if (pct <= 1) return 'B-'; if (pct <= 1.2) return 'C+'; if (pct <= 1.4) return 'C'; if (pct <= 1.6) return 'C-'; if (pct <= 1.8) return 'D+'; if (pct <= 2) return 'D'; if (pct <= 2.5) return 'D-'; return 'F' }
function getGradeFromValue(v: number): string { if (v >= 95) return 'A+'; if (v >= 88) return 'A'; if (v >= 82) return 'A-'; if (v >= 75) return 'B+'; if (v >= 68) return 'B'; if (v >= 60) return 'B-'; if (v >= 52) return 'C+'; if (v >= 44) return 'C'; if (v >= 36) return 'C-'; if (v >= 28) return 'D+'; if (v >= 20) return 'D'; if (v >= 12) return 'D-'; return 'F' }
function getTeamPositionPlayers(team: TeamRanking, pos: string): any[] { return team.players.filter(p => p.position?.split(',')[0]?.trim() === pos).sort((a, b) => (b.ppg || 0) - (a.ppg || 0)) }

function selectAllPositions() { selectedPositions.value = selectedPositions.value.length === positionFilters.length ? [] : positionFilters.map(p => p.id) }
function togglePositionFilter(pos: string) { const i = selectedPositions.value.indexOf(pos); i >= 0 ? selectedPositions.value.splice(i, 1) : selectedPositions.value.push(pos) }
function isMyPlayer(p: any) { return p.fantasy_team_key === myTeamKey.value }
function isFreeAgent(p: any) { return !p.fantasy_team }
function handleImageError(e: Event) { (e.target as HTMLImageElement).src = defaultHeadshot }
function getRowClass(p: any) { return isMyPlayer(p) ? 'bg-primary/10 border-l-2 border-primary' : isFreeAgent(p) ? 'bg-cyan-500/5 border-l-2 border-cyan-400' : '' }
function getAvatarRingClass(p: any) { return isMyPlayer(p) ? 'ring-primary' : isFreeAgent(p) ? 'ring-cyan-400' : 'ring-dark-border' }
function getPlayerNameClass(p: any) { return isMyPlayer(p) ? 'text-primary' : isFreeAgent(p) ? 'text-cyan-400' : 'text-dark-text' }
function getStartSitRowClass(p: any) { return isMyPlayer(p) ? 'bg-yellow-500/10 border-l-4 border-yellow-400' : isFreeAgent(p) ? 'bg-cyan-500/5 border-l-4 border-cyan-400' : '' }
function getStartSitAvatarRingClass(p: any) { return isMyPlayer(p) ? 'ring-yellow-400' : isFreeAgent(p) ? 'ring-cyan-400' : 'ring-dark-border' }
function getStartSitPlayerNameClass(p: any) { return isMyPlayer(p) ? 'text-yellow-400' : isFreeAgent(p) ? 'text-cyan-400' : 'text-dark-text' }
function getPositionClass(pos: string) { const p = pos?.split(',')[0]?.trim() || pos; const c: Record<string, string> = { C: 'bg-purple-500/30 text-purple-400', '1B': 'bg-red-500/30 text-red-400', '2B': 'bg-orange-500/30 text-orange-400', '3B': 'bg-yellow-500/30 text-yellow-400', SS: 'bg-green-500/30 text-green-400', OF: 'bg-blue-500/30 text-blue-400', SP: 'bg-cyan-500/30 text-cyan-400', RP: 'bg-pink-500/30 text-pink-400', Util: 'bg-gray-500/30 text-gray-400' }; return c[p] || 'bg-dark-border/50 text-dark-textMuted' }
function getPositionTextClass(pos: string) { const c: Record<string, string> = { C: 'text-purple-400', '1B': 'text-red-400', '2B': 'text-orange-400', '3B': 'text-yellow-400', SS: 'text-green-400', OF: 'text-blue-400', SP: 'text-cyan-400', RP: 'text-pink-400', Util: 'text-gray-400' }; return c[pos] || 'text-dark-textMuted' }
function getTeamGradeClass(g: string) { if (g.startsWith('A')) return 'text-green-400'; if (g.startsWith('B')) return 'text-blue-400'; if (g.startsWith('C')) return 'text-yellow-400'; if (g.startsWith('D')) return 'text-orange-400'; return 'text-red-400' }
function getTeamStatusClass(s: number) { if (s >= 70) return 'bg-green-500/30 text-green-400'; if (s >= 55) return 'bg-blue-500/30 text-blue-400'; if (s >= 40) return 'bg-yellow-500/30 text-yellow-400'; return 'bg-red-500/30 text-red-400' }
function getTeamStatusLabel(s: number) { if (s >= 70) return '🏆 Contender'; if (s >= 55) return '⚔️ Competitive'; if (s >= 40) return '🎭 Pretender'; return '🔨 Rebuilding' }
function getPositionGradeClass(g: string) { if (g === 'N/A') return 'text-dark-textMuted'; if (g.startsWith('A')) return 'text-green-400'; if (g.startsWith('B')) return 'text-blue-400'; if (g.startsWith('C')) return 'text-yellow-400'; if (g.startsWith('D')) return 'text-orange-400'; return 'text-red-400' }
function getProjectedPointsClass(proj: number) { if (proj >= 5) return 'text-green-400'; if (proj >= 3) return 'text-lime-400'; if (proj >= 1) return 'text-yellow-400'; return 'text-dark-textMuted' }
function getTierColorClass(t: number) { if (t === 1) return 'text-green-400'; if (t === 2) return 'text-lime-400'; if (t === 3) return 'text-yellow-400'; if (t === 4) return 'text-orange-400'; return 'text-red-400' }
function getVerdictClass(v: string) { if (v === 'Must Start') return 'bg-green-500/30 text-green-400'; if (v === 'Start') return 'bg-lime-500/30 text-lime-400'; if (v === 'Flex') return 'bg-yellow-500/30 text-yellow-400'; if (v === 'Sit') return 'bg-orange-500/30 text-orange-400'; if (v === 'No Game') return 'bg-dark-border/30 text-dark-textMuted'; return 'bg-red-500/30 text-red-400' }

function calculatePositionBaselines() { const byPos: Record<string, any[]> = {}; allPlayers.value.forEach(p => { const pos = p.position?.split(',')[0]?.trim(); if (pos) { if (!byPos[pos]) byPos[pos] = []; byPos[pos].push(p) } }); Object.entries(byPos).forEach(([pos, players]) => { players.sort((a, b) => (b.ppg || 0) - (a.ppg || 0)); positionBaselines.value[pos] = players[Math.min((vorBaselines.value[pos] || 15) - 1, players.length - 1)]?.ppg || 0 }) }

function recalculateRankings() {
  calculatePositionBaselines()
  allPlayers.value.forEach(p => { const pos = p.position?.split(',')[0]?.trim(); p.vor = (p.ppg || 0) - (positionBaselines.value[pos] || 0) })
  allPlayers.value.sort((a, b) => (b.ppg || 0) - (a.ppg || 0))
  allPlayers.value.forEach((p, i) => p.rosRank = i + 1)
  const posCounts: Record<string, number> = {}
  allPlayers.value.forEach(p => { const pos = p.position?.split(',')[0]?.trim() || 'X'; posCounts[pos] = (posCounts[pos] || 0) + 1; p.positionRank = posCounts[pos] })
}

async function loadProjections() {
  isLoading.value = true
  loadingMessage.value = 'Connecting to Yahoo...'
  try {
    const leagueKey = leagueStore.activeLeagueId
    if (!leagueKey || !authStore.user?.id) { isLoading.value = false; return }
    await yahooService.initialize(authStore.user.id)
    loadingMessage.value = 'Loading league settings...'
    try { const settings = await yahooService.getLeagueSettings(leagueKey); rosterPositions.value = settings?.roster_positions || [] } catch (e) { console.log('Could not load roster settings') }
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
    const teamKeys = new Set(rostered.map(p => p.fantasy_team_key).filter(Boolean))
    teamsData.value = Array.from(teamKeys).map(k => ({ team_key: k }))
    recalculateRankings()
  } catch (e) { console.error('Error:', e); loadingMessage.value = 'Error loading data' }
  finally { isLoading.value = false }
}

watch(() => leagueStore.activeLeagueId, (id) => { if (id && leagueStore.activePlatform === 'yahoo') loadProjections() }, { immediate: true })
onMounted(() => { if (leagueStore.activeLeagueId && leagueStore.activePlatform === 'yahoo') loadProjections() })
</script>
