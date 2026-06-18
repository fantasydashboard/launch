/**
 * Verdict label for a one-sided add/drop, keyed off the ECW delta (expected
 * categories won per week vs the league) the same engine that scores the auto
 * upgrades produces. Keeps the interactive grader speaking the standings dialect
 * the rest of The Wire uses.
 */
export type GradeTone = 'up' | 'flat' | 'down'

export interface GradeVerdict {
  label: string
  tone: GradeTone
}

export function gradeLabel(deltaEcw: number): GradeVerdict {
  if (deltaEcw >= 0.2) return { label: 'Strong upgrade', tone: 'up' }
  if (deltaEcw >= 0.08) return { label: 'Solid upgrade', tone: 'up' }
  if (deltaEcw >= 0.02) return { label: 'Marginal upgrade', tone: 'up' }
  if (deltaEcw > -0.02) return { label: 'Lateral move', tone: 'flat' }
  return { label: 'Downgrade', tone: 'down' }
}
