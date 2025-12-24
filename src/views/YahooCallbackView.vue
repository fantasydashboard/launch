<template>
  <div class="min-h-screen flex items-center justify-center" style="background: radial-gradient(circle at top, #1c2030, #05060a 55%);">
    <div class="text-center">
      <div v-if="!error" class="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-500 mx-auto mb-4"></div>
      <div v-else class="text-red-500 text-5xl mb-4">⚠️</div>
      
      <h2 class="text-xl font-semibold text-dark-text mb-2">
        {{ error ? 'Connection Failed' : 'Connecting Yahoo...' }}
      </h2>
      <p class="text-dark-textMuted">
        {{ error ? error : 'Please wait while we connect your Yahoo account.' }}
      </p>
      
      <button 
        v-if="error"
        @click="goHome"
        class="mt-6 px-6 py-2 bg-primary text-gray-900 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
      >
        Go Home
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePlatformsStore } from '@/stores/platforms'

const router = useRouter()
const authStore = useAuthStore()
const platformsStore = usePlatformsStore()
const error = ref<string | null>(null)

function goHome() {
  router.replace('/')
}

onMounted(async () => {
  try {
    // Check if user is authenticated
    if (!authStore.isAuthenticated) {
      error.value = 'You must be logged in to connect Yahoo'
      return
    }

    // Parse tokens from URL hash
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const expiresIn = params.get('expires_in')
    const yahooUserId = params.get('yahoo_user_id')
    const returnTo = params.get('return_to') || '/'

    if (!accessToken || !refreshToken) {
      error.value = 'Missing tokens from Yahoo'
      return
    }

    // Store the Yahoo tokens
    const result = await platformsStore.storeYahooTokens({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: parseInt(expiresIn || '3600'),
      yahoo_user_id: yahooUserId || undefined
    })

    if (!result.success) {
      error.value = result.error || 'Failed to save Yahoo connection'
      return
    }

    // Success! Redirect to return URL or home
    router.replace(returnTo)
  } catch (err: any) {
    console.error('Yahoo callback error:', err)
    error.value = err.message || 'Failed to connect Yahoo account'
  }
})
</script>
