# Hockey category board vs an outside consensus — 2026-09-24

Run `S=<dir> npx vite-node scripts/hockey-consensus-audit.ts` to reproduce. Snapshot taken
2026-09-24, twelve days before opening night.

## The question

Our category draft board had never been measured against anything outside itself. The football
board has been (`docs/ros-backtest-2025.md`); this one had tests proving it computes what it
claims and no evidence about whether what it claims is any good.

The comparison is DailyFaceoff's Consensus Top 250 for 2026-27 — an analyst consensus rather
than one person's list, which makes it a reasonable proxy for what a drafting room believes.

Matching a consensus is not the same as being right, and the football backtest exists precisely
because imitation is not accuracy. But a large disagreement is worth being able to explain, and
where we could not explain one we found a real problem.

## Method

Our side is the actual `buildHockeyBoard` output in category mode, twelve-team, Yahoo's default
twelve categories (G A +/- PIM PPP SOG HITS BLK W GAA SV% SHO), standard slots. Both lists are
re-ranked within the 237 players they share before the correlation is taken.

Two mistakes were made getting here and both are worth recording, because either would have
produced a confident wrong answer:

- The first pass compared our raw ranks (1..940) against a 250-long list and reported a Spearman
  of **-3.99**, which the statistic cannot produce. The orderings were fine; the scales were not.
- The second used `buildHockeyCategoryValue` directly instead of the board. That buries every
  goalie around rank 800-1100, because a goalie scores zero in the eight skater columns. It is
  the VOR step that pools by position and makes a goalie comparable to a goalie. Reading that
  output as a finding would have "discovered" a bug that does not exist.

## Result

| | Spearman | n |
|---|---|---|
| Overall | **0.705** | 237 |
| Skaters | **0.749** | 197 |
| Goalies | **0.480** | 40 |

Mean absolute rank gap: 66 places. For scale, the football board against an analyst's ROS table
was 0.873.

## Finding 1 — goalies are last season, and a goalie's role does not carry over

The worst area by a distance, and the first explanation for it was wrong. Goalies are the one
group with no rate model of our own: `mergeHockeyProjections` passes ESPN's projection through
untouched, because a goalie's value is dominated by how often his coach starts him rather than
by a rate that regresses.

The obvious reading was that ESPN's goalie projections are bad. They are not. Checked against
what these goalies actually did in 2025-26, ESPN is projecting last season forward almost
exactly:

| | last season actual | ESPN 2026-27 | we rank | they rank |
|---|---|---|---|---|
| Scott Wedgewood | 43 GS, 31 W, .921, 2.02 | 42 GP, 28 W, .915, 2.12 | 15 | 249 |
| Joel Hofer | 43 GS, 24 W, .910, 2.61 | 44 GP, 23 W, .906, 2.52 | 28 | 131 |
| Lukas Dostal | 55 GS, 30 W, .888, 3.10 | 55 GP, 27 W, .887, 3.22 | 379 | 96 |
| Juuse Saros | 59 GS, 28 W, .894, 3.16 | 60 GP, 27 W, .898, 3.19 | 385 | 138 |

Wedgewood is not a backup who got a flattering projection. He started forty-three games and
stopped .921 of what he faced. Our board ranking him fifteenth is a defensible statement about
what he has done, and the consensus ranking him 249th is a statement that his ROLE is gone —
a depth chart changed, a starter was signed, a trade happened.

So this is the same structural gap as Finding 2, not a data-quality problem: we measure, they
project. It bites hardest on goalies because a goalie's workload is the least persistent thing
in the sport. A winger who played 80 games plays about 80 again; a goalie who started 43 might
start 60 or 12 depending on one signing.

That also means a goalie RATE model would not fix it. Built on the same feed it would reproduce
the same answer, because the disagreement is not about how well these goalies play — everyone
agrees on that — it is about how often they will play. What is missing is a role signal, and
the NHL feed does carry the raw material: `goalie/summary` publishes `gamesStarted` for 98
goalies, so starts are measurable as a share of team games. Scoped separately.

## Finding 2 — we are structurally bearish on prospects

They rank Gavin McKenna 112, Will Smith 78, Ivar Stenberg 220; we have them 346, 297, 447. Every
large disagreement in this direction is a player with little or no NHL record.

This is the rate model working as designed. `SHRINK_GAMES` pulls a thin sample toward the
positional baseline — measured per category, 16.5 games for goals — which is what stops a
nine-game hot streak becoming a season projection. The same mechanism makes a breakout
invisible until it has happened.

Not a defect, but a limitation to state rather than discover on draft night: **we measure, they
project, and on rookies and sophomores we will be low.** Anyone using the board should know it.

## Finding 3 — we are higher on defencemen and hitters, and that is probably correct

Chabot, Andersson, Weegar, Dobson and Faber all sit 60-150 places higher for us, as do Sherwood
and Cuylle. That is blocks and hits earning their place.

The consensus is built for a generic league. Ours is built for the twelve columns the reader
actually entered, and in a league that counts hits and blocks those players genuinely are worth
more. This disagreement is the board doing its job, and is the one case here where matching the
consensus more closely would make the product worse.

## What this does not tell us

Whether we are right. A consensus is what a room believes in September, not what happened. The
honest version of this note arrives after the season, scored against what these players actually
did — the same shape as the football backtest. This is a sanity check, not a validation.

A third mistake belongs here too. The first write-up of Finding 1 concluded that ESPN's goalie
projections were simply wrong, on the evidence that they disagreed with the consensus. They were
never checked against what the goalies actually did — which takes one query and reverses the
conclusion. Comparing two opinions and calling the one you disagree with the error is not a
finding.
