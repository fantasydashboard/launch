# Sleeper Points Source (Phase 3b) — Design

**Date:** 2026-07-29
**Branch:** `redesign/my-team-first`
**Status:** Design — awaiting user review

## Goal

Add a net-new Sleeper source so Sleeper leagues reach the redesign points views (My Team / Matchup / Wire / Trades), feeding the sport-generic value engine (Phase 3a) via `usePointsValue`. Today the points views branch binary `isEspn ? espn : yahoo` and have **no Sleeper source at all**, so Sleeper leagues — including the primary football/dynasty use case — cannot render. This phase closes that gap and, in the process, replaces the per-view binary platform branch with a single facade.

## Scope decisions (locked)

- **Football-first.** Sleeper has no MLB, so the baseball `fgByKey` path is included only for symmetry (via the same `matchFG` Yahoo uses) and is effectively never exercised. Football value flows through `usePointsValue`'s pool → Sleeper-projection route, matched by Sleeper `player_id` **directly** (no fuzzy name matching — the roster players *are* `player_id`s).
- **Facade over inline branching.** A new `useActivePointsSource` composable owns platform selection and normalizes ESPN/Yahoo/Sleeper into one source shape; the 4 views stop branching on platform.
- **Read-from-store, no fetching.** The Sleeper source reads `leagueStore` refs already populated on league-select.

## Non-goals

- Sleeper **weekly** football Matchup (inherits Phase 3a's season-total-only limitation; NFL schedule = Phase 4).
- Sleeper baseball/basketball value (no MLB on Sleeper; basketball engine out of scope).
- Any change to ESPN/Yahoo source composables (they keep their current surfaces; the facade adapts them).
- Custom Sleeper scoring for football value (Phase 3a v1 uses `defaultWeights('football')`; unchanged here). *Note:* Sleeper leagues DO expose real `scoring_settings`; wiring them is a later refinement, not this phase.

## Architecture

### §1 — `useSleeperLeaguePool` (new, `src/composables/useSleeperLeaguePool.ts`)

A thin adapter that reads the league store (all reactive, populated on league-select) and maps to the source interface. No network calls.

**Store inputs:** `leagueStore.rosters` (`SleeperRoster[]`: `roster_id`, `owner_id`, `players[]`, `starters[]`, `settings.{wins,losses,ties}`), `leagueStore.users` (`SleeperUser[]`: `user_id`, `display_name`, `metadata.team_name`/`avatar`), `leagueStore.players` (`Record<player_id, SleeperPlayer>`: `full_name`, `position`, `fantasy_positions?`, `team`, `injury_status`, `status`), `leagueStore.currentLeague` (`roster_positions`, `scoring_settings`, `settings`), `leagueStore.currentUserId`.

**Exposes** (mirroring the source interface the views consume):
- `pool: Ref<PointsPoolPlayer[]>` — for each roster, for each `player_id` in `roster.players`: `{ playerKey: player_id, name: p.full_name, position: p.position, eligiblePositions: p.fantasy_positions ?? [p.position], teamKey: String(roster_id), proTeam: p.team ?? '', headshot?, onIL: isInjured(p.injury_status), status: p.injury_status ?? p.status ?? '' }`. Players absent from the `players` map are skipped.
- `fgByKey: Ref<Record<string, FGProjection | null>>` — `matchFG({ full_name, mlb_team: proTeam })` per player via `buildPlayerMatchers()` (baseball; empty for football — harmless, unused there).
- `rosterSlots: Ref<Record<string, number>>` — `parseRosterSlots('sleeper', { roster_positions: currentLeague.roster_positions }, activeSport)`.
- `myTeamKey: Ref<string | null>` — `String(myRoster.roster_id)` where `myRoster = rosters.find(r => r.owner_id === currentUserId)`; null if none.
- `teamNames: Ref<Record<string, string>>` — `String(roster_id)` → `sleeperService.getTeamName(roster, userOf(roster))`.
- `teamLogos: Ref<Record<string, string>>` — via `sleeperService.getAvatarUrl(roster, user, currentLeague)`.
- `teamRecords: Ref<Record<string, { wins; losses; ties; pointsFor }>>` — from `roster.settings`.
- `myTeamName` / `myTeamLogo` / `myRecord` — derived from `myRoster`.
- `loading` / `loaded` / `supported` (always true for Sleeper points) / `load()` — `load()` ensures `leagueStore.players` is present (calls `sleeperService.getPlayers()` into the store if empty); otherwise the store already holds everything.

All exposed values are `computed` over the store refs, so they react to league switches without an explicit reload.

### §2 — `useActivePointsSource` (new, `src/composables/useActivePointsSource.ts`)

The facade. Instantiates all three sources (or selects lazily) and returns ONE normalized object chosen by `leagueStore.activePlatform`:

```
{ pool, fgByKey, rosterSlots, myTeamKey, teamNames, teamMeta, teamLogos, teamRecords,
  myTeamName, myTeamLogo, myRecord, loading, loaded, supported, load }
```

- `espn` → `useEspnPointsTeamData`; `sleeper` → `useSleeperLeaguePool`; `yahoo` → `useYahooLeaguePool`.
- **Owns the `myTeamKey` / `teamNames` / `teamMeta` derivation** that today lives inside each view per-platform. For ESPN it reads the ESPN source's team identity; for Yahoo it reads `leagueStore.yahooTeams` (relocating the view's current computeds); for Sleeper it reads the Sleeper source. `teamMeta` is the shape `useSeasonOutlook` expects (whatever the views pass today — reconciled during planning against the exact view code).
- Fields a given platform lacks resolve to a safe default (`''`/`{}`/`null`), matching what the views see today.
- `load()` calls the active source's `load()` (and any scoring/aux load the views currently trigger). ESPN/Yahoo return **identical values** to today, so this is a non-regression-safe relocation.

