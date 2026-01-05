<template>
  <div class="min-h-screen" style="background: radial-gradient(circle at top, #1c2030, #05060a 55%);">
    <!-- Header -->
    <header class="fixed top-0 left-0 right-0 z-50 border-b border-dark-border/50" style="background: rgba(10, 12, 20, 0.9); backdrop-filter: blur(10px);">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <!-- Logo -->
          <router-link to="/" class="flex items-center gap-2 sm:gap-3">
            <img src="/ufd-logo.png" alt="UFD Logo" class="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
            <div>
              <h1 class="text-base sm:text-lg font-bold text-dark-text">
                <span class="hidden sm:inline">Ultimate Fantasy Dashboard</span>
                <span class="sm:hidden">UFD</span>
              </h1>
            </div>
          </router-link>

          <!-- Auth Buttons -->
          <div class="flex items-center gap-2 sm:gap-3">
            <button
              @click="showAuthModal = true; authMode = 'login'"
              class="px-3 sm:px-4 py-2 rounded-lg text-gray-300 hover:text-white font-medium transition-colors text-sm sm:text-base"
            >
              Sign In
            </button>
            <button
              @click="showAuthModal = true; authMode = 'signup'"
              class="px-3 sm:px-4 py-2 rounded-lg bg-primary text-gray-900 font-semibold hover:bg-primary/90 transition-colors text-sm sm:text-base"
            >
              <span class="hidden sm:inline">Get Started</span>
              <span class="sm:hidden">Start</span>
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Content with padding for fixed header -->
    <div class="pt-16">
      <SportLandingPage :sport="sport" @open-signup="showAuthModal = true; authMode = 'signup'" />
    </div>

    <!-- Footer -->
    <footer class="border-t border-dark-border/50 py-8">
      <div class="max-w-6xl mx-auto px-4 text-center text-gray-500 text-sm">
        © {{ new Date().getFullYear() }} Ultimate Fantasy Dashboard. All rights reserved.
      </div>
    </footer>

    <!-- Auth Modal -->
    <AuthModal 
      :is-open="showAuthModal" 
      :initial-mode="authMode"
      @close="showAuthModal = false"
      @success="handleAuthSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import SportLandingPage from '@/components/SportLandingPage.vue'
import AuthModal from '@/components/AuthModal.vue'
import { useAuthStore } from '@/stores/auth'
import { useLeagueStore } from '@/stores/league'

const props = defineProps<{
  sport: 'football' | 'baseball' | 'basketball' | 'hockey'
}>()

const router = useRouter()
const authStore = useAuthStore()
const leagueStore = useLeagueStore()

const showAuthModal = ref(false)
const authMode = ref<'login' | 'signup'>('signup')

async function handleAuthSuccess() {
  showAuthModal.value = false
  
  if (authStore.user?.id) {
    await leagueStore.loadSavedLeagues(authStore.user.id)
    
    // If no saved leagues, enable demo mode
    if (!leagueStore.hasSavedLeagues && !leagueStore.activeLeagueId) {
      leagueStore.enableDemoMode()
    }
    
    // Redirect to main dashboard
    router.push('/')
  }
}
</script>
