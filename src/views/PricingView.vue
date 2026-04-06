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
            {{ purchasePlan === 'league_pass' ? 'League Pass Activated!' : 'Individual Plan Activated!' }}
          </h2>
          <p class="text-sm" style="color: #9ca3af;">
            <template v-if="purchasePlan === 'league_pass'">
              Your league now has full access for 365 days — automatically, no codes needed.
            </template>
            <template v-else>
              You now have full access across all your leagues and sports.
            </template>
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
          Start free. Upgrade when ready.
        </h1>
        <p class="text-lg max-w-xl mx-auto" style="color: #9ca3af;">
          7-day free trial on all plans — no credit card required.
        </p>
      </div>

      <!-- ── Key distinction callout ── -->
      <div class="max-w-3xl mx-auto mb-10">
        <p class="text-center text-xs font-bold mb-4" style="color:#6b7280;text-transform:uppercase;letter-spacing:0.14em;">⚠️ Before you choose — understand the difference</p>
        <div class="grid sm:grid-cols-2 gap-4">
          <div class="rounded-2xl p-6" style="background: linear-gradient(135deg,rgba(34,197,94,0.1),rgba(34,197,94,0.04)); border: 1.5px solid rgba(34,197,94,0.4);">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style="background:rgba(34,197,94,0.2);border:1px solid rgba(34,197,94,0.4);">
                <span class="text-lg">👤</span>
              </div>
              <div>
                <div class="font-black text-white text-base">Individual Plan</div>
                <div class="text-xs font-bold" style="color:#22c55e;">For you only</div>
              </div>
            </div>
            <p class="text-sm" style="color:#d1d5db;">Unlocks <strong class="text-white">all of your leagues</strong> across all platforms and sports. You get full access everywhere — but your leaguemates do not.</p>
            <div class="mt-3 pt-3" style="border-top:1px solid rgba(34,197,94,0.2);">
              <span class="text-xs font-bold px-2 py-1 rounded-full" style="background:rgba(34,197,94,0.15);color:#22c55e;">Best for: the data guy in the league</span>
            </div>
          </div>
          <div class="rounded-2xl p-6" style="background: linear-gradient(135deg,rgba(234,179,8,0.1),rgba(234,179,8,0.04)); border: 1.5px solid rgba(234,179,8,0.4);">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style="background:rgba(234,179,8,0.2);border:1px solid rgba(234,179,8,0.4);">
                <span class="text-lg">🏆</span>
              </div>
              <div>
                <div class="font-black text-white text-base">League Pass</div>
                <div class="text-xs font-bold" style="color:#eab308;">One league · whole team</div>
              </div>
            </div>
            <p class="text-sm" style="color:#d1d5db;">Covers <strong class="text-white">one specific league</strong> for 365 days. Every member gets full access automatically — no codes, no hassle.</p>
            <div class="mt-3 pt-3" style="border-top:1px solid rgba(234,179,8,0.2);">
              <span class="text-xs font-bold px-2 py-1 rounded-full" style="background:rgba(234,179,8,0.15);color:#eab308;">Best for: commissioners who want everyone in</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Individual billing toggle ── -->
      <div class="flex items-center justify-center gap-4 mb-10">
        <span class="text-sm font-bold" :style="{ color: billingCycle === 'monthly' ? '#fff' : '#6b7280' }">Monthly</span>
        <button @click="billingCycle = billingCycle === 'monthly' ? 'annual' : 'monthly'"
          style="position:relative;width:52px;height:28px;border-radius:999px;border:none;cursor:pointer;transition:background 0.2s;flex-shrink:0;padding:0;"
          :style="{ background: billingCycle === 'annual' ? '#22c55e' : '#374151' }">
          <span style="position:absolute;top:3px;width:22px;height:22px;background:white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3);transition:left 0.2s;"
            :style="{ left: billingCycle === 'annual' ? '27px' : '3px' }"></span>
        </button>
        <span class="text-sm font-bold" :style="{ color: billingCycle === 'annual' ? '#fff' : '#6b7280' }">
          Annual
          <span class="ml-1 px-2 py-0.5 rounded text-xs font-bold"
            style="background: rgba(34,197,94,0.2); color: #22c55e;">Save 49%</span>
        </span>
      </div>

      <!-- ── 3 plan cards ── -->
      <div class="grid lg:grid-cols-3 gap-6 mb-16">

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

        <!-- INDIVIDUAL -->
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
            <h2 class="text-2xl font-black text-white mb-1">Individual</h2>
            <p class="text-sm" style="color: #9ca3af;">All your leagues · all sports · just you</p>
          </div>

          <div class="mb-2">
            <span class="text-5xl font-black" style="color: #22c55e;">
              ${{ billingCycle === 'monthly' ? '7.99' : '4.08' }}
            </span>
            <span class="text-sm ml-1" style="color: #6b7280;">/mo</span>
          </div>
          <p class="text-xs mb-6" style="color: #6b7280;">
            {{ billingCycle === 'annual' ? 'Billed $49/year — save $46.88 vs monthly' : 'Billed monthly · cancel anytime' }}
          </p>

          <ul class="space-y-3 mb-8">
            <li v-for="f in paidFeatures" :key="f" class="flex items-start gap-3">
              <span class="mt-0.5 flex-shrink-0 text-sm" style="color: #22c55e;">✓</span>
              <span class="text-sm text-white">{{ f }}</span>
            </li>
            <li class="flex items-start gap-3">
              <span class="mt-0.5 flex-shrink-0 text-sm" style="color: #6b7280;">✗</span>
              <span class="text-sm" style="color: #4b5563;">Whole-league access (Individual plan only covers you)</span>
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
            <span v-else-if="isLoggedIn">{{ billingCycle === 'annual' ? 'Get Annual Plan' : 'Get Monthly Plan' }}</span>
            <span v-else>Get Started Free</span>
          </button>
          <p class="text-center text-xs mt-3" style="color: #4b5563;">
            <span v-if="isLoggedIn">{{ billingCycle === 'annual' ? 'Billed $49/year · cancel anytime' : 'Billed monthly · cancel anytime' }}</span>
            <span v-else>No credit card required · 7-day free trial</span>
          </p>
        </div>

        <!-- LEAGUE PASS -->
        <div class="rounded-2xl p-8 relative" style="background: linear-gradient(135deg, rgba(234,179,8,0.07) 0%, rgba(249,115,22,0.03) 100%); border: 1px solid rgba(234,179,8,0.3);">

          <div class="mb-6">
            <div class="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4"
              style="background: rgba(234,179,8,0.15); border: 1px solid rgba(234,179,8,0.3);">
              <span class="text-xl">🏆</span>
            </div>
            <h2 class="text-2xl font-black text-white mb-1">League Pass</h2>
            <p class="text-sm" style="color: #9ca3af;">One league · 365 days · everyone included</p>
          </div>

          <div class="mb-2">
            <span class="text-5xl font-black" style="color: #eab308;">$29</span>
            <span class="text-sm ml-1" style="color: #6b7280;">one-time</span>
          </div>
          <p class="text-xs mb-4" style="color: #6b7280;">365 days · one specific league · all members unlocked</p>

          <!-- Per-person calculator -->
          <div class="rounded-xl p-4 mb-6" style="background: rgba(0,0,0,0.3); border: 1px solid #1e2130;">
            <label class="block text-xs font-bold mb-2" style="color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em;">Teams in your league</label>
            <div class="flex items-center gap-3">
              <input v-model.number="teamCount" type="number" min="2" max="32"
                class="w-20 px-3 py-2 rounded-lg text-center font-bold text-white text-sm"
                style="background: #0a0c14; border: 1px solid #374151;" />
              <div class="flex-1 text-right">
                <div class="text-xs" style="color: #6b7280;">Per person</div>
                <div class="text-xl font-black" style="color: #eab308;">${{ perPersonCost }}</div>
              </div>
            </div>
            <p class="text-xs mt-2" style="color: #4b5563;">Less than a cup of coffee for a full year</p>
          </div>

          <ul class="space-y-3 mb-8">
            <li v-for="f in paidFeatures" :key="f" class="flex items-start gap-3">
              <span class="mt-0.5 flex-shrink-0 text-sm" style="color: #eab308;">✓</span>
              <span class="text-sm text-white">{{ f }}</span>
            </li>
            <li class="flex items-start gap-3">
              <span class="mt-0.5 flex-shrink-0 text-sm" style="color: #eab308;">✓</span>
              <span class="text-sm font-bold text-white">Whole league gets access automatically</span>
            </li>
          </ul>

          <div v-if="checkoutError && checkoutTarget === 'league'" class="mb-4 p-3 rounded-lg text-sm"
            style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #f87171;">
            {{ checkoutError }}
          </div>

          <button @click="startTrial('league')" :disabled="checkingOut"
            class="w-full py-4 rounded-xl font-black text-base transition-all transform hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
            style="background: linear-gradient(135deg, #eab308, #ca8a04); color: #0a0c14; font-family: 'Barlow Condensed', sans-serif; letter-spacing: 0.06em; text-transform: uppercase; box-shadow: 0 4px 20px rgba(234,179,8,0.25);">
            <span v-if="checkingOut && checkoutTarget === 'league'">Redirecting…</span>
            <span v-else-if="isLoggedIn">Buy League Pass — $29</span>
            <span v-else>Get Started Free</span>
          </button>
          <p class="text-center text-xs mt-3" style="color: #4b5563;">
            <span v-if="isLoggedIn">One-time payment · your whole league gets access instantly</span>
            <span v-else>No credit card required · buy the pass after your trial</span>
          </p>

          <!-- Scope note -->
          <div class="mt-4 p-3 rounded-lg flex items-start gap-2"
            style="background: rgba(234,179,8,0.06); border: 1px solid rgba(234,179,8,0.15);">
            <span class="text-xs flex-shrink-0">📋</span>
            <p class="text-xs" style="color: #9ca3af;"><strong class="text-white">One league, one year.</strong> This pass covers one specific league. If you're in multiple leagues, each needs its own pass — or pick Individual instead.</p>
          </div>
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
                <th class="px-4 py-3 text-center text-xs font-bold" style="color: #22c55e; text-transform: uppercase; letter-spacing: 0.1em;">Individual</th>
                <th class="px-4 py-3 text-center text-xs font-bold" style="color: #eab308; text-transform: uppercase; letter-spacing: 0.1em;">League Pass</th>
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
                <td class="px-4 py-3 text-center text-sm">
                  <span v-if="row.league === true" style="color: #eab308;">✓</span>
                  <span v-else-if="row.league === false" style="color: #374151;">✗</span>
                  <span v-else class="text-xs font-bold" style="color: #eab308;">{{ row.league }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── How League Pass works ── -->
      <div class="mb-16">
        <h2 class="text-2xl font-black text-white text-center mb-8"
          style="font-family: 'Barlow Condensed', sans-serif; letter-spacing: 0.02em;">How League Pass Works</h2>
        <div class="grid md:grid-cols-3 gap-6">
          <div v-for="step in leaguePassSteps" :key="step.num" class="text-center">
            <div class="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style="background: rgba(234,179,8,0.12); border: 1px solid rgba(234,179,8,0.25);">
              <span class="text-2xl">{{ step.icon }}</span>
            </div>
            <h3 class="font-bold text-white mb-2">{{ step.title }}</h3>
            <p class="text-sm" style="color: #9ca3af;">{{ step.desc }}</p>
          </div>
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
          <span class="text-sm">7-day free trial · no card required</span>
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
import { ref, computed, onMounted } from 'vue'
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
const billingCycle = ref<'monthly' | 'annual'>('annual')
const teamCount = ref(10)
const openFaq = ref<number | null>(null)
const purchaseSuccess = ref(false)
const purchasePlan = ref('')
const checkingOut = ref(false)
const checkoutTarget = ref<'individual' | 'league' | null>(null)
const checkoutError = ref<string | null>(null)

const contextLeagueId = ref('')
const contextPlatform = ref('')
const contextSport = ref('')

onMounted(() => {
  contextLeagueId.value = (route.query.league as string) || leagueStore.activeLeagueId || ''
  contextPlatform.value = (route.query.platform as string) || leagueStore.activePlatform || ''
  contextSport.value = (route.query.sport as string) || leagueStore.activeSport || ''
  purchasePlan.value = (route.query.plan as string) || ''

  if (route.query.success === '1') {
    purchaseSuccess.value = true
    // Meta Pixel
    setTimeout(() => {
      if (typeof window !== 'undefined' && (window as any).fbq) {
        const value = purchasePlan.value === 'league_pass' ? 29 : purchasePlan.value === 'individual_annual' ? 49 : 7.99
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
  { text: 'Connect ESPN, Yahoo & Sleeper leagues', included: true },
  { text: 'All dashboards & data visible', included: true },
  { text: 'First 3 rows of any expandable list', included: true },
  { text: 'Power rankings & standings', included: true },
  { text: 'Expand full lists & popups', included: false },
  { text: 'Shareable social graphics', included: false },
  { text: 'Downloads & exports', included: false },
]

const paidFeatures = [
  'All dashboards & data',
  'Expand full lists, popups & modals',
  'Full power rankings with trend graph',
  'Complete league history & career stats',
  'Head-to-head records',
  'Shareable social graphics',
  'Unlimited downloads',
  'ESPN, Yahoo & Sleeper · all sports',
]

const comparisonRows = [
  { feature: 'Connect leagues (ESPN, Yahoo, Sleeper)', free: true,          individual: true,       league: true },
  { feature: 'View all dashboards & data',             free: true,          individual: true,       league: true },
  { feature: 'Power rankings (preview)',               free: 'Top 3',       individual: true,       league: true },
  { feature: 'Expand full lists & popups',             free: false,         individual: true,       league: true },
  { feature: 'Complete league history',                free: false,         individual: true,       league: true },
  { feature: 'Head-to-head records',                   free: false,         individual: true,       league: true },
  { feature: 'Career stats',                           free: false,         individual: true,       league: true },
  { feature: 'Shareable social graphics',              free: false,         individual: true,       league: true },
  { feature: 'Unlimited downloads',                    free: false,         individual: true,       league: true },
  { feature: 'All sports supported',                   free: true,          individual: true,       league: true },
  { feature: 'Covers multiple leagues',                free: '—',           individual: 'All yours', league: 'One league' },
  { feature: 'Whole league gets access',               free: false,         individual: false,      league: true },
  { feature: '365-day access',                         free: false,         individual: 'Recurring', league: true },
]

const leaguePassSteps = [
  { num: 1, icon: '1️⃣', title: 'One person buys it', desc: 'The commissioner or any league member buys League Pass for $29. Access starts immediately and lasts 365 days.' },
  { num: 2, icon: '2️⃣', title: 'League mates sign up', desc: 'Everyone creates a free account and connects the same ESPN, Yahoo, or Sleeper league.' },
  { num: 3, icon: '3️⃣', title: 'Automatic access', desc: 'We detect they\'re in your league and unlock full access automatically — no codes, no invites.' },
]

const faqs = [
  {
    question: 'What\'s the difference between Individual and League Pass?',
    answer: 'Individual is for you personally — all your leagues, all sports, as many as you want. League Pass covers one specific league for 365 days, but every member of that league gets full access automatically when they sign up.'
  },
  {
    question: 'Do I need a credit card for the free trial?',
    answer: 'No credit card required. Your 7-day free trial starts automatically the moment you create an account — no card, no commitment. At the end of your trial you can choose a plan or stay on the free tier.'
  },
  {
    question: 'What happens after 7 days?',
    answer: 'If you don\'t upgrade, the app stays free but expandable sections and downloads will be locked. You can upgrade at any time to unlock everything again.'
  },
  {
    question: 'Can I buy a League Pass for more than one league?',
    answer: 'Yes — each League Pass covers one specific league. If you\'re in two leagues and want both unlocked for the whole group, you\'d need two passes. Alternatively, Individual gives you personal access to all your leagues.'
  },
  {
    question: 'What platforms and sports are supported?',
    answer: 'ESPN, Yahoo, and Sleeper. Football, baseball, basketball, and hockey. Connect as many leagues as you have across all platforms.'
  },
  {
    question: 'Can I cancel my Individual subscription?',
    answer: 'Yes — cancel anytime from your Stripe billing portal. You keep access through the end of your current billing period.'
  },
]

// ── Actions ───────────────────────────────────────────────────────────────────
function goToDashboard() { router.push('/') }

async function startTrial(target: 'individual' | 'league') {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    // Not logged in — send to sign up, trial starts automatically on account creation
    router.push('/auth?intent=signup')
    return
  }

  // Logged in — go straight to Stripe checkout for the selected plan
  if (target === 'individual') {
    await purchaseIndividual()
  } else {
    await purchaseLeaguePass()
  }
}

async function purchaseLeaguePass() {
  checkoutError.value = null
  checkoutTarget.value = 'league'

  if (!contextLeagueId.value || !contextPlatform.value) {
    checkoutError.value = 'Please go to your dashboard and navigate here from your league so we can identify it.'
    return
  }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) { checkoutError.value = 'Please sign in first.'; return }

  checkingOut.value = true
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const sport = contextSport.value || leagueStore.activeSport || 'unknown'
    const res = await fetch(`${supabaseUrl}/functions/v1/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        plan: 'league_pass',
        league_id: contextLeagueId.value,
        platform: contextPlatform.value,
        sport,
        league_name: leagueStore.savedLeagues.find(l => l.league_id === contextLeagueId.value)?.league_name || contextLeagueId.value,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      checkoutError.value = res.status === 409 ? 'This league already has an active League Pass!' : (data.error || 'Something went wrong.')
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

async function purchaseIndividual() {
  checkoutError.value = null
  checkoutTarget.value = 'individual'

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) { checkoutError.value = 'Please sign in first.'; return }

  checkingOut.value = true
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const plan = billingCycle.value === 'annual' ? 'individual_annual' : 'individual_monthly'
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
