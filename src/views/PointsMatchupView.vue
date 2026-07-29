<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useYahooLeaguePool } from '@/composables/useYahooLeaguePool'
import { useEspnPointsTeamData } from '@/composables/useEspnPointsTeamData'
import { useLeagueScoring } from '@/composables/useLeagueScoring'
import { useThisWeekOpponent } from '@/composables/useThisWeekOpponent'
import { buildPointsMatchup } from '@/myteam/pointsMatchup'
import type { PointsPoolPlayer } from '@/myteam/pointsTeam'
import { usePointsValue } from '@/composables/usePointsValue'
import { getWeekSchedule, type WeekSchedule } from '@/services/mlbSchedule'
import { useWinProbTrend } from '@/composables/useWinProbTrend'
import MatchupWinProbChart from '@/components/matchup/MatchupWinProbChart.vue'
import { seasonStakes } from '@/myteam/seasonStakes'
import { useSeasonOutlook } from '@/composables/useSeasonOutlook'
import type { OutlookTeamMeta } from '@/myteam/seasonOutlook'

const leagueStore = useLeagueStore()
const isEspn = computed(() => leagueStore.activePlatform === 'espn')

const yahooLeague = useYahooLeaguePool()
const espnPoints = useEspnPointsTeamData()
const scoring = useLeagueScoring()
const oppSvc = useThisWeekOpponent()
const schedule = ref<WeekSchedule>({ gamesByTeam: {}, startsByPitcher: {}, homeTeamByTeam: {} })
const todaySchedule = ref<WeekSchedule>({ gamesByTeam: {}, startsByPitcher: {}, homeTeamByTeam: {} })
const cadence = ref<'daily' | 'weekly'>('weekly')

async function loadSchedule() {
  const today = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const end = new Date(today)
  end.setDate(today.getDate() + ((7 - today.getDay()) % 7)) // through the coming Sunday
  const [week, day] = await Promise.all([getWeekSchedule(fmt(today), fmt(end)), getWeekSchedule(fmt(today), fmt(today))])
  schedule.value = week
  todaySchedule.value = day
}

function loadAll() {
  scoring.load()
  oppSvc.load()
  loadSchedule()
  if (isEspn.value) espnPoints.load()
  else yahooLeague.load()
}
onMounted(loadAll)
watch(() => leagueStore.activeLeagueId, loadAll)

const pool = computed<PointsPoolPlayer[]>(() =>
  (isEspn.value ? espnPoints.pool.value : yahooLeague.pool.value) as PointsPoolPlayer[],
)
const fgByKey = computed(() => (isEspn.value ? espnPoints.fgByKey.value : yahooLeague.fgByKey.value))
const rosterSlots = computed(() => (isEspn.value ? espnPoints.rosterSlots.value : yahooLeague.rosterSlots.value))
const loading = computed(() => (isEspn.value ? espnPoints.loading.value : yahooLeague.loading.value))

// Precomputed player value for Season Outlook (baseball from FG, football from Sleeper).
// buildPointsMatchup below still consumes fgByKey directly (migrated in a later task).
const season = computed(() => '') // useFootballProjections falls back to Sleeper NFL state season
const { valueByKey } = usePointsValue({ pool, fgByKey, sport: computed(() => leagueStore.activeSport), season })

const myTeamKey = computed<string>(() => {
  if (isEspn.value) return espnPoints.myTeamId.value ?? ''
  const me = (leagueStore.yahooTeams ?? []).find((t: any) => t?.is_my_team)
  return me ? String(me.team_key) : ''
})
const myTeamName = computed<string>(() => {
  if (isEspn.value) return espnPoints.myTeamName.value || 'My Team'
  const me = (leagueStore.yahooTeams ?? []).find((t: any) => t?.is_my_team)
  return String(me?.name ?? 'My Team')
})
const myTeamLogo = computed<string>(() => {
  if (isEspn.value) return espnPoints.myTeamLogo.value
  const me = (leagueStore.yahooTeams ?? []).find((t: any) => t?.is_my_team)
  return String(me?.logo_url ?? '')
})

const matchup = computed(() => {
  const opp = oppSvc.opponent.value
  if (!opp || !pool.value.length || !Object.keys(rosterSlots.value).length || !myTeamKey.value) return null
  return buildPointsMatchup(pool.value, fgByKey.value, scoring.weights.value, myTeamKey.value, opp.opponentKey, rosterSlots.value, schedule.value)
})
// Today-only volume, for the daily cadence ("X hitter-games and Y starts today").
const dayMatchup = computed(() => {
  const opp = oppSvc.opponent.value
  if (!opp || !pool.value.length || !Object.keys(rosterSlots.value).length || !myTeamKey.value) return null
  return buildPointsMatchup(pool.value, fgByKey.value, scoring.weights.value, myTeamKey.value, opp.opponentKey, rosterSlots.value, todaySchedule.value)
})
const volMatchup = computed(() => (cadence.value === 'daily' ? dayMatchup.value : matchup.value))

