# Draft Report — Critique Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Fix the five credibility problems in the points Draft Report surfaced by real-league use: (1) grades that don't discriminate (everyone A+→B−), (2) keeper-league framing (grade the scraps, ignore the kept value), (3) hero/list redundancy, (4) "worst pick" flagging neutral fliers, (5) uninformative repeated letters in the top lists.

**Design decisions (user-approved):**
- **Grade spread:** replace the generous relative curve with a **rank-spread across the full A+→F range** (worst draft can be a D/F), computed in the reducer from `rank`/`numTeams`; plus a **score gap** ("+N vs field") so the letter isn't the only signal and a genuinely-close league reads as close.
- **Top keepers:** loaders retain keeper picks and label each with a **finished tier** (computed over the FULL player pool — keepers included — so "finished ELITE" is real); the reducer selects the best-held keepers; the view adds a "Top keepers held" section. Draft-pick grading is UNCHANGED (still keeper-excluded pools) — only keeper *display* value is added.
- **Redundancy:** drop the standalone hero steal/bust cards; the top-3 lists already lead with the biggest.
- **Worst pick:** show only when it's an actual bust (BUST/DISASTER verdict); else null (aligns with the narrative, which already gates this).
- **Top lists:** show each row's numeric `score` instead of the maxed-out letter (so #1 vs #3 differ).

**Tech Stack:** Vue 3 / TS / Vitest. Extends `src/draft/report/*`, `src/views/HistoryView.vue`. Local only.

---

## Task 1: reducer — spread grade, score gap, top keepers, worst-pick gate

**Files:**
- Modify: `src/draft/report/types.ts`
- Modify: `src/draft/report/buildDraftReport.ts`
- Modify: `src/draft/report/__tests__/buildDraftReport.test.ts`

- [ ] **Step 1: Types** (`types.ts`)
  - Add a `KeeperInfo` interface:
    ```ts
    export interface KeeperInfo {
      teamKey: string
      teamName: string
      teamLogo?: string
      playerName: string
      position: string
      round: number          // keeper round (0 if unknown)
      finishedTier: string   // ELITE | STARTER | BENCH | REPLACEMENT | WAIVER
      points: number
      headshot?: string
      proTeam?: string
    }
    ```
  - `GradedDraft`: after `keeperCount?`, add `keepers?: KeeperInfo[]`.
  - `TeamGradeRow`: after `busts`, add `scoreGap: number`.
  - `DraftReport`: after `topReaches`, add `topKeepers: KeeperInfo[]`.
  - (`mySpotlight.worstPick` type is unchanged — `DraftHighlight | null` — but the reducer will now set it to null for non-busts.)

