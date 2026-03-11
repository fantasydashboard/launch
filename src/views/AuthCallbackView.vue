<template>
  <div class="min-h-screen flex items-center justify-center" style="background: radial-gradient(circle at top, #1c2030, #05060a 55%);">
    <div class="text-center">
      <LoadingSpinner v-if="!error" size="lg" message="Completing sign in…" />
      <template v-else>
        <div class="text-red-500 text-5xl mb-4">⚠️</div>
        <h2 class="text-xl font-semibold text-dark-text mb-2">Sign In Failed</h2>
        <p class="text-dark-textMuted">{{ error }}</p>
        <button
          @click="router.replace('/')"
          class="mt-6 px-6 py-2 bg-primary text-gray-900 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
        >
          Go Home
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const router = useRouter()
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    // ── PKCE flow: ?code= query param (modern Supabase default) ──
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')

    if (code) {
      console.log('[AuthCallback] PKCE code found, exchanging for session…')
      const { error: exchangeError } = await supabase!.auth.exchangeCodeForSession(code)
      if (exchangeError) {
        console.error('[AuthCallback] Code exchange failed:', exchangeError)
        error.value = exchangeError.message
        return
      }
      console.log('[AuthCallback] Session established, redirecting home')
      window.location.href = '/'
      return
    }

    // ── Implicit flow fallback: #access_token= hash ──
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')

    if (accessToken) {
      console.log('[AuthCallback] Implicit token found, setting session…')
      const { error: setError } = await supabase!.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || ''
      })
      if (setError) {
        console.error('[AuthCallback] setSession failed:', setError)
        error.value = setError.message
        return
      }
      console.log('[AuthCallback] Session set, redirecting home')
      window.location.href = '/'
      return
    }

    // ── No token/code — maybe session already exists ──
    const { data } = await supabase!.auth.getSession()
    if (data.session) {
      console.log('[AuthCallback] Existing session found, redirecting home')
      window.location.href = '/'
    } else {
      console.warn('[AuthCallback] No token or session found in callback URL')
      window.location.href = '/'
    }

  } catch (err: any) {
    console.error('[AuthCallback] Unexpected error:', err)
    error.value = err.message || 'Authentication failed'
    setTimeout(() => { window.location.href = '/' }, 2000)
  }
})
</script>
