<template>
  <Teleport to="body">
    <div 
      v-if="isOpen" 
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @click.self="$emit('close')"
    >
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
      
      <!-- Modal -->
      <div class="relative bg-dark-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-dark-border/50">
        <!-- Header -->
        <div class="p-6 text-center border-b border-dark-border/30">
          <div class="text-4xl mb-2">🏈</div>
          <h2 class="text-2xl font-bold text-dark-text">Add a League</h2>
          <p class="text-sm text-dark-textMuted mt-1">
            Connect your Sleeper league to get started
          </p>
        </div>

        <!-- Body -->
        <div class="p-6 space-y-4">
          <!-- Step 1: Enter Username -->
          <div v-if="step === 1">
            <label class="block text-sm font-medium text-dark-textMuted mb-2">
              Sleeper Username
            </label>
            <input
              v-model="username"
              type="text"
              class="w-full px-4 py-3 rounded-xl bg-dark-bg border border-dark-border/50 text-dark-text placeholder-dark-textMuted focus:border-primary focus:outline-none"
              placeholder="Enter your Sleeper username"
              @keyup.enter="searchLeagues"
            />
            <p class="text-xs text-dark-textMuted mt-2">
              This is your username on the Sleeper app
            </p>
            
            <!-- Error Message -->
            <div v-if="errorMessage" class="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <p class="text-sm text-red-400">{{ errorMessage }}</p>
            </div>
            
            <button
              @click="searchLeagues"
              :disabled="loading || !username.trim()"
              class="w-full mt-4 px-4 py-3 rounded-xl bg-primary text-gray-900 font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span v-if="loading" class="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></span>
              <span v-else>Find My Leagues</span>
            </button>
          </div>
          
          <!-- Step 2: Select League -->
          <div v-else-if="step === 2">
            <div class="flex items-center gap-2 mb-4">
              <button @click="step = 1" class="p-1 hover:bg-dark-border/50 rounded-lg transition-colors">
                <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span class="text-sm text-dark-textMuted">Select a league for <span class="text-primary font-medium">{{ username }}</span></span>
            </div>
            
            <div class="space-y-2 max-h-64 overflow-y-auto">
              <button
                v-for="league in availableLeagues"
                :key="league.league_id"
                @click="selectLeague(league)"
                class="w-full flex items-center gap-3 p-3 rounded-xl bg-dark-bg/50 border border-dark-border/50 hover:border-primary/50 hover:bg-dark-border/30 transition-all text-left"
              >
                <div class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span class="text-sm font-bold text-primary">{{ league.name.substring(0, 2).toUpperCase() }}</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-semibold text-dark-text truncate">{{ league.name }}</div>
                  <div class="text-xs text-dark-textMuted">
                    {{ league.total_rosters }} teams • {{ league.season }} Season
                  </div>
                </div>
                <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              
              <div v-if="availableLeagues.length === 0" class="text-center py-8 text-dark-textMuted">
                <p>No leagues found for this season</p>
                <p class="text-sm mt-1">Try a different username</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Close Button -->
        <button
          @click="$emit('close')"
          class="absolute top-4 right-4 p-2 rounded-lg hover:bg-dark-border/50 transition-colors"
        >
          <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import type { SleeperLeague } from '@/types/sleeper'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'league-added', league: SleeperLeague): void
}>()

const leagueStore = useLeagueStore()

const step = ref(1)
const username = ref('')
const loading = ref(false)
const errorMessage = ref('')
const availableLeagues = ref<SleeperLeague[]>([])

// Reset when modal opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    step.value = 1
    username.value = ''
    errorMessage.value = ''
    availableLeagues.value = []
  }
})

async function searchLeagues() {
  if (!username.value.trim()) return
  
  loading.value = true
  errorMessage.value = ''
  
  try {
    const leagues = await leagueStore.fetchUserLeagues(username.value)
    
    // Filter out leagues that are already saved
    const savedIds = new Set(leagueStore.savedLeagues.map(l => l.league_id))
    availableLeagues.value = leagues.filter(l => !savedIds.has(l.league_id))
    
    if (availableLeagues.value.length === 0 && leagues.length > 0) {
      errorMessage.value = 'All your leagues are already added!'
    } else if (leagues.length === 0) {
      errorMessage.value = 'No leagues found for this username'
    } else {
      step.value = 2
    }
  } catch (err) {
    errorMessage.value = 'Could not find user. Check the username and try again.'
  } finally {
    loading.value = false
  }
}

function selectLeague(league: SleeperLeague) {
  emit('league-added', league)
}
</script>
