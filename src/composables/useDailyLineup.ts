import { computed, ref, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useActivePointsSource } from '@/composables/useActivePointsSource'
import { usePointsValue } from '@/composables/usePointsValue'
import { assignSlots, type DepthPlayer } from '@/trades/positionalLandscape'
import { getNhlSchedule } from '@/services/nhlSchedule'
import { getWeekSchedule, type WeekSchedule } from '@/services/mlbSchedule'
import { useEspnCategoryTeamData } from '@/composables/useEspnCategoryTeamData'
import { getLeagueType } from '@/config/sports'

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

/** A row on tonight's ranked board: anyone with a game, rostered or not. */
export interface RankedRow {
  playerKey: string
  name: string
  headshot?: string
  position: string
  team: string
  today: number
  status: string
  owner: 'mine' | 'rostered' | 'free'
  ownerName: string
}

export interface DailyRow {
  playerKey: string
  name: string
  headshot?: string
  position: string
  team: string
  /** Projected points TONIGHT. Zero when he does not play. */
  today: number
  /** His rate per game played, which is what `today` is drawn from. */
  perGame: number
  playsToday: boolean
  status: string
  /** The slot he fills in the optimal lineup, or null when he is benched there. */
  slot: string | null
  /** The slot the league ACTUALLY has him in right now, or null when he is benched. */
  startedSlot: string | null
  benchReason: BenchReason | null
}

