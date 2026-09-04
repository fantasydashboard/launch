<template>
  <div class="min-h-screen py-12" style="background: #05060a;">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

      <!-- ── Purchase success banner ── -->
      <div v-if="purchaseSuccess" class="mb-8 rounded-2xl p-6 flex items-start gap-4"
        style="background: color-mix(in oklab, var(--color-primary, #C6FF3A) 10%, transparent); border: 1px solid color-mix(in oklab, var(--color-primary, #C6FF3A) 40%, transparent);">
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
            style="color: var(--color-primary, #C6FF3A);">← Back to dashboard</button>
        </div>
      </div>

      <!-- ── Page header ── -->
      <div class="text-center mb-4">
        <p class="text-sm font-bold tracking-widest mb-3" style="color: var(--color-primary, #C6FF3A); text-transform: uppercase; letter-spacing: 0.18em;">Pricing</p>
        <h1 class="text-4xl sm:text-5xl font-black text-white mb-4"
          style="font-family: 'Barlow Condensed', sans-serif; letter-spacing: -0.01em;">
Free forever. Upgrade to win.
        </h1>
        <p class="text-lg max-w-xl mx-auto" style="color: #9ca3af;">
          Power rankings, standings and full league history are free — for every league you're
          in, with no time limit. The Season Pass adds the draft, the wire and the trades.
        </p>
        <p class="mt-3 text-sm" style="color: #6b7280;">
          Every plan covers <span class="text-white">every league you're in</span>, across ESPN,
          Yahoo and Sleeper, in all four sports.
        </p>
      </div>

      <div class="grid gap-6 mb-16 sm:grid-cols-2 max-w-4xl mx-auto items-stretch">

        <!-- FREE -->
        <div class="rounded-2xl p-8 flex flex-col" style="background: #0d0f18; border: 1px solid #1e2130;">
          <div class="mb-6">
            <h2 class="text-2xl font-black text-white mb-1">Free</h2>
            <p class="text-sm" style="color: #6b7280;">See the data. Decide when you're ready.</p>
          </div>

          <div class="mb-6">
            <span class="text-5xl font-black text-white">$0</span>
            <span class="text-sm ml-1" style="color: #6b7280;">forever</span>
          </div>

          <ul class="space-y-3 mb-8 flex-1">
            <li v-for="f in freeFeatures" :key="f" class="flex items-start gap-3">
              <!-- A tick reads by its position in the list; it does not need the accent
                   colour, and taking it back leaves the CTA as the only saturated green
                   on the page. -->
              <span class="mt-0.5 flex-shrink-0 text-sm" style="color: #4b5563;">✓</span>
              <span class="text-sm" style="color: #d1d5db;">{{ f }}</span>
            </li>
          </ul>

          <div class="text-center">
            <!-- Signed out, this is an invitation; signed in, it is a statement of fact. -->
            <button @click="isLoggedIn ? goToDashboard() : startTrial()"
              class="w-full py-3 rounded-xl text-sm font-bold transition-colors"
              style="background: #11131a; color: #6b7280; border: 1px solid #1e2130;">
              {{ isLoggedIn ? 'Your current plan' : 'Start free — connect a league' }}
            </button>
          </div>
        </div>

        <!-- UFD SEASON PASS -->
        <div class="rounded-2xl p-8 relative flex flex-col" style="background: linear-gradient(135deg, color-mix(in oklab, var(--color-primary, #C6FF3A) 7%, transparent) 0%, transparent 100%); border: 2px solid var(--color-primary, #C6FF3A);">
          <div class="absolute -top-4 left-1/2 -translate-x-1/2">
            <span class="px-4 py-1 rounded-full text-xs font-black"
              style="background: var(--color-primary, #C6FF3A); color: #0a0c14; letter-spacing: 0.06em; text-transform: uppercase;">Founding price</span>
          </div>

          <div class="mb-6">
            <h2 class="text-2xl font-black text-white mb-1">Season Pass</h2>
            <p class="text-sm" style="color: #9ca3af;">All your leagues · all sports · one season</p>
          </div>

          <div class="mb-2">
            <span class="text-5xl font-black" style="color: var(--color-primary, #C6FF3A);">$39</span>
            <span class="text-sm ml-1" style="color: #6b7280;">/ year</span>
          </div>
          <p class="text-xs mb-6" style="color: #6b7280;">One season, 365 days · renews each year · cancel anytime</p>

          <ul class="space-y-3 mb-8 flex-1">
            <li v-for="f in paidFeatures" :key="f" class="flex items-start gap-3">
              <span class="mt-0.5 flex-shrink-0 text-sm" style="color: #4b5563;">✓</span>
              <span class="text-sm text-white">{{ f }}</span>
            </li>
          </ul>

          <div v-if="checkoutError && checkoutTarget === 'individual'" class="mb-4 p-3 rounded-lg text-sm"
            style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #f87171;">
            {{ checkoutError }}
          </div>

          <button @click="startTrial('individual')" :disabled="checkingOut"
            class="w-full py-4 rounded-xl font-black text-base transition-all transform hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
            style="background: var(--color-primary, #C6FF3A); color: #0a0c14; font-family: 'Barlow Condensed', sans-serif; letter-spacing: 0.06em; text-transform: uppercase; box-shadow: 0 4px 20px color-mix(in oklab, var(--color-primary, #C6FF3A) 30%, transparent);">
            <span v-if="checkingOut && checkoutTarget === 'individual'">Redirecting…</span>
            <span v-else-if="isLoggedIn">Get the Season Pass — $39</span>
            <span v-else>Create an account to subscribe</span>
          </button>
          <p class="text-center text-xs mt-3" style="color: #4b5563;">
            <span v-if="isLoggedIn">Renews each year · cancel anytime</span>
            <span v-else>Free account first · card only when you subscribe</span>
          </p>
        </div>
      </div>

      <!--
        At zero customers there is no social proof to show, and inventing some is the one
        thing that would undercut the product's actual claim. What IS true is unusual enough
        to say plainly, and it is the same discipline the app is built on: no number appears
        until it can be checked.
      -->
      <p class="mx-auto mb-16 max-w-2xl text-center text-sm leading-relaxed" style="color: #6b7280;">
        Built by one person, with a rule: nothing goes on screen until it can be checked.
        That's why the luck read stays hidden until three weeks are played, why all-play
        waits for a scored week, and why the draft board tells you when it doesn't know.
        <span class="text-white">Plenty of tools sound confident. This one tries to be right.</span>
      </p>

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
                <th class="px-4 py-3 text-center text-xs font-bold" style="color: var(--color-primary, #C6FF3A); text-transform: uppercase; letter-spacing: 0.1em;">Season Pass</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in comparisonRows" :key="i"
                :style="{ background: i % 2 === 0 ? '#0d0f18' : '#0a0c14', borderBottom: '1px solid #1a1c26' }">
                <td class="px-6 py-3 text-sm" style="color: #d1d5db;">{{ row.feature }}</td>
                <td class="px-4 py-3 text-center text-sm">
                  <span v-if="row.free === true" style="color: var(--color-primary, #C6FF3A);">✓</span>
                  <span v-else-if="row.free === false" style="color: #374151;">✗</span>
                  <span v-else class="text-xs" style="color: #9ca3af;">{{ row.free }}</span>
                </td>
                <td class="px-4 py-3 text-center text-sm">
                  <span v-if="row.individual === true" style="color: var(--color-primary, #C6FF3A);">✓</span>
                  <span v-else-if="row.individual === false" style="color: #374151;">✗</span>
                  <span v-else class="text-xs font-bold" style="color: var(--color-primary, #C6FF3A);">{{ row.individual }}</span>
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
      <!--
        The emoji went. A row of 🔒⚡🗓️⚾ reads as decoration rather than assurance, and the
        baseball beside a list of four sports was arbitrary. The facts carry themselves.
      -->
      <div class="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 py-6 text-sm"
        style="border-top: 1px solid #1e2130; color: #6b7280;">
        <span>Secure checkout with Stripe</span>
        <span>ESPN, Yahoo &amp; Sleeper</span>
        <span>Football, baseball, basketball, hockey</span>
        <span>Free tier never expires &middot; no card required</span>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useLeagueStore } from '@/stores/league'
