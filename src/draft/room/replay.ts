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
import { needFactorByPosition } from './rosterNeed'
import { marginalDetailByKey } from './marginalValue'
import { FLEX_ELIGIBILITY } from './lineup'
import { computeReplacementDetail } from '@/football/footballReplacement'

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
  /** Starting slots, so the replay discounts positions you can no longer start. */
  slots?: Record<string, number>
  totalStarterSlots: number
  runs?: number
  seed?: number
  /**
   * `observed` answers "given the draft that happened, what would we have said?"
   * `following` answers "and what if you had listened?" — at your picks the
   * engine takes its own recommendation, so availability diverges from there on.
   */
  mode?: 'observed' | 'following'
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

  const following = input.mode === 'following'
  const byOverall = new Map(picks.map((p) => [p.overallPick, p]))
  const steps: ReplayStep[] = []
  const drafted = new Set<string>()
  const myRoster: string[] = []
  const positionByKey = new Map(players.map((p) => [p.playerKey, p.position]))
  const pointsByKey = new Map(players.map((p) => [p.playerKey, p.projected ?? p.value]))
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

      // The replay has to be the live path or it verifies nothing. Without the
      // need factor it kept recommending a position already spoken for — which
      // is not what the tool would have said on the clock.
      const filledByPosition: Record<string, number> = {}
      for (const key of myRoster) {
        const pos = (positionByKey.get(key) ?? '').toUpperCase()
        if (pos) filledByPosition[pos] = (filledByPosition[pos] ?? 0) + 1
      }

      // Same lineup-aware value the live board uses. If the replay skipped it the
      // replay would be verifying a different tool.
      const rosterPlayers = myRoster.map((key) => ({
        playerKey: key,
        name: key,
        position: positionByKey.get(key) ?? '',
        points: pointsByKey.get(key) ?? 0,
      }))
      const detail = input.slots
        ? marginalDetailByKey({
            slots: input.slots,
            roster: rosterPlayers,
            candidates: available.map((p) => ({
              playerKey: p.playerKey,
              name: p.name,
              position: p.position,
              points: p.projected ?? p.value,
            })),
          })
        : undefined

      let marginal: Record<string, number> | undefined
      let replacementPoints: Record<string, number> | undefined
      let viaFlex: Record<string, boolean> | undefined
      if (detail && input.slots) {
        // The best flex-eligible replacement, for anyone headed to a flex slot.
        let flexReplacement = 0
        for (const [slot, n] of Object.entries(input.slots)) {
          const eligible = FLEX_ELIGIBILITY[slot.toUpperCase()]
          if (!eligible || !(Number(n) > 0)) continue
          for (const pos of eligible) {
            flexReplacement = Math.max(flexReplacement, sim.expectedBestProjectedAtPosition[pos] ?? 0)
          }
        }
        marginal = {}
        replacementPoints = {}
        viaFlex = {}
        for (const p of available) {
          const d = detail[p.playerKey]
          marginal[p.playerKey] = d?.points ?? 0
          viaFlex[p.playerKey] = d?.viaFlex ?? false
          replacementPoints[p.playerKey] = d?.viaFlex
            ? flexReplacement
            : sim.expectedBestProjectedAtPosition[p.position] ?? 0
        }
      }

      /**
       * The same replacement-adjusted market ordering the live board passes in.
       *
       * The replay exists to re-run a draft through the identical code path, so
       * a divergence here means it silently verifies nothing: `buildBoard` would
       * fall back to its raw-value ranking and the replay's VALUE/FADE badges
       * would be the positional artifact the live board no longer shows.
       *
       * From `projected`, never `value` — `value` carries whichever ranking list
       * the pipeline applied, and the badge must mean the same thing for every
       * user. Ranked over exactly the priced players, which is the population
       * `buildBoard` draws its ADP rank from.
       */
      let marketRank: Record<string, number> | undefined
      if (input.slots) {
        const priced = available.filter((p) => typeof adpByKey[p.playerKey] === 'number')
        if (priced.length) {
          const points = (p: AvailablePlayerRow) => p.projected ?? p.value
          // Same normalisation `buildBoard` applies, so a "RB,WR" row looks up a
          // replacement level that exists instead of silently reading 0.
          const pos = (p: AvailablePlayerRow) =>
            String(p.position || '').toUpperCase().split(/[,/|]/)[0].trim()
          const rep = computeReplacementDetail(
            priced.map((p) => ({ playerKey: p.playerKey, position: pos(p), points: points(p) })),
            input.slots,
            shape.teams,
          )
          const overReplacement = (p: AvailablePlayerRow) =>
            points(p) - (rep.levels[pos(p)] ?? 0)
          marketRank = {}
          ;[...priced]
            .sort((a, b) => overReplacement(b) - overReplacement(a))
            .forEach((p, i) => { marketRank![p.playerKey] = i + 1 })
        }
      }

      const board = buildBoard({
        available,
        needFactor: input.slots ? needFactorByPosition({ slots: input.slots, filledByPosition }) : undefined,
        marginalByKey: marginal,
        replacementPointsByKey: replacementPoints,
        viaFlexByKey: viaFlex,
        survival: sim.survival,
        expectedBestAtPosition: sim.expectedBestAtPosition,
        expectedBestProjectedAtPosition: sim.expectedBestProjectedAtPosition,
        adpByKey,
        currentOverallPick: pick,
        // The replay must be the live path or it verifies nothing.
        filledStarterSlots: Math.min(myTaken, totalStarterSlots),
        totalStarterSlots,
        teams: shape.teams,
        marketRankByKey: marketRank,
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

      // Whose roster is being built from here: yours, or the one we advised.
      const mine = following ? board[0]?.playerKey : actual?.playerKey
      if (mine) {
        myRoster.push(mine)
        if (following) drafted.add(mine)
      }
    }

    // In `following` mode your real picks are never removed — you didn't make
    // them. An opponent who later took someone we had already claimed simply
    // finds him gone; what he would have done instead is unknowable, so his pick
    // is skipped rather than invented.
    if (actual?.playerKey && !(following && slotAtPick(shape, pick) === mySlot)) {
      drafted.add(actual.playerKey)
    }
  }

  return steps
}

