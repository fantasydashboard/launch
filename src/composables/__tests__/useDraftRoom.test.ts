import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { localDraftKey } from '@/composables/useLocalDraft'

/**
 * The one test that stands the whole composable up.
 *
 * Every unit under this seam already has its own test and every one of them
 * passed while local drafts shipped with NO SEASON AT ALL: `leagueSeason` was
 * exported unwrapped off a Pinia setup store, the view read `.value` and got
 * `undefined`, and the ADP fetch asked Sleeper for a season-less projections
 * URL that 404s. The board then quietly re-sorted to raw projected points, the
 * edge column read "—" for every row and every player "lasted" 99%. Nothing
 * below this seam could have caught it, because the mistake WAS the seam.
 */

const hoisted = vi.hoisted(() => ({
  /**
   * Stands in for the Pinia store proxy. `currentSeason` is a PLAIN STRING here
   * on purpose: it is a `computed` inside a setup store, and reading it off the
   * store proxy unwraps it. Faking it as a ref would hide the exact bug.
   */
  store: {
    activeSport: 'football',
    activePlatform: 'sleeper',
    activeLeagueId: 'L1',
    currentUserId: null,
    currentLeague: { league_id: 'L1', season: '2025', scoring_settings: {}, settings: {} },
    currentSeason: '2025',
  } as any,
  /**
   * The user's roster id, as `useActivePointsSource` resolves it. Overridable
   * per test because `mySlot` — and therefore whether `buildRecap` can find
   * `me` at all — is derived from it by scanning `slot_to_roster_id`.
   */
  myTeamKey: 'r2' as string | null,
  fetchSeasonAdp: vi.fn(async () => ({} as Record<string, number>)),
  getLeagueDrafts: vi.fn(async () => [] as any[]),
  getDraftById: vi.fn(async (_id: string) => null as any),
  getDraftPicks: vi.fn(async (_id: string) => [] as any[]),
}))

vi.mock('@/stores/league', () => ({ useLeagueStore: () => hoisted.store }))

vi.mock('@/services/footballProjections', () => ({
  fetchSeasonAdp: hoisted.fetchSeasonAdp,
}))

vi.mock('@/services/sleeper', () => ({
  sleeperService: {
    getLeagueDrafts: hoisted.getLeagueDrafts,
    getDraftById: hoisted.getDraftById,
    getDraftPicks: hoisted.getDraftPicks,
  },
}))

vi.mock('@/composables/useActivePointsSource', async () => {
  const { ref, computed } = await import('vue')
  return {
    useActivePointsSource: () => ({
      pool: ref([]),
      freeAgents: ref([]),
      rosterSlots: ref({ QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1 }),
      loading: ref(false),
      myTeamKey: computed(() => hoisted.myTeamKey),
      myTeamName: computed(() => 'Mine'),
      myTeamLogo: computed(() => ''),
      myRecord: computed(() => null),
      leagueSize: computed(() => 4),
      leagueSizeSource: computed(() => 'test'),
      teamNames: computed(() => ({ r1: 'A', r2: 'B', r3: 'C', r4: 'D' })),
      teamMeta: computed(() => ({})),
      teamLogos: computed(() => ({})),
      freeAgentsLoading: ref(false),
      load: vi.fn(),
      loadFreeAgents: vi.fn(),
    }),
  }
})

vi.mock('@/composables/useFootballVor', async () => {
  const { ref } = await import('vue')
  return {
    useFootballVor: () => ({ vorByKey: ref({}), audit: ref(null), loading: ref(false), load: vi.fn() }),
  }
})

vi.mock('@/composables/useCustomRankings', async () => {
  const { computed } = await import('vue')
  return {
    UFD_LABEL: 'UFD',
    useCustomRankings: () => ({
      enabled: computed(() => false),
      match: () => ({ rankByKey: {}, tierByKey: {}, unmatched: [], ambiguous: [] }),
      applyTo: () => ({}),
      compare: () => null,
    }),
  }
})

// `vi.mock` is hoisted above this, so the composable resolves the fakes.
import { useDraftRoom } from '@/composables/useDraftRoom'

type Room = ReturnType<typeof useDraftRoom>

let wrapper: VueWrapper<any> | null = null

function mountRoom(): Room {
  let api!: Room
  const C = defineComponent({
    setup() {
      api = useDraftRoom()
      return () => h('div')
    },
  })
  wrapper = mount(C)
  return api
}

const SEATS = { 1: 'r1', 2: 'r2', 3: 'r3', 4: 'r4' }

