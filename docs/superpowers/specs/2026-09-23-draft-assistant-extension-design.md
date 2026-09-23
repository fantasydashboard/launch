# UFD Draft Assistant — a browser extension

Design, 2026-09-23. Target: basketball drafts, mid-to-late October (games begin Oct 26).

## The problem

The draft board makes you type every pick by hand, on every platform. That is not an oversight
and it is not a Yahoo problem:

- **ESPN's API reports nothing while a draft is running.** It calls a draft not-started until it
  is over. The "follow ESPN" button polls and gets nothing useful until the room has emptied.
  The commit that admitted this is titled *"stop promising a sync ESPN does not do."*
- **Yahoo refuses to be read at all.** 401 on every unauthenticated endpoint, no public-league
  exception, and our authenticated calls have been 403 since July pending an entitlement that
  has still not arrived.

So no server-side integration can watch a live draft on either platform. That is the whole
reason this document exists.

**A browser extension can**, because the picks are already being delivered to the user's own
browser. This is how FantasyPros' Draft Assistant works, and it is why theirs syncs where our
API never could.

## Scope

**In:**

1. **Live pick sync** — ESPN and Yahoo draft rooms, all four sports.
2. **ESPN cookie sync** — ported from the existing published extension, so users install one
   thing rather than two.
3. **ESPN league discovery** — see the bug below.
4. **Yahoo league-settings import** — one bounded read that removes the hand-entered rules form.

**Out:**

- **A general Yahoo API replacement.** The product reads rosters, matchups, scoring,
  transactions, standings and history every week for every connected league. Scraping all of
  that means a parser per surface, each breaking on any redesign, data arriving only while the
  user has a tab open, and no background refresh at all. The extension unblocks *bounded, one-off
  reads*. It does not become the Yahoo strategy unless the entitlement is abandoned, which is a
  separate decision with a two-week clock on it.
- **An injected sidebar.** Rendering our board inside the draft page is the better experience and
  considerably more work — the board has to become an embeddable widget. Phase two at the
  earliest, and not before basketball.

## A bug found while scoping this

`AddLeagueModal.loadEspnLeaguesFromExtension()` is named for fetching the user's leagues and
never calls `getEspnLeaguesFromExtension()`. It fetches cookies and then sets
`espnLeaguesError.value = 'enter_league_id'` — the "type the league ID" state — as its SUCCESS
path. The discovery function is imported at line 1057 and called nowhere in the codebase;
`selectEspnLeagueFromExtension()` exists to handle picking from a list that nothing populates.

This is why the owner types a league id every single time. It is not a cache miss or a service
worker timeout, it is the designed path.

**Unresolved:** whether the published extension answers a `GET_LEAGUES` message at all. Probing
it from a Claude-controlled Chrome profile timed out, which proves nothing — that profile may
not have the extension. Someone should check from the browser that has it. If the extension does
answer, this is a small app-side fix that need not wait for any of the work below.

## Architecture

```
  draft room tab                         board tab
  ┌───────────────────────┐              ┌──────────────────────────┐
  │ content script        │              │ ultimatefantasydashboard │
  │  · platform adapter   │              │  · useHockeyBoard etc.   │
  │  · emits Pick events  │              │  · take(player)          │
  └──────────┬────────────┘              └───────────▲──────────────┘
             │ chrome.runtime                        │ externally_connectable
             ▼                                       │
        ┌─────────────────────────────────────────────┐
        │ service worker: session state, fan-out      │
        │  · current draft id, picks so far           │
        │  · cookie sync (ported)                     │
        └─────────────────────────────────────────────┘
```

The board already exposes `take(player)`; it gets called by a message instead of a keystroke.
The page↔extension channel is the one `espnExtension.ts` already uses, so the transport is
proven — only the messages are new.

## Reading picks: the part that carries the risk

Three options, and the choice matters more than anything else here.

