# A rankings page, and a narrower Wire

Design, 2026-09-23.

## The problem

The Wire carries two levers. Its own — the waiver call, which is what it is for and what the
Season Pass sells — and a league-wide rest-of-season board, which is a reference work that
happens to live there. That is why the page runs long enough to need a depth limit and an
expand button.

It also breaks a rule this product already set: each user page owns ONE lever. Trades own the
deal, This Week owns the week, The Wire owns the claim.

## The dividing line is actionability, not subject matter

This is the whole design, and it is what makes the split principled rather than cosmetic.

- **The Wire** — players you can act on **today**: yours, to drop, and free agents, to add.
  Every row is a possible transaction.
- **Rankings** — what is **true**, whether or not you can do anything about it. Including
  players rostered by other managers, which is exactly what makes it a reference rather than a
  transaction tool, and exactly what makes it useful when evaluating a trade.

A board containing players you cannot add is doing a different job by definition.

## What each page owns afterwards

**Rankings (new).** Every player, ranked in the active league's scoring, tiered, yours
highlighted. Filter by position. That is all it does.

**The Wire (narrowed).** Best upgrades, the waiver board (whose role changed), best available,
and drop candidates. The full board leaves. What remains is one question asked four ways.

## Free and paid, written down so it cannot drift

This is a PRICE CHANGE, not a reorganisation: the Wire's board is Season Pass today. Recorded
plainly so nobody later mistakes it for tidying.

| Free | Season Pass |
|---|---|
| Every player ranked, in your league's scoring | **Availability** — the FREE / ROSTERED badges |
| Tier breaks, and the size of each drop | What an add costs you, and who to drop for it |
| **Rest of season** | **This week's** projections and the start/sit call |

The reasoning: a bare ranked list tells you who is good. It does not tell you who you can HAVE,
what it costs, or who to cut — and that is the entire waiver call. Strip ownership out of the
board and it stops being a transaction tool, which is what makes it safe to give away.

The rest-of-season / this-week boundary is the other half. Season-long ranks inform holds and
trades; they do not set a Sunday lineup, which needs weekly projections and stays behind the
pass.

**Rankings are also a commodity.** Every competitor publishes them, so little is protected by
hiding them — while today every social post we publish drives to a page that asks people to
sign up before showing them anything.

## Two audiences, one page

**Public, no account.** Default scoring (half-PPR), the full board, tiers drawn. This is where
the tier cards, the rest-of-season top ten and the movers cards should point. It is the landing
page the content currently does not have.

**Signed in with a league.** The same board, rescoped to that league's scoring, with the user's
roster highlighted. Still free.

The gap between those two is the conversion argument: the public board is useful, the signed-in
one is *yours*. Nothing is taken away to create that gap.

## Build notes

- The board itself already exists — `buildFootballWire` produces `board.ALL` and the
  per-position columns, tiered by `indifferenceTiers`. The rankings page should EXTRACT that
  rendering rather than reimplement it, or the two will disagree within a month.
- It needs `useFootballVor` but none of `useFootballWire`'s upgrades / thisWeek / waiver
  machinery. Worth checking whether the VOR composable can be used alone before adding a route.
- Public mode needs a league-less path: default slots and scoring, no roster highlighting. That
  is new — every existing board path assumes an active league.
- Kickers and defences stay out of the overall list, as they now are on the Wire.

## Risks

- **Cannibalisation.** A good enough free board erodes the pass: somebody who can see every
  player ranked in their scoring can work out most of their own lineup. The weekly tier cards
  already give away the top ten per position, so some of this has happened regardless. The bet
  is that ranks are commodity and the DECISION is the product. It is a bet, not a certainty,
  and it should be reviewed against conversion after a month rather than assumed.
- **Nav reaches seven items.** Whether Rankings earns a top-level slot is a separate question
  from whether the page should exist.
- **Overlap with the Draft Room board**, which is also a ranking board. Check whether this is a
  new surface or a seasonal reframing of one that exists.
- **An IA restructure was rejected here before**, on My Team, for favouring systematisation over
  substance. The test for this one is not "is it tidier" — it is whether the Wire gets BETTER
  for losing the board. It should: what remains is four blocks answering one question.

## Open questions

1. Does Rankings get a nav slot, or sit under something?
2. Public board default scoring: half-PPR or full PPR? The social cards are half-PPR for
   rest-of-season and full PPR for weekly, which is already inconsistent and should not be
   inherited without a decision.
3. Does the public page cover all four sports at launch, or football first?
