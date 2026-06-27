<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useYahooLeaguePool } from '@/composables/useYahooLeaguePool'
import { useEspnPointsTeamData } from '@/composables/useEspnPointsTeamData'
import { useLeagueScoring } from '@/composables/useLeagueScoring'
import { buildPointsTeam, type PointsPoolPlayer } from '@/myteam/pointsTeam'
import { buildPowerRankings, type PowerTeamInput } from '@/league/powerRankings'

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

// teamKey → {name, logo, wins, losses, ties, pointsFor} for both platforms.
interface Meta { name: string; logo: string; wins: number; losses: number; ties: number; pointsFor: number }
const teamMeta = computed<Record<string, Meta>>(() => {
  if (isEspn.value) {
    const names = espnPoints.teamNames.value
    const logos = espnPoints.teamLogos.value
    const recs = espnPoints.teamRecords.value
    const out: Record<string, Meta> = {}
    for (const k of Object.keys(names)) {
      const r = recs[k] ?? { wins: 0, losses: 0, ties: 0, pointsFor: 0 }
      out[k] = { name: names[k] || 'Team', logo: logos[k] || '', wins: r.wins, losses: r.losses, ties: r.ties, pointsFor: r.pointsFor }
    }
    return out
  }
  const out: Record<string, Meta> = {}
  for (const t of leagueStore.yahooTeams ?? []) {
    out[String(t.team_key)] = {
      name: String(t.name ?? 'Team'),
      logo: String(t.logo_url ?? ''),
      wins: Number(t.wins ?? 0),
      losses: Number(t.losses ?? 0),
      ties: Number(t.ties ?? 0),
      pointsFor: Number(t.points_for ?? 0),
    }
  }
  return out
})

// Roster STRENGTH per team = projected optimal-lineup points (points-league basis).
const rankings = computed(() => {
  if (!pool.value.length || !Object.keys(rosterSlots.value).length || !myTeamKey.value) return null
  const model = buildPointsTeam(pool.value, fgByKey.value, scoring.weights.value, myTeamKey.value, rosterSlots.value)
  const meta = teamMeta.value
  const inputs: PowerTeamInput[] = model.standings.map((s) => {
    const m = meta[s.teamKey] ?? { name: 'Team', logo: '', wins: 0, losses: 0, ties: 0, pointsFor: 0 }
    return { teamKey: s.teamKey, teamName: m.name, teamLogo: m.logo, strength: s.startingPoints, wins: m.wins, losses: m.losses, ties: m.ties, pointsFor: m.pointsFor }
  })
  return buildPowerRankings(inputs)
})

