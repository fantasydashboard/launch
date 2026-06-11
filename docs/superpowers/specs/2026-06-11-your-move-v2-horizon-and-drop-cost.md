# Your Move v2 — Horizon (daily/weekly) + Drop-Cost Netting

**Date:** 2026-06-11
**Branch:** `redesign/my-team-first` (LOCAL ONLY — no push / no deploy until user tests with their users)
**Supersedes:** the v1 model in `docs/superpowers/specs/2026-06-10-myteam-your-move-and-reconcile-design.md` (which assumed a weekly horizon and ignored drop cost). The page reconciliation, the engine scaffolding, and the three generators from v1 stay; this changes how candidates are projected, scored, and framed.

## Problem (what v1 got wrong)

The shipped "Your Move" projects every candidate over the **whole remaining week** and **adds a player without dropping anyone**. That produced implausible, clustered, tied lifts ("+31% from a fringe hitter"), and it doesn't match how these leagues actually play. Two corrections:

1. **League horizon.** The leagues are mostly **daily-transaction** (add/drop and set lineup day-by-day); some are **weekly** (set once, locks for the week). The v1 week-projection is right *only* for weekly leagues. Horizon must follow the league's lineup cadence.
2. **Drop cost.** Every add/stream/start implies a drop. A move is only worth it **net of who you'd drop**, and you never drop a keeper for a short-term play. v1's no-drop scoring is the root of the inflated numbers.

Plus a correctness bug: candidates are credited for categories they can't affect (a hitter "flips" SVHD — a relief-pitcher stat).

## The unified model

**One engine, parameterized by horizon, driven by the league's lineup cadence.** Same candidate generation, scoring currency, and drop logic; the horizon changes the projection window, candidate timing, and framing.

| | Daily league | Weekly league |
|---|---|---|
| Horizon | today (configurable: +1–2 days) | full remaining week |
| Headline move | stream an SP pitching **today**; fill an **open slot today** | "set your week": best pickups for the whole week |
| Pickups favor | plays today / today's matchup | most **games this week** (hitters), **two-start weeks** (SPs) |
| Cadence | re-decide daily | decide once; most useful before the weekly lock |
| Long-term upgrades | flagged separately | flagged separately |

**Drop-cost netting applies to both horizons** — this is the universal believability fix.

### Drop-cost netting (core)

Every candidate becomes a **swap**: `add X, drop Y`, scored as `value(add over horizon) − value(drop over horizon)`.
- **Drop selection:** the lowest-horizon-value **droppable** player. "Droppable" excludes keepers (high `roleValue`) and, for daily plays, prefers a player whose MLB team is **off today** (zero cost today) or a bench scrub.
- **Never drop a keeper:** if the only available drop is a high-value player, the move is suppressed (or shown only in the long-term layer with an explicit, honest cost).
- **Net gate:** only surface moves with positive net value over the horizon, above a small floor.

This naturally fixes magnitude *and* differentiation: a one-day marginal-hitter value minus a real drop is small; a stud's day beats a scrub's; dropping a stud nets negative and never surfaces.

### The two presentation layers (daily mode)

