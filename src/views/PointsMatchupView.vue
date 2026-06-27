<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useYahooLeaguePool } from '@/composables/useYahooLeaguePool'
import { useEspnPointsTeamData } from '@/composables/useEspnPointsTeamData'
import { useLeagueScoring } from '@/composables/useLeagueScoring'
import { useThisWeekOpponent } from '@/composables/useThisWeekOpponent'
import { buildPointsMatchup } from '@/myteam/pointsMatchup'
import type { PointsPoolPlayer } from '@/myteam/pointsTeam'
import { getWeekSchedule, type WeekSchedule } from '@/services/mlbSchedule'
import { useWinProbTrend } from '@/composables/useWinProbTrend'
import MatchupWinProbChart from '@/components/matchup/MatchupWinProbChart.vue'

const leagueStore = useLeagueStore()
const isEspn = computed(() => leagueStore.activePlatform === 'espn')

const yahooLeague = useYahooLeaguePool()
const espnPoints = useEspnPointsTeamData()
const scoring = useLeagueScoring()
const oppSvc = useThisWeekOpponent()
const schedule = ref<WeekSchedule>({ gamesByTeam: {}, startsByPitcher: {} })

async function loadSchedule() {
  const today = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const end = new Date(today)
  end.setDate(today.getDate() + ((7 - today.getDay()) % 7)) // through the coming Sunday
  schedule.value = await getWeekSchedule(fmt(today), fmt(end))
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

const round = (n: number) => Math.round(n)
const onLogoErr = (e: Event) => ((e.target as HTMLElement).style.display = 'none')

const daysRemaining = computed(() => (7 - new Date().getDay()) % 7)
const myWinPct = computed(() => matchup.value?.myWinPct ?? 50)

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
      <!-- Header: you vs opponent -->
      <div class="mb-5">
        <div class="font-mono text-[11px] uppercase tracking-wider text-dark-textMuted">
          Week {{ oppSvc.opponent.value.week }} · the battle plan
        </div>
        <div class="mt-2 flex items-center gap-3">
          <img v-if="myTeamLogo" :src="myTeamLogo" alt="" @error="onLogoErr" class="h-9 w-9 rounded-full bg-dark-border object-cover" />
          <span class="text-lg font-display font-bold text-dark-text">{{ myTeamName }}</span>
          <span class="font-mono text-xs text-dark-textMuted">vs</span>
          <img v-if="oppSvc.opponent.value.opponentLogo" :src="oppSvc.opponent.value.opponentLogo" alt="" @error="onLogoErr"
            class="h-9 w-9 rounded-full bg-dark-border object-cover" />
          <span class="text-lg font-display font-bold text-dark-text">{{ oppSvc.opponent.value.opponentName }}</span>
        </div>
      </div>

      <!-- Win probability + projected weekly total -->
      <div class="mb-5 rounded-xl border border-dark-border bg-dark-card p-4">
        <div class="flex items-baseline justify-between">
          <div class="font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">Win probability</div>
          <div class="font-mono text-[10px] text-dark-textMuted">{{ daysRemaining }} day{{ daysRemaining === 1 ? '' : 's' }} left</div>
        </div>
        <div class="mt-1 flex items-end gap-3">
          <span class="text-4xl font-display font-bold" :class="myWinPct >= 50 ? 'text-primary' : 'text-[#FF5C5C]'">{{ round(myWinPct) }}%</span>
          <span class="pb-1 text-sm text-dark-textMuted">to win the week</span>
        </div>
        <!-- Win-probability split bar -->
        <div class="mt-3 flex h-2 overflow-hidden rounded-full bg-dark-bg">
          <div class="bg-primary" :style="{ width: myWinPct + '%' }" />
          <div class="bg-[#FF5C5C]/60" :style="{ width: 100 - myWinPct + '%' }" />
        </div>
        <div class="mt-2 flex justify-between font-mono text-[11px] text-dark-textMuted">
          <span>{{ myTeamName }} · {{ round(matchup.my.totalWeekly) }} proj pts</span>
          <span>{{ oppSvc.opponent.value.opponentName }} · {{ round(matchup.opp.totalWeekly) }}</span>
        </div>
      </div>

      <!-- Win-probability trend: real once ≥2 daily readings exist -->
      <div v-if="trend.points.length >= 2" class="mb-5 rounded-xl border border-dark-border bg-dark-card px-4 pt-3 pb-2">
        <div class="mb-1 flex items-baseline justify-between">
          <p class="font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">Win-probability trend</p>
          <p class="font-mono text-[9px] text-dark-textMuted">solid = actual · dotted = projected</p>
        </div>
        <MatchupWinProbChart
          :points="trend.points"
          :projected="trend.projected"
          :meName="myTeamName"
          :oppName="oppSvc.opponent.value.opponentName"
          :height="trend.points.length >= 3 ? 160 : 120"
        />
      </div>
      <div v-else class="mb-5 rounded-xl border border-dark-border bg-dark-card px-4 py-3 font-mono text-[11px] text-dark-textMuted">
        Win-probability trend builds as the week goes — check back tomorrow for the line.
      </div>

      <!-- The volume lever -->
      <div class="mb-5 rounded-xl border border-dark-border bg-dark-card p-4">
        <h2 class="mb-3 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">The volume edge</h2>
        <p class="mb-3 text-sm text-dark-text">{{ matchup.volumeRead }}</p>

        <div class="grid grid-cols-2 gap-3 text-sm">
          <div class="rounded-lg bg-dark-bg/60 p-3">
            <div class="font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">Hitter-games this week</div>
            <div class="mt-1 flex items-baseline gap-2">
              <span class="text-xl font-semibold" :class="matchup.gamesDiff >= 0 ? 'text-primary' : 'text-[#FF5C5C]'">{{ matchup.my.hitterGames }}</span>
              <span class="text-dark-textMuted">vs {{ matchup.opp.hitterGames }}</span>
            </div>
          </div>
          <div class="rounded-lg bg-dark-bg/60 p-3">
            <div class="font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">Two-start arms</div>
            <div class="mt-1 flex items-baseline gap-2">
              <span class="text-xl font-semibold text-dark-text">{{ matchup.my.twoStartArms.length }}</span>
              <span class="text-dark-textMuted">vs {{ matchup.opp.twoStartArms.length }}</span>
            </div>
            <div v-if="matchup.my.twoStartArms.length" class="mt-1 font-mono text-[11px] text-primary">
              {{ matchup.my.twoStartArms.map((a) => a.name).join(' · ') }}
            </div>
          </div>
        </div>

        <!-- Empty-slot leakage -->
        <p v-if="matchup.my.openHitterSlots > 0" class="mt-3 rounded-lg bg-[#FF5C5C]/10 px-3 py-2 text-sm text-[#FF5C5C]">
          You're leaving {{ matchup.my.openHitterSlots }} lineup slot{{ matchup.my.openHitterSlots > 1 ? 's' : '' }} empty —
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
