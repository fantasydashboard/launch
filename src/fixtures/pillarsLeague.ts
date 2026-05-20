// The Pillars: a fictional 10-team Sleeper NFL PPR league, 6 seasons (2020–2025), currently mid-week-11 of 2025.
// Designed to dramatize every page of UFD. Owner names + team names are intentional narrative archetypes.

export interface Team {
  id: string
  name: string
  ownerName: string
  ownerInitials: string
  avatarColor: string  // OKLCH gradient stops, comma-separated for the avatar bg
  archetype: string    // for internal storytelling, not displayed
  isMyTeam?: boolean
  // URL to an external avatar image (e.g. DiceBear). Renders as <img>, fills the avatar circle.
  // When set, overrides the gradient + initials.
  avatarUrl?: string
}

export interface SeasonStanding {
  teamId: string
  rank: number
  wins: number
  losses: number
  ties: number
  pointsFor: number
  pointsAgainst: number
  streak: string       // "W3", "L2", "W1"
  trend: number        // +/- vs last week
  playoff: boolean     // would currently make playoffs
}

export interface Matchup {
  id: string
  week: number
  homeTeamId: string
  awayTeamId: string
  homeScore: number
  awayScore: number
  homeProjected: number
  awayProjected: number
  status: 'final' | 'live' | 'upcoming'
  winProb: number      // home team win probability 0-100
}

export interface PowerRankWeek {
  week: number
  // each entry: teamId → rank that week (1..10)
  ranks: Record<string, number>
}

export interface SeasonRecord {
  year: number
  championTeamId: string
  runnerUpTeamId: string
  toiletBowlTeamId: string
  championScore: string  // "Won championship 142.6 – 118.4"
  eraTag: string         // "The Founding", "The Dynasty Years", etc.
  finalStandings: { teamId: string; rank: number }[]  // 1..10
}

export const teams: Team[] = [
  { id: 'mm', name: 'Built Different',     ownerName: 'Sarah K.',  ownerInitials: 'SK', avatarColor: 'oklch(0.78 0.18 92), oklch(0.68 0.16 75)',  archetype: 'current hot team (#1)',
    avatarUrl: '/demo-logos/mm.jpg' },
  { id: 'tc', name: 'Throne Vacant',       ownerName: 'Mike R.',   ownerInitials: 'MR', avatarColor: 'oklch(0.70 0.18 145), oklch(0.60 0.14 150)', archetype: 'fallen king, back-to-back champ 2022-23',
    avatarUrl: '/demo-logos/tc.jpg' },
  { id: 'ta', name: 'Almost Famous',       ownerName: 'Dev S.',    ownerInitials: 'DS', avatarColor: 'oklch(0.62 0.20 280), oklch(0.52 0.18 285)', archetype: 'always the bridesmaid',
    avatarUrl: '/demo-logos/ta.jpg' },
  { id: 'ww', name: 'The Glow Up',         ownerName: 'Taylor L.', ownerInitials: 'TL', avatarColor: 'oklch(0.66 0.22 30), oklch(0.56 0.20 35)',  archetype: 'rookie breakout (joined 2024)',
    avatarUrl: '/demo-logos/ww.jpg' },
  { id: 'bb', name: 'By the Numbers',      ownerName: 'Priya M.',  ownerInitials: 'PM', avatarColor: 'oklch(0.72 0.18 195), oklch(0.62 0.16 200)', archetype: 'analytics nerd, never wins playoffs',
    avatarUrl: '/demo-logos/bb.jpg' },
  { id: 'wg', name: 'Reign Delay',         ownerName: 'Chris D.',  ownerInitials: 'CD', avatarColor: 'oklch(0.55 0.18 0), oklch(0.45 0.16 5)',    archetype: 'defending 2024 champ in collapse mode',
    avatarUrl: '/demo-logos/wg.jpg' },
  { id: 'jc', name: 'Commish Impossible',  ownerName: 'Josh D.',   ownerInitials: 'JD', avatarColor: 'oklch(0.78 0.18 92), oklch(0.70 0.27 350)', archetype: 'YOU - league host (the my-team)', isMyTeam: true,
    avatarUrl: '/demo-logos/jc.jpg' },
  { id: 'bn', name: '5th Year Senior',     ownerName: 'Jamie P.',  ownerInitials: 'JP', avatarColor: 'oklch(0.55 0.02 270), oklch(0.45 0.02 270)', archetype: 'perennial mid-pack',
    avatarUrl: '/demo-logos/bn.jpg' },
  { id: 'hg', name: 'One Hit Wonder',      ownerName: 'Darnell W.',ownerInitials: 'DW', avatarColor: 'oklch(0.65 0.20 320), oklch(0.55 0.18 325)', archetype: 'single-title legend (2021 champ)',
    avatarUrl: '/demo-logos/hg.jpg' },
  { id: 'tb', name: 'Auto-Draft Allstars', ownerName: 'Rob A.',    ownerInitials: 'RA', avatarColor: 'oklch(0.50 0.04 270), oklch(0.38 0.03 270)', archetype: 'perennial cellar-dweller',
    avatarUrl: '/demo-logos/tb.jpg' },
]

export const currentSeason = 2025
export const currentWeek = 11
export const playoffCutoff = 6 as const

// 2025 week 11 standings (mid-season). Built Different just took #1 from Throne Vacant.
export const standings2025Week11: SeasonStanding[] = [
  { teamId: 'mm', rank:  1, wins: 9, losses: 2, ties: 0, pointsFor: 1456.4, pointsAgainst: 1188.2, streak: 'W3', trend:  2, playoff: true  },
  { teamId: 'tc', rank:  2, wins: 8, losses: 3, ties: 0, pointsFor: 1421.8, pointsAgainst: 1234.7, streak: 'L1', trend: -1, playoff: true  },
  { teamId: 'ta', rank:  3, wins: 7, losses: 4, ties: 0, pointsFor: 1342.1, pointsAgainst: 1267.5, streak: 'W2', trend:  0, playoff: true  },
  { teamId: 'ww', rank:  4, wins: 7, losses: 4, ties: 0, pointsFor: 1298.6, pointsAgainst: 1213.9, streak: 'W1', trend:  1, playoff: true  },
  { teamId: 'bb', rank:  5, wins: 6, losses: 5, ties: 0, pointsFor: 1287.3, pointsAgainst: 1245.6, streak: 'L1', trend:  0, playoff: true  },
  { teamId: 'wg', rank:  6, wins: 5, losses: 6, ties: 0, pointsFor: 1234.2, pointsAgainst: 1289.8, streak: 'L3', trend: -2, playoff: true  },
  { teamId: 'jc', rank:  7, wins: 5, losses: 6, ties: 0, pointsFor: 1221.0, pointsAgainst: 1278.4, streak: 'W1', trend:  1, playoff: false },
  { teamId: 'bn', rank:  8, wins: 4, losses: 7, ties: 0, pointsFor: 1187.6, pointsAgainst: 1312.0, streak: 'L2', trend:  0, playoff: false },
  { teamId: 'hg', rank:  9, wins: 3, losses: 8, ties: 0, pointsFor: 1102.3, pointsAgainst: 1356.7, streak: 'L4', trend: -1, playoff: false },
  { teamId: 'tb', rank: 10, wins: 2, losses: 9, ties: 0, pointsFor:  978.5, pointsAgainst: 1421.6, streak: 'L5', trend:  0, playoff: false },
]

// Week 10 final matchups (the games that JUST happened, drove this week's standings)
export const matchupsWeek10: Matchup[] = [
  { id: 'm10-1', week: 10, homeTeamId: 'mm', awayTeamId: 'tc', homeScore: 138.4, awayScore: 121.8, homeProjected: 124.2, awayProjected: 132.6, status: 'final', winProb: 100 },
  { id: 'm10-2', week: 10, homeTeamId: 'ta', awayTeamId: 'bb', homeScore: 142.1, awayScore: 118.7, homeProjected: 128.4, awayProjected: 122.9, status: 'final', winProb: 100 },
  { id: 'm10-3', week: 10, homeTeamId: 'ww', awayTeamId: 'wg', homeScore: 129.6, awayScore:  99.3, homeProjected: 118.0, awayProjected: 121.4, status: 'final', winProb: 100 },
  { id: 'm10-4', week: 10, homeTeamId: 'jc', awayTeamId: 'bn', homeScore: 124.7, awayScore: 108.2, homeProjected: 119.8, awayProjected: 114.3, status: 'final', winProb: 100 },
  { id: 'm10-5', week: 10, homeTeamId: 'hg', awayTeamId: 'tb', homeScore: 111.4, awayScore:  88.6, homeProjected: 109.2, awayProjected:  94.7, status: 'final', winProb: 100 },
]

// Week 11 matchups (current week, in-progress / upcoming). Make 2 'live', 2 'upcoming', 1 'final'.
export const matchupsWeek11: Matchup[] = [
  { id: 'm11-1', week: 11, homeTeamId: 'tc', awayTeamId: 'ta', homeScore:  84.6, awayScore:  91.2, homeProjected: 128.4, awayProjected: 119.7, status: 'live',     winProb: 38 },
  { id: 'm11-2', week: 11, homeTeamId: 'mm', awayTeamId: 'ww', homeScore:  72.3, awayScore:  58.4, homeProjected: 134.1, awayProjected: 116.8, status: 'live',     winProb: 71 },
  { id: 'm11-3', week: 11, homeTeamId: 'wg', awayTeamId: 'jc', homeScore: 119.2, awayScore: 134.7, homeProjected: 121.3, awayProjected: 117.9, status: 'final',    winProb:  18 },
  { id: 'm11-4', week: 11, homeTeamId: 'bb', awayTeamId: 'hg', homeScore:   0.0, awayScore:   0.0, homeProjected: 126.5, awayProjected: 102.4, status: 'upcoming', winProb: 78 },
  { id: 'm11-5', week: 11, homeTeamId: 'bn', awayTeamId: 'tb', homeScore:   0.0, awayScore:   0.0, homeProjected: 112.8, awayProjected:  98.6, status: 'upcoming', winProb: 64 },
]

// 6 weeks of rank movements for the Power Rankings bump chart (currentWeek minus 5 through currentWeek)
export const powerRankHistory: PowerRankWeek[] = [
  { week:  6, ranks: { mm: 3, tc: 1, ta: 2, ww: 5, bb: 4, wg: 6, jc: 8, bn: 7, hg: 9, tb: 10 } },
  { week:  7, ranks: { mm: 3, tc: 1, ta: 2, ww: 5, bb: 4, wg: 6, jc: 7, bn: 8, hg: 9, tb: 10 } },
  { week:  8, ranks: { mm: 2, tc: 1, ta: 4, ww: 5, bb: 3, wg: 6, jc: 7, bn: 8, hg: 9, tb: 10 } },
  { week:  9, ranks: { mm: 2, tc: 1, ta: 3, ww: 4, bb: 5, wg: 6, jc: 7, bn: 8, hg: 9, tb: 10 } },
  { week: 10, ranks: { mm: 3, tc: 1, ta: 3, ww: 5, bb: 4, wg: 7, jc: 6, bn: 8, hg: 9, tb: 10 } },
  { week: 11, ranks: { mm: 1, tc: 2, ta: 3, ww: 4, bb: 5, wg: 6, jc: 7, bn: 8, hg: 9, tb: 10 } },
]

// Full-season rank history for the bump chart (weeks 1..11).
// Every team gets a UNIQUE rank 1..10 each week so the lines never overlap.
// Endpoints at week 11 match standings2025Week11 exactly.
// Narrative beats:
//  - tc rides #1 for 10 straight weeks, then mm overtakes in week 11
//  - mm climbs from 3 to 1
//  - wg (defending champ) collapses from 2 → 6
//  - ww rises in mid-season then slides to 4
//  - jc (you) hovers 6th–8th, currently 7th
//  - tb sits at 10 the whole season
export const seasonRankHistory: PowerRankWeek[] = [
  { week:  1, ranks: { tc: 1, wg: 2, mm: 3, bb: 4, ta: 5, jc: 6, hg: 7, bn: 8, ww: 9, tb: 10 } },
  { week:  2, ranks: { tc: 1, mm: 2, ta: 3, wg: 4, bb: 5, jc: 6, ww: 7, bn: 8, hg: 9, tb: 10 } },
  { week:  3, ranks: { tc: 1, ta: 2, mm: 3, bb: 4, wg: 5, ww: 6, jc: 7, bn: 8, hg: 9, tb: 10 } },
  { week:  4, ranks: { tc: 1, mm: 2, ta: 3, ww: 4, bb: 5, wg: 6, jc: 7, bn: 8, hg: 9, tb: 10 } },
  { week:  5, ranks: { tc: 1, mm: 2, ww: 3, ta: 4, bb: 5, wg: 6, jc: 7, bn: 8, hg: 9, tb: 10 } },
  { week:  6, ranks: { tc: 1, ta: 2, mm: 3, bb: 4, ww: 5, wg: 6, bn: 7, jc: 8, hg: 9, tb: 10 } },
  { week:  7, ranks: { tc: 1, ta: 2, mm: 3, bb: 4, ww: 5, wg: 6, jc: 7, bn: 8, hg: 9, tb: 10 } },
  { week:  8, ranks: { tc: 1, mm: 2, bb: 3, ta: 4, ww: 5, wg: 6, jc: 7, bn: 8, hg: 9, tb: 10 } },
  { week:  9, ranks: { tc: 1, mm: 2, ta: 3, ww: 4, bb: 5, wg: 6, jc: 7, bn: 8, hg: 9, tb: 10 } },
  { week: 10, ranks: { tc: 1, mm: 2, ta: 3, bb: 4, ww: 5, jc: 6, wg: 7, bn: 8, hg: 9, tb: 10 } },
  { week: 11, ranks: { mm: 1, tc: 2, ta: 3, ww: 4, bb: 5, wg: 6, jc: 7, bn: 8, hg: 9, tb: 10 } },
]

// League leaders (the editorial "three names worth knowing" block).
export interface LeagueLeader {
  awardId: 'workhorse' | 'heater' | 'cooked'
  teamId: string
  label: string             // "Workhorse" / "Heater" / "The Cooked"
  copy: string              // editorial 1-line copy with personality, no em dashes
  primaryValue: string      // e.g. "1,456.4", "W3", "L5"
  supportingValue?: string  // optional secondary stat
}

export const leagueLeaders: LeagueLeader[] = [
  {
    awardId: 'workhorse',
    teamId: 'mm',
    label: 'Workhorse',
    copy: 'Highest scoring team in the league. 132.4 points per week and counting.',
    primaryValue: '1,456.4',
    supportingValue: 'pts (132.4 / wk)',
  },
  {
    awardId: 'heater',
    teamId: 'mm',
    label: 'Heater',
    copy: 'Three straight Ws while taking the top spot. Peaking at the right time.',
    primaryValue: 'W3',
    supportingValue: 'win streak',
  },
  {
    awardId: 'cooked',
    teamId: 'wg',
    label: 'The Cooked',
    copy: "Defending champion. Now sixth. Three straight Ls and the wheels are off.",
    primaryValue: 'L3',
    supportingValue: 'and falling',
  },
]

