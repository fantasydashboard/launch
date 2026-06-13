import { computed, type ComputedRef, type Ref } from 'vue'
import type { CatSpec } from '@/myteam/value'
import { computeRosterValue } from '@/myteam/value'
import { toEffectiveStats } from '@/myteam/effectiveStats'
import type { PoolPlayer } from '@/composables/useMyRoster'
import { computeLuck, type FGProjection, type StatcastData } from '@/services/projectionService'
import { computeTiming } from '@/trades/timing'
import { aggregateTeamCats, type AggPlayer } from '@/trades/aggregate'
import { buildLandscape, type TeamTotals } from '@/trades/landscape'
import { rankPartners } from '@/trades/partners'
import { evalDeal, type DealClass } from '@/trades/deals'
import { isGiveable } from '@/trades/giveable'
import { sideOf } from '@/myteam/yourMove/helpedCats'
import { mlbTeamLogo } from '@/players/mlbTeamLogo'

export interface CatTag {
  label: string
  rank: number
  hole?: boolean // a bottom-tier hole ("Fixes") vs a contested race ("Improves")
}
export interface TradeSide {
  name: string
  pos: string
  value: number
  headshot?: string
  proLogo?: string // MLB pro-team logo (omitted when unknown)
  timing?: 'buy' | 'sell' // buy-low (a player you GET) / sell-high (a player you GIVE)
  timingConfirmed?: boolean // expected stats (Statcast luck) agree with the timing call
}
export interface TradeTarget {
  fix: CatTag // the category this trade fixes for you
  get: TradeSide
  give: TradeSide
  fromTeam: string
  fromTeamLogo?: string
  klass: Exclude<DealClass, 'fleece'>
  helps: string[] // the categories you NET (need-weighted), e.g. ['SB','SV'] — show your work
}
export interface ConsolidateTarget {
  fix: CatTag
  get: TradeSide // the stud you'd land
  give: TradeSide[] // the two depth pieces you'd package
  fromTeam: string
  fromTeamLogo?: string
  klass: Exclude<DealClass, 'fleece'>
  helps: string[]
}
export interface PartnerView {
  team: string
  logo?: string
  strong: string[] // their strengths (overall)
  weak: string[] // their holes (overall)
  buyFrom: string[] // their strength ∩ YOUR holes — what you'd acquire from them
  sellTo: string[] // their holes ∩ YOUR surplus — where they're desperate and you press
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
  timing: TradeTarget[] // buy-low / sell-high 1-for-1 (need-disciplined, by timing edge)
  timingConsolidate: ConsolidateTarget[] // buy-low / sell-high 2-for-1
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
const CONSOLIDATE_PROTECT = 3 // a 2-for-1 CAN pry a better player, but not a team's top few
const EVEN_BAND = 12 // win-win values must be within this; "reach" requires you to gain value
// The get player must be GENUINELY strong (this z, ~70th+ pct) in the category a deal claims
// to fix — not merely less-bad than the give. Kills scrub-for-scrub "fixes ERA" noise deals
// while keeping real upgrades (an elite closer's SV z clears it easily). Tunable.
const MIN_FIX_STRENGTH = 0.5
// A category counts as worth improving (beyond bottom-tier holes) once its hump need clears
// this — i.e. it's genuinely contested (within ~half a spread of the team above). Matches the
// landscape's DEMAND threshold. Lets Win-win/Consolidate surface close-race upgrades.
const MARGINAL_NEED = 0.5
// "Make them reach" is one-sided: the get must be at least this much MORE valuable than the
// give (a believable overpay), capped by VALUE_BAND. The return need not fix your hole — the
// edge is their desperation, not a category match.
const REACH_MIN_OVERPAY = 6

export function useTradeTargets(inputs: {
  pool: Ref<PoolPlayer[]>
  fgByKey: Ref<Record<string, FGProjection | null>>
  // Statcast (expected-stats) per player, for the buy-low/sell-high luck signal. Optional —
  // timing degrades to value-divergence only when absent.
  statcastByKey?: Ref<Record<string, StatcastData | null>>
  catSpecs: Ref<CatSpec[]>
  // Per-team category WIN counts (from the season standings) — the reliable measure of
  // each team's category strength. Falls back to a ROS-aggregate before this loads.
  teamCatWins?: Ref<TeamTotals[]>
  // The logged-in team's key (matches the pool's teamKey), and team key -> display name
  // / logo. Supplied by the view so the engine is platform-neutral (Yahoo or ESPN).
  myTeamKey: Ref<string | null>
  teamNameByKey: Ref<Map<string, string>>
  teamLogoByKey?: Ref<Map<string, string>>
  seasonFraction: number
  labelOf: (statId: string) => string
}): { view: ComputedRef<TradeView | null> } {
  const view = computed<TradeView | null>(() => {
    const cats = inputs.catSpecs.value
    const pool = inputs.pool.value
    if (!cats.length || pool.length < 2) return null
    const myKey = inputs.myTeamKey.value
    if (!myKey) return null

    const teamName = (key: string): string => inputs.teamNameByKey.value.get(key) ?? 'Team'
    const teamLogo = (key: string): string | undefined => inputs.teamLogoByKey?.value.get(key)
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
    // ONE valuation pass feeds both the trade scorer and the displayed value:
    //  - strengths: the per-category VOLUME-WEIGHTED z (so a low-IP reliever can't "fix" a
    //    ratio cat like ERA, but keeps full credit for counting cats like SV/HLD/K).
    //  - marketValue: the CROSS-ROLE percentile (hitter and pitcher on one scale), so deal
    //    evenness and the value meter are comparable across positions.
    const valued = computeRosterValue(
      pool.map((p) => ({ playerKey: p.playerKey, position: p.position, stats: eff.get(p.playerKey)!.stats })),
      pool.map((p) => p.playerKey),
      cats,
    )
    const marketValue = new Map(valued.map((c) => [c.playerKey, c.crossPercentile]))
    const strengths = new Map(
      valued.map((c) => [c.playerKey, Object.fromEntries(c.contribs.map((k) => [k.statId, k.z]))]),
    )

    // --- Buy-low / sell-high TIMING: PERCEIVED value (season-to-date pace, what a naive
    //     manager sees) vs ROS value (the projection), plus Statcast expected-stats luck.
    //     Overperformer → sell-high; underperformer → buy-low. Powers the timing mode and the
    //     buy/sell side badges. Unmatched players have perceived == ros → no signal. ---
    const perceivedValued = computeRosterValue(
      pool.map((p) => ({ playerKey: p.playerKey, position: p.position, stats: toEffectiveStats(p.stats, null, cats, inputs.seasonFraction) })),
      pool.map((p) => p.playerKey),
      cats,
    )
    const perceivedPct = new Map(perceivedValued.map((c) => [c.playerKey, c.crossPercentile]))
    const rosPct = new Map(valued.map((c) => [c.playerKey, c.crossPercentile]))
    const statcast = inputs.statcastByKey?.value ?? {}
    const timingByKey = new Map<string, ReturnType<typeof computeTiming>>()
    for (const p of pool) {
      const sc = statcast[p.playerKey]
      // Dominant luck across the league's expected-stat-eligible cats (strong beats mild).
      let luck: 'over' | 'under' | null = null
      let luckStrong = false
      if (sc) {
        for (const c of cats) {
          const ld = computeLuck(inputs.labelOf(c.statId), p.stats[c.statId], sc)
          if (ld?.direction && (!luck || (ld.severity === 'strong' && !luckStrong))) {
            luck = ld.direction
            luckStrong = ld.severity === 'strong'
          }
        }
      }
      timingByKey.set(p.playerKey, computeTiming(perceivedPct.get(p.playerKey) ?? 50, rosPct.get(p.playerKey) ?? 50, luck, luckStrong))
    }
    // Badge a side only in its trade-relevant direction: a GET can be a buy-low, a GIVE a sell-high.
    const sideTiming = (key: string, want: 'buy' | 'sell'): Pick<TradeSide, 'timing' | 'timingConfirmed'> => {
      const t = timingByKey.get(key)
      return t?.dir === want ? { timing: want, timingConfirmed: t.luckConfirmed } : {}
    }
    const timingEdgeOf = (getKey: string, giveKeys: string[]): number => {
      const gt = timingByKey.get(getKey)
      const buy = gt?.dir === 'buy' ? gt.score : 0
      const sell = giveKeys.reduce((s, k) => {
        const t = timingByKey.get(k)
        return s + (t?.dir === 'sell' ? t.score : 0)
      }, 0)
      return buy + sell
    }

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
    const tag = (statId: string): CatTag => ({ label: inputs.labelOf(statId), rank: myStanding.get(statId)?.rank ?? 0, hole: (myStanding.get(statId)?.rank ?? 0) >= weakCut })

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
    // RAW need (no floor) for deciding what a deal IMPROVES: a category you dominate has ~0
    // need, so getting value there is dead value and must NOT headline a card or count as help.
    // (The floor stays on myNeed only to keep the deal scorer from treating a punted-category
    // star as free to give away.)
    const myNeedRaw: Record<string, number> = {}
    for (const c of statIds) myNeedRaw[c] = myStanding.get(c)?.need ?? 0
    const myPlayers = byTeam.get(myKey)!
    // Give from SURPLUS, not holes: a candidate's value must sit at least as much in the
    // categories you dominate as in the ones you're fixing — else you'd ship away help in a
    // category you need (e.g. trading an ace while you're weak in ERA). See trades/giveable.
    const surplusCats = statIds.filter((c) => (myStanding.get(c)?.rank ?? 99) <= DOMINANCE_RANK)
    const holeCats = statIds.filter((c) => (myStanding.get(c)?.rank ?? 0) >= weakCut)
    // Protect your core (your most valuable players) AND anything that helps your holes.
    const giveCandidates = [...myPlayers]
      .sort((a, b) => (marketValue.get(b.playerKey) ?? 0) - (marketValue.get(a.playerKey) ?? 0))
      .slice(CORE_PROTECT)
      .filter((p) => isGiveable(strengths.get(p.playerKey) ?? {}, surplusCats, holeCats))

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
    const sideByStat = new Map(cats.map((c) => [c.statId, c.side]))
    // The category you improve most ON THE GET PLAYER'S SIDE = what the trade fixes (a
    // pitcher can't "fix" stolen bases). Weighted by RAW need so it picks the most-FLIPPABLE
    // category (contested or close hole), never a dominated one. Returns '' if none qualifies.
    const bestFix = (getKey: string, giveKeys: string[], getSide: 'hit' | 'pit'): string => {
      const gs = strengths.get(getKey) ?? {}
      const gv = combineStr(giveKeys)
      let fixId = ''
      let maxg = -Infinity
      for (const c of statIds) {
        if (sideByStat.get(c) !== getSide) continue
        if ((gs[c] ?? 0) < MIN_FIX_STRENGTH) continue // get player must actually be GOOD here
        const g = (myNeedRaw[c] ?? 0) * ((gs[c] ?? 0) - (gv[c] ?? 0))
        if (g > maxg) { maxg = g; fixId = c }
      }
      return fixId
    }
    // A category is worth improving if it's a bottom-tier HOLE *or* genuinely CONTESTED — i.e.
    // within ~half a category-spread of the team above (need >= DEMAND). This is the broadening:
    // value lives in close races, not only your deepest holes (where the hump says ~0 anyway).
    const worthImproving = (statId: string) => isHole(statId) || (myNeedRaw[statId] ?? 0) >= MARGINAL_NEED
    // Categories this deal NETS you, need-weighted (get strength minus what you give up), on
    // the get player's side, strongest first. The top one is the category you most improve —
    // which the timing mode uses as its label (it may be a CONTESTED race, not a bottom hole).
    const rankHelps = (getKey: string, giveKeys: string[], getSide: 'hit' | 'pit'): { statId: string; gain: number }[] => {
      const gs = strengths.get(getKey) ?? {}
      const gv = combineStr(giveKeys)
      return statIds
        .filter((c) => sideByStat.get(c) === getSide)
        .map((c) => ({ statId: c, gain: (myNeedRaw[c] ?? 0) * ((gs[c] ?? 0) - (gv[c] ?? 0)) }))
        .filter((x) => x.gain > 0.01)
        .sort((a, b) => b.gain - a.gain)
    }
    // Show your work: name the categories you net (used on every card).
    const helpsFor = (getKey: string, giveKeys: string[], getSide: 'hit' | 'pit'): string[] =>
      rankHelps(getKey, giveKeys, getSide).slice(0, 3).map((x) => inputs.labelOf(x.statId))

    // --- All viable 1-for-1 deals (gated to your real holes, value-banded, both cores
    //     protected), bucketed into the Win-win and Make-them-reach modes. ---
    interface Raw {
      klass: DealClass
      yourGain: number
      theirGain: number
      giveKey: string
      getKey: string
      gv: number
      tv: number
      fixId: string
      get: TradeSide
      give: TradeSide
      fromTeam: string
      fromTeamLogo?: string
      timingEdge: number
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
          const fixId = bestFix(get.playerKey, [give.playerKey], sideOf(get.position))
          if (!fixId || !worthImproving(fixId)) continue // a hole OR a contested race; side-gated
          oneForOne.push({
            klass: ev.klass,
            yourGain: ev.yourGain,
            theirGain: ev.theirGain,
            giveKey: give.playerKey,
            getKey: get.playerKey,
            gv: Math.round(gv),
            tv: Math.round(tv),
            fixId,
            get: { name: get.name, pos: get.position, value: Math.round(tv), headshot: get.headshot, proLogo: mlbTeamLogo(get.proTeam), ...sideTiming(get.playerKey, 'buy') },
            give: { name: give.name, pos: give.position, value: Math.round(gv), headshot: give.headshot, proLogo: mlbTeamLogo(give.proTeam), ...sideTiming(give.playerKey, 'sell') },
            fromTeam: teamName(ps.teamId),
            fromTeamLogo: teamLogo(ps.teamId),
            timingEdge: timingEdgeOf(get.playerKey, [give.playerKey]),
          })
        }
      }
    }
    const toTarget = (d: Raw): TradeTarget => ({ fix: tag(d.fixId), get: d.get, give: d.give, fromTeam: d.fromTeam, fromTeamLogo: d.fromTeamLogo, klass: d.klass === 'leverage' ? 'leverage' : 'winWin', helps: helpsFor(d.getKey, [d.giveKey], sideOf(d.get.pos)) })
    // Dedupe by BOTH the give and the get player (no repeated targets), and cap to two
    // deals per hole so you see variety across your needs rather than five SV cards.
    const dedupeTop = (deals: Raw[], cmp: (a: Raw, b: Raw) => number, n = 6): TradeTarget[] => {
      const usedGive = new Set<string>()
      const usedGet = new Set<string>()
      const perFix = new Map<string, number>()
      const out: TradeTarget[] = []
      for (const d of [...deals].sort(cmp)) {
        if (usedGive.has(d.giveKey) || usedGet.has(d.getKey)) continue
        if ((perFix.get(d.fixId) ?? 0) >= 2) continue
        usedGive.add(d.giveKey)
        usedGet.add(d.getKey)
        perFix.set(d.fixId, (perFix.get(d.fixId) ?? 0) + 1)
        out.push(toTarget(d))
        if (out.length >= n) break
      }
      return out
    }
    // Win-win: near-even value, ranked by SHARED benefit (most likely accepted).
    // Make-them-reach: YOU gain value too (getValue ≥ giveValue — they overpay), ranked
    // by your gain. The value direction is what makes "reach" mean they reached, not you.
    const winWin = dedupeTop(oneForOne.filter((d) => d.klass === 'winWin' && Math.abs(d.tv - d.gv) <= EVEN_BAND), (a, b) => Math.min(b.yourGain, b.theirGain) - Math.min(a.yourGain, a.theirGain))
    // Make them reach — ONE-SIDED leverage, not a mutual match. Press a category where THEY're
    // desperate (a hole) and YOU dominate (surplus): sell that surplus into their need, and take
    // the most valuable player you can extract. The return need NOT fix your hole — it only has
    // to help you in a category with real marginal value (yourGain > 0, which the hump weights
    // toward contested races, not just bottom-tier holes) while they overpay (tv > gv) yet still
    // benefit enough to accept (theirGain > 0). fix here = the category you PRESS, at THEIR rank.
    interface PressRaw { edge: number; giveKey: string; getKey: string; t: TradeTarget }
    const pressRaws: PressRaw[] = []
    for (const ps of partnerScores) {
      const theirNeed = needVec(ps.teamId)
      const theirLand = landscape.get(ps.teamId)
      if (!theirLand) continue
      const pressCats = statIds.filter((c) => surplusCats.includes(c) && (theirLand.get(c)?.rank ?? 0) >= weakCut)
      if (!pressCats.length) continue
      const getCandidates = [...(byTeam.get(ps.teamId) ?? [])]
        .sort((a, b) => (marketValue.get(b.playerKey) ?? 0) - (marketValue.get(a.playerKey) ?? 0))
        .slice(CORE_PROTECT)
      for (const give of giveCandidates) {
        const gs = strengths.get(give.playerKey) ?? {}
        const pressCat = pressCats
          .filter((c) => (gs[c] ?? 0) >= MIN_FIX_STRENGTH) // the give must actually press this cat
          .sort((a, b) => (gs[b] ?? 0) - (gs[a] ?? 0))[0]
        if (!pressCat) continue
        const gv = marketValue.get(give.playerKey) ?? 0
        for (const get of getCandidates) {
          const tv = marketValue.get(get.playerKey) ?? 0
          if (tv - gv < REACH_MIN_OVERPAY || tv - gv > VALUE_BAND) continue // believable overpay
          const ev = evalDeal(strengths.get(get.playerKey) ?? {}, gs, myNeed, theirNeed, statIds)
          if (ev.theirGain <= 0 || ev.yourGain <= 0) continue // they accept; the return helps you
          pressRaws.push({
            edge: (tv - gv) + ev.yourGain,
            giveKey: give.playerKey,
            getKey: get.playerKey,
            t: {
              fix: { label: inputs.labelOf(pressCat), rank: theirLand.get(pressCat)?.rank ?? 0 },
              get: { name: get.name, pos: get.position, value: Math.round(tv), headshot: get.headshot, proLogo: mlbTeamLogo(get.proTeam), ...sideTiming(get.playerKey, 'buy') },
              give: { name: give.name, pos: give.position, value: Math.round(gv), headshot: give.headshot, proLogo: mlbTeamLogo(give.proTeam), ...sideTiming(give.playerKey, 'sell') },
              fromTeam: teamName(ps.teamId),
              fromTeamLogo: teamLogo(ps.teamId),
              klass: 'leverage',
              helps: helpsFor(get.playerKey, [give.playerKey], sideOf(get.position)),
            },
          })
        }
      }
    }
    const reach = (() => {
      const usedGive = new Set<string>()
      const usedGet = new Set<string>()
      const perCat = new Map<string, number>()
      const out: TradeTarget[] = []
      for (const d of pressRaws.sort((a, b) => b.edge - a.edge)) {
        if (usedGive.has(d.giveKey) || usedGet.has(d.getKey)) continue
        if ((perCat.get(d.t.fix.label) ?? 0) >= 2) continue
        usedGive.add(d.giveKey)
        usedGet.add(d.getKey)
        perCat.set(d.t.fix.label, (perCat.get(d.t.fix.label) ?? 0) + 1)
        out.push(d.t)
        if (out.length >= 6) break
      }
      return out
    })()
    // Buy-low / sell-high — the objective is the TIMING edge, NOT a bottom-tier hole fix. Surface
    // deals where you GET a buy-low (rebound coming) and/or GIVE a sell-high (cool-off coming),
    // value-banded and acceptable to them (theirGain > 0), that still help you in a category with
    // real marginal value (yourGain > 0 — contested races count, not only holes). Labeled by the
    // category you most improve (which may be contested), ranked by timing edge.
    interface TimeRaw { edge: number; giveKey: string; getKey: string; improveCat: string; t: TradeTarget }
    const timeRaws: TimeRaw[] = []
    for (const ps of partnerScores) {
      const theirNeed = needVec(ps.teamId)
      const getCandidates = [...(byTeam.get(ps.teamId) ?? [])]
        .sort((a, b) => (marketValue.get(b.playerKey) ?? 0) - (marketValue.get(a.playerKey) ?? 0))
        .slice(CORE_PROTECT)
      for (const give of giveCandidates) {
        const gv = marketValue.get(give.playerKey) ?? 0
        for (const get of getCandidates) {
          const tv = marketValue.get(get.playerKey) ?? 0
          // Asymmetric band: a real sell-high EXPLOITS the other manager overvaluing your hot
          // player — you should come out ahead, or near-even. Extract up to VALUE_BAND when you
          // gain value; give away at most EVEN_BAND (a surplus→need premium), never 20+ points.
          if (tv - gv > VALUE_BAND || gv - tv > EVEN_BAND) continue
          const edge = timingEdgeOf(get.playerKey, [give.playerKey])
          if (edge <= 0) continue // must have a buy-low get and/or sell-high give
          const ev = evalDeal(strengths.get(get.playerKey) ?? {}, strengths.get(give.playerKey) ?? {}, myNeed, theirNeed, statIds)
          if (ev.klass === 'fleece' || ev.theirGain <= 0 || ev.yourGain <= 0) continue
          const improveCat = rankHelps(get.playerKey, [give.playerKey], sideOf(get.position))[0]?.statId
          if (!improveCat) continue // the return must actually help you somewhere
          timeRaws.push({
            edge,
            giveKey: give.playerKey,
            getKey: get.playerKey,
            improveCat,
            t: {
              fix: tag(improveCat),
              get: { name: get.name, pos: get.position, value: Math.round(tv), headshot: get.headshot, proLogo: mlbTeamLogo(get.proTeam), ...sideTiming(get.playerKey, 'buy') },
              give: { name: give.name, pos: give.position, value: Math.round(gv), headshot: give.headshot, proLogo: mlbTeamLogo(give.proTeam), ...sideTiming(give.playerKey, 'sell') },
              fromTeam: teamName(ps.teamId),
              fromTeamLogo: teamLogo(ps.teamId),
              klass: ev.klass === 'leverage' ? 'leverage' : 'winWin',
              helps: helpsFor(get.playerKey, [give.playerKey], sideOf(get.position)),
            },
          })
        }
      }
    }
    const timing = (() => {
      const usedGive = new Set<string>()
      const usedGet = new Set<string>()
      const perCat = new Map<string, number>()
      const out: TradeTarget[] = []
      for (const d of timeRaws.sort((a, b) => b.edge - a.edge)) {
        if (usedGive.has(d.giveKey) || usedGet.has(d.getKey)) continue
        if ((perCat.get(d.improveCat) ?? 0) >= 2) continue
        usedGive.add(d.giveKey)
        usedGet.add(d.getKey)
        perCat.set(d.improveCat, (perCat.get(d.improveCat) ?? 0) + 1)
        out.push(d.t)
        if (out.length >= 6) break
      }
      return out
    })()

    // --- Consolidate (2-for-1): package two depth pieces for one stud that fixes a hole.
    //     A 2-for-1 can pry a better player (protect only their very top), and you pay a
    //     bounded total-value premium for the upgrade plus the freed roster spot. ---
    interface ConsCand { gain: number; timingEdge: number; t: ConsolidateTarget; giveKeys: string[]; getKey: string }
    const consCands: ConsCand[] = []
    const consTimingCands: ConsCand[] = [] // best by timing edge (for the buy-low/sell-high mode)
    for (const ps of partnerScores) {
      const theirNeed = needVec(ps.teamId)
      const getCandidates = [...(byTeam.get(ps.teamId) ?? [])]
        .sort((a, b) => (marketValue.get(b.playerKey) ?? 0) - (marketValue.get(a.playerKey) ?? 0))
        .slice(CONSOLIDATE_PROTECT)
      let best: ConsCand | null = null
      let bestT: ConsCand | null = null
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
            const gives = [g1.playerKey, g2.playerKey]
            const side = sideOf(get.position)
            const fixId = bestFix(get.playerKey, gives, side)
            if (!fixId) continue // the stud must be genuinely strong in some same-side cat
            // Sides are identical across both modes; only the header `fix` label differs.
            const getSide: TradeSide = { name: get.name, pos: get.position, value: Math.round(tv), headshot: get.headshot, proLogo: mlbTeamLogo(get.proTeam), ...sideTiming(get.playerKey, 'buy') }
            const giveSides: TradeSide[] = [
              { name: g1.name, pos: g1.position, value: Math.round(v1), headshot: g1.headshot, proLogo: mlbTeamLogo(g1.proTeam), ...sideTiming(g1.playerKey, 'sell') },
              { name: g2.name, pos: g2.position, value: Math.round(v2), headshot: g2.headshot, proLogo: mlbTeamLogo(g2.proTeam), ...sideTiming(g2.playerKey, 'sell') },
            ]
            const helps = helpsFor(get.playerKey, gives, side)
            const klass: Exclude<DealClass, 'fleece'> = ev.klass === 'leverage' ? 'leverage' : 'winWin'
            // Consolidate: the stud must improve a HOLE or a contested race.
            if (worthImproving(fixId)) {
              const candC: ConsCand = { gain: ev.yourGain, timingEdge: 0, giveKeys: gives, getKey: get.playerKey,
                t: { fix: tag(fixId), get: getSide, give: giveSides, fromTeam: teamName(ps.teamId), fromTeamLogo: teamLogo(ps.teamId), klass, helps } }
              if (!best || candC.gain > best.gain) best = candC
            }
            // Timing 2-for-1: objective is the timing edge — NO hole gate. Label by the category
            // you most improve (may be contested), so a sell-high package isn't dropped for missing a hole.
            const tEdge = timingEdgeOf(get.playerKey, gives)
            const improveCat = rankHelps(get.playerKey, gives, side)[0]?.statId
            if (tEdge > 0 && improveCat) {
              const candT: ConsCand = { gain: ev.yourGain, timingEdge: tEdge, giveKeys: gives, getKey: get.playerKey,
                t: { fix: tag(improveCat), get: getSide, give: giveSides, fromTeam: teamName(ps.teamId), fromTeamLogo: teamLogo(ps.teamId), klass, helps } }
              if (!bestT || candT.timingEdge > bestT.timingEdge) bestT = candT
            }
          }
        }
      }
      if (best) consCands.push(best)
      if (bestT) consTimingCands.push(bestT)
    }
    // Dedupe the get AND both give pieces so no player appears in two packages.
    const dedupeCons = (cands: ConsCand[], cmp: (a: ConsCand, b: ConsCand) => number): ConsolidateTarget[] => {
      const usedGive = new Set<string>()
      const usedGet = new Set<string>()
      const out: ConsolidateTarget[] = []
      for (const c of [...cands].sort(cmp)) {
        if (usedGet.has(c.getKey) || c.giveKeys.some((k) => usedGive.has(k))) continue
        usedGet.add(c.getKey)
        c.giveKeys.forEach((k) => usedGive.add(k))
        out.push(c.t)
      }
      return out
    }
    // Consolidate: lead with deals fixing your worst holes. Timing: by buy-low/sell-high edge.
    const consolidate = dedupeCons(consCands, (a, b) => b.t.fix.rank - a.t.fix.rank || b.gain - a.gain)
    const timingConsolidate = dedupeCons(consTimingCands, (a, b) => b.timingEdge - a.timingEdge)

    // Two-way fit, contextualized to YOU: buyFrom = their strength where you're weak (you
    // acquire); sellTo = their hole where you're strong (you press / make them reach).
    const myStrongSet = new Set(statIds.filter((c) => (myStanding.get(c)?.rank ?? 99) <= 3))
    const myHoleSet = new Set(holeCats)
    const partners: PartnerView[] = partnerScores.map((ps) => {
      const m = landscape.get(ps.teamId)!
      const theirStrong = statIds.filter((c) => (m.get(c)?.rank ?? 99) <= 3)
      const theirWeak = statIds.filter((c) => (m.get(c)?.rank ?? 0) >= weakCut)
      return {
        team: teamName(ps.teamId),
        logo: teamLogo(ps.teamId),
        strong: theirStrong.map((c) => inputs.labelOf(c)).slice(0, 4),
        weak: theirWeak.map((c) => inputs.labelOf(c)).slice(0, 4),
        buyFrom: theirStrong.filter((c) => myHoleSet.has(c)).map((c) => inputs.labelOf(c)).slice(0, 4),
        sellTo: theirWeak.filter((c) => myStrongSet.has(c)).map((c) => inputs.labelOf(c)).slice(0, 4),
        score: ps.score,
      }
    })

    return { tradeFrom, toFix, partners, winWin, reach, consolidate, timing, timingConsolidate }
  })

  return { view }
}
