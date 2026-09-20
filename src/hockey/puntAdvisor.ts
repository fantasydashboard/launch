import type { HockeyProjection } from './hockeyValue'
import { createLedgerEngine, columnsWon, type LedgerColumn, type LedgerInput } from './categoryLedger'
import { buildCategoryMarginal } from './categoryMarginal'

/**
 * Whether to stop contesting a column, and what it buys you.
 *
 * PUNTING IS A PLAN, NOT A CONCESSION. You win a category week by taking more columns than the
 * man opposite — five of nine is a win and four is a loss, and nothing else about the week
 * matters. So being respectable everywhere is the losing shape: third of ten in all nine
 * columns takes none of them. Deliberately conceding two, and spending every pick those two
 * would have cost on the remaining seven, is how a roster goes from competitive to dominant.
 * No points league has an equivalent move, and it is the single largest edge available in the
 * format.
 *
 * THE ADVICE IS EARNED BY SIMULATION, NOT BY A RULE OF THUMB. "You are last in hits, punt
 * hits" is a guess dressed as analysis — sometimes the fix is one available defenceman away.
 * So each candidate punt is played out: fill the rest of the roster greedily from what is
 * actually on the board, once contesting everything and once with the column conceded, and
 * compare how many columns you end up winning. A punt is recommended only when it wins MORE
 * columns, and the number is shown so you can disagree with it.
 *
 * THE BOARD HAS TO DRAIN, OR THERE IS NO SUCH THING AS A PUNT. The first version let you take
 * twelve straight best-available players while nine opponents picked nothing, so the pool never
 * emptied and contesting everything could repair any hole — the advisor correctly concluded
 * that punting never helped, from a world in which scarcity does not exist. Punting is a
 * response to scarcity and nothing else. Between each of your picks the simulation now removes
 * the players the rest of the room would have taken, so the goalies you passed on are gone when
 * you come back for them.
 *
 * AND THE PLAYERS THE ROOM TAKES GO ONTO THE ROOM'S ROSTERS. Draining them off the board and
 * then discarding them left nine opponents whose unfilled slots stayed at replacement level
 * while every one of mine was filled with a real player — so contesting everything came back
 * winning eight of nine columns and ranked first in seven, which no roster in any league has
 * ever done. Inflating my own side that far does not merely exaggerate the totals, it rules
 * punting out by construction: if contesting everything wins everything, nothing is ever worth
 * conceding. The simulated picks are assigned round-robin to the teams that made them.
 *
 * WHAT IT IS STILL APPROXIMATE ABOUT. Opponents draft by market order rather than to their own
 * needs, and snake order is approximated by an even share. It is a model of a room, not a
 * prediction of one — which is why this returns a DIFFERENCE between two branches and never a
 * forecast of your season.
 */

export interface PuntSuggestion {
  /**
   * The columns to concede, TOGETHER.
   *
   * A punt is rarely one column, because columns are not independent — they are supplied by
   * positions. Conceding wins while still chasing goals-against and save percentage concedes
   * nothing at all: you draft the same goalies either way, and the simulation correctly
   * reported a gain of zero for every single-column goalie punt. The move a real manager
   * makes is "punt goaltending", all three at once, which frees every goalie pick for
   * skaters. Columns are therefore grouped by the position that supplies them and offered as
   * a set.
   */
  concede: string[]
  /** Columns won with it conceded, versus contested. Comparison only — see the header. */
  ifPunt: number
  ifContest: number
  /** ifPunt − ifContest. Positive is the whole reason to do it. */
  gain: number
  /** Columns that improve because the picks go elsewhere. */
  improves: string[]
  /** Where you currently sit in the columns being conceded, worst first. */
  standing: { key: string; rank: number; of: number }[]
}

export interface PuntInput extends LedgerInput {
  /** Everyone still on the board. */
  candidates: string[]
  /**
   * How many picks you have left. The simulation fills exactly this many.
   * Zero or fewer means the draft is done and there is nothing to advise.
   */
  picksRemaining: number
  /**
   * Don't advise before this many of your own picks are in.
   *
   * Conceding a column in round one is not a plan, it is a coin toss: nobody has a roster
   * yet, every team's ledger is the same pile of replacement bodies, and the simulation would
   * be comparing two guesses. Four picks is where a shape starts to exist.
   */
  minPicks?: number
  /** How deep to look for fills. The whole board is affordable and pointless. */
  poolSize?: number
  /**
   * The order the ROOM takes players in — ADP, best first.
   *
   * Used to drain the board between your picks. Absent, a neutral best-available order is
   * derived from the projections, which is a worse model of a real room than its own ADP but
   * a far better one than a board that never empties.
   */
  marketOrder?: string[]
}

