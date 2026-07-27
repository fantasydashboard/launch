<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { profileFromStandings, type StandingsEntryLike } from '@/recommendations/fromStandings'
import { computeCategoryWeaknesses, computeCategoryStrengths } from '@/recommendations/categorySignals'
import type { CategoryDef } from '@/recommendations/types'
import { useFullSeasonCategoryData } from '@/composables/useFullSeasonCategoryData'
import { isYahooCategoryLeague as isYahooCategoryScoringType } from '@/composables/useIsCategoryLeague'
import { useAvailablePlayers } from '@/composables/useAvailablePlayers'
import { useMyRoster } from '@/composables/useMyRoster'
import { useYahooLeaguePool } from '@/composables/useYahooLeaguePool'
import { useEspnCategoryTeamData } from '@/composables/useEspnCategoryTeamData'
import { useValueBaseline } from '@/composables/useValueBaseline'
import { useThisWeekMatchup } from '@/composables/useThisWeekMatchup'
import { rankAddsForHoles } from '@/players/rankAdds'
import { sideOf } from '@/myteam/yourMove/helpedCats'
import { espnBaseballStatNames } from '@/myteam/espn/statNames'
import { isLowerBetter } from '@/players/direction'
import type { Hole } from '@/players/types'
import { buildPlayerMatchers } from '@/services/projectionService'
import { computeRosterValue, type CatSpec } from '@/myteam/value'
import { resolveVolumeStatId } from '@/myteam/catVolume'
import { toEffectiveStats } from '@/myteam/effectiveStats'
import { mapFgStatsByKey } from '@/myteam/fgMappedStats'
import { classifyCategory } from '@/myteam/categorySide'
import { computeDropCandidates } from '@/myteam/dropCandidates'
import { isAccumulatorCat } from '@/myteam/contestedTiers'
import { DIVERGENCE_MIN } from '@/trades/timing'
import { buildEngine } from '@/trades/engine'
import { assignSlots, type DepthPlayer } from '@/trades/positionalLandscape'
import { eligOf, lineupEligFor } from '@/trades/lineupEligibility'
import { computeProductionGaps } from '@/myteam/productionGaps'
import { aggregateTeamCatTotals, rankInCategory } from '@/trades/standings'
import { holeFixNote } from '@/myteam/holeFix'
import SituationStrip from '@/components/myteam/SituationStrip.vue'
import SeasonArc from '@/components/myteam/SeasonArc.vue'
import CategoryProfile from '@/components/myteam/CategoryProfile.vue'
import PositionalDepth from '@/components/myteam/PositionalDepth.vue'
import CatDebugPanel from '@/components/dev/CatDebugPanel.vue'
import RosterPanel from '@/components/myteam/RosterPanel.vue'
import MyTeamLevers from '@/components/myteam/MyTeamLevers.vue'

const leagueStore = useLeagueStore()
const valueBaselineSvc = useValueBaseline()
const { players: yahooFreeAgents, load: loadPlayers } = useAvailablePlayers()
const {
  players: yahooRosterPlayers,
  pool: yahooRosterPool,
  fgByKey: yahooFgByKey,
  statcastByKey: yahooStatcastByKey,
  rosterSlots: yahooRosterSlots,
  loading: yahooRosterLoading,
  loaded: yahooRosterLoaded,
  load: loadRoster,
} = useMyRoster()

const espn = useEspnCategoryTeamData()
// The PROJECTION-based league pool (FG ROS, no raw stats) — the same source the Wire and
// Trades rank off. My Team's category rank uses it (not useMyRoster's actual-pace pool) so
// "your rank in cat X" is rest-of-season and matches every other page. Session-cached, so this
// reuses whatever the Wire/Trades already loaded. Roster panel/values stay on useMyRoster.
const yahooLeague = useYahooLeaguePool()
const thisWeek = useThisWeekMatchup()
const isEspnCategoryLeague = computed(
  () => leagueStore.activePlatform === 'espn' && espn.supported.value === true,
)

// Canonical base inputs: select between ESPN and Yahoo based on the active platform.
// All downstream computeds (profile, record, weaknesses, holes, etc.) reference these.
const standings = computed<StandingsEntryLike[]>(() =>
  isEspnCategoryLeague.value ? espn.standings.value : yahooStandings_.value,
)
const categories = computed<CategoryDef[]>(() =>
  isEspnCategoryLeague.value ? espn.categories.value : yahooCategories.value,
)
const myTeamId = computed<string | null>(() =>
  isEspnCategoryLeague.value ? espn.myTeamId.value : yahooMyTeamId.value,
)
const myOverallRank = computed<number>(() =>
  isEspnCategoryLeague.value ? espn.myOverallRank.value : yahooMyOverallRank.value,
)
const rosterPlayers = computed(() =>
  isEspnCategoryLeague.value ? espn.rosterPlayers.value : yahooRosterPlayers.value,
)
const rosterPool = computed(() =>
  isEspnCategoryLeague.value ? espn.pool.value : yahooRosterPool.value,
)
const fgByKey = computed(() =>
  isEspnCategoryLeague.value ? espn.fgByKey.value : yahooFgByKey.value,
)
const statcastByKey = computed(() =>
  isEspnCategoryLeague.value ? espn.statcastByKey.value : yahooStatcastByKey.value,
)
const rosterLoading = computed(() =>
  isEspnCategoryLeague.value ? espn.loading.value : yahooRosterLoading.value,
)
const rosterLoaded = computed(() =>
  isEspnCategoryLeague.value ? espn.loaded.value : yahooRosterLoaded.value,
)
// The platform free-agent feeds LEAK rostered players (ESPN's status filter is
// unreliable), which is how stars like CJ Abrams / Acuña surfaced as "adds". The league
// pool is the source of truth for who's rostered, so exclude anyone in it — the same
// guard the Wire uses. Guard on a populated pool so an early/empty load doesn't blank
// every free agent.
const rosteredKeys = computed(() => new Set(rosterPool.value.map((p) => p.playerKey)))
const players = computed(() => {
  const src = isEspnCategoryLeague.value ? espn.freeAgents.value : yahooFreeAgents.value
  const rostered = rosteredKeys.value
  const guard = rosterPool.value.length > 0
  return src.filter((fa) => !guard || !rostered.has(fa.playerKey))
})

// === Wired from the sources recorded in docs/superpowers/my-team-data-sources.md (Task 9 + Task 10) ===
// No reusable store getter / composable yields the verified StandingsEntryLike[]
// or CategoryDef[] for the active category league (those are built as local refs
// inside UnifiedSeasonView.vue). The single source of truth they derive from is
// matchup .stat_winners + leagueStore.yahooTeams. We reproduce the verified
// derivation (UnifiedSeasonView.vue:1290-1411) here as computeds.
//
// FULL-SEASON FIX: leagueStore.yahooMatchups only ever holds ONE week (the store's
// loadYahooLeagueData fetches a single week of category matchups), so deriving from
// it would under-count. useFullSeasonCategoryData loops getCategoryMatchups across
// every completed week to give the full-season picture, and also fetches the real
// stat-category display names from Yahoo league settings (same source as
// UnifiedSeasonView.vue:1338-1340). We prefer the full-season matchups when loaded
// and fall back to the single-week store state until then.
const { seasonMatchups, categoryLabels, loaded: seasonLoaded, load: loadSeasonData } =
  useFullSeasonCategoryData()

// True when the active league is a Yahoo H2H category league (roto is out of scope).
// Mirrors the wrapper predicate: currentLeague?.scoring_type first, then the saved
// league for activeLeagueId, then falls back to matchup data when scoring_type is
// unknown (kept so the view still loads when the saved record hasn't synced yet).
const isYahooCategoryLeague = computed(() => {
  const id = leagueStore.activeLeagueId
  if (!id) return false
  // 1. currentLeague signal (same first branch as MyTeamWrapper / MatchupWrapper).
  if (isYahooCategoryScoringType(leagueStore.currentLeague?.scoring_type)) return true
  // 2. Saved-league signal.
  const saved = leagueStore.savedLeagues?.find((l: any) => l.league_id === id)
  if (saved?.platform && saved.platform !== 'yahoo') return false
  const st = saved?.scoring_type || ''
  if (st) return isYahooCategoryScoringType(st)
  // 3. Fall back to inspecting matchup data when scoring_type is unknown.
  return (leagueStore.yahooMatchups || []).some(
    (m: any) => m?.is_category_league || m?.stat_winners?.length
  )
})

