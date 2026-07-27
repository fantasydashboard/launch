import { ref, type Ref } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { buildDraftReport } from '@/draft/report/buildDraftReport'
import type { DraftReport } from '@/draft/report/types'
import { loadEspnPointsDraft } from '@/draft/report/loadEspnPointsDraft'
import { loadYahooPointsDraft } from '@/draft/report/loadYahooPointsDraft'
import { loadSleeperPointsDraft } from '@/draft/report/loadSleeperPointsDraft'
import { loadYahooCategoryDraft } from '@/draft/report/loadYahooCategoryDraft'
import type { GradedDraft } from '@/draft/report/types'

export function useDraftReport(): {
  report: Ref<DraftReport | null>
  loading: Ref<boolean>
  error: Ref<'no-data' | 'failed' | null>
  load: (args: { platform: string; seasonKey: string; sport: string; season: number; isCategory?: boolean }) => Promise<void>
} {
  const leagueStore = useLeagueStore()
  const report = ref<DraftReport | null>(null)
  const loading = ref(false)
  const error = ref<'no-data' | 'failed' | null>(null)
  // Monotonic token so a slower earlier load (rapid season-switching, or a league switch racing an
  // in-flight prior-league load) can't overwrite a newer one's result.
  let loadToken = 0

  async function load(args: { platform: string; seasonKey: string; sport: string; season: number; isCategory?: boolean }) {
    const token = ++loadToken
    loading.value = true
    error.value = null
    report.value = null
    try {
      let draft: GradedDraft | null = null
      if (args.platform === 'espn') {
        draft = await loadEspnPointsDraft({ sport: args.sport, leagueId: args.seasonKey, season: args.season })
      } else if (args.platform === 'yahoo') {
        draft = args.isCategory
          ? await loadYahooCategoryDraft({ leagueKey: args.seasonKey, sport: args.sport })
          : await loadYahooPointsDraft({ leagueKey: args.seasonKey, sport: args.sport })
      } else if (args.platform === 'sleeper') {
        draft = await loadSleeperPointsDraft({
          season: args.season,
          currentUserId: leagueStore.currentUserId ?? null,
          sport: args.sport,
        })
      }
      if (token !== loadToken) return // a newer load started — discard this stale result
      if (!draft || !draft.picks.length) {
        error.value = 'no-data'
        return
      }
      report.value = buildDraftReport(draft, args.season)
    } catch (e) {
      if (token !== loadToken) return
      console.error('[useDraftReport] load failed', e)
      error.value = 'failed'
    } finally {
      if (token === loadToken) loading.value = false
    }
  }

  return { report, loading, error, load }
}
