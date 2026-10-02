# Hockey baseline blend: our rates averaged with 5v5 Hockey's

Date: 2026-10-02 · Status: approach approved in chat ("yes move forward"), awaiting spec review

## Why

Football's weekly board now averages Sleeper with an analyst list so it can't drift too far
from consensus. Hockey should do the same for rest-of-season values.

- **Source:** 5v5 Hockey's free ROS projections, the tables DailyFaceoff embeds.
- **Terms:** the user checked them, and it's a free tool. Our ROS rankings are free too.

**Measured on 2026-10-02:** their per-game rates × our games, scored with our weights and
categories, ranked within position. Average rank gap:

- **Skaters, each position's top 10:** 1.7–2.8.
- **Skaters, 21–30:** 7–14.
- **Goalies:** 12–15, almost all on starts.

Players we're far higher on include Fiala, Marchand, Tsyplakov, Sanderson, McAvoy and Matthew
Tkachuk. They're far higher on Raddysh, Hyman, Crouse, Stamkos and Zibanejad.

## Their data, and the rules it forces

**Where it lives:**
- `https://5v5hockey.com/ros-projections-embedded/` embeds `const tableData = [...]` (611
  skaters).
- `.../goalie-ros-projections-embedded/` does the same for 93 goalies.
- Every row carries `player_nhl_id`, so it joins our rates **exactly** by NHL id, with no name
  matching.

**Rules:**
1. **Use per-game rates, never totals.** The `*_ros` columns zero out 70 skaters (Larkin,
   Marchand, McAvoy, Sanderson and others) and give everyone else a flat 84 games, so there is
   no injury or games model. The `*_season_proj` columns are complete. Rate = season_proj ÷ 84.
2. **Keep OUR games played.** Their side has no availability model.
3. **Goalies: blend quality, keep OUR starts.** Their starts look templated (about 76–77 for
   a starter, 21–23 for a backup, Vasilevskiy at 0). Blend save %, wins per start and
   shutouts per start. Keep our starts and shots against.
4. **Skip rows with no signal.** A skater whose season_proj stat columns are all 0 keeps our
   rate.

## Design

### 1. Server: `api/hockey-baseline.js`

- Fetches both 5v5 pages and extracts `tableData`. Returns compact JSON:
  ```json
  { "fetchedAt": "ISO",
    "skaters": [{ "playerId": 8477492, "name": "Nathan MacKinnon",
                  "perGame": { "goals": 0.53, "assists": 0.76, "plusMinus": 0.43, "penaltyMinutes": 0.48,
                               "ppPoints": 0.29, "shots": 3.84, "hits": 0.86, "blockedShots": 0.55 } }],
    "goalies": [{ "playerId": 8476883, "name": "Andrei Vasilevskiy",
                  "savePct": 0.907, "winsPerStart": 0.55, "shutoutsPerStart": 0.06 }] }
  ```
- `Cache-Control: s-maxage=86400, stale-while-revalidate=86400`, so the site makes at most one
  pull per day.
- **On failure** (non-200, no `tableData`, or fewer than 300 skaters): respond 502. The client
  then blends nothing, and a broken pull never reaches a board.
- **Test:** `api/__tests__/hockey-baseline.test.js` checks extraction against a saved HTML
  fixture.

### 2. Pure blend: `src/hockey/baselineBlend.ts`

```ts
export interface BaselineSkater { playerId: number; name: string; perGame: Record<string, number> }
export interface BaselineGoalie { playerId: number; name: string; savePct: number; winsPerStart: number; shutoutsPerStart: number }
export interface Baseline { fetchedAt: string; skaters: BaselineSkater[]; goalies: BaselineGoalie[] }
export const BASELINE_WEIGHT = 0.5

blendSkaterRates(rates: SkaterRate[], baseline: Baseline, w = BASELINE_WEIGHT): { rates: SkaterRate[]; matched: number }
blendGoalieProjections(goalies: GoalieProjection[], baseline: Baseline, w = BASELINE_WEIGHT): { goalies: GoalieProjection[]; matched: number }
```

**Skaters**, for each matched `playerId`:
- For each category the baseline carries (goals, assists, plusMinus, penaltyMinutes,
  ppPoints, shots, hits, blockedShots): `perGame[c] = (1−w)·ours + w·theirs`.
- **Keep the internal splits consistent:**
  - `points = goals + assists`.
  - `ppGoals` keeps our ppGoals/ppPoints ratio, applied to the blended ppPoints.
  - `shGoals` and `shPoints` stay ours (no baseline column).
- Unmatched players and unknown categories are unchanged. `gamesPlayed`, `confidence` and
  `ppSecondsPerGame` are unchanged.

**Goalies**, for each matched `playerId`:
- Blend `savePct`, `wins/starts` and `shutouts/starts`.
- Keep `starts` and `shotsAgainst`.
- Recompute the rest: `wins = starts·winRate`, `shutouts = starts·soRate`,
  `saves = shotsAgainst·savePct`, `goalsAgainst = shotsAgainst − saves`.

The function is pure and does not mutate its inputs.

### 3. Wiring: `src/composables/useNhlFeed.ts`

- After `rates` and `goalieProjections` are built, fetch `/api/hockey-baseline`. On success,
  replace both with the blended versions.
- On failure, leave them unchanged and log a warning. Never block the feed.
- `NhlFeed` gains `baseline?: { fetchedAt: string; skatersMatched: number; goaliesMatched: number }`.

**Every surface reads `mergeFeed(feed)`,** so every surface gets the blend:

- Rankings
- Wire (both hockey Wires)
- Today
- My Team
- Draft board
- the usable-games feature

### 4. Graphics parity

The cards' board export (`scripts/hockey-board-export.ts`) builds from the same feed via
`BASE`. Once deployed, the cards blend automatically, exactly like the site. Until then, they
show the unblended board. A card made before the deploy says so in its run notes.

## Out of scope

- An admin "Blend / UFD only / 5v5 only" compare toggle. Possible later, mirroring football.
- Snapshots for a later accuracy check.
- A daily goalie starter feed (DFO `/starting-goalies`). That is DFO's own reporting and needs
  its own decision.
- Changing the weight from 0.5.

## Testing

- **`baselineBlend.test.ts`:**
  - Blended per-game values equal the average.
  - `points = goals + assists`.
  - ppGoals keeps our ratio.
  - Unmatched and unknown categories are untouched.
  - The goalie recompute is internally consistent (`saves + GA = SA`; starts unchanged).
  - Inputs are not mutated.
- **API extraction test** against a fixture, plus the failure cases:
  - no `tableData` returns 502;
  - fewer than 300 skaters returns 502;
  - all-zero rows are skipped.
- **Feed test:** a failed baseline fetch leaves rates byte-identical.
- **Manual, after the change:**
  - Rerun the 10/02 gap report. Skater gaps at 21–30 should roughly halve, and the top 10 shouldn't move much.
  - The user checks /hockeyrankings locally.
