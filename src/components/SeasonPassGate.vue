<script setup lang="ts">
/**
 * The Season Pass wall, in the shape the Draft Room already established.
 *
 * Six gating components existed in this codebase — BlurredPreview, FeatureGate, LeagueGate,
 * ExpandGate, UpgradeBadge, DailyUpgradeNudge — and not one of them was referenced by a single
 * view. The only paywall actually running anywhere was the Draft Room's own inline card. So
 * the pattern was already chosen by the one place that shipped it; this is that card, lifted
 * into a component so the wall reads identically wherever it appears rather than becoming a
 * seventh unused variant.
 *
 * What it gates is a deliberate line, taken from what the landing page already sells: the
 * dashboard part is free, the decisions are what you pay for. Standings, power rankings,
 * history and where you stack up stay open. The four calls — the draft pick, the waiver, the
 * start/sit, the trade — are the product.
 */
import { RouterLink } from 'vue-router'

defineProps<{
  /** What the reader is being denied, in their words. "Who to add, and who to cut." */
  headline: string
  /**
   * What stays free, said first and plainly. A wall that only says "pay" reads as a taunt;
   * one that names what you still have reads as an offer.
   */
  body: string
  cta?: string
}>()
</script>

<template>
  <section class="rounded-xl border border-primary/40 bg-dark-card p-8 text-center">
    <p class="mb-2 font-mono text-[10px] uppercase tracking-widest text-primary">Season Pass</p>
    <h2 class="mb-2 font-display text-2xl font-bold text-dark-text">{{ headline }}</h2>
    <p class="mx-auto mb-6 max-w-md font-mono text-xs leading-relaxed text-dark-textMuted">
      {{ body }} $39 a year, renewing annually, every league you're in.
    </p>
    <RouterLink
      to="/pricing"
      class="inline-block rounded-lg bg-primary px-6 py-3 font-mono text-xs font-semibold uppercase tracking-wide text-dark-bg"
    >{{ cta || 'Unlock it — $39' }}</RouterLink>
  </section>
</template>
