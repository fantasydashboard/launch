/**
 * Which reported status belongs on a DRAFT BOARD.
 *
 * A draft board is not an in-season lineup sheet. The question a drafter is
 * asking is "might this player not play at all", and only some of Sleeper's
 * `injury_status` values answer it.
 *
 * `Questionable` is deliberately excluded. Measured on the live feed: of the
 * top 300 skill players by search_rank, 62 carried a status and 52 of those
 * were `Questionable` — McCaffrey, Mahomes, Nacua, Evans and Breece Hall among
 * them. In August it is a rolling camp tag, not the in-season NFL practice
 * report designation, so it lands on round-one players and tells the drafter
 * nothing. A badge on every elite row carries exactly as much information as a
 * badge on none.
 *
 * Anything not on the list renders NOTHING rather than a raw code. The feed
 * also carries values we cannot interpret for the user, and a three-letter
 * string nobody can decode is worse than silence: it reads as a warning without
 * being one.
 */

export interface DraftBoardStatus {
  /** The code to render on the row. Short, because the row is already crowded. */
  label: string
  /** Long form for the tooltip — the codes are not self-explanatory. */
  detail: string
}

/**
 * The allow-list, keyed by Sleeper's word upper-cased. Every entry means "he may
 * genuinely not play", which is the only thing worth a badge in August.
 */
const DRAFT_BOARD_STATUSES: Record<string, DraftBoardStatus> = {
  OUT: { label: 'OUT', detail: 'Ruled out' },
  DOUBTFUL: { label: 'DOUBTFUL', detail: 'Doubtful to play' },
  IR: { label: 'IR', detail: 'Injured reserve' },
  PUP: { label: 'PUP', detail: 'Physically unable to perform' },
  SUS: { label: 'SUS', detail: 'Suspended' },
  NA: { label: 'NA', detail: 'Not active' },
  DNR: { label: 'DNR', detail: 'Did not report' },
}

/** The statuses a draft board shows, for tests and callers that want the set. */
export const DRAFT_BOARD_STATUS_CODES = Object.keys(DRAFT_BOARD_STATUSES)

/**
 * The badge for a reported status, or `null` when the board should stay silent.
 * Pure and total: any casing, any whitespace, any unknown value, `null` and
 * `undefined` all resolve without throwing.
 */
export function draftBoardInjuryStatus(raw?: string | null): DraftBoardStatus | null {
  const key = String(raw ?? '').trim().toUpperCase()
  if (!key) return null
  return DRAFT_BOARD_STATUSES[key] ?? null
}
