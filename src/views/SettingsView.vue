<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-bold text-dark-text mb-2">Settings</h1>
      <p class="text-base text-dark-textMuted">
        Manage your connected platforms and customize your dashboard
      </p>
    </div>

    <!-- ── Add League Banner ─────────────────────────────────────────────── -->
    <div class="add-league-banner">
      <div class="alb-icon">☝️</div>
      <div class="alb-body">
        <div class="alb-title">Want to add a new league?</div>
        <div class="alb-text">
          Use the <strong>league dropdown in the top-right corner</strong> of the header — look for your league name next to the sport icon. Tap it and select <strong>"Add League"</strong> to connect a new ESPN, Yahoo, or Sleeper league.
        </div>
      </div>
      <div class="alb-arrow">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
        <div class="alb-arrow-label">Top right ↗</div>
      </div>
    </div>

    <!-- Ranking lists (admin only for now) -->
    <div v-if="customRankings.isAdmin.value" class="card">
      <div class="card-header">
        <div class="flex items-center gap-2">
          <span class="text-2xl">📋</span>
          <h2 class="card-title">Rankings</h2>
        </div>
      </div>
      <div class="card-body">
        <p class="mb-5 text-sm text-dark-textMuted">
          Keep as many lists as you like and choose which one drives each surface. Whichever is
          selected applies everywhere that kind of ranking is used, until you change it.
        </p>

        <div v-for="k in KINDS" :key="k" class="mb-6 last:mb-0">
          <h3 class="mb-2 font-mono text-xs uppercase tracking-wide text-dark-textMuted">{{ KIND_LABELS[k] }}</h3>

          <label class="mb-2 flex cursor-pointer items-center gap-3 rounded-lg border p-3"
                 :class="activeFor(k) === '' ? 'border-primary bg-primary/5' : 'border-dark-border'">
            <input type="radio" :checked="activeFor(k) === ''" @change="customRankings.setActive('', k)" />
            <span class="text-sm text-dark-text">{{ UFD_LABEL }}</span>
            <span class="ml-auto font-mono text-[11px] text-dark-textMuted">our own numbers</span>
          </label>

          <label v-for="set in setsFor(k)" :key="set.id"
                 class="mb-2 flex cursor-pointer items-center gap-3 rounded-lg border p-3"
                 :class="activeFor(k) === set.id ? 'border-primary bg-primary/5' : 'border-dark-border'">
            <input type="radio" :checked="activeFor(k) === set.id" @change="customRankings.setActive(set.id, k)" />
            <span class="min-w-0 flex-1">
              <input
                :value="set.name"
                @change="customRankings.renameSet(set.id, ($event.target as HTMLInputElement).value)"
                @click.prevent.stop
                class="w-full bg-transparent text-sm text-dark-text focus:outline-none"
              />
              <span class="block font-mono text-[11px]"
                    :class="isStale(set) ? 'text-amber-400' : 'text-dark-textMuted'">
                {{ countOf(set.text) }} players · updated {{ ageLabel(set.updatedAt) }}
                <template v-if="isStale(set)"> · may be out of date</template>
              </span>
            </span>
            <label class="shrink-0 cursor-pointer rounded border border-dark-border px-2 py-1 font-mono text-[10px] text-dark-textMuted hover:text-dark-text" @click.stop>
              replace
              <input type="file" accept=".csv,.txt,text/csv,text/plain" class="hidden" @change="(e) => onRankingsFile(e, k, set.id)" />
            </label>
            <button @click.prevent.stop="customRankings.deleteSet(set.id)"
                    class="shrink-0 rounded border border-dark-border px-2 py-1 font-mono text-[10px] text-dark-textMuted hover:text-[#FF5C5C]">
              delete
            </button>
          </label>

          <div class="mt-2 flex flex-wrap items-center gap-2">
            <input
              v-model="newName[k]"
              :placeholder="`name a new ${KIND_LABELS[k].toLowerCase()} list`"
              class="w-64 rounded-lg border border-dark-border bg-dark-bg px-3 py-1.5 font-mono text-xs text-dark-text"
            />
            <label class="cursor-pointer rounded-lg bg-primary/20 px-3 py-1.5 font-mono text-xs text-primary hover:bg-primary/30">
              upload csv
              <input type="file" accept=".csv,.txt,text/csv,text/plain" class="hidden" @change="(e) => onRankingsFile(e, k)" />
            </label>
          </div>
        </div>

        <p v-if="rankingsFileMsg" class="mt-2 font-mono text-xs text-emerald-400">{{ rankingsFileMsg }}</p>
      </div>
    </div>

    <!-- Subscription -->
    <div class="card">
      <div class="card-header">
        <div class="flex items-center gap-2">
          <span class="text-2xl">💳</span>
          <h2 class="card-title">Subscription</h2>
        </div>
      </div>
      <div class="p-4">
        <template v-if="isPaid">
          <p class="mb-1 text-sm text-dark-text">Season Pass — active</p>
          <p class="mb-4 font-mono text-xs text-dark-textMuted">
            $39 a year, renewing annually, covering every league you're in. Change your card,
            download invoices or cancel below — cancelling keeps your access until the season
            you've paid for runs out.
          </p>
        </template>
        <template v-else>
          <p class="mb-1 text-sm text-dark-text">You're on the free plan</p>
          <p class="mb-4 font-mono text-xs text-dark-textMuted">
            Power rankings, standings and history are yours for every league, with no time
            limit. The Season Pass adds the Draft Room pick, the wire and trades.
          </p>
        </template>
        <div class="flex flex-wrap items-center gap-3">
          <button v-if="isPaid" @click="openBillingPortal" :disabled="portalLoading"
            class="rounded-lg border border-dark-border px-4 py-2 font-mono text-xs text-dark-text disabled:opacity-60">
            {{ portalLoading ? 'Opening…' : 'Manage subscription' }}
          </button>
          <RouterLink v-else to="/pricing"
            class="rounded-lg bg-primary px-4 py-2 font-mono text-xs font-semibold text-dark-bg">
            See the Season Pass
          </RouterLink>
        </div>
        <p v-if="portalError" class="mt-2 font-mono text-xs text-red-400">{{ portalError }}</p>
      </div>
    </div>

    <!-- Connected Platforms Section -->
    <div class="card">
      <div class="card-header">
        <div class="flex items-center gap-2">
          <span class="text-2xl">🔗</span>
          <h2 class="card-title">Connected Platforms</h2>
        </div>
      </div>
      <div class="card-body">
        <div class="space-y-4">
          <!-- Yahoo Connection -->
          <div class="flex items-center justify-between p-4 bg-dark-border/20 rounded-lg">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                <span class="text-2xl">Y!</span>
              </div>
              <div>
                <div class="font-semibold text-dark-text">Yahoo Fantasy</div>
                <p class="text-sm text-dark-textMuted">
                  {{ platformsStore.isYahooConnected ? 'Connected' : 'Not connected' }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button 
                v-if="platformsStore.isYahooConnected"
                @click="syncYahooLeagues"
                :disabled="syncingYahoo"
                class="btn-primary text-sm"
              >
                <span v-if="syncingYahoo">Syncing...</span>
                <span v-else>Sync Leagues</span>
              </button>
              <button 
                v-if="!platformsStore.isYahooConnected"
                @click="connectYahoo"
                class="btn-primary text-sm"
              >
                Connect Yahoo
              </button>
              <button 
                v-if="platformsStore.isYahooConnected"
                @click="disconnectYahoo"
                class="btn-secondary text-sm"
              >
                Disconnect
              </button>
            </div>
          </div>

          <!-- Yahoo Leagues (if connected) -->
          <div v-if="platformsStore.isYahooConnected && yahooLeagues.length > 0" class="ml-16 space-y-2">
            <div class="text-sm font-semibold text-dark-textMuted uppercase mb-2">Your Yahoo Leagues</div>
            <div v-for="league in yahooLeagues" :key="league.id" 
                 class="flex items-center justify-between p-3 bg-dark-card rounded-lg border border-dark-border">
              <div>
                <div class="font-medium text-dark-text">{{ league.league_name }}</div>
                <div class="text-xs text-dark-textMuted">
                  {{ league.sport }} • {{ league.season }} • {{ league.league_size }} teams
                </div>
              </div>
              <span class="text-xs px-2 py-1 rounded-full" 
                    :class="league.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'">
                {{ league.is_active ? 'Active' : 'Finished' }}
              </span>
            </div>
          </div>

          <!-- Sleeper Connection -->
          <div class="flex items-center justify-between p-4 bg-dark-border/20 rounded-lg">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <span class="text-xl">💤</span>
              </div>
              <div>
                <div class="font-semibold text-dark-text">Sleeper</div>
                <p class="text-sm text-dark-textMuted">
                  {{ platformsStore.isSleeperConnected ? 'Connected' : 'Connect via league selector' }}
                </p>
              </div>
            </div>
            <span v-if="platformsStore.isSleeperConnected" class="text-green-400 text-sm">✓ Connected</span>
          </div>

          <!-- ESPN Coming Soon -->
          <div class="flex items-center justify-between p-4 bg-dark-border/20 rounded-lg opacity-50">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center">
                <span class="text-xl font-bold">E</span>
              </div>
              <div>
                <div class="font-semibold text-dark-text">ESPN Fantasy</div>
                <p class="text-sm text-dark-textMuted">Coming soon</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <LoadingSpinner size="xl" />
    </div>

    <!-- Your Leagues Section -->
    <div class="card">
      <div class="card-header">
        <div class="flex items-center gap-2">
          <span class="text-2xl">🏆</span>
          <h2 class="card-title">Your Leagues</h2>
        </div>
      </div>
      <div class="card-body">
        <p class="text-sm text-dark-textMuted mb-4">
          All features are <span class="text-blue-400 font-semibold">free during beta</span>. 
          Every connected league has full access to Ultimate Tools.
        </p>

        <!-- No leagues -->
        <div v-if="!leagueStore.savedLeagues || leagueStore.savedLeagues.length === 0"
             class="text-center py-8 text-dark-textMuted">
          <div class="text-4xl mb-3">📋</div>
          <p class="text-sm">No leagues connected yet. Add a league to get started.</p>
        </div>

        <!-- League list -->
        <div v-else class="space-y-2">
          <div
            v-for="league in leagueStore.savedLeagues"
            :key="league.league_id"
            class="flex items-center justify-between p-4 bg-dark-border/20 rounded-lg border border-dark-border/30"
          >
            <div class="flex items-center gap-3">
              <!-- Platform icon -->
              <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                   :class="league.platform === 'yahoo' ? 'bg-purple-600/30' : league.platform === 'sleeper' ? 'bg-blue-600/30' : 'bg-red-600/30'"
              >
                <span class="text-base">{{ league.platform === 'yahoo' ? 'Y!' : league.platform === 'sleeper' ? '💤' : 'E' }}</span>
              </div>
              <div>
                <div class="font-medium text-dark-text text-sm">{{ league.league_name || league.league_id }}</div>
                <div class="text-xs text-dark-textMuted capitalize">
                  {{ league.sport }} · {{ league.season }} · {{ league.platform }}
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 font-semibold">
                <span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                Beta Access
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Cache Management Section -->
    <div class="card">
      <div class="card-header">
        <div class="flex items-center gap-2">
          <span class="text-2xl">💾</span>
          <h2 class="card-title">Cache Management</h2>
        </div>
      </div>
      <div class="card-body">
        <div class="space-y-4">
          <div class="flex items-center justify-between p-4 bg-dark-border/20 rounded-lg">
            <div class="flex-1">
              <div class="font-semibold text-dark-text">Local Data Cache</div>
              <p class="text-sm text-dark-textMuted mt-1">
                Data is cached locally to speed up page loads. Historical data is stored for up to 24 hours.
              </p>
              <div v-if="cacheStats" class="mt-2 text-xs text-dark-textMuted">
                <span class="mr-4">Memory: {{ cacheStats.memoryEntries }} entries</span>
                <span class="mr-4">Storage: {{ cacheStats.localStorageEntries }} entries</span>
                <span>Size: {{ cacheStats.totalSize }}</span>
              </div>
            </div>
            <button 
              @click="clearCache"
              :disabled="clearingCache"
              class="btn-secondary text-sm"
            >
              {{ clearingCache ? 'Clearing...' : 'Clear Cache' }}
            </button>
          </div>
          <p class="text-xs text-dark-textMuted px-4">
            Clear the cache if you're seeing outdated data or experiencing issues. This will cause pages to reload data from scratch on next visit.
          </p>
        </div>
      </div>
    </div>

    <!-- Success Message -->
    <div v-if="showSuccess" 
         class="fixed bottom-6 right-6 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50">
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
      <span class="font-semibold">{{ successMessage }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useLeagueStore } from '@/stores/league'
import { usePlatformsStore } from '@/stores/platforms'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import { cache } from '@/services/cache'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { useCustomRankings, KIND_LABELS, KIND_STALE_DAYS, UFD_LABEL, type RankingKind } from '@/composables/useCustomRankings'
import { parseRankings } from '@/draft/room/customRankings'
import { useFeatureAccess } from '@/composables/useFeatureAccess'

const leagueStore = useLeagueStore()

/* Subscription management. Stripe hosts the portal — cancelling, changing a card and
   downloading invoices all live there — so this only mints the link. A subscriber who
   cannot find the way out disputes the charge instead, which costs more than the
   cancellation ever would. */
const { isPaid } = useFeatureAccess()
const portalLoading = ref(false)
const portalError = ref('')
async function openBillingPortal() {
  portalError.value = ''
  portalLoading.value = true
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { portalError.value = 'Please sign in first.'; return }
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-portal-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
    })
    const data = await res.json()
    if (!res.ok) { portalError.value = data.error || 'Could not open the billing portal.'; return }
    if (data.url) window.location.href = data.url
    else portalError.value = 'No portal link came back. Please try again.'
  } catch {
    portalError.value = 'Network error. Please check your connection.'
  } finally {
    portalLoading.value = false
  }
}

