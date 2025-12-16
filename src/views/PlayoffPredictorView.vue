<template>
  <div class="space-y-6">
    <!-- Header with Admin Settings -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="text-3xl font-bold text-dark-text mb-2">Playoff Predictor</h1>
        <p class="text-base text-dark-textMuted">
          Simulate remaining games and calculate playoff probabilities
        </p>
      </div>
      <div class="flex items-center gap-3">
        <button @click="showSettingsModal = true" class="btn-secondary flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Playoff Settings
        </button>
        <select v-model="selectedSeason" @change="onSeasonChange" class="select">
          <option v-for="season in leagueStore.historicalSeasons" :key="season.season" :value="season.season">
            {{ season.season }} Season
          </option>
        </select>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-primary"></div>
    </div>

    <template v-else-if="selectedSeason">
      <!-- Playoff Settings Modal -->
      <div v-if="showSettingsModal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" @click.self="showSettingsModal = false">
        <div class="bg-dark-card rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div class="p-6 border-b border-dark-border">
            <div class="flex items-center justify-between">
              <h2 class="text-2xl font-bold text-dark-text">Playoff Settings</h2>
              <button @click="showSettingsModal = false" class="text-dark-textMuted hover:text-dark-text">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div class="p-6 space-y-6">
            <!-- Playoff Format -->
            <div>
              <label class="block text-sm font-semibold text-dark-text mb-2">Playoff Format</label>
              <select v-model="playoffSettings.format" class="select w-full">
                <option value="top_overall">Top Teams Overall (No Divisions)</option>
                <option value="top_per_division">Top Teams Per Division</option>
              </select>
              <p class="text-xs text-dark-textMuted mt-1">How playoff teams are determined</p>
            </div>

            <!-- Number of Playoff Teams -->
            <div>
              <label class="block text-sm font-semibold text-dark-text mb-2">
                {{ playoffSettings.format === 'top_per_division' ? 'Teams Per Division' : 'Total Playoff Teams' }}
              </label>
              <input 
                v-model.number="playoffSettings.playoffTeams" 
                type="number" 
                min="2" 
                :max="playoffSettings.format === 'top_per_division' ? 6 : 12"
                class="select w-full"
              />
              <p class="text-xs text-dark-textMuted mt-1">
                {{ playoffSettings.format === 'top_per_division' 
                  ? 'Number of teams from each division that make playoffs' 
                  : 'Total number of teams in playoffs' 
                }}
              </p>
            </div>

            <!-- Division Configuration (only if top_per_division) -->
            <div v-if="playoffSettings.format === 'top_per_division'">
              <label class="block text-sm font-semibold text-dark-text mb-2">Number of Divisions</label>
              <input 
                v-model.number="playoffSettings.numDivisions" 
                type="number" 
                min="2" 
                max="4"
                class="select w-full"
              />
              <p class="text-xs text-dark-textMuted mt-1">How many divisions in your league</p>
            </div>

            <!-- Division Assignments (only if top_per_division) -->
            <div v-if="playoffSettings.format === 'top_per_division'" class="space-y-4">
              <label class="block text-sm font-semibold text-dark-text">Division Assignments</label>
              <div v-for="(division, idx) in divisionAssignments" :key="idx" class="space-y-2">
                <div class="text-sm font-medium text-primary">Division {{ idx + 1 }}</div>
                <div class="grid grid-cols-1 gap-2">
                  <div v-for="team in currentTeams" :key="team.roster_id" class="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      :id="`team-${team.roster_id}-div-${idx}`"
                      :checked="isTeamInDivision(team.roster_id, idx)"
                      @change="toggleTeamDivision(team.roster_id, idx)"
                      class="w-4 h-4 text-primary bg-dark-border border-dark-border rounded focus:ring-primary"
                    />
                    <label :for="`team-${team.roster_id}-div-${idx}`" class="flex items-center gap-2 cursor-pointer">
                      <img :src="team.avatar" :alt="team.name" class="w-6 h-6 rounded-full" @error="handleImageError" />
                      <span class="text-sm text-dark-text">{{ team.name }}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <!-- Playoff Start Week -->
            <div>
              <label class="block text-sm font-semibold text-dark-text mb-2">Playoff Start Week</label>
              <input 
                v-model.number="playoffSettings.playoffWeekStart" 
                type="number" 
                min="13" 
                max="18"
                class="select w-full"
              />
              <p class="text-xs text-dark-textMuted mt-1">First week of playoffs</p>
            </div>

            <!-- Current Week (for simulation) -->
            <div>
              <label class="block text-sm font-semibold text-dark-text mb-2">Current Week</label>
              <select v-model.number="playoffSettings.currentWeek" class="select w-full">
                <option v-for="week in availableWeeks" :key="week" :value="week">
                  Week {{ week }}
                </option>
              </select>
              <p class="text-xs text-dark-textMuted mt-1">Simulate from this week onwards</p>
            </div>
          </div>

          <div class="p-6 border-t border-dark-border flex justify-end gap-3">
            <button @click="showSettingsModal = false" class="btn-secondary">Cancel</button>
            <button @click="savePlayoffSettings" class="btn-primary">Save Settings</button>
          </div>
        </div>
      </div>

      <!-- Current Playoff Picture -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">📊</span>
            <h2 class="card-title">Current Playoff Picture</h2>
          </div>
          <p class="card-subtitle mt-2">
            Based on standings through Week {{ playoffSettings.currentWeek - 1 }}
            {{ playoffSettings.format === 'top_per_division' 
              ? ` - Top ${playoffSettings.playoffTeams} per division` 
              : ` - Top ${playoffSettings.playoffTeams} overall` 
            }}
          </p>
        </div>
        <div class="card-body">
          <div class="space-y-4">
            <div v-for="(team, idx) in currentStandings" :key="team.roster_id">
              <div 
                class="flex items-center justify-between p-4 rounded-lg transition-colors"
                :class="getStandingClass(idx, team)"
              >
                <div class="flex items-center gap-4 flex-1">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                       :class="getSeedBadgeClass(idx, team)">
                    {{ idx + 1 }}
                  </div>
                  <img :src="team.avatar" :alt="team.name" class="w-10 h-10 rounded-full" @error="handleImageError" />
                  <div class="flex-1">
                    <div class="font-semibold text-dark-text">{{ team.name }}</div>
                    <div class="text-sm text-dark-textMuted">
                      {{ team.wins }}-{{ team.losses }}{{ team.ties > 0 ? `-${team.ties}` : '' }}
                      • {{ team.pointsFor.toFixed(1) }} PF
                      <span v-if="playoffSettings.format === 'top_per_division'" class="ml-2">
                        • Division {{ team.division + 1 }}
                      </span>
                    </div>
                  </div>
                  <div class="text-right">
                    <div v-if="isInPlayoffs(idx, team)" class="text-green-400 font-semibold text-sm">
                      {{ getPlayoffSeedText(idx, team) }}
                    </div>
                    <div v-else-if="canMakePlayoffs(team)" class="text-orange-400 font-semibold text-sm">
                      {{ getGamesBack(team) }} GB
                    </div>
                    <div v-else class="text-red-400 font-semibold text-sm">
                      Eliminated
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Playoff Probabilities -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center justify-between">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-2xl">🎲</span>
                <h2 class="card-title">Playoff Probabilities</h2>
              </div>
              <p class="card-subtitle mt-2">
                Based on {{ simulationCount.toLocaleString() }} simulations of remaining games
              </p>
            </div>
            <button 
              @click="runSimulation" 
              :disabled="isSimulating"
              class="btn-primary flex items-center gap-2"
            >
              <svg v-if="!isSimulating" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <div v-else class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              {{ isSimulating ? 'Simulating...' : 'Run Simulation' }}
            </button>
          </div>
        </div>
        <div class="card-body">
          <div v-if="!simulationResults.length" class="text-center py-12 text-dark-textMuted">
            Click "Run Simulation" to calculate playoff probabilities
          </div>
          <div v-else class="space-y-3">
            <div v-for="result in simulationResults" :key="result.roster_id" 
                 class="flex items-center gap-4 p-3 bg-dark-border/20 rounded-lg">
              <img :src="result.avatar" :alt="result.name" class="w-10 h-10 rounded-full" @error="handleImageError" />
              <div class="flex-1">
                <div class="font-semibold text-dark-text">{{ result.name }}</div>
                <div class="text-sm text-dark-textMuted">
                  {{ result.currentWins }}-{{ result.currentLosses }}
                  • Avg Final: {{ result.avgWins.toFixed(1) }}-{{ result.avgLosses.toFixed(1) }}
                </div>
              </div>
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <div class="flex-1 bg-dark-border rounded-full h-6 overflow-hidden">
                    <div 
                      class="h-full flex items-center justify-center text-xs font-bold transition-all"
                      :style="{ 
                        width: `${result.playoffProbability}%`,
                        backgroundColor: getProbabilityColor(result.playoffProbability)
                      }"
                    >
                      <span v-if="result.playoffProbability > 15" class="text-white">
                        {{ result.playoffProbability.toFixed(0) }}%
                      </span>
                    </div>
                  </div>
                  <div class="w-16 text-right font-bold text-primary">
                    {{ result.playoffProbability.toFixed(1) }}%
                  </div>
                </div>
                <div v-if="result.clinched" class="text-xs text-green-400 font-semibold mt-1">
                  ✓ CLINCHED
                </div>
                <div v-else-if="result.eliminated" class="text-xs text-red-400 font-semibold mt-1">
                  ✗ ELIMINATED
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Magic Numbers & Scenarios -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Clinching Scenarios -->
        <div class="card">
          <div class="card-header">
            <div class="flex items-center gap-2">
              <span class="text-2xl">✨</span>
              <h2 class="card-title">Magic Numbers</h2>
            </div>
            <p class="card-subtitle mt-2">Wins needed to clinch playoff spot</p>
          </div>
          <div class="card-body">
            <div v-if="!magicNumbers.length" class="text-center py-8 text-dark-textMuted">
              Run simulation to calculate magic numbers
            </div>
            <div v-else class="space-y-3">
              <div v-for="magic in magicNumbers" :key="magic.roster_id"
                   class="flex items-center justify-between p-3 bg-dark-border/20 rounded-lg">
                <div class="flex items-center gap-3">
                  <img :src="magic.avatar" :alt="magic.name" class="w-8 h-8 rounded-full" @error="handleImageError" />
                  <div>
                    <div class="font-semibold text-dark-text text-sm">{{ magic.name }}</div>
                    <div class="text-xs text-dark-textMuted">{{ magic.currentWins }}-{{ magic.currentLosses }}</div>
                  </div>
                </div>
                <div class="text-right">
                  <div v-if="magic.clinched" class="text-green-400 font-bold">
                    CLINCHED ✓
                  </div>
                  <div v-else-if="magic.magicNumber !== null" class="text-primary font-bold text-2xl">
                    {{ magic.magicNumber }}
                  </div>
                  <div v-else class="text-dark-textMuted text-sm">
                    Must win out
                  </div>
                  <div v-if="!magic.clinched && magic.magicNumber !== null" class="text-xs text-dark-textMuted">
                    wins to clinch
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Elimination Numbers -->
        <div class="card">
          <div class="card-header">
            <div class="flex items-center gap-2">
              <span class="text-2xl">❌</span>
              <h2 class="card-title">Elimination Numbers</h2>
            </div>
            <p class="card-subtitle mt-2">Losses until playoff elimination</p>
          </div>
          <div class="card-body">
            <div v-if="!eliminationNumbers.length" class="text-center py-8 text-dark-textMuted">
              Run simulation to calculate elimination numbers
            </div>
            <div v-else class="space-y-3">
              <div v-for="elim in eliminationNumbers" :key="elim.roster_id"
                   class="flex items-center justify-between p-3 bg-dark-border/20 rounded-lg">
                <div class="flex items-center gap-3">
                  <img :src="elim.avatar" :alt="elim.name" class="w-8 h-8 rounded-full" @error="handleImageError" />
                  <div>
                    <div class="font-semibold text-dark-text text-sm">{{ elim.name }}</div>
                    <div class="text-xs text-dark-textMuted">{{ elim.currentWins }}-{{ elim.currentLosses }}</div>
                  </div>
                </div>
                <div class="text-right">
                  <div v-if="elim.eliminated" class="text-red-400 font-bold">
                    ELIMINATED ✗
                  </div>
                  <div v-else-if="elim.eliminationNumber !== null" class="text-red-400 font-bold text-2xl">
                    {{ elim.eliminationNumber }}
                  </div>
                  <div v-else class="text-green-400 text-sm font-semibold">
                    Safe
                  </div>
                  <div v-if="!elim.eliminated && elim.eliminationNumber !== null" class="text-xs text-dark-textMuted">
                    losses to eliminate
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="card">
      <div class="card-body text-center py-12">
        <p class="text-dark-textMuted">Select a season to view playoff predictions</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { sleeperService } from '@/services/sleeper'
