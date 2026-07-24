/**
 * Acquisition guidance for The Wire: HOW to get a recommended add, given the
 * league's waiver mechanics. We detect the mode from each platform's settings and
 * scale the suggestion by the add's impact (its ECW gain) — a marginal add never
 * warrants a big FAAB bid or a top waiver claim, a difference-maker does.
 *
 * Budget: ESPN exposes the FAAB budget on the league; Yahoo does not (it lives on
 * the team as faab_balance), so Yahoo FAAB tips are tier-only, no dollar figures.
 */
import type { AddBudget } from '@/today/addBudget'

export type AcquisitionMode = 'faab' | 'continuous' | 'waiver' | 'unknown'

export interface AcquisitionInfo {
  mode: AcquisitionMode
  budget: number | null // total FAAB budget, when known
}

/** ESPN league.settings.acquisitionSettings → mode + budget. */
export function parseEspnAcquisition(acq: any): AcquisitionInfo {
  if (!acq || typeof acq !== 'object') return { mode: 'unknown', budget: null }
  if (acq.isUsingAcquisitionBudget) {
    return { mode: 'faab', budget: typeof acq.acquisitionBudget === 'number' ? acq.acquisitionBudget : null }
  }
  const type = String(acq.acquisitionType ?? '').toUpperCase()
  if (type.includes('CONTINUOUS')) return { mode: 'continuous', budget: null }
  if (type.includes('WAIVER')) return { mode: 'waiver', budget: null }
  return { mode: 'unknown', budget: null }
}

/** Yahoo league settings → mode (Yahoo doesn't surface the FAAB budget here). */
export function parseYahooAcquisition(settings: any): AcquisitionInfo {
  if (!settings || typeof settings !== 'object') return { mode: 'unknown', budget: null }
  const usesFaab = settings.uses_faab === '1' || settings.uses_faab === 1 || settings.uses_faab === true
  if (usesFaab) return { mode: 'faab', budget: null }
  // Yahoo waiver_type 'R' (rolling list) etc. = priority waivers; no "continuous" flag.
  if (settings.waiver_type != null) return { mode: 'waiver', budget: null }
  return { mode: 'unknown', budget: null }
}

/** One-line "how to get him", scaled by the add's ECW gain. '' when unknown. */
export function acquisitionTip(mode: AcquisitionMode, deltaEcw: number, budget: number | null): string {
  const strong = deltaEcw >= 0.35
  const solid = deltaEcw >= 0.15
  if (mode === 'faab') {
    if (budget && budget > 0) {
      if (strong) return `bid up · ~$${Math.round(budget * 0.25)}-${Math.round(budget * 0.4)} of $${budget}`
      if (solid) return `moderate bid · ~$${Math.round(budget * 0.1)}-${Math.round(budget * 0.2)}`
      return `low bid · $1-${Math.max(2, Math.round(budget * 0.03))}`
    }
    if (strong) return 'FAAB league · bid aggressively'
    if (solid) return 'FAAB league · moderate bid'
    return 'FAAB league · low bid'
  }
  if (mode === 'continuous') return 'continuous waivers · free add'
  if (mode === 'waiver') return strong ? 'worth a top waiver claim' : 'low-priority waiver claim'
  return ''
}

/** ESPN add budget: acquisitionSettings (league.settings.acquisitionSettings) + team.transactionCounter. */
export function parseEspnAddBudget(acquisitionSettings: any, transactionCounter: any): AddBudget {
  const acq = acquisitionSettings
  if (acq?.isUsingAcquisitionBudget) {
    const budget = typeof acq.acquisitionBudget === 'number' ? acq.acquisitionBudget : null
    const spent = typeof transactionCounter?.acquisitionBudgetSpent === 'number' ? transactionCounter.acquisitionBudgetSpent : 0
    return { kind: 'faab', budget, remaining: (budget ?? 0) - spent }
  }
  const limit = typeof acq?.acquisitionLimit === 'number' ? acq.acquisitionLimit : -1
  if (limit < 0) return { kind: 'unlimited' }
  const used = typeof transactionCounter?.acquisitions === 'number' ? transactionCounter.acquisitions : 0
  return { kind: 'count', limit, used, remaining: Math.max(0, limit - used) }
}

/** Yahoo add budget: league settings + { weeklyAddsUsed, faabBalance } from the my-team resource. */
export function parseYahooAddBudget(
  settings: any,
  teamInfo: { weeklyAddsUsed: number | null; faabBalance: number | null },
): AddBudget {
  const usesFaab = settings?.uses_faab === '1' || settings?.uses_faab === 1 || settings?.uses_faab === true
  if (usesFaab) {
    return teamInfo.faabBalance == null ? { kind: 'unlimited' } : { kind: 'faab', budget: null, remaining: teamInfo.faabBalance }
  }
  const limit = Number(settings?.max_weekly_adds)
  if (!Number.isFinite(limit) || limit <= 0) return { kind: 'unlimited' }
  const used = teamInfo.weeklyAddsUsed ?? 0
  return { kind: 'count', limit, used, remaining: Math.max(0, limit - used) }
}
