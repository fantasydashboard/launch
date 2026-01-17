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

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <LoadingSpinner size="xl" :message="loadingMessage" />
    </div>

    <!-- REST OF SEASON TAB -->
    <template v-else-if="activeTab === 'ros'">
      <div class="card bg-gradient-to-r from-green-500/10 to-cyan-500/10 border-green-500/30">
        <div class="card-body py-3">
          <div class="flex items-center gap-3">
            <span class="text-xl">✓</span>
            <span class="font-semibold text-green-400">Live Yahoo Data</span>
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
                <tr v-for="(player, idx) in gatedFilteredPlayers" :key="player.player_key" :class="getRowClass(player)" class="hover:bg-dark-border/20 transition-colors">
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
                          <span v-if="player.fantasy_team" :class="isMyPlayer(player) ? 'text-yellow-400' : ''">{{ player.fantasy_team }}</span>
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
      <!-- Scoring Type Toggle -->
      <div class="card">
        <div class="card-body py-4">
          <div class="flex items-center justify-between flex-wrap gap-4">
            <div class="flex items-center gap-3">
              <span class="text-dark-textMuted font-medium">Scoring Type:</span>
              <div class="flex rounded-lg overflow-hidden border border-dark-border/50">
                <button @click="scoringMode = 'daily'" :class="scoringMode === 'daily' ? 'bg-yellow-400 text-gray-900' : 'bg-dark-card text-dark-textMuted'" class="px-4 py-2 text-sm font-medium transition-colors">📅 Daily</button>
                <button @click="scoringMode = 'weekly'" :class="scoringMode === 'weekly' ? 'bg-yellow-400 text-gray-900' : 'bg-dark-card text-dark-textMuted'" class="px-4 py-2 text-sm font-medium transition-colors">📆 Weekly</button>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <template v-if="scoringMode === 'daily'">
                <div class="flex rounded-lg overflow-hidden border border-dark-border/50">
                  <button @click="setToday" :class="isToday ? 'bg-yellow-400 text-gray-900' : 'bg-dark-card text-dark-textMuted hover:bg-dark-border/50'" class="px-4 py-2 text-sm font-medium transition-colors">Today</button>
                  <button @click="setTomorrow" :class="isTomorrow ? 'bg-yellow-400 text-gray-900' : 'bg-dark-card text-dark-textMuted hover:bg-dark-border/50'" class="px-4 py-2 text-sm font-medium transition-colors">Tomorrow</button>
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
      <div class="card bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30">
        <div class="card-body py-3">
          <div class="flex items-center gap-3">
            <span class="text-xl">ℹ️</span>
            <span class="text-sm text-purple-300">
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
                  :class="startSitPlayerFilter === 'all' ? 'bg-yellow-400 text-gray-900' : 'bg-dark-card text-dark-textMuted hover:bg-dark-border/50'" 
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
              :class="selectedStartSitPosition === pos.id ? 'bg-yellow-400 text-gray-900' : 'bg-dark-border/30 text-dark-textSecondary hover:text-dark-text'"
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
                      <th class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-18"><span class="text-yellow-400">Proj</span></th>
                      <th class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-14">Tier</th>
                      <th class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-24">Verdict</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-dark-border/30">
                    <template v-for="(player, index) in gatedGetStartSitPlayers(selectedStartSitPosition)" :key="player.player_key">
                      <tr v-if="showTierBreak(player, index, selectedStartSitPosition)" class="bg-dark-border/10">
                        <td colspan="7" class="px-4 py-2">
                          <div class="flex items-center gap-2">
                            <div class="h-px flex-1 bg-yellow-400/30"></div>
                            <span class="text-xs font-bold text-yellow-400 uppercase">Tier {{ player.tier }}</span>
                            <div class="h-px flex-1 bg-yellow-400/30"></div>
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
                    <div class="font-bold text-yellow-400 text-sm">{{ slot.player.projection?.toFixed(1) || '—' }}</div>
                  </div>
                  <div v-else class="flex items-center gap-2 flex-1"><div class="w-8 h-8 rounded-full bg-dark-border/30"></div><span class="text-xs text-dark-textMuted italic">Empty</span></div>
                </div>
              </div>
              <div class="px-3 py-3 bg-dark-border/20 border-t border-dark-border/30">
                <div class="flex items-center justify-between">
                  <span class="text-dark-textMuted text-sm">Projected Total</span>
                  <span class="text-xl font-bold text-yellow-400">{{ suggestedLineupTotal.toFixed(1) }}</span>
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useAuthStore } from '@/stores/auth'
import { yahooService } from '@/services/yahoo'
import { useFeatureAccess } from '@/composables/useFeatureAccess'
import SimulatedDataBanner from '@/components/SimulatedDataBanner.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const leagueStore = useLeagueStore()
const authStore = useAuthStore()
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

