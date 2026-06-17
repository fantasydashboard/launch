# The Wire — Design Spec

**Date:** 2026-06-17
**Status:** Approved (design), pending implementation plan
**Scope:** Replace the `/players` page (`PlayersView.vue`) with **The Wire** — the season-long waiver lever — for ESPN + Yahoo H2H **category** baseball leagues. Kept LOCAL on `redesign/my-team-first` until real-user testing (per project rule).

---

## 1. Purpose

The Wire answers exactly one question:

> **"Who should I add — and drop — to durably improve where I stand in the categories?"**

It is the **waiver-wire lever** in the four-page architecture (Trades = the market, **Wire = the waivers**, Matchup = win this week, My Team = season roster health). Where Trades moves value *between* rosters, The Wire pulls value *off the wire onto* your roster and sheds your weak link.

### Boundary vs Matchup (must never re-collide)
- **Matchup** = win *this* week: today's streams, start-sits, the specific moves that swing the *current* matchup. Metric: **this-week win-probability lift**. Horizon: ephemeral.
- **The Wire** = improve the roster you carry *all season*: durable add/drop, plus what to be streaming for your *season-long* pitching holes. Metric: **season expected-categories-won delta (ECW, "+X cats/wk")**. Horizon: rest-of-season.
- They share engines (`src/trades/standings.ts`, `mlbSchedule`, drop logic) but differ in **metric** and **time horizon**.

The old "This week / Season fit" lens toggle is **removed** — "this week" is now Matchup's job, so The Wire is single-purpose (season).

---

## 2. Scoring model

Every add is scored as a **one-sided standings move** in the same dialect as Trades, using **rest-of-season (ROS) projections** (FanGraphs via `fgByKey`, falling back to YTD extrapolation by `seasonFraction`).

### Algorithm (per free agent)
1. Build the league-wide ROS category totals: `aggregateTeamCatTotals(pool, cats)` over the full rostered pool.
2. Pick the **drop**: the weakest droppable roster player on the free agent's side (hitter/pitcher) that frees a usable slot (reuse `computeDropCandidates` / roleValue logic). May be `null` if the roster has an open slot (pure add).
3. Apply add+drop to **your team only** and recompute your ECW against the **unchanged** league (the free agent was unowned, so no other team changes):
   - `before = expectedCatsWon(myTeamId, totals, cats)`
   - `myTotalsAfter = applySwapToTeam(myTeam, dropStats ? [dropStats] : [], [addStats], cats)`
   - `after = expectedCatsWon(myTeamId, totalsWith(myTotalsAfter), cats)`
   - **`deltaEcw = after − before`** = season cats/week gain, net of the drop.
4. **fixes** = statIds where your category rank *improved* (`rankInCategory` after < before). **holds** = other cats the add meaningfully contributes to where you stay competitive (shows the add doesn't sacrifice a strength).
5. Rank all free agents by `deltaEcw` descending; keep only meaningfully positive gains (threshold, e.g. `MIN_DELTA = 0.05`); the top one is the hero.

### New engine surface (added to `src/trades/standings.ts`)
`applySwapToTeam` is currently file-private — export it, and add:

```ts
export interface AddDropDelta {
  deltaEcw: number          // season cats/week gain, net of the drop
  ecwBefore: number
  ecwAfter: number
  fixes: string[]           // statIds whose rank improved
  holds: string[]           // other statIds the add contributes to (kept competitive)
}

export function addDropDelta(
  totals: TeamCategoryTotals[],
  cats: CatSpec[],
  myTeamId: string,
  addStats: Record<string, number>,            // FA ROS projection
  dropStats: Record<string, number> | null,    // weak-link ROS projection, or null for a pure add
): AddDropDelta
```

Pure, deterministic, fully unit-testable.

> **Honesty:** real waiver gains are usually modest (+0.1–0.3 cats/wk). When nothing clears `MIN_DELTA`, the page shows a "the wire's quiet" state rather than inventing moves (matches the current empty-state ethos).

---

## 3. Stream board (season-framed)

A distinct section that lists the **streamable supply** on the wire, framed by the categories you're chasing **all season** (not this week's matchup).

