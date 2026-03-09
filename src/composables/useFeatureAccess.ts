// composables/useFeatureAccess.ts
// Handles subscription tier checking and feature gating

import { ref, computed } from 'vue'

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

  // Stubs kept for interface compatibility
  const isCheckingAccess = ref(false)
  const accessError = ref<string | null>(null)

  // ── BETA MODE: All features are free while Ultimate Tools is in beta ──
  // Subscription checks are skipped. Re-enable by restoring the Supabase
  // checks below when paid access is ready to launch.
  const isAdmin = ref(false)
  const hasRealLeagueAccess = ref(true)
  const hasRealPremiumAccess = ref(true)
  const leagueSubscription = ref<any>(null)
  const premiumSubscription = ref<any>(null)
  const devTierOverride = ref<string | null>(null)

  // No-op: access checks bypassed during beta
  async function checkAllAccess() {
    isCheckingAccess.value = false
  }

  // Effective access — always full during beta
  const effectiveAccess = computed(() => ({
    tier: 'premium' as SubscriptionTier,
    hasLeague: true,
    hasPremium: true
  }))

  function setDevTier(_tier: string | null) { /* no-op in beta */ }
  function clearDevMode() { /* no-op in beta */ }

  const currentTierLabel = computed(() => 'Beta')

  return {
    // Loading state
    isCheckingAccess,
    accessError,

    // Real values (ignores dev mode)
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

    // Feature flags - FREE TIER
    canViewHomepage: computed(() => true),
    canViewBasicMatchups: computed(() => true),

    // Feature flags - LEAGUE PASS TIER
    canViewFullMatchups: computed(() => effectiveAccess.value.hasLeague),
    canViewHistory: computed(() => effectiveAccess.value.hasLeague),
    canViewPowerRankings: computed(() => effectiveAccess.value.hasLeague),
    canViewH2HRecords: computed(() => effectiveAccess.value.hasLeague),
    canViewCareerStats: computed(() => effectiveAccess.value.hasLeague),
    canDownloadGraphics: computed(() => effectiveAccess.value.hasLeague),

    // Feature flags - PREMIUM TIER
    canUseMyTeamTools: computed(() => effectiveAccess.value.hasPremium),
    canViewProjections: computed(() => effectiveAccess.value.hasPremium),
    canUseStartSit: computed(() => effectiveAccess.value.hasPremium),
    canUseWaiverAnalysis: computed(() => effectiveAccess.value.hasPremium),
    canUseTradeAnalyzer: computed(() => effectiveAccess.value.hasPremium),

    // Refresh function
    refreshAccess: checkAllAccess
  }
}

// Helper to calculate league price based on team count
export function calculateLeaguePrice(numTeams: number): number {
  return numTeams > PRICING.leaguePass.threshold
    ? PRICING.leaguePass.large
    : PRICING.leaguePass.small
}

// Helper to format price in dollars
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`
}

// Helper to apply discount
export function applyDiscount(
  basePrice: number,
  discount: { discount_type: string; discount_value: number } | null
): { finalPrice: number; discountAmount: number } {
  if (!discount) {
    return { finalPrice: basePrice, discountAmount: 0 }
  }

  let discountAmount = 0

  if (discount.discount_type === 'fixed') {
    discountAmount = discount.discount_value
  } else if (discount.discount_type === 'percentage') {
    discountAmount = Math.round(basePrice * (discount.discount_value / 100))
  }

  // Don't allow negative prices
  const finalPrice = Math.max(0, basePrice - discountAmount)

  return { finalPrice, discountAmount }
}