const round = (n: number) => Math.round(n)
const onLogoErr = (e: Event) => ((e.target as HTMLElement).style.display = 'none')

const daysRemaining = computed(() => (7 - new Date().getDay()) % 7)
const myWinPct = computed(() => matchup.value?.myWinPct ?? 50)
const oppWinPct = computed(() => 100 - myWinPct.value)
const oppName = computed(() => oppSvc.opponent.value?.opponentName ?? 'Opponent')
const oppLogo = computed(() => oppSvc.opponent.value?.opponentLogo ?? '')

// App two-team palette (matches the category Matchup): you = cyan, opponent = amber.
const ME = '#5ec8e6'
const OPP = '#e69a4a'

// ── Season stakes (reuses the category engine) ────────────────────────────────
const leagueSize = computed(() => new Set(pool.value.map((p) => p.teamKey)).size || (leagueStore.yahooTeams?.length ?? 12))

// Real standings rank: same source as My Team's Season Outlook ("2nd of 12"),
// so the Matchup's "Nth of N" always agrees with My Team / League for the same
// team. Mirrors PointsMyTeamView.vue's teamMeta + useSeasonOutlook wiring.
const teamMeta = computed<Record<string, OutlookTeamMeta>>(() => {
  if (isEspn.value) {
    const out: Record<string, OutlookTeamMeta> = {}
    for (const [k, r] of Object.entries(espnPoints.teamRecords.value)) {
      out[k] = { wins: r.wins, losses: r.losses, ties: r.ties, pointsFor: r.pointsFor }
    }
    return out
  }
  const out: Record<string, OutlookTeamMeta> = {}
  for (const t of (leagueStore.yahooTeams ?? []) as any[]) {
    out[String(t.team_key)] = {
      wins: Number(t.wins ?? 0),
      losses: Number(t.losses ?? 0),
      ties: Number(t.ties ?? 0),
      pointsFor: Number(t.points_for ?? 0),
    }
  }
  return out
})
const { outlook } = useSeasonOutlook({
  pool,
  valueByKey,
  rosterSlots,
  myTeamKey,
  teamMeta,
})

const myRank = computed(() => {
  const real = outlook.value?.recordRank ?? 0
  if (real > 0) return real
  if (!isEspn.value) {
    const t = (leagueStore.yahooTeams ?? []).find((x: any) => x?.is_my_team)
    if (t?.rank && Number(t.rank) > 0) return Number(t.rank)
  }
  return Math.ceil(leagueSize.value / 2) // no real rank reachable yet (early render) → mid-table placeholder
})
const weeksLeft = computed(() => Math.max(0, leagueStore.playoffWeekStart - leagueStore.currentWeek))
const stakes = computed(() =>
  seasonStakes({
    rank: myRank.value,
    leagueSize: leagueSize.value,
    weeksLeft: weeksLeft.value,
    playoffSpots: Math.ceil(leagueSize.value / 2),
  }),
)

// One-line strategic read from the stakes + this week's matchup.
const path = computed(() => {
  const m = matchup.value
  if (!m) return ''
  const vol =
    m.gamesDiff >= 3
      ? 'you out-game them, so bank the counting stats'
      : m.gamesDiff <= -3
        ? 'they out-game you, so stream bats into your open days'
        : 'volume is even, so the edge is in streaming arms'
  switch (stakes.value.mode) {
    case 'coast':
      return stakes.value.coastKind === 'eliminated'
        ? 'Out of reach for the bracket — conserve your moves, no need to chase this week.'
        : 'Locked into the bracket — rest your guys and pick your spots.'
    case 'must-win':
      return `Must-win — empty the tank: ${vol}, and stream aggressively. There's no next week to save for.`
    case 'maximize':
      return `Every win is seeding now — push: ${vol}.`
    case 'clinch': // comfortably in — don't overspend on a single week
      return m.myWinPct >= 55
        ? 'Comfortably in and favored — bank the win, no need to overspend.'
        : m.myWinPct <= 45
          ? "Comfortably in but an underdog this week — your season's fine, so don't chase it."
          : `Comfortably in — pick your spots; chase this coin-flip only if the move is cheap (${vol}).`
    default:
      return m.myWinPct >= 55
        ? `You're favored — protect it: ${vol}.`
        : m.myWinPct <= 45
          ? `Underdog this week — you'll need the volume: ${vol}.`
          : `Coin-flip week — ${vol}.`
  }
})

