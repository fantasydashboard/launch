import { describe, it, expect } from 'vitest'
import {
  draftBoardInjuryStatus,
  DRAFT_BOARD_STATUS_CODES,
} from '../injuryStatus'

describe('draftBoardInjuryStatus', () => {
  it('shows the statuses that mean he may not play', () => {
    for (const code of ['Out', 'Doubtful', 'IR', 'PUP', 'Sus', 'NA', 'DNR']) {
      expect(draftBoardInjuryStatus(code), code).not.toBeNull()
    }
  })

  it('stays silent on Questionable, which in August is a camp tag on round-one players', () => {
    // 52 of the 62 statuses in the top 300 skill players were Questionable —
    // McCaffrey, Mahomes, Nacua. A badge on all of them says nothing.
    expect(draftBoardInjuryStatus('Questionable')).toBeNull()
  })

  it('stays silent on a status it cannot explain rather than printing a raw code', () => {
    expect(draftBoardInjuryStatus('Cov')).toBeNull()
    expect(draftBoardInjuryStatus('Probable')).toBeNull()
    expect(draftBoardInjuryStatus('Nonsense')).toBeNull()
  })

  it('treats absence as absence, not as a status', () => {
    expect(draftBoardInjuryStatus(null)).toBeNull()
    expect(draftBoardInjuryStatus(undefined)).toBeNull()
    expect(draftBoardInjuryStatus('')).toBeNull()
    expect(draftBoardInjuryStatus('   ')).toBeNull()
  })

  it('matches whatever casing and padding the feed happens to send', () => {
    expect(draftBoardInjuryStatus('out')?.label).toBe('OUT')
    expect(draftBoardInjuryStatus(' pup ')?.label).toBe('PUP')
    expect(draftBoardInjuryStatus('Ir')?.label).toBe('IR')
  })

  it('gives every allowed code a long form, so no badge renders as an unexplained abbreviation', () => {
    for (const code of DRAFT_BOARD_STATUS_CODES) {
      const shown = draftBoardInjuryStatus(code)!
      expect(shown.label, code).toBeTruthy()
      expect(shown.detail.length, code).toBeGreaterThan(shown.label.length)
    }
  })

  it('exposes exactly the allow-list, so a status cannot be added without this test seeing it', () => {
    expect([...DRAFT_BOARD_STATUS_CODES].sort()).toEqual(
      ['DNR', 'DOUBTFUL', 'IR', 'NA', 'OUT', 'PUP', 'SUS'],
    )
  })
})
