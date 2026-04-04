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
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const router = useRouter()
const authStore = useAuthStore()
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')

    if (code) {
      // Exchange PKCE code for session
      const { data, error: exchangeError } = await supabase!.auth.exchangeCodeForSession(code)
      if (exchangeError) {
        console.error('[AuthCallback] Code exchange failed:', exchangeError)
        error.value = exchangeError.message
        return
      }

      if (data?.session) {
        // Directly populate the auth store from the session we just got
        // Don't call initialize() again — it will re-run getSession() through
        // the proxy and may not find the session that was just set
        authStore.session.value = data.session
        authStore.user.value = data.session.user

        // Fetch the profile directly using the user ID we have
        const { data: profileData } = await supabase!
          .from('profiles')
          .select('*')
          .eq('id', data.session.user.id)
          .single()

        if (profileData) {
          authStore.profile.value = profileData
        }

        authStore.initialized.value = true
        authStore.loading.value = false

        console.log('[AuthCallback] Auth store populated, navigating home')
      }
    } else {
      // No PKCE code — fall back to initialize
      await authStore.initialize()
    }

    router.replace('/')
  } catch (err: any) {
    console.error('[AuthCallback] Unexpected error:', err)
    error.value = err.message || 'Authentication failed'
    setTimeout(() => router.replace('/'), 2000)
  }
})
</script>
