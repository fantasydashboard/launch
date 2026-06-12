/**
 * The header's "Fix it" line falls back to this when the biggest hole has no clean
 * same-side waiver add (e.g. a roster-wide counting cat like Runs, or a rate nobody
 * available improves). The always-true, useful fact is that the wire is empty — which
 * directs effort away from the waiver hunt. Rate cats get an extra honest note since
 * they move slowly regardless. Deliberately no invented player target and no vague
 * "make a trade" CTA — honest silence beats a hollow next-step.
 */
export function holeFixNote(label: string, isRatio: boolean): string {
  return isRatio
    ? `No clean ${label} add on the wire — and as a rate, it moves slowly.`
    : `No clean ${label} add on the wire right now.`
}
