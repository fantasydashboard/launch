<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { profileFromStandings, type StandingsEntryLike } from '@/recommendations/fromStandings'
import { computeCategoryWeaknesses, computeCategoryStrengths } from '@/recommendations/categorySignals'
import type { CategoryDef } from '@/recommendations/types'
import { useFullSeasonCategoryData } from '@/composables/useFullSeasonCategoryData'
import { isYahooCategoryLeague as isYahooCategoryScoringType } from '@/composables/useIsCategoryLeague'
import { useAvailablePlayers } from '@/composables/useAvailablePlayers'
import { useMyRoster } from '@/composables/useMyRoster'
import { useEspnCategoryTeamData } from '@/composables/useEspnCategoryTeamData'
import { useThisWeekMatchup } from '@/composables/useThisWeekMatchup'
import { useYourMove } from '@/composables/useYourMove'
import type { BenchPlayer } from '@/myteam/yourMove/generators/startSitGenerator'
import { rankAddsForHoles } from '@/players/rankAdds'
import { isLowerBetter } from '@/players/direction'
import type { Hole } from '@/players/types'
import { computeRosterValue, type CatSpec } from '@/myteam/value'
import { toEffectiveStats } from '@/myteam/effectiveStats'
import { mapToEspnStats } from '@/services/projectionService'
import { classifyCategory } from '@/myteam/categorySide'
import { computeDropCandidates } from '@/myteam/dropCandidates'
import { computeCategoryGaps } from '@/myteam/categoryGaps'
import ActionFeed from '@/components/myteam/ActionFeed.vue'
import SituationStrip from '@/components/myteam/SituationStrip.vue'
import CategoryProfile from '@/components/myteam/CategoryProfile.vue'
import RosterPanel from '@/components/myteam/RosterPanel.vue'
import MatchupSnapshot from '@/components/myteam/MatchupSnapshot.vue'
import YourMove from '@/components/myteam/YourMove.vue'

const leagueStore = useLeagueStore()
const { players: yahooFreeAgents, load: loadPlayers } = useAvailablePlayers()
const {
  players: yahooRosterPlayers,
  pool: yahooRosterPool,
  fgByKey: yahooFgByKey,
  loading: yahooRosterLoading,
  loaded: yahooRosterLoaded,
  load: loadRoster,
} = useMyRoster()

const espn = useEspnCategoryTeamData()
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
const rosterLoading = computed(() =>
  isEspnCategoryLeague.value ? espn.loading.value : yahooRosterLoading.value,
)
const rosterLoaded = computed(() =>
  isEspnCategoryLeague.value ? espn.loaded.value : yahooRosterLoaded.value,
)
const players = computed(() =>
  isEspnCategoryLeague.value ? espn.freeAgents.value : yahooFreeAgents.value,
)

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

const weaknesses = computed(() => {
  if (!profile.value) return []
  return computeCategoryWeaknesses(profile.value, categories.value)
    .slice()
    .sort((a, b) => b.leverage - a.leverage)
    .slice(0, 4)
})

// === Close the loop: top available add per weak category ===
// Map each weakness Recommendation to a Hole (exactly as PlayersView does), then
// rank the FA pool for those holes (1 add per hole). Reuses rankAddsForHoles so the
// "Add: ..." line on a weakness row matches the #1 player on /players?cat=<statId>.
const holes = computed<Hole[]>(() => {
  if (!profile.value) return []
  return weaknesses.value.map((rec) => {
    const cat = categories.value.find((c) => c.statId === rec.statId)
    const teamCat = profile.value!.categories.find((c) => c.statId === rec.statId)
    return {
      statId: rec.statId,
      name: cat?.name ?? rec.statId,
      rank: teamCat?.rank ?? 0,
      lowerIsBetter: cats.value.find((c) => c.statId === rec.statId)?.lowerIsBetter ?? false,
    }
  })
})