// 6 seasons of league history (champions, runner-ups, toilet bowl winners, eras)
export const seasonHistory: SeasonRecord[] = [
  { year: 2020, championTeamId: 'wg', runnerUpTeamId: 'ta', toiletBowlTeamId: 'tb', championScore: 'Won championship 138.4 to 121.7', eraTag: 'The Founding',
    finalStandings: [
      { teamId: 'wg', rank:  1 }, { teamId: 'ta', rank: 2 }, { teamId: 'bb', rank: 3 }, { teamId: 'tc', rank: 4 }, { teamId: 'hg', rank: 5 },
      { teamId: 'bn', rank:  6 }, { teamId: 'jc', rank: 7 }, { teamId: 'mm', rank: 8 }, { teamId: 'ww', rank: 9 }, { teamId: 'tb', rank: 10 },
    ]
  },
  { year: 2021, championTeamId: 'hg', runnerUpTeamId: 'wg', toiletBowlTeamId: 'tb', championScore: 'Won championship 124.8 to 116.2', eraTag: 'The Founding',
    finalStandings: [
      { teamId: 'hg', rank:  1 }, { teamId: 'wg', rank: 2 }, { teamId: 'ta', rank: 3 }, { teamId: 'bb', rank: 4 }, { teamId: 'mm', rank: 5 },
      { teamId: 'tc', rank:  6 }, { teamId: 'jc', rank: 7 }, { teamId: 'bn', rank: 8 }, { teamId: 'ww', rank: 9 }, { teamId: 'tb', rank: 10 },
    ]
  },
  { year: 2022, championTeamId: 'tc', runnerUpTeamId: 'mm', toiletBowlTeamId: 'tb', championScore: 'Won championship 152.4 to 131.6', eraTag: 'The Dynasty Years',
    finalStandings: [
      { teamId: 'tc', rank:  1 }, { teamId: 'mm', rank: 2 }, { teamId: 'bb', rank: 3 }, { teamId: 'ta', rank: 4 }, { teamId: 'wg', rank: 5 },
      { teamId: 'hg', rank:  6 }, { teamId: 'jc', rank: 7 }, { teamId: 'bn', rank: 8 }, { teamId: 'ww', rank: 9 }, { teamId: 'tb', rank: 10 },
    ]
  },
  { year: 2023, championTeamId: 'tc', runnerUpTeamId: 'ta', toiletBowlTeamId: 'tb', championScore: 'Won championship 144.2 to 128.9', eraTag: 'The Dynasty Years',
    finalStandings: [
      { teamId: 'tc', rank:  1 }, { teamId: 'ta', rank: 2 }, { teamId: 'mm', rank: 3 }, { teamId: 'bb', rank: 4 }, { teamId: 'wg', rank: 5 },
      { teamId: 'jc', rank:  6 }, { teamId: 'hg', rank: 7 }, { teamId: 'bn', rank: 8 }, { teamId: 'ww', rank: 9 }, { teamId: 'tb', rank: 10 },
    ]
  },
  { year: 2024, championTeamId: 'wg', runnerUpTeamId: 'tc', toiletBowlTeamId: 'tb', championScore: 'Won championship 156.1 to 142.3', eraTag: 'The Collapse',
    finalStandings: [
      { teamId: 'wg', rank:  1 }, { teamId: 'tc', rank: 2 }, { teamId: 'ta', rank: 3 }, { teamId: 'bb', rank: 4 }, { teamId: 'mm', rank: 5 },
      { teamId: 'bn', rank:  6 }, { teamId: 'jc', rank: 7 }, { teamId: 'ww', rank: 8 }, { teamId: 'hg', rank: 9 }, { teamId: 'tb', rank: 10 },
    ]
  },
  // 2025 in progress, no champion yet
]

// The narrative headline for week 11
export const headlineThisWeek = {
  eyebrow: 'Story of the week',
  headline: 'The dynasty falls.',
  body: "Built Different just took the top spot from Throne Vacant for the first time since week 1. Back-to-back champ in 2022 and 2023. Two years on top. One bad Sunday.",
  protagonistTeamId: 'mm',
  antagonistTeamId: 'tc',
}

// Helper
export function getTeam(id: string) {
  return teams.find(t => t.id === id)!
}

/* ─────────────────────────────────────────────────────────────────
   POWER RANKINGS — factor scores, season stats, presets
   Used by the Customize modal to recompute live rankings as the
   user adjusts factor weights.
───────────────────────────────────────────────────────────────── */

// Per-team factor scores 0-100 in each ranking factor.
export interface TeamFactorScores {
  winLoss: number      // strength in win-loss record (0-100)
  totalPoints: number  // strength in total points scored
  allPlay: number      // strength in all-play record
  recentForm: number   // strength in last 3 weeks
  consistency: number  // strength in consistency (low variance = high score)
  schedLuck: number    // strength of schedule luck (lower PA = higher score)
}

export const teamFactorScores: Record<string, TeamFactorScores> = {
  mm: { winLoss: 92, totalPoints: 95, allPlay: 78, recentForm: 88, consistency: 75, schedLuck: 62 },
  tc: { winLoss: 86, totalPoints: 88, allPlay: 82, recentForm: 65, consistency: 80, schedLuck: 58 },
  ta: { winLoss: 75, totalPoints: 78, allPlay: 80, recentForm: 78, consistency: 88, schedLuck: 65 },
  ww: { winLoss: 75, totalPoints: 72, allPlay: 75, recentForm: 80, consistency: 65, schedLuck: 70 },
  bb: { winLoss: 62, totalPoints: 76, allPlay: 70, recentForm: 60, consistency: 78, schedLuck: 55 },
  wg: { winLoss: 48, totalPoints: 65, allPlay: 60, recentForm: 35, consistency: 50, schedLuck: 45 },
  jc: { winLoss: 48, totalPoints: 60, allPlay: 55, recentForm: 55, consistency: 60, schedLuck: 52 },
  bn: { winLoss: 36, totalPoints: 52, allPlay: 50, recentForm: 40, consistency: 55, schedLuck: 48 },
  hg: { winLoss: 30, totalPoints: 42, allPlay: 38, recentForm: 28, consistency: 35, schedLuck: 42 },
  tb: { winLoss: 20, totalPoints: 28, allPlay: 25, recentForm: 18, consistency: 25, schedLuck: 30 },
}

// Per-team season stats for table columns
export interface TeamSeasonStats {
  allPlayWins: number
  allPlayLosses: number
  pointsPerWeek: number    // e.g. 132.4
  last3Score: number       // 0-100 performance metric for last 3 weeks
}

export const teamSeasonStats: Record<string, TeamSeasonStats> = {
  mm: { allPlayWins: 108, allPlayLosses: 45, pointsPerWeek: 132.4, last3Score: 89 },
  tc: { allPlayWins: 102, allPlayLosses: 51, pointsPerWeek: 129.3, last3Score: 64 },
  ta: { allPlayWins:  98, allPlayLosses: 55, pointsPerWeek: 122.0, last3Score: 78 },
  ww: { allPlayWins:  86, allPlayLosses: 67, pointsPerWeek: 118.1, last3Score: 76 },
  bb: { allPlayWins:  79, allPlayLosses: 74, pointsPerWeek: 117.0, last3Score: 58 },
  wg: { allPlayWins:  64, allPlayLosses: 89, pointsPerWeek: 112.2, last3Score: 32 },
  jc: { allPlayWins:  62, allPlayLosses: 91, pointsPerWeek: 111.0, last3Score: 55 },
  bn: { allPlayWins:  55, allPlayLosses: 98, pointsPerWeek: 108.0, last3Score: 38 },
  hg: { allPlayWins:  40, allPlayLosses: 113, pointsPerWeek: 100.2, last3Score: 25 },
  tb: { allPlayWins:  25, allPlayLosses: 128, pointsPerWeek:  89.0, last3Score: 14 },
}

// Factor definitions for the Customize modal
export interface FactorDef {
  id: keyof TeamFactorScores
  name: string
  description: string
  defaultWeight: number
}

export const factorDefs: FactorDef[] = [
  { id: 'winLoss',     name: 'Win-Loss Record',  description: 'Team record and winning percentage.',             defaultWeight: 30 },
  { id: 'totalPoints', name: 'Total Points',     description: 'Total points scored across the season.',          defaultWeight: 20 },
  { id: 'allPlay',     name: 'All-Play Record',  description: 'Record if you played every team every week.',     defaultWeight: 18 },
  { id: 'recentForm',  name: 'Recent Form',      description: 'Average performance over the last 3 weeks.',      defaultWeight: 15 },
  { id: 'consistency', name: 'Consistency',      description: 'Lower variance week to week means higher score.', defaultWeight: 12 },
  { id: 'schedLuck',   name: 'Schedule Luck',    description: 'Lower points against indicates schedule luck.',   defaultWeight:  5 },
]

// Presets for the Customize modal
export interface PowerRankingPreset {
  id: string
  name: string
  weights: Record<keyof TeamFactorScores, number>
}

export const powerRankingPresets: PowerRankingPreset[] = [
  { id: 'balanced',      name: 'Balanced',      weights: { winLoss: 30, totalPoints: 20, allPlay: 18, recentForm: 15, consistency: 12, schedLuck:  5 } },
  { id: 'wins-matter',   name: 'Wins Matter',   weights: { winLoss: 55, totalPoints: 15, allPlay: 10, recentForm: 10, consistency:  5, schedLuck:  5 } },
  { id: 'true-strength', name: 'True Strength', weights: { winLoss: 15, totalPoints: 35, allPlay: 30, recentForm: 10, consistency:  5, schedLuck:  5 } },
  { id: 'hot-hand',      name: 'Hot Hand',      weights: { winLoss: 15, totalPoints: 15, allPlay: 10, recentForm: 45, consistency:  5, schedLuck: 10 } },
  { id: 'forward-look',  name: 'Forward Look',  weights: { winLoss: 10, totalPoints: 20, allPlay: 15, recentForm: 35, consistency: 15, schedLuck:  5 } },
]

/* ─────────────────────────────────────────────────────────────────
   MATCHUPS — daily win-prob series, scouting copy, lifetime H2H
   Used by the DemoMatchupsView and MatchupDetailModal.
───────────────────────────────────────────────────────────────── */

// Daily win-probability snapshots for active week 11 matchups.
// Each entry: home team's win % across the week's 7 days (Mon..Sun).
// Drama-shaped narratives — captures injury news, lineup changes, mid-game swings.
export interface DailyWinProbSeries {
  matchupId: string
  // 7 values, one per day Mon..Sun. Each 1..99 (never 0 / 100).
  // Index 0 = Monday morning baseline, index 6 = current Sunday position.
  homeProbByDay: number[]
  // Index of "current moment" in the array — Sun for live games, last index for final, undefined for upcoming.
  currentDayIndex?: number
  methodologyNote: string
}

export const dailyWinProb: DailyWinProbSeries[] = [
  {
    matchupId: 'm11-1', // Throne Vacant vs Almost Famous, LIVE
    homeProbByDay: [52, 48, 55, 41, 35, 42, 38],
    currentDayIndex: 6,
    methodologyNote: '5,000 Monte Carlo sims, updated 14 minutes ago',
  },
  {
    matchupId: 'm11-2', // Built Different vs The Glow Up, LIVE
    homeProbByDay: [68, 70, 73, 78, 74, 72, 71],
    currentDayIndex: 6,
    methodologyNote: '5,000 Monte Carlo sims, updated 8 minutes ago',
  },
  {
    matchupId: 'm11-3', // Reign Delay vs Commish Impossible, FINAL
    homeProbByDay: [62, 58, 55, 50, 38, 24, 18],
    currentDayIndex: 6,
    methodologyNote: '5,000 Monte Carlo sims, locked at final',
  },
  // Upcoming matchups: no daily series yet, only pre-snap projection
  {
    matchupId: 'm11-4', // By the Numbers vs One Hit Wonder, UPCOMING
    homeProbByDay: [72, 74, 75, 76, 78, 78, 78],
    methodologyNote: '5,000 Monte Carlo sims, pre-game projection',
  },
  {
    matchupId: 'm11-5', // 5th Year Senior vs Auto-Draft Allstars, UPCOMING
    homeProbByDay: [60, 62, 63, 64, 64, 64, 64],
    methodologyNote: '5,000 Monte Carlo sims, pre-game projection',
  },
]

// Editorial scouting reports — one short paragraph per team in scout voice.
// NOT bullet lists. Read like a real preview, opinionated and specific.
export const teamScoutingReports: Record<string, string> = {
  mm: "Built Different scores like a contender (132.4 PPW) and walks through schedules. Their ceiling games (171+) come on the back of one elite QB performance, which means they cover most weeks but rarely panic. If you're playing them, hope their QB has a quiet afternoon.",
  tc: "Throne Vacant still has the best floor in the league (95) and the only roster that can win without their stars touching the ball. The dynasty hasn't fully cracked. Lower their score and you beat them. Let them get to 130 and you don't.",
  ta: "Almost Famous is a third-place team that nobody fears and everyone should. Three top-3 finishes in five years. Their weekly variance is the lowest in the league. They never have a bad night, but they rarely have the great one that wins a title.",
  ww: "The Glow Up is the rookie story that's not slowing down. Joined in 2024 finishing 8th, now 4th. Their drafting was the best in the league this year. Recent form trending up. Don't be the team they punch above their weight against.",
  bb: "By the Numbers built a roster on aggregate metrics and it's holding. 5th in points, 5th in record, 5th in consistency. Beat them by getting weird, not by trying to outscore them statistically.",
  wg: "Reign Delay is the defending champion in collapse. Won 2024 by 14 points, traded half the roster in summer for picks. Three straight losses. Their projection beats their actual every week by 8+. The wheels came off in October.",
  jc: "Commish Impossible runs the league, manages the keepers, and quietly puts up 111 a week. Currently 7th, on the playoff bubble. Wins the games they should and loses to the teams above them. Underrated and over-managed.",
  bn: "5th Year Senior is what happens when you play it safe for five years. 4-7, mid-pack PPW, mid-pack everything. Has never made the championship game. Their floor is reasonable, their ceiling is also reasonable. The platonic ideal of mediocrity.",
  hg: "One Hit Wonder won the 2021 title and hasn't sniffed top 6 since. Currently 3-8, having outscored their opponents by 50 points cumulatively, somehow. The unluckiest team in the league this year. A change of schedule could move them three spots.",
  tb: "Auto-Draft Allstars hasn't set a lineup since week 4. 2-9. Last place. Beat themselves more than the opponent beats them. Recent form: three games with a player on bye in their starting lineup. Their owner has not logged in since week 5.",
}

// Last 5 W/L results per team, oldest -> newest. Synthesized from current standings narrative.
export const teamLastFiveResults: Record<string, ('W' | 'L')[]> = {
  mm: ['L', 'W', 'W', 'W', 'W'],
  tc: ['W', 'W', 'W', 'L', 'W'],
  ta: ['L', 'W', 'L', 'W', 'W'],
  ww: ['L', 'W', 'L', 'W', 'W'],
  bb: ['W', 'L', 'W', 'W', 'L'],
  wg: ['W', 'W', 'L', 'L', 'L'],
  jc: ['L', 'W', 'L', 'L', 'W'],
  bn: ['W', 'L', 'W', 'L', 'L'],
  hg: ['L', 'L', 'W', 'L', 'L'],
  tb: ['L', 'L', 'L', 'L', 'L'],
}

// Lifetime head-to-head records for noteworthy pairings.
// Sparse: only includes pairs that have an interesting story.
export interface LifetimeH2H {
  teamA: string
  teamB: string
  aWins: number
  bWins: number
  recentMeetings: { year: number; week: number; aScore: number; bScore: number }[]
  editorialLead: string
}

export const lifetimeH2H: LifetimeH2H[] = [
  {
    teamA: 'tc', teamB: 'ta',
    aWins: 7, bWins: 4,
    recentMeetings: [
      { year: 2024, week: 13, aScore: 142.1, bScore:  98.4 },
      { year: 2023, week:  9, aScore:  88.6, bScore: 132.7 },
      { year: 2023, week:  3, aScore: 156.4, bScore: 121.0 },
    ],
    editorialLead: 'Throne Vacant leads 7 to 4 across eleven meetings. Almost Famous took the last one in 2023. Throne Vacant has won the last three in a row.',
  },
  {
    teamA: 'mm', teamB: 'ww',
    aWins: 1, bWins: 0,
    recentMeetings: [
      { year: 2024, week: 5, aScore: 145.8, bScore: 112.3 },
    ],
    editorialLead: 'First and only meeting was a Built Different blowout in 2024. The Glow Up wasn\'t The Glow Up yet.',
  },
  {
    teamA: 'wg', teamB: 'jc',
    aWins: 5, bWins: 3,
    recentMeetings: [
      { year: 2025, week: 11, aScore: 119.2, bScore: 134.7 },
      { year: 2024, week: 14, aScore: 156.2, bScore:  89.4 },
      { year: 2023, week:  7, aScore: 118.0, bScore: 112.6 },
    ],
    editorialLead: 'Reign Delay leads 5 to 3 historically, but Commish Impossible just took the most recent one (134.7 to 119.2). First time the host has beaten the defending champion in two years.',
  },
]

