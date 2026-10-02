# Hockey usable games: the Wire, the Monday card and the daily post

Date: 2026-10-01 · Status: design approved in chat, awaiting spec review

## Why

A game a streamer plays is only worth something if the manager has an open lineup spot for
him that night. On a 3-game night nearly every lineup has room; on a 13-game Saturday most
don't. Counting raw games ignores this.

**Measured on 2025-26** (all 1,312 games, a simulated 12-team league with C2 LW2 RW2 D4
UTIL1, one weekly streamer per manager, 8 seeds). Points banked per manager-week:

- **Picking by raw games:** 6.40.
- **Usable games, league-average:** +1.9 (95% interval +1.1 to +2.6).
- **Usable games, personal:** +2.9 (+2.2 to +3.5). Better in about 66% of manager-weeks.
- **Opponent-defence factor:** made picks worse (-0.35). **Excluded.**
- **Open-spot share:** about 0.99 on light nights (4 or fewer games), 0.84 mid, 0.28 heavy
  (11 or more).
- **By position on heavy nights:** about 0.17 for C/LW/RW versus **0.59 for D** (4 D slots
  plus UTIL).

The idea was prompted by a competitor's chart. **Nothing is borrowed from it:** not its name,
its look or its method. Our term is **"usable games"**. Ours differs in four ways: it's
personal to the user's roster, it's measured, it's position-specific, and it's in points.

## Decisions (made in chat)

- **Name:** "usable games", used everywhere (Wire, Monday card, daily post).
- **Score:** night usability only. No opponent factor.
- **Wire layout C:** a "Your open spots this week" panel on top, plus a 7-dot strip on every
  row.
- **Monday card layout A:** a week strip, showing the best 6 and worst 4 teams.
- **Order of work:** score module, then the Monday card, then the Wire.

## Design

### 1. Score module: `src/hockey/usableGames.ts` (pure, no I/O)

```ts
type Pos = 'C' | 'LW' | 'RW' | 'D'
interface Night { date: string; teams: Set<string> }                 // teams playing that night
interface RosterPlayer { key: string; team: string; positions: Pos[]; rate: number }
interface Slots { C: number; LW: number; RW: number; D: number; UTIL: number }

/** Open-spot indicator per night/position for one roster: fill by rate, highest first. */
openNights(roster: RosterPlayer[], slots: Slots, nights: Night[]): Record<string, Record<Pos, 0 | 1>>

/** League-average share (0..1) per night/position across several rosters. */
openShare(rosters: RosterPlayer[][], slots: Slots, nights: Night[]): Record<string, Record<Pos, number>>

/** A player's usable games and points this week from either of the above. */
usableFor(player: { team: string; positions: Pos[]; rate: number }, nights: Night[],
          open: Record<string, Record<Pos, number>>): { games: number; usable: number; points: number }
```

**Rules:**
- **Filling a night:** players with a game are placed into their position slots, best rate
  first. Overflow goes to UTIL, then to the bench.
- **When a player counts as open:** a multi-position player counts as open if any of his
  positions, or UTIL, has room.
- **Goalies are out of scope.**
- **Points:** `points = rate × usable`. For category leagues the caller shows `usable` beside
  its existing category value and ignores `points`.

### 2. The Wire (points: `PointsWireView`; categories: `HockeyWireView` / `useHockeyWire`)

**Data:**
- The week's nights come from the existing NHL schedule service.
- The user's roster, slots and per-game rates come from the sources each Wire already uses
  (the merged projection source).
- `open = openNights(myRoster, mySlots, weekNights)`.

**Top panel, "Your open spots this week":**
- Seven night cells, each marked F and/or D when that kind of spot is open.
- Below them, the 5 best free agents by `points`, or by `usable` in category leagues.
- Each pick shows a drop and its net gain when the roster is full, using the existing
  add/drop delta.

**Every row:**
- A 7-dot strip: bright = usable for you, dashed = he plays but you're full, blank = no game.
- Text such as "2.0 of 3".
- A new sort, "This week (usable)".

**Access:** follows the Wire's existing gating. No new paywall.

**Edge cases:**
- **No league roster** (spectator): skip the panel and show the strip with league-average
  shading.
- **Off-season or schedule fetch failure:** hide both. Never fabricate open nights.

### 3. Monday card: `ufd-graphics/hockey-schedule.py` (layout A)

**Reference league:** 12 teams with the app's default slots, drafted from our current hockey
board. `openShare` is computed for the week.

**Content:**
- Teams are ranked by forward usable games.
- Best 6 and worst 4 rows, each with team, a dot per game shaded by that night's forward
  share, and usable games (e.g. "3.6").

**Footer note:**
- "Defense stays usable on busy nights: X% vs Y%", from that week's numbers.
- Plus the site URL.

**Style:** our own (dark background, hockey #4FC3F7 dots, lime pill, Inter and JetBrains
Mono), built with `ufd_card.py`. Output goes to `ufd-graphics/hockey/`.

### 4. Daily light-night post (`hockey-streamers.py` and its copy)

The format stays the same. Add one line using the shared term: "On a N-game night nearly
every lineup has an open spot, so tonight's games are fully usable." The post only runs on 4
games or fewer, so the line is always true.

## Testing

**`usableGames.test.ts`:**
- A 3-game night is fully open for a typical roster.
- A night when every rostered player plays has no open forward slot.
- D stays open where F does not (4 D slots plus UTIL).
- A multi-position player is open if any position or UTIL is.
- Points = rate × usable.
- `openShare` averages correctly.

**Wire:** a test that the panel ranks by `points` (points leagues) or by `usable` (category
leagues), and that a roster with no open nights returns no picks.

**Manual:** the Wire checked locally in the user's own hockey leagues. The card rendered on
the real current week and the numbers spot-checked.

## Out of scope

- The two-team "stream plan" (version 2).
- Goalies.
- Opponent strength (measured and rejected).
- Football and baseball.