// statId -> top add (for the inline "Add: {name} ({statValue} {label})" line).
const addsByStatId = computed<Record<string, { name: string; statValue: number; label: string }>>(() => {
  if (!holes.value.length || !players.value.length) return {}
  const groups = rankAddsForHoles(players.value, holes.value, { perHole: 1 })
  const map: Record<string, { name: string; statValue: number; label: string }> = {}
  for (const group of groups) {
    const top = group.adds[0]
    if (!top) continue
    const cat = categories.value.find((c) => c.statId === group.hole.statId)
    const spec = catSpecs.value.find((c) => c.statId === group.hole.statId)
    // Ratio cats (ERA/WHIP/OBA) read as 2 decimals; counting cats as whole numbers.
    const statValue = spec?.isRatio ? Math.round(top.statValue * 100) / 100 : Math.round(top.statValue)
    // A rounded-to-zero improvement is not a real suggestion.
    if (statValue === 0) continue
    map[group.hole.statId] = {
      name: top.player.name,
      statValue,
      label: cat?.label ?? group.hole.statId,
    }
  }
  return map
})

// Weakness rows with deep-link routes: /players?cat=<statId> when an add exists for
// that category, else plain /players (no anchor). Headline/severity/etc. unchanged.
const weaknessRecommendations = computed(() =>
  weaknesses.value.map((rec) => ({
    ...rec,
    evidenceRoute: addsByStatId.value[rec.statId]
      ? `/players?cat=${rec.statId}`
      : '/players',
  })),
)

const strengths = computed(() => {
  if (!profile.value) return []
  return computeCategoryStrengths(profile.value, categories.value)
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
      volumeStatId: isRatio ? (side === 'pit' ? ipStatId : abStatId) : undefined,
    }
  })
})

// My players' keys (matches the playerKey shape used by the pool/contribution engine).
const myPlayerKeys = computed(() => rosterPlayers.value.map((p) => p.playerKey))

// Slice 2: blend FanGraphs rest-of-season projections into roster value.
const SEASON_FRACTION = 0.6 // baseball, ~mid-late season; only scales unmatched players' counting stats

// Map each matched FGProjection to league stat_ids, keyed by playerKey. Empty
// when FanGraphs returns no rows (degrades to extrapolated YTD downstream).
const fgStatsByKey = computed<Record<string, Record<string, number>>>(() => {
  const fgMap = fgByKey.value
  if (!fgMap || !catSpecs.value.length) return {}
  const labelByStatId = new Map(categories.value.map((c) => [c.statId, c.label || c.name || c.statId]))
  const fgCats = catSpecs.value.map((c) => ({
    stat_id: c.statId,
    display_name: labelByStatId.get(c.statId),
    isPitching: c.side === 'pit',
  }))
  const out: Record<string, Record<string, number>> = {}
  for (const key of Object.keys(fgMap)) {
    const fg = fgMap[key]
    if (fg) out[key] = mapToEspnStats(fg, fgCats)
  }
  return out
})

// Contribution per my player: which categories they help (plus) / hurt (minus).
// Slice 2: effective stats blend FanGraphs ROS projections (when matched) with
// extrapolated season-to-date totals; toEffectiveStats falls back to YTD when no FG row.
const contributions = computed(() => {
  if (!rosterPool.value.length || !myPlayerKeys.value.length || !catSpecs.value.length) return []
  const fgMap = fgStatsByKey.value
  const effectivePool = rosterPool.value.map((p) => ({
    playerKey: p.playerKey,
    position: p.position,
    stats: toEffectiveStats(p.stats, fgMap[p.playerKey] ?? null, catSpecs.value, SEASON_FRACTION),
  }))
  return computeRosterValue(effectivePool, myPlayerKeys.value, catSpecs.value)
})

// Drop candidates + weak link, derived from the contribution tiers.
const drops = computed(() => {
  if (!contributions.value.length) return { candidates: [], weakLink: null }
  return computeDropCandidates(contributions.value)
})

// Per-category position + gap: where I sit (rank on a 1->N scale) and whether the
// category is strong / winnable / safe / lost. Feeds the Category Profile viz.
const gaps = computed(() => {
  if (!profile.value || !standings.value.length || !cats.value.length) return []
  return computeCategoryGaps(standings.value, profile.value, cats.value)
})

