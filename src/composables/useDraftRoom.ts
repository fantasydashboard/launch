import { computed, onMounted, onUnmounted, ref, watch, type ComputedRef, type Ref } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useActivePointsSource } from '@/composables/useActivePointsSource'
import { useFootballVor } from '@/composables/useFootballVor'
import { sleeperService } from '@/services/sleeper'
import { fetchSeasonAdp } from '@/services/footballProjections'
import { adpVariantFor } from '@/draft/room/adp'
import { nextPickFor, slotAtPick, slotsBetween, type DraftShape } from '@/draft/room/pickOrder'
import { buildTendencies, defaultRoundBucket, priorFor, type HistoricalPick } from '@/draft/room/tendencies'
import { simulateSurvival } from '@/draft/room/survival'
import { buildBoard, type BoardRow } from '@/draft/room/board'
import { computeReplacementDetail } from '@/football/footballReplacement'
import { applyAdpAnchor, DEFAULT_ADP_WEIGHT } from '@/draft/room/valueAdjust'
import { needFactorByPosition, startablePositions } from '@/draft/room/rosterNeed'
import { buildLineup, FLEX_ELIGIBILITY } from '@/draft/room/lineup'
import { buildSlotRanks, rankIfAdded, type SlotRankTeam } from '@/draft/room/slotRanks'
import { marginalDetailByKey } from '@/draft/room/marginalValue'
import { buildRecommendation, type Recommendation } from '@/draft/room/recommend'
import { parseDraftId } from '@/draft/room/draftId'
import { buildDraftGrid, type GridPick } from '@/draft/room/draftGrid'
import { slotsFromDraftSettings, scoringFromDraftMetadata } from '@/draft/room/draftSettings'
import { replayDraft, followRecommendations, calibration, type ReplayPick } from '@/draft/room/replay'
import { buildRecap, type RecapPick } from '@/draft/room/recap'
import { useCustomRankings } from '@/composables/useCustomRankings'
import { useDraftHistory } from '@/composables/useDraftHistory'
import type { DraftRecord } from '@/draft/room/draftHistory'
import { buildSeatMap, shuffledSeating } from '@/draft/room/practiceSeating'

/** How often to re-read picks while a draft is running. */
const POLL_MS = 5000
/** Consecutive poll failures before backing off. */
const BACKOFF_AFTER = 3

export type DraftRoomStatus =
  | 'unsupported-league' // not Sleeper football
  | 'unsupported-type'   // auction
  | 'no-draft'
  | 'pre-draft'
  | 'drafting'
  | 'complete'
  | 'loading'

/**
 * The live draft room.
 *
 * Polls Sleeper for picks, rebuilds the board on every change, and always honors a
 * manual drafted-set alongside the synced one — if sync dies mid-draft the user
 * keeps working instead of being stranded on the clock.
 */
