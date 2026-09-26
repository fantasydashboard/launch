import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * ESPN's draft socket, pinned to what it actually sent.
 *
 * The parser itself lives in extension/content-draft.js, which cannot be imported here — an
 * extension content script has no module system and runs in a browser with chrome.* globals.
 * So the REGEX is duplicated, deliberately and visibly, and this test exists to make that
 * duplication safe: if the two ever disagree, this fails.
 *
 * What it protects is the thing that took a live mock draft to learn. ESPN opens two sockets
 * and only one carries picks; the payload is a line protocol rather than JSON; and the only
 * line that means "drafted" is SELECTED. AUTOSUGGEST looks exactly like a pick and is not one
 * — it is what the client would choose for you, and counting it crosses off a player who is
 * still on the board.
 */
const SELECTED = /^SELECTED\s+(\d+)\s+(\d+)(?:\s+(\d+))?/

const parse = (data: string) => data.split('\n').flatMap((line) => {
  const m = SELECTED.exec(line.trim())
  return m ? [{ playerKey: m[2], byTeam: m[1], pickNumber: m[3] ? Number(m[3]) : undefined }] : []
})

const CAPTURE = readFileSync('extension/fixtures/espn-draft-socket.txt', 'utf8')
  .split('\n').filter((l) => l && !l.startsWith('#')).join('\n')

describe('the ESPN draft socket, as captured', () => {
  it('reads every SELECTED line as a pick, in order', () => {
    expect(parse(CAPTURE)).toEqual([
      { playerKey: '4233875', byTeam: '5', pickNumber: 1 },
      { playerKey: '3899937', byTeam: '6', pickNumber: 2 },
      { playerKey: '4697393', byTeam: '7', pickNumber: 3 },
    ])
  })

  /* The one that matters. AUTOSUGGEST carries a player id in the same shape and is a
     suggestion the user may never take. */
  it('never counts AUTOSUGGEST as a pick', () => {
    expect(parse('AUTOSUGGEST 3041969').length).toBe(0)
    expect(parse(CAPTURE).some((p) => p.playerKey === '3041969')).toBe(false)
  })

  it('ignores the clock, the heartbeat and the state blob', () => {
    expect(parse('CLOCK 6 29749 6\nPONG PING%1790386431623\nSELECTING 5 30000\nINIT abc')).toEqual([])
  })

  /* A partial frame must not half-parse into a pick with a missing player. */
  it('ignores a truncated SELECTED line', () => {
    expect(parse('SELECTED 5')).toEqual([])
    expect(parse('SELECTED')).toEqual([])
  })

  /* Several picks can arrive in one frame when the socket batches or a client reconnects. */
  it('reads several picks from a single frame', () => {
    expect(parse('SELECTED 1 111 1\nSELECTED 2 222 2')).toHaveLength(2)
  })
})
