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
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')

    if (code) {
      console.log('[AuthCallback] Exchanging PKCE code...')

      // Use a direct fetch bypassing the proxy entirely for this critical step
      // The proxy interferes with session storage during the code exchange
      const { data, error: exchangeError } = await supabase!.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error('[AuthCallback] Code exchange failed:', exchangeError)
        error.value = exchangeError.message
        return
      }

      console.log('[AuthCallback] Exchange result — session:', !!data?.session, 'user:', data?.session?.user?.email)

      if (data?.session) {
        // Hard redirect instead of router navigation — forces a full page reload
        // so Supabase can properly reinitialize from the stored session in localStorage
        // without the proxy interfering with the getSession() call
        console.log('[AuthCallback] Session obtained, doing hard redirect to /')
        window.location.href = '/'
        return
      }
    }

    // No code or no session — check for hash fragment (implicit flow fallback)
    const hash = window.location.hash
    if (hash && hash.includes('access_token')) {
      console.log('[AuthCallback] Hash-based session detected, hard redirecting')
      window.location.href = '/'
      return
    }

    // Nothing worked — go home anyway
    console.warn('[AuthCallback] No session obtained, redirecting home')
    router.replace('/')

  } catch (err: any) {
    console.error('[AuthCallback] Unexpected error:', err)
    error.value = err.message || 'Authentication failed'
    setTimeout(() => router.replace('/'), 2000)
  }
})
</script>
