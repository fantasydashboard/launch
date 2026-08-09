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

const SETS_KEY = 'ufd:rankingSets'
const ACTIVE_KEY = 'ufd:activeRankingByKind'

// Superseded keys, migrated on first load so existing uploads survive.
const OLD_SETS = 'ufd:draftRoom:rankingSets'
const OLD_ACTIVE = 'ufd:draftRoom:activeRankingId'
const LEGACY_TEXT = 'ufd:draftRoom:analystRankings'
const LEGACY_LABEL = 'ufd:draftRoom:analystLabel'
const LEGACY_UPDATED = 'ufd:draftRoom:analystUpdated'
const LEGACY_ON = 'ufd:draftRoom:analystRankingsOn'

/**
 * What a list is FOR. Draft ranks and Week 6 ranks are different lists that go
 * stale on completely different clocks, so a set has to declare which it is
 * rather than being applied wherever it happens to be selected.
 */
export type RankingKind = 'draft' | 'ros' | 'week'

export const KIND_LABELS: Record<RankingKind, string> = {
  draft: 'Draft rankings',
  ros: 'Rest of season rankings',
  week: "This week's rankings",
}

/** How long before a list of this kind is probably out of date. */
export const KIND_STALE_DAYS: Record<RankingKind, number> = {
  draft: 14,
  ros: 10,
  week: 4,
}

export interface RankingSet {
  id: string
  name: string
  text: string
  updatedAt: string
  kind: RankingKind
}

/** Sentinel for "use our own numbers". */
export const UFD = ''
/** What we call our own rankings wherever a source is named. */
export const UFD_LABEL = 'UFD'

const read = (k: string, d = '') => {
  try { return localStorage.getItem(k) ?? d } catch { return d }
}
const write = (k: string, v: string) => {
  try { localStorage.setItem(k, v) } catch { /* private mode */ }
}
const drop = (k: string) => {
  try { localStorage.removeItem(k) } catch { /* private mode */ }
}

const isKind = (v: unknown): v is RankingKind => v === 'draft' || v === 'ros' || v === 'week'

function loadSets(): RankingSet[] {
  const coerce = (arr: any[]): RankingSet[] =>
    arr
      .filter((s) => s?.id && typeof s.text === 'string')
      // Anything stored before kinds existed was a draft list.
      .map((s) => ({ ...s, kind: isKind(s.kind) ? s.kind : ('draft' as RankingKind) }))

  for (const key of [SETS_KEY, OLD_SETS]) {
    try {
      const raw = read(key)
      if (!raw) continue
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        const sets = coerce(parsed)
        if (key !== SETS_KEY) { write(SETS_KEY, JSON.stringify(sets)); drop(OLD_SETS) }
        return sets
      }
    } catch { /* corrupt entry — try the next source */ }
  }

  // The original single-list format.
  const legacy = read(LEGACY_TEXT)
  if (legacy) {
    const one: RankingSet = {
      id: 'legacy',
      name: read(LEGACY_LABEL, 'Analyst') || 'Analyst',
      text: legacy,
      updatedAt: read(LEGACY_UPDATED) || new Date().toISOString(),
      kind: 'draft',
    }
    write(SETS_KEY, JSON.stringify([one]))
    if (read(LEGACY_ON) === '1') write(ACTIVE_KEY, JSON.stringify({ draft: one.id }))
    for (const k of [LEGACY_TEXT, LEGACY_LABEL, LEGACY_UPDATED, LEGACY_ON]) drop(k)
    return [one]
  }
  return []
}

function loadActive(): Record<RankingKind, string> {
  const base: Record<RankingKind, string> = { draft: UFD, ros: UFD, week: UFD }
  try {
    const raw = read(ACTIVE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        for (const k of ['draft', 'ros', 'week'] as RankingKind[]) {
          if (typeof parsed[k] === 'string') base[k] = parsed[k]
        }
        return base
      }
    }
  } catch { /* fall through */ }
  // A single active id from before kinds existed was a draft selection.
  const old = read(OLD_ACTIVE)
  if (old) { base.draft = old; drop(OLD_ACTIVE); write(ACTIVE_KEY, JSON.stringify(base)) }
  return base
}

