<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { profileFromStandings, type StandingsEntryLike } from '@/recommendations/fromStandings'
import { computeCategoryWeaknesses } from '@/recommendations/categorySignals'
import type { CategoryDef } from '@/recommendations/types'
import { useFullSeasonCategoryData } from '@/composables/useFullSeasonCategoryData'
import { isYahooCategoryLeague as isYahooCategoryScoringType } from '@/composables/useIsCategoryLeague'
import { useAvailablePlayers } from '@/composables/useAvailablePlayers'
import { useMyRoster } from '@/composables/useMyRoster'
import { useThisWeekMatchup } from '@/composables/useThisWeekMatchup'
import { usePlayersAdds } from '@/composables/usePlayersAdds'
import { isLowerBetter } from '@/players/direction'
import { classifyCategory } from '@/myteam/categorySide'
import { computeRosterValue, type CatSpec } from '@/myteam/value'
import { toEffectiveStats } from '@/myteam/effectiveStats'
import { computeDropCandidates } from '@/myteam/dropCandidates'
import { mapToEspnStats, buildPlayerMatchers, type FGProjection } from '@/services/projectionService'
import { sideOf } from '@/myteam/yourMove/helpedCats'
import { displayLift } from '@/myteam/yourMove/displayLift'
import { detectLeaks } from '@/myteam/lineupLeaks/detectLeaks'
import type { EligiblePlayer } from '@/myteam/lineupLeaks/positionalValue'
import type { RosterSlotPlayer } from '@/myteam/yourMove/pairDrop'
import type { CandidateAction } from '@/myteam/yourMove/types'
import { tierAdds } from '@/players/tierAdds'
import { projectionLine } from '@/players/projectionLine'

const leagueStore = useLeagueStore()
const { players, loading: playersLoading, loaded: playersLoaded, load: loadPlayers } = useAvailablePlayers()
const {
  players: rosterPlayers,
  pool: rosterPool,
  fgByKey: rosterFgByKey,
  loading: rosterLoading,
  loaded: rosterLoaded,
  load: loadRoster,
} = useMyRoster()
const thisWeek = useThisWeekMatchup()

// True once we've fired the (Yahoo) loaders for the active league, so we can tell
// "still loading" from "loaded and empty" from "the load failed". Reset on league switch.
const attempted = ref(false)

// Real season fraction from the league's week bounds (falls back to 0.6) — see store.
const seasonFraction = computed(() => leagueStore.seasonFractionComplete)

// === BEGIN copied-from-MyTeamView derivation (standings/categories/myTeamId + season load) ===
// Kept identical to My Team so the two pages share league context. (A future refactor
// will hoist this — and the catSpecs/contributions block below — into a shared composable.)
const { seasonMatchups, categoryLabels, loaded: seasonLoaded, load: loadSeasonData } =
  useFullSeasonCategoryData()

const isYahooCategoryLeague = computed(() => {
  const id = leagueStore.activeLeagueId
  if (!id) return false
  if (isYahooCategoryScoringType(leagueStore.currentLeague?.scoring_type)) return true
  const saved = leagueStore.savedLeagues?.find((l: any) => l.league_id === id)
  if (saved?.platform && saved.platform !== 'yahoo') return false
  const st = saved?.scoring_type || ''
  if (st) return isYahooCategoryScoringType(st)
  return (leagueStore.yahooMatchups || []).some(
    (m: any) => m?.is_category_league || m?.stat_winners?.length,
  )
})

// v1 is Yahoo category only. The wrapper admits any category league (incl. ESPN), and
// isYahooCategoryLeague can read true off an ESPN league's scoring_type — so gate on the
// actual platform here, or ESPN leagues fire Yahoo-only loaders that never resolve and
// the page hangs on "Ranking the wire…".
const supported = computed(() => leagueStore.activePlatform === 'yahoo' && isYahooCategoryLeague.value)
// A definitively non-Yahoo platform: show the unsupported message immediately (no spinner).
const unsupported = computed(() => leagueStore.activePlatform === 'espn' || leagueStore.activePlatform === 'sleeper')

