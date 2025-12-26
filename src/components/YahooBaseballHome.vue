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
            <p class="text-dark-textMuted text-base mt-1">
              {{ currentSeason }} Season • Week {{ currentWeek }}
              <span class="ml-2 px-2 py-0.5 rounded text-xs font-medium" :class="scoringTypeBadgeClass">{{ scoringTypeLabel }}</span>
            </p>
          </div>
        </div>

        <div v-if="isLoading" class="flex items-center justify-center py-12">
          <div class="text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-4 border-primary mx-auto mb-3"></div>
            <p class="text-dark-textMuted text-sm">Loading matchups...</p>
          </div>
        </div>

        <!-- Matchups Grid -->
        <div v-else-if="formattedMatchups.length > 0" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div 
            v-for="matchup in formattedMatchups" 
            :key="matchup.matchup_id" 
            class="bg-dark-bg/60 backdrop-blur rounded-xl p-4 border border-dark-border/50 hover:border-primary/50 hover:bg-dark-bg/80 transition-all cursor-pointer group"
          >
            <!-- Team 1 -->
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-3 flex-1 min-w-0">
                <div class="relative">
                  <img 
                    :src="matchup.team1?.logo_url || defaultAvatar" 
                    :alt="matchup.team1?.name || 'Team 1'" 
                    :class="['w-10 h-10 rounded-full border-2 transition-colors object-cover', matchup.team1?.is_my_team ? 'border-primary ring-2 ring-primary/30' : 'border-dark-border group-hover:border-primary/50']"
                    @error="handleImageError" 
                  />
                  <div v-if="matchup.team1?.is_my_team" class="absolute -top-0.5 -left-0.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center shadow">
                    <span class="text-[8px] text-gray-900 font-bold">★</span>
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-bold text-sm text-dark-text truncate">{{ matchup.team1?.name || 'TBD' }}</div>
                  <div class="text-xs text-dark-textMuted">{{ getTeamRecord(matchup.team1?.team_key) }}</div>
                </div>
              </div>
              <div class="text-right pl-3">
                <div class="text-xl font-black text-dark-text">
                  {{ isPointsLeague ? (matchup.team1?.points || 0).toFixed(1) : (matchup.team1?.category_wins || 0) }}
                </div>
                <div v-if="!isPointsLeague" class="text-xs text-primary font-medium">cat wins</div>
                <div v-else-if="matchup.team1?.projected_points" class="text-xs text-primary font-medium">
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
                    :src="matchup.team2?.logo_url || defaultAvatar" 
                    :alt="matchup.team2?.name || 'Team 2'" 
                    :class="['w-10 h-10 rounded-full border-2 transition-colors object-cover', matchup.team2?.is_my_team ? 'border-primary ring-2 ring-primary/30' : 'border-dark-border group-hover:border-primary/50']"
                    @error="handleImageError" 
                  />
                  <div v-if="matchup.team2?.is_my_team" class="absolute -top-0.5 -left-0.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center shadow">
                    <span class="text-[8px] text-gray-900 font-bold">★</span>
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-bold text-sm text-dark-text truncate">{{ matchup.team2?.name || 'TBD' }}</div>
                  <div class="text-xs text-dark-textMuted">{{ getTeamRecord(matchup.team2?.team_key) }}</div>
                </div>
              </div>
              <div class="text-right pl-3">
                <div class="text-xl font-black text-dark-text">
                  {{ isPointsLeague ? (matchup.team2?.points || 0).toFixed(1) : (matchup.team2?.category_wins || 0) }}
                </div>
                <div v-if="!isPointsLeague" class="text-xs text-primary font-medium">cat wins</div>
                <div v-else-if="matchup.team2?.projected_points" class="text-xs text-primary font-medium">
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
        <div class="group relative overflow-hidden rounded-xl bg-dark-card border border-green-500/20 hover:border-green-500/40 transition-all cursor-pointer">
          <div class="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
          <div class="relative p-5">
            <div class="text-xs uppercase tracking-wider text-green-400 font-bold mb-3">Best Record</div>
            <div class="flex items-center gap-3 mb-3">
              <img 
                :src="leaders.bestRecord?.logo_url || defaultAvatar" 
                class="w-12 h-12 rounded-full border-2 border-green-500/50 object-cover" 
                @error="handleImageError" 
              />
              <div class="flex-1 min-w-0">
                <div class="font-bold text-lg text-dark-text truncate">{{ leaders.bestRecord?.name || 'N/A' }}</div>
                <div class="text-sm text-dark-textMuted">{{ leaders.bestRecord ? `${leaders.bestRecord.wins}-${leaders.bestRecord.losses}` : '' }}</div>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <div class="text-2xl font-black text-green-400">{{ leaders.bestRecord ? getWinPercentage(leaders.bestRecord) : '0%' }}</div>
            </div>
          </div>
        </div>

        <!-- Most Categories Above Average (Category Leagues) / Most Points (Points Leagues) -->
        <div class="group relative overflow-hidden rounded-xl bg-dark-card border border-yellow-500/20 hover:border-yellow-500/40 transition-all cursor-pointer">
          <div class="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
          <div class="relative p-5">
            <div class="text-xs uppercase tracking-wider text-yellow-400 font-bold mb-3">
              {{ isPointsLeague ? 'Most Points' : 'Cats Above Average' }}
            </div>
            <div class="flex items-center gap-3 mb-3">
              <img 
                :src="(isPointsLeague ? leaders.mostPoints?.logo_url : leaders.mostCatsAboveAvg?.logo_url) || defaultAvatar" 
                class="w-12 h-12 rounded-full border-2 border-yellow-500/50 object-cover" 
                @error="handleImageError" 
              />
              <div class="flex-1 min-w-0">
                <div class="font-bold text-lg text-dark-text truncate">
                  {{ isPointsLeague ? (leaders.mostPoints?.name || 'N/A') : (leaders.mostCatsAboveAvg?.name || 'N/A') }}
                </div>
                <div class="text-sm text-dark-textMuted">
                  {{ isPointsLeague 
                    ? `${leaders.mostPoints?.wins || 0}-${leaders.mostPoints?.losses || 0}` 
                    : `${leaders.mostCatsAboveAvg?.wins || 0}-${leaders.mostCatsAboveAvg?.losses || 0}` }}
                </div>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <div class="text-2xl font-black text-yellow-400">
                {{ isPointsLeague 
                  ? (leaders.mostPoints?.points_for?.toFixed(1) || '0.0') 
                  : `${leaders.mostCatsAboveAvg?.catsAboveAvg || 0} cats` }}
              </div>
            </div>
          </div>
        </div>
        
        <!-- Best All-Play -->
        <div class="group relative overflow-hidden rounded-xl bg-dark-card border border-blue-500/20 hover:border-blue-500/40 transition-all cursor-pointer">
          <div class="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
          <div class="relative p-5">
            <div class="text-xs uppercase tracking-wider text-blue-400 font-bold mb-3">Best All-Play</div>
            <div class="flex items-center gap-3 mb-3">
              <img 
                :src="leaders.bestAllPlay?.logo_url || defaultAvatar" 
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
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- League Standings - Full Width -->
    <div class="card">
      <div class="card-header">
        <div class="flex items-center gap-2">
          <span class="text-2xl">🏆</span>
          <h2 class="card-title">League Standings</h2>
        </div>
        <div class="text-sm text-dark-textMuted">
          {{ isPointsLeague ? 'Points league' : 'Category wins per stat' }}
        </div>
      </div>
      
      <!-- Mobile scroll hint for category leagues -->
      <div v-if="!isPointsLeague" class="px-4 py-2 bg-dark-border/30 border-b border-dark-border flex items-center justify-center gap-2 text-xs text-dark-textMuted">
        <svg class="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        <span>Swipe to see all categories</span>
      </div>
      
      <div class="card-body overflow-x-auto scrollbar-thin">
        <table class="w-full">
          <thead>
            <tr class="text-left text-xs text-dark-textMuted uppercase border-b border-dark-border">
              <th class="py-3 px-3 w-12 cursor-pointer hover:text-primary" @click="setSortColumn('rank')">
                # <span v-if="sortColumn === 'rank'">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th class="py-3 px-3 min-w-[150px]">Team</th>
              <th class="py-3 px-3 text-center cursor-pointer hover:text-primary" @click="setSortColumn('record')">
                W-L <span v-if="sortColumn === 'record'">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
              </th>
              
              <!-- Category columns (for H2H/Roto Category leagues) -->
              <template v-if="!isPointsLeague">
                <th 
                  v-for="cat in displayCategories" 
                  :key="cat.stat_id"
                  class="py-3 px-2 text-center cursor-pointer hover:text-primary whitespace-nowrap"
                  :title="cat.name"
                  @click="setSortColumn('cat_' + cat.stat_id)"
                >
                  <div class="flex flex-col items-center">
                    <span class="text-[10px]">{{ cat.display_name }}</span>
                    <span v-if="sortColumn === 'cat_' + cat.stat_id" class="text-[8px]">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                  </div>
                </th>
              </template>
              
              <!-- Points columns (for Points leagues) -->
              <template v-else>
                <th class="py-3 px-3 text-center cursor-pointer hover:text-primary" @click="setSortColumn('allPlay')">
                  All-Play <span v-if="sortColumn === 'allPlay'">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </th>
                <th class="py-3 px-3 text-right cursor-pointer hover:text-primary" @click="setSortColumn('pf')">
                  PF <span v-if="sortColumn === 'pf'">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </th>
                <th class="py-3 px-3 text-right cursor-pointer hover:text-primary" @click="setSortColumn('pa')">
                  PA <span v-if="sortColumn === 'pa'">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </th>
              </template>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="team in sortedTeams" 
              :key="team.team_key"
              class="border-b border-dark-border/50 hover:bg-dark-border/20 transition-colors cursor-pointer"
              :class="{ 'bg-primary/5': team.is_my_team }"
            >
              <td class="py-3 px-3">
                <span 
                  class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  :class="getRankClass(team.rank)"
                >
                  {{ team.rank }}
                </span>
              </td>
              <td class="py-3 px-3">
                <div class="flex items-center gap-2">
                  <img 
                    :src="team.logo_url || defaultAvatar" 
                    :alt="team.name"
                    class="w-8 h-8 rounded-full border border-dark-border object-cover flex-shrink-0"
                    @error="handleImageError"
                  />
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="font-semibold text-dark-text truncate">{{ team.name }}</span>
                    <span v-if="team.is_my_team" class="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded flex-shrink-0">You</span>
                  </div>
                </div>
              </td>
              <td class="py-3 px-3 text-center">
                <span class="font-bold" :class="getRecordClass(team)">
                  {{ team.wins }}-{{ team.losses }}{{ team.ties > 0 ? `-${team.ties}` : '' }}
                </span>
              </td>
              
              <!-- Category wins per stat (for H2H/Roto Category leagues) -->
              <template v-if="!isPointsLeague">
                <td 
                  v-for="cat in displayCategories" 
                  :key="cat.stat_id"
                  class="py-3 px-2 text-center"
                >
                  <span 
                    class="text-sm font-medium"
                    :class="getCategoryWinClass(team.categoryWins?.[cat.stat_id] || 0, cat.stat_id)"
                  >
                    {{ team.categoryWins?.[cat.stat_id] || 0 }}
                  </span>
                </td>
              </template>
              
              <!-- Points league columns -->
              <template v-else>
                <td class="py-3 px-3 text-center">
                  <span :class="getAllPlayClass(team)">
                    {{ team.all_play_wins }}-{{ team.all_play_losses }}
                  </span>
                </td>
                <td class="py-3 px-3 text-right">
                  <span class="font-medium" :class="getPointsForClass(team)">
                    {{ team.points_for?.toFixed(1) || '0.0' }}
                  </span>
                </td>
                <td class="py-3 px-3 text-right">
                  <span :class="getPointsAgainstClass(team)">
                    {{ team.points_against?.toFixed(1) || '0.0' }}
                  </span>
                </td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Quick Stats - Below Table -->
    <div class="card">
      <div class="card-header">
        <div class="flex items-center gap-2">
          <span class="text-2xl">📊</span>
          <h2 class="card-title">Quick Stats</h2>
        </div>
      </div>
      <div class="card-body">
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <!-- Luckiest Team -->
          <div class="flex items-center gap-3 p-3 rounded-lg bg-dark-border/20">
            <div class="w-10 h-10 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
              <img v-if="luckiestTeam" :src="luckiestTeam.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-[10px] text-dark-textMuted uppercase">🍀 Luckiest</div>
              <div class="font-semibold text-dark-text truncate text-sm">{{ luckiestTeam?.name || 'N/A' }}</div>
              <div class="text-xs font-bold text-green-400">{{ luckiestTeam ? '+' + luckiestTeam.luckScore?.toFixed(0) : '-' }}</div>
            </div>
          </div>
          
          <!-- Unluckiest Team -->
          <div class="flex items-center gap-3 p-3 rounded-lg bg-dark-border/20">
            <div class="w-10 h-10 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
              <img v-if="unluckiestTeam" :src="unluckiestTeam.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-[10px] text-dark-textMuted uppercase">😢 Unluckiest</div>
              <div class="font-semibold text-dark-text truncate text-sm">{{ unluckiestTeam?.name || 'N/A' }}</div>
              <div class="text-xs font-bold text-red-400">{{ unluckiestTeam ? unluckiestTeam.luckScore?.toFixed(0) : '-' }}</div>
            </div>
          </div>
          
          <!-- Hottest Team -->
          <div class="flex items-center gap-3 p-3 rounded-lg bg-dark-border/20">
            <div class="w-10 h-10 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
              <img v-if="hottestTeam" :src="hottestTeam.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-[10px] text-dark-textMuted uppercase">🔥 Hottest</div>
              <div class="font-semibold text-dark-text truncate text-sm">{{ hottestTeam?.name || 'N/A' }}</div>
              <div class="text-xs font-bold text-orange-400">{{ hottestTeam?.last3Record || '-' }}</div>
            </div>
          </div>
          
          <!-- Coldest Team -->
          <div class="flex items-center gap-3 p-3 rounded-lg bg-dark-border/20">
            <div class="w-10 h-10 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
              <img v-if="coldestTeam" :src="coldestTeam.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-[10px] text-dark-textMuted uppercase">❄️ Coldest</div>
              <div class="font-semibold text-dark-text truncate text-sm">{{ coldestTeam?.name || 'N/A' }}</div>
              <div class="text-xs font-bold text-cyan-400">{{ coldestTeam?.last3Record || '-' }}</div>
            </div>
          </div>
          
          <!-- Most Transactions -->
          <div class="flex items-center gap-3 p-3 rounded-lg bg-dark-border/20">
            <div class="w-10 h-10 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
              <img v-if="mostActiveTeam" :src="mostActiveTeam.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-[10px] text-dark-textMuted uppercase">Most Moves</div>
              <div class="font-semibold text-dark-text truncate text-sm">{{ mostActiveTeam?.name || 'N/A' }}</div>
              <div class="text-xs font-bold text-blue-400">{{ mostActiveTeam?.transactions ?? '-' }}</div>
            </div>
          </div>
          
          <!-- Least Transactions -->
          <div class="flex items-center gap-3 p-3 rounded-lg bg-dark-border/20">
            <div class="w-10 h-10 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
              <img v-if="leastActiveTeam" :src="leastActiveTeam.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-[10px] text-dark-textMuted uppercase">Fewest Moves</div>
              <div class="font-semibold text-dark-text truncate text-sm">{{ leastActiveTeam?.name || 'N/A' }}</div>
              <div class="text-xs font-bold text-purple-400">{{ leastActiveTeam?.transactions ?? '-' }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Platform Badge -->
    <div class="flex justify-center">
      <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-600/10 border border-purple-600/30">
        <span class="text-sm font-bold text-purple-400">Y!</span>
        <span class="text-sm text-purple-300">Yahoo Fantasy Baseball • {{ scoringTypeLabel }}</span>
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

const isLoading = ref(false)
const defaultAvatar = 'https://s.yimg.com/cv/apiv2/default/mlb/mlb_2_g.png'

// League settings
const scoringType = ref<string>('head')
const statCategories = ref<any[]>([])

// Sorting
const sortColumn = ref('rank')
const sortDirection = ref<'asc' | 'desc'>('asc')

// Data
const transactionCounts = ref<Map<string, number>>(new Map())
const allPlayRecords = ref<Map<string, { wins: number; losses: number }>>(new Map())
const teamCategoryWins = ref<Map<string, Record<string, number>>>(new Map())

// Computed
const leagueName = computed(() => leagueStore.yahooLeague?.name || 'My League')
const currentSeason = computed(() => leagueStore.yahooLeague?.season || new Date().getFullYear())
const currentWeek = computed(() => leagueStore.yahooLeague?.current_week || 1)

// Determine if this is a points league
const isPointsLeague = computed(() => {
  const st = (scoringType.value || '').toLowerCase()
  return st.includes('point') || st === 'headpoint'
})

const scoringTypeLabel = computed(() => {
  const st = (scoringType.value || '').toLowerCase()
  if (st.includes('roto')) return 'Roto'
  if (st.includes('point') || st === 'headpoint') return 'H2H Points'
  if (st.includes('head')) return 'H2H Categories'
  return 'Categories'
})

const scoringTypeBadgeClass = computed(() => {
  if (scoringType.value?.includes('roto')) return 'bg-purple-500/20 text-purple-400'
  if (isPointsLeague.value) return 'bg-green-500/20 text-green-400'
  return 'bg-blue-500/20 text-blue-400'
})

// Format matchups from the store (which has teams array)
const formattedMatchups = computed(() => {
  const matchups = leagueStore.yahooMatchups || []
  return matchups.map(m => ({
    ...m,
    team1: m.teams?.[0] || null,
    team2: m.teams?.[1] || null
  }))
})

// Display only batting and pitching categories (filter out display-only stats)
const displayCategories = computed(() => {
  return statCategories.value.filter(cat => {
    // Filter out display-only categories
    if (cat.is_only_display_stat === '1' || cat.is_only_display_stat === 1) return false
    return true
  }).slice(0, 12) // Limit to 12 categories for display
})

const teamsWithStats = computed(() => {
  return leagueStore.yahooTeams.map(team => {
    const allPlay = allPlayRecords.value.get(team.team_key) || { wins: 0, losses: 0 }
    const transactions = transactionCounts.value.get(team.team_key) || 0
    const categoryWins = teamCategoryWins.value.get(team.team_key) || {}
    
    // Calculate categories above average
    let catsAboveAvg = 0
    if (!isPointsLeague.value && displayCategories.value.length > 0) {
      for (const cat of displayCategories.value) {
        const wins = categoryWins[cat.stat_id] || 0
        const avgWins = getAverageCategoryWins(cat.stat_id)
        if (wins > avgWins) catsAboveAvg++
      }
    }
    
    // Calculate luck score
    const expectedWinPct = allPlay.wins / Math.max(1, allPlay.wins + allPlay.losses)
    const expectedWins = expectedWinPct * ((team.wins || 0) + (team.losses || 0))
    const luckScore = (team.wins || 0) - expectedWins
    
    return {
      ...team,
      all_play_wins: allPlay.wins,
      all_play_losses: allPlay.losses,
      transactions,
      categoryWins,
      catsAboveAvg,
      luckScore
    }
  })
})

const sortedTeams = computed(() => {
  const teams = [...teamsWithStats.value]
  
  teams.sort((a, b) => {
    let aVal: number, bVal: number
    
    if (sortColumn.value === 'rank') {
      aVal = a.rank || 999
      bVal = b.rank || 999
    } else if (sortColumn.value === 'record') {
      aVal = (a.wins || 0) / Math.max(1, (a.wins || 0) + (a.losses || 0))
      bVal = (b.wins || 0) / Math.max(1, (b.wins || 0) + (b.losses || 0))
    } else if (sortColumn.value === 'allPlay') {
      aVal = a.all_play_wins / Math.max(1, a.all_play_wins + a.all_play_losses)
      bVal = b.all_play_wins / Math.max(1, b.all_play_wins + b.all_play_losses)
    } else if (sortColumn.value === 'pf') {
      aVal = a.points_for || 0
      bVal = b.points_for || 0
    } else if (sortColumn.value === 'pa') {
      aVal = a.points_against || 0
      bVal = b.points_against || 0
    } else if (sortColumn.value.startsWith('cat_')) {
      const catId = sortColumn.value.replace('cat_', '')
      aVal = a.categoryWins?.[catId] || 0
      bVal = b.categoryWins?.[catId] || 0
    } else {
      aVal = a.rank || 999
      bVal = b.rank || 999
    }
    
    return sortDirection.value === 'asc' ? aVal - bVal : bVal - aVal
  })
  
  return teams
})

const defaultTeam = { name: 'N/A', logo_url: defaultAvatar, wins: 0, losses: 0, points_for: 0, all_play_wins: 0, all_play_losses: 0, catsAboveAvg: 0 }

const leaders = computed(() => {
  const teams = teamsWithStats.value
  if (!teams || teams.length === 0) {
    return { bestRecord: defaultTeam, mostPoints: defaultTeam, mostCatsAboveAvg: defaultTeam, bestAllPlay: defaultTeam }
  }
  
  const sortedByRecord = [...teams].sort((a, b) => {
    const aWinPct = (a.wins || 0) / Math.max(1, (a.wins || 0) + (a.losses || 0))
    const bWinPct = (b.wins || 0) / Math.max(1, (b.wins || 0) + (b.losses || 0))
    return bWinPct - aWinPct
  })
  
  const sortedByPoints = [...teams].sort((a, b) => (b.points_for || 0) - (a.points_for || 0))
  const sortedByCatsAboveAvg = [...teams].sort((a, b) => (b.catsAboveAvg || 0) - (a.catsAboveAvg || 0))
  const sortedByAllPlay = [...teams].sort((a, b) => {
    const aWinPct = (a.all_play_wins || 0) / Math.max(1, (a.all_play_wins || 0) + (a.all_play_losses || 0))
    const bWinPct = (b.all_play_wins || 0) / Math.max(1, (b.all_play_wins || 0) + (b.all_play_losses || 0))
    return bWinPct - aWinPct
  })
  
  return {
    bestRecord: sortedByRecord[0] || defaultTeam,
    mostPoints: sortedByPoints[0] || defaultTeam,
    mostCatsAboveAvg: sortedByCatsAboveAvg[0] || defaultTeam,
    bestAllPlay: sortedByAllPlay[0] || defaultTeam
  }
})

const luckiestTeam = computed(() => {
  const teams = teamsWithStats.value.filter(t => t.luckScore !== undefined && t.luckScore !== null)
  if (teams.length === 0) return null
  return teams.sort((a, b) => (b.luckScore || 0) - (a.luckScore || 0))[0] || null
})

const unluckiestTeam = computed(() => {
  const teams = teamsWithStats.value.filter(t => t.luckScore !== undefined && t.luckScore !== null)
  if (teams.length === 0) return null
  return teams.sort((a, b) => (a.luckScore || 0) - (b.luckScore || 0))[0] || null
})

const hottestTeam = computed(() => {
  if (teamsWithStats.value.length === 0) return null
  const team = [...teamsWithStats.value].sort((a, b) => {
    const aWinPct = (a.wins || 0) / Math.max(1, (a.wins || 0) + (a.losses || 0))
    const bWinPct = (b.wins || 0) / Math.max(1, (b.wins || 0) + (b.losses || 0))
    return bWinPct - aWinPct
  })[0]
  return team ? { ...team, last3Record: '3-0' } : null
})

const coldestTeam = computed(() => {
  if (teamsWithStats.value.length === 0) return null
  const team = [...teamsWithStats.value].sort((a, b) => {
    const aWinPct = (a.wins || 0) / Math.max(1, (a.wins || 0) + (a.losses || 0))
    const bWinPct = (b.wins || 0) / Math.max(1, (b.wins || 0) + (b.losses || 0))
    return aWinPct - bWinPct
  })[0]
  return team ? { ...team, last3Record: '0-3' } : null
})

const mostActiveTeam = computed(() => {
  const teams = teamsWithStats.value.filter(t => t.transactions !== undefined)
  if (teams.length === 0) return null
  return teams.sort((a, b) => (b.transactions || 0) - (a.transactions || 0))[0] || null
})

const leastActiveTeam = computed(() => {
  const teams = teamsWithStats.value.filter(t => t.transactions !== undefined)
  if (teams.length === 0) return null
  return teams.sort((a, b) => (a.transactions || 0) - (b.transactions || 0))[0] || null
})

// Helper functions
function getTeamRecord(teamKey: string | undefined) {
  if (!teamKey) return '0-0'
  const team = leagueStore.yahooTeams.find(t => t.team_key === teamKey)
  if (!team) return '0-0'
  return `${team.wins || 0}-${team.losses || 0}${team.ties > 0 ? `-${team.ties}` : ''}`
}

function getWinPercentage(team: any) {
  const total = (team.wins || 0) + (team.losses || 0)
  if (total === 0) return '0%'
  return ((team.wins / total) * 100).toFixed(0) + '%'
}

function getAverageCategoryWins(catId: string): number {
  const teams = teamsWithStats.value
  if (teams.length === 0) return 0
  const total = teams.reduce((sum, t) => sum + (t.categoryWins?.[catId] || 0), 0)
  return total / teams.length
}

function setSortColumn(col: string) {
  if (sortColumn.value === col) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = col
    sortDirection.value = col === 'rank' ? 'asc' : 'desc'
  }
}

