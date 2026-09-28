<script setup lang="ts">
/**
 * Free, and better than someone you are starting tonight.
 *
 * Football closes its weekly page with this and the daily page had nothing like it — the only
 * move it would suggest was a bench player beating a starter, which is the cheap half of the
 * answer. On most nights the best available body at a position is on nobody's roster, and in
 * a league with daily transactions he is claimable this morning. That is the half worth
 * paying for.
 *
 * The drop is shown with the add, because an add nobody can make is not advice.
 */
import { computed } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { teamLogoFor } from '@/players/teamLogo'
import type { DailyRow, RankedRow } from '@/composables/useDailyLineup'

const props = defineProps<{
  adds: { add: RankedRow; over: DailyRow; gain: number; slot: string; drop: DailyRow | null }[]
  /** Points, or standard deviations — never let a number stand bare. */
  valueLabel?: string
}>()

const leagueStore = useLeagueStore()
const logo = (abbr?: string) => teamLogoFor(leagueStore.activeSport, abbr)
function onImgErr(e: Event) { (e.target as HTMLImageElement).style.display = 'none' }
const one = (n: number) => n.toFixed(1)
const shown = computed(() => props.adds)
</script>

<template>
  <section v-if="shown.length" class="mb-5 rounded-xl border border-dark-border bg-dark-card p-4">
    <h2 class="font-display text-xs font-semibold uppercase tracking-wide text-primary">
      &#9733; Free and better than someone you're starting
    </h2>
    <p class="mb-3 font-mono text-[10px] text-dark-textMuted">
      tonight only &mdash; the drop is the other half of the decision
    </p>

    <div v-for="u in shown" :key="u.add.playerKey"
         class="flex items-center gap-3 border-b border-dark-border/40 py-2.5 last:border-0">
      <img v-if="u.add.headshot" :src="u.add.headshot" :alt="u.add.name" loading="lazy" @error="onImgErr"
           class="h-9 w-9 shrink-0 rounded-full bg-dark-border object-cover" />
      <span v-else class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-dark-border font-mono text-[9px] text-dark-textMuted">{{ u.add.position }}</span>

      <span class="min-w-0 flex-1">
        <span class="block truncate text-sm font-semibold text-dark-text">{{ u.add.name }}</span>
        <span class="flex items-center gap-1 font-mono text-[11px] text-dark-textMuted">
          {{ u.add.position }}
          <template v-if="u.add.team">
            &middot; <img :src="logo(u.add.team)" alt="" @error="onImgErr" class="h-3 w-3 object-contain" />{{ u.add.team }}
          </template>
        </span>
      </span>

      <span class="shrink-0 text-right">
        <span class="block font-mono text-sm font-bold text-primary">+{{ one(u.gain) }}</span>
        <span class="block font-mono text-[10px] text-dark-textMuted">
          over {{ u.over.name }}<template v-if="u.slot"> at {{ u.slot }}</template>
        </span>
        <span v-if="u.drop" class="block font-mono text-[10px] text-dark-textMuted/60">
          drop {{ u.drop.name }}
        </span>
      </span>
    </div>
  </section>
</template>
