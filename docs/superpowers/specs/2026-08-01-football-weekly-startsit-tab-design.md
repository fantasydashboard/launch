# Football Weekly Start/Sit Tab ("This Week") — Design

**Date:** 2026-08-01
**Branch:** `redesign/my-team-first`
**Status:** Design — awaiting user review

## Goal

Give football managers a weekly command tab — **"This Week"** — that answers the two in-season questions at once: **who do I start** (your set lineup vs the optimal for this week, byes flagged) and **who do I stream** (this week's best free agents). It's the football-first landing tab, replacing the daily "Today" optimizer (which is baseball-specific and already hidden for football). Built entirely on the existing VOR engine — no new projection plumbing.

## Locked decisions

- **Core job:** lineup + streaming combined (a weekly hub, not just a lineup).
- **Offseason behavior:** the tab renders, but with an **explicit "season not started" empty state** when there's no live NFL week. No lineup is shown offseason.
- **Tab name:** "This Week" (nav slot where "Today" sits for baseball).

## The idea

`useFootballVor` (the shared engine) already computes, per player: **this-week projected points** (`pointsNextWeek`, byes zeroed by `zeroByeWeek`), **weekly VOR** (`vorWeek`), and the **opportunity tag**. The weekly board is therefore mostly *assembly*: solve the optimal weekly lineup with `assignSlots`, diff it against the manager's **currently-set starters** (Sleeper rosters carry a `starters` array), map opponents from the NFL schedule, and surface weekly streamers. No new fetching beyond the current-week schedule.

## Architecture

```
getNflState() ─► { week, season, season_type }   ── season_type gates live vs offseason
getNflSchedule(season, week) ─► opponent-by-team + playing set (byes)
useFootballVor ─► vorByKey: PlayerVor{ pointsNextWeek, vorWeek, opportunity, … }
useActivePointsSource ─► pool, rosterSlots, myTeamKey, freeAgents
leagueStore roster.starters ─► my currently-set lineup (Sleeper)
                    │
                    ▼
        buildWeeklyBoard(pure)  →  { starters, bench, moves, streamers }
                    │
                    ▼
             WeeklyView.vue  (live board  OR  offseason empty state)
```

### §1 — Placement & nav

- New route `/this-week` (or reuse the Today route path, football-branch) + a nav entry labeled **"This Week"**, both gated on `activeSport === 'football'`. It occupies the first-tab position that "Today" holds for baseball; Today stays the baseball daily tab and is already nav-hidden for football.
- Baseball is untouched — the weekly tab never appears for non-football leagues.

### §2 — Live-week gate

- `sleeperService.getNflState()` returns `{ week, season, season_type }`. **Live** = `season_type` is `regular` or `post`. Anything else (`pre`, `off`) → the **offseason empty state**: a clear message ("Weekly start/sit returns in Week 1 — no games scheduled yet") and nothing else. No lineup, no streamers.
- Defensive: if `getNflState`/schedule fails, show the empty state rather than a broken board.

### §3 — `buildWeeklyBoard` (pure — `src/football/weeklyBoard.ts`)

Inputs: `pool` (all rostered players), `vorByKey` (this-week points + weekly VOR + opportunity), `slots`, `myTeamKey`, `currentStarters` (playerKeys the manager has set — Sleeper `roster.starters`; empty for platforms that don't expose it), `freeAgents`, and `opponentByTeam` (`{ [team]: { opp, home } }` from the schedule; a team absent = bye).

Per rostered player: `weekPoints = vorByKey[key]?.pointsNextWeek ?? 0`; `bye = !opponentByTeam[team]`; `opportunity = vorByKey[key]?.opportunity`.

Outputs:
- **`starters`** — the **optimal** weekly lineup via `assignSlots(myPlayers, slots, 0)` with `value = weekPoints`. Per slot: `{ slot, playerKey, name, position, team, headshot, weekPoints, opponent, home, bye, opportunity, inCurrent }` — `inCurrent` = whether the manager already has him starting.
- **`bench`** — my rostered players not in the optimal lineup, with `weekPoints`.
- **`moves`** — the start/sit delta between the manager's **current** starters and the **optimal** lineup:
  - **swap:** an optimal starter the manager has benched, paired with a current starter he'd replace at that slot → `{ startKey, startName, sitKey, sitName, slot, gain }` (gain = weekly-point delta).
  - **bye alert:** a current starter on a bye → a "must-sub" move (`gain` = points regained by starting the best healthy replacement).
  - If `currentStarters` is empty (platform doesn't expose it), `moves` is empty and the tab simply shows the optimal lineup as guidance.
- **`streamers`** — free agents by `vorWeek` desc (positive only), top ~8, carrying `weekPoints`, `vorWeek`, `streamWeeks`/`streamOf`, and `opportunity` (STEP-UP badge). Same currency as the Wire's "This week" section; the weekly hub surfaces it inline.

### §4 — `useWeeklyBoard` composable + `WeeklyView.vue`

- **`useWeeklyBoard`** (`src/composables/useWeeklyBoard.ts`) — thin orchestration: instantiates `useFootballVor` (enabled = football; needs weekly, so default horizon) and reads `useActivePointsSource` (pool/slots/myTeamKey/freeAgents); fetches `getNflState` (week + `season_type` gate) and `getNflSchedule(season, week)` (→ `opponentByTeam`); reads my `roster.starters` from the league store; exposes `{ board, live, loading }` where `board = buildWeeklyBoard(...)` (null when not live).
- **`WeeklyView.vue`** — renders: a **Start/Sit moves** card (the swaps + bye must-subs — the headline actions), the **optimal lineup** (per-slot starters with opponent + bye + STEP-UP), a compact **bench** list, and a **Streamers** card. When `!live`, renders only the offseason empty state.

### §5 — Boundaries & reuse

- **Football-only.** Baseball keeps "Today" untouched; the weekly route/nav never render for non-football.
- **No new projection fetching** beyond the current-week schedule (`useFootballVor` already fetches weekly projections). Opponent mapping is the one addition.
- Reuses `assignSlots` (optimal lineup), the VOR engine (`pointsNextWeek`/`vorWeek`/`opportunity`), and `nflTeamLogo`.

## Error handling

- No live week / fetch failure → offseason empty state (never a broken board).
- A rostered player with no projection → `weekPoints 0` (won't start; flagged bye-or-no-data). Unmatched handling mirrors the Wire.
- Empty `currentStarters` → no `moves`, optimal lineup still shown.
- All bye / thin roster → `assignSlots` fills what it can; empty slots render as "open."

## Testing

Pure `buildWeeklyBoard` fixtures:
- Clean week: optimal lineup = current lineup → `moves` empty, starters marked `inCurrent`.
- Bench out-projects a starter this week → a `swap` move with the correct `gain`.
- A current starter on bye → a "must-sub" move naming the best replacement.
- Streamers: FAs ranked by `vorWeek`, positive-only.
- Offseason: `live=false` path renders the empty state (composable-level, light).
- Non-regression: baseball nav/Today unaffected (the tab is football-gated).

## Files (indicative)

- **Create:** `src/football/weeklyBoard.ts` (+ `__tests__`), `src/composables/useWeeklyBoard.ts`, `src/views/WeeklyView.vue`.
- **Modify:** router (`src/router/index.ts`) + nav (`App.vue`) to add the football-gated "This Week" tab in Today's slot.

## Staged for later (not v1)

Opponent strength / matchup difficulty ratings; projected weekly score vs your H2H opponent; multi-week lookahead planner; kicker/DEF streaming matchup notes.
