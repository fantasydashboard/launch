import { computed, ref, watch, type ComputedRef } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useEspnCategoryTeamData } from '@/composables/useEspnCategoryTeamData'
import { useNhlFeed } from '@/composables/useNhlFeed'
import { mergeHockeyProjections } from '@/hockey/hockeyProjectionSource'
import { aggregateTeamCatTotals } from '@/trades/standings'
import { buildHockeyCategoryValue, type HockeyCategory } from '@/hockey/hockeyCategoryValue'
import { rankUpgrades, type WireFreeAgent, type WireDropOption, type WireUpgrade } from '@/wire/wireUpgrades'
import type { CatSpec } from '@/myteam/types'

/**
 * The Wire, for a hockey category league.
 *
 * WHY IT DID NOT EXIST. `PlayersWrapper` sends a points league to `PointsWireView`, which is
 * hockey-aware, and everything else to `WireView`, which runs `useWire` — an engine that
 * imports the MLB schedule, FanGraphs matchers and a starting-pitcher stream board, and which
 * contains the word "hockey" zero times. A hockey category league was not missing its Wire so
 * much as silently running baseball's: free agents matched against FanGraphs projections that
 * have never heard of them, priced at nothing, ranked by nothing.
 *
 * WHAT THE PAGE OWES ITS READER. One lever: the add. Not a ranking — Rankings already exists
 * and is a better ranking than this page could be — but what a specific free agent does to
 * YOUR standings, in the columns your league counts, once you drop somebody to make room.
 * That is `rankUpgrades`, which was already the right engine and was only ever baseball's
 * because its roster halves were typed `'hit' | 'pit'`.
 *
 * WHERE THE NUMBERS COME FROM. The same merged source every other hockey surface reads —
 * measured NHL rates over ESPN's expected games — rather than the season-to-date totals ESPN
 * ships on the player rows. A waiver decision is about the rest of the season, and a
 * fourth-liner who scored three times in October is not a player to pick up in March.
 */

/** Skaters and goalies cannot replace one another, which is all `side` has ever meant. */
export type HockeySide = 'skater' | 'goalie'

export interface HockeyWireRow extends WireUpgrade {
  /** What this player would replace, named rather than left as a key. */
  dropName: string
  side: HockeySide
  percentOwned: number | null
  injuryStatus: string | null
}

export interface HockeyWireVm {
  rows: HockeyWireRow[]
  /** The columns the league counts, so the page can say what it scored on. */
  categories: string[]
  loading: boolean
  /** Why there is nothing to show, when there is nothing to show. */
  problem: string
}

export function sideOf(position: string): HockeySide {
  return String(position ?? '').toUpperCase() === 'G' ? 'goalie' : 'skater'
}