/**
 * Named ranking lists, one active per kind.
 *
 * A user can keep several lists of each kind — two analysts' draft boards, their
 * own weekly ranks — and pick which one drives each surface, or none, meaning
 * UFD's own numbers. Kept client-side: a private override, not a product
 * feature, so it can never reach another account's board.
 *
 * The active list supplies an ORDER, mapped onto our value curve rather than
 * replacing our numbers, so VONA, tiers and survival keep working on points.
 *
 * Pass the kind the calling surface cares about; Settings manages all of them.
 */
export function useCustomRankings(kind: RankingKind = 'draft') {
  const { isAdmin } = useFeatureAccess()

  const sets = ref<RankingSet[]>(loadSets())
  const activeByKind = ref<Record<RankingKind, string>>(loadActive())

  const persistSets = () => write(SETS_KEY, JSON.stringify(sets.value))
  const persistActive = () => write(ACTIVE_KEY, JSON.stringify(activeByKind.value))

  const setsOfKind = computed(() => sets.value.filter((s) => s.kind === kind))
  const activeId = computed(() => activeByKind.value[kind] ?? UFD)
  const activeSet = computed<RankingSet | null>(
    () => sets.value.find((s) => s.id === activeId.value && s.kind === kind) ?? null,
  )

  const parsed = computed<ParsedRanking[]>(() =>
    activeSet.value ? parseRankings(activeSet.value.text) : [],
  )
  const hasRankings = computed(() => parsed.value.length > 0)

  /** Only ever on for an admin, whatever is stored. */
  const enabled = computed(() => isAdmin.value && !!activeSet.value && hasRankings.value)

  /** What a surface should say its order came from. */
  const sourceName = computed(() => (enabled.value ? activeSet.value!.name : UFD_LABEL))

  function setActive(id: string, forKind: RankingKind = kind) {
    const ok = sets.value.some((s) => s.id === id && s.kind === forKind)
    activeByKind.value = { ...activeByKind.value, [forKind]: ok ? id : UFD }
    persistActive()
  }

  function addSet(name: string, text: string, forKind: RankingKind = kind): RankingSet {
    const set: RankingSet = {
      id: `r${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`,
      name: name?.trim() || `${KIND_LABELS[forKind]} ${sets.value.length + 1}`,
      text: text ?? '',
      updatedAt: new Date().toISOString(),
      kind: forKind,
    }
    sets.value = [...sets.value, set]
    persistSets()
    return set
  }

  /** Swap a list's contents while keeping its name, kind and position. */
  function replaceSet(id: string, text: string, name?: string) {
    sets.value = sets.value.map((s) =>
      s.id === id
        ? { ...s, text, name: name?.trim() || s.name, updatedAt: new Date().toISOString() }
        : s,
    )
    persistSets()
  }

  function renameSet(id: string, name: string) {
    sets.value = sets.value.map((s) => (s.id === id ? { ...s, name: name?.trim() || s.name } : s))
    persistSets()
  }

  function deleteSet(id: string) {
    const gone = sets.value.find((s) => s.id === id)
    sets.value = sets.value.filter((s) => s.id !== id)
    persistSets()
    if (gone && activeByKind.value[gone.kind] === id) setActive(UFD, gone.kind)
  }

  /** Upload a file as a new list of a kind, or replace an existing one. */
  async function loadFromFile(
    file: File,
    name?: string,
    replaceId?: string,
    forKind: RankingKind = kind,
  ): Promise<number> {
    const text = await file.text()
    const label = name?.trim() || file.name.replace(/\.[^.]+$/, '')
    if (replaceId) replaceSet(replaceId, text, label)
    else {
      const set = addSet(label, text, forKind)
      setActive(set.id, forKind)
    }
    return parseRankings(text).length
  }

  const ageDaysOf = (iso: string): number | null => {
    const t = Date.parse(iso)
    if (Number.isNaN(t)) return null
    return Math.floor((Date.now() - t) / 86400000)
  }
  const ageDays = computed(() => (activeSet.value ? ageDaysOf(activeSet.value.updatedAt) : null))
  const isStale = computed(() => {
    const d = ageDays.value
    return d !== null && d > KIND_STALE_DAYS[kind]
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
    kind,
    sets,
    setsOfKind,
    activeByKind,
    activeId,
    activeSet,
    parsed,
    hasRankings,
    enabled,
    sourceName,
    ageDays,
    ageDaysOf,
    isStale,
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