import { simulationService } from '@/services/simulation'
import type { SleeperRoster, SleeperMatchup } from '@/types/sleeper'
import type { TeamStrength, RemainingGame } from '@/services/simulation'

const leagueStore = useLeagueStore()

// State
const selectedSeason = ref('')
const isLoading = ref(false)
const showSettingsModal = ref(false)
const isSimulating = ref(false)
const simulationCount = ref(10000)

interface PlayoffSettings {
  format: 'top_overall' | 'top_per_division'
  playoffTeams: number
  numDivisions: number
  playoffWeekStart: number
  currentWeek: number
}

const playoffSettings = ref<PlayoffSettings>({
  format: 'top_overall',
  playoffTeams: 6,
  numDivisions: 2,
  playoffWeekStart: 15,
  currentWeek: 14
})

const divisionAssignments = ref<number[][]>([[], []])

interface TeamStanding {
  roster_id: number
  name: string
  avatar: string
  wins: number
  losses: number
  ties: number
  pointsFor: number
  division?: number
}

const currentStandings = ref<TeamStanding[]>([])
const currentTeams = ref<TeamStanding[]>([])

interface SimulationResult {
  roster_id: number
  name: string
  avatar: string
  currentWins: number
  currentLosses: number
  avgWins: number
  avgLosses: number
  playoffProbability: number
  clinched: boolean
  eliminated: boolean
}

