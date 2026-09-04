# Betting Edge Beta

Admin-only board at `/admin/edge`. Not linked from the nav on purpose.

## Scope: Florida

Two places a Florida user can actually act, and they work completely differently.

**Hard Rock Bet** is the only licensed sportsbook in the state. It is carried by
The Odds API as `hardrockbet_fl` in the `us2` region, so we get this state's real
numbers. With one sportsbook there is no line shopping, so expect very few rows.
That is Florida, not a bug.

**Pick'em apps** are where the volume is. They post one number per player with a
fixed payout on a multi-pick entry, so they never compete on price and the only
question is whether the LINE is in the right place. Their lines are slower and
softer than a sportsbook's, which is exactly why the edge lives here.

Sleeper is the app Josh uses and it is the one gap. Sleeper's public API
documents fantasy endpoints only, with no picks, props or odds, and it states it
is free for non-commercial use with licensing to be discussed otherwise. No feed
under about five thousand a month carries Sleeper lines. So PrizePicks and
Underdog are pulled automatically as the pick'em market, and Sleeper lines get
typed into the board by hand and scored against the same anchor. The "how far
apart are the apps" panel exists to answer whether that stand-in is trustworthy:
if PrizePicks and Underdog keep agreeing within half a point, so will Sleeper.

## What it does and does not do

It reads sportsbook prices, removes the bookmaker margin from the sharpest books
available, and lists where a softer book is paying more than that fair price. It
does not predict outcomes, rate confidence, or make picks, and it should never be
extended to do so. The moment it makes a claim about who will win, it stops being
a math tool and becomes something with a very different legal and brand profile.

## Setup

1. Get a free key at the-odds-api.com (500 credits a month).
2. In Vercel, set `ODDS_API_KEY`. Server side only, never `VITE_` prefixed.
   Optionally set `CRON_SECRET` to lock the refresh endpoint.
3. Run the migration `supabase/migrations/20260901_betting_odds.sql`.
4. Set your own profile's `subscription_tier` to `admin` if it is not already.
5. Trigger a first pull: `POST /api/betting/refresh-odds` with your Supabase
   access token as a bearer, or wait for the daily cron at 15:00 UTC.

Until a key is set the page falls back to labelled sample data so the UI is
reviewable.

## The free tier is the whole design constraint

Player props cost one credit per market, per region, per event, and Florida needs
three regions: `us` for the anchor books, `us2` for Hard Rock, `us_dfs` for the
pick'em apps. So every market costs three credits per game.

Defaults are three markets on three games, which is 27 credits a run, on a
Thursday/Sunday/Monday cron. Roughly 350 a month, inside the 500-credit free tier
with room for manual refreshes. The `/events` discovery call is free, so the
slate is listed for nothing and credits go only to games actually being priced.
`ODDS_MONTHLY_CREDIT_BUDGET` (default 400) is a hard guard: the endpoint refuses
to fire and logs the refusal rather than silently draining the month.

Pinnacle would be a fourth region and is not worth it here, so the anchor is
BetOnline and LowVig. That is a real downgrade in reference-price quality and the
UI says so. First thing to fix on a paid tier, which at thirty dollars a month is
20,000 credits and makes all of this arithmetic go away.

## Layout

| Path | What it is |
|---|---|
| `src/services/betting/odds.ts` | Odds format conversions, overround, hold |
| `src/services/betting/devig.ts` | Multiplicative, additive, power, Shin, worst case |
| `src/services/betting/ev.ts` | Fair-value anchor, EV, Kelly, the screener |
| `src/services/betting/pickem.ts` | Line assessment, correlation, entry EV |
| `src/services/betting/picksBoard.ts` | Ranks pick'em lines against the market |
| `src/services/betting/constants.ts` | Which books are bettable in Florida |
| `src/services/betting/repository.ts` | Reads stored quotes and manual lines |
| `src/services/betting/sampleMarkets.ts` | Fixture slate for development |
| `src/services/__tests__/betting.test.ts` | Tests for the odds and EV engine |
| `src/services/__tests__/pickem.test.ts` | Tests for the pick'em engine |
| `api/betting/providers.js` | Provider adapters and normalization |
| `api/betting/refresh-odds.js` | Cron: fetch, budget guard, persist |
| `supabase/migrations/20260901_betting_odds.sql` | Tables, view, RLS |
| `src/views/BettingEdgeView.vue` | Best picks board and Hard Rock screener |

## Two things worth not undoing

**`odds_quotes` is append-only.** The line history is the input to closing line
value tracking, which is the only honest early measure of whether any of this
works. Nobody sells you back history you did not store. An `UPDATE` here throws
that away.

**`devigWorstCase` returns numbers that sum to less than one.** That is not a
bug and it must not be renormalized. Scaling the per-outcome minimums back up to
sum to one pushes them above the floor they were chosen to be, which was the
first version of this and made the conservative reading less conservative than
the individual methods. Being pessimistic about one side of a two-way market is
the same as being optimistic about the other, so no single normalized set can be
conservative on both. Edge rows are always about one outcome, so this is fine.

**The payout tables are placeholders.** `DEFAULT_STRUCTURES` in `pickem.ts` is
shaped after commonly published PrizePicks tables and is not verified against
Sleeper, whose multipliers are not published anywhere I could confirm. Every one
of these apps changes them. Read the real numbers off the app and replace that
constant before treating any entry EV as meaningful, because a payout table that
is quietly wrong produces output that is confidently wrong by the same amount.

**Correlation helps power plays.** This one is easy to get backwards. Legs from
the same game move together, which makes all-hit and all-miss both more likely
and thins out the middle. That is good for a power play, which needs everything
to land, and cuts both ways on a flex. Treating correlated legs as independent
understates a power play and overstates how safe a flex is. The one-factor
Gaussian copula in `correlatedDistribution` handles this, and it collapses to
plain independence at rho zero, which is what the test checks.

**`MARKET_CV` is guessed, not measured.** When the market only prices one number
for a player, reaching any other number needs an assumed spread, and those
coefficients are estimates. Anything derived from them is labelled `modeled` in
the UI so it can be told apart from a probability that came off a real price.
Once `odds_quotes` has a season of history, fit these to it and delete the guess.
