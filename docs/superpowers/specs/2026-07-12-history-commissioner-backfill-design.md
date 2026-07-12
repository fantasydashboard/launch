# History Manual Backfill (Phase 2b) — Design

**Date:** 2026-07-12
**Branch:** `redesign/my-team-first` (local only — see deploy-only-after-local-testing)
**Status:** Approved in brainstorming; ready for plan.

## Goal

Let a league member hand-enter **past seasons that predate anyone's app membership** so
they appear in the League History page. Phase 2a made history "heal itself" across
members via auto-captured snapshots, but seasons before *anyone* in the league used UFD
are unrecoverable from any platform. Manual backfill is the only mechanism that surfaces
them — the real fix for the ESPN-newcomer limitation the History page currently only
apologizes for.

Scope is **Phase 2b only**: an inline form on the History page that writes hand-entered
`HistorySeason` rows into the existing `league_season_snapshots` table, flowing through
the Phase 2a merge/render pipeline unchanged.

## Context that shaped the design

- **There is no per-league "commissioner" concept in the app.** "Commissioner" is
  marketing copy only; `/admin` is a global site-owner panel, not a per-league role, and
  there is no league membership/role table. So "commissioner backfill" is really *"any
  authenticated league member may add missing past seasons."* There is no identity to
  enforce commissioner-only against, and we are not building one.
- The `league_season_snapshots` table + Phase 2a service (`leagueSnapshotKey`,
  `fetchSnapshots`, `snapshotSeasons`, `mergeHistorySeasons`, `isSeasonFinal`) already
  exist. This feature is additive on top.
- **The prod table was created on 2026-07-12** (Phase 2a's migration had never actually
  been applied). It was stood up via a single combined script that already includes the
  Phase 2b `source` column and the two manual-row RLS policies below, so no further prod
  DDL is required for this feature.

## Decisions (settled with the user)

1. **Who can add:** any authenticated league member. Each entry shows subtle provenance
   ("added by you / a leaguemate").
2. **Data scope is progressive** — the person entering picks their effort:
   - *Champions-only (default):* champion (required) + runner-up (optional). ~30 sec/year.
   - *Full standings (optional expand):* every team's finishing order + W-L-T; champion is
     row 1.
3. **Correction/lock:** a hand-entered season is `source='manual'` and stays editable and
   deletable **by the contributor who entered it**, even though it is `is_final=true`.
   Others cannot overwrite it. Auto rows keep their first-write-wins lock.
4. **Precedence:** platform-vouched (auto) data supersedes hand-typed (manual) data for
   any overlapping year.
5. **Placement:** inline on the History page, under the depth note. No separate route.
6. **Scope guard:** adding *missing* past years only — not correcting champions on years
   the platform already returns.

## Architecture

Approach: **extend the existing snapshot table & service.** Manual entries are ordinary
`HistorySeason` payloads with `source='manual'`; they union into the read path through the
unchanged `mergeHistorySeasons` and render through every unchanged builder
(`buildChampions`, `buildAllTimeStandings`, `buildDynastyRankings`, …). Minimal new
surface, maximal reuse. (Rejected alternatives: a separate `league_manual_seasons` table —
duplicates the fetch/merge path for no payoff; a lightweight champions-only store — fights
the progressive-detail decision and forces a second builder input path.)

### 1. Schema & RLS (already applied to prod 2026-07-12)

The live table includes, beyond the Phase 2a columns:

```sql
source text not null default 'auto'   -- 'auto' = platform-captured · 'manual' = hand-entered
```

Existing/auto rows default to `'auto'`. Two additional RLS policies (on top of the Phase 2a
select/insert/`update only non-final` policies) let a contributor manage their own manual
rows even when final:

```sql
create policy "contributor manages own manual rows"
  on public.league_season_snapshots for update to authenticated
  using  (source = 'manual' and auth.uid() = contributor_user_id)
  with check (source = 'manual' and auth.uid() = contributor_user_id);

create policy "contributor deletes own manual rows"
  on public.league_season_snapshots for delete to authenticated
  using (source = 'manual' and auth.uid() = contributor_user_id);
```

Postgres OR-combines permissive policies: an auto final row is still locked (only
`update only non-final` could apply, and it fails on `is_final=true`), while a manual row
owned by the caller passes via the new policy.

**Repo reconciliation:** the committed migration files currently describe a create
(`20260630_…`) that was never applied plus this feature's alter. During the plan, the repo
SQL will be reconciled so a fresh checkout's migration matches the single combined script
that was actually run in prod (table created with `source` + all five policies). No further
prod DDL.