const simulationResults = ref<SimulationResult[]>([])
const magicNumbers = ref<any[]>([])
const eliminationNumbers = ref<any[]>([])

// Computed
const availableWeeks = computed(() => {
  if (!selectedSeason.value) return []
  
  const matchups = leagueStore.historicalMatchups.get(selectedSeason.value)
  if (!matchups) return []
  
  const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === selectedSeason.value)
  const playoffStart = seasonInfo?.settings?.playoff_week_start || 15
  
  return Array.from(matchups.keys())
    .filter(w => w < playoffStart)
    .sort((a, b) => a - b)
})

// Functions
function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement
  img.src = 'https://sleepercdn.com/avatars/thumbs/default'
}

function onSeasonChange() {
  loadStandings()
  loadSavedSettings()
}

function loadSavedSettings() {
  const saved = localStorage.getItem(`playoff_settings_${selectedSeason.value}`)
  if (saved) {
    const parsed = JSON.parse(saved)
    playoffSettings.value = parsed.settings
    divisionAssignments.value = parsed.divisions || [[], []]
  } else {
    // Set defaults from league settings
    const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === selectedSeason.value)
    if (seasonInfo) {
      playoffSettings.value.playoffWeekStart = seasonInfo.settings?.playoff_week_start || 15
      playoffSettings.value.playoffTeams = seasonInfo.settings?.playoff_teams || 6
    }
  }
}

