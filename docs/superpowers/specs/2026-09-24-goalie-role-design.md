# Goalie role — design

**Status:** scoped, unbuilt. Not a draft-week job; the daily half needs games to exist before it
can be probed. Written 2026-09-24, opening night 2026-10-06.

**Why:** `docs/hockey-category-audit-2026.md` — our goalie ordering correlates 0.480 with an
analyst consensus against 0.749 for skaters.

## The problem, stated correctly

A goalie is worth what he STARTS. Everything else about him is a rate, and rates are the part
everybody already agrees on — the audit found no meaningful dispute about how well any of these
goalies play. The dispute is entirely about how often they will play.

That makes goalies different from skaters in a way that matters:

| | skater | goalie |
|---|---|---|
| workload next season | mostly persistent — 80 games tends to follow 80 games | volatile — 43 starts can become 60 or 12 on one signing |
| what decides it | health | a coach's choice, which is news, not arithmetic |

So the thing we are missing is not a better projection. It is a ROLE signal, and a role signal
cannot be derived from the box scores we already have. Building a goalie rate model on
`goalie/summary` would reproduce exactly the ordering we have now, because that ordering is
already last season's goalies ranked correctly by last season's work.

This is why the audit's first conclusion — "ESPN's goalie projections are wrong" — was wrong.
They match last season almost exactly. Nobody is making an arithmetic error.

## Two questions, two horizons

They are the same underlying fact — who gets the net — at two distances, and they should not be
built as one thing.

**Season: what share of his team's games will he start?** This prices a goalie on the draft
board and in rankings. It is a projection, and it is the one the audit is about.

**Tonight: is he starting?** This is the daily page's most valuable single row. In a daily
league, starting a goalie who does not play is a zero, and a manager checks this before anything
else. It is a fact, not a projection, and it becomes knowable a few hours before puck drop.

## What the feeds can and cannot supply

Measured 2026-09-24:

- `goalie/summary` publishes `gamesStarted` alongside wins, saves, shots against and GAA for 98
  goalies. So last season's start share is directly computable, per goalie and per team.
- The NHL publishes **no probable or confirmed starter on any schedule endpoint**. This is
  already recorded in `src/services/nhlSchedule.ts` and was re-confirmed here.
- ESPN's projection carries expected games (`GP`, `DEC`) which is its own view of workload, and
  `starterStatus` exists on ESPN's game feeds but its semantics have never been verified in
  season. That probe cannot be run before 2026-10-06 because the pre-game shape of those
  endpoints is not visible in the offseason.

So the season half is buildable now from data we hold. The nightly half is blocked on a probe
that requires real games.

## Season half — what to build

A start-share projection per goalie, replacing the raw ESPN games count as the volume term:

1. **Measure last season's share.** Starts divided by his team's games, from `goalie/summary`.
   A goalie with 43 of 82 held a 52% share.
2. **Shrink it, the way skater rates are shrunk.** A goalie with nine starts has a share but not
   evidence. The shrink point is measurable the same way `SHRINK_GAMES` was — empirical Bayes
   over the spread of observed shares among goalies with real workloads — and it will be LARGE,
   because share is exactly the quantity that does not persist.
3. **Constrain by team.** Shares within one team must sum to about 1. This is the part a
   per-player model cannot do and the part that carries the most information: two goalies both
   projected 60% on the same team is a statement that is false on its face, and resolving it is
   how a committee gets priced as a committee.
4. **Let a role signal override.** When ESPN's expected games disagrees sharply with last
   season's share, that is the depth chart having changed, and it is the one thing ESPN knows
   that the box scores do not. Treat it as evidence, not as the answer.

Rates stay measured from `goalie/summary` and get multiplied by projected starts. Same shape as
the skater model: a rate we measure, a horizon we borrow.

**Honest limit:** none of this reads a transaction. A goalie traded in October is priced on the
old team's depth chart until he has played. Stating it rather than hiding it.

## Nightly half — blocked, and what unblocks it

On 2026-10-05 or 06, probe in this order and build against whatever answers:

1. ESPN's game feed for `starterStatus` on goalies — does it populate pre-game, and how far out?
2. `api-web.nhle.com` gamecenter for the same game, pre-puck-drop.

Whichever carries a confirmed or probable starter is the source. If neither does, say so on the
daily page rather than inferring a starter from workload — a wrong confident answer here costs a
manager a whole night, which is worse than an honest blank.

## What this does not attempt

A goalie's save percentage is a team statistic as much as a personal one, and this design does
not try to separate the goalie from the defence in front of him. That is a real effect and a
much larger piece of work; it is out of scope, and the rates carried forward are the goalie's
observed ones with no adjustment for who he played behind.