// Custom draft rankings — an account-level preference, not draft state, so it
// belongs beside the other standing settings rather than inside a draft tool.
const customRankings = useCustomRankings()
const KINDS: RankingKind[] = ['draft', 'ros', 'week', 'dynasty']
const newName = ref<Record<RankingKind, string>>({ draft: '', ros: '', week: '' })
const rankingsFileMsg = ref('')

const setsFor = (k: RankingKind) => customRankings.sets.value.filter((s) => s.kind === k)
const activeFor = (k: RankingKind) => customRankings.activeByKind.value[k] ?? ''
const countOf = (text: string) => parseRankings(text).length
const ageLabel = (iso: string) => {
  const d = customRankings.ageDaysOf(iso)
  return d === null ? 'unknown' : d === 0 ? 'today' : `${d}d ago`
}
const isStale = (set: { updatedAt: string; kind: RankingKind }) => {
  const d = customRankings.ageDaysOf(set.updatedAt)
  return d !== null && d > KIND_STALE_DAYS[set.kind]
}

async function onRankingsFile(e: Event, kind: RankingKind, replaceId?: string) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const n = await customRankings.loadFromFile(
      file,
      replaceId ? undefined : newName.value[kind],
      replaceId,
      kind,
    )
    rankingsFileMsg.value = `loaded ${n} players from ${file.name}`
    newName.value = { ...newName.value, [kind]: '' }
  } catch {
    rankingsFileMsg.value = "couldn't read that file"
  }
  input.value = ''
}
const platformsStore = usePlatformsStore()
const authStore = useAuthStore()

