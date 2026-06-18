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

// Thresholds calibrated to reality: across a whole free-agent pool the single best
// available add is usually only ~+0.3-0.4 cats/wk, so "Strong" is reserved for that
// rare top end and +0.1 reads as the marginal move it actually is.
export function gradeLabel(deltaEcw: number): GradeVerdict {
  if (deltaEcw >= 0.35) return { label: 'Strong upgrade', tone: 'up' }
  if (deltaEcw >= 0.15) return { label: 'Solid upgrade', tone: 'up' }
  if (deltaEcw >= 0.05) return { label: 'Marginal upgrade', tone: 'up' }
  if (deltaEcw > -0.05) return { label: 'Lateral move', tone: 'flat' }
  return { label: 'Downgrade', tone: 'down' }
}
