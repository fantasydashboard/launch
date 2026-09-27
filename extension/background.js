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

/* ── draft sync ──────────────────────────────────────────────────────────────────────────
 *
 * The draft-room hosts are OPTIONAL and the content scripts are registered at RUNTIME, never
 * declared in the manifest. That is not tidiness: a statically declared content script counts
 * as a host permission at install time, so adding one to a published extension disables it for
 * every existing user until they re-accept. Cookie sync would stop working for everybody on
 * update day, to enable a feature most of them are not drafting today.
 *
 * So nothing changes for anyone until they ask for draft sync, and asking is what grants the
 * permission.
 */
/* `*.fantasy.espn.com` requires a subdomain BEFORE "fantasy" and so never matches
   fantasy.espn.com itself, which is where the draft room lives. The same mistake in the Yahoo
   patterns would have matched nothing either. Caught only by looking at a real draft URL. */
const DRAFT_HOSTS = [
  'https://fantasy.espn.com/*',
  'https://*.fantasysports.yahoo.com/*',
]
const DRAFT_SCRIPT_ID = 'ufd-draft'

async function draftEnabled() {
  return chrome.permissions.contains({ origins: DRAFT_HOSTS })
}

/**
 * Put the readers in place. Safe to call from anywhere, any number of times, concurrently.
 *
 * It is called from four places — worker start, onStartup, onInstalled and the moment
 * permission is granted — because any of them can be the first to happen and none of them is
 * guaranteed. That made it race: two callers both saw nothing registered, both registered, and
 * the second threw "Duplicate script ID 'ufd-draft-main'". Registration still succeeded, so the
 * symptom was an error in the extensions page rather than a broken reader, which is the kind of
 * thing that gets cleared and forgotten until the ordering changes and it does not succeed.
 *
 * Single-flight: concurrent callers share one attempt. A duplicate-id rejection is then treated
 * as success, because it can only mean somebody else registered the same scripts.
 */
let registering = null
function registerDraftScripts() {
  if (registering) return registering
  registering = (async () => {
    const want = [
      {
        id: DRAFT_SCRIPT_ID + '-main',
        matches: DRAFT_HOSTS,
        js: ['inject-socket.js'],
        world: 'MAIN',
        runAt: 'document_start',
      },
      {
        id: DRAFT_SCRIPT_ID,
        matches: DRAFT_HOSTS,
        js: ['content-draft.js'],
        runAt: 'document_start',
      },
    ]
    const ids = want.map((w) => w.id)
    const existing = await chrome.scripting.getRegisteredContentScripts({ ids }).catch(() => [])
    if (existing.length === want.length) return
    if (existing.length) {
      await chrome.scripting.unregisterContentScripts({ ids: existing.map((e) => e.id) }).catch(() => {})
    }
    try {
      await chrome.scripting.registerContentScripts(want)
    } catch (e) {
      /* Another caller won the race. That is the outcome we wanted, not a failure. */
      if (!/duplicate script id/i.test(String(e?.message || e))) throw e
    }
  })().finally(() => { registering = null })
  return registering
}

/* Survive the worker being shut down and restarted mid-draft, which Chrome does freely.
   Registration is per-profile and persists, but the worker cannot assume it: checking on every
   start is cheap and getting it wrong means a draft silently records nothing. */
draftEnabled().then((ok) => ok && registerDraftScripts()).catch(() => {})
chrome.runtime.onStartup?.addListener(() => { draftEnabled().then((ok) => ok && registerDraftScripts()) })
chrome.runtime.onInstalled?.addListener(() => { draftEnabled().then((ok) => ok && registerDraftScripts()) })
chrome.permissions.onAdded?.addListener(() => { draftEnabled().then((ok) => ok && registerDraftScripts()) })

/**
 * Picks seen this session, per tab.
 *
 * Kept here rather than in the draft tab because the board is in a DIFFERENT tab, and a page
 * cannot read another page's memory. The worker is the only thing both tabs can reach.
 */
const session = { picks: [], lastPickAt: 0, href: '' }
const SESSION_KEY = 'ufd:draftSession'

/*
 * WHY THIS IS WRITTEN TO STORAGE AND NOT JUST HELD HERE.
 *
 * A manifest-v3 service worker is terminated after roughly thirty seconds of inactivity, and
 * a draft pick clock is thirty seconds. Held only in memory, `session` is therefore a coin
 * flip: the worker naps between picks and every pick so far is gone.
 *
 * Polling from the board masks it — a request every two seconds keeps the worker alive — but
 * that is exactly the case that does not hold during a real draft. The user is looking at the
 * ESPN tab, not at us, and Chrome throttles a background tab's timers to about once a minute.
 * So the one configuration where the board is unattended is the one where the worker dies,
 * and the picks it loses are the picks nobody is watching it lose.
 *
 * chrome.storage.session is the right store: it survives a worker restart and is cleared when
 * the browser closes, which is the exact lifetime of a draft.
 */
const ready = (async () => {
  try {
    const got = await chrome.storage.session.get(SESSION_KEY)
    const saved = got?.[SESSION_KEY]
    if (saved && Array.isArray(saved.picks)) {
      session.picks = saved.picks
      session.lastPickAt = saved.lastPickAt || 0
      session.href = saved.href || ''
    }
  } catch {
    /* No store is survivable — it degrades to the old in-memory behaviour. A throw here would
       take the whole worker down and lose the sync outright, which is far worse. */
  }
})()

