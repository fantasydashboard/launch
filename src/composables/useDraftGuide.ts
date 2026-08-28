import { computed, ref } from 'vue'

/**
 * A personally-owned draft guide, overlaid on the Draft Room as a second opinion.
 *
 * The guide's own text lives ONLY in this browser's localStorage — it is never committed,
 * never bundled, and never sent anywhere. That is deliberate: these guides are licensed for
 * personal use and reference, not redistribution, so the app ships the *display* and the
 * owner supplies the *content*. Nothing here contains a single line of anyone's guide.
 *
 * It also means the feature is inert for everyone else by construction: with no payload in
 * localStorage there is nothing to render, whatever the UI decides to ask for.
 */

export type GuideVerdict = 'target' | 'avoid' | 'dart'

export interface GuideEntry {
  name: string
  pos: string
  team: string | null
  /** target = draft him, avoid = the market is wrong about him, dart = late-round swing */
  kind: GuideVerdict
  /** the author's own 1-10 confidence in the take, not a player rating */
  confidence: number | null
  page: number
  note: string
}

interface GuidePayload {
  source?: string
  generated?: string
  /** keyed by Sleeper player id, so it joins straight onto the board's own rows */
  players: Record<string, GuideEntry>
}

const STORAGE_KEY = 'ufd:draftRoom:guide'

function read(): GuidePayload | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const players = (parsed as GuidePayload).players
    if (!players || typeof players !== 'object' || Array.isArray(players)) return null
    /* Drop anything malformed rather than letting one bad row throw while the board is
       rendering mid-draft. A missing badge is survivable; a blank Draft Room is not. */
    const clean: Record<string, GuideEntry> = {}
    for (const [key, v] of Object.entries(players)) {
      if (!v || typeof v !== 'object') continue
      const e = v as GuideEntry
      if (e.kind !== 'target' && e.kind !== 'avoid' && e.kind !== 'dart') continue
      if (typeof e.name !== 'string') continue
      clean[String(key)] = {
        name: e.name,
        pos: typeof e.pos === 'string' ? e.pos : '',
        team: typeof e.team === 'string' ? e.team : null,
        kind: e.kind,
        confidence: Number.isFinite(e.confidence as number) ? Number(e.confidence) : null,
        page: Number.isFinite(e.page as number) ? Number(e.page) : 0,
        note: typeof e.note === 'string' ? e.note : '',
      }
    }
    return { source: (parsed as GuidePayload).source, generated: (parsed as GuidePayload).generated, players: clean }
  } catch {
    return null
  }
}

const payload = ref<GuidePayload | null>(read())

export function useDraftGuide() {
  const loaded = computed(() => !!payload.value && Object.keys(payload.value.players).length > 0)
  const sourceName = computed(() => payload.value?.source ?? '')
  const count = computed(() => (payload.value ? Object.keys(payload.value.players).length : 0))

  function entryFor(playerKey: string | undefined | null): GuideEntry | null {
    if (!playerKey || !payload.value) return null
    return payload.value.players[String(playerKey)] ?? null
  }

  /** Replace the stored guide. Returns how many players were accepted. */
  function load(json: string): number {
    localStorage.setItem(STORAGE_KEY, json)
    payload.value = read()
    return count.value
  }

  function clear() {
    localStorage.removeItem(STORAGE_KEY)
    payload.value = null
  }

  return { loaded, sourceName, count, entryFor, load, clear }
}