// Configuration: which matchup is "Matchup of the Week"
export const matchupOfTheWeekId = 'm11-1'  // Throne Vacant vs Almost Famous

// Per-team season stats used in the comparison table (some overlap with teamSeasonStats, expand if needed)
export interface MatchupComparisonStats {
  record: string         // "8-3"
  pointsPerWeek: number
  totalPoints: number
  highScore: number
  lowScore: number
  allPlayRecord: string
  consistencyStdDev: number  // lower = more consistent
  last3Avg: number
}

export const matchupComparison: Record<string, MatchupComparisonStats> = {
  mm: { record: '9-2', pointsPerWeek: 132.4, totalPoints: 1456.4, highScore: 168.2, lowScore: 102.1, allPlayRecord: '108-45', consistencyStdDev: 18.2, last3Avg: 138.6 },
  tc: { record: '8-3', pointsPerWeek: 129.3, totalPoints: 1421.8, highScore: 171.3, lowScore:  95.0, allPlayRecord: '102-51', consistencyStdDev: 22.1, last3Avg: 134.2 },
  ta: { record: '7-4', pointsPerWeek: 122.0, totalPoints: 1342.1, highScore: 151.8, lowScore: 102.3, allPlayRecord:  '98-55', consistencyStdDev: 14.4, last3Avg: 131.0 },
  ww: { record: '7-4', pointsPerWeek: 118.1, totalPoints: 1298.6, highScore: 152.6, lowScore:  88.5, allPlayRecord:  '86-67', consistencyStdDev: 24.8, last3Avg: 128.4 },
  bb: { record: '6-5', pointsPerWeek: 117.0, totalPoints: 1287.3, highScore: 144.1, lowScore:  92.7, allPlayRecord:  '79-74', consistencyStdDev: 16.5, last3Avg: 115.2 },
  wg: { record: '5-6', pointsPerWeek: 112.2, totalPoints: 1234.2, highScore: 158.4, lowScore:  84.0, allPlayRecord:  '64-89', consistencyStdDev: 26.3, last3Avg:  98.6 },
  jc: { record: '5-6', pointsPerWeek: 111.0, totalPoints: 1221.0, highScore: 138.7, lowScore:  91.2, allPlayRecord:  '62-91', consistencyStdDev: 15.8, last3Avg: 118.1 },
  bn: { record: '4-7', pointsPerWeek: 108.0, totalPoints: 1187.6, highScore: 133.2, lowScore:  88.4, allPlayRecord:  '55-98', consistencyStdDev: 14.1, last3Avg: 106.4 },
  hg: { record: '3-8', pointsPerWeek: 100.2, totalPoints: 1102.3, highScore: 128.7, lowScore:  78.1, allPlayRecord: '40-113', consistencyStdDev: 18.6, last3Avg:  96.8 },
  tb: { record: '2-9', pointsPerWeek:  89.0, totalPoints:  978.5, highScore: 118.2, lowScore:  62.4, allPlayRecord: '25-128', consistencyStdDev: 21.4, last3Avg:  84.2 },
}

// Per-matchup "what to watch" editorial one-liners.
export const matchupWatchKey: Record<string, string> = {
  'm11-1': 'All comes down to the Sunday night game. Mahomes against Hurts decides 70% of the projected delta.',
  'm11-2': 'Built Different is one CMC long touchdown away from sealing it. The Glow Up needs three of their RBs to outscore projection.',
  'm11-3': 'Already final. The host walked into the defending champion and walked out with a 15.5 point upset.',
  'm11-4': 'By the Numbers projects to win by 24, but One Hit Wonder beats projection by 18 a week. Closer than the line suggests.',
  'm11-5': '5th Year Senior is the rare projected favorite that has shown up the last three weeks. Auto-Draft Allstars has a bye-week starter in the flex again.',
}

/* ─────────────────────────────────────────────────────────────────
   DRAFT — 100 fictional picks across 10 rounds. Snake order.
   R1 picks 1-10 use the team array order (mm, tc, ta, ww, bb, wg,
   jc, bn, hg, tb). Even rounds reverse it. Pick #6 is wg's R1
   disaster (-110 value). Pick #78 is ta's R8 jackpot (+73 value).
───────────────────────────────────────────────────────────────── */

export type PlayerPosition = 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DST'

export type DraftVerdict =
  | 'JACKPOT' | 'STEAL' | 'HIT' | 'SOLID' | 'MISS' | 'BUST' | 'DISASTER'

export type TierTransition =
  | 'ELITE→ELITE' | 'ELITE→STARTER' | 'ELITE→BENCH' | 'ELITE→WAIVER' | 'ELITE→REPLACEMENT'
  | 'STARTER→ELITE' | 'STARTER→STARTER' | 'STARTER→BENCH' | 'STARTER→WAIVER'
  | 'BENCH→ELITE' | 'BENCH→STARTER' | 'BENCH→BENCH' | 'BENCH→WAIVER'
  | 'WAIVER→ELITE' | 'WAIVER→STARTER' | 'WAIVER→BENCH'

export interface DraftPick {
  pickNumber: number
  round: number
  pickInRound: number
  playerName: string
  position: PlayerPosition
  positionRankAtDraft: number
  draftedByTeamId: string
  seasonPoints: number
  expectedPoints: number
  valueScore: number
  tierTransition: TierTransition
  verdict: DraftVerdict
}

