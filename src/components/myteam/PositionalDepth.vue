<script setup lang="ts">
// Positional depth chart: per required starting slot, how deep/thin you are vs the
// league (the actionable bit — thin = upgrade/injury risk, deep = trade-from) plus
// where your best body ranks among everyone rostered there. Routes thin → The Wire,
// deep → Trades.
interface Row {
  pos: string
  depth: 'deep' | 'thin' | 'ok'
  bestName: string | null
  bestRank: number | null
  leagueCount: number
}
defineProps<{ rows: Row[] }>()

const ord = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
// Rank colour: top third = strength (green), bottom third = weakness (red), else neutral.
const rankTone = (rank: number | null, n: number) => {
  if (!rank) return 'text-[#f26d6d]'
  if (rank <= Math.ceil(n / 3)) return 'text-primary'
  if (rank > (n * 2) / 3) return 'text-[#f26d6d]'
  return 'text-dark-text'
}
</script>

<template>
  <section v-if="rows.length" class="space-y-2">
    <h2 class="text-sm font-display font-semibold uppercase tracking-wide text-dark-textMuted">Positions</h2>
    <div class="rounded-xl border border-dark-border bg-dark-card px-4 py-3">
      <div
        v-for="r in rows"
        :key="r.pos"
        class="flex items-center gap-3 py-1.5 font-mono text-[11px]"
      >
        <span class="w-9 shrink-0 font-bold text-dark-textSecondary">{{ r.pos }}</span>
        <!-- PROMINENT league rank at the slot -->
        <span class="w-24 shrink-0 tabular-nums">
          <template v-if="r.bestRank">
            <span class="text-[15px] font-bold" :class="rankTone(r.bestRank, r.leagueCount)">{{ ord(r.bestRank) }}</span>
            <span class="text-[10px] text-dark-textMuted"> of {{ r.leagueCount }}</span>
          </template>
          <span v-else class="text-[12px] font-bold text-[#f26d6d]">—</span>
        </span>
        <!-- the body you'd start there -->
        <span class="min-w-0 flex-1 truncate text-dark-textSecondary">
          {{ r.bestName || 'no startable option' }}
        </span>
        <!-- depth verdict -->
        <span
          v-if="r.depth === 'deep'"
          class="shrink-0 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-primary bg-primary/10"
          title="extra startable bodies here — trade from this surplus"
        >deep</span>
        <span
          v-else-if="r.depth === 'thin'"
          class="shrink-0 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[#f26d6d] bg-[#f26d6d]/10"
          title="no startable body to spare — an injury here hurts; upgrade target"
        >thin</span>
        <!-- action -->
        <router-link
          v-if="r.depth === 'thin'"
          to="/players"
          class="shrink-0 text-[#5ec8e6] hover:underline"
        >↑ upgrade</router-link>
        <router-link
          v-else-if="r.depth === 'deep'"
          to="/trades"
          class="shrink-0 text-[#5ec8e6] hover:underline"
        >↓ deal from</router-link>
      </div>
      <p class="mt-2 font-mono text-[9px] text-dark-textMuted">
        rank = your starter at the slot vs every team's starter there (overall value) · green = strength · red = weakness
      </p>
    </div>
  </section>
</template>
