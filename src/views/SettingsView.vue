<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-bold text-dark-text mb-2">Team Admin Portal</h1>
      <p class="text-base text-dark-textMuted">
        Customize team names and logos for your league
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-primary"></div>
    </div>

    <!-- No League Selected -->
    <div v-else-if="!leagueStore.activeLeagueId" class="card">
      <div class="card-body text-center py-20">
        <div class="text-6xl mb-4">⚙️</div>
        <h3 class="text-xl font-bold text-dark-text mb-2">No League Selected</h3>
        <p class="text-dark-textMuted">Please select a league from the header</p>
      </div>
    </div>

    <!-- Teams List -->
    <div v-else class="card">
      <div class="card-header">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-2xl">🎨</span>
            <h2 class="card-title">Team Customization</h2>
          </div>
          <div class="flex gap-2">
            <button @click="resetAll" class="btn-secondary text-sm">
              Reset All
            </button>
            <button @click="save" class="btn-primary text-sm">
              Save Changes
            </button>
          </div>
        </div>
      </div>

      <div class="card-body">
        <!-- Instructions -->
        <div class="bg-primary/10 border border-primary/30 rounded-lg p-4 mb-6">
          <div class="flex items-start gap-3">
            <span class="text-2xl">💡</span>
            <div class="flex-1">
              <h3 class="font-semibold text-dark-text mb-1">How it works</h3>
              <p class="text-sm text-dark-textMuted">
                Customize team names and logos. Changes will apply throughout the app after you click Save.
              </p>
            </div>
          </div>
        </div>

        <!-- Teams -->
        <div class="space-y-4">
          <div v-for="team in teamsList" :key="team.rosterId" 
               class="border border-dark-border rounded-xl p-4">
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
              
              <!-- Preview -->
              <div class="lg:col-span-3">
                <label class="block text-xs font-semibold text-dark-textMuted mb-2 uppercase">
                  Current Display
                </label>
                <div class="flex items-center gap-3">
                  <img 
                    :src="team.currentAvatar" 
                    :alt="team.currentName"
                    class="w-12 h-12 rounded-full border-2 border-dark-border"
                    @error="(e) => (e.target as HTMLImageElement).src = 'https://sleepercdn.com/avatars/thumbs/default'"
                  />
                  <div class="flex-1 min-w-0">
                    <div class="font-semibold text-dark-text truncate">
                      {{ team.currentName }}
                    </div>
                    <div class="text-xs text-dark-textMuted">
                      {{ team.record }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Custom Name -->
              <div class="lg:col-span-4">
                <label class="block text-xs font-semibold text-dark-textMuted mb-2 uppercase">
                  Custom Team Name
                </label>
                <input 
                  v-model="team.customName"
                  type="text" 
                  :placeholder="team.originalName"
                  class="input w-full"
                />
                <p class="text-xs text-dark-textMuted mt-1">
                  Original: {{ team.originalName }}
                </p>
              </div>

              <!-- Custom Logo -->
              <div class="lg:col-span-4">
                <label class="block text-xs font-semibold text-dark-textMuted mb-2 uppercase">
                  Custom Logo URL
                </label>
                <input 
                  v-model="team.customAvatar"
                  type="text" 
                  placeholder="https://example.com/logo.png"
                  class="input w-full"
                />
                <p class="text-xs text-dark-textMuted mt-1">
                  Leave blank for original
                </p>
              </div>

              <!-- Reset Button -->
              <div class="lg:col-span-1">
                <button 
                  @click="resetTeam(team.rosterId)"
                  class="btn-secondary w-full text-sm mt-6"
                  title="Reset this team"
                >
                  🔄
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Display Settings -->
    <div v-if="leagueStore.activeLeagueId" class="card">
      <div class="card-header">
        <div class="flex items-center gap-2">
          <span class="text-2xl">📊</span>
          <h2 class="card-title">Display Settings</h2>
        </div>
      </div>
      <div class="card-body">
        <div class="space-y-4">
          <!-- Division Display Option -->
          <div class="flex items-center justify-between p-4 bg-dark-border/20 rounded-lg">
            <div class="flex-1">
              <div class="font-semibold text-dark-text">Show Division in Standings</div>
              <p class="text-sm text-dark-textMuted mt-1">
                Display "1st in East Division" instead of "Currently 1st place" on matchup cards
              </p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                v-model="displaySettings.showDivisionInStandings" 
                @change="saveDisplaySettings"
                class="sr-only peer"
              />
              <div class="w-11 h-6 bg-dark-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <!-- Auto-refresh Option -->
          <div class="flex items-center justify-between p-4 bg-dark-border/20 rounded-lg">
            <div class="flex-1">
              <div class="font-semibold text-dark-text">Auto-refresh Live Data</div>
              <p class="text-sm text-dark-textMuted mt-1">
                Automatically refresh matchup data every 60 seconds during live games
              </p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                v-model="displaySettings.autoRefresh" 
                @change="saveDisplaySettings"
                class="sr-only peer"
              />
              <div class="w-11 h-6 bg-dark-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- Success Message -->
    <div v-if="showSuccess" 
         class="fixed bottom-6 right-6 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50">
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
      <span class="font-semibold">Settings saved!</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'

const leagueStore = useLeagueStore()
const isLoading = ref(false)
const showSuccess = ref(false)

// Display settings
const displaySettings = ref({
  showDivisionInStandings: false,
  autoRefresh: false
})

interface TeamData {
  rosterId: number
  originalName: string
  originalAvatar: string
  customName: string
  customAvatar: string
  currentName: string
  currentAvatar: string
  record: string
}

const teamsList = ref<TeamData[]>([])

// Load teams from store
function loadTeams() {
  if (!leagueStore.rosters || leagueStore.rosters.length === 0) {
    teamsList.value = []
    return
  }

  const customizations = getStoredCustomizations()

  teamsList.value = leagueStore.rosters.map(roster => {
    const user = leagueStore.users.find(u => u.user_id === roster.owner_id)
    
    // Get original name
    const originalName = user?.metadata?.team_name || user?.display_name || `Team ${roster.roster_id}`
    
    // Get original avatar
    let originalAvatar = 'https://sleepercdn.com/avatars/thumbs/default'
    if (roster.metadata?.avatar) {
      originalAvatar = `https://sleepercdn.com/avatars/thumbs/${roster.metadata.avatar}`
    } else if (user?.avatar) {
      originalAvatar = `https://sleepercdn.com/avatars/thumbs/${user.avatar}`
    }
    
    // Get customizations for this team
    const custom = customizations[roster.roster_id] || { name: '', avatar: '' }
    
    return {
      rosterId: roster.roster_id,
      originalName,
      originalAvatar,
      customName: custom.name || '',
      customAvatar: custom.avatar || '',
      currentName: custom.name || originalName,
      currentAvatar: custom.avatar || originalAvatar,
      record: `${roster.settings?.wins || 0}-${roster.settings?.losses || 0}`
    }
  }).sort((a, b) => a.originalName.localeCompare(b.originalName))
}

// Get customizations from localStorage
function getStoredCustomizations(): Record<number, { name: string; avatar: string }> {
  if (!leagueStore.activeLeagueId) return {}
  
  const key = `team_customizations_${leagueStore.activeLeagueId}`
  const saved = localStorage.getItem(key)
  
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch (e) {
      console.error('Failed to parse customizations:', e)
      return {}
    }
  }
  
  return {}
}

