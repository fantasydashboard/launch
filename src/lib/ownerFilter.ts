/**
 * Which players a board shows, by who holds them.
 *
 * Every ranked board in this app answers two questions at once — who is good, and can I have
 * him — and a reader almost never wants both audiences at the same time. Setting tonight's
 * lineup, the other ten teams' rosters are noise you scroll past. Studying the league, they
 * are the whole point. One list cannot be both without a way to say which you are reading.
 *
 * THREE BUCKETS, BECAUSE THE BOARDS ALREADY CARRY THREE. Both `owned`/`free` on the rankings
 * rows and `owner: 'mine' | 'free' | 'rostered'` on the daily ones collapse to the same three
 * states, so this adds a control over a distinction that already exists rather than a new one.
 * The opponent is deliberately not a fourth: he is a MARKER on a rostered player, not a
 * separate owner, and a reader who wants him wants "taken".
 */

export type OwnerBucket = 'mine' | 'free' | 'taken'

export const ALL_BUCKETS: readonly OwnerBucket[] = ['mine', 'free', 'taken']

/**
 * Tonight's board opens on the men you can actually field or claim.
 *
 * A daily board is a decision about this evening, and the other teams' rosters cannot be part
 * of it — you can neither start them nor sign them. They stay one click away because "who has
 * him" is still worth asking, just not while you are setting a lineup.
 */
export const TODAY_DEFAULT: readonly OwnerBucket[] = ['mine', 'free']

/** The rankings board opens on everybody: it is a view of the league, not of your evening. */
export const RANKINGS_DEFAULT: readonly OwnerBucket[] = ALL_BUCKETS

/** The bucket a row falls in, from the two facts every board already carries. */
export function ownerBucket(row: { mine?: boolean; free?: boolean }): OwnerBucket {
  if (row.mine) return 'mine'
  if (row.free) return 'free'
  return 'taken'
}

/** Whether a row survives the current selection. */
export function showsBucket(active: readonly OwnerBucket[], bucket: OwnerBucket): boolean {
  return active.includes(bucket)
}

/**
 * Turn one bucket on or off.
 *
 * THE LAST ONE CANNOT BE TURNED OFF. An empty board is never what a reader meant by clicking,
 * and it looks identical to one that failed to load — the failure this codebase keeps having
 * to tell apart from a real absence. Refusing the click is kinder than a blank list, and it
 * keeps the control from being able to lie about whether there is anything to show.
 */
export function toggleBucket(
  active: readonly OwnerBucket[],
  bucket: OwnerBucket,
): OwnerBucket[] {
  const on = active.includes(bucket)
  if (on && active.length === 1) return [...active]
  const next = on ? active.filter((b) => b !== bucket) : [...active, bucket]
  /* Kept in a fixed order so the chips never reorder under the cursor. */
  return ALL_BUCKETS.filter((b) => next.includes(b))
}

/**
 * Read and write the choice, per board.
 *
 * localStorage because the preference is one reader's habit on one device and belongs nowhere
 * shared. Every access is guarded: a private window, cleared site data or a thumbnail capture
 * can make either call throw, and a filter that crashes a board is far worse than one that
 * forgets.
 */
export function loadBuckets(key: string, fallback: readonly OwnerBucket[]): OwnerBucket[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return [...fallback]
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return [...fallback]
    const kept = ALL_BUCKETS.filter((b) => parsed.includes(b))
    /* A stored empty — or a stored anything we no longer recognise — falls back rather than
       rendering the blank board the toggle itself refuses to produce. */
    return kept.length ? kept : [...fallback]
  } catch {
    return [...fallback]
  }
}

export function saveBuckets(key: string, active: readonly OwnerBucket[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(active))
  } catch {
    /* Not worth telling anyone about: the board is correct either way, it just forgets. */
  }
}

/** The word on the chip. "taken" rather than "rostered" — it is shorter and it is what a manager says. */
export const BUCKET_LABEL: Record<OwnerBucket, string> = {
  mine: 'my team', free: 'free', taken: 'taken',
}