/* Written on every pick rather than debounced: a pick is at most one small object every thirty
   seconds, and a debounce is a window in which the worker can die holding the only copy. */
function persist() {
  chrome.storage.session.set({ [SESSION_KEY]: session }).catch(() => {})
}

/** Forget the draft. Used when a new draft room is opened, so two drafts cannot merge. */
async function resetSession(href) {
  await ready
  session.picks = []
  session.lastPickAt = 0
  session.href = href || ''
  persist()
}

chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  if (msg?.action === 'draftPicks') {
    ready.then(() => {
      const href = msg.href || sender?.tab?.url || ''
      /* A different draft room means a different draft. Without this, leaving one mock and
         starting another shows the board a pool with both drafts' picks missing from it. */
      if (session.href && href && href !== session.href) {
        session.picks = []
        session.lastPickAt = 0
      }
      session.href = href
      for (const p of msg.picks || []) session.picks.push(p)
      session.lastPickAt = Date.now()
      persist()
      respond({ ok: true, total: session.picks.length })
    })
    return true
  }
  return false
})

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

  /* ── draft sync, from the board tab ─────────────────────────────────────────────────── */

  if (action === 'draftStatus') {
    Promise.all([
      draftEnabled(),
      /* Whether the readers are actually in place, which is not the same question as whether
         permission was granted — registration can be granted and still not have run, and a
         dynamically registered script only reaches pages loaded AFTER it is registered. */
      chrome.scripting.getRegisteredContentScripts().catch(() => []),
      /* Hydration, for the same reason getDraftPicks waits on it: this request can be what
         wakes a cold worker, and an unhydrated count reads as "the draft has not started". */
      ready,
    ]).then(([enabled, scripts]) => sendResponse({
      enabled,
      registered: (scripts || []).map((x) => x.id),
      picks: session.picks.length,
      /* The age of the newest pick, so the board can go red rather than quietly showing a
         stale list. A sync that stops at pick 40 and says nothing is worse than no sync. */
      lastPickAgoMs: session.lastPickAt ? Date.now() - session.lastPickAt : null,
      href: session.href,
    }))
    return true
  }

  /*
   * Reach into the draft tab and ask what it has seen.
   *
   * The board is in a different tab and pages cannot talk to each other, so every question
   * about the draft room is relayed through here. Also the only way to get the recorded frames
   * off the machine while the adapters are still being written.
   */
  if (action === 'getDraftCapture') {
    chrome.tabs.query({}, (tabs) => {
      /* A draft ROOM, not the lobby that led to it. Both live on the same host and a user who
         entered a mock from the lobby has both tabs open — picking the first match found the
         lobby, which has no socket and no picks, and reported the reader missing. */
      const candidates = (tabs || []).filter((x) => {
        const u = x.url || ''
        if (!/fantasy\.espn\.com|fantasysports\.yahoo\.com/.test(u)) return false
        if (/lobby/i.test(u)) return false
        return /\/draft/i.test(u)
      })
      const t = candidates[0]
      if (!t) {
        return sendResponse({
          error: 'no_draft_tab',
          /* Say what WAS open, so "no draft tab" is diagnosable rather than just a refusal. */
          sawTabs: (tabs || []).map((x) => x.url).filter((u) => /espn|yahoo/i.test(u || '')).slice(0, 6),
        })
      }
      chrome.tabs.sendMessage(t.id, { action: 'draftCapture', limit: msg?.limit ?? 300 }, (r) => {
        sendResponse(chrome.runtime.lastError
          ? { error: chrome.runtime.lastError.message, tabUrl: t.url }
          : { ...r, tabUrl: t.url })
      })
    })
    return true
  }

  /*
   * Forget the draft, on demand.
   *
   * The board calls this when the user points it at a different league. Picks survive a
   * service-worker restart by design, which is what a draft needs — and is exactly what makes
   * a LEFTOVER draft dangerous: open the board before tonight's draft with a lunchtime mock
   * still in the session and the board crosses off players who are not gone. The href check on
   * incoming picks catches this too, but only once a NEW pick arrives; until then the stale
   * list is live and the board has already swallowed it.
   */
  if (action === 'resetDraftSession') {
    resetSession(msg?.href || '').then(() => sendResponse({ ok: true, cleared: true }))
    return true
  }

  if (action === 'getDraftPicks') {
    /* Awaited: a cold worker woken BY this very request would otherwise answer "no picks"
       from an unhydrated session and tell the board the draft had not started. */
    ready.then(() => sendResponse({ picks: session.picks, lastPickAt: session.lastPickAt }))
    return true
  }

  /* Asking turns it on: the permission prompt IS the consent, and it cannot be requested
     without a user gesture, which the board's own button provides. */
  if (action === 'enableDraftSync') {
    chrome.permissions.request({ origins: DRAFT_HOSTS })
      .then(async (granted) => {
        if (granted) await registerDraftScripts()
        sendResponse({ granted })
      })
      .catch((e) => sendResponse({ error: String(e?.message || e) }))
    return true
  }

  sendResponse({ error: 'unknown_action' })
  return false
})
