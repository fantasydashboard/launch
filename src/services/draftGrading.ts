/**
 * Premium Draft Grading System
 * 
 * Key Insights:
 * 1. Elite players are MUCH more valuable than replacement-level
 * 2. Early round busts hurt way more than late round misses
 * 3. Late round steals should be celebrated
 * 4. Position scarcity matters (SS1 vs SS24 is different than UTIL1 vs UTIL24)
 * 
 * The system uses TIER-BASED analysis rather than raw rank differentials.
 */

// Position tiers based on league size
export interface TierConfig {
  elite: number       // Top X are elite (e.g., 1-3)
  starter: number     // Top X are starters (e.g., 1-12)
  bench: number       // X-Y are bench pieces (e.g., 13-24)
  replacement: number // Beyond this is replacement level
}

export function getTierConfig(numTeams: number): TierConfig {
  return {
    elite: Math.ceil(numTeams * 0.25),      // Top 25% = Elite (3 in 12-team)
    starter: numTeams,                       // Top N = Starter
    bench: numTeams * 2,                     // N to 2N = Bench
    replacement: numTeams * 3                // Beyond 3N = Replacement
  }
}

export type Tier = 'ELITE' | 'STARTER' | 'BENCH' | 'REPLACEMENT' | 'WAIVER'

export function getTier(rank: number, config: TierConfig): Tier {
  if (rank <= config.elite) return 'ELITE'
  if (rank <= config.starter) return 'STARTER'
  if (rank <= config.bench) return 'BENCH'
  if (rank <= config.replacement) return 'REPLACEMENT'
  return 'WAIVER'
}

// Tier movement scoring
// Positive = good, Negative = bad
const TIER_MOVEMENT_SCORES: Record<string, number> = {
  // Drafted ELITE tier
  'ELITE→ELITE': 10,         // Got what you paid for - elite stays elite
  'ELITE→STARTER': 0,        // Slight miss - still usable
  'ELITE→BENCH': -15,        // Bad - paid elite price for bench guy
  'ELITE→REPLACEMENT': -25,  // Disaster
  'ELITE→WAIVER': -35,       // Complete bust
  
  // Drafted STARTER tier  
  'STARTER→ELITE': 20,       // Great - found elite value mid-rounds
  'STARTER→STARTER': 5,      // Solid - got what you expected
  'STARTER→BENCH': -5,       // Minor miss
  'STARTER→REPLACEMENT': -15, // Bad pick
  'STARTER→WAIVER': -25,     // Bust
  
  // Drafted BENCH tier
  'BENCH→ELITE': 30,         // STEAL - found elite in late rounds
  'BENCH→STARTER': 15,       // Great find
  'BENCH→BENCH': 3,          // Got what you expected (baseline)
  'BENCH→REPLACEMENT': -3,   // Meh
  'BENCH→WAIVER': -8,        // Whatever, late pick
  
  // Drafted REPLACEMENT tier
  'REPLACEMENT→ELITE': 40,   // JACKPOT - league winner find
  'REPLACEMENT→STARTER': 25, // Huge steal
  'REPLACEMENT→BENCH': 10,   // Nice find
  'REPLACEMENT→REPLACEMENT': 0, // Who cares
  'REPLACEMENT→WAIVER': -2,  // Whatever
  
  // Drafted WAIVER tier (super late picks)
  'WAIVER→ELITE': 45,        // Absolute steal
  'WAIVER→STARTER': 30,      // Great find
  'WAIVER→BENCH': 12,        // Nice
  'WAIVER→REPLACEMENT': 2,   // Meh
  'WAIVER→WAIVER': 0         // Expected
}

export function getTierMovementScore(draftedTier: Tier, finishedTier: Tier): number {
  const key = `${draftedTier}→${finishedTier}`
  return TIER_MOVEMENT_SCORES[key] ?? 0
}

/**
 * Calculate comprehensive pick score
 */
