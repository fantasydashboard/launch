# Today — Daily Optimizer — Design Spec

**Date:** 2026-07-13
**Branch:** `redesign/my-team-first` (local only — see deploy-only-after-local-testing)
**Status:** Approved in brainstorming; ready for plan.

## Goal

Give managers a daily "cheat code" for the highest-frequency fantasy job: **win today.** Open
the **Today** tab each morning and see — for *today's* games — your open lineup holes with the
best plug for each, the best streaming arms available, and any upgrade/sit worth making, every
play ranked by **today's matchup quality**, drop-cost-aware. This is the daily-return hook the
app lacks: everything today operates at rest-of-season (Wire, My Team) or this-week (Matchup)
scale; nothing operates at **today**, and on the daily job the app is currently *behind* the
native ESPN/Yahoo apps (which at least expose probable-pitcher filters + today's opponent).

## Context that shaped the design

- The daily engine **largely already exists** but was unwired. `src/myteam/yourMove/` has a
  **Today layer** ("daily-league plays — stream a starter pitching today, fill an open slot for
  one game") with `streamGenerator` / `addGenerator` / `startSitGenerator` / `dailyCandidates`,
  a `playsToday(team)` check, and one-day drop-cost logic (`pairDrop`). `src/services/mlbSchedule.ts`
  already fetches **today's games + probable pitchers** from the public MLB Stats API
  (`getWeekSchedule(startYmd, endYmd)` → `{ gamesByTeam, startsByPitcher }`, with
  `ProbableStart.opponentAbbr` so we can resolve the opposing SP for any hitter's team today).
- Two gaps make it native-parity instead of a cheat code, and this spec closes them: the engine
  is **category-scored and organized as a flat move list**, not organized around **your open
  slots**, and it ranks by season-rate value, not **today's matchup quality**.
- YourMove was deliberately stripped from My Team during the one-lever repositioning
  ([[user-pages-one-lever-architecture]]). The *weekly* win-prob moves rightly moved to Matchup;
  the **daily** start-sit/stream need survived the module that served it. This spec revives that
  need as its own surface.

## Decisions (settled with the user)

1. **Core job:** the **full daily optimizer** (broad) — fill open slots PLUS streaming upgrades
   over players who do have a game, sit cold/bad-matchup starters — kept strictly to **daily**
   granularity so it never overlaps weekly Matchup or season-long Wire.
2. **Placement:** a **dedicated "Today" nav tab, first position** — the daily front door.
   Streaming is the **hero** of the page (the marquee action) but "Today" is the tab name, so it
   also covers bats/lineup moves and doesn't collide with The Wire's existing "stream this week".
   Every add deep-links into The Wire (streaming-lives-near-the-wire, satisfied by linking).
3. **Ranking depth:** the **full matchup model** is the vision; **Phase 1 (this build) ships the
   light layer** — opposing-SP quality + park factor — which runs **local with no external feed**
   and delivers ~80% of the edge. **Phase 2** adds Vegas totals + platoon splits (needs a feed +
   proxy; revisits the local-only line) — purely additive, same layout.
4. **Architecture:** approach A — **revive & extend YourMove** into a dedicated Today surface,
   reusing its tested generators + schedule integration.
5. **Horizon ladder:** Today (day) · Matchup (week) · The Wire (season) — one job per page.

## Architecture

```
TodayView  (new nav tab, first position)
  └─ useToday(roster, freeAgents, myTeam)
       ├─ getWeekSchedule(today, today)  → today's games + probables      [exists]
       ├─ openSlots(roster, todaySchedule)  → active slots with no starter today   [NEW pure]
       ├─ YourMove generators (revived): stream / add / startSit / dailyCandidates
       ├─ scoreToday(basePlay, matchup)  → baseProjection × matchupMultiplier      [NEW pure]
       │     Phase 1: oppSpQuality(probables + SP stats) × parkFactor(embedded table)
       │     Phase 2: × vegasTotal × platoonSplit   (feed + proxy, deferred)
       └─ organize → { hero, openSlots[], streamers[], upgrades[], sitAlerts[] }
                     each FA add deep-links to The Wire (pre-filled add/drop)
```

### New pure, tested units (`src/today/`)

- **`openSlots.ts`** — `findOpenSlots(roster, todaySchedule): OpenSlot[]`. An active lineup slot
  is "open" today when its starter (a) has **no game today** (`gamesByTeam[team] === 0` via
  `teamAbbrVariants`), (b) is **empty**, or (c) is **injured/out** (IL/DTD status on the roster
  entry — this also closes the injury-awareness gap surfaced in the league critique). Returns the
  slot, the current (absent) starter if any, and the slot's position eligibility for fill-matching.
- **`scoreToday.ts`** — `scoreToday(base, matchup): { value: number; bucket: 0..6 }`.
  `value = base × clamp(matchupMultiplier, 0.7, 1.3)`. Phase 1 `matchupMultiplier =
  oppSpFactor × parkFactor`; missing inputs fall back to `1.0` (base only), never error.
  `bucket` = multiplier mapped to 6 blocks for the `▓▓▓▓▓░` bar. Deterministic.
- **`parkFactors.ts`** — a small **embedded static table** (~30 parks, public, hitter/pitcher
  factor). No feed.
- **`oppMatchup.ts`** — `opposingStarter(teamAbbr, todaySchedule)` (via `ProbableStart.opponentAbbr`
  + `startsByPitcher`) and `spQuality(pitcherStats)` → a 0.7–1.3 factor from the SP's rate stats
  the app already loads (K%, ERA/WHIP-ish). Hitter facing a soft arm → bump; streamer facing a
  soft *lineup* → bump.

### Reused (revived) units

- `src/myteam/yourMove/` generators (`streamGenerator`, `addGenerator`, `startSitGenerator`,
  `dailyCandidates`), `pairDrop` (one-day drop-cost), `playsToday`. **Intended split:** the
  generators are reused for **candidate *enumeration* only** — who's a valid daily play today
  (pitchers starting today, FAs/bench players with a game today, eligible fills for an open
  slot) — while **`scoreToday` owns all *value*** (base projection × matchup). This is what makes
  points vs. category a `scoreToday`-only concern: the generators' category `addDelta` is not used
  to rank the Today board. The plan's first task verifies how much of the generators' internal
  category logic must be factored out of enumeration; if a generator can't be cleanly separated,
  the fallback is a thin points-side candidate enumerator alongside it (no change to the category
  path). The existing category win-prob scorer (`buildMoves`/`ScoredContext`) stays owned by
  Matchup and is not reused here.
- `src/services/mlbSchedule.ts` — unchanged.

### New glue

- **`useToday.ts`** — composable: fetch today's schedule, gather roster + free agents (same
  sources the Wire/My Team composables use), run open-slot detection + generators + `scoreToday`,
  organize into the board view-model. Platform switch (ESPN/Yahoo) at the inputs, like the other
  composables. Stale-guard + honest error/empty states; never blocks nav.
- **`TodayView.vue`** + a nav entry (first position) + route/wrapper following the existing
  redesign pattern.

## The board (Section 2, approved)

Ordered by urgency — your holes cost games *now*, so they lead; streaming is the hero block.

```
Today                                            Mon · Jul 13
Stream an arm, plug your holes — win the day.

★ TODAY'S BEST PLAY
  STREAM Hunter Greene SP·CIN  +18   vs COL  great ▓▓▓▓▓░  (opp K%↑, park+)
  DROP Trevor Megill (one-day stream · drop tomorrow)              → Wire

YOUR OPEN SLOTS · 3 holes today
  SP  (empty)     → add José Soriano  vs COL   great ▓▓▓▓▓░        → Wire
  OF  Jo Adell    off today  → start Xavier Edwards (bench)        (free)
  C   (no game)   → add Carson Kelly  vs CHC   ok ▓▓▓░░░           → Wire

STREAMING · best arms available today
  José Soriano  SP·LAA  vs COL  ▓▓▓▓▓░ +15  · Shane Bieber @BOS ▓▓▓░░░ +9  → Wire

UPGRADE TODAY · better than a guy in your lineup
  SIT Nick Martinez (@ tough SP ▓░░░)  →  START a stream  +7
```

- The `▓▓▓▓▓░` bar is the Phase-1 multiplier bucket; Phase 2 deepens it without layout change.
- Open-slot fills are **bench-first** (free) before FA (costs a transaction); FA adds carry a
  `→ Wire` deep-link (pre-filled add/drop); pure streams carry a one-day "drop tomorrow" flag.
- **Points vs category:** the value number swaps unit per league — projected points/game, or
  cats-helped chips like the Wire uses. The engine gains a **points scoring path** alongside the
  existing category one.
- Good empty state: no holes + no strong stream → *"You're set for today — lineup's optimal."*
  (reinforces the daily check-in habit).
- Terminal aesthetic (mono, `bg-dark-card`, lime on hero/best plays, red on sit alerts).

## Scoring & matchup layers (Section 3, approved)

`value = baseProjection × matchupMultiplier`:
- **Base projection** — today's single-game expectation from the season-rate projections the app
  already produces (points/game for points leagues; cats-helped/value for category).
- **Phase 1 multiplier (this build, local):** `oppSpFactor × parkFactor`, clamped 0.7–1.3 so no
  single input dominates; missing data → `1.0`.
- **Phase 2 multiplier (deferred, feed + proxy):** `× vegasImpliedTotal × platoonSplit`. Same
  `scoreToday` signature, extra factors; bar + layout unchanged → additive.

## Scope, degradation, testing, gates (Section 4, approved)

- **Scope (Phase 1):** **baseball only** (probable-pitcher/daily-games paradigm; `mlbSchedule` is
  MLB); **ESPN + Yahoo**; **points + category**. Football (weekly) never gets the tab; NBA/NHL
  daily are future; Sleeper deferred (YourMove is ESPN/Yahoo-gated).
- **Degradation (first-class):** no schedule / everyone has a game / non-baseball / off-day →
  the "you're set for today" empty state. Missing SP stats or park entry → multiplier `1.0`
  (base only). The tab never blocks nav; a thin-data day just makes it quieter.
- **Testing:** pure units get thorough vitest coverage — `openSlots` (empty/off-day/injured
  detection across lineup shapes + team-abbr variants), `scoreToday` (multiplier math, clamp,
  fallback-to-1.0, bucketing), `parkFactors` lookup, `oppMatchup` (opposing-starter resolution +
  spQuality bands). Revived generators keep their existing tests. `useToday`/`TodayView` verified
  via type-check + build + a real-league smoke.
- **Gates:** type-check 62 baseline (none in touched files), build clean, full suite + new tests
  green. **Local only** — Phase 1 needs no feed/proxy/deploy.

## Files

| File | Change |
|------|--------|
| `src/today/openSlots.ts` (+ test) | **new** — open-slot (off-day/empty/injured) detection |
| `src/today/scoreToday.ts` (+ test) | **new** — base × matchup multiplier, clamp, bucket |
| `src/today/oppMatchup.ts` (+ test) | **new** — opposing-starter resolution + SP-quality factor |
| `src/today/parkFactors.ts` (+ test) | **new** — embedded park-factor table + lookup |
| `src/composables/useToday.ts` | **new** — orchestration (schedule + generators + scoring → VM) |
| `src/views/TodayView.vue` (+ wrapper) | **new** — the board |
| `src/myteam/yourMove/*` | **reuse** — generators/pairDrop/dailyCandidates revived (may need a points-scoring path added; no behavior change to category path) |
| `src/App.vue` (or nav layout) | **modify** — add the "Today" tab, first position |

## Out of scope (defer / never)

- **Phase 2 matchup model** (Vegas totals, platoon splits) — needs an external odds/splits feed +
  a serverless proxy; revisits the local-only constraint with the user. Additive to `scoreToday`.
- **Non-baseball daily** (NBA/NHL) and **Sleeper** — future platforms/sports.
- **Football** — weekly cadence; no Today tab.
- Auto-executing moves (setting the lineup / making the add for the user) — the board recommends
  and deep-links; the manager acts in-platform. (The Wire already owns the add hand-off.)

## The one production action

None for Phase 1 — it runs entirely local on the branch, no feed/proxy/deploy. Phase 2's odds
feed is the point at which the local-only posture ([[deploy-only-after-local-testing]]) gets
revisited with the user.
