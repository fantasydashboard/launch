<template>
  <div class="min-h-screen py-12">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

      <div v-if="purchaseSuccess" class="mb-8 rounded-2xl p-6 flex items-start gap-4" style="background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.4);">
        <div class="text-3xl">🎉</div>
        <div>
          <h2 class="font-black text-white text-lg mb-1" style="font-family: 'Barlow Condensed', sans-serif; letter-spacing: 0.02em; text-transform: uppercase;">League Pass Activated!</h2>
          <p class="text-sm" style="color: #9ca3af;">Your purchase was successful. Full access is now unlocked for your entire league for the next 365 days — any league mate who signs up and connects their account will get in automatically.</p>
          <button @click="goToDashboard" class="mt-3 inline-flex items-center gap-2 text-sm font-bold transition-colors" style="color: #22c55e;">← Back to dashboard</button>
        </div>
      </div>

      <div id="purchase" class="mb-12 rounded-2xl overflow-hidden" style="border: 1px solid rgba(234,179,8,0.3); background: linear-gradient(135deg, #0f1118 0%, #0c0f1c 100%);">
        <div style="height: 4px; background: linear-gradient(90deg, #eab308, #22c55e, #eab308);"></div>
        <div class="p-8 sm:p-12">
          <div class="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div class="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0" style="background: rgba(234,179,8,0.15); border: 1px solid rgba(234,179,8,0.3);">
              <span class="text-3xl">🏆</span>
            </div>
            <div class="flex-1">
              <div class="flex flex-wrap items-center gap-3 mb-2">
                <h1 class="text-2xl sm:text-3xl font-black text-white" style="font-family: 'Barlow Condensed', sans-serif; letter-spacing: 0.02em; text-transform: uppercase;">One Purchase. The Whole League Wins.</h1>
                <span v-if="contextLeagueName" class="px-3 py-1 rounded-full text-xs font-bold" style="background: rgba(234,179,8,0.2); color: #eab308; border: 1px solid rgba(234,179,8,0.4);">
                  {{ contextLeagueName }}<span v-if="platformLabel"> · {{ platformLabel }}</span>
                </span>
              </div>
              <p class="text-base sm:text-lg" style="color: #9ca3af;">When <strong class="text-white">anyone</strong> in your league buys League Pass, every single member gets full access for <strong class="text-white">365 days</strong> — automatically, no codes, no invites.</p>
              <div class="flex flex-wrap items-center gap-4 mt-4">
                <div class="flex items-center gap-2 text-sm" style="color: #6b7280;"><span style="color: #22c55e;">✓</span><span>Works for ESPN, Yahoo &amp; Sleeper</span></div>
                <div class="flex items-center gap-2 text-sm" style="color: #6b7280;"><span style="color: #22c55e;">✓</span><span>All sports supported</span></div>
                <div class="flex items-center gap-2 text-sm" style="color: #6b7280;"><span style="color: #22c55e;">✓</span><span>365 days of full access</span></div>
              </div>
            </div>
            <button @click="router.back()" class="text-sm flex-shrink-0 transition-colors" style="color: #6b7280;">← Back to dashboard</button>
          </div>
        </div>
      </div>

      <div class="grid lg:grid-cols-3 gap-8 mb-16">

        <div class="bg-dark-card rounded-2xl border border-dark-border p-8">
          <div class="text-center mb-6">
            <div class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-dark-border/50 mb-4"><span class="text-2xl">👤</span></div>
            <h2 class="text-2xl font-bold text-dark-text mb-2">Free</h2>
            <p class="text-dark-textMuted text-sm">Get started with basic features</p>
          </div>
          <div class="text-center mb-6">
            <span class="text-4xl font-black text-dark-text">$0</span>
            <span class="text-dark-textMuted">/forever</span>
          </div>
          <ul class="space-y-3 mb-8">
            <li class="flex items-start gap-3"><span class="text-green-400 mt-0.5">✓</span><span class="text-dark-textSecondary">Homepage standings</span></li>
            <li class="flex items-start gap-3"><span class="text-green-400 mt-0.5">✓</span><span class="text-dark-textSecondary">Basic matchup view</span></li>
            <li class="flex items-start gap-3"><span class="text-green-400 mt-0.5">✓</span><span class="text-dark-textSecondary">Power rankings preview (top 3)</span></li>
            <li class="flex items-start gap-3"><span class="text-green-400 mt-0.5">✓</span><span class="text-dark-textSecondary">Free tools</span></li>
            <li class="flex items-start gap-3"><span class="text-dark-textMuted mt-0.5">✗</span><span class="text-dark-textMuted">Full power rankings</span></li>
            <li class="flex items-start gap-3"><span class="text-dark-textMuted mt-0.5">✗</span><span class="text-dark-textMuted">League history</span></li>
            <li class="flex items-start gap-3"><span class="text-dark-textMuted mt-0.5">✗</span><span class="text-dark-textMuted">Shareable graphics</span></li>
          </ul>
          <div class="text-center"><span class="text-sm text-dark-textMuted">Your current plan</span></div>
        </div>

        <div class="rounded-2xl border-2 p-8 relative" style="background: linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(6,182,212,0.05) 100%); border-color: #22c55e;">
          <div class="absolute -top-4 left-1/2 -translate-x-1/2">
            <span class="px-4 py-1 rounded-full text-sm font-bold" style="background: #22c55e; color: #0a0c14;">Most Popular</span>
          </div>
          <div class="text-center mb-6">
            <div class="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4" style="background: rgba(34,197,94,0.15);"><span class="text-2xl">🏆</span></div>
            <h2 class="text-2xl font-bold text-dark-text mb-2">League Pass</h2>
            <p class="text-dark-textMuted text-sm">Full access for your entire league — 365 days</p>
          </div>
          <div class="text-center mb-2">
            <div class="flex items-center justify-center gap-3 mb-1">
              <span class="text-2xl text-dark-textMuted line-through">${{ regularPrice }}</span>
              <span class="px-2 py-0.5 rounded text-sm font-bold" style="background: rgba(234,179,8,0.2); color: #eab308; border: 1px solid rgba(234,179,8,0.3);">LIMITED TIME</span>
            </div>
            <div><span class="text-6xl font-black" style="color: #22c55e;">${{ launchPrice }}</span><span class="text-dark-textMuted">/year</span></div>
          </div>
          <p class="text-center text-sm mb-6" style="color: #eab308;">🔥 Founding member price — normally ${{ regularPrice }}</p>

          <!-- Per person calculator -->
          <div class="rounded-xl p-4 mb-6" style="background: rgba(0,0,0,0.3);">
            <label class="block text-sm text-dark-textMuted mb-2">How many teams in your league?</label>
            <div class="flex items-center gap-3">
              <input v-model.number="teamCount" type="number" min="2" max="32" class="w-20 px-3 py-2 rounded-lg bg-dark-card border border-dark-border text-dark-text text-center font-bold" />
              <div class="flex-1 text-right">
                <div class="text-sm text-dark-textMuted">Per person:</div>
                <div class="text-xl font-bold" style="color: #22c55e;">${{ perPersonCost }}</div>
              </div>
            </div>
            <p class="text-xs text-dark-textMuted mt-2">Less than a coffee for a full year of access</p>
          </div>

          <ul class="space-y-3 mb-6">
            <li class="flex items-start gap-3"><span class="mt-0.5" style="color: #22c55e;">✓</span><span class="text-dark-text font-medium">Everything in Free</span></li>
            <li class="flex items-start gap-3"><span class="mt-0.5" style="color: #22c55e;">✓</span><span class="text-dark-text">Full power rankings</span></li>
            <li class="flex items-start gap-3"><span class="mt-0.5" style="color: #22c55e;">✓</span><span class="text-dark-text">Complete league history</span></li>
            <li class="flex items-start gap-3"><span class="mt-0.5" style="color: #22c55e;">✓</span><span class="text-dark-text">Head-to-head records</span></li>
            <li class="flex items-start gap-3"><span class="mt-0.5" style="color: #22c55e;">✓</span><span class="text-dark-text">Career stats</span></li>
            <li class="flex items-start gap-3"><span class="mt-0.5" style="color: #22c55e;">✓</span><span class="text-dark-text">Shareable graphics</span></li>
            <li class="flex items-start gap-3"><span class="mt-0.5" style="color: #22c55e;">✓</span><span class="text-dark-text">Matchup deep dive</span></li>
            <li class="flex items-start gap-3"><span class="mt-0.5" style="color: #22c55e;">✓</span><span class="text-dark-text font-medium" style="color: #eab308;">+ Ultimate Tools (free during beta)</span></li>
          </ul>

          <!-- Scope note -->
          <div class="mb-4 p-3 rounded-lg flex items-start gap-2" style="background: rgba(234,179,8,0.06); border: 1px solid rgba(234,179,8,0.2);">
            <span class="text-sm">📋</span>
            <p class="text-xs" style="color: #9ca3af;"><strong class="text-white">One league, one year.</strong> This pass unlocks access for all members of one specific league for 365 days from the date of purchase.</p>
          </div>

          <div v-if="checkoutError" class="mb-4 p-3 rounded-lg text-sm" style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #f87171;">{{ checkoutError }}</div>
          <button
            @click="purchaseLeaguePass"
            :disabled="checkingOut || purchaseSuccess"
            class="w-full py-4 rounded-xl font-black text-lg transition-all transform hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
            style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #0a0c14; font-family: 'Barlow Condensed', sans-serif; letter-spacing: 0.05em; text-transform: uppercase; box-shadow: 0 4px 20px rgba(34,197,94,0.35);"
          >
            <svg v-if="checkingOut" class="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
            <span v-if="purchaseSuccess">✓ League Unlocked!</span>
            <span v-else-if="checkingOut">Redirecting to Checkout...</span>
            <span v-else>Get League Pass — ${{ launchPrice }}</span>
          </button>
          <div class="mt-4 p-3 rounded-lg" style="background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.2);">
            <div class="flex items-center gap-3">
              <div class="text-2xl">👥</div>
              <div class="text-xs text-dark-textMuted"><strong class="text-dark-text">One person pays, everyone benefits.</strong> All league members get full access when they sign up — no codes, no hassle.</div>
            </div>
          </div>
        </div>

        <div class="rounded-2xl p-8 relative" style="background: linear-gradient(135deg, rgba(234,179,8,0.05) 0%, rgba(249,115,22,0.03) 100%); border: 1px solid rgba(234,179,8,0.2);">
          <div class="absolute -top-4 left-1/2 -translate-x-1/2">
            <span class="px-4 py-1 rounded-full text-sm font-bold" style="background: rgba(234,179,8,0.2); color: #eab308; border: 1px solid rgba(234,179,8,0.4);">🧪 In Beta</span>
          </div>
          <div class="text-center mb-6">
            <div class="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4" style="background: rgba(234,179,8,0.15);"><span class="text-2xl">⭐</span></div>
            <h2 class="text-2xl font-bold text-dark-text mb-2">Ultimate Tools</h2>
            <p class="text-dark-textMuted text-sm">AI-powered tools for serious managers</p>
          </div>
          <div class="text-center mb-6">
            <div class="text-5xl font-black mb-1" style="color: #eab308;">FREE</div>
            <div class="text-sm" style="color: #6b7280;">during beta · included with League Pass</div>
          </div>
          <div class="rounded-xl p-4 mb-6 text-center" style="background: rgba(234,179,8,0.08); border: 1px solid rgba(234,179,8,0.2);">
            <p class="text-sm" style="color: #9ca3af;">Ultimate Tools is actively being built. During beta, all features are <strong class="text-white">included free</strong> with every League Pass.</p>
          </div>
          <ul class="space-y-3 mb-8">
            <li class="flex items-start gap-3"><span class="mt-0.5" style="color: #eab308;">✓</span><span class="text-dark-text font-medium">Everything in League Pass</span></li>
            <li class="flex items-start gap-3"><span class="mt-0.5" style="color: #eab308;">✓</span><span class="text-dark-text">AI Projections</span></li>
            <li class="flex items-start gap-3"><span class="mt-0.5" style="color: #eab308;">✓</span><span class="text-dark-text">Start/Sit Recommendations</span></li>
            <li class="flex items-start gap-3"><span class="mt-0.5" style="color: #eab308;">✓</span><span class="text-dark-text">Waiver Wire Analysis</span></li>
            <li class="flex items-start gap-3"><span class="mt-0.5" style="color: #eab308;">✓</span><span class="text-dark-text">Trade Analyzer</span></li>
          </ul>
          <div class="text-center py-4 rounded-xl" style="background: rgba(234,179,8,0.06); border: 1px solid rgba(234,179,8,0.15);">
            <div class="text-sm font-bold mb-1" style="color: #eab308;">🎉 You're getting this free</div>
            <div class="text-xs" style="color: #6b7280;">Pick up League Pass and it's all included.</div>
          </div>
        </div>
      </div>

      <div class="mb-16">
        <h2 class="text-2xl font-bold text-dark-text text-center mb-8">How League Pass Works</h2>
        <div class="grid md:grid-cols-3 gap-8">
          <div class="text-center">
            <div class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style="background: rgba(34,197,94,0.15);"><span class="text-3xl">1️⃣</span></div>
            <h3 class="font-bold text-dark-text mb-2">One Person Purchases</h3>
            <p class="text-dark-textMuted text-sm">The commissioner or any league member buys League Pass for ${{ launchPrice }}. Access starts immediately and lasts 365 days.</p>
          </div>
          <div class="text-center">
            <div class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style="background: rgba(34,197,94,0.15);"><span class="text-3xl">2️⃣</span></div>
            <h3 class="font-bold text-dark-text mb-2">League Mates Sign Up</h3>
            <p class="text-dark-textMuted text-sm">Everyone creates a free account and connects their ESPN, Yahoo, or Sleeper league.</p>
          </div>
          <div class="text-center">
            <div class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style="background: rgba(34,197,94,0.15);"><span class="text-3xl">3️⃣</span></div>
            <h3 class="font-bold text-dark-text mb-2">Automatic Access</h3>
            <p class="text-dark-textMuted text-sm">We detect they're in your league and unlock full access automatically for the full year — no codes needed.</p>
          </div>
        </div>
      </div>

      <div class="mb-16">
        <h2 class="text-2xl font-bold text-dark-text text-center mb-8">Frequently Asked Questions</h2>
        <div class="max-w-3xl mx-auto space-y-4">
          <div v-for="(faq, index) in faqs" :key="index" class="bg-dark-card rounded-xl border border-dark-border overflow-hidden">
            <button @click="toggleFaq(index)" class="w-full flex items-center justify-between p-4 text-left">
              <span class="font-medium text-dark-text">{{ faq.question }}</span>
              <svg class="w-5 h-5 text-dark-textMuted transition-transform" :class="{ 'rotate-180': openFaq === index }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div v-if="openFaq === index" class="px-4 pb-4"><p class="text-dark-textMuted">{{ faq.answer }}</p></div>
          </div>
        </div>
      </div>

      <div class="rounded-2xl p-8 text-center mb-8" style="background: linear-gradient(135deg, #0f1118 0%, #0c0f1c 100%); border: 1px solid rgba(34,197,94,0.2);">
        <p class="text-dark-textMuted mb-2 text-sm">Ready to unlock your league?</p>
        <h3 class="text-2xl font-black text-white mb-2" style="font-family: 'Barlow Condensed', sans-serif; letter-spacing: 0.03em; text-transform: uppercase;">Get League Pass for ${{ launchPrice }} — Founding Member Price</h3>
        <p class="text-sm mb-6" style="color: #6b7280;">One league · 365 days · all members included</p>
        <button @click="scrollToPurchase" class="inline-flex items-center gap-3 px-8 py-4 rounded-xl font-black text-lg transition-all transform hover:scale-[1.02]" style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #0a0c14; font-family: 'Barlow Condensed', sans-serif; letter-spacing: 0.06em; text-transform: uppercase; box-shadow: 0 4px 24px rgba(34,197,94,0.35);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
          Get League Pass Now
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
        <p class="text-xs mt-4" style="color: #4b5563;">Usually ${{ regularPrice }} · founding member price for a limited time</p>
      </div>

      <div class="flex flex-wrap items-center justify-center gap-6 py-6 border-t border-dark-border">
        <div class="flex items-center gap-2 text-dark-textMuted">
          <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          <span class="text-sm">Secure checkout with Stripe</span>
        </div>
        <div class="flex items-center gap-2 text-dark-textMuted">
          <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span class="text-sm">Instant access · 365 days</span>
        </div>
        <div class="flex items-center gap-2 text-dark-textMuted">
          <svg class="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <span class="text-sm">Whole league included</span>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useLeagueStore } from '@/stores/league'