export const draftPicks: DraftPick[] = [
  { pickNumber: 1, round: 1, pickInRound: 1, playerName: 'Saquon Barkley', position: 'RB', positionRankAtDraft: 1, draftedByTeamId: 'bb', seasonPoints: 212.5, expectedPoints: 250, valueScore: -37.5, tierTransition: 'ELITE→STARTER', verdict: 'BUST' },
  { pickNumber: 2, round: 1, pickInRound: 2, playerName: 'Bijan Robinson', position: 'RB', positionRankAtDraft: 2, draftedByTeamId: 'jc', seasonPoints: 242.5, expectedPoints: 250, valueScore: -7.5, tierTransition: 'ELITE→ELITE', verdict: 'MISS' },
  { pickNumber: 3, round: 1, pickInRound: 3, playerName: 'Ja\'Marr Chase', position: 'WR', positionRankAtDraft: 1, draftedByTeamId: 'hg', seasonPoints: 242.5, expectedPoints: 250, valueScore: -7.5, tierTransition: 'ELITE→ELITE', verdict: 'MISS' },
  { pickNumber: 4, round: 1, pickInRound: 4, playerName: 'Jahmyr Gibbs', position: 'RB', positionRankAtDraft: 3, draftedByTeamId: 'ta', seasonPoints: 270.0, expectedPoints: 250, valueScore: 20.0, tierTransition: 'ELITE→ELITE', verdict: 'STEAL' },
  { pickNumber: 5, round: 1, pickInRound: 5, playerName: 'CeeDee Lamb', position: 'WR', positionRankAtDraft: 2, draftedByTeamId: 'tc', seasonPoints: 140.0, expectedPoints: 250, valueScore: -110.0, tierTransition: 'ELITE→STARTER', verdict: 'DISASTER' },
  { pickNumber: 6, round: 1, pickInRound: 6, playerName: 'Derrick Henry', position: 'RB', positionRankAtDraft: 4, draftedByTeamId: 'ww', seasonPoints: 255.0, expectedPoints: 250, valueScore: 5.0, tierTransition: 'ELITE→STARTER', verdict: 'SOLID' },
  { pickNumber: 7, round: 1, pickInRound: 7, playerName: 'Justin Jefferson', position: 'WR', positionRankAtDraft: 3, draftedByTeamId: 'bn', seasonPoints: 212.5, expectedPoints: 250, valueScore: -37.5, tierTransition: 'ELITE→STARTER', verdict: 'BUST' },
  { pickNumber: 8, round: 1, pickInRound: 8, playerName: 'Puka Nacua', position: 'WR', positionRankAtDraft: 4, draftedByTeamId: 'tb', seasonPoints: 255.0, expectedPoints: 250, valueScore: 5.0, tierTransition: 'ELITE→ELITE', verdict: 'SOLID' },
  { pickNumber: 9, round: 1, pickInRound: 9, playerName: 'Amon-Ra St. Brown', position: 'WR', positionRankAtDraft: 5, draftedByTeamId: 'mm', seasonPoints: 283.0, expectedPoints: 250, valueScore: 33.0, tierTransition: 'ELITE→ELITE', verdict: 'STEAL' },
  { pickNumber: 10, round: 1, pickInRound: 10, playerName: 'Ashton Jeanty', position: 'RB', positionRankAtDraft: 5, draftedByTeamId: 'wg', seasonPoints: 235.0, expectedPoints: 250, valueScore: -15.0, tierTransition: 'ELITE→STARTER', verdict: 'MISS' },
  { pickNumber: 11, round: 2, pickInRound: 1, playerName: 'Malik Nabers', position: 'WR', positionRankAtDraft: 6, draftedByTeamId: 'wg', seasonPoints: 147.0, expectedPoints: 232, valueScore: -85.0, tierTransition: 'ELITE→BENCH', verdict: 'DISASTER' },
  { pickNumber: 12, round: 2, pickInRound: 2, playerName: 'Christian McCaffrey', position: 'RB', positionRankAtDraft: 6, draftedByTeamId: 'mm', seasonPoints: 265.0, expectedPoints: 232, valueScore: 33.0, tierTransition: 'ELITE→ELITE', verdict: 'STEAL' },
  { pickNumber: 13, round: 2, pickInRound: 3, playerName: 'Brian Thomas', position: 'WR', positionRankAtDraft: 7, draftedByTeamId: 'tb', seasonPoints: 147.0, expectedPoints: 232, valueScore: -85.0, tierTransition: 'STARTER→BENCH', verdict: 'DISASTER' },
  { pickNumber: 14, round: 2, pickInRound: 4, playerName: 'Jonathan Taylor', position: 'RB', positionRankAtDraft: 7, draftedByTeamId: 'bn', seasonPoints: 265.0, expectedPoints: 232, valueScore: 33.0, tierTransition: 'STARTER→ELITE', verdict: 'STEAL' },
  { pickNumber: 15, round: 2, pickInRound: 5, playerName: 'Nico Collins', position: 'WR', positionRankAtDraft: 8, draftedByTeamId: 'ww', seasonPoints: 217.0, expectedPoints: 232, valueScore: -15.0, tierTransition: 'STARTER→STARTER', verdict: 'MISS' },
  { pickNumber: 16, round: 2, pickInRound: 6, playerName: 'Chase Brown', position: 'RB', positionRankAtDraft: 8, draftedByTeamId: 'tc', seasonPoints: 217.0, expectedPoints: 232, valueScore: -15.0, tierTransition: 'STARTER→STARTER', verdict: 'MISS' },
  { pickNumber: 17, round: 2, pickInRound: 7, playerName: 'De\'Von Achane', position: 'RB', positionRankAtDraft: 9, draftedByTeamId: 'ta', seasonPoints: 237.0, expectedPoints: 232, valueScore: 5.0, tierTransition: 'STARTER→ELITE', verdict: 'SOLID' },
  { pickNumber: 18, round: 2, pickInRound: 8, playerName: 'Bucky Irving', position: 'RB', positionRankAtDraft: 10, draftedByTeamId: 'hg', seasonPoints: 147.0, expectedPoints: 232, valueScore: -85.0, tierTransition: 'STARTER→BENCH', verdict: 'DISASTER' },
  { pickNumber: 19, round: 2, pickInRound: 9, playerName: 'Brock Bowers', position: 'TE', positionRankAtDraft: 1, draftedByTeamId: 'jc', seasonPoints: 189.5, expectedPoints: 197, valueScore: -7.5, tierTransition: 'ELITE→STARTER', verdict: 'MISS' },
  { pickNumber: 20, round: 2, pickInRound: 10, playerName: 'Josh Jacobs', position: 'RB', positionRankAtDraft: 11, draftedByTeamId: 'bb', seasonPoints: 252.0, expectedPoints: 232, valueScore: 20.0, tierTransition: 'STARTER→STARTER', verdict: 'STEAL' },
  { pickNumber: 21, round: 3, pickInRound: 1, playerName: 'Ladd McConkey', position: 'WR', positionRankAtDraft: 9, draftedByTeamId: 'bb', seasonPoints: 201.0, expectedPoints: 214, valueScore: -13.0, tierTransition: 'STARTER→STARTER', verdict: 'MISS' },
  { pickNumber: 22, round: 3, pickInRound: 2, playerName: 'A.J. Brown', position: 'WR', positionRankAtDraft: 10, draftedByTeamId: 'jc', seasonPoints: 201.0, expectedPoints: 214, valueScore: -13.0, tierTransition: 'STARTER→STARTER', verdict: 'MISS' },
  { pickNumber: 23, round: 3, pickInRound: 3, playerName: 'Josh Allen', position: 'QB', positionRankAtDraft: 1, draftedByTeamId: 'hg', seasonPoints: 204.0, expectedPoints: 184, valueScore: 20.0, tierTransition: 'ELITE→ELITE', verdict: 'STEAL' },
  { pickNumber: 24, round: 3, pickInRound: 4, playerName: 'Tyreek Hill', position: 'WR', positionRankAtDraft: 11, draftedByTeamId: 'ta', seasonPoints: 171.0, expectedPoints: 214, valueScore: -43.0, tierTransition: 'STARTER→BENCH', verdict: 'BUST' },
  { pickNumber: 25, round: 3, pickInRound: 5, playerName: 'Drake London', position: 'WR', positionRankAtDraft: 12, draftedByTeamId: 'tc', seasonPoints: 234.0, expectedPoints: 214, valueScore: 20.0, tierTransition: 'STARTER→STARTER', verdict: 'STEAL' },
  { pickNumber: 26, round: 3, pickInRound: 6, playerName: 'Kyren Williams', position: 'RB', positionRankAtDraft: 12, draftedByTeamId: 'ww', seasonPoints: 234.0, expectedPoints: 214, valueScore: 20.0, tierTransition: 'STARTER→STARTER', verdict: 'STEAL' },
  { pickNumber: 27, round: 3, pickInRound: 7, playerName: 'Omarion Hampton', position: 'RB', positionRankAtDraft: 13, draftedByTeamId: 'bn', seasonPoints: 171.0, expectedPoints: 214, valueScore: -43.0, tierTransition: 'STARTER→BENCH', verdict: 'BUST' },
  { pickNumber: 28, round: 3, pickInRound: 8, playerName: 'Kenneth Walker', position: 'RB', positionRankAtDraft: 14, draftedByTeamId: 'tb', seasonPoints: 217.0, expectedPoints: 214, valueScore: 3.0, tierTransition: 'STARTER→BENCH', verdict: 'SOLID' },
  { pickNumber: 29, round: 3, pickInRound: 9, playerName: 'Trey McBride', position: 'TE', positionRankAtDraft: 2, draftedByTeamId: 'mm', seasonPoints: 199.0, expectedPoints: 179, valueScore: 20.0, tierTransition: 'ELITE→ELITE', verdict: 'STEAL' },
  { pickNumber: 30, round: 3, pickInRound: 10, playerName: 'James Cook', position: 'RB', positionRankAtDraft: 15, draftedByTeamId: 'wg', seasonPoints: 234.0, expectedPoints: 214, valueScore: 20.0, tierTransition: 'STARTER→ELITE', verdict: 'STEAL' },
  { pickNumber: 31, round: 4, pickInRound: 1, playerName: 'Lamar Jackson', position: 'QB', positionRankAtDraft: 2, draftedByTeamId: 'wg', seasonPoints: 159.5, expectedPoints: 166, valueScore: -6.5, tierTransition: 'ELITE→STARTER', verdict: 'MISS' },
  { pickNumber: 32, round: 4, pickInRound: 2, playerName: 'Chuba Hubbard', position: 'RB', positionRankAtDraft: 16, draftedByTeamId: 'mm', seasonPoints: 163.0, expectedPoints: 196, valueScore: -33.0, tierTransition: 'STARTER→BENCH', verdict: 'BUST' },
  { pickNumber: 33, round: 4, pickInRound: 3, playerName: 'Breece Hall', position: 'RB', positionRankAtDraft: 17, draftedByTeamId: 'tb', seasonPoints: 199.0, expectedPoints: 196, valueScore: 3.0, tierTransition: 'STARTER→STARTER', verdict: 'SOLID' },
  { pickNumber: 34, round: 4, pickInRound: 4, playerName: 'Tee Higgins', position: 'WR', positionRankAtDraft: 13, draftedByTeamId: 'bn', seasonPoints: 169.5, expectedPoints: 196, valueScore: -26.5, tierTransition: 'STARTER→STARTER', verdict: 'BUST' },
  { pickNumber: 35, round: 4, pickInRound: 5, playerName: 'Jayden Daniels', position: 'QB', positionRankAtDraft: 3, draftedByTeamId: 'ww', seasonPoints: 159.5, expectedPoints: 166, valueScore: -6.5, tierTransition: 'ELITE→STARTER', verdict: 'MISS' },
  { pickNumber: 36, round: 4, pickInRound: 6, playerName: 'Jaxon Smith-Njigba', position: 'WR', positionRankAtDraft: 14, draftedByTeamId: 'tc', seasonPoints: 244.0, expectedPoints: 196, valueScore: 48.0, tierTransition: 'STARTER→ELITE', verdict: 'STEAL' },
  { pickNumber: 37, round: 4, pickInRound: 7, playerName: 'Mike Evans', position: 'WR', positionRankAtDraft: 15, draftedByTeamId: 'ta', seasonPoints: 163.0, expectedPoints: 196, valueScore: -33.0, tierTransition: 'STARTER→WAIVER', verdict: 'BUST' },
  { pickNumber: 38, round: 4, pickInRound: 8, playerName: 'TreVeyon Henderson', position: 'RB', positionRankAtDraft: 18, draftedByTeamId: 'hg', seasonPoints: 199.0, expectedPoints: 196, valueScore: 3.0, tierTransition: 'STARTER→STARTER', verdict: 'SOLID' },
  { pickNumber: 39, round: 4, pickInRound: 9, playerName: 'DK Metcalf', position: 'WR', positionRankAtDraft: 16, draftedByTeamId: 'jc', seasonPoints: 169.5, expectedPoints: 196, valueScore: -26.5, tierTransition: 'STARTER→STARTER', verdict: 'BUST' },
  { pickNumber: 40, round: 4, pickInRound: 10, playerName: 'Marvin Harrison Jr.', position: 'WR', positionRankAtDraft: 17, draftedByTeamId: 'bb', seasonPoints: 169.5, expectedPoints: 196, valueScore: -26.5, tierTransition: 'STARTER→BENCH', verdict: 'BUST' },
  { pickNumber: 41, round: 5, pickInRound: 1, playerName: 'Alvin Kamara', position: 'RB', positionRankAtDraft: 19, draftedByTeamId: 'bb', seasonPoints: 162.2, expectedPoints: 178, valueScore: -15.8, tierTransition: 'BENCH→BENCH', verdict: 'MISS' },
  { pickNumber: 42, round: 5, pickInRound: 2, playerName: 'James Conner', position: 'RB', positionRankAtDraft: 20, draftedByTeamId: 'jc', seasonPoints: 156.5, expectedPoints: 178, valueScore: -21.5, tierTransition: 'BENCH→WAIVER', verdict: 'BUST' },
  { pickNumber: 43, round: 5, pickInRound: 3, playerName: 'Tetairoa McMillan', position: 'WR', positionRankAtDraft: 18, draftedByTeamId: 'hg', seasonPoints: 198.0, expectedPoints: 178, valueScore: 20.0, tierTransition: 'STARTER→STARTER', verdict: 'STEAL' },
  { pickNumber: 44, round: 5, pickInRound: 4, playerName: 'George Kittle', position: 'TE', positionRankAtDraft: 3, draftedByTeamId: 'ta', seasonPoints: 137.2, expectedPoints: 143, valueScore: -5.8, tierTransition: 'ELITE→STARTER', verdict: 'MISS' },
  { pickNumber: 45, round: 5, pickInRound: 5, playerName: 'Jalen Hurts', position: 'QB', positionRankAtDraft: 4, draftedByTeamId: 'tc', seasonPoints: 181.0, expectedPoints: 148, valueScore: 33.0, tierTransition: 'STARTER→ELITE', verdict: 'STEAL' },
  { pickNumber: 46, round: 5, pickInRound: 6, playerName: 'Terry McLaurin', position: 'WR', positionRankAtDraft: 19, draftedByTeamId: 'ww', seasonPoints: 156.5, expectedPoints: 178, valueScore: -21.5, tierTransition: 'STARTER→BENCH', verdict: 'BUST' },
  { pickNumber: 47, round: 5, pickInRound: 7, playerName: 'Joe Burrow', position: 'QB', positionRankAtDraft: 5, draftedByTeamId: 'bn', seasonPoints: 136.5, expectedPoints: 148, valueScore: -11.5, tierTransition: 'STARTER→BENCH', verdict: 'MISS' },
  { pickNumber: 48, round: 5, pickInRound: 8, playerName: 'RJ Harvey', position: 'RB', positionRankAtDraft: 21, draftedByTeamId: 'tb', seasonPoints: 168.0, expectedPoints: 178, valueScore: -10.0, tierTransition: 'BENCH→BENCH', verdict: 'MISS' },
  { pickNumber: 49, round: 5, pickInRound: 9, playerName: 'Garrett Wilson', position: 'WR', positionRankAtDraft: 20, draftedByTeamId: 'mm', seasonPoints: 156.5, expectedPoints: 178, valueScore: -21.5, tierTransition: 'STARTER→BENCH', verdict: 'BUST' },
  { pickNumber: 50, round: 5, pickInRound: 10, playerName: 'David Montgomery', position: 'RB', positionRankAtDraft: 22, draftedByTeamId: 'wg', seasonPoints: 168.0, expectedPoints: 178, valueScore: -10.0, tierTransition: 'BENCH→BENCH', verdict: 'MISS' },
  { pickNumber: 51, round: 6, pickInRound: 1, playerName: 'DeVonta Smith', position: 'WR', positionRankAtDraft: 21, draftedByTeamId: 'wg', seasonPoints: 172.0, expectedPoints: 160, valueScore: 12.0, tierTransition: 'STARTER→STARTER', verdict: 'HIT' },
  { pickNumber: 52, round: 6, pickInRound: 2, playerName: 'Tony Pollard', position: 'RB', positionRankAtDraft: 23, draftedByTeamId: 'mm', seasonPoints: 160.0, expectedPoints: 160, valueScore: 0.0, tierTransition: 'BENCH→BENCH', verdict: 'SOLID' },
  { pickNumber: 53, round: 6, pickInRound: 3, playerName: 'DJ Moore', position: 'WR', positionRankAtDraft: 22, draftedByTeamId: 'tb', seasonPoints: 156.6, expectedPoints: 160, valueScore: -3.4, tierTransition: 'STARTER→BENCH', verdict: 'SOLID' },
  { pickNumber: 54, round: 6, pickInRound: 4, playerName: 'D\'Andre Swift', position: 'RB', positionRankAtDraft: 24, draftedByTeamId: 'bn', seasonPoints: 172.0, expectedPoints: 160, valueScore: 12.0, tierTransition: 'BENCH→STARTER', verdict: 'HIT' },
  { pickNumber: 55, round: 6, pickInRound: 5, playerName: 'George Pickens', position: 'WR', positionRankAtDraft: 23, draftedByTeamId: 'ww', seasonPoints: 218.0, expectedPoints: 160, valueScore: 58.0, tierTransition: 'STARTER→ELITE', verdict: 'JACKPOT' },
  { pickNumber: 56, round: 6, pickInRound: 6, playerName: 'Jameson Williams', position: 'WR', positionRankAtDraft: 24, draftedByTeamId: 'tc', seasonPoints: 172.0, expectedPoints: 160, valueScore: 12.0, tierTransition: 'STARTER→STARTER', verdict: 'HIT' },
  { pickNumber: 57, round: 6, pickInRound: 7, playerName: 'Davante Adams', position: 'WR', positionRankAtDraft: 25, draftedByTeamId: 'ta', seasonPoints: 190.0, expectedPoints: 160, valueScore: 30.0, tierTransition: 'BENCH→ELITE', verdict: 'STEAL' },
  { pickNumber: 58, round: 6, pickInRound: 8, playerName: 'Isiah Pacheco', position: 'RB', positionRankAtDraft: 25, draftedByTeamId: 'hg', seasonPoints: 156.6, expectedPoints: 160, valueScore: -3.4, tierTransition: 'BENCH→WAIVER', verdict: 'SOLID' },
  { pickNumber: 59, round: 6, pickInRound: 9, playerName: 'Courtland Sutton', position: 'WR', positionRankAtDraft: 26, draftedByTeamId: 'jc', seasonPoints: 172.0, expectedPoints: 160, valueScore: 12.0, tierTransition: 'BENCH→STARTER', verdict: 'HIT' },
  { pickNumber: 60, round: 6, pickInRound: 10, playerName: 'Aaron Jones', position: 'RB', positionRankAtDraft: 26, draftedByTeamId: 'bb', seasonPoints: 156.6, expectedPoints: 160, valueScore: -3.4, tierTransition: 'BENCH→BENCH', verdict: 'SOLID' },
  { pickNumber: 61, round: 7, pickInRound: 1, playerName: 'Calvin Ridley', position: 'WR', positionRankAtDraft: 27, draftedByTeamId: 'bb', seasonPoints: 139.0, expectedPoints: 142, valueScore: -3.0, tierTransition: 'BENCH→BENCH', verdict: 'SOLID' },
  { pickNumber: 62, round: 7, pickInRound: 2, playerName: 'Jordan Addison', position: 'WR', positionRankAtDraft: 28, draftedByTeamId: 'jc', seasonPoints: 139.0, expectedPoints: 142, valueScore: -3.0, tierTransition: 'BENCH→BENCH', verdict: 'SOLID' },
  { pickNumber: 63, round: 7, pickInRound: 3, playerName: 'Ricky Pearsall', position: 'WR', positionRankAtDraft: 29, draftedByTeamId: 'hg', seasonPoints: 139.0, expectedPoints: 142, valueScore: -3.0, tierTransition: 'BENCH→BENCH', verdict: 'SOLID' },
  { pickNumber: 64, round: 7, pickInRound: 4, playerName: 'Xavier Worthy', position: 'WR', positionRankAtDraft: 30, draftedByTeamId: 'ta', seasonPoints: 139.0, expectedPoints: 142, valueScore: -3.0, tierTransition: 'BENCH→BENCH', verdict: 'SOLID' },
  { pickNumber: 65, round: 7, pickInRound: 5, playerName: 'Emeka Egbuka', position: 'WR', positionRankAtDraft: 31, draftedByTeamId: 'tc', seasonPoints: 184.0, expectedPoints: 142, valueScore: 42.0, tierTransition: 'BENCH→STARTER', verdict: 'STEAL' },
  { pickNumber: 66, round: 7, pickInRound: 6, playerName: 'Sam LaPorta', position: 'TE', positionRankAtDraft: 4, draftedByTeamId: 'ww', seasonPoints: 113.0, expectedPoints: 107, valueScore: 6.0, tierTransition: 'STARTER→STARTER', verdict: 'SOLID' },
  { pickNumber: 67, round: 7, pickInRound: 7, playerName: 'Jaylen Waddle', position: 'WR', positionRankAtDraft: 32, draftedByTeamId: 'bn', seasonPoints: 160.0, expectedPoints: 142, valueScore: 18.0, tierTransition: 'BENCH→STARTER', verdict: 'HIT' },
  { pickNumber: 68, round: 7, pickInRound: 8, playerName: 'Zay Flowers', position: 'WR', positionRankAtDraft: 33, draftedByTeamId: 'tb', seasonPoints: 144.4, expectedPoints: 142, valueScore: 2.4, tierTransition: 'BENCH→BENCH', verdict: 'SOLID' },
  { pickNumber: 69, round: 7, pickInRound: 9, playerName: 'Jerry Jeudy', position: 'WR', positionRankAtDraft: 34, draftedByTeamId: 'mm', seasonPoints: 142.0, expectedPoints: 142, valueScore: 0.0, tierTransition: 'BENCH→BENCH', verdict: 'SOLID' },
  { pickNumber: 70, round: 7, pickInRound: 10, playerName: 'Rashee Rice', position: 'WR', positionRankAtDraft: 35, draftedByTeamId: 'wg', seasonPoints: 144.4, expectedPoints: 142, valueScore: 2.4, tierTransition: 'BENCH→BENCH', verdict: 'SOLID' },
  { pickNumber: 71, round: 8, pickInRound: 1, playerName: 'Mark Andrews', position: 'TE', positionRankAtDraft: 5, draftedByTeamId: 'wg', seasonPoints: 89.0, expectedPoints: 89, valueScore: 0.0, tierTransition: 'STARTER→STARTER', verdict: 'SOLID' },
  { pickNumber: 72, round: 8, pickInRound: 2, playerName: 'Rome Odunze', position: 'WR', positionRankAtDraft: 36, draftedByTeamId: 'mm', seasonPoints: 142.0, expectedPoints: 124, valueScore: 18.0, tierTransition: 'BENCH→STARTER', verdict: 'HIT' },
  { pickNumber: 73, round: 8, pickInRound: 3, playerName: 'Jakobi Meyers', position: 'WR', positionRankAtDraft: 37, draftedByTeamId: 'tb', seasonPoints: 124.0, expectedPoints: 124, valueScore: 0.0, tierTransition: 'BENCH→BENCH', verdict: 'SOLID' },
  { pickNumber: 74, round: 8, pickInRound: 4, playerName: 'Joe Mixon', position: 'RB', positionRankAtDraft: 27, draftedByTeamId: 'bn', seasonPoints: 121.0, expectedPoints: 124, valueScore: -3.0, tierTransition: 'BENCH→WAIVER', verdict: 'SOLID' },
  { pickNumber: 75, round: 8, pickInRound: 5, playerName: 'Zach Charbonnet', position: 'RB', positionRankAtDraft: 28, draftedByTeamId: 'ww', seasonPoints: 124.0, expectedPoints: 124, valueScore: 0.0, tierTransition: 'BENCH→BENCH', verdict: 'SOLID' },
  { pickNumber: 76, round: 8, pickInRound: 6, playerName: 'Jaylen Warren', position: 'RB', positionRankAtDraft: 29, draftedByTeamId: 'tc', seasonPoints: 138.4, expectedPoints: 124, valueScore: 14.4, tierTransition: 'BENCH→BENCH', verdict: 'HIT' },
  { pickNumber: 77, round: 8, pickInRound: 7, playerName: 'Patrick Mahomes', position: 'QB', positionRankAtDraft: 6, draftedByTeamId: 'ta', seasonPoints: 132.0, expectedPoints: 94, valueScore: 38.0, tierTransition: 'STARTER→ELITE', verdict: 'STEAL' },
  { pickNumber: 78, round: 8, pickInRound: 8, playerName: 'Deebo Samuel', position: 'WR', positionRankAtDraft: 38, draftedByTeamId: 'hg', seasonPoints: 126.4, expectedPoints: 124, valueScore: 2.4, tierTransition: 'BENCH→STARTER', verdict: 'SOLID' },
  { pickNumber: 79, round: 8, pickInRound: 9, playerName: 'Jordan Mason', position: 'RB', positionRankAtDraft: 30, draftedByTeamId: 'jc', seasonPoints: 124.0, expectedPoints: 124, valueScore: 0.0, tierTransition: 'BENCH→BENCH', verdict: 'SOLID' },
  { pickNumber: 80, round: 8, pickInRound: 10, playerName: 'Kyler Murray', position: 'QB', positionRankAtDraft: 7, draftedByTeamId: 'bb', seasonPoints: 100.0, expectedPoints: 94, valueScore: 6.0, tierTransition: 'STARTER→STARTER', verdict: 'SOLID' },
  { pickNumber: 81, round: 9, pickInRound: 1, playerName: 'Chris Olave', position: 'WR', positionRankAtDraft: 39, draftedByTeamId: 'bb', seasonPoints: 148.0, expectedPoints: 106, valueScore: 42.0, tierTransition: 'BENCH→STARTER', verdict: 'STEAL' },
  { pickNumber: 82, round: 9, pickInRound: 2, playerName: 'Baker Mayfield', position: 'QB', positionRankAtDraft: 8, draftedByTeamId: 'jc', seasonPoints: 82.0, expectedPoints: 76, valueScore: 6.0, tierTransition: 'STARTER→STARTER', verdict: 'SOLID' },
  { pickNumber: 83, round: 9, pickInRound: 3, playerName: 'Stefon Diggs', position: 'WR', positionRankAtDraft: 40, draftedByTeamId: 'hg', seasonPoints: 108.4, expectedPoints: 106, valueScore: 2.4, tierTransition: 'BENCH→BENCH', verdict: 'SOLID' },
  { pickNumber: 84, round: 9, pickInRound: 4, playerName: 'Kaleb Johnson', position: 'RB', positionRankAtDraft: 31, draftedByTeamId: 'ta', seasonPoints: 106.0, expectedPoints: 106, valueScore: 0.0, tierTransition: 'BENCH→WAIVER', verdict: 'SOLID' },
  { pickNumber: 85, round: 9, pickInRound: 5, playerName: 'Travis Hunter', position: 'WR', positionRankAtDraft: 41, draftedByTeamId: 'tc', seasonPoints: 106.0, expectedPoints: 106, valueScore: 0.0, tierTransition: 'BENCH→BENCH', verdict: 'SOLID' },
  { pickNumber: 86, round: 9, pickInRound: 6, playerName: 'Jayden Reed', position: 'WR', positionRankAtDraft: 42, draftedByTeamId: 'ww', seasonPoints: 106.0, expectedPoints: 106, valueScore: 0.0, tierTransition: 'BENCH→WAIVER', verdict: 'SOLID' },
  { pickNumber: 87, round: 9, pickInRound: 7, playerName: 'T.J. Hockenson', position: 'TE', positionRankAtDraft: 6, draftedByTeamId: 'bn', seasonPoints: 77.0, expectedPoints: 71, valueScore: 6.0, tierTransition: 'STARTER→BENCH', verdict: 'SOLID' },
  { pickNumber: 88, round: 9, pickInRound: 8, playerName: 'C.J. Stroud', position: 'QB', positionRankAtDraft: 9, draftedByTeamId: 'tb', seasonPoints: 66.0, expectedPoints: 76, valueScore: -10.0, tierTransition: 'STARTER→BENCH', verdict: 'MISS' },
  { pickNumber: 89, round: 9, pickInRound: 9, playerName: 'Austin Ekeler', position: 'RB', positionRankAtDraft: 32, draftedByTeamId: 'mm', seasonPoints: 106.0, expectedPoints: 106, valueScore: 0.0, tierTransition: 'BENCH→WAIVER', verdict: 'SOLID' },
  { pickNumber: 90, round: 9, pickInRound: 10, playerName: 'Cooper Kupp', position: 'WR', positionRankAtDraft: 43, draftedByTeamId: 'wg', seasonPoints: 106.0, expectedPoints: 106, valueScore: 0.0, tierTransition: 'BENCH→BENCH', verdict: 'SOLID' },
  { pickNumber: 91, round: 10, pickInRound: 1, playerName: 'J.K. Dobbins', position: 'RB', positionRankAtDraft: 33, draftedByTeamId: 'wg', seasonPoints: 90.8, expectedPoints: 88, valueScore: 2.8, tierTransition: 'BENCH→BENCH', verdict: 'SOLID' },
  { pickNumber: 92, round: 10, pickInRound: 2, playerName: 'Cam Skattebo', position: 'RB', positionRankAtDraft: 34, draftedByTeamId: 'mm', seasonPoints: 90.8, expectedPoints: 88, valueScore: 2.8, tierTransition: 'BENCH→BENCH', verdict: 'SOLID' },
  { pickNumber: 93, round: 10, pickInRound: 3, playerName: 'Jacory Croskey-Merritt', position: 'RB', positionRankAtDraft: 35, draftedByTeamId: 'tb', seasonPoints: 90.8, expectedPoints: 88, valueScore: 2.8, tierTransition: 'BENCH→BENCH', verdict: 'SOLID' },
  { pickNumber: 94, round: 10, pickInRound: 4, playerName: 'Jauan Jennings', position: 'WR', positionRankAtDraft: 44, draftedByTeamId: 'bn', seasonPoints: 88.0, expectedPoints: 88, valueScore: 0.0, tierTransition: 'BENCH→BENCH', verdict: 'SOLID' },
  { pickNumber: 95, round: 10, pickInRound: 5, playerName: 'Marvin Mims', position: 'WR', positionRankAtDraft: 45, draftedByTeamId: 'ww', seasonPoints: 88.0, expectedPoints: 88, valueScore: 0.0, tierTransition: 'BENCH→WAIVER', verdict: 'SOLID' },
  { pickNumber: 96, round: 10, pickInRound: 6, playerName: 'Tyrone Tracy', position: 'RB', positionRankAtDraft: 36, draftedByTeamId: 'tc', seasonPoints: 88.0, expectedPoints: 88, valueScore: 0.0, tierTransition: 'BENCH→WAIVER', verdict: 'SOLID' },
  { pickNumber: 97, round: 10, pickInRound: 7, playerName: 'Matthew Golden', position: 'WR', positionRankAtDraft: 46, draftedByTeamId: 'ta', seasonPoints: 88.0, expectedPoints: 88, valueScore: 0.0, tierTransition: 'BENCH→BENCH', verdict: 'SOLID' },
  { pickNumber: 98, round: 10, pickInRound: 8, playerName: 'David Njoku', position: 'TE', positionRankAtDraft: 7, draftedByTeamId: 'hg', seasonPoints: 43.0, expectedPoints: 53, valueScore: -10.0, tierTransition: 'STARTER→BENCH', verdict: 'MISS' },
  { pickNumber: 99, round: 10, pickInRound: 9, playerName: 'Travis Etienne', position: 'RB', positionRankAtDraft: 37, draftedByTeamId: 'jc', seasonPoints: 109.0, expectedPoints: 88, valueScore: 21.0, tierTransition: 'WAIVER→STARTER', verdict: 'STEAL' },
  { pickNumber: 100, round: 10, pickInRound: 10, playerName: 'Tyler Warren', position: 'TE', positionRankAtDraft: 8, draftedByTeamId: 'bb', seasonPoints: 96.0, expectedPoints: 53, valueScore: 43.0, tierTransition: 'STARTER→ELITE', verdict: 'STEAL' },
]

