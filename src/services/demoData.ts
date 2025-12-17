/**
 * Demo Data Service
 * 
 * Provides fake/demo data for users who haven't connected a league yet.
 * This allows them to explore the full UI before committing.
 */

export interface DemoTeam {
  roster_id: number
  name: string
  emoji: string
  color: string
  avatar: string
  record: string
  wins: number
  losses: number
  points_for: number
  points_against: number
  ppg: number
  streak: string
  powerScore: number
}

export interface DemoMatchup {
  matchup_id: number
  team1: DemoTeam
  team2: DemoTeam
  team1_points: number
  team2_points: number
  team1_projected: number
  team2_projected: number
}

export interface DemoPlayer {
  player_id: string
  name: string
  team: string
  position: string
  ppg: number
  ros: number
  trend: 'hot' | 'cold' | 'neutral'
  rank: number
}

// Demo Teams
export const DEMO_TEAMS: DemoTeam[] = [
  { roster_id: 1, name: 'Mahomes Magic', emoji: '🎯', color: '#ef4444', avatar: '', record: '10-3', wins: 10, losses: 3, points_for: 1842.5, points_against: 1654.2, ppg: 141.7, streak: 'W3', powerScore: 94 },
  { roster_id: 2, name: 'CMC Express', emoji: '🚂', color: '#3b82f6', avatar: '', record: '9-4', wins: 9, losses: 4, points_for: 1798.3, points_against: 1702.1, ppg: 138.3, streak: 'W2', powerScore: 89 },
  { roster_id: 3, name: 'Hill Climbers', emoji: '⛰️', color: '#22c55e', avatar: '', record: '9-4', wins: 9, losses: 4, points_for: 1756.8, points_against: 1689.4, ppg: 135.1, streak: 'L1', powerScore: 86 },
  { roster_id: 4, name: 'Kelce Kingdom', emoji: '👑', color: '#a855f7', avatar: '', record: '8-5', wins: 8, losses: 5, points_for: 1712.4, points_against: 1698.7, ppg: 131.7, streak: 'W1', powerScore: 82 },
  { roster_id: 5, name: 'Chase Chasers', emoji: '🏃', color: '#f97316', avatar: '', record: '7-6', wins: 7, losses: 6, points_for: 1689.2, points_against: 1701.5, ppg: 130.0, streak: 'L2', powerScore: 78 },
  { roster_id: 6, name: 'Jefferson Flyers', emoji: '✈️', color: '#06b6d4', avatar: '', record: '7-6', wins: 7, losses: 6, points_for: 1678.9, points_against: 1712.3, ppg: 129.1, streak: 'W1', powerScore: 75 },
  { roster_id: 7, name: 'Burrow Bros', emoji: '🦁', color: '#eab308', avatar: '', record: '6-7', wins: 6, losses: 7, points_for: 1645.6, points_against: 1698.4, ppg: 126.6, streak: 'L1', powerScore: 71 },
  { roster_id: 8, name: 'Allen Army', emoji: '⚡', color: '#8b5cf6', avatar: '', record: '6-7', wins: 6, losses: 7, points_for: 1632.1, points_against: 1687.9, ppg: 125.5, streak: 'W2', powerScore: 68 },
  { roster_id: 9, name: 'Lamar Legion', emoji: '🦅', color: '#10b981', avatar: '', record: '5-8', wins: 5, losses: 8, points_for: 1598.7, points_against: 1745.2, ppg: 123.0, streak: 'L3', powerScore: 62 },
  { roster_id: 10, name: 'Henry Haulers', emoji: '🚛', color: '#f43f5e', avatar: '', record: '5-8', wins: 5, losses: 8, points_for: 1576.3, points_against: 1723.8, ppg: 121.3, streak: 'L1', powerScore: 58 },
  { roster_id: 11, name: 'Diggs Dynasty', emoji: '💎', color: '#6366f1', avatar: '', record: '4-9', wins: 4, losses: 9, points_for: 1542.8, points_against: 1789.1, ppg: 118.7, streak: 'L4', powerScore: 52 },
  { roster_id: 12, name: 'Hurts Hustle', emoji: '💪', color: '#14b8a6', avatar: '', record: '3-10', wins: 3, losses: 10, points_for: 1498.2, points_against: 1812.4, ppg: 115.2, streak: 'L2', powerScore: 45 }
]

