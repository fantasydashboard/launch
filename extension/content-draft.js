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
   * Per-platform parsers, keyed by what they match in the URL.
   *
   * Each returns picks from one frame, or [] when the frame is not about picks — which most
   * frames are not. Empty until fixtures exist; the recorder below is how they get written.
   */
  const adapters = [
    // { matches: (url) => /espn/.test(url), picks: (frame) => [...] },
    // { matches: (url) => /yahoo/.test(url), picks: (frame) => [...] },
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
