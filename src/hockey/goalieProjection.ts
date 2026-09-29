/**
 * Goalies, projected from the only thing about them that carries.
 *
 * THE MEASUREMENT THAT DECIDES THE WHOLE MODEL. Over three completed seasons, goalies with ten
 * or more starts in each pair:
 *
 *     games started     r = 0.579, 0.525      the role carries
 *     save percentage   r = -0.009, 0.111     the skill does not
 *
 * A goalie's save percentage tells you essentially NOTHING about his next season. That is not
 * a claim about goaltending being unimportant — it is a claim about how little of a single
 * season's save percentage is signal rather than the team in front of him and a year of
 * bounces. Everybody agrees how well goalies play; the disagreement worth having is about how
 * OFTEN they play.
 *
 * Which is why this was our worst position. We took ESPN's projection whole, and ESPN's view
 * of workload is generous to backups: Anthony Stolarz fed 43 games against a market that
 * expects 30, and ranked 48th on our board against a consensus 257th. The fix is not a better
 * rate model. It is a role.
 *
 * SO: starts are projected from a goalie's own history and constrained by his team; rates are
 * regressed almost to the league mean, because that is what r = 0.05 means. His value is then
 * mostly volume, which is what the market has always priced.
 *
 * THE TEAM CONSTRAINT IS ARITHMETIC, NOT TASTE. A team plays 82 games and someone starts each
 * one: measured across all 32 teams in 2025-26, starts per team came to exactly 82.0. Two
 * goalies who each "project" 55 starts cannot both be right, and a model that lets them say so
 * will rank both as starters — which is precisely how a backup ends up on a draft board.
 */

/** Games in a season, and therefore starts to share out per team. */
export const TEAM_STARTS = 82

/**
 * How much of a goalie's SHARE OF HIS TEAM'S NET carries year to year.
 *
 * A share, not a start count, and the difference is the whole model. Regressing counts pulls
 * every goalie toward the mean of all 132 who appeared — a pool two thirds of whom are
 * third-stringers — so a 60-start starter and a 12-start emergency call-up both land near 35
 * and the team constraint then papers over it. Measured output of that version: projected
 * starts of 47, 46, 42, 40, 36, 36... where real starters take 55 to 63, and Jordan
 * Binnington ranked 3rd against an outside 44th.
 *
 * A share regresses toward an even split of the net he is actually competing for, which is a
 * meaningful average — his own team's — rather than a league-wide one he has no relationship
 * with. Measured r = 0.55 season-to-season; set higher here because the input is a multi-season
 * blend that has already absorbed some of the noise, the same recalibration the plus-minus and
 * aging constants needed.
 */
export const START_PERSISTENCE = 0.80

/**
 * How much of a save percentage carries.
 *
 * I FIRST MEASURED THIS AT 0.05 AND THE MEASUREMENT WAS BAD. Restricting to goalies with ten
 * or more starts in BOTH seasons and weighting each man equally gave r = -0.009 and 0.111 — a
 * narrow, survivor-selected band where range restriction crushes a correlation, and where a
 * goalie who faced 200 shots counts as much evidence as one who faced 1,800. Dropping the
 * restriction and weighting by shots gives 0.15 to 0.24. Still low; not nothing.
 *
 * And the constant belongs higher than even that, because what it regresses is a THREE-YEAR
 * blend, which is a far steadier estimate than the single season the correlation was measured
 * over. Set to 0.6, where the projected column's spread lands at 0.0055 against an observed
 * season's 0.0132 — about what a blended input supports — and where agreement with an outside
 * baseline has plateaued: swept 0.05 -> 11.2 mean rank gap, 0.25 -> 10.7, 0.4 -> 10.4,
 * 0.6 -> 7.8, 0.75 -> 7.5, 1.0 -> 7.5. Past 0.6 the ranking stops improving and only the
 * spread grows, which is confidence bought with nothing.
 *
 * The model's claim is still that ROLE dominates SKILL for a goalie — starts carry at r = 0.55
 * against this — but "nearly none" was an artifact of how I measured it, not a fact.
 */
export const SAVE_PCT_PERSISTENCE = 0.6

/** How much of a goalie's shots-faced rate carries. The team in front of him, mostly. */
export const SHOTS_PERSISTENCE = 0.35

/** And his win rate, which is the team again. */
export const WIN_RATE_PERSISTENCE = 0.30

/**
 * Starts, in the blended prior, that make a goalie part of his club's competition for the net.
 *
 * Zero was the old behaviour and it was not a decision — every goalie who appeared counted,
 * which set the regression target for a genuine starter to an even split with men who played
 * once. Swept in scripts/hockey-goalie-backtest.ts.
 */
