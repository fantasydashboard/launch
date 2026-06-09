<script setup lang="ts">
import { computed } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { profileFromStandings, type StandingsEntryLike } from '@/recommendations/fromStandings'
import { buildActionFeed } from '@/recommendations/buildActionFeed'
import type { CategoryDef } from '@/recommendations/types'
import ActionFeed from '@/components/myteam/ActionFeed.vue'
import SituationStrip from '@/components/myteam/SituationStrip.vue'

const leagueStore = useLeagueStore()

// === Wired from the sources recorded in MyTeamView.notes.md (Task 9) ===
// No reusable store getter / composable yields the verified StandingsEntryLike[]
// or CategoryDef[] for the active category league (those are built as local refs
// inside UnifiedSeasonView.vue). The single source of truth they derive from is
// leagueStore.yahooMatchups (.stat_winners) + leagueStore.yahooTeams. We reproduce
// the verified derivation (UnifiedSeasonView.vue:1290-1411) here as computeds.

// Per-category wins/losses accumulated from matchup stat_winners, keyed by team key/id.
const perCategory = computed(() => {
  const wins = new Map<string, Record<string, number>>()
  const losses = new Map<string, Record<string, number>>()
  const statIds = new Set<string>()

  for (const m of leagueStore.yahooMatchups || []) {
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
// The engine only reads statId + name + per-category ranks; side/label/higherIsBetter
// are best-effort defaults (see MyTeamView.notes.md).
const categories = computed<CategoryDef[]>(() => {
  return [...perCategory.value.statIds].map((statId) => ({
    statId,
    label: `S${statId}`,
    name: `Stat ${statId}`,
    side: 'hit' as const,
    higherIsBetter: true
  }))
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

const feed = computed(() => (profile.value ? buildActionFeed(profile.value, categories.value) : []))

const record = computed(() => {
  // Derived from the standings entry if available; fall back to empty.
  const mine = standings.value.find((s) => s.team.teamId === myTeamId.value)
  const w = mine?.perCategoryWins ? Object.values(mine.perCategoryWins).reduce((a, b) => a + b, 0) : 0
  const l = mine?.perCategoryLosses ? Object.values(mine.perCategoryLosses).reduce((a, b) => a + b, 0) : 0
  return `${w}-${l}`
})
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-6 space-y-6">
    <h1 class="text-2xl font-bold text-dark-text">My Team</h1>

    <SituationStrip
      v-if="profile"
      :team-name="profile.teamName"
      :record="record"
      :rank="0"
      :num-teams="profile.numTeams"
      :win-prob="null"
    />

    <section class="space-y-2">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-dark-textMuted">Your edge this week</h2>
      <ActionFeed :recommendations="feed" />
    </section>

    <p v-if="!profile" class="text-sm text-dark-textMuted">
      Connect or select a category league to see your team's edge.
    </p>
  </div>
</template>
