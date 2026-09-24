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
| **Weekly lineup** | football today | hockey/basketball weekly leagues | — |
| **Daily lineup** | daily points leagues | hockey/basketball/baseball daily | season-long, no opponent |

Six live combinations. The product currently serves one of them well.

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
2. **Daily page for categories** — the most-used page for a hockey manager, and the closest to
   existing (`src/today/` plus the category value maths).
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
- **No projection feed for hockey is identified.** Football has Sleeper. The category maths
  exists but what feeds it for NHL is not established in this document and needs answering
  before piece 2.

## Open questions

1. Which platform is hockey on for the first real test — Yahoo, ESPN, or Sleeper?
2. Does any platform expose lineup cadence readably? Needs a probe against a live league.
3. What feeds NHL projections?
4. Is the first hockey league daily or weekly? It decides whether piece 2 or piece 3 comes first.
