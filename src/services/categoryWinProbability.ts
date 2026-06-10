// Per-stat daily volatility (std dev), keyed by platform stat ids. Copied from
// CategoryMatchupsView.vue; that view is the DRY-pass target later.
const STAT_VOLATILITY: { yahoo: Record<string, number>; espn: Record<string, number> } = {
  yahoo: { '60':8,'7':3,'12':8,'16':2,'3':0.02,'55':0.02,'56':0.03,'28':0.5,'32':0.5,'42':15,'26':0.5,'27':0.15,'48':0.5 },
  espn: { '2':8,'3':3,'4':8,'5':2,'8':0.02,'9':0.02,'10':0.03,'17':0.5,'20':0.5,'34':15,'18':0.5,'19':0.15,'32':0.5 },
}
const INVERSE_STATS = { yahoo: ['26', '27'], espn: ['7', '12', '14', '18', '19', '21', '22', '24', '33', '45'] }
type Platform = 'yahoo' | 'espn'

export function randomNormal(mean: number, stdDev: number): number {
  const u1 = Math.random(); const u2 = Math.random()
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return mean + z * stdDev
}

export function clampWinProb(prob: number, isCompleted = false): number {
  if (isCompleted) return prob
  return Math.min(99.9, Math.max(0.1, prob))
}

export function calcCatWinProb(v1: number, v2: number, id: string, days: number, platform: Platform): { team1: number; team2: number } {
  const inv = INVERSE_STATS[platform].includes(id)
  const dailyVol = STAT_VOLATILITY[platform][id] || 5
  const totalVol = dailyVol * Math.sqrt(Math.max(0.5, days))
  if (days <= 0) {
    if (inv) { if (v1 < v2) return { team1: 100, team2: 0 }; if (v2 < v1) return { team1: 0, team2: 100 } }
    else { if (v1 > v2) return { team1: 100, team2: 0 }; if (v2 > v1) return { team1: 0, team2: 100 } }
    return { team1: 50, team2: 50 }
  }
  const SIMS = 1000
  let team1Wins = 0
  for (let i = 0; i < SIMS; i++) {
    const f1 = v1 + randomNormal(0, totalVol)
    const f2 = v2 + randomNormal(0, totalVol)
    if (inv) { if (f1 < f2) team1Wins++; else if (f1 === f2) team1Wins += 0.5 }
    else { if (f1 > f2) team1Wins++; else if (f1 === f2) team1Wins += 0.5 }
  }
  const p1 = (team1Wins / SIMS) * 100
  return { team1: Math.round(p1 * 100) / 100, team2: Math.round((100 - p1) * 100) / 100 }
}

export function calcOverallWinProb(
  team1Stats: Record<string, number>, team2Stats: Record<string, number>,
  categoryIds: string[], days: number, platform: Platform,
): { team1: number; team2: number; avgT1Cats: number; avgT2Cats: number } {
  const SIMULATIONS = 10000
  let team1Wins = 0, team2Wins = 0, ties = 0, totalT1 = 0, totalT2 = 0
  const inverse = INVERSE_STATS[platform]
  for (let sim = 0; sim < SIMULATIONS; sim++) {
    let t1 = 0, t2 = 0
    for (const catId of categoryIds) {
      const v1 = team1Stats[catId] || 0
      const v2 = team2Stats[catId] || 0
      const totalVol = (STAT_VOLATILITY[platform][catId] || 5) * Math.sqrt(Math.max(0.5, days))
      const isInv = inverse.includes(catId)
      const f1 = v1 + randomNormal(0, totalVol)
      const f2 = v2 + randomNormal(0, totalVol)
      if (isInv) { if (f1 < f2) t1++; else if (f2 < f1) t2++ }
      else { if (f1 > f2) t1++; else if (f2 > f1) t2++ }
    }
    if (t1 > t2) team1Wins++; else if (t2 > t1) team2Wins++; else ties++
    totalT1 += t1; totalT2 += t2
  }
  const t1Prob = ((team1Wins + ties / 2) / SIMULATIONS) * 100
  const t2Prob = ((team2Wins + ties / 2) / SIMULATIONS) * 100
  return {
    team1: Math.round(t1Prob * 100) / 100, team2: Math.round(t2Prob * 100) / 100,
    avgT1Cats: Math.round((totalT1 / SIMULATIONS) * 10) / 10,
    avgT2Cats: Math.round((totalT2 / SIMULATIONS) * 10) / 10,
  }
}

export type CatStatus = 'safe' | 'tossup' | 'loss'
export function bucketCategory(myWinPct: number): CatStatus {
  if (myWinPct >= 70) return 'safe'
  if (myWinPct <= 30) return 'loss'
  return 'tossup'
}
