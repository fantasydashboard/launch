import { computed, type ComputedRef, type Ref } from 'vue'
import { useLeagueStore } from '@/stores/league'
import type { CatSpec } from '@/myteam/value'
import { computeRosterValue } from '@/myteam/value'
import { toEffectiveStats } from '@/myteam/effectiveStats'
import type { PoolPlayer } from '@/composables/useMyRoster'
import type { FGProjection } from '@/services/projectionService'
import { aggregateTeamCats, playerStrengths, type AggPlayer } from '@/trades/aggregate'
import { buildLandscape } from '@/trades/landscape'
import { rankPartners } from '@/trades/partners'
import { evalDeal, type DealClass } from '@/trades/deals'

export interface CatTag {
  label: string
  rank: number
}
export interface TradeSide {
  name: string
  pos: string
  value: number
}
export interface TradeTarget {
  fix: CatTag // the category this trade fixes for you
  get: TradeSide
  give: TradeSide
  fromTeam: string
  klass: Exclude<DealClass, 'fleece'>
}
export interface PartnerView {
  team: string
  strong: string[] // their strengths (your needs)
  weak: string[] // their holes (your surplus)
  score: number
}
export interface TradeView {
  tradeFrom: CatTag[] // your surplus — dead value to spend
  toFix: CatTag[] // your genuine needs
  targets: TradeTarget[]
  partners: PartnerView[]
}

// Don't propose a 1-for-1 whose 0..100 values are further apart than this — a stud-for-
// scrub "trade" isn't believable even when need-weighting says you'd win.
const VALUE_BAND = 24
const TOP_PARTNERS = 5
// No category is ever "free" to lose. Without this floor, a category you're hopelessly
// last in reads need≈0, so giving away your star there looks free — the bug that had it
// offering Fernando Tatis Jr. for a streamer. The floor makes lost production cost value.
const NEED_FLOOR = 0.25
const DOMINANCE_RANK = 2 // a real "trade from" surplus = top-2 in the league, not a mid-pack gap
const CORE_PROTECT = 5 // never offer your N most valuable players in a "fix your holes" tool

