<template>
  <!-- ── WRAP MODE: always renders slot; blurs + overlays when locked ── -->
  <div v-if="wrap" class="lgw">
    <div :class="effectiveLocked ? 'lgw-blur' : ''"><slot /></div>
    <div v-if="effectiveLocked && !checking" class="lgw-overlay">
      <div class="lgw-cta">
        <div class="lgw-lock">🔒</div>
        <div class="lgw-text">
          <div class="lgw-headline">{{ label || 'Upgrade to unlock' }}</div>
          <div class="lgw-sub">Start your 14-day free trial or view plans — no credit card required.</div>
        </div>
        <div class="lgw-btns">
          <button class="lgw-btn lgw-btn-trial" @click="goToTrial">
            Start free trial
          </button>
          <button class="lgw-btn lgw-btn-plans" @click="goToPricing">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            View plans
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- ── INLINE MODE: fade + bar shown after a sliced list ── -->
  <div v-else-if="effectiveLocked && !checking" class="lgi">
    <div class="lgi-fade"></div>
    <div class="lgi-bar">
      <div class="lgi-inner">
        <span class="lgi-lock">🔒</span>
        <span class="lgi-text">Start your free trial or upgrade to see everything.</span>
        <button class="lgi-btn lgi-btn-trial" @click="goToTrial">
          Start free trial
        </button>
        <button class="lgi-btn lgi-btn-plans" @click="goToPricing">
          View plans
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useLeagueStore } from '@/stores/league'
import { supabase } from '@/lib/supabase'

const props = withDefaults(defineProps<{
  wrap?: boolean
  /**
   * Optional locked override from the parent:
   *   - Pass :locked="false"  → always unlocked (parent already checked access)
   *   - Pass :locked="true"   → always locked   (no need for a second DB query)
   *   - Omit entirely         → this component checks Supabase itself
   *
   * Most views use useFeatureAccess and pass :locked="!hasLeagueAccess", which
   * means this component's internal Supabase check only fires when the parent
   * hasn't already resolved the state — preventing redundant queries.
   */
  locked?: boolean
  label?: string
}>(), { wrap: false })

const router = useRouter()
const leagueStore = useLeagueStore()

// ── Internal state ──────────────────────────────────────────────────────────
// Only used when props.locked is undefined (parent didn't pass an override).
const supabaseLocked = ref(true) // assume locked until proven otherwise (fail-closed)
const checking = ref(false)

/**
 * Effective lock state:
 *   1. If parent explicitly passes :locked="false" → never locked
 *   2. If parent explicitly passes :locked="true"  → always locked (skip DB check)
 *   3. If parent omits the prop                    → use our internal Supabase result
 */
const effectiveLocked = computed(() => {
  if (props.locked === false) return false   // parent says unlocked
  if (props.locked === true)  return true    // parent says locked, trust it
  return supabaseLocked.value                // parent didn't say — use our DB check
})

// ── Check Supabase for active league pass ───────────────────────────────────
// Uses a module-level cache to avoid hitting Supabase on every render.
// Cache key uses league_id + platform (NOT season_key — the Stripe webhook
// never writes season_key; it only writes active + expires_at).
const _cache = new Map<string, { locked: boolean; ts: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function checkLeaguePass(leagueId: string, platform: string) {
  if (!leagueId || !platform) {
    supabaseLocked.value = true
    return
  }

  const cacheKey = `${leagueId}::${platform}`
  const cached = _cache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    supabaseLocked.value = cached.locked
    return
  }

  checking.value = true
  try {
    const now = new Date().toISOString()

    // IMPORTANT: filter by platform AND expires_at — NOT season_key.
    // The Stripe webhook (stripe-webhook edge function) writes:
    //   league_id, platform, active=true, expires_at
    // It does NOT write season_key, so filtering on that column always returns
    // null and makes this gate permanently locked even for paying leagues.
    const { data, error } = await supabase
      .from('league_passes')
      .select('id')
      .eq('league_id', leagueId)
      .eq('platform', platform)
      .eq('active', true)
      .gt('expires_at', now)
      .limit(1)
      .maybeSingle()

    if (error) throw error

    const locked = !data
    supabaseLocked.value = locked
    _cache.set(cacheKey, { locked, ts: Date.now() })
  } catch (err) {
    console.warn('[LeagueGate] Could not check league pass — defaulting to locked', err)
    supabaseLocked.value = true // fail-closed
  } finally {
    checking.value = false
  }
}

