export interface GradedPick {
  teamKey: string
  teamName: string
  teamLogo?: string
  playerName: string
  position: string
  round: number
  overallPick: number
  score: number
  grade: string
  verdict: string
  tierMovement: string
  draftedTier: string
  finishedTier: string
}
export interface GradedTeam {
  teamKey: string
  teamName: string
  teamLogo?: string
  gradeScore: number
  grade: string
  rank: number
}
export interface GradedDraft {
  picks: GradedPick[]
  teams: GradedTeam[]
  numTeams: number
  myTeamKey: string | null
}
export interface DraftHighlight {
  teamKey: string
  teamName: string
  teamLogo?: string
  playerName: string
  position: string
  round: number
  overallPick: number
  grade: string
  score: number
  verdict: string
  valueLabel: string
}
export interface TeamGradeRow {
  teamKey: string
  teamName: string
  teamLogo?: string
  grade: string
  gradeScore: number
  rank: number
  isMe: boolean
}
export interface DraftReport {
  season: number
  teamCount: number
  steal: DraftHighlight | null
  bust: DraftHighlight | null
  bestDrafter: TeamGradeRow | null
  worstDrafter: TeamGradeRow | null
  teamGrades: TeamGradeRow[]
  mySpotlight: {
    grade: string
    rank: number
    bestPick: DraftHighlight | null
    worstPick: DraftHighlight | null
  } | null
}
