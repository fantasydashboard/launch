# History Manual Backfill (Phase 2b) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an inline "add a past season" form to the League History page so any signed-in league member can hand-enter seasons that predate anyone's app membership, surfacing them in Champions / All-time / Legacy.

**Architecture:** Manual entries are ordinary `HistorySeason` payloads written to the existing `league_season_snapshots` table with `source='manual'`. They flow through the unchanged Phase 2a merge (`mergeHistorySeasons`, live-wins) and every unchanged builder. New: a pure form→`HistorySeason` assembler, two service functions (`saveManualSeason` / `deleteManualSeason`) that report their outcome, a provenance-carrying fetch, per-season origin threaded through the composable, and an inline Vue form.

**Tech Stack:** Vue 3 (`<script setup>` + Composition API), TypeScript, Pinia, Supabase (Postgres + RLS), Vitest.

**Spec:** `docs/superpowers/specs/2026-07-12-history-commissioner-backfill-design.md`

**Standing constraints (do not violate):**
- All work stays on branch `redesign/my-team-first`. NEVER push, deploy, PR, or merge.
- Type-check baseline is **62 errors, none in touched files**. Build must stay clean. All tests pass.
- The prod table + `source` column + all five RLS policies were already applied on 2026-07-12 via a combined SQL script. **This plan requires NO further prod DDL.** Task 1 only reconciles the committed migration files with that reality.
- Commit with `git -c gc.auto=0 commit -q -F - <<'EOF' … EOF`, message ending:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. NO push.
- zsh has exclamation-mark issues — if a script is needed, write it to `/tmp/`.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `supabase/migrations/20260712_league_snapshots_manual_backfill.sql` | **new** — repo reconciliation: `alter add source` + the two contributor-owns-manual RLS policies. (Prod already has these; this makes a fresh `db reset` reach the same schema.) |
| `src/history/manualSeason.ts` | **new**, pure — `buildManualSeason(input): HistorySeason`. Form fields → normalized payload. No I/O. |
| `src/history/__tests__/manualSeason.test.ts` | **new** — unit tests for the assembler. |
| `src/services/historySnapshots.ts` | **modify** — extract a shared row builder; `snapshotSeasons` writes `source:'auto'`; add `saveManualSeason`, `deleteManualSeason`, `fetchSnapshotRows`; reimplement `fetchSnapshots` on top of it. |
| `src/services/__tests__/historySnapshots.test.ts` | **modify** — controllable mock (delete + auth toggle); tests for save/delete/rows. |
| `src/composables/useLeagueHistory.ts` | **modify** — a `sport` ref, an `origin` map (per-season source + contributor), switch the read to `fetchSnapshotRows`, expose `snapshotKey`/`sport`/`origin`. |
| `src/components/history/BackfillSeason.vue` | **new** — inline collapsible add/edit form (champions-only + optional standings). |
| `src/views/HistoryView.vue` | **modify** — mount `BackfillSeason`; render provenance + edit/remove on the caller's own manual Champions rows. |

**Type-check note (verified in Phase 2a):** `historySnapshots.ts` calls `supabase.from('league_season_snapshots')` even though that table is absent from the `Database` type in `src/types/supabase.ts`, and it compiles clean. Keep doing that — do NOT edit `src/types/supabase.ts`.

---

## Task 1: Migration reconciliation file

**Files:**
- Create: `supabase/migrations/20260712_league_snapshots_manual_backfill.sql`

No automated test (DDL). Verification: the file exists, is valid SQL, and is committed. Prod already has these objects (applied 2026-07-12); this file only keeps a fresh checkout's migrations honest.

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/20260712_league_snapshots_manual_backfill.sql` with exactly:

```sql
-- Phase 2b: manual league-history backfill.
-- Adds a `source` column distinguishing platform-captured ('auto') seasons from
-- hand-entered ('manual') ones, plus RLS letting a contributor manage their OWN
-- manual rows even once the season is final. Applied to prod on 2026-07-12 as part
-- of the combined create script; committed here so a fresh db reset matches prod.
alter table public.league_season_snapshots
  add column if not exists source text not null default 'auto';

-- Manual backfill: a contributor may fix/relock their OWN hand-entered rows even
-- when is_final = true. Auto rows remain governed by "update only non-final".
drop policy if exists "contributor manages own manual rows" on public.league_season_snapshots;
create policy "contributor manages own manual rows"
  on public.league_season_snapshots for update to authenticated
  using (source = 'manual' and auth.uid() = contributor_user_id)
  with check (source = 'manual' and auth.uid() = contributor_user_id);

drop policy if exists "contributor deletes own manual rows" on public.league_season_snapshots;
create policy "contributor deletes own manual rows"
  on public.league_season_snapshots for delete to authenticated
  using (source = 'manual' and auth.uid() = contributor_user_id);
```

- [ ] **Step 2: Verify the file parses as expected**

Run: `grep -c "create policy" supabase/migrations/20260712_league_snapshots_manual_backfill.sql`
Expected: `2`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260712_league_snapshots_manual_backfill.sql
git -c gc.auto=0 commit -q -F - <<'EOF'
feat: migration reconcile — source column + manual-row RLS

Repo-side match for the combined script already applied to prod 2026-07-12.
No new prod DDL; a fresh db reset now reaches the same schema.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

## Task 2: Pure `buildManualSeason` assembler

**Files:**
- Create: `src/history/manualSeason.ts`
- Test: `src/history/__tests__/manualSeason.test.ts`

`HistorySeason`/`HistoryTeam` are defined in `src/history/types.ts` (already exists). `HistoryTeam`
requires `teamKey, teamName, wins, losses, ties, pointsFor, rank, madePlayoffs, champion`
(`teamLogo`, `playoffSeed` optional).

- [ ] **Step 1: Write the failing test**

Create `src/history/__tests__/manualSeason.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildManualSeason } from '../manualSeason'

