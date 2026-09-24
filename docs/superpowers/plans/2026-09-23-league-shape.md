# League Shape — Implementation Plan (piece 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make lineup cadence and scoring type first-class facts about a league, resolved once, overridable by hand, and read by the nav instead of `activeSport === 'football'`.

**Architecture:** One pure resolver. Scoring already has a resolver (`getLeagueType`) and is reused, not reinvented. Cadence is new: detected from ESPN's `rosterLocktimeType` where readable, defaulted by sport otherwise, and always overridable. The resolver reports its `source` so no surface can present a guess as a fact.

**Tech Stack:** Vue 3 (`<script setup>`, no auto-import), TypeScript, Pinia, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-23-league-shape-design.md`

## Global Constraints

- **Test baseline: 1994 passing / 217 files.** Never fewer.
- **`npx vue-tsc --noEmit 2>&1 | grep -c "error TS"` baseline 1445.** Must not rise.
- **No Vue auto-import.** Every identifier needs an explicit import; `vue-tsc` catches a dangling template identifier but **silently ignores an unresolved component tag**.
- **`src/data/landingBoard.json` drifts during build/test.** Revert before committing.
- `npm run build` must succeed. **Commit your work.**
- Commit messages end with:
  `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`

## What is known, and what is guessed

Read this before writing the resolver — it is the whole reason for the `source` field.

**Verified** (probe, 2026-09-23, ESPN public league defaults): `rosterLocktimeType` is
`FIRSTGAME_SCORINGPERIOD` for hockey, basketball and baseball; `INDIVIDUAL_GAME` for football.

**NOT verified**: what a genuinely weekly-lineup hockey league returns. Only the daily value has
been observed, because league defaults for those sports are daily. Yahoo and Sleeper are
entirely unprobed.

So the resolver treats `FIRSTGAME_SCORINGPERIOD` as a positive daily signal, treats
`INDIVIDUAL_GAME` as weekly ONLY for football (where it is confirmed to mean the period is the
week), and calls everything else unknown. Unknown falls back to a per-sport default and reports
`source: 'default'` so the surface can offer the override rather than assert.

---

### Task 1: The resolver

**Files:**
- Create: `src/league/leagueShape.ts`
- Test: `src/league/__tests__/leagueShape.test.ts`

**Interfaces:**
```ts
export type Cadence = 'daily' | 'weekly'
export type Scoring = 'points' | 'categories' | 'roto'
export type ShapeSource = 'manual' | 'detected' | 'default'
export interface LeagueShape { cadence: Cadence; scoring: Scoring; source: ShapeSource }

export function detectCadence(input: {
  sport?: string | null
  rosterLocktimeType?: string | null
}): Cadence | null

export function leagueShape(input: {
  sport?: string | null
  scoringType?: string | null
  rosterLocktimeType?: string | null
  manualCadence?: Cadence | null
}): LeagueShape
```

- [ ] **Step 1: Write the failing test**

Create `src/league/__tests__/leagueShape.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { detectCadence, leagueShape } from '../leagueShape'

describe('detectCadence', () => {
  /* Verified against ESPN's public league defaults, 2026-09-23. */
  it('reads a roster that locks per scoring period as daily', () => {
    expect(detectCadence({ sport: 'hockey', rosterLocktimeType: 'FIRSTGAME_SCORINGPERIOD' })).toBe('daily')
    expect(detectCadence({ sport: 'basketball', rosterLocktimeType: 'FIRSTGAME_SCORINGPERIOD' })).toBe('daily')
    expect(detectCadence({ sport: 'baseball', rosterLocktimeType: 'FIRSTGAME_SCORINGPERIOD' })).toBe('daily')
  })

  /* Football locks each player at his own kickoff because the scoring period is ALREADY the
     week. The same string means something different in a sport that plays nightly, which is
     why this is not a general rule. */
  it('reads football locking per game as weekly', () => {
    expect(detectCadence({ sport: 'football', rosterLocktimeType: 'INDIVIDUAL_GAME' })).toBe('weekly')
  })

  /*
   * The honest gap. In a nightly sport, INDIVIDUAL_GAME has never been observed and we do not
   * know that it means weekly there — only one of the two values was visible in the probe, so
   * inferring the other would be a rule that is right by accident. Unknown, and say so.
   */
  it('refuses to guess a nightly sport from an unobserved value', () => {
    expect(detectCadence({ sport: 'hockey', rosterLocktimeType: 'INDIVIDUAL_GAME' })).toBeNull()
  })

  it('is null when the platform said nothing', () => {
    expect(detectCadence({ sport: 'hockey' })).toBeNull()
    expect(detectCadence({ sport: 'hockey', rosterLocktimeType: '' })).toBeNull()
    expect(detectCadence({})).toBeNull()
  })
})

