import type { HockeyProjection } from './hockeyValue'
import type { HockeyCategory } from './hockeyCategoryValue'
import { RATE_VOLUME } from './hockeyCategoryValue'

/**
 * Where every team projects to finish in every column — the scoreboard a category draft is
 * actually played on.
 *
 * WHY A DRAFT BOARD IS NOT ENOUGH. A points draft can be won with a ranked list, because value
 * is additive and context-free: a player is worth his points above replacement no matter what
 * else you own, and the board you build in round one is still correct in round twelve. None of
 * that survives in a category league. You win by taking more COLUMNS than the man opposite, so
 * finishing third of ten in all nine of them loses every week, and first in five while last in
 * four wins every week. The objective is not "accumulate value", it is "take columns" — and no
 * ranked list can express that, because the value of a unit depends entirely on where you
 * already stand in the column it lands in.
 *
 * THE PROJECTION HAS TO BE OF A FINISHED ROSTER, AND THIS IS THE WHOLE TRICK. In round two
 * every team owns two players. Comparing those totals says nothing — it reports who drafted the
 * higher-volume winger, which is not a standing. So each team is projected as its picks PLUS a
 * replacement-level body in every slot it has not filled yet. That makes a round-one standing a
 * real statement about where the season ends up if nobody improves from here, which is the only
 * baseline a drafter can act against.
 *
 * RATES ARE NOT SUMMED. A team's save percentage is not the mean of its goalies' save
 * percentages, it is their saves over their shots. Every rate column is aggregated
 * volume-weighted for that reason; summing them would hand the column to whoever rostered the
 * smallest sample, which is the same error the value engine documents one file over.
 */

/** One column, from my side of it. */
export interface LedgerColumn {
  key: string
  reverse: boolean
  /** My projected finished-roster figure — a total for counting stats, a rate for rates. */
  mine: number
  /** Every team's figure, mine included, sorted best first. Useful for a distribution bar. */
  field: number[]
  /**
   * The OPPONENTS' mean and spread, with me excluded — the yardstick I am measured against.
   *
   * Excluding myself is not a refinement, it is the difference between the measure working
   * and not working. Normalised against a field I am part of, my own improvement drags the
   * mean and inflates the spread by almost exactly as much as it raises my figure, so the
   * standardised edge comes out unchanged and adding a great player scores as no change at
   * all. The thing you are trying to beat cannot include you.
   */
  oppMean: number
  oppSpread: number
  /** Where I finish, 1 = best. */
  rank: number
  of: number
  /** How far from the team immediately better than me. Zero when I am first. */
  toNext: number
  /** Share of opponents I currently beat, 0..1 — the honest read of "am I winning this". */
  winPct: number
  status: 'winning' | 'tossup' | 'losing' | 'punted'
}

export interface LedgerInput {
  projections: Record<string, HockeyProjection>
  categories: HockeyCategory[]
  /** Every team's picks so far, by team id. Mine included. */
  picksByTeam: Record<string, string[]>
  myTeamId: string
  /** Roster spots per team — what each roster fills up to. */
  rosterSize: number
  /** Starting slots, used to decide which POSITION each unfilled spot gets filled with. */
  slots: Record<string, number>
  /** Columns I have conceded. Reported, never scored. */
  punted?: Set<string>
}

/*
 * A column is a tossup when it is close enough that one more player decides it. Below that
 * band it is a loss worth conceding, above it a win worth protecting rather than padding —
 * and those three call for three different picks, which is the point of drawing the line.
 */
const WIN_AT = 0.70
const LOSE_AT = 0.35

/** Everything a roster contributes to one column: a total, and the volume behind it. */
interface Contribution { value: number; volume: number }

/**
 * What one player puts into one column.
 *
 * Rate columns return the rate AND the volume it was earned over, because a team's rate is
 * the volume-weighted blend of its players' rates and not their average. Counting columns
 * carry a volume of one so the same blend reduces to a plain sum.
 *
 * Returns null when he has no projection for the column — ABSENT IS NOT ZERO. A skater
 * entered at 0.000 save percentage would drag a team's goaltending to nothing.
 */
function contribute(proj: HockeyProjection | undefined, cat: HockeyCategory): Contribution | null {
  if (!proj) return null
  const raw = proj.stats[cat.key]
  if (!Number.isFinite(raw)) return null

  const volumeKey = RATE_VOLUME[cat.key]
  if (!volumeKey) return { value: raw, volume: 1 }

  const volume = proj.stats[volumeKey]
  if (!Number.isFinite(volume) || volume <= 0) return null
  return { value: raw, volume }
}

/** Mean and population standard deviation. A pool of one has no spread, which is zero. */
function moments(values: number[]): { mean: number; sd: number } {
  if (!values.length) return { mean: 0, sd: 0 }
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const v = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length
  return { mean, sd: Math.sqrt(v) }
}