function maybeLoadSeasonData() {
  const id = leagueStore.activeLeagueId
  if (id && isYahooCategoryLeague.value) {
    loadSeasonData(id)
  }
}

// Load the FA pool alongside the season data (same Yahoo-category gate) so we can
// surface the top available add per weak category inline on each weakness row.
function maybeLoadPlayers() {
  if (isYahooCategoryLeague.value) {
    loadPlayers()
  }
}

// Load the logged-in user's roster (same Yahoo-category gate) for the Your Roster panel.
function maybeLoadRoster() {
  if (isYahooCategoryLeague.value) {
    loadRoster()
    yahooLeague.load() // projection pool for the category rank (shared session cache with Wire/Trades)
  }
}

// Load ESPN category data when the active league is ESPN (the composable itself
// verifies it's an H2H_CATEGORY league and no-ops otherwise).
function maybeLoadEspn() {
  if (leagueStore.activePlatform === 'espn') {
    espn.load()
  }
}

// Load the this-week win-probability snapshot for the current matchup. Needs the
// category list (statId + label), which loads async, so this is also re-run by a
// watch on `categories` once they're available. The composable degrades to a null
// snapshot (band renders nothing) on any fetch failure / missing week / offseason.
function maybeLoadThisWeek() {
  if (!categories.value.length) return
  thisWeek.load(categories.value.map((c) => ({ statId: c.statId, label: c.label })))
}

onMounted(() => {
  maybeLoadSeasonData()
  maybeLoadPlayers()
  maybeLoadRoster()
  maybeLoadEspn()
  maybeLoadThisWeek()
  valueBaselineSvc.load() // league-independent FG universe; powers the value baseline
})
// Reload when the active league changes (e.g. switching into a category league).
watch(() => leagueStore.activeLeagueId, () => {
  maybeLoadSeasonData()
  maybeLoadPlayers()
  maybeLoadRoster()
  maybeLoadEspn()
  maybeLoadThisWeek()
})
// Matchups to derive from: full-season when loaded, else the single-week store state.
const sourceMatchups = computed(() =>
  seasonLoaded.value && seasonMatchups.value.length
    ? seasonMatchups.value
    : leagueStore.yahooMatchups || []
)

// Per-category wins/losses accumulated from matchup stat_winners, keyed by team key/id.
const perCategory = computed(() => {
  const wins = new Map<string, Record<string, number>>()
  const losses = new Map<string, Record<string, number>>()
  const statIds = new Set<string>()

  for (const m of sourceMatchups.value) {
    if (!m?.stat_winners?.length) continue
    const team1 = m.teams?.[0]
    const team2 = m.teams?.[1]
    const team1Key = team1?.team_key || team1?.team_id
    const team2Key = team2?.team_key || team2?.team_id
    if (!team1Key || !team2Key) continue

    for (const key of [team1Key, team2Key]) {
      if (!wins.has(key)) {
        wins.set(key, {})
        losses.set(key, {})
      }
    }

    for (const sw of m.stat_winners) {
      const statId = String(sw.stat_id)
      statIds.add(statId)
      const t1Wins = wins.get(team1Key)!
      const t1Losses = losses.get(team1Key)!
      const t2Wins = wins.get(team2Key)!
      const t2Losses = losses.get(team2Key)!

      if (sw.is_tied === true || sw.is_tied === '1') {
        // tie — no credit
      } else if (sw.winner_team_key === team1Key) {
        t1Wins[statId] = (t1Wins[statId] || 0) + 1
        t2Losses[statId] = (t2Losses[statId] || 0) + 1
      } else if (sw.winner_team_key === team2Key) {
        t2Wins[statId] = (t2Wins[statId] || 0) + 1
        t1Losses[statId] = (t1Losses[statId] || 0) + 1
      }
    }
  }

  return { wins, losses, statIds }
})

// Standings array in the verified StandingsEntryLike shape (UnifiedSeasonView.vue:1400-1411).
const yahooStandings_ = computed<StandingsEntryLike[]>(() => {
  const teams = leagueStore.yahooStandings?.length
    ? leagueStore.yahooStandings
    : leagueStore.yahooTeams || []
  const { wins, losses } = perCategory.value
  return teams.map((team: any) => {
    const byKey = wins.get(team.team_key) || wins.get(team.team_id) || {}
    const byKeyLoss = losses.get(team.team_key) || losses.get(team.team_id) || {}
    return {
      team: {
        teamId: String(team.team_id || team.team_key),
        name: team.name,
        avatar: team.logo_url || team.logo || team.avatar
      },
      perCategoryWins: byKey,
      perCategoryLosses: byKeyLoss
    }
  })
})

// League scoring categories mapped to CategoryDef (stat_id -> statId, etc.).
// Real display names come from Yahoo league settings via useFullSeasonCategoryData
// (same getLeagueSettings().stat_categories source as UnifiedSeasonView.vue:1338-1340).
// The engine only reads statId + name + per-category ranks; side/higherIsBetter are
// best-effort defaults (see docs/superpowers/my-team-data-sources.md). Falls back to "Stat <id>" only when
// a real name is genuinely unavailable (settings not yet loaded or stat missing).
const yahooCategories = computed<CategoryDef[]>(() => {
  const labels = categoryLabels.value
  return [...perCategory.value.statIds].map((statId) => {
    const meta = labels.get(statId)
    return {
      statId,
      label: meta?.label || `S${statId}`,
      name: meta?.name || `Stat ${statId}`,
      side: 'hit' as const,
      higherIsBetter: true
    }
  })
})

// Logged-in user's teamId (team with is_my_team === true) — UnifiedSeasonView.vue:701-717.
const yahooMyTeamId = computed<string | null>(() => {
  const myTeam = leagueStore.yahooTeams?.find((t: any) => t.is_my_team)
  if (myTeam) return String(myTeam.team_id ?? myTeam.team_key)
  if (leagueStore.currentUserId) {
    const myRoster = leagueStore.leagueRosters?.find(
      (r: any) => r.owner_id === leagueStore.currentUserId
    )
    if (myRoster) return String(myRoster.roster_id)
  }
  return null
})
// ================================================================================

const profile = computed(() => {
  if (!myTeamId.value || standings.value.length === 0 || categories.value.length === 0) return null
  try {
    return profileFromStandings(standings.value, categories.value, myTeamId.value)
  } catch {
    return null
  }
})

const emptyStateMessage = computed(() => {
  // ESPN branch
  if (leagueStore.activePlatform === 'espn') {
    if (!espn.loaded.value) return "Loading your team's edge..."
    if (espn.supported.value === false)
      return "My Team supports head-to-head category leagues. This ESPN league isn't a category league."
    if (!espn.myTeamId.value)
      return "Connect your ESPN account to see your team's edge."
    return 'No category data yet for this league. Check back once weeks have been scored.'
  }
  // Yahoo branch (unchanged behavior)
  if (isYahooCategoryLeague.value && !seasonLoaded.value) return "Loading your team's edge..."
  const id = leagueStore.activeLeagueId
  if (id && !isYahooCategoryLeague.value) {
    return "My Team is built for head-to-head category leagues. This league type isn't supported here yet."
  }
  return "Connect or select a category league to see your team's edge."
})

// Short category label for a statId (e.g. "AB", "IP") — used to spot accumulator cats.
const labelOfStat = (statId: string) => {
  // MUST match how the rank pool resolves labels (c.label || c.name || statId): the value
  // baseline maps the FG universe by this name, and `?? statId` (no name fallback, doesn't catch
  // an empty-string label) fed the universe a garbage display name for cats whose label is "",
  // collapsing that cat's baseline std to 0 — every player's z went to 0 (the all-hitters-43 bug).
  const c = categories.value.find((x) => x.statId === statId)
  return c?.label || c?.name || statId
}

