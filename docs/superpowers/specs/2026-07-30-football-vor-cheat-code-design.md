# Football VOR "Cheat Code" Value Engine (v1) — Design

**Date:** 2026-07-30
**Branch:** `redesign/my-team-first`
**Status:** Design — awaiting user review

## Goal

Give football managers one **league-calibrated player value** — Value Over Replacement (VOR) — that powers **both** the Wire (waivers) and Trades from the same spine, so recommendations are trustworthy, position-aware, and connected to the league's actual settings and rosters. Replaces the current "raw projected points" ranking, which floods lists with QBs and treats a bench scrub as the "replacement" for a waiver add.

Redraft-first (the immediate target league is redraft; rest-of-season projections are the correct lens). Dynasty gets a rankings-CSV anchor later.

## The core idea

**VOR = a player's league-scored projected points − the replacement level at his position**, where replacement level is derived from the league's roster settings (teams × starting slots + flex/superflex eligibility). This single number is the shared currency:

| Question | Reads |
|---|---|
| Best available (wire ranking) | free agents by **VOR** desc |
| Should I add X? (waiver upgrade) | **lineup-marginal**: does X improve *my* optimal starting lineup (flex-aware)? |
| Is this trade fair? | compare **ΣVOR** each side gives vs gets |
| Who to target? (trade) | *my need* ↔ *their surplus* on VOR |

## Scope decisions (locked)

- **Replacement level = settings-derived, static** (VBD-style): the Nth-best player at each position, N from teams × (position starters + flex allocation). Deterministic, unit-testable. Live-best-available baseline is a later refinement.
- **Two timeframes:** ROS (primary) + a **next-week** VOR (bye-aware) for the streaming section, plus a **multi-week streamability** indicator (how many of the next N weeks the player projects above replacement / has a favorable-enough matchup) so a durable stream reads differently from a one-week plug.
- **Opportunity signal = a surfaced tag** in v1 (e.g. "backup behind injured starter," "committee") with minimal/no VOR adjustment. Full opportunity modeling is later.
- **K/DEF included** (data confirmed in Sleeper season projections; `football.ts` scores the keys).
- **Confidence flag** on missing/thin projections (not silently ranked dead-last).
- **Consumers:** Wire (best-available + lineup-marginal upgrades + weekly + full board), Trades (fair value + surplus/need targets), **and My Team** — My Team switches from raw projected points to VOR for consistency across all three football surfaces.
- **Baseball untouched.**

## Non-goals (staged for later)

FAAB / acquisition-cost bid guidance; trade premiums (scarcity, consolidation, playoff-week schedule, risk/ceiling); contender-vs-spoiler tailoring; live-best-available replacement baseline; ADP light-blend anchor; dynasty rankings-CSV anchor; audit view (`?voraudit`).

## Architecture

A new **VOR engine** consumed by the existing Wire/Trades views. It reuses today's football projection + scoring + roster-slot plumbing and adds the replacement-baseline and lineup-marginal math.

```
Sleeper projections (ROS season endpoint + weekly)  ──┐
  + K/DEF                                             │
        × league scoring (calculatePoints)            ▼
                                          per-player POINTS (ROS + weekly)
league settings (teams, slots, flex elig) ─► REPLACEMENT baseline per position (VBD)
                                                      │
                                     VOR = points − replacement[pos]   (ROS + weekly)
players depth_chart_order/injury_status ─► opportunity tag + confidence
current rosters ─► availability, my optimal lineup, per-team surplus/need
                                                      │
        ┌─────────────────────────────────────────────┼───────────────────────────┐
        ▼                                             ▼                           ▼
   Wire (best-available=VOR,                   Trades (fair value=ΣVOR,      Full board
   upgrades=lineup-marginal,                    targets=need↔surplus)        (roster vs wire
   weekly, full board)                                                        by position)
```

### §1 — Projection layer (`src/football/`)

