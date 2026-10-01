/**
 * Short column labels for a set of team names, guaranteed distinct within that set.
 *
 * The heatmap abbreviated each name on its own — initials for a multi-word name, the first
 * three characters otherwise. That is fine for one name and wrong for a column header, where
 * the whole job is telling the columns apart: a twelve-team league produced "MM" for both
 * Makar's Mark and Mitch Muffin, side by side, and the grid had two columns a reader could
 * not attach to a team.
 *
 * Uniqueness is a property of the SET, so it cannot be decided one name at a time. Candidates
 * are tried in order of how well they read, and the first one nobody has taken wins.
 */

function clean(name: string): string {
  return (name || '').replace(/[^A-Za-z0-9 ]/g, '').trim()
}

/** The label candidates for one name, best first. */
function candidates(name: string): string[] {
  const cleaned = clean(name)
  const parts = cleaned.split(/\s+/).filter(Boolean)
  const out: string[] = []
  /* Initials read best when they are distinct — "Rock'em Sock'em" is RS to everyone. */
  if (parts.length > 1) out.push(parts.map((w) => w[0]).join(''))
  /* Then the first word, which is what people actually shorten a team to. */
  if (parts[0]) out.push(parts[0].slice(0, 3))
  /* Then initials padded with the second word, for two teams sharing initials. */
  if (parts.length > 1 && parts[1]) out.push((parts[0][0] ?? '') + parts[1].slice(0, 2))
  if (cleaned) out.push(cleaned.slice(0, 3))
  return out.map((c) => c.toUpperCase().slice(0, 3)).filter(Boolean)
}

export function shortTeamLabels(names: string[]): string[] {
  const taken = new Set<string>()
  return names.map((name) => {
    for (const c of candidates(name)) {
      if (!taken.has(c)) { taken.add(c); return c }
    }
    /* Everything readable is spoken for, so number it rather than repeat a label. A digit is
       ugly; two identical columns are unusable. */
    const base = (candidates(name)[0] ?? 'TM').slice(0, 2)
    for (let i = 2; i < 100; i++) {
      const c = `${base}${i}`.toUpperCase().slice(0, 3)
      if (!taken.has(c)) { taken.add(c); return c }
    }
    return 'TM'
  })
}