function maybeLoadSeasonData() {
  const id = leagueStore.activeLeagueId
  if (id && supported.value) loadSeasonData(id)
}
function maybeLoadPlayers() {
  if (supported.value) loadPlayers()
}
function maybeLoadRoster() {
  if (supported.value) loadRoster()
}
function maybeLoadThisWeek() {
  if (!categories.value.length) return
  thisWeek.load(categories.value.map((c) => ({ statId: c.statId, label: c.label })))
}

function runLoads() {
  maybeLoadSeasonData()
  maybeLoadPlayers()
  maybeLoadRoster()
  maybeLoadThisWeek()
  if (supported.value) attempted.value = true
}
onMounted(runLoads)
watch(() => leagueStore.activeLeagueId, () => {
  attempted.value = false
  runLoads()
})
// `supported` can resolve true a tick after mount/switch (it waits on league metadata).
// Fire the loaders the moment it does, so we never sit on the spinner unattempted.
watch(supported, (s) => {
  if (s && !attempted.value) runLoads()
})

const sourceMatchups = computed(() =>
  seasonLoaded.value && seasonMatchups.value.length
    ? seasonMatchups.value
    : leagueStore.yahooMatchups || [],
)

const perCategory = computed(() => {
  const wins = new Map<string, Record<string, number>>()
  const losses = new Map<string, Record<string, number>>()
  const statIds = new Set<string>()
  for (const m of sourceMatchups.value) {
    if (!m?.stat_winners?.length) continue
    const team1 = m.teams?.[0]
    const team2 = m.teams?.[1]
    const team1Key = team1?.team_key || team1?.team_id
    const team2Key = team2?.team_key || team2?.team_id
    if (!team1Key || !team2Key) continue
    for (const key of [team1Key, team2Key]) {
      if (!wins.has(key)) {
        wins.set(key, {})
        losses.set(key, {})
      }
    }
    for (const sw of m.stat_winners) {
      const statId = String(sw.stat_id)
      statIds.add(statId)
      const t1Wins = wins.get(team1Key)!
      const t1Losses = losses.get(team1Key)!
      const t2Wins = wins.get(team2Key)!
      const t2Losses = losses.get(team2Key)!
      if (sw.is_tied === true || sw.is_tied === '1') {
        // tie — no credit
      } else if (sw.winner_team_key === team1Key) {
        t1Wins[statId] = (t1Wins[statId] || 0) + 1
        t2Losses[statId] = (t2Losses[statId] || 0) + 1
      } else if (sw.winner_team_key === team2Key) {
        t2Wins[statId] = (t2Wins[statId] || 0) + 1
        t1Losses[statId] = (t1Losses[statId] || 0) + 1
      }
    }
  }
  return { wins, losses, statIds }
})

const standings = computed<StandingsEntryLike[]>(() => {
  const teams = leagueStore.yahooStandings?.length
    ? leagueStore.yahooStandings
    : leagueStore.yahooTeams || []
  const { wins, losses } = perCategory.value
  return teams.map((team: any) => {
    const byKey = wins.get(team.team_key) || wins.get(team.team_id) || {}
    const byKeyLoss = losses.get(team.team_key) || losses.get(team.team_id) || {}
    return {
      team: { teamId: String(team.team_id || team.team_key), name: team.name, avatar: team.logo_url || team.logo || team.avatar },
      perCategoryWins: byKey,
      perCategoryLosses: byKeyLoss,
    }
  })
})

const categories = computed<CategoryDef[]>(() => {
  const labels = categoryLabels.value
  return [...perCategory.value.statIds].map((statId) => {
    const meta = labels.get(statId)
    return { statId, label: meta?.label || `S${statId}`, name: meta?.name || `Stat ${statId}`, side: 'hit' as const, higherIsBetter: true }
  })
})

const myTeamId = computed<string | null>(() => {
  const myTeam = leagueStore.yahooTeams?.find((t: any) => t.is_my_team)
  if (myTeam) return String(myTeam.team_id ?? myTeam.team_key)
  if (leagueStore.currentUserId) {
    const myRoster = leagueStore.leagueRosters?.find((r: any) => r.owner_id === leagueStore.currentUserId)
    if (myRoster) return String(myRoster.roster_id)
  }
  return null
})
// === END copied derivation ===

const profile = computed(() => {
  if (!myTeamId.value || standings.value.length === 0 || categories.value.length === 0) return null
  try {
    return profileFromStandings(standings.value, categories.value, myTeamId.value)
  } catch {
    return null
  }
})

