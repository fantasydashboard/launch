# Points My Team — Injury Awareness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make points-league My Team injury-aware — carry real IL/DTD status through to the model, discount injured players' rest-of-season projection (DTD ×0.90, IL ×0.50), and badge them — so talent rank, team strength, and playoff seed/odds stop counting hurt players at full value.

**Architecture:** A pure `injuryStatus` normalizer (platform status string → tier → discount). The raw status is plumbed onto `PointsPoolPlayer` from both platforms. `buildPointsTeam` applies the discount at its single value source (`valueOf` + the roster-row points), which propagates to tiers, the slot spine, `standings.startingPoints` (strength, which `useSeasonOutlook` feeds to `simulatePlayoffOdds`), and `myLineupRank`. The view badges injured rows.

**Tech Stack:** Vue 3 / TypeScript / Vitest. Reuses the injury vocab in `src/wire/injury.ts` and the `bat()`/`arm()` fixture style in `src/myteam/__tests__/pointsTeam.test.ts`.

**Local only** per the project's deploy rule — no push/prod.

---

## File Structure

- **Create** `src/myteam/injuryStatus.ts` — pure: `injuryTier(rawStatus, onIL) → 'healthy'|'dtd'|'il'`, `injuryDiscount(tier) → number`, tunable `DTD_DISCOUNT`/`IL_DISCOUNT`.
- **Create** `src/myteam/__tests__/injuryStatus.test.ts`.
- **Modify** `src/myteam/pointsTeam.ts` — add `status?` to `PointsPoolPlayer`; add `injury: InjuryTier` to `PointsRosterRow`; apply the discount in `buildPointsTeam`.
- **Modify** `src/composables/useMyRoster.ts` — add `status?: string` to `PoolPlayer`.
- **Modify** `src/myteam/espn/mapRosters.ts` — set `status` on the pooled player from `injuryStatus`.
- **Modify** `src/composables/useYahooLeaguePool.ts` — add `status` to `LeaguePoolPlayer` + set it from the row.
- **Modify** `src/myteam/espn/__tests__/mapRosters.test.ts` — assert the pool carries `status`.
- **Modify** `src/myteam/__tests__/pointsTeam.test.ts` — add the discount test.
- **Modify** `src/views/PointsMyTeamView.vue` — IL/DTD badges, injured-count note, `?ptsaudit` extension.

**Reference — current `buildPointsTeam` internals (do not change their behavior beyond the discount):**
- `ptsByKey` maps playerKey → `projectPlayerPoints(...)` result `{ total, games, perStat }` (line ~113).
- `valueOf(key)` returns `weeklyRate(...)` (perWeek basis) or `r.total` (total basis) — the lineup/standings value source (line ~117).
- `rawRows` (line ~163) sets `points: r.total`; `perGame` is later computed as `r.points / r.games` (line ~181).
- `PointsPoolPlayer` already has `onIL?: boolean`; `PoolPlayer` (useMyRoster) and `LeaguePoolPlayer` (useYahooLeaguePool) also have `onIL`.

---

## Task 1: `injuryStatus` normalizer

**Files:**
- Create: `src/myteam/injuryStatus.ts`
- Test: `src/myteam/__tests__/injuryStatus.test.ts`

