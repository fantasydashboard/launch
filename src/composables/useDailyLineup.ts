import { computed, ref, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useActivePointsSource } from '@/composables/useActivePointsSource'
import { usePointsValue } from '@/composables/usePointsValue'
import { assignSlots, type DepthPlayer } from '@/trades/positionalLandscape'
import { getNhlSchedule } from '@/services/nhlSchedule'
import { getWeekSchedule, type WeekSchedule } from '@/services/mlbSchedule'

/**
 * Who to start tonight, out of the players you already have.
 *
 * THE QUESTION A DAILY SPORT ACTUALLY ASKS. Football's weekly board can rank a roster once
 * and be done; a hockey manager sets a lineup every night, and the answer changes nightly for
 * a reason that has nothing to do with talent — a 200-point winger is worth zero on a night
 * his team is idle. So the projection here is not "how good is he" but "what does he score
 * TONIGHT", which is his per-game rate on a night he plays and nothing at all on a night he
 * does not.
 *
 * WHY THE BENCH MATTERS AS MUCH AS THE LINEUP. The most common way to lose a night in a daily
 * league is not starting a bad player, it is starting a player with no game while a healthy
 * body sits. That is invisible in every native app, which shows a lineup without telling you
 * which of its seats are dead. Both lists are returned, and the reason a player is benched is
 * carried with him.
 */

const EMPTY: WeekSchedule = { gamesByTeam: {}, startsByPitcher: {}, homeTeamByTeam: {} }

export type BenchReason = 'no-game' | 'outscored' | 'injured'

export interface DailyRow {
  playerKey: string
  name: string
  position: string
  team: string
  /** Projected points TONIGHT. Zero when he does not play. */
  today: number
  /** His rate per game played, which is what `today` is drawn from. */
  perGame: number
  playsToday: boolean
  status: string
  /** The slot he fills in the optimal lineup, or null when he is benched. */
  slot: string | null
  benchReason: BenchReason | null
}