function savePlayoffSettings() {
  const toSave = {
    settings: playoffSettings.value,
    divisions: divisionAssignments.value
  }
  localStorage.setItem(`playoff_settings_${selectedSeason.value}`, JSON.stringify(toSave))
  showSettingsModal.value = false
  loadStandings()
}

function isTeamInDivision(rosterId: number, divisionIdx: number): boolean {
  return divisionAssignments.value[divisionIdx]?.includes(rosterId) || false
}

function toggleTeamDivision(rosterId: number, divisionIdx: number) {
  // Remove from all divisions first
  divisionAssignments.value.forEach(div => {
    const idx = div.indexOf(rosterId)
    if (idx > -1) div.splice(idx, 1)
  })
  
  // Add to selected division
  if (!divisionAssignments.value[divisionIdx]) {
    divisionAssignments.value[divisionIdx] = []
  }
  divisionAssignments.value[divisionIdx].push(rosterId)
}

async function loadStandings() {
  if (!selectedSeason.value) return
  
  isLoading.value = true
  
  try {
    const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === selectedSeason.value)
    if (!seasonInfo) return
    
    const rosters = leagueStore.historicalRosters.get(selectedSeason.value) || []
    const users = leagueStore.historicalUsers.get(selectedSeason.value) || []
    const matchups = leagueStore.historicalMatchups.get(selectedSeason.value)
    if (!matchups) return
    
    const standings: TeamStanding[] = []
    
    rosters.forEach(roster => {
      const user = users.find(u => u.user_id === roster.owner_id)
      let wins = 0
      let losses = 0
      let ties = 0
      let pointsFor = 0
      
      const currentWeek = playoffSettings.value.currentWeek - 1
      
      matchups.forEach((weekMatchups, week) => {
        if (week >= playoffSettings.value.playoffWeekStart || week > currentWeek) return
        
        const myMatch = weekMatchups.find(m => m.roster_id === roster.roster_id)
        if (!myMatch?.matchup_id) return
        
        const opponent = weekMatchups.find(m => 
          m.matchup_id === myMatch.matchup_id && m.roster_id !== roster.roster_id
        )
        
        if (opponent) {
          const myPoints = myMatch.points || 0
          const oppPoints = opponent.points || 0
          
          pointsFor += myPoints
          
          if (myPoints > oppPoints) wins++
          else if (myPoints < oppPoints) losses++
          else ties++
        }
      })
      
      // Determine division
      let division = 0
      if (playoffSettings.value.format === 'top_per_division') {
        for (let i = 0; i < divisionAssignments.value.length; i++) {
          if (divisionAssignments.value[i]?.includes(roster.roster_id)) {
            division = i
            break
          }
        }
      }
      
      standings.push({
        roster_id: roster.roster_id,
        name: sleeperService.getTeamName(roster, user),
        avatar: sleeperService.getAvatarUrl(roster, user, seasonInfo),
        wins,
        losses,
        ties,
        pointsFor,
        division
      })
    })
    
    // Sort standings
    if (playoffSettings.value.format === 'top_per_division') {
      standings.sort((a, b) => {
        if (a.division !== b.division) return a.division! - b.division!
        if (b.wins !== a.wins) return b.wins - a.wins
        return b.pointsFor - a.pointsFor
      })
    } else {
      standings.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins
        return b.pointsFor - a.pointsFor
      })
    }
    
    currentStandings.value = standings
    currentTeams.value = standings.map(s => ({ ...s }))
  } catch (error) {
    console.error('Failed to load standings:', error)
  } finally {
    isLoading.value = false
  }
}

