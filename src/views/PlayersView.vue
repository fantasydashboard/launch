<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { profileFromStandings, type StandingsEntryLike } from '@/recommendations/fromStandings'
import { computeCategoryWeaknesses } from '@/recommendations/categorySignals'
import type { CategoryDef } from '@/recommendations/types'
import { useFullSeasonCategoryData } from '@/composables/useFullSeasonCategoryData'
import { isYahooCategoryLeague as isYahooCategoryScoringType } from '@/composables/useIsCategoryLeague'
import { useAvailablePlayers } from '@/composables/useAvailablePlayers'
import { rankAddsForHoles } from '@/players/rankAdds'
import { isLowerBetter } from '@/players/direction'
import type { Hole } from '@/players/types'
import AddCard from '@/components/players/AddCard.vue'

const leagueStore = useLeagueStore()
const { players, loaded: playersLoaded, load: loadPlayers } = useAvailablePlayers()

// === BEGIN copied-from-MyTeamView derivation (standings/categories/myTeamId + season load) ===
// Copied VERBATIM from src/views/MyTeamView.vue so Players and My Team share identical
// league context. (A future refactor will hoist this into a shared composable.)

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

function maybeLoadPlayers() {
  if (isYahooCategoryLeague.value) {
    loadPlayers()
  }
}

onMounted(() => {
  maybeLoadSeasonData()
  maybeLoadPlayers()
})
// Reload when the active league changes (e.g. switching into a category league).
watch(() => leagueStore.activeLeagueId, () => {
  maybeLoadSeasonData()
  maybeLoadPlayers()
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
// === END copied derivation ===

const profile = computed(() => {
  if (!myTeamId.value || standings.value.length === 0 || categories.value.length === 0) return null
  try {
    return profileFromStandings(standings.value, categories.value, myTeamId.value)
  } catch {
    return null
  }
})

const holes = computed<Hole[]>(() => {
  if (!profile.value) return []
  // Weak categories, worst first, top 4. Reuse the Slice 1 weakness rule for consistency.
  const weak = computeCategoryWeaknesses(profile.value, categories.value)
    .sort((a, b) => b.leverage - a.leverage)
    .slice(0, 4)
  return weak.map((rec) => {
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

const holeAdds = computed(() =>
  holes.value.length && players.value.length
    ? rankAddsForHoles(players.value, holes.value, { perHole: 4 })
    : [],
)

// True while we don't yet have a usable profile AND at least one data source is
// still in flight. Once both data sources report loaded (or profile is available),
// the loading state ends.
const isLoading = computed(() =>
  !profile.value && (!playersLoaded.value || !seasonLoaded.value)
)

function labelFor(statId: string): string {
  return categories.value.find((c) => c.statId === statId)?.label ?? statId
}
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-6 space-y-6">
    <h1 class="text-2xl font-bold text-dark-text">Players</h1>
    <p class="text-sm text-dark-textMuted">Top available players for your weakest categories.</p>

    <!-- Loading state: data still arriving -->
    <p v-if="isLoading" class="text-sm text-dark-textMuted">
      Finding your best available adds…
    </p>

    <!-- No weaknesses: data loaded, but no holes found -->
    <p v-else-if="holeAdds.length === 0 && profile" class="text-sm text-dark-textMuted">
      No weak categories right now. You're competitive across the board.
    </p>

    <!-- Hard data failure: loaded but no profile (should be rare given the wrapper) -->
    <p v-else-if="holeAdds.length === 0 && !profile" class="text-sm text-dark-textMuted">
      No data yet — category standings will appear once matchup results are in.
    </p>

    <!-- Results: per-hole add groups -->
    <section v-for="group in holeAdds" :key="group.hole.statId" class="space-y-2">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-dark-textMuted">
        Adds for {{ group.hole.name }} <span class="text-dark-textMuted/70">(you're {{ group.hole.rank }}th)</span>
      </h2>
      <div class="rounded-xl bg-dark-card border border-dark-border divide-y divide-dark-border/60">
        <p v-if="group.adds.length === 0" class="px-4 py-6 text-sm text-dark-textMuted">
          No standout free agents in {{ group.hole.name }} right now.
        </p>
        <AddCard
          v-for="add in group.adds"
          :key="add.player.playerKey"
          :add="add"
          :stat-label="labelFor(group.hole.statId)"
        />
      </div>
    </section>
  </div>
</template>
