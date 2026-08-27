import { describe, it, expect } from 'vitest'
import {
  acceptPickTap, PICK_TAP_WINDOW_MS, PICK_TAP_RADIUS_PX, type PickTap,
} from '../pickTap'

const at = (x: number | null, y: number | null, t: number): PickTap => ({ x, y, t })

/** A board row is ~44px tall; this is the row directly below the last pick. */
const ROW_PX = 44

describe('acceptPickTap — the accidental double-tap it exists to stop', () => {
  it('drops a second tap in the same spot inside the window', () => {
    // The real failure: the picked row is removed, everything shifts up, and
    // this second click lands on a button now holding a DIFFERENT player.
    expect(acceptPickTap(at(120, 300, 1000), at(120, 300, 1080))).toBe(false)
  })

  it('drops it despite a few pixels of finger jitter', () => {
    expect(acceptPickTap(at(120, 300, 1000), at(124, 306, 1050))).toBe(false)
  })

  it('accepts the same spot once the window has passed', () => {
    expect(acceptPickTap(at(120, 300, 1000), at(120, 300, 1000 + PICK_TAP_WINDOW_MS))).toBe(true)
    expect(acceptPickTap(at(120, 300, 1000), at(120, 300, 5000))).toBe(true)
  })
})

describe('acceptPickTap — the fast deliberate entry it must not eat', () => {
  it('accepts a tap on the very next row, immediately', () => {
    // Somebody transcribing a known pick list works exactly like this. The flat
    // 350ms window that shipped dropped every one of these, silently.
    expect(acceptPickTap(at(120, 300, 1000), at(120, 300 + ROW_PX, 1010))).toBe(true)
  })

  it('accepts a tap on the shared edge between two rows — the worst deliberate case', () => {
    expect(acceptPickTap(at(120, 300, 1000), at(120, 300 + ROW_PX / 2, 1010))).toBe(true)
  })

  it('accepts many rapid picks down the board', () => {
    let prev = at(120, 300, 1000)
    for (let i = 1; i <= 10; i++) {
      const next = at(120, 300 + i * ROW_PX, 1000 + i * 20) // 50 picks/second
      expect(acceptPickTap(prev, next)).toBe(true)
      prev = next
    }
  })

  it('accepts the very first tap, with no previous pick to compare', () => {
    expect(acceptPickTap(null, at(120, 300, 1000))).toBe(true)
    expect(acceptPickTap(undefined, at(120, 300, 1000))).toBe(true)
  })
})

describe('acceptPickTap — the radius boundary', () => {
  it('rejects just inside and accepts just outside', () => {
    const prev = at(0, 0, 1000)
    expect(acceptPickTap(prev, at(0, PICK_TAP_RADIUS_PX - 1, 1010))).toBe(false)
    expect(acceptPickTap(prev, at(0, PICK_TAP_RADIUS_PX + 1, 1010))).toBe(true)
  })

  it('is exclusive at exactly the radius, so the boundary drops', () => {
    expect(acceptPickTap(at(0, 0, 1000), at(0, PICK_TAP_RADIUS_PX, 1010))).toBe(false)
  })

  it('measures diagonally, not per axis', () => {
    // 10px on each axis is under the radius on either axis alone but over it as
    // a distance (14.14) — a per-axis check would have let this through.
    expect(acceptPickTap(at(0, 0, 1000), at(10, 10, 1010))).toBe(true)
    // 9 and 9 is 12.7: inside.
    expect(acceptPickTap(at(0, 0, 1000), at(9, 9, 1010))).toBe(false)
  })
})

describe('acceptPickTap — activations that carry no pointer position', () => {
  it('accepts two keyboard picks in a row, both reporting no coordinates', () => {
    // THE case that must not regress. A keyboard-activated click reports
    // `detail: 0` and `clientX/clientY` of 0,0, so a naive position check would
    // read two Enter presses as one double-tap and make the board unusable
    // without a mouse.
    expect(acceptPickTap(at(null, null, 1000), at(null, null, 1010))).toBe(true)
  })

  it('accepts when only one side has coordinates', () => {
    expect(acceptPickTap(at(120, 300, 1000), at(null, null, 1010))).toBe(true)
    expect(acceptPickTap(at(null, null, 1000), at(120, 300, 1010))).toBe(true)
  })
})

describe('acceptPickTap — defaults open when it cannot prove a repeat', () => {
  it('accepts when the clock runs backwards', () => {
    // An NTP correction mid-draft must not start dropping picks.
    expect(acceptPickTap(at(120, 300, 5000), at(120, 300, 1000))).toBe(true)
  })

  it('honours caller-supplied window and radius', () => {
    expect(acceptPickTap(at(0, 0, 1000), at(0, 0, 1400), 350)).toBe(true)
    expect(acceptPickTap(at(0, 0, 1000), at(0, 0, 1400), 500)).toBe(false)
    expect(acceptPickTap(at(0, 0, 1000), at(0, 30, 1010), 350, 14)).toBe(true)
    expect(acceptPickTap(at(0, 0, 1000), at(0, 30, 1010), 350, 40)).toBe(false)
  })
})