export interface PickScoreResult {
  tierScore: number           // Score from tier movement
  eliteBonus: number          // Bonus for finishing elite
  roundMultiplier: number     // Round weight adjustment
  positionScarcityBonus: number // Bonus for scarce positions
  totalScore: number          // Final score
  draftedTier: Tier
  finishedTier: Tier
  tierMovement: string        // e.g., "BENCH→ELITE"
  verdict: 'JACKPOT' | 'STEAL' | 'HIT' | 'SOLID' | 'MISS' | 'BUST' | 'DISASTER'
}

// Position scarcity multipliers by sport (scarce positions more valuable)
// Values > 1.0 = scarce/valuable, < 1.0 = easily replaceable
const POSITION_SCARCITY: Record<string, Record<string, number>> = {
  baseball: {
    'C': 1.3,       // Catchers are very scarce
    'SS': 1.2,      // Shortstops traditionally scarce
    '2B': 1.1,      // 2B can be thin
    '3B': 1.0,      // Baseline
    '1B': 0.85,     // Sluggers at 1B easy to find
    'OF': 0.9,      // Outfielders everywhere
    'SP': 1.15,     // Aces are valuable
    'RP': 0.85,     // Relievers are replaceable
    'DH': 0.8,      // DH-only very replaceable
    'UTIL': 0.8,    // Utility slots easy to fill
    'P': 1.0,       // Generic pitcher
    'LF': 0.9,
    'CF': 0.95,
    'RF': 0.9
  },
  football: {
    'QB': 0.9,      // Usually stream-able (unless elite)
    'RB': 1.25,     // Running backs are SCARCE - most valuable
    'WR': 1.0,      // Baseline - deep position
    'TE': 1.3,      // Elite TEs are RARE
    'K': 0.5,       // Kickers don't matter
    'DEF': 0.5,     // Stream defenses
    'FLEX': 0.85,   // Flex is easy to fill
    'IDP': 0.7      // IDP usually deep
  },
  basketball: {
    'PG': 1.0,      // Point guards - baseline
    'SG': 0.95,     // Shooting guards
    'SF': 0.95,     // Small forwards
    'PF': 1.0,      // Power forwards
    'C': 1.15,      // Centers can be scarce for blocks/rebounds
    'G': 0.9,       // Generic guard slot
    'F': 0.9,       // Generic forward slot
    'UTIL': 0.85    // Utility
  },
  hockey: {
    'C': 1.1,       // Centers - good for faceoffs
    'LW': 1.0,      // Left wing
    'RW': 1.0,      // Right wing
    'D': 1.15,      // Defensemen can be scarce for hits/blocks
    'G': 1.2,       // Goalies are valuable and scarce
    'UTIL': 0.85,
    'F': 0.95       // Generic forward
  }
}

// Get scarcity multiplier for a position
export function getPositionScarcity(position: string, sport: string = 'baseball'): number {
  const sportScarcity = POSITION_SCARCITY[sport.toLowerCase()] || POSITION_SCARCITY.baseball
  // Try exact match first, then uppercase, then default
  return sportScarcity[position] || sportScarcity[position.toUpperCase()] || 1.0
}