- [ ] **Step 2: Add tests** to `buildDraftReport.test.ts` (keep all existing). Add a `keeper()` fixture helper near the top of the new describe:
```ts
describe('buildDraftReport — critique fixes', () => {
  function keeper(teamKey: string, playerName: string, finishedTier: string, points: number, round = 15) {
    return { teamKey, teamName: teamKey, teamLogo: '', playerName, position: 'OF', round, finishedTier, points }
  }
  const base: GradedDraft = {
    numTeams: 4, myTeamKey: 't1', keeperCount: 3,
    teams: [team('t1', 20, 1), team('t2', 4, 2), team('t3', -4, 3), team('t4', -20, 4)], // sum 0 → mean 0
    picks: [
      pick({ teamKey: 't1', playerName: 'MySteal', round: 12, score: 40, verdict: 'JACKPOT' }),
      pick({ teamKey: 't1', playerName: 'MyMeh', round: 10, score: -3, verdict: 'SOLID' }), // lowest but NOT a bust
      pick({ teamKey: 't4', playerName: 'Flop', round: 2, score: -40, verdict: 'DISASTER' }),
    ],
    keepers: [
      keeper('t2', 'Held Ace', 'ELITE', 400, 18),
      keeper('t1', 'Held Bat', 'STARTER', 300, 14),
      keeper('t3', 'Held Dud', 'REPLACEMENT', 50, 20),
    ],
  }

  it('grades spread across the full A+..F range by rank', () => {
    const r = buildDraftReport(base, 2024)
    const g = r.teamGrades.map((t) => t.grade)
    expect(g[0]).toBe('A+')                 // rank 1
    expect(g[g.length - 1]).toBe('F')       // rank 4 (worst) reaches F
    expect(new Set(g).size).toBeGreaterThan(2) // genuinely spread, not clustered
  })
  it('score gap = gradeScore minus league mean, rounded', () => {
    const r = buildDraftReport(base, 2024)
    // mean of [20,4,-4,-20] = 0 → t1 gap = 20; t4 gap = -20
    expect(r.teamGrades.find((t) => t.teamKey === 't1')!.scoreGap).toBe(20)
    expect(r.teamGrades.find((t) => t.teamKey === 't4')!.scoreGap).toBe(-20)
  })
  it('top keepers = ELITE/STARTER finishers, best first; drops REPLACEMENT', () => {
    const r = buildDraftReport(base, 2024)
    expect(r.topKeepers.map((k) => k.playerName)).toEqual(['Held Ace', 'Held Bat'])
  })
  it('worst pick only shows a real bust (else null)', () => {
    const r = buildDraftReport(base, 2024) // my lowest is MyMeh (SOLID, -3) — not a bust
    expect(r.mySpotlight?.worstPick).toBeNull()
    const r2 = buildDraftReport({ ...base, myTeamKey: 't4' }, 2024) // t4's lowest is Flop (DISASTER)
    expect(r2.mySpotlight?.worstPick?.playerName).toBe('Flop')
  })
  it('no keepers -> empty topKeepers', () => {
    expect(buildDraftReport({ ...base, keepers: undefined }, 2024).topKeepers).toEqual([])
  })
})
```

- [ ] **Step 3: Run** `npx vitest run src/draft/report/__tests__/buildDraftReport.test.ts` — new cases FAIL, prior pass.

- [ ] **Step 4: Implement** — edit `buildDraftReport.ts`:
  - Add near the top (module scope):
    ```ts
    const SPREAD_GRADES = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F']
    function spreadGrade(rank: number, numTeams: number): string {
      if (numTeams <= 1) return 'A'
      const pos = (rank - 1) / (numTeams - 1)
      return SPREAD_GRADES[Math.round(pos * (SPREAD_GRADES.length - 1))]
    }
    const TIER_RANK: Record<string, number> = { ELITE: 0, STARTER: 1, BENCH: 2, REPLACEMENT: 3, WAIVER: 4 }
    ```
  - In `buildDraftReport`, compute the league mean gradeScore once:
    ```ts
    const meanScore = teams.length ? teams.reduce((s, t) => s + t.gradeScore, 0) / teams.length : 0
    ```
  - In the `teamGrades` map, set `grade: spreadGrade(t.rank, teams.length)` (REPLACING `grade: t.grade`) and add `scoreGap: Math.round(t.gradeScore - meanScore)`.
  - After `teamGrades`, compute top keepers:
    ```ts
    const topKeepers = (draft.keepers ?? [])
      .filter((k) => k.finishedTier === 'ELITE' || k.finishedTier === 'STARTER')
      .sort((a, b) => (TIER_RANK[a.finishedTier] ?? 9) - (TIER_RANK[b.finishedTier] ?? 9) || b.points - a.points)
      .slice(0, 5)
    ```
  - In the `mySpotlight` block, gate the worst pick: keep `bestPick` as-is, but set `worstPick` only when the lowest pick is a real bust:
    ```ts
      const worstPick = mine.length && BUST_VERDICTS.has(byScoreAsc[0].verdict) ? toHighlight(byScoreAsc[0]) : null
    ```
    (Leave the narrative logic unchanged — it already uses `myBust` gated on BUST_VERDICTS.)
  - `mySpotlight.grade` must use the recomputed spread grade: it already reads `me.grade` where `me = teamGrades.find(...)`, and `teamGrades` now carries the spread grade — so no extra change, just confirm `me.grade` is the spread grade.
  - Add `topKeepers` to the returned object; ensure `bestDrafter`/`worstDrafter` (still `teamGrades[0]`/last) now carry the spread grade automatically.

