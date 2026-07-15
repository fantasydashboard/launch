# Draft Report in History — Design Spec

**Date:** 2026-07-13
**Branch:** `redesign/my-team-first` (local only — see deploy-only-after-local-testing)
**Status:** Approved in brainstorming; ready for plan.

## Goal

Retire the sprawling, unredesigned standalone `/draft` page from the primary IA and replace
its role with a tight, on-thesis **Draft Report** section at the bottom of the League History
page: the draft, graded — steals, busts, who nailed it, and how you did. History's job is lore
and bragging rights; the Draft Report is the seasonal capstone of that, not a decision surface.

This finishes the History surface (the last of the six user surfaces) and removes the one page
still breaking the redesign's terminal aesthetic in the main nav.

## Why this shape (product context)

The old `/draft` (`CategoryDraftView` 4.1k lines + `PointsDraftView` 2.7k lines, pre-redesign
aesthetic) is a backward-looking retrospective — the least aligned surface with UFD's
decision-first, in-season thesis, and its lore role overlaps History. Rather than redesign ~7k
lines, we fold a compact report into History (which the six-surface IA already anticipated:
"History + Draft Report") and reuse the existing scoring engines. The forward-looking live-draft
assistant is a separate, bigger bet with a weaker moat — explicitly out of scope, gated on real
user pull.

## Decisions (settled with the user)

1. **Season scope:** latest completed season by default; older seasons loadable **on demand**
   via a season picker. ESPN historical-stat gaps are handled with honest empty states.
2. **Content (all four):** (a) biggest **steal** + biggest **bust**; (b) **Draft MVP** —
   best & worst drafting team; (c) **every team graded A–F**; (d) **your team spotlight**
   (grade + rank + your best/worst pick).
3. **Old page:** **retire from nav, keep reachable.** Remove the "Draft" tab from the primary
   league nav; keep the `/draft` route + views intact (linkable from Tools / a "deep board"
   pointer). No deletion — reversible; revisit deletion after real-user feedback.
4. **Architecture:** approach A — a dedicated composable (orchestration) + a pure tested reducer
   (highlight selection) + a lazy History section, reusing the existing
   `draftAnalysis` engine (`analyzeDraftPicks` + `calculateTeamDraftGrades`).

## CORRECTION (2026-07-14, after code verification — supersedes conflicting details below)

The original draft of this spec named the wrong value metric and mis-stated the engine's live
usage. Corrected facts the plan is built on:

- **Value metric = `adjustedScore`, NOT `valueAdded`.** `analyzeDraftPicks` hardcodes
  `expectedPoints = 0` (`draftAnalysis.ts:357`), so `valueAdded` (= actualPoints − 0) is inert —
  "max valueAdded" would just mean "highest scorer." The engine's REAL, populated value signal is
  `adjustedScore` (`calculateAdjustedScore(positionExpectedRank, actualPositionRank, round,
  numTeams)`): a positional value-over-expectation, elite-weighted. The engine already drives its
  own `isSteal`/`isBust`/`pickGrade` and team `gradeScore` off `adjustedScore`. The Draft Report
  selects steal/bust on **`adjustedScore`**; `valueAdded`/`expectedPoints` are unused. No engine
  surgery — the engine is reused as-is.