function getStandingClass(idx: number, team: TeamStanding): string {
  if (isInPlayoffs(idx, team)) {
    return 'bg-green-500/10 border-l-4 border-green-500'
  } else if (canMakePlayoffs(team)) {
    return 'bg-dark-border/20'
  } else {
    return 'bg-red-500/5 opacity-60'
  }
}

function getSeedBadgeClass(idx: number, team: TeamStanding): string {
  if (isInPlayoffs(idx, team)) {
    return 'bg-green-500/20 text-green-400'
  } else if (canMakePlayoffs(team)) {
    return 'bg-orange-500/20 text-orange-400'
  } else {
    return 'bg-red-500/20 text-red-400'
  }
}

function isInPlayoffs(idx: number, team: TeamStanding): boolean {
  if (playoffSettings.value.format === 'top_per_division') {
    const divisionStandings = currentStandings.value.filter(t => t.division === team.division)
    const divisionRank = divisionStandings.findIndex(t => t.roster_id === team.roster_id)
    return divisionRank < playoffSettings.value.playoffTeams
  } else {
    return idx < playoffSettings.value.playoffTeams
  }
}

function getPlayoffSeedText(idx: number, team: TeamStanding): string {
  if (playoffSettings.value.format === 'top_per_division') {
    const divisionStandings = currentStandings.value.filter(t => t.division === team.division)
    const divisionRank = divisionStandings.findIndex(t => t.roster_id === team.roster_id)
    return `Seed #${divisionRank + 1} (Div ${team.division! + 1})`
  } else {
    return `Seed #${idx + 1}`
  }
}

