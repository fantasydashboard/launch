import { computed, onScopeDispose, ref, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { buildHockeyBoard, type HockeyBoardResult } from '@/hockey/hockeyBoard'
import { rulesFromEspnSettings, rulesProblem, type HockeyLeagueRules } from '@/hockey/hockeyLeague'
import type { HockeyProjection } from '@/hockey/hockeyValue'
import {
  parseDraftDetail, draftClock, teamNamesFromEspn, type HockeyDraftState,
} from '@/hockey/hockeyDraftSync'

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

/**
 * Every league read goes through the ESPN service, which goes through the Supabase proxy.
 *
 * This was a direct browser fetch to lm-api-reads, and that works for a PUBLIC league and
 * returns 401 for a private one — which is most leagues. The proxy is the only path that
 * carries espn_s2 and SWID, so it is the only path a private league survives. The
 * projections endpoint stays a plain fetch because it is ours and needs no credentials.
 */
async function espnViews(leagueId: string, season: number, views: string[]): Promise<any> {
  const { espnService } = await import('@/services/espn')
  const { useAuthStore } = await import('@/stores/auth')
  const { usePlatformsStore } = await import('@/stores/platforms')
  const authStore = useAuthStore()
  const platformsStore = usePlatformsStore()
  if (authStore.user?.id) await espnService.initialize(authStore.user.id)
  const creds = platformsStore.getEspnCredentials()
  if (creds) espnService.setCredentials(creds.espn_s2, creds.swid)
  return espnService.getRawLeagueViews('hockey', leagueId, season, views)
}

export function useHockeyBoard() {
  const leagueStore = useLeagueStore()

  const loading = ref(false)
  /** Why there is no board. Empty when there is one. */
  const problem = ref('')
  const rules = ref<HockeyLeagueRules | null>(null)
  const result = ref<HockeyBoardResult | null>(null)

  /** Players taken by hand, in mock mode. */
  const mockDrafted = ref<Set<string>>(new Set())

  /* ── live draft ─────────────────────────────────────────────────────────────────────
     Off by default and never turned on for the user. A board that started polling ESPN on
     its own would look identical to a mock board right up until it removed a player nobody
     in THIS room had taken. */
  const live = ref(false)
  const liveState = ref<HockeyDraftState | null>(null)
  const liveError = ref('')
  const lastSyncedAt = ref(0)
  const myTeamId = ref<number | null>(null)
  const teamNames = ref<Record<number, string>>({})
  let timer: ReturnType<typeof setInterval> | null = null

  /**
   * Who is off the board.
   *
   * In live mode the draft is the authority and hand-taken players are ignored, because two
   * sources of truth for "is this player gone" is how a board ends up recommending somebody
   * who was taken four picks ago.
   */
  const drafted = computed(() => (live.value && liveState.value ? liveState.value.drafted : mockDrafted.value))

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
      const [projRes, settings] = await Promise.all([
        fetch(`${PROJECTIONS_URL}?season=${season.value}`),
        espnViews(leagueId.value, season.value, ['mSettings']).catch(() => null),
      ])

      if (!projRes.ok) {
        problem.value = `Could not load projections (${projRes.status}).`
        return
      }
      if (!settings?.settings) {
        /* The proxy carries the cookies, so reaching here means we do not have them — a
           private league whose ESPN connection was never set up. Saying which beats a generic
           failure, because the fix is different from a retry. */
        problem.value = 'ESPN would not share this league\'s settings. A private league needs the ESPN connection set up first — connect ESPN, then reload.'
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

      const r = rulesFromEspnSettings(settings, leagueId.value, season.value)
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

  /* No-ops in live mode rather than silent writes to a set nothing reads — the surface hides
     these controls there, and this is the second line of defence. */
  function take(playerKey: string) {
    if (!playerKey || live.value) return
    mockDrafted.value = new Set([...mockDrafted.value, playerKey])
  }
  function undo(playerKey: string) {
    if (live.value) return
    const next = new Set(mockDrafted.value)
    next.delete(playerKey)
    mockDrafted.value = next
  }
  function reset() { if (!live.value) mockDrafted.value = new Set() }

  /** One read of the draft feed. Never writes: ESPN's pick endpoints are not ours to call. */
  async function syncDraft() {
    if (!leagueId.value) return
    try {
      const payload = await espnViews(leagueId.value, season.value, ['mDraftDetail'])
      const next = parseDraftDetail(payload)
      if (!next.picks.length) {
        /* An empty schedule is not an empty draft — ESPN publishes all 176 rows before the
           first pick. No rows means we did not really read the league. Keeping the last good
           state rather than emptying the board on one bad poll. */
        liveError.value = 'ESPN returned no draft for this league yet.'
        return
      }
      liveError.value = ''
      liveState.value = next
      lastSyncedAt.value = Date.now()
    } catch (e: any) {
      liveError.value = `Could not read the draft: ${e?.message ?? e}`
    }
  }

  function stopPolling() {
    if (timer) { clearInterval(timer); timer = null }
  }

  /*
   * Eight seconds. A pick clock is measured in minutes, so this is comfortably inside the
   * window where a drafter sees a pick land before it matters, and it is 450 requests an hour
   * against an endpoint that answers in 40KB — small enough not to be rude, frequent enough
   * to be worth having.
   */
  const POLL_MS = 8000

  async function goLive() {
    live.value = true
    await Promise.all([syncDraft(), loadTeamNames()])
    stopPolling()
    timer = setInterval(syncDraft, POLL_MS)
  }

  function goMock() {
    live.value = false
    stopPolling()
    liveState.value = null
    liveError.value = ''
  }

  async function loadTeamNames() {
    if (!leagueId.value || Object.keys(teamNames.value).length) return
    try {
      teamNames.value = teamNamesFromEspn(await espnViews(leagueId.value, season.value, ['mTeam']))
    } catch { /* names are a nicety; the board works without them */ }
  }

  /* A draft that has finished has nothing left to poll. */
  watch(() => liveState.value?.complete, (done) => { if (done) stopPolling() })

  onScopeDispose(stopPolling)

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
    // live draft
    live, liveError, liveState, lastSyncedAt, myTeamId, teamNames,
    goLive, goMock, syncDraft,
    clock: computed(() => draftClock(liveState.value ?? { inProgress: false, complete: false, picks: [], drafted: new Set() }, myTeamId.value)),
  }
}
