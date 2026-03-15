<template>
  <!-- ── WRAP MODE: always renders slot; blurs + overlays when locked ── -->
  <div v-if="wrap" class="lgw">
    <div :class="locked ? 'lgw-blur' : ''"><slot /></div>
    <div v-if="locked" class="lgw-overlay">
      <div class="lgw-cta">
        <div class="lgw-lock">🔒</div>
        <div class="lgw-text">
          <div class="lgw-headline">{{ label || 'League Pass Required' }}</div>
          <div class="lgw-sub">Unlock everything for your whole league — one flat fee, one season.</div>
        </div>
        <button class="lgw-btn" @click="goToPricing">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
          GET LEAGUE PASS
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      </div>
    </div>
  </div>

  <!-- ── INLINE MODE: fade + bar shown after a sliced list ── -->
  <div v-else-if="locked" class="lgi">
    <div class="lgi-fade"></div>
    <div class="lgi-bar">
      <div class="lgi-inner">
        <span class="lgi-lock">🔒</span>
        <span class="lgi-text">The rest of your league is hiding behind League Pass.</span>
        <button class="lgi-btn" @click="goToPricing">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
          GET LEAGUE PASS
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useLeagueStore } from '@/stores/league'

const props = withDefaults(defineProps<{
  wrap?: boolean
  locked?: boolean
  label?: string
}>(), { wrap: false, locked: true })

const router = useRouter()
const leagueStore = useLeagueStore()

const pricingUrl = computed(() => {
  const params = new URLSearchParams()
  if (leagueStore.activeLeagueId) params.set('league', leagueStore.activeLeagueId)
  if (leagueStore.activePlatform) params.set('platform', leagueStore.activePlatform)
  const qs = params.toString()
  return qs ? `/pricing?${qs}` : '/pricing'
})

function goToPricing() {
  router.push(pricingUrl.value)
}
</script>

<style scoped>
/* ── Wrap overlay ── */
.lgw { position: relative; border-radius: 12px; overflow: hidden; }
.lgw-blur { filter: blur(5px); pointer-events: none; user-select: none; opacity: 0.5; }
.lgw-overlay {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(5,6,10,0.55); backdrop-filter: blur(1px);
}
.lgw-cta {
  display: flex; align-items: center; gap: 16px; flex-wrap: wrap; justify-content: center;
  background: linear-gradient(135deg, #0f1118 0%, #0c0f1c 100%);
  border: 1px solid rgba(234,179,8,0.35);
  border-left: 3px solid #eab308;
  border-radius: 14px; padding: 20px 28px;
  box-shadow: 0 0 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(234,179,8,0.08);
  max-width: 520px; text-align: center;
}
.lgw-lock { font-size: 1.5rem; }
.lgw-headline {
  font-size: 1rem; font-weight: 800; color: #fff; margin-bottom: 3px;
  font-family: 'Barlow Condensed', sans-serif; letter-spacing: 0.02em;
}
.lgw-sub { font-size: 0.77rem; color: #6b7280; }
.lgw-btn {
  display: inline-flex; align-items: center; gap: 8px; padding: 11px 22px; white-space: nowrap;
  background: linear-gradient(135deg, #eab308 0%, #ca8a04 100%);
  color: #0a0c14;
  font-family: 'Barlow Condensed', sans-serif; font-size: 0.9rem; font-weight: 900;
  letter-spacing: 0.08em; text-transform: uppercase;
  border: none; border-radius: 8px; cursor: pointer;
  box-shadow: 0 2px 16px rgba(234,179,8,0.35);
  transition: all 0.15s;
}
.lgw-btn:hover {
  background: linear-gradient(135deg, #fbbf24 0%, #eab308 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 24px rgba(234,179,8,0.5);
}
.lgw-btn:active { transform: translateY(0); }

/* ── Inline bar ── */
.lgi { position: relative; margin-top: -40px; }
.lgi-fade { height: 80px; background: linear-gradient(to bottom, transparent, #0a0c14); pointer-events: none; }
.lgi-bar { background: #0a0c14; border-top: 1px solid #1e2130; padding: 16px 24px; }
.lgi-inner { display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; }
.lgi-lock { font-size: 1rem; }
.lgi-text { font-size: 0.82rem; color: #6b7280; }
.lgi-btn {
  display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px;
  background: linear-gradient(135deg, #eab308 0%, #ca8a04 100%);
  color: #0a0c14;
  font-family: 'Barlow Condensed', sans-serif; font-size: 0.85rem; font-weight: 900;
  letter-spacing: 0.07em; text-transform: uppercase;
  border: none; border-radius: 7px; cursor: pointer;
  box-shadow: 0 2px 12px rgba(234,179,8,0.3);
  transition: all 0.15s;
}
.lgi-btn:hover {
  background: linear-gradient(135deg, #fbbf24 0%, #eab308 100%);
  transform: translateY(-1px);
  box-shadow: 0 3px 18px rgba(234,179,8,0.45);
}
</style>