/** A stored draft exactly as `useLocalDraft.write` leaves it. */
function seedLocalDraft(extra: Record<string, unknown>) {
  localStorage.setItem(
    localDraftKey('L1'),
    JSON.stringify({
      leagueId: 'L1',
      teams: 4,
      rounds: 2,
      type: 'snake',
      slotToRosterId: SEATS,
      mySlot: 2,
      picks: [],
      startedAt: '2025-08-01T00:00:00.000Z',
      updatedAt: '2025-08-01T00:00:00.000Z',
      ...extra,
    }),
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  hoisted.store.activeLeagueId = 'L1'
  hoisted.store.currentSeason = '2025'
  hoisted.myTeamKey = 'r2'
  hoisted.fetchSeasonAdp.mockResolvedValue({})
  hoisted.getLeagueDrafts.mockResolvedValue([])
  hoisted.getDraftById.mockResolvedValue(null)
  hoisted.getDraftPicks.mockResolvedValue([])
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

describe('useDraftRoom — the season actually reaches the ADP fetch', () => {
  it('exports leagueSeason as a REF, not the unwrapped store string', async () => {
    const room = mountRoom()
    await flushPromises()

    // The whole bug in one assertion: pre-fix this was `undefined`, because
    // `leagueStore.currentSeason` unwraps to a plain string on property access
    // and `DraftRoomView` reads `leagueSeason.value`.
    expect(room.leagueSeason.value).toBe('2025')
    expect(String(room.leagueSeason.value ?? '')).not.toBe('')
  })

  it('carries the season all the way from the store into the stored draft and the ADP request', async () => {
    const room = mountRoom()
    await flushPromises()

    // Exactly what DraftRoomView's `startLocalDraft` does (DraftRoomView.vue:158).
    room.localDraft.start({
      leagueId: '',
      season: room.leagueSeason.value,
      teams: 4,
      rounds: 2,
      type: 'snake',
      slotToRosterId: SEATS,
      mySlot: 2,
    })
    await flushPromises()

    expect(room.localMode.value).toBe(true)
    expect(room.localDraft.draft.value!.season).toBe('2025')
    // `JSON.stringify` DROPS an undefined value, so a broken season does not
    // even survive as a key — assert on the persisted bytes, not just memory.
    const stored = JSON.parse(localStorage.getItem(localDraftKey('L1'))!)
    expect(stored.season).toBe('2025')

    expect(hoisted.fetchSeasonAdp).toHaveBeenCalled()
    const [season] = hoisted.fetchSeasonAdp.mock.calls.at(-1) as unknown as [string, unknown]
    expect(season).toBe('2025')
  })

  it('falls back to the store for a draft already in localStorage with no season key', async () => {
    // Every draft written by the deployed build looks like this: `season:
    // undefined` was stringified away. Fixing the export alone leaves these
    // rehearsals on an empty ADP map forever, because nothing rewrites them.
    seedLocalDraft({})
    const room = mountRoom()
    await flushPromises()

    expect(room.localMode.value).toBe(true)
    expect(room.localDraft.draft.value!.season).toBeUndefined()
    expect(hoisted.fetchSeasonAdp).toHaveBeenCalled()
    const [season] = hoisted.fetchSeasonAdp.mock.calls.at(-1) as unknown as [string, unknown]
    expect(season).toBe('2025')
  })

  it('never asks Sleeper for a season-less projections URL', async () => {
    seedLocalDraft({ season: '2024' })
    mountRoom()
    await flushPromises()

    for (const call of hoisted.fetchSeasonAdp.mock.calls) {
      expect(String((call as unknown as [string])[0])).not.toBe('')
    }
    const [season] = hoisted.fetchSeasonAdp.mock.calls.at(-1) as unknown as [string, unknown]
    // The draft's OWN season still wins when it has one — a rehearsal of last
    // year's league must not be anchored to this year's market.
    expect(season).toBe('2024')
  })
})

describe('useDraftRoom — a finished local draft reopens at all', () => {
  it('still forgets a stale record when a LOCAL draft is undone back out of complete', async () => {
    // The behaviour Fix 2 must not lose: History showing a graded, finished
    // draft that is actually one pick short.
    seedLocalDraft({
      season: '2025',
      teams: 2,
      rounds: 1,
      slotToRosterId: { 1: 'r1', 2: 'r2' },
      picks: [
        { overall: 1, playerKey: 'p1', name: 'A B', position: 'RB', proTeam: 'ATL' },
        { overall: 2, playerKey: 'p2', name: 'C D', position: 'WR', proTeam: 'SF' },
      ],
    })
    const room = mountRoom()
    await flushPromises()

    // A full draft archives itself: that is the record undo must clear.
    const id = 'local:L1:2025-08-01T00:00:00.000Z'
    expect(room.recap.value).not.toBeNull()
    expect(room.history.has(id)).toBe(true)

    room.localDraft.undo()
    await flushPromises()

    expect(room.recap.value).toBeNull()
    expect(room.history.has(id)).toBe(false)
  })
})
