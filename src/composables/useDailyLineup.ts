import { computed, ref, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useActivePointsSource } from '@/composables/useActivePointsSource'
import { usePointsValue } from '@/composables/usePointsValue'
import { assignSlots, type DepthPlayer } from '@/trades/positionalLandscape'
import { getNhlSchedule } from '@/services/nhlSchedule'
import { getWeekSchedule, type WeekSchedule } from '@/services/mlbSchedule'
import { useEspnCategoryTeamData } from '@/composables/useEspnCategoryTeamData'
import { useDailyCategoryValue } from '@/composables/useDailyCategoryValue'
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

/**
 * Is he available TONIGHT, as opposed to merely employed by a team with a game?
 *
 * `playsToday` answers a question about the SCHEDULE, and the rankings treated it as an
 * answer about the PLAYER. So Shohei Ohtani on the fifteen-day list came through at full
 * value and ranked first among hitters, on a page whose own subtitle says a man who is not
 * playing "is no play at all". Seven of the top twenty-three were on the injured list.
 *
 * Three states, because collapsing them is what made the warning ignorable:
 *   OUT      — a stint, a suspension, the sixty-day list. He is not playing. Worth nothing.
 *   DOUBTFUL — day-to-day and its cousins. He usually plays; discounted, not removed.
 *   OK       — everything else, including a blank status.
 */
export type Availability = 'out' | 'doubtful' | 'ok'

/* Matched on the whole token, not a prefix: "DTD" must not be swallowed by a rule meant for
   "DL", and DAY_TO_DAY must not match the day-count lists. */
const OUT_STATUS = /^(OUT|IR|IL\d*|IL|DL|TEN_DAY_DL|FIFTEEN_DAY_DL|SIXTY_DAY_DL|SUSPENSION|NA|PUP|NFI)$/i
const DOUBTFUL_STATUS = /^(DAY_TO_DAY|DTD|DOUBTFUL|QUESTIONABLE|GTD)$/i

export function availability(status: string | undefined | null): Availability {
  const s = String(status ?? '').trim().toUpperCase()
  if (!s || s === 'ACTIVE') return 'ok'
  if (OUT_STATUS.test(s)) return 'out'
  if (DOUBTFUL_STATUS.test(s)) return 'doubtful'
  /* An unrecognised designation is a designation: something is wrong with him and we do not
     know what. Treated as doubtful rather than fine, because the cost of starting a man who
     cannot play is larger than the cost of ranking a healthy one slightly low. */
  return 'doubtful'
}

