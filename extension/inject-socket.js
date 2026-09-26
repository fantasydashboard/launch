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

  /*
   * HTTP TOO, because the socket may not be where the picks are.
   *
   * The first capture from an ESPN draft room returned eight frames and every one was transport
   * plumbing — authenticated, received, delivered.async — from the edge connection service.
   * Acknowledgements, not picks. Either picks ride that socket in a type nobody has seen yet, or
   * the client polls for them over HTTP, and guessing between those is how a whole evening gets
   * spent on the wrong one.
   *
   * So both are watched. Whichever carries the picks shows up in one draft instead of two.
   * Only responses from the platform's own API are reported, and only JSON: this is looking for
   * a pick, not reading the user's traffic.
   */
  const INTERESTING = /espn\.com|bamgrid|yahoo\.com/i
  const nativeFetch = window.fetch
  if (nativeFetch && !window.__ufdFetchWrapped) {
    window.__ufdFetchWrapped = true
    window.fetch = function (...args) {
      const req = args[0]
      const url = typeof req === 'string' ? req : (req && req.url) || ''
      const p = nativeFetch.apply(this, args)
      if (INTERESTING.test(String(url))) {
        p.then((res) => {
          const ct = res.headers?.get?.('content-type') || ''
          if (!/json/i.test(ct)) return
          res.clone().text().then((body) => report('http:' + url, body)).catch(() => {})
        }).catch(() => {})
      }
      return p
    }
  }

  const NativeXHR = window.XMLHttpRequest
  if (NativeXHR && !window.__ufdXhrWrapped) {
    window.__ufdXhrWrapped = true
    const open = NativeXHR.prototype.open
    NativeXHR.prototype.open = function (method, url, ...rest) {
      this.__ufdUrl = url
      return open.call(this, method, url, ...rest)
    }
    const send = NativeXHR.prototype.send
    NativeXHR.prototype.send = function (...a) {
      this.addEventListener('load', () => {
        try {
          const u = String(this.__ufdUrl || '')
          if (!INTERESTING.test(u)) return
          if (typeof this.responseText !== 'string') return
          report('xhr:' + u, this.responseText)
        } catch {}
      })
      return send.apply(this, a)
    }
  }
})()
