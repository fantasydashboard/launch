import type { FGProjection } from '@/services/projectionService'

// Shared lineup-eligibility logic, so My Team's optimal-lineup panel and the Trades league
// landscape classify pitchers identically (no drift between the two views).

/** A player's eligible positions — explicit list, else parsed from a delimited position string. */
export function eligOf(p: { eligiblePositions?: string[]; position?: string }): string[] {
  return p.eligiblePositions?.length
    ? p.eligiblePositions
    : String(p.position || '')
        .split(/[,/|]/)
        .map((s) => s.trim())
        .filter(Boolean)
}

const PITCH_TOKENS = new Set(['SP', 'RP', 'P'])
/** Whether these eligibility tokens belong to a pitcher (any of SP/RP/P). */
export function isPitcherElig(elig: string[]): boolean {
  return elig.some((x) => PITCH_TOKENS.has(x.toUpperCase()))
}

/**
 * A pitcher's role for lineup purposes. ESPN tags pitchers inconsistently (generic "P",
 * "SP"/"RP", or both), so we classify by PROJECTED workload: majority of appearances are
 * starts -> SP, else RP. Falls back to a single ESPN tag, then assumes starter (most rostered
 * arms are, and an unknown is safer in SP/P than dumped into a scarce RP slot).
 */
export function pitcherRoleFor(fg: FGProjection | null | undefined, elig: string[]): 'SP' | 'RP' {
  if (fg && fg.player_type === 'pitcher') {
    const gp = fg.gp ?? 0, gs = fg.gs ?? 0
    if (gp > 0) return gs * 2 >= gp ? 'SP' : 'RP'
    if (gs > 0) return 'SP'
  }
  const hasSP = elig.some((x) => x.toUpperCase() === 'SP')
  const hasRP = elig.some((x) => x.toUpperCase() === 'RP')
  if (hasRP && !hasSP) return 'RP'
  return 'SP'
}

/**
 * Eligibility used when building a lineup: pitchers collapse to their single projected role
 * (so a starter competes for SP, a reliever for RP, and the flex P slot takes overflow);
 * hitters keep their real multi-position eligibility (genuinely useful there).
 */
export function lineupEligFor(
  p: { playerKey: string; eligiblePositions?: string[]; position?: string },
  fgByKey: Record<string, FGProjection | null>,
): string[] {
  const elig = eligOf(p)
  return isPitcherElig(elig) ? [pitcherRoleFor(fgByKey[p.playerKey], elig)] : elig
}
