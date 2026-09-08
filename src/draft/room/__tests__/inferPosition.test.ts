import { describe, it, expect } from 'vitest'
import { inferRankingPosition } from '../customRankings'

/*
 * Weekly analyst rankings come one file per position, and the position is never a column —
 * it is the name of the player column. Without reading it, seven uploaded files each restart
 * at rank 1 and collide into seven different players all ranked first.
 */
describe('inferRankingPosition', () => {
  it('reads the position out of the player column header', () => {
    expect(inferRankingPosition('"Rank","Quarterback","Team","Opponent"')).toBe('QB')
    expect(inferRankingPosition('"Rank","Running Back","Team"')).toBe('RB')
    expect(inferRankingPosition('"Rank","Wide Receiver","Team"')).toBe('WR')
    expect(inferRankingPosition('"Rank","Tight End","Team"')).toBe('TE')
    expect(inferRankingPosition('"Rank","Kicker","Team"')).toBe('K')
    expect(inferRankingPosition('"Rank","Defense","Opponent"')).toBe('DEF')
  })

  /* A flex sheet spans positions and carries its own Pos column — inferring one position for
     it would mislabel every row. */
  it('declines to guess on a sheet that spans positions', () => {
    expect(inferRankingPosition('"Rank","FLEX","Team","Opponent","Total","Pos","Matchup"')).toBeNull()
  })

  it('handles a bare abbreviation header and tabs', () => {
    expect(inferRankingPosition('Rank\tQB\tTeam')).toBe('QB')
    expect(inferRankingPosition('Rank,TE,Team')).toBe('TE')
  })

  it('returns null rather than guessing on an unrecognised sheet', () => {
    expect(inferRankingPosition('"Rank","Player","Team"')).toBeNull()
    expect(inferRankingPosition('')).toBeNull()
  })

  it('reads the real files', () => {
    const { readFileSync } = require('node:fs')
    const at = (f: string) => readFileSync(`/Users/joshdaniel/Downloads/${f}.csv`, 'utf8')
    expect(inferRankingPosition(at('qb'))).toBe('QB')
    expect(inferRankingPosition(at('rb'))).toBe('RB')
    expect(inferRankingPosition(at('wr'))).toBe('WR')
    expect(inferRankingPosition(at('te'))).toBe('TE')
    expect(inferRankingPosition(at('k'))).toBe('K')
    expect(inferRankingPosition(at('def'))).toBe('DEF')
    expect(inferRankingPosition(at('flex'))).toBeNull()
  })
})
