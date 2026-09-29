import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import { opponentStartersBySeat } from '@/today/opponentStarters'
import { useLeagueStore } from '@/stores/league'
import { useThisWeekOpponent } from '@/composables/useThisWeekOpponent'
import { buildPointsMatchup } from '@/myteam/pointsMatchup'
import type { WeekSchedule } from '@/services/mlbSchedule'
import type { ValueByKey } from '@/myteam/playerValue'
import type { PointsPoolPlayer } from '@/myteam/pointsTeam'
import { availability, DOUBTFUL_DISCOUNT, type DailyRow } from '@/composables/useDailyLineup'
import { gamesRemaining, type GamesSide } from '@/today/gamesRemaining'

/**
 * Who you are playing, and whether you are winning — on the page where you act on it.
 *
 * WHY THE HEADER WAS EMPTY, AND WHY THAT WAS THE WORST BUG ON THE PAGE. Today rendered a
 * dash and the words "win chance unavailable" at the very top, above everything else. The
 * cause was that `useThisWeekMatchup` is category-shaped: it counts columns won, which a
 * points league does not have, so it returned 0% win and 100% tie and the header correctly
 * refused to print that. Meanwhile `buildPointsMatchup` — which computes exactly the missing
 * number from a projected-points margin — had been sitting in the codebase unused by this
 * page the whole time. Nothing needed inventing; it needed connecting.
 *
 * WHY SPOT-BY-SPOT LIVES HERE TOO. It needs the same three things the header needs: the
 * opponent's identity, the lineup each side actually SET, and what has already been banked.
 * Fetching them twice would let the two sections disagree about the same matchup, which is
 * a worse failure than either being absent.
 *
 * THEIR SET LINEUP, NOT THEIR BEST ONE. You cannot change your opponent's lineup, so solving
 * their optimal and comparing against it misstates your own matchup — and once a game is
 * final it rewrites history, quietly benching a player who already played badly. The
 * opponent service publishes what was actually set, and that is what is used.
 */

/** One side of the top-of-page scoreboard. */
export interface DailyMatchupSide {
  name: string
  logo?: string
  /** Banked this week. Null when the platform publishes no running score. */
  score: number | null
}

/** One seat, yours against theirs. */
export interface DailySpot {
  slot: string
  mine: { name: string; position: string; team: string; today: number; headshot?: string; playsToday: boolean } | null
  theirs: { name: string; position: string; team: string; today: number; headshot?: string; playsToday: boolean } | null
  /** Mine minus theirs, tonight. Positive is a seat you are winning. */
  edge: number
}

export interface DailyMatchupSnapshot {
  me: DailyMatchupSide
  opp: DailyMatchupSide
  /** 0..100, or null when we genuinely could not compute it — never a confident zero. */
  winPct: number | null
  spots: DailySpot[]
  /** Seats won / lost / level tonight. All zero when their lineup could not be read. */
  won: number
  lost: number
  level: number
  /**
   * Whether we could actually see the opponent's set lineup.
   *
   * False is a real answer and the panel must render it as one. An unseen lineup used to
   * arrive as a row of empty seats, which score zero, which made every seat of yours a seat
   * you were winning — "10 up · 0 down" against a team nobody had read.
   */
  oppLineupKnown: boolean
  /** One plain sentence about what to do, or empty when we have nothing worth saying. */
  verdict: string
  /*
   * Games left this week, each side. The lever football has no equivalent for: nine seats and
   * nine games every week there, an uneven number here that decides weeks on its own. Null
   * when the slate could not be read, never a confident zero.
   */
  myGames: GamesSide | null
  oppGames: GamesSide | null
}

/** A pool player reduced to what a spot row shows. */
function spotSide(
  p: PointsPoolPlayer | undefined,
  valueByKey: ValueByKey,
  playsToday: (team: string) => boolean,
  valueFor?: (p: any) => { total: number; games: number } | null,
) {
  if (!p) return null
  /* The board's own resolver first — it falls back to a name lookup, which on Yahoo is not a
     fallback but the only thing that ever hits: the projections are keyed by ESPN id and a
     Yahoo roster is not. Without it both sides of a Yahoo matchup scored 0.0 while the lineup
     panel directly above showed real numbers for the same men. */
  const v = valueFor?.(p) ?? valueByKey[p.playerKey]
  const perGame = v && v.games > 0 ? v.total / v.games : 0
  const avail = availability(p.status)
  /* His team having a game is not the same as him having one — the distinction that once put
     a player on the fifteen-day list at the top of the board. */
  const plays = playsToday(p.proTeam ?? '') && avail !== 'out'
  return {
    name: p.name,
    position: p.position,
    team: p.proTeam ?? '',
    headshot: p.headshot,
    playsToday: plays,
    today: plays ? perGame * (avail === 'doubtful' ? DOUBTFUL_DISCOUNT : 1) : 0,
  }
}

