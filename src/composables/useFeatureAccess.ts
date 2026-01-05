// composables/useFeatureAccess.ts
// Handles subscription tier checking and feature gating

import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { useLeagueStore } from '@/stores/league'

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
  const authStore = useAuthStore()
  const leagueStore = useLeagueStore()
  const route = useRoute()

  // Loading states
  const isCheckingAccess = ref(true)
  const accessError = ref<string | null>(null)

  // Real access values (from database)
  const isAdmin = ref(false)
  const hasRealLeagueAccess = ref(false)
  const hasRealPremiumAccess = ref(false)
  const leagueSubscription = ref<any>(null)
  const premiumSubscription = ref<any>(null)

  // Dev mode override (admin only)
  const devTierOverride = ref<string | null>(null)

  // Initialize dev mode from localStorage or URL
  onMounted(() => {
    const urlTier = route.query.dev_tier as string
    if (urlTier) {
      devTierOverride.value = urlTier
    } else {
      devTierOverride.value = localStorage.getItem('dev_tier_override')
    }
  })

  // Check if user is an admin
  async function checkAdminStatus() {
    if (!authStore.user?.id) {
      isAdmin.value = false
      return
    }

    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('id, role')
        .eq('user_id', authStore.user.id)
        .single()

      isAdmin.value = !!data
    } catch (e) {
      isAdmin.value = false
    }
  }

  // Check league access for current league
  async function checkLeagueAccess() {
    if (!authStore.user?.id || !leagueStore.activeLeagueId) {
      hasRealLeagueAccess.value = false
      leagueSubscription.value = null
      return
    }

    try {
      // First check if there's an active subscription for this league
      const { data: subscription, error } = await supabase
        .from('league_subscriptions')
        .select('*')
        .eq('league_key', leagueStore.activeLeagueId)
        .eq('status', 'active')
        .single()

      if (!subscription) {
        hasRealLeagueAccess.value = false
        leagueSubscription.value = null
        return
      }

      leagueSubscription.value = subscription

      // Check if user is the purchaser
      if (subscription.purchaser_id === authStore.user.id) {
        hasRealLeagueAccess.value = true
        return
      }

      // Check if user has been granted access
      const { data: access } = await supabase
        .from('league_access')
        .select('id')
        .eq('league_subscription_id', subscription.id)
        .eq('user_id', authStore.user.id)
        .single()

      hasRealLeagueAccess.value = !!access
    } catch (e) {
      hasRealLeagueAccess.value = false
      leagueSubscription.value = null
    }
  }

  // Check premium access for current sport/season
  async function checkPremiumAccess() {
    if (!authStore.user?.id) {
      hasRealPremiumAccess.value = false
      premiumSubscription.value = null
      return
    }

    // Get sport and season from current league
    const sport = leagueStore.activeSport || 'baseball'
    const season = leagueStore.currentSeason || new Date().getFullYear().toString()

    try {
      const { data, error } = await supabase
        .from('user_premium_subscriptions')
        .select('*')
        .eq('user_id', authStore.user.id)
        .eq('sport', sport)
        .eq('season', season)
        .eq('status', 'active')
        .single()

      hasRealPremiumAccess.value = !!data
      premiumSubscription.value = data
    } catch (e) {
      hasRealPremiumAccess.value = false
      premiumSubscription.value = null
    }
  }

  // Main function to check all access
  async function checkAllAccess() {
    isCheckingAccess.value = true
    accessError.value = null

    try {
      await Promise.all([
        checkAdminStatus(),
        checkLeagueAccess(),
        checkPremiumAccess()
      ])
    } catch (e: any) {
      accessError.value = e.message || 'Error checking access'
    } finally {
      isCheckingAccess.value = false
    }
  }

  // Watch for auth and league changes
  watch(
    () => authStore.user?.id,
    () => checkAllAccess(),
    { immediate: true }
  )

  watch(
    () => leagueStore.activeLeagueId,
    () => {
      checkLeagueAccess()
      checkPremiumAccess()
    }
  )

  // Effective access (respects dev mode for admins)
  const effectiveAccess = computed(() => {
    // Only allow override for admins
    if (!isAdmin.value || !devTierOverride.value) {
      return {
        tier: isAdmin.value ? 'admin' : (hasRealPremiumAccess.value ? 'premium' : (hasRealLeagueAccess.value ? 'league' : 'free')),
        hasLeague: isAdmin.value || hasRealLeagueAccess.value,
        hasPremium: isAdmin.value || hasRealPremiumAccess.value
      }
    }

    switch (devTierOverride.value) {
      case 'free':
        return { tier: 'free' as SubscriptionTier, hasLeague: false, hasPremium: false }
      case 'league':
        return { tier: 'league' as SubscriptionTier, hasLeague: true, hasPremium: false }
      case 'premium':
        return { tier: 'premium' as SubscriptionTier, hasLeague: true, hasPremium: true }
      default:
        return {
          tier: 'admin' as SubscriptionTier,
          hasLeague: true,
          hasPremium: true
        }
    }
  })

  // Set dev mode tier (admin only)
  function setDevTier(tier: string | null) {
    if (!isAdmin.value) return

    devTierOverride.value = tier
    if (tier) {
      localStorage.setItem('dev_tier_override', tier)
    } else {
      localStorage.removeItem('dev_tier_override')
    }
  }

  // Clear dev mode
  function clearDevMode() {
    setDevTier(null)
  }

  // Current tier label for display
  const currentTierLabel = computed(() => {
    if (devTierOverride.value && isAdmin.value) {
      return `${devTierOverride.value.charAt(0).toUpperCase() + devTierOverride.value.slice(1)} (Dev Mode)`
    }
    
    if (isAdmin.value) return 'Admin'
    if (hasRealPremiumAccess.value) return 'Premium'
    if (hasRealLeagueAccess.value) return 'League Pass'
    return 'Free'
  })

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
