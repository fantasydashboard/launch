<template>
  <footer class="border-t border-dark-border mt-16" style="background: linear-gradient(135deg, rgba(10, 12, 20, 0.98), rgba(5, 6, 10, 0.98));">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <!-- Main Footer Content -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
        <!-- Brand Column -->
        <div class="lg:col-span-1">
          <div class="flex items-center gap-3 mb-4">
            <img src="/logos/UFD_Logo.png" alt="UFD Logo" class="w-10 h-10 object-contain" />
            <div>
              <h3 class="text-lg font-bold text-dark-text">Ultimate Fantasy Dashboard</h3>
            </div>
          </div>
          <p class="text-sm text-dark-textMuted leading-relaxed mb-4">
            Your all-in-one fantasy sports analytics platform. Power rankings, projections, history, and more.
          </p>
          <div class="flex items-center gap-3">
            <a href="https://twitter.com" target="_blank" class="w-9 h-9 rounded-full bg-dark-border/50 flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-colors text-dark-textMuted">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <a href="https://discord.com" target="_blank" class="w-9 h-9 rounded-full bg-dark-border/50 flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-colors text-dark-textMuted">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
            </a>
          </div>
        </div>

        <!-- Quick Links -->
        <div>
          <h4 class="text-sm font-semibold text-dark-text uppercase tracking-wider mb-4">Quick Links</h4>
          <ul class="space-y-2">
            <li><router-link to="/" class="text-sm text-dark-textMuted hover:text-primary transition-colors">Home</router-link></li>
            <li><router-link to="/power-rankings" class="text-sm text-dark-textMuted hover:text-primary transition-colors">Power Rankings</router-link></li>
            <li><router-link to="/matchups" class="text-sm text-dark-textMuted hover:text-primary transition-colors">Matchups</router-link></li>
            <li><router-link to="/projections" class="text-sm text-dark-textMuted hover:text-primary transition-colors">Projections</router-link></li>
            <li><router-link to="/history" class="text-sm text-dark-textMuted hover:text-primary transition-colors">History</router-link></li>
          </ul>
        </div>

        <!-- Sports -->
        <div>
          <h4 class="text-sm font-semibold text-dark-text uppercase tracking-wider mb-4">Sports</h4>
          <ul class="space-y-2">
            <li><a href="#" class="text-sm text-dark-textMuted hover:text-primary transition-colors">Football</a></li>
            <li><a href="#" class="text-sm text-dark-textMuted hover:text-primary transition-colors">Baseball</a></li>
            <li><a href="#" class="text-sm text-dark-textMuted hover:text-primary transition-colors">Basketball</a></li>
            <li><a href="#" class="text-sm text-dark-textMuted hover:text-primary transition-colors">Hockey</a></li>
          </ul>
        </div>

        <!-- Feedback -->
        <div>
          <h4 class="text-sm font-semibold text-dark-text uppercase tracking-wider mb-4">Feedback</h4>
          <p class="text-sm text-dark-textMuted mb-4">Help us improve! Let us know what you think.</p>
          <div class="flex flex-col gap-2">
            <button 
              @click="openFeatureModal"
              class="w-full px-4 py-2.5 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Request Feature
            </button>
            <button 
              @click="openBugModal"
              class="w-full px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Report Bug
            </button>
          </div>
        </div>
      </div>

      <!-- Bottom Bar -->
      <div class="pt-8 border-t border-dark-border/50">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p class="text-sm text-dark-textMuted">
            © {{ currentYear }} Ultimate Fantasy Dashboard. All rights reserved.
          </p>
          <p class="text-xs text-dark-textMuted">
            Not affiliated with Sleeper, ESPN, or Yahoo
          </p>
        </div>
      </div>
    </div>

    <!-- Feature Request Modal -->
    <Teleport to="body">
      <div 
        v-if="showFeatureModal" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="closeModals"
      >
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
        <div class="relative bg-dark-elevated rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-dark-border">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-dark-border flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-bold text-dark-text">Request a Feature</h3>
                <p class="text-xs text-dark-textMuted">Tell us what you'd like to see</p>
              </div>
            </div>
            <button @click="closeModals" class="p-2 rounded-lg hover:bg-dark-border/50 transition-colors">
              <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Form -->
          <form @submit.prevent="submitFeatureRequest" class="p-6 space-y-4">
            <!-- User Info (auto-filled) -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs text-dark-textMuted mb-1">Name</label>
                <input 
                  type="text" 
                  v-model="featureForm.name" 
                  class="w-full px-3 py-2 rounded-lg bg-dark-border/50 border border-dark-border text-dark-text text-sm focus:border-primary focus:outline-none"
                  readonly
                />
              </div>
              <div>
                <label class="block text-xs text-dark-textMuted mb-1">Email</label>
                <input 
                  type="email" 
                  v-model="featureForm.email" 
                  class="w-full px-3 py-2 rounded-lg bg-dark-border/50 border border-dark-border text-dark-text text-sm focus:border-primary focus:outline-none"
                  readonly
                />
              </div>
            </div>

            <!-- Feature Title -->
            <div>
              <label class="block text-xs text-dark-textMuted mb-1">Feature Title *</label>
              <input 
                type="text" 
                v-model="featureForm.title" 
                placeholder="Brief title for your feature"
                class="w-full px-3 py-2 rounded-lg bg-dark-bg border border-dark-border text-dark-text text-sm focus:border-primary focus:outline-none placeholder-dark-textMuted"
                required
              />
            </div>

            <!-- Description -->
            <div>
              <label class="block text-xs text-dark-textMuted mb-1">Description *</label>
              <textarea 
                v-model="featureForm.description" 
                placeholder="Describe the feature you'd like to see..."
                rows="4"
                class="w-full px-3 py-2 rounded-lg bg-dark-bg border border-dark-border text-dark-text text-sm focus:border-primary focus:outline-none placeholder-dark-textMuted resize-none"
                required
              ></textarea>
            </div>

            <!-- Submit -->
            <button 
              type="submit"
              :disabled="isSubmitting"
              class="w-full py-3 rounded-lg bg-primary text-dark-bg font-semibold hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isSubmitting ? 'Submitting...' : 'Submit Feature Request' }}
            </button>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Bug Report Modal -->
    <Teleport to="body">
      <div 
        v-if="showBugModal" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="closeModals"
      >
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
        <div class="relative bg-dark-elevated rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-dark-border">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-dark-border flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-bold text-dark-text">Report a Bug</h3>
                <p class="text-xs text-dark-textMuted">Help us squash bugs</p>
              </div>
            </div>
            <button @click="closeModals" class="p-2 rounded-lg hover:bg-dark-border/50 transition-colors">
              <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Form -->
          <form @submit.prevent="submitBugReport" class="p-6 space-y-4">
            <!-- User Info (auto-filled) -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs text-dark-textMuted mb-1">Name</label>
                <input 
                  type="text" 
                  v-model="bugForm.name" 
                  class="w-full px-3 py-2 rounded-lg bg-dark-border/50 border border-dark-border text-dark-text text-sm focus:border-primary focus:outline-none"
                  readonly
                />
              </div>
              <div>
                <label class="block text-xs text-dark-textMuted mb-1">Email</label>
                <input 
                  type="email" 
                  v-model="bugForm.email" 
                  class="w-full px-3 py-2 rounded-lg bg-dark-border/50 border border-dark-border text-dark-text text-sm focus:border-primary focus:outline-none"
                  readonly
                />
              </div>
            </div>

            <!-- Device Type -->
            <div>
              <label class="block text-xs text-dark-textMuted mb-1">Device Type *</label>
              <div class="flex gap-3">
                <label class="flex-1">
                  <input type="radio" v-model="bugForm.device" value="desktop" class="sr-only peer" />
                  <div class="px-4 py-2.5 rounded-lg border border-dark-border text-center cursor-pointer peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary text-dark-textMuted text-sm font-medium transition-colors">
                    💻 Desktop
                  </div>
                </label>
                <label class="flex-1">
                  <input type="radio" v-model="bugForm.device" value="mobile" class="sr-only peer" />
                  <div class="px-4 py-2.5 rounded-lg border border-dark-border text-center cursor-pointer peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary text-dark-textMuted text-sm font-medium transition-colors">
                    📱 Mobile
                  </div>
                </label>
              </div>
            </div>

            <!-- Page -->
            <div>
              <label class="block text-xs text-dark-textMuted mb-1">Page Where Bug Occurred *</label>
              <select 
                v-model="bugForm.page"
                class="w-full px-3 py-2 rounded-lg bg-dark-bg border border-dark-border text-dark-text text-sm focus:border-primary focus:outline-none"
                required
              >
                <option value="" disabled>Select a page</option>
                <option value="home">Home</option>
                <option value="power-rankings">Power Rankings</option>
                <option value="matchups">Matchups</option>
                <option value="projections">Projections</option>
                <option value="history">History</option>
                <option value="draft">Draft</option>
                <option value="compare">Compare</option>
                <option value="tools">Tools</option>
                <option value="settings">Settings</option>
                <option value="other">Other</option>
              </select>
            </div>

            <!-- Bug Title -->
            <div>
              <label class="block text-xs text-dark-textMuted mb-1">Bug Summary *</label>
              <input 
                type="text" 
                v-model="bugForm.title" 
                placeholder="Brief description of the bug"
                class="w-full px-3 py-2 rounded-lg bg-dark-bg border border-dark-border text-dark-text text-sm focus:border-primary focus:outline-none placeholder-dark-textMuted"
                required
              />
            </div>

            <!-- Description -->
            <div>
              <label class="block text-xs text-dark-textMuted mb-1">Steps to Reproduce *</label>
              <textarea 
                v-model="bugForm.description" 
                placeholder="What were you doing when the bug occurred?"
                rows="3"
                class="w-full px-3 py-2 rounded-lg bg-dark-bg border border-dark-border text-dark-text text-sm focus:border-primary focus:outline-none placeholder-dark-textMuted resize-none"
                required
              ></textarea>
            </div>

            <!-- Submit -->
            <button 
              type="submit"
              :disabled="isSubmitting"
              class="w-full py-3 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isSubmitting ? 'Submitting...' : 'Submit Bug Report' }}
            </button>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Success Toast -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition ease-out duration-300"
        enter-from-class="transform translate-y-4 opacity-0"
        enter-to-class="transform translate-y-0 opacity-100"
        leave-active-class="transition ease-in duration-200"
        leave-from-class="transform translate-y-0 opacity-100"
        leave-to-class="transform translate-y-4 opacity-0"
      >
        <div 
          v-if="showSuccessToast" 
          class="fixed bottom-6 right-6 z-50 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span class="font-medium">{{ successMessage }}</span>
        </div>
      </Transition>
    </Teleport>
  </footer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'