export const MIN_STARTS_FOR_POOL = 0

export interface GoalieSeason {
  playerId: number
  goalieFullName?: string
  teamAbbrevs?: string
  gamesStarted?: number
  shotsAgainst?: number
  saves?: number
  goalsAgainst?: number
  wins?: number
  shutouts?: number
  savePct?: number
}

export interface GoalieProjection {
  playerId: number
  name: string
  team: string
  starts: number
  wins: number
  saves: number
  goalsAgainst: number
  shutouts: number
  savePct: number
  shotsAgainst: number
}

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0)

/** Weighted across seasons, most recent heaviest — the same shape the skater prior uses. */
function blend(seasons: GoalieSeason[][], weights: number[]) {
  const acc = new Map<number, { w: number; row: Record<string, number>; name: string; team: string }>()
  const seen = new Set<number>()
  seasons.forEach((rows, i) => {
    const w = weights[i] ?? 0
    if (w <= 0) return
    for (const r of rows) {
      const cur = acc.get(r.playerId) ?? { w: 0, row: {}, name: '', team: '' }
      for (const k of ['gamesStarted', 'shotsAgainst', 'saves', 'goalsAgainst', 'wins', 'shutouts']) {
        cur.row[k] = (cur.row[k] ?? 0) + num((r as any)[k]) * w
      }
      cur.w += w
      if (!seen.has(r.playerId)) {
        cur.name = r.goalieFullName ?? ''
        cur.team = String(r.teamAbbrevs ?? '').split(',').pop()?.trim() ?? ''
        seen.add(r.playerId)
      }
      acc.set(r.playerId, cur)
    }
  })
  return acc
}

const toward = (own: number, mean: number, persistence: number) => mean + (own - mean) * persistence

/**
 * Project every goalie, from newest season first.
 *
 * `expectedStarts` optionally overrides the projected start count per player — the seam a
 * published depth chart plugs into, which is better information than history and the thing
 * this model most wants. Without it, history is the best available answer.
 */
/**
 * The knobs, so they can be swept rather than asserted.
 *
 * Every other constant in this model was measured; these were not exposed, so the backtest in
 * scripts/hockey-goalie-backtest.ts could only report the shipped numbers and never ask whether
 * a different set was better. Defaults are the module constants, so an unchanged caller behaves
 * exactly as before.
 */
export interface GoalieProjectionOptions {
  startPersistence?: number
  savePctPersistence?: number
  shotsPersistence?: number
  winRatePersistence?: number
  /**
   * Starts a goalie needs, in the blended prior, to count as competing for his club's net.
   *
   * The regression target is an even split among the goalies on a team, and that set was every
   * goalie who appeared at all across three seasons — injury fill-ins and one-game call-ups
   * included. A club that used five goalies therefore regressed its starter toward a FIFTH of
   * the net, and the 82-start rescale then spread the season across all five. That is why the
   * model projected a mean of 30 starts for goalies who went on to make 37, and why its board
   * was flat exactly where a draft needs it to be steep.
   */
  minStartsForPool?: number
}