// Per-team draft aggregate
export interface TeamDraftGrade {
  teamId: string
  rank: number
  grade: 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D'
  numericScore: number
  steals: number
  hits: number
  misses: number
  busts: number
  earlyRoundHitRate: number
  editorialCopy: string
}

// Order by quality: 1 mm (A+), 2 ta (A), 3 ww (A-), 4 bb (B+), 5 tc (B),
// 6 jc (B-), 7 bn (C+), 8 hg (C), 9 wg (C-), 10 tb (D).
export const teamDraftGrades: TeamDraftGrade[] = [
  {
    teamId: 'mm', rank: 1, grade: 'A+', numericScore: 95,
    steals: 3, hits: 1, misses: 0, busts: 2, earlyRoundHitRate: 60,
    editorialCopy: 'Built Different turned the 9th pick into the season\'s cleanest sheet. Amon-Ra and McCaffrey in back-to-back rounds, Trey McBride at TE1, Rome Odunze in round 8. Three steals up top is the highest ceiling in the league.',
  },
  {
    teamId: 'ta', rank: 2, grade: 'A', numericScore: 90,
    steals: 3, hits: 0, misses: 1, busts: 2, earlyRoundHitRate: 20,
    editorialCopy: 'Almost Famous found Patrick Mahomes in round 8 and Davante Adams in round 6. Jahmyr Gibbs as the only first-rounder. Tyreek and Mike Evans hurt, but the late-round math worked.',
  },
  {
    teamId: 'ww', rank: 3, grade: 'A-', numericScore: 87,
    steals: 2, hits: 0, misses: 2, busts: 1, earlyRoundHitRate: 20,
    editorialCopy: 'George Pickens at pick 55. Kyren Williams in round 3. Kaleb Johnson in round 9. The biggest jackpot of the draft plus two more steals from the bench rounds. Sophomore owner, third-year results.',
  },
  {
    teamId: 'bb', rank: 4, grade: 'B+', numericScore: 83,
    steals: 3, hits: 0, misses: 2, busts: 2, earlyRoundHitRate: 20,
    editorialCopy: 'Built the draft around late-round steals. Tyler Warren at pick 100. Chris Olave in round 9. Josh Jacobs in round 2. The first round (Saquon) did not cooperate, but the model recovered.',
  },
  {
    teamId: 'tc', rank: 5, grade: 'B', numericScore: 80,
    steals: 4, hits: 2, misses: 1, busts: 1, earlyRoundHitRate: 60,
    editorialCopy: 'CeeDee Lamb at pick 5 sank the season\'s narrative, but Jaxon Smith-Njigba in round 4, Jalen Hurts in round 5, and Emeka Egbuka in round 7 paid most of it back. Fallen dynasty\'s draft still works.',
  },
  {
    teamId: 'jc', rank: 6, grade: 'B-', numericScore: 77,
    steals: 1, hits: 1, misses: 3, busts: 2, earlyRoundHitRate: 0,
    editorialCopy: 'Bijan Robinson at pick 2 returned average. Brock Bowers as TE1 returned average. Travis Etienne in round 10 was the late win. The host drafted like the host.',
  },
  {
    teamId: 'bn', rank: 7, grade: 'C+', numericScore: 73,
    steals: 1, hits: 2, misses: 1, busts: 3, earlyRoundHitRate: 20,
    editorialCopy: 'Justin Jefferson at pick 7 was the year\'s cautionary tale. Jonathan Taylor in round 2 saved it. Omarion Hampton and Tee Higgins did not. C+ feels generous.',
  },
  {
    teamId: 'hg', rank: 8, grade: 'C', numericScore: 70,
    steals: 2, hits: 0, misses: 2, busts: 1, earlyRoundHitRate: 40,
    editorialCopy: 'Ja\'Marr Chase at pick 3 underdelivered. Bucky Irving at pick 18 was a -85 DISASTER. Josh Allen in round 3 and Tetairoa McMillan in round 5 were the only real saves.',
  },
  {
    teamId: 'wg', rank: 9, grade: 'C-', numericScore: 67,
    steals: 1, hits: 1, misses: 3, busts: 1, earlyRoundHitRate: 20,
    editorialCopy: 'Ashton Jeanty in round 1. Malik Nabers in round 2 as a -85 DISASTER. James Cook in round 3 was the one bright spot. The defending champ traded the roster apart.',
  },
  {
    teamId: 'tb', rank: 10, grade: 'D', numericScore: 60,
    steals: 0, hits: 0, misses: 2, busts: 1, earlyRoundHitRate: 0,
    editorialCopy: 'Puka Nacua was the only first-rounder that worked. Brian Thomas in round 2 was the year\'s third-biggest DISASTER. Six straight neutral picks after that. The owner has not logged in since week 5.',
  },
]

// Editorial awards — the hero of the Draft page
export interface DraftAward {
  type: 'steal' | 'bust' | 'best-team'
  pickNumber?: number
  teamId?: string
  headline: string
  body: string
}

export const draftAwards: DraftAward[] = [
  {
    type: 'best-team',
    teamId: 'mm',
    headline: 'Built Different drafted like a different sport.',
    body: 'Amon-Ra St. Brown and Christian McCaffrey back to back. Trey McBride as TE1. Three steals, one hit, no real busts.',
  },
  {
    type: 'steal',
    pickNumber: 55, // ww's R6 WR George Pickens, +58 value
    headline: 'Steal of the draft.',
    body: 'George Pickens at pick 55. Finished as WR2. The Glow Up saw the offense break out before the rest of the league did.',
  },
  {
    type: 'bust',
    pickNumber: 5, // tc's R1 WR CeeDee Lamb, -110 value
    headline: 'The fall starts here.',
    body: 'CeeDee Lamb at pick 5. Finished as WR24. Throne Vacant\'s first-round pick sank the dynasty.',
  },
]

/* ─────────────────────────────────────────────────────────────────
   HISTORY — career stats, full H2H matrix, all-time records,
   computed legacy scores. Used by DemoHistoryView.
───────────────────────────────────────────────────────────────── */

// Per-team aggregate career stats across all played seasons.
// Built for a 10-team league with 6 seasons (2020–2024 completed + 2025 in progress).
// Each season is 14 regular-season weeks + up to 3 playoff weeks for the top 6.
export interface TeamCareerStats {
  teamId: string
  seasonsPlayed: number
  championships: number
  runnerUps: number
  thirdPlaceFinishes: number
  playoffAppearances: number
  regularSeasonTitles: number
  totalWins: number
  totalLosses: number
  totalTies: number
  totalPF: number
  totalPA: number
  avgPPW: number
  bestFinish: number
  worstFinish: number
  highestSeasonAvgPPW: number
}

