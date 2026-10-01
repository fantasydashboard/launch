# Weekly rankings: Sleeper + published analyst blend (football)

Date: 2026-10-01 · Status: design approved in chat, awaiting spec review

## Why

The football weekly board (`/this-week`) ranks players by Sleeper's weekly projection, with
a 65% cut for Questionable players and an implied-total adjustment for QBs. Four seasons of
backtest (2022-25) found no box-score signal that improves Sleeper's weekly order, and the
raw order reads badly to users (Harold Fannin TE3, Garrett Wilson WR3 in week 4).

The social cards (`ufd-graphics/position-tiers.py`) now rank by a 50/50 blend of Sleeper and
an analyst's weekly list. The site should rank the same way, so a reader who follows a post to
the site sees the same order.

## What the user asked for (decided in chat)

1. The board ranks by the blend, and Questionable players are ranked **as if they play**,
   with a Q tag. Lineup advice still applies the injury cut.
2. The admin uploads the analyst file once a week in the app, and it applies to every user.
3. A list applies only in the NFL week it is for. Until one is published for the current week
   the board uses Sleeper alone. The earliest a list is published is Tuesday.
4. Football only. Hockey, the draft room and `/rankings` are unchanged.
5. The board labels the source "UFD weekly rankings" and does not name the analyst. (This was
   the default offered; the user approved the design without choosing, so change it if they
   later ask.)

## Design

### 1. Storage: `weekly_rankings` table

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| sport | text | `'football'` |
| season | int | NFL season, e.g. 2026 |
| week | int | 1-18 |
| source_name | text | the uploaded file name, e.g. `all-8.csv` (admin-facing only) |
| body | text | the CSV exactly as uploaded |
| published_by | uuid | `auth.uid()` |
| published_at | timestamptz | default `now()` |

- Unique on `(sport, season, week)`. Publishing again for a week **upserts** (replaces it).
- RLS: `select` for `anon` and `authenticated`. `insert`/`update` only where
  `profiles.subscription_tier = 'admin'` for `auth.uid()`, the same check as
  `20260901_betting_odds.sql`. No `delete` policy.
- Additive only: no triggers, and no change to any existing table. The database is shared
  with TLB (see the signup-trigger incident), so the SQL is shown to the user before it is
  applied.
- Known exposure: anything readable with the anon key can be fetched, so the raw analyst list
  is retrievable by a technical user. Accepted by the user.

### 2. Publishing (admin, `/this-week`)

- The admin-only `RankingPicker kind="week"` on `WeeklyView.vue` becomes a **Publish weekly
  rankings** control: choose a file, preview, publish.
- **The week is detected from the file, not entered by hand.** The wide sheet carries an
  Opponent column per position. Each team/opponent pair is compared with
  `sleeperService.getNflSchedule(season, w)` for every week, and the week with the most
  matching pairs wins, provided at least 80% of the file's pairs match it. Otherwise the
  publish is refused with "This file doesn't match any week's schedule".
- After publishing, the control shows "Week N · all-8.csv · published Tue 9:02a".
- The browser-only `week` list is retired for football. A stored local `week` set is ignored
  on football boards, so two sources can't disagree.

### 3. Reading

- `useWeeklyBoard` fetches the row for `('football', season, leagueStore.currentWeek)` once
  per (season, week).
- **Row present:** parse it with the existing `splitWideRankings` + `matchRankings`, apply the
  blend (section 4), and **skip** `adjustQbForEnvironment`. That adjustment was fitted to agree
  with this same analyst, so applying it on top of the blend would count him twice.
- **Row absent, or the fetch fails:** current behaviour exactly, with Sleeper alone and the QB
  environment adjustment on. A failed fetch must never blank the board.
- The source label reads "UFD weekly rankings" when a row is present and "UFD" otherwise
  (`weekSource`).

### 4. The blend: `src/football/weeklyBlend.ts` (pure)

```ts
blendWithAnalyst(
  entries: { playerKey: string; value: number; position: string }[],
  rankByKey: Record<string, number>,      // analyst rank within the player's position
): Record<string, number>
```

Within each position: `ladder` = that position's values sorted descending. For each player:
`mapped = ladder[min(rank ?? lastRank + 1, ladder.length) - 1]`, where `lastRank` is that
position's deepest analyst rank, and the result is `(value + mapped) / 2`. A position the list
says nothing about is returned unchanged. This is identical to `blend_with_baseline` in
`ufd-graphics/position-tiers.py`; the two must stay in step.

It replaces the `applyRankingOrder` call in `useWeeklyBoard.effectiveVor`.
`applyRankingOrder` itself is untouched, because the draft room uses it.

### 5. Two numbers per player (`weeklyBoard.ts`)

- **Ranking value** = the blend, NO injury factor. It drives `posRank`, `flexRank`, list order,
  tiers and the displayed number.
- **Lineup value** = ranking value × `WEEKLY_INJURY_DISCOUNT` (Q 0.65, D 0.25; Out = 0). It
  drives `assignSlots` (the optimal lineup), close calls, streamers and the `beatsDrop` test.
- Today `week(key)` serves both. Split it into `rankPts(key)` and `lineupPts(key)`. Banked
  (already played) points remain actual points in both.
- UI: rows show the Q/D tag next to the rank ("QB2 · Q"). Where the optimiser benches a tagged
  player whom the ranking value would have started, the lineup row says so ("Benched: Q, cut
  to 65%").

### 6. Expected differences from the cards

The site scores each league with its own settings; the cards use half PPR. Ranks match the
posts closely but can swap neighbours in full-PPR or unusual-scoring leagues. This is
accepted, not a bug.

## Testing

- `weeklyBlend.test.ts`: ladder mapping, an unranked player placed one slot past the last
  rank, a position absent from the list left unchanged, a list deeper than the pool, ties.
- Week detection: the week-4 file matches week 4; a wrong-week file is refused; a partial file
  (QB/RB only) still detects.
- `weeklyBoard.test.ts`: a Q player ranks on the undiscounted value but the optimiser uses the
  discounted one; with no list, results are byte-identical to today.
- Manual: the user checks `/this-week` locally on their own leagues before any deploy
  (standing rule). Check that every new Vue import resolves at runtime, because the build does
  not catch missing imports.

## Out of scope

Hockey and the other sports; `/rankings` (rest of season); the draft room; the WR/TE fade
signal (separate idea); rendering the analyst's own tiers (the board keeps drawing tiers on
the blended points).
