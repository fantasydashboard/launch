import { computed, ref, watch, type ComputedRef } from 'vue'
import { sleeperService } from '@/services/sleeper'
import { useFootballVor } from './useFootballVor'
import { publicNflPool, PUBLIC_POSITIONS } from '@/football/publicPool'
import { buildRankingsBoard, type BoardEntryInput, type BoardRow } from '@/football/footballWire'
import { DEFAULT_NFL_SLOTS } from '@/trades/rosterSlots'
import type { PointsPoolPlayer } from '@/myteam/pointsTeam'
import type { AvailablePlayer } from '@/players/types'

/** A twelve-team league, which is what replacement level is calibrated against by default. */
export const PUBLIC_TEAMS = 12

/** The last week of the NFL regular season. Mirrors PointsWireView's NFL_LAST_WEEK. */
const NFL_LAST_WEEK = 17

/**
 * Weeks still to play.
 *
 * The tier rule measures indifference in points per WEEK, so this is what converts a
 * rest-of-season value into it — which makes a wrong answer here invisible rather than loud:
 * it produces plausible tiers that are the wrong width.
 *
 * Both ends are clamped, and they clamp to opposite answers. Past the regular season there is
 * one week left rather than zero, because zero divides the tier rule by nothing. Before it —
 * the offseason, where Sleeper reports week 0 — the whole season is still ahead, and saying
 * "one week left" there would draw every tier seventeen times too narrow and call half the
 * league interchangeable.
 */
export function publicWeeksLeft(currentWeek: number): number {
  const wk = Number(currentWeek)
  if (!Number.isFinite(wk) || wk < 1) return NFL_LAST_WEEK
  return Math.max(1, NFL_LAST_WEEK - wk + 1)
}

/**
 * The rest-of-season board for somebody with no league.
 *
 * Every number on it comes from the same pipeline the Wire runs — the same projections, the
 * same rest-of-season blend, the same replacement levels, the same tier rule. What differs is
 * only the inputs: the whole NFL instead of one roster plus one wire, and a default league
 * shape instead of a real one. Nothing about the ranking is a second, simpler version of the
 * real thing, because a public board that disagreed with the signed-in one would be worse than
 * no public board at all.
 */
export function usePublicRankings(): {
  board: ComputedRef<Record<string, BoardRow[]>>
  positions: ComputedRef<string[]>
  loading: ComputedRef<boolean>
  ready: ComputedRef<boolean>
} {
  const pool = ref<PointsPoolPlayer[]>([])
  const freeAgents = ref<AvailablePlayer[]>([])
  const season = ref('')
  const currentWeek = ref(1)
  const enabled = ref(false)
  const slots = ref<Record<string, number>>({ ...DEFAULT_NFL_SLOTS })
  const teams = ref(PUBLIC_TEAMS)
  const keysAreSleeperIds = ref(true)
  const loadingPool = ref(true)

  /* No weekly fetches. This board is rest-of-season only, and vorRos does not read the weekly
     maps — so the default horizon of 4 was eight sequential round trips bought for nothing,
     on the page social traffic lands on. It also keeps this-week projections off the free
     path, where they do not belong. */
  const { vorByKey, loading: loadingVor } = useFootballVor({
    pool, freeAgents, slots, teams, season, enabled, keysAreSleeperIds, weeklyHorizon: 0,
  })

  async function loadPool() {
    loadingPool.value = true
    try {
      const [state, players] = await Promise.all([
        sleeperService.getNflState(),
        sleeperService.getPlayers(),
      ])
      season.value = String(state.season ?? '')
      /* Sleeper counts preseason weeks in the same field. Reading week 3 of the PRESEASON as
         week 3 of the season would cut the horizon by a fifth and draw every tier too narrow,
         through exactly the stretch this page exists to catch. */
      const regular = String(state.season_type ?? 'regular') === 'regular'
      currentWeek.value = regular ? (Number(state.week) || 1) : 0
      pool.value = publicNflPool(players as Record<string, any>)
      enabled.value = pool.value.length > 0
    } catch (e) {
      console.error('[usePublicRankings] pool load failed', e)
      pool.value = []
      enabled.value = false
    } finally {
      loadingPool.value = false
    }
  }
  void loadPool()

  const board = computed<Record<string, BoardRow[]>>(() => {
    if (!Object.keys(vorByKey.value).length) return {}
    const entries: BoardEntryInput[] = []
    for (const p of pool.value) {
      const v = vorByKey.value[p.playerKey]
      /* No projection, no row. On the Wire an unprojected player is still shown, because he
         is on somebody's roster and his absence from the board would be its own lie. Nobody
         rosters anybody here, so a player we cannot price simply has nothing to say. */
      if (!v) continue
      entries.push({
        playerKey: p.playerKey,
        name: p.name,
        position: p.position,
        team: p.proTeam,
        headshot: p.headshot,
        vorRos: v.vorRos,
        owned: false,
        free: false,
      })
    }
    return buildRankingsBoard({
      entries,
      positions: [...PUBLIC_POSITIONS],
      weeksLeft: publicWeeksLeft(currentWeek.value),
    })
  })

  const positions = computed(() => {
    const withRows = PUBLIC_POSITIONS.filter((p) => board.value[p]?.length)
    return board.value.ALL?.length ? ['ALL', ...withRows] : [...withRows]
  })

  /*
   * Whether the value pipeline has finished at least one run since the pool arrived.
   *
   * Without this the page flashes its failure card on a healthy load: loadPool resolves and
   * drops `loadingPool`, but useFootballVor's watcher has not fired yet, so its own `loading`
   * is still false as well — one tick in which nothing is loading and nothing is ready, which
   * a view can only read as "the feed is down".
   *
   * Deliberately a SETTLED flag and not a has-data one. A pipeline that finishes with an empty
   * map has still finished, and the page has to be allowed to say so; treating empty as "still
   * loading" would spin forever on a season with no projections.
   */
  const vorSettled = ref(false)
  watch(loadingVor, (now, before) => { if (before && !now) vorSettled.value = true })

  const loading = computed(
    () => loadingPool.value || loadingVor.value || (enabled.value && !vorSettled.value),
  )
  const ready = computed(() => !!board.value.ALL?.length)

  return { board, positions, loading, ready }
}