export function useHockeyWire(): {
  vm: ComputedRef<HockeyWireVm>
  refresh: () => void
} {
  const leagueStore = useLeagueStore()
  const team = useEspnCategoryTeamData()

  const espnSeason = computed(() => {
    const parts = String(leagueStore.activeLeagueId ?? '').split('_')
    const fromKey = parts.length >= 4 ? parseInt(parts[3], 10) : NaN
    if (Number.isFinite(fromKey) && fromKey > 2000) return fromKey
    /* An NHL season is named for the year it ENDS, and the changeover is the summer. */
    const now = new Date()
    return now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear()
  })
  const { feed, loading: feedLoading } = useNhlFeed(espnSeason)

  const merged = computed(() => mergeHockeyProjections({
    espn: feed.value.espn,
    rates: feed.value.rates,
  }))

  const loadedFor = ref('')
  function refresh() {
    const key = String(leagueStore.activeLeagueId ?? '')
    if (!key) return
    loadedFor.value = key
    void team.load()
  }
  watch(() => leagueStore.activeLeagueId, refresh, { immediate: true })

  /**
   * Rest-of-season stats for a player, by his ESPN key.
   *
   * Empty when the merge has never heard of him, and empty is the honest answer: `rankUpgrades`
   * will score him at no gain and drop him off the board, which is what should happen to a
   * player nobody can project rather than his being ranked on a zero that looks measured.
   */
  const statsFor = (playerKey: string): Record<string, number> =>
    merged.value.projections[playerKey]?.stats ?? {}

  const vm = computed<HockeyWireVm>(() => {
    const loading = team.loading.value || feedLoading.value
    const cats = team.cats.value as CatSpec[]
    const categories = cats?.map((c) => String(c.statId)) ?? []

    if (loading) return { rows: [], categories, loading: true, problem: '' }
    if (!team.supported.value) {
      return { rows: [], categories, loading: false, problem: 'This league is not one we can read yet.' }
    }
    if (!cats?.length) {
      return { rows: [], categories, loading: false, problem: 'This league published no categories, so nothing can be scored.' }
    }
    const myTeamId = String(team.myTeamId.value ?? '')
    if (!myTeamId) {
      return { rows: [], categories, loading: false, problem: 'We could not tell which team is yours in this league.' }
    }

    /*
     * The league's standings in rest-of-season terms, not season-to-date.
     *
     * A waiver add is judged by what it changes from here, so every team is re-totalled on the
     * same projections the free agent is priced with. Mixing the two — your rivals on what
     * they have banked, the free agent on what he will do — would make every add look like an
     * improvement against opponents who had stopped playing.
     *
     * Built from `pool`, which is every rostered player in the league with the team that holds
     * him. The `standings` rows carry per-category WINS rather than players, which answers a
     * different question: how the season has gone, not what the rosters are worth from here.
     */
    const grouped = groupPoolByTeam(team.pool.value ?? [], statsFor)
    if (grouped.length < 2) {
      return { rows: [], categories, loading: false, problem: 'We could not read the other rosters in this league.' }
    }
    const leagueTotals = aggregateTeamCatTotals(grouped, cats)

    /*
     * Who can be dropped, weakest first.
     *
     * Ranked on the SAME z-total the rankings board ranks on, not on a sum of raw category
     * totals. Adding the raw columns would have ranked this list by shots on goal: a league
     * scoring SOG and G puts two hundred of one against thirty of the other, so the sum is a
     * shot count wearing the name of a value. Standard deviations are the unit a category
     * league compares columns in, and using it here means the Wire and Rankings cannot
     * disagree about who the worst player on your roster is.
     *
     * Players on IL are not droppable: the slot they occupy is not the one an add would take.
     */
    const { totalByKey } = buildHockeyCategoryValue({
      projections: merged.value.projections,
      categories: toHockeyCategories(cats),
    })
    const dropOptions = rankDropOptions(team.rosterPlayers.value ?? [], totalByKey, statsFor)

    const freeAgents: WireFreeAgent[] = (team.freeAgents.value ?? []).map((p: any) => ({
      playerKey: String(p.playerKey),
      name: p.name,
      position: p.position,
      team: p.team,
      headshot: p.headshot,
      side: sideOf(p.position),
      percentOwned: p.percentOwned,
      effStats: statsFor(String(p.playerKey)),
    }))

    if (!freeAgents.length) {
      return { rows: [], categories, loading: false, problem: 'No free agents came back from ESPN for this league.' }
    }

    const nameByKey = new Map<string, string>()
    for (const p of team.rosterPlayers.value ?? []) nameByKey.set(String(p.playerKey), p.name)

    const rows = rankUpgrades({ freeAgents, leagueTotals, myTeamId, cats, dropOptions })
      .map((u) => ({
        ...u,
        dropName: u.dropKey ? nameByKey.get(u.dropKey) ?? u.dropKey : '',
        side: sideOf(u.player.position),
        percentOwned: freeAgents.find((f) => f.playerKey === u.player.key)?.percentOwned ?? null,
        injuryStatus: merged.value.projections[u.player.key]?.injuryStatus ?? null,
      }))

    return {
      rows,
      categories,
      loading: false,
      problem: rows.length ? '' : 'Nothing on the wire improves your standings right now.',
    }
  })

  return { vm, refresh }
}

/**
 * Every rostered player in the league, grouped by the team that holds him.
 *
 * `pool` carries `teamKey` as `espn_{id}`; the standings and the aggregator both speak the
 * bare id, and mixing the two forms silently produces a league where no team matches yours.
 */
export function groupPoolByTeam(
  pool: { playerKey: string; teamKey?: string }[],
  statsFor: (playerKey: string) => Record<string, number>,
): { teamId: string; players: { playerKey: string; stats: Record<string, number> }[] }[] {
  const byTeam = new Map<string, { playerKey: string; stats: Record<string, number> }[]>()
  for (const p of pool) {
    const id = String(p.teamKey ?? '').replace(/^espn_/, '')
    if (!id) continue
    const list = byTeam.get(id) ?? []
    list.push({ playerKey: String(p.playerKey), stats: statsFor(String(p.playerKey)) })
    byTeam.set(id, list)
  }
  return [...byTeam].map(([teamId, players]) => ({ teamId, players }))
}

/** The league's own columns, in the shape the hockey value model reads them. */
export function toHockeyCategories(cats: CatSpec[]): HockeyCategory[] {
  /* statId is 0 because it exists only so a surface can explain where a column came from, and
     here the column came from the league's own category list rather than from an id lookup. */
  return cats.map((c) => ({ key: String(c.statId), statId: 0, reverse: !!c.lowerIsBetter }))
}

/**
 * Who comes off the roster, weakest first.
 *
 * Ranked on the z-total the rankings board ranks on, NOT on a sum of raw category totals.
 * Adding the raw columns ranks this list by shots on goal: a league scoring SOG and G puts two
 * hundred of one against thirty of the other, so the sum is a shot count wearing the name of a
 * value. Standard deviations are the unit a category league compares columns in, and using it
 * here means the Wire and Rankings cannot disagree about the worst player on your roster.
 *
 * A player on IL is not droppable — the slot he occupies is not the one an add would take —
 * and a player the projection has never heard of sorts to the bottom, which is where an
 * unrateable body on a roster belongs.
 */
export function rankDropOptions(
  roster: { playerKey: string; position: string; onIL?: boolean }[],
  totalByKey: Record<string, number>,
  statsFor: (playerKey: string) => Record<string, number>,
): WireDropOption[] {
  return roster
    .filter((p) => !p.onIL)
    .map((p) => ({
      playerKey: String(p.playerKey),
      side: sideOf(p.position),
      effStats: statsFor(String(p.playerKey)),
      weight: totalByKey[String(p.playerKey)] ?? -Infinity,
    }))
    .sort((a, b) => a.weight - b.weight)
    .map(({ playerKey, side, effStats }) => ({ playerKey, side, effStats }))
}