function canMakePlayoffs(team: TeamStanding): boolean {
  // Simple check - can improve with actual math
  return team.wins >= (currentStandings.value[0]?.wins || 0) - 3
}

function getGamesBack(team: TeamStanding): string {
  let cutoffTeam: TeamStanding | undefined
  
  if (playoffSettings.value.format === 'top_per_division') {
    const divisionStandings = currentStandings.value.filter(t => t.division === team.division)
    cutoffTeam = divisionStandings[playoffSettings.value.playoffTeams - 1]
  } else {
    cutoffTeam = currentStandings.value[playoffSettings.value.playoffTeams - 1]
  }
  
  if (!cutoffTeam) return '0'
  
  const gamesBack = (cutoffTeam.wins - team.wins) + (team.losses - cutoffTeam.losses)
  return (gamesBack / 2).toFixed(1)
}

async function runSimulation() {
  if (!selectedSeason.value) return
  
  isSimulating.value = true
  
  try {
    const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === selectedSeason.value)
    if (!seasonInfo) return
    
    const matchups = leagueStore.historicalMatchups.get(selectedSeason.value)
    if (!matchups) return
    
    // Calculate team strengths from historical data
    const teamStrengths = new Map<number, TeamStrength>()
    currentStandings.value.forEach(team => {
      const strength = simulationService.calculateTeamStrength(
        team.roster_id,
        matchups,
        playoffSettings.value.currentWeek
      )
      teamStrengths.set(team.roster_id, strength)
    })
    
    // Generate remaining schedule
    const remainingGames = simulationService.generateRemainingSchedule(
      matchups,
      playoffSettings.value.currentWeek,
      playoffSettings.value.playoffWeekStart
    )
    
    // Run Monte Carlo simulation
    const simulationResults = simulationService.runMonteCarloSimulation(
      teamStrengths,
      remainingGames,
      {
        format: playoffSettings.value.format,
        playoffTeams: playoffSettings.value.playoffTeams,
        numDivisions: playoffSettings.value.numDivisions,
        playoffWeekStart: playoffSettings.value.playoffWeekStart,
        currentWeek: playoffSettings.value.currentWeek,
        divisionAssignments: divisionAssignments.value
      },
      simulationCount.value
    )
    
    // Process results
    const results: SimulationResult[] = []
    
    currentStandings.value.forEach(team => {
      const simResult = simulationResults.get(team.roster_id)
      if (!simResult) return
      
      const avgWins = simResult.totalWins / simulationCount.value
      const avgLosses = simResult.totalLosses / simulationCount.value
      const playoffProbability = (simResult.playoffAppearances / simulationCount.value) * 100
      
      // Check if clinched or eliminated
      const clinched = playoffProbability >= 99.9
      const eliminated = playoffProbability <= 0.1
      
      results.push({
        roster_id: team.roster_id,
        name: team.name,
        avatar: team.avatar,
        currentWins: team.wins,
        currentLosses: team.losses,
        avgWins,
        avgLosses,
        playoffProbability,
        clinched,
        eliminated
      })
    })
    
    // Sort by playoff probability
    results.sort((a, b) => b.playoffProbability - a.playoffProbability)
    simulationResults.value = results
    
    // Calculate magic numbers
    const currentStandingsMap = new Map(
      currentStandings.value.map(team => [
        team.roster_id,
        { wins: team.wins, losses: team.losses, pointsFor: team.pointsFor }
      ])
    )
    
    magicNumbers.value = currentStandings.value.map(team => {
      const result = results.find(r => r.roster_id === team.roster_id)
      const magicNumber = simulationService.calculateMagicNumber(
        team.roster_id,
        currentStandingsMap,
        remainingGames,
        {
          format: playoffSettings.value.format,
          playoffTeams: playoffSettings.value.playoffTeams,
          numDivisions: playoffSettings.value.numDivisions,
          playoffWeekStart: playoffSettings.value.playoffWeekStart,
          currentWeek: playoffSettings.value.currentWeek,
          divisionAssignments: divisionAssignments.value
        }
      )
      
      return {
        roster_id: team.roster_id,
        name: team.name,
        avatar: team.avatar,
        currentWins: team.wins,
        currentLosses: team.losses,
        clinched: result?.clinched || false,
        magicNumber
      }
    })
    
    // Calculate elimination numbers
    eliminationNumbers.value = currentStandings.value.map(team => {
      const result = results.find(r => r.roster_id === team.roster_id)
      const eliminationNumber = simulationService.calculateEliminationNumber(
        team.roster_id,
        currentStandingsMap,
        remainingGames,
        {
          format: playoffSettings.value.format,
          playoffTeams: playoffSettings.value.playoffTeams,
          numDivisions: playoffSettings.value.numDivisions,
          playoffWeekStart: playoffSettings.value.playoffWeekStart,
          currentWeek: playoffSettings.value.currentWeek,
          divisionAssignments: divisionAssignments.value
        }
      )
      
      return {
        roster_id: team.roster_id,
        name: team.name,
        avatar: team.avatar,
        currentWins: team.wins,
        currentLosses: team.losses,
        eliminated: result?.eliminated || false,
        eliminationNumber
      }
    })
  } catch (error) {
    console.error('Simulation failed:', error)
  } finally {
    isSimulating.value = false
  }
}


function getProbabilityColor(probability: number): string {
  if (probability >= 90) return '#10b981' // green
  if (probability >= 70) return '#3b82f6' // blue
  if (probability >= 50) return '#f59e0b' // orange
  if (probability >= 25) return '#ef4444' // red
  return '#6b7280' // gray
}

onMounted(() => {
  if (leagueStore.historicalSeasons.length > 0) {
    selectedSeason.value = leagueStore.historicalSeasons[0].season
    loadStandings()
    loadSavedSettings()
  }
})
</script>

<style scoped>
.select {
  @apply px-4 py-2 bg-dark-border rounded-lg text-dark-text border border-dark-border/50 focus:border-primary focus:outline-none;
}

.btn-primary {
  @apply px-4 py-2 bg-primary text-dark-bg rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed;
}

.btn-secondary {
  @apply px-4 py-2 bg-dark-border text-dark-text rounded-lg font-semibold hover:bg-dark-border/70 transition-colors;
}
</style>