// Reload the matchup snapshot once categories resolve (same pattern as My Team).
watch(categories, () => maybeLoadThisWeek())

// === Category specs (side / isRatio / volume) — parallels MyTeamView (Yahoo branch) ===
const cats = computed(() =>
  categories.value.map((c) => ({ statId: c.statId, lowerIsBetter: isLowerBetter(c.label || c.name || c.statId) })),
)
const lowerBetterByStatId = computed(() => {
  const m = new Map<string, boolean>()
  for (const c of cats.value) m.set(c.statId, c.lowerIsBetter)
  return m
})
const catSpecs = computed<CatSpec[]>(() => {
  const findStatId = (names: string[]): string | undefined => {
    for (const c of categories.value) {
      const label = (c.label || c.name || '').toUpperCase().trim()
      if (names.includes(label)) return c.statId
    }
    return undefined
  }
  const ipStatId = findStatId(['IP', 'INNINGS PITCHED'])
  const abStatId = findStatId(['AB', 'AT BATS', 'PA', 'PLATE APPEARANCES'])
  return categories.value.map((c) => {
    const lowerIsBetter = lowerBetterByStatId.value.get(c.statId) ?? false
    const { side, isRatio } = classifyCategory(c.label || c.name || c.statId, lowerIsBetter)
    return { statId: c.statId, lowerIsBetter, side, isRatio, volumeStatId: isRatio ? (side === 'pit' ? ipStatId : abStatId) : undefined }
  })
})
const labelFor = (statId: string) => categories.value.find((c) => c.statId === statId)?.label ?? statId

// FanGraphs ROS stats mapped to league stat ids, for a given key->FGProjection map.
function mapFg(fgMap: Record<string, FGProjection | null>): Record<string, Record<string, number> | null> {
  if (!catSpecs.value.length) return {}
  const labelByStatId = new Map(categories.value.map((c) => [c.statId, c.label || c.name || c.statId]))
  const fgCats = catSpecs.value.map((c) => ({ stat_id: c.statId, display_name: labelByStatId.get(c.statId), isPitching: c.side === 'pit' }))
  const out: Record<string, Record<string, number> | null> = {}
  for (const key of Object.keys(fgMap)) {
    const fg = fgMap[key]
    out[key] = fg ? mapToEspnStats(fg, fgCats) : null
  }
  return out
}

// === My roster contributions (for drop pairing's roleValue) — parallels MyTeamView ===
const myPlayerKeys = computed(() => rosterPlayers.value.map((p) => p.playerKey))
const rosterFgStatsByKey = computed(() => mapFg(rosterFgByKey.value))
const contributions = computed(() => {
  if (!rosterPool.value.length || !myPlayerKeys.value.length || !catSpecs.value.length) return []
  const fgMap = rosterFgStatsByKey.value
  const effectivePool = rosterPool.value.map((p) => ({
    playerKey: p.playerKey,
    position: p.position,
    stats: toEffectiveStats(p.stats, fgMap[p.playerKey] ?? null, catSpecs.value, seasonFraction.value),
  }))
  return computeRosterValue(effectivePool, myPlayerKeys.value, catSpecs.value)
})
const weakLinkKey = computed(() => computeDropCandidates(contributions.value).weakLink?.playerKey ?? null)
const rosterSlotPlayers = computed<RosterSlotPlayer[]>(() => {
  const byKey = new Map(contributions.value.map((c) => [c.playerKey, c]))
  return rosterPlayers.value.map((p) => {
    const c = byKey.get(p.playerKey)
    return {
      playerKey: p.playerKey,
      name: p.name,
      team: (p as { team?: string }).team ?? '',
      position: (p as { position?: string }).position ?? '',
      side: (c?.role === 'pitcher' ? 'pit' : 'hit') as 'hit' | 'pit',
      roleValue: c?.roleValue ?? 50,
      started: (p as { started?: boolean }).started ?? true,
      stats: (p as { stats?: Record<string, number> }).stats ?? {},
    }
  })
})