/** Blend a roster's contributions: a sum for counting columns, volume-weighted for rates. */
function blend(parts: Contribution[], isRate: boolean): number {
  if (!parts.length) return 0
  if (!isRate) return parts.reduce((s, p) => s + p.value, 0)
  const vol = parts.reduce((s, p) => s + p.volume, 0)
  if (vol <= 0) return 0
  return parts.reduce((s, p) => s + p.value * p.volume, 0) / vol
}

/** His headline position — the pool a replacement for him is drawn from. */
const positionOf = (p: HockeyProjection) => String(p.position || '').toUpperCase()

/**
 * The body that fills an unfilled roster spot.
 *
 * Replacement is taken per POSITION, because the positions do not contribute the same things:
 * a defenceman filling a blank slot brings blocked shots and a goalie brings save percentage,
 * and filling every gap from one undifferentiated pool would hand phantom goaltending to a
 * team that has not drafted a goalie. It is the median of the players just past the last
 * draftable pick — the actual next man up, not the worst player in the feed.
 *
 * THE CUT IS PER POSITION, AND GETTING THAT WRONG BREAKS THE WHOLE LEDGER. It was the global
 * draftable count — ten teams times seventeen spots, so 170 — applied to every position
 * alike. There are 58 goalies in the feed. Index 170 falls off the end of that list onto the
 * worst goalie in it, who has no projected wins or save percentage at all, so replacement
 * goaltending came out as NOTHING: an empty roster projected 0.000 in both goalie columns,
 * every goalie on the board scored identically because each was being compared against a void,
 * and no goalie could ever be found to harm a rate column because nobody is worse than
 * nothing. Two goalie slots across ten teams means about twenty go; replacement is the
 * twentieth, and the arithmetic has to say so.
 */
function replacementByPosition(
  projections: Record<string, HockeyProjection>,
  categories: HockeyCategory[],
  drafted: Set<string>,
  /** playerKey -> how many of this position the league drafts in total. */
  cutByPosition: Record<string, number>,
): Record<string, Record<string, Contribution | null>> {
  const byPos = new Map<string, HockeyProjection[]>()
  for (const p of Object.values(projections)) {
    if (drafted.has(p.playerKey)) continue
    const pos = positionOf(p)
    if (!pos) continue
    byPos.set(pos, [...(byPos.get(pos) ?? []), p])
  }

  const out: Record<string, Record<string, Contribution | null>> = {}
  for (const [pos, list] of byPos) {
    /*
     * Rank the position's own remaining pool by what it carries in the league's own columns,
     * so "next man up" means next man up HERE rather than in some generic ranking.
     *
     * Standardised per column, and SIGNED for direction. A raw sum is dominated by whichever
     * column happens to have the biggest numbers — for a goalie that is wins, at around 30,
     * beside a save percentage of 0.9 that contributes nothing to the ordering. Worse, a raw
     * sum adds goals-against average, where a bigger number is a worse goalie, so the band
     * was being chosen partly by who was WORST at it.
     */
    const stats = categories.map((c) => {
      const vals = list.map((p) => Number(p.stats[c.key])).filter((v) => Number.isFinite(v))
      const mean = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0
      const sd = vals.length
        ? Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length)
        : 0
      return { c, mean, sd }
    })
    const scored = list
      .map((p) => ({
        p,
        n: stats.reduce((s, { c, mean, sd }) => {
          const v = Number(p.stats[c.key])
          if (!Number.isFinite(v) || sd <= 0) return s
          return s + ((v - mean) / sd) * (c.reverse ? -1 : 1)
        }, 0),
      }))
      .sort((a, b) => b.n - a.n)
    /* A shallow slice around this POSITION's own cut, so one outlier cannot define the level
       and a shallow position cannot run off the end of its list. */
    const cut = Math.max(1, Math.round(cutByPosition[pos] ?? scored.length))
    const start = Math.max(0, Math.min(Math.max(0, scored.length - 4), cut))
    const band = scored.slice(start, start + 8).map((x) => x.p)
    const from = band.length ? band : scored.slice(-8).map((x) => x.p)

    const perCat: Record<string, Contribution | null> = {}
    for (const cat of categories) {
      /* A band member with no projection for this column is left OUT of it rather than
         entered at zero — the same rule every player gets, applied to the yardstick. */
      const parts = from.map((p) => contribute(p, cat)).filter((c): c is Contribution => !!c)
      /*
       * ONE body, which means the AVERAGE of the band — not its total.
       *
       * `blend` sums a counting column, because that is what it does for a roster. Applied to
       * the eight-man band it made a single replacement body worth eight players, so a real
       * winger projected for 276 hits was slotted in over a phantom worth 1,936 and the team
       * total FELL. Every good player scored as a loss; the board ranked its candidates
       * upside down and looked entirely plausible doing it.
       */
      const isRate = !!RATE_VOLUME[cat.key]
      perCat[cat.key] = parts.length
        ? {
            value: isRate ? blend(parts, true) : blend(parts, false) / parts.length,
            volume: parts.reduce((s, p) => s + p.volume, 0) / parts.length,
          }
        : null
    }
    out[pos] = perCat
  }
  return out
}