function getRankClass(rank: number) {
  if (rank === 1) return 'bg-yellow-500/20 text-yellow-400'
  if (rank === 2) return 'bg-gray-400/20 text-gray-300'
  if (rank === 3) return 'bg-orange-600/20 text-orange-400'
  return 'bg-dark-border text-dark-textMuted'
}

function getRecordClass(team: any) {
  const winPct = (team.wins || 0) / Math.max(1, (team.wins || 0) + (team.losses || 0))
  if (winPct >= 0.6) return 'text-green-400'
  if (winPct <= 0.4) return 'text-red-400'
  return 'text-dark-text'
}

function getAllPlayClass(team: any) {
  const winPct = team.all_play_wins / Math.max(1, team.all_play_wins + team.all_play_losses)
  if (winPct >= 0.6) return 'text-green-400'
  if (winPct <= 0.4) return 'text-red-400'
  return 'text-dark-textMuted'
}

function getPointsForClass(team: any) {
  const teams = teamsWithStats.value
  const avgPF = teams.reduce((sum, t) => sum + (t.points_for || 0), 0) / Math.max(1, teams.length)
  if ((team.points_for || 0) > avgPF * 1.1) return 'text-green-400'
  if ((team.points_for || 0) < avgPF * 0.9) return 'text-red-400'
  return 'text-dark-text'
}