export function useTradeTargets(inputs: {
  pool: Ref<PoolPlayer[]>
  fgByKey: Ref<Record<string, FGProjection | null>>
  catSpecs: Ref<CatSpec[]>
  seasonFraction: number
  labelOf: (statId: string) => string
}): { view: ComputedRef<TradeView | null> } {
  const leagueStore = useLeagueStore()

  const view = computed<TradeView | null>(() => {
    const cats = inputs.catSpecs.value
    const pool = inputs.pool.value
    if (!cats.length || pool.length < 2) return null
    const myKey = leagueStore.yahooTeams?.find((t: any) => t.is_my_team)?.team_key
      ? String(leagueStore.yahooTeams.find((t: any) => t.is_my_team).team_key)
      : null
    if (!myKey) return null

    const teamName = (key: string): string =>
      String(leagueStore.yahooTeams?.find((t: any) => String(t.team_key) === key)?.name ?? 'Team')
    const statIds = cats.map((c) => c.statId)
    const fg = inputs.fgByKey.value

    // ROS-blended stats for every rostered player, grouped by team.
    const eff = new Map<string, AggPlayer>()
    const byTeam = new Map<string, PoolPlayer[]>()
    for (const p of pool) {
      if (!p.teamKey) continue
      eff.set(p.playerKey, { playerKey: p.playerKey, stats: toEffectiveStats(p.stats, fg[p.playerKey] ?? null, cats, inputs.seasonFraction) })
      ;(byTeam.get(p.teamKey) ?? byTeam.set(p.teamKey, []).get(p.teamKey)!).push(p)
    }
    if (!byTeam.has(myKey)) return null

    const playersByTeam = [...byTeam.entries()].map(([teamId, ps]) => ({ teamId, players: ps.map((p) => eff.get(p.playerKey)!) }))
    const { landscape } = buildLandscape(aggregateTeamCats(playersByTeam, cats), cats)
    const strengths = playerStrengths([...eff.values()], cats)
    const marketValue = new Map(
      computeRosterValue(
        pool.map((p) => ({ playerKey: p.playerKey, position: p.position, stats: eff.get(p.playerKey)!.stats })),
        pool.map((p) => p.playerKey),
        cats,
      ).map((c) => [c.playerKey, c.roleValue]),
    )

    const myStanding = landscape.get(myKey)!
    const numTeams = byTeam.size
    const weakCut = Math.ceil((numTeams * 2) / 3) // rank at/below this = a genuine hole
    // Need vector with a FLOOR for deal scoring (no category fully free).
    const needVec = (key: string): Record<string, number> => {
      const m = landscape.get(key)
      const out: Record<string, number> = {}
      for (const c of statIds) out[c] = Math.max(NEED_FLOOR, m?.get(c)?.need ?? 0)
      return out
    }
    const tag = (statId: string): CatTag => ({ label: inputs.labelOf(statId), rank: myStanding.get(statId)?.rank ?? 0 })

    // "Trade from" is genuine dominance (top-2), not a mid-pack gap; "to fix" is a genuine
    // bottom-tier hole, not a close race near the top.
    const tradeFrom = statIds
      .filter((c) => (myStanding.get(c)?.rank ?? 99) <= DOMINANCE_RANK)
      .sort((a, b) => (myStanding.get(a)!.rank) - (myStanding.get(b)!.rank))
      .map(tag)
    const toFix = statIds
      .filter((c) => (myStanding.get(c)?.rank ?? 0) >= weakCut)
      .sort((a, b) => (myStanding.get(b)!.rank) - (myStanding.get(a)!.rank))
      .map(tag)

    const partnerScores = rankPartners(landscape, myKey, statIds).slice(0, TOP_PARTNERS)
    const myNeed = needVec(myKey)
    // Protect your core: never offer your most valuable players in a "fix your holes" tool.
    const myPlayers = byTeam.get(myKey)!
    const giveCandidates = [...myPlayers]
      .sort((a, b) => (marketValue.get(b.playerKey) ?? 0) - (marketValue.get(a.playerKey) ?? 0))
      .slice(CORE_PROTECT)

    // Build the best 1-for-1 with each partner, then keep the strongest across partners.
    const candidates: TradeTarget[] = []
    for (const ps of partnerScores) {
      const theirPlayers = byTeam.get(ps.teamId) ?? []
      const theirNeed = needVec(ps.teamId)
      let best: { t: TradeTarget; gain: number } | null = null
      for (const give of giveCandidates) {
        for (const get of theirPlayers) {
          const gv = marketValue.get(give.playerKey) ?? 0
          const tv = marketValue.get(get.playerKey) ?? 0
          if (Math.abs(tv - gv) > VALUE_BAND) continue
          const ev = evalDeal(strengths.get(get.playerKey) ?? {}, strengths.get(give.playerKey) ?? {}, myNeed, theirNeed, statIds)
          if (ev.klass === 'fleece' || ev.yourGain <= 0) continue
          // The category you gain most in = what this trade fixes.
          let fixId = statIds[0]
          let maxg = -Infinity
          for (const c of statIds) {
            const g = (myNeed[c] ?? 0) * ((strengths.get(get.playerKey)?.[c] ?? 0) - (strengths.get(give.playerKey)?.[c] ?? 0))
            if (g > maxg) { maxg = g; fixId = c }
          }
          if (!best || ev.yourGain > best.gain) {
            best = {
              gain: ev.yourGain,
              t: {
                fix: tag(fixId),
                get: { name: get.name, pos: get.position, value: Math.round(tv) },
                give: { name: give.name, pos: give.position, value: Math.round(gv) },
                fromTeam: teamName(ps.teamId),
                klass: ev.klass,
              },
            }
          }
        }
      }
      if (best) candidates.push(best.t)
    }
    // Lead with the deals that fix your worst categories (highest fix rank), gain as tiebreak.
    candidates.sort((a, b) => b.fix.rank - a.fix.rank)

    const partners: PartnerView[] = partnerScores.map((ps) => {
      const m = landscape.get(ps.teamId)!
      return {
        team: teamName(ps.teamId),
        strong: statIds.filter((c) => (m.get(c)?.rank ?? 99) <= 3).map((c) => inputs.labelOf(c)).slice(0, 4),
        weak: statIds.filter((c) => (m.get(c)?.rank ?? 0) >= weakCut).map((c) => inputs.labelOf(c)).slice(0, 4),
        score: ps.score,
      }
    })

    return { tradeFrom, toFix, targets: candidates, partners }
  })

  return { view }
}
