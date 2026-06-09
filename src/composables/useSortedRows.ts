import { computed, ref, type Ref } from 'vue'

export type SortDir = 'asc' | 'desc'

export function useSortedRows<T>(rows: Ref<T[]>, accessor: (row: T) => Record<string, number | string>) {
  const sortKey = ref<string | null>(null)
  const sortDir = ref<SortDir>('desc')

  function sortBy(key: string) {
    if (sortKey.value === key) {
      sortDir.value = sortDir.value === 'desc' ? 'asc' : 'desc'
    } else {
      sortKey.value = key
      sortDir.value = 'desc'
    }
  }

  const sorted = computed<T[]>(() => {
    if (!sortKey.value) return rows.value
    const key = sortKey.value
    const dir = sortDir.value === 'asc' ? 1 : -1
    return [...rows.value].sort((a, b) => {
      const av = accessor(a)[key]
      const bv = accessor(b)[key]
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
      return String(av).localeCompare(String(bv)) * dir
    })
  })

  return { sorted, sortBy, sortKey, sortDir }
}