// Platform detection for badge
const isSleeper = computed(() => leagueStore.activePlatform === 'sleeper')
const isEspn = computed(() => leagueStore.activePlatform === 'espn')
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

const tabs = [
  { id: 'ros', name: 'Rest of Season', icon: '📊' },
  { id: 'teams', name: 'Teams', icon: '👥' },
  { id: 'startsit', name: 'Start/Sit', icon: '📅' },
  { id: 'trade', name: 'Trade Analyzer', icon: '🔄' }
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
const startSitPlayerFilter = ref<'all' | 'mine' | 'fa'>('mine')
const startSitPositions = [
  { id: 'C', label: 'C' }, { id: '1B', label: '1B' }, { id: '2B', label: '2B' }, { id: '3B', label: '3B' },
  { id: 'SS', label: 'SS' }, { id: 'OF', label: 'OF' }, { id: 'SP', label: 'SP' }, { id: 'RP', label: 'RP' }, { id: 'Util', label: 'UTIL' }
]

// Sorting state for Rest of Season tab
const rosSortColumn = ref<string>('rosRank')
const rosSortDirection = ref<'asc' | 'desc'>('asc')

// Sorting state for Teams tab
const teamsSortColumn = ref<string>('statusScore')
const teamsSortDirection = ref<'asc' | 'desc'>('desc')

const rosterPositions = ref<any[]>([])
const teamsData = ref<any[]>([])
const numTeams = computed(() => teamsData.value.length || 12)
const positionFilters = [
  { id: 'C', label: 'C' }, { id: '1B', label: '1B' }, { id: '2B', label: '2B' }, { id: '3B', label: '3B' },
  { id: 'SS', label: 'SS' }, { id: 'OF', label: 'OF' }, { id: 'SP', label: 'SP' }, { id: 'RP', label: 'RP' }
]
const vorBaselines = ref<Record<string, number>>({ C: 12, '1B': 15, '2B': 15, '3B': 15, SS: 15, OF: 40, SP: 50, RP: 25 })
const positionBaselines = ref<Record<string, number>>({})

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
    teams.push({ teamKey, teamName: teamData?.name || first?.fantasy_team || 'Unknown', managerName: first?.manager_name || 'Unknown', logoUrl: teamData?.team_logos?.[0]?.url || teamData?.logo_url || '', isMyTeam: teamKey === myTeamKey.value, players: allTeamPlayers, positionGrades, overallGrade: getGradeFromValue(avgVal), statusScore })
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

function getRosterSlotCount(pos: string): number { const r = rosterRequirements.value; if (r[pos] > 0) return r[pos]; const d: Record<string, number> = { C: 1, '1B': 1, '2B': 1, '3B': 1, SS: 1, OF: 3, SP: 2, RP: 2, Util: 1 }; return d[pos] || 1 }
function calculateStarterGrade(players: any[], numStarters: number): string { if (!players.length) return 'F'; const n = numTeams.value || 12; const starters = players.slice(0, Math.max(numStarters, 1)); const valid = starters.filter(p => p.positionRank); if (!valid.length) { const avg = starters.reduce((s, p) => s + (p.ppg || 0), 0) / starters.length; if (avg >= 5) return 'A'; if (avg >= 4) return 'B+'; if (avg >= 3) return 'B'; if (avg >= 2) return 'C+'; return 'C' }; const avgRank = valid.reduce((s, p) => s + p.positionRank, 0) / valid.length; const pct = avgRank / Math.max(n * numStarters, 1); if (pct <= 0.25) return 'A+'; if (pct <= 0.4) return 'A'; if (pct <= 0.55) return 'A-'; if (pct <= 0.7) return 'B+'; if (pct <= 0.85) return 'B'; if (pct <= 1) return 'B-'; if (pct <= 1.2) return 'C+'; if (pct <= 1.4) return 'C'; if (pct <= 1.6) return 'C-'; if (pct <= 1.8) return 'D+'; if (pct <= 2) return 'D'; if (pct <= 2.5) return 'D-'; return 'F' }
function getGradeFromValue(v: number): string { if (v >= 95) return 'A+'; if (v >= 88) return 'A'; if (v >= 82) return 'A-'; if (v >= 75) return 'B+'; if (v >= 68) return 'B'; if (v >= 60) return 'B-'; if (v >= 52) return 'C+'; if (v >= 44) return 'C'; if (v >= 36) return 'C-'; if (v >= 28) return 'D+'; if (v >= 20) return 'D'; if (v >= 12) return 'D-'; return 'F' }
function getTeamPositionPlayers(team: TeamRanking, pos: string): any[] { return team.players.filter(p => p.position?.split(',')[0]?.trim() === pos).sort((a, b) => (b.ppg || 0) - (a.ppg || 0)) }

function selectAllPositions() { selectedPositions.value = selectedPositions.value.length === positionFilters.length ? [] : positionFilters.map(p => p.id) }
function togglePositionFilter(pos: string) { const i = selectedPositions.value.indexOf(pos); i >= 0 ? selectedPositions.value.splice(i, 1) : selectedPositions.value.push(pos) }
function isMyPlayer(p: any) { return p.fantasy_team_key === myTeamKey.value }
function isFreeAgent(p: any) { return !p.fantasy_team }
function handleImageError(e: Event) { (e.target as HTMLImageElement).src = defaultHeadshot }
function getRowClass(p: any) { return isMyPlayer(p) ? 'bg-yellow-500/10 border-l-2 border-yellow-400' : isFreeAgent(p) ? 'bg-cyan-500/5 border-l-2 border-cyan-400' : '' }
function getAvatarRingClass(p: any) { return isMyPlayer(p) ? 'ring-yellow-400' : isFreeAgent(p) ? 'ring-cyan-400' : 'ring-dark-border' }
function getPlayerNameClass(p: any) { return isMyPlayer(p) ? 'text-yellow-400' : isFreeAgent(p) ? 'text-cyan-400' : 'text-dark-text' }
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
    const leagueKey = effectiveLeagueKey.value
    if (!leagueKey || !authStore.user?.id) { isLoading.value = false; return }
    await yahooService.initialize(authStore.user.id)
    loadingMessage.value = 'Loading league settings...'
    try { const settings = await yahooService.getLeagueSettings(leagueKey); rosterPositions.value = settings?.roster_positions || [] } catch (e) { console.log('Could not load roster settings') }
    
    // Load teams first (like Category page does)
    loadingMessage.value = 'Loading teams...'
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
    
    loadingMessage.value = 'Loading rostered players...'
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
    
    loadingMessage.value = 'Loading free agents...'
    const fa = await yahooService.getTopFreeAgents(leagueKey, 100)
    const combined = [...rostered, ...fa]
    combined.forEach(p => { p.ppg = p.total_points > 0 ? p.total_points / 25 : 0 })
    allPlayers.value = combined
    
    // Debug logging
    console.log('=== Trade Analyzer Debug ===')
    console.log('myTeamKey:', myTeamKey.value)
    console.log('teamsData count:', teamsData.value.length)
    const myPlayers = allPlayers.value.filter(p => p.fantasy_team_key === myTeamKey.value)
    console.log('Players on my team:', myPlayers.length)
    
    recalculateRankings()
  } catch (e) { console.error('Error:', e); loadingMessage.value = 'Error loading data' }
  finally { isLoading.value = false }
}

watch(() => leagueStore.activeLeagueId, (id) => { if (id && leagueStore.activePlatform === 'yahoo') loadProjections() }, { immediate: true })

// Watch for currentLeague changes (happens when fallback to previous season occurs)
watch(() => leagueStore.currentLeague?.league_id, (newKey, oldKey) => {
  if (newKey && newKey !== oldKey) {
    console.log(`Projections: League changed from ${oldKey} to ${newKey}, reloading...`)
    loadProjections()
  }
})

onMounted(() => { if (effectiveLeagueKey.value && leagueStore.activePlatform === 'yahoo') loadProjections() })

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
