<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useFullSeasonCategoryData } from '@/composables/useFullSeasonCategoryData'
import { isYahooCategoryLeague as isYahooCategoryScoringType } from '@/composables/useIsCategoryLeague'
import { useMyRoster } from '@/composables/useMyRoster'
import { useEspnCategoryTeamData } from '@/composables/useEspnCategoryTeamData'
import { isLowerBetter } from '@/players/direction'
import { classifyCategory } from '@/myteam/categorySide'
import type { CatSpec } from '@/myteam/value'
import { useTradeTargets } from '@/composables/useTradeTargets'
import { usePositionalTargets } from '@/composables/usePositionalTargets'
import { buildEngine } from '@/trades/engine'
import { analyzeTrade } from '@/trades/analyzeTrade'
import { mlbTeamLogo } from '@/players/mlbTeamLogo'
import Avatar from '@/components/trades/Avatar.vue'
import ValueBadge from '@/components/trades/ValueBadge.vue'
import FitMeter from '@/components/trades/FitMeter.vue'
import TimingTag from '@/components/trades/TimingTag.vue'
import type { TeamTotals, Landscape } from '@/trades/landscape'

const SEASON_FRACTION = 0.6
const leagueStore = useLeagueStore()
const isEspn = computed(() => leagueStore.activePlatform === 'espn')

// Yahoo sources.
const { seasonMatchups, categoryLabels, loaded: yCatsLoaded, load: loadSeasonData } = useFullSeasonCategoryData()
const { players: yRosterPlayers, pool: yPool, fgByKey: yFg, statcastByKey: yStatcast, rosterSlots: yRosterSlots, loading: yRosterLoading, loaded: yRosterLoaded, load: loadRoster } = useMyRoster()
// ESPN source (self-detects H2H_CATEGORY).
const espn = useEspnCategoryTeamData()

const isYahooCategoryLeague = computed(() => {
  const id = leagueStore.activeLeagueId
  if (!id) return false
  if (isYahooCategoryScoringType(leagueStore.currentLeague?.scoring_type)) return true
  const saved = leagueStore.savedLeagues?.find((l: any) => l.league_id === id)
  if (saved?.platform && saved.platform !== 'yahoo') return false
  const st = saved?.scoring_type || ''
  if (st) return isYahooCategoryScoringType(st)
  return (leagueStore.yahooMatchups || []).some((m: any) => m?.is_category_league || m?.stat_winners?.length)
})
const supported = computed(() =>
  isEspn.value ? espn.supported.value === true : leagueStore.activePlatform === 'yahoo' && isYahooCategoryLeague.value,
)
const unsupported = computed(() =>
  leagueStore.activePlatform === 'sleeper' || (isEspn.value && espn.supported.value === false),
)

// Kick the loaders off PLATFORM (reliable) rather than the category predicate (which can
// lag and leave the page hung). The composables self-gate: ESPN detects H2H_CATEGORY, and
// a non-category Yahoo league never reaches this view (the wrapper blocks it). Tracks the
// league we've loaded so the immediate watch doesn't re-fetch the same league.
const attemptedFor = ref('')
watch(
  () => [leagueStore.activeLeagueId, leagueStore.activePlatform] as const,
  ([id, platform]) => {
    if (!id || !platform || attemptedFor.value === id) return
    attemptedFor.value = id
    if (platform === 'espn') espn.load()
    else if (platform === 'yahoo') {
      loadSeasonData(id)
      loadRoster()
    }
  },
  { immediate: true },
)
function retry() {
  attemptedFor.value = ''
  const id = leagueStore.activeLeagueId
  if (!id) return
  attemptedFor.value = id
  if (leagueStore.activePlatform === 'espn') espn.load()
  else {
    loadSeasonData(id)
    loadRoster()
  }
}

// === Unified, platform-neutral inputs into the trade engine ===
const pool = computed(() => (isEspn.value ? espn.pool.value : yPool.value))
const fgByKey = computed(() => (isEspn.value ? espn.fgByKey.value : yFg.value))
const statcastByKey = computed(() => (isEspn.value ? espn.statcastByKey.value : yStatcast.value))

const categories = computed<{ statId: string; label: string; name: string }[]>(() => {
  if (isEspn.value) return espn.categories.value.map((c) => ({ statId: c.statId, label: c.label, name: c.name }))
  const out: { statId: string; label: string; name: string }[] = []
  for (const [statId, meta] of categoryLabels.value) out.push({ statId, label: meta.label, name: meta.name })
  return out
})
const lowerBetterByStat = computed(() => {
  const m = new Map<string, boolean>()
  if (isEspn.value) for (const c of espn.cats.value) m.set(c.statId, c.lowerIsBetter)
  else for (const c of categories.value) m.set(c.statId, isLowerBetter(c.label || c.name || c.statId))
  return m
})
const catSpecs = computed<CatSpec[]>(() => {
  const findStatId = (names: string[]) => categories.value.find((c) => names.includes((c.label || c.name || '').toUpperCase().trim()))?.statId
  const ipStatId = findStatId(['IP', 'INNINGS PITCHED'])
  const abStatId = findStatId(['AB', 'AT BATS', 'PA', 'PLATE APPEARANCES'])
  return categories.value.map((c) => {
    const lowerIsBetter = lowerBetterByStat.value.get(c.statId) ?? isLowerBetter(c.label || c.name || c.statId)
    const { side, isRatio } = classifyCategory(c.label || c.name || c.statId, lowerIsBetter)
    return { statId: c.statId, lowerIsBetter, side, isRatio, volumeStatId: isRatio ? (side === 'pit' ? ipStatId : abStatId) : undefined }
  })
})
const labelOf = (statId: string) => categories.value.find((c) => c.statId === statId)?.label ?? statId