// === Free-agent FanGraphs ROS enrichment (the credibility fix) ===
const faFg = ref<Record<string, FGProjection | null>>({})
async function loadFaFg() {
  if (!players.value.length) return
  const { matchFG } = await buildPlayerMatchers()
  const out: Record<string, FGProjection | null> = {}
  for (const fa of players.value) out[fa.playerKey] = matchFG({ full_name: fa.name, mlb_team: fa.team })
  faFg.value = out
}
watch(() => players.value, loadFaFg, { immediate: true })
const faFgStatsByKey = computed(() => mapFg(faFg.value))
const fgMatched = computed(() => {
  const s = new Set<string>()
  const fg = faFgStatsByKey.value
  for (const k of Object.keys(fg)) if (fg[k]) s.add(k)
  return s
})
const faByKey = computed(() => new Map(players.value.map((fa) => [fa.playerKey, fa])))
// ROS-blended (display) stats per free agent.
const effectiveByKey = computed(() => {
  const fg = faFgStatsByKey.value
  const m = new Map<string, Record<string, number>>()
  for (const fa of players.value) m.set(fa.playerKey, toEffectiveStats(fa.stats, fg[fa.playerKey] ?? null, catSpecs.value, seasonFraction.value))
  return m
})

// === The ranked add universe ===
const playersAdds = usePlayersAdds({
  catSpecs,
  freeAgents: players,
  fgStatsByKey: faFgStatsByKey,
  roster: rosterSlotPlayers,
  snapshot: thisWeek.snapshot,
  seasonFraction,
})
const tiered = computed(() => tierAdds(playersAdds.adds.value))

interface AddView {
  key: string
  name: string
  pos: string
  team: string
  headshot?: string
  lift: number
  flips: string[]
  drop: string | null
  dropWeakLink: boolean
  segs: ReturnType<typeof projectionLine>
  matched: boolean
}
function buildView(a: CandidateAction): AddView {
  const fa = faByKey.value.get(a.player.key)
  const side = sideOf(a.player.position)
  const stats = effectiveByKey.value.get(a.player.key) ?? {}
  return {
    key: a.player.key,
    name: a.player.name,
    pos: a.player.position,
    team: fa?.team ?? a.player.team,
    headshot: fa?.headshot,
    lift: displayLift(a.winProbLift),
    flips: a.categories.map(labelFor),
    drop: a.counterparty?.name ?? null,
    dropWeakLink: !!a.counterparty?.key && a.counterparty.key === weakLinkKey.value,
    segs: projectionLine(stats, catSpecs.value, side, a.categories, labelFor, 3),
    matched: fgMatched.value.has(a.player.key),
  }
}
const strongViews = computed(() => tiered.value.strong.map(buildView))
const smallerViews = computed(() => tiered.value.smaller.slice(0, 6).map(buildView))
const hero = computed(() => strongViews.value[0] ?? null)
const restStrong = computed(() => strongViews.value.slice(1))

// === Season-fit lens: your roster vs the wire ===
// The cure for "this is just Your Move extended": instead of a ranked add feed, measure
// your roster against the market, slot by slot, and surface where a better player is
// available. Both your players and free agents are valued on ONE shared scale (the
// market = all rostered players + the FA pool, run through computeRosterValue), then
// detectLeaks — the same "a stronger player is available for this spot" engine that
// powers Lineup Leaks — is pointed at the waiver pool instead of your bench.
const lens = ref<'thisWeek' | 'seasonFit'>('thisWeek')

const UPGRADE_MATERIALITY = 6 // shared 0-100 value points a wire upgrade must clear