// Demo Matchups for current week
export const DEMO_MATCHUPS: DemoMatchup[] = [
  {
    matchup_id: 1,
    team1: DEMO_TEAMS[0],
    team2: DEMO_TEAMS[3],
    team1_points: 142.5,
    team2_points: 128.3,
    team1_projected: 138.2,
    team2_projected: 131.5
  },
  {
    matchup_id: 2,
    team1: DEMO_TEAMS[1],
    team2: DEMO_TEAMS[2],
    team1_points: 156.8,
    team2_points: 134.2,
    team1_projected: 145.0,
    team2_projected: 142.1
  },
  {
    matchup_id: 3,
    team1: DEMO_TEAMS[4],
    team2: DEMO_TEAMS[5],
    team1_points: 118.9,
    team2_points: 145.6,
    team1_projected: 125.5,
    team2_projected: 132.8
  },
  {
    matchup_id: 4,
    team1: DEMO_TEAMS[6],
    team2: DEMO_TEAMS[7],
    team1_points: 131.2,
    team2_points: 127.8,
    team1_projected: 128.9,
    team2_projected: 135.2
  },
  {
    matchup_id: 5,
    team1: DEMO_TEAMS[8],
    team2: DEMO_TEAMS[9],
    team1_points: 112.4,
    team2_points: 119.7,
    team1_projected: 121.3,
    team2_projected: 118.5
  },
  {
    matchup_id: 6,
    team1: DEMO_TEAMS[10],
    team2: DEMO_TEAMS[11],
    team1_points: 108.6,
    team2_points: 98.2,
    team1_projected: 115.8,
    team2_projected: 112.4
  }
]

// Demo Players for projections
export const DEMO_PLAYERS: DemoPlayer[] = [
  { player_id: '1', name: "Ja'Marr Chase", team: 'CIN', position: 'WR', ppg: 22.4, ros: 284.2, trend: 'hot', rank: 1 },
  { player_id: '2', name: 'Saquon Barkley', team: 'PHI', position: 'RB', ppg: 21.8, ros: 276.5, trend: 'hot', rank: 2 },
  { player_id: '3', name: 'Lamar Jackson', team: 'BAL', position: 'QB', ppg: 24.1, ros: 265.3, trend: 'neutral', rank: 3 },
  { player_id: '4', name: 'Derrick Henry', team: 'BAL', position: 'RB', ppg: 19.2, ros: 248.9, trend: 'neutral', rank: 4 },
  { player_id: '5', name: 'Amon-Ra St. Brown', team: 'DET', position: 'WR', ppg: 18.9, ros: 241.6, trend: 'hot', rank: 5 },
  { player_id: '6', name: 'Brock Bowers', team: 'LV', position: 'TE', ppg: 14.8, ros: 189.2, trend: 'hot', rank: 6 },
  { player_id: '7', name: 'Josh Allen', team: 'BUF', position: 'QB', ppg: 23.5, ros: 258.1, trend: 'neutral', rank: 7 },
  { player_id: '8', name: 'Jahmyr Gibbs', team: 'DET', position: 'RB', ppg: 17.8, ros: 232.4, trend: 'hot', rank: 8 },
  { player_id: '9', name: 'CeeDee Lamb', team: 'DAL', position: 'WR', ppg: 17.2, ros: 224.8, trend: 'cold', rank: 9 },
  { player_id: '10', name: 'Bijan Robinson', team: 'ATL', position: 'RB', ppg: 16.9, ros: 219.5, trend: 'neutral', rank: 10 },
  { player_id: '11', name: 'Tyreek Hill', team: 'MIA', position: 'WR', ppg: 16.5, ros: 215.2, trend: 'cold', rank: 11 },
  { player_id: '12', name: 'Jalen Hurts', team: 'PHI', position: 'QB', ppg: 21.8, ros: 239.6, trend: 'neutral', rank: 12 }
]