const weaknesses = computed(() => {
  if (!productionProfile.value) return []
  // Drop accumulator cats (AB/G/IP/BF…): a low rank there means "you play fewer
  // games", not a fixable hole, and it shouldn't headline the verdict as your
  // "biggest hole".
  return computeCategoryWeaknesses(productionProfile.value, categories.value)
    .filter((w) => !isAccumulatorCat(labelOfStat(w.statId)))
    .slice()
    .sort((a, b) => b.leverage - a.leverage)
    .slice(0, 4)
})

// === Close the loop: top available add per category we'd want to improve ===
// Every NON-strong category (winnable / holding / out-of-reach) gets a top-add, so
// the Category Profile can carry an actionable "Add X" right on its weak rows — the
// merge that retires the separate "Where you're losing" block. Strengths need no add.
// (References `gaps` lazily — fine, Vue computeds evaluate on access, like `cats` below.)
const holes = computed<Hole[]>(() => {
  if (!profile.value) return []
  return gaps.value
    .filter((g) => g.tier !== 'strong')
    .map((g) => ({
      statId: g.statId,
      name: categories.value.find((c) => c.statId === g.statId)?.name ?? g.statId,
      rank: g.rank,
      lowerIsBetter: cats.value.find((c) => c.statId === g.statId)?.lowerIsBetter ?? false,
      // Side gate for adds: a hitter can't fix a pitching hole (Saves/BF) and a
      // reliever can't fix Runs scored. catSpecs classifies each category's side.
      side: catSpecs.value.find((c) => c.statId === g.statId)?.side,
    }))
})

// Confirmed-misaligned ESPN category labels whose free-agent player-stat lookup returns a
// different stat (see ?catadd=1 probe). Interim suppression until the player-stat id remap.
const ESPN_UNTRUSTED_ADD_CATS = new Set(['SB', 'W'])
// statId -> top add (for the inline "Add {name} {statValue} {label}" line).
const addsByStatId = computed<Record<string, { name: string; statValue: number; label: string; isRatio: boolean }>>(() => {
  if (!holes.value.length || !players.value.length) return {}
  // Rank off FG-projected/effective stats (effectiveFreeAgents), NOT raw season-to-date totals —
  // see the faFgByKey/effectiveFreeAgents comment above for why (accumulation bias).
  const groups = rankAddsForHoles(effectiveFreeAgents.value, holes.value, { perHole: 1 })
  const map: Record<string, { name: string; statValue: number; label: string; isRatio: boolean }> = {}
  for (const group of groups) {
    const top = group.adds[0]
    if (!top) continue
    const cat = categories.value.find((c) => c.statId === group.hole.statId)
    // Accumulator cats (Games/IP/AB/BF…) aren't fixed by a waiver add — surfacing
    // "Add X +1 G" is noise. Skip them so only roster-quality holes get a nudge.
    if (isAccumulatorCat(cat?.label ?? group.hole.statId)) continue
    // INTERIM (pending ESPN player-stat id remap): ESPN's free-agent player.stats object is
    // keyed in an id space that doesn't reliably match the category ids. Confirmed via the
    // ?catadd=1 probe for SB and W — the lookup returns a different stat (a catcher topped SB
    // on his HR value; a back-end SP topped W on a garbage counter). Suppress those two on
    // ESPN so we never surface a misleading add. Yahoo resolves correctly and is untouched.
    if (isEspnCategoryLeague.value && ESPN_UNTRUSTED_ADD_CATS.has(cat?.label ?? '')) continue
    const spec = catSpecs.value.find((c) => c.statId === group.hole.statId)
    const isRatio = spec?.isRatio ?? false
    // Ratio cats (ERA/WHIP/OBA) read as 2 decimals; counting cats as whole numbers.
    const statValue = isRatio ? Math.round(top.statValue * 100) / 100 : Math.round(top.statValue)
    // A rounded-to-zero improvement is not a real suggestion.
    if (statValue === 0) continue
    map[group.hole.statId] = {
      name: top.player.name,
      statValue,
      label: cat?.label ?? group.hole.statId,
      isRatio,
    }
  }
  return map
})

const strengths = computed(() => {
  if (!productionProfile.value) return []
  // Accumulator cats (AB/G/IP/BF…) are won by playing time, not roster quality —
  // "1st in At Bats" is a hollow brag, so it never headlines your edge.
  return computeCategoryStrengths(productionProfile.value, categories.value)
    .filter((s) => !isAccumulatorCat(labelOfStat(s.statId)))
    .slice()
    .sort((a, b) => b.leverage - a.leverage)
    .slice(0, 4)
})

// Overall standings rank for the logged-in team.
// yahooStandings entries carry a numeric `rank` field (set by yahoo.ts:476/648).
// If that field is missing or zero, fall back to the team's 1-based index in the
// standings array (which Yahoo returns sorted by position).
const yahooMyOverallRank = computed<number>(() => {
  if (!myTeamId.value) return 0
  const entry = (leagueStore.yahooStandings || []).find(
    (s: any) => String(s.team_id ?? s.team_key) === myTeamId.value
  )
  if (!entry) return 0
  if (entry.rank && Number(entry.rank) > 0) return Number(entry.rank)
  // Derive from array position as fallback.
  const idx = (leagueStore.yahooStandings || []).indexOf(entry)
  return idx >= 0 ? idx + 1 : 0
})

const record = computed(() => {
  // Derived from the standings entry if available; fall back to empty.
  const mine = standings.value.find((s) => s.team.teamId === myTeamId.value)
  const w = mine?.perCategoryWins ? Object.values(mine.perCategoryWins).reduce((a, b) => a + b, 0) : 0
  const l = mine?.perCategoryLosses ? Object.values(mine.perCategoryLosses).reduce((a, b) => a + b, 0) : 0
  return `${w}-${l}`
})

// Terse one-line data verdict, built from the top strength + worst weakness.
// Each Recommendation.headline is already templated like "2nd in K" / "12th in HR",
// so we reuse it directly (no prose, no new data). Show only the half that exists
// when one group is empty; return null to omit the line entirely when neither does.
const verdict = computed<string | null>(() => {
  const parts: string[] = []
  const top = strengths.value[0]
  const hole = weaknesses.value[0]
  if (top) parts.push(`Strongest: ${top.headline}.`)
  if (hole) parts.push(`Biggest hole: ${hole.headline}.`)
  return parts.length ? parts.join(' ') : null
})

// The single best available add for the biggest hole, so the headline weakness
// carries a "do this next" step (it was previously named but never actioned).
// Reuses addsByStatId (same top-add-per-category as the season weakness rows).
const holeAdd = computed<{ name: string; statValue: number; label: string; isRatio: boolean } | null>(() => {
  const hole = weaknesses.value[0]
  if (!hole) return null
  return addsByStatId.value[hole.statId] ?? null
})

// Fallback for the "Fix it" line when no clean same-side add exists (e.g. ESPN's
// roster-wide Runs hole): an honest, category-aware note instead of silence — without
// inventing a player target. Null when an add exists (the add takes precedence) or
// there's no weakness at all.
const holeNote = computed<string | null>(() => {
  const hole = weaknesses.value[0]
  if (!hole || holeAdd.value) return null
  const label = categories.value.find((c) => c.statId === hole.statId)?.label ?? hole.statId
  const isRatio = catSpecs.value.find((c) => c.statId === hole.statId)?.isRatio ?? false
  return holeFixNote(label, isRatio)
})

// === Per-player contribution (season-to-date) vs the league's rostered pool ===
// Direction-aware spec for each scoring category (lowerIsBetter for rate cats).
const cats = computed(() =>
  isEspnCategoryLeague.value
    ? espn.cats.value
    : categories.value.map((c) => ({
        statId: c.statId,
        lowerIsBetter: isLowerBetter(c.label || c.name || c.statId),
      })),
)