/** What a day-to-day player is worth: he usually plays, but not always. */
export const DOUBTFUL_DISCOUNT = 0.6

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
  /**
   * Where he ranks tonight among everyone at his position who has a game, e.g. 3 for the
   * third-best catcher on the slate.
   *
   * A BARE NUMBER SAYS NOTHING. The panel printed "2.8" beside a catcher and nothing else,
   * and no reader alive knows whether 2.8 is a good night for a catcher. Football prints
   * "20" next to "RB3 · FLX4" and that second chip is doing most of the work — it converts a
   * quantity into a judgement. Null when he has no game, because a man who is not playing
   * has no rank tonight; he is not ranked last, he is not ranked.
   */
  posRank: number | null
  /** How many players share that position pool tonight, so the rank has a denominator. */
  posCount: number | null
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
  const pointsValue = usePointsValue({
    pool: pointsSource.pool,
    fgByKey: source.fgByKey,
    sport: computed(() => leagueStore.activeSport),
    season: computed(() => String(leagueStore.currentSeason ?? new Date().getFullYear())),
    leagueId: computed(() => String(leagueStore.activeLeagueId ?? '')),
  })

  /*
   * A CATEGORY LEAGUE NEEDS A DIFFERENT NUMBER, NOT A MISSING ONE.
   *
   * usePointsValue turns stats into points using the league's scoring weights. A category
   * league assigns no weights, so it returned zero for everybody — and the page rendered that
   * honestly as "we can't rank these yet". The fix is a second value source measured in
   * standard deviations rather than points; both publish the same {total, games} shape, so
   * everything below this line is unchanged by the swap.
   */
  const categoryValue = useDailyCategoryValue({
    pool: computed(() => catSource.pool.value ?? []),
    freeAgents: computed(() => (catSource.freeAgents.value ?? []) as any),
    categories: computed(() => catSource.categories.value ?? []),
    cats: computed(() => catSource.cats.value ?? []),
    fgByKey: catSource.fgByKey,
    enabled: isCategory,
  })

  const value = {
    valueByKey: computed(() =>
      isCategory.value ? categoryValue.valueByKey.value : pointsValue.valueByKey.value),
  }

  /** Whether the numbers on this page mean anything yet — false is a real answer, not 0.0. */
  const canValue = computed(() =>
    isCategory.value ? categoryValue.ready.value : true)

  const schedule = ref<WeekSchedule>({ ...EMPTY })
  /*
   * The rest of the scoring period, which is a different question from tonight.
   *
   * Tonight decides the lineup; the WEEK decides whether you are winning. A win probability
   * measured over one evening swings wildly and means nothing — a manager whose pitchers all
   * go tomorrow is not losing — so the matchup header is measured over every day left.
   */
  const weekSchedule = ref<WeekSchedule>({ ...EMPTY })
  const scheduleLoading = ref(false)

  async function loadSchedule() {
    scheduleLoading.value = true
    try {
      const now = new Date()
      const today = ymd(now)
      /* Through the coming Sunday, which is where a standard fantasy week ends. On Sunday
         itself that is today, and the two ranges collapse to the same day — correctly. */
      const end = new Date(now)
      end.setDate(now.getDate() + ((7 - now.getDay()) % 7))
      const isHockey = leagueStore.activeSport === 'hockey'
      const fetch = isHockey ? getNhlSchedule : getWeekSchedule
      const [day, week] = await Promise.all([fetch(today, today), fetch(today, ymd(end))])
      schedule.value = day
      weekSchedule.value = week
    } catch {
      schedule.value = { ...EMPTY }
      weekSchedule.value = { ...EMPTY }
    } finally {
      scheduleLoading.value = false
    }
  }
  watch(() => [leagueStore.activeSport, leagueStore.activeLeagueId], loadSchedule, { immediate: true })

  const playsToday = (team: string) => (schedule.value.gamesByTeam[String(team || '').toUpperCase()] ?? 0) > 0

  /** His headline position — the one the league lists him under, and the pool he is ranked in. */
  const primaryPosition = (position: string) =>
    (position || '').split(/[,/|]/)[0]?.trim().toUpperCase() ?? ''

  /**
   * Tonight's positional rank for every player with a game.
   *
   * RANKED AGAINST THE WHOLE SLATE, not against my roster. "Third-best catcher I happen to
   * own" is a fact about my team; "third-best catcher playing tonight" is a fact about the
   * decision, and only the second tells a manager whether to go looking on the wire. Free
   * agents are therefore in the pool, exactly as they are in the rankings panel below.
   *
   * By PRIMARY position, because that is the pool the rankings panel's own filters use and
   * two surfaces on one page disagreeing about what position a man plays is worse than
   * either being slightly coarse.
   */
  const posRankByKey = computed(() => {
    const byPos = new Map<string, { key: string; today: number }[]>()
    const add = (key: string, position: string, team: string, status: string) => {
      const v = value.valueByKey.value[key]
      const perGame = v && v.games > 0 ? v.total / v.games : 0
      const avail = availability(status)
      if (!perGame || avail === 'out' || !playsToday(team)) return
      const pos = primaryPosition(position)
      if (!pos) return
      const today = perGame * (avail === 'doubtful' ? DOUBTFUL_DISCOUNT : 1)
      byPos.set(pos, [...(byPos.get(pos) ?? []), { key, today }])
    }
    for (const p of source.pool.value) add(p.playerKey, p.position, p.proTeam ?? '', p.status ?? '')
    for (const fa of source.freeAgents.value ?? []) {
      add(fa.playerKey ?? `fa:${fa.name}`, fa.position ?? '', fa.team ?? '', fa.status ?? '')
    }

    const rank = new Map<string, { rank: number; count: number }>()
    for (const [, list] of byPos) {
      list.sort((a, b) => b.today - a.today)
      list.forEach((r, i) => rank.set(r.key, { rank: i + 1, count: list.length }))
    }
    return rank
  })

  /** Anyone on my roster, with tonight's projection attached. */
  const myPlayers = computed<DailyRow[]>(() => {
    const mine = source.pool.value.filter((p) => p.teamKey === source.myTeamKey.value)
    return mine.map((p) => {
      const v = value.valueByKey.value[p.playerKey]
      const perGame = v && v.games > 0 ? v.total / v.games : 0
      const avail = availability(p.status)
      /* His team having a game is not the same as him having one. */
      const plays = playsToday(p.proTeam ?? '') && avail !== 'out'
      const factor = avail === 'doubtful' ? DOUBTFUL_DISCOUNT : 1
      return {
        playerKey: p.playerKey,
        name: p.name,
        headshot: p.headshot,
        position: p.position,
        team: p.proTeam ?? '',
        perGame,
        today: plays ? perGame * factor : 0,
        playsToday: plays,
        status: p.status ?? '',
        slot: null,
        /* From the platform's own lineup, not ours — this is what is set, not what we advise. */
        startedSlot: p.lineupSlot && !/^(BE|Bench|IR|IL|NA|DL)$/i.test(String((p as any).lineupSlot))
          ? String((p as any).lineupSlot)
          : null,
        benchReason: null,
        /* Null rather than last: a man with no game tonight is not the worst play at his
           position, he is not a play at that position at all. */
        posRank: plays ? (posRankByKey.value.get(p.playerKey)?.rank ?? null) : null,
        posCount: plays ? (posRankByKey.value.get(p.playerKey)?.count ?? null) : null,
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
        : availability(r.status) === 'out' ? 'injured'
        : !r.playsToday ? 'no-game'
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

  /**
   * NEAR COIN-FLIPS — the calls where our own projection barely separates the two.
   *
   * Football has this section and it is the most honest thing on that page: it names the
   * decisions where we do NOT have a real opinion, which is the opposite of what a
   * recommendation engine is tempted to do. It matters more daily than weekly, because the
   * same decision comes back every night and a manager who knows a call is a coin-flip stops
   * spending twenty minutes on it.
   *
   * Drawn from real alternatives only: the bench player has to be able to fill the seat, and
   * both have to be playing. A "close call" between a starter and somebody ineligible for his
   * slot is not a call at all.
   */
  const closestCalls = computed(() => {
    const CLOSE = 1.5
    const out: { slot: string; start: DailyRow; over: DailyRow; by: number }[] = []
    const candidates = bench.value.filter((b) => b.playsToday && b.today > 0)
    for (const seat of lineup.value) {
      if (!seat.playsToday) continue
      const rival = candidates
        .filter((b) => positionsFit(b.position, seat.slot ?? ''))
        .sort((a, b) => b.today - a.today)[0]
      if (!rival) continue
      const by = seat.today - rival.today
      /* Only when WE are ahead and barely. A bench player who is genuinely better is not a
         close call, he is an upgrade, and he already has his own louder section. */
      if (by < 0 || by > CLOSE) continue
      out.push({ slot: seat.slot ?? '', start: seat, over: rival, by })
    }
    return out.sort((a, b) => a.by - b.by).slice(0, 4)
  })

  /**
   * WHERE TONIGHT IS CHEAP AND WHERE IT IS BARE.
   *
   * Football's "Cheap here / Bare here" read, which answers a question the ranked list cannot:
   * not "who is the best free agent" but "is this position worth spending an add on at all".
   * A position whose best unowned body is nearly as good as a startable one is cheap and
   * should never cost a real asset; one whose best unowned body is far below is bare, and a
   * decent player there is worth more than his projection says.
   */
  const scarcity = computed(() => {
    const byPos = new Map<string, { best: number; bestFree: number; freeName: string }>()
    for (const r of rankings.value) {
      const pos = primaryPosition(r.position)
      if (!pos) continue
      const cur = byPos.get(pos) ?? { best: 0, bestFree: 0, freeName: '' }
      if (r.today > cur.best) cur.best = r.today
      if (r.owner === 'free' && r.today > cur.bestFree) {
        cur.bestFree = r.today
        cur.freeName = r.name
      }
      byPos.set(pos, cur)
    }
    const cheap: { pos: string; name: string }[] = []
    const bare: string[] = []
    for (const [pos, v] of byPos) {
      /* Needs a real top end to measure against — a position where nobody is any good tonight
         is not "cheap", it is a position with no games. */
      if (v.best <= 0) continue
      const share = v.bestFree / v.best
      if (share >= 0.75 && v.freeName) cheap.push({ pos, name: v.freeName })
      else if (share <= 0.4) bare.push(pos)
    }
    return { cheap: cheap.slice(0, 3), bare: bare.slice(0, 3) }
  })

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
     * A category league used to get no list at all, rather than a list built on the wrong
     * maths — this once ranked 537 players to one decimal on a page whose lineup panel, eight
     * inches above, said "we can't rank these yet". Now that the values are real the list is
     * real too, but the guard stays in a weaker form: until the projection universe has
     * loaded, every category value is zero and a board of zeroes is the same lie in a
     * quieter voice.
     */
    if (!canValue.value) return []

    const mineKey = source.myTeamKey.value
    const out: RankedRow[] = []

    for (const p of source.pool.value) {
      const v = value.valueByKey.value[p.playerKey]
      const perGame = v && v.games > 0 ? v.total / v.games : 0
      const avail = availability(p.status)
      /* Out is out: he is absent from the board entirely, for the same reason a man on a dark
         night is. Ranking him low would say he is a worse play than the name above him, when
         he is not a play. */
      if (!perGame || avail === 'out' || !playsToday(p.proTeam ?? '')) continue
      out.push({
        playerKey: p.playerKey, name: p.name, headshot: p.headshot, position: p.position,
        team: p.proTeam ?? '',
        today: perGame * (avail === 'doubtful' ? DOUBTFUL_DISCOUNT : 1),
        status: p.status ?? '',
        owner: p.teamKey === mineKey ? 'mine' : 'rostered',
        ownerName: p.teamKey === mineKey ? 'you' : (source.teamNames.value?.[p.teamKey] ?? ''),
      })
    }

    for (const fa of source.freeAgents.value ?? []) {
      const faAvail = availability(fa.status)
      if (faAvail === 'out' || !playsToday(fa.team ?? '')) continue
      /*
       * Two ways to price a free agent, because the two league types know him differently.
       * A category league already scored him by key — he was standardised alongside the
       * rostered players, which is the only way his z-scores are comparable to theirs. A
       * points league has to match him by name, because his projection lives in a feed the
       * roster pool never touched.
       */
      const v = isCategory.value
        ? (value.valueByKey.value[fa.playerKey ?? ''] ?? null)
        : pointsValue.valueOf.value({ name: fa.name, position: fa.position, team: fa.team })
      const perGame = v && v.games > 0 ? v.total / v.games : 0
      if (!perGame) continue
      out.push({
        playerKey: fa.playerKey ?? `fa:${fa.name}`, name: fa.name,
        headshot: (fa as any).headshot, position: fa.position,
        team: fa.team ?? '',
        today: perGame * (faAvail === 'doubtful' ? DOUBTFUL_DISCOUNT : 1),
        status: fa.status ?? '',
        owner: 'free', ownerName: '',
      })
    }

    return out.sort((a, b) => b.today - a.today)
  })

  const loading = computed(() =>
    source.loading.value
    || (isCategory.value ? !categoryValue.ready.value : pointsValue.loading.value)
    || scheduleLoading.value)
  const gamesTonight = computed(() => Object.keys(schedule.value.gamesByTeam).length > 0)

  function load() {
    source.load()
    /* The rankings mix free agents in with rostered players, and that pool is a separate
       fetch — without it the board silently shows only what is already taken, which is the
       half of the answer a manager cannot act on. */
    source.loadFreeAgents()
    pointsValue.load()
    /* The category engine standardises against the whole projected universe, which is a
       separate fetch — and one that shipped unrequested once already on this page. */
    categoryValue.load()
    loadSchedule()
  }

  return {
    rows, current, lineup, bench, deadSeats, upgrades, rankings,
    closestCalls, scarcity,
    loading, gamesTonight, playsToday, load,
    myTeamName: source.myTeamName,
    myTeamLogo: source.myTeamLogo,
    isCategory,
    /* The matchup header and the seat-by-seat panel are built from exactly these, and they
       are exposed rather than re-fetched so the two sections cannot end up describing
       different matchups on the same screen. */
    pool: source.pool,
    valueByKey: value.valueByKey,
    myTeamKey: source.myTeamKey,
    rosterSlots: source.rosterSlots,
    schedule,
    weekSchedule,
    /** False when the league publishes nothing we can price players with. */
    canValue,
    /** Points, or standard deviations — the panels say which so a number is never bare. */
    valueLabel: computed(() => (isCategory.value ? 'category value' : 'projected points')),
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
