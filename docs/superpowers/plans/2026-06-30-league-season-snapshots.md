# League Season Snapshots (Phase 2a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist each league season's history to a shared Supabase table so any member's app can backfill any other member's view, healing the ESPN "seasons you were a member of" gap.

**Architecture:** Additive and non-breaking. A pure merge module and a Supabase service are wired into `useLeagueHistory.load()` as a post-load step: fetch stored snapshots for a stable per-league key, merge them under the user's live fetch (live wins on overlap), then fire-and-forget write the user's firsthand seasons back. Finished seasons are locked at the DB level (RLS `update ... using (is_final = false)`), giving first-write-wins. If Supabase is absent or a call fails, the page falls back to today's live-only behavior.

**Tech Stack:** Vue 3, TypeScript, Pinia, Supabase (Postgres + RLS), Vitest.

**Spec:** `docs/superpowers/specs/2026-06-30-league-season-snapshots-design.md`

**Standing constraints (do not violate):**
- All work stays on branch `redesign/my-team-first`. NEVER push, deploy, PR, or merge.
- Type-check baseline is **62 errors, none in touched files**. Build must stay clean. All tests pass (currently 409).
- Commit with `git -c gc.auto=0 commit -q -F - <<'EOF' … EOF`, message ending:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. NO push.
- zsh has exclamation-mark issues — if a script is needed, write it to `/tmp/`.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `supabase/migrations/20260630_league_season_snapshots.sql` | **new** — table + unique constraint + RLS + `updated_at` trigger. Applied to prod by the USER via the Supabase SQL editor. |
| `src/history/mergeSeasons.ts` | **new**, pure — `isSeasonFinal()`, `mergeHistorySeasons()`. No I/O. |
| `src/history/__tests__/mergeSeasons.test.ts` | **new** — unit tests for the two pure functions. |
| `src/services/historySnapshots.ts` | **new** — `leagueSnapshotKey()` (pure), `fetchSnapshots()`, `snapshotSeasons()`. Mirrors `matchupSnapshots.ts` Supabase style. |
| `src/services/__tests__/historySnapshots.test.ts` | **new** — `leagueSnapshotKey` per platform; `snapshotSeasons` upsert branching (mocked Supabase + auth). |
| `src/composables/useLeagueHistory.ts` | **modify** — set a stable `snapshotKey` per platform loader; post-load merge + write-back; expose `backfilled`. |
| `src/views/HistoryView.vue` | **modify** — depth-aware note (positive when snapshots deepened history; ESPN caveat otherwise). |

**Type-check note (verified):** `src/services/matchupSnapshots.ts` calls `supabase.from('matchup_snapshots')` even though that table is absent from the `Database` type in `src/types/supabase.ts`, and it compiles clean. Mirror that exactly — import the `supabase` singleton, guard `if (!supabase) return`, call `.from('league_season_snapshots')`. Do NOT edit `src/types/supabase.ts`.

---

## Task 1: Database migration (SQL file + user applies it)

**Files:**
- Create: `supabase/migrations/20260630_league_season_snapshots.sql`

