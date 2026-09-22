/**
 * Does our rest-of-season board actually predict the rest of the season?
 *
 * Run: npx vite-node scripts/ros-backtest.ts
 *
 * WHY IT EXISTS. `PRIOR_GAMES` decides how much a small sample of real games counts against a
 * preseason forecast, and it was set to five by judgment. Judgment is a fine way to pick a
 * starting value and a bad way to defend one, particularly after a comparison against a trusted
 * analyst's week-3 board showed our ranks chasing season-to-date scoring far harder than his at
 * quarterback (0.70 to his 0.32) and tight end (0.73 to his 0.16). His implied prior weight was
 * about 8-9 games at running back and receiver, 18 at quarterback, 20 at tight end.
 *
 * That comparison says we DIFFER from him. It cannot say either of us is right — agreeing with
 * an analyst is not accuracy, it is imitation. This script asks the only question that settles
 * it: rebuild the board as it stood at each week of a finished season, then check it against
 * what those players went on to actually score.
 *
 * METHOD, per week W of 2025:
 *     prior    Sleeper's 2025 PRESEASON season projection (verified uncontaminated: players
 *              whose seasons ended early still carry full-season numbers, e.g. Kyler Murray
 *              projected 314 having scored 81 in 5 games)
 *     lines    actual scoring, weeks 1..W-1 — everything knowable at W, nothing more
 *     board    buildRosPoints(prior, lines, W) — the SHIPPED function, swept over candidate
 *              prior weights, then ranked within position
 *     truth    actual half-PPR points, weeks W..18
 *     score    Spearman(board rank, truth) within position
 *
 * NO LOOKAHEAD. The player universe is selected by PRESEASON projection rank, which was known
 * before week one. Selecting on end-of-season production would guarantee a flattering answer.
 *
 * WHAT IT CANNOT TELL YOU. One season is one sample. A weight that wins by a hair is noise, so
 * per-week spread is reported next to every mean — a configuration that wins on average while
 * losing in half the individual weeks has not won.
 */
import { buildRosPoints, PRIOR_GAMES, SEASON_GAMES } from '../src/football/rosBlend'
import { linesFromStats, type SeasonLine } from '../src/services/playerUsage'

const SEASON = 2025
const WEEKS = 18
/** Weeks to score. Week 1 has no evidence to blend; past 14 there is too little season left. */
const FIRST_WEEK = 2
const LAST_WEEK = 14
/** Candidate prior weights: 0 is pure production-chasing, 40 is nearly the untouched forecast. */
const CANDIDATES = [0, 1, 2, 3, 5, 8, 12, 16, 20, 28, 40]
/**
 * How deep a realistic board runs at each position.
 *
 * TOO SHALLOW IS NOT SAFER, AND THIS NEARLY SHIPPED A WRONG ANSWER. At QB 24 and TE 24 the
 * sweep said the prior weight should be 0 at quarterback (winning all 13 weeks) and 28 at tight
 * end. Widening to 40 and 36 reversed both: quarterback's best became 5, the shipped value, and
 * tight end's became 3 by a margin of 0.006. The tight-end standard deviation fell from ±0.21
 * to ±0.07 — the narrow pool WAS the noise.
 *
 * The reason is that a 24-deep pool is 24 players who were all projected to start, ranked
 * against each other. Their spread is small, so the correlation is dominated by whoever got hurt
 * or benched, and recent production identifies that fastest — which flatters a low prior weight
 * for a reason that has nothing to do with forecasting. A real board contains the fringe
 * starters and the backup who threw three touchdowns in relief, and those are exactly the
 * players a zero weight misranks.
 *
 * Scoring the whole NFL would be the opposite error: ranking the 300th receiver below the 12th
 * is free marks and no information.
 */
const DEPTH: Record<string, number> = { QB: 40, RB: 48, WR: 60, TE: 36 }
const POSITIONS = Object.keys(DEPTH)

const get = async (url: string): Promise<any> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json()
}

