<template>
  <div class="min-h-screen flex items-center justify-center" style="background: radial-gradient(circle at top, #1c2030, #05060a 55%);">
    <div class="text-center">
      <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
      <h2 class="text-xl font-semibold text-dark-text mb-2">Completing sign in...</h2>
      <p class="text-dark-textMuted">Please wait while we verify your account.</p>
      <p v-if="error" class="text-red-400 mt-4">{{ error }}</p>
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
    // Supabase automatically handles the token from the URL hash
    // We just need to wait for it to complete and check the session
    
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    // Get the session - Supabase should have already processed the URL hash
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      throw sessionError
    }

    if (session) {
      // Successfully authenticated - initialize the auth store
      await authStore.initialize()
      
      // Redirect to home page
      router.replace('/')
    } else {
      // No session found - check if there's an error in the URL
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const errorDescription = hashParams.get('error_description')
      
      if (errorDescription) {
        throw new Error(errorDescription)
      }
      
      // No session and no error - just redirect to home
      router.replace('/')
    }
  } catch (err: any) {
    console.error('Auth callback error:', err)
    error.value = err.message || 'Authentication failed'
    
    // Redirect to home after showing error
    setTimeout(() => {
      router.replace('/')
    }, 3000)
  }
})
</script>