// Daily-captured win-probability history → the trend line (same engine the
// category Matchup uses). Feeds my/opp win% keyed by league + week.
const trend = useWinProbTrend({
  leagueId: computed(() => leagueStore.activeLeagueId),
  week: computed(() => oppSvc.opponent.value?.week ?? 0),
  my: myWinPct,
  opp: computed(() => 100 - myWinPct.value),
  daysRemaining,
  ready: computed(() => !!matchup.value),
})
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-6">
    <div v-if="loading && !matchup" class="py-16 text-center text-dark-textMuted">Loading this week…</div>
    <div v-else-if="!oppSvc.opponent.value" class="py-16 text-center text-dark-textMuted">
      No matchup found for this week.
    </div>
    <div v-else-if="!matchup" class="py-16 text-center text-dark-textMuted">Assembling the week…</div>

    <template v-else>
      <!-- Versus header -->
      <section class="mb-3 rounded-xl border border-dark-border bg-dark-card px-4 py-3">
        <div class="mb-2 font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">
          Week {{ oppSvc.opponent.value.week }} · the battle plan
        </div>
        <div class="flex items-center justify-between gap-3">
          <!-- Me -->
          <div class="flex items-center gap-2">
            <img v-if="myTeamLogo" :src="myTeamLogo" alt="" @error="onLogoErr" class="h-9 w-9 rounded-lg bg-dark-border object-cover" />
            <div>
              <div class="text-[13px] font-bold text-dark-text">{{ myTeamName }}</div>
              <div class="font-mono text-lg font-extrabold leading-none" :style="{ color: ME }">{{ round(myWinPct) }}%</div>
            </div>
          </div>
          <!-- Center: days left + daily/weekly cadence -->
          <div class="flex flex-col items-center gap-1.5">
            <div class="font-mono text-[10px] text-dark-textMuted">{{ daysRemaining }}d left</div>
            <div class="inline-flex items-center gap-0.5 rounded-md border border-dark-border p-0.5 font-mono text-[9px]">
              <button type="button" class="rounded px-2 py-0.5 transition-colors"
                :class="cadence === 'daily' ? 'bg-dark-border text-dark-text' : 'text-dark-textMuted hover:text-dark-textSecondary'"
                @click="cadence = 'daily'">daily</button>
              <button type="button" class="rounded px-2 py-0.5 transition-colors"
                :class="cadence === 'weekly' ? 'bg-dark-border text-dark-text' : 'text-dark-textMuted hover:text-dark-textSecondary'"
                @click="cadence = 'weekly'">weekly</button>
            </div>
          </div>
          <!-- Opp -->
          <div class="flex flex-row-reverse items-center gap-2">
            <img v-if="oppLogo" :src="oppLogo" alt="" @error="onLogoErr" class="h-9 w-9 rounded-lg bg-dark-border object-cover" />
            <div class="text-right">
              <div class="text-[13px] font-bold text-dark-text">{{ oppName }}</div>
              <div class="font-mono text-lg font-extrabold leading-none" :style="{ color: OPP }">{{ round(oppWinPct) }}%</div>
            </div>
          </div>
        </div>
        <div class="mt-1.5 text-center font-mono text-[10px] text-dark-textMuted">
          projected {{ round(matchup.my.totalWeekly) }}–{{ round(matchup.opp.totalWeekly) }} pts this week
        </div>
      </section>

      <!-- Win-probability trend: the chart once 2+ daily readings exist; today's
           standing (two bars) before that — never a meaningless flat line. -->
      <section class="mb-3 rounded-xl border border-dark-border bg-dark-card px-4 pt-3 pb-2">
        <div class="flex items-center justify-between">
          <p class="font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">Win-probability trend</p>
          <p v-if="trend.points.length >= 2" class="font-mono text-[9px] text-dark-textMuted">solid = actual · dotted = projected</p>
        </div>
        <MatchupWinProbChart
          v-if="trend.points.length >= 2"
          :points="trend.points"
          :projected="trend.projected"
          :me-name="myTeamName"
          :opp-name="oppName"
          :height="trend.points.length >= 3 ? 160 : 120"
        />
        <div v-else class="mt-2 space-y-1.5 font-mono text-[11px]">
          <div class="flex items-center gap-2">
            <span class="w-32 shrink-0 truncate" :style="{ color: ME }">{{ myTeamName }}</span>
            <div class="relative h-1.5 flex-1 overflow-hidden rounded-full bg-dark-border/40">
              <div class="absolute inset-y-0 left-0 rounded-full" :style="{ width: round(myWinPct) + '%', backgroundColor: ME }" />
            </div>
            <span class="w-9 shrink-0 text-right tabular-nums" :style="{ color: ME }">{{ round(myWinPct) }}%</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="w-32 shrink-0 truncate" :style="{ color: OPP }">{{ oppName }}</span>
            <div class="relative h-1.5 flex-1 overflow-hidden rounded-full bg-dark-border/40">
              <div class="absolute inset-y-0 left-0 rounded-full" :style="{ width: round(oppWinPct) + '%', backgroundColor: OPP }" />
            </div>
            <span class="w-9 shrink-0 text-right tabular-nums" :style="{ color: OPP }">{{ round(oppWinPct) }}%</span>
          </div>
          <p class="pt-1 text-center font-mono text-[9px] text-dark-textMuted">
            Your daily win-probability line builds as the week goes — check in each day.
          </p>
        </div>
      </section>

      <!-- Stakes -->
      <section class="mb-3 rounded-xl border border-dark-border bg-dark-card px-4 py-3">
        <p class="font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">Stakes</p>
        <p class="mt-1 font-mono text-[11px] text-dark-text">{{ stakes.reasoning }}</p>
      </section>

      <!-- Your path -->
      <section class="mb-3 rounded-xl border border-primary/40 bg-dark-card px-4 py-3">
        <p class="font-mono text-[10px] uppercase tracking-widest text-primary">★ Your path</p>
        <p class="mt-1 text-sm text-dark-text">{{ path }}</p>
      </section>

      <!-- The volume lever (cadence-aware) -->
      <div v-if="volMatchup" class="mb-5 rounded-xl border border-dark-border bg-dark-card p-4">
        <h2 class="mb-3 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">
          The volume edge <span class="font-mono text-[10px] normal-case text-dark-textMuted/70">· {{ cadence === 'daily' ? 'today' : 'this week' }}</span>
        </h2>
        <p class="mb-3 text-sm text-dark-text">{{ volMatchup.volumeRead }}</p>

        <div class="grid grid-cols-2 gap-3 text-sm">
          <div class="rounded-lg bg-dark-bg/60 p-3">
            <div class="font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">Hitter-games {{ cadence === 'daily' ? 'today' : 'this week' }}</div>
            <div class="mt-1 flex items-baseline gap-2">
              <span class="text-xl font-semibold" :style="{ color: volMatchup.gamesDiff >= 0 ? ME : OPP }">{{ volMatchup.my.hitterGames }}</span>
              <span class="text-dark-textMuted">vs {{ volMatchup.opp.hitterGames }}</span>
            </div>
          </div>
          <div class="rounded-lg bg-dark-bg/60 p-3">
            <div class="font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">{{ cadence === 'daily' ? 'Starts today' : 'Two-start arms' }}</div>
            <div class="mt-1 flex items-baseline gap-2">
              <span class="text-xl font-semibold text-dark-text">{{ cadence === 'daily' ? volMatchup.my.pitcherStarts : volMatchup.my.twoStartArms.length }}</span>
              <span class="text-dark-textMuted">vs {{ cadence === 'daily' ? volMatchup.opp.pitcherStarts : volMatchup.opp.twoStartArms.length }}</span>
            </div>
            <div v-if="cadence === 'weekly' && volMatchup.my.twoStartArms.length" class="mt-1 font-mono text-[11px]" :style="{ color: ME }">
              {{ volMatchup.my.twoStartArms.map((a) => a.name).join(' · ') }}
            </div>
          </div>
        </div>

        <!-- Empty-slot leakage -->
        <p v-if="volMatchup.my.openHitterSlots > 0" class="mt-3 rounded-lg bg-[#FF5C5C]/10 px-3 py-2 text-sm text-[#FF5C5C]">
          You're leaving {{ volMatchup.my.openHitterSlots }} lineup slot{{ volMatchup.my.openHitterSlots > 1 ? 's' : '' }} empty —
          games on the bench. Plug a body before games lock.
        </p>
      </div>

      <!-- Close the gap -->
      <div class="rounded-xl border border-dark-border bg-dark-card p-4 text-sm text-dark-textMuted">
        Need more bites at the apple this week?
        <router-link to="/players" class="text-primary hover:underline">stream a bat or a two-start arm → The Wire</router-link>
      </div>
    </template>
  </div>
</template>
