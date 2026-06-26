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

// Who's favored this week = projected hitter points + a pitching-start nudge.
const myEdge = computed(() => {
  const m = matchup.value
  if (!m) return null
  const diff = m.my.weeklyHitterPoints - m.opp.weeklyHitterPoints
  return { diff, leading: diff > 0 }
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

      <!-- This week's projected hitter output -->
      <div class="mb-5 rounded-xl border border-dark-border bg-dark-card p-4">
        <div class="font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">This week · projected hitter points</div>
        <div class="mt-2 flex items-center gap-4">
          <div>
            <div class="text-2xl font-display font-bold" :class="myEdge?.leading ? 'text-primary' : 'text-dark-text'">
              {{ round(matchup.my.weeklyHitterPoints) }}
            </div>
            <div class="font-mono text-[11px] text-dark-textMuted">you</div>
          </div>
          <span class="font-mono text-sm text-dark-textMuted">–</span>
          <div>
            <div class="text-2xl font-display font-bold" :class="!myEdge?.leading ? 'text-[#FF5C5C]' : 'text-dark-text'">
              {{ round(matchup.opp.weeklyHitterPoints) }}
            </div>
            <div class="font-mono text-[11px] text-dark-textMuted">{{ oppSvc.opponent.value.opponentName }}</div>
          </div>
          <div class="ml-auto text-right font-mono text-[11px] text-dark-textMuted">
            from your bats' games this week<br />(pitching counted separately below)
          </div>
        </div>
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
