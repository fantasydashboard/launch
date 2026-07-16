import type { GradedDraft, GradedPick, DraftReport, DraftHighlight, TeamGradeRow } from './types'

const STEAL_VERDICTS = new Set(['JACKPOT', 'STEAL'])
const BUST_VERDICTS = new Set(['BUST', 'DISASTER'])

const SPREAD_GRADES = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F']
function spreadGrade(rank: number, numTeams: number): string {
  if (numTeams <= 1) return 'A'
  const pos = (rank - 1) / (numTeams - 1)
  return SPREAD_GRADES[Math.round(pos * (SPREAD_GRADES.length - 1))]
}
const TIER_RANK: Record<string, number> = { ELITE: 0, STARTER: 1, BENCH: 2, REPLACEMENT: 3, WAIVER: 4 }

function toHighlight(p: GradedPick): DraftHighlight {
  return {
    teamKey: p.teamKey, teamName: p.teamName, teamLogo: p.teamLogo,
    playerName: p.playerName, position: p.position, round: p.round, overallPick: p.overallPick,
    grade: p.grade, score: p.score, verdict: p.verdict,
    valueLabel: `Rd ${p.round} · ${p.tierMovement}`,
    headshot: p.headshot, proTeam: p.proTeam,
  }
}

/** Pure highlight selection + enrichment over a normalized, pre-graded draft. Never throws. */
export function buildDraftReport(draft: GradedDraft, season: number): DraftReport {
  const { picks, teams, numTeams, myTeamKey } = draft
  const meanScore = teams.length ? teams.reduce((s, t) => s + t.gradeScore, 0) / teams.length : 0

  const steal = picks.length ? toHighlight([...picks].sort((a, b) => b.score - a.score)[0]) : null
  const early = picks.filter((p) => p.round <= 5)
  const bustPool = early.length ? early : picks
  const bust = bustPool.length ? toHighlight([...bustPool].sort((a, b) => a.score - b.score)[0]) : null

  const topSteals = [...picks].filter((p) => p.score > 0).sort((a, b) => b.score - a.score).slice(0, 3).map(toHighlight)
  const topReaches = [...picks].filter((p) => p.score < 0).sort((a, b) => a.score - b.score).slice(0, 3).map(toHighlight)

  const picksByTeam = new Map<string, GradedPick[]>()
  for (const p of picks) {
    const arr = picksByTeam.get(p.teamKey)
    if (arr) arr.push(p)
    else picksByTeam.set(p.teamKey, [p])
  }

  const teamGrades: TeamGradeRow[] = teams.map((t) => {
    const tp = picksByTeam.get(t.teamKey) ?? []
    return {
      teamKey: t.teamKey, teamName: t.teamName, teamLogo: t.teamLogo,
      grade: spreadGrade(t.rank, teams.length), gradeScore: t.gradeScore, rank: t.rank,
      isMe: myTeamKey != null && t.teamKey === myTeamKey,
      bestPick: tp.length ? toHighlight([...tp].sort((a, b) => b.score - a.score)[0]) : null,
      steals: tp.filter((p) => STEAL_VERDICTS.has(p.verdict)).length,
      busts: tp.filter((p) => BUST_VERDICTS.has(p.verdict)).length,
      scoreGap: Math.round(t.gradeScore - meanScore),
    }
  })

  const bestDrafter = teamGrades[0] ?? null
  const worstDrafter = teamGrades.length ? teamGrades[teamGrades.length - 1] : null

  const topKeepers = (draft.keepers ?? [])
    .filter((k) => k.finishedTier === 'ELITE' || k.finishedTier === 'STARTER')
    .sort((a, b) =>
      (TIER_RANK[a.finishedTier] ?? 9) - (TIER_RANK[b.finishedTier] ?? 9) ||
      b.round - a.round ||
      b.points - a.points,
    )
    .slice(0, 5)

  let mySpotlight: DraftReport['mySpotlight'] = null
  if (myTeamKey != null) {
    const me = teamGrades.find((t) => t.teamKey === myTeamKey)
    if (me) {
      const mine = picks.filter((p) => p.teamKey === myTeamKey)
      const byScoreDesc = [...mine].sort((a, b) => b.score - a.score)
      const byScoreAsc = [...mine].sort((a, b) => a.score - b.score)
      const bestPick = mine.length ? toHighlight(byScoreDesc[0]) : null
      const worstPick = mine.length && BUST_VERDICTS.has(byScoreAsc[0].verdict) ? toHighlight(byScoreAsc[0]) : null
      const mySteals = mine.filter((p) => STEAL_VERDICTS.has(p.verdict)).sort((a, b) => b.score - a.score)
      const lowest = mine.length ? byScoreAsc[0] : null
      const myBust = lowest && BUST_VERDICTS.has(lowest.verdict) ? lowest : null
      let narrative: string
      if (mySteals.length) {
        const lead = mySteals[0]
        narrative = `${mySteals.length} steal${mySteals.length > 1 ? 's' : ''}, led by ${lead.playerName} (Rd ${lead.round} · ${lead.tierMovement}).`
        if (myBust) narrative += ` Your biggest miss: ${myBust.playerName} (Rd ${myBust.round} · ${myBust.tierMovement}).`
      } else if (myBust) {
        narrative = `A quiet draft — your roughest pick was ${myBust.playerName} (Rd ${myBust.round} · ${myBust.tierMovement}).`
      } else {
        narrative = 'A steady, no-drama draft.'
      }
      mySpotlight = { grade: me.grade, rank: me.rank, narrative, bestPick, worstPick }
    }
  }

  return {
    season, teamCount: numTeams,
    steal, bust, topSteals, topReaches, topKeepers,
    bestDrafter, worstDrafter, teamGrades,
    keeperCount: draft.keeperCount ?? 0,
    mySpotlight,
  }
}