This task has no automated test (it's a SQL DDL file the user runs in the Supabase SQL editor). Verification is: the file exists, is valid SQL matching the `matchup_snapshots` template, and is committed.

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/20260630_league_season_snapshots.sql` with exactly:

```sql
-- League season snapshots: shared per-league history so any member's app can
-- backfill any other member's view. Mirrors matchup_snapshots' RLS posture.
create table if not exists public.league_season_snapshots (
  id uuid primary key default gen_random_uuid(),
  league_snapshot_key text not null,
  platform text not null,
  sport text not null,
  season int not null,
  is_final boolean not null default false,
  payload jsonb not null,
  contributor_user_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (league_snapshot_key, season)
);

create index if not exists league_season_snapshots_key_idx
  on public.league_season_snapshots (league_snapshot_key);

alter table public.league_season_snapshots enable row level security;

create policy "readable by all authenticated"
  on public.league_season_snapshots for select to authenticated using (true);

create policy "insertable by authenticated"
  on public.league_season_snapshots for insert to authenticated
  with check (auth.uid() = contributor_user_id);

create policy "update only non-final"
  on public.league_season_snapshots for update to authenticated
  using (is_final = false);

-- Keep updated_at fresh on every write (same pattern as matchup_snapshots).
create or replace function public.set_league_season_snapshots_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_league_season_snapshots_updated_at
  on public.league_season_snapshots;
create trigger trg_league_season_snapshots_updated_at
  before update on public.league_season_snapshots
  for each row execute function public.set_league_season_snapshots_updated_at();
```

- [ ] **Step 2: Verify it against the template**

Run: `diff <(grep -c "create policy" supabase/migrations/20260630_league_season_snapshots.sql) <(echo 3)`
Expected: no output (exactly 3 policies defined).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260630_league_season_snapshots.sql
git -c gc.auto=0 commit -q -F - <<'EOF'
feat: league_season_snapshots migration (shared per-league history)

Shared table + RLS mirroring matchup_snapshots. UPDATE policy gated on
is_final=false enforces first-write-wins lock on finished seasons.
Applied to prod by the user via the Supabase SQL editor.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

- [ ] **Step 4: Flag the manual prod action to the controller**

Report in your completion summary (verbatim, so the controller relays it to the user): "The migration SQL must be applied to the live Supabase project (ref `ergxtydfgffqgkddclvr`) via the SQL editor before snapshots will read/write. The file is at `supabase/migrations/20260630_league_season_snapshots.sql`." Do NOT attempt to apply it yourself.

---

## Task 2: Pure merge module (`isSeasonFinal`, `mergeHistorySeasons`)

**Files:**
- Create: `src/history/mergeSeasons.ts`
- Test: `src/history/__tests__/mergeSeasons.test.ts`

`HistorySeason`/`HistoryTeam` are defined in `src/history/types.ts` (already exists):
`HistorySeason = { season: number; teams: HistoryTeam[]; weeks?: HistoryWeek[] }`,
`HistoryTeam` has a boolean `champion` field.

- [ ] **Step 1: Write the failing test**

Create `src/history/__tests__/mergeSeasons.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { isSeasonFinal, mergeHistorySeasons } from '../mergeSeasons'
import type { HistorySeason, HistoryTeam } from '../types'

function team(p: Partial<HistoryTeam> & { teamKey: string }): HistoryTeam {
  return {
    teamName: p.teamKey,
    wins: 0,
    losses: 0,
    ties: 0,
    pointsFor: 0,
    rank: 0,
    madePlayoffs: false,
    champion: false,
    ...p,
  }
}
function season(year: number, teams: HistoryTeam[] = []): HistorySeason {
  return { season: year, teams }
}

describe('isSeasonFinal', () => {
  it('is final when the season predates the active season', () => {
    expect(isSeasonFinal(2023, 2026, [])).toBe(true)
  })
  it('is final when a champion is flagged, even in the active season', () => {
    expect(isSeasonFinal(2026, 2026, [team({ teamKey: 'A', champion: true })])).toBe(true)
  })
  it('is NOT final for the active season with no champion yet', () => {
    expect(isSeasonFinal(2026, 2026, [team({ teamKey: 'A' })])).toBe(false)
  })
})

describe('mergeHistorySeasons', () => {
  it('adds stored seasons the live fetch lacks and sorts newest-first', () => {
    const live = [season(2026), season(2025)]
    const stored = [season(2024), season(2023)]
    const merged = mergeHistorySeasons(live, stored)
    expect(merged.map((s) => s.season)).toEqual([2026, 2025, 2024, 2023])
  })
  it('prefers the LIVE payload when a season exists in both', () => {
    const live = [season(2025, [team({ teamKey: 'live' })])]
    const stored = [season(2025, [team({ teamKey: 'stored' })])]
    const merged = mergeHistorySeasons(live, stored)
    expect(merged).toHaveLength(1)
    expect(merged[0].teams[0].teamKey).toBe('live')
  })
  it('returns live unchanged when stored is empty', () => {
    const live = [season(2026), season(2025)]
    expect(mergeHistorySeasons(live, [])).toEqual(live)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/history/__tests__/mergeSeasons.test.ts`
Expected: FAIL — cannot find module `../mergeSeasons`.

- [ ] **Step 3: Write the implementation**

Create `src/history/mergeSeasons.ts`:

```ts
/**
 * Pure helpers for durable league-history snapshots.
 *
 * `isSeasonFinal` decides whether a season is immutable (locked) history.
 * `mergeHistorySeasons` unions a user's live fetch with stored snapshots,
 * preferring the live payload on overlap — stored rows only fill seasons the
 * user's own account can't see. Both are deterministic + side-effect-free.
 */
import type { HistorySeason, HistoryTeam } from './types'

/** A season is final when it predates the active season, or a champion is flagged. */
export function isSeasonFinal(
  season: number,
  activeSeason: number,
  teams: HistoryTeam[],
): boolean {
  return season < activeSeason || teams.some((t) => t.champion)
}

/** Union by season number; live wins on overlap. Result sorted season DESC. */
export function mergeHistorySeasons(
  live: HistorySeason[],
  stored: HistorySeason[],
): HistorySeason[] {
  const liveSeasons = new Set(live.map((s) => s.season))
  const merged = [...live]
  for (const s of stored) {
    if (!liveSeasons.has(s.season)) merged.push(s)
  }
  merged.sort((a, b) => b.season - a.season)
  return merged
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/history/__tests__/mergeSeasons.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/history/mergeSeasons.ts src/history/__tests__/mergeSeasons.test.ts
git -c gc.auto=0 commit -q -F - <<'EOF'
feat: pure season-merge helpers for durable history

isSeasonFinal + mergeHistorySeasons (live wins on overlap, sorted desc).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

## Task 3: Snapshot service (`leagueSnapshotKey`, `fetchSnapshots`, `snapshotSeasons`)

**Files:**
- Create: `src/services/historySnapshots.ts`
- Test: `src/services/__tests__/historySnapshots.test.ts`

Mirror `src/services/matchupSnapshots.ts`: import the `supabase` singleton from `@/lib/supabase`, guard on null, use `.upsert(rows, { onConflict, ignoreDuplicates })`, log-and-swallow errors.

- [ ] **Step 1: Write the failing test**

Create `src/services/__tests__/historySnapshots.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { HistorySeason } from '@/history/types'

// Capture upsert calls through a mock Supabase client.
const upsert = vi.fn(() => Promise.resolve({ error: null }))
const from = vi.fn(() => ({
  upsert,
  select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
}))
vi.mock('@/lib/supabase', () => ({ supabase: { from } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ user: { id: 'user-1' } }) }))

import { leagueSnapshotKey, snapshotSeasons } from '../historySnapshots'

function season(year: number, champion = false): HistorySeason {
  return {
    season: year,
    teams: [
      {
        teamKey: 'A',
        teamName: 'A',
        wins: 1,
        losses: 0,
        ties: 0,
        pointsFor: 0,
        rank: 1,
        madePlayoffs: false,
        champion,
      },
    ],
  }
}

describe('leagueSnapshotKey', () => {
  it('builds a stable ESPN key from sport + leagueId', () => {
    expect(leagueSnapshotKey({ platform: 'espn', sport: 'Baseball', leagueId: '12345' })).toBe(
      'espn:baseball:12345',
    )
  })
  it('extracts the Yahoo league number from a league_key', () => {
    expect(leagueSnapshotKey({ platform: 'yahoo', sport: 'baseball', leagueKey: '431.l.98765' })).toBe(
      'yahoo:baseball:98765',
    )
  })
  it('builds a Sleeper key from the chain root', () => {
    expect(leagueSnapshotKey({ platform: 'sleeper', rootLeagueId: 'abc123' })).toBe('sleeper:abc123')
  })
})

describe('snapshotSeasons', () => {
  beforeEach(() => {
    upsert.mockClear()
    from.mockClear()
  })
  it('locks finished seasons (ignoreDuplicates) and overwrites the active one', async () => {
    await snapshotSeasons({
      key: 'espn:baseball:1',
      platform: 'espn',
      sport: 'baseball',
      activeSeason: 2026,
      seasons: [season(2025), season(2026) /* active, no champion */],
    })
    // Two upsert calls: one for final rows, one for current rows.
    expect(upsert).toHaveBeenCalledTimes(2)
    const calls = upsert.mock.calls
    const finalCall = calls.find((c) => c[1].ignoreDuplicates === true)!
    const currentCall = calls.find((c) => c[1].ignoreDuplicates === false)!
    expect(finalCall[1].onConflict).toBe('league_snapshot_key,season')
    expect(finalCall[0].map((r: any) => r.season)).toEqual([2025])
    expect(finalCall[0][0].is_final).toBe(true)
    expect(finalCall[0][0].contributor_user_id).toBe('user-1')
    expect(currentCall[0].map((r: any) => r.season)).toEqual([2026])
    expect(currentCall[0][0].is_final).toBe(false)
  })
  it('treats a champion-flagged active season as final', async () => {
    await snapshotSeasons({
      key: 'espn:baseball:1',
      platform: 'espn',
      sport: 'baseball',
      activeSeason: 2026,
      seasons: [season(2026, true)],
    })
    // Only a final upsert; no current-season upsert.
    expect(upsert).toHaveBeenCalledTimes(1)
    expect(upsert.mock.calls[0][1].ignoreDuplicates).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/services/__tests__/historySnapshots.test.ts`
Expected: FAIL — cannot find module `../historySnapshots`.

- [ ] **Step 3: Write the implementation**

Create `src/services/historySnapshots.ts`:

```ts
/**
 * Durable league-history snapshots. Reads/writes the shared
 * `league_season_snapshots` table so one member's app can backfill another's.
 * Mirrors matchupSnapshots.ts: guarded on a possibly-null supabase singleton,
 * fire-and-forget writes, errors logged never thrown.
 */
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { isSeasonFinal } from '@/history/mergeSeasons'
import type { HistorySeason } from '@/history/types'

const TABLE = 'league_season_snapshots'

export type SnapshotKeyInput =
  | { platform: 'espn'; sport: string; leagueId: string }
  | { platform: 'yahoo'; sport: string; leagueKey: string }
  | { platform: 'sleeper'; rootLeagueId: string }

/** A stable per-league key, identical for every member, computable without
 *  having seen the missing seasons. */
export function leagueSnapshotKey(input: SnapshotKeyInput): string {
  if (input.platform === 'espn') return `espn:${input.sport.toLowerCase()}:${input.leagueId}`
  if (input.platform === 'sleeper') return `sleeper:${input.rootLeagueId}`
  const k = input.leagueKey
  const num = k.includes('.l.') ? k.split('.l.')[1] : k
  return `yahoo:${input.sport.toLowerCase()}:${num}`
}

/** All stored season payloads for a league key. Returns [] on any failure. */
export async function fetchSnapshots(key: string): Promise<HistorySeason[]> {
  if (!supabase || !key) return []
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('payload')
      .eq('league_snapshot_key', key)
    if (error || !data) return []
    return (data as { payload: HistorySeason }[]).map((r) => r.payload)
  } catch (e) {
    console.error('[historySnapshots] fetch failed', e)
    return []
  }
}

/** Persist the user's firsthand seasons. Finished seasons are inserted with
 *  ignoreDuplicates (first-write-wins); the active season is overwritten. */
export async function snapshotSeasons(params: {
  key: string
  platform: string
  sport: string
  activeSeason: number
  seasons: HistorySeason[]
}): Promise<void> {
  const { key, platform, sport, activeSeason, seasons } = params
  if (!supabase || !key || !seasons.length) return
  const uid = useAuthStore().user?.id
  if (!uid) return

  const row = (s: HistorySeason, final: boolean) => ({
    league_snapshot_key: key,
    platform,
    sport,
    season: s.season,
    is_final: final,
    payload: s,
    contributor_user_id: uid,
  })

  const finalRows: ReturnType<typeof row>[] = []
  const currentRows: ReturnType<typeof row>[] = []
  for (const s of seasons) {
    const final = isSeasonFinal(s.season, activeSeason, s.teams)
    ;(final ? finalRows : currentRows).push(row(s, final))
  }

  try {
    if (finalRows.length) {
      await supabase
        .from(TABLE)
        .upsert(finalRows, { onConflict: 'league_snapshot_key,season', ignoreDuplicates: true })
    }
    if (currentRows.length) {
      await supabase
        .from(TABLE)
        .upsert(currentRows, { onConflict: 'league_snapshot_key,season', ignoreDuplicates: false })
    }
  } catch (e) {
    console.error('[historySnapshots] write failed', e)
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/services/__tests__/historySnapshots.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/services/historySnapshots.ts src/services/__tests__/historySnapshots.test.ts
git -c gc.auto=0 commit -q -F - <<'EOF'
feat: history snapshot service (key, fetch, write)

leagueSnapshotKey (per-platform, stable/cross-user), fetchSnapshots,
snapshotSeasons (final=first-write-wins, active=overwrite). Mirrors
matchupSnapshots' guarded fire-and-forget style.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

## Task 4: Wire snapshots into `useLeagueHistory`

**Files:**
- Modify: `src/composables/useLeagueHistory.ts`

Add a `snapshotKey` and `backfilled` ref, set the key inside each platform loader where the ids are in scope, and add a post-load merge + write-back step. No new unit test file (the composable is integration glue over already-tested units); verification is type-check + build + full suite green.

- [ ] **Step 1: Add imports**

At the top of `src/composables/useLeagueHistory.ts`, after the existing `import type { HistorySeason, ... }` line (line 26), add:

```ts
import { leagueSnapshotKey, fetchSnapshots, snapshotSeasons } from '@/services/historySnapshots'
import { mergeHistorySeasons } from '@/history/mergeSeasons'
```

- [ ] **Step 2: Add the new refs**

In `useLeagueHistory()`, immediately after `const loaded = ref(false)` (line 40), add:

```ts
  const snapshotKey = ref('') // stable per-league key for durable snapshots
  const backfilled = ref(false) // true when stored snapshots deepened the history
```

- [ ] **Step 3: Set the key in the ESPN loader**

In `loadEspn`, immediately after the destructure `const { sport, leagueId, season: currentSeason } = parsed` (line 46), add:

```ts
    snapshotKey.value = leagueSnapshotKey({ platform: 'espn', sport, leagueId })
```

- [ ] **Step 4: Set the key in the Yahoo loader**

In `loadYahoo`, immediately after `const maxMatchupWeeks = sport === 'football' ? 17 : 30` (line 159), add:

```ts
    snapshotKey.value = leagueSnapshotKey({ platform: 'yahoo', sport, leagueKey })
```

- [ ] **Step 5: Set the key in the Sleeper loader**

In `loadSleeper`, immediately after the guard `if (!hist || !hist.seasons.length) return []` (line 294), add:

```ts
    // Chain root (oldest season's league_id) is stable across seasons and members.
    const rootLeagueId = String(
      [...hist.seasons].sort((a: any, b: any) => Number(a.season) - Number(b.season))[0]?.league_id ??
        sleeperLeagueId,
    )
    snapshotKey.value = leagueSnapshotKey({ platform: 'sleeper', rootLeagueId })
```

- [ ] **Step 6: Reset the new refs at the start of `load()`**

In `load()`, immediately after `myTeamKey.value = ''` (line 416), add:

```ts
    snapshotKey.value = ''
    backfilled.value = false
```

- [ ] **Step 7: Add the merge + write-back step**

In `load()`, replace this block (lines 425-433):

```ts
      if (leagueStore.activeLeagueId !== requested) return // stale

      result.sort((a, b) => b.season - a.season)
      data.value = result
      firstYear.value = result.length ? Math.min(...result.map((s) => s.season)) : 0

      // ESPN: resolve the user's cross-season key from the current (newest) season,
      // matching the current-season team id we hold in the points/category composables.
      loaded.value = true
```

with:

```ts
      if (leagueStore.activeLeagueId !== requested) return // stale

      result.sort((a, b) => b.season - a.season)
      data.value = result
      firstYear.value = result.length ? Math.min(...result.map((s) => s.season)) : 0

      // Durable snapshots: merge in seasons other members contributed, then persist
      // the seasons we fetched firsthand. Non-fatal — the live fetch already renders.
      try {
        const key = snapshotKey.value
        if (key) {
          const stored = await fetchSnapshots(key)
          if (leagueStore.activeLeagueId !== requested) return // stale re-check
          const merged = mergeHistorySeasons(result, stored)
          data.value = merged
          firstYear.value = merged.length ? Math.min(...merged.map((s) => s.season)) : 0
          const liveMin = result.length ? Math.min(...result.map((s) => s.season)) : 0
          backfilled.value = firstYear.value > 0 && liveMin > 0 && firstYear.value < liveMin
          const sport = String(leagueStore.activeSport || 'football')
          const activeSeason = result.length ? Math.max(...result.map((s) => s.season)) : 0
          void snapshotSeasons({ key, platform: p, sport, activeSeason, seasons: result })
        }
      } catch (e) {
        console.error('[useLeagueHistory] snapshot step failed', e)
      }

      loaded.value = true
```

- [ ] **Step 8: Expose `backfilled` in the return**

Change the final return (line 444) from:

```ts
  return { data, firstYear, platform, myTeamKey, loading, loaded, load }
```

to:

```ts
  return { data, firstYear, platform, myTeamKey, backfilled, loading, loaded, load }
```

- [ ] **Step 9: Type-check, build, and run the full suite**

Run: `npx vue-tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: `62` (unchanged baseline).

Run: `npx vue-tsc --noEmit 2>&1 | grep -E "useLeagueHistory|historySnapshots|mergeSeasons" || echo "none in touched files"`
Expected: `none in touched files`.

Run: `npx vitest run 2>&1 | tail -4`
Expected: all test files pass (≥ 420 tests).

Run: `npm run build 2>&1 | tail -3`
Expected: `✓ built in …` with no errors.

- [ ] **Step 10: Commit**

```bash
git add src/composables/useLeagueHistory.ts
git -c gc.auto=0 commit -q -F - <<'EOF'
feat: wire durable snapshots into useLeagueHistory

Post-load: fetch stored league snapshots, merge (live wins), recompute
firstYear, expose `backfilled`, and fire-and-forget persist firsthand
seasons. Non-fatal — falls back to live-only on any failure.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

## Task 5: Depth-aware history note in `HistoryView`

**Files:**
- Modify: `src/views/HistoryView.vue`

When snapshots pushed history earlier than the user's own membership, show a positive note; otherwise keep the ESPN caveat. No unit test (presentational); verify via type-check + build.

- [ ] **Step 1: Expose `backfilled` in the view script**

In `src/views/HistoryView.vue`, immediately after `const isEspn = computed(() => history.platform.value === 'espn')` (line 24), add:

```ts
const backfilled = computed(() => history.backfilled.value)
```

- [ ] **Step 2: Replace the ESPN note with the depth-aware version**

Replace this block (currently around lines 183-189):

```html
      <!-- ESPN membership note -->
      <p
        v-if="isEspn"
        class="mb-6 rounded-lg border border-dark-border/50 bg-dark-card px-3 py-2 font-mono text-[11px] leading-snug text-dark-textMuted"
      >
        ESPN only shares seasons you've been a member of, so your history starts at
        <span class="text-dark-text">{{ firstYear }}</span>. It'll grow each season.
      </p>
```

with:

```html
      <!-- History depth note: positive when league snapshots deepened it, else the ESPN caveat. -->
      <p
        v-if="backfilled"
        class="mb-6 rounded-lg border border-dark-border/50 bg-dark-card px-3 py-2 font-mono text-[11px] leading-snug text-dark-textMuted"
      >
        History runs back to <span class="text-dark-text">{{ firstYear }}</span>, filled in from
        seasons your leaguemates contributed. It deepens as more of the league joins.
      </p>
      <p
        v-else-if="isEspn"
        class="mb-6 rounded-lg border border-dark-border/50 bg-dark-card px-3 py-2 font-mono text-[11px] leading-snug text-dark-textMuted"
      >
        ESPN only shares seasons you've been a member of, so your history starts at
        <span class="text-dark-text">{{ firstYear }}</span>. It'll grow each season.
      </p>
```

- [ ] **Step 3: Type-check and build**

Run: `npx vue-tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: `62`.

Run: `npx vue-tsc --noEmit 2>&1 | grep -E "HistoryView" || echo "none in touched files"`
Expected: `none in touched files`.

Run: `npm run build 2>&1 | tail -3`
Expected: `✓ built in …`.

- [ ] **Step 4: Commit**

```bash
git add src/views/HistoryView.vue
git -c gc.auto=0 commit -q -F - <<'EOF'
feat: depth-aware history note (snapshot backfill vs ESPN caveat)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

## Final verification (after all tasks)

- [ ] Full suite green: `npx vitest run 2>&1 | tail -4`
- [ ] Type-check baseline holds: `npx vue-tsc --noEmit 2>&1 | grep -c "error TS"` → `62`, and none in touched files.
- [ ] Build clean: `npm run build 2>&1 | tail -3`.
- [ ] Nothing pushed; all commits on `redesign/my-team-first`.
- [ ] Controller relays the manual prod action from Task 1 Step 4 to the user (apply the migration in the Supabase SQL editor).

## Known limitations (carry into the summary, from the spec)

- Open-read RLS: any authenticated UFD user can read a league's snapshot payload if they know the key (keys derive from non-secret platform league ids). Matches `matchup_snapshots`.
- Yahoo keying degrades to per-user persistence if league numbers aren't stable across seasons.
- Truly pre-app seasons need the deferred Phase 2b manual commissioner backfill.