import { supabase } from '@/lib/supabase'

const router = useRouter()
const route = useRoute()
const leagueStore = useLeagueStore()

const contextLeagueId = ref('')
const contextPlatform = ref('')
const contextSport = ref('')
const purchaseSuccess = ref(false)
const checkingOut = ref(false)
const checkoutError = ref<string | null>(null)

onMounted(() => {
  contextLeagueId.value = (route.query.league as string) || leagueStore.activeLeagueId || ''
  contextPlatform.value = (route.query.platform as string) || leagueStore.activePlatform || ''
  contextSport.value = (route.query.sport as string) || leagueStore.activeSport || ''
  if (route.query.success === '1') {
    purchaseSuccess.value = true
    router.replace({ path: '/pricing', query: { ...(contextLeagueId.value ? { league: contextLeagueId.value } : {}), ...(contextPlatform.value ? { platform: contextPlatform.value } : {}) } })
  }
})

const contextLeague = computed(() => contextLeagueId.value ? leagueStore.savedLeagues.find(l => l.league_id === contextLeagueId.value) || null : null)
const contextLeagueName = computed(() => contextLeague.value?.league_name || contextLeagueId.value || '')
const platformLabel = computed(() => {
  const p = contextPlatform.value
  if (p === 'espn') return 'ESPN'
  if (p === 'yahoo') return 'Yahoo'
  if (p === 'sleeper') return 'Sleeper'
  return p
})

