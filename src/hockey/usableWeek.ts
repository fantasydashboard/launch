import type { Night } from './usableGames'

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function weekBounds(today: Date): { from: string; to: string } {
  const end = new Date(today)
  end.setDate(today.getDate() + ((7 - today.getDay()) % 7))   // Sunday (getDay 0)
  return { from: ymd(today), to: ymd(end) }
}

export function remainingNights(nights: Night[], today: string): Night[] {
  return nights.filter((n) => n.date >= today)
}