import { useAuthStore } from '@/stores/auth'
import { useFeatureAccess } from '@/composables/useFeatureAccess'
import { supabase } from '@/lib/supabase'

const router = useRouter()
const route = useRoute()
const leagueStore = useLeagueStore()
const authStore = useAuthStore()
const { refreshAccess } = useFeatureAccess()

/*
 * Pull the entitlement down after paying.
 *
 * Returning from Stripe showed "Season Pass Activated!" and re-checked nothing. The profile
 * in the store still carried the tier it was loaded with, so hasFullAccess stayed false and
 * every wall on the site stayed up — you paid, were congratulated, and were still locked
 * out until a hard reload. Invisible until this week, because until the walls went up there
 * was nothing for a stale entitlement to block.
 *
 * Retried, because the redirect races Stripe's webhook: the browser comes back the instant
 * checkout completes, while checkout.session.completed lands a moment later. One immediate
 * fetch would usually read the OLD tier and stop. Backing off across ~15 seconds covers the
 * normal case without spinning.
 */
async function claimAccessAfterPurchase() {
  for (const wait of [0, 1500, 3000, 5000, 5000]) {
    if (wait) await new Promise((r) => setTimeout(r, wait))
    try {
      await authStore.fetchProfile()
      await refreshAccess()
    } catch { /* keep trying — a transient failure here must not strand a paying user */ }
    if (authStore.profile?.subscription_tier && authStore.profile.subscription_tier !== 'free') return
  }
}
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
    void claimAccessAfterPurchase()
  }
})

