<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useYahooLeaguePool } from '@/composables/useYahooLeaguePool'
import { useEspnPointsTeamData } from '@/composables/useEspnPointsTeamData'
import { useLeagueScoring } from '@/composables/useLeagueScoring'
import { buildPointsTrades } from '@/myteam/pointsTrades'
import type { PointsPoolPlayer } from '@/myteam/pointsTeam'
import { mlbTeamLogo } from '@/players/mlbTeamLogo'

const leagueStore = useLeagueStore()
const isEspn = computed(() => leagueStore.activePlatform === 'espn')

const yahooLeague = useYahooLeaguePool()
const espnPoints = useEspnPointsTeamData()
const scoring = useLeagueScoring()

function loadAll() {
  scoring.load()
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
const teamNames = computed<Record<string, string>>(() => {
  if (isEspn.value) return espnPoints.teamNames.value
  return Object.fromEntries((leagueStore.yahooTeams ?? []).map((t: any) => [String(t.team_key), String(t.name ?? '')]))
})

const ideas = computed(() => {
  if (!pool.value.length || !Object.keys(rosterSlots.value).length || !myTeamKey.value) return []
  return buildPointsTrades(pool.value, fgByKey.value, scoring.weights.value, myTeamKey.value, rosterSlots.value, teamNames.value)
})

const round = (n: number) => Math.round(n)
const onLogoErr = (e: Event) => ((e.target as HTMLElement).style.display = 'none')
// Fairness read: who the deal favors, by comparing the two lineup gains honestly.
function fairness(myGain: number, theirGain: number): string {
  const hi = Math.max(myGain, theirGain)
  const lo = Math.min(myGain, theirGain)
  if (hi === 0 || lo >= 0.6 * hi) return 'even — both win'
  return myGain > theirGain ? 'favors you' : "favors them — easy yes"
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-6">
    <header class="mb-4">
      <h1 class="font-display text-2xl font-bold text-dark-text">Trades</h1>
      <p class="font-mono text-xs text-dark-textMuted">Deals that raise your projected points — and the other guy's too.</p>
    </header>

    <div v-if="loading && !ideas.length" class="py-16 text-center text-dark-textMuted">Scanning the league…</div>
    <div v-else-if="!ideas.length" class="rounded-xl border border-dark-border bg-dark-card px-4 py-10 text-center text-sm text-dark-textMuted">
      No win-win deals right now — every team's bench surplus already lines up with their own needs.
      Check back as rosters shift, or make a move on The Wire.
    </div>

    <template v-else>
      <p class="mb-3 font-mono text-[11px] text-dark-textMuted">
        ★ Best deals — you send a body that rides your bench, get one that <span class="text-primary">starts</span> for you.
        Both lineups improve, so it's a deal they'd take.
      </p>

      <div v-for="(idea, i) in ideas" :key="i" class="mb-3 rounded-xl border border-dark-border bg-dark-card p-4">
        <div class="mb-2 flex items-center justify-between">
          <span class="font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">with {{ idea.oppTeamName }}</span>
          <span class="text-right">
            <span class="font-mono text-sm font-bold text-primary">+{{ idea.myGain }}</span>
            <span class="ml-1 font-mono text-[9px] uppercase text-dark-textMuted">pts to you</span>
          </span>
        </div>

        <div class="flex items-center gap-3">
          <!-- GET (their player → you) -->
          <div class="flex min-w-0 flex-1 items-center gap-2">
            <img v-if="idea.get.headshot" :src="idea.get.headshot" :alt="idea.get.name" loading="lazy" class="h-9 w-9 shrink-0 rounded-full bg-dark-border object-cover" />
            <span v-else class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-dark-border font-mono text-[10px] text-dark-textMuted">{{ idea.get.position }}</span>
            <span class="min-w-0">
              <span class="block font-mono text-[9px] uppercase text-primary">get</span>
              <span class="truncate text-sm font-semibold text-dark-text">{{ idea.get.name }}</span>
              <span class="flex items-center gap-1 text-[11px] text-dark-textMuted">
                {{ idea.get.position }} ·
                <img :src="mlbTeamLogo(idea.get.proTeam)" alt="" @error="onLogoErr" class="h-3 w-3 object-contain" />{{ idea.get.proTeam }} ·
                {{ round(idea.get.points) }} pts
              </span>
            </span>
          </div>

          <span class="shrink-0 font-mono text-xs text-dark-textMuted">⇄</span>

          <!-- GIVE (your player → them) -->
          <div class="flex min-w-0 flex-1 flex-row-reverse items-center gap-2 text-right">
            <img v-if="idea.give.headshot" :src="idea.give.headshot" :alt="idea.give.name" loading="lazy" class="h-9 w-9 shrink-0 rounded-full bg-dark-border object-cover" />
            <span v-else class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-dark-border font-mono text-[10px] text-dark-textMuted">{{ idea.give.position }}</span>
            <span class="min-w-0">
              <span class="block font-mono text-[9px] uppercase text-dark-textMuted">give</span>
              <span class="truncate text-sm font-semibold text-dark-text">{{ idea.give.name }}</span>
              <span class="flex flex-row-reverse items-center gap-1 text-[11px] text-dark-textMuted">
                {{ idea.give.position }} ·
                <img :src="mlbTeamLogo(idea.give.proTeam)" alt="" @error="onLogoErr" class="h-3 w-3 object-contain" />{{ idea.give.proTeam }} ·
                {{ round(idea.give.points) }} pts
              </span>
            </span>
          </div>
        </div>

        <div class="mt-2 flex items-center justify-between border-t border-dark-border/40 pt-2 font-mono text-[10px] text-dark-textMuted">
          <span>they gain <span class="text-[#e69a4a]">+{{ idea.theirGain }}</span> — {{ fairness(idea.myGain, idea.theirGain) }}</span>
          <span>both lineups improve</span>
        </div>
      </div>

      <p class="font-mono text-[10px] leading-relaxed text-dark-textMuted">
        gain = the lift to each side's optimal starting-lineup projected points · surplus-for-surplus, so neither side loses a starter
      </p>
    </template>
  </div>
</template>
