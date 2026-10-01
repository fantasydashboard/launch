/**
 * How a kickoff reads on a lineup row.
 *
 * Fantasy managers talk in TNF / SNF / MNF and "the 1 o'clock games", not in timestamps, and
 * the only thing the label has to convey is WHEN THIS SEAT LOCKS relative to the others. Always
 * Eastern, because that is the clock the slate is published on — rendering a West-coast
 * manager's 10:00 beside an East-coast manager's 1:00 would describe two different orderings of
 * the same week.
 */
const ET = 'America/New_York'

const parts = (at: number) => {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: ET, weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: false,
  }).formatToParts(new Date(at))
  const get = (t: string) => f.find((p) => p.type === t)?.value ?? ''
  return { day: get('weekday'), hour: Number(get('hour')), minute: get('minute') }
}

/**
 * A short label for one kickoff, or '' when there is no game (a bye) or no reading.
 *
 * The three named windows get their names; everything else gets the clock, which is what
 * separates the early Sunday games from the late ones.
 */
export function kickoffLabel(at: number | null | undefined): string {
  if (at == null || !Number.isFinite(at)) return ''
  const { day, hour, minute } = parts(at)
  if (day === 'Mon') return 'MNF'
  if (day === 'Thu') return 'TNF'
  if (day === 'Sun' && hour >= 20) return 'SNF'
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  return `${day} ${h12}:${minute}`
}

/**
 * Whether this kickoff is in the first wave of the week — the seats that lock before you know
 * anything. Thursday through the Sunday-morning window, which is where the inactive reports for
 * the late games have not landed yet.
 */
export function isEarlyKickoff(at: number | null | undefined): boolean {
  if (at == null || !Number.isFinite(at)) return false
  const { day, hour } = parts(at)
  if (day === 'Thu' || day === 'Fri' || day === 'Sat') return true
  return day === 'Sun' && hour < 16
}
