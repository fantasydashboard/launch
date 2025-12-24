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
      <p v-if="debugInfo" class="text-xs text-dark-textMuted mt-4 font-mono">{{ debugInfo }}</p>
      
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
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const error = ref<string | null>(null)
const debugInfo = ref<string | null>(null)

function goHome() {
  router.replace('/')
}

async function storeYahooTokens() {
  try {
    // Parse tokens from URL hash
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const expiresIn = params.get('expires_in')
    const yahooUserId = params.get('yahoo_user_id')
    const returnTo = params.get('return_to') || '/'

    console.log('Yahoo callback - tokens received:', { 
      hasAccessToken: !!accessToken, 
      hasRefreshToken: !!refreshToken,
      expiresIn,
      yahooUserId 
    })

    if (!accessToken || !refreshToken) {
      error.value = 'Missing tokens from Yahoo'
      return
    }

    // Wait for auth to initialize
    await authStore.initialize()
    
    console.log('Auth state:', { 
      isAuthenticated: authStore.isAuthenticated, 
      userId: authStore.user?.id 
    })

    if (!authStore.isAuthenticated || !authStore.user?.id) {
      error.value = 'You must be logged in to connect Yahoo'
      debugInfo.value = 'Auth state: not authenticated'
      return
    }

    if (!supabase) {
      error.value = 'Database not configured'
      return
    }

    // Calculate token expiration
    const expiresAt = new Date(Date.now() + parseInt(expiresIn || '3600') * 1000).toISOString()

    console.log('Saving Yahoo tokens to database...')

    // Store directly in Supabase
    const { data, error: upsertError } = await supabase
      .from('connected_platforms')
      .upsert({
        user_id: authStore.user.id,
        platform: 'yahoo',
        platform_user_id: yahooUserId || null,
        platform_username: null,
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: expiresAt,
        scopes: 'fspt-r'
      }, {
        onConflict: 'user_id,platform'
      })
      .select()
      .single()

    if (upsertError) {
      console.error('Error saving Yahoo tokens:', upsertError)
      error.value = `Failed to save: ${upsertError.message}`
      debugInfo.value = JSON.stringify(upsertError)
      return
    }

    console.log('Yahoo tokens saved successfully:', data)

    // Success! Redirect to return URL or home
    router.replace(returnTo)
  } catch (err: any) {
    console.error('Yahoo callback error:', err)
    error.value = err.message || 'Failed to connect Yahoo account'
    debugInfo.value = err.stack || err.toString()
  }
}

onMounted(() => {
  storeYahooTokens()
})
</script>
