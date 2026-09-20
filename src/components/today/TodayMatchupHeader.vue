<script setup lang="ts">
/**
 * Where the week stands, at the top of the daily page.
 *
 * WHY IT BELONGS HERE RATHER THAN ON ITS OWN TAB. The reason to care who you are playing is
 * that it changes what you do tonight — a manager comfortably ahead conserves moves, one
 * behind in two categories streams for them. Splitting "who am I playing" from "what do I do
 * about it" across two tabs made the second page answer a question the first one asked.
 *
 * THE CATEGORY STRIP IS THE SCOREBOARD IN A CATEGORY LEAGUE. Points leagues have one number
 * and it is on the left; category leagues are won column by column, so a single win
 * probability hides the whole decision. A manager losing hits by a mile and saves by one
 * should stream a goalie, and no aggregate says that.
 */
import { computed } from 'vue'
import type { ThisWeekSnapshot } from '@/composables/useThisWeekMatchup'

const props = defineProps<{
  snapshot: ThisWeekSnapshot | null
  myTeamName?: string
  myTeamLogo?: string
  /** Points leagues show a score; category leagues show the column split. */
  isCategory?: boolean
}>()

function onImgErr(e: Event) { (e.target as HTMLImageElement).style.display = 'none' }

/*
 * Three outcomes, not one. A 6-6 category split is a TIE and calling it a loss is simply
 * wrong; the band shows all three rather than one ambiguous number.
 */
const band = computed(() => {
  const s = props.snapshot
  if (!s) return null
  return { win: s.winPct, tie: s.tiePct, loss: s.lossPct }
})

/* Won / losing / level, so the strip can be read at a glance rather than decoded. */
const CAT_TONE: Record<string, string> = {
  winning: 'text-[#7ee787]', losing: 'text-[#FF5C5C]', tied: 'text-dark-textMuted',
}
const tone = (c: { status: string }) => CAT_TONE[c.status] ?? 'text-dark-textMuted'

const contested = computed(() =>
  (props.snapshot?.categories ?? []).filter((c) => c.status !== 'winning' && c.status !== 'losing'),
)
</script>

<template>
  <section v-if="snapshot" class="mb-5 rounded-xl border border-dark-border bg-dark-card px-4 py-3">
    <div class="flex items-center justify-between gap-4">
      <div class="flex min-w-0 items-center gap-2">
        <img v-if="myTeamLogo" :src="myTeamLogo" alt="" @error="onImgErr"
             class="h-8 w-8 shrink-0 rounded-full object-cover" />
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold text-dark-text">{{ myTeamName || 'Your team' }}</p>
          <p class="font-mono text-[10px] text-dark-textMuted">
            {{ snapshot.daysRemaining }}d left
          </p>
        </div>
      </div>

      <div class="shrink-0 text-center">
        <p class="font-mono text-lg font-bold"
           :class="snapshot.winPct >= 50 ? 'text-primary' : 'text-[#e69a4a]'">{{ snapshot.winPct }}%</p>
        <p class="font-mono text-[10px] text-dark-textMuted">
          <template v-if="isCategory">
            proj {{ snapshot.projWins }}&ndash;{{ snapshot.projLosses }}<span
              v-if="snapshot.projTies">&ndash;{{ snapshot.projTies }}</span>
          </template>
          <template v-else>to win</template>
        </p>
        <!-- A tie is a real outcome here and was being folded into a loss. -->
        <p v-if="band && band.tie >= 5" class="font-mono text-[9px] text-dark-textMuted/60">
          {{ band.tie }}% tie
        </p>
      </div>

      <div class="flex min-w-0 items-center justify-end gap-2">
        <div class="min-w-0 text-right">
          <p class="truncate text-sm font-semibold text-dark-text">{{ snapshot.opponentName }}</p>
        </div>
        <img v-if="snapshot.oppAvatar" :src="snapshot.oppAvatar" alt="" @error="onImgErr"
             class="h-8 w-8 shrink-0 rounded-full object-cover" />
      </div>
    </div>

    <!--
      THE COLUMN-BY-COLUMN SCOREBOARD. In a category league this is the actual state of the
      week; the percentage above is a summary of it. A manager losing one column by a hair
      and another by a mile should spend tonight on the first, and only this says which.
    -->
    <div v-if="isCategory && snapshot.categories.length" class="mt-3 border-t border-dark-border/50 pt-3">
      <p class="mb-2 font-mono text-[9px] uppercase tracking-widest text-dark-textMuted/70">
        where the week stands
        <span v-if="contested.length" class="normal-case tracking-normal text-dark-textMuted/50">
          &middot; {{ contested.length }} still in play
        </span>
      </p>
      <div class="flex flex-wrap gap-x-4 gap-y-1.5">
        <span v-for="c in snapshot.categories" :key="c.statId"
              class="font-mono text-[11px]" :title="`${c.myWinPct}% to win ${c.label}`">
          <span :class="tone(c)">{{ c.label }}</span>
          <span class="ml-1 text-dark-textMuted/50">{{ Math.round(c.myWinPct) }}%</span>
        </span>
      </div>
    </div>
  </section>
</template>
