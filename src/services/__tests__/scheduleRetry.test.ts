import { describe, it, expect, vi } from 'vitest'
import { readSlateWithRetry } from '../scheduleRetry'

const noSleep = () => Promise.resolve()

describe('readSlateWithRetry', () => {
  it('reads once when the first read works', async () => {
    const read = vi.fn().mockResolvedValue({ failed: false, n: 1 })
    expect(await readSlateWithRetry(read, [1, 1], noSleep)).toEqual({ failed: false, n: 1 })
    expect(read).toHaveBeenCalledTimes(1)
  })

  it('retries a failed read and returns the first good one', async () => {
    const read = vi.fn()
      .mockResolvedValueOnce({ failed: true })
      .mockResolvedValueOnce({ failed: false, n: 5 })
    expect(await readSlateWithRetry(read, [1, 1], noSleep)).toEqual({ failed: false, n: 5 })
    expect(read).toHaveBeenCalledTimes(2)
  })

  it('gives up after the last retry and returns the failure', async () => {
    const read = vi.fn().mockResolvedValue({ failed: true })
    expect(await readSlateWithRetry(read, [1, 1], noSleep)).toEqual({ failed: true })
    expect(read).toHaveBeenCalledTimes(3)
  })
})