const marketPool = computed(() => {
  if (!catSpecs.value.length) return []
  const fgR = rosterFgStatsByKey.value
  const fgF = faFgStatsByKey.value
  const rosterEff = rosterPool.value.map((p) => ({ playerKey: p.playerKey, position: p.position, stats: toEffectiveStats(p.stats, fgR[p.playerKey] ?? null, catSpecs.value, seasonFraction.value) }))
  const faEff = players.value.map((fa) => ({ playerKey: fa.playerKey, position: fa.position, stats: toEffectiveStats(fa.stats, fgF[fa.playerKey] ?? null, catSpecs.value, seasonFraction.value) }))
  return [...rosterEff, ...faEff]
})
const marketValueByKey = computed(() => {
  if (!marketPool.value.length) return new Map<string, number>()
  const keys = marketPool.value.map((p) => p.playerKey)
  return new Map(computeRosterValue(marketPool.value, keys, catSpecs.value).map((c) => [c.playerKey, c.roleValue]))
})
function toEligibleFor(p: { playerKey: string; name: string; team?: string; position?: string; eligiblePositions?: string[]; stats?: Record<string, number>; status?: string }, fg: Record<string, Record<string, number> | null>): EligiblePlayer {
  const eligible = p.eligiblePositions?.length ? p.eligiblePositions : String(p.position ?? '').split(/[,/]/).map((s) => s.trim()).filter(Boolean)
  return {
    playerKey: p.playerKey,
    name: p.name,
    team: p.team ?? '',
    eligiblePositions: eligible,
    stats: toEffectiveStats(p.stats ?? {}, fg[p.playerKey] ?? null, catSpecs.value, seasonFraction.value),
    roleValue: marketValueByKey.value.get(p.playerKey) ?? 0,
    status: p.status,
  }
}
const allNeedWeights = computed(() => {
  const w: Record<string, number> = {}
  for (const c of catSpecs.value) w[c.statId] = 1 // gate: any category an upgrade leads in counts
  return w
})
// How much your roster NEEDS each category: worse season rank = higher weight. This is
// what makes Season fit about YOUR roster shape (lead with your weak cats) rather than
// raw value gap (which just surfaces your scrubs vs the best available arms).
const needWeightByStat = computed(() => {
  const m = new Map<string, number>()
  for (const c of catSpecs.value) m.set(c.statId, 0.5)
  const n = profile.value?.numTeams ?? 0
  if (profile.value && n > 0) {
    for (const tc of profile.value.categories) m.set(tc.statId, Math.min(1, Math.max(0, tc.rank / n)))
  }
  return m
})
const sideByStat = computed(() => {
  const m = new Map<string, 'hit' | 'pit'>()
  for (const c of catSpecs.value) m.set(c.statId, c.side)
  return m
})
const rankByStat = computed(() => {
  const m = new Map<string, number>()
  for (const tc of profile.value?.categories ?? []) m.set(tc.statId, tc.rank)
  return m
})
const upgradeViews = computed(() => {
  if (!rosterPlayers.value.length || !players.value.length || !catSpecs.value.length || !marketValueByKey.value.size) return []
  const mine = rosterPlayers.value.map((p) => toEligibleFor(p, rosterFgStatsByKey.value))
  const wire = players.value.map((fa) => toEligibleFor(fa, faFgStatsByKey.value))
  const leaks = detectLeaks(mine, [], wire, catSpecs.value, allNeedWeights.value, { materiality: UPGRADE_MATERIALITY })
  const need = needWeightByStat.value
  return leaks
    .map((l) => {
      // Side-gate displayed cats to the upgrade's own side — no batter K on a hitter row.
      const upSide = sideOf(faByKey.value.get(l.better.key)?.position ?? '')
      const helpedIds = l.categories.filter((id) => (sideByStat.value.get(id) ?? upSide) === upSide)
      // The row leads with the single biggest need it addresses (the helped category you
      // rank worst in), so the ordering and the headline agree.
      let primaryId = ''
      let maxW = -1
      for (const id of helpedIds) {
        const w = need.get(id) ?? 0
        if (w > maxW) { maxW = w; primaryId = id }
      }
      return {
        position: l.position,
        yourName: l.starter.name,
        yourValue: Math.round(marketValueByKey.value.get(l.starter.key) ?? 0),
        upName: l.better.name,
        upValue: Math.round(marketValueByKey.value.get(l.better.key) ?? 0),
        gap: Math.round(l.gap),
        cats: helpedIds.map(labelFor),
        needLabel: primaryId ? labelFor(primaryId) : '',
        needRank: primaryId ? (rankByStat.value.get(primaryId) ?? 0) : 0,
      }
    })
    // Weakness gate: only show an upgrade if the category it leads with is one you're
    // GENUINELY weak in (worse than the league median). Without it the list surfaces
    // upgrades whose only "need" is a category you're already strong in (e.g. "W · 4th"),
    // which oversells them and re-introduces the This-week pitcher overlap.
    .filter((v) => v.needLabel !== '' && v.needRank > (profile.value?.numTeams ?? 0) / 2)
    // Lead with your biggest need (worst rank in a category this fills), gap as tiebreak.
    .sort((a, b) => b.needRank - a.needRank || b.gap - a.gap)
})