describe('buildManualSeason — champions-only', () => {
  it('builds a single champion team flagged rank 1', () => {
    const s = buildManualSeason({ season: 2019, champion: 'The Dynasty' })
    expect(s.season).toBe(2019)
    expect(s.teams).toHaveLength(1)
    expect(s.teams[0]).toMatchObject({
      teamName: 'The Dynasty',
      teamKey: 'n:the dynasty',
      rank: 1,
      champion: true,
      wins: 0,
      losses: 0,
      ties: 0,
      pointsFor: 0,
      madePlayoffs: false,
    })
  })
  it('adds a runner-up at rank 2 when provided', () => {
    const s = buildManualSeason({ season: 2019, champion: 'Champs', runnerUp: 'Almost' })
    expect(s.teams.map((t) => [t.rank, t.teamName, t.champion])).toEqual([
      [1, 'Champs', true],
      [2, 'Almost', false],
    ])
  })
  it('ignores a blank runner-up', () => {
    const s = buildManualSeason({ season: 2019, champion: 'Champs', runnerUp: '   ' })
    expect(s.teams).toHaveLength(1)
  })
  it('trims names into both display + key', () => {
    const s = buildManualSeason({ season: 2019, champion: '  Big Dogs  ' })
    expect(s.teams[0].teamName).toBe('Big Dogs')
    expect(s.teams[0].teamKey).toBe('n:big dogs')
  })
})

describe('buildManualSeason — full standings', () => {
  it('ranks by row order, flags row 1 champion, keeps W-L-T', () => {
    const s = buildManualSeason({
      season: 2018,
      champion: 'ignored when standings present',
      standings: [
        { name: 'First', wins: 11, losses: 3, ties: 0 },
        { name: 'Second', wins: 10, losses: 4 },
        { name: 'Third', wins: 9, losses: 5, ties: 0 },
      ],
    })
    expect(s.teams).toHaveLength(3)
    expect(s.teams[0]).toMatchObject({ teamName: 'First', rank: 1, champion: true, wins: 11, losses: 3 })
    expect(s.teams[1]).toMatchObject({ teamName: 'Second', rank: 2, champion: false, wins: 10, losses: 4, ties: 0 })
    expect(s.teams[2]).toMatchObject({ teamName: 'Third', rank: 3, champion: false, wins: 9 })
  })
  it('skips blank standings rows and re-ranks the rest', () => {
    const s = buildManualSeason({
      season: 2018,
      champion: 'x',
      standings: [{ name: 'A', wins: 5 }, { name: '  ' }, { name: 'B', wins: 3 }],
    })
    expect(s.teams.map((t) => [t.rank, t.teamName])).toEqual([
      [1, 'A'],
      [2, 'B'],
    ])
  })
  it('clamps negative numbers to zero', () => {
    const s = buildManualSeason({ season: 2018, champion: 'x', standings: [{ name: 'A', wins: -4, losses: -1 }] })
    expect(s.teams[0]).toMatchObject({ wins: 0, losses: 0 })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/history/__tests__/manualSeason.test.ts`
Expected: FAIL — cannot find module `../manualSeason`.

- [ ] **Step 3: Write the implementation**

Create `src/history/manualSeason.ts`:

```ts
/**
 * Pure assembler: turns the hand-entered backfill form fields into a normalized
 * `HistorySeason` payload, so the merge + builders consume it exactly like a
 * platform-fetched season. Deterministic, no I/O.
 *
 * Manual teams have no owner/manager id (these years predate app membership), so
 * their cross-season identity key is the normalized name — matching Yahoo's name
 * fallback, which lets manual entries link to name-keyed auto seasons where names
 * agree (documented limitation: they won't link to id-keyed ESPN/Sleeper teams).
 */
import type { HistorySeason, HistoryTeam } from './types'

export interface ManualStandingRow {
  name: string
  wins?: number
  losses?: number
  ties?: number
}

export interface ManualSeasonInput {
  season: number
  champion: string
  runnerUp?: string
  /** Ordered finishing list; index 0 = 1st place. When present, overrides champion/runnerUp. */
  standings?: ManualStandingRow[]
}

const nameKey = (name: string) => 'n:' + name.trim().toLowerCase()
const nonNeg = (n: unknown) => Math.max(0, Number(n) || 0)

function manualTeam(name: string, rank: number, rec?: ManualStandingRow): HistoryTeam {
  return {
    teamKey: nameKey(name),
    teamName: name.trim(),
    wins: nonNeg(rec?.wins),
    losses: nonNeg(rec?.losses),
    ties: nonNeg(rec?.ties),
    pointsFor: 0,
    rank,
    madePlayoffs: false,
    champion: rank === 1,
  }
}

export function buildManualSeason(input: ManualSeasonInput): HistorySeason {
  const teams: HistoryTeam[] = []
  if (input.standings && input.standings.length) {
    for (const row of input.standings) {
      if (!row.name || !row.name.trim()) continue
      teams.push(manualTeam(row.name, teams.length + 1, row))
    }
  } else {
    teams.push(manualTeam(input.champion, 1))
    if (input.runnerUp && input.runnerUp.trim()) teams.push(manualTeam(input.runnerUp, 2))
  }
  return { season: input.season, teams }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/history/__tests__/manualSeason.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/history/manualSeason.ts src/history/__tests__/manualSeason.test.ts
git -c gc.auto=0 commit -q -F - <<'EOF'
feat: buildManualSeason — form fields to normalized HistorySeason

Champions-only or full-standings; name-keyed identity; clamps records.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

## Task 3: Service — save/delete/rows + shared row builder

**Files:**
- Modify: `src/services/historySnapshots.ts`
- Test: `src/services/__tests__/historySnapshots.test.ts`

- [ ] **Step 1: Replace the test file's mock + add save/delete/rows tests**

The existing mock exposes only `upsert` + `select`, and a static auth user. Replace the top of
`src/services/__tests__/historySnapshots.test.ts` (lines 1–17, from the imports through the
`import { leagueSnapshotKey, snapshotSeasons } from '../historySnapshots'` line) with a
controllable mock and the wider import. Everything from `function season(...)` downward stays.

Replace lines 1–17 with:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { HistorySeason } from '@/history/types'

// Controllable mock Supabase client. vi.hoisted so it's ready when vi.mock factories run.
const { upsert, del, selectEq, from, authRef } = vi.hoisted(() => {
  const upsert = vi.fn(() => Promise.resolve({ error: null }))
  const selectEq = vi.fn(() => Promise.resolve({ data: [] as any[], error: null }))
  // delete().eq(key).eq(season) → resolves { error }
  const del = vi.fn(() => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }))
  const from = vi.fn(() => ({
    upsert,
    select: () => ({ eq: selectEq }),
    delete: del,
  }))
  const authRef = { user: { id: 'user-1' } as { id: string } | null }
  return { upsert, del, selectEq, from, authRef }
})
vi.mock('@/lib/supabase', () => ({ supabase: { from } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ user: authRef.user }) }))

import {
  leagueSnapshotKey,
  snapshotSeasons,
  saveManualSeason,
  deleteManualSeason,
  fetchSnapshotRows,
} from '../historySnapshots'
```

Then, at the END of the file (after the closing `})` of the `snapshotSeasons` describe block),
append:

```ts
describe('saveManualSeason', () => {
  beforeEach(() => {
    upsert.mockClear()
    upsert.mockResolvedValue({ error: null })
    authRef.user = { id: 'user-1' }
  })
  it('writes a manual, final row for a past season', async () => {
    const res = await saveManualSeason({
      key: 'espn:baseball:1',
      platform: 'espn',
      sport: 'baseball',
      activeSeason: 2026,
      season: season(2019),
    })
    expect(res).toEqual({ ok: true })
    expect(upsert).toHaveBeenCalledTimes(1)
    const [rows, opts] = upsert.mock.calls[0]
    const row = Array.isArray(rows) ? rows[0] : rows
    expect(row).toMatchObject({
      league_snapshot_key: 'espn:baseball:1',
      season: 2019,
      source: 'manual',
      is_final: true,
      contributor_user_id: 'user-1',
    })
    // Upsert must be able to UPDATE the caller's own row → not ignoreDuplicates.
    expect(opts.onConflict).toBe('league_snapshot_key,season')
    expect(opts.ignoreDuplicates).not.toBe(true)
  })
  it('returns reason "auth" when logged out', async () => {
    authRef.user = null
    const res = await saveManualSeason({
      key: 'k', platform: 'espn', sport: 'baseball', activeSeason: 2026, season: season(2019),
    })
    expect(res).toEqual({ ok: false, reason: 'auth' })
    expect(upsert).not.toHaveBeenCalled()
  })
  it('returns reason "conflict" when the upsert is blocked (RLS)', async () => {
    upsert.mockResolvedValueOnce({ error: { message: 'permission denied' } })
    const res = await saveManualSeason({
      key: 'k', platform: 'espn', sport: 'baseball', activeSeason: 2026, season: season(2019),
    })
    expect(res).toEqual({ ok: false, reason: 'conflict' })
  })
})

