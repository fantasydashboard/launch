import { computed, type ComputedRef, type Ref } from 'vue'
import { useLeagueStore } from '@/stores/league'
import type { CatSpec } from '@/myteam/value'
import { computeRosterValue } from '@/myteam/value'
import { toEffectiveStats } from '@/myteam/effectiveStats'
import type { PoolPlayer } from '@/composables/useMyRoster'
import type { FGProjection } from '@/services/projectionService'
import { aggregateTeamCats, playerStrengths, type AggPlayer } from '@/trades/aggregate'
import { buildLandscape, type TeamTotals } from '@/trades/landscape'
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
export interface ConsolidateTarget {
  fix: CatTag
  get: TradeSide // the stud you'd land
  give: TradeSide[] // the two depth pieces you'd package
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
  partners: PartnerView[]
  // Trade INTENT modes:
  winWin: TradeTarget[] // both teams clearly improve — most likely to be accepted
  reach: TradeTarget[] // lopsided in your favor — the overpay you'd extract from a reacher
  consolidate: ConsolidateTarget[] // package two depth pieces for one stud (2-for-1)
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
const CONSOLIDATE_PROTECT = 2 // a 2-for-1 CAN pry a better player, but not their very top

export function useTradeTargets(inputs: {
  pool: Ref<PoolPlayer[]>
  fgByKey: Ref<Record<string, FGProjection | null>>
  catSpecs: Ref<CatSpec[]>
  // Per-team category WIN counts (from the season standings) — the reliable measure of
  // each team's category strength. Falls back to a ROS-aggregate before this loads.
  teamCatWins?: Ref<TeamTotals[]>
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
    // Team category STRENGTH from the real per-category standings (win records) when
    // available — reliable and consistent with My Team — falling back to the ROS-aggregate
    // only before standings load. Win counts already read higher-is-better in every cat
    // (Yahoo's stat_winners encode direction), so rank them without direction flips.
    const wins = inputs.teamCatWins?.value ?? []
    const useWins = wins.length >= 2 && wins.some((w) => Object.keys(w.totals).length > 0)
    const teamTotals = useWins ? wins : aggregateTeamCats(playersByTeam, cats)
    const landscapeCats = useWins ? cats.map((c) => ({ ...c, lowerIsBetter: false })) : cats
    const { landscape } = buildLandscape(teamTotals, landscapeCats)
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
      .slice(0, 5) // you can't fix ten holes — show the worst handful
      .map(tag)

    const partnerScores = rankPartners(landscape, myKey, statIds).slice(0, TOP_PARTNERS)
    const myNeed = needVec(myKey)
    // Protect your core: never offer your most valuable players in a "fix your holes" tool.
    const myPlayers = byTeam.get(myKey)!
    const giveCandidates = [...myPlayers]
      .sort((a, b) => (marketValue.get(b.playerKey) ?? 0) - (marketValue.get(a.playerKey) ?? 0))
      .slice(CORE_PROTECT)

    // Shared helpers across the modes.
    const isHole = (statId: string) => (myStanding.get(statId)?.rank ?? 0) >= weakCut
    const combineStr = (keys: string[]): Record<string, number> => {
      const out: Record<string, number> = {}
      for (const k of keys) {
        const s = strengths.get(k) ?? {}
        for (const c of statIds) out[c] = (out[c] ?? 0) + (s[c] ?? 0)
      }
      return out
    }
    // The category you improve most = what the trade fixes (getter minus what you give up).
    const bestFix = (getKey: string, giveKeys: string[]): string => {
      const gs = strengths.get(getKey) ?? {}
      const gv = combineStr(giveKeys)
      let fixId = statIds[0]
      let maxg = -Infinity
      for (const c of statIds) {
        const g = (myNeed[c] ?? 0) * ((gs[c] ?? 0) - (gv[c] ?? 0))
        if (g > maxg) { maxg = g; fixId = c }
      }
      return fixId
    }

    // --- All viable 1-for-1 deals (gated to your real holes, value-banded, both cores
    //     protected), bucketed into the Win-win and Make-them-reach modes. ---
    interface Raw {
      klass: DealClass
      yourGain: number
      theirGain: number
      giveKey: string
      fixId: string
      get: TradeSide
      give: TradeSide
      fromTeam: string
    }
    const oneForOne: Raw[] = []
    for (const ps of partnerScores) {
      const theirNeed = needVec(ps.teamId)
      // Protect THEIR core too — you can't pry a team's best players (symmetric to ours).
      const getCandidates = [...(byTeam.get(ps.teamId) ?? [])]
        .sort((a, b) => (marketValue.get(b.playerKey) ?? 0) - (marketValue.get(a.playerKey) ?? 0))
        .slice(CORE_PROTECT)
      for (const give of giveCandidates) {
        const gv = marketValue.get(give.playerKey) ?? 0
        for (const get of getCandidates) {
          const tv = marketValue.get(get.playerKey) ?? 0
          if (Math.abs(tv - gv) > VALUE_BAND) continue
          const ev = evalDeal(strengths.get(get.playerKey) ?? {}, strengths.get(give.playerKey) ?? {}, myNeed, theirNeed, statIds)
          if (ev.klass === 'fleece' || ev.yourGain <= 0) continue
          const fixId = bestFix(get.playerKey, [give.playerKey])
          if (!isHole(fixId)) continue // no "fixes W · 4th"
          oneForOne.push({
            klass: ev.klass,
            yourGain: ev.yourGain,
            theirGain: ev.theirGain,
            giveKey: give.playerKey,
            fixId,
            get: { name: get.name, pos: get.position, value: Math.round(tv) },
            give: { name: give.name, pos: give.position, value: Math.round(gv) },
            fromTeam: teamName(ps.teamId),
          })
        }
      }
    }
    const toTarget = (d: Raw): TradeTarget => ({ fix: tag(d.fixId), get: d.get, give: d.give, fromTeam: d.fromTeam, klass: d.klass === 'leverage' ? 'leverage' : 'winWin' })
    const dedupeTop = (deals: Raw[], cmp: (a: Raw, b: Raw) => number, n = 6): TradeTarget[] => {
      const used = new Set<string>()
      const out: TradeTarget[] = []
      for (const d of [...deals].sort(cmp)) {
        if (used.has(d.giveKey)) continue
        used.add(d.giveKey)
        out.push(toTarget(d))
        if (out.length >= n) break
      }
      return out
    }
    // Win-win: rank by SHARED benefit (most likely accepted). Make-them-reach: rank by
    // YOUR gain (the overpay you'd extract from a desperate/reaching counterparty).
    const winWin = dedupeTop(oneForOne.filter((d) => d.klass === 'winWin'), (a, b) => Math.min(b.yourGain, b.theirGain) - Math.min(a.yourGain, a.theirGain))
    const reach = dedupeTop(oneForOne.filter((d) => d.klass === 'leverage'), (a, b) => b.yourGain - a.yourGain)

    // --- Consolidate (2-for-1): package two depth pieces for one stud that fixes a hole.
    //     A 2-for-1 can pry a better player (protect only their very top), and you pay a
    //     bounded total-value premium for the upgrade plus the freed roster spot. ---
    const consolidate: ConsolidateTarget[] = []
    for (const ps of partnerScores) {
      const theirNeed = needVec(ps.teamId)
      const getCandidates = [...(byTeam.get(ps.teamId) ?? [])]
        .sort((a, b) => (marketValue.get(b.playerKey) ?? 0) - (marketValue.get(a.playerKey) ?? 0))
        .slice(CONSOLIDATE_PROTECT)
      let best: { gain: number; t: ConsolidateTarget } | null = null
      for (let i = 0; i < giveCandidates.length; i++) {
        for (let j = i + 1; j < giveCandidates.length; j++) {
          const g1 = giveCandidates[i]
          const g2 = giveCandidates[j]
          const v1 = marketValue.get(g1.playerKey) ?? 0
          const v2 = marketValue.get(g2.playerKey) ?? 0
          const combinedVal = v1 + v2
          const combined = combineStr([g1.playerKey, g2.playerKey])
          for (const get of getCandidates) {
            const tv = marketValue.get(get.playerKey) ?? 0
            if (tv < Math.max(v1, v2)) continue // the stud must upgrade over each piece
            if (combinedVal < tv || combinedVal - tv > VALUE_BAND) continue // bounded premium
            const ev = evalDeal(strengths.get(get.playerKey) ?? {}, combined, myNeed, theirNeed, statIds)
            if (ev.yourGain <= 0 || ev.theirGain <= 0) continue
            const fixId = bestFix(get.playerKey, [g1.playerKey, g2.playerKey])
            if (!isHole(fixId)) continue
            if (!best || ev.yourGain > best.gain) {
              best = {
                gain: ev.yourGain,
                t: {
                  fix: tag(fixId),
                  get: { name: get.name, pos: get.position, value: Math.round(tv) },
                  give: [
                    { name: g1.name, pos: g1.position, value: Math.round(v1) },
                    { name: g2.name, pos: g2.position, value: Math.round(v2) },
                  ],
                  fromTeam: teamName(ps.teamId),
                  klass: ev.klass === 'leverage' ? 'leverage' : 'winWin',
                },
              }
            }
          }
        }
      }
      if (best) consolidate.push(best.t)
    }
    consolidate.sort((a, b) => b.fix.rank - a.fix.rank)

    const partners: PartnerView[] = partnerScores.map((ps) => {
      const m = landscape.get(ps.teamId)!
      return {
        team: teamName(ps.teamId),
        strong: statIds.filter((c) => (m.get(c)?.rank ?? 99) <= 3).map((c) => inputs.labelOf(c)).slice(0, 4),
        weak: statIds.filter((c) => (m.get(c)?.rank ?? 0) >= weakCut).map((c) => inputs.labelOf(c)).slice(0, 4),
        score: ps.score,
      }
    })

    return { tradeFrom, toFix, partners, winWin, reach, consolidate }
  })

  return { view }
}
