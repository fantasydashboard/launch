# Draft Room hazards — carried out of the local-draft-mode branch

Written 2026-08-27, after shipping local draft mode. These are not bugs today.
They are the traps that produced this branch's two Criticals, recorded so the
next person does not rediscover them the same way — by shipping.

## 1. TDZ in `useDraftRoom.ts`: a `const` read by a watcher's registration pass

`teamNameForSlot` was a `const` arrow declared *after* `recap` (which calls it)
and after the History watcher at `:1549`, whose source getter reads `recap.value`
once at registration to collect dependencies. When `recap` was non-null at that
moment, `useDraftRoom()` threw from inside setup and **the entire Draft Room
rendered nothing**.

Only local mode reached it, because only local mode has a `draftMeta` with
status `complete` *synchronously* at setup — it comes straight out of
localStorage, whereas the Sleeper path awaits a network round trip and is
therefore always null at registration. So: finish a local draft, reopen the page,
white screen, with the rehearsal still in storage and no way to reach the Undo or
Discard that would clear it.

Fixed by making it a hoisted `function` declaration. **Two forward references
survive and are safe only by accident of ordering:**

- `opponentIdentity` (`:458`) reads `practiceEngaged` (`:769`)
- `teamAvatarForSlot` (`:573`) reads `teamKeyForSlot` (`:834`)

Both are lazy, and both targets initialise before the earliest eager getter that
can reach them. **Adding any `watch`/`watchEffect` above line 769 whose source
touches `opponentIdentity`, `opponentModel`, `historicalPicks` or
`teamNameForSlot` resurrects the identical white screen.** Prefer `function`
declarations for anything a watcher source can transitively reach.

## 2. Pinia setup stores unwrap computeds on property access

`leagueSeason: leagueStore.currentSeason` exported a **plain string**, not a ref,
because `currentSeason` is a `computed` inside a *setup* store and the store proxy
unwraps it. `leagueSeason.value` was therefore `undefined`, and every local draft
ran on an empty ADP map: survival returned 1.0 for every player (the "lasts"
column read 99% across the whole board), the edge column read "—" on nearly every
row, and the board silently reordered to raw projected points.

`App.vue:368` renders `{{ leagueStore.currentSeason }}` with no `.value` — that is
the tell. Every other consumer in the tree declares its own local `computed(...)`
rather than reading the store's. **When exporting a store value from a composable,
wrap it: `computed(() => leagueStore.x)`.** Values sourced from composables
(`src.teamNames`, `src.myTeamKey`) are already refs and are fine.

Note the second half of that fix, which is the part that mattered for live users:
`loadDraft` also falls back to the store when a stored draft has no `season` key,
because drafts written by the broken build are still in people's localStorage and
the export fix alone would not repair a rehearsal already in progress.

## 3. `sleeperService.getDraftPicks` returns `[]` on failure and never throws

`src/services/sleeper.ts:559,564`. `loadDraft` does not distinguish "no picks yet"
from "the request failed", so a transient 429 looks exactly like an empty draft.
This is what made the History-cleanup branch able to delete a completed *real*
draft's record: `recap` went null on a real draft id, and the cleanup fired.

Anything that treats an empty pick list as meaningful state needs to consider
this. The cleanup is now gated on `localMode`.

## 4. The suite does not drive the Sleeper feed

`src/composables/__tests__/useDraftRoom.test.ts` exists now and is the first test
to mount the composable at all, but it covers local mode. **No test drives a live
Sleeper draft.** A regression on that path stays green. Both Criticals on this
branch lived in the wiring between units whose own tests all passed.

## 5. Deploys need an explicit scope

Bare `npx vercel --prod` fails with "Not authorized" from a fresh shell. Use:

    npx vercel --prod --scope team_tsWKoELRx3Jl5T599TGsup69

(from this repo's `.vercel/project.json`). Ships from `redesign/my-team-first`,
not `main`. Verify by comparing the `index-*.js` hash in `dist/index.html` to the
one the live domain serves — Vercel's GitHub auto-deploy is unreliable here.
