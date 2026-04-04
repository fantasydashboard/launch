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
  console.log('[AuthCallback] Processing auth callback...')
  console.log('[AuthCallback] URL hash:', window.location.hash ? 'present' : 'none')
  console.log('[AuthCallback] URL code:', new URLSearchParams(window.location.search).get('code') ? 'present' : 'none')

  // With implicit flow, Supabase detects the access_token in the URL hash
  // automatically via detectSessionInUrl. Give it a moment to process,
  // then check if we have a session and redirect.

  // Wait for Supabase to parse the hash and store the session
  await new Promise(resolve => setTimeout(resolve, 1000))

  const { data: { session } } = await supabase!.auth.getSession()
  console.log('[AuthCallback] Session after wait:', session ? session.user?.email : 'none')

  if (session) {
    console.log('[AuthCallback] Session found — hard redirecting to /')
    window.location.href = '/'
  } else {
    // Listen a bit longer in case it's still processing
    const { data: { subscription } } = supabase!.auth.onAuthStateChange((event, sess) => {
      console.log('[AuthCallback] Auth event:', event)
      if (event === 'SIGNED_IN' && sess) {
        subscription.unsubscribe()
        window.location.href = '/'
      }
    })

    // Final timeout
    setTimeout(() => {
      subscription.unsubscribe()
      console.error('[AuthCallback] No session after 6s — showing error')
      error.value = 'Sign in timed out. Please try again.'
    }, 6000)
  }
})
</script>
