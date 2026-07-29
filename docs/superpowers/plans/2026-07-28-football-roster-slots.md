# Football Roster-Slot Parsing (Football Phase 2a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `parseRosterSlots` sport-aware so a football league's starting-lineup shape parses correctly (QB/RB/WR/TE/FLEX/K/DEF) on ESPN, Yahoo, and Sleeper — with baseball unchanged.

**Architecture:** Add football roster constants (ESPN NFL slot-id map, default NFL roster, Sleeper/Yahoo flex aliases) beside the existing baseball ones in `src/trades/rosterSlots.ts`, add a `sport` param (default `'baseball'`), select the sport's maps, add a Sleeper branch, and gate the baseball outfield-fold to baseball.

**Tech Stack:** TypeScript, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-28-football-roster-slots-design.md`

**Standing constraint:** Local only — commit, never push/deploy. Test with `npx vitest run <path>`; build with `npm run build`.

---

## File Structure

- **Modify** `src/trades/rosterSlots.ts` — add football constants + make `parseRosterSlots` sport-aware + add Sleeper branch.
- **Create** `src/trades/__tests__/rosterSlots.test.ts` — unit tests (football on 3 platforms + baseball no-regression + fallbacks).

Single cohesive change to one function; one TDD task.

---

### Task 1: Sport-aware `parseRosterSlots` (TDD)

**Files:**
- Modify: `src/trades/rosterSlots.ts`
- Test: `src/trades/__tests__/rosterSlots.test.ts`

**Current `src/trades/rosterSlots.ts` (for reference — you are REPLACING its body below):** it exports `FLEX_ELIGIBILITY`, `DEFAULT_SLOTS`, and `parseRosterSlots(platform, settings)`, with a private `NON_STARTING` set and `ESPN_SLOT_TO_POS` map. Keep `FLEX_ELIGIBILITY` exactly as-is (do not touch it).

- [ ] **Step 1: Write the failing test**

Create `src/trades/__tests__/rosterSlots.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseRosterSlots } from '../rosterSlots'

describe('parseRosterSlots — football', () => {
  it('ESPN football: numeric lineupSlotCounts → NFL roster shape (bench excluded)', () => {
    const settings = {
      rosterSettings: { lineupSlotCounts: { '0': 1, '2': 2, '4': 2, '6': 1, '23': 1, '16': 1, '17': 1, '20': 6 } },
    }
    expect(parseRosterSlots('espn', settings, 'football')).toEqual({
      QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, DEF: 1, K: 1,
    })
  })

  it('Sleeper football: roster_positions labels → NFL roster shape (BN/IR/TAXI excluded)', () => {
    const settings = {
      roster_positions: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF', 'BN', 'BN', 'IR', 'TAXI'],
    }
    expect(parseRosterSlots('sleeper', settings, 'football')).toEqual({
      QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, K: 1, DEF: 1,
    })
  })

  it('Sleeper football: flex aliases normalize to FLEX / SUPER_FLEX', () => {
    const settings = { roster_positions: ['QB', 'WRRB_FLEX', 'REC_FLEX', 'SUPER_FLEX'] }
    expect(parseRosterSlots('sleeper', settings, 'football')).toEqual({
      QB: 1, FLEX: 2, SUPER_FLEX: 1,
    })
  })

  it('Yahoo football: position labels incl. W/R/T flex → FLEX', () => {
    const settings = {
      roster_positions: [
        { roster_position: { position: 'QB', count: 1 } },
        { roster_position: { position: 'RB', count: 2 } },
        { roster_position: { position: 'WR', count: 2 } },
        { roster_position: { position: 'TE', count: 1 } },
        { roster_position: { position: 'W/R/T', count: 1 } },
        { roster_position: { position: 'Q/W/R/T', count: 1 } },
        { roster_position: { position: 'K', count: 1 } },
        { roster_position: { position: 'DEF', count: 1 } },
        { roster_position: { position: 'BN', count: 5 } },
      ],
    }
    expect(parseRosterSlots('yahoo', settings, 'football')).toEqual({
      QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, SUPER_FLEX: 1, K: 1, DEF: 1,
    })
  })

  it('football fallback when settings are empty', () => {
    expect(parseRosterSlots('sleeper', null, 'football')).toEqual({
      QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, K: 1, DEF: 1,
    })
  })
})

