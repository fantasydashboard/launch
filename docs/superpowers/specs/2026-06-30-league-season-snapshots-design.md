# League Season Snapshots (Phase 2a) — Design

**Date:** 2026-06-30
**Branch:** `redesign/my-team-first`
**Status:** Approved, ready for planning

## Goal

Persist each league season's history to a **shared** Supabase table so that any
league member's app can backfill any other member's view. The league's history
"heals itself" over time, and survives if a platform later hides a season the app
once saw. This is the durable fix for the ESPN limitation surfaced on the History
page: *"ESPN only shares seasons you've been a member of, so your history starts
at {year}."*

Scope is **Phase 2a only**: auto-snapshot completed seasons + read-merge stored
seasons into the History view. The manual commissioner data-entry form (for
seasons that predate anyone using the app) is a deferred **Phase 2b**, its own
spec.

## Decisions (settled with the user)

1. **Model: league-shared.** Any member's app writes snapshots of seasons it can
   see; all members read the union. A long-tenured member backfills a newer one.
2. **Conflict rule: first-write-wins, finished seasons locked.** A completed
   season is immutable history — the first member to snapshot it sets it, locked
   forever. Only the current in-progress season may be overwritten (it changes
   weekly).
3. **Scope: auto-snapshot + merge now**, manual commissioner backfill deferred.

## Architecture

Additive and non-breaking. Three new units + two modified files. If the table
doesn't exist, the network is down, or the user is logged out, the History page
falls straight back to today's live-only behavior.

```
useLeagueHistory.load()
  ├─ (existing) assemble live HistorySeason[] from the platform
  ├─ leagueSnapshotKey(platform, sport, ids)         ← pure
  ├─ fetchSnapshots(key)  → stored HistorySeason[]   ← service (read)
  ├─ mergeHistorySeasons(live, stored)               ← pure (live wins on overlap)
  ├─ recompute firstYear from merged data
  └─ snapshotSeasons(key, …, liveSeasons)  (fire-and-forget)  ← service (write)
```

### 1. The shared league key