const authStore = useAuthStore()

const currentYear = new Date().getFullYear()

// Modal state
const showFeatureModal = ref(false)
const showBugModal = ref(false)
const showSuccessToast = ref(false)
const successMessage = ref('')
const isSubmitting = ref(false)

// Form data
const featureForm = ref({
  name: '',
  email: '',
  title: '',
  description: ''
})

const bugForm = ref({
  name: '',
  email: '',
  device: 'desktop',
  page: '',
  title: '',
  description: ''
})

// Get user info
const userName = computed(() => authStore.profile?.full_name || authStore.user?.email?.split('@')[0] || 'Anonymous')
const userEmail = computed(() => authStore.user?.email || '')

function openFeatureModal() {
  featureForm.value = {
    name: userName.value,
    email: userEmail.value,
    title: '',
    description: ''
  }
  showFeatureModal.value = true
}

function openBugModal() {
  bugForm.value = {
    name: userName.value,
    email: userEmail.value,
    device: 'desktop',
    page: '',
    title: '',
    description: ''
  }
  showBugModal.value = true
}

function closeModals() {
  showFeatureModal.value = false
  showBugModal.value = false
}

function showToast(message: string) {
  successMessage.value = message
  showSuccessToast.value = true
  setTimeout(() => {
    showSuccessToast.value = false
  }, 3000)
}