export function calculatePickScore(
  pickNumber: number,
  round: number,
  draftedPositionRank: number,  // What position rank was this player when drafted?
  finishedPositionRank: number, // What position rank did they finish?
  position: string,
  numTeams: number,
  totalPicks: number,
  sport: string = 'baseball'
): PickScoreResult {
  const config = getTierConfig(numTeams)
  
  // Handle players who didn't produce (injured, cut, etc.)
  const effectiveFinishRank = finishedPositionRank >= 900 ? config.replacement + 50 : finishedPositionRank
  
  const draftedTier = getTier(draftedPositionRank, config)
  const finishedTier = getTier(effectiveFinishRank, config)
  const tierMovement = `${draftedTier}→${finishedTier}`
  
  // Base tier movement score
  let tierScore = getTierMovementScore(draftedTier, finishedTier)
  
  // Elite finish bonus - any time you end up with an elite player, extra credit
  let eliteBonus = 0
  if (finishedTier === 'ELITE') {
    eliteBonus = 5
  }
  
  // Round multiplier - early round mistakes hurt more, late round finds help more
  let roundMultiplier = 1.0
  
  if (tierScore > 0) {
    // Outperformed - late round picks get bonus
    if (round >= 15) roundMultiplier = 1.5
    else if (round >= 10) roundMultiplier = 1.3
    else if (round >= 7) roundMultiplier = 1.15
  } else if (tierScore < 0) {
    // Underperformed - early round picks penalized more
    if (round <= 2) roundMultiplier = 1.4
    else if (round <= 4) roundMultiplier = 1.25
    else if (round <= 6) roundMultiplier = 1.1
  }
  
  // Position scarcity bonus/penalty (use sport-specific scarcity)
  const scarcityFactor = getPositionScarcity(position, sport)
  const positionScarcityBonus = tierScore > 0 ? (scarcityFactor - 1) * 10 : 0
  
  // Calculate total score
  const totalScore = (tierScore * roundMultiplier) + eliteBonus + positionScarcityBonus
  
  // Determine verdict
  let verdict: PickScoreResult['verdict']
  if (totalScore >= 35) verdict = 'JACKPOT'
  else if (totalScore >= 20) verdict = 'STEAL'
  else if (totalScore >= 10) verdict = 'HIT'
  else if (totalScore >= 0) verdict = 'SOLID'
  else if (totalScore >= -10) verdict = 'MISS'
  else if (totalScore >= -20) verdict = 'BUST'
  else verdict = 'DISASTER'
  
  return {
    tierScore,
    eliteBonus,
    roundMultiplier,
    positionScarcityBonus,
    totalScore,
    draftedTier,
    finishedTier,
    tierMovement,
    verdict
  }
}

/**
 * Convert score to letter grade with wider distribution
 */
export function scoreToGrade(score: number): string {
  if (score >= 35) return 'A+'   // Jackpot picks only
  if (score >= 25) return 'A'    // Great steals
  if (score >= 15) return 'A-'   // Nice finds
  if (score >= 8) return 'B+'    // Solid outperformance
  if (score >= 3) return 'B'     // Met expectations well
  if (score >= -3) return 'B-'   // Slight underperformance
  if (score >= -8) return 'C+'   // Noticeable miss
  if (score >= -15) return 'C'   // Bad pick
  if (score >= -22) return 'C-'  // Really bad
  if (score >= -30) return 'D'   // Bust
  return 'F'                     // Disaster
}

/**
 * Calculate team draft grade from individual picks
 */
export interface TeamGradeResult {
  grade: string
  gradeScore: number
  totalScore: number
  avgScore: number
  
  // Breakdown by round groups
  earlyRoundScore: number    // Rounds 1-5
  midRoundScore: number      // Rounds 6-12
  lateRoundScore: number     // Rounds 13+
  
  // Pick counts by verdict
  jackpots: number
  steals: number
  hits: number
  solids: number
  misses: number
  busts: number
  disasters: number
  
  // Hit rates
  earlyRoundHitRate: number  // % of early picks that were HIT or better
  stealRate: number          // % of late picks that were STEAL or better
}

