import { computed, ref, watch, type ComputedRef } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { leagueShape, type Cadence, type LeagueShape } from '@/league/leagueShape'

/**
 * Resolves the active league's shape (cadence + scoring) from state the store already holds.
 * Does not fetch anything.
 *
 * `scoring_type` hides in three places — Yahoo's array-wrapped league object, `currentLeague`,
 * and `savedLeagues` — mirroring `isRotoLeague` in App.vue so there is one lookup order, not two.
 *
 * `rosterLocktimeType` is not yet carried by the league store, so it is passed as `undefined`
 * here and the resolver falls back to `source: 'default'`. That is the designed behaviour.
 */
function getScoringType(leagueStore: ReturnType<typeof useLeagueStore>): string | undefined {
  const yahooLeagueData = Array.isArray(leagueStore.yahooLeague)
    ? leagueStore.yahooLeague[0]
    : leagueStore.yahooLeague
  if (yahooLeagueData?.scoring_type) return yahooLeagueData.scoring_type
  // currentLeague is typed as SleeperLeague, which doesn't declare scoring_type — the same gap
  // isRotoLeague hits in App.vue. Cast rather than let it grow the app-wide vue-tsc error count.
  const current = leagueStore.currentLeague as any
  if (current?.scoring_type) return current.scoring_type
  const saved = leagueStore.savedLeagues?.find((l: any) => l.league_id === leagueStore.activeLeagueId)
  if (saved?.scoring_type) return saved.scoring_type
  return undefined
}

function storageKey(leagueId: string | null): string {
  return `ufd:cadence:${leagueId ?? 'none'}`
}

function readManualCadence(leagueId: string | null): Cadence | null {
  try {
    const raw = localStorage.getItem(storageKey(leagueId))
    return raw === 'daily' || raw === 'weekly' ? raw : null
  } catch {
    return null
  }
}

function writeManualCadence(leagueId: string | null, cadence: Cadence | null): void {
  try {
    if (cadence === null) {
      localStorage.removeItem(storageKey(leagueId))
    } else {
      localStorage.setItem(storageKey(leagueId), cadence)
    }
  } catch {
    // Private windows throw on localStorage access — the override just doesn't persist.
  }
}

export function useLeagueShape(): {
  shape: ComputedRef<LeagueShape>
  setCadence: (cadence: Cadence | null) => void
} {
  const leagueStore = useLeagueStore()

  // A ref, not a re-read of localStorage inside the computed: localStorage isn't reactive, so
  // setCadence would otherwise write the override and nothing downstream would notice.
  const manualCadence = ref<Cadence | null>(readManualCadence(leagueStore.activeLeagueId))

  watch(
    () => leagueStore.activeLeagueId,
    (leagueId) => {
      manualCadence.value = readManualCadence(leagueId)
    }
  )

  const shape = computed<LeagueShape>(() =>
    leagueShape({
      sport: leagueStore.activeSport,
      scoringType: getScoringType(leagueStore),
      rosterLocktimeType: undefined,
      manualCadence: manualCadence.value,
    })
  )

  function setCadence(cadence: Cadence | null): void {
    writeManualCadence(leagueStore.activeLeagueId, cadence)
    manualCadence.value = cadence
  }

  return { shape, setCadence }
}
