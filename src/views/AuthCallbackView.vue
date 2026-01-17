<template>
  <div class="min-h-screen flex items-center justify-center" style="background: radial-gradient(circle at top, #1c2030, #05060a 55%);">
    <div class="text-center">
      <LoadingSpinner v-if="!error" size="lg" message="Please wait while we verify your account." />
      <template v-else>
        <div class="text-red-500 text-5xl mb-4">⚠️</div>
        <h2 class="text-xl font-semibold text-dark-text mb-2">Sign In Failed</h2>
        <p class="text-dark-textMuted">{{ error }}</p>
      </template>
      <button 
        v-if="error"
        @click="router.replace('/')"
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
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const router = useRouter()
const authStore = useAuthStore()
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    console.log('Auth callback - checking URL hash...')

    // Check if there's an access_token in the hash (OAuth redirect)
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')
    
    if (accessToken) {
      console.log('Found access token in URL, storing session...')
      
      // Store the session directly in localStorage
      try {
        const storageKey = `sb-ergxtydfgffqgkddclvr-auth-token`
        
        // Decode the JWT to get user info
        const payload = JSON.parse(atob(accessToken.split('.')[1]))
        
        const sessionData = {
          access_token: accessToken,
          refresh_token: refreshToken || '',
          token_type: 'bearer',
          expires_at: payload.exp,
          expires_in: 3600,
          user: {
            id: payload.sub,
            email: payload.email,
            user_metadata: payload.user_metadata || {},
            app_metadata: payload.app_metadata || {},
            aud: payload.aud,
            role: payload.role,
            email_confirmed_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        }
        
        localStorage.setItem(storageKey, JSON.stringify(sessionData))
        console.log('Session stored, redirecting to home...')
        
        // Redirect immediately - App.vue will pick up the session
        window.location.href = '/'
        return
        
      } catch (storeErr) {
        console.error('Failed to store session:', storeErr)
        error.value = 'Failed to complete sign in'
        setTimeout(() => window.location.href = '/', 2000)
        return
      }
    }

    // No token in URL - just redirect to home
    console.log('No token in URL, redirecting home')
    window.location.href = '/'
    
  } catch (err: any) {
    console.error('Auth callback error:', err)
    error.value = err.message || 'Authentication failed'
    setTimeout(() => window.location.href = '/', 2000)
  }
})
</script>
