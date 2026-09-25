/**
 * Wrap the page's own WebSocket so the picks it is already receiving can be read.
 *
 * WHY THE MAIN WORLD. A content script runs in an isolated world with its own copy of the page's
 * globals, so replacing `window.WebSocket` there changes nothing the page will ever call. This
 * file is registered with `world: 'MAIN'` for that reason, and it is the only file that runs in
 * the page's context. It talks to the rest of the extension through window.postMessage, which is
 * the one channel the two worlds share.
 *
 * WHY THE SOCKET AND NOT THE DOM. A draft client is a React app with generated class names: a
 * redeploy on their side breaks a CSS selector silently, mid-draft, on the one night it matters.
 * The socket frames the client already receives change far less often and arrive structured
 * rather than as parsed text. A DOM watcher exists as the fallback, not the plan.
 *
 * IT READS AND NEVER WRITES. No frame is altered, dropped, delayed or injected — the page's own
 * handler is called exactly as it would have been, and this listener runs after it. Anything
 * else would make the extension a participant in the draft rather than an observer of it.
 */
(() => {
  const TAG = '__UFD_DRAFT_FRAME__'
  const Native = window.WebSocket
  if (!Native || window.__ufdSocketWrapped) return
  window.__ufdSocketWrapped = true

  /* Frames can be large and are not all interesting; the page should not pay for our reading.
     A cap per frame keeps a pathological payload from stalling the tab, and the capture side
     would not know what to do with more anyway. */
  const MAX_FRAME_CHARS = 200000

  function report(url, data) {
    try {
      if (typeof data !== 'string') return      // binary frames are not what these clients use
      if (data.length > MAX_FRAME_CHARS) return
      window.postMessage({ source: TAG, url: String(url), data, at: Date.now() }, '*')
    } catch {
      /* Reporting must never be able to break the page it is reading. */
    }
  }

  window.WebSocket = function (url, protocols) {
    const ws = protocols === undefined ? new Native(url) : new Native(url, protocols)
    ws.addEventListener('message', (ev) => report(url, ev.data))
    return ws
  }
  window.WebSocket.prototype = Native.prototype
  window.WebSocket.CONNECTING = Native.CONNECTING
  window.WebSocket.OPEN = Native.OPEN
  window.WebSocket.CLOSING = Native.CLOSING
  window.WebSocket.CLOSED = Native.CLOSED
})()