// Lookup map: statId -> lowerIsBetter, derived from the platform-correct `cats` computed.
const lowerBetterByStatId = computed(() => {
  const m = new Map<string, boolean>()
  for (const c of cats.value) m.set(c.statId, c.lowerIsBetter)
  return m
})
function isLowerBetterFor(statId: string): boolean {
  return lowerBetterByStatId.value.get(statId) ?? false
}

// Full CatSpec array (side + isRatio + volumeStatId) built on top of the existing `cats` computed.
const catSpecs = computed<CatSpec[]>(() => {
  const findStatId = (names: string[]): string | undefined => {
    for (const c of categories.value) {
      const label = (c.label || c.name || '').toUpperCase().trim()
      if (names.includes(label)) return c.statId
    }
    return undefined
  }
  const ipStatId = findStatId(['IP', 'INNINGS PITCHED'])
  const abStatId = findStatId(['AB', 'AT BATS', 'PA', 'PLATE APPEARANCES'])
  return categories.value.map((c) => {
    const { side, isRatio } = classifyCategory(c.label || c.name || c.statId, isLowerBetterFor(c.statId))
    const lowerIsBetter = isLowerBetterFor(c.statId)
    return {
      statId: c.statId,
      lowerIsBetter,
      side,
      isRatio,
      volumeStatId: resolveVolumeStatId(isRatio, side, ipStatId, abStatId),
    }
  })
})

// My players' keys (matches the playerKey shape used by the pool/contribution engine).
const myPlayerKeys = computed(() => rosterPlayers.value.map((p) => p.playerKey))

// Slice 2: blend FanGraphs rest-of-season projections into roster value.
// Real season fraction from the league's week bounds (falls back to 0.6) — so player
// values track actual season progress instead of a frozen guess. See store.
const seasonFraction = computed(() => leagueStore.seasonFractionComplete)

// Value baseline anchored to the STARTABLE projected-player pool (everyday regulars, not the
// scrub-laden full universe and not just this league's roster), so "VS ALL" reflects real
// player quality — a league-leading skill scores a big z and a merely-average regular sits
// near zero, instead of every good player compressing into one high band where breadth wins.
// Null until the universe loads; computeRosterValue/buildEngine then fall back to pool-z.
// Clamp only ever caps a SPECIALIST's elite category (a compiler's z's are all small and
// never reach it), so a low clamp silently punishes scarce-skill stars (Carroll's SB) while
// leaving breadth compilers untouched. Set high enough that real elite skills count in full
// (a 60-SB z tops out ~5) — it exists only to reject garbage projections (z > 8 = bad data).
const ZCLAMP = 8
const valueBaseline = computed(() =>
  valueBaselineSvc.ready.value ? valueBaselineSvc.build(catSpecs.value, labelOfStat) : null,
)

// Map each matched FGProjection to league stat_ids, keyed by playerKey. Empty
// when FanGraphs returns no rows (degrades to extrapolated YTD downstream).
const fgStatsByKey = computed<Record<string, Record<string, number>>>(() => {
  const fgMap = fgByKey.value
  if (!fgMap || !catSpecs.value.length) return {}
  const labelByStatId = new Map(categories.value.map((c) => [c.statId, c.label || c.name || c.statId]))
  return mapFgStatsByKey(fgMap, catSpecs.value, (id) => labelByStatId.get(id) ?? id)
})

// FanGraphs ROS match for the FREE-AGENT pool — mirrors fgStatsByKey above but for `players`
// (unrostered). Without this, the per-cat "add" chip below ranks off raw ESPN/Yahoo season-
// TO-DATE stats only: a long-tenured compiler's higher accumulated total can beat a recently-
// arrived / limited-usage specialist even when the specialist projects far better for that
// category (e.g. a full-time closer's accumulated K's outpacing a hot rookie starter's, simply
// because he's had more games to compile them) — this is why My Team's per-cat "add" chip could
// surface a low-K reliever for the K hole while the Wire (which already ranks free agents off
// FG-projected effective stats) correctly surfaces a real strikeout starter. Same fix, applied
// here too: FG-match the free-agent pool and rank off projected/effective stats, not raw totals.
let faMatchersPromise: ReturnType<typeof buildPlayerMatchers> | null = null
const getFaPlayerMatchers = () => (faMatchersPromise ??= buildPlayerMatchers())
const faFgByKey = ref<Record<string, Record<string, number>>>({})
watch(
  [players, catSpecs],
  async () => {
    if (!players.value.length || !catSpecs.value.length) return
    const { matchFG } = await getFaPlayerMatchers()
    const labelByStatId = new Map(categories.value.map((c) => [c.statId, c.label || c.name || c.statId]))
    const raw: Record<string, ReturnType<typeof matchFG>> = {}
    for (const fa of players.value) raw[fa.playerKey] = matchFG({ full_name: fa.name, mlb_team: fa.team })
    faFgByKey.value = mapFgStatsByKey(raw, catSpecs.value, (id) => labelByStatId.get(id) ?? id)
  },
  { immediate: true },
)
// Free agents with FG-projected (or season-fraction-extrapolated) full-season stats — the
// pool the per-category "add" suggestion ranks off, instead of raw season-to-date totals.
const effectiveFreeAgents = computed(() =>
  players.value.map((fa) => ({
    ...fa,
    stats: toEffectiveStats(fa.stats, faFgByKey.value[fa.playerKey] ?? null, catSpecs.value, seasonFraction.value),
  })),
)

// REST-OF-SEASON PROJECTED league pool — the SAME source the Wire and Trades rank/value off
// (FG ROS, no raw stats). My Team's category rank AND player values use this (not useMyRoster's
// actual-to-date pool) so every number is rest-of-season and matches every page. Identities
// (headshots, the roster list, Statcast) still come from useMyRoster, mapped by playerKey.
// ESPN's pool is already projection-based, so unchanged.
const rankPool = computed(() => (isEspnCategoryLeague.value ? espn.pool.value : yahooLeague.pool.value))
const rankFgByKey = computed(() => (isEspnCategoryLeague.value ? espn.fgByKey.value : yahooLeague.fgByKey.value))
const rankFgStatsByKey = computed<Record<string, Record<string, number>>>(() => {
  const fgMap = rankFgByKey.value
  if (!fgMap || !catSpecs.value.length) return {}
  const labelByStatId = new Map(categories.value.map((c) => [c.statId, c.label || c.name || c.statId]))
  return mapFgStatsByKey(fgMap, catSpecs.value, (id) => labelByStatId.get(id) ?? id)
})

// Contribution per my player: which categories they help (plus) / hurt (minus). Computed over
// the PROJECTED pool so "VS ALL" is rest-of-season and matches Trades. Keyed by playerKey, which
// is shared with the useMyRoster-driven roster panel.
const contributions = computed(() => {
  if (!rankPool.value.length || !myPlayerKeys.value.length || !catSpecs.value.length) return []
  const fgMap = rankFgStatsByKey.value
  const effectivePool = rankPool.value.map((p) => ({
    playerKey: p.playerKey,
    position: p.position,
    stats: toEffectiveStats(p.stats, fgMap[p.playerKey] ?? null, catSpecs.value, seasonFraction.value),
  }))
  return computeRosterValue(effectivePool, myPlayerKeys.value, catSpecs.value, {
    baseline: valueBaseline.value ?? undefined,
    zClamp: ZCLAMP,
  })
})