/** The roster you would have ended with by taking our top pick every time. */
export function followRecommendations(input: ReplayInput): string[] {
  const steps = replayDraft({ ...input, mode: 'following' })
  return steps.map((s) => s.board[0]?.playerKey).filter((k): k is string => !!k)
}

/**
 * How far past your next pick the market has to price a player before the
 * question "will he last?" stops being interesting.
 */
const AT_RISK_MARGIN = 24

/**
 * Did reality match our confidence? Buckets every prediction by the survival we
 * claimed and reports how often those players actually survived to the pick we
 * were predicting for. A bucket whose `actualSurvived / total` sits far from its
 * `predicted` mean is the model lying with a straight face.
 */

export function calibration(
  steps: ReplayStep[],
  picks: ReplayPick[],
  adpByKey: Record<string, number> = {},
): CalibrationBucket[] {
  const takenAt = new Map<string, number>()
  for (const p of picks) if (!takenAt.has(p.playerKey)) takenAt.set(p.playerKey, p.overallPick)

  const buckets = new Map<number, { predSum: number; survived: number; total: number }>()

  for (const step of steps) {
    if (!step.nextPick) continue
    for (const [playerKey, predicted] of Object.entries(step.predictedSurvival)) {
      /**
       * Only players the question is live for. Scored against the whole pool,
       * 97% of the rows landed in the 90-100% bucket — a 500-deep board is mostly
       * players nobody was going to take in the next six picks, and "we said 100%,
       * 99% lasted" is a real number answering a question no one asked. It also
       * buried the buckets that matter under a rounding error's worth of weight.
       */
      const adp = adpByKey[playerKey]
      if (typeof adp !== 'number' || adp > step.nextPick + AT_RISK_MARGIN) continue
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