// Per-team category WIN counts — ESPN from standings (perCategoryWins), Yahoo from the
// season's matchup stat_winners. Both are direction-correct measures of category strength,
// keyed to match the roster pool's teamKey (`espn_<id>` / Yahoo team_key).
const teamCatWins = computed<TeamTotals[]>(() => {
  if (isEspn.value) {
    return espn.standings.value.map((s) => ({ teamId: s.team.teamId, totals: s.perCategoryWins ?? {} }))
  }
  const wins = new Map<string, Record<string, number>>()
  for (const m of seasonMatchups.value) {
    if (!m?.stat_winners?.length) continue
    const k1 = String(m.teams?.[0]?.team_key || m.teams?.[0]?.team_id || '')
    const k2 = String(m.teams?.[1]?.team_key || m.teams?.[1]?.team_id || '')
    if (!k1 || !k2) continue
    if (!wins.has(k1)) wins.set(k1, {})
    if (!wins.has(k2)) wins.set(k2, {})
    for (const sw of m.stat_winners) {
      if (sw.is_tied === true || sw.is_tied === '1') continue
      const statId = String(sw.stat_id)
      const w = String(sw.winner_team_key ?? '')
      if (w === k1) wins.get(k1)![statId] = (wins.get(k1)![statId] || 0) + 1
      else if (w === k2) wins.get(k2)![statId] = (wins.get(k2)![statId] || 0) + 1
    }
  }
  return [...wins.entries()].map(([teamId, totals]) => ({ teamId, totals }))
})

const myTeamKey = computed<string | null>(() => {
  if (isEspn.value) return espn.myTeamId.value
  const t = leagueStore.yahooTeams?.find((x: any) => x.is_my_team)
  return t ? String(t.team_key) : null
})
const teamNameByKey = computed(() => {
  const m = new Map<string, string>()
  if (isEspn.value) for (const s of espn.standings.value) m.set(s.team.teamId, s.team.name)
  else for (const t of leagueStore.yahooTeams ?? []) m.set(String(t.team_key), String(t.name))
  return m
})
const teamLogoByKey = computed(() => {
  const m = new Map<string, string>()
  if (isEspn.value) {
    for (const s of espn.standings.value) if (s.team.avatar) m.set(s.team.teamId, s.team.avatar)
  } else {
    for (const t of leagueStore.yahooTeams ?? []) {
      const logo = (t as any).logo_url || (t as any).logo
      if (logo) m.set(String(t.team_key), String(logo))
    }
  }
  return m
})

const { view } = useTradeTargets({ pool, fgByKey, statcastByKey, catSpecs, teamCatWins, myTeamKey, teamNameByKey, teamLogoByKey, seasonFraction: SEASON_FRACTION, labelOf })

// Trade DIMENSION: score deals by category fit or by roster-position fit.
type Dimension = 'categories' | 'position'
const dimension = ref<Dimension>('categories')

// --- Custom trade analyzer: evaluate a SPECIFIC deal you have in mind ---
const analyzerOpen = ref(false)
const anGive = ref<string[]>([])
const anPartner = ref<string | null>(null)
const anGet = ref<string[]>([])
// Built when the analyzer is open OR the positional dimension is active (it needs the engine's
// value/strength/landscape for the value meters + category guardrail).
const engine = computed(() =>
  (analyzerOpen.value || dimension.value === 'position')
    ? buildEngine({ pool: pool.value, fgByKey: fgByKey.value, statcastByKey: statcastByKey.value, cats: catSpecs.value, teamCatWins: teamCatWins.value, seasonFraction: SEASON_FRACTION, labelOf })
    : null,
)
// --- Positional dimension: win-win / reach / consolidate by roster slot ---
const rosterSlots = computed(() => (isEspn.value ? espn.rosterSlots.value : yRosterSlots.value))
const myRosterPlayers = computed(() => (isEspn.value ? espn.rosterPlayers.value : yRosterPlayers.value))
const myStatuses = computed(() => {
  const m = new Map<string, string>()
  for (const p of myRosterPlayers.value) m.set(p.playerKey, (p as { status?: string }).status ?? '')
  return m
})
const valueByKey = computed(() => engine.value?.valueByKey ?? new Map<string, number>())
const roleValueByKey = computed(() => engine.value?.roleValueByKey ?? new Map<string, number>())
const strengthByKey = computed(() => engine.value?.strengthByKey ?? new Map<string, Record<string, number>>())
const catLandscape = computed<Landscape>(() => engine.value?.landscape ?? new Map())
const statIdsRef = computed(() => catSpecs.value.map((c) => c.statId))
const { view: posView } = usePositionalTargets({
  pool, valueByKey, roleValueByKey, strengthByKey, slots: rosterSlots, myStatuses,
  catLandscape, statIds: statIdsRef, myTeamKey, teamNameByKey, teamLogoByKey, labelOf,
})
// Positional 1-for-1 list by intent (reach vs win-win). Consolidate has its own 2-for-1 list.
const posOneForOne = computed(() => (mode.value === 'reach' ? posView.value?.reach : posView.value?.winWin) ?? [])