// Dev-only FanGraphs match audit (enable with ?fgaudit=1). A player MATCHED gets his
// rest-of-season projection; UNMATCHED falls back to extrapolated season-to-date, which
// is the usual reason a value looks surprisingly low/high. This shows which of your
// players matched, joined to their VS ALL value, so a suspect number can be diagnosed
// as "real projection" vs "name-match miss".
// Season view toggle: show the category profile OR the positional lineup, one at a time, so
// the page isn't two long stacked sections. Same lens-toggle as the Trades landscape.
const seasonView = ref<'cat' | 'pos'>('cat')
// Dev-only (?fgaudit=1): the value baseline per cat — std=0 means that cat can't differentiate
// players (collapses their z to 0). `label` is what the baseline maps the universe with.
const baselineDump = computed(() => {
  const b = valueBaseline.value
  return catSpecs.value.map((c) => ({
    statId: c.statId,
    label: labelOfStat(c.statId),
    side: c.side,
    std: b ? Math.round((b.get(c.statId)?.std ?? -1) * 1000) / 1000 : null,
    mean: b ? Math.round((b.get(c.statId)?.mean ?? 0) * 1000) / 1000 : null,
  }))
})
const showFgAudit = new URLSearchParams(window.location.search).has('fgaudit')
// Dev diagnostic (?catadd=1): for each weak cat, the ranked eligible free-agent pool the
// per-cat "add X" chip picks from — name, position, side-gate result, projected stat value,
// and pool percentile. Reveals whether a suspect suggestion (e.g. a catcher topping SB) is a
// thin-pool artifact (real but weak values) or a data leak (a garbage/leaked stat value).
const showCatAdd = new URLSearchParams(window.location.search).has('catadd')
const catAddDump = computed(() => {
  if (!holes.value.length || !players.value.length) return []
  const groups = rankAddsForHoles(effectiveFreeAgents.value, holes.value, { perHole: 8 })
  const statMap = espnBaseballStatNames
  return groups.map((g) => {
    const cat = categories.value.find((c) => c.statId === g.hole.statId)
    // Full raw-stat line for the top add — every non-zero id with its map display, so a
    // wrong-stat mapping (SB=5 pulling HR) is visible: find which raw id ACTUALLY holds SB/W.
    const topRaw = g.adds[0]
      ? Object.entries(g.adds[0].player.stats)
          .filter(([, v]) => typeof v === 'number' && v !== 0)
          .map(([id, v]) => ({ id, disp: statMap[Number(id)]?.display ?? '?', v: Math.round((v as number) * 100) / 100 }))
          .sort((a, b) => Number(a.id) - Number(b.id))
      : []
    return {
      statId: g.hole.statId,
      label: cat?.label ?? g.hole.statId,
      side: g.hole.side ?? '—',
      poolSize: effectiveFreeAgents.value.filter(
        (pl) => !g.hole.side || sideOf(pl.position ?? '') === g.hole.side,
      ).length,
      topName: g.adds[0]?.player.name ?? '—',
      topRaw,
      adds: g.adds.map((a) => ({
        name: a.player.name,
        pos: a.player.position ?? '?',
        side: sideOf(a.player.position ?? ''),
        val: Math.round((a.statValue ?? 0) * 1000) / 1000,
        pct: Math.round(a.percentile * 100) / 100,
      })),
    }
  })
})
// Dev diagnostic (?catdebug=1): My Team's category inputs + my per-cat production rank, in the
// SAME shape the Wire dumps, so the two can be compared row-for-row to find the Yahoo divergence.
const showCatDebug = new URLSearchParams(window.location.search).has('catdebug')
const catDebug = computed(() => {
  const totals = leagueTotals.value
  const myId = myPoolTeamKey.value
  const mine = totals.find((t) => t.teamId === myId)
  return {
    page: 'My Team',
    numTeams: totals.length,
    myTeamId: myId,
    myFound: !!mine,
    rows: catSpecs.value.map((c) => ({
      statId: c.statId,
      label: labelOfStat(c.statId),
      lowerIsBetter: c.lowerIsBetter,
      isRatio: c.isRatio,
      volumeStatId: c.volumeStatId ?? '',
      myRank: Math.round((rankInCategory(totals, c).get(myId) ?? 0) * 10) / 10,
      myTotal: Math.round((mine?.cats[c.statId]?.value ?? 0) * 1000) / 1000,
    })),
  }
})
const fgMatchAudit = computed(() => {
  const fg = fgByKey.value
  const contribByKey = new Map(contributions.value.map((c) => [c.playerKey, c]))
  const mine = new Set(myPlayerKeys.value)
  const rows = rosterPool.value
    .filter((p) => mine.has(p.playerKey))
    .map((p) => {
      const c = contribByKey.get(p.playerKey)
      // Top category z's (signed, biggest magnitude first) — the per-cat drivers behind
      // the value, so a suspect ranking shows WHY (e.g. an elite SB z, or nothing dominant).
      const top = c
        ? [...c.contribs]
            .filter((x) => x.z)
            .sort((a, b) => Math.abs(b.z) - Math.abs(a.z))
            .slice(0, 5)
            .map((x) => `${labelOfStat(x.statId)} ${x.z >= 0 ? '+' : ''}${x.z.toFixed(1)}`)
            .join('  ')
        : ''
      return {
        name: p.name,
        matched: !!fg[p.playerKey],
        value: Math.round(c?.crossPercentile ?? 0),
        score: c ? Math.round((c.valueScore ?? 0) * 10) / 10 : 0,
        top,
      }
    })
    .sort((a, b) => Number(a.matched) - Number(b.matched) || b.score - a.score)
  return { rows, matched: rows.filter((r) => r.matched).length, total: rows.length }
})

const leagueTotals = computed(() => {
  if (!rankPool.value.length || !catSpecs.value.length) return []
  const fgMap = rankFgStatsByKey.value
  const byTeam = new Map<string, { playerKey: string; stats: Record<string, number> }[]>()
  for (const p of rankPool.value) {
    const teamId = String((p as { teamKey?: string }).teamKey ?? '')
    if (!teamId) continue
    const arr = byTeam.get(teamId) ?? []
    arr.push({ playerKey: p.playerKey, stats: toEffectiveStats(p.stats, fgMap[p.playerKey] ?? null, catSpecs.value, seasonFraction.value) })
    byTeam.set(teamId, arr)
  }
  return aggregateTeamCatTotals([...byTeam.entries()].map(([teamId, players]) => ({ teamId, players })), catSpecs.value)
})
// Production-rank profile (per cat) for the verdict's strongest/biggest-hole — same
// basis as the category profile, so the header and the bars agree.
const productionProfile = computed(() => {
  if (!myPoolTeamKey.value || !leagueTotals.value.length) return null
  const n = leagueTotals.value.length
  return {
    teamId: myPoolTeamKey.value,
    numTeams: n,
    categories: catSpecs.value.map((c) => ({
      statId: c.statId,
      rank: rankInCategory(leagueTotals.value, c).get(myPoolTeamKey.value) ?? n,
    })),
  }
})