/** Only a column you are actually losing is worth conceding. */
const losing = (c: LedgerColumn) => c.status === 'losing'

/**
 * Which position actually supplies each column.
 *
 * Read off the feed rather than hardcoded, because the answer is a fact about the league's
 * chosen columns and not about hockey in general: wins and save percentage come from goalies,
 * blocked shots overwhelmingly from defencemen, and a league that scores faceoff wins is
 * asking about centres. Taking the position that dominates a column's top contributors is
 * enough to group them, and it keeps working for a column nobody anticipated.
 */
function supplierByColumn(
  projections: Record<string, HockeyProjection>,
  categories: { key: string; reverse: boolean }[],
): Record<string, string> {
  const out: Record<string, string> = {}
  const all = Object.values(projections)
  for (const cat of categories) {
    const top = all
      .filter((p) => Number.isFinite(Number(p.stats[cat.key])))
      .sort((a, b) => {
        const av = Number(a.stats[cat.key]); const bv = Number(b.stats[cat.key])
        return cat.reverse ? av - bv : bv - av
      })
      .slice(0, 30)
    const tally: Record<string, number> = {}
    for (const p of top) {
      const pos = String(p.position || '').toUpperCase()
      if (pos) tally[pos] = (tally[pos] ?? 0) + 1
    }
    out[cat.key] = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
  }
  return out
}

/**
 * A best-available order, standardised per column so no one column's units dominate it.
 *
 * Only a fallback: a real room drafts by its own ADP, and this stands in when the feed did
 * not publish one.
 */
function neutralMarketOrder(
  projections: Record<string, HockeyProjection>,
  categories: { key: string; reverse: boolean }[],
): string[] {
  const all = Object.values(projections)
  const stats = categories.map((c) => {
    const vals = all.map((p) => Number(p.stats[c.key])).filter((v) => Number.isFinite(v))
    const mean = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0
    const sd = vals.length
      ? Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length) : 0
    return { c, mean, sd }
  })
  return all
    .map((p) => ({
      k: p.playerKey,
      n: stats.reduce((s, { c, mean, sd }) => {
        const v = Number(p.stats[c.key])
        if (!Number.isFinite(v) || sd <= 0) return s
        return s + ((v - mean) / sd) * (c.reverse ? -1 : 1)
      }, 0),
    }))
    .sort((a, b) => b.n - a.n)
    .map((x) => x.k)
}

/**
 * Fill the remaining roster greedily from the board, and report the ledger you end up with.
 *
 * Greedy rather than exhaustive: the true optimum is a combinatorial search over hundreds of
 * players and a dozen slots, and it would not survive a ninety-second pick clock. Taking the
 * best marginal player each time is what a drafter does anyway, which makes it the honest
 * model of the thing being predicted.
 */
function fillOut(
  input: PuntInput,
  punted: Set<string>,
  poolSize: number,
  marketOrder: string[],
): LedgerColumn[] {
  const myPicks = [...(input.picksByTeam[input.myTeamId] ?? [])]
  /* Everyone already off the board, mine and theirs — a candidate is only a candidate once. */
  const taken = new Set<string>()
  for (const list of Object.values(input.picksByTeam)) for (const k of list) taken.add(k)
  let pool = input.candidates.filter((k) => !taken.has(k))

  /* The room, and what it will own by the end. */
  const otherIds = Object.keys(input.picksByTeam).filter((id) => id !== input.myTeamId)
  const theirPicks: Record<string, string[]> = Object.fromEntries(
    otherIds.map((id) => [id, [...(input.picksByTeam[id] ?? [])]]),
  )
  let market = marketOrder.filter((k) => !taken.has(k))

  for (let i = 0; i < input.picksRemaining; i++) {
    const rows = buildCategoryMarginal({
      ...input,
      punted,
      picksByTeam: { ...theirPicks, [input.myTeamId]: myPicks },
      candidates: pool,
      limit: poolSize,
    })
    const best = rows[0]
    if (!best) break
    myPicks.push(best.playerKey)
    taken.add(best.playerKey)
    pool = pool.filter((k) => k !== best.playerKey)

    /* The rest of the room picks before I do again — onto their OWN rosters, so they improve
       at the same rate I do. The goalie I passed on is gone, and somebody now has him. */
    const gone = market.filter((k) => !taken.has(k)).slice(0, otherIds.length)
    gone.forEach((k, j) => {
      taken.add(k)
      theirPicks[otherIds[j % otherIds.length]].push(k)
    })
    if (gone.length) {
      const goneSet = new Set(gone)
      pool = pool.filter((k) => !goneSet.has(k))
      market = market.filter((k) => !goneSet.has(k))
    }
  }

  return createLedgerEngine({
    ...input,
    punted,
    picksByTeam: { ...theirPicks, [input.myTeamId]: myPicks },
  }).ledger
}