// Save customizations
function save() {
  if (!leagueStore.activeLeagueId) return
  
  const customizations: Record<number, { name: string; avatar: string }> = {}
  
  teamsList.value.forEach(team => {
    customizations[team.rosterId] = {
      name: team.customName,
      avatar: team.customAvatar
    }
  })
  
  const key = `team_customizations_${leagueStore.activeLeagueId}`
  localStorage.setItem(key, JSON.stringify(customizations))
  
  // Update current display
  teamsList.value.forEach(team => {
    team.currentName = team.customName || team.originalName
    team.currentAvatar = team.customAvatar || team.originalAvatar
  })
  
  // Show success message
  showSuccess.value = true
  setTimeout(() => {
    showSuccess.value = false
  }, 3000)
  
  console.log('✅ Customizations saved!')
}

// Reset single team
function resetTeam(rosterId: number) {
  const team = teamsList.value.find(t => t.rosterId === rosterId)
  if (team) {
    team.customName = ''
    team.customAvatar = ''
    team.currentName = team.originalName
    team.currentAvatar = team.originalAvatar
  }
}

// Reset all teams
function resetAll() {
  if (!confirm('Reset all customizations?')) return
  
  teamsList.value.forEach(team => {
    team.customName = ''
    team.customAvatar = ''
    team.currentName = team.originalName
    team.currentAvatar = team.originalAvatar
  })
  
  save()
}

// Load display settings from localStorage
function loadDisplaySettings() {
  const key = 'display_settings'
  const saved = localStorage.getItem(key)
  
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      displaySettings.value = {
        showDivisionInStandings: parsed.showDivisionInStandings || false,
        autoRefresh: parsed.autoRefresh || false
      }
    } catch (e) {
      console.error('Failed to parse display settings:', e)
    }
  }
}

// Save display settings to localStorage
function saveDisplaySettings() {
  const key = 'display_settings'
  localStorage.setItem(key, JSON.stringify(displaySettings.value))
  console.log('✅ Display settings saved!')
}

// Watch for league changes
watch(() => leagueStore.activeLeagueId, () => {
  loadTeams()
})

// Watch for roster changes
watch(() => leagueStore.rosters, () => {
  loadTeams()
}, { deep: true })

onMounted(() => {
  loadTeams()
  loadDisplaySettings()
})
</script>
