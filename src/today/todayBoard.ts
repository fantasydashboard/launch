/**
 * Pure reducer: organize already-scored daily plays + detected open slots into the Today
 * board view-model. Selection only — the composable does the fetching/scoring. Deterministic.
 */
import type { OpenSlot } from './openSlots'
import type { SafeDrop } from './safeDrop'

export type PlayKind = 'stream' | 'add' | 'startSit'

export interface ScoredPlay {
  kind: PlayKind
  playerKey: string
  name: string
  team: string
  position: string
  headshot?: string // player headshot URL, when known (roster/free-agent pool lookup by playerKey)
  side: 'hit' | 'pit'
  value: number // raw within-side single-game value (park/SP-adjusted)
  score: number // 0..100 normalized (percentile within side) — the number the UI shows and sorts by
  barPct?: number // 0..100 bar fill; when unset the view falls back to `score` (category)
  budgetTag?: 'worth-add' | 'save-add' | 'worth-bid' // set by annotateAddBudget for FA add-moves
  bucket: number // 0..6 matchup bar (legacy; the view now bars off `score`)
  detail: string // e.g. "vs COL"
  oneDay: boolean // pure stream / one-day play → "drop tomorrow"
  fillsSlot?: string // the open slot this play is eligible to fill, if any
  helpsCats: string[] // category labels this move helps (positive addDelta), for chips
  drop?: SafeDrop // the safe body to cut for this free-agent add (stream/add only)
  noCleanDrop?: boolean // an FA add with no expendable body to cut → "no clean drop"
  dropCandidate?: boolean // non-stream play whose rest-of-season value is at/below the wire's
  // replacement level for its side — a body the rest of the app would flag to DROP, not start.
  // Never presented as the hero or an "upgrade" (streams are exempt: disposable by design).
}

export interface FilledSlot extends OpenSlot {
  fill?: ScoredPlay // best play to plug this slot (bench-first handled upstream via value/kind)
}

export interface TodayBoard {
  hero: ScoredPlay | null
  openSlots: FilledSlot[]
  streamers: ScoredPlay[]
  upgrades: ScoredPlay[]
  sitAlerts: ScoredPlay[]
}

/** A currently-active starter's today value, in the same units as ScoredPlay.value — the bar
 * an "upgrade" must clear at a compatible position. Supplied by the composable (it alone knows
 * the live lineup); todayBoard.ts stays pure by taking this as plain data. */
export interface LineupValue {
  playerKey: string
  position: string
  value: number
}

const MAX_UPGRADES = 6

/** Whether two position-eligibility strings ("1B,OF" / "OF/UTIL") share any token. */
export function positionsOverlap(a: string, b: string): boolean {
  const ta = new Set((a || '').split(/[,/|]/).map((t) => t.trim().toUpperCase()).filter(Boolean))
  return (b || '')
    .split(/[,/|]/)
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean)
    .some((t) => ta.has(t))
}

export function buildTodayBoard(
  plays: ScoredPlay[],
  openSlots: OpenSlot[],
  activeLineup: LineupValue[] = [],
): TodayBoard {
  const byValue = [...plays].sort((a, b) => b.score - a.score)

  // Each open slot gets the highest-value ELIGIBLE, NOT-YET-CLAIMED play — so two
  // same-position slots (e.g. two open SP) don't both suggest adding the same free
  // agent, and no body is cut twice. When an add's safe-drop is already spoken for by
  // an earlier slot, present it as no-clean-drop rather than double-dropping one body.
  const usedFillKeys = new Set<string>()
  const usedDropKeys = new Set<string>()
  const filled: FilledSlot[] = openSlots.map((slot) => {
    const play = byValue.find((p) => p.fillsSlot === slot.slot && !usedFillKeys.has(p.playerKey))
    if (!play) return { ...slot, fill: undefined }
    usedFillKeys.add(play.playerKey)
    const dropKey = play.drop?.playerKey
    if (dropKey && usedDropKeys.has(dropKey)) {
      return { ...slot, fill: { ...play, drop: undefined, noCleanDrop: true } }
    }
    if (dropKey) usedDropKeys.add(dropKey)
    return { ...slot, fill: play }
  })

  const streamers = byValue.filter((p) => p.kind === 'stream')

  // Upgrades = non-stream adds/startSits that (1) don't fill an open slot (those already have
  // their own affordance), (2) aren't a rest-of-season drop-candidate (dropCandidate — a routine
  // body isn't a real upgrade just because it plays today), and (3) genuinely beat a current
  // active starter at a compatible position (mirrors the sitAlerts comparison) — capped short so
  // the section stays a short, actionable list instead of every eligible bench/FA hitter.
  const filledSlotSet = new Set(openSlots.map((s) => s.slot))
  const upgrades = byValue
    .filter(
      (p) =>
        p.kind !== 'stream' &&
        !p.dropCandidate &&
        (!p.fillsSlot || !filledSlotSet.has(p.fillsSlot)) &&
        activeLineup.some((a) => a.playerKey !== p.playerKey && positionsOverlap(a.position, p.position) && p.value > a.value),
    )
    .slice(0, MAX_UPGRADES)

  // The hero is the board's single best play — never a rest-of-season drop-candidate (streams
  // are exempt: a stream is disposable by design, so a low ROS value doesn't disqualify it).
  const heroEligible = byValue.filter((p) => !p.dropCandidate)

  return {
    hero: heroEligible[0] ?? byValue[0] ?? null,
    openSlots: filled,
    streamers,
    upgrades,
    sitAlerts: [], // populated by the composable when a rostered starter has a poor today spot
  }
}
