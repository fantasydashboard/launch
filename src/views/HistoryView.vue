<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useLeagueHistory } from '@/composables/useLeagueHistory'
import { buildChampions } from '@/history/champions'
import { buildAllTimeStandings } from '@/history/allTimeStandings'
import { buildDynastyRankings } from '@/history/dynastyRankings'
import { buildRivalries } from '@/history/rivalries'
import { buildLegendaryMoments } from '@/history/legendaryMoments'
import TeamAvatar from '@/components/league/TeamAvatar.vue'
import { useAuthStore } from '@/stores/auth'
import BackfillSeason from '@/components/history/BackfillSeason.vue'
import { deleteManualSeason } from '@/services/historySnapshots'
import type { HistorySeason } from '@/history/types'
import { useDraftReport } from '@/composables/useDraftReport'
import { getLeagueType } from '@/config/sports'

const leagueStore = useLeagueStore()
const history = useLeagueHistory()
const authStore = useAuthStore()

onMounted(() => history.load())
watch(() => leagueStore.activeLeagueId, () => {
  history.load()
  // HistoryView stays mounted across league switches → reset draft state so
  // League A's report can't linger mislabeled as League B's.
  showDraftReport.value = false
  selectedDraftSeason.value = null
  draft.report.value = null
  draft.error.value = null
})

// ── DRAFT REPORT (Phase 1: points leagues only) ──────────────────────────────
const draft = useDraftReport()
const showDraftReport = ref(false)

const draftReportPointsOnly = computed(
  () => getLeagueType(leagueStore.currentLeague?.scoring_type ?? undefined) !== 'points',
)
const draftSeasons = computed<number[]>(() =>
  [...history.seasonKeys.value.keys()].sort((a, b) => b - a),
)
const selectedDraftSeason = ref<number | null>(null)