/**
 * Which column, if any, is worth giving up.
 *
 * Returns every candidate worth showing, best first, so a surface can offer the top one and
 * let a drafter see the runners-up rather than presenting one answer as the only one.
 */
export function suggestPunts(input: PuntInput): PuntSuggestion[] {
  const { picksRemaining, minPicks = 4, poolSize = 60 } = input
  const mine = input.picksByTeam[input.myTeamId] ?? []
  if (picksRemaining <= 0 || mine.length < minPicks) return []

  /*
   * How the room drains. The league's own ADP when we have it, since that is what the room
   * actually does; otherwise a standardised best-available across the league's columns, which
   * is at least a coherent drafter rather than an empty board.
   */
  const marketOrder = input.marketOrder?.length
    ? input.marketOrder
    : neutralMarketOrder(input.projections, input.categories)

  const already = input.punted ?? new Set<string>()
  const base = createLedgerEngine(input).ledger
  if (!base.length) return []

  const lost = base.filter((c) => losing(c) && !already.has(c.key))
  if (!lost.length) return []

  /*
   * The scenarios worth simulating: each losing column on its own, and each GROUP of losing
   * columns that share a supplier. The group is the one that matters — punting goaltending is
   * a real build and punting wins alone is not a move.
   */
  const supplier = supplierByColumn(input.projections, input.categories)
  const groups = new Map<string, LedgerColumn[]>()
  for (const c of lost) {
    const g = supplier[c.key] || c.key
    groups.set(g, [...(groups.get(g) ?? []), c])
  }
  const scenarios: LedgerColumn[][] = [
    ...[...groups.values()].filter((g) => g.length > 1),
    ...lost.map((c) => [c]),
  ]
  /* Each scenario is a full greedy draft; offering a dozen would be slow and read as noise. */
  const worst = scenarios
    .sort((a, b) => (a.reduce((s2, c) => s2 + c.winPct, 0) / a.length)
      - (b.reduce((s2, c) => s2 + c.winPct, 0) / b.length))
    .slice(0, 4)

  const contestLedger = fillOut(input, already, poolSize, marketOrder)
  const ifContest = columnsWon(contestLedger)
  const contestWin = new Map(contestLedger.map((c) => [c.key, c.winPct]))

  const out: PuntSuggestion[] = []
  for (const group of worst) {
    const keys = group.map((c) => c.key)
    const punted = new Set([...already, ...keys])
    const after = fillOut(input, punted, poolSize, marketOrder)
    /*
     * A conceded column is not counted as won even if the simulation stumbles into winning it,
     * because the whole point of conceding is that you stopped spending on it — counting it
     * would let a punt claim credit for the thing it gave up.
     */
    const ifPunt = after.filter((c) => !keys.includes(c.key) && c.status === 'winning').length
    const improves = after
      .filter((c) => !keys.includes(c.key) && c.winPct > (contestWin.get(c.key) ?? 0) + 0.05)
      .map((c) => c.key)

    out.push({
      concede: keys,
      ifPunt,
      ifContest,
      gain: ifPunt - ifContest,
      improves,
      standing: group.map((c) => ({ key: c.key, rank: c.rank, of: c.of })),
    })
  }

  /* Only the ones that actually win more columns. A punt that breaks even is a strategy with
     no argument behind it, and showing it would spend a drafter's attention on nothing. */
  return out.filter((s) => s.gain > 0).sort((a, b) => b.gain - a.gain)
}

/** Everything this advisor needs that the caller would otherwise have to assemble. */
export type PuntAdvisorProjections = Record<string, HockeyProjection>
