import { computed, ref, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { buildHockeyBoard, type HockeyBoardResult } from '@/hockey/hockeyBoard'
import { rulesFromEspnSettings, rulesProblem, type HockeyLeagueRules } from '@/hockey/hockeyLeague'
import type { HockeyProjection } from '@/hockey/hockeyValue'

/**
 * A hockey draft board for the active ESPN league.
 *
 * TWO FETCHES, AND ONLY ONE OF THEM GOES THROUGH US. The projections come from our own
 * endpoint because ESPN's game-level player feed answers with 34MB and cannot be narrowed at
 * the source; api/hockey-projections does that reduction and returns about 64KB. The league's
 * settings come straight from ESPN, because that endpoint is small and ESPN reflects the
 * Origin header, so a proxy would add a hop and nothing else.
 *
 * NOTHING IS INVENTED WHEN A FETCH FAILS. An empty board with a stated reason is the outcome
 * of every failure path here. The alternative — a board built on default scoring, or on a
 * guessed team count — looks identical to a real one, and a reader has no way to tell which
 * they are holding.
 */

const PROJECTIONS_URL = '/api/hockey-projections'
const ESPN_LEAGUE = 'https://lm-api-reads.fantasy.espn.com/apis/v3/games/fhl/seasons'

export function useHockeyBoard() {
  const leagueStore = useLeagueStore()

  const loading = ref(false)
  /** Why there is no board. Empty when there is one. */
  const problem = ref('')
  const rules = ref<HockeyLeagueRules | null>(null)
  const result = ref<HockeyBoardResult | null>(null)

  /** Players taken so far. Local to this session — a mock draft, not a synced one. */
  const drafted = ref<Set<string>>(new Set())

  const projections = ref<Record<string, HockeyProjection>>({})
  const namesByKey = ref<Record<string, string>>({})

  const isHockey = computed(() => leagueStore.activeSport === 'hockey')
  const isEspn = computed(() => leagueStore.activePlatform === 'espn')
  const leagueId = computed(() => String(leagueStore.activeLeagueId ?? ''))

  /**
   * The season ESPN names this one by.
   *
   * An NHL season is labelled for the year it ENDS, so 2026-27 is season 2027. Deriving it
   * from the league's own record when there is one, because a league carried over from last
   * year would otherwise be asked for a season it does not have.
   */
  const season = computed(() => {
    const saved = leagueStore.allLeagues?.find((l: any) => String(l.league_id) === leagueId.value)
    const fromLeague = Number((saved as any)?.season)
    if (Number.isFinite(fromLeague) && fromLeague > 2000) return fromLeague
    const now = new Date()
    // Before July the current season is still the one that ends this year.
    return now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear()
  })

  async function load() {
    if (!isHockey.value) { problem.value = 'This board is for hockey leagues.'; return }
    if (!isEspn.value) {
      problem.value = 'Hockey currently reads ESPN leagues. Yahoo is waiting on API access.'
      return
    }
    if (!leagueId.value) { problem.value = 'No league selected.'; return }

    loading.value = true
    problem.value = ''
    try {
      const [projRes, settingsRes] = await Promise.all([
        fetch(`${PROJECTIONS_URL}?season=${season.value}`),
        fetch(`${ESPN_LEAGUE}/${season.value}/segments/0/leagues/${leagueId.value}?view=mSettings`),
      ])

      if (!projRes.ok) {
        problem.value = `Could not load projections (${projRes.status}).`
        return
      }
      if (!settingsRes.ok) {
        /* A private league needs ESPN cookies, which this direct call does not carry. Saying
           so beats a generic failure, because the fix is different from a retry. */
        problem.value = settingsRes.status === 401 || settingsRes.status === 403
          ? 'ESPN would not share this league\'s settings. Private leagues need the ESPN connection set up first.'
          : `Could not load league settings (${settingsRes.status}).`
        return
      }

      const proj = await projRes.json()
      const parsed: Record<string, HockeyProjection> = {}
      const names: Record<string, string> = {}
      for (const p of proj?.players ?? []) {
        parsed[p.playerKey] = { playerKey: p.playerKey, position: p.position, stats: p.stats ?? {} }
        names[p.playerKey] = p.name
      }
      projections.value = parsed
      namesByKey.value = names

      const r = rulesFromEspnSettings(await settingsRes.json(), leagueId.value, season.value)
      const why = rulesProblem(r)
      if (why) { problem.value = why; rules.value = null; return }
      rules.value = r
    } catch (e: any) {
      problem.value = `Could not build the board: ${e?.message ?? e}`
    } finally {
      loading.value = false
    }
  }

  /* Rebuilt whenever a player is taken, which is what makes this a draft board rather than a
     ranking — replacement level moves as the pool empties. */
  watch(
    [rules, projections, drafted],
    () => {
      if (!rules.value || !Object.keys(projections.value).length) { result.value = null; return }
      result.value = buildHockeyBoard({
        projections: projections.value,
        rules: rules.value,
        namesByKey: namesByKey.value,
        drafted: drafted.value,
      })
    },
    { deep: true, immediate: true },
  )

  function take(playerKey: string) {
    if (!playerKey) return
    drafted.value = new Set([...drafted.value, playerKey])
  }
  function undo(playerKey: string) {
    const next = new Set(drafted.value)
    next.delete(playerKey)
    drafted.value = next
  }
  function reset() { drafted.value = new Set() }

  watch([isHockey, isEspn, leagueId], () => { if (isHockey.value && isEspn.value && leagueId.value) load() }, { immediate: true })

  return {
    loading, problem, rules, result, drafted,
    rows: computed(() => result.value?.rows ?? []),
    replacement: computed(() => result.value?.replacement ?? {}),
    unnamedScoredStatIds: computed(() => result.value?.unnamedScoredStatIds ?? []),
    /* Points and categories are not the same board with different numbers on it — the second
       column means a different thing in each, so the surface has to know which it is. */
    mode: computed(() => result.value?.mode ?? 'points'),
    categoryKeys: computed(() => result.value?.categoryKeys ?? []),
    perCategoryByKey: computed(() => result.value?.perCategoryByKey ?? {}),
    load, take, undo, reset,
  }
}
