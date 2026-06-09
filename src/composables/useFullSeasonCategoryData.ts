import { ref } from 'vue'

/**
 * Full-season Yahoo category data loader (Task 10 — MyTeamView).
 *
 * The league store only ever holds a SINGLE week of category matchups in
 * leagueStore.yahooMatchups (see stores/league.ts loadYahooLeagueData — it
 * fetches getCategoryMatchups for the current/active week only). UnifiedSeasonView
 * derives its per-category record from that same single-week store state, so the
 * per-category ranks shown on My Team would only reflect the loaded week(s).
 *
 * To make the "11th in Saves" style ranks reflect the FULL season, this composable
 * loops yahooService.getCategoryMatchups(leagueKey, week) across all completed weeks
 * (startWeek..currentWeek-1, plus the active week) and returns the flattened matchup
 * array. Each weekly call is cache-backed in the service (CACHE_KEYS.YAHOO_CATEGORY_MATCHUPS),
 * so re-fetching the active week the store already loaded is cheap.
 *
 * It does NOT duplicate the per-category win/loss derivation math — that stays in
 * MyTeamView's existing computeds, which simply consume this fuller matchup array.
 * It also fetches league settings once to expose real stat-category display names.
 */

export interface CategoryLabel {
  name: string
  label: string
}

export function useFullSeasonCategoryData() {
  // Flattened full-season matchups (each carries .stat_winners + .teams).
  const seasonMatchups = ref<any[]>([])
  // stat_id -> { name, label } from Yahoo league settings (real display names).
  const categoryLabels = ref<Map<string, CategoryLabel>>(new Map())
  const loading = ref(false)
  const loaded = ref(false)

  /**
   * Load real category names from Yahoo league settings.
   * Mirrors UnifiedSeasonView.vue:1338-1365 (same getLeagueSettings().stat_categories source).
   */
  async function loadCategoryLabels(leagueKey: string) {
    try {
      const { yahooService } = await import('@/services/yahoo')
      const settings = await yahooService.getLeagueSettings(leagueKey)
      // stat_categories can be an array, or wrapped as { stats: [...] }.
      const rawCats: any[] = settings?.stat_categories?.stats || settings?.stat_categories || []
      const map = new Map<string, CategoryLabel>()
      for (const cat of rawCats) {
        const s = cat?.stat || cat
        const sid = String(s?.stat_id ?? '')
        if (!sid) continue
        map.set(sid, {
          name: s?.display_name || s?.name || `Stat ${sid}`,
          label: s?.abbr || s?.display_name || s?.name || `S${sid}`
        })
      }
      categoryLabels.value = map
    } catch (e) {
      console.warn('[useFullSeasonCategoryData] Failed to load category labels:', e)
    }
  }

  /**
   * Fetch every completed week of category matchups and flatten into seasonMatchups.
   * Mirrors the multi-week getCategoryMatchups loop used by CategoryMatchupsView.vue:1438-1443,
   * but only collects the raw matchups (with stat_winners) — no derivation here.
   */
  async function loadSeasonMatchups(leagueKey: string) {
    const { yahooService } = await import('@/services/yahoo')
    const metadata = await yahooService.getLeagueMetadata(leagueKey)

    const startWeek = metadata.startWeek || 1
    // Include the active/current week as well as all prior weeks. If the season is
    // finished, currentWeek may sit past the last played week, so cap at endWeek.
    const lastWeek = metadata.isFinished
      ? (metadata.endWeek || metadata.currentWeek)
      : metadata.currentWeek

    const weekPromises: Promise<{ week: number; data: any[] }>[] = []
    for (let w = startWeek; w <= lastWeek; w++) {
      weekPromises.push(
        yahooService
          .getCategoryMatchups(leagueKey, w)
          .then((data) => ({ week: w, data }))
          .catch(() => ({ week: w, data: [] as any[] }))
      )
    }

    const allWeeks = await Promise.all(weekPromises)
    const flattened: any[] = []
    for (const wr of allWeeks) {
      for (const m of wr.data) {
        // Only keep weeks that actually decided categories.
        if (m?.stat_winners?.length) flattened.push(m)
      }
    }
    seasonMatchups.value = flattened
  }

  /**
   * Load both labels and full-season matchups for the given Yahoo category league.
   */
  async function load(leagueKey: string) {
    if (!leagueKey) return
    loading.value = true
    try {
      await Promise.all([loadCategoryLabels(leagueKey), loadSeasonMatchups(leagueKey)])
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  return { seasonMatchups, categoryLabels, loading, loaded, load }
}