export const teamCareerStats: Record<string, TeamCareerStats> = {
  mm: { teamId: 'mm', seasonsPlayed: 6, championships: 0, runnerUps: 1, thirdPlaceFinishes: 1,
        playoffAppearances: 4, regularSeasonTitles: 1,
        totalWins: 71, totalLosses: 33, totalTies: 0,
        totalPF: 10248.4, totalPA: 9412.6, avgPPW: 121.4,
        bestFinish: 2, worstFinish: 8, highestSeasonAvgPPW: 128.6 },
  tc: { teamId: 'tc', seasonsPlayed: 6, championships: 2, runnerUps: 1, thirdPlaceFinishes: 0,
        playoffAppearances: 5, regularSeasonTitles: 3,
        totalWins: 78, totalLosses: 26, totalTies: 0,
        totalPF: 10895.2, totalPA: 9342.1, avgPPW: 125.8,
        bestFinish: 1, worstFinish: 6, highestSeasonAvgPPW: 134.2 },
  ta: { teamId: 'ta', seasonsPlayed: 6, championships: 0, runnerUps: 2, thirdPlaceFinishes: 2,
        playoffAppearances: 5, regularSeasonTitles: 0,
        totalWins: 64, totalLosses: 40, totalTies: 0,
        totalPF:  9876.3, totalPA: 9521.4, avgPPW: 116.2,
        bestFinish: 2, worstFinish: 6, highestSeasonAvgPPW: 124.4 },
  ww: { teamId: 'ww', seasonsPlayed: 2, championships: 0, runnerUps: 0, thirdPlaceFinishes: 0,
        playoffAppearances: 1, regularSeasonTitles: 0,
        totalWins: 18, totalLosses: 10, totalTies: 0,
        totalPF:  3198.4, totalPA: 2987.6, avgPPW: 114.2,
        bestFinish: 4, worstFinish: 8, highestSeasonAvgPPW: 118.1 },
  bb: { teamId: 'bb', seasonsPlayed: 6, championships: 0, runnerUps: 0, thirdPlaceFinishes: 0,
        playoffAppearances: 3, regularSeasonTitles: 0,
        totalWins: 54, totalLosses: 50, totalTies: 0,
        totalPF:  9543.7, totalPA: 9612.8, avgPPW: 113.6,
        bestFinish: 4, worstFinish: 7, highestSeasonAvgPPW: 119.0 },
  wg: { teamId: 'wg', seasonsPlayed: 6, championships: 2, runnerUps: 0, thirdPlaceFinishes: 0,
        playoffAppearances: 4, regularSeasonTitles: 2,
        totalWins: 65, totalLosses: 39, totalTies: 0,
        totalPF:  9912.5, totalPA: 9367.2, avgPPW: 117.5,
        bestFinish: 1, worstFinish: 6, highestSeasonAvgPPW: 126.4 },
  jc: { teamId: 'jc', seasonsPlayed: 6, championships: 0, runnerUps: 0, thirdPlaceFinishes: 0,
        playoffAppearances: 2, regularSeasonTitles: 0,
        totalWins: 49, totalLosses: 55, totalTies: 0,
        totalPF:  9234.0, totalPA: 9612.4, avgPPW: 109.8,
        bestFinish: 5, worstFinish: 7, highestSeasonAvgPPW: 116.4 },
  bn: { teamId: 'bn', seasonsPlayed: 6, championships: 0, runnerUps: 0, thirdPlaceFinishes: 0,
        playoffAppearances: 2, regularSeasonTitles: 0,
        totalWins: 48, totalLosses: 56, totalTies: 0,
        totalPF:  9012.4, totalPA: 9587.2, avgPPW: 107.3,
        bestFinish: 5, worstFinish: 8, highestSeasonAvgPPW: 114.8 },
  hg: { teamId: 'hg', seasonsPlayed: 6, championships: 1, runnerUps: 0, thirdPlaceFinishes: 0,
        playoffAppearances: 2, regularSeasonTitles: 1,
        totalWins: 45, totalLosses: 59, totalTies: 0,
        totalPF:  8743.2, totalPA: 9612.4, avgPPW: 104.1,
        bestFinish: 1, worstFinish: 9, highestSeasonAvgPPW: 121.6 },
  tb: { teamId: 'tb', seasonsPlayed: 6, championships: 0, runnerUps: 0, thirdPlaceFinishes: 0,
        playoffAppearances: 0, regularSeasonTitles: 0,
        totalWins: 22, totalLosses: 82, totalTies: 0,
        totalPF:  7234.6, totalPA: 9876.2, avgPPW:  86.1,
        bestFinish: 8, worstFinish: 10, highestSeasonAvgPPW:  92.4 },
}

// Cumulative legacy score per team at each season's end (2020..2025).
// Used by the Legacy Score Trends chart. The 2025 value matches the final legacyScores below.
export interface LegacyTrendRow {
  teamId: string
  // index 0 = end of 2020, index 5 = current (mid-2025)
  cumulative: number[]
}

export const legacyTrend: LegacyTrendRow[] = [
  { teamId: 'tc', cumulative: [ 150,  300,  640,  990, 1240, 1339] },
  { teamId: 'wg', cumulative: [ 360,  470,  580,  680,  920, 1005] },
  { teamId: 'ta', cumulative: [ 280,  370,  470,  600,  760,  857] },
  { teamId: 'mm', cumulative: [  85,  180,  340,  470,  640,  743] },
  { teamId: 'hg', cumulative: [ 110,  360,  395,  430,  490,  530] },
  { teamId: 'bb', cumulative: [  90,  160,  220,  260,  300,  337] },
  { teamId: 'jc', cumulative: [  65,  115,  165,  205,  240,  267] },
  { teamId: 'bn', cumulative: [  60,  110,  160,  200,  235,  264] },
  { teamId: 'ww', cumulative: [   0,    0,    0,    0,   60,  119] },
  { teamId: 'tb', cumulative: [  25,   40,   55,   70,   85,   96] },
]

// Full head-to-head matrix: 45 pairings (10 choose 2).
// Each record reflects all regular-season + playoff meetings across played seasons.
export interface H2HRecord {
  teamA: string
  teamB: string
  aWins: number
  bWins: number
  aPoints: number
  bPoints: number
  biggestBlowoutMargin?: number
  biggestBlowoutWinner?: string
  closestGameMargin?: number
}

export const h2hMatrix: H2HRecord[] = [
  // mm pairs
  { teamA: 'mm', teamB: 'tc', aWins: 5, bWins: 7, aPoints: 1486.2, bPoints: 1564.8, biggestBlowoutMargin: 41.4, biggestBlowoutWinner: 'tc', closestGameMargin: 0.8 },
  { teamA: 'mm', teamB: 'ta', aWins: 7, bWins: 5, aPoints: 1502.6, bPoints: 1426.3, biggestBlowoutMargin: 38.2, biggestBlowoutWinner: 'mm', closestGameMargin: 1.4 },
  { teamA: 'mm', teamB: 'ww', aWins: 2, bWins: 0, aPoints:  283.2, bPoints:  214.8, biggestBlowoutMargin: 33.5, biggestBlowoutWinner: 'mm', closestGameMargin: 12.4 },
  { teamA: 'mm', teamB: 'bb', aWins: 8, bWins: 4, aPoints: 1480.6, bPoints: 1342.1, biggestBlowoutMargin: 44.3, biggestBlowoutWinner: 'mm', closestGameMargin: 1.2 },
  { teamA: 'mm', teamB: 'wg', aWins: 7, bWins: 5, aPoints: 1492.4, bPoints: 1428.0, biggestBlowoutMargin: 52.6, biggestBlowoutWinner: 'mm', closestGameMargin: 2.1 },
  { teamA: 'mm', teamB: 'jc', aWins: 9, bWins: 3, aPoints: 1518.4, bPoints: 1304.6, biggestBlowoutMargin: 58.9, biggestBlowoutWinner: 'mm', closestGameMargin: 3.4 },
  { teamA: 'mm', teamB: 'bn', aWins: 9, bWins: 3, aPoints: 1502.0, bPoints: 1284.4, biggestBlowoutMargin: 60.2, biggestBlowoutWinner: 'mm', closestGameMargin: 2.8 },
  { teamA: 'mm', teamB: 'hg', aWins: 10, bWins: 2, aPoints: 1538.2, bPoints: 1238.6, biggestBlowoutMargin: 71.4, biggestBlowoutWinner: 'mm', closestGameMargin: 4.2 },
  { teamA: 'mm', teamB: 'tb', aWins: 12, bWins: 0, aPoints: 1572.4, bPoints: 1058.2, biggestBlowoutMargin: 89.6, biggestBlowoutWinner: 'mm', closestGameMargin: 18.2 },
  // tc pairs
  { teamA: 'tc', teamB: 'ta', aWins: 7, bWins: 4, aPoints: 1442.6, bPoints: 1278.4, biggestBlowoutMargin: 43.7, biggestBlowoutWinner: 'tc', closestGameMargin: 2.4 },
  { teamA: 'tc', teamB: 'ww', aWins: 2, bWins: 1, aPoints:  402.6, bPoints:  366.4, biggestBlowoutMargin: 22.4, biggestBlowoutWinner: 'tc', closestGameMargin: 3.8 },
  { teamA: 'tc', teamB: 'bb', aWins: 9, bWins: 3, aPoints: 1564.2, bPoints: 1372.4, biggestBlowoutMargin: 54.6, biggestBlowoutWinner: 'tc', closestGameMargin: 1.8 },
  { teamA: 'tc', teamB: 'wg', aWins: 7, bWins: 4, aPoints: 1492.3, bPoints: 1394.7, biggestBlowoutMargin: 48.2, biggestBlowoutWinner: 'tc', closestGameMargin: 0.6 },
  { teamA: 'tc', teamB: 'jc', aWins: 10, bWins: 2, aPoints: 1596.4, bPoints: 1278.2, biggestBlowoutMargin: 64.8, biggestBlowoutWinner: 'tc', closestGameMargin: 4.4 },
  { teamA: 'tc', teamB: 'bn', aWins: 10, bWins: 2, aPoints: 1582.0, bPoints: 1244.6, biggestBlowoutMargin: 68.4, biggestBlowoutWinner: 'tc', closestGameMargin: 3.2 },
  { teamA: 'tc', teamB: 'hg', aWins: 10, bWins: 2, aPoints: 1604.8, bPoints: 1218.4, biggestBlowoutMargin: 76.2, biggestBlowoutWinner: 'tc', closestGameMargin: 2.6 },
  { teamA: 'tc', teamB: 'tb', aWins: 11, bWins: 1, aPoints: 1648.6, bPoints: 1024.8, biggestBlowoutMargin: 94.2, biggestBlowoutWinner: 'tc', closestGameMargin: 14.6 },
  // ta pairs
  { teamA: 'ta', teamB: 'ww', aWins: 2, bWins: 1, aPoints:  368.4, bPoints:  342.6, biggestBlowoutMargin: 28.6, biggestBlowoutWinner: 'ta', closestGameMargin: 4.4 },
  { teamA: 'ta', teamB: 'bb', aWins: 6, bWins: 5, aPoints: 1372.4, bPoints: 1344.8, biggestBlowoutMargin: 36.4, biggestBlowoutWinner: 'ta', closestGameMargin: 0.4 },
  { teamA: 'ta', teamB: 'wg', aWins: 5, bWins: 6, aPoints: 1342.6, bPoints: 1402.4, biggestBlowoutMargin: 38.2, biggestBlowoutWinner: 'wg', closestGameMargin: 1.6 },
  { teamA: 'ta', teamB: 'jc', aWins: 8, bWins: 4, aPoints: 1462.0, bPoints: 1342.6, biggestBlowoutMargin: 42.8, biggestBlowoutWinner: 'ta', closestGameMargin: 2.2 },
  { teamA: 'ta', teamB: 'bn', aWins: 8, bWins: 3, aPoints: 1418.4, bPoints: 1248.6, biggestBlowoutMargin: 46.2, biggestBlowoutWinner: 'ta', closestGameMargin: 1.8 },
  { teamA: 'ta', teamB: 'hg', aWins: 8, bWins: 3, aPoints: 1404.6, bPoints: 1212.4, biggestBlowoutMargin: 52.4, biggestBlowoutWinner: 'ta', closestGameMargin: 3.6 },
  { teamA: 'ta', teamB: 'tb', aWins: 11, bWins: 1, aPoints: 1586.4, bPoints: 1042.8, biggestBlowoutMargin: 78.6, biggestBlowoutWinner: 'ta', closestGameMargin: 16.4 },
  // ww pairs
  { teamA: 'ww', teamB: 'bb', aWins: 2, bWins: 1, aPoints:  342.6, bPoints:  328.4, biggestBlowoutMargin: 18.6, biggestBlowoutWinner: 'ww', closestGameMargin: 2.8 },
  { teamA: 'ww', teamB: 'wg', aWins: 3, bWins: 0, aPoints:  368.4, bPoints:  302.6, biggestBlowoutMargin: 28.4, biggestBlowoutWinner: 'ww', closestGameMargin: 8.2 },
  { teamA: 'ww', teamB: 'jc', aWins: 2, bWins: 1, aPoints:  336.4, bPoints:  324.8, biggestBlowoutMargin: 22.4, biggestBlowoutWinner: 'ww', closestGameMargin: 4.6 },
  { teamA: 'ww', teamB: 'bn', aWins: 2, bWins: 1, aPoints:  342.2, bPoints:  318.6, biggestBlowoutMargin: 24.8, biggestBlowoutWinner: 'ww', closestGameMargin: 3.4 },
  { teamA: 'ww', teamB: 'hg', aWins: 2, bWins: 0, aPoints:  282.6, bPoints:  226.4, biggestBlowoutMargin: 32.6, biggestBlowoutWinner: 'ww', closestGameMargin: 18.4 },
  { teamA: 'ww', teamB: 'tb', aWins: 3, bWins: 0, aPoints:  368.2, bPoints:  248.6, biggestBlowoutMargin: 48.4, biggestBlowoutWinner: 'ww', closestGameMargin: 22.6 },
  // bb pairs
  { teamA: 'bb', teamB: 'wg', aWins: 5, bWins: 6, aPoints: 1296.4, bPoints: 1348.2, biggestBlowoutMargin: 32.4, biggestBlowoutWinner: 'wg', closestGameMargin: 1.4 },
  { teamA: 'bb', teamB: 'jc', aWins: 6, bWins: 5, aPoints: 1342.8, bPoints: 1304.6, biggestBlowoutMargin: 28.6, biggestBlowoutWinner: 'bb', closestGameMargin: 0.8 },
  { teamA: 'bb', teamB: 'bn', aWins: 7, bWins: 4, aPoints: 1386.2, bPoints: 1278.4, biggestBlowoutMargin: 36.4, biggestBlowoutWinner: 'bb', closestGameMargin: 2.6 },
  { teamA: 'bb', teamB: 'hg', aWins: 8, bWins: 3, aPoints: 1402.6, bPoints: 1228.6, biggestBlowoutMargin: 44.2, biggestBlowoutWinner: 'bb', closestGameMargin: 3.8 },
  { teamA: 'bb', teamB: 'tb', aWins: 10, bWins: 2, aPoints: 1508.4, bPoints: 1086.4, biggestBlowoutMargin: 72.8, biggestBlowoutWinner: 'bb', closestGameMargin: 8.6 },
  // wg pairs
  { teamA: 'wg', teamB: 'jc', aWins: 5, bWins: 3, aPoints:  998.6, bPoints:  928.4, biggestBlowoutMargin: 66.8, biggestBlowoutWinner: 'wg', closestGameMargin: 1.8 },
  { teamA: 'wg', teamB: 'bn', aWins: 8, bWins: 3, aPoints: 1412.4, bPoints: 1268.2, biggestBlowoutMargin: 42.6, biggestBlowoutWinner: 'wg', closestGameMargin: 2.4 },
  { teamA: 'wg', teamB: 'hg', aWins: 8, bWins: 4, aPoints: 1418.6, bPoints: 1284.4, biggestBlowoutMargin: 48.8, biggestBlowoutWinner: 'wg', closestGameMargin: 1.2 },
  { teamA: 'wg', teamB: 'tb', aWins: 11, bWins: 1, aPoints: 1548.2, bPoints: 1062.4, biggestBlowoutMargin: 115.5, biggestBlowoutWinner: 'wg', closestGameMargin: 12.6 },
  // jc pairs
  { teamA: 'jc', teamB: 'bn', aWins: 6, bWins: 5, aPoints: 1278.4, bPoints: 1262.8, biggestBlowoutMargin: 32.4, biggestBlowoutWinner: 'jc', closestGameMargin: 0.6 },
  { teamA: 'jc', teamB: 'hg', aWins: 6, bWins: 5, aPoints: 1294.6, bPoints: 1248.4, biggestBlowoutMargin: 38.2, biggestBlowoutWinner: 'jc', closestGameMargin: 2.4 },
  { teamA: 'jc', teamB: 'tb', aWins: 8, bWins: 4, aPoints: 1378.2, bPoints: 1148.4, biggestBlowoutMargin: 54.2, biggestBlowoutWinner: 'jc', closestGameMargin: 4.8 },
  // bn pairs
  { teamA: 'bn', teamB: 'hg', aWins: 6, bWins: 6, aPoints: 1284.6, bPoints: 1276.4, biggestBlowoutMargin: 34.6, biggestBlowoutWinner: 'bn', closestGameMargin: 0.2 },
  { teamA: 'bn', teamB: 'tb', aWins: 7, bWins: 4, aPoints: 1342.8, bPoints: 1124.6, biggestBlowoutMargin: 48.6, biggestBlowoutWinner: 'bn', closestGameMargin: 3.4 },
  // hg pairs
  { teamA: 'hg', teamB: 'tb', aWins: 5, bWins: 6, aPoints: 1218.4, bPoints: 1228.6, biggestBlowoutMargin: 42.8, biggestBlowoutWinner: 'tb', closestGameMargin: 1.4 },
]

