# League Scoring for Football — Implementation Plan (Part A)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make football rest-of-season values use the league's real scoring instead of hardcoded full PPR.

**Architecture:** A pure resolver turns a league's raw settings into a weight map. `useLeagueScoring` gains the Sleeper path it never had and stops falling back to baseball defaults. `useFootballVor` gains an optional `scoring` input. The football surfaces pass it.

**Tech Stack:** Vue 3 (`<script setup>`, no auto-import), TypeScript, Pinia, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-23-league-scoring-and-rankings-design.md`

## Global Constraints

- **Test command:** `npx vitest run <path>` for one file, `npm test` for all. Baseline: **1968 passing / 213 files**. Never finish with fewer.
- **`npx vue-tsc --noEmit` baseline is 1451 errors.** Your change must not RAISE it. Check with `npx vue-tsc --noEmit 2>&1 | grep -c "error TS"`.
- **No Vue auto-import in this repo.** Every identifier needs an explicit import. A green `npm run build` does NOT catch a missing one — and `vue-tsc` catches a dangling template *identifier* but **silently ignores an unresolved component tag**. Verify component imports by reading the file.
- **`src/data/landingBoard.json` drifts on its own** during dev/build/test. Revert it before committing.
- `npm run build` must succeed.
- Commit messages end with:
  `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`

---

### Task 1: The scoring resolver

A pure function per platform. This is the highest-risk unit in the plan: wrong weights produce numbers that look entirely plausible and are wrong — which is precisely what the product has been shipping all season.

**Files:**
- Create: `src/football/footballScoring.ts`
- Test: `src/football/__tests__/footballScoring.test.ts`

**Interfaces:**
- Consumes: `defaultWeights`, `weightsAreUsable`, `normalizeEspnWeights`, `normalizeYahooWeights` from `@/myteam/pointsScoring`.
- Produces:
  ```ts
  export type FootballScoringSource = 'sleeper' | 'espn' | 'yahoo' | 'default'
  export interface FootballScoring { weights: Record<string, number>; source: FootballScoringSource }
  export function sleeperFootballWeights(scoringSettings: unknown): Record<string, number> | null
  export function resolveFootballScoring(input: {
    platform?: string | null
    sleeperScoringSettings?: unknown
    espnScoringItems?: unknown
    yahooStatCategories?: unknown
    yahooStatModifiers?: unknown
  }): FootballScoring
  ```

- [ ] **Step 1: Write the failing test**

Create `src/football/__tests__/footballScoring.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { sleeperFootballWeights, resolveFootballScoring } from '../footballScoring'
import { defaultWeights } from '@/myteam/pointsScoring'

describe('sleeperFootballWeights', () => {
  /* Sleeper's scoring keys ARE our stat keys — necessarily, since the projections we score
     come from Sleeper keyed that way. So this is a pass-through, and the test's job is to
     prove it stays one. */
  it('passes Sleeper settings straight through', () => {
    const w = sleeperFootballWeights({ rec: 0.5, pass_td: 4, rush_yd: 0.1 })
    expect(w).toEqual({ rec: 0.5, pass_td: 4, rush_yd: 0.1 })
  })

  /* A league that scores nothing for receptions is the whole reason this exists: standard
     scoring. Zero is a REAL weight and must survive — dropping falsy values would silently
     restore the PPR default underneath it. */
  it('keeps an explicit zero, which is what standard scoring is', () => {
    const w = sleeperFootballWeights({ rec: 0, pass_td: 4 })
    expect(w).toEqual({ rec: 0, pass_td: 4 })
  })

  it('drops non-numeric values rather than scoring with them', () => {
    const w = sleeperFootballWeights({ rec: 1, junk: 'x', other: null })
    expect(w).toEqual({ rec: 1 })
  })

  it('returns null for a blob with nothing usable in it', () => {
    expect(sleeperFootballWeights({})).toBeNull()
    expect(sleeperFootballWeights(null)).toBeNull()
    expect(sleeperFootballWeights('nope')).toBeNull()
  })
})

