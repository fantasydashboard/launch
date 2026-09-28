import type { SkaterRate } from './nhlRates'
import { regressPlusMinusTotals } from './plusMinusRegression'
import { ratesToProjection } from './ratesToProjection'
import type { HockeyProjection } from './hockeyValue'

/**
 * The single hockey projection every surface reads, assembled from the two feeds that each
 * know half of it.
 *
 * WHY THIS EXISTS. Hockey had two projection sources and they disagreed. ESPN's feed powered
 * Today, My Team and the Draft Board; the NHL rate model powered Rankings alone. Measured
 * against each other on 318 overlapping skaters they ranked players at a Spearman correlation
 * of 0.808 — less agreement than our football board had with an outside analyst's table — with
 * 64 players more than twenty points apart. Kucherov was a 129-point player on one page and an
 * 81-point player on another. That is not two opinions, it is one product contradicting
 * itself, and a manager who checked both would have no way to tell which page to believe.
 *
 * WHAT EACH FEED IS ACTUALLY GOOD FOR.
 *
 * The NHL gives measured production for 940 skaters. That is the rate, and it is ours: shrunk
 * toward a positional baseline, confidence-weighted, the same engine the football board uses.
 *
 * ESPN gives four things the NHL cannot: an average draft position, an auction value, an
 * ownership percentage and an injury designation — all statements about what the ROOM thinks
 * and what a player's status IS, neither of which is derivable from last season's box scores.
 *
 * And it gives a fifth, which is the one that changes the numbers: an expected games-played.
 * Makar 78 rather than 82, Bedard 64. Projecting every skater over a full 82 says all of them
 * will be healthy and in the lineup all year, which is false about a predictable fraction and
 * most false about the players a manager is actually deciding between. A rate can be measured
 * from last season; an availability cannot. So the rate stays entirely ours and only the
 * horizon is borrowed.
 *
 * GOALIES ARE THE DOCUMENTED EXCEPTION. There is no goalie rate model — a goalie's fantasy
 * value is dominated by how often his coach starts him, which is not a rate that regresses —
 * so a goalie keeps ESPN's projection unchanged. That is a real seam and it is named here
 * rather than hidden. It costs little because goalies are standardised in their own pool and
 * never compete with a skater for a z-score.
 *
 * KEYS ARE ESPN'S WHEREVER ESPN HAS ONE, and that is not cosmetic: the draft board learns who
 * has been taken from ESPN's own draft feed, keyed by ESPN player id. Re-keying the projection
 * to NHL ids would silently break the join and the board would show drafted players as
 * available.
 */

/** A row from `/api/hockey-projections`. */
/**
 * How far a games-played projection moves toward the player's own record.
 *
 * ZERO, MEASURED. The premise was sound: ESPN answers "if healthy", putting 32% of our skaters
 * at a full 82 games when the last three completed seasons delivered 14%, 16% and 15%. The cap
 * concentrates it further, since everyone projected at 82 or more lands on exactly 82.
 *
 * Correcting it toward each player's own games-per-season made the board WORSE, monotonically,
 * exactly where it matters — swept against a points-league baseline, mean rank error over its
 * top ten went 3.4 / 3.7 / 3.8 / 4.5 as this moved 0 / 0.25 / 0.5 / 1, and the top thirty
 * moved the same way.
 *
 * WHY, AND IT IS WORTH KNOWING: a roughly uniform inflation in games cancels out of a RANKING.
 * Every player gains volume together and the order survives. The gaps that looked like
 * availability were not — Ovechkin is 82 games against the baseline's 78, a rounding error,
 * while his projected points are 71 against their 54. That is a RATE disagreement, which is
 * an aging curve, not an availability model.
 *
 * SO THE RANKING IS FINE AND THE TOTALS ARE NOT. Anything that shows a projected season total
 * is overstating it for the durable veterans, even though their position on the board is
 * right. Left at 0 with the lever intact because that second problem is real and unfixed.
 */
export const AVAILABILITY_W = 0

