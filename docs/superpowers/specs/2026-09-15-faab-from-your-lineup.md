# FAAB advice priced against your own lineup

**Goal:** answer "how much should I bid" with a number that is different for every
manager, because the same player is worth a different amount to each of them.

## Why this is worth building

Every published waiver table gives one FAAB range per player — `0-15%`, `0-8%`,
`0-5%`. It has to, because it is written for everybody. But the whole point of a
FAAB bid is that it depends on your roster:

- A free tight end who would start for you immediately is worth real money.
- The same tight end, when you already roster two better ones, is worth nothing.

A generic range cannot say that, and a table published to thousands of readers
structurally never can. UFD already computes the missing half.

## What already exists

`buildWeeklyBoard` computes, for every free agent:

- `startsForYou` — whether he enters your optimal lineup at all
- `gain` — the true marginal points he adds, from re-solving your lineup with him in
  and the drop out (added when the streamer card was reporting the gap to a bench
  scrub instead)
- `replacesName` — the starter he displaces

That is the hard part and it is done. This feature turns `gain` into a bid.

## The model

A FAAB budget is spent over a season, so a bid is a claim on a share of the remaining
budget. Two inputs:

1. **What he adds** — `gain`, points per week added to the starting lineup.
2. **For how long** — weeks left in the fantasy season.

    seasonValue = gain × weeksRemaining

Expressed as a share of a typical league's total remaining scoring, then scaled to the
budget. The exact curve needs fitting; the shape does not:

- `gain <= 0` → **bid 0**. He does not crack your lineup. Say so plainly rather than
  printing a small number, which reads as "a little bit worth it".
- small gain, many weeks → a modest bid
- large gain, many weeks → the aggressive bid, and the one worth naming

## What it must say

Not a bare percentage. The number and the reason, in the shape the rest of the product
uses:

> **Bid up to 12%** — he would start over Kyle Pitts and add 4.1 a week.
> **Bid 0%** — he would not crack your lineup.

The second is as valuable as the first and no published table will ever print it.

## Honest limits, to be stated in the UI

- **A bid is not a price.** It is what he is worth to you; what he costs depends on
  eleven other managers. The copy should say "up to", never "bid this".
- **`gain` is one week's projection.** A player whose role just changed is worth more
  than one week of numbers implies, and the model does not know that yet.
- **Not all leagues use FAAB.** Rolling waivers need a priority recommendation
  instead, which is a different feature; show nothing rather than a percentage that
  does not apply.

## Where it lives

The Wire, on the streamer rows that already carry `startsForYou` and `gain`. No new
data source, no new fetch.

## Not in scope

- Modelling what rivals will bid. That needs league bidding history we do not have,
  and guessing it would turn a defensible number into a fabricated one.
- Multi-week planning. A bid is a decision about now.
