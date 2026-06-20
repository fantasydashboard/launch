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
</script>

<template>
  <section v-if="rows.length" class="space-y-2">
    <h2 class="text-sm font-display font-semibold uppercase tracking-wide text-dark-textMuted">Positions</h2>
    <div class="rounded-xl border border-dark-border bg-dark-card px-4 py-3">
      <div
        v-for="r in rows"
        :key="r.pos"
        class="flex items-center gap-3 py-1 font-mono text-[11px]"
      >
        <span class="w-10 shrink-0 font-semibold text-dark-textSecondary">{{ r.pos }}</span>
        <!-- depth verdict -->
        <span
          v-if="r.depth === 'deep'"
          class="w-16 shrink-0 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-primary bg-primary/10"
          title="extra startable bodies here — trade from this surplus"
        >deep</span>
        <span
          v-else-if="r.depth === 'thin'"
          class="w-16 shrink-0 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[#f26d6d] bg-[#f26d6d]/10"
          title="no startable body to spare — an injury here hurts; upgrade target"
        >thin</span>
        <span v-else class="w-16 shrink-0 text-dark-textMuted/50">·</span>
        <!-- best body + league rank -->
        <span class="min-w-0 truncate text-dark-text">
          <template v-if="r.bestName">{{ r.bestName }}</template>
          <span v-else class="text-[#f26d6d]">no startable option</span>
        </span>
        <span v-if="r.bestRank" class="shrink-0 text-dark-textMuted">{{ ord(r.bestRank) }} of {{ r.leagueCount }}</span>
        <!-- action -->
        <router-link
          v-if="r.depth === 'thin'"
          to="/players"
          class="ml-auto shrink-0 text-[#5ec8e6] hover:underline"
        >↑ upgrade</router-link>
        <router-link
          v-else-if="r.depth === 'deep'"
          to="/trades"
          class="ml-auto shrink-0 text-[#5ec8e6] hover:underline"
        >↓ deal from</router-link>
      </div>
      <p class="mt-2 font-mono text-[9px] text-dark-textMuted">
        depth vs the league · rank = your best body among everyone rostered at the slot (overall value)
      </p>
    </div>
  </section>
</template>