const maxStrength = computed(() => Math.max(1, ...(rankings.value?.rows.map((r) => r.strength) ?? [1])))
const round = (n: number) => Math.round(n)
const ord = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
const onLogoErr = (e: Event) => ((e.target as HTMLElement).style.display = 'none')
const isMe = (key: string) => key === myTeamKey.value
const recordStr = (r: { wins: number; losses: number; ties: number }) => `${r.wins}-${r.losses}${r.ties ? `-${r.ties}` : ''}`
const tierClass = (tier: string) =>
  tier === 'Contender' ? 'text-primary' : tier === 'Rebuilder' ? 'text-dark-textMuted' : 'text-dark-textSecondary'
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-6">
    <header class="mb-4">
      <h1 class="font-display text-2xl font-bold text-dark-text">Power Rankings</h1>
      <p class="font-mono text-xs text-dark-textMuted">Who's actually good — ranked by roster talent, not record.</p>
    </header>

    <div v-if="loading && !rankings" class="py-16 text-center text-dark-textMuted">Sizing up the league…</div>
    <div v-else-if="!rankings" class="py-16 text-center text-dark-textMuted">Couldn't assemble the league yet. Try a refresh.</div>

    <template v-else>
      <!-- Pretenders & sleepers — the cheat code -->
      <div v-if="rankings.pretenders.length || rankings.sleepers.length" class="mb-5 grid gap-3 sm:grid-cols-2">
        <div v-if="rankings.pretenders.length" class="rounded-xl border border-[#e69a4a]/30 bg-dark-card p-4">
          <p class="font-mono text-[10px] uppercase tracking-widest text-[#e69a4a]">Pretenders · sell high</p>
          <p class="mb-2 font-mono text-[9px] text-dark-textMuted">good record, thin roster — due to regress</p>
          <div v-for="r in rankings.pretenders" :key="r.teamKey" class="flex items-center gap-2 border-t border-dark-border/40 py-1.5 first:border-0 text-sm">
            <span class="truncate text-dark-text">{{ r.teamName }}</span>
            <span class="ml-auto font-mono text-[11px] text-dark-textMuted">{{ recordStr(r) }} record · {{ ord(r.strengthRank) }} talent</span>
          </div>
        </div>
        <div v-if="rankings.sleepers.length" class="rounded-xl border border-primary/30 bg-dark-card p-4">
          <p class="font-mono text-[10px] uppercase tracking-widest text-primary">Sleepers · buy low</p>
          <p class="mb-2 font-mono text-[9px] text-dark-textMuted">strong roster, unlucky record — they'll climb</p>
          <div v-for="r in rankings.sleepers" :key="r.teamKey" class="flex items-center gap-2 border-t border-dark-border/40 py-1.5 first:border-0 text-sm">
            <span class="truncate text-dark-text">{{ r.teamName }}</span>
            <span class="ml-auto font-mono text-[11px] text-dark-textMuted">{{ recordStr(r) }} record · {{ ord(r.strengthRank) }} talent</span>
          </div>
        </div>
      </div>

      <!-- The board -->
      <div class="rounded-xl border border-dark-border bg-dark-card divide-y divide-dark-border/40">
        <div v-for="r in rankings.rows" :key="r.teamKey" class="px-4 py-3" :class="isMe(r.teamKey) ? 'bg-primary/5' : ''">
          <div class="flex items-center gap-3">
            <span class="w-6 shrink-0 text-center font-mono text-sm font-bold text-dark-textMuted">{{ r.strengthRank }}</span>
            <img v-if="r.teamLogo" :src="r.teamLogo" alt="" @error="onLogoErr" class="h-8 w-8 shrink-0 rounded-full bg-dark-border object-cover" />
            <span v-else class="h-8 w-8 shrink-0 rounded-full bg-dark-border" />
            <span class="min-w-0 flex-1">
              <span class="flex items-center gap-2">
                <span class="truncate text-sm font-semibold text-dark-text">{{ r.teamName }}</span>
                <span v-if="isMe(r.teamKey)" class="shrink-0 rounded bg-primary/15 px-1 font-mono text-[9px] uppercase text-primary">you</span>
                <span class="shrink-0 font-mono text-[9px] uppercase tracking-wider" :class="tierClass(r.tier)">{{ r.tier }}</span>
              </span>
              <span class="flex items-center gap-2 font-mono text-[11px] text-dark-textMuted">
                {{ recordStr(r) }}
                <span v-if="r.luck === 'pretender'" class="text-[#e69a4a]">· lucky (record {{ Math.abs(r.luckDelta) }} ahead of talent)</span>
                <span v-else-if="r.luck === 'sleeper'" class="text-primary">· unlucky (talent {{ Math.abs(r.luckDelta) }} ahead of record)</span>
              </span>
            </span>
            <!-- Strength bar -->
            <div class="hidden w-28 shrink-0 sm:block">
              <div class="relative h-2 overflow-hidden rounded-full bg-dark-bg">
                <div class="absolute inset-y-0 left-0 rounded-full bg-primary/70" :style="{ width: (r.strength / maxStrength) * 100 + '%' }" />
              </div>
              <div class="mt-0.5 text-right font-mono text-[9px] text-dark-textMuted">{{ round(r.strength) }} proj</div>
            </div>
          </div>
          <p class="mt-1.5 pl-9 font-mono text-[11px] leading-snug text-dark-textMuted">{{ r.blurb }}</p>
        </div>
      </div>

      <p class="mt-3 font-mono text-[10px] leading-relaxed text-dark-textMuted">
        rank = roster strength (projected optimal-lineup points) · the standings can lie — a lucky team regresses, an unlucky one climbs
      </p>
    </template>
  </div>
</template>
