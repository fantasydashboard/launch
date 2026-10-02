/**
 * One hockey category league, in the shape the shared category machinery expects.
 *
 * WHY IT IS SHARED. The League page and the Trades page each assemble a pool, a category list
 * and a set of specs from scratch, and both had to learn hockey. Two copies of that join is two
 * chances to answer "how good is this roster" differently on two tabs of the same app — which is
 * the failure the engine comment warns about for the generator and the analyzer. One source,
 * used by both.
 *
 * THE TRICK THAT MAKES THE EXISTING ENGINE WORK. `toEffectiveStats` takes a player's raw stats,
 * prefers a FanGraphs value where one exists, and extrapolates counting stats by the fraction of
 * the season played. With no FanGraphs projection and a season fraction of 1 it returns the raw
 * stats untouched — so handing it a pool whose "raw" stats are ALREADY the NHL feed's projected
 * season totals makes every downstream consumer correct without a parallel engine. That is why
 * `seasonFraction` below is 1 and not the real figure: the numbers are projections already, and
 * dividing a projection by the fraction of the season played would project it twice.
 */
import { computed, type Ref } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useHockeyValue } from '@/composables/useHockeyValue'
import { platformFromLeagueId } from '@/hockey/platformFromLeagueId'
import { hockeyCatSpecs, hockeyProjectionCoverage, type HockeyRosterPlayer } from '@/hockey/hockeyTeamTotals'
import type { CatSpec } from '@/myteam/types'

export interface HockeyPoolPlayer {
  playerKey: string
  name: string
  position: string
  teamKey: string
  proTeam?: string
  headshot?: string
  onIL?: boolean
  status?: string
  /** The NHL feed's projected season totals, keyed by unified stat key. */
  stats: Record<string, number>
}

/**
 * @param rawPool the league's rostered players, from whichever platform composable loaded them.
 */
export function useHockeyCategoryLeague(rawPool: Ref<HockeyRosterPlayer[]>) {
  const leagueStore = useLeagueStore()

  const isHockey = computed(() => leagueStore.activeSport === 'hockey')
  const platform = computed(() => platformFromLeagueId(leagueStore.activeLeagueId))
  /* ESPN wants the bare numeric id dug out of our composite key; Yahoo wants the key whole.
     Sending one to the other's endpoint resolves to nothing, and a league with no settings has
     no columns. */
  const leagueId = computed(() => {
    const raw = String(leagueStore.activeLeagueId ?? '')
    if (platform.value === 'yahoo') return raw
    const parts = raw.split('_')
    return parts.length >= 4 && parts[0] === 'espn' ? parts[2] : ''
  })
  const season = computed(() => {
    const parts = String(leagueStore.activeLeagueId ?? '').split('_')
    const fromKey = parts.length >= 4 ? parseInt(parts[3], 10) : NaN
    if (Number.isFinite(fromKey) && fromKey > 2000) return fromKey
    const now = new Date()
    return now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear()
  })
  /* Sleeper has no hockey, and falls out of this on the id shape rather than on a name check. */
  const serves = computed(() => isHockey.value && !!leagueId.value && platform.value !== 'sleeper')

  const hockeyValue = useHockeyValue({
    leagueId,
    platform,
    season,
    enabled: serves,
    weeksLeft: computed(() =>
      Math.max(1, Math.round(26 * (1 - (leagueStore.seasonFractionComplete ?? 0))))),
  })

  /** The league's columns, from its own settings. */
  const catSpecs = computed<CatSpec[]>(() =>
    serves.value ? hockeyCatSpecs(hockeyValue.categories.value) : [])

  /** Rostered players carrying their projected season totals as `stats`. */
  const pool = computed<HockeyPoolPlayer[]>(() => {
    if (!serves.value) return []
    return rawPool.value.map((p) => {
      const proj = hockeyValue.projectionOf.value(p)
      return {
        ...(p as HockeyPoolPlayer),
        /* A player nobody projected keeps an EMPTY line rather than zeroes. Zeroes are a claim
           that he will do nothing; an empty line is the truth, that we do not know, and the
           value code already drops a player who scores in no column. */
        stats: proj?.stats ?? {},
        position: proj?.position || (p as HockeyPoolPlayer).position || '',
      }
    })
  })

  const coverage = computed(() =>
    serves.value ? hockeyProjectionCoverage({
      roster: rawPool.value,
      projectionFor: (x) => hockeyValue.projectionOf.value(x),
    }) : 0)

  /** A hockey statId IS the column's name ('G', 'SVPCT'); there is nothing to look up. */
  const labelOf = (statId: string) => statId

  return {
    serves,
    pool,
    catSpecs,
    labelOf,
    coverage,
    categories: hockeyValue.categories,
    loading: hockeyValue.loading,
    load: hockeyValue.load,
    projectionOf: hockeyValue.projectionOf,
  }
}