// ── Computed ──────────────────────────────────────────────────────────────────
const perPersonCost = computed(() => (29 / Math.max(1, teamCount.value)).toFixed(2))

// ── Content ───────────────────────────────────────────────────────────────────
/* Deliberately all-positive. The free tier is the marketing — it is what proves the
   product is right before anyone pays — so listing its gaps on its own card made a
   generous offer read as a deficient one. The comparison table below still shows exactly
   what the Season Pass adds, which is where someone goes when they want the difference. */
const freeFeatures = [
  'Every league you\'re in — ESPN, Yahoo & Sleeper',
  'Power rankings, all-play & luck reads',
  'Standings, scores & full league history',
  'All four sports',
  'Never expires, no card',
]

const paidFeatures = [
  'Draft Room — live pick-by-pick recommendations (Sleeper football today)',
  'Your own rankings, used by the draft recommendations',
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
  { feature: 'Power rankings, all-play & situations',  free: true,        individual: true },
  { feature: 'Standings, scores & history',            free: true,        individual: true },
  { feature: 'Matchup deep dive & battle plan',        free: false,       individual: true },
  { feature: 'All four sports',                        free: true,        individual: true },
  { feature: 'Draft Room (Sleeper football today)',    free: false,       individual: true },
  { feature: 'Custom rankings',                        free: false,       individual: true },
  { feature: 'The Wire — waiver targets',              free: false,       individual: true },
  { feature: 'Trade analysis',                         free: false,       individual: true },
  { feature: 'Shareable graphics & downloads',         free: false,       individual: true },
  { feature: 'Billing',                                free: 'Free',      individual: '$39/year, renews' },
]

const faqs = [
  {
    question: 'What do I get for free?',
    answer: 'The whole descriptive half of the product, for every league you\'re in, with no time limit and no card: power rankings, all-play, situations, standings, matchups and league history. It is not a trial and it does not expire.'
  },
  {
    question: 'So what am I paying for?',
    answer: 'The decisions. The Draft Room, waiver targets on The Wire, trade analysis, the matchup deep dive, and the ability to run all of it on your own rankings instead of ours. Free tells you what is true; the Season Pass tells you what to do about it. Note that the live Draft Room currently covers Sleeper football drafts, with basketball and hockey landing before those seasons — The Wire and Trades work in every league and all four sports today.'
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
    question: 'What happens when my Season Pass ends — do I lose my league history?',
    answer: 'No. History, standings, power rankings and all-play are part of the free tier and stay yours whether you renew or not. Ending a Season Pass only closes the Draft Room, the wire, trade analysis and the matchup deep dive.'
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
    /*
     * This pushed to '/auth?intent=signup', a route that does not exist. Vue Router matched
     * nothing, so the click did nothing at all: no navigation, no modal, no error. The
     * checkout button on the pricing page silently went nowhere.
     *
     * It is reachable even when the page says you are signed in, which is how it stayed
     * hidden. The button's label reads `isLoggedIn`, which is Pinia state rehydrated from
     * storage, while this line asks Supabase for a live session — so an expired or
     * unrestored session shows "Get the Season Pass" and then lands here.
     *
     * ?signup=true is the mechanism App.vue already watches for, on any route. Setting it
     * here opens the signup modal WITHOUT navigating, so someone who came to buy stays on
     * the page they came to buy from and can carry straight on once they have an account.
     */
    checkoutError.value = null
    router.replace({ path: '/pricing', query: { ...route.query, signup: 'true' } })
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
