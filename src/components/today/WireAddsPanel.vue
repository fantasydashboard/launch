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
/*
 * When every row is an empty seat, the heading has to say so.
 *
 * "Better than someone you're starting" is literally true of a man with no game — he is in the
 * lineup and he scores nothing — but it is read as "better than that player", which is a
 * different and much stronger claim about Auston Matthews. The heading is the most prominent
 * text on the block, so it is the part that has to be right.
 */
const allEmptySeats = computed(() =>
  shown.value.length > 0 && shown.value.every((u) => !u.over.playsToday))
</script>

<template>
  <section v-if="shown.length" class="mb-5 rounded-xl border border-dark-border bg-dark-card p-4">
    <h2 class="font-display text-xs font-semibold uppercase tracking-wide text-primary">
      &#9733;
      <template v-if="allEmptySeats">Free, and playing tonight &mdash; your seats are empty</template>
      <template v-else>Free and better than someone you're starting</template>
    </h2>
    <p class="mb-3 font-mono text-[10px] text-dark-textMuted">
      tonight only &mdash; the drop is the other half of the decision.
      A seat whose man has no game is empty, not lost: filling it costs you nothing you were using.
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
        <!--
          AN IDLE MAN IS NOT A MAN YOU ARE BEATING.
          "over Auston Matthews at F" printed beside a large number reads as "drop Matthews",
          and on a night when he simply has no game that is catastrophic advice stated
          confidently. The seat is empty tonight, the gain is somebody against nobody, and the
          row has to say which of the two it is — the arithmetic was never wrong, the sentence
          was.
        -->
        <span v-if="!u.over.playsToday" class="block font-mono text-[10px] text-dark-textMuted">
          fills {{ u.slot || 'the seat' }} &mdash; {{ u.over.name }} has no game
        </span>
        <span v-else class="block font-mono text-[10px] text-dark-textMuted">
          over {{ u.over.name }}<template v-if="u.slot"> at {{ u.slot }}</template>
        </span>
        <span v-if="u.drop" class="block font-mono text-[10px] text-dark-textMuted/60">
          drop {{ u.drop.name }}
        </span>
        <!--
          And an add with nobody to cut is not an add. This used to render nothing at all, so
          the row looked like a free move — on a night when every bench body is idle, which is
          exactly when this panel has the most to say, there is no safe drop to name.
        -->
        <span v-else class="block font-mono text-[10px] text-[#e69a4a]/80">
          needs a roster spot
        </span>
      </span>
    </div>
  </section>
</template>
