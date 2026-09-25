/**
 * ESPN Fantasy Cookie Sync — service worker.
 *
 * WHY THIS FILE IS A REWRITE OF SOMETHING ALREADY PUBLISHED. The extension listed as
 * dbjbbkdjodblojmhljgdbdlliogkhbjc has been live for months and its source is on no machine we
 * have. This package replaces it in the same Web Store listing, so every existing user receives
 * it automatically, with no install step — which is the whole reason for updating rather than
 * publishing a second extension.
 *
 * It is also the reason to be careful. An auto-update reaches everyone whether or not they
 * wanted it, so a regression here silently breaks ESPN for every current user of BOTH products.
 * There is no undo. Hence: the message contract below is reproduced exactly from the client
 * that calls it (src/services/espnExtension.ts, identical in ultimate-fantasy-dashboard and
 * theleaguebeat), and the draft-sync work that motivated all this is deliberately absent from
 * this file until cookie sync is proven against a real ESPN login.
 *
 * THE CONTRACT, from the caller's side:
 *
 *   { action: 'ping' }            -> anything non-null. The client only checks it responded.
 *   { action: 'getEspnCookies' }  -> { espn_s2, swid } | { error }
 *   { action: 'getEspnLeagues' }  -> { leagues: [...], espn_s2, swid } | { error }
 *
 * `error: 'not_logged_in'` is handled specially by the caller and must keep that exact spelling.
 * Returning null or undefined is read as "extension not installed", so every path must answer.
 */

/* ESPN sets these on .espn.com; the fantasy API needs both together. SWID is brace-wrapped and
   is sent that way — stripping the braces produces a token ESPN rejects. */
const COOKIE_DOMAIN = 'https://fantasy.espn.com'

/** Sports ESPN exposes, and the names the client's EspnLeague.sport union expects. */
const SPORTS = [
  { slug: 'ffl', sport: 'football' },
  { slug: 'flb', sport: 'baseball' },
  { slug: 'fba', sport: 'basketball' },
  { slug: 'fhl', sport: 'hockey' },
]

async function readCookies() {
  const [s2, swid] = await Promise.all([
    chrome.cookies.get({ url: COOKIE_DOMAIN, name: 'espn_s2' }),
    chrome.cookies.get({ url: COOKIE_DOMAIN, name: 'SWID' }),
  ])
  return { espn_s2: s2?.value || null, swid: swid?.value || null }
}

/**
 * The season ESPN is currently serving.
 *
 * Every fantasy sport names its season for the year it ENDS except football, which names it for
 * the year it starts. Asking for the wrong one returns an empty league list rather than an
 * error, which would read to the user as "you have no leagues" — the most confusing possible
 * failure. Both are tried and whatever answers wins.
 */
function seasonsFor(slug) {
  const now = new Date()
  const y = now.getFullYear()
  if (slug === 'ffl') return [now.getMonth() >= 2 ? y : y - 1]
  return [now.getMonth() >= 6 ? y + 1 : y, y]
}

/**
 * Every league this ESPN account can see, across all four sports.
 *
 * fantasy.espn.com/apis/v3 answers with the user's own leagues when the cookies are sent, which
 * is the entire point: the app cannot make this call itself, because the browser will not attach
 * a third party's cookies to it. The extension can, because it is the user's own browser.
 */
async function readLeagues(cookies) {
  const header = `espn_s2=${cookies.espn_s2}; SWID=${cookies.swid}`
  const out = []

  for (const { slug, sport } of SPORTS) {
    for (const season of seasonsFor(slug)) {
      try {
        const res = await fetch(
          `https://fantasy.espn.com/apis/v3/games/${slug}/seasons/${season}?view=chui_default`,
          { headers: { Cookie: header }, credentials: 'omit' },
        )
        if (!res.ok) continue
        const body = await res.json()
        /* ESPN nests the account's own leagues under a different key per view; both shapes have
           been seen in the wild, so accept either rather than guessing which is current. */
        const raw = body?.leagues ?? body?.teams ?? []
        for (const l of Array.isArray(raw) ? raw : []) {
          const id = String(l?.id ?? l?.leagueId ?? '')
          if (!id) continue
          out.push({
            id,
            name: String(l?.name ?? l?.settings?.name ?? `League ${id}`),
            size: Number(l?.size ?? l?.settings?.size ?? 0),
            sport,
            season,
          })
        }
        if (out.length) break        // this season answered; do not also ask the other
      } catch {
        /* One sport failing is not the request failing. A user with three football leagues and
           no hockey should get three leagues, not an error about hockey. */
      }
    }
  }
  /* ESPN can list the same league under two seasons. Keyed by sport+id so a football league and
     a hockey league that share an id are not collapsed into one. */
  const seen = new Set()
  return out.filter((l) => {
    const k = `${l.sport}:${l.id}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

/*
 * Every path answers. The client reads null/undefined as "not installed" and shows an install
 * prompt to somebody who already has it — so an internal failure must come back as an error
 * STRING, never as silence.
 */
chrome.runtime.onMessageExternal.addListener((msg, _sender, sendResponse) => {
  const action = msg?.action

  if (action === 'ping') {
    sendResponse({ ok: true, version: chrome.runtime.getManifest().version })
    return false
  }

  if (action === 'getEspnCookies') {
    readCookies()
      .then((c) => sendResponse(
        c.espn_s2 && c.swid ? c : { error: 'not_logged_in' },
      ))
      .catch((e) => sendResponse({ error: String(e?.message || e) }))
    return true                      // keeps the channel open for the async reply
  }

  if (action === 'getEspnLeagues') {
    readCookies()
      .then(async (c) => {
        if (!c.espn_s2 || !c.swid) return sendResponse({ error: 'not_logged_in' })
        const leagues = await readLeagues(c)
        sendResponse({ leagues, espn_s2: c.espn_s2, swid: c.swid })
      })
      .catch((e) => sendResponse({ error: String(e?.message || e) }))
    return true
  }

  sendResponse({ error: 'unknown_action' })
  return false
})