/** How many bodies of each position a full roster carries, from the league's slot template. */
export function positionQuota(slots: Record<string, number>, rosterSize: number): Record<string, number> {
  const quota: Record<string, number> = {}
  const FLEX = new Set(['UTIL', 'F', 'BE', 'BENCH', 'IR'])
  let named = 0
  for (const [slot, n] of Object.entries(slots)) {
    const s = slot.toUpperCase()
    const count = Number(n) || 0
    if (FLEX.has(s)) continue
    quota[s] = (quota[s] ?? 0) + count
    named += count
  }
  /*
   * Flex and bench spots go to SKATERS. A manager fills a utility slot and his bench with
   * forwards and defencemen; handing those seats to goalies would invent goaltending nobody
   * rosters and make every team's rate columns look alike.
   */
  const spare = Math.max(0, rosterSize - named)
  if (spare > 0) {
    const skaters = ['C', 'LW', 'RW', 'D'].filter((p) => quota[p])
    const each = skaters.length ? spare / skaters.length : 0
    for (const p of skaters) quota[p] = (quota[p] ?? 0) + each
  }
  return quota
}


/**
 * How many of each position the league drafts in total — where replacement level sits.
 *
 * Two goalie slots across ten teams means roughly twenty goalies are taken, so the twentieth
 * is the next man up. Using one global number for every position put the goalie cut past the
 * end of a 58-man list; see replacementByPosition.
 */
export function cutsFromQuota(quota: Record<string, number>, teams: number): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [pos, n] of Object.entries(quota)) out[pos] = Math.max(1, Math.round(n * teams))
  return out
}

/** Blend one team's roster, real picks topped up to a full roster with replacement bodies. */
function teamColumn(
  picks: string[],
  projections: Record<string, HockeyProjection>,
  cat: HockeyCategory,
  quota: Record<string, number>,
  replacement: Record<string, Record<string, Contribution | null>>,
): number {
  const isRate = !!RATE_VOLUME[cat.key]
  const parts: Contribution[] = []

  const have: Record<string, number> = {}
  for (const key of picks) {
    const p = projections[key]
    if (!p) continue
    const pos = positionOf(p)
    have[pos] = (have[pos] ?? 0) + 1
    const c = contribute(p, cat)
    if (c) parts.push(c)
  }

  /* Top up to a full roster. This is what makes a two-player standing mean something. */
  for (const [pos, need] of Object.entries(quota)) {
    const missing = Math.max(0, Math.round(need - (have[pos] ?? 0)))
    const r = replacement[pos]?.[cat.key]
    if (!r || missing <= 0) continue
    for (let i = 0; i < missing; i++) parts.push(r)
  }

  return blend(parts, isRate)
}

/**
 * Where I finish, when teams are level.
 *
 * `indexOf` on a sorted array hands every tied team the FIRST of the tied places, so before a
 * single pick is made — when all ten rosters are identical replacement — every column read
 * "1st of 10" next to a 0% chance of winning it. Two numbers from the same object flatly
 * contradicting each other. A tie is reported at the MIDDLE of the places it spans, which is
 * what a tie actually is.
 */
function rankWithTies(mine: number, all: number[], reverse: boolean): number {
  const better = all.filter((v) => (reverse ? v < mine : v > mine)).length
  const tied = all.filter((v) => v === mine).length
  return 1 + better + Math.floor(Math.max(0, tied - 1) / 2)
}

/**
 * The full ledger: where I finish in every column if the draft ended and everyone filled out.
 */