// Sell-high flags: reuse the Trades buy/sell timing engine (perceived-vs-projection
// divergence, confirmed by Statcast luck). A roster player flagged 'sell' is
// overperforming and at peak trade value — the cue to shop him on Trades, closing
// the loop with the Wire's "don't drop a chip". Engine is keyed off the league pool;
// timing doesn't need standings, so teamCatWins is omitted.
// Sell-high timing needs ACTUAL season-pace stats (it diverges pace from projection), but the
// projected rankPool carries none — so build them from useMyRoster's actual pool, keyed by
// playerKey, and pass them as the perceived leg.
const perceivedStatsByKey = computed<Record<string, Record<string, number>>>(() => {
  if (!rosterPool.value.length || !catSpecs.value.length) return {}
  const out: Record<string, Record<string, number>> = {}
  for (const p of rosterPool.value) out[p.playerKey] = toEffectiveStats(p.stats, null, catSpecs.value, seasonFraction.value)
  return out
})
const tradeEngine = computed(() =>
  rankPool.value.length && catSpecs.value.length
    ? buildEngine({
        pool: rankPool.value,
        fgByKey: rankFgByKey.value,
        statcastByKey: statcastByKey.value,
        cats: catSpecs.value,
        seasonFraction: seasonFraction.value,
        baseline: valueBaseline.value ?? undefined,
        zClamp: ZCLAMP,
        perceivedStatsByKey: perceivedStatsByKey.value,
        labelOf: (id: string) => categories.value.find((c) => c.statId === id)?.label || id,
      })
    : null,
)
// Sell-high must be SCARCE to mean anything — mid-season the timing engine reads
// most good players as 'sell' (season pace beats a conservative ROS projection). A
// genuine sell-high is a tradeable player (real value) whose overperformance is
// STATCAST-CONFIRMED as luck-driven (regression coming). Cap to a short list.
const SELL_HIGH_VALUE_FLOOR = 55 // only players with real trade value can be "sold high"
const SELL_HIGH_MAX = 4
const sellHighKeys = computed<Set<string>>(() => {
  const timing = tradeEngine.value?.timingByKey
  if (!timing) return new Set<string>()
  const valueByKey = new Map(contributions.value.map((c) => [c.playerKey, c.crossPercentile ?? 0]))
  const ranked = myPlayerKeys.value
    .map((key) => ({ key, t: timing.get(key), v: valueByKey.get(key) ?? 0 }))
    // A real sell-high needs the MARKET to overvalue him: season-pace value must
    // exceed his ROS projection by a genuine margin (perceived − ros ≥ DIVERGENCE_MIN),
    // AND Statcast must confirm the regression. Luck alone isn't enough — an elite
    // player who's slightly "lucky" but still elite after regression (small gap) is a
    // hold, not a sell, so this keeps the page from telling you to dump your ace.
    .filter(
      (x) =>
        x.t?.dir === 'sell' &&
        x.t.luckConfirmed &&
        x.t.perceived - x.t.ros >= DIVERGENCE_MIN &&
        x.v >= SELL_HIGH_VALUE_FLOOR,
    )
    .sort((a, b) => (b.t?.score ?? 0) - (a.t?.score ?? 0))
    .slice(0, SELL_HIGH_MAX)
  return new Set(ranked.map((x) => x.key))
})

// Playoff race: where you sit vs the cutline. Prefer ESPN's real playoffTeamCount;
// fall back to a half-league estimate (Yahoo doesn't expose it). Margin = your total
// cat-wins vs the team on the playoff bubble.
const playoffSpots = computed(() => {
  if (isEspnCategoryLeague.value && espn.playoffTeamCount.value) return espn.playoffTeamCount.value
  return Math.max(1, Math.round((standings.value.length || 10) / 2))
})
const seasonArc = computed(() => {
  const rank = myOverallRank.value
  const size = standings.value.length
  if (!rank || !size) return null
  const spots = playoffSpots.value
  const totals = standings.value
    .map((s) => Object.values(s.perCategoryWins ?? {}).reduce((a, b) => a + b, 0))
    .sort((a, b) => b - a)
  const myWins = totals[rank - 1] ?? 0
  const margin = rank <= spots ? myWins - (totals[spots] ?? 0) : -((totals[spots - 1] ?? 0) - myWins)
  // playoff_week_start is hardcoded for non-ESPN leagues (Yahoo/Sleeper), so its weeks-left
  // is a false countdown ("2 weeks left" in June). Only trust it for ESPN's real schedule —
  // estimateSpots already marks the leagues where we're guessing. 0 = unknown -> the UI hides
  // the countdown clause rather than showing a wrong one.
  const weeksLeftRaw = Math.max(0, ((leagueStore as any).playoffWeekStart ?? 0) - ((leagueStore as any).currentWeek ?? 0))
  const weeksLeft = isEspnCategoryLeague.value && espn.playoffTeamCount.value ? weeksLeftRaw : 0
  return {
    rank,
    leagueSize: size,
    playoffSpots: spots,
    weeksLeft,
    marginToCut: margin,
    catsPerWeek: categories.value.length || 10,
    estimateSpots: !(isEspnCategoryLeague.value && espn.playoffTeamCount.value),
  }
})

// Positional CAUSE of a category hole: for each category, the same-side roster slots
// whose best contributor is weakest in that cat (lowest z). Ties standings holes to
// roster construction — "your HR hole = C · 2B". CategoryProfile shows it on
// battleground rows.
// A slot whose best body is this strong (cross-role value) is never a "drag" — it's an
// elite specialist, not a hole you'd upgrade. Below this is solid/fringe territory.
const DRAG_VALUE_CAP = 60
const draggersByStatId = computed<Record<string, string[]>>(() => {
  const out: Record<string, string[]> = {}
  if (!contributions.value.length) return out
  const posByKey = new Map(rosterPool.value.map((p) => [p.playerKey, eligOf(p)[0] || String(p.position || '')]))
  const sideByStatId = new Map(catSpecs.value.map((c) => [c.statId, c.side]))
  for (const cat of catSpecs.value) {
    const side = sideByStatId.get(cat.statId)
    // Per slot, its BEST body in this cat — and that body's OVERALL value, so we don't
    // blame an elite specialist. A high-value player who simply doesn't pile up one
    // stat (e.g. a 98-value catcher light on RBI) isn't "dragging" the cat — upgrading
    // his slot wouldn't be the move. Only a genuinely weak slot is a real drag.
    const bestByPos = new Map<string, { z: number; value: number }>()
    for (const c of contributions.value) {
      if ((c.role === 'pitcher' ? 'pit' : 'hit') !== side) continue
      const pos = posByKey.get(c.playerKey)
      if (!pos) continue
      const z = c.contribs.find((x) => x.statId === cat.statId)?.z ?? 0
      const cur = bestByPos.get(pos)
      if (cur === undefined || z > cur.z) bestByPos.set(pos, { z, value: c.crossPercentile ?? 0 })
    }
    // The single weakest slot that ACTUALLY drags this cat: its best body hurts the cat
    // (z < 0) AND isn't a strong overall contributor (value below the core/solid bar).
    // One slot only — naming three positions for one hole was noise.
    const worst = [...bestByPos.entries()]
      .filter(([, b]) => b.z < 0 && b.value < DRAG_VALUE_CAP)
      .sort((a, b) => a[1].z - b[1].z)
      .slice(0, 1)
      .map(([pos]) => pos)
    if (worst.length) out[cat.statId] = worst
  }
  return out
})

