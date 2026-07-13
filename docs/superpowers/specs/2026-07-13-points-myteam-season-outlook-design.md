# Points My Team — Season Outlook + Luck Action (Phase 1)

**Date:** 2026-07-13
**Branch:** `redesign/my-team-first` (LOCAL only — no push/prod until the user tests with real users)
**Status:** Design — approved shape, pending spec review

## Problem

The points-league My Team page leads with a hero labeled **"PROJECTED FINISH — Nth of {teams}"**. That number is actually `model.myLineupRank`: a *rest-of-season projected starting-lineup points* rank. It is **not** a playoff finish, and in H2H it contradicts reality and the app's own other pages:

- Zoomers 12-0-0 (1st, clinched) → My Team says "6th of 10".
- Dugout Stuckabuc 13-3 (1st) → "6th of 12".
- Screamin' Jawas 11-5 (1st) → "3rd of 8".
- Same leagues, the **Matchup** page correctly says "1st of 10 — locked into the bracket."

In H2H, finish is driven by **record → playoff seed**, not by summed rest-of-season points. The one number a manager actually wants on My Team — *am I making the playoffs, and what seed?* — is missing, and the number shown is wrong.

The root cause is that each page computes standing from its own basis: My Team from ROS points, Matchup/League from record. Any fix that recomputes locally will reproduce the drift. The fix must **centralize the season-outlook calculation** so every page tells the same story.

## Scope

This spec covers **Phase 1 only**:

1. Replace the mislabeled hero with a **Season Outlook** built from record + playoff sim + stakes.
2. Add a **luck-based action** (sell-high / buy / stay patient) derived from the same numbers.

Deliberately **out of scope** (tracked as follow-on specs):

- **Phase 2 — IL/DTD awareness** on the roster + injury-discounted projections.
- **Phase 3 — Today revival**: wiring points projections into `dailyCandidates` so the Today board ranks on points leagues.

## Approach

**Engine strategy B (approved):** a shared `useSeasonOutlook` composable that both points My Team adopts now and LeagueView / category My Team *can* adopt later. It reuses existing, tested pieces rather than duplicating them — so its outputs match LeagueView's Standings/odds by construction (same inputs, same pure functions).

### Reused, unchanged

- `src/composables/usePowerTrajectory.ts` → `currentWeek`, `weeksLeft`, `playoffSpots`, `remainingSchedule` (both platforms).
- `src/myteam/pointsTeam.ts` `buildPointsTeam(..., { basis: 'perWeek', weeksLeft })` → per-team `standings` with `startingPoints` (schedule-neutral per-week strength) and `myLineupRank` (the talent rank).
- `src/league/playoffOdds.ts` `simulatePlayoffOdds(teams, schedule, { playoffSpots })` → per-team `playoffPct`, `avgSeed`, projected W/L. Already pure and tested.
- `src/myteam/seasonStakes.ts` `seasonStakes({ rank, leagueSize, weeksLeft, playoffSpots })` → `mode` (`coast`/`clinch`/`must-win`) + `coastKind` (`clinched`/`eliminated`) + human `reasoning`.
- Team meta (records + logos + pointsFor): the same assembly LeagueView uses in `pointsTeamMeta` — ESPN `teamRecords`/`teamNames`/`teamLogos`, Yahoo `leagueStore.yahooTeams`.

### New

**`src/myteam/luckVerdict.ts`** (pure, TDD). The heart of the action.

```ts
export type LuckStance = 'sell-high' | 'buy-low' | 'aligned'
export interface LuckVerdict {
  stance: LuckStance
  gap: number              // recordRank - talentRank (negative = record better than talent = overperforming)
  headline: string         // "You're outrunning your roster"
  detail: string           // one line of why + what to do
  cta: { label: string; route: string } | null  // where the lever lives
}
export function luckVerdict(input: {
  recordRank: number       // 1 = best by W/L
  talentRank: number       // 1 = best by ROS per-week points (model.myLineupRank)
  leagueSize: number
  stakes: StakesMode       // gate: don't tell an eliminated team to sell high
  coastKind?: 'clinched' | 'eliminated'
}): LuckVerdict
```

Rules (transparent, never a black box):

- **Overperforming** — record materially better than talent (`talentRank - recordRank ≥ threshold`): `stance: 'sell-high'`, CTA → `/trades`. *"You're outrunning your roster — sell high, trade from your inflated standing before it regresses."* Suppressed to a softer note when `coastKind === 'clinched'` (already locked in — value the ride, still can sell for next year) and when `eliminated`.
- **Underperforming** — talent materially better than record: `stance: 'buy-low'`, CTA → `/trades`. *"Your roster is better than your record — buy / stay patient, don't sell low."*
- **Aligned** — within threshold: `stance: 'aligned'`, CTA → `/matchup`. *"Roster and record match — no arbitrage; win at the margins."*

