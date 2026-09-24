# League shape: cadence and scoring as first-class facts

Design, 2026-09-23. Covers hockey, basketball and baseball reaching the structure football has.

## The mistake in the current architecture

`App.vue:1364` decides the first tab like this:

```ts
leagueStore.activeSport === 'football' ? 'This Week' : 'Today'
```

Sport decides cadence. That is wrong, and it is wrong in both directions: a hockey league with a
weekly lineup lock gets a daily optimiser it cannot act on, and a daily-transaction football
league — they exist — would get a weekly page.

**Cadence is a league setting.** So is scoring. They are independent, and the product has been
treating one sport as a proxy for both.

Two axes, not one:

|  | **Points** | **Categories (H2H)** | **Roto** |
|---|---|---|---|
| **Weekly lineup** | football · NHL/NBA/MLB | NHL/NBA/MLB | — |
| **Daily lineup** | NHL/NBA/MLB | NHL/NBA/MLB | NHL/NBA/MLB — no opponent |

**Football is points and weekly, always.** It is the only sport with a fixed shape, because the
sport itself has one game a week. Hockey, basketball and baseball can each be any scoring type
AND either cadence — all six cells, per league.

So sport tells you almost nothing about shape. It tells you which player universe and schedule
to load, and that is all. The product currently serves one cell well.

## What already exists

Worth saying plainly, because the gap is much smaller than the surface area suggests:

- **Category value and marginal maths** — `hockeyCategoryValue.ts`, `categoryMarginal.ts`,
  `categoryLedger.ts`, `useDailyCategoryValue.ts`, `useCategoryStrength.ts`.
- **A daily optimiser** — `src/today/` (`todayBoard`, `scoreToday`, `openSlots`, `safeDrop`,
  `addBudget`), plus `useDailyLineup` and `useDailyMatchup`.
- **Category standings and ECW** — `CategoryStandingsTable`, the expected-cats-won trade engine.
- **Hockey draft** — board, plan, VONA, sync, manual rules.
- **Full-season category data** — `useFullSeasonCategoryData`.

What does **not** exist is the connective tissue: nothing reads lineup cadence from any
platform, nothing renders a weekly *category* matchup, and Rankings is points-only.

## The rule

One resolver, `leagueShape(league)` → `{ cadence: 'daily' | 'weekly', scoring: 'points' |
'categories' | 'roto' }`, read from the platform's settings and overridable by hand. Every page
branches on THAT, never on sport.

Detection is the unknown. ESPN carries a lineup-lock type in roster settings; Yahoo has an edit
key and a weekly deadline; Sleeper's hockey leagues are new to us. **Nothing in this codebase
reads any of them today**, so all three need probing against a real league before the resolver
can be trusted — and until it is, the hand override is the product, not a fallback.

This is the same lesson as league scoring earlier today: a shape resolver that guesses wrong
produces a page that is confidently, invisibly about the wrong game. So `leagueShape` returns
its **source** — `'detected' | 'manual' | 'default'` — and the page says which.

## The pages, by shape

**First tab — "This Week" (weekly) or "Today" (daily).** Same page, two horizons.

- *Weekly + points* — what football has now, unchanged.
- *Weekly + categories* — the head-to-head, but **spot by spot becomes category by category**.
  Instead of QB vs QB, it is goals vs goals, assists vs assists: which cats you are winning,
  which are close enough to flip, and which are gone. That framing is the whole difference and
  it is what makes a category matchup readable.
- *Daily (either)* — today's slate: your current category or point totals, your optimal lineup
  for tonight, and the projections for players in action, with your opponent's active players
  marked. The decision is "who do I start tonight and is there a streamer worth an add", which
  is a different question from the weekly one and needs its own page even though it shares
  components.
- *Roto* — no opponent. The page becomes standings movement: which categories you can still
  gain a place in, and what it would take.

**Draft Central** — the hockey/basketball equivalent of Draft Room, and it disappears once the
draft is done, using the rule already built (`showsDraftTab`) generalised past Sleeper football.

**Rankings** — the same page football just got, fitted to shape. For categories the unit is not
points above replacement but **contribution across the categories your league counts**, scored
by your settings. Tiers still mean interchangeable.

**The Wire** — for categories, "best available" is not a single number. The recommendation has
to name *which category* a pickup helps, because a league leading goals and last in saves wants
a goalie, not the highest-rated skater. This is where the design work is.

