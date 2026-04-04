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

onMounted(() => {
  // Supabase automatically detects and exchanges the code when detectSessionInUrl=true.
  // We just need to wait for onAuthStateChange to fire with SIGNED_IN,
  // then hard-redirect so the full app reinitializes with the stored session.

  console.log('[AuthCallback] Waiting for Supabase to process auth callback...')

  // Safety timeout — if nothing happens in 8 seconds, show error
  const timeout = setTimeout(() => {
    console.error('[AuthCallback] Timed out waiting for session')
    error.value = 'Sign in timed out. Please try again.'
  }, 8000)

  const { data: { subscription } } = supabase!.auth.onAuthStateChange((event, session) => {
    console.log('[AuthCallback] Auth state changed:', event, session?.user?.email)

    if (event === 'SIGNED_IN' && session) {
      clearTimeout(timeout)
      subscription.unsubscribe()
      console.log('[AuthCallback] SIGNED_IN confirmed — hard redirecting to /')
      // Hard redirect forces full reinit so getSession() finds the stored session
      window.location.href = '/'
    }

    if (event === 'SIGNED_OUT') {
      clearTimeout(timeout)
      subscription.unsubscribe()
      error.value = 'Sign in failed. Please try again.'
    }
  })
})
</script>