### §3 — View rewire (`PointsMyTeamView`, `PointsMatchupView`, `PointsWireView`, `PointsTradesView`)

Each view:
- Replaces `useEspnPointsTeamData()` + `useYahooLeaguePool()` + the `isEspn ? espn.x : yahoo.x` computeds + the Yahoo-specific `myTeamKey`/`teamNames`/`teamMeta` computeds with a single `const source = useActivePointsSource()`.
- Reads `source.pool`, `source.fgByKey`, `source.rosterSlots`, `source.myTeamKey`, `source.teamNames`, `source.teamMeta`, `source.myTeamName`, etc.
- `usePointsValue({ pool: source.pool, fgByKey: source.fgByKey, sport: computed(() => leagueStore.activeSport), season })` unchanged.
- `loadAll()` calls `source.load()` (plus the non-source loads the view already does — `scoring.load()`, schedule, available-players — unchanged).

Non-source composables the views use directly (`useLeagueScoring`, `useAvailablePlayers`, schedule, `usePointsValue`) are untouched.

## Data flow

```
league select → leagueStore.{rosters,users,players,currentLeague,currentUserId} (Sleeper)
                                    │
activePlatform ──► useActivePointsSource ──► useSleeperLeaguePool (adapter)
                                    │              │
                                    ▼              ▼
                     unified { pool, fgByKey, rosterSlots, myTeamKey, teamNames, … }
                                    │
                                    ▼
     views ──► usePointsValue({ pool, fgByKey, sport, season }) ──► value engine (Phase 3a)
                 (football: pool → Sleeper projections by player_id → per-week value)
```

## Error handling

- Sleeper rosters/players not yet in the store → `pool` empty, `loading` true until populated; `supported` true.
- `currentUserId` null → `myTeamKey` null → views show no "my team" (same as an unselected team elsewhere).
- A `player_id` on a roster missing from the `players` map → skipped (no crash, no phantom row).
- `parseRosterSlots` with empty `roster_positions` → falls back to the Phase-2a football default slots.

## Testing

- **Unit (`useSleeperLeaguePool` pure mapping):** a fixture of `rosters` + `users` + `players` + `currentUserId` → assert `pool` shape/keys, `myTeamKey`, `teamNames`, `teamRecords`. Extract the mapping into a pure helper (`buildSleeperPool(rosters, players)` etc.) so it's unit-testable without a live store.
- **Facade selection:** unit-test that `useActivePointsSource` returns the Sleeper-derived values when `activePlatform === 'sleeper'` (and doesn't disturb ESPN/Yahoo) — or, if the reactive wiring is awkward to unit-test, cover selection via the pure helpers and lean on the smoke test.
- **Non-regression:** full existing suite stays green; ESPN/Yahoo views render identically through the facade.
- **Smoke:** a real Sleeper football dynasty league renders My Team / Wire / Trades with per-week football value; Matchup shows season-total strength (Phase-4 note).

## Files

- **Create:** `src/composables/useSleeperLeaguePool.ts` (+ a pure `buildSleeperPool` helper module or exported pure fns), `src/composables/__tests__/useSleeperLeaguePool.test.ts`.
- **Create:** `src/composables/useActivePointsSource.ts`, `src/composables/__tests__/useActivePointsSource.test.ts`.
- **Modify:** `src/views/PointsMyTeamView.vue`, `PointsMatchupView.vue`, `PointsWireView.vue`, `PointsTradesView.vue` — swap to the facade.
- **Reference (unchanged):** `useEspnPointsTeamData.ts`, `useYahooLeaguePool.ts`, `usePointsValue.ts`, `sleeper.ts`, `stores/league.ts`, `trades/rosterSlots.ts`.
