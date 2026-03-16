// src/composables/useLeaguePass.ts
//
// Checks whether the currently active league has a valid League Pass for
// the current season. Used by LeagueGate.vue and anywhere else that needs
// to know if premium features should be unlocked.

import { ref, computed, watch } from 'vue'
import { supabase } from '@/lib/supabase'
import { useLeagueStore } from '@/stores/league'

// ── Season key logic (mirrors the edge function) ────────────────────────────
export function getCurrentSeasonKey(sport: string): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1 // 1-based

  switch (sport) {
    case 'football':
      return month >= 9 ? `nfl_${year}` : `nfl_${year - 1}`
    case 'basketball':
      return month >= 10
        ? `nba_${year}-${String(year + 1).slice(2)}`
        : `nba_${year - 1}-${String(year).slice(2)}`
    case 'hockey':
      return month >= 10
        ? `nhl_${year}-${String(year + 1).slice(2)}`
        : `nhl_${year - 1}-${String(year).slice(2)}`
    case 'baseball':
      return `mlb_${year}`
    default:
      return `season_${year}`
  }
}

// ── In-memory cache so we don't hammer Supabase on every component mount ────
const cache = new Map<string, { hasPass: boolean; ts: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export function useLeaguePass() {
  const leagueStore = useLeagueStore()

  const hasPass = ref(false)
  const loading = ref(true)
  const error = ref<string | null>(null)

  // The active league's lock status — true means the gate should show
  const isLocked = computed(() => !hasPass.value)

  async function checkPass(leagueId: string, platform: string, sport: string) {
    if (!leagueId || !sport) {
      loading.value = false
      hasPass.value = false
      return
    }

    const seasonKey = getCurrentSeasonKey(sport)
    const cacheKey = `${leagueId}::${seasonKey}`

    // Cache hit?
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      hasPass.value = cached.hasPass
      loading.value = false
      return
    }

    loading.value = true
    error.value = null

    try {
      const { data, error: dbError } = await supabase
        .from('league_passes')
        .select('id')
        .eq('league_id', leagueId)
        .eq('season_key', seasonKey)
        .eq('active', true)
        .maybeSingle()

      if (dbError) throw dbError

      hasPass.value = !!data
      cache.set(cacheKey, { hasPass: hasPass.value, ts: Date.now() })
    } catch (err: any) {
      console.error('useLeaguePass: Supabase error', err)
      error.value = err.message
      hasPass.value = false
    } finally {
      loading.value = false
    }
  }

  // Re-check whenever the active league changes
  watch(
    () => [leagueStore.activeLeagueId, leagueStore.activePlatform, leagueStore.activeSport],
    ([id, platform, sport]) => {
      if (id) checkPass(id as string, platform as string, sport as string)
    },
    { immediate: true }
  )

  // Call this after a successful purchase to bust the cache and re-check
  function invalidateCache(leagueId?: string) {
    if (leagueId) {
      // Remove all season keys for this league
      for (const key of cache.keys()) {
        if (key.startsWith(leagueId)) cache.delete(key)
      }
    } else {
      cache.clear()
    }
  }

  async function refresh() {
    invalidateCache(leagueStore.activeLeagueId)
    await checkPass(
      leagueStore.activeLeagueId,
      leagueStore.activePlatform,
      leagueStore.activeSport
    )
  }

  return { hasPass, isLocked, loading, error, checkPass, refresh, invalidateCache, getCurrentSeasonKey }
}