- **ROS points**: from the season endpoint (already built: `getSeasonProjections` → `buildFootballValue`). Extend to **include K and DEF** (season endpoint returns them with `fgm_*`/`pts_allow_*`/`sack` keys; `football.ts pointsConfig` already has kicking + defense scoring keys — verify the K/DEF stat keys are in `statKeys` and add any missing).
- **Weekly points**: `sleeperService.getWeekProjections('football', season, week)`. The **next week** drives the streaming VOR (`vorWeek`). A team on **bye** that week → 0 (derive byes from `sleeperService.getSchedule(season, week)` — teams absent from that week's games). We also fetch the next **N** weeks (N≈4) to compute a **streamability count** = how many of those weeks the player projects above his weekly replacement (bye weeks count as below) — surfaced as a "startable X of next N" badge so a durable stream is distinguishable from a one-week plug.
- **Confidence**: `high` if the player has a non-trivial projection (stat line present, points > 0 baseline); `low` if the projection is missing/empty (e.g. recently-traded/injured with no line). Low-confidence players are surfaced with a flag, not silently ranked last.

### §2 — Replacement baseline (`src/football/vorBaseline.ts`, new — pure)

Standard value-based-drafting baseline, computed per league from `parseRosterSlots` output + `FLEX_ELIGIBILITY`:

1. Base startable count per position = `teams × slots[pos]` for dedicated slots (QB, RB, WR, TE, K, DEF).
2. **Flex allocation**: pool all flex-eligible players (per `FLEX_ELIGIBILITY[FLEX]` = RB/WR/TE, or `[SUPER_FLEX]` = QB/RB/WR/TE) ranked by ROS points *beyond* each position's base-starter count; the top `teams × flexSlots` of that leftover pool fill flex — tally how many of each position that adds. `startable[pos] = base[pos] + flexAllocated[pos]`.
3. `replacement[pos]` = the ROS points of the **first player OFF the startable list** at that position (rank `startable[pos] + 1`) — the true waiver-level alternative.

Superflex flips out for free: QB enters the flex pool → QB gets flex demand → QB replacement is deeper → QB VOR rises. Same mechanism handles TE-premium (a TE-only flex) and 2-QB.

### §3 — VOR + timeframes (`src/football/footballVor.ts`, new — pure)

Per player: `vorRos = pointsRos − replacement[pos]`, `vorWeek = pointsNextWeek − replacementWeek[pos]` (weekly baseline computed the same way on next-week points). Emits `PlayerVor { playerKey, position, pointsRos, vorRos, pointsNextWeek, vorWeek, streamWeeks, streamOf, confidence, opportunity }`, where `streamWeeks` = count of the next N weeks projecting above weekly replacement and `streamOf` = N. VOR can be negative (below replacement = not startable). This is the ranking currency.

### §4 — Opportunity signal (`src/football/opportunity.ts`, new — pure)

From `depth_chart_order` + `injury_status` across the player pool: tag each player —
- `backup-elevated`: a backup (`depth_chart_order ≥ 2`) whose position's starter (`depth_chart_order 1`) on the same NFL team is injured/out → elevated opportunity.
- `starter` / `committee` / `deep-bench`: from depth-chart position.
v1 **surfaces** the tag (and can nudge weekly VOR slightly for `backup-elevated`), no full role model.

### §5 — Lineup-marginal value (`src/football/lineupMarginal.ts`, new — pure)

For a candidate add and *my* roster: `marginal = optimalLineupPoints(myRoster + candidate) − optimalLineupPoints(myRoster)`. Uses the existing optimal-lineup solver (`assignSlots` / the lineup logic in `pointsTeam`). Flex-aware automatically (the candidate competes for its own slot + every flex it qualifies for; whoever falls out is the true replacement). A 2nd QB behind an elite starter ⇒ `marginal = 0`. This is the waiver "upgrade" number and replaces today's `add − worst bench body`.

### §6 — Consumers

- **Wire** (`pointsWire.ts` / `PointsWireView.vue`):
  - **Best Available** = free agents by `vorRos` desc (K/DEF included; confidence-flagged).
  - **Best Upgrades** = adds ranked by **lineup-marginal** (§5), drop = the actual body freed; a 2nd QB no longer shows a phantom +291.
  - **This week** section = `vorWeek` desc among free agents (bye-aware) — replaces the baseball "stream" section for football; each row shows the "startable X of next N" streamability badge so multi-week holds stand out from one-week plugs.
  - **Full board** (new): every player at each position, rostered + available interleaved, VOR-ranked, *your* players highlighted vs the wire — the "complete list" the user asked for, as an expandable view.
- **Trades** (`pointsTrades.ts` / `pointsTradeLandscape.ts`):
  - **Fair value** = compare `ΣvorRos` each side gives vs gets.
  - **Targets** = teams with VOR **surplus** where I'm **below replacement**, and vice-versa (extends the existing surplus/need landscape onto VOR).
- **My Team** (`PointsMyTeamView.vue` / `pointsTeam.ts`): the football value shown per player switches from raw projected points to `vorRos`, so a roster reads in the same currency as the Wire and Trades. Lineup/roster ordering and any season-outlook aggregation use VOR. (Baseball My Team is unchanged.)

## Error handling

- Missing/empty projection → `confidence: low`, VOR computed from 0 points (flagged), not dropped.
- Weekly/schedule fetch failure → fall back to ROS-only (weekly section hidden), never break the page.
- K/DEF projection absent → omit those slots gracefully.
- Non-football league → engine not invoked (baseball path unchanged).

## Testing

Pure, fixture-tested functions:
- `vorBaseline`: settings (teams/slots/flex, incl. superflex & TE-premium) → correct replacement ranks.
- `footballVor`: points − baseline → VOR (incl. negative), two timeframes.
- `lineupMarginal`: 2nd-QB ⇒ 0; better-flex-RB ⇒ real gain; flex displacement correct.
- `opportunity`: backup-behind-injured-starter tagging.
- `footballVor` streamability: a player above weekly replacement in 3 of next 4 weeks (one a bye) → `streamWeeks:3, streamOf:4`.
- **Non-regression:** baseball value/Wire/Trades/My Team untouched (baseball path never invokes the VOR engine); football My Team renders VOR in place of raw points without breaking lineup/outlook.

## Files (indicative)

- **Create:** `src/football/vorBaseline.ts`, `src/football/footballVor.ts`, `src/football/opportunity.ts`, `src/football/lineupMarginal.ts` (+ `__tests__`).
- **Modify:** projection layer (K/DEF + next-week + streamability + confidence), `usePointsValue`/value wiring to expose VOR, `pointsWire.ts` + `PointsWireView.vue` (best-available/upgrades/weekly+streamability/board), `pointsTrades.ts`/`pointsTradeLandscape.ts` + `PointsTradesView.vue` (VOR fair value + targets), `pointsTeam.ts` + `PointsMyTeamView.vue` (football value → VOR).

## Build stages (for the plan)

1. **VOR engine spine** — projection (ROS + next-week + streamability + K/DEF + confidence) → replacement baseline → VOR + opportunity. Pure + tested; unconsumed.
2. **Wire onto VOR** — best-available, lineup-marginal upgrades, weekly section + streamability badge, full board.
3. **Trades onto VOR** — fair value + surplus/need targets.
4. **My Team onto VOR** — football per-player value + lineup/outlook read VOR (baseball untouched).
5. **Polish** — confidence/opportunity display, board UX.

Each stage is independently shippable and keeps baseball green.
