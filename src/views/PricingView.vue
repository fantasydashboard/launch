<template>
  <div class="min-h-screen py-12">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="text-center mb-12">
        <h1 class="text-4xl sm:text-5xl font-black text-dark-text mb-4">
          Choose Your Plan
        </h1>
        <p class="text-xl text-dark-textMuted max-w-2xl mx-auto">
          Unlock the full power of Ultimate Fantasy Dashboard for your league
        </p>
      </div>

      <!-- Sport Selector -->
      <div class="flex items-center justify-center gap-2 mb-12">
        <span class="text-dark-textMuted text-sm">Select your sport:</span>
        <div class="flex items-center gap-2 bg-dark-card rounded-xl p-1 border border-dark-border">
          <button
            v-for="sport in sports"
            :key="sport.id"
            @click="selectedSport = sport.id"
            class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            :class="selectedSport === sport.id 
              ? 'bg-primary text-gray-900' 
              : 'text-dark-textMuted hover:text-dark-text'"
          >
            <span>{{ sport.emoji }}</span>
            <span class="hidden sm:inline">{{ sport.name }}</span>
          </button>
        </div>
      </div>

      <!-- Pricing Cards -->
      <div class="grid lg:grid-cols-3 gap-8 mb-16">
        <!-- Free Tier -->
        <div class="bg-dark-card rounded-2xl border border-dark-border p-8">
          <div class="text-center mb-6">
            <div class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-dark-border/50 mb-4">
              <span class="text-2xl">👤</span>
            </div>
            <h2 class="text-2xl font-bold text-dark-text mb-2">Free</h2>
            <p class="text-dark-textMuted text-sm">Get started with basic features</p>
          </div>
          
          <div class="text-center mb-6">
            <span class="text-4xl font-black text-dark-text">$0</span>
            <span class="text-dark-textMuted">/forever</span>
          </div>

          <ul class="space-y-3 mb-8">
            <li class="flex items-start gap-3">
              <span class="text-green-400 mt-0.5">✓</span>
              <span class="text-dark-textSecondary">Homepage standings</span>
            </li>
            <li class="flex items-start gap-3">
              <span class="text-green-400 mt-0.5">✓</span>
              <span class="text-dark-textSecondary">Basic matchup view</span>
            </li>
            <li class="flex items-start gap-3">
              <span class="text-green-400 mt-0.5">✓</span>
              <span class="text-dark-textSecondary">Power rankings preview (top 3)</span>
            </li>
            <li class="flex items-start gap-3">
              <span class="text-green-400 mt-0.5">✓</span>
              <span class="text-dark-textSecondary">Free tools</span>
            </li>
            <li class="flex items-start gap-3">
              <span class="text-dark-textMuted mt-0.5">✗</span>
              <span class="text-dark-textMuted">Full power rankings</span>
            </li>
            <li class="flex items-start gap-3">
              <span class="text-dark-textMuted mt-0.5">✗</span>
              <span class="text-dark-textMuted">League history</span>
            </li>
            <li class="flex items-start gap-3">
              <span class="text-dark-textMuted mt-0.5">✗</span>
              <span class="text-dark-textMuted">Shareable graphics</span>
            </li>
          </ul>

          <div class="text-center">
            <span class="text-sm text-dark-textMuted">Your current plan</span>
          </div>
        </div>

        <!-- League Pass -->
        <div class="bg-gradient-to-br from-primary/10 to-cyan-500/10 rounded-2xl border-2 border-primary p-8 relative">
          <!-- Popular badge -->
          <div class="absolute -top-4 left-1/2 -translate-x-1/2">
            <span class="px-4 py-1 rounded-full bg-primary text-gray-900 text-sm font-bold">
              Most Popular
            </span>
          </div>

          <div class="text-center mb-6">
            <div class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/20 mb-4">
              <span class="text-2xl">🏆</span>
            </div>
            <h2 class="text-2xl font-bold text-dark-text mb-2">League Pass</h2>
            <p class="text-dark-textMuted text-sm">Full access for your entire league</p>
          </div>

          <!-- Price with discount -->
          <div class="text-center mb-4">
            <div class="flex items-center justify-center gap-2 mb-1">
              <span class="text-2xl text-dark-textMuted line-through">${{ basePrice }}</span>
              <span class="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-sm font-bold">$10 OFF</span>
            </div>
            <div>
              <span class="text-5xl font-black text-primary">${{ discountedPrice }}</span>
              <span class="text-dark-textMuted">/season</span>
            </div>
          </div>

          <!-- Per person calculator -->
          <div class="bg-dark-bg/50 rounded-xl p-4 mb-6">
            <label class="block text-sm text-dark-textMuted mb-2">How many teams in your league?</label>
            <div class="flex items-center gap-3">
              <input
                v-model.number="teamCount"
                type="number"
                min="2"
                max="32"
                class="w-20 px-3 py-2 rounded-lg bg-dark-card border border-dark-border text-dark-text text-center font-bold"
              />
              <div class="flex-1 text-right">
                <div class="text-sm text-dark-textMuted">Per person:</div>
                <div class="text-xl font-bold text-primary">${{ perPersonCost }}</div>
              </div>
            </div>
            <p class="text-xs text-dark-textMuted mt-2">
              {{ teamCount > 12 ? 'Large league (13+ teams): +$10' : 'Standard league (1-12 teams)' }}
            </p>
          </div>

          <ul class="space-y-3 mb-8">
            <li class="flex items-start gap-3">
              <span class="text-primary mt-0.5">✓</span>
              <span class="text-dark-text font-medium">Everything in Free</span>
            </li>
            <li class="flex items-start gap-3">
              <span class="text-primary mt-0.5">✓</span>
              <span class="text-dark-text">Full power rankings</span>
            </li>
            <li class="flex items-start gap-3">
              <span class="text-primary mt-0.5">✓</span>
              <span class="text-dark-text">Complete league history</span>
            </li>
            <li class="flex items-start gap-3">
              <span class="text-primary mt-0.5">✓</span>
              <span class="text-dark-text">Head-to-head records</span>
            </li>
            <li class="flex items-start gap-3">
              <span class="text-primary mt-0.5">✓</span>
              <span class="text-dark-text">Career stats</span>
            </li>
            <li class="flex items-start gap-3">
              <span class="text-primary mt-0.5">✓</span>
              <span class="text-dark-text">Downloadable graphics</span>
            </li>
            <li class="flex items-start gap-3">
              <span class="text-primary mt-0.5">✓</span>
              <span class="text-dark-text">Matchup deep dive</span>
            </li>
          </ul>

          <button 
            @click="purchaseLeaguePass"
            class="w-full py-4 rounded-xl bg-primary hover:bg-primary/90 text-gray-900 font-bold text-lg transition-all transform hover:scale-[1.02]"
          >
            Get League Pass - ${{ discountedPrice }}
          </button>

          <!-- One person pays explanation -->
          <div class="mt-4 p-3 bg-dark-bg/50 rounded-lg">
            <div class="flex items-center gap-3">
              <div class="text-2xl">👥</div>
              <div class="text-xs text-dark-textMuted">
                <strong class="text-dark-text">One person pays, everyone benefits.</strong>
                All league members get full access when they sign up.
              </div>
            </div>
          </div>
        </div>

        <!-- Ultimate Tier -->
        <div class="bg-gradient-to-br from-yellow-500/5 to-orange-500/5 rounded-2xl border border-yellow-500/30 p-8">
          <div class="text-center mb-6">
            <div class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-yellow-500/20 mb-4">
              <span class="text-2xl">⭐</span>
            </div>
            <h2 class="text-2xl font-bold text-dark-text mb-2">Ultimate</h2>
            <p class="text-dark-textMuted text-sm">AI-powered tools for serious managers</p>
          </div>

          <div class="text-center mb-6">
            <div class="flex items-center justify-center gap-4">
              <div class="text-center">
                <span class="text-4xl font-black text-yellow-500">$4.99</span>
                <span class="text-dark-textMuted">/mo</span>
              </div>
              <span class="text-dark-textMuted">or</span>
              <div class="text-center">
                <span class="text-4xl font-black text-yellow-500">$19</span>
                <span class="text-dark-textMuted">/season</span>
              </div>
            </div>
            <p class="text-xs text-dark-textMuted mt-2">Per user • Requires League Pass</p>
          </div>

          <ul class="space-y-3 mb-8">
            <li class="flex items-start gap-3">
              <span class="text-yellow-500 mt-0.5">✓</span>
              <span class="text-dark-text font-medium">Everything in League Pass</span>
            </li>
            <li class="flex items-start gap-3">
              <span class="text-yellow-500 mt-0.5">✓</span>
              <span class="text-dark-text">AI Projections</span>
            </li>
            <li class="flex items-start gap-3">
              <span class="text-yellow-500 mt-0.5">✓</span>
              <span class="text-dark-text">Start/Sit Recommendations</span>
            </li>
            <li class="flex items-start gap-3">
              <span class="text-yellow-500 mt-0.5">✓</span>
              <span class="text-dark-text">Waiver Wire Analysis</span>
            </li>
            <li class="flex items-start gap-3">
              <span class="text-yellow-500 mt-0.5">✓</span>
              <span class="text-dark-text">Trade Analyzer</span>
            </li>
          </ul>

          <button 
            @click="purchaseUltimate"
            class="w-full py-4 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold text-lg transition-all transform hover:scale-[1.02]"
          >
            Go Ultimate
          </button>

          <p class="text-xs text-dark-textMuted text-center mt-3">
            Individual subscription • Not shared with league
          </p>
        </div>
      </div>

      <!-- How League Pass Works -->
      <div class="mb-16">
        <h2 class="text-2xl font-bold text-dark-text text-center mb-8">How League Pass Works</h2>
        
        <div class="grid md:grid-cols-3 gap-8">
          <div class="text-center">
            <div class="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <span class="text-3xl">1️⃣</span>
            </div>
            <h3 class="font-bold text-dark-text mb-2">One Person Purchases</h3>
            <p class="text-dark-textMuted text-sm">
              The commissioner or any league member buys League Pass for the league.
            </p>
          </div>
          
          <div class="text-center">
            <div class="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <span class="text-3xl">2️⃣</span>
            </div>
            <h3 class="font-bold text-dark-text mb-2">League Mates Sign Up</h3>
            <p class="text-dark-textMuted text-sm">
              Everyone creates a free account and connects their Yahoo or Sleeper league.
            </p>
          </div>
          
          <div class="text-center">
            <div class="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <span class="text-3xl">3️⃣</span>
            </div>
            <h3 class="font-bold text-dark-text mb-2">Automatic Access</h3>
            <p class="text-dark-textMuted text-sm">
              We detect they're in your league and unlock full access automatically!
            </p>
          </div>
        </div>
      </div>

      <!-- Comparison Table -->
      <div class="mb-16 overflow-x-auto">
        <h2 class="text-2xl font-bold text-dark-text text-center mb-8">Feature Comparison</h2>
        
        <table class="w-full">
          <thead>
            <tr class="border-b border-dark-border">
              <th class="text-left py-4 px-4 text-dark-textMuted font-medium">Feature</th>
              <th class="text-center py-4 px-4 text-dark-text font-bold">Free</th>
              <th class="text-center py-4 px-4 text-primary font-bold">League Pass</th>
              <th class="text-center py-4 px-4 text-yellow-500 font-bold">Ultimate</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-dark-border/50">
            <tr>
              <td class="py-3 px-4 text-dark-text">Homepage Standings</td>
              <td class="py-3 px-4 text-center text-green-400">✓</td>
              <td class="py-3 px-4 text-center text-green-400">✓</td>
              <td class="py-3 px-4 text-center text-green-400">✓</td>
            </tr>
            <tr>
              <td class="py-3 px-4 text-dark-text">Basic Matchups</td>
              <td class="py-3 px-4 text-center text-green-400">✓</td>
              <td class="py-3 px-4 text-center text-green-400">✓</td>
              <td class="py-3 px-4 text-center text-green-400">✓</td>
            </tr>
            <tr>
              <td class="py-3 px-4 text-dark-text">Free Tools</td>
              <td class="py-3 px-4 text-center text-green-400">✓</td>
              <td class="py-3 px-4 text-center text-green-400">✓</td>
              <td class="py-3 px-4 text-center text-green-400">✓</td>
            </tr>
            <tr>
              <td class="py-3 px-4 text-dark-text">Full Power Rankings</td>
              <td class="py-3 px-4 text-center text-dark-textMuted">—</td>
              <td class="py-3 px-4 text-center text-green-400">✓</td>
              <td class="py-3 px-4 text-center text-green-400">✓</td>
            </tr>
            <tr>
              <td class="py-3 px-4 text-dark-text">League History</td>
              <td class="py-3 px-4 text-center text-dark-textMuted">—</td>
              <td class="py-3 px-4 text-center text-green-400">✓</td>
              <td class="py-3 px-4 text-center text-green-400">✓</td>
            </tr>
            <tr>
              <td class="py-3 px-4 text-dark-text">H2H Records</td>
              <td class="py-3 px-4 text-center text-dark-textMuted">—</td>
              <td class="py-3 px-4 text-center text-green-400">✓</td>
              <td class="py-3 px-4 text-center text-green-400">✓</td>
            </tr>
            <tr>
              <td class="py-3 px-4 text-dark-text">Shareable Graphics</td>
              <td class="py-3 px-4 text-center text-dark-textMuted">—</td>
              <td class="py-3 px-4 text-center text-green-400">✓</td>
              <td class="py-3 px-4 text-center text-green-400">✓</td>
            </tr>
            <tr>
              <td class="py-3 px-4 text-dark-text">AI Projections</td>
              <td class="py-3 px-4 text-center text-dark-textMuted">—</td>
              <td class="py-3 px-4 text-center text-dark-textMuted">—</td>
              <td class="py-3 px-4 text-center text-green-400">✓</td>
            </tr>
            <tr>
              <td class="py-3 px-4 text-dark-text">Start/Sit Advice</td>
              <td class="py-3 px-4 text-center text-dark-textMuted">—</td>
              <td class="py-3 px-4 text-center text-dark-textMuted">—</td>
              <td class="py-3 px-4 text-center text-green-400">✓</td>
            </tr>
            <tr>
              <td class="py-3 px-4 text-dark-text">Waiver Analysis</td>
              <td class="py-3 px-4 text-center text-dark-textMuted">—</td>
              <td class="py-3 px-4 text-center text-dark-textMuted">—</td>
              <td class="py-3 px-4 text-center text-green-400">✓</td>
            </tr>
            <tr>
              <td class="py-3 px-4 text-dark-text">Trade Analyzer</td>
              <td class="py-3 px-4 text-center text-dark-textMuted">—</td>
              <td class="py-3 px-4 text-center text-dark-textMuted">—</td>
              <td class="py-3 px-4 text-center text-green-400">✓</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- FAQ Section -->
      <div class="mb-16">
        <h2 class="text-2xl font-bold text-dark-text text-center mb-8">Frequently Asked Questions</h2>
        
        <div class="max-w-3xl mx-auto space-y-4">
          <div 
            v-for="(faq, index) in faqs" 
            :key="index"
            class="bg-dark-card rounded-xl border border-dark-border overflow-hidden"
          >
            <button
              @click="toggleFaq(index)"
              class="w-full flex items-center justify-between p-4 text-left"
            >
              <span class="font-medium text-dark-text">{{ faq.question }}</span>
              <svg 
                class="w-5 h-5 text-dark-textMuted transition-transform" 
                :class="{ 'rotate-180': openFaq === index }"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div v-if="openFaq === index" class="px-4 pb-4">
              <p class="text-dark-textMuted">{{ faq.answer }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Trust Elements -->
      <div class="flex flex-wrap items-center justify-center gap-6 py-8 border-t border-dark-border">
        <div class="flex items-center gap-2 text-dark-textMuted">
          <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span class="text-sm">Secure checkout with Stripe</span>
        </div>
        <div class="flex items-center gap-2 text-dark-textMuted">
          <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-sm">Instant access after purchase</span>
        </div>
        <div class="flex items-center gap-2 text-dark-textMuted">
          <svg class="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span class="text-sm">This season only • {{ currentSport }} {{ currentYear }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const sports = [
  { id: 'football', name: 'Football', emoji: '🏈' },
  { id: 'baseball', name: 'Baseball', emoji: '⚾' },
  { id: 'basketball', name: 'Basketball', emoji: '🏀' },
  { id: 'hockey', name: 'Hockey', emoji: '🏒' }
]

