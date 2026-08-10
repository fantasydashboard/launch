/**
 * One colour per position, borrowed from where drafters already learned them.
 *
 * The old set ran violet / cyan / blue / fuchsia: a purple and two blues that a
 * user reading a board at speed cannot tell apart, which is the only speed a
 * draft board is ever read at. Sleeper's scheme separates cleanly because its
 * four skill positions sit on four different hues — pink, teal, blue, orange —
 * rather than four steps around the same corner of the wheel.
 *
 * Kept honest about the tradeoff: those hues overlap the semantic colours this
 * app uses for gone / stale / good. Position never relies on colour alone — the
 * badge always spells the position out — so the overlap costs nothing a
 * colour-blind or hurried reader was relying on.
 */

export interface PositionColor {
  /** Small badge: tinted background, legible text. */
  badge: string
  /** Whole-cell wash for the draft board, where colour IS the scan. */
  cell: string
  /** Left rule for list rows. */
  accent: string
}

const NEUTRAL: PositionColor = {
  badge: 'bg-dark-border/60 text-dark-textMuted',
  cell: 'bg-dark-border/25 border-dark-border/60',
  accent: 'border-l-dark-border',
}

export const POSITION_COLORS: Record<string, PositionColor> = {
  QB: {
    badge: 'bg-rose-500/20 text-rose-300',
    cell: 'bg-rose-500/15 border-rose-500/30',
    accent: 'border-l-rose-400',
  },
  RB: {
    badge: 'bg-teal-500/20 text-teal-300',
    cell: 'bg-teal-500/15 border-teal-500/30',
    accent: 'border-l-teal-400',
  },
  WR: {
    badge: 'bg-sky-500/20 text-sky-300',
    cell: 'bg-sky-500/15 border-sky-500/30',
    accent: 'border-l-sky-400',
  },
  TE: {
    badge: 'bg-orange-500/20 text-orange-300',
    cell: 'bg-orange-500/15 border-orange-500/30',
    accent: 'border-l-orange-400',
  },
  K: {
    badge: 'bg-purple-500/20 text-purple-300',
    cell: 'bg-purple-500/15 border-purple-500/30',
    accent: 'border-l-purple-400',
  },
  DEF: {
    badge: 'bg-slate-500/25 text-slate-300',
    cell: 'bg-slate-500/15 border-slate-500/30',
    accent: 'border-l-slate-400',
  },
}

const normalize = (p: string) => (p || '').toUpperCase().split(/[,/|]/)[0].trim()

export function positionColor(position: string): PositionColor {
  return POSITION_COLORS[normalize(position)] ?? NEUTRAL
}

export const positionBadge = (position: string) => positionColor(position).badge
export const positionCell = (position: string) => positionColor(position).cell
export const positionAccent = (position: string) => positionColor(position).accent
