# Draft Report — Substance Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the points Draft Report from a leaderboard into a report — per-team "why" (best pick + steal/bust counts), top-3 steals & reaches, a spotlight narrative, keeper exclusion (ESPN/Sleeper), and headshots on the highlight surfaces.

**Architecture:** Keeper exclusion happens in the loaders (a keeper isn't a draft pick → it never enters the graded set). Enrichment (per-team stats, top lists, narrative) is added to the pure `buildDraftReport` reducer. The `HistoryView` section renders the new fields. Everything rides the existing `GradedDraft` → reducer → view pipeline; no new files.

**Tech Stack:** Vue 3 / TypeScript / Vitest. Builds on the Phase-1 Draft Report (`src/draft/report/*`, `src/composables/useDraftReport.ts`, `src/views/HistoryView.vue`).

**Local only** — no push.

---

## Task 1: extend contract types + reducer enrichment

**Files:**
- Modify: `src/draft/report/types.ts`
- Modify: `src/draft/report/buildDraftReport.ts`
- Modify: `src/draft/report/__tests__/buildDraftReport.test.ts`

- [ ] **Step 1: Extend the types** (`src/draft/report/types.ts`)

Add fields to existing interfaces (do NOT remove anything):
- `GradedPick`: after `finishedTier`, add:
  ```ts
    keeper?: boolean
    headshot?: string
    proTeam?: string
  ```
- `DraftHighlight`: after `valueLabel`, add:
  ```ts
    headshot?: string
    proTeam?: string
  ```
- `TeamGradeRow`: after `isMe`, add:
  ```ts
    bestPick: DraftHighlight | null
    steals: number
    busts: number
  ```
- `GradedDraft`: after `myTeamKey`, add:
  ```ts
    keeperCount?: number
  ```
- `DraftReport`: after `teamGrades`, add `topSteals`/`topReaches`/`keeperCount`, and add `narrative` to `mySpotlight`:
  ```ts
    topSteals: DraftHighlight[]
    topReaches: DraftHighlight[]
    keeperCount: number
    mySpotlight: {
      grade: string
      rank: number
      narrative: string
      bestPick: DraftHighlight | null
      worstPick: DraftHighlight | null
    } | null
  ```

- [ ] **Step 2: Extend the test** — add these cases to `src/draft/report/__tests__/buildDraftReport.test.ts` (keep the existing 7). The existing `pick()` helper defaults `verdict: 'SOLID'`; pass explicit verdicts where needed.

```ts
describe('buildDraftReport — substance', () => {
  const draft2: GradedDraft = {
    numTeams: 2, myTeamKey: 't1', keeperCount: 2,
    teams: [team('t1', 30, 1), team('t2', -10, 2)],
    picks: [
      pick({ teamKey: 't1', playerName: 'A', round: 10, score: 40, verdict: 'JACKPOT', tierMovement: 'WAIVER→ELITE' }),
      pick({ teamKey: 't1', playerName: 'B', round: 12, score: 25, verdict: 'STEAL' }),
      pick({ teamKey: 't1', playerName: 'C', round: 1, score: -20, verdict: 'BUST', tierMovement: 'ELITE→BENCH' }),
      pick({ teamKey: 't2', playerName: 'D', round: 2, score: -35, verdict: 'DISASTER' }),
      pick({ teamKey: 't2', playerName: 'E', round: 5, score: 5, verdict: 'SOLID' }),
    ],
  }

  it('per-team rows carry best pick + steal/bust counts', () => {
    const r = buildDraftReport(draft2, 2024)
    const t1 = r.teamGrades.find((t) => t.teamKey === 't1')!
    expect(t1.bestPick?.playerName).toBe('A')
    expect(t1.steals).toBe(2)   // JACKPOT + STEAL
    expect(t1.busts).toBe(1)    // BUST
    const t2 = r.teamGrades.find((t) => t.teamKey === 't2')!
    expect(t2.steals).toBe(0)
    expect(t2.busts).toBe(1)    // DISASTER
  })
  it('top steals/reaches are top-3 by score with sign filter', () => {
    const r = buildDraftReport(draft2, 2024)
    expect(r.topSteals.map((s) => s.playerName)).toEqual(['A', 'B', 'E']) // 40,25,5 (all >0)
    expect(r.topReaches.map((s) => s.playerName)).toEqual(['D', 'C'])     // -35,-20 (only <0)
  })
  it('keeperCount passes through', () => {
    expect(buildDraftReport(draft2, 2024).keeperCount).toBe(2)
    expect(buildDraftReport({ ...draft2, keeperCount: undefined }, 2024).keeperCount).toBe(0)
  })
  it('narrative: steals + a bust', () => {
    const r = buildDraftReport(draft2, 2024)
    expect(r.mySpotlight?.narrative).toBe('2 steals, led by A (Rd 10 · WAIVER→ELITE). Your biggest miss: C (Rd 1 · ELITE→BENCH).')
  })
  it('narrative: no steals, only a bust', () => {
    const d = { ...draft2, myTeamKey: 't2' }
    expect(buildDraftReport(d, 2024).mySpotlight?.narrative).toBe('A quiet draft — your roughest pick was D (Rd 2 · STARTER→STARTER).')
  })
  it('narrative: steady when neither', () => {
    const d: GradedDraft = { numTeams: 1, myTeamKey: 't1', teams: [team('t1', 0, 1)], picks: [
      pick({ teamKey: 't1', playerName: 'X', round: 3, score: 2, verdict: 'SOLID' }),
    ] }
    expect(buildDraftReport(d, 2024).mySpotlight?.narrative).toBe('A steady, no-drama draft.')
  })
  it('headshot/proTeam flow through highlights', () => {
    const d: GradedDraft = { numTeams: 1, myTeamKey: null, teams: [team('t1', 0, 1)], picks: [
      pick({ teamKey: 't1', playerName: 'H', round: 9, score: 30, verdict: 'STEAL', headshot: 'h.png', proTeam: 'NYY' }),
    ] }
    expect(buildDraftReport(d, 2024).steal?.headshot).toBe('h.png')
    expect(buildDraftReport(d, 2024).steal?.proTeam).toBe('NYY')
  })
})
```
Also update the existing `pick()` helper's return to pass through the new optional fields — change its return object to spread-preserve them (it already does `...p` last, so `headshot`/`proTeam`/`keeper` on `p` flow through automatically; verify no change needed).

- [ ] **Step 3: Run to verify new cases fail**

Run: `npx vitest run src/draft/report/__tests__/buildDraftReport.test.ts`
Expected: the new `substance` cases FAIL (fields undefined); the original 7 still pass.

- [ ] **Step 4: Implement the reducer changes** (`src/draft/report/buildDraftReport.ts`)

Replace the file with:
```ts
import type { GradedDraft, GradedPick, DraftReport, DraftHighlight, TeamGradeRow } from './types'

const STEAL_VERDICTS = new Set(['JACKPOT', 'STEAL'])
const BUST_VERDICTS = new Set(['BUST', 'DISASTER'])

function toHighlight(p: GradedPick): DraftHighlight {
  return {
    teamKey: p.teamKey, teamName: p.teamName, teamLogo: p.teamLogo,
    playerName: p.playerName, position: p.position, round: p.round, overallPick: p.overallPick,
    grade: p.grade, score: p.score, verdict: p.verdict,
    valueLabel: `Rd ${p.round} · ${p.tierMovement}`,
    headshot: p.headshot, proTeam: p.proTeam,
  }
}

/** Pure highlight selection + enrichment over a normalized, pre-graded draft. Never throws. */
export function buildDraftReport(draft: GradedDraft, season: number): DraftReport {
  const { picks, teams, numTeams, myTeamKey } = draft

  const steal = picks.length ? toHighlight([...picks].sort((a, b) => b.score - a.score)[0]) : null
  const early = picks.filter((p) => p.round <= 5)
  const bustPool = early.length ? early : picks
  const bust = bustPool.length ? toHighlight([...bustPool].sort((a, b) => a.score - b.score)[0]) : null

  const topSteals = [...picks].filter((p) => p.score > 0).sort((a, b) => b.score - a.score).slice(0, 3).map(toHighlight)
  const topReaches = [...picks].filter((p) => p.score < 0).sort((a, b) => a.score - b.score).slice(0, 3).map(toHighlight)

  const picksByTeam = new Map<string, GradedPick[]>()
  for (const p of picks) {
    const arr = picksByTeam.get(p.teamKey)
    if (arr) arr.push(p)
    else picksByTeam.set(p.teamKey, [p])
  }

  const teamGrades: TeamGradeRow[] = teams.map((t) => {
    const tp = picksByTeam.get(t.teamKey) ?? []
    return {
      teamKey: t.teamKey, teamName: t.teamName, teamLogo: t.teamLogo,
      grade: t.grade, gradeScore: t.gradeScore, rank: t.rank,
      isMe: myTeamKey != null && t.teamKey === myTeamKey,
      bestPick: tp.length ? toHighlight([...tp].sort((a, b) => b.score - a.score)[0]) : null,
      steals: tp.filter((p) => STEAL_VERDICTS.has(p.verdict)).length,
      busts: tp.filter((p) => BUST_VERDICTS.has(p.verdict)).length,
    }
  })

  const bestDrafter = teamGrades[0] ?? null
  const worstDrafter = teamGrades.length ? teamGrades[teamGrades.length - 1] : null

  let mySpotlight: DraftReport['mySpotlight'] = null
  if (myTeamKey != null) {
    const me = teamGrades.find((t) => t.teamKey === myTeamKey)
    if (me) {
      const mine = picks.filter((p) => p.teamKey === myTeamKey)
      const byScoreDesc = [...mine].sort((a, b) => b.score - a.score)
      const byScoreAsc = [...mine].sort((a, b) => a.score - b.score)
      const bestPick = mine.length ? toHighlight(byScoreDesc[0]) : null
      const worstPick = mine.length ? toHighlight(byScoreAsc[0]) : null
      const mySteals = mine.filter((p) => STEAL_VERDICTS.has(p.verdict)).sort((a, b) => b.score - a.score)
      const lowest = mine.length ? byScoreAsc[0] : null
      const myBust = lowest && BUST_VERDICTS.has(lowest.verdict) ? lowest : null
      let narrative: string
      if (mySteals.length) {
        const lead = mySteals[0]
        narrative = `${mySteals.length} steal${mySteals.length > 1 ? 's' : ''}, led by ${lead.playerName} (Rd ${lead.round} · ${lead.tierMovement}).`
        if (myBust) narrative += ` Your biggest miss: ${myBust.playerName} (Rd ${myBust.round} · ${myBust.tierMovement}).`
      } else if (myBust) {
        narrative = `A quiet draft — your roughest pick was ${myBust.playerName} (Rd ${myBust.round} · ${myBust.tierMovement}).`
      } else {
        narrative = 'A steady, no-drama draft.'
      }
      mySpotlight = { grade: me.grade, rank: me.rank, narrative, bestPick, worstPick }
    }
  }

  return {
    season, teamCount: numTeams,
    steal, bust, topSteals, topReaches,
    bestDrafter, worstDrafter, teamGrades,
    keeperCount: draft.keeperCount ?? 0,
    mySpotlight,
  }
}
```

- [ ] **Step 5: Run to verify all pass**

Run: `npx vitest run src/draft/report/__tests__/buildDraftReport.test.ts`
Expected: PASS (original 7 + new substance cases).

- [ ] **Step 6: Type-check + commit**

Run: `npm run type-check 2>&1 | grep -iE "draft/report|buildDraftReport"` → expect no output. (Consumers reading `TeamGradeRow`/`DraftReport` now need the new required fields — the loaders don't build these; only the reducer does, and the view reads them. If type-check flags the loaders, that's because `GradedPick.keeper/headshot/proTeam` are OPTIONAL so loaders still satisfy `GradedPick` — no loader change needed for THIS task.)
```bash
git add src/draft/report/types.ts src/draft/report/buildDraftReport.ts src/draft/report/__tests__/buildDraftReport.test.ts
git commit -m "feat: draft report reducer — per-team why, top steals/reaches, narrative, keeperCount"
```
(Harmless gc.log warning may print; verify with `git log --oneline -1`.)

---

## Task 2: keeper exclusion + headshots in the loaders

**Files:**
- Modify: `src/draft/report/loadEspnPointsDraft.ts`
- Modify: `src/draft/report/loadYahooPointsDraft.ts`
- Modify: `src/draft/report/loadSleeperPointsDraft.ts`

READ each loader first. For each, make two changes: (a) exclude keeper picks before grading and count them into `keeperCount`; (b) populate `headshot`/`proTeam` on each `GradedPick`.

- [ ] **Step 1: ESPN** (`loadEspnPointsDraft.ts`)

- Keeper: `EspnDraftPick` has `keeper: boolean`. Before the grading loop, filter the draft picks into non-keepers for grading and count keepers: `const keeperCount = draftPicks.filter(p => p.keeper).length` and grade only `draftPicks.filter(p => !p.keeper)`.
- Headshot/proTeam on each GradedPick: `headshot: espnHeadshotUrl(pick.playerId, sport)` — reuse the same URL builder the codebase uses (READ `src/myteam/espn/mapRosters.ts` for `espnHeadshotUrl`, or the old `PointsDraftView` ESPN branch's headshot string `https://a.espncdn.com/combiner/i?img=/i/headshots/mlb/players/full/${pick.playerId}.png&w=96&h=70&cb=1` — use whichever is already exported/used); `proTeam: pick.proTeam || undefined`.
- Return `keeperCount` on the `GradedDraft`.

- [ ] **Step 2: Yahoo** (`loadYahooPointsDraft.ts`)

- Keeper: Yahoo `getDraftResults` does NOT expose a keeper flag — set `keeperCount: 0` and grade all picks (documented gap). Do NOT invent a keeper field.
- Headshot/proTeam: the `getPlayers` map entries carry `headshot` and `team` — set `headshot: player.headshot || undefined`, `proTeam: player.team || undefined` on each GradedPick (use the player looked up by `player_key`).
- Return `keeperCount: 0`.

- [ ] **Step 3: Sleeper** (`loadSleeperPointsDraft.ts`)

- Keeper: raw Sleeper picks carry `metadata.is_keeper` (truthy string/bool = keeper). Filter: `const isKeeper = (pick) => { const v = pick.metadata?.is_keeper; return v === true || v === 'true' || v === 1 || v === '1' }`. Count keepers into `keeperCount` and grade only non-keepers.
- Headshot/proTeam: `headshot: pick.metadata?.headshot_url || undefined`; MLB pro team is typically absent on Sleeper pick metadata → `proTeam: undefined` (leave it; the view degrades).
- Return `keeperCount`.

- [ ] **Step 4: Verify**

Run: `npm run type-check 2>&1 | grep -iE "loadEspn|loadYahoo|loadSleeper"` → expect no output.
Run: `npm run build` → expect success.

- [ ] **Step 5: Commit**

```bash
git add src/draft/report/loadEspnPointsDraft.ts src/draft/report/loadYahooPointsDraft.ts src/draft/report/loadSleeperPointsDraft.ts
git commit -m "feat: draft loaders — exclude keepers (ESPN/Sleeper) + carry headshot/proTeam"
```

---

## Task 3: render the substance in `HistoryView.vue`

**Files:**
- Modify: `src/views/HistoryView.vue`

READ the current Draft Report section. It uses `draft.report.value` with `steal`/`bust`/`bestDrafter`/`worstDrafter`/`teamGrades`/`mySpotlight`. Match the file's existing card idioms (it uses `primaryTint()`, headshot imgs elsewhere — reuse that img pattern for player headshots, with an initial/hidden fallback on error).

- [ ] **Step 1: Keeper note** — under the season picker, add:
```html
          <p v-if="draft.report.value && draft.report.value.keeperCount > 0" class="mb-2 font-mono text-[10px] text-dark-textMuted">
            {{ draft.report.value.keeperCount }} keepers excluded from grading
          </p>
```

- [ ] **Step 2: Headshots on steal/bust cards** — in the steal card and bust card, before/next to the player name, add a headshot img when present (match the app's player headshot markup — small rounded img, `@error` hides it):
```html
                <img v-if="draft.report.value.steal.headshot" :src="draft.report.value.steal.headshot" alt=""
                  @error="(e) => ((e.target as HTMLElement).style.display = 'none')"
                  class="h-8 w-8 shrink-0 rounded-full bg-dark-border object-cover" />
```
(Do the same in the bust card with `draft.report.value.bust.headshot`. Keep the existing text; place the img inline so the layout stays clean.)

- [ ] **Step 3: Top steals / top reaches lists** — after the steal/bust hero pair (`grid ... sm:grid-cols-2`) and before "Draft MVP", add two compact lists:
```html
            <div v-if="draft.report.value.topSteals.length || draft.report.value.topReaches.length" class="grid gap-3 sm:grid-cols-2">
              <div v-if="draft.report.value.topSteals.length" class="rounded-xl border border-dark-border bg-dark-card p-4">
                <div class="mb-2 font-mono text-[10px] uppercase tracking-wider text-primary">Top steals</div>
                <div v-for="(s, i) in draft.report.value.topSteals" :key="'st' + i" class="flex items-center justify-between py-1 text-sm">
                  <span class="min-w-0 truncate text-dark-text">{{ s.playerName }} <span class="text-xs text-dark-textMuted">· {{ s.valueLabel }}</span></span>
                  <span class="ml-2 shrink-0 font-display font-bold text-primary">{{ s.grade }}</span>
                </div>
              </div>
              <div v-if="draft.report.value.topReaches.length" class="rounded-xl border border-dark-border bg-dark-card p-4">
                <div class="mb-2 font-mono text-[10px] uppercase tracking-wider text-[#e0625a]">Top reaches</div>
                <div v-for="(s, i) in draft.report.value.topReaches" :key="'re' + i" class="flex items-center justify-between py-1 text-sm">
                  <span class="min-w-0 truncate text-dark-text">{{ s.playerName }} <span class="text-xs text-dark-textMuted">· {{ s.valueLabel }}</span></span>
                  <span class="ml-2 shrink-0 font-display font-bold text-[#e0625a]">{{ s.grade }}</span>
                </div>
              </div>
            </div>
```

- [ ] **Step 4: Per-team "why"** — in the "Every team, graded" row, under the team name add a muted sub-line with best pick + steal/bust counts. Restructure the row so the name + sub-line stack; keep the grade on the right:
```html
              <div v-for="t in draft.report.value.teamGrades" :key="t.teamKey"
                class="flex items-center justify-between border-b border-dark-border/40 py-1.5 last:border-0"
                :class="t.isMe ? 'text-primary' : 'text-dark-text'">
                <span class="flex min-w-0 items-center gap-2">
                  <span class="w-5 shrink-0 font-mono text-xs text-dark-textMuted">{{ t.rank }}</span>
                  <TeamAvatar :name="t.teamName" :logo="t.teamLogo" :size="24" />
                  <span class="min-w-0">
                    <span class="block truncate text-sm">{{ t.teamName }}<span v-if="t.isMe" class="ml-1 text-xs">(you)</span></span>
                    <span v-if="t.bestPick" class="block truncate font-mono text-[10px] text-dark-textMuted">
                      ↑{{ t.steals }} ↓{{ t.busts }} · best: {{ t.bestPick.playerName }}
                    </span>
                  </span>
                </span>
                <span class="ml-2 shrink-0 font-display text-sm font-bold">{{ t.grade }}</span>
              </div>
```

- [ ] **Step 5: Narrative in the spotlight** — in the "Your draft" card, add the narrative as the first line (above the grade line):
```html
              <div v-if="draft.report.value.mySpotlight.narrative" class="mb-1 text-sm text-dark-text">{{ draft.report.value.mySpotlight.narrative }}</div>
```

- [ ] **Step 6: Verify**

Run: `npm run type-check 2>&1 | grep -i HistoryView` → expect no output.
Run: `npm run build` → expect success.

- [ ] **Step 7: Commit**

```bash
git add src/views/HistoryView.vue
git commit -m "feat: History draft report — top lists, per-team why, narrative, headshots, keeper note"
```

---

## Task 4: Full verification

- [ ] **Step 1:** `npm test` → all pass, up by the new reducer cases, none regressed.
- [ ] **Step 2:** `npm run type-check && npm run build` → build succeeds; type-check not above the 62 baseline for unrelated files.
- [ ] **Step 3: Manual smoke (user, real league):** on the same points league — the "Rd 12 keeper steal" artifact should be GONE if it was a keeper; top steals/reaches lists render; every-team rows show best pick + ↑/↓ counts; your spotlight leads with the narrative sentence; headshots appear on the highlight cards; a keeper note shows the excluded count (ESPN/Sleeper). Category league still shows the "points only" note. Check ESPN + Yahoo (+ Sleeper).
- [ ] **Step 4:** commit any smoke fix.

---

## Self-Review Notes

- **Spec coverage:** per-team why (Task 1 reducer + Task 3 row); top steals/reaches (Task 1 + Task 3 lists); narrative (Task 1 + Task 3 spotlight); keeper exclusion (Task 2 loaders, ESPN/Sleeper; Yahoo gap noted); headshots (Task 2 loaders + Task 3 cards). Keeper filtering in loaders means grades/steal/bust/lists all exclude keepers with one change.
- **Type consistency:** new `GradedPick` fields are OPTIONAL (loaders compile unchanged); new `TeamGradeRow`/`DraftReport` fields are REQUIRED and produced only by the reducer (Task 1) + read by the view (Task 3). `DraftHighlight` carries headshot/proTeam through `toHighlight`.
- **Narrative rules** are deterministic and unit-tested for all four branches.
