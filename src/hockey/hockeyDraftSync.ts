/**
 * Reading a live ESPN hockey draft.
 *
 * WHAT THE FEED ACTUALLY IS. `?view=mDraftDetail` returns the whole pick schedule up front —
 * 176 rows for an eight-team, twenty-two-round draft — each carrying the team that owns it
 * and its place in the order. An unmade pick has `playerId: -1`. So the board does not learn
 * about a draft as it happens; it holds the complete shape of the draft from the start and
 * watches cells fill in. That is a much better feed than it sounds, because it means the
 * answer to "when do I pick next" is available before anybody has picked at all.
 *
 * MINUS ONE IS NOT A PLAYER. The single trap in this payload is that an unmade pick is not
 * absent, it is present with a sentinel. Anything that reads `playerId` without checking will
 * cheerfully mark player -1 as drafted, and since no player has that id, the effect is a
 * draft board that looks fine and never removes anybody.
 *
 * WHAT THIS FILE WILL NOT DO. It does not make picks. ESPN's write endpoints need a
 * session we do not hold and would not want to hold, and a tool that silently drafted for
 * somebody would be a far worse bug than one that does nothing. It reads.
 */

/** A seat in the draft order, filled or not. */
export interface HockeyDraftPick {
  overall: number
  round: number
  roundPick: number
  teamId: number
  /** The player taken here, or null while the pick is still outstanding. */
  playerKey: string | null
  keeper: boolean
}

export interface HockeyDraftState {
  /** ESPN's own flag. A draft can have picks recorded and be over. */
  inProgress: boolean
  /** True once every pick is made. */
  complete: boolean
  picks: HockeyDraftPick[]
  /** Everyone off the board, by player key — what the value engine needs. */
  drafted: Set<string>
}

/** ESPN's sentinel for a pick nobody has made yet. */
const NO_PLAYER = -1

/** Parse `?view=mDraftDetail` into the draft's current state. */
export function parseDraftDetail(payload: any): HockeyDraftState {
  const detail = payload?.draftDetail ?? {}
  const rows: any[] = Array.isArray(detail.picks) ? detail.picks : []

  const picks: HockeyDraftPick[] = []
  const drafted = new Set<string>()
  for (const row of rows) {
    const overall = Number(row?.overallPickNumber)
    if (!Number.isFinite(overall)) continue
    const playerId = Number(row?.playerId)
    /* The sentinel check, which is the whole point of this function. */
    const playerKey = Number.isFinite(playerId) && playerId > NO_PLAYER && playerId !== 0
      ? String(playerId)
      : null
    if (playerKey) drafted.add(playerKey)
    picks.push({
      overall,
      round: Number(row?.roundId) || 0,
      roundPick: Number(row?.roundPickNumber) || 0,
      teamId: Number(row?.teamId) || 0,
      playerKey,
      keeper: row?.keeper === true || row?.reservedForKeeper === true,
    })
  }
  picks.sort((a, b) => a.overall - b.overall)

  return {
    inProgress: detail.inProgress === true,
    complete: picks.length > 0 && picks.every((p) => p.playerKey !== null),
    picks,
    drafted,
  }
}

export interface HockeyDraftClock {
  /** The team whose pick it is, or null when the draft has not started or has finished. */
  onTheClockTeamId: number | null
  /** The next unmade pick overall, or null when there is none. */
  nextOverall: number | null
  /** How many picks are left before this team's next one. Zero means they are on the clock. */
  picksUntilMine: number | null
  /** This team's next pick, and the one after it — what you plan two rounds around. */
  myNextOverall: number | null
  myFollowingOverall: number | null
  /** Everything this team has already taken, in order. */
  myPicks: HockeyDraftPick[]
}

/**
 * Where a given team stands in the order right now.
 *
 * `picksUntilMine` is the number a drafter actually uses — it is how many players can come off
 * the board before their turn, and therefore how deep down their own list they should be
 * willing to look. A snake draft makes it swing between one and fifteen, which is why it is
 * worth computing rather than eyeballing the round.
 *
 * Every field is null rather than a fallback when the answer is unknown. A team id nobody
 * owns, a draft with no picks, a completed draft — each returns "no answer" rather than a
 * plausible number, because a wrong pick countdown is acted on immediately.
 */
export function draftClock(state: HockeyDraftState, myTeamId: number | null): HockeyDraftClock {
  const empty: HockeyDraftClock = {
    onTheClockTeamId: null, nextOverall: null, picksUntilMine: null,
    myNextOverall: null, myFollowingOverall: null, myPicks: [],
  }
  if (!state.picks.length) return empty

  const outstanding = state.picks.filter((p) => p.playerKey === null)
  const current = outstanding[0] ?? null

  const myPicks = myTeamId === null ? [] : state.picks.filter((p) => p.teamId === myTeamId && p.playerKey !== null)
  const myOutstanding = myTeamId === null ? [] : outstanding.filter((p) => p.teamId === myTeamId)

  return {
    onTheClockTeamId: current?.teamId ?? null,
    nextOverall: current?.overall ?? null,
    /* Counted along the outstanding picks rather than subtracting pick numbers, so a draft
       with keeper rounds already filled in does not overstate the wait. */
    picksUntilMine: myOutstanding.length ? outstanding.indexOf(myOutstanding[0]) : null,
    myNextOverall: myOutstanding[0]?.overall ?? null,
    myFollowingOverall: myOutstanding[1]?.overall ?? null,
    myPicks,
  }
}

/** Team id -> display name, from `?view=mTeam`. */
export function teamNamesFromEspn(payload: any): Record<number, string> {
  const out: Record<number, string> = {}
  for (const t of payload?.teams ?? []) {
    const id = Number(t?.id)
    if (!Number.isFinite(id)) continue
    const name = String(t?.name ?? `${t?.location ?? ''} ${t?.nickname ?? ''}`).trim()
    out[id] = name || `Team ${id}`
  }
  return out
}
