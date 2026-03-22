<template>
  <transition name="banner-slide">
    <div v-if="show" class="lp-banner">
      <div class="lp-inner">
        <span class="lp-icon">🏆</span>
        <span class="lp-text">
          <strong>League Pass Active</strong>
          <span class="lp-sep">·</span>
          <span class="lp-league">{{ leagueName }}</span>
          <span v-if="sport" class="lp-sep">·</span>
          <span v-if="sport" class="lp-sport">{{ sportLabel }}</span>
          <span class="lp-sep">·</span>
          <span class="lp-days" :class="urgencyClass">{{ expiryLabel }}</span>
        </span>
      </div>
      <button class="lp-close" @click="dismissed = true" aria-label="Dismiss">✕</button>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useLeaguePass } from '@/composables/useLeaguePass'

const leagueStore = useLeagueStore()
const { hasPass, daysRemaining, expiryLabel } = useLeaguePass()

const dismissed = ref(false)

const show = computed(() => hasPass.value && !dismissed.value && daysRemaining.value !== null)

const leagueName = computed(() => {
  const league = leagueStore.savedLeagues?.find(l => l.league_id === leagueStore.activeLeagueId)
  return league?.league_name || leagueStore.activeLeagueId || 'Your League'
})

const sport = computed(() => leagueStore.activeSport || '')

const sportLabel = computed(() => {
  const s = sport.value
  if (s === 'football') return '🏈 Football'
  if (s === 'basketball') return '🏀 Basketball'
  if (s === 'baseball') return '⚾ Baseball'
  if (s === 'hockey') return '🏒 Hockey'
  return s
})

// Turn yellow when < 30 days, red when < 7
const urgencyClass = computed(() => {
  const d = daysRemaining.value
  if (d === null) return ''
  if (d <= 7) return 'lp-days--urgent'
  if (d <= 30) return 'lp-days--warning'
  return 'lp-days--ok'
})
</script>

<style scoped>
.lp-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 16px;
  background: linear-gradient(90deg, rgba(34,197,94,0.12) 0%, rgba(34,197,94,0.06) 100%);
  border-bottom: 1px solid rgba(34,197,94,0.25);
  font-size: 0.8rem;
  color: #9ca3af;
  min-height: 32px;
}
.lp-inner {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.lp-icon { font-size: 0.9rem; }
.lp-text { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
.lp-text strong { color: #22c55e; font-weight: 700; font-size: 0.8rem; }
.lp-sep { color: #374151; }
.lp-league { color: #d1d5db; }
.lp-sport { color: #9ca3af; }
.lp-days--ok { color: #22c55e; font-weight: 600; }
.lp-days--warning { color: #eab308; font-weight: 600; }
.lp-days--urgent { color: #ef4444; font-weight: 700; }
.lp-close {
  background: none;
  border: none;
  color: #4b5563;
  cursor: pointer;
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 4px;
  transition: color 0.15s;
  flex-shrink: 0;
}
.lp-close:hover { color: #9ca3af; }

.banner-slide-enter-active,
.banner-slide-leave-active { transition: all 0.2s ease; }
.banner-slide-enter-from,
.banner-slide-leave-to { opacity: 0; max-height: 0; padding-top: 0; padding-bottom: 0; }
.banner-slide-enter-to,
.banner-slide-leave-from { opacity: 1; max-height: 40px; }
</style>
