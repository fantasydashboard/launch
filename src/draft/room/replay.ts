/**
 * Replaying a completed draft.
 *
 * A draft tool gets one live test per year. If it misbehaves on draft night there
 * is no second attempt until next August, so "we shipped it and hope" is not an
 * acceptable verification story.
 *
 * Replay walks a finished draft pick by pick and runs the exact same board and
 * recommendation code the live path uses, with only the players actually available
 * at that moment. Two things fall out: recommendations you can eyeball against a
 * draft you remember, and calibration — of the players we said were ~90% likely to
 * be gone, how many actually went. Overconfidence becomes discoverable in advance.
 */

import { buildBoard, type AvailablePlayerRow, type BoardRow } from './board'
import { buildRecommendation, type Recommendation } from './recommend'
import { simulateSurvival } from './survival'
import { nextPickFor, slotAtPick, slotsBetween, type DraftShape } from './pickOrder'
import { priorFor, type Tendencies } from './tendencies'

export interface ReplayPick {
  overallPick: number
  playerKey: string
  slot: number
}

export interface ReplayInput {
  shape: DraftShape
  /** Every pick of the completed draft, in order. */
  picks: ReplayPick[]
  mySlot: number
  /** Full player universe available at the start of the draft. */
  players: AvailablePlayerRow[]
  adpByKey: Record<string, number>
  tendencies: Tendencies
  rosterIdForSlot: (slot: number) => string
  roundBucket?: (round: number) => string
  totalStarterSlots: number
  runs?: number
  seed?: number
}

export interface ReplayStep {
  overallPick: number
  recommendation: Recommendation | null
  /** Who was actually taken with this pick. */
  actualPlayerKey: string | null
  /** That player's name, when we can resolve it. */
  actualName: string | null
  /** Survival we predicted for each player, at this decision. */
  predictedSurvival: Record<string, number>
  /** My next pick at the time — the horizon the prediction was made against. */
  nextPick: number | null
  board: BoardRow[]
}

export interface CalibrationBucket {
  /** Lower bound of the predicted-survival bucket, e.g. 0.8 for 80–90%. */
  bucket: number
  predicted: number
  actualSurvived: number
  total: number
}

/** Replay a completed draft, producing a decision at each of my picks. */
export function replayDraft(input: ReplayInput): ReplayStep[] {
  const {
    shape, picks, mySlot, players, adpByKey, tendencies,
    rosterIdForSlot, totalStarterSlots,
  } = input
  const roundBucket = input.roundBucket ?? ((r: number) => (r <= 3 ? 'early' : r <= 8 ? 'mid' : 'late'))

  const byOverall = new Map(picks.map((p) => [p.overallPick, p]))
  const steps: ReplayStep[] = []
  const drafted = new Set<string>()
  let myTaken = 0

  const totalPicks = shape.teams * shape.rounds
  for (let pick = 1; pick <= totalPicks; pick++) {
    const actual = byOverall.get(pick) ?? null
    const isMine = slotAtPick(shape, pick) === mySlot

    if (isMine) {
      const available = players.filter((p) => !drafted.has(p.playerKey))
      const nextPick = nextPickFor(shape, mySlot, pick)
      const upcomingSlots = nextPick ? slotsBetween(shape, pick, nextPick) : []
      const bucket = roundBucket(Math.ceil(pick / Math.max(1, shape.teams)))

      const sim = simulateSurvival({
        available: available.map((p) => ({
          playerKey: p.playerKey,
          position: p.position,
          adp: adpByKey[p.playerKey] ?? null,
          value: p.value,
        })),
        upcomingSlots,
        priorForSlot: (slot) => priorFor(tendencies, rosterIdForSlot(slot), bucket),
        runs: input.runs ?? 300,
        seed: input.seed ?? 1337,
      })

      const board = buildBoard({
        available,
        survival: sim.survival,
        expectedBestAtPosition: sim.expectedBestAtPosition,
        adpByKey,
        currentOverallPick: pick,
        filledStarterSlots: Math.min(myTaken, totalStarterSlots),
        totalStarterSlots,
      })

      const top = board[0]
      const samePos = top ? board.filter((r) => r.position === top.position) : []
      const nextTier = top ? samePos.find((r) => r.tier > top.tier) : undefined

      steps.push({
        overallPick: pick,
        recommendation: buildRecommendation(board, {
          nextPick,
          upcoming: upcomingSlots.map((slot) => {
            const teamKey = rosterIdForSlot(slot)
            return { teamKey, teamName: teamKey, prior: priorFor(tendencies, teamKey, bucket) }
          }),
          tierRemaining: top ? Math.max(0, samePos.filter((r) => r.tier === top.tier).length - 1) : undefined,
          nextTierDrop: top && nextTier ? top.value - nextTier.value : undefined,
        }),
        actualPlayerKey: actual?.playerKey ?? null,
        actualName: actual ? (players.find((pl) => pl.playerKey === actual.playerKey)?.name ?? null) : null,
        predictedSurvival: sim.survival,
        nextPick,
        board,
      })
      myTaken++
    }

    if (actual?.playerKey) drafted.add(actual.playerKey)
  }

  return steps
}

/**
 * Did reality match our confidence? Buckets every prediction by the survival we
 * claimed and reports how often those players actually survived to the pick we
 * were predicting for. A bucket whose `actualSurvived / total` sits far from its
 * `predicted` mean is the model lying with a straight face.
 */
export function calibration(steps: ReplayStep[], picks: ReplayPick[]): CalibrationBucket[] {
  const takenAt = new Map<string, number>()
  for (const p of picks) if (!takenAt.has(p.playerKey)) takenAt.set(p.playerKey, p.overallPick)

  const buckets = new Map<number, { predSum: number; survived: number; total: number }>()

  for (const step of steps) {
    if (!step.nextPick) continue
    for (const [playerKey, predicted] of Object.entries(step.predictedSurvival)) {
      const b = Math.min(0.9, Math.floor(predicted * 10) / 10)
      const entry = buckets.get(b) ?? { predSum: 0, survived: 0, total: 0 }
      const takenPick = takenAt.get(playerKey)
      // Survived = not taken strictly before my next pick.
      const survived = takenPick === undefined || takenPick >= step.nextPick
      entry.predSum += predicted
      entry.survived += survived ? 1 : 0
      entry.total += 1
      buckets.set(b, entry)
    }
  }

  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([bucket, e]) => ({
      bucket,
      predicted: e.total ? e.predSum / e.total : 0,
      actualSurvived: e.survived,
      total: e.total,
    }))
}
