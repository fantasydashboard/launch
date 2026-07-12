/**
 * Pure assembler: turns the hand-entered backfill form fields into a normalized
 * `HistorySeason` payload, so the merge + builders consume it exactly like a
 * platform-fetched season. Deterministic, no I/O.
 *
 * Manual teams have no owner/manager id (these years predate app membership), so
 * their cross-season identity key is the normalized name — matching Yahoo's name
 * fallback, which lets manual entries link to name-keyed auto seasons where names
 * agree (documented limitation: they won't link to id-keyed ESPN/Sleeper teams).
 */
import type { HistorySeason, HistoryTeam } from './types'

export interface ManualStandingRow {
  name: string
  wins?: number
  losses?: number
  ties?: number
}

export interface ManualSeasonInput {
  season: number
  champion: string
  runnerUp?: string
  /** Ordered finishing list; index 0 = 1st place. When present, overrides champion/runnerUp. */
  standings?: ManualStandingRow[]
}

const nameKey = (name: string) => 'n:' + name.trim().toLowerCase()
const nonNeg = (n: unknown) => Math.max(0, Number(n) || 0)

function manualTeam(name: string, rank: number, rec?: ManualStandingRow): HistoryTeam {
  return {
    teamKey: nameKey(name),
    teamName: name.trim(),
    wins: nonNeg(rec?.wins),
    losses: nonNeg(rec?.losses),
    ties: nonNeg(rec?.ties),
    pointsFor: 0,
    rank,
    madePlayoffs: false,
    champion: rank === 1,
  }
}

export function buildManualSeason(input: ManualSeasonInput): HistorySeason {
  const teams: HistoryTeam[] = []
  if (input.standings && input.standings.length) {
    for (const row of input.standings) {
      if (!row.name || !row.name.trim()) continue
      teams.push(manualTeam(row.name, teams.length + 1, row))
    }
  } else {
    teams.push(manualTeam(input.champion, 1))
    if (input.runnerUp && input.runnerUp.trim()) teams.push(manualTeam(input.runnerUp, 2))
  }
  return { season: input.season, teams }
}
