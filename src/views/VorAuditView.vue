<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useActivePointsSource } from '@/composables/useActivePointsSource'
import { useFootballVor } from '@/composables/useFootballVor'

const leagueStore = useLeagueStore()
const isFootball = computed(() => leagueStore.activeSport === 'football')
const source = useActivePointsSource()
const season = computed(() => '')

const { vorByKey, audit, loading } = useFootballVor({
  pool: source.pool,
  freeAgents: source.freeAgents,
  slots: source.rosterSlots,
  teams: source.leagueSize,
  season,
  enabled: isFootball,
})

function loadAll() {
  source.load()
  source.loadFreeAgents(200)
}
onMounted(loadAll)
watch(() => leagueStore.activeLeagueId, loadAll)

const leagueSizeSource = computed(() => source.leagueSizeSource.value)
const round = (n: number) => Math.round(n * 10) / 10

// Every player, best VOR first — the derivation table.
const rows = computed(() =>
  Object.values(vorByKey.value)
    .map((v) => ({
      playerKey: v.playerKey,
      position: v.position,
      pointsRos: v.pointsRos,
      vorRos: v.vorRos,
      replacement: v.pointsRos - v.vorRos,
      confidence: v.confidence,
    }))
    .sort((a, b) => b.vorRos - a.vorRos)
    .slice(0, 200),
)
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-6">
    <header class="mb-4">
      <h1 class="font-display text-2xl font-bold text-dark-text">VOR Audit</h1>
      <p class="font-mono text-xs text-dark-textMuted">how every football VOR number was produced</p>
    </header>

    <div v-if="!isFootball" class="rounded-xl border border-dark-border bg-dark-card px-4 py-16 text-center">
      <p class="font-display text-sm font-semibold text-dark-text">Football only</p>
      <p class="mt-1 font-mono text-xs text-dark-textMuted">The VOR engine runs for football leagues. Switch to one to audit it.</p>
    </div>

    <div v-else-if="loading && !audit" class="py-16 text-center text-dark-textMuted">Loading the engine…</div>

    <div v-else-if="!audit" class="py-16 text-center text-dark-textMuted">No VOR output to audit yet.</div>

    <template v-else>
      <!-- INPUTS -->
      <section class="mb-5 rounded-xl border border-dark-border bg-dark-card p-4">
        <h2 class="mb-3 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">Inputs</h2>
        <dl class="grid grid-cols-2 gap-y-2 font-mono text-xs sm:grid-cols-4">
          <div>
            <dt class="text-dark-textMuted">league size</dt>
            <dd class="text-sm font-bold text-dark-text">{{ audit.teams }}</dd>
          </div>
          <div>
            <dt class="text-dark-textMuted">size source</dt>
            <dd class="text-sm" :class="leagueSizeSource === 'default' ? 'text-amber-400' : 'text-dark-text'">
              {{ leagueSizeSource }}
            </dd>
          </div>
          <div>
            <dt class="text-dark-textMuted">players</dt>
            <dd class="text-sm text-dark-text">{{ audit.playerCount }}</dd>
          </div>
          <div>
            <dt class="text-dark-textMuted">weekly maps</dt>
            <dd class="text-sm text-dark-text">{{ audit.weeklyMapCount }}</dd>
          </div>
        </dl>
        <p class="mt-3 font-mono text-[10px] text-dark-textMuted">
          slots: <span class="text-dark-text">{{ JSON.stringify(audit.slots) }}</span>
        </p>
      </section>

      <!-- REPLACEMENT LEVELS -->
      <section class="mb-5 overflow-x-auto rounded-xl border border-dark-border bg-dark-card p-4">
        <h2 class="mb-1 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">Replacement levels</h2>
        <p class="mb-3 font-mono text-[10px] text-dark-textMuted">replacement = points of the first player off the startable list</p>
        <table class="w-full min-w-[28rem] text-left font-mono text-xs">
          <thead class="text-dark-textMuted">
            <tr class="border-b border-dark-border">
              <th class="py-1.5 pr-3">pos</th>
              <th class="py-1.5 pr-3 text-right">startable</th>
              <th class="py-1.5 pr-3 text-right">available</th>
              <th class="py-1.5 pr-3 text-right">repl (ROS)</th>
              <th class="py-1.5 text-right">repl (wk 1)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in audit.positions" :key="p.position" class="border-b border-dark-border/40 last:border-0">
              <td class="py-1.5 pr-3 font-semibold text-dark-text">{{ p.position }}</td>
              <td class="py-1.5 pr-3 text-right text-dark-text">{{ p.startable }}</td>
              <td class="py-1.5 pr-3 text-right text-dark-textMuted">{{ p.playersAtPosition }}</td>
              <td class="py-1.5 pr-3 text-right text-dark-text">{{ round(p.replacement) }}</td>
              <td class="py-1.5 text-right text-dark-textMuted">{{ round(p.replacementWeek1) }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- PLAYER DERIVATION -->
      <section class="overflow-x-auto rounded-xl border border-dark-border bg-dark-card p-4">
        <h2 class="mb-1 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">Player derivation</h2>
        <p class="mb-3 font-mono text-[10px] text-dark-textMuted">points − replacement = VOR · top 200 by VOR</p>
        <table class="w-full min-w-[30rem] text-left font-mono text-xs">
          <thead class="text-dark-textMuted">
            <tr class="border-b border-dark-border">
              <th class="py-1.5 pr-3">key</th>
              <th class="py-1.5 pr-3">pos</th>
              <th class="py-1.5 pr-3 text-right">points</th>
              <th class="py-1.5 pr-3 text-right">− repl</th>
              <th class="py-1.5 pr-3 text-right">= VOR</th>
              <th class="py-1.5 text-right">conf</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.playerKey" class="border-b border-dark-border/40 last:border-0">
              <td class="py-1.5 pr-3 text-dark-textMuted">{{ r.playerKey }}</td>
              <td class="py-1.5 pr-3 text-dark-text">{{ r.position }}</td>
              <td class="py-1.5 pr-3 text-right text-dark-text">{{ round(r.pointsRos) }}</td>
              <td class="py-1.5 pr-3 text-right text-dark-textMuted">{{ round(r.replacement) }}</td>
              <td class="py-1.5 pr-3 text-right font-bold text-dark-text">{{ round(r.vorRos) }}</td>
              <td class="py-1.5 text-right" :class="r.confidence === 'low' ? 'text-amber-400' : 'text-dark-textMuted'">{{ r.confidence }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>
  </div>
</template>
