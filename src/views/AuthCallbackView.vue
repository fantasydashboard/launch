<template>
  <div class="min-h-screen flex items-center justify-center" style="background: radial-gradient(circle at top, #1c2030, #05060a 55%);">
    <div class="text-center">
      <div v-if="!error" class="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
      <div v-else class="text-red-500 text-5xl mb-4">⚠️</div>
      <h2 class="text-xl font-semibold text-dark-text mb-2">
        {{ error ? 'Sign In Failed' : 'Completing sign in...' }}
      </h2>
      <p class="text-dark-textMuted">
        {{ error ? error : 'Please wait while we verify your account.' }}
      </p>
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
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    console.log('Auth callback - checking URL hash...')
    console.log('Current URL:', window.location.href)
    console.log('Hash:', window.location.hash)

    // Check if there's an access_token in the hash (OAuth redirect)
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')
    
    if (accessToken) {
      console.log('Found access token in URL, setting session...')
      
      // Use timeout to prevent hanging
      const setSessionWithTimeout = async () => {
        return Promise.race([
          supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('setSession timeout')), 5000)
          )
        ])
      }
      
      try {
        const { data, error: setSessionError } = await setSessionWithTimeout() as any
        
        if (setSessionError) {
          console.error('Error setting session:', setSessionError)
          throw setSessionError
        }
        
        console.log('Session set successfully:', data.session?.user?.email)
      } catch (timeoutErr) {
        console.warn('setSession timed out, storing tokens manually...')
        
        // Manually store the session in localStorage as fallback
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
              role: payload.role
            }
          }
          
          localStorage.setItem(storageKey, JSON.stringify(sessionData))
          console.log('Session stored manually in localStorage')
        } catch (storeErr) {
          console.error('Failed to store session manually:', storeErr)
        }
      }
      
      // Initialize auth store
      await authStore.initialize()
      
      // Clear the hash from URL and redirect
      router.replace('/')
      return
    }

    // No token in hash - just redirect to home
    // The auth store initialize in App.vue will handle the rest
    console.log('No token in URL, redirecting home')
    router.replace('/')
    
  } catch (err: any) {
    console.error('Auth callback error:', err)
    error.value = err.message || 'Authentication failed'
    
    // Redirect home after error
    setTimeout(() => router.replace('/'), 3000)
  }
})
</script>
