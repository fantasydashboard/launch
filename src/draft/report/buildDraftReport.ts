import type { GradedDraft, GradedPick, DraftReport, DraftHighlight, TeamGradeRow } from './types'

function toHighlight(p: GradedPick): DraftHighlight {
  return {
    teamKey: p.teamKey, teamName: p.teamName, teamLogo: p.teamLogo,
    playerName: p.playerName, position: p.position, round: p.round, overallPick: p.overallPick,
    grade: p.grade, score: p.score, verdict: p.verdict,
    valueLabel: `Rd ${p.round} · ${p.tierMovement}`,
  }
}

/** Pure highlight selection over a normalized, pre-graded draft. Never throws. */
export function buildDraftReport(draft: GradedDraft, season: number): DraftReport {
  const { picks, teams, numTeams, myTeamKey } = draft

  const steal = picks.length
    ? toHighlight([...picks].sort((a, b) => b.score - a.score)[0])
    : null

  const early = picks.filter((p) => p.round <= 5)
  const bustPool = early.length ? early : picks
  const bust = bustPool.length
    ? toHighlight([...bustPool].sort((a, b) => a.score - b.score)[0])
    : null

  const teamGrades: TeamGradeRow[] = teams.map((t) => ({
    teamKey: t.teamKey, teamName: t.teamName, teamLogo: t.teamLogo,
    grade: t.grade, gradeScore: t.gradeScore, rank: t.rank,
    isMe: myTeamKey != null && t.teamKey === myTeamKey,
  }))

  const bestDrafter = teamGrades[0] ?? null
  const worstDrafter = teamGrades.length ? teamGrades[teamGrades.length - 1] : null

  let mySpotlight: DraftReport['mySpotlight'] = null
  if (myTeamKey != null) {
    const me = teamGrades.find((t) => t.teamKey === myTeamKey)
    if (me) {
      const mine = picks.filter((p) => p.teamKey === myTeamKey)
      const bestPick = mine.length ? toHighlight([...mine].sort((a, b) => b.score - a.score)[0]) : null
      const worstPick = mine.length ? toHighlight([...mine].sort((a, b) => a.score - b.score)[0]) : null
      mySpotlight = { grade: me.grade, rank: me.rank, bestPick, worstPick }
    }
  }

  return {
    season, teamCount: numTeams,
    steal, bust, bestDrafter, worstDrafter, teamGrades, mySpotlight,
  }
}
