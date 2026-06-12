<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useFullSeasonCategoryData } from '@/composables/useFullSeasonCategoryData'
import { isYahooCategoryLeague as isYahooCategoryScoringType } from '@/composables/useIsCategoryLeague'
import { useMyRoster } from '@/composables/useMyRoster'
import { isLowerBetter } from '@/players/direction'
import { classifyCategory } from '@/myteam/categorySide'
import type { CatSpec } from '@/myteam/value'
import { useTradeTargets } from '@/composables/useTradeTargets'

import type { TeamTotals } from '@/trades/landscape'

const SEASON_FRACTION = 0.6
const leagueStore = useLeagueStore()
const { seasonMatchups, categoryLabels, loaded: catsLoaded, load: loadSeasonData } = useFullSeasonCategoryData()
const { pool, fgByKey, loading: rosterLoading, loaded: rosterLoaded, load: loadRoster } = useMyRoster()

const supported = computed(() => leagueStore.activePlatform === 'yahoo' && isYahooCategoryLeague.value)
const unsupported = computed(() => leagueStore.activePlatform === 'espn' || leagueStore.activePlatform === 'sleeper')
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

const attempted = ref(false)
function runLoads() {
  if (!supported.value) return
  const id = leagueStore.activeLeagueId
  if (id) loadSeasonData(id)
  loadRoster()
  attempted.value = true
}
onMounted(runLoads)
watch(() => leagueStore.activeLeagueId, () => { attempted.value = false; runLoads() })
watch(supported, (s) => { if (s && !attempted.value) runLoads() })

// League scoring categories straight from settings (statId + label).
const categories = computed(() => {
  const out: { statId: string; label: string; name: string }[] = []
  for (const [statId, meta] of categoryLabels.value) out.push({ statId, label: meta.label, name: meta.name })
  return out
})
const catSpecs = computed<CatSpec[]>(() => {
  const findStatId = (names: string[]) => categories.value.find((c) => names.includes((c.label || c.name || '').toUpperCase().trim()))?.statId
  const ipStatId = findStatId(['IP', 'INNINGS PITCHED'])
  const abStatId = findStatId(['AB', 'AT BATS', 'PA', 'PLATE APPEARANCES'])
  return categories.value.map((c) => {
    const lowerIsBetter = isLowerBetter(c.label || c.name || c.statId)
    const { side, isRatio } = classifyCategory(c.label || c.name || c.statId, lowerIsBetter)
    return { statId: c.statId, lowerIsBetter, side, isRatio, volumeStatId: isRatio ? (side === 'pit' ? ipStatId : abStatId) : undefined }
  })
})
const labelOf = (statId: string) => categories.value.find((c) => c.statId === statId)?.label ?? statId

