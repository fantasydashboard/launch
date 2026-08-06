# Draft Room — Live Draft Assistant Design

**Date:** 2026-08-06
**Branch:** `redesign/my-team-first`
**Status:** Design — awaiting user review

## Goal

A live draft assistant for Sleeper football leagues that answers the question you actually have on the clock: **who should I take right now, given who picks before my next turn and how those specific people draft?**

The differentiator is not projection quality — FantasyPros blends 100+ expert rankings and we use Sleeper's single feed; we cannot win there. It is **league-specific knowledge no competitor has**: your scoring, your roster rules, and five seasons of how the eleven people you draft against actually behave.

## Locked decisions

- **Target:** established leagues — those with seasons of history already loaded. Opponent tendencies are the moat and require history.
- **Scope:** live pick sync, VONA-based ranking, opponent tendencies, ADP value/reach flags, tiers. **Out of v1:** custom rankings import, true variance modeling.
- **Objective:** projected starting-lineup points early, shifting toward upside as starting slots fill.
- **Default view:** a single recommendation with cited reasons and alternates. Board / Room / Won't Last are tabs.
- **Platform:** Sleeper only. ESPN/Yahoo see a "coming soon" state.
- **Draft types:** snake and linear only. Auction gets an explicit unsupported state.
- **Sport:** football only, consistent with the whole VOR engine.

## Why "will he last?" is the core

Ranking by value alone is solved and commoditized. The decision that actually wins drafts is the tradeoff between the best player available and the best player *still available at your next pick*. That is VONA (Value Over Next Available), and it cannot be computed from a static board — it depends on who picks in between and what they tend to do.

A generic ADP mean cannot express "Mike reaches two rounds early for tight ends." Your league's own draft history can.

## Architecture

```
sleeperService.getDraft(leagueId)          leagueStore.historicalDrafts
   |  meta: order, type, rounds, status       |  past seasons' GradedPick[]
   |  picks[]: polled live                    |  {teamKey, position, round, overallPick}
   v                                          v
pickOrder.ts                              tendencies.ts
   managers picking before my next turn       per-manager positional priors,
   (snake reversal aware)                     shrunk toward league average
   |                                          |
   +---------------+--------------------------+
                   v
             survival.ts   (Monte Carlo, ~1000 runs)
             -> P(available at my next pick) per player
             -> E[best available at each position] at my next pick
                   |
   adp.ts ---------+          useFootballVor -> vorByKey
   (ADP by key,               useActivePointsSource -> pool, freeAgents,
    variant from                                        slots, leagueSize,
    league settings)                                    myTeamKey
                   v
              board.ts   -> ranked rows, tiers, value/reach flags
                   v
            recommend.ts -> the call + cited reasons + alternates
                   v
        useDraftRoom.ts -> DraftRoomView.vue
        (poll, draft state,     Pick | Board | Room | Won't Last
         manual override)
```

### §1 — `pickOrder.ts` (pure)

Given draft type (`snake` | `linear`), team count, rounds, my draft slot, and the current overall pick, return the ordered list of roster slots picking before my next turn, plus my next overall pick number.

Snake reversal on even rounds is the highest-risk arithmetic in the feature — every downstream number depends on it. It gets its own module and exhaustive tests.

### §2 — `tendencies.ts` (pure)

From `historicalDrafts`, build per-manager positional priors: for a given round bucket, the distribution over positions that manager has historically taken.

**Shrinkage:** blend the manager's own distribution with the league-wide distribution in proportion to sample size — `w = n / (n + k)` with a small constant `k`, so one prior draft leans mostly league-average and five leans mostly personal. Each prior carries its sample count `n` for display.

Keeper picks are excluded (the draft loader already flags them).

### §3 — `survival.ts` (pure)

Monte Carlo over the intervening picks. For each simulation run, for each upcoming pick in order: draw a position from that manager's prior, then select the best undrafted player at that position by ADP. After the run, record which players survived and the best remaining player at each position.

Outputs, averaged over runs:
- `survival[playerKey]` — probability still available at my next pick
- `expectedBestAtPosition[pos]` — expected value of the best available at each position at my next pick (feeds VONA)

Deterministic seeding so the same state yields the same numbers within a session — a recommendation that flickers between renders destroys trust.

