<!--
Task 9 — Live category standings + categories + my-team data sources for MyTeamView

GOAL: For the active category league, locate the exact source for:
  (a) standings array in StandingsEntryLike shape
      { team: { teamId, name, avatar? }, perCategoryWins?, perCategoryLosses? }
  (b) league scoring categories -> CategoryDef[] (statId/label/name/side/higherIsBetter)
  (c) logged-in team id (team with is_my_team === true)

==================================================================
FINDING (important — read before assuming a clean getter exists)
==================================================================
There is NO single store getter or composable return value that yields the
verified StandingsEntryLike[] or the CategoryDef[] for the active category
league. The standings-in-verified-shape and the category list are BUILT
LOCALLY, as component refs, inside UnifiedSeasonView.vue's data pipeline:

  - src/views/UnifiedSeasonView.vue:443  const statCategories = ref<any[]>([])
  - src/views/UnifiedSeasonView.vue:444  const categoryStandingsData = ref<any[]>([])

These are the exact refs passed to <CategoryStandingsTable :standings :categories>
(UnifiedSeasonView.vue:234-241 and :255-262). They are NOT exported and are only
populated by an async fetchRawData()/transform pipeline inside that view, so they
cannot be imported/reused from MyTeamView.

CategoryMatchupsView.vue derives its own equivalent the same way (also local).
useUnifiedLeague.ts is NOT usable: its `standings` is normalizeStandings() output
(UnifiedStandingsEntry, no perCategoryWins) and its `myTeamId` (useUnifiedLeague.ts:75-83)
is an admitted placeholder ("return the first roster ID as a placeholder").

==================================================================
ACTUAL SINGLE SOURCE OF TRUTH (the store data the views derive from)
==================================================================
The verified derivation in UnifiedSeasonView.vue:1281-1411 builds the standings
shape entirely from STORE state:

(a) STANDINGS (StandingsEntryLike[])
    Source store state:
      - src/stores/league.ts:73  yahooMatchups = ref<any[]>([])   (carries .stat_winners + .teams)
      - src/stores/league.ts:71  yahooTeams    = ref<any[]>([])   (team_id, team_key, name, logo)
    Derivation (verbatim algorithm at UnifiedSeasonView.vue:1290-1411):
      For each matchup m in leagueStore.yahooMatchups with m.stat_winners[]:
        team1Key = m.teams[0].team_key || m.teams[0].team_id
        team2Key = m.teams[1].team_key || m.teams[1].team_id
        for sw of m.stat_winners (each { stat_id, winner_team_key, is_tied }):
          if is_tied -> no credit
          elif winner_team_key === team1Key -> t1 win + t2 loss for stat_id
          elif winner_team_key === team2Key -> t2 win + t1 loss for stat_id
      Then map yahooTeams -> StandingsEntryLike:
        team.teamId = team.team_id || team.team_key   (UnifiedSeasonView.vue:1402)
        team.name   = team.name
        team.avatar = team.logo_url || team.logo || team.avatar
        perCategoryWins   = winsMap.get(team_key) || winsMap.get(team_id) || {}
        perCategoryLosses = lossMap.get(team_key) || lossMap.get(team_id) || {}
      (perCategoryWinsMap keyed by team_key OR team_id; try both — :1390)

(b) CATEGORIES (CategoryDef[])
    Category stat_ids come from the stat_winners found in the matchups
    (foundStatIds, UnifiedSeasonView.vue:1293-1331). Labels are enriched by an
    ON-DEMAND fetch of Yahoo league settings:
      - yahooService.getLeagueSettings(leagueKey).stat_categories  (UnifiedSeasonView.vue:1338-1340)
      - each cat -> { stat_id, name: display_name||name, display_name: abbr||... } (:1361-1365)
    NOTE: settings carry stat_id/name/abbr/sort_order but the local statCategories
    ref only keeps { stat_id, name, display_name } (no side/higherIsBetter). The
    recommendation engine (categorySignals.ts / buildActionFeed.ts) only consumes
    statId + name + the per-category ranks; side/higherIsBetter/label are NOT read,
    so MyTeamView maps stat_id->statId, name->name, display_name->label, with
    defaults side:'hit', higherIsBetter:true (sort_order '0' => higherIsBetter:false
    when available from settings).

(c) MY TEAM ID (is_my_team === true)
    Verified store-backed getter (copied from UnifiedSeasonView.vue:701-717):
      leagueStore.yahooTeams.find(t => t.is_my_team)?.team_id?.toString()
      Fallback (Sleeper): leagueStore.leagueRosters.find(r => r.owner_id === leagueStore.currentUserId)?.roster_id
    is_my_team is set:
      - Yahoo: src/services/yahoo.ts:470 / :528 / :783 (carried on yahooTeams)
      - ESPN:  src/stores/league.ts:1630 / :1817 (mapped onto yahooTeams)
      - Sleeper: src/stores/league.ts:980

==================================================================
DECISION FOR MyTeamView (Task 10)
==================================================================
Because no reusable getter exists, MyTeamView reproduces the store-backed
derivation above as local computeds reading leagueStore.yahooMatchups +
leagueStore.yahooTeams (the same single source of truth UnifiedSeasonView uses).
Category labels: best-effort from the team-level per_category_wins keys /
matchup stat_ids (no extra async settings fetch — keeps the view synchronous and
the plan's computed-only structure intact; names fall back to "Stat <id>").
All three computeds guard to [] / null when no category league is active.
-->