export function useDailyMatchup(inputs: {
  pool: Ref<PointsPoolPlayer[]> | ComputedRef<PointsPoolPlayer[]>
  valueByKey: ComputedRef<ValueByKey>
  myTeamKey: ComputedRef<string> | Ref<string>
  myTeamName: ComputedRef<string> | Ref<string>
  myTeamLogo: ComputedRef<string> | Ref<string>
  rosterSlots: ComputedRef<Record<string, number>> | Ref<Record<string, number>>
  /** My set lineup in slot order, which is what the seats are drawn from. */
  current: ComputedRef<DailyRow[]>
  /** Tonight only — the seats are a question about tonight, not about the week. */
  todaySchedule: Ref<WeekSchedule>
  /** The whole remaining week, which is what a win probability has to be measured over. */
  weekSchedule: Ref<WeekSchedule>
  playsToday: (team: string) => boolean
  isCategory: ComputedRef<boolean>
  /** The board's value resolver; without it a Yahoo matchup scores every seat zero. */
  valueFor?: (p: any) => { total: number; games: number } | null
}): {
  snapshot: ComputedRef<DailyMatchupSnapshot | null>
  loading: Ref<boolean>
  load: () => void
} {
  const leagueStore = useLeagueStore()
  const oppSvc = useThisWeekOpponent()
  const loading = ref(false)

  function load() {
    loading.value = true
    Promise.resolve(oppSvc.load()).finally(() => { loading.value = false })
  }
  watch(() => leagueStore.activeLeagueId, load)

  /*
   * The win probability, from a projected-points margin over the REST OF THE WEEK.
   *
   * Measured over tonight alone it would swing wildly and mean nothing — a manager whose
   * pitchers all go tomorrow is not losing. Category leagues are excluded outright rather
   * than handed a points number: the margin between two teams' projected points says nothing
   * about who takes more columns, and dressing it up as a win chance would be a confident
   * claim about somebody's week drawn from the wrong arithmetic entirely.
   */
  const pointsMatchup = computed(() => {
    if (inputs.isCategory.value) return null
    const opp = oppSvc.opponent.value
    if (!opp || !inputs.pool.value.length || !inputs.myTeamKey.value) return null
    if (!Object.keys(inputs.rosterSlots.value).length) return null
    return buildPointsMatchup(
      inputs.pool.value,
      inputs.valueByKey.value,
      inputs.myTeamKey.value,
      opp.opponentKey,
      inputs.rosterSlots.value,
      inputs.weekSchedule.value,
      leagueStore.activeSport === 'football' ? 'one-game-each' : 'mlb-schedule',
    )
  })

  /** What each side has actually banked, when the platform says. */
  const banked = computed(() => {
    const opp = oppSvc.opponent.value
    const actual = opp?.actualPoints ?? {}
    if (!opp || !Object.keys(actual).length) return { mine: null as number | null, theirs: null as number | null }
    const sum = (keys: string[]) => keys.reduce((s, k) => s + (Number(actual[k]) || 0), 0)
    return { mine: sum(opp.myStarters ?? []), theirs: sum(opp.opponentStarters ?? []) }
  })

  /*
   * SEATS, PAIRED BY SLOT.
   *
   * The opponent's starters arrive as a positional list — the nth entry fills the nth
   * starting slot — and empty seats are carried as sentinels rather than dropped, because
   * dropping one shifts every player after it up a seat and silently reassigns their whole
   * lineup. My side is my SET lineup for the same reason the opponent's is theirs: the
   * comparison is between what is actually on the field.
   */
  /**
   * Their starters, from the platform's own list where there is one and from the pool where
   * there is not.
   *
   * Sleeper publishes a positional array and it wins, because it is what the platform says.
   * ESPN and Yahoo publish nothing here — `opponentStarters` is a hardcoded `[]` in
   * useThisWeekOpponent — but both carry every team's slot assignment in the league-wide pool
   * this composable is already handed, so the lineup is derivable without another request.
   */
  const theirStarters = computed<string[]>(() => {
    const opp = oppSvc.opponent.value
    if (!opp) return []
    if (opp.opponentStarters?.length) return opp.opponentStarters
    const seats = inputs.current.value.map((m) => ({ slot: m.startedSlot ?? m.slot ?? '' }))
    return opponentStartersBySeat(seats, inputs.pool.value as any, opp.opponentKey)
  })

  /** False when nothing we have can tell us what they set. Never scored. */
  const oppLineupKnown = computed(() => theirStarters.value.length > 0)

  const spots = computed<DailySpot[]>(() => {
    const opp = oppSvc.opponent.value
    if (!opp) return []
    const byKey = new Map(inputs.pool.value.map((p) => [p.playerKey, p]))
    const theirs = theirStarters.value
    const known = oppLineupKnown.value

    return inputs.current.value.map((mine, i) => {
      const them = spotSide(
        byKey.get(theirs[i] ?? ''), inputs.valueByKey.value, inputs.playsToday, inputs.valueFor)
      const ours = {
        name: mine.name, position: mine.position, team: mine.team,
        headshot: mine.headshot, playsToday: mine.playsToday, today: mine.today,
      }
      return {
        slot: mine.startedSlot ?? mine.slot ?? '',
        mine: ours,
        theirs: them,
        /* An unread lineup has no edge. Subtracting zero from your own projection is not a
           comparison, it is your projection wearing a comparison's clothes. */
        edge: known ? ours.today - (them?.today ?? 0) : 0,
      }
    })
  })

  /* A seat is level when the projection cannot separate the two, which at a tenth of a point
     it frequently cannot. Calling that a win would be inventing an edge out of rounding. */
  const LEVEL = 0.1

  const snapshot = computed<DailyMatchupSnapshot | null>(() => {
    const opp = oppSvc.opponent.value
    if (!opp) return null

    const s = spots.value
    const known = oppLineupKnown.value
    const won = known ? s.filter((x) => x.edge > LEVEL).length : 0
    const lost = known ? s.filter((x) => x.edge < -LEVEL).length : 0
    const level = known ? s.length - won - lost : 0

    const winPct = pointsMatchup.value ? pointsMatchup.value.myWinPct : null

    /*
     * The verdict earns its line only when it changes what you do. "You are slightly ahead"
     * is a restatement of the number beside it; the useful version names the seat that is
     * actually costing you, because that is the one a bench move can fix.
     */
    const worst = [...s].filter((x) => x.theirs).sort((a, b) => a.edge - b.edge)[0]
    const dead = s.filter((x) => x.mine && !x.mine.playsToday).length
    let verdict = ''
    if (dead > 0) {
      verdict = `${dead} of your seats ${dead === 1 ? 'has' : 'have'} no game tonight — fill ${dead === 1 ? 'it' : 'them'} before anything else.`
    } else if (worst && worst.edge < -LEVEL) {
      verdict = `Your ${worst.slot || 'lineup'} spot is the gap tonight (${worst.edge.toFixed(1)}).`
    } else if (known && s.length && won > lost) {
      verdict = `You are ahead in ${won} of ${s.length} seats tonight.`
    }

    /* Roster-wide and week-long, not tonight's starters: in a daily league a bench skater
       with four games left is a startable asset, so counting only the set lineup would
       understate exactly the edge this number exists to show. */
    const gbt = inputs.weekSchedule.value.gamesByTeam ?? {}
    const myGames = inputs.myTeamKey.value
      ? gamesRemaining(inputs.pool.value, inputs.myTeamKey.value, gbt) : null
    const oppGames = opp.opponentKey
      ? gamesRemaining(inputs.pool.value, opp.opponentKey, gbt) : null

    return {
      me: {
        name: inputs.myTeamName.value || 'Your team',
        logo: inputs.myTeamLogo.value || undefined,
        score: banked.value.mine,
      },
      opp: {
        name: opp.opponentName,
        logo: opp.opponentLogo || undefined,
        score: banked.value.theirs,
      },
      winPct,
      spots: s,
      won, lost, level,
      oppLineupKnown: known,
      verdict,
      myGames, oppGames,
    }
  })

  return { snapshot, loading, load }
}
