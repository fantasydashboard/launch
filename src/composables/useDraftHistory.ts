import { computed, ref } from 'vue'
import {
  summarizeHistory, pooledCalibration, upsertRecord, removeRecord, sortByDate,
  type DraftRecord,
} from '@/draft/room/draftHistory'

/**
 * Where finished drafts live.
 *
 * On the device, next to the custom rankings, for the same reason: it is the
 * user's own working data and it should not require an account or a round trip
 * to read on the clock. Moving it to Supabase is a table and a sync — worth
 * doing when these need to follow someone between devices, not before.
 */
const STORAGE_KEY = 'ufd:draftRoom:history'
/** A ceiling so a season of mocks can't fill the origin's storage quota. */
const MAX_RECORDS = 60

function read(): DraftRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? sortByDate(parsed as DraftRecord[]) : []
  } catch {
    // Corrupt or unreadable storage is not worth taking the draft room down for.
    return []
  }
}

function write(records: DraftRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)))
  } catch {
    /* private mode, or quota */
  }
}

export function useDraftHistory() {
  const records = ref<DraftRecord[]>(read())

  /** Drafts of the given kind, or all of them. Mocks and league nights don't mix. */
  const of = (kind?: DraftRecord['kind']) =>
    kind ? records.value.filter((r) => r.kind === kind) : records.value

  function save(record: DraftRecord) {
    if (!record?.draftId) return
    records.value = upsertRecord(records.value, record)
    write(records.value)
  }

  function forget(draftId: string) {
    records.value = removeRecord(records.value, draftId)
    write(records.value)
  }

  function clear() {
    records.value = []
    write([])
  }

  return {
    records: computed(() => records.value),
    leagueDrafts: computed(() => records.value.filter((r) => r.kind === 'league')),
    mockDrafts: computed(() => records.value.filter((r) => r.kind === 'mock')),
    summaryFor: (kind?: DraftRecord['kind']) => summarizeHistory(of(kind)),
    calibrationFor: (kind?: DraftRecord['kind']) => pooledCalibration(of(kind)),
    has: (draftId: string) => records.value.some((r) => r.draftId === draftId),
    save,
    forget,
    clear,
  }
}