### 2. Service layer — `src/services/historySnapshots.ts`

Two new functions alongside the existing ones. Unlike the fire-and-forget
`snapshotSeasons`, these **report their outcome** (the user needs to know their entry saved).

```ts
saveManualSeason(params: {
  key: string            // leagueSnapshotKey(...) — same key the reader uses
  platform: string
  sport: string
  season: HistorySeason  // assembled payload (champion flagged, teams[])
  activeSeason: number
}): Promise<{ ok: true } | { ok: false; reason: 'conflict' | 'auth' | 'error' }>
```

- Guards on `supabase` + `authStore.user` → `{ ok:false, reason:'auth' }` if logged out /
  no client.
- Writes `source:'manual'`, `is_final: isSeasonFinal(season.season, activeSeason)` (a
  pre-membership year is always past → `true`), `contributor_user_id: uid`.
- `onConflict:'league_snapshot_key,season'`, **not** `ignoreDuplicates`, so re-saving your
  own row updates it (RLS allows). If the conflicting row is an **auto** row or **another
  member's manual** row, RLS blocks the update → `{ ok:false, reason:'conflict' }` (the one
  place the UI surfaces a real error).

```ts
deleteManualSeason(key: string, season: number): Promise<{ ok: boolean }>
```

- Deletes the caller's own manual row (RLS enforces `source='manual' AND contributor=you`).

`fetchSnapshots` is extended to additionally select `source` and `contributor_user_id`
(payload still returned as today) so the view can show provenance and gate edit/remove to
the caller's own manual rows.

DRY refactor: extract the row-building object currently inline in `snapshotSeasons` so
`saveManualSeason` reuses it with `source` varying; `snapshotSeasons` writes `source:'auto'`
explicitly.

### 3. Auto-vs-manual collision — resolved by live-wins merge (no write-time mechanism)

Precedence rule 4 says platform-vouched (auto) data must win over a hand-typed (manual)
placeholder for the same season. This falls out of the **existing** design with no new
write-time superseding logic and no additional DDL:

- **The viewer who has auto data always sees it.** `mergeHistorySeasons` is live-wins, so
  any member whose own account can fetch season *Y* renders their live *Y* regardless of
  what's stored. The only overlap that matters to a viewer is resolved in their favor.
- **A viewer without auto data for *Y* has no overlap** — for them the manual row is the
  only *Y*, strictly better than a blank. Nothing to supersede.
- **The shared store simply keeps whichever row landed first.** `snapshotSeasons` already
  writes finished seasons with `ignoreDuplicates:true`, so a later auto write of a year
  that a leaguemate already hand-entered no-ops (and RLS would block updating another
  member's final manual row anyway). The manual row persists harmlessly; every member who
  has live data for that year still sees it via merge.
- **Manual entry can't collide going forward.** The season `<select>` only offers years
  the caller lacks, so a member never hand-enters a year they can already see. If they
  hand-enter a year that *another* member has since auto-written, `saveManualSeason`'s
  upsert conflicts with a non-manual row → RLS blocks it → `{ ok:false, reason:'conflict' }`
  → the form shows "already on record" and refreshes (the auto year now appears and drops
  out of the dropdown).

Accepted limitation: if a manual entry is *wrong* and a member with authoritative live data
exists, that member can't push a correction into the shared store for others (the manual row
is correctable only by its own contributor). Everyone with live data still sees the truth;
only members lacking it see the placeholder. This is an acceptable edge, documented, not a
blocker.

### 4. Form UX — `src/components/history/BackfillSeason.vue`

Inline on the History page under the depth note. Collapsed by default to one quiet
affordance, shown only when there are missing years (`< firstYear`, not already present):

```
History starts at 2022.  ⊕ Add an earlier season
```

Expands inline (no route change):

```
Add a past season
  Season   [ 2021 ▾ ]        ← only missing years < firstYear
  Champion [ Team name… ]  ★ required
  Runner-up[ Team name… ]
  ▸ Add full standings (optional)
  [ Save season ]  [ Cancel ]
  ⓘ Hand-entered — you can edit or remove what you add.
```

"Add full standings" discloses a compact repeating list, one row per finishing place:

```
▾ Full standings (1 = champion)
  1  [ Team… ]  W[11] L[3] T[0]  🏆
  2  [ Team… ]  W[10] L[4] T[0]
  ⊕ add team
```