describe('leagueShape', () => {
  it('reports a detected cadence as detected', () => {
    const s = leagueShape({ sport: 'hockey', scoringType: 'head', rosterLocktimeType: 'FIRSTGAME_SCORINGPERIOD' })
    expect(s).toEqual({ cadence: 'daily', scoring: 'categories', source: 'detected' })
  })

  /* A hand-set cadence outranks detection. The owner knows their league; we are inferring it
     from one observed value on one platform. */
  it('lets a manual answer beat detection', () => {
    const s = leagueShape({
      sport: 'hockey', scoringType: 'head',
      rosterLocktimeType: 'FIRSTGAME_SCORINGPERIOD', manualCadence: 'weekly',
    })
    expect(s.cadence).toBe('weekly')
    expect(s.source).toBe('manual')
  })

  /* Football is points and weekly always — one game a week leaves no other shape. */
  it('always calls football weekly points', () => {
    const s = leagueShape({ sport: 'football', scoringType: 'ppr' })
    expect(s).toEqual({ cadence: 'weekly', scoring: 'points', source: 'detected' })
  })

  /* Unknown falls back per sport and says so, so the surface can offer the override instead
     of presenting a guess as a fact. */
  it('defaults a nightly sport to daily and admits it', () => {
    const s = leagueShape({ sport: 'hockey', scoringType: 'head' })
    expect(s).toEqual({ cadence: 'daily', scoring: 'categories', source: 'default' })
  })

  it('carries scoring through for all three kinds', () => {
    expect(leagueShape({ sport: 'hockey', scoringType: 'roto' }).scoring).toBe('roto')
    expect(leagueShape({ sport: 'hockey', scoringType: 'headpoint' }).scoring).toBe('points')
    expect(leagueShape({ sport: 'hockey', scoringType: 'head' }).scoring).toBe('categories')
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

`npx vitest run src/league/__tests__/leagueShape.test.ts` → FAIL, module missing.

- [ ] **Step 3: Implement**

Create `src/league/leagueShape.ts`:

```ts
import { getLeagueType } from '@/config/sports'

export type Cadence = 'daily' | 'weekly'
export type Scoring = 'points' | 'categories' | 'roto'
export type ShapeSource = 'manual' | 'detected' | 'default'

export interface LeagueShape {
  cadence: Cadence
  scoring: Scoring
  /** Where `cadence` came from. A guess must never be presented as a fact. */
  source: ShapeSource
}

/** Sports that play most nights, and can therefore run either cadence. */
const NIGHTLY = new Set(['hockey', 'basketball', 'baseball'])

/**
 * Lineup cadence from the platform, or null when it did not say.
 *
 * ESPN carries `rosterSettings.rosterLocktimeType`. Verified 2026-09-23 against its public
 * league defaults: `FIRSTGAME_SCORINGPERIOD` for hockey, basketball and baseball;
 * `INDIVIDUAL_GAME` for football.
 *
 * The asymmetry below is deliberate and is the honest part. A roster that locks at the first
 * game of the scoring period, in a sport that plays nightly, is committed for the night — that
 * is daily, and it was observed. Football's `INDIVIDUAL_GAME` is weekly because its scoring
 * period is already a week, which is a fact about the sport rather than about the string.
 *
 * What was NOT observed is what a weekly-lineup hockey league returns, because league defaults
 * for those sports are daily and only one of the two values was ever visible. Mapping
 * `INDIVIDUAL_GAME` to weekly in a nightly sport would be a rule inferred from the case it
 * happens to get right. So it returns null and the caller falls back visibly.
 */
export function detectCadence(input: {
  sport?: string | null
  rosterLocktimeType?: string | null
}): Cadence | null {
  const sport = String(input.sport ?? '')
  const lock = String(input.rosterLocktimeType ?? '')
  if (sport === 'football') return 'weekly'
  if (!NIGHTLY.has(sport) || !lock) return null
  return lock === 'FIRSTGAME_SCORINGPERIOD' ? 'daily' : null
}

/**
 * What kind of league this is, on the two axes that decide every page.
 *
 * The product used to ask `activeSport === 'football'` and take that as the answer to both,
 * which is wrong in both directions: a weekly-lineup hockey league was handed a daily optimiser
 * it could not act on. Sport decides which player universe to load and nothing else.
 *
 * Scoring reuses `getLeagueType` rather than reimplementing it — there is one definition of
 * what "roto" means and it already lives there.
 */
export function leagueShape(input: {
  sport?: string | null
  scoringType?: string | null
  rosterLocktimeType?: string | null
  manualCadence?: Cadence | null
}): LeagueShape {
  const sport = String(input.sport ?? '')
  const scoring: Scoring = sport === 'football' ? 'points' : getLeagueType(input.scoringType ?? undefined)

  if (input.manualCadence) {
    return { cadence: input.manualCadence, scoring, source: 'manual' }
  }
  const detected = detectCadence(input)
  if (detected) return { cadence: detected, scoring, source: 'detected' }

  /* Nightly sports default to daily because that is the more common setup and the one whose
     page is built; football has no other shape. Either way `source` says it was a default, so
     the surface offers the override rather than asserting. */
  return { cadence: NIGHTLY.has(sport) ? 'daily' : 'weekly', scoring, source: 'default' }
}
```

- [ ] **Step 4: Run it and watch it pass** — 9 cases.

- [ ] **Step 5: Commit**

```bash
git add src/league/leagueShape.ts src/league/__tests__/leagueShape.test.ts
git commit -m "$(cat <<'EOF'
league: cadence and scoring as one resolved shape

The nav asked `activeSport === 'football'` and took it as the answer to
both axes, so a weekly-lineup hockey league got a daily optimiser it
could not act on. Sport decides which player universe to load and
nothing else.

detectCadence is deliberately asymmetric: FIRSTGAME_SCORINGPERIOD in a
nightly sport was observed and means daily; INDIVIDUAL_GAME in a nightly
sport was never observed, so it returns null rather than inferring the
value it would be right about by accident.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: The nav reads shape, not sport

**Files:**
- Create: `src/composables/useLeagueShape.ts`
- Modify: `src/App.vue` (the `tabs` computed, ~line 1361)

**Interfaces:**
- Produces: `useLeagueShape()` → `{ shape: ComputedRef<LeagueShape>, setCadence: (c: Cadence | null) => void }`. `setCadence(null)` clears the override back to detection.

- [ ] **Step 1: Write the composable**

Create `src/composables/useLeagueShape.ts`. It must:

- Read `leagueStore.activeSport`, the active league's `scoring_type` (see `isRotoLeague` at `App.vue:1353` for the three places that field hides — Yahoo's array-wrapped league, `currentLeague`, and `savedLeagues`; reuse that lookup rather than inventing a fourth), and `rosterLocktimeType` **if the store carries it — check; it very likely does not yet, in which case pass undefined and let the resolver default.**
- Persist the manual override per league id in `localStorage` under `ufd:cadence:<leagueId>`, wrapped in try/catch (private windows throw).
- Return the computed shape and the setter.

Do NOT fetch anything. This is a resolver over state the store already holds.

- [ ] **Step 2: Wire the nav**

In `src/App.vue`, replace the first-tab expression:

```ts
  ...(leagueStore.activeSport === 'football'
    ? [{ name: 'This Week', path: '/this-week' }]
    : [{ name: 'Today', path: '/today' }]),
```

with one that reads the shape:

```ts
  /* Cadence, not sport. A hockey league that sets lineups weekly was being handed a daily
     optimiser it could not act on, and a daily league would get the reverse. See
     leagueShape — and note the label is all that changes here; the ROUTES still split by
     sport until the daily/weekly pages are unified. */
  ...(shape.value.cadence === 'weekly'
    ? [{ name: 'This Week', path: leagueStore.activeSport === 'football' ? '/this-week' : '/today' }]
    : [{ name: 'Today', path: '/today' }]),
```

**Read the surrounding computed before editing** — it carries long comments recording prior decisions and they must survive.

- [ ] **Step 3: Verify**

`npm test` (≥2003/218), `npx vue-tsc --noEmit 2>&1 | grep -c "error TS"` (**1445**), `npm run build`.

**Import audit by reading `App.vue`** — `useLeagueShape` must be explicitly imported.

- [ ] **Step 4: Commit**

```bash
git add src/composables/useLeagueShape.ts src/App.vue
git commit -m "$(cat <<'EOF'
nav: the first tab follows cadence, not sport

A weekly-lineup hockey league was handed a daily optimiser it could not
act on. Only the label moves here — the routes still split by sport
until the daily and weekly pages are unified.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## What this plan does NOT do

- **Unify the daily and weekly pages.** The label follows cadence; the route still follows sport. A weekly hockey league gets the right word and the wrong page — better than today, not finished.
- **Probe Yahoo or Sleeper.** Both return `source: 'default'` until someone reads a real league.
- **Surface the override in the UI.** `setCadence` exists and nothing calls it yet. Until it is surfaced, a mis-detected league has no way out — that is the first follow-up, not an optional polish.
- **Touch the projection feed.** The NHL rate model is its own piece.
