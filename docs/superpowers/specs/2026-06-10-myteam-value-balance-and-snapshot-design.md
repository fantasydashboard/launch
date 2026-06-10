# My Team: Positional Value Balance + Legible Roster + This-Week Snapshot — Design

**Date:** 2026-06-10
**Branch:** `redesign/my-team-first` (local only; do not push/deploy)
**Status:** Approved in concept, ready for spec review
**Supersedes for implementation:** `2026-06-10-this-week-winprob-snapshot-design.md` (Part C below restates it; that spec remains as background).

## Goal

Three cohesive My Team improvements, shipped together but plan-sequenced:
- **A. Positional value balance** — rank and judge players *within role* (hitters vs hitters, pitchers vs pitchers), fixing the skew where a 4-category starter's raw value sum lost to a 6-category hitter (Chris Sale below Alec Bohm on Yahoo).
- **B. Legible roster** — surface a role-relative value number and tier grouping so the sort explains itself.
- **C. This-week win-probability snapshot** — a compact band turning My Team into a this-week decision surface.

## Background: why A is needed

`valueScore` is the sum of clamped per-category z-scores across the categories a player participates in. Sum rewards breadth (correct — it fixed balanced studs), but comparing raw sums *across roles* is unfair: a Yahoo hitter touches 6 categories, a starter touches 4 (after the SV/HLD fix), so hitters systematically out-sum starters. Visible as: every hitter above every pitcher on Yahoo; invisible on ESPN (its 20-cat set gives starters ~8 pitching categories). The fix is to compare value within role.

---

## Part A — Positional value balance

### Role classification
Each pool player is classified `'hitter' | 'pitcher'` from position tokens (`SP`/`RP`/`P` ⇒ pitcher; otherwise hitter). A two-way player (both pitcher and hitter tokens) is assigned to the role in which they participate in **more** categories (tie ⇒ hitter). This lives as a small pure helper reused from the existing `isPitcherPos`/`isHitterPos` logic in `value.ts`.

### Pool-relative role value
`valueScore` (sum of z) is unchanged as the raw value. The new comparable metric is **`roleValue`**: a player's percentile (0-100) of `valueScore` **among all rostered POOL players of the same role**. Pool-relative (not roster-relative) so it answers "this is a genuinely fringe 1B leaguewide," not merely "your worst hitter."