describe('deleteManualSeason', () => {
  beforeEach(() => del.mockClear())
  it('issues a delete for the key + season', async () => {
    const res = await deleteManualSeason('espn:baseball:1', 2019)
    expect(res).toEqual({ ok: true })
    expect(del).toHaveBeenCalledTimes(1)
  })
})

describe('fetchSnapshotRows', () => {
  beforeEach(() => selectEq.mockClear())
  it('maps rows to season/source/contributor/payload', async () => {
    selectEq.mockResolvedValueOnce({
      data: [
        { season: 2019, source: 'manual', contributor_user_id: 'u2', payload: season(2019) },
        { season: 2020, source: 'auto', contributor_user_id: 'u3', payload: season(2020) },
      ],
      error: null,
    })
    const rows = await fetchSnapshotRows('espn:baseball:1')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ season: 2019, source: 'manual', contributorUserId: 'u2' })
    expect(rows[0].payload.season).toBe(2019)
    expect(rows[1]).toMatchObject({ season: 2020, source: 'auto', contributorUserId: 'u3' })
  })
  it('returns [] on a Supabase error', async () => {
    selectEq.mockResolvedValueOnce({ data: null, error: { message: 'boom' } })
    expect(await fetchSnapshotRows('k')).toEqual([])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/services/__tests__/historySnapshots.test.ts`
Expected: FAIL — `saveManualSeason`, `deleteManualSeason`, `fetchSnapshotRows` are not exported.
(The existing `leagueSnapshotKey` / `snapshotSeasons` tests should still pass.)

- [ ] **Step 3: Edit `historySnapshots.ts` — extract the row builder + write source:'auto'**

In `src/services/historySnapshots.ts`, replace the `snapshotSeasons` function's inner `row`
helper and its use with a shared module-level builder. Replace this block (currently lines
59–67):

```ts
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
    const final = isSeasonFinal(s.season, activeSeason)
    ;(final ? finalRows : currentRows).push(row(s, final))
  }
```

with:

```ts
  const finalRows: SnapshotRowValues[] = []
  const currentRows: SnapshotRowValues[] = []
  for (const s of seasons) {
    const final = isSeasonFinal(s.season, activeSeason)
    ;(final ? finalRows : currentRows).push(
      buildSnapshotRow({ key, platform, sport, uid, season: s, isFinal: final, source: 'auto' }),
    )
  }
```

- [ ] **Step 4: Add the shared builder + new exports**

Still in `src/services/historySnapshots.ts`, add the shared row builder immediately after the
`const TABLE = 'league_season_snapshots'` line (line 12):

```ts

type SnapshotSource = 'auto' | 'manual'

interface SnapshotRowValues {
  league_snapshot_key: string
  platform: string
  sport: string
  season: number
  is_final: boolean
  payload: HistorySeason
  contributor_user_id: string
  source: SnapshotSource
}

/** One table row's column values. Shared by the auto snapshotter and manual backfill. */
function buildSnapshotRow(params: {
  key: string
  platform: string
  sport: string
  uid: string
  season: HistorySeason
  isFinal: boolean
  source: SnapshotSource
}): SnapshotRowValues {
  return {
    league_snapshot_key: params.key,
    platform: params.platform,
    sport: params.sport,
    season: params.season.season,
    is_final: params.isFinal,
    payload: params.season,
    contributor_user_id: params.uid,
    source: params.source,
  }
}

/** A stored snapshot row with provenance (source + first contributor). */
export interface SnapshotRow {
  season: number
  source: SnapshotSource
  contributorUserId: string
  payload: HistorySeason
}
```

Then replace the existing `fetchSnapshots` function (currently lines 29–43, the
`/** All stored season payloads … */` doc through its closing brace) with a provenance-aware
`fetchSnapshotRows` plus a thin `fetchSnapshots` on top of it:

```ts
/** All stored rows (payload + provenance) for a league key. Returns [] on any failure. */
export async function fetchSnapshotRows(key: string): Promise<SnapshotRow[]> {
  if (!supabase || !key) return []
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('season, source, contributor_user_id, payload')
      .eq('league_snapshot_key', key)
    if (error || !data) return []
    return (data as any[]).map((r) => ({
      season: Number(r.season),
      source: (r.source === 'manual' ? 'manual' : 'auto') as SnapshotSource,
      contributorUserId: String(r.contributor_user_id ?? ''),
      payload: r.payload as HistorySeason,
    }))
  } catch (e) {
    console.error('[historySnapshots] fetch rows failed', e)
    return []
  }
}

