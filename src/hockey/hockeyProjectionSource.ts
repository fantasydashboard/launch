import type { SkaterRate } from './nhlRates'
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
export interface EspnHockeyPlayer {
  playerKey: string
  name: string
  /** C | LW | RW | D | G */
  position: string
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
  const { espn, rates, leagueKeys = [], fullSeason = 82 } = input

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
    return Number.isFinite(gp) && (gp as number) > 0
      ? Math.min(fullSeason, gp as number)
      : fullSeason
  }

  const { projections, missing } = ratesToProjection(rates, gamesFor, leagueKeys)

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