export function useDraftRoom() {
  const leagueStore = useLeagueStore()
  const src = useActivePointsSource()

  const isFootball = computed(() => leagueStore.activeSport === 'football')
  const isSleeper = computed(() => leagueStore.activePlatform === 'sleeper')
  const enabled = computed(() => isFootball.value && isSleeper.value)

  const season = computed(() => '')

  // ── format: the DRAFT's own settings win over the league's ────────────────
  // A mock is a real draft with its own roster slots and scoring. Scoring a
  // 2-QB half-PPR mock with your 1-QB PPR league's settings makes replacement
  // level, the ADP market, and the upside tilt all quietly wrong.
  const draftMeta = ref<any | null>(null)

  const effectiveSlots = computed<Record<string, number>>(
    () => slotsFromDraftSettings(draftMeta.value?.settings) ?? src.rosterSlots.value ?? {},
  )
  const effectiveScoring = computed<Record<string, number>>(
    () =>
      scoringFromDraftMetadata(draftMeta.value?.metadata) ??
      ((leagueStore.currentLeague as any)?.scoring_settings ?? {}),
  )
  const effectiveTeams = computed<number>(
    () => Number(draftMeta.value?.settings?.teams) || src.leagueSize.value,
  )

  const { vorByKey, loading: vorLoading } = useFootballVor({
    pool: src.pool,
    freeAgents: src.freeAgents,
    slots: effectiveSlots,
    teams: effectiveTeams,
    season,
    enabled,
    weeklyHorizon: 0, // draft prep is rest-of-season only
  })

  // ── draft meta + picks ────────────────────────────────────────────────────
  const picks = ref<any[]>([])
  const adp = ref<Record<string, number>>({})
  const loadingDraft = ref(false)
  const pollFailures = ref(0)
  let timer: ReturnType<typeof setInterval> | null = null

  /** Players the user marked gone by hand. Always unioned with synced picks. */
  const manualDrafted = ref<Set<string>>(new Set())
  function markDrafted(playerKey: string) {
    manualDrafted.value = new Set(manualDrafted.value).add(playerKey)
  }
  function unmarkDrafted(playerKey: string) {
    const next = new Set(manualDrafted.value)
    next.delete(playerKey)
    manualDrafted.value = next
  }

  /**
   * A draft the user pasted in — a mock, or any Sleeper draft that isn't the one
   * attached to their league. Persisted so a refresh mid-draft doesn't drop it.
   */
  const OVERRIDE_KEY = 'ufd:draftRoom:draftId'
  const overrideDraftId = ref<string | null>(
    typeof localStorage !== 'undefined' ? localStorage.getItem(OVERRIDE_KEY) : null,
  )
  const overrideError = ref<string | null>(null)

  function connectDraft(input: string): boolean {
    const id = parseDraftId(input)
    if (!id) {
      overrideError.value = "That doesn't look like a Sleeper draft link or ID."
      return false
    }
    overrideError.value = null
    overrideDraftId.value = id
    try { localStorage.setItem(OVERRIDE_KEY, id) } catch { /* private mode */ }
    loadDraft()
    return true
  }

  function disconnectDraft() {
    overrideDraftId.value = null
    overrideError.value = null
    try { localStorage.removeItem(OVERRIDE_KEY) } catch { /* private mode */ }
    loadDraft()
  }

  async function loadDraft() {
    if (!enabled.value) return
    loadingDraft.value = true
    try {
      // A pasted draft wins over the league's own — that's the point of pasting it.
      let id: string | null = overrideDraftId.value
      if (!id) {
        if (!leagueStore.activeLeagueId) return
        const drafts = await sleeperService.getLeagueDrafts(String(leagueStore.activeLeagueId))
        id = drafts?.[0]?.draft_id ?? null
      }
      if (!id) { draftMeta.value = null; picks.value = []; return }
      const [meta, p] = await Promise.all([
        sleeperService.getDraftById(id),
        sleeperService.getDraftPicks(id),
      ])
      if (!meta) {
        overrideError.value = overrideDraftId.value
          ? "Couldn't load that draft — check the link or ID."
          : null
        draftMeta.value = null
        picks.value = []
        return
      }
      draftMeta.value = meta
      picks.value = p

      const variant = adpVariantFor(
        effectiveScoring.value,
        effectiveSlots.value,
        (leagueStore.currentLeague as any)?.settings?.type,
      )
      adp.value = await fetchSeasonAdp(String(meta?.season ?? ''), variant)
    } catch (e) {
      console.error('[useDraftRoom] loadDraft failed', e)
    } finally {
      loadingDraft.value = false
    }
  }

  async function pollPicks() {
    const id = draftMeta.value?.draft_id
    if (!id) return
    try {
      const p = await sleeperService.getDraftPicks(id)
      if (Array.isArray(p)) { picks.value = p; pollFailures.value = 0 }

      // The poll only ever read PICKS, so `status` was whatever it had been at
      // load forever after. That stranded the room at both ends: a draft you
      // connected before it started never noticed it had begun, and a finished
      // one never noticed it was over. Both needed a hard refresh.
      const teams = Number(draftMeta.value?.settings?.teams) || 0
      const rounds = Number(draftMeta.value?.settings?.rounds) || 0
      const full = teams > 0 && rounds > 0 && picks.value.length >= teams * rounds
      const status = String(draftMeta.value?.status ?? '')
      if (status !== 'complete' && (full || status === 'pre_draft' || picks.value.length > 0)) {
        const meta = await sleeperService.getDraftById(id)
        if (meta) draftMeta.value = meta
      }
    } catch {
      pollFailures.value++
    }
  }

  function startPolling() {
    stopPolling()
    timer = setInterval(() => {
      // Back off rather than hammering a failing endpoint mid-draft.
      if (pollFailures.value >= BACKOFF_AFTER && pollFailures.value % 3 !== 0) {
        pollFailures.value++
        return
      }
      if (draftMeta.value?.status === 'complete') { stopPolling(); return }
      pollPicks()
    }, POLL_MS)
  }
  function stopPolling() {
    if (timer) { clearInterval(timer); timer = null }
  }

  function init() {
    src.load()
    src.loadFreeAgents(400)
    loadDraft().then(() => {
      const s = draftMeta.value?.status
      if (s === 'drafting' || s === 'pre_draft') startPolling()
    })
  }
  onMounted(init)
  onUnmounted(stopPolling)
  watch(() => leagueStore.activeLeagueId, init)
  // Polling covers the wait as well as the draft: a room you open early has to
  // notice the first pick by itself.
  watch(() => draftMeta.value?.status, (s) =>
    s === 'drafting' || s === 'pre_draft' ? startPolling() : stopPolling(),
  )

  // ── derived draft state ───────────────────────────────────────────────────
  const shape = computed<DraftShape | null>(() => {
    const m = draftMeta.value
    if (!m) return null
    const type = String(m.type ?? 'snake')
    if (type !== 'snake' && type !== 'linear') return null // auction unsupported
    return {
      type,
      teams: effectiveTeams.value,
      rounds: Number(m.settings?.rounds) || 15,
    }
  })

  const status = computed<DraftRoomStatus>(() => {
    if (!enabled.value) return 'unsupported-league'
    if (loadingDraft.value && !draftMeta.value) return 'loading'
    if (!draftMeta.value) return 'no-draft'
    if (!shape.value) return 'unsupported-type'
    const s = String(draftMeta.value.status ?? '')
    if (s === 'complete') return 'complete'
    if (s === 'drafting') return 'drafting'
    return 'pre-draft'
  })

  /**
   * My draft slot. `draft_order` (user_id -> slot) comes first because it is the
   * only one that works in a mock: a mock's slot_to_roster_id points at roster ids
   * invented for that draft, which never match the ones in your league. Getting
   * this wrong silently empties the upcoming-picks list, so every player "survives"
   * at 100% and every score collapses to zero — which is exactly how it failed.
   */
  const mySlot = computed<number | null>(() => {
    const meta = draftMeta.value
    if (!meta) return null

    const uid = (leagueStore as any).currentUserId
    const fromOrder = uid ? (meta.draft_order as Record<string, number> | undefined)?.[String(uid)] : undefined
    if (fromOrder) return Number(fromOrder)

    const map = meta.slot_to_roster_id as Record<string, number> | undefined
    const mine = src.myTeamKey.value
    if (map && mine) {
      for (const [slot, rosterId] of Object.entries(map)) {
        if (String(rosterId) === String(mine)) return Number(slot)
      }
    }
    return null
  })

  /** True when we could not work out which seat is yours — the board is degraded. */
  const slotUnknown = computed(() => !!draftMeta.value && mySlot.value === null)

  const draftedKeys = computed<Set<string>>(() => {
    const s = new Set<string>()
    for (const p of picks.value) if (p?.player_id) s.add(String(p.player_id))
    for (const k of manualDrafted.value) s.add(k)
    return s
  })

  const currentOverallPick = computed(() => picks.value.length + 1)
  const isMyTurn = computed(
    () => !!shape.value && !!mySlot.value && slotAtPick(shape.value, currentOverallPick.value) === mySlot.value,
  )

  /** The pick I am deciding for, and the one after it. */
  const myPick = computed<number | null>(() => {
    if (!shape.value || !mySlot.value) return null
    return isMyTurn.value
      ? currentOverallPick.value
      : nextPickFor(shape.value, mySlot.value, currentOverallPick.value - 1)
  })
  const myNextPick = computed<number | null>(() => {
    if (!shape.value || !mySlot.value || !myPick.value) return null
    return nextPickFor(shape.value, mySlot.value, myPick.value)
  })

  /** Slots picking between the pick I'm deciding and my following one. */
  const upcomingSlots = computed<number[]>(() => {
    if (!shape.value || !myPick.value) return []
    const to = myNextPick.value
    if (!to) return []
    return slotsBetween(shape.value, myPick.value, to)
  })

  /**
   * Whether the connected draft is THIS league's draft.
   *
   * History and team names belong to a league, not to a draft id. A mock's
   * slot_to_roster_id hands out roster ids 1..N — the same numbers a real league
   * uses — so without this check every bot inherits one of your league mates'
   * names and years of his tendencies. That is how a manager who last played
   * three seasons ago ends up "picking before you".
   */
  const draftIsThisLeague = computed(() => {
    const draftLeague = String(draftMeta.value?.league_id ?? '')
    const active = String(leagueStore.activeLeagueId ?? '')
    return !!draftLeague && draftLeague === active
  })

  /**
   * Identity and intelligence were one boolean, and they are not the same
   * question.
   *
   * The single gate existed because connecting a mock while a league was active
   * made bots inherit league mates' names AND years of their tendencies — a
   * manager who had not played in three seasons appeared to be "picking before
   * you". Suppressing both fixed it, and took the opponent model with it.
   *
   * Split, so a practice room can borrow the league's managers (real identity,
   * league model) while a plain mock keeps neither.
   */
  const practiceMode = ref(false)
  /**
   * Gated on `practiceEngaged` (defined below, after `seatMap`), NOT on
   * `practiceMode` directly. `practiceMode` is just the user's request; it
   * can be on while `seatMap` is null (size mismatch, unpublished order, no
   * anchor). If identity/model followed the request instead of the outcome,
   * `teamKeyForSlot` would fall back to `rosterIdForSlot(slot)` — the MOCK's
   * roster id — while still labelled 'real'/'league', and a real league
   * mate's name and draft history would render against whichever seat
   * happens to share that small sequential integer. That is the exact bug
   * this feature exists to prevent, and the amber "modelled on the market"
   * banner would be lying about it. `practiceEngaged` is declared later in
   * this file (it needs `seatMap`), but referencing it here is safe: this is
   * a computed's body, evaluated lazily, and by the time anything reads
   * `.value` the whole setup function — including `practiceEngaged` — has
   * already run.
   */
  const opponentIdentity = computed<'real' | 'anonymous'>(() =>
    draftIsThisLeague.value || practiceEngaged.value ? 'real' : 'anonymous',
  )
  const opponentModel = computed<'league' | 'market'>(() =>
    draftIsThisLeague.value || practiceEngaged.value ? 'league' : 'market',
  )

  /**
   * Display names for the humans in THIS draft, from its own `draft_order`
   * (user_id -> slot). Bots have no user id and stay anonymous, which is what
   * they are.
   */
  const draftUserNames = ref<Record<number, string>>({})
  const draftUserAvatars = ref<Record<number, string>>({})
  watch(
    () => draftMeta.value?.draft_order,
    async (order) => {
      const entries = Object.entries((order ?? {}) as Record<string, number>)
      if (!entries.length) { draftUserNames.value = {}; draftUserAvatars.value = {}; return }
      const resolved = await Promise.all(
        entries.map(async ([userId, slot]) => {
          try {
            const u = await sleeperService.getUser(String(userId))
            return [Number(slot), u?.display_name || u?.username || '', u?.avatar ?? ''] as const
          } catch {
            return [Number(slot), '', ''] as const
          }
        }),
      )
      const names: Record<number, string> = {}
      const avatars: Record<number, string> = {}
      for (const [slot, name, avatar] of resolved) {
        if (name) names[slot] = name
        if (avatar) avatars[slot] = `https://sleepercdn.com/avatars/thumbs/${avatar}`
      }
      draftUserNames.value = names
      draftUserAvatars.value = avatars
    },
    { immediate: true },
  )

  /**
   * The active league's OWN draft, which is a different object from the one the
   * room is connected to. Sleeper returns it before the draft starts, including
   * `draft_order` once the commissioner has set the seats — which is what
   * practice mode aligns against.
   */
  const leagueDraftMeta = ref<any | null>(null)
  // Request token: a late response from a league you've since navigated away
  // from must not win. Without this, switching A -> B while A's fetch is still
  // in flight can have A's response land AFTER B's and overwrite it — silently
  // seating league A's real, named managers into league B's practice draft.
  let leagueDraftRequestId = 0
  watch(
    () => leagueStore.activeLeagueId,
    async (id) => {
      const requestId = ++leagueDraftRequestId
      leagueDraftMeta.value = null
      if (!id) return
      try {
        const drafts = await sleeperService.getLeagueDrafts(String(id))
        if (requestId !== leagueDraftRequestId) return // superseded by a newer league switch
        leagueDraftMeta.value = drafts?.[0] ?? null
      } catch (e) {
        // A missing league draft is not an error worth surfacing — it only means
        // practice mode cannot offer real seating.
        console.info('[useDraftRoom] league draft unavailable for practice seating', e)
      }
    },
    { immediate: true },
  )

  /** The league's published seating: slot -> roster id. Empty when unset. */
  const realSlotToRosterId = computed<Record<number, string>>(() => {
    const map = leagueDraftMeta.value?.slot_to_roster_id as Record<string, number> | undefined
    if (!map) return {}
    const out: Record<number, string> = {}
    for (const [slot, rosterId] of Object.entries(map)) {
      const n = Number(slot)
      if (n > 0 && rosterId != null) out[n] = String(rosterId)
    }
    return out
  })

  /** My seat in the LEAGUE's draft — the anchor the mock ring rotates to. */
  const mySlotInLeague = computed<number>(() => {
    const meta = leagueDraftMeta.value
    if (!meta) return 0
    const uid = (leagueStore as any).currentUserId
    const fromOrder = uid
      ? (meta.draft_order as Record<string, number> | undefined)?.[String(uid)]
      : undefined
    if (fromOrder) return Number(fromOrder)
    const mine = src.myTeamKey.value
    const map = meta.slot_to_roster_id as Record<string, number> | undefined
    if (map && mine) {
      for (const [slot, rosterId] of Object.entries(map)) {
        if (String(rosterId) === String(mine)) return Number(slot)
      }
    }
    return 0
  })

  const leagueOrderKnown = computed(
    () => mySlotInLeague.value > 0 && Object.keys(realSlotToRosterId.value).length > 0,
  )

  /**
   * Avatar for a slot: the human's if there is one, nothing for a bot. Reads
   * through `teamKeyForSlot` (defined below) rather than `rosterIdForSlot`
   * directly: in a practice room `rosterIdForSlot` returns the MOCK's roster
   * id, which collides numerically with an unrelated LEAGUE roster id, so the
   * avatar would show a different manager than the one the sentence and the
   * simulation name for the same seat.
   */
  const teamAvatarForSlot = (slot: number): string | null =>
    (opponentIdentity.value === 'real' ? src.teamLogos.value?.[teamKeyForSlot(slot)] : null) ??
    draftUserAvatars.value[slot] ??
    null

  // ── tendencies from league history ────────────────────────────────────────
  const historicalPicks = computed<HistoricalPick[]>(() => {
    const out: HistoricalPick[] = []
    if (opponentModel.value !== 'league') return out
    const drafts = leagueStore.historicalDrafts as Map<string, any> | undefined
    if (!drafts) return out
    for (const draft of drafts.values()) {
      for (const p of draft?.picks ?? []) {
        const pos = p?.metadata?.position
        if (!pos) continue
        out.push({
          teamKey: String(p.roster_id ?? ''),
          position: String(pos),
          round: Number(p.round) || 1,
          keeper: !!p.is_keeper,
        })
      }
    }
    return out
  })

  const tendencies = computed(() => buildTendencies(historicalPicks.value))
  const hasHistory = computed(() => historicalPicks.value.length > 0)

  /**
   * Whether the league has ANY draft history, independent of whether an
   * opponent model is currently active. `hasHistory` runs through
   * `historicalPicks`, which returns `[]` unless `opponentModel === 'league'`
   * — and `opponentModel` itself requires `draftIsThisLeague || practiceMode`.
   * Reading `hasHistory` here would make the practice-mode gate circular:
   * with a mock connected and practice mode OFF (exactly the state in which
   * the toggle must be offered), `opponentModel` is 'market', so
   * `historicalPicks` is always empty and the toggle could never appear.
   */
  const leagueHasDraftHistory = computed(() => {
    const drafts = leagueStore.historicalDrafts as Map<string, any> | undefined
    return !!drafts && drafts.size > 0
  })

  const rosterIdForSlot = (slot: number): string => {
    const map = draftMeta.value?.slot_to_roster_id as Record<string, number> | undefined
    return String(map?.[String(slot)] ?? '')
  }

  /**
   * Seat shuffle seed, persisted per league. Keyed by the active league id —
   * an unkeyed seed would carry League A's shuffle into League B's practice
   * room the moment the user re-rolls or switches leagues. Reading
   * `localStorage` can throw outright in Safari with blocked storage; letting
   * that escape would break composable setup for everyone, not just practice
   * mode, so both the read and the write are guarded.
   */
  function seatSeedKey(leagueId: unknown): string {
    return `ufd:draftRoom:seatSeed:${String(leagueId ?? 'none')}`
  }
  function readSeatSeed(leagueId: unknown): number {
    try {
      if (typeof localStorage === 'undefined') return 1
      return Number(localStorage.getItem(seatSeedKey(leagueId))) || 1
    } catch {
      return 1
    }
  }
  const seatSeed = ref<number>(readSeatSeed(leagueStore.activeLeagueId))
  watch(
    () => leagueStore.activeLeagueId,
    (id) => { seatSeed.value = readSeatSeed(id) },
  )
  function reshuffleSeats() {
    seatSeed.value = (seatSeed.value % 100000) + 1
    try {
      localStorage.setItem(seatSeedKey(leagueStore.activeLeagueId), String(seatSeed.value))
    } catch { /* private mode */ }
  }

  /** Every roster id in the active league, ascending — the fallback seating. */
  const leagueRosterIds = computed<string[]>(() =>
    Object.keys(src.teamNames.value ?? {}).sort((a, b) => Number(a) - Number(b)),
  )

  /**
   * Mock slot -> league roster id. Null when practice seating is impossible.
   * Never seats approximately: a wrong seat states a specific, confident,
   * wrong thing about a real person, which is worse than saying nothing.
   */
  const seatMap = computed<Record<number, string> | null>(() => {
    if (!practiceMode.value) return null
    const teams = effectiveTeams.value
    if (teams <= 0) return null

    let map: Record<number, string> | null = null
    if (leagueOrderKnown.value) {
      // Compare mock size against the LEAGUE's actual roster count, not the
      // published order's key count. A 12-team league whose slot_to_roster_id
      // arrived with holes (say, only 10 of 12 slots) would otherwise look
      // like a complete 10-team order to buildSeatMap, which would happily
      // seat 10 of the 12 real managers and silently drop the other two.
      map = buildSeatMap({
        mockTeams: teams,
        leagueTeams: leagueRosterIds.value.length,
        mySlotInMock: mySlot.value ?? 0,
        mySlotInLeague: mySlotInLeague.value,
        realSlotToRosterId: realSlotToRosterId.value,
      })
    } else {
      // No published order: a stable arbitrary seating the user can re-roll.
      // shuffledSeating has no notion of "you", so it must never see the
      // user's own roster id in its input — otherwise it can deal the user
      // into an opponent's chair (modelling them as picking before
      // themselves) while dropping a real league mate from the room
      // entirely. Fix the user's own seat first, then shuffle only the
      // remaining N-1 managers into the remaining N-1 slots.
      const ids = leagueRosterIds.value
      const mine = src.myTeamKey.value
      const mySlotValue = mySlot.value ?? 0
      if (
        ids.length === teams &&
        mySlotValue >= 1 &&
        mySlotValue <= teams &&
        mine &&
        ids.includes(mine)
      ) {
        const others = ids.filter((id) => id !== mine)
        const shuffledOthers = shuffledSeating(others, seatSeed.value)
        const out: Record<number, string> = { [mySlotValue]: mine }
        let i = 0
        for (let slot = 1; slot <= teams; slot++) {
          if (slot === mySlotValue) continue
          i += 1
          out[slot] = shuffledOthers[i]
        }
        map = out
      }
    }

    // shuffledSeating returns {} for an empty roster list, and {} is truthy —
    // guard explicitly so a seat map that seats nobody never passes as real.
    if (!map || Object.keys(map).length !== teams) return null
    return map
  })

  /**
   * The user asked for practice mode AND seating actually built. This, not
   * `practiceMode` alone, is what `opponentIdentity`/`opponentModel` gate on
   * — see the comment there for why treating the request as the outcome is
   * the bug.
   */
  const practiceEngaged = computed(() => practiceMode.value && seatMap.value !== null)

  const practiceAvailable = computed(
    () => !draftIsThisLeague.value && leagueHasDraftHistory.value && leagueRosterIds.value.length > 0,
  )
  const practiceUnavailableReason = computed(() => {
    if (!practiceMode.value) return ''
    if (seatMap.value) return ''
    if ((mySlot.value ?? 0) < 1) return "Couldn't tell which seat is yours in this mock."
    if (leagueRosterIds.value.length !== effectiveTeams.value) {
      return `This mock has ${effectiveTeams.value} teams and your league has ${leagueRosterIds.value.length}. Practice seating needs them to match.`
    }
    if (leagueOrderKnown.value && (mySlotInLeague.value < 1 || mySlotInLeague.value > effectiveTeams.value)) {
      return "Your seat in the league's draft order doesn't line up with this mock's ring."
    }
    return 'Your league’s draft order is unavailable.'
  })

  /**
   * Practice mode does not turn itself off otherwise. Two hazards follow if
   * it doesn't reset here: (a) the connected draft becomes the real league
   * draft mid-session (`draftIsThisLeague` flips true) and the banner keeps
   * announcing "practice mode — seated on a mock" over a genuine live draft,
   * which is its own hazard; (b) seating stops being available (league
   * unloads, history drops, draft switches) and the toggle disappears from
   * the view with no way left to turn the mode off for the rest of the
   * session. Watching `practiceAvailable` alone would cover (a) too, since
   * `practiceAvailable` is itself defined as `!draftIsThisLeague.value &&
   * ...` — but watching both explicitly keeps this correct even if that
   * dependency is ever refactored away.
   */
  watch([draftIsThisLeague, practiceAvailable], ([isLeagueDraft, available]) => {
    if (practiceMode.value && (isLeagueDraft || !available)) {
      practiceMode.value = false
    }
  })

  /**
   * Whose history models this seat. In a practice room that is a real league
   * mate; otherwise it is the seat's own roster in the connected draft. Both
   * the survival simulation and the on-screen "picking before you" reason
   * must call this same function — they diverged once before, when a
   * roster-id lookup skipped the seat map and the sentence named a manager
   * who hadn't played in three seasons while the sim modeled someone else.
   */
  const teamKeyForSlot = (slot: number): string =>
    seatMap.value?.[slot] ?? rosterIdForSlot(slot)

  /** Human label for the round range a tendency was measured over. */
  const BUCKET_RANGE: Record<string, string> = {
    early: 'rounds 1-3',
    mid: 'rounds 4-8',
    late: 'rounds 9+',
  }

  const bucketForMyPick = computed(() => {
    if (!shape.value || !myPick.value) return 'early'
    return defaultRoundBucket(Math.ceil(myPick.value / Math.max(1, shape.value.teams)))
  })

  /** Managers picking before my next turn, with priors — drives the tendency reason. */
  const upcoming = computed(() =>
    upcomingSlots.value.map((slot) => {
      const teamKey = teamKeyForSlot(slot)
      return {
        teamKey,
        teamName:
          (opponentIdentity.value === 'real' ? src.teamNames.value?.[teamKey] : null) ??
          `Team ${slot}`,
        prior: priorFor(tendencies.value, teamKey, bucketForMyPick.value),
      }
    }),
  )

  // ── board ─────────────────────────────────────────────────────────────────
  const availablePlayers = computed(() => {
    const drafted = draftedKeys.value
    const seen = new Set<string>()
    const rows: { playerKey: string; name: string; position: string; proTeam?: string; headshot?: string; value: number; opportunity?: string; depthChartOrder?: number | null; injuryStatus: string | null }[] = []

    const meta = (leagueStore.players ?? {}) as Record<string, any>
    // A position this league never starts is not a weak pick, it is an invalid
    // one. Discounting instead of excluding let defenses win late-round
    // comparisons in a league with no defense slot.
    const startable = startablePositions(effectiveSlots.value ?? {})
    const push = (playerKey: string, name: string, position: string, proTeam?: string, headshot?: string) => {
      if (!playerKey || drafted.has(playerKey) || seen.has(playerKey)) return
      if (!startable.has(String(position || '').toUpperCase().split(/[,/|]/)[0].trim())) return
      const v = vorByKey.value[playerKey]
      if (!v) return
      // No projection means no opinion. These used to reach the board with a
      // value of 0 and then float to the top via the upside term — a player we
      // know nothing about is not a recommendation.
      if (!(v.pointsRos > 0)) return
      seen.add(playerKey)
      rows.push({
        playerKey, name, position, proTeam, headshot,
        value: v.pointsRos,
        opportunity: v.opportunity,
        depthChartOrder: meta[playerKey]?.depth_chart_order ?? null,
        injuryStatus: meta[playerKey]?.injury_status ?? null,
      })
    }

    for (const fa of src.freeAgents.value) push(fa.playerKey, fa.name, fa.position, fa.team, fa.headshot)
    for (const p of src.pool.value) push(p.playerKey, p.name, p.position, p.proTeam, p.headshot)
    return rows
  })

  /**
   * The whole universe, drafted players included, ordered by value over
   * replacement — what we would say if nothing had been taken yet.
   *
   * The analyst comparison has to run against this, not the live board: mid-draft
   * the board holds only who is LEFT, so every elite player reads as "unmatched"
   * purely because someone already took him. And ordering has to be
   * replacement-adjusted, since ranking by raw points puts every quarterback
   * ~100 spots too high and drowns the real disagreements.
   */
  const comparePool = computed(() => {
    const seen = new Set<string>()
    const rows: { playerKey: string; name: string; position: string; value: number; adp: number | null }[] = []
    const push = (playerKey: string, name: string, position: string) => {
      if (!playerKey || seen.has(playerKey)) return
      const v = vorByKey.value[playerKey]
      if (!v || !(v.pointsRos > 0)) return
      seen.add(playerKey)
      rows.push({ playerKey, name, position, value: v.pointsRos, adp: adp.value[playerKey] ?? null })
    }
    for (const fa of src.freeAgents.value) push(fa.playerKey, fa.name, fa.position)
    for (const p of src.pool.value) push(p.playerKey, p.name, p.position)
    for (const p of picks.value as any[]) {
      const key = String(p.player_id ?? '')
      const nm = [p?.metadata?.first_name, p?.metadata?.last_name].filter(Boolean).join(' ')
      push(key, nm || key, String(p?.metadata?.position ?? ''))
    }
    if (!rows.length) return rows

    const detail = computeReplacementDetail(
      rows.map((r) => ({ playerKey: r.playerKey, position: r.position, points: r.value })),
      effectiveSlots.value ?? {},
      effectiveTeams.value,
    )
    return [...rows].sort(
      (a, b) =>
        b.value - (detail.levels[b.position] ?? 0) - (a.value - (detail.levels[a.position] ?? 0)),
    )
  })

  /**
   * A light market anchor, applied before anything ranks. Its job is to catch
   * outright single-source projection errors without handing the board to
   * consensus.
   *
   * A handcuff-value model was built and measured alongside this and REMOVED: it
   * made agreement with a trusted analyst worse at every setting tried (0.936
   * anchor-only vs 0.935 at a 10% share, degrading from there). It overshot on
   * individual backs while the analyst's real bias was a general RB premium, not
   * a handcuff one.
   */

  // Admin-only: an analyst's ordering mapped onto our value curve. Off (and
  // invisible) for every other account. Applied last so it overrides ours.
  const customRankings = useCustomRankings()
  const rankedPlayers = computed(() => applyValuePipeline(availablePlayers.value))

  /**
   * The single value pipeline: market anchor, then whichever ranking list is
   * active. Both the live board and the replay run through this.
   *
   * They used not to. The replay built its universe from raw VOR points — no ADP
   * anchor, no analyst list — so it was replaying a DIFFERENT ENGINE from the one
   * on screen, and every conclusion drawn from "following us" was about a tool
   * nobody used. If these two ever diverge again the replay verifies nothing.
   */
  function applyValuePipeline<T extends { playerKey: string; position: string; value: number }>(
    rows: T[],
  ): (T & { projected: number })[] {
    if (!rows.length) return []
    const anchored = applyAdpAnchor(rows, adp.value, DEFAULT_ADP_WEIGHT)
    const withAnchor = rows.map((p) => ({ ...p, value: anchored[p.playerKey] ?? p.value }))
    const base = withAnchor.map((p) => ({ ...p, projected: p.value }))
    const remap = customRankings.applyTo(base)
    if (!Object.keys(remap).length) return base
    return base.map((p) => ({ ...p, value: remap[p.playerKey] ?? p.value }))
  }

  const survivalResult = computed(() =>
    simulateSurvival({
      available: rankedPlayers.value.map((p) => ({
        playerKey: p.playerKey,
        position: p.position,
        adp: adp.value[p.playerKey] ?? null,
        value: p.value,
        projected: p.projected ?? p.value,
      })),
      upcomingSlots: upcomingSlots.value,
      priorForSlot: (slot) => priorFor(tendencies.value, teamKeyForSlot(slot), bucketForMyPick.value),
      runs: 600,
      seed: 1337,
    }),
  )

  /** My picks so far, for roster shape. */
  const myPicks = computed(() =>
    picks.value.filter((p) => {
      if (mySlot.value != null && p?.draft_slot != null) return Number(p.draft_slot) === mySlot.value
      return String(p?.roster_id ?? '') === String(src.myTeamKey.value)
    }),
  )

  /** Headshots for players already off the board — the lineup still shows them. */
  const headshotByKey = computed<Record<string, string>>(() => {
    const out: Record<string, string> = {}
    for (const fa of src.freeAgents.value) if (fa.playerKey && fa.headshot) out[fa.playerKey] = fa.headshot
    for (const p of src.pool.value) if (p.playerKey && p.headshot) out[p.playerKey] = p.headshot
    return out
  })

  /** My starting lineup, one row per slot, with whoever is sitting in it. */
  const myLineup = computed(() =>
    buildLineup({
      slots: effectiveSlots.value ?? {},
      players: myPicks.value.map((p: any) => {
        const key = String(p?.player_id ?? '')
        const name = [p?.metadata?.first_name, p?.metadata?.last_name].filter(Boolean).join(' ')
        return {
          playerKey: key,
          name: name || key,
          position: String(p?.metadata?.position ?? ''),
          overallPick: Number(p?.pick_no) || null,
          headshot: headshotByKey.value[key] ?? null,
        }
      }),
    }),
  )

  /** Every team's roster so far, for slot-by-slot comparison. */
  const allTeamRosters = computed<SlotRankTeam[]>(() => {
    const byTeam = new Map<string, SlotRankTeam>()
    for (const p of picks.value as any[]) {
      const key = String(p?.draft_slot ?? p?.roster_id ?? '')
      const playerKey = String(p?.player_id ?? '')
      if (!key || !playerKey) continue
      const entry = byTeam.get(key) ?? { teamKey: key, players: [] }
      entry.players.push({
        playerKey,
        name: [p?.metadata?.first_name, p?.metadata?.last_name].filter(Boolean).join(' ') || playerKey,
        position: String(p?.metadata?.position ?? ''),
        points: vorByKey.value[playerKey]?.pointsRos ?? 0,
      })
      byTeam.set(key, entry)
    }
    return [...byTeam.values()]
  })

  /**
   * Where each of my starters stands against the same slot on every other roster.
   * A roster is only strong or weak relative to the teams you play.
   */
  const slotRanks = computed(() =>
    buildSlotRanks({
      slots: effectiveSlots.value ?? {},
      teams: allTeamRosters.value,
      myTeamKey: mySlot.value != null ? String(mySlot.value) : null,
    }),
  )

  /** Where a player you're considering would put you at a given slot. */
  const rankIfDrafted = (label: string, points: number) =>
    rankIfAdded(
      slotRanks.value,
      label,
      points,
      allTeamRosters.value,
      effectiveSlots.value ?? {},
      mySlot.value != null ? String(mySlot.value) : null,
    )

  const starterSlots = computed(() => {
    const slots = effectiveSlots.value ?? {}
    return Object.entries(slots)
      .filter(([k]) => k !== 'BN' && k !== 'IR' && k !== 'TAXI')
      .reduce((n, [, v]) => n + (Number(v) || 0), 0)
  })

  /** How many players I already hold at each position. */
  const filledByPosition = computed<Record<string, number>>(() => {
    const out: Record<string, number> = {}
    for (const p of myPicks.value) {
      const pos = String((p as any)?.metadata?.position ?? '').toUpperCase()
      if (pos) out[pos] = (out[pos] ?? 0) + 1
    }
    return out
  })

  /**
   * Everyone taken so far, with the value they had — so the board can show the
   * gaps back in and you can see where a run went through.
   */
  const draftedRows = computed(() => {
    const out: Record<string, { playerKey: string; name: string; position: string; proTeam?: string; headshot?: string; projected: number; overallPick: number }> = {}
    for (const p of picks.value as any[]) {
      const key = String(p?.player_id ?? '')
      if (!key) continue
      out[key] = {
        playerKey: key,
        name: [p?.metadata?.first_name, p?.metadata?.last_name].filter(Boolean).join(' ') || key,
        position: String(p?.metadata?.position ?? ''),
        proTeam: String(p?.metadata?.team ?? '').toUpperCase(),
        headshot: headshotByKey.value[key],
        projected: vorByKey.value[key]?.pointsRos ?? 0,
        overallPick: Number(p?.pick_no) || 0,
      }
    }
    return out
  })

  /**
   * What each available player would add to MY starting lineup as it stands.
   * This is the number that stops the board offering a tight end into a flex
   * already full of better backs.
   */
  const marginalDetail = computed(() => {
    const slots = effectiveSlots.value ?? {}
    if (!Object.keys(slots).length) return {}
    const roster = myPicks.value.map((p: any) => {
      const key = String(p?.player_id ?? '')
      return {
        playerKey: key,
        name: key,
        position: String(p?.metadata?.position ?? ''),
        points: vorByKey.value[key]?.pointsRos ?? 0,
      }
    })
    return marginalDetailByKey({
      slots,
      roster,
      candidates: rankedPlayers.value.map((p) => ({
        playerKey: p.playerKey,
        name: p.name,
        position: p.position,
        points: p.projected ?? p.value,
      })),
    })
  })
  const marginalByKey = computed<Record<string, number>>(() => {
    const out: Record<string, number> = {}
    for (const [k, d] of Object.entries(marginalDetail.value)) out[k] = d.points
    return out
  })

  /**
   * Who each candidate would actually be replacing. For a flex slot that is the
   * best flex-eligible player expected at your next pick, not the best at his own
   * position — the reason a tight end kept beating a better receiver was that his
   * edge was measured against a tight end he would never have started.
   */
  const replacementPointsByKey = computed<Record<string, number>>(() => {
    const byPos = survivalResult.value.expectedBestProjectedAtPosition ?? {}
    const detail = marginalDetail.value
    const slots = effectiveSlots.value ?? {}

    // The best flex-eligible replacement across every flex this league starts.
    let flexReplacement = 0
    for (const [slot, n] of Object.entries(slots)) {
      const eligible = FLEX_ELIGIBILITY[slot.toUpperCase()]
      if (!eligible || !(Number(n) > 0)) continue
      for (const pos of eligible) flexReplacement = Math.max(flexReplacement, byPos[pos] ?? 0)
    }

    const out: Record<string, number> = {}
    for (const p of rankedPlayers.value) {
      const d = detail[p.playerKey]
      out[p.playerKey] = d?.viaFlex ? flexReplacement : byPos[p.position] ?? 0
    }
    return out
  })
  const viaFlexByKey = computed<Record<string, boolean>>(() => {
    const out: Record<string, boolean> = {}
    for (const [k, d] of Object.entries(marginalDetail.value)) out[k] = d.viaFlex
    return out
  })

  /**
   * Where OUR board ranks each PRICED player — the only ordering the VALUE/FADE
   * badge is allowed to compare ADP against.
   *
   * Two rules, both of which the badge got wrong before.
   *
   * 1. Replacement-adjusted, not raw points. ADP is a draft ordering and already
   *    prices positional scarcity; ranking by raw points puts every quarterback
   *    ~100 spots too high and drowns the real disagreements — the same trap
   *    `comparePool` and `listRankByKey` already document. Differencing a raw
   *    order against ADP badged 280 of 386 priced players and split FADE
   *    66 RB / 40 WR / 29 TE / 2 QB against VALUE 38 QB / 22 TE / 14 K / 10 DEF:
   *    the badge was naming the position, not an opinion about the player.
   *
   * 2. Built from `projected`, NEVER from `value`. When an admin selects an
   *    analyst list, `value` carries that list's ordering, so a badge built on
   *    it silently changes meaning to "this analyst disagrees with the market"
   *    while the tooltip still says "we rank him". The badge has to mean the
   *    same thing for every user regardless of which list is loaded, so it is
   *    computed from our own projected points and nothing else.
   *
   * Ranked over exactly the players with an ADP, because that is the population
   * `buildBoard` draws its ADP rank from — two ranks over different populations
   * difference into bookkeeping, not disagreement.
   */
  const marketRankByKey = computed<Record<string, number>>(() => {
    const out: Record<string, number> = {}
    const priced = rankedPlayers.value.filter(
      (p) => typeof adp.value[p.playerKey] === 'number',
    )
    if (!priced.length) return out
    const pos = (p: { position: string }) =>
      String(p.position || '').toUpperCase().split(/[,/|]/)[0].trim()
    const points = (p: { projected?: number; value: number }) => p.projected ?? p.value
    const detail = computeReplacementDetail(
      priced.map((r) => ({ playerKey: r.playerKey, position: pos(r), points: points(r) })),
      effectiveSlots.value ?? {},
      effectiveTeams.value,
    )
    const overReplacement = (p: (typeof priced)[number]) =>
      points(p) - (detail.levels[pos(p)] ?? 0)
    ;[...priced]
      .sort((a, b) => overReplacement(b) - overReplacement(a))
      .forEach((p, i) => { out[p.playerKey] = i + 1 })
    return out
  })

  const board = computed<BoardRow[]>(() =>
    buildBoard({
      available: rankedPlayers.value,
      needFactor: needFactorByPosition({
        slots: effectiveSlots.value ?? {},
        filledByPosition: filledByPosition.value,
      }),
      marginalByKey: marginalByKey.value,
      replacementPointsByKey: replacementPointsByKey.value,
      viaFlexByKey: viaFlexByKey.value,
      survival: survivalResult.value.survival,
      expectedBestAtPosition: survivalResult.value.expectedBestAtPosition,
      expectedBestProjectedAtPosition: survivalResult.value.expectedBestProjectedAtPosition,
      adpByKey: adp.value,
      currentOverallPick: myPick.value ?? currentOverallPick.value,
      filledStarterSlots: Math.min(myPicks.value.length, starterSlots.value),
      totalStarterSlots: starterSlots.value,
      teams: effectiveTeams.value,
      marketRankByKey: marketRankByKey.value,
    }),
  )

  /**
   * Where each player sits on the ACTIVE LIST — the analyst's own order when one
   * is selected, our value-over-replacement order otherwise.
   *
   * The Board renders in this order rather than by edge. A board is a cheat
   * sheet: re-sorting it out from under the user is what makes a printed sheet
   * feel more trustworthy than a tool. Edge still shows as a column, and the
   * Pick tab is where the re-sorting belongs.
   */
  const listRankByKey = computed<Record<string, number>>(() => {
    const out: Record<string, number> = {}
    if (customRankings.enabled.value) {
      const { rankByKey } = customRankings.match(rankedPlayers.value)
      const ranked = Object.keys(rankByKey)
      for (const k of ranked) out[k] = rankByKey[k]
      // Anyone the list omits sits after it, in our own order.
      //
      // The offset is the list's HIGHEST rank, not how many of its entries we
      // could tie to a player. A 250-deep list that matches 140 players still
      // hands out the number 200 — counting matches instead put unranked players
      // at 141, 142, 143, which are numbers the analyst already used, and two
      // different players showed the same rank on screen.
      const offset = ranked.reduce((m, k) => Math.max(m, rankByKey[k]), 0)
      rankedPlayers.value
        .filter((p) => out[p.playerKey] === undefined)
        .sort((a, b) => b.value - a.value)
        .forEach((p, i) => { out[p.playerKey] = offset + i + 1 })
      return out
    }
    // UFD's own ranking is value over replacement, not raw points — otherwise
    // every quarterback floats to the top.
    const rows = rankedPlayers.value
    if (!rows.length) return out
    const detail = computeReplacementDetail(
      rows.map((r) => ({ playerKey: r.playerKey, position: r.position, points: r.value })),
      effectiveSlots.value ?? {},
      effectiveTeams.value,
    )
    ;[...rows]
      .sort(
        (a, b) =>
          b.value - (detail.levels[b.position] ?? 0) - (a.value - (detail.levels[a.position] ?? 0)),
      )
      .forEach((p, i) => { out[p.playerKey] = i + 1 })
    return out
  })

  /**
   * Tier per player for the horizontal bands on the Board. A ranking file's own
   * tier column is overall and runs in its order, so it can actually draw a band;
   * ours are per-position and interleave once the list is someone else's order.
   */
  const boardTierByKey = computed<Record<string, number>>(() => {
    if (customRankings.enabled.value) {
      const { tierByKey } = customRankings.match(rankedPlayers.value)
      if (Object.keys(tierByKey).length) return tierByKey
    }
    // UFD's board is ordered by value over replacement, so our overall tier bands.
    const out: Record<string, number> = {}
    for (const r of board.value) out[r.playerKey] = r.overallTier
    return out
  })

  /** The board in list order — what the Board tab renders. */
  const boardByRank = computed<BoardRow[]>(() => {
    const rank = listRankByKey.value
    return [...board.value].sort(
      (a, b) => (rank[a.playerKey] ?? 1e9) - (rank[b.playerKey] ?? 1e9),
    )
  })

  const recommendation = computed<Recommendation | null>(() => {
    const rows = board.value
    if (!rows.length) return null
    const top = rows[0]
    // The Board draws its bands from boardTierByKey; the reason has to speak the
    // same language or the same player reads as tier 1 here and tier 8 there.
    const tierOf = (key: string) => boardTierByKey.value[key]
    const myTier = tierOf(top.playerKey)
    const samePos = rows.filter((r) => r.position === top.position)
    const sameTier = samePos.filter((r) => tierOf(r.playerKey) === myTier)
    const nextTier = samePos.find(
      (r) => myTier !== undefined && (tierOf(r.playerKey) ?? Infinity) > myTier,
    )
    /**
     * "Last RB in tier 17" is only an argument when tier 17 is the BEST tier of
     * back still on the board. With a tier-14 and a tier-16 back sitting there
     * too, it reads as scarcity while describing the opposite — the bottom of a
     * group you had better options above.
     */
    const bestTierAtPos = samePos.reduce((best, r) => {
      const t = tierOf(r.playerKey)
      return t !== undefined && t < best ? t : best
    }, Infinity)
    const leadsHisPosition = myTier !== undefined && myTier <= bestTierAtPos

    return buildRecommendation(rows, {
      nextPick: myNextPick.value,
      upcoming: upcoming.value,
      roundRange: BUCKET_RANGE[bucketForMyPick.value],
      displayTier: myTier,
      tierRemaining: leadsHisPosition ? Math.max(0, sameTier.length - 1) : undefined,
      // In POINTS, like every other number on that card — `value` is the analyst's
      // ordering scale, and a drop measured there cannot be checked against the
      // points column sitting right below it.
      nextTierDrop: leadsHisPosition && nextTier ? top.projected - nextTier.projected : undefined,
    })
  })

  /**
   * The post-draft report. A draft that simply stops is one you cannot learn
   * from, so once the last pick is in, every roster gets scored the same way and
   * yours is placed among them.
   */
  const recap = computed(() => {
    if (draftMeta.value?.status !== 'complete') return null
    const rows: RecapPick[] = (picks.value as any[]).map((p) => {
      const key = String(p?.player_id ?? '')
      const name = [p?.metadata?.first_name, p?.metadata?.last_name].filter(Boolean).join(' ')
      return {
        playerKey: key,
        name: name || key,
        position: String(p?.metadata?.position ?? ''),
        overallPick: Number(p?.pick_no) || 0,
        teamKey: String(p?.draft_slot ?? p?.roster_id ?? ''),
        projected: vorByKey.value[key]?.pointsRos ?? 0,
        adp: adp.value[key] ?? null,
        proTeam: String(p?.metadata?.team ?? '').toUpperCase(),
        headshot: headshotByKey.value[key] ?? null,
      }
    })
    if (!rows.length) return null
    return buildRecap({
      picks: rows,
      slots: effectiveSlots.value ?? {},
      myTeamKey: mySlot.value != null ? String(mySlot.value) : null,
      teamNames: Object.fromEntries(
        Array.from({ length: effectiveTeams.value || 0 }, (_, i) => [String(i + 1), teamNameForSlot(i + 1)]),
      ),
    })
  })

  /**
   * Replay a COMPLETED draft through the same board and recommendation code the
   * live path uses. This is how the tool gets verified before draft night — it
   * otherwise gets one live test a year. Calibration scores whether "90% gone"
   * actually meant 90%.
   */
  const replay = computed(() => {
    if (!shape.value || !mySlot.value) return null
    if (draftMeta.value?.status !== 'complete') return null

    const replayPicks: ReplayPick[] = picks.value
      .map((p: any) => ({
        overallPick: Number(p.pick_no) || 0,
        playerKey: String(p.player_id ?? ''),
        slot: Number(p.draft_slot) || 0,
      }))
      .filter((p) => p.overallPick > 0 && p.playerKey)
    if (!replayPicks.length) return null

    // The universe as it stood before the draft: everyone taken, plus whoever is
    // still on the board now.
    //
    // Carries injuryStatus through both branches below. A field the live board
    // has and the replay does not is how the replay quietly stops being the live
    // path — every replay row would read "healthy" regardless of the player's
    // real status, silently diverging from what buildBoard actually produces on
    // screen.
    const playerMeta = (leagueStore.players ?? {}) as Record<string, any>
    const universe = new Map<string, { playerKey: string; name: string; position: string; value: number; proTeam?: string; headshot?: string; injuryStatus?: string | null }>()
    for (const r of availablePlayers.value) {
      universe.set(r.playerKey, {
        playerKey: r.playerKey, name: r.name, position: r.position, value: r.value,
        proTeam: r.proTeam, headshot: r.headshot, injuryStatus: r.injuryStatus,
      })
    }
    for (const p of picks.value as any[]) {
      const key = String(p.player_id ?? '')
      if (!key || universe.has(key)) continue
      const v = vorByKey.value[key]
      if (!v || !(v.pointsRos > 0)) continue
      universe.set(key, {
        playerKey: key,
        name: [p?.metadata?.first_name, p?.metadata?.last_name].filter(Boolean).join(' ') || key,
        position: String(p?.metadata?.position ?? v.position ?? ''),
        value: v.pointsRos,
        proTeam: String(p?.metadata?.team ?? '').toUpperCase(),
        headshot: headshotByKey.value[key],
        // Same Sleeper metadata the live path reads in `availablePlayers` — a
        // drafted player must not read as healthier than an available one just
        // because he came from the picks list instead of the pool.
        injuryStatus: playerMeta[key]?.injury_status ?? null,
      })
    }
    // Through the SAME pipeline the live board uses, so the replay is replaying
    // the tool you actually had on screen.
    const players = applyValuePipeline([...universe.values()])
    if (!players.length) return null

    const args = {
      shape: shape.value,
      picks: replayPicks,
      mySlot: mySlot.value,
      players,
      adpByKey: adp.value,
      tendencies: tendencies.value,
      /**
       * `teamKeyForSlot`, NOT `rosterIdForSlot`. `tendencies` is built from
       * `historicalPicks`, which is keyed by LEAGUE roster id — so the replay
       * has to ask "which league mate is sitting in this seat", not "which
       * roster of this draft holds it". In a practice-mode mock those are two
       * different numbering schemes that happen to overlap: both are small
       * sequential integers, so passing the mock's roster id silently looks up
       * a real but unrelated manager's draft history instead of erroring.
       *
       * The damage is not confined to the screen. The replay's survival numbers
       * and reason text would come from a scrambled seat->manager map while the
       * grid and recap label the same seat with the right person's name, and
       * `replay.calibration` is persisted into the saved `DraftRecord` and
       * merged by `pooledCalibration` across every record. Practice mocks file
       * as `kind: 'mock'`, indistinguishable from plain mocks, so the bad
       * evidence would permanently contaminate the pool the model is judged
       * against. With practice mode off `seatMap` is null and this falls
       * through to `rosterIdForSlot`, so nothing else changes.
       */
      teamKeyForSlot,
      slots: effectiveSlots.value ?? {},
      totalStarterSlots: starterSlots.value,
      runs: 200,
      seed: 1337,
    }
    const steps = replayDraft(args)

    /**
     * What listening would have been worth. Both rosters are scored the same way
     * the recap scores every team — best legal lineup by projected points — so
     * the comparison is like for like. One assumption, and it is a real one: the
     * other nine managers are held to the picks they actually made.
     */
    const meta = new Map(players.map((p) => [p.playerKey, p]))
    const lineupPoints = (keys: string[]): number => {
      const { rows } = buildLineup({
        slots: effectiveSlots.value ?? {},
        players: [...keys]
          .map((k) => meta.get(k))
          .filter(Boolean)
          // By POINTS, not by the ranking list. A lineup is set by who scores
          // most, and `value` now carries whichever analyst order is active.
          .sort((a, b) =>
            (vorByKey.value[b!.playerKey]?.pointsRos ?? 0) - (vorByKey.value[a!.playerKey]?.pointsRos ?? 0),
          )
          .map((p, i) => ({
            playerKey: p!.playerKey, name: p!.name, position: p!.position, overallPick: i,
          })),
      })
      return rows.reduce((n, r) => n + (r.player ? vorByKey.value[r.player.playerKey]?.pointsRos ?? 0 : 0), 0)
    }

    const myKeys = replayPicks
      .filter((p) => slotAtPick(shape.value!, p.overallPick) === mySlot.value)
      .map((p) => p.playerKey)
    const ourKeys = followRecommendations(args)

    return {
      steps,
      calibration: calibration(steps, replayPicks, adp.value),
      universe: players.length,
      metaByKey: Object.fromEntries(meta),
      outcome: {
        yours: Math.round(lineupPoints(myKeys)),
        ours: Math.round(lineupPoints(ourKeys)),
        ourPicks: ourKeys.map((k) => meta.get(k)).filter(Boolean),
      },
    }
  })

  /**
   * Finished drafts are archived automatically. Asking someone to press save at
   * the end of a draft is asking them to forget: the moment the last pick lands
   * they are talking to the room, not looking at this screen.
   */
  const history = useDraftHistory()
  watch(
    () => [recap.value, replay.value] as const,
    ([rc, rp]) => {
      const id = String(draftMeta.value?.draft_id ?? '')
      if (!id || !rc?.me) return
      const record: DraftRecord = {
        draftId: id,
        savedAt: new Date().toISOString(),
        season: String(draftMeta.value?.season ?? ''),
        // Deliberately NOT opponentModel: a practice room is a mock, and filing
        // it as a league draft would mix two populations in the History averages.
        kind: draftIsThisLeague.value ? 'league' : 'mock',
        teams: effectiveTeams.value,
        rounds: Number(draftMeta.value?.settings?.rounds) || 0,
        mySlot: mySlot.value,
        grade: rc.grade,
        rank: rc.me.rank,
        of: rc.teams.length,
        startingPoints: Math.round(rc.me.startingPoints),
        behindLeader: rc.behindLeader,
        positionEdge: rc.positionEdge,
        picks: myPicks.value.map((p: any) => ({
          overallPick: Number(p?.pick_no) || 0,
          playerKey: String(p?.player_id ?? ''),
          name: [p?.metadata?.first_name, p?.metadata?.last_name].filter(Boolean).join(' '),
          position: String(p?.metadata?.position ?? ''),
        })),
        outcome: rp?.outcome ? { yours: rp.outcome.yours, ours: rp.outcome.ours } : null,
        calibration: rp?.calibration ?? undefined,
      }
      history.save(record)
    },
    { deep: false },
  )

  const loading = computed(() => loadingDraft.value || vorLoading.value || src.loading.value)

  /** The board everyone pictures: rounds down, teams across, snake rows reversed. */
  const grid = computed(() => {
    if (!shape.value) return []
    const gp: GridPick[] = picks.value.map((p: any) => ({
      overallPick: Number(p.pick_no) || 0,
      playerKey: String(p.player_id ?? ''),
      playerName: [p?.metadata?.first_name, p?.metadata?.last_name].filter(Boolean).join(' ') || String(p.player_id ?? ''),
      position: String(p?.metadata?.position ?? ''),
      slot: Number(p.draft_slot) || 0,
      proTeam: String(p?.metadata?.team ?? '').toUpperCase(),
    }))
    return buildDraftGrid(shape.value, gp, {
      mySlot: mySlot.value,
      currentOverallPick: currentOverallPick.value,
    })
  })

  /**
   * Only this league's drafts get this league's names. In a mock the opponents
   * are bots, and labelling them with your league mates' team names invents a
   * room that isn't there — but the humans in the room have names, and yours is
   * one of them. Sleeper shows exactly this: real display names where there are
   * real people, `Team N` for the bots.
   *
   * Reads through `teamKeyForSlot`, not `rosterIdForSlot` directly: in a
   * practice room `rosterIdForSlot` returns the MOCK's roster id, which
   * collides numerically with an unrelated LEAGUE roster id. Without this,
   * the grid would label a seat with whichever league mate happens to hold
   * that same numeric id, while the tendency sentence and the simulation
   * (both routed through `teamKeyForSlot`) name someone else for that seat.
   */
  const teamNameForSlot = (slot: number) =>
    (opponentIdentity.value === 'real' ? src.teamNames.value?.[teamKeyForSlot(slot)] : null) ??
    draftUserNames.value[slot] ??
    `Team ${slot}`

  return {
    grid,
    teamNameForSlot,
    connectDraft,
    disconnectDraft,
    overrideDraftId: computed(() => overrideDraftId.value),
    overrideError: computed(() => overrideError.value),
    status,
    loading,
    board,
    recommendation,
    survival: computed(() => survivalResult.value.survival),
    myPick,
    myNextPick,
    isMyTurn,
    currentOverallPick,
    mySlot,
    shape,
    hasHistory,
    practiceMode,
    opponentIdentity,
    opponentModel,
    slotUnknown,
    customRankings,
    comparePool,
    boardByRank,
    boardTierByKey,
    draftedRows,
    listRankByKey,
    replay,
    upcoming,
    myPicks,
    myLineup,
    slotRanks,
    rankIfDrafted,
    recap,
    history,
    teamAvatarForSlot,
    starterSlots,
    effectiveSlots,
    draftedKeys,
    markDrafted,
    unmarkDrafted,
    syncHealthy: computed(() => pollFailures.value < BACKOFF_AFTER),
    refresh: pollPicks,
    leagueOrderKnown,
    seatMap,
    practiceAvailable,
    practiceUnavailableReason,
    reshuffleSeats,
    teamKeyForSlot,
  }
}