- [ ] **Step 1: Write the failing test** — `src/myteam/__tests__/injuryStatus.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { injuryTier, injuryDiscount } from '@/myteam/injuryStatus'

describe('injuryTier', () => {
  it('maps Yahoo IL/reserve codes to il', () => {
    for (const s of ['IL10', 'IL15', 'IL60', 'NA', 'DL', 'O', 'SUSP', 'PUP']) {
      expect(injuryTier(s)).toBe('il')
    }
  })
  it('maps ESPN IL/out codes to il', () => {
    for (const s of ['OUT', 'TEN_DAY_DL', 'SIXTY_DAY_DL']) {
      expect(injuryTier(s)).toBe('il')
    }
  })
  it('maps day-to-day / questionable codes to dtd', () => {
    for (const s of ['DTD', 'DAY_TO_DAY', 'GTD', 'Q', 'QUESTIONABLE', 'DOUBTFUL']) {
      expect(injuryTier(s)).toBe('dtd')
    }
  })
  it('treats empty / ACTIVE / unknown as healthy', () => {
    expect(injuryTier('')).toBe('healthy')
    expect(injuryTier(undefined)).toBe('healthy')
    expect(injuryTier(null)).toBe('healthy')
    expect(injuryTier('ACTIVE')).toBe('healthy')
    expect(injuryTier('SOMENEWCODE')).toBe('healthy')
  })
  it('onIL flag forces il even with an empty status string', () => {
    expect(injuryTier('', true)).toBe('il')
    expect(injuryTier(undefined, true)).toBe('il')
  })
  it('is case-insensitive', () => {
    expect(injuryTier('il60')).toBe('il')
    expect(injuryTier('dtd')).toBe('dtd')
  })
})

describe('injuryDiscount', () => {
  it('returns the tunable multipliers', () => {
    expect(injuryDiscount('healthy')).toBe(1)
    expect(injuryDiscount('dtd')).toBe(0.9)
    expect(injuryDiscount('il')).toBe(0.5)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/myteam/__tests__/injuryStatus.test.ts`
Expected: FAIL — "Cannot find module '@/myteam/injuryStatus'".

- [ ] **Step 3: Implement** — `src/myteam/injuryStatus.ts`

```ts
/** Injury availability tier, derived from a platform status string (+ reserve-slot flag). */
export type InjuryTier = 'healthy' | 'dtd' | 'il'

// Rest-of-season points multipliers. Tunable in one place: DTD players usually still
// play (light haircut); IL players miss a chunk of the remaining season (heavy haircut).
export const DTD_DISCOUNT = 0.9
export const IL_DISCOUNT = 0.5

const IL_CODES = new Set(['NA', 'DL', 'O', 'OUT', 'SUSP', 'PUP'])
const DTD_CODES = new Set(['DTD', 'GTD', 'Q', 'QUESTIONABLE', 'DOUBTFUL', 'PROBABLE', 'P', 'DD', 'DAY_TO_DAY'])

/**
 * Normalize a platform injury status string to a tier. Covers Yahoo (`IL10`/`IL60`/`NA`/`DTD`/…)
 * and ESPN (`OUT`/`DAY_TO_DAY`/`TEN_DAY_DL`/`SIXTY_DAY_DL`/`ACTIVE`/…). `onIL` (a reserve-slot
 * flag from either platform) forces `il` regardless of the string. Unrecognized non-empty codes
 * are treated as `healthy` — conservative: we never haircut a player we can't confidently read.
 */
export function injuryTier(rawStatus?: string | null, onIL?: boolean): InjuryTier {
  if (onIL) return 'il'
  const s = String(rawStatus ?? '').toUpperCase().trim()
  if (!s || s === 'ACTIVE' || s === 'NORMAL') return 'healthy'
  if (s.startsWith('IL') || s.includes('_DL') || IL_CODES.has(s)) return 'il'
  if (s.startsWith('DTD') || DTD_CODES.has(s)) return 'dtd'
  return 'healthy'
}

/** Rest-of-season points multiplier for a tier. */
export function injuryDiscount(tier: InjuryTier): number {
  return tier === 'il' ? IL_DISCOUNT : tier === 'dtd' ? DTD_DISCOUNT : 1
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/myteam/__tests__/injuryStatus.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/myteam/injuryStatus.ts src/myteam/__tests__/injuryStatus.test.ts
git commit -m "feat: injuryStatus — normalize IL/DTD tier + ROS discount"
```
(A harmless `.git/gc.log` / "bad object" warning may print on commit — ignore it; the commit still succeeds. Verify with `git log --oneline -1`.)

---

## Task 2: Plumb raw injury `status` onto the pool from both platforms

