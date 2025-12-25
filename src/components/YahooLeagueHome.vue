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
            <p class="text-dark-textMuted text-base mt-1">Season {{ currentSeason }} • Week {{ currentWeek }}</p>
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
                  <div class="text-xs text-dark-textMuted">{{ getTeamRecord(matchup.team1) }}</div>
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
                  <div class="text-xs text-dark-textMuted">{{ getTeamRecord(matchup.team2) }}</div>
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
        <!-- Most Points -->
        <div class="group relative overflow-hidden rounded-xl bg-dark-card border border-yellow-500/20 hover:border-yellow-500/40 transition-all cursor-pointer">
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
              <div class="text-xs text-yellow-400/70">PF</div>
            </div>
          </div>
        </div>
        
        <!-- Best Record -->
        <div class="group relative overflow-hidden rounded-xl bg-dark-card border border-green-500/20 hover:border-green-500/40 transition-all cursor-pointer">
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
                <div class="text-sm text-dark-textMuted">{{ leaders.bestRecord?.points_for ? (leaders.bestRecord.points_for / Math.max(leaders.bestRecord.wins + leaders.bestRecord.losses, 1)).toFixed(1) + ' PPG' : '' }}</div>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <div class="text-2xl font-black text-green-400">{{ leaders.bestRecord ? `${leaders.bestRecord.wins}-${leaders.bestRecord.losses}` : '0-0' }}</div>
              <div class="text-xs text-green-400/70">Record</div>
            </div>
          </div>
        </div>
        
        <!-- Lowest PA -->
        <div class="group relative overflow-hidden rounded-xl bg-dark-card border border-purple-500/20 hover:border-purple-500/40 transition-all cursor-pointer">
          <div class="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
          <div class="relative p-5">
            <div class="text-xs uppercase tracking-wider text-purple-400 font-bold mb-3">Lowest PA</div>
            <div class="flex items-center gap-3 mb-3">
              <img 
                :src="leaders.lowestPA?.logo_url || defaultAvatar" 
                :alt="leaders.lowestPA?.name" 
                class="w-12 h-12 rounded-full border-2 border-purple-500/50 object-cover" 
                @error="handleImageError" 
              />
              <div class="flex-1 min-w-0">
                <div class="font-bold text-lg text-dark-text truncate">{{ leaders.lowestPA?.name || 'N/A' }}</div>
                <div class="text-sm text-dark-textMuted">{{ leaders.lowestPA ? `${leaders.lowestPA.wins}-${leaders.lowestPA.losses}` : '' }}</div>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <div class="text-2xl font-black text-purple-400">{{ leaders.lowestPA?.points_against?.toFixed(1) || '0.0' }}</div>
              <div class="text-xs text-purple-400/70">PA</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Standings Section -->
    <div class="card">
      <div class="card-header">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-2xl">🏆</span>
            <h2 class="card-title">League Standings</h2>
          </div>
          <div class="text-sm text-dark-textMuted">
            {{ leagueStore.yahooTeams.length }} Teams
          </div>
        </div>
      </div>
      <div class="card-body">
        <div v-if="leagueStore.yahooStandings.length === 0" class="text-center py-8">
          <p class="text-dark-textMuted">No standings data available</p>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="text-left text-xs text-dark-textMuted uppercase border-b border-dark-border">
                <th class="py-3 px-4">Rank</th>
                <th class="py-3 px-4">Team</th>
                <th class="py-3 px-4 text-center">Record</th>
                <th class="py-3 px-4 text-right hidden sm:table-cell">PF</th>
                <th class="py-3 px-4 text-right hidden sm:table-cell">PA</th>
                <th class="py-3 px-4 text-right hidden md:table-cell">Diff</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="team in sortedStandings" 
                :key="team.team_key"
                class="border-b border-dark-border/50 hover:bg-dark-border/20 transition-colors"
                :class="{ 'bg-primary/5': isMyTeam(team.team_key) }"
              >
                <td class="py-3 px-4">
                  <div class="flex items-center gap-2">
                    <span 
                      class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      :class="getRankClass(team.rank)"
                    >
                      {{ team.rank }}
                    </span>
                  </div>
                </td>
                <td class="py-3 px-4">
                  <div class="flex items-center gap-3">
                    <img 
                      :src="getTeamLogo(team.team_key)" 
                      :alt="team.name"
                      class="w-8 h-8 rounded-full border border-dark-border object-cover"
                      @error="handleImageError"
                    />
                    <div>
                      <div class="font-semibold text-dark-text flex items-center gap-2">
                        {{ team.name }}
                        <span v-if="isMyTeam(team.team_key)" class="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">You</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td class="py-3 px-4 text-center">
                  <span class="font-bold" :class="team.wins > team.losses ? 'text-green-400' : team.wins < team.losses ? 'text-red-400' : 'text-dark-text'">
                    {{ team.wins }}-{{ team.losses }}{{ team.ties > 0 ? `-${team.ties}` : '' }}
                  </span>
                </td>
                <td class="py-3 px-4 text-right font-medium text-dark-text hidden sm:table-cell">{{ team.points_for.toFixed(1) }}</td>
                <td class="py-3 px-4 text-right text-dark-textMuted hidden sm:table-cell">{{ team.points_against.toFixed(1) }}</td>
                <td class="py-3 px-4 text-right hidden md:table-cell">
                  <span :class="team.points_for - team.points_against > 0 ? 'text-green-400' : 'text-red-400'">
                    {{ (team.points_for - team.points_against) > 0 ? '+' : '' }}{{ (team.points_for - team.points_against).toFixed(1) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Platform Badge -->
    <div class="flex justify-center">
      <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-600/10 border border-purple-600/30">
        <span class="text-sm font-bold text-purple-400">Y!</span>
        <span class="text-sm text-purple-300">Powered by Yahoo Fantasy</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLeagueStore } from '@/stores/league'

const leagueStore = useLeagueStore()

const defaultAvatar = 'https://s.yimg.com/cv/apiv2/default/nfl/nfl_1_100.png'

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
    
    // Get team standings info
    const team1Standings = leagueStore.yahooTeams.find(t => t.team_key === team1.team_key)
    const team2Standings = leagueStore.yahooTeams.find(t => t.team_key === team2.team_key)
    
    return {
      matchup_id: matchup.matchup_id,
      team1: {
        ...team1,
        wins: team1Standings?.wins || 0,
        losses: team1Standings?.losses || 0,
        logo_url: team1.logo_url || team1Standings?.logo_url
      },
      team2: {
        ...team2,
        wins: team2Standings?.wins || 0,
        losses: team2Standings?.losses || 0,
        logo_url: team2.logo_url || team2Standings?.logo_url
      }
    }
  })
})