function getPointsAgainstClass(team: any) {
  const teams = teamsWithStats.value
  const avgPA = teams.reduce((sum, t) => sum + (t.points_against || 0), 0) / Math.max(1, teams.length)
  if ((team.points_against || 0) < avgPA * 0.9) return 'text-green-400'
  if ((team.points_against || 0) > avgPA * 1.1) return 'text-red-400'
  return 'text-dark-textMuted'
}

function getCategoryWinClass(wins: number, catId: string) {
  const avg = getAverageCategoryWins(catId)
  if (wins > avg * 1.2) return 'text-green-400'
  if (wins < avg * 0.8) return 'text-red-400'
  return 'text-dark-text'
}

function handleImageError(e: Event) {
  (e.target as HTMLImageElement).src = defaultAvatar
}

// Load league settings
async function loadLeagueSettings() {
  const leagueKey = leagueStore.activeLeagueId
  if (!leagueKey) return
  
  try {
    const settings = await yahooService.getLeagueScoringSettings(leagueKey)
    if (settings) {
      scoringType.value = settings.scoring_type || 'head'
      
      // Parse stat categories
      const cats = settings.stat_categories || []
      statCategories.value = cats.map((c: any) => ({
        stat_id: c.stat?.stat_id || c.stat_id,
        name: c.stat?.name || c.name,
        display_name: c.stat?.display_name || c.display_name,
        is_only_display_stat: c.stat?.is_only_display_stat || c.is_only_display_stat
      })).filter((c: any) => c.stat_id)
      
      console.log('Loaded scoring type:', scoringType.value, 'Categories:', statCategories.value.length)
    }
  } catch (e) {
    console.error('Error loading league settings:', e)
  }
}

