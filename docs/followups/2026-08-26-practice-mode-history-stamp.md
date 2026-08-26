# Follow-up: stamp `historicalDrafts` with its league

**Filed:** 2026-08-26, from the practice-mode final review.
**Severity:** narrow. Never attaches a wrong name or avatar to a seat — stale
tendency NUMBERS only, for the duration of one fetch, self-healing.

## The window

`loadFreshLeagueData` (`src/stores/league.ts`) assigns `currentLeague`,
`rosters` and `users` for the new league, then awaits `fetchHistoricalData`,
which does not clear `historicalDrafts` first. Practice mode's seat guard checks
`currentLeague.league_id === activeLeagueId`, which has already flipped — so the
guard passes while `tendencies` are still the previous league's. Seats show the
right people with the wrong people's draft history until the fetch resolves.

## Reachability — wider than "cold load"

The localStorage-cache branch is gated on `if (localCache && !memCache)`, and the
memory cache is seeded with the localStorage payload's own `loadedAt`. Five
minutes later that entry is stale but truthy, so BOTH cache branches are skipped
and the fresh path runs. Switching back to a league visited earlier in the same
session hits this — ordinary behaviour for a multi-league user.

## The fix

Add a `historicalDraftsLeagueId` ref set alongside every `historicalDrafts.value =`
assignment (four sites: the two cache paths, `fetchHistoricalData`, and the
logout/demo reset), then add one clause to the `seatMap` guard in
`useDraftRoom.ts` requiring it to equal `activeLeagueId`. Roughly six lines, no
behaviour change for any other consumer of the store.

## Do NOT use `leagueStore.isLoading`

It was considered and rejected:

1. `practiceEngaged` flipping false is not a cosmetic blink — it flips
   `opponentIdentity` to `anonymous` and `opponentModel` to `market`, re-labelling
   every seat, dropping every avatar and recomputing the board off market priors.
   The whole room resets mid-session in healthy cases.
2. The banner it produces would often print a fabricated cause, because
   `practiceUnavailableReason` resolves off stale counts — e.g. "This mock has 12
   teams and your league has 10" when neither number is current. Declining is
   safe; declining with an invented explanation is not.
3. It is a global flag set by `fetchLeagues` too, and cleared early on the
   localStorage path — it over-fires on unrelated loads and under-fires on the one
   path it was meant to cover.

Also rejected: clearing `historicalDrafts` at the top of `fetchHistoricalData`
(flickers the History and records pages empty on every load), and reordering
`loadFreshLeagueData` (delays the visible league switch across the whole app to
close a draft-room-only issue).
