import { computed, ref, type Ref } from 'vue'
import { useFeatureAccess } from '@/composables/useFeatureAccess'
import {
  parseRankings,
  matchRankings,
  applyRankingOrder,
  compareRankings,
  inferRankingPosition,
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
export type RankingKind = 'draft' | 'ros' | 'week' | 'dynasty'

export const KIND_LABELS: Record<RankingKind, string> = {
  draft: 'Draft rankings',
  ros: 'Rest of season rankings',
  week: "This week's rankings",
  dynasty: 'Dynasty rankings',
}

/** How long before a list of this kind is probably out of date. */
export const KIND_STALE_DAYS: Record<RankingKind, number> = {
  draft: 14,
  ros: 10,
  week: 4,
  /* Dynasty consensus moves over months, not weeks — a list from six weeks ago is still
     broadly the same list, which is not true of any other kind here. */
  dynasty: 45,
}

export interface RankingSet {
  id: string
  name: string
  text: string
  updatedAt: string
  kind: RankingKind
  /**
   * Extra single-position files folded into the same set.
   *
   * Weekly analyst rankings arrive one file per position, and each restarts at rank 1 — so
   * seven files uploaded as seven sets would be seven lists whose #1s all collide, and
   * uploaded as one concatenated list would be worse. A set holds them side by side instead,
   * each tagged with the position read out of its own header, and ranks stay scoped inside a
   * position where they were always meant to live.
   */
  parts?: { position: string; text: string }[]
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

const isKind = (v: unknown): v is RankingKind =>
  v === 'draft' || v === 'ros' || v === 'week' || v === 'dynasty'

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
  const base: Record<RankingKind, string> = { draft: UFD, ros: UFD, week: UFD, dynasty: UFD }
  try {
    const raw = read(ACTIVE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        for (const k of ['draft', 'ros', 'week', 'dynasty'] as RankingKind[]) {
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
/*
 * Module-level, deliberately. Every surface that reads a list and the picker that changes it
 * were each constructing their own refs from localStorage, so choosing a list in the picker
 * did not reach the board beside it until a reload — the write landed, the other instance
 * never re-read it. One store per tab keeps them honest.
 */
const sharedSets = ref<RankingSet[] | null>(null)
const sharedActive = ref<Record<RankingKind, string> | null>(null)

/**
 * Accepts a getter as well as a literal, because one caller's kind CHANGES.
 *
 * RankingPicker takes `kind` as a prop and the Wire flips it between 'ros' and 'dynasty' when
 * you switch the board's clock. Passing `props.kind` captured the string once at setup, so
 * after uploading a dynasty list and switching to Dynasty the dropdown still filtered for
 * rest-of-season lists and offered only UFD — the uploaded list was unreachable, and had it
 * been reachable, setActive would have written the choice against 'ros'. One captured string,
 * both halves broken.
 */
export function useCustomRankings(kindInput: RankingKind | (() => RankingKind) = 'draft') {
  const kindRef = computed<RankingKind>(() =>
    typeof kindInput === 'function' ? kindInput() : kindInput,
  )
  /*
   * Season Pass, not admin.
   *
   * Custom rankings shipped behind `isAdmin`, so the upload flow, the picker and the effect
   * were all invisible to every paying account — someone could add a weekly list and find no
   * way to select it, which is what happened. The rest of this page is already behind the
   * pass; there is no reason for the one control that says whose numbers you are reading to
   * be held back further. Admins keep access because hasFullAccess is set true for them.
   */
  const { isAdmin, hasFullAccess } = useFeatureAccess()
  const canUseRankings = hasFullAccess

  if (sharedSets.value === null) sharedSets.value = loadSets()
  if (sharedActive.value === null) sharedActive.value = loadActive()
  const sets = sharedSets as Ref<RankingSet[]>
  const activeByKind = sharedActive as Ref<Record<RankingKind, string>>

  const persistSets = () => write(SETS_KEY, JSON.stringify(sets.value))
  const persistActive = () => write(ACTIVE_KEY, JSON.stringify(activeByKind.value))

  const setsOfKind = computed(() => sets.value.filter((s) => s.kind === kindRef.value))
  const activeId = computed(() => activeByKind.value[kindRef.value] ?? UFD)
  const activeSet = computed<RankingSet | null>(
    () => sets.value.find((s) => s.id === activeId.value && s.kind === kindRef.value) ?? null,
  )

  const parsed = computed<ParsedRanking[]>(() => {
    const set = activeSet.value
    if (!set) return []
    const base = parseRankings(set.text)
    if (!set.parts?.length) return base
    /* Each part carries its own position, so its rows are stamped with it. Rank stays as the
       file gave it — first at the position, not first overall — and consumers scope the
       ordering per position rather than pretending one global order exists. */
    const extra = set.parts.flatMap((part) =>
      parseRankings(part.text).map((r) => ({ ...r, position: r.position || part.position })),
    )
    /*
     * A part REPLACES its position in the base sheet — it does not merge with it.
     *
     * Parts used to be appended, and matchRankings marks a player used on his first match, so
     * every row in a part was discarded as unmatched and the original sheet won every player
     * it mentioned. Re-uploading a position file stored the new ranking, reported success, and
     * changed nothing. Done twice, it changed nothing twice.
     *
     * Merely reversing the order is not enough: the two rank scales are not comparable. A
     * part is ranked within its position and the base within its own sheet, so a base row left
     * behind at rank 1 ties the part's rank 1 and can win the sort — which is how a tight end
     * the new file never mentions ended up back at the top of it.
     *
     * So the specific statement wins outright. Someone uploading te.csv into a set that
     * already covers tight ends is replacing that opinion, not adding to it, and a player the
     * new file omits simply has no ranking from them — the same as anyone past its last row.
     */
    const covered = new Set(set.parts.map((p) => p.position.toUpperCase()))
    const sheetPos = (inferRankingPosition(set.text) ?? '').toUpperCase()
    const keptBase = base.filter((r) => {
      const pos = (r.position || sheetPos).toUpperCase()
      return !pos || !covered.has(pos)
    })
    return [...extra, ...keptBase]
  })

  /** Positions this set covers with a dedicated file, for the UI to show what is loaded. */
  const partPositions = computed<string[]>(() =>
    (activeSet.value?.parts ?? []).map((p) => p.position),
  )
  const hasRankings = computed(() => parsed.value.length > 0)

  /** Only ever on for an account that holds the pass, whatever is stored. */
  const enabled = computed(() => canUseRankings.value && !!activeSet.value && hasRankings.value)

  /** What a surface should say its order came from. */
  const sourceName = computed(() => (enabled.value ? activeSet.value!.name : UFD_LABEL))

  function setActive(id: string, forKind: RankingKind = kindRef.value) {
    const ok = sets.value.some((s) => s.id === id && s.kind === forKind)
    activeByKind.value = { ...activeByKind.value, [forKind]: ok ? id : UFD }
    persistActive()
  }

  function addSet(name: string, text: string, forKind: RankingKind = kindRef.value): RankingSet {
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

  /**
   * Fold a single-position file into an existing set.
   *
   * Replaces the part when that position is already present, so re-uploading a corrected
   * running-back sheet updates it rather than stacking a second one that silently competes
   * with the first.
   */
  function addPart(id: string, position: string, text: string) {
    const pos = (position || '').toUpperCase().trim()
    if (!pos) return
    sets.value = sets.value.map((s) =>
      s.id === id
        ? {
            ...s,
            updatedAt: new Date().toISOString(),
            parts: [...(s.parts ?? []).filter((p) => p.position !== pos), { position: pos, text }],
          }
        : s,
    )
    persistSets()
  }

  function removePart(id: string, position: string) {
    sets.value = sets.value.map((s) =>
      s.id === id ? { ...s, parts: (s.parts ?? []).filter((p) => p.position !== position) } : s,
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
    forKind: RankingKind = kindRef.value,
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
    return d !== null && d > KIND_STALE_DAYS[kindRef.value]
  })

  function match(players: { playerKey: string; name: string; position?: string }[]) {
    return matchRankings(parsed.value, players)
  }

  /** True when the active list declares its own tiers. */
  const hasOwnTiers = computed(() => parsed.value.some((p) => typeof p.tier === 'number'))

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
    canUseRankings,
    kind: kindRef,
    sets,
    setsOfKind,
    partPositions,
    addPart,
    removePart,
    activeByKind,
    activeId,
    activeSet,
    parsed,
    hasRankings,
    hasOwnTiers,
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