1. **Today** — daily streams (SPs pitching today, good matchup, into an open SP slot) + open-slot hitter fills (a rostered hitter's team is off today → plug in a bat playing today). Each pairs with a cheap drop (a player also off today / a scrub). Scored on **today's** projected line, net of the drop.
2. **Worth rostering (long-term)** — a waiver player who projects as a genuine rest-of-season upgrade at a position vs your weak link. Higher bar, names a real drop.

### Weekly mode

A single **"Set your week"** stack: best pickups for the remaining week (multi-game hitters, two-start SPs), each net of a real drop, with a **"lineup locks in Nd"** countdown so it reads as most useful early-week. Long-term upgrades fold in here (in a weekly league a "this-week pickup" and a "roster upgrade" largely coincide).

## League-type detection

`leagueLineupCadence(league): 'daily' | 'weekly'`:
- **Yahoo:** from `getLeagueSettings` — `weekly_deadline` set to a day ⇒ weekly; empty / "intraday" ⇒ daily. (Add this field to the settings parse.)
- **ESPN:** from settings lineup-lock type (per-game / daily ⇒ daily; weekly matchup lock ⇒ weekly). (Add to the settings parse; verify field name against a real response.)
- **Fallback:** if undetectable, default baseball to **daily** and expose a **per-league toggle** in the UI so the user is never stuck in the wrong mode.

## Engine changes (on top of v1 `src/myteam/yourMove/`)

- **`projectHorizon(player, kind, horizon)`** — replaces the week-only projection. Daily: today's one game (hitter) or one start (SP) using per-game / per-start rates × today's games/starts from the schedule. Weekly: remaining-week games/starts. (Generalizes `projectRemainingWeek` + `projectStarts`; the schedule service now supplies games-today and starts-today, not just week totals.)
- **`pairDrop(candidateAdd, myRoster, horizon)`** — selects the best droppable player and returns the net value; suppresses keeper-drops. New module.
- **Scorer** stays the deterministic closed-form win-prob lift, but evaluated over the **horizon** and on the **net** (add minus drop).
- **Generators** gain horizon awareness and the cat-bleed fix: a candidate may only "help" a category its **side** can actually accrue (a hitter cannot help pitching cats, and vice-versa) — filter `helps` by `participatesBySide` before the magnitude check. This kills the "hitter flips SVHD" bug.
- **`useYourMove`** reads the league cadence, picks the horizon, runs the right layers, threads the roster (for drop pairing) and today's schedule.

## Presentation changes (`YourMove.vue` / `MyTeamView.vue`)

- Each move shows the **swap** ("Stream Junis · drop Stephenson") and the honest impact (see open question below).
- Daily mode: **Today** group then **Worth rostering** group. Weekly mode: **Set your week** group + lock countdown.
- The hero treatment yields to a **"top options are close"** affordance when #1/#2 are within ~1 unit (no false singular verdict).
- Keep terminal aesthetic, labels (already fixed), legend.

## Open question to resolve at build time (impact display)

How a move states impact — concrete projected stats ("→ +6 K, ~6 IP today") vs a recalibrated single number. Leaning **concrete stats** for honesty and differentiation, with the net-of-drop framing making the magnitude self-evidently sane. Finalize with the user when building the display.

## Phasing

- **P1 — Drop-cost netting + cat-bleed fix (universal).** Pair every candidate with a drop, score net, fix the side filter. Immediately deflates the bogus numbers regardless of horizon. (Highest value, no new data.)
- **P2 — Daily horizon + the two layers.** Today's games/starts from the schedule; open-slot detection (team-off-today / benched); Today + Worth-rostering layers.
- **P3 — League-type detection + weekly mode.** Settings parse for cadence + toggle; "Set your week" framing + lock countdown.
- **Fast-follow (out of scope now):** scheduled weekly nudge (cron + email/notification) — ship in-page weekly mode first.

## Data feasibility

- Today's games + probable pitchers: ✅ `mlbSchedule.ts` (extend with a single-day query).
- Open slot today: ✅ derivable — rostered player whose team is off today (schedule) or benched (Yahoo `started`).
- Drop candidates: ✅ `computeDropCandidates` + `roleValue`.
- Lineup cadence: ⚠️ add to settings parse (Yahoo `weekly_deadline`; ESPN lock type) + toggle fallback.

## Testing

- `pairDrop`: picks lowest-value droppable; never returns a keeper; net = add − drop.
- side filter: a hitter candidate never lists a pitching cat in `helps` (and vice-versa).
- `projectHorizon`: daily = one game/start; weekly = remaining week; zero games today → zero daily contribution.
- scorer over horizon + net: a swap that strictly improves is > 0; dropping a stud for a one-day play is ≤ 0.
- cadence detection: maps known Yahoo/ESPN settings shapes to daily/weekly; unknown → daily + togglable.

## Out of scope

Scheduled/notified weekly nudge (fast-follow). Within-position ranking (workstream 3). Roster intelligence beyond drop candidates (workstream 4). Trade finder. Park factors.

## Constraint

All work stays local on `redesign/my-team-first`. No `git push`, no `vercel --prod`, until the user has tested with their users.