const valOf = (key: string): number => Math.round(engine.value?.valueByKey.get(key) ?? 0)
const byVal = (a: { playerKey: string }, b: { playerKey: string }) => valOf(b.playerKey) - valOf(a.playerKey)
const myRoster = computed(() => pool.value.filter((p) => p.teamKey && p.teamKey === myTeamKey.value).sort(byVal))
const partnerOptions = computed(() => {
  const e = engine.value
  if (!e || !myTeamKey.value) return []
  return [...e.byTeam.keys()].filter((k) => k !== myTeamKey.value).map((k) => ({ key: k, name: teamNameByKey.value.get(k) ?? 'Team' }))
})
const partnerRoster = computed(() => (anPartner.value ? pool.value.filter((p) => p.teamKey === anPartner.value).sort(byVal) : []))
const analysis = computed(() => {
  const e = engine.value
  const mk = myTeamKey.value
  if (!e || !mk || !anPartner.value) return null
  return analyzeTrade(e, { myKey: mk, partnerKey: anPartner.value, giveKeys: anGive.value, getKeys: anGet.value, labelOf })
})
function pinfo(key: string) {
  const p = pool.value.find((x) => x.playerKey === key)
  const t = engine.value?.timingByKey.get(key)
  return { name: p?.name ?? '', pos: p?.position ?? '', headshot: p?.headshot, proLogo: mlbTeamLogo(p?.proTeam), value: valOf(key), timing: t?.dir ?? undefined, timingConfirmed: t?.luckConfirmed ?? false }
}
const toggleGive = (key: string) => { const i = anGive.value.indexOf(key); if (i >= 0) anGive.value.splice(i, 1); else anGive.value.push(key) }
const toggleGet = (key: string) => { const i = anGet.value.indexOf(key); if (i >= 0) anGet.value.splice(i, 1); else anGet.value.push(key) }
const verdictClass = computed(() => {
  switch (analysis.value?.klass) {
    case 'winWin': return 'text-primary'
    case 'leverage': return 'text-primary'
    case 'fleece': return 'text-[#F2B33A]'
    case 'badForYou': return 'text-[#f26d6d]'
    default: return 'text-dark-text'
  }
})
watch(anPartner, () => { anGet.value = [] })

const hasAttempted = computed(() => attemptedFor.value === leagueStore.activeLeagueId)
const rosterLoading = computed(() => (isEspn.value ? espn.loading.value : yRosterLoading.value))
const rosterLoaded = computed(() => (isEspn.value ? espn.loaded.value : yRosterLoaded.value))
const settling = computed(() => {
  if (!hasAttempted.value) return true
  if (isEspn.value) return espn.loading.value
  return yRosterLoading.value || !yCatsLoaded.value
})
// Settled but no rosters loaded = the platform fetch failed (every league has rosters).
// For ESPN treat "not explicitly a non-category league" as a failure so it shows retry
// rather than a misleading "no leverage".
const loadFailed = computed(
  () =>
    hasAttempted.value &&
    !rosterLoading.value &&
    pool.value.length === 0 &&
    (isEspn.value ? espn.supported.value !== false : supported.value),
)
// Settled, supported, rosters loaded, but we couldn't identify your team in the league.
const noTeam = computed(() => !settling.value && !loadFailed.value && supported.value && pool.value.length > 0 && !myTeamKey.value)
const isLoading = computed(() => !unsupported.value && !loadFailed.value && settling.value && !view.value)
const empty = computed(() => !loadFailed.value && !noTeam.value && rosterLoaded.value && !view.value)

