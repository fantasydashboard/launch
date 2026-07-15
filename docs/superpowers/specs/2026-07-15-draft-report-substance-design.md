# Draft Report — Substance Pass (beyond the ranking)

**Date:** 2026-07-15
**Branch:** `redesign/my-team-first` (local only — no push until user tests)
**Status:** Approved shape (user approved the 5-item list after a critique). Enhancement to the Phase-1 points Draft Report ([[draft-report-in-history]]).

## Problem

The shipped Draft Report is a leaderboard + two highlights + a personal grade. Its "Every team, graded" list reduces 11 of 12 teams to a bare letter with no evidence; the whole ~250-pick draft is compressed into one steal and one bust; the spotlight states facts with no narrative; and keepers are graded as draft picks (a kept star "drafted" late reads as a fake marquee steal). This makes it a scoreboard, not a report.

## Scope (all five, user-approved)

1. **Per-team "why"** — each team row carries its best pick + steal/bust counts.
2. **Top steals & top reaches** — top-3 of each across the league (not just one).
3. **Spotlight narrative** — a one-line synthesized read of your draft.
4. **Keeper exclusion** — keepers dropped from grading + highlights where the platform exposes the flag (ESPN, Sleeper); documented gap on Yahoo.
5. **Headshots** — player headshot + pro team on the three highlight surfaces (steal, bust, your best pick) and the top lists.

Deliberately **out of scope:** draft-slot luck analysis, full round-by-round matrix, positional grid — diminishing returns for a lore surface. Category-league parity is still the separate **Phase 2**.

## Data reality (drives the design)

- **Keeper flag:** ESPN `EspnDraftPick.keeper` (boolean); Sleeper raw pick `metadata.is_keeper` (string/bool, truthy = keeper). Yahoo `getDraftResults` does **not** expose it (only `pick/round/team_key/player_key`) — Yahoo keepers are NOT excludable without new service parsing; treat as best-effort (no exclusion, no note on Yahoo).
- **Headshot / pro team:** ESPN — headshot URL from `playerId` (the old view's pattern), `proTeam` from `pick.proTeam`. Yahoo — `getPlayers` map has `headshot` + `team`. Sleeper — pick `metadata.headshot_url`; MLB pro team may be absent (leave `proTeam` undefined).

## Architecture

Everything hangs off the existing unified `GradedDraft` → `buildDraftReport` → `HistoryView` pipeline. Keeper exclusion happens in the **loaders** (a keeper is not a draft pick, so it never enters the graded set — this keeps team grades, steal/bust, and lists all correct with one filter). Enrichment (counts, top lists, narrative) happens in the **reducer** (pure, tested). The view renders the new fields.

### Type changes (`src/draft/report/types.ts`)

- `GradedPick`: add `keeper?: boolean`, `headshot?: string`, `proTeam?: string`.
- `DraftHighlight`: add `headshot?: string`, `proTeam?: string`.
- `TeamGradeRow`: add `bestPick: DraftHighlight | null`, `steals: number`, `busts: number`.
- `GradedDraft`: add `keeperCount?: number` (for a "N keepers not graded" note; undefined/0 on Yahoo).
- `DraftReport`: add `topSteals: DraftHighlight[]`, `topReaches: DraftHighlight[]`, `keeperCount: number`; `mySpotlight` gains `narrative: string`.

### Loader changes (all three `load*PointsDraft.ts`)

- **Keeper filter:** before grading, partition out keeper picks (ESPN `pick.keeper`; Sleeper `pick.metadata?.is_keeper` truthy; Yahoo none). Grade + build `GradedPick[]` from **non-keeper** picks only. Set `GradedDraft.keeperCount = <excluded count>` (0 on Yahoo).
  - Team grades (`calculateTeamGrade`) therefore already exclude keepers — correct (a keeper isn't a draft decision).
- **Headshot/proTeam:** populate `headshot`/`proTeam` on each `GradedPick` from the platform's available source (see Data reality). Missing → leave undefined; the view degrades to the initial-avatar fallback already used elsewhere.

### Reducer changes (`buildDraftReport`)

- **Per-team enrichment:** for each `GradedTeam`, compute `bestPick` (its max-score pick → `DraftHighlight`), `steals` (verdict `JACKPOT`|`STEAL`), `busts` (verdict `BUST`|`DISASTER`). Attach to `TeamGradeRow`.
- **Top lists:** `topSteals` = the 3 highest-`score` picks with `score > 0`, desc; `topReaches` = the 3 lowest-`score` picks with `score < 0`, asc. Each a `DraftHighlight`. (Fewer than 3 → shorter list; none → empty.)
- **`keeperCount`** passed through from `GradedDraft`.
- **Narrative** (mySpotlight, deterministic + tested): from my non-keeper picks —
  - Let `mySteals` = my picks with verdict `JACKPOT`|`STEAL`, `myBust` = my min-score pick if its verdict is `BUST`|`DISASTER` (else null).
  - Compose: if `mySteals.length`: `"${n} steal${s}, led by ${topMySteal.playerName} (${topMySteal.valueLabel})."` then if `myBust`: `" Your biggest miss: ${myBust.playerName} (${myBust.valueLabel})."` If no steals but a bust: `"A quiet draft — your roughest pick was ${myBust...}."` If neither: `"A steady, no-drama draft."`
  - `DraftHighlight` already carries `valueLabel` (`Rd {round} · {tierMovement}`); reuse it.
- `steal`/`bust`/`bestDrafter`/`worstDrafter`/`mySpotlight.bestPick`/`worstPick` unchanged in logic; they now inherit headshot/proTeam via `DraftHighlight`.

### View changes (`HistoryView.vue` Draft Report section)

- **Headshots:** on the steal, bust, and your-best/worst-pick lines, render the player headshot (small round img, initial-avatar fallback) + pro-team logo where present, matching the app's player-row idiom.
- **Top steals / top reaches:** two compact lists (top 3 each) below the steal/bust hero pair — player + team + valueLabel + grade.
- **Per-team "why":** in the "Every team, graded" rows, add a muted sub-line: best pick + `↑N ↓M` steal/bust counts (kept compact; the letter grade stays the row's anchor).
- **Narrative:** show `mySpotlight.narrative` as the lead line of the "Your draft" card, above the grade/rank.
- **Keeper note:** when `keeperCount > 0`, a muted line under the season picker: `"{n} keepers excluded from grading."` (never shown on Yahoo, where it's 0).

## Testing

- **Reducer** (`buildDraftReport.test.ts`, extend): per-team bestPick + steal/bust counts; topSteals/topReaches selection + length caps + score-sign filter; narrative for the four cases (steals+bust / steals only / bust only / neither); keeperCount passthrough; headshot/proTeam flow through `DraftHighlight`.
- **Loaders:** no unit tests (I/O) — verified by type-check + build + the manual smoke; keeper exclusion + headshots confirmed on the user's real ESPN/Sleeper league (does the "Rd 12 keeper steal" disappear?).
- **Gates:** type-check 62 baseline, build clean, full suite + new reducer cases green. Local only.

## Follow-on / known gaps

- Yahoo keeper exclusion needs `getDraftResults` to parse a keeper field (may not exist in the API response) — deferred; documented as a gap.
- Category parity remains **Phase 2** (separate). The old `/draft` deep board redesign remains separately queued.