export function buildCategoryLedger(input: LedgerInput): LedgerColumn[] {
  const { projections, categories, picksByTeam, myTeamId, rosterSize, slots, punted } = input
  const teamIds = Object.keys(picksByTeam)
  if (!categories.length || !teamIds.length) return []

  const drafted = new Set<string>()
  for (const list of Object.values(picksByTeam)) for (const k of list) drafted.add(k)

  const quota = positionQuota(slots, rosterSize)
  const replacement = replacementByPosition(projections, categories, drafted,
    cutsFromQuota(quota, teamIds.length))

  return categories.map((cat) => {
    const byTeam = teamIds.map((id) => ({
      id,
      v: teamColumn(picksByTeam[id] ?? [], projections, cat, quota, replacement),
    }))
    /* Reverse columns — goals against, GAA — are won by the SMALLEST number. */
    const sorted = [...byTeam].sort((a, b) => (cat.reverse ? a.v - b.v : b.v - a.v))
    const mine = byTeam.find((t) => t.id === myTeamId)?.v ?? 0
    const of = teamIds.length
    const rank = rankWithTies(mine, byTeam.map((t) => t.v), cat.reverse)

    /* Beaten opponents over total opponents. A plain, checkable statement — not a model. */
    const oppValues = byTeam.filter((t) => t.id !== myTeamId).map((t) => t.v)
    const { mean: oppMean, sd: oppSpread } = moments(oppValues)
    const beaten = oppValues.filter((v) => (cat.reverse ? mine < v : mine > v)).length
    const winPct = oppValues.length ? beaten / oppValues.length : 0

    const above = rank > 1 ? sorted[Math.min(rank - 2, sorted.length - 1)].v : mine
    const status: LedgerColumn['status'] = punted?.has(cat.key)
      ? 'punted'
      : winPct >= WIN_AT ? 'winning'
      : winPct <= LOSE_AT ? 'losing'
      : 'tossup'

    return {
      key: cat.key,
      reverse: cat.reverse,
      mine,
      field: sorted.map((t) => t.v),
      oppMean,
      oppSpread,
      rank,
      of,
      toNext: Math.abs(above - mine),
      winPct,
      status,
    }
  })
}

/** Columns projecting to a win, which is the number a category draft is actually played for. */
export function columnsWon(ledger: LedgerColumn[]): number {
  return ledger.filter((c) => c.status === 'winning').length
}

/**
 * A ledger you can ask "what if I took him?" without paying for the whole thing again.
 *
 * ONLY MY COLUMN MOVES. Adding a player to my roster changes my figure in each column and
 * nobody else's, so the nine opponents are blended once and reused for every candidate.
 * Rebuilding all ten teams per player would be four hundred rebuilds a pick, which is the
 * difference between a board that re-prices while you read it and one that does not.
 */
export interface LedgerEngine {
  /** Where I stand right now. */
  ledger: LedgerColumn[]
  /** Where I would stand having also taken this player. */
  withPlayer: (playerKey: string) => LedgerColumn[]
  /** The replacement body each position is topped up with — what a candidate displaces. */
  quota: Record<string, number>
}

export function createLedgerEngine(input: LedgerInput): LedgerEngine {
  const { projections, categories, picksByTeam, myTeamId, rosterSize, slots, punted } = input
  const teamIds = Object.keys(picksByTeam)

  const drafted = new Set<string>()
  for (const list of Object.values(picksByTeam)) for (const k of list) drafted.add(k)

  const quota = positionQuota(slots, rosterSize)
  const replacement = replacementByPosition(projections, categories, drafted,
    cutsFromQuota(quota, teamIds.length))
  const myPicks = picksByTeam[myTeamId] ?? []

  /* The field, blended once. */
  const oppByCat = new Map<string, { id: string; v: number }[]>()
  for (const cat of categories) {
    oppByCat.set(cat.key, teamIds
      .filter((id) => id !== myTeamId)
      .map((id) => ({ id, v: teamColumn(picksByTeam[id] ?? [], projections, cat, quota, replacement) })))
  }

  const assemble = (picks: string[]): LedgerColumn[] => categories.map((cat) => {
    const mine = teamColumn(picks, projections, cat, quota, replacement)
    const opp = oppByCat.get(cat.key) ?? []
    const all = [...opp.map((o) => o.v), mine]
    const sorted = [...all].sort((a, b) => (cat.reverse ? a - b : b - a))
    const rank = rankWithTies(mine, all, cat.reverse)
    const beaten = opp.filter((o) => (cat.reverse ? mine < o.v : mine > o.v)).length
    const winPct = opp.length ? beaten / opp.length : 0
    const { mean: oppMean, sd: oppSpread } = moments(opp.map((o) => o.v))
    const above = rank > 1 ? sorted[Math.min(rank - 2, sorted.length - 1)] : mine
    return {
      key: cat.key,
      reverse: cat.reverse,
      mine,
      field: sorted,
      oppMean,
      oppSpread,
      rank,
      of: all.length,
      toNext: Math.abs(above - mine),
      winPct,
      status: punted?.has(cat.key) ? 'punted'
        : winPct >= WIN_AT ? 'winning'
        : winPct <= LOSE_AT ? 'losing'
        : 'tossup',
    }
  })

  return {
    ledger: assemble(myPicks),
    withPlayer: (playerKey: string) => assemble([...myPicks, playerKey]),
    quota,
  }
}