const ymd = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function useDailyLineup() {
  const leagueStore = useLeagueStore()
  const source = useActivePointsSource()
  const value = usePointsValue({
    pool: source.pool,
    fgByKey: source.fgByKey,
    sport: computed(() => leagueStore.activeSport),
    season: computed(() => String(leagueStore.currentSeason ?? new Date().getFullYear())),
    leagueId: computed(() => String(leagueStore.activeLeagueId ?? '')),
  })

  const schedule = ref<WeekSchedule>({ ...EMPTY })
  const scheduleLoading = ref(false)

  async function loadSchedule() {
    scheduleLoading.value = true
    try {
      const today = ymd(new Date())
      schedule.value = leagueStore.activeSport === 'hockey'
        ? await getNhlSchedule(today, today)
        : await getWeekSchedule(today, today)
    } catch {
      schedule.value = { ...EMPTY }
    } finally {
      scheduleLoading.value = false
    }
  }
  watch(() => [leagueStore.activeSport, leagueStore.activeLeagueId], loadSchedule, { immediate: true })

  const playsToday = (team: string) => (schedule.value.gamesByTeam[String(team || '').toUpperCase()] ?? 0) > 0

  /** Anyone on my roster, with tonight's projection attached. */
  const myPlayers = computed<DailyRow[]>(() => {
    const mine = source.pool.value.filter((p) => p.teamKey === source.myTeamKey.value)
    return mine.map((p) => {
      const v = value.valueByKey.value[p.playerKey]
      const perGame = v && v.games > 0 ? v.total / v.games : 0
      const plays = playsToday(p.proTeam ?? '')
      return {
        playerKey: p.playerKey,
        name: p.name,
        position: p.position,
        team: p.proTeam ?? '',
        perGame,
        today: plays ? perGame : 0,
        playsToday: plays,
        status: p.status ?? '',
        slot: null,
        benchReason: null,
      }
    })
  })

  /**
   * Tonight's optimal lineup.
   *
   * A player with no game is given a value of zero rather than being filtered out, so he can
   * still occupy a seat nobody else is eligible for — a league starting two goalies on a
   * night only one of yours plays has a seat that must be filled by somebody, and reporting
   * it EMPTY would be a different and wronger claim than reporting it filled with a man who
   * scores nothing.
   */
  const assignment = computed(() => {
    const slots = source.rosterSlots.value
    if (!Object.keys(slots).length) return null
    const depth: DepthPlayer[] = myPlayers.value.map((r) => ({
      playerKey: r.playerKey,
      teamKey: 'me',
      eligiblePositions: (r.position || '').split(/[,/|]/).map((t) => t.trim().toUpperCase()).filter(Boolean),
      value: r.today,
      status: r.status,
    }))
    /* Bar of zero: a nought-point body still fills a seat, and the alternative is an empty
       slot that scores exactly the same and looks like a mistake. */
    return assignSlots(depth, slots, 0)
  })

  const rows = computed<DailyRow[]>(() => {
    const a = assignment.value
    const slotOf = new Map<string, string>()
    if (a) for (const [pos, keys] of Object.entries(a.assignedByPos)) for (const k of keys) slotOf.set(k, pos)
    return myPlayers.value.map((r) => {
      const slot = slotOf.get(r.playerKey) ?? null
      const benchReason: BenchReason | null = slot ? null
        : !r.playsToday ? 'no-game'
        : r.status && r.status !== 'ACTIVE' ? 'injured'
        : 'outscored'
      return { ...r, slot, benchReason }
    })
  })

  /** In slot order, so the lineup reads the way the league's own lineup page does. */
  const lineup = computed(() => {
    const order = Object.keys(source.rosterSlots.value)
    return rows.value
      .filter((r) => r.slot)
      .sort((a, b) => {
        const d = order.indexOf(a.slot!) - order.indexOf(b.slot!)
        return d !== 0 ? d : b.today - a.today
      })
  })

  const bench = computed(() => rows.value.filter((r) => !r.slot).sort((a, b) => b.today - a.today))

  /**
   * Seats filled by somebody who is not playing.
   *
   * The loudest thing on the page when it happens, because it is points forfeited outright
   * and no native app says a word about it.
   */
  const deadSeats = computed(() => lineup.value.filter((r) => !r.playsToday))

  /** A bench player who would outscore a starter tonight — the actual move to make. */
  const upgrades = computed(() => {
    const out: { sit: DailyRow; start: DailyRow; gain: number }[] = []
    const benchByEligibility = bench.value.filter((b) => b.playsToday && b.today > 0)
    for (const seat of lineup.value) {
      const better = benchByEligibility.find(
        (b) => b.today > seat.today && positionsFit(b.position, seat.slot ?? ''),
      )
      if (better) out.push({ sit: seat, start: better, gain: better.today - seat.today })
    }
    return out.sort((a, b) => b.gain - a.gain)
  })

  const loading = computed(() => source.loading.value || value.loading.value || scheduleLoading.value)
  const gamesTonight = computed(() => Object.keys(schedule.value.gamesByTeam).length > 0)

  function load() {
    source.load()
    value.load()
    loadSchedule()
  }

  return { rows, lineup, bench, deadSeats, upgrades, loading, gamesTonight, playsToday, load }
}

/** Whether a player's position list can fill a given slot, flex slots included. */
function positionsFit(position: string, slot: string): boolean {
  if (!slot) return false
  const mine = (position || '').split(/[,/|]/).map((t) => t.trim().toUpperCase()).filter(Boolean)
  if (mine.includes(slot.toUpperCase())) return true
  const FLEX: Record<string, string[]> = {
    F: ['C', 'LW', 'RW'],
    UTIL: ['C', 'LW', 'RW', 'D', '1B', '2B', '3B', 'SS', 'OF', 'DH'],
  }
  return (FLEX[slot.toUpperCase()] ?? []).some((p) => mine.includes(p))
}