describe('resolveFootballScoring', () => {
  it('reads a Sleeper league from its own settings', () => {
    const r = resolveFootballScoring({
      platform: 'sleeper',
      sleeperScoringSettings: { rec: 0.5, pass_td: 4, rush_yd: 0.1 },
    })
    expect(r.source).toBe('sleeper')
    expect(r.weights.rec).toBe(0.5)
  })

  it('reads an ESPN league through the ESPN normaliser', () => {
    const r = resolveFootballScoring({
      platform: 'espn',
      espnScoringItems: [
        { statId: 3, points: 0.04 },  // pass yards
        { statId: 4, points: 4 },     // pass TD
        { statId: 24, points: 0.1 },  // rush yards
        { statId: 42, points: 0.1 },  // rec yards
      ],
    })
    expect(r.source).toBe('espn')
    expect(Object.keys(r.weights).length).toBeGreaterThanOrEqual(3)
  })

  /*
   * The guard that matters. ESPN reports bare statIds on an inconsistent enumeration, so a
   * normalisation can come back nearly empty — and a nearly-empty weight map scores almost
   * every stat at zero, which does not look like a failure. It looks like a league where
   * nobody scores points.
   */
  it('falls back to football defaults when a platform yields too little', () => {
    const r = resolveFootballScoring({ platform: 'espn', espnScoringItems: [{ statId: 3, points: 0.04 }] })
    expect(r.source).toBe('default')
    expect(r.weights).toEqual(defaultWeights('football'))
  })

  /* FOOTBALL defaults, not baseball. useLeagueScoring's fallback calls defaultWeights() with
     no argument, which returns BASEBALL weights — so a football league falling through scored
     touchdowns with a home-run table. */
  it('falls back to FOOTBALL defaults, never baseball', () => {
    const r = resolveFootballScoring({ platform: 'sleeper', sleeperScoringSettings: {} })
    expect(r.source).toBe('default')
    expect(r.weights).toEqual(defaultWeights('football'))
    expect(r.weights.pass_td).toBe(4)
    expect(r.weights).not.toHaveProperty('HR')
  })

  it('falls back for an unknown platform', () => {
    expect(resolveFootballScoring({ platform: 'fantrax' }).source).toBe('default')
    expect(resolveFootballScoring({}).source).toBe('default')
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/football/__tests__/footballScoring.test.ts`
Expected: FAIL — cannot resolve `../footballScoring`.

- [ ] **Step 3: Write the implementation**

Create `src/football/footballScoring.ts`:

```ts
import {
  defaultWeights,
  weightsAreUsable,
  normalizeEspnWeights,
  normalizeYahooWeights,
} from '@/myteam/pointsScoring'

export type FootballScoringSource = 'sleeper' | 'espn' | 'yahoo' | 'default'

export interface FootballScoring {
  weights: Record<string, number>
  source: FootballScoringSource
}

/**
 * Sleeper's scoring blob, as weights.
 *
 * A pass-through, and deliberately so: our stat keys in config/sports/football.ts ARE Sleeper's
 * key names. They have to be — the projections we score come from Sleeper keyed that way, so
 * any other key space would already have failed to score anything at all.
 *
 * The one rule that is not obvious: an explicit zero is KEPT. A league that scores nothing per
 * reception is standard scoring, which is most of the leagues this exists for, and dropping
 * falsy values would let the PPR default show through underneath and hand that league a board
 * built for somebody else's.
 */
export function sleeperFootballWeights(scoringSettings: unknown): Record<string, number> | null {
  if (!scoringSettings || typeof scoringSettings !== 'object' || Array.isArray(scoringSettings)) return null
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(scoringSettings as Record<string, unknown>)) {
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v
  }
  return Object.keys(out).length ? out : null
}

/**
 * The league's real scoring, or an honest default.
 *
 * Everything before this resolved to `defaultWeights('football')` — full PPR, for every league,
 * on every football surface. A manager in a standard league has been reading a board built for
 * somebody else's rules, with nothing on the page saying so.
 *
 * `source` is returned rather than inferred because the fallback has to be visible. A default
 * weight map does not look like a failure: it produces a complete, plausible, confidently wrong
 * board, which is the one outcome worth being able to detect.
 */
export function resolveFootballScoring(input: {
  platform?: string | null
  sleeperScoringSettings?: unknown
  espnScoringItems?: unknown
  yahooStatCategories?: unknown
  yahooStatModifiers?: unknown
}): FootballScoring {
  const fallback: FootballScoring = { weights: defaultWeights('football'), source: 'default' }

  switch (input.platform) {
    case 'sleeper': {
      const w = sleeperFootballWeights(input.sleeperScoringSettings)
      return w && weightsAreUsable(w) ? { weights: w, source: 'sleeper' } : fallback
    }
    case 'espn': {
      const w = normalizeEspnWeights(input.espnScoringItems as any)
      return weightsAreUsable(w) ? { weights: w, source: 'espn' } : fallback
    }
    case 'yahoo': {
      const w = normalizeYahooWeights(input.yahooStatCategories as any, input.yahooStatModifiers as any)
      return weightsAreUsable(w) ? { weights: w, source: 'yahoo' } : fallback
    }
    default:
      return fallback
  }
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run src/football/__tests__/footballScoring.test.ts`
Expected: PASS, all 10 cases.

If the ESPN statId test fails, read `ESPN_POINTS_STAT` in `src/myteam/pointsScoring.ts` and use four statIds that ARE in that map — the point of the test is "four real mappings resolve", not those four specific ids. Say in your report if you changed them and why.

- [ ] **Step 5: Commit**

```bash
git add src/football/footballScoring.ts src/football/__tests__/footballScoring.test.ts
git commit -m "$(cat <<'EOF'
football: resolve a league's real scoring, or say it could not

Everything resolved to full PPR for every league on every football
surface, so a standard-league manager has been reading a board built
for somebody else's rules all season with nothing saying so.

`source` is returned rather than inferred because a default weight map
does not look like a failure — it produces a complete, plausible,
confidently wrong board.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `useFootballVor` accepts scoring

**Files:**
- Modify: `src/composables/useFootballVor.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `useFootballVor` gains optional `scoring?: Ref<Record<string, number>>`. Absent, behaviour is exactly as before.

- [ ] **Step 1: Add the input**

In the `inputs` object type, after `keysAreSleeperIds?: Ref<boolean>`:

```ts
  /**
   * The league's scoring weights. Absent means the football defaults, which is what every
   * caller got unconditionally before this existed.
   */
  scoring?: Ref<Record<string, number>>
```

- [ ] **Step 2: Use it**

Replace `const scoring = defaultWeights('football')` (around line 93) with:

```ts
      const scoring = inputs.scoring?.value ?? defaultWeights('football')
```

- [ ] **Step 3: Rebuild when it changes**

The watch at the bottom currently reads `watch([inputs.enabled, projPlayers, inputs.season], load, { immediate: true })`. Scoring must be in it, or switching leagues leaves the previous league's values on screen. Replace it with:

```ts
  /* Scoring is in here because it is an INPUT to every point total below, not a display
     preference. Without it, switching from a PPR league to a standard one leaves the first
     league's numbers on screen — correct-looking, and wrong. */
  watch(
    [inputs.enabled, projPlayers, inputs.season, () => inputs.scoring?.value],
    load,
    { immediate: true, deep: false },
  )
```

- [ ] **Step 4: Verify nothing regressed**

Run: `npm test`
Expected: **1968 passing / 213 files**, unchanged — this is additive with a default reproducing the old constant.

Run: `npx vue-tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: **1451**.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useFootballVor.ts
git commit -m "$(cat <<'EOF'
vor: take the league's scoring instead of assuming full PPR

Additive, defaulting to the constant every caller got before. The watch
gains scoring too: without it, switching from a PPR league to a standard
one leaves the first league's numbers on screen, correct-looking and
wrong.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: A composable that supplies it, and the surfaces that use it

**Files:**
- Create: `src/composables/useFootballScoring.ts`
- Test: `src/composables/__tests__/useFootballScoring.test.ts`
- Modify: `src/composables/useFootballWire.ts`, `src/views/PointsWireView.vue`

**Interfaces:**
- Consumes: `resolveFootballScoring` (Task 1), `useFootballVor`'s new `scoring` input (Task 2).
- Produces:
  ```ts
  export function useFootballScoring(): {
    weights: Ref<Record<string, number>>
    source: Ref<FootballScoringSource>
    ready: Ref<boolean>
    load: () => Promise<void>
  }
  ```

- [ ] **Step 1: Write the failing test**

Create `src/composables/__tests__/useFootballScoring.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { scoringLabel } from '../useFootballScoring'

/*
 * The label exists because the fallback has to be legible on the page. A board built from the
 * league's own rules and a board built from our defaults look identical, and only one of them
 * is telling the reader about their league.
 */
describe('scoringLabel', () => {
  it('names the league as the source when the league answered', () => {
    expect(scoringLabel('sleeper')).toBe("your league's scoring")
    expect(scoringLabel('espn')).toBe("your league's scoring")
    expect(scoringLabel('yahoo')).toBe("your league's scoring")
  })

  it('says plainly when it is our default instead', () => {
    expect(scoringLabel('default')).toBe('standard scoring (full PPR)')
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/composables/__tests__/useFootballScoring.test.ts`
Expected: FAIL — cannot resolve `../useFootballScoring`.

- [ ] **Step 3: Write the composable**

Create `src/composables/useFootballScoring.ts`:

```ts
import { ref, watch, type Ref } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useAuthStore } from '@/stores/auth'
import { usePlatformsStore } from '@/stores/platforms'
import { defaultWeights } from '@/myteam/pointsScoring'
import { resolveFootballScoring, type FootballScoringSource } from '@/football/footballScoring'

/** What to call the scoring on screen, so a fallback is not mistaken for the league's own. */
export function scoringLabel(source: FootballScoringSource): string {
  return source === 'default' ? 'standard scoring (full PPR)' : "your league's scoring"
}

/**
 * The active football league's scoring weights.
 *
 * Separate from `useLeagueScoring` on purpose. That one predates this, covers Yahoo and ESPN,
 * has no Sleeper path at all, and falls back to `defaultWeights()` with no argument — which
 * returns BASEBALL weights, so a football league falling through it scored touchdowns off a
 * home-run table. Football opted out of it for that reason (see usePointsValue.ts). This is the
 * football-shaped replacement; unifying the two is a later job and not this one.
 */
export function useFootballScoring(): {
  weights: Ref<Record<string, number>>
  source: Ref<FootballScoringSource>
  ready: Ref<boolean>
  load: () => Promise<void>
} {
  const weights = ref<Record<string, number>>(defaultWeights('football'))
  const source = ref<FootballScoringSource>('default')
  const ready = ref(false)

  async function load(): Promise<void> {
    const leagueStore = useLeagueStore()
    const platform = leagueStore.activePlatform
    const leagueKey = String(leagueStore.activeLeagueId ?? '')
    if (!leagueKey) { ready.value = true; return }

    try {
      if (platform === 'sleeper') {
        const r = resolveFootballScoring({
          platform: 'sleeper',
          sleeperScoringSettings: (leagueStore.currentLeague as any)?.scoring_settings,
        })
        weights.value = r.weights
        source.value = r.source
      } else if (platform === 'yahoo') {
        const { yahooService } = await import('@/services/yahoo')
        const settings: any = await yahooService.getLeagueSettings(leagueKey)
        const r = resolveFootballScoring({
          platform: 'yahoo',
          yahooStatCategories: settings?.stat_categories,
          yahooStatModifiers: settings?.stat_modifiers,
        })
        weights.value = r.weights
        source.value = r.source
      } else if (platform === 'espn') {
        const parts = leagueKey.split('_') // espn_{sport}_{leagueId}_{season}
        if (parts[0] === 'espn' && parts.length >= 4) {
          const authStore = useAuthStore()
          const platformsStore = usePlatformsStore()
          const { espnService } = await import('@/services/espn')
          if (authStore.user?.id) await espnService.initialize(authStore.user.id)
          const creds = platformsStore.getEspnCredentials()
          if (creds) espnService.setCredentials(creds.espn_s2, creds.swid)
          const scoring: any = await espnService.getScoringSettings(
            parts[1] as any, parts[2], parseInt(parts[3], 10),
          )
          const r = resolveFootballScoring({ platform: 'espn', espnScoringItems: scoring?.scoringItems })
          weights.value = r.weights
          source.value = r.source
        }
      }
    } catch (e) {
      /* Defaults stand, and `source` still says 'default' — which is the honest answer and the
         one the page can show. */
      console.error('[useFootballScoring] load failed', e)
    } finally {
      ready.value = true
    }
  }

  const store = useLeagueStore()
  watch(
    () => [store.activeLeagueId, store.activePlatform],
    () => { ready.value = false; void load() },
    { immediate: true },
  )

  return { weights, source, ready, load }
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run src/composables/__tests__/useFootballScoring.test.ts`
Expected: PASS, 2 cases.

- [ ] **Step 5: Feed it to the Wire**

In `src/composables/useFootballWire.ts`, add to the `inputs` type:

```ts
  /** The league's scoring weights, passed through to the value engine. */
  scoring?: Ref<Record<string, number>>
```

and add `scoring: inputs.scoring` to the `useFootballVor({...})` call inside it.

Then in `src/views/PointsWireView.vue`: import the composable, call it, and pass its weights to `useFootballWire`.

```ts
import { useFootballScoring } from '@/composables/useFootballScoring'
```
```ts
const fbScoring = useFootballScoring()
```
and add `scoring: fbScoring.weights,` to the `useFootballWire({...})` call.

**Grep first** to confirm the exact shape of that call before editing — the file has been heavily edited and the surrounding lines may not match what you expect.

- [ ] **Step 6: Verify**

Run: `npm test` — expected **≥1970 / 214 files** (Tasks 1 and 3 add tests).
Run: `npx vue-tsc --noEmit 2>&1 | grep -c "error TS"` — expected **1451**.
Run: `npm run build` — must succeed.

**Import audit by eye** (no Vue auto-import, and `vue-tsc` does not catch unresolved components): confirm `useFootballScoring` is imported in `PointsWireView.vue`, and that `useFootballWire.ts` has `Ref` imported already.

- [ ] **Step 7: Smoke it and report honestly**

`npm run dev`, open `/players` on a football league signed in as admin. Read the console. The board's numbers should now reflect the league's scoring — in a half-PPR or standard league, receivers should sit lower against running backs than before.

**If you cannot sign in or the page does not load, say so plainly and name what you could not check.** Do not claim an observation you did not make.

- [ ] **Step 8: Commit**

```bash
git add src/composables/useFootballScoring.ts src/composables/__tests__/useFootballScoring.test.ts src/composables/useFootballWire.ts src/views/PointsWireView.vue
git commit -m "$(cat <<'EOF'
wire: score the board with the league's own rules

Football opted out of useLeagueScoring because that composable has no
Sleeper path and falls back to defaultWeights() with no argument, which
returns baseball weights. This is the football-shaped replacement.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## What this plan does NOT do

- **Trades and the Draft Room still use defaults.** Both call `useFootballVor` and neither passes `scoring` yet. The Draft Room already computes `effectiveScoring` (`useDraftRoom.ts:92`) and does not pass it — a two-line follow-up, deliberately not bundled here so the first scoring change lands on one surface where it can be judged.
- **`useLeagueScoring` is not unified or fixed.** Its no-argument `defaultWeights()` baseball fallback remains for the baseball and basketball callers it serves. Merging the two is a later job.
- **No in-product announcement** that numbers changed.
- **Parts B and C of the spec** (Rankings learning who you are, and the upsell) are a separate plan.
