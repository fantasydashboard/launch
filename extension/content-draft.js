/**
 * The draft-room side: collect what the page is told, hand it to the service worker.
 *
 * WHAT THIS IS TODAY. A recorder, not yet an adapter. The spec's plan is to capture real socket
 * frames from mock drafts on both platforms, commit them as fixtures, and write the per-platform
 * parsers against those. Writing parsers first would mean guessing at message shapes nobody here
 * has seen, and a guessed parser that half-works is worse than none — it would sync fourteen
 * picks, stop, and leave the board confidently wrong for three rounds.
 *
 * So the first version records and says so. Once there are fixtures, the parsers land in
 * `adapters` below and this file stops being a recorder.
 *
 * ONE DELIBERATE OMISSION: it does not match names to players. The extension has no projections
 * and no idea which of two men called Elias Pettersson is on the board. It reports what the room
 * said — name, position, team — and the app matches, where the players are and where there is a
 * test runner. See src/draft/extensionPicks.ts.
 */
(() => {
  const TAG = '__UFD_DRAFT_FRAME__'

  /** Everything seen this session, capped so a long draft cannot grow without bound. */
  const MAX_FRAMES = 4000
  const frames = []

  /**
   * Per-platform parsers, keyed by what they match in the socket URL.
   *
   * ESPN, captured from a live mock on 2026-09-25. Its draft socket is not JSON — it is a
   * newline-terminated line protocol on fantasydraft.espn.com, quite separate from the
   * bamgrid edge socket the page also opens (that one carries only transport acknowledgements
   * and was the first thing a capture found, which is why guessing would have cost an evening):
   *
   *   SELECTED 5 4233875 1      team 5 drafted player 4233875
   *   SELECTING 5 30000         team 5 on the clock, 30s
   *   CLOCK 6 29749 6
   *   AUTOSUGGEST 3041969       what the client would pick for you
   *   AUTODRAFT 2 false
   *   PONG PING%1790386431623
   *   INIT <base64>
   *
   * THE NUMBER IS AN ESPN PLAYER ID, and that is the whole prize: 4233875 is Jason Robertson
   * and 3041969 is Nathan MacKinnon in our own projection feed. The board is keyed by the same
   * ids, so an ESPN pick needs no name matching at all — no abbreviations, no accents, no two
   * men called Elias Pettersson. The name matcher stays for Yahoo and for the DOM fallback.
   *
   * ONLY `SELECTED` COUNTS. AUTOSUGGEST is a suggestion the user may never take, and treating
   * it as a pick would cross off a player who is still available — the exact error that makes
   * a board worse than no board.
   */
  const adapters = [
    {
      matches: (url) => /fantasydraft\.espn\.com/i.test(url),
      picks: (data) => String(data).split('\n').flatMap((line) => {
        const m = /^SELECTED\s+(\d+)\s+(\d+)(?:\s+(\d+))?/.exec(line.trim())
        if (!m) return []
        return [{
          /* The id IS the board's key for ESPN. Carried as playerKey so the app can cross the
             player off directly and never has to guess from a name. */
          playerKey: m[2],
          playerName: '',
          byTeam: m[1],
          pickNumber: m[3] ? Number(m[3]) : undefined,
        }]
      }),
    },
    // Yahoo: not yet captured. Its adapter lands the same way this one did — from a mock draft.
  ]

  function parse(url, data) {
    for (const a of adapters) {
      if (!a.matches(url)) continue
      try {
        const picks = a.picks(data)
        if (Array.isArray(picks) && picks.length) return picks
      } catch {
        /* An adapter that throws is a broken adapter, not a broken draft. The frame is still
           recorded, so the failure is diagnosable afterwards from the capture. */
      }
    }
    return []
  }

  window.addEventListener('message', (ev) => {
    if (ev.source !== window) return
    const m = ev.data
    if (!m || m.source !== TAG) return

    if (frames.length < MAX_FRAMES) {
      frames.push({ url: m.url, data: m.data, at: m.at })
    }

    const picks = parse(m.url, m.data)
    if (picks.length) {
      chrome.runtime.sendMessage({ action: 'draftPicks', picks, href: location.href })
    }
  })

  /*
   * The capture, which is the point of this version.
   *
   * Asked for by the service worker rather than sent unprompted: frames are a draft room's
   * traffic and there is no reason for them to leave this tab unless somebody is building an
   * adapter from them.
   */
  chrome.runtime.onMessage.addListener((msg, _sender, respond) => {
    if (msg?.action === 'draftCapture') {
      respond({
        href: location.href,
        frameCount: frames.length,
        /* Distinct socket URLs first: which endpoint carries the picks is the first thing
           anybody writing an adapter needs to know. */
        sockets: [...new Set(frames.map((f) => f.url))],
        frames: frames.slice(0, msg.limit ?? 400),
        adapters: adapters.length,
      })
      return true
    }
    if (msg?.action === 'draftStatus') {
      respond({ href: location.href, frameCount: frames.length, adapters: adapters.length })
      return true
    }
    return false
  })
})()