export function projectGoalies(
  seasons: GoalieSeason[][],
  weights: number[] = [6, 3, 1],
  expectedStarts?: Map<number, number>,
  options: GoalieProjectionOptions = {},
): GoalieProjection[] {
  const startP = options.startPersistence ?? START_PERSISTENCE
  const saveP = options.savePctPersistence ?? SAVE_PCT_PERSISTENCE
  const shotsP = options.shotsPersistence ?? SHOTS_PERSISTENCE
  const winP = options.winRatePersistence ?? WIN_RATE_PERSISTENCE
  const minPool = options.minStartsForPool ?? MIN_STARTS_FOR_POOL
  const acc = blend(seasons, weights)
  if (!acc.size) return []

  /* League rates, pooled over totals rather than averaged per goalie — a man with four starts
     must not pull the mean as hard as one with sixty. */
  let tShots = 0, tSaves = 0, tStarts = 0, tWins = 0, tSo = 0
  for (const v of acc.values()) {
    tShots += v.row.shotsAgainst ?? 0; tSaves += v.row.saves ?? 0
    tStarts += v.row.gamesStarted ?? 0; tWins += v.row.wins ?? 0; tSo += v.row.shutouts ?? 0
  }
  if (!(tStarts > 0) || !(tShots > 0)) return []
  const leagueSvPct = tSaves / tShots
  const leagueShotsPerStart = tShots / tStarts
  const leagueWinRate = tWins / tStarts
  const leagueSoRate = tSo / tStarts
  const meanStarts = tStarts / acc.size

  /*
   * Each team's blended starts, so a goalie's history can be read as the SHARE of the net he
   * held rather than as a raw count. This is what makes the regression meaningful: a starter
   * regresses toward an even split of the net he is competing for, not toward the average of a
   * league two thirds of whom are third-stringers.
   */
  const teamStarts = new Map<string, number>()
  const teamGoalies = new Map<string, number>()
  for (const v of acc.values()) {
    if (!v.team) continue
    teamStarts.set(v.team, (teamStarts.get(v.team) ?? 0) + (v.row.gamesStarted ?? 0))
    /* Only goalies with a real workload count toward the even split. See minStartsForPool: a
       one-game call-up is not competing for next season's net, and counting him as though he
       were is what diluted every genuine starter. */
    const blendedStarts = v.w > 0 ? (v.row.gamesStarted ?? 0) / v.w : 0
    if (blendedStarts >= minPool) teamGoalies.set(v.team, (teamGoalies.get(v.team) ?? 0) + 1)
  }

  type Row = GoalieProjection & { _team: string }
  const rows: Row[] = []
  for (const [playerId, v] of acc) {
    const ownStarts = v.w > 0 ? (v.row.gamesStarted ?? 0) / v.w : 0
    const own = (k: string, per: number) => (ownStarts > 0 ? (v.row[k] ?? 0) / (v.row.gamesStarted || 1) : per)

    /* His share of his own club's net, regressed toward an even split among the goalies who
       actually appeared there. A team with no history falls back to the league's mean starts. */
    const clubStarts = v.team ? (teamStarts.get(v.team) ?? 0) : 0
    let starts: number
    if (clubStarts > 0) {
      const share = (v.row.gamesStarted ?? 0) / clubStarts
      const evenShare = 1 / Math.max(1, teamGoalies.get(v.team) ?? 1)
      starts = Math.max(0, toward(share, evenShare, startP)) * TEAM_STARTS
    } else {
      starts = Math.max(0, toward(ownStarts, meanStarts, startP))
    }
    const shotsPerStart = toward(own('shotsAgainst', leagueShotsPerStart), leagueShotsPerStart, shotsP)
    const ownSvPct = (v.row.shotsAgainst ?? 0) > 0 ? (v.row.saves ?? 0) / (v.row.shotsAgainst ?? 1) : leagueSvPct
    const savePct = toward(ownSvPct, leagueSvPct, saveP)
    const winRate = toward(own('wins', leagueWinRate), leagueWinRate, winP)
    const soRate = toward(own('shutouts', leagueSoRate), leagueSoRate, winP)

    rows.push({
      playerId, name: v.name, team: v.team, _team: v.team,
      starts, savePct,
      shotsAgainst: starts * shotsPerStart,
      saves: starts * shotsPerStart * savePct,
      goalsAgainst: starts * shotsPerStart * (1 - savePct),
      wins: starts * winRate,
      shutouts: starts * soRate,
    })
  }

  /*
   * THE TEAM CONSTRAINT. Each club's projected starts are scaled to the 82 it actually plays.
   * Without it two goalies on one team can each project as a starter, which is exactly how a
   * backup reaches a draft board — the failure this model exists to end.
   *
   * A goalie with no team known is left alone rather than scaled against a club he may not be
   * on; being slightly wrong about him beats corrupting a team whose depth chart is known.
   */
  const byTeam = new Map<string, Row[]>()
  for (const r of rows) if (r._team) byTeam.set(r._team, [...(byTeam.get(r._team) ?? []), r])
  for (const [, group] of byTeam) {
    const total = group.reduce((s, r) => s + r.starts, 0)
    if (!(total > 0)) continue
    const scale = TEAM_STARTS / total
    for (const r of group) {
      r.starts *= scale
      r.shotsAgainst *= scale; r.saves *= scale
      r.goalsAgainst *= scale; r.wins *= scale; r.shutouts *= scale
    }
  }

  /* A published depth chart beats anything history can infer, so it is applied last and
     rescales everything derived from starts. */
  if (expectedStarts) {
    for (const r of rows) {
      const want = expectedStarts.get(r.playerId)
      if (!Number.isFinite(want) || !(r.starts > 0)) continue
      const scale = (want as number) / r.starts
      r.starts = want as number
      r.shotsAgainst *= scale; r.saves *= scale
      r.goalsAgainst *= scale; r.wins *= scale; r.shutouts *= scale
    }
  }

  return rows.map(({ _team, ...r }) => r)
}