1. Determine your **weakest pitching-relevant season categories** from the standings totals (lowest `rankInCategory`). Split into:
   - **starter cats** — K, QS, W, ERA, WHIP (and similar)
   - **reliever cats** — SV, HLD (SVHD)
2. **Starters:** free-agent SPs with upcoming **2-start weeks** / favorable schedule (`getWeekSchedule` → `startsByPitcher`, `lookupStarts`), ranked by contribution to your weak starter cats.
3. **Relievers:** save/hold chasers (closers-in-waiting, high-leverage setup) for your weak SV/HLD cats.
4. Header names the holes: *"Stream board · you're 11th in K, 9th in SV."*

### New engine `src/wire/streamBoard.ts`

```ts
export interface StreamTarget {
  player: { key: string; name: string; team: string; position: string }
  cats: string[]            // weak cats this stream helps
  rationale: string         // "2 starts: @COL, vs MIA" | "closer-in-waiting"
  twoStart?: boolean
  starts?: number
}
export interface StreamBoard {
  weakCats: { statId: string; label: string; rank: number }[]
  starters: StreamTarget[]
  relievers: StreamTarget[]
}
export function buildStreamBoard(
  freeAgents: AvailablePlayer[],
  weakCats: { statId: string; label: string; rank: number; side: 'hit' | 'pit'; isRatio: boolean }[],
  schedule: WeekSchedule,
  cats: CatSpec[],
  seasonFraction: number,
): StreamBoard
```

Pure; reuses the streaming projection helpers already behind `streamGenerator` where practical.

---

## 4. Page structure (`WireView.vue`)

Decision-first, accent on the action — same visual grammar as the Matchup page (no side-stripe borders; section accents via `text-primary` + ★; mono labels).

1. **Header** — "The Wire" + **adaptive subtitle** naming your biggest holes: *"Fix your roster for the season — you're 11th in HR, 9th in SV."* (Falls back to a neutral line until standings load.)
2. **★ Biggest upgrade available** (hero, primary-accent card) — the single best add: avatar/name/pos/team, **+X cats/wk**, *"drop [weak link]"*, **fixes:** [cats] · **holds:** [cats]. Hidden when the wire is quiet.
3. **More upgrades** — ranked compact rows of the next-best adds: `+X cats/wk · drop [target] · fixes [cats]`.
4. **Stream board** — `for K (starters)` list + `for SV/HLD (relievers)` list, each row: player · rationale (2-start / save upside) · cats helped.
5. **Who to drop** — your weak links as compact chips (from `computeDropCandidates`), so expendable players are visible even without a paired add.

### States
- **Loading:** "Reading the wire…" placeholder.
- **Quiet wire (no upgrade clears the bar):** "The wire's quiet — nothing on it upgrades your roster right now." The stream board and who-to-drop can still render if they have content.
- **Unsupported league:** non-category league → "The Wire is available for category leagues."

---

## 5. Data layer (`useWire.ts`)

Mirrors `useMatchupBattlePlan.ts` patterns (and inherits its hard-won reliability fixes).

- **Platform-switched sources:**
  - Yahoo: `useMyRoster` (roster + `pool` + `fgByKey`), `useAvailablePlayers` (free agents), `useFullSeasonCategoryData` (season standings + category labels).
  - ESPN: `useEspnCategoryTeamData` (`rosterPlayers`, `pool`, `fgByKey`, `freeAgents`, `standings`, `categories`, `myTeamId`).
  - Switch on `isEspnCategoryLeague` exactly as Matchup does.