describe('parseRosterSlots — baseball (no regression)', () => {
  it('ESPN baseball still maps slot-ids and folds LF/CF/RF into OF', () => {
    const settings = {
      rosterSettings: { lineupSlotCounts: { '0': 1, '4': 1, '8': 1, '9': 1, '10': 1, '14': 2, '15': 1, '16': 5 } },
    }
    // 0→C, 4→SS, 8/9/10 (LF/CF/RF) fold → OF:3, 14→SP:2, 15→RP:1, 16 (bench) excluded
    expect(parseRosterSlots('espn', settings)).toEqual({ C: 1, SS: 1, OF: 3, SP: 2, RP: 1 })
  })

  it('baseball fallback when settings are empty (default sport)', () => {
    expect(parseRosterSlots('espn', null)).toEqual({
      C: 1, '1B': 1, '2B': 1, '3B': 1, SS: 1, OF: 3, UTIL: 2, SP: 5, RP: 3,
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/trades/__tests__/rosterSlots.test.ts`
Expected: FAIL — the football tests fail (current `parseRosterSlots` ignores the 3rd arg and uses the baseball slot map). The two baseball tests should PASS already.

- [ ] **Step 3: Replace `src/trades/rosterSlots.ts` with:**

```ts
/** Slots that don't require a started player — excluded from need/surplus math. */
const NON_STARTING = new Set(['BN', 'BE', 'IL', 'NA', 'IR', 'DL', 'TAXI'])

/** ESPN MLB lineup slot id -> position label. Bench(16)/IL(17) intentionally absent. */
const ESPN_SLOT_TO_POS: Record<string, string> = {
  '0': 'C', '1': '1B', '2': '2B', '3': '3B', '4': 'SS', '5': 'OF',
  '6': '2B/SS', '7': '1B/3B', '8': 'LF', '9': 'CF', '10': 'RF', '11': 'DH',
  '12': 'UTIL', '13': 'P', '14': 'SP', '15': 'RP',
}

/** ESPN NFL lineup slot id -> position label. Bench(20)/IR(21) intentionally absent. */
const ESPN_NFL_SLOT_TO_POS: Record<string, string> = {
  '0': 'QB', '2': 'RB', '3': 'RB/WR', '4': 'WR', '5': 'WR/TE', '6': 'TE',
  '7': 'SUPER_FLEX', '16': 'DEF', '17': 'K', '23': 'FLEX',
}

/** Sleeper NFL flex slot labels -> canonical bucket. Non-flex labels pass through. */
const SLEEPER_NFL_FLEX_ALIASES: Record<string, string> = {
  WRRB_FLEX: 'FLEX', REC_FLEX: 'FLEX', FLEX: 'FLEX', SUPER_FLEX: 'SUPER_FLEX',
}

/** Yahoo NFL flex position labels -> canonical bucket. Non-flex labels pass through. */
const YAHOO_NFL_FLEX_ALIASES: Record<string, string> = {
  'W/R/T': 'FLEX', 'Q/W/R/T': 'SUPER_FLEX',
}

/** A flex slot -> the concrete eligible sub-positions that may fill it. */
export const FLEX_ELIGIBILITY: Record<string, string[]> = {
  UTIL: ['C', '1B', '2B', '3B', 'SS', 'OF', 'LF', 'CF', 'RF', 'DH'],
  DH: ['C', '1B', '2B', '3B', 'SS', 'OF', 'LF', 'CF', 'RF', 'DH'],
  IF: ['1B', '2B', '3B', 'SS'],
  MI: ['2B', 'SS'],
  CI: ['1B', '3B'],
  OF: ['OF', 'LF', 'CF', 'RF'],
  P: ['SP', 'RP', 'P'],
  '2B/SS': ['2B', 'SS'],
  '1B/3B': ['1B', '3B'],
}

/** Standard 12-team mixed-league baseball roster when settings are unavailable. */
export const DEFAULT_SLOTS: Record<string, number> = {
  C: 1, '1B': 1, '2B': 1, '3B': 1, SS: 1, OF: 3, UTIL: 2, SP: 5, RP: 3,
}

/** Standard 10-team football starting roster when settings are unavailable. */
export const DEFAULT_NFL_SLOTS: Record<string, number> = {
  QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, K: 1, DEF: 1,
}

export function parseRosterSlots(
  platform: 'yahoo' | 'espn' | 'sleeper' | string,
  settings: any,
  sport: string = 'baseball',
): Record<string, number> {
  const isFootball = sport === 'football'
  const espnMap = isFootball ? ESPN_NFL_SLOT_TO_POS : ESPN_SLOT_TO_POS
  const out: Record<string, number> = {}

  if (platform === 'yahoo' && Array.isArray(settings?.roster_positions)) {
    for (const rp of settings.roster_positions) {
      const node = rp?.roster_position ?? rp
      const raw = String(node?.position ?? '').trim()
      const pos = YAHOO_NFL_FLEX_ALIASES[raw] ?? raw
      const count = Number(node?.count ?? 0)
      if (!pos || NON_STARTING.has(pos) || count <= 0) continue
      out[pos] = (out[pos] ?? 0) + count
    }
  } else if (platform === 'sleeper' && Array.isArray(settings?.roster_positions)) {
    for (const slot of settings.roster_positions as string[]) {
      const raw = String(slot || '').trim()
      if (!raw || NON_STARTING.has(raw)) continue
      const pos = SLEEPER_NFL_FLEX_ALIASES[raw] ?? raw
      out[pos] = (out[pos] ?? 0) + 1
    }
  } else if (platform === 'espn' && settings?.rosterSettings?.lineupSlotCounts) {
    for (const [slotId, count] of Object.entries(settings.rosterSettings.lineupSlotCounts)) {
      const pos = espnMap[slotId]
      const n = Number(count)
      if (!pos || NON_STARTING.has(pos) || n <= 0) continue
      out[pos] = (out[pos] ?? 0) + n
    }
  }

  // Baseball only: fold granular outfield slots into one OF pool. Managers think in "OF",
  // and an OF-eligible player fills any of LF/CF/RF — keeping them separate manufactured
  // phantom holes. Football has no such slots, so skip it there.
  if (!isFootball) {
    for (const g of ['LF', 'CF', 'RF']) {
      if (out[g]) { out['OF'] = (out['OF'] ?? 0) + out[g]; delete out[g] }
    }
  }

  if (Object.keys(out).length) return out
  return isFootball ? { ...DEFAULT_NFL_SLOTS } : { ...DEFAULT_SLOTS }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/trades/__tests__/rosterSlots.test.ts`
Expected: PASS — 7 tests.

- [ ] **Step 5: Verify the whole app still builds**

Run: `npm run build`
Expected: `✓ built in …`, no TypeScript errors. (The added optional `sport` param is backward-compatible — existing 2-arg callers still typecheck.)

- [ ] **Step 6: Commit**

```bash
git add src/trades/rosterSlots.ts src/trades/__tests__/rosterSlots.test.ts
git commit -m "feat: parseRosterSlots — football roster shapes (ESPN/Yahoo/Sleeper)"
```
(A harmless git gc `bad object refs/remotes/origin/main` warning may print — ignore it; verify with `git log --oneline -1`.)

---

## Final verification

- [ ] `npx vitest run src/trades/__tests__/rosterSlots.test.ts` → 7/7 PASS.
- [ ] `npm run build` → clean, no type errors from the new optional param.

## Notes / scope reminders

- **Callers are unchanged** — the four callers (`useYahooLeaguePool`, `useEspnPointsTeamData`, `useEspnCategoryTeamData`, `useMyRoster`) keep passing `(platform, settings)`; the `sport` default of `'baseball'` preserves their behavior exactly. Threading the real `sport` through them happens in the value-model phase.
- **`FLEX_ELIGIBILITY` is untouched** — the eligibility-matching layer and the display grids are phase 2b.
- The football `sport` value comes from `leagueStore.activeSport` at the wiring boundary later; this function accepts any string and treats non-`'football'` as baseball.
