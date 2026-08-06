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
import { buildRecommendation, type Recommendation } from '@/draft/room/recommend'

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
  const { vorByKey, loading: vorLoading } = useFootballVor({
    pool: src.pool,
    freeAgents: src.freeAgents,
    slots: src.rosterSlots,
    teams: src.leagueSize,
    season,
    enabled,
    weeklyHorizon: 0, // draft prep is rest-of-season only
  })

  // ── draft meta + picks ────────────────────────────────────────────────────
  const draftMeta = ref<any | null>(null)
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

  async function loadDraft() {
    if (!enabled.value || !leagueStore.activeLeagueId) return
    loadingDraft.value = true
    try {
      const drafts = await sleeperService.getLeagueDrafts(String(leagueStore.activeLeagueId))
      const id = drafts?.[0]?.draft_id
      if (!id) { draftMeta.value = null; picks.value = []; return }
      const [meta, p] = await Promise.all([
        sleeperService.getDraftById(id),
        sleeperService.getDraftPicks(id),
      ])
      draftMeta.value = meta
      picks.value = p

      const variant = adpVariantFor(
        (leagueStore.currentLeague as any)?.scoring_settings ?? {},
        src.rosterSlots.value ?? {},
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
      teams: Number(m.settings?.teams) || src.leagueSize.value,
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

  /** My draft slot, from Sleeper's slot -> roster_id map. */
  const mySlot = computed<number | null>(() => {
    const map = draftMeta.value?.slot_to_roster_id as Record<string, number> | undefined
    const mine = src.myTeamKey.value
    if (!map || !mine) return null
    for (const [slot, rosterId] of Object.entries(map)) {
      if (String(rosterId) === String(mine)) return Number(slot)
    }
    return null
  })

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
    const rows: { playerKey: string; name: string; position: string; proTeam?: string; headshot?: string; value: number; opportunity?: string }[] = []

    const push = (playerKey: string, name: string, position: string, proTeam?: string, headshot?: string) => {
      if (!playerKey || drafted.has(playerKey) || seen.has(playerKey)) return
      const v = vorByKey.value[playerKey]
      if (!v) return
      seen.add(playerKey)
      rows.push({ playerKey, name, position, proTeam, headshot, value: v.pointsRos, opportunity: v.opportunity })
    }

    for (const fa of src.freeAgents.value) push(fa.playerKey, fa.name, fa.position, fa.team, fa.headshot)
    for (const p of src.pool.value) push(p.playerKey, p.name, p.position, p.proTeam, p.headshot)
    return rows
  })

  const survivalResult = computed(() =>
    simulateSurvival({
      available: availablePlayers.value.map((p) => ({
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
    picks.value.filter((p) => String(p?.roster_id ?? '') === String(src.myTeamKey.value)),
  )

  const starterSlots = computed(() => {
    const slots = src.rosterSlots.value ?? {}
    return Object.entries(slots)
      .filter(([k]) => k !== 'BN' && k !== 'IR' && k !== 'TAXI')
      .reduce((n, [, v]) => n + (Number(v) || 0), 0)
  })

  const board = computed<BoardRow[]>(() =>
    buildBoard({
      available: availablePlayers.value,
      survival: survivalResult.value.survival,
      expectedBestAtPosition: survivalResult.value.expectedBestAtPosition,
      adpByKey: adp.value,
      currentOverallPick: myPick.value ?? currentOverallPick.value,
      filledStarterSlots: Math.min(myPicks.value.length, starterSlots.value),
      totalStarterSlots: starterSlots.value,
    }),
  )

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
      tierRemaining: Math.max(0, sameTier.length - 1),
      nextTierDrop: nextTier ? top.value - nextTier.value : undefined,
    })
  })

  const loading = computed(() => loadingDraft.value || vorLoading.value || src.loading.value)

  return {
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
    upcoming,
    myPicks,
    starterSlots,
    draftedKeys,
    markDrafted,
    unmarkDrafted,
    syncHealthy: computed(() => pollFailures.value < BACKOFF_AFTER),
    refresh: pollPicks,
  }
}