**Files:**
- Modify: `src/myteam/pointsTeam.ts` (`PointsPoolPlayer` interface only)
- Modify: `src/composables/useMyRoster.ts` (`PoolPlayer` interface)
- Modify: `src/myteam/espn/mapRosters.ts` (`mapRostersToPool`)
- Modify: `src/composables/useYahooLeaguePool.ts` (`LeaguePoolPlayer` + `buildFromRows`)
- Test: `src/myteam/espn/__tests__/mapRosters.test.ts`

- [ ] **Step 1: Add `status?` to the three pool interfaces**

In `src/myteam/pointsTeam.ts`, the `PointsPoolPlayer` interface — add `status?` right after `onIL?`:
```ts
  onIL?: boolean
  status?: string // raw platform injury status ('IL10' / 'DTD' / 'DAY_TO_DAY' / '' …)
```

In `src/composables/useMyRoster.ts`, the `PoolPlayer` interface (the one with `onIL?: boolean`, ~line 66) — add after `onIL?`:
```ts
  onIL?: boolean // sits in an IL/NA reserve slot (not an active roster spot)
  status?: string // raw platform injury status
```

In `src/composables/useYahooLeaguePool.ts`, the `LeaguePoolPlayer` interface (~line 24, has `onIL: boolean`) — add after `onIL`:
```ts
  onIL: boolean // sits in an IL/NA reserve slot (not an active roster spot)
  status?: string // raw Yahoo injury status ('IL10' / 'DTD' / …)
```

- [ ] **Step 2: Write the failing test** — add to `src/myteam/espn/__tests__/mapRosters.test.ts`

First READ the existing file to match its import style and the `EspnTeamRosterLike` fixture shape it already uses. Then add this test inside the existing top-level `describe` (or a new one) — adapt the fixture object to whatever minimal shape the existing tests use, keeping these injury-relevant fields:

```ts
import { mapRostersToPool } from '../mapRosters'

describe('mapRostersToPool injury status', () => {
  it('carries injuryStatus onto the pooled player (blank when ACTIVE)', () => {
    const teams = [
      {
        id: 7,
        name: 'T',
        roster: [
          { playerId: 1, fullName: 'Hurt Guy', proTeam: 'NYY', position: 'SP', stats: {}, injuryStatus: 'SIXTY_DAY_DL', lineupSlot: 'IL' },
          { playerId: 2, fullName: 'Fine Guy', proTeam: 'LAD', position: '2B', stats: {}, injuryStatus: 'ACTIVE', lineupSlot: '2B' },
          { playerId: 3, fullName: 'Nostatus', proTeam: 'BOS', position: 'OF', stats: {}, lineupSlot: 'OF' },
        ],
      },
    ]
    const pool = mapRostersToPool(teams as any, 'baseball')
    const byName = Object.fromEntries(pool.map((p) => [p.name, p]))
    expect(byName['Hurt Guy'].status).toBe('SIXTY_DAY_DL')
    expect(byName['Hurt Guy'].onIL).toBe(true) // lineupSlot 'IL'
    expect(byName['Fine Guy'].status).toBe('') // ACTIVE → blank
    expect(byName['Nostatus'].status).toBe('') // missing → blank
  })
})
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run src/myteam/espn/__tests__/mapRosters.test.ts`
Expected: FAIL — `status` is `undefined`, not `''`/`'SIXTY_DAY_DL'`.

- [ ] **Step 4: Set `status` in `mapRostersToPool`**

In `src/myteam/espn/mapRosters.ts`, inside `mapRostersToPool`'s returned object (currently ends with `onIL: isEspnIL(p.lineupSlot),`), add:
```ts
      onIL: isEspnIL(p.lineupSlot),
      status: p.injuryStatus && p.injuryStatus !== 'ACTIVE' ? p.injuryStatus : '',
```

- [ ] **Step 5: Set `status` in the Yahoo pool**

In `src/composables/useYahooLeaguePool.ts`, `buildFromRows`, the `nextPool.push({ ... })` object (has `onIL: isYahooIL(r.status),`) — add:
```ts
        onIL: isYahooIL(r.status),
        status: r.status ?? '',
```
(`r` is a `PoolRow` which already carries `status: string`.)

