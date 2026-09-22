# Rest-of-season backtest — 2025

Run `npx vite-node scripts/ros-backtest.ts` to reproduce. Snapshot taken 2026-09-22.

## The question

`PRIOR_GAMES` in `src/football/rosBlend.ts` decides how much a small sample of real games counts
against the preseason projection. It was five by judgment.

A comparison against a trusted analyst's week-3 2026 board showed our ranks tracking
season-to-date scoring much harder than his — 0.70 to his 0.32 at quarterback, 0.73 to his 0.16
at tight end. Reading his behaviour back through our own blend, his implied prior weight was
roughly 8-9 at running back and receiver, 18 at quarterback, 20 at tight end.

That says we differ from him. It cannot say who is right, and matching an analyst is imitation
rather than accuracy. So: rebuild the board as it stood at each week of a finished season and
check it against what those players went on to actually score.

## Method

For each week W from 2 to 14 of 2025:

| | |
|---|---|
| prior | Sleeper's 2025 **preseason** season projection |
| lines | actual scoring, weeks 1..W−1 — everything knowable at W, nothing more |
| board | `buildRosPoints(prior, lines, W)` — the shipped function, swept over prior weights |
| truth | actual half-PPR points, weeks W..18 |
| score | Spearman(board rank, truth) within position |

The prior is uncontaminated: players whose 2025 seasons ended early still carry full-season
numbers (Kyler Murray projected 314, scored 81 in 5 games), and the preseason ADP fields survive
on every record. Pearson(projection, actual) is 0.824 across 542 players — a real forecast, not
results written back.

No lookahead: the player pool is selected on **preseason** projection rank, known before week 1.

## Result

Mean Spearman across weeks 2-14, ± standard deviation across those weeks. Pool depth QB 40,
RB 48, WR 60, TE 36.

| prior weight | QB | RB | WR | TE |
|---|---|---|---|---|
| 0 | 0.412±0.06 | 0.636±0.05 | 0.437±0.12 | 0.300±0.06 |
| 1 | 0.432±0.05 | 0.662±0.03 | 0.459±0.09 | 0.312±0.07 |
| 2 | 0.438±0.05 | 0.673±0.02 | 0.475±0.07 | 0.322±0.07 |
| 3 | 0.445±0.06 | 0.679±0.02 | 0.479±0.06 | **0.325±0.07** |
| **5 (shipped)** | **0.446±0.06** | 0.681±0.02 | **0.485±0.05** | 0.319±0.07 |
| 8 | 0.439±0.06 | **0.682±0.03** | 0.481±0.04 | 0.313±0.07 |
| 12 | 0.435±0.06 | 0.671±0.03 | 0.473±0.03 | 0.302±0.07 |
| 16 | 0.430±0.06 | 0.658±0.03 | 0.469±0.03 | 0.293±0.08 |
| 20 | 0.428±0.06 | 0.648±0.03 | 0.460±0.02 | 0.285±0.09 |
| 28 | 0.423±0.05 | 0.632±0.03 | 0.450±0.02 | 0.276±0.10 |
| 40 | 0.414±0.06 | 0.608±0.02 | 0.437±0.03 | 0.261±0.10 |

**Five is right, and stays.** It is the peak at quarterback and receiver, and the alternatives at
running back (8, by 0.001) and tight end (3, by 0.006) are noise — each wins 8 of 13 weeks, which
is a coin flip. Position-dependent weights were tried and abandoned: there is no evidence for
them, and per-position constants fitted to one season are how you ship an artifact.

**The analyst's recency behaviour would have made us worse.** His implied ~18 at quarterback
scores about 0.429 (interpolating 16 and 20) against our 0.446; his implied ~20 at tight end scores 0.285 against our 0.319. This
is the specific reason not to copy the list.