export interface EspnHockeyPlayer {
  playerKey: string
  name: string
  /** C | LW | RW | D | G */
  position: string
  /**
   * EVERY position he can be started at, his default first.
   *
   * Hockey players routinely have more than one and we were ranking each at exactly one, so a
   * left-wing board silently excluded anybody ESPN files under centre. 74 of 454 projected
   * players are multi-eligible. Absent or empty means "just his default" — never assume.
   */
  eligible?: string[]
  /** ESPN's own projection. Read for GP; otherwise used only for goalies. */
  stats: Record<string, number>
  adp?: number | null
  auctionValue?: number | null
  percentOwned?: number | null
  injuryStatus?: string | null
}

export interface MergeInput {
  espn: EspnHockeyPlayer[]
  rates: SkaterRate[]
  /** Unified stat keys the league scores, so `missing` is about this league. */
  leagueKeys?: string[]
  /**
   * The horizon for a skater ESPN has no expected games for. A full season, because the
   * alternative — assuming a player ESPN never listed is also a player who will miss time —
   * invents an injury out of an absence.
   */
  fullSeason?: number
  /**
   * playerId -> his own weighted games per season, from blendSeasons. Optional: without it the
   * feed's number stands alone, which is the behaviour this replaced.
   */
  historyGames?: Map<number, number>
}

export interface MergeResult {
  projections: Record<string, HockeyProjection>
  /** Lower-cased display name -> playerKey, for a free agent the roster pool has no key for. */
  keyByName: Record<string, string>
  /** playerKey -> display name. */
  namesByKey: Record<string, string>
  /** playerKey -> the rate behind it, for the columns only the rankings board shows. */
  rateByKey: Record<string, SkaterRate>
  /**
   * playerKey -> the team he is on NOW, for a crest beside a name.
   *
   * `teamAbbrevs` lists every team a player appeared for — "COL,CAR" after a trade — and the
   * one that matters is the last of them. Absent for a player only ESPN knows, since ESPN
   * gives a numeric proTeamId rather than the abbreviation a logo lookup needs.
   */
  teamByKey: Record<string, string>
  /** League categories the feed cannot fill. */
  missing: string[]
  /** How many rate rows found an ESPN row. The join's own health, reportable. */
  matched: number
}

/** NHL position codes as ESPN spells them. */
const ESPN_POSITION: Record<string, string> = { C: 'C', L: 'LW', R: 'RW', D: 'D' }

/**
 * A name reduced to what two feeds can agree on.
 *
 * Diacritics because one feed writes Nazem Kadri's teammates with them and the other does not;
 * punctuation because "T.J. Oshie" and "TJ Oshie" are the same man. Nothing clever beyond that
 * — a fuzzy matcher here would join two different players under one key, which is a worse
 * failure than leaving one unmatched.
 */
