import { describe, it, expect } from 'vitest'
import {
  normalizePickName, indexBoard, matchPick, matchPicks,
  type BoardPlayer, type RawPick,
} from '../extensionPicks'

const P = (playerKey: string, name: string, position: string, team?: string): BoardPlayer =>
  ({ playerKey, name, position, team })

const BOARD: BoardPlayer[] = [
  P('1', 'Connor McDavid', 'C', 'EDM'),
  P('2', 'Nathan MacKinnon', 'C', 'COL'),
  P('3', 'Tim Stützle', 'C', 'OTT'),
  P('4', 'Kenneth Walker III', 'RB', 'SEA'),
  P('5', 'Elias Pettersson', 'C', 'VAN'),
  P('6', 'Elias Pettersson', 'D', 'VAN'),
  P('7', 'Josh Allen', 'QB', 'BUF'),
  P('8', 'Josh Allen', 'LB', 'JAX'),
]

const pick = (playerName: string, over: Partial<RawPick> = {}): RawPick => ({ playerName, ...over })
const match = (p: RawPick) => matchPick(p, indexBoard(BOARD))

describe('normalizePickName', () => {
  it('strips what two sources spell differently', () => {
    expect(normalizePickName('Tim Stützle')).toBe('tim stutzle')
    expect(normalizePickName("T.J. Oshie")).toBe('tj oshie')
    expect(normalizePickName('Kenneth Walker III')).toBe('kenneth walker')
    expect(normalizePickName('  Connor   McDavid ')).toBe('connor mcdavid')
  })

  /* It must not collapse two different men into one key — that is the failure this whole file
     exists to avoid, and a normalizer is where it would happen first. */
  it('keeps different players different', () => {
    expect(normalizePickName('Connor McDavid')).not.toBe(normalizePickName('Connor McMichael'))
    expect(normalizePickName('Josh Allen')).not.toBe(normalizePickName('Keenan Allen'))
  })
})

describe('matching a pick to the board', () => {
  it('matches a plain full name', () => {
    expect(match(pick('Connor McDavid'))).toMatchObject({ status: 'matched', playerKey: '1' })
  })

  it('matches across an accent the draft room does not use', () => {
    expect(match(pick('Tim Stutzle'))).toMatchObject({ status: 'matched', playerKey: '3' })
  })

  it('matches a suffix one source carries and the other does not', () => {
    expect(match(pick('Kenneth Walker'))).toMatchObject({ status: 'matched', playerKey: '4' })
  })

  /*
   * Draft rooms abbreviate, and a room that does it does it for every pick — so this is the
   * normal case, not an edge one.
   */
  it('matches an initialled first name', () => {
    expect(match(pick('C. McDavid'))).toMatchObject({ status: 'matched', playerKey: '1' })
    expect(match(pick('N. MacKinnon'))).toMatchObject({ status: 'matched', playerKey: '2' })
  })

  /* The initial is only ever allowed to find people who already share the surname. Without
     that, an abbreviation becomes a fuzzy search and starts crediting picks to strangers. */
  it('does not let an initial reach a different surname', () => {
    expect(match(pick('C. McMichael'))).toMatchObject({ status: 'unknown' })
  })

  it('reports a name the board has never heard of', () => {
    expect(match(pick('Somebody Nobody'))).toMatchObject({ status: 'unknown' })
  })
})

describe('two players, one name', () => {
  /* The real pair: a centre and a defenceman, both Elias Pettersson, both Vancouver. Position
     is the only thing that separates them, which is exactly why the adapter carries it. */
  it('separates them on position when the room gives one', () => {
    expect(match(pick('Elias Pettersson', { position: 'C' })))
      .toMatchObject({ status: 'matched', playerKey: '5' })
    expect(match(pick('Elias Pettersson', { position: 'D' })))
      .toMatchObject({ status: 'matched', playerKey: '6' })
  })

  it('separates on team when position does not', () => {
    expect(match(pick('Josh Allen', { team: 'JAX' })))
      .toMatchObject({ status: 'matched', playerKey: '8' })
  })

  /*
   * THE RULE. When nothing separates them the answer is "I do not know", never a guess. A pick
   * credited to the wrong player leaves the board ranking a man who is gone, at the top of the
   * list, with a number beside him — and nothing on screen says anything is wrong.
   */
  it('refuses to guess when nothing separates them', () => {
    const r = match(pick('Elias Pettersson'))
    expect(r.status).toBe('ambiguous')
    expect((r as any).candidates.sort()).toEqual(['5', '6'])
  })

  it('refuses when the position given fits neither', () => {
    const r = match(pick('Elias Pettersson', { position: 'G' }))
    expect(r.status).toBe('ambiguous')
  })
})

describe('a draft\'s worth of picks', () => {
  it('returns the keys in the order they were taken', () => {
    const { keys } = matchPicks(
      [pick('Nathan MacKinnon'), pick('Connor McDavid'), pick('Tim Stutzle')], BOARD,
    )
    expect(keys).toEqual(['2', '1', '3'])
  })

  /*
   * A socket replays, a reconnect resends its backlog, and the DOM fallback re-reads rows it
   * has already seen. Crossing a player off twice is harmless; letting the COUNT drift is not,
   * because the count is what the status line reports and what the user decides to trust.
   */
  it('counts a repeated pick once', () => {
    const { keys } = matchPicks(
      [pick('Connor McDavid'), pick('C. McDavid'), pick('Connor McDavid')], BOARD,
    )
    expect(keys).toEqual(['1'])
  })

  it('hands back everything it could not resolve rather than dropping it', () => {
    const { keys, unresolved } = matchPicks(
      [pick('Connor McDavid'), pick('Elias Pettersson'), pick('Nobody At All')], BOARD,
    )
    expect(keys).toEqual(['1'])
    expect(unresolved.map((u) => u.status).sort()).toEqual(['ambiguous', 'unknown'])
    /* The pick itself travels with the failure, so a surface can name who it could not place. */
    expect(unresolved.every((u) => !!u.pick.playerName)).toBe(true)
  })

  it('survives an empty draft and an empty board', () => {
    expect(matchPicks([], BOARD).keys).toEqual([])
    expect(matchPicks([pick('Connor McDavid')], []).unresolved).toHaveLength(1)
  })
})