const isLoading = ref(false)
const showSuccess = ref(false)
const successMessage = ref('Settings saved!')
const syncingYahoo = ref(false)
const yahooLeagues = ref<any[]>([])
const clearingCache = ref(false)
const cacheStats = ref<{ memoryEntries: number; localStorageEntries: number; totalSize: string } | null>(null)

// Initialize platforms store
onMounted(async () => {
  loadCacheStats()
  
  if (authStore.isAuthenticated) {
    await platformsStore.fetchConnectedPlatforms()
    await loadYahooLeagues()
  }
})

// Load cache statistics
function loadCacheStats() {
  cacheStats.value = cache.getStats()
}

// Clear all cached data
async function clearCache() {
  clearingCache.value = true
  try {
    cache.clearAll()
    cacheStats.value = cache.getStats()
    successMessage.value = 'Cache cleared successfully!'
    showSuccess.value = true
    setTimeout(() => showSuccess.value = false, 3000)
  } finally {
    clearingCache.value = false
  }
}

// Connect Yahoo
function connectYahoo() {
  platformsStore.connectYahoo()
}

// Disconnect Yahoo
async function disconnectYahoo() {
  if (!confirm('Disconnect Yahoo? Your Yahoo leagues will be removed.')) return
  
  await platformsStore.disconnectPlatform('yahoo')
  yahooLeagues.value = []
  showSuccessMessage('Yahoo disconnected')
}

