<template>
  <!-- Loading State -->
  <div v-if="isCheckingAccess" class="min-h-[60vh] flex items-center justify-center">
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-4 border-primary mx-auto mb-4"></div>
      <p class="text-dark-textMuted">Checking access...</p>
    </div>
  </div>

  <!-- Feature Gate for Free Users -->
  <FeatureGate
    v-else-if="!canViewFullMatchups"
    title="Unlock Full Matchups"
    description="Get access to detailed matchup analysis, historical comparisons, and advanced stats for your entire league."
    :features="[
      'Weekly matchup breakdowns with win probabilities',
      'Historical head-to-head records',
      'Points scored comparisons and trends',
      'Projected scores and analysis',
      'Downloadable matchup graphics'
    ]"
    tierName="League Pass"
    :price="leaguePrice"
    priceSubtext="per league / season"
    priceNote="One-time payment • Access for entire season"
    ctaText="Get League Pass"
    :showLearnMore="true"
    footerNote="Your whole league gets access when you purchase"
    @upgrade="goToPricing"
    @learn-more="goToPricing"
  />

  <!-- Full Content for Subscribers -->
  <template v-else>
    <!-- Yahoo Baseball H2H Categories -->
    <YahooCategoryMatchups v-if="isYahooCategoryBaseball" />
    
    <!-- Yahoo Baseball Points -->
    <YahooBaseballMatchups v-else-if="isYahooBaseball" />
    
    <!-- Sleeper Football (default) -->
    <SleeperMatchups v-else />
  </template>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useRouter } from 'vue-router'
import { useLeagueStore } from '@/stores/league'
import { useSportStore } from '@/stores/sport'
import { useFeatureAccess, calculateLeaguePrice, formatPrice } from '@/composables/useFeatureAccess'
import FeatureGate from '@/components/FeatureGate.vue'

const router = useRouter()
const leagueStore = useLeagueStore()
const sportStore = useSportStore()

// Feature access
const { isCheckingAccess, canViewFullMatchups } = useFeatureAccess()

// Calculate league price based on team count
const leaguePrice = computed(() => {
  const numTeams = leagueStore.currentLeague?.total_rosters || 
                   leagueStore.currentLeague?.settings?.num_teams || 
                   12
  return formatPrice(calculateLeaguePrice(numTeams))
})

// Navigation
function goToPricing() {
  router.push('/pricing')
}

// Lazy load components
const YahooCategoryMatchups = defineAsyncComponent(() => 
  import('@/views/YahooCategoryMatchupsView.vue')
)

const YahooBaseballMatchups = defineAsyncComponent(() => 
  import('@/views/YahooBaseballMatchupsView.vue')
)

const SleeperMatchups = defineAsyncComponent(() => 
  import('@/views/MatchupsView.vue')
)

const isYahooBaseball = computed(() => 
  leagueStore.activePlatform === 'yahoo' && sportStore.activeSport === 'baseball'
)

// Check if it's a H2H Category league (scoring_type: 'head')
const isYahooCategoryBaseball = computed(() => {
  if (!isYahooBaseball.value) return false
  
  const league = leagueStore.yahooLeague
  if (Array.isArray(league) && league[0]) {
    return league[0].scoring_type === 'head'
  }
  return false
})
</script>