- [ ] **Step 6: Run tests + type-check**

Run: `npx vitest run src/myteam/espn/__tests__/mapRosters.test.ts`
Expected: PASS.
Run: `npm run type-check 2>&1 | grep -iE "mapRosters|useMyRoster|useYahooLeaguePool|pointsTeam"`
Expected: no output (no new errors from these files).

- [ ] **Step 7: Commit**

```bash
git add src/myteam/pointsTeam.ts src/composables/useMyRoster.ts src/myteam/espn/mapRosters.ts src/composables/useYahooLeaguePool.ts src/myteam/espn/__tests__/mapRosters.test.ts
git commit -m "feat: carry raw injury status onto the points pool (ESPN + Yahoo)"
```
(Ignore the harmless gc.log warning; verify with `git log --oneline -1`.)

---

## Task 3: Apply the discount in `buildPointsTeam`

**Files:**
- Modify: `src/myteam/pointsTeam.ts`
- Test: `src/myteam/__tests__/pointsTeam.test.ts`

- [ ] **Step 1: Add the discount test** — append inside the existing `describe('buildPointsTeam', ...)` in `src/myteam/__tests__/pointsTeam.test.ts` (the `pool`, `fgByKey`, `weights`, `slots` fixtures already exist in that describe):

```ts
  it('discounts injured players (IL x0.5, DTD x0.9), keeps perGame at the healthy rate, and lowers strength', () => {
    const injPool = pool.map((p) =>
      p.playerKey === 'Stud2B' ? { ...p, onIL: true } // IL
      : p.playerKey === 'WeakOF' ? { ...p, status: 'DTD' } // DTD
      : p,
    )
    const healthy = buildPointsTeam(pool, fgByKey, weights, 'A', slots)
    const injured = buildPointsTeam(injPool, fgByKey, weights, 'A', slots)

    const row = (m: ReturnType<typeof buildPointsTeam>, key: string) =>
      m.rosterRows.find((r) => r.player.playerKey === key)!

    // IL: points halved, tier tagged, per-game rate untouched
    expect(row(injured, 'Stud2B').points).toBeCloseTo(row(healthy, 'Stud2B').points * 0.5, 5)
    expect(row(injured, 'Stud2B').injury).toBe('il')
    expect(row(injured, 'Stud2B').perGame).toBeCloseTo(row(healthy, 'Stud2B').perGame, 5)
    // DTD: points x0.9
    expect(row(injured, 'WeakOF').points).toBeCloseTo(row(healthy, 'WeakOF').points * 0.9, 5)
    expect(row(injured, 'WeakOF').injury).toBe('dtd')
    // Healthy player unchanged
    expect(row(injured, 'AceA').points).toBeCloseTo(row(healthy, 'AceA').points, 5)
    expect(row(injured, 'AceA').injury).toBe('healthy')
    // Team strength drops when a star is hurt
    const strengthA = (m: ReturnType<typeof buildPointsTeam>) =>
      m.standings.find((s) => s.teamKey === 'A')!.startingPoints
    expect(strengthA(injured)).toBeLessThan(strengthA(healthy))
  })
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/myteam/__tests__/pointsTeam.test.ts`
Expected: FAIL — `row(...).injury` is `undefined` and points are not discounted.

- [ ] **Step 3: Implement the discount**

In `src/myteam/pointsTeam.ts`:

(a) Add the import at the top (near the other `./` imports):
```ts
import { injuryTier, injuryDiscount, type InjuryTier } from './injuryStatus'
```

(b) Add `injury` to the `PointsRosterRow` interface (near `chips`):
```ts
  chips: string[] // specialist edges (SB/SV/HLD/QS) where this player is a standout
  injury: InjuryTier // 'healthy' | 'dtd' | 'il' — drives the badge + the points discount
```