// ── Watch for league/platform changes ───────────────────────────────────────
// Only run the internal DB check when the parent hasn't provided a locked prop.
// If the parent is already passing :locked from useFeatureAccess, skip the
// redundant query entirely.
function runCheck() {
  if (props.locked !== undefined) return // parent owns the state, don't double-query
  const leagueId = leagueStore.activeLeagueId
  const platform = leagueStore.activePlatform || ''
  if (leagueId) checkLeaguePass(leagueId, platform)
}

onMounted(runCheck)
watch(() => [leagueStore.activeLeagueId, leagueStore.activePlatform], runCheck)

// ── Navigation ───────────────────────────────────────────────────────────────
const pricingUrl = computed(() => {
  const params = new URLSearchParams()
  if (leagueStore.activeLeagueId) params.set('league', leagueStore.activeLeagueId)
  if (leagueStore.activePlatform) params.set('platform', leagueStore.activePlatform)
  if (leagueStore.activeSport) params.set('sport', leagueStore.activeSport)
  const qs = params.toString()
  return qs ? `/pricing?${qs}` : '/pricing'
})

function goToPricing() {
  router.push(pricingUrl.value)
}

function goToTrial() {
  const params = new URLSearchParams()
  if (leagueStore.activeLeagueId) params.set('league', leagueStore.activeLeagueId)
  if (leagueStore.activePlatform) params.set('platform', leagueStore.activePlatform)
  params.set('intent', 'trial')
  const qs = params.toString()
  router.push(qs ? `/pricing?${qs}` : '/pricing')
}

// ── Cache invalidation (call after successful purchase) ──────────────────────
function invalidateCache(leagueId?: string) {
  if (leagueId) {
    const platform = leagueStore.activePlatform || ''
    _cache.delete(`${leagueId}::${platform}`)
  } else {
    _cache.clear()
  }
}

defineExpose({ invalidateCache })
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
.lgw-btns { display: flex; gap: 8px; flex-wrap: wrap; }
.lgw-btn {
  display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; white-space: nowrap;
  font-family: 'Barlow Condensed', sans-serif; font-size: 0.88rem; font-weight: 900;
  letter-spacing: 0.06em; text-transform: uppercase;
  border-radius: 8px; cursor: pointer; transition: all 0.15s;
}
.lgw-btn-trial {
  background: #22c55e; color: #0a0c14; border: none;
  box-shadow: 0 2px 16px rgba(34,197,94,0.3);
}
.lgw-btn-trial:hover { background: #16a34a; transform: translateY(-1px); }
.lgw-btn-plans {
  background: transparent; color: #9ca3af;
  border: 1px solid #374151;
}
.lgw-btn-plans:hover { border-color: #6b7280; color: #e5e7eb; }
.lgw-btn:active { transform: translateY(0); }

/* ── Inline bar ── */
.lgi { position: relative; margin-top: -40px; }
.lgi-fade { height: 80px; background: linear-gradient(to bottom, transparent, #0a0c14); pointer-events: none; }
.lgi-bar { background: #0a0c14; border-top: 1px solid #1e2130; padding: 16px 24px; }
.lgi-inner { display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; }
.lgi-lock { font-size: 1rem; }
.lgi-text { font-size: 0.82rem; color: #6b7280; }
.lgi-btn {
  display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px;
  font-family: 'Barlow Condensed', sans-serif; font-size: 0.82rem; font-weight: 900;
  letter-spacing: 0.06em; text-transform: uppercase;
  border-radius: 6px; cursor: pointer; transition: all 0.15s;
}
.lgi-btn-trial {
  background: #22c55e; color: #0a0c14; border: none;
  box-shadow: 0 2px 10px rgba(34,197,94,0.25);
}
.lgi-btn-trial:hover { background: #16a34a; }
.lgi-btn-plans {
  background: transparent; color: #9ca3af;
  border: 1px solid #374151;
}
.lgi-btn-plans:hover { border-color: #6b7280; color: #e5e7eb; }
</style>
