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

const TEXT_KEY = 'ufd:draftRoom:analystRankings'
const ON_KEY = 'ufd:draftRoom:analystRankingsOn'
const LABEL_KEY = 'ufd:draftRoom:analystLabel'

/**
 * An analyst's rankings, for the admin only.
 *
 * Stored locally rather than in the database: this is one person's private
 * override, not a product feature, and keeping it client-side means it can never
 * leak into anyone else's board. The admin gate reads the server-side profile
 * tier, so a normal account never sees the control at all.
 *
 * When enabled, the analyst's ORDER is mapped onto our value curve rather than
 * replacing our numbers — see `applyRankingOrder`. Everything downstream (VONA,
 * tiers, survival) keeps working on points.
 */
export function useCustomRankings() {
  const { isAdmin } = useFeatureAccess()

  const read = (k: string, d = '') => {
    try { return localStorage.getItem(k) ?? d } catch { return d }
  }
  const write = (k: string, v: string) => {
    try { localStorage.setItem(k, v) } catch { /* private mode */ }
  }

  const rawText = ref<string>(read(TEXT_KEY))
  const label = ref<string>(read(LABEL_KEY, 'Analyst'))
  const enabledPref = ref<boolean>(read(ON_KEY) === '1')

  const parsed = computed<ParsedRanking[]>(() => parseRankings(rawText.value))
  const hasRankings = computed(() => parsed.value.length > 0)

  /** Only ever on for an admin, whatever the stored preference says. */
  const enabled = computed(() => isAdmin.value && enabledPref.value && hasRankings.value)

  function setRankings(text: string, name?: string) {
    rawText.value = text ?? ''
    write(TEXT_KEY, rawText.value)
    if (name !== undefined) { label.value = name || 'Analyst'; write(LABEL_KEY, label.value) }
  }

  function clearRankings() {
    rawText.value = ''
    write(TEXT_KEY, '')
    enabledPref.value = false
    write(ON_KEY, '0')
  }

  function setEnabled(on: boolean) {
    enabledPref.value = !!on
    write(ON_KEY, on ? '1' : '0')
  }

  /** Tie the parsed names to a player pool. */
  function match(players: { playerKey: string; name: string; position?: string }[]) {
    return matchRankings(parsed.value, players)
  }

  /** Re-map values onto the analyst's order. Identity when not enabled. */
  function applyTo(
    players: { playerKey: string; name: string; position?: string; value: number }[],
  ): Record<string, number> {
    if (!enabled.value) return {}
    const { rankByKey } = match(players)
    return applyRankingOrder(players, rankByKey)
  }

  /** Diagnostic comparison — always available to an admin, even when toggled off. */
  function compare(
    board: { playerKey: string; name: string; position: string; value: number; adp: number | null }[],
  ): RankingComparison {
    const { rankByKey, unmatched } = match(board)
    return compareRankings(board, rankByKey, unmatched)
  }

  return {
    isAdmin,
    rawText,
    label,
    parsed,
    hasRankings,
    enabled,
    enabledPref,
    setRankings,
    clearRankings,
    setEnabled,
    match,
    applyTo,
    compare,
  }
}