function spearman(x: number[], y: number[]): number {
  const rank = (v: number[]) => {
    const idx = v.map((val, i) => ({ val, i })).sort((a, b) => a.val - b.val)
    const out = new Array(v.length).fill(0)
    for (let i = 0; i < idx.length;) {
      let j = i
      while (j + 1 < idx.length && idx[j + 1].val === idx[i].val) j++
      const avg = (i + j) / 2 + 1
      for (let k = i; k <= j; k++) out[idx[k].i] = avg
      i = j + 1
    }
    return out
  }
  const rx = rank(x), ry = rank(y), n = x.length
  if (n < 3) return NaN
  const mx = rx.reduce((s, v) => s + v, 0) / n
  const my = ry.reduce((s, v) => s + v, 0) / n
  let num = 0, dx = 0, dy = 0
  for (let i = 0; i < n; i++) {
    num += (rx[i] - mx) * (ry[i] - my); dx += (rx[i] - mx) ** 2; dy += (ry[i] - my) ** 2
  }
  return dx && dy ? num / Math.sqrt(dx * dy) : NaN
}

const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length
const sd = (a: number[]) => {
  const m = mean(a)
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / Math.max(1, a.length - 1))
}

async function main() {
  console.log(`Rest-of-season backtest — ${SEASON}, weeks ${FIRST_WEEK}-${LAST_WEEK}\n`)

  const [rawProj, playersMap] = await Promise.all([
    get(`https://api.sleeper.app/projections/nfl/${SEASON}?season_type=regular`),
    get('https://api.sleeper.app/v1/players/nfl'),
  ])

  /* Preseason projected half-PPR points, by Sleeper id. This is the prior, and the only thing
     here that is a forecast rather than a fact. */
  const projEntries: [string, any][] = Array.isArray(rawProj)
    ? rawProj.map((e: any) => [String(e.player_id), e.stats ?? {}])
    : Object.entries(rawProj).map(([id, e]: [string, any]) => [id, e?.stats ?? e ?? {}])
  const projected: Record<string, number> = {}
  for (const [id, stats] of projEntries) {
    const pts = Number(stats?.pts_half_ppr)
    if (Number.isFinite(pts) && pts > 0) projected[id] = pts
  }

  const positionById: Record<string, string> = {}
  const teamById: Record<string, string> = {}
  for (const [id, pl] of Object.entries(playersMap as Record<string, any>)) {
    positionById[id] = (pl?.position ?? '').toUpperCase()
    teamById[id] = (pl?.team ?? '').toUpperCase()
  }

  /* Every week's actual lines, and every week's actual points. One fetch per week, reused by
     every candidate weight and every scored week. */
  const linesByWeek: SeasonLine[][] = []
  const actualByWeek: Record<string, number>[] = []
  const teamsByWeek: Set<string>[] = []
  for (let w = 1; w <= WEEKS; w++) {
    const payload = await get(
      `https://api.sleeper.app/stats/nfl/${SEASON}/${w}?season_type=regular`
      + '&position[]=QB&position[]=RB&position[]=WR&position[]=TE',
    )
    const lines = linesFromStats(payload, w)
    const played = lines.some((l) => l.points !== 0)
    linesByWeek.push(played ? lines : [])
    const pts: Record<string, number> = {}
    const teams = new Set<string>()
    for (const l of lines) { pts[l.playerKey] = l.points; if (l.team) teams.add(l.team) }
    actualByWeek.push(pts)
    teamsByWeek.push(teams)
    process.stdout.write(`\rloaded week ${w}/${WEEKS}`)
  }
  console.log('')

  /* Byes, derived from who did not appear rather than from a second schedule source: a team
     that played in some weeks and not in week w had its bye in week w. */
  const allTeams = new Set<string>()
  for (const t of teamsByWeek) for (const team of t) allTeams.add(team)
  const byeByTeam: Record<string, number> = {}
  for (const team of allTeams) {
    for (let w = 0; w < teamsByWeek.length; w++) {
      if (teamsByWeek[w].size && !teamsByWeek[w].has(team)) { byeByTeam[team] = w + 1; break }
    }
  }

  /** The board a manager would plausibly be looking at, chosen on preseason rank alone. */
  const universe: Record<string, string[]> = {}
  for (const pos of POSITIONS) {
    universe[pos] = Object.keys(projected)
      .filter((id) => positionById[id] === pos)
      .sort((a, b) => projected[b] - projected[a])
      .slice(0, DEPTH[pos])
  }

  // scores[pos][candidate] = one Spearman per scored week
  const scores: Record<string, Record<number, number[]>> = {}
  for (const pos of POSITIONS) {
    scores[pos] = {}
    for (const c of CANDIDATES) scores[pos][c] = []
  }

  for (let week = FIRST_WEEK; week <= LAST_WEEK; week++) {
    const lines = linesByWeek.slice(0, week - 1).flat()
    for (const pos of POSITIONS) {
      const ids = universe[pos]
      const seasonProjection = Object.fromEntries(ids.map((id) => [id, projected[id]]))
      const byeWeekByKey = Object.fromEntries(
        ids.map((id) => [id, byeByTeam[teamById[id]] ?? null]),
      )
      /* Truth: what he went on to score over the weeks that were still ahead. A player who
         was injured or benched scores near nothing, which is a real thing a board should have
         seen coming and no configuration can see PERFECTLY — it is noise shared equally by
         every candidate, not a thumb on the scale for any of them. */
      const truth = ids.map((id) => {
        let total = 0
        for (let w = week; w <= WEEKS; w++) total += actualByWeek[w - 1][id] ?? 0
        return total
      })

      for (const candidate of CANDIDATES) {
        const ros = buildRosPoints({
          seasonProjection,
          lines,
          currentWeek: week,
          byeWeekByKey,
          priorGamesByKey: Object.fromEntries(ids.map((id) => [id, candidate])),
        })
        const predicted = ids.map((id) => ros[id]?.pointsRos ?? 0)
        const s = spearman(predicted, truth)
        if (Number.isFinite(s)) scores[pos][candidate].push(s)
      }
    }
  }

  console.log(`\nSpearman(predicted rest-of-season, actual rest-of-season), mean over weeks ${FIRST_WEEK}-${LAST_WEEK}`)
  console.log(`shipped PRIOR_GAMES = ${PRIOR_GAMES}, season length ${SEASON_GAMES} games\n`)
  console.log('prior' + POSITIONS.map((p) => p.padStart(16)).join(''))
  for (const c of CANDIDATES) {
    const cells = POSITIONS.map((pos) => {
      const v = scores[pos][c]
      return `${mean(v).toFixed(3)}±${sd(v).toFixed(2)}`.padStart(16)
    })
    console.log(String(c).padEnd(5) + cells.join(''))
  }

  /*
   * Per-week detail, because a mean can be carried by a few late weeks where the sample is
   * large and the answer is easy. A change to the shipped constant should hold in the EARLY
   * weeks too — those are the ones where the prior is supposed to be protecting us.
   */
  console.log('\nWeek by week, best candidate vs shipped:')
  for (const pos of POSITIONS) {
    const ranked = CANDIDATES.map((c) => ({ c, m: mean(scores[pos][c]) })).sort((a, b) => b.m - a.m)
    const best = ranked[0].c
    if (best === PRIOR_GAMES) { console.log(`  ${pos}: shipped weight already best`); continue }
    const cells = scores[pos][best].map((v, i) => {
      const d = v - scores[pos][PRIOR_GAMES][i]
      return `w${i + FIRST_WEEK}:${d >= 0 ? '+' : ''}${d.toFixed(2)}`
    })
    console.log(`  ${pos} (${best} vs ${PRIOR_GAMES}): ${cells.join(' ')}`)
  }

  console.log('\nBest weight per position, and whether the win is real:')
  for (const pos of POSITIONS) {
    const ranked = CANDIDATES.map((c) => ({ c, m: mean(scores[pos][c]) })).sort((a, b) => b.m - a.m)
    const best = ranked[0]
    const shipped = mean(scores[pos][PRIOR_GAMES])
    /* Paired by week: the same weeks, the same players, two weights. Counting the weeks each
       one wins says more than the gap between two averages. */
    const beats = scores[pos][best.c].filter((v, i) => v > scores[pos][PRIOR_GAMES][i]).length
    const n = scores[pos][best.c].length
    console.log(
      `  ${pos}: best ${String(best.c).padStart(2)} (${best.m.toFixed(3)})   `
      + `shipped ${PRIOR_GAMES} (${shipped.toFixed(3)})   `
      + `gain ${(best.m - shipped >= 0 ? '+' : '') + (best.m - shipped).toFixed(3)}   `
      + `beats shipped in ${beats}/${n} weeks`,
    )
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