const oppName = computed(() => thisWeek.snapshot.value?.opponentName ?? '')
const topWeakness = computed(() => {
  if (!profile.value) return null
  const w = computeCategoryWeaknesses(profile.value, categories.value).slice().sort((a, b) => b.leverage - a.leverage)[0]
  if (!w) return null
  const cat = categories.value.find((c) => c.statId === w.statId)
  const teamCat = profile.value.categories.find((c) => c.statId === w.statId)
  return { label: cat?.label ?? w.statId, rank: teamCat?.rank ?? 0 }
})

// States
const ready = computed(() => playersLoaded.value && rosterLoaded.value && thisWeek.loaded.value)
const heroFaceFailed = ref(new Set<string>())
const noMatchup = computed(() => ready.value && (!thisWeek.snapshot.value || thisWeek.snapshot.value.completed))
const hasAny = computed(() => strongViews.value.length > 0 || smallerViews.value.length > 0)

// A settled attempt that produced no free agents means the Yahoo load failed (every
// real league has a free-agent pool). Distinguish that from "still loading" so the
// page shows an error instead of an endless spinner on a Yahoo 500 / rate-limit.
const settling = computed(() => !attempted.value || playersLoading.value || rosterLoading.value || thisWeek.loading.value)
const seasonSettling = computed(() => !attempted.value || playersLoading.value || rosterLoading.value)
const loadFailed = computed(
  () => supported.value && attempted.value && !playersLoading.value && !rosterLoading.value && !thisWeek.loading.value && players.value.length === 0,
)

const isLoading = computed(() => !unsupported.value && !loadFailed.value && settling.value && !hasAny.value)
const empty = computed(() => !loadFailed.value && ready.value && !noMatchup.value && !hasAny.value)

