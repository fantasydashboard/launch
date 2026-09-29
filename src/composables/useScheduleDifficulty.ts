import { computed, ref, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { buildAllowed } from '@/football/defenseAllowed'
import { buildDifficulty, byeWeeks, type DifficultyRow } from '@/football/scheduleDifficulty'
import { getSeasonSchedule, REGULAR_SEASON_WEEKS, type SeasonSchedule } from '@/services/nflSchedule'
import { getSeasonLines, type SeasonLine } from '@/services/playerUsage'

/**
 * How hard the rest of the schedule is, for any surface that wants to say so.
 *
 * WHY IT IS ITS OWN COMPOSABLE. This lived inside useRankings, which is a large thing that
 * also owns the board, the access check, the wire and the scoring source. The head-to-head on
 * the trades page needs the same four numbers and none of the rest, and the alternative to
 * extracting was a second implementation of the same maths a few files away — which is how two
 * pages end up quietly disagreeing about how hard a schedule is.
 *
 * ONE POSITION IS NOT ENOUGH. Difficulty is built for all four, because a schedule reads
 * differently for a back than a tight end and any mixed list — a rankings board on ALL, a
 * roster comparison — needs to rate each row against ITS OWN position rather than print
 * nothing. `allowed` is built once and shared: it is the table of what every defence has given
 * up, which is the expensive half, and rankAllowed only picks a column out of it.
 */
export const SOS_POSITIONS = ['QB', 'RB', 'WR', 'TE'] as const

export function useScheduleDifficulty() {
  const leagueStore = useLeagueStore()
  const isFootball = computed(() => leagueStore.activeSport === 'football')
  const seasonYear = computed(() => new Date().getFullYear())
  const schedule = ref<SeasonSchedule>({})
  const lines = ref<SeasonLine[]>([])
  const ready = ref(false)

  watch([() => leagueStore.currentWeek, () => leagueStore.activeSport], async () => {
    if (!isFootball.value) { schedule.value = {}; lines.value = []; ready.value = true; return }
    schedule.value = await getSeasonSchedule(seasonYear.value)
    /* Through the CURRENT week, not the one before: a league stays on a week until the next
       opens, so week one's results are only reachable by asking for week one. */
    lines.value = await getSeasonLines(seasonYear.value, leagueStore.currentWeek ?? 1)
    ready.value = true
  }, { immediate: true })

  const byPosition = computed<Record<string, Record<string, DifficultyRow>>>(() => {
    if (!Object.keys(schedule.value).length || !lines.value.length) return {}
    const allowed = buildAllowed(lines.value.map((l) => ({
      team: l.team, opponent: l.opponent, position: l.position, points: l.points,
    })))
    const out: Record<string, Record<string, DifficultyRow>> = {}
    for (const pos of SOS_POSITIONS) {
      out[pos] = buildDifficulty({
        schedule: schedule.value,
        allowed,
        position: pos,
        fromWeek: leagueStore.currentWeek ?? 1,
        throughWeek: REGULAR_SEASON_WEEKS,
      })
    }
    return out
  })

  /** One player's own schedule, by his club and the position he is being read at. */
  function difficultyFor(team: string | null | undefined, position: string | null | undefined): DifficultyRow | null {
    if (!team || !position) return null
    return byPosition.value[String(position).toUpperCase()]?.[String(team).toUpperCase()] ?? null
  }

  /*
   * A BYE WEEK IS NOT A POSITIONAL FACT. It rides inside DifficultyRow, so any surface with an
   * empty difficulty map also lost its bye column — for a number that is purely a property of
   * the club's calendar. Read straight off the schedule, it is right everywhere.
   */
  const byeByTeam = computed<Record<string, number | null>>(() =>
    Object.keys(schedule.value).length ? byeWeeks(schedule.value, REGULAR_SEASON_WEEKS) : {})

  const hasData = computed(() => Object.keys(byPosition.value).length > 0)

  return { byPosition, difficultyFor, byeByTeam, ready, hasData, seasonSchedule: schedule, seasonLines: lines }
}