const ymd = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function useDailyLineup() {
  const leagueStore = useLeagueStore()

  /*
   * A CATEGORY LEAGUE HAS A DIFFERENT SOURCE, and using the wrong one is not a degraded
   * result — it is nothing at all. useEspnPointsTeamData sets `supported = false` the moment
   * it sees H2H_CATEGORY or ROTO and returns an empty pool, empty slots and no team name,
   * which is exactly what the page showed: "My Team", 0.0, "the league published none".
   * Both sources publish the same three things this composable needs — pool, rosterSlots and
   * my team key — so the choice is a swap rather than a second implementation.
   */
  const isCategory = computed(() => {
    /* SleeperLeague's type has no scoring_type, and the store's currentLeague is typed as
       that shape even when it holds an ESPN league — the same cast the other callers use. */
    const live = (leagueStore.currentLeague as any)?.scoring_type
    const saved = leagueStore.savedLeagues?.find((l: any) => l.league_id === leagueStore.activeLeagueId)
    return getLeagueType(live ?? (saved as any)?.scoring_type) !== 'points'
  })

  const pointsSource = useActivePointsSource()
  const catSource = useEspnCategoryTeamData()

  const source = {
    pool: computed(() => (isCategory.value ? catSource.pool.value : pointsSource.pool.value)),
    fgByKey: pointsSource.fgByKey,
    rosterSlots: computed(() =>
      isCategory.value ? catSource.rosterSlots.value : pointsSource.rosterSlots.value),
    myTeamKey: computed(() =>
      isCategory.value ? (catSource.myTeamId.value ?? '') : pointsSource.myTeamKey.value),
    freeAgents: computed(() =>
      isCategory.value ? (catSource.freeAgents.value ?? []) : (pointsSource.freeAgents?.value ?? [])),
    teamNames: pointsSource.teamNames,
    /* Wired for pool, slots and team key and forgotten here, so a category league kept the
       "My Team" placeholder — the same miss as the load() one. */
    myTeamName: computed(() => (isCategory.value
      ? (catSource.standings.value?.find((r: any) => `espn_${r.team?.teamId}` === catSource.myTeamId.value)?.team?.name ?? '')
      : pointsSource.myTeamName.value)),
    myTeamLogo: computed(() => (isCategory.value ? '' : pointsSource.myTeamLogo.value)),
    loading: computed(() => (isCategory.value ? catSource.loading.value : pointsSource.loading.value)),
    load: () => { if (isCategory.value) catSource.load(); else pointsSource.load() },
    loadFreeAgents: () => { if (!isCategory.value) pointsSource.loadFreeAgents?.() },
  }
  const value = usePointsValue({
    pool: pointsSource.pool,
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
        headshot: p.headshot,
        position: p.position,
        team: p.proTeam ?? '',
        perGame,
        today: plays ? perGame : 0,
        playsToday: plays,
        status: p.status ?? '',
        slot: null,
        /* From the platform's own lineup, not ours — this is what is set, not what we advise. */
        startedSlot: p.lineupSlot && !/^(BE|Bench|IR|IL|NA|DL)$/i.test(String((p as any).lineupSlot))
          ? String((p as any).lineupSlot)
          : null,
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

  /**
   * WHAT YOU ARE ACTUALLY STARTING, as the league has it set right now.
   *
   * Shown beside the optimal so the toggle is a comparison rather than a claim. A page that
   * only shows the optimal is telling a manager what to do without showing what he is doing,
   * and the gap between the two IS the decision.
   */
  const current = computed(() => {
    /*
     * ESPN's own slot labels are finer than the league's slot COUNTS: it writes LF, CF and RF
     * where the league publishes OF, so indexOf came back -1 for most rows and the sort did
     * nothing — the lineup rendered in roster order with a corner infielder wedged between
     * six pitchers. Anything the league does not name sorts after what it does, in its own
     * alphabetical order, rather than falling to a single -1 bucket where ties are arbitrary.
     */
    const order = Object.keys(source.rosterSlots.value)
    const rank = (slot: string) => {
      const i = order.indexOf(slot)
      return i === -1 ? order.length : i
    }
    return rows.value
      .filter((r) => r.startedSlot)
      .sort((a, b) => {
        const d = rank(a.startedSlot!) - rank(b.startedSlot!)
        if (d !== 0) return d
        const s = (a.startedSlot ?? '').localeCompare(b.startedSlot ?? '')
        return s !== 0 ? s : b.today - a.today
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

  /**
   * TONIGHT'S RANKINGS — everybody with a game, wherever they are rostered.
   *
   * The same list football puts at the foot of its weekly page, asking the daily question
   * instead: not "who is good" but "who scores tonight". That difference reorders it heavily.
   * A star on a dark night is absent from this list entirely rather than ranked low, because
   * ranking him low implies he is a worse play than the man above him, and he is not a play
   * at all.
   *
   * Free agents are folded in beside rostered players for the same reason the draft board
   * mixes them: on any given night the best available body is frequently unowned, and a list
   * that only shows what is taken cannot tell you that.
   */
  const rankings = computed<RankedRow[]>(() => {
    /*
     * A CATEGORY LEAGUE GETS NO LIST AT ALL, rather than a list built on the wrong maths.
     *
     * This ranked 537 players to one decimal on a page whose lineup panel, eight inches
     * above, said "we can't rank these yet" — the same data contradicting itself. And it was
     * not merely mistaken: rostered players score zero without weights, so only free agents
     * (matched by name through another path) surfaced, and the panel became a free-agent
     * list wearing the title "tonight's rankings".
     */
    if (isCategory.value) return []

    const mineKey = source.myTeamKey.value
    const out: RankedRow[] = []

    for (const p of source.pool.value) {
      const v = value.valueByKey.value[p.playerKey]
      const perGame = v && v.games > 0 ? v.total / v.games : 0
      if (!perGame || !playsToday(p.proTeam ?? '')) continue
      out.push({
        playerKey: p.playerKey, name: p.name, headshot: p.headshot, position: p.position,
        team: p.proTeam ?? '', today: perGame, status: p.status ?? '',
        owner: p.teamKey === mineKey ? 'mine' : 'rostered',
        ownerName: p.teamKey === mineKey ? 'you' : (source.teamNames.value?.[p.teamKey] ?? ''),
      })
    }

    for (const fa of source.freeAgents.value ?? []) {
      if (!playsToday(fa.team ?? '')) continue
      const v = value.valueOf.value({ name: fa.name, position: fa.position, team: fa.team })
      const perGame = v && v.games > 0 ? v.total / v.games : 0
      if (!perGame) continue
      out.push({
        playerKey: fa.playerKey ?? `fa:${fa.name}`, name: fa.name,
        headshot: (fa as any).headshot, position: fa.position,
        team: fa.team ?? '', today: perGame, status: fa.status ?? '',
        owner: 'free', ownerName: '',
      })
    }

    return out.sort((a, b) => b.today - a.today)
  })

  const loading = computed(() => source.loading.value || value.loading.value || scheduleLoading.value)
  const gamesTonight = computed(() => Object.keys(schedule.value.gamesByTeam).length > 0)

  function load() {
    source.load()
    /* The rankings mix free agents in with rostered players, and that pool is a separate
       fetch — without it the board silently shows only what is already taken, which is the
       half of the answer a manager cannot act on. */
    source.loadFreeAgents()
    value.load()
    loadSchedule()
  }

  return {
    rows, current, lineup, bench, deadSeats, upgrades, rankings,
    loading, gamesTonight, playsToday, load,
    myTeamName: source.myTeamName,
    myTeamLogo: source.myTeamLogo,
    /** False when the league publishes nothing we can price players with. */
    canValue: computed(() => !isCategory.value),
  }
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
