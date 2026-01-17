<template>
  <Teleport to="body">
    <div 
      v-if="isOpen" 
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @click.self="$emit('close')"
    >
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
      
      <!-- Modal -->
      <div class="relative bg-dark-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-dark-border/50">
        <!-- Header -->
        <div class="p-6 text-center border-b border-dark-border/30">
          <img src="/ufd-badge.png" alt="Ultimate Fantasy Dashboard" class="w-16 h-16 mx-auto mb-2" />
          <h2 class="text-2xl font-bold text-dark-text">
            {{ mode === 'login' ? 'Welcome Back' : 'Create Account' }}
          </h2>
          <p class="text-sm text-dark-textMuted mt-1">
            {{ mode === 'login' ? 'Sign in to access your leagues' : 'Start dominating your fantasy leagues' }}
          </p>
        </div>

        <!-- Body -->
        <div class="p-6 space-y-4">
          <!-- OAuth Buttons -->
          <div class="space-y-3">
            <button
              @click="handleOAuth('google')"
              :disabled="loading"
              class="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white text-gray-900 font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <button
              @click="handleOAuth('discord')"
              :disabled="loading"
              class="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-[#5865F2] text-white font-medium hover:bg-[#4752C4] transition-colors disabled:opacity-50"
            >
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              Continue with Discord
            </button>
          </div>

          <!-- Divider -->
          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-dark-border/50"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-2 bg-dark-card text-dark-textMuted">or continue with email</span>
            </div>
          </div>

          <!-- Email Form -->
          <form @submit.prevent="handleSubmit" class="space-y-4">
            <div v-if="mode === 'signup'">
              <label class="block text-sm font-medium text-dark-textMuted mb-1">Full Name</label>
              <input
                v-model="fullName"
                type="text"
                class="w-full px-4 py-3 rounded-xl bg-dark-bg border border-dark-border/50 text-dark-text placeholder-dark-textMuted focus:border-primary focus:outline-none"
                placeholder="John Smith"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-dark-textMuted mb-1">Email</label>
              <input
                v-model="email"
                type="email"
                required
                class="w-full px-4 py-3 rounded-xl bg-dark-bg border border-dark-border/50 text-dark-text placeholder-dark-textMuted focus:border-primary focus:outline-none"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-dark-textMuted mb-1">Password</label>
              <input
                v-model="password"
                type="password"
                required
                minlength="6"
                class="w-full px-4 py-3 rounded-xl bg-dark-bg border border-dark-border/50 text-dark-text placeholder-dark-textMuted focus:border-primary focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            <!-- Error Message -->
            <div v-if="errorMessage" class="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <p class="text-sm text-red-400">{{ errorMessage }}</p>
            </div>

            <!-- Success Message -->
            <div v-if="successMessage" class="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <p class="text-sm text-green-400">{{ successMessage }}</p>
            </div>

            <button
              type="submit"
              :disabled="loading"
              class="w-full px-4 py-3 rounded-xl bg-primary text-gray-900 font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span v-if="loading" class="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></span>
              <span v-else>{{ mode === 'login' ? 'Sign In' : 'Create Account' }}</span>
            </button>
          </form>

          <!-- Forgot Password -->
          <div v-if="mode === 'login'" class="text-center">
            <button 
              @click="handleForgotPassword"
              class="text-sm text-primary hover:underline"
            >
              Forgot your password?
            </button>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 bg-dark-bg/50 border-t border-dark-border/30 text-center">
          <p class="text-sm text-dark-textMuted">
            {{ mode === 'login' ? "Don't have an account?" : 'Already have an account?' }}
            <button 
              @click="toggleMode"
              class="text-primary font-medium hover:underline ml-1"
            >
              {{ mode === 'login' ? 'Sign up' : 'Sign in' }}
            </button>
          </p>
        </div>

        <!-- Close Button -->
        <button
          @click="$emit('close')"
          class="absolute top-4 right-4 p-2 rounded-lg hover:bg-dark-border/50 transition-colors"
        >
          <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  isOpen: boolean
  initialMode?: 'login' | 'signup'
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'success'): void
}>()

const authStore = useAuthStore()

// Form state
const mode = ref<'login' | 'signup'>(props.initialMode || 'login')
const email = ref('')
const password = ref('')
const fullName = ref('')
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// Watch for initialMode changes
watch(() => props.initialMode, (newMode) => {
  if (newMode) {
    mode.value = newMode
  }
})

// Reset form when modal opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    if (props.initialMode) {
      mode.value = props.initialMode
    }
    errorMessage.value = ''
    successMessage.value = ''
  }
})

function toggleMode() {
  mode.value = mode.value === 'login' ? 'signup' : 'login'
  errorMessage.value = ''
  successMessage.value = ''
}

async function handleSubmit() {
  errorMessage.value = ''
  successMessage.value = ''
  loading.value = true

  try {
    if (mode.value === 'login') {
      const result = await authStore.signIn(email.value, password.value)
      if (result.success) {
        emit('success')
        emit('close')
      } else {
        errorMessage.value = result.error || 'Sign in failed'
      }
    } else {
      const result = await authStore.signUp(email.value, password.value, fullName.value)
      if (result.success) {
        successMessage.value = 'Check your email for a confirmation link!'
      } else {
        errorMessage.value = result.error || 'Sign up failed'
      }
    }
  } finally {
    loading.value = false
  }
}

async function handleOAuth(provider: 'google' | 'discord') {
  loading.value = true
  errorMessage.value = ''

  const result = await authStore.signInWithOAuth(provider)
  if (!result.success) {
    errorMessage.value = result.error || 'OAuth sign in failed'
  }
  
  loading.value = false
}

async function handleForgotPassword() {
  if (!email.value) {
    errorMessage.value = 'Please enter your email address first'
    return
  }

  loading.value = true
  errorMessage.value = ''

  const result = await authStore.resetPassword(email.value)
  if (result.success) {
    successMessage.value = 'Check your email for a password reset link!'
  } else {
    errorMessage.value = result.error || 'Password reset failed'
  }

  loading.value = false
}
</script>