(c) Just after `ptsByKey` is built and before/around `valueOf` (line ~113–121), add a per-player discount map:
```ts
  // Injury haircut per player (IL x0.5 / DTD x0.9), applied to every value read below so it
  // flows into tiers, the slot spine, standings strength, and myLineupRank consistently.
  const injuryByKey = new Map<string, InjuryTier>(pool.map((p) => [p.playerKey, injuryTier(p.status, p.onIL)]))
  const discountOf = (key: string) => injuryDiscount(injuryByKey.get(key) ?? 'healthy')
```

(d) Multiply the discount into `valueOf`'s return:
```ts
  const valueOf = (key: string): number => {
    const r = ptsByKey.get(key)
    if (!r) return 0
    const base = basis === 'perWeek' ? weeklyRate(r, fgByKey[key], weeksLeft) : r.total
    return base * discountOf(key)
  }
```

(e) In the `rawRows` map (line ~163), discount `points` but compute `perGame` from the UNdiscounted total, and carry the tier:
```ts
  const rawRows = pool
    .filter((p) => myTeamKey != null && p.teamKey === myTeamKey)
    .map((p) => {
      const r = ptsByKey.get(p.playerKey)!
      const disc = discountOf(p.playerKey)
      return {
        player: p,
        side: sideByKey.get(p.playerKey)!,
        points: r.total * disc, // discounted — drives tiers + display
        perGame: r.games > 0 ? r.total / r.games : 0, // healthy "when he plays" rate
        games: r.games,
        perStat: r.perStat,
        injury: injuryByKey.get(p.playerKey) ?? 'healthy',
      }
    })
```

(f) In the `rosterRows.push({ ... })` block (line ~177), use the row's precomputed `perGame` and pass `injury`:
```ts
      rosterRows.push({
        player: r.player,
        side: r.side,
        points: r.points,
        perGame: r.perGame,
        games: r.games,
        tier,
        rankVsAll: pct,
        perStat: r.perStat,
        chips: chipsFor(r.side, r.perStat),
        injury: r.injury,
      })
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/myteam/__tests__/pointsTeam.test.ts`
Expected: PASS (all existing tests + the new one). The existing "tiers my roster / points" test still passes because its players carry no `status`/`onIL` → discount 1.0 → unchanged.

- [ ] **Step 5: Type-check**

Run: `npm run type-check 2>&1 | grep -iE "pointsTeam"`
Expected: no output. (If any OTHER file constructs a `PointsRosterRow` literal, it will now error on the missing `injury` field — search with `grep -rn "chips:" src --include=*.ts | grep -v test`; if a non-test producer exists, add `injury: 'healthy'` there. Consumers that only READ rows are unaffected.)

- [ ] **Step 6: Commit**

```bash
git add src/myteam/pointsTeam.ts src/myteam/__tests__/pointsTeam.test.ts
git commit -m "feat: buildPointsTeam — discount injured players' ROS (feeds talent/strength/odds)"
```
(Ignore the harmless gc.log warning; verify with `git log --oneline -1`.)

---

## Task 4: Surface injuries in `PointsMyTeamView`

**Files:**
- Modify: `src/views/PointsMyTeamView.vue`

READ the file first. Locate blocks by content, not line number. Identifiers already present that MUST NOT be redeclared: `model`, `hitters`, `pitchers`, `roster`, `ord`, `round`, `hasProj`, `showAudit`, `auditRows`.

- [ ] **Step 1: Add an injury-badge helper (script)**

In `<script setup>`, add near the other small helpers (e.g. after `tierColor`):
```ts
const injuryBadge = (injury: string) =>
  injury === 'il' ? { label: 'IL', cls: 'bg-[#FF5C5C]/15 text-[#FF5C5C]' }
  : injury === 'dtd' ? { label: 'DTD', cls: 'bg-amber-500/15 text-amber-400' }
  : null
```

Also add an injured-count computed near the other computeds:
```ts
const injuredCount = computed(() =>
  (model.value?.rosterRows ?? []).filter((r) => r.injury === 'il' || r.injury === 'dtd').length,
)
```
(`computed` is already imported — do not duplicate.)

- [ ] **Step 2: Render the badge on each roster row (template)**