// Sync Yahoo leagues
async function syncYahooLeagues() {
  syncingYahoo.value = true
  
  try {
    // Sync football leagues
    const result = await platformsStore.syncYahooLeagues('football')
    
    if (result.success) {
      await loadYahooLeagues()
      showSuccessMessage(`Synced ${result.leagues.length} Yahoo leagues!`)
    } else {
      console.error('Sync failed:', result.error)
      showSuccessMessage('Failed to sync: ' + result.error)
    }
  } catch (err) {
    console.error('Sync error:', err)
  } finally {
    syncingYahoo.value = false
  }
}

// Load Yahoo leagues from database
async function loadYahooLeagues() {
  if (!supabase || !authStore.user) return
  
  const { data, error } = await supabase
    .from('leagues')
    .select('*')
    .eq('user_id', authStore.user.id)
    .eq('platform', 'yahoo')
    .order('season', { ascending: false })
  
  if (!error && data) {
    yahooLeagues.value = data
  }
}

// Show success message
function showSuccessMessage(message: string) {
  successMessage.value = message
  showSuccess.value = true
  setTimeout(() => {
    showSuccess.value = false
  }, 3000)
}

// Watch for auth changes
watch(() => authStore.isAuthenticated, async (isAuth) => {
  if (isAuth) {
    await platformsStore.fetchConnectedPlatforms()
    await loadYahooLeagues()
  }
})
</script>

<style scoped>
/* ── Add League Banner ── */
.add-league-banner {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 22px;
  background: linear-gradient(135deg, rgba(234,179,8,0.12) 0%, rgba(234,179,8,0.05) 100%);
  border: 1.5px solid rgba(234,179,8,0.45);
  border-left: 4px solid #eab308;
  border-radius: 14px;
  box-shadow: 0 0 24px rgba(234,179,8,0.08);
}
.alb-icon {
  font-size: 2rem;
  flex-shrink: 0;
  line-height: 1;
}
.alb-body {
  flex: 1;
  min-width: 0;
}
.alb-title {
  font-size: 1rem;
  font-weight: 800;
  color: #eab308;
  margin-bottom: 4px;
  letter-spacing: 0.01em;
}
.alb-text {
  font-size: 0.875rem;
  color: #9ca3af;
  line-height: 1.55;
}
.alb-text strong {
  color: #e5e7eb;
  font-weight: 700;
}
.alb-arrow {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: #eab308;
  flex-shrink: 0;
  opacity: 0.85;
}
.alb-arrow-label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #eab308;
  white-space: nowrap;
}
</style>
