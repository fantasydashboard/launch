import { describe, it, expect } from 'vitest'
import { buildTodayBoard, positionsOverlap, type ScoredPlay, type LineupValue } from '../todayBoard'
import type { OpenSlot } from '../openSlots'

function play(p: Partial<ScoredPlay> & { name: string; value: number }): ScoredPlay {
  return {
    kind: 'stream',
    playerKey: p.name,
    team: 'LAD',
    position: 'SP',
    side: 'pit',
    value: p.value,
    score: p.value, // default: score mirrors value so ordering assertions hold unless overridden
    bucket: 4,
    detail: '',
    oneDay: true,
    fillsSlot: undefined,
    helpsCats: [],
    ...p,
  }
}

describe('buildTodayBoard', () => {
  it('hero = highest-value play; streamers sorted desc; assigns fills to open slots', () => {
    const plays: ScoredPlay[] = [
      play({ name: 'Ace', value: 18, kind: 'stream', fillsSlot: 'SP' }),
      play({ name: 'Mid', value: 9, kind: 'stream' }),
      play({ name: 'BenchBat', value: 7, kind: 'startSit', fillsSlot: 'OF', oneDay: false, position: 'OF' }),
    ]
    const openSlots: OpenSlot[] = [
      { slot: 'SP', reason: 'empty' },
      { slot: 'OF', reason: 'off-day', vacating: { playerKey: 'x', name: 'Off Guy', position: 'OF' } },
    ]
    const board = buildTodayBoard(plays, openSlots)
    expect(board.hero?.playerKey).toBe('Ace')
    expect(board.streamers.map((s) => s.playerKey)).toEqual(['Ace', 'Mid'])
    const fills = Object.fromEntries(board.openSlots.map((o) => [o.slot, o.fill?.playerKey ?? null]))
    expect(fills).toEqual({ SP: 'Ace', OF: 'BenchBat' })
  })
  it('dedupes fills across same-position slots (no adding one FA twice; no double-drop)', () => {
    // Two open SP slots + two eligible SP streamers, both whose safe-drop is the same body.
    const plays: ScoredPlay[] = [
      play({ name: 'Sproat', value: 20, kind: 'stream', fillsSlot: 'SP', drop: { playerKey: 'dw', name: 'Devin Williams', reason: 'bottom-tier' } }),
      play({ name: 'Keller', value: 15, kind: 'stream', fillsSlot: 'SP', drop: { playerKey: 'dw', name: 'Devin Williams', reason: 'bottom-tier' } }),
    ]
    const openSlots: OpenSlot[] = [
      { slot: 'SP', reason: 'empty' },
      { slot: 'SP', reason: 'empty' },
    ]
    const board = buildTodayBoard(plays, openSlots)
    // Distinct players fill the two slots — never the same FA twice.
    expect(board.openSlots.map((o) => o.fill?.playerKey)).toEqual(['Sproat', 'Keller'])
    // First slot cuts the body; second can't cut the same one → no-clean-drop, not a double-drop.
    expect(board.openSlots[0].fill?.drop?.name).toBe('Devin Williams')
    expect(board.openSlots[1].fill?.drop).toBeUndefined()
    expect(board.openSlots[1].fill?.noCleanDrop).toBe(true)
  })
  it('empty inputs → all empty, hero null', () => {
    const b = buildTodayBoard([], [])
    expect(b).toEqual({ hero: null, openSlots: [], streamers: [], upgrades: [], sitAlerts: [] })
  })
  it('sorts by normalized score (not raw value) and carries drop / helpsCats fields', () => {
    const plays: ScoredPlay[] = [
      play({ name: 'RawBig', value: 99, score: 30, kind: 'stream', helpsCats: ['K'] }),
      play({ name: 'ScoreBig', value: 5, score: 90, kind: 'stream', drop: { playerKey: 'd', name: 'Cut Me', reason: 'off-day' } }),
    ]
    const board = buildTodayBoard(plays, [])
    expect(board.hero?.playerKey).toBe('ScoreBig') // score 90 beats score 30 despite lower raw value
    expect(board.streamers.map((s) => s.playerKey)).toEqual(['ScoreBig', 'RawBig'])
    expect(board.hero?.drop?.name).toBe('Cut Me')
    expect(board.streamers[1].helpsCats).toEqual(['K'])
  })

  // BUG 4: "Upgrade today" was an unbounded dump — every bench/FA hitter who merely played
  // today, regardless of whether they'd actually improve the active lineup.
  describe('upgrades gate (BUG 4)', () => {
    const hitPlay = (name: string, value: number, position = 'OF') =>
      play({ name, value, score: value, kind: 'add', side: 'hit', position, bucket: 4 })

    it('excludes a non-stream play that does not beat any active starter at a compatible position', () => {
      const plays = [hitPlay('MerelyPlays', 5)]
      const activeLineup: LineupValue[] = [{ playerKey: 'Starter', position: 'OF', value: 8 }]
      const board = buildTodayBoard(plays, [], activeLineup)
      expect(board.upgrades).toEqual([])
    })

    it('includes a non-stream play that genuinely beats a compatible-position starter', () => {
      const plays = [hitPlay('GenuineUpgrade', 15)]
      const activeLineup: LineupValue[] = [{ playerKey: 'Starter', position: 'OF', value: 8 }]
      const board = buildTodayBoard(plays, [], activeLineup)
      expect(board.upgrades.map((p) => p.playerKey)).toEqual(['GenuineUpgrade'])
    })

    it('ignores a "beat" at an incompatible position', () => {
      const plays = [hitPlay('WrongPosition', 20, 'C')]
      const activeLineup: LineupValue[] = [{ playerKey: 'Starter', position: 'OF', value: 8 }]
      const board = buildTodayBoard(plays, [], activeLineup)
      expect(board.upgrades).toEqual([])
    })

    it('caps the list at 6 even when many plays clear the bar', () => {
      const plays = Array.from({ length: 12 }, (_, i) => hitPlay(`Up${i}`, 20 - i))
      const activeLineup: LineupValue[] = [{ playerKey: 'Starter', position: 'OF', value: 1 }]
      const board = buildTodayBoard(plays, [], activeLineup)
      expect(board.upgrades.length).toBe(6)
      // highest-scored plays win the cap
      expect(board.upgrades.map((p) => p.playerKey)).toEqual(['Up0', 'Up1', 'Up2', 'Up3', 'Up4', 'Up5'])
    })

    it('defaults to no active-lineup data → no upgrades surface (conservative)', () => {
      const plays = [hitPlay('NoLineupData', 50)]
      expect(buildTodayBoard(plays, []).upgrades).toEqual([])
    })
  })

  // BUG 6: a play whose rest-of-season value is bottom-tier (a DROP? candidate everywhere else
  // in the app) must never surface as the hero or an "upgrade" — only streams (disposable by
  // design) are exempt from the dropCandidate gate.
  describe('dropCandidate gate (BUG 6)', () => {
    it('hero skips a top-scored dropCandidate non-stream play in favor of the next best', () => {
      const plays: ScoredPlay[] = [
        play({ name: 'Goldschmidt', value: 99, score: 100, kind: 'startSit', side: 'hit', position: 'OF', dropCandidate: true }),
        play({ name: 'RealHero', value: 20, score: 60, kind: 'stream', side: 'pit' }),
      ]
      const board = buildTodayBoard(plays, [])
      expect(board.hero?.playerKey).toBe('RealHero')
    })

    it('falls back to a dropCandidate play as hero only when nothing else is eligible', () => {
      const plays: ScoredPlay[] = [
        play({ name: 'OnlyOption', value: 99, score: 100, kind: 'startSit', side: 'hit', dropCandidate: true }),
      ]
      const board = buildTodayBoard(plays, [])
      expect(board.hero?.playerKey).toBe('OnlyOption')
    })

    it('a dropCandidate is excluded from upgrades even if it would otherwise beat a starter', () => {
      const plays: ScoredPlay[] = [
        play({ name: 'Goldschmidt', value: 99, score: 100, kind: 'startSit', side: 'hit', position: 'OF', dropCandidate: true }),
      ]
      const activeLineup: LineupValue[] = [{ playerKey: 'Starter', position: 'OF', value: 8 }]
      const board = buildTodayBoard(plays, [], activeLineup)
      expect(board.upgrades).toEqual([])
    })

    it('a stream is never excluded by dropCandidate (disposable by design)', () => {
      const plays: ScoredPlay[] = [
        play({ name: 'CheapStream', value: 5, score: 5, kind: 'stream', side: 'pit', dropCandidate: true }),
      ]
      const board = buildTodayBoard(plays, [])
      expect(board.hero?.playerKey).toBe('CheapStream')
      expect(board.streamers.map((p) => p.playerKey)).toEqual(['CheapStream'])
    })
  })
})

describe('positionsOverlap', () => {
  it('true when eligibility strings share a token', () => {
    expect(positionsOverlap('1B,OF', 'OF')).toBe(true)
    expect(positionsOverlap('OF', '1B/OF')).toBe(true)
  })
  it('false when they share nothing', () => {
    expect(positionsOverlap('C', 'OF')).toBe(false)
  })
})
