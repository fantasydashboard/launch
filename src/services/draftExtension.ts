/**
 * Live draft picks, read from the browser extension.
 *
 * WHY AN EXTENSION AT ALL. Neither platform can be watched from a server. ESPN's API reports a
 * draft as not-started until it is over — the "follow ESPN" button polls and gets a draft in
 * progress with every pick empty. Yahoo refuses unauthenticated reads outright. The picks are
 * only ever delivered to the drafter's own browser, so that is the only place they can be read.
 *
 * WHAT COMES BACK. For ESPN, the draft socket sends the platform's own player ids — the same
 * ids our board is keyed by — so a pick arrives ready to cross off, with no name to match. That
 * is `playerKey`. Yahoo's adapter is not written yet and will likely give a name instead, which
 * is what `playerName` and src/draft/extensionPicks.ts are for.
 *
 * FAILURE IS REPORTED, NEVER SUBSTITUTED. A sync that silently stops on pick 40 is worse than
 * no sync: the user trusts a stale board for three rounds and drafts against a pool that has
 * moved. Every field a caller needs to say "this stopped" is on the status.
 */

const PUBLISHED_ID = 'dbjbbkdjodblojmhljgdbdlliogkhbjc'

/**
 * The extension to talk to, overridable for development.
 *
 * An unpacked build gets a different id from the published one, so testing a change meant
 * editing this constant, restarting the dev server, testing, and remembering to put it back —
 * a dance that has already been done several times and is exactly the kind of thing that
 * eventually ships pointed at somebody's local build.
 *
 *   localStorage.setItem('ufd:extensionId', '<unpacked id>')   // to test
 *   localStorage.removeItem('ufd:extensionId')                 // to stop
 *
 * Per-browser, never bundled, and it cannot affect a user who has not typed it.
 */
function extensionId(): string {
  try {
    return localStorage.getItem('ufd:extensionId') || PUBLISHED_ID
  } catch {
    return PUBLISHED_ID
  }
}

export interface ExtensionPick {
  /** The platform's own player id, when it gives one. ESPN does; it IS our board's key. */
  playerKey?: string
  /** What the room displayed, when an id is not on offer. Matched app-side. */
  playerName?: string
  position?: string
  team?: string
  pickNumber?: number
  byTeam?: string
}

export interface DraftSyncStatus {
  /** The extension is installed and answering. */
  present: boolean
  /** The user has granted the draft-room permission. */
  enabled: boolean
  /** Picks seen this session. */
  picks: number
  /**
   * How long since the newest pick, or null if none has arrived.
   *
   * The whole point of the status line: a draft moves every thirty seconds, so silence for
   * much longer than that while a draft is known live means the sync has stopped, and the
   * board must say so rather than keep showing a list that is quietly out of date.
   */
  lastPickAgoMs: number | null
}

function send<T>(message: object, timeoutMs = 4000): Promise<T | null> {
  const chrome = (window as any).chrome
  if (!chrome?.runtime?.sendMessage) return Promise.resolve(null)
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs)
    try {
      chrome.runtime.sendMessage(extensionId(), message, (response: any) => {
        clearTimeout(timer)
        /* Must be read inside the callback — Chrome clears it once the callback returns. */
        const err = chrome.runtime.lastError
        resolve(err ? null : (response ?? null))
      })
    } catch {
      clearTimeout(timer)
      resolve(null)
    }
  })
}

/** Whether the extension is there, and whether it is allowed to watch a draft room. */
export async function draftSyncStatus(): Promise<DraftSyncStatus> {
  const r = await send<any>({ action: 'draftStatus' })
  if (!r) return { present: false, enabled: false, picks: 0, lastPickAgoMs: null }
  return {
    present: true,
    enabled: !!r.enabled,
    picks: Number(r.picks ?? 0),
    lastPickAgoMs: typeof r.lastPickAgoMs === 'number' ? r.lastPickAgoMs : null,
  }
}

/** Every pick seen so far, in order. The extension keeps the session, not this page. */
export async function draftPicks(): Promise<ExtensionPick[]> {
  const r = await send<any>({ action: 'getDraftPicks' }, 6000)
  return Array.isArray(r?.picks) ? r.picks : []
}

/**
 * Ask for permission to watch draft rooms.
 *
 * Requested here rather than declared in the manifest because a required host permission on a
 * published extension disables it for every existing user until they re-accept — cookie sync
 * would stop for everybody on update day. The prompt IS the consent, and it needs the user
 * gesture that a button click provides.
 */
export async function enableDraftSync(): Promise<boolean> {
  const r = await send<any>({ action: 'enableDraftSync' }, 60000)
  return !!r?.granted
}

/**
 * Forget every pick seen so far.
 *
 * Called when the board is pointed at a different league. Picks deliberately survive a
 * service-worker restart, which is what a live draft needs — and is exactly what makes a
 * LEFTOVER draft dangerous: open the board before tonight's draft with this afternoon's mock
 * still in the session and it crosses off players who are not gone, confidently, with a number
 * beside them. One draft, one slate.
 */
export async function resetDraftSync(): Promise<boolean> {
  const r = await send<any>({ action: 'resetDraftSession' })
  return !!r?.ok
}