// Labels for the gap rows (statId -> display label).
const gapCategories = computed(() =>
  categories.value.map((c) => ({ statId: c.statId, label: c.label })),
)

// statId -> short label (HR, ERA, ...) so Your Move shows category names, not ids.
const labelByStatId = computed<Record<string, string>>(() => {
  const m: Record<string, string> = {}
  for (const c of categories.value) m[c.statId] = c.label
  return m
})

// Tier lookup for the weakness ActionFeed (winnable/lost tags).
const tierByStatId = computed<Record<string, 'strong' | 'winnable' | 'safe' | 'lost'>>(() => {
  const map: Record<string, 'strong' | 'winnable' | 'safe' | 'lost'> = {}
  for (const gap of gaps.value) {
    map[gap.statId] = gap.tier
  }
  return map
})

// My benched players (lineup data only present on Yahoo for now; other platforms
// report started=undefined, so this is empty and start/sit calls degrade away).
const myBenchedPlayers = computed<BenchPlayer[]>(() =>
  rosterPlayers.value
    .filter((p) => (p as { started?: boolean }).started === false)
    .map((p) => ({
      playerKey: p.playerKey,
      name: p.name,
      team: (p as { team?: string }).team ?? '',
      position: (p as { position?: string }).position ?? '',
      stats: (p as { stats?: Record<string, number> }).stats ?? {},
    })),
)

// "Your Move" — ranked short stack of this-week recommendations. Instantiated
// here (after catSpecs / players / SEASON_FRACTION are declared) because it reads
// those refs eagerly; declaring it earlier would hit a temporal-dead-zone error.
const yourMove = useYourMove({
  catSpecs,
  freeAgents: players,
  benchedPlayers: myBenchedPlayers,
  snapshot: thisWeek.snapshot,
  seasonFraction: computed(() => SEASON_FRACTION),
})

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
      :record="record"
      :rank="myOverallRank"
      :num-teams="profile.numTeams"
      :verdict="verdict"
    />

    <YourMove
      v-if="profile"
      :moves="yourMove.moves.value"
      :loading="rosterLoading"
      :label-by-stat-id="labelByStatId"
    />

    <MatchupSnapshot :snapshot="thisWeek.snapshot.value" />

    <!-- Season-long context lives below the this-week decision layer. -->
    <div
      v-if="profile && (weaknesses.length > 0 || strengths.length > 0)"
      class="flex items-center gap-2 pt-2"
    >
      <span class="font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">Season · full-year ranks</span>
      <span class="h-px flex-1 bg-dark-border/50"></span>
    </div>

    <div
      v-if="weaknesses.length > 0 || strengths.length > 0"
      class="grid gap-6 md:grid-cols-2"
    >
      <section v-if="weaknesses.length > 0" class="space-y-2">
        <h2 class="text-sm font-display font-semibold uppercase tracking-wide text-dark-textMuted">Where you're losing</h2>
        <ActionFeed :recommendations="weaknessRecommendations" :adds-by-stat-id="addsByStatId" :tier-by-stat-id="tierByStatId" />
      </section>

      <section v-if="strengths.length > 0" class="space-y-2">
        <h2 class="text-sm font-display font-semibold uppercase tracking-wide text-dark-textMuted">Your edge</h2>
        <ActionFeed :recommendations="strengths" />
      </section>
    </div>

    <section v-if="profile" class="space-y-2">
      <h2 class="text-sm font-display font-semibold uppercase tracking-wide text-dark-textMuted">Category Profile</h2>
      <CategoryProfile :gaps="gaps" :categories="gapCategories" />
    </section>

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
      />
      <p v-else-if="rosterLoaded" class="text-sm text-dark-textMuted">
        No roster found for your team.
      </p>
    </section>

    <p v-if="!profile" class="text-sm text-dark-textMuted">
      {{ emptyStateMessage }}
    </p>
  </div>
</template>