// ── positional depth ────────────────────────────────────────────────────────
// Reuse the Trades positional engine (which computes but never surfaces this) to
// show, per required starting slot: how deep/thin you are vs the league AND how
// your best body at that slot ranks among everyone rostered there. Depth/surplus is
// the actionable bit (thin = upgrade/injury risk; deep = trade-from); the rank is
// the recognizable "Nth-best at the position" signal.
// Lineup-card order: every batting slot, then every pitching slot. Flex slots (MI/CI/
// UTIL/P) sit after the concrete positions they overlap. Slots not listed append at the end.
const SLOT_DISPLAY_ORDER = ['C', '1B', '2B', '3B', 'SS', 'MI', '2B/SS', 'CI', '1B/3B', 'OF', 'LF', 'CF', 'RF', 'DH', 'IF', 'UTIL', 'SP', 'RP', 'P']
// eligOf + pitcher role classification are shared with the Trades league landscape so both
// views slot pitchers identically. See src/trades/lineupEligibility.ts.
const rosterSlotsForPos = computed(() =>
  isEspnCategoryLeague.value ? espn.rosterSlots.value : yahooRosterSlots.value,
)
// My team's key AS THE POOL LABELS IT. Standings use a short team_id ("7") while the
// league pool uses the full fantasy_team_key ("431.l.….t.7") — derive my pool key
// from one of my own players so the landscape lookup matches on BOTH platforms.
const myPoolTeamKey = computed(() => {
  const mineSet = new Set(myPlayerKeys.value)
  const me = rosterPool.value.find((p) => mineSet.has(p.playerKey)) as { teamKey?: string } | undefined
  return me?.teamKey ? String(me.teamKey) : ''
})
// Your OPTIMAL STARTING LINEUP vs the league. We solve every team's best legal lineup
// (assignSlots — greedy, scarcity-aware, so a multi-eligible body fills exactly one slot
// and your dead spots get covered), then for each opening show who you'd start and how
// that starter ranks against every other team's starter at the same opening. An aggregate
// "your best lineup projects Nth of N" grades the whole lineup by total starter value.
const SLOT_ORDER_INDEX = (s: string) => {
  const i = SLOT_DISPLAY_ORDER.indexOf(s.toUpperCase()) // case-insensitive (Yahoo "Util" vs ESPN "UTIL")
  return i < 0 ? SLOT_DISPLAY_ORDER.length : i
}
const positionalLineup = computed(() => {
  const pool = rosterPool.value
  const slots = rosterSlotsForPos.value
  const eng = tradeEngine.value
  const myKey = myPoolTeamKey.value
  if (!pool.length || !eng || !myKey || !Object.keys(slots).length) return null
  const role = eng.roleValueByKey
  const valOf = (k: string) => role.get(k) ?? 0
  const nameByKey = new Map(pool.map((p) => [p.playerKey, p.name]))
  const fgMap = fgByKey.value

  // Pitchers are slotted by projected role (see lineupEligFor) so a starter competes for SP, a
  // reliever for RP, and the flex P slot takes overflow — ignoring ESPN's inconsistent SP/RP/P
  // tags. Hitters keep their real multi-position eligibility.
  const lineupElig = (p: { playerKey: string; eligiblePositions?: string[]; position?: string }): string[] =>
    lineupEligFor(p, fgMap)

  // Group the league pool by team as DepthPlayer[] (value = role-relative percentile, so a
  // hitter slot ranks hitters and a pitcher slot ranks pitchers on the same scale).
  const byTeam = new Map<string, DepthPlayer[]>()
  for (const p of pool) {
    const tk = String((p as { teamKey?: string }).teamKey ?? '')
    if (!tk) continue
    ;(byTeam.get(tk) ?? byTeam.set(tk, []).get(tk)!).push({
      playerKey: p.playerKey,
      teamKey: tk,
      eligiblePositions: lineupElig(p),
      value: valOf(p.playerKey),
      status: tk === myKey && (p as { onIL?: boolean }).onIL ? 'IL' : '',
    })
  }
  const teams = [...byTeam.keys()]
  const numTeams = teams.length

  // Solve each team's optimal lineup ONCE. assignedByPos[slot] = the player(s) that team
  // would start at that slot. Then per slot, sort a team's starters by value (best first)
  // so the i-th opening compares like-for-like across teams (your OF1 vs their OF1).
  const startersByTeamSlot = new Map<string, Record<string, { key: string; v: number }[]>>()
  for (const tk of teams) {
    // bar = 0: fill each slot with your best AVAILABLE eligible body, even a weak one — a
    // lineup card fields someone at every slot, and the rank (red) tells you he's bad. The
    // STARTABLE_BAR is for surplus detection, not "who would you start"; using it here blanked
    // slots whose only bodies were below replacement ("no startable option" for a C you roster).
    const assigned = assignSlots(byTeam.get(tk) ?? [], slots, 0).assignedByPos
    const bySlot: Record<string, { key: string; v: number }[]> = {}
    for (const [slot, keys] of Object.entries(assigned)) {
      bySlot[slot] = keys.map((k) => ({ key: k, v: valOf(k) })).sort((a, b) => b.v - a.v)
    }
    startersByTeamSlot.set(tk, bySlot)
  }

  // Aggregate grade: total value of a team's whole optimal lineup. A team with an unfilled
  // slot simply totals fewer starters, so holes cost you — exactly the intent.
  const lineupTotal = (tk: string) => {
    let s = 0
    for (const arr of Object.values(startersByTeamSlot.get(tk) ?? {})) for (const x of arr) s += x.v
    return s
  }
  const totals = teams.map((tk) => ({ tk, total: lineupTotal(tk) })).sort((a, b) => b.total - a.total)
  const lineupRank = totals.findIndex((t) => t.tk === myKey) + 1 || null

  // One row per opening, ordered like a lineup card. EVERY team counts toward the
  // denominator (a team with no starter at the opening ranks last) so it reads "2nd of 12".
  const orderedSlots = Object.keys(slots)
    .filter((s) => slots[s] > 0)
    .sort((a, b) => SLOT_ORDER_INDEX(a) - SLOT_ORDER_INDEX(b))
  const rows: { slot: string; starterName: string | null; rank: number | null; numTeams: number; strong: boolean; weak: boolean }[] = []
  for (const slot of orderedSlots) {
    for (let i = 0; i < slots[slot]; i++) {
      const ranked = teams
        .map((tk) => ({ tk, v: startersByTeamSlot.get(tk)?.[slot]?.[i]?.v ?? -Infinity, key: startersByTeamSlot.get(tk)?.[slot]?.[i]?.key }))
        .sort((a, b) => b.v - a.v)
      const myIdx = ranked.findIndex((r) => r.tk === myKey)
      const myEntry = ranked[myIdx]
      const filled = !!myEntry && Number.isFinite(myEntry.v)
      const rank = filled ? myIdx + 1 : null
      rows.push({
        slot: slot.toUpperCase(), // display label (Yahoo "Util" -> "UTIL", consistent with ESPN)
        starterName: filled ? nameByKey.get(myEntry.key!) ?? null : null,
        rank,
        numTeams,
        strong: rank != null && rank <= Math.ceil(numTeams / 3),
        weak: rank == null || rank > (numTeams * 2) / 3,
      })
    }
  }
  return { lineupRank, numTeams, rows }
})

// Drop candidates + weak link, derived from the contribution tiers.
const drops = computed(() => {
  if (!contributions.value.length) return { candidates: [], weakLink: null }
  return computeDropCandidates(contributions.value)
})

// Per-category position by PRODUCTION rank (how much you produce vs the league),
// tiered strong / winnable / safe / lost. Feeds the Category Profile viz. This is the
// forward-looking "how your team stacks up" lens (not the record-based standings).
const gaps = computed(() => {
  if (!myPoolTeamKey.value || !catSpecs.value.length || !leagueTotals.value.length) return []
  return computeProductionGaps(leagueTotals.value, catSpecs.value, myPoolTeamKey.value)
})

// Labels for the gap rows (statId -> display label).
const gapCategories = computed(() =>
  categories.value.map((c) => ({ statId: c.statId, label: c.label })),
)

