/**
 * Who is off the board, given every source that can say so.
 *
 * THIS EXISTS AS ITS OWN FILE BECAUSE IT GOT IT WRONG ONCE, SILENTLY. The rule used to live
 * inline in the board composable, which is untestable without a network, so nothing pinned it:
 *
 *   drafted = live && liveState ? liveState.drafted : handMarked
 *
 * That is right about hand-marked picks and wrong about the extension. ESPN's API reports a
 * RUNNING draft as in-progress with every pick empty, so in live mode `liveState.drafted` is
 * empty for the entire draft — and the branch threw away the one source that did know. A real
 * session synced 161 picks from the draft socket and showed a completely full pool.
 *
 * The distinction the old rule was reaching for is between sources that GUESS and sources that
 * KNOW. A human clicking rows can disagree with the draft, so while ESPN is authoritative the
 * clicks are ignored. The extension is not guessing: it read a SELECTED frame carrying ESPN's
 * own player id. It can only ever add somebody who is genuinely gone, so it counts in both
 * modes and never replaces the base — it is added to it.
 */

export interface DraftedSources {
  /** Following ESPN's own draft state rather than marking picks by hand. */
  live: boolean
  /** ESPN's drafted set, when live and it has answered. Null before the first good read. */
  liveDrafted: Set<string> | null
  /** Players the user clicked. Ignored while live: they can disagree with the draft. */
  handMarked: Iterable<string>
  /** Players read off the draft socket. Counted in BOTH modes — these cannot disagree. */
  fromExtension: Iterable<string>
}

export function draftedFrom({ live, liveDrafted, handMarked, fromExtension }: DraftedSources): Set<string> {
  const base = live && liveDrafted ? liveDrafted : new Set(handMarked)
  const ext = [...fromExtension]
  if (!ext.length) return base
  return new Set([...base, ...ext])
}