const REGULAR_PRICE = 29
const LAUNCH_PRICE = 5
const regularPrice = computed(() => REGULAR_PRICE)
const launchPrice = computed(() => LAUNCH_PRICE)
const teamCount = ref(10)
const openFaq = ref<number | null>(null)
const perPersonCost = computed(() => (launchPrice.value / teamCount.value).toFixed(2))

function scrollToPurchase() { document.getElementById('purchase')?.scrollIntoView({ behavior: 'smooth' }) }
function goToDashboard() { router.push('/') }

async function purchaseLeaguePass() {
  checkoutError.value = null
  if (!contextLeagueId.value || !contextPlatform.value) {
    checkoutError.value = 'Please go back to your dashboard and click "Get League Pass" from there so we can identify your league.'
    return
  }
  const sport = contextSport.value || contextLeague.value?.sport || leagueStore.activeSport || ''
  if (!sport) {
    checkoutError.value = 'Could not determine the sport for your league. Please go back to your dashboard and try again.'
    return
  }
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) { checkoutError.value = 'Please sign in before purchasing.'; return }
  checkingOut.value = true
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const res = await fetch(`${supabaseUrl}/functions/v1/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ league_id: contextLeagueId.value, platform: contextPlatform.value, sport, league_name: contextLeagueName.value }),
    })
    const data = await res.json()
    if (!res.ok) {
      checkoutError.value = res.status === 409 ? 'This league already has an active League Pass!' : (data.error || 'Something went wrong. Please try again.')
      return
    }
    if (data.url) window.location.href = data.url
    else checkoutError.value = 'No checkout URL returned. Please try again.'
  } catch (err: any) {
    console.error('Checkout error:', err)
    checkoutError.value = 'Network error. Please check your connection and try again.'
  } finally {
    checkingOut.value = false
  }
}

const faqs = [
  { question: "How long does League Pass last?", answer: "League Pass gives you and your entire league 365 days of full access from the date of purchase. No seasons, no resets — just one full year." },
  { question: "Does it cover all sports or just one?", answer: "Each League Pass covers one specific league. If you have a football league and a baseball league, each needs its own pass. But within that league, every member gets access across all the views for that league." },
  { question: "What happens after 365 days?", answer: "Your pass expires and the league returns to free tier access. Your historical data is always preserved. You can renew at any time to restore full access." },
  { question: "Can I use this for multiple leagues?", answer: "Each League Pass covers one league. If you're in multiple leagues, each needs its own pass. Many commissioners split the cost with their league mates!" },
  { question: "Do my league mates need to pay?", answer: "No! When one person purchases League Pass, every member of that league gets full access for free. They just need to create a free account and connect their league." },
  { question: "What if I play on both Sleeper and Yahoo?", answer: "We support ESPN, Yahoo, and Sleeper. You can connect as many leagues as you want — each league just needs its own League Pass." },
  { question: "Is there a refund policy?", answer: "Due to the digital nature of the product and instant access, we don't offer refunds. You can try all free features first to make sure it's right for you." },
  { question: "Is the ${{ launchPrice }} price going up?", answer: "Yes — ${{ launchPrice }} is our founding member price. The regular price is ${{ regularPrice }}/year. Lock in the founding member price now before it increases." }
]

function toggleFaq(index: number) { openFaq.value = openFaq.value === index ? null : index }
</script>