// Categories load asynchronously after the league data resolves; (re)load the
// snapshot once they're available so it doesn't no-op on first mount. Declared
// here (after the base computeds) because `watch` evaluates its source eagerly
// during setup, and `categories` reads later-declared computeds.
watch(categories, () => {
  maybeLoadThisWeek()
})
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-6 space-y-8">
    <SituationStrip
      v-if="profile"
      :team-name="profile.teamName"
      :team-avatar="profile.teamAvatar"
      :record="record"
      :verdict="verdict"
    />

    <SeasonArc
      v-if="profile && seasonArc"
      :rank="seasonArc.rank"
      :league-size="seasonArc.leagueSize"
      :playoff-spots="seasonArc.playoffSpots"
      :weeks-left="seasonArc.weeksLeft"
      :margin-to-cut="seasonArc.marginToCut"
      :cats-per-week="seasonArc.catsPerWeek"
      :estimate-spots="seasonArc.estimateSpots"
    />

    <!-- Hub triage: My Team owns the season picture + roster; the week, adds, and
         trades each have their own page. These cards route there with a one-line
         teaser instead of duplicating the matchup / daily-moves content here. -->
    <MyTeamLevers v-if="profile" :snapshot="thisWeek.snapshot.value" :hole-add="holeAdd" :hole-note="holeNote" />

    <!-- Season-long category picture. The Category Profile is the complete ranking
         AND carries the top add for each category worth improving — the merge that
         retired the separate "Where you're losing / Your edge" block. -->
    <div v-if="profile" class="space-y-1 pt-2">
      <div class="flex items-center gap-2">
        <span class="rounded bg-dark-border/70 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-dark-textSecondary">Season</span>
        <span class="font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">rest-of-season ranks</span>
        <span class="h-px flex-1 bg-dark-border/50"></span>
        <!-- Categories / Positions lens toggle (shortens the page — one view at a time). -->
        <div class="flex overflow-hidden rounded-md border border-dark-border text-[10px] font-mono uppercase tracking-wider">
          <button
            class="px-2.5 py-1 transition-colors"
            :class="seasonView === 'cat' ? 'bg-primary/15 text-primary' : 'text-dark-textMuted hover:text-dark-text'"
            @click="seasonView = 'cat'"
          >Categories</button>
          <button
            class="border-l border-dark-border px-2.5 py-1 transition-colors"
            :class="seasonView === 'pos' ? 'bg-primary/15 text-primary' : 'text-dark-textMuted hover:text-dark-text'"
            @click="seasonView = 'pos'"
          >Positions</button>
        </div>
      </div>
      <p class="font-mono text-[10px] text-dark-textMuted/70">
        {{ seasonView === 'cat' ? 'How you project to rank in each category, rest of season.' : 'Your best lineup vs every team, position by position.' }}
      </p>
    </div>

    <section v-if="profile && seasonView === 'cat'" class="space-y-2">
      <CategoryProfile :gaps="gaps" :categories="gapCategories" :adds-by-stat-id="addsByStatId" :draggers-by-stat-id="draggersByStatId" />
    </section>

    <PositionalDepth v-if="profile && seasonView === 'pos' && positionalLineup" :lineup="positionalLineup" />

    <section v-if="profile" class="space-y-2">
      <h2 class="text-sm font-display font-semibold uppercase tracking-wide text-dark-textMuted">Your Roster</h2>
      <p v-if="rosterLoading && rosterPlayers.length === 0" class="text-sm text-dark-textMuted">
        Loading your roster...
      </p>
      <RosterPanel
        v-else-if="rosterPlayers.length > 0"
        :players="rosterPlayers"
        :categories="categories"
        :contributions="contributions"
        :drops="drops"
        :sell-high="sellHighKeys"
      />
      <p v-else-if="rosterLoaded" class="text-sm text-dark-textMuted">
        No roster found for your team.
      </p>
    </section>

    <!-- Dev-only: FanGraphs match audit (?fgaudit=1). Unmatched players use extrapolated
         season-to-date instead of an ROS projection — the usual cause of a surprising value. -->
    <section v-if="profile && showFgAudit && fgMatchAudit.total" class="space-y-2">
      <h2 class="font-mono text-[11px] uppercase tracking-wide text-[#5ec8e6]">
        FG match audit · {{ fgMatchAudit.matched }}/{{ fgMatchAudit.total }} matched
        <span class="text-dark-textMuted normal-case">(dev only)</span>
      </h2>
      <div class="rounded-xl border border-[#5ec8e6]/30 bg-dark-card px-4 py-3 font-mono text-[11px]">
        <div
          v-for="r in fgMatchAudit.rows"
          :key="r.name"
          class="border-b border-dark-border/20 py-1 last:border-0"
        >
          <div class="flex items-center justify-between">
            <span :class="r.matched ? 'text-dark-textSecondary' : 'text-[#f26d6d]'">
              {{ r.matched ? '✓ FG' : '✗ extrapolated' }}
            </span>
            <span class="flex-1 truncate px-3" :class="r.matched ? 'text-dark-text' : 'text-[#f26d6d]'">{{ r.name }}</span>
            <span class="tabular-nums text-dark-textMuted">VS ALL {{ r.value }} · score {{ r.score }}</span>
          </div>
          <div v-if="r.top" class="truncate pl-[3.2rem] text-[10px] tabular-nums text-dark-textMuted/80">{{ r.top }}</div>
        </div>
        <p class="mt-2 border-t border-dark-border/40 pt-2 text-[10px] text-dark-textMuted">
          ✗ = no FanGraphs projection matched (value is extrapolated season-to-date). A low
          ✗ player may be a name-match miss; a low ✓ player is a real projection. <b>score</b> =
          sum of category z's (the raw value behind VS ALL); the per-cat z's below show what drives it.
        </p>
      </div>
    </section>

    <!-- Dev-only baseline diagnostic (?fgaudit=1): std=0 means the cat can't differentiate -->
    <section v-if="profile && showFgAudit && baselineDump.length" class="space-y-1">
      <h2 class="font-mono text-[11px] uppercase tracking-wide text-[#e6b85e]">VALUE BASELINE (dev only) · std=0 → collapsed</h2>
      <div class="overflow-x-auto rounded-xl border border-[#e6b85e]/30 bg-dark-card px-3 py-2 font-mono text-[11px]">
        <div v-for="r in baselineDump" :key="r.statId" class="flex items-center gap-3 py-0.5">
          <span class="w-16 text-dark-text">{{ r.label }}</span>
          <span class="w-10 text-dark-textMuted">{{ r.statId }}</span>
          <span class="w-8" :class="r.side === 'pit' ? 'text-[#5ec8e6]' : 'text-[#e6b85e]'">{{ r.side }}</span>
          <span class="w-24 tabular-nums" :class="r.std === 0 ? 'text-[#f26d6d] font-bold' : 'text-dark-textSecondary'">std {{ r.std }}</span>
          <span class="tabular-nums text-dark-textMuted">mean {{ r.mean }}</span>
        </div>
      </div>
    </section>

    <!-- Dev-only per-cat add pool (?catadd=1) — why a suspect chip (e.g. a catcher for SB)
         gets picked: shows the ranked eligible FA pool with projected stat value + percentile. -->
    <section v-if="showCatAdd && catAddDump.length" class="space-y-2">
      <h2 class="font-mono text-[11px] uppercase tracking-wide text-[#5ec8e6]">
        PER-CAT ADD POOL (dev only) · what the "add X · cat" chip picks from
      </h2>
      <div class="space-y-3">
        <div
          v-for="c in catAddDump"
          :key="c.statId"
          class="overflow-x-auto rounded-xl border border-[#5ec8e6]/30 bg-dark-card px-3 py-2 font-mono text-[11px]"
        >
          <div class="mb-1 flex items-center gap-3 border-b border-dark-border/40 pb-1">
            <span class="font-bold text-dark-text">{{ c.label }}</span>
            <span class="text-dark-textMuted">stat {{ c.statId }}</span>
            <span class="text-dark-textMuted">hole.side={{ c.side }}</span>
            <span class="text-dark-textMuted">pool={{ c.poolSize }}</span>
          </div>
          <div v-for="(a, i) in c.adds" :key="a.name" class="flex items-center gap-2 py-0.5">
            <span class="w-4 text-right text-dark-textMuted">{{ i + 1 }}</span>
            <span class="w-40 truncate" :class="i === 0 ? 'text-primary font-bold' : 'text-dark-text'">{{ a.name }}</span>
            <span class="w-10 text-dark-textMuted">{{ a.pos }}</span>
            <span class="w-8" :class="a.side === c.side ? 'text-dark-textMuted' : 'text-[#f26d6d] font-bold'">{{ a.side }}</span>
            <span class="w-20 tabular-nums text-dark-textSecondary">val {{ a.val }}</span>
            <span class="w-16 tabular-nums text-dark-textMuted">pct {{ a.pct }}</span>
          </div>
          <div class="mt-1 border-t border-dark-border/40 pt-1 text-[10px] text-dark-textMuted">
            <span class="text-dark-textSecondary">{{ c.topName }} raw:</span>
            <span v-for="r in c.topRaw" :key="r.id" class="ml-1.5 tabular-nums">{{ r.id }}={{ r.disp }}:{{ r.v }}</span>
          </div>
        </div>
        <p class="font-mono text-[10px] text-dark-textMuted">
          Row 1 (highlighted) is what the chip shows. If its <b>val</b> is a real-but-tiny number
          in a small <b>pool</b>, it's a thin-pool artifact (suppress token adds). If <b>val</b>
          looks garbage or <b>side</b> is red (wrong side), it's a data leak (filter it).
        </p>
      </div>
    </section>

    <!-- Dev-only category diagnostic (?catdebug=1) — compare row-for-row against the Wire -->
    <CatDebugPanel v-if="profile && showCatDebug && catDebug.rows.length" :debug="catDebug" />

    <p v-if="!profile" class="text-sm text-dark-textMuted">
      {{ emptyStateMessage }}
    </p>
  </div>
</template>