**Trades** — ECW already does this for categories, and is arguably ahead of the points version.

**League / History** — largely shape-agnostic already.

## Decomposition

This is a program, not a plan. Four pieces, each shippable:

1. **`leagueShape`** — the resolver, detection per platform, the manual override, and the nav
   reading it instead of sport. Nothing else moves until this is right.
2. **Daily page for categories** — chosen as the first surface. The most-used page for a hockey
   manager and the closest to what exists (`src/today/` plus the category value maths). Needs
   the NHL feed above before it is worth anything.
3. **Weekly category matchup** — category-by-category head-to-head.
4. **Rankings and the Wire for categories** — the per-category contribution model.

## Honest scheduling

Hockey drafts are this week and the season starts shortly after. **Piece 1 alone is a real
build** — three platforms to probe, a resolver, an override UI, and the nav rework — and
pieces 2 and 3 each rival the football work that took today.

All four before hockey starts is not credible. Piece 1 plus piece 2 gets a hockey manager in a
*daily* league a working product; a weekly category league would keep the current daily page,
which is wrong for them but not broken. That is the honest cut.

## Risks

- **Detection is unproven on every platform.** If none of the three expose cadence readably, the
  manual override becomes the only path and onboarding grows a required question.
- **"Categories" is not one thing.** H2H-each-category, H2H-most-categories and roto score
  differently, and the matchup page differs for each. This design treats them as one; that will
  not survive contact.
- **Goalie starts are unsolved and unsolvable by modelling.** See below. The largest daily
  decision in the sport depends on a scrape nobody has written.
- **A rate model needs a season to rate.** In October there is no recent sample, so opening
  weeks lean on the ESPN prior — exactly when a new hockey user is forming their opinion of
  whether this product is any good.

## The projection feed: not ESPN, and not really a projection

Probed 2026-09-23. The first version of this section recommended ESPN. That was wrong, and the
reason it was wrong is worth keeping.

**The football model does not transfer.** In football you project a week ahead because there is
one game and the lineup locks on Sunday — a forecast is the only instrument available. In daily
hockey the question is "who plays tonight, and who is producing right now", and a rate model
built from recent real output beats anybody's preseason projection.

This product already learned that lesson once. `rosBlend` exists because Sleeper's season
projection does not converge — the same number in week fourteen as in week one — so a board
built on it alone cannot learn. On a one-night horizon that failure is far worse.

So the feed is not a projection service. It is four layers:

| Layer | Source | Status |
|---|---|---|
| Who plays tonight | NHL official API (`api-web.nhle.com/v1/schedule/<date>`) | Verified: free, no auth |
| Production rate | NHL API player landing + MoneyPuck season CSV | Verified: 4,702 skaters, 154 columns |
| Opportunity — ice time, PP time | MoneyPuck | Verified in the same CSV |
| Prior for no-sample players | ESPN `fhl` leaguedefaults | Verified; used ONLY where we have nothing |

ESPN survives as the fallback for a rookie or a player returning from injury, where there is no
recent sample to rate. Everywhere else it is outranked by what the player has actually done.

This also removes the single-point-of-failure the earlier version introduced: the NHL's own API
is the authority for who is playing, and no fantasy platform sits between us and it.

### The part no feed solves: confirmed goalie starters

The largest single daily decision in fantasy hockey is which goalie to start, and it is decided
by a coach's morning skate, not by a model. Start a goalie who sits and you take a zero; guess
the backup correctly and you win the night. No free API publishes confirmed starters — Daily
Faceoff is the de facto source and reading it means scraping.

This is named here because a daily hockey product that silently ignores it is not a serious one,
and because no amount of projection quality substitutes for it. It should be scoped as its own
problem rather than assumed away inside piece 2.

### Licensing, unverified

MoneyPuck's data is free to download. Whether it is free to use inside a paid product is a
different question and has NOT been checked. Do that before building on it; the NHL API and
ESPN paths do not depend on the answer.

## Open questions

1. Does any platform expose lineup cadence readably? The owner's position is that it should.
   Needs a probe against live leagues on all three before the resolver can trust it.
2. Is MoneyPuck licensed for use in a paid product?
3. "Categories" is three different games — H2H each category, H2H most categories, and roto.
   Which does the first build target?
4. Goalie starts: scrape Daily Faceoff, ask the user, or ship without and say so?
