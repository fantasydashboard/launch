import { computed, onScopeDispose, ref, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { buildHockeyBoard, type HockeyBoardResult } from '@/hockey/hockeyBoard'
import { rulesFromEspnSettings, rulesProblem, type HockeyLeagueRules } from '@/hockey/hockeyLeague'
import { rulesFromManual, type ManualLeagueInput } from '@/hockey/manualRules'
import type { HockeyProjection } from '@/hockey/hockeyValue'
import {
  parseDraftDetail, draftClock, teamNamesFromEspn, type HockeyDraftState,
} from '@/hockey/hockeyDraftSync'
import {
  draftPosition, fillRoster, positionsStillNeeded, slotsBeforeMyPick, type DraftKind,
} from '@/hockey/hockeyDraftPlan'
import { buildDraftGrid, type GridPick } from '@/draft/room/draftGrid'
import { buildHockeyVona } from '@/hockey/hockeyVona'
import { createLedgerEngine } from '@/hockey/categoryLedger'
import { buildCategoryMarginal } from '@/hockey/categoryMarginal'
import { applyRankingOrder } from '@/draft/room/customRankings'
import { useCustomRankings } from '@/composables/useCustomRankings'
import { suggestPunts } from '@/hockey/puntAdvisor'
import { picksByTeamFromOrder } from '@/hockey/picksByTeam'
import { loadNhlFeed } from '@/composables/useNhlFeed'
import { mergeHockeyProjections } from '@/hockey/hockeyProjectionSource'
import { draftSyncStatus, draftPicks, enableDraftSync as requestDraftSync, resetDraftSync, type DraftSyncStatus } from '@/services/draftExtension'
import { matchPicks } from '@/draft/extensionPicks'
import { draftedFrom } from '@/hockey/draftedFrom'

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

  /**
   * Players taken by hand, IN PICK ORDER.
   *
   * An array rather than a set, because order is the whole input to the local draft: pick
   * number, whose turn it is and which of the picks were yours all come out of the sequence.
   * A set threw that away and left the board unable to say anything except who was gone.
   */
  const mockOrder = ref<string[]>([])

  /**
   * Players the EXTENSION read out of the draft room, kept apart from hand-marked picks.
   *
   * Its own list because it is its own source with its own authority. The extension did not
   * infer these: it read a SELECTED frame off the draft socket, carrying ESPN's own player id.
   * So it can only ever add somebody who is genuinely gone, which is why these count in live
   * mode as well as mock — see `drafted`.
   */
  const extensionOrder = ref<string[]>([])

  /* Your seat in the order, ONE-based to match pickOrder and the grid. Null until set — the
     clock works without it, and everything about YOUR draft stays silent rather than
     guessing a slot. */
  const mySlot = ref<number | null>(null)
  const draftKind = ref<DraftKind>('snake')

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
  /**
   * Whether ESPN has actually published who was drafted.
   *
   * NOT `picks.length`. ESPN publishes all 220 pick ROWS before a draft begins, every one of
   * them empty, so a length check is true the entire time and says nothing. It is the reason
   * the clock sat on "Pick 1" through fifty real picks while the board beside it correctly
   * read "49 of 220 gone" — the rows existed, the picks did not.
   *
   * `drafted` is only populated by rows that actually name a player, so it answers the
   * question the surfaces are really asking: does ESPN know this draft's order, or are we the
   * only ones who do?
   */
  const espnHasSequence = computed(() => !!liveState.value?.drafted?.size)

  const drafted = computed(() => draftedFrom({
    live: live.value,
    liveDrafted: liveState.value?.drafted ?? null,
    handMarked: mockOrder.value,
    fromExtension: extensionOrder.value,
  }))

  /**
   * Columns this manager is conceding. Category leagues only.
   *
   * Local to the session and to this manager — it is a statement about the team you are
   * building, not about the league, so it is never written anywhere shared.
   */
  const punted = ref<Set<string>>(new Set())

  const allProjections = ref<Record<string, HockeyProjection>>({})
  /* Narrowed to ESPN's universe only while a live draft is being followed — see
     loadProjections for why that is the one mode where it matters. */
  const projections = computed<Record<string, HockeyProjection>>(() => (
    live.value
      ? Object.fromEntries(Object.entries(allProjections.value).filter(([k]) => !k.startsWith('nhl:')))
      : allProjections.value
  ))
  const namesByKey = ref<Record<string, string>>({})
  /* The team each player is on, so the board can show a crest. buildHockeyBoard has accepted
     this since it was written and nothing ever passed it, so `proTeam` was always undefined. */
  const teamsByKey = ref<Record<string, string>>({})

  const isHockey = computed(() => leagueStore.activeSport === 'hockey')
  const isEspn = computed(() => leagueStore.activePlatform === 'espn')

  /**
   * Parse an ESPN league key: `espn_{sport}_{leagueId}_{season}`.
   *
   * THE ACTIVE LEAGUE ID IS NOT A LEAGUE ID. It is a composite key, and this file read it as
   * though it were the bare ESPN number — so every request went out for a league called
   * "espn_hockey_106222043_2027" and ESPN answered 400. Six other composables in this
   * codebase already parse this format; this one invented its own reading of the same field
   * and was wrong.
   *
   * The key also CARRIES THE SEASON, which is better than deriving one: it is what the league
   * was actually saved under, so there is no guessing about whether hockey names a season for
   * the year it starts or ends.
   */
  function parseEspnKey(key: string): { leagueId: string; season: number } | null {
    const parts = String(key || '').split('_')
    if (parts.length < 4 || parts[0] !== 'espn') return null
    const season = parseInt(parts[3], 10)
    return { leagueId: parts[2], season: Number.isFinite(season) ? season : 0 }
  }

  /**
   * A league pointed at directly, instead of the one connected to the account.
   *
   * ESPN answers league reads for a MOCK DRAFT with no credentials at all and reflects our
   * origin in its CORS headers, which makes a practice draft the one way to exercise this
   * board end to end before the night that counts. Verified against a live mock on
   * 2026-09-20: 200 on `mSettings` and `mDraftDetail`, 220 pick rows published before a
   * single pick was made. Connecting a throwaway league to see it would be the wrong trade,
   * so the URL is enough.
   */
  /*
   * Rules stated by hand, which is what makes this board portable.
   *
   * Everything it needs from a platform is these eight settings: projections are ours and
   * picks are marked by the user. Yahoo refuses anonymous reads outright — 401 on every
   * endpoint, no public-league exception — so the paste-a-URL path that works for ESPN cannot
   * be built for it at any price. Typing the rules can, and it serves a Sleeper league or a
   * private ESPN one just as well.
   *
   * Kept in localStorage because the thing this is for is draft night: a reload at the wrong
   * moment should not cost somebody their settings while the clock is running.
   */
  const MANUAL_KEY = 'ufd:hockey:manualRules'
  /*
   * AND THE DRAFT ITSELF, FOR THE SAME REASON THE RULES ARE.
   *
   * The comment above says a reload at the wrong moment should not cost somebody their
   * settings while the clock is running. It protected half the state. On 2026-09-27 a reload
   * mid-draft cost a live draft every pick on the board: the rules came back, the picks did
   * not, and the extension only ever sends what happens AFTER it reconnects — there is no
   * backfill, so nothing could restore them but typing forty names by hand.
   *
   * Scoped per league and season, because a key that outlived the draft would cross off
   * players in next week's league. Dropped after a day for the same reason: a draft does not
   * run for two.
   */
  const DRAFT_KEY = 'ufd:hockey:draftState'
  const DRAFT_TTL_MS = 24 * 60 * 60 * 1000

  interface StoredDraft {
    scope: string
    at: number
    mockOrder: string[]
    extensionOrder: string[]
    mySlot: number | null
    myTeamId: number | null
  }

  function readDraft(): StoredDraft | null {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return null
      const v = JSON.parse(raw) as StoredDraft
      if (!v || typeof v.scope !== 'string') return null
      if (!Number.isFinite(v.at) || Date.now() - v.at > DRAFT_TTL_MS) return null
      return v
    } catch { return null }
  }
  const manual = ref<ManualLeagueInput | null>(readManual())
  function readManual(): ManualLeagueInput | null {
    try {
      const raw = localStorage.getItem(MANUAL_KEY)
      return raw ? (JSON.parse(raw) as ManualLeagueInput) : null
    } catch { return null }
  }
  function setManualRules(next: ManualLeagueInput | null) {
    manual.value = next
    try {
      if (next) localStorage.setItem(MANUAL_KEY, JSON.stringify(next))
      else localStorage.removeItem(MANUAL_KEY)
    } catch { /* private mode — the board still works for this session */ }
    resolvedSeason.value = 0
    mockOrder.value = []
    load()
  }

  const override = ref<{ leagueId: string; season: number } | null>(null)
  function setLeagueOverride(next: { leagueId: string; season: number } | null) {
    if (next?.leagueId === override.value?.leagueId
      && next?.season === override.value?.season) return
    override.value = next
    resolvedSeason.value = 0
    mockOrder.value = []
    /*
     * A different league is a different draft, so the slate is wiped on BOTH sides — the
     * board's own list and the extension's. Without this, pointing the board at tonight's
     * league while this afternoon's mock is still in the extension's session crosses off
     * players who are not gone, and nothing on screen says anything is wrong.
     */
    extensionOrder.value = []
    unplacedPicks.value = 0
    clearDraft()
    restoredScope = ''
    void resetDraftSync()
    if (!next) { goMock(); load(); return }
    /*
     * "Track it" means track it. Loading the league and then sitting in mock mode is the
     * gesture doing half of what it says — the board filled with the right league and never
     * polled, which reads as a draft where nothing is happening rather than as a board that
     * was never listening.
     */
    load()
    goLive()
  }

  const activeKey = computed(() => String(leagueStore.activeLeagueId ?? ''))
  /* A bare id is still honoured: not every stored league is guaranteed to use the composite
     form, and falling back costs nothing. */
  const leagueId = computed(() =>
    override.value?.leagueId || parseEspnKey(activeKey.value)?.leagueId || activeKey.value)

  /** The season a retry actually succeeded at, so every later fetch uses the same one. */
  const resolvedSeason = ref(0)

  /* One draft is one league in one season. Mock mode gets its own scope so a mock never
     crosses players off a real board, which is the failure setLeagueOverride already guards. */
  const draftScope = computed(() => `${leagueId.value || 'mock'}:${resolvedSeason.value || 0}`)

  let restoredScope = ''
  function saveDraft() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        scope: draftScope.value,
        at: Date.now(),
        mockOrder: mockOrder.value,
        extensionOrder: extensionOrder.value,
        mySlot: mySlot.value,
        myTeamId: myTeamId.value,
      } satisfies StoredDraft))
    } catch { /* private mode — the board still works for this session */ }
  }
  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY) } catch { /* nothing to clear */ }
  }

  /*
   * Restore once per scope, and only into an EMPTY board.
   *
   * Writing stored picks over a board the extension has already populated would double-count
   * the reconnect: the extension re-sends what it can see, and a blind merge crosses off
   * players twice and corrupts the pick sequence the clock reads.
   */
  watch([draftScope, rules], () => {
    if (!rules.value || restoredScope === draftScope.value) return
    const v = readDraft()
    restoredScope = draftScope.value
    if (!v || v.scope !== draftScope.value) return
    if (mockOrder.value.length || extensionOrder.value.length) return
    mockOrder.value = v.mockOrder ?? []
    extensionOrder.value = v.extensionOrder ?? []
    if (mySlot.value === null && typeof v.mySlot === 'number') mySlot.value = v.mySlot
    if (myTeamId.value === null && typeof v.myTeamId === 'number') myTeamId.value = v.myTeamId
  }, { immediate: true })

  /* Every mutation, not a save button: the state worth keeping is the state as it stands when
     the tab dies, and nobody presses save while they are on the clock. */
  watch([mockOrder, extensionOrder, mySlot, myTeamId], () => {
    if (restoredScope === draftScope.value) saveDraft()
  }, { deep: true })

  /**
   * The season ESPN names this one by.
   *
   * The league key first, because that is what the league was saved under. Failing that, an
   * NHL season is labelled for the year it ENDS, so 2026-27 is season 2027.
   */
  const season = computed(() => {
    if (override.value?.season) return override.value.season
    if (resolvedSeason.value) return resolvedSeason.value
    const fromKey = parseEspnKey(activeKey.value)?.season
    if (fromKey && fromKey > 2000) return fromKey
    const saved = leagueStore.allLeagues?.find((l: any) => String(l.league_id) === activeKey.value)
    const fromLeague = Number((saved as any)?.season)
    if (Number.isFinite(fromLeague) && fromLeague > 2000) return fromLeague
    const now = new Date()
    return now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear()
  })

  /** Saved season first, then the season this sport is really in. */
  function seasonsToTry(): number[] {
    const now = new Date()
    const sportCurrent = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear()
    return [...new Set([season.value, sportCurrent])]
  }

  async function loadSettings(): Promise<{ settings: any; why: string }> {
    const attempt = async (yr: number) => espnViews(leagueId.value, yr, ['mSettings'])

    let lastError = ''
    for (const yr of seasonsToTry()) {
      try {
        const payload = await attempt(yr)
        if (payload?.settings) {
          if (yr !== season.value) resolvedSeason.value = yr
          return { settings: payload, why: '' }
        }
        lastError = `ESPN returned no settings for season ${yr}.`
      } catch (e: any) {
        const msg = String(e?.message ?? e)
        lastError = msg
        /* Private and auth failures will not improve by asking for a different year, and
           retrying would bury the one message that names the actual fix. */
        if (msg.includes('403') || msg.includes('private')) {
          return { settings: null, why: 'This ESPN league is private. Connect ESPN on the Platforms page so we can read it, then reload.' }
        }
        if (msg.includes('401')) {
          return { settings: null, why: 'Your session expired. Sign out and back in, then reload.' }
        }
      }
    }
    return {
      settings: null,
      why: `ESPN has no hockey league ${leagueId.value} in season ${seasonsToTry().join(' or ')}. `
         + `Check the league id, or that it is a hockey league. (${lastError})`,
    }
  }

  /**
   * Projections, from the one source every hockey surface reads.
   *
   * This used to fetch ESPN's projection directly while the rankings page ran our own rate
   * model, so the two pages ranked the same players differently — the drift you notice by
   * checking a player on one page and then the other, with nothing to say which is right.
   * Now both read measured NHL rates over ESPN's expected games-played.
   *
   * ESPN-KEYED ROWS ONLY WHEN FOLLOWING AN ESPN DRAFT, and only then.
   *
   * In live mode the board learns who has been taken from ESPN's own draft feed, keyed by ESPN
   * player id. A skater the rate model knows and ESPN never listed has no such id, so he could
   * never be crossed off — he would sit in the available pool all night after somebody took
   * him, and showing a player you cannot remove is worse than not showing him.
   *
   * None of that is true when you are marking picks yourself. There is no feed to join
   * against: a pick is a name you type, and `take` will cross off any key it is handed. The
   * filter was applied to both paths, which cost a hand-marked draft the better part of six
   * hundred players to protect a join it was not using. Found the only way it could be —
   * somebody drafting, hunting for a player who was not there.
   */
  async function loadProjections(forSeason: number): Promise<string> {
    const feed = await loadNhlFeed(forSeason)
    if (!feed.espn.length) return 'Could not load projections.'
    const merged = mergeHockeyProjections({ espn: feed.espn, rates: feed.rates })
    allProjections.value = merged.projections
    namesByKey.value = merged.namesByKey
    teamsByKey.value = merged.teamByKey
    return ''
  }

  async function load() {
    resolvedSeason.value = 0
    if (!isHockey.value && !manual.value) { problem.value = 'This board is for hockey leagues.'; return }

    /*
     * Hand-entered rules answer everything a platform would have been asked, so nothing is
     * fetched from one. This is the only path a Yahoo league has.
     *
     * BUT THE PLATFORM WINS WHEN IT CAN ANSWER. Manual rules used to short-circuit this
     * unconditionally, so anyone who had ever typed rules kept them forever — including for an
     * ESPN league that reads perfectly. On 2026-09-27 that had a points league drafting off a
     * board priced in category standard deviations, under a banner that said, one line above,
     * that ESPN's settings had loaded. We read the truth and threw it away.
     *
     * Manual is now what it was always meant to be: the fallback for a league we cannot read.
     */
    if (manual.value && !isEspn.value) {
      loading.value = true
      problem.value = ''
      try {
        const r = rulesFromManual(manual.value)
        const why = rulesProblem(r)
        if (why) { problem.value = why; rules.value = null; return }
        const projProblem = await loadProjections(r.season)
        if (projProblem) { problem.value = projProblem; return }
        rules.value = r
      } catch (e: any) {
        problem.value = `Could not build the board: ${e?.message ?? e}`
      } finally {
        loading.value = false
      }
      return
    }

    if (!isEspn.value) {
      problem.value = 'Hockey reads ESPN leagues directly. For a Yahoo or Sleeper league, enter the rules by hand below.'
      return
    }
    if (!leagueId.value) { problem.value = 'No league selected.'; return }

    loading.value = true
    problem.value = ''
    try {
      // Still in parallel: the settings read is ESPN's and the projections are ours.
      const [projProblem, settingsResult] = await Promise.all([
        loadProjections(season.value),
        loadSettings(),
      ])

      if (projProblem) { problem.value = projProblem; return }
      const { settings, why: settingsProblem } = settingsResult
      if (!settings?.settings) {
        problem.value = settingsProblem
        return
      }

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

  /* Rebuilt whenever a player is taken. The rebuild is only half of what makes this a draft
     board rather than a ranking; the other half is that `drafted` reaches the replacement
     calculation, which for a while it did not — this comment claimed the levels moved and
     they did not budge. */
  /* 'draft' is the kind a draft board reads; the ROS kind drives the rankings page. */
  const draftRankings = useCustomRankings('draft')

  watch(
    [rules, projections, drafted, punted, () => draftRankings.activeId.value],
    () => {
      if (!rules.value || !Object.keys(projections.value).length) { result.value = null; return }
      const built = buildHockeyBoard({
        projections: projections.value,
        rules: rules.value,
        namesByKey: namesByKey.value,
        teamsByKey: teamsByKey.value,
        drafted: drafted.value,
        punted: punted.value,
      })

      /*
       * AN UPLOADED LIST RE-SEATS THE ORDER, AND KEEPS OUR VALUE CURVE.
       *
       * The same treatment football's wire gives it: the author's ORDER is adopted, our own
       * value slots are handed out in that order, and nothing is invented. Re-seating happens
       * inside a position, so a list that ranks forwards says nothing about goalies, and the
       * players it never mentions keep our order relative to each other below the ones it does.
       *
       * Without this the hockey draft board was the only board in the product that could not
       * read a list somebody had uploaded — the picker offered it and the board ignored it.
       */
      const rankByKey = draftRankings.match(
        built.rows.map((r) => ({ playerKey: r.playerKey, name: r.name, position: r.position })),
      ).rankByKey
      if (Object.keys(rankByKey).length) {
        const reseated = applyRankingOrder(
          built.rows.map((r) => ({ playerKey: r.playerKey, value: r.value, position: r.position })),
          rankByKey,
        )
        built.rows = built.rows
          .map((r) => ({ ...r, value: reseated[r.playerKey] ?? r.value }))
          .sort((a, b) => b.value - a.value)
      }
      result.value = built
    },
    { deep: true, immediate: true },
  )

  /* No-ops in live mode rather than silent writes to a set nothing reads — the surface hides
     these controls there, and this is the second line of defence. */
  /* ── live picks from the extension ───────────────────────────────────────────────────
   *
   * They land in mockOrder, the same place a hand-marked pick does, and that is the whole
   * design. The roster panel, the grid, VONA and "who is still on the board" all read from
   * there already, so none of them need to know a pick arrived by socket rather than by
   * keyboard — and marking one yourself keeps working alongside, with no mode to switch.
   *
   * ESPN sends its own player ids, which ARE our keys, so nothing is matched. A platform that
   * sends only a name goes through the matcher, which refuses to guess between two players
   * rather than crossing off the wrong one.
   */
  const syncStatus = ref<DraftSyncStatus | null>(null)
  /** Picks the extension delivered that this board could not place. See pullExtensionPicks. */
  const unplacedPicks = ref(0)
  let syncTimer: ReturnType<typeof setInterval> | null = null

  async function pullExtensionPicks() {
    const status = await draftSyncStatus()
    syncStatus.value = status
    if (!status.present || !status.enabled || !status.picks) return

    const raw = await draftPicks()
    const known = new Set(Object.keys(projections.value))
    const direct: string[] = []
    const needMatching: { playerName: string; position?: string; team?: string }[] = []
    /*
     * Picks that reached us and could not be placed: an id the board does not carry, and no
     * name to fall back on. Counted rather than dropped, because "synced 174" over a board
     * showing 140 crossed off is the difference between a working sync and a silently
     * lossy one, and only the second number is checkable against the room.
     */
    let unplaced = 0

    for (const p of raw) {
      if (p.playerKey && known.has(String(p.playerKey))) direct.push(String(p.playerKey))
      else if (p.playerName) needMatching.push({ playerName: p.playerName, position: p.position, team: p.team })
      else unplaced += 1
    }
    /*
     * An EMPTY board carries nobody, so every pick counts as unplaceable and the line reads
     * "174 the board doesn't carry" — which blames the picks for a board that has not loaded
     * a league yet. Only a real pool can tell us a pick is genuinely missing from it.
     */
    unplacedPicks.value = known.size ? unplaced : 0

    /* Only the named ones cost a match. ESPN's whole draft comes through `direct`. */
    const matched = needMatching.length
      ? matchPicks(needMatching, Object.entries(projections.value).map(([key, pr]) => ({
          playerKey: key,
          name: namesByKey.value[key] ?? '',
          position: pr.position,
          team: teamsByKey.value[key],
        }))).keys
      : []

    /* Appended in arrival order, never reordered, and never twice — a socket replays and a
       reconnect resends its backlog. */
    for (const key of [...direct, ...matched]) takeFromExtension(key)
  }

  /** Turn it on. The permission prompt is the consent and needs this click to appear. */
  async function enableSync(): Promise<boolean> {
    const ok = await requestDraftSync()
    if (ok) await pullExtensionPicks()
    return ok
  }

  function startSync() {
    if (syncTimer) return
    void pullExtensionPicks()
    /* Two seconds. A draft pick takes thirty, so this is fast enough to feel immediate and
       slow enough that the extension is not asked three hundred times a minute. */
    syncTimer = setInterval(() => { void pullExtensionPicks() }, 2000)
  }
  function stopSync() {
    if (syncTimer) { clearInterval(syncTimer); syncTimer = null }
  }

  function take(playerKey: string) {
    if (!playerKey || live.value) return
    if (mockOrder.value.includes(playerKey)) return
    mockOrder.value = [...mockOrder.value, playerKey]
  }

  /**
   * A pick the extension read, which lands in EITHER mode.
   *
   * Deliberately not `take`: that one refuses while live, because a hand-marked pick competing
   * with ESPN's own draft state is how a board ends up disagreeing with itself. This is the
   * other case — a pick read off the wire, with the platform's own id on it.
   *
   * It also joins `mockOrder`, which is the pick SEQUENCE — what drives the clock, the grid,
   * your roster and "picks until you're up".
   *
   * THAT USED TO BE SKIPPED IN LIVE MODE, on the reasoning that ESPN owns the sequence there.
   * ESPN does not: it publishes NOTHING while a draft runs, which is the entire reason this
   * extension exists. So in live mode nothing owned the sequence and mockOrder stayed empty —
   * the board crossed players off correctly, reported "49 of 220 gone", and still said "4
   * picks until you're up" and showed an empty roster through fifty picks.
   *
   * The real condition is whether ESPN has actually published a sequence, not which mode a
   * toggle is in. Once a draft ends and ESPN backfills its picks, liveState takes over and
   * this stops contributing.
   */
  function takeFromExtension(playerKey: string) {
    if (!playerKey) return
    if (!extensionOrder.value.includes(playerKey)) {
      extensionOrder.value = [...extensionOrder.value, playerKey]
    }
    if (!espnHasSequence.value && !mockOrder.value.includes(playerKey)) {
      mockOrder.value = [...mockOrder.value, playerKey]
    }
  }

  /*
   * Undo reaches the extension's list too, or it would not be an undo: the row would grey out
   * again within two seconds and look like a broken button rather than a refused one. If the
   * draft room really did take that player, the next poll puts him back — which is correct,
   * and is the board disagreeing with the click rather than with the draft.
   */
  function undo(playerKey: string) {
    if (live.value) return
    mockOrder.value = mockOrder.value.filter((k) => k !== playerKey)
    extensionOrder.value = extensionOrder.value.filter((k) => k !== playerKey)
  }
  /** Undo the last pick, which is the one a misclick actually needs. */
  function undoLast() {
    if (live.value) return
    const last = mockOrder.value[mockOrder.value.length - 1]
    mockOrder.value = mockOrder.value.slice(0, -1)
    if (last) extensionOrder.value = extensionOrder.value.filter((k) => k !== last)
  }
  function reset() {
    if (live.value) return
    mockOrder.value = []
    extensionOrder.value = []
  }

  /** Concede a column, or take it back. Re-prices the whole board either way. */
  function togglePunt(key: string) {
    const next = new Set(punted.value)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    punted.value = next
  }
  function clearPunts() { punted.value = new Set() }

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

  /** Your players, from whichever source knows: the live draft, or the order you marked. */
  function myPlayerKeys(): string[] {
    if (live.value && liveState.value) {
      if (myTeamId.value === null) return []
      return liveState.value.picks
        .filter((p) => p.teamId === myTeamId.value && p.playerKey)
        .map((p) => p.playerKey as string)
    }
    const pos = draftPosition(mockOrder.value.length, rules.value?.teams ?? 0, mySlot.value,
      rules.value?.rosterSize || 0, draftKind.value)
    const mine = new Set(pos.myPicks)
    return mockOrder.value.filter((_, i) => mine.has(i + 1))
  }

  /* A draft that has finished has nothing left to poll. */
  watch(() => liveState.value?.complete, (done) => { if (done) stopPolling() })

  onScopeDispose(stopPolling)

  /* An explicit league is its own permission to load: the sport/platform gates exist to stop
     a board firing for somebody's football league, and a pasted hockey URL is not that. */
  watch([isHockey, isEspn, leagueId], () => {
    if (!leagueId.value) return
    if (override.value || (isHockey.value && isEspn.value)) load()
  }, { immediate: true })

  /**
   * Every team's picks, by team id — the input the column ledger is built from.
   *
   * BOTH MODES, ONE ANSWER, for the same reason myPlayers needs one. A live ESPN draft labels
   * each pick with the team that made it; a draft being marked by hand knows only the ORDER,
   * so the seat is recovered from the pick number. Getting this from one source and not the
   * other would leave the ledger blank in whichever mode was forgotten, and a blank ledger
   * looks exactly like a league with nothing decided yet.
   */
  const picksByTeam = computed<Record<string, string[]>>(() => {
    const teams = rules.value?.teams ?? 0
    if (!teams) return {}
    const out: Record<string, string[]> = {}
    for (let i = 1; i <= teams; i++) out[String(i)] = []

    if (live.value && liveState.value) {
      for (const p of liveState.value.picks) {
        if (!p.playerKey) continue
        const id = String(p.teamId)
        out[id] = [...(out[id] ?? []), p.playerKey]
      }
      return out
    }
    /* The seat a hand-marked pick belongs to, which in a snake is not `i % teams`. The
       inline version here passed `{ kind }` to a helper whose field is `type`, so every
       snake draft was silently seated as linear. */
    return picksByTeamFromOrder(mockOrder.value, teams, draftKind.value)
  })

  /** Which entry in picksByTeam is mine. */
  const myLedgerTeamId = computed(() => {
    if (live.value && liveState.value && myTeamId.value !== null) return String(myTeamId.value)
    return mySlot.value !== null ? String(mySlot.value) : ''
  })

  const isCategoryBoard = computed(() =>
    (result.value?.mode ?? 'points') === 'categories' && !!rules.value?.categories.length)

  /* The engines only exist for a category league; a points board reads its own number. */
  const ledgerInput = computed(() => {
    const r = rules.value
    if (!isCategoryBoard.value || !r || !myLedgerTeamId.value) return null
    if (!Object.keys(projections.value).length) return null
    return {
      projections: projections.value,
      categories: r.categories,
      picksByTeam: picksByTeam.value,
      myTeamId: myLedgerTeamId.value,
      rosterSize: r.rosterSize || 0,
      slots: r.slots,
      punted: punted.value,
    }
  })

  /** Where I project to finish in every column — the scoreboard the format is played on. */
  const ledger = computed(() =>
    (ledgerInput.value ? createLedgerEngine(ledgerInput.value).ledger : []))

  /**
   * The board re-priced for THIS roster.
   *
   * Held back until a few picks are in. With an empty roster there is nothing to re-price
   * against — every team is the same pile of replacement bodies — so the raw category board
   * is both the honest answer and the better one. Switching at pick one would dress noise up
   * as personalisation.
   */
  const MARGINAL_FROM = 2
  const marginal = computed(() => {
    const input = ledgerInput.value
    if (!input) return []
    if ((input.picksByTeam[input.myTeamId] ?? []).length < MARGINAL_FROM) return []
    const available = (result.value?.rows ?? []).map((r) => r.playerKey)
    if (!available.length) return []
    return buildCategoryMarginal({ ...input, candidates: available, limit: 120 })
  })

  /** playerKey -> what he adds to my columns, for the board to sort and label by. */
  const marginalByKey = computed(() => {
    const m = new Map<string, number>()
    for (const r of marginal.value) m.set(r.playerKey, r.gain)
    return m
  })

  /** Columns worth conceding, each with the simulated argument for it. */
  const puntAdvice = computed(() => {
    const input = ledgerInput.value
    const r = rules.value
    if (!input || !r) return []
    const taken = (input.picksByTeam[input.myTeamId] ?? []).length
    const remaining = Math.max(0, (r.rosterSize || 0) - taken)
    if (!remaining) return []
    const available = (result.value?.rows ?? []).map((row) => row.playerKey)
    if (!available.length) return []
    return suggestPunts({
      ...input,
      candidates: available,
      picksRemaining: Math.min(remaining, 12),
      poolSize: 40,
      /* The room's own ADP, so the simulated board drains the way this league drafts. */
      marketOrder: [...(result.value?.rows ?? [])]
        .filter((row) => row.adp != null)
        .sort((a, b) => (a.adp as number) - (b.adp as number))
        .map((row) => row.playerKey),
    })
  })

  return {
    loading, problem, rules, result, drafted,
    ledger, marginal, marginalByKey, puntAdvice, picksByTeam,
    isCategoryBoard, override, setLeagueOverride,
    manual, setManualRules,
    /* Stored is not the same as in use: ESPN wins when it can be read, and the surface has to
       say which one the numbers came from rather than naming whichever exists. */
    manualInUse: computed(() => !!manual.value && !isEspn.value),
    rows: computed(() => result.value?.rows ?? []),
    replacement: computed(() => result.value?.replacement ?? {}),
    unnamedScoredStatIds: computed(() => result.value?.unnamedScoredStatIds ?? []),
    /* Points and categories are not the same board with different numbers on it — the second
       column means a different thing in each, so the surface has to know which it is. */
    mode: computed(() => result.value?.mode ?? 'points'),
    categoryKeys: computed(() => result.value?.categoryKeys ?? []),
    contestedKeys: computed(() => result.value?.contestedKeys ?? []),
    punted, togglePunt, clearPunts,
    perCategoryByKey: computed(() => result.value?.perCategoryByKey ?? {}),
    load, take, undo, undoLast, reset,
    // the local draft: everything below is derived from the order picks were marked in
    mockOrder, mySlot, draftKind,
    position: computed(() => draftPosition(
      mockOrder.value.length,
      rules.value?.teams ?? 0,
      mySlot.value,
      rules.value?.rosterSize || 0,
      draftKind.value,
    )),
    /**
     * The picks that landed on your seat, as player keys.
     *
     * BOTH MODES, ONE ANSWER. Marking picks yourself gives it by position in the order;
     * a finished ESPN draft gives it by team id. The roster panel should not care which —
     * it was only wired to the manual path, so selecting your team on a completed draft
     * showed the board and nothing about your own team.
     */
    myPlayers: computed(() => myPlayerKeys()),
    // live draft
    live, liveError, liveState, lastSyncedAt, myTeamId, teamNames,
    /* Whether ESPN owns the pick order, or we do. Surfaces must follow this, not `live`. */
    espnHasSequence,
    goLive, goMock, syncDraft,
    // extension-driven live picks
    syncStatus: computed(() => syncStatus.value),
    enableSync, startSync, stopSync, pullExtensionPicks,
    /** How many of the synced picks are actually crossed off, and how many were not placed. */
    extensionPicks: computed(() => extensionOrder.value.length),
    unplacedPicks: computed(() => unplacedPicks.value),
    roster: computed(() => {
      const players = myPlayerKeys()
        .map((k) => ({ playerKey: k, position: projections.value[k]?.position ?? '' }))
      return {
        ...fillRoster(players, rules.value?.slots ?? {}),
        needs: positionsStillNeeded(players, rules.value?.slots ?? {}),
      }
    }),
    /*
     * SURVIVAL AND VONA — what waiting actually costs.
     *
     * Only computed with a seat set and picks still to come: the whole quantity is "between
     * now and MY next turn", and without a seat there is no next turn to measure to. Five
     * hundred runs keeps it under a frame on a full board.
     */
    vona: computed(() => {
      const r = rules.value
      if (!r?.teams || mySlot.value === null) {
        return { survival: {}, vona: {}, expectedBest: {}, picksSimulated: 0 }
      }
      const pos = draftPosition(mockOrder.value.length, r.teams, mySlot.value,
        r.rosterSize || 0, draftKind.value)
      if (pos.myNextPick === null) {
        return { survival: {}, vona: {}, expectedBest: {}, picksSimulated: 0 }
      }
      const upcomingSlots = slotsBeforeMyPick(
        mockOrder.value.length, r.teams, mySlot.value, r.rosterSize || 0, draftKind.value,
      )
      return buildHockeyVona({
        rows: result.value?.rows ?? [],
        upcomingSlots,
        teams: r.teams,
      })
    }),
    /*
     * THE BOARD AS EVERYONE PICTURES IT: rounds down, teams across.
     *
     * Reusing the football room's grid rather than laying one out here — a column has to stay
     * the same team all the way down, and building rows in pick order instead puts a snake
     * round under the wrong names. That module already solved it and says so.
     */
    grid: computed(() => {
      const r = rules.value
      if (!r?.teams || !mockOrder.value.length) return []
      const picks: GridPick[] = mockOrder.value.map((key, i) => ({
        overallPick: i + 1,
        playerKey: key,
        playerName: namesByKey.value[key] ?? key,
        position: projections.value[key]?.position ?? '',
        slot: 0,   // the grid seats by overall pick; this is only carried for callers
      }))
      return buildDraftGrid(
        { type: draftKind.value, teams: r.teams, rounds: r.rosterSize || 0 },
        picks,
        { mySlot: mySlot.value, currentOverallPick: mockOrder.value.length + 1 },
      )
    }),
    clock: computed(() => draftClock(liveState.value ?? { inProgress: false, complete: false, picks: [], drafted: new Set() }, myTeamId.value)),
  }
}
