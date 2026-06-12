# Trade Targets — Design Spec

**Date:** 2026-06-12
**Branch:** redesign/my-team-first (local only — no push/deploy until user-tested)
**Status:** Design approved in conversation; pending spec review → implementation plan.

## Goal

A trade/league-intelligence surface that finds and ranks trades by **leverage**, not
"fair value." It identifies (a) mirror partners — teams strong where you're weak and
weak where you're strong, and (b) desperation targets — teams very weak in a category
you're very strong in, where you hold pricing power. It is the only surface in the app
that looks at the **whole league** (all rosters), which is what makes it structurally
distinct from My Team (you in isolation) and Matchup (you vs one weekly opponent).

## Why it's distinct (the white space)

Players-as-"you vs the waiver wire" feels like a richer My Team, because the wire is a
thin pool of scrubs and My Team already points you at it. The genuine departure is
**you vs the league**. Nothing else in the app reads the other teams' rosters. The data
to do it is *already loaded* — `getAllRosteredPlayers(leagueKey)` returns every team's
players with stats, positions, eligible positions, and `fantasy_team_key`. We currently
use it only as a value baseline; the full league map is sitting unused.

## Core principles (the analysis this is built on)

1. **In cats, surplus is dead value.** You win a category 1st-by-50 or 1st-by-1 — the
   excess scores nothing. Dominance is value you cannot use. So a "lopsided" trade can
   make BOTH teams better: each ships dead surplus into the other's live need. Fair-value
   analysis is blind to this; it's the entire opportunity.

2. **Marginal category value is hump-shaped, not monotonic.** A team 1st in a category
   has ~0 need (already won). A team hopelessly last ALSO has ~0 need (can't catch up =
   effectively punted). Need peaks in the middle — a tight race a few units flips. Getting
   this curve right is the single most important modeling decision; it's exactly what
   humans misjudge (reinforcing a locked or lost category).

3. **Scarcity = pricing power.** Per category, thin supply (few teams with surplus) +
   high demand (many teams with need) means whoever holds surplus can extract ABOVE fair
   value. Saves/Holds are the textbook monopoly (closers are scarce); a K surplus is
   sellable high when few others can supply it.

4. **Trades are scored by need-weighted transfer, not balanced raw value.** Weight every
   category delta by the receiving team's NEED in that category. Giving a K arm while
   you're 1st in K costs ~0 (Need≈0) even though his raw value is high — that's the
   arbitrage. This makes category trades positive-sum in a way raw value never shows.