// Season-fit lens needs roster + FA pools (not the live matchup), so it works even
// when there's no active matchup.
const seasonReady = computed(() => playersLoaded.value && rosterLoaded.value && catSpecs.value.length > 0)
const seasonLoading = computed(() => !unsupported.value && !loadFailed.value && seasonSettling.value && upgradeViews.value.length === 0)
const seasonEmpty = computed(() => !loadFailed.value && seasonReady.value && upgradeViews.value.length === 0)

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-6 space-y-4">
    <header class="space-y-1">
      <h1 class="font-display text-2xl font-bold text-dark-text">Players</h1>
      <p class="font-mono text-xs text-dark-textMuted">
        <template v-if="lens === 'seasonFit'">Your roster vs the wire, by rest-of-season value</template>
        <template v-else>The wire, ranked by added chance to win this week<template v-if="oppName"> · vs {{ oppName }}</template></template>
      </p>
    </header>

    <!-- Lens: this-week tactical adds vs season-long roster-vs-wire comparison. -->
    <div v-if="!unsupported" class="flex items-center justify-between gap-2">
      <div class="flex overflow-hidden rounded-md border border-dark-border font-mono text-[10px] uppercase tracking-wider">
        <button type="button" class="px-2.5 py-1 transition-colors" :class="lens === 'thisWeek' ? 'bg-primary/15 text-primary' : 'text-dark-textMuted hover:text-dark-textSecondary'" @click="lens = 'thisWeek'">This week</button>
        <button type="button" class="px-2.5 py-1 transition-colors" :class="lens === 'seasonFit' ? 'bg-primary/15 text-primary' : 'text-dark-textMuted hover:text-dark-textSecondary'" @click="lens = 'seasonFit'">Season fit</button>
      </div>
    </div>

    <!-- This-week frame: points a season-hole chaser at the Season-fit lens. -->
    <p v-if="lens === 'thisWeek' && topWeakness" class="font-mono text-[11px] leading-relaxed text-dark-textMuted">
      Your best moves for <span class="text-dark-textSecondary">this week's matchup</span>. Chasing a season-long hole
      (you're {{ ordinal(topWeakness.rank) }} in <span class="text-dark-textSecondary">{{ topWeakness.label }}</span>)?
      Switch to the <button type="button" class="text-primary underline-offset-2 hover:underline" @click="lens = 'seasonFit'">Season fit</button> lens.
    </p>
    <p v-if="!unsupported && lens === 'thisWeek'" class="font-mono text-[10px] text-dark-textMuted">% = added chance to win this week · each add is netted against the drop</p>
    <p v-else-if="!unsupported" class="font-mono text-[10px] leading-relaxed text-dark-textMuted">
      Each row: a category you're weak in, and the best available upgrade · (n) = rest-of-season value, 0–100 · <span class="text-primary">+n</span> = value you'd gain
    </p>

    <!-- Shared: unsupported platform -->
    <p v-if="unsupported" class="rounded-xl border border-dark-border bg-dark-card px-4 py-3 text-sm text-dark-textMuted">
      The ranked wire is Yahoo category leagues only in this preview. ESPN support is coming.
    </p>

    <!-- Shared: the Yahoo load failed (e.g. a 500 / rate-limit) — never hang on the spinner. -->
    <div v-else-if="loadFailed" class="rounded-xl border border-dark-border bg-dark-card px-4 py-3">
      <p class="text-sm text-dark-text">Couldn't load your league from Yahoo just now.</p>
      <p class="mt-0.5 text-xs text-dark-textMuted">Yahoo returned an error (often a brief rate-limit). Try again in a moment.</p>
      <button type="button" class="mt-2 rounded-md border border-dark-border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-primary transition-colors hover:bg-primary/10" @click="runLoads">
        Retry
      </button>
    </div>

    <!-- ===== SEASON FIT: your roster vs the wire ===== -->
    <template v-else-if="lens === 'seasonFit'">
      <p v-if="seasonLoading" class="text-sm text-dark-textMuted">Valuing your roster against the wire…</p>
      <p v-else-if="seasonEmpty" class="rounded-xl border border-dark-border bg-dark-card px-4 py-3 text-sm text-dark-text">
        No clear waiver upgrades for the categories you're weak in right now. Your holes aren't fixable from the wire today.
      </p>
      <div v-else class="divide-y divide-dark-border/50 rounded-xl border border-dark-border bg-dark-card/40">
        <div v-for="u in upgradeViews" :key="u.position + u.upName" class="flex items-center gap-3 px-4 py-2.5">
          <!-- Lead with the need this fills: the category you're weakest in + your rank. -->
          <span class="w-12 shrink-0">
            <span class="block font-mono text-xs font-semibold uppercase text-[#F2B33A]">{{ u.needLabel }}</span>
            <span class="block font-mono text-[10px] text-dark-textMuted">{{ ordinal(u.needRank) }}</span>
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm">
              <span class="font-semibold text-dark-text">{{ u.upName }} <span class="font-mono text-[11px] text-dark-textMuted">({{ u.upValue }})</span></span>
              <span class="text-dark-textMuted"> over {{ u.yourName }} <span class="font-mono text-[11px]">({{ u.yourValue }})</span></span>
            </span>
            <span v-if="u.cats.length" class="mt-0.5 block font-mono text-[11px] text-primary">{{ u.cats.join(' ') }}</span>
          </span>
          <span class="shrink-0 text-right">
            <span class="block font-mono text-sm font-bold text-primary tabular-nums">+{{ u.gap }}</span>
            <span class="block font-mono text-[9px] uppercase tracking-wider text-dark-textMuted">value</span>
          </span>
        </div>
      </div>
    </template>

    <!-- ===== THIS WEEK: ranked tactical adds ===== -->
    <p v-else-if="isLoading" class="text-sm text-dark-textMuted">Ranking the wire for your matchup…</p>
    <p v-else-if="noMatchup" class="rounded-xl border border-dark-border bg-dark-card px-4 py-3 text-sm text-dark-textMuted">
      No live matchup this week, so there's nothing to rank against yet. Switch to the Season fit lens for roster-vs-wire value.
    </p>
    <p v-else-if="empty" class="rounded-xl border border-dark-border bg-dark-card px-4 py-3 text-sm text-dark-text">
      The wire's quiet — nothing available clearly moves your matchup this week. Stand pat.
    </p>

    <template v-else-if="hero">
      <!-- HERO (the only card) -->
      <div class="flex items-start gap-3 rounded-xl border border-primary/40 bg-primary/5 px-4 py-3">
        <img
          v-if="hero.headshot && !heroFaceFailed.has(hero.key)"
          :src="hero.headshot"
          :alt="hero.name"
          @error="heroFaceFailed.add(hero.key)"
          class="mt-0.5 h-10 w-10 shrink-0 rounded-full bg-dark-border object-cover"
        />
        <span v-else aria-hidden="true" class="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-dark-border font-display text-base font-bold text-dark-textSecondary">{{ hero.name.charAt(0) }}</span>
        <div class="min-w-0 flex-1">
          <div class="flex items-baseline justify-between gap-3">
            <span class="min-w-0 truncate font-display text-lg font-bold text-dark-text">
              {{ hero.name }}
              <span class="font-sans text-xs font-normal text-dark-textMuted">{{ hero.pos }} · {{ hero.team }}<template v-if="hero.drop"> · drop {{ hero.drop }}</template><span v-if="hero.dropWeakLink" class="text-dark-textMuted/70"> (weak link)</span></span>
            </span>
            <span class="shrink-0 font-mono text-lg font-bold text-primary tabular-nums">+{{ hero.lift }}%</span>
          </div>
          <div v-if="hero.flips.length" class="mt-1 flex flex-wrap items-center gap-1">
            <span class="font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">flips</span>
            <span v-for="c in hero.flips" :key="c" class="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-xs text-primary">{{ c }}</span>
          </div>
          <p class="mt-1.5 font-mono text-[11px] text-dark-textMuted">
            <span>ROS</span>
            <span v-for="s in hero.segs" :key="s.statId">{{ s.value }} {{ s.label }} <span class="text-dark-textMuted/40">· </span></span>
            <span class="text-dark-textMuted/60">{{ hero.matched ? 'FanGraphs' : 'projected' }}</span>
          </p>
        </div>
      </div>

      <!-- MEANINGFUL MOVES — de-carded list (hairline-separated, no per-row border) -->
      <div v-if="restStrong.length" class="divide-y divide-dark-border/50 rounded-xl border border-dark-border bg-dark-card/40">
        <div
          v-for="v in restStrong"
          :key="v.key"
          class="flex items-center gap-3 px-4 py-2.5"
        >
          <span class="w-11 shrink-0 font-mono text-sm font-bold text-primary tabular-nums">+{{ v.lift }}%</span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm">
              <span class="font-semibold text-dark-text">{{ v.name }}</span>
              <span class="font-mono text-[11px] text-dark-textMuted"> {{ v.pos }} · {{ v.team }}<template v-if="v.drop"> · drop {{ v.drop }}</template><span v-if="v.dropWeakLink" class="text-dark-textMuted/70"> (weak link)</span></span>
            </span>
            <span class="mt-0.5 block font-mono text-[11px]">
              <template v-for="(s, i) in v.segs" :key="s.statId"><span v-if="i > 0" class="text-dark-textMuted/40"> · </span><span :class="s.helped ? 'text-primary' : 'text-dark-textMuted'">{{ s.label }}</span>&nbsp;<span class="text-dark-textMuted">{{ s.value }}</span></template>
            </span>
          </span>
        </div>
      </div>

      <!-- SMALLER EDGES — tiered, dimmed -->
      <template v-if="smallerViews.length">
        <div class="flex items-center gap-2 pt-1">
          <span class="font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">Smaller edges</span>
          <span class="h-px flex-1 bg-dark-border/50"></span>
        </div>
        <div class="divide-y divide-dark-border/40 rounded-xl border border-dark-border/60 bg-dark-card/20 opacity-70">
          <div
            v-for="v in smallerViews"
            :key="v.key"
            class="flex items-center gap-3 px-4 py-2"
          >
            <span class="w-11 shrink-0 font-mono text-sm font-semibold text-primary/80 tabular-nums">+{{ v.lift }}%</span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm">
                <span class="font-semibold text-dark-text">{{ v.name }}</span>
                <span class="font-mono text-[11px] text-dark-textMuted"> {{ v.pos }} · {{ v.team }}<template v-if="v.drop"> · drop {{ v.drop }}</template></span>
              </span>
              <span class="mt-0.5 block font-mono text-[11px]">
                <template v-for="(s, i) in v.segs" :key="s.statId"><span v-if="i > 0" class="text-dark-textMuted/40"> · </span><span :class="s.helped ? 'text-primary' : 'text-dark-textMuted'">{{ s.label }}</span>&nbsp;<span class="text-dark-textMuted">{{ s.value }}</span></template>
              </span>
            </span>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>