// Trade intent modes.
type Mode = 'winWin' | 'reach' | 'consolidate' | 'timing'
const mode = ref<Mode>('winWin')
const MODES: { key: Mode; label: string; blurb: string }[] = [
  { key: 'winWin', label: 'Win-win', blurb: 'Both teams improve — the deals most likely to be accepted.' },
  { key: 'reach', label: 'Make them reach', blurb: 'Lopsided in your favor — the overpay to press from a team chasing a hole.' },
  { key: 'consolidate', label: 'Consolidate', blurb: 'Package two depth pieces for one stud (2-for-1) — quality over quantity.' },
  { key: 'timing', label: 'Buy-low / Sell-high', blurb: 'Time the market — get an underperformer due to rebound, give an overperformer due to cool off (expected stats confirm).' },
]
const modeBlurb = computed(() => MODES.find((m) => m.key === mode.value)?.blurb ?? '')
// 1-for-1 list by mode; consolidate list (timing has its own 2-for-1 packages).
const oneForOneList = computed(() => {
  const v = view.value
  if (!v) return []
  return mode.value === 'reach' ? v.reach : mode.value === 'timing' ? v.timing : v.winWin
})
const consolidateList = computed(() => (mode.value === 'timing' ? view.value?.timingConsolidate : view.value?.consolidate) ?? [])
// Partner framing names the direction that matters for the active mode (it goes both ways).
const partnerBlurb = computed(() => {
  switch (mode.value) {
    case 'reach': return 'Teams desperate in a category you dominate — press the overpay.'
    case 'consolidate': return "Teams who'd take your depth for a stud you need."
    case 'timing': return 'Where your sell-highs meet their needs, and their buy-lows meet yours.'
    default: return 'It goes both ways — they hold what you need, you hold what they need.'
  }
})

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
// The MLB pro-team logo is decorative — hide it on a broken load rather than fall back.
function onLogoError(e: Event) {
  ;(e.target as HTMLImageElement).style.display = 'none'
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-6 space-y-5">
    <header class="space-y-1">
      <h1 class="font-display text-2xl font-bold text-dark-text">Trades</h1>
      <p class="font-mono text-xs text-dark-textMuted">The league, and who to trade for — by rest-of-season value</p>
    </header>

    <p v-if="unsupported" class="rounded-xl border border-dark-border bg-dark-card px-4 py-3 text-sm text-dark-textMuted">
      Trade targets need a head-to-head category league (Yahoo or ESPN). This league isn't one.
    </p>
    <div v-else-if="loadFailed" class="rounded-xl border border-dark-border bg-dark-card px-4 py-3">
      <p class="text-sm text-dark-text">Couldn't load the league rosters from Yahoo just now.</p>
      <p class="mt-0.5 text-xs text-dark-textMuted">Often a brief rate-limit. Try again in a moment.</p>
      <button type="button" class="mt-2 rounded-md border border-dark-border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-primary hover:bg-primary/10" @click="retry">Retry</button>
    </div>
    <p v-else-if="isLoading" class="text-sm text-dark-textMuted">Reading every roster in your league…</p>
    <p v-else-if="noTeam" class="rounded-xl border border-dark-border bg-dark-card px-4 py-3 text-sm text-dark-textMuted">
      Couldn't identify your team in this league. Reconnect the platform under settings and try again.
    </p>
    <p v-else-if="empty" class="rounded-xl border border-dark-border bg-dark-card px-4 py-3 text-sm text-dark-text">
      No clear trade leverage right now — no partner's surplus lines up with your holes at a believable value.
    </p>

    <template v-if="view && !unsupported && !loadFailed && !isLoading">
      <!-- YOUR LEVERAGE -->
      <section class="rounded-xl border border-dark-border bg-dark-card/40 px-4 py-3">
        <p class="font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">Your leverage</p>
        <div class="mt-2 space-y-1.5 font-mono text-xs">
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="w-16 text-dark-textMuted/70">Trade from</span>
            <span v-for="c in view.tradeFrom" :key="c.label" class="rounded bg-primary/10 px-1.5 py-0.5 text-primary">{{ c.label }} · {{ ordinal(c.rank) }}</span>
            <span v-if="!view.tradeFrom.length" class="text-dark-textMuted">no dominant surplus</span>
          </div>
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="w-16 text-dark-textMuted/70">To fix</span>
            <span v-for="c in view.toFix" :key="c.label" class="rounded bg-[#F2B33A]/10 px-1.5 py-0.5 text-[#F2B33A]">{{ c.label }} · {{ ordinal(c.rank) }}</span>
            <span v-if="!view.toFix.length" class="text-dark-textMuted">no glaring holes</span>
          </div>
        </div>
        <p v-if="view.tradeFrom.length && view.toFix.length" class="mt-2 font-mono text-[11px] text-dark-textMuted">
          ↳ Spend your surplus (dead value — winning a category by a mile scores nothing extra) to plug your holes.
        </p>
      </section>

      <!-- CUSTOM TRADE ANALYZER -->
      <section class="overflow-hidden rounded-xl border border-dark-border bg-dark-card/40">
        <button type="button" class="flex w-full items-center justify-between px-4 py-2.5 text-left" @click="analyzerOpen = !analyzerOpen">
          <span class="font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">Analyze a specific trade</span>
          <span class="font-mono text-xs text-dark-textMuted">{{ analyzerOpen ? '–' : '+' }}</span>
        </button>
        <div v-if="analyzerOpen" class="space-y-3 border-t border-dark-border/60 px-4 py-3">
          <!-- You give -->
          <div>
            <div class="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">You give</div>
            <div class="flex flex-wrap gap-1.5">
              <button v-for="p in myRoster" :key="p.playerKey" type="button" @click="toggleGive(p.playerKey)"
                class="rounded border px-2 py-1 font-mono text-[11px] transition-colors"
                :class="anGive.includes(p.playerKey) ? 'border-primary/40 bg-primary/15 text-primary' : 'border-dark-border text-dark-textMuted hover:text-dark-text'">
                {{ p.name }} <span class="opacity-50">{{ valOf(p.playerKey) }}</span>
              </button>
            </div>
          </div>
          <!-- Partner -->
          <div>
            <div class="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">Partner</div>
            <select v-model="anPartner" class="w-full max-w-xs rounded border border-dark-border bg-dark-bg px-2 py-1.5 font-mono text-xs text-dark-text focus:border-primary focus:outline-none">
              <option :value="null">Select a team…</option>
              <option v-for="o in partnerOptions" :key="o.key" :value="o.key">{{ o.name }}</option>
            </select>
          </div>
          <!-- You get -->
          <div v-if="anPartner">
            <div class="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">You get</div>
            <div class="flex flex-wrap gap-1.5">
              <button v-for="p in partnerRoster" :key="p.playerKey" type="button" @click="toggleGet(p.playerKey)"
                class="rounded border px-2 py-1 font-mono text-[11px] transition-colors"
                :class="anGet.includes(p.playerKey) ? 'border-primary/40 bg-primary/15 text-primary' : 'border-dark-border text-dark-textMuted hover:text-dark-text'">
                {{ p.name }} <span class="opacity-50">{{ valOf(p.playerKey) }}</span>
              </button>
            </div>
          </div>
          <!-- Verdict -->
          <div v-if="analysis" class="overflow-hidden rounded-lg border border-dark-border bg-dark-card">
            <div class="flex items-center justify-between gap-2 border-b border-dark-border/60 px-4 py-2">
              <span class="text-sm font-semibold" :class="verdictClass">{{ analysis.headline }}</span>
              <span class="shrink-0 font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">they accept · {{ analysis.accept }}</span>
            </div>
            <div class="flex items-center gap-2 px-4 pt-2.5">
              <span class="w-9 shrink-0 font-mono text-[10px] font-bold tracking-wider text-primary">GET</span>
              <span class="font-mono text-[11px] text-dark-textMuted">{{ analysis.getVal }}</span>
            </div>
            <div v-for="k in anGet" :key="k" class="flex items-center gap-2 px-4 pt-1">
              <span class="w-9 shrink-0"></span>
              <Avatar :src="pinfo(k).headshot" :label="pinfo(k).name" cls="h-6 w-6 rounded-full" />
              <span class="text-sm font-semibold text-dark-text">{{ pinfo(k).name }}</span>
              <img v-if="pinfo(k).proLogo" :src="pinfo(k).proLogo" alt="" @error="onLogoError" class="h-3.5 w-3.5 shrink-0 object-contain" />
              <span class="font-mono text-[11px] text-dark-textMuted">{{ pinfo(k).pos }}</span>
              <ValueBadge :value="pinfo(k).value" />
              <TimingTag v-if="pinfo(k).timing === 'sell'" dir="sell" :confirmed="pinfo(k).timingConfirmed" />
            </div>
            <div class="mt-1.5 flex items-center gap-2 px-4 pt-1.5">
              <span class="w-9 shrink-0 font-mono text-[10px] font-bold tracking-wider text-dark-textMuted">GIVE</span>
              <span class="font-mono text-[11px] text-dark-textMuted">{{ analysis.giveVal }}</span>
            </div>
            <div v-for="k in anGive" :key="k" class="flex items-center gap-2 px-4 pb-1 pt-1">
              <span class="w-9 shrink-0"></span>
              <Avatar :src="pinfo(k).headshot" :label="pinfo(k).name" cls="h-6 w-6 rounded-full" />
              <span class="text-sm font-semibold text-dark-textSecondary">{{ pinfo(k).name }}</span>
              <img v-if="pinfo(k).proLogo" :src="pinfo(k).proLogo" alt="" @error="onLogoError" class="h-3.5 w-3.5 shrink-0 object-contain" />
              <span class="font-mono text-[11px] text-dark-textMuted">{{ pinfo(k).pos }}</span>
              <ValueBadge :value="pinfo(k).value" />
              <TimingTag v-if="pinfo(k).timing === 'buy'" dir="buy" :confirmed="pinfo(k).timingConfirmed" />
            </div>
            <div class="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-0.5 border-t border-dark-border/40 px-4 py-1.5 font-mono text-[10px] text-dark-textMuted">
              <span v-if="analysis.helps.length">nets you <span class="text-primary">{{ analysis.helps.join(' · ') }}</span></span>
              <span v-if="analysis.costs.length">costs you <span class="text-[#f26d6d]">{{ analysis.costs.join(' · ') }}</span></span>
              <span v-if="analysis.pitch.length">gives them <span class="text-[#F2B33A]">{{ analysis.pitch.join(' · ') }}</span></span>
            </div>
            <div v-if="analysis.warnings.length" class="space-y-0.5 px-4 pb-2 pt-0.5">
              <p v-for="(w, wi) in analysis.warnings" :key="wi" class="font-mono text-[10px] text-[#F2B33A]">⚠ {{ w }}</p>
            </div>
          </div>
          <p v-else class="font-mono text-[10px] text-dark-textMuted">Pick a partner and at least one player on each side.</p>
        </div>
      </section>

      <!-- DIMENSION TOGGLE: score by category fit or by roster-position fit -->
      <div class="flex items-center gap-2">
        <span class="font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">By</span>
        <div class="flex w-max overflow-hidden rounded-md border border-dark-border font-mono text-[10px] uppercase tracking-wider">
          <button
            v-for="d in (['categories', 'position'] as const)"
            :key="d"
            type="button"
            class="px-3 py-1 transition-colors"
            :class="dimension === d ? 'bg-primary/15 text-primary' : 'text-dark-textMuted hover:text-dark-textSecondary'"
            @click="dimension = d"
          >{{ d === 'categories' ? 'Categories' : 'Position' }}</button>
        </div>
      </div>

      <!-- MODE TOGGLE: trade intent -->
      <div class="space-y-2">
        <div class="flex w-max overflow-hidden rounded-md border border-dark-border font-mono text-[10px] uppercase tracking-wider">
          <button
            v-for="m in MODES"
            :key="m.key"
            type="button"
            class="px-3 py-1 transition-colors"
            :class="mode === m.key ? 'bg-primary/15 text-primary' : 'text-dark-textMuted hover:text-dark-textSecondary'"
            @click="mode = m.key"
          >{{ m.label }}</button>
        </div>
        <p class="font-mono text-[10px] text-dark-textMuted">{{ modeBlurb }}</p>
        <p class="flex items-center gap-1.5 font-mono text-[10px] text-dark-textMuted/70">
          <ValueBadge :value="82" />
          <span>value 0–100 · higher = better · rest-of-season, all rostered players</span>
        </p>
      </div>

      <!-- 1-FOR-1 MODES: win-win + make them reach -->
      <section v-if="dimension === 'categories' && mode !== 'consolidate'" class="space-y-3">
        <p v-if="!oneForOneList.length" class="rounded-xl border border-dark-border bg-dark-card px-4 py-3 text-sm text-dark-textMuted">
          <template v-if="mode === 'winWin'">No clean mutual deals right now — try Make them reach or Consolidate.</template>
          <template v-else-if="mode === 'timing'">No buy-low / sell-high 1-for-1s right now — check the 2-for-1 packages below.</template>
          <template v-else>No leverage right now — no partner is desperate in a category you dominate.</template>
        </p>
        <div v-for="(t, i) in oneForOneList" :key="i" class="overflow-hidden rounded-xl border border-dark-border bg-dark-card">
          <div class="flex items-center justify-between gap-2 border-b border-dark-border/60 bg-[#F2B33A]/[0.04] px-4 py-2">
            <span v-if="mode === 'reach'" class="font-mono text-[11px] uppercase tracking-wide text-[#F2B33A]">Press <b class="text-[#ffd98a]">{{ t.fix.label }}</b> · they're {{ ordinal(t.fix.rank) }}</span>
            <span v-else class="font-mono text-[11px] uppercase tracking-wide text-[#F2B33A]">{{ t.fix.hole === false ? 'Improves' : 'Fixes' }} <b class="text-[#ffd98a]">{{ t.fix.label }}</b> · you're {{ ordinal(t.fix.rank) }}</span>
            <span class="font-mono text-[10px] uppercase tracking-wider" :class="t.klass === 'leverage' ? 'text-primary' : 'text-dark-textMuted'">{{ t.klass === 'leverage' ? 'leverage' : 'win-win' }}</span>
          </div>
          <div class="flex items-center gap-2 px-4 pt-2.5">
            <span class="w-9 shrink-0 font-mono text-[10px] font-bold tracking-wider text-primary">GET</span>
            <Avatar :src="t.get.headshot" :label="t.get.name" cls="h-7 w-7 rounded-full" />
            <span class="font-display text-[15px] font-bold text-dark-text">{{ t.get.name }}</span>
            <img v-if="t.get.proLogo" :src="t.get.proLogo" alt="" @error="onLogoError" class="h-4 w-4 shrink-0 object-contain" />
            <span class="font-mono text-[11px] text-dark-textMuted">{{ t.get.pos }}</span>
            <ValueBadge :value="t.get.value" />
            <TimingTag v-if="mode === 'timing' && t.get.timing" :dir="t.get.timing" :confirmed="t.get.timingConfirmed" />
            <span class="ml-auto flex items-center gap-1.5 font-mono text-[11px] text-dark-textMuted">from <Avatar :src="t.fromTeamLogo" :label="t.fromTeam" cls="h-4 w-4 rounded" /> {{ t.fromTeam }}</span>
          </div>
          <div class="flex items-center gap-2 px-4 pb-3 pt-1.5">
            <span class="w-9 shrink-0 font-mono text-[10px] font-bold tracking-wider text-dark-textMuted">GIVE</span>
            <Avatar :src="t.give.headshot" :label="t.give.name" cls="h-6 w-6 rounded-full" />
            <span class="text-sm font-semibold text-dark-textSecondary">{{ t.give.name }}</span>
            <img v-if="t.give.proLogo" :src="t.give.proLogo" alt="" @error="onLogoError" class="h-3.5 w-3.5 shrink-0 object-contain" />
            <span class="font-mono text-[11px] text-dark-textMuted">{{ t.give.pos }}</span>
            <ValueBadge :value="t.give.value" />
            <TimingTag v-if="mode === 'timing' && t.give.timing" :dir="t.give.timing" :confirmed="t.give.timingConfirmed" />
          </div>
          <div v-if="t.helps.length || t.pitch.length" class="flex flex-wrap items-center gap-x-4 gap-y-0.5 border-t border-dark-border/40 px-4 py-1.5 font-mono text-[10px] text-dark-textMuted">
            <span v-if="t.helps.length">nets you <span class="text-primary">{{ t.helps.join(' · ') }}</span></span>
            <span v-if="t.pitch.length">gives them <span class="text-[#F2B33A]">{{ t.pitch.join(' · ') }}</span></span>
          </div>
        </div>
      </section>

      <!-- CONSOLIDATE / TIMING 2-for-1 -->
      <section v-if="dimension === 'categories' && (mode === 'consolidate' || mode === 'timing')" class="space-y-3">
        <p v-if="mode === 'timing' && consolidateList.length" class="pt-1 font-mono text-[10px] uppercase tracking-wider text-dark-textMuted/70">2-for-1 packages</p>
        <p v-if="mode === 'consolidate' && !consolidateList.length" class="rounded-xl border border-dark-border bg-dark-card px-4 py-3 text-sm text-dark-textMuted">
          No 2-for-1 upgrade available — no partner has a stud your depth can package for at a believable value.
        </p>
        <div v-for="(t, i) in consolidateList" :key="i" class="overflow-hidden rounded-xl border border-dark-border bg-dark-card">
          <div class="flex items-center justify-between gap-2 border-b border-dark-border/60 bg-[#F2B33A]/[0.04] px-4 py-2">
            <span class="font-mono text-[11px] uppercase tracking-wide text-[#F2B33A]">{{ t.fix.hole === false ? 'Improves' : 'Fixes' }} <b class="text-[#ffd98a]">{{ t.fix.label }}</b> · you're {{ ordinal(t.fix.rank) }}</span>
            <span class="font-mono text-[10px] uppercase tracking-wider" :class="t.klass === 'leverage' ? 'text-primary' : 'text-dark-textMuted'">{{ t.klass === 'leverage' ? 'leverage' : 'win-win' }}</span>
          </div>
          <div class="flex items-center gap-2 px-4 pt-2.5">
            <span class="w-9 shrink-0 font-mono text-[10px] font-bold tracking-wider text-primary">GET</span>
            <Avatar :src="t.get.headshot" :label="t.get.name" cls="h-7 w-7 rounded-full" />
            <span class="font-display text-[15px] font-bold text-dark-text">{{ t.get.name }}</span>
            <img v-if="t.get.proLogo" :src="t.get.proLogo" alt="" @error="onLogoError" class="h-4 w-4 shrink-0 object-contain" />
            <span class="font-mono text-[11px] text-dark-textMuted">{{ t.get.pos }}</span>
            <ValueBadge :value="t.get.value" />
            <TimingTag v-if="mode === 'timing' && t.get.timing" :dir="t.get.timing" :confirmed="t.get.timingConfirmed" />
            <span class="ml-auto flex items-center gap-1.5 font-mono text-[11px] text-dark-textMuted">from <Avatar :src="t.fromTeamLogo" :label="t.fromTeam" cls="h-4 w-4 rounded" /> {{ t.fromTeam }}</span>
          </div>
          <div class="space-y-1 px-4 pb-3 pt-1.5">
            <div v-for="(g, gi) in t.give" :key="gi" class="flex items-center gap-2">
              <span class="w-9 shrink-0 font-mono text-[10px] font-bold tracking-wider text-dark-textMuted">{{ gi === 0 ? 'GIVE' : '' }}</span>
              <Avatar :src="g.headshot" :label="g.name" cls="h-6 w-6 rounded-full" />
              <span class="text-sm font-semibold text-dark-textSecondary">{{ g.name }}</span>
              <img v-if="g.proLogo" :src="g.proLogo" alt="" @error="onLogoError" class="h-3.5 w-3.5 shrink-0 object-contain" />
              <span class="font-mono text-[11px] text-dark-textMuted">{{ g.pos }}</span>
              <ValueBadge :value="g.value" />
              <TimingTag v-if="mode === 'timing' && g.timing" :dir="g.timing" :confirmed="g.timingConfirmed" />
            </div>
          </div>
          <div v-if="t.helps.length || t.pitch.length" class="flex flex-wrap items-center gap-x-4 gap-y-0.5 border-t border-dark-border/40 px-4 py-1.5 font-mono text-[10px] text-dark-textMuted">
            <span v-if="t.helps.length">nets you <span class="text-primary">{{ t.helps.join(' · ') }}</span></span>
            <span v-if="t.pitch.length">gives them <span class="text-[#F2B33A]">{{ t.pitch.join(' · ') }}</span></span>
          </div>
        </div>
      </section>

      <!-- POSITIONAL DIMENSION: deals by roster slot -->
      <template v-if="dimension === 'position'">
        <p v-if="posView && (posView.myDeep.length || posView.myThin.length)" class="font-mono text-[11px] text-dark-textMuted">
          <span v-if="posView.myDeep.length">Deep at <b class="text-primary">{{ posView.myDeep.join(', ') }}</b></span>
          <span v-if="posView.myThin.length"><span v-if="posView.myDeep.length"> · </span>Thin at <b class="text-[#F2B33A]">{{ posView.myThin.join(', ') }}</b></span>
        </p>

        <!-- timing has no positional analogue -->
        <p v-if="mode === 'timing'" class="rounded-xl border border-dark-border bg-dark-card px-4 py-3 text-sm text-dark-textMuted">
          Buy-low / sell-high is a market-timing signal — switch to <b class="text-dark-textSecondary">Categories</b> for it.
        </p>

        <!-- 1-for-1: reach + win-win -->
        <section v-else-if="mode === 'reach' || mode === 'winWin'" class="space-y-3">
          <p v-if="!posOneForOne.length" class="rounded-xl border border-dark-border bg-dark-card px-4 py-3 text-sm text-dark-textMuted">
            <template v-if="mode === 'winWin'">No mutual positional fit right now — try Make them reach or Consolidate.</template>
            <template v-else>No positional reach right now — no team is thin where you're deep.</template>
          </p>
          <div v-for="(t, i) in posOneForOne" :key="i" class="overflow-hidden rounded-xl border border-dark-border bg-dark-card">
            <div class="flex items-center justify-between gap-2 border-b border-dark-border/60 bg-[#F2B33A]/[0.04] px-4 py-2">
              <span class="font-mono text-[11px] uppercase tracking-wide text-[#F2B33A]">
                <template v-if="mode === 'reach'">they're thin at <b class="text-[#ffd98a]">{{ t.position }}</b></template>
                <template v-else>Fills <b class="text-[#ffd98a]">{{ t.position }}</b><span v-if="t.tier" class="text-dark-textMuted"> · {{ t.tier === 'both' ? 'fits both' : 'fits one' }}</span></template>
              </span>
              <FitMeter :you="t.fit.you" :them="t.fit.them" />
            </div>
            <div class="flex items-center gap-2 px-4 pt-2.5">
              <span class="w-9 shrink-0 font-mono text-[10px] font-bold tracking-wider text-primary">GET</span>
              <Avatar :src="t.get.headshot" :label="t.get.name" cls="h-7 w-7 rounded-full" />
              <span class="font-display text-[15px] font-bold text-dark-text">{{ t.get.name }}</span>
              <img v-if="t.get.proLogo" :src="t.get.proLogo" alt="" @error="onLogoError" class="h-4 w-4 shrink-0 object-contain" />
              <span class="font-mono text-[11px] text-dark-textMuted">{{ t.get.pos }}</span>
              <ValueBadge :value="t.get.value" />
              <span class="ml-auto flex items-center gap-1.5 font-mono text-[11px] text-dark-textMuted">from <Avatar :src="t.fromTeamLogo" :label="t.fromTeam" cls="h-4 w-4 rounded" /> {{ t.fromTeam }}</span>
            </div>
            <div class="flex items-center gap-2 px-4 pb-3 pt-1.5">
              <span class="w-9 shrink-0 font-mono text-[10px] font-bold tracking-wider text-dark-textMuted">GIVE</span>
              <Avatar :src="t.give.headshot" :label="t.give.name" cls="h-6 w-6 rounded-full" />
              <span class="text-sm font-semibold text-dark-textSecondary">{{ t.give.name }}</span>
              <img v-if="t.give.proLogo" :src="t.give.proLogo" alt="" @error="onLogoError" class="h-3.5 w-3.5 shrink-0 object-contain" />
              <span class="font-mono text-[11px] text-dark-textMuted">{{ t.give.pos }}</span>
              <ValueBadge :value="t.give.value" />
            </div>
            <div v-if="t.secondaryHelps.length" class="border-t border-dark-border/40 px-4 py-1.5 font-mono text-[10px] text-dark-textMuted">
              also helps <span class="text-primary">{{ t.secondaryHelps.join(' · ') }}</span>
            </div>
          </div>
        </section>

        <!-- consolidate 2-for-1 -->
        <section v-else class="space-y-3">
          <p v-if="!(posView && posView.consolidate.length)" class="rounded-xl border border-dark-border bg-dark-card px-4 py-3 text-sm text-dark-textMuted">
            No 2-for-1 positional upgrade — no team has a stud at your thin slot your depth can package for.
          </p>
          <div v-for="(t, i) in (posView?.consolidate ?? [])" :key="i" class="overflow-hidden rounded-xl border border-dark-border bg-dark-card">
            <div class="flex items-center justify-between gap-2 border-b border-dark-border/60 bg-[#F2B33A]/[0.04] px-4 py-2">
              <span class="font-mono text-[11px] uppercase tracking-wide text-[#F2B33A]">Fills <b class="text-[#ffd98a]">{{ t.position }}</b> <span class="text-dark-textMuted">· 2-for-1</span></span>
              <FitMeter :you="t.fit.you" :them="t.fit.them" />
            </div>
            <div class="flex items-center gap-2 px-4 pt-2.5">
              <span class="w-9 shrink-0 font-mono text-[10px] font-bold tracking-wider text-primary">GET</span>
              <Avatar :src="t.get.headshot" :label="t.get.name" cls="h-7 w-7 rounded-full" />
              <span class="font-display text-[15px] font-bold text-dark-text">{{ t.get.name }}</span>
              <img v-if="t.get.proLogo" :src="t.get.proLogo" alt="" @error="onLogoError" class="h-4 w-4 shrink-0 object-contain" />
              <span class="font-mono text-[11px] text-dark-textMuted">{{ t.get.pos }}</span>
              <ValueBadge :value="t.get.value" />
              <span class="ml-auto flex items-center gap-1.5 font-mono text-[11px] text-dark-textMuted">from <Avatar :src="t.fromTeamLogo" :label="t.fromTeam" cls="h-4 w-4 rounded" /> {{ t.fromTeam }}</span>
            </div>
            <div class="space-y-1 px-4 pb-3 pt-1.5">
              <div v-for="(g, gi) in t.give" :key="gi" class="flex items-center gap-2">
                <span class="w-9 shrink-0 font-mono text-[10px] font-bold tracking-wider text-dark-textMuted">{{ gi === 0 ? 'GIVE' : '' }}</span>
                <Avatar :src="g.headshot" :label="g.name" cls="h-6 w-6 rounded-full" />
                <span class="text-sm font-semibold text-dark-textSecondary">{{ g.name }}</span>
                <img v-if="g.proLogo" :src="g.proLogo" alt="" @error="onLogoError" class="h-3.5 w-3.5 shrink-0 object-contain" />
                <span class="font-mono text-[11px] text-dark-textMuted">{{ g.pos }}</span>
                <ValueBadge :value="g.value" />
              </div>
            </div>
            <div v-if="t.secondaryHelps.length" class="border-t border-dark-border/40 px-4 py-1.5 font-mono text-[10px] text-dark-textMuted">
              also helps <span class="text-primary">{{ t.secondaryHelps.join(' · ') }}</span>
            </div>
          </div>
        </section>
      </template>

      <!-- BEST PARTNERS -->
      <section v-if="view.partners.length" class="space-y-2">
        <div class="flex items-center gap-2">
          <span class="font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">Best trade partners</span>
          <span class="h-px flex-1 bg-dark-border/50"></span>
        </div>
        <p class="font-mono text-[10px] text-dark-textMuted">{{ partnerBlurb }}</p>
        <div class="divide-y divide-dark-border/50 rounded-xl border border-dark-border bg-dark-card/40">
          <div v-for="p in view.partners" :key="p.team" class="flex items-center gap-2.5 px-4 py-2.5">
            <Avatar :src="p.logo" :label="p.team" cls="h-6 w-6 rounded-md" />
            <span class="w-40 shrink-0 truncate text-sm font-semibold text-dark-text">{{ p.team }}</span>
            <span class="min-w-0 flex-1 font-mono text-[11px] text-dark-textMuted">
              <span v-if="p.buyFrom.length"><span class="text-dark-textMuted/60">you buy</span> <span class="text-primary">{{ p.buyFrom.join(' ') }}</span></span>
              <span v-if="p.sellTo.length" class="ml-3"><span class="text-dark-textMuted/60">they need</span> <span class="text-[#F2B33A]">{{ p.sellTo.join(' ') }}</span></span>
              <span v-if="!p.buyFrom.length && !p.sellTo.length"><span class="text-dark-textMuted/60">strong</span> <span class="text-primary">{{ p.strong.join(' ') }}</span></span>
            </span>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