// Hall of Fame + Hall of Shame all-time records.
export interface RecordEntry {
  teamId: string
  season?: number
  week?: number
  value: number
}

export interface AllTimeRecord {
  id: string
  category: 'fame' | 'shame'
  subcategory: 'all-time' | 'season' | 'weekly'
  label: string
  description: string
  headline: RecordEntry
  topTen: RecordEntry[]
}

export const allTimeRecords: AllTimeRecord[] = [
  // Hall of Fame
  {
    id: 'highest-single-week',
    category: 'fame', subcategory: 'weekly',
    label: 'Highest single-week score',
    description: 'All-time best single-week performance',
    headline: { teamId: 'tc', season: 2021, week: 6, value: 202.6 },
    topTen: [
      { teamId: 'tc', season: 2021, week:  6, value: 202.6 },
      { teamId: 'mm', season: 2024, week: 11, value: 195.4 },
      { teamId: 'wg', season: 2024, week:  3, value: 192.5 },
      { teamId: 'ta', season: 2022, week:  8, value: 189.7 },
      { teamId: 'tc', season: 2023, week: 13, value: 189.0 },
      { teamId: 'tc', season: 2022, week: 11, value: 183.2 },
      { teamId: 'mm', season: 2023, week:  7, value: 178.8 },
      { teamId: 'hg', season: 2021, week:  8, value: 175.9 },
      { teamId: 'tc', season: 2020, week: 14, value: 175.3 },
      { teamId: 'ta', season: 2024, week:  9, value: 175.2 },
    ],
  },
  {
    id: 'most-career-wins',
    category: 'fame', subcategory: 'all-time',
    label: 'Most career wins',
    description: 'Most regular-season wins across all years',
    headline: { teamId: 'tc', value: 78 },
    topTen: [
      { teamId: 'tc', value: 78 }, { teamId: 'mm', value: 71 }, { teamId: 'wg', value: 65 },
      { teamId: 'ta', value: 64 }, { teamId: 'bb', value: 54 }, { teamId: 'jc', value: 49 },
      { teamId: 'bn', value: 48 }, { teamId: 'hg', value: 45 }, { teamId: 'tb', value: 22 },
      { teamId: 'ww', value: 18 },
    ],
  },
  {
    id: 'highest-career-ppw',
    category: 'fame', subcategory: 'all-time',
    label: 'Highest career PPW',
    description: 'Best all-time average points per week',
    headline: { teamId: 'tc', value: 125.8 },
    topTen: [
      { teamId: 'tc', value: 125.8 }, { teamId: 'mm', value: 121.4 }, { teamId: 'wg', value: 117.5 },
      { teamId: 'ta', value: 116.2 }, { teamId: 'ww', value: 114.2 }, { teamId: 'bb', value: 113.6 },
      { teamId: 'jc', value: 109.8 }, { teamId: 'bn', value: 107.3 }, { teamId: 'hg', value: 104.1 },
      { teamId: 'tb', value:  86.1 },
    ],
  },
  {
    id: 'best-win-pct',
    category: 'fame', subcategory: 'all-time',
    label: 'Best win percentage',
    description: 'Highest career win percentage (min 10 games)',
    headline: { teamId: 'tc', value: 75.0 },
    topTen: [
      { teamId: 'tc', value: 75.0 }, { teamId: 'mm', value: 68.3 }, { teamId: 'ww', value: 64.3 },
      { teamId: 'wg', value: 62.5 }, { teamId: 'ta', value: 61.5 }, { teamId: 'bb', value: 51.9 },
      { teamId: 'jc', value: 47.1 }, { teamId: 'bn', value: 46.2 }, { teamId: 'hg', value: 43.3 },
      { teamId: 'tb', value: 21.2 },
    ],
  },
  // Hall of Shame
  {
    id: 'lowest-single-week',
    category: 'shame', subcategory: 'weekly',
    label: 'Lowest single-week score',
    description: 'All-time worst single-week performance',
    headline: { teamId: 'tb', season: 2021, week: 14, value: 26.8 },
    topTen: [
      { teamId: 'tb', season: 2021, week: 14, value: 26.8 },
      { teamId: 'tb', season: 2022, week:  9, value: 41.9 },
      { teamId: 'tb', season: 2023, week: 11, value: 42.4 },
      { teamId: 'hg', season: 2024, week:  8, value: 49.2 },
      { teamId: 'tb', season: 2020, week:  3, value: 49.6 },
      { teamId: 'bn', season: 2022, week:  4, value: 54.4 },
      { teamId: 'hg', season: 2023, week: 12, value: 55.0 },
      { teamId: 'jc', season: 2020, week:  7, value: 55.5 },
      { teamId: 'bb', season: 2021, week:  9, value: 58.6 },
      { teamId: 'tb', season: 2024, week: 13, value: 60.2 },
    ],
  },
  {
    id: 'most-career-losses',
    category: 'shame', subcategory: 'all-time',
    label: 'Most career losses',
    description: 'Most regular-season losses across all years',
    headline: { teamId: 'tb', value: 82 },
    topTen: [
      { teamId: 'tb', value: 82 }, { teamId: 'hg', value: 59 }, { teamId: 'bn', value: 56 },
      { teamId: 'jc', value: 55 }, { teamId: 'bb', value: 50 }, { teamId: 'ta', value: 40 },
      { teamId: 'wg', value: 39 }, { teamId: 'mm', value: 33 }, { teamId: 'tc', value: 26 },
      { teamId: 'ww', value: 10 },
    ],
  },
  {
    id: 'lowest-career-ppw',
    category: 'shame', subcategory: 'all-time',
    label: 'Lowest career PPW',
    description: 'Worst all-time average points per week',
    headline: { teamId: 'tb', value: 86.1 },
    topTen: [
      { teamId: 'tb', value:  86.1 }, { teamId: 'hg', value: 104.1 }, { teamId: 'bn', value: 107.3 },
      { teamId: 'jc', value: 109.8 }, { teamId: 'bb', value: 113.6 }, { teamId: 'ww', value: 114.2 },
      { teamId: 'ta', value: 116.2 }, { teamId: 'wg', value: 117.5 }, { teamId: 'mm', value: 121.4 },
      { teamId: 'tc', value: 125.8 },
    ],
  },
  {
    id: 'worst-win-pct',
    category: 'shame', subcategory: 'all-time',
    label: 'Worst win percentage',
    description: 'Lowest career win percentage (min 10 games)',
    headline: { teamId: 'tb', value: 21.2 },
    topTen: [
      { teamId: 'tb', value: 21.2 }, { teamId: 'hg', value: 43.3 }, { teamId: 'bn', value: 46.2 },
      { teamId: 'jc', value: 47.1 }, { teamId: 'bb', value: 51.9 }, { teamId: 'ta', value: 61.5 },
      { teamId: 'wg', value: 62.5 }, { teamId: 'ww', value: 64.3 }, { teamId: 'mm', value: 68.3 },
      { teamId: 'tc', value: 75.0 },
    ],
  },

  // ── SEASON RECORDS (Hall of Fame) ─────────────────────────────────
  {
    id: 'best-season-ppw', category: 'fame', subcategory: 'season',
    label: 'Best single-season PPW',
    description: 'Highest points per week in any one season',
    headline: { teamId: 'tc', season: 2022, value: 134.2 },
    topTen: [
      { teamId: 'tc', season: 2022, value: 134.2 }, { teamId: 'mm', season: 2024, value: 128.6 },
      { teamId: 'wg', season: 2024, value: 126.4 }, { teamId: 'tc', season: 2023, value: 128.7 },
      { teamId: 'ta', season: 2023, value: 124.4 }, { teamId: 'hg', season: 2021, value: 121.6 },
      { teamId: 'tc', season: 2020, value: 122.0 }, { teamId: 'mm', season: 2023, value: 124.1 },
      { teamId: 'wg', season: 2020, value: 119.8 }, { teamId: 'bb', season: 2024, value: 119.0 },
    ],
  },
  {
    id: 'most-season-wins', category: 'fame', subcategory: 'season',
    label: 'Most wins in a season',
    description: 'Best regular-season record across the league',
    headline: { teamId: 'tc', season: 2022, value: 13 },
    topTen: [
      { teamId: 'tc', season: 2022, value: 13 }, { teamId: 'tc', season: 2023, value: 12 },
      { teamId: 'wg', season: 2024, value: 12 }, { teamId: 'mm', season: 2024, value: 12 },
      { teamId: 'wg', season: 2020, value: 11 }, { teamId: 'tc', season: 2020, value: 11 },
      { teamId: 'ta', season: 2023, value: 11 }, { teamId: 'hg', season: 2021, value: 11 },
      { teamId: 'mm', season: 2023, value: 10 }, { teamId: 'ta', season: 2022, value: 10 },
    ],
  },
  {
    id: 'most-season-pf', category: 'fame', subcategory: 'season',
    label: 'Most points in a season',
    description: 'Total points scored in a single regular season',
    headline: { teamId: 'tc', season: 2022, value: 1878.8 },
    topTen: [
      { teamId: 'tc', season: 2022, value: 1878.8 }, { teamId: 'mm', season: 2024, value: 1800.4 },
      { teamId: 'wg', season: 2024, value: 1769.6 }, { teamId: 'tc', season: 2023, value: 1801.8 },
      { teamId: 'ta', season: 2023, value: 1741.6 }, { teamId: 'hg', season: 2021, value: 1702.4 },
      { teamId: 'tc', season: 2020, value: 1708.0 }, { teamId: 'mm', season: 2023, value: 1737.4 },
      { teamId: 'wg', season: 2020, value: 1677.2 }, { teamId: 'bb', season: 2024, value: 1666.0 },
    ],
  },
  {
    id: 'best-season-win-pct', category: 'fame', subcategory: 'season',
    label: 'Best season win %',
    description: 'Highest win percentage in any one season',
    headline: { teamId: 'tc', season: 2022, value: 92.9 },
    topTen: [
      { teamId: 'tc', season: 2022, value: 92.9 }, { teamId: 'tc', season: 2023, value: 85.7 },
      { teamId: 'wg', season: 2024, value: 85.7 }, { teamId: 'mm', season: 2024, value: 85.7 },
      { teamId: 'wg', season: 2020, value: 78.6 }, { teamId: 'tc', season: 2020, value: 78.6 },
      { teamId: 'ta', season: 2023, value: 78.6 }, { teamId: 'hg', season: 2021, value: 78.6 },
      { teamId: 'mm', season: 2023, value: 71.4 }, { teamId: 'ta', season: 2022, value: 71.4 },
    ],
  },

  // ── SEASON RECORDS (Hall of Shame) ────────────────────────────────
  {
    id: 'worst-season-ppw', category: 'shame', subcategory: 'season',
    label: 'Worst single-season PPW',
    description: 'Lowest points per week in any one season',
    headline: { teamId: 'tb', season: 2021, value: 78.4 },
    topTen: [
      { teamId: 'tb', season: 2021, value: 78.4 }, { teamId: 'tb', season: 2022, value: 81.2 },
      { teamId: 'tb', season: 2020, value: 84.6 }, { teamId: 'tb', season: 2023, value: 86.1 },
      { teamId: 'hg', season: 2024, value: 92.4 }, { teamId: 'tb', season: 2024, value: 92.0 },
      { teamId: 'hg', season: 2023, value: 96.8 }, { teamId: 'bn', season: 2022, value: 99.3 },
      { teamId: 'jc', season: 2020, value: 101.4 }, { teamId: 'hg', season: 2022, value: 102.6 },
    ],
  },
  {
    id: 'most-season-losses', category: 'shame', subcategory: 'season',
    label: 'Most losses in a season',
    description: 'Worst regular-season record across the league',
    headline: { teamId: 'tb', season: 2021, value: 14 },
    topTen: [
      { teamId: 'tb', season: 2021, value: 14 }, { teamId: 'tb', season: 2022, value: 14 },
      { teamId: 'tb', season: 2020, value: 13 }, { teamId: 'tb', season: 2023, value: 13 },
      { teamId: 'hg', season: 2024, value: 12 }, { teamId: 'tb', season: 2024, value: 12 },
      { teamId: 'bn', season: 2022, value: 11 }, { teamId: 'hg', season: 2023, value: 11 },
      { teamId: 'jc', season: 2020, value: 10 }, { teamId: 'bb', season: 2021, value: 10 },
    ],
  },
  {
    id: 'fewest-season-pf', category: 'shame', subcategory: 'season',
    label: 'Fewest points in a season',
    description: 'Total points scored in a single regular season',
    headline: { teamId: 'tb', season: 2021, value: 1097.6 },
    topTen: [
      { teamId: 'tb', season: 2021, value: 1097.6 }, { teamId: 'tb', season: 2022, value: 1136.8 },
      { teamId: 'tb', season: 2020, value: 1184.4 }, { teamId: 'tb', season: 2023, value: 1205.4 },
      { teamId: 'hg', season: 2024, value: 1293.6 }, { teamId: 'tb', season: 2024, value: 1288.0 },
      { teamId: 'hg', season: 2023, value: 1355.2 }, { teamId: 'bn', season: 2022, value: 1390.2 },
      { teamId: 'jc', season: 2020, value: 1419.6 }, { teamId: 'hg', season: 2022, value: 1436.4 },
    ],
  },
  {
    id: 'worst-season-win-pct', category: 'shame', subcategory: 'season',
    label: 'Worst season win %',
    description: 'Lowest win percentage in any one season',
    headline: { teamId: 'tb', season: 2021, value: 0.0 },
    topTen: [
      { teamId: 'tb', season: 2021, value: 0.0 }, { teamId: 'tb', season: 2022, value: 0.0 },
      { teamId: 'tb', season: 2020, value: 7.1 }, { teamId: 'tb', season: 2023, value: 7.1 },
      { teamId: 'hg', season: 2024, value: 14.3 }, { teamId: 'tb', season: 2024, value: 14.3 },
      { teamId: 'bn', season: 2022, value: 21.4 }, { teamId: 'hg', season: 2023, value: 21.4 },
      { teamId: 'jc', season: 2020, value: 28.6 }, { teamId: 'bb', season: 2021, value: 28.6 },
    ],
  },
]

// Legacy Score: a proprietary all-time ranking metric.
// Scoring formula (transparent in the modal):
//   Championships x 200, Runner-ups x 100, 3rd place x 50, Playoff apps x 20,
//   Regular-season titles x 30, Total wins x 3, Winning seasons x 10,
//   Top-3 finishes x 20, Points-leader seasons x 20, Top-3 scoring x 10,
//   Above-avg-PPW seasons x 5, Weekly high scores x 10, Seasons played x 5,
//   3+ year playoff streak x 15, 3+ year winning streak x 10.
export interface LegacyScoreEntry {
  teamId: string
  totalScore: number
  rank: number
  championshipsPoints: number
  seasonPerformancePoints: number
  scoringAchievementsPoints: number
  longevityPoints: number
  breakdown: {
    championships?: { count: number; points: number }
    runnerUps?: { count: number; points: number }
    thirdPlace?: { count: number; points: number }
    playoffApps?: { count: number; points: number }
    regularSeasonTitles?: { count: number; points: number }
    totalWins?: { count: number; points: number }
    winningSeasons?: { count: number; points: number }
    top3Finishes?: { count: number; points: number }
    pointsLeaderSeasons?: { count: number; points: number }
    top3ScoringSeasons?: { count: number; points: number }
    aboveAvgPPWSeasons?: { count: number; points: number }
    weeklyHighScores?: { count: number; points: number }
    seasonsPlayed?: { count: number; points: number }
    playoffStreaks?: { count: number; points: number }
    winningStreaks?: { count: number; points: number }
  }
}

