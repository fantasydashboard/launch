# Your league's scoring, and a Rankings page that knows who you are

Design, 2026-09-23. Follows [the rankings page split](2026-09-23-rankings-page-design.md),
which shipped `/rankings` as a public board and left it there.

## The thing nobody noticed

`useFootballVor.ts:93` reads:

```ts
const scoring = defaultWeights('football')
```

Full PPR, for every league, on every surface. The Wire's board, the Trades engine, the Draft
Room's values. A manager in a standard or half-PPR league has been reading numbers computed for
somebody else's league all season, and nothing on the page says so.

The Draft Room is the tell: it computes `effectiveScoring` from the league's real settings
(`useDraftRoom.ts:92`) and then does not pass it to the value engine two lines later. The
intent was there. The wire was never connected.

So this is not "move a feature onto the new page". The feature does not exist. Build it, then
put it on both pages.

## Part A — league scoring reaches the value engine

The smallest correct change, and the only one that fixes surfaces already in front of users.

`useFootballVor` takes an optional `scoring` ref, defaulting to today's behaviour so no caller
changes by accident. A resolver turns a league into weights:

- **Sleeper** — `league.scoring_settings` passes straight through. Our `statKeys` in
  `config/sports/football.ts:203` ARE Sleeper's key names, necessarily: the projections we
  score come from Sleeper keyed that way.
- **ESPN** — `normalizeEspnWeights`, which exists and is called by nothing for football.
- **Yahoo** — `normalizeYahooWeights`, same.
- **Anything unreadable** — `defaultWeights('football')`, guarded by `weightsAreUsable`.

`calculatePoints` already merges `{ ...defaults, ...scoringSettings }`, so a partial settings
blob fills its gaps from the defaults rather than scoring those stats at zero. That merge is
load-bearing and must not be bypassed.

**This changes numbers people have been looking at.** In a standard league every receiver's
rest-of-season value drops by roughly a point a game times the games left, which re-orders
the board against running backs. That is the point — the old order was wrong — but it is a
visible change to a live product, and it lands on the Wire and Trades before anyone asks for it.

## Part B — Rankings learns who you are

One composable that picks a data path:

- **A football league is active** → the league-backed path. Real pool, real free agents, real
  slots and team count, real scoring, real `myTeamKey`. `buildRankingsBoard` already returns
  `owned`, `free` and `ownerName` on every row; the Wire populates them and `/rankings`
  currently throws them away.
- **No league** → today's public path, unchanged.

The shared `buildRankingsBoard` stays the single board implementation. Only its inputs differ.

## The line, written down

| | Anonymous | Free account + league | Season Pass |
|---|---|---|---|
| Ranked list, tiers, rest-of-season | ✅ | ✅ | ✅ |
| Scored for your league | standard 12-team | ✅ | ✅ |
| Your roster starred | — | ✅ | ✅ |
| FREE / ROSTERED, and who holds him | — | — | ✅ |
| What an add costs you | — | — | ✅ |
| Strength of schedule | — | — | ✅ |

The argument, in one line: **rankings are everywhere, decisions are not.** A hundred sites say
Bijan is RB4. None say "of these, here is who you can actually get and who you drop for him."

Personalisation is free because the signup is the harder ask, not the payment — a stranger who
cannot see their own team never becomes an account, and an account is what can be sold to
later. So free buys the right numbers; paying buys the move.

**The risk, stated rather than assumed:** a free account can see their whole board correctly
scored and work most of their lineup out of it. That is a real giveaway. Review it against
conversion in a month instead of declaring it settled now.

## Part C — the upsell shows, rather than tells

On a board where availability is locked, render the column **greyed** rather than omitting it.
A reader who can see a dimmed FREE/ROSTERED strip beside every row knows exactly what is
missing; a reader who sees nothing has to be told, and being told is weaker than seeing.

One line under it naming the three things: who's available, what an add costs, strength of
schedule. Nothing that blocks scrolling, nothing that covers rows.

## Build notes

- The scoring resolver is pure — league in, weights out — and must be tested per platform
  including the unreadable case. It is the highest-risk unit here: wrong weights produce
  numbers that look entirely plausible and are wrong, which is the failure mode this product
  has already been shipping all season.
- `useFootballVor` currently rebuilds on `[enabled, projPlayers, season]`. Adding scoring means
  adding it to that watch, or a league switch leaves stale values on screen.
- Kickers and defences stay off the overall board, as on the Wire.
- Strength of schedule already has a builder — `buildDifficulty` in `scheduleDifficulty.ts`,
  orphaned when the Wire's board moved. Part C is where it comes back rather than being deleted.

## Risks

- **Part A changes live numbers with no announcement.** Consider saying so in-product once.
- **A partial or odd scoring blob** (a league scoring something we do not model) silently falls
  back per-stat to the default. Correct, and invisible. `weightsAreUsable` is the guard; it
  needs to actually be applied rather than merely existing.
- **Cannibalisation**, carried forward from the previous spec and now larger, because the free
  board is scored correctly rather than generically.

## Sequencing

A ships alone, first. It is independently valuable, it fixes surfaces the user knows well, and
if the resolver is wrong it shows up on the Wire — where a wrong number is recognisable —
rather than on a page nobody has used yet. B and C follow together.
