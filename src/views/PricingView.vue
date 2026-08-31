<template>
  <div class="min-h-screen py-12" style="background: #05060a;">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

      <!-- ── Purchase success banner ── -->
      <div v-if="purchaseSuccess" class="mb-8 rounded-2xl p-6 flex items-start gap-4"
        style="background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.4);">
        <div class="text-3xl">🎉</div>
        <div>
          <h2 class="font-black text-white text-lg mb-1"
            style="font-family: 'Barlow Condensed', sans-serif; letter-spacing: 0.02em; text-transform: uppercase;">
            Season Pass Activated!
          </h2>
          <p class="text-sm" style="color: #9ca3af;">
            You now have full access across all your leagues and sports.
          </p>
          <button @click="goToDashboard" class="mt-3 inline-flex items-center gap-2 text-sm font-bold"
            style="color: #22c55e;">← Back to dashboard</button>
        </div>
      </div>

      <!-- ── Page header ── -->
      <div class="text-center mb-4">
        <p class="text-sm font-bold tracking-widest mb-3" style="color: #22c55e; text-transform: uppercase; letter-spacing: 0.18em;">Pricing</p>
        <h1 class="text-4xl sm:text-5xl font-black text-white mb-4"
          style="font-family: 'Barlow Condensed', sans-serif; letter-spacing: -0.01em;">
