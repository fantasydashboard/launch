import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useSortedRows } from '@/composables/useSortedRows'

describe('useSortedRows', () => {
  it('sorts by a key and toggles direction', () => {
    const rows = ref([{ name: 'b', v: 2 }, { name: 'a', v: 3 }, { name: 'c', v: 1 }])
    const { sorted, sortBy, sortKey, sortDir } = useSortedRows(rows, (r) => r as any)

    sortBy('v')
    expect(sortKey.value).toBe('v')
    expect(sortDir.value).toBe('desc')
    expect(sorted.value.map((r) => r.v)).toEqual([3, 2, 1])

    sortBy('v')
    expect(sortDir.value).toBe('asc')
    expect(sorted.value.map((r) => r.v)).toEqual([1, 2, 3])
  })

  it('returns rows unchanged when no sort key is set', () => {
    const rows = ref([{ v: 2 }, { v: 1 }])
    const { sorted } = useSortedRows(rows, (r) => r as any)
    expect(sorted.value.map((r) => r.v)).toEqual([2, 1])
  })
})