export function normalizeName(name: string): string {
  return String(name ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Name AND position, never name alone.
 *
 * There are two Elias Petterssons in the NHL — a centre who scored 51 points and a defenceman
 * who scored 10 — and the surfaces that resolved players by lower-cased name were handing
 * whichever one the map happened to keep last. A manager looking up his first-round centre
 * could be shown a third-pairing defenceman's value under the right name, with nothing on the
 * page to suggest anything had gone wrong.
 */
function matchKey(name: string, position: string): string {
  return `${normalizeName(name)}|${position}`
}

export function mergeHockeyProjections(input: MergeInput): MergeResult {
  const { espn, rates, leagueKeys = [], fullSeason = 82, historyGames } = input

  const espnByMatch = new Map<string, EspnHockeyPlayer>()
  for (const p of espn) espnByMatch.set(matchKey(p.name, p.position), p)

  /* The join, done once so the games lookup and the metadata lookup cannot disagree. */
  const espnFor = new Map<number, EspnHockeyPlayer>()
  for (const r of rates) {
    const pos = ESPN_POSITION[r.position]
    if (!pos) continue
    const hit = espnByMatch.get(matchKey(r.name, pos))
    if (hit) espnFor.set(r.playerId, hit)
  }

  const gamesFor = (r: SkaterRate) => {
    const gp = espnFor.get(r.playerId)?.stats?.GP
    /* Clamped to a real season. A feed that publishes 0 or 90 games for somebody should not be
       able to erase him from the board or hand him a tenth of a season nobody else gets. */
    const espnGames = Number.isFinite(gp) && (gp as number) > 0
      ? Math.min(fullSeason, gp as number)
      : fullSeason

    /*
     * ESPN ANSWERS "IF HEALTHY", AND A DRAFTER IS NOT BUYING "IF".
     *
     * Measured against the last three completed seasons, 14%, 16% and 15% of skaters who
     * played at all reached 82 games. ESPN's projections put 32% of our board there — twice
     * reality — and the clamp concentrates it, since everyone it projects at 82 or more piles
     * onto exactly 82. The players collecting that free volume are the established veterans a
     * drafter pays most for, and every counting stat they own is scaled by it.
     *
     * The player's own record is the correction: somebody who has played 61, 62 and 60 games
     * is not an 82-game player because a feed says so. `typicalGames` is his weighted games
     * per season over the same three years the rate prior uses.
     *
     * Blended rather than substituted, because history is not destiny either — a career backup
     * promoted to a starting job is exactly the case his own record gets wrong. AVAILABILITY_W
     * is how far toward his record we move, and it is swept, not chosen.
     */
    const history = historyGames?.get(r.playerId)
    if (!Number.isFinite(history) || !(history! > 0)) return espnGames
    const blended = espnGames * (1 - AVAILABILITY_W) + (history as number) * AVAILABILITY_W
    return Math.max(1, Math.min(fullSeason, blended))
  }

  const { projections, missing } = ratesToProjection(rates, gamesFor, leagueKeys)

  /*
   * Plus-minus, regressed on the TOTALS — see src/hockey/plusMinusRegression.ts for why this
   * is the column that needs it (year-over-year r of 0.32) and why it belongs here rather than
   * on the rates (a per-player games factor stops it being a uniform transform, which a
   * category board's z-scores then feel).
   */
  regressPlusMinusTotals(projections as any)

  const out: Record<string, HockeyProjection> = {}
  const keyByName: Record<string, string> = {}
  const namesByKey: Record<string, string> = {}
  const rateByKey: Record<string, SkaterRate> = {}
  const teamByKey: Record<string, string> = {}
  const claimed = new Set<string>()

  for (const r of rates) {
    const built = projections[String(r.playerId)]
    if (!built) continue
    const e = espnFor.get(r.playerId)
    /* An unmatched skater keeps a key of his own rather than borrowing an id from a namespace
       he is not in. The prefix is what stops an NHL id from ever colliding with an ESPN one. */
    const key = e ? e.playerKey : `nhl:${r.playerId}`
    if (e) claimed.add(e.playerKey)
    out[key] = {
      ...built,
      playerKey: key,
      position: e?.position ?? ESPN_POSITION[r.position] ?? r.position,
      eligible: e?.eligible,
      adp: e?.adp ?? null,
      auctionValue: e?.auctionValue ?? null,
      percentOwned: e?.percentOwned ?? null,
      injuryStatus: e?.injuryStatus ?? null,
    }
    keyByName[normalizeName(r.name)] = key
    namesByKey[key] = r.name
    rateByKey[key] = r
    const team = String(r.team ?? '').split(',').pop()?.trim()
    if (team) teamByKey[key] = team
  }

  /*
   * Everyone ESPN lists that the rate model did not claim — goalies above all, plus players
   * with no NHL record to rate. They keep ESPN's own projection, because dropping them would
   * empty the goalie half of a draft board to make a point about where numbers come from.
   */
  for (const p of espn) {
    if (claimed.has(p.playerKey)) continue
    out[p.playerKey] = {
      playerKey: p.playerKey,
      position: p.position,
      stats: p.stats ?? {},
      adp: p.adp ?? null,
      auctionValue: p.auctionValue ?? null,
      percentOwned: p.percentOwned ?? null,
      injuryStatus: p.injuryStatus ?? null,
    }
    const n = normalizeName(p.name)
    /* A rate-model row wins the name slot: it is the same player with a better number. */
    if (!keyByName[n]) keyByName[n] = p.playerKey
    namesByKey[p.playerKey] = p.name
  }

  return { projections: out, keyByName, namesByKey, rateByKey, teamByKey, missing, matched: espnFor.size }
}
