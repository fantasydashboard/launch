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
import { buildRecommendation, type Recommendation } from '@/draft/room/recommend'
import { parseDraftId } from '@/draft/room/draftId'
import { buildDraftGrid, type GridPick } from '@/draft/room/draftGrid'
import { slotsFromDraftSettings, scoringFromDraftMetadata } from '@/draft/room/draftSettings'
import { replayDraft, calibration, type ReplayPick } from '@/draft/room/replay'
import { useCustomRankings } from '@/composables/useCustomRankings'

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
      if (draftMeta.value?.status === 'drafting') startPolling()
    })
  }
  onMounted(init)
  onUnmounted(stopPolling)
  watch(() => leagueStore.activeLeagueId, init)
  watch(() => draftMeta.value?.status, (s) => (s === 'drafting' ? startPolling() : stopPolling()))

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

  // ── tendencies from league history ────────────────────────────────────────
  const historicalPicks = computed<HistoricalPick[]>(() => {
    const out: HistoricalPick[] = []
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

  const rosterIdForSlot = (slot: number): string => {
    const map = draftMeta.value?.slot_to_roster_id as Record<string, number> | undefined
    return String(map?.[String(slot)] ?? '')
  }

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
      const teamKey = rosterIdForSlot(slot)
      return {
        teamKey,
        teamName: src.teamNames.value?.[teamKey] ?? `Team ${slot}`,
        prior: priorFor(tendencies.value, teamKey, bucketForMyPick.value),
      }
    }),
  )

  // ── board ─────────────────────────────────────────────────────────────────
  const availablePlayers = computed(() => {
    const drafted = draftedKeys.value
    const seen = new Set<string>()
    const rows: { playerKey: string; name: string; position: string; proTeam?: string; headshot?: string; value: number; opportunity?: string; depthChartOrder?: number | null }[] = []

    const meta = (leagueStore.players ?? {}) as Record<string, any>
    const push = (playerKey: string, name: string, position: string, proTeam?: string, headshot?: string) => {
      if (!playerKey || drafted.has(playerKey) || seen.has(playerKey)) return
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
  const adjustedPlayers = computed(() => {
    const base = availablePlayers.value
    if (!base.length) return base
    const anchored = applyAdpAnchor(base, adp.value, DEFAULT_ADP_WEIGHT)
    return base.map((p) => ({ ...p, value: anchored[p.playerKey] ?? p.value }))
  })

  // Admin-only: an analyst's ordering mapped onto our value curve. Off (and
  // invisible) for every other account. Applied last so it overrides ours.
  const customRankings = useCustomRankings()
  const rankedPlayers = computed(() => {
    const base = adjustedPlayers.value.map((p) => ({ ...p, projected: p.value }))
    const remap = customRankings.applyTo(base)
    if (!Object.keys(remap).length) return base
    // `value` becomes the ranking device; `projected` stays our own number.
    return base.map((p) => ({ ...p, value: remap[p.playerKey] ?? p.value }))
  })

  const survivalResult = computed(() =>
    simulateSurvival({
      available: rankedPlayers.value.map((p) => ({
        playerKey: p.playerKey,
        position: p.position,
        adp: adp.value[p.playerKey] ?? null,
        value: p.value,
      })),
      upcomingSlots: upcomingSlots.value,
      priorForSlot: (slot) => priorFor(tendencies.value, rosterIdForSlot(slot), bucketForMyPick.value),
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

  const starterSlots = computed(() => {
    const slots = effectiveSlots.value ?? {}
    return Object.entries(slots)
      .filter(([k]) => k !== 'BN' && k !== 'IR' && k !== 'TAXI')
      .reduce((n, [, v]) => n + (Number(v) || 0), 0)
  })

  const board = computed<BoardRow[]>(() =>
    buildBoard({
      available: rankedPlayers.value,
      survival: survivalResult.value.survival,
      expectedBestAtPosition: survivalResult.value.expectedBestAtPosition,
      adpByKey: adp.value,
      currentOverallPick: myPick.value ?? currentOverallPick.value,
      filledStarterSlots: Math.min(myPicks.value.length, starterSlots.value),
      totalStarterSlots: starterSlots.value,
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
      const offset = ranked.length
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
    const samePos = rows.filter((r) => r.position === top.position)
    const sameTier = samePos.filter((r) => r.tier === top.tier)
    const nextTier = samePos.find((r) => r.tier > top.tier)
    return buildRecommendation(rows, {
      nextPick: myNextPick.value,
      upcoming: upcoming.value,
      roundRange: BUCKET_RANGE[bucketForMyPick.value],
      tierRemaining: Math.max(0, sameTier.length - 1),
      nextTierDrop: nextTier ? top.value - nextTier.value : undefined,
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
    const universe = new Map<string, { playerKey: string; name: string; position: string; value: number }>()
    for (const r of availablePlayers.value) {
      universe.set(r.playerKey, { playerKey: r.playerKey, name: r.name, position: r.position, value: r.value })
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
      })
    }
    const players = [...universe.values()]
    if (!players.length) return null

    const steps = replayDraft({
      shape: shape.value,
      picks: replayPicks,
      mySlot: mySlot.value,
      players,
      adpByKey: adp.value,
      tendencies: tendencies.value,
      rosterIdForSlot,
      totalStarterSlots: starterSlots.value,
      runs: 200,
      seed: 1337,
    })
    return { steps, calibration: calibration(steps, replayPicks), universe: players.length }
  })

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
    }))
    return buildDraftGrid(shape.value, gp, {
      mySlot: mySlot.value,
      currentOverallPick: currentOverallPick.value,
    })
  })

  const teamNameForSlot = (slot: number) =>
    src.teamNames.value?.[rosterIdForSlot(slot)] ?? `Team ${slot}`

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
    slotUnknown,
    customRankings,
    comparePool,
    boardByRank,
    boardTierByKey,
    listRankByKey,
    replay,
    upcoming,
    myPicks,
    starterSlots,
    effectiveSlots,
    draftedKeys,
    markDrafted,
    unmarkDrafted,
    syncHealthy: computed(() => pollFailures.value < BACKOFF_AFTER),
    refresh: pollPicks,
  }
}
