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

    <!-- Hero Section -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600/20 via-dark-card to-dark-bg border border-dark-border">
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent"></div>
      
      <div class="relative p-6 md:p-8">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center">
            <span class="text-2xl font-bold text-white">Y!</span>
          </div>
          <div>
            <h1 class="text-3xl md:text-4xl font-black text-dark-text tracking-tight">{{ leagueName }}</h1>
            <p class="text-dark-textMuted text-base mt-1">{{ season }} Season • Yahoo Fantasy</p>
          </div>
        </div>

        <div v-if="leagueStore.isLoading" class="flex items-center justify-center py-12">
          <div class="text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-500 mx-auto mb-3"></div>
            <p class="text-dark-textMuted text-sm">Loading league data...</p>
          </div>
        </div>

        <!-- Quick Stats -->
        <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div class="bg-dark-bg/60 rounded-xl p-4 border border-dark-border/50">
            <div class="text-2xl font-black text-dark-text">{{ leagueStore.yahooTeams.length }}</div>
            <div class="text-sm text-dark-textMuted">Teams</div>
          </div>
          <div class="bg-dark-bg/60 rounded-xl p-4 border border-dark-border/50">
            <div class="text-2xl font-black text-dark-text">{{ season }}</div>
            <div class="text-sm text-dark-textMuted">Season</div>
          </div>
          <div class="bg-dark-bg/60 rounded-xl p-4 border border-dark-border/50">
            <div class="text-2xl font-black text-purple-400">Yahoo</div>
            <div class="text-sm text-dark-textMuted">Platform</div>
          </div>
          <div class="bg-dark-bg/60 rounded-xl p-4 border border-dark-border/50">
            <div class="text-2xl font-black text-green-400">Active</div>
            <div class="text-sm text-dark-textMuted">Status</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Standings Section -->
    <div class="card">
      <div class="card-header">
        <div class="flex items-center gap-3">
          <span class="text-2xl">🏆</span>
          <h2 class="card-title">League Standings</h2>
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
                <th class="py-3 px-4 text-center">W</th>
                <th class="py-3 px-4 text-center">L</th>
                <th class="py-3 px-4 text-center">T</th>
                <th class="py-3 px-4 text-right">PF</th>
                <th class="py-3 px-4 text-right">PA</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="team in leagueStore.yahooStandings" 
                :key="team.team_key"
                class="border-b border-dark-border/50 hover:bg-dark-border/20 transition-colors"
              >
                <td class="py-3 px-4">
                  <div class="flex items-center gap-2">
                    <span 
                      class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      :class="getRankClass(team.rank)"
                    >
                      {{ team.rank }}
                    </span>
                  </div>
                </td>
                <td class="py-3 px-4">
                  <div class="font-semibold text-dark-text">{{ team.name }}</div>
                </td>
                <td class="py-3 px-4 text-center text-green-400 font-medium">{{ team.wins }}</td>
                <td class="py-3 px-4 text-center text-red-400 font-medium">{{ team.losses }}</td>
                <td class="py-3 px-4 text-center text-dark-textMuted">{{ team.ties }}</td>
                <td class="py-3 px-4 text-right font-medium text-dark-text">{{ team.points_for.toFixed(1) }}</td>
                <td class="py-3 px-4 text-right text-dark-textMuted">{{ team.points_against.toFixed(1) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Teams Section -->
    <div class="card">
      <div class="card-header">
        <div class="flex items-center gap-3">
          <span class="text-2xl">👥</span>
          <h2 class="card-title">Teams</h2>
        </div>
      </div>
      <div class="card-body">
        <div v-if="leagueStore.yahooTeams.length === 0" class="text-center py-8">
          <p class="text-dark-textMuted">No teams data available</p>
        </div>
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div 
            v-for="team in leagueStore.yahooTeams" 
            :key="team.team_key"
            class="bg-dark-bg/50 rounded-xl p-4 border border-dark-border/50 hover:border-purple-500/50 transition-colors"
          >
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center">
                <span class="text-sm font-bold text-purple-400">
                  {{ team.name?.substring(0, 2).toUpperCase() || '??' }}
                </span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-dark-text truncate">{{ team.name }}</div>
                <div class="text-xs text-dark-textMuted">Team {{ team.team_id }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Coming Soon Features -->
    <div class="card bg-gradient-to-br from-purple-600/10 to-dark-card">
      <div class="card-body text-center py-8">
        <div class="text-4xl mb-4">🚧</div>
        <h3 class="text-xl font-bold text-dark-text mb-2">More Yahoo Features Coming Soon</h3>
        <p class="text-dark-textMuted max-w-md mx-auto">
          We're working on bringing matchups, rosters, projections, and more to Yahoo leagues. 
          Stay tuned for updates!
        </p>
        <div class="flex flex-wrap justify-center gap-3 mt-6">
          <span class="px-3 py-1 rounded-full bg-dark-border text-dark-textMuted text-sm">Matchups</span>
          <span class="px-3 py-1 rounded-full bg-dark-border text-dark-textMuted text-sm">Rosters</span>
          <span class="px-3 py-1 rounded-full bg-dark-border text-dark-textMuted text-sm">Projections</span>
          <span class="px-3 py-1 rounded-full bg-dark-border text-dark-textMuted text-sm">Draft Analysis</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLeagueStore } from '@/stores/league'

const leagueStore = useLeagueStore()

const leagueName = computed(() => leagueStore.currentLeague?.name || 'Yahoo League')
const season = computed(() => leagueStore.currentLeague?.season || new Date().getFullYear().toString())

function getRankClass(rank: number): string {
  if (rank === 1) return 'bg-yellow-500 text-gray-900'
  if (rank === 2) return 'bg-gray-400 text-gray-900'
  if (rank === 3) return 'bg-amber-700 text-white'
  return 'bg-dark-border text-dark-textMuted'
}
</script>