export const legacyScores: LegacyScoreEntry[] = [
  {
    teamId: 'tc', totalScore: 1339, rank: 1,
    championshipsPoints: 690, seasonPerformancePoints: 344, scoringAchievementsPoints: 240, longevityPoints: 65,
    breakdown: {
      championships: { count: 2, points: 400 },
      runnerUps: { count: 1, points: 100 },
      playoffApps: { count: 5, points: 100 },
      regularSeasonTitles: { count: 3, points: 90 },
      totalWins: { count: 78, points: 234 },
      winningSeasons: { count: 5, points: 50 },
      top3Finishes: { count: 3, points: 60 },
      pointsLeaderSeasons: { count: 2, points: 40 },
      top3ScoringSeasons: { count: 5, points: 50 },
      aboveAvgPPWSeasons: { count: 6, points: 30 },
      weeklyHighScores: { count: 12, points: 120 },
      seasonsPlayed: { count: 6, points: 30 },
      playoffStreaks: { count: 1, points: 15 },
      winningStreaks: { count: 2, points: 20 },
    },
  },
  {
    teamId: 'wg', totalScore: 1005, rank: 2,
    championshipsPoints: 540, seasonPerformancePoints: 275, scoringAchievementsPoints: 150, longevityPoints: 40,
    breakdown: {
      championships: { count: 2, points: 400 },
      playoffApps: { count: 4, points: 80 },
      regularSeasonTitles: { count: 2, points: 60 },
      totalWins: { count: 65, points: 195 },
      winningSeasons: { count: 4, points: 40 },
      top3Finishes: { count: 2, points: 40 },
      pointsLeaderSeasons: { count: 2, points: 40 },
      top3ScoringSeasons: { count: 3, points: 30 },
      aboveAvgPPWSeasons: { count: 4, points: 20 },
      weeklyHighScores: { count: 6, points: 60 },
      seasonsPlayed: { count: 6, points: 30 },
      winningStreaks: { count: 1, points: 10 },
    },
  },
  {
    teamId: 'ta', totalScore: 857, rank: 3,
    championshipsPoints: 400, seasonPerformancePoints: 312, scoringAchievementsPoints: 90, longevityPoints: 55,
    breakdown: {
      runnerUps: { count: 2, points: 200 },
      thirdPlace: { count: 2, points: 100 },
      playoffApps: { count: 5, points: 100 },
      totalWins: { count: 64, points: 192 },
      winningSeasons: { count: 4, points: 40 },
      top3Finishes: { count: 4, points: 80 },
      top3ScoringSeasons: { count: 2, points: 20 },
      aboveAvgPPWSeasons: { count: 4, points: 20 },
      weeklyHighScores: { count: 5, points: 50 },
      seasonsPlayed: { count: 6, points: 30 },
      playoffStreaks: { count: 1, points: 15 },
      winningStreaks: { count: 1, points: 10 },
    },
  },
  {
    teamId: 'mm', totalScore: 743, rank: 4,
    championshipsPoints: 260, seasonPerformancePoints: 293, scoringAchievementsPoints: 135, longevityPoints: 55,
    breakdown: {
      runnerUps: { count: 1, points: 100 },
      thirdPlace: { count: 1, points: 50 },
      playoffApps: { count: 4, points: 80 },
      regularSeasonTitles: { count: 1, points: 30 },
      totalWins: { count: 71, points: 213 },
      winningSeasons: { count: 4, points: 40 },
      top3Finishes: { count: 2, points: 40 },
      pointsLeaderSeasons: { count: 1, points: 20 },
      top3ScoringSeasons: { count: 3, points: 30 },
      aboveAvgPPWSeasons: { count: 5, points: 25 },
      weeklyHighScores: { count: 6, points: 60 },
      seasonsPlayed: { count: 6, points: 30 },
      playoffStreaks: { count: 1, points: 15 },
      winningStreaks: { count: 1, points: 10 },
    },
  },
  {
    teamId: 'hg', totalScore: 530, rank: 5,
    championshipsPoints: 270, seasonPerformancePoints: 165, scoringAchievementsPoints: 65, longevityPoints: 30,
    breakdown: {
      championships: { count: 1, points: 200 },
      playoffApps: { count: 2, points: 40 },
      regularSeasonTitles: { count: 1, points: 30 },
      totalWins: { count: 45, points: 135 },
      winningSeasons: { count: 1, points: 10 },
      top3Finishes: { count: 1, points: 20 },
      pointsLeaderSeasons: { count: 1, points: 20 },
      top3ScoringSeasons: { count: 1, points: 10 },
      aboveAvgPPWSeasons: { count: 1, points: 5 },
      weeklyHighScores: { count: 3, points: 30 },
      seasonsPlayed: { count: 6, points: 30 },
    },
  },
  {
    teamId: 'bb', totalScore: 337, rank: 6,
    championshipsPoints: 60, seasonPerformancePoints: 192, scoringAchievementsPoints: 55, longevityPoints: 30,
    breakdown: {
      playoffApps: { count: 3, points: 60 },
      totalWins: { count: 54, points: 162 },
      winningSeasons: { count: 3, points: 30 },
      top3ScoringSeasons: { count: 1, points: 10 },
      aboveAvgPPWSeasons: { count: 3, points: 15 },
      weeklyHighScores: { count: 3, points: 30 },
      seasonsPlayed: { count: 6, points: 30 },
    },
  },
  {
    teamId: 'jc', totalScore: 267, rank: 7,
    championshipsPoints: 40, seasonPerformancePoints: 167, scoringAchievementsPoints: 30, longevityPoints: 30,
    breakdown: {
      playoffApps: { count: 2, points: 40 },
      totalWins: { count: 49, points: 147 },
      winningSeasons: { count: 2, points: 20 },
      aboveAvgPPWSeasons: { count: 2, points: 10 },
      weeklyHighScores: { count: 2, points: 20 },
      seasonsPlayed: { count: 6, points: 30 },
    },
  },
  {
    teamId: 'bn', totalScore: 264, rank: 8,
    championshipsPoints: 40, seasonPerformancePoints: 164, scoringAchievementsPoints: 30, longevityPoints: 30,
    breakdown: {
      playoffApps: { count: 2, points: 40 },
      totalWins: { count: 48, points: 144 },
      winningSeasons: { count: 2, points: 20 },
      aboveAvgPPWSeasons: { count: 2, points: 10 },
      weeklyHighScores: { count: 2, points: 20 },
      seasonsPlayed: { count: 6, points: 30 },
    },
  },
  {
    teamId: 'ww', totalScore: 119, rank: 9,
    championshipsPoints: 20, seasonPerformancePoints: 74, scoringAchievementsPoints: 15, longevityPoints: 10,
    breakdown: {
      playoffApps: { count: 1, points: 20 },
      totalWins: { count: 18, points: 54 },
      winningSeasons: { count: 2, points: 20 },
      aboveAvgPPWSeasons: { count: 1, points: 5 },
      weeklyHighScores: { count: 1, points: 10 },
      seasonsPlayed: { count: 2, points: 10 },
    },
  },
  {
    teamId: 'tb', totalScore: 96, rank: 10,
    championshipsPoints: 0, seasonPerformancePoints: 66, scoringAchievementsPoints: 0, longevityPoints: 30,
    breakdown: {
      totalWins: { count: 22, points: 66 },
      seasonsPlayed: { count: 6, points: 30 },
    },
  },
]

/* ─────────────────────────────────────────────────────────────────
   WEEKLY POINTS-FOR — 11 weeks per team, narrative-shaped
   Each array sums to within 0.5 of standings2025Week11.pointsFor.
   Weeks 10 and 11 align with matchupsWeek10 and matchupsWeek11
   so synthesized schedule results match the canonical games.
   Week 11 zeros for teams whose week-11 game is still 'upcoming'.
───────────────────────────────────────────────────────────────── */
export const weeklyPF: Record<string, number[]> = {
  // mm — Built Different: climbs through mid-season, peaks W6-W9, cools to live W11 number.
  mm: [118.2, 124.5, 127.8, 132.4, 138.9, 152.4, 145.1, 148.7, 157.7, 138.4,  72.3],
  // tc — Throne Vacant: dominant W1-W7, sags W8-W11 as the dynasty cracks.
  tc: [142.6, 138.4, 144.2, 140.8, 135.5, 138.9, 128.4, 118.7, 127.9, 121.8,  84.6],
  // ta — Almost Famous: lowest variance in the league.
  ta: [124.8, 118.4, 128.6, 122.1, 119.7, 131.2, 121.4, 125.8, 116.8, 142.1,  91.2],
  // ww — The Glow Up: steady rise from the rookie floor through the season.
  ww: [108.4, 114.7, 112.8, 118.2, 124.6, 128.4, 131.8, 135.4, 136.3, 129.6,  58.4],
  // bb — By the Numbers: textbook consistency. Wk 11 not played yet.
  bb: [124.7, 128.4, 131.2, 126.8, 132.4, 128.6, 125.4, 134.7, 136.4, 118.7,   0.0],
  // wg — Reign Delay: hot early, ice cold from W7 on. The collapse.
  wg: [142.4, 138.6, 128.4, 124.7, 118.2, 114.6,  96.8,  88.4,  63.6,  99.3, 119.2],
  // jc — Commish Impossible: flat middle, Week 11 statement win.
  jc: [ 96.4, 102.8, 108.4, 110.2, 106.8, 104.7, 108.2, 112.4, 111.7, 124.7, 134.7],
  // bn — 5th Year Senior: mid-pack mediocrity. Wk 9 was the league high (134.2).
  bn: [116.4, 121.8, 108.4, 118.2, 124.6, 114.8, 119.4, 121.6, 134.2, 108.2,   0.0],
  // hg — One Hit Wonder: unlucky scoring, never strings two together.
  hg: [118.4, 108.6, 114.7,  96.8, 124.6, 104.2, 118.7,  88.4, 116.5, 111.4,   0.0],
  // tb — Auto-Draft Allstars: the cellar.
  tb: [104.2,  96.4,  88.6, 102.4,  98.7,  94.2, 108.6,  84.4, 112.4,  88.6,   0.0],
}

// Weekly league average across all teams that played that week.
// Weeks 1-10: mean of all 10 teams. Week 11: mean across the 6 teams whose
// game is live-or-final (mm, tc, ta, ww, wg, jc). Upcoming games excluded.
export const weeklyLeagueAverage: number[] = [
  119.7, 119.3, 119.3, 119.3, 122.4, 121.2, 120.4, 115.9, 121.4, 118.3, 93.4,
]

/* ─────────────────────────────────────────────────────────────────
   WEEKLY RESULTS — synthesized schedule + W/L derived from weeklyPF
   Weeks 1-9 use a deterministic 10-team round-robin (each team faces
   every other team exactly once). Weeks 10 and 11 follow the canonical
   matchupsWeek10 / matchupsWeek11 fixtures.
───────────────────────────────────────────────────────────────── */
export interface WeeklyResult {
  week: number
  opponentId: string
  teamScore: number
  opponentScore: number
  result: 'W' | 'L'
}

// Round-robin opponent map for weeks 1-9 (each row: weekly opponent for that team).
const weeklyOpponents: Record<string, string[]> = {
  mm: ['tb', 'ta', 'bb', 'jc', 'hg', 'tc', 'ww', 'wg', 'bn', 'tc', 'ww'],
  tc: ['hg', 'tb', 'ww', 'wg', 'bn', 'mm', 'ta', 'bb', 'jc', 'mm', 'ta'],
  ta: ['bn', 'mm', 'tb', 'bb', 'jc', 'hg', 'tc', 'ww', 'wg', 'bb', 'tc'],
  ww: ['jc', 'hg', 'tc', 'tb', 'wg', 'bn', 'mm', 'ta', 'bb', 'wg', 'mm'],
  bb: ['wg', 'bn', 'mm', 'ta', 'tb', 'jc', 'hg', 'tc', 'ww', 'ta', 'hg'],
  wg: ['bb', 'jc', 'hg', 'tc', 'ww', 'tb', 'bn', 'mm', 'ta', 'ww', 'jc'],
  jc: ['ww', 'wg', 'bn', 'mm', 'ta', 'bb', 'tb', 'hg', 'tc', 'bn', 'wg'],
  bn: ['ta', 'bb', 'jc', 'hg', 'tc', 'ww', 'wg', 'tb', 'mm', 'jc', 'tb'],
  hg: ['tc', 'ww', 'wg', 'bn', 'mm', 'ta', 'bb', 'jc', 'tb', 'tb', 'bb'],
  tb: ['mm', 'tc', 'ta', 'ww', 'bb', 'wg', 'jc', 'bn', 'hg', 'hg', 'bn'],
}

function buildWeeklyResults(): Record<string, WeeklyResult[]> {
  const out: Record<string, WeeklyResult[]> = {}
  for (const team of teams) {
    const opps = weeklyOpponents[team.id]
    const scores = weeklyPF[team.id]
    out[team.id] = opps.map((oppId, idx) => {
      const week = idx + 1
      const teamScore = scores[idx]
      const opponentScore = weeklyPF[oppId][idx]
      // Upcoming game (both 0) defaults to L so the timeline doesn't double-mark a phantom W.
      const result: 'W' | 'L' =
        teamScore === 0 && opponentScore === 0 ? 'L' : teamScore >= opponentScore ? 'W' : 'L'
      return { week, opponentId: oppId, teamScore, opponentScore, result }
    })
  }
  return out
}

export const teamWeeklyResults: Record<string, WeeklyResult[]> = buildWeeklyResults()

/* ─────────────────────────────────────────────────────────────────
   Week 10 player callouts — narrative beats for the editorial recap.
   Hand-authored. Player names match draftPicks rosters by team id.
   Stat lines are plausible for each position. Reused downstream by
   any modal that wants to expand a callout into a full breakdown.
───────────────────────────────────────────────────────────────── */
export interface Week10PlayerCallout {
  playerName: string
  position: PlayerPosition
  nflTeam: string
  fantasyTeamId: string  // which Pillars team rosters them
  statLine: string       // "28 car · 168 yds · 3 TD · 5 rec · 42 yds"
  fantasyPoints: number
  role: 'hero' | 'collapse' | 'closer' | 'your-team'
  gameId: string         // matches a matchupsWeek10.id
}

export const week10PlayerCallouts: Week10PlayerCallout[] = [
  {
    playerName: 'Jahmyr Gibbs',
    position: 'RB',
    nflTeam: 'DET',
    fantasyTeamId: 'ta',
    statLine: '28 car · 168 yds · 3 TD · 5 rec · 42 yds',
    fantasyPoints: 35.6,
    role: 'hero',
    gameId: 'm10-2',
  },
  {
    playerName: 'Malik Nabers',
    position: 'WR',
    nflTeam: 'NYG',
    fantasyTeamId: 'wg',
    statLine: '3 rec · 14 yds · 7 tgt',
    fantasyPoints: 2.9,
    role: 'collapse',
    gameId: 'm10-3',
  },
  {
    playerName: 'Derrick Henry',
    position: 'RB',
    nflTeam: 'BAL',
    fantasyTeamId: 'ww',
    statLine: '22 car · 138 yds · 2 TD',
    fantasyPoints: 25.8,
    role: 'closer',
    gameId: 'm10-3',
  },
  {
    playerName: 'Bijan Robinson',
    position: 'RB',
    nflTeam: 'ATL',
    fantasyTeamId: 'jc',
    statLine: '22 car · 118 yds · 1 TD · 4 rec · 28 yds',
    fantasyPoints: 21.6,
    role: 'your-team',
    gameId: 'm10-4',
  },
]