**A. CSS selectors on the picks list.** Simplest and worst. Yahoo's draft client is a React app
with generated class names; a redeploy on their side breaks us silently, mid-draft, on the one
night it matters.

**B. Hook the WebSocket.** The draft client receives picks over a socket. A content script can
wrap `window.WebSocket` and read the messages already being delivered to the user's browser.
Message shapes change far less often than class names, and it yields structured data instead of
parsed text.

**C. Fuzzy DOM watching.** A `MutationObserver` over the picks region, matching anything that
looks like a player name rather than a fixed selector.

**Decision: B primary, C fallback.** Read the socket; if the shape is unrecognised, fall back to
watching the DOM so a failure degrades rather than stops. A is not used at all.

Each platform gets an adapter behind one interface:

```ts
interface DraftAdapter {
  matches(url: string): boolean
  start(onPick: (p: RawPick) => void): () => void   // returns a teardown
}
```

`RawPick` is `{ playerName, team?, position?, pickNumber?, byTeam? }` — deliberately loose,
because what each platform volunteers differs.

## Matching names

The draft room says "C. McDavid" or "Connor McDavid"; our projections have their own keys.
`normalizeNflName` already exists for football and the same shape of problem is solved in
`buildFootballProjectionsByKey`. This needs a sport-agnostic sibling: normalize, match on
name+position, and **when a match is ambiguous or absent, say so rather than guess.** A pick
credited to the wrong player is worse than an unmarked one, because the board keeps ranking a
man who is gone.

## Failure behaviour, which is the whole product

**It must fail loudly.** A sync that silently stops on pick 40 is worse than no sync at all —
the user trusts a stale board for three rounds and drafts against a pool that has moved.

- A persistent status line: `synced 14 picks · 3s ago`.
- It turns red the moment it goes stale (no pick seen in ~90s while a draft is known live).
- Manual marking stays available underneath, always, with no mode switch.
- On adapter failure the banner says which platform broke and offers manual, rather than
  disappearing.

This is the same principle the hockey board already holds: absence of data is reported, never
substituted.

## Testing

A DOM/socket scraper cannot be unit-tested against a live site, so:

- **Recorded fixtures.** Capture real socket frames and DOM snapshots from mock drafts on both
  platforms, commit them, and run adapters against them. Mock drafts are free and unlimited,
  which makes this cheap.
- **Adapter contract tests** — every adapter, same suite: N frames in, N picks out, in order,
  no duplicates, no invented players.
- **The matcher gets ordinary unit tests**, including the ambiguous cases it must refuse.
- **One live rehearsal per platform per sport** before basketball drafts. Non-negotiable; this
  is the only test that exercises the real thing.

## Phases

**Phase 1 — before basketball drafts (mid-October).** Pick sync for ESPN and Yahoo, two-tab
flow, loud status, recorded fixtures, cookie sync ported. This is the whole deliverable.

**Phase 2 — after.** League discovery, Yahoo settings import, and retiring the old cookie-sync
listing once this one is proven.

**Phase 3 — speculative.** Injected sidebar.

## Risks

- **Platform DOM/socket churn.** Mitigated by fixtures and the B→C fallback, not eliminated.
  Assume one breakage per season and budget for a fast fix.
- **Store review.** A new extension needs review, and review takes days. This is precisely why
  it is a new extension rather than a change to the working one: a rejection here cannot take
  ESPN cookie sync down with it. **Submit by early October**, not mid.
- **Terms of service.** Reading data already delivered to the user's own browser, for their own
  draft, is what every draft assistant does. It should still be looked at before launch rather
  than after.
- **Chromium only.** Same constraint the existing extension has.

## Open questions

1. Does the published extension answer `GET_LEAGUES`? Decides whether the league-id annoyance is
   fixable this week.
2. Where is the old extension's source? Not on this machine. Phase 1 does not need it, but
   phase 2's retirement plan does.
3. Are Yahoo mock drafts served by the same client as real ones? If so, fixtures are free. If
   not, phase 1 rehearsals need a real draft.