In the roster row markup, find the name/position `<span>` group (the block rendering `{{ row.player.name }}` and `row.player.position`). Immediately after the specialist-chips `<span>` group (the one iterating `row.chips`), add an injury badge:
```html
              <span v-if="injuryBadge(row.injury)"
                class="shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold"
                :class="injuryBadge(row.injury)!.cls">
                {{ injuryBadge(row.injury)!.label }}
              </span>
```
Place it so it sits next to the chips (before the projected-points number that uses `ml-auto`), so the points stay right-aligned.

- [ ] **Step 3: Add the injured-count note (template)**

In the roster footnote paragraph (the `<p ...>` that starts with the `chips` legend, near the bottom of the roster card), prepend a sentence shown only when someone's hurt. Add, as the first child of that `<p>`:
```html
          <span v-if="injuredCount" class="text-dark-text">
            {{ injuredCount }} injured — projections discounted (IL ×0.5, DTD ×0.9).
          </span>
```

- [ ] **Step 4: Extend `?ptsaudit` (script + template)**

In the `auditRows` computed, add the tier to each row object. Find the returned object literal (has `name`, `side`, `points`, `perGame`, `perStat`) and add:
```ts
      injury: r.injury,
```
In the audit `<section v-if="showAudit">` where each `a` in `auditRows` renders, add to that row's line:
```html
          <span class="ml-2 text-dark-textMuted">inj: {{ a.injury }}</span>
```

- [ ] **Step 5: Type-check + build**

Run: `npm run type-check 2>&1 | grep -i PointsMyTeamView`
Expected: no output.
Run: `npm run build`
Expected: success.

- [ ] **Step 6: Commit**

```bash
git add src/views/PointsMyTeamView.vue
git commit -m "feat: points My Team — IL/DTD badges + injured-count note"
```
(Ignore the harmless gc.log warning; verify with `git log --oneline -1`.)

---

## Task 5: Full verification

**Files:** none.

- [ ] **Step 1: Full suite**

Run: `npm test`
Expected: all pass; count up by 9 (7 injuryStatus + 1 mapRosters + 1 pointsTeam), none regressed.

- [ ] **Step 2: Type-check + build**

Run: `npm run type-check && npm run build`
Expected: build succeeds; type-check error count not above the repo's pre-existing baseline (62) for unrelated files.

- [ ] **Step 3: Manual smoke (dev server) — REQUIRED (build won't catch missing imports / runtime)**

Run `npm run dev`, open a points league's My Team with a known injured player. Confirm:
- Injured roster rows show an **IL** (red) or **DTD** (amber) badge; the projected-points number is visibly lower than the healthy rate implies, but `/g` per-game is unchanged.
- The roster footnote shows "N injured — projections discounted".
- If a starter is IL, the **Season Outlook** seed/odds/talent are at least as pessimistic as before the injury data landed (sanity, not exact).
- `?ptsaudit=1` shows each player's `inj:` tier.
- Check both an ESPN and a Yahoo points league.

- [ ] **Step 4: Commit any smoke fix (only if needed)**

```bash
git add -A && git commit -m "fix: points My Team injury awareness — <smoke finding>"
```

---

## Self-Review Notes (reconciled)

- **Spec coverage:** normalizer (Task 1); plumb status both platforms (Task 2); one-point discount → talent/strength/odds (Task 3, via `valueOf` + rawRows, verified strength drop in test); badges + count + audit (Task 4); perGame stays healthy (Task 3 test asserts it). Out-of-scope items (return dates, severity scaling, Today/Matchup) are untouched.
- **Type consistency:** `InjuryTier` defined once in `injuryStatus.ts`, imported by `pointsTeam.ts` (row field) and read as a plain string in the view. `status?: string` added to all three pool interfaces so the composables' `as PointsPoolPlayer[]` casts keep the field. `PointsRosterRow.injury` is required and set at the single push site.
- **Cross-surface note:** the discount also makes `LeagueView`/Power Rankings points strength injury-aware (shared `buildPointsTeam`) — intended and consistent.
- **Placeholder scan:** none — every code step is concrete.