// Per-team category WIN counts from the season's matchup stat_winners — the reliable,
// direction-correct measure of each team's category strength (same source as My Team's
// ranks). Keyed by team_key to match the roster pool's fantasy_team_key.
const teamCatWins = computed<TeamTotals[]>(() => {
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

const { view } = useTradeTargets({ pool, fgByKey, catSpecs, teamCatWins, seasonFraction: SEASON_FRACTION, labelOf })

const settling = computed(() => !attempted.value || rosterLoading.value || !catsLoaded.value)
const loadFailed = computed(() => supported.value && attempted.value && !rosterLoading.value && pool.value.length === 0)
const isLoading = computed(() => !unsupported.value && !loadFailed.value && settling.value && !view.value)
const empty = computed(() => !loadFailed.value && rosterLoaded.value && (!view.value || view.value.targets.length === 0))

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-6 space-y-5">
    <header class="space-y-1">
      <h1 class="font-display text-2xl font-bold text-dark-text">Trades</h1>
      <p class="font-mono text-xs text-dark-textMuted">The league, and who to trade for — by rest-of-season value</p>
    </header>

    <p v-if="unsupported" class="rounded-xl border border-dark-border bg-dark-card px-4 py-3 text-sm text-dark-textMuted">
      Trade targets are Yahoo category leagues only in this preview. ESPN support is coming.
    </p>
    <div v-else-if="loadFailed" class="rounded-xl border border-dark-border bg-dark-card px-4 py-3">
      <p class="text-sm text-dark-text">Couldn't load the league rosters from Yahoo just now.</p>
      <p class="mt-0.5 text-xs text-dark-textMuted">Often a brief rate-limit. Try again in a moment.</p>
      <button type="button" class="mt-2 rounded-md border border-dark-border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-primary hover:bg-primary/10" @click="runLoads">Retry</button>
    </div>
    <p v-else-if="isLoading" class="text-sm text-dark-textMuted">Reading every roster in your league…</p>
    <p v-else-if="empty" class="rounded-xl border border-dark-border bg-dark-card px-4 py-3 text-sm text-dark-text">
      No clear trade leverage right now — no partner's surplus lines up with your holes at a believable value.
    </p>

    <template v-else-if="view">
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

      <!-- TRADE TARGETS -->
      <section v-if="view.targets.length" class="space-y-3">
        <div class="flex items-center gap-2">
          <span class="font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">Trade targets</span>
          <span class="h-px flex-1 bg-dark-border/50"></span>
        </div>
        <div v-for="(t, i) in view.targets" :key="i" class="overflow-hidden rounded-xl border border-dark-border bg-dark-card">
          <div class="flex items-center justify-between gap-2 border-b border-dark-border/60 bg-[#F2B33A]/[0.04] px-4 py-2">
            <span class="font-mono text-[11px] uppercase tracking-wide text-[#F2B33A]">Fixes <b class="text-[#ffd98a]">{{ t.fix.label }}</b> · you're {{ ordinal(t.fix.rank) }}</span>
            <span class="font-mono text-[10px] uppercase tracking-wider" :class="t.klass === 'leverage' ? 'text-primary' : 'text-dark-textMuted'">{{ t.klass === 'leverage' ? 'leverage' : 'win-win' }}</span>
          </div>
          <div class="flex items-center gap-2 px-4 pt-2.5">
            <span class="w-11 shrink-0 font-mono text-[10px] font-bold tracking-wider text-primary">GET</span>
            <span class="font-display text-[15px] font-bold text-dark-text">{{ t.get.name }}</span>
            <span class="font-mono text-[11px] text-dark-textMuted">{{ t.get.pos }} · {{ t.get.value }}</span>
            <span class="ml-auto font-mono text-[11px] text-dark-textMuted">from {{ t.fromTeam }}</span>
          </div>
          <div class="flex items-center gap-2 px-4 pb-3 pt-1.5">
            <span class="w-11 shrink-0 font-mono text-[10px] font-bold tracking-wider text-dark-textMuted">GIVE</span>
            <span class="text-sm font-semibold text-dark-textSecondary">{{ t.give.name }}</span>
            <span class="font-mono text-[11px] text-dark-textMuted">{{ t.give.pos }} · {{ t.give.value }}</span>
          </div>
        </div>
      </section>

      <!-- BEST PARTNERS -->
      <section v-if="view.partners.length" class="space-y-2">
        <div class="flex items-center gap-2">
          <span class="font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">Best trade partners</span>
          <span class="h-px flex-1 bg-dark-border/50"></span>
        </div>
        <p class="font-mono text-[10px] text-dark-textMuted">Teams whose strengths mirror your holes — start the conversation here.</p>
        <div class="divide-y divide-dark-border/50 rounded-xl border border-dark-border bg-dark-card/40">
          <div v-for="p in view.partners" :key="p.team" class="flex items-center gap-3 px-4 py-2.5">
            <span class="w-44 shrink-0 truncate text-sm font-semibold text-dark-text">{{ p.team }}</span>
            <span class="min-w-0 flex-1 font-mono text-[11px] text-dark-textMuted">
              <span v-if="p.strong.length"><span class="text-dark-textMuted/60">strong</span> <span class="text-primary">{{ p.strong.join(' ') }}</span></span>
              <span v-if="p.weak.length" class="ml-3"><span class="text-dark-textMuted/60">weak</span> <span class="text-[#F2B33A]">{{ p.weak.join(' ') }}</span></span>
            </span>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