/** Convenience: just the payloads (used by the merge step). */
export async function fetchSnapshots(key: string): Promise<HistorySeason[]> {
  return (await fetchSnapshotRows(key)).map((r) => r.payload)
}
```

- [ ] **Step 5: Add `saveManualSeason` + `deleteManualSeason`**

Append to the end of `src/services/historySnapshots.ts`:

```ts

/**
 * Persist one hand-entered ("manual") past season. Unlike snapshotSeasons this REPORTS
 * its outcome — the UI needs to know it saved. Upserts on (key, season) WITHOUT
 * ignoreDuplicates so the contributor can update their own row (RLS permits). A conflict
 * with an auto row or another member's manual row is blocked by RLS → reason 'conflict'.
 */
export async function saveManualSeason(params: {
  key: string
  platform: string
  sport: string
  activeSeason: number
  season: HistorySeason
}): Promise<{ ok: true } | { ok: false; reason: 'conflict' | 'auth' | 'error' }> {
  const { key, platform, sport, activeSeason, season } = params
  if (!supabase || !key) return { ok: false, reason: 'error' }
  const uid = useAuthStore().user?.id
  if (!uid) return { ok: false, reason: 'auth' }

  const isFinal = isSeasonFinal(season.season, activeSeason)
  const rowValues = buildSnapshotRow({ key, platform, sport, uid, season, isFinal, source: 'manual' })
  try {
    const { error } = await supabase
      .from(TABLE)
      .upsert(rowValues, { onConflict: 'league_snapshot_key,season' })
    if (error) {
      console.error('[historySnapshots] saveManualSeason blocked', error)
      return { ok: false, reason: 'conflict' }
    }
    return { ok: true }
  } catch (e) {
    console.error('[historySnapshots] saveManualSeason failed', e)
    return { ok: false, reason: 'error' }
  }
}