// Demo Draft Picks
export const DEMO_DRAFT_GRADES = [
  { team: DEMO_TEAMS[0], grade: 'A+', value: '+42.3', bestPick: 'Chase (Rd 1)', worstPick: 'Wilson (Rd 8)' },
  { team: DEMO_TEAMS[1], grade: 'A', value: '+35.8', bestPick: 'Barkley (Rd 1)', worstPick: 'Kittle (Rd 5)' },
  { team: DEMO_TEAMS[2], grade: 'B+', value: '+18.2', bestPick: 'Henry (Rd 2)', worstPick: 'Pollard (Rd 4)' },
  { team: DEMO_TEAMS[3], grade: 'B+', value: '+15.6', bestPick: 'Kelce (Rd 2)', worstPick: 'Cousins (Rd 9)' },
  { team: DEMO_TEAMS[4], grade: 'B', value: '+8.4', bestPick: 'Lamb (Rd 1)', worstPick: 'Cook (Rd 6)' },
  { team: DEMO_TEAMS[5], grade: 'B', value: '+5.2', bestPick: 'Jefferson (Rd 1)', worstPick: 'Pitts (Rd 5)' },
  { team: DEMO_TEAMS[6], grade: 'C+', value: '-2.1', bestPick: 'Burrow (Rd 4)', worstPick: 'Robinson (Rd 7)' },
  { team: DEMO_TEAMS[7], grade: 'C+', value: '-5.8', bestPick: 'Allen (Rd 3)', worstPick: 'Mixon (Rd 5)' },
  { team: DEMO_TEAMS[8], grade: 'C', value: '-12.4', bestPick: 'Jackson (Rd 4)', worstPick: 'Metcalf (Rd 3)' },
  { team: DEMO_TEAMS[9], grade: 'C', value: '-15.7', bestPick: 'Henry (Rd 1)', worstPick: 'Conner (Rd 6)' },
  { team: DEMO_TEAMS[10], grade: 'D+', value: '-24.3', bestPick: 'Diggs (Rd 2)', worstPick: 'Jacobs (Rd 3)' },
  { team: DEMO_TEAMS[11], grade: 'D', value: '-32.8', bestPick: 'Hurts (Rd 3)', worstPick: 'Harris (Rd 2)' }
]

// Demo Championship History
export const DEMO_CHAMPIONS = [
  { year: '2024', team: DEMO_TEAMS[0], score: '168.4 - 142.1', opponent: DEMO_TEAMS[1] },
  { year: '2023', team: DEMO_TEAMS[1], score: '156.2 - 148.9', opponent: DEMO_TEAMS[2] },
  { year: '2022', team: DEMO_TEAMS[2], score: '172.8 - 155.3', opponent: DEMO_TEAMS[0] },
  { year: '2021', team: DEMO_TEAMS[0], score: '165.1 - 152.7', opponent: DEMO_TEAMS[3] },
  { year: '2020', team: DEMO_TEAMS[4], score: '148.9 - 141.2', opponent: DEMO_TEAMS[1] },
  { year: '2019', team: DEMO_TEAMS[0], score: '159.3 - 147.8', opponent: DEMO_TEAMS[5] }
]

// Demo League Info
export const DEMO_LEAGUE = {
  name: 'Demo Dynasty League',
  season: '2024',
  week: 14,
  totalTeams: 12,
  scoringType: 'PPR',
  leagueType: 'Redraft',
  playoffTeams: 6,
  playoffStart: 15
}

// Helper to generate avatar URL from team data
export function getDemoTeamAvatar(team: DemoTeam): string {
  // Return a colored circle with emoji as a data URL or placeholder
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="50" fill="${team.color}"/>
      <text x="50" y="62" font-size="40" text-anchor="middle" fill="white">${team.emoji}</text>
    </svg>
  `)}`
}

// Service export
export const demoDataService = {
  DEMO_TEAMS,
  DEMO_MATCHUPS,
  DEMO_PLAYERS,
  DEMO_DRAFT_GRADES,
  DEMO_CHAMPIONS,
  DEMO_LEAGUE,
  getDemoTeamAvatar,
  
  // Check if using demo mode
  isDemoMode: () => true,
  
  // Get formatted standings
  getStandings: () => {
    return [...DEMO_TEAMS].sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins
      return b.points_for - a.points_for
    }).map((team, index) => ({
      ...team,
      rank: index + 1,
      avatar: getDemoTeamAvatar(team)
    }))
  },
  
  // Get power rankings
  getPowerRankings: () => {
    return [...DEMO_TEAMS].sort((a, b) => b.powerScore - a.powerScore).map((team, index) => ({
      ...team,
      rank: index + 1,
      avatar: getDemoTeamAvatar(team)
    }))
  },
  
  // Get matchups for a week
  getMatchups: () => {
    return DEMO_MATCHUPS.map(m => ({
      ...m,
      team1: { ...m.team1, avatar: getDemoTeamAvatar(m.team1) },
      team2: { ...m.team2, avatar: getDemoTeamAvatar(m.team2) }
    }))
  }
}

export default demoDataService
