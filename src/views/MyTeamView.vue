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
import { rankAddsForHoles } from '@/players/rankAdds'
import { isLowerBetter } from '@/players/direction'
import type { Hole } from '@/players/types'
import ActionFeed from '@/components/myteam/ActionFeed.vue'
import SituationStrip from '@/components/myteam/SituationStrip.vue'
import CategoryProfile from '@/components/myteam/CategoryProfile.vue'
import RosterPanel from '@/components/myteam/RosterPanel.vue'

const leagueStore = useLeagueStore()
const { players, load: loadPlayers } = useAvailablePlayers()
const { players: rosterPlayers, loading: rosterLoading, loaded: rosterLoaded, load: loadRoster } = useMyRoster()

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

onMounted(() => {
  maybeLoadSeasonData()
  maybeLoadPlayers()
  maybeLoadRoster()
})
// Reload when the active league changes (e.g. switching into a category league).
watch(() => leagueStore.activeLeagueId, () => {
  maybeLoadSeasonData()
  maybeLoadPlayers()
  maybeLoadRoster()
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
const standings = computed<StandingsEntryLike[]>(() => {
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
const categories = computed<CategoryDef[]>(() => {
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
const myTeamId = computed<string | null>(() => {
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
// "Add: …" line on a weakness row matches the #1 player on /players?cat=<statId>.
const holes = computed<Hole[]>(() => {
  if (!profile.value) return []
  return weaknesses.value.map((rec) => {
    const cat = categories.value.find((c) => c.statId === rec.statId)
    const teamCat = profile.value!.categories.find((c) => c.statId === rec.statId)
    return {
      statId: rec.statId,
      name: cat?.name ?? rec.statId,
      rank: teamCat?.rank ?? 0,
      lowerIsBetter: cat ? isLowerBetter(cat.label || cat.name || cat.statId) : false,
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
    map[group.hole.statId] = {
      name: top.player.name,
      statValue: top.statValue,
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
const myOverallRank = computed<number>(() => {
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

    <div
      v-if="weaknesses.length > 0 || strengths.length > 0"
      class="grid gap-6 md:grid-cols-2"
    >
      <section v-if="weaknesses.length > 0" class="space-y-2">
        <h2 class="text-sm font-display font-semibold uppercase tracking-wide text-dark-textMuted">Where you're losing</h2>
        <ActionFeed :recommendations="weaknessRecommendations" :adds-by-stat-id="addsByStatId" />
      </section>

      <section v-if="strengths.length > 0" class="space-y-2">
        <h2 class="text-sm font-display font-semibold uppercase tracking-wide text-dark-textMuted">Your edge</h2>
        <ActionFeed :recommendations="strengths" />
      </section>
    </div>

    <section v-if="profile" class="space-y-2">
      <h2 class="text-sm font-display font-semibold uppercase tracking-wide text-dark-textMuted">Category Profile</h2>
      <CategoryProfile
        :categories="categories"
        :team-categories="profile.categories"
        :num-teams="profile.numTeams"
      />
    </section>

    <section v-if="profile" class="space-y-2">
      <h2 class="text-sm font-display font-semibold uppercase tracking-wide text-dark-textMuted">Your Roster</h2>
      <p v-if="rosterLoading && rosterPlayers.length === 0" class="text-sm text-dark-textMuted">
        Loading your roster…
      </p>
      <RosterPanel
        v-else-if="rosterPlayers.length > 0"
        :players="rosterPlayers"
        :categories="categories"
      />
      <p v-else-if="rosterLoaded" class="text-sm text-dark-textMuted">
        No roster found for your team.
      </p>
    </section>

    <p v-if="!profile" class="text-sm text-dark-textMuted">
      Connect or select a category league to see your team's edge.
    </p>
  </div>
</template>
