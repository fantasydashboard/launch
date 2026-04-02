<template>
  <!-- Always renders slot (the preview content). -->
  <!-- When locked: shows a fade + inline upgrade bar instead of expanding. -->
  <div class="expand-gate">
    <slot />

    <!-- Locked state: fade + upgrade nudge -->
    <div v-if="locked && !isCheckingAccess" class="eg-locked">
      <div class="eg-fade"></div>
      <div class="eg-bar">
        <div class="eg-inner">
          <span class="eg-icon">🔒</span>
          <span class="eg-text">{{ message }}</span>
          <div class="eg-actions">
            <button class="eg-btn-trial" @click="goToPricing('trial')">
              Start free trial
            </button>
            <span class="eg-sep">or</span>
            <button class="eg-btn-plans" @click="goToPricing('plans')">
              View plans
            </button>
          </div>
        </div>
        <!-- Trial countdown if on expired trial -->
        <div v-if="isTrialExpired" class="eg-trial-note">
          Your 14-day free trial has ended. Upgrade to keep full access.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useLeagueStore } from '@/stores/league'
import { useFeatureAccess } from '@/composables/useFeatureAccess'

const props = withDefaults(defineProps<{
  // Override lock state from parent (pass !canExpand from useFeatureAccess)
  // If omitted, component checks canExpand itself
  locked?: boolean
  // Custom message shown in the gate bar
  message?: string
}>(), {
  message: 'See the full list — upgrade to unlock everything.'
})

const router = useRouter()
const leagueStore = useLeagueStore()
const { canExpand, isCheckingAccess, isTrialExpired } = useFeatureAccess()

const locked = computed(() => {
  if (props.locked !== undefined) return props.locked
  return !canExpand.value
})

function goToPricing(intent: 'trial' | 'plans') {
  const params = new URLSearchParams()
  if (leagueStore.activeLeagueId) params.set('league', leagueStore.activeLeagueId)
  if (leagueStore.activePlatform) params.set('platform', leagueStore.activePlatform)
  if (intent === 'trial') params.set('intent', 'trial')
  const qs = params.toString()
  router.push(qs ? `/pricing?${qs}` : '/pricing')
}
</script>

<style scoped>
.expand-gate { position: relative; }

.eg-locked { position: relative; margin-top: -48px; }

.eg-fade {
  height: 80px;
  background: linear-gradient(to bottom, transparent, #0a0c14);
  pointer-events: none;
}

.eg-bar {
  background: #0a0c14;
  border-top: 1px solid #1e2130;
  padding: 14px 20px;
}

.eg-inner {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.eg-icon { font-size: 14px; flex-shrink: 0; }

.eg-text {
  font-size: 13px;
  color: #6b7280;
  flex: 1;
  min-width: 160px;
}

.eg-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.eg-sep { font-size: 12px; color: #374151; }

.eg-btn-trial {
  display: inline-flex;
  align-items: center;
  padding: 7px 14px;
  background: #22c55e;
  color: #0a0c14;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}
.eg-btn-trial:hover { background: #16a34a; }

.eg-btn-plans {
  display: inline-flex;
  align-items: center;
  padding: 7px 14px;
  background: transparent;
  color: #9ca3af;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid #374151;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.eg-btn-plans:hover { border-color: #6b7280; color: #e5e7eb; }

.eg-trial-note {
  margin-top: 8px;
  font-size: 11px;
  color: #eab308;
  text-align: center;
}
</style>