Free forever. Upgrade to win.
        </h1>
        <p class="text-lg max-w-xl mx-auto" style="color: #9ca3af;">
          Power rankings, all-play and history are free for every league, with no time limit.
          The Season Pass adds the draft, the wire and the trades.
        </p>
      </div>

      <div class="grid gap-6 mb-16 sm:grid-cols-2 max-w-4xl mx-auto">

        <!-- FREE -->
        <div class="rounded-2xl p-8" style="background: #0d0f18; border: 1px solid #1e2130;">
          <div class="mb-6">
            <div class="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4"
              style="background: rgba(255,255,255,0.05); border: 1px solid #1e2130;">
              <span class="text-xl">👤</span>
            </div>
            <h2 class="text-2xl font-black text-white mb-1">Free</h2>
            <p class="text-sm" style="color: #6b7280;">See the data. Decide when you're ready.</p>
          </div>

          <div class="mb-6">
            <span class="text-5xl font-black text-white">$0</span>
            <span class="text-sm ml-1" style="color: #6b7280;">forever</span>
          </div>

          <ul class="space-y-3 mb-8">
            <li v-for="f in freeFeatures" :key="f.text" class="flex items-start gap-3">
              <span class="mt-0.5 flex-shrink-0 text-sm" :style="{ color: f.included ? '#22c55e' : '#374151' }">
                {{ f.included ? '✓' : '✗' }}
              </span>
              <span class="text-sm" :style="{ color: f.included ? '#d1d5db' : '#4b5563' }">{{ f.text }}</span>
            </li>
          </ul>

          <div class="text-center">
            <button @click="goToDashboard"
              class="w-full py-3 rounded-xl text-sm font-bold transition-colors"
              style="background: #11131a; color: #6b7280; border: 1px solid #1e2130;">
              Your current plan
            </button>
          </div>
        </div>

        <!-- UFD SEASON PASS -->
        <div class="rounded-2xl p-8 relative" style="background: linear-gradient(135deg, rgba(34,197,94,0.07) 0%, rgba(6,182,212,0.04) 100%); border: 2px solid #22c55e;">
          <div class="absolute -top-4 left-1/2 -translate-x-1/2">
            <span class="px-4 py-1 rounded-full text-xs font-black"
              style="background: #22c55e; color: #0a0c14; letter-spacing: 0.06em; text-transform: uppercase;">Most Popular</span>
          </div>

          <div class="mb-6">
            <div class="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4"
              style="background: rgba(34,197,94,0.15); border: 1px solid rgba(34,197,94,0.3);">
              <span class="text-xl">⚡</span>
            </div>
            <h2 class="text-2xl font-black text-white mb-1">Season Pass</h2>
            <p class="text-sm" style="color: #9ca3af;">All your leagues · all sports · one season</p>
          </div>

          <div class="mb-2">
            <span class="text-5xl font-black" style="color: #22c55e;">$39</span>
            <span class="text-sm ml-1" style="color: #6b7280;">/ season</span>
          </div>
          <p class="text-xs mb-6" style="color: #6b7280;">Renews annually · every league you're in · cancel anytime</p>

          <ul class="space-y-3 mb-8">
            <li v-for="f in paidFeatures" :key="f" class="flex items-start gap-3">
              <span class="mt-0.5 flex-shrink-0 text-sm" style="color: #22c55e;">✓</span>
              <span class="text-sm text-white">{{ f }}</span>
            </li>
          </ul>

          <div v-if="checkoutError && checkoutTarget === 'individual'" class="mb-4 p-3 rounded-lg text-sm"
            style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #f87171;">
            {{ checkoutError }}
          </div>

          <button @click="startTrial('individual')" :disabled="checkingOut"
            class="w-full py-4 rounded-xl font-black text-base transition-all transform hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
            style="background: linear-gradient(135deg, #22c55e, #16a34a); color: #0a0c14; font-family: 'Barlow Condensed', sans-serif; letter-spacing: 0.06em; text-transform: uppercase; box-shadow: 0 4px 20px rgba(34,197,94,0.3);">
            <span v-if="checkingOut && checkoutTarget === 'individual'">Redirecting…</span>
            <span v-else-if="isLoggedIn">Get the Season Pass — $39</span>
            <span v-else>Get Started Free</span>
          </button>
          <p class="text-center text-xs mt-3" style="color: #4b5563;">
            <span v-if="isLoggedIn">$39/year · renews annually · cancel anytime</span>
            <span v-else>Start free — no credit card</span>
          </p>
        </div>
      </div>

      <!-- ── Feature comparison table ── -->
      <div class="mb-16 rounded-2xl overflow-hidden" style="border: 1px solid #1e2130;">
        <div class="px-6 py-4" style="background: #0d0f18; border-bottom: 1px solid #1e2130;">
          <h2 class="text-lg font-black text-white">What's included</h2>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr style="background: #0a0c14; border-bottom: 1px solid #1e2130;">
                <th class="text-left px-6 py-3 text-xs font-bold text-dark-textMuted" style="color: #6b7280; text-transform: uppercase; letter-spacing: 0.1em; width: 45%;">Feature</th>
                <th class="px-4 py-3 text-center text-xs font-bold" style="color: #6b7280; text-transform: uppercase; letter-spacing: 0.1em;">Free</th>
                <th class="px-4 py-3 text-center text-xs font-bold" style="color: #22c55e; text-transform: uppercase; letter-spacing: 0.1em;">Season Pass</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in comparisonRows" :key="i"
                :style="{ background: i % 2 === 0 ? '#0d0f18' : '#0a0c14', borderBottom: '1px solid #1a1c26' }">
                <td class="px-6 py-3 text-sm" style="color: #d1d5db;">{{ row.feature }}</td>
                <td class="px-4 py-3 text-center text-sm">
                  <span v-if="row.free === true" style="color: #22c55e;">✓</span>
                  <span v-else-if="row.free === false" style="color: #374151;">✗</span>
                  <span v-else class="text-xs" style="color: #9ca3af;">{{ row.free }}</span>
                </td>
                <td class="px-4 py-3 text-center text-sm">
                  <span v-if="row.individual === true" style="color: #22c55e;">✓</span>
                  <span v-else-if="row.individual === false" style="color: #374151;">✗</span>
                  <span v-else class="text-xs font-bold" style="color: #22c55e;">{{ row.individual }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── FAQ ── -->
      <div class="mb-16">
        <h2 class="text-2xl font-black text-white text-center mb-8"
          style="font-family: 'Barlow Condensed', sans-serif; letter-spacing: 0.02em;">Frequently Asked Questions</h2>
        <div class="max-w-3xl mx-auto space-y-3">
          <div v-for="(faq, i) in faqs" :key="i"
            class="rounded-xl overflow-hidden" style="background: #0d0f18; border: 1px solid #1e2130;">
            <button @click="openFaq = openFaq === i ? null : i"
              class="w-full flex items-center justify-between p-4 text-left">
              <span class="font-medium text-white text-sm">{{ faq.question }}</span>
              <svg class="w-4 h-4 flex-shrink-0 transition-transform" :class="{ 'rotate-180': openFaq === i }"
                style="color: #6b7280;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div v-if="openFaq === i" class="px-4 pb-4">
              <p class="text-sm" style="color: #9ca3af;">{{ faq.answer }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Footer trust bar ── -->
      <div class="flex flex-wrap items-center justify-center gap-8 py-6"
        style="border-top: 1px solid #1e2130;">
        <div class="flex items-center gap-2" style="color: #6b7280;">
          <span style="color: #22c55e;">🔒</span>
          <span class="text-sm">Secure checkout with Stripe</span>
        </div>
        <div class="flex items-center gap-2" style="color: #6b7280;">
          <span>⚡</span>
          <span class="text-sm">ESPN, Yahoo &amp; Sleeper supported</span>
        </div>
        <div class="flex items-center gap-2" style="color: #6b7280;">
          <span>🗓️</span>
          <span class="text-sm">Free tier never expires · no card required</span>
        </div>
        <div class="flex items-center gap-2" style="color: #6b7280;">
          <span>⚾</span>
          <span class="text-sm">Football, baseball, basketball, hockey</span>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useLeagueStore } from '@/stores/league'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'

const router = useRouter()
const route = useRoute()
const leagueStore = useLeagueStore()
const authStore = useAuthStore()
const isLoggedIn = computed(() => !!authStore.user)

// ── State ─────────────────────────────────────────────────────────────────────

const teamCount = ref(10)
const openFaq = ref<number | null>(null)
const purchaseSuccess = ref(false)
const purchasePlan = ref('')
const checkingOut = ref(false)
const checkoutTarget = ref<'individual' | null>(null)
const checkoutError = ref<string | null>(null)

const contextSport = ref('')

onMounted(() => {
  contextSport.value = (route.query.sport as string) || leagueStore.activeSport || ''
  purchasePlan.value = (route.query.plan as string) || ''

  // Clear any stale checkout error state
  checkoutError.value = null
  checkoutTarget.value = ''

  if (route.query.success === '1') {
    purchaseSuccess.value = true
    // Meta Pixel
    setTimeout(() => {
      if (typeof window !== 'undefined' && (window as any).fbq) {
        const value = 39
        ;(window as any).fbq('track', 'Purchase', { value, currency: 'USD' })
      }
    }, 1500)
    router.replace({ path: '/pricing', query: {} })
  }
})

// ── Computed ──────────────────────────────────────────────────────────────────
const perPersonCost = computed(() => (29 / Math.max(1, teamCount.value)).toFixed(2))

// ── Content ───────────────────────────────────────────────────────────────────
const freeFeatures = [
  { text: 'Every league you\'re in — ESPN, Yahoo & Sleeper', included: true },
  { text: 'Power rankings, all-play & luck reads', included: true },
  { text: 'Standings, scores & full league history', included: true },
  { text: 'All four sports', included: true },
  { text: 'No time limit', included: true },
  { text: 'Draft Room recommendations', included: false },
  { text: 'Waiver targets & trade analysis', included: false },
]

const paidFeatures = [
  'Draft Room — live pick-by-pick recommendations',
  'Custom rankings, built into the board',
  'The Wire — waiver targets before your league sees them',
  'Trade analysis',
  'Shareable graphics & downloads',
  'Every league you\'re in, all four sports',
]

/* Free is not a crippled demo — it is the whole descriptive half of the product, for every
   league, forever. That is deliberate: the thing that separates this from the competition
   is being RIGHT, and correctness is invisible at purchase time. Letting people live in the
   honest version all season is what makes it visible. The Season Pass sells the decisions:
   the draft, the wire, the trade. */
const comparisonRows = [
  { feature: 'Connect leagues (ESPN, Yahoo, Sleeper)', free: true,        individual: true },
  { feature: 'Leagues covered',                        free: 'All yours', individual: 'All yours' },
  { feature: 'Power rankings, all-play & situations',  free: true,        individual: true },
  { feature: 'Standings, scores & history',            free: true,        individual: true },
  { feature: 'Matchup deep dive & battle plan',        free: false,       individual: true },
  { feature: 'All four sports',                        free: true,        individual: true },
  { feature: 'Draft Room recommendations',             free: false,       individual: true },
  { feature: 'Custom rankings',                        free: false,       individual: true },
  { feature: 'The Wire — waiver targets',              free: false,       individual: true },
  { feature: 'Trade analysis',                         free: false,       individual: true },
  { feature: 'Shareable graphics & downloads',         free: false,       individual: true },
  { feature: 'Billing',                                free: 'Free',      individual: '$39/yr, renews' },
]

const faqs = [
  {
    question: 'What do I get for free?',
    answer: 'The whole descriptive half of the product, for every league you\'re in, with no time limit and no card: power rankings, all-play, situations, standings, matchups and league history. It is not a trial and it does not expire.'
  },
  {
    question: 'So what am I paying for?',
    answer: 'The decisions. The Draft Room and its pick-by-pick recommendations, custom rankings, waiver targets on The Wire, and trade analysis. Free tells you what is true; the Season Pass tells you what to do about it.'
  },
  {
    question: 'Does the Season Pass cover all my leagues?',
    answer: 'Yes — every league you are in, across ESPN, Yahoo and Sleeper, in all four sports. One price, no per-league add-ons.'
  },
  {
    question: 'Why one season instead of a monthly plan?',
    answer: 'Fantasy is seasonal. A monthly plan means remembering to cancel in January, and it works out more expensive across a season anyway. The Season Pass runs 365 days from purchase.'
  },
  {
    question: 'What platforms and sports are supported?',
    answer: 'ESPN, Yahoo, and Sleeper. Football, baseball, basketball, and hockey. Connect as many leagues as you have across all platforms.'
  },
  {
    question: 'Can I cancel?',
    answer: 'Yes — Settings → Subscription → Manage subscription, which opens the Stripe billing portal. Cancel, change your card or download invoices there. Cancelling keeps your access until the season you have paid for runs out.'
  },
]

// ── Actions ───────────────────────────────────────────────────────────────────
function goToDashboard() { router.push('/') }

async function startTrial(_target?: 'individual') {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    // Not logged in — send to sign up, trial starts automatically on account creation
    router.push('/auth?intent=signup')
    return
  }

  // Logged in — straight to checkout. There is only one plan now.
  await purchaseIndividual()
}

async function purchaseIndividual() {
  checkoutError.value = null
  checkoutTarget.value = 'individual'

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) { checkoutError.value = 'Please sign in first.'; return }

  checkingOut.value = true
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const plan = 'individual_annual'   // the only plan; monthly and League Pass were retired
    // Only send plan — do NOT send league_id/platform, server uses those to pick league pass product
    const res = await fetch(`${supabaseUrl}/functions/v1/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ plan }),
    })
    const data = await res.json()
    if (!res.ok) {
      checkoutError.value = data.error || 'Something went wrong.'
      return
    }
    if (data.url) window.location.href = data.url
    else checkoutError.value = 'No checkout URL returned. Please try again.'
  } catch (err: any) {
    checkoutError.value = 'Network error. Please check your connection.'
  } finally {
    checkingOut.value = false
  }
}
</script>