**What the board is actually good at.** Running back ranks predict rest-of-season production well
(0.68), receiver moderately (0.49), quarterback and tight end poorly (0.45, 0.32 — and those are
over a narrower band of players, which makes the correlation harder to earn). If ROS accuracy is
worth more work, quarterback and tight end are where the room is, and the lever is not recency
weighting — that has been swept and it is flat.

## The methodological trap, recorded because it nearly shipped

At pool depths QB 24 and TE 24 the sweep gave a different and wrong answer: prior weight 0 at
quarterback, winning all 13 weeks by +0.089, and 28 at tight end. Widening to 40 and 36 reversed
both. Tight end's spread fell from ±0.21 to ±0.07 — the narrow pool *was* the noise.

A 24-deep pool is 24 players who were all projected to start, ranked against each other. Their
true spread is small, so the correlation is dominated by who got hurt or benched, and recent
production identifies that fastest — which flatters a low prior weight for a reason unrelated to
forecasting. A real board contains fringe starters and the backup who threw three touchdowns in
relief, and those are exactly the players a zero weight misranks.

Two apparent improvements, both statistically clean at first look, both artifacts of pool
selection. Widen the pool before believing a sweep.

---

# Addendum, 2026-09-22 — the prior itself was the problem

The sweep above tunes how much a small sample counts against the preseason projection. It never
asked whether that projection was the right baseline, and it was not.

## Why the board over-reacted

A preseason projection is frozen in August. It cannot learn that a role changed, so the only
thing able to move a player is his own box scores — which is exactly why our ranks tracked
season-to-date scoring harder than a trusted analyst's at every position. Against his week-3
2026 board the pattern was one-directional: hot start and we ranked him higher, cold start and
we ranked him lower, every time. Tucker Kraft TE4 to our TE16 on 5.2 PPG; Jalen Coker WR29 to
our WR14 on 20.2.

Sleeper publishes a per-week projection that IS maintained — it reflects the depth chart, the
injury and the current role. `FORWARD_WEIGHT` in rosBlend.ts now averages its rate into the
blend.

## The result, and the much larger wrong result that came first

Summing the projections for every remaining week scored **+0.33 Spearman** at quarterback and
tight end, winning 13 weeks of 13 at all four positions. That number was an artifact and it is
recorded here because it was very convincing.

Sleeper maintains those weekly files through the season and DROPS players whose seasons have
ended. Every 2025 season-ender — Kyler Murray, Tyreek Hill, Malik Nabers, James Conner, Russell
Wilson — is simply absent from the week-14 file. Summing weeks W..18 in a backtest therefore
tells the model who is still playing in December, which is most of what decides a
rest-of-season total. It was not forecasting; it was reading the answer.

Only the UPCOMING week can be used to measure, because only it was filed before the decision.
With that restriction, weeks 2-14 of 2025:

| position | shipped | next-week rate | 50/50 blend | weeks the rate wins |
|---|---|---|---|---|
| QB | 0.476 | 0.491 | **0.510** | 5/13 |
| RB | 0.627 | 0.626 | **0.639** | 7/13 |
| WR | 0.425 | **0.493** | 0.467 | **12/13** |
| TE | 0.360 | **0.399** | 0.390 | 10/13 |

**Receiver is the real win**: +0.067 winning 12 weeks of 13. Tight end is smaller and probably
real. Quarterback and running back are coin flips. For scale, the entire `PRIOR_GAMES` sweep
above moved things by ±0.006, so this is an order of magnitude larger — and an order of
magnitude smaller than the artifact.

The 50/50 blend ships because it is positive at all four positions where the pure rate is noise
at two. The two sources know different things.

## What is still unmeasured

The full forward-week sum cannot be backtested with this data, but the lookahead is a property
of the MEASUREMENT rather than the method: in production at week 3 of 2026, Sleeper's week-14
projection reflects only what is known now and genuinely cannot know November's injuries. It may
well be better than the one-week rate we shipped. Settling that needs a forward test on a live
season, not another pass over 2025.