async function submitFeatureRequest() {
  if (!featureForm.value.title || !featureForm.value.description) return
  
  isSubmitting.value = true
  
  try {
    const { error } = await supabase
      .from('feature_requests')
      .insert({
        user_id: authStore.user?.id || null,
        name: featureForm.value.name,
        email: featureForm.value.email,
        title: featureForm.value.title,
        description: featureForm.value.description
      })
    
    if (error) throw error
    
    closeModals()
    showToast('Feature request submitted! Thank you!')
  } catch (err) {
    console.error('Error submitting feature request:', err)
    alert('Failed to submit. Please try again.')
  } finally {
    isSubmitting.value = false
  }
}

async function submitBugReport() {
  if (!bugForm.value.title || !bugForm.value.description || !bugForm.value.page) return
  
  isSubmitting.value = true
  
  try {
    const { error } = await supabase
      .from('bug_reports')
      .insert({
        user_id: authStore.user?.id || null,
        name: bugForm.value.name,
        email: bugForm.value.email,
        device: bugForm.value.device,
        page: bugForm.value.page,
        title: bugForm.value.title,
        description: bugForm.value.description
      })
    
    if (error) throw error
    
    closeModals()
    showToast('Bug report submitted! Thank you!')
  } catch (err) {
    console.error('Error submitting bug report:', err)
    alert('Failed to submit. Please try again.')
  } finally {
    isSubmitting.value = false
  }
}
</script>
