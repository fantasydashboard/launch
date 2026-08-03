# VOR League Size Fix + Audit View — Design

**Date:** 2026-08-03
**Branch:** `redesign/my-team-first`
**Status:** Design — awaiting user review

## Goal

Make the football VOR engine **correct** and **checkable** before the season makes it load-bearing. Two changes: derive league size from league settings instead of inferring it from the player pool (a silent correctness bug in shipped code), and add a diagnostic view that exposes how every VOR number was produced.

Four surfaces — Wire, Trades, My Team, This Week — all read this engine. If replacement levels are wrong, all four are wrong in the same direction, plausibly, without erroring.

## Background: the bug

`useFootballVor.ts:106` derives league size from the pool:

```typescript
teams: new Set(inputs.pool.value.map((p) => p.teamKey)).size,
```

The pool is built from `roster.players` (`useSleeperLeaguePool.ts:20-42`). When those arrays are empty or thin — pre-draft being the extreme case, where every roster is empty — this yields `0`. Downstream:

```typescript
// footballReplacement.ts:34
const t = Math.max(1, teams)   // 0 → 1
```

No crash. `computeReplacementLevels` computes startable counts for a **one-team league**, so replacement level becomes "the 2nd-best RB in the universe" instead of "the 25th." Every player's VOR is then wrong, and every consumer displays it with full confidence.

This is the dangerous failure mode: silent, plausible, and uniform across surfaces.

## Locked decisions

- **League size lives in `useActivePointsSource`**, the existing platform-resolution layer — not in `useFootballVor`, and not duplicated per consumer.
- **Fallback chain**, in order: league settings → distinct `teamKey`s in the pool → `12`. Never `0`, never `1` by accident.
- **The audit does not change `buildFootballVor`'s return type.** It has one production call site but nine test call sites; a sibling export is cheaper and less disruptive.
- **The audit cannot drift from the engine.** `useFootballVor` builds its input object once and passes the same object reference to both functions.
- **`/vor-audit` is a diagnostic, not a product surface** — no nav entry, no feature gating, reachable by URL.
- **Football only**, consistent with the whole engine.

## Architecture

```
league settings (total_rosters / team count / yahooTeams.length)
        │
        ▼
useActivePointsSource ─► leagueSize: ComputedRef<number>
        │                    (settings → distinct teamKeys → 12)
        ▼
useFootballVor ─── builds ONE FootballVorInput object
        │                    │
        │                    ├──► buildFootballVor(input)      → Record<key, PlayerVor>
        │                    └──► buildFootballVorAudit(input) → VorAudit
        │                              (same object reference — drift impossible)
        ▼
VorAuditView.vue  at /vor-audit
```

### §1 — League size (`leagueSize`)

Add `leagueSize: ComputedRef<number>` and `leagueSizeSource: ComputedRef<string>` to `ActivePointsSource`.

All three platforms already build a `teamNames` record from the full team list — Sleeper from rosters + users, ESPN from its teams response, Yahoo from `yahooTeams`. None of them derive it from `roster.players`, so the count is correct even when every roster is empty. That makes it a uniform primary source rather than three platform-specific reads.

Resolution order, with `leagueSizeSource` reporting which rung supplied the value:

1. `Object.keys(teamNames).length` — `'teams'`
2. `leagueStore.currentLeague?.total_rosters` (Sleeper settings) — `'settings'`
3. `new Set(pool.map(p => p.teamKey)).size` — `'pool'`
4. `12` — `'default'`

Each rung is used only if it yields a positive integer. The final fallback is deliberate: a wrong-but-typical league size produces sane replacement levels, whereas `1` produces nonsense.

`useFootballVor` accepts `teams: Ref<number>` as an input and stops computing it. This is the only behavioral change to the shipped engine.

### §2 — Audit builder (`buildFootballVorAudit`)

A new pure export in `src/football/footballVor.ts`, taking the same `FootballVorInput`:

```typescript
export interface VorAuditPosition {
  position: string
  startable: number        // teams × dedicated slots + flex allocation
  replacement: number      // ROS replacement level (points)
  replacementWeek1: number // next-week replacement level, if weekly supplied
  playersAtPosition: number
}

export interface VorAudit {
  teams: number
  slots: Record<string, number>
  positions: VorAuditPosition[]
  playerCount: number
  weeklyMapCount: number
}
```

It reuses `computeReplacementLevels` — the same function the engine calls, with the same arguments — so the reported levels are the levels used.

### §3 — Audit view (`/vor-audit`)

Route `/vor-audit` → `VorAuditView.vue`. Not in `App.vue`'s `tabs`. Renders:

1. **Inputs** — resolved league size and which source supplied it, roster slots, player count, weekly map count.
2. **Replacement levels** — per position: startable count, ROS replacement, week-1 replacement, players available at that position.
3. **Player derivation** — sortable table of `pointsRos − replacement[pos] = vorRos`, filterable by position, so any single player's number can be traced end to end.

Non-football leagues get a short "football only" note rather than an empty page.

### §4 — Error handling

- `leagueSize` never returns `0`, `NaN`, or a negative — the fallback chain guarantees a positive integer.
- The audit view renders its empty state when `vorByKey` is empty (offseason, unloaded, or non-football) instead of a blank table.
- `buildFootballVorAudit` is pure and total: missing weekly maps yield `replacementWeek1: 0` and `weeklyMapCount: 0`, never a throw.

## Testing

- **`leagueSize` resolution order:** team list present → uses its count; absent → settings; then distinct `teamKey`s; then `12`. Each rung asserted, along with `leagueSizeSource` naming the rung used.
- **The regression this fixes:** an empty pool with a 12-team roster list produces 12-team replacement levels, not one-team levels. Asserted against `computeReplacementLevels` directly, so the test fails if the old pool-inference returns.
- **Audit agreement:** for a given `FootballVorInput`, `buildFootballVorAudit` reports exactly the replacement levels `buildFootballVor` subtracted — asserted by reconstructing `vorRos` from the audit's numbers and matching the engine's output.
- **Audit totality:** no weekly maps, empty points, and unknown positions each produce a well-formed `VorAudit`.

Existing football tests (41) must stay green; the nine `buildFootballVor` call sites in `footballVor.test.ts` are untouched by design.

## Boundaries

- Baseball and all non-football surfaces are untouched.
- No new network calls. No new dependencies. No schema or Supabase changes.
- `buildFootballVor`'s signature and return type are unchanged.
- Not in scope: the ADP anchor, the draft board, and the remaining staged items (FAAB, trade premiums, contender tailoring, live-best-available baseline, dynasty CSV).
