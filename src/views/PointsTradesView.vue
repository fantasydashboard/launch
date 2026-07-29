<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useYahooLeaguePool } from '@/composables/useYahooLeaguePool'
import { useEspnPointsTeamData } from '@/composables/useEspnPointsTeamData'
import { useLeagueScoring } from '@/composables/useLeagueScoring'
import { buildPointsTrades } from '@/myteam/pointsTrades'
import { buildPointsTradeLandscape } from '@/myteam/pointsTradeLandscape'
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

const landscape = computed(() => {
  if (!pool.value.length || !myTeamKey.value) return null
  return buildPointsTradeLandscape(pool.value, fgByKey.value, scoring.weights.value, myTeamKey.value, teamNames.value, leagueStore.activeSport)
})

// Short column label for the heatmap (initials / first chars of the team name).
function shortName(name: string): string {
  const cleaned = (name || '').replace(/[^A-Za-z0-9 ]/g, '').trim()
  const parts = cleaned.split(/\s+/).filter(Boolean)
  const abbr = parts.length > 1 ? parts.map((w) => w[0]).join('') : cleaned.slice(0, 3)
  return (abbr || 'TM').toUpperCase().slice(0, 3)
}
function heatClass(rank: number, teams: number): string {
  if (!rank) return 'text-dark-textMuted/40'
  const f = rank / teams
  if (f <= 0.34) return 'bg-primary/20 text-primary'
  if (f >= 0.67) return 'bg-[#FF5C5C]/15 text-[#FF5C5C]'
  return 'text-dark-textMuted'
}

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

    <div v-if="loading && !landscape" class="py-16 text-center text-dark-textMuted">Scanning the league…</div>

    <template v-else>
      <!-- YOUR LEVERAGE -->
      <section v-if="landscape && (landscape.myStrong.length || landscape.myWeak.length)" class="mb-4 rounded-xl border border-dark-border bg-dark-card px-4 py-3">
        <p class="font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">Your leverage</p>
        <div class="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1 font-mono text-[11px]">
          <span class="w-14 shrink-0 text-dark-textMuted">trade from</span>
          <span v-for="p in landscape.myStrong" :key="'s' + p" class="rounded bg-primary/10 px-1.5 py-0.5 text-primary">{{ p }}</span>
          <span v-if="!landscape.myStrong.length" class="text-dark-textMuted/60">no clear surplus position</span>
        </div>
        <div class="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 font-mono text-[11px]">
          <span class="w-14 shrink-0 text-dark-textMuted">to fix</span>
          <span v-for="p in landscape.myWeak" :key="'w' + p" class="rounded bg-[#FF5C5C]/10 px-1.5 py-0.5 text-[#FF5C5C]">{{ p }}</span>
          <span v-if="!landscape.myWeak.length" class="text-dark-textMuted/60">no glaring hole</span>
        </div>
        <p class="mt-1.5 font-mono text-[9px] text-dark-textMuted">deal a body from a spot you're deep → land one where you're thin.</p>
      </section>

      <!-- BEST DEALS -->
      <p v-if="ideas.length" class="mb-3 font-mono text-[11px] text-dark-textMuted">
        ★ Best deals — send a bench body, get one that <span class="text-primary">starts</span> for you. Both lineups improve.
      </p>
      <div v-if="!ideas.length && !loading" class="mb-4 rounded-xl border border-dark-border bg-dark-card px-4 py-6 text-center text-sm text-dark-textMuted">
        No clean win-win swap right now — use the partners and landscape below to target a deal.
      </div>

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

      <p v-if="ideas.length" class="mb-5 font-mono text-[10px] leading-relaxed text-dark-textMuted">
        gain = the lift to each side's optimal starting-lineup projected points · surplus-for-surplus, so neither side loses a starter
      </p>

      <!-- BEST TRADE PARTNERS -->
      <section v-if="landscape && landscape.partners.length" class="mb-4">
        <p class="mb-1 font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">Best trade partners</p>
        <p class="mb-2 font-mono text-[9px] text-dark-textMuted">they hold what you need, you hold what they need</p>
        <div class="divide-y divide-dark-border/40 rounded-xl border border-dark-border bg-dark-card">
          <div v-for="p in landscape.partners" :key="p.teamKey" class="flex items-center gap-3 px-4 py-2.5">
            <span class="w-32 shrink-0 truncate text-sm text-dark-text">{{ p.teamName }}</span>
            <span class="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px]">
              <template v-if="p.youBuy.length">
                <span class="text-dark-textMuted">you buy</span>
                <span v-for="x in p.youBuy" :key="'b' + x" class="text-primary">{{ x }}</span>
              </template>
              <template v-if="p.theyNeed.length">
                <span class="text-dark-textMuted">they need</span>
                <span v-for="x in p.theyNeed" :key="'n' + x" class="text-[#e69a4a]">{{ x }}</span>
              </template>
            </span>
          </div>
        </div>
      </section>

      <!-- TRADE LANDSCAPE -->
      <section v-if="landscape && landscape.positions.length">
        <p class="mb-2 font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">Trade landscape</p>
        <div class="overflow-x-auto rounded-xl border border-dark-border bg-dark-card">
          <table class="w-full border-collapse text-center font-mono text-[11px]">
            <thead>
              <tr>
                <th class="px-2 py-1.5"></th>
                <th v-for="t in landscape.teamKeys" :key="t" class="px-1.5 py-1.5" :class="t === myTeamKey ? 'text-primary' : 'text-dark-textMuted'">
                  {{ t === myTeamKey ? 'YOU' : shortName(landscape.teamNames[t]) }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="pos in landscape.positions" :key="pos" class="border-t border-dark-border/30">
                <td class="px-2 py-1 text-left text-dark-textMuted">{{ pos }}</td>
                <td v-for="t in landscape.teamKeys" :key="t" class="px-1.5 py-1"
                  :class="[heatClass(landscape.rank[pos][t], landscape.teams), t === myTeamKey ? 'ring-1 ring-inset ring-primary/40' : '']">
                  {{ landscape.rank[pos][t] || '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="mt-2 font-mono text-[9px] leading-relaxed text-dark-textMuted">
          each cell = that team's rank at the position (its best body's projected points) ·
          <span class="text-primary">green</span> strong · <span class="text-[#FF5C5C]">red</span> weak ·
          a partner green where you're red is your best fit
        </p>
      </section>
    </template>
  </div>
</template>