- [ ] **Step 5: Run** the test file — all pass. Then `npm run type-check 2>&1 | grep -iE "draft/report|buildDraftReport"` (expect none).

- [ ] **Step 6: Commit**
```bash
git add src/draft/report/types.ts src/draft/report/buildDraftReport.ts src/draft/report/__tests__/buildDraftReport.test.ts
git commit -m "feat: draft report reducer — spread grades A+..F + score gap, top keepers, gate worst pick"
```
(Ignore the gc.log warning; verify with `git log --oneline -1`.)

---

## Task 2: loaders — emit keeper info with finished tier

**Files:**
- Modify: `src/draft/report/loadEspnPointsDraft.ts`
- Modify: `src/draft/report/loadSleeperPointsDraft.ts`
- Modify: `src/draft/report/loadYahooPointsDraft.ts` (keepers `[]`, no-op besides the return field)

READ each loader. Currently each filters keepers OUT of grading. Now also EMIT them as `GradedDraft.keepers`.

- [ ] **Step 1: shared helper for finished tier**
Import from the grading service (already used): `import { getTierConfig, getTier } from '@/services/draftGrading'`. `getTierConfig(numTeams)` + `getTier(rank, config)` map a position rank to a tier label. You need each KEEPER's finished position rank over the FULL pool (keepers + non-keepers).

- [ ] **Step 2: ESPN** (`loadEspnPointsDraft.ts`)
- You already have `keeperCount` and season points per `playerId`. Build a FULL-pool current-position-rank map over ALL `draftPicks` (keeper + non-keeper): group all picks by position, sort by season points desc, rank index+1. (This is a SECOND rank map, separate from the keeper-excluded one used for grading — do not change the grading one.)
- For each keeper pick (`draftPicks.filter(p => p.keeper)`), build a `KeeperInfo`:
  - `teamKey: 'espn_team_' + pick.teamId`, team name/logo from the teams map, `playerName`, `position`, `round: pick.roundId`, `points: <season points for playerId, or 0>`, `finishedTier: getTier(fullRank.get(playerId) ?? 999, getTierConfig(numTeams))`, `headshot: espnHeadshotUrl(pick.playerId, sport)`, `proTeam: pick.proTeam || undefined`.
- Return `keepers` on the `GradedDraft` (`return { picks, teams, numTeams, myTeamKey, keeperCount, keepers }`).

- [ ] **Step 3: Sleeper** (`loadSleeperPointsDraft.ts`)
- Build a FULL-pool current-position-rank over ALL `draft.picks` (keeper + non-keeper) using the same `calculatePlayerSeasonStats` output already computed — rank all players by points within position (this map INCLUDES keepers; use it only for keeper tier, not for grading).
- For each keeper pick (`draft.picks.filter(isKeeper)`), build `KeeperInfo`: `teamKey: 'sleeper_' + pick.roster_id`, team name/logo from the roster/user lookup, `playerName` from metadata, `position: pick.metadata?.position`, `round: pick.round`, `points`/`finishedTier` from the full-pool stats + `getTier`, `headshot: pick.metadata?.headshot_url`.
- Return `keepers`.

- [ ] **Step 4: Yahoo** (`loadYahooPointsDraft.ts`)
- Yahoo has no keeper flag → `keepers: []`. Add `keepers: []` to the returned object.

- [ ] **Step 5: Verify** — `npm run type-check 2>&1 | grep -iE "loadEspn|loadYahoo|loadSleeper"` (none); `npm run build` (success).

- [ ] **Step 6: Commit**
```bash
git add src/draft/report/loadEspnPointsDraft.ts src/draft/report/loadSleeperPointsDraft.ts src/draft/report/loadYahooPointsDraft.ts
git commit -m "feat: draft loaders — emit kept players with finished tier (top keepers)"
```

---

## Task 3: view — apply the fixes in `HistoryView.vue`

**Files:** Modify `src/views/HistoryView.vue`. READ the current Draft Report section first.

