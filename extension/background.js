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
 *   { action: 'ping' }            -> { status: 'ok' }. The EXACT string matters: isExtensionInstalled
 *                                   tests `response?.status === 'ok'` and treats anything else as
 *                                   not installed. An earlier draft of this file replied
 *                                   { ok: true } on the strength of a comment saying the client
 *                                   "only checks it responded" — it does not. Cookies kept
 *                                   working, so the failure would have surfaced as every existing
 *                                   user being told to install the extension they already have.
 *   { action: 'getEspnCookies' }  -> { espn_s2, swid } | { error }
 *   { action: 'getEspnLeagues' }  -> { leagues: [...], espn_s2, swid } | { error }
 *
 * `error: 'not_logged_in'` is handled specially by the caller and must keep that exact spelling.
 * Returning null or undefined is read as "extension not installed", so every path must answer.
 */

/* ESPN sets these on .espn.com; the fantasy API needs both together. SWID is brace-wrapped and
   is sent that way — stripping the braces produces a token ESPN rejects. */
const COOKIE_DOMAIN = 'https://fantasy.espn.com'

/** ESPN's game abbreviations, and the names the client's EspnLeague.sport union expects. */
const SPORT_BY_ABBREV = { FFL: 'football', FLB: 'baseball', FBA: 'basketball', FHL: 'hockey' }

async function readCookies() {
  const [s2, swid] = await Promise.all([
    chrome.cookies.get({ url: COOKIE_DOMAIN, name: 'espn_s2' }),
    chrome.cookies.get({ url: COOKIE_DOMAIN, name: 'SWID' }),
  ])
  return { espn_s2: s2?.value || null, swid: swid?.value || null }
}

/**
 * Every league this ESPN account can see, across all four sports, in one request.
 *
 * WHY THE FAN API AND NOT THE FANTASY ONE. The obvious endpoint —
 * `apis/v3/games/{ffl|flb|fba|fhl}/seasons/{year}` — answers 200 and returns the SEASON, not
 * your leagues: abbrev, scoringPeriods, segments. Probed live, it never contained a league at
 * all, so the first version of this function asked it eight times (four sports, two candidate
 * seasons each) and correctly reported nothing every time.
 *
 * fan.api.espn.com knows what a person is subscribed to. One call returns every fantasy league
 * across every sport, with the season attached, so there is no season to guess — which was the
 * other half of the first version's problem.
 *
 * CREDENTIALS, WHICH IS THE BUG WORTH REMEMBERING. The first version set a `Cookie` header by
 * hand and passed `credentials: 'omit'`. `Cookie` is a forbidden header name: the browser
 * strips it silently, so the request went out unauthenticated and ESPN answered for a logged-out
 * stranger — 200, well-formed, and empty. Nothing errored. The fix is to let Chrome attach the
 * cookies it already holds, which it will because this extension has host permission for
 * espn.com.
 */
async function readLeagues(cookies) {
  /* chrome.cookies hands back the raw brace-wrapped value; the path segment needs it encoded. */
  const swid = encodeURIComponent(cookies.swid)
  const res = await fetch(
    `https://fan.api.espn.com/apis/v2/fans/${swid}`
      + '?displayEvents=true&displayNow=true&displayRecs=false&platform=web&lang=en',
    { credentials: 'include' },
  )
  if (!res.ok) throw new Error(`fan api ${res.status}`)
  const body = await res.json()

  const out = []
  for (const pref of body?.preferences ?? []) {
    if ((pref?.type?.code ?? '') !== 'fantasy') continue
    const entry = pref?.metaData?.entry
    const group = entry?.groups?.[0]
    if (!group?.groupId) continue
    const sport = SPORT_BY_ABBREV[String(entry?.abbrev ?? '').toUpperCase()]
    if (!sport) continue          // a game we do not support is not an error, it is not ours
    out.push({
      id: String(group.groupId),
      name: String(group.groupName ?? `League ${group.groupId}`),
      size: Number(group.groupSize ?? 0),
      sport,
      season: Number(entry?.seasonId ?? 0),
    })
  }

  /* One league can appear under two seasons. Keyed by sport+id so a football league and a
     hockey league that happen to share an id are not collapsed into one. */
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
    /* `status: 'ok'` is the contract; the rest is diagnostics. */
    sendResponse({ status: 'ok', ok: true, version: chrome.runtime.getManifest().version })
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