**Behavior:**
- *Champions-only path:* assembles a `HistorySeason` with 1–2 teams — champion `rank:1
  champion:true`, runner-up `rank:2`. Records stay `0-0-0`; the all-time view already shows
  titles/seasons without W-L (win% reads `.000` for that year, which copy accounts for).
- *Full-standings path:* rank from row order (1 = champion, auto-flagged), typed W-L-T per
  team. `pointsFor` left 0 (nobody remembers old point totals — not asked).
- Season `<select>` constrained to genuinely missing years, so no collision with live data
  and no double-entry.
- Validation: champion name non-empty; season selected. Inline errors (no toast system).
- On success: panel collapses, History re-renders with the new year merged in (champion in
  the roll, title count ticks up in All-time/Legacy).
- `conflict` result: inline "That season's already on record" + refresh.
- Existing manual entries the caller owns render a subtle "added by you · edit · remove"
  line on their Champions rows; edit re-opens the panel prefilled, remove calls
  `deleteManualSeason`.

Styled in the redesign terminal aesthetic (mono labels, `bg-dark-card`, lime primary on
Save and the 🏆 flag) to match `HistoryView`.

### 5. Merge / provenance / precedence in the composable

`src/composables/useLeagueHistory.ts`:
- `fetchSnapshots` now returns `source` + `contributor_user_id` per season; the composable
  threads a per-season `origin` map (`'auto' | 'manual'` + contributor id) alongside `data`
  so the view can render provenance and gate the edit/remove controls.
- `mergeHistorySeasons` is **unchanged** (live-wins-on-overlap already correct; manual rows
  only fill seasons the user's own account lacks).
- The existing `backfilled` flag already flips when stored rows deepen `firstYear`, so a
  manual entry lights the positive depth note with no change. Copy ("filled in from seasons
  your leaguemates have contributed") is already true for manual.
- Contributor **display name** resolves from the season's own team names where possible,
  else a generic "a leaguemate" — we do not have a users→name lookup and will not add one.

## Files

| File | Change |
|------|--------|
| `supabase/migrations/*league_season_snapshots*.sql` | **reconcile** — committed SQL matches the applied combined script (create + `source` + 5 policies). No new prod DDL. |
| `src/services/historySnapshots.ts` | **modify** — `saveManualSeason`, `deleteManualSeason`; `fetchSnapshots` selects `source`/`contributor`; `snapshotSeasons` writes `source:'auto'` explicitly; DRY row builder. (No superseding logic — §3.) |
| `src/services/__tests__/historySnapshots.test.ts` | **modify** — tests for save/delete + conflict/auth branches + assembly helper. |
| `src/composables/useLeagueHistory.ts` | **modify** — thread per-season `origin` (source + contributor) alongside `data`. |
| `src/components/history/BackfillSeason.vue` | **new** — inline collapsible form (champions-only + optional standings, edit/remove of own entries). |
| `src/views/HistoryView.vue` | **modify** — mount `BackfillSeason`; render provenance + edit/remove on own manual Champions rows. |

## Error handling / degradation

- No `supabase` / logged out → the affordance shows a disabled "sign in to add history"
  state; the read path is entirely unaffected (live-only, as today).
- Save failure surfaces inline (`conflict` / `error`); it never corrupts the rendered
  history (which came from the merge).
- Delete failure is a no-op with an inline note.

## Testing

- vitest, mocked Supabase (as existing `historySnapshots.test.ts`): `saveManualSeason`
  (source/is_final/onConflict; `conflict` + `auth` branches), `deleteManualSeason`, and the
  form→`HistorySeason` assembly helper (champion flag, rank-from-order).
- Merge/builders unchanged → no new tests there; a manual `HistorySeason` is just data on
  the proven path.
- Gates: type-check 62 baseline (none in touched files), build clean, full suite green.

## Out of scope (defer / never)

- Any per-league commissioner role or membership table.
- Correcting platform-derived champions on years the API already returns (e.g. a wrong
  Yahoo rank-1 fallback) — different concern, different lock semantics.
- Point totals for old seasons; week-by-week backfill (rivalries/single-game records for
  pre-membership years) — un-enterable by hand, YAGNI.
- A users→display-name directory for richer provenance.

## The one production action

None beyond what was already done: the combined table+policies script was applied on
2026-07-12. This feature ships with no further prod DDL. All application code stays on
`redesign/my-team-first`, unpushed and undeployed, per the standing local-until-tested
constraint.