To compute it, `computeRosterValue` scores the **entire pool** (the per-category z's are already computed over pool participants, so summing every pool player is cheap), groups pool players by role, and assigns each of MY players `roleValue` = their percentile within their role's pool distribution.

### Tier
Derived from `roleValue`: **Core ≥ 67, Solid 34-66, Fringe ≤ 33** (pool-relative percentiles; heuristic, tunable). A deep team can be mostly Core (honest); a weak team mostly Fringe.

### Drops + weak-link become role-fair
`computeDropCandidates` switches from `valueScore` to `roleValue` (already cross-role comparable since both are within-role percentiles): a drop candidate is a low-`roleValue` player (e.g. `roleValue < 25`), never one with `roleValue >= 50`, capped at 3, sorted ascending. `weakLink` = my player with the lowest `roleValue`. This judges your worst pitcher against pitchers and your worst hitter against hitters.

### Type changes
`PlayerContribution` gains `role: 'hitter' | 'pitcher'` and `roleValue: number` (0-100). `valueScore` stays. The tier word is derived from `roleValue` by a shared helper `valueTier(roleValue): 'core' | 'solid' | 'fringe'` (so the component and any tests agree).

---

## Part B — Legible roster (RosterPanel)

- **Two sections: "HITTERS" and "PITCHERS".** Each section header names the comparison basis, e.g. `HITTERS · ranked vs rostered hitters`, so the number needs no per-row label.
- Within each section, rows are sorted by `roleValue` descending.
- **Per-row value number:** a muted, right-aligned `roleValue` (0-100), mono. Precision that explains the exact ordering. No per-row tier word (the divider names the group).
- **Tier dividers:** between tier groups within a section, a **hairline rule with a small muted tier label** ("CORE" / "SOLID" / "FRINGE") — not a bold bar. A divider renders only where the tier changes. The Fringe line is the decision line: everything below it is the leaguewide-fringe upgrade zone.
- **Reconcile tags:** the existing `drop?` / `weak link` tags stay, marking the specific worst rows — which naturally fall in the Fringe group. No new contradiction (Fringe = upgrade zone; drop?/weak-link = the worst within it).
- Contribution chips (capped plus/minus + `+N` overflow) are unchanged.

Honest framing: the number is a role-relative percentile among rostered players, not a skill rating; the section header carries that meaning.

---

## Part C — This-week win-probability snapshot

(Restated from the prior spec; unchanged in intent.)

- **Extract the engine** into a pure module `src/services/categoryWinProbability.ts`: `calcOverallWinProb(t1Stats, t2Stats, catIds, days, platform)` → `{ team1, team2, avgT1Cats, avgT2Cats }`; `calcCatWinProb(v1, v2, statId, days, platform)` → per-category win %; `randomNormal`, `clampWinProb`; `STAT_VOLATILITY = { yahoo, espn }`; `bucketCategory(myWinPct): 'safe' | 'tossup' | 'loss'` (≥70 safe, ≤30 loss, else tossup). Copied from `CategoryMatchupsView.vue` (left untouched; duplication noted for a later DRY pass).
- **`useThisWeekMatchup` composable:** resolve current week (Yahoo `current_week`, ESPN `currentMatchupPeriod`), fetch the week's matchup (`getCategoryMatchups` / `getMatchups`), find the one with my team, normalize both teams' week-to-date per-category totals, compute days remaining (reuse the Matchups view's date logic), run `calcOverallWinProb` for the headline and `calcCatWinProb` + `bucketCategory` per category. Returns `snapshot: ThisWeekSnapshot | null` (null when no active matchup). Stale-league guard.
  ```typescript
  interface ThisWeekSnapshot {
    opponentName: string
    myWinPct: number          // 0-100 rounded
    projWins: number; projLosses: number; projTies: number
    daysRemaining: number
    completed: boolean
    categories: { statId: string; label: string; status: 'safe' | 'tossup' | 'loss'; myWinPct: number }[]
  }
  ```
- **`MatchupSnapshot.vue`:** compact band between the verdict header and the weak/edge grid — "THIS WEEK · vs {opponent}", win %, "projected {W}-{L}", three grouped chip rows (safe = lime, coin-flips = amber, likely losses = red), deep-link to the Matchup page. Renders only when `snapshot` is non-null.
- Honest copy: based on week-to-date totals + days-remaining volatility, not pitching schedules.

---

## Deferred follow-on: within-position ranking (research first)

A future feature: show where a player ranks **within their fielding position** (e.g. "your 1B is a bottom-tier 1B leaguewide"), so a manager can see they keep starting a positional weak spot. Strong and on-thesis, but deferred because it needs research, not just UI. The research must resolve:
1. **Multi-eligibility** — a player qualifying at 2B/OF/etc.: rank at every eligible slot, their best slot, or the slot actually started?
2. **Lineup / start-sit data** — "regularly throwing out" a weak 1B implies who was *started*, not just rostered; that is a different data pull (daily lineups) and is where the insight lives. Confirm availability per platform.
3. **Positional replacement level for a given category set** — a "good 1B" differs between a 5×5 and a 20-cat league; define replacement per position per categories.

Not in this spec's scope.

---

## Architecture summary

Pure modules stay pure and TDD'd. `value.ts` gains pool-wide scoring + `roleValue` + role; `types.ts` gains the fields + `valueTier` helper; `dropCandidates.ts` switches to `roleValue`; `RosterPanel.vue` groups + shows number + tier dividers; `categoryWinProbability.ts` (new) holds the extracted engine; `useThisWeekMatchup.ts` (new) feeds `MatchupSnapshot.vue`; `MyTeamView.vue` wires the snapshot in and passes role/roleValue through to the roster panel.

## Error handling / edge cases
- **Empty pool / single player in a role** → `roleValue` defaults gracefully (a sole pitcher is 100th percentile of pitchers; no divide-by-zero).
- **Two-way players** → assigned one role by participated-cat majority; appear once.
- **No current matchup** (offseason, bye, opponent not found) → snapshot null → band not rendered; rest of page unaffected.
- **Win-prob engine fetch throws** → log, snapshot null, page renders.
- **Stale league switch** → composable guard.

## Testing
- `value.ts`: extend tests — pool-wide scoring; `roleValue` is a within-role percentile (a top pitcher and top hitter both ~high even with different cat counts); two-way classification. Existing breadth / role-fair / volume / SP-not-penalized tests stay green.
- `valueTier` thresholds; `dropCandidates` on `roleValue` (worst pitcher judged vs pitchers; studs protected; weak-link = lowest roleValue).
- `categoryWinProbability.ts`: deterministic checks at days=0 (leader 100, tie ~50), large-lead high, symmetric ~50 (tolerance band); `bucketCategory` thresholds; `clampWinProb` bounds.
- Existing suite stays green (62).
- Visual: on the real Yahoo league, Chris Sale/Michael King rank among *pitchers* (not below Bohm); numbers + tier dividers read cleanly; win-prob band shows the right opponent and plausible coin-flips. ESPN unchanged-good.

## Files (anticipated)
- Modify: `src/myteam/types.ts` (role, roleValue, valueTier), `src/myteam/value.ts` (pool scoring + roleValue + role), `src/myteam/dropCandidates.ts` (roleValue), `src/components/myteam/RosterPanel.vue` (sections + number + dividers), `src/views/MyTeamView.vue` (pass role/roleValue; wire snapshot)
- Create: `src/services/categoryWinProbability.ts` (+ test), `src/composables/useThisWeekMatchup.ts`, `src/components/myteam/MatchupSnapshot.vue`

## Constraints
- Local only; branch `redesign/my-team-first`. No push, no deploy.
- No banned patterns; no em dashes. Athletic-terminal tokens; keep the roster restrained (number + hairline dividers, not heavy bars).