function loadDraftSeason(season: number) {
  const key = history.seasonKeys.value.get(season)
  if (!key) return
  selectedDraftSeason.value = season
  draft.load({ platform: history.platform.value, seasonKey: key, sport: history.sport.value, season })
}
function openDraftReport() {
  showDraftReport.value = true
  if (selectedDraftSeason.value == null && draftSeasons.value.length && !draftReportPointsOnly.value) {
    loadDraftSeason(draftSeasons.value[0])
  }
}
function ordinalRank(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

// Theme `primary` var has no alpha slot so bg-primary/NN renders nothing — use color-mix.
const primaryTint = (pct: number) => `color-mix(in srgb, var(--color-primary, #C6FF3A) ${pct}%, transparent)`

const loading = computed(() => history.loading.value)
const firstYear = computed(() => history.firstYear.value)
const seasons = computed(() => history.data.value)
const singleSeason = computed(() => seasons.value.length === 1)
const isEspn = computed(() => history.platform.value === 'espn')
const backfilled = computed(() => history.backfilled.value)

// ── Manual backfill (Phase 2b) ───────────────────────────────────────────────
const canWrite = computed(() => !!authStore.user)
const existingSeasonNums = computed(() => seasons.value.map((s) => s.season))
// data is sorted season DESC → the newest season is the active one.
const activeSeason = computed(() => seasons.value[0]?.season ?? 0)
const originOf = (season: number) => history.origin.value.get(season)
const editingSeason = ref<HistorySeason | null>(null)

function editManual(season: number) {
  editingSeason.value = seasons.value.find((s) => s.season === season) ?? null
}
async function removeManual(season: number) {
  // Destructive + one-click on a hand-entered season → confirm before deleting.
  if (!window.confirm(`Remove the ${season} season you added? This can't be undone.`)) return
  const res = await deleteManualSeason(history.snapshotKey.value, season)
  if (res.ok) await history.load()
}
function onBackfillSaved() {
  editingSeason.value = null
  history.load()
}

// Scoring type — replicate the wrappers' isCategoryLeague signal against the store so
// we can gate point-based legendary moments. Defaults to 'points'.
const scoring = computed<'points' | 'category'>(() => {
  if (leagueStore.activePlatform === 'sleeper') return 'points'
  const saved = leagueStore.savedLeagues?.find((l: any) => l.league_id === leagueStore.activeLeagueId)
  const st = String(
    leagueStore.currentLeague?.scoring_type ?? saved?.scoring_type ?? '',
  ).toLowerCase()
  if (st.includes('roto') || st.includes('category') || st === 'head' || st === 'headcategory' || st === 'h2h_category') {
    return 'category'
  }
  const yahoo = leagueStore.yahooLeague
  const yahooData = Array.isArray(yahoo) ? yahoo[0] : yahoo
  const yst = String((yahooData as any)?.scoring_type ?? '').toLowerCase()
  if (yst === 'head' || yst.includes('category') || yst === 'headcategory' || yst.includes('roto')) {
    return 'category'
  }
  return 'points'
})

const subtitle = computed(() => {
  const n = seasons.value.length
  if (!n) return 'Bragging rights, title runs, and the all-time race.'
  if (n === 1) return 'One season in — the lore starts building now.'
  const span = `${history.firstYear.value}–${seasons.value[0].season}`
  return `${n} seasons of league lore · ${span}`
})

// Champions roll. With one season the title isn't won yet → show the current leader,
// labeled "in progress".
const champions = computed(() => buildChampions(seasons.value))

const allTime = computed(() =>
  buildAllTimeStandings(seasons.value, history.myTeamKey.value),
)

// Hide the PO (playoff appearances) stat when NO team has any — platforms without
// playoff-seed data (e.g. Yahoo getStandings) would otherwise show 0 for everyone.
const hasPlayoffData = computed(() =>
  allTime.value.some((r) => r.playoffAppearances > 0),
)

// ── All-time section — toggled Record (standings) ⇄ Legacy (dynasty score). ──
// "Legacy" is the user-facing name for the internal dynasty ranking.
const allTimeView = ref<'record' | 'legacy'>('record')
const showLegacyScoring = ref(false)

// Legacy weights — kept in sync with buildDynastyRankings; shown in the "how it's scored" panel.
const legacyWeights: { label: string; value: string }[] = [
  { label: 'Championship', value: '+100' },
  { label: 'Runner-up', value: '+50' },
  { label: 'Regular-season title', value: '+35' },
  { label: 'Semifinal (3rd)', value: '+25' },
  { label: 'Made playoffs', value: '+20' },
  { label: 'Top-half finish', value: '+10' },
  { label: 'Season strength', value: '+ win% × 30' },
  { label: 'Per season played', value: '+5' },
  { label: 'Last place', value: '−15' },
]
const dynasty = computed(() =>
  buildDynastyRankings(seasons.value, history.myTeamKey.value),
)
const maxDynastyScore = computed(() =>
  dynasty.value.reduce((m, r) => Math.max(m, r.score), 1),
)

// "Active only" filter — the teams in the most recent (current) season are the league's
// current members; filtering to them cuts the long all-time list to who's still around.
const activeKeys = computed(() => new Set((seasons.value[0]?.teams ?? []).map((t) => t.teamKey)))
const hasInactive = computed(() => allTime.value.length > activeKeys.value.size)
const activeOnly = ref(false)
const displayedAllTime = computed(() =>
  activeOnly.value ? allTime.value.filter((r) => activeKeys.value.has(r.teamKey)) : allTime.value,
)
const displayedDynasty = computed(() =>
  activeOnly.value ? dynasty.value.filter((r) => activeKeys.value.has(r.teamKey)) : dynasty.value,
)

// ── Rivalries — head-to-head across visible seasons (needs matchup pairings). ─
// Re-rootable to ANY team via the switcher; defaults to the user's team.
const selectedRivalKey = ref('')
watch(
  () => history.myTeamKey.value,
  (k) => {
    if (!selectedRivalKey.value && k) selectedRivalKey.value = k
  },
  { immediate: true },
)
// Team options for the switcher: distinct teamKey with latest name (all-time list).
const teamOptions = computed(() =>
  allTime.value.map((r) => ({ teamKey: r.teamKey, teamName: r.teamName })),
)
// Fall back to the user's team (then the first team) if the selected key isn't present.
const effectiveRivalKey = computed(() => {
  const keys = new Set(teamOptions.value.map((o) => o.teamKey))
  if (selectedRivalKey.value && keys.has(selectedRivalKey.value)) return selectedRivalKey.value
  if (history.myTeamKey.value && keys.has(history.myTeamKey.value)) return history.myTeamKey.value
  return teamOptions.value[0]?.teamKey ?? ''
})
const rivalries = computed(() =>
  buildRivalries(seasons.value, effectiveRivalKey.value),
)
const hasRivalries = computed(() => rivalries.value.mine.length > 0)
const rivalIsMe = computed(
  () => !!history.myTeamKey.value && effectiveRivalKey.value === history.myTeamKey.value,
)
const rivalName = computed(
  () => teamOptions.value.find((o) => o.teamKey === effectiveRivalKey.value)?.teamName ?? '',
)
// The selected team's own name/logo (for the fiercest-rivalry banner).
const subjectInfo = computed(() => {
  const row = allTime.value.find((r) => r.teamKey === effectiveRivalKey.value)
  return { name: row?.teamName ?? rivalName.value, logo: row?.teamLogo }
})
// The selected team's fiercest rivalry: most meetings, tiebreak tightest split.
const subjectFiercest = computed(() => {
  const rows = rivalries.value.mine
  if (!rows.length) return null
  let best = rows[0]
  for (const r of rows) {
    const split = Math.abs(r.wins - r.losses)
    const bestSplit = Math.abs(best.wins - best.losses)
    if (r.games > best.games || (r.games === best.games && split < bestSplit)) best = r
  }
  return best
})

// ── Legendary moments — the record book. ─────────────────────────────────────
const moments = computed(() => buildLegendaryMoments(seasons.value, scoring.value))

// Group moments by tone (highs → notable → lows) and color them green/amber/red.
const momentTone = (kind: string): 'good' | 'neutral' | 'bad' =>
  kind === 'loseStreak' || kind === 'worstSeason'
    ? 'bad'
    : kind === 'closestGame' || kind === 'fiercestRivalry'
      ? 'neutral'
      : 'good'
const toneRank: Record<string, number> = { good: 0, neutral: 1, bad: 2 }
const toneColor: Record<string, string> = {
  good: 'text-primary',
  neutral: 'text-[#e69a4a]',
  bad: 'text-[#e0625a]',
}
const groupedMoments = computed(() =>
  [...moments.value].sort((a, b) => toneRank[momentTone(a.kind)] - toneRank[momentTone(b.kind)]),
)

const fmtPct = (p: number) => '.' + String(Math.round(p * 1000)).padStart(3, '0')
const record = (w: number, l: number, t: number) => `${w}-${l}${t ? '-' + t : ''}`
const edgeArrow = (edge: 'up' | 'down' | 'even') =>
  edge === 'up' ? '▲' : edge === 'down' ? '▼' : '—'
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 pt-6 pb-20">
    <header class="mb-6">
      <h1 class="font-display text-2xl font-bold text-dark-text">League history</h1>
      <p class="font-mono text-xs text-dark-textMuted">{{ subtitle }}</p>
    </header>

    <!-- ── LOADING / EMPTY STATES ─────────────────────────────────────────── -->
    <div v-if="loading && !seasons.length" class="py-16 text-center text-dark-textMuted">
      Digging up the archives…
    </div>
    <div
      v-else-if="!loading && !seasons.length"
      class="py-16 text-center text-dark-textMuted"
    >
      No history yet for this league. It'll start filling in as seasons complete.
    </div>

    <template v-else>
      <!-- History depth note: positive when league snapshots deepened it, else the ESPN caveat. -->
      <p
        v-if="backfilled"
        class="mb-6 rounded-lg border border-dark-border/50 bg-dark-card px-3 py-2 font-mono text-[11px] leading-snug text-dark-textMuted"
      >
        History runs back to <span class="text-dark-text">{{ firstYear }}</span>, filled in from
        seasons your leaguemates have contributed.
      </p>
      <p
        v-else-if="isEspn"
        class="mb-6 rounded-lg border border-dark-border/50 bg-dark-card px-3 py-2 font-mono text-[11px] leading-snug text-dark-textMuted"
      >
        ESPN only shares seasons you've been a member of, so your history starts at
        <span class="text-dark-text">{{ firstYear }}</span>. It'll grow each season.
      </p>

      <!-- ── MANUAL BACKFILL (Phase 2b) ────────────────────────────────────── -->
      <BackfillSeason
        v-if="firstYear"
        :snapshot-key="history.snapshotKey.value"
        :platform="history.platform.value"
        :sport="history.sport.value"
        :first-year="firstYear"
        :active-season="activeSeason"
        :existing-seasons="existingSeasonNums"
        :prefill="editingSeason"
        :can-write="canWrite"
        @saved="onBackfillSaved"
        @cancel-edit="editingSeason = null"
      />

      <!-- ── CHAMPIONS ─────────────────────────────────────────────────────── -->
      <section class="mb-8">
        <h2 class="font-display text-lg font-bold text-dark-text">Champions</h2>
        <p class="mb-3 font-mono text-xs text-dark-textMuted">
          <template v-if="singleSeason">Who's leading the chase right now.</template>
          <template v-else>The title roll, season by season.</template>
        </p>

        <div class="rounded-xl border border-dark-border bg-dark-card divide-y divide-dark-border/40">
          <div
            v-for="c in champions"
            :key="c.season"
            class="px-4 py-3 flex items-center gap-3"
          >
            <span class="w-12 shrink-0 font-mono text-sm text-dark-textMuted">{{ c.season }}</span>
            <TeamAvatar :name="c.championName" :logo="c.championLogo" :size="32" />
            <span class="min-w-0 flex-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span class="truncate text-sm font-semibold text-dark-text">{{ c.championName }}</span>
              <span
                v-if="c.inProgress"
                class="shrink-0 rounded px-1 font-mono text-[9px] uppercase tracking-wider text-[#e69a4a]"
                :style="{ backgroundColor: 'rgba(230,154,74,0.14)' }"
              >in progress</span>
              <span
                v-else
                class="shrink-0 font-mono text-[9px] uppercase tracking-wider text-primary"
              >champion</span>
              <span
                v-if="c.repeat"
                class="shrink-0 rounded px-1 font-mono text-[9px] uppercase tracking-wider text-primary"
                :style="{ backgroundColor: primaryTint(16) }"
              >back-to-back</span>
              <template v-if="originOf(c.season)?.source === 'manual'">
                <span class="shrink-0 font-mono text-[9px] text-dark-textMuted">
                  added by {{ originOf(c.season)?.isMine ? 'you' : 'a leaguemate' }}
                </span>
                <template v-if="originOf(c.season)?.isMine">
                  <button
                    class="shrink-0 font-mono text-[9px] text-dark-textMuted underline-offset-2 hover:text-dark-text hover:underline"
                    @click="editManual(c.season)"
                  >edit</button>
                  <button
                    class="shrink-0 font-mono text-[9px] text-[#e0625a] underline-offset-2 hover:underline"
                    @click="removeManual(c.season)"
                  >remove</button>
                </template>
              </template>
            </span>
            <div class="shrink-0 text-right font-mono text-[10px] leading-tight text-dark-textMuted">
              <div v-if="c.runnerUpName">runner-up: <span class="text-dark-text">{{ c.runnerUpName }}</span></div>
              <div v-if="c.regularLeaderName">reg. leader: <span class="text-dark-text">{{ c.regularLeaderName }}</span></div>
            </div>
          </div>
        </div>
      </section>

      <!-- ── ALL-TIME (Record ⇄ Legacy) ────────────────────────────────────── -->
      <section class="mb-8">
        <!-- Header + toggle (mirrors LeagueView's matrix toggle) -->
        <div class="mb-1 flex items-center justify-between gap-3">
          <h2 class="font-display text-lg font-bold text-dark-text">All-time</h2>
          <div class="flex shrink-0 items-center gap-0.5 rounded-lg border border-dark-border p-0.5 font-mono text-[10px]">
            <button
              class="rounded-md px-2.5 py-1 uppercase tracking-wider transition-colors"
              :class="allTimeView === 'record' ? 'font-bold' : 'text-dark-textMuted hover:text-dark-text'"
              :style="allTimeView === 'record' ? { backgroundColor: 'var(--color-primary, #C6FF3A)', color: '#10130a' } : {}"
              @click="allTimeView = 'record'"
            >Record</button>
            <button
              class="rounded-md px-2.5 py-1 uppercase tracking-wider transition-colors"
              :class="allTimeView === 'legacy' ? 'font-bold' : 'text-dark-textMuted hover:text-dark-text'"
              :style="allTimeView === 'legacy' ? { backgroundColor: 'var(--color-primary, #C6FF3A)', color: '#10130a' } : {}"
              @click="allTimeView = 'legacy'"
            >Legacy</button>
          </div>
        </div>
        <p class="mb-2 font-mono text-xs text-dark-textMuted">
          <template v-if="allTimeView === 'record'">
            <template v-if="singleSeason">This season's race — all-time begins here.</template>
            <template v-else>The GOAT race across every visible season · titles, then win% · {{ displayedAllTime.length }} teams.</template>
          </template>
          <template v-else>
            The all-time franchise pecking order — titles, finals, playoffs, and consistency, weighted.
          </template>
        </p>

        <!-- Active-only filter (only when there are former teams to hide). -->
        <button
          v-if="hasInactive"
          class="mb-3 font-mono text-[10px] transition-colors"
          :class="activeOnly ? 'text-primary' : 'text-dark-textMuted hover:text-dark-text'"
          @click="activeOnly = !activeOnly"
        >
          {{ activeOnly ? '▣' : '▢' }} active teams only
        </button>

        <!-- RECORD view = all-time standings table -->
        <div v-if="allTimeView === 'record'" class="rounded-xl border border-dark-border bg-dark-card divide-y divide-dark-border/40">
          <!-- Column header -->
          <div class="px-4 py-1 flex items-center gap-3 border-b border-dark-border/40">
            <span class="w-6 shrink-0" />
            <span class="h-8 w-8 shrink-0" />
            <span class="min-w-0 flex-1" />
            <span class="shrink-0 w-24 text-right font-mono text-[9px] uppercase tracking-wider text-dark-textMuted">REC · WIN%</span>
            <span class="shrink-0 w-28 text-right font-mono text-[9px] uppercase tracking-wider text-dark-textMuted">{{ hasPlayoffData ? 'TITLES · PO · SZN' : 'TITLES · SZN' }}</span>
          </div>

          <div
            v-for="(r, i) in displayedAllTime"
            :key="r.teamKey"
            class="px-4 py-2.5 flex items-center gap-3"
            :style="r.isMe ? { backgroundColor: primaryTint(6) } : {}"
          >
            <span class="w-6 shrink-0 text-center font-mono text-sm text-dark-textMuted">{{ i + 1 }}</span>
            <TeamAvatar :name="r.teamName" :logo="r.teamLogo" :size="32" />
            <span class="min-w-0 flex-1 flex items-center gap-2 overflow-hidden">
              <span class="truncate text-sm font-semibold text-dark-text">{{ r.teamName }}</span>
              <span
                v-if="r.isMe"
                class="shrink-0 rounded px-1 font-mono text-[9px] uppercase text-primary"
                :style="{ backgroundColor: primaryTint(16) }"
              >you</span>
            </span>

            <!-- record + win% -->
            <span class="shrink-0 w-24 text-right font-mono text-[11px] text-dark-textMuted">
              {{ record(r.wins, r.losses, r.ties) }}
              <span class="text-dark-text"> · {{ fmtPct(r.winPct) }}</span>
            </span>

            <!-- titles · playoff apps · seasons -->
            <span class="shrink-0 w-28 text-right font-mono text-[11px] text-dark-textMuted">
              <span :class="r.titles > 0 ? 'text-primary' : ''">
                <template v-if="r.titles > 0">🏆×{{ r.titles }}</template>
                <template v-else>—</template>
              </span>
              <template v-if="hasPlayoffData">
                <span class="text-dark-border/60"> · </span>{{ r.playoffAppearances }}
              </template>
              <span class="text-dark-border/60"> · </span>{{ r.seasonsPlayed }}
            </span>
          </div>
        </div>
        <p v-if="allTimeView === 'record'" class="mt-2 font-mono text-[10px] text-dark-textMuted">
          win% counts ties as half-wins<template v-if="hasPlayoffData"> · PO = playoff appearances</template> · SZN = seasons played
        </p>

        <!-- LEGACY view: scoring explainer (top, so it's not a scroll away) + score bars -->
        <template v-if="allTimeView === 'legacy'">
          <!-- How the Legacy score is computed (transparent, collapsible). -->
          <div class="mb-2">
            <button
              class="font-mono text-[10px] text-dark-textMuted hover:text-dark-text transition-colors"
              @click="showLegacyScoring = !showLegacyScoring"
            >
              {{ showLegacyScoring ? '▾' : '▸' }} how the legacy score is computed
            </button>
            <div
              v-if="showLegacyScoring"
              class="mt-2 rounded-lg border border-dark-border/50 bg-dark-card px-4 py-3 font-mono text-[11px]"
            >
              <div class="mb-2 text-dark-textMuted">Summed across every season a team appears in:</div>
              <div class="grid grid-cols-1 gap-y-1 sm:grid-cols-2 sm:gap-x-8">
                <div
                  v-for="w in legacyWeights"
                  :key="w.label"
                  class="flex items-baseline justify-between gap-3 border-b border-dark-border/30 py-0.5"
                >
                  <span class="text-dark-textSecondary">{{ w.label }}</span>
                  <span :class="w.value.startsWith('−') ? 'text-[#e0625a]' : 'text-primary'">{{ w.value }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="rounded-xl border border-dark-border bg-dark-card divide-y divide-dark-border/40">
            <div
              v-for="(r, i) in displayedDynasty"
              :key="r.teamKey"
              class="relative px-4 py-2.5 flex items-center gap-3 overflow-hidden"
              :style="r.isMe ? { backgroundColor: primaryTint(6) } : {}"
            >
              <!-- subtle score bar -->
              <span
                class="pointer-events-none absolute inset-y-0 left-0"
                :style="{ width: Math.max(2, Math.round((r.score / maxDynastyScore) * 100)) + '%', backgroundColor: primaryTint(8) }"
              />
              <span class="relative w-6 shrink-0 text-center font-mono text-sm text-dark-textMuted">{{ i + 1 }}</span>
              <TeamAvatar class="relative" :name="r.teamName" :logo="r.teamLogo" :size="32" />
              <span class="relative min-w-0 flex-1 flex flex-col gap-0.5 overflow-hidden">
                <span class="flex items-center gap-2 overflow-hidden">
                  <span class="truncate text-sm font-semibold text-dark-text">{{ r.teamName }}</span>
                  <span
                    v-if="r.isMe"
                    class="shrink-0 rounded px-1 font-mono text-[9px] uppercase text-primary"
                    :style="{ backgroundColor: primaryTint(16) }"
                  >you</span>
                </span>
                <span class="font-mono text-[10px] leading-tight text-dark-textMuted">
                  <span v-if="r.titles > 0" class="text-primary">🏆 {{ r.titles }} · </span><template v-if="r.runnerUps > 0">runner-up {{ r.runnerUps }} · </template><template v-if="r.regSeasonTitles > 0">reg #1 {{ r.regSeasonTitles }} · </template>{{ r.seasonsPlayed }} szn
                </span>
              </span>
              <span class="relative shrink-0 font-mono text-base font-bold text-dark-text tabular-nums">{{ r.score }}</span>
            </div>
          </div>
        </template>
      </section>

      <!-- ── RIVALRIES ─────────────────────────────────────────────────────── -->
      <section v-if="rivalries.fiercest" class="mb-8">
        <div class="mb-1 flex items-center justify-between gap-3">
          <h2 class="font-display text-lg font-bold text-dark-text">Rivalries</h2>
          <select
            v-model="selectedRivalKey"
            class="shrink-0 max-w-[55%] truncate rounded-lg border border-dark-border bg-dark-card px-2.5 py-1 font-mono text-[11px] text-dark-text focus:border-dark-textMuted focus:outline-none"
          >
            <option v-for="o in teamOptions" :key="o.teamKey" :value="o.teamKey">
              {{ o.teamName }}{{ o.teamKey === history.myTeamKey.value ? ' (you)' : '' }}
            </option>
          </select>
        </div>
        <p class="mb-3 font-mono text-xs text-dark-textMuted">
          <template v-if="rivalIsMe">Your head-to-head record vs every team you've faced.</template>
          <template v-else>{{ rivalName }}'s head-to-head record vs every team.</template>
        </p>

        <p v-if="!hasRivalries" class="mb-3 rounded-xl border border-dark-border bg-dark-card px-4 py-3 font-mono text-[11px] text-dark-textMuted">
          No head-to-head meetings on record for {{ rivalIsMe ? 'you' : rivalName }} yet.
        </p>

        <!-- The selected team's fiercest rivalry (most meetings). -->
        <div
          v-if="subjectFiercest"
          class="mb-3 rounded-xl border border-dark-border bg-dark-card px-4 py-3"
          :style="{ backgroundColor: primaryTint(4) }"
        >
          <div class="font-mono text-[9px] uppercase tracking-wider text-primary">
            {{ rivalIsMe ? 'Your fiercest rivalry' : 'Fiercest rivalry' }}
          </div>
          <div class="mt-1.5 flex items-center gap-2">
            <TeamAvatar :name="subjectInfo.name" :logo="subjectInfo.logo" :size="28" />
            <span class="truncate text-sm font-semibold text-dark-text">{{ subjectInfo.name }}</span>
            <span class="shrink-0 font-mono text-xs text-dark-textMuted">{{ subjectFiercest.wins }}–{{ subjectFiercest.losses }}<template v-if="subjectFiercest.ties">–{{ subjectFiercest.ties }}</template></span>
            <span class="truncate text-sm font-semibold text-dark-text text-right">{{ subjectFiercest.oppName }}</span>
            <TeamAvatar :name="subjectFiercest.oppName" :logo="subjectFiercest.oppLogo" :size="28" />
          </div>
          <div class="mt-1 font-mono text-[10px] text-dark-textMuted">{{ subjectFiercest.games }} meetings all-time</div>
        </div>

        <div v-if="hasRivalries" class="rounded-xl border border-dark-border bg-dark-card divide-y divide-dark-border/40">
          <div
            v-for="r in rivalries.mine"
            :key="r.oppKey"
            class="px-4 py-2.5 flex items-center gap-3"
          >
            <TeamAvatar :name="r.oppName" :logo="r.oppLogo" :size="32" />
            <span class="min-w-0 flex-1 truncate text-sm font-semibold text-dark-text">{{ r.oppName }}</span>
            <span
              class="shrink-0 font-mono text-xs"
              :class="r.edge === 'up' ? 'text-primary' : r.edge === 'down' ? 'text-[#e0625a]' : 'text-dark-textMuted'"
            >{{ edgeArrow(r.edge) }}</span>
            <span class="shrink-0 w-20 text-right font-mono text-[11px] text-dark-text tabular-nums">
              {{ record(r.wins, r.losses, r.ties) }}
            </span>
            <span class="shrink-0 w-14 text-right font-mono text-[10px] text-dark-textMuted">{{ r.games }} gp</span>
          </div>
        </div>
      </section>

      <!-- ── LEGENDARY MOMENTS ─────────────────────────────────────────────── -->
      <section v-if="moments.length" class="mb-8">
        <h2 class="font-display text-lg font-bold text-dark-text">Legendary moments</h2>
        <p class="mb-3 font-mono text-xs text-dark-textMuted">
          The record book — the highs, the lows, and the streaks.
        </p>

        <div class="grid gap-2 sm:grid-cols-2">
          <div
            v-for="m in groupedMoments"
            :key="m.kind"
            class="rounded-xl border border-dark-border bg-dark-card px-4 py-3"
          >
            <div class="font-mono text-[9px] uppercase tracking-wider text-dark-textMuted">{{ m.label }}</div>
            <div class="mt-1.5 flex items-center gap-2">
              <TeamAvatar :name="m.teamName" :logo="m.teamLogo" :size="28" />
              <span class="min-w-0 flex-1 truncate text-sm font-semibold text-dark-text">{{ m.teamName }}</span>
            </div>
            <!-- Game moments: opponent + final score line -->
            <div v-if="m.vsName" class="mt-1 flex items-center gap-1.5 pl-0.5">
              <span class="font-mono text-[10px] text-dark-textMuted">{{ m.kind === 'fiercestRivalry' ? 'vs' : 'def.' }}</span>
              <TeamAvatar :name="m.vsName" :logo="m.vsLogo" :size="18" />
              <span class="min-w-0 flex-1 truncate font-mono text-[11px] text-dark-textMuted">{{ m.vsName }}</span>
              <span v-if="m.detail" class="shrink-0 font-mono text-[11px] text-dark-text tabular-nums">{{ m.detail }}</span>
            </div>
            <div class="mt-1.5 flex items-baseline gap-1.5">
              <span class="font-display text-xl font-bold tabular-nums" :class="toneColor[momentTone(m.kind)]">{{ m.value }}</span>
              <span v-if="m.valueLabel" class="font-mono text-[10px] text-dark-textMuted">{{ m.valueLabel }}</span>
              <span v-if="m.season" class="ml-auto font-mono text-[10px] text-dark-textMuted">
                {{ m.season }}<template v-if="m.week"> · wk {{ m.week }}</template>
              </span>
              <span v-else class="ml-auto font-mono text-[10px] text-dark-textMuted">all-time</span>
            </div>
          </div>
        </div>
      </section>

      <!-- ── DRAFT REPORT ─────────────────────────────────────────────────── -->
      <section class="mb-8">
        <button
          type="button"
          class="flex w-full items-center justify-between text-left"
          @click="showDraftReport ? (showDraftReport = false) : openDraftReport()"
        >
          <h2 class="font-display text-lg font-bold text-dark-text">Draft report</h2>
          <span class="font-mono text-xs text-dark-textMuted">{{ showDraftReport ? '▾ hide' : '▸ show' }}</span>
        </button>

        <div v-if="showDraftReport" class="mt-3">
          <div v-if="draftSeasons.length && !draftReportPointsOnly" class="mb-3 flex flex-wrap gap-1.5">
            <button
              v-for="s in draftSeasons"
              :key="s"
              type="button"
              class="rounded-lg border border-dark-border px-2.5 py-1 font-mono text-[11px]"
              :class="s === selectedDraftSeason ? 'text-primary' : 'text-dark-textMuted hover:text-dark-text'"
              :style="s === selectedDraftSeason ? { backgroundColor: primaryTint(16) } : {}"
              @click="loadDraftSeason(s)"
            >{{ s }}</button>
          </div>

          <p v-if="draftReportPointsOnly" class="rounded-xl border border-dark-border bg-dark-card px-4 py-3 font-mono text-[11px] text-dark-textMuted">
            The graded Draft Report is available on points leagues for now — category-league grading is coming next.
          </p>
          <p v-else-if="draft.loading.value" class="rounded-xl border border-dark-border bg-dark-card px-4 py-3 font-mono text-[11px] text-dark-textMuted">
            Grading the draft…
          </p>
          <p v-else-if="draft.error.value === 'no-data'" class="rounded-xl border border-dark-border bg-dark-card px-4 py-3 font-mono text-[11px] text-dark-textMuted">
            We couldn't pull enough of {{ selectedDraftSeason }}'s draft to grade it — this can happen with older seasons.
          </p>
          <p v-else-if="draft.error.value === 'failed'" class="rounded-xl border border-dark-border bg-dark-card px-4 py-3 font-mono text-[11px] text-dark-textMuted">
            Couldn't load the draft. Try another season.
          </p>

          <div v-else-if="draft.report.value" class="space-y-4">
            <div class="grid gap-3 sm:grid-cols-2">
              <div v-if="draft.report.value.steal" class="rounded-xl border border-dark-border bg-dark-card px-4 py-3">
                <div class="font-mono text-[9px] uppercase tracking-wider text-primary">Biggest steal</div>
                <div class="mt-1 text-lg font-display font-bold text-dark-text">{{ draft.report.value.steal.playerName }}</div>
                <div class="font-mono text-[11px] text-dark-textMuted">{{ draft.report.value.steal.teamName }} · {{ draft.report.value.steal.valueLabel }} · {{ draft.report.value.steal.grade }}</div>
              </div>
              <div v-if="draft.report.value.bust" class="rounded-xl border border-dark-border bg-dark-card px-4 py-3">
                <div class="font-mono text-[9px] uppercase tracking-wider text-[#e0625a]">Biggest bust</div>
                <div class="mt-1 text-lg font-display font-bold text-dark-text">{{ draft.report.value.bust.playerName }}</div>
                <div class="font-mono text-[11px] text-dark-textMuted">{{ draft.report.value.bust.teamName }} · {{ draft.report.value.bust.valueLabel }} · {{ draft.report.value.bust.grade }}</div>
              </div>
            </div>

            <div v-if="draft.report.value.bestDrafter" class="rounded-xl border border-dark-border bg-dark-card px-4 py-3">
              <div class="font-mono text-[9px] uppercase tracking-wider text-dark-textMuted">Draft MVP · best &amp; worst drafter</div>
              <div class="mt-2 flex items-center justify-between gap-2">
                <span class="flex min-w-0 items-center gap-2">
                  <TeamAvatar :name="draft.report.value.bestDrafter.teamName" :logo="draft.report.value.bestDrafter.teamLogo" :size="28" />
                  <span class="truncate text-sm text-dark-text">{{ draft.report.value.bestDrafter.teamName }}</span>
                </span>
                <span class="shrink-0 font-display text-lg font-bold text-primary">{{ draft.report.value.bestDrafter.grade }}</span>
              </div>
              <div v-if="draft.report.value.worstDrafter" class="mt-2 flex items-center justify-between gap-2">
                <span class="flex min-w-0 items-center gap-2">
                  <TeamAvatar :name="draft.report.value.worstDrafter.teamName" :logo="draft.report.value.worstDrafter.teamLogo" :size="28" />
                  <span class="truncate text-sm text-dark-text">{{ draft.report.value.worstDrafter.teamName }}</span>
                </span>
                <span class="shrink-0 font-display text-lg font-bold text-[#e0625a]">{{ draft.report.value.worstDrafter.grade }}</span>
              </div>
            </div>

            <div class="rounded-xl border border-dark-border bg-dark-card px-4 py-3">
              <div class="mb-2 font-mono text-[9px] uppercase tracking-wider text-dark-textMuted">Every team, graded</div>
              <div
                v-for="t in draft.report.value.teamGrades"
                :key="t.teamKey"
                class="flex items-center justify-between gap-2 border-b border-dark-border/40 py-1.5 last:border-0"
                :class="t.isMe ? 'text-primary' : 'text-dark-text'"
              >
                <span class="flex min-w-0 items-center gap-2">
                  <span class="w-5 shrink-0 font-mono text-xs text-dark-textMuted">{{ t.rank }}</span>
                  <TeamAvatar :name="t.teamName" :logo="t.teamLogo" :size="24" />
                  <span class="truncate text-sm">{{ t.teamName }}<span v-if="t.isMe" class="ml-1 text-xs">(you)</span></span>
                </span>
                <span class="shrink-0 font-display text-sm font-bold">{{ t.grade }}</span>
              </div>
            </div>

            <div v-if="draft.report.value.mySpotlight" class="rounded-xl border border-dark-border px-4 py-3" :style="{ backgroundColor: primaryTint(6) }">
              <div class="font-mono text-[9px] uppercase tracking-wider text-primary">Your draft</div>
              <div class="mt-1 text-sm text-dark-text">
                Grade <span class="font-display text-lg font-bold text-primary">{{ draft.report.value.mySpotlight.grade }}</span>
                · {{ ordinalRank(draft.report.value.mySpotlight.rank) }} of {{ draft.report.value.teamCount }}
              </div>
              <div v-if="draft.report.value.mySpotlight.bestPick" class="mt-1 font-mono text-[11px] text-dark-textMuted">
                Best pick: {{ draft.report.value.mySpotlight.bestPick.playerName }} ({{ draft.report.value.mySpotlight.bestPick.valueLabel }})
              </div>
              <div v-if="draft.report.value.mySpotlight.worstPick" class="font-mono text-[11px] text-dark-textMuted">
                Worst pick: {{ draft.report.value.mySpotlight.worstPick.playerName }} ({{ draft.report.value.mySpotlight.worstPick.valueLabel }})
              </div>
            </div>

            <RouterLink to="/draft" class="inline-block font-mono text-[11px] text-dark-textMuted hover:text-primary">deep draft board →</RouterLink>
          </div>

          <p v-else class="rounded-xl border border-dark-border bg-dark-card px-4 py-3 font-mono text-[11px] text-dark-textMuted">
            No draftable seasons found for this league yet.
          </p>
        </div>
      </section>
    </template>
  </div>
</template>
