// composables/useFeatureAccess.ts
// Handles subscription tier checking and feature gating.
//
// Access model:
//   League Pass  — purchased once per league; unlocks league-wide features for
//                  ANY user who loads that league. Stored in `league_subscriptions`.
//   Premium      — individual per-user subscription; unlocks personal tools
//                  (projections, start/sit, waiver analysis). Stored in `profiles`.
//   Admin        — full access; set via profiles.subscription_tier = 'admin'.

import { ref, computed, watch } from 'vue'
import { supabase } from '@/lib/supabase'
import { useLeagueStore } from '@/stores/league'
import { useAuthStore } from '@/stores/auth'

// Pricing constants
export const PRICING = {
  leaguePass: {
    small: 3900,  // $39 for 1-12 teams
    large: 4900,  // $49 for 13+ teams
    threshold: 12
  },
  premium: {
    monthly: 499,   // $4.99/month
    season: 1900    // $19/season
  }
}

export type SubscriptionTier = 'free' | 'league' | 'premium' | 'admin'

export function useFeatureAccess() {
  const leagueStore = useLeagueStore()
  const authStore = useAuthStore()

  // Loading / error state
  const isCheckingAccess = ref(false)
  const accessError = ref<string | null>(null)

  // Raw subscription data
  const isAdmin = ref(false)
  const hasRealLeagueAccess = ref(false)
  const hasRealPremiumAccess = ref(false)
  const leagueSubscription = ref<any>(null)
  const premiumSubscription = ref<any>(null)

  // Dev-mode tier override (admin only)
  const devTierOverride = ref<string | null>(null)

  // ── Core access check ──────────────────────────────────────────────────────
  // Called on mount and whenever the active league changes.
  // 1. Checks profiles for admin / premium tier (per-user).
  // 2. Checks league_passes + league_subscriptions for an active League Pass (per-league).
  //
  // IMPORTANT: We reset hasRealLeagueAccess to false at the start (fail-closed).
  // If any error occurs, access is denied for the new league rather than
  // accidentally inheriting access from a previously-checked league.
  async function checkAllAccess() {
    if (!supabase) return

    // ── RESET immediately (fail-closed) ──
    // Must happen synchronously before any awaits so that if this function
    // is called when switching leagues, the old league's access is revoked
    // right away — even while the new league's DB query is in-flight.
    hasRealLeagueAccess.value = false
    leagueSubscription.value = null

    isCheckingAccess.value = true
    accessError.value = null

    try {
      // ── 1. Profile-level checks (admin + individual premium) ──
      const tier = authStore.profile?.subscription_tier || 'free'
      isAdmin.value = tier === 'admin'
      hasRealPremiumAccess.value = isAdmin.value || ['premium', 'pro'].includes(tier)

      // Restore admin league access after the reset above
      if (isAdmin.value) {
        hasRealLeagueAccess.value = true
      }

      // ── 2. League Pass check ──
      // Stripe webhook writes to `league_passes` (active + expires_at).
      // Legacy code may also write to `league_subscriptions`.
      // Check both tables so either path grants access.
      const leagueId = leagueStore.activeLeagueId
      const platform = leagueStore.activePlatform

      if (leagueId && platform) {
        const now = new Date().toISOString()

        // Primary: league_passes (what stripe-webhook actually creates)
        const { data: passData, error: passError } = await supabase
          .from('league_passes')
          .select('id, expires_at')
          .eq('league_id', leagueId)
          .eq('active', true)
          .gt('expires_at', now)
          .limit(1)
          .maybeSingle()

        if (passError) console.warn('[FeatureAccess] league_passes query error:', passError)

        if (passData) {
          console.log('[FeatureAccess] League pass found in league_passes ✓')
          hasRealLeagueAccess.value = true
          leagueSubscription.value = passData
        } else {
          // Fallback: league_subscriptions (legacy path)
          const { data: subData, error: subError } = await supabase
            .from('league_subscriptions')
            .select('*')
            .eq('league_id', leagueId)
            .eq('platform', platform)
            .eq('status', 'active')
            .maybeSingle()

          if (subError) {
            console.error('[FeatureAccess] league_subscriptions check failed:', subError)
          }

          leagueSubscription.value = subData || null
          // Only grant access if admin OR an active subscription was found
          hasRealLeagueAccess.value = isAdmin.value || !!subData
          if (subData) console.log('[FeatureAccess] League pass found in league_subscriptions ✓')
        }
      } else {
        // No active league selected — only admins retain league access
        hasRealLeagueAccess.value = isAdmin.value
        leagueSubscription.value = null
      }
    } catch (err: any) {
      // Fail-closed: on any error, revoke access for safety
      console.error('[FeatureAccess] checkAllAccess error:', err)
      accessError.value = err?.message || 'Access check failed'
      hasRealLeagueAccess.value = isAdmin.value  // admins always keep access
      leagueSubscription.value = null
    } finally {
      isCheckingAccess.value = false
    }
  }

  // Re-check whenever the active league changes
  watch(
    () => [leagueStore.activeLeagueId, leagueStore.activePlatform],
    () => checkAllAccess(),
    { immediate: true }
  )

  // Also re-check if the user's profile updates (e.g. after purchase)
  watch(
    () => authStore.profile?.subscription_tier,
    () => checkAllAccess()
  )

  // ── Effective access (respects dev-mode override for admins) ──────────────
  const effectiveAccess = computed(() => {
    if (isAdmin.value && devTierOverride.value) {
      const t = devTierOverride.value as SubscriptionTier
      return {
        tier: t,
        hasLeague: t !== 'free',
        hasPremium: t === 'premium' || t === 'admin'
      }
    }
    const tier: SubscriptionTier = isAdmin.value
      ? 'admin'
      : hasRealPremiumAccess.value
        ? 'premium'
        : hasRealLeagueAccess.value
          ? 'league'
          : 'free'
    return {
      tier,
      hasLeague: hasRealLeagueAccess.value || hasRealPremiumAccess.value || isAdmin.value,
      // BETA: League Pass includes Ultimate features. When Ultimate goes paid, revert to:
      // hasPremium: hasRealPremiumAccess.value || isAdmin.value
      hasPremium: hasRealLeagueAccess.value || hasRealPremiumAccess.value || isAdmin.value
    }
  })

  // Dev-mode helpers (admin only)
  function setDevTier(tier: string | null) {
    if (!isAdmin.value) return
    devTierOverride.value = tier
  }
  function clearDevMode() {
    devTierOverride.value = null
  }

  const currentTierLabel = computed(() => {
    if (isAdmin.value && devTierOverride.value) return `Dev: ${devTierOverride.value}`
    const t = effectiveAccess.value.tier
    if (t === 'admin') return 'Admin'
    if (t === 'premium') return 'Premium'
    if (t === 'league') return 'League Pass'
    return 'Free'
  })

  return {
    // Loading state
    isCheckingAccess,
    accessError,

    // Raw subscription data
    isAdmin,
    hasRealLeagueAccess,
    hasRealPremiumAccess,
    leagueSubscription,
    premiumSubscription,

    // Effective values (respects dev mode)
    hasLeagueAccess: computed(() => effectiveAccess.value.hasLeague),
    hasPremiumAccess: computed(() => effectiveAccess.value.hasPremium),
    currentTier: computed(() => effectiveAccess.value.tier),
    currentTierLabel,

    // Dev mode controls (admin only)
    devTierOverride: computed(() => devTierOverride.value),
    isDevMode: computed(() => isAdmin.value && !!devTierOverride.value),
    setDevTier,
    clearDevMode,

    // Feature flags — FREE TIER
    canViewHomepage: computed(() => true),
    canViewBasicMatchups: computed(() => true),

    // Feature flags — LEAGUE PASS TIER
    canViewFullMatchups: computed(() => effectiveAccess.value.hasLeague),
    canViewHistory: computed(() => effectiveAccess.value.hasLeague),
    canViewPowerRankings: computed(() => effectiveAccess.value.hasLeague),
    canViewH2HRecords: computed(() => effectiveAccess.value.hasLeague),
    canViewCareerStats: computed(() => effectiveAccess.value.hasLeague),
    canDownloadGraphics: computed(() => effectiveAccess.value.hasLeague),

    // Feature flags — PREMIUM TIER
    canUseMyTeamTools: computed(() => effectiveAccess.value.hasPremium),
    canViewProjections: computed(() => effectiveAccess.value.hasPremium),
    canUseStartSit: computed(() => effectiveAccess.value.hasPremium),
    canUseWaiverAnalysis: computed(() => effectiveAccess.value.hasPremium),
    canUseTradeAnalyzer: computed(() => effectiveAccess.value.hasPremium),

    // Refresh
    refreshAccess: checkAllAccess
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function calculateLeaguePrice(numTeams: number): number {
  return numTeams > PRICING.leaguePass.threshold
    ? PRICING.leaguePass.large
    : PRICING.leaguePass.small
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`
}

export function applyDiscount(
  basePrice: number,
  discount: { discount_type: string; discount_value: number } | null
): { finalPrice: number; discountAmount: number } {
  if (!discount) return { finalPrice: basePrice, discountAmount: 0 }

  let discountAmount = 0
  if (discount.discount_type === 'fixed') {
    discountAmount = discount.discount_value
  } else if (discount.discount_type === 'percentage') {
    discountAmount = Math.round(basePrice * (discount.discount_value / 100))
  }

  return { finalPrice: Math.max(0, basePrice - discountAmount), discountAmount }
}