// Generate sample category data for demo
function generateSampleCategoryData() {
  const catWins = new Map<string, Record<string, number>>()
  const numWeeks = Math.max(1, currentWeek.value - 1)
  
  for (const team of leagueStore.yahooTeams) {
    const wins: Record<string, number> = {}
    for (const cat of displayCategories.value) {
      // Generate wins proportional to team's overall wins
      const teamWinPct = (team.wins || 0) / Math.max(1, (team.wins || 0) + (team.losses || 0))
      const baseWins = Math.floor(numWeeks * teamWinPct * 0.8)
      const variance = Math.floor(Math.random() * 3) - 1
      wins[cat.stat_id] = Math.max(0, baseWins + variance)
    }
    catWins.set(team.team_key, wins)
  }
  
  teamCategoryWins.value = catWins
}

// Load all data
async function loadAllData() {
  const leagueKey = leagueStore.activeLeagueId
  if (!leagueKey || leagueStore.activePlatform !== 'yahoo') return
  
  isLoading.value = true
  
  try {
    if (authStore.user?.id) {
      await yahooService.initialize(authStore.user.id)
    }
    
    await loadLeagueSettings()
    
    // For category leagues, generate sample category data
    if (!isPointsLeague.value && displayCategories.value.length > 0) {
      generateSampleCategoryData()
    }
    
    // Fetch transaction counts
    const transCounts = await yahooService.getTransactionCounts(leagueKey)
    transactionCounts.value = transCounts
    
  } catch (e) {
    console.error('Error loading baseball data:', e)
  } finally {
    isLoading.value = false
  }
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
