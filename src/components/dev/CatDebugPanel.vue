<script setup lang="ts">
// Dev-only (?catdebug=1): dumps the exact category inputs + my per-cat production rank a page
// feeds into rankInCategory, so My Team and the Wire can be compared row-for-row to find where
// the Yahoo ranks diverge (team count, category list, direction, or totals).
interface Row {
  statId: string
  label: string
  lowerIsBetter: boolean
  isRatio: boolean
  volumeStatId: string
  myRank: number
  myTotal: number
}
defineProps<{ debug: { page: string; numTeams: number; myTeamId: string; myFound: boolean; rows: Row[] } }>()
</script>

<template>
  <section class="space-y-2">
    <h2 class="font-mono text-[11px] uppercase tracking-wide text-[#5ec8e6]">
      CAT DEBUG · {{ debug.page }} · {{ debug.numTeams }} teams · me={{ debug.myTeamId }} {{ debug.myFound ? '✓' : '✗ NOT FOUND' }}
      <span class="text-dark-textMuted normal-case">(dev only)</span>
    </h2>
    <div class="overflow-x-auto rounded-xl border border-[#5ec8e6]/30 bg-dark-card">
      <table class="w-full border-collapse font-mono text-[11px]">
        <thead>
          <tr class="text-left text-dark-textMuted">
            <th class="px-3 py-1.5">cat</th>
            <th class="px-2 py-1.5">statId</th>
            <th class="px-2 py-1.5">dir</th>
            <th class="px-2 py-1.5">ratio</th>
            <th class="px-2 py-1.5">volId</th>
            <th class="px-2 py-1.5 text-right">myRank</th>
            <th class="px-3 py-1.5 text-right">myTotal</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in debug.rows" :key="r.statId" class="border-t border-dark-border/40">
            <td class="px-3 py-1 font-semibold text-dark-text">{{ r.label }}</td>
            <td class="px-2 py-1 text-dark-textMuted">{{ r.statId }}</td>
            <td class="px-2 py-1" :class="r.lowerIsBetter ? 'text-[#F2B33A]' : 'text-dark-textMuted'">{{ r.lowerIsBetter ? 'low↓' : 'high↑' }}</td>
            <td class="px-2 py-1 text-dark-textMuted">{{ r.isRatio ? 'ratio' : '·' }}</td>
            <td class="px-2 py-1 text-dark-textMuted">{{ r.volumeStatId || '·' }}</td>
            <td class="px-2 py-1 text-right tabular-nums text-dark-text">{{ r.myRank }}</td>
            <td class="px-3 py-1 text-right tabular-nums text-dark-textSecondary">{{ r.myTotal }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="font-mono text-[9px] text-dark-textMuted">
      compare this table between My Team and the Wire (same ?catdebug=1) — a row where statId / dir /
      myRank / myTotal differs is where the two pages disagree.
    </p>
  </section>
</template>