const selectedSport = ref('football')
const teamCount = ref(10)
const openFaq = ref<number | null>(null)

// Pricing calculations
const SMALL_LEAGUE_PRICE = 39
const LARGE_LEAGUE_PRICE = 49
const LAUNCH_DISCOUNT = 10

const basePrice = computed(() => {
  return teamCount.value > 12 ? LARGE_LEAGUE_PRICE : SMALL_LEAGUE_PRICE
})

const discountedPrice = computed(() => {
  return basePrice.value - LAUNCH_DISCOUNT
})

const perPersonCost = computed(() => {
  const cost = discountedPrice.value / teamCount.value
  return cost.toFixed(2)
})

const currentSport = computed(() => {
  const sport = sports.find(s => s.id === selectedSport.value)
  return sport?.name || 'Football'
})

const currentYear = computed(() => {
  return new Date().getFullYear()
})

const faqs = [
  {
    question: "What happens when the season ends?",
    answer: "Your League Pass subscription is valid for the entire season. When a new season starts, you'll need to purchase again to maintain full access. Your historical data is always preserved."
  },
  {
    question: "Can I use this for multiple leagues?",
    answer: "Each League Pass covers one league for one sport. If you're in multiple leagues, you'll need separate passes for each. Many commissioners split the cost with their league mates!"
  },
  {
    question: "Do my league mates need to pay?",
    answer: "No! When one person purchases League Pass, every member of that league gets full access for free. They just need to create an account and connect their league."
  },
  {
    question: "What if I play on both Sleeper and Yahoo?",
    answer: "We support both platforms! You can connect as many leagues as you want. Each league requires its own League Pass subscription."
  },
  {
    question: "Is there a refund policy?",
    answer: "Due to the digital nature of the product and instant access, we don't offer refunds. However, you can try all the free features before purchasing to make sure it's right for you."
  },
  {
    question: "What's the difference between League Pass and Ultimate?",
    answer: "League Pass unlocks dashboard features for your whole league (history, full rankings, graphics). Ultimate adds personal AI tools (projections, start/sit, waiver analysis) that only you can see - it's an individual subscription."
  },
  {
    question: "Do I need League Pass to get Ultimate?",
    answer: "Yes, Ultimate is an add-on that requires League Pass. Think of it as: League Pass unlocks the dashboard for everyone, Ultimate gives you personal AI tools on top."
  },
  {
    question: "How does automatic access work for my league mates?",
    answer: "When your league mates create a free account and connect their Yahoo or Sleeper account, our system automatically detects they're in a League Pass league and unlocks full access for them."
  }
]

function toggleFaq(index: number) {
  openFaq.value = openFaq.value === index ? null : index
}

function purchaseLeaguePass() {
  // TODO: Implement Stripe checkout
  console.log('Purchase League Pass:', {
    sport: selectedSport.value,
    teamCount: teamCount.value,
    price: discountedPrice.value
  })
  alert('Stripe checkout coming soon!')
}

function purchaseUltimate() {
  // TODO: Implement Stripe checkout
  console.log('Purchase Ultimate')
  alert('Stripe checkout coming soon!')
}
</script>
