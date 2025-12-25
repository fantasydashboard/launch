<template>
  <div class="space-y-8">
    <!-- Settings Gear at Top -->
    <div class="flex justify-end">
      <router-link to="/settings" class="p-2 rounded-lg bg-dark-card border border-dark-border hover:border-primary transition-colors">
        <svg class="w-6 h-6 text-dark-textMuted hover:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </router-link>
    </div>

    <!-- Hero Section - Current Week Matchups -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-dark-card to-dark-bg border border-dark-border">
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent"></div>
      
      <div class="relative p-6 md:p-8">
        <div class="flex items-center gap-3 mb-6">
          <div class="w-1.5 h-10 bg-primary rounded-full"></div>
          <div>
            <h1 class="text-3xl md:text-4xl font-black text-dark-text tracking-tight">{{ leagueName }}</h1>
            <p class="text-dark-textMuted text-base mt-1">{{ currentSeason }} Season • Week {{ currentWeek }}</p>
          </div>
        </div>

        <div v-if="isLoading" class="flex items-center justify-center py-12">
          <div class="text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-4 border-primary mx-auto mb-3"></div>
            <p class="text-dark-textMuted text-sm">Loading matchups...</p>
          </div>
        </div>

        <!-- Matchups Grid -->
        <div v-else-if="thisWeekMatchups.length > 0" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div 
            v-for="matchup in thisWeekMatchups" 
            :key="matchup.matchup_id" 
            class="bg-dark-bg/60 backdrop-blur rounded-xl p-4 border border-dark-border/50 hover:border-primary/50 hover:bg-dark-bg/80 transition-all cursor-pointer group"
          >
            <!-- Team 1 -->
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-3 flex-1 min-w-0">
                <div class="relative">
                  <img 
                    :src="matchup.team1.logo_url || defaultAvatar" 
                    :alt="matchup.team1.name" 
                    :class="['w-10 h-10 rounded-full border-2 transition-colors object-cover', matchup.team1.is_my_team ? 'border-primary ring-2 ring-primary/30' : 'border-dark-border group-hover:border-primary/50']"
                    @error="handleImageError" 
                  />
                  <div v-if="matchup.team1.is_my_team" class="absolute -top-0.5 -left-0.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center shadow">
                    <span class="text-[8px] text-gray-900 font-bold">★</span>
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-bold text-sm text-dark-text truncate">{{ matchup.team1.name }}</div>
                  <div class="text-xs text-dark-textMuted">{{ getTeamRecord(matchup.team1.team_key) }}</div>
                </div>
              </div>
              <div class="text-right pl-3">
                <div class="text-xl font-black text-dark-text">{{ (matchup.team1.points || 0).toFixed(1) }}</div>
                <div v-if="matchup.team1.projected_points" class="text-xs text-primary font-medium">
                  proj {{ matchup.team1.projected_points.toFixed(0) }}
                </div>
              </div>
            </div>
            
            <div class="h-px bg-dark-border/50 my-2"></div>
            
            <!-- Team 2 -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3 flex-1 min-w-0">
                <div class="relative">
                  <img 
                    :src="matchup.team2.logo_url || defaultAvatar" 
                    :alt="matchup.team2.name" 
                    :class="['w-10 h-10 rounded-full border-2 transition-colors object-cover', matchup.team2.is_my_team ? 'border-primary ring-2 ring-primary/30' : 'border-dark-border group-hover:border-primary/50']"
                    @error="handleImageError" 
                  />
                  <div v-if="matchup.team2.is_my_team" class="absolute -top-0.5 -left-0.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center shadow">
                    <span class="text-[8px] text-gray-900 font-bold">★</span>
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-bold text-sm text-dark-text truncate">{{ matchup.team2.name }}</div>
                  <div class="text-xs text-dark-textMuted">{{ getTeamRecord(matchup.team2.team_key) }}</div>
                </div>
              </div>
              <div class="text-right pl-3">
                <div class="text-xl font-black text-dark-text">{{ (matchup.team2.points || 0).toFixed(1) }}</div>
                <div v-if="matchup.team2.projected_points" class="text-xs text-primary font-medium">
                  proj {{ matchup.team2.projected_points.toFixed(0) }}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="text-center py-8 text-dark-textMuted">No matchups found for this week</div>
      </div>
    </div>

    <!-- League Leaders -->
    <div>
      <h2 class="text-2xl font-black text-dark-text mb-4 flex items-center gap-2">
        <span class="text-2xl">👑</span>League Leaders
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Best Record -->
        <div 
          @click="openLeaderModal('bestRecord')"
          class="group relative overflow-hidden rounded-xl bg-dark-card border border-green-500/20 hover:border-green-500/40 transition-all cursor-pointer"
        >
          <div class="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
          <div class="relative p-5">
            <div class="text-xs uppercase tracking-wider text-green-400 font-bold mb-3">Best Record</div>
            <div class="flex items-center gap-3 mb-3">
              <img 
                :src="leaders.bestRecord?.logo_url || defaultAvatar" 
                :alt="leaders.bestRecord?.name" 
                class="w-12 h-12 rounded-full border-2 border-green-500/50 object-cover" 
                @error="handleImageError" 
              />
              <div class="flex-1 min-w-0">
                <div class="font-bold text-lg text-dark-text truncate">{{ leaders.bestRecord?.name || 'N/A' }}</div>
                <div class="text-sm text-dark-textMuted">{{ leaders.bestRecord?.points_for ? (leaders.bestRecord.points_for / Math.max(leaders.bestRecord.wins + leaders.bestRecord.losses, 1)).toFixed(1) + ' PPW' : '' }}</div>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <div class="text-2xl font-black text-green-400">{{ leaders.bestRecord ? `${leaders.bestRecord.wins}-${leaders.bestRecord.losses}` : '0-0' }}</div>
              <div class="text-xs text-green-400/70 group-hover:text-green-400 transition-colors">Click for details →</div>
            </div>
          </div>
        </div>

        <!-- Most Points -->
        <div 
          @click="openLeaderModal('mostPoints')"
          class="group relative overflow-hidden rounded-xl bg-dark-card border border-yellow-500/20 hover:border-yellow-500/40 transition-all cursor-pointer"
        >
          <div class="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
          <div class="relative p-5">
            <div class="text-xs uppercase tracking-wider text-yellow-400 font-bold mb-3">Most Points</div>
            <div class="flex items-center gap-3 mb-3">
              <img 
                :src="leaders.mostPoints?.logo_url || defaultAvatar" 
                :alt="leaders.mostPoints?.name" 
                class="w-12 h-12 rounded-full border-2 border-yellow-500/50 object-cover" 
                @error="handleImageError" 
              />
              <div class="flex-1 min-w-0">
                <div class="font-bold text-lg text-dark-text truncate">{{ leaders.mostPoints?.name || 'N/A' }}</div>
                <div class="text-sm text-dark-textMuted">{{ leaders.mostPoints ? `${leaders.mostPoints.wins}-${leaders.mostPoints.losses}` : '' }}</div>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <div class="text-2xl font-black text-yellow-400">{{ leaders.mostPoints?.points_for?.toFixed(1) || '0.0' }}</div>
              <div class="text-xs text-yellow-400/70 group-hover:text-yellow-400 transition-colors">Click for details →</div>
            </div>
          </div>
        </div>
        
        <!-- Best All-Play -->
        <div 
          @click="openLeaderModal('bestAllPlay')"
          class="group relative overflow-hidden rounded-xl bg-dark-card border border-blue-500/20 hover:border-blue-500/40 transition-all cursor-pointer"
        >
          <div class="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
          <div class="relative p-5">
            <div class="text-xs uppercase tracking-wider text-blue-400 font-bold mb-3">Best All-Play</div>
            <div class="flex items-center gap-3 mb-3">
              <img 
                :src="leaders.bestAllPlay?.logo_url || defaultAvatar" 
                :alt="leaders.bestAllPlay?.name" 
                class="w-12 h-12 rounded-full border-2 border-blue-500/50 object-cover" 
                @error="handleImageError" 
              />
              <div class="flex-1 min-w-0">
                <div class="font-bold text-lg text-dark-text truncate">{{ leaders.bestAllPlay?.name || 'N/A' }}</div>
                <div class="text-sm text-dark-textMuted">{{ leaders.bestAllPlay ? `${leaders.bestAllPlay.wins}-${leaders.bestAllPlay.losses}` : '' }}</div>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <div class="text-2xl font-black text-blue-400">{{ leaders.bestAllPlay?.all_play_wins || 0 }}-{{ leaders.bestAllPlay?.all_play_losses || 0 }}</div>
              <div class="text-xs text-blue-400/70 group-hover:text-blue-400 transition-colors">Click for details →</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content Grid: Standings + Quick Stats -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- LEFT: Standings Table (2/3 width) -->
      <div class="lg:col-span-2">
        <div class="card">
          <div class="card-header flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-2xl">🏆</span>
              <h2 class="card-title">League Standings</h2>
            </div>
            <div class="flex items-center gap-3">
              <!-- Division Toggle -->
              <button 
                v-if="hasDivisions"
                @click="showDivisions = !showDivisions"
                class="text-xs px-3 py-1.5 rounded-lg transition-colors"
                :class="showDivisions ? 'bg-primary/20 text-primary' : 'bg-dark-border text-dark-textMuted hover:text-dark-text'"
              >
                {{ showDivisions ? 'By Division' : 'Overall' }}
              </button>
              <span class="text-sm text-dark-textMuted">{{ teamsWithStats.length }} Teams</span>
            </div>
          </div>
          <div class="card-body">
            <div v-if="teamsWithStats.length === 0" class="text-center py-8">
              <p class="text-dark-textMuted">No standings data available</p>
            </div>
            
            <!-- Division View -->
            <template v-else-if="showDivisions && hasDivisions">
              <div v-for="(teams, divName) in teamsByDivision" :key="divName" class="mb-6 last:mb-0">
                <div class="flex items-center gap-2 mb-3 pb-2 border-b border-dark-border">
                  <span class="text-primary">●</span>
                  <h3 class="font-bold text-dark-text">{{ divName }}</h3>
                </div>
                <div class="overflow-x-auto">
                  <table class="w-full">
                    <thead>
                      <tr class="text-left text-xs text-dark-textMuted uppercase border-b border-dark-border">
                        <th class="py-2 px-3 cursor-pointer hover:text-primary" @click="setSortColumn('rank')">
                          Rank <span v-if="sortColumn === 'rank'">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                        </th>
                        <th class="py-2 px-3">Team</th>
                        <th class="py-2 px-3 text-center cursor-pointer hover:text-primary" @click="setSortColumn('record')">
                          Record <span v-if="sortColumn === 'record'">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                        </th>
                        <th class="py-2 px-3 text-center hidden sm:table-cell cursor-pointer hover:text-primary" @click="setSortColumn('allPlay')">
                          All-Play <span v-if="sortColumn === 'allPlay'">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                        </th>
                        <th class="py-2 px-3 text-right hidden sm:table-cell cursor-pointer hover:text-primary" @click="setSortColumn('pf')">
                          PF <span v-if="sortColumn === 'pf'">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                        </th>
                        <th class="py-2 px-3 text-right hidden md:table-cell cursor-pointer hover:text-primary" @click="setSortColumn('pa')">
                          PA <span v-if="sortColumn === 'pa'">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr 
                        v-for="(team, idx) in teams" 
                        :key="team.team_key"
                        @click="openTeamDetailModal(team)"
                        class="border-b border-dark-border/50 hover:bg-dark-border/20 transition-colors cursor-pointer"
                        :class="{ 'bg-primary/5': team.is_my_team }"
                      >
                        <td class="py-2 px-3">
                          <span 
                            class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                            :class="getRankClass(idx + 1)"
                          >
                            {{ idx + 1 }}
                          </span>
                        </td>
                        <td class="py-2 px-3">
                          <div class="flex items-center gap-2">
                            <img 
                              :src="team.logo_url || defaultAvatar" 
                              :alt="team.name"
                              class="w-7 h-7 rounded-full border border-dark-border object-cover"
                              @error="handleImageError"
                            />
                            <div class="flex items-center gap-2">
                              <span class="font-semibold text-dark-text text-sm">{{ team.name }}</span>
                              <span v-if="team.is_my_team" class="text-xs bg-primary/20 text-primary px-1 py-0.5 rounded">You</span>
                              <svg class="w-3 h-3 text-primary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                        </td>
                        <td class="py-2 px-3 text-center">
                          <span class="font-bold text-sm" :class="getRecordClass(team)">
                            {{ team.wins }}-{{ team.losses }}{{ team.ties > 0 ? `-${team.ties}` : '' }}
                          </span>
                        </td>
                        <td class="py-2 px-3 text-center hidden sm:table-cell">
                          <span class="text-sm" :class="getAllPlayClass(team)">
                            {{ team.all_play_wins }}-{{ team.all_play_losses }}
                          </span>
                        </td>
                        <td class="py-2 px-3 text-right hidden sm:table-cell">
                          <span class="font-medium text-sm" :class="getPointsForClass(team)">
                            {{ team.points_for?.toFixed(1) || '0.0' }}
                          </span>
                        </td>
                        <td class="py-2 px-3 text-right hidden md:table-cell">
                          <span class="text-sm" :class="getPointsAgainstClass(team)">
                            {{ team.points_against?.toFixed(1) || '0.0' }}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </template>
            
            <!-- Overall View -->
            <template v-else>
              <div class="overflow-x-auto">
                <table class="w-full">
                  <thead>
                    <tr class="text-left text-xs text-dark-textMuted uppercase border-b border-dark-border">
                      <th class="py-3 px-4 cursor-pointer hover:text-primary" @click="setSortColumn('rank')">
                        Rank <span v-if="sortColumn === 'rank'">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                      </th>
                      <th class="py-3 px-4">Team</th>
                      <th class="py-3 px-4 text-center cursor-pointer hover:text-primary" @click="setSortColumn('record')">
                        Record <span v-if="sortColumn === 'record'">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                      </th>
                      <th class="py-3 px-4 text-center hidden sm:table-cell cursor-pointer hover:text-primary" @click="setSortColumn('allPlay')">
                        All-Play <span v-if="sortColumn === 'allPlay'">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                      </th>
                      <th class="py-3 px-4 text-right hidden sm:table-cell cursor-pointer hover:text-primary" @click="setSortColumn('pf')">
                        PF <span v-if="sortColumn === 'pf'">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                      </th>
                      <th class="py-3 px-4 text-right hidden md:table-cell cursor-pointer hover:text-primary" @click="setSortColumn('pa')">
                        PA <span v-if="sortColumn === 'pa'">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr 
                      v-for="team in sortedTeams" 
                      :key="team.team_key"
                      @click="openTeamDetailModal(team)"
                      class="border-b border-dark-border/50 hover:bg-dark-border/20 transition-colors cursor-pointer"
                      :class="{ 'bg-primary/5': team.is_my_team }"
                    >
                      <td class="py-3 px-4">
                        <span 
                          class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                          :class="getRankClass(team.rank)"
                        >
                          {{ team.rank }}
                        </span>
                      </td>
                      <td class="py-3 px-4">
                        <div class="flex items-center gap-3">
                          <img 
                            :src="team.logo_url || defaultAvatar" 
                            :alt="team.name"
                            class="w-8 h-8 rounded-full border border-dark-border object-cover"
                            @error="handleImageError"
                          />
                          <div class="flex items-center gap-2">
                            <span class="font-semibold text-dark-text">{{ team.name }}</span>
                            <span v-if="team.is_my_team" class="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">You</span>
                            <svg class="w-4 h-4 text-primary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </td>
                      <td class="py-3 px-4 text-center">
                        <span class="font-bold" :class="getRecordClass(team)">
                          {{ team.wins }}-{{ team.losses }}{{ team.ties > 0 ? `-${team.ties}` : '' }}
                        </span>
                      </td>
                      <td class="py-3 px-4 text-center hidden sm:table-cell">
                        <span :class="getAllPlayClass(team)">
                          {{ team.all_play_wins }}-{{ team.all_play_losses }}
                        </span>
                      </td>
                      <td class="py-3 px-4 text-right hidden sm:table-cell">
                        <span class="font-medium" :class="getPointsForClass(team)">
                          {{ team.points_for?.toFixed(1) || '0.0' }}
                        </span>
                      </td>
                      <td class="py-3 px-4 text-right hidden md:table-cell">
                        <span :class="getPointsAgainstClass(team)">
                          {{ team.points_against?.toFixed(1) || '0.0' }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- RIGHT: Quick Stats (1/3 width) -->
      <div class="space-y-6">
        <!-- Quick Stats Card -->
        <div class="card">
          <div class="card-header">
            <div class="flex items-center gap-2">
              <span class="text-2xl">📊</span>
              <h2 class="card-title">Quick Stats</h2>
            </div>
          </div>
          <div class="card-body">
            <div class="space-y-3">
              <!-- Luckiest Team -->
              <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-border/20 transition-colors">
                <div class="w-9 h-9 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                  <img v-if="luckiestTeam" :src="luckiestTeam.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs text-dark-textMuted uppercase tracking-wide">🍀 Luckiest</div>
                  <div class="font-semibold text-dark-text truncate text-sm">{{ luckiestTeam?.name || 'N/A' }}</div>
                </div>
                <div class="text-sm font-bold text-green-400">{{ luckiestTeam ? '+' + luckiestTeam.luckScore?.toFixed(0) : '-' }}</div>
              </div>
              <!-- Hottest Team -->
              <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-border/20 transition-colors">
                <div class="w-9 h-9 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                  <img v-if="hottestTeam" :src="hottestTeam.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs text-dark-textMuted uppercase tracking-wide">🔥 Hottest (Last 3)</div>
                  <div class="font-semibold text-dark-text truncate text-sm">{{ hottestTeam?.name || 'N/A' }}</div>
                </div>
                <div class="text-sm font-bold text-orange-400">{{ hottestTeam ? hottestTeam.last3Avg?.toFixed(1) : '-' }}</div>
              </div>
              <!-- Most Transactions -->
              <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-border/20 transition-colors">
                <div class="w-9 h-9 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                  <img v-if="mostActiveTeam" :src="mostActiveTeam.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs text-dark-textMuted uppercase tracking-wide">Most Transactions</div>
                  <div class="font-semibold text-dark-text truncate text-sm">{{ mostActiveTeam?.name || 'N/A' }}</div>
                </div>
                <div class="text-sm font-bold text-blue-400">{{ mostActiveTeam?.transactions ?? '-' }}</div>
              </div>
              
              <div class="border-t border-dark-border my-2"></div>
              
              <!-- Unluckiest Team -->
              <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-border/20 transition-colors">
                <div class="w-9 h-9 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                  <img v-if="unluckiestTeam" :src="unluckiestTeam.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs text-dark-textMuted uppercase tracking-wide">😢 Unluckiest</div>
                  <div class="font-semibold text-dark-text truncate text-sm">{{ unluckiestTeam?.name || 'N/A' }}</div>
                </div>
                <div class="text-sm font-bold text-red-400">{{ unluckiestTeam ? unluckiestTeam.luckScore?.toFixed(0) : '-' }}</div>
              </div>
              <!-- Coldest Team -->
              <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-border/20 transition-colors">
                <div class="w-9 h-9 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                  <img v-if="coldestTeam" :src="coldestTeam.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs text-dark-textMuted uppercase tracking-wide">❄️ Coldest (Last 3)</div>
                  <div class="font-semibold text-dark-text truncate text-sm">{{ coldestTeam?.name || 'N/A' }}</div>
                </div>
                <div class="text-sm font-bold text-cyan-400">{{ coldestTeam ? coldestTeam.last3Avg?.toFixed(1) : '-' }}</div>
              </div>
              <!-- Least Transactions -->
              <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-border/20 transition-colors">
                <div class="w-9 h-9 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                  <img v-if="leastActiveTeam" :src="leastActiveTeam.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs text-dark-textMuted uppercase tracking-wide">Least Transactions</div>
                  <div class="font-semibold text-dark-text truncate text-sm">{{ leastActiveTeam?.name || 'N/A' }}</div>
                </div>
                <div class="text-sm font-bold text-purple-400">{{ leastActiveTeam?.transactions ?? '-' }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Standings Chart -->
    <div class="card">
      <div class="card-header">
        <div class="flex items-center gap-2">
          <span class="text-2xl">📈</span>
          <h2 class="card-title">Standings Over Time</h2>
        </div>
        <p class="text-sm text-dark-textMuted mt-1">Track how team rankings have changed throughout the season</p>
      </div>
      <div class="card-body">
        <div v-if="isLoadingChart" class="flex items-center justify-center py-12">
          <div class="text-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
            <p class="text-dark-textMuted text-sm">Loading chart data...</p>
          </div>
        </div>
        <div v-else-if="chartSeries.length > 0" class="relative">
          <apexchart 
            type="line" 
            height="400" 
            :options="chartOptions" 
            :series="chartSeries" 
          />
          <!-- Team avatars at end of lines -->
          <div 
            v-for="team in teamsWithStats" 
            :key="'avatar-' + team.team_key"
            class="absolute pointer-events-none" 
            :style="getAvatarPosition(team)"
          >
            <div class="relative">
              <img 
                :src="team.logo_url || defaultAvatar" 
                :alt="team.name"
                :class="['w-6 h-6 sm:w-7 sm:h-7 rounded-full ring-2 object-cover', team.is_my_team ? 'ring-primary' : 'ring-cyan-500/70']"
                @error="handleImageError" 
              />
              <div v-if="team.is_my_team" class="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full flex items-center justify-center">
                <span class="text-[6px] text-gray-900 font-bold">★</span>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="text-center py-12 text-dark-textMuted">
          <p>Not enough data to show standings over time</p>
          <p class="text-sm mt-1">Chart will appear after a few weeks of play</p>
        </div>
      </div>
    </div>

    <!-- Platform Badge -->
    <div class="flex justify-center">
      <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-600/10 border border-purple-600/30">
        <span class="text-sm font-bold text-purple-400">Y!</span>
        <span class="text-sm text-purple-300">Yahoo Fantasy Baseball • Points League</span>
      </div>
    </div>

    <!-- Leader Modal -->
    <Teleport to="body">
      <div 
        v-if="showLeaderModal" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="closeLeaderModal"
      >
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
        <div class="relative bg-dark-elevated rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-dark-border">
          <!-- Header -->
          <div class="sticky top-0 z-10 px-6 py-4 border-b border-dark-border bg-dark-elevated flex items-center justify-between">
            <div>
              <h3 class="text-xl font-bold text-dark-text">{{ leaderModalTitle }}</h3>
              <p class="text-sm text-dark-textMuted">{{ currentSeason }} Season Leaderboard</p>
            </div>
            <button @click="closeLeaderModal" class="p-2 rounded-lg hover:bg-dark-border/50 transition-colors">
              <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <!-- Winner Highlight -->
          <div class="p-6 border-b border-dark-border" :class="leaderModalGradient">
            <div class="flex items-center gap-4">
              <img 
                :src="leaderModalData.leader?.logo_url || defaultAvatar" 
                :alt="leaderModalData.leader?.name"
                class="w-16 h-16 rounded-full ring-4 object-cover"
                :class="leaderModalRingColor"
                @error="handleImageError"
              />
              <div class="flex-1">
                <div class="text-xl font-bold text-dark-text">{{ leaderModalData.leader?.name }}</div>
                <div class="text-sm text-dark-textMuted">{{ leaderModalData.leader?.wins }}-{{ leaderModalData.leader?.losses }}</div>
              </div>
              <div class="text-right">
                <div class="text-3xl font-black" :class="leaderModalTextColor">{{ leaderModalValue }}</div>
                <div class="text-sm text-dark-textMuted">{{ leaderModalUnit }}</div>
              </div>
            </div>
          </div>
          
          <!-- Comparison Bar Chart -->
          <div class="p-6">
            <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-4">All Teams Comparison</h4>
            <div class="space-y-3">
              <div 
                v-for="(team, index) in leaderModalData.comparison" 
                :key="team.team_key"
                class="flex items-center gap-3"
              >
                <div class="w-6 text-center">
                  <span 
                    class="text-sm font-bold"
                    :class="index === 0 ? leaderModalTextColor : 'text-dark-textMuted'"
                  >{{ index + 1 }}</span>
                </div>
                <img 
                  :src="team.logo_url || defaultAvatar" 
                  :alt="team.name"
                  class="w-8 h-8 rounded-full object-cover"
                  @error="handleImageError"
                />
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-sm font-medium text-dark-text truncate">{{ team.name }}</span>
                  </div>
                  <div class="h-2.5 bg-dark-border rounded-full overflow-hidden">
                    <div 
                      class="h-full rounded-full transition-all duration-500"
                      :class="index === 0 ? leaderModalBarColor : 'bg-primary/60'"
                      :style="{ width: `${(team.value / leaderModalData.maxValue) * 100}%` }"
                    ></div>
                  </div>
                </div>
                <div class="w-20 text-right">
                  <span class="text-sm font-semibold" :class="index === 0 ? leaderModalTextColor : 'text-dark-text'">
                    {{ formatLeaderValue(team.value) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Quick Stats -->
          <div class="px-6 pb-6">
            <div class="grid grid-cols-3 gap-4 p-4 bg-dark-border/30 rounded-xl">
              <div class="text-center">
                <div class="text-lg font-bold text-dark-text">{{ teamsWithStats.length }}</div>
                <div class="text-xs text-dark-textMuted">Teams</div>
              </div>
              <div class="text-center">
                <div class="text-lg font-bold text-dark-text">{{ leaderModalData.average?.toFixed(1) }}</div>
                <div class="text-xs text-dark-textMuted">Average</div>
              </div>
              <div class="text-center">
                <div class="text-lg font-bold text-dark-text">{{ leaderModalData.spread?.toFixed(1) }}</div>
                <div class="text-xs text-dark-textMuted">Spread</div>
              </div>
            </div>
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
                :src="selectedTeam?.logo_url || defaultAvatar" 
                :alt="selectedTeam?.name"
                class="w-12 h-12 rounded-full ring-2 ring-primary object-cover"
                @error="handleImageError"
              />
              <div>
                <h3 class="text-xl font-bold text-dark-text">{{ selectedTeam?.name }}</h3>
                <p class="text-sm text-dark-textMuted">{{ currentSeason }} Season Details</p>
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
                <div class="text-2xl font-black text-dark-text">{{ selectedTeam?.wins }}-{{ selectedTeam?.losses }}</div>
                <div class="text-xs text-dark-textMuted">Record</div>
              </div>
              <div class="bg-dark-border/30 rounded-xl p-4 text-center">
                <div class="text-2xl font-black text-primary">{{ selectedTeam?.rank }}</div>
                <div class="text-xs text-dark-textMuted">Rank</div>
              </div>
              <div class="bg-dark-border/30 rounded-xl p-4 text-center">
                <div class="text-2xl font-black text-dark-text">{{ selectedTeam?.all_play_wins }}-{{ selectedTeam?.all_play_losses }}</div>
                <div class="text-xs text-dark-textMuted">All-Play</div>
              </div>
              <div class="bg-dark-border/30 rounded-xl p-4 text-center">
                <div class="text-2xl font-black text-dark-text">{{ teamDetailStats.ppw }}</div>
                <div class="text-xs text-dark-textMuted">PPW</div>
              </div>
            </div>
          </div>
          
          <!-- Additional Stats -->
          <div class="p-6">
            <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-4">Season Breakdown</h4>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div class="bg-dark-border/20 rounded-xl p-4">
                <div class="text-lg font-bold text-green-400">{{ teamDetailStats.highScore }}</div>
                <div class="text-xs text-dark-textMuted">High Score</div>
              </div>
              <div class="bg-dark-border/20 rounded-xl p-4">
                <div class="text-lg font-bold text-red-400">{{ teamDetailStats.lowScore }}</div>
                <div class="text-xs text-dark-textMuted">Low Score</div>
              </div>
              <div class="bg-dark-border/20 rounded-xl p-4">
                <div class="text-lg font-bold text-dark-text">{{ teamDetailStats.totalPoints }}</div>
                <div class="text-xs text-dark-textMuted">Total Points</div>
              </div>
              <div class="bg-dark-border/20 rounded-xl p-4">
                <div class="text-lg font-bold text-dark-text">{{ teamDetailStats.pointsAgainst }}</div>
                <div class="text-xs text-dark-textMuted">Points Against</div>
              </div>
              <div class="bg-dark-border/20 rounded-xl p-4">
                <div class="text-lg font-bold" :class="parseFloat(teamDetailStats.pointDiff) >= 0 ? 'text-green-400' : 'text-red-400'">
                  {{ parseFloat(teamDetailStats.pointDiff) >= 0 ? '+' : '' }}{{ teamDetailStats.pointDiff }}
                </div>
                <div class="text-xs text-dark-textMuted">Point Differential</div>
              </div>
              <div class="bg-dark-border/20 rounded-xl p-4">
                <div class="text-lg font-bold text-dark-text">{{ teamDetailStats.winStreak }}</div>
                <div class="text-xs text-dark-textMuted">Current Streak</div>
              </div>
            </div>
            
            <!-- Week-by-Week Results -->
            <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mt-6 mb-4">Week-by-Week Results</h4>
            <div class="flex flex-wrap gap-2">
              <div 
                v-for="(result, idx) in teamDetailStats.weeklyResults" 
                :key="idx"
                class="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                :class="result.won ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'"
                :title="`Week ${idx + 1}: ${result.points.toFixed(1)} pts`"
              >
                {{ result.won ? 'W' : 'L' }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { yahooService } from '@/services/yahoo'
import { useAuthStore } from '@/stores/auth'

const leagueStore = useLeagueStore()
const authStore = useAuthStore()

const defaultAvatar = 'https://s.yimg.com/cv/apiv2/default/mlb/mlb_1_100.png'

// Modal state
const showLeaderModal = ref(false)
const showTeamDetailModal = ref(false)
const activeLeaderType = ref<'bestRecord' | 'mostPoints' | 'bestAllPlay'>('bestRecord')
const selectedTeam = ref<any>(null)

// UI state
const showDivisions = ref(false)
const sortColumn = ref<'rank' | 'record' | 'allPlay' | 'pf' | 'pa'>('rank')
const sortDirection = ref<'asc' | 'desc'>('asc')
const isLoadingChart = ref(false)

// Data state
const allPlayRecords = ref<Map<string, { wins: number; losses: number }>>(new Map())
const weeklyScoresMap = ref<Map<string, { week: number; points: number; won: boolean }[]>>(new Map())
const transactionCounts = ref<Map<string, number>>(new Map())
const standingsOverTime = ref<Map<number, Map<string, number>>>(new Map())
const allMatchups = ref<Map<number, any[]>>(new Map())

const leagueName = computed(() => leagueStore.currentLeague?.name || 'Yahoo League')
const currentSeason = computed(() => leagueStore.currentLeague?.season || new Date().getFullYear().toString())
const currentWeek = computed(() => leagueStore.currentLeague?.settings?.leg || 1)
const isLoading = computed(() => leagueStore.isLoading)

// Transform matchups into a more usable format
const thisWeekMatchups = computed(() => {
  const matchups = leagueStore.yahooMatchups || []
  return matchups.map(matchup => {
    const team1 = matchup.teams[0] || {}
    const team2 = matchup.teams[1] || {}
    return { matchup_id: matchup.matchup_id, team1: { ...team1 }, team2: { ...team2 } }
  })
})

// Teams with all calculated stats
const teamsWithStats = computed(() => {
  const teams = leagueStore.yahooTeams || []
  return teams.map(team => {
    const allPlay = allPlayRecords.value.get(team.team_key) || { wins: 0, losses: 0 }
    const weeklyScores = weeklyScoresMap.value.get(team.team_key) || []
    const transactions = transactionCounts.value.get(team.team_key) || 0
    
    // Calculate last 3 weeks average
    const last3 = weeklyScores.slice(-3)
    const last3Avg = last3.length > 0 ? last3.reduce((sum, w) => sum + w.points, 0) / last3.length : 0
    
    return {
      ...team,
      all_play_wins: allPlay.wins,
      all_play_losses: allPlay.losses,
      transactions,
      last3Avg,
      weeklyScores
    }
  })
})

// Check if league has divisions
const hasDivisions = computed(() => {
  // Yahoo leagues can have divisions - check settings
  return false // TODO: Get from league settings
})

// Group teams by division
const teamsByDivision = computed(() => {
  if (!hasDivisions.value) return {}
  const divisions: Record<string, any[]> = {}
  // TODO: Implement division grouping
  return divisions
})

// Sorted teams based on current sort
const sortedTeams = computed(() => {
  const teams = [...teamsWithStats.value]
  
  teams.sort((a, b) => {
    let comparison = 0
    switch (sortColumn.value) {
      case 'rank':
        comparison = (a.rank || 99) - (b.rank || 99)
        break
      case 'record':
        const aWinPct = (a.wins || 0) / Math.max((a.wins || 0) + (a.losses || 0), 1)
        const bWinPct = (b.wins || 0) / Math.max((b.wins || 0) + (b.losses || 0), 1)
        comparison = bWinPct - aWinPct
        break
      case 'allPlay':
        comparison = (b.all_play_wins || 0) - (a.all_play_wins || 0)
        break
      case 'pf':
        comparison = (b.points_for || 0) - (a.points_for || 0)
        break
      case 'pa':
        comparison = (a.points_against || 0) - (b.points_against || 0)
        break
    }
    return sortDirection.value === 'asc' ? comparison : -comparison
  })
  
  return teams
})

// Quick stats computed
const bestAllPlayTeam = computed(() => teamsWithStats.value.length ? [...teamsWithStats.value].sort((a, b) => b.all_play_wins - a.all_play_wins)[0] : null)
const worstAllPlayTeam = computed(() => teamsWithStats.value.length ? [...teamsWithStats.value].sort((a, b) => a.all_play_wins - b.all_play_wins)[0] : null)
const hottestTeam = computed(() => {
  const teams = teamsWithStats.value.filter(t => t.last3Avg > 0)
  return teams.length ? [...teams].sort((a, b) => b.last3Avg - a.last3Avg)[0] : null
})
const coldestTeam = computed(() => {
  const teams = teamsWithStats.value.filter(t => t.last3Avg > 0)
  return teams.length ? [...teams].sort((a, b) => a.last3Avg - b.last3Avg)[0] : null
})
const mostActiveTeam = computed(() => teamsWithStats.value.length ? [...teamsWithStats.value].sort((a, b) => (b.transactions || 0) - (a.transactions || 0))[0] : null)
const leastActiveTeam = computed(() => teamsWithStats.value.length ? [...teamsWithStats.value].sort((a, b) => (a.transactions || 0) - (b.transactions || 0))[0] : null)

// Luckiest Team: Best record relative to all-play (record better than expected based on all-play)
// Formula: (actual win%) - (all-play win%) * 100
// Higher positive = luckier (winning more than expected)
const luckiestTeam = computed(() => {
  const teams = teamsWithStats.value.filter(t => 
    (t.wins || 0) + (t.losses || 0) > 0 && 
    (t.all_play_wins || 0) + (t.all_play_losses || 0) > 0
  )
  if (!teams.length) return null
  
  return [...teams].map(t => {
    const actualWinPct = (t.wins || 0) / Math.max((t.wins || 0) + (t.losses || 0), 1)
    const allPlayWinPct = (t.all_play_wins || 0) / Math.max((t.all_play_wins || 0) + (t.all_play_losses || 0), 1)
    const luckScore = (actualWinPct - allPlayWinPct) * 100
    return { ...t, luckScore }
  }).sort((a, b) => b.luckScore - a.luckScore)[0]
})

// Unluckiest Team: Worst record relative to all-play (record worse than expected)
// Lowest (most negative) luck score = unluckiest
const unluckiestTeam = computed(() => {
  const teams = teamsWithStats.value.filter(t => 
    (t.wins || 0) + (t.losses || 0) > 0 && 
    (t.all_play_wins || 0) + (t.all_play_losses || 0) > 0
  )
  if (!teams.length) return null
  
  return [...teams].map(t => {
    const actualWinPct = (t.wins || 0) / Math.max((t.wins || 0) + (t.losses || 0), 1)
    const allPlayWinPct = (t.all_play_wins || 0) / Math.max((t.all_play_wins || 0) + (t.all_play_losses || 0), 1)
    const luckScore = (actualWinPct - allPlayWinPct) * 100
    return { ...t, luckScore }
  }).sort((a, b) => a.luckScore - b.luckScore)[0]
})

// Best/Worst calculations for highlighting
const bestRecord = computed(() => {
  if (!teamsWithStats.value.length) return null
  return teamsWithStats.value.reduce((best, team) => 
    ((team.wins || 0) > (best.wins || 0) || ((team.wins || 0) === (best.wins || 0) && (team.losses || 0) < (best.losses || 0))) ? team : best
  )
})
const worstRecord = computed(() => {
  if (!teamsWithStats.value.length) return null
  return teamsWithStats.value.reduce((worst, team) => 
    ((team.wins || 0) < (worst.wins || 0) || ((team.wins || 0) === (worst.wins || 0) && (team.losses || 0) > (worst.losses || 0))) ? team : worst
  )
})
const bestAllPlay = computed(() => {
  if (!teamsWithStats.value.length) return null
  return teamsWithStats.value.reduce((best, team) => (team.all_play_wins || 0) > (best.all_play_wins || 0) ? team : best)
})
const worstAllPlay = computed(() => {
  if (!teamsWithStats.value.length) return null
  return teamsWithStats.value.reduce((worst, team) => (team.all_play_wins || 0) < (worst.all_play_wins || 0) ? team : worst)
})
const bestPointsFor = computed(() => {
  if (!teamsWithStats.value.length) return null
  return teamsWithStats.value.reduce((best, team) => (team.points_for || 0) > (best.points_for || 0) ? team : best)
})
const worstPointsFor = computed(() => {
  if (!teamsWithStats.value.length) return null
  return teamsWithStats.value.reduce((worst, team) => (team.points_for || 0) < (worst.points_for || 0) ? team : worst)
})
const bestPointsAgainst = computed(() => {
  if (!teamsWithStats.value.length) return null
  return teamsWithStats.value.reduce((best, team) => (team.points_against || 999999) < (best.points_against || 999999) ? team : best)
})
const worstPointsAgainst = computed(() => {
  if (!teamsWithStats.value.length) return null
  return teamsWithStats.value.reduce((worst, team) => (team.points_against || 0) > (worst.points_against || 0) ? team : worst)
})

// Leaders for cards
const leaders = computed(() => {
  const teams = teamsWithStats.value
  if (teams.length === 0) return { bestRecord: null, mostPoints: null, bestAllPlay: null }
  
  const bestRecordTeam = [...teams].sort((a, b) => {
    const aWinPct = (a.wins || 0) / Math.max((a.wins || 0) + (a.losses || 0), 1)
    const bWinPct = (b.wins || 0) / Math.max((b.wins || 0) + (b.losses || 0), 1)
    if (bWinPct !== aWinPct) return bWinPct - aWinPct
    return (b.points_for || 0) - (a.points_for || 0)
  })[0]
  
  const mostPoints = [...teams].sort((a, b) => (b.points_for || 0) - (a.points_for || 0))[0]
  
  const bestAllPlayTeam = [...teams].sort((a, b) => {
    const aWinPct = (a.all_play_wins || 0) / Math.max((a.all_play_wins || 0) + (a.all_play_losses || 0), 1)
    const bWinPct = (b.all_play_wins || 0) / Math.max((b.all_play_wins || 0) + (b.all_play_losses || 0), 1)
    if (bWinPct !== aWinPct) return bWinPct - aWinPct
    return (b.all_play_wins || 0) - (a.all_play_wins || 0)
  })[0]
  
  return { bestRecord: bestRecordTeam, mostPoints, bestAllPlay: bestAllPlayTeam }
})

// Team detail stats
const teamDetailStats = computed(() => {
  if (!selectedTeam.value) {
    return { ppw: '0.0', highScore: '0.0', lowScore: '0.0', totalPoints: '0.0', pointsAgainst: '0.0', pointDiff: '0.0', winStreak: '-', weeklyResults: [] }
  }
  
  const team = selectedTeam.value
  const weeklyData = team.weeklyScores || []
  const scores = weeklyData.map((w: any) => w.points)
  
  const gamesPlayed = Math.max((team.wins || 0) + (team.losses || 0), 1)
  const ppw = ((team.points_for || 0) / gamesPlayed).toFixed(1)
  const highScore = scores.length > 0 ? Math.max(...scores).toFixed(1) : '0.0'
  const lowScore = scores.length > 0 ? Math.min(...scores).toFixed(1) : '0.0'
  const totalPoints = (team.points_for || 0).toFixed(1)
  const pointsAgainst = (team.points_against || 0).toFixed(1)
  const pointDiff = ((team.points_for || 0) - (team.points_against || 0)).toFixed(1)
  
  let streak = 0, streakType = ''
  for (let i = weeklyData.length - 1; i >= 0; i--) {
    if (i === weeklyData.length - 1) { streakType = weeklyData[i].won ? 'W' : 'L'; streak = 1 }
    else if ((weeklyData[i].won && streakType === 'W') || (!weeklyData[i].won && streakType === 'L')) streak++
    else break
  }
  
  return { ppw, highScore, lowScore, totalPoints, pointsAgainst, pointDiff, winStreak: weeklyData.length > 0 ? `${streakType}${streak}` : '-', weeklyResults: weeklyData }
})

// Chart data
const chartSeries = computed(() => {
  if (standingsOverTime.value.size < 2) return []
  
  return teamsWithStats.value.map(team => {
    const data: number[] = []
    const weeks = Array.from(standingsOverTime.value.keys()).sort((a, b) => a - b)
    
    weeks.forEach(week => {
      const weekStandings = standingsOverTime.value.get(week)
      const rank = weekStandings?.get(team.team_key) || teamsWithStats.value.length
      data.push(rank)
    })
    
    return { name: team.name, data }
  })
})

const chartOptions = computed(() => {
  const weeks = Array.from(standingsOverTime.value.keys()).sort((a, b) => a - b)
  
  return {
    chart: { type: 'line', toolbar: { show: false }, background: 'transparent', animations: { enabled: true, speed: 500 } },
    stroke: { curve: 'smooth', width: 2 },
    markers: { size: 0 },
    xaxis: {
      categories: weeks.map(w => `Wk ${w}`),
      labels: { style: { colors: '#8b8ea1' } },
      axisBorder: { color: '#3a3d52' },
      axisTicks: { color: '#3a3d52' }
    },
    yaxis: {
      reversed: true,
      min: 1,
      max: teamsWithStats.value.length,
      labels: { style: { colors: '#8b8ea1' }, formatter: (v: number) => Math.round(v).toString() }
    },
    grid: { borderColor: '#3a3d52', strokeDashArray: 4 },
    legend: { show: false },
    tooltip: { theme: 'dark', y: { formatter: (v: number) => `Rank: ${Math.round(v)}` } },
    colors: teamsWithStats.value.map((_, i) => `hsl(${(i * 360) / teamsWithStats.value.length}, 70%, 50%)`)
  }
})

// Leader modal computed properties
const leaderModalTitle = computed(() => {
  switch (activeLeaderType.value) {
    case 'bestRecord': return '📊 Best Record'
    case 'mostPoints': return '🏆 Most Points'
    case 'bestAllPlay': return '🎯 Best All-Play'
    default: return 'Leaderboard'
  }
})

const leaderModalGradient = computed(() => {
  switch (activeLeaderType.value) {
    case 'bestRecord': return 'bg-gradient-to-r from-green-500/10 to-transparent'
    case 'mostPoints': return 'bg-gradient-to-r from-yellow-500/10 to-transparent'
    case 'bestAllPlay': return 'bg-gradient-to-r from-blue-500/10 to-transparent'
    default: return ''
  }
})

const leaderModalRingColor = computed(() => {
  switch (activeLeaderType.value) {
    case 'bestRecord': return 'ring-green-500'
    case 'mostPoints': return 'ring-yellow-500'
    case 'bestAllPlay': return 'ring-blue-500'
    default: return 'ring-primary'
  }
})

const leaderModalTextColor = computed(() => {
  switch (activeLeaderType.value) {
    case 'bestRecord': return 'text-green-400'
    case 'mostPoints': return 'text-yellow-400'
    case 'bestAllPlay': return 'text-blue-400'
    default: return 'text-primary'
  }
})

const leaderModalBarColor = computed(() => {
  switch (activeLeaderType.value) {
    case 'bestRecord': return 'bg-green-500'
    case 'mostPoints': return 'bg-yellow-500'
    case 'bestAllPlay': return 'bg-blue-500'
    default: return 'bg-primary'
  }
})

const leaderModalValue = computed(() => {
  const leader = leaderModalData.value.leader
  if (!leader) return '0'
  switch (activeLeaderType.value) {
    case 'bestRecord': return `${leader.wins}-${leader.losses}`
    case 'mostPoints': return leader.points_for?.toFixed(1) || '0.0'
    case 'bestAllPlay': return `${leader.all_play_wins}-${leader.all_play_losses}`
    default: return '0'
  }
})

const leaderModalUnit = computed(() => {
  switch (activeLeaderType.value) {
    case 'bestRecord': return 'Record'
    case 'mostPoints': return 'Total Points'
    case 'bestAllPlay': return 'All-Play Record'
    default: return ''
  }
})

const leaderModalData = computed(() => {
  const teams = teamsWithStats.value
  let sorted: any[] = []
  let getValue: (t: any) => number
  
  switch (activeLeaderType.value) {
    case 'bestRecord':
      sorted = [...teams].sort((a, b) => {
        const aWinPct = (a.wins || 0) / Math.max((a.wins || 0) + (a.losses || 0), 1)
        const bWinPct = (b.wins || 0) / Math.max((b.wins || 0) + (b.losses || 0), 1)
        return bWinPct - aWinPct
      })
      getValue = (t) => (t.wins || 0) / Math.max((t.wins || 0) + (t.losses || 0), 1) * 100
      break
    case 'mostPoints':
      sorted = [...teams].sort((a, b) => (b.points_for || 0) - (a.points_for || 0))
      getValue = (t) => t.points_for || 0
      break
    case 'bestAllPlay':
      sorted = [...teams].sort((a, b) => (b.all_play_wins || 0) - (a.all_play_wins || 0))
      getValue = (t) => t.all_play_wins || 0
      break
  }
  
  const comparison = sorted.map(t => ({ ...t, value: getValue(t) }))
  const values = comparison.map(t => t.value)
  const maxValue = Math.max(...values, 1)
  const average = values.reduce((a, b) => a + b, 0) / values.length
  const spread = Math.max(...values) - Math.min(...values)
  
  return { leader: sorted[0], comparison, maxValue, average, spread }
})

// Functions
function getTeamRecord(teamKey: string): string {
  const team = leagueStore.yahooTeams.find(t => t.team_key === teamKey)
  if (!team) return '0-0'
  return `${team.wins || 0}-${team.losses || 0}`
}

function getRankClass(rank: number): string {
  if (rank === 1) return 'bg-yellow-500 text-gray-900'
  if (rank === 2) return 'bg-gray-400 text-gray-900'
  if (rank === 3) return 'bg-amber-700 text-white'
  return 'bg-dark-border text-dark-textMuted'
}

function getRecordClass(team: any): string {
  if (bestRecord.value && team.team_key === bestRecord.value.team_key) return 'text-green-400'
  if (worstRecord.value && team.team_key === worstRecord.value.team_key) return 'text-red-400'
  return 'text-dark-text'
}

function getAllPlayClass(team: any): string {
  if (bestAllPlay.value && team.team_key === bestAllPlay.value.team_key) return 'text-green-400 font-semibold'
  if (worstAllPlay.value && team.team_key === worstAllPlay.value.team_key) return 'text-red-400 font-semibold'
  return 'text-dark-textMuted'
}

function getPointsForClass(team: any): string {
  if (bestPointsFor.value && team.team_key === bestPointsFor.value.team_key) return 'text-green-400'
  if (worstPointsFor.value && team.team_key === worstPointsFor.value.team_key) return 'text-red-400'
  return 'text-dark-text'
}

function getPointsAgainstClass(team: any): string {
  if (bestPointsAgainst.value && team.team_key === bestPointsAgainst.value.team_key) return 'text-green-400'
  if (worstPointsAgainst.value && team.team_key === worstPointsAgainst.value.team_key) return 'text-red-400'
  return 'text-dark-textMuted'
}

function handleImageError(e: Event) {
  const img = e.target as HTMLImageElement
  img.src = defaultAvatar
}

function setSortColumn(column: 'rank' | 'record' | 'allPlay' | 'pf' | 'pa') {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = column
    sortDirection.value = column === 'rank' ? 'asc' : 'desc'
  }
}

function openLeaderModal(type: 'bestRecord' | 'mostPoints' | 'bestAllPlay') {
  activeLeaderType.value = type
  showLeaderModal.value = true
}

function closeLeaderModal() { showLeaderModal.value = false }

function openTeamDetailModal(team: any) {
  selectedTeam.value = team
  showTeamDetailModal.value = true
}

function closeTeamDetailModal() {
  showTeamDetailModal.value = false
  selectedTeam.value = null
}

function formatLeaderValue(value: number): string {
  switch (activeLeaderType.value) {
    case 'bestRecord': return `${value.toFixed(0)}%`
    case 'mostPoints': return value.toFixed(1)
    case 'bestAllPlay': return value.toString()
    default: return value.toString()
  }
}

function getAvatarPosition(team: any): { top: string; left: string } {
  const weeks = Array.from(standingsOverTime.value.keys()).sort((a, b) => a - b)
  if (weeks.length === 0) return { top: '0px', left: '0px' }
  
  const lastWeek = weeks[weeks.length - 1]
  const weekStandings = standingsOverTime.value.get(lastWeek)
  const rank = weekStandings?.get(team.team_key) || teamsWithStats.value.length
  
  const chartHeight = 400
  const numTeams = teamsWithStats.value.length
  const yPercent = ((rank - 1) / (numTeams - 1)) * 100
  const top = (chartHeight * 0.08) + (chartHeight * 0.82 * yPercent / 100) - 14
  
  return { top: `${top}px`, left: 'calc(100% - 40px)' }
}

// Load all data
async function loadAllData() {
  const leagueKey = leagueStore.activeLeagueId
  if (!leagueKey || leagueStore.activePlatform !== 'yahoo') return
  
  isLoadingChart.value = true
  
  try {
    if (authStore.user?.id) {
      await yahooService.initialize(authStore.user.id)
    }
    
    // Fetch transaction counts
    const transCounts = await yahooService.getTransactionCounts(leagueKey)
    transactionCounts.value = transCounts
    
    // Fetch all matchups for calculating all-play and standings over time
    const completedWeeks = Math.max(0, currentWeek.value - 1)
    if (completedWeeks > 0) {
      const matchupsData = await yahooService.getAllMatchups(leagueKey, 1, completedWeeks)
      allMatchups.value = matchupsData
      
      // Calculate all-play records and weekly scores
      calculateAllPlayFromMatchups(matchupsData)
      
      // Calculate standings over time
      calculateStandingsOverTime(matchupsData)
    }
  } catch (e) {
    console.error('Error loading baseball data:', e)
  } finally {
    isLoadingChart.value = false
  }
}

function calculateAllPlayFromMatchups(matchupsData: Map<number, any[]>) {
  const records = new Map<string, { wins: number; losses: number }>()
  const weeklyScores = new Map<string, { week: number; points: number; won: boolean }[]>()
  
  for (const team of leagueStore.yahooTeams) {
    records.set(team.team_key, { wins: 0, losses: 0 })
    weeklyScores.set(team.team_key, [])
  }
  
  for (const [week, matchups] of matchupsData) {
    const weekScoresData: { team_key: string; points: number }[] = []
    
    for (const matchup of matchups) {
      if (matchup.teams.length >= 2) {
        const team1 = matchup.teams[0]
        const team2 = matchup.teams[1]
        
        const team1Scores = weeklyScores.get(team1.team_key)
        const team2Scores = weeklyScores.get(team2.team_key)
        
        if (team1Scores) team1Scores.push({ week, points: team1.points || 0, won: (team1.points || 0) > (team2.points || 0) })
        if (team2Scores) team2Scores.push({ week, points: team2.points || 0, won: (team2.points || 0) > (team1.points || 0) })
      }
      
      for (const team of matchup.teams) {
        weekScoresData.push({ team_key: team.team_key, points: team.points || 0 })
      }
    }
    
    for (const team of weekScoresData) {
      const record = records.get(team.team_key)
      if (!record) continue
      
      for (const opponent of weekScoresData) {
        if (opponent.team_key === team.team_key) continue
        if (team.points > opponent.points) record.wins++
        else if (team.points < opponent.points) record.losses++
      }
    }
  }
  
  allPlayRecords.value = records
  weeklyScoresMap.value = weeklyScores
}

function calculateStandingsOverTime(matchupsData: Map<number, any[]>) {
  const standingsData = new Map<number, Map<string, number>>()
  const cumulativeWins = new Map<string, number>()
  const cumulativeLosses = new Map<string, number>()
  const cumulativePoints = new Map<string, number>()
  
  for (const team of leagueStore.yahooTeams) {
    cumulativeWins.set(team.team_key, 0)
    cumulativeLosses.set(team.team_key, 0)
    cumulativePoints.set(team.team_key, 0)
  }
  
  const weeks = Array.from(matchupsData.keys()).sort((a, b) => a - b)
  
  for (const week of weeks) {
    const matchups = matchupsData.get(week) || []
    
    for (const matchup of matchups) {
      if (matchup.teams.length >= 2) {
        const team1 = matchup.teams[0]
        const team2 = matchup.teams[1]
        
        cumulativePoints.set(team1.team_key, (cumulativePoints.get(team1.team_key) || 0) + (team1.points || 0))
        cumulativePoints.set(team2.team_key, (cumulativePoints.get(team2.team_key) || 0) + (team2.points || 0))
        
        if ((team1.points || 0) > (team2.points || 0)) {
          cumulativeWins.set(team1.team_key, (cumulativeWins.get(team1.team_key) || 0) + 1)
          cumulativeLosses.set(team2.team_key, (cumulativeLosses.get(team2.team_key) || 0) + 1)
        } else if ((team2.points || 0) > (team1.points || 0)) {
          cumulativeWins.set(team2.team_key, (cumulativeWins.get(team2.team_key) || 0) + 1)
          cumulativeLosses.set(team1.team_key, (cumulativeLosses.get(team1.team_key) || 0) + 1)
        }
      }
    }
    
    // Calculate rankings for this week
    const teamRankings = leagueStore.yahooTeams
      .map(t => ({
        team_key: t.team_key,
        wins: cumulativeWins.get(t.team_key) || 0,
        losses: cumulativeLosses.get(t.team_key) || 0,
        points: cumulativePoints.get(t.team_key) || 0
      }))
      .sort((a, b) => {
        const aWinPct = a.wins / Math.max(a.wins + a.losses, 1)
        const bWinPct = b.wins / Math.max(b.wins + b.losses, 1)
        if (bWinPct !== aWinPct) return bWinPct - aWinPct
        return b.points - a.points
      })
    
    const weekStandings = new Map<string, number>()
    teamRankings.forEach((team, idx) => weekStandings.set(team.team_key, idx + 1))
    standingsData.set(week, weekStandings)
  }
  
  standingsOverTime.value = standingsData
}

watch(() => leagueStore.activeLeagueId, () => {
  if (leagueStore.activePlatform === 'yahoo') loadAllData()
})

watch(() => leagueStore.yahooTeams, () => {
  if (leagueStore.yahooTeams.length > 0 && leagueStore.activePlatform === 'yahoo') loadAllData()
}, { immediate: true })

onMounted(() => {
  if (leagueStore.yahooTeams.length > 0) loadAllData()
})
</script>