- **The engine is reused, not currently live.** `analyzeDraftPicks`/`calculateTeamDraftGrades` are
  only referenced by an unrouted `DraftView.vue.backup`. The live `/draft` views
  (`PointsDraftView`/`CategoryDraftView`) use a *different* system (`draftGrading.ts`'s
  `calculatePickScore`/`scoreToGrade`). We deliberately build the Report on `analyzeDraftPicks`
  (user's decision) and mirror the live views' per-platform *fetch + season-rank computation* only
  as the data source for the engine's inputs.
- **Engine inputs the adapters must build** (this is the composable's bulk): `analyzeDraftPicks`
  takes `picks: SleeperDraftPick[]` (`pick_no`, `round`, `draft_slot`, `player_id`, `roster_id`,
  `metadata.position`), `playerStats: Map<string, PlayerSeasonStats>` (per player: `totalPoints`,
  `gamesPlayed`, `avgPPG`, `positionRank`, `overallRank`, `position`, `weeklyPoints`),
  `playerNames: Map<string,string>`, `teamNames: Map<number,string>`, `numTeams`. **`positionRank`
  and `overallRank` are the crux** — the adapter must rank the season's scored players by total
  points (overall and within position) so `adjustedScore` is meaningful. The live `PointsDraftView`
  already computes equivalent `current_position_rank` maps per platform — mirror that.
- **`calculateTeamDraftGrades(picks: DraftPickAnalysis[], teamNames, numTeams)`** consumes the
  `analyzeDraftPicks` output (not raw picks). `TeamDraftGrade` fields: `roster_id`, `team_name`,
  `overallGrade`, `gradeScore`, `bestPick`/`worstPick` (each a `DraftPickAnalysis | null`).
- **`DraftPickAnalysis` uses `pick_no`** (not `overallPick`) and `team_name`/`roster_id`
  (snake_case). The reducer's `DraftHighlight` maps from these.

The reducer §3 selection rules and useDraftReport §2 service calls below are updated accordingly;
where older prose still says `valueAdded`, read `adjustedScore`.

## FINAL ARCHITECTURE (2026-07-14 — supersedes the engine choice above; user chose FULL PARITY)

After verification, `analyzeDraftPicks` was abandoned entirely (compile-broken imports; missing
`gamesPlayed`/`overallRank` on ESPN & Yahoo; orphaned). The Report is built on the **live
`draftGrading.ts` system** the current `/draft` views already use, for **full parity: points AND
category, all three platforms, with the your-team spotlight.**

**Reality that reshapes the plan:**
- Points grading = `calculatePickScore(pickNumber, round, draftedPositionRank, finishedPositionRank,
  position, numTeams, totalPicks, sport): PickScoreResult` (`{ totalScore, draftedTier, finishedTier,
  tierMovement, verdict }`) → `scoreToGrade(totalScore)`. Team grade = `calculateTeamGrade(picks)` →
  `getRelativeTeamGrade(rank, numTeams, gradeScore)`. Tiers ELITE>STARTER>BENCH>REPLACEMENT>WAIVER via
  `getTierConfig(numTeams)`/`getTier(rank, config)`.
- Category grading is a SEPARATE pipeline living inline in `CategoryDraftView` (`calculateCategoryPickScore`
  / `getCategoryTierConfig` / `getCategoryTier`, ranked by aggregate category-percentile, plus an ad-hoc
  team score — no `calculateTeamGrade` equivalent). Phase 2 promotes these into `draftGrading.ts` as shared
  exports + adds a category team-grade.
- Neither draft view has a "my team" concept. My-team resolution is NEW, per platform: ESPN
  `getMyTeam(sport,leagueId,season).id`; Yahoo `getMyTeam(leagueKey)` via `.t.me` → `team_id` (string,
  parse) then `team_key`; Sleeper the `roster_id` whose `owner_id === leagueStore.currentUserId`.
- Neither view attributes a per-team best/worst pick or a canonical steal — that's the new reducer.

**Unified data contract (both phases, all platforms) — the loaders normalize to this; the reducer +
view depend ONLY on this, never on platform raw shapes:**
```ts
interface GradedPick {
  teamKey: string          // stable per-season team id STRING: 'espn_team_<id>' | '<yahooLeagueKey>.t.<id>' | 'sleeper_<roster_id>'
  teamName: string; teamLogo?: string
  playerName: string; position: string
  round: number; overallPick: number
  score: number            // PickScoreResult.totalScore
  grade: string            // scoreToGrade(score)
  verdict: string          // JACKPOT|STEAL|HIT|SOLID|MISS|BUST|DISASTER
  tierMovement: string; draftedTier: string; finishedTier: string
}
interface GradedTeam { teamKey: string; teamName: string; teamLogo?: string; gradeScore: number; grade: string; rank: number } // rank 1 = best
interface GradedDraft { picks: GradedPick[]; teams: GradedTeam[]; numTeams: number; myTeamKey: string | null }
```
`buildDraftReport(draft: GradedDraft, season: number): DraftReport` — steal = max `score`; bust =
min `score` among `round<=5` else min overall; teamGrades = `draft.teams` (already ranked);
best/worstDrafter = teams[0]/teams[last]; mySpotlight (when `myTeamKey` matches a team) = its grade +
rank + that team's max-score / min-score pick. `DraftHighlight`/`TeamGradeRow` in §3 are keyed by
`teamKey` (string) instead of numeric `rosterId`.

**Build phasing (full parity is the end state):**
- **PHASE 1 (this plan): POINTS parity** — shared reducer + 3 platform *points* loaders (ESPN/Yahoo/Sleeper)
  producing `GradedDraft` via `calculatePickScore`/`calculateTeamGrade`/`getRelativeTeamGrade` + my-team
  resolution; `useLeagueHistory.seasonKeys`; `useDraftReport`; lazy `HistoryView` section + season picker +
  states; retire `/draft` from nav. Category leagues render an honest "points only for now" note in the section.
- **PHASE 2 (own plan after Phase 1 validates): CATEGORY parity** — promote `calculateCategoryPickScore`/
  `getCategoryTier(Config)` into `draftGrading.ts` + a category team-grade; add ESPN/Yahoo *category* loaders
  producing the same `GradedDraft`; drop the "points only" note. The reducer, composable, view, and nav work
  are unchanged (they consume `GradedDraft`).

**Loaders replicate, not refactor:** the per-platform fetch+rank+grade is replicated into new
`src/draft/report/` modules; the old 2.7k/4.1k-line `/draft` views are left UNTOUCHED (they're retired from
nav, kept reachable). Duplication is the accepted cost of isolating a large, real feature from working code.

## Architecture

Three new units, each one responsibility, plus one small additive change to `useLeagueHistory`.

```
HistoryView  (adds a lazy <DraftReportSection>)
  └─ useDraftReport(platform, seasonKey, sport, season, myRosterId)
       ├─ fetch draft picks + player stats  (existing platform services)
       ├─ existing engines: calculatePlayerSeasonStats? → analyzeDraftPicks → calculateTeamDraftGrades
       └─ buildDraftReport(picks, teamGrades, myRosterId, season, numTeams)   ← pure, tested
useLeagueHistory  (adds: seasonKeys map, captured during its existing chain walk)
```

### 1. `useLeagueHistory` — expose per-season platform keys (small additive change)

Older Draft Reports need that year's platform identifier. `useLeagueHistory` **already walks**
each platform's season chain in its loaders (ESPN season loop, Yahoo `renew` chain, Sleeper
`previous_league_id` chain), so it already has the per-season key in scope. Capture it:

- New ref `seasonKeys = ref<Map<number, string>>(new Map())`, reset in `load()`, exposed in the
  return.
- Populated in each loader per season:
  - **ESPN:** `seasonKeys.set(s, leagueId)` (sport is known separately; leagueId is stable, the
    season number is the map key).
  - **Yahoo:** `seasonKeys.set(season, currentKey)` (the season's `league_key`).
  - **Sleeper:** `seasonKeys.set(season, league.league_id)`.

This is DRY — History does the chain walk once; the Draft Report consumes the result instead of
re-resolving.

### 2. `src/composables/useDraftReport.ts` — orchestration (no unit test)

```ts
useDraftReport(): {
  report: Ref<DraftReport | null>
  loading: Ref<boolean>
  error: Ref<'no-data' | 'failed' | null>   // 'no-data' = thin/empty (e.g. ESPN historical gap)
  load: (args: {
    platform: string; seasonKey: string; sport: string; season: number
    myRosterId: number | null               // the user's roster_id THAT season, or null
    numTeams: number
  }) => Promise<void>
}
```

`load()` fetches that season's draft picks + player season stats per platform, reusing the SAME
service methods the old DraftView uses, then runs the existing engines and the reducer:

- **ESPN:** `espnService.getDraftWithPlayers(sport, leagueId, season)` +
  `espnService.getPlayersWithStats(sport, leagueId, season, playerIds)`.
- **Yahoo:** `yahooService.getDraftResults(leagueKey)` + `yahooService.getPlayers(playerKeys, leagueKey)`
  + `yahooService.getPlayerStats(leagueKey, playerKeys)`.
- **Sleeper:** its draft-picks + matchup/stat methods (as the old view does).

Each platform path normalizes into the engine inputs: `picks` (with `roster_id`, `round`,
`pick_no`, `player_id`, `player_name`, `position`, `team_name`), a `Map<string, PlayerSeasonStats>`,
`playerNames: Map<string,string>`, `teamNames: Map<number,string>` (roster_id → name), and
`numTeams`. Then `analyzeDraftPicks(...)` → `DraftPickAnalysis[]`, `calculateTeamDraftGrades(...)`
→ `TeamDraftGrade[]`, then `buildDraftReport(...)`.

The per-platform normalization is the composable's bulk. It is orchestration glue over
already-tested engines; verified via type-check + build + real-league smoke (same posture as
`useLeagueHistory`). Errors and thin data resolve to `error.value` + `report.value = null`; they
NEVER throw into History.

**"Me" resolution:** `myRosterId` is supplied by the caller. For the **latest completed season**
it's resolvable from the platform's my-team (ESPN `getMyTeam` → team id; Yahoo `is_my_team`;
Sleeper current user's roster). For **older seasons** it may be unknown → pass `null`; the
spotlight then omits (graceful, per §4 states). The reducer matches "me" by numeric `roster_id`.

### 3. `src/draft/buildDraftReport.ts` — pure reducer (tested)

Pure, deterministic selection over the engines' output — no I/O.

```ts
export interface DraftHighlight {
  teamKey: string        // String(roster_id) — stable within a season
  teamName: string
  teamLogo?: string
  rosterId: number
  playerName: string
  position?: string
  round: number
  overallPick: number    // pick_no
  grade: string          // pickGrade
  valueLabel: string     // human line, e.g. "Rd 6 · finished like a Rd 1 pick"
}

export interface TeamGradeRow {
  teamKey: string        // String(roster_id)
  rosterId: number
  teamName: string
  teamLogo?: string
  grade: string          // overallGrade
  score: number          // gradeScore, for sort + bar width
  isMe: boolean
}

export interface DraftReport {
  season: number
  teamCount: number
  steal: DraftHighlight | null
  bust: DraftHighlight | null
  bestDrafter: TeamGradeRow | null
  worstDrafter: TeamGradeRow | null
  teamGrades: TeamGradeRow[]         // sorted by score desc
  mySpotlight: {
    grade: string
    rank: number                      // 1-based rank within teamGrades
    bestPick: DraftHighlight | null
    worstPick: DraftHighlight | null
  } | null
}

export function buildDraftReport(
  picks: DraftPickAnalysis[],
  teamGrades: TeamDraftGrade[],
  myRosterId: number | null,
  season: number,
  numTeams: number,
): DraftReport
```

**Selection rules (all here, all testable):**
- **steal** = the pick with the greatest `adjustedScore` (positional value-over-expectation;
  positive = finished better than drafted). Tiebreak: higher `pickGradeScore`. `null` if no picks.
- **bust** = among **early picks** (`round <= 5`) the one with the lowest `adjustedScore` (a high
  pick that returned poorly); if there are no early picks, fall back to the lowest `adjustedScore`
  overall. Tiebreak: lower `pickGradeScore`. `null` if no picks. The early-round bias prevents a
  late flier from being labeled a "bust."
- **teamGrades** = `teamGrades` mapped to rows, sorted by `gradeScore` desc; `isMe = rosterId ===
  myRosterId`.
- **bestDrafter / worstDrafter** = first / last of the sorted rows (`null` if empty).
- **mySpotlight** = when `myRosterId != null` and a matching `TeamDraftGrade` exists: its
  `overallGrade`, 1-based `rank` in the sorted list, and its `bestPick` / `worstPick` (already
  computed by the engine) mapped to `DraftHighlight`. Otherwise `null`.
- **valueLabel** for a highlight is derived from round + the engine's finish (e.g.
  `Rd {round} · finished like a Rd {impliedRound} pick`), computed from `overallRank`/`numTeams`.
  Deterministic, unit-tested.
- Empty `picks`/`teamGrades` → all `null`/`[]` (no throw).

### 4. `DraftReportSection` in `HistoryView.vue` — lazy presentational section

- New section after Legendary moments. **Collapsed by default** to one affordance
  ("Draft report · ▸ show") so it never delays History's initial load.
- On first expand: instantiate `useDraftReport` and `load()` the **default season** — the newest
  history-season year that is complete (year `<` the current league season). If the only visible
  season is the in-progress current one, default to it (grades will render preliminary/thin, which
  the `no-data`/loading states cover). The load uses `seasonKeys.get(season)` + the resolved
  `myRosterId`.
- **Season picker** (top-right): the visible history seasons; changing it re-`load()`s on demand.
- Renders (terminal aesthetic, `TeamAvatar`, lime primary / red `#e0625a`, grade bars like the
  Legacy view): steal + bust cards, Draft MVP (best/worst drafter), every-team grade list (bars,
  "you" lime-tinted), your-team spotlight.
- **States:** loading ("Grading the draft…" in the section body only); `error==='no-data'` →
  *"We couldn't pull enough of {season}'s draft to grade it — this can happen with older ESPN
  seasons."* (picker still usable); `error==='failed'` → generic retry line; partial (team grades
  but no spotlight) → spotlight block omitted. History itself never breaks.
- A muted **"deep draft board →"** link to `/draft` (the retained old page) for power users.

### 5. Retire the old page from nav (`App.vue`)

- Remove the `{ name: 'Draft', path: '/draft' }` entry from the primary league nav array
  (~`App.vue:1220`).
- Keep the `/draft` route, `DraftWrapper`, `CategoryDraftView`, `PointsDraftView` intact
  (reachable by URL + the History "deep board" pointer).
- Do NOT touch the shared engines (`draftAnalysis`/`draftGrading` — now reused by both) or the
  editorial hooks (`detect-draft`/`draft`/`render-draft`). No deletions.

## Files

| File | Change |
|------|--------|
| `src/draft/buildDraftReport.ts` | **new** (pure) — the highlight-selection reducer + types |
| `src/draft/__tests__/buildDraftReport.test.ts` | **new** — reducer unit tests |
| `src/composables/useDraftReport.ts` | **new** — per-platform fetch + engines + reducer orchestration |
| `src/composables/useLeagueHistory.ts` | **modify** — capture + expose `seasonKeys` map |
| `src/views/HistoryView.vue` | **modify** — lazy Draft Report section + season picker + states + deep-board link |
| `src/App.vue` | **modify** — remove the "Draft" primary-nav entry |

## Reuse

- Engines `analyzeDraftPicks`, `calculateTeamDraftGrades`, `scoreToGrade`, tier/grade helpers
  from `src/services/draftAnalysis.ts` + `src/services/draftGrading.ts` (unchanged).
- Per-platform draft/stat fetch methods already used by the old DraftView (unchanged).
- `TeamAvatar`, the Legacy-view grade-bar treatment, and the section/card styling from
  `HistoryView.vue`.
- `useLeagueHistory`'s season list + (new) `seasonKeys`.

## Error handling / degradation

- Any fetch failure → `error='failed'`, `report=null`, inline retry copy; History unaffected.
- Thin data / ESPN historical-stat gap / no draft for a year → `error='no-data'`, honest copy,
  picker still usable.
- Roto / Sleeper-missing-draft / not identifiable "me" → section shows the empty line or omits
  the spotlight; never crashes.
- Not signed in → History renders as today; the section can still show public draft grades where
  fetchable, with no spotlight.

## Testing

- **Pure reducer** (`buildDraftReport`) gets thorough vitest coverage: steal = max valueAdded;
  bust = early-round-biased min; team grades sorted + `isMe`; best/worst drafter ends; spotlight
  present with `myRosterId`, `null` without; empty input → all `null`/`[]`; valueLabel formatting.
- **No new unit test** for `useDraftReport` (orchestration over tested engines/reducer) — verified
  by type-check + build + a real-league smoke.
- `useLeagueHistory` `seasonKeys` addition is additive; the existing suite must stay green.
- **Gates:** type-check 62 baseline (none in touched files), build clean, full suite + new reducer
  tests green. Local only — no push/deploy.

## Out of scope (defer / never)

- A forward-looking live / pre-draft assistant (real-time pick suggestions). Separate, bigger
  bet; gate on real user pull.
- Deleting the old `/draft` route/views — revisit after real-user feedback validates the report.
- Durable/shareable stored draft reports (a Supabase snapshot build) — premature for an unproven
  seasonal feature.
- Redesigning the deep per-pick board — the retained old page keeps that role unchanged.
- Backfilling draft reports for hand-entered (manual) history seasons — those have no draft data.