A string identical for every member of a league, computable **without** having
seen the missing seasons (that's what makes cross-member backfill possible).

| Platform | Key format | Notes |
|----------|-----------|-------|
| ESPN | `espn:{sport}:{leagueId}` | ESPN league IDs are stable year-to-year → you can query seasons you were never a member of. **This is where backfill pays off.** |
| Sleeper | `sleeper:{rootLeagueId}` | `rootLeagueId` = oldest `previous_league_id` in the chain. Sleeper already walks the full chain, so members see everything already; snapshots are insurance / persistence only. |
| Yahoo | `yahoo:{sport}:{leagueNumber}` | `leagueNumber` = numeric segment after `.l.` in `431.l.12345`. **Known risk:** if Yahoo reassigns league numbers across seasons, cross-member backfill degrades to per-user persistence (still safe). |

`leagueSnapshotKey(platform, sport, ids)` is a pure function, unit-tested per
platform. Sport and league ids are already available in `useLeagueHistory` (ESPN
via `parseEspnKey`, Yahoo via `league_key`, Sleeper via the history chain root).

### 2. Schema — `league_season_snapshots`

New migration in `supabase/migrations/`, authored fresh (the live schema has
drifted ahead of the committed migrations; author to match the
`matchup_snapshots` template and apply via the Supabase SQL editor).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid pk | `default gen_random_uuid()` |
| `league_snapshot_key` | text not null | the stable cross-user key (§1) |
| `platform` | text not null | `'espn' \| 'yahoo' \| 'sleeper'` |
| `sport` | text not null | `'football' \| 'baseball' \| 'basketball' \| 'hockey'` |
| `season` | int not null | the season year |
| `is_final` | boolean not null default false | true when the season is complete → locked |
| `payload` | jsonb not null | the full `HistorySeason` (teams[], weeks[]) |
| `contributor_user_id` | uuid | `auth.uid()` of the first writer (provenance) |
| `created_at` | timestamptz default now() | |
| `updated_at` | timestamptz default now() | `updated_at` trigger like `matchup_snapshots` |

**Constraint:** `UNIQUE(league_snapshot_key, season)` — one row per league-season;
the upsert conflict target.

**RLS (mirrors `matchup_snapshots`):**

```sql
alter table public.league_season_snapshots enable row level security;

create policy "readable by all authenticated"
  on public.league_season_snapshots for select to authenticated using (true);

create policy "insertable by authenticated"
  on public.league_season_snapshots for insert to authenticated
  with check (auth.uid() = contributor_user_id);

create policy "update only non-final"
  on public.league_season_snapshots for update to authenticated
  using (is_final = false);
```

The `update only non-final` policy enforces the "lock finished seasons" rule at
the database level — a completed season physically cannot be overwritten, even by
a buggy client.

### 3. Conflict rule, implemented

`isSeasonFinal(season, activeSeason, teams)` (pure): `true` when
`season < activeSeason` **or** some team is flagged `champion`. Belt and
suspenders — a decided season is final regardless of the year rollover.

- **Finished season** → upsert `is_final: true` with `ignoreDuplicates: true` on
  conflict `(league_snapshot_key, season)`. First final write sticks; later
  attempts no-op (and RLS would block an update anyway). First-write-wins.
- **Current in-progress season** → upsert `is_final: false` with an update on
  conflict. Refreshes weekly. Allowed by RLS (`is_final = false`).

### 4. Read / merge

`mergeHistorySeasons(live, stored): HistorySeason[]` (pure, unit-tested):

- Union by `season` number.
- On overlap, **live wins** — the user's own fresh fetch is authoritative for
  their view; stored payloads only fill seasons the user lacks.
- Result sorted `season` descending (matching the current `data` contract).

Plugged into `useLeagueHistory` as a post-load step. `firstYear` is recomputed
from the merged data so the ESPN note reflects the now-deeper start year.

### 5. Write-back

After merge, `snapshotSeasons()` writes **only the seasons this user fetched
firsthand** (`live`, not the merged set) — no point re-storing another member's
already-stored payload. Fire-and-forget: guarded on `!supabase ||
!authStore.user`, wrapped in try/catch, errors `console.error`'d, never thrown
into the view, never blocking render.

### 6. View copy

`HistoryView.vue` ESPN note becomes depth-aware:

- When merged history reaches no earlier than the user's own membership → today's
  copy (the membership caveat).
- When snapshots have pushed `firstYear` earlier than the user's first live
  season → acknowledge the backfilled depth instead of only apologizing (e.g.
  "History goes back to {firstYear}, filled in from league snapshots.").

## Files

| File | Change |
|------|--------|
| `supabase/migrations/20260630_league_season_snapshots.sql` | **new** — table + RLS + updated_at trigger |
| `src/services/historySnapshots.ts` | **new** — `leagueSnapshotKey`, `fetchSnapshots`, `snapshotSeasons` |
| `src/history/mergeSeasons.ts` | **new** (pure) — `mergeHistorySeasons`, `isSeasonFinal` |
| `src/composables/useLeagueHistory.ts` | **modify** — post-load merge + write-back, recompute `firstYear` |
| `src/views/HistoryView.vue` | **modify** — depth-aware ESPN note |
| `src/history/__tests__/mergeSeasons.test.ts` | **new** — merge + final logic |
| `src/services/__tests__/historySnapshots.test.ts` | **new** — key fn per platform; upsert conflict targets + `is_final` logic (mocked supabase) |

## Error handling / degradation

- No `supabase` client, logged out, or read/write failure → live-only behavior;
  History works exactly as today.
- Writes are fire-and-forget and never surface errors to the UI.
- Reads that fail resolve to `[]`, so `mergeHistorySeasons(live, [])` returns
  `live` unchanged.

## Testing

- Pure functions get direct unit tests: `leagueSnapshotKey` (all three
  platforms, incl. Yahoo number extraction), `mergeHistorySeasons` (union,
  live-wins-on-overlap, sort), `isSeasonFinal` (year rollover + champion flag).
- Service tests mock the Supabase client (as `matchupSnapshots` allows) and
  assert the upsert conflict target and the `is_final` / `ignoreDuplicates`
  branch per season kind.
- Existing History builders and view are unaffected; the full suite must stay
  green and the type-check baseline unchanged (62, none in touched files).

## The one production action

The migration SQL must be applied to the live Supabase project (`ergxtydfgffqgkddclvr`)
via the **SQL editor — the user runs it**. It is additive and inert until the
code writes to it. Application code stays on `redesign/my-team-first`, unpushed
and undeployed, per the standing "local until the user tests with real users"
constraint. Snapshots begin populating as soon as the user runs the branch
locally against prod Supabase, which is the intended test path.

## Known limitations (accepted, documented)

1. **Open-read RLS.** Any authenticated UFD user can read a league's snapshot
   payload if they know the key (keys are derived from non-secret platform league
   ids). This matches the existing `matchup_snapshots` posture. Could be tightened
   later with a server-side league-membership table.
2. **Yahoo keying risk** (§1) — degrades to per-user persistence if league numbers
   aren't stable across seasons.
3. **Truly pre-app seasons** (before anyone in the league used UFD) are not
   recoverable by snapshots — that's the deferred Phase 2b manual backfill.