5. **Position is a constraint on FIELDABLE value, not a scoring axis.** Categories accrue
   only from players in active, position-gated slots. So:
   - A logjam (two strong 3B, one slot) buries value you can't field — the deadest value
     of all, prime trade currency.
   - A forced-weak slot (a bad SS you must start) drags every category that slot touches
     (ratio cats especially — you can't bench him). The "weakness" is positional, and the
     fix is position-specific (get a SS, not another corner masher you can't field).
   A category-only model is ~80% right but **confidently wrong** on exactly these cases —
   which is where a smart tool beats eyeballing it. Therefore player value is defined as
   **marginal category contribution to the optimally-fielded lineup** (value over
   positional replacement), with the slot-assignment refinement landing in v2.

## Architecture / engine layers

All layers are pure, testable functions over (rosters + ROS projections + catSpecs +
league roster-slot settings). UI consumes the final structured output.

### Layer 1 — League category landscape
- Aggregate each team's players' ROS effective stats into team category projections.
  Counting cats: sum. Ratio cats: volume-weighted blend (reuse the matchup engine's
  ratio handling). v1 approximates with the full-roster aggregate; v2 uses the
  optimally-fielded lineup (Layer 2).
- Per category, rank teams by projected total and compute:
  - **Surplus(T,c)** — how much T can shed before dropping a standings place (gap to the
    next-worse team); ~0 if last.
  - **Need(T,c)** — hump-shaped marginal value: proximity to the next-better team, gated
    to ~0 at 1st (nothing above) and at hopeless-last (gap insurmountable).
  - **Scarcity(c)** — count of meaningful suppliers vs demanders league-wide.

### Layer 2 — Fieldable player value (positional)
- Player value to a team = marginal need-weighted category contribution to that team's
  **optimally-fielded lineup** (over positional replacement).
- v1: approximate with role-relative value (`computeRosterValue`) — position-blind.
- v2: solve optimal slot assignment given league roster slots (from `getLeagueSettings`),
  using a greedy/Hungarian assignment; compute each player's marginal over positional
  replacement. Detect **logjams** (surplus at a position) and **forced-weak slots** (a
  required slot whose best available player is weak). Weight the positional adjustment by
  how constrained the league's slots are (deep UTIL/MI/CI/bench → position matters less).

### Layer 3 — Partner complementarity (mirror ranking)
- `complementarity(you, T) = Σ_c [ Surplus(you,c)·Need(T,c) + Need(you,c)·Surplus(T,c) ]`
- Rank all teams; high score = you each hold what the other needs and can spare.

### Layer 4 — Deal builder
- For each partner, search player pairs: you GIVE from your surplus / positionally-trapped
  players, GET for your need / forced-weak slots.
  - `yourGain  = Σ_c Need(you,c)·[ getter.contrib(c) − giver.contrib(c) ]` (ratio-aware)
  - `theirGain = Σ_c Need(T,c)·[ giver.contrib(c) − getter.contrib(c) ]`
- Classify each proposed trade:
  - **Win-win** — both gains clearly positive. Easy sell.
  - **Leverage** — yourGain ≫ theirGain but theirGain still positive. They fix a real
    hole; you get more because your resource is scarce / they're desperate. (The
    "take advantage but they still say yes" zone — the product's edge.)
  - **Fleece** — theirGain ≤ ~0. Surfaced but honestly flagged ("little reason to accept
    unless panicking").
- v1: 1-for-1. v2: 2-for-1 and multi (combinatorial — start small).

### Layer 5 — Scarcity / exploit board
- Per category where you have surplus AND scarcity is high, list the desperate teams and
  your pricing power. Special handling for SV/HLD (role-monopoly resources).

## Baseball-cats specifics the model must handle

- **Ratio cats dilute, not add.** Trading for ERA/WHIP/AVG help is a volume-weighted
  blend, not a sum; a bad-ratio innings-eater you give away HELPS you. Reuse the existing
  ratio impact logic.
- **Saves/Holds = role monopoly.** Surplus = extra closers; demand = teams with none.
  Highest-leverage, most-exploitable category — hunt it explicitly.
- **Volume/games caps blunt surplus.** Counting-stat surplus you can't deploy (innings/
  games capped) is the deadest value — raise the trade-away signal.
- **Punt detection.** Distinguish "weak and trying" (high need) from "weak and abandoned"
  (Need≈0 — pure trade currency). v1 heuristic: hopeless rank + not adding ⇒ punt.

## UX surfaces (per the approved mock)

A dedicated **Trades** tab (not a Players lens — it's big and distinct), Yahoo category
v1. Sections:
1. **Your leverage** — tradeable surplus (dominant cats) vs holes, with the one-line
   strategy ("spend the K surplus to fix ERA/HR").
2. **Trade targets** — two-sided deal cards: GET (fixes your hole) / GIVE (from your
   surplus, into their hole) / mutual-fit rating + rationale. Classified win-win vs
   leverage.
3. **Best trade partners** — mirror teams ranked by complementarity ("start here").
4. **Exploit board** — categories where you hold pricing power + the desperate teams.

## Data sources (already available)

- `getAllRosteredPlayers(leagueKey)` — every team's roster + stats + eligible positions +
  `fantasy_team_key`. (Heavy call — see Risks: needs caching.)
- FanGraphs ROS via `buildPlayerMatchers`/`matchFG` + `mapToEspnStats`.
- `catSpecs` (side, isRatio, volumeStatId, lowerIsBetter) + the standings/categories
  derivation (currently duplicated in MyTeamView/PlayersView — see Risks).
- `getLeagueSettings` — roster slots (for Layer 2 positional constraints).
- `computeRosterValue` — role-relative value baseline.

## Scope

**v1** (ship, validate):
- Layer 1 landscape (Surplus/Need/scarcity, full-roster aggregate approximation).
- Layer 3 partner complementarity ranking.
- Layer 4 deal builder, 1-for-1, need-weighted, win-win / leverage / fleece classification.
- Layer 5 scarcity flags (incl. SV/HLD).
- Position-blind value (`computeRosterValue`), BUT value function authored as
  "marginal-over-replacement" so the positional layer slots in without a rewrite.
- Yahoo category only.

**v2:**
- Layer 2 positional engine (optimal slot assignment, logjam + forced-weak-slot detection,
  fieldable marginal value), slot-depth weighting.
- 2-for-1 trades, punt-intent inference.

**Later:**
- Behavioral acceptance modeling (surface incentives, never assert acceptance), 3-team
  trades, ESPN/Sleeper parity, points-league analog.

## Risks / open questions

- **Opponent acceptance is behavioral, not solvable.** v1 surfaces the incentive structure
  (their need, scarcity), never asserts "they'll accept."
- **ROS projection coverage** for all rostered players (FA→FanGraphs matching had gaps;
  same risk league-wide). Degrade to extrapolated season-to-date per player.
- **The heavy all-rosters fetch** is the same call behind the earlier Yahoo 500. This tool
  leans on it entirely → the league-roster pool should be cached in the store and shared
  across My Team / Players / Trades, not re-fetched per page. (Pre-req hardening.)
- **Need-curve calibration.** The hump function needs tuning on real leagues; ship with
  named constants and revisit.
- **Shared league-context duplication.** The standings/categories/catSpecs derivation is
  duplicated across views; the Trades tab is a third consumer — strong argument to extract
  a shared `useCategoryLeagueContext` composable as part of this work.

## Testing strategy

Pure functions throughout, tested with synthetic leagues:
- Surplus/Need/scarcity from a fabricated standings landscape (assert hump-shape: 1st and
  hopeless-last both ~0; middle peaks).
- Complementarity ranking (mirror teams score highest).
- Deal scoring + classification (win-win / leverage / fleece boundaries; ratio-aware
  contribution; giving dead surplus costs ~0).
- v2: slot assignment (logjam buries value; forced-weak slot raises need at that position).

## IA decision

New **Trades** top-level tab. Reuses the value engine and league context. Gated to Yahoo
category leagues for v1 (same gate as Players), with a clear "coming" message elsewhere.