// Calculate leaders from standings/teams data
const leaders = computed(() => {
  const teams = leagueStore.yahooTeams || []
  
  if (teams.length === 0) {
    return { mostPoints: null, bestRecord: null, lowestPA: null }
  }
  
  // Most Points For
  const mostPoints = [...teams].sort((a, b) => (b.points_for || 0) - (a.points_for || 0))[0]
  
  // Best Record (by win %, then PF)
  const bestRecord = [...teams].sort((a, b) => {
    const aWinPct = (a.wins || 0) / Math.max((a.wins || 0) + (a.losses || 0), 1)
    const bWinPct = (b.wins || 0) / Math.max((b.wins || 0) + (b.losses || 0), 1)
    if (bWinPct !== aWinPct) return bWinPct - aWinPct
    return (b.points_for || 0) - (a.points_for || 0)
  })[0]
  
  // Lowest Points Against (lucky team)
  const lowestPA = [...teams].sort((a, b) => (a.points_against || 999999) - (b.points_against || 999999))[0]
  
  return { mostPoints, bestRecord, lowestPA }
})

const sortedStandings = computed(() => {
  return [...(leagueStore.yahooStandings || [])].sort((a, b) => a.rank - b.rank)
})

function getTeamRecord(team: any): string {
  const wins = team.wins || 0
  const losses = team.losses || 0
  return `${wins}-${losses}`
}

function getTeamLogo(teamKey: string): string {
  const team = leagueStore.yahooTeams.find(t => t.team_key === teamKey)
  return team?.logo_url || defaultAvatar
}

function isMyTeam(teamKey: string): boolean {
  const team = leagueStore.yahooTeams.find(t => t.team_key === teamKey)
  return team?.is_my_team || false
}

function getRankClass(rank: number): string {
  if (rank === 1) return 'bg-yellow-500 text-gray-900'
  if (rank === 2) return 'bg-gray-400 text-gray-900'
  if (rank === 3) return 'bg-amber-700 text-white'
  return 'bg-dark-border text-dark-textMuted'
}

function handleImageError(e: Event) {
  const img = e.target as HTMLImageElement
  img.src = defaultAvatar
}
</script>
