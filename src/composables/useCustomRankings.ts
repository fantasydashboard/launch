import { computed, ref } from 'vue'
import { useFeatureAccess } from '@/composables/useFeatureAccess'
import {
  parseRankings,
  matchRankings,
  applyRankingOrder,
  compareRankings,
  type ParsedRanking,
  type RankingComparison,
} from '@/draft/room/customRankings'

const SETS_KEY = 'ufd:draftRoom:rankingSets'
const ACTIVE_KEY = 'ufd:draftRoom:activeRankingId'

// Legacy single-list keys, migrated on first load so an existing upload survives.
const LEGACY_TEXT = 'ufd:draftRoom:analystRankings'
const LEGACY_LABEL = 'ufd:draftRoom:analystLabel'
const LEGACY_UPDATED = 'ufd:draftRoom:analystUpdated'
const LEGACY_ON = 'ufd:draftRoom:analystRankingsOn'

export interface RankingSet {
  id: string
  name: string
  text: string
  updatedAt: string
}

/** Sentinel for "use our own projections". */
export const OUR_PROJECTIONS = ''

const read = (k: string, d = '') => {
  try { return localStorage.getItem(k) ?? d } catch { return d }
}
const write = (k: string, v: string) => {
  try { localStorage.setItem(k, v) } catch { /* private mode */ }
}
const drop = (k: string) => {
  try { localStorage.removeItem(k) } catch { /* private mode */ }
}

function loadSets(): RankingSet[] {
  try {
    const raw = read(SETS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed.filter((s) => s?.id && typeof s.text === 'string')
    }
  } catch { /* corrupt entry — fall through to migration */ }

  // Migrate the single legacy list rather than silently losing someone's upload.
  const legacy = read(LEGACY_TEXT)
  if (legacy) {
    const one: RankingSet = {
      id: 'legacy',
      name: read(LEGACY_LABEL, 'Analyst') || 'Analyst',
      text: legacy,
      updatedAt: read(LEGACY_UPDATED) || new Date().toISOString(),
    }
    write(SETS_KEY, JSON.stringify([one]))
    if (read(LEGACY_ON) === '1') write(ACTIVE_KEY, one.id)
    for (const k of [LEGACY_TEXT, LEGACY_LABEL, LEGACY_UPDATED, LEGACY_ON]) drop(k)
    return [one]
  }
  return []
}

/**
 * Named ranking lists, for the admin only.
 *
 * Several lists can be stored and switched between — an analyst's, your own, a
 * dynasty list — with exactly one active at a time, or none, meaning our own
 * projections. Kept client-side: this is a private override, not a product
 * feature, so it can never leak into another account's board.
 *
 * The active list supplies an ORDER, which is mapped onto our value curve rather
 * than replacing our numbers, so VONA, tiers and survival keep working on points.
 */
export function useCustomRankings() {
  const { isAdmin } = useFeatureAccess()

  const sets = ref<RankingSet[]>(loadSets())
  const activeId = ref<string>(read(ACTIVE_KEY, OUR_PROJECTIONS))

  const persist = () => write(SETS_KEY, JSON.stringify(sets.value))

  const activeSet = computed<RankingSet | null>(
    () => sets.value.find((s) => s.id === activeId.value) ?? null,
  )

  const parsed = computed<ParsedRanking[]>(() =>
    activeSet.value ? parseRankings(activeSet.value.text) : [],
  )
  const hasRankings = computed(() => parsed.value.length > 0)

  /** Only ever on for an admin, whatever is stored. */
  const enabled = computed(() => isAdmin.value && !!activeSet.value && hasRankings.value)

  /** What the board should say its order came from. */
  const sourceName = computed(() => (enabled.value ? activeSet.value!.name : 'our projections'))

  function setActive(id: string) {
    activeId.value = sets.value.some((s) => s.id === id) ? id : OUR_PROJECTIONS
    write(ACTIVE_KEY, activeId.value)
  }

  function addSet(name: string, text: string): RankingSet {
    const set: RankingSet = {
      id: `r${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`,
      name: name?.trim() || `List ${sets.value.length + 1}`,
      text: text ?? '',
      updatedAt: new Date().toISOString(),
    }
    sets.value = [...sets.value, set]
    persist()
    return set
  }

  function replaceSet(id: string, text: string, name?: string) {
    sets.value = sets.value.map((s) =>
      s.id === id
        ? { ...s, text, name: name?.trim() || s.name, updatedAt: new Date().toISOString() }
        : s,
    )
    persist()
  }

  function renameSet(id: string, name: string) {
    sets.value = sets.value.map((s) => (s.id === id ? { ...s, name: name?.trim() || s.name } : s))
    persist()
  }

  function deleteSet(id: string) {
    sets.value = sets.value.filter((s) => s.id !== id)
    persist()
    if (activeId.value === id) setActive(OUR_PROJECTIONS)
  }

  /** Upload a file as a new named list, or replace an existing one. */
  async function loadFromFile(file: File, name?: string, replaceId?: string): Promise<number> {
    const text = await file.text()
    const label = name?.trim() || file.name.replace(/\.[^.]+$/, '')
    if (replaceId) replaceSet(replaceId, text, label)
    else {
      const set = addSet(label, text)
      setActive(set.id)
    }
    return parseRankings(text).length
  }

  /** Days since the active list was last replaced, or null. */
  const ageDays = computed(() => {
    const t = activeSet.value ? Date.parse(activeSet.value.updatedAt) : NaN
    if (Number.isNaN(t)) return null
    return Math.floor((Date.now() - t) / 86400000)
  })

  function match(players: { playerKey: string; name: string; position?: string }[]) {
    return matchRankings(parsed.value, players)
  }

  /** Re-map values onto the active list's order. Identity when none is active. */
  function applyTo(
    players: { playerKey: string; name: string; position?: string; value: number }[],
  ): Record<string, number> {
    if (!enabled.value) return {}
    const { rankByKey } = match(players)
    return applyRankingOrder(players, rankByKey)
  }

  /** Diagnostic comparison for the active list. Available even when not applied. */
  function compare(
    board: { playerKey: string; name: string; position: string; value: number; adp: number | null }[],
  ): RankingComparison {
    const { rankByKey, unmatched, ambiguous } = match(board)
    return compareRankings(board, rankByKey, unmatched, ambiguous)
  }

  return {
    isAdmin,
    sets,
    activeId,
    activeSet,
    parsed,
    hasRankings,
    enabled,
    sourceName,
    ageDays,
    setActive,
    addSet,
    replaceSet,
    renameSet,
    deleteSet,
    loadFromFile,
    match,
    applyTo,
    compare,
  }
}