/** Delete the caller's own manual row for a season. RLS enforces source='manual' + owner. */
export async function deleteManualSeason(key: string, season: number): Promise<{ ok: boolean }> {
  if (!supabase || !key) return { ok: false }
  try {
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq('league_snapshot_key', key)
      .eq('season', season)
    return { ok: !error }
  } catch (e) {
    console.error('[historySnapshots] deleteManualSeason failed', e)
    return { ok: false }
  }
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/services/__tests__/historySnapshots.test.ts`
Expected: PASS (all — the original `leagueSnapshotKey`/`snapshotSeasons` tests plus the new
save/delete/rows tests).

- [ ] **Step 7: Type-check the touched file**

Run: `npx vue-tsc --noEmit 2>&1 | grep -E "historySnapshots" || echo "none in touched files"`
Expected: `none in touched files`.

- [ ] **Step 8: Commit**

```bash
git add src/services/historySnapshots.ts src/services/__tests__/historySnapshots.test.ts
git -c gc.auto=0 commit -q -F - <<'EOF'
feat: manual-backfill service (save/delete/rows + provenance fetch)

saveManualSeason/deleteManualSeason report outcomes; fetchSnapshotRows
carries source + contributor; snapshotSeasons now writes source:'auto'
via a shared row builder. fetchSnapshots reimplemented on top.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

## Task 4: Thread `sport` + per-season `origin` through the composable

**Files:**
- Modify: `src/composables/useLeagueHistory.ts`

No new unit test (integration glue over tested units); verification is type-check + build + full
suite. The composable currently calls `fetchSnapshots` in `load()`; switch it to
`fetchSnapshotRows` so one fetch yields both payloads (for the merge) and provenance (for origin).

- [ ] **Step 1: Update the service import**

In `src/composables/useLeagueHistory.ts`, replace the import on line 27:

```ts
import { leagueSnapshotKey, fetchSnapshots, snapshotSeasons } from '@/services/historySnapshots'
```

with:

```ts
import { leagueSnapshotKey, fetchSnapshotRows, snapshotSeasons } from '@/services/historySnapshots'
```

- [ ] **Step 2: Add the `sport` + `origin` refs and their type**

In `src/composables/useLeagueHistory.ts`, immediately after line 44
(`const backfilled = ref(false) // …`), add:

```ts
  const sport = ref('') // resolved sport, exposed so the backfill form can label its writes
  // Per-season provenance for seasons that came from STORAGE (not the user's live fetch).
  const origin = ref<Map<number, { source: 'auto' | 'manual'; contributorUserId: string; isMine: boolean }>>(
    new Map(),
  )
```

> **Why `sport` is resolved centrally, not per-loader:** `loadEspn` and `loadYahoo` each have a
> local `const sport` that would shadow the ref, so we set the ref once in `load()` from
> `leagueStore.activeSport` (the value is only used to label the DB row — informational).

- [ ] **Step 3: Reset `sport` + `origin` at the start of `load()`**

In `load()`, immediately after the existing lines (line 429–430):

```ts
    snapshotKey.value = ''
    backfilled.value = false
```

add:

```ts
    sport.value = String(leagueStore.activeSport || 'football')
    origin.value = new Map()
```

- [ ] **Step 4: Switch the read to `fetchSnapshotRows` + build the origin map**

In `load()`, replace the durable-snapshots block (currently lines 447–469, the
`try { const key = snapshotKey.value … } catch (e) { … }` block) with:

```ts
      try {
        const key = snapshotKey.value
        if (key) {
          const rows = await fetchSnapshotRows(key)
          if (leagueStore.activeLeagueId !== requested) return // stale re-check
          const stored = rows.map((r) => r.payload)
          const merged = mergeHistorySeasons(result, stored)
          // Only re-render + compute provenance when storage actually deepened history
          // (merge only ADDS seasons the live fetch lacked). Skips a redundant render on
          // the common no-backfill path.
          if (merged.length > result.length) {
            data.value = merged
            firstYear.value = Math.min(...merged.map((s) => s.season))
            const liveMin = result.length ? Math.min(...result.map((s) => s.season)) : 0
            backfilled.value = liveMin > 0 && firstYear.value < liveMin

            // Provenance only for stored-origin seasons (live wins on overlap, so a season
            // the user fetched firsthand is never "from storage").
            const liveSeasons = new Set(result.map((s) => s.season))
            const uid = useAuthStore().user?.id ?? ''
            const om = new Map<number, { source: 'auto' | 'manual'; contributorUserId: string; isMine: boolean }>()
            for (const r of rows) {
              if (liveSeasons.has(r.season)) continue
              om.set(r.season, {
                source: r.source,
                contributorUserId: r.contributorUserId,
                isMine: r.source === 'manual' && !!uid && r.contributorUserId === uid,
              })
            }
            origin.value = om
          }
          const activeSeason = result.length ? Math.max(...result.map((s) => s.season)) : 0
          void snapshotSeasons({ key, platform: p, sport: sport.value, activeSeason, seasons: result })
        }
      } catch (e) {
        console.error('[useLeagueHistory] snapshot step failed', e)
      }
```

- [ ] **Step 5: Expose the new refs**

Change the final return (line 482) from:

```ts
  return { data, firstYear, platform, myTeamKey, backfilled, loading, loaded, load }
```

to:

```ts
  return { data, firstYear, platform, sport, myTeamKey, backfilled, snapshotKey, origin, loading, loaded, load }
```

- [ ] **Step 6: Type-check, build, full suite**

Run: `npx vue-tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: `62`.

Run: `npx vue-tsc --noEmit 2>&1 | grep -E "useLeagueHistory" || echo "none in touched files"`
Expected: `none in touched files`.

Run: `npx vitest run 2>&1 | tail -4`
Expected: all test files pass.

Run: `npm run build 2>&1 | tail -3`
Expected: `✓ built in …`.

- [ ] **Step 7: Commit**

```bash
git add src/composables/useLeagueHistory.ts
git -c gc.auto=0 commit -q -F - <<'EOF'
feat: thread sport + per-season origin through useLeagueHistory

fetchSnapshotRows (one fetch) yields payloads for merge + provenance for
the origin map (stored-origin seasons only). Expose snapshotKey/sport/origin
for the backfill form.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

## Task 5: The `BackfillSeason.vue` inline form

**Files:**
- Create: `src/components/history/BackfillSeason.vue`

Presentational — no unit test (verification is type-check + build; behavior is exercised in
Task 7's manual run). Reuses the redesign terminal aesthetic (mono, `bg-dark-card`,
`text-dark-*`, lime primary) already used by `HistoryView.vue`.

- [ ] **Step 1: Create the component**

Create `src/components/history/BackfillSeason.vue`:

```vue
<script setup lang="ts">
/**
 * Inline "add / edit a past season" form for the League History page. Collapsed to one
 * quiet affordance; expands to a champions-only fast path with an optional full-standings
 * disclosure. Writes via saveManualSeason and emits `saved` so the parent reloads history.
 *
 * ADD mode: pick a missing year (< firstYear, not already present).
 * EDIT mode: parent passes a `prefill` HistorySeason (the caller's own manual row); the
 * season is fixed and fields are populated from it. Save upserts (updates the own row).
 */
import { computed, reactive, ref, watch } from 'vue'
import type { HistorySeason } from '@/history/types'
import { buildManualSeason, type ManualStandingRow } from '@/history/manualSeason'
import { saveManualSeason } from '@/services/historySnapshots'

const props = defineProps<{
  snapshotKey: string
  platform: string
  sport: string
  firstYear: number
  activeSeason: number
  existingSeasons: number[]
  prefill: HistorySeason | null
  canWrite: boolean
}>()

const emit = defineEmits<{ (e: 'saved'): void; (e: 'cancel-edit'): void }>()

const open = ref(false)
const editMode = computed(() => !!props.prefill)

const form = reactive({
  season: 0,
  champion: '',
  runnerUp: '',
  showStandings: false,
  standings: [] as ManualStandingRow[],
})
const saving = ref(false)
const errorMsg = ref('')

// Candidate years for ADD: the 15 years before firstYear, minus any already on record.
const candidateYears = computed(() => {
  const base = props.firstYear || props.activeSeason
  if (!base) return []
  const taken = new Set(props.existingSeasons)
  const years: number[] = []
  for (let y = base - 1; y >= base - 15; y--) if (!taken.has(y)) years.push(y)
  return years
})

function resetForm() {
  form.season = candidateYears.value[0] ?? 0
  form.champion = ''
  form.runnerUp = ''
  form.showStandings = false
  form.standings = [
    { name: '', wins: undefined, losses: undefined, ties: undefined },
    { name: '', wins: undefined, losses: undefined, ties: undefined },
  ]
  errorMsg.value = ''
}

// Populate from a prefill (edit mode): reconstruct champions-only vs standings.
function populateFromPrefill(season: HistorySeason) {
  const teams = [...season.teams].sort((a, b) => a.rank - b.rank)
  const hasRecords = teams.length > 2 || teams.some((t) => t.wins || t.losses || t.ties)
  form.season = season.season
  errorMsg.value = ''
  if (hasRecords) {
    form.showStandings = true
    form.standings = teams.map((t) => ({ name: t.teamName, wins: t.wins, losses: t.losses, ties: t.ties }))
    form.champion = teams[0]?.teamName ?? ''
    form.runnerUp = ''
  } else {
    form.showStandings = false
    form.champion = teams[0]?.teamName ?? ''
    form.runnerUp = teams[1]?.teamName ?? ''
    form.standings = [
      { name: '', wins: undefined, losses: undefined, ties: undefined },
      { name: '', wins: undefined, losses: undefined, ties: undefined },
    ]
  }
}

// Open + populate when a prefill arrives; close when it clears.
watch(
  () => props.prefill,
  (p) => {
    if (p) {
      open.value = true
      populateFromPrefill(p)
    }
  },
  { immediate: true },
)

function expand() {
  resetForm()
  open.value = true
}
function cancel() {
  open.value = false
  errorMsg.value = ''
  if (editMode.value) emit('cancel-edit')
}
function addStandingRow() {
  form.standings.push({ name: '', wins: undefined, losses: undefined, ties: undefined })
}

const canSubmit = computed(() => {
  if (!form.season) return false
  if (form.showStandings) return form.standings.some((r) => r.name.trim())
  return !!form.champion.trim()
})

async function submit() {
  if (!canSubmit.value || saving.value) return
  errorMsg.value = ''
  saving.value = true
  try {
    const season = buildManualSeason({
      season: form.season,
      champion: form.champion,
      runnerUp: form.runnerUp,
      standings: form.showStandings ? form.standings : undefined,
    })
    const res = await saveManualSeason({
      key: props.snapshotKey,
      platform: props.platform,
      sport: props.sport,
      activeSeason: props.activeSeason,
      season,
    })
    if (res.ok) {
      open.value = false
      if (editMode.value) emit('cancel-edit')
      emit('saved')
      return
    }
    errorMsg.value =
      res.reason === 'auth'
        ? 'Sign in to add history.'
        : res.reason === 'conflict'
          ? "That season's already on record."
          : "Couldn't save right now — try again."
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mb-6">
    <!-- Not signed in → a muted hint, no form. -->
    <p
      v-if="!canWrite"
      class="rounded-lg border border-dark-border/50 bg-dark-card px-3 py-2 font-mono text-[11px] text-dark-textMuted"
    >
      Sign in to add seasons from before {{ firstYear }}.
    </p>

    <!-- Collapsed affordance (only when there are earlier years to add). -->
    <button
      v-else-if="!open && candidateYears.length"
      class="font-mono text-[11px] text-dark-textMuted transition-colors hover:text-dark-text"
      @click="expand"
    >
      ⊕ Add a season before {{ firstYear }}
    </button>

    <!-- Expanded form. -->
    <div
      v-else-if="open"
      class="rounded-xl border border-dark-border bg-dark-card px-4 py-4"
    >
      <div class="mb-3 flex items-center justify-between">
        <h3 class="font-display text-sm font-bold text-dark-text">
          {{ editMode ? 'Edit season ' + form.season : 'Add a past season' }}
        </h3>
        <button class="font-mono text-[11px] text-dark-textMuted hover:text-dark-text" @click="cancel">
          cancel
        </button>
      </div>

      <!-- Season selector (fixed in edit mode). -->
      <div class="mb-3 flex items-center gap-2">
        <label class="w-20 font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">Season</label>
        <span v-if="editMode" class="font-mono text-sm text-dark-text">{{ form.season }}</span>
        <select
          v-else
          v-model.number="form.season"
          class="rounded-lg border border-dark-border bg-dark-bg px-2.5 py-1 font-mono text-[12px] text-dark-text focus:border-dark-textMuted focus:outline-none"
        >
          <option v-for="y in candidateYears" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>

      <!-- Champions-only fast path. -->
      <template v-if="!form.showStandings">
        <div class="mb-2 flex items-center gap-2">
          <label class="w-20 shrink-0 font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">Champion</label>
          <input
            v-model="form.champion"
            type="text"
            placeholder="Team name"
            class="min-w-0 flex-1 rounded-lg border border-dark-border bg-dark-bg px-2.5 py-1 font-mono text-[12px] text-dark-text focus:border-dark-textMuted focus:outline-none"
          />
          <span class="shrink-0 font-mono text-[11px] text-primary">★</span>
        </div>
        <div class="mb-3 flex items-center gap-2">
          <label class="w-20 shrink-0 font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">Runner-up</label>
          <input
            v-model="form.runnerUp"
            type="text"
            placeholder="Optional"
            class="min-w-0 flex-1 rounded-lg border border-dark-border bg-dark-bg px-2.5 py-1 font-mono text-[12px] text-dark-text focus:border-dark-textMuted focus:outline-none"
          />
        </div>
        <button
          class="mb-3 font-mono text-[11px] text-dark-textMuted transition-colors hover:text-dark-text"
          @click="form.showStandings = true"
        >
          ▸ Add full standings (optional)
        </button>
      </template>

      <!-- Full standings. -->
      <template v-else>
        <div class="mb-1 flex items-center justify-between">
          <span class="font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">Full standings (1 = champion)</span>
          <button
            class="font-mono text-[11px] text-dark-textMuted hover:text-dark-text"
            @click="form.showStandings = false"
          >
            ▾ champions only
          </button>
        </div>
        <div
          v-for="(row, i) in form.standings"
          :key="i"
          class="mb-1.5 flex items-center gap-1.5"
        >
          <span class="w-5 shrink-0 text-center font-mono text-[12px] text-dark-textMuted">{{ i + 1 }}</span>
          <input
            v-model="row.name"
            type="text"
            placeholder="Team name"
            class="min-w-0 flex-1 rounded-lg border border-dark-border bg-dark-bg px-2 py-1 font-mono text-[12px] text-dark-text focus:border-dark-textMuted focus:outline-none"
          />
          <input v-model.number="row.wins" type="number" min="0" placeholder="W"
            class="w-11 shrink-0 rounded-lg border border-dark-border bg-dark-bg px-1.5 py-1 text-center font-mono text-[12px] text-dark-text focus:border-dark-textMuted focus:outline-none" />
          <input v-model.number="row.losses" type="number" min="0" placeholder="L"
            class="w-11 shrink-0 rounded-lg border border-dark-border bg-dark-bg px-1.5 py-1 text-center font-mono text-[12px] text-dark-text focus:border-dark-textMuted focus:outline-none" />
          <input v-model.number="row.ties" type="number" min="0" placeholder="T"
            class="w-11 shrink-0 rounded-lg border border-dark-border bg-dark-bg px-1.5 py-1 text-center font-mono text-[12px] text-dark-text focus:border-dark-textMuted focus:outline-none" />
          <span v-if="i === 0" class="shrink-0 font-mono text-[12px]">🏆</span>
          <span v-else class="w-4 shrink-0" />
        </div>
        <button
          class="mb-3 font-mono text-[11px] text-dark-textMuted transition-colors hover:text-dark-text"
          @click="addStandingRow"
        >
          ⊕ add team
        </button>
      </template>

      <!-- Error + actions -->
      <p v-if="errorMsg" class="mb-2 font-mono text-[11px] text-[#e0625a]">{{ errorMsg }}</p>
      <div class="flex items-center gap-2">
        <button
          class="rounded-lg px-3 py-1.5 font-mono text-[12px] font-bold transition-opacity disabled:opacity-40"
          :style="{ backgroundColor: 'var(--color-primary, #C6FF3A)', color: '#10130a' }"
          :disabled="!canSubmit || saving"
          @click="submit"
        >
          {{ saving ? 'Saving…' : 'Save season' }}
        </button>
        <span class="font-mono text-[10px] text-dark-textMuted">
          Hand-entered — you can edit or remove what you add.
        </span>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Type-check + build**

Run: `npx vue-tsc --noEmit 2>&1 | grep -E "BackfillSeason" || echo "none in touched files"`
Expected: `none in touched files`.

Run: `npm run build 2>&1 | tail -3`
Expected: `✓ built in …`.

- [ ] **Step 3: Commit**

```bash
git add src/components/history/BackfillSeason.vue
git -c gc.auto=0 commit -q -F - <<'EOF'
feat: BackfillSeason inline add/edit form

Champions-only fast path + optional full standings; missing-year picker;
edit mode from a prefill; saveManualSeason with conflict/auth messaging.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

## Task 6: Wire the form + provenance into `HistoryView.vue`

**Files:**
- Modify: `src/views/HistoryView.vue`

- [ ] **Step 1: Add imports + auth store**

In `src/views/HistoryView.vue`, after the existing import block (the imports run through
`import TeamAvatar from '@/components/league/TeamAvatar.vue'` on line 10), add:

```ts
import { useAuthStore } from '@/stores/auth'
import BackfillSeason from '@/components/history/BackfillSeason.vue'
import { deleteManualSeason } from '@/services/historySnapshots'
import type { HistorySeason } from '@/history/types'
```

And after `const history = useLeagueHistory()` (line 13), add:

```ts
const authStore = useAuthStore()
```

- [ ] **Step 2: Add the backfill computeds + handlers**

In `src/views/HistoryView.vue`, immediately after the `const backfilled = computed(...)` line
(line 26), add:

```ts
// ── Manual backfill (Phase 2b) ───────────────────────────────────────────────
const canWrite = computed(() => !!authStore.user)
const existingSeasonNums = computed(() => seasons.value.map((s) => s.season))
// data is sorted season DESC → the newest season is the active one.
const activeSeason = computed(() => seasons.value[0]?.season ?? 0)
const originOf = (season: number) => history.origin.value.get(season)
const editingSeason = ref<HistorySeason | null>(null)

function editManual(season: number) {
  editingSeason.value = seasons.value.find((s) => s.season === season) ?? null
}
async function removeManual(season: number) {
  const res = await deleteManualSeason(history.snapshotKey.value, season)
  if (res.ok) await history.load()
}
function onBackfillSaved() {
  editingSeason.value = null
  history.load()
}
```

- [ ] **Step 3: Mount the form under the depth note**

In the template, immediately AFTER the closing `</p>` of the `v-else-if="isEspn"` depth-note
block (the block ending at line 214), add:

```html
      <!-- ── MANUAL BACKFILL (Phase 2b) ────────────────────────────────────── -->
      <BackfillSeason
        v-if="firstYear"
        :snapshot-key="history.snapshotKey.value"
        :platform="history.platform.value"
        :sport="history.sport.value"
        :first-year="firstYear"
        :active-season="activeSeason"
        :existing-seasons="existingSeasonNums"
        :prefill="editingSeason"
        :can-write="canWrite"
        @saved="onBackfillSaved"
        @cancel-edit="editingSeason = null"
      />
```

- [ ] **Step 4: Add provenance + edit/remove on manual Champions rows**

In the Champions `v-for` row, the flex span that holds the champion label ends with the
`back-to-back` badge span (the `<span v-if="c.repeat" …>back-to-back</span>` closing at
line 247, inside the `<span class="min-w-0 flex-1 flex flex-wrap …">`). Immediately after that
`back-to-back` span and BEFORE that wrapper span's closing `</span>` (line 248), add:

```html
              <template v-if="originOf(c.season)?.source === 'manual'">
                <span class="shrink-0 font-mono text-[9px] text-dark-textMuted">
                  added by {{ originOf(c.season)?.isMine ? 'you' : 'a leaguemate' }}
                </span>
                <template v-if="originOf(c.season)?.isMine">
                  <button
                    class="shrink-0 font-mono text-[9px] text-dark-textMuted underline-offset-2 hover:text-dark-text hover:underline"
                    @click="editManual(c.season)"
                  >edit</button>
                  <button
                    class="shrink-0 font-mono text-[9px] text-[#e0625a] underline-offset-2 hover:underline"
                    @click="removeManual(c.season)"
                  >remove</button>
                </template>
              </template>
```

- [ ] **Step 5: Type-check, build, full suite**

Run: `npx vue-tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: `62`.

Run: `npx vue-tsc --noEmit 2>&1 | grep -E "HistoryView" || echo "none in touched files"`
Expected: `none in touched files`.

Run: `npx vitest run 2>&1 | tail -4`
Expected: all test files pass.

Run: `npm run build 2>&1 | tail -3`
Expected: `✓ built in …`.

- [ ] **Step 6: Commit**

```bash
git add src/views/HistoryView.vue
git -c gc.auto=0 commit -q -F - <<'EOF'
feat: wire manual backfill into HistoryView

Mount BackfillSeason under the depth note; show "added by you/leaguemate"
+ edit/remove on the caller's own manual Champions rows.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

## Task 7: Final verification + manual smoke

- [ ] **Step 1: Full suite green**

Run: `npx vitest run 2>&1 | tail -4`
Expected: all files pass (Phase 2a + the new `manualSeason` + `historySnapshots` additions).

- [ ] **Step 2: Type-check baseline holds**

Run: `npx vue-tsc --noEmit 2>&1 | grep -c "error TS"` → `62`.
Run: `npx vue-tsc --noEmit 2>&1 | grep -E "manualSeason|historySnapshots|useLeagueHistory|BackfillSeason|HistoryView" || echo "none in touched files"` → `none in touched files`.

- [ ] **Step 3: Build clean**

Run: `npm run build 2>&1 | tail -3` → `✓ built in …`.

- [ ] **Step 4: Manual smoke (dev server, real league)**

With `npm run dev` running and signed in, open the History page on an ESPN league whose
history starts recently. Verify:
1. The "⊕ Add a season before {firstYear}" affordance appears under the depth note.
2. Adding a champions-only year saves, the panel collapses, and the year appears in the
   Champions roll with "added by you · edit · remove"; the All-time title count reflects it.
3. Editing that entry re-opens the form prefilled; changing the champion and saving updates
   the row.
4. Removing it drops the year back out of Champions.
5. Signed out (or on a league with no earlier years), the affordance is absent / shows the
   sign-in hint instead.

Record anything off for a follow-up; do not push or deploy.

- [ ] **Step 5: Update memory**

Update `history` / `league-page` memory notes (and the `MEMORY.md` index if needed): Phase 2b
manual backfill built (local, `redesign/my-team-first`), prod table+policies applied 2026-07-12,
no further prod DDL. Note the accepted limitation (a wrong manual entry is only correctable by
its own contributor) and that manual teams are name-keyed (link to auto only where names match).

---

## Self-review notes (checked against the spec)

- **Spec §1 schema/RLS** → Task 1 (repo reconciliation; prod already applied).
- **Spec §2 service** (`saveManualSeason`, `deleteManualSeason`, provenance fetch, DRY row
  builder, `source:'auto'`) → Task 3.
- **Spec §3 collision** → no code needed (live-wins merge + `saveManualSeason` conflict result);
  covered by the conflict test in Task 3 and the merge logic untouched in Task 4.
- **Spec §4 form UX** (progressive detail, missing-year picker, validation, conflict copy,
  edit/remove of own entries) → Tasks 5 + 6.
- **Spec §5 merge/provenance** (origin map, unchanged merge, `backfilled` reuse) → Task 4.
- **Types consistent:** `ManualSeasonInput`/`ManualStandingRow`/`buildManualSeason` (Task 2) are
  consumed verbatim in Task 5; `SnapshotRow`/`fetchSnapshotRows`/`saveManualSeason`/
  `deleteManualSeason` (Task 3) are consumed verbatim in Tasks 4 + 6; `origin`/`snapshotKey`/
  `sport` exposed in Task 4 are consumed verbatim in Task 6.
- **No placeholders in code steps.** `sport` is resolved centrally in `load()` (Task 4 Step 3),
  with a callout explaining the `loadEspn`/`loadYahoo` local-variable shadow that rules out the
  per-loader approach.
```