- [ ] **Step 1: Drop the hero steal/bust cards.** Remove the `grid ... sm:grid-cols-2` block that renders the two hero cards (`Biggest steal` / `Biggest bust`). The top-3 lists (kept) already lead with the biggest. Keep the keeper note above them.

- [ ] **Step 2: Top lists show score, not the maxed-out letter.** In the top steals / top reaches rows, replace the trailing grade span (`{{ s.grade }}`) with the numeric score, signed:
```html
                  <span class="ml-2 shrink-0 font-mono font-bold" :class="...">{{ s.score > 0 ? '+' : '' }}{{ Math.round(s.score) }}</span>
```
(steals keep `text-primary`, reaches keep `text-[#e0625a]`.)

- [ ] **Step 3: Top keepers section.** After the top steals/reaches grid (and before Draft MVP), add — only when there are keepers:
```html
            <div v-if="draft.report.value.topKeepers.length" class="rounded-xl border border-dark-border bg-dark-card p-4">
              <div class="mb-2 font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">Top keepers held</div>
              <div v-for="(k, i) in draft.report.value.topKeepers" :key="'kp' + i" class="flex items-center gap-3 py-1">
                <img v-if="k.headshot" :src="k.headshot" alt="" @error="(e) => ((e.target as HTMLElement).style.display = 'none')"
                  class="h-7 w-7 shrink-0 rounded-full bg-dark-border object-cover" />
                <span class="min-w-0 flex-1 truncate text-sm text-dark-text">{{ k.playerName }}
                  <span class="text-xs text-dark-textMuted">· {{ k.teamName }} · kept Rd {{ k.round }}</span></span>
                <span class="ml-2 shrink-0 font-mono text-[11px] uppercase" :class="k.finishedTier === 'ELITE' ? 'text-primary' : 'text-dark-textMuted'">{{ k.finishedTier }}</span>
              </div>
            </div>
```

- [ ] **Step 4: Spread grade + score gap in the ladder.** In each team row, next to the letter grade, show the gap. Replace the grade span with:
```html
                <span class="ml-2 flex shrink-0 items-baseline gap-1.5">
                  <span class="font-mono text-[10px] text-dark-textMuted">{{ t.scoreGap > 0 ? '+' + t.scoreGap : t.scoreGap === 0 ? 'even' : t.scoreGap }}</span>
                  <span class="font-display text-sm font-bold">{{ t.grade }}</span>
                </span>
```

- [ ] **Step 5: Worst pick is already gated in the reducer** — the existing `v-if="draft.report.value.mySpotlight.worstPick"` will now simply not render for non-busts. No view change needed beyond confirming that guard exists (it does). Leave it.

- [ ] **Step 6: Verify** — `npm run type-check 2>&1 | grep -i HistoryView` (none); `npm run build` (success).

- [ ] **Step 7: Commit**
```bash
git add src/views/HistoryView.vue
git commit -m "feat: History draft report — drop redundant heroes, top-list scores, top keepers, grade spread + gap"
```

---

## Task 4: Full verification

- [ ] `npm test` (all pass, up by the new reducer cases).
- [ ] `npm run type-check && npm run build` (baseline 62; build clean).
- [ ] **Manual smoke (user):** on the keeper league — grades now span the range (bottom teams get C/D/F, not a floor of B−); each team shows a "+N vs field" gap; a "Top keepers held" section lists the best-held players (ELITE-tagged); the redundant hero cards are gone; top lists show scores not identical letters; your spotlight only shows a "worst pick" if it was a real bust. Category league unchanged. Check ESPN + Sleeper (keepers) + Yahoo (no keepers → no keeper section).

## Self-Review
- Spec coverage: grade spread + gap (T1 reducer + T3 view), top keepers (T1 select + T2 loaders + T3 view), redundancy (T3 drop heroes), worst-pick gate (T1), top-list letters→scores (T3). Draft-pick grading UNCHANGED (keeper display added via a separate full-pool rank).
- Type consistency: `KeeperInfo` defined in T1, produced by T2 loaders, read by T3 view. `scoreGap`/`topKeepers` produced by reducer, read by view. `spreadGrade` internal to the reducer.