### §4 — `adp.ts` (pure)

Extract ADP from the Sleeper projections payload already fetched and cached by `useFootballVor` — currently discarded because `fetchSeasonProjectionStats` filters to scoring stat keys.

Variant selection from league settings: `scoring_settings.rec` (1 → ppr, 0.5 → half_ppr, else std), a `SUPER_FLEX` roster slot → `adp_2qb`, dynasty league type → dynasty variants.

### §5 — `board.ts` (pure)

Rank available players:

```
VONA(p)   = pointsRos(p) − expectedBestAtPosition[pos(p)]
w         = filledStarterSlots / totalStarterSlots
score(p)  = (1 − w) · VONA(p) + w · upside(p)
upside(p) = projectionRank(p) − adpRank(p)      (positive = market higher than our projection)
            plus a bonus for the existing 'backup-elevated' opportunity tag
```

`w` is driven by roster state rather than round number so it adapts to league size and roster shape. As starters fill, the board tilts to ceiling — which also prevents the flat-board collapse in rounds 10+ once marginal starter value reaches zero.

**Tiers:** within each position, a tier boundary falls where a consecutive value gap exceeds the typical gap for that position.

**Flags:** `value` when a player is still available well past his ADP; `reach` when taking him would be well before it.

**Honesty constraint:** `upside` is a proxy for *market disagreement*, not modeled variance. UI must say "market ranks him N spots higher than our projection" and never imply a distribution. ADP feeds both survival and upside, so ADP error propagates to both — acceptable, but not hidden.

### §6 — `recommend.ts` (pure)

Produce the single call plus 2–3 alternates. Every reason must cite a number the model actually used:
- the VONA gap versus the next-best at that position at your next pick
- a manager tendency **with its sample count**
- a tier boundary ("last back in tier 2 — next tier drops 22 points")

If a reason cannot cite a computed value, it is not printed. No decorative rationales.

### §7 — `useDraftRoom.ts` + `DraftRoomView.vue`

Poll `/draft/{id}/picks` every ~5s while draft status is `drafting`, with backoff on error. Derive drafted set, my roster, current pick, and whether it is my turn.

Views: **Pick** (default), **Board**, **Room**, **Won't Last** — all rendering the same computed state.

Route `/draft-room`. `/draft` (retrospective Draft Analysis) is untouched.

### §8 — Replay mode

Run the entire engine against a completed draft from `historicalDrafts`, pick by pick, as if live. This is both the development harness (the season has not started) and the verification path (a draft tool otherwise gets one live test per year).

Replay also produces **calibration**: of players predicted ~90% likely to be gone, how many actually went? Overconfidence is discoverable before draft night rather than during it.

## Error handling and degradation

- **Sync fails mid-draft** → manual override stays available at all times, not as a fallback that must be switched on. A tool that strands the user at pick 47 is worse than no tool.
- **No league history** → league-average positional priors, and the UI says so rather than implying knowledge of opponents.
- **Thin history** → shrinkage handles the math; every tendency line shows its sample count.
- **Player missing ADP** → remains on the board, excluded from simulation draws rather than assigned a fabricated position.
- **Auction draft** → explicit unsupported state.
- **Draft not started / complete** → pre-draft board (static ranking, no survival) and a completed state respectively.

## Testing

- `pickOrder` — snake reversal across round boundaries, linear, first/last slot, my-next-pick arithmetic. The most paranoid tests in the feature.
- `tendencies` — shrinkage toward league average with n=0,1,5; sample counts; keeper exclusion.
- `survival` — probabilities in [0,1]; a player certain to be taken before my turn approaches 0; determinism across runs with the same seed.
- `board` — VONA sign and magnitude; `w` shifting the blend as starters fill; tier boundaries; value/reach flags.
- `recommend` — every emitted reason traces to a computed number; alternates ordered by score.
- `adp` — variant selection from scoring settings; missing-ADP tolerance.
- **Replay** — end-to-end over a real completed draft, plus a calibration report.

## Boundaries

- Sleeper football leagues only. Baseball and other platforms untouched.
- No new external dependencies; ADP comes from an already-cached payload.
- `/draft`, the Draft Report, and all existing VOR surfaces are unchanged.
- Not in v1: custom rankings import, true variance modeling, auction support, ESPN/Yahoo sync.
