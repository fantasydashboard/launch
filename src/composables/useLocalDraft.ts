import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import {
  blankLocalDraft, addLocalPick, undoLocalPick, type LocalDraft,
} from '@/draft/room/localDraft'

/**
 * Where a local draft lives.
 *
 * Keyed per league, and on the device, next to the custom rankings and the draft
 * history. The one property that matters more than any other: a draft in progress
 * must survive a refresh. Somebody mid-rehearsal who reloads the page and loses
 * nine rounds of picks will not start a tenth.
 */
export const localDraftKey = (leagueId: string) => `ufd:localDraft:${leagueId}`

type StartConfig = Omit<LocalDraft, 'picks' | 'startedAt' | 'updatedAt'>

function read(leagueId: string | null): LocalDraft | null {
  if (!leagueId) return null
  try {
    const raw = localStorage.getItem(localDraftKey(leagueId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as LocalDraft
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.picks)) return null
    /* The key is already per league, so a mismatch here means the payload was
       tampered with or hand-edited. Seating one league's rosters in another
       league's draft is exactly the confident-wrong-person failure this room
       has been burned by; refuse it instead. */
    if (String(parsed.leagueId) !== String(leagueId)) return null

    /* Validate draft shape fields to prevent downstream crashes.
       A pick with null or missing required fields will crash localSleeperPicks;
       garbage teams/rounds/type/slotToRosterId causes silent computation failures
       where picks get attributed to the wrong managers. Partially valid drafts are
       not salvageable — reject them unconditionally.

       Number.isFinite() is essential: JSON.parse('1e400') yields Infinity, which
       passes typeof checks but silently corrupts slot assignment. Large finite
       rounds (e.g. 1e15) cause hangs in loops like `for (p = ...; p <= teams * rounds; p++)`.
       A real draft has at most ~20 teams and ~20 rounds; 1000 of either is corrupt. */
    if (!Number.isFinite(parsed.teams) || parsed.teams < 1 || parsed.teams > 1000) return null
    if (!Number.isFinite(parsed.rounds) || parsed.rounds < 1 || parsed.rounds > 1000) return null
    if (parsed.type !== 'snake' && parsed.type !== 'linear') return null
    if (!parsed.slotToRosterId || typeof parsed.slotToRosterId !== 'object') return null
    if (!Number.isFinite(parsed.mySlot)) return null

    /* Validate every pick: must be an object with numeric overall and string playerKey */
    for (const pick of parsed.picks) {
      if (!pick || typeof pick !== 'object' || typeof pick.overall !== 'number' || typeof pick.playerKey !== 'string') {
        return null
      }
    }

    return parsed
  } catch {
    return null   /* corrupt storage must never take the draft room down */
  }
}

function write(leagueId: string | null, d: LocalDraft | null) {
  if (!leagueId) return
  try {
    if (d) localStorage.setItem(localDraftKey(leagueId), JSON.stringify(d))
    else localStorage.removeItem(localDraftKey(leagueId))
  } catch {
    /* private mode: the session still works, it just will not survive a reload */
  }
}

export function useLocalDraft(leagueId: Ref<string | null> | ComputedRef<string | null>) {
  const current = ref<LocalDraft | null>(read(leagueId.value))

  watch(leagueId, (id) => { current.value = read(id) })

  const commit = (d: LocalDraft | null) => {
    /* Honor the same-reference contract from addLocalPick and undoLocalPick: they
       return the same reference when nothing happened (draft full or empty), so a
       caller that persists on change does not write no-ops. */
    if (d === current.value) return
    current.value = d
    write(leagueId.value, d)
  }

  return {
    draft: computed(() => current.value),
    isActive: computed(() => current.value !== null),

    start(config: StartConfig) {
      if (!leagueId.value) return
      commit(blankLocalDraft({ ...config, leagueId: String(leagueId.value) }, new Date().toISOString()))
    },

    pick(player: { playerKey: string; name: string; position: string; proTeam: string }) {
      if (!current.value) return
      commit(addLocalPick(current.value, player, new Date().toISOString()))
    },

    undo() {
      if (!current.value) return
      commit(undoLocalPick(current.value, new Date().toISOString()))
    },

    discard() { commit(null) },
  }
}