Threshold scales with league size (mirror Power Rankings' `round(n/4)` luck tolerance so the two pages never disagree on who's lucky).

**`src/composables/useSeasonOutlook.ts`** — bundles the reused pieces into one reactive view-model:

```ts
interface SeasonOutlook {
  record: { wins: number; losses: number; ties: number }
  recordRank: number          // by W/L, tiebreak pointsFor
  leagueSize: number
  talentRank: number          // model.myLineupRank (ROS per-week points)
  projSeed: number            // simulatePlayoffOdds avgSeed, rounded
  playoffPct: number          // 0..1
  playoffSpots: number
  weeksLeft: number
  stakes: Stakes              // seasonStakes output (mode, reasoning, coastKind)
  luck: LuckVerdict
  ready: boolean              // false until schedule + records + model all present
}
```

Inputs are the same refs points My Team already has (`pool`, `fgByKey`, `rosterSlots`, `scoring.weights`, `myTeamKey`) plus team meta + trajectory. `recordRank` comes from sorting team meta by win% (tiebreak `pointsFor`), matching `simulatePlayoffOdds`' seeding. When `weeksLeft === 0` or the schedule is empty (pre-season / unknown), `ready` degrades gracefully: show record + rank, hide seed/odds/stakes rather than invent them.

### View changes — `src/views/PointsMyTeamView.vue`

Replace the "Projected finish" card (lines ~153–163) with a **Season Outlook** card:

- **Record + standing:** `34-18 · 2nd of 10`
- **Stakes badge:** `CLINCHED` / `IN THE FIELD` / `ON THE BUBBLE` / `ELIMINATED` (mapped from `stakes.mode`/`coastKind`), with `stakes.reasoning` as the sub-line.
- **Projected seed + odds:** `Projected seed 3rd · 94% to make the playoffs`. Hidden when `!ready` (no schedule).
- **Demoted talent read:** small secondary line — `Roster talent: 6th of 10 · rest-of-season points`. This is the old hero number, correctly labeled, and it sets up the action.
- **Luck action row:** `luck.headline` + `luck.detail` + optional CTA button routing to `luck.cta.route`.

The header sub-line (line ~138, "Best lineup projects Nth of M") keeps its wording but is no longer the page's headline claim — the Season Outlook card owns the finish story.

## Data flow

```
usePowerTrajectory ──┐
buildPointsTeam ─────┤
(perWeek)            ├─► useSeasonOutlook ─► SeasonOutlook VM ─► PointsMyTeamView hero
pointsTeamMeta ──────┤        │
                     │        └─► simulatePlayoffOdds → seed/odds
                     │        └─► seasonStakes → badge/reasoning
                     │        └─► luckVerdict(recordRank, talentRank, stakes) → action
simulatePlayoffOdds ─┘
```

## Error handling / edge cases

- **No schedule (pre-season, or Yahoo playoff week unknown per the hardcoded-15 quirk):** `ready = false`; render record + rank only, no seed/odds/stakes. Never show a fabricated seed.
- **Managerless opponents** already carry `managerless` in team meta; they still count for records/seeding (they occupy a slot) but the luck action never suggests trading *with* them (that's a Trades concern, not surfaced here).
- **Talent vs record both unavailable** (model not built): the whole card falls back to the existing "Couldn't assemble your league pool" state.
- **1-team / degenerate league:** `leagueSize <= 1` → no ranks, no stakes; card shows record only.

## Testing

- `src/myteam/__tests__/luckVerdict.test.ts` — overperform → sell-high; underperform → buy-low; within threshold → aligned; clinched suppresses hard sell; eliminated suppresses; threshold scales with league size.
- `useSeasonOutlook`: covered via a pure inner builder (`buildSeasonOutlook(meta, model, odds, trajectory)`) unit-tested with fixture teams reproducing the real-league cases (12-0 → seed 1 / CLINCHED, not "6th"); the composable itself stays a thin reactive wrapper.
- Manual: `?ptsaudit=1` continues to dump scoring; add the outlook inputs (recordRank, talentRank, seed, odds, stakes) to the audit panel for reconciliation against LeagueView Standings on the same real league.

## Follow-on specs (not this pass)

- **Phase 2 — IL/DTD awareness:** flag injured roster rows and discount their ROS in the model + strength; reuse `openSlots` injury detection.
- **Phase 3 — Today revival:** wire `pointsValue` projections into `dailyCandidates` base value so the Today board ranks on points leagues (also unblocks `useYourMove` / `useMatchupBattlePlan` daily gaps).

## Consistency win

Once points My Team consumes `useSeasonOutlook`, its finish/seed matches LeagueView Standings and the Matchup stakes line by construction. A later, optional pass can have LeagueView and category My Team adopt the same composable to make the single-source guarantee structural rather than input-parallel.