- **Readiness / loading:** reuse the combined-readiness pattern (category flag AND my-team key) that fixed the Yahoo clobber race; load roster/free-agents only when ready. For the volume/stream schedule, reuse the `getWeekSchedule` fetch pattern.
- **Roster reliability:** the Yahoo `getRoster` positional-parse fix (commit on Matchup) is already in `yahoo.ts`; the heavy `getAllRosteredPlayers` provides the league-wide `pool` needed for standings ranks.
- **Returns** a reactive view-model (`reactive({...})` so nested refs unwrap in the template — the Matchup ref-unwrap gotcha):
  ```ts
  {
    ready, supported,
    subtitle,                 // adaptive holes line
    hero: WireUpgrade | null,
    upgrades: WireUpgrade[],  // "more upgrades" (excludes hero)
    streamBoard: StreamBoard,
    drops: { key: string; name: string; reason: string }[],
  }
  ```
  where `WireUpgrade = { player, deltaEcw, dropName, fixes, holds }`.

> **statId → label:** the pure engines (`addDropDelta`, `buildStreamBoard`) work in `statId`s; the composable maps them to display labels (via the category-label map, same as Matchup) so `WireUpgrade.fixes/holds` and stream `cats` are human-readable in the view.

### New engine `src/wire/wireUpgrades.ts`

```ts
export interface WireUpgrade {
  player: { key: string; name: string; team: string; position: string; headshot?: string }
  deltaEcw: number
  dropName: string | null
  fixes: string[]   // category labels
  holds: string[]   // category labels
}
export function rankUpgrades(args: {
  freeAgents: AvailablePlayer[]
  pool: PoolPlayer[]
  myRoster: RosterSlotPlayer[]
  myTeamId: string
  cats: CatSpec[]
  fgByKey: Record<string, FGProjection | null>
  seasonFraction: number
  minDelta?: number
}): WireUpgrade[]
```

Pure; uses `addDropDelta`, `aggregateTeamCatTotals`, `computeDropCandidates`.

---

## 6. Routing

- `/players` → `PlayersWrapper.vue` renders **`WireView.vue`** for category leagues on **both** platforms (Yahoo + ESPN), replacing the current Yahoo-only `PlayersView.vue` gate. Non-category → unsupported message.
- `PlayersView.vue` is left in the repo (not deleted) until The Wire is confirmed, same as we did with `CategoryMatchupsView.vue`.

---

## 7. Testing

- **Pure engines (TDD, vitest):**
  - `standings.test.ts` — extend with `addDropDelta`: a known league fixture where adding a strong SB/R player and dropping a weak link improves rank in SB/R (fixes) and holds AVG; pure-add (null drop) case; zero/negative delta case.
  - `wireUpgrades.test.ts` — ranking by `deltaEcw`, `minDelta` filtering, drop pairing on the correct side, fixes/holds derivation.
  - `streamBoard.test.ts` — weak-cat detection, 2-start SP surfacing, save-chaser surfacing, empty-schedule degradation.
- **Composable/view:** smoke-level — both platforms populate without deadlock (the lesson from Matchup's ESPN deadlock + Yahoo clobber race). No full component test harness.
- Build + `npm run type-check` clean (note: `npm run build` does NOT type-check; run `vue-tsc` separately). Existing 62 pre-existing repo type errors are unrelated and unchanged.

---

## 8. Out of scope / deferred

- **Browse/filter the whole wire** (the "scouting board" alternative) — decision-first only for v1; a position filter can come later.
- **Opponent-aware adds** (block a rival) — Trades-adjacent; not here.
- **FAAB/bid suggestions** — needs league FAAB state; deferred.
- **Auto-execute add/drop** — read-only recommendations only.
- Header/cosmetic polish parity with Matchup beyond the structure above.

---

## 9. Build order

Engines (TDD) → `useWire` composable (platform-switched, reliable loading) → `WireView.vue` → wrapper/route swap → holistic review. Via subagent-driven-development, kept LOCAL.
