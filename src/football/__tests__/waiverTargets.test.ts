import { describe, it, expect } from 'vitest'
import { buildWaiverTargets, bidFor, MIN_SNAP_SHARE, MAX_BID_PCT } from '@/football/waiverTargets'
import { usageFromStats } from '@/services/playerUsage'

/*
 * The waiver board answers a narrower question than "who is the best free agent".
 *
 * The Wire already ranks free agents by rest-of-season value. A waiver claim asks whose ROLE
 * just changed, and those diverge constantly: a receiver who has quietly been his team's WR3
 * all year outranks one who just took over as the WR1, and only the second is worth a bid.
 */
const usage = usageFromStats([
  // Took over: most of the snaps, real volume.
  { player_id: 'took_over', stats: { off_snp: 58, tm_off_snp: 68, rec_tgt: 9, pts_half_ppr: 24 } },
  // One good drive: barely played, scored anyway.
  { player_id: 'fluke',     stats: { off_snp: 9,  tm_off_snp: 68, rec_tgt: 2, pts_half_ppr: 21 } },
  // A starter on someone else's roster.
  { player_id: 'taken',     stats: { off_snp: 60, tm_off_snp: 68, rec_tgt: 8, pts_half_ppr: 19 } },
  // Snap counts not filed by Sleeper.
  { player_id: 'nodata',    stats: { rec_tgt: 7, pts_half_ppr: 18 } },
])

const players = [
  { playerKey: 'took_over', name: 'Took Over', position: 'WR', vorRos: 10, owned: false, free: true },
  { playerKey: 'fluke',     name: 'One Drive', position: 'WR', vorRos: 8,  owned: false, free: true },
  { playerKey: 'taken',     name: 'Their Guy', position: 'WR', vorRos: 30, owned: false, free: false, ownerName: 'Chancla Warriors' },
  { playerKey: 'nodata',    name: 'No Snaps',  position: 'TE', vorRos: 5,  owned: false, free: true },
]

describe('the waiver board', () => {
  const build = (gain: Record<string, number> = {}) =>
    buildWaiverTargets({ players, usage, gainByKey: gain, weeksLeft: 16 })

  it('keeps the player who took over the snaps', () => {
    expect(build().map((t) => t.name)).toContain('Took Over')
  })

  it('drops the one who scored on a handful of plays', () => {
    /* 21 points on 13% of snaps is an afternoon, not a job — and it does not repeat, which
       is the entire reason the board is built on snap share rather than points. */
    expect(build().map((t) => t.name)).not.toContain('One Drive')
    expect(MIN_SNAP_SHARE).toBe(0.5)
  })

  it('says nothing about a player whose snaps were never filed', () => {
    // Absent data is not evidence of a role. Skipping is the honest reading.
    expect(build().map((t) => t.name)).not.toContain('No Snaps')
  })

  it('keeps a taken player and names who has him', () => {
    const them = build().find((t) => t.name === 'Their Guy')!
    expect(them.availability).toBe('taken')
    expect(them.ownerName).toBe('Chancla Warriors')
    expect(them.bidReason).toBe('rostered by Chancla Warriors')
  })

  it('never prices a player you cannot claim', () => {
    // A bid beside someone else's roster is advice you cannot act on.
    expect(build().find((t) => t.name === 'Their Guy')!.bidPct).toBe(0)
  })

  it('sorts claimable players above taken ones however good their week was', () => {
    // 'Their Guy' outscores nobody here by accident — he is above on value and below on order.
    const names = build().map((t) => t.name)
    expect(names.indexOf('Took Over')).toBeLessThan(names.indexOf('Their Guy'))
  })
})

describe('the bid', () => {
  it('is zero for someone who would not start for you', () => {
    /* A small percentage reads as "a little bit worth it", which is the wrong answer rather
       than a quiet one. */
    expect(bidFor(0, 16)).toBe(0)
    expect(bidFor(-2, 16)).toBe(0)
  })

  it('rises with what he adds and with the weeks left to add it', () => {
    expect(bidFor(4, 16)).toBeGreaterThan(bidFor(2, 16))
    expect(bidFor(3, 16)).toBeGreaterThan(bidFor(3, 4))
  })

  it('never bids the whole budget on one player', () => {
    expect(bidFor(99, 17)).toBeLessThanOrEqual(MAX_BID_PCT)
  })

  it('explains itself rather than printing a bare number', () => {
    const t = buildWaiverTargets({
      players, usage, gainByKey: { took_over: 4.2 }, weeksLeft: 16,
    }).find((x) => x.name === 'Took Over')!
    expect(t.bidPct).toBeGreaterThan(0)
    expect(t.bidReason).toContain('85% of snaps')
    expect(t.bidReason).toContain('+4.2 a week')
  })

  it('tells a free agent who does not crack the lineup exactly that', () => {
    const t = buildWaiverTargets({ players, usage, gainByKey: {}, weeksLeft: 16 })
      .find((x) => x.name === 'Took Over')!
    expect(t.bidPct).toBe(0)
    expect(t.bidReason).toBe("wouldn't crack your lineup")
  })
})