export function calculateTeamGrade(
  picks: { round: number; score: number; verdict: string }[]
): TeamGradeResult {
  if (picks.length === 0) {
    return {
      grade: 'N/A',
      gradeScore: 0,
      totalScore: 0,
      avgScore: 0,
      earlyRoundScore: 0,
      midRoundScore: 0,
      lateRoundScore: 0,
      jackpots: 0,
      steals: 0,
      hits: 0,
      solids: 0,
      misses: 0,
      busts: 0,
      disasters: 0,
      earlyRoundHitRate: 0,
      stealRate: 0
    }
  }
  
  // Weighted scoring: early picks count more
  let weightedScore = 0
  let totalWeight = 0
  
  picks.forEach(pick => {
    // Round 1-2: weight 5, Round 3-5: weight 3, Round 6-10: weight 2, Round 11+: weight 1
    let weight = 1
    if (pick.round <= 2) weight = 5
    else if (pick.round <= 5) weight = 3
    else if (pick.round <= 10) weight = 2
    
    weightedScore += pick.score * weight
    totalWeight += weight
  })
  
  const gradeScore = totalWeight > 0 ? weightedScore / totalWeight : 0
  const totalScore = picks.reduce((sum, p) => sum + p.score, 0)
  const avgScore = totalScore / picks.length
  
  // Round group scores
  const earlyPicks = picks.filter(p => p.round <= 5)
  const midPicks = picks.filter(p => p.round >= 6 && p.round <= 12)
  const latePicks = picks.filter(p => p.round >= 13)
  
  const earlyRoundScore = earlyPicks.length > 0 
    ? earlyPicks.reduce((s, p) => s + p.score, 0) / earlyPicks.length 
    : 0
  const midRoundScore = midPicks.length > 0 
    ? midPicks.reduce((s, p) => s + p.score, 0) / midPicks.length 
    : 0
  const lateRoundScore = latePicks.length > 0 
    ? latePicks.reduce((s, p) => s + p.score, 0) / latePicks.length 
    : 0
  
  // Count verdicts
  const jackpots = picks.filter(p => p.verdict === 'JACKPOT').length
  const steals = picks.filter(p => p.verdict === 'STEAL').length
  const hits = picks.filter(p => p.verdict === 'HIT').length
  const solids = picks.filter(p => p.verdict === 'SOLID').length
  const misses = picks.filter(p => p.verdict === 'MISS').length
  const busts = picks.filter(p => p.verdict === 'BUST').length
  const disasters = picks.filter(p => p.verdict === 'DISASTER').length
  
  // Hit rates
  const earlyRoundHitRate = earlyPicks.length > 0
    ? earlyPicks.filter(p => ['JACKPOT', 'STEAL', 'HIT'].includes(p.verdict)).length / earlyPicks.length * 100
    : 0
  const stealRate = latePicks.length > 0
    ? latePicks.filter(p => ['JACKPOT', 'STEAL'].includes(p.verdict)).length / latePicks.length * 100
    : 0
  
  return {
    grade: scoreToGrade(gradeScore),
    gradeScore,
    totalScore,
    avgScore,
    earlyRoundScore,
    midRoundScore,
    lateRoundScore,
    jackpots,
    steals,
    hits,
    solids,
    misses,
    busts,
    disasters,
    earlyRoundHitRate,
    stealRate
  }
}

/**
 * Get grade color class
 */
export function getGradeColorClass(grade: string): string {
  if (grade === 'A+') return 'text-emerald-400'
  if (grade === 'A') return 'text-green-400'
  if (grade === 'A-') return 'text-green-500'
  if (grade === 'B+') return 'text-lime-400'
  if (grade === 'B') return 'text-lime-500'
  if (grade === 'B-') return 'text-yellow-400'
  if (grade === 'C+') return 'text-yellow-500'
  if (grade === 'C') return 'text-orange-400'
  if (grade === 'C-') return 'text-orange-500'
  if (grade === 'D') return 'text-red-400'
  return 'text-red-600' // F
}

/**
 * Get verdict badge style
 */
export function getVerdictStyle(verdict: string): { bg: string; text: string; label: string } {
  switch (verdict) {
    case 'JACKPOT':
      return { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: '💎 JACKPOT' }
    case 'STEAL':
      return { bg: 'bg-green-500/20', text: 'text-green-400', label: '🔥 STEAL' }
    case 'HIT':
      return { bg: 'bg-lime-500/20', text: 'text-lime-400', label: '✓ HIT' }
    case 'SOLID':
      return { bg: 'bg-gray-500/20', text: 'text-gray-400', label: '○ SOLID' }
    case 'MISS':
      return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: '✗ MISS' }
    case 'BUST':
      return { bg: 'bg-orange-500/20', text: 'text-orange-400', label: '💥 BUST' }
    case 'DISASTER':
      return { bg: 'bg-red-500/20', text: 'text-red-400', label: '💀 DISASTER' }
    default:
      return { bg: 'bg-gray-500/20', text: 'text-gray-400', label: verdict }
  }
}

export default {
  getTierConfig,
  getTier,
  getTierMovementScore,
  calculatePickScore,
  scoreToGrade,
  calculateTeamGrade,
  getGradeColorClass,
  getVerdictStyle
}
